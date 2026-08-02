@echo off
title Mangalsaath Integrated Final
echo.
echo Starting Mangalsaath Integrated Final...
echo.
if not exist node_modules (
  echo Installing required files...
  call npm install
)
start http://localhost:3000
call npm run dev
pause
