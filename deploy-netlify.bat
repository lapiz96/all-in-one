@echo off
echo ========================================
echo   Quick Netlify Deployment Script
echo ========================================
echo.

REM Check if netlify-cli is installed
where netlify >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Netlify CLI not found!
    echo.
    echo Installing Netlify CLI...
    call npm install -g netlify-cli
    echo.
)

echo [STEP 1] Checking Netlify authentication...
netlify status
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo Please login to Netlify:
    call netlify login
    echo.
)

echo.
echo [STEP 2] Deploying to production...
echo.
call netlify deploy --prod

echo.
echo ========================================
echo   Deployment Complete!
echo ========================================
echo.
echo Your site is now live!
echo Check the URL above to access your site.
echo.
pause
