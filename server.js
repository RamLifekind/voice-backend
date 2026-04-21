const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const config = require("./config");
const EnrollmentHandler = require("./handlers/enrollment.handler");
const MeetingHandler = require("./handlers/meeting.handler");
const TTSService = require("./services/tts.service");
const { getCPTResolver } = require("./services/cpt-resolver.service");
const { authenticate, verifyWebSocketToken } = require("./middleware/auth.middleware");
const { refreshCache } = require("./utils/jwks-cache");
const { issueTicket, redeemTicket } = require("./utils/ws-ticket-store");



const app = express();
const PORT = config.PORT;

console.log("✅ Configuration loaded");
console.log("   SPEECH_ENDPOINT:", config.SPEECH_ENDPOINT ? "Set" : "Missing");
console.log("   AZURE_OPENAI_ENDPOINT:", config.AZURE_OPENAI_ENDPOINT ? "Set" : "Missing");
console.log("   PYTHON_SERVICE_URL:", config.PYTHON_SERVICE_URL);

app.use(express.json());
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: Date.now() });
});

// WebSocket ticket endpoint — issues a short-lived, single-use opaque ticket
// Client calls this with Bearer auth, gets back a ticket to pass in the WS URL
// so the JWT never appears in query params (avoids log/history leaks)
app.post("/api/ws/ticket", authenticate, (req, res) => {
  try {
    const ticket = issueTicket({
      id: req.user.id,
      email: req.user.email,
      name: req.user.name,
      roles: req.user.roles,
      tenantId: req.user.tenantId,
    });
    res.json({ ticket });
  } catch (err) {
    console.error("❌ Ticket issuance failed:", err.message);
    res.status(503).json({ success: false, message: err.message });
  }
});

// HTTP + WebSocket Server
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Track all meeting clients for broadcasting
const meetingClients = new Set();

// Track meeting handlers for patient context and unit scoping
const meetingHandlers = new Map(); // clientWs -> MeetingHandler

// 🆕 TTS Service for case summaries
const ttsService = new TTSService();

