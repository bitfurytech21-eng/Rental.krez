import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Briefcase,
  Building2,
  Check,
  CheckCircle2,
  Copy,
  Download,
  Edit3,
  Eye,
  EyeOff,
  FileText,
  Lock,
  Plus,
  Search,
  SlidersHorizontal,
  Trash2,
  UserCheck,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import { User as PlatformUser } from '../../types/user';
import { formatDate } from '../../lib/utils';
import { AdminReconciliationView } from './AdminReconciliationView';
import { AdminAccountSettings } from './AdminAccountSettings';
import { AdminSectionId, AdminSettingsTabId, canAccessSection } from './adminRbac';
import {
  AdminStatsSummary,
  GateDetailRow,
  PaymentGateRecord,
  approveDepositSubmission,
  approveWithdrawalRequest,
  centsToEur,
  computeDefaultWithdrawalFeeCents,
  createPrivateBucketSignedUrl,
  deletePaymentGateRecord,
  eurToCents,
  fetchSettingsRows,
  formatCentsEur,
  maskIban,
  parseStrictEurToCents,
  recordManualDepositRpc,
  rejectDepositSubmission,
  rejectWithdrawalRequest,
  savePaymentGateRecord,
  saveSettingsRow,
} from './adminSupabaseGateway';
import { AdminActionDialog, useDialogFocus } from './AdminActionDialog';
import type { StaffRole } from '../../types/user';

