const sql = require("mssql");
const db = require("./database.service");
const TTSService = require("./tts.service");

// ============================================================
// SYNTHETIC FALLBACK DATA
// Used when DB SPs are unavailable or return no data
// Single patient: Gilian Negata — chronic lower back pain
// ============================================================
const FALLBACK_PATIENT = {
  id: 3001,
  fullName: 'Gilian Negata',
  firstName: 'Gilian',
  lastName: 'Negata',
  diagnosis: 'Chronic lower back pain, lumbar radiculopathy',
  casePresentation: {
    Diagnoses: 'Chronic lower back pain, lumbar radiculopathy',
    Prescriptions: 'Gabapentin 300mg TID, Meloxicam 15mg daily, Cyclobenzaprine 10mg PRN',
    Treatments: 'CMT spinal 3-4 regions, therapeutic exercise, manual therapy, acupuncture',
    Labs: 'CBC normal (2026-02-08), HbA1c 6.8% elevated (2026-02-08)',
    Imaging: 'MRI Lumbar Spine (2026-01-20): L4-L5 disc herniation with moderate foraminal stenosis; X-Ray Lower Back (2026-02-01): mild degenerative changes L3-L5',
    Vitals: 'BP 128/82, HR 74, Temp 98.4F, Pain 6/10'
  },
  healthScores: [
    { label: 'Body', score: 2 },
    { label: 'Mind', score: 1 },
    { label: 'Motivation', score: 1 },
    { label: 'Response', score: 2 },
    { label: 'Interactivity', score: 1 },
    { label: 'Social Vulnerability', score: 1 },
    { label: 'Substance Risk', score: 1 }
  ],
  careActions: [
    { Discipline: 'Chiropractic', Service: 'CMT - Spinal 3-4 regions', CPTCode: '98941' },
    { Discipline: 'Physical Therapy', Service: 'Therapeutic Exercise', CPTCode: '97110' },
    { Discipline: 'Medical', Service: 'Follow Up Visit - Level 3', CPTCode: '99213' }
  ],
  reports: [
    {
      OrderName: 'MRI Lumbar Spine',
      OrderDate: '2026-01-20',
      ImageUrl: 'https://staidatafocus.blob.core.windows.net/scans-reports-scrum/3103.png',
      ReportType: 'MRI',
      Findings: 'L4-L5 disc herniation with moderate foraminal stenosis. Mild facet arthropathy at L3-L4 and L4-L5. No spinal cord compression.'
    },
    {
      OrderName: 'X-Ray Lower Back',
      OrderDate: '2026-02-01',
      ImageUrl: 'https://staidatafocus.blob.core.windows.net/scans-reports-scrum/3708.jpeg',
      ReportType: 'X-Ray',
      Findings: 'Mild degenerative disc disease at L3-L5. Loss of normal lordotic curvature. No fracture or subluxation identified.'
    },
    {
      OrderName: 'CT Scan Lumbar Spine',
      OrderDate: '2026-02-10',
      ImageUrl: 'https://staidatafocus.blob.core.windows.net/scans-reports-scrum/2576.png',
      ReportType: 'CT',
      Findings: 'Confirms L4-L5 disc herniation. Mild bilateral facet hypertrophy L4-L5. Neural foramina mildly narrowed bilaterally.'
    }
  ]
};

const FALLBACK_PROVIDER = {
  FirstName: 'Sue',
  LastName: 'Hopkins',
  ImageURL: 'https://staidatafocus.blob.core.windows.net/uat/providers/woman8.png'
};

class AttendanceService {
  constructor() {
    this.ttsService = new TTSService();
  }

  async markAttendance(providerOid, unitId, scrumSessionId, recognitionScore) {
    try {
      const pool = await db.getPool();
      const request = pool.request();
      request.input('UnitID', sql.UniqueIdentifier, unitId);
      request.input('ScrumSessionID', sql.UniqueIdentifier, scrumSessionId);
      request.input('ProviderUserID', sql.UniqueIdentifier, providerOid);
      request.input('RecognitionScore', sql.Decimal(8, 4), recognitionScore || 0);
      request.input('RecognizedAt', sql.DateTime, new Date());

      const result = await request.execute('api.sRecordProviderAttendance');
      const row = result.recordset?.[0];
      const alreadyMarked = row?.attendanceStatus === 'AlreadyMarked';

      return { success: true, alreadyMarked: !!alreadyMarked };
    } catch (error) {
      console.error(`❌ Attendance error:`, error.message);
      return { success: false, alreadyMarked: false };
    }
  }

