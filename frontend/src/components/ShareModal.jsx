import React, { useState, useEffect } from 'react';
import { Share2, X, ShieldCheck, Users, Loader2 } from 'lucide-react';
import { ApiService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export const ShareModal = ({ isOpen, fileId, filename, onClose, onSuccess }) => {
  const { masterPassword, saveCachedPassword } = useAuth();
  const { showToast } = useToast();

  const [password, setPassword] = useState(masterPassword || '');
  const [expiryHours, setExpiryHours] = useState('');
  const [recipients, setRecipients] = useState([]);
  const [selectedRecipients, setSelectedRecipients] = useState([]);
  const [activeShares, setActiveShares] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sharing, setSharing] = useState(false);

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

  const toggleRecipient = (username) => {
    setSelectedRecipients((prev) =>
      prev.includes(username) ? prev.filter((u) => u !== username) : [...prev, username]
    );
  };

  const handleShareSubmit = async (e) => {
    e.preventDefault();
    if (selectedRecipients.length === 0) {
      showToast('Please select at least one recipient user.', 'error');
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
        expiryHours || null
      );
      showToast(`Encrypted access granted for ${selectedRecipients.join(', ')}!`, 'success', 'File Shared');
      setSelectedRecipients([]);
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-[#030712]/90 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="glass-panel glass-panel-glow w-full max-w-xl p-6 relative border border-indigo-500/30 bg-[#0d121d]/95">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <Share2 className="w-5 h-5 text-indigo-400" />
            <span>Grant RSA Encrypted Access:</span>
            <span className="text-indigo-300 truncate max-w-xs">{filename}</span>
          </h3>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleShareSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">Select Recipients</label>
            <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
              {loading ? (
                <div className="text-xs text-slate-500 py-2">Loading user directory...</div>
              ) : recipients.length === 0 ? (
                <div className="text-xs text-slate-500 italic">No other registered users found.</div>
              ) : (
                recipients.map((u) => (
                  <label
                    key={u.id}
                    className={`flex items-center gap-2 text-xs p-2.5 rounded-lg border cursor-pointer transition ${
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
                    <div className="truncate">
                      <div className="font-semibold text-slate-200">{u.full_name || u.username} (@{u.username})</div>
                      <div className="text-[10px] text-slate-500 mono truncate max-w-md">
                        Pubkey: {u.public_key.substring(27, 60)}...
                      </div>
                    </div>
                  </label>
                ))
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
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
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-100 focus:outline-none focus:border-indigo-400"
                placeholder="Unlock session key"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={sharing}
            className="w-full py-2.5 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white text-xs font-semibold shadow-md shadow-indigo-500/20 flex items-center justify-center gap-1.5 transition disabled:opacity-60"
          >
            {sharing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Encapsulating Session Key with Recipients' RSA Public Keys...</span>
              </>
            ) : (
              <>
                <span>Generate Encrypted Share Grants</span>
                <ShieldCheck className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Active Share Grants Table */}
        <div className="mt-6 pt-4 border-t border-slate-800">
          <h4 className="text-xs font-semibold text-slate-300 mb-2 flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-indigo-400" />
            Active Recipient Grants for this File
          </h4>
          <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
            {activeShares.length === 0 ? (
              <div className="text-xs text-slate-500 italic py-1">No access grants created yet for this file.</div>
            ) : (
              activeShares.map((s) => {
                const isRevoked = s.is_revoked;
                return (
                  <div
                    key={s.id}
                    className={`flex items-center justify-between p-2.5 rounded-lg bg-slate-900/60 border ${
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
                      <div className="text-[11px] text-slate-500">
                        Expires: {s.expires_at ? new Date(s.expires_at).toLocaleString() : 'Never'}
                      </div>
                    </div>
                    {!isRevoked && (
                      <button
                        onClick={() => handleRevoke(s.id)}
                        className="px-2.5 py-1 text-xs rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 transition"
                      >
                        Revoke Access
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
