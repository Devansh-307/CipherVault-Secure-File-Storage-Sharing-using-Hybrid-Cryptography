# 🎬 CipherVault: Live Interview Presentation Script & Demo Checklist

**Author & Presenter:** Devansh Rathore  
**Project:** CipherVault — Secure File Storage & Sharing using Hybrid Cryptography  
**Live URL:** `http://localhost:8000` (or Docker port)  
**API Docs:** `http://localhost:8000/docs`  
**GitHub:** [https://github.com/Devansh-307/hybrid-crypto-vault](https://github.com/Devansh-307/hybrid-crypto-vault)

---

## ⏱️ Pre-Interview Setup (2 Minutes Before Your Interview)

1. **Start the Application** (Choose either Docker or Python):
   - **Via Docker (Isolated):** Double-click `docker-start.bat` (or run `docker compose up -d`)
   - **Via Python:** Run `python run.py`
2. **Open 3 Clean Browser Tabs in Fullscreen:**
   - **Tab 1:** `http://localhost:8000` (React Web Dashboard)
   - **Tab 2:** `http://localhost:8000/docs` (Interactive Swagger API Documentation)
   - **Tab 3:** `https://github.com/Devansh-307/hybrid-crypto-vault` (Your GitHub Repository)

---

## 🎙️ The 3-Minute Live Screen-Share Walkthrough

### 📍 Step 1: Introduction & 1-Click Login (0:00 – 0:30)
* **Action:** Open Tab 1 (`http://localhost:8000`). Click the **"Devansh (Admin)"** demo login button.
* **What to Say:**
  > *"Hi everyone. For my project, I built **CipherVault**, an industry-grade secure cloud storage and multi-user file sharing system utilizing **Hybrid Cryptography (AES-256-GCM + RSA-2048 OAEP + SHA-256)**.*
  >
  > *Traditional cloud storage platforms suffer from two major flaws: purely symmetric encryption (AES) is fast but creates a severe key-distribution vulnerability, while purely asymmetric encryption (RSA) is mathematically too slow for bulk files.*
  >
  > *CipherVault combines both to achieve hardware-speed bulk encryption with zero-trust key exchange."*

---

### 📍 Step 2: Encrypting a File with Dynamic Key Wrapping (0:30 – 1:15)
* **Action:** 
  1. Click **"Encrypt New File"** on the left sidebar.
  2. Drag and drop any file from the `sample_files/` folder (e.g. `confidential_research_paper.txt`).
  3. Point out the **SHA-256 Fingerprint** updating instantly in real-time inside the browser.
  4. Check the box for recipient **"Bob"**.
  5. Click **"Encrypt & Store Payload"**.
* **What to Say:**
  > *"When I upload a file, notice the WebCrypto engine calculates the SHA-256 fingerprint client-side.*
  >
  > *Behind the scenes, the backend generates a cryptographically random 256-bit AES session key, encrypts the raw file using **AES-256-GCM** in ~18ms, signs the hash using my RSA private key with **RSA-PSS** for non-repudiation, and encapsulates the 32-byte session key for Bob using his **RSA-2048 public key with OAEP padding**.*
  >
  > *Neither the server nor database administrator ever has access to plaintext file contents or raw private keys."*

---

### 📍 Step 3: Decryption & Integrity Verification Proof (1:15 – 1:45)
* **Action:**
  1. On the file `ciphervault_blueprint.txt`, click **"Decrypt & Verify"**.
  2. Enter password `Password123!` (or let auto-fill) and click **"Decrypt & Verify Plaintext"**.
  3. Show the green **"INTEGRITY VERIFIED & AUTHENTIC"** banner and **"RSA-PSS Signed"** badge.
* **What to Say:**
  > *"During retrieval, the recipient unwraps the session key using their private key, decrypts the ciphertext with AES-GCM, and verifies the 128-bit MAC tag.*
  >
  > *The system recomputes the SHA-256 hash and verifies the sender's RSA-PSS digital signature, mathematically proving the file is authentic, unaltered, and originated from me."*

---

### 📍 Step 4: The Killer Feature — Tamper Simulation Lab (1:45 – 2:30)
* **Action:**
  1. Click the **"Tamper & Security Lab"** tab in the sidebar.
  2. Select any file $\rightarrow$ select **"Ciphertext Bit-Flip Attack"** $\rightarrow$ click **"Inject Malicious Bit-Flip"**.
  3. Click **"Test Decryption Failure Live"** on the red banner.
  4. Show the red **"CRYPTOGRAPHIC VERIFICATION FAILED"** security alert.
* **What to Say:**
  > *"To demonstrate zero-trust resilience, I built an interactive attack lab. Here I deliberately injected a bit-flip into the physical ciphertext on disk.*
  >
  > *When decryption is attempted, AES-256-GCM authentication tag validation fails immediately at the cryptographic level with an `InvalidTag` exception. It logs a critical security alert and blocks execution before any corrupted data can be delivered."*

---

### 📍 Step 5: Live Benchmarking & 250x Speedup Proof (2:30 – 3:00)
* **Action:**
  1. Click **"Crypto Benchmark Lab"** in the sidebar.
  2. Select **"1 MB"** $\rightarrow$ click **"Run Performance Benchmark"**.
  3. Show the interactive Chart.js bar chart and comparison table.
* **What to Say:**
  > *"Finally, here is the empirical performance benchmark across Pure AES, Pure RSA, and our Hybrid scheme.*
  >
  > *Because RSA-2048 has a 190-byte block size limit, encrypting a 1MB file with pure RSA requires 5,500 operations and takes ~4.5 seconds.*
  >
  > *Our Hybrid scheme processes the same 1MB file in just **18 milliseconds**—a **250x acceleration** over pure RSA—while retaining 100% public-key key exchange security."*

---

## 🏆 Top 3 Power Answers to Memorize for Follow-Up Questions

### 1. "Why AES-GCM instead of AES-CBC?"
> *"AES-CBC only provides confidentiality (encryption). It does not provide authenticity and requires a separate HMAC, making it vulnerable to padding-oracle attacks. AES-GCM is an AEAD mode (NIST SP 800-38D) that computes a 128-bit authentication tag simultaneously, guaranteeing confidentiality, integrity, and tamper detection in a single hardware-accelerated pass."*

### 2. "How are user private keys protected on the server?"
> *"We use a Key Encryption Key (KEK) envelope pattern. The user's RSA private key is never stored in plaintext. We derive a 256-bit KEK from the user's master password using **PBKDF2-HMAC-SHA256 with 100,000 iterations** and a 16-byte random salt, then encrypt the private key with AES-256-GCM. Even if an attacker dumps the database, they cannot read any private key."*

### 3. "How do you share a 1GB file with 10 users without duplicating storage?"
> *"The 1GB ciphertext on disk remains untouched. The owner unlocks the 32-byte AES session key and encrypts only that 32-byte key 10 times with each recipient's RSA public key (~256 bytes per record in the `shared_files` table). All 10 users download the same single ciphertext and decrypt it with their individual private keys."*
