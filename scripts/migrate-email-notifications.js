#!/usr/bin/env node

/**
 * Email Notifications Database Migration
 * Creates tables for email queue, templates, logs, and customer preferences
 */

const db = require('../config/database');

async function createEmailNotificationsTables() {
  const client = await db.connect();
  
  try {
    await client.query('BEGIN');
    
    console.log('🔄 Creating email notifications database schema...');
    
    // Email queue for asynchronous processing
    await client.query(`
      CREATE TABLE IF NOT EXISTS email_queue (
        id VARCHAR(36) PRIMARY KEY,
        type VARCHAR(50) NOT NULL,
        recipient VARCHAR(255) NOT NULL,
        data JSONB NOT NULL,
        priority INTEGER DEFAULT 5,
        status VARCHAR(20) DEFAULT 'queued',
        attempts INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW(),
        scheduled_for TIMESTAMP DEFAULT NOW(),
        sent_at TIMESTAMP NULL,
        error_message TEXT NULL,
        provider_response JSONB NULL
      )
    `);
    
    // Email templates storage
    await client.query(`
      CREATE TABLE IF NOT EXISTS email_templates (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) UNIQUE NOT NULL,
        subject VARCHAR(255) NOT NULL,
        html_content TEXT NOT NULL,
        text_content TEXT NULL,
        variables JSONB NULL,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    
    // Email delivery tracking
    await client.query(`
      CREATE TABLE IF NOT EXISTS email_logs (
        id VARCHAR(36) PRIMARY KEY,
        queue_id VARCHAR(36) REFERENCES email_queue(id),
        recipient VARCHAR(255) NOT NULL,
        subject VARCHAR(255) NOT NULL,
        template_name VARCHAR(100) NOT NULL,
        provider VARCHAR(50) NOT NULL,
        status VARCHAR(20) NOT NULL,
        sent_at TIMESTAMP NOT NULL,
        delivered_at TIMESTAMP NULL,
        opened_at TIMESTAMP NULL,
        clicked_at TIMESTAMP NULL,
        bounced_at TIMESTAMP NULL,
        complaint_at TIMESTAMP NULL,
        provider_message_id VARCHAR(255) NULL,
        error_details JSONB NULL
      )
    `);
    
    // Customer notification preferences
    await client.query(`
      CREATE TABLE IF NOT EXISTS customer_email_preferences (
        id SERIAL PRIMARY KEY,
        customer_id INTEGER NULL,
        email VARCHAR(255) NOT NULL,
        order_confirmations BOOLEAN DEFAULT true,
        status_updates BOOLEAN DEFAULT true,
        rental_reminders BOOLEAN DEFAULT true,
        promotional_emails BOOLEAN DEFAULT true,
        unsubscribe_token VARCHAR(100) UNIQUE,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    
    // Email configuration settings
    await client.query(`
      CREATE TABLE IF NOT EXISTS email_settings (
        id SERIAL PRIMARY KEY,
        setting_key VARCHAR(100) UNIQUE NOT NULL,
        setting_value JSONB NOT NULL,
        description TEXT NULL,
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    
    console.log('📊 Creating database indexes for performance...');
    
    // Indexes for performance optimization
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_email_queue_status_priority 
      ON email_queue(status, priority DESC, scheduled_for)
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_email_queue_scheduled 
      ON email_queue(scheduled_for) WHERE status = 'queued'
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_email_logs_recipient 
      ON email_logs(recipient)
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_email_logs_sent_at 
      ON email_logs(sent_at)
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_customer_preferences_email 
      ON customer_email_preferences(email)
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_email_templates_name 
      ON email_templates(name) WHERE is_active = true
    `);
    
    console.log('📧 Inserting default email templates...');
    
    // Insert default email templates
    const defaultTemplates = [
      {
        name: 'order_confirmation',
        subject: '🪷 Order Confirmation - {{orderNumber}} | Mahalakshmi Jewellery',
        html_content: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #FAF4E8;">
            <div style="background: #6B1A1A; color: #F0C96B; padding: 20px; text-align: center;">
              <h1 style="margin: 0; font-size: 24px;">🪷 Mahalakshmi Jewellery</h1>
              <p style="margin: 5px 0 0 0; font-size: 14px;">Imitation Jewellery Collection</p>
            </div>
            <div style="padding: 30px 20px; background: white; margin: 20px;">
              <h2 style="color: #6B1A1A; margin-bottom: 20px;">Order Confirmation</h2>
              <p>Dear {{customerName}},</p>
              <p>Thank you for your order! We're excited to prepare your beautiful jewellery pieces.</p>
              
              <div style="background: #FAF4E8; padding: 15px; margin: 20px 0; border-left: 4px solid #C9963A;">
                <strong>Order Details:</strong><br>
                Order ID: <strong>{{orderNumber}}</strong><br>
                Order Date: {{orderDate}}<br>
                Total Amount: <strong>₹{{totalAmount}}</strong>
              </div>
              
              <div style="margin: 20px 0;">
                <h3 style="color: #6B1A1A;">Items Ordered:</h3>
                {{#each items}}
                <div style="border-bottom: 1px solid #eee; padding: 10px 0;">
                  <strong>{{name}}</strong> - {{mode}}<br>
                  Quantity: {{quantity}} | Price: ₹{{price}}
                </div>
                {{/each}}
              </div>
              
              <p><strong>Estimated Delivery:</strong> {{estimatedDelivery}}</p>
              <p><strong>Tracking Reference:</strong> {{trackingReference}}</p>
              
              <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666;">
                <p>For any queries, contact us at: <a href="mailto:info@mahalakshmijewellery.com">info@mahalakshmijewellery.com</a></p>
                <p>Phone: +91 XXXXX XXXXX</p>
              </div>
            </div>
          </div>
        `,
        variables: JSON.stringify(['customerName', 'orderNumber', 'orderDate', 'totalAmount', 'items', 'estimatedDelivery', 'trackingReference'])
      },
      {
        name: 'order_status_update',
        subject: '📦 Order Update - {{orderNumber}} | Mahalakshmi Jewellery',
        html_content: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #FAF4E8;">
            <div style="background: #6B1A1A; color: #F0C96B; padding: 20px; text-align: center;">
              <h1 style="margin: 0; font-size: 24px;">🪷 Mahalakshmi Jewellery</h1>
              <p style="margin: 5px 0 0 0; font-size: 14px;">Order Status Update</p>
            </div>
            <div style="padding: 30px 20px; background: white; margin: 20px;">
              <h2 style="color: #6B1A1A; margin-bottom: 20px;">Order Status Update</h2>
              <p>Dear {{customerName}},</p>
              <p>Your order <strong>{{orderNumber}}</strong> has been updated.</p>
              
              <div style="background: #FAF4E8; padding: 15px; margin: 20px 0; border-left: 4px solid #C9963A;">
                <strong>Current Status: {{newStatus}}</strong><br>
                {{#if trackingInfo}}
                Tracking Information: {{trackingInfo}}<br>
                {{/if}}
                {{#if nextSteps}}
                Next Steps: {{nextSteps}}
                {{/if}}
              </div>
              
              {{#if cancellationReason}}
              <div style="background: #ffe6e6; padding: 15px; margin: 20px 0; border-left: 4px solid #ff4444;">
                <strong>Cancellation Reason:</strong> {{cancellationReason}}<br>
                <strong>Refund Information:</strong> {{refundInfo}}
              </div>
              {{/if}}
              
              <p>Thank you for choosing Mahalakshmi Jewellery!</p>
            </div>
          </div>
        `,
        variables: JSON.stringify(['customerName', 'orderNumber', 'newStatus', 'trackingInfo', 'nextSteps', 'cancellationReason', 'refundInfo'])
      },
      {
        name: 'rental_reminder',
        subject: '⏰ Rental Reminder - {{reminderType}} | Mahalakshmi Jewellery',
        html_content: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #FAF4E8;">
            <div style="background: #6B1A1A; color: #F0C96B; padding: 20px; text-align: center;">
              <h1 style="margin: 0; font-size: 24px;">🪷 Mahalakshmi Jewellery</h1>
              <p style="margin: 5px 0 0 0; font-size: 14px;">Rental Reminder</p>
            </div>
            <div style="padding: 30px 20px; background: white; margin: 20px;">
              <h2 style="color: #6B1A1A; margin-bottom: 20px;">{{reminderType}} Reminder</h2>
              <p>Dear {{customerName}},</p>
              <p>This is a friendly reminder about your rental order <strong>{{orderNumber}}</strong>.</p>
              
              <div style="background: #FAF4E8; padding: 15px; margin: 20px 0; border-left: 4px solid #C9963A;">
                <strong>Rental Details:</strong><br>
                {{#if pickupDate}}Pickup Date: {{pickupDate}}<br>{{/if}}
                {{#if returnDate}}Return Date: {{returnDate}}<br>{{/if}}
                Location: {{location}}<br>
                {{#if daysUntilDue}}Days Until Due: {{daysUntilDue}}{{/if}}
              </div>
              
              <div style="margin: 20px 0;">
                <h3 style="color: #6B1A1A;">Rental Items:</h3>
                {{#each items}}
                <div style="border-bottom: 1px solid #eee; padding: 10px 0;">
                  <strong>{{name}}</strong><br>
                  Rental Period: {{rentalDays}} days
                </div>
                {{/each}}
              </div>
              
              <p>Please contact us if you need to make any changes to your rental.</p>
              
              <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666;">
                <p>Contact: <a href="mailto:info@mahalakshmijewellery.com">info@mahalakshmijewellery.com</a> | +91 XXXXX XXXXX</p>
              </div>
            </div>
          </div>
        `,
        variables: JSON.stringify(['customerName', 'orderNumber', 'reminderType', 'pickupDate', 'returnDate', 'location', 'daysUntilDue', 'items'])
      },
      {
        name: 'admin_new_order',
        subject: '🔔 New Order Alert - {{orderNumber}} | Admin Notification',
        html_content: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #1a3a6b; color: white; padding: 20px; text-align: center;">
              <h1 style="margin: 0; font-size: 20px;">🔔 New Order Alert</h1>
              <p style="margin: 5px 0 0 0; font-size: 14px;">Admin Notification</p>
            </div>
            <div style="padding: 20px; background: white; border: 1px solid #ddd;">
              <h2 style="color: #1a3a6b; margin-bottom: 15px;">New Order Received</h2>
              
              <div style="background: #f0f8ff; padding: 15px; margin: 15px 0; border-left: 4px solid #1a3a6b;">
                <strong>Order ID:</strong> {{orderNumber}}<br>
                <strong>Customer:</strong> {{customerName}} ({{customerPhone}})<br>
                <strong>Email:</strong> {{customerEmail}}<br>
                <strong>Total Amount:</strong> ₹{{totalAmount}}<br>
                <strong>Order Time:</strong> {{orderTime}}
              </div>
              
              <div style="margin: 15px 0;">
                <h3 style="color: #1a3a6b;">Items:</h3>
                {{#each items}}
                <div style="border-bottom: 1px solid #eee; padding: 8px 0;">
                  {{name}} - {{mode}} | Qty: {{quantity}} | ₹{{price}}
                </div>
                {{/each}}
              </div>
              
              {{#if isHighValue}}
              <div style="background: #fff3cd; padding: 15px; margin: 15px 0; border-left: 4px solid #ffc107;">
                <strong>⚠️ HIGH VALUE ORDER</strong><br>
                This order exceeds ₹50,000 and requires priority attention.
              </div>
              {{/if}}
              
              <div style="margin-top: 20px;">
                <a href="{{adminPanelUrl}}" style="background: #1a3a6b; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">View in Admin Panel</a>
              </div>
            </div>
          </div>
        `,
        variables: JSON.stringify(['orderNumber', 'customerName', 'customerPhone', 'customerEmail', 'totalAmount', 'orderTime', 'items', 'isHighValue', 'adminPanelUrl'])
      }
    ];
    
    for (const template of defaultTemplates) {
      await client.query(`
        INSERT INTO email_templates (name, subject, html_content, variables)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (name) DO UPDATE SET
          subject = EXCLUDED.subject,
          html_content = EXCLUDED.html_content,
          variables = EXCLUDED.variables,
          updated_at = NOW()
      `, [template.name, template.subject, template.html_content, template.variables]);
    }
    
    console.log('⚙️ Inserting default email settings...');
    
    // Insert default email settings
    const defaultSettings = [
      {
        key: 'admin_emails',
        value: JSON.stringify(['admin@mahalakshmijewellery.com']),
        description: 'List of admin email addresses for notifications'
      },
      {
        key: 'high_value_threshold',
        value: JSON.stringify(50000),
        description: 'Order amount threshold for high-value notifications (in rupees)'
      },
      {
        key: 'brand_config',
        value: JSON.stringify({
          name: 'Mahalakshmi Jewellery',
          logo: '🪷',
          primaryColor: '#6B1A1A',
          secondaryColor: '#C9963A',
          backgroundColor: '#FAF4E8',
          contactEmail: 'info@mahalakshmijewellery.com',
          contactPhone: '+91 XXXXX XXXXX',
          website: 'https://mahalakshmi-imitation-jewellery.onrender.com'
        }),
        description: 'Brand configuration for email templates'
      },
      {
        key: 'email_provider_config',
        value: JSON.stringify({
          primary: 'smtp',
          fallback: ['sendgrid', 'ses'],
          retryAttempts: 3,
          retryDelay: 1000
        }),
        description: 'Email provider configuration and fallback settings'
      }
    ];
    
    for (const setting of defaultSettings) {
      await client.query(`
        INSERT INTO email_settings (setting_key, setting_value, description)
        VALUES ($1, $2, $3)
        ON CONFLICT (setting_key) DO UPDATE SET
          setting_value = EXCLUDED.setting_value,
          description = EXCLUDED.description,
          updated_at = NOW()
      `, [setting.key, setting.value, setting.description]);
    }
    
    await client.query('COMMIT');
    
    console.log('✅ Email notifications database schema created successfully!');
    console.log('📊 Tables created:');
    console.log('   - email_queue (for asynchronous processing)');
    console.log('   - email_templates (for template management)');
    console.log('   - email_logs (for delivery tracking)');
    console.log('   - customer_email_preferences (for opt-in/out)');
    console.log('   - email_settings (for configuration)');
    console.log('📧 Default templates installed:');
    console.log('   - order_confirmation');
    console.log('   - order_status_update');
    console.log('   - rental_reminder');
    console.log('   - admin_new_order');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Run migration if called directly
if (require.main === module) {
  createEmailNotificationsTables()
    .then(() => {
      console.log('🎉 Email notifications migration completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Migration failed:', error);
      process.exit(1);
    });
}

module.exports = { createEmailNotificationsTables };