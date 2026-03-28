const { ForbiddenError, UnauthorizedError } = require('../utils/errors');

const roleMiddleware = (allowedRoles) => {
  // Validate parameter
  if (!allowedRoles || !Array.isArray(allowedRoles) || allowedRoles.length === 0) {
    throw new Error('roleMiddleware: allowedRoles must be a non-empty array');
  }

  return (req, res, next) => {
    try {
      // Check user is authenticated
      if (!req.user) {
        return next(new UnauthorizedError('Authentication required'));
      }

      // Check user has required role
      if (!allowedRoles.includes(req.user.role)) {
        const message = req.t 
          ? req.t('errors.forbidden', { 
              required: allowedRoles.join(' or '), 
              actual: req.user.role 
            })
          : `This action requires ${allowedRoles.join('/')} role. You have ${req.user.role} role`;
        
        return next(new ForbiddenError(message));
      }

      next();

    } catch (error) {
      next(error);
    }
  };
};

module.exports = roleMiddleware;