const WebSocket = require("ws");
const AzureSpeechService = require("../services/azure-speech.service");
const EagleRecognitionService = require("../services/eagle-recognition.service");
const OpenAIService = require("../services/openai.service");
const AttendanceService = require("../services/attendance.service");
const TTSService = require("../services/tts.service");
const authService = require("../services/authorization.service");
const { broadcastToClients } = require("../utils/websocket.utils");

class MeetingHandler {
  constructor(clientWs, allClients) {
    this.ws = clientWs;
    this.allClients = allClients;

    // Speaker mapping system
    this.speakerMap = new Map();
    this.currentVerifiedSpeaker = null;
    this.lastEagleVerification = 0;

    // Attendance tracking (session-based) - tracks UserNum
    this.verifiedUsers = new Set();

    // Provider imageURL mapping: userNum → imageURL
    this.providerImageMap = new Map();

    // Patient context for current meeting
    this.currentPatientId = null;
    this.patientData = null;

    // STT context history - keep last 4 transcripts for context
    // Helps when user stutters or continues a question
    this.transcriptHistory = [];
    this.maxTranscriptHistory = 4;

    // Services
    this.azureSpeech = null;
    this.eagleService = null;
    this.openAIService = null;
    this.attendanceService = new AttendanceService();
    this.ttsService = new TTSService();
  }

  start() {
    console.log("🎤 Meeting session started");
    
    this.azureSpeech = new AzureSpeechService((transcriptData) => {
      this.handleTranscript(transcriptData);
    });
    
    this.eagleService = new EagleRecognitionService((verificationData) => {
      this.handleSpeakerVerification(verificationData);
    });
    
    this.openAIService = new OpenAIService((result) => {
      this.handleOpenAIResult(result);
    });
    
    this.azureSpeech.start()
      .then(() => {
        console.log("🚀 Azure Transcriber started");
        this.sendMessage({ type: "status", message: "Transcriber started" });
      })
      .catch((err) => {
        console.error("❌ Error starting transcriber:", err);
        this.sendMessage({ type: "error", message: "Transcriber failed" });
      });
    
    this.ws.on("message", (data) => this.handleIncomingMessage(data));
    this.ws.on("close", () => this.handleDisconnect());
  }

  async handleIncomingMessage(data) {
    const isBuffer = Buffer.isBuffer(data);
    const dataType = typeof data;
    const dataSize = data?.length || data?.byteLength || 0;

    // Try to parse as JSON first (works for both Buffer and string)
    // Small messages (<1000 bytes) might be JSON control messages
    if (dataSize < 1000) {
      try {
        const dataStr = isBuffer ? data.toString('utf8') : (dataType === 'string' ? data : data.toString());
        const message = JSON.parse(dataStr);
        console.log(`📨 Received JSON message:`, message);

        // Handle patient context message
        if (message.type === "set_patient") {
          console.log(`📝 Patient context message received: ${message.patientId}`);
          await this.setPatientContext(message.patientId);
          return;
        }
      } catch (err) {
        // Not JSON, treat as audio (silent - don't log audio chunks)
      }
    }

    // Handle as audio (silent - audio chunks are normal)
    this.handleIncomingAudio(data);
  }

  async handleIncomingAudio(data) {
    if (!Buffer.isBuffer(data)) return;

    this.azureSpeech.processAudio(data);
    this.eagleService.processAudio(data);
  }

  /**
   * Set patient context and fetch patient data
   */
  async setPatientContext(patientId) {
    this.currentPatientId = patientId;
    console.log(`📝 Patient context set: ${patientId}`);

    try {
      // Fetch patient data from attendance service
      console.log(`📝 Fetching patient data for UserNum: ${patientId}`);
      this.patientData = await this.attendanceService.getPatientData(patientId);
      console.log(`✅ Patient data loaded: ${this.patientData?.firstName} ${this.patientData?.lastName}`);
    } catch (error) {
      console.error(`❌ Failed to load patient data:`, error.message);
      this.patientData = null;
    }
  }

