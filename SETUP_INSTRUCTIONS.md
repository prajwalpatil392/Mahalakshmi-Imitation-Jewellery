# PostgreSQL Setup Instructions

The PostgreSQL installation is in progress. While it completes, here are your options:

## Option 1: Wait for Local PostgreSQL Installation (Recommended)

The installation is currently running in the background. Once complete:

1. Set a password for postgres user (default: postgres)
2. Start PostgreSQL service
3. Create database: `psql -U postgres -c "CREATE DATABASE mahalakshmi;"`
4. Run migrations: `npm run migrate:postgres`
5. Start server: `npm start`

## Option 2: Use Free Online PostgreSQL (Quick Start)

Use a free PostgreSQL database from these providers:

### Supabase (Easiest)
1. Go to https://supabase.com
2. Create free account
3. Create new project
4. Copy connection string from Settings > Database
5. Update `.env` file with connection details

### Render.com
1. Go to https://render.com
2. Create free PostgreSQL database
3. Copy connection details
4. Update `.env` file

### Railway.app
1. Go to https://railway.app
2. Create PostgreSQL database
3. Copy connection details
4. Update `.env` file

## Current Configuration

Your `.env` is configured for local PostgreSQL:
```
DB_HOST=localhost
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=mahalakshmi
DB_PORT=5432
```

## Next Steps

1. Wait for PostgreSQL installation to complete (check Windows Services)
2. Or use one of the online database options above
3. Run `npm run migrate:postgres` to create tables
4. Run `npm start` to start the server

The server will automatically connect once PostgreSQL is available!
