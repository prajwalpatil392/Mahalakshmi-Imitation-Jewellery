require('dotenv').config();
const mysql = require('mysql2/promise');

async function migrate() {
  let connection;
  
  try {
    // Connect without database first
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || ''
    });

    console.log('Connected to MySQL');

    // Create database if not exists
    await connection.query(`CREATE DATABASE IF NOT EXISTS ${process.env.DB_NAME || 'mahalakshmi'}`);
    console.log('Database created/verified');

    // Use the database
    await connection.query(`USE ${process.env.DB_NAME || 'mahalakshmi'}`);

    // Create products table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS products (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        material VARCHAR(255) NOT NULL,
        icon VARCHAR(10) DEFAULT '💎',
        rent_per_day DECIMAL(10,2) DEFAULT NULL,
        buy_price DECIMAL(10,2) DEFAULT NULL,
        type ENUM('rent', 'buy', 'both') NOT NULL,
        category VARCHAR(100) NOT NULL,
        base_stock INT DEFAULT 5,
        available BOOLEAN DEFAULT TRUE,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Products table created');

    // Create orders table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id INT AUTO_INCREMENT PRIMARY KEY,
        order_id VARCHAR(50) UNIQUE NOT NULL,
        type ENUM('order', 'enquiry') DEFAULT 'order',
        customer_name VARCHAR(255) NOT NULL,
        customer_phone VARCHAR(20) NOT NULL,
        customer_email VARCHAR(255),
        customer_address TEXT,
        customer_event VARCHAR(255),
        customer_notes TEXT,
        total DECIMAL(10,2) NOT NULL,
        status ENUM('New', 'Confirmed', 'Delivered', 'Returned', 'Completed', 'Cancelled') DEFAULT 'New',
        placed_at VARCHAR(100),
        timestamp BIGINT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Orders table created');

    // Create order_items table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS order_items (
        id INT AUTO_INCREMENT PRIMARY KEY,
        order_id INT NOT NULL,
        product_id INT NOT NULL,
        product_name VARCHAR(255),
        product_icon VARCHAR(10),
        mode ENUM('rent', 'buy') NOT NULL,
        price DECIMAL(10,2) NOT NULL,
        rental_from VARCHAR(50),
        rental_to VARCHAR(50),
        rental_days INT,
        rental_total DECIMAL(10,2),
        FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
      )
    `);
    console.log('✅ Order items table created');

    // Create enquiries table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS enquiries (
        id INT AUTO_INCREMENT PRIMARY KEY,
        order_id VARCHAR(50) UNIQUE NOT NULL,
        customer_name VARCHAR(255) NOT NULL,
        customer_phone VARCHAR(20) NOT NULL,
        customer_email VARCHAR(255),
        customer_event VARCHAR(255),
        customer_notes TEXT,
        request_type VARCHAR(100),
        status ENUM('New', 'Contacted', 'Converted', 'Closed') DEFAULT 'New',
        placed_at VARCHAR(100),
        timestamp BIGINT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Enquiries table created');

    // Create admins table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS admins (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(100) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'admin',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Admins table created');

    // Create customers table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS customers (
        id INT AUTO_INCREMENT PRIMARY KEY,
        phone VARCHAR(20) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255),
        cart_data TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Customers table created');
    
    // Add cart_data column if it doesn't exist (for existing databases)
    try {
      await connection.query(`
        ALTER TABLE customers ADD COLUMN cart_data TEXT
      `);
      console.log('✅ Added cart_data column to customers table');
    } catch (err) {
      // Column might already exist, ignore error
      if (!err.message.includes('Duplicate column')) {
        console.log('ℹ️  cart_data column already exists');
      }
    }
    
    // Add customer_id to orders table if it doesn't exist
    try {
      await connection.query(`
        ALTER TABLE orders ADD COLUMN customer_id INT,
        ADD FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL
      `);
      console.log('✅ Added customer_id column to orders table');
    } catch (err) {
      // Column might already exist, ignore error
      if (!err.message.includes('Duplicate column')) {
        console.log('ℹ️  customer_id column already exists');
      }
    }
    
    // Add quantity column to order_items if it doesn't exist
    try {
      await connection.query(`
        ALTER TABLE order_items ADD COLUMN quantity INT DEFAULT 1
      `);
      console.log('✅ Added quantity column to order_items table');
    } catch (err) {
      // Column might already exist, ignore error
      if (!err.message.includes('Duplicate column')) {
        console.log('ℹ️  quantity column already exists');
      }
    }
    
    // Add product_names column to orders table if it doesn't exist
    try {
      await connection.query(`
        ALTER TABLE orders ADD COLUMN product_names TEXT
      `);
      console.log('✅ Added product_names column to orders table');
    } catch (err) {
      // Column might already exist, ignore error
      if (!err.message.includes('Duplicate column')) {
        console.log('ℹ️  product_names column already exists');
      }
    }
    
    // Add image_url column to products table if it doesn't exist
    try {
      await connection.query(`
        ALTER TABLE products ADD COLUMN image_url VARCHAR(500)
      `);
      console.log('✅ Added image_url column to products table');
    } catch (err) {
      if (!err.message.includes('Duplicate column')) {
        console.log('ℹ️  image_url column already exists');
      }
    }
    
    // Add rental return tracking columns to orders table
    try {
      await connection.query(`
        ALTER TABLE orders 
        ADD COLUMN expected_return_date DATE,
        ADD COLUMN return_date DATE,
        ADD COLUMN return_condition VARCHAR(50),
        ADD COLUMN return_notes TEXT
      `);
      console.log('✅ Added rental return tracking columns to orders table');
    } catch (err) {
      if (!err.message.includes('Duplicate column')) {
        console.log('ℹ️  Rental return columns already exist');
      }
    }
    
    // Add invoice_path column to orders table
    try {
      await connection.query(`
        ALTER TABLE orders ADD COLUMN invoice_path VARCHAR(500)
      `);
      console.log('✅ Added invoice_path column to orders table');
    } catch (err) {
      if (!err.message.includes('Duplicate column')) {
        console.log('ℹ️  invoice_path column already exists');
      }
    }
    
    // Add password column to customers table for login
    try {
      await connection.query(`
        ALTER TABLE customers ADD COLUMN password VARCHAR(255)
      `);
      console.log('✅ Added password column to customers table');
    } catch (err) {
      if (!err.message.includes('Duplicate column')) {
        console.log('ℹ️  password column already exists');
      }
    }
    
    // Add payment columns to orders table
    try {
      await connection.query(`
        ALTER TABLE orders 
        ADD COLUMN payment_method VARCHAR(50) DEFAULT 'Cash on Delivery',
        ADD COLUMN payment_status ENUM('pending', 'paid', 'failed', 'refunded') DEFAULT 'pending',
        ADD COLUMN payment_id VARCHAR(255),
        ADD COLUMN razorpay_order_id VARCHAR(255),
        ADD COLUMN payment_verified_at TIMESTAMP NULL
      `);
      console.log('✅ Added payment columns to orders table');
    } catch (err) {
      if (!err.message.includes('Duplicate column')) {
        console.log('ℹ️  Payment columns already exist');
      }
    }


    console.log('\n🎉 Migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration error:', error);
  } finally {
    if (connection) await connection.end();
  }
}

migrate();
