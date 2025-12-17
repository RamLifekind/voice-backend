const axios = require("axios");
const FormData = require("form-data");
const config = require("../config");
const { safeInt16Array } = require("../utils/audio.utils");

class EagleRecognitionService {
  constructor(onVerification) {
    this.onVerification = onVerification;
    this.eagleBuffer = [];
  }

  processAudio(audioBuffer) {
    // Convert to Int16Array
    const pcm = safeInt16Array(audioBuffer);
    
    // Accumulate samples
    for (let i = 0; i < pcm.length; i++) {
      this.eagleBuffer.push(pcm[i]);
    }

    // Process when we have enough samples
    if (this.eagleBuffer.length >= config.AUDIO_CHUNK_SIZE) {
      const chunk = new Int16Array(this.eagleBuffer);
      this.eagleBuffer = [];

      // Non-blocking recognition
      this.recognize(chunk).catch(() => {
        // Silent fail - Eagle is enhancement, not critical
      });
    }
  }

  async recognize(audioChunk) {
    try {
      const form = new FormData();
      form.append('file', Buffer.from(audioChunk.buffer), { 
        filename: 'audio.pcm' 
      });

      const response = await axios.post(
        `${config.PYTHON_SERVICE_URL}/recognize`, 
        form,
        {
          headers: form.getHeaders(),
          timeout: 1000
        }
      );

      const { speaker, score } = response.data;

      // High confidence verification
      if (score > config.EAGLE_CONFIDENCE_THRESHOLD && speaker !== "Unknown") {
        if (this.onVerification) {
          this.onVerification({ speaker, score });
        }
      }
      
    } catch (error) {
      // Silent fail - don't log to avoid spam
      // Only log if it's not a timeout or network issue
      if (error.code !== 'ECONNABORTED' && error.code !== 'ETIMEDOUT') {
        console.error("⚠️  Eagle recognition error:", error.message);
      }
    }
  }

  clearBuffer() {
    this.eagleBuffer = [];
  }
}

module.exports = EagleRecognitionService;