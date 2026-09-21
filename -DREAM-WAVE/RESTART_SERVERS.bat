@echo off
set "PATH=%~dp0.tools\node-v20.18.0-win-x64;%PATH%"
echo Killing processes on ports 5001 and 5173...
echo.

REM Kill port 5001 (backend)
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5001') do (
    echo Killing process on port 5001 (PID: %%a)
    taskkill /F /PID %%a 2>nul
)

REM Kill port 5173 (frontend)
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5173') do (
    echo Killing process on port 5173 (PID: %%a)
    taskkill /F /PID %%a 2>nul
)

echo.
echo Waiting 2 seconds...
timeout /t 2 /nobreak >nul

echo.
echo Starting backend server...
start "Backend Server" cmd /c "cd /d d:\-DREAM-WAVE\server && node server.js"

echo.
echo Waiting 3 seconds for backend to start...
timeout /t 3 /nobreak >nul

echo.
echo Starting frontend server...
start "Frontend Server" cmd /c "cd /d d:\-DREAM-WAVE\client && npm run dev"

echo.
echo ✅ Servers starting!
echo.
echo Backend: http://localhost:5001
echo Frontend: http://localhost:5173
echo.
echo Press any key to close this window...
pause >nul
