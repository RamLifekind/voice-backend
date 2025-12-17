/**
 * Audio Utilities
 * Helper functions for audio processing
 */

/**
 * Safe Int16Array conversion
 * Ensures buffer length is even for proper Int16Array conversion
 * @param {Buffer} buffer - Audio buffer to convert
 * @returns {Int16Array} - Converted audio samples
 */
function safeInt16Array(buffer) {
  if (buffer.length % 2 !== 0) {
    buffer = buffer.slice(0, buffer.length - 1);
  }
  const dst = new ArrayBuffer(buffer.length);
  new Uint8Array(dst).set(new Uint8Array(buffer));
  return new Int16Array(dst);
}

/**
 * Convert Int16Array to Buffer
 * @param {Int16Array} int16Array - Audio samples
 * @returns {Buffer} - Buffer representation
 */
function int16ArrayToBuffer(int16Array) {
  return Buffer.from(int16Array.buffer);
}

/**
 * Calculate audio RMS (Root Mean Square) for volume detection
 * @param {Int16Array} samples - Audio samples
 * @returns {number} - RMS value
 */
function calculateRMS(samples) {
  let sum = 0;
  for (let i = 0; i < samples.length; i++) {
    sum += samples[i] * samples[i];
  }
  return Math.sqrt(sum / samples.length);
}

/**
 * Detect if audio contains speech (simple energy-based detection)
 * @param {Int16Array} samples - Audio samples
 * @param {number} threshold - Energy threshold (default: 500)
 * @returns {boolean} - True if speech detected
 */
function detectSpeech(samples, threshold = 500) {
  const rms = calculateRMS(samples);
  return rms > threshold;
}

module.exports = {
  safeInt16Array,
  int16ArrayToBuffer,
  calculateRMS,
  detectSpeech
};