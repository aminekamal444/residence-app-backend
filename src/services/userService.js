const User = require('../models/User');
const Building = require('../models/Building');
const Apartment = require('../models/Apartment');
const { UnauthorizedError, ValidationError, NotFoundError } = require('../utils/errors');
const logger = require('../utils/logger');

class UserService {
  // Get user by ID
  async getUserById(userId) {
    try {
      const user = await User.findById(userId)
        .populate('building', 'name address city')
        .populate('apartment', 'number floor size');
      
      if (!user) {
        throw new NotFoundError('User not found');
      }

      return user;
    } catch (error) {
      logger.error('Get user error:', error);
      throw error;
    }
  }

  // Get all users by role
  async getUsersByRole(role, buildingId) {
    try {
      const query = { role };
      
      if (buildingId) {
        query.building = buildingId;
      }

      const users = await User.find(query)
        .populate('building', 'name address')
        .populate('apartment', 'number floor');

      return users;
    } catch (error) {
      logger.error('Get users by role error:', error);
      throw error;
    }
  }

  // Get all residents in building
  async getResidentsInBuilding(buildingId) {
    try {
      const residents = await User.find({
        building: buildingId,
        role: 'resident',
        status: 'active'
      }).populate('apartment', 'number floor size status');

      return residents;
    } catch (error) {
      logger.error('Get residents error:', error);
      throw error;
    }
  }

  // Update user profile
  async updateUserProfile(userId, updateData) {
    try {
      const { name, phone, notificationPreferences } = updateData;

      const user = await User.findById(userId);
      
      if (!user) {
        throw new NotFoundError('User not found');
      }

      // Update allowed fields
      if (name) user.name = name;
      if (phone) user.phone = phone;
      if (notificationPreferences) {
        user.notificationPreferences = {
          ...user.notificationPreferences,
          ...notificationPreferences
        };
      }

      await user.save();

      logger.info(`User profile updated: ${userId}`);

      return user;
    } catch (error) {
      logger.error('Update user profile error:', error);
      throw error;
    }
  }

  // Update user status
  async updateUserStatus(userId, status) {
    try {
      const validStatuses = ['active', 'inactive', 'suspended', 'deleted'];
      
      if (!validStatuses.includes(status)) {
        throw new ValidationError('Invalid status value');
      }

      const user = await User.findByIdAndUpdate(
        userId,
        { status },
        { new: true }
      );

      if (!user) {
        throw new NotFoundError('User not found');
      }

      logger.info(`User status updated: ${userId} -> ${status}`);

      return user;
    } catch (error) {
      logger.error('Update user status error:', error);
      throw error;
    }
  }

  // Assign resident to apartment
  async assignResidentToApartment(residentId, apartmentId) {
    try {
      // Check resident exists
      const resident = await User.findById(residentId);
      if (!resident || resident.role !== 'resident') {
        throw new NotFoundError('Resident not found');
      }

      // Check apartment exists
      const apartment = await Apartment.findById(apartmentId);
      if (!apartment) {
        throw new NotFoundError('Apartment not found');
      }

      // Update resident
      resident.apartment = apartmentId;
      resident.building = apartment.building;
      await resident.save();

      // Update apartment
      apartment.resident = residentId;
      apartment.status = 'occupied';
      await apartment.save();

      logger.info(`Resident ${residentId} assigned to apartment ${apartmentId}`);

      return { resident, apartment };
    } catch (error) {
      logger.error('Assign resident error:', error);
      throw error;
    }
  }

  // Unassign resident from apartment
  async unassignResidentFromApartment(residentId) {
    try {
      const resident = await User.findById(residentId);
      if (!resident) {
        throw new NotFoundError('Resident not found');
      }

      const apartmentId = resident.apartment;

      // Update resident
      resident.apartment = null;
      resident.building = null;
      await resident.save();

      // Update apartment
      if (apartmentId) {
        const apartment = await Apartment.findById(apartmentId);
        if (apartment) {
          apartment.resident = null;
          apartment.status = 'vacant';
          await apartment.save();
        }
      }

      logger.info(`Resident ${residentId} unassigned from apartment`);

      return resident;
    } catch (error) {
      logger.error('Unassign resident error:', error);
      throw error;
    }
  }

  // Assign syndic to building
  async assignSyndicToBuilding(syndicId, buildingId) {
    try {
      const syndic = await User.findById(syndicId);
      if (!syndic || syndic.role !== 'syndic') {
        throw new NotFoundError('Syndic not found');
      }

      const building = await Building.findById(buildingId);
      if (!building) {
        throw new NotFoundError('Building not found');
      }

      syndic.building = buildingId;
      await syndic.save();

      building.managedBy = syndicId;
      await building.save();

      logger.info(`Syndic ${syndicId} assigned to building ${buildingId}`);

      return { syndic, building };
    } catch (error) {
      logger.error('Assign syndic error:', error);
      throw error;
    }
  }

