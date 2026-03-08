require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const logger = require('./utils/logger');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const { apiLimiter } = require('./middleware/adaptiveRateLimit');
const compressionMiddleware = require('./middleware/compression');
const healthCheck = require('./utils/healthCheck');

const app = express();

// Trust proxy - CRITICAL for Render deployment
app.set('trust proxy', 1);

// Compression - reduce response size
app.use(compressionMiddleware);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));

// CORS
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true
}));

// Body parsing with limits
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging with performance tracking
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.logResponse(req, res, duration);
    
    // Warn on slow requests
    if (duration > 3000) {
      logger.warn(`Slow request detected: ${req.method} ${req.path} took ${duration}ms`);
    }
  });
  next();
});

// Static files with caching
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
  maxAge: '1d', // Cache for 1 day
  etag: true
}));

app.use(express.static(path.join(__dirname, 'public'), {
  maxAge: '1h', // Cache for 1 hour
  etag: true
}));

// Adaptive rate limiting on API routes
app.use('/api/', apiLimiter);

// Enhanced health check
app.get('/health', healthCheck.middleware());

// API Routes
app.use('/api/products', require('./routes/products'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/enquiries', require('./routes/enquiries'));
app.use('/api/inventory', require('./routes/inventory'));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/customers', require('./routes/customers'));
app.use('/api/upload', require('./routes/upload'));
app.use('/api/rentals', require('./routes/rentals'));
app.use('/api/invoices', require('./routes/invoices'));
app.use('/api/payments', require('./routes/payments'));

// Frontend routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'pages', 'index.html'));
});

// Redirect old URLs to new ones
app.get('/mahalakshmi-client.html', (req, res) => {
  res.redirect(301, '/');
});

app.get('/mahalakshmi-admin.html', (req, res) => {
  res.redirect(301, '/admin');
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'pages', 'admin.html'));
});

app.get('/buy', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'pages', 'buy.html'));
});

app.get('/rental', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'pages', 'rental.html'));
});

// 404 handler
app.use(notFoundHandler);

// Global error handler (must be last)
app.use(errorHandler);

// Test database connection
(async () => {
  try {
    const db = require('./config/database');
    await db.query('SELECT 1');
    logger.info('✅ Database Connected');
  } catch (err) {
    logger.error('⚠️ Database connection failed:', err);
  }
})();

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  logger.info(`🚀 Server running on port ${PORT}`);
  logger.info(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`🔗 Health check: http://localhost:${PORT}/health`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});
