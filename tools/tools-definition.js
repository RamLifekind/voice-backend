// Reference data for OpenAI (passed in system prompt)
const CPT_CODES = [
  {"serviceCode":"99204","serviceName":"New Patient Visit - Level 4"},
  {"serviceCode":"99213","serviceName":"Follow Up Visit - Level 3"},
  {"serviceCode":"99214","serviceName":"Follow Up Visit - Level 4"},
  {"serviceCode":"90791","serviceName":"Behavioral Health Intake"},
  {"serviceCode":"90832","serviceName":"Individual psychotherapy - 30 min"},
  {"serviceCode":"90834","serviceName":"Individual psychotherapy - 45 min"},
  {"serviceCode":"90853","serviceName":"Group Psychotherapy - General"},
  {"serviceCode":"98940","serviceName":"Chiropractic Manipulative Treatment (CMT) - Spinal; 1-2 regions"},
  {"serviceCode":"98941","serviceName":"Chiropractic Manipulative Treatment (CMT) - Spinal; 3-4 regions"},
  {"serviceCode":"97140","serviceName":"Manual Therapy"},
  {"serviceCode":"97110","serviceName":"Therapeutic Exercise"},
  {"serviceCode":"97032","serviceName":"Electrical Stimulation (attended)"},
  {"serviceCode":"97012","serviceName":"Mechanical Traction"},
  {"serviceCode":"97124","serviceName":"Massage Therapy -15 minutes"},
  {"serviceCode":"97124","serviceName":"Light Swedish Massage - 30 minutes"},
  {"serviceCode":"97150","serviceName":"Group Chair Yoga"},
  {"serviceCode":"97150","serviceName":"Group Movement Therapy"},
  {"serviceCode":"97110","serviceName":"Group Yoga"},
  {"serviceCode":"S9451","serviceName":"Group Tai Chi"},
  {"serviceCode":"97139","serviceName":"Reiki or Energy work"},
  {"serviceCode":"97112","serviceName":"Joint Mobility/Kinesiology Taping"},
  {"serviceCode":"97810","serviceName":"Acupuncture - 15 min"},
  {"serviceCode":"90832","serviceName":"Unit - Telemed Behavioral"},
  {"serviceCode":"90832","serviceName":"Telemed Behavioral"},
  {"serviceCode":"99214","serviceName":"Unit - Telemed Medical"},
  {"serviceCode":"99213","serviceName":"Telemed Medical"},
  {"serviceCode":"99213","serviceName":"Unit - Telemed FastRx"},
  {"serviceCode":"97110","serviceName":"Unit - Telemed Physical Reconditioning"},
  {"serviceCode":"97110","serviceName":"Telemed Physical Reconditioning"},
  {"serviceCode":"99490","serviceName":"Care Management"},
  {"serviceCode":"97803","serviceName":"Unit - Nutrition Therapy (FU)"},
  {"serviceCode":"97802","serviceName":"Unit - Nutrition Therapy (NP)"},
  {"serviceCode":"97802","serviceName":"Medical Nutrition Therapy (NP)"},
  {"serviceCode":"97804","serviceName":"Medical Nutrition Therapy (Group)"},
  {"serviceCode":"90853","serviceName":"Telemed Group Psychotherapy - Improving Sleep"},
  {"serviceCode":"90853","serviceName":"Telemed Group Psychotherapy - Habits and Addictions"},
  {"serviceCode":"90853","serviceName":"Telemed Group Psychotherapy - Managing Stress"},
  {"serviceCode":"97804","serviceName":"Telemed Medical Nutrition Therapy (Group)"},
  {"serviceCode":"97026","serviceName":"Infrared Therapy"},
  {"serviceCode":"97012","serviceName":"Traction"},
  {"serviceCode":"80305","serviceName":"Internal UDS Screen"},
  {"serviceCode":"97811","serviceName":"Acupuncture - 30 min"},
  {"serviceCode":"L0648","serviceName":"DME Fitting - Lower Back Brace (Aspen)"},
  {"serviceCode":"L1851","serviceName":"DME Fitting - OA Knee Brace, Unloader (Aspen)"},
  {"serviceCode":"J1885","serviceName":"Toradol Injection"},
  {"serviceCode":"96372","serviceName":"Injection Administration (SQ/IM)"},
  {"serviceCode":"96130","serviceName":"Psychological Testing Evaluation, First 30 Minutes"},
  {"serviceCode":"96136","serviceName":"Psychological Testing Administration, First 30 Minutes"},
  {"serviceCode":"99487","serviceName":"Complex Chronic Care Management, First 60 min."},
  {"serviceCode":"99489","serviceName":"Complex Chronic Care Management, Each Additional 30 min."},
  {"serviceCode":"99439","serviceName":"Chronic Care Management, Each Additional 20 min."},
  {"serviceCode":"90785","serviceName":"Interactive Complexity"},
  {"serviceCode":"97802","serviceName":"Telehealth-Medical Nutrition Therapy (NP)"},
  {"serviceCode":"99213","serviceName":"Unit - Group Education"},
  {"serviceCode":"90785","serviceName":"Interactive Complexity, Telehealth"},
  {"serviceCode":"99214","serviceName":"Telemed Medical Follow Up, In Office - Level 4"},
  {"serviceCode":"99426","serviceName":"Principal Care Management (Clinical Staff), First 30 min."},
  {"serviceCode":"99427","serviceName":"Principal Care Management (Clinical Staff), Each Additional 30 min."},
  {"serviceCode":"96127","serviceName":"Developmental and Behavioral Screening and Testing"}
];

