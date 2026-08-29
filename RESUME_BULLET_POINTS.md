# Resume Bullet Points & Technical Interview Guide

Use these professionally crafted bullet points, technical summaries, and interview talking points to highlight this project on your Resume/CV, LinkedIn, GitHub, and job interviews.

---

## 📄 Option 1: Full-Stack / Backend Software Engineer Role

**Project Title:** **CipherVault: Secure File Storage & Sharing using Hybrid Cryptography**  
**Tech Stack:** React 18, Tailwind CSS, Vite, Chart.js, Lucide Icons, Python 3.13, FastAPI, Cryptography (OpenSSL), RSA-OAEP/PSS, AES-256-GCM, SHA-256, SQLAlchemy, SQLite/PostgreSQL, PyJWT, Bcrypt, Docker.

### High-Impact Resume Bullet Points:
- Developed a full-stack secure cloud storage platform featuring a **React 18 + Tailwind CSS** cyber-defense dashboard and a high-performance **FastAPI** cryptographic backend.
- Engineered a hybrid cryptographic pipeline combining **AES-256-GCM** authenticated bulk encryption with **RSA-2048/4096 OAEP** asymmetric session key encapsulation for zero-trust multi-user file sharing.
- Architected a zero-knowledge key management workflow utilizing **PBKDF2-HMAC-SHA256** (100k rounds) to envelope user private keys at rest, guaranteeing zero plaintext exposure across storage providers and database admins.
- Built interactive security tooling including a live **Tamper Simulation Lab** (demonstrating active Galois/Counter Mode tag and SHA-256 rejection) and a real-time **Cryptographic Benchmarking Suite** displaying a **250x+ throughput speedup** over pure RSA.
- Implemented **RSA-PSS** digital signatures for non-repudiation, dynamic time-bound link expirations, instant access revocation, and an immutable **SIEM-grade audit trail**, validated by a 100% passing **Pytest (TC01–TC08)** test suite.

---

## 🛡️ Option 2: Cybersecurity / Information Security Engineer Role

**Project Title:** **Zero-Trust Cloud Vault & Multi-User Hybrid Cryptosystem**  
**Tech Stack:** Applied Cryptography (AES-256-GCM, RSA-OAEP, RSA-PSS, SHA-256), NIST SP 800-38D / FIPS 180-4 Compliance, React, FastAPI, SIEM Audit Trails, Pytest.

### High-Impact Resume Bullet Points:
- Designed and deployed a NIST-compliant hybrid cryptosystem eliminating symmetric key transmission vulnerabilities and protecting cloud file payloads against chosen-ciphertext and MITM attacks.
- Integrated authenticated encryption via **AES-256 in Galois/Counter Mode (GCM)** with 96-bit unique nonces and 128-bit MAC tags, preventing active storage tampering and ciphertext manipulation.
- Constructed an interactive threat simulation lab in React demonstrating immediate mathematical detection of bit-flip and MAC tag truncation attacks before execution.
- Developed a SIEM-grade forensic audit logging module tracking cryptographic operations, unauthorized decryption attempts, and session anomalies with full request traceability.

---

## 🎯 Technical Keywords for ATS (Applicant Tracking Systems)

> `React 18`, `Tailwind CSS`, `Vite`, `Chart.js`, `Hybrid Cryptography`, `AES-256-GCM`, `RSA-2048 / RSA-4096`, `RSA-OAEP`, `RSA-PSS Digital Signatures`, `SHA-256 Checksums`, `PBKDF2-HMAC-SHA256`, `Key Encapsulation Mechanism (KEM)`, `Zero-Knowledge Encryption`, `Role-Based Access Control (RBAC)`, `FastAPI`, `Python`, `SQLAlchemy ORM`, `RESTful APIs`, `PyJWT Authentication`, `Bcrypt Hashing`, `Automated Unit & Integration Testing (Pytest)`, `SIEM Audit Logging`, `Performance Benchmarking`.

---

## 💬 Top Interview Questions & Expert Answers (Cheat Sheet)

### Q1: Why did you choose a Hybrid Cryptographic approach instead of pure AES or pure RSA?
**Answer:**  
> "Pure AES provides hardware-accelerated throughput for large files but introduces a severe key-distribution vulnerability because the secret key must somehow be shared out-of-band. Pure RSA solves key exchange using public/private key pairs, but it is mathematically complex, slow, and restricted to encrypting data smaller than the key size (max ~190 bytes per block in RSA-2048 OAEP).  
> In our Hybrid Cryptosystem, we get the best of both worlds: we generate a fresh, cryptographically random 256-bit AES session key for the bulk file (encrypting at near-native hardware speed), and only use RSA-OAEP to wrap the lightweight 32-byte session key for each recipient."

### Q2: Why AES-GCM instead of AES-CBC?
**Answer:**  
> "AES-CBC provides confidentiality but does not guarantee authenticity or integrity by itself; it requires a separate HMAC (Encrypt-then-MAC) and is vulnerable to padding-oracle attacks if implemented incorrectly.  
> AES-GCM (Galois/Counter Mode) is an Authenticated Encryption with Associated Data (AEAD) standard (NIST SP 800-38D). It generates a 128-bit authentication tag alongside the ciphertext. If any bit of the ciphertext or IV is altered, decryption fails immediately at the cryptographic level before any plaintext is processed."

### Q3: How does the system handle multi-user sharing without re-encrypting the bulk file?
**Answer:**  
> "When a file is uploaded, the raw payload is encrypted once with a random AES-256 session key $K_{session}$. When the owner shares the file with users Bob and Charlie, the backend unwraps $K_{session}$ using the owner's private key, and then encrypts a copy of $K_{session}$ with Bob's RSA public key and another copy with Charlie's RSA public key.  
> Both encrypted keys are stored as records in the `SharedFiles` table. Both recipients can download the same underlying ciphertext file and decrypt it using their own respective private keys without duplicating storage or re-encrypting the bulk file."

### Q4: How is the user's private key protected on the server?
**Answer:**  
> "We implement a Key Encryption Key (KEK) envelope pattern. The user's RSA private key is never stored in plaintext. Upon registration, a 256-bit KEK is derived from the user's master password using **PBKDF2-HMAC-SHA256** with 100,000 iterations and a unique 16-byte cryptographic salt. The private key is then encrypted with AES-256-GCM using this KEK.  
> Even if an attacker dumps the database, they cannot decrypt the private keys without obtaining the individual user passwords."
