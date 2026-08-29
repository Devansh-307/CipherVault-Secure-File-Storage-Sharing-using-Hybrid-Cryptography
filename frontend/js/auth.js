// Authentication and User State Management

class AuthManager {
  static init() {
    this.setupEventListeners();
    this.checkSession();
  }

  static setupEventListeners() {
    // Login form
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
      loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('login-username').value.trim();
        const password = document.getElementById('login-password').value;
        await this.handleLogin(username, password);
      });
    }

    // Register form
    const registerForm = document.getElementById('register-form');
    if (registerForm) {
      registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('reg-username').value.trim();
        const email = document.getElementById('reg-email').value.trim();
        const fullName = document.getElementById('reg-fullname').value.trim();
        const password = document.getElementById('reg-password').value;
        const role = document.getElementById('reg-role').value;
        await this.handleRegister({ username, email, full_name: fullName, password, role });
      });
    }

    // Quick Demo Logins
    document.querySelectorAll('.demo-login-btn').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        const username = btn.getAttribute('data-user');
        await this.handleLogin(username, 'Password123!');
      });
    });

    // Logout
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => this.handleLogout());
    }

    // Toggle between login and register views
    const showRegLink = document.getElementById('show-register-link');
    const showLoginLink = document.getElementById('show-login-link');
    if (showRegLink) {
      showRegLink.addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById('login-box').classList.add('hidden');
        document.getElementById('register-box').classList.remove('hidden');
      });
    }
    if (showLoginLink) {
      showLoginLink.addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById('register-box').classList.add('hidden');
        document.getElementById('login-box').classList.remove('hidden');
      });
    }
  }

  static async checkSession() {
    const token = ApiClient.getToken();
    if (!token) {
      this.showAuthModal();
      return;
    }

    try {
      const user = await ApiClient.getMe();
      ApiClient.setCurrentUser(user);
      this.renderAuthenticatedUI(user);
      // Load initial tab data
      if (window.VaultManager) window.VaultManager.loadVaultFiles();
      if (window.AuditManager) window.AuditManager.loadDashboardStats();
    } catch (err) {
      console.warn('Session verification failed:', err);
      this.showAuthModal();
    }
  }

  static async handleLogin(username, password) {
    const submitBtn = document.getElementById('login-submit-btn');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = `<i data-lucide="loader-2" class="w-4 h-4 animate-spin inline mr-2"></i> Authenticating...`;
      if (window.lucide) lucide.createIcons();
    }

    try {
      const res = await ApiClient.login({ username, password });
      ApiClient.setToken(res.access_token);
      ApiClient.setCurrentUser(res.user);
      showToast(`Welcome back, ${res.user.full_name || res.user.username}!`, 'success', 'Authentication Successful');
      this.hideAuthModal();
      this.renderAuthenticatedUI(res.user);

      // Save password in session memory for seamless decryption helper (or prompt user)
      sessionStorage.setItem('current_master_key', password);

      // Refresh data
      if (window.VaultManager) window.VaultManager.loadVaultFiles();
      if (window.ShareManager) window.ShareManager.loadSharedFiles();
      if (window.AuditManager) window.AuditManager.loadDashboardStats();
    } catch (err) {
      showToast(err.message, 'error', 'Login Failed');
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = `<span>Access Encrypted Vault</span> <i data-lucide="arrow-right" class="w-4 h-4 inline ml-1"></i>`;
        if (window.lucide) lucide.createIcons();
      }
    }
  }

  static async handleRegister(userData) {
    const submitBtn = document.getElementById('reg-submit-btn');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = `<i data-lucide="loader-2" class="w-4 h-4 animate-spin inline mr-2"></i> Generating RSA Keys & Wrapping Envelope...`;
      if (window.lucide) lucide.createIcons();
    }

    try {
      const user = await ApiClient.register(userData);
      showToast(`2048-bit RSA keypair generated and secured with PBKDF2!`, 'success', 'Account Initialized');
      // Auto login
      await this.handleLogin(userData.username, userData.password);
    } catch (err) {
      showToast(err.message, 'error', 'Registration Error');
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = `<span>Initialize Account & RSA Keys</span> <i data-lucide="shield-check" class="w-4 h-4 inline ml-1"></i>`;
        if (window.lucide) lucide.createIcons();
      }
    }
  }

  static handleLogout() {
    ApiClient.clearToken();
    sessionStorage.removeItem('current_master_key');
    showToast('You have been safely logged out.', 'info', 'Session Terminated');
    this.showAuthModal();
  }

  static showAuthModal() {
    document.getElementById('auth-modal').classList.remove('hidden');
    document.getElementById('app-container').classList.add('opacity-10', 'pointer-events-none');
  }

  static hideAuthModal() {
    document.getElementById('auth-modal').classList.add('hidden');
    document.getElementById('app-container').classList.remove('opacity-10', 'pointer-events-none');
  }

  static renderAuthenticatedUI(user) {
    const usernameEl = document.getElementById('nav-username');
    const roleEl = document.getElementById('nav-role');
    const avatarEl = document.getElementById('nav-avatar');

    if (usernameEl) usernameEl.textContent = user.full_name || user.username;
    if (roleEl) roleEl.textContent = user.role.toUpperCase();
    if (avatarEl) avatarEl.textContent = (user.username || 'U').substring(0, 2).toUpperCase();

    // Populate key inspector
    const pubKeyPreview = document.getElementById('profile-pubkey-preview');
    if (pubKeyPreview) {
      pubKeyPreview.textContent = user.public_key || 'No Public Key Found';
    }
  }
}

window.AuthManager = AuthManager;
document.addEventListener('DOMContentLoaded', () => AuthManager.init());
