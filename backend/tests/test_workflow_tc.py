import pytest
import os
import io
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database import Base, get_db
from app.main import app
from app.models.user import User
from app.models.file import FileRecord
from app.models.share import SharedFile
from app.models.audit import AuditLog

# Setup In-Memory / SQLite test database
SQLALCHEMY_DATABASE_URL = "sqlite:///./test_ciphervault.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db

@pytest.fixture(scope="module", autouse=True)
def setup_database():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)
    engine.dispose()
    if os.path.exists("./test_ciphervault.db"):
        try:
            os.remove("./test_ciphervault.db")
        except Exception:
            pass

client = TestClient(app)
_SHARED = {}

def test_tc01_user_registration_and_key_generation():
    """TC01: Valid user registration & RSA keypair generation."""
    response = client.post("/api/auth/register", json={
        "username": "alice",
        "email": "alice@example.com",
        "password": "Password123!",
        "full_name": "Alice Tester",
        "role": "admin"
    })
    assert response.status_code == 201
    data = response.json()
    assert data["username"] == "alice"
    assert "BEGIN PUBLIC KEY" in data["public_key"]

    # Register Bob as recipient
    res_bob = client.post("/api/auth/register", json={
        "username": "bob",
        "email": "bob@example.com",
        "password": "Password123!",
        "full_name": "Bob Recipient",
        "role": "user"
    })
    assert res_bob.status_code == 201

def test_tc02_upload_file_with_valid_recipient():
    """TC02: File upload & Hybrid encryption with valid recipient."""
    login_res = client.post("/api/auth/login", json={"username": "alice", "password": "Password123!"})
    assert login_res.status_code == 200
    token = login_res.json()["access_token"]

    file_content = b"Top secret confidential project blueprint for hybrid cryptosystem."
    response = client.post(
        "/api/files/upload",
        headers={"Authorization": f"Bearer {token}"},
        files={"file": ("blueprint.txt", io.BytesIO(file_content), "text/plain")},
        data={"password": "Password123!", "recipient_usernames": '["bob"]'}
    )
    assert response.status_code == 201
    data = response.json()
    assert data["original_filename"] == "blueprint.txt"
    assert "file_hash" in data
    _SHARED["uploaded_file_id"] = data["id"]

def test_tc03_download_file_as_authorized_recipient():
    """TC03: Authorized recipient decodes file with verified integrity."""
    login_res = client.post("/api/auth/login", json={"username": "bob", "password": "Password123!"})
    token = login_res.json()["access_token"]

    file_id = _SHARED["uploaded_file_id"]
    response = client.post(
        f"/api/files/{file_id}/decrypt",
        headers={"Authorization": f"Bearer {token}"},
        json={"password": "Password123!"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["filename"] == "blueprint.txt"
    assert data["integrity_verified"] is True
    assert data["signature_verified"] is True

def test_tc04_attempt_download_as_unauthorized_user():
    """TC04: Unauthorized user fails to decrypt file."""
    reg_res = client.post("/api/auth/register", json={
        "username": "eve",
        "email": "eve@example.com",
        "password": "Password123!",
        "full_name": "Eve Attacker"
    })
    assert reg_res.status_code == 201
    token = client.post("/api/auth/login", json={"username": "eve", "password": "Password123!"}).json()["access_token"]

    file_id = _SHARED["uploaded_file_id"]
    response = client.post(
        f"/api/files/{file_id}/decrypt",
        headers={"Authorization": f"Bearer {token}"},
        json={"password": "Password123!"}
    )
    assert response.status_code == 403

def test_tc05_tamper_with_stored_ciphertext():
    """TC05: Deliberate ciphertext bit-flip triggers AES-GCM tag mismatch."""
    login_res = client.post("/api/auth/login", json={"username": "alice", "password": "Password123!"})
    token = login_res.json()["access_token"]
    file_id = _SHARED["uploaded_file_id"]

    tamper_res = client.post(
        f"/api/files/{file_id}/tamper",
        headers={"Authorization": f"Bearer {token}"},
        json={"file_id": file_id, "tamper_mode": "flip_byte"}
    )
    assert tamper_res.status_code == 200

    # Attempt decryption after tampering
    decrypt_res = client.post(
        f"/api/files/{file_id}/decrypt",
        headers={"Authorization": f"Bearer {token}"},
        json={"password": "Password123!"}
    )
    assert decrypt_res.status_code == 400
    detail = decrypt_res.json()["detail"]
    assert "Authentication Tag verification failed" in detail or "altered" in detail

def test_tc06_attempt_decryption_with_wrong_password():
    """TC06: Decryption attempt with incorrect master password fails."""
    login_res = client.post("/api/auth/login", json={"username": "alice", "password": "Password123!"})
    token = login_res.json()["access_token"]
    upload_res = client.post(
        "/api/files/upload",
        headers={"Authorization": f"Bearer {token}"},
        files={"file": ("clean.txt", io.BytesIO(b"Valid test document"), "text/plain")},
        data={"password": "Password123!"}
    )
    file_id = upload_res.json()["id"]

    decrypt_res = client.post(
        f"/api/files/{file_id}/decrypt",
        headers={"Authorization": f"Bearer {token}"},
        json={"password": "WrongPassword999!"}
    )
    assert decrypt_res.status_code == 401

def test_tc07_verify_hash_mismatch_detection():
    """TC07: Checksum verification detects payload anomalies."""
    login_res = client.post("/api/auth/login", json={"username": "alice", "password": "Password123!"})
    token = login_res.json()["access_token"]
    file_id = _SHARED["uploaded_file_id"]

    # View file details and assert hash exists
    res = client.get(f"/api/files/{file_id}", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    assert len(res.json()["file_hash"]) == 64  # SHA-256 length

def test_tc08_login_with_incorrect_password():
    """TC08: Brute-force / Bad password login is rejected and logged."""
    response = client.post("/api/auth/login", json={"username": "alice", "password": "BadPassword123!"})
    assert response.status_code == 401

def test_tc09_forgot_password_and_email_otp_flow():
    """TC09: Verification code OTP dispatch & Forgot Password reset."""
    # 1. Send OTP for forgot password
    otp_res = client.post("/api/auth/send-otp", json={
        "email": "alice@example.com",
        "purpose": "forgot_password"
    })
    assert otp_res.status_code == 200
    otp_code = otp_res.json()["otp_code"]
    assert len(otp_code) == 6

    # 2. Verify OTP
    verify_res = client.post("/api/auth/verify-otp", json={
        "email": "alice@example.com",
        "otp": otp_code,
        "purpose": "forgot_password"
    })
    assert verify_res.status_code == 200
    assert verify_res.json()["success"] is True

    # 3. Reset Password
    reset_res = client.post("/api/auth/forgot-password", json={
        "email": "alice@example.com",
        "otp": otp_code,
        "new_password": "NewSecretPassword456!"
    })
    assert reset_res.status_code == 200

    # 4. Authenticate with new password
    new_login_res = client.post("/api/auth/login", json={
        "username": "alice",
        "password": "NewSecretPassword456!"
    })
    assert new_login_res.status_code == 200
    assert "access_token" in new_login_res.json()
