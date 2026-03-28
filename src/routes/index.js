const express = require('express');
const router = express.Router();

// Import all route modules
const authRoutes = require('./auth');
const userRoutes = require('./users');
const apartmentRoutes = require('./apartments');
const chargeRoutes = require('./charges');
const paymentRoutes = require('./payments');
const taskRoutes = require('./tasks');
const photoRoutes = require('./photos');
const announcementRoutes = require('./announcements');
const voteRoutes = require('./votes');
const complaintRoutes = require('./complaints');
const reportRoutes = require('./reports');
const budgetRoutes = require('./budgets');
const buildingRoutes = require('./buildings');
const notificationRoutes = require('./notifications');

// Import middleware
const authMiddleware = require('../middleware/authMiddleware');

// ============ PUBLIC ROUTES (No authentication required) ============
router.use('/auth', authRoutes);

// ============ PROTECTED ROUTES (Authentication required) ============
// All routes below require JWT token
router.use(authMiddleware);

// User routes
router.use('/users', userRoutes);

// Apartment routes
router.use('/apartments', apartmentRoutes);

// Charge routes
router.use('/charges', chargeRoutes);

// Payment routes
router.use('/payments', paymentRoutes);

// Task routes
router.use('/tasks', taskRoutes);

// Photo routes
router.use('/photos', photoRoutes);

// Announcement routes
router.use('/announcements', announcementRoutes);

// Vote routes
router.use('/votes', voteRoutes);

// Complaint routes
router.use('/complaints', complaintRoutes);

// Report routes (Financial Dashboard)
router.use('/reports', reportRoutes);

// Budget routes
router.use('/budgets', budgetRoutes);

// Building routes
router.use('/buildings', buildingRoutes);

// Notification routes
router.use('/notifications', notificationRoutes);

module.exports = router;