const Complaint = require('../models/Complaint');
const { ApiResponse } = require('../utils/responseFormatter');
const { ValidationError, NotFoundError } = require('../utils/errors');
const logger = require('../utils/logger');

class ComplaintController {
  // Get all complaints
  async getAllComplaints(req, res, next) {
    try {
      const building = req.user.building;
      const { status, page = 1, limit = 10 } = req.query;

      const query = { building };
      if (status) query.status = status;

      const complaints = await Complaint.find(query)
        .populate('resident', 'name email')
        .populate('apartment', 'number')
        .limit(limit * 1)
        .skip((page - 1) * limit)
        .sort({ createdAt: -1 });

      const total = await Complaint.countDocuments(query);

      res.status(200).json(
        new ApiResponse(
          200,
          { complaints, total, pages: Math.ceil(total / limit) },
          'Complaints retrieved successfully'
        )
      );
    } catch (error) {
      next(error);
    }
  }

  // Get complaint by ID
  async getComplaintById(req, res, next) {
    try {
      const { complaintId } = req.params;

      const complaint = await Complaint.findById(complaintId)
        .populate('resident')
        .populate('apartment');

      if (!complaint) {
        throw new NotFoundError(req.t('errors.not_found'));
      }

      res.status(200).json(
        new ApiResponse(
          200,
          complaint,
          'Complaint retrieved successfully'
        )
      );
    } catch (error) {
      next(error);
    }
  }

  // Create complaint
  async createComplaint(req, res, next) {
    try {
      const { title, description, category, priority, apartment } = req.body;

      if (!title || !description || !category) {
        throw new ValidationError(req.t('errors.validation_error'));
      }

      const complaint = new Complaint({
        building: req.user.building,
        resident: req.user._id,
        apartment,
        title,
        description,
        category,
        priority: priority || 'medium',
        status: 'open',
        statusHistory: [
          {
            status: 'open',
            changedAt: new Date(),
            changedBy: req.user._id
          }
        ]
      });

      await complaint.save();

      logger.info(`Complaint created: ${title}`);

      res.status(201).json(
        new ApiResponse(
          201,
          complaint,
          req.t('complaint.created')
        )
      );
    } catch (error) {
      next(error);
    }
  }

  // Update complaint status
  async updateComplaintStatus(req, res, next) {
    try {
      const { complaintId } = req.params;
      const { status } = req.body;

      if (!status) {
        throw new ValidationError(req.t('errors.validation_error'));
      }

      const complaint = await Complaint.findByIdAndUpdate(
        complaintId,
        {
          status,
          $push: {
            statusHistory: {
              status,
              changedAt: new Date(),
              changedBy: req.user._id
            }
          }
        },
        { new: true }
      );

      if (!complaint) {
        throw new NotFoundError(req.t('errors.not_found'));
      }

      logger.info(`Complaint status updated: ${complaintId} to ${status}`);

      res.status(200).json(
        new ApiResponse(
          200,
          complaint,
          req.t('complaint.status_updated')
        )
      );
    } catch (error) {
      next(error);
    }
  }

  // Add response to complaint
  async addResponse(req, res, next) {
    try {
      const { complaintId } = req.params;
      const { text } = req.body;

      if (!text) {
        throw new ValidationError(req.t('errors.validation_error'));
      }

      const complaint = await Complaint.findByIdAndUpdate(
        complaintId,
        {
          $push: {
            responses: {
              author: req.user._id,
              text,
              createdAt: new Date()
            }
          }
        },
        { new: true }
      ).populate('responses.author', 'name');

      if (!complaint) {
        throw new NotFoundError(req.t('errors.not_found'));
      }

      logger.info(`Response added to complaint: ${complaintId}`);

      res.status(200).json(
        new ApiResponse(
          200,
          complaint,
          'Response added successfully'
        )
      );
    } catch (error) {
      next(error);
    }
  }

  // Rate complaint resolution
  async rateComplaint(req, res, next) {
    try {
      const { complaintId } = req.params;
      const { rating, feedback } = req.body;

      if (!rating || rating < 1 || rating > 5) {
        throw new ValidationError('Rating must be between 1 and 5');
      }

      const complaint = await Complaint.findByIdAndUpdate(
        complaintId,
        { rating, feedback, status: 'resolved' },
        { new: true }
      );

      if (!complaint) {
        throw new NotFoundError(req.t('errors.not_found'));
      }

      logger.info(`Complaint rated: ${complaintId} with rating ${rating}`);

      res.status(200).json(
        new ApiResponse(
          200,
          complaint,
          'Complaint rated successfully'
        )
      );
    } catch (error) {
      next(error);
    }
  }

  // Get resident complaints
  async getResidentComplaints(req, res, next) {
    try {
      const residentId = req.user._id;

      const complaints = await Complaint.find({ resident: residentId })
        .populate('apartment', 'number')
        .sort({ createdAt: -1 });

      res.status(200).json(
        new ApiResponse(
          200,
          complaints,
          'Resident complaints retrieved successfully'
        )
      );
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ComplaintController();