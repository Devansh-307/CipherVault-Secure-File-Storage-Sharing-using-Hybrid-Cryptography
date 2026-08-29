import React, { useState, useEffect } from 'react';
import { Bug, RefreshCw, Zap, AlertTriangle, ShieldCheck, ShieldAlert, Loader2 } from 'lucide-react';
import { ApiService, formatBytes } from '../services/api';
import { useToast } from '../context/ToastContext';

export const TamperLab = ({ onOpenDecrypt, initialFileId }) => {
  const [files, setFiles] = useState([]);
  const [selectedFileId, setSelectedFileId] = useState(initialFileId || '');
  const [tamperMode, setTamperMode] = useState('flip_byte');
  const [loading, setLoading] = useState(false);
  const [tampering, setTampering] = useState(false);
  const [result, setResult] = useState(null);
  const { showToast } = useToast();

  const loadFiles = async () => {
    setLoading(true);
    try {
      const data = await ApiService.listFiles();
      setFiles(data || []);
      if (!selectedFileId && data?.length > 0) {
        setSelectedFileId(data[0].id);
      }
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFiles();
  }, []);

  useEffect(() => {
    if (initialFileId) {
      setSelectedFileId(initialFileId);
    }
  }, [initialFileId]);

  const handleTamperSubmit = async (e) => {
    e.preventDefault();
    if (!selectedFileId) {
      showToast('Please select a file to simulate tampering on.', 'error');
      return;
    }

    setTampering(true);
    try {
      const res = await ApiService.tamperFile(selectedFileId, tamperMode);
      setResult(res);
      showToast('Ciphertext corrupted! Now attempt decryption to observe cryptographic rejection.', 'error', 'Tamper Injected');
      loadFiles();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setTampering(false);
    }
  };

  const selectedFileObj = files.find((f) => f.id === selectedFileId);

  return (
    <div className="glass-panel p-6 border border-amber-500/30 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-slate-100 flex items-center gap-2">
            <Bug className="w-5 h-5 text-amber-400" />
            Interactive Tamper & Threat Simulation Lab
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Test and prove zero-trust integrity. Deliberately inject ciphertext bit-flips or tag corruptions and witness real-time cryptographic detection.
          </p>
        </div>
        <button
          onClick={loadFiles}
          disabled={loading}
          className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs flex items-center gap-1.5 transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Vault</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Attack Configuration Box */}
        <form onSubmit={handleTamperSubmit} className="space-y-4 p-4 rounded-xl bg-slate-900/60 border border-slate-800">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Select Target File</label>
            <select
              value={selectedFileId}
              onChange={(e) => setSelectedFileId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-amber-400"
            >
              {files.length === 0 ? (
                <option value="">No files uploaded in vault yet</option>
              ) : (
                files.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.original_filename} ({formatBytes(f.file_size_bytes)}) {f.is_tampered ? '[ALREADY TAMPERED]' : ''}
                  </option>
                ))
              )}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Simulated Attack Vector</label>
            <select
              value={tamperMode}
              onChange={(e) => setTamperMode(e.target.value)}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-amber-400"
            >
              <option value="flip_byte">Ciphertext Bit-Flip Attack (Alters 1 byte in payload)</option>
              <option value="truncate">Tag Truncation Attack (Strips AES-GCM MAC Tag)</option>
              <option value="corrupt_header">Header Corruption (Modifies initial ciphertext block)</option>
            </select>
          </div>

          <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-300/90 leading-relaxed">
            <strong>Expected Result:</strong> AES-256-GCM detects the authentication tag mismatch and raises an <span className="mono text-amber-200">IntegrityVerificationError</span> before any tampered data is decrypted.
          </div>

          <button
            type="submit"
            disabled={tampering || files.length === 0}
            className="w-full py-2.5 rounded-lg bg-gradient-to-r from-amber-500 to-rose-600 hover:from-amber-400 hover:to-rose-500 text-white text-xs font-semibold shadow-md shadow-amber-500/20 flex items-center justify-center gap-1.5 transition disabled:opacity-60"
          >
            {tampering ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Infiltrating Ciphertext Store...</span>
              </>
            ) : (
              <>
                <span>Inject Malicious Bit-Flip</span>
                <Zap className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Attack Proof / Output Area */}
        <div className="space-y-4">
          <div className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Attack Log & Proof</div>

          {result && (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 space-y-3 animate-in fade-in">
              <div className="flex items-center gap-2 font-bold text-sm text-rose-400">
                <AlertTriangle className="w-5 h-5" />
                ATTACK INJECTION EXECUTED
              </div>
              <p className="text-xs leading-relaxed text-slate-300">{result.message}</p>
              <div className="pt-3 border-t border-rose-500/20 flex items-center justify-between">
                <span className="text-[11px] text-slate-400">
                  Target File: <span className="mono text-rose-300">{selectedFileObj?.original_filename || 'File'}</span>
                </span>
                <button
                  onClick={() => onOpenDecrypt(result.file_id, selectedFileObj?.original_filename || 'Tampered File', true)}
                  className="px-3 py-1.5 rounded-lg bg-rose-500 hover:bg-rose-600 text-white text-xs font-semibold flex items-center gap-1.5 transition"
                >
                  <ShieldAlert className="w-3.5 h-3.5" /> Test Decryption Failure Live
                </button>
              </div>
            </div>
          )}

          <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 text-xs text-slate-400 space-y-2">
            <div className="font-semibold text-slate-200 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" /> Why this proves zero-trust security:
            </div>
            <p className="leading-relaxed">
              Standard cloud drives only check TLS in transit. If an attacker with server root access modifies the stored file, traditional systems deliver corrupted files silently.
            </p>
            <p className="leading-relaxed">
              With our Hybrid GCM + SHA-256 design, tamper attempts are rejected mathematically without executing untrusted payload.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
