import React from 'react';
import {
  LayoutDashboard,
  FolderLock,
  Share2,
  Bug,
  Activity,
  FileCheck2,
  Key,
  CloudUpload,
  PlusCircle,
} from 'lucide-react';

export const Sidebar = ({ activeTab, onSelectTab, onOpenUpload }) => {
  const tabs = [
    { id: 'dashboard', label: 'Overview & Health', icon: LayoutDashboard, color: 'text-sky-400' },
    { id: 'vault', label: 'My Encrypted Vault', icon: FolderLock, color: 'text-sky-400' },
    { id: 'shared', label: 'Shared With Me', icon: Share2, color: 'text-indigo-400' },
    { id: 'tamper', label: 'Tamper & Security Lab', icon: Bug, color: 'text-amber-400' },
    { id: 'benchmark', label: 'Crypto Benchmark Lab', icon: Activity, color: 'text-emerald-400' },
    { id: 'audit', label: 'SIEM Audit Stream', icon: FileCheck2, color: 'text-sky-400' },
    { id: 'keys', label: 'Cryptographic Inspector', icon: Key, color: 'text-purple-400' },
  ];

  return (
    <aside className="space-y-6">
      {/* Navigation Menu */}
      <div className="glass-panel p-3 space-y-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onSelectTab(tab.id)}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all text-left ${
                isActive
                  ? 'bg-sky-500/10 text-sky-400 border border-sky-500/30 shadow-md shadow-sky-500/10'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 border border-transparent'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-sky-400' : tab.color}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Quick Encrypt Action Card */}
      <div className="glass-panel p-5 border border-sky-500/20 text-center relative overflow-hidden">
        <div className="w-10 h-10 mx-auto rounded-xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400 mb-3 shadow-inner">
          <CloudUpload className="w-5 h-5" />
        </div>
        <h4 className="text-sm font-semibold text-slate-200">Secure File Encryptor</h4>
        <p className="text-xs text-slate-400 mt-1 mb-4">
          Encrypt payload with dynamic AES-256 session key & RSA recipient wrappers.
        </p>
        <button
          onClick={onOpenUpload}
          className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white text-xs font-semibold shadow-lg shadow-sky-500/20 flex items-center justify-center gap-1.5 transition active:scale-98"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Encrypt New File</span>
        </button>
      </div>
    </aside>
  );
};
