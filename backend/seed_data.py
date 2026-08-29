import os
import sys
from pathlib import Path

# Add backend directory to sys.path
BASE_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(BASE_DIR))

from app.database import SessionLocal, Base, engine
from app.models.user import User
from app.models.file import FileRecord
from app.models.share import SharedFile
from app.models.audit import AuditLog
from app.schemas.auth import UserRegisterRequest
from app.services.auth_service import AuthService
from app.services.file_service import FileService

def seed_database():
    print("=== Initializing CipherVault Database and Seed Data ===")
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()

    try:
        # 1. Create Demo Users with Devansh Rathore as Chief Admin
        users_info = [
            {"username": "devansh", "email": "devansh@ciphervault.io", "password": "Password123!", "full_name": "Devansh Rathore", "role": "admin"},
            {"username": "bob", "email": "bob@ciphervault.io", "password": "Password123!", "full_name": "Bob Vance", "role": "user"},
            {"username": "charlie", "email": "charlie@ciphervault.io", "password": "Password123!", "full_name": "Charlie Davis", "role": "user"},
            {"username": "auditor", "email": "auditor@ciphervault.io", "password": "Password123!", "full_name": "Auditor General", "role": "auditor"},
        ]

        created_users = {}
        for u in users_info:
            req = UserRegisterRequest(
                username=u["username"],
                email=u["email"],
                password=u["password"],
                full_name=u["full_name"],
                role=u["role"]
            )
            user_obj = AuthService.register_user(db, req, ip_address="127.0.0.1", user_agent="SeedScript/1.0")
            created_users[u["username"]] = user_obj
            print(f"[+] Created user: {u['username']} ({u['full_name']} - {u['role']}) with 2048-bit RSA keypair")

        # 2. Create Sample Encrypted Files for Devansh Rathore
        devansh = created_users["devansh"]
        bob = created_users["bob"]
        charlie = created_users["charlie"]

        sample_file_1_content = (
            b"CIPHERVAULT CONFIDENTIAL PROJECT BLUEPRINT - ARCHITECTURE V3.2\n"
            b"==============================================================\n"
            b"Lead Architect: Devansh Rathore\n"
            b"Security Standard: NIST SP 800-38D (AES-256-GCM) + PKCS#1 v2.2 (RSA-2048 OAEP)\n"
            b"Integrity Verification: SHA-256 Digest with RSA-PSS Non-Repudiation Signatures\n"
            b"Status: ALL 13 TEST CASES PASSED WITH 100% VERIFICATION.\n"
        )

        sample_file_2_content = (
            b"ANNUAL CYBERSECURITY AUDIT STATEMENT\n"
            b"------------------------------------\n"
            b"Project Lead: Devansh Rathore\n"
            b"Zero Plaintext Storage: Verified (All keys PBKDF2 enveloped)\n"
            b"Tamper Resistance: 100% (AES-GCM Auth Tag Failure on all bit-flips)\n"
            b"Compliance Score: 100% (Compliant with NIST & FIPS Standards)\n"
        )

        f1 = FileService.upload_and_encrypt(
            db=db,
            file_bytes=sample_file_1_content,
            original_filename="ciphervault_blueprint.txt",
            mime_type="text/plain",
            owner=devansh,
            owner_password="Password123!",
            recipients=[bob, charlie],
            ip_address="127.0.0.1",
            user_agent="SeedScript/1.0"
        )
        print(f"[+] Encrypted and saved file: '{f1.original_filename}' (Owned by Devansh Rathore, shared with Bob & Charlie)")

        f2 = FileService.upload_and_encrypt(
            db=db,
            file_bytes=sample_file_2_content,
            original_filename="annual_cybersecurity_audit.txt",
            mime_type="text/plain",
            owner=bob,
            owner_password="Password123!",
            recipients=[devansh],
            ip_address="127.0.0.1",
            user_agent="SeedScript/1.0"
        )
        print(f"[+] Encrypted and saved file: '{f2.original_filename}' (Owned by Bob, shared with Devansh Rathore)")

        print("\n=== Database successfully seeded! ===")
        print("Demo User Credentials (Password for all users: 'Password123!'):")
        for u in users_info:
            print(f" - Username: {u['username']} | Name: {u['full_name']} | Role: {u['role']}")

    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
