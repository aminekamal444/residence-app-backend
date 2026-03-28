const authService = require('../services/authService');
const { ApiResponse } = require('../utils/responseFormatter');
const { UnauthorizedError, ValidationError } = require('../utils/errors');
const logger = require('../utils/logger');
const User = require('../models/User');

const VALID_PLATFORMS = ['ios', 'android', 'web'];

class AuthController {
  // Register new user
  async register(req, res, next) {
    try {
      let { name, email, password, passwordConfirm, role, building, phone } = req.body;

      email = email?.trim().toLowerCase();
      name = name?.trim();
      phone = phone?.trim();

      if (!name || !email || !password || !passwordConfirm || !role) {
        throw new ValidationError(req.t ? req.t('errors.validation_error') : 'Validation error');
      }

      if (password !== passwordConfirm) {
        throw new ValidationError(req.t ? req.t('auth.passwords_not_match') : 'Passwords do not match');
      }

      const result = await authService.register({
        name,
        email,
        password,
        role,
        building,
        phone
      });

      logger.info(`User registered successfully: ${email}`);

      res.status(201).json({
        statusCode: 201,
        success: true,
        message: req.t ? req.t('auth.register_success') : 'User registered successfully',
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  // Login user
  async login(req, res, next) {
    try {
      let { email, password, deviceToken, platform } = req.body;

      email = email?.trim().toLowerCase();

      if (!email || !password) {
        throw new ValidationError(req.t ? req.t('errors.validation_error') : 'Email and password required');
      }

      const result = await authService.login(email, password);

      if (deviceToken && typeof deviceToken === 'string' && deviceToken.length > 10) {
        if (!VALID_PLATFORMS.includes(platform)) {
          logger.warn(`Invalid platform provided: ${platform}`);
        } else {
          try {
            await authService.addDeviceToken(result.user._id, deviceToken, platform);
          } catch (deviceError) {
            logger.error('Failed to add device token:', deviceError.message);
          }
        }
      }

      logger.info(`User logged in successfully: ${email}`);

      res.status(200).json({
        statusCode: 200,
        success: true,
        message: req.t ? req.t('auth.login_success') : 'Login successful',
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  // Refresh token
  async refreshToken(req, res, next) {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken || typeof refreshToken !== 'string') {
        throw new ValidationError(req.t ? req.t('errors.validation_error') : 'Refresh token required');
      }

      const result = await authService.refreshToken(refreshToken);

      res.status(200).json({
        statusCode: 200,
        success: true,
        message: req.t ? req.t('auth.token_refreshed') : 'Token refreshed',
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  // Change password
  async changePassword(req, res, next) {
    try {
      const { currentPassword, newPassword, passwordConfirm } = req.body;
      const userId = req.user?._id;

      if (!userId) {
        throw new UnauthorizedError('Authentication required');
      }

      if (!currentPassword || !newPassword || !passwordConfirm) {
        throw new ValidationError(req.t ? req.t('errors.validation_error') : 'All fields required');
      }

      if (newPassword !== passwordConfirm) {
        throw new ValidationError(req.t ? req.t('auth.passwords_not_match') : 'Passwords do not match');
      }

      if (currentPassword === newPassword) {
        throw new ValidationError(req.t ? req.t('auth.password_same_error') : 'New password must be different');
      }

      await authService.changePassword(userId, currentPassword, newPassword);

      logger.info(`Password changed for user: ${userId}`);

      res.status(200).json({
        statusCode: 200,
        success: true,
        message: req.t ? req.t('auth.password_changed') : 'Password changed successfully',
        data: null
      });
    } catch (error) {
      next(error);
    }
  }

  // Get current user
  async getCurrentUser(req, res, next) {
    try {
      const userId = req.user?._id;

      if (!userId) {
        throw new UnauthorizedError('Authentication required');
      }

      const user = await User.findById(userId).select('-password -deviceTokens -deletedAt');

      if (!user) {
        throw new UnauthorizedError('User not found');
      }

      res.status(200).json({
        statusCode: 200,
        success: true,
        message: req.t ? req.t('auth.user_retrieved') : 'User retrieved',
        data: user.toJSON()
      });
    } catch (error) {
      next(error);
    }
  }

  // Logout
  async logout(req, res, next) {
    try {
      const userId = req.user?._id;
      const { deviceToken } = req.body;

      if (!userId) {
        throw new UnauthorizedError('Authentication required');
      }

      if (deviceToken) {
        try {
          await authService.removeDeviceToken(userId, deviceToken);
        } catch (deviceError) {
          logger.warn('Failed to remove device token:', deviceError.message);
        }
      }

      logger.info(`User logged out: ${userId}`);

      res.status(200).json({
        statusCode: 200,
        success: true,
        message: req.t ? req.t('auth.logout_success') : 'Logged out successfully',
        data: null
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AuthController();