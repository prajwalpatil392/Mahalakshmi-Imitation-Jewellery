/**
 * Email Queue Manager
 * Handles asynchronous email processing with priority handling and retry logic
 */

const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');

class EmailQueueManager {
  constructor(config = {}) {
    this.db = config.database || db;
    this.workers = config.workers || 3;
    this.retryAttempts = config.retryAttempts || 3;
    this.retryDelay = config.retryDelay || 1000;
    this.maxRetryDelay = config.maxRetryDelay || 30000;
    this.backoffMultiplier = config.backoffMultiplier || 2;
    this.processingInterval = config.processingInterval || 5000; // 5 seconds
    this.isProcessing = false;
    this.processingTimer = null;
    
    // Priority levels (lower number = higher priority)
    this.priorities = {
      high: 1,
      medium: 5,
      low: 10
    };
  }

  /**
   * Queue an email for sending
   * @param {string} type - Email type (order_confirmation, status_update, etc.)
   * @param {Object} emailData - Email data including recipient, data, priority
   * @returns {Promise<string>} - Queue item ID
   */
  async queueEmail(type, emailData) {
    try {
      const queueItem = {
        id: uuidv4(),
        type,
        recipient: emailData.to,
        data: JSON.stringify(emailData.data || {}),
        priority: this.getPriorityValue(emailData.priority || 'medium'),
        status: 'queued',
        attempts: 0,
        created_at: new Date(),
        scheduled_for: emailData.scheduledFor || new Date()
      };

      await this.db.queryCompat(
        `INSERT INTO email_queue (id, type, recipient, data, priority, status, attempts, created_at, scheduled_for) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          queueItem.id,
          queueItem.type,
          queueItem.recipient,
          queueItem.data,
          queueItem.priority,
          queueItem.status,
          queueItem.attempts,
          queueItem.created_at,
          queueItem.scheduled_for
        ]
      );

      console.log(`📧 Email queued: ${type} to ${emailData.to} (ID: ${queueItem.id})`);
      
      // Start processing if not already running
      if (!this.isProcessing) {
        this.startProcessing();
      }

      return queueItem.id;
    } catch (error) {
      console.error('❌ Failed to queue email:', error);
      throw error;
    }
  }

  /**
   * Get priority value from string
   * @param {string} priority - Priority level (high, medium, low)
   * @returns {number} - Numeric priority value
   */
  getPriorityValue(priority) {
    return this.priorities[priority] || this.priorities.medium;
  }

  /**
   * Start queue processing
   */
  startProcessing() {
    if (this.isProcessing) return;
    
    this.isProcessing = true;
    console.log('🚀 Starting email queue processing...');
    
    this.processingTimer = setInterval(async () => {
      try {
        await this.processQueue();
      } catch (error) {
        console.error('❌ Queue processing error:', error);
      }
    }, this.processingInterval);
  }

  /**
   * Stop queue processing
   */
  stopProcessing() {
    if (!this.isProcessing) return;
    
    this.isProcessing = false;
    if (this.processingTimer) {
      clearInterval(this.processingTimer);
      this.processingTimer = null;
    }
    
    console.log('⏹️ Email queue processing stopped');
  }

  /**
   * Process queued emails
   */
  async processQueue() {
    try {
      const items = await this.getQueuedItems();
      
      if (items.length === 0) {
        return; // No items to process
      }

      console.log(`📬 Processing ${Math.min(items.length, this.workers)} emails from queue...`);
      
      // Process up to 'workers' number of items concurrently
      const workers = items.slice(0, this.workers).map(item => 
        this.processQueueItem(item).catch(error => {
          console.error(`❌ Worker failed for item ${item.id}:`, error);
        })
      );
      
      await Promise.allSettled(workers);
    } catch (error) {
      console.error('❌ Queue processing failed:', error);
    }
  }

  /**
   * Get queued items ready for processing
   * @returns {Promise<Array>} - Array of queue items
   */
  async getQueuedItems() {
    const [items] = await this.db.queryCompat(`
      SELECT * FROM email_queue 
      WHERE status = 'queued' 
      AND scheduled_for <= NOW()
      AND attempts < $1
      ORDER BY priority ASC, created_at ASC
      LIMIT $2
    `, [this.retryAttempts, this.workers * 2]); // Get extra items in case some are locked

    return items;
  }

  /**
   * Process a single queue item
   * @param {Object} item - Queue item to process
   */
  async processQueueItem(item) {
    try {
      // Update status to processing
      await this.updateItemStatus(item.id, 'processing');
      
      console.log(`📧 Processing email: ${item.type} to ${item.recipient} (attempt ${item.attempts + 1})`);
      
      // Parse email data
      let emailData;
      try {
        emailData = typeof item.data === 'string' ? JSON.parse(item.data) : item.data;
      } catch (parseError) {
        console.error(`❌ Failed to parse email data for ${item.id}:`, parseError);
        emailData = {}; // Use empty object as fallback
      }
      
      // Here we would call the actual email service
      // For now, we'll simulate the email sending
      const result = await this.simulateEmailSending(item, emailData);
      
      // Update status to sent
      await this.updateItemStatus(item.id, 'sent', { 
        sent_at: new Date(),
        provider_response: result 
      });
      
      console.log(`✅ Email sent successfully: ${item.type} to ${item.recipient}`);
      
    } catch (error) {
      console.error(`❌ Failed to process email ${item.id}:`, error);
      await this.handleFailure(item, error);
    }
  }

  /**
   * Simulate email sending (will be replaced with actual email service)
   * @param {Object} item - Queue item
   * @param {Object} emailData - Email data
   * @returns {Promise<Object>} - Simulated result
   */
  async simulateEmailSending(item, emailData) {
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200));
    
    // Simulate occasional failures for testing retry logic
    if (Math.random() < 0.1) { // 10% failure rate for testing
      throw new Error('Simulated email provider failure');
    }
    
    return {
      messageId: `sim-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      provider: 'simulation',
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Update queue item status
   * @param {string} itemId - Queue item ID
   * @param {string} status - New status
   * @param {Object} additionalData - Additional data to update
   */
  async updateItemStatus(itemId, status, additionalData = {}) {
    const updateFields = ['status = $2'];
    const updateValues = [itemId, status];
    let paramIndex = 3;

    // Add additional fields to update
    Object.entries(additionalData).forEach(([key, value]) => {
      updateFields.push(`${key} = $${paramIndex}`);
      updateValues.push(value);
      paramIndex++;
    });

    const query = `
      UPDATE email_queue 
      SET ${updateFields.join(', ')}
      WHERE id = $1
    `;

    await this.db.queryCompat(query, updateValues);
  }

  /**
   * Handle email sending failure with retry logic
   * @param {Object} item - Failed queue item
   * @param {Error} error - Error that occurred
   */
  async handleFailure(item, error) {
    const newAttempts = item.attempts + 1;
    
    if (newAttempts >= this.retryAttempts) {
      // Max attempts reached, mark as failed
      await this.updateItemStatus(item.id, 'failed', {
        attempts: newAttempts,
        error_message: error.message
      });
      
      console.error(`💥 Email permanently failed after ${newAttempts} attempts: ${item.id}`);
      
      // Move to dead letter queue or alert administrators
      await this.handlePermanentFailure(item, error);
    } else {
      // Calculate retry delay with exponential backoff
      const delay = Math.min(
        this.retryDelay * Math.pow(this.backoffMultiplier, newAttempts - 1),
        this.maxRetryDelay
      );
      
      const nextAttempt = new Date(Date.now() + delay);
      
      await this.updateItemStatus(item.id, 'queued', {
        attempts: newAttempts,
        scheduled_for: nextAttempt,
        error_message: error.message
      });
      
      console.log(`🔄 Email retry scheduled: ${item.id} (attempt ${newAttempts}/${this.retryAttempts}) in ${delay}ms`);
    }
  }

  /**
   * Handle permanent email failure
   * @param {Object} item - Failed queue item
   * @param {Error} error - Error that occurred
   */
  async handlePermanentFailure(item, error) {
    // Log the permanent failure
    console.error(`💀 Permanent email failure:`, {
      id: item.id,
      type: item.type,
      recipient: item.recipient,
      attempts: item.attempts + 1,
      error: error.message
    });
    
    // Here you could:
    // 1. Send alert to administrators
    // 2. Move to dead letter queue
    // 3. Log to external monitoring service
    // 4. Trigger fallback notification mechanism
    
    // For now, we'll just ensure it's logged
    try {
      // Could implement dead letter queue here
      console.log(`📝 Logged permanent failure for email ${item.id}`);
    } catch (logError) {
      console.error('❌ Failed to log permanent failure:', logError);
    }
  }

  /**
   * Get queue statistics
   * @returns {Promise<Object>} - Queue statistics
   */
  async getQueueStats() {
    try {
      const [stats] = await this.db.queryCompat(`
        SELECT 
          status,
          priority,
          COUNT(*) as count,
          MIN(created_at) as oldest,
          MAX(created_at) as newest
        FROM email_queue 
        GROUP BY status, priority
        ORDER BY status, priority
      `);

      const [summary] = await this.db.queryCompat(`
        SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN status = 'queued' THEN 1 END) as queued,
          COUNT(CASE WHEN status = 'processing' THEN 1 END) as processing,
          COUNT(CASE WHEN status = 'sent' THEN 1 END) as sent,
          COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed,
          AVG(CASE WHEN status = 'sent' THEN EXTRACT(EPOCH FROM (sent_at - created_at)) END) as avg_processing_time
        FROM email_queue
      `);

      return {
        summary: summary[0] || {},
        details: stats,
        isProcessing: this.isProcessing,
        workers: this.workers,
        retryAttempts: this.retryAttempts
      };
    } catch (error) {
      console.error('❌ Failed to get queue stats:', error);
      throw error;
    }
  }

  /**
   * Get queue health status
   * @returns {Promise<Object>} - Health status
   */
  async getHealthStatus() {
    try {
      const stats = await this.getQueueStats();
      const summary = stats.summary;
      
      // Calculate health metrics
      const totalEmails = parseInt(summary.total) || 0;
      const queuedEmails = parseInt(summary.queued) || 0;
      const failedEmails = parseInt(summary.failed) || 0;
      const processingEmails = parseInt(summary.processing) || 0;
      
      const failureRate = totalEmails > 0 ? (failedEmails / totalEmails) * 100 : 0;
      const queueBacklog = queuedEmails + processingEmails;
      
      // Determine health status
      let status = 'healthy';
      const issues = [];
      
      if (!this.isProcessing) {
        status = 'unhealthy';
        issues.push('Queue processing is stopped');
      }
      
      if (failureRate > 10) {
        status = 'degraded';
        issues.push(`High failure rate: ${failureRate.toFixed(1)}%`);
      }
      
      if (queueBacklog > 100) {
        status = 'degraded';
        issues.push(`Large queue backlog: ${queueBacklog} emails`);
      }
      
      return {
        status,
        issues,
        metrics: {
          totalEmails,
          queuedEmails,
          failedEmails,
          processingEmails,
          failureRate: parseFloat(failureRate.toFixed(2)),
          queueBacklog,
          avgProcessingTime: parseFloat(summary.avg_processing_time) || 0,
          isProcessing: this.isProcessing
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        issues: [`Health check failed: ${error.message}`],
        metrics: {},
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Clean up old processed emails
   * @param {number} daysOld - Remove emails older than this many days
   * @returns {Promise<number>} - Number of emails removed
   */
  async cleanupOldEmails(daysOld = 30) {
    try {
      const [result] = await this.db.queryCompat(`
        DELETE FROM email_queue 
        WHERE status IN ('sent', 'failed') 
        AND created_at < NOW() - INTERVAL '${daysOld} days'
      `);
      
      const deletedCount = result.affectedRows || result.rowCount || 0;
      console.log(`🧹 Cleaned up ${deletedCount} old emails (older than ${daysOld} days)`);
      
      return deletedCount;
    } catch (error) {
      console.error('❌ Failed to cleanup old emails:', error);
      throw error;
    }
  }
}

module.exports = EmailQueueManager;