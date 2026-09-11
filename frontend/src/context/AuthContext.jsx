import React, { createContext, useContext, useState, useEffect } from 'react';
import { ApiService } from '../services/api';
import { useToast } from './ToastContext';

const AuthContext = createContext(null);

const DEFAULT_SAVED_ACCOUNTS = [
  { username: 'devansh', full_name: 'Devansh Rathore', role: 'admin', email: 'devansh@ciphervault.io', is_demo: true },
  { username: 'bob', full_name: 'Bob Vance', role: 'user', email: 'bob@ciphervault.io', is_demo: true },
  { username: 'charlie', full_name: 'Charlie Davis', role: 'user', email: 'charlie@ciphervault.io', is_demo: true },
  { username: 'auditor', full_name: 'Auditor General', role: 'auditor', email: 'auditor@ciphervault.io', is_demo: true },
];

const getInitialSavedAccounts = () => {
  try {
    const raw = localStorage.getItem('ciphervault_saved_accounts');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.warn('Failed to parse saved accounts:', e);
  }
  return DEFAULT_SAVED_ACCOUNTS;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const cached = localStorage.getItem('ciphervault_user');
      return cached && cached !== 'undefined' && cached !== 'null' ? JSON.parse(cached) : null;
    } catch (e) {
      console.warn('Failed to parse cached user:', e);
      localStorage.removeItem('ciphervault_user');
      return null;
    }
  });
  const [loading, setLoading] = useState(true);
  const [masterPassword, setMasterPassword] = useState(() => {
    return sessionStorage.getItem('current_master_key') || '';
  });
  const [savedAccounts, setSavedAccounts] = useState(getInitialSavedAccounts);
  const { showToast } = useToast();

  const persistAccountToHistory = (userData) => {
    try {
      const updatedAccount = {
        username: userData.username,
        full_name: userData.full_name || userData.username,
        email: userData.email || '',
        role: userData.role || 'user',
        last_login: new Date().toISOString(),
      };

      setSavedAccounts((prev) => {
        const filtered = prev.filter(
          (acc) => acc.username.toLowerCase() !== userData.username.toLowerCase()
        );
        const nextList = [updatedAccount, ...filtered].slice(0, 8);
        localStorage.setItem('ciphervault_saved_accounts', JSON.stringify(nextList));
        return nextList;
      });
    } catch (e) {
      console.warn('Error saving account to history:', e);
    }
  };

  const removeSavedAccount = (username) => {
    setSavedAccounts((prev) => {
      const nextList = prev.filter(
        (acc) => acc.username.toLowerCase() !== username.toLowerCase()
      );
      localStorage.setItem('ciphervault_saved_accounts', JSON.stringify(nextList));
      return nextList;
    });
    showToast(`Removed @${username} from saved accounts.`, 'info');
  };

  const clearAllSavedAccounts = () => {
    localStorage.removeItem('ciphervault_saved_accounts');
    localStorage.removeItem('ciphervault_token');
    localStorage.removeItem('ciphervault_user');
    sessionStorage.removeItem('current_master_key');
    setSavedAccounts(DEFAULT_SAVED_ACCOUNTS);
    setUser(null);
    setMasterPassword('');
    showToast('All saved login info and cached data have been erased.', 'info', 'Cache Cleared');
  };

  useEffect(() => {
    const handleUnauthorized = () => {
      setUser(null);
      setMasterPassword('');
      sessionStorage.removeItem('current_master_key');
      showToast('Session expired. Please log in again.', 'error');
    };

    window.addEventListener('ciphervault_unauthorized', handleUnauthorized);
    return () => window.removeEventListener('ciphervault_unauthorized', handleUnauthorized);
  }, [showToast]);

  useEffect(() => {
    const verifyUser = async () => {
      const token = ApiService.getToken();
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const profile = await ApiService.getMe();
        setUser(profile);
        localStorage.setItem('ciphervault_user', JSON.stringify(profile));
        persistAccountToHistory(profile);
      } catch (err) {
        console.warn('Session verification failed:', err);
        ApiService.clearToken();
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    verifyUser();
  }, []);

  const login = async (username, password) => {
    const data = await ApiService.login({ username, password });
    ApiService.setToken(data.access_token);
    setUser(data.user);
    localStorage.setItem('ciphervault_user', JSON.stringify(data.user));
    setMasterPassword(password);
    sessionStorage.setItem('current_master_key', password);
    persistAccountToHistory(data.user);
    showToast(`Welcome back, ${data.user.full_name || data.user.username}!`, 'success', 'Authenticated');
    return data.user;
  };

  const register = async (userData) => {
    const newUser = await ApiService.register(userData);
    persistAccountToHistory(newUser);
    showToast('2048-bit RSA keypair generated & secured with PBKDF2!', 'success', 'Identity Initialized');
    // Auto-login with the newly created password
    return await login(userData.username, userData.password);
  };

  const logout = () => {
    ApiService.clearToken();
    setUser(null);
    setMasterPassword('');
    sessionStorage.removeItem('current_master_key');
    showToast('Logged out safely. Session terminated.', 'info');
  };

  const saveCachedPassword = (pwd) => {
    setMasterPassword(pwd);
    sessionStorage.setItem('current_master_key', pwd);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        masterPassword,
        savedAccounts,
        removeSavedAccount,
        clearAllSavedAccounts,
        saveCachedPassword,
        login,
        register,
        logout,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
