/**
 * Local Command Parser
 * Instant pattern matching for voice commands — skips OpenAI round-trip (~5ms vs ~3s).
 * Returns a result object identical to what OpenAI would produce, or null to fall back.
 */

// ---------------------------------------------------------------------------
// GHS category aliases → DB column name
// ---------------------------------------------------------------------------
const GHS_CATEGORIES = {
  body: "PScoreBody",
  interactivity: "PScoreInteractivity",
  mind: "PScoreMind",
  motivation: "PScoreMotivation",
  response: "PScoreResponse",
  vulnerability: "PScoreSocVulnerability",
  "social vulnerability": "PScoreSocVulnerability",
  substance: "PScoreSubstance",
  "substance risk": "PScoreSubstance",
};

// ---------------------------------------------------------------------------
// GHS value aliases → normalized integer (as string, same as OpenAI output)
// ---------------------------------------------------------------------------
const GHS_VALUES = {
  // Numbers
  "1": "1", "2": "2", "3": "3",
  // Colors (universal)
  green: "1", yellow: "2", red: "3",
  // Body / Mind
  good: "1", challenging: "2", poor: "3",
  // Interactivity
  cooperative: "1", moderate: "2", difficult: "3",
  // Motivation
  limited: "2", none: "3",
  // Response
  circle: "1", square: "2", triangle: "3",
  // Social Vulnerability / Substance
  low: "1", medium: "2", high: "3",
  // Mind letters
  a: "1", b: "2", c: "3",
  // Descriptors
  excellent: "1", stable: "1", some: "2", significant: "3", complete: "3",
};

// ---------------------------------------------------------------------------
// GHS category-specific acknowledgment labels
// ---------------------------------------------------------------------------
const GHS_LABELS = {
  PScoreBody:             { name: "Body",                 1: "Good",        2: "Challenging", 3: "Poor" },
  PScoreInteractivity:    { name: "Interactivity",        1: "Cooperative", 2: "Moderate",    3: "Difficult" },
  PScoreMind:             { name: "Mind",                 1: "A - Good",    2: "B - Challenging", 3: "C - Poor" },
  PScoreMotivation:       { name: "Motivation",           1: "Green",       2: "Yellow",      3: "Red" },
  PScoreResponse:         { name: "Response",             1: "Circle",      2: "Square",      3: "Triangle" },
  PScoreSocVulnerability: { name: "Social Vulnerability", 1: "Low",         2: "Medium",      3: "High" },
  PScoreSubstance:        { name: "Substance",            1: "Low",         2: "Medium",      3: "High" },
};

// Build sorted category keys for regex (longest first to match "social vulnerability" before "substance")
const CATEGORY_KEYS = Object.keys(GHS_CATEGORIES).sort((a, b) => b.length - a.length);
const VALUE_KEYS = Object.keys(GHS_VALUES).sort((a, b) => b.length - a.length);

const CATEGORY_PATTERN = CATEGORY_KEYS.join("|");
const VALUE_PATTERN = VALUE_KEYS.join("|");

// "change body to green", "set body to 2", "update mind to B", "body to good", "mark body as green"
const GHS_CHANGE_RE = new RegExp(
  `(?:change|set|update|mark|make)\\s+(${CATEGORY_PATTERN})\\s+(?:to|as|at)\\s+(${VALUE_PATTERN})`,
  "i"
);

// "body is green", "motivation is limited", "substance is high"
const GHS_IS_RE = new RegExp(
  `(${CATEGORY_PATTERN})\\s+(?:is|to)\\s+(${VALUE_PATTERN})`,
  "i"
);

// ---------------------------------------------------------------------------
// Close / Approve / Show / Brief patterns
// ---------------------------------------------------------------------------
const CLOSE_RE = /^(?:close|dismiss|hide|exit)\b(?:\s+(?:the\s+)?(.+))?$/i;
const APPROVE_RE = /^(?:approve|approved|approve\s+(?:the\s+)?(?:treatment\s+plan|action|care\s+plan|plan))$/i;

const SHOW_DOC_RE = /(?:show|display|view|pull\s+up|open)\s+(?:the\s+)?(?:patient\s+)?(.+?)(?:\s+(?:document|report|scan|image|file))?$/i;
const BRIEF_DOC_RE = /(?:brief|summarize|read|analyze|describe)\s+(?:the\s+)?(?:latest\s+)?(?:patient\s+)?(.+?)(?:\s+(?:document|report|scan|image|file))?$/i;

