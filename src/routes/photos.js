const express = require('express');
const router = express.Router();

const photoService = require('../services/photoService');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const { ValidationError } = require('../utils/errors');

// ─── POST /:taskId/upload — gardien uploads a photo for a task ─────────────
router.post('/:taskId/upload', authMiddleware, roleMiddleware(['gardien']), async (req, res, next) => {
  try {
    const { photoUrl, photoType, caption, metadata } = req.body;
    if (!photoUrl || !photoType) throw new ValidationError('photoUrl and photoType are required');

    const photo = await photoService.uploadTaskPhoto(req.params.taskId, { photoUrl, photoType, caption, metadata }, req.user._id);
    res.status(201).json({ success: true, message: 'Photo uploaded', data: photo });
  } catch (error) {
    next(error);
  }
});

// ─── GET /:taskId/list — get all photos for a task ────────────────────────
router.get('/:taskId/list', authMiddleware, async (req, res, next) => {
  try {
    const photos = await photoService.getPhotosForTask(req.params.taskId);
    res.json({ success: true, message: 'Task photos retrieved', data: photos });
  } catch (error) {
    next(error);
  }
});

// ─── GET /:taskId/type/:type — get photos filtered by type (before/after) ──
router.get('/:taskId/type/:type', authMiddleware, async (req, res, next) => {
  try {
    const photos = await photoService.getPhotosByType(req.params.taskId, req.params.type);
    res.json({ success: true, message: 'Photos retrieved', data: photos });
  } catch (error) {
    next(error);
  }
});

// ─── GET /:taskId/compare — compare before and after photos ───────────────
router.get('/:taskId/compare', authMiddleware, async (req, res, next) => {
  try {
    const comparison = await photoService.compareBeforeAfterPhotos(req.params.taskId);
    res.json({ success: true, message: 'Photos compared', data: comparison });
  } catch (error) {
    next(error);
  }
});

// ─── GET /:taskId/statistics — photo stats for a task ────────────────────
router.get('/:taskId/statistics', authMiddleware, async (req, res, next) => {
  try {
    const stats = await photoService.getPhotoStatistics(req.params.taskId);
    res.json({ success: true, message: 'Photo statistics retrieved', data: stats });
  } catch (error) {
    next(error);
  }
});

// ─── POST /:photoId/validate — validate photo quality (syndic only) ────────
router.post('/:photoId/validate', authMiddleware, roleMiddleware(['syndic']), async (req, res, next) => {
  try {
    const result = await photoService.validatePhotoQuality(req.params.photoId, req.body);
    res.json({ success: true, message: 'Photo validated', data: result });
  } catch (error) {
    next(error);
  }
});

// ─── POST /:photoId/approve — approve a photo (syndic only) ───────────────
router.post('/:photoId/approve', authMiddleware, roleMiddleware(['syndic']), async (req, res, next) => {
  try {
    const photo = await photoService.approvePhoto(req.params.photoId, req.user._id);
    res.json({ success: true, message: 'Photo approved', data: photo });
  } catch (error) {
    next(error);
  }
});

// ─── POST /:photoId/reject — reject a photo (syndic only) ─────────────────
router.post('/:photoId/reject', authMiddleware, roleMiddleware(['syndic']), async (req, res, next) => {
  try {
    const { reason } = req.body;
    if (!reason) throw new ValidationError('reason is required');
    const photo = await photoService.rejectPhoto(req.params.photoId, req.user._id, reason);
    res.json({ success: true, message: 'Photo rejected', data: photo });
  } catch (error) {
    next(error);
  }
});

// ─── DELETE /:photoId — delete a photo (syndic only) ─────────────────────
router.delete('/:photoId', authMiddleware, roleMiddleware(['syndic']), async (req, res, next) => {
  try {
    await photoService.deletePhoto(req.params.photoId);
    res.json({ success: true, message: 'Photo deleted', data: null });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
