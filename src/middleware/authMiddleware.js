const User = require('../models/User');
const { verifyAccessToken } = require('../utils/tokenUtils');
const { UnauthorizedError } = require('../utils/errors');
const logger = require('../utils/logger');

const authMiddleware = async (req, res, next) => {
  try {
    // Get token from header
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      throw new UnauthorizedError('No token provided');
    }

    // Verify token
    const decoded = verifyAccessToken(token);
    
    // Fetch user from database with password EXCLUDED
    const user = await User.findById(decoded.userId)
      .select('-password')
      .lean();
    
    if (!user) {
      throw new UnauthorizedError('User not found');
    }

    if (user.status === 'inactive') {
      throw new UnauthorizedError('User account is inactive');
    }

    // Attach user to request
    req.user = user;
    req.userId = user._id;
    req.userRole = user.role;
    
    next();

  } catch (error) {
    logger.error('Auth middleware error:', error.message);
    next(error);
  }
};

module.exports = authMiddleware;