const logger = require('../utils/logger');
const config = require('../config/environment');

const errorHandler = (err, req, res, next) => {
  try {
    // Default to 500 server error
    let statusCode = err.statusCode || 500;
    let message = err.message || 'Internal Server Error';

    logger.error({
      timestamp: new Date(),
      path: req.path,
      method: req.method,
      error: err.message,
      stack: err.stack,
      user: req.user?._id
    });

    // Mongoose validation error
    if (err.name === 'ValidationError' && err.errors) {
      const messages = Object.values(err.errors).map(val => val.message);
      statusCode = 400;
      message = messages.join(', ');
    }

    // Mongoose duplicate key error
    if (err.code === 11000) {
      const field = Object.keys(err.keyValue || {})[0];
      statusCode = 409;
      message = field ? `${field} already exists` : 'Duplicate entry';
    }

    // Mongoose cast error (invalid ID)
    if (err.name === 'CastError') {
      statusCode = 400;
      message = 'Invalid ID format';
    }

    // JWT errors
    if (err.name === 'JsonWebTokenError') {
      statusCode = 401;
      message = 'Invalid token';
    }

    if (err.name === 'TokenExpiredError') {
      statusCode = 401;
      message = 'Token expired';
    }

    // Send response
    const errorResponse = {
      statusCode,
      data: null,
      message,
      success: false,
      ...(config.nodeEnv === 'development' && { stack: err.stack })
    };

    return res.status(statusCode).json(errorResponse);

  } catch (handlerError) {
    logger.error('Error handler crashed:', handlerError);
    return res.status(500).json({
      statusCode: 500,
      data: null,
      message: 'Internal Server Error',
      success: false
    });
  }
};

module.exports = errorHandler;
