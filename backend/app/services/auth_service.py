from datetime import datetime, timedelta
from typing import Optional, Tuple
import bcrypt
import jwt
from jwt.exceptions import PyJWTError
from sqlalchemy.orm import Session
from fastapi import HTTPException, status, Depends
from fastapi.security import OAuth2PasswordBearer

from app.config import settings
from app.database import get_db
from app.models.user import User
from app.schemas.auth import UserRegisterRequest, UserLoginRequest, UserOut
from app.crypto.engine import HybridCryptoEngine, DecryptionError
from app.services.audit_service import AuditService

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

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
            expire = datetime.utcnow() + expires_delta
        else:
            expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        
        to_encode.update({"exp": expire})
        encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
        return encoded_jwt

    @classmethod
    def register_user(
        cls, 
        db: Session, 
        req: UserRegisterRequest, 
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ) -> User:
        """
        Registers a new user:
        1. Checks for unique username/email
        2. Hashes password with bcrypt
        3. Generates 2048-bit RSA keypair
        4. Encrypts RSA private key using PBKDF2-derived KEK from user password
        5. Saves public key and encrypted private key envelope to database
        6. Logs audit trail event
        """
        if db.query(User).filter(User.username == req.username).first():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Username '{req.username}' is already registered."
            )
        if db.query(User).filter(User.email == req.email).first():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Email '{req.email}' is already registered."
            )

        # 1. Hash Password
        password_hash = cls.hash_password(req.password)

        # 2. Generate RSA Keypair
        priv_pem, pub_pem = HybridCryptoEngine.generate_rsa_keypair(key_size=settings.RSA_KEY_SIZE)

        # 3. Securely wrap Private Key using PBKDF2 + AES-GCM
        enc_priv_hex, salt_hex, iv_hex, tag_hex = HybridCryptoEngine.wrap_private_key(
            priv_pem, req.password
        )

        user = User(
            username=req.username,
            email=req.email,
            full_name=req.full_name or req.username.capitalize(),
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
            details=f"Registered account with 2048-bit RSA keypair and PBKDF2 protected envelope"
        )

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
        Authenticates user with username & password, logging all attempts.
        """
        user = db.query(User).filter(User.username == username).first()
        if not user or not cls.verify_password(password, user.password_hash):
            AuditService.log_event(
                db=db,
                action="LOGIN_FAILURE",
                username=username,
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
