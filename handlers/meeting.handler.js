const WebSocket = require("ws");
const AzureSpeechService = require("../services/azure-speech.service");
const EagleRecognitionService = require("../services/eagle-recognition.service");
const OpenAIService = require("../services/openai.service");
const AttendanceService = require("../services/attendance.service");
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
    
    // Services
    this.azureSpeech = null;
    this.eagleService = null;
    this.openAIService = null;
    this.attendanceService = new AttendanceService();
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
    
    this.ws.on("message", (data) => this.handleIncomingAudio(data));
    this.ws.on("close", () => this.handleDisconnect());
  }

  async handleIncomingAudio(data) {
    if (!Buffer.isBuffer(data)) return;
    
    this.azureSpeech.processAudio(data);
    this.eagleService.processAudio(data);
  }

  async handleTranscript(transcriptData) {
    const { speakerId, text } = transcriptData;
    
    if (!text) return;
    
    const displayInfo = this.getDisplayInfo(speakerId);
    const displayName = displayInfo.name || speakerId;
    const userNum = displayInfo.userNum;

    console.log(`📝 [${speakerId} → ${displayName}${userNum ? ` (UserNum: ${userNum})` : ''}]: ${text}`);
    
    this.broadcast({
      type: "transcript",
      speaker: displayName,
      guestId: speakerId,
      userNum: userNum,
      text: text,
      isFinal: true,
      isMapped: this.speakerMap.has(speakerId),
      timestamp: Date.now()
    });
    
    const speakerIdentifier = userNum || displayName;
    await this.openAIService.processIntent(
      text, 
      userNum, 
      displayName, 
      displayInfo.imageURL
    );
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
    // Broadcast verification to all clients
    this.broadcast({
      type: "speaker_verified",
      userNum: userNum,
      firstName: firstName,
      imageURL: imageURL,
      score: score.toFixed(2),
      timestamp: Date.now()
    });
    
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
      
      this.broadcast({
        type: "function_call",
        functionName: result.name,
        arguments: result.arguments,
        providerId: result.providerId,
        providerName: result.providerName,
        providerImageURL: result.providerImageURL,
        timestamp: Date.now(),
        success: true,
        message: `${result.name} detected - UI should update`
      });
      
    } else if (result.type === "ai_response") {
      this.broadcast({
        type: "ai_response",
        text: result.text,
        providerId: result.providerId,
        providerName: result.providerName,
        timestamp: Date.now()
      });
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
    
    this.broadcast({
      type: "speaker_mapping",
      mappings: Array.from(this.speakerMap.entries()).map(([id, data]) => ({
        guestId: id,
        userNum: data.userNum,
        firstName: data.firstName,
        imageURL: data.imageURL,
        lastVerified: data.lastVerified
      }))
    });
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
  }
}

module.exports = MeetingHandler;