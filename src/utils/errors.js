// Custom Error Classes

class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends AppError {
  constructor(message) {
    super(message, 400);
    this.name = 'ValidationError';
  }
}

class UnauthorizedError extends AppError {
  constructor(message = "Not authorized") {
    super(message, 401);
    this.name = 'UnauthorizedError';
  }
}

class ForbiddenError extends AppError {
  constructor(message = "Access forbidden") {
    super(message, 403);
    this.name = 'ForbiddenError';
  }
}

class NotFoundError extends AppError {
  constructor(message = "Resource not found") {
    super(message, 404);
    this.name = 'NotFoundError';
  }
}

class ConflictError extends AppError {
  constructor(message) {
    super(message, 409);
    this.name = 'ConflictError';
  }
}

class ServerError extends AppError {
  constructor(message = "Internal server error") {
    super(message, 500);
    this.name = 'ServerError';
  }
}

module.exports = {
  AppError,
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  ServerError
};