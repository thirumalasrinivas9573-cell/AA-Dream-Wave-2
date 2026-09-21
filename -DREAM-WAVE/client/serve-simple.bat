@echo off
cd /d %~dp0\dist
echo Serving frontend on http://localhost:5173
npx -y http-server -p 5173 --proxy http://localhost:5001?
