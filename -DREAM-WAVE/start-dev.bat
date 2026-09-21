@echo off
setlocal
set "PATH=%~dp0.tools\node-v20.18.0-win-x64;%PATH%"

echo ========================================
echo   Dream Wave AI - Development Servers
echo ========================================
echo.

echo [1/3] Starting Backend Server (Port 5001)...
start "Dream Wave - Backend" cmd /k "set "PATH=%~dp0.tools\node-v20.18.0-win-x64;%%PATH%%" && cd /d "%~dp0server" && node server.js"

echo [2/3] Waiting 3 seconds...
ping 127.0.0.1 -n 4 >nul

echo [3/3] Starting Frontend Vite App (Port 5173)...
start "Dream Wave - Frontend" cmd /k "set "PATH=%~dp0.tools\node-v20.18.0-win-x64;%%PATH%%" && cd /d "%~dp0client" && "%~dp0.tools\node-v20.18.0-win-x64\npm.cmd" run dev"

echo.
echo ========================================
echo   Both servers are starting!
echo ========================================
echo.
echo Backend:  http://localhost:5001
echo Frontend: http://localhost:5173
echo.
echo Press any key to close this launcher window...
echo (The servers will keep running in their own windows)
pause >nul
