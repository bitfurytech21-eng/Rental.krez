import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import QRCode from 'qrcode';
import {
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  Briefcase,
  Building2,
  Check,
  CheckCircle2,
  Coins,
  Copy,
  Download,
  Edit3,
  Eye,
  EyeOff,
  Landmark,
  Link2,
  Lock,
  Plus,
  Receipt,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Trash2,
  TrendingUp,
  Wallet,
  X,
} from 'lucide-react';
import { User as PlatformUser } from '../../types/user';
import { Property } from '../../types/property';
import { formatDate } from '../../lib/utils';
import {
  AdminStatsSummary,
  FinanceSummaryResult,
  GateDetailRow,
  PastDistributionRow,
  PaymentGateRecord,
  adminAdjustBalanceRpc,
  adminChargeFeeRpc,
  allocateProportionalCents,
  approveDepositSubmission,
  approveWithdrawalRequest,
  assignPaymentGateToInvestor,
  centsToEur,
  createPrivateBucketSignedUrl,
  deletePaymentGateRecord,
  eurToCents,
  executePayDistribution,
  fetchAdminStats,
  fetchFinanceSummary,
  formatCentsEur,
  maskIban,
  recordInvestmentRpc,
  recordManualDepositRpc,
  rejectDepositSubmission,
  rejectWithdrawalRequest,
  reverseTransactionRpc,
  savePaymentGateRecord,
} from './adminSupabaseGateway';

export type FinanceTabId =
  | 'overview'
  | 'deposits'
  | 'withdrawals'
  | 'payments'
  | 'investments'
  | 'ledger'
  | 'gates';

const FINANCE_TABS: Array<{ id: FinanceTabId; label: string }> = [
  { id: 'overview', label: 'Overview' },
  { id: 'deposits', label: 'Deposits' },
  { id: 'withdrawals', label: 'Withdrawals' },
  { id: 'payments', label: 'Payments & corrections' },
  { id: 'investments', label: 'Investments & distributions' },
  { id: 'ledger', label: 'Ledger' },
  { id: 'gates', label: 'Gates' },
];

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

export interface AdminFinanceSectionProps {
  initialTab?: FinanceTabId;
  onTabChange?: (tab: FinanceTabId) => void;
  stats: AdminStatsSummary;
  limits: Record<string, any>;
  users: PlatformUser[];
  transactions: any[];
  manualDeposits: any[];
  investments: any[];
  properties: Property[];
  pastDistributions: PastDistributionRow[];
  paymentGates: PaymentGateRecord[];
  onRefresh: () => Promise<void> | void;
  onSuccess: (msg: string) => void;
  onError: (msg: string) => void;
}

