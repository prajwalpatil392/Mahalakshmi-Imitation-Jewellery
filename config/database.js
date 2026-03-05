const { Pool } = require('pg');

// Single PostgreSQL pool used everywhere (Render + local Postgres)
const pgPool = new Pool({
  connectionString: process.env.DATABASE_URL,
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
});

/**
 * Convert MySQL-style SQL with ? placeholders (and IN (?)) into
 * PostgreSQL-style $1, $2, ... and flatten array params.
 */
function toPostgres(sql, params = []) {
  const parts = sql.split('?');
  const newParams = [];
  let paramIndex = 0;
  let pgSql = parts[0];

  for (let i = 0; i < params.length; i++) {
    const param = params[i];
    if (Array.isArray(param)) {
      // Expand IN (?) array → IN ($1,$2,...)
      const placeholders = param.map(() => `$${++paramIndex}`).join(',');
      pgSql += placeholders;
      newParams.push(...param);
    } else {
      pgSql += `$${++paramIndex}`;
      newParams.push(param);
    }
    pgSql += parts[i + 1] || '';
  }

  // Auto-add RETURNING id for INSERT statements when not explicitly present
  const upper = pgSql.trim().toUpperCase();
  if (upper.startsWith('INSERT') && !upper.includes('RETURNING')) {
    pgSql += ' RETURNING id';
  }

  return { pgSql, newParams };
}

const db = {
  /**
   * MySQL-compatible query: returns [rows, fields?]
   */
  query: async (sql, params = []) => {
    const { pgSql, newParams } = toPostgres(sql, params);
    const result = await pgPool.query(pgSql, newParams);
    const rows = result.rows || [];
    // Attach MySQL-like metadata where useful
    rows.insertId = rows[0]?.id || null;
    rows.affectedRows = result.rowCount;
    return [rows, result.fields];
  },

  execute: async (sql, params = []) => {
    return db.query(sql, params);
  },

  /**
   * MySQL-style transactional connection with beginTransaction/commit/rollback.
   */
  getConnection: async () => {
    const client = await pgPool.connect();

    return {
      beginTransaction: () => client.query('BEGIN'),
      commit: () => client.query('COMMIT'),
      rollback: () => client.query('ROLLBACK'),
      query: async (sql, params = []) => {
        const { pgSql, newParams } = toPostgres(sql, params);
        const result = await client.query(pgSql, newParams);
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