  async handleTranscript(transcriptData) {
    const { speakerId, text } = transcriptData;

    if (!text) return;

    const displayInfo = this.getDisplayInfo(speakerId);
    const displayName = displayInfo.name || speakerId;
    const userNum = displayInfo.userNum;

    console.log(`📝 [${speakerId} → ${displayName}${userNum ? ` (UserNum: ${userNum})` : ''}]: ${text}`);

    // Add to transcript history for context
    this.transcriptHistory.push({
      speaker: displayName,
      text: text,
      timestamp: Date.now()
    });

    // Keep only last N transcripts
    if (this.transcriptHistory.length > this.maxTranscriptHistory) {
      this.transcriptHistory.shift();
    }

    console.log(`📚 Transcript history: ${this.transcriptHistory.length} items`);

    // Frontend doesn't need transcript messages - already logged on backend
    // this.broadcast({
    //   type: "transcript",
    //   speaker: displayName,
    //   guestId: speakerId,
    //   userNum: userNum,
    //   text: text,
    //   isFinal: true,
    //   isMapped: this.speakerMap.has(speakerId),
    //   timestamp: Date.now()
    // });

    const speakerIdentifier = userNum || displayName;

    // Detect if this is a question (conversational) vs command (function call)
    const isQuestion = this.isConversationalQuery(text);

    if (isQuestion) {
      console.log(`🔍 Detected conversational query`);
      // Handle as conversation with RAG - pass transcript history for context
      const response = await this.openAIService.handleConversation(
        text,
        userNum,
        displayName,
        this.patientData, // Pass patient data if available
        this.transcriptHistory // Pass recent transcript history for context
      );

      console.log(`💬 AI Response: ${response}`);

      // Generate TTS audio for AI response
      console.log(`🔊 Generating TTS for AI response...`);
      this.ttsService.generateSpeech(response, (audioBuffer) => {
        console.log(`✅ TTS audio sent via WebSocket`);
        this.broadcast({
          type: "tts_audio",
          providerId: 0, // AI Assistant
          providerName: "AI Assistant",
          audio: audioBuffer.toString('base64'),
          text: response,
          timestamp: Date.now()
        });
      });
    } else {
      console.log(`🔧 Detected command - processing with function calls`);
      // Handle as command/function call
      await this.openAIService.processIntent(
        text,
        userNum,
        displayName,
        displayInfo.imageURL
      );
    }
  }

  async handleSpeakerVerification(verificationData) {
  const { speaker, score } = verificationData;
  
  if (!speaker || speaker === "Unknown") return;
  
  const userNum = parseInt(speaker);
  
  const providerInfo = await this.attendanceService.getProviderInfo(userNum);
  
  if (!providerInfo) {
    console.warn(`⚠️  Provider ${userNum} verified but no info found in DB`);
    return;
  }
  
  const firstName = providerInfo.FirstName;
  const imageURL = providerInfo.ImageURL;

  // Store imageURL in the map for later function call lookups
  this.providerImageMap.set(userNum, imageURL);

  this.currentVerifiedSpeaker = {
    userNum: userNum,
    firstName: firstName,
    imageURL: imageURL,
    verifiedAt: Date.now()
  };
  this.lastEagleVerification = Date.now();

  console.log(`🗣️  Eagle verified: Provider ${userNum} → ${firstName} | Score: ${score.toFixed(2)}`);
  
  // 🔧 FIX: Only broadcast first verification
  const isFirstVerification = !this.verifiedUsers.has(userNum);
  
  if (isFirstVerification) {
    // Frontend doesn't need speaker_verified - only needs attendance_marked and tts_audio
    // this.broadcast({
    //   type: "speaker_verified",
    //   userNum: userNum,
    //   firstName: firstName,
    //   imageURL: imageURL,
    //   score: score.toFixed(2),
    //   timestamp: Date.now()
    // });

    console.log(`🎉 First-time verification for: ${firstName} (UserNum: ${userNum})`);
    this.verifiedUsers.add(userNum);
    
    // Mark attendance
    this.attendanceService.markAttendance(userNum)
      .then((success) => {
        if (success) {
          console.log(`✅ Attendance marked for: ${firstName} (UserNum: ${userNum})`);
          
          this.attendanceService.playWelcomeMessage(userNum, (audioBuffer, providerInfo) => {
            this.broadcast({
              type: "tts_audio",
              userNum: userNum,
              firstName: providerInfo.FirstName,
              imageURL: providerInfo.ImageURL,
              audio: audioBuffer.toString('base64'),
              message: `Welcome, ${providerInfo.FirstName}!`
            });
          });
          
          this.broadcast({
            type: "attendance_marked",
            userNum: userNum,
            firstName: firstName,
            imageURL: imageURL,
            timestamp: Date.now()
          });
        }
      })
      .catch((err) => {
        console.error(`❌ Attendance error for ${firstName}:`, err.message);
      });
  } else {
    console.log(`👋 Provider ${firstName} already verified in this session`);
  }
}