const triggerCsvDownload = (filename: string, headers: string[], rows: (string | number)[][]) => {
  const escape = (val: string | number) => {
    const str = String(val ?? '');
    return str.includes(',') || str.includes('"') || str.includes('\n')
      ? `"${str.replace(/"/g, '""')}"`
      : str;
  };
  const csv = [headers.join(','), ...rows.map((r) => r.map(escape).join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

// ============================================================================
// 1. DASHBOARD: admin_stats() clickable KPI cards linking to respective pages
// ============================================================================
export const AdminDashboardSection: React.FC<{
  stats: AdminStatsSummary;
  users: PlatformUser[];
  transactions: any[];
  pendingInvestmentRequestsCount?: number;
  lastSyncedAt?: string;
  effectiveRole: StaffRole;
  onNavigateSection: (section: AdminSectionId) => void;
}> = ({ stats, users, transactions, pendingInvestmentRequestsCount = 0, lastSyncedAt, effectiveRole, onNavigateSection }) => {
  const userById = useMemo(() => new Map(users.map((u) => [u.id, u])), [users]);

  const cards: Array<{
    title: string;
    value: string;
    subtext: string;
    target: AdminSectionId;
    icon: React.ComponentType<{ className?: string }>;
    pendingBadge?: number;
    accent?: boolean;
  }> = [
    {
      title: 'Pending Deposits',
      value: String(stats.pendingDepositsCount),
      subtext: `${formatCentsEur(eurToCents(stats.pendingDepositsTotalEur))} awaiting settlement`,
      target: 'deposits',
      icon: ArrowDownLeft,
      pendingBadge: stats.pendingDepositsCount,
    },
    {
      title: 'Pending Withdrawals',
      value: String(stats.pendingWithdrawalsCount),
      subtext: `${formatCentsEur(eurToCents(stats.pendingWithdrawalsTotalEur))} awaiting payout`,
      target: 'withdrawals',
      icon: ArrowUpRight,
      pendingBadge: stats.pendingWithdrawalsCount,
    },
    {
      title: 'KYC Queue',
      value: String(stats.kycQueueCount),
      subtext: 'Pending compliance verifications',
      target: 'kyc',
      icon: UserCheck,
      pendingBadge: stats.kycQueueCount,
    },
    {
      title: 'Investment Requests',
      value: String(pendingInvestmentRequestsCount),
      subtext: 'Pending share allocations',
      target: 'investments',
      icon: Briefcase,
      pendingBadge: pendingInvestmentRequestsCount,
    },
    {
      title: 'Investors',
      value: String(stats.investorsCount),
      subtext: `${users.filter((u) => u.kycStatus === 'verified').length} KYC verified`,
      target: 'investors',
      icon: Users,
    },
    {
      title: 'Total AUM (at cost)',
      value: formatCentsEur(eurToCents(stats.totalAumAtCostEur)),
      subtext: 'Verified capital allocated across SPVs',
      target: 'investments',
      icon: Building2,
      accent: true,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 id="admin-main-heading" data-admin-queue-focus tabIndex={-1} className="text-xl font-bold text-[#F2F5F4] tracking-tight focus:outline-none">Executive Operations Overview</h1>
          <p className="text-xs text-[#8FA1A8] mt-1">
            Live metrics retrieved from <span className="font-mono text-[#6FD8B0]">admin_stats()</span>. Click any card to open its operational queue.
          </p>
        </div>
        <div className="text-[11px] text-[#8FA1A8] tabular-nums">
          Auto-refresh every 30s{lastSyncedAt ? ` · Updated ${formatDate(lastSyncedAt)}` : ''}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {cards.map((card) => {
          const Icon = card.icon;
          const clickable = canAccessSection(effectiveRole, card.target);
          return (
            <button
              key={card.title}
              type="button"
              disabled={!clickable}
              onClick={() => clickable && onNavigateSection(card.target)}
              className={`min-h-[44px] text-left bg-[#121A1F] p-5 rounded-2xl border border-[#1F2C33] transition-colors ${
                clickable ? 'hover:border-[#6FD8B0] cursor-pointer' : 'opacity-80 cursor-default'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[#8FA1A8]">
                  {card.title}
                </span>
                <div className="flex items-center gap-1.5 shrink-0">
                  {typeof card.pendingBadge === 'number' && (
                    <span
                      className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold tabular-nums ${
                        card.pendingBadge > 0
                          ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                          : 'bg-[#0B0F10] text-[#8FA1A8] border border-[#1F2C33]'
                      }`}
                    >
                      {card.pendingBadge}
                    </span>
                  )}
                  <Icon className="w-4 h-4 text-[#6FD8B0] shrink-0" />
                </div>
              </div>
              <div className={`text-xl font-bold mt-2 tabular-nums ${card.accent ? 'text-[#6FD8B0]' : 'text-[#F2F5F4]'}`}>
                {card.value}
              </div>
              <div className="text-[11px] text-[#8FA1A8] mt-1">{card.subtext}</div>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-[#121A1F] border border-[#1F2C33] rounded-2xl p-5 space-y-4">
          <h2 className="text-sm font-bold text-[#F2F5F4]">Role Queues</h2>
          <div className="space-y-2.5 text-xs">
            {canAccessSection(effectiveRole, 'deposits') && (
              <div className="p-3.5 rounded-xl bg-[#0B0F10] border border-[#1F2C33] flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-[#F2F5F4]">Deposit Verification</span>
                    <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold tabular-nums bg-[#121A1F] text-[#6FD8B0] border border-[#1F2C33]">
                      {stats.pendingDepositsCount}
                    </span>
                  </div>
                  <div className="text-[11px] text-[#8FA1A8]">
                    {stats.pendingDepositsCount} pending · {formatCentsEur(eurToCents(stats.pendingDepositsTotalEur))}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onNavigateSection('deposits')}
                  className="min-h-[44px] px-4 py-2 rounded-lg bg-[#6FD8B0] text-[#0B0F10] font-bold text-xs cursor-pointer"
                >
                  Review
                </button>
              </div>
            )}
            {canAccessSection(effectiveRole, 'withdrawals') && (
              <div className="p-3.5 rounded-xl bg-[#0B0F10] border border-[#1F2C33] flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-[#F2F5F4]">Withdrawal Releases</span>
                    <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold tabular-nums bg-[#121A1F] text-[#6FD8B0] border border-[#1F2C33]">
                      {stats.pendingWithdrawalsCount}
                    </span>
                  </div>
                  <div className="text-[11px] text-[#8FA1A8]">
                    {stats.pendingWithdrawalsCount} pending · {formatCentsEur(eurToCents(stats.pendingWithdrawalsTotalEur))}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onNavigateSection('withdrawals')}
                  className="min-h-[44px] px-4 py-2 rounded-lg bg-[#6FD8B0] text-[#0B0F10] font-bold text-xs cursor-pointer"
                >
                  Review
                </button>
              </div>
            )}
            {canAccessSection(effectiveRole, 'investments') && (
              <div className="p-3.5 rounded-xl bg-[#0B0F10] border border-[#1F2C33] flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-[#F2F5F4]">Investment Requests</span>
                    <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold tabular-nums bg-[#121A1F] text-[#6FD8B0] border border-[#1F2C33]">
                      {pendingInvestmentRequestsCount}
                    </span>
                  </div>
                  <div className="text-[11px] text-[#8FA1A8]">
                    {pendingInvestmentRequestsCount} pending share allocation(s)
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onNavigateSection('investments')}
                  className="min-h-[44px] px-4 py-2 rounded-lg bg-[#6FD8B0] text-[#0B0F10] font-bold text-xs cursor-pointer"
                >
                  Review
                </button>
              </div>
            )}
            {canAccessSection(effectiveRole, 'kyc') && (
              <div className="p-3.5 rounded-xl bg-[#0B0F10] border border-[#1F2C33] flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-[#F2F5F4]">Compliance KYC Queue</span>
                    <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold tabular-nums bg-[#121A1F] text-[#6FD8B0] border border-[#1F2C33]">
                      {stats.kycQueueCount}
                    </span>
                  </div>
                  <div className="text-[11px] text-[#8FA1A8]">{stats.kycQueueCount} submission(s) awaiting decision</div>
                </div>
                <button
                  type="button"
                  onClick={() => onNavigateSection('kyc')}
                  className="min-h-[44px] px-4 py-2 rounded-lg bg-[#6FD8B0] text-[#0B0F10] font-bold text-xs cursor-pointer"
                >
                  Open KYC
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="bg-[#121A1F] border border-[#1F2C33] rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-[#F2F5F4]">Recent Ledger Activity</h2>
            {canAccessSection(effectiveRole, 'transactions') && (
              <button
                type="button"
                onClick={() => onNavigateSection('transactions')}
                className="min-h-[44px] px-2 text-xs font-semibold text-[#6FD8B0] hover:underline cursor-pointer"
              >
                Full Ledger
              </button>
            )}
          </div>
          <div className="divide-y divide-[#1F2C33] text-xs">
            {transactions.slice(0, 6).map((tx) => {
              const inv = userById.get(tx.userId);
              return (
                <div key={tx.id} className="py-2.5 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-semibold text-[#F2F5F4] truncate capitalize">
                      {tx.type} · {inv?.email || tx.userEmail || tx.userId}
                    </div>
                    <div className="text-[11px] text-[#8FA1A8] font-mono truncate">{tx.reference}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-bold text-[#6FD8B0] tabular-nums">{formatCentsEur(eurToCents(tx.amount))}</div>
                    <div className="text-[10px] uppercase text-[#8FA1A8]">{tx.status}</div>
                  </div>
                </div>
              );
            })}
            {transactions.length === 0 && (
              <div className="py-8 text-center text-xs text-[#8FA1A8]">No recent transactions recorded.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// 4. DEPOSITS: Assigned Gate, Proof, Pending/Handled tabs (Completed/Failed), oldest-first pending sort
// ============================================================================
export const AdminDepositsSection: React.FC<{
  loading: boolean;
  users: PlatformUser[];
  transactions: any[];
  manualDeposits: any[];
  paymentGates: PaymentGateRecord[];
  onRefresh: () => Promise<void> | void;
  onSuccess: (msg: string) => void;
  onError: (msg: string) => void;
}> = ({ loading, users, transactions, manualDeposits, paymentGates, onRefresh, onSuccess, onError }) => {
  const [queueTab, setQueueTab] = useState<'pending' | 'handled'>('pending');
  const [handledFilter, setHandledFilter] = useState<'all' | 'completed' | 'failed'>('all');
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<'createdAt' | 'investorName' | 'amount' | 'status'>('createdAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Approve modal ("Amount actually received")
  const [approveTarget, setApproveTarget] = useState<any | null>(null);
  const [receivedAmount, setReceivedAmount] = useState<string>('');
  const [checkedBankStatement, setCheckedBankStatement] = useState(false);

  // Reject modal (reason required)
  const [rejectTarget, setRejectTarget] = useState<any | null>(null);
  const [rejectReason, setRejectReason] = useState<string>('');

  // Record manual deposit modal (admin_credit_deposit)
  const investorsOnly = useMemo(() => users.filter((u) => !u.isAdmin && !u.staffRole), [users]);
  const selectableUsers = investorsOnly.length > 0 ? investorsOnly : users;
  const [manualDepOpen, setManualDepOpen] = useState(false);
  const [manualDepConfirmStep, setManualDepConfirmStep] = useState(false);
  const [manualDepSearch, setManualDepSearch] = useState('');
  const [manualDepUserId, setManualDepUserId] = useState<string>(() => selectableUsers[0]?.id || '');
  const [manualDepAmount, setManualDepAmount] = useState<string>('1000');
  const [manualDepNote, setManualDepNote] = useState<string>('');

  const filteredManualUsers = useMemo(() => {
    const q = manualDepSearch.trim().toLowerCase();
    if (!q) return selectableUsers;
    return selectableUsers.filter((u) =>
      `${u.fullName || ''} ${u.email} ${u.id}`.toLowerCase().includes(q)
    );
  }, [selectableUsers, manualDepSearch]);

  // Proof modal & manual deposit modal focus traps
  const [proofViewer, setProofViewer] = useState<{ title: string; url: string | null } | null>(null);
  const manualModalRef = useDialogFocus<HTMLFormElement>(
    manualDepOpen && !manualDepConfirmStep,
    () => {
      setManualDepOpen(false);
      setManualDepConfirmStep(false);
    }
  );
  const proofModalRef = useDialogFocus<HTMLDivElement>(Boolean(proofViewer), () => setProofViewer(null));

  const userById = useMemo(() => new Map(users.map((u) => [u.id, u])), [users]);
  const gateById = useMemo(() => new Map(paymentGates.map((g) => [g.id, g.name])), [paymentGates]);

  const resolveProcessorLabel = (raw?: string): string => {
    if (!raw) return 'System';
    const match = userById.get(raw);
    return match?.email || match?.fullName || raw;
  };

  const combinedDeposits = useMemo(() => {
    const manualRows = manualDeposits.map((m) => {
      const uid = String(m.userId || m.user_id || '');
      const u = userById.get(uid);
      const st = String(m.status || 'pending').toLowerCase();
      return {
        id: String(m.id),
        userId: uid,
        investorName: u?.fullName || m.senderName || m.userName || 'Investor',
        investorEmail: u?.email || m.userEmail || uid,
        gateLabel: m.methodName || m.method || (u?.assignedGateId ? gateById.get(u.assignedGateId) : u?.assignedGateName) || 'Assigned Gate',
        amount: Number(m.amount || 0),
        reference: String(m.reference || m.transactionId || m.id),
        proofPath: m.proofFilePath || m.proofUrl || m.proofDataUrl || m.proof_path || '',
        createdAt: String(m.createdAt || m.submittedAt || m.created_at || new Date().toISOString()),
        processedBy: m.processedBy || m.processed_by_email || m.processed_by || m.reviewedBy || m.reviewed_by || undefined,
        processedAt: m.processedAt || m.processed_at || m.reviewedAt || m.reviewed_at || undefined,
        rawStatus: st,
        status: st === 'approved' || st === 'completed' ? 'completed' : st === 'rejected' || st === 'failed' ? 'failed' : 'pending',
        isManual: true,
      };
    });

    const manualRefs = new Set(manualRows.map((r) => r.reference));
    const txRows = transactions
      .filter((t) => t.type === 'deposit' && !manualRefs.has(String(t.reference || '')))
      .map((t) => {
        const u = userById.get(t.userId);
        const st = String(t.status || 'pending').toLowerCase();
        return {
          id: String(t.id),
          userId: String(t.userId || ''),
          investorName: u?.fullName || 'Investor',
          investorEmail: u?.email || t.userEmail || t.userId,
          gateLabel: (u?.assignedGateId ? gateById.get(u.assignedGateId) : u?.assignedGateName) || t.method || 'Bank / Crypto',
          amount: Number(t.amount || 0),
          reference: String(t.reference || t.id),
          proofPath: t.proofUrl || t.txHash || '',
          createdAt: String(t.createdAt || new Date().toISOString()),
          processedBy: t.processedBy || t.processed_by_email || t.processed_by || undefined,
          processedAt: t.processedAt || t.processed_at || undefined,
          rawStatus: st,
          status: st === 'approved' || st === 'completed' ? 'completed' : st === 'rejected' || st === 'failed' ? 'failed' : 'pending',
          isManual: false,
        };
      });

    return [...manualRows, ...txRows];
  }, [manualDeposits, transactions, userById, gateById]);

  const pendingCount = useMemo(() => combinedDeposits.filter((d) => d.status === 'pending').length, [combinedDeposits]);
  const handledCount = useMemo(() => combinedDeposits.filter((d) => d.status !== 'pending').length, [combinedDeposits]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const rows = combinedDeposits
      .filter((d) => {
        if (queueTab === 'pending') return d.status === 'pending';
        if (d.status === 'pending') return false;
        if (handledFilter === 'completed') return d.status === 'completed';
        if (handledFilter === 'failed') return d.status === 'failed';
        return true;
      })
      .filter((d) =>
        q
          ? `${d.investorName} ${d.investorEmail} ${d.reference} ${d.gateLabel}`.toLowerCase().includes(q)
          : true
      );

    return rows.sort((a, b) => {
      const left = a[sortKey];
      const right = b[sortKey];
      const comparison = sortKey === 'amount'
        ? eurToCents(left as number) - eurToCents(right as number)
        : sortKey === 'createdAt'
        ? new Date(String(queueTab === 'handled' && a.processedAt ? a.processedAt : left)).getTime() -
          new Date(String(queueTab === 'handled' && b.processedAt ? b.processedAt : right)).getTime()
        : String(left).localeCompare(String(right), undefined, { sensitivity: 'base' });
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [combinedDeposits, queueTab, handledFilter, search, sortKey, sortDirection]);

  const switchQueueTab = (tab: 'pending' | 'handled') => {
    setQueueTab(tab);
    setSortKey('createdAt');
    setSortDirection(tab === 'pending' ? 'asc' : 'desc');
  };

  const toggleSort = (key: typeof sortKey) => {
    if (sortKey === key) {
      setSortDirection((direction) => direction === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDirection(key === 'createdAt' ? (queueTab === 'pending' ? 'asc' : 'desc') : key === 'amount' ? 'desc' : 'asc');
    }
  };

  const sortLabel = (key: typeof sortKey, label: string) => (
    <button type="button" onClick={() => toggleSort(key)} className="min-h-[44px] inline-flex items-center gap-1.5 hover:text-[#F2F5F4] cursor-pointer" aria-label={`Sort deposits by ${label}`}>
      {label}<span aria-hidden="true">{sortKey === key ? (sortDirection === 'asc' ? '↑' : '↓') : '↕'}</span>
    </button>
  );

  if (loading) {
    return (
      <div className="space-y-3" role="status" aria-label="Loading deposit review queue">
        <div className="h-10 rounded-xl bg-[#121A1F] animate-pulse" />
        <div className="rounded-2xl border border-[#1F2C33] overflow-hidden">
          {Array.from({ length: 6 }, (_, index) => (
            <div key={index} className="grid grid-cols-8 gap-3 p-4 border-b border-[#1F2C33]">
              {Array.from({ length: 8 }, (_, cell) => <div key={cell} className="h-4 rounded bg-[#1F2C33] animate-pulse" />)}
            </div>
          ))}
        </div>
      </div>
    );
  }

  const handleOpenProof = async (row: any) => {
    try {
      const url = await createPrivateBucketSignedUrl(
        row.proofPath,
        ['manual-payment-proofs', 'documents', 'deposits'],
        row.proofPath
      );
      setProofViewer({ title: `Proof of Payment — ${row.reference}`, url });
    } catch (err: any) {
      onError(err?.message || 'Unable to generate signed URL for payment proof.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 id="admin-main-heading" data-admin-queue-focus tabIndex={-1} className="text-lg font-bold text-[#F2F5F4] tracking-tight focus:outline-none">Deposits</h2>
            <p className="text-xs text-[#8FA1A8] mt-1">
              Confirmed individually (oldest pending first) via <span className="font-mono text-[#6FD8B0]">approve_deposit</span> / <span className="font-mono text-[#6FD8B0]">reject_deposit</span>.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={() => switchQueueTab('pending')}
                className={`min-h-[44px] px-3.5 py-2 rounded-lg text-xs font-semibold cursor-pointer tabular-nums ${
                  queueTab === 'pending' ? 'bg-[#6FD8B0] text-[#0B0F10]' : 'bg-[#121A1F] border border-[#1F2C33] text-[#B6C4C9]'
                }`}
              >
                Pending ({pendingCount})
              </button>
              <button
                type="button"
                onClick={() => switchQueueTab('handled')}
                className={`min-h-[44px] px-3.5 py-2 rounded-lg text-xs font-semibold cursor-pointer tabular-nums ${
                  queueTab === 'handled' ? 'bg-[#6FD8B0] text-[#0B0F10]' : 'bg-[#121A1F] border border-[#1F2C33] text-[#B6C4C9]'
                }`}
              >
                Handled ({handledCount})
              </button>
            </div>
            <button
              type="button"
              onClick={() => {
                setManualDepSearch('');
                setManualDepUserId((p) => p || selectableUsers[0]?.id || '');
                setManualDepConfirmStep(false);
                setManualDepOpen(true);
              }}
              className="min-h-[44px] whitespace-nowrap px-4 py-2 rounded-xl bg-[#6FD8B0] hover:bg-[#5ec8a0] text-[#0B0F10] text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Record manual deposit</span>
            </button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#8FA1A8]" />
            <input
              id="dep-queue-search"
              type="text"
              aria-label="Search deposits by investor name, email, or reference"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search investor name, email, or reference..."
              className="min-h-[44px] w-full pl-8 pr-3 py-2 bg-[#121A1F] border border-[#1F2C33] rounded-xl text-xs text-[#F2F5F4]"
            />
          </div>

          {queueTab === 'handled' && (
            <div className="flex items-center gap-1.5">
              {([
                { id: 'all', label: 'All' },
                { id: 'completed', label: 'Completed' },
                { id: 'failed', label: 'Failed' },
              ] as const).map((sub) => (
                <button
                  key={sub.id}
                  type="button"
                  onClick={() => setHandledFilter(sub.id)}
                  className={`min-h-[44px] px-3.5 py-2 rounded-lg text-xs font-semibold cursor-pointer ${
                    handledFilter === sub.id
                      ? 'bg-[#6FD8B0]/20 text-[#6FD8B0] border border-[#6FD8B0]/40'
                      : 'bg-[#121A1F] border border-[#1F2C33] text-[#8FA1A8]'
                  }`}
                >
                  {sub.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="bg-[#121A1F] rounded-2xl border border-[#1F2C33] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-[#0B0F10] border-b border-[#1F2C33] text-[11px] font-semibold text-[#8FA1A8] uppercase tracking-wider">
                <th className="py-3 px-4">{sortLabel('investorName', 'Investor')}</th>
                <th className="py-3 px-4">Assigned Gate</th>
                <th className="py-3 px-4 text-right">{sortLabel('amount', 'Amount')}</th>
                <th className="py-3 px-4">Payment Reference</th>
                <th className="py-3 px-4">Proof of Payment</th>
                <th className="py-3 px-4">{sortLabel('createdAt', 'Date')}</th>
                <th className="py-3 px-4">{sortLabel('status', 'Status')}</th>
                <th className="py-3 px-4 text-right">
                  {queueTab === 'handled' ? 'Processed By & When' : 'Action'}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1F2C33]">
              {filtered.map((row) => (
                <tr key={row.id} className="hover:bg-[#162026]">
                  <td className="py-3.5 px-4">
                    <div className="font-semibold text-[#F2F5F4]">{row.investorName}</div>
                    <div className="text-[11px] text-[#8FA1A8]">{row.investorEmail}</div>
                  </td>
                  <td className="py-3.5 px-4 text-[#B6C4C9]">{row.gateLabel}</td>
                  <td className="py-3.5 px-4 text-right font-bold text-[#6FD8B0] tabular-nums">{formatCentsEur(eurToCents(row.amount))}</td>
                  <td className="py-3.5 px-4 font-mono text-[#F2F5F4]">{row.reference}</td>
                  <td className="py-3.5 px-4">
                    {row.proofPath ? (
                      <button
                        type="button"
                        onClick={() => handleOpenProof(row)}
                        className="min-h-[44px] px-3 py-2 rounded-lg bg-[#0B0F10] border border-[#1F2C33] hover:border-[#6FD8B0] text-[#6FD8B0] text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>View Proof</span>
                      </button>
                    ) : (
                      <span className="text-[11px] text-[#8FA1A8]">No attachment</span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-[#B6C4C9] whitespace-nowrap">{formatDate(row.createdAt)}</td>
                  <td className="py-3.5 px-4">
                    <span className={`uppercase font-semibold text-[11px] ${
                      row.status === 'completed' ? 'text-[#6FD8B0]' : row.status === 'failed' ? 'text-rose-400' : 'text-amber-400'
                    }`}>
                      {row.rawStatus}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right whitespace-nowrap">
                    {queueTab === 'pending' && row.status === 'pending' ? (
                      <div className="inline-flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setApproveTarget(row);
                            setReceivedAmount(centsToEur(eurToCents(row.amount)).toFixed(2));
                            setCheckedBankStatement(false);
                          }}
                          className="min-h-[44px] px-3.5 py-2 rounded-lg bg-[#6FD8B0] hover:bg-[#5ec8a0] text-[#0B0F10] text-xs font-bold cursor-pointer"
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setRejectTarget(row);
                            setRejectReason('');
                          }}
                          className="min-h-[44px] px-3.5 py-2 rounded-lg bg-[#0B0F10] border border-rose-500/40 text-rose-300 hover:bg-rose-500/10 text-xs font-semibold cursor-pointer"
                        >
                          Reject
                        </button>
                      </div>
                    ) : (
                      <div className="text-right">
                        <div className="text-[11px] font-medium text-[#F2F5F4]">
                          {resolveProcessorLabel(row.processedBy)}
                        </div>
                        <div className="text-[10px] text-[#8FA1A8]">
                          {row.processedAt ? formatDate(row.processedAt) : '—'}
                        </div>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-xs text-[#8FA1A8]">
                    {queueTab === 'pending' && !search.trim()
                      ? 'Nothing waiting'
                      : 'No matching deposits found.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Approve Deposit Dialog (Editable optional Amount actually received) */}
      {(() => {
        const trimmedAmt = receivedAmount.trim();
        const requestedCents = approveTarget ? eurToCents(approveTarget.amount) : 0;
        const parsedCents = trimmedAmt === '' ? requestedCents : parseStrictEurToCents(trimmedAmt);
        const creditCents = parsedCents !== null && parsedCents > 0 ? parsedCents : requestedCents;
        const differsFromRequested = Boolean(
          approveTarget && trimmedAmt !== '' && parsedCents !== null && parsedCents !== requestedCents
        );
        return (
          <AdminActionDialog
            open={Boolean(approveTarget)}
            actionName="Approve deposit"
            confirmLabel="Approve deposit"
            investorName={approveTarget?.investorName || 'Investor'}
            investorEmail={approveTarget?.investorEmail || ''}
            amountCents={creditCents}
            reference={approveTarget?.reference || ''}
            extraDetails={[
              { label: 'Requested', value: formatCentsEur(requestedCents) },
              { label: 'Amount to Credit', value: formatCentsEur(creditCents), tone: 'accent' },
            ]}
            validate={() => {
              if (trimmedAmt !== '') {
                const c = parseStrictEurToCents(trimmedAmt);
                if (c === null || c <= 0) {
                  return 'Amount actually received must be a positive number in euros, or leave blank to use the requested amount.';
                }
                if (c !== requestedCents && !checkedBankStatement) {
                  return 'Please tick "I checked my bank statement" before approving a different amount.';
                }
              }
              return null;
            }}
            onConfirm={async () => {
              if (!approveTarget) return;
              const explicitCents = trimmedAmt === '' ? undefined : parseStrictEurToCents(trimmedAmt);
              const cleanEur = explicitCents !== undefined && explicitCents !== null ? centsToEur(explicitCents) : undefined;
              await approveDepositSubmission(approveTarget.id, cleanEur, approveTarget.isManual);
              const finalCents = explicitCents ?? requestedCents;
              return `Deposit approved (${formatCentsEur(finalCents)} credited via approve_deposit).`;
            }}
            onRefresh={onRefresh}
            onRefreshError={onError}
            onSuccess={onSuccess}
            onClose={() => {
              setApproveTarget(null);
              setCheckedBankStatement(false);
            }}
          >
            <div className="space-y-3">
              <div>
                <label htmlFor="dep-received-amount" className="block text-xs font-semibold text-[#B6C4C9] mb-1">
                  Amount actually received (EUR)
                </label>
                <input
                  id="dep-received-amount"
                  type="number"
                  min={0.01}
                  step="0.01"
                  value={receivedAmount}
                  placeholder={centsToEur(requestedCents).toFixed(2)}
                  onChange={(e) => {
                    setReceivedAmount(e.target.value);
                    setCheckedBankStatement(false);
                  }}
                  className="min-h-[44px] w-full px-3 py-2 bg-[#0B0F10] border border-[#1F2C33] rounded-xl font-mono text-sm text-[#6FD8B0] font-bold"
                />
              </div>

              {differsFromRequested && (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/40 text-amber-200 text-xs space-y-2">
                  <div className="font-semibold text-amber-300">Different from requested amount</div>
                  <label htmlFor="dep-checked-bank" className="min-h-[44px] flex items-center gap-2 cursor-pointer text-[#F2F5F4]">
                    <input
                      id="dep-checked-bank"
                      type="checkbox"
                      checked={checkedBankStatement}
                      onChange={(e) => setCheckedBankStatement(e.target.checked)}
                      className="w-4 h-4 rounded accent-amber-400"
                    />
                    <span>I checked my bank statement</span>
                  </label>
                </div>
              )}
            </div>
          </AdminActionDialog>
        );
      })()}

      {/* Reject Deposit Dialog (Reason required) */}
      <AdminActionDialog
        open={Boolean(rejectTarget)}
        actionName="Reject deposit"
        confirmLabel="Reject deposit"
        tone="danger"
        investorName={rejectTarget?.investorName || 'Investor'}
        investorEmail={rejectTarget?.investorEmail || ''}
        amountCents={rejectTarget ? eurToCents(rejectTarget.amount) : 0}
        reference={rejectTarget?.reference || ''}
        validate={() => (!rejectReason.trim() ? 'A rejection reason is required.' : null)}
        onConfirm={async () => {
          if (!rejectTarget) return;
          await rejectDepositSubmission(rejectTarget.id, rejectReason.trim(), rejectTarget.isManual);
          setRejectReason('');
          return 'Deposit rejected via reject_deposit.';
        }}
        onRefresh={onRefresh}
        onRefreshError={onError}
        onSuccess={onSuccess}
        onClose={() => {
          setRejectTarget(null);
          setRejectReason('');
        }}
      >
        <div>
          <label htmlFor="dep-reject-reason" className="block text-xs font-semibold text-[#B6C4C9] mb-1">
            Rejection Reason *
          </label>
          <textarea
            id="dep-reject-reason"
            rows={3}
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="e.g. Wire transfer not received or reference mismatch..."
            className="w-full p-3 bg-[#0B0F10] border border-[#1F2C33] rounded-xl text-xs text-[#F2F5F4]"
          />
        </div>
      </AdminActionDialog>

      {/* Record Manual Deposit Modal (admin_credit_deposit with investor search, amount & note) */}
      {manualDepOpen && (() => {
        const uid = filteredManualUsers.some((u) => u.id === manualDepUserId)
          ? manualDepUserId
          : filteredManualUsers[0]?.id || '';
        const targetInv = userById.get(uid) || filteredManualUsers[0];
        const parsedCents = parseStrictEurToCents(manualDepAmount);
        const amtCents = parsedCents !== null && parsedCents > 0 ? parsedCents : 0;
        const curCents = eurToCents(targetInv?.walletBalance ?? 0);
        const projCents = curCents + amtCents;
        return (
          <>
            {!manualDepConfirmStep && (
              <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
                <form
                  ref={manualModalRef}
                  tabIndex={-1}
                  role="dialog"
                  aria-modal="true"
                  aria-label="Record manual deposit"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const c = parseStrictEurToCents(manualDepAmount);
                    if (!uid || c === null || c <= 0) {
                      onError('Select an investor and enter a positive amount in euros.');
                      return;
                    }
                    setManualDepConfirmStep(true);
                  }}
                  noValidate
                  className="bg-[#121A1F] border border-[#1F2C33] rounded-2xl max-w-md w-full p-6 space-y-4 focus:outline-none"
                >
                  <div className="flex items-center justify-between border-b border-[#1F2C33] pb-3">
                    <h3 className="text-sm font-bold text-[#F2F5F4]">Record manual deposit</h3>
                    <button
                      type="button"
                      onClick={() => {
                        setManualDepOpen(false);
                        setManualDepConfirmStep(false);
                      }}
                      aria-label="Close manual deposit dialog"
                      className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-[#8FA1A8] hover:text-[#F2F5F4] cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="space-y-3 text-xs">
                    <div>
                      <label htmlFor="manual-dep-search" className="block text-[#B6C4C9] font-semibold mb-1">Search Investor</label>
                      <div className="relative mb-2">
                        <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#8FA1A8]" />
                        <input
                          id="manual-dep-search"
                          type="text"
                          value={manualDepSearch}
                          onChange={(e) => {
                            const nextSearch = e.target.value;
                            setManualDepSearch(nextSearch);
                            const q = nextSearch.trim().toLowerCase();
                            const firstMatch = selectableUsers.find((u) =>
                              `${u.fullName || ''} ${u.email} ${u.id}`.toLowerCase().includes(q)
                            );
                            if (firstMatch) setManualDepUserId(firstMatch.id);
                          }}
                          placeholder="Search by investor name or email..."
                          className="min-h-[44px] w-full pl-8 pr-3 py-2 bg-[#0B0F10] border border-[#1F2C33] rounded-xl text-[#F2F5F4]"
                        />
                      </div>
                      <select
                        id="manual-dep-investor"
                        aria-label="Select investor for manual deposit"
                        value={uid}
                        onChange={(e) => setManualDepUserId(e.target.value)}
                        className="min-h-[44px] w-full px-3 py-2 bg-[#0B0F10] border border-[#1F2C33] rounded-xl text-[#F2F5F4]"
                      >
                        {filteredManualUsers.length === 0 && <option value="">No matching investors</option>}
                        {filteredManualUsers.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.fullName || u.email} ({u.email}) — {formatCentsEur(eurToCents(u.walletBalance))}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label htmlFor="manual-dep-amount" className="block text-[#B6C4C9] font-semibold mb-1">Amount (EUR)</label>
                      <input
                        id="manual-dep-amount"
                        type="number"
                        min={0.01}
                        step="0.01"
                        value={manualDepAmount}
                        onChange={(e) => setManualDepAmount(e.target.value)}
                        className="min-h-[44px] w-full px-3 py-2 bg-[#0B0F10] border border-[#1F2C33] rounded-xl font-mono text-[#F2F5F4]"
                      />
                    </div>
                    <div>
                      <label htmlFor="manual-dep-note" className="block text-[#B6C4C9] font-semibold mb-1">Note</label>
                      <input
                        id="manual-dep-note"
                        type="text"
                        value={manualDepNote}
                        onChange={(e) => setManualDepNote(e.target.value)}
                        placeholder="Direct bank settlement note or wire ID"
                        className="min-h-[44px] w-full px-3 py-2 bg-[#0B0F10] border border-[#1F2C33] rounded-xl text-[#F2F5F4]"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setManualDepOpen(false);
                        setManualDepConfirmStep(false);
                      }}
                      className="min-h-[44px] px-4 py-2 rounded-xl bg-[#0B0F10] border border-[#1F2C33] text-xs font-semibold text-[#B6C4C9] cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="min-h-[44px] px-4 py-2 rounded-xl bg-[#6FD8B0] text-[#0B0F10] text-xs font-bold cursor-pointer"
                    >
                      Review Deposit
                    </button>
                  </div>
                </form>
              </div>
            )}

            <AdminActionDialog
              open={manualDepConfirmStep}
              actionName="Credit deposit"
              confirmLabel="Credit deposit"
              investorName={targetInv?.fullName || 'Investor'}
              investorEmail={targetInv?.email || uid}
              amountCents={amtCents}
              reference={`MANUAL-${uid.slice(0, 8)}`}
              extraDetails={[
                { label: 'Current Balance', value: formatCentsEur(curCents) },
                { label: 'Projected Balance', value: formatCentsEur(projCents), tone: 'accent' },
                { label: 'Note', value: manualDepNote.trim() || 'Admin manual credit deposit' },
              ]}
              validate={() => {
                const c = parseStrictEurToCents(manualDepAmount);
                if (!uid || c === null || c <= 0) {
                  return 'Select an investor and enter a positive amount in euros.';
                }
                return null;
              }}
              onConfirm={async () => {
                const c = parseStrictEurToCents(manualDepAmount);
                if (!uid || c === null || c <= 0) {
                  throw new Error('Select an investor and enter a positive amount in euros.');
                }
                await recordManualDepositRpc({
                  userId: uid,
                  amountEur: centsToEur(c),
                  note: manualDepNote,
                });
                setManualDepNote('');
                return `Manual deposit of ${formatCentsEur(c)} credited via admin_credit_deposit.`;
              }}
              onRefresh={onRefresh}
              onRefreshError={onError}
              onSuccess={onSuccess}
              onClose={() => {
                setManualDepConfirmStep(false);
                setManualDepOpen(false);
              }}
            />
          </>
        );
      })()}

      {/* Proof Modal */}
      {proofViewer && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div ref={proofModalRef} tabIndex={-1} role="dialog" aria-modal="true" aria-label={proofViewer.title} className="bg-[#121A1F] border border-[#1F2C33] rounded-2xl max-w-2xl w-full p-5 space-y-4 focus:outline-none">
            <div className="flex items-center justify-between border-b border-[#1F2C33] pb-3">
              <h3 className="text-sm font-bold text-[#F2F5F4]">{proofViewer.title}</h3>
              <button type="button" onClick={() => setProofViewer(null)} aria-label="Close payment proof viewer" className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-[#8FA1A8] hover:text-[#F2F5F4] cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="bg-[#0B0F10] border border-[#1F2C33] rounded-xl p-3 max-h-[65vh] overflow-auto flex justify-center">
              {proofViewer.url ? (
                proofViewer.url.toLowerCase().includes('.pdf') || proofViewer.url.includes('application/pdf') ? (
                  <iframe src={proofViewer.url} title={proofViewer.title} className="w-full h-[55vh] rounded-lg" />
                ) : (
                  <img src={proofViewer.url} alt={proofViewer.title} className="max-h-[55vh] object-contain rounded-lg" />
                )
              ) : (
                <p className="text-xs text-[#8FA1A8] py-8">Signed proof URL unavailable.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// 5. WITHDRAWALS: masked destination IBAN with reveal, KYC status, Pending/Handled tabs
// ============================================================================
export const AdminWithdrawalsSection: React.FC<{
  loading: boolean;
  limits?: Record<string, any>;
  users: PlatformUser[];
  transactions: any[];
  onRefresh: () => Promise<void> | void;
  onSuccess: (msg: string) => void;
  onError: (msg: string) => void;
}> = ({ loading, limits, users, transactions, onRefresh, onSuccess, onError }) => {
  const [queueTab, setQueueTab] = useState<'pending' | 'handled'>('pending');
  const [handledFilter, setHandledFilter] = useState<'all' | 'completed' | 'failed'>('all');
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<'createdAt' | 'amount' | 'status'>('createdAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [revealedIds, setRevealedIds] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [approveTarget, setApproveTarget] = useState<any | null>(null);
  const [payoutRef, setPayoutRef] = useState('');
  const [feeInput, setFeeInput] = useState('0.00');
  const [sentFromBankChecked, setSentFromBankChecked] = useState(false);
  const [rejectTarget, setRejectTarget] = useState<any | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const handleCopyIban = async (id: string, rawIban: string) => {
    if (!rawIban || rawIban === 'Not on file') return;
    try {
      await navigator.clipboard.writeText(rawIban);
      setCopiedId(id);
      setTimeout(() => setCopiedId((cur) => (cur === id ? null : cur)), 2000);
    } catch {
      onError('Clipboard copy was blocked by the browser.');
    }
  };

  const userById = useMemo(() => new Map(users.map((u) => [u.id, u])), [users]);

  const resolveProcessorLabel = (raw?: string): string => {
    if (!raw) return 'System';
    const match = userById.get(raw);
    return match?.email || match?.fullName || raw;
  };

  const allWithdrawals = useMemo(
    () => transactions.filter((t) => t.type === 'withdrawal'),
    [transactions]
  );
  const pendingCount = useMemo(
    () => allWithdrawals.filter((t) => t.status === 'pending').length,
    [allWithdrawals]
  );
  const handledCount = useMemo(
    () => allWithdrawals.filter((t) => t.status !== 'pending').length,
    [allWithdrawals]
  );

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filteredRows = allWithdrawals
      .filter((t) => {
        if (queueTab === 'pending') return t.status === 'pending';
        if (t.status === 'pending') return false;
        const isComp = ['completed', 'approved', 'paid'].includes(t.status);
        if (handledFilter === 'completed') return isComp;
        if (handledFilter === 'failed') return !isComp;
        return true;
      })
      .filter((t) => {
        if (!q) return true;
        const inv = userById.get(t.userId);
        return `${inv?.fullName || ''} ${inv?.email || ''} ${t.userEmail || ''} ${t.userId} ${t.reference || ''} ${t.payoutReference || ''} ${t.id}`
          .toLowerCase()
          .includes(q);
      });

    return filteredRows.sort((a, b) => {
      const comparison = sortKey === 'amount'
        ? eurToCents(a.amount) - eurToCents(b.amount)
        : sortKey === 'createdAt'
        ? new Date(String(queueTab === 'handled' && a.processedAt ? a.processedAt : a.createdAt)).getTime() -
          new Date(String(queueTab === 'handled' && b.processedAt ? b.processedAt : b.createdAt)).getTime()
        : String(a.status).localeCompare(String(b.status), undefined, { sensitivity: 'base' });
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [allWithdrawals, queueTab, handledFilter, search, sortKey, sortDirection, userById]);

  const switchQueueTab = (tab: 'pending' | 'handled') => {
    setQueueTab(tab);
    setSortKey('createdAt');
    setSortDirection(tab === 'pending' ? 'asc' : 'desc');
  };

  const toggleSort = (key: typeof sortKey) => {
    if (sortKey === key) {
      setSortDirection((direction) => direction === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDirection(key === 'createdAt' ? (queueTab === 'pending' ? 'asc' : 'desc') : key === 'status' ? 'asc' : 'desc');
    }
  };

  const sortLabel = (key: typeof sortKey, label: string) => (
    <button type="button" onClick={() => toggleSort(key)} className="min-h-[44px] inline-flex items-center gap-1.5 hover:text-[#F2F5F4] cursor-pointer" aria-label={`Sort withdrawals by ${label}`}>
      {label}<span aria-hidden="true">{sortKey === key ? (sortDirection === 'asc' ? '↑' : '↓') : '↕'}</span>
    </button>
  );

  if (loading) {
    return (
      <div className="space-y-3" role="status" aria-label="Loading withdrawal review queue">
        <div className="h-10 rounded-xl bg-[#121A1F] animate-pulse" />
        <div className="rounded-2xl border border-[#1F2C33] overflow-hidden">
          {Array.from({ length: 6 }, (_, index) => (
            <div key={index} className="grid grid-cols-7 gap-3 p-4 border-b border-[#1F2C33]">
              {Array.from({ length: 7 }, (_, cell) => <div key={cell} className="h-4 rounded bg-[#1F2C33] animate-pulse" />)}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 id="admin-main-heading" data-admin-queue-focus tabIndex={-1} className="text-lg font-bold text-[#F2F5F4] tracking-tight focus:outline-none">Withdrawals</h2>
            <p className="text-xs text-[#8FA1A8] mt-1">
              Confirmed individually (oldest pending first) via <span className="font-mono text-[#6FD8B0]">approve_withdrawal</span> / <span className="font-mono text-[#6FD8B0]">reject_withdrawal</span>.
            </p>
          </div>
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={() => switchQueueTab('pending')}
              className={`min-h-[44px] px-3.5 py-2 rounded-lg text-xs font-semibold cursor-pointer tabular-nums ${
                queueTab === 'pending' ? 'bg-[#6FD8B0] text-[#0B0F10]' : 'bg-[#121A1F] border border-[#1F2C33] text-[#B6C4C9]'
              }`}
            >
              Pending ({pendingCount})
            </button>
            <button
              type="button"
              onClick={() => switchQueueTab('handled')}
              className={`min-h-[44px] px-3.5 py-2 rounded-lg text-xs font-semibold cursor-pointer tabular-nums ${
                queueTab === 'handled' ? 'bg-[#6FD8B0] text-[#0B0F10]' : 'bg-[#121A1F] border border-[#1F2C33] text-[#B6C4C9]'
              }`}
            >
              Handled ({handledCount})
            </button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#8FA1A8]" />
            <input
              id="wth-queue-search"
              type="text"
              aria-label="Search withdrawals by investor name, email, or reference"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search investor name, email, or reference..."
              className="min-h-[44px] w-full pl-8 pr-3 py-2 bg-[#121A1F] border border-[#1F2C33] rounded-xl text-xs text-[#F2F5F4]"
            />
          </div>

          {queueTab === 'handled' && (
            <div className="flex items-center gap-1.5">
              {([
                { id: 'all', label: 'All' },
                { id: 'completed', label: 'Completed' },
                { id: 'failed', label: 'Failed' },
              ] as const).map((sub) => (
                <button
                  key={sub.id}
                  type="button"
                  onClick={() => setHandledFilter(sub.id)}
                  className={`min-h-[44px] px-3.5 py-2 rounded-lg text-xs font-semibold cursor-pointer ${
                    handledFilter === sub.id
                      ? 'bg-[#6FD8B0]/20 text-[#6FD8B0] border border-[#6FD8B0]/40'
                      : 'bg-[#121A1F] border border-[#1F2C33] text-[#8FA1A8]'
                  }`}
                >
                  {sub.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="bg-[#121A1F] rounded-2xl border border-[#1F2C33] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-[#0B0F10] border-b border-[#1F2C33] text-[11px] font-semibold text-[#8FA1A8] uppercase tracking-wider">
                <th className="py-3 px-4">Investor</th>
                <th className="py-3 px-4 text-right">{sortLabel('amount', 'Amount')}</th>
                <th className="py-3 px-4">Locked Destination IBAN</th>
                <th className="py-3 px-4">KYC Status</th>
                <th className="py-3 px-4">{sortLabel('createdAt', 'Date')}</th>
                <th className="py-3 px-4">{sortLabel('status', 'Status')}</th>
                <th className="py-3 px-4 text-right">
                  {queueTab === 'handled' ? 'Processed By & When' : 'Action'}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1F2C33]">
              {rows.map((tx) => {
                const inv = userById.get(tx.userId);
                const rawIban = String(tx.destIban || tx.destination || inv?.bankIban || tx.reference || '');
                const revealed = Boolean(revealedIds[tx.id]);
                const wthCents = eurToCents(tx.amount);
                return (
                  <tr key={tx.id} className="hover:bg-[#162026]">
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-[#F2F5F4]">{inv?.fullName || 'Investor'}</div>
                      <div className="text-[11px] text-[#8FA1A8]">{inv?.email || tx.userEmail || tx.userId}</div>
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-[#F2F5F4] tabular-nums">{formatCentsEur(wthCents)}</td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-[#F2F5F4]">
                          {revealed ? rawIban : maskIban(rawIban)}
                        </span>
                        <button
                          type="button"
                          onClick={() => setRevealedIds((p) => ({ ...p, [tx.id]: !p[tx.id] }))}
                          className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg bg-[#0B0F10] border border-[#1F2C33] text-[#8FA1A8] hover:text-[#6FD8B0] cursor-pointer"
                          title={revealed ? 'Hide IBAN' : 'Reveal IBAN'}
                          aria-label={revealed ? 'Hide IBAN' : 'Reveal IBAN'}
                        >
                          {revealed ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCopyIban(tx.id, rawIban)}
                          className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg bg-[#0B0F10] border border-[#1F2C33] text-[#8FA1A8] hover:text-[#6FD8B0] cursor-pointer"
                          title="Copy IBAN"
                          aria-label="Copy IBAN"
                        >
                          {copiedId === tx.id ? (
                            <Check className="w-4 h-4 text-[#6FD8B0]" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`uppercase font-semibold text-[11px] ${
                        inv?.kycStatus === 'verified' ? 'text-[#6FD8B0]' : inv?.kycStatus === 'rejected' ? 'text-rose-400' : 'text-amber-400'
                      }`}>
                        {inv?.kycStatus || 'pending'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-[#B6C4C9] whitespace-nowrap">{formatDate(tx.createdAt)}</td>
                    <td className="py-3.5 px-4">
                      <span className={`uppercase font-semibold text-[11px] ${
                        ['completed', 'approved', 'paid'].includes(tx.status) ? 'text-[#6FD8B0]' : tx.status === 'rejected' || tx.status === 'failed' ? 'text-rose-400' : 'text-amber-400'
                      }`}>
                        {tx.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      {queueTab === 'pending' && tx.status === 'pending' ? (
                        <div className="inline-flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              const defaultFeeCents = computeDefaultWithdrawalFeeCents(wthCents, limits);
                              setApproveTarget({ tx, inv, iban: rawIban });
                              setFeeInput(centsToEur(defaultFeeCents).toFixed(2));
                              setPayoutRef('');
                              setSentFromBankChecked(false);
                            }}
                            className="min-h-[44px] px-3.5 py-2 rounded-lg bg-[#6FD8B0] hover:bg-[#5ec8a0] text-[#0B0F10] text-xs font-bold cursor-pointer"
                          >
                            Approve &amp; Mark Paid
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setRejectTarget(tx);
                              setRejectReason('');
                            }}
                            className="min-h-[44px] px-3.5 py-2 rounded-lg bg-[#0B0F10] border border-rose-500/40 text-rose-300 hover:bg-rose-500/10 text-xs font-semibold cursor-pointer"
                          >
                            Reject
                          </button>
                        </div>
                      ) : (
                        <div className="text-right">
                          <div className="text-[11px] font-medium text-[#F2F5F4]">
                            {resolveProcessorLabel(tx.processedBy)}
                          </div>
                          <div className="text-[10px] text-[#8FA1A8]">
                            {tx.processedAt ? formatDate(tx.processedAt) : tx.payoutReference ? `Ref: ${tx.payoutReference}` : '—'}
                          </div>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-xs text-[#8FA1A8]">
                    {queueTab === 'pending' && !search.trim()
                      ? 'Nothing waiting'
                      : 'No matching withdrawals found.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confirmation Dialog: Approve and mark as paid */}
      {(() => {
        const wthCents = approveTarget ? eurToCents(approveTarget.tx.amount) : 0;
        const parsedFee = parseStrictEurToCents(feeInput.trim() === '' ? '0' : feeInput);
        const feeCents = parsedFee !== null && parsedFee >= 0 ? parsedFee : 0;
        const sendCents = Math.max(0, wthCents - feeCents);
        const destIban = approveTarget
          ? approveTarget.iban || approveTarget.tx.destination || approveTarget.inv?.bankIban || approveTarget.tx.reference
          : '';
        return (
          <AdminActionDialog
            open={Boolean(approveTarget)}
            actionName="Approve withdrawal"
            confirmLabel="Approve withdrawal"
            investorName={approveTarget?.inv?.fullName || 'Investor'}
            investorEmail={approveTarget?.inv?.email || approveTarget?.tx?.userEmail || approveTarget?.tx?.userId || ''}
            amountCents={wthCents}
            reference={approveTarget?.tx?.reference || approveTarget?.tx?.id || ''}
            extraDetails={[
              {
                label: 'Locked Destination IBAN',
                value: approveTarget ? (
                  <span className="inline-flex items-center gap-2">
                    <span className="font-mono">{destIban}</span>
                    <button
                      type="button"
                      onClick={() => handleCopyIban(`modal-${approveTarget.tx.id}`, destIban)}
                      className="min-h-[44px] min-w-[44px] px-2.5 py-1 rounded bg-[#121A1F] border border-[#1F2C33] text-[#6FD8B0] text-xs font-semibold cursor-pointer"
                    >
                      {copiedId === `modal-${approveTarget.tx.id}` ? 'Copied' : 'Copy'}
                    </button>
                  </span>
                ) : '—',
              },
              { label: 'Withdrawal Fee', value: formatCentsEur(feeCents) },
              {
                label: 'You send (amount minus fee)',
                value: `${formatCentsEur(sendCents)} (${formatCentsEur(wthCents)} − ${formatCentsEur(feeCents)})`,
                tone: 'accent',
              },
            ]}
            validate={() => {
              if (!payoutRef.trim()) {
                return 'Payout reference (your bank transfer ID) is required.';
              }
              const fc = parseStrictEurToCents(feeInput.trim() === '' ? '0' : feeInput);
              if (fc === null || fc < 0) {
                return 'Withdrawal fee must be zero or a positive amount in euros.';
              }
              if (fc > wthCents) {
                return 'Withdrawal fee cannot exceed the requested withdrawal amount.';
              }
              if (!sentFromBankChecked) {
                return 'Please tick "I have already sent this payment from my bank" before approving.';
              }
              return null;
            }}
            onConfirm={async () => {
              if (!approveTarget) return;
              const fc = parseStrictEurToCents(feeInput.trim() === '' ? '0' : feeInput) ?? 0;
              const cleanRef = payoutRef.trim();
              await approveWithdrawalRequest(approveTarget.tx.id, cleanRef, centsToEur(fc));
              setPayoutRef('');
              setSentFromBankChecked(false);
              return `Withdrawal approved (Payout ref: ${cleanRef} · You send: ${formatCentsEur(Math.max(0, wthCents - fc))} via approve_withdrawal).`;
            }}
            onRefresh={onRefresh}
            onRefreshError={onError}
            onSuccess={onSuccess}
            onClose={() => {
              setApproveTarget(null);
              setPayoutRef('');
              setSentFromBankChecked(false);
            }}
          >
            <div className="space-y-3 text-xs">
              <div>
                <label htmlFor="wth-fee-input" className="block text-[#B6C4C9] font-semibold mb-1">
                  Withdrawal Fee (EUR){Number(limits?.withdrawal_fee_pct ?? 0) > 0 ? ` — default ${limits?.withdrawal_fee_pct}%` : ''}
                </label>
                <input
                  id="wth-fee-input"
                  type="number"
                  min={0}
                  step="0.01"
                  value={feeInput}
                  onChange={(e) => setFeeInput(e.target.value)}
                  className="min-h-[44px] w-full px-3 py-2 bg-[#0B0F10] border border-[#1F2C33] rounded-xl font-mono text-[#F2F5F4]"
                />
              </div>
              <div>
                <label htmlFor="wth-payout-ref" className="block text-[#B6C4C9] font-semibold mb-1">Payout Reference (Bank Transfer ID) *</label>
                <input
                  id="wth-payout-ref"
                  type="text"
                  value={payoutRef}
                  onChange={(e) => setPayoutRef(e.target.value)}
                  placeholder="e.g. SEPA-20261116-94821"
                  className="min-h-[44px] w-full px-3 py-2 bg-[#0B0F10] border border-[#1F2C33] rounded-xl font-mono text-[#F2F5F4]"
                />
              </div>
              <label htmlFor="wth-sent-checkbox" className="min-h-[44px] flex items-center gap-2 p-2.5 rounded-xl bg-[#0B0F10] border border-[#1F2C33] text-[#F2F5F4] font-semibold cursor-pointer">
                <input
                  id="wth-sent-checkbox"
                  type="checkbox"
                  checked={sentFromBankChecked}
                  onChange={(e) => setSentFromBankChecked(e.target.checked)}
                  className="w-4 h-4 rounded accent-[#6FD8B0]"
                />
                <span>I have already sent this payment from my bank</span>
              </label>
            </div>
          </AdminActionDialog>
        );
      })()}

      {/* Confirmation Dialog: Reject (reason required) */}
      {(() => {
        const inv = rejectTarget ? userById.get(rejectTarget.userId) : undefined;
        const refundCents = rejectTarget ? eurToCents(rejectTarget.amount) : 0;
        return (
          <AdminActionDialog
            open={Boolean(rejectTarget)}
            actionName="Reject withdrawal"
            confirmLabel="Reject withdrawal"
            tone="danger"
            investorName={inv?.fullName || 'Investor'}
            investorEmail={inv?.email || rejectTarget?.userEmail || rejectTarget?.userId || ''}
            amountCents={refundCents}
            reference={rejectTarget?.reference || rejectTarget?.id || ''}
            extraDetails={[
              { label: 'Refund to Wallet', value: formatCentsEur(refundCents), tone: 'accent' },
            ]}
            validate={() => (!rejectReason.trim() ? 'A rejection reason is required.' : null)}
            onConfirm={async () => {
              if (!rejectTarget) return;
              await rejectWithdrawalRequest(rejectTarget.id, rejectReason.trim());
              setRejectReason('');
              return 'Withdrawal rejected and reserved balance restored via reject_withdrawal.';
            }}
            onRefresh={onRefresh}
            onRefreshError={onError}
            onSuccess={onSuccess}
            onClose={() => {
              setRejectTarget(null);
              setRejectReason('');
            }}
          >
            <div className="space-y-2">
              <div className="p-2.5 rounded-xl bg-[#0B0F10] border border-[#1F2C33] text-[11px] text-[#B6C4C9]">
                Rejecting this withdrawal cancels the payout and returns <strong className="text-[#6FD8B0]">{formatCentsEur(refundCents)}</strong> back to the investor&apos;s wallet.
              </div>
              <div>
                <label htmlFor="wth-reject-reason" className="block text-xs font-semibold text-[#B6C4C9] mb-1">
                  Rejection Reason *
                </label>
                <textarea
                  id="wth-reject-reason"
                  rows={3}
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="e.g. Beneficiary IBAN does not match verified account holder..."
                  className="w-full p-3 bg-[#0B0F10] border border-[#1F2C33] rounded-xl text-xs text-[#F2F5F4]"
                />
              </div>
            </div>
          </AdminActionDialog>
        );
      })()}
    </div>
  );
};

// ============================================================================
// 9. TRANSACTIONS: Full ledger with investor, kind, status, date range, pagination & Export CSV
// ============================================================================
export const AdminTransactionsSection: React.FC<{
  users: PlatformUser[];
  transactions: any[];
  onRefresh: () => void;
}> = ({ users, transactions, onRefresh }) => {
  const [subView, setSubView] = useState<'ledger' | 'reconciliation'>('ledger');
  const [search, setSearch] = useState('');
  const [investorFilter, setInvestorFilter] = useState('all');
  const [kindFilter, setKindFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 15;

  const userById = useMemo(() => new Map(users.map((u) => [u.id, u])), [users]);
  const availableKinds = useMemo(
    () => Array.from(new Set(transactions.map((t) => String(t.type || 'transaction')).filter(Boolean))).sort(),
    [transactions]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const fromMs = fromDate ? new Date(fromDate).getTime() : null;
    const toMs = toDate ? new Date(`${toDate}T23:59:59.999Z`).getTime() : null;
    return transactions.filter((t) => {
      if (investorFilter !== 'all' && t.userId !== investorFilter) return false;
      if (kindFilter !== 'all' && t.type !== kindFilter) return false;
      if (statusFilter !== 'all' && t.status !== statusFilter) return false;
      const ts = new Date(t.createdAt).getTime();
      if (fromMs && ts < fromMs) return false;
      if (toMs && ts > toMs) return false;
      if (q) {
        const inv = userById.get(t.userId);
        const hay = `${t.reference} ${t.id} ${t.description} ${inv?.email || ''} ${inv?.fullName || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [transactions, investorFilter, kindFilter, statusFilter, fromDate, toDate, search, userById]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 id="admin-main-heading" data-admin-queue-focus tabIndex={-1} className="text-lg font-bold text-[#F2F5F4] tracking-tight focus:outline-none">Transactions &amp; Ledger</h2>
          <p className="text-xs text-[#8FA1A8] mt-1">
            Complete platform ledger with investor, kind, status, and date-range filters.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setSubView('ledger')}
            className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-semibold cursor-pointer ${
              subView === 'ledger' ? 'bg-[#6FD8B0] text-[#0B0F10]' : 'bg-[#121A1F] border border-[#1F2C33] text-[#B6C4C9]'
            }`}
          >
            Ledger ({filtered.length})
          </button>
          <button
            type="button"
            onClick={() => setSubView('reconciliation')}
            className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-semibold cursor-pointer ${
              subView === 'reconciliation' ? 'bg-[#6FD8B0] text-[#0B0F10]' : 'bg-[#121A1F] border border-[#1F2C33] text-[#B6C4C9]'
            }`}
          >
            Reconciliation
          </button>
          <button
            type="button"
            onClick={() =>
              triggerCsvDownload(
                `lagence-transactions-${new Date().toISOString().slice(0, 10)}.csv`,
                ['Timestamp', 'Reference', 'Investor Email', 'Kind', 'Amount', 'Currency', 'Status', 'Description'],
                filtered.map((t) => [
                  t.createdAt,
                  t.reference,
                  userById.get(t.userId)?.email || t.userEmail || t.userId,
                  t.type,
                  centsToEur(eurToCents(t.amount)).toFixed(2),
                  t.currency || 'EUR',
                  t.status,
                  t.description || '',
                ])
              )
            }
            className="min-h-[44px] px-3.5 py-2 rounded-xl bg-[#121A1F] border border-[#1F2C33] hover:border-[#6FD8B0] text-xs font-semibold text-[#F2F5F4] flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-[#6FD8B0]" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {subView === 'reconciliation' ? (
        <AdminReconciliationView transactions={transactions} onRefresh={onRefresh} />
      ) : (
        <div className="space-y-4">
          <div className="bg-[#121A1F] p-4 rounded-2xl border border-[#1F2C33] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 text-xs">
            <div className="lg:col-span-2 relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#8FA1A8]" />
              <input
                id="tx-ledger-search"
                type="text"
                aria-label="Search ledger transactions by reference or description"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Search reference or description..."
                className="min-h-[44px] w-full pl-9 pr-3 py-2 bg-[#0B0F10] border border-[#1F2C33] rounded-xl text-[#F2F5F4]"
              />
            </div>

            <select
              id="tx-investor-filter"
              aria-label="Filter transactions by investor"
              value={investorFilter}
              onChange={(e) => {
                setInvestorFilter(e.target.value);
                setPage(1);
              }}
              className="min-h-[44px] px-3 py-2 bg-[#0B0F10] border border-[#1F2C33] rounded-xl text-[#F2F5F4]"
            >
              <option value="all">All Investors</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.email}
                </option>
              ))}
            </select>

            <select
              id="tx-kind-filter"
              aria-label="Filter transactions by kind"
              value={kindFilter}
              onChange={(e) => {
                setKindFilter(e.target.value);
                setPage(1);
              }}
              className="min-h-[44px] px-3 py-2 bg-[#0B0F10] border border-[#1F2C33] rounded-xl text-[#F2F5F4]"
            >
              <option value="all">All Kinds</option>
              {availableKinds.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>

            <select
              id="tx-status-filter"
              aria-label="Filter transactions by status"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="min-h-[44px] px-3 py-2 bg-[#0B0F10] border border-[#1F2C33] rounded-xl text-[#F2F5F4]"
            >
              <option value="all">All Statuses</option>
              <option value="completed">Completed</option>
              <option value="pending">Pending</option>
              <option value="rejected">Rejected</option>
              <option value="failed">Failed</option>
            </select>

            <div className="flex gap-1.5">
              <input
                id="tx-date-from"
                type="date"
                aria-label="Filter transactions from date"
                value={fromDate}
                onChange={(e) => {
                  setFromDate(e.target.value);
                  setPage(1);
                }}
                className="min-h-[44px] w-1/2 px-2 py-2 bg-[#0B0F10] border border-[#1F2C33] rounded-xl text-[#F2F5F4] text-[11px]"
                title="Date from"
              />
              <input
                id="tx-date-to"
                type="date"
                aria-label="Filter transactions to date"
                value={toDate}
                onChange={(e) => {
                  setToDate(e.target.value);
                  setPage(1);
                }}
                className="min-h-[44px] w-1/2 px-2 py-2 bg-[#0B0F10] border border-[#1F2C33] rounded-xl text-[#F2F5F4] text-[11px]"
                title="Date to"
              />
            </div>
          </div>

          <div className="bg-[#121A1F] rounded-2xl border border-[#1F2C33] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-[#0B0F10] border-b border-[#1F2C33] text-[11px] font-semibold text-[#8FA1A8] uppercase tracking-wider">
                    <th className="py-3 px-4">Timestamp</th>
                    <th className="py-3 px-4">Reference</th>
                    <th className="py-3 px-4">Investor</th>
                    <th className="py-3 px-4">Kind</th>
                    <th className="py-3 px-4 text-right">Amount</th>
                    <th className="py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1F2C33]">
                  {paginated.map((tx) => {
                    const inv = userById.get(tx.userId);
                    return (
                      <tr key={tx.id} className="hover:bg-[#162026]">
                        <td className="py-3 px-4 text-[#B6C4C9] whitespace-nowrap">{formatDate(tx.createdAt)}</td>
                        <td className="py-3 px-4 font-mono text-[#F2F5F4]">{tx.reference}</td>
                        <td className="py-3 px-4 text-[#B6C4C9]">{inv?.email || tx.userEmail || tx.userId}</td>
                        <td className="py-3 px-4 uppercase text-[11px] font-semibold text-[#F2F5F4]">{tx.type}</td>
                        <td className="py-3 px-4 text-right font-bold text-[#6FD8B0] tabular-nums">{formatCentsEur(eurToCents(tx.amount))}</td>
                        <td className="py-3 px-4">
                          <span className={`font-semibold uppercase text-[11px] ${
                            ['completed', 'approved', 'paid'].includes(tx.status) ? 'text-[#6FD8B0]' : tx.status === 'pending' ? 'text-amber-400' : 'text-rose-400'
                          }`}>
                            {tx.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                  {paginated.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-10 text-center text-xs text-[#8FA1A8]">No matching transactions found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {filtered.length > pageSize && (
              <div className="px-4 py-3 bg-[#0B0F10] border-t border-[#1F2C33] flex items-center justify-between text-xs text-[#8FA1A8]">
                <span>
                  Page {safePage} of {totalPages} ({filtered.length} entries)
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={safePage <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="min-h-[44px] px-3.5 py-2 rounded-lg bg-[#121A1F] border border-[#1F2C33] text-[#F2F5F4] disabled:opacity-40 cursor-pointer"
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    disabled={safePage >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    className="min-h-[44px] px-3.5 py-2 rounded-lg bg-[#121A1F] border border-[#1F2C33] text-[#F2F5F4] disabled:opacity-40 cursor-pointer"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// 14. SETTINGS: "limits" & "email_templates" rows (Super Admin) + Payment Gates (Super Admin & Finance)
// ============================================================================
export const AdminSettingsSection: React.FC<{
  allowedTabs: AdminSettingsTabId[];
  paymentGates: PaymentGateRecord[];
  onRefresh: () => void;
  onSuccess: (msg: string) => void;
  onError: (msg: string) => void;
}> = ({ allowedTabs, paymentGates, onRefresh, onSuccess, onError }) => {
  const [activeTab, setActiveTab] = useState<AdminSettingsTabId>(() => allowedTabs[0] || 'payment-gates');

  useEffect(() => {
    if (allowedTabs.length > 0 && !allowedTabs.includes(activeTab)) {
      setActiveTab(allowedTabs[0]);
    }
  }, [allowedTabs, activeTab]);

  // "limits" & "email_templates" state
  const [loadingSettings, setLoadingSettings] = useState(false);
  const [savingLimits, setSavingLimits] = useState(false);
  const [savingTemplates, setSavingTemplates] = useState(false);
  const [savingUsdtRate, setSavingUsdtRate] = useState(false);
  const [usdtEurPerUsdt, setUsdtEurPerUsdt] = useState('');
  const [savedUsdtEurPerUsdt, setSavedUsdtEurPerUsdt] = useState<string | null>(null);
  const [limits, setLimits] = useState<Record<string, any>>({
    min_deposit_eur: 100,
    max_deposit_eur: 500000,
    min_withdrawal_eur: 250,
    max_withdrawal_eur: 250000,
    min_investment_eur: 500,
    withdrawal_fee_eur: 0,
    require_kyc_for_withdrawal: true,
  });
  const [templatesJson, setTemplatesJson] = useState<string>('{}');

  useEffect(() => {
    if (!allowedTabs.includes('general')) return;
    let active = true;
    setLoadingSettings(true);
    fetchSettingsRows()
      .then((res) => {
        if (!active) return;
        if (res.limits) setLimits(res.limits);
        const savedRate = res.usdt?.eur_per_usdt == null ? '' : String(res.usdt.eur_per_usdt);
        setUsdtEurPerUsdt(savedRate);
        setSavedUsdtEurPerUsdt(savedRate || null);
        setTemplatesJson(JSON.stringify(res.email_templates || {}, null, 2));
      })
      .catch((err: any) => {
        if (active) {
          onError(err?.message || 'Unable to load platform settings.');
        }
      })
      .finally(() => {
        if (active) setLoadingSettings(false);
      });
    return () => {
      active = false;
    };
  }, [allowedTabs, onError]);

  // Payment Gate Add/Edit modal state
  const [gateModalOpen, setGateModalOpen] = useState(false);
  const [editingGateId, setEditingGateId] = useState<string | undefined>(undefined);
  const [editingGateSource, setEditingGateSource] = useState<'payment_gates' | 'manual_payment_methods'>('manual_payment_methods');
  const [gateName, setGateName] = useState('');
  const [gateMethod, setGateMethod] = useState('sepa_wire');
  const [gateDetails, setGateDetails] = useState<GateDetailRow[]>([
    { label: 'Beneficiary', value: '' },
    { label: 'IBAN / Address', value: '' },
  ]);
  const [gateInstructions, setGateInstructions] = useState('');
  const [gateActive, setGateActive] = useState(true);
  const [savingGate, setSavingGate] = useState(false);
  const [busyGateId, setBusyGateId] = useState<string | null>(null);
  const gateModalRef = useDialogFocus<HTMLFormElement>(gateModalOpen, () => setGateModalOpen(false), savingGate);

  const openAddGate = () => {
    setEditingGateId(undefined);
    setEditingGateSource(paymentGates[0]?.source || 'manual_payment_methods');
    setGateName('');
    setGateMethod('sepa_wire');
    setGateDetails([
      { label: 'Beneficiary', value: "L'Agence Treasury SPV" },
      { label: 'IBAN / Wallet', value: '' },
    ]);
    setGateInstructions('');
    setGateActive(true);
    setGateModalOpen(true);
  };

  const openEditGate = (g: PaymentGateRecord) => {
    setEditingGateId(g.id);
    setEditingGateSource(g.source);
    setGateName(g.name);
    setGateMethod(g.method);
    setGateDetails(g.details.length > 0 ? g.details : [{ label: 'Detail', value: '' }]);
    setGateInstructions(g.instructions);
    setGateActive(g.active);
    setGateModalOpen(true);
  };

  const handleSaveGate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gateName.trim()) {
      onError('Payment gate name is required.');
      return;
    }
    setSavingGate(true);
    try {
      await savePaymentGateRecord(
        {
          id: editingGateId,
          name: gateName,
          method: gateMethod,
          details: gateDetails,
          instructions: gateInstructions,
          active: gateActive,
        },
        editingGateSource
      );
      setGateModalOpen(false);
      onSuccess(editingGateId ? 'Payment gate updated.' : 'Payment gate created.');
      onRefresh();
    } catch (err: any) {
      onError(err?.message || 'Unable to save payment gate.');
    } finally {
      setSavingGate(false);
    }
  };

  const handleToggleGateActive = async (g: PaymentGateRecord) => {
    if (busyGateId) return;
    setBusyGateId(g.id);
    try {
      await savePaymentGateRecord(
        {
          id: g.id,
          name: g.name,
          method: g.method,
          details: g.details,
          instructions: g.instructions,
          active: !g.active,
        },
        g.source
      );
      onSuccess(`${g.name} ${g.active ? 'deactivated' : 'activated'}.`);
      onRefresh();
    } catch (err: any) {
      onError(err?.message || 'Unable to update gate status.');
    } finally {
      setBusyGateId(null);
    }
  };

  const handleDeleteGate = async (g: PaymentGateRecord) => {
    if (g.assignedCount > 0) {
      onError('A gate assigned to investors cannot be deleted. Deactivate it instead.');
      return;
    }
    if (busyGateId) return;
    setBusyGateId(g.id);
    try {
      await deletePaymentGateRecord(g);
      onSuccess(`Deleted gate "${g.name}".`);
      onRefresh();
    } catch (err: any) {
      onError(err?.message || 'Unable to delete payment gate.');
    } finally {
      setBusyGateId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 id="admin-main-heading" data-admin-queue-focus tabIndex={-1} className="text-lg font-bold text-[#F2F5F4] tracking-tight focus:outline-none">Settings</h2>
          <p className="text-xs text-[#8FA1A8] mt-1">
            Configure platform limits, email templates, payment gates, and admin credentials.
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {allowedTabs.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setActiveTab(t)}
              className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-colors ${
                activeTab === t
                  ? 'bg-[#6FD8B0] text-[#0B0F10]'
                  : 'bg-[#121A1F] border border-[#1F2C33] text-[#B6C4C9]'
              }`}
            >
              {t === 'general' ? 'Limits & Templates' : t === 'payment-gates' ? 'Payment Gates' : 'Security'}
            </button>
          ))}
        </div>
      </div>

      {/* GENERAL TAB (SUPER ADMIN ONLY): limits & email_templates */}
      {activeTab === 'general' && allowedTabs.includes('general') && (
        <div className="space-y-6">
          <div className="bg-[#121A1F] border border-[#1F2C33] rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#1F2C33] pb-3">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-[#6FD8B0]" />
                <h3 className="text-sm font-bold text-[#F2F5F4]">
                  Platform Limits (<span className="font-mono text-[#6FD8B0]">settings.limits</span>)
                </h3>
              </div>
              <button
                type="button"
                disabled={savingLimits || loadingSettings}
                onClick={async () => {
                  setSavingLimits(true);
                  try {
                    await saveSettingsRow('limits', limits);
                    onSuccess('Saved "limits" row in settings.');
                  } catch (err: any) {
                    onError(err?.message || 'Unable to save limits.');
                  } finally {
                    setSavingLimits(false);
                  }
                }}
                className="min-h-[44px] px-4 py-2 rounded-xl bg-[#6FD8B0] hover:bg-[#5ec8a0] text-[#0B0F10] text-xs font-bold cursor-pointer disabled:opacity-50"
              >
                {savingLimits ? 'Saving...' : 'Save Limits'}
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
              {[
                { key: 'min_deposit_eur', label: 'Min Deposit (EUR)' },
                { key: 'max_deposit_eur', label: 'Max Deposit (EUR)' },
                { key: 'min_withdrawal_eur', label: 'Min Withdrawal (EUR)' },
                { key: 'max_withdrawal_eur', label: 'Max Withdrawal (EUR)' },
                { key: 'min_investment_eur', label: 'Min Investment (EUR)' },
                { key: 'withdrawal_fee_pct', label: 'Withdrawal Fee (%)' },
                { key: 'withdrawal_fee_eur', label: 'Fallback Flat Fee (EUR)' },
              ].map((field) => (
                <div key={field.key}>
                  <label htmlFor={`setting-limit-${field.key}`} className="block text-[#B6C4C9] font-semibold mb-1">{field.label}</label>
                  <input
                    id={`setting-limit-${field.key}`}
                    type="number"
                    min={0}
                    step={field.key === 'withdrawal_fee_eur' || field.key === 'withdrawal_fee_pct' ? '0.01' : '1'}
                    value={Number(limits[field.key] ?? 0)}
                    onChange={(e) => setLimits((prev) => ({ ...prev, [field.key]: Number(e.target.value) }))}
                    className="min-h-[44px] w-full px-3 py-2 bg-[#0B0F10] border border-[#1F2C33] rounded-xl font-mono text-[#F2F5F4]"
                  />
                </div>
              ))}
              <div className="flex items-end pb-1">
                <label htmlFor="setting-limit-require-kyc" className="min-h-[44px] flex items-center gap-2 text-[#F2F5F4] font-semibold cursor-pointer">
                  <input
                    id="setting-limit-require-kyc"
                    type="checkbox"
                    checked={Boolean(limits.require_kyc_for_withdrawal)}
                    onChange={(e) => setLimits((p) => ({ ...p, require_kyc_for_withdrawal: e.target.checked }))}
                    className="w-4 h-4 rounded accent-[#6FD8B0]"
                  />
                  <span>Require verified KYC for withdrawals</span>
                </label>
              </div>
            </div>
          </div>

          <div className="bg-[#121A1F] border border-[#1F2C33] rounded-2xl p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#1F2C33] pb-3">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-[#6FD8B0]" />
                <div>
                  <h3 className="text-sm font-bold text-[#F2F5F4]">USDT</h3>
                  <p className="text-[11px] text-[#8FA1A8]">settings.usdt.eur_per_usdt</p>
                </div>
              </div>
              <button
                type="button"
                disabled={savingUsdtRate || loadingSettings}
                onClick={async () => {
                  if (savingUsdtRate) return;
                  const trimmed = usdtEurPerUsdt.trim();
                  let nextRate: string | null = null;
                  if (trimmed) {
                    if (!/^\d+(?:\.\d+)?$/.test(trimmed) || BigInt(trimmed.replace('.', '')) <= 0n) {
                      onError('Enter a positive decimal EUR per USDT rate, or leave it empty.');
                      return;
                    }
                    nextRate = trimmed;
                  }
                  const oldLabel = savedUsdtEurPerUsdt ?? 'empty';
                  const newLabel = nextRate ?? 'empty';
                  if (!window.confirm(`Confirm USDT rate change?\n\nOld: ${oldLabel} EUR per USDT\nNew: ${newLabel} EUR per USDT\n\nThis rate is used by an administrator when approving USDT deposits.`)) return;
                  setSavingUsdtRate(true);
                  try {
                    await saveSettingsRow('usdt', { eur_per_usdt: nextRate });
                    setSavedUsdtEurPerUsdt(nextRate);
                    setUsdtEurPerUsdt(nextRate ?? '');
                    onSuccess('Saved the USDT EUR conversion rate.');
                  } catch (err: any) {
                    onError(err?.message || 'Unable to save the USDT rate.');
                  } finally {
                    setSavingUsdtRate(false);
                  }
                }}
                className="px-4 py-2 rounded-xl bg-[#6FD8B0] hover:bg-[#5ec8a0] text-[#0B0F10] text-xs font-bold cursor-pointer disabled:opacity-50"
              >
                {savingUsdtRate ? 'Saving...' : 'Save USDT Rate'}
              </button>
            </div>
            <div className="max-w-md space-y-2">
              <label htmlFor="usdt-eur-per-usdt" className="block text-xs text-[#B6C4C9] font-semibold">
                EUR per 1 USDT
              </label>
              <input
                id="usdt-eur-per-usdt"
                type="text"
                inputMode="decimal"
                autoComplete="off"
                value={usdtEurPerUsdt}
                onChange={(e) => setUsdtEurPerUsdt(e.target.value)}
                placeholder="Leave empty until configured"
                disabled={savingUsdtRate || loadingSettings}
                className="w-full px-3 py-2 bg-[#0B0F10] border border-[#1F2C33] rounded-xl font-mono text-sm text-[#F2F5F4] disabled:opacity-50"
              />
              <p className="text-[11px] leading-relaxed text-amber-300">
                Warning: This rate is applied by you when approving a USDT deposit. Update it regularly before approvals. It is not an automatic live rate.
              </p>
              <p className="text-[11px] text-[#8FA1A8]">
                Leave empty to indicate that no approval rate is currently configured. Decimal text is stored exactly; EUR balances remain integer cents.
              </p>
            </div>
          </div>

          <div className="bg-[#121A1F] border border-[#1F2C33] rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#1F2C33] pb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#6FD8B0]" />
                <label htmlFor="setting-email-templates" className="text-sm font-bold text-[#F2F5F4]">
                  Email Templates (<span className="font-mono text-[#6FD8B0]">settings.email_templates</span>)
                </label>
              </div>
              <button
                type="button"
                disabled={savingTemplates || loadingSettings}
                onClick={async () => {
                  setSavingTemplates(true);
                  try {
                    const parsed = JSON.parse(templatesJson);
                    await saveSettingsRow('email_templates', parsed);
                    onSuccess('Saved "email_templates" row in settings.');
                  } catch (err: any) {
                    onError(err?.message || 'Invalid JSON or unable to save email templates.');
                  } finally {
                    setSavingTemplates(false);
                  }
                }}
                className="min-h-[44px] px-4 py-2 rounded-xl bg-[#6FD8B0] hover:bg-[#5ec8a0] text-[#0B0F10] text-xs font-bold cursor-pointer disabled:opacity-50"
              >
                {savingTemplates ? 'Saving...' : 'Save Templates'}
              </button>
            </div>
            <textarea
              id="setting-email-templates"
              rows={11}
              value={templatesJson}
              onChange={(e) => setTemplatesJson(e.target.value)}
              className="w-full p-3.5 bg-[#0B0F10] border border-[#1F2C33] rounded-xl font-mono text-xs text-[#F2F5F4]"
            />
          </div>
        </div>
      )}

      {/* PAYMENT GATES TAB (SUPER ADMIN & FINANCE) */}
      {activeTab === 'payment-gates' && allowedTabs.includes('payment-gates') && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-[#8FA1A8]">
              Gates assigned to one or more investors cannot be deleted—deactivate them instead.
            </p>
            <button
              type="button"
              onClick={openAddGate}
              className="min-h-[44px] px-4 py-2 rounded-xl bg-[#6FD8B0] hover:bg-[#5ec8a0] text-[#0B0F10] text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Payment Gate</span>
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {paymentGates.map((g) => (
              <div key={g.id} className="bg-[#121A1F] border border-[#1F2C33] rounded-2xl p-5 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <Wallet className="w-4 h-4 text-[#6FD8B0]" />
                      <h3 className="text-sm font-bold text-[#F2F5F4]">{g.name}</h3>
                    </div>
                    <div className="text-[11px] text-[#8FA1A8] mt-0.5">
                      Method: <span className="font-mono text-[#B6C4C9]">{g.method}</span> · Assigned to{' '}
                      <strong className="text-[#F2F5F4]">{g.assignedCount}</strong> investor(s)
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                    g.active ? 'bg-[#6FD8B0]/15 text-[#6FD8B0]' : 'bg-[#0B0F10] text-[#8FA1A8] border border-[#1F2C33]'
                  }`}>
                    {g.active ? 'Active' : 'Inactive'}
                  </span>
                </div>

                {g.details.length > 0 && (
                  <div className="bg-[#0B0F10] border border-[#1F2C33] rounded-xl p-3 space-y-1.5 text-xs">
                    {g.details.map((row, idx) => (
                      <div key={`${row.label}-${idx}`} className="flex items-center justify-between gap-2">
                        <span className="text-[#8FA1A8]">{row.label}</span>
                        <span className="font-mono text-[#F2F5F4] text-right break-all">{row.value}</span>
                      </div>
                    ))}
                  </div>
                )}

                {g.instructions && (
                  <p className="text-xs text-[#B6C4C9]">{g.instructions}</p>
                )}

                <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-[#1F2C33]">
                  <button
                    type="button"
                    onClick={() => openEditGate(g)}
                    className="min-h-[44px] px-3.5 py-2 rounded-lg bg-[#0B0F10] border border-[#1F2C33] hover:border-[#6FD8B0] text-xs font-semibold text-[#F2F5F4] inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Edit</span>
                  </button>
                  <button
                    type="button"
                    disabled={busyGateId === g.id}
                    onClick={() => handleToggleGateActive(g)}
                    className="min-h-[44px] px-3.5 py-2 rounded-lg bg-[#0B0F10] border border-[#1F2C33] hover:border-[#6FD8B0] text-xs font-semibold text-[#6FD8B0] cursor-pointer disabled:opacity-50"
                  >
                    {g.active ? 'Deactivate' : 'Activate'}
                  </button>
                  <button
                    type="button"
                    disabled={g.assignedCount > 0 || busyGateId === g.id}
                    title={g.assignedCount > 0 ? 'Assigned gates cannot be deleted; deactivate instead' : 'Delete gate'}
                    onClick={() => handleDeleteGate(g)}
                    className="min-h-[44px] px-3.5 py-2 rounded-lg bg-[#0B0F10] border border-rose-500/30 text-rose-300 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-35 disabled:cursor-not-allowed"
                  >
                    {g.assignedCount > 0 ? <Lock className="w-3.5 h-3.5" /> : <Trash2 className="w-3.5 h-3.5" />}
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            ))}
            {paymentGates.length === 0 && (
              <div className="lg:col-span-2 bg-[#121A1F] border border-[#1F2C33] rounded-2xl p-10 text-center text-xs text-[#8FA1A8]">
                No payment gates configured yet.
              </div>
            )}
          </div>
        </div>
      )}

      {/* SECURITY TAB (SUPER ADMIN ONLY) */}
      {activeTab === 'security' && allowedTabs.includes('security') && <AdminAccountSettings />}

      {/* Add / Edit Payment Gate Modal */}
      {gateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <form ref={gateModalRef} tabIndex={-1} role="dialog" aria-modal="true" aria-label={editingGateId ? 'Edit Payment Gate' : 'Add Payment Gate'} onSubmit={handleSaveGate} className="bg-[#121A1F] border border-[#1F2C33] rounded-2xl max-w-lg w-full p-6 space-y-4 my-8 focus:outline-none">
            <div className="flex items-center justify-between border-b border-[#1F2C33] pb-3">
              <h3 className="text-sm font-bold text-[#F2F5F4]">
                {editingGateId ? 'Edit Payment Gate' : 'Add Payment Gate'}
              </h3>
              <button type="button" onClick={() => setGateModalOpen(false)} aria-label="Close payment gate dialog" className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-[#8FA1A8] hover:text-[#F2F5F4] cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="gate-name-input" className="block text-[#B6C4C9] font-semibold mb-1">Gate Name</label>
                  <input
                    id="gate-name-input"
                    type="text"
                    required
                    value={gateName}
                    onChange={(e) => setGateName(e.target.value)}
                    placeholder="EU SEPA Institutional Wire"
                    className="min-h-[44px] w-full px-3 py-2 bg-[#0B0F10] border border-[#1F2C33] rounded-xl text-[#F2F5F4]"
                  />
                </div>
                <div>
                  <label htmlFor="gate-method-input" className="block text-[#B6C4C9] font-semibold mb-1">Method</label>
                  <input
                    id="gate-method-input"
                    type="text"
                    required
                    value={gateMethod}
                    onChange={(e) => setGateMethod(e.target.value)}
                    placeholder="bank_wire / crypto"
                    className="min-h-[44px] w-full px-3 py-2 bg-[#0B0F10] border border-[#1F2C33] rounded-xl font-mono text-[#F2F5F4]"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[#B6C4C9] font-semibold">Detail Rows (Label + Value)</span>
                  <button
                    type="button"
                    onClick={() => setGateDetails((p) => [...p, { label: '', value: '' }])}
                    className="min-h-[44px] px-2 text-[#6FD8B0] font-semibold inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Row</span>
                  </button>
                </div>
                {gateDetails.map((row, idx) => (
                  <div key={idx} className="flex gap-2">
                    <input
                      type="text"
                      aria-label={`Detail row ${idx + 1} label`}
                      value={row.label}
                      onChange={(e) =>
                        setGateDetails((p) => p.map((r, i) => (i === idx ? { ...r, label: e.target.value } : r)))
                      }
                      placeholder="Label (e.g. IBAN)"
                      className="min-h-[44px] w-2/5 px-3 py-2 bg-[#0B0F10] border border-[#1F2C33] rounded-xl text-[#F2F5F4]"
                    />
                    <input
                      type="text"
                      aria-label={`Detail row ${idx + 1} value`}
                      value={row.value}
                      onChange={(e) =>
                        setGateDetails((p) => p.map((r, i) => (i === idx ? { ...r, value: e.target.value } : r)))
                      }
                      placeholder="Value"
                      className="min-h-[44px] flex-1 px-3 py-2 bg-[#0B0F10] border border-[#1F2C33] rounded-xl font-mono text-[#F2F5F4]"
                    />
                    <button
                      type="button"
                      aria-label={`Remove detail row ${idx + 1}`}
                      onClick={() => setGateDetails((p) => p.filter((_, i) => i !== idx))}
                      className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-[#0B0F10] border border-[#1F2C33] text-[#8FA1A8] hover:text-rose-400 cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>

              <div>
                <label htmlFor="gate-instructions-input" className="block text-[#B6C4C9] font-semibold mb-1">Instructions</label>
                <textarea
                  id="gate-instructions-input"
                  rows={3}
                  value={gateInstructions}
                  onChange={(e) => setGateInstructions(e.target.value)}
                  placeholder="Include your unique payment reference in the wire memo..."
                  className="w-full p-3 bg-[#0B0F10] border border-[#1F2C33] rounded-xl text-[#F2F5F4]"
                />
              </div>

              <label htmlFor="gate-active-checkbox" className="min-h-[44px] flex items-center gap-2 text-[#F2F5F4] font-semibold cursor-pointer">
                <input
                  id="gate-active-checkbox"
                  type="checkbox"
                  checked={gateActive}
                  onChange={(e) => setGateActive(e.target.checked)}
                  className="w-4 h-4 rounded accent-[#6FD8B0]"
                />
                <span>Gate Active (visible to assigned investors)</span>
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-[#1F2C33]">
              <button
                type="button"
                onClick={() => setGateModalOpen(false)}
                className="min-h-[44px] px-4 py-2 rounded-xl bg-[#0B0F10] border border-[#1F2C33] text-xs font-semibold text-[#B6C4C9] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={savingGate}
                className="min-h-[44px] px-4 py-2 rounded-xl bg-[#6FD8B0] text-[#0B0F10] text-xs font-bold cursor-pointer disabled:opacity-50"
              >
                {savingGate ? 'Saving...' : 'Save Payment Gate'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
