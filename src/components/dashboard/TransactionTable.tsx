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
          <span className="inline-flex items-center gap-1 text-[9.5px] font-bold text-[#087F5B] bg-[#DDF5EC] border border-[#BCE8D7] px-2 py-0.5 rounded-full">
            <ArrowDownLeft className="w-2.5 h-2.5 stroke-[2.5]" /> Deposit
          </span>
        );
      case 'withdrawal':
        return (
          <span className="inline-flex items-center gap-1 text-[9.5px] font-bold text-[#C24141] bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full">
            <ArrowUpRight className="w-2.5 h-2.5" /> Withdrawal
          </span>
        );
      case 'investment':
        return (
          <span className="inline-flex items-center gap-1 text-[9.5px] font-bold text-[#075B46] bg-[#F6FAF8] border border-[#E4EEEA] px-2 py-0.5 rounded-full">
            <Coins className="w-2.5 h-2.5" /> Investment
          </span>
        );
      case 'distribution':
        return (
          <span className="inline-flex items-center gap-1 text-[9.5px] font-bold text-[#087F5B] bg-[#DDF5EC] border border-[#BCE8D7] px-2 py-0.5 rounded-full">
            <RefreshCw className="w-2.5 h-2.5" /> Dividend
          </span>
        );
      case 'fee':
        return (
          <span className="inline-flex items-center gap-1 text-[9.5px] font-bold text-indigo-800 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full">
            <RefreshCw className="w-2.5 h-2.5" /> FX / Fee
          </span>
        );
      default:
        return <span className="text-[9.5px] uppercase font-mono">{type}</span>;
    }
  };

  const getStatusBadge = (status: Transaction['status']) => {
    switch (status) {
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 text-[10.5px] font-bold text-[#087F5B]">
            <CheckCircle2 className="w-3 h-3 text-[#087F5B]" /> Completed
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 text-[10.5px] font-bold text-amber-600">
            <Clock className="w-3 h-3" /> Pending Review
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1 text-[10.5px] font-bold text-rose-600">
            <AlertCircle className="w-3 h-3" /> Declined
          </span>
        );
      default:
        return <span className="text-[10px]">{status}</span>;
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
          className="font-mono text-[#087F5B] hover:underline inline-flex items-center gap-0.5"
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
        className="font-mono text-[#087F5B] hover:text-[#075B46] inline-flex items-center gap-0.5 cursor-pointer"
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
      <div className="dash-card p-5 rounded-xl border text-center text-xs dash-muted">
        No ledger transactions recorded for this account yet.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Search, Filter & Export Toolbar (Full Ledger View Only) */}
      {!isCompactPreview && (
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5 bg-[#F6FAF8] p-2.5 rounded-xl border border-[#E4EEEA]">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-1">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-3.5 h-3.5 text-[#71817D] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Search ref, description, method, hash..."
                aria-label="Search ledger transactions"
                className="w-full pl-8 pr-7 py-1.5 rounded-lg border border-[#E4EEEA] bg-white text-xs text-[#172B2A] placeholder-[#71817D] focus:outline-none focus:border-[#087F5B]"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setCurrentPage(1);
                  }}
                  aria-label="Clear transaction search"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-[#71817D] hover:text-[#172B2A] cursor-pointer"
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
              className="px-2.5 py-1.5 rounded-lg border border-[#E4EEEA] bg-white text-xs font-medium text-[#172B2A] focus:outline-none focus:border-[#087F5B] cursor-pointer"
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
              className="px-2.5 py-1.5 rounded-lg border border-[#E4EEEA] bg-white text-xs font-medium text-[#172B2A] focus:outline-none focus:border-[#087F5B] cursor-pointer"
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
                className="px-2.5 py-1.5 rounded-lg border border-[#E4EEEA] bg-white hover:bg-slate-50 text-xs font-semibold text-[#71817D] hover:text-[#172B2A] cursor-pointer"
              >
                Reset
              </button>
            )}
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-2">
            <span className="text-[11px] font-semibold text-[#71817D]">
              Showing {displayList.length} of {filteredTransactions.length}
            </span>
            <button
              type="button"
              onClick={handleExportCsv}
              disabled={filteredTransactions.length === 0}
              className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-[#EEF5F1] border border-[#E4EEEA] text-xs font-semibold text-[#172B2A] inline-flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5 text-[#087F5B]" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>
      )}

      {/* Compact Table Count Bar when in Overview preview */}
      {isCompactPreview && (
        <div className="flex items-center justify-between mb-1 px-1">
          <span className="text-[11px] font-semibold text-[#71817D]">
            Ledger Records: {displayList.length} of {transactions.length}
          </span>
        </div>
      )}

      {/* Honest Empty Filter State */}
      {filteredTransactions.length === 0 ? (
        <div className="p-6 rounded-xl border border-[#E4EEEA] bg-[#F6FAF8]/60 text-center space-y-2">
          <p className="text-xs font-semibold text-[#172B2A]">
            No ledger records match your active search or filters.
          </p>
          <button
            type="button"
            onClick={clearFilters}
            className="px-3 py-1.5 rounded-lg bg-[#087F5B] text-white text-xs font-semibold hover:bg-[#075B46] transition-colors cursor-pointer"
          >
            Clear Filters
          </button>
        </div>
      ) : (
        <>
          {/* Mobile-First Compact Transaction Feed (< 640px) */}
          <div className="sm:hidden divide-y border border-inherit/40 rounded-xl overflow-hidden dash-card">
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
                  className="p-2.5 flex items-center justify-between gap-2.5 hover:opacity-90 transition-opacity"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="shrink-0">{getTypeBadge(tx.type)}</div>
                    <div className="min-w-0">
                      <span className="font-semibold dash-text block text-xs truncate leading-tight">
                        {tx.description}
                      </span>
                      <div className="flex items-center gap-1.5 text-[9.5px] dash-muted leading-tight mt-0.5 flex-wrap">
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
                      className={`font-black text-xs tabular-nums ${
                        isFxConversion
                          ? 'text-indigo-700'
                          : isNegative
                          ? 'dash-text'
                          : 'text-[#087F5B]'
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
          <div className="hidden sm:block dashboard-table-wrapper border border-[#E4EEEA] rounded-2xl overflow-hidden bg-white shadow-xs">
            <table className="dashboard-table">
              <thead>
                <tr className="bg-[#F6FAF8]">
                  <th className="py-2.5 px-3 text-[10px] sm:text-[10.5px] text-[#71817D]">Type</th>
                  <th className="py-2.5 px-3 text-[10px] sm:text-[10.5px] text-[#71817D]">
                    Description &amp; Reference
                  </th>
                  <th className="py-2.5 px-3 text-[10px] sm:text-[10.5px] text-[#71817D]">Date</th>
                  <th className="py-2.5 px-3 text-[10px] sm:text-[10.5px] text-[#71817D]">Method</th>
                  <th className="py-2.5 px-3 text-[10px] sm:text-[10.5px] text-[#71817D]">Status</th>
                  <th className="py-2.5 px-3 text-[10px] sm:text-[10.5px] text-right text-[#71817D]">
                    Amount
                  </th>
                  <th className="py-2.5 px-3 text-[10px] sm:text-[10.5px] text-right text-[#71817D]">
                    Balance After
                  </th>
                  <th className="py-2.5 px-3 text-[10px] sm:text-[10.5px] text-center text-[#71817D]">
                    Receipt
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E4EEEA]">
                {displayList.map((tx) => {
                  const isFxConversion = tx.type === 'fee' && tx.reference?.startsWith('FX-');
                  const isNegative =
                    tx.type === 'withdrawal' ||
                    tx.type === 'investment' ||
                    (tx.type === 'fee' && !isFxConversion);
                  const prefix = isFxConversion ? '⇄ ' : isNegative ? '-' : '+';

                  return (
                    <tr key={tx.id} className="hover:bg-[#F6FAF8]/70 transition-colors">
                      <td className="py-2.5 px-3">{getTypeBadge(tx.type)}</td>
                      <td className="py-2.5 px-3 max-w-xs">
                        <span className="font-semibold text-[#172B2A] block text-xs truncate">
                          {tx.description}
                        </span>
                        <span className="font-mono text-[10px] text-[#71817D] flex items-center gap-1 mt-0.5">
                          <span>Ref: {tx.reference}</span>
                          {tx.txHash && (
                            <>
                              <span>·</span>
                              {renderHashBadge(tx)}
                            </>
                          )}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-xs text-[#71817D] whitespace-nowrap font-mono">
                        {formatDate(tx.createdAt)}
                      </td>
                      <td className="py-2.5 px-3 text-xs text-[#172B2A] font-medium whitespace-nowrap">
                        {tx.paymentMethod}
                      </td>
                      <td className="py-2.5 px-3">{getStatusBadge(tx.status)}</td>
                      <td className="py-2.5 px-3 text-right font-bold font-mono tabular-nums text-xs sm:text-[13px] whitespace-nowrap">
                        <span
                          className={
                            isFxConversion
                              ? 'text-indigo-700'
                              : isNegative
                              ? 'text-[#172B2A]'
                              : 'text-[#087F5B]'
                          }
                        >
                          {prefix}
                          {formatCurrency(tx.amount, tx.currency)}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-medium font-mono tabular-nums text-xs text-[#71817D] whitespace-nowrap">
                        {formatCurrency(tx.balanceAfter)}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => handlePrintReceipt(tx)}
                          className="p-1.5 rounded-lg bg-[#F6F7F4] hover:bg-[#EEF1EC] text-[#182D2A] transition-colors border border-[#E3E8E3] inline-flex items-center justify-center cursor-pointer"
                          title="Print Official Receipt"
                          aria-label={`Print receipt for ${tx.reference}`}
                        >
                          <Printer className="w-3.5 h-3.5 text-[#27845D]" />
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
              <span className="text-[11px] text-[#71817D]">
                Page {safePage} of {totalPages}
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={safePage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="px-2.5 py-1 rounded-lg border border-[#E4EEEA] bg-white hover:bg-[#F6FAF8] text-[#172B2A] font-semibold inline-flex items-center gap-1 cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Prev</span>
                </button>
                <button
                  type="button"
                  disabled={safePage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="px-2.5 py-1 rounded-lg border border-[#E4EEEA] bg-white hover:bg-[#F6FAF8] text-[#172B2A] font-semibold inline-flex items-center gap-1 cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed"
                >
                  <span>Next</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
