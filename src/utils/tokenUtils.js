const jwt = require('jsonwebtoken');
const config = require('../config/environment');
const { UnauthorizedError } = require('./errors');
const logger = require('./logger');

// Validate JWT configuration
if (!config.jwtSecret || !config.jwtRefreshSecret) {
  throw new Error('❌ JWT secrets not configured in environment variables!');
}

// Token blacklist for revoked tokens (logout)
const tokenBlacklist = new Set();

// Generate access and refresh tokens
const generateTokens = (userId, role, building = null) => {
  if (!userId || !role) {
    throw new Error('userId and role are required for token generation');
  }

  const payload = { userId, role, building };

  // Access token (short-lived, 15 minutes)
  const accessToken = jwt.sign(
    payload,
    config.jwtSecret,
    { expiresIn: config.jwtExpiry }
  );

  // Refresh token (long-lived, 7 days)
  const refreshToken = jwt.sign(
    payload,
    config.jwtRefreshSecret,
    { expiresIn: config.jwtRefreshExpiry }
  );

  return { accessToken, refreshToken };
};

// Verify access token
const verifyAccessToken = (token) => {
  try {
    // Check blacklist (revoked tokens)
    if (tokenBlacklist.has(token)) {
      throw new UnauthorizedError('Token has been revoked');
    }

    const decoded = jwt.verify(token, config.jwtSecret);
    logger.debug(`Token verified for user: ${decoded.userId}`);
    return decoded;

  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      logger.warn('Token expired');
      throw new UnauthorizedError('Token expired');
    }
    if (error.isOperational) {
      throw error;
    }
    logger.warn(`Token verification failed: ${error.message}`);
    throw new UnauthorizedError('Invalid token');
  }
};

// Verify refresh token
const verifyRefreshToken = (token) => {
  try {
    if (tokenBlacklist.has(token)) {
      throw new UnauthorizedError('Refresh token has been revoked');
    }

    return jwt.verify(token, config.jwtRefreshSecret);

  } catch (error) {
    if (error.isOperational) {
      throw error;
    }
    logger.warn(`Refresh token verification failed: ${error.message}`);
    throw new UnauthorizedError('Invalid refresh token');
  }
};

// Revoke token (logout)
const revokeToken = (token) => {
  tokenBlacklist.add(token);
  logger.info('Token revoked');
};

module.exports = {
  generateTokens,
  verifyAccessToken,
  verifyRefreshToken,
  revokeToken
};