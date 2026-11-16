import React from 'react';
import { PortalTransaction } from '../types';
import { formatEuro, formatShortDate } from '../utils/format';

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

  const statusKey = transaction.status.toLowerCase();
  const statusColor =
    statusKey === 'completed' || statusKey === 'approved' || statusKey === 'verified'
      ? 'text-[#34D399]'
      : statusKey === 'rejected' || statusKey === 'failed' || statusKey === 'cancelled'
      ? 'text-[#FB7185]'
      : 'text-[#FBBF24]';

  const statusText = statusKey.charAt(0).toUpperCase() + statusKey.slice(1);
  const title =
    transaction.propertyTitle ||
    TYPE_LABELS[typeKey] ||
    transaction.description ||
    transaction.type;

  return (
    <div className="py-3.5 px-4 flex items-center justify-between gap-4 hover:bg-[#152E54]/45 transition-colors">
      <div className="min-w-0">
        <div className="text-sm font-semibold text-white truncate">{title}</div>
        <div className="mt-0.5 text-xs text-[#8EA7C7] flex items-center gap-1.5 flex-wrap">
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

      <div className="text-right shrink-0">
        <div
          className={`text-sm font-bold portal-tabular ${
            isOutflow ? 'text-white' : 'text-[#34D399]'
          }`}
        >
          {formatEuro(signedAmount, true)}
        </div>
        <div className={`mt-0.5 text-xs font-medium ${statusColor}`}>{statusText}</div>
      </div>
    </div>
  );
};
