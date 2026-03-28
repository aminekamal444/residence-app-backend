const express = require('express');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');

const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

// ============ RATE LIMITING ============
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 5,                      // 5 requests per window
  message: 'Too many auth attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => process.env.NODE_ENV === 'test'  // Skip in testing
});

// ============ VALIDATION MIDDLEWARE ============

// Validate Register
const validateRegister = [
  body('email')
    .isEmail()
    .withMessage('Invalid email format')
    .normalizeEmail()
    .toLowerCase(),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters'),
  body('passwordConfirm')
    .custom((value, { req }) => value === req.body.password)
    .withMessage('Passwords do not match'),
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ min: 2 })
    .withMessage('Name must be at least 2 characters'),
  body('role')
    .isIn(['resident', 'syndic', 'gardien'])
    .withMessage('Invalid role')
];

// Validate Login (ONLY email and password)
const validateLogin = [
  body('email')
    .isEmail()
    .withMessage('Invalid email format')
    .normalizeEmail()
    .toLowerCase(),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

// Validate Refresh Token
const validateRefreshToken = [
  body('refreshToken')
    .notEmpty()
    .withMessage('Refresh token is required')
];

// Validate Change Password
const validateChangePassword = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('New password must be at least 8 characters'),
  body('passwordConfirm')
    .custom((value, { req }) => value === req.body.newPassword)
    .withMessage('Passwords do not match')
];

// Validation error handler
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      statusCode: 400,
      success: false,
      message: req.t ? req.t('errors.validation_error') : 'Validation error',
      errors: errors.array().map(err => ({
        field: err.param,
        message: err.msg
      }))
    });
  }
  next();
};

// ============ PUBLIC ROUTES (No authentication required) ============

/**
 * POST /api/v1/auth/register
 * @description Register a new user
 * @public
 * @body {
 *   email: string (required, valid email),
 *   password: string (required, min 8 chars),
 *   passwordConfirm: string (required, must match password),
 *   name: string (required, min 2 chars),
 *   phone: string (optional),
 *   role: string (required, one of: resident, syndic, gardien),
 *   building: string (optional, ObjectId)
 * }
 * @returns {
 *   statusCode: 201,
 *   success: true,
 *   message: string,
 *   data: { user, accessToken, refreshToken }
 * }
 */
router.post(
  '/register',
  authLimiter,
  validateRegister,
  handleValidationErrors,
  authController.register
);

/**
 * POST /api/v1/auth/login
 * @description Login user with email and password
 * @public
 * @body {
 *   email: string (required, valid email),
 *   password: string (required),
 *   deviceToken: string (optional, for push notifications),
 *   platform: string (optional, one of: ios, android, web)
 * }
 * @returns {
 *   statusCode: 200,
 *   success: true,
 *   message: string,
 *   data: { user, accessToken, refreshToken }
 * }
 */
router.post(
  '/login',
  authLimiter,
  validateLogin,
  handleValidationErrors,
  authController.login
);

/**
 * POST /api/v1/auth/refresh-token
 * @description Refresh access token using refresh token
 * @public
 * @body { refreshToken: string (required) }
 * @returns {
 *   statusCode: 200,
 *   success: true,
 *   message: string,
 *   data: { accessToken, refreshToken }
 * }
 */
router.post(
  '/refresh-token',
  validateRefreshToken,
  handleValidationErrors,
  authController.refreshToken
);

// ============ PROTECTED ROUTES (Require Authentication) ============

/**
 * POST /api/v1/auth/change-password
 * @description Change user password (requires authentication)
 * @protected
 * @auth Required (Bearer token in Authorization header)
 * @body {
 *   currentPassword: string (required),
 *   newPassword: string (required, min 8 chars),
 *   passwordConfirm: string (required, must match newPassword)
 * }
 * @returns {
 *   statusCode: 200,
 *   success: true,
 *   message: string,
 *   data: null
 * }
 */
router.post(
  '/change-password',
  authMiddleware,
  validateChangePassword,
  handleValidationErrors,
  authController.changePassword
);

/**
 * GET /api/v1/auth/me
 * @description Get current authenticated user's information
 * @protected
 * @auth Required (Bearer token in Authorization header)
 * @returns {
 *   statusCode: 200,
 *   success: true,
 *   message: string,
 *   data: { user }
 * }
 */
router.get(
  '/me',
  authMiddleware,
  authController.getCurrentUser
);

/**
 * POST /api/v1/auth/logout
 * @description Logout user and optionally remove device token
 * @protected
 * @auth Required (Bearer token in Authorization header)
 * @body { deviceToken: string (optional) }
 * @returns {
 *   statusCode: 200,
 *   success: true,
 *   message: string,
 *   data: null
 * }
 */
router.post(
  '/logout',
  authMiddleware,
  authController.logout
);

module.exports = router;