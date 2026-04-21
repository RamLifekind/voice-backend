const WebSocket = require("ws");
const sql = require("mssql");
const config = require("../config");
const db = require("../services/database.service");
const { safeInt16Array } = require("../utils/audio.utils");
const { sendToClient } = require("../utils/websocket.utils");

class EnrollmentHandler {
  constructor(clientWs) {
    this.ws = clientWs;
    this.userNum = null;
    this.pythonWs = null;
    this.isEnrolled = false;
    this.audioBuffer = [];
    this.ENROLL_CHUNK_SIZE = 6144;
  }

  start() {
    console.log("🎤 Enrollment session started");
    this.ws.on("message", (data) => this.handleMessage(data));
    this.ws.on("close", () => this.handleDisconnect());
  }

  connectToPython() {
    const wsUrl = config.PYTHON_SERVICE_URL.replace(/^http/, "ws") + "/ws/enroll";

    try {
      this.pythonWs = new WebSocket(wsUrl);
    } catch (err) {
      console.error("❌ Python enroll WS connect error:", err.message);
      sendToClient(this.ws, { type: "error", message: "Failed to connect to enrollment service" });
      return;
    }

    this.pythonWs.on("open", () => {
      // Send start message with userNum
      this.pythonWs.send(JSON.stringify({ type: "start", userNum: this.userNum }));
    });

    this.pythonWs.on("message", (data) => {
      try {
        const msg = JSON.parse(data);
        this.handlePythonMessage(msg);
      } catch {
        // ignore parse errors
      }
    });

    this.pythonWs.on("error", (err) => {
      console.error("❌ Python enroll WS error:", err.message);
      sendToClient(this.ws, { type: "error", message: "Enrollment service error" });
    });

    this.pythonWs.on("close", () => {
      this.pythonWs = null;
    });
  }

  async handlePythonMessage(msg) {
    if (msg.type === "started") {
      sendToClient(this.ws, { type: "status", message: `Enrolling Provider ${this.userNum}` });
    } else if (msg.type === "progress") {
      sendToClient(this.ws, { type: "progress", percentage: msg.percentage, feedback: msg.feedback });
    } else if (msg.type === "complete") {
      this.isEnrolled = true;

      // Write voice profile URL to DB
      if (msg.blobUrl) {
        try {
          const pool = await db.getPool();
          const request = pool.request();
          request.input('ProviderUserID', sql.UniqueIdentifier, this.userNum);
          request.input('VoiceProfileBlobUrl', sql.NVarChar, msg.blobUrl);
          request.input('EnrolledAt', sql.DateTime, new Date());
          await request.execute('api.sUpdateProviderVoiceProfile');
          console.log(`✅ Voice profile URL saved to DB: ${this.userNum}`);
        } catch (dbErr) {
          console.error(`❌ Failed to save voice profile URL to DB:`, dbErr.message);
        }
      }

      sendToClient(this.ws, {
        type: "success",
        percentage: 100,
        message: "Enrollment complete!",
        blobUrl: msg.blobUrl
      });

      console.log(`✅ Profile Saved: Provider ${this.userNum}`);
    } else if (msg.type === "error") {
      sendToClient(this.ws, { type: "error", message: msg.message });
    }
  }

  async handleMessage(data) {
    if (this.isEnrolled) return;

    // Handle config message (user number)
    try {
      const str = data.toString();
      if (str.startsWith("{")) {
        const msg = JSON.parse(str);
        if (msg.type === "start" && msg.userNum) {
          this.userNum = msg.userNum;
          console.log(`👤 Enrolling Provider UserNum: ${this.userNum}`);
          this.connectToPython();
          return;
        }
      }
    } catch {
      // Not JSON — treat as audio
    }

    if (!this.userNum || !this.pythonWs) return;

    // Buffer audio and send in chunks large enough for Eagle enrollment
    const pcm = safeInt16Array(data);
    for (let i = 0; i < pcm.length; i++) {
      this.audioBuffer.push(pcm[i]);
    }

    if (this.audioBuffer.length >= this.ENROLL_CHUNK_SIZE && this.pythonWs?.readyState === WebSocket.OPEN) {
      try {
        const chunk = new Int16Array(this.audioBuffer);
        this.audioBuffer = [];
        this.pythonWs.send(Buffer.from(chunk.buffer));
      } catch {
        // ignore send errors
      }
    }
  }

  handleDisconnect() {
    console.log("⚪ Enrollment session closed");
    if (this.userNum && !this.isEnrolled) {
      console.log(`   Incomplete enrollment for Provider: ${this.userNum}`);
    }
    if (this.pythonWs) {
      this.pythonWs.close();
      this.pythonWs = null;
    }
  }
}

module.exports = EnrollmentHandler;
