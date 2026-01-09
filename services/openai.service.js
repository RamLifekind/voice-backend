const config = require("../config");
const { tools } = require("../tools/tools-definition");

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
}

module.exports = OpenAIService;