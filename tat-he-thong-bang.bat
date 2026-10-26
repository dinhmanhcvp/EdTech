@echo off
title Tat He Thong Bang Thong Minh
echo ================================================================
echo   DANG DONG TOAN BO HE THONG BANG THONG MINH...
echo ================================================================
echo.

echo [1/2] Dang tat cac may chu ngam AI Engine va Teacher Board...
taskkill /F /FI "WINDOWTITLE eq Socratic*" 2>nul
taskkill /F /IM uvicorn.exe 2>nul
taskkill /F /IM node.exe 2>nul

echo [2/2] Da dong thanh cong!
echo.
echo ================================================================
echo   DA TAT HE THONG BANG HOAN TOAN.
echo   Bang da tro ve trang thai ban dau de su dung cac phan mem khac.
echo ================================================================
timeout /t 3
