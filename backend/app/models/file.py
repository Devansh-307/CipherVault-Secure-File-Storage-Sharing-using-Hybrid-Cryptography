import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, DateTime, Text, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from app.database import Base

class FileRecord(Base):
    __tablename__ = "files"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    owner_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    original_filename = Column(String(255), nullable=False)
    stored_path = Column(String(255), nullable=False)  # Path relative to storage dir
    file_size_bytes = Column(Integer, nullable=False)  # Size of original plaintext
    encrypted_size_bytes = Column(Integer, nullable=False)  # Size of ciphertext on disk
    mime_type = Column(String(100), default="application/octet-stream")
    
    # Cryptographic Metadata
    file_hash = Column(String(64), nullable=False)  # SHA-256 Digest of plaintext
    digital_signature = Column(Text, nullable=True)  # Base64 RSA-PSS signature by owner
    iv_nonce = Column(String(32), nullable=False)  # Hex 96-bit AES-GCM Nonce
    auth_tag = Column(String(32), nullable=False)  # Hex 128-bit AES-GCM Authentication Tag
    owner_encrypted_session_key = Column(Text, nullable=False)  # Base64 RSA-OAEP encrypted AES key for owner
    
    # Flags & Demo tools
    is_tampered = Column(Boolean, default=False)
    tampered_at = Column(DateTime, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    owner = relationship("User", back_populates="owned_files")
    shares = relationship("SharedFile", back_populates="file", cascade="all, delete-orphan")
