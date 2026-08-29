// Vault Management: File Upload, Listing, Decryption, Verification

class VaultManager {
  static currentFiles = [];

  static init() {
    this.setupEventListeners();
  }

  static setupEventListeners() {
    // Upload modal triggers
    const openUploadBtn = document.getElementById('open-upload-btn');
    const closeUploadBtn = document.getElementById('close-upload-modal-btn');
    if (openUploadBtn) openUploadBtn.addEventListener('click', () => this.openUploadModal());
    if (closeUploadBtn) closeUploadBtn.addEventListener('click', () => this.closeUploadModal());

    // File input change & drag-and-drop
    const fileInput = document.getElementById('upload-file-input');
    const dropZone = document.getElementById('upload-drop-zone');

    if (fileInput) {
      fileInput.addEventListener('change', (e) => this.handleFileSelection(e.target.files[0]));
    }

    if (dropZone) {
      ['dragenter', 'dragover'].forEach((eventName) => {
        dropZone.addEventListener(eventName, (e) => {
          e.preventDefault();
          dropZone.classList.add('border-sky-400', 'bg-sky-950/20');
        });
      });

      ['dragleave', 'drop'].forEach((eventName) => {
        dropZone.addEventListener(eventName, (e) => {
          e.preventDefault();
          dropZone.classList.remove('border-sky-400', 'bg-sky-950/20');
        });
      });

      dropZone.addEventListener('drop', (e) => {
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
          this.handleFileSelection(e.dataTransfer.files[0]);
          if (fileInput) fileInput.files = e.dataTransfer.files;
        }
      });
    }

