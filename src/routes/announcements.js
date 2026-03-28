const express = require('express');
const { param, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');

const announcementController = require('../controllers/announcementController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

const router = express.Router();

// ============ RATE LIMITING ============
const announcementLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many announcement requests'
});

// ============ VALIDATION ============
const validateAnnouncementId = param('announcementId')
  .isMongoId()
  .withMessage('Invalid announcement ID format');

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
  announcementLimiter,
  announcementController.getAllAnnouncements
);

// ============ CREATE ============
router.post(
  '/',
  authMiddleware,
  roleMiddleware(['syndic']),
  announcementLimiter,
  announcementController.createAnnouncement
);

// ============ DYNAMIC WITH SUBPATHS ============
router.post(
  '/:announcementId/view',
  authMiddleware,
  announcementLimiter,
  validateAnnouncementId,
  handleValidationErrors,
  announcementController.markAsViewed
);

router.post(
  '/:announcementId/comment',
  authMiddleware,
  announcementLimiter,
  validateAnnouncementId,
  handleValidationErrors,
  announcementController.addComment
);

router.post(
  '/:announcementId/like',
  authMiddleware,
  announcementLimiter,
  validateAnnouncementId,
  handleValidationErrors,
  announcementController.likeAnnouncement
);

// ============ BARE DYNAMIC (LAST!) ============
router.get(
  '/:announcementId',
  authMiddleware,
  announcementLimiter,
  validateAnnouncementId,
  handleValidationErrors,
  announcementController.getAnnouncementById
);

router.put(
  '/:announcementId',
  authMiddleware,
  roleMiddleware(['syndic']),
  announcementLimiter,
  validateAnnouncementId,
  handleValidationErrors,
  announcementController.updateAnnouncement
);

router.delete(
  '/:announcementId',
  authMiddleware,
  roleMiddleware(['syndic']),
  announcementLimiter,
  validateAnnouncementId,
  handleValidationErrors,
  announcementController.deleteAnnouncement
);

module.exports = router;