  async getProviderInfo(providerOid) {
    try {
      const pool = await db.getPool();
      const request = pool.request();
      request.input('ProviderUserID', sql.UniqueIdentifier, providerOid);
      request.input('AsOfDate', sql.Date, new Date());

      const result = await request.execute('api.sGetWelcomeData');
      const row = result.recordset?.[0];

      if (row) {
        return {
          FirstName: row.firstName || row.fullName?.split(' ')[0] || 'Provider',
          LastName: row.lastName || '',
          ImageURL: row.profileImageUrl || null
        };
      }

      return FALLBACK_PROVIDER;

    } catch (error) {
      console.error(`❌ Provider lookup error:`, error.message);
      return FALLBACK_PROVIDER;
    }
  }

  async playWelcomeMessage(providerOid, callback) {
    try {
      const providerInfo = await this.getProviderInfo(providerOid);
      if (!providerInfo) return;

      const firstName = providerInfo.FirstName || 'Provider';
      const text = `Welcome, ${firstName}. Your attendance has been marked.`;

      this.ttsService.generateSpeech(text, (audioBuffer) => {
        if (callback) callback(audioBuffer, providerInfo);
      });
    } catch (error) {
      console.error(`❌ Welcome TTS error:`, error.message);
    }
  }

  /**
   * Get patient data via api.sGetPatientOverview
   * @param {string} patientId - Patient GUID
   * @returns {Promise<object>} Patient data with clinical details
   */
  async getPatientData(patientId) {
    try {
      const pool = await db.getPool();
      const request = pool.request();
      request.input('UnitID', sql.UniqueIdentifier, null);
      request.input('PatientID', sql.UniqueIdentifier, patientId);

      const result = await request.execute('api.sGetPatientOverview');
      const row = result.recordset?.[0];

      if (!row) return FALLBACK_PATIENT;

      // Parse patient JSON string
      let patientInfo = {};
      if (row.patient) {
        try { patientInfo = JSON.parse(row.patient); } catch { /* ignore */ }
      }

      const fullName = patientInfo.name || 'Unknown Patient';
      const nameParts = fullName.split(' ');
      const firstName = nameParts[0] || 'Unknown';
      const lastName = nameParts.slice(1).join(' ') || 'Patient';

      // Parse case presentation
      let casePresentation = null;
      let diagnosis = null;
      if (row.casePresentation) {
        try {
          casePresentation = JSON.parse(row.casePresentation);
          diagnosis = casePresentation.diagnoses || casePresentation.Diagnoses || null;
        } catch { /* ignore */ }
      }

      // Parse GHS scores
      let healthScores = [];
      if (row.ghs) {
        try {
          const ghsData = JSON.parse(row.ghs);
          const ghsArray = Array.isArray(ghsData) ? ghsData : [ghsData];
          healthScores = ghsArray.map(g => ({
            label: (g.category || '').charAt(0).toUpperCase() + (g.category || '').slice(1),
            score: g.score || 1
          }));
        } catch { /* ignore */ }
      }

      // Parse care actions
      let careActions = [];
      if (row.careActions) {
        try {
          const caData = JSON.parse(row.careActions);
          const providerActions = caData.providerActions || [];
          const aiSuggestions = caData.aiSuggestions || [];
          careActions = [...providerActions, ...aiSuggestions].map(a => ({
            Discipline: a.disciplineCode || a.serviceCode || '',
            Service: a.serviceName || a.actionDisplay || '',
            CPTCode: a.cptCode || a.serviceCode || '',
            ServiceCatalogId: a.serviceCatalogId || a.ServiceCatalogId || null,
            isAiSuggestion: aiSuggestions.includes(a),
          }));
        } catch { /* ignore */ }
      }

      // Parse documents/reports
      let reports = [];
      if (row.documents) {
        try {
          reports = JSON.parse(row.documents);
        } catch { /* ignore */ }
      }

      // Parse AI content for encounter prep
      let aiContent = null;
      if (row.aiContent) {
        try { aiContent = JSON.parse(row.aiContent); } catch { /* ignore */ }
      }

      const patientData = {
        id: patientId,
        fullName,
        firstName,
        lastName,
        age: patientInfo.age || null,
        dob: patientInfo.dob || null,
        language: patientInfo.language || null,
        primaryCondition: patientInfo.primaryCondition || null,
        diagnosis,
        casePresentation,
        healthScores,
        careActions,
        reports,
        aiContent
      };

      return patientData;

    } catch (error) {
      console.error(`❌ Patient data error:`, error.message);
      return FALLBACK_PATIENT;
    }
  }

  async getPatientDocuments(patientId) {
    try {
      const pool = await db.getPool();
      const request = pool.request();
      request.input("PatientID", sql.UniqueIdentifier, patientId);
      const result = await request.execute("api.sGetPatientDocuments");
      return result.recordset || [];
    } catch (error) {
      console.error(`❌ Patient documents error:`, error.message);
      return [];
    }
  }
}

module.exports = AttendanceService;