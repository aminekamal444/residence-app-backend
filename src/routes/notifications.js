const express = require('express');
const router = express.Router();

const notificationService = require('../services/notificationService');
const authMiddleware = require('../middleware/authMiddleware');

// ─── GET / — get my notifications ─────────────────────────────────────────
router.get('/', authMiddleware, async (req, res, next) => {
  try {
    const { limit = 20, status } = req.query;
    const notifications = await notificationService.getUserNotifications(req.user._id, Number(limit), status || null);
    res.json({ success: true, message: 'Notifications retrieved', data: notifications });
  } catch (error) {
    next(error);
  }
});

// ─── GET /unread-count — how many unread notifications I have ─────────────
router.get('/unread-count', authMiddleware, async (req, res, next) => {
  try {
    const count = await notificationService.getUnreadCount(req.user._id);
    res.json({ success: true, message: 'Unread count retrieved', data: { count } });
  } catch (error) {
    next(error);
  }
});

// ─── PUT /mark-all-read — mark all my notifications as read ───────────────
router.put('/mark-all-read', authMiddleware, async (req, res, next) => {
  try {
    const result = await notificationService.markAllAsRead(req.user._id);
    res.json({ success: true, message: 'All notifications marked as read', data: { modified: result.modifiedCount } });
  } catch (error) {
    next(error);
  }
});

// ─── PUT /:notificationId/read — mark one notification as read ─────────────
router.put('/:notificationId/read', authMiddleware, async (req, res, next) => {
  try {
    const notification = await notificationService.markAsRead(req.params.notificationId);
    res.json({ success: true, message: 'Notification marked as read', data: notification });
  } catch (error) {
    next(error);
  }
});

// ─── PUT /:notificationId/archive — archive a notification ────────────────
router.put('/:notificationId/archive', authMiddleware, async (req, res, next) => {
  try {
    const notification = await notificationService.archiveNotification(req.params.notificationId);
    res.json({ success: true, message: 'Notification archived', data: notification });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
