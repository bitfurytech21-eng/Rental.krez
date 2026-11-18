import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Briefcase,
  Building2,
  Check,
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
  InvestmentRequestRow,
  PastDistributionRow,
  PaymentGateRecord,
  adminAdjustBalanceRpc,
  adminChargeFeeRpc,
  allocateProportionalCents,
  approveDepositSubmission,
  approveWithdrawalRequest,
  assignPaymentGateToInvestor,
  centsToEur,
  computeDefaultWithdrawalFeeCents,
  createPrivateBucketSignedUrl,
  deletePaymentGateRecord,
  eurToCents,
  executePayDistribution,
  fetchAdminStats,
  fetchFinanceSummary,
  formatCentsEur,
  maskIban,
  parseStrictEurToCents,
  recordInvestmentRpc,
  recordManualDepositRpc,
  rejectDepositSubmission,
  rejectWithdrawalRequest,
  reverseTransactionRpc,
  savePaymentGateRecord,
} from './adminSupabaseGateway';
import { InvestmentRequestsQueuePanel } from './AdminOpsSections';
import { AdminActionDialog, useDialogFocus } from './AdminActionDialog';

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
  loading?: boolean;
  initialTab?: FinanceTabId;
  onTabChange?: (tab: FinanceTabId) => void;
  stats: AdminStatsSummary;
  limits: Record<string, any>;
  users: PlatformUser[];
  transactions: any[];
  manualDeposits: any[];
  investments: any[];
  investmentRequests?: InvestmentRequestRow[];
  properties: Property[];
  pastDistributions: PastDistributionRow[];
  paymentGates: PaymentGateRecord[];
  onRefresh: () => Promise<void> | void;
  onSuccess: (msg: string) => void;
  onError: (msg: string) => void;
}

