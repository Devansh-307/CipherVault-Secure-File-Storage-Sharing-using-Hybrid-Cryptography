from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict

class FileOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    owner_id: str
    owner_username: Optional[str] = None
    original_filename: str
    file_size_bytes: int
    encrypted_size_bytes: int
    mime_type: str
    file_hash: str
    has_signature: bool
    is_tampered: bool
    created_at: datetime

class FileDetailOut(FileOut):
    iv_nonce: str
    auth_tag: str
    digital_signature: Optional[str] = None
    owner_encrypted_session_key: str
    shares_count: int = 0

class DecryptVerificationResult(BaseModel):
    file_id: str
    filename: str
    file_size_bytes: int
    sha256_hash: str
    computed_hash: str
    integrity_verified: bool
    signature_verified: bool
    sender_username: str
    decryption_algorithm: str = "AES-256-GCM + RSA-OAEP"
    content_base64: str
    mime_type: str

class FileTamperRequest(BaseModel):
    file_id: str
    tamper_mode: str = "flip_byte"  # 'flip_byte', 'truncate', 'replace_tag'
