import React from 'react';
import { Transaction } from '../../types/transaction';
import { formatCurrency, formatDate, formatShortHash } from '../../lib/utils';
import { ArrowDownLeft, ArrowUpRight, Coins, RefreshCw, CheckCircle2, Clock, AlertCircle } from 'lucide-react';

interface TransactionTableProps {
  transactions: Transaction[];
  maxRows?: number;
}

export const TransactionTable: React.FC<TransactionTableProps> = ({ transactions, maxRows }) => {
  const displayList = maxRows ? transactions.slice(0, maxRows) : transactions;

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

  if (transactions.length === 0) {
    return (
      <div className="dash-card p-4 rounded-xl border text-center text-xs dash-muted">
        No ledger transactions found.
      </div>
    );
  }

  return (
    <div>
      {/* Mobile-First Compact Transaction Feed (< 640px) */}
      <div className="sm:hidden divide-y border border-inherit/40 rounded-xl overflow-hidden dash-card">
        {displayList.map((tx) => {
          const isNegative = tx.type === 'withdrawal' || tx.type === 'investment';
          return (
            <div key={tx.id} className="p-2.5 flex items-center justify-between gap-2.5 hover:opacity-90 transition-opacity">
              <div className="flex items-center gap-2 min-w-0">
                <div className="shrink-0">{getTypeBadge(tx.type)}</div>
                <div className="min-w-0">
                  <span className="font-semibold dash-text block text-xs truncate leading-tight">
                    {tx.description}
                  </span>
                  <div className="flex items-center gap-1.5 text-[9.5px] dash-muted leading-tight mt-0.5">
                    <span>{formatDate(tx.createdAt)}</span>
                    <span>·</span>
                    <span className="font-mono">{tx.paymentMethod}</span>
                  </div>
                </div>
              </div>

              <div className="text-right shrink-0">
                <div className={`font-black text-xs tabular-nums ${isNegative ? 'dash-text' : 'text-[#087F5B]'}`}>
                  {isNegative ? '-' : '+'}
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
              <th className="py-2.5 px-3 text-[10px] sm:text-[10.5px] text-[#71817D]">Description & Reference</th>
              <th className="py-2.5 px-3 text-[10px] sm:text-[10.5px] text-[#71817D]">Date</th>
              <th className="py-2.5 px-3 text-[10px] sm:text-[10.5px] text-[#71817D]">Method</th>
              <th className="py-2.5 px-3 text-[10px] sm:text-[10.5px] text-[#71817D]">Status</th>
              <th className="py-2.5 px-3 text-[10px] sm:text-[10.5px] text-right text-[#71817D]">Amount</th>
              <th className="py-2.5 px-3 text-[10px] sm:text-[10.5px] text-right text-[#71817D]">Balance After</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E4EEEA]">
            {displayList.map((tx) => {
              const isNegative = tx.type === 'withdrawal' || tx.type === 'investment';
              return (
                <tr key={tx.id} className="hover:bg-[#F6FAF8]/70 transition-colors">
                  <td className="py-2.5 px-3">{getTypeBadge(tx.type)}</td>
                  <td className="py-2.5 px-3 max-w-xs">
                    <span className="font-semibold text-[#172B2A] block text-xs truncate">
                      {tx.description}
                    </span>
                    <span className="font-mono text-[10px] text-[#71817D]">
                      Ref: {tx.reference} {tx.txHash ? `· ${formatShortHash(tx.txHash)}` : ''}
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
                    <span className={isNegative ? 'text-[#172B2A]' : 'text-[#087F5B]'}>
                      {isNegative ? '-' : '+'}
                      {formatCurrency(tx.amount, tx.currency)}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-right font-medium font-mono tabular-nums text-xs text-[#71817D] whitespace-nowrap">
                    {formatCurrency(tx.balanceAfter)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