// ---------------------------------------------------------------------------
// Document keyword matching
// ---------------------------------------------------------------------------
function findDocumentByKeyword(keyword, documents) {
  if (!documents || !documents.length || !keyword) return null;

  const kw = keyword.toLowerCase().trim();

  // Direct name match
  const nameMatch = documents.find((d) =>
    (d.documentName || "").toLowerCase().includes(kw)
  );
  if (nameMatch) return nameMatch;

  // Type match (e.g., "report", "scan")
  const typeMatch = documents.find((d) =>
    (d.documentType || "").toLowerCase().includes(kw)
  );
  if (typeMatch) return typeMatch;

  return null;
}

// ---------------------------------------------------------------------------
// Main parse function
// ---------------------------------------------------------------------------

/**
 * Parse a voice command locally.
 *
 * @param {string} text        - Cleaned text (L.I.N.A. name already stripped)
 * @param {string} providerId  - Provider UserNum (UUID)
 * @param {string} providerName - Provider display name
 * @param {object} context     - { patientData } for document matching
 * @returns {{ type: string, name: string, arguments: object, confirmation: string } | null}
 *   Returns a result object on match, or null to fall back to OpenAI.
 */
function parse(text, providerId, providerName, context = {}) {
  const trimmed = text.trim();
  if (!trimmed) return null;

  // --- GHS: "change body to green" / "set mind to B" / "update substance to high" ---
  let ghsMatch = GHS_CHANGE_RE.exec(trimmed);
  if (!ghsMatch) {
    // --- GHS: "body is green" / "motivation is limited" ---
    ghsMatch = GHS_IS_RE.exec(trimmed);
  }

  if (ghsMatch) {
    const categoryRaw = ghsMatch[1].toLowerCase();
    const valueRaw = ghsMatch[2].toLowerCase();

    const category = GHS_CATEGORIES[categoryRaw];
    const value = GHS_VALUES[valueRaw];

    if (category && value) {
      const cat = GHS_LABELS[category] || { name: category };
      const valueDisplay = cat[value] || value;

      return {
        type: "function_call",
        name: "update_ghs_score",
        arguments: {
          provider_id: providerId,
          provider_name: providerName,
          category,
          value,
        },
        confirmation: `Health score updated: ${cat.name} to ${valueDisplay}`,
      };
    }
  }

  // --- Close ---
  const closeMatch = CLOSE_RE.exec(trimmed);
  if (closeMatch) {
    return {
      type: "function_call",
      name: "close_ui_element",
      arguments: {
        provider_id: providerId,
        provider_name: providerName,
        element_type: closeMatch[1] || "it",
      },
      confirmation: null,
    };
  }

  // --- Approve ---
  if (APPROVE_RE.test(trimmed)) {
    return {
      type: "function_call",
      name: "approve_action",
      arguments: {
        provider_id: providerId,
        provider_name: providerName,
        action_description: "treatment plan",
      },
      confirmation: "Care unit treatment plan is approved",
    };
  }

  // --- Brief document ---
  const briefMatch = BRIEF_DOC_RE.exec(trimmed);
  if (briefMatch && context.patientData?.documents?.length) {
    const doc = findDocumentByKeyword(briefMatch[1], context.patientData.documents);
    if (doc) {
      return {
        type: "function_call",
        name: "brief_patient_document",
        arguments: {
          provider_id: providerId,
          provider_name: providerName,
          document_id: doc.documentId,
          document_name: doc.documentName,
        },
        confirmation: null,
      };
    }
  }

  // --- Show document ---
  const showMatch = SHOW_DOC_RE.exec(trimmed);
  if (showMatch && context.patientData?.documents?.length) {
    const doc = findDocumentByKeyword(showMatch[1], context.patientData.documents);
    if (doc) {
      return {
        type: "function_call",
        name: "show_patient_document",
        arguments: {
          provider_id: providerId,
          provider_name: providerName,
          document_id: doc.documentId,
          document_name: doc.documentName,
        },
        confirmation: null,
      };
    }
  }

  // --- No match → fall back to OpenAI ---
  return null;
}

module.exports = { parse, GHS_LABELS };
