// Simple in-memory cache for orders data
class CacheService {
  constructor() {
    this.cache = new Map();
    this.ttl = 60000; // 1 minute TTL
  }

  set(key, value, customTtl = null) {
    const ttl = customTtl || this.ttl;
    const expiry = Date.now() + ttl;
    this.cache.set(key, { value, expiry });
  }

  get(key) {
    const item = this.cache.get(key);
    if (!item) return null;
    
    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return null;
    }
    
    return item.value;
  }

  delete(key) {
    this.cache.delete(key);
  }

  clear() {
    this.cache.clear();
  }

  // Generate cache key for orders with query parameters
  generateOrdersKey(status, limit) {
    return `orders:${status || 'all'}:${limit || 'unlimited'}`;
  }

  // Invalidate all order-related cache entries
  invalidateOrdersCache() {
    const keysToDelete = [];
    for (const key of this.cache.keys()) {
      if (key.startsWith('orders:')) {
        keysToDelete.push(key);
      }
    }
    keysToDelete.forEach(key => this.cache.delete(key));
  }
}

module.exports = new CacheService();