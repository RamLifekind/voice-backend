const config = require("../config");
const { tools } = require("../tools/tools-definition");
const { getCPTResolver } = require("./cpt-resolver.service");

// GHS value normalization — maps any spoken term to 1, 2, or 3
const GHS_VALUE_MAP = {
  // Numeric (string or number)
  "1": 1, "2": 2, "3": 3,
  // Colors (Motivation)
  "green": 1, "yellow": 2, "red": 3,
  // Levels (Substance, Social Vulnerability)
  "low": 1, "medium": 2, "high": 3,
  // Letters (Mind)
  "a": 1, "b": 2, "c": 3,
  // Shapes (Response)
  "circle": 1, "square": 2, "triangle": 3,
  // Interactivity
  "cooperative": 1, "moderate": 2, "difficult": 3,
  // General descriptors
  "good": 1, "excellent": 1, "stable": 1,
  "challenging": 2, "limited": 2, "some": 2,
  "poor": 3, "significant": 3, "complete": 3,
};

/**
 * Normalize GHS value — try direct lookup first, then scan for keywords
 */
function normalizeGhsValue(raw) {
  const lower = raw.trim().toLowerCase();

  // Direct match
  if (GHS_VALUE_MAP[lower] !== undefined) return GHS_VALUE_MAP[lower];

  // Scan for keywords in longer phrases (e.g. "risk too high" → "high")
  for (const [key, val] of Object.entries(GHS_VALUE_MAP)) {
    if (key.length >= 3 && lower.includes(key)) return val;
  }

  return null;
}

// Scrum-mode functions (pre-scrum uses keyword matching, no OpenAI)
const SCRUM_FUNCTIONS = [
  "handle_care_unit_action",
  "update_ghs_score",
  "open_imaging_results",
  "close_ui_element",
  "approve_action",
  "brief_patient_document",
  "show_patient_document",
];

class OpenAIService {
  constructor(onResult) {
    this.onResult = onResult;
  }

