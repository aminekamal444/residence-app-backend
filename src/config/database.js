const mongoose = require('mongoose');
const config = require('./environment');
const logger = require('../utils/logger');

class Database {
  async connect() {
    try {
      logger.info('🔄 Connecting to MongoDB...');
      
      await mongoose.connect(config.mongoUri, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        maxPoolSize: config.mongoPoolSize
      });

      logger.info('✅ MongoDB connected successfully');
      
      // Setup connection event listeners
      this.setupEventListeners();
      
      return mongoose.connection;

    } catch (error) {
      logger.error('❌ MongoDB connection failed:', error.message);
      
      // Retry logic
      if (config.nodeEnv === 'development') {
        process.exit(1);
      } else {
        logger.error('Retrying connection in 5 seconds...');
        await new Promise(resolve => setTimeout(resolve, 5000));
        return this.connect();
      }
    }
  }

  setupEventListeners() {
    const conn = mongoose.connection;

    conn.on('connected', () => {
      logger.info('✅ MongoDB connected');
    });

    conn.on('error', (err) => {
      logger.error('❌ MongoDB error:', err);
    });

    conn.on('disconnected', () => {
      logger.warn('⚠️ MongoDB disconnected');
    });

    conn.on('reconnected', () => {
      logger.info('✅ MongoDB reconnected');
    });
  }

  async disconnect() {
    try {
      await mongoose.disconnect();
      logger.info('✅ MongoDB disconnected');
    } catch (error) {
      logger.error('Error disconnecting from MongoDB:', error);
      throw error;
    }
  }
}

module.exports = new Database();