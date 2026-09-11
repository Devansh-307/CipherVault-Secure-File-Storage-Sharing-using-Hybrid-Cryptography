from datetime import datetime, timezone
from typing import Optional
from pydantic import BaseModel, Field, ConfigDict

class UserRegisterRequest(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    email: str = Field(..., min_length=5, max_length=100)
    password: str = Field(..., min_length=6)
    full_name: Optional[str] = None
    role: Optional[str] = "user"  # 'user', 'admin', 'auditor'
    otp: Optional[str] = None  # 6-digit email verification OTP

class UserLoginRequest(BaseModel):
    username: str
    password: str

class SendOtpRequest(BaseModel):
    email: str = Field(..., min_length=5, max_length=100)
    purpose: str = "register"  # "register", "forgot_password"

class VerifyOtpRequest(BaseModel):
    email: str = Field(..., min_length=5, max_length=100)
    otp: str = Field(..., min_length=6, max_length=6)
    purpose: str = "register"

class ForgotPasswordRequest(BaseModel):
    email: str = Field(..., min_length=5, max_length=100)
    otp: str = Field(..., min_length=6, max_length=6)
    new_password: str = Field(..., min_length=6)

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    user: "UserOut"

class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    username: str
    email: str
    full_name: Optional[str]
    role: str
    public_key: str
    created_at: datetime

class UserPublicKeyOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    username: str
    email: Optional[str] = None
    full_name: Optional[str] = None
    public_key: str
