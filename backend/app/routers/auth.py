from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.schemas.auth import (
    UserRegisterRequest, 
    UserLoginRequest, 
    TokenResponse, 
    UserOut, 
    UserPublicKeyOut,
    SendOtpRequest,
    VerifyOtpRequest,
    ForgotPasswordRequest
)
from app.services.auth_service import AuthService, get_current_user

auth_router = APIRouter(prefix="/auth", tags=["Authentication & Key Management"])
router = auth_router  # Alias for backward compatibility

@auth_router.post("/send-otp")
def send_email_otp(
    req: SendOtpRequest,
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Dispatches a 6-digit OTP to the user's email for registration or password reset.
    """
    client_ip = request.client.host if request.client else None
    return AuthService.send_email_otp(db, req, ip_address=client_ip)

@auth_router.post("/verify-otp")
def verify_email_otp(
    req: VerifyOtpRequest,
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Verifies the 6-digit email OTP.
    """
    client_ip = request.client.host if request.client else None
    return AuthService.verify_email_otp(db, req, ip_address=client_ip)

@auth_router.post("/forgot-password")
def forgot_password_reset(
    req: ForgotPasswordRequest,
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Resets account master password and initializes fresh 2048-bit RSA envelope using verified OTP.
    """
    client_ip = request.client.host if request.client else None
    return AuthService.forgot_password_reset(db, req, ip_address=client_ip)

@auth_router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def register(
    req: UserRegisterRequest, 
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Registers a new user and generates their 2048-bit RSA keypair with PBKDF2 envelope.
    """
    client_ip = request.client.host if request.client else None
    user_agent = request.headers.get("User-Agent")
    return AuthService.register_user(db, req, ip_address=client_ip, user_agent=user_agent)

@auth_router.post("/login", response_model=TokenResponse)
def login(
    req: UserLoginRequest, 
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Authenticates user and returns JWT bearer token.
    """
    client_ip = request.client.host if request.client else None
    user_agent = request.headers.get("User-Agent")
    user = AuthService.authenticate_user(
        db, req.username, req.password, ip_address=client_ip, user_agent=user_agent
    )
    access_token = AuthService.create_access_token(
        data={"sub": user.username, "role": user.role, "id": user.id}
    )
    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        expires_in=1440 * 60,
        user=UserOut.model_validate(user)
    )

@auth_router.get("/me", response_model=UserOut)
def get_current_user_profile(current_user: User = Depends(get_current_user)):
    """
    Returns authenticated user profile, role, and public key.
    """
    return UserOut.model_validate(current_user)

@auth_router.get("/users", response_model=List[UserPublicKeyOut])
def list_available_recipients(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Lists all registered users and their public keys for file sharing.
    """
    users = db.query(User).filter(User.id != current_user.id, User.is_active == True).all()
    return [
        UserPublicKeyOut(
            id=u.id, 
            username=u.username, 
            email=u.email,
            full_name=u.full_name, 
            public_key=u.public_key
        ) for u in users
    ]
