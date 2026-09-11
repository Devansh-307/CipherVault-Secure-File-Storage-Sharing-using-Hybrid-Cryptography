@echo off
title CipherVault Docker Launcher
echo ==============================================================================
echo    CIPHERVAULT - ISOLATED DOCKER CONTAINER LAUNCHER
echo    React 18 + Tailwind CSS + Python FastAPI + Hybrid Cryptography
echo ==============================================================================
echo.
echo [*] Checking Docker daemon status...
docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo [!] ERROR: Docker is not running or not detected.
    echo [*] Please start Docker Desktop and run this script again.
    pause
    exit /b 1
)

echo [+] Docker daemon is active.
echo [*] Building and launching isolated CipherVault container...
echo.

docker compose up --build -d

echo.
echo ==============================================================================
echo [+] CipherVault is now running in an isolated container!
echo [*] Container Name: ciphervault-app
echo [*] Web Application Dashboard: http://localhost:8000
echo [*] Interactive API Docs:       http://localhost:8000/docs
echo [*] Default Admin Login:        devansh (Password: Password123!)
echo.
echo [*] To view live container logs:  docker compose logs -f
echo [*] To stop the container:       docker compose down
echo ==============================================================================
echo.
pause
