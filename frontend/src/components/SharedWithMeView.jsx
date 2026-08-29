import React, { useState, useEffect } from 'react';
import { Share2, RefreshCw, FileCheck, UserCheck, Key, Loader2 } from 'lucide-react';
import { ApiService, formatBytes } from '../services/api';
import { useToast } from '../context/ToastContext';

export const SharedWithMeView = ({ onOpenDecrypt }) => {
  const [sharedFiles, setSharedFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  const loadSharedFiles = async () => {
    setLoading(true);
    try {
      const data = await ApiService.listSharedWithMe();
      setSharedFiles(data);
    } catch (err) {
      showToast(err.message, 'error', 'Failed to load shared files');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSharedFiles();
  }, []);

  return (
    <div className="glass-panel p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-slate-100 flex items-center gap-2">
            <Share2 className="w-5 h-5 text-indigo-400" />
            Files Shared With Me
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Files encrypted with your RSA Public Key. Decryptable exclusively by your Private Key.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="badge-crypto badge-success">{sharedFiles.length} Shared Files</span>
          <button
            onClick={loadSharedFiles}
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
              <th className="py-3 px-4">File Name</th>
              <th className="py-3 px-4">Sender</th>
              <th className="py-3 px-4">Size</th>
              <th className="py-3 px-4">Access Expiry</th>
              <th className="py-3 px-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {loading ? (
              <tr>
                <td colSpan="5" className="text-center py-10 text-slate-400">
                  <Loader2 className="w-6 h-6 animate-spin inline mb-2 text-indigo-400" />
                  <div>Loading shared files...</div>
                </td>
              </tr>
            ) : sharedFiles.length === 0 ? (
              <tr>
                <td colSpan="5" className="text-center py-12 text-slate-500">
                  <Share2 className="w-12 h-12 inline mb-3 text-slate-600" />
                  <div className="text-base font-medium text-slate-400">No Shared Files Found</div>
                  <div className="text-xs text-slate-500 mt-1">
                    When other users share encrypted files with your RSA public key, they will appear here.
                  </div>
                </td>
              </tr>
            ) : (
              sharedFiles.map((file) => {
                const isExpired = file.is_expired;
                const isTampered = file.is_tampered;

                return (
                  <tr key={file.share_id} className="hover:bg-slate-800/30 transition duration-150">
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-lg bg-indigo-500/10 border border-indigo-500/30 text-indigo-400">
                          <FileCheck className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="font-semibold text-slate-200 text-sm flex items-center gap-2">
                            {file.filename}
                            {isTampered && <span className="badge-crypto badge-danger text-[10px]">Tampered</span>}
                            {isExpired && <span className="badge-crypto badge-warning text-[10px]">Expired</span>}
                          </div>
                          <div className="text-xs text-slate-500 mono truncate max-w-xs" title={file.file_hash}>
                            SHA-256: {file.file_hash.substring(0, 18)}...
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-xs text-slate-300">
                      <div className="font-medium text-slate-200 flex items-center gap-1.5">
                        <UserCheck className="w-3.5 h-3.5 text-indigo-400" />
                        @{file.sender_username}
                      </div>
                    </td>
                    <td className="py-4 px-4 text-xs text-slate-300">
                      {formatBytes(file.file_size_bytes)}
                    </td>
                    <td className="py-4 px-4 text-xs">
                      {file.expires_at ? (
                        <span className={isExpired ? 'text-rose-400 font-semibold' : 'text-amber-400'}>
                          {new Date(file.expires_at).toLocaleString()}
                        </span>
                      ) : (
                        <span className="text-slate-500">Permanent</span>
                      )}
                    </td>
                    <td className="py-4 px-4 text-right">
                      <button
                        disabled={isExpired}
                        onClick={() => onOpenDecrypt(file.file_id, file.filename, false)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition ml-auto ${
                          isExpired
                            ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                            : 'bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
                        }`}
                      >
                        <Key className="w-3.5 h-3.5" /> Decrypt with My Key
                      </button>
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
