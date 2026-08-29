from typing import Optional
from sqlalchemy.orm import Session
from app.models.audit import AuditLog

class AuditService:
    @staticmethod
    def log_event(
        db: Session,
        action: str,
        user_id: Optional[str] = None,
        username: Optional[str] = None,
        target_type: Optional[str] = None,
        target_id: Optional[str] = None,
        status: str = "SUCCESS",
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        details: Optional[str] = None
    ) -> AuditLog:
        """
        Records an immutable audit event for security monitoring and compliance.
        """
        log_entry = AuditLog(
            user_id=user_id,
            username=username,
            action=action,
            target_type=target_type,
            target_id=target_id,
            status=status,
            ip_address=ip_address,
            user_agent=user_agent,
            details=details
        )
        db.add(log_entry)
        db.commit()
        db.refresh(log_entry)
        return log_entry
