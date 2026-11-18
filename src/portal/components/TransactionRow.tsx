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
  const methodValue = String(transaction.paymentMethod || '').toLowerCase();
  const isUsdtDeposit = typeKey === 'deposit' && methodValue.includes('usdt');
  const methodLabel = isUsdtDeposit ? 'USDT' : methodValue.includes('bank') || methodValue.includes('sepa')
    ? 'Bank'
    : transaction.paymentMethod;
  const metadata = transaction.metadata || {};
  const rawUsdtAmount = metadata.usdt_amount ?? metadata.amount_usdt ?? metadata.original_usdt_amount;
  const usdtAmount = rawUsdtAmount == null || rawUsdtAmount === '' ? null : Number(rawUsdtAmount);
  const isCompletedUsdtDeposit = isUsdtDeposit && transaction.status.toLowerCase() === 'completed';
  const amountDisplay = isCompletedUsdtDeposit && usdtAmount !== null && Number.isFinite(usdtAmount) && usdtAmount > 0
    ? `${new Intl.NumberFormat('en-US', { maximumFractionDigits: 6 }).format(usdtAmount)} USDT credited as ${formatEuro(Math.abs(transaction.amount), true)}`
    : formatEuro(signedAmount, true);

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
              <span>{methodLabel}</span>
            </>
          )}
        </div>
      </div>

      <div className="flex flex-col items-end gap-1.5 shrink-0">
        <div
          className={`max-w-[58%] whitespace-normal break-words text-right text-sm font-bold portal-tabular ${
            isOutflow ? 'text-[#F2F5F4]' : 'text-[#6FD8B0]'
          }`}
        >
          {amountDisplay}
        </div>
        <StatusBadge status={transaction.status} />
      </div>
    </div>
  );
};
