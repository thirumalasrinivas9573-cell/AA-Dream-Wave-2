@echo off
echo ========================================
echo   Testing All Scripts
echo ========================================
echo.

echo [1/5] Testing directory structure...
if exist "client" (
    echo [OK] client directory exists
) else (
    echo [ERROR] client directory not found!
    goto :error
)

if exist "server" (
    echo [OK] server directory exists
) else (
    echo [ERROR] server directory not found!
    goto :error
)

if exist "package.json" (
    echo [OK] root package.json exists
) else (
    echo [ERROR] root package.json not found!
    goto :error
)

echo.
echo [2/5] Testing Node.js and npm...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js not installed!
    goto :error
) else (
    echo [OK] Node.js is installed
)

npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] npm not installed!
    goto :error
) else (
    echo [OK] npm is installed
)

echo.
echo [3/5] Testing dependencies...
if exist "node_modules" (
    echo [OK] Root dependencies installed
) else (
    echo [WARNING] Root dependencies not installed
    echo Run: npm install
)

if exist "client\node_modules" (
    echo [OK] Client dependencies installed
) else (
    echo [WARNING] Client dependencies not installed
    echo Run: cd client ^&^& npm install
)

if exist "server\node_modules" (
    echo [OK] Server dependencies installed
) else (
    echo [WARNING] Server dependencies not installed
    echo Run: cd server ^&^& npm install
)

echo.
echo [4/5] Testing package.json scripts...
findstr /C:"\"dev\"" package.json >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] dev script not found in package.json!
    goto :error
) else (
    echo [OK] dev script exists in root package.json
)

findstr /C:"\"dev\"" client\package.json >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] dev script not found in client/package.json!
    goto :error
) else (
    echo [OK] dev script exists in client package.json
)

echo.
echo [5/5] Testing batch files...
if exist "START_CLIENT.bat" (
    echo [OK] START_CLIENT.bat exists
) else (
    echo [ERROR] START_CLIENT.bat not found!
    goto :error
)

if exist "START_APP.bat" (
    echo [OK] START_APP.bat exists
) else (
    echo [ERROR] START_APP.bat not found!
    goto :error
)

if exist "CLEANUP_SCRIPT.bat" (
    echo [OK] CLEANUP_SCRIPT.bat exists
) else (
    echo [ERROR] CLEANUP_SCRIPT.bat not found!
    goto :error
)

echo.
echo ========================================
echo   ALL TESTS PASSED!
echo ========================================
echo.
echo Your project is ready to run!
echo.
echo Next steps:
echo 1. Run CLEANUP_SCRIPT.bat (if you haven't already)
echo 2. Run START_APP.bat to start the application
echo 3. Open http://localhost:5173 in your browser
echo.
goto :end

:error
echo.
echo ========================================
echo   TESTS FAILED!
echo ========================================
echo.
echo Please fix the errors above before continuing.
echo.
echo For help, see: TROUBLESHOOTING.md
echo.

:end
pause
