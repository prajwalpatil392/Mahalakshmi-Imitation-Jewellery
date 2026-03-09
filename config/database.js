const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'mahalakshmi',
  port: process.env.DB_PORT || 5432,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Helper function to convert MySQL-style queries to PostgreSQL
pool.queryCompat = async function(sql, params = []) {
  // Convert ? placeholders to $1, $2, etc.
  let index = 0;
  const pgSql = sql.replace(/\?/g, () => `$${++index}`);
  const result = await pool.query(pgSql, params);
  
  // Return MySQL-compatible format [rows]
  return [result.rows];
};

module.exports = pool;
