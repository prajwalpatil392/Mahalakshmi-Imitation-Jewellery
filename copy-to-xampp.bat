@echo off
echo ========================================
echo Copying Files to XAMPP
echo ========================================
echo.

REM Check if XAMPP exists
if not exist "C:\xampp\htdocs" (
    echo [ERROR] XAMPP not found at C:\xampp
    echo Please install XAMPP from: https://www.apachefriends.org/
    pause
    exit /b 1
)

REM Create mahalakshmi folder
echo Creating folder: C:\xampp\htdocs\mahalakshmi
if not exist "C:\xampp\htdocs\mahalakshmi" mkdir "C:\xampp\htdocs\mahalakshmi"

REM Copy entire public folder contents
 echo Copying public assets...
 xcopy /Y /E public\* C:\xampp\htdocs\mahalakshmi\
 
 REM (legacy single files removed)

echo.
echo ========================================
echo Files Copied Successfully!
echo ========================================
echo.
echo Files are now at: C:\xampp\htdocs\mahalakshmi\
echo.
echo Next steps:
echo 1. Open XAMPP Control Panel
echo 2. Start Apache (click Start button)
echo 3. Start MySQL (click Start button)
echo 4. Open browser: http://localhost/mahalakshmi/mahalakshmi-client.html
echo.

REM List copied files
echo Copied files:
dir /B C:\xampp\htdocs\mahalakshmi\

echo.
echo Opening folder in Explorer...
explorer C:\xampp\htdocs\mahalakshmi

echo.
pause
