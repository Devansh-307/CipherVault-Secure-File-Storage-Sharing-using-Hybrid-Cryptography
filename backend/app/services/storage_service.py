import os
import uuid
from pathlib import Path
from typing import Tuple
from app.config import settings

class StorageService:
    """
    Manages physical storage of encrypted blobs on disk with an S3-ready interface.
    Plaintext is NEVER persisted to disk.
    """

    @classmethod
    def save_ciphertext(cls, ciphertext: bytes, original_filename: str) -> str:
        """
        Saves raw ciphertext to the isolated encrypted vault storage directory.
        Returns the relative storage filename.
        """
        file_uuid = str(uuid.uuid4())
        safe_name = f"{file_uuid}.enc"
        file_path = settings.STORAGE_DIR / safe_name

        with open(file_path, "wb") as f:
            f.write(ciphertext)

        return safe_name

    @classmethod
    def read_ciphertext(cls, storage_filename: str) -> bytes:
        """Reads raw ciphertext from storage."""
        file_path = settings.STORAGE_DIR / storage_filename
        if not file_path.exists():
            raise FileNotFoundError(f"Ciphertext blob {storage_filename} not found in storage")

        with open(file_path, "wb+" if not file_path.exists() else "rb") as f:
            return f.read()

    @classmethod
    def delete_ciphertext(cls, storage_filename: str) -> bool:
        """Permanently deletes ciphertext from storage."""
        file_path = settings.STORAGE_DIR / storage_filename
        if file_path.exists():
            try:
                os.remove(file_path)
                return True
            except OSError:
                return False
        return False

    @classmethod
    def tamper_ciphertext(cls, storage_filename: str, mode: str = "flip_byte") -> Tuple[int, bytes]:
        """
        LAB/TESTING METHOD:
        Deliberately flips a bit or truncates the encrypted file to demonstrate
        AES-GCM authentication tag and SHA-256 integrity failure!
        """
        file_path = settings.STORAGE_DIR / storage_filename
        if not file_path.exists():
            raise FileNotFoundError("Storage file not found")

        with open(file_path, "rb") as f:
            data = bytearray(f.read())

        if len(data) == 0:
            raise ValueError("Cannot tamper with empty file")

        if mode == "flip_byte":
            # Flip middle byte
            idx = len(data) // 2
            data[idx] ^= 0xFF
        elif mode == "truncate":
            data = data[:-16]
        elif mode == "corrupt_header":
            data[0] ^= 0xAA

        with open(file_path, "wb") as f:
            f.write(data)

        return len(data), bytes(data)
