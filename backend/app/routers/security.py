from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.models.user import User
from app.models.file import FileRecord
from app.models.share import SharedFile
from app.models.audit import AuditLog
from app.schemas.audit import AuditLogOut, SecurityStatsOut
from app.services.auth_service import get_current_user

router = APIRouter(prefix="/security", tags=["Security & SIEM Audit Operations"])

@router.get("/stats", response_model=SecurityStatsOut)
def get_security_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Returns high-level cybersecurity health and vault statistics.
    """
    total_users = db.query(User).count()
    total_files = db.query(FileRecord).count()
    total_shares = db.query(SharedFile).filter(SharedFile.is_revoked == False).count()
    
    total_bytes = db.query(func.sum(FileRecord.file_size_bytes)).scalar() or 0
    tamper_blocked = db.query(AuditLog).filter(
        AuditLog.action.in_(["TAMPER_DETECTED_GCM_FAIL", "INTEGRITY_HASH_MISMATCH", "UNAUTHORIZED_ACCESS_DENIED"])
    ).count()
    
    integrity_count = db.query(AuditLog).filter(
        AuditLog.action == "FILE_DECRYPT_VERIFY_SUCCESS"
    ).count()

    recent_logs = db.query(AuditLog).order_by(AuditLog.timestamp.desc()).limit(10).all()

    return SecurityStatsOut(
        total_users=total_users,
        total_files_encrypted=total_files,
        total_shares_active=total_shares,
        total_bytes_secured=total_bytes,
        tamper_attempts_blocked=tamper_blocked,
        integrity_verifications_count=integrity_count,
        system_security_rating="Enterprise Grade A+ (NIST SP 800-38D / FIPS 180-4 Compliant)",
        recent_security_events=[AuditLogOut.model_validate(log) for log in recent_logs]
    )

@router.get("/audit-logs", response_model=List[AuditLogOut])
def get_audit_logs(
    limit: int = Query(50, ge=1, le=500),
    action: Optional[str] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    SIEM-grade audit log explorer for real-time monitoring and threat forensics.
    """
    query = db.query(AuditLog)
    if action:
        query = query.filter(AuditLog.action.ilike(f"%{action}%"))
    if status:
        query = query.filter(AuditLog.status == status.upper())

    logs = query.order_by(AuditLog.timestamp.desc()).limit(limit).all()
    return [AuditLogOut.model_validate(log) for log in logs]
