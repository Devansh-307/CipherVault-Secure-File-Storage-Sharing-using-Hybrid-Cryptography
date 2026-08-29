import pytest
import os
from app.crypto.engine import (
    HybridCryptoEngine, 
    IntegrityVerificationError, 
    DecryptionError
)

def test_aes_gcm_encryption_and_decryption():
    """Verify AES-256-GCM symmetric encryption roundtrip."""
    key = HybridCryptoEngine.generate_aes_key()
    nonce = HybridCryptoEngine.generate_nonce()
    plaintext = b"Testing Top Secret AES-256-GCM Encrypted Payload"

    ciphertext, tag = HybridCryptoEngine.encrypt_aes_gcm(plaintext, key, nonce)
    assert ciphertext != plaintext
    assert len(tag) == 16  # 128-bit authentication tag

    decrypted = HybridCryptoEngine.decrypt_aes_gcm(ciphertext, key, nonce, tag)
    assert decrypted == plaintext

def test_aes_gcm_tamper_detection():
    """Verify that altering 1 bit in ciphertext causes GCM tag failure."""
    key = HybridCryptoEngine.generate_aes_key()
    nonce = HybridCryptoEngine.generate_nonce()
    plaintext = b"Immutable security payload"

    ciphertext, tag = HybridCryptoEngine.encrypt_aes_gcm(plaintext, key, nonce)
    
    # Tamper with 1 byte in ciphertext
    tampered_ct = bytearray(ciphertext)
    tampered_ct[0] ^= 0xFF

    with pytest.raises(IntegrityVerificationError):
        HybridCryptoEngine.decrypt_aes_gcm(bytes(tampered_ct), key, nonce, tag)

def test_rsa_oaep_key_wrapping():
    """Verify RSA-2048 OAEP key encapsulation roundtrip."""
    priv_pem, pub_pem = HybridCryptoEngine.generate_rsa_keypair(key_size=2048)
    session_key = HybridCryptoEngine.generate_aes_key()

    wrapped_key = HybridCryptoEngine.encrypt_rsa_oaep(session_key, pub_pem)
    assert wrapped_key != session_key
    assert len(wrapped_key) == 256  # 2048-bit modulus

    unwrapped_key = HybridCryptoEngine.decrypt_rsa_oaep(wrapped_key, priv_pem)
    assert unwrapped_key == session_key

def test_sha256_and_digital_signature():
    """Verify SHA-256 hashing and RSA-PSS signature verification."""
    priv_pem, pub_pem = HybridCryptoEngine.generate_rsa_keypair(key_size=2048)
    data = b"Authentic signed message from Alice"
    
    data_hash = HybridCryptoEngine.compute_sha256(data)
    assert len(data_hash) == 64

    # Sign
    signature = HybridCryptoEngine.sign_sha256_pss(data_hash, priv_pem)
    assert signature is not None

    # Verify with correct public key
    is_valid = HybridCryptoEngine.verify_sha256_pss(data_hash, signature, pub_pem)
    assert is_valid is True

    # Tamper with hash -> verification must return False
    tampered_hash = HybridCryptoEngine.compute_sha256(b"Tampered message")
    is_valid_tampered = HybridCryptoEngine.verify_sha256_pss(tampered_hash, signature, pub_pem)
    assert is_valid_tampered is False

def test_private_key_pbkdf2_wrapping():
    """Verify private key encryption using password-derived KEK."""
    priv_pem, _ = HybridCryptoEngine.generate_rsa_keypair(key_size=2048)
    password = "MasterKeyPassword@99"

    enc_hex, salt_hex, iv_hex, tag_hex = HybridCryptoEngine.wrap_private_key(priv_pem, password)
    
    # Correct password unwraps
    recovered_pem = HybridCryptoEngine.unwrap_private_key(enc_hex, salt_hex, iv_hex, tag_hex, password)
    assert recovered_pem == priv_pem

    # Wrong password fails
    with pytest.raises(DecryptionError):
        HybridCryptoEngine.unwrap_private_key(enc_hex, salt_hex, iv_hex, tag_hex, "WrongPassword!")
