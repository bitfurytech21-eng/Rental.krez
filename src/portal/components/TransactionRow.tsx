import React from 'react';
import { PortalTransaction } from '../types';
import { formatEuro, formatShortDate } from '../utils/format';
import { StatusBadge } from './StatusBadge';

interface TransactionRowProps {
  transaction: PortalTransaction;
}

const TYPE_LABELS: Record<string, string> = {
  deposit: 'Wallet Deposit',
  withdrawal: 'Withdrawal',
  investment: 'Property Subscription',
  purchase: 'Property Subscription',
  dividend: 'Rent Distribution',
  distribution: 'Rent Distribution',
  payout: 'Rent Distribution',
  conversion: 'Treasury FX Conversion',
};

export const TransactionRow: React.FC<TransactionRowProps> = ({ transaction }) => {
  const typeKey = transaction.type.toLowerCase();
  const isOutflow =
    typeKey === 'withdrawal' || typeKey === 'investment' || typeKey === 'purchase';
  const signedAmount = isOutflow ? -Math.abs(transaction.amount) : Math.abs(transaction.amount);

  const title =
    transaction.propertyTitle ||
    TYPE_LABELS[typeKey] ||
    transaction.description ||
    transaction.type;

  return (
    <div className="p-4 flex items-center justify-between gap-4 hover:bg-[#172228]/70 transition-colors">
      <div className="min-w-0">
        <div className="text-sm font-medium text-[#F2F5F4] truncate">{title}</div>
        <div className="mt-1 text-xs text-[#8FA1A8] flex items-center gap-1.5 flex-wrap">
          <span className="font-mono">{transaction.reference}</span>
          <span aria-hidden="true">·</span>
          <span>{formatShortDate(transaction.createdAt)}</span>
          {transaction.paymentMethod && (
            <>
              <span aria-hidden="true">·</span>
              <span>{transaction.paymentMethod}</span>
            </>
          )}
        </div>
      </div>

      <div className="flex flex-col items-end gap-1.5 shrink-0">
        <div
          className={`text-sm font-bold portal-tabular ${
            isOutflow ? 'text-[#F2F5F4]' : 'text-[#6FD8B0]'
          }`}
        >
          {formatEuro(signedAmount, true)}
        </div>
        <StatusBadge status={transaction.status} />
      </div>
    </div>
  );
};
