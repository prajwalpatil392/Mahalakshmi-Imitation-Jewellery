const { Pool } = require('pg');

// PostgreSQL pool configuration
const pgPool = new Pool({
  connectionString: process.env.DATABASE_URL,
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 5432,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

/**
 * Convert MySQL-style ? placeholders to PostgreSQL $1, $2, $3...
 * Handles arrays for IN clauses properly
 */
function convertToPostgres(sql, params = []) {
  let paramIndex = 0;
  const flatParams = [];
  
  const pgSql = sql.replace(/\?/g, () => {
    const param = params[paramIndex++];
    
    // Handle arrays for IN clauses
    if (Array.isArray(param)) {
      const placeholders = param.map(() => `$${flatParams.length + 1 + flatParams.push(param.shift()) - 1}`);
      param.forEach(p => flatParams.push(p));
      return `(${placeholders.join(', ')})`;
    }
    
    flatParams.push(param);
    return `$${flatParams.length}`;
  });
  
  return { sql: pgSql, params: flatParams };
}

const db = {
  /**
   * Query with MySQL-style ? placeholders (auto-converted to PostgreSQL)
   * Returns [rows, fields] for MySQL compatibility
   */
  query: async (sql, params = []) => {
    const { sql: pgSql, params: pgParams } = convertToPostgres(sql, params);
    const result = await pgPool.query(pgSql, pgParams);
    const rows = result.rows || [];
    
    // Add MySQL-compatible properties
    rows.insertId = rows[0]?.id || null;
    rows.affectedRows = result.rowCount;
    
    return [rows, result.fields];
  },

  execute: async (sql, params = []) => {
    return db.query(sql, params);
  },

  /**
   * Get a connection for transactions
   */
  getConnection: async () => {
    const client = await pgPool.connect();

    return {
      beginTransaction: () => client.query('BEGIN'),
      commit: () => client.query('COMMIT'),
      rollback: () => client.query('ROLLBACK'),
      
      query: async (sql, params = []) => {
        const { sql: pgSql, params: pgParams } = convertToPostgres(sql, params);
        const result = await client.query(pgSql, pgParams);
        const rows = result.rows || [];
        
        rows.insertId = rows[0]?.id || null;
        rows.affectedRows = result.rowCount;
        
        return [rows, result.fields];
      },
      
      release: () => client.release()
    };
  },

  end: () => pgPool.end()
};

module.exports = db;
