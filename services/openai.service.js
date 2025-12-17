const config = require("../config");
const { tools } = require("../tools/tools-definition");

class OpenAIService {
  constructor(onResult) {
    this.onResult = onResult;
    this.conversationHistory = [];
  }

  async processIntent(text, speakerId, displayName) {
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
                speakerId: speakerId,
                speakerName: displayName,
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
            speakerId: speakerId,
            speakerName: displayName,
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
Use the speaker ID (${speakerId}) as the speaker_id in all function calls for database operations.

Available functions:
1. handle_care_unit_action - For add/update/delete operations on care-unit actions or CPT codes
2. update_ghs_score - For updating Global Health Score categories (body, mind, motivation, etc.)
3. ai_patient_document_search - For searching patient documents

For GHS updates, map phrases like:
- "mind is good" → field: "mind", value: "good"
- "body poor" → field: "body", value: "poor"
- "high motivation" → field: "motivation", value: "high"

Only extract function calls when the speaker clearly intends to perform an action.`;
  }

  clearHistory() {
    this.conversationHistory = [];
  }
}

module.exports = OpenAIService;