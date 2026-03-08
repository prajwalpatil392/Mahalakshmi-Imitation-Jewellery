const compression = require('compression');

// Smart compression middleware
module.exports = compression({
  // Only compress responses larger than 1KB
  threshold: 1024,
  
  // Compression level (0-9, 6 is balanced)
  level: 6,
  
  // Filter function - don't compress images
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    
    // Don't compress images (already compressed)
    const contentType = res.getHeader('Content-Type');
    if (contentType && contentType.includes('image/')) {
      return false;
    }
    
    return compression.filter(req, res);
  }
});
