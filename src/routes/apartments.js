const express = require('express');
const { param, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');

const apartmentController = require('../controllers/apartmentController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

const router = express.Router();

// ============ RATE LIMITING ============
const apartmentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many apartment requests'
});

// ============ VALIDATION ============
const validateApartmentId = param('apartmentId')
  .isMongoId()
  .withMessage('Invalid apartment ID format');

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

// ============ GET ALL ============
router.get(
  '/',
  authMiddleware,
  apartmentLimiter,
  apartmentController.getAllApartments
);

// ============ CREATE ============
router.post(
  '/',
  authMiddleware,
  roleMiddleware(['syndic']),
  apartmentLimiter,
  apartmentController.createApartment
);

// ============ SPECIFIC WITH DYNAMIC ID ============
router.post(
  '/:apartmentId/assign-resident',
  authMiddleware,
  roleMiddleware(['syndic']),
  apartmentLimiter,
  validateApartmentId,
  handleValidationErrors,
  apartmentController.assignResident
);

router.delete(
  '/:apartmentId/resident',
  authMiddleware,
  roleMiddleware(['syndic']),
  apartmentLimiter,
  validateApartmentId,
  handleValidationErrors,
  apartmentController.removeResident
);

// ============ BARE DYNAMIC (LAST!) ============
router.get(
  '/:apartmentId',
  authMiddleware,
  apartmentLimiter,
  validateApartmentId,
  handleValidationErrors,
  apartmentController.getApartmentById
);

router.put(
  '/:apartmentId',
  authMiddleware,
  roleMiddleware(['syndic']),
  apartmentLimiter,
  validateApartmentId,
  handleValidationErrors,
  apartmentController.updateApartment
);

router.delete(
  '/:apartmentId',
  authMiddleware,
  roleMiddleware(['syndic']),
  apartmentLimiter,
  validateApartmentId,
  handleValidationErrors,
  apartmentController.deleteApartment
);

module.exports = router;