const GHS_SCORES = [
  {
    "category": "body",
    "values": [
      { "label": "good", "code": 1 },
      { "label": "challenging", "code": 2 },
      { "label": "poor", "code": 3 }
    ]
  },
  {
    "category": "interactivity",
    "values": [
      { "label": "good", "code": 1 },
      { "label": "challenging", "code": 2 },
      { "label": "poor", "code": 3 }
    ]
  },
  {
    "category": "mind",
    "values": [
      { "label": "good", "code": 1 },
      { "label": "challenging", "code": 2 },
      { "label": "poor", "code": 3 }
    ]
  },
  {
    "category": "motivation",
    "values": [
      { "label": "good", "code": 1 },
      { "label": "challenging", "code": 2 },
      { "label": "poor", "code": 3 }
    ]
  },
  {
    "category": "response",
    "values": [
      { "label": "good", "code": 1 },
      { "label": "challenging", "code": 2 },
      { "label": "poor", "code": 3 }
    ]
  },
  {
    "category": "social",
    "values": [
      { "label": "good", "code": 1 },
      { "label": "challenging", "code": 2 },
      { "label": "poor", "code": 3 }
    ]
  },
  {
    "category": "substance",
    "values": [
      { "label": "good", "code": 1 },
      { "label": "challenging", "code": 2 },
      { "label": "poor", "code": 3 }
    ]
  }
];

// Patient documents available for search
const PATIENT_DOCUMENTS = [
  {
    "docId": "MRI_LUMBAR_001",
    "title": "Lumbar MRI Photo",
    "url": "https://staidatafocus.blob.core.windows.net/scans-reports-scrum/3103.png",
    "type": "mri",
    "date": "2024-12-10"
  },
  {
    "docId": "MRI_CERVICAL_001",
    "title": "MRI - Cervical Spine",
    "url": "https://staidatafocus.blob.core.windows.net/scans-reports-scrum/3093.jpg",
    "type": "mri",
    "date": "2024-12-08"
  },
  {
    "docId": "CT_LUMBAR_001",
    "title": "CT Scan of Lumbar Spine",
    "url": "https://staidatafocus.blob.core.windows.net/scans-reports-scrum/2576.png",
    "type": "ct_scan",
    "date": "2024-12-05"
  },
  {
    "docId": "XRAY_ANKLE_001",
    "title": "X-Ray Ankle",
    "url": "https://staidatafocus.blob.core.windows.net/scans-reports-scrum/3708.jpeg",
    "type": "xray",
    "date": "2024-12-03"
  }
];

