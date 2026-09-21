@echo off
set "PATH=%~dp0.tools\node-v20.18.0-win-x64;%PATH%"
echo ========================================
echo   Installing Project Dependencies
echo ========================================
echo.
echo This will install all required packages for:
echo - Root project
echo - Client (React frontend)
echo - Server (Node.js backend)
echo.
echo This may take 5-10 minutes...
echo.
pause

echo.
echo [1/3] Installing root dependencies...
call npm install
if %errorlevel% neq 0 (
    echo [ERROR] Failed to install root dependencies!
    pause
    exit /b 1
)
echo [OK] Root dependencies installed!

echo.
echo [2/3] Installing client dependencies...
cd client
call npm install
if %errorlevel% neq 0 (
    echo [ERROR] Failed to install client dependencies!
    cd ..
    pause
    exit /b 1
)
cd ..
echo [OK] Client dependencies installed!

echo.
echo [3/3] Installing server dependencies...
cd server
call npm install
if %errorlevel% neq 0 (
    echo [ERROR] Failed to install server dependencies!
    cd ..
    pause
    exit /b 1
)
cd ..
echo [OK] Server dependencies installed!

echo.
echo ========================================
echo   Installation Complete!
echo ========================================
echo.
echo All dependencies have been installed successfully!
echo.
echo Next steps:
echo 1. Run CLEANUP_SCRIPT.bat (if you haven't already)
echo 2. Run START_APP.bat to start the application
echo.
pause
