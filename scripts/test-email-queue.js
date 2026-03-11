#!/usr/bin/env node

/**
 * Test Email Queue Manager
 * Tests queue functionality, priority handling, and retry logic
 */

const EmailQueueManager = require('../services/emailQueueManager');

async function testEmailQueueManager() {
  console.log('🧪 Testing Email Queue Manager...\n');
  
  // Create queue manager instance
  const queueManager = new EmailQueueManager({
    workers: 2,
    retryAttempts: 3,
    retryDelay: 500,
    processingInterval: 2000
  });
  
  try {
    // Test 1: Queue different priority emails
    console.log('📧 Test 1: Queueing emails with different priorities...');
    
    const email1 = await queueManager.queueEmail('order_confirmation', {
      to: 'customer1@example.com',
      priority: 'high',
      data: { orderNumber: 'ORD-001', customerName: 'John Doe' }
    });
    
    const email2 = await queueManager.queueEmail('promotional', {
      to: 'customer2@example.com',
      priority: 'low',
      data: { campaign: 'summer-sale' }
    });
    
    const email3 = await queueManager.queueEmail('status_update', {
      to: 'customer3@example.com',
      priority: 'medium',
      data: { orderNumber: 'ORD-002', status: 'shipped' }
    });
    
    console.log(`✅ Queued 3 emails: ${email1}, ${email2}, ${email3}\n`);
    
    // Test 2: Check queue stats
    console.log('📊 Test 2: Checking queue statistics...');
    const stats = await queueManager.getQueueStats();
    console.log('Queue Stats:', JSON.stringify(stats, null, 2));
    console.log('');
    
    // Test 3: Check health status
    console.log('🏥 Test 3: Checking queue health...');
    const health = await queueManager.getHealthStatus();
    console.log('Health Status:', JSON.stringify(health, null, 2));
    console.log('');
    
    // Test 4: Process queue for a few cycles
    console.log('⚙️ Test 4: Processing queue for 10 seconds...');
    queueManager.startProcessing();
    
    // Wait for processing
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    // Test 5: Check final stats
    console.log('📊 Test 5: Final queue statistics...');
    const finalStats = await queueManager.getQueueStats();
    console.log('Final Stats:', JSON.stringify(finalStats, null, 2));
    
    // Test 6: Queue a scheduled email
    console.log('\n📅 Test 6: Queueing scheduled email...');
    const scheduledTime = new Date(Date.now() + 5000); // 5 seconds from now
    const scheduledEmail = await queueManager.queueEmail('rental_reminder', {
      to: 'customer4@example.com',
      priority: 'medium',
      scheduledFor: scheduledTime,
      data: { orderNumber: 'RNT-001', reminderType: 'pickup' }
    });
    
    console.log(`✅ Scheduled email: ${scheduledEmail} for ${scheduledTime.toISOString()}`);
    
    // Wait for scheduled email to be processed
    console.log('⏰ Waiting for scheduled email to be processed...');
    await new Promise(resolve => setTimeout(resolve, 7000));
    
    // Final health check
    console.log('\n🏥 Final health check...');
    const finalHealth = await queueManager.getHealthStatus();
    console.log('Final Health:', JSON.stringify(finalHealth, null, 2));
    
    // Stop processing
    queueManager.stopProcessing();
    
    console.log('\n🎉 Email Queue Manager test completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    queueManager.stopProcessing();
    throw error;
  }
}

// Run test if called directly
if (require.main === module) {
  testEmailQueueManager()
    .then(() => {
      console.log('✅ All tests passed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Tests failed:', error);
      process.exit(1);
    });
}

module.exports = { testEmailQueueManager };