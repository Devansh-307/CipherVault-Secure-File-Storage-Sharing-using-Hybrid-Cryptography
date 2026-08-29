from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict

class AuditLogOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    user_id: Optional[str]
    username: Optional[str]
    action: str
    target_type: Optional[str]
    target_id: Optional[str]
    status: str
    ip_address: Optional[str]
    user_agent: Optional[str]
    details: Optional[str]
    timestamp: datetime

class SecurityStatsOut(BaseModel):
    total_users: int
    total_files_encrypted: int
    total_shares_active: int
    total_bytes_secured: int
    tamper_attempts_blocked: int
    integrity_verifications_count: int
    system_security_rating: str = "Enterprise Grade A+"
    recent_security_events: List[AuditLogOut]
