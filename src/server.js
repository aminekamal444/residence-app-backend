require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const rateLimit = require('express-rate-limit');

// Import config
const config = require('./config/environment');
const database = require('./config/database');

// Import middleware
const errorHandler = require('./middleware/errorHandler');
const languageMiddleware = require('./middleware/languageMiddleware');
const morganMiddleware = require('./middleware/morganLogger');
const logger = require('./utils/logger');

// ============ IMPORT ALL ROUTES ============
const authRoutes = require('./routes/auth');
const buildingRoutes = require('./routes/buildings');
const budgetRoutes = require('./routes/budgets');
const chargeRoutes = require('./routes/charges');
const paymentRoutes = require('./routes/payments');
const taskRoutes = require('./routes/tasks');
const photoRoutes = require('./routes/photos');
const apartmentRoutes = require('./routes/apartments');
const userRoutes = require('./routes/users');
const announcementRoutes = require('./routes/announcements');
const voteRoutes = require('./routes/votes');
const complaintRoutes = require('./routes/complaints');
const reportRoutes = require('./routes/reports');
const notificationRoutes = require('./routes/notifications');

// Initialize Express app
const app = express();

// ============ SECURITY MIDDLEWARE ============
// Helmet - Set security HTTP headers
app.use(helmet());

// Rate limiting - Prevent brute force
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 100,                   // limit each IP to 100 requests per windowMs
  message: 'Too many requests, please try again later'
});
app.use('/api/', limiter);

// CORS - Allow frontend requests
app.use(cors({
  origin: config.frontendUrl,
  credentials: true,
  optionsSuccessStatus: 200
}));

// ============ DATA PARSING MIDDLEWARE ============
// Parse JSON bodies
app.use(express.json({ limit: '16mb' }));

// Parse URL-encoded bodies
app.use(express.urlencoded({ limit: '16mb', extended: true }));

// Data sanitization - Remove $ and . from user data (prevent NoSQL injection)
app.use(mongoSanitize());

// ============ LOGGING MIDDLEWARE ============
app.use(morganMiddleware);

// ============ LANGUAGE MIDDLEWARE ============
app.use(languageMiddleware);

// ============ HEALTH CHECK ============
app.get('/api/v1/health', async (req, res) => {
  try {
    res.json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: config.nodeEnv,
      database: 'Connected',
      language: req.language || 'en',
      apiVersion: 'v1'
    });
  } catch (error) {
    res.status(503).json({
      status: 'ERROR',
      message: 'Service Unavailable',
      error: error.message
    });
  }
});

// ============ MOUNT ALL ROUTES ============
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/buildings', buildingRoutes);
app.use('/api/v1/budgets', budgetRoutes);
app.use('/api/v1/charges', chargeRoutes);
app.use('/api/v1/payments', paymentRoutes);
app.use('/api/v1/tasks', taskRoutes);
app.use('/api/v1/photos', photoRoutes);
app.use('/api/v1/apartments', apartmentRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/announcements', announcementRoutes);
app.use('/api/v1/votes', voteRoutes);
app.use('/api/v1/complaints', complaintRoutes);
app.use('/api/v1/reports', reportRoutes);
app.use('/api/v1/notifications', notificationRoutes);

// ============ 404 HANDLER ============
app.use((req, res) => {
  res.status(404).json({
    statusCode: 404,
    data: null,
    message: 'Route not found',
    success: false
  });
});

// ============ ERROR HANDLER (Must be last!) ============
app.use(errorHandler);

// ============ START SERVER (only when run directly, not when imported by tests) ============
if (require.main === module) {
  database.connect();

  const PORT = config.port;
  const server = app.listen(PORT, () => {
    logger.info(`✅ Server running on port ${PORT}`);
    logger.info(`📝 Environment: ${config.nodeEnv}`);
    logger.info(`🔗 Frontend URL: ${config.frontendUrl}`);
    logger.info(`🔗 Test it: http://localhost:${PORT}/api/v1/health`);
  });

  process.on('SIGTERM', () => {
    logger.info('SIGTERM received. Shutting down gracefully...');
    server.close(() => {
      logger.info('Server closed');
      database.disconnect();
      process.exit(0);
    });
  });
}

module.exports = app;