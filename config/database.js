const { Pool } = require('pg');

// Render provides DATABASE_URL, use it if available
const pool = process.env.DATABASE_URL 
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      // Optimize connection pool for better performance
      max: 20, // Maximum number of clients in the pool
      idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
      connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection could not be established
      maxUses: 7500, // Close (and replace) a connection after it has been used 7500 times
    })
  : new Pool({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database: process.env.DB_NAME || 'mahalakshmi',
      port: process.env.DB_PORT || 5432,
      ssl: false,
      // Optimize connection pool for better performance
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
      maxUses: 7500,
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
