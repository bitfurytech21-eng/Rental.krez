import React, { useEffect, useMemo, useState } from 'react';
import { AuditCategory, AuditLog, AuditSeverity, ledger } from '../../lib/ledger';
import { getApiUrl, getAuthToken } from '../../lib/api';
import { formatDate } from '../../lib/utils';
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Coins,
  Copy,
  Database,
  Download,
  Filter,
  Info,
  Lock,
  LogIn,
  Printer,
  RefreshCw,
  Search,
  Shield,
  UserCheck,
  UserX,
  X,
} from 'lucide-react';
import { AuditReportPrintData, printAuditLogReport } from '../../lib/printService';

interface AdminAuditLogsViewProps {
  currentAdminEmail?: string;
}

export const AdminAuditLogsView: React.FC<AdminAuditLogsViewProps> = ({
  currentAdminEmail = 'admin@kretz.com',
}) => {
  const [logs, setLogs] = useState<AuditLog[]>(() => ledger.getAuditLogs());
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('all');
  const [selectedTimeframe, setSelectedTimeframe] = useState<'all' | 'today' | '7d' | '30d'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [inspectModalLog, setInspectModalLog] = useState<AuditLog | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  const fetchServerAuditLogs = async (showNotice = false) => {
    setLoading(true);
    try {
      const token = getAuthToken();
      const res = await fetch(getApiUrl('/admin/audit-logs?limit=250'), {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const payload = await res.json().catch(() => ({}));
      const serverLogs: AuditLog[] = Array.isArray(payload?.data)
        ? payload.data.map((l: any) => ({
            id: String(l.id || `audit-${Date.now()}-${Math.random()}`),
            adminId: String(l.adminId || l.actor_id || 'usr-admin-01'),
            adminEmail: String(l.adminEmail || l.actor_email || 'admin@kretz.com'),
            action: String(l.action || 'SYSTEM_EVENT'),
            category: (l.category || 'system') as AuditCategory,
            severity: (l.severity || 'info') as AuditSeverity,
            targetUserId: l.targetUserId || l.targetId || undefined,
            targetUserEmail: l.targetUserEmail || undefined,
            details: String(l.details || l.action || ''),
            ipAddress: l.ipAddress || undefined,
            timestamp: String(l.timestamp || l.created_at || new Date().toISOString()),
          }))
        : [];
      const localLogs = ledger.getAuditLogs();
      const mergedMap = new Map<string, AuditLog>();
      [...serverLogs, ...localLogs].forEach((entry) => {
        if (!mergedMap.has(entry.id)) {
          mergedMap.set(entry.id, entry);
        }
      });
      const merged = Array.from(mergedMap.values()).sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
      setLogs(merged);
      if (showNotice) {
        setActionNotice(`Synced ${merged.length} read-only audit records.`);
        setTimeout(() => setActionNotice(null), 3000);
      }
    } catch {
      setLogs(ledger.getAuditLogs());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchServerAuditLogs(false);
  }, []);

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      if (selectedCategory !== 'all') {
        const cat = log.category || 'system';
        if (cat !== selectedCategory) return false;
      }
      if (selectedSeverity !== 'all') {
        const sev = log.severity || 'info';
        if (sev !== selectedSeverity) return false;
      }
      if (selectedTimeframe !== 'all') {
        const logTime = new Date(log.timestamp).getTime();
        const now = Date.now();
        const cutoff =
          selectedTimeframe === 'today'
            ? now - 24 * 60 * 60 * 1000
            : selectedTimeframe === '7d'
            ? now - 7 * 24 * 60 * 60 * 1000
            : now - 30 * 24 * 60 * 60 * 1000;
        if (logTime < cutoff) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const hay = [
          log.action,
          log.details,
          log.adminEmail,
          log.targetUserEmail || '',
          log.id,
          log.ipAddress || '',
        ]
          .join(' ')
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [logs, selectedCategory, selectedSeverity, selectedTimeframe, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / pageSize));
  const paginatedLogs = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredLogs.slice(start, start + pageSize);
  }, [filteredLogs, currentPage, pageSize]);

  const stats = useMemo(() => {
    const total = logs.length;
    const authCount = logs.filter((l) => l.category === 'auth' || l.action.includes('LOGIN')).length;
    const financialCount = logs.filter(
      (l) =>
        l.category === 'financial' ||
        l.action.includes('DEPOSIT') ||
        l.action.includes('WITHDRAW') ||
        l.action.includes('SHARES') ||
        l.action.includes('DISTRIBUTION')
    ).length;
    const complianceCount = logs.filter(
      (l) => l.category === 'compliance' || l.action.includes('KYC') || l.action.includes('DOCUMENT')
    ).length;
    return { total, authCount, financialCount, complianceCount };
  }, [logs]);

  const handlePrintAuditReport = () => {
    const reportData: AuditReportPrintData = {
      generatedAt: new Date().toLocaleString('en-US'),
      generatedBy: currentAdminEmail,
      filterApplied: `Category: ${selectedCategory.toUpperCase()}, Severity: ${selectedSeverity.toUpperCase()}, Timeframe: ${selectedTimeframe.toUpperCase()}`,
      totalEventsCount: filteredLogs.length,
      logs: filteredLogs,
    };
    printAuditLogReport(reportData);
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
      a.download = `lagence-audit-log-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } else {
      const headers = ['ID', 'Timestamp', 'Action', 'Category', 'Severity', 'Actor Email', 'Target', 'IP Address', 'Details'];
      const rows = dataToExport.map((l) => [
        l.id,
        l.timestamp,
        l.action,
        l.category || 'system',
        l.severity || 'info',
        l.adminEmail,
        l.targetUserEmail || '',
        l.ipAddress || '',
        `"${(l.details || '').replace(/"/g, '""')}"`,
      ]);
      const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `lagence-audit-log-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    }
    setActionNotice(`Exported ${dataToExport.length} read-only audit records (${format.toUpperCase()}).`);
    setTimeout(() => setActionNotice(null), 3000);
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getRelativeTime = (timestamp: string) => {
    try {
      const diffSecs = Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000);
      if (diffSecs < 60) return 'Just now';
      const diffMins = Math.floor(diffSecs / 60);
      if (diffMins < 60) return `${diffMins}m ago`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours}h ago`;
      const diffDays = Math.floor(diffHours / 24);
      if (diffDays < 30) return `${diffDays}d ago`;
      return formatDate(timestamp);
    } catch {
      return timestamp;
    }
  };

  const getActionBadge = (action: string) => {
    const upper = action.toUpperCase();
    if (upper.includes('APPROVED') || upper.includes('VERIFIED') || upper.includes('PAID') || upper.includes('RECEIVED')) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
          <span>{action}</span>
        </span>
      );
    }
    if (upper.includes('FAILED') || upper.includes('REJECTED') || upper.includes('FROZEN') || upper.includes('SUSPENDED')) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-50 text-rose-800 border border-rose-200">
          <AlertTriangle className="w-3 h-3 text-rose-600" />
          <span>{action}</span>
        </span>
      );
    }
    if (upper.includes('DEPOSIT') || upper.includes('WITHDRAW') || upper.includes('SHARES') || upper.includes('DISTRIBUTION')) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-50 text-amber-900 border border-amber-200">
          <Coins className="w-3 h-3 text-amber-700" />
          <span>{action}</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-800 border border-slate-200">
        <Info className="w-3 h-3 text-slate-500" />
        <span>{action}</span>
      </span>
    );
  };

  const getCategoryIcon = (category?: string) => {
    switch (category) {
      case 'auth':
        return <LogIn className="w-3.5 h-3.5 text-blue-600" />;
      case 'security':
        return <Lock className="w-3.5 h-3.5 text-slate-700" />;
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
      <div className="bg-white rounded-2xl p-6 border border-[#E3E8E3] flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <ClipboardList className="w-5 h-5 text-[#27845D]" />
            <h2 className="text-lg font-bold text-[#18211F] tracking-tight">Audit log</h2>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200">
              <Lock className="w-3 h-3" /> Read-only
            </span>
          </div>
          <p className="text-xs text-[#52605C]">
            Who changed what, and when. Server-recorded audit entries cannot be edited or deleted.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={loading}
            onClick={() => void fetchServerAuditLogs(true)}
            className="px-3.5 py-2 rounded-lg bg-[#F4F6F4] hover:bg-[#EAEFEA] text-[#18211F] border border-[#D5DED5] text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#27845D] ${loading ? 'animate-spin' : ''}`} />
            <span>Sync</span>
          </button>

          <button
            type="button"
            onClick={handlePrintAuditReport}
            className="px-3.5 py-2 rounded-lg bg-white hover:bg-[#F6F7F4] text-[#18211F] border border-[#E3E8E3] text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5 text-[#27845D]" />
            <span>Print</span>
          </button>

          <button
            type="button"
            onClick={() => handleExport('csv')}
            className="px-3.5 py-2 rounded-lg bg-[#182D2A] hover:bg-[#27845D] text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>

          <button
            type="button"
            onClick={() => handleExport('json')}
            className="px-3 py-2 rounded-lg bg-white hover:bg-[#F6F7F4] text-[#18211F] border border-[#E3E8E3] text-xs font-semibold cursor-pointer"
          >
            JSON
          </button>
        </div>
      </div>

      {actionNotice && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{actionNotice}</span>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-xl border border-[#E3E8E3]">
          <div className="text-[11px] font-bold text-[#69736F] uppercase tracking-wider">Total Events</div>
          <div className="text-xl font-bold text-[#18211F] tabular-nums mt-1">{stats.total}</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-[#E3E8E3]">
          <div className="text-[11px] font-bold text-[#69736F] uppercase tracking-wider">Financial Actions</div>
          <div className="text-xl font-bold text-[#18211F] tabular-nums mt-1">{stats.financialCount}</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-[#E3E8E3]">
          <div className="text-[11px] font-bold text-[#69736F] uppercase tracking-wider">KYC &amp; Documents</div>
          <div className="text-xl font-bold text-[#18211F] tabular-nums mt-1">{stats.complianceCount}</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-[#E3E8E3]">
          <div className="text-[11px] font-bold text-[#69736F] uppercase tracking-wider">Auth Events</div>
          <div className="text-xl font-bold text-[#18211F] tabular-nums mt-1">{stats.authCount}</div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-[#E3E8E3] p-4 space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search by action, staff email, target investor, or details..."
              className="w-full pl-9 pr-4 py-2 bg-[#F8FAF8] border border-[#E3E8E3] rounded-lg text-xs text-[#18211F] focus:outline-none focus:border-[#27845D]"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto">
            {(['all', 'today', '7d', '30d'] as const).map((tf) => (
              <button
                key={tf}
                type="button"
                onClick={() => {
                  setSelectedTimeframe(tf);
                  setCurrentPage(1);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
                  selectedTimeframe === tf ? 'bg-[#182D2A] text-white' : 'bg-[#F4F6F4] text-[#52605C]'
                }`}
              >
                {tf === 'all' ? 'All time' : tf === 'today' ? 'Today' : tf === '7d' ? '7 days' : '30 days'}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[#F0F2F0]">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-bold text-[#69736F] uppercase mr-1 flex items-center gap-1">
              <Filter className="w-3 h-3" /> Category:
            </span>
            {[
              { id: 'all', label: 'All' },
              { id: 'financial', label: 'Financial' },
              { id: 'compliance', label: 'KYC & Compliance' },
              { id: 'property', label: 'Properties' },
              { id: 'user_status', label: 'Investor Status' },
              { id: 'security', label: 'Staff & Security' },
              { id: 'auth', label: 'Auth' },
            ].map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => {
                  setSelectedCategory(cat.id);
                  setCurrentPage(1);
                }}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold cursor-pointer ${
                  selectedCategory === cat.id
                    ? 'bg-[#27845D] text-white'
                    : 'bg-[#F4F6F4] hover:bg-[#EAEFEA] text-[#52605C]'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 text-xs">
            <select
              value={selectedSeverity}
              onChange={(e) => {
                setSelectedSeverity(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-[#F8FAF8] border border-[#E3E8E3] rounded-lg px-2.5 py-1 text-xs font-semibold text-[#18211F]"
            >
              <option value="all">All Severities</option>
              <option value="info">Info</option>
              <option value="success">Success</option>
              <option value="warning">Warning</option>
              <option value="critical">Critical</option>
            </select>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="bg-[#F8FAF8] border border-[#E3E8E3] rounded-lg px-2 py-1 text-xs font-semibold text-[#18211F]"
            >
              <option value={15}>15 / page</option>
              <option value={25}>25 / page</option>
              <option value={50}>50 / page</option>
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-[#E3E8E3] overflow-hidden">
        <div className="px-4 py-3 bg-[#F8FAF8] border-b border-[#E3E8E3] flex items-center justify-between text-xs">
          <span className="font-bold text-[#18211F] tabular-nums">
            {filteredLogs.length} audit entries (immutable)
          </span>
          <span className="font-mono text-[#69736F]">
            Page {currentPage} of {totalPages}
          </span>
        </div>

        {paginatedLogs.length === 0 ? (
          <div className="p-12 text-center">
            <ClipboardList className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <div className="text-sm font-bold text-[#18211F]">No audit entries match current filters</div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#FAFBF9] border-b border-[#E3E8E3] text-[11px] font-bold text-[#69736F] uppercase tracking-wider">
                  <th className="py-3 px-4">When</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Staff / Actor</th>
                  <th className="py-3 px-4">Target</th>
                  <th className="py-3 px-4">Change Details</th>
                  <th className="py-3 px-4 text-right">Record</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EAEFEA] text-xs">
                {paginatedLogs.map((log) => (
                  <tr
                    key={log.id}
                    onClick={() => setInspectModalLog(log)}
                    className="hover:bg-[#F9FAF9] transition-colors cursor-pointer"
                  >
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="font-semibold text-[#18211F]">{getRelativeTime(log.timestamp)}</div>
                      <div className="text-[10px] text-gray-400 font-mono">
                        {new Date(log.timestamp).toLocaleString()}
                      </div>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">{getActionBadge(log.action)}</td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 capitalize text-[#3B4743]">
                        {getCategoryIcon(log.category)}
                        <span>{(log.category || 'system').replace('_', ' ')}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap font-medium text-[#18211F]">
                      {log.adminEmail}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap text-[#3B4743]">
                      {log.targetUserEmail || log.targetUserId || 'Platform'}
                    </td>
                    <td className="py-3 px-4 max-w-md text-[#52605C]">{log.details}</td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setInspectModalLog(log);
                        }}
                        className="px-2.5 py-1 rounded-md bg-[#F4F6F4] hover:bg-[#182D2A] hover:text-white text-[#18211F] text-[11px] font-semibold cursor-pointer"
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div className="px-4 py-3 bg-[#F8FAF8] border-t border-[#E3E8E3] flex items-center justify-between text-xs">
            <span className="text-[#69736F] tabular-nums">
              Showing {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, filteredLogs.length)} of {filteredLogs.length}
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1 rounded border border-[#D5DED5] bg-white disabled:opacity-40 font-semibold flex items-center gap-1 cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" /> Prev
              </button>
              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="px-3 py-1 rounded border border-[#D5DED5] bg-white disabled:opacity-40 font-semibold flex items-center gap-1 cursor-pointer"
              >
                Next <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {inspectModalLog && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full border border-[#E3E8E3] shadow-xl overflow-hidden flex flex-col max-h-[88vh]">
            <div className="p-4 bg-[#182D2A] text-white flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold">Read-Only Audit Event</h3>
                <p className="text-[10px] text-emerald-300 font-mono">{inspectModalLog.id}</p>
              </div>
              <button
                type="button"
                onClick={() => setInspectModalLog(null)}
                className="text-white/75 hover:text-white p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3.5 bg-[#F8FAF8] rounded-xl border border-[#E3E8E3]">
                <div>
                  <div className="text-[10px] uppercase font-bold text-[#69736F]">Action</div>
                  <div className="mt-1">{getActionBadge(inspectModalLog.action)}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase font-bold text-[#69736F]">Actor</div>
                  <div className="font-semibold text-[#18211F] mt-1">{inspectModalLog.adminEmail}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase font-bold text-[#69736F]">Target</div>
                  <div className="font-semibold text-[#18211F] mt-1">
                    {inspectModalLog.targetUserEmail || inspectModalLog.targetUserId || 'Platform'}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] uppercase font-bold text-[#69736F]">Timestamp (UTC)</div>
                  <div className="font-mono text-[#18211F] mt-1">{inspectModalLog.timestamp}</div>
                </div>
              </div>

              <div className="p-3.5 bg-white rounded-xl border border-[#E3E8E3]">
                <div className="text-[10px] uppercase font-bold text-[#69736F] mb-1">Details</div>
                <p className="text-[#18211F] leading-relaxed">{inspectModalLog.details}</p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-bold uppercase text-[#69736F]">Event Payload</span>
                  <button
                    type="button"
                    onClick={() => handleCopy(JSON.stringify(inspectModalLog, null, 2), inspectModalLog.id)}
                    className="text-[11px] font-semibold text-[#27845D] flex items-center gap-1 cursor-pointer"
                  >
                    {copiedId === inspectModalLog.id ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedId === inspectModalLog.id ? 'Copied' : 'Copy JSON'}</span>
                  </button>
                </div>
                <pre className="p-3 bg-[#0B1513] text-[#A2E2C7] rounded-xl font-mono text-[11px] overflow-x-auto max-h-48">
                  {JSON.stringify(inspectModalLog, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
