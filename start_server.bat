@echo off
set "NODE_PATH=C:\Program Files\nodejs"
set "PATH=%NODE_PATH%;%PATH%"

echo Checking Node.js...
"%NODE_PATH%\node.exe" -v
if %errorlevel% neq 0 (
    echo Node.js not found at %NODE_PATH%
    pause
    exit /b
)

echo Starting server...
"%NODE_PATH%\npm.cmd" run dev
pause
