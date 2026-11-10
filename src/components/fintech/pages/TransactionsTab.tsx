import React, { useState, useMemo } from 'react';
import {
  Download, Search, Filter, ArrowUpRight, ArrowDownLeft,
  ExternalLink, ChevronLeft, ChevronRight, CheckCircle2, Clock, AlertCircle
} from 'lucide-react';
import { Transaction } from '../../../types/transaction';
import { formatCurrency, formatDate } from '../../../lib/utils';
import { useToast } from '../../../context/ToastContext';

interface TransactionsTabProps {
  transactions: Transaction[];
}

export const TransactionsTab: React.FC<TransactionsTabProps> = ({ transactions }) => {
  const toast = useToast();
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Filtered list
  const filtered = useMemo(() => {
    return transactions.filter((tx) => {
      if (filterType !== 'all') {
        if (filterType === 'investment' && tx.type !== 'investment') return false;
        if (filterType === 'payout' && tx.type !== 'distribution') return false;
        if (filterType === 'deposit' && tx.type !== 'deposit') return false;
        if (filterType === 'withdrawal' && tx.type !== 'withdrawal') return false;
      }

      if (filterStatus !== 'all') {
        if (tx.status !== filterStatus) return false;
      }

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

  // CSV Export handler
  const handleExportCsv = () => {
    try {
      const headers = ['Transaction ID', 'Date', 'Type', 'Amount', 'Currency', 'Status', 'Tx Hash', 'Description'];
      const rows = filtered.map((tx) => [
        `"${tx.id}"`,
        `"${tx.createdAt}"`,
        `"${tx.type}"`,
        tx.amount,
        `"${tx.currency || 'EUR'}"`,
        `"${tx.status}"`,
        `"${tx.txHash || ''}"`,
        `"${tx.description.replace(/"/g, '""')}"`,
      ]);

      const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `institutional_transactions_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('Downloaded official transactions CSV export');
    } catch {
      toast.error('Failed to export CSV');
    }
  };

  return (
    <div className="space-y-[16px] text-[#0F172A] dark:text-[#E2E8F0]">
      {/* Header & Filter Controls Bar */}
      <div className="p-[20px] rounded-[12px] bg-white dark:bg-[#111A2C] border border-[#E2E8F0] dark:border-[#1E293B] shadow-[0_1px_3px_rgba(0,0,0,0.06)] space-y-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-[20px] font-semibold">Ledger Settlement History</h2>
            <p className="text-[12px] text-[#64748B] dark:text-[#94A3B8]">
              Comprehensive record of on-chain security tokens, dividend cashflows, and bank wires
            </p>
          </div>
          <button
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-[8px] border border-[#E2E8F0] dark:border-[#1E293B] text-[12px] font-semibold hover:bg-[#F8FAFC] dark:hover:bg-[#0B1220] transition-colors cursor-pointer"
          >
            <Download className="w-[16px] h-[16px]" strokeWidth={1.5} /> Export CSV
          </button>
        </div>

        {/* Filter bar */}
        <div className="flex flex-wrap items-center gap-2 pt-1 text-[12px]">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#64748B] dark:text-[#94A3B8]" strokeWidth={1.5} />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search description, reference ID, or hash..."
              className="w-full pl-9 pr-3 py-1.5 rounded-[8px] border border-[#E2E8F0] dark:border-[#1E293B] bg-[#F8FAFC] dark:bg-[#0B1220] text-[13px] focus:outline-none focus:ring-2 focus:ring-[#0F4C81]"
            />
          </div>

          <select
            value={filterType}
            onChange={(e) => {
              setFilterType(e.target.value);
              setCurrentPage(1);
            }}
            className="px-3 py-1.5 rounded-[8px] border border-[#E2E8F0] dark:border-[#1E293B] bg-white dark:bg-[#111A2C] text-[#64748B] dark:text-[#94A3B8] focus:outline-none cursor-pointer"
          >
            <option value="all">Type: All Actions</option>
            <option value="investment">Property Investments</option>
            <option value="payout">Yield Payouts</option>
            <option value="deposit">Deposits</option>
            <option value="withdrawal">Withdrawals</option>
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
            <option value="pending">Pending</option>
            <option value="failed">Failed</option>
          </select>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="rounded-[12px] bg-white dark:bg-[#111A2C] border border-[#E2E8F0] dark:border-[#1E293B] shadow-[0_1px_3px_rgba(0,0,0,0.06)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[14px]">
            <thead className="bg-[#F8FAFC] dark:bg-[#0B1220] border-b border-[#E2E8F0] dark:border-[#1E293B] text-[12px] text-[#64748B] dark:text-[#94A3B8] uppercase tracking-wider font-semibold">
              <tr>
                <th className="py-3 px-4">Type & Details</th>
                <th className="py-3 px-4">Date & Time</th>
                <th className="py-3 px-4">Settlement Amount</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Transaction Hash</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0] dark:divide-[#1E293B]">
              {paginatedItems.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-[#64748B] dark:text-[#94A3B8]">
                    No transactions match the selected filters.
                  </td>
                </tr>
              ) : (
                paginatedItems.map((tx) => {
                  const isPositive = tx.type === 'deposit' || tx.type === 'distribution';
                  const txHashDisplay = tx.txHash
                    ? `${tx.txHash.slice(0, 6)}...${tx.txHash.slice(-4)}`
                    : '0x71a...9b4';

                  return (
                    <tr
                      key={tx.id}
                      className="hover:bg-[#F8FAFC] dark:hover:bg-[#1E293B]/40 transition-colors"
                    >
                      <td className="py-3.5 px-4 flex items-center gap-3">
                        <div
                          className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                            isPositive
                              ? 'bg-[#16A34A]/10 text-[#16A34A]'
                              : 'bg-[#0F4C81]/10 text-[#0F4C81] dark:text-[#14B8A6]'
                          }`}
                        >
                          {isPositive ? (
                            <ArrowDownLeft className="w-[18px] h-[18px]" strokeWidth={1.5} />
                          ) : (
                            <ArrowUpRight className="w-[18px] h-[18px]" strokeWidth={1.5} />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold text-[14px] truncate">{tx.description}</div>
                          <div className="text-[12px] text-[#64748B] dark:text-[#94A3B8] uppercase">
                            {tx.paymentMethod || tx.type.replace('_', ' ')}
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-[13px] text-[#64748B] dark:text-[#94A3B8] tabular-nums">
                        {formatDate(tx.createdAt)}
                      </td>

                      <td className="py-3.5 px-4 tabular-nums font-bold">
                        <span className={isPositive ? 'text-[#16A34A]' : 'text-[#0F172A] dark:text-[#E2E8F0]'}>
                          {isPositive ? '+' : '-'}{formatCurrency(tx.amount)}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold capitalize ${
                            tx.status === 'completed'
                              ? 'bg-[#16A34A]/10 text-[#16A34A]'
                              : tx.status === 'pending'
                              ? 'bg-[#F59E0B]/10 text-[#F59E0B]'
                              : 'bg-[#DC2626]/10 text-[#DC2626]'
                          }`}
                        >
                          {tx.status === 'completed' && <CheckCircle2 className="w-3 h-3" />}
                          {tx.status === 'pending' && <Clock className="w-3 h-3" />}
                          {tx.status}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <a
                          href={`https://etherscan.io/tx/${tx.txHash || '0x71C8135C0e41B3fA128912389128f9A19b28A0bf'}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 font-mono text-[12px] text-[#0F4C81] dark:text-[#14B8A6] hover:underline tabular-nums"
                        >
                          {txHashDisplay} <ExternalLink className="w-3 h-3" />
                        </a>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination (10 per page) */}
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
              className="p-1.5 rounded-[6px] border border-[#E2E8F0] dark:border-[#1E293B] hover:bg-white dark:hover:bg-[#111A2C] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 font-semibold text-[#0F172A] dark:text-[#E2E8F0]">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-[6px] border border-[#E2E8F0] dark:border-[#1E293B] hover:bg-white dark:hover:bg-[#111A2C] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
