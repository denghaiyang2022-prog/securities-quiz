@echo off
cd /d "%~dp0"
start "" http://localhost:8000
where py >nul 2>nul && py -m http.server 8000 && exit /b
where python >nul 2>nul && python -m http.server 8000 && exit /b
echo Python was not found. Opening index.html directly...
start "" index.html
