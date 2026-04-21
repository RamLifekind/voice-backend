/**
 * WebSocket Utilities
 */

const WebSocket = require("ws");

/**
 * Send JSON to a single client if the socket is open
 */
function sendToClient(ws, payload) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(payload));
  }
}

module.exports = { sendToClient };
