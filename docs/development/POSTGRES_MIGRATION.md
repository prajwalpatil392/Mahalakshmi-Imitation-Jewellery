# PostgreSQL Migration Guide

## Quick Start

### 1. Install PostgreSQL
- **Windows**: Download from https://www.postgresql.org/download/windows/
- **Mac**: `brew install postgresql`
- **Linux**: `sudo apt-get install postgresql`

### 2. Install Dependencies
```bash
npm install
```

### 3. Update Environment Variables
Copy `.env.example` to `.env` and update:
```env
DB_HOST=localhost
DB_USER=postgres
DB_PASSWORD=your_postgres_password
DB_NAME=mahalakshmi
DB_PORT=5432
```

### 4. Switch Database Config
In `config/database.js`, replace the content with:
```javascript
module.exports = require('./database-postgres');
```

Or rename files:
```bash
mv config/database.js config/database-mysql.js
mv config/database-postgres.js config/database.js
```

### 5. Run Migration
```bash
node scripts/migrate-postgres.js
```

### 6. Seed Products (Optional)
```bash
npm run seed
```

### 7. Start Server
```bash
npm start
```

## Key Differences: MySQL vs PostgreSQL

| Feature | MySQL | PostgreSQL |
|---------|-------|------------|
| Auto Increment | `AUTO_INCREMENT` | `SERIAL` |
| Placeholders | `?` | `$1, $2, $3` |
| ENUM | `ENUM('a','b')` | `VARCHAR CHECK (col IN ('a','b'))` |
| Boolean | `BOOLEAN` | `BOOLEAN` (true native support) |
| String Concat | `CONCAT()` | `\|\|` or `CONCAT()` |

## Code Changes Needed

### Query Syntax
MySQL:
```javascript
await pool.query('SELECT * FROM products WHERE id = ?', [id]);
```

PostgreSQL:
```javascript
await pool.query('SELECT * FROM products WHERE id = $1', [id]);
```

The `database-postgres.js` includes a `queryCompat()` helper that auto-converts `?` to `$1, $2`, etc.

### LAST_INSERT_ID
MySQL:
```javascript
const [result] = await pool.query('INSERT INTO products ...');
const id = result.insertId;
```

PostgreSQL:
```javascript
const result = await pool.query('INSERT INTO products ... RETURNING id');
const id = result.rows[0].id;
```

### Result Format
MySQL returns `[rows, fields]`, PostgreSQL returns `{ rows, fields, ... }`

## Render.com Deployment

Render provides free PostgreSQL databases. Update your `render.yaml`:

```yaml
databases:
  - name: mahalakshmi-db
    databaseName: mahalakshmi
    user: mahalakshmi_user
```

Render will provide a `DATABASE_URL` environment variable. Update `config/database-postgres.js` to use it:

```javascript
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});
```

## Migrating Existing Data

If you have existing MySQL data:

1. Export from MySQL:
```bash
mysqldump -u root -p mahalakshmi > backup.sql
```

2. Convert to PostgreSQL format (manual or use tools like `pgloader`)

3. Import to PostgreSQL:
```bash
psql -U postgres -d mahalakshmi -f converted_backup.sql
```

## Troubleshooting

### Connection Issues
- Check PostgreSQL is running: `pg_isready`
- Verify credentials in `.env`
- Check port 5432 is not blocked

### Permission Errors
```bash
psql -U postgres
CREATE USER your_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE mahalakshmi TO your_user;
```

### Migration Fails
- Drop database and retry: `DROP DATABASE mahalakshmi;`
- Check PostgreSQL logs for details

## Rollback to MySQL

If you need to go back:
1. Restore `config/database.js` from `config/database-mysql.js`
2. Run `npm install mysql2`
3. Run `npm run migrate`
