import React, { useState } from 'react';
import { ShieldCheck, ArrowRight, Zap, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export const AuthModal = () => {
  const [isRegister, setIsRegister] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login, register } = useAuth();
  const { showToast } = useToast();

  // Login form state
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Register form state
  const [regUsername, setRegUsername] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regFullName, setRegFullName] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regRole, setRegRole] = useState('user');

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(loginUsername.trim(), loginPassword);
    } catch (err) {
      showToast(err.message, 'error', 'Login Failed');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await register({
        username: regUsername.trim(),
        email: regEmail.trim(),
        full_name: regFullName.trim() || undefined,
        password: regPassword,
        role: regRole,
      });
    } catch (err) {
      showToast(err.message, 'error', 'Registration Error');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async (username) => {
    setLoading(true);
    try {
      await login(username, 'Password123!');
    } catch (err) {
      showToast(err.message, 'error', 'Demo Login Failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-[#030712]/90 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="glass-panel glass-panel-glow w-full max-w-md p-8 relative border border-sky-500/30 bg-[#0d121d]/95">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-sky-500/10 border border-sky-500/30 text-sky-400 mb-3 shadow-lg shadow-sky-500/10">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-slate-100 tracking-tight">CipherVault</h2>
          <p className="text-xs text-slate-400 mt-1">Hybrid Cryptography Storage System (AES-256-GCM + RSA-2048)</p>
          <div className="text-[11px] text-sky-400 mt-1 font-medium">Developed by Devansh Rathore</div>
        </div>

        {/* Quick Demo Logins */}
        <div className="mb-6 p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-amber-400" /> Instant 1-Click Demo Accounts
          </div>
          <div className="grid grid-cols-2 gap-2">
            {[
              { name: 'Devansh (Admin)', user: 'devansh', color: 'text-sky-400 bg-sky-500/10 border-sky-500/30' },
              { name: 'Bob (User)', user: 'bob', color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/30' },
              { name: 'Charlie (User)', user: 'charlie', color: 'text-purple-400 bg-purple-500/10 border-purple-500/30' },
              { name: 'Auditor', user: 'auditor', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' },
            ].map((acc) => (
              <button
                key={acc.user}
                type="button"
                onClick={() => handleDemoLogin(acc.user)}
                disabled={loading}
                className={`px-2.5 py-1.5 rounded-lg border text-xs font-medium flex items-center justify-between hover:opacity-80 transition disabled:opacity-50 ${acc.color}`}
              >
                <span>{acc.name}</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            ))}
          </div>
        </div>

        {!isRegister ? (
          /* Login View */
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Username</label>
              <input
                type="text"
                required
                value={loginUsername}
                onChange={(e) => setLoginUsername(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-900/90 border border-slate-700 rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-400"
                placeholder="e.g. devansh"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Master Password</label>
              <input
                type="password"
                required
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-900/90 border border-slate-700 rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-400"
                placeholder="••••••••••••"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-lg bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white text-sm font-semibold shadow-lg shadow-sky-500/20 flex items-center justify-center gap-2 transition disabled:opacity-60"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  <span>Access Encrypted Vault</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
            <div className="text-center mt-4 text-xs text-slate-400">
              Need a new cryptographic identity?{' '}
              <button
                type="button"
                onClick={() => setIsRegister(true)}
                className="text-sky-400 hover:underline font-semibold ml-1"
              >
                Create Account & Keypair
              </button>
            </div>
          </form>
        ) : (
          /* Register View */
          <form onSubmit={handleRegisterSubmit} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Username</label>
              <input
                type="text"
                required
                value={regUsername}
                onChange={(e) => setRegUsername(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-100 focus:outline-none focus:border-sky-400"
                placeholder="e.g. devansh"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Email</label>
              <input
                type="email"
                required
                value={regEmail}
                onChange={(e) => setRegEmail(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-100 focus:outline-none focus:border-sky-400"
                placeholder="devansh@ciphervault.io"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Full Name</label>
              <input
                type="text"
                value={regFullName}
                onChange={(e) => setRegFullName(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-100 focus:outline-none focus:border-sky-400"
                placeholder="Devansh Rathore"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Master Password</label>
              <input
                type="password"
                required
                value={regPassword}
                onChange={(e) => setRegPassword(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-100 focus:outline-none focus:border-sky-400"
                placeholder="Min 6 characters"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Role</label>
              <select
                value={regRole}
                onChange={(e) => setRegRole(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-100 focus:outline-none focus:border-sky-400"
              >
                <option value="user">Standard User</option>
                <option value="admin">Administrator</option>
                <option value="auditor">Security Auditor</option>
              </select>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white text-xs font-semibold shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 transition disabled:opacity-60"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Generating 2048-bit RSA Keys...</span>
                </>
              ) : (
                <>
                  <span>Initialize Account & RSA Keys</span>
                  <ShieldCheck className="w-4 h-4" />
                </>
              )}
            </button>
            <div className="text-center mt-3 text-xs text-slate-400">
              Already registered?{' '}
              <button
                type="button"
                onClick={() => setIsRegister(false)}
                className="text-sky-400 hover:underline font-semibold ml-1"
              >
                Back to Login
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
