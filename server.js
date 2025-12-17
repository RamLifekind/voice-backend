// require("dotenv").config();
const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const config = require("./config");
const EnrollmentHandler = require("./handlers/enrollment.handler");
const MeetingHandler = require("./handlers/meeting.handler");
const TTSService = require("./services/tts.service");

const app = express();
const PORT = config.PORT;

console.log("✅ Configuration loaded");
console.log("   SPEECH_ENDPOINT:", config.SPEECH_ENDPOINT ? "Set" : "Missing");
console.log("   AZURE_OPENAI_ENDPOINT:", config.AZURE_OPENAI_ENDPOINT ? "Set" : "Missing");
console.log("   PYTHON_SERVICE_URL:", config.PYTHON_SERVICE_URL);

app.use(express.json());
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: Date.now() });
});

// HTTP + WebSocket Server
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Track all meeting clients for broadcasting
const meetingClients = new Set();

// 🆕 TTS Service for case summaries
const ttsService = new TTSService();

// 🆕 HTTP Endpoint: Generate TTS for case summary
app.post("/api/tts/summary", async (req, res) => {
  try {
    const { summary, providerId, providerName } = req.body;
    
    if (!summary) {
      return res.status(400).json({ error: "Summary text required" });
    }
    
    console.log(`🔊 Generating TTS for summary (${summary.length} chars)`);
    
    // Generate TTS audio
    ttsService.generateSpeech(summary, (audioBuffer) => {
      // Broadcast audio to all WebSocket clients
      broadcastToMeetingClients({
        type: "tts_summary",
        providerId: providerId,
        providerName: providerName,
        audio: audioBuffer.toString('base64'),
        summary: summary,
        timestamp: Date.now()
      });
      
      // Also return audio in HTTP response (optional)
      res.json({
        success: true,
        message: "TTS generated and sent via WebSocket",
        audioBase64: audioBuffer.toString('base64')
      });
    });
    
  } catch (error) {
    console.error("❌ TTS Summary Error:", error.message);
    res.status(500).json({ error: error.message });
  }
});

// Helper: Broadcast to all meeting WebSocket clients
function broadcastToMeetingClients(message) {
  const messageStr = JSON.stringify(message);
  let sent = 0;
  
  meetingClients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      try {
        client.send(messageStr);
        sent++;
      } catch (error) {
        console.error("❌ Broadcast error:", error.message);
      }
    }
  });
  
  console.log(`📡 Broadcasted to ${sent} clients`);
}

// WebSocket connection handler
wss.on("connection", (clientWs, req) => {
  const urlPath = new URL(req.url, `http://${req.headers.host}`).pathname;
  
  console.log(`📞 WebSocket connection on path: ${urlPath}`);
  
  if (urlPath === "/enroll") {
    const enrollmentHandler = new EnrollmentHandler(clientWs);
    enrollmentHandler.start();
    
  } else if (urlPath === "/meeting") {
    meetingClients.add(clientWs);
    console.log(`👥 Meeting clients: ${meetingClients.size}`);
    
    const meetingHandler = new MeetingHandler(clientWs, meetingClients);
    meetingHandler.start();
    
    clientWs.on("close", () => {
      meetingClients.delete(clientWs);
      console.log(`👥 Meeting clients: ${meetingClients.size}`);
    });
    
  } else {
    console.log("❌ Unknown path, closing connection");
    clientWs.close();
  }
});

// Start server
server.listen(PORT, () => {
  console.log(`🚀 Voice Recognition Server running on port ${PORT}`);
  console.log(`   WebSocket endpoints: /enroll, /meeting`);
  console.log(`   HTTP endpoints: /health, /api/tts/summary`);
});