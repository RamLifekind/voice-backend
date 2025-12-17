const axios = require("axios");
const FormData = require("form-data");
const config = require("../config");
const { safeInt16Array } = require("../utils/audio.utils");
const { sendToClient } = require("../utils/websocket.utils");

class EnrollmentHandler {
  constructor(clientWs) {
    this.ws = clientWs;
    this.userNum = null;  // Changed from userName to userNum
    this.bufferCache = [];
    this.isEnrolled = false;
  }

  start() {
    console.log("🎤 Enrollment session started");

    // Start Python Profiler
    axios.post(`${config.PYTHON_SERVICE_URL}/enroll_start`)
      .then(() => {
        console.log("✅ Python Profiler Started");
        sendToClient(this.ws, { 
          type: "status", 
          message: "Profiler ready" 
        });
      })
      .catch(error => {
        console.error("❌ Python Error:", error.message);
        sendToClient(this.ws, { 
          type: "error", 
          message: "Failed to start profiler" 
        });
      });

    // Handle incoming messages
    this.ws.on("message", (data) => this.handleMessage(data));
    
    // Handle disconnect
    this.ws.on("close", () => this.handleDisconnect());
  }

  async handleMessage(data) {
    if (this.isEnrolled) return;

    // Handle config message (user number)
    try {
      const str = data.toString();
      if (str.startsWith("{")) {
        const msg = JSON.parse(str);
        if (msg.type === "start" && msg.userNum) {
          this.userNum = parseInt(msg.userNum);
          console.log(`👤 Enrolling Provider UserNum: ${this.userNum}`);
          sendToClient(this.ws, { 
            type: "status", 
            message: `Enrolling Provider ${this.userNum}` 
          });
          return;
        }
      }
    } catch (error) {
      // Not a JSON message, treat as audio
    }

    if (!this.userNum) return;

    // Process audio data
    await this.processAudio(data);
  }

  async processAudio(data) {
    // Accumulate audio samples
    const pcm = safeInt16Array(data);
    for (let i = 0; i < pcm.length; i++) {
      this.bufferCache.push(pcm[i]);
    }

    // Send to Python when we have enough samples
    if (this.bufferCache.length >= config.ENROLLMENT_CHUNK_SIZE) {
      const chunk = new Int16Array(this.bufferCache);
      this.bufferCache = [];

      try {
        const form = new FormData();
        form.append('file', Buffer.from(chunk.buffer), { 
          filename: 'audio.pcm' 
        });

        const response = await axios.post(
          `${config.PYTHON_SERVICE_URL}/enroll_process`, 
          form, 
          {
            headers: form.getHeaders()
          }
        );

        const { percentage, feedback } = response.data;
        
        sendToClient(this.ws, { 
          type: "progress", 
          percentage, 
          feedback 
        });

        // Check if enrollment is complete
        if (percentage >= 100 && !this.isEnrolled) {
          this.isEnrolled = true;
          
          await axios.post(`${config.PYTHON_SERVICE_URL}/enroll_save`, { 
            userNum: this.userNum 
          });
          
          sendToClient(this.ws, { 
            type: "success", 
            percentage: 100, 
            message: "Enrollment complete!" 
          });
          
          console.log(`✅ Profile Saved: Provider ${this.userNum}`);
        }
        
      } catch (error) {
        console.error("❌ Enrollment Error:", error.message);
        sendToClient(this.ws, { 
          type: "error", 
          message: "Enrollment failed" 
        });
      }
    }
  }

  handleDisconnect() {
    console.log("⚪ Enrollment session closed");
    if (this.userNum && !this.isEnrolled) {
      console.log(`   Incomplete enrollment for Provider: ${this.userNum}`);
    }
  }
}

module.exports = EnrollmentHandler;