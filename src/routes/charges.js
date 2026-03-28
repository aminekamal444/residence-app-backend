const express = require('express');
const { param, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');

const chargeController = require('../controllers/chargeController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

const router = express.Router();

// ============ RATE LIMITING ============
const chargeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many charge requests'
});

// ============ VALIDATION ============
const validateChargeId = param('chargeId')
  .isMongoId()
  .withMessage('Invalid charge ID format');

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
  '/',
  authMiddleware,
  roleMiddleware(['syndic']),
  chargeLimiter,
  chargeController.createCharge
);

// ============ SPECIFIC PATHS (BEFORE DYNAMIC!) ============
router.get(
  '/overdue/list',
  authMiddleware,
  roleMiddleware(['syndic']),
  chargeLimiter,
  chargeController.getOverdueCharges
);

// ============ DYNAMIC PATHS ============
router.get(
  '/apartment/:apartmentId',
  authMiddleware,
  chargeLimiter,
  chargeController.getChargesByApartment
);

// ============ BARE DYNAMIC (LAST!) ============
router.get(
  '/:chargeId',
  authMiddleware,
  chargeLimiter,
  validateChargeId,
  handleValidationErrors,
  chargeController.getChargeById
);

router.get(
  '/',
  authMiddleware,
  chargeLimiter,
  chargeController.getAllCharges
);

router.put(
  '/:chargeId',
  authMiddleware,
  roleMiddleware(['syndic']),
  chargeLimiter,
  validateChargeId,
  handleValidationErrors,
  chargeController.updateCharge
);

router.delete(
  '/:chargeId',
  authMiddleware,
  roleMiddleware(['syndic']),
  chargeLimiter,
  validateChargeId,
  handleValidationErrors,
  chargeController.deleteCharge
);

module.exports = router;