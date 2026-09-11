import React, { useState, useEffect } from 'react';
import {
  Unlock,
  X,
  CheckCircle2,
  ShieldAlert,
  Download,
  Loader2,
  ShieldCheck,
  Eye,
  EyeOff
} from 'lucide-react';
import { ApiService, formatBytes } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export const DecryptModal = ({ isOpen, fileId, filename, isOwner, onClose }) => {
  const { masterPassword, saveCachedPassword } = useAuth();
  const { showToast } = useToast();

  const [password, setPassword] = useState(masterPassword || '');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen) {
      setPassword(masterPassword || '');
      setResult(null);
      setError(null);
    }
  }, [isOpen, masterPassword]);

  const handleDecryptSubmit = async (e) => {
    e.preventDefault();
    if (!password) {
      showToast('Please enter your master password.', 'error');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      saveCachedPassword(password);
      const data = await ApiService.decryptFile(fileId, password);
      setResult(data);
      showToast('Decryption and SHA-256 integrity match confirmed!', 'success', 'Cryptographic Proof Verified');
    } catch (err) {
      setError(err.message);
      showToast(err.message, 'error', 'Decryption Failed');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadBlob = () => {
    if (!result?.content_base64) return;

    try {
      const byteCharacters = atob(result.content_base64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: result.mime_type || 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = result.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast(`Downloaded '${result.filename}' with verified integrity.`, 'success');
    } catch (e) {
      showToast('Failed to generate download file', 'error');
    }
  };

  const renderTextPreview = () => {
    if (!result?.content_base64) return null;
    try {
      const decodedText = atob(result.content_base64);
      if (decodedText.length < 50000 && /^[\x20-\x7E\s]*$/.test(decodedText.substring(0, 1000))) {
        return (
          <pre className="p-3.5 rounded-lg bg-[#090d16] border border-slate-800 text-xs font-mono text-sky-300 max-h-48 overflow-y-auto whitespace-pre-wrap">
            {decodedText}
          </pre>
        );
      }
    } catch (e) {
      return null;
    }
    return null;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-[#030712]/90 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="glass-panel glass-panel-glow w-full max-w-xl p-6 relative border border-sky-500/30 bg-[#0d121d]/95">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <Unlock className="w-5 h-5 text-sky-400" />
            <span>Decrypt & Verify Integrity:</span>
            <span className="text-sky-300 truncate max-w-xs">{filename}</span>
          </h3>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        {!result && !error && (
          <form onSubmit={handleDecryptSubmit} className="space-y-4">
            <p className="text-xs text-slate-400">
              Provide your master password to unlock your RSA private key envelope, unwrap the AES-256 session key, and verify SHA-256 checksums.
            </p>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Your Master Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-3.5 pr-10 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-100 focus:outline-none focus:border-sky-400"
                  placeholder="••••••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-200"
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-lg bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white text-xs font-semibold shadow-md shadow-sky-500/20 flex items-center justify-center gap-1.5 transition disabled:opacity-60"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Unwrapping RSA Key & Verifying GCM Tag...</span>
                </>
              ) : (
                <>
                  <span>Decrypt & Verify Plaintext</span>
                  <ShieldCheck className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}

        {/* Success View */}
        {result && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 space-y-3">
              <div className="flex items-center justify-between">
                <div className="font-bold text-sm flex items-center gap-2 text-emerald-400">
                  <CheckCircle2 className="w-5 h-5" />
                  INTEGRITY VERIFIED & AUTHENTIC
                </div>
                <span className={`badge-crypto ${result.signature_verified ? 'badge-success' : 'badge-warning'}`}>
                  {result.signature_verified ? 'RSA-PSS Signed' : 'Signature Unverified'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs text-slate-300 pt-2 border-t border-emerald-500/20">
                <div>Filename: <span className="font-semibold text-slate-100">{result.filename}</span></div>
                <div>Size: <span className="font-semibold text-slate-100">{formatBytes(result.file_size_bytes)}</span></div>
                <div>Sender: <span className="font-semibold text-slate-100">@{result.sender_username}</span></div>
                <div>Algorithm: <span className="mono text-sky-400">{result.decryption_algorithm}</span></div>
              </div>

              <div className="text-[10px] text-slate-400 mono break-all">
                Verified SHA-256: <span className="text-emerald-300">{result.sha256_hash}</span>
              </div>
            </div>

            {renderTextPreview()}

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={handleDownloadBlob}
                className="py-2 px-5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-emerald-500/20 transition"
              >
                <Download className="w-4 h-4" /> Download Decrypted File
              </button>
            </div>
          </div>
        )}

        {/* Error / Tamper Failure View */}
        {error && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 space-y-2">
              <div className="font-bold text-sm flex items-center gap-2 text-rose-400">
                <ShieldAlert className="w-5 h-5" />
                CRYPTOGRAPHIC VERIFICATION FAILED
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">{error}</p>
            </div>
            <div className="flex justify-end">
              <button
                onClick={() => setError(null)}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 transition"
              >
                Try Again
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
