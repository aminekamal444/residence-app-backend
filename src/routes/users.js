const express = require('express');
const { param, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');

const userController = require('../controllers/userController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

const router = express.Router();

// ============ RATE LIMITING ============
const userLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many user requests'
});

// ============ VALIDATION ============
const validateUserId = param('userId')
  .isMongoId()
  .withMessage('Invalid user ID format');

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
  userLimiter,
  userController.createUser
);

// ============ SPECIFIC PATHS (BEFORE DYNAMIC!) ============
router.get(
  '/residents/list',
  authMiddleware,
  userLimiter,
  userController.getResidents
);

router.get(
  '/statistics/all',
  authMiddleware,
  roleMiddleware(['syndic']),
  userLimiter,
  userController.getUserStatistics
);

// ============ DYNAMIC WITH SUBPATHS ============
router.put(
  '/:userId/preferences/notifications',
  authMiddleware,
  userLimiter,
  validateUserId,
  handleValidationErrors,
  userController.updateNotificationPreferences
);

// ============ BARE DYNAMIC (LAST!) ============
router.get(
  '/:userId',
  authMiddleware,
  userLimiter,
  validateUserId,
  handleValidationErrors,
  userController.getUserById
);

router.get(
  '/',
  authMiddleware,
  roleMiddleware(['syndic']),
  userLimiter,
  userController.getAllUsers
);

router.put(
  '/:userId',
  authMiddleware,
  userLimiter,
  validateUserId,
  handleValidationErrors,
  userController.updateUser
);

router.delete(
  '/:userId',
  authMiddleware,
  roleMiddleware(['syndic']),
  userLimiter,
  validateUserId,
  handleValidationErrors,
  userController.deleteUser
);

module.exports = router;