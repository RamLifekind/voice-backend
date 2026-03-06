const config = require("../config");
const { tools } = require("../tools/tools-definition");
const { getRAGService } = require("./guidelines-rag.service");

class OpenAIService {
  constructor(onResult) {
    this.onResult = onResult;
    this.conversationHistory = [];
  }

  async processIntent(text, speakerId, displayName, imageURL) {
    if (!config.AZURE_OPENAI_ENDPOINT || !config.AZURE_OPENAI_KEY) {
      console.warn("⚠️  OpenAI not configured");
      return;
    }

    try {
      const url = `${config.AZURE_OPENAI_ENDPOINT}/openai/responses?api-version=2025-04-01-preview`;

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "api-key": config.AZURE_OPENAI_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: config.MODEL_NAME,
          input: [
            {
              role: "system",
              content: this.getSystemPrompt(speakerId, displayName),
            },
            {
              role: "user",
              content: `Speaker: ${displayName} (ID: ${speakerId})\nText: ${text}`,
            },
          ],
          tools,
          tool_choice: "auto",
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error("❌ OpenAI HTTP Error:", response.status, errText);
        return;
      }

      const data = await response.json();

      if (Array.isArray(data.output)) {
        for (const item of data.output) {
          if (item.type === "function_call") {
            console.log("🔧 Function detected:", item.name);

            let args = {};
            try {
              args = JSON.parse(item.arguments || "{}");
            } catch (err) {
              console.error("❌ Argument parse error:", err);
            }

            if (this.onResult) {
              this.onResult({
                type: "function_call",
                name: item.name,
                arguments: args,
                providerId: speakerId,
                providerName: displayName,
                providerImageURL: imageURL,
              });
            }

            return;
          }
        }

        // Fallback: normal assistant message
        const msgItem = data.output.find((o) => o.type === "message");
        const textOut = msgItem?.content?.[0]?.text || "(no command detected)";

        if (this.onResult) {
          this.onResult({
            type: "ai_response",
            text: textOut,
            providerId: speakerId,
            providerName: displayName,
          });
        }
      }
    } catch (error) {
      console.error("❌ OpenAI Error:", error.message);
    }
  }

  getSystemPrompt(speakerId, displayName) {
    return `You are a healthcare meeting assistant. Extract function calls from user speech.
The speaker's verified ID is: ${speakerId}
The speaker's name is: ${displayName}
Use the speaker ID (${speakerId}) as provider_id in all function calls.

CRITICAL INSTRUCTIONS:
1. For handle_care_unit_action:
   - ALWAYS use EXACT service_code and service_name from the CPT codes list
   - Match the spoken service to the closest CPT code
   - "Add" and "Confirm" mean the same - both use operation: "add"
   - Examples:
     * "Add office visit" → operation: "add", service_code: "99213", service_name: "Follow Up Visit - Level 3"
     * "Confirm Urine Drug Screening" → operation: "add", service_code: "80305", service_name: "Urine Drug Screening"
     * "Confirm behavioral health" → operation: "add", service_code: "90791", service_name: "Behavioral Health Intake"
   - DO NOT make up codes or names - use EXACT matches from the list

2. For update_ghs_score:
   - ALWAYS use numeric code values: 1, 2, or 3
   - Map descriptions to standardized labels:
     * Good/Excellent/Fine/Well → code: 1, label: "good"
     * Challenging/Moderate/Fair/Okay → code: 2, label: "challenging"
     * Poor/Bad/Difficult → code: 3, label: "poor"
   - Example: "mind is good" → category: "mind", code: 1, label: "good"
   - Example: "body is poor" → category: "body", code: 3, label: "poor"
   - Example: "motivation challenging" → category: "motivation", code: 2, label: "challenging"
   - The label field must be exactly "good", "challenging", or "poor" (lowercase)

3. For open_imaging_results:
   - Parse natural language dates into YYYY-MM-DD format
   - Examples:
     * "August 2025" → order_date: "2025-08-01", spoken_date: "August 2025"
     * "June 22nd" → order_date: "2025-06-22", spoken_date: "June 22nd"
     * "August 17th 2025" → order_date: "2025-08-17", spoken_date: "August 17th 2025"
   - If only month is mentioned, use the 1st day of that month
   - Current year is 2025 - use it if year not specified

4. For close_ui_element:
   - Trigger on ANY close-related phrase: "close it", "close this", "close the window", "close xray", "close", "dismiss", etc.
   - The UI will close whatever is currently open, regardless of element_type value

Only extract function calls when the speaker clearly intends to perform an action.`;
  }

  clearHistory() {
    this.conversationHistory = [];
  }

  /**
   * Handle conversational queries using RAG
   * @param {string} text - User's question/conversation
   * @param {string} speakerId - Provider ID
   * @param {string} displayName - Provider name
   * @param {object} patientData - Optional patient context
   * @param {array} transcriptHistory - Recent transcript history for context
   * @returns {Promise<string>} AI response text
   */
  async handleConversation(text, speakerId, displayName, patientData = null, transcriptHistory = []) {
    if (!config.AZURE_OPENAI_ENDPOINT || !config.AZURE_OPENAI_KEY) {
      console.warn("⚠️  OpenAI not configured");
      return "Sorry, AI service is not configured.";
    }

    try {
      console.log(`[AI] Processing conversation query: "${text}"`);
      console.log(`[AI] Patient data available: ${patientData ? 'Yes' : 'No'}`);
      console.log(`[AI] Transcript history: ${transcriptHistory.length} items`);

      // Get relevant guidelines from RAG
      const ragService = getRAGService();
      const relevantContext = await ragService.getRelevantContext(text, 3);

      // Build conversation system prompt with RAG context
      const systemPrompt = this.getConversationPrompt(speakerId, displayName, relevantContext, patientData);

      // Build conversation messages including history for context
      // This helps when user stutters or continues a question
      const messages = [
        {
          role: "system",
          content: systemPrompt,
        }
      ];

      // Add transcript history as context (excluding current message)
      if (transcriptHistory.length > 1) {
        const historyContext = transcriptHistory
          .slice(0, -1) // Exclude current message (it's the last one)
          .map(t => `${t.speaker}: ${t.text}`)
          .join('\n');

        messages.push({
          role: "user",
          content: `[Previous conversation context - use this to understand the full question if the current message seems incomplete]\n${historyContext}`
        });

        messages.push({
          role: "assistant",
          content: "I understand the context. Please continue with your question."
        });
      }

      // Add the current question
      messages.push({
        role: "user",
        content: text,
      });

      console.log(`[AI] Sending request to OpenAI with ${messages.length} messages...`);
      const url = `${config.AZURE_OPENAI_ENDPOINT}/openai/responses?api-version=2025-04-01-preview`;

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "api-key": config.AZURE_OPENAI_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: config.MODEL_NAME,
          input: messages,
          // No tools for conversation mode - just natural response
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error("❌ OpenAI Conversation Error:", response.status, errText);
        return "Sorry, I encountered an error processing your question.";
      }

      const data = await response.json();
      console.log(`[AI] Received response from OpenAI`);

      // Extract text response
      if (Array.isArray(data.output)) {
        const msgItem = data.output.find((o) => o.type === "message");
        const textOut = msgItem?.content?.[0]?.text || "I'm not sure how to answer that.";
        console.log(`[AI] Extracted response text: "${textOut}"`);
        return textOut;
      }

      console.log(`[AI] No valid response in output`);
      return "I'm not sure how to answer that.";
    } catch (error) {
      console.error("❌ Conversation Error:", error.message);
      return "Sorry, I encountered an error.";
    }
  }

  /**
   * Generate system prompt for conversational mode with RAG context
   */
  getConversationPrompt(speakerId, displayName, ragContext, patientData) {
    let prompt = `You are a medical assistant participating in a healthcare team discussion.

Speaker: ${displayName} (ID: ${speakerId})

${ragContext}

Instructions:
- Answer questions based on the UTC Standards provided above
- Be concise and professional
- If asked about treatment, refer to relevant standards
- If patient context is provided, consider it in your response
- Keep responses under 3 sentences for voice readability
`;

    if (patientData) {
      prompt += `\n## Patient Context\n`;
      prompt += `Name: ${patientData.fullName || `${patientData.firstName} ${patientData.lastName}`}\n`;
      prompt += `Patient ID: ${patientData.id}\n`;
      if (patientData.diagnosis) prompt += `Diagnosis: ${patientData.diagnosis}\n`;

      // Include case presentation details
      if (patientData.casePresentation) {
        const cp = patientData.casePresentation;
        if (cp.Prescriptions) prompt += `Prescriptions: ${cp.Prescriptions}\n`;
        if (cp.Treatments) prompt += `Treatments: ${cp.Treatments}\n`;
        if (cp.Labs) prompt += `Labs: ${cp.Labs}\n`;
        if (cp.Imaging) prompt += `Imaging: ${cp.Imaging}\n`;
        if (cp.Vitals) prompt += `Vitals: ${cp.Vitals}\n`;
      }

      // Include health scores
      if (patientData.healthScores && patientData.healthScores.length > 0) {
        prompt += `\nGlobal Health Scores:\n`;
        patientData.healthScores.forEach(score => {
          const scoreLabel = score.score === 1 ? 'Good' : score.score === 2 ? 'Challenging' : 'Poor';
          prompt += `- ${score.label}: ${scoreLabel} (${score.score})\n`;
        });
      }

      // Include care actions
      if (patientData.careActions && patientData.careActions.length > 0) {
        prompt += `\nCare Actions:\n`;
        patientData.careActions.forEach(action => {
          prompt += `- ${action.Discipline}: ${action.Service} (${action.CPTCode})\n`;
        });
      }

      // Include imaging/reports with URLs
      if (patientData.reports && patientData.reports.length > 0) {
        prompt += `\n## Imaging & Reports:\n`;
        patientData.reports.forEach(report => {
          prompt += `- ${report.OrderDate}: ${report.OrderName}\n`;
          if (report.ImageUrl) {
            prompt += `  Image available at: ${report.ImageUrl}\n`;
          }
        });
      }

      prompt += `\nWhen answering questions about the patient, reference specific data points above.\n`;
    }

    return prompt;
  }
}

module.exports = OpenAIService;