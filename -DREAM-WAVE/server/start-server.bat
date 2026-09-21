@echo off
cd /d %~dp0
set "PATH=%~dp0..\.tools\node-v20.18.0-win-x64;%PATH%"
node server.js

