@echo off
echo ========================================
echo   Testing Project Setup
echo ========================================
echo.

echo Checking Node.js installation...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed!
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
) else (
    echo [OK] Node.js is installed
    node --version
)

echo.
echo Checking npm installation...
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] npm is not installed!
    pause
    exit /b 1
) else (
    echo [OK] npm is installed
    npm --version
)

echo.
echo Checking project structure...

if exist "client\package.json" (
    echo [OK] Client directory found
) else (
    echo [ERROR] Client directory not found!
)

if exist "server\package.json" (
    echo [OK] Server directory found
) else (
    echo [ERROR] Server directory not found!
)

if exist "package.json" (
    echo [OK] Root package.json found
) else (
    echo [ERROR] Root package.json not found!
)

echo.
echo Checking if dependencies are installed...

if exist "node_modules" (
    echo [OK] Root node_modules found
) else (
    echo [WARNING] Root dependencies not installed
    echo Run: npm install
)

if exist "client\node_modules" (
    echo [OK] Client node_modules found
) else (
    echo [WARNING] Client dependencies not installed
    echo Run: cd client && npm install
)

if exist "server\node_modules" (
    echo [OK] Server node_modules found
) else (
    echo [WARNING] Server dependencies not installed
    echo Run: cd server && npm install
)

echo.
echo Checking for duplicate folders...

if exist "dream-wave-ai" (
    echo [WARNING] Duplicate dream-wave-ai folder found (1.2 GB)
    echo Run CLEANUP_SCRIPT.bat to remove it
) else (
    echo [OK] No dream-wave-ai duplicate
)

if exist "safe-ui" (
    echo [WARNING] Unnecessary safe-ui folder found
    echo Run CLEANUP_SCRIPT.bat to remove it
) else (
    echo [OK] No safe-ui folder
)

if exist "public" (
    echo [WARNING] Duplicate public folder in root
    echo Run CLEANUP_SCRIPT.bat to remove it
) else (
    echo [OK] No duplicate public folder
)

echo.
echo Checking Report.jsx...

if exist "client\src\pages\Report.jsx" (
    echo [OK] Report.jsx exists
) else (
    echo [ERROR] Report.jsx not found!
)

if exist "client\src\pages\Report_CLEAN.jsx" (
    echo [OK] Clean version available
) else (
    echo [WARNING] Clean version not found
)

echo.
echo ========================================
echo   Test Complete
echo ========================================
echo.
echo If you see any [ERROR] or [WARNING] messages above,
echo please address them before running the application.
echo.
pause
