@echo off
cd /d %~dp0
echo Starting PWN SHAKTI Mobile Command on http://localhost:5173
echo.
python -m http.server 5173
pause
