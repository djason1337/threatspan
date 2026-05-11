@echo off
REM ThreatSpan - Windows double-click launcher
REM
REM Double-click this file in Explorer.
REM A console window opens, the server starts, and your browser opens
REM to http://localhost:3000 automatically.
REM
REM To stop: press Ctrl+C in the console, or just close it.

setlocal
cd /d "%~dp0"

echo.
echo   ============================================================
echo                          THREATSPAN
echo       Threat investigation workspace for SOC analysts
echo   ============================================================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo   [X] Node.js is required but not installed on this machine.
  echo.
  echo       Install it one of these ways:
  echo         - Download from https://nodejs.org
  echo         - Or with winget:   winget install OpenJS.NodeJS.LTS
  echo.
  echo   Press any key to close...
  pause >nul
  exit /b 1
)

for /f "tokens=1 delims=." %%a in ('node -p "process.versions.node"') do set NODE_MAJOR=%%a
set NODE_MAJOR=%NODE_MAJOR:v=%
if %NODE_MAJOR% LSS 14 (
  for /f %%v in ('node --version') do set NODE_VER=%%v
  echo   [X] Node.js 14 or newer is required.
  echo       Currently installed: %NODE_VER%
  echo.
  echo   Press any key to close...
  pause >nul
  exit /b 1
)

for /f %%v in ('node --version') do echo   Node %%v  -^>  starting server...
echo.

node server.js %*
