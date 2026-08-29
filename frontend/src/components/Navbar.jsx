import React from 'react';
import { ShieldCheck, FileCode, LogOut, Key, ExternalLink, FileDown } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const Navbar = ({ onOpenKeyInspector }) => {
  const { user, logout } = useAuth();

  return (
    <header className="border-b border-slate-800 bg-[#0d121d]/85 backdrop-blur-md sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-sky-500/10 border border-sky-500/30 text-sky-400 shadow-md shadow-sky-500/10">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="font-bold text-base text-slate-100 flex items-center gap-2">
              CipherVault <span className="badge-crypto text-[10px] uppercase font-mono">React v1.0</span>
            </div>
            <div className="text-[11px] text-slate-400">AES-256-GCM + RSA-2048 OAEP + SHA-256 PSS</div>
          </div>
        </div>

        {/* Action Controls & User Identity */}
        <div className="flex items-center gap-3">
          {/* Direct Word Document Download Button */}
          <a
            href="/api/download-report"
            download="CIPHERVAULT_PROJECT_REPORT_AND_INTERVIEW_GUIDE.docx"
            className="px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 text-xs font-semibold flex items-center gap-1.5 transition border border-emerald-500/30 shadow-sm"
            title="Download Word Report (.docx)"
          >
            <FileDown className="w-4 h-4 text-emerald-400" />
            <span className="hidden sm:inline">Download Word Report (.docx)</span>
            <span className="sm:hidden">Report (.docx)</span>
          </a>

          {/* FastAPI Docs */}
          <a
            href="/docs"
            target="_blank"
            rel="noreferrer"
            className="px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 text-xs font-medium flex items-center gap-1.5 transition border border-slate-700 hidden md:flex"
          >
            <FileCode className="w-3.5 h-3.5 text-sky-400" />
            <span>FastAPI Docs</span>
            <ExternalLink className="w-3 h-3 text-slate-500" />
          </a>

          {user && (
            <button
              onClick={onOpenKeyInspector}
              className="px-3 py-1.5 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/30 text-xs font-medium flex items-center gap-1.5 transition"
              title="Inspect RSA Public Key"
            >
              <Key className="w-3.5 h-3.5 text-purple-400" />
              <span>RSA Key</span>
            </button>
          )}

          {user && (
            <div className="flex items-center gap-3 pl-3 border-l border-slate-800">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center text-white font-bold text-xs shadow-md shadow-sky-500/20">
                {(user.username || 'U').substring(0, 2).toUpperCase()}
              </div>
              <div className="text-left hidden sm:block">
                <div className="text-xs font-semibold text-slate-200">{user.full_name || user.username}</div>
                <div className="text-[10px] text-sky-400 font-mono">@{user.username} ({user.role.toUpperCase()})</div>
              </div>
              <button
                onClick={logout}
                className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition"
                title="Log Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
