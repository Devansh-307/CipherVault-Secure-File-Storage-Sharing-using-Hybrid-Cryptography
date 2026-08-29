import time
import os
from typing import Dict, Any, List
from app.crypto.engine import HybridCryptoEngine
from cryptography.hazmat.primitives.asymmetric import padding
from cryptography.hazmat.primitives import hashes, serialization

class CryptoBenchmarkEngine:
    """
    Executes live comparative performance benchmarks across:
    1. Pure AES-256-GCM
    2. Pure RSA-2048 (Chunked PKCS#1 v1.5 / OAEP)
    3. Proposed Hybrid Cryptosystem (AES-256-GCM + RSA-OAEP Key Encapsulation + SHA-256 Integrity)
    """

    @classmethod
    def benchmark_pure_aes(cls, data: bytes) -> Dict[str, Any]:
        key = HybridCryptoEngine.generate_aes_key()
        nonce = HybridCryptoEngine.generate_nonce()
        
        # Measure Encryption
        start_enc = time.perf_counter()
        ciphertext, tag = HybridCryptoEngine.encrypt_aes_gcm(data, key, nonce)
        enc_time_ms = (time.perf_counter() - start_enc) * 1000.0

        # Measure Decryption
        start_dec = time.perf_counter()
        plaintext = HybridCryptoEngine.decrypt_aes_gcm(ciphertext, key, nonce, tag)
        dec_time_ms = (time.perf_counter() - start_dec) * 1000.0

        assert plaintext == data, "Decryption sanity check failed"

        return {
            "encryption_time_ms": round(enc_time_ms, 3),
            "decryption_time_ms": round(dec_time_ms, 3),
            "total_time_ms": round(enc_time_ms + dec_time_ms, 3),
            "throughput_mb_s": round((len(data) / (1024 * 1024)) / ((enc_time_ms + dec_time_ms) / 2000.0) if (enc_time_ms + dec_time_ms) > 0 else 0, 2),
            "ciphertext_size_bytes": len(ciphertext) + len(tag),
            "key_exchange_security": "Vulnerable (requires insecure out-of-band secret transmission)"
        }

    @classmethod
    def benchmark_pure_rsa(cls, data: bytes, key_size: int = 2048) -> Dict[str, Any]:
        """
        Pure RSA chunked encryption.
        RSA-2048 with OAEP SHA-256 can encrypt at most: 256 - 2*32 - 2 = 190 bytes per block.
        For large files (>1MB), this is computationally prohibitive.
        """
        # For large data, simulate/cap chunks to prevent freezing while recording realistic projection
        is_simulated = False
        max_chunk = 190
        total_len = len(data)
        
        priv_pem, pub_pem = HybridCryptoEngine.generate_rsa_keypair(key_size=key_size)
        pub_key = serialization.load_pem_public_key(pub_pem.encode("utf-8"))
        priv_key = serialization.load_pem_private_key(priv_pem.encode("utf-8"), password=None)

        if total_len > 100 * 1024:  # If > 100KB, measure 50 chunks and project linearly to avoid blocking
            sample_data = data[: 50 * max_chunk]
            is_simulated = True
            chunks = [sample_data[i:i + max_chunk] for i in range(0, len(sample_data), max_chunk)]
            
            start_enc = time.perf_counter()
            encrypted_chunks = []
            for c in chunks:
                enc = pub_key.encrypt(
                    c,
                    padding.OAEP(
                        mgf=padding.MGF1(algorithm=hashes.SHA256()),
                        algorithm=hashes.SHA256(),
                        label=None
                    )
                )
                encrypted_chunks.append(enc)
            sample_enc_time = time.perf_counter() - start_enc

            start_dec = time.perf_counter()
            for ec in encrypted_chunks:
                priv_key.decrypt(
                    ec,
                    padding.OAEP(
                        mgf=padding.MGF1(algorithm=hashes.SHA256()),
                        algorithm=hashes.SHA256(),
                        label=None
                    )
                )
            sample_dec_time = time.perf_counter() - start_dec

            total_chunks = (total_len + max_chunk - 1) // max_chunk
            multiplier = total_chunks / len(chunks)
            enc_time_ms = sample_enc_time * multiplier * 1000.0
            dec_time_ms = sample_dec_time * multiplier * 1000.0
        else:
            chunks = [data[i:i + max_chunk] for i in range(0, total_len, max_chunk)]
            
            start_enc = time.perf_counter()
            encrypted_chunks = []
            for c in chunks:
                enc = pub_key.encrypt(
                    c,
                    padding.OAEP(
                        mgf=padding.MGF1(algorithm=hashes.SHA256()),
                        algorithm=hashes.SHA256(),
                        label=None
                    )
                )
                encrypted_chunks.append(enc)
            enc_time_ms = (time.perf_counter() - start_enc) * 1000.0

            start_dec = time.perf_counter()
            for ec in encrypted_chunks:
                priv_key.decrypt(
                    ec,
                    padding.OAEP(
                        mgf=padding.MGF1(algorithm=hashes.SHA256()),
                        algorithm=hashes.SHA256(),
                        label=None
                    )
                )
            dec_time_ms = (time.perf_counter() - start_dec) * 1000.0

        return {
            "encryption_time_ms": round(enc_time_ms, 3),
            "decryption_time_ms": round(dec_time_ms, 3),
            "total_time_ms": round(enc_time_ms + dec_time_ms, 3),
            "throughput_mb_s": round((total_len / (1024 * 1024)) / ((enc_time_ms + dec_time_ms) / 2000.0) if (enc_time_ms + dec_time_ms) > 0 else 0, 2),
            "ciphertext_size_bytes": ((total_len + max_chunk - 1) // max_chunk) * 256,
            "projected": is_simulated,
            "key_exchange_security": "Secure (public key exchange), but computationally prohibitive for large files"
        }

    @classmethod
    def benchmark_hybrid(cls, data: bytes, key_size: int = 2048) -> Dict[str, Any]:
        """
        Proposed Hybrid Scheme:
        1. AES-256 session key generated
        2. AES-256-GCM bulk payload encryption
        3. SHA-256 integrity hash calculation
        4. RSA-2048 OAEP session key encapsulation
        5. RSA-PSS signature over hash
        """
        priv_pem, pub_pem = HybridCryptoEngine.generate_rsa_keypair(key_size=key_size)

        # --- HYBRID ENCRYPTION & SIGNING ---
        start_enc = time.perf_counter()
        
        # 1. Random AES Session Key & Nonce
        session_key = HybridCryptoEngine.generate_aes_key()
        nonce = HybridCryptoEngine.generate_nonce()
        
        # 2. Bulk AES-GCM Encrypt
        ciphertext, tag = HybridCryptoEngine.encrypt_aes_gcm(data, session_key, nonce)
        
        # 3. SHA-256 Hash
        file_hash = HybridCryptoEngine.compute_sha256(data)
        
        # 4. RSA-PSS Digital Signature
        signature = HybridCryptoEngine.sign_sha256_pss(file_hash, priv_pem)
        
        # 5. RSA-OAEP Session Key Wrapping
        wrapped_key = HybridCryptoEngine.encrypt_rsa_oaep(session_key, pub_pem)
        
        enc_time_ms = (time.perf_counter() - start_enc) * 1000.0

        # --- HYBRID DECRYPTION & INTEGRITY VERIFICATION ---
        start_dec = time.perf_counter()
        
        # 1. Unwrap AES session key using RSA private key
        unwrapped_session_key = HybridCryptoEngine.decrypt_rsa_oaep(wrapped_key, priv_pem)
        
        # 2. Decrypt AES-GCM bulk payload & verify GCM tag
        decrypted_plaintext = HybridCryptoEngine.decrypt_aes_gcm(ciphertext, unwrapped_session_key, nonce, tag)
        
        # 3. Verify SHA-256 integrity hash
        decrypted_hash = HybridCryptoEngine.compute_sha256(decrypted_plaintext)
        if decrypted_hash != file_hash:
            raise ValueError("Integrity verification mismatch")
            
        # 4. Verify sender RSA-PSS signature
        is_sig_valid = HybridCryptoEngine.verify_sha256_pss(decrypted_hash, signature, pub_pem)
        if not is_sig_valid:
            raise ValueError("Digital signature verification failed")

        dec_time_ms = (time.perf_counter() - start_dec) * 1000.0

        assert decrypted_plaintext == data, "Decryption verification failed"

        return {
            "encryption_time_ms": round(enc_time_ms, 3),
            "decryption_time_ms": round(dec_time_ms, 3),
            "total_time_ms": round(enc_time_ms + dec_time_ms, 3),
            "throughput_mb_s": round((len(data) / (1024 * 1024)) / ((enc_time_ms + dec_time_ms) / 2000.0) if (enc_time_ms + dec_time_ms) > 0 else 0, 2),
            "ciphertext_size_bytes": len(ciphertext) + len(tag) + len(wrapped_key),
            "integrity_verified": True,
            "signature_verified": True,
            "key_exchange_security": "Optimal: Zero shared secret transmission + Hardware-speed bulk encryption"
        }

    @classmethod
    def run_comprehensive_benchmark(cls, file_size_kb: int = 1024) -> Dict[str, Any]:
        """
        Runs complete benchmark for a given payload size and returns comparative analytics.
        """
        data = os.urandom(file_size_kb * 1024)
        
        aes_res = cls.benchmark_pure_aes(data)
        hybrid_res = cls.benchmark_hybrid(data)
        rsa_res = cls.benchmark_pure_rsa(data)

        # Speedup calculations
        speedup_vs_rsa = round(rsa_res["total_time_ms"] / hybrid_res["total_time_ms"], 1) if hybrid_res["total_time_ms"] > 0 else 1.0
        overhead_vs_pure_aes = round(hybrid_res["total_time_ms"] - aes_res["total_time_ms"], 2)

        return {
            "payload_size_kb": file_size_kb,
            "payload_size_formatted": f"{file_size_kb / 1024:.2f} MB" if file_size_kb >= 1024 else f"{file_size_kb} KB",
            "results": {
                "pure_aes_256": aes_res,
                "proposed_hybrid": hybrid_res,
                "pure_rsa_2048": rsa_res
            },
            "analysis": {
                "hybrid_speedup_vs_rsa": f"{speedup_vs_rsa}x faster than pure RSA",
                "hybrid_overhead_vs_pure_aes_ms": f"{overhead_vs_pure_aes} ms",
                "security_rating": "Military-Grade (AES-256-GCM + RSA-2048 OAEP + SHA-256 Signatures)"
            }
        }