  handleOpenAIResult(result) {
    if (result.type === "function_call") {
      console.log("🔧 Function detected:", result.name);
      console.log("📋 Arguments:", JSON.stringify(result.arguments, null, 2));

      // Check authorization before executing
      const userNum = result.providerId;
      const authCheck = authService.validateFunctionCall(result.name, result.arguments, userNum);

      if (!authCheck.allowed) {
        // Reject unauthorized request
        console.log(`🚫 Unauthorized: ${authCheck.reason}`);

        // Send rejection via TTS
        const rejectionMessage = `Sorry, you don't have permission to perform this action. ${authCheck.reason}`;
        this.ttsService.generateSpeech(rejectionMessage, (audioBuffer) => {
          this.broadcast({
            type: "tts_audio",
            providerId: 0,
            providerName: "System",
            audio: audioBuffer.toString('base64'),
            text: rejectionMessage,
            isRejection: true,
            timestamp: Date.now()
          });
        });

        // Broadcast rejection event (UI can show error)
        this.broadcast({
          type: "function_call_rejected",
          functionName: result.name,
          arguments: result.arguments,
          providerId: result.providerId,
          providerName: result.providerName,
          reason: authCheck.reason,
          timestamp: Date.now()
        });

        return; // Don't execute the function
      }

      console.log(`✅ Authorized: ${authCheck.reason}`);

      // Get imageURL from map using providerId
      const imageURL = this.providerImageMap.get(result.providerId) || result.providerImageURL;

      this.broadcast({
        type: "function_call",
        functionName: result.name,
        arguments: result.arguments,
        providerId: result.providerId,
        providerName: result.providerName,
        providerImageURL: imageURL,
        timestamp: Date.now(),
        success: true,
        message: `${result.name} detected - UI should update`
      });

      // Generate audio acknowledgement for the function call
      const confirmationMessage = this.getConfirmationMessage(result.name, result.arguments);
      if (confirmationMessage) {
        console.log(`🔊 Generating audio acknowledgement: "${confirmationMessage}"`);
        this.ttsService.generateSpeech(confirmationMessage, (audioBuffer) => {
          console.log(`✅ Audio acknowledgement sent`);
          this.broadcast({
            type: "tts_audio",
            providerId: 0, // System
            providerName: "System",
            audio: audioBuffer.toString('base64'),
            text: confirmationMessage,
            isAcknowledgement: true,
            timestamp: Date.now()
          });
        });
      }

    } else if (result.type === "ai_response") {
      // Frontend doesn't need ai_response messages
      // this.broadcast({
      //   type: "ai_response",
      //   text: result.text,
      //   providerId: result.providerId,
      //   providerName: result.providerName,
      //   timestamp: Date.now()
      // });
      console.log(`💬 AI Response: ${result.text}`);
    }
  }

  /**
   * Generate confirmation message for function calls
   */
  getConfirmationMessage(functionName, args) {
    switch (functionName) {
      case "handle_care_unit_action":
        const operation = args.operation;
        const serviceName = args.service_name;
        if (operation === "add") {
          return `Care unit action added: ${serviceName}`;
        } else if (operation === "update") {
          return `Care unit action updated: ${serviceName}`;
        } else if (operation === "delete") {
          return `Care unit action removed: ${serviceName}`;
        }
        return `Care unit action ${operation}: ${serviceName}`;

      case "update_ghs_score":
        const category = args.category;
        const label = args.label;
        return `Health score updated: ${category} is ${label}`;

      case "approve_action":
        return `Care unit treatment plan is approved`;

      // No audio for these (UI-only actions)
      case "open_imaging_results":
      case "close_ui_element":
      case "start_scrum":
        return null;

      default:
        return null;
    }
  }

