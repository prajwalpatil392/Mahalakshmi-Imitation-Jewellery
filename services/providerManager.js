/**
 * Provider Manager
 * Manages multiple email providers with automatic failover
 */

class ProviderManager {
  constructor(config = {}) {
    this.providers = [];
    this.currentProviderIndex = 0;
    this.failureThreshold = config.failureThreshold || 3;
    this.failureCounts = new Map();
    this.lastFailureTime = new Map();
    this.cooldownPeriod = config.cooldownPeriod || 300000; // 5 minutes
    this.retryAttempts = config.retryAttempts || 3;
    
    // Initialize providers based on config
    this.initializeProviders(config);
  }

  /**
   * Initialize email providers based on configuration
   * @param {Object} config - Provider configuration
   */
  initializeProviders(config) {
    console.log('🔧 Initializing email providers...');
    
    // SMTP Provider (using existing nodemailer setup)
    if (config.smtp || process.env.SMTP_HOST) {
      try {
        const SMTPProvider = require('./providers/smtpProvider');
        const smtpProvider = new SMTPProvider(config.smtp || {
          host: process.env.SMTP_HOST,
          port: process.env.SMTP_PORT || 587,
          secure: process.env.SMTP_SECURE === 'true',
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
          }
        });
        this.providers.push(smtpProvider);
        console.log('✅ SMTP provider initialized');
      } catch (error) {
        console.warn('⚠️ SMTP provider initialization failed:', error.message);
      }
    }
    
    // SendGrid Provider
    if (config.sendgrid || process.env.SENDGRID_API_KEY) {
      try {
        const SendGridProvider = require('./providers/sendgridProvider');
        const sendgridProvider = new SendGridProvider(config.sendgrid || {
          apiKey: process.env.SENDGRID_API_KEY,
          fromEmail: process.env.SENDGRID_FROM_EMAIL || process.env.FROM_EMAIL
        });
        this.providers.push(sendgridProvider);
        console.log('✅ SendGrid provider initialized');
      } catch (error) {
        console.warn('⚠️ SendGrid provider initialization failed:', error.message);
      }
    }
    
    // AWS SES Provider
    if (config.ses || (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY)) {
      try {
        const SESProvider = require('./providers/sesProvider');
        const sesProvider = new SESProvider(config.ses || {
          region: process.env.AWS_REGION || 'us-east-1',
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
          fromEmail: process.env.SES_FROM_EMAIL || process.env.FROM_EMAIL
        });
        this.providers.push(sesProvider);
        console.log('✅ AWS SES provider initialized');
      } catch (error) {
        console.warn('⚠️ AWS SES provider initialization failed:', error.message);
      }
    }
    
    // Fallback to simulation provider if no real providers available
    if (this.providers.length === 0) {
      console.warn('⚠️ No email providers configured, using simulation provider');
      const SimulationProvider = require('./providers/simulationProvider');
      this.providers.push(new SimulationProvider());
    }
    
