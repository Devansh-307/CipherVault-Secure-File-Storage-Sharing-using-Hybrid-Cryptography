#!/usr/bin/env bash
set -e

echo "=============================================================================="
echo "   CIPHERVAULT - ISOLATED DOCKER CONTAINER LAUNCHER"
echo "   React 18 + Tailwind CSS + Python FastAPI + Hybrid Cryptography"
echo "=============================================================================="

if ! docker info >/dev/null 2>&1; then
    echo "[!] ERROR: Docker daemon is not running."
    echo "[*] Please start Docker and run this script again."
    exit 1
fi

echo "[+] Docker daemon is active."
echo "[*] Building and starting isolated CipherVault container..."

docker compose up --build -d

echo ""
echo "=============================================================================="
echo "[+] CipherVault is running successfully in an isolated container!"
echo "[*] Web Application Dashboard: http://localhost:8000"
echo "[*] Interactive API Docs:       http://localhost:8000/docs"
echo "[*] Default Admin Login:        devansh (Password: Password123!)"
echo ""
echo "[*] To view logs: docker compose logs -f"
echo "[*] To stop:      docker compose down"
echo "=============================================================================="
