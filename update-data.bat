@echo off
setlocal enabledelayedexpansion

set ROOT=C:\Users\WIN11\Desktop\Work\01 Report Aging
cd /d "%ROOT%"

if not exist logs mkdir logs
set LOGFILE=%ROOT%\logs\update.log

for /f "tokens=1-3 delims=/ " %%a in ("%DATE%") do set _D=%%c-%%b-%%a
for /f "tokens=1-2 delims=: " %%a in ("%TIME: =0%") do set _T=%%a:%%b
set DT=%_D% %_T%

echo.
echo ============================================
echo  Report Aging — Update ^& Push
echo ============================================
echo.
echo [%DT%] === update-data เริ่มต้น === >> "%LOGFILE%"

:: ลบ hash เพื่อบังคับ convert ใหม่เสมอ
if exist .last-hash del /f /q .last-hash

:: ---- Step 1: Convert Excel → JSON + bundle ----
echo [1/2] แปลง Excel...
node convert.js >> "%LOGFILE%" 2>&1
set CONV_EXIT=%ERRORLEVEL%

if %CONV_EXIT% neq 0 if %CONV_EXIT% neq 2 (
  echo.
  echo  X  แปลงข้อมูลไม่สำเร็จ — ดู logs\update.log
  echo [%DT%] ERROR: convert.js exit %CONV_EXIT% >> "%LOGFILE%"
  echo กด Enter เพื่อปิด...
  pause >nul
  exit /b 1
)

:: ---- Step 2: Git push ----
echo [2/2] Push ขึ้น GitHub...
echo [%DT%] git push >> "%LOGFILE%"

git add data/meta.json data/outbound/car.json data/warehouse/pallet.json data/poi/in.json data/poi/uot.json index.html >> "%LOGFILE%" 2>&1
git commit -m "data: update %DT%" >> "%LOGFILE%" 2>&1
git push >> "%LOGFILE%" 2>&1
set PUSH_EXIT=%ERRORLEVEL%

echo.
if %PUSH_EXIT%==0 (
  echo  OK  สำเร็จ! Dashboard จะอัพเดทใน 1-2 นาที
  echo       https://tanadech.github.io/report-aging/
  echo [%DT%] push สำเร็จ >> "%LOGFILE%"
) else (
  echo  X   Push ไม่สำเร็จ — ดู logs\update.log
  echo [%DT%] ERROR: push exit %PUSH_EXIT% >> "%LOGFILE%"
)

echo.
echo [%DT%] === จบ === >> "%LOGFILE%"
echo กด Enter เพื่อปิด...
pause >nul