    console.log(`📧 Initialized ${this.providers.length} email provider(s)`);
  }

  /**
   * Send email with automatic provider failover
   * @param {Object} emailData - Email data to send
   * @returns {Promise<Object>} - Send result
   */
  async sendEmail(emailData) {
    if (this.providers.length === 0) {
      throw new Error('No email providers available');
    }

    let lastError;
    const startTime = Date.now();
    
    // Try each provider in order
    for (let attempt = 0; attempt < this.providers.length; attempt++) {
      const provider = this.getCurrentProvider();
      
      // Skip provider if it's in cooldown period
      if (this.isProviderInCooldown(provider.name)) {
        console.log(`⏸️ Provider ${provider.name} in cooldown, skipping...`);
        this.switchToNextProvider();
        continue;
      }
      
      try {
        console.log(`📧 Attempting to send email via ${provider.name}...`);
        
        const result = await provider.send(emailData);
        
        // Success - record it and return
        this.recordSuccess(provider.name);
        
        const duration = Date.now() - startTime;
        console.log(`✅ Email sent successfully via ${provider.name} in ${duration}ms`);
        
        return {
          ...result,
          provider: provider.name,
          duration,
          attempt: attempt + 1
        };
        
      } catch (error) {
        lastError = error;
        console.error(`❌ Provider ${provider.name} failed:`, error.message);
        
        this.recordFailure(provider.name, error);
        this.switchToNextProvider();
      }
    }
    
    // All providers failed
    const duration = Date.now() - startTime;
    const errorMessage = `All ${this.providers.length} email providers failed. Last error: ${lastError?.message}`;
    
    console.error(`💥 ${errorMessage} (total time: ${duration}ms)`);
    
    throw new Error(errorMessage);
  }

  /**
   * Get current active provider
   * @returns {Object} - Current provider
   */
  getCurrentProvider() {
    return this.providers[this.currentProviderIndex];
  }

  /**
   * Switch to next available provider
   */
  switchToNextProvider() {
    this.currentProviderIndex = (this.currentProviderIndex + 1) % this.providers.length;
  }

  /**
   * Record successful email send
   * @param {string} providerName - Provider name
   */
  recordSuccess(providerName) {
    // Reset failure count on success
    this.failureCounts.set(providerName, 0);
    this.lastFailureTime.delete(providerName);
    
    console.log(`✅ Provider ${providerName} success recorded`);
  }

  /**
   * Record email send failure
   * @param {string} providerName - Provider name
   * @param {Error} error - Error that occurred
   */
  recordFailure(providerName, error) {
    const currentFailures = this.failureCounts.get(providerName) || 0;
    const newFailureCount = currentFailures + 1;
    
    this.failureCounts.set(providerName, newFailureCount);
    this.lastFailureTime.set(providerName, Date.now());
    
    console.log(`❌ Provider ${providerName} failure recorded (${newFailureCount}/${this.failureThreshold})`);
    
    // Log detailed failure information
    this.logProviderFailure(providerName, error, newFailureCount);
  }

  /**
   * Check if provider is in cooldown period
   * @param {string} providerName - Provider name
   * @returns {boolean} - True if in cooldown
   */
  isProviderInCooldown(providerName) {
    const failures = this.failureCounts.get(providerName) || 0;
    const lastFailure = this.lastFailureTime.get(providerName);
    
    if (failures < this.failureThreshold || !lastFailure) {
      return false;
    }
    
    const timeSinceFailure = Date.now() - lastFailure;
    return timeSinceFailure < this.cooldownPeriod;
  }

  /**
   * Log detailed provider failure information
   * @param {string} providerName - Provider name
   * @param {Error} error - Error that occurred
   * @param {number} failureCount - Current failure count
   */
  logProviderFailure(providerName, error, failureCount) {
    const failureInfo = {
      provider: providerName,
      error: error.message,
      failureCount,
      threshold: this.failureThreshold,
      timestamp: new Date().toISOString(),
      inCooldown: failureCount >= this.failureThreshold
    };
    
    console.error('📊 Provider failure details:', failureInfo);
    
    // If threshold reached, log cooldown information
    if (failureCount >= this.failureThreshold) {
      console.warn(`🚫 Provider ${providerName} entering cooldown for ${this.cooldownPeriod / 1000}s`);
    }
  }

  /**
   * Get provider statistics
   * @returns {Object} - Provider statistics
   */
  getProviderStats() {
    const stats = {
      totalProviders: this.providers.length,
      currentProvider: this.getCurrentProvider()?.name || 'none',
      providers: []
    };
    
    this.providers.forEach(provider => {
      const failures = this.failureCounts.get(provider.name) || 0;
      const lastFailure = this.lastFailureTime.get(provider.name);
      const inCooldown = this.isProviderInCooldown(provider.name);
      
      stats.providers.push({
        name: provider.name,
        type: provider.type || 'unknown',
        failures,
        inCooldown,
        lastFailure: lastFailure ? new Date(lastFailure).toISOString() : null,
        isHealthy: failures < this.failureThreshold && !inCooldown
      });
    });
    
    return stats;
  }

  /**
   * Get provider health status
   * @returns {Object} - Health status
   */
  getHealthStatus() {
    const stats = this.getProviderStats();
    const healthyProviders = stats.providers.filter(p => p.isHealthy);
    const totalProviders = stats.providers.length;
    
    let status = 'healthy';
    const issues = [];
    
    if (healthyProviders.length === 0) {
      status = 'unhealthy';
      issues.push('No healthy email providers available');
    } else if (healthyProviders.length < totalProviders) {
      status = 'degraded';
      const unhealthyCount = totalProviders - healthyProviders.length;
      issues.push(`${unhealthyCount}/${totalProviders} providers unhealthy`);
    }
    
    return {
      status,
      issues,
      healthyProviders: healthyProviders.length,
      totalProviders,
      currentProvider: stats.currentProvider,
      providers: stats.providers
    };
  }

  /**
   * Reset provider failure counts (for testing or manual recovery)
   * @param {string} providerName - Optional specific provider to reset
   */
  resetFailures(providerName = null) {
    if (providerName) {
      this.failureCounts.set(providerName, 0);
      this.lastFailureTime.delete(providerName);
      console.log(`🔄 Reset failures for provider: ${providerName}`);
    } else {
      this.failureCounts.clear();
      this.lastFailureTime.clear();
      console.log('🔄 Reset failures for all providers');
    }
  }

  /**
   * Test all providers
   * @returns {Promise<Object>} - Test results
   */
  async testAllProviders() {
    console.log('🧪 Testing all email providers...');
    
    const testEmail = {
      to: 'test@example.com',
      subject: 'Provider Test Email',
      html: '<p>This is a test email to verify provider functionality.</p>',
      text: 'This is a test email to verify provider functionality.'
    };
    
    const results = [];
    
    for (const provider of this.providers) {
      const startTime = Date.now();
      
      try {
        // Use provider's test method if available, otherwise try actual send
        let result;
        if (typeof provider.test === 'function') {
          result = await provider.test();
        } else {
          result = await provider.send(testEmail);
        }
        
        const duration = Date.now() - startTime;
        
        results.push({
          provider: provider.name,
          status: 'success',
          duration,
          result
        });
        
        console.log(`✅ Provider ${provider.name} test passed (${duration}ms)`);
        
      } catch (error) {
        const duration = Date.now() - startTime;
        
        results.push({
          provider: provider.name,
          status: 'failed',
          duration,
          error: error.message
        });
        
        console.error(`❌ Provider ${provider.name} test failed (${duration}ms):`, error.message);
      }
    }
    
    const successCount = results.filter(r => r.status === 'success').length;
    console.log(`🧪 Provider tests completed: ${successCount}/${results.length} passed`);
    
    return {
      totalProviders: results.length,
      successfulProviders: successCount,
      results
    };
  }

  /**
   * Get available provider types
   * @returns {Array} - Array of available provider names
   */
  getAvailableProviders() {
    return this.providers.map(provider => ({
      name: provider.name,
      type: provider.type || 'unknown',
      isHealthy: !this.isProviderInCooldown(provider.name)
    }));
  }
}

module.exports = ProviderManager;