  /**
   * Process scrum-mode input — handles both commands (function calls) and
   * conversational questions (text responses). OpenAI decides which.
   *
   * @param {string} text - Cleaned text (L.I.N.A. name already stripped)
   * @param {string|number} speakerId - Provider OID / UserNum
   * @param {string} displayName - Provider display name
   * @param {string} imageURL - Provider image URL
   * @param {object} patientData - Current patient context (may be null)
   * @param {Array} linaHistory - Previous L.I.N.A. exchanges for context
   */
  async processScrum(text, speakerId, displayName, imageURL, patientData, linaHistory = []) {
    this._patientData = patientData;

    if (!config.AZURE_OPENAI_ENDPOINT || !config.AZURE_OPENAI_KEY) {
      console.warn("⚠️  OpenAI not configured");
      return;
    }

    try {
      const scrumTools = tools.filter((t) => SCRUM_FUNCTIONS.includes(t.name));
      const systemPrompt = this.getScrumPrompt(speakerId, displayName, patientData);

      // Build message list: system → history → current
      const messages = [{ role: "system", content: systemPrompt }];

      // Add previous Avery exchanges as context (handles STT splits)
      for (const entry of linaHistory) {
        messages.push({ role: entry.role, content: entry.text });
      }

      // Current message — attach imaging if relevant (Chat Completions vision format)
      const imageUrls = this.getRelevantImageUrls(text, patientData);

      if (imageUrls.length > 0) {
        console.log(`[L.I.N.A.] Attaching ${imageUrls.length} image(s) for vision`);

        let reportContext = "";
        if (patientData?.reports) {
          const relevant = patientData.reports.filter(
            (r) => r.ImageUrl && imageUrls.includes(r.ImageUrl)
          );
          if (relevant.length > 0) {
            reportContext =
              "\n\nReport findings:\n" +
              relevant
                .map((r) => `- ${r.OrderName} (${r.OrderDate}): ${r.Findings || "No findings recorded"}`)
                .join("\n");
          }
        }

        const contentParts = [{ type: "text", text: text + reportContext }];
        imageUrls.forEach((url) =>
          contentParts.push({ type: "image_url", image_url: { url } })
        );
        messages.push({ role: "user", content: contentParts });
      } else {
        messages.push({ role: "user", content: text });
      }

      // Transform tools to Chat Completions format: { type, function: {...} }
      const chatTools = scrumTools.map((t) => ({
        type: "function",
        function: {
          name: t.name,
          description: t.description,
          parameters: t.parameters,
          strict: t.strict === true,
        },
      }));

      // Chat Completions API — stable, used by the batch job successfully
      const url = `${config.AZURE_OPENAI_ENDPOINT}/openai/deployments/${config.MODEL_NAME}/chat/completions?api-version=2025-04-01-preview`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 25000);

      try {
        const response = await fetch(url, {
          method: "POST",
          headers: {
            "api-key": config.AZURE_OPENAI_KEY,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: config.MODEL_NAME,
            messages,
            tools: chatTools,
            tool_choice: "auto",
          }),
          signal: controller.signal,
        });

        if (!response.ok) {
          const errText = await response.text();
          console.error("❌ OpenAI Scrum Error:", response.status, errText);
          return;
        }

        const data = await response.json();
        await this.handleAPIResponse(data, speakerId, displayName, imageURL, text);
      } finally {
        clearTimeout(timeoutId);
      }
    } catch (error) {
      console.error("❌ OpenAI Scrum Error:", error.message);
    }
  }

  // ---------------------------------------------------------------------------
  // Response handling
  // ---------------------------------------------------------------------------

  /**
   * Parse Chat Completions response — either a tool call or a text message
   * @private
   */
  async handleAPIResponse(data, speakerId, displayName, imageURL, userText) {
    const message = data.choices?.[0]?.message;
    if (!message) {
      console.warn("⚠️  No message in OpenAI response");
      return;
    }

    // Tool call path — process the first tool call only (voice commands are single-intent)
    if (Array.isArray(message.tool_calls) && message.tool_calls.length > 0) {
      await this.handleFunctionCall(message.tool_calls[0], speakerId, displayName, imageURL);
      return;
    }

    // Text response — L.I.N.A. answering a question
    const textOut = typeof message.content === "string" ? message.content : null;

    if (textOut && this.onResult) {
      this.onResult({
        type: "ai_response",
        text: textOut,
        userText,
        providerId: speakerId,
        providerName: displayName,
      });
    }
  }

  /**
   * Handle a single tool call — includes CPT resolution for care actions
   * Input is a Chat Completions tool_call: { id, type, function: { name, arguments } }
   * @private
   */
  async handleFunctionCall(toolCall, speakerId, displayName, imageURL) {
    const fnName = toolCall.function?.name;
    const fnArgs = toolCall.function?.arguments;
    console.log("🔧 Function detected:", fnName);

    let args = {};
    try {
      args = JSON.parse(fnArgs || "{}");
    } catch (err) {
      console.error("❌ Argument parse error:", err);
    }

    // GHS value normalization — map spoken terms to 1, 2, or 3
    if (fnName === "update_ghs_score" && args.value !== undefined) {
      const raw = String(args.value);
      const normalized = normalizeGhsValue(raw);

      if (!normalized) {
        console.log(`⚠️  Unrecognized GHS value: "${raw}"`);
        if (this.onResult) {
          this.onResult({
            type: "ai_response",
            text: `I couldn't understand the score value "${raw}". Please use a number (1, 2, 3), color (green, yellow, red), or level (low, medium, high).`,
            providerId: speakerId,
            providerName: displayName,
          });
        }
        return;
      }

      args.value = normalized;
      console.log(`📊 GHS Update: ${args.category} → ${normalized} (from "${raw}")`);
    }

    // Care action resolution: check AI suggestions first, then CPT resolver
    if (fnName === "handle_care_unit_action" && args.service_description) {
      const suggestion = this._matchSuggestion(args.service_description);

      if (suggestion) {
        console.log(`✅ Suggestion match: "${args.service_description}" → ${suggestion.Service} (${suggestion.CPTCode})`);
        args.service_catalog_id = suggestion.ServiceCatalogId || null;
        args.service_code = suggestion.CPTCode;
        args.service_name = suggestion.Service;
        args.is_confirmation = true;
        args.confidence = 1.0;
        delete args.service_description;
      } else {
        // Not in suggestions — fall back to CPT resolution
        try {
          const cptResolver = getCPTResolver();
          const result = await Promise.race([
            cptResolver.resolve(args.service_description),
            new Promise((_, reject) => setTimeout(() => reject(new Error("CPT resolution timeout")), 10000)),
          ]);

          console.log(
            `🔍 CPT Resolution: "${args.service_description}" → ${result.match.serviceName} (${result.match.serviceCode}) [confidence: ${result.confidence.toFixed(3)}]`
          );

          if (result.confidence < 0.75) {
            console.log(`⚠️  Low confidence CPT match (${result.confidence.toFixed(3)}), rejecting`);
            if (this.onResult) {
              this.onResult({
                type: "ai_response",
                text: `I couldn't confidently match "${args.service_description}" to a care action. Could you be more specific?`,
                providerId: speakerId,
                providerName: displayName,
              });
            }
            return;
          }

          args.service_catalog_id = result.match.serviceCatalogId;
          args.service_code = result.match.serviceCode;
          args.service_name = result.match.serviceName;
          args.is_confirmation = false;
          args.confidence = parseFloat(result.confidence.toFixed(3));
          delete args.service_description;
        } catch (err) {
          console.error("❌ CPT Resolution error:", err.message);
          if (this.onResult) {
            this.onResult({
              type: "ai_response",
              text: `I had trouble resolving that care action. Could you try again?`,
              providerId: speakerId,
              providerName: displayName,
            });
          }
          return;
        }
      }
    }

    // Attach image URL to args based on provider_id from OpenAI
    args.provider_image_url = imageURL;

    if (this.onResult) {
      this.onResult({
        type: "function_call",
        name: fnName,
        arguments: args,
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Suggestion matching — check spoken description against AI suggestions
  // ---------------------------------------------------------------------------

  _matchSuggestion(description) {
    const suggestions = this._patientData?.careActions;
    if (!suggestions || !suggestions.length) return null;

    const words = description.toLowerCase().split(/\s+/).filter((w) => w.length >= 3);
    if (!words.length) return null;

    let bestMatch = null;
    let bestScore = 0;

    for (const action of suggestions) {
      const serviceLower = (action.Service || "").toLowerCase();

      // Exact substring match (highest priority)
      if (serviceLower.includes(description.toLowerCase())) {
        return action;
      }

      // Word overlap scoring
      let matched = 0;
      for (const word of words) {
        if (serviceLower.includes(word)) matched++;
      }

      const score = matched / words.length;
      if (score > bestScore) {
        bestScore = score;
        bestMatch = action;
      }
    }

    // Require at least 50% word match and at least one word
    if (bestScore >= 0.5 && bestMatch) return bestMatch;

    return null;
  }

  // ---------------------------------------------------------------------------
  // System prompt
  // ---------------------------------------------------------------------------

  getScrumPrompt(speakerId, displayName, patientData) {
    let prompt = `You are L.I.N.A. (Lifekind Intelligence Network Agent), a clinical AI assistant for healthcare team scrum meetings.
The speaker is: ${displayName} (ID: ${speakerId})
Use speaker ID (${speakerId}) as provider_id in all function calls.

You operate in two modes based on what the provider says:
1. COMMAND — If the provider gives a command (add, confirm, update, delete, open, close, approve, mark)
   → call the appropriate function. Do NOT respond with text.
2. QUESTION — If the provider asks a question about the patient, care plan, medications, imaging, or anything clinical
   → respond naturally in 1-3 concise sentences suitable for being spoken aloud. No bullet points or markdown.

FUNCTION CALL INSTRUCTIONS:

1. handle_care_unit_action:
   - "Add" and "Confirm" both mean operation: "add"
   - DO NOT guess CPT codes. Pass the user's spoken words as-is in service_description.
   - Examples:
     * "Add office visit" → operation: "add", service_description: "office visit"
     * "Confirm urine drug screening" → operation: "add", service_description: "urine drug screening"
     * "Delete chiropractic treatment" → operation: "delete", service_description: "chiropractic treatment"
     * "Add acupuncture 30 minutes" → operation: "add", service_description: "acupuncture 30 minutes"

2. update_ghs_score:
   - Categories (map spoken word to DB name):
     * body → PScoreBody, interactivity → PScoreInteractivity, mind → PScoreMind
     * motivation → PScoreMotivation, response → PScoreResponse
     * social/social vulnerability → PScoreSocVulnerability, substance → PScoreSubstance
   - Pass the user's spoken value as-is in the "value" field. The server normalizes it.
     Accepted values: numbers (1/2/3), colors (green/yellow/red), levels (low/medium/high),
     letters (A/B/C), shapes (circle/square/triangle), descriptors (good/cooperative/moderate/challenging/difficult/poor)
   - Examples:
     * "Set motivation to green" → category: "PScoreMotivation", value: "green"
     * "Substance to medium" → category: "PScoreSubstance", value: "medium"
     * "Update mind to B" → category: "PScoreMind", value: "B"
     * "Body to 3" → category: "PScoreBody", value: "3"
     * "Response to square" → category: "PScoreResponse", value: "square"
     * "Interactivity cooperative" → category: "PScoreInteractivity", value: "cooperative"

3. open_imaging_results:
   - Parse natural language dates into YYYY-MM-DD format
   - If only month is mentioned, use the 1st day of that month
   - Current year is 2026 — use it if year not specified

4. close_ui_element:
   - Trigger on ANY close-related phrase: "close it", "close this", "close the window", "close xray", "close", "dismiss"
   - The UI will close whatever is currently open

5. approve_action:
   - Trigger when provider says "approve", "approved", "approve treatment plan", etc.
`;

    // Patient context — used by OpenAI for conversational answers
    if (patientData) {
      prompt += `\n## Current Patient\n`;
      prompt += `Name: ${patientData.fullName || `${patientData.firstName} ${patientData.lastName}`}\n`;
      prompt += `Patient ID: ${patientData.id}\n`;
      if (patientData.diagnosis) prompt += `Diagnosis: ${patientData.diagnosis}\n`;

      if (patientData.casePresentation) {
        const cp = patientData.casePresentation;
        if (cp.Prescriptions) prompt += `Prescriptions: ${cp.Prescriptions}\n`;
        if (cp.Treatments) prompt += `Treatments: ${cp.Treatments}\n`;
        if (cp.Labs) prompt += `Labs: ${cp.Labs}\n`;
        if (cp.Imaging) prompt += `Imaging: ${cp.Imaging}\n`;
        if (cp.Vitals) prompt += `Vitals: ${cp.Vitals}\n`;
      }

      if (patientData.healthScores && patientData.healthScores.length > 0) {
        prompt += `\nGlobal Health Scores:\n`;
        patientData.healthScores.forEach((score) => {
          const scoreLabel = score.score === 1 ? "Good" : score.score === 2 ? "Challenging" : "Poor";
          prompt += `- ${score.label}: ${scoreLabel} (${score.score})\n`;
        });
      }

      if (patientData.careActions && patientData.careActions.length > 0) {
        prompt += `\nCare Actions (current suggestions list):\n`;
        patientData.careActions.forEach((action) => {
          prompt += `- ${action.Discipline}: ${action.Service} (${action.CPTCode})\n`;
        });
        prompt += `\nCARE ACTION INSTRUCTIONS:\n`;
        prompt += `- When user says "add" or "confirm" a service, pass the spoken description as-is in service_description.\n`;
        prompt += `- Do NOT try to match against the list above — the server handles matching.\n`;
        prompt += `- For ambiguous terms (e.g., "yoga", "massage"), still pass the spoken words. The server checks the suggestions list first.\n`;
      }

      if (patientData.reports && patientData.reports.length > 0) {
        prompt += `\nImaging available: ${patientData.reports.map((r) => `${r.OrderName} (${r.OrderDate})`).join(", ")}`;
        prompt += `\nIf asked about imaging/scans, images and findings will be attached automatically.\n`;
      }

      if (patientData.documents && patientData.documents.length > 0) {
        prompt += `\nPatient Documents (latest ${patientData.documents.length}):\n`;
        patientData.documents.forEach((doc) => {
          const reviewed = doc.isReviewed ? "Reviewed" : "Not reviewed";
          prompt += `- [${doc.documentId}] ${doc.documentName} (${doc.documentType}, ${doc.fileType}) — uploaded ${doc.uploadDate} — ${reviewed}\n`;
        });
        prompt += `\nDOCUMENT INSTRUCTIONS:\n`;
        prompt += `- When asked "what documents do we have?" → list the documents above. No function call needed.\n`;
        prompt += `- When asked to "brief", "summarize", "read", or "analyze" a document → call brief_patient_document with the matching document_id and document_name.\n`;
        prompt += `- When asked to "show", "display", "view", or "pull up" a document → call show_patient_document with the matching document_id and document_name.\n`;
        prompt += `- Match by keyword: "UDS" matches any document with "UDS" in the name, "MRI" matches MRI documents, etc.\n`;
        prompt += `- If multiple documents match, pick the most recent one. If ambiguous, ask which one.\n`;
      }

      prompt += `\nWhen answering questions, reference specific patient data above.\n`;
    }

    return prompt;
  }

  // ---------------------------------------------------------------------------
  // Vision helper
  // ---------------------------------------------------------------------------

  /**
   * Check if question is about imaging and return relevant image URLs
   */
  getRelevantImageUrls(text, patientData) {
    if (!patientData?.reports || patientData.reports.length === 0) return [];

    const lowerText = text.toLowerCase();
    const imagingKeywords = [
      "mri", "xray", "x-ray", "ct scan", "scan", "image", "imaging",
      "report", "results", "show me", "look at", "what do you see",
      "analyze", "findings",
    ];

    const isImagingQuestion = imagingKeywords.some((kw) => lowerText.includes(kw));
    if (!isImagingQuestion) return [];

    const urls = [];
    for (const report of patientData.reports) {
      if (!report.ImageUrl) continue;
      const reportName = (report.OrderName || "").toLowerCase();

      if (lowerText.includes("mri") && reportName.includes("mri")) {
        urls.push(report.ImageUrl);
      } else if ((lowerText.includes("xray") || lowerText.includes("x-ray")) && (reportName.includes("xray") || reportName.includes("x-ray"))) {
        urls.push(report.ImageUrl);
      } else if (lowerText.includes("ct") && reportName.includes("ct")) {
        urls.push(report.ImageUrl);
      }
    }

    // No specific match but imaging question — include all (up to 3)
    if (urls.length === 0 && isImagingQuestion) {
      patientData.reports
        .filter((r) => r.ImageUrl)
        .slice(0, 3)
        .forEach((r) => urls.push(r.ImageUrl));
    }

    return urls;
  }

  // ---------------------------------------------------------------------------
  // Document analysis (second OpenAI call for brief_patient_document)
  // ---------------------------------------------------------------------------

  async analyzeDocument(documentName, fileType, buffer, patientData) {
    if (!config.AZURE_OPENAI_ENDPOINT || !config.AZURE_OPENAI_KEY) return null;

    const url = `${config.AZURE_OPENAI_ENDPOINT}/openai/deployments/${config.MODEL_NAME}/chat/completions?api-version=2025-04-01-preview`;

    const patientName = patientData?.fullName || "the patient";
    const systemPrompt = `You are L.I.N.A., a clinical AI assistant. Provide a concise spoken-aloud briefing of this patient document. Keep it to 3-5 sentences. Reference specific findings, dates, and values. Patient: ${patientName}.`;

    const userContent = [];
    const isImage = (fileType || "").startsWith("image/");

    if (isImage) {
      userContent.push({
        type: "image_url",
        image_url: { url: `data:${fileType};base64,${buffer.toString("base64")}`, detail: "low" },
      });
      userContent.push({ type: "text", text: `Briefly summarize this ${documentName} for the care team.` });
    } else {
      let textContent = "";
      if (fileType === "application/pdf") {
        try {
          const pdfParse = require("pdf-parse");
          const parsed = await pdfParse(buffer);
          textContent = parsed.text || "";
        } catch {
          textContent = "[Unable to parse PDF]";
        }
      } else {
        textContent = buffer.toString("utf-8");
      }
      if (textContent.length > 2000) textContent = textContent.substring(0, 2000) + "...";
      userContent.push({ type: "text", text: `Document: ${documentName}\n\n${textContent}\n\nBriefly summarize this for the care team.` });
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25000);

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "api-key": config.AZURE_OPENAI_KEY, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: config.MODEL_NAME,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userContent },
          ],
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        console.error("[L.I.N.A.] Document analysis error:", response.status, await response.text());
        return null;
      }

      const data = await response.json();
      return data.choices?.[0]?.message?.content || null;
    } catch (err) {
      console.error("[L.I.N.A.] Document analysis error:", err.message);
      return null;
    } finally {
      clearTimeout(timeoutId);
    }
  }
}

module.exports = OpenAIService;
