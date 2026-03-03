require('dotenv').config();
const mysql = require('mysql2/promise');

async function addImageField() {
  let connection;
  
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'mahalakshmi'
    });

    console.log('Connected to MySQL');

    // Add image_url column to products table
    try {
      await connection.query(`
        ALTER TABLE products ADD COLUMN image_url VARCHAR(500) DEFAULT NULL
      `);
      console.log('✅ Added image_url column to products table');
    } catch (err) {
      if (err.message.includes('Duplicate column')) {
        console.log('ℹ️  image_url column already exists');
      } else {
        throw err;
      }
    }

    console.log('\n🎉 Migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration error:', error);
  } finally {
    if (connection) await connection.end();
  }
}

addImageField();
