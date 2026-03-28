const express = require('express');
const { param, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');

const complaintController = require('../controllers/complaintController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

const router = express.Router();

// ============ RATE LIMITING ============
const complaintLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many complaint requests'
});

// ============ VALIDATION ============
const validateComplaintId = param('complaintId')
  .isMongoId()
  .withMessage('Invalid complaint ID format');

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

// ============ GET ALL ============
router.get(
  '/',
  authMiddleware,
  complaintLimiter,
  complaintController.getAllComplaints
);

// ============ CREATE ============
router.post(
  '/',
  authMiddleware,
  complaintLimiter,
  complaintController.createComplaint
);

// ============ SPECIFIC PATHS (BEFORE DYNAMIC!) ============
router.get(
  '/resident/my-complaints',
  authMiddleware,
  roleMiddleware(['resident']),
  complaintLimiter,
  complaintController.getResidentComplaints
);

// ============ DYNAMIC WITH SUBPATHS ============
router.put(
  '/:complaintId/status',
  authMiddleware,
  roleMiddleware(['syndic']),
  complaintLimiter,
  validateComplaintId,
  handleValidationErrors,
  complaintController.updateComplaintStatus
);

router.post(
  '/:complaintId/response',
  authMiddleware,
  complaintLimiter,
  validateComplaintId,
  handleValidationErrors,
  complaintController.addResponse
);

router.post(
  '/:complaintId/rate',
  authMiddleware,
  roleMiddleware(['resident']),
  complaintLimiter,
  validateComplaintId,
  handleValidationErrors,
  complaintController.rateComplaint
);

// ============ BARE DYNAMIC (LAST!) ============
router.get(
  '/:complaintId',
  authMiddleware,
  complaintLimiter,
  validateComplaintId,
  handleValidationErrors,
  complaintController.getComplaintById
);

module.exports = router;