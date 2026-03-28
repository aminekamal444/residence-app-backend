const bcrypt = require('bcrypt');
const logger = require('./logger');

/**
 * Hash a password using bcrypt
 * @param {string} password - Plain text password
 * @returns {Promise<string>} - Hashed password
 */
const hashPassword = async (password) => {
  try {
    if (!password || typeof password !== 'string') {
      throw new Error('Password must be a non-empty string');
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    logger.debug('Password hashed successfully');
    return hashedPassword;

  } catch (error) {
    logger.error('Error hashing password:', error);
    throw error;
  }
};

/**
 * Compare a plain text password with a hashed password
 * @param {string} enteredPassword - Plain text password from user
 * @param {string} hashedPassword - Hashed password from database
 * @returns {Promise<boolean>} - True if passwords match
 */
const comparePassword = async (enteredPassword, hashedPassword) => {
  try {
    if (!enteredPassword || typeof enteredPassword !== 'string') {
      throw new Error('Entered password must be a non-empty string');
    }

    if (!hashedPassword || typeof hashedPassword !== 'string') {
      throw new Error('Hashed password must be a non-empty string');
    }

    const isMatch = await bcrypt.compare(enteredPassword, hashedPassword);
    
    logger.debug(`Password comparison result: ${isMatch}`);
    return isMatch;

  } catch (error) {
    logger.error('Error comparing passwords:', error);
    throw error;
  }
};

module.exports = {
  hashPassword,
  comparePassword
};