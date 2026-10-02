@echo off
chcp 65001 >nul
title 古典密码实验室
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo 未检测到 Node.js，请先安装 Node.js 后重试。
  pause
  exit /b 1
)

echo 正在启动古典密码实验室...
node serve.mjs --open
if errorlevel 1 (
  echo.
  echo 启动失败，请检查上方提示。
  pause
)
