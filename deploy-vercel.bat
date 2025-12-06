@echo off
echo ========================================
echo   Quick Vercel Deployment Script
echo ========================================
echo.

REM Check if vercel is installed
where vercel >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Vercel CLI not found!
    echo.
    echo Installing Vercel CLI...
    call npm install -g vercel
    echo.
)

echo [STEP 1] Checking Vercel authentication...
vercel whoami
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo Please login to Vercel:
    call vercel login
    echo.
)

echo.
echo [STEP 2] Deploying to production...
echo.
call vercel --prod

echo.
echo ========================================
echo   Deployment Complete!
echo ========================================
echo.
echo Your site is now live!
echo Check the URL above to access your site.
echo.
pause
