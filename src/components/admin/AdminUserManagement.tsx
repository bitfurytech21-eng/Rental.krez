import React, { useMemo, useState } from 'react';
import { User, getAccountTypeLabel } from '../../types/user';
import { formatDate } from '../../lib/utils';
import { printUserDirectoryReport, UserDirectoryPrintData } from '../../lib/printService';
import {
  InvestorDocumentRow,
  PaymentGateRecord,
  assignPaymentGateToInvestor,
  createPrivateBucketSignedUrl,
  eurToCents,
  formatCentsEur,
  maskIban,
  sendAdminNotificationRecord,
  setInvestorFrozenState,
} from './adminSupabaseGateway';
import { AdminActionDialog, useDialogFocus } from './AdminActionDialog';
import {
  Users,
  Search,
  Printer,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  Wallet,
  X,
  RefreshCw,
  ArrowLeft,
  Send,
  CreditCard,
  Building2,
  FileText,
  Receipt,
  CheckCircle2,
} from 'lucide-react';

interface AdminUserManagementProps {
  users: User[];
  investments?: any[];
  transactions?: any[];
  documents?: InvestorDocumentRow[];
  paymentGates?: PaymentGateRecord[];
  currentAdminEmail: string;
  readOnly?: boolean;
  onRefreshAll: () => Promise<void> | void;
  onQuickSuccess: (msg: string) => void;
  onQuickError: (msg: string) => void;
  onNavigateToManualCredit?: (userId: string) => void;
}

