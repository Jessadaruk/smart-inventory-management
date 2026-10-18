@echo off
chcp 65001 >nul
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
 echo ไม่พบ Node.js กรุณาติดตั้ง Node.js LTS
 pause
 exit /b 1
)
if not exist node_modules (
 echo ไม่พบ dependencies กรุณารัน npm ci และทำตาม README
 pause
 exit /b 1
)
call npm start
if errorlevel 1 (
 echo เริ่มระบบไม่สำเร็จ กรุณาตรวจข้อความด้านบน
 pause
 exit /b 1
)
