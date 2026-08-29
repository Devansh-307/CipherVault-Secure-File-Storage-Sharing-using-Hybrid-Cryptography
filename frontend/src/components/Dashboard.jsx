import React, { useState, useEffect } from 'react';
import {
  Lock,
  Database,
  Users,
  ShieldAlert,
  Cpu,
  Layers,
  Key,
  CheckCheck,
  History,
  ShieldCheck,
  AlertTriangle,
  ArrowRight,
} from 'lucide-react';
import { ApiService, formatBytes } from '../services/api';

export const Dashboard = ({ onNavigateTab }) => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await ApiService.getSecurityStats();
        setStats(data);
      } catch (err) {
        console.warn('Failed to fetch stats:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  return (
    <div className="space-y-6">
      {/* 4 Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="glass-panel p-4">
          <div className="text-[11px] text-slate-400 font-medium">Secured Files</div>
          <div className="text-2xl font-bold text-sky-400 mt-1">
            {loading ? '...' : stats?.total_files_encrypted || 0}
          </div>
          <div className="text-[10px] text-slate-500 mt-1 flex items-center gap-1">
            <Lock className="w-3 h-3 text-sky-400" /> AES-256-GCM Encrypted
          </div>
        </div>

        <div className="glass-panel p-4">
          <div className="text-[11px] text-slate-400 font-medium">Total Encrypted Volume</div>
          <div className="text-2xl font-bold text-indigo-400 mt-1">
            {loading ? '...' : formatBytes(stats?.total_bytes_secured || 0)}
          </div>
          <div className="text-[10px] text-slate-500 mt-1 flex items-center gap-1">
            <Database className="w-3 h-3 text-indigo-400" /> Zero Plaintext
          </div>
        </div>

        <div className="glass-panel p-4">
          <div className="text-[11px] text-slate-400 font-medium">Active Share Grants</div>
          <div className="text-2xl font-bold text-emerald-400 mt-1">
            {loading ? '...' : stats?.total_shares_active || 0}
          </div>
          <div className="text-[10px] text-slate-500 mt-1 flex items-center gap-1">
            <Users className="w-3 h-3 text-emerald-400" /> RSA-OAEP Wrapped
          </div>
        </div>

        <div className="glass-panel p-4">
          <div className="text-[11px] text-slate-400 font-medium">Tamper Attacks Blocked</div>
          <div className="text-2xl font-bold text-rose-400 mt-1">
            {loading ? '...' : stats?.tamper_attempts_blocked || 0}
          </div>
          <div className="text-[10px] text-slate-500 mt-1 flex items-center gap-1">
            <ShieldAlert className="w-3 h-3 text-rose-400" /> 100% Tag Integrity
          </div>
        </div>
      </div>

      {/* Cryptographic Architecture Card */}
      <div className="glass-panel p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-slate-100 flex items-center gap-2">
            <Cpu className="w-4 h-4 text-sky-400" />
            Hybrid Cryptosystem Architecture Protocol
          </h3>
          <span className="badge-crypto badge-success">
            {stats?.system_security_rating || 'Enterprise Grade A+'}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800">
            <div className="font-bold text-sky-400 flex items-center gap-1.5 mb-1.5">
              <Layers className="w-4 h-4" /> 1. Bulk Encryption
            </div>
            <p className="text-slate-400 leading-relaxed">
              Payload encrypted using <strong>AES-256-GCM</strong> with unique per-file session key, 96-bit nonce, and 128-bit authentication tag.
            </p>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800">
            <div className="font-bold text-indigo-400 flex items-center gap-1.5 mb-1.5">
              <Key className="w-4 h-4" /> 2. Asymmetric Key Wrapper
            </div>
            <p className="text-slate-400 leading-relaxed">
              AES session key is encapsulated with recipient's <strong>RSA-2048/4096 OAEP</strong> public key. Eliminates insecure shared secrets.
            </p>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800">
            <div className="font-bold text-emerald-400 flex items-center gap-1.5 mb-1.5">
              <CheckCheck className="w-4 h-4" /> 3. Integrity & Signature
            </div>
            <p className="text-slate-400 leading-relaxed">
              <strong>SHA-256</strong> hash checksum verified on every download, coupled with <strong>RSA-PSS</strong> digital signatures for non-repudiation.
            </p>
          </div>
        </div>
      </div>

      {/* Recent Security Activity Stream */}
      <div className="glass-panel p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
            <History className="w-4 h-4 text-indigo-400" />
            Live Security Audit Stream
          </h3>
          <button
            onClick={() => onNavigateTab('audit')}
            className="text-xs text-sky-400 hover:underline flex items-center gap-1"
          >
            <span>View Full Audit Trail</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        <div className="space-y-2.5">
          {!stats?.recent_security_events || stats.recent_security_events.length === 0 ? (
            <div className="text-xs text-slate-500 py-4 text-center">No security logs recorded yet.</div>
          ) : (
            stats.recent_security_events.slice(0, 5).map((log) => {
              const isCritical = log.status === 'CRITICAL' || log.action.includes('FAIL') || log.action.includes('TAMPER');
              const isWarning = log.status === 'WARNING';
              const badgeClass = isCritical ? 'badge-danger' : isWarning ? 'badge-warning' : 'badge-success';
              const Icon = isCritical ? ShieldAlert : isWarning ? AlertTriangle : ShieldCheck;

              return (
                <div
                  key={log.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-slate-900/40 border border-slate-800/80"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-2 rounded-lg ${
                        isCritical
                          ? 'bg-rose-500/10 text-rose-400'
                          : isWarning
                          ? 'bg-amber-500/10 text-amber-400'
                          : 'bg-emerald-500/10 text-emerald-400'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-slate-200">{log.action}</div>
                      <div className="text-[11px] text-slate-400 truncate max-w-sm">
                        {log.details || 'Event logged'}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`badge-crypto ${badgeClass} text-[10px]`}>{log.status}</span>
                    <div className="text-[10px] text-slate-500 mt-1">
                      {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