export const AdminUserManagement: React.FC<AdminUserManagementProps> = ({
  users,
  investments = [],
  transactions = [],
  documents = [],
  paymentGates = [],
  currentAdminEmail,
  readOnly = false,
  onRefreshAll,
  onQuickSuccess,
  onQuickError,
  onNavigateToManualCredit,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [frozenFilter, setFrozenFilter] = useState<'all' | 'active' | 'frozen'>('all');
  const [kycFilter, setKycFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'balance_desc' | 'date_desc' | 'name_asc'>('balance_desc');

  // Dedicated Investor Page selection
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [detailTab, setDetailTab] = useState<'transactions' | 'holdings' | 'documents'>('transactions');
  const [revealIban, setRevealIban] = useState(false);

  // Assigned gate state
  const [savingGate, setSavingGate] = useState(false);

  // Freeze / Unfreeze confirmation dialog
  const [freezeModalOpen, setFreezeModalOpen] = useState(false);
  const [freezeReason, setFreezeReason] = useState('Compliance review hold');

  // Send message modal
  const [messageModalOpen, setMessageModalOpen] = useState(false);
  const [msgTitle, setMsgTitle] = useState('');
  const [msgBody, setMsgBody] = useState('');
  const [sendingMsg, setSendingMsg] = useState(false);

  // Document viewer
  const [previewUrl, setPreviewUrl] = useState<{ title: string; url: string | null } | null>(null);
  const messageModalRef = useDialogFocus<HTMLFormElement>(
    messageModalOpen,
    () => setMessageModalOpen(false),
    sendingMsg
  );
  const docModalRef = useDialogFocus<HTMLDivElement>(Boolean(previewUrl), () => setPreviewUrl(null));

  const selectedUser = useMemo(
    () => users.find((u) => u.id === selectedUserId) || null,
    [users, selectedUserId]
  );

  const selectedTransactions = useMemo(
    () => (selectedUser ? transactions.filter((t) => t.userId === selectedUser.id) : []),
    [selectedUser, transactions]
  );

  const selectedHoldings = useMemo(
    () => (selectedUser ? investments.filter((i) => (i.userId || i.user_id) === selectedUser.id) : []),
    [selectedUser, investments]
  );

  const selectedDocuments = useMemo(
    () => (selectedUser ? documents.filter((d) => d.userId === selectedUser.id) : []),
    [selectedUser, documents]
  );

  const filteredUsers = useMemo(() => {
    return users
      .filter((u) => {
        const isFrozen = Boolean(u.frozen || u.status === 'suspended');
        if (frozenFilter === 'active' && isFrozen) return false;
        if (frozenFilter === 'frozen' && !isFrozen) return false;
        if (kycFilter !== 'all' && u.kycStatus !== kycFilter) return false;
        if (searchTerm.trim()) {
          const q = searchTerm.toLowerCase().trim();
          return (
            u.fullName.toLowerCase().includes(q) ||
            u.email.toLowerCase().includes(q) ||
            (u.country || '').toLowerCase().includes(q) ||
            u.id.toLowerCase().includes(q)
          );
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'balance_desc') return eurToCents(b.walletBalance || 0) - eurToCents(a.walletBalance || 0);
        if (sortBy === 'name_asc') return a.fullName.localeCompare(b.fullName);
        return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
      });
  }, [users, frozenFilter, kycFilter, searchTerm, sortBy]);

  const handlePrintUserDirectory = () => {
    const reportData: UserDirectoryPrintData = {
      generatedAt: new Date().toLocaleString('en-US'),
      generatedBy: currentAdminEmail,
      totalUsersCount: filteredUsers.length,
      users: filteredUsers.map((u) => ({
        id: u.id,
        fullName: u.fullName,
        email: u.email,
        role: u.role,
        accountType: u.accountType,
        kycStatus: u.kycStatus,
        walletBalance: u.walletBalance || 0,
        createdAt: u.createdAt,
      })),
    };
    printUserDirectoryReport(reportData);
  };

  const handleAssignGate = async (gateId: string) => {
    if (!selectedUser || readOnly) return;
    setSavingGate(true);
    try {
      const gateObj = paymentGates.find((g) => g.id === gateId);
      const resolvedMethod = gateObj?.method === 'usdt' ? 'usdt' : 'bank';
      await assignPaymentGateToInvestor(selectedUser.id, gateId || null, gateObj?.name, resolvedMethod);
      onQuickSuccess(
        gateId
          ? `Assigned payment gate "${gateObj?.name || gateId}" to ${selectedUser.fullName}.`
          : `Cleared assigned payment gate for ${selectedUser.fullName}.`
      );
      await onRefreshAll();
    } catch (err: any) {
      onQuickError(err?.message || 'Unable to assign payment gate.');
    } finally {
      setSavingGate(false);
    }
  };

  // Freeze/Unfreeze handled via shared AdminActionDialog below

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    if (!msgTitle.trim() || !msgBody.trim()) {
      onQuickError('Title and message body are required.');
      return;
    }
    setSendingMsg(true);
    try {
      await sendAdminNotificationRecord({
        userId: selectedUser.id,
        title: msgTitle.trim(),
        message: msgBody.trim(),
        type: 'info',
      });
      onQuickSuccess(`Message sent to ${selectedUser.fullName}.`);
      setMessageModalOpen(false);
      setMsgTitle('');
      setMsgBody('');
      await onRefreshAll();
    } catch (err: any) {
      onQuickError(err?.message || 'Unable to send notification.');
    } finally {
      setSendingMsg(false);
    }
  };

  const handleOpenDocument = async (doc: InvestorDocumentRow) => {
    try {
      const url = await createPrivateBucketSignedUrl(
        doc.filePath,
        ['documents', 'kyc', 'kyc-submissions'],
        doc.inlineUrl
      );
      setPreviewUrl({ title: doc.title, url });
    } catch (err: any) {
      onQuickError(err?.message || 'Unable to generate signed URL for document.');
    }
  };

  // ============================================================================
  // INVESTOR DETAIL PAGE VIEW
  // ============================================================================
  if (selectedUser) {
    const isFrozen = Boolean(selectedUser.frozen || selectedUser.status === 'suspended');
    const ibanValue = selectedUser.bankIban || '';
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                setSelectedUserId(null);
                setRevealIban(false);
              }}
              className="min-h-[44px] px-3.5 py-2 rounded-xl bg-[#121A1F] border border-[#1F2C33] hover:border-[#6FD8B0] text-xs font-semibold text-[#F2F5F4] flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-[#6FD8B0]" />
              <span>All Investors</span>
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="admin-main-heading" data-admin-queue-focus tabIndex={-1} className="text-lg font-bold text-[#F2F5F4] focus:outline-none">{selectedUser.fullName || 'Investor'}</h2>
                <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                  isFrozen
                    ? 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                    : 'bg-[#6FD8B0]/15 text-[#6FD8B0] border border-[#6FD8B0]/30'
                }`}>
                  {isFrozen ? 'Frozen' : 'Active'}
                </span>
              </div>
              <p className="text-xs text-[#8FA1A8]">{selectedUser.email} · {selectedUser.id}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setMessageModalOpen(true)}
              className="min-h-[44px] px-3.5 py-2 rounded-xl bg-[#121A1F] border border-[#1F2C33] hover:border-[#6FD8B0] text-xs font-semibold text-[#F2F5F4] flex items-center gap-1.5 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5 text-[#6FD8B0]" />
              <span>Send Message</span>
            </button>

            {!readOnly && onNavigateToManualCredit && (
              <button
                type="button"
                onClick={() => onNavigateToManualCredit(selectedUser.id)}
                className="min-h-[44px] px-3.5 py-2 rounded-xl bg-[#121A1F] border border-[#1F2C33] hover:border-[#6FD8B0] text-xs font-semibold text-[#F2F5F4] flex items-center gap-1.5 cursor-pointer"
              >
                <Wallet className="w-3.5 h-3.5 text-[#6FD8B0]" />
                <span>Credit Wallet</span>
              </button>
            )}

            {!readOnly && (
              <button
                type="button"
                role="switch"
                aria-checked={isFrozen}
                aria-label={isFrozen ? 'Unfreeze investor account' : 'Freeze investor account'}
                onClick={() => {
                  setFreezeReason(isFrozen ? 'Compliance clearance granted' : 'Temporary compliance freeze');
                  setFreezeModalOpen(true);
                }}
                className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer border transition-colors ${
                  isFrozen
                    ? 'bg-rose-500/15 border-rose-500/40 text-rose-200 hover:bg-rose-500/25'
                    : 'bg-[#121A1F] border-[#1F2C33] text-[#F2F5F4] hover:border-[#6FD8B0]'
                }`}
              >
                {isFrozen ? <Unlock className="w-3.5 h-3.5 text-[#6FD8B0]" /> : <Lock className="w-3.5 h-3.5 text-rose-300" />}
                <span>{isFrozen ? 'Frozen — Unfreeze' : 'Freeze Investor'}</span>
                <span
                  aria-hidden="true"
                  className={`w-7 h-4 rounded-full p-0.5 flex items-center transition-colors ${
                    isFrozen ? 'bg-rose-500 justify-end' : 'bg-[#1F2C33] justify-start'
                  }`}
                >
                  <span className="w-3 h-3 rounded-full bg-white" />
                </span>
              </button>
            )}
          </div>
        </div>

        {/* Profile, Bank Details, & Payment Gate Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Profile Summary */}
          <div className="bg-[#121A1F] border border-[#1F2C33] rounded-2xl p-5 space-y-3 text-xs">
            <h3 className="text-sm font-bold text-[#F2F5F4] border-b border-[#1F2C33] pb-2.5">Investor Profile</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-[#8FA1A8] text-[11px]">Wallet Balance</div>
                <div className="text-base font-bold text-[#6FD8B0] tabular-nums mt-0.5">
                  {formatCentsEur(eurToCents(selectedUser.walletBalance || 0))}
                </div>
              </div>
              <div>
                <div className="text-[#8FA1A8] text-[11px]">Invested Cost</div>
                <div className="text-base font-bold text-[#F2F5F4] tabular-nums mt-0.5">
                  {formatCentsEur(eurToCents(selectedUser.investedBalance || 0))}
                </div>
              </div>
              <div>
                <div className="text-[#8FA1A8] text-[11px]">KYC Status</div>
                <div className="font-semibold text-[#F2F5F4] uppercase mt-0.5">{selectedUser.kycStatus}</div>
              </div>
              <div>
                <div className="text-[#8FA1A8] text-[11px]">Account Type</div>
                <div className="font-semibold text-[#F2F5F4] mt-0.5">
                  {getAccountTypeLabel(selectedUser.accountType, selectedUser.role)}
                </div>
              </div>
              <div>
                <div className="text-[#8FA1A8] text-[11px]">Country</div>
                <div className="text-[#B6C4C9] mt-0.5">{selectedUser.country || '—'}</div>
              </div>
              <div>
                <div className="text-[#8FA1A8] text-[11px]">Registered</div>
                <div className="text-[#B6C4C9] mt-0.5">{formatDate(selectedUser.createdAt)}</div>
              </div>
            </div>
          </div>

          {/* Bank Details (Masked IBAN with Reveal) */}
          <div className="bg-[#121A1F] border border-[#1F2C33] rounded-2xl p-5 space-y-3 text-xs">
            <h3 className="text-sm font-bold text-[#F2F5F4] border-b border-[#1F2C33] pb-2.5 flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-[#6FD8B0]" />
              <span>Bank &amp; Settlement Details</span>
            </h3>
            <div>
              <div className="text-[#8FA1A8] text-[11px]">Account Holder</div>
              <div className="font-semibold text-[#F2F5F4] mt-0.5">
                {selectedUser.bankAccountHolder || selectedUser.fullName || '—'}
              </div>
            </div>
            <div>
              <div className="text-[#8FA1A8] text-[11px] mb-1">Registered IBAN</div>
              <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-[#0B0F10] border border-[#1F2C33]">
                <span className="font-mono text-[#F2F5F4] break-all">
                  {ibanValue ? (revealIban ? ibanValue : maskIban(ibanValue)) : 'No IBAN registered'}
                </span>
                {ibanValue && (
                  <button
                    type="button"
                    onClick={() => setRevealIban((v) => !v)}
                    aria-label={revealIban ? 'Hide registered IBAN' : 'Reveal registered IBAN'}
                    className="min-h-[44px] px-3 py-2 rounded-lg bg-[#121A1F] border border-[#1F2C33] hover:border-[#6FD8B0] text-xs font-semibold text-[#6FD8B0] inline-flex items-center gap-1.5 shrink-0 cursor-pointer"
                  >
                    {revealIban ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    <span>{revealIban ? 'Hide' : 'Reveal'}</span>
                  </button>
                )}
              </div>
            </div>
            {selectedUser.cryptoDepositAddress && (
              <div>
                <div className="text-[#8FA1A8] text-[11px]">Registered Crypto Wallet</div>
                <div className="font-mono text-[11px] text-[#B6C4C9] truncate mt-0.5">
                  {selectedUser.cryptoDepositAddress}
                </div>
              </div>
            )}
          </div>

          {/* Assigned Payment Gate */}
          <div className="bg-[#121A1F] border border-[#1F2C33] rounded-2xl p-5 space-y-3 text-xs">
            <h3 className="text-sm font-bold text-[#F2F5F4] border-b border-[#1F2C33] pb-2.5">
              Assigned Payment Gate
            </h3>
            <p className="text-[11px] text-[#8FA1A8]">
              Select the deposit gate displayed to this investor on treasury funding workflows.
            </p>
            <div>
              <label htmlFor="investor-assigned-gate" className="block text-[#B6C4C9] font-semibold mb-1.5">Active Payment Gate</label>
              <select
                id="investor-assigned-gate"
                disabled={readOnly || savingGate}
                value={selectedUser.assignedGateId || ''}
                onChange={(e) => handleAssignGate(e.target.value)}
                className="min-h-[44px] w-full px-3 py-2.5 bg-[#0B0F10] border border-[#1F2C33] rounded-xl text-[#F2F5F4] disabled:opacity-60"
              >
                <option value="">Default / Unassigned</option>
                {paymentGates.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name} ({g.method}){!g.active ? ' [Inactive]' : ''}
                  </option>
                ))}
              </select>
              {savingGate && (
                <div className="text-[11px] text-[#6FD8B0] mt-1.5">Updating payment gate assignment...</div>
              )}
            </div>
          </div>
        </div>

        {/* Sub-tabs: Transactions | Holdings | Documents */}
        <div className="bg-[#121A1F] border border-[#1F2C33] rounded-2xl overflow-hidden">
          <div className="px-5 pt-4 border-b border-[#1F2C33] flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setDetailTab('transactions')}
              className={`min-h-[44px] px-3.5 py-2 rounded-t-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer border-b-2 ${
                detailTab === 'transactions'
                  ? 'border-[#6FD8B0] text-[#6FD8B0] bg-[#0B0F10]'
                  : 'border-transparent text-[#8FA1A8] hover:text-[#F2F5F4]'
              }`}
            >
              <Receipt className="w-3.5 h-3.5" />
              <span>Transactions ({selectedTransactions.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setDetailTab('holdings')}
              className={`min-h-[44px] px-3.5 py-2 rounded-t-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer border-b-2 ${
                detailTab === 'holdings'
                  ? 'border-[#6FD8B0] text-[#6FD8B0] bg-[#0B0F10]'
                  : 'border-transparent text-[#8FA1A8] hover:text-[#F2F5F4]'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Holdings ({selectedHoldings.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setDetailTab('documents')}
              className={`min-h-[44px] px-3.5 py-2 rounded-t-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer border-b-2 ${
                detailTab === 'documents'
                  ? 'border-[#6FD8B0] text-[#6FD8B0] bg-[#0B0F10]'
                  : 'border-transparent text-[#8FA1A8] hover:text-[#F2F5F4]'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Documents ({selectedDocuments.length})</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            {detailTab === 'transactions' && (
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-[#0B0F10] border-b border-[#1F2C33] text-[#8FA1A8] text-[11px] uppercase">
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Reference</th>
                    <th className="py-3 px-4 text-right">Amount</th>
                    <th className="py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1F2C33]">
                  {selectedTransactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-[#162026]">
                      <td className="py-3 px-4 text-[#B6C4C9]">{formatDate(tx.createdAt)}</td>
                      <td className="py-3 px-4 uppercase font-semibold text-[#F2F5F4]">{tx.type}</td>
                      <td className="py-3 px-4 font-mono text-[#B6C4C9]">{tx.reference}</td>
                      <td className="py-3 px-4 text-right font-bold text-[#6FD8B0] tabular-nums">
                        {formatCentsEur(eurToCents(tx.amount))}
                      </td>
                      <td className="py-3 px-4 uppercase font-semibold text-[11px] text-[#F2F5F4]">{tx.status}</td>
                    </tr>
                  ))}
                  {selectedTransactions.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-10 text-center text-[#8FA1A8]">
                        No transactions recorded for this investor.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}

            {detailTab === 'holdings' && (
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-[#0B0F10] border-b border-[#1F2C33] text-[#8FA1A8] text-[11px] uppercase">
                    <th className="py-3 px-4">Property</th>
                    <th className="py-3 px-4 text-right">Shares</th>
                    <th className="py-3 px-4 text-right">Cost</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1F2C33]">
                  {selectedHoldings.map((h) => (
                    <tr key={h.id} className="hover:bg-[#162026]">
                      <td className="py-3 px-4 font-semibold text-[#F2F5F4]">
                        {h.propertyTitle || h.propertyName || h.propertyId}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-[#F2F5F4] tabular-nums">
                        {Number(h.tokensPurchased || h.shares || 0).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-[#6FD8B0] tabular-nums">
                        {formatCentsEur(eurToCents(h.totalCost ?? h.amountEUR ?? h.total_amount_invested ?? 0))}
                      </td>
                      <td className="py-3 px-4 uppercase font-semibold text-[11px] text-[#6FD8B0]">
                        {h.status || 'confirmed'}
                      </td>
                      <td className="py-3 px-4 text-[#B6C4C9]">{formatDate(h.purchaseDate || h.createdAt)}</td>
                    </tr>
                  ))}
                  {selectedHoldings.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-10 text-center text-[#8FA1A8]">
                        No active property holdings for this investor.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}

            {detailTab === 'documents' && (
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-[#0B0F10] border-b border-[#1F2C33] text-[#8FA1A8] text-[11px] uppercase">
                    <th className="py-3 px-4">Title</th>
                    <th className="py-3 px-4">File Path</th>
                    <th className="py-3 px-4">Created</th>
                    <th className="py-3 px-4 text-right">Open</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1F2C33]">
                  {selectedDocuments.map((doc) => (
                    <tr key={doc.id} className="hover:bg-[#162026]">
                      <td className="py-3 px-4 font-semibold text-[#F2F5F4]">{doc.title}</td>
                      <td className="py-3 px-4 font-mono text-[#8FA1A8]">{doc.filePath}</td>
                      <td className="py-3 px-4 text-[#B6C4C9]">{formatDate(doc.createdAt)}</td>
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => handleOpenDocument(doc)}
                          className="min-h-[44px] px-3 py-2 rounded-lg bg-[#0B0F10] border border-[#1F2C33] hover:border-[#6FD8B0] text-[#6FD8B0] text-xs font-semibold cursor-pointer"
                        >
                          View PDF
                        </button>
                      </td>
                    </tr>
                  ))}
                  {selectedDocuments.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-10 text-center text-[#8FA1A8]">
                        No documents stored for this investor.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Freeze / Unfreeze Confirmation Dialog */}
        {!readOnly && (
          <AdminActionDialog
            open={freezeModalOpen}
            actionName={isFrozen ? 'Unfreeze investor' : 'Freeze investor'}
            confirmLabel={isFrozen ? 'Unfreeze investor' : 'Freeze investor'}
            tone={isFrozen ? 'primary' : 'danger'}
            description={
              isFrozen
                ? `Restore normal login, investment, and withdrawal access for ${selectedUser.fullName || selectedUser.email}.`
                : `Freezing ${selectedUser.fullName || selectedUser.email} immediately blocks withdrawals and capital deployment.`
            }
            investorName={selectedUser.fullName || 'Investor'}
            investorEmail={selectedUser.email}
            amountCents={eurToCents(selectedUser.walletBalance || 0)}
            reference={selectedUser.id}
            extraDetails={[
              { label: 'Target State', value: isFrozen ? 'Active (Unfrozen)' : 'Frozen', tone: isFrozen ? 'accent' : 'danger' },
            ]}
            validate={() => {
              const nextFrozen = !isFrozen;
              if (selectedUser.email.toLowerCase() === currentAdminEmail.toLowerCase() && nextFrozen) {
                return 'You cannot freeze your own active staff account.';
              }
              return null;
            }}
            onConfirm={async () => {
              const nextFrozen = !isFrozen;
              await setInvestorFrozenState(selectedUser.id, nextFrozen, freezeReason.trim());
              return `${selectedUser.fullName || selectedUser.email} has been ${nextFrozen ? 'frozen' : 'unfrozen'} via set_frozen.`;
            }}
            onRefresh={onRefreshAll}
            onRefreshError={onQuickError}
            onSuccess={onQuickSuccess}
            onClose={() => setFreezeModalOpen(false)}
          >
            <div>
              <label htmlFor="investor-freeze-note" className="block text-[11px] font-semibold text-[#8FA1A8] mb-1">Audit Note</label>
              <input
                id="investor-freeze-note"
                type="text"
                value={freezeReason}
                onChange={(e) => setFreezeReason(e.target.value)}
                className="min-h-[44px] w-full px-3 py-2 bg-[#0B0F10] border border-[#1F2C33] rounded-xl text-xs text-[#F2F5F4]"
              />
            </div>
          </AdminActionDialog>
        )}

        {/* Send Message Modal */}
        {messageModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
            <form ref={messageModalRef} tabIndex={-1} role="dialog" aria-modal="true" aria-label={`Send Message to ${selectedUser.fullName}`} onSubmit={handleSendMessage} className="bg-[#121A1F] border border-[#1F2C33] rounded-2xl max-w-md w-full p-6 space-y-4 focus:outline-none">
              <div className="flex items-center justify-between border-b border-[#1F2C33] pb-3">
                <h3 className="text-sm font-bold text-[#F2F5F4]">Send Message to {selectedUser.fullName}</h3>
                <button type="button" onClick={() => setMessageModalOpen(false)} aria-label="Close send message dialog" className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-[#8FA1A8] hover:text-[#F2F5F4] cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-3 text-xs">
                <div>
                  <label htmlFor="investor-msg-title" className="block text-[#B6C4C9] font-semibold mb-1">Notification Title</label>
                  <input
                    id="investor-msg-title"
                    type="text"
                    required
                    value={msgTitle}
                    onChange={(e) => setMsgTitle(e.target.value)}
                    placeholder="Account update or action required"
                    className="min-h-[44px] w-full px-3 py-2 bg-[#0B0F10] border border-[#1F2C33] rounded-xl text-[#F2F5F4]"
                  />
                </div>
                <div>
                  <label htmlFor="investor-msg-body" className="block text-[#B6C4C9] font-semibold mb-1">Message</label>
                  <textarea
                    id="investor-msg-body"
                    rows={4}
                    required
                    value={msgBody}
                    onChange={(e) => setMsgBody(e.target.value)}
                    placeholder="Write message inserted into investor notifications..."
                    className="w-full p-3 bg-[#0B0F10] border border-[#1F2C33] rounded-xl text-[#F2F5F4]"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setMessageModalOpen(false)}
                  className="min-h-[44px] px-4 py-2 rounded-xl bg-[#0B0F10] border border-[#1F2C33] text-xs font-semibold text-[#B6C4C9] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={sendingMsg}
                  className="min-h-[44px] px-4 py-2 rounded-xl bg-[#6FD8B0] text-[#0B0F10] text-xs font-bold cursor-pointer disabled:opacity-50"
                >
                  {sendingMsg ? 'Sending...' : 'Send Message'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Document Preview Modal */}
        {previewUrl && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
            <div ref={docModalRef} tabIndex={-1} role="dialog" aria-modal="true" aria-label={previewUrl.title} className="bg-[#121A1F] border border-[#1F2C33] rounded-2xl max-w-2xl w-full p-5 space-y-4 focus:outline-none">
              <div className="flex items-center justify-between border-b border-[#1F2C33] pb-3">
                <h3 className="text-sm font-bold text-[#F2F5F4]">{previewUrl.title}</h3>
                <button type="button" onClick={() => setPreviewUrl(null)} aria-label="Close document preview" className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-[#8FA1A8] hover:text-[#F2F5F4] cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="bg-[#0B0F10] border border-[#1F2C33] rounded-xl p-3">
                {previewUrl.url ? (
                  <iframe src={previewUrl.url} title={previewUrl.title} className="w-full h-[60vh] rounded-lg" />
                ) : (
                  <div className="py-10 text-center text-xs text-[#8FA1A8]">
                    Signed URL unavailable for this storage object.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ============================================================================
  // INVESTOR TABLE LIST VIEW
  // ============================================================================
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#121A1F] border border-[#1F2C33] text-[#6FD8B0] flex items-center justify-center">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 id="admin-main-heading" data-admin-queue-focus tabIndex={-1} className="text-lg font-bold text-[#F2F5F4] focus:outline-none">Investors</h2>
              {readOnly && <span className="text-[11px] font-semibold text-amber-400">· Read-Only</span>}
            </div>
            <p className="text-xs text-[#8FA1A8]">
              Search investors, inspect wallet balances, manage payment gates, freeze state, and notifications.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePrintUserDirectory}
            className="min-h-[44px] px-3.5 py-2 rounded-xl bg-[#121A1F] border border-[#1F2C33] hover:border-[#6FD8B0] text-xs font-semibold text-[#F2F5F4] flex items-center gap-1.5 cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5 text-[#6FD8B0]" />
            <span>Export Directory</span>
          </button>
          <button
            type="button"
            onClick={onRefreshAll}
            className="min-h-[44px] px-3.5 py-2 rounded-xl bg-[#121A1F] border border-[#1F2C33] hover:border-[#6FD8B0] text-xs font-semibold text-[#F2F5F4] flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5 text-[#6FD8B0]" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-[#121A1F] p-4 rounded-2xl border border-[#1F2C33] flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 text-[#8FA1A8] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            id="investors-directory-search"
            type="text"
            aria-label="Search investors by name, email, country, or ID"
            placeholder="Search by name, email, country, or ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="min-h-[44px] w-full pl-9 pr-4 py-2 rounded-xl bg-[#0B0F10] border border-[#1F2C33] text-xs text-[#F2F5F4] placeholder-[#52646C] focus:outline-none focus:border-[#6FD8B0]"
          />
        </div>

        <select
          id="investors-kyc-filter"
          aria-label="Filter investors by KYC status"
          value={kycFilter}
          onChange={(e) => setKycFilter(e.target.value)}
          className="min-h-[44px] rounded-xl bg-[#0B0F10] border border-[#1F2C33] px-3 py-2 text-xs font-semibold text-[#F2F5F4]"
        >
          <option value="all">All KYC</option>
          <option value="verified">Verified</option>
          <option value="pending">Pending</option>
          <option value="rejected">Rejected</option>
        </select>

        <select
          id="investors-frozen-filter"
          aria-label="Filter investors by frozen state"
          value={frozenFilter}
          onChange={(e) => setFrozenFilter(e.target.value as any)}
          className="min-h-[44px] rounded-xl bg-[#0B0F10] border border-[#1F2C33] px-3 py-2 text-xs font-semibold text-[#F2F5F4]"
        >
          <option value="all">All States</option>
          <option value="active">Active Only</option>
          <option value="frozen">Frozen Only</option>
        </select>

        <select
          id="investors-sort-select"
          aria-label="Sort investors"
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as any)}
          className="min-h-[44px] rounded-xl bg-[#0B0F10] border border-[#1F2C33] px-3 py-2 text-xs font-semibold text-[#F2F5F4]"
        >
          <option value="balance_desc">Wallet Balance (High–Low)</option>
          <option value="date_desc">Newest Registered</option>
          <option value="name_asc">Name (A–Z)</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-[#121A1F] rounded-2xl border border-[#1F2C33] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#1F2C33] bg-[#0B0F10] text-[#8FA1A8] font-semibold uppercase text-[11px]">
                <th className="py-3 px-4">Name</th>
                <th className="py-3 px-4">Email</th>
                <th className="py-3 px-4">KYC Status</th>
                <th className="py-3 px-4 text-right">Wallet Balance</th>
                <th className="py-3 px-4">Frozen</th>
                <th className="py-3 px-4 text-right">Open</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1F2C33]">
              {filteredUsers.map((u) => {
                const isFrozen = Boolean(u.frozen || u.status === 'suspended');
                return (
                  <tr
                    key={u.id}
                    onClick={() => setSelectedUserId(u.id)}
                    className="hover:bg-[#162026] transition-colors cursor-pointer"
                  >
                    <td className="py-3.5 px-4 font-semibold text-[#F2F5F4]">{u.fullName || 'Investor'}</td>
                    <td className="py-3.5 px-4 text-[#B6C4C9]">{u.email}</td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`font-semibold uppercase text-[11px] ${
                          u.kycStatus === 'verified'
                            ? 'text-[#6FD8B0]'
                            : u.kycStatus === 'rejected'
                            ? 'text-rose-400'
                            : 'text-amber-400'
                        }`}
                      >
                        {u.kycStatus}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-[#F2F5F4] tabular-nums">
                      {formatCentsEur(eurToCents(u.walletBalance || 0))}
                    </td>
                    <td className="py-3.5 px-4">
                      {isFrozen ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-rose-500/15 border border-rose-500/30 text-rose-300 text-[10px] font-bold uppercase">
                          <Lock className="w-2.5 h-2.5" />
                          <span>Frozen</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[#6FD8B0] text-[11px] font-semibold">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>No</span>
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedUserId(u.id);
                        }}
                        className="min-h-[44px] px-3.5 py-2 rounded-lg bg-[#0B0F10] border border-[#1F2C33] hover:border-[#6FD8B0] text-[#6FD8B0] text-xs font-semibold cursor-pointer"
                      >
                        Investor Page
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-xs text-[#8FA1A8]">
                    No investors matched your search criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
