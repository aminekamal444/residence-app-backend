const express = require('express');
const rateLimit = require('express-rate-limit');

const reportController = require('../controllers/reportController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

const router = express.Router();

// ============ RATE LIMITING ============
const reportLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many report requests'
});

// ============ ALL SPECIFIC PATHS (SYNDIC ONLY) ============
router.get(
  '/dashboard',
  authMiddleware,
  roleMiddleware(['syndic']),
  reportLimiter,
  reportController.getFinancialDashboard
);

router.post(
  '/monthly',
  authMiddleware,
  roleMiddleware(['syndic']),
  reportLimiter,
  reportController.generateMonthlyReport
);

router.get(
  '/revenue/category',
  authMiddleware,
  roleMiddleware(['syndic']),
  reportLimiter,
  reportController.getRevenueByCategory
);

router.get(
  '/revenue/trend',
  authMiddleware,
  roleMiddleware(['syndic']),
  reportLimiter,
  reportController.getMonthlyRevenueTrend
);

router.get(
  '/apartments/payment-status',
  authMiddleware,
  roleMiddleware(['syndic']),
  reportLimiter,
  reportController.getApartmentPaymentStatus
);

router.get(
  '/yearly/comparison',
  authMiddleware,
  roleMiddleware(['syndic']),
  reportLimiter,
  reportController.getYearlyComparison
);

router.get(
  '/cashflow/analysis',
  authMiddleware,
  roleMiddleware(['syndic']),
  reportLimiter,
  reportController.getCashFlowAnalysis
);

module.exports = router;