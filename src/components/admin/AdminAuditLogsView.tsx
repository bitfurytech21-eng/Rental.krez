import React, { useState, useMemo } from 'react';
import { AuditLog, AuditCategory, AuditSeverity, ledger } from '../../lib/ledger';
import { formatDate } from '../../lib/utils';
import {
  ClipboardList,
  Search,
  Filter,
  Download,
  Printer,
  RefreshCw,
  Trash2,
  Shield,
  UserCheck,
  Coins,
  Lock,
  AlertTriangle,
  CheckCircle2,
  Info,
  Clock,
  FileText,
  UserX,
  LogIn,
  KeyRound,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Database,
  Check,
  Copy,
  X
} from 'lucide-react';
import { printAuditLogReport, AuditReportPrintData } from '../../lib/printService';

interface AdminAuditLogsViewProps {
  currentAdminEmail?: string;
}

export const AdminAuditLogsView: React.FC<AdminAuditLogsViewProps> = ({
  currentAdminEmail = 'admin@kretz.com',
}) => {
  const [logs, setLogs] = useState<AuditLog[]>(() => ledger.getAuditLogs());
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('all');
  const [selectedTimeframe, setSelectedTimeframe] = useState<'all' | 'today' | '7d' | '30d'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [inspectModalLog, setInspectModalLog] = useState<AuditLog | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [confirmPurge, setConfirmPurge] = useState(false);

  const refreshLogs = () => {
    setLogs(ledger.getAuditLogs());
    setActionNotice('Audit trail refreshed from local persistent ledger storage.');
    setTimeout(() => setActionNotice(null), 3000);
  };

  const handlePrintAuditReport = () => {
    const reportData: AuditReportPrintData = {
      generatedAt: new Date().toLocaleString('en-US'),
      generatedBy: currentAdminEmail,
      filterApplied: `Category: ${selectedCategory.toUpperCase()}, Severity: ${selectedSeverity.toUpperCase()}, Timeframe: ${selectedTimeframe.toUpperCase()}`,
      totalEventsCount: filteredLogs.length,
      logs: filteredLogs
    };
    printAuditLogReport(reportData);
  };

  const handleSeedSamples = () => {
    const updated = ledger.seedComplianceSampleAuditLogs();
    setLogs(updated);
    setActionNotice('Compliance audit trail populated with verified audit events.');
    setTimeout(() => setActionNotice(null), 3000);
  };

  const handleClearLogs = () => {
    ledger.clearAuditLogs();
    setLogs([]);
    setConfirmPurge(false);
    setActionNotice('Audit logs purged from local storage.');
    setTimeout(() => setActionNotice(null), 3000);
  };

  const handleExport = (format: 'json' | 'csv') => {
    const dataToExport = filteredLogs;
    if (dataToExport.length === 0) {
      setActionNotice('No audit logs available to export under current filters.');
      setTimeout(() => setActionNotice(null), 3000);
      return;
    }

    if (format === 'json') {
      const blob = new Blob([JSON.stringify(dataToExport, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `kretz-compliance-audit-trail-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } else {
      // CSV Export
      const headers = ['ID', 'Timestamp', 'Action', 'Category', 'Severity', 'Actor Email', 'Target User', 'IP Address', 'Details'];
      const rows = dataToExport.map(l => [
        l.id,
        l.timestamp,
        l.action,
        l.category || 'system',
        l.severity || 'info',
        l.adminEmail,
        l.targetUserEmail || '',
        l.ipAddress || '',
        `"${(l.details || '').replace(/"/g, '""')}"`
      ]);
      const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `kretz-compliance-audit-trail-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    }
    setActionNotice(`Exported ${dataToExport.length} audit records in ${format.toUpperCase()} format.`);
    setTimeout(() => setActionNotice(null), 3000);
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Helper to format relative time
  const getRelativeTime = (timestamp: string) => {
    try {
      const now = Date.now();
      const past = new Date(timestamp).getTime();
      const diffMs = now - past;
      const diffSecs = Math.floor(diffMs / 1000);
      const diffMins = Math.floor(diffSecs / 60);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffSecs < 60) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays < 30) return `${diffDays}d ago`;
      return formatDate(timestamp);
    } catch (e) {
      return timestamp;
    }
  };

  // Filtered logs
  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      // Category filter
      if (selectedCategory !== 'all') {
        const cat = log.category || 'system';
        if (cat !== selectedCategory) return false;
      }

      // Severity filter
      if (selectedSeverity !== 'all') {
        const sev = log.severity || 'info';
        if (sev !== selectedSeverity) return false;
      }

      // Timeframe filter
      if (selectedTimeframe !== 'all') {
        const logTime = new Date(log.timestamp).getTime();
        const now = Date.now();
        if (selectedTimeframe === 'today') {
          const oneDayAgo = now - 24 * 60 * 60 * 1000;
          if (logTime < oneDayAgo) return false;
        } else if (selectedTimeframe === '7d') {
          const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
          if (logTime < sevenDaysAgo) return false;
        } else if (selectedTimeframe === '30d') {
          const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
          if (logTime < thirtyDaysAgo) return false;
        }
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchAction = log.action.toLowerCase().includes(q);
        const matchDetails = log.details.toLowerCase().includes(q);
        const matchEmail = log.adminEmail.toLowerCase().includes(q);
        const matchTarget = (log.targetUserEmail || '').toLowerCase().includes(q);
        const matchId = log.id.toLowerCase().includes(q);
        const matchIp = (log.ipAddress || '').toLowerCase().includes(q);
        if (!matchAction && !matchDetails && !matchEmail && !matchTarget && !matchId && !matchIp) {
          return false;
        }
      }

      return true;
    });
  }, [logs, selectedCategory, selectedSeverity, selectedTimeframe, searchQuery]);

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / pageSize));
  const paginatedLogs = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredLogs.slice(start, start + pageSize);
  }, [filteredLogs, currentPage, pageSize]);

  // Summary Metrics
  const stats = useMemo(() => {
    const total = logs.length;
    const authLogs = logs.filter(l => l.category === 'auth' || l.action.includes('LOGIN') || l.action.includes('AUTH'));
    const loginFailures = authLogs.filter(l => l.action.includes('FAILED') || l.severity === 'critical' || l.severity === 'warning').length;
    const statusChanges = logs.filter(l => l.category === 'user_status' || l.action.includes('STATUS') || l.action.includes('SUSPEND')).length;
    const financialActions = logs.filter(l => l.category === 'financial' || l.action.includes('DEPOSIT') || l.action.includes('WITHDRAW') || l.action.includes('INVEST')).length;
    const kycCompliance = logs.filter(l => l.category === 'compliance' || l.action.includes('KYC') || l.action.includes('DOCUMENT')).length;
    const passGateEvents = logs.filter(l => l.category === 'security' || l.action.includes('PASSGATE')).length;

    return {
      total,
      authCount: authLogs.length,
      loginFailures,
      statusChanges,
      financialActions,
      kycCompliance,
      passGateEvents
    };
  }, [logs]);

  // Action Badge styling helper
  const getActionBadge = (action: string, _severity?: AuditSeverity) => {
    const upper = action.toUpperCase();

    if (upper.includes('PASSGATE_UNLOCKED') || upper.includes('LOGIN_SUCCESS')) {
      return (
        <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#6FD8B0]">
          <CheckCircle2 className="w-3.5 h-3.5 text-[#6FD8B0]" />
          <span>{action}</span>
        </span>
      );
    }
    if (upper.includes('PASSGATE_FAILED') || upper.includes('LOGIN_FAILED') || upper.includes('LOCKOUT')) {
      return (
        <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-rose-400">
          <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
          <span>{action}</span>
        </span>
      );
    }
    if (upper.includes('SUSPENDED') || upper.includes('REJECTED') || upper.includes('DECLINED')) {
      return (
        <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-amber-400">
          <UserX className="w-3.5 h-3.5 text-amber-400" />
          <span>{action}</span>
        </span>
      );
    }
    if (upper.includes('APPROVED') || upper.includes('VERIFIED') || upper.includes('ACTIVATED')) {
      return (
        <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-sky-400">
          <UserCheck className="w-3.5 h-3.5 text-sky-400" />
          <span>{action}</span>
        </span>
      );
    }
    if (upper.includes('DEPOSIT') || upper.includes('WITHDRAW') || upper.includes('INVEST')) {
      return (
        <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-violet-400">
          <Coins className="w-3.5 h-3.5 text-violet-400" />
          <span>{action}</span>
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#B6C4C9]">
        <Info className="w-3.5 h-3.5 text-[#8FA1A8]" />
        <span>{action}</span>
      </span>
    );
  };

  const getCategoryIcon = (category?: AuditCategory) => {
    switch (category) {
      case 'auth':
        return <LogIn className="w-3.5 h-3.5 text-sky-400" />;
      case 'security':
        return <Lock className="w-3.5 h-3.5 text-violet-400" />;
      case 'user_status':
        return <UserCheck className="w-3.5 h-3.5 text-[#6FD8B0]" />;
      case 'financial':
        return <Coins className="w-3.5 h-3.5 text-amber-400" />;
      case 'compliance':
        return <Shield className="w-3.5 h-3.5 text-[#6FD8B0]" />;
      default:
        return <Database className="w-3.5 h-3.5 text-[#8FA1A8]" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-[#121A1F] rounded-2xl p-6 border border-[#1F2C33] flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1.5">
            <div className="w-8 h-8 rounded-xl bg-[#0B0F10] text-[#6FD8B0] border border-[#1F2C33] flex items-center justify-center">
              <ClipboardList className="w-4 h-4" />
            </div>
            <h2 className="text-lg font-bold text-[#F2F5F4] tracking-tight">
              Compliance Audit Trail &amp; Event Ledger
            </h2>
          </div>
          <p className="text-xs text-[#8FA1A8] max-w-3xl leading-relaxed">
            Immutable administrative audit log tracking user authentication attempts, investor activities, KYC verifications, and compliance status transitions.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={refreshLogs}
            className="px-3.5 py-2 rounded-xl bg-[#0B0F10] hover:bg-[#162026] text-[#F2F5F4] border border-[#1F2C33] text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Refresh logs"
          >
            <RefreshCw className="w-3.5 h-3.5 text-[#6FD8B0]" />
            <span>Sync</span>
          </button>

          <button
            type="button"
            onClick={handlePrintAuditReport}
            className="px-3.5 py-2 rounded-xl bg-[#0B0F10] hover:bg-[#162026] text-[#F2F5F4] border border-[#1F2C33] text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Print or export compliance audit log report"
          >
            <Printer className="w-3.5 h-3.5 text-[#6FD8B0]" />
            <span>Print Report</span>
          </button>

          <div className="inline-flex rounded-xl overflow-hidden border border-[#1F2C33]">
            <button
              type="button"
              onClick={() => handleExport('csv')}
              className="px-3.5 py-2 bg-[#6FD8B0] hover:bg-[#5ec8a0] text-[#0B0F10] text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
            <button
              type="button"
              onClick={() => handleExport('json')}
              className="px-2.5 py-2 bg-[#0B0F10] hover:bg-[#162026] text-[#F2F5F4] text-xs font-bold border-l border-[#1F2C33] transition-colors cursor-pointer"
              title="Export as JSON"
            >
              <span>JSON</span>
            </button>
          </div>

          {confirmPurge ? (
            <div className="inline-flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleClearLogs}
                className="px-3 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-colors cursor-pointer"
              >
                Confirm Purge
              </button>
              <button
                type="button"
                onClick={() => setConfirmPurge(false)}
                className="px-2.5 py-2 rounded-xl bg-[#0B0F10] border border-[#1F2C33] text-[#B6C4C9] text-xs font-semibold transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmPurge(true)}
              disabled={logs.length === 0}
              className="px-3 py-2 rounded-xl bg-[#0B0F10] hover:bg-rose-500/10 text-[#8FA1A8] hover:text-rose-400 border border-[#1F2C33] text-xs font-bold transition-colors cursor-pointer disabled:opacity-40"
              title="Clear local audit buffer"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {actionNotice && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 rounded-xl text-xs font-medium flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-[#6FD8B0] shrink-0" />
          <span>{actionNotice}</span>
        </div>
      )}

      {/* Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        <div className="bg-[#121A1F] p-4 rounded-xl border border-[#1F2C33]">
          <div className="text-[11px] font-semibold text-[#8FA1A8] uppercase tracking-wider mb-1">Total Logs</div>
          <div className="text-xl font-bold text-[#F2F5F4] tabular-nums">{stats.total}</div>
          <div className="text-[11px] text-[#6FD8B0] mt-0.5">Active Ledger</div>
        </div>

        <div className="bg-[#121A1F] p-4 rounded-xl border border-[#1F2C33]">
          <div className="text-[11px] font-semibold text-[#8FA1A8] uppercase tracking-wider mb-1">Auth &amp; Logins</div>
          <div className="text-xl font-bold text-[#F2F5F4] tabular-nums">{stats.authCount}</div>
          <div className="text-[11px] text-[#8FA1A8] mt-0.5">
            {stats.loginFailures > 0 ? `${stats.loginFailures} Failed` : 'All Clean'}
          </div>
        </div>

        <div className="bg-[#121A1F] p-4 rounded-xl border border-[#1F2C33]">
          <div className="text-[11px] font-semibold text-[#8FA1A8] uppercase tracking-wider mb-1">Status Overrides</div>
          <div className="text-xl font-bold text-[#F2F5F4] tabular-nums">{stats.statusChanges}</div>
          <div className="text-[11px] text-[#8FA1A8] mt-0.5">Active &amp; Suspended</div>
        </div>

        <div className="bg-[#121A1F] p-4 rounded-xl border border-[#1F2C33]">
          <div className="text-[11px] font-semibold text-[#8FA1A8] uppercase tracking-wider mb-1">Financial Events</div>
          <div className="text-xl font-bold text-[#F2F5F4] tabular-nums">{stats.financialActions}</div>
          <div className="text-[11px] text-[#8FA1A8] mt-0.5">Deposits &amp; Invests</div>
        </div>

        <div className="bg-[#121A1F] p-4 rounded-xl border border-[#1F2C33]">
          <div className="text-[11px] font-semibold text-[#8FA1A8] uppercase tracking-wider mb-1">KYC &amp; Docs</div>
          <div className="text-xl font-bold text-[#F2F5F4] tabular-nums">{stats.kycCompliance}</div>
          <div className="text-[11px] text-[#8FA1A8] mt-0.5">AML / eIDAS</div>
        </div>

        <div className="bg-[#121A1F] p-4 rounded-xl border border-[#1F2C33]">
          <div className="text-[11px] font-semibold text-[#8FA1A8] uppercase tracking-wider mb-1">Pass Gate</div>
          <div className="text-xl font-bold text-[#F2F5F4] tabular-nums">{stats.passGateEvents}</div>
          <div className="text-[11px] text-[#8FA1A8] mt-0.5">/admin Gate</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-[#121A1F] rounded-2xl border border-[#1F2C33] p-4 space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8FA1A8]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search by action, email, actor, IP, or details..."
              className="w-full pl-9 pr-4 py-2.5 bg-[#0B0F10] border border-[#1F2C33] rounded-xl text-xs font-medium text-[#F2F5F4] placeholder-[#526066] focus:outline-none focus:border-[#6FD8B0]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8FA1A8] hover:text-[#F2F5F4] text-xs font-bold cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Timeframe Presets */}
          <div className="flex items-center gap-1.5 self-start md:self-auto overflow-x-auto pb-1 md:pb-0">
            {(['all', 'today', '7d', '30d'] as const).map((tf) => (
              <button
                key={tf}
                type="button"
                onClick={() => {
                  setSelectedTimeframe(tf);
                  setCurrentPage(1);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  selectedTimeframe === tf
                    ? 'bg-[#6FD8B0] text-[#0B0F10]'
                    : 'bg-[#0B0F10] border border-[#1F2C33] text-[#B6C4C9] hover:text-[#F2F5F4]'
                }`}
              >
                {tf === 'all' ? 'All Time' : tf === 'today' ? 'Today' : tf === '7d' ? 'Last 7 Days' : 'Last 30 Days'}
              </button>
            ))}
          </div>
        </div>

        {/* Category & Severity */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[#1F2C33]">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-semibold text-[#8FA1A8] uppercase tracking-wider mr-1 flex items-center gap-1">
              <Filter className="w-3 h-3" /> Filter:
            </span>

            {[
              { id: 'all', label: 'All Categories' },
              { id: 'auth', label: 'Auth & Logins' },
              { id: 'user_status', label: 'User Status' },
              { id: 'financial', label: 'Financial' },
              { id: 'compliance', label: 'Compliance & KYC' },
              { id: 'security', label: 'Security' },
            ].map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => {
                  setSelectedCategory(cat.id);
                  setCurrentPage(1);
                }}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  selectedCategory === cat.id
                    ? 'bg-[#6FD8B0] text-[#0B0F10]'
                    : 'bg-[#0B0F10] border border-[#1F2C33] hover:bg-[#162026] text-[#B6C4C9]'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-[#8FA1A8] font-semibold">Severity:</span>
              <select
                value={selectedSeverity}
                onChange={(e) => {
                  setSelectedSeverity(e.target.value);
                  setCurrentPage(1);
                }}
                className="bg-[#0B0F10] border border-[#1F2C33] rounded-lg px-2.5 py-1 text-xs font-semibold text-[#F2F5F4] focus:outline-none focus:border-[#6FD8B0]"
              >
                <option value="all">All</option>
                <option value="info">Info</option>
                <option value="success">Success</option>
                <option value="warning">Warning</option>
                <option value="critical">Critical</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-[#8FA1A8] font-semibold">Per Page:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="bg-[#0B0F10] border border-[#1F2C33] rounded-lg px-2 py-1 text-xs font-semibold text-[#F2F5F4] focus:outline-none focus:border-[#6FD8B0]"
              >
                <option value={10}>10</option>
                <option value={15}>15</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Main Audit Trail Table */}
      <div className="bg-[#121A1F] rounded-2xl border border-[#1F2C33] overflow-hidden">
        <div className="p-4 bg-[#0B0F10] border-b border-[#1F2C33] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-[#F2F5F4]">
              Audit Records ({filteredLogs.length} found)
            </span>
            {searchQuery && (
              <span className="text-[11px] text-[#8FA1A8]">
                matching &ldquo;{searchQuery}&rdquo;
              </span>
            )}
          </div>
          <span className="text-[11px] font-mono text-[#8FA1A8]">
            Page {currentPage} of {totalPages}
          </span>
        </div>

        {paginatedLogs.length === 0 ? (
          <div className="p-12 text-center">
            <ClipboardList className="w-10 h-10 text-[#526066] mx-auto mb-3" />
            <div className="text-sm font-bold text-[#F2F5F4]">No Audit Records Found</div>
            <p className="text-xs text-[#8FA1A8] mt-1 max-w-sm mx-auto">
              No audit events matched your search filters. Try adjusting the category, severity, or search query.
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('all');
                setSelectedSeverity('all');
                setSelectedTimeframe('all');
              }}
              className="mt-4 px-4 py-2 bg-[#6FD8B0] text-[#0B0F10] rounded-xl text-xs font-bold hover:bg-[#5ec8a0] transition-colors cursor-pointer"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#0B0F10] border-b border-[#1F2C33] text-[11px] font-semibold text-[#8FA1A8] uppercase tracking-wider">
                  <th className="py-3 px-4">Time</th>
                  <th className="py-3 px-4">Action &amp; Event</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Actor</th>
                  <th className="py-3 px-4">Target / Subject</th>
                  <th className="py-3 px-4">Details</th>
                  <th className="py-3 px-4 text-right">Inspect</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1F2C33] text-xs">
                {paginatedLogs.map((log) => (
                  <tr
                    key={log.id}
                    onClick={() => setInspectModalLog(log)}
                    className="hover:bg-[#162026] transition-colors cursor-pointer"
                  >
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="font-semibold text-[#F2F5F4] text-xs">
                        {getRelativeTime(log.timestamp)}
                      </div>
                      <div className="text-[10px] text-[#8FA1A8] font-mono">
                        {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </div>
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap">
                      {getActionBadge(log.action, log.severity)}
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 text-xs text-[#B6C4C9] capitalize font-medium">
                        {getCategoryIcon(log.category)}
                        <span>{(log.category || 'system').replace('_', ' ')}</span>
                      </div>
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="font-medium text-[#F2F5F4] text-xs truncate max-w-[150px]">
                        {log.adminEmail}
                      </div>
                      <div className="text-[10px] text-[#8FA1A8] font-mono">
                        ID: {log.adminId}
                      </div>
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap">
                      {log.targetUserEmail ? (
                        <div>
                          <div className="font-medium text-[#6FD8B0] text-xs truncate max-w-[140px]">
                            {log.targetUserEmail}
                          </div>
                          {log.targetUserId && (
                            <div className="text-[10px] text-[#8FA1A8] font-mono">
                              {log.targetUserId}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-[#8FA1A8] text-[11px] italic">Platform Wide</span>
                      )}
                    </td>

                    <td className="py-3 px-4">
                      <p className="text-xs text-[#B6C4C9] line-clamp-2 max-w-md leading-relaxed">
                        {log.details}
                      </p>
                      {log.ipAddress && (
                        <span className="text-[10px] font-mono text-[#8FA1A8] mt-0.5 block">
                          IP: {log.ipAddress}
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setInspectModalLog(log);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-[#0B0F10] border border-[#1F2C33] hover:border-[#6FD8B0] text-[#F2F5F4] text-[11px] font-semibold transition-colors cursor-pointer"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="p-4 bg-[#0B0F10] border-t border-[#1F2C33] flex items-center justify-between text-xs">
            <span className="text-[#8FA1A8]">
              Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, filteredLogs.length)} of {filteredLogs.length} events
            </span>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                className="px-3 py-1.5 rounded-lg border border-[#1F2C33] bg-[#121A1F] text-[#F2F5F4] hover:bg-[#162026] disabled:opacity-30 disabled:cursor-not-allowed font-semibold flex items-center gap-1 transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Prev</span>
              </button>

              <span className="px-3 py-1 font-mono font-bold text-[#F2F5F4]">
                {currentPage} / {totalPages}
              </span>

              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                className="px-3 py-1.5 rounded-lg border border-[#1F2C33] bg-[#121A1F] text-[#F2F5F4] hover:bg-[#162026] disabled:opacity-30 disabled:cursor-not-allowed font-semibold flex items-center gap-1 transition-colors cursor-pointer"
              >
                <span>Next</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Forensic Inspection Modal */}
      {inspectModalLog && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#121A1F] rounded-2xl max-w-2xl w-full border border-[#1F2C33] overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-5 bg-[#0B0F10] border-b border-[#1F2C33] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#121A1F] border border-[#1F2C33] flex items-center justify-center text-[#6FD8B0]">
                  <Shield className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#F2F5F4]">Forensic Audit Log Record</h3>
                  <p className="text-[11px] text-[#6FD8B0] font-mono">ID: {inspectModalLog.id}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setInspectModalLog(null)}
                className="text-[#8FA1A8] hover:text-[#F2F5F4] p-1 rounded-lg hover:bg-[#162026] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4 p-4 bg-[#0B0F10] rounded-xl border border-[#1F2C33]">
                <div>
                  <div className="text-[10px] font-bold uppercase text-[#8FA1A8]">Action Code</div>
                  <div className="mt-1">{getActionBadge(inspectModalLog.action, inspectModalLog.severity)}</div>
                </div>
                <div>
                  <div className="text-[10px] font-bold uppercase text-[#8FA1A8]">Category</div>
                  <div className="font-bold text-[#F2F5F4] mt-1 capitalize flex items-center gap-1.5">
                    {getCategoryIcon(inspectModalLog.category)}
                    <span>{(inspectModalLog.category || 'system').replace('_', ' ')}</span>
                  </div>
                </div>
                <div>
                  <div className="text-[10px] font-bold uppercase text-[#8FA1A8]">Actor Account</div>
                  <div className="font-semibold text-[#F2F5F4] mt-0.5">{inspectModalLog.adminEmail}</div>
                  <div className="text-[10px] text-[#8FA1A8] font-mono">ID: {inspectModalLog.adminId}</div>
                </div>
                <div>
                  <div className="text-[10px] font-bold uppercase text-[#8FA1A8]">Target Subject</div>
                  <div className="font-semibold text-[#6FD8B0] mt-0.5">{inspectModalLog.targetUserEmail || 'System / Platform Wide'}</div>
                  {inspectModalLog.targetUserId && (
                    <div className="text-[10px] text-[#8FA1A8] font-mono">Target ID: {inspectModalLog.targetUserId}</div>
                  )}
                </div>
                <div>
                  <div className="text-[10px] font-bold uppercase text-[#8FA1A8]">Timestamp (UTC)</div>
                  <div className="font-mono text-[#B6C4C9] mt-0.5">{inspectModalLog.timestamp}</div>
                </div>
                <div>
                  <div className="text-[10px] font-bold uppercase text-[#8FA1A8]">IP &amp; Origin Context</div>
                  <div className="font-mono text-[#B6C4C9] mt-0.5">{inspectModalLog.ipAddress || 'Verified Session'}</div>
                </div>
              </div>

              <div className="p-4 bg-[#0B0F10] rounded-xl border border-[#1F2C33] space-y-1">
                <div className="text-[10px] font-bold uppercase text-[#8FA1A8]">Full Description</div>
                <p className="text-xs text-[#F2F5F4] leading-relaxed font-medium">
                  {inspectModalLog.details}
                </p>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase text-[#8FA1A8] font-mono">Raw JSON Payload</span>
                  <button
                    type="button"
                    onClick={() => handleCopy(JSON.stringify(inspectModalLog, null, 2), inspectModalLog.id)}
                    className="text-[11px] font-semibold text-[#6FD8B0] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    {copiedId === inspectModalLog.id ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedId === inspectModalLog.id ? 'Copied' : 'Copy JSON'}</span>
                  </button>
                </div>
                <pre className="p-3 bg-[#0B0F10] text-[#6FD8B0] rounded-xl font-mono text-[11px] overflow-x-auto max-h-48 border border-[#1F2C33]">
                  {JSON.stringify(inspectModalLog, null, 2)}
                </pre>
              </div>
            </div>

            <div className="p-4 bg-[#0B0F10] border-t border-[#1F2C33] flex items-center justify-end">
              <button
                type="button"
                onClick={() => setInspectModalLog(null)}
                className="px-4 py-2 bg-[#6FD8B0] hover:bg-[#5ec8a0] text-[#0B0F10] text-xs font-bold rounded-xl transition-colors cursor-pointer"
              >
                Close Record
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
