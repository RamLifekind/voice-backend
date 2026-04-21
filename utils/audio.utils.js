/**
 * Audio Utilities
 */

/**
 * Safe Int16Array conversion
 * Ensures buffer length is even for proper Int16Array conversion
 */
function safeInt16Array(buffer) {
  if (buffer.length % 2 !== 0) {
    buffer = buffer.slice(0, buffer.length - 1);
  }
  const dst = new ArrayBuffer(buffer.length);
  new Uint8Array(dst).set(new Uint8Array(buffer));
  return new Int16Array(dst);
}

module.exports = {
  safeInt16Array,
};
