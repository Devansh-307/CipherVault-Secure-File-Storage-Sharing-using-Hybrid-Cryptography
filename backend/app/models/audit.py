import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    username = Column(String(50), nullable=True)  # Redundant for log durability if user deleted
    action = Column(String(50), nullable=False)  # 'LOGIN_SUCCESS', 'LOGIN_FAILURE', 'KEYPAIR_GEN', 'FILE_UPLOAD', 'FILE_DECRYPT', 'FILE_SHARE', 'SHARE_REVOKE', 'TAMPER_DETECTED', 'INTEGRITY_FAIL', 'FILE_DELETE'
    target_type = Column(String(50), nullable=True)  # 'FILE', 'USER', 'SHARE', 'SESSION'
    target_id = Column(String(36), nullable=True)
    status = Column(String(20), default="SUCCESS")  # 'SUCCESS', 'FAILURE', 'WARNING', 'CRITICAL'
    ip_address = Column(String(50), nullable=True)
    user_agent = Column(String(255), nullable=True)
    details = Column(Text, nullable=True)  # JSON or descriptive info
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)

    # Relationships
    user = relationship("User", back_populates="audit_logs")
