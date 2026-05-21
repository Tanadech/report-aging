@echo off
powershell -ExecutionPolicy Bypass -Command ^
  "Set-Location 'C:\Users\WIN11\Desktop\Work\01 Report Aging';" ^
  "$dt = Get-Date -Format 'yyyy-MM-dd HH:mm';" ^
  "git add .;" ^
  "git commit -m \"update $dt\";" ^
  "git push;" ^
  "Write-Host '';" ^
  "Write-Host 'Upload complete! Web will update in 1-2 min';" ^
  "Write-Host 'Press Enter to close...';" ^
  "Read-Host"
