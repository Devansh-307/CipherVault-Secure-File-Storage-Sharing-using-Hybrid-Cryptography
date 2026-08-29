import React, { useState, useEffect } from 'react';
import { FileCheck2, RefreshCw, Shield, Loader2 } from 'lucide-react';
import { ApiService } from '../services/api';
import { useToast } from '../context/ToastContext';

export const AuditLogView = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const { showToast } = useToast();

  const loadLogs = async () => {
    setLoading(true);
    try {
      const data = await ApiService.getAuditLogs(50, actionFilter || null, statusFilter || null);
      setLogs(data || []);
    } catch (err) {
      showToast(err.message, 'error', 'Failed to load audit trail');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, [actionFilter, statusFilter]);

  return (
    <div className="glass-panel p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-slate-100 flex items-center gap-2">
            <FileCheck2 className="w-5 h-5 text-sky-400" />
            SIEM Security Audit Trail & Forensics
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Immutable traceability record of all authentication, encryption, sharing, and tamper events.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="badge-crypto">{logs.length} Events</span>
          <button
            onClick={loadLogs}
            disabled={loading}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <input
          type="text"
          placeholder="Filter by action (e.g. LOGIN, TAMPER, UPLOAD)..."
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-sky-400"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-sky-400"
        >
          <option value="">All Statuses (SUCCESS, CRITICAL, WARNING, FAILURE)</option>
          <option value="SUCCESS">SUCCESS</option>
          <option value="CRITICAL">CRITICAL</option>
          <option value="WARNING">WARNING</option>
          <option value="FAILURE">FAILURE</option>
        </select>
      </div>

      {/* Logs Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-800 text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
              <th className="py-3 px-4">Timestamp</th>
              <th className="py-3 px-4">Action</th>
              <th className="py-3 px-4">Initiator</th>
              <th className="py-3 px-4">Event Details</th>
              <th className="py-3 px-4 text-right">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {loading ? (
              <tr>
                <td colSpan="5" className="text-center py-10 text-slate-400">
                  <Loader2 className="w-6 h-6 animate-spin inline mb-2 text-sky-400" />
                  <div>Loading SIEM security event stream...</div>
                </td>
              </tr>
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan="5" className="text-center py-12 text-slate-500">
                  <Shield className="w-10 h-10 inline mb-2 text-slate-600" />
                  <div>No matching security events found.</div>
                </td>
              </tr>
            ) : (
              logs.map((log) => {
                const isCritical = log.status === 'CRITICAL' || log.action.includes('FAIL') || log.action.includes('TAMPER');
                const isWarning = log.status === 'WARNING';
                const badgeClass = isCritical ? 'badge-danger' : isWarning ? 'badge-warning' : 'badge-success';

                return (
                  <tr key={log.id} className="hover:bg-slate-800/30 transition text-xs">
                    <td className="py-3 px-4 mono text-slate-400 whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-200">
                      <span className={`badge-crypto ${badgeClass}`}>{log.action}</span>
                    </td>
                    <td className="py-3 px-4 text-slate-300">
                      {log.username ? `@${log.username}` : <span className="text-slate-600">System / Anonymous</span>}
                    </td>
                    <td className="py-3 px-4 text-slate-300 font-mono text-[11px] max-w-md break-all">
                      {log.details || 'N/A'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className={`badge-crypto ${badgeClass} text-[10px] uppercase font-bold`}>
                        {log.status}
                      </span>
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
