const express = require('express');
const router = express.Router();

const Announcement = require('../models/Announcement');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const { ValidationError, NotFoundError } = require('../utils/errors');

// ─── GET / — get all announcements in this building ───────────────────────
router.get('/', authMiddleware, async (req, res, next) => {
  try {
    const { type, page = 1, limit = 10 } = req.query;
    const query = { building: req.user.building };
    if (type) query.type = type;

    const announcements = await Announcement.find(query)
      .populate('createdBy', 'name')
      .skip((page - 1) * limit).limit(Number(limit))
      .sort({ createdAt: -1 });

    const total = await Announcement.countDocuments(query);
    res.json({ success: true, message: 'Announcements retrieved', data: { announcements, total, pages: Math.ceil(total / limit) } });
  } catch (error) {
    next(error);
  }
});

// ─── POST / — create an announcement (syndic only) ────────────────────────
router.post('/', authMiddleware, roleMiddleware(['syndic']), async (req, res, next) => {
  try {
    const { title, content, type, targetAudience, priority } = req.body;
    if (!title || !content || !type) throw new ValidationError('title, content and type are required');

    const announcement = new Announcement({
      building: req.user.building,
      title, content, type,
      targetAudience: targetAudience || 'all',
      priority: priority || 'medium',
      createdBy: req.user._id,
      publishedDate: new Date(),
      viewedBy: []
    });
    await announcement.save();

    res.status(201).json({ success: true, message: 'Announcement created', data: announcement });
  } catch (error) {
    next(error);
  }
});

// ─── POST /:announcementId/view — mark announcement as viewed ─────────────
router.post('/:announcementId/view', authMiddleware, async (req, res, next) => {
  try {
    const announcement = await Announcement.findByIdAndUpdate(
      req.params.announcementId,
      { $addToSet: { viewedBy: req.user._id } },
      { new: true }
    );
    if (!announcement) throw new NotFoundError('Announcement not found');
    res.json({ success: true, message: 'Marked as viewed', data: announcement });
  } catch (error) {
    next(error);
  }
});

// ─── POST /:announcementId/comment — add a comment ────────────────────────
router.post('/:announcementId/comment', authMiddleware, async (req, res, next) => {
  try {
    const { text } = req.body;
    if (!text) throw new ValidationError('text is required');

    const announcement = await Announcement.findByIdAndUpdate(
      req.params.announcementId,
      { $push: { comments: { user: req.user._id, text, createdAt: new Date() } } },
      { new: true }
    ).populate('comments.user', 'name');

    if (!announcement) throw new NotFoundError('Announcement not found');
    res.json({ success: true, message: 'Comment added', data: announcement });
  } catch (error) {
    next(error);
  }
});

// ─── POST /:announcementId/like — like an announcement ────────────────────
router.post('/:announcementId/like', authMiddleware, async (req, res, next) => {
  try {
    const announcement = await Announcement.findByIdAndUpdate(
      req.params.announcementId,
      { $addToSet: { likes: req.user._id } },
      { new: true }
    );
    if (!announcement) throw new NotFoundError('Announcement not found');
    res.json({ success: true, message: 'Announcement liked', data: { likes: announcement.likes?.length || 0 } });
  } catch (error) {
    next(error);
  }
});

// ─── GET /:announcementId — get one announcement by ID ────────────────────
router.get('/:announcementId', authMiddleware, async (req, res, next) => {
  try {
    const announcement = await Announcement.findById(req.params.announcementId)
      .populate('createdBy', 'name');
    if (!announcement) throw new NotFoundError('Announcement not found');
    res.json({ success: true, message: 'Announcement retrieved', data: announcement });
  } catch (error) {
    next(error);
  }
});

// ─── PUT /:announcementId — update an announcement (syndic only) ───────────
router.put('/:announcementId', authMiddleware, roleMiddleware(['syndic']), async (req, res, next) => {
  try {
    const { title, content, type, targetAudience, priority } = req.body;
    const updates = {};
    if (title) updates.title = title;
    if (content) updates.content = content;
    if (type) updates.type = type;
    if (targetAudience) updates.targetAudience = targetAudience;
    if (priority) updates.priority = priority;

    const announcement = await Announcement.findByIdAndUpdate(req.params.announcementId, updates, { new: true });
    if (!announcement) throw new NotFoundError('Announcement not found');
    res.json({ success: true, message: 'Announcement updated', data: announcement });
  } catch (error) {
    next(error);
  }
});

// ─── DELETE /:announcementId — delete an announcement (syndic only) ─────────
router.delete('/:announcementId', authMiddleware, roleMiddleware(['syndic']), async (req, res, next) => {
  try {
    const announcement = await Announcement.findByIdAndDelete(req.params.announcementId);
    if (!announcement) throw new NotFoundError('Announcement not found');
    res.json({ success: true, message: 'Announcement deleted', data: null });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
