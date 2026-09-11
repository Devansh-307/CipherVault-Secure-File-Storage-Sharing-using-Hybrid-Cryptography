import base64
from datetime import datetime, timedelta, timezone
from typing import List, Optional
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.models.user import User
from app.models.file import FileRecord
from app.models.share import SharedFile
from app.schemas.share import ShareCreateRequest, ShareOut, SharedWithMeOut
from app.crypto.engine import HybridCryptoEngine, DecryptionError
from app.services.auth_service import AuthService
from app.services.audit_service import AuditService

class ShareService:

    @classmethod
    def share_file(
        cls,
        db: Session,
        req: ShareCreateRequest,
        sender: User,
        sender_password: str,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ) -> List[SharedFile]:
        """
        Shares a file with one or more recipients (by username, email, or custom RSA public key):
        1. Validates sender owns the file.
        2. Unlocks sender's RSA private key with password and unwraps the AES session key.
        3. For each recipient, fetches their RSA public key and encrypts the session key (RSA-OAEP).
        4. Calculates dynamic expiration time if provided.
        5. Saves SharedFile entries and logs audit trail.
        """
        file_record = db.query(FileRecord).filter(
            FileRecord.id == req.file_id, 
            FileRecord.owner_id == sender.id
        ).first()

        if not file_record:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, 
                detail="File not found or you are not the owner."
            )

        # 1. Recover Session Key using Sender's Private Key
        try:
            sender_priv_pem = AuthService.unlock_private_key(sender, sender_password)
            owner_enc_key = base64.b64decode(file_record.owner_encrypted_session_key)
            session_key = HybridCryptoEngine.decrypt_rsa_oaep(owner_enc_key, sender_priv_pem)
        except DecryptionError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid master password. Unable to unlock session key for re-wrapping."
            )

        # 2. Expiration timestamp
        expires_at = None
        if req.expires_in_hours and req.expires_in_hours > 0:
            expires_at = datetime.now(timezone.utc) + timedelta(hours=req.expires_in_hours)

        created_shares = []

        # 3. Encapsulate session key for each username/email recipient
        for identifier in req.recipient_usernames:
            clean_id = identifier.strip()
            if not clean_id:
                continue

            # Query by username or email (case-insensitive)
            recipient = db.query(User).filter(
                (User.username.ilike(clean_id)) | (User.email.ilike(clean_id.lower()))
            ).first()

            if not recipient:
                # If recipient is not yet registered in database, we can auto-create a pending guest identity
                # or skip if invalid. Let's create a pending guest identity if valid email!
                if "@" in clean_id:
                    guest_username = clean_id.split("@")[0].lower() + "_guest"
                    # ensure unique
                    cnt = 1
                    base_u = guest_username
                    while db.query(User).filter(User.username == guest_username).first():
                        guest_username = f"{base_u}_{cnt}"
                        cnt += 1
                    
                    priv_pem, pub_pem = HybridCryptoEngine.generate_rsa_keypair(key_size=2048)
                    enc_priv_hex, salt_hex, iv_hex, tag_hex = HybridCryptoEngine.wrap_private_key(
                        priv_pem, "GuestPassword123!"
                    )
                    recipient = User(
                        username=guest_username,
                        email=clean_id.lower(),
                        full_name=f"Guest ({clean_id})",
                        password_hash=AuthService.hash_password("GuestPassword123!"),
                        role="user",
                        public_key=pub_pem,
                        encrypted_private_key=enc_priv_hex,
                        private_key_salt=salt_hex,
                        private_key_iv=iv_hex,
                        private_key_tag=tag_hex,
                        is_active=True
                    )
                    db.add(recipient)
                    db.commit()
                    db.refresh(recipient)
                else:
                    continue

            if recipient.id == sender.id:
                continue  # Cannot share with self

            # Encrypt session key with recipient's RSA public key
            rec_enc_key_bytes = HybridCryptoEngine.encrypt_rsa_oaep(session_key, recipient.public_key)
            rec_enc_key_b64 = base64.b64encode(rec_enc_key_bytes).decode("utf-8")

            # Check if share already exists
            existing_share = db.query(SharedFile).filter(
                SharedFile.file_id == file_record.id,
                SharedFile.recipient_id == recipient.id
            ).first()

            if existing_share:
                existing_share.encrypted_session_key = rec_enc_key_b64
                existing_share.permission = req.permission
                existing_share.expires_at = expires_at
                existing_share.is_revoked = False
                existing_share.revoked_at = None
                created_shares.append(existing_share)
            else:
                new_share = SharedFile(
                    file_id=file_record.id,
                    sender_id=sender.id,
                    recipient_id=recipient.id,
                    encrypted_session_key=rec_enc_key_b64,
                    permission=req.permission,
                    expires_at=expires_at,
                    is_revoked=False
                )
                db.add(new_share)
                created_shares.append(new_share)

            AuditService.log_event(
                db=db,
                action="FILE_SHARE_GRANTED",
                user_id=sender.id,
                username=sender.username,
                target_type="SHARE",
                target_id=file_record.id,
                status="SUCCESS",
                ip_address=ip_address,
                user_agent=user_agent,
                details=f"Shared '{file_record.original_filename}' with '{recipient.username}' ({recipient.email}). Expiry: {expires_at.isoformat() if expires_at else 'Never'}"
            )

        # 4. Handle any custom RSA public keys
        if req.custom_recipients:
            for cr in req.custom_recipients:
                if not cr.public_key_pem or "PUBLIC KEY" not in cr.public_key_pem:
                    continue
                try:
                    rec_enc_key_bytes = HybridCryptoEngine.encrypt_rsa_oaep(session_key, cr.public_key_pem)
                    rec_enc_key_b64 = base64.b64encode(rec_enc_key_bytes).decode("utf-8")
                    
                    # Create placeholder guest user for this custom public key
                    custom_label = cr.label or "external_recipient"
                    guest_username = f"ext_{custom_label.lower().replace(' ', '_')[:20]}"
                    recipient = db.query(User).filter(User.username == guest_username).first()
                    if not recipient:
                        priv_pem, _ = HybridCryptoEngine.generate_rsa_keypair(key_size=2048)
                        enc_priv_hex, salt_hex, iv_hex, tag_hex = HybridCryptoEngine.wrap_private_key(priv_pem, "GuestPassword123!")
                        recipient = User(
                            username=guest_username,
                            email=f"{guest_username}@external.crypto",
                            full_name=cr.label,
                            password_hash=AuthService.hash_password("GuestPassword123!"),
                            role="user",
                            public_key=cr.public_key_pem,
                            encrypted_private_key=enc_priv_hex,
                            private_key_salt=salt_hex,
                            private_key_iv=iv_hex,
                            private_key_tag=tag_hex,
                            is_active=True
                        )
                        db.add(recipient)
                        db.commit()
                        db.refresh(recipient)

                    new_share = SharedFile(
                        file_id=file_record.id,
                        sender_id=sender.id,
                        recipient_id=recipient.id,
                        encrypted_session_key=rec_enc_key_b64,
                        permission=req.permission,
                        expires_at=expires_at,
                        is_revoked=False
                    )
                    db.add(new_share)
                    created_shares.append(new_share)
                except Exception as e:
                    print(f"Error encrypting with custom public key: {e}")

        db.commit()
        return created_shares

    @classmethod
    def revoke_share(
        cls,
        db: Session,
        share_id: str,
        user: User,
        ip_address: Optional[str] = None
    ) -> bool:
        """
        Dynamically revokes a file share, instantly denying recipient access.
        """
        share = db.query(SharedFile).filter(SharedFile.id == share_id).first()
        if not share:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Share record not found.")

        # Ensure only the file owner or sender can revoke
        file_record = db.query(FileRecord).filter(FileRecord.id == share.file_id).first()
        if not file_record or (file_record.owner_id != user.id and share.sender_id != user.id):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Permission denied.")

        share.is_revoked = True
        share.revoked_at = datetime.now(timezone.utc)
        db.commit()

        recipient = db.query(User).filter(User.id == share.recipient_id).first()
        rec_name = recipient.username if recipient else "Unknown"

        AuditService.log_event(
            db=db,
            action="FILE_SHARE_REVOKED",
            user_id=user.id,
            username=user.username,
            target_type="SHARE",
            target_id=share_id,
            status="SUCCESS",
            ip_address=ip_address,
            details=f"Revoked access to '{file_record.original_filename}' for user '{rec_name}'."
        )

        return True

    @classmethod
    def get_shared_with_me(cls, db: Session, user: User) -> List[SharedWithMeOut]:
        """
        Retrieves all active files shared with the current user.
        """
        shares = db.query(SharedFile).filter(
            SharedFile.recipient_id == user.id,
            SharedFile.is_revoked == False
        ).all()

        results = []
        now = datetime.now(timezone.utc)
        for s in shares:
            file_rec = s.file
            if not file_rec:
                continue
            
            is_expired = False
            if s.expires_at:
                exp_dt = s.expires_at if s.expires_at.tzinfo else s.expires_at.replace(tzinfo=timezone.utc)
                is_expired = bool(exp_dt < now)
            
            results.append(SharedWithMeOut(
                share_id=s.id,
                file_id=file_rec.id,
                filename=file_rec.original_filename,
                file_size_bytes=file_rec.file_size_bytes,
                mime_type=file_rec.mime_type,
                sender_id=s.sender.id,
                sender_username=s.sender.username,
                sender_public_key=s.sender.public_key,
                file_hash=file_rec.file_hash,
                permission=s.permission,
                expires_at=s.expires_at,
                is_expired=is_expired,
                shared_at=s.created_at,
                is_tampered=file_rec.is_tampered
            ))

        return results
