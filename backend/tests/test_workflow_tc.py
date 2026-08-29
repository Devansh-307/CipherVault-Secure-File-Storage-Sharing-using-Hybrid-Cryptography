import pytest
import io
import base64

def get_auth_token(client, username, password):
    resp = client.post("/api/auth/login", json={"username": username, "password": password})
    assert resp.status_code == 200, f"Login failed for {username}: {resp.text}"
    return resp.json()["access_token"]

def test_tc01_user_registration_and_key_generation(client):
    """
    TC01: Register new user and generate RSA key pair.
    Expected: Key pair generated and stored securely in database with PBKDF2 envelope.
    """
    resp = client.post("/api/auth/register", json={
        "username": "tc01_user",
        "email": "tc01@vault.io",
        "password": "Password123!",
        "full_name": "TC01 Test User",
        "role": "user"
    })
    assert resp.status_code == 201
    data = resp.json()
    assert data["username"] == "tc01_user"
    assert "BEGIN PUBLIC KEY" in data["public_key"]

def test_tc02_upload_file_with_valid_recipient(client):
    """
    TC02: Upload file with valid recipient.
    Expected: File encrypted with AES; session key wrapped with recipient's RSA key.
    """
    alice_token = get_auth_token(client, "test_alice", "SecretPassword123!")
    headers = {"Authorization": f"Bearer {alice_token}"}

    file_content = b"Confidential Research Dataset for TC02"
    files = {"file": ("tc02_data.txt", io.BytesIO(file_content), "text/plain")}
    data = {
        "password": "SecretPassword123!",
        "recipient_usernames": '["test_bob"]'
    }

    resp = client.post("/api/files/upload", headers=headers, files=files, data=data)
    assert resp.status_code == 201
    file_info = resp.json()
    assert file_info["original_filename"] == "tc02_data.txt"
    assert file_info["file_size_bytes"] == len(file_content)
    assert file_info["has_signature"] is True

def test_tc03_download_file_as_authorized_recipient(client):
    """
    TC03: Download file as authorized recipient.
    Expected: File decrypted successfully; SHA-256 hash matches 100%.
    """
    # 1. Alice uploads and shares with Bob
    alice_token = get_auth_token(client, "test_alice", "SecretPassword123!")
    headers_alice = {"Authorization": f"Bearer {alice_token}"}

    payload = b"TC03 High Integrity Document for Bob"
    files = {"file": ("tc03_doc.txt", io.BytesIO(payload), "text/plain")}
    data = {
        "password": "SecretPassword123!",
        "recipient_usernames": '["test_bob"]'
    }
    up_resp = client.post("/api/files/upload", headers=headers_alice, files=files, data=data)
    assert up_resp.status_code == 201
    file_id = up_resp.json()["id"]

    # 2. Bob downloads and decrypts using Bob's password
    bob_token = get_auth_token(client, "test_bob", "SecretPassword123!")
    headers_bob = {"Authorization": f"Bearer {bob_token}"}

    dec_resp = client.post(f"/api/files/{file_id}/decrypt", headers=headers_bob, json={
        "password": "SecretPassword123!"
    })
    assert dec_resp.status_code == 200
    dec_data = dec_resp.json()
    assert dec_data["integrity_verified"] is True
    assert dec_data["signature_verified"] is True
    decrypted_bytes = base64.b64decode(dec_data["content_base64"])
    assert decrypted_bytes == payload

