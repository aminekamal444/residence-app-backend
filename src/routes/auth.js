const express = require('express');
const bcrypt = require('bcrypt');
const rateLimit = require('express-rate-limit');

const User = require('../models/User');
const authMiddleware = require('../middleware/authMiddleware');
const { generateTokens, verifyRefreshToken } = require('../utils/tokenUtils');
const { ValidationError, UnauthorizedError, ConflictError } = require('../utils/errors');

const router = express.Router();

// Rate limiter — max 5 auth attempts per 15 minutes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Too many auth attempts, please try again later',
  skip: () => process.env.NODE_ENV === 'test'
});

// Track failed login attempts in memory
const loginAttempts = {};

// ─── POST /auth/register ───────────────────────────────────────────────────
// Create a new user account (resident, syndic, or gardien)
router.post('/register', authLimiter, async (req, res, next) => {
  try {
    let { name, email, password, passwordConfirm, role, building, phone } = req.body;

    email = email?.trim().toLowerCase();
    name = name?.trim();

    if (!name || !email || !password || !passwordConfirm || !role) {
      throw new ValidationError('name, email, password, passwordConfirm and role are required');
    }

    if (password !== passwordConfirm) {
      throw new ValidationError('Passwords do not match');
    }

    if (!['resident', 'syndic', 'gardien'].includes(role)) {
      throw new ValidationError('Role must be: resident, syndic, or gardien');
    }

    const existing = await User.findOne({ email });
    if (existing) throw new ConflictError('Email already registered');

    // Save plain password — User model pre-save hook hashes it automatically
    const user = new User({ name, email, password, role, building, phone, status: 'active' });
    await user.save();

    const tokens = generateTokens(user._id, user.role, building);

    res.status(201).json({ success: true, message: 'User registered successfully', data: { user: user.toJSON(), ...tokens } });
  } catch (error) {
    next(error);
  }
});

// ─── POST /auth/login ──────────────────────────────────────────────────────
// Login with email and password, returns access + refresh tokens
router.post('/login', authLimiter, async (req, res, next) => {
  try {
    let { email, password } = req.body;
    email = email?.trim().toLowerCase();

    if (!email || !password) throw new ValidationError('Email and password are required');

    // Block after 5 failed attempts
    if ((loginAttempts[email] || 0) >= 5) {
      throw new UnauthorizedError('Too many failed attempts. Try again later.');
    }

    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      loginAttempts[email] = (loginAttempts[email] || 0) + 1;
      throw new UnauthorizedError('Invalid email or password');
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      loginAttempts[email] = (loginAttempts[email] || 0) + 1;
      throw new UnauthorizedError('Invalid email or password');
    }

    if (user.status !== 'active') throw new UnauthorizedError('Account is not active');

    delete loginAttempts[email];
    user.lastLogin = new Date();
    await user.save();

    const tokens = generateTokens(user._id, user.role, user.building);

    res.json({ success: true, message: 'Login successful', data: { user: user.toJSON(), ...tokens } });
  } catch (error) {
    next(error);
  }
});

// ─── POST /auth/refresh-token ──────────────────────────────────────────────
// Get a new access token using a refresh token
router.post('/refresh-token', async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) throw new ValidationError('Refresh token is required');

    const decoded = verifyRefreshToken(refreshToken);
    const user = await User.findById(decoded.userId);
    if (!user) throw new UnauthorizedError('User not found');

    const tokens = generateTokens(user._id, user.role, user.building);
    res.json({ success: true, message: 'Token refreshed', data: tokens });
  } catch (error) {
    next(error);
  }
});

// ─── GET /auth/me ──────────────────────────────────────────────────────────
// Get the currently logged-in user's profile
router.get('/me', authMiddleware, async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select('-password -deviceTokens');
    if (!user) throw new UnauthorizedError('User not found');
    res.json({ success: true, message: 'User retrieved', data: user });
  } catch (error) {
    next(error);
  }
});

// ─── POST /auth/change-password ────────────────────────────────────────────
// Change the logged-in user's password
router.post('/change-password', authMiddleware, async (req, res, next) => {
  try {
    const { currentPassword, newPassword, passwordConfirm } = req.body;

    if (!currentPassword || !newPassword || !passwordConfirm) {
      throw new ValidationError('All fields are required');
    }
    if (newPassword !== passwordConfirm) throw new ValidationError('Passwords do not match');
    if (currentPassword === newPassword) throw new ValidationError('New password must be different');

    const user = await User.findById(req.user._id).select('+password');
    const isValid = await bcrypt.compare(currentPassword, user.password);
    if (!isValid) throw new UnauthorizedError('Current password is incorrect');

    // Set plain password — pre-save hook will hash it
    user.password = newPassword;
    await user.save();

    res.json({ success: true, message: 'Password changed successfully', data: null });
  } catch (error) {
    next(error);
  }
});

// ─── POST /auth/logout ─────────────────────────────────────────────────────
// Logout — client should discard their tokens
router.post('/logout', authMiddleware, async (req, res, next) => {
  try {
    res.json({ success: true, message: 'Logged out successfully', data: null });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