export const AdminFinanceSection: React.FC<AdminFinanceSectionProps> = ({
  initialTab = 'overview',
  onTabChange,
  stats,
  limits,
  users,
  transactions,
  manualDeposits,
  investments,
  properties,
  pastDistributions,
  paymentGates,
  onRefresh,
  onSuccess,
  onError,
}) => {
  const [activeTab, setActiveTab] = useState<FinanceTabId>(initialTab);
  // Synchronous double-click lock spanning network execution + list refresh
  const moneyActionLockRef = useRef<boolean>(false);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const switchTab = useCallback(
    (tab: FinanceTabId) => {
      setActiveTab(tab);
      onTabChange?.(tab);
    },
    [onTabChange]
  );

  // Shared lookup maps
  const userById = useMemo(() => new Map(users.map((u) => [u.id, u])), [users]);
  const propById = useMemo(() => new Map(properties.map((p) => [p.id, p])), [properties]);
  const investorsOnly = useMemo(
    () => users.filter((u) => u.role === 'investor' && !u.isAdmin && !u.staffRole),
    [users]
  );
  const selectableUsers = investorsOnly;

  // Cross-tab Ledger jump state (from Overview cards or reversal links)
  const [ledgerKindFilter, setLedgerKindFilter] = useState<string>('all');
  const [ledgerStatusFilter, setLedgerStatusFilter] = useState<string>('all');
  const [ledgerInvestorFilter, setLedgerInvestorFilter] = useState<string>('all');
  const [ledgerFromDate, setLedgerFromDate] = useState<string>('');
  const [ledgerToDate, setLedgerToDate] = useState<string>('');
  const [ledgerSearch, setLedgerSearch] = useState<string>('');
  const [highlightedTxId, setHighlightedTxId] = useState<string | null>(null);

  const pendingDepCount = useMemo(
    () => transactions.filter((t) => t.type === 'deposit' && t.status === 'pending').length +
      manualDeposits.filter((m) => String(m.status || 'pending').toLowerCase() === 'pending').length,
    [transactions, manualDeposits]
  );
  const pendingWthCount = useMemo(
    () => transactions.filter((t) => t.type === 'withdrawal' && t.status === 'pending').length,
    [transactions]
  );

  const jumpToLedger = (opts: {
    kind?: string;
    status?: string;
    from?: string;
    to?: string;
    highlightId?: string;
  }) => {
    setLedgerKindFilter(opts.kind || 'all');
    setLedgerStatusFilter(opts.status || 'all');
    setLedgerInvestorFilter('all');
    setLedgerSearch('');
    if (opts.from !== undefined) setLedgerFromDate(opts.from);
    if (opts.to !== undefined) setLedgerToDate(opts.to);
    setHighlightedTxId(opts.highlightId || null);
    switchTab('ledger');
  };

  // =========================================================================
  // TAB 1: OVERVIEW (admin_stats() + finance_summary() with date filter)
  // =========================================================================
  const [overviewFrom, setOverviewFrom] = useState<string>('');
  const [overviewTo, setOverviewTo] = useState<string>('');
  const [overviewStats, setOverviewStats] = useState<AdminStatsSummary>(stats);
  const [summaryData, setSummaryData] = useState<FinanceSummaryResult | null>(null);
  const [loadingSummary, setLoadingSummary] = useState<boolean>(false);

  useEffect(() => {
    setOverviewStats(stats);
  }, [stats]);

  const loadFinanceOverview = useCallback(async () => {
    setLoadingSummary(true);
    try {
      const [liveStats, liveSummary] = await Promise.all([
        fetchAdminStats({ users, transactions, investments, kycQueueCount: stats.kycQueueCount }),
        fetchFinanceSummary(overviewFrom || undefined, overviewTo || undefined, { users, transactions }),
      ]);
      setOverviewStats(liveStats);
      setSummaryData(liveSummary);
    } finally {
      setLoadingSummary(false);
    }
  }, [users, transactions, investments, stats.kycQueueCount, overviewFrom, overviewTo]);

  useEffect(() => {
    if (activeTab === 'overview') {
      loadFinanceOverview();
    }
  }, [activeTab, loadFinanceOverview]);

  const applyOverviewPreset = (days: number | null) => {
    if (days === null) {
      setOverviewFrom('');
      setOverviewTo('');
      return;
    }
    const end = new Date();
    const start = new Date();
    start.setUTCDate(start.getUTCDate() - days);
    setOverviewFrom(start.toISOString().slice(0, 10));
    setOverviewTo(end.toISOString().slice(0, 10));
  };

  // =========================================================================
  // TAB 2: DEPOSITS (Pending list, approve w/ received amt, reject w/ reason, record manual deposit)
  // =========================================================================
  const [depFilter, setDepFilter] = useState<'pending' | 'completed' | 'failed' | 'all'>('pending');
  const [depSearch, setDepSearch] = useState('');
  const [depBusyId, setDepBusyId] = useState<string | null>(null);
  const [approveDepTarget, setApproveDepTarget] = useState<any | null>(null);
  const [receivedAmount, setReceivedAmount] = useState<string>('');
  const [rejectDepTarget, setRejectDepTarget] = useState<any | null>(null);
  const [rejectDepReason, setRejectDepReason] = useState<string>('');
  const [proofViewer, setProofViewer] = useState<{ title: string; url: string | null } | null>(null);

  // Record Manual Deposit Modal (admin_credit_deposit)
  const [manualDepOpen, setManualDepOpen] = useState(false);
  const [manualDepConfirmStep, setManualDepConfirmStep] = useState(false);
  const [manualDepUserId, setManualDepUserId] = useState<string>(() => selectableUsers[0]?.id || '');
  const [manualDepAmount, setManualDepAmount] = useState<string>('1000');
  const [manualDepNote, setManualDepNote] = useState<string>('');
  const [manualDepBusy, setManualDepBusy] = useState(false);

  useEffect(() => {
    if (!manualDepUserId && selectableUsers[0]?.id) {
      setManualDepUserId(selectableUsers[0].id);
    }
  }, [selectableUsers, manualDepUserId]);

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
        gateLabel:
          m.methodName ||
          m.method ||
          (u?.assignedGateId ? gateById.get(u.assignedGateId) : u?.assignedGateName) ||
          'Assigned Gate',
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
          gateLabel:
            (u?.assignedGateId ? gateById.get(u.assignedGateId) : u?.assignedGateName) ||
            t.method ||
            'Bank / Wire',
          amount: Number(t.amount || 0),
          reference: String(t.reference || t.id),
          proofPath: t.proofUrl || t.txHash || '',
          createdAt: String(t.createdAt || new Date().toISOString()),
          status: st === 'approved' || st === 'completed' ? 'completed' : st === 'rejected' || st === 'failed' ? 'failed' : 'pending',
          isManual: false,
        };
      });
    const q = depSearch.trim().toLowerCase();
    return [...manualRows, ...txRows]
      .filter((d) => (depFilter === 'all' ? true : d.status === depFilter))
      .filter((d) =>
        q
          ? `${d.investorName} ${d.investorEmail} ${d.reference} ${d.gateLabel}`.toLowerCase().includes(q)
          : true
      )
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [manualDeposits, transactions, userById, gateById, depFilter, depSearch]);

  const handleOpenProof = async (row: any) => {
    const url = await createPrivateBucketSignedUrl(
      row.proofPath,
      ['manual-payment-proofs', 'documents', 'deposits'],
      row.proofPath
    );
    setProofViewer({ title: `Proof of Payment — ${row.reference}`, url });
  };

  const handleConfirmApproveDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!approveDepTarget || moneyActionLockRef.current || depBusyId) return;
    const receivedCents = eurToCents(receivedAmount);
    if (!Number.isFinite(receivedCents) || receivedCents <= 0) {
      onError('Amount actually received must be greater than zero.');
      return;
    }
    const cleanEur = centsToEur(receivedCents);
    moneyActionLockRef.current = true;
    setDepBusyId(approveDepTarget.id);
    try {
      await approveDepositSubmission(approveDepTarget.id, cleanEur, approveDepTarget.isManual);
      setApproveDepTarget(null);
      await onRefresh();
      await loadFinanceOverview();
      onSuccess(`Deposit approved (${formatCentsEur(receivedCents)} credited via approve_deposit).`);
    } catch (err: any) {
      onError(err?.message || 'Unable to approve deposit.');
    } finally {
      setDepBusyId(null);
      moneyActionLockRef.current = false;
    }
  };

  const handleConfirmRejectDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectDepTarget || moneyActionLockRef.current || depBusyId) return;
    if (!rejectDepReason.trim()) {
      onError('A rejection reason is required.');
      return;
    }
    moneyActionLockRef.current = true;
    setDepBusyId(rejectDepTarget.id);
    try {
      await rejectDepositSubmission(rejectDepTarget.id, rejectDepReason.trim(), rejectDepTarget.isManual);
      setRejectDepTarget(null);
      setRejectDepReason('');
      await onRefresh();
      await loadFinanceOverview();
      onSuccess('Deposit rejected via reject_deposit.');
    } catch (err: any) {
      onError(err?.message || 'Unable to reject deposit.');
    } finally {
      setDepBusyId(null);
      moneyActionLockRef.current = false;
    }
  };

  const handleRecordManualDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (moneyActionLockRef.current || manualDepBusy) return;
    const uid = manualDepUserId || selectableUsers[0]?.id;
    const amtCents = eurToCents(manualDepAmount);
    if (!uid || !Number.isFinite(amtCents) || amtCents <= 0) {
      onError('Select an investor and enter a positive amount.');
      return;
    }
    if (!manualDepConfirmStep) {
      setManualDepConfirmStep(true);
      return;
    }
    const cleanEur = centsToEur(amtCents);
    moneyActionLockRef.current = true;
    setManualDepBusy(true);
    try {
      await recordManualDepositRpc({ userId: uid, amountEur: cleanEur, note: manualDepNote });
      setManualDepOpen(false);
      setManualDepConfirmStep(false);
      setManualDepNote('');
      await onRefresh();
      await loadFinanceOverview();
      onSuccess(`Manual deposit of ${formatCentsEur(amtCents)} credited via admin_credit_deposit.`);
    } catch (err: any) {
      onError(err?.message || 'Unable to record manual deposit.');
    } finally {
      setManualDepBusy(false);
      moneyActionLockRef.current = false;
    }
  };

  // =========================================================================
  // TAB 3: WITHDRAWALS (dest_iban masked+reveal+copy, fee from settings.limits, You send, payout_ref)
  // =========================================================================
  const defaultWithdrawalFeeCents = Math.max(0, eurToCents(limits?.withdrawal_fee_eur ?? 0));
  const defaultWithdrawalFee = centsToEur(defaultWithdrawalFeeCents);
  const [wthFilter, setWthFilter] = useState<'pending' | 'completed' | 'rejected' | 'all'>('pending');
  const [revealedIbanIds, setRevealedIbanIds] = useState<Record<string, boolean>>({});
  const [copiedIbanId, setCopiedIbanId] = useState<string | null>(null);
  const [wthBusyId, setWthBusyId] = useState<string | null>(null);

  const [approveWthTarget, setApproveWthTarget] = useState<{ tx: any; inv?: PlatformUser; iban: string } | null>(null);
  const [wthPayoutRef, setWthPayoutRef] = useState<string>('');
  const [wthFeeInput, setWthFeeInput] = useState<string>(defaultWithdrawalFee.toFixed(2));

  const [rejectWthTarget, setRejectWthTarget] = useState<any | null>(null);
  const [rejectWthReason, setRejectWthReason] = useState<string>('');

  const withdrawalRows = useMemo(() => {
    return transactions
      .filter((t) => t.type === 'withdrawal')
      .filter((t) =>
        wthFilter === 'all'
          ? true
          : wthFilter === 'completed'
          ? ['completed', 'approved', 'paid'].includes(t.status)
          : t.status === wthFilter
      )
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [transactions, wthFilter]);

  const handleCopyIban = async (id: string, rawIban: string) => {
    if (!rawIban || rawIban === 'Not on file') return;
    try {
      await navigator.clipboard.writeText(rawIban);
      setCopiedIbanId(id);
      setTimeout(() => setCopiedIbanId((cur) => (cur === id ? null : cur)), 2000);
    } catch {
      onError('Clipboard copy was blocked by the browser.');
    }
  };

  const handleConfirmApproveWithdrawal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!approveWthTarget || moneyActionLockRef.current || wthBusyId) return;
    const ref = wthPayoutRef.trim();
    if (ref.length < 2) {
      onError('Payout reference (your bank transfer ID) is required.');
      return;
    }
    const feeCents = Math.max(0, eurToCents(wthFeeInput));
    const txCents = eurToCents(approveWthTarget.tx.amount);
    if (feeCents > txCents) {
      onError('Withdrawal fee cannot exceed the requested withdrawal amount.');
      return;
    }
    const sentNetCents = Math.max(0, txCents - feeCents);
    moneyActionLockRef.current = true;
    setWthBusyId(approveWthTarget.tx.id);
    try {
      await approveWithdrawalRequest(approveWthTarget.tx.id, ref, centsToEur(feeCents));
      setApproveWthTarget(null);
      setWthPayoutRef('');
      await onRefresh();
      await loadFinanceOverview();
      onSuccess(`Withdrawal approved (Payout ref: ${ref} · Net sent: ${formatCentsEur(sentNetCents)}).`);
    } catch (err: any) {
      onError(err?.message || 'Unable to approve withdrawal.');
    } finally {
      setWthBusyId(null);
      moneyActionLockRef.current = false;
    }
  };

  const handleConfirmRejectWithdrawal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectWthTarget || moneyActionLockRef.current || wthBusyId) return;
    if (!rejectWthReason.trim()) {
      onError('A rejection reason is required.');
      return;
    }
    moneyActionLockRef.current = true;
    setWthBusyId(rejectWthTarget.id);
    try {
      await rejectWithdrawalRequest(rejectWthTarget.id, rejectWthReason.trim());
      setRejectWthTarget(null);
      setRejectWthReason('');
      await onRefresh();
      await loadFinanceOverview();
      onSuccess('Withdrawal rejected and reserved balance restored.');
    } catch (err: any) {
      onError(err?.message || 'Unable to reject withdrawal.');
    } finally {
      setWthBusyId(null);
      moneyActionLockRef.current = false;
    }
  };

  // =========================================================================
  // TAB 4: PAYMENTS & CORRECTIONS (Charge fee, Adjust balance, Reverse tx)
  // =========================================================================
  // 4A. Charge Fee
  const [feeUserId, setFeeUserId] = useState<string>(() => selectableUsers[0]?.id || '');
  const [feeAmount, setFeeAmount] = useState<string>('25');
  const [feeReason, setFeeReason] = useState<string>('Quarterly Custody & Administration Fee');
  const [feeConfirmOpen, setFeeConfirmOpen] = useState(false);

  // 4B. Adjust Balance
  const [adjUserId, setAdjUserId] = useState<string>(() => selectableUsers[0]?.id || '');
  const [adjDirection, setAdjDirection] = useState<'credit' | 'debit'>('credit');
  const [adjAmount, setAdjAmount] = useState<string>('100');
  const [adjReason, setAdjReason] = useState<string>('');
  const [adjConfirmOpen, setAdjConfirmOpen] = useState(false);

  // 4C. Reverse Transaction
  const [revTxSearch, setRevTxSearch] = useState<string>('');
  const [revTxId, setRevTxId] = useState<string>('');
  const [revReason, setRevReason] = useState<string>('');
  const [revConfirmOpen, setRevConfirmOpen] = useState(false);
  const [correctionBusy, setCorrectionBusy] = useState(false);

  useEffect(() => {
    if (!feeUserId && selectableUsers[0]?.id) setFeeUserId(selectableUsers[0].id);
    if (!adjUserId && selectableUsers[0]?.id) setAdjUserId(selectableUsers[0].id);
  }, [selectableUsers, feeUserId, adjUserId]);

  const reversibleTransactions = useMemo(() => {
    const q = revTxSearch.trim().toLowerCase();
    return transactions.filter((t) => {
      if (String(t.status).toLowerCase() !== 'completed') return false;
      if (String(t.type).toLowerCase() === 'reversal') return false;
      if (t.reversedById) return false;
      if (!q) return true;
      const inv = userById.get(t.userId);
      return `${t.reference} ${t.id} ${t.type} ${inv?.email || ''} ${inv?.fullName || ''}`.toLowerCase().includes(q);
    });
  }, [transactions, revTxSearch, userById]);

  useEffect(() => {
    if (!revTxId && reversibleTransactions[0]?.id) {
      setRevTxId(reversibleTransactions[0].id);
    }
  }, [reversibleTransactions, revTxId]);

  const feeInvestor = userById.get(feeUserId);
  const adjInvestor = userById.get(adjUserId);
  const selectedRevTx = useMemo(
    () => reversibleTransactions.find((t) => t.id === revTxId) || transactions.find((t) => t.id === revTxId),
    [reversibleTransactions, transactions, revTxId]
  );
  const revInvestor = selectedRevTx ? userById.get(selectedRevTx.userId) : undefined;

  const getReversalDeltaCents = (tx: any): number => {
    if (!tx) return 0;
    const t = String(tx.type).toLowerCase();
    const amtCents = eurToCents(tx.amount);
    if (['deposit', 'dividend', 'distribution', 'payout'].includes(t)) return -amtCents;
    if (['withdrawal', 'fee', 'investment', 'purchase'].includes(t)) return amtCents;
    if (t === 'adjustment') {
      const signedCents = eurToCents(
        tx.netAmount ?? (tx.method?.toLowerCase().includes('debit') ? -centsToEur(amtCents) : centsToEur(amtCents))
      );
      return -signedCents;
    }
    return 0;
  };

  const handleConfirmChargeFee = async () => {
    if (moneyActionLockRef.current || correctionBusy) return;
    const amtCents = eurToCents(feeAmount);
    if (!feeUserId || !Number.isFinite(amtCents) || amtCents <= 0) {
      onError('Select an investor and enter a positive fee amount.');
      return;
    }
    moneyActionLockRef.current = true;
    setCorrectionBusy(true);
    try {
      await adminChargeFeeRpc({ userId: feeUserId, amountEur: centsToEur(amtCents), reason: feeReason });
      setFeeConfirmOpen(false);
      await onRefresh();
      await loadFinanceOverview();
      onSuccess(`Charged ${formatCentsEur(amtCents)} fee to ${feeInvestor?.email || feeUserId} via admin_charge_fee.`);
    } catch (err: any) {
      onError(err?.message || 'Unable to charge fee.');
    } finally {
      setCorrectionBusy(false);
      moneyActionLockRef.current = false;
    }
  };

  const handleConfirmAdjust = async () => {
    if (moneyActionLockRef.current || correctionBusy) return;
    const rawCents = eurToCents(adjAmount);
    const deltaCents = adjDirection === 'credit' ? rawCents : -rawCents;
    if (!adjUserId || !Number.isFinite(deltaCents) || deltaCents === 0 || adjReason.trim().length < 3) {
      onError('Select an investor, enter a valid amount, and provide a reason (min 3 characters).');
      return;
    }
    moneyActionLockRef.current = true;
    setCorrectionBusy(true);
    try {
      await adminAdjustBalanceRpc({ userId: adjUserId, deltaEur: centsToEur(deltaCents), reason: adjReason.trim() });
      setAdjConfirmOpen(false);
      setAdjReason('');
      await onRefresh();
      await loadFinanceOverview();
      onSuccess(
        `Adjusted ${adjInvestor?.email || adjUserId} balance by ${deltaCents > 0 ? '+' : ''}${formatCentsEur(deltaCents)} via admin_adjust.`
      );
    } catch (err: any) {
      onError(err?.message || 'Unable to adjust balance.');
    } finally {
      setCorrectionBusy(false);
      moneyActionLockRef.current = false;
    }
  };

  const handleConfirmReverse = async () => {
    if (moneyActionLockRef.current || correctionBusy) return;
    if (!selectedRevTx || revReason.trim().length < 3) {
      onError('Select a transaction and enter a reversal reason (min 3 characters).');
      return;
    }
    moneyActionLockRef.current = true;
    setCorrectionBusy(true);
    try {
      await reverseTransactionRpc({ transactionId: selectedRevTx.id, reason: revReason.trim() });
      setRevConfirmOpen(false);
      setRevReason('');
      await onRefresh();
      await loadFinanceOverview();
      onSuccess(`Reversed transaction ${selectedRevTx.reference} via reverse_transaction.`);
    } catch (err: any) {
      onError(err?.message || 'Unable to reverse transaction.');
    } finally {
      setCorrectionBusy(false);
      moneyActionLockRef.current = false;
    }
  };

  // =========================================================================
  // TAB 5: INVESTMENTS & DISTRIBUTIONS (record_investment + pay_distribution w/ modal preview)
  // =========================================================================
  const [invUserId, setInvUserId] = useState<string>(() => selectableUsers[0]?.id || '');
  const [invPropId, setInvPropId] = useState<string>(() => properties[0]?.id || '');
  const [invShares, setInvShares] = useState<number>(10);
  const [invConfirmOpen, setInvConfirmOpen] = useState(false);
  const [recordingInv, setRecordingInv] = useState(false);

  const [distPropId, setDistPropId] = useState<string>(() => properties[0]?.id || '');
  const [distAmountEur, setDistAmountEur] = useState<number>(2500);
  const [distNote, setDistNote] = useState<string>('');
  const [distPreviewModalOpen, setDistPreviewModalOpen] = useState(false);
  const [payingDist, setPayingDist] = useState(false);

  useEffect(() => {
    if (!invUserId && selectableUsers[0]?.id) setInvUserId(selectableUsers[0].id);
    if (!invPropId && properties[0]?.id) setInvPropId(properties[0].id);
    if (!distPropId && properties[0]?.id) setDistPropId(properties[0].id);
  }, [selectableUsers, properties, invUserId, invPropId, distPropId]);

  const activeInvProp = propById.get(invPropId) || properties[0];
  const activeInvInvestor = userById.get(invUserId);
  const calculatedInvCostCents = Math.max(0, Math.floor(Number(invShares) || 0)) * eurToCents(activeInvProp?.tokenPrice || 0);

  const activeDistProp = propById.get(distPropId) || properties[0];
  const distPreview = useMemo(() => {
    const byHolder = new Map<string, { userId: string; name: string; email: string; shares: number }>();
    for (const inv of investments) {
      const pid = String(inv.propertyId || inv.property_id || '');
      if (pid !== (activeDistProp?.id || '')) continue;
      const uid = String(inv.userId || inv.user_id || '');
      const shares = Number(inv.tokensPurchased ?? inv.tokens_purchased ?? inv.shares ?? inv.tokensCount ?? 0);
      if (shares <= 0) continue;
      const u = userById.get(uid);
      const cur = byHolder.get(uid);
      if (cur) cur.shares += shares;
      else {
        byHolder.set(uid, {
          userId: uid,
          name: inv.userName || u?.fullName || u?.email || uid,
          email: inv.userEmail || u?.email || '—',
          shares,
        });
      }
    }
    const list = Array.from(byHolder.values());
    const totalShares = list.reduce((s, h) => s + h.shares, 0);
    const totalCents = eurToCents(distAmountEur);
    const allocCents = allocateProportionalCents(totalCents, list);
    return {
      totalShares,
      totalCents,
      rows: list.map((h) => {
        const ratio = totalShares > 0 ? h.shares / totalShares : 0;
        const payoutCents = allocCents.get(h.userId) ?? 0;
        return {
          ...h,
          pct: ratio * 100,
          payoutCents,
          payoutEur: centsToEur(payoutCents),
        };
      }),
    };
  }, [investments, activeDistProp?.id, userById, distAmountEur]);

  const normalizedInvestmentsByProperty = useMemo(() => {
    const groups = new Map<string, { propertyId: string; propertyTitle: string; totalShares: number; totalCostCents: number; holders: number }>();
    for (const inv of investments) {
      const pid = String(inv.propertyId || inv.property_id || '');
      const shares = Number(inv.tokensPurchased ?? inv.tokens_purchased ?? inv.shares ?? inv.tokensCount ?? 0);
      const costCents = eurToCents(inv.totalCost ?? inv.total_amount_invested ?? inv.amountEUR ?? inv.amount ?? 0);
      if (!groups.has(pid)) {
        groups.set(pid, {
          propertyId: pid,
          propertyTitle: inv.propertyTitle || propById.get(pid)?.title || pid || 'Property SPV',
          totalShares: 0,
          totalCostCents: 0,
          holders: 0,
        });
      }
      const g = groups.get(pid)!;
      g.totalShares += shares;
      g.totalCostCents += costCents;
      g.holders += 1;
    }
    return Array.from(groups.values()).map((g) => ({ ...g, totalCost: centsToEur(g.totalCostCents) }));
  }, [investments, propById]);

  const handleOpenRecordInvestmentConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    const uid = invUserId || selectableUsers[0]?.id;
    const pid = invPropId || properties[0]?.id;
    if (!uid || !pid || invShares <= 0) {
      onError('Select an investor, a property, and enter positive shares.');
      return;
    }
    setInvConfirmOpen(true);
  };

  const handleConfirmRecordInvestment = async () => {
    if (moneyActionLockRef.current || recordingInv) return;
    const uid = invUserId || selectableUsers[0]?.id;
    const pid = invPropId || properties[0]?.id;
    if (!uid || !pid || invShares <= 0) {
      onError('Select an investor, a property, and enter positive shares.');
      return;
    }
    moneyActionLockRef.current = true;
    setRecordingInv(true);
    try {
      await recordInvestmentRpc({
        userId: uid,
        propertyId: pid,
        shares: Math.floor(invShares),
        sharePriceEur: Number(activeInvProp?.tokenPrice || 500),
      });
      setInvConfirmOpen(false);
      await onRefresh();
      await loadFinanceOverview();
      onSuccess(`Recorded ${Math.floor(invShares)} shares (${formatCentsEur(calculatedInvCostCents)}) via record_investment.`);
    } catch (err: any) {
      onError(err?.message || 'Unable to record investment.');
    } finally {
      setRecordingInv(false);
      moneyActionLockRef.current = false;
    }
  };

  const handleConfirmPayDistribution = async () => {
    if (moneyActionLockRef.current || payingDist) return;
    const totalCents = eurToCents(distAmountEur);
    if (!activeDistProp?.id || totalCents <= 0) {
      onError('Select a property and enter a positive distribution total.');
      return;
    }
    moneyActionLockRef.current = true;
    setPayingDist(true);
    try {
      const res = await executePayDistribution({
        propertyId: activeDistProp.id,
        totalAmountEur: centsToEur(totalCents),
        note: distNote.trim() || undefined,
      });
      const paidDisplay = res.paidCount > 0 ? res.paidCount : distPreview.rows.length;
      setDistPreviewModalOpen(false);
      setDistNote('');
      await onRefresh();
      await loadFinanceOverview();
      onSuccess(`Paid ${formatCentsEur(totalCents)} across ${paidDisplay} investor${paidDisplay === 1 ? '' : 's'} via pay_distribution.`);
    } catch (err: any) {
      onError(err?.message || 'Unable to execute distribution payout.');
    } finally {
      setPayingDist(false);
      moneyActionLockRef.current = false;
    }
  };

  // =========================================================================
  // TAB 6: LEDGER (investor, kind, status, date, processed by & when, reversal links, CSV)
  // =========================================================================
  const [ledgerPage, setLedgerPage] = useState(1);
  const ledgerPageSize = 20;

  const availableKinds = useMemo(
    () => Array.from(new Set(transactions.map((t) => String(t.type || 'transaction')).filter(Boolean))).sort(),
    [transactions]
  );

  const txById = useMemo(() => new Map(transactions.map((t) => [t.id, t])), [transactions]);

  const filteredLedger = useMemo(() => {
    const q = ledgerSearch.trim().toLowerCase();
    const fromMs = ledgerFromDate ? new Date(`${ledgerFromDate}T00:00:00.000Z`).getTime() : null;
    const toMs = ledgerToDate ? new Date(`${ledgerToDate}T23:59:59.999Z`).getTime() : null;
    return transactions
      .filter((t) => {
        if (ledgerInvestorFilter !== 'all' && t.userId !== ledgerInvestorFilter) return false;
        if (ledgerKindFilter !== 'all' && t.type !== ledgerKindFilter) return false;
        if (ledgerStatusFilter !== 'all' && t.status !== ledgerStatusFilter) return false;
        const ts = new Date(t.createdAt).getTime();
        if (fromMs && ts < fromMs) return false;
        if (toMs && ts > toMs) return false;
        if (q) {
          const inv = userById.get(t.userId);
          const hay = `${t.reference} ${t.id} ${t.description} ${t.payoutReference || ''} ${t.processedBy || ''} ${inv?.email || ''} ${inv?.fullName || ''}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [transactions, ledgerInvestorFilter, ledgerKindFilter, ledgerStatusFilter, ledgerFromDate, ledgerToDate, ledgerSearch, userById]);

  const ledgerTotalPages = Math.max(1, Math.ceil(filteredLedger.length / ledgerPageSize));
  const safeLedgerPage = Math.min(ledgerPage, ledgerTotalPages);
  const paginatedLedger = filteredLedger.slice((safeLedgerPage - 1) * ledgerPageSize, safeLedgerPage * ledgerPageSize);

  const focusLinkedTransaction = (targetId?: string) => {
    if (!targetId) return;
    setLedgerInvestorFilter('all');
    setLedgerKindFilter('all');
    setLedgerStatusFilter('all');
    setLedgerFromDate('');
    setLedgerToDate('');
    setLedgerSearch('');
    setHighlightedTxId(targetId);
    const idx = transactions
      .slice()
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .findIndex((t) => t.id === targetId);
    if (idx >= 0) {
      setLedgerPage(Math.floor(idx / ledgerPageSize) + 1);
    }
  };

  // =========================================================================
  // TAB 7: GATES (Manage payment gates + Assign gates to investors)
  // =========================================================================
  const [gateModalOpen, setGateModalOpen] = useState(false);
  const [editingGateId, setEditingGateId] = useState<string | undefined>(undefined);
  const [editingGateSource, setEditingGateSource] = useState<'payment_gates' | 'manual_payment_methods'>('manual_payment_methods');
  const [gateName, setGateName] = useState('');
  const [gateMethod, setGateMethod] = useState<'bank' | 'usdt'>('bank');
  const [gateDetails, setGateDetails] = useState<GateDetailRow[]>([]);
  const [gateNetwork, setGateNetwork] = useState('TRC20');
  const [gateWalletAddress, setGateWalletAddress] = useState('');
  const [gateQrDataUrl, setGateQrDataUrl] = useState('');
  const [gateInstructions, setGateInstructions] = useState('');
  const [gateActive, setGateActive] = useState(true);
  const [savingGate, setSavingGate] = useState(false);
  const [busyGateId, setBusyGateId] = useState<string | null>(null);
  const [assignSearch, setAssignSearch] = useState('');
  const [assignBusyUid, setAssignBusyUid] = useState<string | null>(null);
  const [selectedAssignUserIds, setSelectedAssignUserIds] = useState<string[]>([]);
  const [bulkBankGateId, setBulkBankGateId] = useState('');
  const [bulkUsdtGateId, setBulkUsdtGateId] = useState('');

  const openAddGate = () => {
    setEditingGateId(undefined);
    setEditingGateSource(paymentGates[0]?.source || 'manual_payment_methods');
    setGateName('');
    setGateMethod('bank');
    setGateDetails([{ label: '', value: '' }]);
    setGateNetwork('TRC20');
    setGateWalletAddress('');
    setGateInstructions('');
    setGateActive(true);
    setGateModalOpen(true);
  };

  const openEditGate = (g: PaymentGateRecord) => {
    setEditingGateId(g.id);
    setEditingGateSource(g.source);
    setGateName(g.name);
    setGateMethod(g.method === 'usdt' ? 'usdt' : 'bank');
    setGateDetails(g.details.length > 0 ? g.details : [{ label: '', value: '' }]);
    setGateNetwork(g.network || 'TRC20');
    setGateWalletAddress(g.walletAddress || '');
    setGateInstructions(g.instructions);
    setGateActive(g.active);
    setGateModalOpen(true);
  };

  useEffect(() => {
    if (!gateModalOpen || gateMethod !== 'usdt' || !gateWalletAddress.trim()) {
      setGateQrDataUrl('');
      return;
    }
    let cancelled = false;
    QRCode.toDataURL(gateWalletAddress.trim(), { width: 220, margin: 1 })
      .then((url: string) => { if (!cancelled) setGateQrDataUrl(url); })
      .catch(() => { if (!cancelled) setGateQrDataUrl(''); });
    return () => { cancelled = true; };
  }, [gateModalOpen, gateMethod, gateWalletAddress]);

  const handleSaveGate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gateName.trim()) {
      onError('Payment gate name is required.');
      return;
    }
    const cleanDetails = gateDetails.filter((row) => row.label.trim() || row.value.trim());
    if (gateMethod === 'bank' && (!cleanDetails.length || cleanDetails.some((row) => !row.label.trim() || !row.value.trim()))) {
      onError('Every bank detail row needs both a label and a value.');
      return;
    }
    if (gateMethod === 'usdt') {
      const address = gateWalletAddress.trim();
      const valid = gateNetwork === 'TRC20'
        ? (address.startsWith('T') && address.length === 34 && [...address].every((char) => char.trim().length > 0))
        : ['ERC20', 'BEP20'].includes(gateNetwork) && /^0x[a-fA-F0-9]{40}$/.test(address);
      if (!valid) {
        onError(gateNetwork === 'TRC20'
          ? 'TRC20 wallet addresses must start with T and contain 34 characters.'
          : 'ERC20 and BEP20 wallet addresses must start with 0x and contain 42 characters.');
        return;
      }
    }
    const previousGate = editingGateId ? paymentGates.find((gate) => gate.id === editingGateId) : undefined;
    if (previousGate) {
      const oldDetails = previousGate.details.map((row) => `${row.label}: ${row.value}`).join('\n') || '(none)';
      const newDetails = cleanDetails.map((row) => `${row.label}: ${row.value}`).join('\n') || '(none)';
      const destinationChanged =
        previousGate.method !== gateMethod ||
        (gateMethod === 'bank' && (previousGate.method !== 'bank' || oldDetails !== newDetails)) ||
        (gateMethod === 'usdt' && (previousGate.network !== gateNetwork || previousGate.walletAddress !== gateWalletAddress.trim()));
      if (destinationChanged) {
        const oldValue = previousGate.method === 'usdt'
          ? `USDT ${previousGate.network || '(network unset)'}\nWallet: ${previousGate.walletAddress || '(address unset)'}`
          : `Bank details:\n${oldDetails}`;
        const newValue = gateMethod === 'usdt'
          ? `USDT ${gateNetwork}\nWallet: ${gateWalletAddress.trim()}`
          : `Bank details:\n${newDetails}`;
        if (!window.confirm(`Changing payment destination details can redirect investor payments. Confirm this change?\n\nOLD VALUES\n${oldValue}\n\nNEW VALUES\n${newValue}`)) return;
      }
    }
    setSavingGate(true);
    try {
      await savePaymentGateRecord(
        {
          id: editingGateId,
          name: gateName,
          method: gateMethod,
          details: cleanDetails,
          instructions: gateInstructions,
          active: gateActive,
          network: gateNetwork,
          walletAddress: gateWalletAddress,
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
        { id: g.id, name: g.name, method: g.method, details: g.details, instructions: g.instructions, active: !g.active, network: g.network, walletAddress: g.walletAddress },
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

  const handleAssignGateToInvestor = async (uid: string, method: 'bank' | 'usdt', nextGateId: string) => {
    setAssignBusyUid(uid);
    try {
      const gateObj = paymentGates.find((g) => g.id === nextGateId) || null;
      await assignPaymentGateToInvestor([uid], method, nextGateId || null);
      onSuccess(nextGateId ? `Assigned "${gateObj?.name || 'gate'}" as the ${method.toUpperCase()} gate.` : `Cleared investor ${method.toUpperCase()} gate.`);
      await onRefresh();
    } catch (err: any) {
      onError(err?.message || 'Unable to assign payment gate.');
    } finally {
      setAssignBusyUid(null);
    }
  };

  const handleBulkAssignGate = async (method: 'bank' | 'usdt') => {
    const gateId = method === 'bank' ? bulkBankGateId : bulkUsdtGateId;
    if (!selectedAssignUserIds.length) {
      onError('Select at least one investor first.');
      return;
    }
    setAssignBusyUid('bulk');
    try {
      await assignPaymentGateToInvestor(selectedAssignUserIds, method, gateId || null);
      onSuccess(gateId
        ? `Assigned the selected ${method.toUpperCase()} gate to ${selectedAssignUserIds.length} investor(s).`
        : `Cleared the selected investors' ${method.toUpperCase()} gate.`);
      setSelectedAssignUserIds([]);
      await onRefresh();
    } catch (err: any) {
      onError(err?.message || 'Unable to update selected investors.');
    } finally {
      setAssignBusyUid(null);
    }
  };

  const filteredAssignInvestors = useMemo(() => {
    const q = assignSearch.trim().toLowerCase();
    return selectableUsers.filter((u) =>
      q ? `${u.fullName || ''} ${u.email}`.toLowerCase().includes(q) : true
    );
  }, [selectableUsers, assignSearch]);

  // =========================================================================
  // RENDER
  // =========================================================================
  return (
    <div className="space-y-6">
      {/* Header + 7-Tab Navigation Bar */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-[#F2F5F4] tracking-tight">Finance Operations</h1>
            <p className="text-xs text-[#8FA1A8] mt-1">
              Treasury cashflows, wallet liabilities, deposit/withdrawal settlement, fee &amp; balance corrections, distributions, ledger, and payment gates.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-[#8FA1A8] tabular-nums shrink-0">
            <span>Default withdrawal fee: <strong className="text-[#F2F5F4]">{formatCentsEur(defaultWithdrawalFeeCents)}</strong></span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-[#1F2C33]">
          {FINANCE_TABS.map((tab) => {
            const active = activeTab === tab.id;
            const badge =
              tab.id === 'deposits' && pendingDepCount > 0
                ? pendingDepCount
                : tab.id === 'withdrawals' && pendingWthCount > 0
                ? pendingWthCount
                : undefined;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => switchTab(tab.id)}
                className={`whitespace-nowrap shrink-0 px-3.5 py-2 rounded-xl text-xs font-semibold inline-flex items-center gap-2 transition-colors cursor-pointer ${
                  active
                    ? 'bg-[#6FD8B0] text-[#0B0F10]'
                    : 'bg-[#121A1F] border border-[#1F2C33] text-[#B6C4C9] hover:text-[#F2F5F4] hover:border-[#2F4650]'
                }`}
              >
                <span>{tab.label}</span>
                {typeof badge === 'number' && (
                  <span
                    className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold tabular-nums ${
                      active ? 'bg-[#0B0F10]/20 text-[#0B0F10]' : 'bg-[#0B0F10] text-[#6FD8B0] border border-[#1F2C33]'
                    }`}
                  >
                    {badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ===================================================================== */}
      {/* TAB 1: OVERVIEW                                                       */}
      {/* ===================================================================== */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Date Filter Bar for finance_summary() */}
          <div className="bg-[#121A1F] border border-[#1F2C33] rounded-2xl p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[#8FA1A8] font-semibold">Date Filter:</span>
              <input
                type="date"
                value={overviewFrom}
                onChange={(e) => setOverviewFrom(e.target.value)}
                aria-label="Summary from date"
                className="px-3 py-1.5 bg-[#0B0F10] border border-[#1F2C33] rounded-xl text-[#F2F5F4]"
              />
              <span className="text-[#8FA1A8]">to</span>
              <input
                type="date"
                value={overviewTo}
                onChange={(e) => setOverviewTo(e.target.value)}
                aria-label="Summary to date"
                className="px-3 py-1.5 bg-[#0B0F10] border border-[#1F2C33] rounded-xl text-[#F2F5F4]"
              />
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              {[
                { label: 'All Time', days: null },
                { label: 'Last 30D', days: 30 },
                { label: 'Last 7D', days: 7 },
                { label: 'Today', days: 0 },
              ].map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => applyOverviewPreset(preset.days)}
                  className="whitespace-nowrap px-3 py-1.5 rounded-lg bg-[#0B0F10] border border-[#1F2C33] hover:border-[#6FD8B0] text-[#B6C4C9] hover:text-[#F2F5F4] font-semibold cursor-pointer"
                >
                  {preset.label}
                </button>
              ))}
              {loadingSummary && (
                <span className="text-[11px] text-[#6FD8B0] ml-2">Updating summary...</span>
              )}
            </div>
          </div>

          {/* Clickable Summary KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <button
              type="button"
              onClick={() => switchTab('deposits')}
              className="text-left bg-[#121A1F] p-5 rounded-2xl border border-[#1F2C33] hover:border-[#6FD8B0] transition-colors cursor-pointer"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[#8FA1A8]">Pending Deposits</span>
                <ArrowDownLeft className="w-4 h-4 text-[#6FD8B0]" />
              </div>
              <div className="text-xl font-bold text-[#F2F5F4] mt-2 tabular-nums">
                {summaryData?.pendingDepositsCount ?? overviewStats.pendingDepositsCount}{' '}
                <span className="text-sm font-semibold text-[#6FD8B0]">
                  ({formatCentsEur(eurToCents(summaryData?.pendingDepositsTotalEur ?? overviewStats.pendingDepositsTotalEur))})
                </span>
              </div>
              <div className="text-[11px] text-[#8FA1A8] mt-1">Open Deposits approval queue →</div>
            </button>

            <button
              type="button"
              onClick={() => switchTab('withdrawals')}
              className="text-left bg-[#121A1F] p-5 rounded-2xl border border-[#1F2C33] hover:border-[#6FD8B0] transition-colors cursor-pointer"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[#8FA1A8]">Pending Withdrawals</span>
                <ArrowUpRight className="w-4 h-4 text-[#6FD8B0]" />
              </div>
              <div className="text-xl font-bold text-[#F2F5F4] mt-2 tabular-nums">
                {summaryData?.pendingWithdrawalsCount ?? overviewStats.pendingWithdrawalsCount}{' '}
                <span className="text-sm font-semibold text-amber-300">
                  ({formatCentsEur(eurToCents(summaryData?.pendingWithdrawalsTotalEur ?? overviewStats.pendingWithdrawalsTotalEur))})
                </span>
              </div>
              <div className="text-[11px] text-[#8FA1A8] mt-1">Open Withdrawals payout queue →</div>
            </button>

            <button
              type="button"
              onClick={() => switchTab('payments')}
              className="text-left bg-[#121A1F] p-5 rounded-2xl border border-[#1F2C33] hover:border-[#6FD8B0] transition-colors cursor-pointer"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[#8FA1A8]">Wallet Liabilities</span>
                <Wallet className="w-4 h-4 text-[#6FD8B0]" />
              </div>
              <div className="text-xl font-bold text-[#6FD8B0] mt-2 tabular-nums">
                {summaryData
                  ? formatCentsEur(eurToCents(summaryData.walletLiabilitiesEur))
                  : formatCentsEur(
                      selectableUsers.reduce((s, u) => s + eurToCents(u.walletBalance), 0)
                    )}
              </div>
              <div className="text-[11px] text-[#8FA1A8] mt-1">Total cash owed to investors →</div>
            </button>

            <button
              type="button"
              onClick={() => switchTab('investments')}
              className="text-left bg-[#121A1F] p-5 rounded-2xl border border-[#1F2C33] hover:border-[#6FD8B0] transition-colors cursor-pointer"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[#8FA1A8]">Total AUM (at cost)</span>
                <Building2 className="w-4 h-4 text-[#6FD8B0]" />
              </div>
              <div className="text-xl font-bold text-[#F2F5F4] mt-2 tabular-nums">
                {formatCentsEur(eurToCents(overviewStats.totalAumAtCostEur))}
              </div>
              <div className="text-[11px] text-[#8FA1A8] mt-1">
                {overviewStats.investorsCount} investor(s) · Investments &amp; distributions →
              </div>
            </button>
          </div>

          {/* Totals by Kind & Totals by Status */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-[#121A1F] border border-[#1F2C33] rounded-2xl overflow-hidden">
              <div className="p-4 bg-[#0B0F10] border-b border-[#1F2C33] flex items-center justify-between">
                <h2 className="text-sm font-bold text-[#F2F5F4]">Totals by Kind</h2>
                <button
                  type="button"
                  onClick={() => jumpToLedger({ from: overviewFrom, to: overviewTo })}
                  className="text-[11px] font-semibold text-[#6FD8B0] hover:underline cursor-pointer"
                >
                  Open Ledger →
                </button>
              </div>
              <div className="divide-y divide-[#1F2C33]">
                {Object.entries(summaryData?.totalsByKind || {}).map(([kind, bucket]) => (
                  <button
                    key={kind}
                    type="button"
                    onClick={() => jumpToLedger({ kind, from: overviewFrom, to: overviewTo })}
                    className="w-full px-4 py-3 flex items-center justify-between hover:bg-[#162026] text-xs cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="uppercase font-semibold text-[#F2F5F4]">{kind}</span>
                      <span className="text-[11px] text-[#8FA1A8] tabular-nums">{bucket.count} tx</span>
                    </div>
                    <span className="font-bold text-[#6FD8B0] tabular-nums">{formatCentsEur(eurToCents(bucket.totalEur))}</span>
                  </button>
                ))}
                {Object.keys(summaryData?.totalsByKind || {}).length === 0 && (
                  <div className="p-8 text-center text-xs text-[#8FA1A8]">No transactions in selected date window.</div>
                )}
              </div>
            </div>

            <div className="bg-[#121A1F] border border-[#1F2C33] rounded-2xl overflow-hidden">
              <div className="p-4 bg-[#0B0F10] border-b border-[#1F2C33] flex items-center justify-between">
                <h2 className="text-sm font-bold text-[#F2F5F4]">Totals by Status</h2>
                <button
                  type="button"
                  onClick={() => switchTab('gates')}
                  className="text-[11px] font-semibold text-[#6FD8B0] hover:underline cursor-pointer"
                >
                  Payment Gates →
                </button>
              </div>
              <div className="divide-y divide-[#1F2C33]">
                {Object.entries(summaryData?.totalsByStatus || {}).map(([st, bucket]) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => jumpToLedger({ status: st, from: overviewFrom, to: overviewTo })}
                    className="w-full px-4 py-3 flex items-center justify-between hover:bg-[#162026] text-xs cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`uppercase font-semibold ${
                          ['completed', 'approved', 'paid'].includes(st)
                            ? 'text-[#6FD8B0]'
                            : st === 'pending'
                            ? 'text-amber-400'
                            : 'text-rose-400'
                        }`}
                      >
                        {st}
                      </span>
                      <span className="text-[11px] text-[#8FA1A8] tabular-nums">{bucket.count} tx</span>
                    </div>
                    <span className="font-bold text-[#F2F5F4] tabular-nums">{formatCentsEur(eurToCents(bucket.totalEur))}</span>
                  </button>
                ))}
                {Object.keys(summaryData?.totalsByStatus || {}).length === 0 && (
                  <div className="p-8 text-center text-xs text-[#8FA1A8]">No transactions in selected date window.</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 2: DEPOSITS                                                       */}
      {/* ===================================================================== */}
      {activeTab === 'deposits' && (
        <div className="space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              {(['pending', 'completed', 'failed', 'all'] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setDepFilter(s)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize cursor-pointer ${
                    depFilter === s ? 'bg-[#6FD8B0] text-[#0B0F10]' : 'bg-[#121A1F] border border-[#1F2C33] text-[#B6C4C9]'
                  }`}
                >
                  {s}
                </button>
              ))}
              <div className="relative ml-1">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#8FA1A8]" />
                <input
                  type="text"
                  value={depSearch}
                  onChange={(e) => setDepSearch(e.target.value)}
                  placeholder="Search investor or ref..."
                  className="pl-8 pr-3 py-1.5 bg-[#121A1F] border border-[#1F2C33] rounded-lg text-xs text-[#F2F5F4]"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setManualDepUserId((p) => p || selectableUsers[0]?.id || '');
                setManualDepConfirmStep(false);
                setManualDepOpen(true);
              }}
              className="whitespace-nowrap px-4 py-2 rounded-xl bg-[#6FD8B0] hover:bg-[#5ec8a0] text-[#0B0F10] text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer self-start lg:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>Record manual deposit</span>
            </button>
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
                  {combinedDeposits.map((row) => (
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
                            className="px-2.5 py-1 rounded-lg bg-[#0B0F10] border border-[#1F2C33] hover:border-[#6FD8B0] text-[#6FD8B0] text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer"
                          >
                            <Eye className="w-3 h-3" />
                            <span>Signed URL</span>
                          </button>
                        ) : (
                          <span className="text-[11px] text-[#8FA1A8]">No proof</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-[#B6C4C9] whitespace-nowrap">{formatDate(row.createdAt)}</td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`uppercase font-semibold text-[11px] ${
                            row.status === 'completed' ? 'text-[#6FD8B0]' : row.status === 'failed' ? 'text-rose-400' : 'text-amber-400'
                          }`}
                        >
                          {row.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        {row.status === 'pending' ? (
                          <div className="inline-flex items-center gap-2">
                            <button
                              type="button"
                              disabled={Boolean(depBusyId)}
                              onClick={() => {
                                setApproveDepTarget(row);
                                setReceivedAmount(centsToEur(eurToCents(row.amount)).toFixed(2));
                              }}
                              className="px-3 py-1.5 rounded-lg bg-[#6FD8B0] hover:bg-[#5ec8a0] text-[#0B0F10] text-[11px] font-bold cursor-pointer disabled:opacity-50"
                            >
                              Approve
                            </button>
                            <button
                              type="button"
                              disabled={Boolean(depBusyId)}
                              onClick={() => {
                                setRejectDepTarget(row);
                                setRejectDepReason('');
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
                  {combinedDeposits.length === 0 && (
                    <tr>
                      <td colSpan={8} className="py-10 text-center text-xs text-[#8FA1A8]">
                        No deposits matching &ldquo;{depFilter}&rdquo;.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 3: WITHDRAWALS                                                    */}
      {/* ===================================================================== */}
      {activeTab === 'withdrawals' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex gap-1.5">
              {(['pending', 'completed', 'rejected', 'all'] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setWthFilter(s)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize cursor-pointer ${
                    wthFilter === s ? 'bg-[#6FD8B0] text-[#0B0F10]' : 'bg-[#121A1F] border border-[#1F2C33] text-[#B6C4C9]'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
            <div className="text-xs text-[#8FA1A8] tabular-nums">
              Configured fee from <span className="font-mono text-[#6FD8B0]">settings.limits</span>:{' '}
              <strong className="text-[#F2F5F4]">{formatCentsEur(defaultWithdrawalFeeCents)}</strong>
            </div>
          </div>

          <div className="bg-[#121A1F] rounded-2xl border border-[#1F2C33] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-[#0B0F10] border-b border-[#1F2C33] text-[11px] font-semibold text-[#8FA1A8] uppercase tracking-wider">
                    <th className="py-3 px-4">Investor</th>
                    <th className="py-3 px-4 text-right">Amount</th>
                    <th className="py-3 px-4 text-right">Fee</th>
                    <th className="py-3 px-4 text-right">You Send</th>
                    <th className="py-3 px-4">KYC Status</th>
                    <th className="py-3 px-4">Locked Destination IBAN</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1F2C33]">
                  {withdrawalRows.map((tx) => {
                    const inv = userById.get(tx.userId);
                    const rawIban = String(tx.destIban || tx.destination || inv?.bankIban || tx.reference || '');
                    const revealed = Boolean(revealedIbanIds[tx.id]);
                    const feeCentsShown =
                      tx.status === 'pending'
                        ? defaultWithdrawalFeeCents
                        : eurToCents(tx.feeAmount ?? defaultWithdrawalFee);
                    const amountCents = eurToCents(tx.amount);
                    const netSendCents = Math.max(0, amountCents - feeCentsShown);
                    return (
                      <tr key={tx.id} className="hover:bg-[#162026]">
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-[#F2F5F4]">{inv?.fullName || 'Investor'}</div>
                          <div className="text-[11px] text-[#8FA1A8]">{inv?.email || tx.userEmail || tx.userId}</div>
                        </td>
                        <td className="py-3.5 px-4 text-right font-bold text-[#F2F5F4] tabular-nums">{formatCentsEur(amountCents)}</td>
                        <td className="py-3.5 px-4 text-right font-mono text-[#8FA1A8] tabular-nums">{formatCentsEur(feeCentsShown)}</td>
                        <td className="py-3.5 px-4 text-right font-bold text-[#6FD8B0] tabular-nums">{formatCentsEur(netSendCents)}</td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`uppercase font-semibold text-[11px] ${
                              inv?.kycStatus === 'verified' ? 'text-[#6FD8B0]' : inv?.kycStatus === 'rejected' ? 'text-rose-400' : 'text-amber-400'
                            }`}
                          >
                            {inv?.kycStatus || 'pending'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-[#F2F5F4]">{revealed ? rawIban : maskIban(rawIban)}</span>
                            <button
                              type="button"
                              onClick={() => setRevealedIbanIds((p) => ({ ...p, [tx.id]: !p[tx.id] }))}
                              className="p-1 rounded bg-[#0B0F10] border border-[#1F2C33] text-[#8FA1A8] hover:text-[#6FD8B0] cursor-pointer"
                              title={revealed ? 'Hide IBAN' : 'Reveal IBAN'}
                            >
                              {revealed ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleCopyIban(tx.id, rawIban)}
                              className="p-1 rounded bg-[#0B0F10] border border-[#1F2C33] text-[#8FA1A8] hover:text-[#6FD8B0] cursor-pointer"
                              title="Copy IBAN"
                            >
                              {copiedIbanId === tx.id ? (
                                <Check className="w-3 h-3 text-[#6FD8B0]" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-[#B6C4C9] whitespace-nowrap">{formatDate(tx.createdAt)}</td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`uppercase font-semibold text-[11px] ${
                              ['completed', 'approved', 'paid'].includes(tx.status)
                                ? 'text-[#6FD8B0]'
                                : tx.status === 'rejected'
                                ? 'text-rose-400'
                                : 'text-amber-400'
                            }`}
                          >
                            {tx.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          {tx.status === 'pending' ? (
                            <div className="inline-flex items-center gap-2">
                              <button
                                type="button"
                                disabled={Boolean(wthBusyId)}
                                onClick={() => {
                                  setApproveWthTarget({ tx, inv, iban: rawIban });
                                  setWthFeeInput(defaultWithdrawalFee.toFixed(2));
                                  setWthPayoutRef('');
                                }}
                                className="px-3 py-1.5 rounded-lg bg-[#6FD8B0] hover:bg-[#5ec8a0] text-[#0B0F10] text-[11px] font-bold cursor-pointer disabled:opacity-50"
                              >
                                Approve
                              </button>
                              <button
                                type="button"
                                disabled={Boolean(wthBusyId)}
                                onClick={() => {
                                  setRejectWthTarget(tx);
                                  setRejectWthReason('');
                                }}
                                className="px-3 py-1.5 rounded-lg bg-[#0B0F10] border border-rose-500/40 text-rose-300 hover:bg-rose-500/10 text-[11px] font-semibold cursor-pointer disabled:opacity-50"
                              >
                                Reject
                              </button>
                            </div>
                          ) : (
                            <span className="text-[11px] font-mono text-[#8FA1A8]">
                              {tx.payoutReference ? `Ref: ${tx.payoutReference}` : 'Settled'}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {withdrawalRows.length === 0 && (
                    <tr>
                      <td colSpan={9} className="py-10 text-center text-xs text-[#8FA1A8]">
                        No withdrawals in &ldquo;{wthFilter}&rdquo; state.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 4: PAYMENTS & CORRECTIONS                                         */}
      {/* ===================================================================== */}
      {activeTab === 'payments' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Form 1: Charge Fee (admin_charge_fee) */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!feeUserId || eurToCents(feeAmount) <= 0) {
                onError('Select an investor and enter a positive fee amount.');
                return;
              }
              setFeeConfirmOpen(true);
            }}
            className="bg-[#121A1F] border border-[#1F2C33] rounded-2xl p-5 flex flex-col justify-between space-y-4"
          >
            <div className="space-y-3 text-xs">
              <div className="flex items-center gap-2 pb-2 border-b border-[#1F2C33]">
                <Receipt className="w-4 h-4 text-[#6FD8B0]" />
                <h2 className="text-sm font-bold text-[#F2F5F4]">Charge Fee</h2>
              </div>

              <div>
                <label className="block text-[#B6C4C9] font-semibold mb-1">Investor</label>
                <select
                  value={feeUserId}
                  onChange={(e) => setFeeUserId(e.target.value)}
                  className="w-full px-3 py-2 bg-[#0B0F10] border border-[#1F2C33] rounded-xl text-[#F2F5F4]"
                >
                  {selectableUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.fullName || u.email} ({u.email})
                    </option>
                  ))}
                </select>
              </div>

              <div className="p-3 rounded-xl bg-[#0B0F10] border border-[#1F2C33] flex items-center justify-between tabular-nums">
                <span className="text-[#8FA1A8]">Current Balance</span>
                <span className="font-bold text-[#6FD8B0]">
                  {formatCentsEur(eurToCents(feeInvestor?.walletBalance ?? 0))}
                </span>
              </div>

              <div>
                <label className="block text-[#B6C4C9] font-semibold mb-1">Fee Amount (EUR)</label>
                <input
                  type="number"
                  min={0.01}
                  step="0.01"
                  required
                  value={feeAmount}
                  onChange={(e) => setFeeAmount(e.target.value)}
                  className="w-full px-3 py-2 bg-[#0B0F10] border border-[#1F2C33] rounded-xl font-mono text-[#F2F5F4]"
                />
              </div>

              <div>
                <label className="block text-[#B6C4C9] font-semibold mb-1">Fee Description / Note</label>
                <input
                  type="text"
                  value={feeReason}
                  onChange={(e) => setFeeReason(e.target.value)}
                  placeholder="Custody or wire fee reason"
                  className="w-full px-3 py-2 bg-[#0B0F10] border border-[#1F2C33] rounded-xl text-[#F2F5F4]"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-[#6FD8B0] hover:bg-[#5ec8a0] text-[#0B0F10] text-xs font-bold cursor-pointer"
            >
              Review &amp; Charge Fee
            </button>
          </form>

          {/* Form 2: Adjust Balance (admin_adjust) */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!adjUserId || eurToCents(adjAmount) <= 0 || adjReason.trim().length < 3) {
                onError('Select an investor, enter a positive amount, and enter a required reason.');
                return;
              }
              setAdjConfirmOpen(true);
            }}
            className="bg-[#121A1F] border border-[#1F2C33] rounded-2xl p-5 flex flex-col justify-between space-y-4"
          >
            <div className="space-y-3 text-xs">
              <div className="flex items-center gap-2 pb-2 border-b border-[#1F2C33]">
                <SlidersHorizontal className="w-4 h-4 text-[#6FD8B0]" />
                <h2 className="text-sm font-bold text-[#F2F5F4]">Adjust Balance</h2>
              </div>

              <div>
                <label className="block text-[#B6C4C9] font-semibold mb-1">Investor</label>
                <select
                  value={adjUserId}
                  onChange={(e) => setAdjUserId(e.target.value)}
                  className="w-full px-3 py-2 bg-[#0B0F10] border border-[#1F2C33] rounded-xl text-[#F2F5F4]"
                >
                  {selectableUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.fullName || u.email} ({u.email})
                    </option>
                  ))}
                </select>
              </div>

              <div className="p-3 rounded-xl bg-[#0B0F10] border border-[#1F2C33] flex items-center justify-between tabular-nums">
                <span className="text-[#8FA1A8]">Current Balance</span>
                <span className="font-bold text-[#6FD8B0]">
                  {formatCentsEur(eurToCents(adjInvestor?.walletBalance ?? 0))}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setAdjDirection('credit')}
                  className={`py-2 rounded-xl text-xs font-bold cursor-pointer ${
                    adjDirection === 'credit'
                      ? 'bg-[#6FD8B0] text-[#0B0F10]'
                      : 'bg-[#0B0F10] border border-[#1F2C33] text-[#B6C4C9]'
                  }`}
                >
                  Credit (+)
                </button>
                <button
                  type="button"
                  onClick={() => setAdjDirection('debit')}
                  className={`py-2 rounded-xl text-xs font-bold cursor-pointer ${
                    adjDirection === 'debit'
                      ? 'bg-rose-600 text-white'
                      : 'bg-[#0B0F10] border border-[#1F2C33] text-[#B6C4C9]'
                  }`}
                >
                  Debit (−)
                </button>
              </div>

              <div>
                <label className="block text-[#B6C4C9] font-semibold mb-1">Amount (EUR)</label>
                <input
                  type="number"
                  min={0.01}
                  step="0.01"
                  required
                  value={adjAmount}
                  onChange={(e) => setAdjAmount(e.target.value)}
                  className="w-full px-3 py-2 bg-[#0B0F10] border border-[#1F2C33] rounded-xl font-mono text-[#F2F5F4]"
                />
              </div>

              <div>
                <label className="block text-[#B6C4C9] font-semibold mb-1">Required Reason</label>
                <input
                  type="text"
                  required
                  minLength={3}
                  value={adjReason}
                  onChange={(e) => setAdjReason(e.target.value)}
                  placeholder="Audit explanation (min 3 characters)"
                  className="w-full px-3 py-2 bg-[#0B0F10] border border-[#1F2C33] rounded-xl text-[#F2F5F4]"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-[#6FD8B0] hover:bg-[#5ec8a0] text-[#0B0F10] text-xs font-bold cursor-pointer"
            >
              Review &amp; Apply Adjustment
            </button>
          </form>

          {/* Form 3: Reverse a Transaction (reverse_transaction) */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!selectedRevTx || revReason.trim().length < 3) {
                onError('Select a completed transaction and enter a reversal reason (min 3 characters).');
                return;
              }
              setRevConfirmOpen(true);
            }}
            className="bg-[#121A1F] border border-[#1F2C33] rounded-2xl p-5 flex flex-col justify-between space-y-4"
          >
            <div className="space-y-3 text-xs">
              <div className="flex items-center gap-2 pb-2 border-b border-[#1F2C33]">
                <RotateCcw className="w-4 h-4 text-rose-400" />
                <h2 className="text-sm font-bold text-[#F2F5F4]">Reverse a Transaction</h2>
              </div>

              <div>
                <label className="block text-[#B6C4C9] font-semibold mb-1">Find Transaction</label>
                <input
                  type="text"
                  value={revTxSearch}
                  onChange={(e) => setRevTxSearch(e.target.value)}
                  placeholder="Filter by ref or email..."
                  className="w-full px-3 py-1.5 mb-2 bg-[#0B0F10] border border-[#1F2C33] rounded-xl text-[#F2F5F4]"
                />
                <select
                  value={revTxId}
                  onChange={(e) => setRevTxId(e.target.value)}
                  className="w-full px-3 py-2 bg-[#0B0F10] border border-[#1F2C33] rounded-xl text-[#F2F5F4]"
                >
                  {reversibleTransactions.length === 0 && <option value="">No reversible completed transactions</option>}
                  {reversibleTransactions.slice(0, 100).map((t) => {
                    const inv = userById.get(t.userId);
                    return (
                      <option key={t.id} value={t.id}>
                        {t.reference} · {t.type.toUpperCase()} · {formatCentsEur(eurToCents(t.amount))} · {inv?.email || t.userId}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="p-3 rounded-xl bg-[#0B0F10] border border-[#1F2C33] space-y-1 tabular-nums">
                <div className="flex items-center justify-between">
                  <span className="text-[#8FA1A8]">Investor Current Balance</span>
                  <span className="font-bold text-[#6FD8B0]">{formatCentsEur(eurToCents(revInvestor?.walletBalance ?? 0))}</span>
                </div>
                {selectedRevTx && (
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-[#8FA1A8]">Reversal Wallet Impact</span>
                    <span className="font-mono font-semibold text-[#F2F5F4]">
                      {getReversalDeltaCents(selectedRevTx) >= 0 ? '+' : ''}
                      {formatCentsEur(getReversalDeltaCents(selectedRevTx))}
                    </span>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-[#B6C4C9] font-semibold mb-1">Required Reversal Reason</label>
                <input
                  type="text"
                  required
                  minLength={3}
                  value={revReason}
                  onChange={(e) => setRevReason(e.target.value)}
                  placeholder="e.g. Duplicate wire booked in error"
                  className="w-full px-3 py-2 bg-[#0B0F10] border border-[#1F2C33] rounded-xl text-[#F2F5F4]"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={!selectedRevTx}
              className="w-full py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold cursor-pointer disabled:opacity-40"
            >
              Review &amp; Reverse Transaction
            </button>
          </form>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 5: INVESTMENTS & DISTRIBUTIONS                                    */}
      {/* ===================================================================== */}
      {activeTab === 'investments' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Record Investment Form (record_investment) */}
            <form
              onSubmit={handleOpenRecordInvestmentConfirm}
              className="lg:col-span-5 bg-[#121A1F] border border-[#1F2C33] rounded-2xl p-5 space-y-4"
            >
              <div className="flex items-center gap-2 pb-2 border-b border-[#1F2C33]">
                <Briefcase className="w-4 h-4 text-[#6FD8B0]" />
                <h2 className="text-sm font-bold text-[#F2F5F4]">Record Investment</h2>
              </div>
              <div className="space-y-3 text-xs">
                <div>
                  <label className="block text-[#B6C4C9] font-semibold mb-1">Investor</label>
                  <select
                    value={invUserId}
                    onChange={(e) => setInvUserId(e.target.value)}
                    className="w-full px-3 py-2 bg-[#0B0F10] border border-[#1F2C33] rounded-xl text-[#F2F5F4]"
                  >
                    {selectableUsers.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.fullName || u.email} ({formatCentsEur(eurToCents(u.walletBalance))} cash)
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[#B6C4C9] font-semibold mb-1">Property</label>
                  <select
                    value={invPropId}
                    onChange={(e) => setInvPropId(e.target.value)}
                    className="w-full px-3 py-2 bg-[#0B0F10] border border-[#1F2C33] rounded-xl text-[#F2F5F4]"
                  >
                    {properties.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.title} ({formatCentsEur(eurToCents(p.tokenPrice))} / share)
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[#B6C4C9] font-semibold mb-1">Shares</label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={invShares}
                    onChange={(e) => setInvShares(Math.max(1, Math.floor(Number(e.target.value) || 1)))}
                    className="w-full px-3 py-2 bg-[#0B0F10] border border-[#1F2C33] rounded-xl font-mono text-[#F2F5F4]"
                  />
                </div>
                <div className="p-3 rounded-xl bg-[#0B0F10] border border-[#1F2C33] flex items-center justify-between tabular-nums">
                  <span className="text-[#8FA1A8]">Allocation Cost</span>
                  <span className="font-bold text-[#6FD8B0]">{formatCentsEur(calculatedInvCostCents)}</span>
                </div>
              </div>
              <button
                type="submit"
                disabled={recordingInv || calculatedInvCostCents <= 0}
                className="w-full py-2.5 rounded-xl bg-[#6FD8B0] hover:bg-[#5ec8a0] text-[#0B0F10] text-xs font-bold cursor-pointer disabled:opacity-50"
              >
                {recordingInv ? 'Recording...' : 'Review & Record Investment'}
              </button>
            </form>

            {/* Pay Distribution Form (pay_distribution w/ confirmation preview modal) */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!activeDistProp?.id || eurToCents(distAmountEur) <= 0) {
                  onError('Select a property and enter a positive distribution total.');
                  return;
                }
                setDistPreviewModalOpen(true);
              }}
              className="lg:col-span-7 bg-[#121A1F] border border-[#1F2C33] rounded-2xl p-5 space-y-4"
            >
              <div className="flex items-center justify-between pb-2 border-b border-[#1F2C33]">
                <div className="flex items-center gap-2">
                  <Coins className="w-4 h-4 text-[#6FD8B0]" />
                  <h2 className="text-sm font-bold text-[#F2F5F4]">Pay Distribution</h2>
                </div>
                <span className="text-xs text-[#8FA1A8] tabular-nums">
                  {distPreview.rows.length} holder(s) · {distPreview.totalShares.toLocaleString()} shares
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <label className="block text-[#B6C4C9] font-semibold mb-1">Property</label>
                  <select
                    value={activeDistProp?.id || ''}
                    onChange={(e) => setDistPropId(e.target.value)}
                    className="w-full px-3 py-2 bg-[#0B0F10] border border-[#1F2C33] rounded-xl text-[#F2F5F4]"
                  >
                    {properties.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.title}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[#B6C4C9] font-semibold mb-1">Total Payout (EUR)</label>
                  <input
                    type="number"
                    min={1}
                    step="0.01"
                    required
                    value={distAmountEur}
                    onChange={(e) => setDistAmountEur(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-[#0B0F10] border border-[#1F2C33] rounded-xl font-mono text-[#F2F5F4]"
                  />
                </div>
                <div>
                  <label className="block text-[#B6C4C9] font-semibold mb-1">Distribution Note</label>
                  <input
                    type="text"
                    value={distNote}
                    onChange={(e) => setDistNote(e.target.value)}
                    placeholder="Q4 Rental Dividend"
                    className="w-full px-3 py-2 bg-[#0B0F10] border border-[#1F2C33] rounded-xl text-[#F2F5F4]"
                  />
                </div>
              </div>

              <div className="bg-[#0B0F10] border border-[#1F2C33] rounded-xl overflow-hidden max-h-56 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#1F2C33] text-[11px] text-[#8FA1A8] uppercase">
                      <th className="py-2 px-3">Investor</th>
                      <th className="py-2 px-3 text-right">Shares</th>
                      <th className="py-2 px-3 text-right">Share %</th>
                      <th className="py-2 px-3 text-right">Estimated Payout</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1F2C33]">
                    {distPreview.rows.map((r) => (
                      <tr key={r.userId}>
                        <td className="py-2 px-3 text-[#F2F5F4]">{r.email}</td>
                        <td className="py-2 px-3 text-right font-mono tabular-nums">{r.shares.toLocaleString()}</td>
                        <td className="py-2 px-3 text-right font-mono text-[#B6C4C9] tabular-nums">{r.pct.toFixed(2)}%</td>
                        <td className="py-2 px-3 text-right font-bold text-[#6FD8B0] tabular-nums">{formatCentsEur(r.payoutCents)}</td>
                      </tr>
                    ))}
                    {distPreview.rows.length === 0 && (
                      <tr>
                        <td colSpan={4} className="py-6 text-center text-[#8FA1A8]">
                          No active holders on this property yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <button
                type="submit"
                disabled={distPreview.rows.length === 0 || eurToCents(distAmountEur) <= 0}
                className="w-full py-2.5 rounded-xl bg-[#6FD8B0] hover:bg-[#5ec8a0] text-[#0B0F10] text-xs font-bold cursor-pointer disabled:opacity-50"
              >
                Preview Per-Investor Payout &amp; Confirm
              </button>
            </form>
          </div>

          {/* Capital Allocated by Property + Past Distributions */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-[#121A1F] border border-[#1F2C33] rounded-2xl overflow-hidden">
              <div className="p-4 bg-[#0B0F10] border-b border-[#1F2C33] flex items-center justify-between">
                <h3 className="text-sm font-bold text-[#F2F5F4]">Shareholdings by Property</h3>
                <TrendingUp className="w-4 h-4 text-[#6FD8B0]" />
              </div>
              <div className="divide-y divide-[#1F2C33] text-xs">
                {normalizedInvestmentsByProperty.map((g) => (
                  <div key={g.propertyId} className="px-4 py-3 flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-[#F2F5F4]">{g.propertyTitle}</div>
                      <div className="text-[11px] text-[#8FA1A8] tabular-nums">
                        {g.holders} allocation(s) · {g.totalShares.toLocaleString()} shares
                      </div>
                    </div>
                    <span className="font-bold text-[#6FD8B0] tabular-nums">{formatCentsEur(eurToCents(g.totalCost))}</span>
                  </div>
                ))}
                {normalizedInvestmentsByProperty.length === 0 && (
                  <div className="p-8 text-center text-xs text-[#8FA1A8]">No investments recorded yet.</div>
                )}
              </div>
            </div>

            <div className="bg-[#121A1F] border border-[#1F2C33] rounded-2xl overflow-hidden">
              <div className="p-4 bg-[#0B0F10] border-b border-[#1F2C33]">
                <h3 className="text-sm font-bold text-[#F2F5F4]">Recent Distributions</h3>
              </div>
              <div className="divide-y divide-[#1F2C33] text-xs">
                {(pastDistributions.length > 0
                  ? pastDistributions.map((d) => ({
                      id: d.id,
                      title: propById.get(d.propertyId)?.title || d.propertyId,
                      note: d.note || 'Distribution',
                      amount: d.totalEur,
                      createdAt: d.createdAt,
                    }))
                  : transactions
                      .filter((t) => ['dividend', 'distribution', 'yield'].includes(String(t.type).toLowerCase()))
                      .map((t) => ({
                        id: t.id,
                        title: propById.get(t.propertyId)?.title || 'Property Distribution',
                        note: t.description || t.reference,
                        amount: centsToEur(eurToCents(t.amount)),
                        createdAt: t.createdAt,
                      }))
                )
                  .slice(0, 10)
                  .map((item) => (
                    <div key={item.id} className="px-4 py-3 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-semibold text-[#F2F5F4] truncate">{item.title}</div>
                        <div className="text-[11px] text-[#8FA1A8] truncate">
                          {formatDate(item.createdAt)} · {item.note}
                        </div>
                      </div>
                      <span className="font-bold text-[#6FD8B0] tabular-nums shrink-0">{formatCentsEur(eurToCents(item.amount))}</span>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 6: LEDGER                                                         */}
      {/* ===================================================================== */}
      {activeTab === 'ledger' && (
        <div className="space-y-4">
          <div className="bg-[#121A1F] p-4 rounded-2xl border border-[#1F2C33] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 text-xs">
            <div className="lg:col-span-2 relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#8FA1A8]" />
              <input
                type="text"
                value={ledgerSearch}
                onChange={(e) => {
                  setLedgerSearch(e.target.value);
                  setLedgerPage(1);
                }}
                placeholder="Search reference, investor, processor..."
                className="w-full pl-9 pr-3 py-2 bg-[#0B0F10] border border-[#1F2C33] rounded-xl text-[#F2F5F4]"
              />
            </div>

            <select
              value={ledgerInvestorFilter}
              onChange={(e) => {
                setLedgerInvestorFilter(e.target.value);
                setLedgerPage(1);
              }}
              className="px-3 py-2 bg-[#0B0F10] border border-[#1F2C33] rounded-xl text-[#F2F5F4]"
            >
              <option value="all">All Investors</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.fullName || u.email}
                </option>
              ))}
            </select>

            <select
              value={ledgerKindFilter}
              onChange={(e) => {
                setLedgerKindFilter(e.target.value);
                setLedgerPage(1);
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
              value={ledgerStatusFilter}
              onChange={(e) => {
                setLedgerStatusFilter(e.target.value);
                setLedgerPage(1);
              }}
              className="px-3 py-2 bg-[#0B0F10] border border-[#1F2C33] rounded-xl text-[#F2F5F4]"
            >
              <option value="all">All Statuses</option>
              <option value="completed">completed</option>
              <option value="pending">pending</option>
              <option value="failed">failed</option>
              <option value="rejected">rejected</option>
            </select>

            <button
              type="button"
              onClick={() =>
                triggerCsvDownload(
                  `lagence-finance-ledger-${new Date().toISOString().slice(0, 10)}.csv`,
                  [
                    'Timestamp',
                    'Reference',
                    'Investor Email',
                    'Kind',
                    'Amount EUR',
                    'Fee EUR',
                    'Net EUR',
                    'Status',
                    'Payout Ref',
                    'Processed By',
                    'Processed At',
                    'Reversal Link',
                    'Notes',
                  ],
                  filteredLedger.map((t) => [
                    t.createdAt,
                    t.reference,
                    userById.get(t.userId)?.email || t.userEmail || t.userId,
                    t.type,
                    centsToEur(eurToCents(t.amount)).toFixed(2),
                    centsToEur(eurToCents(t.feeAmount ?? 0)).toFixed(2),
                    centsToEur(eurToCents(t.netAmount ?? t.amount)).toFixed(2),
                    t.status,
                    t.payoutReference || '',
                    t.processedBy || '',
                    t.processedAt || '',
                    t.reversalOfReference
                      ? `Reverses ${t.reversalOfReference}`
                      : t.reversedByReference
                      ? `Reversed by ${t.reversedByReference}`
                      : '',
                    t.description || '',
                  ])
                )
              }
              className="px-3 py-2 rounded-xl bg-[#0B0F10] border border-[#1F2C33] hover:border-[#6FD8B0] text-xs font-semibold text-[#F2F5F4] inline-flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-[#6FD8B0]" />
              <span>Export CSV</span>
            </button>

            <div className="sm:col-span-2 lg:col-span-6 flex flex-wrap items-center gap-3 pt-1">
              <span className="text-[#8FA1A8]">Date Range:</span>
              <input
                type="date"
                value={ledgerFromDate}
                onChange={(e) => {
                  setLedgerFromDate(e.target.value);
                  setLedgerPage(1);
                }}
                className="px-3 py-1.5 bg-[#0B0F10] border border-[#1F2C33] rounded-xl text-[#F2F5F4]"
              />
              <span className="text-[#8FA1A8]">to</span>
              <input
                type="date"
                value={ledgerToDate}
                onChange={(e) => {
                  setLedgerToDate(e.target.value);
                  setLedgerPage(1);
                }}
                className="px-3 py-1.5 bg-[#0B0F10] border border-[#1F2C33] rounded-xl text-[#F2F5F4]"
              />
              {(ledgerInvestorFilter !== 'all' ||
                ledgerKindFilter !== 'all' ||
                ledgerStatusFilter !== 'all' ||
                ledgerFromDate ||
                ledgerToDate ||
                ledgerSearch) && (
                <button
                  type="button"
                  onClick={() => {
                    setLedgerInvestorFilter('all');
                    setLedgerKindFilter('all');
                    setLedgerStatusFilter('all');
                    setLedgerFromDate('');
                    setLedgerToDate('');
                    setLedgerSearch('');
                    setHighlightedTxId(null);
                  }}
                  className="text-[#6FD8B0] font-semibold hover:underline cursor-pointer"
                >
                  Reset Filters
                </button>
              )}
            </div>
          </div>

          <div className="bg-[#121A1F] rounded-2xl border border-[#1F2C33] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-[#0B0F10] border-b border-[#1F2C33] text-[11px] font-semibold text-[#8FA1A8] uppercase tracking-wider">
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Reference</th>
                    <th className="py-3 px-4">Investor</th>
                    <th className="py-3 px-4">Kind</th>
                    <th className="py-3 px-4 text-right">Amount</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Processed By &amp; When</th>
                    <th className="py-3 px-4">Reversal Link</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1F2C33]">
                  {paginatedLedger.map((tx) => {
                    const inv = userById.get(tx.userId);
                    const originalTarget = tx.reversalOfId ? txById.get(tx.reversalOfId) : undefined;
                    const reversalTarget = tx.reversedById ? txById.get(tx.reversedById) : undefined;
                    const highlighted = highlightedTxId === tx.id;
                    return (
                      <tr
                        key={tx.id}
                        className={`transition-colors ${
                          highlighted ? 'bg-[#6FD8B0]/15' : 'hover:bg-[#162026]'
                        }`}
                      >
                        <td className="py-3 px-4 text-[#B6C4C9] whitespace-nowrap">{formatDate(tx.createdAt)}</td>
                        <td className="py-3 px-4 font-mono text-[#F2F5F4]">{tx.reference}</td>
                        <td className="py-3 px-4 text-[#B6C4C9]">{inv?.email || tx.userEmail || tx.userId}</td>
                        <td className="py-3 px-4 uppercase text-[11px] font-semibold text-[#F2F5F4]">{tx.type}</td>
                        <td className="py-3 px-4 text-right font-bold text-[#6FD8B0] tabular-nums">
                          {formatCentsEur(eurToCents(tx.amount))}
                          {eurToCents(tx.feeAmount || 0) > 0 && (
                            <div className="text-[10px] font-normal text-[#8FA1A8]">
                              Fee {formatCentsEur(eurToCents(tx.feeAmount))}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`font-semibold uppercase text-[11px] ${
                              ['completed', 'approved', 'paid'].includes(tx.status)
                                ? 'text-[#6FD8B0]'
                                : tx.status === 'pending'
                                ? 'text-amber-400'
                                : 'text-rose-400'
                            }`}
                          >
                            {tx.status}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          {tx.processedBy || tx.processedAt ? (
                            <div>
                              <div className="text-[#F2F5F4] font-medium">{tx.processedBy || 'System'}</div>
                              {tx.processedAt && (
                                <div className="text-[11px] text-[#8FA1A8]">{formatDate(tx.processedAt)}</div>
                              )}
                            </div>
                          ) : (
                            <span className="text-[#8FA1A8]">—</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          {tx.reversalOfId ? (
                            <button
                              type="button"
                              onClick={() => focusLinkedTransaction(tx.reversalOfId)}
                              className="inline-flex items-center gap-1 text-[11px] font-mono text-amber-300 hover:underline cursor-pointer"
                            >
                              <Link2 className="w-3 h-3 shrink-0" />
                              <span>Orig: {tx.reversalOfReference || originalTarget?.reference || tx.reversalOfId}</span>
                            </button>
                          ) : tx.reversedById ? (
                            <button
                              type="button"
                              onClick={() => focusLinkedTransaction(tx.reversedById)}
                              className="inline-flex items-center gap-1 text-[11px] font-mono text-rose-300 hover:underline cursor-pointer"
                            >
                              <Link2 className="w-3 h-3 shrink-0" />
                              <span>Rev: {tx.reversedByReference || reversalTarget?.reference || tx.reversedById}</span>
                            </button>
                          ) : (
                            <span className="text-[#8FA1A8]">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {paginatedLedger.length === 0 && (
                    <tr>
                      <td colSpan={8} className="py-10 text-center text-xs text-[#8FA1A8]">
                        No matching ledger entries found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {filteredLedger.length > ledgerPageSize && (
              <div className="px-4 py-3 bg-[#0B0F10] border-t border-[#1F2C33] flex items-center justify-between text-xs text-[#8FA1A8]">
                <span>
                  Page {safeLedgerPage} of {ledgerTotalPages} ({filteredLedger.length} entries)
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={safeLedgerPage <= 1}
                    onClick={() => setLedgerPage((p) => Math.max(1, p - 1))}
                    className="px-3 py-1 rounded-lg bg-[#121A1F] border border-[#1F2C33] text-[#F2F5F4] disabled:opacity-40 cursor-pointer"
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    disabled={safeLedgerPage >= ledgerTotalPages}
                    onClick={() => setLedgerPage((p) => Math.min(ledgerTotalPages, p + 1))}
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

      {/* ===================================================================== */}
      {/* TAB 7: GATES (Manage payment gates + Assign to investors)             */}
      {/* ===================================================================== */}
      {activeTab === 'gates' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <p className="text-xs text-[#8FA1A8]">
              Configure treasury payment gates and assign each investor to their settlement rail. Gates assigned to investors cannot be deleted.
            </p>
            <button
              type="button"
              onClick={openAddGate}
              className="whitespace-nowrap px-4 py-2 rounded-xl bg-[#6FD8B0] hover:bg-[#5ec8a0] text-[#0B0F10] text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
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
                      <Landmark className="w-4 h-4 text-[#6FD8B0]" />
                      <h3 className="text-sm font-bold text-[#F2F5F4]">{g.name}</h3>
                    </div>
                    <div className="text-[11px] text-[#8FA1A8] mt-0.5 tabular-nums">
                      Method: <span className="font-mono text-[#B6C4C9]">{g.method === 'usdt' ? 'USDT' : 'Bank transfer (SEPA)'}</span>{g.method === 'usdt' && g.network ? <> · Network: <span className="font-mono text-[#B6C4C9]">{g.network}</span></> : null} · Assigned to{' '}
                      <strong className="text-[#F2F5F4]">{g.assignedCount}</strong> investor(s)
                    </div>
                  </div>
                  <span
                    className={`text-[11px] font-bold uppercase ${
                      g.active ? 'text-[#6FD8B0]' : 'text-[#8FA1A8]'
                    }`}
                  >
                    {g.active ? 'Active' : 'Inactive'}
                  </span>
                </div>

                {g.method === 'usdt' && g.walletAddress ? <div className="bg-[#0B0F10] border border-[#1F2C33] rounded-xl p-3 space-y-2 text-xs"><div className="text-[#8FA1A8]">Receiving wallet</div><div className="font-mono text-[#F2F5F4] break-all">{g.walletAddress}</div></div> : null}
                {g.method === 'bank' && g.details.length > 0 && (
                  <div className="bg-[#0B0F10] border border-[#1F2C33] rounded-xl p-3 space-y-1.5 text-xs">
                    {g.details.map((row, idx) => (
                      <div key={`${row.label}-${idx}`} className="flex items-center justify-between gap-2">
                        <span className="text-[#8FA1A8]">{row.label}</span>
                        <span className="font-mono text-[#F2F5F4] text-right break-all">{row.value}</span>
                      </div>
                    ))}
                  </div>
                )}

                {g.instructions && <p className="text-xs text-[#B6C4C9]">{g.instructions}</p>}

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

          {/* Investor Gate Assignment Table */}
          <div className="bg-[#121A1F] border border-[#1F2C33] rounded-2xl overflow-hidden">
            <div className="p-4 bg-[#0B0F10] border-b border-[#1F2C33] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-[#F2F5F4]">Assign Payment Gates to Investors</h3>
                <p className="text-[11px] text-[#8FA1A8]">Each investor can have one active Bank gate and one active USDT gate. Assignments are independent.</p>
              </div>
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#8FA1A8]" />
                <input
                  type="text"
                  value={assignSearch}
                  onChange={(e) => setAssignSearch(e.target.value)}
                  placeholder="Search investor..."
                  className="pl-8 pr-3 py-1.5 bg-[#121A1F] border border-[#1F2C33] rounded-xl text-xs text-[#F2F5F4]"
                />
              </div>
            </div>
            <div className="p-4 border-b border-[#1F2C33] grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="flex items-center gap-2">
                <select
                  value={bulkBankGateId}
                  onChange={(e) => setBulkBankGateId(e.target.value)}
                  className="min-w-0 flex-1 px-3 py-2 bg-[#0B0F10] border border-[#1F2C33] rounded-xl text-xs text-[#F2F5F4]"
                >
                  <option value="">Clear Bank gate for selected</option>
                  {paymentGates.filter((g) => g.active && g.method === 'bank').map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
                <button type="button" disabled={!selectedAssignUserIds.length || assignBusyUid !== null} onClick={() => handleBulkAssignGate('bank')} className="px-3 py-2 rounded-xl bg-[#1B765D] text-white text-xs disabled:opacity-50">Apply to {selectedAssignUserIds.length}</button>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={bulkUsdtGateId}
                  onChange={(e) => setBulkUsdtGateId(e.target.value)}
                  className="min-w-0 flex-1 px-3 py-2 bg-[#0B0F10] border border-[#1F2C33] rounded-xl text-xs text-[#F2F5F4]"
                >
                  <option value="">Clear USDT gate for selected</option>
                  {paymentGates.filter((g) => g.active && g.method === 'usdt').map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
                <button type="button" disabled={!selectedAssignUserIds.length || assignBusyUid !== null} onClick={() => handleBulkAssignGate('usdt')} className="px-3 py-2 rounded-xl bg-[#1B765D] text-white text-xs disabled:opacity-50">Apply to {selectedAssignUserIds.length}</button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#1F2C33] text-[11px] text-[#8FA1A8] uppercase">
                    <th className="py-3 px-4">
                      <input
                        type="checkbox"
                        aria-label="Select visible investors"
                        checked={filteredAssignInvestors.slice(0, 50).length > 0 && filteredAssignInvestors.slice(0, 50).every((u) => selectedAssignUserIds.includes(u.id))}
                        onChange={(e) => setSelectedAssignUserIds(e.target.checked
                          ? Array.from(new Set([...selectedAssignUserIds, ...filteredAssignInvestors.slice(0, 50).map((u) => u.id)]))
                          : selectedAssignUserIds.filter((id) => !filteredAssignInvestors.slice(0, 50).some((u) => u.id === id)))}
                      />
                    </th>
                    <th className="py-3 px-4">Investor</th>
                    <th className="py-3 px-4">Bank gate</th>
                    <th className="py-3 px-4">USDT gate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1F2C33]">
                  {filteredAssignInvestors.slice(0, 50).map((inv) => {
                    const assignedBank = inv.assignedGateId || '';
                    const assignedUsdt = inv.assignedUsdtGateId || '';
                    return (
                      <tr key={inv.id} className="hover:bg-[#162026]">
                        <td className="py-3 px-4">
                          <input
                            type="checkbox"
                            aria-label={`Select ${inv.fullName || inv.email}`}
                            checked={selectedAssignUserIds.includes(inv.id)}
                            onChange={(e) => setSelectedAssignUserIds(e.target.checked
                              ? [...selectedAssignUserIds, inv.id]
                              : selectedAssignUserIds.filter((id) => id !== inv.id))}
                          />
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-semibold text-[#F2F5F4]">{inv.fullName || inv.email}</div>
                          <div className="text-[11px] text-[#8FA1A8]">{inv.email}</div>
                          {!assignedBank && !assignedUsdt && <div className="mt-1 text-[11px] text-amber-300">No payment option assigned</div>}
                        </td>
                        <td className="py-3 px-4">
                          <select
                            aria-label={`Bank gate for ${inv.email}`}
                            disabled={assignBusyUid !== null}
                            value={assignedBank}
                            onChange={(e) => handleAssignGateToInvestor(inv.id, 'bank', e.target.value)}
                            className="max-w-[220px] px-3 py-1.5 bg-[#0B0F10] border border-[#1F2C33] rounded-xl text-xs text-[#F2F5F4]"
                          >
                            <option value="">No Bank gate</option>
                            {paymentGates.filter((g) => g.active && g.method === 'bank').map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
                          </select>
                        </td>
                        <td className="py-3 px-4">
                          <select
                            aria-label={`USDT gate for ${inv.email}`}
                            disabled={assignBusyUid !== null}
                            value={assignedUsdt}
                            onChange={(e) => handleAssignGateToInvestor(inv.id, 'usdt', e.target.value)}
                            className="max-w-[220px] px-3 py-1.5 bg-[#0B0F10] border border-[#1F2C33] rounded-xl text-xs text-[#F2F5F4]"
                          >
                            <option value="">No USDT gate</option>
                            {paymentGates.filter((g) => g.active && g.method === 'usdt').map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
                          </select>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODALS                                                                */}
      {/* ===================================================================== */}

      {/* Approve Deposit Modal */}
      {approveDepTarget && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <form onSubmit={handleConfirmApproveDeposit} className="bg-[#121A1F] border border-[#1F2C33] rounded-2xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-sm font-bold text-[#F2F5F4]">Confirm Deposit Approval</h3>
            <div className="bg-[#0B0F10] border border-[#1F2C33] rounded-xl p-3 text-xs text-[#B6C4C9] space-y-1.5 tabular-nums">
              <div>Action: <strong className="text-[#6FD8B0]">Approve Deposit (approve_deposit)</strong></div>
              <div>Investor: <strong className="text-[#F2F5F4]">{approveDepTarget.investorName} ({approveDepTarget.investorEmail})</strong></div>
              <div>Reference: <strong className="font-mono text-[#F2F5F4]">{approveDepTarget.reference}</strong></div>
              <div>Requested: <strong className="text-[#F2F5F4]">{formatCentsEur(eurToCents(approveDepTarget.amount))}</strong></div>
              <div>Amount to Credit: <strong className="text-[#6FD8B0]">{formatCentsEur(eurToCents(receivedAmount))}</strong></div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#B6C4C9] mb-1">Amount actually received (EUR)</label>
              <input
                type="number"
                min={0.01}
                step="0.01"
                required
                disabled={Boolean(depBusyId)}
                value={receivedAmount}
                onChange={(e) => setReceivedAmount(e.target.value)}
                className="w-full px-3 py-2 bg-[#0B0F10] border border-[#1F2C33] rounded-xl font-mono text-sm text-[#6FD8B0] font-bold"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={Boolean(depBusyId)}
                onClick={() => setApproveDepTarget(null)}
                className="px-4 py-2 rounded-xl bg-[#0B0F10] border border-[#1F2C33] text-xs font-semibold text-[#B6C4C9] cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={Boolean(depBusyId) || eurToCents(receivedAmount) <= 0}
                className="px-4 py-2 rounded-xl bg-[#6FD8B0] text-[#0B0F10] text-xs font-bold cursor-pointer disabled:opacity-50"
              >
                {depBusyId ? 'Approving...' : 'Confirm & Credit'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Reject Deposit Modal */}
      {rejectDepTarget && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <form onSubmit={handleConfirmRejectDeposit} className="bg-[#121A1F] border border-[#1F2C33] rounded-2xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-sm font-bold text-[#F2F5F4]">Confirm Deposit Rejection</h3>
            <div className="bg-[#0B0F10] border border-[#1F2C33] rounded-xl p-3 text-xs text-[#B6C4C9] space-y-1.5 tabular-nums">
              <div>Action: <strong className="text-rose-400">Reject Deposit (reject_deposit)</strong></div>
              <div>Investor: <strong className="text-[#F2F5F4]">{rejectDepTarget.investorName} ({rejectDepTarget.investorEmail})</strong></div>
              <div>Reference: <strong className="font-mono text-[#F2F5F4]">{rejectDepTarget.reference}</strong></div>
              <div>Amount: <strong className="text-[#F2F5F4]">{formatCentsEur(eurToCents(rejectDepTarget.amount))}</strong></div>
            </div>
            <textarea
              rows={3}
              required
              disabled={Boolean(depBusyId)}
              value={rejectDepReason}
              onChange={(e) => setRejectDepReason(e.target.value)}
              placeholder="e.g. Wire transfer not received or reference mismatch..."
              className="w-full p-3 bg-[#0B0F10] border border-[#1F2C33] rounded-xl text-xs text-[#F2F5F4]"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                disabled={Boolean(depBusyId)}
                onClick={() => setRejectDepTarget(null)}
                className="px-4 py-2 rounded-xl bg-[#0B0F10] border border-[#1F2C33] text-xs font-semibold text-[#B6C4C9] cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={Boolean(depBusyId)}
                className="px-4 py-2 rounded-xl bg-rose-600 text-white text-xs font-bold cursor-pointer disabled:opacity-50"
              >
                {depBusyId ? 'Rejecting...' : 'Confirm Rejection'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Record Manual Deposit Modal (admin_credit_deposit) — 2-step confirmation */}
      {manualDepOpen && (() => {
        const targetInv = userById.get(manualDepUserId) || selectableUsers[0];
        const amtCents = eurToCents(manualDepAmount);
        const curCents = eurToCents(targetInv?.walletBalance ?? 0);
        const projCents = curCents + amtCents;
        return (
          <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
            <form onSubmit={handleRecordManualDeposit} className="bg-[#121A1F] border border-[#1F2C33] rounded-2xl max-w-md w-full p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-[#1F2C33] pb-3">
                <h3 className="text-sm font-bold text-[#F2F5F4]">
                  {manualDepConfirmStep ? 'Confirm Manual Deposit' : 'Record manual deposit'}
                </h3>
                <button
                  type="button"
                  disabled={manualDepBusy}
                  onClick={() => {
                    setManualDepOpen(false);
                    setManualDepConfirmStep(false);
                  }}
                  className="text-[#8FA1A8] cursor-pointer disabled:opacity-50"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {!manualDepConfirmStep ? (
                <div className="space-y-3 text-xs">
                  <div>
                    <label className="block text-[#B6C4C9] font-semibold mb-1">Investor</label>
                    <select
                      value={manualDepUserId}
                      onChange={(e) => setManualDepUserId(e.target.value)}
                      className="w-full px-3 py-2 bg-[#0B0F10] border border-[#1F2C33] rounded-xl text-[#F2F5F4]"
                    >
                      {selectableUsers.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.fullName || u.email} ({u.email}) — {formatCentsEur(eurToCents(u.walletBalance))}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[#B6C4C9] font-semibold mb-1">Amount (EUR)</label>
                    <input
                      type="number"
                      min={0.01}
                      step="0.01"
                      required
                      value={manualDepAmount}
                      onChange={(e) => setManualDepAmount(e.target.value)}
                      className="w-full px-3 py-2 bg-[#0B0F10] border border-[#1F2C33] rounded-xl font-mono text-[#F2F5F4]"
                    />
                  </div>
                  <div>
                    <label className="block text-[#B6C4C9] font-semibold mb-1">Note</label>
                    <input
                      type="text"
                      value={manualDepNote}
                      onChange={(e) => setManualDepNote(e.target.value)}
                      placeholder="Direct bank settlement note or wire ID"
                      className="w-full px-3 py-2 bg-[#0B0F10] border border-[#1F2C33] rounded-xl text-[#F2F5F4]"
                    />
                  </div>
                </div>
              ) : (
                <div className="bg-[#0B0F10] border border-[#1F2C33] rounded-xl p-3.5 text-xs text-[#B6C4C9] space-y-1.5 tabular-nums">
                  <div>Action: <strong className="text-[#6FD8B0]">Record Manual Deposit (admin_credit_deposit)</strong></div>
                  <div>Investor: <strong className="text-[#F2F5F4]">{targetInv?.fullName || targetInv?.email || manualDepUserId}</strong></div>
                  <div>Amount: <strong className="text-[#6FD8B0]">{formatCentsEur(amtCents)}</strong></div>
                  <div>Current Balance: <strong>{formatCentsEur(curCents)}</strong></div>
                  <div>Projected Balance: <strong className="text-[#F2F5F4]">{formatCentsEur(projCents)}</strong></div>
                  <div>Note: <span className="text-[#F2F5F4]">{manualDepNote.trim() || 'Admin manual credit deposit'}</span></div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                {manualDepConfirmStep ? (
                  <button
                    type="button"
                    disabled={manualDepBusy}
                    onClick={() => setManualDepConfirmStep(false)}
                    className="px-4 py-2 rounded-xl bg-[#0B0F10] border border-[#1F2C33] text-xs font-semibold text-[#B6C4C9] cursor-pointer disabled:opacity-50"
                  >
                    Back
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={manualDepBusy}
                    onClick={() => {
                      setManualDepOpen(false);
                      setManualDepConfirmStep(false);
                    }}
                    className="px-4 py-2 rounded-xl bg-[#0B0F10] border border-[#1F2C33] text-xs font-semibold text-[#B6C4C9] cursor-pointer disabled:opacity-50"
                  >
                    Cancel
                  </button>
                )}
                <button
                  type="submit"
                  disabled={manualDepBusy || amtCents <= 0}
                  className="px-4 py-2 rounded-xl bg-[#6FD8B0] text-[#0B0F10] text-xs font-bold cursor-pointer disabled:opacity-50"
                >
                  {manualDepBusy ? 'Crediting...' : manualDepConfirmStep ? 'Confirm & Credit Deposit' : 'Review Deposit'}
                </button>
              </div>
            </form>
          </div>
        );
      })()}

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

      {/* Approve Withdrawal Modal (payout_ref required, fee from settings.limits, You send: amount - fee) */}
      {approveWthTarget && (() => {
        const wthCents = eurToCents(approveWthTarget.tx.amount);
        const feeCents = Math.max(0, eurToCents(wthFeeInput));
        const sendCents = Math.max(0, wthCents - feeCents);
        return (
          <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
            <form onSubmit={handleConfirmApproveWithdrawal} className="bg-[#121A1F] border border-[#1F2C33] rounded-2xl max-w-md w-full p-6 space-y-4">
              <h3 className="text-sm font-bold text-[#F2F5F4]">Confirm Withdrawal Approval</h3>
              <div className="bg-[#0B0F10] border border-[#1F2C33] rounded-xl p-3 text-xs text-[#B6C4C9] space-y-1.5 tabular-nums">
                <div>Action: <strong className="text-[#6FD8B0]">Approve Withdrawal (approve_withdrawal)</strong></div>
                <div>Investor: <strong className="text-[#F2F5F4]">{approveWthTarget.inv?.fullName || approveWthTarget.inv?.email || approveWthTarget.tx.userId}</strong></div>
                <div className="flex items-center justify-between gap-2">
                  <span>Destination IBAN: <strong className="font-mono text-[#F2F5F4]">{approveWthTarget.iban}</strong></span>
                  <button
                    type="button"
                    onClick={() => handleCopyIban(`modal-${approveWthTarget.tx.id}`, approveWthTarget.iban)}
                    className="px-2 py-0.5 rounded bg-[#121A1F] border border-[#1F2C33] text-[#6FD8B0] text-[11px] font-semibold cursor-pointer"
                  >
                    {copiedIbanId === `modal-${approveWthTarget.tx.id}` ? 'Copied' : 'Copy'}
                  </button>
                </div>
                <div>Requested Amount: <strong className="text-[#F2F5F4]">{formatCentsEur(wthCents)}</strong></div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-[#B6C4C9] font-semibold mb-1">Withdrawal Fee (EUR)</label>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    disabled={Boolean(wthBusyId)}
                    value={wthFeeInput}
                    onChange={(e) => setWthFeeInput(e.target.value)}
                    className="w-full px-3 py-2 bg-[#0B0F10] border border-[#1F2C33] rounded-xl font-mono text-[#F2F5F4]"
                  />
                </div>
                <div className="p-2.5 rounded-xl bg-[#0B0F10] border border-[#1F2C33] flex flex-col justify-center">
                  <span className="text-[11px] text-[#8FA1A8]">You send (amount − fee)</span>
                  <span className="text-sm font-bold text-[#6FD8B0] tabular-nums">
                    {formatCentsEur(sendCents)}
                  </span>
                </div>
              </div>

              <div className="text-xs">
                <label className="block text-[#B6C4C9] font-semibold mb-1">Payout Reference (Bank Transfer ID) *</label>
                <input
                  type="text"
                  required
                  minLength={2}
                  disabled={Boolean(wthBusyId)}
                  value={wthPayoutRef}
                  onChange={(e) => setWthPayoutRef(e.target.value)}
                  placeholder="e.g. SEPA-20261116-94821"
                  className="w-full px-3 py-2 bg-[#0B0F10] border border-[#1F2C33] rounded-xl font-mono text-[#F2F5F4]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  disabled={Boolean(wthBusyId)}
                  onClick={() => setApproveWthTarget(null)}
                  className="px-4 py-2 rounded-xl bg-[#0B0F10] border border-[#1F2C33] text-xs font-semibold text-[#B6C4C9] cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={Boolean(wthBusyId)}
                  className="px-4 py-2 rounded-xl bg-[#6FD8B0] text-[#0B0F10] text-xs font-bold cursor-pointer disabled:opacity-50"
                >
                  {wthBusyId ? 'Approving...' : 'Approve & Mark Paid'}
                </button>
              </div>
            </form>
          </div>
        );
      })()}

      {/* Reject Withdrawal Modal */}
      {rejectWthTarget && (() => {
        const wthInv = userById.get(rejectWthTarget.userId);
        return (
          <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
            <form onSubmit={handleConfirmRejectWithdrawal} className="bg-[#121A1F] border border-[#1F2C33] rounded-2xl max-w-md w-full p-6 space-y-4">
              <h3 className="text-sm font-bold text-[#F2F5F4]">Confirm Withdrawal Rejection</h3>
              <div className="bg-[#0B0F10] border border-[#1F2C33] rounded-xl p-3 text-xs text-[#B6C4C9] space-y-1.5 tabular-nums">
                <div>Action: <strong className="text-rose-400">Reject Withdrawal &amp; Refund (reject_withdrawal)</strong></div>
                <div>Investor: <strong className="text-[#F2F5F4]">{wthInv?.fullName || wthInv?.email || rejectWthTarget.userId}</strong></div>
                <div>Reference: <strong className="font-mono text-[#F2F5F4]">{rejectWthTarget.reference || rejectWthTarget.id}</strong></div>
                <div>Refund Amount: <strong className="text-[#6FD8B0]">{formatCentsEur(eurToCents(rejectWthTarget.amount))}</strong></div>
              </div>
              <textarea
                rows={3}
                required
                disabled={Boolean(wthBusyId)}
                value={rejectWthReason}
                onChange={(e) => setRejectWthReason(e.target.value)}
                placeholder="e.g. Beneficiary IBAN mismatch..."
                className="w-full p-3 bg-[#0B0F10] border border-[#1F2C33] rounded-xl text-xs text-[#F2F5F4]"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  disabled={Boolean(wthBusyId)}
                  onClick={() => setRejectWthTarget(null)}
                  className="px-4 py-2 rounded-xl bg-[#0B0F10] border border-[#1F2C33] text-xs font-semibold text-[#B6C4C9] cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={Boolean(wthBusyId)}
                  className="px-4 py-2 rounded-xl bg-rose-600 text-white text-xs font-bold cursor-pointer disabled:opacity-50"
                >
                  {wthBusyId ? 'Rejecting...' : 'Confirm Rejection'}
                </button>
              </div>
            </form>
          </div>
        );
      })()}

      {/* Confirm Charge Fee Modal */}
      {feeConfirmOpen && (() => {
        const feeCents = eurToCents(feeAmount);
        const curCents = eurToCents(feeInvestor?.walletBalance ?? 0);
        const projCents = curCents - feeCents;
        return (
          <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-[#121A1F] border border-[#1F2C33] rounded-2xl max-w-md w-full p-6 space-y-4">
              <h3 className="text-sm font-bold text-[#F2F5F4] flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <span>Confirm Fee Charge</span>
              </h3>
              <div className="bg-[#0B0F10] border border-[#1F2C33] rounded-xl p-3 text-xs text-[#B6C4C9] space-y-1.5 tabular-nums">
                <div>Action: <strong className="text-[#6FD8B0]">Charge Fee (admin_charge_fee)</strong></div>
                <div>Investor: <strong className="text-[#F2F5F4]">{feeInvestor?.fullName || feeInvestor?.email} ({feeInvestor?.email})</strong></div>
                <div>Fee Amount: <strong className="text-rose-300">−{formatCentsEur(feeCents)}</strong></div>
                <div>Current Balance: <strong>{formatCentsEur(curCents)}</strong></div>
                <div>Projected Balance: <strong className="text-[#6FD8B0]">{formatCentsEur(projCents)}</strong></div>
                <div>Reason: <span className="text-[#F2F5F4]">{feeReason || 'Platform Fee Assessment'}</span></div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" disabled={correctionBusy} onClick={() => setFeeConfirmOpen(false)} className="px-4 py-2 rounded-xl bg-[#0B0F10] border border-[#1F2C33] text-xs font-semibold text-[#B6C4C9] cursor-pointer disabled:opacity-50">
                  Cancel
                </button>
                <button type="button" disabled={correctionBusy} onClick={handleConfirmChargeFee} className="px-4 py-2 rounded-xl bg-[#6FD8B0] text-[#0B0F10] text-xs font-bold cursor-pointer disabled:opacity-50">
                  {correctionBusy ? 'Charging...' : 'Confirm Fee'}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Confirm Adjust Balance Modal */}
      {adjConfirmOpen && (() => {
        const rawCents = eurToCents(adjAmount);
        const deltaCents = adjDirection === 'credit' ? rawCents : -rawCents;
        const curCents = eurToCents(adjInvestor?.walletBalance ?? 0);
        const projectedCents = curCents + deltaCents;
        return (
          <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-[#121A1F] border border-[#1F2C33] rounded-2xl max-w-md w-full p-6 space-y-4">
              <h3 className="text-sm font-bold text-[#F2F5F4] flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <span>Confirm Balance Adjustment</span>
              </h3>
              <div className="bg-[#0B0F10] border border-[#1F2C33] rounded-xl p-3 text-xs text-[#B6C4C9] space-y-1.5 tabular-nums">
                <div>Action: <strong className="text-[#6FD8B0]">Adjust Balance ({adjDirection === 'credit' ? 'Credit' : 'Debit'} via admin_adjust)</strong></div>
                <div>Investor: <strong className="text-[#F2F5F4]">{adjInvestor?.fullName || adjInvestor?.email} ({adjInvestor?.email})</strong></div>
                <div>
                  Amount:{' '}
                  <strong className={deltaCents >= 0 ? 'text-[#6FD8B0]' : 'text-rose-300'}>
                    {deltaCents >= 0 ? '+' : ''}
                    {formatCentsEur(deltaCents)}
                  </strong>
                </div>
                <div>Current Balance: <strong>{formatCentsEur(curCents)}</strong></div>
                <div>Projected Balance: <strong className="text-[#F2F5F4]">{formatCentsEur(projectedCents)}</strong></div>
                <div>Reason: <span className="text-[#F2F5F4]">{adjReason}</span></div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" disabled={correctionBusy} onClick={() => setAdjConfirmOpen(false)} className="px-4 py-2 rounded-xl bg-[#0B0F10] border border-[#1F2C33] text-xs font-semibold text-[#B6C4C9] cursor-pointer disabled:opacity-50">
                  Cancel
                </button>
                <button type="button" disabled={correctionBusy} onClick={handleConfirmAdjust} className="px-4 py-2 rounded-xl bg-[#6FD8B0] text-[#0B0F10] text-xs font-bold cursor-pointer disabled:opacity-50">
                  {correctionBusy ? 'Applying...' : 'Confirm Adjustment'}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Confirm Reverse Transaction Modal */}
      {revConfirmOpen && selectedRevTx && (() => {
        const deltaCents = getReversalDeltaCents(selectedRevTx);
        const curCents = eurToCents(revInvestor?.walletBalance ?? 0);
        const projectedCents = curCents + deltaCents;
        const origCents = eurToCents(selectedRevTx.amount);
        return (
          <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-[#121A1F] border border-[#1F2C33] rounded-2xl max-w-md w-full p-6 space-y-4">
              <h3 className="text-sm font-bold text-[#F2F5F4] flex items-center gap-2">
                <RotateCcw className="w-4 h-4 text-rose-400" />
                <span>Confirm Transaction Reversal</span>
              </h3>
              <div className="bg-[#0B0F10] border border-[#1F2C33] rounded-xl p-3 text-xs text-[#B6C4C9] space-y-1.5 tabular-nums">
                <div>Action: <strong className="text-rose-400">Reverse Transaction (reverse_transaction)</strong></div>
                <div>Investor: <strong className="text-[#F2F5F4]">{revInvestor?.fullName || revInvestor?.email || selectedRevTx.userId}</strong></div>
                <div>Original Tx: <strong className="font-mono text-[#F2F5F4]">{selectedRevTx.reference}</strong> ({selectedRevTx.type}, {formatCentsEur(origCents)})</div>
                <div>Reversal Wallet Delta: <strong className="text-[#F2F5F4]">{deltaCents >= 0 ? '+' : ''}{formatCentsEur(deltaCents)}</strong></div>
                <div>Current Balance: <strong>{formatCentsEur(curCents)}</strong></div>
                <div>Projected Balance: <strong className="text-[#6FD8B0]">{formatCentsEur(projectedCents)}</strong></div>
                <div>Reason: <span className="text-[#F2F5F4]">{revReason}</span></div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" disabled={correctionBusy} onClick={() => setRevConfirmOpen(false)} className="px-4 py-2 rounded-xl bg-[#0B0F10] border border-[#1F2C33] text-xs font-semibold text-[#B6C4C9] cursor-pointer disabled:opacity-50">
                  Cancel
                </button>
                <button type="button" disabled={correctionBusy} onClick={handleConfirmReverse} className="px-4 py-2 rounded-xl bg-rose-600 text-white text-xs font-bold cursor-pointer disabled:opacity-50">
                  {correctionBusy ? 'Reversing...' : 'Confirm Reversal'}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Confirm Record Investment Modal */}
      {invConfirmOpen && (() => {
        const curCents = eurToCents(activeInvInvestor?.walletBalance ?? 0);
        const projectedCents = curCents - calculatedInvCostCents;
        return (
          <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-[#121A1F] border border-[#1F2C33] rounded-2xl max-w-md w-full p-6 space-y-4">
              <h3 className="text-sm font-bold text-[#F2F5F4] flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-[#6FD8B0]" />
                <span>Confirm Investment Allocation</span>
              </h3>
              <div className="bg-[#0B0F10] border border-[#1F2C33] rounded-xl p-3 text-xs text-[#B6C4C9] space-y-1.5 tabular-nums">
                <div>Action: <strong className="text-[#6FD8B0]">Record Investment (record_investment)</strong></div>
                <div>Investor: <strong className="text-[#F2F5F4]">{activeInvInvestor?.fullName || activeInvInvestor?.email || invUserId}</strong></div>
                <div>Property: <strong className="text-[#F2F5F4]">{activeInvProp?.title || invPropId}</strong> ({Math.floor(invShares)} shares)</div>
                <div>Allocation Amount: <strong className="text-rose-300">−{formatCentsEur(calculatedInvCostCents)}</strong></div>
                <div>Current Balance: <strong>{formatCentsEur(curCents)}</strong></div>
                <div>Projected Balance: <strong className="text-[#6FD8B0]">{formatCentsEur(projectedCents)}</strong></div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" disabled={recordingInv} onClick={() => setInvConfirmOpen(false)} className="px-4 py-2 rounded-xl bg-[#0B0F10] border border-[#1F2C33] text-xs font-semibold text-[#B6C4C9] cursor-pointer disabled:opacity-50">
                  Cancel
                </button>
                <button type="button" disabled={recordingInv} onClick={handleConfirmRecordInvestment} className="px-4 py-2 rounded-xl bg-[#6FD8B0] text-[#0B0F10] text-xs font-bold cursor-pointer disabled:opacity-50">
                  {recordingInv ? 'Recording...' : 'Confirm & Record Investment'}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Pay Distribution Per-Investor Preview Confirmation Modal */}
      {distPreviewModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#121A1F] border border-[#1F2C33] rounded-2xl max-w-xl w-full p-6 space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-[#1F2C33] pb-3">
              <h3 className="text-sm font-bold text-[#F2F5F4] flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#6FD8B0]" />
                <span>Confirm Per-Investor Distribution Payout</span>
              </h3>
              <button type="button" disabled={payingDist} onClick={() => setDistPreviewModalOpen(false)} className="text-[#8FA1A8] cursor-pointer disabled:opacity-50">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs text-[#B6C4C9] bg-[#0B0F10] p-3 rounded-xl border border-[#1F2C33] space-y-1 tabular-nums">
              <div>Action: <strong className="text-[#6FD8B0]">Pay Distribution (pay_distribution)</strong></div>
              <div>Investors: <strong className="text-[#F2F5F4]">{distPreview.rows.length} holder(s) of {activeDistProp?.title}</strong></div>
              <div>Total Disbursement: <strong className="text-[#6FD8B0]">{formatCentsEur(distPreview.totalCents)}</strong></div>
            </div>

            <div className="bg-[#0B0F10] border border-[#1F2C33] rounded-xl overflow-hidden max-h-64 overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#1F2C33] text-[11px] text-[#8FA1A8] uppercase">
                    <th className="py-2 px-3">Investor</th>
                    <th className="py-2 px-3 text-right">Shares</th>
                    <th className="py-2 px-3 text-right">Ownership</th>
                    <th className="py-2 px-3 text-right">Payout</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1F2C33]">
                  {distPreview.rows.map((r) => (
                    <tr key={r.userId}>
                      <td className="py-2 px-3">
                        <div className="font-semibold text-[#F2F5F4]">{r.name}</div>
                        <div className="text-[11px] text-[#8FA1A8]">{r.email}</div>
                      </td>
                      <td className="py-2 px-3 text-right font-mono tabular-nums">{r.shares.toLocaleString()}</td>
                      <td className="py-2 px-3 text-right font-mono text-[#B6C4C9] tabular-nums">{r.pct.toFixed(2)}%</td>
                      <td className="py-2 px-3 text-right font-bold text-[#6FD8B0] tabular-nums">{formatCentsEur(r.payoutCents)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-[#1F2C33]">
              <button
                type="button"
                disabled={payingDist}
                onClick={() => setDistPreviewModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-[#0B0F10] border border-[#1F2C33] text-xs font-semibold text-[#B6C4C9] cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={payingDist}
                onClick={handleConfirmPayDistribution}
                className="px-4 py-2 rounded-xl bg-[#6FD8B0] text-[#0B0F10] text-xs font-bold cursor-pointer disabled:opacity-50"
              >
                {payingDist ? 'Executing Payout...' : `Pay ${distPreview.rows.length} Investor(s)`}
              </button>
            </div>
          </div>
        </div>
      )}

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
                  <select
                    value={gateMethod}
                    onChange={(e) => setGateMethod(e.target.value as 'bank' | 'usdt')}
                    className="w-full px-3 py-2 bg-[#0B0F10] border border-[#1F2C33] rounded-xl text-[#F2F5F4]"
                  >
                    <option value="bank">Bank transfer (SEPA)</option>
                    <option value="usdt">USDT</option>
                  </select>
                </div>
              </div>

              {gateMethod === 'bank' ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[#B6C4C9] font-semibold">Bank transfer details</label>
                    <button type="button" onClick={() => setGateDetails((rows) => [...rows, { label: '', value: '' }])} className="text-[#6FD8B0] font-semibold inline-flex items-center gap-1 cursor-pointer">
                      <Plus className="w-3 h-3" /><span>Add Row</span>
                    </button>
                  </div>
                  {gateDetails.map((row, idx) => (
                    <div key={idx} className="flex gap-2">
                      <input type="text" required value={row.label} onChange={(e) => setGateDetails((rows) => rows.map((item, i) => i === idx ? { ...item, label: e.target.value } : item))} placeholder="Label (e.g. IBAN)" className="w-2/5 px-3 py-2 bg-[#0B0F10] border border-[#1F2C33] rounded-xl text-[#F2F5F4]" />
                      <input type="text" required value={row.value} onChange={(e) => setGateDetails((rows) => rows.map((item, i) => i === idx ? { ...item, value: e.target.value } : item))} placeholder="Value" className="flex-1 min-w-0 px-3 py-2 bg-[#0B0F10] border border-[#1F2C33] rounded-xl font-mono text-[#F2F5F4]" />
                      <button type="button" aria-label={`Remove bank detail row ${idx + 1}`} onClick={() => setGateDetails((rows) => rows.filter((_, i) => i !== idx))} className="p-2 rounded-xl bg-[#0B0F10] border border-[#1F2C33] text-[#8FA1A8] hover:text-rose-400 cursor-pointer"><X className="w-3.5 h-3.5" /></button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-3 rounded-xl border border-[#1F2C33] bg-[#0B0F10] p-3">
                  <div>
                    <label className="block text-[#B6C4C9] font-semibold mb-1">USDT network</label>
                    <select required value={gateNetwork} onChange={(e) => setGateNetwork(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-[#1F2C33] bg-[#121A1F] text-[#F2F5F4]">
                      <option value="TRC20">TRC20 (TRON)</option>
                      <option value="ERC20">ERC20 (Ethereum)</option>
                      <option value="BEP20">BEP20 (BNB Smart Chain)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[#B6C4C9] font-semibold mb-1">Wallet address</label>
                    <input required value={gateWalletAddress} onChange={(e) => setGateWalletAddress(e.target.value)} placeholder={gateNetwork === 'TRC20' ? 'T… (34 characters)' : '0x… (42 characters)'} className="w-full px-3 py-2 rounded-xl border border-[#1F2C33] bg-[#121A1F] font-mono text-[#F2F5F4]" />
                    <p className="mt-1 text-[11px] text-[#8FA1A8]">{gateNetwork === 'TRC20' ? 'TRC20 address: starts with T and is 34 characters.' : 'ERC20 / BEP20 address: starts with 0x and is 42 characters.'}</p>
                  </div>
                  {gateQrDataUrl && <div className="rounded-xl border border-[#1F2C33] bg-white p-3 text-center"><img src={gateQrDataUrl} alt="QR code for USDT receiving wallet address" className="mx-auto h-44 w-44" /><p className="mt-2 break-all text-[11px] text-slate-700">{gateWalletAddress}</p></div>}
                  <p role="alert" className="rounded-lg border border-amber-400/30 bg-amber-400/10 p-3 text-[11px] leading-relaxed text-amber-200">Only send USDT on the selected network. Funds sent on another network can be lost.</p>
                </div>
              )}
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
                <span>Gate Active</span>
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
