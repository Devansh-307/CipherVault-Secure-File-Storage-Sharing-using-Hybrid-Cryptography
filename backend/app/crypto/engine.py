import os
import hashlib
import base64
from typing import Tuple, Optional

from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.asymmetric import rsa, padding
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.exceptions import InvalidSignature, InvalidTag

from app.config import settings

class CryptoError(Exception):
    """Base exception for cryptographic failures."""
    pass

class IntegrityVerificationError(CryptoError):
    """Raised when SHA-256 hash or AES-GCM authentication tag verification fails."""
    pass

class DecryptionError(CryptoError):
    """Raised when RSA or AES decryption fails (e.g. wrong key, tampered ciphertext)."""
    pass

class SignatureVerificationError(CryptoError):
    """Raised when RSA digital signature verification fails."""
    pass


class HybridCryptoEngine:
    """
    Core Cryptographic Engine implementing:
    - AES-256-GCM for high-throughput symmetric data payload encryption.
    - RSA-2048/4096 with OAEP (SHA-256) for asymmetric session key encapsulation.
    - SHA-256 Cryptographic Hash for immutable file integrity digests.
    - RSA-PSS with SHA-256 for non-repudiation digital signatures.
    - PBKDF2-HMAC-SHA256 for master-passphrase private key wrapping at rest.
    """

    # --- SYMMETRIC ENCRYPTION (AES-256-GCM) ---
    
    @staticmethod
    def generate_aes_key(length_bytes: int = settings.AES_KEY_SIZE_BYTES) -> bytes:
        """Generates a cryptographically secure random AES key (256-bit)."""
        return os.urandom(length_bytes)

    @staticmethod
    def generate_nonce(length_bytes: int = settings.AES_GCM_NONCE_SIZE_BYTES) -> bytes:
        """Generates a 96-bit initialization vector/nonce for AES-GCM."""
        return os.urandom(length_bytes)

    @staticmethod
    def encrypt_aes_gcm(
        plaintext: bytes, 
        key: bytes, 
        nonce: bytes, 
        associated_data: Optional[bytes] = None
    ) -> Tuple[bytes, bytes]:
        """
        Encrypts plaintext with AES-256-GCM.
        Returns (ciphertext, 128-bit authentication tag).
        """
        try:
            aesgcm = AESGCM(key)
            # AESGCM.encrypt in cryptography library appends the 16-byte tag to the ciphertext
            ct_with_tag = aesgcm.encrypt(nonce, plaintext, associated_data)
            ciphertext = ct_with_tag[:-settings.AES_GCM_TAG_SIZE_BYTES]
            tag = ct_with_tag[-settings.AES_GCM_TAG_SIZE_BYTES:]
            return ciphertext, tag
        except Exception as e:
            raise CryptoError(f"AES-256-GCM encryption failed: {str(e)}")

    @staticmethod
    def decrypt_aes_gcm(
        ciphertext: bytes, 
        key: bytes, 
        nonce: bytes, 
        tag: bytes, 
        associated_data: Optional[bytes] = None
    ) -> bytes:
        """
        Decrypts ciphertext with AES-256-GCM and verifies authentication tag.
        Raises IntegrityVerificationError / DecryptionError if tag or ciphertext has been altered.
        """
        try:
            aesgcm = AESGCM(key)
            ct_with_tag = ciphertext + tag
            plaintext = aesgcm.decrypt(nonce, ct_with_tag, associated_data)
            return plaintext
        except InvalidTag:
            raise IntegrityVerificationError("AES-GCM Authentication Tag mismatch: Ciphertext or metadata has been tampered with!")
        except Exception as e:
            raise DecryptionError(f"AES-256-GCM decryption failed: {str(e)}")

    # --- ASYMMETRIC ENCRYPTION (RSA-OAEP) ---

    @staticmethod
    def generate_rsa_keypair(key_size: int = settings.RSA_KEY_SIZE) -> Tuple[str, str]:
        """
        Generates an RSA key pair (2048 or 4096-bit).
        Returns (private_key_pem_str, public_key_pem_str).
        """
        private_key = rsa.generate_private_key(
            public_exponent=65537,
            key_size=key_size
        )
        public_key = private_key.public_key()

        private_pem = private_key.private_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PrivateFormat.PKCS8,
            encryption_algorithm=serialization.NoEncryption()
        ).decode("utf-8")

        public_pem = public_key.public_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PublicFormat.SubjectPublicKeyInfo
        ).decode("utf-8")

        return private_pem, public_pem

    @staticmethod
    def encrypt_rsa_oaep(session_key: bytes, public_key_pem: str) -> bytes:
        """
        Wraps/encrypts the 256-bit AES session key with the recipient's RSA public key using OAEP (SHA-256).
        """
        try:
            public_key = serialization.load_pem_public_key(public_key_pem.encode("utf-8"))
            encrypted_key = public_key.encrypt(
                session_key,
                padding.OAEP(
                    mgf=padding.MGF1(algorithm=hashes.SHA256()),
                    algorithm=hashes.SHA256(),
                    label=None
                )
            )
            return encrypted_key
        except Exception as e:
            raise CryptoError(f"RSA-OAEP key wrapping failed: {str(e)}")

    @staticmethod
    def decrypt_rsa_oaep(encrypted_session_key: bytes, private_key_pem: str) -> bytes:
        """
        Unwraps/decrypts the RSA-OAEP encrypted AES session key using recipient's private key.
        """
        try:
            private_key = serialization.load_pem_private_key(
                private_key_pem.encode("utf-8"),
                password=None
            )
            session_key = private_key.decrypt(
                encrypted_session_key,
                padding.OAEP(
                    mgf=padding.MGF1(algorithm=hashes.SHA256()),
                    algorithm=hashes.SHA256(),
                    label=None
                )
            )
            return session_key
        except Exception as e:
            raise DecryptionError(f"RSA-OAEP key unwrapping failed (invalid private key or corrupted ciphertext): {str(e)}")

    # --- INTEGRITY (SHA-256) & DIGITAL SIGNATURES (RSA-PSS) ---

    @staticmethod
    def compute_sha256(data: bytes) -> str:
        """Computes SHA-256 hexadecimal hash digest of raw data."""
        return hashlib.sha256(data).hexdigest()

    @staticmethod
    def sign_sha256_pss(data_hash_hex: str, private_key_pem: str) -> str:
        """
        Signs the SHA-256 hash using sender's RSA private key with PSS padding.
        Returns Base64 encoded digital signature.
        """
        try:
            private_key = serialization.load_pem_private_key(
                private_key_pem.encode("utf-8"),
                password=None
            )
            digest_bytes = bytes.fromhex(data_hash_hex)
            signature = private_key.sign(
                digest_bytes,
                padding.PSS(
                    mgf=padding.MGF1(hashes.SHA256()),
                    salt_length=padding.PSS.MAX_LENGTH
                ),
                hashes.SHA256()
            )
            return base64.b64encode(signature).decode("utf-8")
        except Exception as e:
            raise CryptoError(f"Digital signature creation failed: {str(e)}")

    @staticmethod
    def verify_sha256_pss(data_hash_hex: str, signature_b64: str, public_key_pem: str) -> bool:
        """
        Verifies the RSA-PSS digital signature against the SHA-256 digest with sender's public key.
        """
        try:
            public_key = serialization.load_pem_public_key(public_key_pem.encode("utf-8"))
            signature = base64.b64decode(signature_b64.encode("utf-8"))
            digest_bytes = bytes.fromhex(data_hash_hex)
            public_key.verify(
                signature,
                digest_bytes,
                padding.PSS(
                    mgf=padding.MGF1(hashes.SHA256()),
                    salt_length=padding.PSS.MAX_LENGTH
                ),
                hashes.SHA256()
            )
            return True
        except InvalidSignature:
            return False
        except Exception:
            return False

    # --- ZERO-PLAINTEXT PRIVATE KEY WRAPPING (PBKDF2 + AES-GCM) ---

    @staticmethod
    def derive_key_from_password(password: str, salt: bytes, iterations: int = settings.PBKDF2_ITERATIONS) -> bytes:
        """Derives a 256-bit Key Encryption Key (KEK) from user password using PBKDF2-HMAC-SHA256."""
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=32,
            salt=salt,
            iterations=iterations,
        )
        return kdf.derive(password.encode("utf-8"))

    @classmethod
    def wrap_private_key(cls, private_key_pem: str, password: str) -> Tuple[str, str, str, str]:
        """
        Encrypts the user's RSA Private Key PEM with a key derived from user password.
        Returns (enc_priv_hex, salt_hex, iv_hex, tag_hex).
        """
        salt = os.urandom(16)
        kek = cls.derive_key_from_password(password, salt)
        iv = cls.generate_nonce()
        ciphertext, tag = cls.encrypt_aes_gcm(private_key_pem.encode("utf-8"), kek, iv)
        
        return (
            ciphertext.hex(),
            salt.hex(),
            iv.hex(),
            tag.hex()
        )

    @classmethod
    def unwrap_private_key(
        cls, 
        enc_priv_hex: str, 
        salt_hex: str, 
        iv_hex: str, 
        tag_hex: str, 
        password: str
    ) -> str:
        """
        Decrypts the user's RSA Private Key PEM using the user's password.
        Raises DecryptionError if the password is incorrect.
        """
        try:
            salt = bytes.fromhex(salt_hex)
            iv = bytes.fromhex(iv_hex)
            tag = bytes.fromhex(tag_hex)
            ciphertext = bytes.fromhex(enc_priv_hex)
            
            kek = cls.derive_key_from_password(password, salt)
            pem_bytes = cls.decrypt_aes_gcm(ciphertext, kek, iv, tag)
            return pem_bytes.decode("utf-8")
        except Exception as e:
            raise DecryptionError(f"Failed to unlock private key (incorrect password or corrupted key envelope): {str(e)}")
