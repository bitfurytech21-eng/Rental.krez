import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Building2,
  CheckCircle2,
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
import { formatCurrency, formatDate } from '../../lib/utils';
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
  createPrivateBucketSignedUrl,
  deletePaymentGateRecord,
  eurToCents,
  fetchSettingsRows,
  formatCentsEur,
  maskIban,
  rejectDepositSubmission,
  rejectWithdrawalRequest,
  savePaymentGateRecord,
  saveSettingsRow,
} from './adminSupabaseGateway';
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
  effectiveRole: StaffRole;
  onNavigateSection: (section: AdminSectionId) => void;
}> = ({ stats, users, transactions, effectiveRole, onNavigateSection }) => {
  const userById = useMemo(() => new Map(users.map((u) => [u.id, u])), [users]);

  const cards: Array<{
    title: string;
    value: string;
    subtext: string;
    target: AdminSectionId;
    icon: React.ComponentType<{ className?: string }>;
    accent?: boolean;
  }> = [
    {
      title: 'Pending Deposits',
      value: String(stats.pendingDepositsCount),
      subtext: `${formatCurrency(stats.pendingDepositsTotalEur)} awaiting settlement`,
      target: 'deposits',
      icon: ArrowDownLeft,
    },
    {
      title: 'Pending Withdrawals',
      value: String(stats.pendingWithdrawalsCount),
      subtext: `${formatCurrency(stats.pendingWithdrawalsTotalEur)} awaiting payout`,
      target: 'withdrawals',
      icon: ArrowUpRight,
    },
    {
      title: 'KYC Queue',
      value: String(stats.kycQueueCount),
      subtext: 'Pending compliance verifications',
      target: 'kyc',
      icon: UserCheck,
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
      value: formatCurrency(stats.totalAumAtCostEur),
      subtext: 'Verified capital allocated across SPVs',
      target: 'investments',
      icon: Building2,
      accent: true,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-[#F2F5F4] tracking-tight">Executive Operations Overview</h1>
        <p className="text-xs text-[#8FA1A8] mt-1">
          Live metrics retrieved from <span className="font-mono text-[#6FD8B0]">admin_stats()</span>. Click any card to open its operational queue.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {cards.map((card) => {
          const Icon = card.icon;
          const clickable = canAccessSection(effectiveRole, card.target);
          return (
            <button
              key={card.title}
              type="button"
              disabled={!clickable}
              onClick={() => clickable && onNavigateSection(card.target)}
              className={`text-left bg-[#121A1F] p-5 rounded-2xl border border-[#1F2C33] transition-colors ${
                clickable ? 'hover:border-[#6FD8B0] cursor-pointer' : 'opacity-80 cursor-default'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[#8FA1A8]">
                  {card.title}
                </span>
                <Icon className="w-4 h-4 text-[#6FD8B0] shrink-0" />
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
                  <div className="font-semibold text-[#F2F5F4]">Deposit Verification</div>
                  <div className="text-[11px] text-[#8FA1A8]">
                    {stats.pendingDepositsCount} pending · {formatCurrency(stats.pendingDepositsTotalEur)}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onNavigateSection('deposits')}
                  className="px-3 py-1.5 rounded-lg bg-[#6FD8B0] text-[#0B0F10] font-bold text-[11px] cursor-pointer"
                >
                  Review
                </button>
              </div>
            )}
            {canAccessSection(effectiveRole, 'withdrawals') && (
              <div className="p-3.5 rounded-xl bg-[#0B0F10] border border-[#1F2C33] flex items-center justify-between">
                <div>
                  <div className="font-semibold text-[#F2F5F4]">Withdrawal Releases</div>
                  <div className="text-[11px] text-[#8FA1A8]">
                    {stats.pendingWithdrawalsCount} pending · {formatCurrency(stats.pendingWithdrawalsTotalEur)}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onNavigateSection('withdrawals')}
                  className="px-3 py-1.5 rounded-lg bg-[#6FD8B0] text-[#0B0F10] font-bold text-[11px] cursor-pointer"
                >
                  Review
                </button>
              </div>
            )}
            {canAccessSection(effectiveRole, 'kyc') && (
              <div className="p-3.5 rounded-xl bg-[#0B0F10] border border-[#1F2C33] flex items-center justify-between">
                <div>
                  <div className="font-semibold text-[#F2F5F4]">Compliance KYC Queue</div>
                  <div className="text-[11px] text-[#8FA1A8]">{stats.kycQueueCount} submission(s) awaiting decision</div>
                </div>
                <button
                  type="button"
                  onClick={() => onNavigateSection('kyc')}
                  className="px-3 py-1.5 rounded-lg bg-[#6FD8B0] text-[#0B0F10] font-bold text-[11px] cursor-pointer"
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
                className="text-[11px] font-semibold text-[#6FD8B0] hover:underline cursor-pointer"
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
                    <div className="font-bold text-[#6FD8B0] tabular-nums">{formatCurrency(tx.amount)}</div>
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
// 4. DEPOSITS: Assigned Gate, Proof, Pending/Completed/Failed filter, editable received amount dialog
// ============================================================================
export const AdminDepositsSection: React.FC<{
  users: PlatformUser[];
  transactions: any[];
  manualDeposits: any[];
  paymentGates: PaymentGateRecord[];
  onRefresh: () => Promise<void> | void;
  onSuccess: (msg: string) => void;
  onError: (msg: string) => void;
}> = ({ users, transactions, manualDeposits, paymentGates, onRefresh, onSuccess, onError }) => {
  const [filter, setFilter] = useState<'pending' | 'completed' | 'failed' | 'all'>('pending');
  const [busyId, setBusyId] = useState<string | null>(null);
  const actionLockRef = useRef<boolean>(false);

  // Approve modal ("Amount actually received")
  const [approveTarget, setApproveTarget] = useState<any | null>(null);
  const [receivedAmount, setReceivedAmount] = useState<string>('');

  // Reject modal (reason required)
  const [rejectTarget, setRejectTarget] = useState<any | null>(null);
  const [rejectReason, setRejectReason] = useState<string>('');

  // Proof modal
  const [proofViewer, setProofViewer] = useState<{ title: string; url: string | null } | null>(null);

  const userById = useMemo(() => new Map(users.map((u) => [u.id, u])), [users]);
  const gateById = useMemo(() => new Map(paymentGates.map((g) => [g.id, g.name])), [paymentGates]);

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
          status: st === 'approved' || st === 'completed' ? 'completed' : st === 'rejected' || st === 'failed' ? 'failed' : 'pending',
          isManual: false,
        };
      });

    return [...manualRows, ...txRows].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [manualDeposits, transactions, userById, gateById]);

  const filtered = useMemo(
    () => combinedDeposits.filter((d) => (filter === 'all' ? true : d.status === filter)),
    [combinedDeposits, filter]
  );

  const handleOpenProof = async (row: any) => {
    const url = await createPrivateBucketSignedUrl(
      row.proofPath,
      ['manual-payment-proofs', 'documents', 'deposits'],
      row.proofPath
    );
    setProofViewer({ title: `Proof of Payment — ${row.reference}`, url });
  };

  const handleConfirmApprove = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!approveTarget || actionLockRef.current || busyId) return;
    const amtCents = eurToCents(receivedAmount);
    if (!Number.isFinite(amtCents) || amtCents <= 0) {
      onError('Please enter a valid positive amount received.');
      return;
    }
    const cleanEur = centsToEur(amtCents);
    actionLockRef.current = true;
    setBusyId(approveTarget.id);
    try {
      await approveDepositSubmission(approveTarget.id, cleanEur, approveTarget.isManual);
      setApproveTarget(null);
      await onRefresh();
      onSuccess(`Deposit approved (${formatCentsEur(amtCents)} credited).`);
    } catch (err: any) {
      onError(err?.message || 'Unable to approve deposit.');
    } finally {
      setBusyId(null);
      actionLockRef.current = false;
    }
  };

  const handleConfirmReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectTarget || actionLockRef.current || busyId) return;
    if (!rejectReason.trim()) {
      onError('A rejection reason is required.');
      return;
    }
    actionLockRef.current = true;
    setBusyId(rejectTarget.id);
    try {
      await rejectDepositSubmission(rejectTarget.id, rejectReason.trim(), rejectTarget.isManual);
      setRejectTarget(null);
      setRejectReason('');
      await onRefresh();
      onSuccess('Deposit rejected.');
    } catch (err: any) {
      onError(err?.message || 'Unable to reject deposit.');
    } finally {
      setBusyId(null);
      actionLockRef.current = false;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-[#F2F5F4] tracking-tight">Deposits</h2>
          <p className="text-xs text-[#8FA1A8] mt-1">
            Review investor deposits by assigned payment gate, verify payment proof, and credit settled amounts via <span className="font-mono text-[#6FD8B0]">approve_deposit</span> / <span className="font-mono text-[#6FD8B0]">reject_deposit</span>.
          </p>
        </div>

        <div className="flex gap-1.5">
          {(['pending', 'completed', 'failed', 'all'] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize cursor-pointer ${
                filter === s ? 'bg-[#6FD8B0] text-[#0B0F10]' : 'bg-[#121A1F] border border-[#1F2C33] text-[#B6C4C9]'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-[#121A1F] rounded-2xl border border-[#1F2C33] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-[#0B0F10] border-b border-[#1F2C33] text-[11px] font-semibold text-[#8FA1A8] uppercase tracking-wider">
                <th className="py-3 px-4">Investor</th>
                <th className="py-3 px-4">Assigned Gate</th>
                <th className="py-3 px-4 text-right">Amount</th>
                <th className="py-3 px-4">Payment Reference</th>
                <th className="py-3 px-4">Proof of Payment</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Action</th>
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
                  <td className="py-3.5 px-4 text-right font-bold text-[#6FD8B0] tabular-nums">{formatCurrency(row.amount)}</td>
                  <td className="py-3.5 px-4 font-mono text-[#F2F5F4]">{row.reference}</td>
                  <td className="py-3.5 px-4">
                    {row.proofPath ? (
                      <button
                        type="button"
                        onClick={() => handleOpenProof(row)}
                        className="px-2.5 py-1 rounded-lg bg-[#0B0F10] border border-[#1F2C33] hover:border-[#6FD8B0] text-[#6FD8B0] text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Eye className="w-3 h-3" />
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
                      {row.status}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right whitespace-nowrap">
                    {row.status === 'pending' ? (
                      <div className="inline-flex items-center gap-2">
                        <button
                          type="button"
                          disabled={Boolean(busyId)}
                          onClick={() => {
                            setApproveTarget(row);
                            setReceivedAmount(centsToEur(eurToCents(row.amount)).toFixed(2));
                          }}
                          className="px-3 py-1.5 rounded-lg bg-[#6FD8B0] hover:bg-[#5ec8a0] text-[#0B0F10] text-[11px] font-bold cursor-pointer disabled:opacity-50"
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          disabled={Boolean(busyId)}
                          onClick={() => {
                            setRejectTarget(row);
                            setRejectReason('');
                          }}
                          className="px-3 py-1.5 rounded-lg bg-[#0B0F10] border border-rose-500/40 text-rose-300 hover:bg-rose-500/10 text-[11px] font-semibold cursor-pointer disabled:opacity-50"
                        >
                          Reject
                        </button>
                      </div>
                    ) : (
                      <span className="text-[11px] text-[#8FA1A8]">Reviewed</span>
                    )}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-xs text-[#8FA1A8]">
                    No deposits in &ldquo;{filter}&rdquo; status.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Approve Deposit Modal (Editable Amount actually received) */}
      {approveTarget && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <form onSubmit={handleConfirmApprove} className="bg-[#121A1F] border border-[#1F2C33] rounded-2xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-sm font-bold text-[#F2F5F4]">Confirm Deposit Approval</h3>
            <div className="bg-[#0B0F10] border border-[#1F2C33] rounded-xl p-3 text-xs text-[#B6C4C9] space-y-1.5 tabular-nums">
              <div>Action: <strong className="text-[#6FD8B0]">Approve Deposit (approve_deposit)</strong></div>
              <div>Investor: <strong className="text-[#F2F5F4]">{approveTarget.investorName} ({approveTarget.investorEmail})</strong></div>
              <div>Reference: <strong className="font-mono text-[#F2F5F4]">{approveTarget.reference}</strong></div>
              <div>Amount to Credit: <strong className="text-[#6FD8B0]">{formatCentsEur(eurToCents(receivedAmount))}</strong></div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#B6C4C9] mb-1">Amount actually received (EUR)</label>
              <input
                type="number"
                min={0.01}
                step="0.01"
                required
                disabled={Boolean(busyId)}
                value={receivedAmount}
                onChange={(e) => setReceivedAmount(e.target.value)}
                className="w-full px-3 py-2 bg-[#0B0F10] border border-[#1F2C33] rounded-xl font-mono text-sm text-[#6FD8B0] font-bold"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={Boolean(busyId)}
                onClick={() => setApproveTarget(null)}
                className="px-4 py-2 rounded-xl bg-[#0B0F10] border border-[#1F2C33] text-xs font-semibold text-[#B6C4C9] cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={Boolean(busyId) || eurToCents(receivedAmount) <= 0}
                className="px-4 py-2 rounded-xl bg-[#6FD8B0] text-[#0B0F10] text-xs font-bold cursor-pointer disabled:opacity-50"
              >
                {busyId ? 'Approving...' : 'Confirm & Credit'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Reject Deposit Modal (Reason required) */}
      {rejectTarget && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <form onSubmit={handleConfirmReject} className="bg-[#121A1F] border border-[#1F2C33] rounded-2xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-sm font-bold text-[#F2F5F4]">Confirm Deposit Rejection</h3>
            <div className="bg-[#0B0F10] border border-[#1F2C33] rounded-xl p-3 text-xs text-[#B6C4C9] space-y-1.5 tabular-nums">
              <div>Action: <strong className="text-rose-400">Reject Deposit (reject_deposit)</strong></div>
              <div>Investor: <strong className="text-[#F2F5F4]">{rejectTarget.investorName} ({rejectTarget.investorEmail})</strong></div>
              <div>Reference: <strong className="font-mono text-[#F2F5F4]">{rejectTarget.reference}</strong></div>
              <div>Amount: <strong className="text-[#F2F5F4]">{formatCentsEur(eurToCents(rejectTarget.amount))}</strong></div>
            </div>
            <textarea
              rows={3}
              required
              disabled={Boolean(busyId)}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g. Wire transfer not received or reference mismatch..."
              className="w-full p-3 bg-[#0B0F10] border border-[#1F2C33] rounded-xl text-xs text-[#F2F5F4]"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                disabled={Boolean(busyId)}
                onClick={() => setRejectTarget(null)}
                className="px-4 py-2 rounded-xl bg-[#0B0F10] border border-[#1F2C33] text-xs font-semibold text-[#B6C4C9] cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={Boolean(busyId)}
                className="px-4 py-2 rounded-xl bg-rose-600 text-white text-xs font-bold cursor-pointer disabled:opacity-50"
              >
                {busyId ? 'Rejecting...' : 'Confirm Rejection'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Proof Modal */}
      {proofViewer && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#121A1F] border border-[#1F2C33] rounded-2xl max-w-2xl w-full p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-[#1F2C33] pb-3">
              <h3 className="text-sm font-bold text-[#F2F5F4]">{proofViewer.title}</h3>
              <button type="button" onClick={() => setProofViewer(null)} className="text-[#8FA1A8] cursor-pointer">
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
// 5. WITHDRAWALS: masked destination IBAN with reveal, KYC status, confirmation modals
// ============================================================================
export const AdminWithdrawalsSection: React.FC<{
  users: PlatformUser[];
  transactions: any[];
  onRefresh: () => Promise<void> | void;
  onSuccess: (msg: string) => void;
  onError: (msg: string) => void;
}> = ({ users, transactions, onRefresh, onSuccess, onError }) => {
  const [filter, setFilter] = useState<'pending' | 'completed' | 'rejected' | 'all'>('pending');
  const [revealedIds, setRevealedIds] = useState<Record<string, boolean>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const actionLockRef = useRef<boolean>(false);

  const [approveTarget, setApproveTarget] = useState<any | null>(null);
  const [rejectTarget, setRejectTarget] = useState<any | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const userById = useMemo(() => new Map(users.map((u) => [u.id, u])), [users]);

  const rows = useMemo(() => {
    return transactions
      .filter((t) => t.type === 'withdrawal')
      .filter((t) => (filter === 'all' ? true : filter === 'completed' ? ['completed', 'approved', 'paid'].includes(t.status) : t.status === filter));
  }, [transactions, filter]);

  const handleConfirmApprove = async () => {
    if (!approveTarget || actionLockRef.current || busyId) return;
    actionLockRef.current = true;
    setBusyId(approveTarget.tx.id);
    try {
      await approveWithdrawalRequest(
        approveTarget.tx.id,
        approveTarget.tx.reference || `PAYOUT-${approveTarget.tx.id.slice(0, 8)}`,
        0
      );
      setApproveTarget(null);
      await onRefresh();
      onSuccess('Withdrawal approved and marked as paid.');
    } catch (err: any) {
      onError(err?.message || 'Unable to approve withdrawal.');
    } finally {
      setBusyId(null);
      actionLockRef.current = false;
    }
  };

  const handleConfirmReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectTarget || actionLockRef.current || busyId) return;
    if (!rejectReason.trim()) {
      onError('A rejection reason is required.');
      return;
    }
    actionLockRef.current = true;
    setBusyId(rejectTarget.id);
    try {
      await rejectWithdrawalRequest(rejectTarget.id, rejectReason.trim());
      setRejectTarget(null);
      setRejectReason('');
      await onRefresh();
      onSuccess('Withdrawal rejected and reserved balance restored.');
    } catch (err: any) {
      onError(err?.message || 'Unable to reject withdrawal.');
    } finally {
      setBusyId(null);
      actionLockRef.current = false;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-[#F2F5F4] tracking-tight">Withdrawals</h2>
          <p className="text-xs text-[#8FA1A8] mt-1">
            Verify KYC status &amp; destination IBAN before calling <span className="font-mono text-[#6FD8B0]">approve_withdrawal</span> or <span className="font-mono text-[#6FD8B0]">reject_withdrawal</span>.
          </p>
        </div>
        <div className="flex gap-1.5">
          {(['pending', 'completed', 'rejected', 'all'] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize cursor-pointer ${
                filter === s ? 'bg-[#6FD8B0] text-[#0B0F10]' : 'bg-[#121A1F] border border-[#1F2C33] text-[#B6C4C9]'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-[#121A1F] rounded-2xl border border-[#1F2C33] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-[#0B0F10] border-b border-[#1F2C33] text-[11px] font-semibold text-[#8FA1A8] uppercase tracking-wider">
                <th className="py-3 px-4">Investor</th>
                <th className="py-3 px-4 text-right">Amount</th>
                <th className="py-3 px-4">Destination IBAN</th>
                <th className="py-3 px-4">KYC Status</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1F2C33]">
              {rows.map((tx) => {
                const inv = userById.get(tx.userId);
                const rawIban = tx.destination || inv?.bankIban || tx.reference;
                const revealed = Boolean(revealedIds[tx.id]);
                return (
                  <tr key={tx.id} className="hover:bg-[#162026]">
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-[#F2F5F4]">{inv?.fullName || 'Investor'}</div>
                      <div className="text-[11px] text-[#8FA1A8]">{inv?.email || tx.userEmail || tx.userId}</div>
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-[#F2F5F4] tabular-nums">{formatCurrency(tx.amount)}</td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[#F2F5F4]">
                          {revealed ? rawIban : maskIban(rawIban)}
                        </span>
                        <button
                          type="button"
                          onClick={() => setRevealedIds((p) => ({ ...p, [tx.id]: !p[tx.id] }))}
                          className="p-1 rounded bg-[#0B0F10] border border-[#1F2C33] text-[#8FA1A8] hover:text-[#6FD8B0] cursor-pointer"
                          title={revealed ? 'Hide IBAN' : 'Reveal IBAN'}
                        >
                          {revealed ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
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
                        ['completed', 'approved', 'paid'].includes(tx.status) ? 'text-[#6FD8B0]' : tx.status === 'rejected' ? 'text-rose-400' : 'text-amber-400'
                      }`}>
                        {tx.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      {tx.status === 'pending' ? (
                        <div className="inline-flex items-center gap-2">
                          <button
                            type="button"
                            disabled={Boolean(busyId)}
                            onClick={() => setApproveTarget({ tx, inv })}
                            className="px-3 py-1.5 rounded-lg bg-[#6FD8B0] hover:bg-[#5ec8a0] text-[#0B0F10] text-[11px] font-bold cursor-pointer disabled:opacity-50"
                          >
                            Approve &amp; Mark Paid
                          </button>
                          <button
                            type="button"
                            disabled={Boolean(busyId)}
                            onClick={() => {
                              setRejectTarget(tx);
                              setRejectReason('');
                            }}
                            className="px-3 py-1.5 rounded-lg bg-[#0B0F10] border border-rose-500/40 text-rose-300 hover:bg-rose-500/10 text-[11px] font-semibold cursor-pointer disabled:opacity-50"
                          >
                            Reject
                          </button>
                        </div>
                      ) : (
                        <span className="text-[11px] text-[#8FA1A8]">Settled</span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-xs text-[#8FA1A8]">
                    No withdrawals in &ldquo;{filter}&rdquo; state.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confirmation Dialog: Approve and mark as paid */}
      {approveTarget && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#121A1F] border border-[#1F2C33] rounded-2xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-sm font-bold text-[#F2F5F4]">Confirm Withdrawal Approval</h3>
            <div className="bg-[#0B0F10] border border-[#1F2C33] rounded-xl p-3 text-xs text-[#B6C4C9] space-y-1.5 tabular-nums">
              <div>Action: <strong className="text-[#6FD8B0]">Approve Withdrawal (approve_withdrawal)</strong></div>
              <div>Investor: <strong className="text-[#F2F5F4]">{approveTarget.inv?.fullName || approveTarget.inv?.email || approveTarget.tx.userId}</strong></div>
              <div>Destination IBAN: <strong className="font-mono text-[#F2F5F4]">{approveTarget.tx.destination || approveTarget.inv?.bankIban || approveTarget.tx.reference}</strong></div>
              <div>Amount: <strong className="text-[#6FD8B0]">{formatCentsEur(eurToCents(approveTarget.tx.amount))}</strong></div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={Boolean(busyId)}
                onClick={() => setApproveTarget(null)}
                className="px-4 py-2 rounded-xl bg-[#0B0F10] border border-[#1F2C33] text-xs font-semibold text-[#B6C4C9] cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={Boolean(busyId)}
                onClick={handleConfirmApprove}
                className="px-4 py-2 rounded-xl bg-[#6FD8B0] text-[#0B0F10] text-xs font-bold cursor-pointer disabled:opacity-50"
              >
                {busyId ? 'Confirming...' : 'Approve & Mark as Paid'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Dialog: Reject (reason required) */}
      {rejectTarget && (() => {
        const inv = userById.get(rejectTarget.userId);
        return (
          <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
            <form onSubmit={handleConfirmReject} className="bg-[#121A1F] border border-[#1F2C33] rounded-2xl max-w-md w-full p-6 space-y-4">
              <h3 className="text-sm font-bold text-[#F2F5F4]">Confirm Withdrawal Rejection</h3>
              <div className="bg-[#0B0F10] border border-[#1F2C33] rounded-xl p-3 text-xs text-[#B6C4C9] space-y-1.5 tabular-nums">
                <div>Action: <strong className="text-rose-400">Reject Withdrawal &amp; Refund (reject_withdrawal)</strong></div>
                <div>Investor: <strong className="text-[#F2F5F4]">{inv?.fullName || inv?.email || rejectTarget.userId}</strong></div>
                <div>Refund Amount: <strong className="text-[#6FD8B0]">{formatCentsEur(eurToCents(rejectTarget.amount))}</strong></div>
              </div>
              <textarea
                rows={3}
                required
                disabled={Boolean(busyId)}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="e.g. Beneficiary IBAN does not match verified account holder..."
                className="w-full p-3 bg-[#0B0F10] border border-[#1F2C33] rounded-xl text-xs text-[#F2F5F4]"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  disabled={Boolean(busyId)}
                  onClick={() => setRejectTarget(null)}
                  className="px-4 py-2 rounded-xl bg-[#0B0F10] border border-[#1F2C33] text-xs font-semibold text-[#B6C4C9] cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={Boolean(busyId)}
                  className="px-4 py-2 rounded-xl bg-rose-600 text-white text-xs font-bold cursor-pointer disabled:opacity-50"
                >
                  {busyId ? 'Rejecting...' : 'Confirm Rejection'}
                </button>
              </div>
            </form>
          </div>
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
          <h2 className="text-lg font-bold text-[#F2F5F4] tracking-tight">Transactions &amp; Ledger</h2>
          <p className="text-xs text-[#8FA1A8] mt-1">
            Complete platform ledger with investor, kind, status, and date-range filters.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setSubView('ledger')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold cursor-pointer ${
              subView === 'ledger' ? 'bg-[#6FD8B0] text-[#0B0F10]' : 'bg-[#121A1F] border border-[#1F2C33] text-[#B6C4C9]'
            }`}
          >
            Ledger ({filtered.length})
          </button>
          <button
            type="button"
            onClick={() => setSubView('reconciliation')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold cursor-pointer ${
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
                  t.amount,
                  t.currency || 'EUR',
                  t.status,
                  t.description || '',
                ])
              )
            }
            className="px-3.5 py-2 rounded-xl bg-[#121A1F] border border-[#1F2C33] hover:border-[#6FD8B0] text-xs font-semibold text-[#F2F5F4] flex items-center gap-1.5 cursor-pointer"
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
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Search reference or description..."
                className="w-full pl-9 pr-3 py-2 bg-[#0B0F10] border border-[#1F2C33] rounded-xl text-[#F2F5F4]"
              />
            </div>

            <select
              value={investorFilter}
              onChange={(e) => {
                setInvestorFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 bg-[#0B0F10] border border-[#1F2C33] rounded-xl text-[#F2F5F4]"
            >
              <option value="all">All Investors</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.email}
                </option>
              ))}
            </select>

            <select
              value={kindFilter}
              onChange={(e) => {
                setKindFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 bg-[#0B0F10] border border-[#1F2C33] rounded-xl text-[#F2F5F4]"
            >
              <option value="all">All Kinds</option>
              {availableKinds.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 bg-[#0B0F10] border border-[#1F2C33] rounded-xl text-[#F2F5F4]"
            >
              <option value="all">All Statuses</option>
              <option value="completed">Completed</option>
              <option value="pending">Pending</option>
              <option value="rejected">Rejected</option>
              <option value="failed">Failed</option>
            </select>

            <div className="flex gap-1.5">
              <input
                type="date"
                value={fromDate}
                onChange={(e) => {
                  setFromDate(e.target.value);
                  setPage(1);
                }}
                className="w-1/2 px-2 py-2 bg-[#0B0F10] border border-[#1F2C33] rounded-xl text-[#F2F5F4] text-[11px]"
                title="Date from"
              />
              <input
                type="date"
                value={toDate}
                onChange={(e) => {
                  setToDate(e.target.value);
                  setPage(1);
                }}
                className="w-1/2 px-2 py-2 bg-[#0B0F10] border border-[#1F2C33] rounded-xl text-[#F2F5F4] text-[11px]"
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
                        <td className="py-3 px-4 text-right font-bold text-[#6FD8B0] tabular-nums">{formatCurrency(tx.amount)}</td>
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
                    className="px-3 py-1 rounded-lg bg-[#121A1F] border border-[#1F2C33] text-[#F2F5F4] disabled:opacity-40 cursor-pointer"
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    disabled={safePage >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    className="px-3 py-1 rounded-lg bg-[#121A1F] border border-[#1F2C33] text-[#F2F5F4] disabled:opacity-40 cursor-pointer"
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
      .finally(() => {
        if (active) setLoadingSettings(false);
      });
    return () => {
      active = false;
    };
  }, [allowedTabs]);

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
          <h2 className="text-lg font-bold text-[#F2F5F4] tracking-tight">Settings</h2>
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
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-colors ${
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
                className="px-4 py-2 rounded-xl bg-[#6FD8B0] hover:bg-[#5ec8a0] text-[#0B0F10] text-xs font-bold cursor-pointer disabled:opacity-50"
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
                { key: 'withdrawal_fee_eur', label: 'Withdrawal Fee (EUR)' },
              ].map((field) => (
                <div key={field.key}>
                  <label className="block text-[#B6C4C9] font-semibold mb-1">{field.label}</label>
                  <input
                    type="number"
                    min={0}
                    step={field.key === 'withdrawal_fee_eur' ? '0.01' : '1'}
                    value={Number(limits[field.key] ?? 0)}
                    onChange={(e) => setLimits((prev) => ({ ...prev, [field.key]: Number(e.target.value) }))}
                    className="w-full px-3 py-2 bg-[#0B0F10] border border-[#1F2C33] rounded-xl font-mono text-[#F2F5F4]"
                  />
                </div>
              ))}
              <div className="flex items-end pb-2">
                <label className="flex items-center gap-2 text-[#F2F5F4] font-semibold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean(limits.require_kyc_for_withdrawal)}
                    onChange={(e) => setLimits((p) => ({ ...p, require_kyc_for_withdrawal: e.target.checked }))}
                    className="rounded accent-[#6FD8B0]"
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
                <h3 className="text-sm font-bold text-[#F2F5F4]">
                  Email Templates (<span className="font-mono text-[#6FD8B0]">settings.email_templates</span>)
                </h3>
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
                className="px-4 py-2 rounded-xl bg-[#6FD8B0] hover:bg-[#5ec8a0] text-[#0B0F10] text-xs font-bold cursor-pointer disabled:opacity-50"
              >
                {savingTemplates ? 'Saving...' : 'Save Templates'}
              </button>
            </div>
            <textarea
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
          <div className="flex items-center justify-between">
            <p className="text-xs text-[#8FA1A8]">
              Gates assigned to one or more investors cannot be deleted—deactivate them instead.
            </p>
            <button
              type="button"
              onClick={openAddGate}
              className="px-4 py-2 rounded-xl bg-[#6FD8B0] hover:bg-[#5ec8a0] text-[#0B0F10] text-xs font-bold flex items-center gap-1.5 cursor-pointer"
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
                    className="px-3 py-1.5 rounded-lg bg-[#0B0F10] border border-[#1F2C33] hover:border-[#6FD8B0] text-xs font-semibold text-[#F2F5F4] inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Edit3 className="w-3 h-3" />
                    <span>Edit</span>
                  </button>
                  <button
                    type="button"
                    disabled={busyGateId === g.id}
                    onClick={() => handleToggleGateActive(g)}
                    className="px-3 py-1.5 rounded-lg bg-[#0B0F10] border border-[#1F2C33] hover:border-[#6FD8B0] text-xs font-semibold text-[#6FD8B0] cursor-pointer disabled:opacity-50"
                  >
                    {g.active ? 'Deactivate' : 'Activate'}
                  </button>
                  <button
                    type="button"
                    disabled={g.assignedCount > 0 || busyGateId === g.id}
                    title={g.assignedCount > 0 ? 'Assigned gates cannot be deleted; deactivate instead' : 'Delete gate'}
                    onClick={() => handleDeleteGate(g)}
                    className="px-3 py-1.5 rounded-lg bg-[#0B0F10] border border-rose-500/30 text-rose-300 text-xs font-semibold inline-flex items-center gap-1 cursor-pointer disabled:opacity-35 disabled:cursor-not-allowed"
                  >
                    {g.assignedCount > 0 ? <Lock className="w-3 h-3" /> : <Trash2 className="w-3 h-3" />}
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
          <form onSubmit={handleSaveGate} className="bg-[#121A1F] border border-[#1F2C33] rounded-2xl max-w-lg w-full p-6 space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-[#1F2C33] pb-3">
              <h3 className="text-sm font-bold text-[#F2F5F4]">
                {editingGateId ? 'Edit Payment Gate' : 'Add Payment Gate'}
              </h3>
              <button type="button" onClick={() => setGateModalOpen(false)} className="text-[#8FA1A8] cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#B6C4C9] font-semibold mb-1">Gate Name</label>
                  <input
                    type="text"
                    required
                    value={gateName}
                    onChange={(e) => setGateName(e.target.value)}
                    placeholder="EU SEPA Institutional Wire"
                    className="w-full px-3 py-2 bg-[#0B0F10] border border-[#1F2C33] rounded-xl text-[#F2F5F4]"
                  />
                </div>
                <div>
                  <label className="block text-[#B6C4C9] font-semibold mb-1">Method</label>
                  <input
                    type="text"
                    required
                    value={gateMethod}
                    onChange={(e) => setGateMethod(e.target.value)}
                    placeholder="bank_wire / crypto"
                    className="w-full px-3 py-2 bg-[#0B0F10] border border-[#1F2C33] rounded-xl font-mono text-[#F2F5F4]"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[#B6C4C9] font-semibold">Detail Rows (Label + Value)</label>
                  <button
                    type="button"
                    onClick={() => setGateDetails((p) => [...p, { label: '', value: '' }])}
                    className="text-[#6FD8B0] font-semibold inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add Row</span>
                  </button>
                </div>
                {gateDetails.map((row, idx) => (
                  <div key={idx} className="flex gap-2">
                    <input
                      type="text"
                      value={row.label}
                      onChange={(e) =>
                        setGateDetails((p) => p.map((r, i) => (i === idx ? { ...r, label: e.target.value } : r)))
                      }
                      placeholder="Label (e.g. IBAN)"
                      className="w-2/5 px-3 py-2 bg-[#0B0F10] border border-[#1F2C33] rounded-xl text-[#F2F5F4]"
                    />
                    <input
                      type="text"
                      value={row.value}
                      onChange={(e) =>
                        setGateDetails((p) => p.map((r, i) => (i === idx ? { ...r, value: e.target.value } : r)))
                      }
                      placeholder="Value"
                      className="flex-1 px-3 py-2 bg-[#0B0F10] border border-[#1F2C33] rounded-xl font-mono text-[#F2F5F4]"
                    />
                    <button
                      type="button"
                      onClick={() => setGateDetails((p) => p.filter((_, i) => i !== idx))}
                      className="p-2 rounded-xl bg-[#0B0F10] border border-[#1F2C33] text-[#8FA1A8] hover:text-rose-400 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>

              <div>
                <label className="block text-[#B6C4C9] font-semibold mb-1">Instructions</label>
                <textarea
                  rows={3}
                  value={gateInstructions}
                  onChange={(e) => setGateInstructions(e.target.value)}
                  placeholder="Include your unique payment reference in the wire memo..."
                  className="w-full p-3 bg-[#0B0F10] border border-[#1F2C33] rounded-xl text-[#F2F5F4]"
                />
              </div>

              <label className="flex items-center gap-2 text-[#F2F5F4] font-semibold cursor-pointer">
                <input
                  type="checkbox"
                  checked={gateActive}
                  onChange={(e) => setGateActive(e.target.checked)}
                  className="rounded accent-[#6FD8B0]"
                />
                <span>Gate Active (visible to assigned investors)</span>
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-[#1F2C33]">
              <button
                type="button"
                onClick={() => setGateModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-[#0B0F10] border border-[#1F2C33] text-xs font-semibold text-[#B6C4C9] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={savingGate}
                className="px-4 py-2 rounded-xl bg-[#6FD8B0] text-[#0B0F10] text-xs font-bold cursor-pointer disabled:opacity-50"
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
