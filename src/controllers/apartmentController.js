const Apartment = require('../models/Apartment');
const { ApiResponse } = require('../utils/responseFormatter');
const { ValidationError, NotFoundError } = require('../utils/errors');
const logger = require('../utils/logger');

class ApartmentController {
  // Get all apartments in building
  async getAllApartments(req, res, next) {
    try {
      const building = req.user.building;
      const { page = 1, limit = 10, status } = req.query;

      const query = { building };
      if (status) query.status = status;

      const apartments = await Apartment.find(query)
        .populate('resident', 'name email phone')
        .populate('building', 'name')
        .limit(limit * 1)
        .skip((page - 1) * limit)
        .sort({ floor: 1, number: 1 });

      const total = await Apartment.countDocuments(query);

      res.status(200).json(
        new ApiResponse(
          200,
          { apartments, total, pages: Math.ceil(total / limit) },
          'Apartments retrieved successfully'
        )
      );
    } catch (error) {
      next(error);
    }
  }

  // Get apartment by ID
  async getApartmentById(req, res, next) {
    try {
      const { apartmentId } = req.params;

      const apartment = await Apartment.findById(apartmentId)
        .populate('resident', 'name email phone')
        .populate('building', 'name address');

      if (!apartment) {
        throw new NotFoundError(req.t('errors.not_found'));
      }

      res.status(200).json(
        new ApiResponse(
          200,
          apartment,
          'Apartment retrieved successfully'
        )
      );
    } catch (error) {
      next(error);
    }
  }

  // Create apartment
  async createApartment(req, res, next) {
    try {
      const { number, floor, area, rooms, bathrooms, features, monthlyCharge } = req.body;

      if (!number || !floor) {
        throw new ValidationError(req.t('errors.validation_error'));
      }

      const apartment = new Apartment({
        building: req.user.building,
        number,
        floor,
        size: area || null,
        bedrooms: rooms || 0,
        bathrooms: bathrooms || 0,
        features,
        monthlyCharge: monthlyCharge || 0,
        status: 'vacant'
      });

      await apartment.save();

      logger.info(`Apartment created: ${number} in floor ${floor}`);

      res.status(201).json(
        new ApiResponse(
          201,
          apartment,
          req.t('success.created')
        )
      );
    } catch (error) {
      next(error);
    }
  }

  // Update apartment
  async updateApartment(req, res, next) {
    try {
      const { apartmentId } = req.params;
      const updates = req.body;

      const apartment = await Apartment.findByIdAndUpdate(
        apartmentId,
        updates,
        { new: true, runValidators: true }
      );

      if (!apartment) {
        throw new NotFoundError(req.t('errors.not_found'));
      }

      logger.info(`Apartment updated: ${apartmentId}`);

      res.status(200).json(
        new ApiResponse(
          200,
          apartment,
          req.t('success.updated')
        )
      );
    } catch (error) {
      next(error);
    }
  }

  // Delete apartment
  async deleteApartment(req, res, next) {
    try {
      const { apartmentId } = req.params;

      const apartment = await Apartment.findByIdAndDelete(apartmentId);

      if (!apartment) {
        throw new NotFoundError(req.t('errors.not_found'));
      }

      logger.info(`Apartment deleted: ${apartmentId}`);

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
      const { apartmentId } = req.params;
      const { residentId } = req.body;

      if (!residentId) {
        throw new ValidationError(req.t('errors.validation_error'));
      }

      const apartment = await Apartment.findByIdAndUpdate(
        apartmentId,
        { resident: residentId, status: 'occupied' },
        { new: true }
      ).populate('resident', 'name email');

      if (!apartment) {
        throw new NotFoundError(req.t('errors.not_found'));
      }

      logger.info(`Resident assigned to apartment: ${apartmentId}`);

      res.status(200).json(
        new ApiResponse(
          200,
          apartment,
          req.t('success.updated')
        )
      );
    } catch (error) {
      next(error);
    }
  }

  // Remove resident from apartment
  async removeResident(req, res, next) {
    try {
      const { apartmentId } = req.params;

      const apartment = await Apartment.findByIdAndUpdate(
        apartmentId,
        { resident: null, status: 'vacant' },
        { new: true }
      );

      if (!apartment) {
        throw new NotFoundError(req.t('errors.not_found'));
      }

      logger.info(`Resident removed from apartment: ${apartmentId}`);

      res.status(200).json(
        new ApiResponse(
          200,
          apartment,
          req.t('success.updated')
        )
      );
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ApartmentController();