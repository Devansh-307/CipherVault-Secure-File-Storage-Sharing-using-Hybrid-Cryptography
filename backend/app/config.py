import os
from pathlib import Path
from pydantic_settings import BaseSettings

BASE_DIR = Path(__file__).resolve().parent.parent

class Settings(BaseSettings):
    PROJECT_NAME: str = "CipherVault - Hybrid Cryptography Storage"
    PROJECT_VERSION: str = "1.0.0"
    API_V1_STR: str = "/api"
    
    # Secret key for JWT signature
    SECRET_KEY: str = "ciphervault-secure-super-jwt-secret-key-2026-production-ready"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours
    
    # Database
    DATABASE_URL: str = f"sqlite:///{BASE_DIR / 'ciphervault.db'}"
    
    # Storage
    STORAGE_DIR: Path = BASE_DIR / "storage"
    MAX_FILE_SIZE_MB: int = 50
    
    # Cryptography defaults
    RSA_KEY_SIZE: int = 2048  # Default key size in bits (2048 or 4096)
    AES_KEY_SIZE_BYTES: int = 32  # 256-bit AES
    AES_GCM_NONCE_SIZE_BYTES: int = 12  # 96-bit standard GCM nonce
    AES_GCM_TAG_SIZE_BYTES: int = 16  # 128-bit authentication tag
    
    # Security parameters
    PBKDF2_ITERATIONS: int = 100_000
    
    class Config:
        case_sensitive = True

settings = Settings()

# Ensure storage directory exists
settings.STORAGE_DIR.mkdir(parents=True, exist_ok=True)
