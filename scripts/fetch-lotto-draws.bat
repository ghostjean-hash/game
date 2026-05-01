@echo off
setlocal

echo.
echo ====================================
echo Blessed Lotto - Fetch lottery draws
echo ====================================
echo.
echo This will take about 12 minutes.
echo Requires Node.js 18+ and Korean IP.
echo.

node "%~dp0fetch-lotto-draws.mjs"

echo.
echo ====================================
echo Done. Refresh your browser.
echo ====================================
pause
endlocal
