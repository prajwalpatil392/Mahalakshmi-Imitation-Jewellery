const { Pool } = require('pg');
const logger = require('./logger');

// Optimized database connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  
  // Connection pool settings
  max: 20, // Maximum connections
  min: 2,  // Minimum connections
  
  // Connection timeout
  connectionTimeoutMillis: 5000,
  
  // Idle timeout - close idle connections after 30 seconds
  idleTimeoutMillis: 30000,
  
  // Statement timeout - kill queries taking longer than 30 seconds
  statement_timeout: 30000,
  
  // Keep alive
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000
});

// Pool error handling
pool.on('error', (err, client) => {
  logger.error('Unexpected error on idle client', err);
});

// Pool connection monitoring
pool.on('connect', (client) => {
  logger.info('New client connected to database');
});

pool.on('remove', (client) => {
  logger.info('Client removed from pool');
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, closing database pool');
  await pool.end();
});

// Query wrapper with automatic retry
const query = async (text, params, retries = 3) => {
  for (let i = 0; i < retries; i++) {
    try {
      const start = Date.now();
      const result = await pool.query(text, params);
      const duration = Date.now() - start;
      
      if (duration > 1000) {
        logger.warn(`Slow query detected: ${duration}ms`, { query: text });
      }
      
      return result;
    } catch (error) {
      if (i === retries - 1) throw error;
      
      // Retry on connection errors
      if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
        logger.warn(`Database query failed, retrying... (${i + 1}/${retries})`);
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
      } else {
        throw error;
      }
    }
  }
};

module.exports = {
  query,
  pool
};
