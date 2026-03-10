require('dotenv').config();
const bcrypt = require('bcryptjs');
const db = require('../config/database');

async function setupAdmin() {
  try {
    console.log('Setting up admin user...');
    
    // Check if admin already exists
    const [existing] = await db.queryCompat('SELECT * FROM admins WHERE username = $1', ['admin']);
    
    if (existing.length > 0) {
      console.log('Admin user already exists. Updating password...');
      
      // Update existing admin password
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await db.queryCompat('UPDATE admins SET password = $1 WHERE username = $2', [hashedPassword, 'admin']);
      
      console.log('✅ Admin password updated successfully!');
      console.log('Username: admin');
      console.log('Password: admin123');
      console.log('⚠️  Please change this password after first login!');
    } else {
      // Create new admin user
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await db.queryCompat('INSERT INTO admins (username, password) VALUES ($1, $2)', ['admin', hashedPassword]);
      
      console.log('✅ Admin user created successfully!');
      console.log('Username: admin');
      console.log('Password: admin123');
      console.log('⚠️  Please change this password after first login!');
    }
    
  } catch (error) {
    console.error('❌ Error setting up admin:', error.message);
  } finally {
    process.exit(0);
  }
}

setupAdmin();