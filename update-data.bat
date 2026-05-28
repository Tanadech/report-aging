@echo off
setlocal enabledelayedexpansion

:: =====================================================
:: update-data.bat — แปลง Excel + git push
:: ใช้งาน:
::   update-data.bat          (manual mode — pause ท้าย)
::   update-data.bat auto     (auto mode   — ไม่ pause)
:: =====================================================

set ROOT=C:\Users\WIN11\Desktop\Work\01 Report Aging
set AUTO=0
if /i "%~1"=="auto"   set AUTO=1
if /i "%~1"=="--auto" set AUTO=1

cd /d "%ROOT%"

:: สร้าง logs dir
if not exist logs mkdir logs
set LOGFILE=%ROOT%\logs\update.log

:: Timestamp
for /f "tokens=1-3 delims=/ " %%a in ("%DATE%") do set _D=%%c-%%b-%%a
for /f "tokens=1-2 delims=: " %%a in ("%TIME: =0%") do set _T=%%a:%%b
set DT=%_D% %_T%

echo.
echo [%DT%] === update-data เริ่มต้น === >> "%LOGFILE%"
echo ============================================
echo  Report Aging — Auto Update
echo ============================================
echo.

:: ---- Step 1: Convert Excel → JSON ----
echo [1/2] แปลง Excel...
echo [%DT%] รัน convert.js >> "%LOGFILE%"

node convert.js 2>> "%LOGFILE%"
set CONV_EXIT=%ERRORLEVEL%

if %CONV_EXIT%==2 (
  echo.
  echo  ℹ  ข้อมูลไม่เปลี่ยนแปลง — ไม่ต้อง push
  echo [%DT%] ข้อมูลไม่เปลี่ยน ข้าม push >> "%LOGFILE%"
  goto :END
)

if %CONV_EXIT% neq 0 (
  echo.
  echo  ✗  แปลงข้อมูลไม่สำเร็จ — ดู logs\update.log
  echo [%DT%] ERROR: convert.js exit %CONV_EXIT% >> "%LOGFILE%"
  goto :END
)

:: ---- Step 2: Git push ----
echo [2/2] Push ขึ้น GitHub...
echo [%DT%] git push >> "%LOGFILE%"

git add data/aging-dom.json data/aging-imp.json data/car.json data/pallet.json data/in.json data/uot.json data/meta.json index.html >> "%LOGFILE%" 2>&1
git commit -m "data: update %DT%" >> "%LOGFILE%" 2>&1
git push >> "%LOGFILE%" 2>&1
set PUSH_EXIT=%ERRORLEVEL%

echo.
if %PUSH_EXIT%==0 (
  echo  ✓  สำเร็จ! Dashboard จะอัพเดทใน 1-2 นาที
  echo  ↗  https://tanadech.github.io/report-aging/
  echo [%DT%] push สำเร็จ >> "%LOGFILE%"
) else (
  echo  ✗  Push ไม่สำเร็จ — ดู logs\update.log
  echo [%DT%] ERROR: push exit %PUSH_EXIT% >> "%LOGFILE%"
)

:END
echo.
echo [%DT%] === จบ === >> "%LOGFILE%"
if %AUTO%==0 (
  echo กด Enter เพื่อปิด...
  pause >nul
)
