import React, { useState, useMemo } from 'react';
import {
  Download, Search, ExternalLink, ChevronLeft, ChevronRight, CheckCircle2, Clock, AlertCircle, XCircle
} from 'lucide-react';
import { Transaction } from '../../types/transaction';
import { formatCurrency, formatDate } from '../../lib/utils';
import { useToast } from '../../context/ToastContext';

interface SharedTransactionHistoryProps {
  transactions: Transaction[];
  title?: string;
}

export const SharedTransactionHistory: React.FC<SharedTransactionHistoryProps> = ({
  transactions,
  title = 'Deposit & Withdrawal History',
}) => {
  const toast = useToast();
  const [filterType, setFilterType] = useState<'all' | 'deposit' | 'withdrawal'>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const filtered = useMemo(() => {
    return transactions.filter((tx) => {
      if (filterType !== 'all' && tx.type !== filterType) return false;
      if (filterStatus !== 'all' && tx.status !== filterStatus) return false;

      if (search.trim()) {
        const q = search.toLowerCase();
        const descMatch = tx.description.toLowerCase().includes(q);
        const refMatch = tx.reference?.toLowerCase().includes(q);
        const hashMatch = tx.txHash?.toLowerCase().includes(q);
        if (!descMatch && !refMatch && !hashMatch) return false;
      }

      return true;
    });
  }, [transactions, filterType, filterStatus, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage));
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filtered.slice(start, start + itemsPerPage);
  }, [filtered, currentPage]);

  const handleExportCsv = () => {
    try {
      const headers = ['Reference ID', 'Date', 'Type', 'Method', 'Amount', 'Fee', 'Status', 'Tx Hash'];
      const rows = filtered.map((tx) => [
        `"${tx.id || tx.reference}"`,
        `"${tx.createdAt}"`,
        `"${tx.type}"`,
        `"${tx.paymentMethod || 'SEPA/Wire'}"`,
        tx.amount,
        0,
        `"${tx.status}"`,
        `"${tx.txHash || ''}"`,
      ]);

      const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `cashflow_history_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('Exported transaction history CSV');
    } catch {
      toast.error('Failed to export CSV');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
      case 'approved':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#16A34A]/10 text-[#16A34A] text-[11px] font-semibold capitalize">
            <CheckCircle2 className="w-3 h-3" /> Completed
          </span>
        );
      case 'processing':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#0F4C81]/10 text-[#0F4C81] dark:text-[#14B8A6] text-[11px] font-semibold capitalize">
            <Clock className="w-3 h-3" /> Processing
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#F59E0B]/10 text-[#F59E0B] text-[11px] font-semibold capitalize">
            <Clock className="w-3 h-3" /> Pending
          </span>
        );
      case 'failed':
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#DC2626]/10 text-[#DC2626] text-[11px] font-semibold capitalize">
            <AlertCircle className="w-3 h-3" /> Failed
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[11px] font-semibold capitalize">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="rounded-[12px] bg-white dark:bg-[#111A2C] border border-[#E2E8F0] dark:border-[#1E293B] shadow-[0_1px_3px_rgba(0,0,0,0.06)] overflow-hidden space-y-0">
      {/* Header & Controls */}
      <div className="p-[20px] border-b border-[#E2E8F0] dark:border-[#1E293B] space-y-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-[16px] font-semibold text-[#0F172A] dark:text-[#E2E8F0]">{title}</h3>
            <p className="text-[12px] text-[#64748B] dark:text-[#94A3B8]">
              Audit trail of deposits, withdrawals, and escrow balance adjustments
            </p>
          </div>
          <button
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] border border-[#E2E8F0] dark:border-[#1E293B] text-[12px] font-semibold hover:bg-[#F8FAFC] dark:hover:bg-[#0B1220] transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" /> Export CSV
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-1 text-[12px]">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#64748B] dark:text-[#94A3B8]" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search reference ID, description, or tx hash..."
              className="w-full pl-8 pr-3 py-1.5 rounded-[8px] border border-[#E2E8F0] dark:border-[#1E293B] bg-[#F8FAFC] dark:bg-[#0B1220] text-[13px] focus:outline-none focus:ring-2 focus:ring-[#0F4C81]"
            />
          </div>

          <select
            value={filterType}
            onChange={(e) => {
              setFilterType(e.target.value as any);
              setCurrentPage(1);
            }}
            className="px-3 py-1.5 rounded-[8px] border border-[#E2E8F0] dark:border-[#1E293B] bg-white dark:bg-[#111A2C] text-[#64748B] dark:text-[#94A3B8] focus:outline-none cursor-pointer"
          >
            <option value="all">Type: Deposits & Withdrawals</option>
            <option value="deposit">Deposits Only</option>
            <option value="withdrawal">Withdrawals Only</option>
          </select>

          <select
            value={filterStatus}
            onChange={(e) => {
              setFilterStatus(e.target.value);
              setCurrentPage(1);
            }}
            className="px-3 py-1.5 rounded-[8px] border border-[#E2E8F0] dark:border-[#1E293B] bg-white dark:bg-[#111A2C] text-[#64748B] dark:text-[#94A3B8] focus:outline-none cursor-pointer"
          >
            <option value="all">Status: All Statuses</option>
            <option value="completed">Completed</option>
            <option value="processing">Processing</option>
            <option value="pending">Pending</option>
            <option value="failed">Failed</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-[14px]">
          <thead className="bg-[#F8FAFC] dark:bg-[#0B1220] border-b border-[#E2E8F0] dark:border-[#1E293B] text-[12px] text-[#64748B] dark:text-[#94A3B8] uppercase font-semibold">
            <tr>
              <th className="py-3 px-4">Date</th>
              <th className="py-3 px-4">Type & Method</th>
              <th className="py-3 px-4">Amount</th>
              <th className="py-3 px-4">Fee</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4 text-right">Reference / Hash</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E2E8F0] dark:divide-[#1E293B]">
            {paginatedItems.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-10 text-center text-[#64748B] dark:text-[#94A3B8] text-[13px]">
                  No transaction history recorded yet.
                </td>
              </tr>
            ) : (
              paginatedItems.map((tx) => {
                const isCredit = tx.type === 'deposit';
                return (
                  <tr key={tx.id} className="hover:bg-[#F8FAFC] dark:hover:bg-[#1E293B]/40 transition-colors">
                    <td className="py-3.5 px-4 text-[13px] text-[#64748B] dark:text-[#94A3B8] tabular-nums whitespace-nowrap">
                      {formatDate(tx.createdAt)}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-[14px] capitalize">{tx.type}</div>
                      <div className="text-[12px] text-[#64748B] dark:text-[#94A3B8]">
                        {tx.paymentMethod || 'Bank Wire'}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 tabular-nums font-bold">
                      <span className={isCredit ? 'text-[#16A34A]' : 'text-[#DC2626]'}>
                        {isCredit ? '+' : '-'}{formatCurrency(tx.amount)}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 tabular-nums text-[12px] text-[#64748B]">
                      €0.00
                    </td>
                    <td className="py-3.5 px-4">{getStatusBadge(tx.status)}</td>
                    <td className="py-3.5 px-4 text-right">
                      {tx.txHash ? (
                        <a
                          href={`https://polygonscan.com/tx/${tx.txHash}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 font-mono text-[12px] text-[#0F4C81] dark:text-[#14B8A6] hover:underline tabular-nums"
                        >
                          {tx.txHash.slice(0, 6)}...{tx.txHash.slice(-4)} <ExternalLink className="w-3 h-3" />
                        </a>
                      ) : (
                        <span className="font-mono text-[12px] text-[#64748B] tabular-nums">
                          {tx.reference || tx.id.slice(0, 10)}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="flex items-center justify-between px-4 py-3 bg-[#F8FAFC] dark:bg-[#0B1220] border-t border-[#E2E8F0] dark:border-[#1E293B] text-[12px] text-[#64748B] dark:text-[#94A3B8]">
        <div>
          Showing <span className="font-semibold text-[#0F172A] dark:text-[#E2E8F0]">{(currentPage - 1) * itemsPerPage + 1}</span> to{' '}
          <span className="font-semibold text-[#0F172A] dark:text-[#E2E8F0]">{Math.min(filtered.length, currentPage * itemsPerPage)}</span> of{' '}
          <span className="font-semibold text-[#0F172A] dark:text-[#E2E8F0]">{filtered.length}</span> records
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="p-1 rounded-[6px] border border-[#E2E8F0] dark:border-[#1E293B] hover:bg-white dark:hover:bg-[#111A2C] disabled:opacity-40"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="px-2 font-semibold text-[#0F172A] dark:text-[#E2E8F0]">
            {currentPage} / {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="p-1 rounded-[6px] border border-[#E2E8F0] dark:border-[#1E293B] hover:bg-white dark:hover:bg-[#111A2C] disabled:opacity-40"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
