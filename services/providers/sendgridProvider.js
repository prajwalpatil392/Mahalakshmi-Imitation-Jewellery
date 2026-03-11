/**
 * SendGrid Email Provider
 * Uses SendGrid API for email sending
 */

const BaseProvider = require('./baseProvider');

class SendGridProvider extends BaseProvider {
  constructor(config = {}) {
    super(config);
    this.name = 'sendgrid';
    this.type = 'api';
    this.client = null;
    
    // Initialize SendGrid client if API key is available
    if (config.apiKey || process.env.SENDGRID_API_KEY) {
      this.initializeClient();
    } else {
      console.warn('⚠️ SendGrid API key not provided, provider will not be functional');
    }
  }

  /**
   * Initialize SendGrid client
   */
  initializeClient() {
    try {
      // Note: @sendgrid/mail package needs to be installed
      // npm install @sendgrid/mail
      const sgMail = require('@sendgrid/mail');
      
      const apiKey = this.config.apiKey || process.env.SENDGRID_API_KEY;
      sgMail.setApiKey(apiKey);
      
      this.client = sgMail;
      console.log('📧 SendGrid provider initialized');
      
    } catch (error) {
      console.warn('⚠️ SendGrid package not installed. Run: npm install @sendgrid/mail');
      throw new Error(`SendGrid provider initialization failed: ${error.message}`);
    }
  }

  /**
   * Send email via SendGrid
   * @param {Object} emailData - Email data
   * @returns {Promise<Object>} - Send result
   */
  async send(emailData) {
    if (!this.client) {
      throw new Error('SendGrid client not initialized');
    }

    const preparedData = this.prepareEmailData(emailData);
    
    try {
      const msg = {
        to: preparedData.to,
        from: preparedData.from,
        subject: preparedData.subject,
        html: preparedData.html,
        text: preparedData.text,
        attachments: preparedData.attachments?.map(att => ({
          content: att.content,
          filename: att.filename,
          type: att.contentType,
          disposition: 'attachment'
        }))
      };

      console.log(`📧 Sending email via SendGrid to ${preparedData.to}...`);
      
      const [response] = await this.client.send(msg);
      
      const sendResult = {
        messageId: response.headers['x-message-id'],
        provider: this.name,
        timestamp: new Date().toISOString(),
        to: preparedData.to,
        subject: preparedData.subject,
        status: 'sent',
        statusCode: response.statusCode
      };
      
      this.logSendAttempt(preparedData, 'success', sendResult);
      
      return sendResult;
      
    } catch (error) {
      this.logSendAttempt(preparedData, 'failed', error);
      throw new Error(`SendGrid send failed: ${error.message}`);
    }
  }

  /**
   * Test SendGrid connection
   * @returns {Promise<Object>} - Test result
   */
  async test() {
    if (!this.client) {
      throw new Error('SendGrid client not initialized');
    }

    try {
      console.log(`🧪 Testing SendGrid API...`);
      
      // SendGrid doesn't have a direct connection test, so we'll validate the API key format
      const apiKey = this.config.apiKey || process.env.SENDGRID_API_KEY;
      if (!apiKey || !apiKey.startsWith('SG.')) {
        throw new Error('Invalid SendGrid API key format');
      }
      
      return {
        provider: this.name,
        status: 'success',
        message: 'SendGrid API key format is valid',
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      throw new Error(`SendGrid test failed: ${error.message}`);
    }
  }
}

module.exports = SendGridProvider;