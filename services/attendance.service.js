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

  /**
   * Get patient data including demographics, case presentation, and reports
   * @param {number} userNum - Patient UserNum
   * @returns {Promise<object>} Patient data with reports
   */
  async getPatientData(userNum) {
    try {
      // Fetch patient details using the same SP as the frontend
      const patientResult = await db.execSP('pilot.sPatientDetailGet', { UserNum: userNum });

      if (!patientResult || patientResult.length === 0) {
        throw new Error(`Patient ${userNum} not found`);
      }

      const patient = patientResult[0];

      // Log ALL fields from stored procedure for debugging
      console.log(`[AttendanceService] Raw patient data from SP:`, JSON.stringify(patient, null, 2));
      console.log(`[AttendanceService] FullName: ${patient.FullName}`);
      console.log(`[AttendanceService] FirstName: ${patient.FirstName}`);
      console.log(`[AttendanceService] LastName: ${patient.LastName}`);

      // Fetch imaging/reports using the same SP as the frontend
      const reportsResult = await db.execSP('pilot.sPatientOrderImageAndResultGet', { UserNum: userNum });

      // Extract name - SP returns FullName, not FirstName/LastName
      let firstName = 'Unknown';
      let lastName = 'Patient';

      if (patient.FullName) {
        const nameParts = patient.FullName.split(' ');
        if (nameParts.length >= 2) {
          firstName = nameParts[0];
          lastName = nameParts.slice(1).join(' ');
        } else {
          firstName = patient.FullName;
          lastName = '';
        }
      } else if (patient.FirstName || patient.LastName) {
        firstName = patient.FirstName || 'Unknown';
        lastName = patient.LastName || 'Patient';
      }

      // Parse patient data
      const patientData = {
        id: userNum,
        fullName: patient.FullName || `${firstName} ${lastName}`,
        firstName: firstName,
        lastName: lastName,
        diagnosis: null,
        casePresentation: null,
        healthScores: [],
        careActions: [],
        reports: reportsResult || []
      };

      // Parse CasePresentationAI for diagnosis and details
      if (patient.CasePresentationAI) {
        try {
          const casePresentationJson = JSON.parse(patient.CasePresentationAI);
          const caseData = Array.isArray(casePresentationJson) ? casePresentationJson[0] : casePresentationJson;
          patientData.casePresentation = caseData;
          patientData.diagnosis = caseData.Diagnoses || null;
        } catch (parseErr) {
          console.error('[AttendanceService] Failed to parse CasePresentationAI:', parseErr);
        }
      }

      // Parse health scores
      if (patient.PatientGlobalHealthScore) {
        try {
          const scoresJson = JSON.parse(patient.PatientGlobalHealthScore);
          const scoresData = Array.isArray(scoresJson) ? scoresJson[0] : scoresJson;
          patientData.healthScores = [
            { label: "Body", score: scoresData.PScoreBody || 1 },
            { label: "Mind", score: scoresData.PScoreMind || 1 },
            { label: "Motivation", score: scoresData.PScoreMotivation || 1 },
            { label: "Response", score: scoresData.PScoreResponse || 1 },
            { label: "Interactivity", score: scoresData.PScoreInteractivity || 1 },
            { label: "Social Vulnerability", score: scoresData.PScoreSocVuln || 1 },
            { label: "Substance Risk", score: scoresData.PScoreSubstance || 1 }
          ];
        } catch (parseErr) {
          console.error('[AttendanceService] Failed to parse PatientGlobalHealthScore:', parseErr);
        }
      }

      // Parse care actions
      if (patient.CareActions) {
        try {
          const careActionsJson = JSON.parse(patient.CareActions);
          patientData.careActions = Array.isArray(careActionsJson) ? careActionsJson : [careActionsJson];
        } catch (parseErr) {
          console.error('[AttendanceService] Failed to parse CareActions:', parseErr);
        }
      }

      return patientData;

    } catch (error) {
      console.error(`❌ Error getting patient data for ${userNum}:`, error.message);
      throw error;
    }
  }
}

module.exports = AttendanceService;