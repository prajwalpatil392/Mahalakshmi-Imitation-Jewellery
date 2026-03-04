const mysql = require('mysql2/promise');

// Use PostgreSQL for production (Railway), MySQL for local development
const isProduction = process.env.NODE_ENV === 'production';
const usePostgres = isProduction || process.env.USE_POSTGRES === 'true';

let pool;

if (usePostgres) {
  // PostgreSQL configuration
  const { Pool } = require('pg');
  const pgPool = new Pool({
    connectionString: process.env.DATABASE_URL,
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'mahalakshmi',
    port: process.env.DB_PORT || 5432,
    max: 10,
    ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
  });

  // MySQL-compatible wrapper for PostgreSQL
  pool = {
    query: async (sql, params = []) => {
      let index = 0;
      let pgSql = sql.replace(/\?/g, () => `$${++index}`);
      
      // Auto-add RETURNING id for INSERT statements
      if (pgSql.trim().toUpperCase().startsWith('INSERT') && !pgSql.toUpperCase().includes('RETURNING')) {
        pgSql += ' RETURNING id';
      }
      
      const result = await pgPool.query(pgSql, params);
      
      // Return [rows, fields] format like MySQL does
      // Attach metadata to rows array for compatibility
      const rows = result.rows;
      rows.insertId = result.rows[0]?.id || null;
      rows.affectedRows = result.rowCount;
      
      return [rows, result.fields];
    },
    execute: async (sql, params) => pool.query(sql, params),
    getConnection: async () => {
      // For PostgreSQL, return a mock connection object
      return {
        query: (sql, params) => pgPool.query(sql, params),
        release: () => Promise.resolve(),
        end: () => pgPool.end()
      };
    },
    end: () => pgPool.end()
  };
} else {
  // MySQL configuration (local development)
  const mysqlPool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'mahalakshmi',
    port: process.env.DB_PORT || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  });

  pool = {
    query: (sql, params) => mysqlPool.query(sql, params),
    execute: (sql, params) => mysqlPool.execute(sql, params),
    getConnection: () => mysqlPool.getConnection(),
    end: () => mysqlPool.end()
  };
}

module.exports = pool;