def test_tc04_attempt_download_as_unauthorized_user(client):
    """
    TC04: Attempt download as unauthorized user (Eve).
    Expected: Access denied (403 Forbidden).
    """
    # Alice uploads a private file (not shared with Eve)
    alice_token = get_auth_token(client, "test_alice", "SecretPassword123!")
    headers_alice = {"Authorization": f"Bearer {alice_token}"}

    files = {"file": ("alice_private.txt", io.BytesIO(b"Alice Private Diary"), "text/plain")}
    data = {"password": "SecretPassword123!"}
    up_resp = client.post("/api/files/upload", headers=headers_alice, files=files, data=data)
    file_id = up_resp.json()["id"]

    # Eve tries to decrypt
    eve_token = get_auth_token(client, "test_eve", "SecretPassword123!")
    headers_eve = {"Authorization": f"Bearer {eve_token}"}

    dec_resp = client.post(f"/api/files/{file_id}/decrypt", headers=headers_eve, json={
        "password": "SecretPassword123!"
    })
    assert dec_resp.status_code == 403

def test_tc05_tamper_with_stored_ciphertext(client):
    """
    TC05: Tamper with stored ciphertext.
    Expected: GCM authentication tag verification fails.
    """
    alice_token = get_auth_token(client, "test_alice", "SecretPassword123!")
    headers_alice = {"Authorization": f"Bearer {alice_token}"}

    files = {"file": ("tamper_test.txt", io.BytesIO(b"Original Untampered Content"), "text/plain")}
    data = {"password": "SecretPassword123!"}
    up_resp = client.post("/api/files/upload", headers=headers_alice, files=files, data=data)
    file_id = up_resp.json()["id"]

    # Tamper with the ciphertext on disk
    tamper_resp = client.post(f"/api/files/{file_id}/tamper", headers=headers_alice, json={"file_id": file_id, "tamper_mode": "flip_byte"})
    assert tamper_resp.status_code == 200

    # Decryption must now fail with security alert
    dec_resp = client.post(f"/api/files/{file_id}/decrypt", headers=headers_alice, json={
        "password": "SecretPassword123!"
    })
    assert dec_resp.status_code == 400
    assert "Authentication Tag" in dec_resp.text or "tampered" in dec_resp.text

def test_tc06_attempt_decryption_with_wrong_password(client):
    """
    TC06: Attempt decryption with wrong private key password.
    Expected: RSA decryption fails / session key not recovered (401 Unauthorized).
    """
    alice_token = get_auth_token(client, "test_alice", "SecretPassword123!")
    headers_alice = {"Authorization": f"Bearer {alice_token}"}

    files = {"file": ("secret_key_test.txt", io.BytesIO(b"Secret Document"), "text/plain")}
    data = {"password": "SecretPassword123!"}
    up_resp = client.post("/api/files/upload", headers=headers_alice, files=files, data=data)
    file_id = up_resp.json()["id"]

    # Try decrypting with wrong password
    dec_resp = client.post(f"/api/files/{file_id}/decrypt", headers=headers_alice, json={
        "password": "IncorrectPassword999!"
    })
    assert dec_resp.status_code == 401

def test_tc07_verify_hash_mismatch_detection(client):
    """
    TC07: Verify hash mismatch detection.
    Expected: Integrity check flags altered payload.
    """
    from app.crypto.engine import HybridCryptoEngine
    original_data = b"Authentic payload"
    altered_data = b"Tampered payload"

    orig_hash = HybridCryptoEngine.compute_sha256(original_data)
    altered_hash = HybridCryptoEngine.compute_sha256(altered_data)
    
    assert orig_hash != altered_hash

def test_tc08_login_with_incorrect_password(client):
    """
    TC08: Login with incorrect password.
    Expected: Authentication rejected (401 Unauthorized); attempt logged in audit table.
    """
    resp = client.post("/api/auth/login", json={
        "username": "test_alice",
        "password": "WrongPasswordBad!"
    })
    assert resp.status_code == 401

    # Check security audit log endpoint as logged-in user
    alice_token = get_auth_token(client, "test_alice", "SecretPassword123!")
    headers = {"Authorization": f"Bearer {alice_token}"}
    audit_resp = client.get("/api/security/audit-logs?action=LOGIN_FAILURE", headers=headers)
    assert audit_resp.status_code == 200
    logs = audit_resp.json()
    assert any(log["action"] == "LOGIN_FAILURE" for log in logs)
