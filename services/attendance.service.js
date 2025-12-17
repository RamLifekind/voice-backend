const config = require("../config");
const db = require("./database.service");
const TTSService = require("./tts.service");

class AttendanceService {
  constructor() {
    this.ttsService = new TTSService();
  }

  async markAttendance(userNum) {
    try {
      console.log(`📝 Marking attendance for Provider UserNum: ${userNum}`);
      
      await db.execSP('pilot.sUnitProviderPresentSet', { UserNum: userNum });
      
      console.log(`✅ Attendance marked for Provider ${userNum}`);
      return true;
      
    } catch (error) {
      console.error(`❌ Attendance error for Provider ${userNum}:`, error.message);
      return false;
    }
  }

  async getProviderInfo(userNum) {
    try {
      const result = await db.execSP('pilot.sUnitProviderImageGet', { UserNum: userNum });
      
      if (result && result.length > 0) {
        return result[0];
      }
      
      return null;
      
    } catch (error) {
      console.error(`❌ Error getting provider info for ${userNum}:`, error.message);
      return null;
    }
  }

  async playWelcomeMessage(userNum, callback) {
    try {
      const providerInfo = await this.getProviderInfo(userNum);
      
      if (!providerInfo) {
        console.error(`❌ No provider info found for UserNum: ${userNum}`);
        return;
      }
      
      const firstName = providerInfo.FirstName || 'Provider';
      const text = `Welcome, ${firstName}. Your attendance has been marked.`;
      
      // Use TTS service
      this.ttsService.generateSpeech(text, (audioBuffer) => {
        if (callback) {
          callback(audioBuffer, providerInfo);
        }
      });
      
    } catch (error) {
      console.error(`❌ Welcome message error for Provider ${userNum}:`, error.message);
    }
  }
}

module.exports = AttendanceService;