@echo off
chcp 65001 >nul
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
 echo Can cai Node.js 24 tro len tu https://nodejs.org/
 pause
 exit /b 1
)
node -e "if (Number(process.versions.node.split('.')[0]) < 24) process.exit(1)"
if errorlevel 1 (
 echo Node.js hien tai chua du phien ban. Hay cai Node.js 24 tro len.
 pause
 exit /b 1
)
echo Mo http://localhost:3530 de su dung Tro Xanh.
node server.mjs
pause
