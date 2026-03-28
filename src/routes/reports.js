const express = require('express');
const router = express.Router();

const Payment = require('../models/Payment');
const Charge = require('../models/Charge');
const Budget = require('../models/Budget');
const Apartment = require('../models/Apartment');
const FinancialReport = require('../models/FinancialReport');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const { ValidationError } = require('../utils/errors');

// All report routes are syndic-only
router.use(authMiddleware, roleMiddleware(['syndic']));

// ─── GET /dashboard — financial overview for this month ───────────────────
router.get('/dashboard', async (req, res, next) => {
  try {
    const building = req.user.building;
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth() + 1;

    const report = await FinancialReport.findOne({ building, year, month, period: 'monthly' });
    const budgets = await Budget.find({ building, year, month });
    const overdueCharges = await Charge.find({ building, status: 'overdue' });

    // Build simple alerts list
    const alerts = [];
    if (overdueCharges.length > 0) {
      alerts.push({ type: 'overdue_payments', severity: 'high', message: `${overdueCharges.length} charges are overdue` });
    }
    budgets.forEach(b => {
      if (b.status === 'exceeded') alerts.push({ type: 'budget_exceeded', severity: 'high', message: `${b.category} budget exceeded` });
    });

    res.json({
      success: true,
      message: 'Dashboard retrieved',
      data: {
        currentMonth: {
          revenue: report?.totalRevenue || 0,
          expenses: report?.totalExpenses || 0,
          pendingCharges: report?.apartmentStatus?.pending || 0,
          overdueCharges: report?.apartmentStatus?.overdue || 0
        },
        budgets: budgets.map(b => ({ category: b.category, budgeted: b.budgetedAmount, spent: b.actualAmount, status: b.status })),
        alerts
      }
    });
  } catch (error) {
    next(error);
  }
});

// ─── POST /monthly — generate a monthly financial report ──────────────────
router.post('/monthly', async (req, res, next) => {
  try {
    const { year, month } = req.body;
    if (!year || !month) throw new ValidationError('year and month are required');

    const building = req.user.building;
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    // Get all completed payments this month
    const payments = await Payment.find({ building, paidDate: { $gte: startDate, $lte: endDate }, status: 'completed' });
    const totalRevenue = payments.reduce((sum, p) => sum + p.amount, 0);

    // Group revenue by category
    const revenueByCategory = { maintenance: 0, utilities: 0, security: 0, parking: 0, other: 0 };
    payments.forEach(p => { if (revenueByCategory[p.category] !== undefined) revenueByCategory[p.category] += p.amount; });

    // Get charge counts
    const charges = await Charge.find({ building, createdAt: { $gte: startDate, $lte: endDate } });
    const paidCharges = charges.filter(c => c.status === 'paid').length;
    const pendingCharges = charges.filter(c => c.status === 'pending').length;
    const overdueCharges = charges.filter(c => c.status === 'overdue').length;

    // Previous month comparison
    const prevStart = new Date(year, month - 2, 1);
    const prevEnd = new Date(year, month - 1, 0);
    const prevPayments = await Payment.find({ building, paidDate: { $gte: prevStart, $lte: prevEnd }, status: 'completed' });
    const previousRevenue = prevPayments.reduce((sum, p) => sum + p.amount, 0);

    const report = new FinancialReport({
      building, period: 'monthly', year, month,
      totalRevenue, revenueByCategory,
      totalCharges: charges.length,
      apartmentStatus: { paid: paidCharges, pending: pendingCharges, overdue: overdueCharges },
      previousPeriodRevenue: previousRevenue,
      generatedBy: req.user._id,
      status: 'finalized'
    });
    await report.save();

    res.status(201).json({ success: true, message: 'Monthly report generated', data: report });
  } catch (error) {
    next(error);
  }
});

