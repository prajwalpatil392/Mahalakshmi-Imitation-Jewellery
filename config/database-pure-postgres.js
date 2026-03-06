const { Pool } = require('pg');

// Pure PostgreSQL pool configuration
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Log connection status
pool.on('connect', () => {
  console.log('✅ PostgreSQL client connected');
});

pool.on('error', (err) => {
  console.error('❌ Unexpected PostgreSQL error:', err);
});

const db = {
  /**
   * Execute a query with PostgreSQL syntax ($1, $2, $3...)
   * Returns { rows, rowCount, fields }
   */
  query: async (text, params = []) => {
    const start = Date.now();
    try {
      const result = await pool.query(text, params);
      const duration = Date.now() - start;
      
      if (duration > 1000) {
        console.warn(`⚠️ Slow query (${duration}ms):`, text.substring(0, 100));
      }
      
      return result;
    } catch (error) {
      console.error('❌ Query error:', error.message);
      console.error('Query:', text);
      console.error('Params:', params);
      throw error;
    }
  },

  /**
   * Get a connection for transactions
   */
  getConnection: async () => {
    const client = await pool.connect();
    
    return {
      query: (text, params) => client.query(text, params),
      
      beginTransaction: () => client.query('BEGIN'),
      commit: () => client.query('COMMIT'),
      rollback: () => client.query('ROLLBACK'),
      
      release: () => client.release(),
      
      // Helper for safe release
      end: () => client.release()
    };
  },

  /**
   * Execute multiple queries in a transaction
   */
  transaction: async (callback) => {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },

  /**
   * Close all connections
   */
  end: () => pool.end()
};

module.exports = db;
