import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Text, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from app.database import Base

class SharedFile(Base):
    __tablename__ = "shared_files"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    file_id = Column(String(36), ForeignKey("files.id", ondelete="CASCADE"), nullable=False)
    sender_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    recipient_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    
    # Recipient-specific RSA-OAEP encrypted AES session key
    encrypted_session_key = Column(Text, nullable=False)  # Base64 RSA-OAEP ciphertext
    
    # Access control & expiration
    permission = Column(String(20), default="read")  # 'read', 'download'
    expires_at = Column(DateTime, nullable=True)  # Optional dynamic time-bound expiration
    is_revoked = Column(Boolean, default=False)  # Revocation flag
    revoked_at = Column(DateTime, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    file = relationship("FileRecord", back_populates="shares")
    sender = relationship("User", foreign_keys=[sender_id], back_populates="shares_granted")
    recipient = relationship("User", foreign_keys=[recipient_id], back_populates="shared_files")
