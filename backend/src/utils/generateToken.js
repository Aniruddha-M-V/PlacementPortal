const jwt = require('jsonwebtoken');

/**
 * Generate a signed JWT access token
 * @param {Object} payload - Data to embed in the token
 * @returns {string} JWT token
 */
const generateToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
};

/**
 * Verify and decode a JWT token
 * @param {string} token
 * @returns {Object} Decoded payload
 */
const verifyToken = (token) => {
  return jwt.verify(token, process.env.JWT_SECRET);
};

/**
 * Extract token from Authorization header
 * @param {string} authHeader - "Bearer <token>"
 * @returns {string|null}
 */
const extractToken = (authHeader) => {
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  return authHeader.split(' ')[1];
};

module.exports = { generateToken, verifyToken, extractToken };
