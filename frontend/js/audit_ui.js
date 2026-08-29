// SIEM Audit Logging and Security Activity Dashboard UI

class AuditManager {
  static init() {
    this.setupEventListeners();
  }

  static setupEventListeners() {
    const refreshBtn = document.getElementById('refresh-audit-btn');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => this.loadAuditLogs());
    }

    const filterAction = document.getElementById('audit-filter-action');
    const filterStatus = document.getElementById('audit-filter-status');

    if (filterAction) filterAction.addEventListener('input', () => this.loadAuditLogs());
    if (filterStatus) filterStatus.addEventListener('change', () => this.loadAuditLogs());
  }

  static async loadDashboardStats() {
    try {
      const stats = await ApiClient.getSecurityStats();
      
      const filesEncEl = document.getElementById('stat-total-files');
      const bytesSecEl = document.getElementById('stat-total-bytes');
      const sharesActiveEl = document.getElementById('stat-active-shares');
      const tamperBlockedEl = document.getElementById('stat-tamper-blocked');
      const ratingEl = document.getElementById('stat-security-rating');

      if (filesEncEl) filesEncEl.textContent = stats.total_files_encrypted;
      if (bytesSecEl) bytesSecEl.textContent = formatBytes(stats.total_bytes_secured);
      if (sharesActiveEl) sharesActiveEl.textContent = stats.total_shares_active;
      if (tamperBlockedEl) tamperBlockedEl.textContent = stats.tamper_attempts_blocked;
      if (ratingEl) ratingEl.textContent = stats.system_security_rating;

      // Render recent activities snippet in dashboard
      this.renderRecentActivitySnippet(stats.recent_security_events);
    } catch (err) {
      console.warn('Failed to load dashboard stats:', err);
    }
  }

  static renderRecentActivitySnippet(events) {
    const container = document.getElementById('dashboard-recent-activity');
    if (!container) return;

    if (!events || events.length === 0) {
      container.innerHTML = `<div class="text-xs text-slate-500 py-4 text-center">No security logs recorded yet.</div>`;
      return;
    }

    container.innerHTML = events.slice(0, 5).map((log) => {
      const isCritical = log.status === 'CRITICAL' || log.action.includes('FAIL') || log.action.includes('TAMPER');
      const isWarning = log.status === 'WARNING';
      const isSuccess = log.status === 'SUCCESS';

      const iconName = isCritical ? 'shield-alert' : isWarning ? 'alert-triangle' : 'shield-check';
      const badgeClass = isCritical ? 'badge-danger' : isWarning ? 'badge-warning' : 'badge-success';

      return `
        <div class="flex items-center justify-between p-3 rounded-lg bg-slate-900/40 border border-slate-800/80">
          <div class="flex items-center gap-3">
            <div class="p-2 rounded-lg ${isCritical ? 'bg-rose-500/10 text-rose-400' : isWarning ? 'bg-amber-500/10 text-amber-400' : 'bg-emerald-500/10 text-emerald-400'}">
              <i data-lucide="${iconName}" class="w-4 h-4"></i>
            </div>
            <div>
              <div class="text-xs font-semibold text-slate-200">${log.action}</div>
              <div class="text-[11px] text-slate-400 truncate max-w-[280px]">${log.details || 'Event logged'}</div>
            </div>
          </div>
          <div class="text-right">
            <span class="badge-crypto ${badgeClass} text-[10px]">${log.status}</span>
            <div class="text-[10px] text-slate-500 mt-1">${new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
          </div>
        </div>
      `;
    }).join('');

    if (window.lucide) lucide.createIcons();
  }

  static async loadAuditLogs() {
    const container = document.getElementById('audit-table-body');
    const actionInput = document.getElementById('audit-filter-action');
    const statusSelect = document.getElementById('audit-filter-status');

    const action = actionInput ? actionInput.value.trim() : null;
    const status = statusSelect ? statusSelect.value : null;

    if (!container) return;

    container.innerHTML = `
      <tr>
        <td colspan="5" class="text-center py-8 text-slate-400">
          <i data-lucide="loader-2" class="w-6 h-6 animate-spin inline mb-2 text-sky-400"></i>
          <div>Loading SIEM security event stream...</div>
        </td>
      </tr>
    `;
    if (window.lucide) lucide.createIcons();

    try {
      const logs = await ApiClient.getAuditLogs(50, action, status);
      this.renderAuditLogsTable(logs);
    } catch (err) {
      container.innerHTML = `
        <tr>
          <td colspan="5" class="text-center py-8 text-rose-400">
            <div>Error loading audit trail: ${err.message}</div>
          </td>
        </tr>
      `;
    }
  }

  static renderAuditLogsTable(logs) {
    const container = document.getElementById('audit-table-body');
    const countBadge = document.getElementById('audit-logs-count');
    if (countBadge) countBadge.textContent = `${logs.length} Events`;

    if (!logs || logs.length === 0) {
      container.innerHTML = `
        <tr>
          <td colspan="5" class="text-center py-12 text-slate-500">
            <i data-lucide="shield" class="w-10 h-10 inline mb-2 text-slate-600"></i>
            <div>No matching security events found.</div>
          </td>
        </tr>
      `;
      if (window.lucide) lucide.createIcons();
      return;
    }

    container.innerHTML = logs.map((log) => {
      const isCritical = log.status === 'CRITICAL' || log.action.includes('FAIL') || log.action.includes('TAMPER');
      const isWarning = log.status === 'WARNING';
      const badgeClass = isCritical ? 'badge-danger' : isWarning ? 'badge-warning' : 'badge-success';

      return `
        <tr class="border-b border-slate-800/60 hover:bg-slate-800/30 transition text-xs">
          <td class="py-3 px-4 mono text-slate-400 whitespace-nowrap">
            ${new Date(log.timestamp).toLocaleString()}
          </td>
          <td class="py-3 px-4 font-semibold text-slate-200">
            <span class="badge-crypto ${badgeClass}">
              ${log.action}
            </span>
          </td>
          <td class="py-3 px-4 text-slate-300">
            ${log.username ? `@${log.username}` : '<span class="text-slate-600">System / Anonymous</span>'}
          </td>
          <td class="py-3 px-4 text-slate-300 font-mono text-[11px] max-w-md break-all">
            ${log.details || 'N/A'}
          </td>
          <td class="py-3 px-4 text-right">
            <span class="badge-crypto ${badgeClass} text-[10px] uppercase font-bold">
              ${log.status}
            </span>
          </td>
        </tr>
      `;
    }).join('');

    if (window.lucide) lucide.createIcons();
  }
}

window.AuditManager = AuditManager;
document.addEventListener('DOMContentLoaded', () => AuditManager.init());
