/**
 * JWKS Cache Utility
 * Caches Entra ID signing keys to avoid fetching on every request
 */

const jwksClient = require('jwks-rsa');
const config = require('../config');

const client = jwksClient({
  jwksUri: config.ENTRA.JWKS_URI,
  cache: true,
  cacheMaxEntries: 5,
  cacheMaxAge: 86400000, // 24 hours
  rateLimit: true,
  jwksRequestsPerMinute: 10
});

async function getSigningKey(kid) {
  return new Promise((resolve, reject) => {
    client.getSigningKey(kid, (err, key) => {
      if (err) {
        console.error('❌ JWKS key fetch error:', err.message);
        reject(err);
        return;
      }
      resolve(key.getPublicKey());
    });
  });
}

function getKeyCallback(header, callback) {
  client.getSigningKey(header.kid, (err, key) => {
    if (err) { callback(err, null); return; }
    callback(null, key.getPublicKey());
  });
}

function refreshCache() {
  client.getSigningKeys((err, keys) => {
    if (err) { console.error('❌ JWKS cache refresh failed:', err.message); return; }
    console.log(`✅ JWKS cache refreshed: ${keys.length} keys`);
  });
}

module.exports = { getSigningKey, getKeyCallback, refreshCache, client };
