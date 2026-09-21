@echo off
echo ========================================
echo   PROJECT CLEANUP SCRIPT
echo ========================================
echo.
echo This script will:
echo 1. Backup corrupted Report.jsx
echo 2. Replace with clean version
echo 3. Remove duplicate folders
echo 4. Clean up unnecessary files
echo.
pause

echo.
echo [1/5] Backing up corrupted Report.jsx...
if exist "client\src\pages\Report.jsx" (
    copy "client\src\pages\Report.jsx" "client\src\pages\Report.jsx.corrupted.backup" >nul 2>&1
    echo Backup created successfully!
) else (
    echo Report.jsx not found, skipping backup...
)

echo [2/5] Replacing with clean version...
if exist "client\src\pages\Report_CLEAN.jsx" (
    copy /Y "client\src\pages\Report_CLEAN.jsx" "client\src\pages\Report.jsx" >nul 2>&1
    echo Report.jsx has been fixed!
) else (
    echo Clean version not found, skipping...
)

echo [3/5] Removing duplicate dream-wave-ai folder...
if exist "dream-wave-ai" (
    echo Removing dream-wave-ai folder (this may take a moment)...
    rmdir /s /q "dream-wave-ai" >nul 2>&1
    echo Done!
) else (
    echo dream-wave-ai folder not found, skipping...
)

echo [4/5] Removing safe-ui folder...
if exist "safe-ui" (
    echo Removing safe-ui folder...
    rmdir /s /q "safe-ui" >nul 2>&1
    echo Done!
) else (
    echo safe-ui folder not found, skipping...
)

echo [5/5] Removing duplicate public folder from root...
if exist "public" (
    echo Removing root public folder...
    rmdir /s /q "public" >nul 2>&1
    echo Done!
) else (
    echo Root public folder not found, skipping...
)

echo.
echo ========================================
echo   CLEANUP COMPLETE!
echo ========================================
echo.
echo Summary:
echo - Report.jsx has been fixed
echo - Duplicate folders removed
echo - Project structure cleaned
echo.
echo Next step: Run START_APP.bat to start your application
echo.
pause
