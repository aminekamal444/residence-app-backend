const express = require('express');
const router = express.Router();

const Apartment = require('../models/Apartment');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const { ValidationError, NotFoundError } = require('../utils/errors');

// ─── GET / — get all apartments in this building ──────────────────────────
router.get('/', authMiddleware, async (req, res, next) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const query = { building: req.user.building };
    if (status) query.status = status;

    const apartments = await Apartment.find(query)
      .populate('resident', 'name email phone')
      .populate('building', 'name')
      .skip((page - 1) * limit).limit(Number(limit))
      .sort({ floor: 1, number: 1 });

    const total = await Apartment.countDocuments(query);
    res.json({ success: true, message: 'Apartments retrieved', data: { apartments, total, pages: Math.ceil(total / limit) } });
  } catch (error) {
    next(error);
  }
});

// ─── POST / — create a new apartment (syndic only) ────────────────────────
router.post('/', authMiddleware, roleMiddleware(['syndic']), async (req, res, next) => {
  try {
    const { number, floor, area, rooms, bathrooms, features, monthlyCharge } = req.body;
    if (!number || !floor) throw new ValidationError('number and floor are required');

    const apartment = new Apartment({
      building: req.user.building,
      number,
      floor,
      size: area || null,
      bedrooms: rooms || 0,
      bathrooms: bathrooms || 0,
      features,
      monthlyCharge: monthlyCharge || 0,
      status: 'vacant'
    });
    await apartment.save();

    res.status(201).json({ success: true, message: 'Apartment created', data: apartment });
  } catch (error) {
    next(error);
  }
});

// ─── POST /:apartmentId/assign-resident — assign a resident (syndic only) ──
router.post('/:apartmentId/assign-resident', authMiddleware, roleMiddleware(['syndic']), async (req, res, next) => {
  try {
    const { residentId } = req.body;
    if (!residentId) throw new ValidationError('residentId is required');

    const apartment = await Apartment.findByIdAndUpdate(
      req.params.apartmentId,
      { resident: residentId, status: 'occupied' },
      { new: true }
    ).populate('resident', 'name email');

    if (!apartment) throw new NotFoundError('Apartment not found');
    res.json({ success: true, message: 'Resident assigned', data: apartment });
  } catch (error) {
    next(error);
  }
});

// ─── DELETE /:apartmentId/resident — remove resident from apartment ─────────
router.delete('/:apartmentId/resident', authMiddleware, roleMiddleware(['syndic']), async (req, res, next) => {
  try {
    const apartment = await Apartment.findByIdAndUpdate(
      req.params.apartmentId,
      { resident: null, status: 'vacant' },
      { new: true }
    );
    if (!apartment) throw new NotFoundError('Apartment not found');
    res.json({ success: true, message: 'Resident removed', data: apartment });
  } catch (error) {
    next(error);
  }
});

// ─── GET /:apartmentId — get one apartment by ID ──────────────────────────
router.get('/:apartmentId', authMiddleware, async (req, res, next) => {
  try {
    const apartment = await Apartment.findById(req.params.apartmentId)
      .populate('resident', 'name email phone')
      .populate('building', 'name address');
    if (!apartment) throw new NotFoundError('Apartment not found');
    res.json({ success: true, message: 'Apartment retrieved', data: apartment });
  } catch (error) {
    next(error);
  }
});

// ─── PUT /:apartmentId — update apartment details (syndic only) ─────────────
router.put('/:apartmentId', authMiddleware, roleMiddleware(['syndic']), async (req, res, next) => {
  try {
    const apartment = await Apartment.findByIdAndUpdate(
      req.params.apartmentId,
      req.body,
      { new: true, runValidators: true }
    );
    if (!apartment) throw new NotFoundError('Apartment not found');
    res.json({ success: true, message: 'Apartment updated', data: apartment });
  } catch (error) {
    next(error);
  }
});

// ─── DELETE /:apartmentId — delete an apartment (syndic only) ───────────────
router.delete('/:apartmentId', authMiddleware, roleMiddleware(['syndic']), async (req, res, next) => {
  try {
    const apartment = await Apartment.findByIdAndDelete(req.params.apartmentId);
    if (!apartment) throw new NotFoundError('Apartment not found');
    res.json({ success: true, message: 'Apartment deleted', data: null });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
