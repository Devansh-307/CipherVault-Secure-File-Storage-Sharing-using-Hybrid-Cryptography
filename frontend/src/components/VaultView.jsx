import React, { useState, useEffect } from 'react';
import {
  FolderLock,
  RefreshCw,
  FileCode,
  AlertTriangle,
  Shield,
  Key,
  Unlock,
  Share2,
  Bug,
  Trash2,
  Loader2,
} from 'lucide-react';
import { ApiService, formatBytes } from '../services/api';
import { useToast } from '../context/ToastContext';

export const VaultView = ({ onOpenDecrypt, onOpenShare, onOpenTamper }) => {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  const loadFiles = async () => {
    setLoading(true);
    try {
      const data = await ApiService.listFiles();
      setFiles(data);
    } catch (err) {
      showToast(err.message, 'error', 'Failed to load vault files');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFiles();
  }, []);

  const handleDelete = async (fileId, filename) => {
    if (!window.confirm(`Are you sure you want to permanently delete '${filename}' and its encrypted ciphertext?`)) {
      return;
    }
    try {
      await ApiService.deleteFile(fileId);
      showToast(`'${filename}' permanently deleted.`, 'success');
      loadFiles();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  return (
    <div className="glass-panel p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-slate-100 flex items-center gap-2">
            <FolderLock className="w-5 h-5 text-sky-400" />
            My Encrypted Files
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Files uploaded by your cryptographic identity. Ciphertext stored securely at rest.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="badge-crypto">{files.length} Files</span>
          <button
            onClick={loadFiles}
            disabled={loading}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-800 text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
              <th className="py-3 px-4">Filename & Fingerprint</th>
              <th className="py-3 px-4">Payload Size</th>
              <th className="py-3 px-4">Cryptographic Mode</th>
              <th className="py-3 px-4">Uploaded At</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {loading ? (
              <tr>
                <td colSpan="5" className="text-center py-10 text-slate-400">
                  <Loader2 className="w-6 h-6 animate-spin inline mb-2 text-sky-400" />
                  <div>Loading encrypted file registry...</div>
                </td>
              </tr>
            ) : files.length === 0 ? (
              <tr>
                <td colSpan="5" className="text-center py-12 text-slate-500">
                  <FolderLock className="w-12 h-12 inline mb-3 text-slate-600" />
                  <div className="text-base font-medium text-slate-400">Your Encrypted Vault is Empty</div>
                  <div className="text-xs text-slate-500 mt-1">
                    Upload a file to encrypt it with AES-256-GCM and RSA-2048 key encapsulation.
                  </div>
                </td>
              </tr>
            ) : (
              files.map((file) => {
                const isTampered = file.is_tampered;
                return (
                  <tr key={file.id} className="hover:bg-slate-800/30 transition duration-150">
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <div
                          className={`p-2.5 rounded-lg ${
                            isTampered
                              ? 'bg-rose-500/10 border border-rose-500/30 text-rose-400'
                              : 'bg-sky-500/10 border border-sky-500/30 text-sky-400'
                          }`}
                        >
                          {isTampered ? <AlertTriangle className="w-5 h-5" /> : <FileCode className="w-5 h-5" />}
                        </div>
                        <div>
                          <div className="font-semibold text-slate-200 text-sm flex items-center gap-2">
                            {file.original_filename}
                            {isTampered && <span className="badge-crypto badge-danger text-[10px]">Tampered</span>}
                          </div>
                          <div className="text-xs text-slate-500 mono truncate max-w-xs" title={file.file_hash}>
                            SHA-256: {file.file_hash.substring(0, 18)}...
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-xs text-slate-300">
                      <div>{formatBytes(file.file_size_bytes)}</div>
                      <div className="text-[11px] text-slate-500">
                        {formatBytes(file.encrypted_size_bytes)} (Ciphertext)
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex flex-col gap-1">
                        <span className="badge-crypto text-[11px]">
                          <Shield className="w-3 h-3" /> AES-256-GCM
                        </span>
                        <span className={`badge-crypto text-[11px] ${file.has_signature ? 'badge-success' : ''}`}>
                          <Key className="w-3 h-3" /> RSA-PSS Signed
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-xs text-slate-400">
                      {new Date(file.created_at).toLocaleDateString()} {new Date(file.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="py-4 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => onOpenDecrypt(file.id, file.original_filename, true)}
                          className="px-3 py-1.5 rounded-lg bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/30 text-xs font-medium flex items-center gap-1.5 transition"
                        >
                          <Unlock className="w-3.5 h-3.5" /> Decrypt & Verify
                        </button>
                        <button
                          onClick={() => onOpenShare(file.id, file.original_filename)}
                          className="p-1.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 text-xs transition"
                          title="Share File"
                        >
                          <Share2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onOpenTamper(file.id)}
                          className="p-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs transition"
                          title="Tamper Simulation Lab"
                        >
                          <Bug className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(file.id, file.original_filename)}
                          className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs transition"
                          title="Delete File"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
