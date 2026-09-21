@echo off
cd /d %~dp0
echo Installing missing rollup dependency...
npm install @rollup/rollup-win32-x64-msvc --save-optional
echo Done!
