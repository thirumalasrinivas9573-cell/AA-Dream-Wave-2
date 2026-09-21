# Dream Wave AI - Development Servers Startup Script

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Dream Wave AI - Development Servers" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Get the script directory
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path

# Start Backend Server
Write-Host "[1/3] Starting Backend Server..." -ForegroundColor Yellow
$serverPath = Join-Path $scriptPath "server"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$serverPath'; npm start"

# Wait 3 seconds
Write-Host "[2/3] Waiting 3 seconds..." -ForegroundColor Yellow
Start-Sleep -Seconds 3

# Start Frontend Client
Write-Host "[3/3] Starting Frontend Web App..." -ForegroundColor Yellow
$clientPath = Join-Path $scriptPath "web"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$clientPath'; npm run dev"

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  Both servers are starting!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Backend:  http://localhost:5001" -ForegroundColor Cyan
Write-Host "Frontend: http://localhost:3000" -ForegroundColor Cyan
Write-Host ""
Write-Host "Press any key to close this window..." -ForegroundColor Gray
Write-Host "(The servers will keep running)" -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
