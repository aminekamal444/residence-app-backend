const Building = require('../models/Building');
const User = require('../models/User');
const Apartment = require('../models/Apartment');
const Complaint = require('../models/Complaint');
const { NotFoundError, ValidationError, ConflictError } = require('../utils/errors');
const logger = require('../utils/logger');

class BuildingService {
  async createBuilding(buildingData, syndicId) {
    try {
      const { name, address, city, postalCode, country, totalApartments, description, amenities } = buildingData;

      const existing = await Building.findOne({ name, address });
      if (existing) {
        throw new ConflictError('A building with this name and address already exists');
      }

      const building = new Building({
        name,
        address,
        city,
        postalCode,
        country: country || 'Morocco',
        totalApartments,
        description: description || '',
        amenities: amenities || [],
        managedBy: syndicId
      });

      await building.save();

      // Link the syndic user to this building
      await User.findByIdAndUpdate(syndicId, { building: building._id });

      logger.info(`Building created: ${name} by syndic ${syndicId}`);

      return building;
    } catch (error) {
      logger.error('Create building error:', error);
      throw error;
    }
  }

  async getAllBuildings(filters = {}, pagination = {}) {
    try {
      const { city, country } = filters;
      const { page = 1, limit = 20 } = pagination;

      const query = {};
      if (city) query.city = new RegExp(city, 'i');
      if (country) query.country = new RegExp(country, 'i');

      const skip = (page - 1) * limit;

      const [buildings, total] = await Promise.all([
        Building.find(query)
          .populate('managedBy', 'name email phone')
          .populate('caretaker', 'name email phone')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(Number(limit))
          .lean(),
        Building.countDocuments(query)
      ]);

      return {
        buildings,
        total,
        pages: Math.ceil(total / limit),
        page: Number(page)
      };
    } catch (error) {
      logger.error('Get all buildings error:', error);
      throw error;
    }
  }

  async getBuildingById(buildingId) {
    try {
      const building = await Building.findById(buildingId)
        .populate('managedBy', 'name email phone')
        .populate('caretaker', 'name email phone');

      if (!building) {
        throw new NotFoundError('Building not found');
      }

      return building;
    } catch (error) {
      logger.error('Get building by ID error:', error);
      throw error;
    }
  }

  async updateBuilding(buildingId, updateData, userId) {
    try {
      const building = await Building.findById(buildingId);
      if (!building) {
        throw new NotFoundError('Building not found');
      }

      const allowedFields = ['name', 'address', 'city', 'postalCode', 'country', 'totalApartments', 'description', 'amenities'];
      const updates = {};
      allowedFields.forEach(field => {
        if (updateData[field] !== undefined) {
          updates[field] = updateData[field];
        }
      });

      const updated = await Building.findByIdAndUpdate(
        buildingId,
        updates,
        { new: true, runValidators: true }
      ).populate('managedBy', 'name email').populate('caretaker', 'name email');

      logger.info(`Building updated: ${buildingId} by user ${userId}`);

      return updated;
    } catch (error) {
      logger.error('Update building error:', error);
      throw error;
    }
  }

  async deleteBuilding(buildingId) {
    try {
      const building = await Building.findById(buildingId);
      if (!building) {
        throw new NotFoundError('Building not found');
      }

      const residentCount = await User.countDocuments({ building: buildingId, status: 'active' });
      if (residentCount > 0) {
        throw new ValidationError(`Cannot delete building with ${residentCount} active residents`);
      }

      await Building.findByIdAndDelete(buildingId);

      logger.info(`Building deleted: ${buildingId}`);

      return { deleted: true };
    } catch (error) {
      logger.error('Delete building error:', error);
      throw error;
    }
  }

  async assignCaretaker(buildingId, caretakerId) {
    try {
      const [building, caretaker] = await Promise.all([
        Building.findById(buildingId),
        User.findById(caretakerId)
      ]);

      if (!building) throw new NotFoundError('Building not found');
      if (!caretaker) throw new NotFoundError('Caretaker user not found');
      if (caretaker.role !== 'gardien') {
        throw new ValidationError('User must have the gardien role to be assigned as caretaker');
      }

      // Update building and link caretaker to this building
      const [updated] = await Promise.all([
        Building.findByIdAndUpdate(
          buildingId,
          { caretaker: caretakerId },
          { new: true }
        ).populate('managedBy', 'name email').populate('caretaker', 'name email'),
        User.findByIdAndUpdate(caretakerId, { building: buildingId })
      ]);

      logger.info(`Caretaker ${caretakerId} assigned to building ${buildingId}`);

      return updated;
    } catch (error) {
      logger.error('Assign caretaker error:', error);
      throw error;
    }
  }

  async getBuildingStats(buildingId) {
    try {
      const building = await Building.findById(buildingId);
      if (!building) throw new NotFoundError('Building not found');

      const [
        totalResidents,
        activeResidents,
        totalApartments,
        occupiedApartments,
        vacantApartments,
        openComplaints,
        totalStaff
      ] = await Promise.all([
        User.countDocuments({ building: buildingId, role: 'resident' }),
        User.countDocuments({ building: buildingId, role: 'resident', status: 'active' }),
        Apartment.countDocuments({ building: buildingId }),
        Apartment.countDocuments({ building: buildingId, status: 'occupied' }),
        Apartment.countDocuments({ building: buildingId, status: 'vacant' }),
        Complaint.countDocuments({ building: buildingId, status: { $in: ['open', 'in_progress', 'pending'] } }),
        User.countDocuments({ building: buildingId, role: 'gardien', status: 'active' })
      ]);

      const occupancyRate = totalApartments > 0
        ? Math.round((occupiedApartments / totalApartments) * 100)
        : 0;

      return {
        building: {
          id: building._id,
          name: building.name,
          address: building.address,
          city: building.city
        },
        residents: {
          total: totalResidents,
          active: activeResidents
        },
        apartments: {
          total: totalApartments,
          occupied: occupiedApartments,
          vacant: vacantApartments,
          occupancyRate: `${occupancyRate}%`
        },
        staff: {
          total: totalStaff
        },
        complaints: {
          open: openComplaints
        }
      };
    } catch (error) {
      logger.error('Get building stats error:', error);
      throw error;
    }
  }

  async getMyBuilding(userId) {
    try {
      const user = await User.findById(userId).lean();
      if (!user || !user.building) {
        throw new NotFoundError('No building assigned to this user');
      }

      const building = await Building.findById(user.building)
        .populate('managedBy', 'name email phone')
        .populate('caretaker', 'name email phone');

      if (!building) throw new NotFoundError('Building not found');

      return building;
    } catch (error) {
      logger.error('Get my building error:', error);
      throw error;
    }
  }
}

module.exports = new BuildingService();
