// API Client and Utility Helper for CipherVault

const API_BASE = '/api';

class ApiClient {
  static getToken() {
    return localStorage.getItem('ciphervault_token');
  }

  static setToken(token) {
    localStorage.setItem('ciphervault_token', token);
  }

  static clearToken() {
    localStorage.removeItem('ciphervault_token');
    localStorage.removeItem('ciphervault_user');
  }

  static getCurrentUser() {
    const userStr = localStorage.getItem('ciphervault_user');
    return userStr ? JSON.parse(userStr) : null;
  }

  static setCurrentUser(user) {
    localStorage.setItem('ciphervault_user', JSON.stringify(user));
  }

  static async request(endpoint, options = {}) {
    const token = this.getToken();
    const headers = {
      ...(options.headers || {}),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    if (!(options.body instanceof FormData) && options.body && typeof options.body === 'object') {
      headers['Content-Type'] = 'application/json';
      options.body = JSON.stringify(options.body);
    }

    try {
      const response = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers,
      });

      if (response.status === 401 && !endpoint.includes('/auth/login') && !endpoint.includes('/auth/register')) {
        this.clearToken();
        window.location.reload();
        throw new Error('Session expired. Please log in again.');
      }

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        const errorMsg = data.detail || data.message || `Request failed with status ${response.status}`;
        throw new Error(errorMsg);
      }

      return data;
    } catch (err) {
      console.error(`API Error on ${endpoint}:`, err);
      throw err;
    }
  }

  // Auth endpoints
  static register(userData) {
    return this.request('/auth/register', { method: 'POST', body: userData });
  }

  static login(credentials) {
    return this.request('/auth/login', { method: 'POST', body: credentials });
  }

  static getMe() {
    return this.request('/auth/me');
  }

  static listUsers() {
    return this.request('/auth/users');
  }

  // File endpoints
  static uploadFile(formData) {
    return this.request('/files/upload', { method: 'POST', body: formData });
  }

  static listFiles() {
    return this.request('/files');
  }

  static getFileDetails(fileId) {
    return this.request(`/files/${fileId}`);
  }

  static decryptFile(fileId, password) {
    return this.request(`/files/${fileId}/decrypt`, { method: 'POST', body: { password } });
  }

  static tamperFile(fileId, tamperMode = 'flip_byte') {
    return this.request(`/files/${fileId}/tamper`, { method: 'POST', body: { file_id: fileId, tamper_mode: tamperMode } });
  }

  static deleteFile(fileId) {
    return this.request(`/files/${fileId}`, { method: 'DELETE' });
  }

  // Share endpoints
  static shareFile(fileId, recipientUsernames, password, permission = 'download', expiresInHours = null) {
    return this.request('/shares', {
      method: 'POST',
      body: {
        file_id: fileId,
        recipient_usernames: recipientUsernames,
        password,
        permission,
        expires_in_hours: expiresInHours ? parseInt(expiresInHours) : null,
      },
    });
  }

  static listSharedWithMe() {
    return this.request('/shares/shared-with-me');
  }

  static listFileShares(fileId) {
    return this.request(`/shares/file/${fileId}`);
  }

  static revokeShare(shareId) {
    return this.request(`/shares/${shareId}/revoke`, { method: 'POST' });
  }

  // Security & SIEM
  static getSecurityStats() {
    return this.request('/security/stats');
  }

  static getAuditLogs(limit = 50, action = null, status = null) {
    let url = `/security/audit-logs?limit=${limit}`;
    if (action) url += `&action=${encodeURIComponent(action)}`;
    if (status) url += `&status=${encodeURIComponent(status)}`;
    return this.request(url);
  }

  // Benchmark
  static runBenchmark(fileSizeKb = 1024) {
    return this.request('/benchmark/run', { method: 'POST', body: { file_size_kb: fileSizeKb } });
  }
}

// Toast notification helper
function showToast(message, type = 'info', title = null) {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast ${type === 'error' ? 'border-rose-500/50 bg-slate-900' : type === 'success' ? 'border-emerald-500/50 bg-slate-900' : 'border-sky-500/50 bg-slate-900'}`;

  const iconName = type === 'error' ? 'alert-triangle' : type === 'success' ? 'check-circle' : 'info';
  const iconColor = type === 'error' ? 'text-rose-400' : type === 'success' ? 'text-emerald-400' : 'text-sky-400';

  toast.innerHTML = `
    <i data-lucide="${iconName}" class="${iconColor} w-5 h-5 flex-shrink-0 mt-0.5"></i>
    <div class="flex-1">
      ${title ? `<div class="font-semibold text-sm text-slate-200">${title}</div>` : ''}
      <div class="text-xs text-slate-300">${message}</div>
    </div>
    <button class="text-slate-500 hover:text-slate-300 ml-2" onclick="this.parentElement.remove()">
      <i data-lucide="x" class="w-4 h-4"></i>
    </button>
  `;

  container.appendChild(toast);
  if (window.lucide) lucide.createIcons();

  setTimeout(() => {
    if (toast.parentElement) {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }
  }, 4500);
}

// Format bytes helper
function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}
