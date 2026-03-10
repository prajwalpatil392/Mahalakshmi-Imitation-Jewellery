const db = require('../config/database');

async function optimizeOrdersPerformance() {
  try {
    console.log('Creating database indexes for orders performance optimization...');
    
    // Index for orders table - most common queries
    await db.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_type_timestamp 
      ON orders (type, timestamp DESC)
    `);
    
    await db.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_type_status 
      ON orders (type, status)
    `);
    
    // Index for order_items table
    await db.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_order_items_order_id 
      ON order_items (order_id)
    `);
    
    // Composite index for common filtering
    await db.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_type_status_timestamp 
      ON orders (type, status, timestamp DESC)
    `);
    
    console.log('Database indexes created successfully!');
    console.log('Performance optimization complete.');
    
  } catch (error) {
    console.error('Error creating indexes:', error);
  } finally {
    process.exit(0);
  }
}

optimizeOrdersPerformance();