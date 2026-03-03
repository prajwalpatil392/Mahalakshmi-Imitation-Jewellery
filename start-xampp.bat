@echo off
echo ========================================
echo Starting Mahalakshmi with XAMPP
echo ========================================
echo.

REM Check if XAMPP is installed
if not exist "C:\xampp\xampp-control.exe" (
    echo [ERROR] XAMPP not found!
    echo Please install XAMPP from: https://www.apachefriends.org/
    echo.
    pause
    exit /b 1
)

REM Copy files to XAMPP htdocs
echo Copying files to XAMPP...
if not exist "C:\xampp\htdocs\mahalakshmi" mkdir "C:\xampp\htdocs\mahalakshmi"
copy mahalakshmi-client.html C:\xampp\htdocs\mahalakshmi\ >nul
copy mahalakshmi-admin.html C:\xampp\htdocs\mahalakshmi\ >nul
copy test-connection.html C:\xampp\htdocs\mahalakshmi\ >nul
copy config.js C:\xampp\htdocs\mahalakshmi\ >nul
echo [OK] Files copied

REM Start XAMPP Control Panel
echo Opening XAMPP Control Panel...
echo Please start MySQL and Apache (click Start buttons)
start "" "C:\xampp\xampp-control.exe"
echo.
echo Waiting for you to start MySQL and Apache in XAMPP...
echo Press any key after both are running (green)...
pause >nul

REM Check if .env exists
if not exist .env (
    echo Creating .env file for XAMPP...
    (
        echo PORT=5000
        echo DB_HOST=localhost
        echo DB_USER=root
        echo DB_PASSWORD=
        echo DB_NAME=mahalakshmi
        echo JWT_SECRET=your_secret_key_12345
        echo NODE_ENV=development
    ) > .env
    echo [OK] .env file created with XAMPP defaults
)

echo.
echo ========================================
echo Starting Backend Server
echo ========================================
start "Mahalakshmi Backend" cmd /k "npm start"
echo Waiting for backend to start...
timeout /t 5 >nul

echo.
echo ========================================
echo Opening Browser
echo ========================================
start http://localhost/mahalakshmi/mahalakshmi-client.html
timeout /t 2 >nul
start http://localhost/phpmyadmin

echo.
echo ========================================
echo System Started Successfully!
echo ========================================
echo.
echo XAMPP Control:  Check MySQL and Apache are green
echo phpMyAdmin:     http://localhost/phpmyadmin
echo Backend API:    http://localhost:5000/api/health
echo Client Page:    http://localhost/mahalakshmi/mahalakshmi-client.html
echo Admin Page:     http://localhost/mahalakshmi/mahalakshmi-admin.html
echo Test Page:      http://localhost/mahalakshmi/test-connection.html
echo.
echo Files location: C:\xampp\htdocs\mahalakshmi\
echo.
echo Press any key to stop backend server...
pause >nul

REM Stop backend
echo.
echo Stopping backend server...
taskkill /FI "WindowTitle eq Mahalakshmi Backend*" /T /F >nul 2>&1

echo.
echo Backend stopped.
echo Don't forget to stop MySQL and Apache in XAMPP Control Panel!
echo.
pause