  // Assign caretaker to building
  async assignCaretakerToBuilding(caretakerId, buildingId) {
    try {
      const caretaker = await User.findById(caretakerId);
      if (!caretaker || caretaker.role !== 'gardien') {
        throw new NotFoundError('Caretaker not found');
      }

      const building = await Building.findById(buildingId);
      if (!building) {
        throw new NotFoundError('Building not found');
      }

      caretaker.building = buildingId;
      await caretaker.save();

      building.caretaker = caretakerId;
      await building.save();

      logger.info(`Caretaker ${caretakerId} assigned to building ${buildingId}`);

      return { caretaker, building };
    } catch (error) {
      logger.error('Assign caretaker error:', error);
      throw error;
    }
  }

  // Get user statistics
  async getUserStatistics(buildingId) {
    try {
      const stats = {
        totalUsers: await User.countDocuments({ building: buildingId }),
        residents: await User.countDocuments({ building: buildingId, role: 'resident' }),
        syndics: await User.countDocuments({ role: 'syndic' }),
        caretakers: await User.countDocuments({ role: 'gardien' }),
        active: await User.countDocuments({ building: buildingId, status: 'active' }),
        inactive: await User.countDocuments({ building: buildingId, status: 'inactive' })
      };

      return stats;
    } catch (error) {
      logger.error('Get user statistics error:', error);
      throw error;
    }
  }

  // Search users
  async searchUsers(buildingId, searchTerm) {
    try {
      const users = await User.find({
        building: buildingId,
        $or: [
          { name: { $regex: searchTerm, $options: 'i' } },
          { email: { $regex: searchTerm, $options: 'i' } },
          { phone: { $regex: searchTerm, $options: 'i' } }
        ]
      }).populate('apartment', 'number floor');

      return users;
    } catch (error) {
      logger.error('Search users error:', error);
      throw error;
    }
  }

  // Get all users in a building with filters and pagination
  async getAllUsers(buildingId, filters = {}, pagination = {}) {
    try {
      const query = { building: buildingId };
      if (filters.role) query.role = filters.role;
      if (filters.status) query.status = filters.status;

      const page = pagination.page || 1;
      const limit = pagination.limit || 10;
      const skip = (page - 1) * limit;

      const users = await User.find(query)
        .populate('apartment', 'number floor')
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 });

      const total = await User.countDocuments(query);

      return { users, total, pages: Math.ceil(total / limit) };
    } catch (error) {
      logger.error('Get all users error:', error);
      throw error;
    }
  }

  // Create user (by syndic)
  async createUser(userData) {
    try {
      const { name, email, password, role, phone, apartment, building } = userData;

      const existingUser = await User.findOne({ email: email.toLowerCase() });
      if (existingUser) {
        const { ConflictError } = require('../utils/errors');
        throw new ConflictError('Email already registered');
      }

      const user = new User({
        name,
        email: email.toLowerCase(),
        password,
        role,
        phone,
        apartment,
        building,
        status: 'active'
      });

      await user.save();
      logger.info(`User created by syndic: ${email}`);
      return user.toJSON();
    } catch (error) {
      logger.error('Create user error:', error);
      throw error;
    }
  }

  // Update user (name, phone, status)
  async updateUser(userId, updateData) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new NotFoundError('User not found');
      }

      if (updateData.name) user.name = updateData.name;
      if (updateData.phone) user.phone = updateData.phone;
      if (updateData.status) user.status = updateData.status;

      await user.save();
      logger.info(`User updated: ${userId}`);
      return user;
    } catch (error) {
      logger.error('Update user error:', error);
      throw error;
    }
  }

  // Update notification preferences
  async updateNotificationPreferences(userId, preferences) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new NotFoundError('User not found');
      }

      user.notificationPreferences = {
        ...user.notificationPreferences,
        ...preferences
      };

      await user.save();
      logger.info(`Notification preferences updated: ${userId}`);
      return user;
    } catch (error) {
      logger.error('Update notification preferences error:', error);
      throw error;
    }
  }

  // Delete user
  async deleteUser(userId) {
    try {
      const user = await User.findById(userId);
      
      if (!user) {
        throw new NotFoundError('User not found');
      }

      // If resident, unassign from apartment
      if (user.role === 'resident' && user.apartment) {
        await this.unassignResidentFromApartment(userId);
      }

      await User.findByIdAndDelete(userId);

      logger.info(`User deleted: ${userId}`);

      return { message: 'User deleted successfully' };
    } catch (error) {
      logger.error('Delete user error:', error);
      throw error;
    }
  }
}

module.exports = new UserService();