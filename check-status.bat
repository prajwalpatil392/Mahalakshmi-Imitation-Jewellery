@echo off
echo ========================================
echo Mahalakshmi System Status Check
echo ========================================
echo.

echo Checking Backend Server (Port 5000)...
curl -s http://localhost:5000/api/products >nul 2>&1
if %errorlevel% equ 0 (
    echo [OK] Backend is running
) else (
    echo [X] Backend is NOT running
)

echo.
echo Checking XAMPP Apache (Port 80)...
curl -s http://localhost/mahalakshmi/ >nul 2>&1
if %errorlevel% equ 0 (
    echo [OK] XAMPP Apache is running
) else (
    echo [X] XAMPP Apache is NOT running
)

echo.
echo Checking MySQL Database...
mysql -u root -e "USE mahalakshmi; SELECT COUNT(*) FROM products;" >nul 2>&1
if %errorlevel% equ 0 (
    echo [OK] MySQL is running with products
) else (
    echo [X] MySQL is NOT accessible
)

echo.
echo ========================================
echo.
pause