// ─── GET /revenue/category — total revenue grouped by category ────────────
router.get('/revenue/category', async (req, res, next) => {
  try {
    const { month, year } = req.query;
    if (!month || !year) throw new ValidationError('month and year are required');

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    const payments = await Payment.find({ building: req.user.building, paidDate: { $gte: startDate, $lte: endDate }, status: 'completed' });
    const revenue = { maintenance: 0, utilities: 0, security: 0, parking: 0, other: 0 };
    payments.forEach(p => { if (revenue[p.category] !== undefined) revenue[p.category] += p.amount; });

    res.json({ success: true, message: 'Revenue by category retrieved', data: revenue });
  } catch (error) {
    next(error);
  }
});

// ─── GET /revenue/trend — monthly revenue for each month of a year ─────────
router.get('/revenue/trend', async (req, res, next) => {
  try {
    const { year } = req.query;
    if (!year) throw new ValidationError('year is required');

    const trend = [];
    for (let m = 1; m <= 12; m++) {
      const startDate = new Date(year, m - 1, 1);
      const endDate = new Date(year, m, 0);
      const result = await Payment.aggregate([
        { $match: { building: req.user.building, paidDate: { $gte: startDate, $lte: endDate }, status: 'completed' } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]);
      trend.push({ month: `${year}-${String(m).padStart(2, '0')}`, revenue: result[0]?.total || 0 });
    }

    res.json({ success: true, message: 'Revenue trend retrieved', data: trend });
  } catch (error) {
    next(error);
  }
});

// ─── GET /apartments/payment-status — payment status for every apartment ───
router.get('/apartments/payment-status', async (req, res, next) => {
  try {
    const apartments = await Apartment.find({ building: req.user.building }).populate('resident', 'name email phone');
    const status = await Promise.all(apartments.map(async apt => {
      const latestCharge = await Charge.findOne({ apartment: apt._id }).sort({ dueDate: -1 });
      return {
        apartment: apt.number,
        resident: apt.resident?.name || 'Vacant',
        status: latestCharge?.status || 'no_charges',
        dueDate: latestCharge?.dueDate,
        amount: latestCharge?.amount
      };
    }));

    res.json({ success: true, message: 'Apartment payment status retrieved', data: status });
  } catch (error) {
    next(error);
  }
});

// ─── GET /yearly/comparison — compare this year vs last year ──────────────
router.get('/yearly/comparison', async (req, res, next) => {
  try {
    const { year } = req.query;
    if (!year) throw new ValidationError('year is required');

    const currentYear = parseInt(year);
    const previousYear = currentYear - 1;
    const building = req.user.building;

    const [current, previous] = await Promise.all([
      Payment.aggregate([
        { $match: { building, paidDate: { $gte: new Date(currentYear, 0, 1), $lte: new Date(currentYear, 11, 31) }, status: 'completed' } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),
      Payment.aggregate([
        { $match: { building, paidDate: { $gte: new Date(previousYear, 0, 1), $lte: new Date(previousYear, 11, 31) }, status: 'completed' } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ])
    ]);

    const curr = current[0]?.total || 0;
    const prev = previous[0]?.total || 0;
    const variance = curr - prev;
    const variancePercentage = prev > 0 ? ((variance / prev) * 100).toFixed(2) : 0;

    res.json({ success: true, message: 'Yearly comparison retrieved', data: { currentYear: { year: currentYear, revenue: curr }, previousYear: { year: previousYear, revenue: prev }, variance, variancePercentage } });
  } catch (error) {
    next(error);
  }
});

// ─── GET /cashflow/analysis — inflows vs outflows for a month ─────────────
router.get('/cashflow/analysis', async (req, res, next) => {
  try {
    const { month, year } = req.query;
    if (!month || !year) throw new ValidationError('month and year are required');

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    const result = await Payment.aggregate([
      { $match: { building: req.user.building, paidDate: { $gte: startDate, $lte: endDate }, status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    const inflows = result[0]?.total || 0;
    res.json({ success: true, message: 'Cash flow retrieved', data: { period: `${month}/${year}`, inflows, outflows: 0, netCashFlow: inflows } });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
