import React, { useEffect, useMemo, useState } from 'react';
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
  Eye,
  Calendar,
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
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [copiedTxId, setCopiedTxId] = useState<string | null>(null);
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);

  const pageSize = 10;
  const isCompactPreview = typeof maxRows === 'number';

  useEffect(() => {
    if (!selectedTx) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedTx(null);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selectedTx]);

  const filteredTransactions = useMemo(() => {
    if (isCompactPreview) {
      return transactions.slice(0, maxRows);
    }

    const q = searchQuery.trim().toLowerCase();
    const fromMs = fromDate ? new Date(`${fromDate}T00:00:00.000Z`).getTime() : null;
    const toMs = toDate ? new Date(`${toDate}T23:59:59.999Z`).getTime() : null;

    return transactions.filter((tx) => {
      if (typeFilter !== 'all' && tx.type !== typeFilter) return false;
      if (statusFilter !== 'all' && tx.status !== statusFilter) return false;
      if (fromMs !== null || toMs !== null) {
        const txMs = new Date(tx.createdAt).getTime();
        if (!Number.isNaN(txMs)) {
          if (fromMs !== null && txMs < fromMs) return false;
          if (toMs !== null && txMs > toMs) return false;
        }
      }
      if (q) {
        const haystack = [
          tx.description,
          tx.reference,
          tx.paymentMethod,
          tx.txHash,
          tx.currency,
          tx.type,
          tx.metadata?.propertyTitle,
          tx.metadata?.fromCurrency,
          tx.metadata?.toCurrency,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [transactions, isCompactPreview, maxRows, searchQuery, typeFilter, statusFilter, fromDate, toDate]);

  const totalPages = Math.max(1, Math.ceil(filteredTransactions.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);

  const displayList = useMemo(() => {
    if (isCompactPreview) return filteredTransactions;
    const start = (safePage - 1) * pageSize;
    return filteredTransactions.slice(start, start + pageSize);
  }, [filteredTransactions, isCompactPreview, safePage]);

  const hasActiveFilters =
    searchQuery.trim().length > 0 ||
    typeFilter !== 'all' ||
    statusFilter !== 'all' ||
    Boolean(fromDate) ||
    Boolean(toDate);

  const clearFilters = () => {
    setSearchQuery('');
    setTypeFilter('all');
    setStatusFilter('all');
    setFromDate('');
    setToDate('');
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
    propertyTitle: tx.metadata?.propertyTitle || tx.description,
    tokensPurchased:
      tx.metadata?.tokens || (tx.type === 'investment' ? Math.max(1, Math.floor(tx.amount / 100)) : 1),
    tokenPrice: tx.type === 'investment' && tx.metadata?.tokens ? tx.amount / tx.metadata.tokens : tx.amount,
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
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[var(--dash-positive)] bg-[var(--dash-highlight)] border border-[var(--dash-accent-border)] px-2 py-0.5 rounded-full">
            <ArrowDownLeft className="w-2.5 h-2.5 stroke-[2.5]" /> Deposit
          </span>
        );
      case 'withdrawal':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[var(--dash-warm)] bg-[var(--dash-inner)] border border-[var(--dash-warm-border)] px-2 py-0.5 rounded-full">
            <ArrowUpRight className="w-2.5 h-2.5" /> Withdrawal
          </span>
        );
      case 'investment':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[var(--dash-info)] bg-[var(--dash-inner)] border border-[var(--dash-card-border)] px-2 py-0.5 rounded-full">
            <Coins className="w-2.5 h-2.5" /> Investment
          </span>
        );
      case 'distribution':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[var(--dash-accent)] bg-[var(--dash-highlight)] border border-[var(--dash-accent-border)] px-2 py-0.5 rounded-full">
            <RefreshCw className="w-2.5 h-2.5" /> Distribution
          </span>
        );
      case 'fee':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[var(--dash-text-secondary)] bg-[var(--dash-inner)] border border-[var(--dash-card-border)] px-2 py-0.5 rounded-full">
            <RefreshCw className="w-2.5 h-2.5" /> FX / Fee
          </span>
        );
      default:
        return (
          <span className="text-[10px] uppercase font-mono text-[var(--dash-text-muted)] bg-[var(--dash-inner)] px-2 py-0.5 rounded-full border border-[var(--dash-card-border)]">
            {type}
          </span>
        );
    }
  };

  const getStatusBadge = (status: Transaction['status']) => {
    switch (status) {
      case 'completed':
      case 'approved':
        return (
          <span className="inline-flex items-center gap-1 text-[10.5px] font-semibold text-[var(--dash-positive)]">
            <CheckCircle2 className="w-3 h-3" /> {status === 'approved' ? 'Approved' : 'Completed'}
          </span>
        );
      case 'pending':
      case 'processing':
        return (
          <span className="inline-flex items-center gap-1 text-[10.5px] font-semibold text-[var(--dash-warm)]">
            <Clock className="w-3 h-3" /> {status === 'processing' ? 'Processing' : 'Pending'}
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1 text-[10.5px] font-semibold text-[var(--dash-negative)]">
            <AlertCircle className="w-3 h-3" /> Declined
          </span>
        );
      default:
        return <span className="text-[10.5px] text-[var(--dash-text-muted)] capitalize">{status}</span>;
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
          onClick={(e) => e.stopPropagation()}
          className="font-mono text-[var(--dash-accent)] hover:underline inline-flex items-center gap-0.5"
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
        onClick={(e) => {
          e.stopPropagation();
          handleCopyHash(tx.id, tx.txHash!);
        }}
        className="font-mono text-[var(--dash-accent)] hover:opacity-80 inline-flex items-center gap-0.5 cursor-pointer"
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
      <div className="rounded-[18px] border border-dashed border-[var(--dash-card-border)] bg-[var(--dash-card)] p-8 text-center space-y-3">
        <div className="w-10 h-10 rounded-xl bg-[var(--dash-inner)] border border-[var(--dash-card-border)] text-[var(--dash-accent)] flex items-center justify-center mx-auto">
          <Clock className="w-5 h-5" />
        </div>
        <div className="max-w-md mx-auto space-y-1">
          <h4 className="text-sm font-bold text-[var(--dash-text)]">No transactions yet</h4>
          <p className="text-xs text-[var(--dash-text-muted)] leading-relaxed">
            Deposits, SPV unit allocations, FX conversions, withdrawals, and monthly rental distributions will appear here once recorded.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3.5">
      {/* Category Chips + Search, Date Range & Export Toolbar */}
      {!isCompactPreview && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {[
              { id: 'all', label: 'All' },
              { id: 'deposit', label: 'Deposits' },
              { id: 'investment', label: 'Investments' },
              { id: 'withdrawal', label: 'Withdrawals' },
              { id: 'distribution', label: 'Distributions' },
              { id: 'fee', label: 'FX / Fees' },
            ].map((chip) => (
              <button
                key={chip.id}
                type="button"
                onClick={() => {
                  setTypeFilter(chip.id);
                  setCurrentPage(1);
                }}
                className={`portal-chip cursor-pointer ${typeFilter === chip.id ? 'on' : ''}`}
              >
                {chip.label}
              </button>
            ))}
          </div>

          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-2.5 portal-card p-3">
            <div className="flex flex-wrap items-center gap-2 flex-1">
              <div className="relative flex-1 min-w-[200px] max-w-xs">
                <Search className="w-3.5 h-3.5 text-[var(--dash-text-muted)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder="Search ref, asset, method, hash..."
                  aria-label="Search ledger transactions"
                  className="portal-input !h-9 pl-8 pr-7 text-xs"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setCurrentPage(1);
                    }}
                    aria-label="Clear transaction search"
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--dash-text-muted)] hover:text-[var(--dash-text)] cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
                aria-label="Filter transactions by status"
                className="px-3 h-9 rounded-xl border border-[var(--dash-card-border)] bg-[var(--dash-inner)] text-xs font-medium text-[var(--dash-text)] focus:outline-none focus:border-[var(--dash-accent)] cursor-pointer"
              >
                <option value="all">All Statuses</option>
                <option value="completed">Completed</option>
                <option value="pending">Pending Review</option>
                <option value="processing">Processing</option>
                <option value="rejected">Declined</option>
              </select>

              <div className="flex items-center gap-1.5">
                <label htmlFor="tx-from-date" className="text-[10.5px] text-[var(--dash-text-muted)] inline-flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  <span className="sr-only sm:not-sr-only">From</span>
                </label>
                <input
                  id="tx-from-date"
                  type="date"
                  value={fromDate}
                  onChange={(e) => {
                    setFromDate(e.target.value);
                    setCurrentPage(1);
                  }}
                  aria-label="Filter from date"
                  className="px-2.5 h-9 rounded-xl border border-[var(--dash-card-border)] bg-[var(--dash-inner)] text-xs text-[var(--dash-text)] focus:outline-none focus:border-[var(--dash-accent)]"
                />
                <span className="text-[var(--dash-text-muted)] text-xs">–</span>
                <input
                  id="tx-to-date"
                  type="date"
                  value={toDate}
                  onChange={(e) => {
                    setToDate(e.target.value);
                    setCurrentPage(1);
                  }}
                  aria-label="Filter to date"
                  className="px-2.5 h-9 rounded-xl border border-[var(--dash-card-border)] bg-[var(--dash-inner)] text-xs text-[var(--dash-text)] focus:outline-none focus:border-[var(--dash-accent)]"
                />
              </div>

              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="px-3 h-9 rounded-xl border border-[var(--dash-card-border)] bg-[var(--dash-inner)] hover:bg-[var(--dash-hover)] text-xs font-semibold text-[var(--dash-text)] cursor-pointer"
                >
                  Reset
                </button>
              )}
            </div>

            <div className="flex items-center justify-between xl:justify-end gap-2.5 shrink-0">
              <span className="text-[11px] font-semibold text-[var(--dash-text-muted)]">
                Showing {displayList.length} of {filteredTransactions.length}
              </span>
              <button
                type="button"
                onClick={handleExportCsv}
                disabled={filteredTransactions.length === 0}
                className="h-9 px-3.5 rounded-xl bg-[var(--dash-accent)] text-[var(--dash-accent-ink)] text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-40 hover:brightness-105 transition-all"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export CSV</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {isCompactPreview && (
        <div className="flex items-center justify-between mb-1 px-1">
          <span className="text-[11px] font-semibold text-[var(--dash-text-muted)]">
            Ledger Records: {displayList.length} of {transactions.length}
          </span>
        </div>
      )}

      {filteredTransactions.length === 0 ? (
        <div className="portal-card p-6 text-center space-y-2.5">
          <p className="text-xs font-semibold text-[var(--dash-text)]">
            No transactions match your active search or filters.
          </p>
          <button
            type="button"
            onClick={clearFilters}
            className="portal-btn h-9 text-xs cursor-pointer"
          >
            Clear Filters
          </button>
        </div>
      ) : (
        <>
          {/* Mobile Compact Feed (< 640px) */}
          <div className="sm:hidden portal-card divide-y divide-[var(--dash-card-border)] overflow-hidden">
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
                  onClick={() => setSelectedTx(tx)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setSelectedTx(tx);
                    }
                  }}
                  className="p-3.5 flex items-center justify-between gap-2.5 hover:bg-[var(--dash-hover)] transition-colors cursor-pointer"
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      {getTypeBadge(tx.type)}
                      {tx.txHash && <span className="text-[10px]">{renderHashBadge(tx)}</span>}
                    </div>
                    <div className="font-semibold text-[var(--dash-text)] text-xs truncate">
                      {tx.description}
                    </div>
                    <div className="text-[10.5px] text-[var(--dash-text-muted)] flex items-center gap-1.5 flex-wrap">
                      <span>{formatDate(tx.createdAt)}</span>
                      <span>·</span>
                      <span className="capitalize">{tx.status}</span>
                    </div>
                  </div>

                  <div className="text-right shrink-0 space-y-1">
                    <div
                      className={`financial-num text-xs font-bold ${
                        tx.status === 'pending' || tx.status === 'processing'
                          ? 'text-[var(--dash-warm)]'
                          : isNegative
                          ? 'text-[var(--dash-text)]'
                          : 'text-[var(--dash-positive)]'
                      }`}
                    >
                      {prefix}
                      {formatCurrency(tx.amount, tx.currency)}
                    </div>
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePrintReceipt(tx);
                        }}
                        className="text-[10px] text-[var(--dash-accent)] font-semibold hover:underline cursor-pointer"
                      >
                        Receipt
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop / Tablet Table (>= 640px) */}
          <div className="hidden sm:block dashboard-table-wrapper portal-card overflow-hidden">
            <table className="dashboard-table w-full text-left">
              <thead>
                <tr className="bg-[var(--dash-inner)] border-b border-[var(--dash-card-border)]">
                  <th className="py-3 px-3.5 text-[10px] text-[var(--dash-text-muted)] font-bold uppercase tracking-wider">
                    Type
                  </th>
                  <th className="py-3 px-3.5 text-[10px] text-[var(--dash-text-muted)] font-bold uppercase tracking-wider">
                    Description &amp; Reference
                  </th>
                  <th className="py-3 px-3.5 text-[10px] text-[var(--dash-text-muted)] font-bold uppercase tracking-wider">
                    Date
                  </th>
                  <th className="py-3 px-3.5 text-[10px] text-[var(--dash-text-muted)] font-bold uppercase tracking-wider">
                    Method
                  </th>
                  <th className="py-3 px-3.5 text-[10px] text-[var(--dash-text-muted)] font-bold uppercase tracking-wider">
                    Status
                  </th>
                  <th className="py-3 px-3.5 text-[10px] text-right text-[var(--dash-text-muted)] font-bold uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="py-3 px-3.5 text-[10px] text-right text-[var(--dash-text-muted)] font-bold uppercase tracking-wider">
                    Balance After
                  </th>
                  <th className="py-3 px-3.5 text-[10px] text-center text-[var(--dash-text-muted)] font-bold uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--dash-card-border)]">
                {displayList.map((tx) => {
                  const isFxConversion = tx.type === 'fee' && tx.reference?.startsWith('FX-');
                  const isNegative =
                    tx.type === 'withdrawal' ||
                    tx.type === 'investment' ||
                    (tx.type === 'fee' && !isFxConversion);
                  const prefix = isFxConversion ? '⇄ ' : isNegative ? '-' : '+';

                  return (
                    <tr
                      key={tx.id}
                      onClick={() => setSelectedTx(tx)}
                      className="hover:bg-[var(--dash-hover)] transition-colors cursor-pointer"
                    >
                      <td className="py-3 px-3.5">{getTypeBadge(tx.type)}</td>
                      <td className="py-3 px-3.5 max-w-xs">
                        <span className="font-semibold text-[var(--dash-text)] block text-xs truncate">
                          {tx.description}
                        </span>
                        <span className="font-mono text-[10px] text-[var(--dash-text-muted)] flex items-center gap-1 mt-0.5">
                          <span>Ref: {tx.reference}</span>
                          {tx.txHash && (
                            <>
                              <span>·</span>
                              {renderHashBadge(tx)}
                            </>
                          )}
                        </span>
                      </td>
                      <td className="py-3 px-3.5 text-xs text-[var(--dash-text-secondary)] whitespace-nowrap font-mono">
                        {formatDate(tx.createdAt)}
                      </td>
                      <td className="py-3 px-3.5 text-xs text-[var(--dash-text)] font-medium whitespace-nowrap">
                        {tx.paymentMethod}
                      </td>
                      <td className="py-3 px-3.5">{getStatusBadge(tx.status)}</td>
                      <td className="py-3 px-3.5 text-right font-bold financial-num text-xs sm:text-[13px] whitespace-nowrap">
                        <span
                          className={
                            tx.status === 'pending' || tx.status === 'processing'
                              ? 'text-[var(--dash-warm)]'
                              : isNegative
                              ? 'text-[var(--dash-text)]'
                              : 'text-[var(--dash-positive)]'
                          }
                        >
                          {prefix}
                          {formatCurrency(tx.amount, tx.currency)}
                        </span>
                      </td>
                      <td className="py-3 px-3.5 text-right font-medium financial-num text-xs text-[var(--dash-text-muted)] whitespace-nowrap">
                        {formatCurrency(tx.balanceAfter)}
                      </td>
                      <td className="py-3 px-3.5 text-center">
                        <div className="inline-flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedTx(tx);
                            }}
                            className="p-1.5 rounded-lg bg-[var(--dash-inner)] hover:bg-[var(--dash-hover)] text-[var(--dash-text-secondary)] hover:text-[var(--dash-text)] transition-colors border border-[var(--dash-card-border)] inline-flex items-center justify-center cursor-pointer"
                            title="Inspect Transaction Details"
                            aria-label={`Inspect transaction ${tx.reference}`}
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePrintReceipt(tx);
                            }}
                            className="p-1.5 rounded-lg bg-[var(--dash-inner)] hover:bg-[var(--dash-hover)] text-[var(--dash-text)] transition-colors border border-[var(--dash-card-border)] inline-flex items-center justify-center cursor-pointer"
                            title="Print Official Receipt"
                            aria-label={`Print receipt for ${tx.reference}`}
                          >
                            <Printer className="w-3.5 h-3.5 text-[var(--dash-accent)]" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {!isCompactPreview && totalPages > 1 && (
            <div className="flex items-center justify-between pt-1 px-1 text-xs">
              <span className="text-[11px] text-[var(--dash-text-muted)]">
                Page {safePage} of {totalPages}
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={safePage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="px-2.5 py-1 rounded-lg border border-[var(--dash-card-border)] bg-[var(--dash-card)] hover:bg-[var(--dash-hover)] text-[var(--dash-text)] font-semibold inline-flex items-center gap-1 cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Prev</span>
                </button>
                <button
                  type="button"
                  disabled={safePage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="px-2.5 py-1 rounded-lg border border-[var(--dash-card-border)] bg-[var(--dash-card)] hover:bg-[var(--dash-hover)] text-[var(--dash-text)] font-semibold inline-flex items-center gap-1 cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed transition-colors"
                >
                  <span>Next</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Responsive Transaction Detail Modal */}
      {selectedTx && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="tx-detail-modal-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedTx(null);
          }}
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="portal-card max-w-lg w-full overflow-hidden shadow-2xl border border-[var(--dash-card-border)] text-left"
          >
            <div className="px-5 py-4 bg-[var(--dash-inner)] border-b border-[var(--dash-card-border)] flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  {getTypeBadge(selectedTx.type)}
                  {getStatusBadge(selectedTx.status)}
                </div>
                <h3 id="tx-detail-modal-title" className="text-sm font-bold text-[var(--dash-text)] mt-1.5 truncate">
                  {selectedTx.description}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTx(null)}
                aria-label="Close transaction details"
                className="p-1.5 rounded-lg text-[var(--dash-text-muted)] hover:text-[var(--dash-text)] hover:bg-[var(--dash-hover)] cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div className="p-4 rounded-xl bg-[var(--dash-inner)] border border-[var(--dash-card-border)] flex items-center justify-between gap-3">
                <div>
                  <span className="text-[10px] uppercase tracking-wider text-[var(--dash-text-muted)] font-semibold block">
                    Amount
                  </span>
                  <span className="text-xl font-bold font-mono tabular-nums text-[var(--dash-text)] mt-0.5 block">
                    {formatCurrency(selectedTx.amount, selectedTx.currency)} {selectedTx.currency}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase tracking-wider text-[var(--dash-text-muted)] font-semibold block">
                    Ledger Balance After
                  </span>
                  <span className="text-sm font-bold font-mono tabular-nums text-[var(--dash-accent)] mt-0.5 block">
                    {formatCurrency(selectedTx.balanceAfter)}
                  </span>
                </div>
              </div>

              <div className="space-y-2.5 p-3.5 rounded-xl bg-[var(--dash-inner)] border border-[var(--dash-card-border)]">
                <div className="flex justify-between gap-3">
                  <span className="text-[var(--dash-text-muted)]">Transaction Reference</span>
                  <span className="font-mono font-bold text-[var(--dash-text)]">{selectedTx.reference}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-[var(--dash-text-muted)]">Recorded Date &amp; Time</span>
                  <span className="font-mono text-[var(--dash-text)]">{formatDate(selectedTx.createdAt)}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-[var(--dash-text-muted)]">Payment / Settlement Rail</span>
                  <span className="font-semibold text-[var(--dash-text)]">{selectedTx.paymentMethod || 'Internal Ledger'}</span>
                </div>
                {selectedTx.metadata?.propertyTitle && (
                  <div className="flex justify-between gap-3">
                    <span className="text-[var(--dash-text-muted)]">Property Asset</span>
                    <span className="font-semibold text-[var(--dash-text)]">{selectedTx.metadata.propertyTitle}</span>
                  </div>
                )}
                {selectedTx.metadata?.tokens && (
                  <div className="flex justify-between gap-3">
                    <span className="text-[var(--dash-text-muted)]">Allocated SPV Units</span>
                    <span className="font-mono font-semibold text-[var(--dash-positive)]">
                      {selectedTx.metadata.tokens} Units
                    </span>
                  </div>
                )}
                {selectedTx.metadata?.bankIban && (
                  <div className="flex justify-between gap-3">
                    <span className="text-[var(--dash-text-muted)]">Destination IBAN / Address</span>
                    <span className="font-mono text-[var(--dash-text)] truncate max-w-[230px]">
                      {selectedTx.metadata.bankIban}
                    </span>
                  </div>
                )}
                {selectedTx.metadata?.destinationAddress && (
                  <div className="flex justify-between gap-3">
                    <span className="text-[var(--dash-text-muted)]">Destination</span>
                    <span className="font-mono text-[var(--dash-text)] truncate max-w-[230px]">
                      {selectedTx.metadata.destinationAddress}
                    </span>
                  </div>
                )}
                {selectedTx.metadata?.fromCurrency && selectedTx.metadata?.toCurrency && (
                  <>
                    <div className="flex justify-between gap-3">
                      <span className="text-[var(--dash-text-muted)]">FX Conversion Pair</span>
                      <span className="font-mono font-semibold text-[var(--dash-text)]">
                        {selectedTx.metadata.fromAmount} {selectedTx.metadata.fromCurrency} → {selectedTx.metadata.toAmount} {selectedTx.metadata.toCurrency}
                      </span>
                    </div>
                    {selectedTx.metadata.crossRate && (
                      <div className="flex justify-between gap-3">
                        <span className="text-[var(--dash-text-muted)]">Execution Rate / Fee</span>
                        <span className="font-mono text-[var(--dash-text)]">
                          1 {selectedTx.metadata.fromCurrency} = {Number(selectedTx.metadata.crossRate).toFixed(6)} {selectedTx.metadata.toCurrency}
                          {selectedTx.metadata.feeEur ? ` · €${Number(selectedTx.metadata.feeEur).toFixed(2)} fee` : ''}
                        </span>
                      </div>
                    )}
                  </>
                )}
                {selectedTx.txHash && (
                  <div className="flex justify-between items-center gap-3 pt-2 border-t border-[var(--dash-card-border)]">
                    <span className="text-[var(--dash-text-muted)]">Settlement Hash</span>
                    {renderHashBadge(selectedTx)}
                  </div>
                )}
                {(selectedTx.metadata?.rejectionReason || selectedTx.metadata?.notes) && (
                  <div className="pt-2 border-t border-[var(--dash-card-border)]">
                    <span className="text-[var(--dash-text-muted)] block mb-0.5">Compliance / Advisory Note</span>
                    <p className="text-[var(--dash-text-secondary)]">
                      {selectedTx.metadata.rejectionReason || selectedTx.metadata.notes}
                    </p>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => handlePrintReceipt(selectedTx)}
                  className="flex-1 portal-btn !h-10 text-xs inline-flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Official Receipt</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedTx(null)}
                  className="portal-btn-outline !h-10 text-xs cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

