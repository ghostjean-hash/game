@echo off
setlocal
set "ROOT=%~dp0"
start "game_ghost server" /min cmd /c ""node "%ROOT%scripts\dev-server.mjs" 8000""
timeout /t 1 /nobreak >nul
set "URL=http://127.0.0.1:8000/"
if exist "%ProgramFiles%\Google\Chrome\Application\chrome.exe" (
  start "" "%ProgramFiles%\Google\Chrome\Application\chrome.exe" "%URL%"
  exit /b
)
if exist "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" (
  start "" "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" "%URL%"
  exit /b
)
if exist "%LocalAppData%\Google\Chrome\Application\chrome.exe" (
  start "" "%LocalAppData%\Google\Chrome\Application\chrome.exe" "%URL%"
  exit /b
)
start "" "%URL%"