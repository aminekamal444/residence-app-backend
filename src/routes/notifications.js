const express = require('express');
const { param, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');

const notificationService = require('../services/notificationService');
const { ApiResponse } = require('../utils/responseFormatter');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

const notificationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: 'Too many notification requests'
});

const validateId = param('notificationId')
  .isMongoId()
  .withMessage('Invalid notification ID');

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ statusCode: 400, success: false, message: 'Validation error', errors: errors.array() });
  }
  next();
};

// GET /api/v1/notifications — get my notifications
router.get('/', authMiddleware, notificationLimiter, async (req, res, next) => {
  try {
    const { limit = 20, status } = req.query;
    const notifications = await notificationService.getUserNotifications(
      req.user._id,
      Number(limit),
      status || null
    );
    res.status(200).json(new ApiResponse(200, notifications, 'Notifications retrieved successfully'));
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/notifications/unread-count
router.get('/unread-count', authMiddleware, notificationLimiter, async (req, res, next) => {
  try {
    const count = await notificationService.getUnreadCount(req.user._id);
    res.status(200).json(new ApiResponse(200, { count }, 'Unread count retrieved'));
  } catch (error) {
    next(error);
  }
});

// PUT /api/v1/notifications/mark-all-read
router.put('/mark-all-read', authMiddleware, notificationLimiter, async (req, res, next) => {
  try {
    const result = await notificationService.markAllAsRead(req.user._id);
    res.status(200).json(new ApiResponse(200, { modified: result.modifiedCount }, 'All notifications marked as read'));
  } catch (error) {
    next(error);
  }
});

// PUT /api/v1/notifications/:notificationId/read
router.put('/:notificationId/read', authMiddleware, notificationLimiter, validateId, handleValidationErrors, async (req, res, next) => {
  try {
    const notification = await notificationService.markAsRead(req.params.notificationId);
    res.status(200).json(new ApiResponse(200, notification, 'Notification marked as read'));
  } catch (error) {
    next(error);
  }
});

// PUT /api/v1/notifications/:notificationId/archive
router.put('/:notificationId/archive', authMiddleware, notificationLimiter, validateId, handleValidationErrors, async (req, res, next) => {
  try {
    const notification = await notificationService.archiveNotification(req.params.notificationId);
    res.status(200).json(new ApiResponse(200, notification, 'Notification archived'));
  } catch (error) {
    next(error);
  }
});

module.exports = router;
