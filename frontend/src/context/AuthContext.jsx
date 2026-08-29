import React, { createContext, useContext, useState, useEffect } from 'react';
import { ApiService } from '../services/api';
import { useToast } from './ToastContext';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const cached = localStorage.getItem('ciphervault_user');
    return cached ? JSON.parse(cached) : null;
  });
  const [loading, setLoading] = useState(true);
  const [masterPassword, setMasterPassword] = useState(() => {
    return sessionStorage.getItem('current_master_key') || '';
  });
  const { showToast } = useToast();

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
    showToast(`Welcome back, ${data.user.full_name || data.user.username}!`, 'success', 'Authenticated');
    return data.user;
  };

  const register = async (userData) => {
    const newUser = await ApiService.register(userData);
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