  updateSpeakerMapping(guestId, verifiedSpeaker) {
    const { userNum, firstName, imageURL } = verifiedSpeaker;
    const existing = this.speakerMap.get(guestId);
    
    if (!existing) {
      this.speakerMap.set(guestId, {
        userNum: userNum,
        firstName: firstName,
        imageURL: imageURL,
        lastVerified: Date.now(),
        confidence: 'high'
      });
      console.log(`🔗 New mapping: ${guestId} → ${firstName} (UserNum: ${userNum})`);
    } else if (existing.userNum !== userNum) {
      console.log(`🔄 Remapping: ${guestId} was ${existing.firstName}, now ${firstName}`);
      this.speakerMap.set(guestId, {
        userNum: userNum,
        firstName: firstName,
        imageURL: imageURL,
        lastVerified: Date.now(),
        confidence: 'high'
      });
    } else {
      existing.lastVerified = Date.now();
      this.speakerMap.set(guestId, existing);
    }
    
    // Frontend doesn't need speaker_mapping messages
    // this.broadcast({
    //   type: "speaker_mapping",
    //   mappings: Array.from(this.speakerMap.entries()).map(([id, data]) => ({
    //     guestId: id,
    //     userNum: data.userNum,
    //     firstName: data.firstName,
    //     imageURL: data.imageURL,
    //     lastVerified: data.lastVerified
    //   }))
    // });
  }

  /**
   * Detect if text is a conversational query (question) vs command
   */
  isConversationalQuery(text) {
    const lowerText = text.toLowerCase().trim();

    // Question indicators
    const questionWords = ['what', 'why', 'how', 'when', 'where', 'who', 'which', 'can you', 'could you', 'tell me', 'explain'];
    const hasQuestionWord = questionWords.some(word => lowerText.startsWith(word) || lowerText.includes(` ${word} `));
    const endsWithQuestion = lowerText.endsWith('?');

    // Command indicators (should NOT be treated as questions)
    const commandWords = ['add', 'confirm', 'update', 'delete', 'remove', 'open', 'close', 'show', 'mark'];
    const hasCommandWord = commandWords.some(word => lowerText.startsWith(word));

    // Decision: if it has command words, treat as command
    if (hasCommandWord) {
      return false;
    }

    // If it has question indicators, treat as conversation
    if (hasQuestionWord || endsWithQuestion) {
      return true;
    }

    // Default: treat as command
    return false;
  }

  getDisplayInfo(guestId) {
    const mapped = this.speakerMap.get(guestId);
    if (mapped) {
      return { name: mapped.firstName, userNum: mapped.userNum, imageURL: mapped.imageURL };
    }
    
    const VERIFICATION_WINDOW = require("../config").VERIFICATION_WINDOW_MS;
    
    if (this.currentVerifiedSpeaker && 
        (Date.now() - this.lastEagleVerification < VERIFICATION_WINDOW)) {
      this.updateSpeakerMapping(guestId, this.currentVerifiedSpeaker);
      return { 
        name: this.currentVerifiedSpeaker.firstName, 
        userNum: this.currentVerifiedSpeaker.userNum,
        imageURL: this.currentVerifiedSpeaker.imageURL
      };
    }
    
    return { name: guestId, userNum: null, imageURL: null };
  }

  sendMessage(message) {
    if (this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }

  broadcast(message) {
    broadcastToClients(this.allClients, message);
  }

  handleDisconnect() {
    console.log("⚪ Meeting session closed");
    console.log("📊 Final speaker mappings:");
    this.speakerMap.forEach((data, guestId) => {
      console.log(`   ${guestId} → ${data.firstName} (UserNum: ${data.userNum})`);
    });
    
    console.log(`👋 Providers verified in session: ${Array.from(this.verifiedUsers).join(", ")}`);
    
    if (this.azureSpeech) {
      this.azureSpeech.stop();
    }
    
    this.speakerMap.clear();
    this.verifiedUsers.clear();
    this.currentVerifiedSpeaker = null;
    this.transcriptHistory = [];
  }
}

module.exports = MeetingHandler;