const Payment = require('../models/Payment');
const Charge = require('../models/Charge');
const { ApiResponse } = require('../utils/responseFormatter');
const { ValidationError, NotFoundError } = require('../utils/errors');
const logger = require('../utils/logger');

class PaymentController {
  // Get all payments
  async getAllPayments(req, res, next) {
    try {
      const building = req.user.building;
      const { status, page = 1, limit = 10 } = req.query;

      const query = { building };
      if (status) query.status = status;

      const payments = await Payment.find(query)
        .populate('apartment', 'number')
        .populate('resident', 'name')
        .populate('charge', 'amount category')
        .limit(limit * 1)
        .skip((page - 1) * limit)
        .sort({ paidDate: -1 });

      const total = await Payment.countDocuments(query);

      res.status(200).json(
        new ApiResponse(
          200,
          { payments, total, pages: Math.ceil(total / limit) },
          'Payments retrieved successfully'
        )
      );
    } catch (error) {
      next(error);
    }
  }

  // Get payment by ID
  async getPaymentById(req, res, next) {
    try {
      const { paymentId } = req.params;

      const payment = await Payment.findById(paymentId)
        .populate('apartment')
        .populate('resident')
        .populate('charge');

      if (!payment) {
        throw new NotFoundError(req.t('errors.not_found'));
      }

      res.status(200).json(
        new ApiResponse(
          200,
          payment,
          'Payment retrieved successfully'
        )
      );
    } catch (error) {
      next(error);
    }
  }

  // Initiate payment (create payment intent)
  async initiatePayment(req, res, next) {
    try {
      const { chargeId, amount, paymentMethod } = req.body;

      if (!chargeId || !amount) {
        throw new ValidationError(req.t('errors.validation_error'));
      }

      const charge = await Charge.findById(chargeId).populate('apartment');

      if (!charge) {
        throw new NotFoundError(req.t('errors.not_found'));
      }

      // Create payment record
      const payment = new Payment({
        building: charge.building,
        apartment: charge.apartment._id,
        resident: req.user._id,
        charge: chargeId,
        amount,
        paymentMethod,
        category: charge.category,
        status: 'pending'
      });

      await payment.save();

      logger.info(`Payment initiated: €${amount} for charge ${chargeId}`);

      res.status(201).json(
        new ApiResponse(
          201,
          payment,
          'Payment initiated successfully'
        )
      );
    } catch (error) {
      next(error);
    }
  }

  // Confirm payment
  async confirmPayment(req, res, next) {
    try {
      const { paymentId } = req.params;
      const { stripePaymentIntentId, transactionId } = req.body;

      const payment = await Payment.findByIdAndUpdate(
        paymentId,
        {
          status: 'completed',
          paidDate: new Date(),
          stripePaymentIntentId,
          transactionId
        },
        { new: true }
      );

      if (!payment) {
        throw new NotFoundError(req.t('errors.not_found'));
      }

      // Update charge status
      await Charge.findByIdAndUpdate(payment.charge, { status: 'paid' });

      logger.info(`Payment confirmed: ${paymentId}`);

      res.status(200).json(
        new ApiResponse(
          200,
          payment,
          req.t('charge.payment_received')
        )
      );
    } catch (error) {
      next(error);
    }
  }

  // Cancel payment
  async cancelPayment(req, res, next) {
    try {
      const { paymentId } = req.params;
      const { reason } = req.body;

      const payment = await Payment.findByIdAndUpdate(
        paymentId,
        { status: 'failed', failureReason: reason },
        { new: true }
      );

      if (!payment) {
        throw new NotFoundError(req.t('errors.not_found'));
      }

      logger.info(`Payment cancelled: ${paymentId}`);

      res.status(200).json(
        new ApiResponse(
          200,
          payment,
          req.t('charge.payment_failed')
        )
      );
    } catch (error) {
      next(error);
    }
  }

  // Get payments by resident
  async getPaymentsByResident(req, res, next) {
    try {
      const residentId = req.user._id;

      const payments = await Payment.find({ resident: residentId })
        .populate('charge')
        .sort({ paidDate: -1 });

      res.status(200).json(
        new ApiResponse(
          200,
          payments,
          'Resident payments retrieved successfully'
        )
      );
    } catch (error) {
      next(error);
    }
  }

  // Get payment statistics
  async getPaymentStatistics(req, res, next) {
    try {
      const building = req.user.building;

      const completed = await Payment.countDocuments({
        building,
        status: 'completed'
      });

      const pending = await Payment.countDocuments({
        building,
        status: 'pending'
      });

      const failed = await Payment.countDocuments({
        building,
        status: 'failed'
      });

      res.status(200).json(
        new ApiResponse(
          200,
          { completed, pending, failed },
          'Payment statistics retrieved successfully'
        )
      );
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new PaymentController();