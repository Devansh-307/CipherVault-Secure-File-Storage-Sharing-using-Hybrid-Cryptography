import React, { useState, useEffect } from 'react';
import { 
  Share2, 
  X, 
  ShieldCheck, 
  Users, 
  Loader2, 
  Search, 
  UserPlus, 
  Key, 
  Link as LinkIcon, 
  Copy, 
  Check, 
  Trash2,
  Eye,
  EyeOff
} from 'lucide-react';
import { ApiService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export const ShareModal = ({ isOpen, fileId, filename, onClose, onSuccess }) => {
  const { masterPassword, saveCachedPassword } = useAuth();
  const { showToast } = useToast();

  // Active Share Mode: 'directory' | 'custom_user' | 'public_key'
  const [shareTab, setShareTab] = useState('directory');

  const [password, setPassword] = useState(masterPassword || '');
  const [showPassword, setShowPassword] = useState(false);
  const [expiryHours, setExpiryHours] = useState('');
  const [recipients, setRecipients] = useState([]);
  const [selectedRecipients, setSelectedRecipients] = useState([]);
  const [activeShares, setActiveShares] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sharing, setSharing] = useState(false);

  // Search filter for directory
  const [searchQuery, setSearchQuery] = useState('');

  // Custom User / Email Input
  const [customInput, setCustomInput] = useState('');

  // Custom Public Key Input
  const [customKeyLabel, setCustomKeyLabel] = useState('');
  const [customKeyPem, setCustomKeyPem] = useState('');

  // Copied link status
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    if (isOpen && fileId) {
      setPassword(masterPassword || '');
      loadModalData();
    }
  }, [isOpen, fileId, masterPassword]);

  const loadModalData = async () => {
    setLoading(true);
    try {
      const [users, shares] = await Promise.all([
        ApiService.listUsers(),
        ApiService.listFileShares(fileId),
      ]);
      setRecipients(users || []);
      setActiveShares(shares || []);
    } catch (err) {
      console.warn('Failed to load sharing data:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleRecipient = (identifier) => {
    setSelectedRecipients((prev) =>
      prev.includes(identifier) ? prev.filter((u) => u !== identifier) : [...prev, identifier]
    );
  };

  const handleAddCustomRecipient = (e) => {
    e.preventDefault();
    const clean = customInput.trim();
    if (!clean) return;
    if (!selectedRecipients.includes(clean)) {
      setSelectedRecipients((prev) => [...prev, clean]);
      showToast(`Added recipient '${clean}'`, 'success');
    }
    setCustomInput('');
  };

  const handleShareSubmit = async (e) => {
    e.preventDefault();

    const customRecs = [];
    if (shareTab === 'public_key' && customKeyPem.trim()) {
      if (!customKeyPem.includes('PUBLIC KEY')) {
        showToast('Please provide a valid PEM format RSA Public Key (with -----BEGIN PUBLIC KEY-----).', 'error');
        return;
      }
      customRecs.push({
        label: customKeyLabel.trim() || 'External Recipient',
        public_key_pem: customKeyPem.trim(),
      });
    }

    if (selectedRecipients.length === 0 && customRecs.length === 0) {
      showToast('Please select or specify at least one recipient user, email, or public key.', 'error');
      return;
    }

    if (!password) {
      showToast('Please enter your password to unwrap and re-encrypt the AES session key.', 'error');
      return;
    }

    setSharing(true);
    try {
      saveCachedPassword(password);
      await ApiService.shareFile(
        fileId,
        selectedRecipients,
        password,
        'download',
        expiryHours || null,
        customRecs
      );
      showToast(`Encrypted access grants generated successfully!`, 'success', 'Session Keys Wrapped');
      setSelectedRecipients([]);
      setCustomKeyLabel('');
      setCustomKeyPem('');
      loadModalData();
      onSuccess?.();
    } catch (err) {
      showToast(err.message, 'error', 'Sharing Failed');
    } finally {
      setSharing(false);
    }
  };

  const handleRevoke = async (shareId) => {
    if (!window.confirm("Are you sure you want to dynamically revoke this recipient's decryption access?")) {
      return;
    }
    try {
      await ApiService.revokeShare(shareId);
      showToast('Access permission immediately revoked.', 'success');
      loadModalData();
      onSuccess?.();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleCopyShareLink = () => {
    const url = `${window.location.origin}/#share=${fileId}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    showToast('Secure access link copied to clipboard!', 'success');
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const filteredRecipients = recipients.filter((u) => {
    const q = searchQuery.toLowerCase();
    return (
      u.username.toLowerCase().includes(q) ||
      (u.full_name && u.full_name.toLowerCase().includes(q)) ||
      (u.email && u.email.toLowerCase().includes(q))
    );
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-[#030712]/90 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="glass-panel glass-panel-glow w-full max-w-2xl p-6 relative border border-indigo-500/30 bg-[#0d121d]/95">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <Share2 className="w-5 h-5 text-indigo-400" />
            <span>Grant Encrypted Access:</span>
            <span className="text-indigo-300 truncate max-w-xs">{filename}</span>
          </h3>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Share Mode Tab Selector */}
        <div className="flex border-b border-slate-800 mb-4 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setShareTab('directory')}
            className={`pb-2 px-3 flex items-center gap-1.5 border-b-2 transition ${
              shareTab === 'directory'
                ? 'border-indigo-500 text-indigo-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className="w-3.5 h-3.5" /> Directory Users
          </button>
          <button
            type="button"
            onClick={() => setShareTab('custom_user')}
            className={`pb-2 px-3 flex items-center gap-1.5 border-b-2 transition ${
              shareTab === 'custom_user'
                ? 'border-indigo-500 text-indigo-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" /> Email / Username
          </button>
          <button
            type="button"
            onClick={() => setShareTab('public_key')}
            className={`pb-2 px-3 flex items-center gap-1.5 border-b-2 transition ${
              shareTab === 'public_key'
                ? 'border-indigo-500 text-indigo-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Key className="w-3.5 h-3.5" /> Custom RSA Key
          </button>
        </div>

        <form onSubmit={handleShareSubmit} className="space-y-4">
          {/* TAB 1: Directory Search */}
          {shareTab === 'directory' && (
            <div className="space-y-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search registered users by name, username, or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-indigo-400"
                />
              </div>

              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                {loading ? (
                  <div className="text-xs text-slate-500 py-2">Loading user directory...</div>
                ) : filteredRecipients.length === 0 ? (
                  <div className="text-xs text-slate-500 italic py-2">No matching users found in directory.</div>
                ) : (
                  filteredRecipients.map((u) => (
                    <label
                      key={u.id}
                      className={`flex items-center gap-2 text-xs p-2 rounded-lg border cursor-pointer transition ${
                        selectedRecipients.includes(u.username)
                          ? 'bg-indigo-950/40 border-indigo-500 text-indigo-200'
                          : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:border-indigo-500/40'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedRecipients.includes(u.username)}
                        onChange={() => toggleRecipient(u.username)}
                        className="rounded bg-slate-800 text-indigo-500 focus:ring-0"
                      />
                      <div className="truncate flex-1">
                        <div className="font-semibold text-slate-200 flex items-center justify-between">
                          <span>{u.full_name || u.username} (@{u.username})</span>
                          {u.email && <span className="text-[10px] text-slate-500 font-normal">{u.email}</span>}
                        </div>
                        <div className="text-[10px] text-slate-500 mono truncate">
                          RSA Key: {u.public_key ? u.public_key.substring(27, 65) : 'Standard 2048-bit'}...
                        </div>
                      </div>
                    </label>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 2: Custom Username / Email Entry */}
          {shareTab === 'custom_user' && (
            <div className="space-y-3">
              <p className="text-xs text-slate-400">
                Type any user's username or email address to grant encrypted access.
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. charlie@company.com or external_partner"
                  value={customInput}
                  onChange={(e) => setCustomInput(e.target.value)}
                  className="flex-1 px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-indigo-400"
                />
                <button
                  type="button"
                  onClick={handleAddCustomRecipient}
                  className="px-3 py-2 rounded-lg bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/30 text-xs font-semibold transition"
                >
                  Add Recipient
                </button>
              </div>

              {/* Selected List Badge view */}
              {selectedRecipients.length > 0 && (
                <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                  <div className="text-[11px] font-semibold text-slate-400 mb-1.5">Recipients Queue:</div>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedRecipients.map((rec) => (
                      <span
                        key={rec}
                        className="badge-crypto bg-indigo-500/10 border-indigo-500/30 text-indigo-300 flex items-center gap-1.5 py-1 px-2.5"
                      >
                        <span>{rec}</span>
                        <button
                          type="button"
                          onClick={() => toggleRecipient(rec)}
                          className="hover:text-rose-400 text-slate-400"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: Paste Custom RSA Public Key PEM */}
          {shareTab === 'public_key' && (
            <div className="space-y-2.5">
              <p className="text-xs text-slate-400">
                Directly wrap the AES session key using an external party's 2048-bit RSA Public Key PEM.
              </p>
              <div>
                <input
                  type="text"
                  placeholder="Recipient Name / Label (e.g. Legal Partner / External Auditor)"
                  value={customKeyLabel}
                  onChange={(e) => setCustomKeyLabel(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-indigo-400 mb-2"
                />
                <textarea
                  rows={3}
                  placeholder="-----BEGIN PUBLIC KEY-----&#10;MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA...&#10;-----END PUBLIC KEY-----"
                  value={customKeyPem}
                  onChange={(e) => setCustomKeyPem(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-200 font-mono focus:outline-none focus:border-indigo-400"
                />
              </div>
            </div>
          )}

          {/* Configuration: Expiry and Password */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Access Expiration</label>
              <select
                value={expiryHours}
                onChange={(e) => setExpiryHours(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-indigo-400"
              >
                <option value="">Permanent (No Expiry)</option>
                <option value="1">Expires in 1 Hour</option>
                <option value="24">Expires in 24 Hours</option>
                <option value="168">Expires in 7 Days</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Your Master Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-3 pr-9 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-100 focus:outline-none focus:border-indigo-400"
                  placeholder="Unlock session key"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-200"
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={sharing}
              className="flex-1 py-2.5 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white text-xs font-semibold shadow-md shadow-indigo-500/20 flex items-center justify-center gap-1.5 transition disabled:opacity-60"
            >
              {sharing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Encapsulating Session Key with RSA-OAEP...</span>
                </>
              ) : (
                <>
                  <span>Generate Encrypted Access Grants</span>
                  <ShieldCheck className="w-4 h-4" />
                </>
              )}
            </button>
            <button
              type="button"
              onClick={handleCopyShareLink}
              className="px-3.5 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-medium flex items-center gap-1.5 transition"
              title="Copy Secure Direct Link"
            >
              {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <LinkIcon className="w-4 h-4" />}
              <span>{copiedLink ? 'Copied' : 'Share Link'}</span>
            </button>
          </div>
        </form>

        {/* Active Share Grants Table */}
        <div className="mt-5 pt-4 border-t border-slate-800">
          <h4 className="text-xs font-semibold text-slate-300 mb-2 flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-indigo-400" />
            Active Recipient Grants for this File
          </h4>
          <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
            {activeShares.length === 0 ? (
              <div className="text-xs text-slate-500 italic py-1">No access grants created yet for this file.</div>
            ) : (
              activeShares.map((s) => {
                const isRevoked = s.is_revoked;
                return (
                  <div
                    key={s.id}
                    className={`flex items-center justify-between p-2 rounded-lg bg-slate-900/60 border ${
                      isRevoked ? 'border-rose-900/40 opacity-60' : 'border-slate-800'
                    }`}
                  >
                    <div>
                      <div className="text-xs font-semibold text-slate-200 flex items-center gap-2">
                        @{s.recipient_username}
                        {isRevoked ? (
                          <span className="badge-crypto badge-danger text-[10px]">Revoked</span>
                        ) : (
                          <span className="badge-crypto badge-success text-[10px]">Active</span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        Expires: {s.expires_at ? new Date(s.expires_at).toLocaleString() : 'Never'}
                      </div>
                    </div>
                    {!isRevoked && (
                      <button
                        onClick={() => handleRevoke(s.id)}
                        className="px-2 py-1 text-xs rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 transition flex items-center gap-1"
                      >
                        <Trash2 className="w-3 h-3" /> Revoke
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
