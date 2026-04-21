const WebSocket = require("ws");
const AzureSpeechService = require("../services/azure-speech.service");
const EagleRecognitionService = require("../services/eagle-recognition.service");
const OpenAIService = require("../services/openai.service");
const AttendanceService = require("../services/attendance.service");
const TTSService = require("../services/tts.service");
const authService = require("../services/authorization.service");
const blobService = require("../services/blob.service");


const LINA_PATTERN = /\b(?:l[iee]+n[auh]+|leena|lena)\b/i;
const START_SCRUM_PATTERN = /\b(?:start\s+(?:the\s+)?(?:autonomous\s+)?scrum|let'?s?\s+(?:begin|start)(?:\s+(?:the\s+)?(?:autonomous\s+)?scrum)?)\b/i;

class MeetingHandler {
  constructor(clientWs, allClients, allHandlers, user) {
    this.ws = clientWs;
    this.allClients = allClients;
    this.allHandlers = allHandlers;
    this.user = user;

    this.mode = "pre_scrum";

    // Speaker mapping
    this.speakerMap = new Map();
    this.currentVerifiedSpeaker = null;
    this.lastEagleVerification = 0;

    // Attendance tracking
    this.verifiedUsers = new Set();
    this.pendingVerifications = new Set();

    // Unit/session context
    this.unitId = null;
    this.locationId = null;
    this.scrumSessionId = null;

    // Provider imageURL cache
    this.providerImageMap = new Map();
    // Provider info cache — avoids repeated DB lookups
    this.providerInfoCache = new Map();

    // Patient context
    this.currentPatientId = null;
    this.patientData = null;

    // L.I.N.A. conversation history
    this.linaHistory = [];
    this.MAX_LINA_HISTORY = 6;

    // L.I.N.A. activation window
    this.linaActiveUntil = 0;
    this.LINA_WINDOW_MS = 6000;

    // FIFO queue — every command processed in arrival order
    this._commandQueue = [];
    this._processing = false;

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
      this.handleTranscript(transcriptData).catch((err) => {
        console.error("❌ Transcript error:", err.message);
      });
    });

    this.eagleService = new EagleRecognitionService(
      (verificationData) => {
        this.handleSpeakerVerification(verificationData).catch((err) => {
          console.error("❌ Verification error:", err.message);
        });
      },
      (scores, threshold) => {
        this.handleLiveScores(scores, threshold).catch((err) => {
          console.error("❌ Live scores error:", err.message);
        });
      }
    );

    // Preload all enrolled provider names so live scores carry names from frame 1
    this.preloadEnrolledProviders().catch((err) => {
      console.error("❌ Preload providers error:", err.message);
    });

    this.openAIService = new OpenAIService((result) => {
      this.handleOpenAIResult(result);
    });

    this.azureSpeech
      .start()
      .then(() => {
        this.sendMessage({ type: "status", message: "Transcriber started" });
      })
      .catch((err) => {
        console.error("❌ Transcriber failed:", err.message);
        this.sendMessage({ type: "error", message: "Transcriber failed" });
      });

    this.ws.on("message", (data) => this.handleIncomingMessage(data));
    this.ws.on("close", () => this.handleDisconnect());
  }

  // ---------------------------------------------------------------------------
  // Incoming message routing
  // ---------------------------------------------------------------------------

  async handleIncomingMessage(data) {
    const dataSize = data?.length || data?.byteLength || 0;

    if (dataSize < 1000) {
      try {
        const dataStr = Buffer.isBuffer(data) ? data.toString("utf8") : data.toString();
        const message = JSON.parse(dataStr);

        if (message.type === "init") {
          this.unitId = message.unitId || null;
          this.locationId = message.locationId || null;
          this.scrumSessionId = message.scrumSessionId || null;

          const newMode = message.mode || "pre_scrum";
          if (newMode !== this.mode) {
            this.mode = newMode;
            this.linaHistory = [];
          }

          console.log(`📝 Init: mode=${this.mode}, unit=${this.unitId}, session=${this.scrumSessionId}`);

          // Flush deferred attendance records
          if (this.unitId && this.scrumSessionId && this.verifiedUsers.size > 0) {
            for (const uid of this.verifiedUsers) {
              this.attendanceService
                .markAttendance(uid, this.unitId, this.scrumSessionId, 1.0)
                .catch((err) => console.error(`❌ Deferred attendance error: ${err.message}`));
            }
          }

          if (message.patientId) {
            await this.setPatientContext(message.patientId);
          }

          if (this.mode === "pre_scrum") {
            const initiatorName = this.user?.name || "there";
            const unitLabel = message.unitSequence ? `Unit ${message.unitSequence}` : "this unit";
            const location = message.locationName || "the clinic";

            const welcomeText = `Good morning, ${initiatorName}. I am ready to greet UTC team members for the scrum of ${unitLabel} in ${location}. Please announce yourself.`;

            this.ttsService.generateSpeech(welcomeText, (audioBuffer) => {
              this.broadcast({
                type: "tts_audio",
                providerId: 0,
                providerName: "L.I.N.A.",
                audio: audioBuffer.toString("base64"),
                text: welcomeText,
                isWelcome: true,
                timestamp: Date.now(),
              });
            });
          }

          return;
        }

        if (message.type === "set_mode") {
          const newMode = message.mode || "pre_scrum";
          if (newMode !== this.mode) {
            this.mode = newMode;
            this.linaHistory = [];
          }
          return;
        }

        if (message.type === "set_patient") {
          await this.setPatientContext(message.patientId);
          return;
        }
      } catch {
        // Not JSON — treat as audio
      }
    }

    this.handleIncomingAudio(data);
  }

  async handleIncomingAudio(data) {
    if (!Buffer.isBuffer(data)) return;
    this.azureSpeech.processAudio(data);
    this.eagleService.processAudio(data);
  }

  // ---------------------------------------------------------------------------
  // Preload + live scores
  // ---------------------------------------------------------------------------

  async preloadEnrolledProviders() {
    try {
      const config = require("../config");
      const url = `${config.PYTHON_SERVICE_URL.replace(/\/$/, "")}/profiles`;
      const res = await fetch(url);
      if (!res.ok) return;
      const data = await res.json();
      const ids = data.provider_ids || [];
      console.log(`📋 Preloading ${ids.length} enrolled provider names...`);
      await Promise.all(
        ids.map(async (id) => {
          if (this.providerInfoCache.has(id)) return;
          try {
            const info = await this.attendanceService.getProviderInfo(id);
            if (info) {
              this.providerInfoCache.set(id, info);
              if (info.ImageURL) this.providerImageMap.set(id, info.ImageURL);
            }
          } catch {}
        })
      );
      console.log(`✅ Preloaded ${this.providerInfoCache.size} provider names`);
    } catch (err) {
      console.error(`❌ /profiles fetch failed: ${err.message}`);
    }
  }

  async handleLiveScores(scores, threshold) {
    if (!Array.isArray(scores) || scores.length === 0) return;

    // Pick the highest-scoring speaker server-side — UI just renders one box.
    let top = scores[0];
    for (let i = 1; i < scores.length; i++) {
      if (scores[i].score > top.score) top = scores[i];
    }

    const cached = this.providerInfoCache.get(top.speaker);
    this.sendMessage({
      type: "live_scores",
      threshold,
      timestamp: Date.now(),
      speaker: {
        userNum: top.speaker,
        name: cached ? cached.FirstName : null,
        score: top.score,
      },
    });
  }

  // ---------------------------------------------------------------------------
  // Patient context
  // ---------------------------------------------------------------------------

  async setPatientContext(patientId) {
    this.currentPatientId = patientId;

    try {
      this.patientData = await this.attendanceService.getPatientData(patientId);

      // Fetch latest documents for L.I.N.A. context
      const docRows = await this.attendanceService.getPatientDocuments(patientId);
      this.patientData.documents = docRows.map((row) => ({
        documentId: row.documentId ?? row.DocumentId ?? row.Id ?? null,
        documentType: row.documentType ?? row.DocumentType ?? null,
        documentName: row.documentName ?? row.DocumentName ?? null,
        fileType: row.fileType ?? row.FileType ?? null,
        uploadDate: row.uploadDate ?? row.UploadDate ?? null,
        isReviewed: Boolean(row.isReviewed ?? row.IsReviewed ?? 0),
        blobUrl: row.blobUrl ?? row.BlobUrl ?? row.DocumentUrl ?? null,
      }));
      console.log(`✅ Patient loaded: ${this.patientData?.fullName} (${patientId.substring(0, 8)}...) — ${this.patientData.documents.length} documents`);

      // Auto-read patient presentation aloud
      const presentation = this.patientData?.aiContent?.patientPresentation;
      if (presentation) {
        console.log(`🔊 Patient presentation TTS: ${presentation.substring(0, 60)}...`);
        this.ttsService.generateSpeech(presentation, (audioBuffer) => {
          this.broadcast({
            type: "tts_audio",
            providerId: 0,
            providerName: "L.I.N.A.",
            audio: audioBuffer.toString("base64"),
            text: presentation,
            isPatientPresentation: true,
            patientId,
            timestamp: Date.now(),
          });
        });
      } else {
        console.log(`ℹ️ No patient_presentation in aiContent for ${patientId.substring(0, 8)}...`);
      }
    } catch (error) {
      console.error(`❌ Failed to load patient:`, error.message);
      this.patientData = null;
    }
  }

  // ---------------------------------------------------------------------------
  // Transcript handling
  // ---------------------------------------------------------------------------

  async handleTranscript(transcriptData) {
    const { speakerId, text } = transcriptData;
    if (!text) return;

    const displayInfo = this.getDisplayInfo(speakerId);
    const displayName = displayInfo.name || speakerId;
    const userNum = displayInfo.userNum;

    // Pre-scrum: only detect "start scrum"
    if (this.mode === "pre_scrum") {
      if (START_SCRUM_PATTERN.test(text)) {
        console.log(`🚀 Start scrum detected from ${displayName}`);
        this.broadcast({
          type: "function_call",
          functionName: "start_scrum",
          arguments: {
            provider_id: userNum,
            provider_name: displayName,
            provider_image_url: displayInfo.imageURL,
          },
          timestamp: Date.now(),
          success: true,
          message: "start_scrum detected",
        });
      }
      return;
    }

    // Scrum: Avery gate
    const hasLina = LINA_PATTERN.test(text);
    const now = Date.now();
    const windowActive = now < this.linaActiveUntil;

    if (hasLina) {
      this.linaActiveUntil = now + this.LINA_WINDOW_MS;
    }

    if (!hasLina && !windowActive) return;

    const cleanText = text
      .replace(LINA_PATTERN, "")
      .replace(/^[\s,.:!?]+/, "")
      .trim();

    if (cleanText.length < 2) return;

    console.log(`🤖 L.I.N.A.: "${cleanText}" from ${displayName}`);

    // FIFO queue — every command processed in arrival order
    this._commandQueue.push({
      cleanText,
      userNum,
      displayName,
      imageURL: displayInfo.imageURL,
    });
    console.log(`📥 Queued (depth=${this._commandQueue.length}): "${cleanText}"`);

    this._processQueue();
  }

  /**
   * Drain the command queue one at a time. Commands arrive by arrival order
   * (STT timing), NOT by OpenAI response time. Queue only advances when the
   * current command is fully handled (function call broadcast + TTS generated).
   */
  async _processQueue() {
    if (this._processing) return;
    this._processing = true;

    try {
      while (this._commandQueue.length > 0) {
        const request = this._commandQueue.shift();
        console.log(`🤖 Processing: "${request.cleanText}"`);

        try {
          const historyContext = [...this.linaHistory];
          await this.openAIService.processScrum(
            request.cleanText,
            request.userNum,
            request.displayName,
            request.imageURL,
            this.patientData,
            historyContext
          );
        } catch (err) {
          console.error(`❌ L.I.N.A. request failed: ${err.message}`);
        }
      }
    } finally {
      this._processing = false;
    }
  }

  // ---------------------------------------------------------------------------
  // Speaker verification (Eagle)
  // ---------------------------------------------------------------------------

  async handleSpeakerVerification(verificationData) {
    const { speaker, score } = verificationData;
    if (!speaker || speaker === "Unknown") return;

    const userNum = speaker;

    // Already verified or in-progress — skip
    if (this.verifiedUsers.has(userNum) || this.pendingVerifications.has(userNum)) {
      if (this.providerInfoCache.has(userNum)) {
        const cached = this.providerInfoCache.get(userNum);
        this.currentVerifiedSpeaker = {
          userNum,
          firstName: cached.FirstName,
          imageURL: cached.ImageURL,
          verifiedAt: Date.now(),
        };
        this.lastEagleVerification = Date.now();
      }
      return;
    }

    // Lock immediately to prevent duplicate processing
    this.pendingVerifications.add(userNum);

    // First-time verification — look up provider info
    const providerInfo = await this.attendanceService.getProviderInfo(userNum);
    if (!providerInfo) {
      this.pendingVerifications.delete(userNum);
      return;
    }

    const firstName = providerInfo.FirstName;
    const imageURL = providerInfo.ImageURL;

    // Cache provider info
    this.providerInfoCache.set(userNum, providerInfo);
    this.providerImageMap.set(userNum, imageURL);

    this.currentVerifiedSpeaker = {
      userNum,
      firstName,
      imageURL,
      verifiedAt: Date.now(),
    };
    this.lastEagleVerification = Date.now();

    console.log(`🗣️ Verified: ${firstName} (${userNum.substring(0, 8)}...) | Score: ${score.toFixed(2)}`);

    // Broadcast to UI immediately — provider sees they're identified
    this.broadcast({
      type: "attendance_marked",
      userNum,
      firstName,
      imageURL,
      timestamp: Date.now(),
    });

    // Record attendance in DB, play welcome TTS only after DB success
    if (this.unitId && this.scrumSessionId) {
      this.attendanceService
        .markAttendance(userNum, this.unitId, this.scrumSessionId, score)
        .then((result) => {
          this.pendingVerifications.delete(userNum);

          if (result.success) {
            console.log(`✅ Attendance: ${firstName}`);
            this.verifiedUsers.add(userNum);

            this.attendanceService.playWelcomeMessage(userNum, (audioBuffer, provInfo) => {
              this.broadcast({
                type: "tts_audio",
                userNum,
                firstName: provInfo.FirstName,
                imageURL: provInfo.ImageURL,
                audio: audioBuffer.toString("base64"),
                message: `Welcome, ${provInfo.FirstName}!`,
              });
            });
          }
        })
        .catch((err) => {
          this.pendingVerifications.delete(userNum);
          console.error(`❌ Attendance error for ${firstName}:`, err.message);
        });
    } else {
      console.log(`ℹ️ Attendance deferred for ${firstName} — no scrumSessionId`);
    }
  }

  // ---------------------------------------------------------------------------
  // OpenAI result handling
  // ---------------------------------------------------------------------------

  handleOpenAIResult(result) {
    if (result.type === "function_call") {
      const args = result.arguments;
      const providerId = args.provider_id;
      const providerName = args.provider_name;

      const authCheck = authService.validateFunctionCall(result.name, args, providerId);

      if (!authCheck.allowed) {
        const rejectionMessage = `Sorry, you don't have permission to perform this action. ${authCheck.reason}`;
        this.ttsService.generateSpeech(rejectionMessage, (audioBuffer) => {
          this.broadcast({
            type: "tts_audio",
            providerId: 0,
            providerName: "L.I.N.A.",
            audio: audioBuffer.toString("base64"),
            text: rejectionMessage,
            isRejection: true,
            timestamp: Date.now(),
          });
        });

        this.broadcast({
          type: "function_call_rejected",
          functionName: result.name,
          arguments: args,
          providerId,
          providerName,
          reason: authCheck.reason,
          timestamp: Date.now(),
        });

        return;
      }

      console.log(`🔧 ${result.name}:`, JSON.stringify(args));

      // Enrich with cached image URL if available
      const imageURL = this.providerImageMap.get(providerId) || args.provider_image_url;
      args.provider_image_url = imageURL;

      // Document functions need async blob operations — handle separately
      if (result.name === "brief_patient_document") {
        this._handleBriefDocument(args);
        return;
      }
      if (result.name === "show_patient_document") {
        this._handleShowDocument(args);
        return;
      }

      this.broadcast({
        type: "function_call",
        functionName: result.name,
        arguments: args,
        timestamp: Date.now(),
        success: true,
        message: `${result.name} detected`,
      });

      const confirmationMessage = this.getConfirmationMessage(result.name, args);
      if (confirmationMessage) {
        this.ttsService.generateSpeech(confirmationMessage, (audioBuffer) => {
          this.broadcast({
            type: "tts_audio",
            providerId: 0,
            providerName: "L.I.N.A.",
            audio: audioBuffer.toString("base64"),
            text: confirmationMessage,
            isAcknowledgement: true,
            timestamp: Date.now(),
          });
        });
      }
    } else if (result.type === "ai_response") {
      if (result.text) {
        // Add both user question and assistant answer to history for Q&A context
        if (result.userText) {
          this.linaHistory.push({ role: "user", text: result.userText });
        }
        this.linaHistory.push({ role: "assistant", text: result.text });
        if (this.linaHistory.length > this.MAX_LINA_HISTORY) {
          this.linaHistory = this.linaHistory.slice(-this.MAX_LINA_HISTORY);
        }

        this.ttsService.generateSpeech(result.text, (audioBuffer) => {
          this.broadcast({
            type: "tts_audio",
            providerId: 0,
            providerName: "L.I.N.A.",
            audio: audioBuffer.toString("base64"),
            text: result.text,
            timestamp: Date.now(),
          });
        });
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Document handlers (brief + show)
  // ---------------------------------------------------------------------------

  async _handleBriefDocument(args) {
    const doc = this._findDocument(args.document_id);
    if (!doc) {
      this._speakError("I couldn't find that document in the patient records.");
      return;
    }

    this._speakAck(`Reading ${doc.documentName}, one moment.`);

    const file = await blobService.downloadBlob(doc.blobUrl);
    if (!file) {
      this._speakError("I wasn't able to retrieve that document from storage.");
      return;
    }

    const analysis = await this.openAIService.analyzeDocument(
      doc.documentName, file.contentType, file.buffer, this.patientData
    );

    if (!analysis) {
      this._speakError("I wasn't able to analyze that document. Please try again.");
      return;
    }

    this.ttsService.generateSpeech(analysis, (audioBuffer) => {
      this.broadcast({
        type: "tts_audio",
        providerId: 0,
        providerName: "L.I.N.A.",
        audio: audioBuffer.toString("base64"),
        text: analysis,
        isDocumentBrief: true,
        documentName: doc.documentName,
        timestamp: Date.now(),
      });
    });
  }

  async _handleShowDocument(args) {
    const doc = this._findDocument(args.document_id);
    if (!doc) {
      this._speakError("I couldn't find that document in the patient records.");
      return;
    }

    this._speakAck(`Pulling up ${doc.documentName}.`);

    const file = await blobService.downloadBlob(doc.blobUrl);
    if (!file) {
      this._speakError("I wasn't able to retrieve that document from storage.");
      return;
    }

    this.broadcast({
      type: "show_document",
      documentId: doc.documentId,
      documentName: doc.documentName,
      documentType: doc.documentType,
      fileType: file.contentType,
      fileBase64: file.buffer.toString("base64"),
      fileSize: file.buffer.length,
      timestamp: Date.now(),
    });
  }

  _findDocument(documentId) {
    if (!this.patientData?.documents) return null;
    return this.patientData.documents.find((d) => d.documentId === documentId) || null;
  }

  _speakError(text) {
    this.ttsService.generateSpeech(text, (audioBuffer) => {
      this.broadcast({
        type: "tts_audio",
        providerId: 0,
        providerName: "L.I.N.A.",
        audio: audioBuffer.toString("base64"),
        text,
        timestamp: Date.now(),
      });
    });
  }

  _speakAck(text) {
    this.ttsService.generateSpeech(text, (audioBuffer) => {
      this.broadcast({
        type: "tts_audio",
        providerId: 0,
        providerName: "L.I.N.A.",
        audio: audioBuffer.toString("base64"),
        text,
        isAcknowledgement: true,
        timestamp: Date.now(),
      });
    });
  }

  // ---------------------------------------------------------------------------
  // TTS confirmation messages
  // ---------------------------------------------------------------------------

  getConfirmationMessage(functionName, args) {
    switch (functionName) {
      case "handle_care_unit_action": {
        const operation = args.operation;
        const serviceName = args.service_name;
        if (operation === "delete") return `Care action removed: ${serviceName}`;
        if (args.is_confirmation) return `Care action confirmed: ${serviceName}`;
        return `Care action added: ${serviceName}`;
      }

      case "update_ghs_score": {
        const GHS_LABELS = {
          PScoreBody:             { name: "Body",                 1: "Good",        2: "Challenging", 3: "Poor" },
          PScoreInteractivity:    { name: "Interactivity",        1: "Cooperative",  2: "Moderate",    3: "Difficult" },
          PScoreMind:             { name: "Mind",                 1: "A - Good",     2: "B - Challenging", 3: "C - Poor" },
          PScoreMotivation:       { name: "Motivation",           1: "Green",        2: "Yellow",      3: "Red" },
          PScoreResponse:         { name: "Response",             1: "Circle",       2: "Square",      3: "Triangle" },
          PScoreSocVulnerability: { name: "Social Vulnerability", 1: "Low",          2: "Medium",      3: "High" },
          PScoreSubstance:        { name: "Substance",            1: "Low",          2: "Medium",      3: "High" },
        };
        const cat = GHS_LABELS[args.category] || { name: args.category };
        const categoryDisplay = cat.name;
        const valueDisplay = cat[args.value] || args.value;
        return `Health score updated: ${categoryDisplay} to ${valueDisplay}`;
      }

      case "approve_action":
        return `Care unit treatment plan is approved`;

      case "open_imaging_results":
      case "close_ui_element":
        return null;

      default:
        return null;
    }
  }

  // ---------------------------------------------------------------------------
  // Speaker mapping
  // ---------------------------------------------------------------------------

  updateSpeakerMapping(guestId, verifiedSpeaker) {
    const { userNum, firstName, imageURL } = verifiedSpeaker;
    const existing = this.speakerMap.get(guestId);

    if (!existing || existing.userNum !== userNum) {
      this.speakerMap.set(guestId, {
        userNum,
        firstName,
        imageURL,
        lastVerified: Date.now(),
        confidence: "high",
      });
    } else {
      existing.lastVerified = Date.now();
      this.speakerMap.set(guestId, existing);
    }
  }

  getDisplayInfo(guestId) {
    const mapped = this.speakerMap.get(guestId);
    if (mapped) {
      return { name: mapped.firstName, userNum: mapped.userNum, imageURL: mapped.imageURL };
    }

    const VERIFICATION_WINDOW = require("../config").VERIFICATION_WINDOW_MS;

    if (this.currentVerifiedSpeaker && Date.now() - this.lastEagleVerification < VERIFICATION_WINDOW) {
      this.updateSpeakerMapping(guestId, this.currentVerifiedSpeaker);
      return {
        name: this.currentVerifiedSpeaker.firstName,
        userNum: this.currentVerifiedSpeaker.userNum,
        imageURL: this.currentVerifiedSpeaker.imageURL,
      };
    }

    return { name: guestId, userNum: null, imageURL: null };
  }

  // ---------------------------------------------------------------------------
  // WebSocket helpers
  // ---------------------------------------------------------------------------

  sendMessage(message) {
    if (this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }

  broadcast(message) {
    this.sendMessage(message);
  }

  handleDisconnect() {
    console.log("⚪ Meeting session closed");

    if (this.azureSpeech) this.azureSpeech.stop();
    if (this.eagleService && typeof this.eagleService.stop === "function") this.eagleService.stop();

    this.speakerMap.clear();
    this.verifiedUsers.clear();
    this.pendingVerifications.clear();
    this.providerInfoCache.clear();
    this.currentVerifiedSpeaker = null;
    this.linaHistory = [];
  }
}

module.exports = MeetingHandler;
