@echo off
title Socratic Vision Smartboard - Standalone Production Launcher
echo ================================================================
echo   SOCRATIC VISION BOARD - HE THONG BANG TUONG TAC THONG MINH
echo   Khoi chay che do Doc Lap tren Bang (Standalone Smartboard)
echo ================================================================
echo.

set SCRIPT_DIR=%~dp0
cd /d "%SCRIPT_DIR%socratic-monorepo"

echo [1/3] Dang khoi dong AI Engine Backend (Cong 8000)...
start "Socratic AI Engine" /min cmd /c "cd services\ai-engine && call .venv\Scripts\activate.bat 2>nul || python -m uvicorn main:app --host 0.0.0.0 --port 8000"

echo [2/3] Dang khoi dong Teacher Smartboard Engine (Cong 3001)...
start "Socratic Teacher Board" /min cmd /c "npm.cmd run dev -- -H 0.0.0.0 -p 3001"

echo [3/3] Dang doi cac dich vu san sang trong 5 giay...
timeout /t 5 /nobreak >nul

echo [Thanh cong] Dang mo Bang Thong Minh o che do Ung dung doc lap (App Window)...
echo (Co the thu nho xuong taskbar hoac chuyen ve PowerPoint / bang ve goc bat cu luc nao)
start msedge --app="http://localhost:3001" --start-maximized --no-first-run --touch-events=enabled 2>nul
if errorlevel 1 (
    start chrome --app="http://localhost:3001" --start-maximized --no-first-run --touch-events=enabled
)


echo ================================================================
echo   BANG TUONG TAC THONG MINH DA SAN SANG SU DUNG!
echo   Thay co co the viet ve, khoanh vung va dieu khien truc tiep.
echo ================================================================
