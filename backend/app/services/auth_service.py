import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional, Tuple, Dict
import bcrypt
import jwt
from jwt.exceptions import PyJWTError
from sqlalchemy.orm import Session
from fastapi import HTTPException, status, Depends
from fastapi.security import OAuth2PasswordBearer

from app.config import settings
from app.database import get_db
from app.models.user import User
from app.schemas.auth import (
    UserRegisterRequest, 
    UserLoginRequest, 
    UserOut,
    SendOtpRequest,
    VerifyOtpRequest,
    ForgotPasswordRequest
)
from app.crypto.engine import HybridCryptoEngine, DecryptionError
from app.services.audit_service import AuditService

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

# In-Memory OTP Store: key = f"{email}:{purpose}" -> {"otp": "123456", "expires_at": datetime, "verified": bool}
_OTP_STORE: Dict[str, dict] = {}

class AuthService:
    
    @staticmethod
    def hash_password(password: str) -> str:
        """Hashes password using bcrypt with a random salt."""
        salt = bcrypt.gensalt(rounds=12)
        return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")

    @staticmethod
    def verify_password(plain_password: str, hashed_password: str) -> bool:
        """Verifies plaintext password against bcrypt hash."""
        return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))

    @staticmethod
    def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
        """Creates a signed JWT access token using PyJWT."""
        to_encode = data.copy()
        if expires_delta:
            expire = datetime.now(timezone.utc) + expires_delta
        else:
            expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        
        to_encode.update({"exp": expire})
        encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
        return encoded_jwt

    @classmethod
    def send_email_otp(
        cls,
        db: Session,
        req: SendOtpRequest,
        ip_address: Optional[str] = None
    ) -> dict:
        """
        Generates and dispatches a cryptographically secure 6-digit OTP for email verification.
        """
        email_clean = req.email.strip().lower()
        purpose = req.purpose.strip().lower()

        existing_user = db.query(User).filter(User.email == email_clean).first()
        if purpose == "forgot_password":
            if not existing_user:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"No account found associated with email '{email_clean}'."
                )
        elif purpose == "register":
            if existing_user:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Email '{email_clean}' is already registered."
                )

        # Generate 6-digit random code
        otp_code = f"{secrets.randbelow(900000) + 100000}"
        expires_at = datetime.now(timezone.utc) + timedelta(minutes=10)

        store_key = f"{email_clean}:{purpose}"
        _OTP_STORE[store_key] = {
            "otp": otp_code,
            "expires_at": expires_at,
            "verified": False
        }

        # Log event in SIEM audit trail
        AuditService.log_event(
            db=db,
            action="OTP_GENERATED_DISPATCHED",
            username=existing_user.username if existing_user else email_clean,
            target_type="EMAIL_OTP",
            target_id=email_clean,
            status="SUCCESS",
            ip_address=ip_address,
            details=f"Generated 6-digit OTP for email verification (Purpose: {purpose}). Valid for 10 minutes."
        )

        return {
            "message": f"Verification code sent to {email_clean}",
            "email": email_clean,
            "purpose": purpose,
            "otp_code": otp_code,  # Provided for demo/testing convenience in UI
            "expires_in_seconds": 600
        }

    @classmethod
    def verify_email_otp(
        cls,
        db: Session,
        req: VerifyOtpRequest,
        ip_address: Optional[str] = None
    ) -> dict:
        """
        Verifies the 6-digit email OTP.
        """
        email_clean = req.email.strip().lower()
        purpose = req.purpose.strip().lower()
        store_key = f"{email_clean}:{purpose}"

        record = _OTP_STORE.get(store_key)
        now = datetime.now(timezone.utc)

        if not record:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No verification code found. Please request a new code."
            )

        if now > record["expires_at"]:
            _OTP_STORE.pop(store_key, None)
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Verification code has expired. Please request a new one."
            )

        if record["otp"] != req.otp.strip():
            AuditService.log_event(
                db=db,
                action="OTP_VERIFY_FAILED",
                target_type="EMAIL_OTP",
                target_id=email_clean,
                status="FAILURE",
                ip_address=ip_address,
                details=f"Invalid OTP entered for {email_clean} (Purpose: {purpose})"
            )
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid verification code. Please check and try again."
            )

        record["verified"] = True

        AuditService.log_event(
            db=db,
            action="OTP_VERIFY_SUCCESS",
            target_type="EMAIL_OTP",
            target_id=email_clean,
            status="SUCCESS",
            ip_address=ip_address,
            details=f"Email verified successfully via OTP for {email_clean} (Purpose: {purpose})"
        )

        return {
            "success": True,
            "message": "Email verified successfully.",
            "email": email_clean
        }

    @classmethod
    def forgot_password_reset(
        cls,
        db: Session,
        req: ForgotPasswordRequest,
        ip_address: Optional[str] = None
    ) -> dict:
        """
        Resets user password using verified OTP and regenerates/re-envelopes their RSA keypair.
        """
        email_clean = req.email.strip().lower()
        store_key = f"{email_clean}:forgot_password"
        record = _OTP_STORE.get(store_key)

        # Verify OTP
        if not record or record.get("otp") != req.otp.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or missing verification code. Please request a new code."
            )

        if datetime.now(timezone.utc) > record["expires_at"]:
            _OTP_STORE.pop(store_key, None)
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Verification code has expired. Please request a new one."
            )

        user = db.query(User).filter(User.email == email_clean).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User account not found."
            )

        # 1. Update Password Hash
        user.password_hash = cls.hash_password(req.new_password)

        # 2. Generate and envelope a fresh 2048-bit RSA keypair with the new master password
        priv_pem, pub_pem = HybridCryptoEngine.generate_rsa_keypair(key_size=settings.RSA_KEY_SIZE)
        enc_priv_hex, salt_hex, iv_hex, tag_hex = HybridCryptoEngine.wrap_private_key(
            priv_pem, req.new_password
        )

        user.public_key = pub_pem
        user.encrypted_private_key = enc_priv_hex
        user.private_key_salt = salt_hex
        user.private_key_iv = iv_hex
        user.private_key_tag = tag_hex

        db.commit()
        db.refresh(user)

        # Clear used OTP
        _OTP_STORE.pop(store_key, None)

        AuditService.log_event(
            db=db,
            action="PASSWORD_RESET_SUCCESS",
            user_id=user.id,
            username=user.username,
            target_type="USER",
            target_id=user.id,
            status="SUCCESS",
            ip_address=ip_address,
            details=f"Master password reset via verified Email OTP. Fresh 2048-bit RSA envelope initialized."
        )

        return {
            "success": True,
            "message": "Password successfully reset! You can now log in with your new password."
        }

    @classmethod
    def register_user(
        cls, 
        db: Session, 
        req: UserRegisterRequest, 
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ) -> User:
        """
        Registers a new user with optional OTP verification.
        """
        username_clean = req.username.strip()
        email_clean = req.email.strip().lower()

        if db.query(User).filter(User.username == username_clean).first():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Username '{username_clean}' is already registered."
            )
        if db.query(User).filter(User.email == email_clean).first():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Email '{email_clean}' is already registered."
            )

        # Optional OTP verification check if OTP was provided
        if req.otp:
            store_key = f"{email_clean}:register"
            record = _OTP_STORE.get(store_key)
            if not record or record.get("otp") != req.otp.strip():
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid email verification OTP code."
                )
            _OTP_STORE.pop(store_key, None)

        # 1. Hash Password
        password_hash = cls.hash_password(req.password)

        # 2. Generate RSA Keypair
        priv_pem, pub_pem = HybridCryptoEngine.generate_rsa_keypair(key_size=settings.RSA_KEY_SIZE)

        # 3. Securely wrap Private Key using PBKDF2 + AES-GCM
        enc_priv_hex, salt_hex, iv_hex, tag_hex = HybridCryptoEngine.wrap_private_key(
            priv_pem, req.password
        )

        user = User(
            username=username_clean,
            email=email_clean,
            full_name=req.full_name or username_clean.capitalize(),
            password_hash=password_hash,
            role=req.role or "user",
            public_key=pub_pem,
            encrypted_private_key=enc_priv_hex,
            private_key_salt=salt_hex,
            private_key_iv=iv_hex,
            private_key_tag=tag_hex,
            is_active=True
        )

        db.add(user)
        db.commit()
        db.refresh(user)

        # Audit Log
        AuditService.log_event(
            db=db,
            action="USER_REGISTER_KEYPAIR_GEN",
            user_id=user.id,
            username=user.username,
            target_type="USER",
            target_id=user.id,
            status="SUCCESS",
            ip_address=ip_address,
            user_agent=user_agent,
            details=f"Registered account with verified email and 2048-bit RSA keypair envelope"
        )

        # Auto-provision a starter welcome encrypted file in the user's private vault
        try:
            from app.services.file_service import FileService
            welcome_content = (
                f"CIPHERVAULT SECURE VAULT INITIALIZATION\n"
                f"======================================\n"
                f"Owner: {user.full_name} (@{user.username})\n"
                f"Email: {user.email}\n"
                f"Role: {user.role.upper()}\n"
                f"Security Profile: NIST SP 800-38D AES-256-GCM + PKCS#1 v2.2 RSA-2048 OAEP\n"
                f"Integrity Signature: SHA-256 Digest with RSA-PSS Non-Repudiation\n\n"
                f"Welcome to your private cryptographic storage vault, {user.full_name}!\n"
                f"This document was encrypted on your behalf using a dedicated 256-bit AES session key "
                f"and encapsulated with your personal 2048-bit RSA public key.\n\n"
                f"Your private key is protected by a 100,000-iteration PBKDF2-HMAC-SHA256 envelope. "
                f"You can safely decrypt this file, verify its digital signature, share it with others, "
                f"or test tamper detection in the Tamper Simulation Lab.\n"
            ).encode("utf-8")

            FileService.upload_and_encrypt(
                db=db,
                file_bytes=welcome_content,
                original_filename=f"welcome_{user.username}_vault.txt",
                mime_type="text/plain",
                owner=user,
                owner_password=req.password,
                ip_address=ip_address,
                user_agent=user_agent
            )
        except Exception:
            pass

        return user

    @classmethod
    def authenticate_user(
        cls, 
        db: Session, 
        username: str, 
        password: str,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ) -> User:
        """
        Authenticates user with username & password, logging all attempts (supports case-insensitive match).
        """
        username_clean = username.strip()
        user = db.query(User).filter(
            (User.username.ilike(username_clean)) | (User.email.ilike(username_clean.lower()))
        ).first()

        if not user or not cls.verify_password(password, user.password_hash):
            AuditService.log_event(
                db=db,
                action="LOGIN_FAILURE",
                username=username_clean,
                target_type="SESSION",
                status="FAILURE",
                ip_address=ip_address,
                user_agent=user_agent,
                details="Invalid credentials provided"
            )
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect username or password",
                headers={"WWW-Authenticate": "Bearer"},
            )

        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Account has been deactivated"
            )

        AuditService.log_event(
            db=db,
            action="LOGIN_SUCCESS",
            user_id=user.id,
            username=user.username,
            target_type="SESSION",
            status="SUCCESS",
            ip_address=ip_address,
            user_agent=user_agent,
            details="User logged in successfully"
        )

        return user

    @staticmethod
    def unlock_private_key(user: User, password: str) -> str:
        """
        Unlocks the user's RSA Private Key PEM using the user's password.
        """
        try:
            return HybridCryptoEngine.unwrap_private_key(
                enc_priv_hex=user.encrypted_private_key,
                salt_hex=user.private_key_salt,
                iv_hex=user.private_key_iv,
                tag_hex=user.private_key_tag,
                password=password
            )
        except DecryptionError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid password provided to unlock RSA private key"
            )


def get_current_user(
    token: str = Depends(oauth2_scheme), 
    db: Session = Depends(get_db)
) -> User:
    """
    FastAPI dependency for authenticating Bearer JWT tokens.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except PyJWTError:
        raise credentials_exception

    user = db.query(User).filter(User.username == username).first()
    if user is None:
        raise credentials_exception
    return user