// Tools definition for OpenAI
const tools = [
  {
    type: "function",
    name: "handle_care_unit_action",
    description: "Add, update, or delete a CPT-based care action. Select appropriate CPT code from the provided list based on the service mentioned.",
    parameters: {
      type: "object",
      properties: {
        provider_id: { 
          type: "number",
          description: "Provider UserNum performing the action"
        },
        provider_name: {
          type: "string",
          description: "Provider name"
        },
        operation: { 
          type: "string", 
          enum: ["add", "update", "delete"],
          description: "Type of operation"
        },
        service_code: { 
          type: "string",
          description: "CPT/service code (e.g., '99213')"
        },
        service_name: {
          type: "string",
          description: "Full service name"
        }
      },
      required: ["provider_id", "provider_name", "operation", "service_code", "service_name"],
      additionalProperties: false
    },
    strict: true
  },
  {
    type: "function",
    name: "update_ghs_score",
    description: "Update a Global Health Score category. Match the spoken description to the appropriate category and code from the provided GHS scores.",
    parameters: {
      type: "object",
      properties: {
        provider_id: { 
          type: "number",
          description: "Provider UserNum making the update"
        },
        provider_name: {
          type: "string",
          description: "Provider name"
        },
        category: {
          type: "string",
          enum: ["body", "interactivity", "mind", "motivation", "response", "social", "substance"],
          description: "GHS category to update"
        },
        code: {
          type: "number",
          enum: [1, 2, 3],
          description: "Score code (1=Good/Low, 2=Moderate/Medium, 3=Poor/High)"
        },
        label: {
          type: "string",
          description: "Full descriptive label for the score"
        }
      },
      required: ["provider_id", "provider_name", "category", "code", "label"],
      additionalProperties: false
    },
    strict: true
  },
  {
    type: "function",
    name: "open_imaging_results",
    description: "Open patient imaging results by date. Parse dates from natural language like 'August 2025', 'June 22nd', 'August 17th 2025', etc.",
    parameters: {
      type: "object",
      properties: {
        provider_id: {
          type: "number",
          description: "Provider UserNum making the request"
        },
        provider_name: {
          type: "string",
          description: "Provider name"
        },
        order_date: {
          type: "string",
          description: "Order date in YYYY-MM-DD format parsed from user's natural language input"
        },
        spoken_date: {
          type: "string",
          description: "The original date phrase spoken by the user (e.g., 'August 2025', 'June 22nd')"
        }
      },
      required: ["provider_id", "provider_name", "order_date", "spoken_date"],
      additionalProperties: false
    },
    strict: true
  },
  {
    type: "function",
    name: "start_scrum",
    description: "Start the scrum meeting. This will trigger the UI to begin the scrum session.",
    parameters: {
      type: "object",
      properties: {
        provider_id: { 
          type: "number",
          description: "Provider UserNum starting the scrum"
        },
        provider_name: {
          type: "string",
          description: "Provider name"
        }
      },
      required: ["provider_id", "provider_name"],
      additionalProperties: false
    },
    strict: true
  },
  {
  type: "function",
  name: "close_ui_element",
  description: "Close any open UI element (modal, image, report, document, xray, etc.) regardless of what the user says. Trigger on ANY close-related phrase: 'close it', 'close this', 'close the window', 'close xray', 'close', 'dismiss', etc.",
  parameters: {
    type: "object",
    properties: {
      provider_id: {
        type: "number",
        description: "Provider UserNum"
      },
      provider_name: {
        type: "string",
        description: "Provider name"
      },
      element_type: {
        type: "string",
        description: "What the user said to close (e.g., 'it', 'window', 'xray', 'report') - UI will close whatever is currently open"
      }
    },
    required: ["provider_id", "provider_name", "element_type"],
    additionalProperties: false
  },
  strict: true
},

  {
  type: "function",
  name: "approve_action",
  description: "Approve a pending action or decision.",
  parameters: {
    type: "object",
    properties: {
      provider_id: { 
        type: "number",
        description: "Provider UserNum approving the action"
      },
      provider_name: {
        type: "string",
        description: "Provider name"
      },
      action_description: {
        type: "string",
        description: "Description of what is being approved"
      }
    },
    required: ["provider_id", "provider_name", "action_description"],
    additionalProperties: false
  },
  strict: true
}
];

module.exports = { 
  tools, 
  CPT_CODES, 
  GHS_SCORES, 
  PATIENT_DOCUMENTS 
};