import React, { useState } from 'react';
import { useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { AuthModal } from './components/AuthModal';
import { Dashboard } from './components/Dashboard';
import { VaultView } from './components/VaultView';
import { SharedWithMeView } from './components/SharedWithMeView';
import { TamperLab } from './components/TamperLab';
import { BenchmarkLab } from './components/BenchmarkLab';
import { AuditLogView } from './components/AuditLogView';
import { UploadModal } from './components/UploadModal';
import { DecryptModal } from './components/DecryptModal';
import { ShareModal } from './components/ShareModal';
import { KeyInspectorModal } from './components/KeyInspectorModal';
import { Loader2 } from 'lucide-react';

export function App() {
  const { isAuthenticated, loading } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');

  // Modals state
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isKeyInspectorOpen, setIsKeyInspectorOpen] = useState(false);
  const [decryptState, setDecryptState] = useState({ isOpen: false, fileId: null, filename: '', isOwner: true });
  const [shareState, setShareState] = useState({ isOpen: false, fileId: null, filename: '' });
  const [tamperTargetFileId, setTamperTargetFileId] = useState(null);

  const handleOpenDecrypt = (fileId, filename, isOwner = true) => {
    setDecryptState({ isOpen: true, fileId, filename, isOwner });
  };

  const handleOpenShare = (fileId, filename) => {
    setShareState({ isOpen: true, fileId, filename });
  };

  const handleOpenTamper = (fileId) => {
    setTamperTargetFileId(fileId);
    setActiveTab('tamper');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#07090e] flex items-center justify-center text-slate-400">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-sky-400" />
          <div className="text-sm font-medium">Initializing Zero-Trust Cryptographic Engine...</div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AuthModal />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#07090e] text-slate-100 antialiased selection:bg-sky-500/30 selection:text-sky-300">
      {/* Top Navbar */}
      <Navbar onOpenKeyInspector={() => setIsKeyInspectorOpen(true)} />

      {/* Main Grid Layout */}
      <div className="max-w-7xl mx-auto px-6 py-8 flex-1 w-full grid grid-cols-1 md:grid-cols-12 gap-8">
        {/* Left Sidebar */}
        <div className="md:col-span-3">
          <Sidebar
            activeTab={activeTab}
            onSelectTab={(tabId) => {
              if (tabId === 'keys') {
                setIsKeyInspectorOpen(true);
              } else {
                setActiveTab(tabId);
              }
            }}
            onOpenUpload={() => setIsUploadOpen(true)}
          />
        </div>

        {/* Center Main Tab View */}
        <main className="md:col-span-9">
          {activeTab === 'dashboard' && <Dashboard onNavigateTab={(tab) => setActiveTab(tab)} />}
          {activeTab === 'vault' && (
            <VaultView
              onOpenDecrypt={handleOpenDecrypt}
              onOpenShare={handleOpenShare}
              onOpenTamper={handleOpenTamper}
            />
          )}
          {activeTab === 'shared' && <SharedWithMeView onOpenDecrypt={handleOpenDecrypt} />}
          {activeTab === 'tamper' && (
            <TamperLab
              onOpenDecrypt={handleOpenDecrypt}
              initialFileId={tamperTargetFileId}
            />
          )}
          {activeTab === 'benchmark' && <BenchmarkLab />}
          {activeTab === 'audit' && <AuditLogView />}
        </main>
      </div>

      {/* Modals */}
      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onSuccess={() => {
          if (activeTab === 'vault') setActiveTab('dashboard');
          setTimeout(() => setActiveTab('vault'), 50);
        }}
      />

      <DecryptModal
        isOpen={decryptState.isOpen}
        fileId={decryptState.fileId}
        filename={decryptState.filename}
        isOwner={decryptState.isOwner}
        onClose={() => setDecryptState({ isOpen: false, fileId: null, filename: '', isOwner: true })}
      />

      <ShareModal
        isOpen={shareState.isOpen}
        fileId={shareState.fileId}
        filename={shareState.filename}
        onClose={() => setShareState({ isOpen: false, fileId: null, filename: '' })}
      />

      <KeyInspectorModal
        isOpen={isKeyInspectorOpen}
        onClose={() => setIsKeyInspectorOpen(false)}
      />
    </div>
  );
}
