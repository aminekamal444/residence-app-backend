const express = require('express');
const { param, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');

const photoController = require('../controllers/photoController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

const router = express.Router();

// ============ RATE LIMITING ============
const photoLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many photo requests'
});

// ============ VALIDATION ============
const validatePhotoId = param('photoId')
  .isMongoId()
  .withMessage('Invalid photo ID format');

const validateTaskId = param('taskId')
  .isMongoId()
  .withMessage('Invalid task ID format');

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
  '/:taskId/upload',
  authMiddleware,
  roleMiddleware(['gardien']),
  photoLimiter,
  validateTaskId,
  handleValidationErrors,
  photoController.uploadTaskPhoto
);

// ============ SPECIFIC PATHS (BEFORE DYNAMIC!) ============
router.get(
  '/:taskId/list',
  authMiddleware,
  photoLimiter,
  validateTaskId,
  handleValidationErrors,
  photoController.getPhotosForTask
);

router.get(
  '/:taskId/type/:type',
  authMiddleware,
  photoLimiter,
  validateTaskId,
  handleValidationErrors,
  photoController.getPhotosByType
);

router.get(
  '/:taskId/compare',
  authMiddleware,
  photoLimiter,
  validateTaskId,
  handleValidationErrors,
  photoController.compareBeforeAfterPhotos
);

router.get(
  '/:taskId/statistics',
  authMiddleware,
  photoLimiter,
  validateTaskId,
  handleValidationErrors,
  photoController.getPhotoStatistics
);

// ============ DYNAMIC WITH SUBPATHS ============
router.post(
  '/:photoId/validate',
  authMiddleware,
  roleMiddleware(['syndic']),
  photoLimiter,
  validatePhotoId,
  handleValidationErrors,
  photoController.validatePhotoQuality
);

router.post(
  '/:photoId/approve',
  authMiddleware,
  roleMiddleware(['syndic']),
  photoLimiter,
  validatePhotoId,
  handleValidationErrors,
  photoController.approvePhoto
);

router.post(
  '/:photoId/reject',
  authMiddleware,
  roleMiddleware(['syndic']),
  photoLimiter,
  validatePhotoId,
  handleValidationErrors,
  photoController.rejectPhoto
);

// ============ BARE DYNAMIC (LAST!) ============
router.delete(
  '/:photoId',
  authMiddleware,
  roleMiddleware(['syndic']),
  photoLimiter,
  validatePhotoId,
  handleValidationErrors,
  photoController.deletePhoto
);

module.exports = router;