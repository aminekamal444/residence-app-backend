const User = require('../models/User');
const { comparePassword } = require('../utils/passwordUtils');
const { generateTokens, verifyRefreshToken } = require('../utils/tokenUtils');
const { UnauthorizedError, ValidationError, ConflictError } = require('../utils/errors');
const logger = require('../utils/logger');

const VALID_PLATFORMS = ['ios', 'android', 'web'];
const VALID_ROLES = ['resident', 'syndic', 'gardien'];
const loginAttempts = {};

class AuthService {
  // Register new user
  async register(userData) {
    try {
      let { email, password, name, phone, role, building, apartment } = userData;

      email = email?.trim().toLowerCase();
      name = name?.trim();
      phone = phone?.trim();

      this._validateRegisterInput({ email, password, name, phone, role });

      const passwordValidation = this._validatePasswordStrength(password);
      if (!passwordValidation.valid) {
        throw new ValidationError(passwordValidation.message);
      }

      const existingUser = await User.findOne({ email });
      if (existingUser) {
        throw new ConflictError('Email already registered');
      }

      // Create user with PLAIN password - User.js pre-save hook will hash it!
      const user = new User({
        email,
        password: password,  // Plain password, NOT hashed
        name,
        phone,
        role: role || VALID_ROLES[0],
        building,
        apartment,
        status: 'active'
      });

      await user.save();  // This triggers pre-save hook which hashes password

      logger.info(`User registered: ${email}`);

      const tokens = generateTokens(user._id, user.role, building);

      return {
        user: user.toJSON(),
        ...tokens
      };
    } catch (error) {
      logger.error('Registration error:', error.message);
      throw error;
    }
  }

  // Login user
  async login(email, password) {
    try {
      const normalizedEmail = email?.trim().toLowerCase();

      if (!normalizedEmail || !password) {
        throw new ValidationError('Email and password are required');
      }

      if (loginAttempts[normalizedEmail] && loginAttempts[normalizedEmail] >= 5) {
        logger.warn(`Login blocked for ${normalizedEmail}: too many attempts`);
        throw new UnauthorizedError('Too many failed attempts. Try again later.');
      }

      const user = await User.findOne({ email: normalizedEmail }).select('+password');
      
      if (!user) {
        loginAttempts[normalizedEmail] = (loginAttempts[normalizedEmail] || 0) + 1;
        throw new UnauthorizedError('Invalid email or password');
      }

      const isPasswordValid = await comparePassword(password, user.password);
      if (!isPasswordValid) {
        loginAttempts[normalizedEmail] = (loginAttempts[normalizedEmail] || 0) + 1;
        logger.warn(`Failed login attempt for: ${normalizedEmail}`);
        throw new UnauthorizedError('Invalid email or password');
      }

      if (user.status !== 'active') {
        throw new UnauthorizedError('User account is not active');
      }

      delete loginAttempts[normalizedEmail];

      user.lastLogin = new Date();
      await user.save();

      logger.info(`User logged in: ${normalizedEmail}`);

      const tokens = generateTokens(user._id, user.role, user.building);

      return {
        user: user.toJSON(),
        ...tokens
      };
    } catch (error) {
      logger.error('Login error:', error.message);
      throw error;
    }
  }

  // Refresh access token
  async refreshToken(refreshToken) {
    try {
      if (!refreshToken) {
        throw new UnauthorizedError('Refresh token is required');
      }

      const decoded = verifyRefreshToken(refreshToken);
      
      const user = await User.findById(decoded.userId);
      if (!user) {
        throw new UnauthorizedError('User not found');
      }

      const tokens = generateTokens(user._id, user.role, user.building);
      logger.info(`Token refreshed for user: ${decoded.userId}`);
      
      return tokens;
    } catch (error) {
      logger.error('Token refresh error:', error.message);
      throw new UnauthorizedError('Invalid refresh token');
    }
  }

  // Change password
  async changePassword(userId, oldPassword, newPassword) {
    try {
      if (!oldPassword || !newPassword) {
        throw new ValidationError('Both old and new passwords are required');
      }

      if (oldPassword === newPassword) {
        throw new ValidationError('New password must be different from old password');
      }

      const validation = this._validatePasswordStrength(newPassword);
      if (!validation.valid) {
        throw new ValidationError(validation.message);
      }

      const user = await User.findById(userId).select('+password');
      if (!user) {
        throw new UnauthorizedError('User not found');
      }

      const isValid = await comparePassword(oldPassword, user.password);
      if (!isValid) {
        throw new UnauthorizedError('Current password is incorrect');
      }

      // Set PLAIN password, let User.js pre-save hook hash it!
      user.password = newPassword;
      await user.save();

      logger.info(`Password changed for user: ${userId}`);

      return { message: 'Password changed successfully' };
    } catch (error) {
      logger.error('Change password error:', error.message);
      throw error;
    }
  }

  // Add device token for push notifications
  async addDeviceToken(userId, token, platform) {
    try {
      if (!token || typeof token !== 'string') {
        throw new ValidationError('Valid token is required');
      }

      if (!VALID_PLATFORMS.includes(platform)) {
        throw new ValidationError(`Platform must be one of: ${VALID_PLATFORMS.join(', ')}`);
      }

      const user = await User.findById(userId);
      if (!user) {
        throw new UnauthorizedError('User not found');
      }

      const tokenExists = user.deviceTokens?.some(dt => dt.token === token);
      if (!tokenExists) {
        user.deviceTokens.push({
          token,
          platform,
          addedAt: new Date()
        });
        await user.save();
      }

      logger.info(`Device token added for user: ${userId} (${platform})`);
      return { message: 'Device token registered' };
    } catch (error) {
      logger.error('Add device token error:', error.message);
      throw error;
    }
  }

  // Remove device token
  async removeDeviceToken(userId, token) {
    try {
      if (!token) {
        throw new ValidationError('Token is required');
      }

      const user = await User.findById(userId);
      if (!user) {
        throw new UnauthorizedError('User not found');
      }

      user.deviceTokens = user.deviceTokens?.filter(dt => dt.token !== token) || [];
      await user.save();

      logger.info(`Device token removed for user: ${userId}`);
      return { message: 'Device token removed' };
    } catch (error) {
      logger.error('Remove device token error:', error.message);
      throw error;
    }
  }

  // ============ PRIVATE VALIDATION METHODS ============

  _validateRegisterInput(data) {
    const { email, password, name, phone, role } = data;

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      throw new ValidationError('Valid email is required');
    }

    if (!password || typeof password !== 'string') {
      throw new ValidationError('Password is required');
    }

    if (!name || typeof name !== 'string' || name.length < 2) {
      throw new ValidationError('Name is required (minimum 2 characters)');
    }

    if (role && !VALID_ROLES.includes(role)) {
      throw new ValidationError(`Role must be one of: ${VALID_ROLES.join(', ')}`);
    }
  }

  _validatePasswordStrength(password) {
    const errors = [];

    if (password.length < 8) {
      errors.push('Password must be at least 8 characters');
    }
    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain uppercase letter');
    }
    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain lowercase letter');
    }
    if (!/[0-9]/.test(password)) {
      errors.push('Password must contain number');
    }
    if (!/[!@#$%^&*]/.test(password)) {
      errors.push('Password must contain special character (!@#$%^&*)');
    }

    return {
      valid: errors.length === 0,
      message: errors.join('; ')
    };
  }
}

module.exports = new AuthService();