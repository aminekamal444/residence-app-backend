const winston = require('winston');
const path = require('path');
const config = require('../config/environment');

const logger = winston.createLogger({
  level: config.logLevel,
  
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),

  transports: [
    // Error logs
    new winston.transports.File({
      filename: path.join(__dirname, '../../logs/error.log'),
      level: 'error'
    }),

    // All logs
    new winston.transports.File({
      filename: path.join(__dirname, '../../logs/combined.log')
    })
  ]
});

// Console in development
if (config.nodeEnv !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));
}

module.exports = logger;