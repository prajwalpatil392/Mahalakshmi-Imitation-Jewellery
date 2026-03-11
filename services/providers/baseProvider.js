/**
 * Base Email Provider
 * Abstract base class for all email providers
 */

class BaseProvider {
  constructor(config = {}) {
    this.config = config;
    this.name = this.constructor.name.replace('Provider', '').toLowerCase();
    this.type = 'base';
  }

  /**
   * Send email - must be implemented by subclasses
   * @param {Object} emailData - Email data
   * @returns {Promise<Object>} - Send result
   */
  async send(emailData) {
    throw new Error(`send() method must be implemented by ${this.constructor.name}`);
  }

  /**
   * Test provider connection - optional override
   * @returns {Promise<Object>} - Test result
   */
  async test() {
    // Default test implementation - try to send a test email
    return this.send({
      to: 'test@example.com',
      subject: 'Provider Test',
      html: '<p>Test email</p>',
      text: 'Test email'
    });
  }

  /**
   * Validate email data
   * @param {Object} emailData - Email data to validate
   * @throws {Error} - If validation fails
   */
  validateEmailData(emailData) {
    if (!emailData) {
      throw new Error('Email data is required');
    }

    if (!emailData.to) {
      throw new Error('Recipient email address is required');
    }

    if (!emailData.subject) {
      throw new Error('Email subject is required');
    }

    if (!emailData.html && !emailData.text) {
      throw new Error('Email content (html or text) is required');
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailData.to)) {
      throw new Error(`Invalid email address: ${emailData.to}`);
    }
  }

  /**
   * Prepare email data for sending
   * @param {Object} emailData - Raw email data
   * @returns {Object} - Prepared email data
   */
  prepareEmailData(emailData) {
    this.validateEmailData(emailData);

    return {
      to: emailData.to,
      from: emailData.from || this.config.fromEmail || process.env.FROM_EMAIL || 'noreply@mahalakshmijewellery.com',
      subject: emailData.subject,
      html: emailData.html,
      text: emailData.text,
      attachments: emailData.attachments || [],
      headers: emailData.headers || {}
    };
  }

  /**
   * Log send attempt
   * @param {Object} emailData - Email data
   * @param {string} status - Send status
   * @param {Object} result - Send result or error
   */
  logSendAttempt(emailData, status, result) {
    const logData = {
      provider: this.name,
      to: emailData.to,
      subject: emailData.subject,
      status,
      timestamp: new Date().toISOString()
    };

    if (status === 'success') {
      console.log(`📧 [${this.name}] Email sent successfully:`, logData);
    } else {
      console.error(`❌ [${this.name}] Email send failed:`, { ...logData, error: result?.message });
    }
  }
}

module.exports = BaseProvider;