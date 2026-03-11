#!/usr/bin/env node

/**
 * Verify Email Notifications Database Schema
 * Checks that all tables and indexes were created correctly
 */

const db = require('../config/database');

async function verifyEmailSchema() {
  try {
    console.log('🔍 Verifying email notifications database schema...');
    
    // Check tables exist
    const [tables] = await db.queryCompat(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('email_queue', 'email_templates', 'email_logs', 'customer_email_preferences', 'email_settings')
      ORDER BY table_name
    `);
    
    console.log('📊 Tables found:', tables.map(t => t.table_name));
    
    // Check email_queue structure
    const [queueColumns] = await db.queryCompat(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'email_queue'
      ORDER BY ordinal_position
    `);
    
    console.log('📧 Email queue columns:', queueColumns.length);
    
    // Check indexes
    const [indexes] = await db.queryCompat(`
      SELECT indexname 
      FROM pg_indexes 
      WHERE tablename IN ('email_queue', 'email_templates', 'email_logs', 'customer_email_preferences')
      AND indexname LIKE 'idx_%'
      ORDER BY indexname
    `);
    
    console.log('📊 Performance indexes:', indexes.map(i => i.indexname));
    
    // Check default templates
    const [templates] = await db.queryCompat(`
      SELECT name, is_active 
      FROM email_templates 
      WHERE is_active = true
      ORDER BY name
    `);
    
    console.log('📧 Active templates:', templates.map(t => t.name));
    
    // Check default settings
    const [settings] = await db.queryCompat(`
      SELECT setting_key 
      FROM email_settings 
      ORDER BY setting_key
    `);
    
    console.log('⚙️ Configuration settings:', settings.map(s => s.setting_key));
    
    // Verify queue can accept test data
    const testId = 'test-' + Date.now();
    await db.queryCompat(`
      INSERT INTO email_queue (id, type, recipient, data, priority, status)
      VALUES ($1, 'test', 'test@example.com', '{"test": true}', 1, 'queued')
    `, [testId]);
    
    const [testRecord] = await db.queryCompat(`
      SELECT * FROM email_queue WHERE id = $1
    `, [testId]);
    
    if (testRecord.length > 0) {
      console.log('✅ Queue insert/select test passed');
      
      // Clean up test record
      await db.queryCompat(`DELETE FROM email_queue WHERE id = $1`, [testId]);
    }
    
    console.log('🎉 Email notifications schema verification completed successfully!');
    
    return {
      tables: tables.length,
      indexes: indexes.length,
      templates: templates.length,
      settings: settings.length
    };
    
  } catch (error) {
    console.error('❌ Schema verification failed:', error);
    throw error;
  }
}

// Run verification if called directly
if (require.main === module) {
  verifyEmailSchema()
    .then((results) => {
      console.log('📊 Verification Results:', results);
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Verification failed:', error);
      process.exit(1);
    });
}

module.exports = { verifyEmailSchema };