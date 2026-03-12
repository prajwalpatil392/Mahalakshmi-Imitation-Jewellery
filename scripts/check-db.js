#!/usr/bin/env node
require('dotenv').config();
const db = require('../config/database');

async function check() {
  try {
    const tables = await db.query(
      `SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename`
    );
    console.log('Tables:', tables.rows.map((r) => r.tablename).join(', ') || '(none)');
    for (const t of tables.rows) {
      const c = await db.query('SELECT COUNT(*) as n FROM ' + t.tablename);
      console.log('  ' + t.tablename + ':', c.rows[0].n, 'rows');
    }
    process.exit(0);
  } catch (e) {
    console.error('Error:', e.message);
    process.exit(1);
  }
}
check();
