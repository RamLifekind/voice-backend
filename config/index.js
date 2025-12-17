module.exports = {
  PORT: process.env.PORT || 8080,
  
  // Azure Speech
  SPEECH_KEY: process.env.SPEECH_KEY,
  SPEECH_ENDPOINT: process.env.SPEECH_ENDPOINT,
  
  // Azure OpenAI
  AZURE_OPENAI_ENDPOINT: process.env.AZURE_OPENAI_ENDPOINT,
  AZURE_OPENAI_KEY: process.env.AZURE_OPENAI_KEY,
  MODEL_NAME: process.env.MODEL_NAME || "gpt-5.1-chat",
  
  // Python Eagle Service
  PYTHON_SERVICE_URL: process.env.PYTHON_SERVICE_URL || "http://localhost:8000",
  
  // Database (add your DB config)
  DATABASE_URL: process.env.DATABASE_URL,
  
  // Settings
  EAGLE_CONFIDENCE_THRESHOLD: 0.9,
  VERIFICATION_WINDOW_MS: 3000,
  AUDIO_CHUNK_SIZE: 2048,
  ENROLLMENT_CHUNK_SIZE: 6144,
};