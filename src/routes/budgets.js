const express = require('express');
const { param, body, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');

const budgetController = require('../controllers/budgetController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

const router = express.Router();

// Rate limiting
const budgetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many budget requests'
});

// Validation
const validateBudgetId = param('budgetId')
  .isMongoId()
  .withMessage('Invalid budget ID format');

const validateCreateBudget = [
  body('building')
    .notEmpty()
    .withMessage('Building is required'),
  body('category')
    .isIn(['electricity', 'water', 'maintenance', 'cleaning', 'security', 'insurance', 'other'])
    .withMessage('Invalid category'),
  body('period')
    .isIn(['monthly', 'quarterly', 'yearly'])
    .withMessage('Invalid period'),
  body('year')
    .isInt({ min: 2000, max: 2100 })
    .withMessage('Invalid year'),
  body('budgetedAmount')
    .isFloat({ min: 0 })
    .withMessage('Budget amount must be positive')
];

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      statusCode: 400,
      success: false,
      message: 'Validation error',
      errors: errors.array()
    });
  }
  next();
};

// ============ ROUTES ============

// POST - Create
router.post(
  '/',
  authMiddleware,
  roleMiddleware(['syndic']),
  budgetLimiter,
  validateCreateBudget,
  handleValidationErrors,
  budgetController.createBudget
);

// GET - Specific paths FIRST
router.get(
  '/period/all',
  authMiddleware,
  budgetLimiter,
  budgetController.getBudgetsForPeriod
);

router.get(
  '/summary/overview',
  authMiddleware,
  budgetLimiter,
  budgetController.getBudgetSummary
);

// GET - All
router.get(
  '/',
  authMiddleware,
  budgetLimiter,
  budgetController.getAllBudgets
);

// GET - By ID
router.get(
  '/:budgetId',
  authMiddleware,
  budgetLimiter,
  validateBudgetId,
  handleValidationErrors,
  budgetController.getBudgetById
);

// PUT - Update
router.put(
  '/:budgetId',
  authMiddleware,
  roleMiddleware(['syndic']),
  budgetLimiter,
  validateBudgetId,
  handleValidationErrors,
  budgetController.updateBudget
);

// DELETE - Delete
router.delete(
  '/:budgetId',
  authMiddleware,
  roleMiddleware(['syndic']),
  budgetLimiter,
  validateBudgetId,
  handleValidationErrors,
  budgetController.deleteBudget
);

// POST - Approve
router.post(
  '/:budgetId/approve',
  authMiddleware,
  roleMiddleware(['syndic']),
  budgetLimiter,
  validateBudgetId,
  handleValidationErrors,
  budgetController.approveBudget
);

module.exports = router;