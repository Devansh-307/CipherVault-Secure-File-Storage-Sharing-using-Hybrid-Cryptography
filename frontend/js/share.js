// Dynamic File Sharing and Access Control Management

class ShareManager {
  static init() {
    this.setupEventListeners();
  }

  static setupEventListeners() {
    // Share modal close
    const closeShareBtn = document.getElementById('close-share-modal-btn');
    if (closeShareBtn) closeShareBtn.addEventListener('click', () => this.closeShareModal());

    // Share form submit
    const shareForm = document.getElementById('share-file-form');
    if (shareForm) {
      shareForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        await this.handleShareSubmit();
      });
    }

    // Refresh Shared With Me
    const refreshBtn = document.getElementById('refresh-shared-btn');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => this.loadSharedFiles());
    }
  }

  static selectedShareFileId = null;

  static async openShareModal(fileId, filename) {
    this.selectedShareFileId = fileId;
    document.getElementById('share-modal-filename').textContent = filename;
    document.getElementById('share-modal').classList.remove('hidden');

    const passInput = document.getElementById('share-owner-password');
    const cachedKey = sessionStorage.getItem('current_master_key');
    if (cachedKey && passInput) passInput.value = cachedKey;

    await this.loadRecipientsList();
    await this.loadActiveSharesList(fileId);
  }

  static closeShareModal() {
    document.getElementById('share-modal').classList.add('hidden');
    document.getElementById('share-file-form').reset();
    this.selectedShareFileId = null;
  }

  static async loadRecipientsList() {
    const container = document.getElementById('share-recipients-checkboxes');
    if (!container) return;

    try {
      const users = await ApiClient.listUsers();
      if (!users || users.length === 0) {
        container.innerHTML = `<div class="text-xs text-slate-500">No other registered users found to share with.</div>`;
        return;
      }

      container.innerHTML = users.map((u) => `
        <label class="flex items-center gap-2 text-xs text-slate-300 p-2.5 rounded-lg bg-slate-900/80 border border-slate-800 hover:border-indigo-500/40 cursor-pointer">
          <input type="checkbox" name="share-user-recipient" value="${u.username}" class="rounded bg-slate-800 text-indigo-500 focus:ring-0">
          <div>
            <div class="font-semibold text-slate-200">${u.full_name || u.username} (@${u.username})</div>
            <div class="text-[10px] text-slate-500 mono truncate max-w-[280px]">Pubkey: ${u.public_key.substring(27, 60)}...</div>
          </div>
        </label>
      `).join('');
    } catch (err) {
      container.innerHTML = `<div class="text-xs text-slate-500">Error loading users.</div>`;
    }
  }

  static async loadActiveSharesList(fileId) {
    const container = document.getElementById('file-active-shares-list');
    if (!container) return;

    container.innerHTML = `<div class="text-xs text-slate-500 py-2">Loading active access grants...</div>`;

    try {
      const shares = await ApiClient.listFileShares(fileId);
      if (!shares || shares.length === 0) {
        container.innerHTML = `<div class="text-xs text-slate-500 italic">No access grants created yet for this file.</div>`;
        return;
      }

      container.innerHTML = shares.map((s) => {
        const isRevoked = s.is_revoked;
        return `
          <div class="flex items-center justify-between p-2.5 rounded-lg bg-slate-900/60 border ${isRevoked ? 'border-rose-900/40 opacity-60' : 'border-slate-800'}">
            <div>
              <div class="text-xs font-semibold text-slate-200 flex items-center gap-2">
                ${s.recipient_username}
                ${isRevoked ? '<span class="badge-crypto badge-danger text-[10px]">Revoked</span>' : '<span class="badge-crypto badge-success text-[10px]">Active</span>'}
              </div>
              <div class="text-[11px] text-slate-500">
                Expires: ${s.expires_at ? new Date(s.expires_at).toLocaleString() : 'Never'}
              </div>
            </div>
            ${!isRevoked ? `
              <button 
                class="px-2.5 py-1 text-xs rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 transition"
                onclick="ShareManager.handleRevokeShare('${s.id}')"
              >
                Revoke Access
              </button>
            ` : ''}
          </div>
        `;
      }).join('');
    } catch (err) {
      container.innerHTML = `<div class="text-xs text-slate-500">Error loading shares: ${err.message}</div>`;
    }
  }

  static async handleShareSubmit() {
    const password = document.getElementById('share-owner-password').value;
    const expiryHours = document.getElementById('share-expiry-select').value;
    const submitBtn = document.getElementById('share-submit-btn');

    const selectedRecipients = Array.from(
      document.querySelectorAll('input[name="share-user-recipient"]:checked')
    ).map(cb => cb.value);

    if (selectedRecipients.length === 0) {
      showToast('Please select at least one recipient user.', 'error');
      return;
    }

    if (!password) {
      showToast('Please enter your password to unwrap and re-encrypt the AES session key.', 'error');
      return;
    }

    submitBtn.disabled = true;
    submitBtn.innerHTML = `<i data-lucide="loader-2" class="w-4 h-4 animate-spin inline mr-2"></i> Encapsulating Session Key with Recipients' RSA Public Keys...`;
    if (window.lucide) lucide.createIcons();

    try {
      await ApiClient.shareFile(
        this.selectedShareFileId,
        selectedRecipients,
        password,
        'download',
        expiryHours ? parseInt(expiryHours) : null
      );
      showToast(`Encrypted key generated for ${selectedRecipients.join(', ')}!`, 'success', 'File Shared Securely');
      this.closeShareModal();
      if (window.AuditManager) window.AuditManager.loadDashboardStats();
    } catch (err) {
      showToast(err.message, 'error', 'Sharing Failed');
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = `<span>Generate Encrypted Share Grants</span> <i data-lucide="shield-check" class="w-4 h-4 inline ml-1"></i>`;
      if (window.lucide) lucide.createIcons();
    }
  }

  static async handleRevokeShare(shareId) {
    if (!confirm('Are you sure you want to dynamically revoke this recipient\'s decryption access?')) {
      return;
    }

    try {
      await ApiClient.revokeShare(shareId);
      showToast('Access permission immediately revoked.', 'success');
      if (this.selectedShareFileId) {
        this.loadActiveSharesList(this.selectedShareFileId);
      }
      if (window.AuditManager) window.AuditManager.loadDashboardStats();
    } catch (err) {
      showToast(err.message, 'error');
    }
  }

  static async loadSharedFiles() {
    const listContainer = document.getElementById('shared-files-list');
    if (!listContainer) return;

    listContainer.innerHTML = `
      <tr>
        <td colspan="6" class="text-center py-8 text-slate-400">
          <i data-lucide="loader-2" class="w-6 h-6 animate-spin inline mb-2 text-indigo-400"></i>
          <div>Loading files shared with you...</div>
        </td>
      </tr>
    `;
    if (window.lucide) lucide.createIcons();

    try {
      const files = await ApiClient.listSharedWithMe();
      this.renderSharedFilesList(files);
    } catch (err) {
      listContainer.innerHTML = `
        <tr>
          <td colspan="6" class="text-center py-8 text-rose-400">
            <div>Error: ${err.message}</div>
          </td>
        </tr>
      `;
    }
  }

  static renderSharedFilesList(files) {
    const listContainer = document.getElementById('shared-files-list');
    const countBadge = document.getElementById('shared-files-count');
    if (countBadge) countBadge.textContent = `${files.length} Shared Files`;

    if (!files || files.length === 0) {
      listContainer.innerHTML = `
        <tr>
          <td colspan="6" class="text-center py-12 text-slate-500">
            <i data-lucide="share-2" class="w-12 h-12 inline mb-3 text-slate-600"></i>
            <div class="text-base font-medium text-slate-400">No Shared Files Found</div>
            <div class="text-xs text-slate-500 mt-1">When other users share encrypted files with your RSA public key, they will appear here.</div>
          </td>
        </tr>
      `;
      if (window.lucide) lucide.createIcons();
      return;
    }

    listContainer.innerHTML = files.map((file) => {
      const isExpired = file.is_expired;
      const isTampered = file.is_tampered;
      return `
        <tr class="border-b border-slate-800/60 hover:bg-slate-800/30 transition duration-150">
          <td class="py-4 px-4">
            <div class="flex items-center gap-3">
              <div class="p-2.5 rounded-lg bg-indigo-500/10 border border-indigo-500/30 text-indigo-400">
                <i data-lucide="file-check" class="w-5 h-5"></i>
              </div>
              <div>
                <div class="font-semibold text-slate-200 text-sm flex items-center gap-2">
                  ${file.filename}
                  ${isTampered ? `<span class="badge-crypto badge-danger text-[10px]">Tampered</span>` : ''}
                  ${isExpired ? `<span class="badge-crypto badge-warning text-[10px]">Expired</span>` : ''}
                </div>
                <div class="text-xs text-slate-500 mono truncate max-w-[200px]" title="${file.file_hash}">
                  SHA-256: ${file.file_hash.substring(0, 16)}...
                </div>
              </div>
            </div>
          </td>
          <td class="py-4 px-4 text-xs text-slate-300">
            <div class="font-medium text-slate-200 flex items-center gap-1.5">
              <i data-lucide="user-check" class="w-3.5 h-3.5 text-indigo-400"></i>
              @${file.sender_username}
            </div>
          </td>
          <td class="py-4 px-4 text-xs text-slate-300">
            ${formatBytes(file.file_size_bytes)}
          </td>
          <td class="py-4 px-4 text-xs">
            ${file.expires_at ? `
              <span class="${isExpired ? 'text-rose-400' : 'text-amber-400'}">
                ${new Date(file.expires_at).toLocaleString()}
              </span>
            ` : '<span class="text-slate-500">Permanent</span>'}
          </td>
          <td class="py-4 px-4 text-right">
            <button 
              class="px-3 py-1.5 rounded-lg ${isExpired ? 'bg-slate-800 text-slate-500 cursor-not-allowed' : 'bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'} text-xs font-medium flex items-center gap-1.5 transition ml-auto"
              ${isExpired ? 'disabled' : ''}
              onclick="VaultManager.openDecryptModal('${file.file_id}', '${file.filename}', false)"
            >
              <i data-lucide="key" class="w-3.5 h-3.5"></i> Decrypt with My Key
            </button>
          </td>
        </tr>
      `;
    }).join('');

    if (window.lucide) lucide.createIcons();
  }
}

window.ShareManager = ShareManager;
document.addEventListener('DOMContentLoaded', () => ShareManager.init());
