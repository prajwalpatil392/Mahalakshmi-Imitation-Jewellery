require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const logger = require('./utils/logger');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const { apiLimiter } = require('./middleware/rateLimiter');

const app = express();

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

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.logResponse(req, res, duration);
  });
  next();
});

// Static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.static(path.join(__dirname, 'public')));

// Rate limiting on API routes
app.use('/api/', apiLimiter);

// Health check
app.get('/health', async (req, res) => {
  const db = require('./config/database');
  try {
    await db.query('SELECT 1');
    res.json({ 
      status: 'healthy', 
      database: 'connected',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(503).json({ 
      status: 'unhealthy', 
      database: 'disconnected',
      error: error.message
    });
  }
});

// TEMPORARY: Migration endpoint - REMOVE AFTER RUNNING MIGRATION!
app.get('/run-migration', async (req, res) => {
  const secret = req.query.secret;
  
  // Check secret key
  if (!process.env.MIGRATION_SECRET || secret !== process.env.MIGRATION_SECRET) {
    logger.warn('Unauthorized migration attempt');
    return res.status(403).json({ error: 'Forbidden - Invalid secret' });
  }
  
  try {
    logger.info('Starting migration...');
    
    // Run migration directly
    const db = require('./config/database');
    
    // Create inventory_transactions table
    await db.query(`
      CREATE TABLE IF NOT EXISTS inventory_transactions (
        id SERIAL PRIMARY KEY,
        order_id INTEGER NOT NULL,
        product_id INTEGER NOT NULL,
        quantity INTEGER NOT NULL,
        transaction_type VARCHAR(20) NOT NULL,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
      )
    `);
    logger.info('✅ inventory_transactions table created');
    
    // Create indexes
    await db.query('CREATE INDEX IF NOT EXISTS idx_inventory_order ON inventory_transactions(order_id)');
    await db.query('CREATE INDEX IF NOT EXISTS idx_inventory_product ON inventory_transactions(product_id)');
    await db.query('CREATE INDEX IF NOT EXISTS idx_inventory_created ON inventory_transactions(created_at)');
    logger.info('✅ Indexes created');
    
    // Create product_stock view
    await db.query(`
      CREATE OR REPLACE VIEW product_stock AS
      SELECT 
        p.id,
        p.name,
        p.base_stock,
        COALESCE(SUM(CASE WHEN it.transaction_type = 'reserve' THEN it.quantity ELSE 0 END), 0) as reserved_stock,
        COALESCE(SUM(CASE WHEN it.transaction_type = 'release' THEN it.quantity ELSE 0 END), 0) as released_stock,
        p.base_stock - COALESCE(SUM(CASE WHEN it.transaction_type = 'reserve' THEN it.quantity ELSE 0 END), 0) + COALESCE(SUM(CASE WHEN it.transaction_type = 'release' THEN it.quantity ELSE 0 END), 0) as available_stock
      FROM products p
      LEFT JOIN inventory_transactions it ON p.id = it.product_id
      GROUP BY p.id, p.name, p.base_stock
    `);
    logger.info('✅ product_stock view created');
    
    logger.info('✅ Migration completed successfully!');
    
    res.json({ 
      success: true, 
      message: 'Migration completed successfully!',
      note: 'IMPORTANT: Remove this endpoint from server.js now!'
    });
  } catch (error) {
    logger.error('Migration failed:', error);
    res.status(500).json({ 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

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
  if (process.env.MIGRATION_SECRET) {
    logger.warn('⚠️ MIGRATION ENDPOINT IS ACTIVE - Remove after running migration!');
  }
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
