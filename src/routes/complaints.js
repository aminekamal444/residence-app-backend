const express = require('express');
const router = express.Router();

const Complaint = require('../models/Complaint');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const { ValidationError, NotFoundError } = require('../utils/errors');

// ─── GET / — get all complaints in this building ──────────────────────────
router.get('/', authMiddleware, async (req, res, next) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const query = { building: req.user.building };
    if (status) query.status = status;

    const complaints = await Complaint.find(query)
      .populate('resident', 'name email')
      .populate('apartment', 'number')
      .skip((page - 1) * limit).limit(Number(limit))
      .sort({ createdAt: -1 });

    const total = await Complaint.countDocuments(query);
    res.json({ success: true, message: 'Complaints retrieved', data: { complaints, total, pages: Math.ceil(total / limit) } });
  } catch (error) {
    next(error);
  }
});

// ─── POST / — resident submits a complaint ────────────────────────────────
router.post('/', authMiddleware, async (req, res, next) => {
  try {
    const { title, description, category, priority, apartment } = req.body;
    if (!title || !description || !category) throw new ValidationError('title, description and category are required');

    const complaint = new Complaint({
      building: req.user.building,
      resident: req.user._id,
      apartment,
      title, description, category,
      priority: priority || 'medium',
      status: 'open',
      statusHistory: [{ status: 'open', changedAt: new Date(), changedBy: req.user._id }]
    });
    await complaint.save();

    res.status(201).json({ success: true, message: 'Complaint submitted', data: complaint });
  } catch (error) {
    next(error);
  }
});

// ─── GET /resident/my-complaints — get the logged-in resident's complaints ─
router.get('/resident/my-complaints', authMiddleware, roleMiddleware(['resident']), async (req, res, next) => {
  try {
    const complaints = await Complaint.find({ resident: req.user._id })
      .populate('apartment', 'number')
      .sort({ createdAt: -1 });
    res.json({ success: true, message: 'Resident complaints retrieved', data: complaints });
  } catch (error) {
    next(error);
  }
});

// ─── PUT /:complaintId/status — update complaint status (syndic only) ──────
router.put('/:complaintId/status', authMiddleware, roleMiddleware(['syndic']), async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!status) throw new ValidationError('status is required');

    const complaint = await Complaint.findByIdAndUpdate(
      req.params.complaintId,
      {
        status,
        $push: { statusHistory: { status, changedAt: new Date(), changedBy: req.user._id } }
      },
      { new: true }
    );
    if (!complaint) throw new NotFoundError('Complaint not found');
    res.json({ success: true, message: 'Complaint status updated', data: complaint });
  } catch (error) {
    next(error);
  }
});

// ─── POST /:complaintId/response — add a response to a complaint ──────────
router.post('/:complaintId/response', authMiddleware, async (req, res, next) => {
  try {
    const { text } = req.body;
    if (!text) throw new ValidationError('text is required');

    const complaint = await Complaint.findByIdAndUpdate(
      req.params.complaintId,
      { $push: { responses: { author: req.user._id, text, createdAt: new Date() } } },
      { new: true }
    ).populate('responses.author', 'name');

    if (!complaint) throw new NotFoundError('Complaint not found');
    res.json({ success: true, message: 'Response added', data: complaint });
  } catch (error) {
    next(error);
  }
});

// ─── POST /:complaintId/rate — resident rates the resolution (1-5) ─────────
router.post('/:complaintId/rate', authMiddleware, roleMiddleware(['resident']), async (req, res, next) => {
  try {
    const { rating, feedback } = req.body;
    if (!rating || rating < 1 || rating > 5) throw new ValidationError('Rating must be between 1 and 5');

    const complaint = await Complaint.findByIdAndUpdate(
      req.params.complaintId,
      { rating, feedback, status: 'resolved' },
      { new: true }
    );
    if (!complaint) throw new NotFoundError('Complaint not found');
    res.json({ success: true, message: 'Complaint rated', data: complaint });
  } catch (error) {
    next(error);
  }
});

// ─── GET /:complaintId — get one complaint by ID ──────────────────────────
router.get('/:complaintId', authMiddleware, async (req, res, next) => {
  try {
    const complaint = await Complaint.findById(req.params.complaintId)
      .populate('resident').populate('apartment');
    if (!complaint) throw new NotFoundError('Complaint not found');
    res.json({ success: true, message: 'Complaint retrieved', data: complaint });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
