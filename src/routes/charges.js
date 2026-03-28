const express = require('express');
const router = express.Router();

const Charge = require('../models/Charge');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const { ValidationError, NotFoundError } = require('../utils/errors');

// ─── GET / — get all charges in this building ─────────────────────────────
router.get('/', authMiddleware, async (req, res, next) => {
  try {
    const { status, category, page = 1, limit = 10 } = req.query;
    const query = { building: req.user.building };
    if (status) query.status = status;
    if (category) query.category = category;

    const charges = await Charge.find(query)
      .populate('apartment', 'number')
      .skip((page - 1) * limit).limit(Number(limit))
      .sort({ dueDate: -1 });

    const total = await Charge.countDocuments(query);
    res.json({ success: true, message: 'Charges retrieved', data: { charges, total, pages: Math.ceil(total / limit) } });
  } catch (error) {
    next(error);
  }
});

// ─── POST / — create a charge for an apartment (syndic only) ──────────────
router.post('/', authMiddleware, roleMiddleware(['syndic']), async (req, res, next) => {
  try {
    const { apartment, amount, description, dueDate, category } = req.body;
    if (!apartment || !amount || !dueDate || !category) {
      throw new ValidationError('apartment, amount, dueDate and category are required');
    }

    const charge = new Charge({
      building: req.user.building,
      apartment,
      amount,
      description,
      dueDate,
      category,
      status: 'pending',
      createdBy: req.user._id
    });
    await charge.save();

    res.status(201).json({ success: true, message: 'Charge created', data: charge });
  } catch (error) {
    next(error);
  }
});

// ─── GET /overdue/list — get all overdue charges (syndic only) ─────────────
router.get('/overdue/list', authMiddleware, roleMiddleware(['syndic']), async (req, res, next) => {
  try {
    const charges = await Charge.find({
      building: req.user.building,
      dueDate: { $lt: new Date() },
      status: { $nin: ['paid', 'cancelled'] }
    }).populate('apartment').sort({ dueDate: 1 });

    res.json({ success: true, message: 'Overdue charges retrieved', data: charges });
  } catch (error) {
    next(error);
  }
});

// ─── GET /apartment/:apartmentId — get charges for a specific apartment ────
router.get('/apartment/:apartmentId', authMiddleware, async (req, res, next) => {
  try {
    const charges = await Charge.find({ apartment: req.params.apartmentId }).sort({ dueDate: -1 });
    res.json({ success: true, message: 'Apartment charges retrieved', data: charges });
  } catch (error) {
    next(error);
  }
});

// ─── GET /:chargeId — get one charge by ID ────────────────────────────────
router.get('/:chargeId', authMiddleware, async (req, res, next) => {
  try {
    const charge = await Charge.findById(req.params.chargeId).populate('apartment').populate('building');
    if (!charge) throw new NotFoundError('Charge not found');
    res.json({ success: true, message: 'Charge retrieved', data: charge });
  } catch (error) {
    next(error);
  }
});

// ─── PUT /:chargeId — update a charge (syndic only) ───────────────────────
router.put('/:chargeId', authMiddleware, roleMiddleware(['syndic']), async (req, res, next) => {
  try {
    const updates = { ...req.body };
    delete updates.status;
    delete updates.building;

    const charge = await Charge.findByIdAndUpdate(req.params.chargeId, updates, { new: true, runValidators: true });
    if (!charge) throw new NotFoundError('Charge not found');
    res.json({ success: true, message: 'Charge updated', data: charge });
  } catch (error) {
    next(error);
  }
});

// ─── DELETE /:chargeId — delete a charge (syndic only) ────────────────────
router.delete('/:chargeId', authMiddleware, roleMiddleware(['syndic']), async (req, res, next) => {
  try {
    const charge = await Charge.findByIdAndDelete(req.params.chargeId);
    if (!charge) throw new NotFoundError('Charge not found');
    res.json({ success: true, message: 'Charge deleted', data: null });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
