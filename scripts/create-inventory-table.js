require('dotenv').config();
const db = require('../config/database');

async function createInventoryTable() {
  console.log('🔧 Creating inventory_transactions table...\n');

  try {
    // Create inventory_transactions table
    await db.query(`
      CREATE TABLE IF NOT EXISTS inventory_transactions (
        id SERIAL PRIMARY KEY,
        product_id INTEGER NOT NULL,
        order_id INTEGER,
        transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('reserve', 'release', 'adjust')),
        quantity INTEGER NOT NULL,
        reason TEXT,
        created_by INTEGER,
        created_at TIMESTAMP DEFAULT NOW(),
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
        FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL
      )
    `);
    console.log('✅ inventory_transactions table created');

    // Create indexes for better performance
    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_inventory_product 
      ON inventory_transactions(product_id)
    `);
    console.log('✅ Index on product_id created');

    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_inventory_order 
      ON inventory_transactions(order_id)
    `);
    console.log('✅ Index on order_id created');

    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_inventory_type 
      ON inventory_transactions(transaction_type)
    `);
    console.log('✅ Index on transaction_type created');

    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_inventory_created 
      ON inventory_transactions(created_at DESC)
    `);
    console.log('✅ Index on created_at created');

    // Create view for current stock
    await db.query(`
      CREATE OR REPLACE VIEW product_stock AS
      SELECT 
        p.id,
        p.name,
        p.base_stock,
        COALESCE(SUM(
          CASE 
            WHEN it.transaction_type = 'reserve' THEN -it.quantity
            WHEN it.transaction_type = 'release' THEN it.quantity
            WHEN it.transaction_type = 'adjust' THEN it.quantity
            ELSE 0 
          END
        ), 0) as stock_change,
        p.base_stock + COALESCE(SUM(
          CASE 
            WHEN it.transaction_type = 'reserve' THEN -it.quantity
            WHEN it.transaction_type = 'release' THEN it.quantity
            WHEN it.transaction_type = 'adjust' THEN it.quantity
            ELSE 0 
          END
        ), 0) as available_stock
      FROM products p
      LEFT JOIN inventory_transactions it ON p.id = it.product_id
      GROUP BY p.id, p.name, p.base_stock
    `);
    console.log('✅ product_stock view created');

    // Add updated_at column to products if it doesn't exist
    await db.query(`
      ALTER TABLE products 
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW()
    `);
    console.log('✅ updated_at column added to products');

    // Add deleted_at column for soft deletes
    await db.query(`
      ALTER TABLE products 
      ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP
    `);
    console.log('✅ deleted_at column added to products');

    // Add slug column for SEO
    await db.query(`
      ALTER TABLE products 
      ADD COLUMN IF NOT EXISTS slug VARCHAR(255) UNIQUE
    `);
    console.log('✅ slug column added to products');

    // Add images JSONB column for multiple images
    await db.query(`
      ALTER TABLE products 
      ADD COLUMN IF NOT EXISTS images JSONB
    `);
    console.log('✅ images column added to products');

    // Add metadata JSONB column
    await db.query(`
      ALTER TABLE products 
      ADD COLUMN IF NOT EXISTS metadata JSONB
    `);
    console.log('✅ metadata column added to products');

    // Update orders table
    await db.query(`
      ALTER TABLE orders 
      ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMP,
      ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP,
      ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP,
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW()
    `);
    console.log('✅ Timestamp columns added to orders');

    console.log('\n✅ All migrations completed successfully!');
    console.log('\n📊 Database schema updated with:');
    console.log('   - inventory_transactions table');
    console.log('   - product_stock view');
    console.log('   - Enhanced products table');
    console.log('   - Enhanced orders table');
    console.log('   - Performance indexes');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await db.end();
    process.exit(0);
  }
}

// Run migration
createInventoryTable();
