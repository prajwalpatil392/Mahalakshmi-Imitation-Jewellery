const cache = require('../utils/cache');

// Cache middleware for GET requests
const cacheMiddleware = (duration = 300000) => {
  return (req, res, next) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }

    const key = `cache:${req.originalUrl}`;
    const cachedResponse = cache.get(key);

    if (cachedResponse) {
      res.set('X-Cache', 'HIT');
      return res.json(cachedResponse);
    }

    // Store original json method
    const originalJson = res.json.bind(res);

    // Override json method to cache response
    res.json = (body) => {
      cache.set(key, body, duration);
      res.set('X-Cache', 'MISS');
      return originalJson(body);
    };

    next();
  };
};

module.exports = cacheMiddleware;
