const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

// Required environment variables - MUST exist!
const requiredEnvVars = [
  'PORT',
  'NODE_ENV',
  'MONGODB_URI',
  'JWT_SECRET',
  'JWT_REFRESH_SECRET',
  'FRONTEND_URL'
];

// Validate all required vars exist
requiredEnvVars.forEach(envVar => {
  if (!process.env[envVar]) {
    throw new Error(`❌ CRITICAL: Environment variable ${envVar} is not set. Server cannot start.`);
  }
});

// Validate PORT is valid
const parsedPort = parseInt(process.env.PORT, 10);
if (isNaN(parsedPort) || parsedPort < 1 || parsedPort > 65535) {
  throw new Error(`❌ CRITICAL: Invalid PORT value "${process.env.PORT}". Must be between 1-65535`);
}

module.exports = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parsedPort,
  
  // Database
  mongoUri: process.env.MONGODB_URI,
  mongoPoolSize: parseInt(process.env.MONGODB_POOL_SIZE, 10) || 10,
  
  // JWT
  jwtSecret: process.env.JWT_SECRET,
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET,
  jwtExpiry: process.env.JWT_EXPIRY || '15m',
  jwtRefreshExpiry: process.env.JWT_REFRESH_EXPIRY || '7d',
  
  // Frontend
  frontendUrl: process.env.FRONTEND_URL,
  
  // Logging
  logLevel: process.env.LOG_LEVEL || 'info'
};