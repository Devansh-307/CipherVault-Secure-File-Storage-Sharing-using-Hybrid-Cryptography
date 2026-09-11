import React, { useState } from 'react';
import { 
  ShieldCheck, 
  ArrowRight, 
  Zap, 
  Loader2, 
  KeyRound, 
  ArrowLeft,
  Send,
  Lock
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { ApiService } from '../services/api';

export const AuthModal = () => {
  // Mode: 'login' | 'register' | 'forgot_password'
  const [authMode, setAuthMode] = useState('login');
  const [loading, setLoading] = useState(false);
  const [otpSending, setOtpSending] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpDebugCode, setOtpDebugCode] = useState('');
  const { login, register } = useAuth();
  const { showToast } = useToast();

  // Login form state
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Register form state (clean direct registration without mandatory email OTP)
  const [regUsername, setRegUsername] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regFullName, setRegFullName] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regRole, setRegRole] = useState('user');

  // Forgot Master Key form state
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotOtp, setForgotOtp] = useState('');
  const [forgotNewPassword, setForgotNewPassword] = useState('');
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState('');

  // --- Handlers ---

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

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    if (!regUsername || !regEmail || !regPassword) {
      showToast('Please fill in all required fields.', 'error');
      return;
    }
    if (regPassword.length < 6) {
      showToast('Master password must be at least 6 characters.', 'error');
      return;
    }
    setLoading(true);
    try {
      await register({
        username: regUsername.trim(),
        email: regEmail.trim(),
        full_name: regFullName.trim() || undefined,
        password: regPassword,
        role: regRole,
      });
      showToast('Account created and 2048-bit RSA keypair initialized!', 'success', 'Identity Created');
    } catch (err) {
      showToast(err.message, 'error', 'Registration Error');
    } finally {
      setLoading(false);
    }
  };

  const handleSendForgotOtp = async () => {
    if (!forgotEmail || !forgotEmail.includes('@')) {
      showToast('Please enter your registered email address.', 'error');
      return;
    }
    setOtpSending(true);
    try {
      const res = await ApiService.sendOtp(forgotEmail.trim(), 'forgot_password');
      setOtpSent(true);
      if (res.otp_code) {
        setOtpDebugCode(res.otp_code);
        setForgotOtp(res.otp_code); // Auto-fill for testing/demo
      }
      showToast(`Verification code sent to ${forgotEmail}!`, 'success', 'OTP Dispatched');
    } catch (err) {
      showToast(err.message, 'error', 'Reset Code Failed');
    } finally {
      setOtpSending(false);
    }
  };

  const handleForgotPasswordSubmit = async (e) => {
    e.preventDefault();
    if (!forgotOtp || forgotOtp.length !== 6) {
      showToast('Please enter the 6-digit verification code sent to your email.', 'error');
      return;
    }
    if (forgotNewPassword.length < 6) {
      showToast('New master password must be at least 6 characters.', 'error');
      return;
    }
    if (forgotNewPassword !== forgotConfirmPassword) {
      showToast('Passwords do not match.', 'error');
      return;
    }

    setLoading(true);
    try {
      await ApiService.forgotPassword(forgotEmail.trim(), forgotOtp.trim(), forgotNewPassword);
      showToast('Master key successfully reset! You can now log in.', 'success', 'Master Key Updated');
      setAuthMode('login');
      setLoginUsername(forgotEmail.trim());
      setLoginPassword('');
      setOtpSent(false);
      setOtpDebugCode('');
    } catch (err) {
      showToast(err.message, 'error', 'Reset Failed');
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (mode) => {
    setAuthMode(mode);
    setOtpSent(false);
    setOtpDebugCode('');
  };

  return (
    <div className="fixed inset-0 bg-[#030712]/90 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="glass-panel glass-panel-glow w-full max-w-md p-8 relative border border-sky-500/30 bg-[#0d121d]/95">
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-sky-500/10 border border-sky-500/30 text-sky-400 mb-3 shadow-lg shadow-sky-500/10">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-slate-100 tracking-tight">CipherVault</h2>
          <p className="text-xs text-slate-400 mt-1">Hybrid Cryptography Storage System (AES-256-GCM + RSA-2048)</p>
          <div className="text-[11px] text-sky-400 mt-1 font-medium">Developed by Devansh Rathore</div>
        </div>

        {/* ---------------- 1. LOGIN MODE ---------------- */}
        {authMode === 'login' && (
          <>
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

            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Username or Email</label>
                <input
                  type="text"
                  required
                  value={loginUsername}
                  onChange={(e) => setLoginUsername(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-900/90 border border-slate-700 rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-400"
                  placeholder="e.g. devansh or user@company.com"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-medium text-slate-300">Master Password</label>
                  <button
                    type="button"
                    onClick={() => switchMode('forgot_password')}
                    className="text-[11px] text-sky-400 hover:underline hover:text-sky-300 font-medium"
                  >
                    Forgot Master Key?
                  </button>
                </div>
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
                  onClick={() => switchMode('register')}
                  className="text-sky-400 hover:underline font-semibold ml-1"
                >
                  Create Account & Keypair
                </button>
              </div>
            </form>
          </>
        )}

        {/* ---------------- 2. DIRECT REGISTRATION (No OTP roadblock) ---------------- */}
        {authMode === 'register' && (
          <form onSubmit={handleRegisterSubmit} className="space-y-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">Create Account & RSA Keypair</span>
              <button
                type="button"
                onClick={() => switchMode('login')}
                className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1"
              >
                <ArrowLeft className="w-3 h-3" /> Back
              </button>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Username</label>
              <input
                type="text"
                required
                value={regUsername}
                onChange={(e) => setRegUsername(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-100 focus:outline-none focus:border-sky-400"
                placeholder="e.g. devansh_security"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Full Name</label>
              <input
                type="text"
                value={regFullName}
                onChange={(e) => setRegFullName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-100 focus:outline-none focus:border-sky-400"
                placeholder="Devansh Rathore"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Registered Email</label>
              <input
                type="email"
                required
                value={regEmail}
                onChange={(e) => setRegEmail(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-100 focus:outline-none focus:border-sky-400"
                placeholder="devansh@ciphervault.io"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Master Password / Key</label>
              <input
                type="password"
                required
                value={regPassword}
                onChange={(e) => setRegPassword(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-100 focus:outline-none focus:border-sky-400"
                placeholder="Min 6 characters (Derives 100k PBKDF2 Envelope)"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Role</label>
              <select
                value={regRole}
                onChange={(e) => setRegRole(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-100 focus:outline-none focus:border-sky-400"
              >
                <option value="user">Standard User</option>
                <option value="admin">Administrator</option>
                <option value="auditor">Security Auditor</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 mt-2 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white text-xs font-semibold shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 transition disabled:opacity-60"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Generating 2048-bit RSA Keys & PBKDF2 Envelope...</span>
                </>
              ) : (
                <>
                  <span>Create Account & Initialize Keypair</span>
                  <ShieldCheck className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}

        {/* ---------------- 3. FORGOT MASTER KEY MODE (EMAIL OTP VERIFICATION) ---------------- */}
        {authMode === 'forgot_password' && (
          <form onSubmit={handleForgotPasswordSubmit} className="space-y-3.5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                <KeyRound className="w-4 h-4 text-sky-400" /> Reset Master Key
              </span>
              <button
                type="button"
                onClick={() => switchMode('login')}
                className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1"
              >
                <ArrowLeft className="w-3 h-3" /> Back
              </button>
            </div>

            <p className="text-[11px] text-slate-400 leading-relaxed">
              If you forgot your master key, enter your registered email address. We will send a secure 6-digit verification code to reset your master key and re-encrypt your key envelope.
            </p>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Registered Email Address</label>
              <div className="flex gap-2">
                <input
                  type="email"
                  required
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  className="flex-1 px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-100 focus:outline-none focus:border-sky-400"
                  placeholder="e.g. devansh@ciphervault.io"
                />
                <button
                  type="button"
                  onClick={handleSendForgotOtp}
                  disabled={otpSending}
                  className="px-3 py-2 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-500/30 text-xs font-medium flex items-center gap-1 transition whitespace-nowrap"
                >
                  {otpSending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  <span>{otpSent ? 'Resend Code' : 'Send Code'}</span>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                6-Digit Verification Code {otpSent && <span className="text-emerald-400 font-semibold">(Sent to email)</span>}
              </label>
              <input
                type="text"
                required
                maxLength={6}
                value={forgotOtp}
                onChange={(e) => setForgotOtp(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-100 font-mono tracking-widest text-center focus:outline-none focus:border-sky-400"
                placeholder="123456"
              />
              {otpDebugCode && (
                <div className="text-[10px] text-emerald-400 mt-1 flex items-center justify-between">
                  <span>Simulated OTP Delivery Code:</span>
                  <span className="font-mono font-bold bg-emerald-500/20 px-2 py-0.5 rounded border border-emerald-500/40">{otpDebugCode}</span>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">New Master Password / Key</label>
              <input
                type="password"
                required
                value={forgotNewPassword}
                onChange={(e) => setForgotNewPassword(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-100 focus:outline-none focus:border-sky-400"
                placeholder="Min 6 characters"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Confirm New Master Key</label>
              <input
                type="password"
                required
                value={forgotConfirmPassword}
                onChange={(e) => setForgotConfirmPassword(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-100 focus:outline-none focus:border-sky-400"
                placeholder="••••••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-lg bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white text-xs font-semibold shadow-lg shadow-sky-500/20 flex items-center justify-center gap-2 transition disabled:opacity-60"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Verifying Code & Re-encrypting Key Envelope...</span>
                </>
              ) : (
                <>
                  <span>Reset Master Key & Update Envelope</span>
                  <Lock className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
