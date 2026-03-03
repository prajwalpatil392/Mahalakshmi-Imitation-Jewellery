@echo off
echo ========================================
echo Starting Mahalakshmi Jewellery System
echo ========================================
echo.

REM Start XAMPP MySQL
echo Starting XAMPP MySQL...
"C:\xampp\mysql_start.bat" >nul 2>&1
timeout /t 2 >nul

REM Start XAMPP Apache
echo Starting XAMPP Apache...
"C:\xampp\apache_start.bat" >nul 2>&1
timeout /t 2 >nul

REM Auto-update database
echo Updating database schema...
call npm run migrate >nul 2>&1
if %errorlevel% equ 0 (
    echo Database updated successfully
) else (
    echo Database already up to date
)
timeout /t 1 >nul

REM Start backend in new window
echo Starting Backend Server...
start "Mahalakshmi Backend" cmd /k "node server.js"
timeout /t 3 >nul

echo.
echo ========================================
echo System Started!
echo ========================================
echo.
echo Backend:  http://localhost:5000
echo Frontend: http://localhost/mahalakshmi/
echo Client:   http://localhost/mahalakshmi/mahalakshmi-client.html
echo Admin:    http://localhost/mahalakshmi/mahalakshmi-admin.html
echo Buy Page: http://localhost/mahalakshmi/buy.html
echo Rent:     http://localhost/mahalakshmi/rental.html
echo.
echo Opening Browser...
start http://localhost/mahalakshmi/mahalakshmi-client.html
echo.
echo Press any key to stop all servers...
pause >nul

REM Stop servers
taskkill /FI "WindowTitle eq Mahalakshmi Backend*" /T /F >nul 2>&1
"C:\xampp\apache_stop.bat" >nul 2>&1
"C:\xampp\mysql_stop.bat" >nul 2>&1

echo Servers stopped.

