from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.schemas.auth import (
    UserRegisterRequest,
    UserLoginRequest,
    TokenResponse,
    UserOut,
    UserPublicKeyOut
)
from app.services.auth_service import AuthService, get_current_user

router = APIRouter(prefix="/auth", tags=["Authentication & Key Management"])

@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def register_user(
    req: UserRegisterRequest,
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Registers a new user, generates a 2048-bit RSA key pair,
    and envelopes the private key using PBKDF2-HMAC-SHA256 and AES-GCM.
    """
    ip_addr = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent")
    user = AuthService.register_user(db, req, ip_address=ip_addr, user_agent=user_agent)
    return UserOut.model_validate(user)

@router.post("/login", response_model=TokenResponse)
def login(
    req: UserLoginRequest,
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Authenticates user with username & password and returns a JWT bearer access token.
    """
    ip_addr = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent")
    user = AuthService.authenticate_user(
        db, req.username, req.password, ip_address=ip_addr, user_agent=user_agent
    )
    access_token = AuthService.create_access_token(data={"sub": user.username, "role": user.role})
    
    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        expires_in=86400,
        user=UserOut.model_validate(user)
    )

@router.get("/me", response_model=UserOut)
def get_current_user_profile(current_user: User = Depends(get_current_user)):
    """
    Returns the currently authenticated user profile and RSA public key.
    """
    return UserOut.model_validate(current_user)

@router.get("/users", response_model=List[UserPublicKeyOut])
def list_users_for_sharing(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Lists all registered users with their RSA public keys to allow multi-user file sharing.
    """
    users = db.query(User).filter(User.is_active == True, User.id != current_user.id).all()
    return [UserPublicKeyOut.model_validate(u) for u in users]

@router.get("/public-key/{username}", response_model=UserPublicKeyOut)
def get_user_public_key(
    username: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Fetches the RSA Public Key for a specific user.
    """
    user = db.query(User).filter(User.username == username, User.is_active == True).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return UserPublicKeyOut.model_validate(user)
