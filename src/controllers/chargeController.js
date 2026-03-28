const Charge = require('../models/Charge');
const { ApiResponse } = require('../utils/responseFormatter');
const { ValidationError, NotFoundError } = require('../utils/errors');
const logger = require('../utils/logger');

class ChargeController {
  // Get all charges
  async getAllCharges(req, res, next) {
    try {
      const building = req.user.building;
      const { status, category, page = 1, limit = 10 } = req.query;

      const query = { building };
      if (status) query.status = status;
      if (category) query.category = category;

      const charges = await Charge.find(query)
        .populate('apartment', 'number')
        .populate('building', 'name')
        .limit(limit * 1)
        .skip((page - 1) * limit)
        .sort({ dueDate: -1 });

      const total = await Charge.countDocuments(query);

      res.status(200).json(
        new ApiResponse(
          200,
          { charges, total, pages: Math.ceil(total / limit) },
          'Charges retrieved successfully'
        )
      );
    } catch (error) {
      next(error);
    }
  }

  // Get charge by ID
  async getChargeById(req, res, next) {
    try {
      const { chargeId } = req.params;

      const charge = await Charge.findById(chargeId)
        .populate('apartment')
        .populate('building');

      if (!charge) {
        throw new NotFoundError(req.t('errors.not_found'));
      }

      res.status(200).json(
        new ApiResponse(
          200,
          charge,
          'Charge retrieved successfully'
        )
      );
    } catch (error) {
      next(error);
    }
  }

  // Create charge
  async createCharge(req, res, next) {
    try {
      const { apartment, amount, description, dueDate, category } = req.body;

      if (!apartment || !amount || !dueDate || !category) {
        throw new ValidationError(req.t('errors.validation_error'));
      }

      const charge = new Charge({
        building: req.user.building,
        apartment,
        amount,
        description,
        dueDate,
        category,
        status: 'pending',
        createdBy: req.user._id
      });

      await charge.save();

      logger.info(`Charge created: €${amount} for apartment ${apartment}`);

      res.status(201).json(
        new ApiResponse(
          201,
          charge,
          req.t('charge.created')
        )
      );
    } catch (error) {
      next(error);
    }
  }

  // Update charge
  async updateCharge(req, res, next) {
    try {
      const { chargeId } = req.params;
      const updates = req.body;

      // Remove immutable fields
      delete updates.status;
      delete updates.building;

      const charge = await Charge.findByIdAndUpdate(
        chargeId,
        updates,
        { new: true, runValidators: true }
      );

      if (!charge) {
        throw new NotFoundError(req.t('errors.not_found'));
      }

      logger.info(`Charge updated: ${chargeId}`);

      res.status(200).json(
        new ApiResponse(
          200,
          charge,
          req.t('success.updated')
        )
      );
    } catch (error) {
      next(error);
    }
  }

  // Delete charge
  async deleteCharge(req, res, next) {
    try {
      const { chargeId } = req.params;

      const charge = await Charge.findByIdAndDelete(chargeId);

      if (!charge) {
        throw new NotFoundError(req.t('errors.not_found'));
      }

      logger.info(`Charge deleted: ${chargeId}`);

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

  // Get charges by apartment
  async getChargesByApartment(req, res, next) {
    try {
      const { apartmentId } = req.params;

      const charges = await Charge.find({ apartment: apartmentId })
        .sort({ dueDate: -1 });

      res.status(200).json(
        new ApiResponse(
          200,
          charges,
          'Apartment charges retrieved successfully'
        )
      );
    } catch (error) {
      next(error);
    }
  }

  // Get overdue charges
  async getOverdueCharges(req, res, next) {
    try {
      const building = req.user.building;
      const today = new Date();

      const charges = await Charge.find({
        building,
        dueDate: { $lt: today },
        status: { $nin: ['paid', 'cancelled'] }
      })
        .populate('apartment')
        .sort({ dueDate: 1 });

      res.status(200).json(
        new ApiResponse(
          200,
          charges,
          'Overdue charges retrieved successfully'
        )
      );
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ChargeController();