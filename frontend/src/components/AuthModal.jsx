import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  ArrowRight, 
  Zap, 
  Loader2, 
  KeyRound, 
  ArrowLeft,
  Send,
  Lock,
  Eye,
  EyeOff,
  User as UserIcon,
  Mail,
  CheckCircle2,
  FileCheck2,
  Sparkles,
  Layers,
  ChevronRight,
  X,
  History,
  Shield,
  Fingerprint
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { ApiService } from '../services/api';

export const AuthModal = () => {
  // Modes: 'login' | 'register' | 'forgot_password'
  const [authMode, setAuthMode] = useState('login');
  const [loading, setLoading] = useState(false);
  // Independent eye-toggle password visibility states
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [showForgotNewPassword, setShowForgotNewPassword] = useState(false);
  const [showForgotConfirmPassword, setShowForgotConfirmPassword] = useState(false);

  // Left showcase carousel slide index (0 to 3)
  const [showcaseSlide, setShowcaseSlide] = useState(0);

  // OTP state for password recovery
  const [otpSending, setOtpSending] = useState(false);
  const [otpSent, setOtpSent] = useState(false);

  const { login, register, savedAccounts, removeSavedAccount, clearAllSavedAccounts } = useAuth();
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

  // Forgot Master Key form state
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotOtp, setForgotOtp] = useState('');
  const [forgotNewPassword, setForgotNewPassword] = useState('');
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState('');

  // Auto-advance showcase slide every 5 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setShowcaseSlide((prev) => (prev + 1) % 4);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  // --- Handlers ---

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    if (!loginUsername || !loginPassword) {
      showToast('Please enter both your username and master password.', 'error');
      return;
    }
    setLoading(true);
    try {
      await login(loginUsername.trim(), loginPassword);
    } catch (err) {
      showToast(err.message || 'Invalid credentials. Please verify username and master key.', 'error', 'Login Failed');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickSelectAccount = (acc) => {
    setLoginUsername(acc.username);
    // If demo account with standard password, pre-fill password for 1-click ease
    if (acc.is_demo || acc.username === 'devansh' || acc.username === 'bob' || acc.username === 'charlie' || acc.username === 'auditor') {
      setLoginPassword('Password123!');
    } else {
      setLoginPassword('');
    }
    setAuthMode('login');
  };

  const handle1ClickLogin = async (username, defaultPass = 'Password123!') => {
    setLoading(true);
    try {
      await login(username, defaultPass);
    } catch (err) {
      showToast(err.message, 'error', 'Quick Login Failed');
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
      showToast('Account created and 2048-bit RSA keypair initialized!', 'success', 'Identity Initialized');
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
      await ApiService.sendOtp(forgotEmail.trim(), 'forgot_password');
      setOtpSent(true);
      setForgotOtp(''); // Clear input so user manually enters code received in email
      showToast(`Verification code sent to ${forgotEmail}! Please check your email.`, 'success', 'OTP Dispatched');
    } catch (err) {
      showToast(err.message, 'error', 'Reset Code Failed');
    } finally {
      setOtpSending(false);
    }
  };

  const handleForgotPasswordSubmit = async (e) => {
    e.preventDefault();
    if (!forgotOtp || forgotOtp.trim().length !== 6) {
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
      setLoginPassword(forgotNewPassword);
      setForgotOtp('');
      setOtpSent(false);
    } catch (err) {
      showToast(err.message, 'error', 'Reset Failed');
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (mode) => {
    setAuthMode(mode);
    setOtpSent(false);
    setForgotOtp('');
  };

  const showcaseSlides = [
    {
      badge: 'NIST SP 800-38D Compliant',
      title: 'Authenticated AES-256-GCM',
      desc: 'Symmetric high-throughput authenticated encryption with 96-bit unique IV nonces and 128-bit cryptographic integrity authentication tags.',
      icon: <Lock className="w-8 h-8 text-sky-400" />,
      color: 'from-sky-500/20 to-blue-600/20 border-sky-500/30 text-sky-400',
      pill: 'Military Grade',
    },
    {
      badge: 'PKCS#1 v2.2 Standards',
      title: 'RSA-2048 OAEP Key Enveloping',
      desc: 'Asymmetric key encapsulation ensures AES session keys are securely wrapped for each authorized recipient with zero plaintext exposure.',
      icon: <KeyRound className="w-8 h-8 text-indigo-400" />,
      color: 'from-indigo-500/20 to-purple-600/20 border-indigo-500/30 text-indigo-400',
      pill: 'Zero-Knowledge',
    },
    {
      badge: 'FIPS 180-4 Verification',
      title: 'SHA-256 + RSA-PSS Signatures',
      desc: 'Real-time cryptographic hashing and non-repudiation signatures guarantee absolute tamper-evidence and authentic ownership verification.',
      icon: <Fingerprint className="w-8 h-8 text-emerald-400" />,
      color: 'from-emerald-500/20 to-teal-600/20 border-emerald-500/30 text-emerald-400',
      pill: 'Tamper Resistant',
    },
    {
      badge: 'Zero-Trust Architecture',
      title: '100,000 PBKDF2 Iterations',
      desc: 'Master keys derive strong AES-GCM wrapping keys with 100k rounds of HMAC-SHA256, protecting RSA private keys even at rest.',
      icon: <ShieldCheck className="w-8 h-8 text-amber-400" />,
      color: 'from-amber-500/20 to-orange-600/20 border-amber-500/30 text-amber-400',
      pill: 'Brute-Force Immune',
    },
  ];

  return (
    <div className="min-h-screen bg-[#05070d] text-slate-100 flex flex-col justify-between p-4 sm:p-6 md:p-10 selection:bg-sky-500/30 selection:text-sky-300">
      
      {/* Background Decorative Glow Gradients */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl -z-10 animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl -z-10" />
      </div>

      {/* Main Container - Split Screen on Desktop (Instagram Style) */}
      <div className="max-w-5xl w-full mx-auto my-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        
        {/* ================= LEFT COLUMN: INSTAGRAM-STYLE SMARTPHONE / FEATURE SHOWCASE ================= */}
        <div className="hidden lg:flex lg:col-span-6 flex-col items-center justify-center p-4">
          <div className="relative w-full max-w-sm">
            
            {/* Phone Frame Outer Bezel */}
            <div className="relative rounded-[2.5rem] p-3 bg-gradient-to-b from-slate-700 via-slate-900 to-slate-950 shadow-2xl shadow-sky-500/10 border border-slate-700/60">
              
              {/* Phone Speaker Notch */}
              <div className="absolute top-5 left-1/2 -translate-x-1/2 w-28 h-4 bg-slate-900 rounded-full z-20 flex items-center justify-center border border-slate-800">
                <div className="w-10 h-1 bg-slate-700 rounded-full" />
                <div className="w-2 h-2 ml-2 rounded-full bg-slate-800" />
              </div>

              {/* Phone Inner Screen */}
              <div className="relative rounded-[2rem] overflow-hidden bg-[#0a0f1d] border border-slate-800/80 p-6 pt-10 min-h-[460px] flex flex-col justify-between">
                
                {/* Header in Phone */}
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/30">
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                    <span className="font-bold text-xs tracking-wider text-slate-200">CIPHERVAULT</span>
                  </div>
                  <span className="text-[10px] mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" /> LIVE ENCRYPT
                  </span>
                </div>

                {/* Animated Showcase Carousel Card */}
                <div className="my-auto py-4">
                  <div className={`p-5 rounded-2xl bg-gradient-to-br border transition-all duration-500 ${showcaseSlides[showcaseSlide].color}`}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-700/50 shadow-inner">
                        {showcaseSlides[showcaseSlide].icon}
                      </div>
                      <span className="text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-md bg-slate-900/90 border border-slate-700">
                        {showcaseSlides[showcaseSlide].pill}
                      </span>
                    </div>
                    <div className="text-[11px] font-semibold text-sky-300 uppercase tracking-wider mb-1">
                      {showcaseSlides[showcaseSlide].badge}
                    </div>
                    <h4 className="text-base font-bold text-slate-100 mb-2">
                      {showcaseSlides[showcaseSlide].title}
                    </h4>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      {showcaseSlides[showcaseSlide].desc}
                    </p>
                  </div>

                  {/* Carousel Dot Indicators */}
                  <div className="flex items-center justify-center gap-2 mt-5">
                    {showcaseSlides.map((_, idx) => (
                      <button
                        key={idx}
                        onClick={() => setShowcaseSlide(idx)}
                        className={`h-1.5 rounded-full transition-all duration-300 ${
                          showcaseSlide === idx ? 'w-6 bg-sky-400' : 'w-2 bg-slate-700 hover:bg-slate-600'
                        }`}
                        title={`Slide ${idx + 1}`}
                      />
                    ))}
                  </div>
                </div>

                {/* Bottom Stats Ticker inside Phone */}
                <div className="pt-3 border-t border-slate-800 grid grid-cols-3 gap-2 text-center text-[10px]">
                  <div className="p-2 rounded-lg bg-slate-900/60 border border-slate-800/80">
                    <div className="font-mono font-bold text-sky-400">256-Bit</div>
                    <div className="text-slate-500 text-[9px]">AES-GCM</div>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-900/60 border border-slate-800/80">
                    <div className="font-mono font-bold text-indigo-400">2048-Bit</div>
                    <div className="text-slate-500 text-[9px]">RSA OAEP</div>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-900/60 border border-slate-800/80">
                    <div className="font-mono font-bold text-emerald-400">100k</div>
                    <div className="text-slate-500 text-[9px]">PBKDF2</div>
                  </div>
                </div>

              </div>
            </div>

            {/* Glowing Backdrop Ring */}
            <div className="absolute -inset-2 bg-gradient-to-r from-sky-500/20 via-blue-600/10 to-purple-600/20 rounded-[3rem] -z-10 blur-xl opacity-70" />
          </div>
        </div>


        {/* ================= RIGHT COLUMN: INSTAGRAM-STYLE AUTHENTICATION CARD ================= */}
        <div className="lg:col-span-6 w-full max-w-md mx-auto space-y-4">
          
          {/* Main Instagram Box */}
          <div className="glass-panel p-8 relative border border-slate-700/60 bg-[#0d1322]/90 shadow-2xl shadow-sky-500/5">
            
            {/* Instagram Style Brand Header */}
            <div className="text-center mb-6">
              <div className="inline-flex p-3 rounded-2xl bg-gradient-to-tr from-sky-500/20 via-blue-500/20 to-indigo-500/20 border border-sky-500/30 text-sky-400 mb-3 shadow-lg shadow-sky-500/10">
                <ShieldCheck className="w-8 h-8 text-sky-400" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-100 tracking-tight font-serif italic">
                CipherVault
              </h1>
              <p className="text-xs text-slate-400 mt-1">
                Zero-Knowledge Hybrid Cryptography Storage
              </p>
              <div className="text-[11px] text-sky-400/90 font-medium mt-0.5">
                Lead Architect: Devansh Rathore
              </div>
            </div>

            {/* ---------------- SAVED / RECENT ACCOUNTS QUICK SWITCHER (Instagram Style) ---------------- */}
            {authMode === 'login' && savedAccounts && savedAccounts.length > 0 && (
              <div className="mb-5 p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <History className="w-3.5 h-3.5 text-sky-400" /> Saved Accounts
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm("Erase all saved login accounts and cached form data?")) {
                          clearAllSavedAccounts();
                        }
                      }}
                      className="text-[10px] text-rose-400 hover:text-rose-300 hover:underline flex items-center gap-1 transition"
                      title="Erase all saved login info"
                    >
                      <Trash2 className="w-3 h-3" /> Clear Info
                    </button>
                    <span className="text-[10px] text-slate-500 font-mono">({savedAccounts.length})</span>
                  </div>
                </div>

                <div className="flex gap-2 overflow-x-auto pb-1.5 scrollbar-thin">
                  {savedAccounts.map((acc) => {
                    const isSelected = loginUsername.toLowerCase() === acc.username.toLowerCase();
                    return (
                      <div
                        key={acc.username}
                        onClick={() => handleQuickSelectAccount(acc)}
                        className={`group flex-shrink-0 cursor-pointer p-2 rounded-lg border transition text-left flex items-center gap-2 pr-2 ${
                          isSelected
                            ? 'bg-sky-500/15 border-sky-500/50 text-white'
                            : 'bg-slate-800/60 border-slate-700/60 hover:bg-slate-800 text-slate-300'
                        }`}
                      >
                        <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center text-white text-[11px] font-bold shadow">
                          {acc.username.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="text-xs font-semibold leading-tight">{acc.full_name || acc.username}</div>
                          <div className="text-[10px] text-sky-400 mono">@{acc.username}</div>
                        </div>
                        {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-sky-400 ml-0.5" />}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeSavedAccount(acc.username);
                          }}
                          className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-slate-700/50 transition opacity-60 group-hover:opacity-100"
                          title={`Remove @${acc.username}`}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}


            {/* ---------------- 1. LOGIN MODE ---------------- */}
            {authMode === 'login' && (
              <>
                <form onSubmit={handleLoginSubmit} className="space-y-4">
                  {/* Username / Email Input */}
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                      Username or Email
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                        <UserIcon className="w-4 h-4" />
                      </div>
                      <input
                        type="text"
                        required
                        value={loginUsername}
                        onChange={(e) => setLoginUsername(e.target.value)}
                        className="w-full pl-9 pr-3.5 py-2.5 bg-slate-900/90 border border-slate-700 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-400 transition"
                        placeholder="e.g. devansh or user@company.com"
                      />
                    </div>
                  </div>

                  {/* Password Input with Show/Hide Eye */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-medium text-slate-300">
                        Master Password / Key
                      </label>
                      <button
                        type="button"
                        onClick={() => switchMode('forgot_password')}
                        className="text-[11px] text-sky-400 hover:underline hover:text-sky-300 font-medium"
                      >
                        Forgot Master Key?
                      </button>
                    </div>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                        <Lock className="w-4 h-4" />
                      </div>
                      <input
                        type={showLoginPassword ? 'text' : 'password'}
                        required
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        className="w-full pl-9 pr-10 py-2.5 bg-slate-900/90 border border-slate-700 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-400 transition"
                        placeholder="••••••••••••"
                      />
                      <button
                        type="button"
                        onClick={() => setShowLoginPassword(!showLoginPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-200"
                        title={showLoginPassword ? 'Hide password' : 'Show password'}
                      >
                        {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2.5 rounded-xl bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-600 hover:from-sky-400 hover:via-blue-500 hover:to-indigo-500 text-white text-sm font-semibold shadow-lg shadow-sky-500/20 flex items-center justify-center gap-2 transition disabled:opacity-60"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Unlocking Cryptographic Vault...</span>
                      </>
                    ) : (
                      <>
                        <span>Log In</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>

                {/* Divider */}
                <div className="relative my-5">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-800" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-[#0d1322] px-3 text-slate-500 font-semibold tracking-wider">
                      OR 1-CLICK DEMO
                    </span>
                  </div>
                </div>

                {/* 1-Click Demo Profiles (For Evaluator & Viva) */}
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
                      onClick={() => handle1ClickLogin(acc.user)}
                      disabled={loading}
                      className={`px-2.5 py-1.5 rounded-lg border text-xs font-medium flex items-center justify-between hover:opacity-80 transition disabled:opacity-50 ${acc.color}`}
                    >
                      <span>{acc.name}</span>
                      <Zap className="w-3 h-3" />
                    </button>
                  ))}
                </div>
              </>
            )}

            {/* ---------------- 2. REGISTRATION / SIGN UP MODE ---------------- */}
            {authMode === 'register' && (
              <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-emerald-400" /> New Account & RSA Keypair
                  </span>
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
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                      <UserIcon className="w-3.5 h-3.5" />
                    </div>
                    <input
                      type="text"
                      required
                      value={regUsername}
                      onChange={(e) => setRegUsername(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-sky-400"
                      placeholder="e.g. devansh_security"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Full Name</label>
                  <input
                    type="text"
                    value={regFullName}
                    onChange={(e) => setRegFullName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-sky-400"
                    placeholder="Devansh Rathore"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Registered Email</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                      <Mail className="w-3.5 h-3.5" />
                    </div>
                    <input
                      type="email"
                      required
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-sky-400"
                      placeholder="devansh@ciphervault.io"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Master Password / Key</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                      <Lock className="w-3.5 h-3.5" />
                    </div>
                    <input
                      type={showRegPassword ? 'text' : 'password'}
                      required
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      className="w-full pl-9 pr-10 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-sky-400"
                      placeholder="Min 6 characters (Derives 100k PBKDF2 Envelope)"
                    />
                    <button
                      type="button"
                      onClick={() => setShowRegPassword(!showRegPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-200"
                    >
                      {showRegPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Role</label>
                  <select
                    value={regRole}
                    onChange={(e) => setRegRole(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-sky-400"
                  >
                    <option value="user">Standard User</option>
                    <option value="admin">Administrator</option>
                    <option value="auditor">Security Auditor</option>
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 mt-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white text-xs font-semibold shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 transition disabled:opacity-60"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Generating 2048-Bit RSA Keys & Vault...</span>
                    </>
                  ) : (
                    <>
                      <span>Sign Up & Initialize Keypair</span>
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
                  Enter your registered email address. We will dispatch a secure 6-digit verification code to reset your master key and re-envelope your RSA keys.
                </p>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Registered Email Address</label>
                  <div className="flex gap-2">
                    <input
                      type="email"
                      required
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      className="flex-1 px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-sky-400"
                      placeholder="e.g. devansh@ciphervault.io"
                    />
                    <button
                      type="button"
                      onClick={handleSendForgotOtp}
                      disabled={otpSending}
                      className="px-3 py-2 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-500/30 text-xs font-medium flex items-center gap-1 transition whitespace-nowrap"
                    >
                      {otpSending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                      <span>{otpSent ? 'Resend' : 'Send Code'}</span>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    6-Digit Verification Code {otpSent && <span className="text-emerald-400 font-semibold">(Sent to Email)</span>}
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={forgotOtp}
                    onChange={(e) => setForgotOtp(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-100 font-mono tracking-widest text-center focus:outline-none focus:border-sky-400"
                    placeholder="123456"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">New Master Password / Key</label>
                  <div className="relative">
                    <input
                      type={showForgotNewPassword ? 'text' : 'password'}
                      required
                      value={forgotNewPassword}
                      onChange={(e) => setForgotNewPassword(e.target.value)}
                      className="w-full px-3 pr-9 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-sky-400"
                      placeholder="Min 6 characters"
                    />
                    <button
                      type="button"
                      onClick={() => setShowForgotNewPassword(!showForgotNewPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-200"
                    >
                      {showForgotNewPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Confirm New Master Key</label>
                  <div className="relative">
                    <input
                      type={showForgotConfirmPassword ? 'text' : 'password'}
                      required
                      value={forgotConfirmPassword}
                      onChange={(e) => setForgotConfirmPassword(e.target.value)}
                      className="w-full px-3 pr-9 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-sky-400"
                      placeholder="••••••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowForgotConfirmPassword(!showForgotConfirmPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-200"
                    >
                      {showForgotConfirmPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white text-xs font-semibold shadow-lg shadow-sky-500/20 flex items-center justify-center gap-2 transition disabled:opacity-60"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Verifying & Re-encrypting Key Envelope...</span>
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

          {/* Secondary Instagram Switch Box */}
          <div className="glass-panel p-4 text-center border border-slate-700/60 bg-[#0d1322]/90 text-xs text-slate-300">
            {authMode === 'login' ? (
              <div>
                Don't have an account?{' '}
                <button
                  type="button"
                  onClick={() => switchMode('register')}
                  className="text-sky-400 hover:underline font-bold ml-1 hover:text-sky-300"
                >
                  Sign up
                </button>
              </div>
            ) : authMode === 'register' ? (
              <div>
                Have an account?{' '}
                <button
                  type="button"
                  onClick={() => switchMode('login')}
                  className="text-sky-400 hover:underline font-bold ml-1 hover:text-sky-300"
                >
                  Log in
                </button>
              </div>
            ) : (
              <div>
                Remembered your password?{' '}
                <button
                  type="button"
                  onClick={() => switchMode('login')}
                  className="text-sky-400 hover:underline font-bold ml-1 hover:text-sky-300"
                >
                  Back to Log in
                </button>
              </div>
            )}
          </div>

        </div>

      </div>

      {/* Footer Branding */}
      <footer className="mt-8 text-center text-[11px] text-slate-500 flex flex-col sm:flex-row items-center justify-center gap-2">
        <span>CipherVault © 2026</span>
        <span className="hidden sm:inline">•</span>
        <span>Lead Architect & Engineer: <strong className="text-slate-400">Devansh Rathore</strong></span>
        <span className="hidden sm:inline">•</span>
        <span>NIST SP 800-38D & PKCS#1 v2.2 Certified</span>
      </footer>

    </div>
  );
};
