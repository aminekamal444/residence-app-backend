const express = require('express');
const router = express.Router();

const User = require('../models/User');
const Apartment = require('../models/Apartment');
const Building = require('../models/Building');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const { ValidationError, NotFoundError, ConflictError } = require('../utils/errors');

// ─── GET / — get all users in this building (syndic only) ─────────────────
router.get('/', authMiddleware, roleMiddleware(['syndic']), async (req, res, next) => {
  try {
    const { role, status, page = 1, limit = 10 } = req.query;
    const query = { building: req.user.building };
    if (role) query.role = role;
    if (status) query.status = status;

    const skip = (page - 1) * limit;
    const users = await User.find(query).populate('apartment', 'number floor').skip(skip).limit(Number(limit)).sort({ createdAt: -1 });
    const total = await User.countDocuments(query);

    res.json({ success: true, message: 'Users retrieved', data: { users, total, pages: Math.ceil(total / limit) } });
  } catch (error) {
    next(error);
  }
});

// ─── POST / — create a new user (syndic only) ─────────────────────────────
router.post('/', authMiddleware, roleMiddleware(['syndic']), async (req, res, next) => {
  try {
    const { name, email, password, role, phone, apartment } = req.body;
    if (!name || !email || !password || !role) throw new ValidationError('name, email, password and role are required');

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) throw new ConflictError('Email already registered');

    const user = new User({ name, email: email.toLowerCase(), password, role, phone, apartment, building: req.user.building, status: 'active' });
    await user.save();

    res.status(201).json({ success: true, message: 'User created', data: user.toJSON() });
  } catch (error) {
    next(error);
  }
});

// ─── GET /residents/list — list all residents in this building ─────────────
router.get('/residents/list', authMiddleware, async (req, res, next) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    const residents = await User.find({ building: req.user.building, role: 'resident' })
      .populate('apartment', 'number floor')
      .skip(skip).limit(Number(limit));
    const total = await User.countDocuments({ building: req.user.building, role: 'resident' });

    res.json({ success: true, message: 'Residents retrieved', data: { users: residents, total, pages: Math.ceil(total / limit) } });
  } catch (error) {
    next(error);
  }
});

// ─── GET /statistics/all — user count stats for this building (syndic only) ─
router.get('/statistics/all', authMiddleware, roleMiddleware(['syndic']), async (req, res, next) => {
  try {
    const buildingId = req.user.building;
    const stats = {
      total: await User.countDocuments({ building: buildingId }),
      residents: await User.countDocuments({ building: buildingId, role: 'resident' }),
      gardiens: await User.countDocuments({ building: buildingId, role: 'gardien' }),
      active: await User.countDocuments({ building: buildingId, status: 'active' }),
      inactive: await User.countDocuments({ building: buildingId, status: 'inactive' })
    };
    res.json({ success: true, message: 'Statistics retrieved', data: stats });
  } catch (error) {
    next(error);
  }
});

// ─── GET /:userId — get a specific user by ID ─────────────────────────────
router.get('/:userId', authMiddleware, async (req, res, next) => {
  try {
    const user = await User.findById(req.params.userId)
      .populate('building', 'name address city')
      .populate('apartment', 'number floor size');
    if (!user) throw new NotFoundError('User not found');
    res.json({ success: true, message: 'User retrieved', data: user });
  } catch (error) {
    next(error);
  }
});

// ─── PUT /:userId — update a user's name, phone, or status ─────────────────
router.put('/:userId', authMiddleware, async (req, res, next) => {
  try {
    const { name, phone, status } = req.body;
    const user = await User.findById(req.params.userId);
    if (!user) throw new NotFoundError('User not found');

    if (name) user.name = name;
    if (phone) user.phone = phone;
    if (status) user.status = status;
    await user.save();

    res.json({ success: true, message: 'User updated', data: user });
  } catch (error) {
    next(error);
  }
});

// ─── DELETE /:userId — delete a user (syndic only) ─────────────────────────
router.delete('/:userId', authMiddleware, roleMiddleware(['syndic']), async (req, res, next) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) throw new NotFoundError('User not found');

    // If resident, free up their apartment
    if (user.role === 'resident' && user.apartment) {
      await Apartment.findByIdAndUpdate(user.apartment, { resident: null, status: 'vacant' });
    }

    await User.findByIdAndDelete(req.params.userId);
    res.json({ success: true, message: 'User deleted', data: null });
  } catch (error) {
    next(error);
  }
});

// ─── PUT /:userId/preferences/notifications — update notification settings ──
router.put('/:userId/preferences/notifications', authMiddleware, async (req, res, next) => {
  try {
    const { push, email, sms, emergencyOnly } = req.body;
    const user = await User.findById(req.params.userId);
    if (!user) throw new NotFoundError('User not found');

    user.notificationPreferences = {
      push: push !== undefined ? push : true,
      email: email !== undefined ? email : true,
      sms: sms !== undefined ? sms : false,
      emergencyOnly: emergencyOnly !== undefined ? emergencyOnly : false
    };
    await user.save();

    res.json({ success: true, message: 'Preferences updated', data: user });
  } catch (error) {
    next(error);
  }
});

// ─── POST /assign-resident — assign a resident to an apartment ─────────────
router.post('/assign-resident', authMiddleware, roleMiddleware(['syndic']), async (req, res, next) => {
  try {
    const { residentId, apartmentId } = req.body;
    if (!residentId || !apartmentId) throw new ValidationError('residentId and apartmentId are required');

    const [resident, apartment] = await Promise.all([
      User.findById(residentId),
      Apartment.findById(apartmentId)
    ]);

    if (!resident || resident.role !== 'resident') throw new NotFoundError('Resident not found');
    if (!apartment) throw new NotFoundError('Apartment not found');

    resident.apartment = apartmentId;
    resident.building = apartment.building;
    await resident.save();

    apartment.resident = residentId;
    apartment.status = 'occupied';
    await apartment.save();

    res.json({ success: true, message: 'Resident assigned to apartment', data: { resident, apartment } });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
