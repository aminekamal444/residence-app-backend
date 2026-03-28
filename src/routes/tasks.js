const express = require('express');
const { param, body, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');

const taskController = require('../controllers/taskController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

const router = express.Router();

// ============ RATE LIMITING ============
const taskLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many task requests'
});

// ============ VALIDATION ============
const validateTaskId = param('taskId')
  .isMongoId()
  .withMessage('Invalid task ID format');

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

// ============ CREATE ============
router.post(
  '/',
  authMiddleware,
  roleMiddleware(['syndic']),
  taskLimiter,
  taskController.createTask
);

// ============ SPECIFIC PATHS (BEFORE DYNAMIC!) ============
router.get(
  '/gardien/my-tasks',
  authMiddleware,
  roleMiddleware(['gardien']),
  taskLimiter,
  taskController.getGardienTasks
);

// ============ DYNAMIC WITH SUBPATHS ============
router.post(
  '/:taskId/assign',
  authMiddleware,
  roleMiddleware(['syndic']),
  taskLimiter,
  validateTaskId,
  handleValidationErrors,
  taskController.assignTask
);

router.put(
  '/:taskId/status',
  authMiddleware,
  taskLimiter,
  validateTaskId,
  handleValidationErrors,
  taskController.updateTaskStatus
);

router.post(
  '/:taskId/submit',
  authMiddleware,
  roleMiddleware(['gardien']),
  taskLimiter,
  validateTaskId,
  handleValidationErrors,
  taskController.submitTask
);

router.post(
  '/:taskId/approve',
  authMiddleware,
  roleMiddleware(['syndic']),
  taskLimiter,
  validateTaskId,
  handleValidationErrors,
  taskController.approveTask
);

router.post(
  '/:taskId/reject',
  authMiddleware,
  roleMiddleware(['syndic']),
  taskLimiter,
  validateTaskId,
  handleValidationErrors,
  taskController.rejectTask
);

// ============ BARE DYNAMIC (LAST!) ============
router.get(
  '/:taskId',
  authMiddleware,
  taskLimiter,
  validateTaskId,
  handleValidationErrors,
  taskController.getTaskById
);

router.get(
  '/',
  authMiddleware,
  taskLimiter,
  taskController.getAllTasks
);

module.exports = router;