@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo ========================================
echo  晓山青 Viridiore - 本地开发服务器
echo ========================================
echo.
echo  已启动，请在浏览器中打开:
echo  http://localhost:8080/app.html
echo.
echo  按 Ctrl+C 停止服务器
echo ========================================

node dev-server.js
