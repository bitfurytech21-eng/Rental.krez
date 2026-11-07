import React, { useMemo, useState } from 'react';
import { Transaction } from '../../types/transaction';
import { formatCurrency, formatDate, formatShortHash } from '../../lib/utils';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Coins,
  RefreshCw,
  CheckCircle2,
  Clock,
  AlertCircle,
  Printer,
  ExternalLink,
  Search,
  Download,
  Copy,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '../../lib/auth';
import { printTransactionReceipt, ReceiptPrintData } from '../../lib/printService';
import { getSolanaExplorerUrl } from '../../lib/solanaService';

interface TransactionTableProps {
  transactions: Transaction[];
  maxRows?: number;
}

function isVerifiableSolanaSignature(txHash?: string): boolean {
  if (!txHash) return false;
  const trimmed = txHash.trim();
  if (
    trimmed.startsWith('0x') ||
    trimmed.includes('-') ||
    trimmed.includes('_') ||
    trimmed.length < 64 ||
    trimmed.length > 96
  ) {
    return false;
  }
  return /^[1-9A-HJ-NP-Za-km-z]+$/.test(trimmed);
}

export const TransactionTable: React.FC<TransactionTableProps> = ({ transactions, maxRows }) => {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [copiedTxId, setCopiedTxId] = useState<string | null>(null);

  const pageSize = 10;
  const isCompactPreview = typeof maxRows === 'number';

  const filteredTransactions = useMemo(() => {
    if (isCompactPreview) {
      return transactions.slice(0, maxRows);
    }

    const q = searchQuery.trim().toLowerCase();
    return transactions.filter((tx) => {
      if (typeFilter !== 'all' && tx.type !== typeFilter) return false;
      if (statusFilter !== 'all' && tx.status !== statusFilter) return false;
      if (q) {
        const haystack = [
          tx.description,
          tx.reference,
          tx.paymentMethod,
          tx.txHash,
          tx.currency,
          tx.type,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [transactions, isCompactPreview, maxRows, searchQuery, typeFilter, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredTransactions.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);

  const displayList = useMemo(() => {
    if (isCompactPreview) return filteredTransactions;
    const start = (safePage - 1) * pageSize;
    return filteredTransactions.slice(start, start + pageSize);
  }, [filteredTransactions, isCompactPreview, safePage]);

  const hasActiveFilters =
    searchQuery.trim().length > 0 || typeFilter !== 'all' || statusFilter !== 'all';

  const clearFilters = () => {
    setSearchQuery('');
    setTypeFilter('all');
    setStatusFilter('all');
    setCurrentPage(1);
  };

  const handleCopyHash = (txId: string, hash: string) => {
    navigator.clipboard.writeText(hash);
    setCopiedTxId(txId);
    setTimeout(() => {
      setCopiedTxId((prev) => (prev === txId ? null : prev));
    }, 2000);
  };

  const handleExportCsv = () => {
    if (filteredTransactions.length === 0) return;
    const headers = [
      'Date',
      'Reference',
      'Type',
      'Status',
      'Description',
      'Payment Method',
      'Amount',
      'Currency',
      'Balance After (EUR)',
      'Audit / Tx Hash',
    ];
    const escapeCell = (val: unknown) => {
      const str = String(val ?? '');
      return `"${str.replace(/"/g, '""')}"`;
    };
    const rows = filteredTransactions.map((tx) => [
      new Date(tx.createdAt).toISOString(),
      tx.reference,
      tx.type,
      tx.status,
      tx.description,
      tx.paymentMethod,
      tx.amount,
      tx.currency,
      tx.balanceAfter,
      tx.txHash || '',
    ]);
    const csvContent = [
      headers.map(escapeCell).join(','),
      ...rows.map((r) => r.map(escapeCell).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `lagence-ledger-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const getReceiptData = (tx: Transaction): ReceiptPrintData => ({
    receiptId: tx.reference || tx.id,
    transactionHash: tx.txHash || `0x${tx.id.replace(/-/g, '').slice(0, 32)}`,
    date: formatDate(tx.createdAt),
    userName: user?.fullName || 'Verified Investor',
    userEmail: user?.email || 'investor@lagence.com',
    propertyTitle: tx.description,
    tokensPurchased: tx.type === 'investment' ? Math.max(1, Math.floor(tx.amount / 100)) : 1,
    tokenPrice: tx.type === 'investment' ? 100 : tx.amount,
    totalPaid: tx.amount,
    paymentMethod: tx.paymentMethod || 'Bank Wire / SEPA Instant',
    status: tx.status === 'completed' ? 'Completed' : tx.status === 'pending' ? 'Pending' : 'Verified',
  });

  const handlePrintReceipt = (tx: Transaction) => {
    printTransactionReceipt(getReceiptData(tx));
  };

  const getTypeBadge = (type: Transaction['type']) => {
    switch (type) {
      case 'deposit':
        return (
          <span className="inline-flex items-center gap-1 text-[9.5px] font-semibold text-[#38C982] bg-[#202020] border border-[#38C982]/25 px-2 py-0.5 rounded">
            <ArrowDownLeft className="w-2.5 h-2.5 stroke-[2.5]" /> Deposit
          </span>
        );
      case 'withdrawal':
        return (
          <span className="inline-flex items-center gap-1 text-[9.5px] font-semibold text-[#FF9F43] bg-[#202020] border border-[#FF9F43]/25 px-2 py-0.5 rounded">
            <ArrowUpRight className="w-2.5 h-2.5" /> Withdrawal
          </span>
        );
      case 'investment':
        return (
          <span className="inline-flex items-center gap-1 text-[9.5px] font-semibold text-[#35C9F5] bg-[#202020] border border-[#35C9F5]/25 px-2 py-0.5 rounded">
            <Coins className="w-2.5 h-2.5" /> Investment
          </span>
        );
      case 'distribution':
        return (
          <span className="inline-flex items-center gap-1 text-[9.5px] font-semibold text-[#A66CFF] bg-[#202020] border border-[#A66CFF]/25 px-2 py-0.5 rounded">
            <RefreshCw className="w-2.5 h-2.5" /> Dividend
          </span>
        );
      case 'fee':
        return (
          <span className="inline-flex items-center gap-1 text-[9.5px] font-semibold text-[#E5A84B] bg-[#202020] border border-[#E5A84B]/25 px-2 py-0.5 rounded">
            <RefreshCw className="w-2.5 h-2.5" /> FX / Fee
          </span>
        );
      default:
        return <span className="text-[9.5px] uppercase font-mono text-[#777979] bg-[#202020] px-2 py-0.5 rounded border border-[#303030]">{type}</span>;
    }
  };

  const getStatusBadge = (status: Transaction['status']) => {
    switch (status) {
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 text-[10.5px] font-semibold text-[#43C98B]">
            <CheckCircle2 className="w-3 h-3 text-[#43C98B]" /> Completed
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 text-[10.5px] font-semibold text-[#E5A84B]">
            <Clock className="w-3 h-3 text-[#E5A84B]" /> Pending Review
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1 text-[10.5px] font-semibold text-[#FF4D4D]">
            <AlertCircle className="w-3 h-3" /> Declined
          </span>
        );
      default:
        return <span className="text-[10px] text-[#777979]">{status}</span>;
    }
  };

  const renderHashBadge = (tx: Transaction) => {
    if (!tx.txHash) return null;
    if (isVerifiableSolanaSignature(tx.txHash)) {
      return (
        <a
          href={getSolanaExplorerUrl(tx.txHash, 'tx', 'devnet')}
          target="_blank"
          rel="noopener noreferrer"
          className="font-mono text-[#35C9F5] hover:underline inline-flex items-center gap-0.5"
          title="Inspect on-chain signature on Solana Explorer"
        >
          <span>{formatShortHash(tx.txHash)}</span>
          <ExternalLink className="w-2.5 h-2.5" />
        </a>
      );
    }

    const isCopied = copiedTxId === tx.id;
    return (
      <button
        type="button"
        onClick={() => handleCopyHash(tx.id, tx.txHash!)}
        className="font-mono text-[#35C9F5] hover:text-[#28AEDB] inline-flex items-center gap-0.5 cursor-pointer"
        title="Copy internal custody ledger hash"
        aria-label={`Copy ledger hash ${tx.txHash}`}
      >
        <span>{isCopied ? 'Copied' : formatShortHash(tx.txHash)}</span>
        {isCopied ? <Check className="w-2.5 h-2.5" /> : <Copy className="w-2.5 h-2.5" />}
      </button>
    );
  };


  if (transactions.length === 0) {
    return (
      <div className="bg-[#151515] p-6 sm:p-8 rounded-2xl border border-[#303030] text-center space-y-3">
        <div className="w-10 h-10 rounded-xl bg-[#202020] border border-[#303030] text-[#35C9F5] flex items-center justify-center mx-auto shadow-inner">
          <Clock className="w-5 h-5" />
        </div>
        <div className="max-w-md mx-auto space-y-1">
          <h4 className="text-sm font-bold text-white">Your Financial Activity Ledger is Ready</h4>
          <p className="text-xs text-[#A0A0A0] leading-relaxed">
            When you complete a SEPA bank wire deposit, allocate capital into notarized European SPV properties, or receive monthly rental dividends, your verified transaction activity will record here with real-time double-entry audit hashes.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Search, Filter & Export Toolbar (Full Ledger View Only) */}
      {!isCompactPreview && (
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5 bg-[#151515] p-3 rounded-2xl border border-[#303030]">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-1">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-3.5 h-3.5 text-[#999999] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Search ref, description, method, hash..."
                aria-label="Search ledger transactions"
                className="w-full pl-8 pr-7 py-1.5 rounded-lg border border-[#303030] bg-[#1D1D1D] text-xs text-white placeholder-[#777777] focus:outline-none focus:border-white transition-colors"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setCurrentPage(1);
                  }}
                  aria-label="Clear transaction search"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-[#999999] hover:text-white cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            <select
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value);
                setCurrentPage(1);
              }}
              aria-label="Filter transactions by type"
              className="px-2.5 py-1.5 rounded-lg border border-[#303030] bg-[#1D1D1D] text-xs font-medium text-white focus:outline-none focus:border-white cursor-pointer"
            >
              <option value="all">All Types</option>
              <option value="deposit">Deposits</option>
              <option value="withdrawal">Withdrawals</option>
              <option value="investment">Investments</option>
              <option value="distribution">Dividends</option>
              <option value="fee">FX / Fees</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              aria-label="Filter transactions by status"
              className="px-2.5 py-1.5 rounded-lg border border-[#303030] bg-[#1D1D1D] text-xs font-medium text-white focus:outline-none focus:border-white cursor-pointer"
            >
              <option value="all">All Statuses</option>
              <option value="completed">Completed</option>
              <option value="pending">Pending Review</option>
              <option value="rejected">Declined</option>
            </select>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="px-2.5 py-1.5 rounded-lg border border-[#303030] bg-[#1D1D1D] hover:bg-[#252525] text-xs font-semibold text-[#D0D0D0] hover:text-white cursor-pointer"
              >
                Reset
              </button>
            )}
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-2">
            <span className="text-[11px] font-semibold text-[#999999]">
              Showing {displayList.length} of {filteredTransactions.length}
            </span>
            <button
              type="button"
              onClick={handleExportCsv}
              disabled={filteredTransactions.length === 0}
              className="px-3 py-1.5 rounded-xl bg-white hover:bg-neutral-200 text-black text-xs font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-40 shadow-xs"
            >
              <Download className="w-3.5 h-3.5 text-black" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>
      )}

      {/* Compact Table Count Bar when in Overview preview */}
      {isCompactPreview && (
        <div className="flex items-center justify-between mb-1 px-1">
          <span className="text-[11px] font-semibold text-[#999999]">
            Ledger Records: {displayList.length} of {transactions.length}
          </span>
        </div>
      )}

      {/* Honest Empty Filter State */}
      {filteredTransactions.length === 0 ? (
        <div className="p-6 rounded-2xl border border-[#303030] bg-[#151515] text-center space-y-2">
          <p className="text-xs font-semibold text-white">
            No ledger records match your active search or filters.
          </p>
          <button
            type="button"
            onClick={clearFilters}
            className="px-4 py-1.5 rounded-xl bg-white hover:bg-neutral-200 text-black text-xs font-bold transition-colors cursor-pointer shadow-xs"
          >
            Clear Filters
          </button>
        </div>
      ) : (
        <>
          {/* Mobile-First Compact Transaction Feed (< 640px) */}
          <div className="sm:hidden divide-y divide-[#303030] border border-[#303030] rounded-2xl overflow-hidden bg-[#151515]">
            {displayList.map((tx) => {
              const isFxConversion = tx.type === 'fee' && tx.reference?.startsWith('FX-');
              const isNegative =
                tx.type === 'withdrawal' ||
                tx.type === 'investment' ||
                (tx.type === 'fee' && !isFxConversion);
              const prefix = isFxConversion ? '⇄ ' : isNegative ? '-' : '+';

              return (
                <div
                  key={tx.id}
                  className="p-3 flex items-center justify-between gap-2.5 hover:bg-[#1D1D1D] transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="shrink-0">{getTypeBadge(tx.type)}</div>
                    <div className="min-w-0">
                      <span className="font-semibold text-white block text-xs truncate leading-tight">
                        {tx.description}
                      </span>
                      <div className="flex items-center gap-1.5 text-[9.5px] text-[#999999] leading-tight mt-0.5 flex-wrap">
                        <span>{formatDate(tx.createdAt)}</span>
                        <span>·</span>
                        <span className="font-mono">{tx.paymentMethod}</span>
                        {tx.txHash && (
                          <>
                            <span>·</span>
                            {renderHashBadge(tx)}
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div
                      className={`financial-num text-xs sm:text-[13px] font-[600] ${
                        tx.status === 'pending' || tx.status === 'processing'
                          ? 'text-[#E5A84B]'
                          : isNegative
                          ? 'text-[#F5F5F2]'
                          : 'text-[#43C98B]'
                      }`}
                    >
                      {prefix}
                      {formatCurrency(tx.amount, tx.currency)}
                    </div>
                    <div className="flex items-center justify-end gap-1 mt-0.5">
                      {getStatusBadge(tx.status)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop / Tablet Compact Table (>= 640px) */}
          <div className="hidden sm:block dashboard-table-wrapper border border-[#303030] rounded-2xl overflow-hidden bg-[#151515] shadow-xl">
            <table className="dashboard-table w-full text-left">
              <thead>
                <tr className="bg-[#101010] border-b border-[#303030]">
                  <th className="py-3 px-3.5 text-[10px] sm:text-[10.5px] text-white font-bold uppercase tracking-wider">Type</th>
                  <th className="py-3 px-3.5 text-[10px] sm:text-[10.5px] text-white font-bold uppercase tracking-wider">
                    Description &amp; Reference
                  </th>
                  <th className="py-3 px-3.5 text-[10px] sm:text-[10.5px] text-white font-bold uppercase tracking-wider">Date</th>
                  <th className="py-3 px-3.5 text-[10px] sm:text-[10.5px] text-white font-bold uppercase tracking-wider">Method</th>
                  <th className="py-3 px-3.5 text-[10px] sm:text-[10.5px] text-white font-bold uppercase tracking-wider">Status</th>
                  <th className="py-3 px-3.5 text-[10px] sm:text-[10.5px] text-right text-white font-bold uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="py-3 px-3.5 text-[10px] sm:text-[10.5px] text-right text-white font-bold uppercase tracking-wider">
                    Balance After
                  </th>
                  <th className="py-3 px-3.5 text-[10px] sm:text-[10.5px] text-center text-white font-bold uppercase tracking-wider">
                    Receipt
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#262626]">
                {displayList.map((tx) => {
                  const isFxConversion = tx.type === 'fee' && tx.reference?.startsWith('FX-');
                  const isNegative =
                    tx.type === 'withdrawal' ||
                    tx.type === 'investment' ||
                    (tx.type === 'fee' && !isFxConversion);
                  const prefix = isFxConversion ? '⇄ ' : isNegative ? '-' : '+';

                  return (
                    <tr key={tx.id} className="hover:bg-[#1D1D1D] transition-colors">
                      <td className="py-3 px-3.5">{getTypeBadge(tx.type)}</td>
                      <td className="py-3 px-3.5 max-w-xs">
                        <span className="font-semibold text-white block text-xs truncate">
                          {tx.description}
                        </span>
                        <span className="font-mono text-[10px] text-[#999999] flex items-center gap-1 mt-0.5">
                          <span>Ref: {tx.reference}</span>
                          {tx.txHash && (
                            <>
                              <span>·</span>
                              {renderHashBadge(tx)}
                            </>
                          )}
                        </span>
                      </td>
                      <td className="py-3 px-3.5 text-xs text-[#D0D0D0] whitespace-nowrap font-mono">
                        {formatDate(tx.createdAt)}
                      </td>
                      <td className="py-3 px-3.5 text-xs text-white font-medium whitespace-nowrap">
                        {tx.paymentMethod}
                      </td>
                      <td className="py-3 px-3.5">{getStatusBadge(tx.status)}</td>
                      <td className="py-3 px-3.5 text-right font-[600] financial-num text-xs sm:text-[13px] whitespace-nowrap">
                        <span
                          className={
                            tx.status === 'pending' || tx.status === 'processing'
                              ? 'text-[#E5A84B]'
                              : isNegative
                              ? 'text-[#F5F5F2]'
                              : 'text-[#43C98B]'
                          }
                        >
                          {prefix}
                          {formatCurrency(tx.amount, tx.currency)}
                        </span>
                      </td>
                      <td className="py-3 px-3.5 text-right font-[500] financial-num text-xs text-[#777979] whitespace-nowrap">
                        {formatCurrency(tx.balanceAfter)}
                      </td>
                      <td className="py-3 px-3.5 text-center">
                        <button
                          type="button"
                          onClick={() => handlePrintReceipt(tx)}
                          className="p-1.5 rounded-lg bg-[#1D1D1D] hover:bg-[#262626] text-white transition-colors border border-[#303030] inline-flex items-center justify-center cursor-pointer shadow-2xs"
                          title="Print Official Receipt"
                          aria-label={`Print receipt for ${tx.reference}`}
                        >
                          <Printer className="w-3.5 h-3.5 text-[#00D2FF]" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls (Full Ledger View Only) */}
          {!isCompactPreview && totalPages > 1 && (
            <div className="flex items-center justify-between pt-1 px-1 text-xs">
              <span className="text-[11px] text-[#999999]">
                Page {safePage} of {totalPages}
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={safePage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="px-2.5 py-1 rounded-lg border border-[#303030] bg-[#1D1D1D] hover:bg-[#252525] text-white font-semibold inline-flex items-center gap-1 cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-3.5 h-3.5 text-white" />
                  <span>Prev</span>
                </button>
                <button
                  type="button"
                  disabled={safePage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="px-2.5 py-1 rounded-lg border border-[#303030] bg-[#1D1D1D] hover:bg-[#252525] text-white font-semibold inline-flex items-center gap-1 cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed transition-colors"
                >
                  <span>Next</span>
                  <ChevronRight className="w-3.5 h-3.5 text-white" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
