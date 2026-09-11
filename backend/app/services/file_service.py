import base64
from datetime import datetime
from typing import Optional, List, Tuple
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.models.user import User
from app.models.file import FileRecord
from app.models.share import SharedFile
from app.schemas.file import DecryptVerificationResult
from app.crypto.engine import (
    HybridCryptoEngine, 
    CryptoError, 
    IntegrityVerificationError, 
    DecryptionError
)
from app.services.storage_service import StorageService
from app.services.auth_service import AuthService
from app.services.audit_service import AuditService

class FileService:

    @classmethod
    def upload_and_encrypt(
        cls,
        db: Session,
        file_bytes: bytes,
        original_filename: str,
        mime_type: str,
        owner: User,
        owner_password: str,
        recipients: Optional[List[User]] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ) -> FileRecord:
        """
        Executes complete hybrid encryption pipeline:
        1. Generates random 256-bit AES session key & 96-bit GCM nonce.
        2. Encrypts file payload using AES-256-GCM -> (ciphertext, auth_tag).
        3. Computes SHA-256 hash checksum of raw plaintext.
        4. Signs SHA-256 hash using owner's RSA private key (RSA-PSS).
        5. Encapsulates (wraps) AES session key using owner's RSA public key (RSA-OAEP).
        6. Persists ciphertext to isolated storage on disk.
        7. For any initial recipients, wraps AES session key with their RSA public keys.
        8. Records metadata in database and logs audit event.
        """
        if len(file_bytes) == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, 
                detail="Cannot upload an empty file."
            )

        # 1. Generate AES Session Key & Nonce
        session_key = HybridCryptoEngine.generate_aes_key()
        nonce = HybridCryptoEngine.generate_nonce()

        # 2. Encrypt with AES-256-GCM
        ciphertext, auth_tag = HybridCryptoEngine.encrypt_aes_gcm(file_bytes, session_key, nonce)

        # 3. Compute SHA-256 Integrity Hash
        file_hash = HybridCryptoEngine.compute_sha256(file_bytes)

        # 4. Sign with Owner's RSA Private Key (Unlocking private key first)
        try:
            owner_priv_pem = AuthService.unlock_private_key(owner, owner_password)
            digital_signature = HybridCryptoEngine.sign_sha256_pss(file_hash, owner_priv_pem)
        except DecryptionError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect master password. Unable to unlock RSA private key for signing."
            )

        # 5. Wrap session key for Owner (RSA-OAEP)
        owner_enc_key_bytes = HybridCryptoEngine.encrypt_rsa_oaep(session_key, owner.public_key)
        owner_enc_key_b64 = base64.b64encode(owner_enc_key_bytes).decode("utf-8")

        # 6. Save ciphertext blob to disk
        storage_filename = StorageService.save_ciphertext(ciphertext, original_filename)

        # 7. Create FileRecord
        file_record = FileRecord(
            owner_id=owner.id,
            original_filename=original_filename,
            stored_path=storage_filename,
            file_size_bytes=len(file_bytes),
            encrypted_size_bytes=len(ciphertext),
            mime_type=mime_type or "application/octet-stream",
            file_hash=file_hash,
            digital_signature=digital_signature,
            iv_nonce=nonce.hex(),
            auth_tag=auth_tag.hex(),
            owner_encrypted_session_key=owner_enc_key_b64,
            is_tampered=False
        )
        db.add(file_record)
        db.flush()

        # 8. Encapsulate session key for any initial recipients
        if recipients:
            for rec in recipients:
                if rec.id != owner.id:
                    rec_enc_key_bytes = HybridCryptoEngine.encrypt_rsa_oaep(session_key, rec.public_key)
                    rec_enc_key_b64 = base64.b64encode(rec_enc_key_bytes).decode("utf-8")
                    share = SharedFile(
                        file_id=file_record.id,
                        sender_id=owner.id,
                        recipient_id=rec.id,
                        encrypted_session_key=rec_enc_key_b64,
                        permission="download",
                        is_revoked=False
                    )
                    db.add(share)

        db.commit()
        db.refresh(file_record)

        # 9. Audit Logging
        AuditService.log_event(
            db=db,
            action="FILE_UPLOAD_ENCRYPT",
            user_id=owner.id,
            username=owner.username,
            target_type="FILE",
            target_id=file_record.id,
            status="SUCCESS",
            ip_address=ip_address,
            user_agent=user_agent,
            details=f"Uploaded '{original_filename}' ({len(file_bytes)} bytes). Encrypted with AES-256-GCM + RSA-OAEP + SHA-256 Signature."
        )

        return file_record

    @classmethod
    def decrypt_and_verify(
        cls,
        db: Session,
        file_id: str,
        user: User,
        password: str,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ) -> DecryptVerificationResult:
        """
        Executes complete hybrid decryption and verification:
        1. Checks access permissions (owner OR active shared recipient).
        2. Retrieves recipient's RSA-wrapped session key.
        3. Unlocks user's private key with password and decrypts the session key (RSA-OAEP).
        4. Decrypts ciphertext blob using AES-256-GCM and verifies 128-bit authentication tag.
        5. Recomputes SHA-256 hash of decrypted payload and verifies against stored fingerprint.
        6. Verifies owner's RSA-PSS digital signature.
        7. Logs security event and returns decrypted payload with cryptographic proof badges.
        """
        file_record = db.query(FileRecord).filter(FileRecord.id == file_id).first()
        if not file_record:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found.")

        # Determine access path and corresponding encrypted session key
        is_owner = (file_record.owner_id == user.id)
        encrypted_key_b64 = None
        share_record = None

        if is_owner:
            encrypted_key_b64 = file_record.owner_encrypted_session_key
        else:
            # Check share
            share_record = db.query(SharedFile).filter(
                SharedFile.file_id == file_id,
                SharedFile.recipient_id == user.id,
                SharedFile.is_revoked == False
            ).first()

            if not share_record:
                AuditService.log_event(
                    db=db,
                    action="UNAUTHORIZED_ACCESS_DENIED",
                    user_id=user.id,
                    username=user.username,
                    target_type="FILE",
                    target_id=file_id,
                    status="CRITICAL",
                    ip_address=ip_address,
                    user_agent=user_agent,
                    details=f"User '{user.username}' attempted unauthorized decryption of file '{file_record.original_filename}'"
                )
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Access denied. You are neither the file owner nor an authorized recipient."
                )

            # Check expiration
            if share_record.expires_at:
                now_utc = datetime.now(timezone.utc)
                exp_utc = share_record.expires_at if share_record.expires_at.tzinfo else share_record.expires_at.replace(tzinfo=timezone.utc)
                if exp_utc < now_utc:
                    AuditService.log_event(
                        db=db,
                        action="SHARE_EXPIRED_ACCESS_DENIED",
                        user_id=user.id,
                        username=user.username,
                        target_type="SHARE",
                        target_id=share_record.id,
                        status="WARNING",
                        ip_address=ip_address,
                        user_agent=user_agent,
                        details=f"Access denied: Time-bound share link for file '{file_record.original_filename}' has expired."
                    )
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail="This shared file access link has expired."
                    )

            encrypted_key_b64 = share_record.encrypted_session_key

        # 1. Unlock User's Private Key
        try:
            priv_pem = AuthService.unlock_private_key(user, password)
        except DecryptionError:
            AuditService.log_event(
                db=db,
                action="PRIVATE_KEY_UNLOCK_FAILED",
                user_id=user.id,
                username=user.username,
                target_type="FILE",
                target_id=file_id,
                status="FAILURE",
                ip_address=ip_address,
                user_agent=user_agent,
                details="Incorrect password provided to unlock RSA private key for decryption"
            )
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect master password. RSA private key could not be unlocked."
            )

        # 2. Unwrap AES Session Key (RSA-OAEP)
        try:
            enc_key_bytes = base64.b64decode(encrypted_key_b64)
            session_key = HybridCryptoEngine.decrypt_rsa_oaep(enc_key_bytes, priv_pem)
        except DecryptionError as e:
            AuditService.log_event(
                db=db,
                action="RSA_DECRYPT_KEY_FAILED",
                user_id=user.id,
                username=user.username,
                target_type="FILE",
                target_id=file_id,
                status="FAILURE",
                ip_address=ip_address,
                user_agent=user_agent,
                details=f"RSA-OAEP session key unwrapping failed: {str(e)}"
            )
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Failed to unwrap session key with your private key: {str(e)}"
            )

        # 3. Read Ciphertext Blob from Storage
        try:
            ciphertext = StorageService.read_ciphertext(file_record.stored_path)
        except FileNotFoundError:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Stored ciphertext blob not found.")

        # 4. Decrypt AES-256-GCM & Check Tag
        nonce = bytes.fromhex(file_record.iv_nonce)
        auth_tag = bytes.fromhex(file_record.auth_tag)

        try:
            plaintext = HybridCryptoEngine.decrypt_aes_gcm(ciphertext, session_key, nonce, auth_tag)
        except IntegrityVerificationError as e:
            AuditService.log_event(
                db=db,
                action="TAMPER_DETECTED_GCM_FAIL",
                user_id=user.id,
                username=user.username,
                target_type="FILE",
                target_id=file_id,
                status="CRITICAL",
                ip_address=ip_address,
                user_agent=user_agent,
                details=f"SECURITY ALERT: AES-GCM Authentication Tag mismatch on file '{file_record.original_filename}'! Ciphertext in storage was tampered with!"
            )
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="[SECURITY ALERT] AES-GCM Authentication Tag verification failed! File ciphertext has been altered or corrupted in storage."
            )
        except DecryptionError as e:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

        # 5. Verify SHA-256 Checksum
        computed_hash = HybridCryptoEngine.compute_sha256(plaintext)
        integrity_ok = (computed_hash == file_record.file_hash)
        if not integrity_ok:
            AuditService.log_event(
                db=db,
                action="INTEGRITY_HASH_MISMATCH",
                user_id=user.id,
                username=user.username,
                target_type="FILE",
                target_id=file_id,
                status="CRITICAL",
                ip_address=ip_address,
                user_agent=user_agent,
                details=f"SHA-256 Hash Mismatch: Expected {file_record.file_hash}, got {computed_hash}"
            )
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="SHA-256 Integrity Verification Failed: Computed hash does not match original file hash."
            )

        # 6. Verify Digital Signature
        signature_ok = False
        if file_record.digital_signature:
            owner_user = db.query(User).filter(User.id == file_record.owner_id).first()
            if owner_user:
                signature_ok = HybridCryptoEngine.verify_sha256_pss(
                    file_record.file_hash,
                    file_record.digital_signature,
                    owner_user.public_key
                )

        # 7. Audit Log Success
        AuditService.log_event(
            db=db,
            action="FILE_DECRYPT_VERIFY_SUCCESS",
            user_id=user.id,
            username=user.username,
            target_type="FILE",
            target_id=file_id,
            status="SUCCESS",
            ip_address=ip_address,
            user_agent=user_agent,
            details=f"Successfully decrypted and verified '{file_record.original_filename}'. Integrity: 100% SHA-256 Match. Signature Verified: {signature_ok}"
        )

        owner_user = db.query(User).filter(User.id == file_record.owner_id).first()
        sender_name = owner_user.username if owner_user else "Unknown"

        return DecryptVerificationResult(
            file_id=file_record.id,
            filename=file_record.original_filename,
            file_size_bytes=len(plaintext),
            sha256_hash=file_record.file_hash,
            computed_hash=computed_hash,
            integrity_verified=integrity_ok,
            signature_verified=signature_ok,
            sender_username=sender_name,
            decryption_algorithm="AES-256-GCM + RSA-OAEP",
            content_base64=base64.b64encode(plaintext).decode("utf-8"),
            mime_type=file_record.mime_type
        )

    @classmethod
    def tamper_file_payload(
        cls,
        db: Session,
        file_id: str,
        user: User,
        mode: str = "flip_byte",
        ip_address: Optional[str] = None
    ) -> FileRecord:
        """
        LAB/DEMO METHOD:
        Deliberately alters the physical ciphertext bytes on disk for a given file to demonstrate
        tamper-evidence and security resilience.
        """
        file_record = db.query(FileRecord).filter(FileRecord.id == file_id).first()
        if not file_record:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found")

        StorageService.tamper_ciphertext(file_record.stored_path, mode=mode)
        file_record.is_tampered = True
        file_record.tampered_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(file_record)

        AuditService.log_event(
            db=db,
            action="SECURITY_LAB_TAMPER_INJECTED",
            user_id=user.id,
            username=user.username,
            target_type="FILE",
            target_id=file_id,
            status="WARNING",
            ip_address=ip_address,
            details=f"Simulated attacker tampering on file '{file_record.original_filename}' via {mode}. AES-GCM tag verification will now fail!"
        )

        return file_record
