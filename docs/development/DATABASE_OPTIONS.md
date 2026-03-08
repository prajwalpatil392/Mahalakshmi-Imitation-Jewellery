# MySQL Database Options for Render Deployment

Since Render only provides PostgreSQL databases, you need an external MySQL database. Here are your options:

## Option 1: Railway (Recommended - Easy & Free Tier)

Railway offers free MySQL databases with generous limits.

### Setup Steps:
1. Go to https://railway.app
2. Sign up with GitHub
3. Click "New Project" → "Provision MySQL"
4. Once created, click on MySQL service
5. Go to "Variables" tab and copy:
   - `MYSQLHOST` → Use as `DB_HOST`
   - `MYSQLUSER` → Use as `DB_USER`
   - `MYSQLPASSWORD` → Use as `DB_PASSWORD`
   - `MYSQLDATABASE` → Use as `DB_NAME`
   - `MYSQLPORT` → Use as `DB_PORT`

### Free Tier:
- $5 credit per month
- 1GB storage
- Shared CPU
- Good for development/small projects

### Add to Render:
In your Render web service, add these environment variables with values from Railway.

---

## Option 2: PlanetScale (Serverless MySQL)

PlanetScale offers serverless MySQL with a generous free tier.

### Setup Steps:
1. Go to https://planetscale.com
2. Sign up (free account)
3. Create new database: `mahalakshmi`
4. Create a password
5. Copy connection details:
   - Host → `DB_HOST`
   - Username → `DB_USER`
   - Password → `DB_PASSWORD`
   - Database → `DB_NAME`

### Free Tier:
- 5GB storage
- 1 billion row reads/month
- 10 million row writes/month
- Automatic backups

### Connection String:
```
mysql://username:password@host/database?ssl={"rejectUnauthorized":true}
```

### Add to Render:
Add the connection details as environment variables in Render.

---

## Option 3: Aiven (Managed MySQL)

Aiven provides managed MySQL databases with a free tier.

### Setup Steps:
1. Go to https://aiven.io
2. Sign up for free account
3. Create new MySQL service
4. Select free tier (Hobbyist plan)
5. Wait for service to start (~10 minutes)
6. Copy connection details from service overview

### Free Tier:
- 1 CPU
- 1GB RAM
- 5GB storage
- Limited to 1 service

### Add to Render:
Add connection details as environment variables.

---

## Option 4: FreeMySQLHosting.net (Free Hosting)

Free MySQL hosting for small projects.

### Setup Steps:
1. Go to https://www.freemysqlhosting.net
2. Sign up for free account
3. Create database
4. Note down connection details

### Limitations:
- 5MB storage (very limited)
- Ads on their website
- Not recommended for production

---

## Option 5: Clever Cloud

Clever Cloud offers MySQL databases with a free tier.

### Setup Steps:
1. Go to https://www.clever-cloud.com
2. Sign up
3. Create MySQL add-on
4. Copy connection details

### Free Tier:
- 256MB storage
- Shared resources

---

## Recommended: Railway Setup (Detailed)

### Step 1: Create Railway MySQL Database

```bash
# Install Railway CLI (optional)
npm install -g @railway/cli

# Or use web interface at railway.app
```

### Step 2: Get Connection Details

From Railway dashboard:
```
MYSQLHOST=containers-us-west-xxx.railway.app
MYSQLPORT=6789
MYSQLUSER=root
MYSQLPASSWORD=your_password_here
MYSQLDATABASE=railway
```

### Step 3: Add to Render Environment Variables

In Render dashboard → Your Service → Environment:

```
DB_HOST=containers-us-west-xxx.railway.app
DB_PORT=6789
DB_USER=root
DB_PASSWORD=your_password_here
DB_NAME=railway
```

### Step 4: Test Connection

Your app will automatically connect using these variables.

---

## Alternative: Use Render with PostgreSQL

If you want to use Render's built-in PostgreSQL instead of MySQL:

### Required Changes:

1. Install PostgreSQL driver:
```bash
npm uninstall mysql2
npm install pg
```

2. Update `config/database.js`:
```javascript
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 5432,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

module.exports = pool;
```

3. Update all SQL queries (MySQL → PostgreSQL syntax differences)
4. Update migration scripts

This requires significant code changes, so using external MySQL is easier.

---

## My Recommendation

For your deployment, I recommend:

1. **Railway** - Easiest setup, generous free tier, reliable
2. **PlanetScale** - Best for scaling, serverless, great free tier
3. **Aiven** - Good for production, managed service

Avoid FreeMySQLHosting.net for anything serious.

---

## Next Steps

1. Choose a MySQL provider from above
2. Create your database
3. Copy connection details
4. Add to Render environment variables
5. Deploy your app

Your app is already configured to use these environment variables!
