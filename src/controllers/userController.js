const userService = require('../services/userService');
const { ApiResponse } = require('../utils/responseFormatter');
const { ValidationError, NotFoundError } = require('../utils/errors');
const logger = require('../utils/logger');

class UserController {
  // Get all users in building
  async getAllUsers(req, res, next) {
    try {
      const { role, status, page = 1, limit = 10 } = req.query;
      const building = req.user.building;

      const filters = { status };
      if (role) filters.role = role;

      const users = await userService.getAllUsers(building, filters, {
        page: parseInt(page),
        limit: parseInt(limit)
      });

      res.status(200).json(
        new ApiResponse(
          200,
          users,
          'Users retrieved successfully'
        )
      );
    } catch (error) {
      next(error);
    }
  }

  // Get user by ID
  async getUserById(req, res, next) {
    try {
      const { userId } = req.params;

      const user = await userService.getUserById(userId);

      if (!user) {
        throw new NotFoundError(req.t('errors.user_not_found'));
      }

      res.status(200).json(
        new ApiResponse(
          200,
          user,
          'User retrieved successfully'
        )
      );
    } catch (error) {
      next(error);
    }
  }

  // Create user (Syndic only)
  async createUser(req, res, next) {
    try {
      const { name, email, password, role, phone, apartment } = req.body;

      if (!name || !email || !password || !role) {
        throw new ValidationError(req.t('errors.validation_error'));
      }

      const userData = {
        name,
        email,
        password,
        role,
        phone,
        apartment,
        building: req.user.building
      };

      const user = await userService.createUser(userData);

      logger.info(`User created: ${email} with role: ${role}`);

      res.status(201).json(
        new ApiResponse(
          201,
          user,
          req.t('success.created')
        )
      );
    } catch (error) {
      next(error);
    }
  }

  // Update user
  async updateUser(req, res, next) {
    try {
      const { userId } = req.params;
      const { name, phone, status } = req.body;

      const userData = {};
      if (name) userData.name = name;
      if (phone) userData.phone = phone;
      if (status) userData.status = status;

      const user = await userService.updateUser(userId, userData);

      logger.info(`User updated: ${userId}`);

      res.status(200).json(
        new ApiResponse(
          200,
          user,
          req.t('success.updated')
        )
      );
    } catch (error) {
      next(error);
    }
  }

  // Delete user (Syndic only)
  async deleteUser(req, res, next) {
    try {
      const { userId } = req.params;

      await userService.deleteUser(userId);

      logger.info(`User deleted: ${userId}`);

      res.status(200).json(
        new ApiResponse(
          200,
          null,
          req.t('success.deleted')
        )
      );
    } catch (error) {
      next(error);
    }
  }

  // Assign resident to apartment
  async assignResident(req, res, next) {
    try {
      const { residentId, apartmentId } = req.body;

      if (!residentId || !apartmentId) {
        throw new ValidationError(req.t('errors.validation_error'));
      }

      const user = await userService.assignResidentToApartment(residentId, apartmentId);

      logger.info(`Resident ${residentId} assigned to apartment ${apartmentId}`);

      res.status(200).json(
        new ApiResponse(
          200,
          user,
          req.t('success.updated')
        )
      );
    } catch (error) {
      next(error);
    }
  }

  // Get user statistics
  async getUserStatistics(req, res, next) {
    try {
      const building = req.user.building;

      const stats = await userService.getUserStatistics(building);

      res.status(200).json(
        new ApiResponse(
          200,
          stats,
          'Statistics retrieved successfully'
        )
      );
    } catch (error) {
      next(error);
    }
  }

  // Get residents in building
  async getResidents(req, res, next) {
    try {
      const building = req.user.building;
      const { status, page = 1, limit = 10 } = req.query;

      const residents = await userService.getAllUsers(
        building,
        { role: 'resident', status },
        { page: parseInt(page), limit: parseInt(limit) }
      );

      res.status(200).json(
        new ApiResponse(
          200,
          residents,
          'Residents retrieved successfully'
        )
      );
    } catch (error) {
      next(error);
    }
  }

  // Update notification preferences
  async updateNotificationPreferences(req, res, next) {
    try {
      const userId = req.user._id;
      const { push, email, sms, emergencyOnly } = req.body;

      const preferences = {
        push: push !== undefined ? push : true,
        email: email !== undefined ? email : true,
        sms: sms !== undefined ? sms : false,
        emergencyOnly: emergencyOnly !== undefined ? emergencyOnly : false
      };

      const user = await userService.updateNotificationPreferences(userId, preferences);

      logger.info(`Notification preferences updated for user: ${userId}`);

      res.status(200).json(
        new ApiResponse(
          200,
          user,
          req.t('success.updated')
        )
      );
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new UserController();