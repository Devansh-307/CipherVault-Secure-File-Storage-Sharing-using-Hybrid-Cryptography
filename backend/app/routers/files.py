import json
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Request, status, Body
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.models.file import FileRecord
from app.models.share import SharedFile
from app.schemas.file import FileOut, FileDetailOut, DecryptVerificationResult, FileTamperRequest
from app.services.auth_service import get_current_user
from app.services.file_service import FileService
from app.services.storage_service import StorageService
from app.services.audit_service import AuditService

router = APIRouter(prefix="/files", tags=["Encrypted File Operations"])

@router.post("/upload", response_model=FileOut, status_code=status.HTTP_201_CREATED)
async def upload_and_encrypt_file(
    request: Request,
    file: UploadFile = File(...),
    password: str = Form(...),
    recipient_usernames: Optional[str] = Form(None),  # Comma-separated or JSON string
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Uploads a file and applies hybrid encryption:
    - Generates 256-bit AES session key.
    - Encrypts payload with AES-256-GCM.
    - Computes SHA-256 checksum & signs with Owner's RSA-PSS key.
    - Wraps AES key with Owner's RSA-OAEP key (and any selected recipients).
    - Stores ciphertext securely on disk.
    """
    file_bytes = await file.read()
    ip_addr = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent")

    # Parse recipients if present
    recipients_list = []
    if recipient_usernames:
        try:
            names = json.loads(recipient_usernames) if recipient_usernames.startswith("[") else [n.strip() for n in recipient_usernames.split(",") if n.strip()]
            for name in names:
                u = db.query(User).filter(User.username == name).first()
                if u and u.id != current_user.id:
                    recipients_list.append(u)
        except Exception:
            pass

    file_record = FileService.upload_and_encrypt(
        db=db,
        file_bytes=file_bytes,
        original_filename=file.filename or "encrypted_file.bin",
        mime_type=file.content_type or "application/octet-stream",
        owner=current_user,
        owner_password=password,
        recipients=recipients_list,
        ip_address=ip_addr,
        user_agent=user_agent
    )

    return FileOut(
        id=file_record.id,
        owner_id=file_record.owner_id,
        owner_username=current_user.username,
        original_filename=file_record.original_filename,
        file_size_bytes=file_record.file_size_bytes,
        encrypted_size_bytes=file_record.encrypted_size_bytes,
        mime_type=file_record.mime_type,
        file_hash=file_record.file_hash,
        has_signature=bool(file_record.digital_signature),
        is_tampered=file_record.is_tampered,
        created_at=file_record.created_at
    )

@router.get("", response_model=List[FileOut])
def list_user_files(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Lists all files uploaded and owned by the current authenticated user.
    """
    files = db.query(FileRecord).filter(FileRecord.owner_id == current_user.id).order_by(FileRecord.created_at.desc()).all()
    results = []
    for f in files:
        results.append(FileOut(
            id=f.id,
            owner_id=f.owner_id,
            owner_username=current_user.username,
            original_filename=f.original_filename,
            file_size_bytes=f.file_size_bytes,
            encrypted_size_bytes=f.encrypted_size_bytes,
            mime_type=f.mime_type,
            file_hash=f.file_hash,
            has_signature=bool(f.digital_signature),
            is_tampered=f.is_tampered,
            created_at=f.created_at
        ))
    return results

@router.get("/{file_id}", response_model=FileDetailOut)
def get_file_details(
    file_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Fetches full cryptographic headers, hashes, and session key wrappers for inspection.
    """
    file_record = db.query(FileRecord).filter(FileRecord.id == file_id).first()
    if not file_record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found")

    # Check permission
    is_owner = (file_record.owner_id == current_user.id)
    is_recipient = db.query(SharedFile).filter(
        SharedFile.file_id == file_id,
        SharedFile.recipient_id == current_user.id,
        SharedFile.is_revoked == False
    ).first() is not None

    if not is_owner and not is_recipient:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    shares_count = db.query(SharedFile).filter(SharedFile.file_id == file_id, SharedFile.is_revoked == False).count()
    owner_user = db.query(User).filter(User.id == file_record.owner_id).first()

    return FileDetailOut(
        id=file_record.id,
        owner_id=file_record.owner_id,
        owner_username=owner_user.username if owner_user else "Unknown",
        original_filename=file_record.original_filename,
        file_size_bytes=file_record.file_size_bytes,
        encrypted_size_bytes=file_record.encrypted_size_bytes,
        mime_type=file_record.mime_type,
        file_hash=file_record.file_hash,
        has_signature=bool(file_record.digital_signature),
        is_tampered=file_record.is_tampered,
        created_at=file_record.created_at,
        iv_nonce=file_record.iv_nonce,
        auth_tag=file_record.auth_tag,
        digital_signature=file_record.digital_signature,
        owner_encrypted_session_key=file_record.owner_encrypted_session_key,
        shares_count=shares_count
    )

@router.post("/{file_id}/decrypt", response_model=DecryptVerificationResult)
def decrypt_file(
    file_id: str,
    request: Request,
    payload: dict = Body(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Unwraps session key with user's RSA private key, decrypts ciphertext with AES-256-GCM,
    and performs real-time SHA-256 and RSA-PSS verification.
    """
    password = payload.get("password")
    if not password:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Password is required to unlock private key.")

    ip_addr = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent")

    result = FileService.decrypt_and_verify(
        db=db,
        file_id=file_id,
        user=current_user,
        password=password,
        ip_address=ip_addr,
        user_agent=user_agent
    )

    return result

@router.post("/{file_id}/tamper")
def tamper_file(
    file_id: str,
    request: Request,
    payload: Optional[FileTamperRequest] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    LAB DEMONSTRATION TOOL:
    Alters physical ciphertext bits in storage to trigger and prove tamper detection!
    """
    mode = payload.tamper_mode if payload else "flip_byte"
    ip_addr = request.client.host if request.client else None

    file_record = FileService.tamper_file_payload(
        db=db,
        file_id=file_id,
        user=current_user,
        mode=mode,
        ip_address=ip_addr
    )

    return {
        "success": True,
        "message": f"Ciphertext for '{file_record.original_filename}' has been deliberately altered ({mode}). Try decrypting now to observe AES-GCM and SHA-256 rejection!",
        "file_id": file_record.id,
        "is_tampered": file_record.is_tampered
    }

@router.delete("/{file_id}")
def delete_file(
    file_id: str,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Deletes an encrypted file and its ciphertext permanently.
    """
    file_record = db.query(FileRecord).filter(
        FileRecord.id == file_id, 
        FileRecord.owner_id == current_user.id
    ).first()

    if not file_record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found or unauthorized.")

    StorageService.delete_ciphertext(file_record.stored_path)
    db.delete(file_record)
    db.commit()

    ip_addr = request.client.host if request.client else None
    AuditService.log_event(
        db=db,
        action="FILE_DELETED",
        user_id=current_user.id,
        username=current_user.username,
        target_type="FILE",
        target_id=file_id,
        status="SUCCESS",
        ip_address=ip_addr,
        details=f"File '{file_record.original_filename}' was permanently deleted"
    )

    return {"success": True, "message": "File deleted successfully."}
