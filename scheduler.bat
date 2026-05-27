@echo off
:: =====================================================
:: scheduler.bat — ตั้ง Windows Task Scheduler
:: รันในฐานะ Administrator แล้วดับเบิลคลิก
:: =====================================================

set TASK_NAME=ReportAgingAutoUpdate
set SCRIPT=C:\Users\WIN11\Desktop\Work\01 Report Aging\update-data.bat
set RUN_TIME=07:00

echo.
echo =============================================
echo  ตั้ง Scheduled Task: %TASK_NAME%
echo  รันทุกวัน เวลา %RUN_TIME% น.
echo =============================================
echo.

:: ลบ task เก่าก่อน (ถ้ามี)
schtasks /delete /tn "%TASK_NAME%" /f >nul 2>&1

:: สร้าง task ใหม่ — รัน cmd /c เพื่อเปิด bat แบบ auto
schtasks /create ^
  /tn "%TASK_NAME%" ^
  /tr "cmd /c \"%SCRIPT%\" auto" ^
  /sc daily ^
  /st %RUN_TIME% ^
  /ru "%USERNAME%" ^
  /rl limited ^
  /f

if %ERRORLEVEL%==0 (
  echo.
  echo  ✓  สร้าง Task สำเร็จ!
  echo.
  echo  ชื่อ Task : %TASK_NAME%
  echo  รันทุกวัน : %RUN_TIME% น.
  echo  Script    : %SCRIPT%
  echo.
  echo  ดูได้ที่: Task Scheduler ^> Task Scheduler Library ^> %TASK_NAME%
  echo.
  echo  คำสั่งอื่น:
  echo    รันทันที  : schtasks /run /tn "%TASK_NAME%"
  echo    หยุดชั่วคราว : schtasks /change /tn "%TASK_NAME%" /disable
  echo    เปิดอีกครั้ง : schtasks /change /tn "%TASK_NAME%" /enable
  echo    ลบทิ้ง    : schtasks /delete /tn "%TASK_NAME%" /f
) else (
  echo.
  echo  ✗  สร้าง Task ไม่สำเร็จ
  echo  ลองรัน scheduler.bat ในฐานะ Administrator
  echo  ^(คลิกขวา ^> Run as administrator^)
)

echo.
pause
