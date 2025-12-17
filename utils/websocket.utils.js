/**
 * WebSocket Utilities
 * Helper functions for WebSocket communication
 */

const WebSocket = require("ws");

/**
 * Broadcast message to all connected WebSocket clients
 * @param {Set<WebSocket>} clients - Set of WebSocket connections
 * @param {object} message - Message object to broadcast
 */
function broadcastToClients(clients, message) {
  const messageStr = JSON.stringify(message);
  let successCount = 0;
  let failCount = 0;
  
  clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      try {
        client.send(messageStr);
        successCount++;
      } catch (error) {
        console.error("❌ Broadcast error:", error.message);
        failCount++;
      }
    }
  });
  
  if (failCount > 0) {
    console.warn(`⚠️  Broadcast: ${successCount} succeeded, ${failCount} failed`);
  }
}

/**
 * Send message to single client safely
 * @param {WebSocket} client - WebSocket connection
 * @param {object} message - Message object to send
 * @returns {boolean} - Success status
 */
function sendToClient(client, message) {
  if (!client || client.readyState !== WebSocket.OPEN) {
    return false;
  }
  
  try {
    client.send(JSON.stringify(message));
    return true;
  } catch (error) {
    console.error("❌ Send error:", error.message);
    return false;
  }
}

/**
 * Send binary data to client
 * @param {WebSocket} client - WebSocket connection
 * @param {Buffer} buffer - Binary data
 * @returns {boolean} - Success status
 */
function sendBinaryToClient(client, buffer) {
  if (!client || client.readyState !== WebSocket.OPEN) {
    return false;
  }
  
  try {
    client.send(buffer, { binary: true });
    return true;
  } catch (error) {
    console.error("❌ Binary send error:", error.message);
    return false;
  }
}

/**
 * Close client connection safely
 * @param {WebSocket} client - WebSocket connection
 * @param {number} code - Close code (default: 1000 = normal)
 * @param {string} reason - Close reason
 */
function closeClient(client, code = 1000, reason = "Normal closure") {
  if (!client) return;
  
  try {
    if (client.readyState === WebSocket.OPEN || client.readyState === WebSocket.CONNECTING) {
      client.close(code, reason);
    }
  } catch (error) {
    console.error("❌ Close error:", error.message);
  }
}

/**
 * Setup ping/pong for connection keepalive
 * @param {WebSocket} client - WebSocket connection
 * @param {number} interval - Ping interval in ms (default: 30000)
 * @returns {NodeJS.Timer} - Interval timer
 */
function setupKeepalive(client, interval = 30000) {
  const timer = setInterval(() => {
    if (client.readyState === WebSocket.OPEN) {
      client.ping();
    } else {
      clearInterval(timer);
    }
  }, interval);
  
  client.on('pong', () => {
    // Connection is alive
  });
  
  return timer;
}

module.exports = {
  broadcastToClients,
  sendToClient,
  sendBinaryToClient,
  closeClient,
  setupKeepalive
};