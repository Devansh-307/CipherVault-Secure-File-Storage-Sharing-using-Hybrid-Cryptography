from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict

class ShareCreateRequest(BaseModel):
    file_id: str
    recipient_usernames: List[str]
    permission: str = "download"  # 'read', 'download'
    expires_in_hours: Optional[int] = None  # None for no expiration, e.g. 1, 24, 168

class ShareOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    file_id: str
    file_name: str
    sender_id: str
    sender_username: str
    recipient_id: str
    recipient_username: str
    permission: str
    expires_at: Optional[datetime]
    is_revoked: bool
    is_expired: bool
    shared_at: datetime

class SharedWithMeOut(BaseModel):
    share_id: str
    file_id: str
    filename: str
    file_size_bytes: int
    mime_type: str
    sender_id: str
    sender_username: str
    sender_public_key: str
    file_hash: str
    permission: str
    expires_at: Optional[datetime]
    is_expired: bool
    shared_at: datetime
    is_tampered: bool
