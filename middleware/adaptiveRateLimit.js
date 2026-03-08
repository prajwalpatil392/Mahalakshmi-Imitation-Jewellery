const rateLimit = require('express-rate-limit');
const logger = require('../utils/logger');

// Adaptive rate limiting - adjusts based on server load
class AdaptiveRateLimiter {
  constructor() {
    this.baseLimit = 100; // Base requests per window
    this.currentLimit = this.baseLimit;
    this.windowMs = 15 * 60 * 1000; // 15 minutes
    
    // Monitor server load every minute
    setInterval(() => this.adjustLimits(), 60000);
  }

  adjustLimits() {
    const memUsage = process.memoryUsage();
    const memPercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;
    
    // Reduce limits if memory usage is high
    if (memPercent > 90) {
      this.currentLimit = Math.floor(this.baseLimit * 0.5); // 50% reduction
      logger.warn(`High memory usage (${memPercent.toFixed(2)}%), reducing rate limit to ${this.currentLimit}`);
    } else if (memPercent > 75) {
      this.currentLimit = Math.floor(this.baseLimit * 0.75); // 25% reduction
      logger.info(`Elevated memory usage (${memPercent.toFixed(2)}%), reducing rate limit to ${this.currentLimit}`);
    } else {
      this.currentLimit = this.baseLimit;
    }
  }

  getMiddleware() {
    return rateLimit({
      windowMs: this.windowMs,
      max: (req) => this.currentLimit,
      message: {
        success: false,
        error: {
          message: 'Too many requests, please try again later',
          code: 'RATE_LIMIT_EXCEEDED'
        }
      },
      standardHeaders: true,
      legacyHeaders: false,
      // Skip successful requests from counting
      skipSuccessfulRequests: false,
      // Skip failed requests from counting
      skipFailedRequests: false,
      // Custom key generator
      keyGenerator: (req) => {
        return req.ip || req.headers['x-forwarded-for'] || 'unknown';
      },
      // Handler for when limit is exceeded
      handler: (req, res) => {
        logger.warn(`Rate limit exceeded for IP: ${req.ip}`);
        res.status(429).json({
          success: false,
          error: {
            message: 'Too many requests, please try again later',
            code: 'RATE_LIMIT_EXCEEDED',
            retryAfter: Math.ceil(this.windowMs / 1000)
          }
        });
      }
    });
  }
}

const adaptiveLimiter = new AdaptiveRateLimiter();

module.exports = {
  apiLimiter: adaptiveLimiter.getMiddleware(),
  adaptiveLimiter
};
