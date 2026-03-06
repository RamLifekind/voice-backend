const OpenAI = require('openai');
const fs = require('fs');
const config = require('../config');

class GuidelinesRAGService {
  constructor() {
    // Use Azure OpenAI configuration for embeddings
    this.openai = new OpenAI({
      apiKey: config.AZURE_OPENAI_KEY,
      baseURL: `${config.AZURE_OPENAI_ENDPOINT}/openai/deployments/${config.EMBEDDING_DEPLOYMENT_NAME}`,
      defaultQuery: { 'api-version': '2024-02-01' },
      defaultHeaders: { 'api-key': config.AZURE_OPENAI_KEY }
    });

    // In-memory vector store
    this.vectorStore = [];
    this.initialized = false;
  }

  /**
   * Split text into chunks for embedding
   * @param {string} text - Full guidelines text
   * @param {number} chunkSize - Maximum tokens per chunk (default 500)
   * @returns {Array} Array of text chunks with metadata
   */
  chunkText(text, chunkSize = 500) {
    const lines = text.split('\n');
    const chunks = [];
    let currentChunk = '';
    let currentSection = 'Introduction';

    for (const line of lines) {
      // Detect section headers (e.g., "Standard 1:", "Standard 2:")
      const sectionMatch = line.match(/^(Standard \d+[:\-].*|STANDARD \d+[:\-].*)/i);
      if (sectionMatch) {
        currentSection = sectionMatch[1].trim();
      }

      // Rough token estimation: 1 token ≈ 4 characters
      const estimatedTokens = (currentChunk.length + line.length) / 4;

      if (estimatedTokens > chunkSize && currentChunk.length > 0) {
        chunks.push({
          text: currentChunk.trim(),
          section: currentSection,
          tokens: Math.ceil(currentChunk.length / 4)
        });
        currentChunk = line + '\n';
      } else {
        currentChunk += line + '\n';
      }
    }

    // Add the last chunk
    if (currentChunk.trim().length > 0) {
      chunks.push({
        text: currentChunk.trim(),
        section: currentSection,
        tokens: Math.ceil(currentChunk.length / 4)
      });
    }

    return chunks;
  }

  /**
   * Generate embeddings for text chunks
   * @param {Array} chunks - Array of text chunks
   * @returns {Promise<Array>} Chunks with embeddings
   */
  async generateEmbeddings(chunks) {
    console.log(`[RAG] Generating embeddings for ${chunks.length} chunks...`);

    const embeddedChunks = [];

    // Process in batches of 20 to avoid rate limits
    const batchSize = 20;
    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = chunks.slice(i, i + batchSize);

      const response = await this.openai.embeddings.create({
        input: batch.map(chunk => chunk.text)
      });

      batch.forEach((chunk, idx) => {
        embeddedChunks.push({
          ...chunk,
          embedding: response.data[idx].embedding
        });
      });

      console.log(`[RAG] Processed ${Math.min(i + batchSize, chunks.length)}/${chunks.length} chunks`);
    }

    return embeddedChunks;
  }

  /**
   * Calculate cosine similarity between two vectors
   * @param {Array} vecA - First embedding vector
   * @param {Array} vecB - Second embedding vector
   * @returns {number} Similarity score (0-1)
   */
  cosineSimilarity(vecA, vecB) {
    const dotProduct = vecA.reduce((sum, a, idx) => sum + a * vecB[idx], 0);
    const magnitudeA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
    const magnitudeB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
    return dotProduct / (magnitudeA * magnitudeB);
  }

  /**
   * Initialize RAG system by loading and processing guidelines
   * @param {string} guidelinesPath - Path to guidelines text file
   */
  async initialize(guidelinesPath) {
    if (this.initialized) {
      console.log('[RAG] Already initialized');
      return;
    }

    console.log('[RAG] Initializing RAG system...');

    // Read guidelines file
    const guidelines = fs.readFileSync(guidelinesPath, 'utf-8');

    // Chunk the text
    const chunks = this.chunkText(guidelines);
    console.log(`[RAG] Created ${chunks.length} chunks`);

    // Generate embeddings
    this.vectorStore = await this.generateEmbeddings(chunks);

    this.initialized = true;
    console.log('[RAG] RAG system initialized successfully');
  }

  /**
   * Search for relevant guidelines based on query
   * @param {string} query - User query or conversation context
   * @param {number} topK - Number of results to return
   * @returns {Promise<Array>} Top K most relevant chunks
   */
  async search(query, topK = 3) {
    if (!this.initialized) {
      throw new Error('RAG system not initialized. Call initialize() first.');
    }

    console.log(`[RAG] Searching for: "${query}"`);

    // Generate embedding for query
    const response = await this.openai.embeddings.create({
      input: query
    });

    const queryEmbedding = response.data[0].embedding;

    // Calculate similarity scores
    const results = this.vectorStore.map(chunk => ({
      ...chunk,
      similarity: this.cosineSimilarity(queryEmbedding, chunk.embedding)
    }));

    // Sort by similarity and return top K
    results.sort((a, b) => b.similarity - a.similarity);

    const topResults = results.slice(0, topK).map(result => ({
      text: result.text,
      section: result.section,
      similarity: result.similarity.toFixed(3)
    }));

    console.log(`[RAG] Found ${topResults.length} relevant chunks`);

    return topResults;
  }

  /**
   * Get relevant context for a conversation query
   * @param {string} query - User question or conversation context
   * @param {number} topK - Number of chunks to retrieve
   * @returns {Promise<string>} Formatted context string
   */
  async getRelevantContext(query, topK = 3) {
    const results = await this.search(query, topK);

    let context = 'Relevant UTC Standards:\n\n';
    results.forEach((result, idx) => {
      context += `[${result.section}]\n${result.text}\n\n`;
    });

    return context;
  }
}

// Singleton instance
let ragInstance = null;

function getRAGService() {
  if (!ragInstance) {
    ragInstance = new GuidelinesRAGService();
  }
  return ragInstance;
}

module.exports = { getRAGService };
