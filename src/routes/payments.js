const express = require('express');
const { param, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');

const paymentController = require('../controllers/paymentController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

const router = express.Router();

// ============ RATE LIMITING ============
const paymentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many payment requests'
});

// ============ VALIDATION ============
const validatePaymentId = param('paymentId')
  .isMongoId()
  .withMessage('Invalid payment ID format');

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      statusCode: 400,
      success: false,
      message: 'Validation error',
      errors: errors.array()
    });
  }
  next();
};

// ============ CREATE ============
router.post(
  '/initiate',
  authMiddleware,
  roleMiddleware(['resident']),
  paymentLimiter,
  paymentController.initiatePayment
);

// ============ SPECIFIC PATHS (BEFORE DYNAMIC!) ============
router.get(
  '/resident/history',
  authMiddleware,
  roleMiddleware(['resident']),
  paymentLimiter,
  paymentController.getPaymentsByResident
);

router.get(
  '/statistics/overview',
  authMiddleware,
  roleMiddleware(['syndic']),
  paymentLimiter,
  paymentController.getPaymentStatistics
);

// ============ DYNAMIC WITH SUBPATHS ============
router.post(
  '/:paymentId/confirm',
  authMiddleware,
  paymentLimiter,
  validatePaymentId,
  handleValidationErrors,
  paymentController.confirmPayment
);

router.post(
  '/:paymentId/cancel',
  authMiddleware,
  paymentLimiter,
  validatePaymentId,
  handleValidationErrors,
  paymentController.cancelPayment
);

// ============ BARE DYNAMIC (LAST!) ============
router.get(
  '/:paymentId',
  authMiddleware,
  paymentLimiter,
  validatePaymentId,
  handleValidationErrors,
  paymentController.getPaymentById
);

router.get(
  '/',
  authMiddleware,
  roleMiddleware(['syndic']),
  paymentLimiter,
  paymentController.getAllPayments
);

module.exports = router;