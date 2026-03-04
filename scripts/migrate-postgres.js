require('dotenv').config();
const { Client } = require('pg');

async function migrate() {
  let client;
  let retries = 0;
  const maxRetries = 10;
  const retryDelay = 2000; // 2 seconds
  
  try {
    // Connect using DATABASE_URL if available (Railway/Render), otherwise use individual env vars
    const connectionString = process.env.DATABASE_URL;
    
    if (!connectionString) {
      console.log('⚠️  DATABASE_URL not found. Using individual env vars or defaults.');
      console.log('This is expected on first deployment - database may still be initializing.');
      console.log('App will start and create tables automatically.');
      process.exit(0); // Exit gracefully - app server will retry
    }

    // Retry connection loop
    while (retries < maxRetries) {
      try {
        client = new Client({
          connectionString: connectionString,
          statement_timeout: 15000,
          application_name: 'mahalakshmi_app'
        });

        await client.connect();
        console.log('✅ Connected to PostgreSQL');
        break;
      } catch (err) {
        retries++;
        if (retries >= maxRetries) throw err;
        console.log(`⚠️  Connection attempt ${retries}/${maxRetries} failed. Retrying in ${retryDelay/1000}s...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
    }

    // Get dbName from connectionString
    const dbName = new URL(connectionString).pathname.slice(1) || 'mahalakshmi';
    console.log(`Using database: ${dbName}`);

    // Create products table
    await client.query(`
      CREATE TABLE IF NOT EXISTS products (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        material VARCHAR(255) NOT NULL,
        icon VARCHAR(10) DEFAULT '💎',
        rent_per_day DECIMAL(10,2) DEFAULT NULL,
        buy_price DECIMAL(10,2) DEFAULT NULL,
        type VARCHAR(10) NOT NULL CHECK (type IN ('rent', 'buy', 'both')),
        category VARCHAR(100) NOT NULL,
        base_stock INT DEFAULT 5,
        available BOOLEAN DEFAULT TRUE,
        description TEXT,
        image_url VARCHAR(500),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Products table created');

    // Create customers table
    await client.query(`
      CREATE TABLE IF NOT EXISTS customers (
        id SERIAL PRIMARY KEY,
        phone VARCHAR(20) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255),
        password VARCHAR(255),
        cart_data TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Customers table created');

    // Create orders table
    await client.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id SERIAL PRIMARY KEY,
        order_id VARCHAR(50) UNIQUE NOT NULL,
        type VARCHAR(10) DEFAULT 'order' CHECK (type IN ('order', 'enquiry')),
        customer_id INT REFERENCES customers(id) ON DELETE SET NULL,
        customer_name VARCHAR(255) NOT NULL,
        customer_phone VARCHAR(20) NOT NULL,
        customer_email VARCHAR(255),
        customer_address TEXT,
        customer_event VARCHAR(255),
        customer_notes TEXT,
        product_names TEXT,
        total DECIMAL(10,2) NOT NULL,
        status VARCHAR(20) DEFAULT 'New' CHECK (status IN ('New', 'Confirmed', 'Delivered', 'Returned', 'Completed', 'Cancelled')),
        placed_at VARCHAR(100),
        timestamp BIGINT,
        expected_return_date DATE,
        return_date DATE,
        return_condition VARCHAR(50),
        return_notes TEXT,
        invoice_path VARCHAR(500),
        payment_method VARCHAR(50) DEFAULT 'Cash on Delivery',
        payment_status VARCHAR(20) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),
        payment_id VARCHAR(255),
        razorpay_order_id VARCHAR(255),
        payment_verified_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Orders table created');

    // Create order_items table
    await client.query(`
      CREATE TABLE IF NOT EXISTS order_items (
        id SERIAL PRIMARY KEY,
        order_id INT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
        product_id INT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        product_name VARCHAR(255),
        product_icon VARCHAR(10),
        mode VARCHAR(10) NOT NULL CHECK (mode IN ('rent', 'buy')),
        price DECIMAL(10,2) NOT NULL,
        quantity INT DEFAULT 1,
        rental_from VARCHAR(50),
        rental_to VARCHAR(50),
        rental_days INT,
        rental_total DECIMAL(10,2)
      )
    `);
    console.log('✅ Order items table created');

    // Create enquiries table
    await client.query(`
      CREATE TABLE IF NOT EXISTS enquiries (
        id SERIAL PRIMARY KEY,
        order_id VARCHAR(50) UNIQUE NOT NULL,
        customer_name VARCHAR(255) NOT NULL,
        customer_phone VARCHAR(20) NOT NULL,
        customer_email VARCHAR(255),
        customer_event VARCHAR(255),
        customer_notes TEXT,
        request_type VARCHAR(100),
        status VARCHAR(20) DEFAULT 'New' CHECK (status IN ('New', 'Contacted', 'Converted', 'Closed')),
        placed_at VARCHAR(100),
        timestamp BIGINT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Enquiries table created');

    // Create admins table
    await client.query(`
      CREATE TABLE IF NOT EXISTS admins (
        id SERIAL PRIMARY KEY,
        username VARCHAR(100) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'admin',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Admins table created');

    // Create trigger function for updated_at
    await client.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ language 'plpgsql';
    `);
    console.log('✅ Created updated_at trigger function');

    // Add triggers to all tables
    const tables = ['products', 'customers', 'orders', 'enquiries', 'admins'];
    for (const table of tables) {
      await client.query(`
        DROP TRIGGER IF EXISTS update_${table}_updated_at ON ${table};
        CREATE TRIGGER update_${table}_updated_at
        BEFORE UPDATE ON ${table}
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
      `);
      console.log(`✅ Added updated_at trigger to ${table} table`);
    }

    console.log('\n🎉 PostgreSQL migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration error:', error.message);
    console.error('⚠️  Database migrations failed, but app will continue.');
    console.error('Ensure database is running and DATABASE_URL is set correctly.');
    // Don't exit with error - let the app start and create tables on first use
    process.exit(0);
  } finally {
    if (client) await client.end();
  }
}

migrate();
