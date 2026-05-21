@echo off
chcp 65001 >nul
cd /d "C:\Users\WIN11\Desktop\Work\01 Report Aging"

echo ===================================
echo   อัปโหลดข้อมูลขึ้น GitHub
echo ===================================

git add .

:: ใช้วันที่-เวลาปัจจุบันเป็น commit message
for /f "tokens=1-3 delims=/ " %%a in ("%date%") do set D=%%c-%%b-%%a
for /f "tokens=1-2 delims=: " %%a in ("%time%") do set T=%%a:%%b
git commit -m "update %D% %T%"

git push

echo.
echo ===================================
echo   อัปโหลดเสร็จแล้ว!
echo   เว็บจะอัปเดตภายใน 1-2 นาที
echo ===================================
echo.
pause
