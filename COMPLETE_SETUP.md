# Complete Local Setup Guide

## Current Status

✅ Node.js installed (v22.17.1)
✅ Dependencies installed
✅ Configuration files ready
⏳ PostgreSQL 16 is installing...

## Once PostgreSQL Installation Completes

### Step 1: Start PostgreSQL

Run the provided script:
```bash
./start-postgres.bat
```

Or manually:
1. Open Windows Services (services.msc)
2. Find "postgresql-x64-16" service
3. Right-click > Start

### Step 2: Create Database

```bash
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -c "CREATE DATABASE mahalakshmi;"
```

Default password is usually: `postgres`

### Step 3: Run Migrations

```bash
npm run migrate:postgres
```

### Step 4: Seed Data (Optional)

```bash
npm run seed
```

### Step 5: Start the Server

```bash
npm start
```

## Access the Application

- Client: http://localhost:5000/
- Admin: http://localhost:5000/admin
- Buy: http://localhost:5000/buy
- Rental: http://localhost:5000/rental
- API Health: http://localhost:5000/api/health

## Troubleshooting

### PostgreSQL Not Starting

1. Check if installation completed:
   ```bash
   "C:\Program Files\PostgreSQL\16\bin\psql.exe" --version
   ```

2. Check service status:
   ```bash
   sc query postgresql-x64-16
   ```

3. Start service manually:
   ```bash
   net start postgresql-x64-16
   ```

### Connection Refused Error

- Make sure PostgreSQL service is running
- Check `.env` file has correct credentials:
  ```
  DB_HOST=localhost
  DB_USER=postgres
  DB_PASSWORD=postgres
  DB_NAME=mahalakshmi
  DB_PORT=5432
  ```

### Migration Errors

- Ensure database exists first
- Check PostgreSQL logs in: `C:\Program Files\PostgreSQL\16\data\log\`

## Alternative: Use Online Database

If local installation has issues, use a free online PostgreSQL:

1. **Supabase** (https://supabase.com) - Easiest
2. **Render** (https://render.com) - Good free tier
3. **Railway** (https://railway.app) - Developer friendly

Update `.env` with the connection details from your chosen provider.

## Quick Commands Reference

```bash
# Check PostgreSQL status
pg_isready

# Connect to PostgreSQL
psql -U postgres

# List databases
psql -U postgres -l

# Run migrations
npm run migrate:postgres

# Start server (development)
npm run dev

# Start server (production)
npm start

# Run tests
npm test
```

## Project Structure

- `/public` - Frontend HTML/CSS/JS files
- `/routes` - API endpoints
- `/services` - Business logic (payments, email, SMS)
- `/config` - Database configuration
- `/scripts` - Migration and seed scripts
- `/uploads` - Product images

## Environment Variables

Key variables in `.env`:
- `PORT` - Server port (default: 5000)
- `DB_*` - Database connection details
- `JWT_SECRET` - Authentication secret
- `NODE_ENV` - Environment (development/production)
- Payment gateways (Razorpay, Adyen) - Optional
- Email/SMS services - Optional

## Next Steps After Setup

1. Access admin panel: http://localhost:5000/admin
2. Add products through admin interface
3. Test rental/purchase flows
4. Configure payment gateways (optional)
5. Set up email notifications (optional)

## Need Help?

- Check server logs in console
- Check PostgreSQL logs
- Verify all services are running
- Ensure ports 5000 and 5432 are not in use

---

**Note**: The PostgreSQL installation is currently in progress. Please wait for it to complete before proceeding with the setup steps.
