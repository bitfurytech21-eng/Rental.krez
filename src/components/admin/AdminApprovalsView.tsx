import React, { useState } from 'react';
import {
  ArrowDownLeft, ArrowUpRight, CheckCircle2, XCircle, AlertTriangle,
  Clock, ExternalLink, ShieldCheck, Eye, Search, Filter, AlertCircle,
  FileText, CornerDownRight, Check, X, Info
} from 'lucide-react';
import { Transaction } from '../../types/transaction';
import { User } from '../../types/user';
import { formatCurrency, formatDate } from '../../lib/utils';
import { ledger } from '../../lib/ledger';

interface AdminApprovalsViewProps {
  transactions: Transaction[];
  users: User[];
  currentAdminEmail: string;
  onRefreshAll: () => void;
  onQuickSuccess: (msg: string) => void;
  onQuickError: (msg: string) => void;
}

export const AdminApprovalsView: React.FC<AdminApprovalsViewProps> = ({
  transactions,
  users,
  currentAdminEmail,
  onRefreshAll,
  onQuickSuccess,
  onQuickError,
}) => {
  const [activeTab, setActiveTab] = useState<'deposits' | 'withdrawals' | 'history'>('deposits');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);

  // Action Modal state
  const [modalType, setModalType] = useState<'approve' | 'reject' | 'fail' | null>(null);
  const [modalTx, setModalTx] = useState<Transaction | null>(null);
  const [outgoingTxHash, setOutgoingTxHash] = useState('');
  const [actionReason, setActionReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter transactions based on tab and search
  const pendingDeposits = transactions.filter((t) => t.type === 'deposit' && t.status === 'pending');
  const pendingWithdrawals = transactions.filter((t) => t.type === 'withdrawal' && t.status === 'pending');
  const completedHistory = transactions.filter((t) => t.status !== 'pending');

  const getFilteredList = () => {
    let list: Transaction[] = [];
    if (activeTab === 'deposits') list = pendingDeposits;
    else if (activeTab === 'withdrawals') list = pendingWithdrawals;
    else list = completedHistory;

    if (!searchQuery.trim()) return list;

    const q = searchQuery.toLowerCase();
    return list.filter((t) => {
      const user = users.find((u) => u.id === t.userId);
      return (
        t.reference.toLowerCase().includes(q) ||
        t.paymentMethod.toLowerCase().includes(q) ||
        (user && (user.fullName.toLowerCase().includes(q) || user.email.toLowerCase().includes(q)))
      );
    });
  };

  const calculateAgeHours = (createdAt: string) => {
    const diffMs = Date.now() - new Date(createdAt).getTime();
    return diffMs / (1000 * 60 * 60);
  };

  const formatAgeLabel = (createdAt: string) => {
    const hours = Math.floor(calculateAgeHours(createdAt));
    const mins = Math.floor(((calculateAgeHours(createdAt) % 1) * 60));
    if (hours < 1) return `${mins}m ago`;
    return `${hours}h ${mins}m ago`;
  };

  const getAgeBadgeStyle = (createdAt: string) => {
    const hours = calculateAgeHours(createdAt);
    if (hours > 24) return 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/30';
    if (hours > 12) return 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30';
    return 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30';
  };

  const getUserForTx = (tx: Transaction) => {
    return users.find((u) => u.id === tx.userId);
  };

  const isFirstTimeAddress = (tx: Transaction) => {
    const userTxs = transactions.filter(
      (t) => t.userId === tx.userId && t.id !== tx.id && t.status === 'completed'
    );
    return userTxs.length === 0;
  };

  const openActionModal = (tx: Transaction, type: 'approve' | 'reject' | 'fail') => {
    setModalTx(tx);
    setModalType(type);
    setOutgoingTxHash(
      type === 'approve' && tx.type === 'withdrawal'
        ? `0x${Math.random().toString(36).substring(2, 12)}${Math.random().toString(36).substring(2, 10)}`
        : ''
    );
    setActionReason('');
  };

  const handleExecuteAction = async () => {
    if (!modalTx || !modalType) return;

    if ((modalType === 'reject' || modalType === 'fail') && !actionReason.trim()) {
      onQuickError('A reason is required to reject or fail a transaction.');
      return;
    }

    if (modalType === 'approve' && modalTx.type === 'withdrawal' && !outgoingTxHash.trim()) {
      onQuickError('Outgoing BEP-20 TX hash or Bank reference number is required.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (modalTx.type === 'deposit') {
        await ledger.reviewDeposit(
          { id: 'admin', role: 'admin' },
          modalTx.id,
          modalType === 'approve',
          modalType === 'approve' ? undefined : actionReason.trim()
        );
        onQuickSuccess(
          `Deposit ${modalTx.reference} ${
            modalType === 'approve' ? 'APPROVED & Credited' : modalType === 'reject' ? 'REJECTED' : 'FAILED'
          }`
        );
      } else {
        await ledger.reviewWithdrawal(
          { id: 'admin', role: 'admin' },
          modalTx.id,
          modalType === 'approve',
          modalType === 'approve' ? undefined : actionReason.trim()
        );
        onQuickSuccess(
          `Withdrawal ${modalTx.reference} ${
            modalType === 'approve' ? 'APPROVED & Transferred' : modalType === 'reject' ? 'REJECTED' : 'FAILED'
          }`
        );
      }

      onRefreshAll();
      setModalType(null);
      setModalTx(null);
      setSelectedTx(null);
    } catch (err: any) {
      onQuickError(err.message || 'Failed to process transaction review');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredList = getFilteredList();

  return (
    <div className="space-y-6">
      {/* Header & Tabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-[#111A2C] p-6 rounded-2xl border border-[#E2E8F0] dark:border-[#1E293B] shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-[#0F172A] dark:text-[#E2E8F0] flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            Approvals Console
          </h2>
          <p className="text-xs text-[#64748B] dark:text-[#94A3B8] mt-1">
            Manual administrative review queue for incoming BEP-20 / Bank deposits and outgoing withdrawals.
          </p>
        </div>

        {/* Search */}
        <div className="relative max-w-xs w-full">
          <Search className="w-4 h-4 absolute left-3 top-3 text-[#64748B]" />
          <input
            type="text"
            placeholder="Search ref, user, method..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-[#E2E8F0] dark:border-[#1E293B] bg-[#F8FAFC] dark:bg-[#0B1220] focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-[#E2E8F0] dark:border-[#1E293B] pb-2 text-xs font-bold">
        <button
          onClick={() => setActiveTab('deposits')}
          className={`px-4 py-2.5 rounded-xl flex items-center gap-2 transition cursor-pointer ${
            activeTab === 'deposits'
              ? 'bg-[#0F4C81] text-white dark:bg-emerald-600'
              : 'bg-white dark:bg-[#111A2C] text-[#64748B] hover:text-[#0F172A] border border-[#E2E8F0] dark:border-[#1E293B]'
          }`}
        >
          <ArrowDownLeft className="w-4 h-4" />
          <span>Pending Deposits</span>
          <span className="px-2 py-0.5 text-[10px] rounded-full bg-amber-500 text-white font-bold">
            {pendingDeposits.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('withdrawals')}
          className={`px-4 py-2.5 rounded-xl flex items-center gap-2 transition cursor-pointer ${
            activeTab === 'withdrawals'
              ? 'bg-[#0F4C81] text-white dark:bg-emerald-600'
              : 'bg-white dark:bg-[#111A2C] text-[#64748B] hover:text-[#0F172A] border border-[#E2E8F0] dark:border-[#1E293B]'
          }`}
        >
          <ArrowUpRight className="w-4 h-4" />
          <span>Pending Withdrawals</span>
          <span className="px-2 py-0.5 text-[10px] rounded-full bg-amber-500 text-white font-bold">
            {pendingWithdrawals.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`px-4 py-2.5 rounded-xl flex items-center gap-2 transition cursor-pointer ${
            activeTab === 'history'
              ? 'bg-[#0F4C81] text-white dark:bg-emerald-600'
              : 'bg-white dark:bg-[#111A2C] text-[#64748B] hover:text-[#0F172A] border border-[#E2E8F0] dark:border-[#1E293B]'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Approval History</span>
          <span className="px-2 py-0.5 text-[10px] rounded-full bg-[#E2E8F0] dark:bg-[#1E293B] text-[#64748B]">
            {completedHistory.length}
          </span>
        </button>
      </div>

      {/* Main Table */}
      <div className="bg-white dark:bg-[#111A2C] rounded-2xl border border-[#E2E8F0] dark:border-[#1E293B] shadow-sm overflow-hidden">
        {filteredList.length === 0 ? (
          <div className="text-center py-16 px-4 space-y-3">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto opacity-40" />
            <p className="text-sm font-semibold text-[#0F172A] dark:text-[#E2E8F0]">No requests found in this queue.</p>
            <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
              All investor deposit and withdrawal requests submitted will automatically appear here for verification.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#F8FAFC] dark:bg-[#0B1220] border-b border-[#E2E8F0] dark:border-[#1E293B] text-[#64748B] uppercase font-bold text-[10px] tracking-wider">
                  <th className="p-4">Reference</th>
                  <th className="p-4">Investor User</th>
                  <th className="p-4">KYC Badge</th>
                  <th className="p-4">Method &amp; Network</th>
                  <th className="p-4">Amount</th>
                  <th className="p-4">Submitted / Age</th>
                  <th className="p-4">Warnings</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0] dark:divide-[#1E293B]">
                {filteredList.map((tx) => {
                  const txUser = getUserForTx(tx);
                  const isLarge = tx.amount >= 5000;
                  const isFirst = isFirstTimeAddress(tx);
                  const isKycUnverified = txUser?.kycStatus !== 'verified';

                  return (
                    <tr
                      key={tx.id}
                      className="hover:bg-[#F8FAFC] dark:hover:bg-[#0B1220]/50 transition cursor-pointer"
                      onClick={() => setSelectedTx(tx)}
                    >
                      <td className="p-4 font-mono font-bold text-[#0F4C81] dark:text-[#14B8A6]">
                        {tx.reference}
                      </td>

                      <td className="p-4">
                        <div className="font-semibold text-[#0F172A] dark:text-[#E2E8F0]">{txUser?.fullName || 'Investor'}</div>
                        <div className="text-[11px] text-[#64748B] font-mono">{txUser?.email}</div>
                      </td>

                      <td className="p-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            txUser?.kycStatus === 'verified'
                              ? 'bg-emerald-500/10 text-emerald-600'
                              : txUser?.kycStatus === 'pending'
                              ? 'bg-amber-500/10 text-amber-600'
                              : 'bg-red-500/10 text-red-600'
                          }`}
                        >
                          {txUser?.kycStatus || 'Unverified'}
                        </span>
                      </td>

                      <td className="p-4">
                        <div className="font-semibold">{tx.paymentMethod}</div>
                        <div className="text-[10px] text-[#64748B] font-mono">
                          {tx.paymentMethod.includes('BEP-20') ? 'BNB Smart Chain (BEP-20)' : 'Escrow Wire'}
                        </div>
                      </td>

                      <td className="p-4 font-bold tabular-nums text-[13px]">
                        <span className={tx.type === 'deposit' ? 'text-[#16A34A]' : 'text-[#0F4C81] dark:text-[#14B8A6]'}>
                          {tx.type === 'deposit' ? '+' : '-'}{formatCurrency(tx.amount)}
                        </span>
                      </td>

                      <td className="p-4">
                        <div>{formatDate(tx.createdAt)}</div>
                        {tx.status === 'pending' && (
                          <span
                            className={`inline-block mt-1 px-1.5 py-0.2 text-[10px] font-mono font-semibold rounded border ${getAgeBadgeStyle(
                              tx.createdAt
                            )}`}
                          >
                            ⏳ {formatAgeLabel(tx.createdAt)}
                          </span>
                        )}
                      </td>

                      <td className="p-4">
                        <div className="flex flex-wrap gap-1">
                          {isLarge && (
                            <span className="px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-700 dark:text-amber-400 font-bold text-[9px]">
                              ⚡ Large Amount
                            </span>
                          )}
                          {isFirst && (
                            <span className="px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-700 dark:text-blue-400 font-bold text-[9px]">
                              ★ First-Time
                            </span>
                          )}
                          {isKycUnverified && (
                            <span className="px-1.5 py-0.5 rounded bg-red-500/15 text-red-700 dark:text-red-400 font-bold text-[9px]">
                              ⚠ KYC Unverified
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="p-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            tx.status === 'completed'
                              ? 'bg-emerald-500/10 text-emerald-600'
                              : tx.status === 'pending'
                              ? 'bg-amber-500/10 text-amber-600'
                              : tx.status === 'rejected'
                              ? 'bg-red-500/10 text-red-600'
                              : tx.status === 'failed'
                              ? 'bg-rose-500/10 text-rose-600'
                              : 'bg-gray-500/10 text-gray-500'
                          }`}
                        >
                          {tx.status}
                        </span>
                      </td>

                      <td className="p-4 text-right" onClick={(e) => e.stopPropagation()}>
                        {tx.status === 'pending' ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => openActionModal(tx, 'approve')}
                              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] transition cursor-pointer flex items-center gap-1"
                            >
                              <Check className="w-3 h-3" /> Approve
                            </button>
                            <button
                              onClick={() => openActionModal(tx, 'reject')}
                              className="px-2.5 py-1 rounded-lg bg-red-600 hover:bg-red-500 text-white font-bold text-[11px] transition cursor-pointer flex items-center gap-1"
                            >
                              <X className="w-3 h-3" /> Reject
                            </button>
                            <button
                              onClick={() => openActionModal(tx, 'fail')}
                              className="px-2.5 py-1 rounded-lg bg-gray-700 hover:bg-gray-600 text-white font-bold text-[11px] transition cursor-pointer"
                            >
                              Fail
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setSelectedTx(tx)}
                            className="px-2.5 py-1 rounded-lg border border-[#E2E8F0] dark:border-[#1E293B] text-[#64748B] hover:text-[#0F172A] font-semibold text-[11px] cursor-pointer"
                          >
                            Details
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Row Drawer / Detail Slide-Over Modal */}
      {selectedTx && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex justify-end" onClick={() => setSelectedTx(null)}>
          <div
            className="w-full max-w-md bg-white dark:bg-[#111A2C] h-full p-6 overflow-y-auto space-y-6 shadow-2xl border-l border-[#E2E8F0] dark:border-[#1E293B]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#E2E8F0] dark:border-[#1E293B] pb-4">
              <div>
                <span className="text-[11px] text-[#64748B] uppercase font-bold">Request Detail</span>
                <h3 className="text-lg font-bold font-mono text-[#0F4C81] dark:text-[#14B8A6]">{selectedTx.reference}</h3>
              </div>
              <button onClick={() => setSelectedTx(null)} className="p-1 rounded text-[#64748B] hover:text-[#0F172A]">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Investor Summary Card */}
            {(() => {
              const u = getUserForTx(selectedTx);
              return (
                <div className="p-4 rounded-xl bg-[#F8FAFC] dark:bg-[#0B1220] border border-[#E2E8F0] dark:border-[#1E293B] space-y-2 text-xs">
                  <div className="font-semibold text-sm">{u?.fullName}</div>
                  <div className="text-mono text-[#64748B]">{u?.email}</div>
                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[#E2E8F0] dark:border-[#1E293B] text-[11px]">
                    <div>
                      <span className="text-[#64748B] block">Available</span>
                      <span className="font-bold text-emerald-600">{formatCurrency(u?.walletBalance || 0)}</span>
                    </div>
                    <div>
                      <span className="text-[#64748B] block">Pending</span>
                      <span className="font-bold text-amber-500">{formatCurrency(u?.pendingBalance || 0)}</span>
                    </div>
                    <div>
                      <span className="text-[#64748B] block">Invested</span>
                      <span className="font-bold text-blue-600">{formatCurrency(u?.investedBalance || 0)}</span>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Request Breakdown */}
            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-1 border-b">
                <span className="text-[#64748B]">Type:</span>
                <span className="font-bold uppercase">{selectedTx.type}</span>
              </div>
              <div className="flex justify-between py-1 border-b">
                <span className="text-[#64748B]">Amount:</span>
                <span className="font-bold tabular-nums text-sm">{formatCurrency(selectedTx.amount)}</span>
              </div>
              <div className="flex justify-between py-1 border-b">
                <span className="text-[#64748B]">Method:</span>
                <span className="font-semibold">{selectedTx.paymentMethod}</span>
              </div>
              <div className="flex justify-between py-1 border-b">
                <span className="text-[#64748B]">Submitted:</span>
                <span>{formatDate(selectedTx.createdAt)}</span>
              </div>

              {selectedTx.paymentMethod.includes('BEP-20') && (
                <div className="p-3 rounded bg-[#0B1220] text-white space-y-2">
                  <div className="text-[11px] font-semibold text-[#14B8A6]">BscScan Blockchain Explorer</div>
                  <a
                    href={`https://bscscan.com/tx/${selectedTx.txHash || '0x...'}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-blue-400 underline font-mono break-all"
                  >
                    <span>View on BscScan</span>
                    <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                  </a>
                </div>
              )}
            </div>

            {/* Balance Impact Preview */}
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs space-y-2">
              <div className="font-bold text-amber-800 dark:text-amber-400">Balance Impact Preview</div>
              {(() => {
                const u = getUserForTx(selectedTx);
                const avail = u?.walletBalance || 0;
                const pend = u?.pendingBalance || 0;
                if (selectedTx.type === 'deposit') {
                  return (
                    <div>
                      <div>Available Balance: <span className="font-mono">{formatCurrency(avail)} → {formatCurrency(avail + selectedTx.amount)}</span></div>
                    </div>
                  );
                } else {
                  return (
                    <div>
                      <div>Pending Balance: <span className="font-mono">{formatCurrency(pend)} → {formatCurrency(Math.max(0, pend - selectedTx.amount))}</span></div>
                    </div>
                  );
                }
              })()}
            </div>

            {selectedTx.status === 'pending' && (
              <div className="space-y-2 pt-4 border-t">
                <button
                  onClick={() => openActionModal(selectedTx, 'approve')}
                  className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs cursor-pointer"
                >
                  Approve Transaction
                </button>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => openActionModal(selectedTx, 'reject')}
                    className="py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs cursor-pointer"
                  >
                    Reject
                  </button>
                  <button
                    onClick={() => openActionModal(selectedTx, 'fail')}
                    className="py-2 rounded-xl bg-gray-700 hover:bg-gray-600 text-white font-bold text-xs cursor-pointer"
                  >
                    Mark Failed
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {modalType && modalTx && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white dark:bg-[#111A2C] rounded-2xl p-6 space-y-4 border border-[#E2E8F0] dark:border-[#1E293B] shadow-2xl">
            <h3 className="text-lg font-bold">
              {modalType === 'approve'
                ? `Approve ${modalTx.type.toUpperCase()}`
                : modalType === 'reject'
                ? `Reject ${modalTx.type.toUpperCase()}`
                : `Mark ${modalTx.type.toUpperCase()} Failed`}
            </h3>

            <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
              Reference: <strong className="font-mono text-[#0F172A] dark:text-[#E2E8F0]">{modalTx.reference}</strong> ({formatCurrency(modalTx.amount)})
            </p>

            {modalType === 'approve' && modalTx.type === 'withdrawal' && (
              <div className="space-y-2">
                <label className="block text-xs font-semibold">
                  Outgoing BEP-20 TX Hash / Bank Wire Ref <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="0x... (BEP-20 Transaction Hash on BNB Smart Chain)"
                  value={outgoingTxHash}
                  onChange={(e) => setOutgoingTxHash(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[#E2E8F0] dark:border-[#1E293B] bg-[#F8FAFC] dark:bg-[#0B1220] font-mono focus:outline-none"
                />
              </div>
            )}

            {(modalType === 'reject' || modalType === 'fail') && (
              <div className="space-y-2">
                <label className="block text-xs font-semibold">
                  Reason for {modalType === 'reject' ? 'Rejection' : 'Failure'} <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={3}
                  placeholder="Explain why this request is declined (notified to user)..."
                  value={actionReason}
                  onChange={(e) => setActionReason(e.target.value)}
                  className="w-full p-3 text-xs rounded-xl border border-[#E2E8F0] dark:border-[#1E293B] bg-[#F8FAFC] dark:bg-[#0B1220] focus:outline-none"
                />
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setModalType(null)}
                className="py-2.5 px-4 rounded-xl border border-[#E2E8F0] dark:border-[#1E293B] text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                disabled={isSubmitting}
                onClick={handleExecuteAction}
                className={`flex-1 py-2.5 rounded-xl font-bold text-xs text-white cursor-pointer ${
                  modalType === 'approve' ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-red-600 hover:bg-red-500'
                }`}
              >
                {isSubmitting ? 'Processing...' : `Confirm ${modalType.toUpperCase()}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
