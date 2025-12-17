/**
 * Function Handlers
 * Execute the actual logic for each OpenAI function call
 */

class FunctionHandlers {
  /**
   * Execute a function by name
   * @param {string} functionName - Name of the function to execute
   * @param {object} args - Function arguments
   * @param {Function} callback - Callback with result
   */
  static async execute(functionName, args, callback) {
    console.log(`⚙️  Executing: ${functionName}`, args);
    
    try {
      let result;
      
      switch (functionName) {
        case "handle_care_unit_action":
          result = await this.handleCareUnitAction(args);
          break;
          
        case "update_ghs_score":
          result = await this.updateGHSScore(args);
          break;
          
        case "ai_patient_document_search":
          result = await this.searchPatientDocuments(args);
          break;
          
        default:
          result = { success: false, error: "Unknown function" };
      }
      
      if (callback) {
        callback(result);
      }
      
      return result;
      
    } catch (error) {
      console.error(`❌ Function execution error (${functionName}):`, error.message);
      const errorResult = { success: false, error: error.message };
      
      if (callback) {
        callback(errorResult);
      }
      
      return errorResult;
    }
  }

  /**
   * Handle care unit action (add/update/delete)
   * @param {object} args - {speaker_id, operation, cpt_or_action}
   */
  static async handleCareUnitAction(args) {
    const { speaker_id, operation, cpt_or_action } = args;
    
    console.log(`📋 Care Unit Action: ${operation} "${cpt_or_action}" by ${speaker_id}`);
    
    try {
      const db = require("../services/database.service");
      
      if (operation === "add") {
        await db.execSP('sp_AddCareAction', {
          speakerId: speaker_id,
          action: cpt_or_action,
          cptCode: this.extractCPT(cpt_or_action)
        });
      } else if (operation === "update") {
        await db.execSP('sp_UpdateCareAction', {
          speakerId: speaker_id,
          action: cpt_or_action,
          cptCode: this.extractCPT(cpt_or_action)
        });
      } else if (operation === "delete") {
        await db.execSP('sp_DeleteCareAction', {
          speakerId: speaker_id,
          cptCode: this.extractCPT(cpt_or_action)
        });
      }
      
      return {
        success: true,
        function: "handle_care_unit_action",
        operation,
        cpt_or_action,
        speaker_id,
        message: `${operation} completed for ${cpt_or_action}`
      };
    } catch (error) {
      console.error(`❌ Care unit action error:`, error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Update Global Health Score
   * @param {object} args - {speaker_id, field, value}
   */
  static async updateGHSScore(args) {
    const { speaker_id, field, value } = args;
    
    console.log(`📊 GHS Update: ${field} = ${value} by ${speaker_id}`);
    
    try {
      const db = require("../services/database.service");
      const normalizedValue = this.normalizeGHSValue(value);
      
      await db.execSP('sp_UpdateGHSScore', {
        speakerId: speaker_id,
        field: field,
        value: normalizedValue
      });
      
      return {
        success: true,
        function: "update_ghs_score",
        field,
        value: normalizedValue,
        speaker_id,
        message: `GHS ${field} updated to ${normalizedValue}`
      };
    } catch (error) {
      console.error(`❌ GHS update error:`, error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Search patient documents
   * @param {object} args - {speaker_id, query}
   */
  static async searchPatientDocuments(args) {
    const { speaker_id, query } = args;
    
    console.log(`🔍 Document Search: "${query}" by ${speaker_id}`);
    
    // TODO: Implement Azure AI Search integration
    // Example pseudo-code:
    /*
    const searchClient = new SearchClient(
      process.env.AZURE_SEARCH_ENDPOINT,
      "patient-documents",
      new AzureKeyCredential(process.env.AZURE_SEARCH_KEY)
    );
    
    const results = await searchClient.search(query, {
      top: 5,
      select: ["document_id", "title", "content", "date"],
      filter: `patient_id eq '${getCurrentPatientId()}'`
    });
    
    const documents = [];
    for await (const result of results.results) {
      documents.push(result.document);
    }
    */
    
    // Mock implementation
    await new Promise(resolve => setTimeout(resolve, 200));
    
    const mockResults = [
      {
        document_id: "DOC001",
        title: "Recent Lab Results",
        snippet: "Blood work from last visit showing...",
        date: "2024-12-10"
      },
      {
        document_id: "DOC002",
        title: "Medication History",
        snippet: "Current prescriptions include...",
        date: "2024-12-05"
      }
    ];
    
    return {
      success: true,
      function: "ai_patient_document_search",
      query,
      speaker_id,
      results: mockResults,
      count: mockResults.length,
      message: `Found ${mockResults.length} documents`
    };
  }

  /**
   * Helper: Normalize GHS values
   * Converts descriptive values to numeric scale
   */
  static normalizeGHSValue(value) {
    const lowerValue = value.toLowerCase();
    
    // Map descriptive to numeric
    const mapping = {
      'poor': '1',
      'fair': '2',
      'good': '3',
      'low': '1',
      'medium': '2',
      'high': '3',
      'difficult': '1',
      'cooperative': '3',
      'triangle': '2'
    };
    
    return mapping[lowerValue] || value;
  }

  /**
   * Helper: Extract CPT code from text
   */
  static extractCPT(text) {
    // CPT codes are typically 5 digits
    const cptMatch = text.match(/\b\d{5}\b/);
    return cptMatch ? cptMatch[0] : null;
  }
}

module.exports = FunctionHandlers;