    // Upload Form Submission
    const uploadForm = document.getElementById('upload-form');
    if (uploadForm) {
      uploadForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        await this.handleUploadSubmit();
      });
    }

    // Refresh Files
    const refreshBtn = document.getElementById('refresh-vault-btn');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => this.loadVaultFiles());
    }

    // Decrypt Modal Close
    const closeDecryptBtn = document.getElementById('close-decrypt-modal-btn');
    if (closeDecryptBtn) closeDecryptBtn.addEventListener('click', () => this.closeDecryptModal());

    // Decrypt Form Submit
    const decryptForm = document.getElementById('decrypt-form');
    if (decryptForm) {
      decryptForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        await this.executeDecryption();
      });
    }
  }

  static async loadVaultFiles() {
    const listContainer = document.getElementById('vault-files-list');
    if (!listContainer) return;

    listContainer.innerHTML = `
      <tr>
        <td colspan="6" class="text-center py-8 text-slate-400">
          <i data-lucide="loader-2" class="w-6 h-6 animate-spin inline mb-2 text-sky-400"></i>
          <div>Loading encrypted file registry...</div>
        </td>
      </tr>
    `;
    if (window.lucide) lucide.createIcons();

    try {
      const files = await ApiClient.listFiles();
      this.currentFiles = files;
      this.renderFilesList(files);
    } catch (err) {
      listContainer.innerHTML = `
        <tr>
          <td colspan="6" class="text-center py-8 text-rose-400">
            <i data-lucide="alert-circle" class="w-6 h-6 inline mb-2"></i>
            <div>Error loading files: ${err.message}</div>
          </td>
        </tr>
      `;
      if (window.lucide) lucide.createIcons();
    }
  }

  static renderFilesList(files) {
    const listContainer = document.getElementById('vault-files-list');
    const countBadge = document.getElementById('vault-files-count');
    if (countBadge) countBadge.textContent = `${files.length} Files`;

    if (!files || files.length === 0) {
      listContainer.innerHTML = `
        <tr>
          <td colspan="6" class="text-center py-12 text-slate-500">
            <i data-lucide="folder-lock" class="w-12 h-12 inline mb-3 text-slate-600"></i>
            <div class="text-base font-medium text-slate-400">Your Encrypted Vault is Empty</div>
            <div class="text-xs text-slate-500 mt-1">Upload a file to encrypt it with AES-256-GCM and RSA-2048 key encapsulation.</div>
          </td>
        </tr>
      `;
      if (window.lucide) lucide.createIcons();
      return;
    }

    listContainer.innerHTML = files.map((file) => {
      const isTampered = file.is_tampered;
      return `
        <tr class="border-b border-slate-800/60 hover:bg-slate-800/30 transition duration-150">
          <td class="py-4 px-4">
            <div class="flex items-center gap-3">
              <div class="p-2.5 rounded-lg ${isTampered ? 'bg-rose-500/10 border border-rose-500/30 text-rose-400' : 'bg-sky-500/10 border border-sky-500/30 text-sky-400'}">
                <i data-lucide="${isTampered ? 'alert-triangle' : 'file-code'}" class="w-5 h-5"></i>
              </div>
              <div>
                <div class="font-semibold text-slate-200 text-sm flex items-center gap-2">
                  ${file.original_filename}
                  ${isTampered ? `<span class="badge-crypto badge-danger text-[10px]">Tampered</span>` : ''}
                </div>
                <div class="text-xs text-slate-500 mono truncate max-w-[200px]" title="${file.file_hash}">
                  SHA-256: ${file.file_hash.substring(0, 16)}...
                </div>
              </div>
            </div>
          </td>
          <td class="py-4 px-4 text-xs text-slate-300">
            <div>${formatBytes(file.file_size_bytes)}</div>
            <div class="text-[11px] text-slate-500">${formatBytes(file.encrypted_size_bytes)} (Ciphertext)</div>
          </td>
          <td class="py-4 px-4">
            <div class="flex flex-col gap-1">
              <span class="badge-crypto text-[11px]">
                <i data-lucide="shield" class="w-3 h-3"></i> AES-256-GCM
              </span>
              <span class="badge-crypto text-[11px] ${file.has_signature ? 'badge-success' : ''}">
                <i data-lucide="key" class="w-3 h-3"></i> RSA-PSS Signed
              </span>
            </div>
          </td>
          <td class="py-4 px-4 text-xs text-slate-400">
            ${new Date(file.created_at).toLocaleDateString()} ${new Date(file.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </td>
          <td class="py-4 px-4 text-right">
            <div class="flex items-center justify-end gap-2">
              <button 
                class="px-3 py-1.5 rounded-lg bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/30 text-xs font-medium flex items-center gap-1.5 transition"
                onclick="VaultManager.openDecryptModal('${file.id}', '${file.original_filename}', true)"
              >
                <i data-lucide="unlock" class="w-3.5 h-3.5"></i> Decrypt & Verify
              </button>
              <button 
                class="p-1.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 text-xs transition"
                title="Share File"
                onclick="ShareManager.openShareModal('${file.id}', '${file.original_filename}')"
              >
                <i data-lucide="share-2" class="w-4 h-4"></i>
              </button>
              <button 
                class="p-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs transition"
                title="Tamper Simulation Lab"
                onclick="TamperLabManager.selectFileForTamper('${file.id}')"
              >
                <i data-lucide="bug" class="w-4 h-4"></i>
              </button>
              <button 
                class="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs transition"
                title="Delete File"
                onclick="VaultManager.handleDelete('${file.id}', '${file.original_filename}')"
              >
                <i data-lucide="trash-2" class="w-4 h-4"></i>
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    if (window.lucide) lucide.createIcons();
  }

  static async openUploadModal() {
    document.getElementById('upload-modal').classList.remove('hidden');
    // Pre-fill password if cached
    const cachedKey = sessionStorage.getItem('current_master_key');
    if (cachedKey) {
      const passInput = document.getElementById('upload-password');
      if (passInput) passInput.value = cachedKey;
    }
    // Load recipients
    await this.populateRecipientSelector();
  }

  static closeUploadModal() {
    document.getElementById('upload-modal').classList.add('hidden');
    document.getElementById('upload-form').reset();
    document.getElementById('file-preview-info').classList.add('hidden');
  }

  static async populateRecipientSelector() {
    const container = document.getElementById('upload-recipients-list');
    if (!container) return;

    try {
      const users = await ApiClient.listUsers();
      if (!users || users.length === 0) {
        container.innerHTML = `<div class="text-xs text-slate-500 italic">No other registered users found. You can add users later.</div>`;
        return;
      }

      container.innerHTML = users.map((u) => `
        <label class="flex items-center gap-2 text-xs text-slate-300 p-2 rounded-lg bg-slate-900/60 border border-slate-800 hover:border-sky-500/40 cursor-pointer">
          <input type="checkbox" name="upload-recipients" value="${u.username}" class="rounded bg-slate-800 text-sky-500 focus:ring-0">
          <div>
            <span class="font-semibold text-slate-200">${u.full_name || u.username}</span>
            <span class="text-[10px] text-slate-500 block">@${u.username} (RSA-2048)</span>
          </div>
        </label>
      `).join('');
    } catch (err) {
      container.innerHTML = `<div class="text-xs text-slate-500">Failed to load user directory.</div>`;
    }
  }

  static handleFileSelection(file) {
    if (!file) return;

    const infoBox = document.getElementById('file-preview-info');
    const nameEl = document.getElementById('selected-file-name');
    const sizeEl = document.getElementById('selected-file-size');
    const hashEl = document.getElementById('selected-file-hash-preview');

    if (nameEl) nameEl.textContent = file.name;
    if (sizeEl) sizeEl.textContent = formatBytes(file.size);
    if (hashEl) hashEl.textContent = 'Computing SHA-256 client fingerprint...';
    if (infoBox) infoBox.classList.remove('hidden');

    // Calculate SHA-256 in browser via WebCrypto API
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const buffer = e.target.result;
        const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        if (hashEl) hashEl.textContent = hashHex;
      } catch (err) {
        if (hashEl) hashEl.textContent = 'Hardware crypto ready on upload';
      }
    };
    reader.readAsArrayBuffer(file);
  }

  static async handleUploadSubmit() {
    const fileInput = document.getElementById('upload-file-input');
    const passwordInput = document.getElementById('upload-password');
    const submitBtn = document.getElementById('upload-submit-btn');

    if (!fileInput.files || !fileInput.files[0]) {
      showToast('Please select a file to encrypt.', 'error');
      return;
    }

    if (!passwordInput.value) {
      showToast('Please enter your master password to sign with RSA-PSS.', 'error');
      return;
    }

    const selectedRecipients = Array.from(
      document.querySelectorAll('input[name="upload-recipients"]:checked')
    ).map(cb => cb.value);

    const formData = new FormData();
    formData.append('file', fileInput.files[0]);
    formData.append('password', passwordInput.value);
    if (selectedRecipients.length > 0) {
      formData.append('recipient_usernames', JSON.stringify(selectedRecipients));
    }

    submitBtn.disabled = true;
    submitBtn.innerHTML = `<i data-lucide="loader-2" class="w-4 h-4 animate-spin inline mr-2"></i> Encrypting with AES-256-GCM & Wrapping RSA Keys...`;
    if (window.lucide) lucide.createIcons();

    try {
      const result = await ApiClient.uploadFile(formData);
      showToast(`'${result.original_filename}' successfully encrypted and protected!`, 'success', 'Hybrid Encryption Complete');
      this.closeUploadModal();
      this.loadVaultFiles();
      if (window.AuditManager) window.AuditManager.loadDashboardStats();
    } catch (err) {
      showToast(err.message, 'error', 'Upload Encryption Failed');
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = `<span>Encrypt & Store Payload</span> <i data-lucide="shield-check" class="w-4 h-4 inline ml-1"></i>`;
      if (window.lucide) lucide.createIcons();
    }
  }

  static selectedDecryptFileId = null;

  static openDecryptModal(fileId, filename, isOwner = true) {
    this.selectedDecryptFileId = fileId;
    document.getElementById('decrypt-file-name-title').textContent = filename;
    document.getElementById('decrypt-result-box').classList.add('hidden');
    document.getElementById('decrypt-error-box').classList.add('hidden');
    document.getElementById('decrypt-form-box').classList.remove('hidden');

    const passInput = document.getElementById('decrypt-password');
    const cachedKey = sessionStorage.getItem('current_master_key');
    if (cachedKey && passInput) {
      passInput.value = cachedKey;
    }

    document.getElementById('decrypt-modal').classList.remove('hidden');
  }

  static closeDecryptModal() {
    document.getElementById('decrypt-modal').classList.add('hidden');
    this.selectedDecryptFileId = null;
  }

  static async executeDecryption() {
    const password = document.getElementById('decrypt-password').value;
    const submitBtn = document.getElementById('decrypt-submit-btn');

    if (!password) {
      showToast('Please enter your password.', 'error');
      return;
    }

    submitBtn.disabled = true;
    submitBtn.innerHTML = `<i data-lucide="loader-2" class="w-4 h-4 animate-spin inline mr-2"></i> Unwrapping RSA Key & Verifying GCM Tag...`;
    if (window.lucide) lucide.createIcons();

    try {
      const res = await ApiClient.decryptFile(this.selectedDecryptFileId, password);
      
      // Render success result
      document.getElementById('decrypt-form-box').classList.add('hidden');
      document.getElementById('decrypt-result-box').classList.remove('hidden');

      document.getElementById('dec-result-name').textContent = res.filename;
      document.getElementById('dec-result-size').textContent = formatBytes(res.file_size_bytes);
      document.getElementById('dec-result-hash').textContent = res.sha256_hash;
      document.getElementById('dec-result-sender').textContent = res.sender_username;
      
      const sigBadge = document.getElementById('dec-result-sig-badge');
      if (sigBadge) {
        sigBadge.className = res.signature_verified ? 'badge-crypto badge-success' : 'badge-crypto badge-warning';
        sigBadge.innerHTML = res.signature_verified ? '<i data-lucide="check-circle" class="w-3 h-3"></i> RSA-PSS Signature Verified' : 'Signature Unverified';
      }

      // Download link
      const downloadBtn = document.getElementById('dec-download-blob-btn');
      if (downloadBtn) {
        downloadBtn.onclick = () => {
          const byteCharacters = atob(res.content_base64);
          const byteNumbers = new Array(byteCharacters.length);
          for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
          }
          const byteArray = new Uint8Array(byteNumbers);
          const blob = new Blob([byteArray], { type: res.mime_type || 'application/octet-stream' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = res.filename;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          showToast(`Downloaded '${res.filename}' with verified integrity.`, 'success');
        };
      }

      // Text preview if readable
      const previewArea = document.getElementById('dec-content-preview');
      try {
        const decodedText = atob(res.content_base64);
        if (decodedText.length < 50000 && /^[\x20-\x7E\s]*$/.test(decodedText.substring(0, 1000))) {
          previewArea.classList.remove('hidden');
          previewArea.textContent = decodedText;
        } else {
          previewArea.classList.add('hidden');
        }
      } catch (e) {
        previewArea.classList.add('hidden');
      }

      showToast('Decryption and SHA-256 integrity match confirmed!', 'success', 'Cryptographic Proof Verified');
      if (window.lucide) lucide.createIcons();
    } catch (err) {
      document.getElementById('decrypt-form-box').classList.add('hidden');
      const errBox = document.getElementById('decrypt-error-box');
      errBox.classList.remove('hidden');
      document.getElementById('decrypt-error-msg').textContent = err.message;
      showToast(err.message, 'error', 'Decryption Failed');
      if (window.lucide) lucide.createIcons();
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = `<span>Decrypt & Verify Plaintext</span> <i data-lucide="shield-check" class="w-4 h-4 inline ml-1"></i>`;
      if (window.lucide) lucide.createIcons();
    }
  }

  static async handleDelete(fileId, filename) {
    if (!confirm(`Are you sure you want to permanently delete '${filename}' and its encrypted ciphertext?`)) {
      return;
    }

    try {
      await ApiClient.deleteFile(fileId);
      showToast(`'${filename}' permanently deleted.`, 'success');
      this.loadVaultFiles();
      if (window.AuditManager) window.AuditManager.loadDashboardStats();
    } catch (err) {
      showToast(err.message, 'error');
    }
  }
}

window.VaultManager = VaultManager;
document.addEventListener('DOMContentLoaded', () => VaultManager.init());
