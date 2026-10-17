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
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#27845D] bg-[#E8F5E9] px-2.5 py-0.5 rounded-full">
            <ArrowDownLeft className="w-3 h-3" /> Deposit
          </span>
        );
      case 'withdrawal':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#C24141] bg-red-50 px-2.5 py-0.5 rounded-full">
            <ArrowUpRight className="w-3 h-3" /> Withdrawal
          </span>
        );
      case 'investment':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#182D2A] bg-[#EEF1EC] px-2.5 py-0.5 rounded-full">
            <Coins className="w-3 h-3" /> Investment
          </span>
        );
      case 'distribution':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#27845D] bg-[#E8F5E9] px-2.5 py-0.5 rounded-full">
            <RefreshCw className="w-3 h-3" /> Dividend
          </span>
        );
      default:
        return <span className="text-xs uppercase">{type}</span>;
    }
  };

  const getStatusBadge = (status: Transaction['status']) => {
    switch (status) {
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#27845D]">
            <CheckCircle2 className="w-3 h-3" /> Completed
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#B7791F]">
            <Clock className="w-3 h-3" /> Pending Review
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#C24141]">
            <AlertCircle className="w-3 h-3" /> Declined
          </span>
        );
      default:
        return <span>{status}</span>;
    }
  };

  if (transactions.length === 0) {
    return (
      <div className="dash-card p-6 rounded-2xl border text-center text-xs dash-muted">
        No ledger transactions found.
      </div>
    );
  }

  return (
    <div className="dashboard-table-wrapper border">
      <table className="dashboard-table">
        <thead>
          <tr>
            <th>Type</th>
            <th>Description & Reference</th>
            <th>Date</th>
            <th>Payment Method</th>
            <th>Status</th>
            <th className="text-right">Amount</th>
            <th className="text-right">Balance After</th>
          </tr>
        </thead>
        <tbody className="divide-y border-inherit/30">
          {displayList.map((tx) => {
            const isNegative = tx.type === 'withdrawal' || tx.type === 'investment';
            return (
              <tr key={tx.id} className="hover:opacity-85 transition-opacity">
                <td>{getTypeBadge(tx.type)}</td>
                <td className="max-w-xs">
                  <span className="font-semibold dash-text block text-xs truncate">
                    {tx.description}
                  </span>
                  <span className="font-mono text-[10px] dash-muted">
                    Ref: {tx.reference} {tx.txHash ? `· Hash: ${formatShortHash(tx.txHash)}` : ''}
                  </span>
                </td>
                <td className="text-xs dash-muted whitespace-nowrap">
                  {formatDate(tx.createdAt)}
                </td>
                <td className="text-xs dash-text font-medium whitespace-nowrap">
                  {tx.paymentMethod}
                </td>
                <td>{getStatusBadge(tx.status)}</td>
                <td className="text-right font-bold text-xs whitespace-nowrap">
                  <span className={isNegative ? 'dash-text' : 'text-emerald-400'}>
                    {isNegative ? '-' : '+'}
                    {formatCurrency(tx.amount, tx.currency)}
                  </span>
                </td>
                <td className="text-right font-medium text-xs dash-muted whitespace-nowrap">
                  {formatCurrency(tx.balanceAfter)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
