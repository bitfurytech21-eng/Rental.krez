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
  const getActionBadge = (action: string, severity?: AuditSeverity) => {
    const upper = action.toUpperCase();

    if (upper.includes('PASSGATE_UNLOCKED') || upper.includes('LOGIN_SUCCESS')) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
          <span>{action}</span>
        </span>
      );
    }
    if (upper.includes('PASSGATE_FAILED') || upper.includes('LOGIN_FAILED') || upper.includes('LOCKOUT')) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
          <AlertTriangle className="w-3 h-3 text-rose-600" />
          <span>{action}</span>
        </span>
      );
    }
    if (upper.includes('SUSPENDED') || upper.includes('REJECTED') || upper.includes('DECLINED')) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
          <UserX className="w-3 h-3 text-amber-600" />
          <span>{action}</span>
        </span>
      );
    }
    if (upper.includes('APPROVED') || upper.includes('VERIFIED') || upper.includes('ACTIVATED')) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-300">
          <UserCheck className="w-3 h-3 text-blue-600" />
          <span>{action}</span>
        </span>
      );
    }
    if (upper.includes('DEPOSIT') || upper.includes('WITHDRAW') || upper.includes('INVEST')) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-100 text-purple-800 border border-purple-300">
          <Coins className="w-3 h-3 text-purple-600" />
          <span>{action}</span>
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-800 border border-slate-300">
        <Info className="w-3 h-3 text-slate-500" />
        <span>{action}</span>
      </span>
    );
  };

  const getCategoryIcon = (category?: AuditCategory) => {
    switch (category) {
      case 'auth':
        return <LogIn className="w-3.5 h-3.5 text-blue-600" />;
      case 'security':
        return <Lock className="w-3.5 h-3.5 text-purple-600" />;
      case 'user_status':
        return <UserCheck className="w-3.5 h-3.5 text-emerald-600" />;
      case 'financial':
        return <Coins className="w-3.5 h-3.5 text-amber-600" />;
      case 'compliance':
        return <Shield className="w-3.5 h-3.5 text-teal-600" />;
      default:
        return <Database className="w-3.5 h-3.5 text-slate-500" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-[#E3E8E3] shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center justify-center">
              <ClipboardList className="w-4 h-4" />
            </div>
            <h2 className="text-xl font-black text-[#18211F] tracking-tight">
              Compliance Audit Trail & Event Ledger
            </h2>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-300">
              Offline-Persistent
            </span>
          </div>
          <p className="text-xs text-[#52605C] max-w-3xl leading-relaxed">
            Immutable administrative audit log tracking user authentication attempts, investor activities, KYC verifications, and compliance status transitions. Stored in client-side persistent storage for zero-dependency offline availability.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={refreshLogs}
            className="px-3.5 py-2 rounded-xl bg-[#F4F6F4] hover:bg-[#EAEFEA] text-[#18211F] border border-[#D5DED5] text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Refresh logs from local persistent storage"
          >
            <RefreshCw className="w-3.5 h-3.5 text-emerald-700" />
            <span>Sync</span>
          </button>

          <button
            type="button"
            onClick={handlePrintAuditReport}
            className="px-3.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Print or export compliance audit log report"
          >
            <Printer className="w-3.5 h-3.5 text-emerald-700" />
            <span>Print Report</span>
          </button>

          {/* Export Dropdown */}
          <div className="relative inline-flex rounded-xl shadow-xs">
            <button
              type="button"
              onClick={() => handleExport('csv')}
              className="px-3.5 py-2 rounded-l-xl bg-[#182D2A] hover:bg-[#27845D] text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
            <button
              type="button"
              onClick={() => handleExport('json')}
              className="px-2.5 py-2 rounded-r-xl bg-[#11201E] hover:bg-[#1a322f] text-white text-xs font-bold border-l border-white/20 transition-colors cursor-pointer"
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
                className="px-3 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-colors cursor-pointer"
              >
                Confirm Purge
              </button>
              <button
                type="button"
                onClick={() => setConfirmPurge(false)}
                className="px-2.5 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmPurge(true)}
              disabled={logs.length === 0}
              className="px-3 py-2 rounded-xl bg-gray-100 hover:bg-rose-50 text-gray-600 hover:text-rose-700 border border-gray-200 text-xs font-bold transition-colors cursor-pointer disabled:opacity-40"
              title="Clear all audit logs"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {actionNotice && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-semibold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{actionNotice}</span>
        </div>
      )}

      {/* Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        <div className="bg-white p-4 rounded-2xl border border-[#E3E8E3] shadow-xs">
          <div className="text-[11px] font-bold text-[#69736F] uppercase tracking-wider mb-1">Total Logs</div>
          <div className="text-xl font-black text-[#18211F]">{stats.total}</div>
          <div className="text-[10px] text-emerald-700 font-semibold mt-0.5">Offline Storage Active</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-[#E3E8E3] shadow-xs">
          <div className="text-[11px] font-bold text-[#69736F] uppercase tracking-wider mb-1">Auth & Logins</div>
          <div className="text-xl font-black text-blue-900">{stats.authCount}</div>
          <div className="text-[10px] text-blue-700 font-semibold mt-0.5">
            {stats.loginFailures > 0 ? `${stats.loginFailures} Failed Attempt${stats.loginFailures === 1 ? '' : 's'}` : 'All Logins Clean'}
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-[#E3E8E3] shadow-xs">
          <div className="text-[11px] font-bold text-[#69736F] uppercase tracking-wider mb-1">Status Overrides</div>
          <div className="text-xl font-black text-amber-900">{stats.statusChanges}</div>
          <div className="text-[10px] text-amber-700 font-semibold mt-0.5">Active & Suspended</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-[#E3E8E3] shadow-xs">
          <div className="text-[11px] font-bold text-[#69736F] uppercase tracking-wider mb-1">Financial Events</div>
          <div className="text-xl font-black text-purple-900">{stats.financialActions}</div>
          <div className="text-[10px] text-purple-700 font-semibold mt-0.5">Deposits & Invests</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-[#E3E8E3] shadow-xs">
          <div className="text-[11px] font-bold text-[#69736F] uppercase tracking-wider mb-1">KYC & Documents</div>
          <div className="text-xl font-black text-teal-900">{stats.kycCompliance}</div>
          <div className="text-[10px] text-teal-700 font-semibold mt-0.5">AML/eIDAS Checks</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-[#E3E8E3] shadow-xs">
          <div className="text-[11px] font-bold text-[#69736F] uppercase tracking-wider mb-1">Pass Gate Guard</div>
          <div className="text-xl font-black text-slate-900">{stats.passGateEvents}</div>
          <div className="text-[10px] text-slate-600 font-semibold mt-0.5">/admin Gate Access</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl border border-[#E3E8E3] p-4 space-y-3 shadow-xs">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search by action, email, actor, IP, or details..."
              className="w-full pl-9 pr-4 py-2.5 bg-[#F8FAF8] border border-[#E3E8E3] rounded-xl text-xs font-medium text-[#18211F] placeholder-gray-400 focus:outline-none focus:border-[#27845D]"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs font-bold cursor-pointer"
              >
                ✕
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
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                  selectedTimeframe === tf
                    ? 'bg-[#182D2A] text-white shadow-xs'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {tf === 'all' ? 'All Time' : tf === 'today' ? 'Today' : tf === '7d' ? 'Last 7 Days' : 'Last 30 Days'}
              </button>
            ))}
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[#F0F2F0]">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mr-1 flex items-center gap-1">
              <Filter className="w-3 h-3" /> Filter:
            </span>

            {[
              { id: 'all', label: 'All Categories' },
              { id: 'auth', label: 'Auth & Logins' },
              { id: 'user_status', label: 'User Status' },
              { id: 'financial', label: 'Financial' },
              { id: 'compliance', label: 'Compliance & KYC' },
              { id: 'security', label: 'Pass Gate & Security' },
            ].map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => {
                  setSelectedCategory(cat.id);
                  setCurrentPage(1);
                }}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                  selectedCategory === cat.id
                    ? 'bg-emerald-800 text-white shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Severity & Page Size */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-gray-400 font-semibold">Severity:</span>
              <select
                value={selectedSeverity}
                onChange={(e) => {
                  setSelectedSeverity(e.target.value);
                  setCurrentPage(1);
                }}
                className="bg-[#F8FAF8] border border-[#E3E8E3] rounded-lg px-2.5 py-1 text-xs font-semibold text-[#18211F] focus:outline-none"
              >
                <option value="all">All</option>
                <option value="info">Info</option>
                <option value="success">Success</option>
                <option value="warning">Warning</option>
                <option value="critical">Critical</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-gray-400 font-semibold">Per Page:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="bg-[#F8FAF8] border border-[#E3E8E3] rounded-lg px-2 py-1 text-xs font-semibold text-[#18211F] focus:outline-none"
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
      <div className="bg-white rounded-3xl border border-[#E3E8E3] shadow-sm overflow-hidden">
        <div className="p-4 bg-[#F8FAF8] border-b border-[#E3E8E3] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-[#18211F]">
              Audit Records ({filteredLogs.length} found)
            </span>
            {searchQuery && (
              <span className="text-[11px] text-gray-500 font-normal">
                matching "{searchQuery}"
              </span>
            )}
          </div>
          <span className="text-[11px] font-mono text-gray-400">
            Page {currentPage} of {totalPages}
          </span>
        </div>

        {paginatedLogs.length === 0 ? (
          <div className="p-12 text-center">
            <ClipboardList className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <div className="text-sm font-bold text-[#18211F]">No Audit Records Found</div>
            <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
              No audit events matched your search filters. Try adjusting the category, severity, or search query.
            </p>
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('all');
                setSelectedSeverity('all');
                setSelectedTimeframe('all');
              }}
              className="mt-4 px-4 py-2 bg-[#182D2A] text-white rounded-xl text-xs font-bold hover:bg-[#27845D] transition-colors cursor-pointer"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#FAFBF9] border-b border-[#E3E8E3] text-[11px] font-bold text-[#69736F] uppercase tracking-wider">
                  <th className="py-3.5 px-4">Time</th>
                  <th className="py-3.5 px-4">Action & Event</th>
                  <th className="py-3.5 px-4">Category</th>
                  <th className="py-3.5 px-4">Actor</th>
                  <th className="py-3.5 px-4">Target / Subject</th>
                  <th className="py-3.5 px-4">Details & Compliance Summary</th>
                  <th className="py-3.5 px-4 text-right">Inspect</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EAEFEA] text-xs">
                {paginatedLogs.map((log) => {
                  return (
                    <tr
                      key={log.id}
                      onClick={() => setInspectModalLog(log)}
                      className="hover:bg-[#F9FAF9] transition-colors cursor-pointer group"
                    >
                      {/* Timestamp */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="font-semibold text-[#18211F] text-xs">
                          {getRelativeTime(log.timestamp)}
                        </div>
                        <div className="text-[10px] text-gray-400 font-mono">
                          {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </div>
                      </td>

                      {/* Action Badge */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {getActionBadge(log.action, log.severity)}
                      </td>

                      {/* Category */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-xs text-gray-700 capitalize font-medium">
                          {getCategoryIcon(log.category)}
                          <span>{(log.category || 'system').replace('_', ' ')}</span>
                        </div>
                      </td>

                      {/* Actor */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="font-semibold text-slate-900 text-xs truncate max-w-[150px]">
                          {log.adminEmail}
                        </div>
                        <div className="text-[10px] text-gray-400 font-mono">
                          ID: {log.adminId}
                        </div>
                      </td>

                      {/* Target Subject */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {log.targetUserEmail ? (
                          <div>
                            <div className="font-medium text-emerald-900 text-xs truncate max-w-[140px]">
                              {log.targetUserEmail}
                            </div>
                            {log.targetUserId && (
                              <div className="text-[10px] text-gray-400 font-mono">
                                {log.targetUserId}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400 text-[11px] italic">Platform Wide</span>
                        )}
                      </td>

                      {/* Details */}
                      <td className="py-3.5 px-4">
                        <p className="text-xs text-[#52605C] line-clamp-2 max-w-md leading-relaxed">
                          {log.details}
                        </p>
                        {log.ipAddress && (
                          <span className="text-[10px] font-mono text-gray-400 mt-0.5 block">
                            IP: {log.ipAddress}
                          </span>
                        )}
                      </td>

                      {/* Inspect Action */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setInspectModalLog(log);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-gray-100 hover:bg-[#182D2A] hover:text-white text-gray-700 text-[11px] font-bold transition-colors cursor-pointer"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="p-4 bg-[#F8FAF8] border-t border-[#E3E8E3] flex items-center justify-between text-xs">
            <span className="text-gray-500">
              Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, filteredLogs.length)} of {filteredLogs.length} events
            </span>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                className="px-3 py-1.5 rounded-lg border border-gray-300 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed font-bold flex items-center gap-1 transition-colors"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Prev</span>
              </button>

              <span className="px-3 py-1 font-mono font-bold text-gray-700">
                {currentPage} / {totalPages}
              </span>

              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                className="px-3 py-1.5 rounded-lg border border-gray-300 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed font-bold flex items-center gap-1 transition-colors"
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
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-2xl w-full border border-gray-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-5 bg-[#182D2A] text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#27845D] flex items-center justify-center text-white">
                  <Shield className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Forensic Audit Log Record</h3>
                  <p className="text-[10px] text-emerald-300 font-mono">ID: {inspectModalLog.id}</p>
                </div>
              </div>
              <button
                onClick={() => setInspectModalLog(null)}
                className="text-white/70 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-2xl border border-gray-200">
                <div>
                  <div className="text-[10px] font-bold uppercase text-gray-400">Action Code</div>
                  <div className="mt-1">{getActionBadge(inspectModalLog.action, inspectModalLog.severity)}</div>
                </div>
                <div>
                  <div className="text-[10px] font-bold uppercase text-gray-400">Category</div>
                  <div className="font-bold text-[#18211F] mt-1 capitalize flex items-center gap-1.5">
                    {getCategoryIcon(inspectModalLog.category)}
                    <span>{(inspectModalLog.category || 'system').replace('_', ' ')}</span>
                  </div>
                </div>
                <div>
                  <div className="text-[10px] font-bold uppercase text-gray-400">Actor Account</div>
                  <div className="font-semibold text-[#18211F] mt-0.5">{inspectModalLog.adminEmail}</div>
                  <div className="text-[10px] text-gray-400 font-mono">ID: {inspectModalLog.adminId}</div>
                </div>
                <div>
                  <div className="text-[10px] font-bold uppercase text-gray-400">Target Subject</div>
                  <div className="font-semibold text-emerald-800 mt-0.5">{inspectModalLog.targetUserEmail || 'System / Platform Wide'}</div>
                  {inspectModalLog.targetUserId && (
                    <div className="text-[10px] text-gray-400 font-mono">Target ID: {inspectModalLog.targetUserId}</div>
                  )}
                </div>
                <div>
                  <div className="text-[10px] font-bold uppercase text-gray-400">Timestamp (UTC)</div>
                  <div className="font-mono text-gray-700 mt-0.5">{inspectModalLog.timestamp}</div>
                </div>
                <div>
                  <div className="text-[10px] font-bold uppercase text-gray-400">IP & Origin Context</div>
                  <div className="font-mono text-gray-700 mt-0.5">{inspectModalLog.ipAddress || '127.0.0.1 (Local Verified)'}</div>
                </div>
              </div>

              {/* Event Description */}
              <div className="p-4 bg-white rounded-2xl border border-gray-200 space-y-1">
                <div className="text-[10px] font-bold uppercase text-gray-400">Full Description</div>
                <p className="text-xs text-gray-800 leading-relaxed font-medium">
                  {inspectModalLog.details}
                </p>
              </div>

              {/* Raw JSON Payload */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase text-gray-400 font-mono">Raw JSON Payload</span>
                  <button
                    type="button"
                    onClick={() => handleCopy(JSON.stringify(inspectModalLog, null, 2), inspectModalLog.id)}
                    className="text-[10px] font-bold text-emerald-700 hover:text-emerald-900 flex items-center gap-1 cursor-pointer"
                  >
                    {copiedId === inspectModalLog.id ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedId === inspectModalLog.id ? 'Copied' : 'Copy JSON'}</span>
                  </button>
                </div>
                <pre className="p-3 bg-[#0B1513] text-[#A2E2C7] rounded-xl font-mono text-[11px] overflow-x-auto max-h-48 border border-[#1E3630]">
                  {JSON.stringify(inspectModalLog, null, 2)}
                </pre>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
              <span className="text-[10px] text-gray-400">
                Persistent Storage: <code className="bg-gray-200 px-1 py-0.5 rounded text-[10px]">kretz_platform_state_v1</code>
              </span>
              <button
                type="button"
                onClick={() => setInspectModalLog(null)}
                className="px-4 py-2 bg-[#182D2A] hover:bg-[#27845D] text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
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
