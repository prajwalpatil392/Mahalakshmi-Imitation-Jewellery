const { pool } = require('./dbPool');
const logger = require('./logger');

// Comprehensive health check system
class HealthCheck {
  constructor() {
    this.checks = {
      database: { status: 'unknown', lastCheck: null },
      memory: { status: 'unknown', lastCheck: null },
      uptime: { status: 'unknown', lastCheck: null }
    };
    
    // Run health checks every 30 seconds
    setInterval(() => this.runChecks(), 30000);
    
    // Initial check
    this.runChecks();
  }

  async checkDatabase() {
    try {
      const start = Date.now();
      await pool.query('SELECT 1');
      const responseTime = Date.now() - start;
      
      return {
        status: responseTime < 1000 ? 'healthy' : 'degraded',
        responseTime: `${responseTime}ms`,
        lastCheck: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Database health check failed:', error);
      return {
        status: 'unhealthy',
        error: error.message,
        lastCheck: new Date().toISOString()
      };
    }
  }

  checkMemory() {
    const memUsage = process.memoryUsage();
    const memPercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;
    
    let status = 'healthy';
    if (memPercent > 90) status = 'critical';
    else if (memPercent > 75) status = 'warning';
    
    return {
      status,
      heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
      heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`,
      percentage: `${memPercent.toFixed(2)}%`,
      lastCheck: new Date().toISOString()
    };
  }

  checkUptime() {
    const uptime = process.uptime();
    const hours = Math.floor(uptime / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    
    return {
      status: 'healthy',
      uptime: `${hours}h ${minutes}m`,
      uptimeSeconds: Math.floor(uptime),
      lastCheck: new Date().toISOString()
    };
  }

  async runChecks() {
    this.checks.database = await this.checkDatabase();
    this.checks.memory = this.checkMemory();
    this.checks.uptime = this.checkUptime();
    
    // Log warnings
    if (this.checks.database.status !== 'healthy') {
      logger.warn('Database health check warning:', this.checks.database);
    }
    if (this.checks.memory.status !== 'healthy') {
      logger.warn('Memory health check warning:', this.checks.memory);
    }
  }

  getStatus() {
    const overallHealthy = 
      this.checks.database.status === 'healthy' &&
      this.checks.memory.status === 'healthy';
    
    return {
      status: overallHealthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      checks: this.checks
    };
  }

  // Middleware for health endpoint
  middleware() {
    return async (req, res) => {
      const status = this.getStatus();
      const httpStatus = status.status === 'healthy' ? 200 : 503;
      res.status(httpStatus).json(status);
    };
  }
}

module.exports = new HealthCheck();
