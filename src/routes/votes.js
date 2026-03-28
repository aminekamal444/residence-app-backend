const express = require('express');
const { param, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');

const voteController = require('../controllers/voteController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

const router = express.Router();

// ============ RATE LIMITING ============
const voteLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many vote requests'
});

// ============ VALIDATION ============
const validateVoteId = param('voteId')
  .isMongoId()
  .withMessage('Invalid vote ID format');

const validateOptionId = param('optionId')
  .isMongoId()
  .withMessage('Invalid option ID format');

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
  voteLimiter,
  voteController.getAllVotes
);

// ============ CREATE ============
router.post(
  '/',
  authMiddleware,
  roleMiddleware(['syndic']),
  voteLimiter,
  voteController.createVote
);

// ============ DYNAMIC WITH SUBPATHS ============
router.post(
  '/:voteId/vote/:optionId',
  authMiddleware,
  voteLimiter,
  validateVoteId,
  validateOptionId,
  handleValidationErrors,
  voteController.voteOnOption
);

router.get(
  '/:voteId/results',
  authMiddleware,
  voteLimiter,
  validateVoteId,
  handleValidationErrors,
  voteController.getVoteResults
);

router.post(
  '/:voteId/close',
  authMiddleware,
  roleMiddleware(['syndic']),
  voteLimiter,
  validateVoteId,
  handleValidationErrors,
  voteController.closeVote
);

// ============ BARE DYNAMIC (LAST!) ============
router.get(
  '/:voteId',
  authMiddleware,
  voteLimiter,
  validateVoteId,
  handleValidationErrors,
  voteController.getVoteById
);

module.exports = router;