// HTTP Endpoint: Generate TTS for case summary
// Sends only to the caller's own WebSocket (matched by user ID from auth token)
app.post("/api/tts/summary", authenticate, async (req, res) => {
  try {
    const { summary, providerId, providerName } = req.body;

    if (!summary) {
      return res.status(400).json({ error: "Summary text required" });
    }

    console.log(`🔊 Generating TTS for summary (${summary.length} chars)`);

    ttsService.generateSpeech(summary, (audioBuffer) => {
      const message = {
        type: "tts_summary",
        providerId: providerId,
        providerName: providerName,
        audio: audioBuffer.toString('base64'),
        summary: summary,
        timestamp: Date.now()
      };

      // Send only to the requesting user's WebSocket connections
      sendToUser(req.user.id, message);

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

// HTTP Endpoint: Set patient context for the calling user's meeting session only
app.post("/api/meeting/patient", authenticate, async (req, res) => {
  try {
    const { patientId } = req.body;

    if (!patientId) {
      return res.status(400).json({ error: "patientId required" });
    }

    console.log(`📝 HTTP: Setting patient context to ${patientId} for user ${req.user.id}`);

    // Set patient context only for the requesting user's handler
    let updated = 0;
    for (const [clientWs, handler] of meetingHandlers.entries()) {
      if (clientWs.readyState === WebSocket.OPEN && handler.user?.id === req.user.id) {
        await handler.setPatientContext(patientId);
        updated++;
      }
    }

    console.log(`✅ HTTP: Patient context set for ${updated} session(s)`);

    res.json({
      success: true,
      message: `Patient context set for ${updated} session(s)`,
      patientId: patientId
    });

  } catch (error) {
    console.error("❌ Set Patient Context Error:", error.message);
    res.status(500).json({ error: error.message });
  }
});

// Helper: Send message to a specific user's WebSocket connections only
function sendToUser(userId, message) {
  const messageStr = JSON.stringify(message);
  let sent = 0;

  for (const [clientWs, handler] of meetingHandlers.entries()) {
    if (clientWs.readyState === WebSocket.OPEN && handler.user?.id === userId) {
      try {
        clientWs.send(messageStr);
        sent++;
      } catch (error) {
        console.error("❌ Send error:", error.message);
      }
    }
  }
}

// DELETE /api/voice-profiles/:providerId - Delete a voice profile from blob
app.delete("/api/voice-profiles/:providerId", async (req, res) => {
  try {
    const { providerId } = req.params;

    if (!providerId) {
      return res.status(400).json({ error: "providerId is required" });
    }

    console.log(`🗑️ Deleting voice profile for provider: ${providerId}`);

    const axios = require("axios");
    const response = await axios.delete(
      `${config.PYTHON_SERVICE_URL}/profiles/${providerId}`,
      { timeout: 5000 }
    );

    if (response.data.error) {
      return res.status(404).json({ success: false, message: response.data.error });
    }

    res.json({
      success: true,
      message: `Voice profile deleted for ${providerId}`,
      profilesLoaded: response.data.profiles_loaded
    });

  } catch (error) {
    console.error("❌ Delete voice profile error:", error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/voice-profiles/:providerId - Get voice profile URL from DB
// NOTE: Endpoint created but not connected to UI yet — kept aside for future use
app.get("/api/voice-profiles/:providerId", authenticate, async (req, res) => {
  try {
    const { providerId } = req.params;

    if (!providerId) {
      return res.status(400).json({ error: "providerId is required" });
    }

    const sql = require("mssql");
    const db = require("./services/database.service");
    const pool = await db.getPool();
    const request = pool.request();
    request.input('ProviderUserID', sql.UniqueIdentifier, providerId);
    const result = await request.execute('api.sGetProviderVoiceProfile');

    const profile = result.recordset?.[0] || null;

    if (!profile) {
      return res.status(404).json({ success: false, message: 'No voice profile found' });
    }

    res.json({ success: true, data: profile });
  } catch (error) {
    console.error("❌ Get voice profile error:", error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

// WebSocket connection handler
wss.on("connection", async (clientWs, req) => {
  const urlObj = new URL(req.url, `http://${req.headers.host}`);
  const urlPath = urlObj.pathname;
  const ticketId = urlObj.searchParams.get("ticket");

  console.log(`📞 WebSocket connection on path: ${urlPath}`);

  // Enrollment — no auth required
  if (urlPath === "/enroll") {
    const enrollmentHandler = new EnrollmentHandler(clientWs);
    enrollmentHandler.start();
    return;
  }

  // Test recognition — no auth, proxies to Python /ws/test/recognize
  if (urlPath === "/test/recognize") {
    console.log("🧪 Test recognition session started (Python proxy)");

    const AttendanceService = require("./services/attendance.service");
    const testAttendance = new AttendanceService();
    const nameCache = {}; // speaker GUID → { firstName, imageURL }

    const pythonWsUrl = config.PYTHON_SERVICE_URL.replace("https://", "wss://").replace("http://", "ws://") + "/ws/test/recognize";
    const pythonWs = new WebSocket(pythonWsUrl);

    pythonWs.on("open", () => {
      console.log("🧪 Connected to Python /ws/test/recognize");
    });

    // Relay messages from Python, enriching with provider names
    pythonWs.on("message", async (data, isBinary) => {
      if (isBinary || clientWs.readyState !== WebSocket.OPEN) return;

      try {
        const msg = JSON.parse(data.toString());

        // Enrich scores with cached names
        if (msg.type === "scores" && msg.scores) {
          for (const s of msg.scores) {
            if (nameCache[s.speaker]) {
              s.name = nameCache[s.speaker].firstName;
            } else {
              // Lazy load — don't block, will appear on next frame
              testAttendance.getProviderInfo(s.speaker).then(info => {
                if (info) nameCache[s.speaker] = { firstName: info.FirstName, imageURL: info.ImageURL };
              }).catch(() => {});
            }
          }
        }

        // Enrich verified with provider data
        if (msg.type === "verified" && msg.userNum) {
          if (!nameCache[msg.userNum]) {
            try {
              const info = await testAttendance.getProviderInfo(msg.userNum);
              if (info) nameCache[msg.userNum] = { firstName: info.FirstName, imageURL: info.ImageURL };
            } catch {}
          }
          const cached = nameCache[msg.userNum];
          if (cached) {
            msg.firstName = cached.firstName;
            msg.imageURL = cached.imageURL || null;
          }
        }

        clientWs.send(JSON.stringify(msg));
      } catch {
        clientWs.send(data.toString());
      }
    });

    pythonWs.on("error", (err) => {
      console.error("🧪 Python WS error:", err.message);
      if (clientWs.readyState === WebSocket.OPEN) {
        clientWs.send(JSON.stringify({ type: "error", message: "Python service connection failed" }));
      }
    });

    pythonWs.on("close", () => {
      console.log("🧪 Python WS closed");
      if (clientWs.readyState === WebSocket.OPEN) clientWs.close();
    });

    // Forward client messages (audio + JSON) to Python
    clientWs.on("message", (data, isBinary) => {
      if (pythonWs.readyState === WebSocket.OPEN) {
        pythonWs.send(data, { binary: isBinary });
      }
    });

    clientWs.on("close", () => {
      if (pythonWs.readyState === WebSocket.OPEN) pythonWs.close();
      console.log("🧪 Test recognition session closed");
    });
    return;
  }

  // All other paths require authentication
  // Authenticate via single-use ticket (preferred) or Bearer header (fallback)
  let user;

  if (ticketId) {
    const payload = redeemTicket(ticketId);
    if (!payload) {
      console.error("❌ WS Auth failed: Invalid, expired, or already-used ticket");
      clientWs.close(4001, "Unauthorized");
      return;
    }
    user = payload;
    console.log(`✅ WS Authenticated via ticket: ${user.name || user.email} (${user.id})`);
  } else {
    const authHeader = req.headers["authorization"];
    const token = authHeader?.startsWith("Bearer ") ? authHeader.substring(7) : null;

    try {
      user = await verifyWebSocketToken(token);
      console.log(`✅ WS Authenticated via Bearer: ${user.name || user.email} (${user.id})`);
    } catch (authErr) {
      console.error(`❌ WS Auth failed: ${authErr.message}`);
      clientWs.close(4001, "Unauthorized");
      return;
    }
  }

  if (urlPath === "/meeting") {
    meetingClients.add(clientWs);
    console.log(`👥 Meeting clients: ${meetingClients.size}`);

    const meetingHandler = new MeetingHandler(clientWs, meetingClients, meetingHandlers, user);
    meetingHandlers.set(clientWs, meetingHandler);
    meetingHandler.start();

    clientWs.on("close", () => {
      meetingClients.delete(clientWs);
      meetingHandlers.delete(clientWs);
      console.log(`👥 Meeting clients: ${meetingClients.size}`);
    });

  } else {
    console.log("❌ Unknown path, closing connection");
    clientWs.close();
  }
});

// Start server
server.listen(PORT, async () => {
  console.log(`🚀 Voice Recognition Server running on port ${PORT}`);
  console.log(`   WebSocket endpoints: /enroll?ticket=<ticket>, /meeting?ticket=<ticket>`);
  console.log(`   Ticket endpoint: POST /api/ws/ticket (Bearer-authenticated)`);
  console.log(`   HTTP endpoints: /health, /api/tts/summary, /api/meeting/patient`);

  // Pre-warm JWKS cache
  console.log('🔐 Initializing JWKS cache...');
  refreshCache();

  // Initialize CPT Resolver (pre-embed all CPT codes for similarity matching)
  try {
    const cptResolver = getCPTResolver();
    await cptResolver.initialize();
    console.log(`✅ CPT Resolver initialized`);
  } catch (error) {
    console.error(`❌ CPT Resolver initialization failed:`, error.message);
  }
});