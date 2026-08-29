// Security & Tamper Simulation Lab Manager

class TamperLabManager {
  static init() {
    this.setupEventListeners();
  }

  static setupEventListeners() {
    const runTamperBtn = document.getElementById('run-tamper-btn');
    if (runTamperBtn) {
      runTamperBtn.addEventListener('click', async () => this.executeTamperAttack());
    }

    const refreshSelectBtn = document.getElementById('refresh-tamper-files-btn');
    if (refreshSelectBtn) {
      refreshSelectBtn.addEventListener('click', () => this.populateFileSelect());
    }
  }

  static async populateFileSelect() {
    const selectEl = document.getElementById('tamper-file-select');
    if (!selectEl) return;

    try {
      const files = await ApiClient.listFiles();
      if (!files || files.length === 0) {
        selectEl.innerHTML = `<option value="">No files uploaded in vault yet</option>`;
        return;
      }

      selectEl.innerHTML = files.map((f) => `
        <option value="${f.id}">
          ${f.original_filename} (${formatBytes(f.file_size_bytes)}) ${f.is_tampered ? '[ALREADY TAMPERED]' : ''}
        </option>
      `).join('');
    } catch (err) {
      selectEl.innerHTML = `<option value="">Error loading files</option>`;
    }
  }

  static selectFileForTamper(fileId) {
    // Switch to Tamper Lab tab
    if (window.switchTab) window.switchTab('tamper-tab');
    setTimeout(() => {
      this.populateFileSelect().then(() => {
        const selectEl = document.getElementById('tamper-file-select');
        if (selectEl) selectEl.value = fileId;
      });
    }, 100);
  }

  static async executeTamperAttack() {
    const selectEl = document.getElementById('tamper-file-select');
    const modeEl = document.getElementById('tamper-mode-select');
    const statusBox = document.getElementById('tamper-simulation-output');
    const runBtn = document.getElementById('run-tamper-btn');

    const fileId = selectEl.value;
    const mode = modeEl.value;

    if (!fileId) {
      showToast('Please select a file to simulate tampering on.', 'error');
      return;
    }

    runBtn.disabled = true;
    runBtn.innerHTML = `<i data-lucide="loader-2" class="w-4 h-4 animate-spin inline mr-2"></i> Infiltrating Ciphertext Store...`;
    if (window.lucide) lucide.createIcons();

    try {
      const res = await ApiClient.tamperFile(fileId, mode);
      
      statusBox.classList.remove('hidden');
      statusBox.innerHTML = `
        <div class="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300">
          <div class="flex items-center gap-2 font-bold text-sm text-rose-400 mb-2">
            <i data-lucide="alert-triangle" class="w-5 h-5"></i>
            ATTACK INJECTION EXECUTED
          </div>
          <p class="text-xs leading-relaxed text-slate-300">
            ${res.message}
          </p>
          <div class="mt-4 pt-3 border-t border-rose-500/20 flex items-center justify-between">
            <span class="text-[11px] text-slate-400">Target File ID: <span class="mono text-rose-300">${res.file_id.substring(0, 8)}...</span></span>
            <button 
              class="px-3 py-1.5 rounded-lg bg-rose-500 hover:bg-rose-600 text-white text-xs font-semibold flex items-center gap-1.5 transition"
              onclick="VaultManager.openDecryptModal('${res.file_id}', 'Tampered File', true)"
            >
              <i data-lucide="shield-alert" class="w-3.5 h-3.5"></i> Test Decryption Failure Live
            </button>
          </div>
        </div>
      `;

      showToast('Ciphertext corrupted! Now attempt decryption to observe cryptographic rejection.', 'error', 'Tamper Injected');
      if (window.lucide) lucide.createIcons();
      if (window.VaultManager) window.VaultManager.loadVaultFiles();
      if (window.AuditManager) window.AuditManager.loadDashboardStats();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      runBtn.disabled = false;
      runBtn.innerHTML = `<span>Inject Malicious Bit-Flip</span> <i data-lucide="zap" class="w-4 h-4 inline ml-1"></i>`;
      if (window.lucide) lucide.createIcons();
    }
  }
}

window.TamperLabManager = TamperLabManager;
document.addEventListener('DOMContentLoaded', () => TamperLabManager.init());
