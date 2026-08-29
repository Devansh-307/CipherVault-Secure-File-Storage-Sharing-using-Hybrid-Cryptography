import os
import sys
import subprocess
import shutil
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
BACKEND_DIR = BASE_DIR / "backend"
FRONTEND_DIR = BASE_DIR / "frontend"
FRONTEND_DIST = FRONTEND_DIR / "dist"
sys.path.insert(0, str(BACKEND_DIR))

def build_react_if_needed():
    if not FRONTEND_DIST.exists():
        print("\n[*] Compiled React bundle not found in frontend/dist.")
        print("[*] Automatically building React + Tailwind CSS production bundle...")
        npm_cmd = shutil.which("npm") or shutil.which("npm.cmd")
        if npm_cmd:
            try:
                # Check node_modules
                if not (FRONTEND_DIR / "node_modules").exists():
                    print("[*] Installing npm dependencies...")
                    subprocess.run([npm_cmd, "install"], cwd=str(FRONTEND_DIR), check=True)
                
                print("[*] Running 'npm run build'...")
                subprocess.run([npm_cmd, "run", "build"], cwd=str(FRONTEND_DIR), check=True)
                print("[+] React application successfully compiled into frontend/dist!\n")
            except Exception as e:
                print(f"[!] Note: Automatic React build encountered: {e}")
                print("[!] You can build it manually by running 'npm install && npm run build' in frontend/\n")

def main():
    print("=" * 78)
    print("   CIPHERVAULT - HYBRID CRYPTOGRAPHY SECURE FILE STORAGE & SHARING")
    print("   React 18  +  Tailwind CSS  +  FastAPI  +  AES-256-GCM  +  RSA-2048")
    print("=" * 78)

    # 1. Check if database exists, if not, auto seed
    db_file = BACKEND_DIR / "ciphervault.db"
    if not db_file.exists():
        print("\n[+] Database not detected. Initializing schema and seed accounts...")
        from seed_data import seed_database
        seed_database()
        print("[+] Seeding complete!\n")

    # 2. Build React if dist missing
    build_react_if_needed()

    # 3. Start Uvicorn Server
    print("[*] Starting CipherVault Server on http://127.0.0.1:8000 ...")
    print("[*] React Cyber Dashboard:          http://127.0.0.1:8000")
    print("[*] OpenAPI & Swagger Docs:         http://127.0.0.1:8000/docs")
    print("[*] Vite Hot-Reload Dev Server:     cd frontend && npm run dev (http://127.0.0.1:5173)")
    print("[*] Press Ctrl+C to terminate.")
    print("=" * 78)

    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="127.0.0.1",
        port=8000,
        reload=False,
        app_dir=str(BACKEND_DIR)
    )

if __name__ == "__main__":
    main()
