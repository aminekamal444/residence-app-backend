const express = require('express');
const router = express.Router();

const Budget = require('../models/Budget');
const Building = require('../models/Building');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const { ValidationError, NotFoundError, UnauthorizedError } = require('../utils/errors');

// ─── GET / — get all budgets (filtered by building, category, year…) ──────
router.get('/', authMiddleware, async (req, res, next) => {
  try {
    const { building, category, status, year } = req.query;
    const query = {};
    if (building) query.building = building;
    if (category) query.category = category;
    if (status) query.status = status;
    if (year) query.year = year;

    const budgets = await Budget.find(query)
      .populate('createdBy', 'name email')
      .populate('approvedBy', 'name email')
      .populate('building', 'name')
      .sort({ year: -1, month: -1 });

    res.json({ success: true, message: 'Budgets retrieved', data: budgets });
  } catch (error) {
    next(error);
  }
});

// ─── POST / — create a budget (syndic only) ───────────────────────────────
router.post('/', authMiddleware, roleMiddleware(['syndic']), async (req, res, next) => {
  try {
    const { building, category, period, year, month, budgetedAmount, description } = req.body;
    if (!building || !category || !period || !year || !budgetedAmount) {
      throw new ValidationError('building, category, period, year and budgetedAmount are required');
    }

    const buildingExists = await Building.findById(building);
    if (!buildingExists) throw new ValidationError('Building not found');

    const budget = new Budget({
      building, category, period, year,
      month: period === 'monthly' ? month : null,
      budgetedAmount, description,
      createdBy: req.user._id,
      status: 'draft'
    });
    await budget.save();
    await budget.populate('createdBy', 'name email');
    await budget.populate('building', 'name');

    res.status(201).json({ success: true, message: 'Budget created', data: budget });
  } catch (error) {
    next(error);
  }
});

// ─── GET /period/all — get budgets for a specific period ──────────────────
router.get('/period/all', authMiddleware, async (req, res, next) => {
  try {
    const { building, period, year } = req.query;
    if (!building || !period || !year) throw new ValidationError('building, period and year are required');

    const budgets = await Budget.find({ building, period, year })
      .populate('createdBy', 'name email')
      .populate('building', 'name')
      .sort({ month: 1 });

    res.json({ success: true, message: 'Budgets for period retrieved', data: budgets });
  } catch (error) {
    next(error);
  }
});

// ─── GET /summary/overview — yearly budget summary ────────────────────────
router.get('/summary/overview', authMiddleware, async (req, res, next) => {
  try {
    const { building, year } = req.query;
    if (!building || !year) throw new ValidationError('building and year are required');

    const budgets = await Budget.find({ building, year, status: { $in: ['approved', 'active', 'completed'] } });

    let totalBudgeted = 0, totalActual = 0;
    const byCategory = {};

    budgets.forEach(b => {
      totalBudgeted += b.budgetedAmount;
      totalActual += b.actualAmount;
      if (!byCategory[b.category]) byCategory[b.category] = { budgeted: 0, actual: 0, variance: 0 };
      byCategory[b.category].budgeted += b.budgetedAmount;
      byCategory[b.category].actual += b.actualAmount;
      byCategory[b.category].variance = byCategory[b.category].budgeted - byCategory[b.category].actual;
    });

    res.json({ success: true, message: 'Budget summary retrieved', data: { year, totalBudgeted, totalActual, totalVariance: totalBudgeted - totalActual, byCategory } });
  } catch (error) {
    next(error);
  }
});

// ─── GET /:budgetId — get one budget by ID ────────────────────────────────
router.get('/:budgetId', authMiddleware, async (req, res, next) => {
  try {
    const budget = await Budget.findById(req.params.budgetId)
      .populate('createdBy', 'name email')
      .populate('approvedBy', 'name email')
      .populate('building', 'name');
    if (!budget) throw new NotFoundError('Budget not found');
    res.json({ success: true, message: 'Budget retrieved', data: budget });
  } catch (error) {
    next(error);
  }
});

// ─── PUT /:budgetId — update a budget (only creator can edit draft budgets) ─
router.put('/:budgetId', authMiddleware, roleMiddleware(['syndic']), async (req, res, next) => {
  try {
    const budget = await Budget.findById(req.params.budgetId);
    if (!budget) throw new NotFoundError('Budget not found');
    if (budget.status !== 'draft') throw new ValidationError('Only draft budgets can be edited');
    if (budget.createdBy.toString() !== req.user._id.toString()) throw new UnauthorizedError('You can only edit your own budgets');

    const { budgetedAmount, description, category } = req.body;
    if (budgetedAmount) budget.budgetedAmount = budgetedAmount;
    if (description) budget.description = description;
    if (category) budget.category = category;
    await budget.save();

    res.json({ success: true, message: 'Budget updated', data: budget });
  } catch (error) {
    next(error);
  }
});

// ─── DELETE /:budgetId — delete a budget (only creator can delete) ─────────
router.delete('/:budgetId', authMiddleware, roleMiddleware(['syndic']), async (req, res, next) => {
  try {
    const budget = await Budget.findById(req.params.budgetId);
    if (!budget) throw new NotFoundError('Budget not found');
    if (budget.createdBy.toString() !== req.user._id.toString()) throw new UnauthorizedError('You can only delete your own budgets');

    budget.deletedAt = new Date();
    await budget.save();

    res.json({ success: true, message: 'Budget deleted', data: null });
  } catch (error) {
    next(error);
  }
});

// ─── POST /:budgetId/approve — approve a budget (syndic only) ─────────────
router.post('/:budgetId/approve', authMiddleware, roleMiddleware(['syndic']), async (req, res, next) => {
  try {
    const budget = await Budget.findById(req.params.budgetId);
    if (!budget) throw new NotFoundError('Budget not found');
    if (budget.status !== 'draft') throw new ValidationError('Only draft budgets can be approved');

    budget.status = 'approved';
    budget.approvedBy = req.user._id;
    budget.approvalDate = new Date();
    await budget.save();
    await budget.populate('approvedBy', 'name email');

    res.json({ success: true, message: 'Budget approved', data: budget });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
