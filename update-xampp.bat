@echo off
echo ========================================
echo Updating Mahalakshmi files on XAMPP
echo ========================================
echo.

REM Check if XAMPP directory exists
if not exist "C:\xampp\htdocs\mahalakshmi" (
    echo [ERROR] XAMPP mahalakshmi directory not found!
    echo Please run start-xampp.bat first to set up the directory.
    echo.
    pause
    exit /b 1
)

REM Create directories if they don't exist
if not exist "C:\xampp\htdocs\mahalakshmi\js" mkdir "C:\xampp\htdocs\mahalakshmi\js"
if not exist "C:\xampp\htdocs\mahalakshmi\css" mkdir "C:\xampp\htdocs\mahalakshmi\css"

echo Copying updated files...

REM Copy entire public folder to XAMPP
 echo - Copying public assets...
 xcopy /Y /E public\* C:\xampp\htdocs\mahalakshmi\ >nul


echo.
echo ========================================
echo [SUCCESS] Files updated successfully!
echo ========================================
echo.
echo Updated files in: C:\xampp\htdocs\mahalakshmi\
echo.
echo Refresh your browser to see the changes:
echo - Client Page: http://localhost/mahalakshmi/mahalakshmi-client.html
echo - Buy Page:    http://localhost/mahalakshmi/buy.html
echo - Rental Page: http://localhost/mahalakshmi/rental.html
echo - Admin Page:  http://localhost/mahalakshmi/mahalakshmi-admin.html
echo.
echo Press Ctrl+F5 in your browser to force refresh and clear cache.
echo.
pause
