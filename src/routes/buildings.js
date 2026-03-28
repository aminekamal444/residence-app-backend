const express = require('express');
const router = express.Router();

const Building = require('../models/Building');
const User = require('../models/User');
const Apartment = require('../models/Apartment');
const Complaint = require('../models/Complaint');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const { ValidationError, NotFoundError, ConflictError } = require('../utils/errors');

// ─── GET /my — get the building that belongs to the logged-in user ─────────
router.get('/my', authMiddleware, async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).lean();
    if (!user?.building) throw new NotFoundError('No building assigned to this user');

    const building = await Building.findById(user.building)
      .populate('managedBy', 'name email phone')
      .populate('caretaker', 'name email phone');
    if (!building) throw new NotFoundError('Building not found');

    res.json({ success: true, message: 'Building retrieved', data: building });
  } catch (error) {
    next(error);
  }
});

// ─── GET / — list all buildings ───────────────────────────────────────────
router.get('/', authMiddleware, async (req, res, next) => {
  try {
    const { city, country, page = 1, limit = 20 } = req.query;
    const query = {};
    if (city) query.city = new RegExp(city, 'i');
    if (country) query.country = new RegExp(country, 'i');

    const [buildings, total] = await Promise.all([
      Building.find(query)
        .populate('managedBy', 'name email phone')
        .populate('caretaker', 'name email phone')
        .skip((page - 1) * limit).limit(Number(limit))
        .sort({ createdAt: -1 }),
      Building.countDocuments(query)
    ]);

    res.json({ success: true, message: 'Buildings retrieved', data: { buildings, total, pages: Math.ceil(total / limit) } });
  } catch (error) {
    next(error);
  }
});

// ─── POST / — create a new building (syndic only) ─────────────────────────
router.post('/', authMiddleware, roleMiddleware(['syndic']), async (req, res, next) => {
  try {
    const { name, address, city, postalCode, country, totalApartments, description, amenities } = req.body;
    if (!name || !address || !city || !totalApartments) {
      throw new ValidationError('name, address, city and totalApartments are required');
    }

    const existing = await Building.findOne({ name, address });
    if (existing) throw new ConflictError('A building with this name and address already exists');

    const building = new Building({
      name, address, city, postalCode,
      country: country || 'Morocco',
      totalApartments, description: description || '',
      amenities: amenities || [],
      managedBy: req.user._id
    });
    await building.save();

    // Link syndic to this building
    await User.findByIdAndUpdate(req.user._id, { building: building._id });

    res.status(201).json({ success: true, message: 'Building created', data: building });
  } catch (error) {
    next(error);
  }
});

// ─── GET /:buildingId/stats — get stats for a building ────────────────────
router.get('/:buildingId/stats', authMiddleware, async (req, res, next) => {
  try {
    const buildingId = req.params.buildingId || req.user.building;
    const building = await Building.findById(buildingId);
    if (!building) throw new NotFoundError('Building not found');

    const [totalResidents, activeResidents, totalApartments, occupiedApartments, vacantApartments, openComplaints, totalStaff] = await Promise.all([
      User.countDocuments({ building: buildingId, role: 'resident' }),
      User.countDocuments({ building: buildingId, role: 'resident', status: 'active' }),
      Apartment.countDocuments({ building: buildingId }),
      Apartment.countDocuments({ building: buildingId, status: 'occupied' }),
      Apartment.countDocuments({ building: buildingId, status: 'vacant' }),
      Complaint.countDocuments({ building: buildingId, status: { $in: ['open', 'in_progress', 'pending'] } }),
      User.countDocuments({ building: buildingId, role: 'gardien', status: 'active' })
    ]);

    const occupancyRate = totalApartments > 0 ? Math.round((occupiedApartments / totalApartments) * 100) : 0;

    res.json({
      success: true,
      message: 'Building stats retrieved',
      data: {
        building: { id: building._id, name: building.name, address: building.address, city: building.city },
        residents: { total: totalResidents, active: activeResidents },
        apartments: { total: totalApartments, occupied: occupiedApartments, vacant: vacantApartments, occupancyRate: `${occupancyRate}%` },
        staff: { total: totalStaff },
        complaints: { open: openComplaints }
      }
    });
  } catch (error) {
    next(error);
  }
});

// ─── POST /:buildingId/assign-caretaker — assign a gardien (syndic only) ───
router.post('/:buildingId/assign-caretaker', authMiddleware, roleMiddleware(['syndic']), async (req, res, next) => {
  try {
    const { caretakerId } = req.body;
    if (!caretakerId) throw new ValidationError('caretakerId is required');

    const [building, caretaker] = await Promise.all([
      Building.findById(req.params.buildingId),
      User.findById(caretakerId)
    ]);

    if (!building) throw new NotFoundError('Building not found');
    if (!caretaker) throw new NotFoundError('Caretaker not found');
    if (caretaker.role !== 'gardien') throw new ValidationError('User must have the gardien role');

    const [updated] = await Promise.all([
      Building.findByIdAndUpdate(req.params.buildingId, { caretaker: caretakerId }, { new: true })
        .populate('managedBy', 'name email').populate('caretaker', 'name email'),
      User.findByIdAndUpdate(caretakerId, { building: req.params.buildingId })
    ]);

    res.json({ success: true, message: 'Caretaker assigned', data: updated });
  } catch (error) {
    next(error);
  }
});

// ─── GET /:buildingId — get one building by ID ────────────────────────────
router.get('/:buildingId', authMiddleware, async (req, res, next) => {
  try {
    const building = await Building.findById(req.params.buildingId)
      .populate('managedBy', 'name email phone')
      .populate('caretaker', 'name email phone');
    if (!building) throw new NotFoundError('Building not found');
    res.json({ success: true, message: 'Building retrieved', data: building });
  } catch (error) {
    next(error);
  }
});

// ─── PUT /:buildingId — update building details (syndic only) ─────────────
router.put('/:buildingId', authMiddleware, roleMiddleware(['syndic']), async (req, res, next) => {
  try {
    const allowed = ['name', 'address', 'city', 'postalCode', 'country', 'totalApartments', 'description', 'amenities'];
    const updates = {};
    allowed.forEach(field => { if (req.body[field] !== undefined) updates[field] = req.body[field]; });

    const building = await Building.findByIdAndUpdate(req.params.buildingId, updates, { new: true, runValidators: true })
      .populate('managedBy', 'name email').populate('caretaker', 'name email');
    if (!building) throw new NotFoundError('Building not found');
    res.json({ success: true, message: 'Building updated', data: building });
  } catch (error) {
    next(error);
  }
});

// ─── DELETE /:buildingId — delete a building (syndic only) ────────────────
router.delete('/:buildingId', authMiddleware, roleMiddleware(['syndic']), async (req, res, next) => {
  try {
    const building = await Building.findById(req.params.buildingId);
    if (!building) throw new NotFoundError('Building not found');

    const activeResidents = await User.countDocuments({ building: req.params.buildingId, status: 'active' });
    if (activeResidents > 0) throw new ValidationError(`Cannot delete building with ${activeResidents} active residents`);

    await Building.findByIdAndDelete(req.params.buildingId);
    res.json({ success: true, message: 'Building deleted', data: null });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
