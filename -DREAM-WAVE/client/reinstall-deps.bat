@echo off
cd /d %~dp0
echo Removing node_modules and package-lock.json...
rmdir /s /q node_modules 2>nul
del /f /q package-lock.json 2>nul
echo Installing dependencies...
npm install
