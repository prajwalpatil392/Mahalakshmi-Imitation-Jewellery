const rateLimit = require('express-rate-limit');

/**
 * General API Rate Limiter
 * 100 requests per 15 minutes per IP
 */
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: {
    success: false,
    error: {
      message: 'Too many requests from this IP, please try again later.',
      code: 'RATE_LIMIT_EXCEEDED'
    }
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Skip rate limiting for certain IPs (optional)
  skip: (req) => {
    // Skip for localhost in development
    if (process.env.NODE_ENV === 'development' && req.ip === '::1') {
      return true;
    }
    return false;
  }
});

/**
 * Strict Rate Limiter for Authentication
 * 5 requests per 15 minutes per IP
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: {
    success: false,
    error: {
      message: 'Too many login attempts, please try again after 15 minutes.',
      code: 'AUTH_RATE_LIMIT_EXCEEDED'
    }
  },
  skipSuccessfulRequests: true // Don't count successful requests
});

/**
 * Order Creation Rate Limiter
 * 50 orders per hour per IP (increased for production use)
 */
const orderLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50,
  message: {
    success: false,
    error: {
      message: 'Too many orders created, please try again later.',
      code: 'ORDER_RATE_LIMIT_EXCEEDED'
    }
  }
});

/**
 * Upload Rate Limiter
 * 20 uploads per hour per IP
 */
const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  message: {
    success: false,
    error: {
      message: 'Too many file uploads, please try again later.',
      code: 'UPLOAD_RATE_LIMIT_EXCEEDED'
    }
  }
});

/**
 * Enquiry Rate Limiter
 * 5 enquiries per hour per IP
 */
const enquiryLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: {
    success: false,
    error: {
      message: 'Too many enquiries submitted, please try again later.',
      code: 'ENQUIRY_RATE_LIMIT_EXCEEDED'
    }
  }
});

module.exports = {
  apiLimiter,
  authLimiter,
  orderLimiter,
  uploadLimiter,
  enquiryLimiter
};
