import React, { useState, useEffect, useRef } from 'react';
import { ShieldPlus, X, UploadCloud, ShieldCheck, Loader2 } from 'lucide-react';
import { ApiService, formatBytes } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export const UploadModal = ({ isOpen, onClose, onSuccess }) => {
  const { masterPassword, saveCachedPassword } = useAuth();
  const { showToast } = useToast();

  const [selectedFile, setSelectedFile] = useState(null);
  const [fileHashPreview, setFileHashPreview] = useState('');
  const [password, setPassword] = useState(masterPassword || '');
  const [recipients, setRecipients] = useState([]);
  const [selectedRecipients, setSelectedRecipients] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setPassword(masterPassword || '');
      loadRecipients();
    }
  }, [isOpen, masterPassword]);

  const loadRecipients = async () => {
    setLoadingUsers(true);
    try {
      const users = await ApiService.listUsers();
      setRecipients(users || []);
    } catch (err) {
      console.warn('Failed to load users for sharing:', err);
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleFileChange = (file) => {
    if (!file) return;
    setSelectedFile(file);
    setFileHashPreview('Computing SHA-256 client fingerprint...');

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const buffer = e.target.result;
        const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
        setFileHashPreview(hashHex);
      } catch (err) {
        setFileHashPreview('SHA-256 calculated on server');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const toggleRecipient = (username) => {
    setSelectedRecipients((prev) =>
      prev.includes(username) ? prev.filter((u) => u !== username) : [...prev, username]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedFile) {
      showToast('Please select a file to encrypt.', 'error');
      return;
    }
    if (!password) {
      showToast('Please enter your master password to unlock RSA private key for signing.', 'error');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('password', password);
      if (selectedRecipients.length > 0) {
        formData.append('recipient_usernames', JSON.stringify(selectedRecipients));
      }

      saveCachedPassword(password);
      const res = await ApiService.uploadFile(formData);
      showToast(`'${res.original_filename}' successfully encrypted and secured!`, 'success', 'Hybrid Encryption Complete');
      onSuccess?.();
      handleClose();
    } catch (err) {
      showToast(err.message, 'error', 'Upload Encryption Failed');
    } finally {
      setUploading(false);
    }
  };

  const handleClose = () => {
    setSelectedFile(null);
    setFileHashPreview('');
    setSelectedRecipients([]);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-[#030712]/90 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="glass-panel glass-panel-glow w-full max-w-xl p-6 relative border border-sky-500/30 bg-[#0d121d]/95">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <ShieldPlus className="w-5 h-5 text-sky-400" />
            Hybrid File Encryptor & Storage
          </h3>
          <button onClick={handleClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Dropzone */}
          <div
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragOver(true);
            }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragOver(false);
              if (e.dataTransfer.files?.[0]) handleFileChange(e.dataTransfer.files[0]);
            }}
            className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition ${
              isDragOver ? 'border-sky-400 bg-sky-950/30' : 'border-slate-700 hover:border-sky-500/50 bg-slate-900/40'
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={(e) => e.target.files?.[0] && handleFileChange(e.target.files[0])}
              className="hidden"
            />
            <UploadCloud className="w-10 h-10 mx-auto text-sky-400 mb-2" />
            <div className="text-xs font-semibold text-slate-200">
              Click to select or drag & drop confidential file
            </div>
            <div className="text-[11px] text-slate-500 mt-1">PDF, TXT, DOCX, XLSX, JSON, Images up to 50MB</div>
          </div>

          {/* Selected File Details */}
          {selectedFile && (
            <div className="p-3 rounded-lg bg-sky-950/30 border border-sky-500/30 text-xs">
              <div className="flex items-center justify-between font-semibold text-sky-300">
                <span>{selectedFile.name}</span>
                <span className="text-slate-400">{formatBytes(selectedFile.size)}</span>
              </div>
              <div className="text-[10px] text-slate-400 mono mt-1 break-all">
                SHA-256: <span className="text-sky-300">{fileHashPreview}</span>
              </div>
            </div>
          )}

          {/* Password */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Master Password <span className="text-slate-500">(Unlocks RSA Private Key for PSS signing)</span>
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-100 focus:outline-none focus:border-sky-400"
              placeholder="Enter your account password"
            />
          </div>

          {/* Recipient Selection */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Initial Recipients <span className="text-slate-500">(AES session key wrapped with their RSA-2048 public keys)</span>
            </label>
            <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto pr-1">
              {loadingUsers ? (
                <div className="text-xs text-slate-500 col-span-2 py-2">Loading user directory...</div>
              ) : recipients.length === 0 ? (
                <div className="text-xs text-slate-500 col-span-2 italic">No other users registered.</div>
              ) : (
                recipients.map((u) => (
                  <label
                    key={u.id}
                    className={`flex items-center gap-2 text-xs p-2 rounded-lg border cursor-pointer transition ${
                      selectedRecipients.includes(u.username)
                        ? 'bg-sky-950/40 border-sky-500 text-sky-200'
                        : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:border-sky-500/40'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedRecipients.includes(u.username)}
                      onChange={() => toggleRecipient(u.username)}
                      className="rounded bg-slate-800 text-sky-500 focus:ring-0"
                    />
                    <div className="truncate">
                      <span className="font-semibold text-slate-200 block truncate">{u.full_name || u.username}</span>
                      <span className="text-[10px] text-slate-500 block truncate">@{u.username}</span>
                    </div>
                  </label>
                ))
              )}
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={uploading}
            className="w-full py-2.5 rounded-lg bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white text-xs font-semibold shadow-md shadow-sky-500/20 flex items-center justify-center gap-1.5 transition disabled:opacity-60"
          >
            {uploading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Encrypting with AES-256-GCM & Wrapping Keys...</span>
              </>
            ) : (
              <>
                <span>Encrypt & Store Payload</span>
                <ShieldCheck className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
