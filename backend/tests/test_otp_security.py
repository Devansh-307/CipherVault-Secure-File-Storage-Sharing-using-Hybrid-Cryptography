import pytest
import hashlib
from datetime import datetime, timezone, timedelta
from app.models.otp import OTPRecord
from app.models.user import User
from app.services.email_service import EmailService

def test_otp_generation_and_hashing(client, db_session, monkeypatch):
    """Verifies OTP generation produces a 6-digit code, stores only SHA-256 hash, and omits plaintext from response."""
    captured = {}
    def mock_send(to_email, otp_code, expiry_minutes=10):
        captured[to_email] = otp_code
        return True

    monkeypatch.setattr(EmailService, "send_otp_email", mock_send)

    res = client.post("/api/auth/send-otp", json={
        "email": "test_alice@vault.io",
        "purpose": "forgot_password"
    })
    assert res.status_code == 200
    data = res.json()
    assert "otp_code" not in data  # Plaintext NEVER returned in response
    assert data["expires_in_seconds"] == 600
    assert data["resend_cooldown_seconds"] == 60

    # Verify captured OTP is 6 digits
    otp_code = captured["test_alice@vault.io"]
    assert len(otp_code) == 6
    assert otp_code.isdigit()

    # Verify database storage: Only SHA-256 hash stored
    record = db_session.query(OTPRecord).filter(
        OTPRecord.email == "test_alice@vault.io",
        OTPRecord.purpose == "forgot_password",
        OTPRecord.used == False
    ).order_by(OTPRecord.created_at.desc()).first()

    assert record is not None
    expected_hash = hashlib.sha256(otp_code.encode("utf-8")).hexdigest()
    assert record.otp_hash == expected_hash
    assert record.attempts == 0
    assert record.used is False

def test_otp_anti_enumeration(client, monkeypatch):
    """Verifies requesting reset for an unregistered email returns a generic success response to prevent enumeration."""
    captured = {}
    def mock_send(to_email, otp_code, expiry_minutes=10):
        captured[to_email] = otp_code
        return True

    monkeypatch.setattr(EmailService, "send_otp_email", mock_send)

    res = client.post("/api/auth/send-otp", json={
        "email": "nonexistent_user@vault.io",
        "purpose": "forgot_password"
    })
    assert res.status_code == 200
    data = res.json()
    assert "If this email is registered" in data["message"]
    # No email actually dispatched for non-existent user
    assert "nonexistent_user@vault.io" not in captured

def test_otp_resend_cooldown(client, monkeypatch):
    """Verifies 60-second cooldown rejects rapid resend requests with HTTP 429."""
    monkeypatch.setattr(EmailService, "send_otp_email", lambda *args, **kwargs: True)

    # First request
    res1 = client.post("/api/auth/send-otp", json={
        "email": "test_bob@vault.io",
        "purpose": "forgot_password"
    })
    assert res1.status_code == 200

    # Immediate second request
    res2 = client.post("/api/auth/send-otp", json={
        "email": "test_bob@vault.io",
        "purpose": "forgot_password"
    })
    assert res2.status_code == 429
    assert "seconds before requesting another" in res2.json()["detail"]

def test_otp_expiry(client, db_session, monkeypatch):
    """Verifies expired OTP codes are rejected and marked as used."""
    captured = {}
    monkeypatch.setattr(EmailService, "send_otp_email", lambda to_email, otp_code, **kw: captured.update({to_email: otp_code}) or True)

    client.post("/api/auth/send-otp", json={
        "email": "test_eve@vault.io",
        "purpose": "forgot_password"
    })
    otp_code = captured["test_eve@vault.io"]

    # Manually expire the record in the database
    record = db_session.query(OTPRecord).filter(
        OTPRecord.email == "test_eve@vault.io",
        OTPRecord.purpose == "forgot_password",
        OTPRecord.used == False
    ).first()
    record.expires_at = datetime.now(timezone.utc) - timedelta(minutes=5)
    db_session.commit()

    # Attempt verification
    verify_res = client.post("/api/auth/verify-otp", json={
        "email": "test_eve@vault.io",
        "otp": otp_code,
        "purpose": "forgot_password"
    })
    assert verify_res.status_code == 400
    assert "expired" in verify_res.json()["detail"].lower()

    # Ensure record is marked as used
    db_session.refresh(record)
    assert record.used is True

def test_otp_attempts_lockout(client, db_session, monkeypatch):
    """Verifies 5 failed verification attempts permanently locks out the OTP record."""
    captured = {}
    monkeypatch.setattr(EmailService, "send_otp_email", lambda to_email, otp_code, **kw: captured.update({to_email: otp_code}) or True)

    test_email = "lockout_user@vault.io"
    # Seed user for test
    from app.schemas.auth import UserRegisterRequest
    from app.services.auth_service import AuthService
    AuthService.register_user(db_session, UserRegisterRequest(username="lockout_user", email=test_email, password="Password123!"))

    client.post("/api/auth/send-otp", json={"email": test_email, "purpose": "forgot_password"})
    correct_otp = captured[test_email]
    wrong_otp = "000000" if correct_otp != "000000" else "111111"

    # Send 4 wrong attempts
    for i in range(1, 5):
        res = client.post("/api/auth/verify-otp", json={
            "email": test_email,
            "otp": wrong_otp,
            "purpose": "forgot_password"
        })
        assert res.status_code == 400
        assert f"{5 - i} attempt(s) remaining" in res.json()["detail"]

    # 5th wrong attempt should lock out
    res5 = client.post("/api/auth/verify-otp", json={
        "email": test_email,
        "otp": wrong_otp,
        "purpose": "forgot_password"
    })
    assert res5.status_code == 400
    assert "maximum verification attempts exceeded" in res5.json()["detail"].lower()

    # Attempting with correct OTP now should still fail
    res_correct = client.post("/api/auth/verify-otp", json={
        "email": test_email,
        "otp": correct_otp,
        "purpose": "forgot_password"
    })
    assert res_correct.status_code == 400

def test_otp_single_use_invalidation(client, db_session, monkeypatch):
    """Verifies once an OTP is used to reset master key, it cannot be reused."""
    captured = {}
    monkeypatch.setattr(EmailService, "send_otp_email", lambda to_email, otp_code, **kw: captured.update({to_email: otp_code}) or True)

    test_email = "reuse_test@vault.io"
    from app.schemas.auth import UserRegisterRequest
    from app.services.auth_service import AuthService
    AuthService.register_user(db_session, UserRegisterRequest(username="reuse_test", email=test_email, password="OldPassword123!"))

    # Request OTP
    client.post("/api/auth/send-otp", json={"email": test_email, "purpose": "forgot_password"})
    otp_code = captured[test_email]

    # Reset password with OTP
    reset_res = client.post("/api/auth/forgot-password", json={
        "email": test_email,
        "otp": otp_code,
        "new_password": "BrandNewPassword789!"
    })
    assert reset_res.status_code == 200
    assert reset_res.json()["success"] is True

    # Try reusing same OTP
    reuse_res = client.post("/api/auth/forgot-password", json={
        "email": test_email,
        "otp": otp_code,
        "new_password": "AnotherNewPassword999!"
    })
    assert reuse_res.status_code == 400
    assert "no active verification code" in reuse_res.json()["detail"].lower()

    # Verify user can log in with new password
    login_res = client.post("/api/auth/login", json={
        "username": "reuse_test",
        "password": "BrandNewPassword789!"
    })
    assert login_res.status_code == 200
    assert "access_token" in login_res.json()
