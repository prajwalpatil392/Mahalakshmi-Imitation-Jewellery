@echo off
echo ========================================
echo  Mahalakshmi Jewellery - GitHub Upload
echo ========================================
echo.

REM Check if git is initialized
if not exist ".git" (
    echo Initializing Git repository...
    git init
    echo.
)

REM Add all files
echo Adding all files...
git add .
echo.

REM Commit with timestamp
echo Committing changes...
git commit -m "Professional restructuring complete - Production ready v1.0"
echo.

REM Check if remote exists
git remote -v > nul 2>&1
if errorlevel 1 (
    echo.
    echo ========================================
    echo  SETUP REQUIRED
    echo ========================================
    echo.
    echo Please enter your GitHub repository URL:
    echo Example: https://github.com/username/repo-name.git
    echo.
    set /p REPO_URL="Repository URL: "
    
    echo.
    echo Adding remote repository...
    git remote add origin %REPO_URL%
    echo.
)

REM Set main branch
echo Setting main branch...
git branch -M main
echo.

REM Push to GitHub
echo Pushing to GitHub...
echo.
echo NOTE: You may need to enter your GitHub credentials
echo Use Personal Access Token as password (not your GitHub password)
echo.
git push -u origin main

if errorlevel 1 (
    echo.
    echo ========================================
    echo  PUSH FAILED
    echo ========================================
    echo.
    echo Possible solutions:
    echo 1. Check your internet connection
    echo 2. Verify repository URL is correct
    echo 3. Use Personal Access Token as password
    echo 4. Check GITHUB_UPLOAD_GUIDE.md for help
    echo.
) else (
    echo.
    echo ========================================
    echo  SUCCESS! Upload Complete!
    echo ========================================
    echo.
    echo Your code is now on GitHub!
    echo Check your repository to verify.
    echo.
)

pause
