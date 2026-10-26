@echo off
title Cai Dat 1 Cham Cho Bang Thong Minh
echo ================================================================
echo   CAI DAT 1 CHAM - BANG TUONG TAC THONG MINH
echo   Khong can ban phim, khong can go lenh Windows R
echo ================================================================
echo.

set SCRIPT_DIR=%~dp0
set TARGET_BAT=%SCRIPT_DIR%run-smartboard-standalone.bat
set STARTUP_DIR=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup

echo Dang tao bieu tuong loi tat tren Man hinh chinh Desktop...
powershell -NoProfile -Command "$ws = New-Object -ComObject WScript.Shell; $s = $ws.CreateShortcut([Environment]::GetFolderPath('Desktop') + '\BANG_THONG_MINH_STEM.lnk'); $s.TargetPath = '%TARGET_BAT%'; $s.WorkingDirectory = '%SCRIPT_DIR%'; $s.IconLocation = 'imageres.dll,110'; $s.Save()"

echo Dang tao bieu tuong Tat He Thong tren Man hinh chinh Desktop...
powershell -NoProfile -Command "$ws = New-Object -ComObject WScript.Shell; $s = $ws.CreateShortcut([Environment]::GetFolderPath('Desktop') + '\TAT_HE_THONG_BANG.lnk'); $s.TargetPath = '%SCRIPT_DIR%tat-he-thong-bang.bat'; $s.WorkingDirectory = '%SCRIPT_DIR%'; $s.IconLocation = 'shell32.dll,27'; $s.Save()"

echo Dang cai dat tu dong khoi dong cung Windows khi bat nguon bang...
powershell -NoProfile -Command "$ws = New-Object -ComObject WScript.Shell; $s = $ws.CreateShortcut('%STARTUP_DIR%\BANG_THONG_MINH_STEM.lnk'); $s.TargetPath = '%TARGET_BAT%'; $s.WorkingDirectory = '%SCRIPT_DIR%'; $s.IconLocation = 'imageres.dll,110'; $s.Save()"

echo.
echo ================================================================
echo   HOAN THANH 100%!
echo   1. Ngoai Desktop da co bieu tuong: BANG_THONG_MINH_STEM (Bat bang)
echo   2. Ngoai Desktop da co bieu tuong: TAT_HE_THONG_BANG (Tat sach may chu)
echo   3. He thong se tu dong mo ung dung moi khi bat nguon bang!
echo   Thay co co the thu nho xuong taskbar hoac tat bat cu luc nao.
echo ================================================================
timeout /t 5
