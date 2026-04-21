const OpenAI = require('openai');
const config = require('../config');
const { CPT_CODES } = require('../tools/tools-definition');

class CPTResolverService {
  constructor() {
    this.openai = new OpenAI({
      apiKey: config.AZURE_OPENAI_KEY,
      baseURL: `${config.AZURE_OPENAI_ENDPOINT}/openai/deployments/${config.EMBEDDING_DEPLOYMENT_NAME}`,
      defaultQuery: { 'api-version': '2024-02-01' },
      defaultHeaders: { 'api-key': config.AZURE_OPENAI_KEY }
    });

    this.cptEmbeddings = [];
    this.initialized = false;
  }

  /**
   * Cosine similarity between two vectors
   */
  cosineSimilarity(vecA, vecB) {
    const dotProduct = vecA.reduce((sum, a, idx) => sum + a * vecB[idx], 0);
    const magnitudeA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
    const magnitudeB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
    return dotProduct / (magnitudeA * magnitudeB);
  }

  /**
   * Initialize by pre-embedding all CPT code service names
   */
  async initialize() {
    if (this.initialized) {
      console.log('[CPT Resolver] Already initialized');
      return;
    }

    // Filter out entries with null/NULL service codes
    const validCodes = CPT_CODES.filter(cpt => cpt.serviceCode && cpt.serviceCode !== 'NULL');
    console.log(`[CPT Resolver] Initializing with ${validCodes.length} services (${CPT_CODES.length} total, filtered nulls)...`);

    // Build searchable text for each CPT entry
    // Include service name, code, and description for better semantic matching
    const texts = validCodes.map(cpt => {
      let text = `${cpt.serviceName} (${cpt.serviceCode})`;
      if (cpt.serviceDescription && cpt.serviceDescription !== cpt.serviceName) {
        text += ` - ${cpt.serviceDescription}`;
      }
      return text;
    });

    // Generate embeddings in batches
    const batchSize = 20;
    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);

      const response = await this.openai.embeddings.create({
        input: batch
      });

      batch.forEach((text, idx) => {
        this.cptEmbeddings.push({
          ...validCodes[i + idx],
          searchText: text,
          embedding: response.data[idx].embedding
        });
      });

      console.log(`[CPT Resolver] Embedded ${Math.min(i + batchSize, texts.length)}/${texts.length} codes`);
    }

    this.initialized = true;
    console.log('[CPT Resolver] Initialized successfully');
  }

  /**
   * Resolve a spoken service description to the best matching CPT code
   * @param {string} description - Natural language description from LLM
   * @returns {Promise<{match: object, confidence: number, topMatches: array}>}
   */
  async resolve(description) {
    if (!this.initialized) {
      throw new Error('CPT Resolver not initialized. Call initialize() first.');
    }

    console.log(`[CPT Resolver] Resolving: "${description}"`);

    // Generate embedding for the spoken description
    const response = await this.openai.embeddings.create({
      input: description
    });
    const queryEmbedding = response.data[0].embedding;

    // Score all CPT codes
    const scored = this.cptEmbeddings.map(cpt => ({
      serviceCatalogId: cpt.serviceCatalogId,
      serviceCode: cpt.serviceCode,
      serviceName: cpt.serviceName,
      similarity: this.cosineSimilarity(queryEmbedding, cpt.embedding)
    }));

    // Sort by similarity descending
    scored.sort((a, b) => b.similarity - a.similarity);

    const topMatch = scored[0];
    const topMatches = scored.slice(0, 3);

    console.log(`[CPT Resolver] Top match: ${topMatch.serviceName} (${topMatch.serviceCode}) - score: ${topMatch.similarity.toFixed(3)}`);
    console.log(`[CPT Resolver] Top 3:`, topMatches.map(m => `${m.serviceName} (${m.similarity.toFixed(3)})`));

    return {
      match: {
        serviceCatalogId: topMatch.serviceCatalogId,
        serviceCode: topMatch.serviceCode,
        serviceName: topMatch.serviceName
      },
      confidence: topMatch.similarity,
      topMatches
    };
  }
}

// Singleton
let instance = null;

function getCPTResolver() {
  if (!instance) {
    instance = new CPTResolverService();
  }
  return instance;
}

module.exports = { getCPTResolver };
