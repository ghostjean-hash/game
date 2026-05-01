@echo off
setlocal

echo.
echo ====================================
echo Blessed Lotto - Fetch lottery draws
echo ====================================
echo.
echo This will finish in under a few seconds.
echo Source: smok95/lotto GitHub Pages mirror (all.json bundle).
echo Requires Node.js 18+.
echo.

node "%~dp0fetch-lotto-draws.mjs"

echo.
echo ====================================
echo Done. Refresh your browser.
echo ====================================
pause
endlocal
