/**
 * Simulation Email Provider
 * Simulates email sending for testing and development
 */

const BaseProvider = require('./baseProvider');

class SimulationProvider extends BaseProvider {
  constructor(config = {}) {
    super(config);
    this.name = 'simulation';
    this.type = 'simulation';
    this.failureRate = config.failureRate || 0.1; // 10% failure rate by default
    this.delay = config.delay || { min: 50, max: 200 }; // Simulate network delay
  }

  /**
   * Simulate email sending
   * @param {Object} emailData - Email data
   * @returns {Promise<Object>} - Simulated result
   */
  async send(emailData) {
    const preparedData = this.prepareEmailData(emailData);
    
    // Simulate processing delay
    const delay = Math.random() * (this.delay.max - this.delay.min) + this.delay.min;
    await new Promise(resolve => setTimeout(resolve, delay));
    
    // Simulate occasional failures
    if (Math.random() < this.failureRate) {
      const error = new Error('Simulated email provider failure');
      this.logSendAttempt(preparedData, 'failed', error);
      throw error;
    }
    
    // Generate simulated result
    const result = {
      messageId: `sim-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      provider: this.name,
      timestamp: new Date().toISOString(),
      to: preparedData.to,
      subject: preparedData.subject,
      status: 'sent'
    };
    
    this.logSendAttempt(preparedData, 'success', result);
    
    return result;
  }

  /**
   * Test simulation provider
   * @returns {Promise<Object>} - Test result
   */
  async test() {
    console.log(`🧪 Testing ${this.name} provider...`);
    
    // Simulate test delay
    await new Promise(resolve => setTimeout(resolve, 100));
    
    return {
      provider: this.name,
      status: 'success',
      message: 'Simulation provider is working correctly',
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Set failure rate for testing
   * @param {number} rate - Failure rate (0-1)
   */
  setFailureRate(rate) {
    this.failureRate = Math.max(0, Math.min(1, rate));
    console.log(`🎛️ Simulation provider failure rate set to ${(this.failureRate * 100).toFixed(1)}%`);
  }

  /**
   * Set delay range for testing
   * @param {Object} delay - Delay configuration {min, max}
   */
  setDelay(delay) {
    this.delay = {
      min: Math.max(0, delay.min || 0),
      max: Math.max(delay.min || 0, delay.max || 100)
    };
    console.log(`⏱️ Simulation provider delay set to ${this.delay.min}-${this.delay.max}ms`);
  }
}

module.exports = SimulationProvider;