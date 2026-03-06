/**
 * Custom Application Error Class
 */
class AppError extends Error {
  constructor(message, statusCode = 500, code = null) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;
    this.code = code;
    
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Global Error Handler Middleware
 */
const errorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  // Log error
  console.error('ERROR 💥', {
    message: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip
  });

  // Development: Send detailed error
  if (process.env.NODE_ENV === 'development') {
    return res.status(err.statusCode).json({
      success: false,
      status: err.status,
      error: {
        message: err.message,
        code: err.code,
        stack: err.stack
      },
      request: {
        url: req.originalUrl,
        method: req.method
      }
    });
  }

  // Production: Send limited error info
  if (err.isOperational) {
    // Operational, trusted error: send message to client
    return res.status(err.statusCode).json({
      success: false,
      status: err.status,
      error: {
        message: err.message,
        code: err.code
      }
    });
  }

  // Programming or unknown error: don't leak details
  return res.status(500).json({
    success: false,
    status: 'error',
    error: {
      message: 'Something went wrong. Please try again later.',
      code: 'INTERNAL_SERVER_ERROR'
    }
  });
};

/**
 * Handle 404 - Not Found
 */
const notFoundHandler = (req, res, next) => {
  const error = new AppError(
    `Cannot ${req.method} ${req.originalUrl}`,
    404,
    'ROUTE_NOT_FOUND'
  );
  next(error);
};

/**
 * Async Error Wrapper
 * Wraps async route handlers to catch errors
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Database Error Handler
 */
const handleDatabaseError = (error) => {
  // PostgreSQL errors
  if (error.code === '23505') {
    // Unique violation
    return new AppError('Duplicate entry. This record already exists.', 409, 'DUPLICATE_ENTRY');
  }
  
  if (error.code === '23503') {
    // Foreign key violation
    return new AppError('Related record not found.', 400, 'FOREIGN_KEY_VIOLATION');
  }
  
  if (error.code === '23502') {
    // Not null violation
    return new AppError('Required field is missing.', 400, 'REQUIRED_FIELD_MISSING');
  }

  // Generic database error
  return new AppError('Database operation failed.', 500, 'DATABASE_ERROR');
};

/**
 * Validation Error Handler
 */
const handleValidationError = (errors) => {
  const messages = errors.map(err => err.msg).join(', ');
  return new AppError(messages, 400, 'VALIDATION_ERROR');
};

module.exports = {
  AppError,
  errorHandler,
  notFoundHandler,
  asyncHandler,
  handleDatabaseError,
  handleValidationError
};
