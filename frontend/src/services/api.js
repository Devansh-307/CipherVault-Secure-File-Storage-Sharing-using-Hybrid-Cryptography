// Centralized API Client

const API_BASE = '/api';

export const formatBytes = (bytes, decimals = 2) => {
  if (!bytes || bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

export class ApiService {
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
        window.dispatchEvent(new Event('ciphervault_unauthorized'));
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

  // Sharing endpoints
  static shareFile(fileId, recipientUsernames, password, permission = 'download', expiresInHours = null) {
    return this.request('/shares', {
      method: 'POST',
      body: {
        file_id: fileId,
        recipient_usernames: recipientUsernames,
        password,
        permission,
        expires_in_hours: expiresInHours ? parseInt(expiresInHours, 10) : null,
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
