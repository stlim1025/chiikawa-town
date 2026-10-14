@echo off
rem Chiikawa town multiplayer server: one click (runs server\open-server.ps1)
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0server\open-server.ps1"
echo.
pause
