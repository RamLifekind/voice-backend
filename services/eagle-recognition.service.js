const WebSocket = require("ws");
const config = require("../config");

class EagleRecognitionService {
  constructor(onVerification, onScores) {
    this.onVerification = onVerification;
    this.onScores = onScores;
    this.ws = null;
    this.connected = false;
    this.reconnectTimer = null;
    this.connect();
  }

  connect() {
    const wsUrl = config.PYTHON_SERVICE_URL.replace(/^http/, "ws") + "/ws/recognize";

    try {
      this.ws = new WebSocket(wsUrl);
    } catch (err) {
      console.error("❌ Eagle WS connect error:", err.message);
      this.scheduleReconnect();
      return;
    }

    this.ws.on("open", () => {
      this.connected = true;
      console.log("🦅 Eagle WS connected");
      this.startPing();
    });

    this.ws.on("message", (data) => {
      try {
        const result = JSON.parse(data);
        if (result.type === "scores") {
          if (this.onScores) this.onScores(result.scores, result.threshold);
        } else if (result.type === "verified" || result.speaker) {
          if (this.onVerification) this.onVerification(result);
        }
      } catch {
        // ignore parse errors
      }
    });

    this.ws.on("close", () => {
      this.connected = false;
      this.scheduleReconnect();
    });

    this.ws.on("error", (err) => {
      if (this.connected) {
        console.error("❌ Eagle WS error:", err.message);
      }
      this.connected = false;
    });
  }

  startPing() {
    this.stopPing();
    this.pingInterval = setInterval(() => {
      if (this.ws && this.connected) {
        this.ws.ping();
      }
    }, 30000);
  }

  stopPing() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  scheduleReconnect() {
    if (this.reconnectTimer) return;
    this.stopPing();
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, 3000);
  }

  processAudio(audioBuffer) {
    if (!this.connected || !this.ws) return;
    if (audioBuffer.length % 2 !== 0) return;
    try {
      this.ws.send(audioBuffer);
    } catch {
      // ignore send errors
    }
  }

  stop() {
    this.stopPing();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.connected = false;
      this.ws.close();
      this.ws = null;
    }
  }
}

module.exports = EagleRecognitionService;
