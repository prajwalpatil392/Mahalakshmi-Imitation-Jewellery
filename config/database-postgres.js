const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'mahalakshmi',
  port: process.env.DB_PORT || 5432,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// PostgreSQL uses $1, $2 syntax instead of ? for parameterized queries
// This wrapper helps maintain compatibility
pool.queryCompat = async (sql, params) => {
  // Convert MySQL ? placeholders to PostgreSQL $1, $2, etc.
  let index = 0;
  const pgSql = sql.replace(/\?/g, () => `$${++index}`);
  return pool.query(pgSql, params);
};

module.exports = pool;
