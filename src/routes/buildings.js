const express = require('express');
const { param, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');

const buildingController = require('../controllers/buildingController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

const router = express.Router();

const buildingLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many building requests'
});

const validateBuildingId = param('buildingId')
  .isMongoId()
  .withMessage('Invalid building ID format');

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

// GET /api/v1/buildings/my — get current user's building (no buildingId needed)
router.get(
  '/my',
  authMiddleware,
  buildingLimiter,
  buildingController.getMyBuilding
);

// GET /api/v1/buildings/:buildingId/stats
router.get(
  '/:buildingId/stats',
  authMiddleware,
  buildingLimiter,
  validateBuildingId,
  handleValidationErrors,
  buildingController.getBuildingStats
);

// POST /api/v1/buildings/:buildingId/assign-caretaker
router.post(
  '/:buildingId/assign-caretaker',
  authMiddleware,
  roleMiddleware(['syndic']),
  buildingLimiter,
  validateBuildingId,
  handleValidationErrors,
  buildingController.assignCaretaker
);

// GET /api/v1/buildings
router.get(
  '/',
  authMiddleware,
  buildingLimiter,
  buildingController.getAllBuildings
);

// POST /api/v1/buildings
router.post(
  '/',
  authMiddleware,
  roleMiddleware(['syndic']),
  buildingLimiter,
  buildingController.createBuilding
);

// GET /api/v1/buildings/:buildingId
router.get(
  '/:buildingId',
  authMiddleware,
  buildingLimiter,
  validateBuildingId,
  handleValidationErrors,
  buildingController.getBuildingById
);

// PUT /api/v1/buildings/:buildingId
router.put(
  '/:buildingId',
  authMiddleware,
  roleMiddleware(['syndic']),
  buildingLimiter,
  validateBuildingId,
  handleValidationErrors,
  buildingController.updateBuilding
);

// DELETE /api/v1/buildings/:buildingId
router.delete(
  '/:buildingId',
  authMiddleware,
  roleMiddleware(['syndic']),
  buildingLimiter,
  validateBuildingId,
  handleValidationErrors,
  buildingController.deleteBuilding
);

module.exports = router;