export const AdminFinanceSection: React.FC<AdminFinanceSectionProps> = ({
  loading = false,
  initialTab = 'overview',
  onTabChange,
  stats,
  limits,
  users,
  transactions,
  manualDeposits,
  investments,
  investmentRequests = [],
  properties,
  pastDistributions,
  paymentGates,
  onRefresh,
  onSuccess,
  onError,
}) => {
  const [activeTab, setActiveTab] = useState<FinanceTabId>(initialTab);

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

  const pendingDepCount = useMemo(() => {
    const manualPending = manualDeposits.filter(
      (m) => String(m.status || 'pending').toLowerCase() === 'pending'
    );
    const manualRefs = new Set(
      manualDeposits.map((m) => String(m.reference || m.transactionId || m.id))
    );
    const txPending = transactions.filter(
      (t) =>
        t.type === 'deposit' &&
        t.status === 'pending' &&
        !manualRefs.has(String(t.reference || ''))
    );
    return manualPending.length + txPending.length;
  }, [transactions, manualDeposits]);
  const pendingWthCount = useMemo(
    () => transactions.filter((t) => t.type === 'withdrawal' && t.status === 'pending').length,
    [transactions]
  );
  const pendingInvReqCount = useMemo(
    () => investmentRequests.filter((r) => r.status === 'pending').length,
    [investmentRequests]
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
    } catch (err: any) {
      onError(err?.message || 'Unable to load finance overview.');
    } finally {
      setLoadingSummary(false);
    }
  }, [users, transactions, investments, stats.kycQueueCount, overviewFrom, overviewTo, onError]);

  useEffect(() => {
    if (activeTab === 'overview') {
      void loadFinanceOverview();
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
  const [depQueueTab, setDepQueueTab] = useState<'pending' | 'handled'>('pending');
  const [depHandledFilter, setDepHandledFilter] = useState<'all' | 'completed' | 'failed'>('all');
  const [depSearch, setDepSearch] = useState('');
  const [approveDepTarget, setApproveDepTarget] = useState<any | null>(null);
  const [receivedAmount, setReceivedAmount] = useState<string>('');
  const [checkedBankStatement, setCheckedBankStatement] = useState<boolean>(false);
  const [rejectDepTarget, setRejectDepTarget] = useState<any | null>(null);
  const [rejectDepReason, setRejectDepReason] = useState<string>('');
  const [proofViewer, setProofViewer] = useState<{ title: string; url: string | null } | null>(null);

  // Record Manual Deposit Modal (admin_credit_deposit)
  const [manualDepOpen, setManualDepOpen] = useState(false);
  const [manualDepConfirmStep, setManualDepConfirmStep] = useState(false);
  const [manualDepSearch, setManualDepSearch] = useState('');
  const [manualDepUserId, setManualDepUserId] = useState<string>(() => selectableUsers[0]?.id || '');
  const [manualDepAmount, setManualDepAmount] = useState<string>('1000');
  const [manualDepNote, setManualDepNote] = useState<string>('');

  const filteredManualDepUsers = useMemo(() => {
    const q = manualDepSearch.trim().toLowerCase();
    if (!q) return selectableUsers;
    return selectableUsers.filter((u) =>
      `${u.fullName || ''} ${u.email || ''} ${u.id}`.toLowerCase().includes(q)
    );
  }, [selectableUsers, manualDepSearch]);

  useEffect(() => {
    if (!manualDepUserId && selectableUsers[0]?.id) {
      setManualDepUserId(selectableUsers[0].id);
    }
  }, [selectableUsers, manualDepUserId]);

  useEffect(() => {
    if (
      filteredManualDepUsers.length > 0 &&
      !filteredManualDepUsers.some((u) => u.id === manualDepUserId)
    ) {
      setManualDepUserId(filteredManualDepUsers[0].id);
    }
  }, [filteredManualDepUsers, manualDepUserId]);

  const resolveProcessorLabel = useCallback(
    (raw?: string): string => {
      if (!raw) return 'System';
      const match = userById.get(raw);
      return match?.email || match?.fullName || raw;
    },
    [userById]
  );

  const allCombinedDeposits = useMemo(() => {
    const manualRows = manualDeposits.map((m) => {
      const uid = String(m.userId || m.user_id || '');
      const u = userById.get(uid);
      const st = String(m.status || 'pending').toLowerCase();
      const bucketStatus =
        st === 'approved' || st === 'completed' || st === 'paid'
          ? 'completed'
          : st === 'rejected' || st === 'failed' || st === 'cancelled'
          ? 'failed'
          : 'pending';
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
        amount: centsToEur(eurToCents(m.amount || 0)),
        reference: String(m.reference || m.transactionId || m.id),
        proofPath: m.proofFilePath || m.proofUrl || m.proofDataUrl || m.proof_path || '',
        createdAt: String(m.createdAt || m.submittedAt || m.created_at || new Date().toISOString()),
        processedBy: m.processedBy || m.processed_by_email || m.processed_by || m.reviewedBy || m.reviewed_by || undefined,
        processedAt: m.processedAt || m.processed_at || m.reviewedAt || m.reviewed_at || undefined,
        status: bucketStatus,
        rawStatus: st,
        isManual: true,
      };
    });
    const manualRefs = new Set(manualRows.map((r) => r.reference));
    const txRows = transactions
      .filter((t) => t.type === 'deposit' && !manualRefs.has(String(t.reference || '')))
      .map((t) => {
        const u = userById.get(t.userId);
        const st = String(t.status || 'pending').toLowerCase();
        const bucketStatus =
          st === 'approved' || st === 'completed' || st === 'paid'
            ? 'completed'
            : st === 'rejected' || st === 'failed' || st === 'cancelled'
            ? 'failed'
            : 'pending';
        return {
          id: String(t.id),
          userId: String(t.userId || ''),
          investorName: u?.fullName || 'Investor',
          investorEmail: u?.email || t.userEmail || t.userId,
          gateLabel:
            (u?.assignedGateId ? gateById.get(u.assignedGateId) : u?.assignedGateName) ||
            t.method ||
            'Bank / Wire',
          amount: centsToEur(eurToCents(t.amount || 0)),
          reference: String(t.reference || t.id),
          proofPath: t.proofUrl || t.txHash || '',
          createdAt: String(t.createdAt || new Date().toISOString()),
          processedBy: t.processedBy || t.processed_by_email || t.processed_by || undefined,
          processedAt: t.processedAt || t.processed_at || undefined,
          status: bucketStatus,
          rawStatus: st,
          isManual: false,
        };
      });
    return [...manualRows, ...txRows];
  }, [manualDeposits, transactions, userById, gateById]);

  const handledDepCount = useMemo(
    () => allCombinedDeposits.filter((d) => d.status !== 'pending').length,
    [allCombinedDeposits]
  );

  const combinedDeposits = useMemo(() => {
    const q = depSearch.trim().toLowerCase();
    return allCombinedDeposits
      .filter((d) => {
        if (depQueueTab === 'pending') return d.status === 'pending';
        if (d.status === 'pending') return false;
        if (depHandledFilter === 'completed') return d.status === 'completed';
        if (depHandledFilter === 'failed') return d.status === 'failed';
        return true;
      })
      .filter((d) =>
        q
          ? `${d.investorName} ${d.investorEmail} ${d.reference} ${d.gateLabel}`.toLowerCase().includes(q)
          : true
      )
      .sort((a, b) => {
        if (depQueueTab === 'pending') {
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        }
        const aTime = new Date(a.processedAt || a.createdAt).getTime();
        const bTime = new Date(b.processedAt || b.createdAt).getTime();
        return bTime - aTime;
      });
  }, [allCombinedDeposits, depQueueTab, depHandledFilter, depSearch]);

  const handleOpenProof = async (row: any) => {
    const url = await createPrivateBucketSignedUrl(
      row.proofPath,
      ['manual-payment-proofs', 'documents', 'deposits'],
      row.proofPath
    );
    setProofViewer({ title: `Proof of Payment — ${row.reference}`, url });
  };

  const handleOpenManualDepositConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    const uid = manualDepUserId || selectableUsers[0]?.id;
    const amtCents = parseStrictEurToCents(manualDepAmount);
    if (!uid || amtCents === null || amtCents <= 0) {
      onError('Select an investor and enter a positive amount in euros.');
      return;
    }
    setManualDepConfirmStep(true);
  };

  // =========================================================================
  // TAB 3: WITHDRAWALS (dest_iban masked+reveal+copy, fee from settings.limits, You send, payout_ref)
  // =========================================================================
  const withdrawalFeePct = Number(limits?.withdrawal_fee_pct ?? 0);
  const defaultWithdrawalFeeCents = Math.max(0, eurToCents(limits?.withdrawal_fee_eur ?? 0));
  const defaultWithdrawalFee = centsToEur(defaultWithdrawalFeeCents);
  const [wthQueueTab, setWthQueueTab] = useState<'pending' | 'handled'>('pending');
  const [wthHandledFilter, setWthHandledFilter] = useState<'all' | 'completed' | 'failed'>('all');
  const [wthSearch, setWthSearch] = useState('');
  const [revealedIbanIds, setRevealedIbanIds] = useState<Record<string, boolean>>({});
  const [copiedIbanId, setCopiedIbanId] = useState<string | null>(null);

  const [approveWthTarget, setApproveWthTarget] = useState<{ tx: any; inv?: PlatformUser; iban: string } | null>(null);
  const [wthPayoutRef, setWthPayoutRef] = useState<string>('');
  const [wthFeeInput, setWthFeeInput] = useState<string>(defaultWithdrawalFee.toFixed(2));
  const [sentFromBankChecked, setSentFromBankChecked] = useState<boolean>(false);

  const [rejectWthTarget, setRejectWthTarget] = useState<any | null>(null);
  const [rejectWthReason, setRejectWthReason] = useState<string>('');

  const handledWthCount = useMemo(
    () => transactions.filter((t) => t.type === 'withdrawal' && t.status !== 'pending').length,
    [transactions]
  );

  const withdrawalRows = useMemo(() => {
    const q = wthSearch.trim().toLowerCase();
    return transactions
      .filter((t) => t.type === 'withdrawal')
      .filter((t) => {
        const st = String(t.status || 'pending').toLowerCase();
        const isCompleted = ['completed', 'approved', 'paid'].includes(st);
        const isFailed = ['rejected', 'failed', 'cancelled'].includes(st);
        if (wthQueueTab === 'pending') return st === 'pending';
        if (st === 'pending') return false;
        if (wthHandledFilter === 'completed') return isCompleted;
        if (wthHandledFilter === 'failed') return isFailed;
        return true;
      })
      .filter((t) => {
        if (!q) return true;
        const inv = userById.get(t.userId);
        return `${inv?.fullName || ''} ${inv?.email || t.userEmail || t.userId} ${t.reference || ''} ${t.payoutReference || ''} ${t.id || ''} ${t.destIban || t.destination || ''}`
          .toLowerCase()
          .includes(q);
      })
      .sort((a, b) => {
        if (wthQueueTab === 'pending') {
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        }
        const aTime = new Date(a.processedAt || a.createdAt).getTime();
        const bTime = new Date(b.processedAt || b.createdAt).getTime();
        return bTime - aTime;
      });
  }, [transactions, wthQueueTab, wthHandledFilter, wthSearch, userById]);

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

  // =========================================================================
  // TAB 5: INVESTMENTS & DISTRIBUTIONS (record_investment + pay_distribution w/ modal preview)
  // =========================================================================
  const [invUserId, setInvUserId] = useState<string>(() => selectableUsers[0]?.id || '');
  const [invPropId, setInvPropId] = useState<string>(() => properties[0]?.id || '');
  const [invShares, setInvShares] = useState<number>(10);
  const [invConfirmOpen, setInvConfirmOpen] = useState(false);

  const [distPropId, setDistPropId] = useState<string>(() => properties[0]?.id || '');
  const [distAmountEur, setDistAmountEur] = useState<number>(2500);
  const [distNote, setDistNote] = useState<string>('');
  const [distPreviewModalOpen, setDistPreviewModalOpen] = useState(false);

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

  const manualDepDialogRef = useDialogFocus<HTMLFormElement>(
    manualDepOpen && !manualDepConfirmStep,
    () => {
      setManualDepOpen(false);
      setManualDepConfirmStep(false);
    }
  );
  const proofViewerRef = useDialogFocus<HTMLDivElement>(
    Boolean(proofViewer),
    () => setProofViewer(null)
  );
  const gateModalRef = useDialogFocus<HTMLFormElement>(
    gateModalOpen,
    () => setGateModalOpen(false),
    savingGate
  );

  // =========================================================================
  // RENDER
  // =========================================================================
  return (
    <div className="space-y-6">
      {/* Header + 7-Tab Navigation Bar */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 id="admin-main-heading" data-admin-queue-focus tabIndex={-1} className="text-xl font-bold text-[#F2F5F4] tracking-tight focus:outline-none">
              Finance Operations
            </h1>
            <p className="text-xs text-[#8FA1A8] mt-1">
              Treasury cashflows, wallet liabilities, deposit/withdrawal settlement, fee &amp; balance corrections, distributions, ledger, and payment gates.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-[#8FA1A8] tabular-nums shrink-0">
            <span>
              Withdrawal fee:{' '}
              <strong className="text-[#F2F5F4]">
                {withdrawalFeePct > 0
                  ? `${withdrawalFeePct}%`
                  : formatCentsEur(defaultWithdrawalFeeCents)}
              </strong>
            </span>
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
                : tab.id === 'investments' && pendingInvReqCount > 0
                ? pendingInvReqCount
                : undefined;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => switchTab(tab.id)}
                className={`min-h-[44px] whitespace-nowrap shrink-0 px-3.5 py-2 rounded-xl text-xs font-semibold inline-flex items-center gap-2 transition-colors cursor-pointer ${
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
                className="min-h-[44px] px-3 py-2 bg-[#0B0F10] border border-[#1F2C33] rounded-xl text-[#F2F5F4]"
              />
              <span className="text-[#8FA1A8]">to</span>
              <input
                type="date"
                value={overviewTo}
                onChange={(e) => setOverviewTo(e.target.value)}
                aria-label="Summary to date"
                className="min-h-[44px] px-3 py-2 bg-[#0B0F10] border border-[#1F2C33] rounded-xl text-[#F2F5F4]"
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
                  className="min-h-[44px] whitespace-nowrap px-3.5 py-2 rounded-xl bg-[#0B0F10] border border-[#1F2C33] hover:border-[#6FD8B0] text-[#B6C4C9] hover:text-[#F2F5F4] font-semibold cursor-pointer"
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
                  className="min-h-[44px] px-2 text-[11px] font-semibold text-[#6FD8B0] hover:underline cursor-pointer"
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
                    className="min-h-[44px] w-full px-4 py-3 flex items-center justify-between hover:bg-[#162026] text-xs cursor-pointer transition-colors"
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
                  className="min-h-[44px] px-2 text-[11px] font-semibold text-[#6FD8B0] hover:underline cursor-pointer"
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
          <div className="flex flex-col gap-3">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setDepQueueTab('pending')}
                  className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-semibold cursor-pointer tabular-nums ${
                    depQueueTab === 'pending' ? 'bg-[#6FD8B0] text-[#0B0F10]' : 'bg-[#121A1F] border border-[#1F2C33] text-[#B6C4C9]'
                  }`}
                >
                  Pending ({allCombinedDeposits.filter((d) => d.status === 'pending').length})
                </button>
                <button
                  type="button"
                  onClick={() => setDepQueueTab('handled')}
                  className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-semibold cursor-pointer tabular-nums ${
                    depQueueTab === 'handled' ? 'bg-[#6FD8B0] text-[#0B0F10]' : 'bg-[#121A1F] border border-[#1F2C33] text-[#B6C4C9]'
                  }`}
                >
                  Handled ({handledDepCount})
                </button>
                <div className="relative ml-1">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#8FA1A8]" />
                  <input
                    type="text"
                    value={depSearch}
                    onChange={(e) => setDepSearch(e.target.value)}
                    aria-label="Search deposits by investor name, email, or reference"
                    placeholder="Search investor name, email, or reference..."
                    className="min-h-[44px] pl-8 pr-3 py-2 bg-[#121A1F] border border-[#1F2C33] rounded-xl text-xs text-[#F2F5F4] min-w-[230px]"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {depQueueTab === 'handled' && (
                  <div className="flex items-center gap-1.5">
                    {([
                      { id: 'all', label: 'All' },
                      { id: 'completed', label: 'Completed' },
                      { id: 'failed', label: 'Failed' },
                    ] as const).map((sub) => (
                      <button
                        key={sub.id}
                        type="button"
                        onClick={() => setDepHandledFilter(sub.id)}
                        className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-semibold cursor-pointer ${
                          depHandledFilter === sub.id
                            ? 'bg-[#6FD8B0]/20 text-[#6FD8B0] border border-[#6FD8B0]/40'
                            : 'bg-[#121A1F] border border-[#1F2C33] text-[#8FA1A8]'
                        }`}
                      >
                        {sub.label}
                      </button>
                    ))}
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setManualDepSearch('');
                    setManualDepUserId((p) => p || selectableUsers[0]?.id || '');
                    setManualDepConfirmStep(false);
                    setManualDepOpen(true);
                  }}
                  className="min-h-[44px] whitespace-nowrap px-4 py-2 rounded-xl bg-[#6FD8B0] hover:bg-[#5ec8a0] text-[#0B0F10] text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer self-start lg:self-auto"
                >
                  <Plus className="w-4 h-4" />
                  <span>Record manual deposit</span>
                </button>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="space-y-3" role="status" aria-label="Loading deposit queue">
              <div className="rounded-2xl border border-[#1F2C33] overflow-hidden bg-[#121A1F]">
                {Array.from({ length: 5 }, (_, index) => (
                  <div key={index} className="grid grid-cols-8 gap-3 p-4 border-b border-[#1F2C33]">
                    {Array.from({ length: 8 }, (_, cell) => (
                      <div key={cell} className="h-4 rounded bg-[#1F2C33] animate-pulse" />
                    ))}
                  </div>
                ))}
              </div>
            </div>
          ) : (
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
                      <th className="py-3 px-4 text-right">
                        {depQueueTab === 'handled' ? 'Processed By & When' : 'Action'}
                      </th>
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
                              className="min-h-[44px] px-3 py-2 rounded-xl bg-[#0B0F10] border border-[#1F2C33] hover:border-[#6FD8B0] text-[#6FD8B0] text-[11px] font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5" />
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
                            {row.rawStatus}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          {depQueueTab === 'pending' && row.status === 'pending' ? (
                            <div className="inline-flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setApproveDepTarget(row);
                                  setReceivedAmount(centsToEur(eurToCents(row.amount)).toFixed(2));
                                  setCheckedBankStatement(false);
                                }}
                                className="min-h-[44px] px-3.5 py-2 rounded-xl bg-[#6FD8B0] hover:bg-[#5ec8a0] text-[#0B0F10] text-[11px] font-bold cursor-pointer"
                              >
                                Approve
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setRejectDepTarget(row);
                                  setRejectDepReason('');
                                }}
                                className="min-h-[44px] px-3.5 py-2 rounded-xl bg-[#0B0F10] border border-rose-500/40 text-rose-300 hover:bg-rose-500/10 text-[11px] font-semibold cursor-pointer"
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
                    {combinedDeposits.length === 0 && (
                      <tr>
                        <td colSpan={8} className="py-10 text-center text-xs text-[#8FA1A8]">
                          {depQueueTab === 'pending' && !depSearch.trim()
                            ? 'Nothing waiting'
                            : 'No matching deposits found.'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 3: WITHDRAWALS                                                    */}
      {/* ===================================================================== */}
      {activeTab === 'withdrawals' && (
        <div className="space-y-4">
          <div className="flex flex-col gap-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setWthQueueTab('pending')}
                  className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-semibold cursor-pointer tabular-nums ${
                    wthQueueTab === 'pending' ? 'bg-[#6FD8B0] text-[#0B0F10]' : 'bg-[#121A1F] border border-[#1F2C33] text-[#B6C4C9]'
                  }`}
                >
                  Pending ({pendingWthCount})
                </button>
                <button
                  type="button"
                  onClick={() => setWthQueueTab('handled')}
                  className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-semibold cursor-pointer tabular-nums ${
                    wthQueueTab === 'handled' ? 'bg-[#6FD8B0] text-[#0B0F10]' : 'bg-[#121A1F] border border-[#1F2C33] text-[#B6C4C9]'
                  }`}
                >
                  Handled ({handledWthCount})
                </button>
                <div className="relative ml-1">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#8FA1A8]" />
                  <input
                    type="text"
                    value={wthSearch}
                    onChange={(e) => setWthSearch(e.target.value)}
                    aria-label="Search withdrawals by investor name, email, or reference"
                    placeholder="Search investor name, email, or reference..."
                    className="min-h-[44px] pl-8 pr-3 py-2 bg-[#121A1F] border border-[#1F2C33] rounded-xl text-xs text-[#F2F5F4] min-w-[230px]"
                  />
                </div>
              </div>
              <div className="text-xs text-[#8FA1A8] tabular-nums">
                Configured fee from <span className="font-mono text-[#6FD8B0]">settings.limits</span>:{' '}
                <strong className="text-[#F2F5F4]">
                  {withdrawalFeePct > 0
                    ? `${withdrawalFeePct}%`
                    : formatCentsEur(defaultWithdrawalFeeCents)}
                </strong>
              </div>
            </div>

            {wthQueueTab === 'handled' && (
              <div className="flex items-center gap-1.5">
                {([
                  { id: 'all', label: 'All' },
                  { id: 'completed', label: 'Completed' },
                  { id: 'failed', label: 'Failed' },
                ] as const).map((sub) => (
                  <button
                    key={sub.id}
                    type="button"
                    onClick={() => setWthHandledFilter(sub.id)}
                    className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-semibold cursor-pointer ${
                      wthHandledFilter === sub.id
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

          {loading ? (
            <div className="space-y-3" role="status" aria-label="Loading withdrawal queue">
              <div className="rounded-2xl border border-[#1F2C33] overflow-hidden bg-[#121A1F]">
                {Array.from({ length: 5 }, (_, index) => (
                  <div key={index} className="grid grid-cols-9 gap-3 p-4 border-b border-[#1F2C33]">
                    {Array.from({ length: 9 }, (_, cell) => (
                      <div key={cell} className="h-4 rounded bg-[#1F2C33] animate-pulse" />
                    ))}
                  </div>
                ))}
              </div>
            </div>
          ) : (
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
                      <th className="py-3 px-4 text-right">
                        {wthQueueTab === 'handled' ? 'Processed By & When' : 'Action'}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1F2C33]">
                    {withdrawalRows.map((tx) => {
                      const inv = userById.get(tx.userId);
                      const rawIban = String(tx.destIban || tx.destination || inv?.bankIban || tx.reference || '');
                      const revealed = Boolean(revealedIbanIds[tx.id]);
                      const amountCents = eurToCents(tx.amount);
                      const rowDefaultFeeCents = computeDefaultWithdrawalFeeCents(amountCents, limits);
                      const feeCentsShown =
                        tx.status === 'pending'
                          ? rowDefaultFeeCents
                          : eurToCents(tx.feeAmount ?? centsToEur(rowDefaultFeeCents));
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
                                className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-xl bg-[#0B0F10] border border-[#1F2C33] text-[#8FA1A8] hover:text-[#6FD8B0] cursor-pointer"
                                title={revealed ? 'Hide IBAN' : 'Reveal IBAN'}
                                aria-label={revealed ? 'Hide IBAN' : 'Reveal IBAN'}
                              >
                                {revealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleCopyIban(tx.id, rawIban)}
                                className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-xl bg-[#0B0F10] border border-[#1F2C33] text-[#8FA1A8] hover:text-[#6FD8B0] cursor-pointer"
                                title="Copy IBAN"
                                aria-label="Copy IBAN"
                              >
                                {copiedIbanId === tx.id ? (
                                  <Check className="w-3.5 h-3.5 text-[#6FD8B0]" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
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
                                  : tx.status === 'rejected' || tx.status === 'failed'
                                  ? 'text-rose-400'
                                  : 'text-amber-400'
                              }`}
                            >
                              {tx.status}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right whitespace-nowrap">
                            {wthQueueTab === 'pending' && tx.status === 'pending' ? (
                              <div className="inline-flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setApproveWthTarget({ tx, inv, iban: rawIban });
                                    setWthFeeInput(centsToEur(rowDefaultFeeCents).toFixed(2));
                                    setWthPayoutRef('');
                                    setSentFromBankChecked(false);
                                  }}
                                  className="min-h-[44px] px-3.5 py-2 rounded-xl bg-[#6FD8B0] hover:bg-[#5ec8a0] text-[#0B0F10] text-[11px] font-bold cursor-pointer"
                                >
                                  Approve
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setRejectWthTarget(tx);
                                    setRejectWthReason('');
                                  }}
                                  className="min-h-[44px] px-3.5 py-2 rounded-xl bg-[#0B0F10] border border-rose-500/40 text-rose-300 hover:bg-rose-500/10 text-[11px] font-semibold cursor-pointer"
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
                                  {tx.processedAt ? formatDate(tx.processedAt) : '—'}
                                  {tx.payoutReference ? ` · Ref: ${tx.payoutReference}` : ''}
                                </div>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                    {withdrawalRows.length === 0 && (
                      <tr>
                        <td colSpan={9} className="py-10 text-center text-xs text-[#8FA1A8]">
                          {wthQueueTab === 'pending' && !wthSearch.trim()
                            ? 'Nothing waiting'
                            : 'No matching withdrawals found.'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 4: PAYMENTS & CORRECTIONS                                         */}
      {/* ===================================================================== */}
      {activeTab === 'payments' && (() => {
        const feeCurCents = eurToCents(feeInvestor?.walletBalance ?? 0);
        const parsedFeeForm = parseStrictEurToCents(feeAmount);
        const validFeeFormCents = parsedFeeForm !== null && parsedFeeForm > 0 ? parsedFeeForm : 0;
        const feeResultingCents = feeCurCents - validFeeFormCents;

        const adjCurCents = eurToCents(adjInvestor?.walletBalance ?? 0);
        const parsedAdjForm = parseStrictEurToCents(adjAmount);
        const validAdjFormCents = parsedAdjForm !== null && parsedAdjForm > 0 ? parsedAdjForm : 0;
        const signedAdjFormDeltaCents = adjDirection === 'credit' ? validAdjFormCents : -validAdjFormCents;
        const adjResultingCents = adjCurCents + signedAdjFormDeltaCents;

        const revCurCents = eurToCents(revInvestor?.walletBalance ?? 0);
        const revDeltaFormCents = selectedRevTx ? getReversalDeltaCents(selectedRevTx) : 0;
        const revResultingCents = revCurCents + revDeltaFormCents;

        const reversalPairs = transactions
          .filter((t) => String(t.type).toLowerCase() === 'reversal' || Boolean(t.reversalOfId))
          .map((revTx) => {
            const orig = revTx.reversalOfId ? txById.get(revTx.reversalOfId) : undefined;
            const inv = userById.get(revTx.userId || orig?.userId);
            return { revTx, orig, inv };
          })
          .sort((a, b) => new Date(b.revTx.createdAt).getTime() - new Date(a.revTx.createdAt).getTime());

        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Form 1: Charge Fee (admin_charge_fee) */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const feeCents = parseStrictEurToCents(feeAmount);
                  if (!feeUserId || feeCents === null || feeCents <= 0) {
                    onError('Select an investor and enter a positive fee amount in euros.');
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
                    <label htmlFor="fin-fee-investor" className="block text-[#B6C4C9] font-semibold mb-1">Investor</label>
                    <select
                      id="fin-fee-investor"
                      value={feeUserId}
                      onChange={(e) => setFeeUserId(e.target.value)}
                      className="w-full min-h-[44px] px-3 py-2 bg-[#0B0F10] border border-[#1F2C33] rounded-xl text-[#F2F5F4]"
                    >
                      {selectableUsers.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.fullName || u.email} ({u.email})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="fin-fee-amount" className="block text-[#B6C4C9] font-semibold mb-1">Fee Amount (EUR)</label>
                    <input
                      id="fin-fee-amount"
                      type="number"
                      min={0.01}
                      step="0.01"
                      required
                      value={feeAmount}
                      onChange={(e) => setFeeAmount(e.target.value)}
                      className="w-full min-h-[44px] px-3 py-2 bg-[#0B0F10] border border-[#1F2C33] rounded-xl font-mono text-[#F2F5F4]"
                    />
                  </div>

                  <div>
                    <label htmlFor="fin-fee-reason" className="block text-[#B6C4C9] font-semibold mb-1">Fee Description / Note</label>
                    <input
                      id="fin-fee-reason"
                      type="text"
                      value={feeReason}
                      onChange={(e) => setFeeReason(e.target.value)}
                      placeholder="Custody or wire fee reason"
                      className="w-full min-h-[44px] px-3 py-2 bg-[#0B0F10] border border-[#1F2C33] rounded-xl text-[#F2F5F4]"
                    />
                  </div>

                  <div className="p-3 rounded-xl bg-[#0B0F10] border border-[#1F2C33] space-y-1.5 tabular-nums">
                    <div className="flex items-center justify-between">
                      <span className="text-[#8FA1A8]">Current Balance</span>
                      <span className="font-bold text-[#F2F5F4]">
                        {formatCentsEur(feeCurCents)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between border-t border-[#1F2C33] pt-1.5">
                      <span className="text-[#8FA1A8]">Resulting Balance</span>
                      <span className={`font-bold ${feeResultingCents < 0 ? 'text-rose-400' : 'text-[#6FD8B0]'}`}>
                        {formatCentsEur(feeResultingCents)}
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  className="min-h-[44px] w-full py-2.5 rounded-xl bg-[#6FD8B0] hover:bg-[#5ec8a0] text-[#0B0F10] text-xs font-bold cursor-pointer"
                >
                  Review &amp; Charge Fee
                </button>
              </form>

              {/* Form 2: Adjust Balance (admin_adjust) */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const rawCents = parseStrictEurToCents(adjAmount);
                  if (!adjUserId || rawCents === null || rawCents <= 0 || !adjReason.trim()) {
                    onError('Select an investor, enter a positive amount in euros, and enter a required reason.');
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
                    <label htmlFor="fin-adj-investor" className="block text-[#B6C4C9] font-semibold mb-1">Investor</label>
                    <select
                      id="fin-adj-investor"
                      value={adjUserId}
                      onChange={(e) => setAdjUserId(e.target.value)}
                      className="w-full min-h-[44px] px-3 py-2 bg-[#0B0F10] border border-[#1F2C33] rounded-xl text-[#F2F5F4]"
                    >
                      {selectableUsers.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.fullName || u.email} ({u.email})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setAdjDirection('credit')}
                      className={`min-h-[44px] py-2 rounded-xl text-xs font-bold cursor-pointer ${
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
                      className={`min-h-[44px] py-2 rounded-xl text-xs font-bold cursor-pointer ${
                        adjDirection === 'debit'
                          ? 'bg-rose-600 text-white'
                          : 'bg-[#0B0F10] border border-[#1F2C33] text-[#B6C4C9]'
                      }`}
                    >
                      Debit (−)
                    </button>
                  </div>

                  <div>
                    <label htmlFor="fin-adj-amount" className="block text-[#B6C4C9] font-semibold mb-1">Amount (EUR)</label>
                    <input
                      id="fin-adj-amount"
                      type="number"
                      min={0.01}
                      step="0.01"
                      required
                      value={adjAmount}
                      onChange={(e) => setAdjAmount(e.target.value)}
                      className="w-full min-h-[44px] px-3 py-2 bg-[#0B0F10] border border-[#1F2C33] rounded-xl font-mono text-[#F2F5F4]"
                    />
                  </div>

                  <div>
                    <label htmlFor="fin-adj-reason" className="block text-[#B6C4C9] font-semibold mb-1">Required Reason</label>
                    <input
                      id="fin-adj-reason"
                      type="text"
                      required
                      minLength={3}
                      value={adjReason}
                      onChange={(e) => setAdjReason(e.target.value)}
                      placeholder="Audit explanation (min 3 characters)"
                      className="w-full min-h-[44px] px-3 py-2 bg-[#0B0F10] border border-[#1F2C33] rounded-xl text-[#F2F5F4]"
                    />
                  </div>

                  <div className="p-3 rounded-xl bg-[#0B0F10] border border-[#1F2C33] space-y-1.5 tabular-nums">
                    <div className="flex items-center justify-between">
                      <span className="text-[#8FA1A8]">Current Balance</span>
                      <span className="font-bold text-[#F2F5F4]">
                        {formatCentsEur(adjCurCents)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between border-t border-[#1F2C33] pt-1.5">
                      <span className="text-[#8FA1A8]">Resulting Balance</span>
                      <span className={`font-bold ${adjResultingCents < 0 ? 'text-rose-400' : 'text-[#6FD8B0]'}`}>
                        {formatCentsEur(adjResultingCents)}
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  className="min-h-[44px] w-full py-2.5 rounded-xl bg-[#6FD8B0] hover:bg-[#5ec8a0] text-[#0B0F10] text-xs font-bold cursor-pointer"
                >
                  Review &amp; Apply Adjustment
                </button>
              </form>

              {/* Form 3: Reverse a Transaction (reverse_transaction) */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!selectedRevTx || !revReason.trim()) {
                    onError('Select a completed transaction and enter a reversal reason.');
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
                    <label htmlFor="fin-rev-tx-select" className="block text-[#B6C4C9] font-semibold mb-1">
                      Completed Transaction ({reversibleTransactions.length} eligible)
                    </label>
                    <input
                      id="fin-rev-tx-search"
                      type="text"
                      value={revTxSearch}
                      onChange={(e) => setRevTxSearch(e.target.value)}
                      aria-label="Filter completed transactions by reference or email"
                      placeholder="Filter completed tx by ref or email..."
                      className="w-full min-h-[44px] px-3 py-2 mb-2 bg-[#0B0F10] border border-[#1F2C33] rounded-xl text-[#F2F5F4]"
                    />
                    <select
                      id="fin-rev-tx-select"
                      value={revTxId}
                      onChange={(e) => setRevTxId(e.target.value)}
                      className="w-full min-h-[44px] px-3 py-2 bg-[#0B0F10] border border-[#1F2C33] rounded-xl text-[#F2F5F4]"
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

                  <div>
                    <label htmlFor="fin-rev-reason" className="block text-[#B6C4C9] font-semibold mb-1">Required Reversal Reason</label>
                    <input
                      id="fin-rev-reason"
                      type="text"
                      required
                      minLength={3}
                      value={revReason}
                      onChange={(e) => setRevReason(e.target.value)}
                      placeholder="e.g. Duplicate wire booked in error"
                      className="w-full min-h-[44px] px-3 py-2 bg-[#0B0F10] border border-[#1F2C33] rounded-xl text-[#F2F5F4]"
                    />
                  </div>

                  <div className="p-3 rounded-xl bg-[#0B0F10] border border-[#1F2C33] space-y-1.5 tabular-nums">
                    <div className="flex items-center justify-between">
                      <span className="text-[#8FA1A8]">Current Balance</span>
                      <span className="font-bold text-[#F2F5F4]">{formatCentsEur(revCurCents)}</span>
                    </div>
                    {selectedRevTx && (
                      <>
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-[#8FA1A8]">Reversal Wallet Impact</span>
                          <span className="font-mono font-semibold text-[#F2F5F4]">
                            {revDeltaFormCents >= 0 ? '+' : '−'}
                            {formatCentsEur(Math.abs(revDeltaFormCents))}
                          </span>
                        </div>
                        <div className="flex items-center justify-between border-t border-[#1F2C33] pt-1.5">
                          <span className="text-[#8FA1A8]">Resulting Balance</span>
                          <span className={`font-bold ${revResultingCents < 0 ? 'text-rose-400' : 'text-[#6FD8B0]'}`}>
                            {formatCentsEur(revResultingCents)}
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={!selectedRevTx}
                  className="min-h-[44px] w-full py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold cursor-pointer disabled:opacity-40"
                >
                  Review &amp; Reverse Transaction
                </button>
              </form>
            </div>

            {/* Linked Reversals & Originals Audit Panel */}
            <div className="bg-[#121A1F] border border-[#1F2C33] rounded-2xl overflow-hidden">
              <div className="p-4 bg-[#0B0F10] border-b border-[#1F2C33] flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-[#F2F5F4] flex items-center gap-2">
                    <Link2 className="w-4 h-4 text-[#6FD8B0]" />
                    <span>Reversals &amp; Linked Original Transactions</span>
                  </h3>
                  <p className="text-[11px] text-[#8FA1A8]">
                    Click any reference to jump directly to that entry in the full Ledger.
                  </p>
                </div>
                <span className="text-xs font-mono text-[#8FA1A8] tabular-nums">
                  {reversalPairs.length} link{reversalPairs.length === 1 ? '' : 's'}
                </span>
              </div>
              {reversalPairs.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-[#1F2C33] text-[11px] font-semibold text-[#8FA1A8] uppercase tracking-wider">
                        <th className="py-2.5 px-4">Reversal Entry</th>
                        <th className="py-2.5 px-4">Linked Original Transaction</th>
                        <th className="py-2.5 px-4">Investor</th>
                        <th className="py-2.5 px-4 text-right">Amount</th>
                        <th className="py-2.5 px-4">Reason</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1F2C33]">
                      {reversalPairs.slice(0, 20).map(({ revTx, orig, inv }) => (
                        <tr key={revTx.id} className="hover:bg-[#162026]">
                          <td className="py-3 px-4">
                            <button
                              type="button"
                              onClick={() => {
                                focusLinkedTransaction(revTx.id);
                                switchTab('ledger');
                              }}
                              className="min-h-[44px] font-mono font-semibold text-rose-300 hover:underline inline-flex items-center gap-1 cursor-pointer"
                            >
                              <Link2 className="w-3 h-3 shrink-0" />
                              <span>{revTx.reference || revTx.id}</span>
                            </button>
                            <div className="text-[11px] text-[#8FA1A8]">{formatDate(revTx.createdAt)}</div>
                          </td>
                          <td className="py-3 px-4">
                            {revTx.reversalOfId || revTx.reversalOfReference || orig ? (
                              <button
                                type="button"
                                onClick={() => {
                                  if (orig?.id || revTx.reversalOfId) {
                                    focusLinkedTransaction(orig?.id || revTx.reversalOfId);
                                    switchTab('ledger');
                                  }
                                }}
                                className="min-h-[44px] font-mono font-semibold text-amber-300 hover:underline inline-flex items-center gap-1 cursor-pointer"
                              >
                                <Link2 className="w-3 h-3 shrink-0" />
                                <span>
                                  {revTx.reversalOfReference || orig?.reference || revTx.reversalOfId}
                                  {orig ? ` (${String(orig.type).toUpperCase()})` : ''}
                                </span>
                              </button>
                            ) : (
                              <span className="text-[#8FA1A8]">—</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-[#B6C4C9]">{inv?.email || revTx.userEmail || revTx.userId}</td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-[#F2F5F4] tabular-nums">
                            {formatCentsEur(eurToCents(revTx.amount))}
                          </td>
                          <td className="py-3 px-4 text-[#B6C4C9]">{revTx.description || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-6 text-center text-xs text-[#8FA1A8]">
                  No transaction reversals recorded yet. When a completed transaction is reversed, the reversal entry and original entry will appear linked here.
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* ===================================================================== */}
      {/* TAB 5: INVESTMENTS & DISTRIBUTIONS                                    */}
      {/* ===================================================================== */}
      {activeTab === 'investments' && (
        <div className="space-y-6">
          {/* Pending Investment Requests Queue (approve_investment_request / reject_investment_request) */}
          <InvestmentRequestsQueuePanel
            loading={loading}
            requests={investmentRequests}
            users={users}
            properties={properties}
            onRefresh={async () => {
              await onRefresh();
              await loadFinanceOverview();
            }}
            onSuccess={onSuccess}
            onError={onError}
          />

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
                  <label htmlFor="fin-inv-investor" className="block text-[#B6C4C9] font-semibold mb-1">Investor</label>
                  <select
                    id="fin-inv-investor"
                    value={invUserId}
                    onChange={(e) => setInvUserId(e.target.value)}
                    className="w-full min-h-[44px] px-3 py-2 bg-[#0B0F10] border border-[#1F2C33] rounded-xl text-[#F2F5F4]"
                  >
                    {selectableUsers.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.fullName || u.email} ({formatCentsEur(eurToCents(u.walletBalance))} cash)
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="fin-inv-property" className="block text-[#B6C4C9] font-semibold mb-1">Property</label>
                  <select
                    id="fin-inv-property"
                    value={invPropId}
                    onChange={(e) => setInvPropId(e.target.value)}
                    className="w-full min-h-[44px] px-3 py-2 bg-[#0B0F10] border border-[#1F2C33] rounded-xl text-[#F2F5F4]"
                  >
                    {properties.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.title} ({formatCentsEur(eurToCents(p.tokenPrice))} / share)
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="fin-inv-shares" className="block text-[#B6C4C9] font-semibold mb-1">Shares</label>
                  <input
                    id="fin-inv-shares"
                    type="number"
                    min={1}
                    required
                    value={invShares}
                    onChange={(e) => setInvShares(Math.max(1, Math.floor(Number(e.target.value) || 1)))}
                    className="w-full min-h-[44px] px-3 py-2 bg-[#0B0F10] border border-[#1F2C33] rounded-xl font-mono text-[#F2F5F4]"
                  />
                </div>
                <div className="p-3 rounded-xl bg-[#0B0F10] border border-[#1F2C33] flex items-center justify-between tabular-nums">
                  <span className="text-[#8FA1A8]">Allocation Cost</span>
                  <span className="font-bold text-[#6FD8B0]">{formatCentsEur(calculatedInvCostCents)}</span>
                </div>
              </div>
              <button
                type="submit"
                disabled={calculatedInvCostCents <= 0}
                className="min-h-[44px] w-full py-2.5 rounded-xl bg-[#6FD8B0] hover:bg-[#5ec8a0] text-[#0B0F10] text-xs font-bold cursor-pointer disabled:opacity-50"
              >
                Review &amp; Record Investment
              </button>
            </form>

            {/* Pay Distribution Form (pay_distribution w/ confirmation preview modal) */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const distCents = parseStrictEurToCents(distAmountEur);
                if (!activeDistProp?.id || distCents === null || distCents <= 0) {
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
                  <label htmlFor="fin-dist-property" className="block text-[#B6C4C9] font-semibold mb-1">Property</label>
                  <select
                    id="fin-dist-property"
                    value={activeDistProp?.id || ''}
                    onChange={(e) => setDistPropId(e.target.value)}
                    className="w-full min-h-[44px] px-3 py-2 bg-[#0B0F10] border border-[#1F2C33] rounded-xl text-[#F2F5F4]"
                  >
                    {properties.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.title}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="fin-dist-amount" className="block text-[#B6C4C9] font-semibold mb-1">Total Payout (EUR)</label>
                  <input
                    id="fin-dist-amount"
                    type="number"
                    min={1}
                    step="0.01"
                    required
                    value={distAmountEur}
                    onChange={(e) => setDistAmountEur(Number(e.target.value))}
                    className="w-full min-h-[44px] px-3 py-2 bg-[#0B0F10] border border-[#1F2C33] rounded-xl font-mono text-[#F2F5F4]"
                  />
                </div>
                <div>
                  <label htmlFor="fin-dist-note" className="block text-[#B6C4C9] font-semibold mb-1">Distribution Note</label>
                  <input
                    id="fin-dist-note"
                    type="text"
                    value={distNote}
                    onChange={(e) => setDistNote(e.target.value)}
                    placeholder="Q4 Rental Dividend"
                    className="w-full min-h-[44px] px-3 py-2 bg-[#0B0F10] border border-[#1F2C33] rounded-xl text-[#F2F5F4]"
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
                className="min-h-[44px] w-full py-2.5 rounded-xl bg-[#6FD8B0] hover:bg-[#5ec8a0] text-[#0B0F10] text-xs font-bold cursor-pointer disabled:opacity-50"
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
                aria-label="Search ledger by reference, investor, or processor"
                placeholder="Search reference, investor, processor..."
                className="w-full min-h-[44px] pl-9 pr-3 py-2 bg-[#0B0F10] border border-[#1F2C33] rounded-xl text-[#F2F5F4]"
              />
            </div>

            <select
              value={ledgerInvestorFilter}
              onChange={(e) => {
                setLedgerInvestorFilter(e.target.value);
                setLedgerPage(1);
              }}
              aria-label="Filter ledger by investor"
              className="min-h-[44px] px-3 py-2 bg-[#0B0F10] border border-[#1F2C33] rounded-xl text-[#F2F5F4]"
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
              aria-label="Filter ledger by transaction kind"
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
              value={ledgerStatusFilter}
              onChange={(e) => {
                setLedgerStatusFilter(e.target.value);
                setLedgerPage(1);
              }}
              aria-label="Filter ledger by status"
              className="min-h-[44px] px-3 py-2 bg-[#0B0F10] border border-[#1F2C33] rounded-xl text-[#F2F5F4]"
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
              className="min-h-[44px] px-3 py-2 rounded-xl bg-[#0B0F10] border border-[#1F2C33] hover:border-[#6FD8B0] text-xs font-semibold text-[#F2F5F4] inline-flex items-center justify-center gap-1.5 cursor-pointer"
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
                aria-label="Ledger from date"
                className="min-h-[44px] px-3 py-2 bg-[#0B0F10] border border-[#1F2C33] rounded-xl text-[#F2F5F4]"
              />
              <span className="text-[#8FA1A8]">to</span>
              <input
                type="date"
                value={ledgerToDate}
                onChange={(e) => {
                  setLedgerToDate(e.target.value);
                  setLedgerPage(1);
                }}
                aria-label="Ledger to date"
                className="min-h-[44px] px-3 py-2 bg-[#0B0F10] border border-[#1F2C33] rounded-xl text-[#F2F5F4]"
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
                  className="min-h-[44px] px-2 text-[#6FD8B0] font-semibold hover:underline cursor-pointer"
                >
                  Reset Filters
                </button>
              )}
            </div>
          </div>

          {loading ? (
            <div className="space-y-3" role="status" aria-label="Loading finance ledger">
              <div className="rounded-2xl border border-[#1F2C33] overflow-hidden bg-[#121A1F]">
                {Array.from({ length: 6 }, (_, index) => (
                  <div key={index} className="grid grid-cols-8 gap-3 p-4 border-b border-[#1F2C33]">
                    {Array.from({ length: 8 }, (_, cell) => (
                      <div key={cell} className="h-4 rounded bg-[#1F2C33] animate-pulse" />
                    ))}
                  </div>
                ))}
              </div>
            </div>
          ) : (
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
                              className="min-h-[44px] inline-flex items-center gap-1 text-[11px] font-mono text-amber-300 hover:underline cursor-pointer"
                            >
                              <Link2 className="w-3 h-3 shrink-0" />
                              <span>Orig: {tx.reversalOfReference || originalTarget?.reference || tx.reversalOfId}</span>
                            </button>
                          ) : tx.reversedById ? (
                            <button
                              type="button"
                              onClick={() => focusLinkedTransaction(tx.reversedById)}
                              className="min-h-[44px] inline-flex items-center gap-1 text-[11px] font-mono text-rose-300 hover:underline cursor-pointer"
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
                    className="min-h-[44px] px-3.5 py-2 rounded-xl bg-[#121A1F] border border-[#1F2C33] text-[#F2F5F4] disabled:opacity-40 cursor-pointer"
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    disabled={safeLedgerPage >= ledgerTotalPages}
                    onClick={() => setLedgerPage((p) => Math.min(ledgerTotalPages, p + 1))}
                    className="min-h-[44px] px-3.5 py-2 rounded-xl bg-[#121A1F] border border-[#1F2C33] text-[#F2F5F4] disabled:opacity-40 cursor-pointer"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
          )}
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
              className="min-h-[44px] whitespace-nowrap px-4 py-2 rounded-xl bg-[#6FD8B0] hover:bg-[#5ec8a0] text-[#0B0F10] text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
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
                    className="min-h-[44px] px-3.5 py-2 rounded-xl bg-[#0B0F10] border border-[#1F2C33] hover:border-[#6FD8B0] text-xs font-semibold text-[#F2F5F4] inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Edit</span>
                  </button>
                  <button
                    type="button"
                    disabled={busyGateId === g.id}
                    onClick={() => handleToggleGateActive(g)}
                    className="min-h-[44px] px-3.5 py-2 rounded-xl bg-[#0B0F10] border border-[#1F2C33] hover:border-[#6FD8B0] text-xs font-semibold text-[#6FD8B0] cursor-pointer disabled:opacity-50"
                  >
                    {g.active ? 'Deactivate' : 'Activate'}
                  </button>
                  <button
                    type="button"
                    disabled={g.assignedCount > 0 || busyGateId === g.id}
                    title={g.assignedCount > 0 ? 'Assigned gates cannot be deleted; deactivate instead' : 'Delete gate'}
                    onClick={() => handleDeleteGate(g)}
                    className="min-h-[44px] px-3.5 py-2 rounded-xl bg-[#0B0F10] border border-rose-500/30 text-rose-300 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-35 disabled:cursor-not-allowed"
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
                  aria-label="Search investors for payment gate assignment"
                  placeholder="Search investor..."
                  className="min-h-[44px] pl-8 pr-3 py-2 bg-[#121A1F] border border-[#1F2C33] rounded-xl text-xs text-[#F2F5F4]"
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
                            disabled={assignBusyUid === inv.id}
                            value={inv.assignedGateId || ''}
                            onChange={(e) => handleAssignGateToInvestor(inv.id, e.target.value)}
                            aria-label={`Assign payment gate for ${inv.fullName || inv.email}`}
                            className="min-h-[44px] px-3 py-2 bg-[#0B0F10] border border-[#1F2C33] rounded-xl text-xs text-[#F2F5F4]"
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

      {/* Approve Deposit Dialog */}
      {(() => {
        const trimmedAmt = receivedAmount.trim();
        const requestedCents = approveDepTarget ? eurToCents(approveDepTarget.amount) : 0;
        const parsedCents = trimmedAmt === '' ? requestedCents : parseStrictEurToCents(trimmedAmt);
        const creditCents = parsedCents !== null && parsedCents > 0 ? parsedCents : requestedCents;
        const differsFromRequested =
          Boolean(approveDepTarget) && parsedCents !== null && parsedCents !== requestedCents;
        const refreshAll = async () => {
          await onRefresh();
          await loadFinanceOverview();
        };
        return (
          <AdminActionDialog
            open={Boolean(approveDepTarget)}
            actionName="Approve deposit"
            confirmLabel="Approve deposit"
            investorName={approveDepTarget?.investorName || 'Investor'}
            investorEmail={approveDepTarget?.investorEmail || ''}
            amountCents={creditCents}
            reference={approveDepTarget?.reference || ''}
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
              }
              if (differsFromRequested && !checkedBankStatement) {
                return 'Please tick "I checked my bank statement" because the entered amount differs from the requested amount.';
              }
              return null;
            }}
            onConfirm={async () => {
              if (!approveDepTarget) return;
              const explicitCents = trimmedAmt === '' ? undefined : parseStrictEurToCents(trimmedAmt);
              const cleanEur = explicitCents !== undefined && explicitCents !== null ? centsToEur(explicitCents) : undefined;
              await approveDepositSubmission(approveDepTarget.id, cleanEur, approveDepTarget.isManual);
              const finalCents = explicitCents ?? requestedCents;
              setCheckedBankStatement(false);
              return `Deposit approved (${formatCentsEur(finalCents)} credited via approve_deposit).`;
            }}
            onRefresh={refreshAll}
            onRefreshError={onError}
            onSuccess={onSuccess}
            onClose={() => {
              setApproveDepTarget(null);
              setCheckedBankStatement(false);
            }}
          >
            <div className="space-y-3">
              <div>
                <label htmlFor="fin-dep-received-amount" className="block text-xs font-semibold text-[#B6C4C9] mb-1">
                  Amount actually received (EUR)
                </label>
                <input
                  id="fin-dep-received-amount"
                  type="number"
                  min={0.01}
                  step="0.01"
                  value={receivedAmount}
                  placeholder={centsToEur(requestedCents).toFixed(2)}
                  onChange={(e) => setReceivedAmount(e.target.value)}
                  className="w-full min-h-[44px] px-3 py-2 bg-[#0B0F10] border border-[#1F2C33] rounded-xl font-mono text-sm text-[#6FD8B0] font-bold"
                />
              </div>
              {differsFromRequested && (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/40 space-y-2 text-xs">
                  <p className="font-semibold text-amber-300">
                    Different from requested amount (requested {formatCentsEur(requestedCents)})
                  </p>
                  <label htmlFor="fin-dep-checked-bank" className="min-h-[44px] flex items-center gap-2.5 text-[#F2F5F4] cursor-pointer">
                    <input
                      id="fin-dep-checked-bank"
                      type="checkbox"
                      checked={checkedBankStatement}
                      onChange={(e) => setCheckedBankStatement(e.target.checked)}
                      className="w-5 h-5 rounded border-[#1F2C33] bg-[#0B0F10] text-[#6FD8B0]"
                    />
                    <span>I checked my bank statement</span>
                  </label>
                </div>
              )}
            </div>
          </AdminActionDialog>
        );
      })()}

      {/* Reject Deposit Dialog */}
      <AdminActionDialog
        open={Boolean(rejectDepTarget)}
        actionName="Reject deposit"
        confirmLabel="Reject deposit"
        tone="danger"
        investorName={rejectDepTarget?.investorName || 'Investor'}
        investorEmail={rejectDepTarget?.investorEmail || ''}
        amountCents={rejectDepTarget ? eurToCents(rejectDepTarget.amount) : 0}
        reference={rejectDepTarget?.reference || ''}
        validate={() => (!rejectDepReason.trim() ? 'A rejection reason is required.' : null)}
        onConfirm={async () => {
          if (!rejectDepTarget) return;
          await rejectDepositSubmission(rejectDepTarget.id, rejectDepReason.trim(), rejectDepTarget.isManual);
          setRejectDepReason('');
          return 'Deposit rejected via reject_deposit.';
        }}
        onRefresh={async () => {
          await onRefresh();
          await loadFinanceOverview();
        }}
        onRefreshError={onError}
        onSuccess={onSuccess}
        onClose={() => {
          setRejectDepTarget(null);
          setRejectDepReason('');
        }}
      >
        <div>
          <label htmlFor="fin-dep-reject-reason" className="block text-xs font-semibold text-[#B6C4C9] mb-1">
            Rejection Reason *
          </label>
          <textarea
            id="fin-dep-reject-reason"
            rows={3}
            value={rejectDepReason}
            onChange={(e) => setRejectDepReason(e.target.value)}
            placeholder="e.g. Wire transfer not received or reference mismatch..."
            className="w-full p-3 bg-[#0B0F10] border border-[#1F2C33] rounded-xl text-xs text-[#F2F5F4]"
          />
        </div>
      </AdminActionDialog>

      {/* Record Manual Deposit Modal (Step 1 input + Step 2 AdminActionDialog) */}
      {manualDepOpen && (() => {
        const uid = manualDepUserId || selectableUsers[0]?.id || '';
        const targetInv = userById.get(uid) || selectableUsers[0];
        const parsedCents = parseStrictEurToCents(manualDepAmount);
        const amtCents = parsedCents !== null && parsedCents > 0 ? parsedCents : 0;
        const curCents = eurToCents(targetInv?.walletBalance ?? 0);
        const projCents = curCents + amtCents;
        return (
          <>
            {!manualDepConfirmStep && (
              <div
                className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4"
                role="dialog"
                aria-modal="true"
                aria-labelledby="fin-manual-dep-title"
              >
                <form
                  ref={manualDepDialogRef}
                  tabIndex={-1}
                  onSubmit={handleOpenManualDepositConfirm}
                  noValidate
                  className="bg-[#121A1F] border border-[#1F2C33] rounded-2xl max-w-md w-full p-6 space-y-4 focus:outline-none"
                >
                  <div className="flex items-center justify-between border-b border-[#1F2C33] pb-3">
                    <h3 id="fin-manual-dep-title" className="text-sm font-bold text-[#F2F5F4]">Record manual deposit</h3>
                    <button
                      type="button"
                      onClick={() => {
                        setManualDepOpen(false);
                        setManualDepConfirmStep(false);
                      }}
                      aria-label="Close manual deposit modal"
                      className="min-h-[44px] min-w-[44px] -mr-2 inline-flex items-center justify-center rounded-xl text-[#8FA1A8] hover:text-[#F2F5F4] hover:bg-[#162026] cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="space-y-3 text-xs">
                    <div>
                      <label htmlFor="fin-manual-dep-user" className="block text-[#B6C4C9] font-semibold mb-1">Investor</label>
                      <div className="relative mb-2">
                        <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#8FA1A8]" />
                        <input
                          id="fin-manual-dep-search"
                          type="text"
                          value={manualDepSearch}
                          onChange={(e) => setManualDepSearch(e.target.value)}
                          aria-label="Search investor by name or email"
                          placeholder="Search investor by name or email..."
                          className="w-full min-h-[44px] pl-8 pr-3 py-2 bg-[#0B0F10] border border-[#1F2C33] rounded-xl text-[#F2F5F4]"
                        />
                      </div>
                      <select
                        id="fin-manual-dep-user"
                        value={manualDepUserId}
                        onChange={(e) => setManualDepUserId(e.target.value)}
                        className="w-full min-h-[44px] px-3 py-2 bg-[#0B0F10] border border-[#1F2C33] rounded-xl text-[#F2F5F4]"
                      >
                        {filteredManualDepUsers.length === 0 ? (
                          <option value="">No investors match &ldquo;{manualDepSearch}&rdquo;</option>
                        ) : (
                          filteredManualDepUsers.map((u) => (
                            <option key={u.id} value={u.id}>
                              {u.fullName || u.email} ({u.email}) — {formatCentsEur(eurToCents(u.walletBalance))}
                            </option>
                          ))
                        )}
                      </select>
                    </div>
                    <div>
                      <label htmlFor="fin-manual-dep-amount" className="block text-[#B6C4C9] font-semibold mb-1">Amount (EUR)</label>
                      <input
                        id="fin-manual-dep-amount"
                        type="number"
                        min={0.01}
                        step="0.01"
                        value={manualDepAmount}
                        onChange={(e) => setManualDepAmount(e.target.value)}
                        className="w-full min-h-[44px] px-3 py-2 bg-[#0B0F10] border border-[#1F2C33] rounded-xl font-mono text-[#F2F5F4]"
                      />
                    </div>
                    <div>
                      <label htmlFor="fin-manual-dep-note" className="block text-[#B6C4C9] font-semibold mb-1">Note</label>
                      <input
                        id="fin-manual-dep-note"
                        type="text"
                        value={manualDepNote}
                        onChange={(e) => setManualDepNote(e.target.value)}
                        placeholder="Direct bank settlement note or wire ID"
                        className="w-full min-h-[44px] px-3 py-2 bg-[#0B0F10] border border-[#1F2C33] rounded-xl text-[#F2F5F4]"
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
              onRefresh={async () => {
                await onRefresh();
                await loadFinanceOverview();
              }}
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
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="fin-proof-viewer-title"
        >
          <div
            ref={proofViewerRef}
            tabIndex={-1}
            className="bg-[#121A1F] border border-[#1F2C33] rounded-2xl max-w-2xl w-full p-5 space-y-4 focus:outline-none"
          >
            <div className="flex items-center justify-between border-b border-[#1F2C33] pb-3">
              <h3 id="fin-proof-viewer-title" className="text-sm font-bold text-[#F2F5F4]">{proofViewer.title}</h3>
              <button
                type="button"
                onClick={() => setProofViewer(null)}
                aria-label="Close proof viewer"
                className="min-h-[44px] min-w-[44px] -mr-2 inline-flex items-center justify-center rounded-xl text-[#8FA1A8] hover:text-[#F2F5F4] hover:bg-[#162026] cursor-pointer"
              >
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

      {/* Approve Withdrawal Dialog */}
      {(() => {
        const wthCents = approveWthTarget ? eurToCents(approveWthTarget.tx.amount) : 0;
        const parsedFee = parseStrictEurToCents(wthFeeInput.trim() === '' ? '0' : wthFeeInput);
        const feeCents = parsedFee !== null && parsedFee >= 0 ? parsedFee : 0;
        const sendCents = Math.max(0, wthCents - feeCents);
        return (
          <AdminActionDialog
            open={Boolean(approveWthTarget)}
            actionName="Approve withdrawal"
            confirmLabel="Approve withdrawal"
            investorName={approveWthTarget?.inv?.fullName || 'Investor'}
            investorEmail={approveWthTarget?.inv?.email || approveWthTarget?.tx?.userEmail || approveWthTarget?.tx?.userId || ''}
            amountCents={wthCents}
            reference={approveWthTarget?.tx?.reference || approveWthTarget?.tx?.id || ''}
            extraDetails={[
              {
                label: 'Destination IBAN',
                value: approveWthTarget ? (
                  <span className="inline-flex items-center gap-2">
                    <span className="font-mono">{approveWthTarget.iban}</span>
                    <button
                      type="button"
                      onClick={() => handleCopyIban(`modal-${approveWthTarget.tx.id}`, approveWthTarget.iban)}
                      className="min-h-[44px] min-w-[44px] px-2.5 py-1 rounded-xl bg-[#121A1F] border border-[#1F2C33] text-[#6FD8B0] text-[10px] font-semibold cursor-pointer inline-flex items-center justify-center"
                    >
                      {copiedIbanId === `modal-${approveWthTarget.tx.id}` ? 'Copied' : 'Copy'}
                    </button>
                  </span>
                ) : '—',
              },
              { label: 'Withdrawal Fee', value: formatCentsEur(feeCents) },
              { label: 'You send (amount minus fee)', value: formatCentsEur(sendCents), tone: 'accent' },
            ]}
            validate={() => {
              if (!wthPayoutRef.trim()) {
                return 'Payout reference (your bank transfer ID) is required.';
              }
              const fc = parseStrictEurToCents(wthFeeInput.trim() === '' ? '0' : wthFeeInput);
              if (fc === null || fc < 0) {
                return 'Withdrawal fee must be zero or a positive amount in euros.';
              }
              if (fc > wthCents) {
                return 'Withdrawal fee cannot exceed the requested withdrawal amount.';
              }
              if (!sentFromBankChecked) {
                return 'Please tick "I have already sent this payment from my bank" before confirming.';
              }
              return null;
            }}
            onConfirm={async () => {
              if (!approveWthTarget) return;
              const fc = parseStrictEurToCents(wthFeeInput.trim() === '' ? '0' : wthFeeInput) ?? 0;
              const ref = wthPayoutRef.trim();
              await approveWithdrawalRequest(approveWthTarget.tx.id, ref, centsToEur(fc));
              setWthPayoutRef('');
              setSentFromBankChecked(false);
              return `Withdrawal approved (Payout ref: ${ref} · Net sent: ${formatCentsEur(Math.max(0, wthCents - fc))} via approve_withdrawal).`;
            }}
            onRefresh={async () => {
              await onRefresh();
              await loadFinanceOverview();
            }}
            onRefreshError={onError}
            onSuccess={onSuccess}
            onClose={() => {
              setApproveWthTarget(null);
              setWthPayoutRef('');
              setSentFromBankChecked(false);
            }}
          >
            <div className="space-y-3 text-xs">
              <div>
                <label htmlFor="fin-wth-fee" className="block text-[#B6C4C9] font-semibold mb-1">
                  Withdrawal Fee (EUR)
                  {withdrawalFeePct > 0 && (
                    <span className="font-normal text-[#8FA1A8]"> (default {withdrawalFeePct}% from settings.limits)</span>
                  )}
                </label>
                <input
                  id="fin-wth-fee"
                  type="number"
                  min={0}
                  step="0.01"
                  value={wthFeeInput}
                  onChange={(e) => setWthFeeInput(e.target.value)}
                  className="w-full min-h-[44px] px-3 py-2 bg-[#0B0F10] border border-[#1F2C33] rounded-xl font-mono text-[#F2F5F4]"
                />
              </div>
              <div className="p-2.5 rounded-xl bg-[#0B0F10] border border-[#1F2C33] flex items-center justify-between tabular-nums">
                <span className="text-[#8FA1A8]">You send (amount minus fee)</span>
                <span className="font-bold text-[#6FD8B0] font-mono">{formatCentsEur(sendCents)}</span>
              </div>
              <div>
                <label htmlFor="fin-wth-payout-ref" className="block text-[#B6C4C9] font-semibold mb-1">Payout Reference (Bank Transfer ID) *</label>
                <input
                  id="fin-wth-payout-ref"
                  type="text"
                  value={wthPayoutRef}
                  onChange={(e) => setWthPayoutRef(e.target.value)}
                  placeholder="e.g. SEPA-20261116-94821"
                  className="w-full min-h-[44px] px-3 py-2 bg-[#0B0F10] border border-[#1F2C33] rounded-xl font-mono text-[#F2F5F4]"
                />
              </div>
              <label htmlFor="fin-wth-sent-bank" className="min-h-[44px] flex items-center gap-2.5 p-2.5 rounded-xl bg-[#0B0F10] border border-[#1F2C33] text-[#F2F5F4] cursor-pointer">
                <input
                  id="fin-wth-sent-bank"
                  type="checkbox"
                  checked={sentFromBankChecked}
                  onChange={(e) => setSentFromBankChecked(e.target.checked)}
                  className="w-5 h-5 rounded border-[#1F2C33] bg-[#0B0F10] text-[#6FD8B0]"
                />
                <span>I have already sent this payment from my bank</span>
              </label>
            </div>
          </AdminActionDialog>
        );
      })()}

      {/* Reject Withdrawal Dialog */}
      {(() => {
        const wthInv = rejectWthTarget ? userById.get(rejectWthTarget.userId) : undefined;
        const refundCents = rejectWthTarget ? eurToCents(rejectWthTarget.amount) : 0;
        return (
          <AdminActionDialog
            open={Boolean(rejectWthTarget)}
            actionName="Reject withdrawal"
            confirmLabel="Reject withdrawal"
            tone="danger"
            investorName={wthInv?.fullName || 'Investor'}
            investorEmail={wthInv?.email || rejectWthTarget?.userEmail || rejectWthTarget?.userId || ''}
            amountCents={refundCents}
            reference={rejectWthTarget?.reference || rejectWthTarget?.id || ''}
            extraDetails={[
              { label: 'Refund to Wallet', value: formatCentsEur(refundCents), tone: 'accent' },
            ]}
            validate={() => (!rejectWthReason.trim() ? 'A rejection reason is required.' : null)}
            onConfirm={async () => {
              if (!rejectWthTarget) return;
              await rejectWithdrawalRequest(rejectWthTarget.id, rejectWthReason.trim());
              setRejectWthReason('');
              return 'Withdrawal rejected and reserved balance restored via reject_withdrawal.';
            }}
            onRefresh={async () => {
              await onRefresh();
              await loadFinanceOverview();
            }}
            onRefreshError={onError}
            onSuccess={onSuccess}
            onClose={() => {
              setRejectWthTarget(null);
              setRejectWthReason('');
            }}
          >
            <div className="space-y-3">
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200">
                Rejecting this withdrawal cancels the payout and returns{' '}
                <strong className="font-mono">{formatCentsEur(refundCents)}</strong> back to the investor&rsquo;s wallet.
              </div>
              <div>
                <label htmlFor="fin-wth-reject-reason" className="block text-xs font-semibold text-[#B6C4C9] mb-1">
                  Rejection Reason *
                </label>
                <textarea
                  id="fin-wth-reject-reason"
                  rows={3}
                  value={rejectWthReason}
                  onChange={(e) => setRejectWthReason(e.target.value)}
                  placeholder="e.g. Beneficiary IBAN mismatch..."
                  className="w-full p-3 bg-[#0B0F10] border border-[#1F2C33] rounded-xl text-xs text-[#F2F5F4]"
                />
              </div>
            </div>
          </AdminActionDialog>
        );
      })()}

      {/* Confirm Charge Fee Dialog */}
      {(() => {
        const parsedFee = parseStrictEurToCents(feeAmount);
        const feeCents = parsedFee !== null && parsedFee > 0 ? parsedFee : 0;
        const curCents = eurToCents(feeInvestor?.walletBalance ?? 0);
        const projCents = curCents - feeCents;
        return (
          <AdminActionDialog
            open={feeConfirmOpen}
            actionName="Charge fee"
            confirmLabel="Charge fee"
            investorName={feeInvestor?.fullName || 'Investor'}
            investorEmail={feeInvestor?.email || feeUserId}
            amountCents={feeCents}
            reference={`FEE-${feeUserId.slice(0, 8)}`}
            extraDetails={[
              { label: 'Current Balance', value: formatCentsEur(curCents) },
              { label: 'Projected Balance', value: formatCentsEur(projCents), tone: 'accent' },
              { label: 'Reason', value: feeReason.trim() || 'Platform Fee Assessment' },
            ]}
            validate={() => {
              const c = parseStrictEurToCents(feeAmount);
              if (!feeUserId || c === null || c <= 0) {
                return 'Select an investor and enter a positive fee amount in euros.';
              }
              return null;
            }}
            onConfirm={async () => {
              const c = parseStrictEurToCents(feeAmount);
              if (!feeUserId || c === null || c <= 0) {
                throw new Error('Select an investor and enter a positive fee amount in euros.');
              }
              await adminChargeFeeRpc({ userId: feeUserId, amountEur: centsToEur(c), reason: feeReason.trim() || undefined });
              return `Charged ${formatCentsEur(c)} fee to ${feeInvestor?.email || feeUserId} via admin_charge_fee.`;
            }}
            onRefresh={async () => {
              await onRefresh();
              await loadFinanceOverview();
            }}
            onRefreshError={onError}
            onSuccess={onSuccess}
            onClose={() => setFeeConfirmOpen(false)}
          />
        );
      })()}

      {/* Confirm Adjust Balance Dialog */}
      {(() => {
        const parsedRaw = parseStrictEurToCents(adjAmount);
        const rawCents = parsedRaw !== null && parsedRaw > 0 ? parsedRaw : 0;
        const deltaCents = adjDirection === 'credit' ? rawCents : -rawCents;
        const curCents = eurToCents(adjInvestor?.walletBalance ?? 0);
        const projectedCents = curCents + deltaCents;
        return (
          <AdminActionDialog
            open={adjConfirmOpen}
            actionName="Adjust balance"
            confirmLabel="Adjust balance"
            tone={adjDirection === 'debit' ? 'danger' : 'primary'}
            investorName={adjInvestor?.fullName || 'Investor'}
            investorEmail={adjInvestor?.email || adjUserId}
            amountDisplay={`${deltaCents >= 0 ? '+' : '−'}${formatCentsEur(Math.abs(deltaCents))}`}
            reference={`ADJ-${adjUserId.slice(0, 8)}`}
            extraDetails={[
              { label: 'Direction', value: adjDirection === 'credit' ? 'Credit (+)' : 'Debit (−)' },
              { label: 'Current Balance', value: formatCentsEur(curCents) },
              { label: 'Projected Balance', value: formatCentsEur(projectedCents), tone: 'accent' },
              { label: 'Reason', value: adjReason.trim() || '—' },
            ]}
            validate={() => {
              const c = parseStrictEurToCents(adjAmount);
              if (!adjUserId || c === null || c <= 0) {
                return 'Select an investor and enter a positive adjustment amount in euros.';
              }
              if (!adjReason.trim()) {
                return 'An adjustment reason is required.';
              }
              return null;
            }}
            onConfirm={async () => {
              const c = parseStrictEurToCents(adjAmount);
              if (!adjUserId || c === null || c <= 0) {
                throw new Error('Select an investor and enter a positive adjustment amount in euros.');
              }
              const signedCents = adjDirection === 'credit' ? c : -c;
              await adminAdjustBalanceRpc({
                userId: adjUserId,
                deltaEur: centsToEur(signedCents),
                reason: adjReason.trim(),
              });
              setAdjReason('');
              return `Adjusted ${adjInvestor?.email || adjUserId} balance by ${signedCents >= 0 ? '+' : '−'}${formatCentsEur(Math.abs(signedCents))} via admin_adjust.`;
            }}
            onRefresh={async () => {
              await onRefresh();
              await loadFinanceOverview();
            }}
            onRefreshError={onError}
            onSuccess={onSuccess}
            onClose={() => setAdjConfirmOpen(false)}
          />
        );
      })()}

      {/* Confirm Reverse Transaction Dialog */}
      {(() => {
        const deltaCents = selectedRevTx ? getReversalDeltaCents(selectedRevTx) : 0;
        const curCents = eurToCents(revInvestor?.walletBalance ?? 0);
        const projectedCents = curCents + deltaCents;
        const origCents = selectedRevTx ? eurToCents(selectedRevTx.amount) : 0;
        return (
          <AdminActionDialog
            open={revConfirmOpen && Boolean(selectedRevTx)}
            actionName="Reverse transaction"
            confirmLabel="Reverse transaction"
            tone="danger"
            investorName={revInvestor?.fullName || 'Investor'}
            investorEmail={revInvestor?.email || selectedRevTx?.userId || ''}
            amountCents={origCents}
            reference={selectedRevTx?.reference || selectedRevTx?.id || ''}
            extraDetails={[
              { label: 'Original Type', value: String(selectedRevTx?.type || 'transaction').toUpperCase() },
              { label: 'Reversal Wallet Delta', value: `${deltaCents >= 0 ? '+' : '−'}${formatCentsEur(Math.abs(deltaCents))}` },
              { label: 'Current Balance', value: formatCentsEur(curCents) },
              { label: 'Projected Balance', value: formatCentsEur(projectedCents), tone: 'accent' },
              { label: 'Reason', value: revReason.trim() || '—' },
            ]}
            validate={() => {
              if (!selectedRevTx) return 'Select a completed transaction to reverse.';
              if (!revReason.trim()) return 'A reversal reason is required.';
              return null;
            }}
            onConfirm={async () => {
              if (!selectedRevTx) throw new Error('Select a completed transaction to reverse.');
              await reverseTransactionRpc({ transactionId: selectedRevTx.id, reason: revReason.trim() });
              setRevReason('');
              return `Reversed transaction ${selectedRevTx.reference} via reverse_transaction.`;
            }}
            onRefresh={async () => {
              await onRefresh();
              await loadFinanceOverview();
            }}
            onRefreshError={onError}
            onSuccess={onSuccess}
            onClose={() => setRevConfirmOpen(false)}
          />
        );
      })()}

      {/* Confirm Record Investment Dialog */}
      {(() => {
        const curCents = eurToCents(activeInvInvestor?.walletBalance ?? 0);
        const projectedCents = curCents - calculatedInvCostCents;
        return (
          <AdminActionDialog
            open={invConfirmOpen}
            actionName="Record investment"
            confirmLabel="Record investment"
            investorName={activeInvInvestor?.fullName || 'Investor'}
            investorEmail={activeInvInvestor?.email || invUserId}
            amountCents={calculatedInvCostCents}
            reference={activeInvProp?.id || invPropId}
            extraDetails={[
              { label: 'Property', value: activeInvProp?.title || invPropId },
              { label: 'Shares', value: Math.floor(invShares).toLocaleString(), tone: 'mono' },
              { label: 'Current Balance', value: formatCentsEur(curCents) },
              { label: 'Projected Balance', value: formatCentsEur(projectedCents), tone: 'accent' },
            ]}
            validate={() => {
              const uid = invUserId || selectableUsers[0]?.id;
              const pid = invPropId || properties[0]?.id;
              if (!uid || !pid || invShares <= 0 || calculatedInvCostCents <= 0) {
                return 'Select an investor, a property, and enter positive shares.';
              }
              return null;
            }}
            onConfirm={async () => {
              const uid = invUserId || selectableUsers[0]?.id;
              const pid = invPropId || properties[0]?.id;
              if (!uid || !pid || invShares <= 0) {
                throw new Error('Select an investor, a property, and enter positive shares.');
              }
              await recordInvestmentRpc({
                userId: uid,
                propertyId: pid,
                shares: Math.floor(invShares),
                sharePriceEur: centsToEur(eurToCents(activeInvProp?.tokenPrice || 500)),
              });
              return `Recorded ${Math.floor(invShares)} shares (${formatCentsEur(calculatedInvCostCents)}) via record_investment.`;
            }}
            onRefresh={async () => {
              await onRefresh();
              await loadFinanceOverview();
            }}
            onRefreshError={onError}
            onSuccess={onSuccess}
            onClose={() => setInvConfirmOpen(false)}
          />
        );
      })()}

      {/* Pay Distribution Per-Investor Preview Confirmation Dialog */}
      <AdminActionDialog
        open={distPreviewModalOpen}
        actionName="Pay distribution"
        confirmLabel="Pay distribution"
        investorName={`${distPreview.rows.length} holder(s)`}
        investorEmail={activeDistProp?.title || distPropId}
        amountCents={distPreview.totalCents}
        reference={activeDistProp?.id || distPropId}
        extraDetails={[
          { label: 'Total Shares', value: distPreview.totalShares.toLocaleString(), tone: 'mono' },
          { label: 'Note', value: distNote.trim() || 'Distribution payout' },
        ]}
        validate={() => {
          const totalCents = parseStrictEurToCents(distAmountEur);
          if (!activeDistProp?.id || totalCents === null || totalCents <= 0) {
            return 'Select a property and enter a positive distribution total.';
          }
          if (distPreview.rows.length === 0) {
            return 'No active holders found on this property.';
          }
          return null;
        }}
        onConfirm={async () => {
          const totalCents = parseStrictEurToCents(distAmountEur);
          if (!activeDistProp?.id || totalCents === null || totalCents <= 0) {
            throw new Error('Select a property and enter a positive distribution total.');
          }
          const res = await executePayDistribution({
            propertyId: activeDistProp.id,
            totalAmountEur: centsToEur(totalCents),
            note: distNote.trim() || undefined,
          });
          const paidDisplay = res.paidCount > 0 ? res.paidCount : distPreview.rows.length;
          setDistNote('');
          return `Paid ${formatCentsEur(totalCents)} across ${paidDisplay} investor${paidDisplay === 1 ? '' : 's'} via pay_distribution.`;
        }}
        onRefresh={async () => {
          await onRefresh();
          await loadFinanceOverview();
        }}
        onRefreshError={onError}
        onSuccess={onSuccess}
        onClose={() => setDistPreviewModalOpen(false)}
      >
        <div className="bg-[#0B0F10] border border-[#1F2C33] rounded-xl overflow-hidden max-h-56 overflow-y-auto">
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
      </AdminActionDialog>

      {/* Add / Edit Payment Gate Modal */}
      {gateModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-labelledby="fin-gate-modal-title"
        >
          <form
            ref={gateModalRef}
            tabIndex={-1}
            onSubmit={handleSaveGate}
            className="bg-[#121A1F] border border-[#1F2C33] rounded-2xl max-w-lg w-full p-6 space-y-4 my-8 focus:outline-none"
          >
            <div className="flex items-center justify-between border-b border-[#1F2C33] pb-3">
              <h3 id="fin-gate-modal-title" className="text-sm font-bold text-[#F2F5F4]">
                {editingGateId ? 'Edit Payment Gate' : 'Add Payment Gate'}
              </h3>
              <button
                type="button"
                onClick={() => setGateModalOpen(false)}
                aria-label="Close payment gate dialog"
                className="min-h-[44px] min-w-[44px] -mr-2 inline-flex items-center justify-center rounded-xl text-[#8FA1A8] hover:text-[#F2F5F4] hover:bg-[#162026] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="fin-gate-name" className="block text-[#B6C4C9] font-semibold mb-1">Gate Name</label>
                  <input
                    id="fin-gate-name"
                    type="text"
                    required
                    value={gateName}
                    onChange={(e) => setGateName(e.target.value)}
                    placeholder="EU SEPA Institutional Wire"
                    className="w-full min-h-[44px] px-3 py-2 bg-[#0B0F10] border border-[#1F2C33] rounded-xl text-[#F2F5F4]"
                  />
                </div>
                <div>
                  <label htmlFor="fin-gate-method" className="block text-[#B6C4C9] font-semibold mb-1">Method</label>
                  <input
                    id="fin-gate-method"
                    type="text"
                    required
                    value={gateMethod}
                    onChange={(e) => setGateMethod(e.target.value)}
                    aria-label="Payment method"
                    className="w-full min-h-[44px] px-3 py-2 bg-[#0B0F10] border border-[#1F2C33] rounded-xl font-mono text-[#F2F5F4]"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[#B6C4C9] font-semibold">Bank / Rail Coordinates</span>
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
                      value={row.label}
                      onChange={(e) =>
                        setGateDetails((p) => p.map((r, i) => (i === idx ? { ...r, label: e.target.value } : r)))
                      }
                      aria-label={`Coordinate label row ${idx + 1}`}
                      placeholder="Label (e.g. IBAN)"
                      className="w-2/5 min-h-[44px] px-3 py-2 bg-[#0B0F10] border border-[#1F2C33] rounded-xl text-[#F2F5F4]"
                    />
                    <input
                      type="text"
                      value={row.value}
                      onChange={(e) =>
                        setGateDetails((p) => p.map((r, i) => (i === idx ? { ...r, value: e.target.value } : r)))
                      }
                      aria-label={`Coordinate value row ${idx + 1}`}
                      placeholder="Value"
                      className="flex-1 min-h-[44px] px-3 py-2 bg-[#0B0F10] border border-[#1F2C33] rounded-xl font-mono text-[#F2F5F4]"
                    />
                    <button
                      type="button"
                      onClick={() => setGateDetails((p) => p.filter((_, i) => i !== idx))}
                      aria-label={`Remove coordinate row ${idx + 1}`}
                      className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-xl bg-[#0B0F10] border border-[#1F2C33] text-[#8FA1A8] hover:text-rose-400 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
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
                <label htmlFor="fin-gate-instructions" className="block text-[#B6C4C9] font-semibold mb-1">Instructions</label>
                <textarea
                  id="fin-gate-instructions"
                  rows={3}
                  value={gateInstructions}
                  onChange={(e) => setGateInstructions(e.target.value)}
                  placeholder="Include your unique payment reference in the wire memo..."
                  className="w-full p-3 bg-[#0B0F10] border border-[#1F2C33] rounded-xl text-[#F2F5F4]"
                />
              </div>

              <label htmlFor="fin-gate-active" className="min-h-[44px] flex items-center gap-2.5 text-[#F2F5F4] font-semibold cursor-pointer">
                <input
                  id="fin-gate-active"
                  type="checkbox"
                  checked={gateActive}
                  onChange={(e) => setGateActive(e.target.checked)}
                  className="w-5 h-5 rounded accent-[#6FD8B0]"
                />
                <span>Gate Active</span>
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
