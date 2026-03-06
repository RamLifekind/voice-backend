/**
 * Authentication Middleware
 * Validates Entra ID JWT tokens using JWKS
 * Same pattern as backend-api
 */

const jwt = require('jsonwebtoken');
const { getKeyCallback } = require('../utils/jwks-cache');
const config = require('../config');

/**
 * HTTP middleware - validates Bearer token in Authorization header
 */
function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ success: false, message: 'No authorization header provided' });
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return res.status(401).json({ success: false, message: 'Invalid authorization format. Use: Bearer <token>' });
  }

  const token = parts[1];

  jwt.verify(
    token,
    getKeyCallback,
    {
      algorithms: ['RS256'],
      issuer: config.ENTRA.ISSUER,
      audience: config.ENTRA.AUDIENCE,
    },
    (err, decoded) => {
      if (err) {
        console.error('❌ Token verification failed:', err.message);
        const msg = err.name === 'TokenExpiredError' ? 'Token has expired' : 'Invalid token';
        return res.status(401).json({ success: false, message: msg });
      }

      req.user = {
        id: decoded.oid || decoded.sub,
        email: decoded.email || decoded.preferred_username,
        name: decoded.name,
        roles: decoded.roles || [],
        tenantId: decoded.tid,
        claims: decoded,
      };

      console.log(`✅ Authenticated: ${req.user.email} (${req.user.id})`);
      next();
    }
  );
}

/**
 * WebSocket token verification - validates JWT from query param
 * Usage: verifyWebSocketToken(token) → Promise<user>
 */
function verifyWebSocketToken(token) {
  return new Promise((resolve, reject) => {
    if (!token) return reject(new Error('No token provided'));

    const decoded = jwt.decode(token, { complete: true });
    if (!decoded?.header?.kid) return reject(new Error('Invalid token structure'));

    getKeyCallback({ kid: decoded.header.kid }, (err, signingKey) => {
      if (err) return reject(err);

      jwt.verify(
        token,
        signingKey,
        {
          algorithms: ['RS256'],
          issuer: config.ENTRA.ISSUER,
          audience: config.ENTRA.AUDIENCE,
        },
        (verifyErr, payload) => {
          if (verifyErr) return reject(verifyErr);

          resolve({
            id: payload.oid || payload.sub,
            email: payload.email || payload.preferred_username,
            name: payload.name,
            roles: payload.roles || [],
            tenantId: payload.tid,
            claims: payload,
          });
        }
      );
    });
  });
}

module.exports = { authenticate, verifyWebSocketToken };
