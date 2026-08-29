from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, Request, Body
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.models.file import FileRecord
from app.models.share import SharedFile
from app.schemas.share import ShareCreateRequest, ShareOut, SharedWithMeOut
from app.services.auth_service import get_current_user
from app.services.share_service import ShareService

router = APIRouter(prefix="/shares", tags=["Dynamic Sharing & Access Control"])

@router.post("", response_model=List[ShareOut])
def share_file_with_recipients(
    request: Request,
    payload: dict = Body(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Wraps the AES session key for chosen recipients using their RSA public keys
    and creates time-bound / revokable share records.
    """
    file_id = payload.get("file_id")
    password = payload.get("password")
    recipient_usernames = payload.get("recipient_usernames", [])
    permission = payload.get("permission", "download")
    expires_in_hours = payload.get("expires_in_hours")

    if not file_id or not password or not recipient_usernames:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="file_id, password, and recipient_usernames are required."
        )

    share_req = ShareCreateRequest(
        file_id=file_id,
        recipient_usernames=recipient_usernames,
        permission=permission,
        expires_in_hours=expires_in_hours
    )

    ip_addr = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent")

    shares = ShareService.share_file(
        db=db,
        req=share_req,
        sender=current_user,
        sender_password=password,
        ip_address=ip_addr,
        user_agent=user_agent
    )

    results = []
    for s in shares:
        results.append(ShareOut(
            id=s.id,
            file_id=s.file_id,
            file_name=s.file.original_filename,
            sender_id=s.sender_id,
            sender_username=s.sender.username,
            recipient_id=s.recipient_id,
            recipient_username=s.recipient.username,
            permission=s.permission,
            expires_at=s.expires_at,
            is_revoked=s.is_revoked,
            is_expired=bool(s.expires_at and s.expires_at < s.created_at),
            shared_at=s.created_at
        ))
    return results

@router.get("/shared-with-me", response_model=List[SharedWithMeOut])
def get_shared_files_for_user(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Returns list of all active files shared with current user.
    """
    return ShareService.get_shared_with_me(db, current_user)

@router.get("/file/{file_id}", response_model=List[ShareOut])
def get_file_shares(
    file_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Returns list of recipients with whom this file has been shared.
    """
    file_record = db.query(FileRecord).filter(FileRecord.id == file_id, FileRecord.owner_id == current_user.id).first()
    if not file_record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found or not owned by you.")

    shares = db.query(SharedFile).filter(SharedFile.file_id == file_id).all()
    results = []
    for s in shares:
        results.append(ShareOut(
            id=s.id,
            file_id=s.file_id,
            file_name=file_record.original_filename,
            sender_id=s.sender_id,
            sender_username=s.sender.username,
            recipient_id=s.recipient_id,
            recipient_username=s.recipient.username,
            permission=s.permission,
            expires_at=s.expires_at,
            is_revoked=s.is_revoked,
            is_expired=bool(s.expires_at and s.expires_at < s.created_at),
            shared_at=s.created_at
        ))
    return results

@router.post("/{share_id}/revoke")
def revoke_file_share(
    share_id: str,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Instantly revokes access for a shared recipient.
    """
    ip_addr = request.client.host if request.client else None
    ShareService.revoke_share(db=db, share_id=share_id, user=current_user, ip_address=ip_addr)
    return {"success": True, "message": "Share access successfully revoked."}
