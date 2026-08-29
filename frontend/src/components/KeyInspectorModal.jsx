import React from 'react';
import { Key, X, Copy, Check } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export const KeyInspectorModal = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [copied, setCopied] = React.useState(false);

  if (!isOpen || !user) return null;

  const handleCopy = () => {
    if (user.public_key) {
      navigator.clipboard.writeText(user.public_key);
      setCopied(true);
      showToast('Public key copied to clipboard!', 'success');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 bg-[#030712]/90 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="glass-panel glass-panel-glow w-full max-w-2xl p-6 relative border border-purple-500/30 bg-[#0d121d]/95 space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <Key className="w-5 h-5 text-purple-400" />
            <span>RSA Keypair & Envelope Inspector</span>
          </h3>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                RSA-2048 Public Key (PEM Format)
              </label>
              <button
                onClick={handleCopy}
                className="px-2.5 py-1 rounded bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/30 text-xs flex items-center gap-1.5 transition"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied!' : 'Copy Public Key'}</span>
              </button>
            </div>
            <pre className="p-4 rounded-xl bg-[#090d16] border border-slate-800 text-xs font-mono text-purple-300 max-h-52 overflow-y-auto whitespace-pre-wrap select-all">
              {user.public_key || 'No Public Key Available'}
            </pre>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800">
              <div className="font-semibold text-slate-200 mb-1">Key Encryption Function</div>
              <div className="mono text-sky-400 font-bold">PBKDF2-HMAC-SHA256</div>
              <div className="text-[11px] text-slate-500 mt-1">100,000 Iterations</div>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800">
              <div className="font-semibold text-slate-200 mb-1">Asymmetric Padding</div>
              <div className="mono text-indigo-400 font-bold">RSA-OAEP (MGF1-SHA256)</div>
              <div className="text-[11px] text-slate-500 mt-1">NIST SP 800-56B</div>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800">
              <div className="font-semibold text-slate-200 mb-1">Zero Plaintext Guarantee</div>
              <div className="mono text-emerald-400 font-bold">Client Encrypted KEK</div>
              <div className="text-[11px] text-slate-500 mt-1">Private key never exposed</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
