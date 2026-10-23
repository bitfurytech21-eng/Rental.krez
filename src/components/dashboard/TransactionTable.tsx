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
          <span className="inline-flex items-center gap-1 text-[9.5px] font-semibold text-[#27845D] bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded">
            <ArrowDownLeft className="w-2.5 h-2.5" /> Deposit
          </span>
        );
      case 'withdrawal':
        return (
          <span className="inline-flex items-center gap-1 text-[9.5px] font-semibold text-[#C24141] bg-red-50 border border-red-200 px-1.5 py-0.2 rounded">
            <ArrowUpRight className="w-2.5 h-2.5" /> Withdrawal
          </span>
        );
      case 'investment':
        return (
          <span className="inline-flex items-center gap-1 text-[9.5px] font-semibold text-[#182D2A] bg-[#EEF1EC] border border-[#DCE4DA] px-1.5 py-0.2 rounded">
            <Coins className="w-2.5 h-2.5" /> Investment
          </span>
        );
      case 'distribution':
        return (
          <span className="inline-flex items-center gap-1 text-[9.5px] font-semibold text-[#27845D] bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded">
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
          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#27845D]">
            <CheckCircle2 className="w-2.5 h-2.5" /> Completed
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#B7791F]">
            <Clock className="w-2.5 h-2.5" /> Pending Review
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#C24141]">
            <AlertCircle className="w-2.5 h-2.5" /> Declined
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
                <div className={`font-black text-xs tabular-nums ${isNegative ? 'dash-text' : 'text-[#27845D]'}`}>
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
      <div className="hidden sm:block dashboard-table-wrapper border rounded-xl overflow-hidden">
        <table className="dashboard-table">
          <thead>
            <tr>
              <th className="py-2 px-2.5 text-[10px] sm:text-[10.5px]">Type</th>
              <th className="py-2 px-2.5 text-[10px] sm:text-[10.5px]">Description & Reference</th>
              <th className="py-2 px-2.5 text-[10px] sm:text-[10.5px]">Date</th>
              <th className="py-2 px-2.5 text-[10px] sm:text-[10.5px]">Method</th>
              <th className="py-2 px-2.5 text-[10px] sm:text-[10.5px]">Status</th>
              <th className="py-2 px-2.5 text-[10px] sm:text-[10.5px] text-right">Amount</th>
              <th className="py-2 px-2.5 text-[10px] sm:text-[10.5px] text-right">Balance After</th>
            </tr>
          </thead>
          <tbody className="divide-y border-inherit/30">
            {displayList.map((tx) => {
              const isNegative = tx.type === 'withdrawal' || tx.type === 'investment';
              return (
                <tr key={tx.id} className="hover:opacity-85 transition-opacity">
                  <td className="py-2 px-2.5">{getTypeBadge(tx.type)}</td>
                  <td className="py-2 px-2.5 max-w-xs">
                    <span className="font-semibold dash-text block text-xs truncate">
                      {tx.description}
                    </span>
                    <span className="font-mono text-[10px] dash-muted">
                      Ref: {tx.reference} {tx.txHash ? `· ${formatShortHash(tx.txHash)}` : ''}
                    </span>
                  </td>
                  <td className="py-2 px-2.5 text-xs dash-muted whitespace-nowrap font-mono">
                    {formatDate(tx.createdAt)}
                  </td>
                  <td className="py-2 px-2.5 text-xs dash-text font-medium whitespace-nowrap">
                    {tx.paymentMethod}
                  </td>
                  <td className="py-2 px-2.5">{getStatusBadge(tx.status)}</td>
                  <td className="py-2 px-2.5 text-right font-bold font-mono tabular-nums text-xs sm:text-[13px] whitespace-nowrap">
                    <span className={isNegative ? 'dash-text' : 'text-[#27845D]'}>
                      {isNegative ? '-' : '+'}
                      {formatCurrency(tx.amount, tx.currency)}
                    </span>
                  </td>
                  <td className="py-2 px-2.5 text-right font-medium font-mono tabular-nums text-xs dash-muted whitespace-nowrap">
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
