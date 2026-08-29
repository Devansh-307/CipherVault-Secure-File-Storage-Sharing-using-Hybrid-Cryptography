import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Boolean, Text
from sqlalchemy.orm import relationship
from app.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    username = Column(String(50), unique=True, index=True, nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=False)
    full_name = Column(String(100), nullable=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(20), default="user")  # 'user', 'admin', 'auditor'
    
    # Cryptographic keys
    public_key = Column(Text, nullable=False)  # PEM format RSA Public Key
    encrypted_private_key = Column(Text, nullable=False)  # AES-GCM encrypted RSA Private Key PEM
    private_key_salt = Column(String(64), nullable=False)  # Hex salt used for PBKDF2 passphrase derivation
    private_key_iv = Column(String(32), nullable=False)  # Hex IV for AES-GCM private key encryption
    private_key_tag = Column(String(32), nullable=False)  # Hex Auth Tag for AES-GCM private key encryption
    
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    owned_files = relationship("FileRecord", back_populates="owner", cascade="all, delete-orphan")
    shared_files = relationship("SharedFile", foreign_keys="SharedFile.recipient_id", back_populates="recipient")
    shares_granted = relationship("SharedFile", foreign_keys="SharedFile.sender_id", back_populates="sender")
    audit_logs = relationship("AuditLog", back_populates="user")
