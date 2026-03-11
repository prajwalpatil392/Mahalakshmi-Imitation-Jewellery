/**
 * SMTP Email Provider
 * Uses nodemailer for SMTP email sending
 */

const BaseProvider = require('./baseProvider');

class SMTPProvider extends BaseProvider {
  constructor(config = {}) {
    super(config);
    this.name = 'smtp';
    this.type = 'smtp';
    this.transporter = null;
    
    this.initializeTransporter();
  }

  /**
   * Initialize nodemailer transporter
   */
  initializeTransporter() {
    try {
      const nodemailer = require('nodemailer');
      
      const transportConfig = {
        host: this.config.host || process.env.SMTP_HOST,
        port: this.config.port || process.env.SMTP_PORT || 587,
        secure: this.config.secure || process.env.SMTP_SECURE === 'true',
        auth: {
          user: this.config.auth?.user || process.env.SMTP_USER,
          pass: this.config.auth?.pass || process.env.SMTP_PASS
        },
        // Connection pool settings
        pool: true,
        maxConnections: 5,
        maxMessages: 100,
        // Security settings
        requireTLS: true,
        tls: {
          rejectUnauthorized: false // Allow self-signed certificates in development
        }
      };

      this.transporter = nodemailer.createTransporter(transportConfig);
      
      console.log(`📧 SMTP provider initialized: ${transportConfig.host}:${transportConfig.port}`);
      
    } catch (error) {
      console.error('❌ Failed to initialize SMTP provider:', error.message);
      throw new Error(`SMTP provider initialization failed: ${error.message}`);
    }
  }

  /**
   * Send email via SMTP
   * @param {Object} emailData - Email data
   * @returns {Promise<Object>} - Send result
   */
  async send(emailData) {
    if (!this.transporter) {
      throw new Error('SMTP transporter not initialized');
    }

    const preparedData = this.prepareEmailData(emailData);
    
    try {
      // Convert to nodemailer format
      const mailOptions = {
        from: preparedData.from,
        to: preparedData.to,
        subject: preparedData.subject,
        html: preparedData.html,
        text: preparedData.text,
        attachments: preparedData.attachments,
        headers: preparedData.headers
      };

      console.log(`📧 Sending email via SMTP to ${preparedData.to}...`);
      
      const result = await this.transporter.sendMail(mailOptions);
      
      const sendResult = {
        messageId: result.messageId,
        provider: this.name,
        timestamp: new Date().toISOString(),
        to: preparedData.to,
        subject: preparedData.subject,
        status: 'sent',
        response: result.response
      };
      
      this.logSendAttempt(preparedData, 'success', sendResult);
      
      return sendResult;
      
    } catch (error) {
      this.logSendAttempt(preparedData, 'failed', error);
      throw new Error(`SMTP send failed: ${error.message}`);
    }
  }

  /**
   * Test SMTP connection
   * @returns {Promise<Object>} - Test result
   */
  async test() {
    if (!this.transporter) {
      throw new Error('SMTP transporter not initialized');
    }

    try {
      console.log(`🧪 Testing SMTP connection...`);
      
      // Verify connection
      await this.transporter.verify();
      
      return {
        provider: this.name,
        status: 'success',
        message: 'SMTP connection verified successfully',
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      throw new Error(`SMTP connection test failed: ${error.message}`);
    }
  }

  /**
   * Close SMTP connection pool
   */
  close() {
    if (this.transporter) {
      this.transporter.close();
      console.log('📧 SMTP connection pool closed');
    }
  }
}

module.exports = SMTPProvider;