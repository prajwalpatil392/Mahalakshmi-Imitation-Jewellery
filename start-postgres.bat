@echo off
echo Starting PostgreSQL...

REM Add PostgreSQL to PATH
set PATH=%PATH%;C:\Program Files\PostgreSQL\16\bin

REM Check if PostgreSQL is installed
where psql >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo PostgreSQL is not installed or not in PATH
    echo Please wait for installation to complete
    pause
    exit /b 1
)

REM Check if service exists and start it
sc query postgresql-x64-16 >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo Starting PostgreSQL service...
    net start postgresql-x64-16
) else (
    echo PostgreSQL service not found. Installation may still be in progress.
    echo Please check Windows Services for PostgreSQL
)

REM Test connection
echo Testing PostgreSQL connection...
pg_isready
if %ERRORLEVEL% EQU 0 (
    echo PostgreSQL is running!
    
    REM Create database
    echo Creating mahalakshmi database...
    psql -U postgres -c "CREATE DATABASE mahalakshmi;" 2>nul
    
    echo.
    echo Database setup complete!
    echo Now run: npm run migrate:postgres
) else (
    echo PostgreSQL is not responding yet.
    echo Please wait for installation to complete and try again.
)

pause
