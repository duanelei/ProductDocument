@echo off
chcp 65001 >nul
echo ====================================
echo       AI Document Review System
echo         Date: %date% %time%
echo ====================================
echo.

rem Set color
echo color 0a
echo.

rem Check Node.js installation
echo 1. Checking Node.js environment...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo    ✗ Node.js not installed or not in PATH
    echo    Please install Node.js first: https://nodejs.org/
    echo.
    pause
    exit /b 1
) else (
    echo    ✓ Node.js installed: 
    for /f "delims=" %%i in ('node --version') do echo       %%i
)
echo.

rem Check Python installation (for frontend HTTP server)
echo 2. Checking Python environment...
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo    ✗ Python not installed or not in PATH
    echo    Please install Python first: https://www.python.org/
    echo.
    pause
    exit /b 1
) else (
    echo    ✓ Python installed: 
    for /f "delims=" %%i in ('python --version') do echo       %%i
)
echo.

rem Check backend dependencies
echo 3. Checking backend dependencies...
if not exist "backend\node_modules" (
    echo.
    echo    ⚠ WARNING: Backend dependencies not installed
    echo    ----------------------------------------
    echo    Attempting to install dependencies automatically...
    echo.
    
    rem Try to install dependencies using cmd.exe (bypassing PowerShell restrictions)
    start "Installing Dependencies" /wait cmd /k "cd /d '%cd%' && cd backend && npm install && echo. && echo Dependencies installed successfully! && echo Press any key to continue... && pause >nul && exit"
    
    rem Check again if dependencies were installed
    if not exist "backend\node_modules" (
        echo    ✗ Automatic installation failed
        echo    ----------------------------------------
        echo    Please install manually using Command Prompt:
        echo.
        echo    1. Open CMD.exe (NOT PowerShell)
        echo    2. Run: cd /d "%cd%" && cd backend && npm install
        echo    3. Then run this script again
        echo.
        pause
        exit /b 1
    ) else (
        echo    ✓ Backend dependencies installed successfully
    )
) else (
    echo    ✓ Backend dependencies already installed
)
echo.

rem Create logs directory
if not exist "logs" mkdir logs

echo 4. Starting backend service (port 3001)...
echo    Starting Express server...
start "AI Backend Service" /min cmd /k "cd backend && npm run dev:backend > ..\logs\backend.log 2>&1"
echo    ✓ Backend service started (logs: logs\backend.log)
echo.

rem Wait for backend to initialize
echo    Waiting for backend initialization...
timeout /t 3 /nobreak >nul

echo 5. Starting frontend service (port 8080)...
echo    Starting HTTP server...
start "AI Frontend Service" /min cmd /k "cd frontend && python -m http.server 8080 > ..\logs\frontend.log 2>&1"
echo    ✓ Frontend service started (logs: logs\frontend.log)
echo.

rem Wait for frontend to initialize
timeout /t 2 /nobreak >nul

echo ====================================
echo         System Started Successfully!
echo ====================================
echo.
echo 🎉 Service Status:
echo    - Backend API: http://localhost:3001
echo    - Frontend UI: http://localhost:8080
echo    - Health Check: http://localhost:3001/api/health
echo.
echo 📋 System Features:
echo    - Document Upload Analysis
echo    - Real-time Progress Display
echo    - Multiple AI Providers
echo    - Intelligent Pause/Resume
echo    - Result Export Function
echo.
echo 🛠 Operation Info:
echo    - Backend Log: logs\backend.log
echo    - Frontend Log: logs\frontend.log
echo    - Press any key to stop all services
echo.
echo ====================================
echo.

rem Wait for user input
echo Press any key to stop all services and exit...
pause >nul

echo.
echo Stopping all services...

rem Stop backend service
taskkill /fi "WINDOWTITLE eq AI Backend Service" /f >nul 2>&1

echo    ✓ Backend service stopped

rem Stop frontend service
taskkill /fi "WINDOWTITLE eq AI Frontend Service" /f >nul 2>&1

echo    ✓ Frontend service stopped

rem Clean up temporary files
del /f /q logs\*.log >nul 2>&1
echo    ✓ Log files cleaned up

echo.
echo System stopped completely!
echo.
pause >nul