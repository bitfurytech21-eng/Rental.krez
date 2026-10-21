import React, { useState } from 'react';
import { User } from '../../types/user';
import { formatCurrency } from '../../lib/utils';
import { Wallet, TrendingUp, PiggyBank, ArrowDownLeft, ArrowUpRight, ShieldCheck } from 'lucide-react';
import { ButtonLoader } from '../common/ButtonLoader';

interface BalanceCardProps {
  user: User;
  onDeposit: () => void;
  onWithdraw: () => void;
}

export const BalanceCard: React.FC<BalanceCardProps> = ({ user, onDeposit, onWithdraw }) => {
  const [loadingAction, setLoadingAction] = useState<'deposit' | 'withdraw' | null>(null);
  const totalPortfolio = user.walletBalance + user.investedBalance;

  const handleDepositClick = () => {
    setLoadingAction('deposit');
    setTimeout(() => {
      setLoadingAction(null);
      onDeposit();
    }, 1200);
  };

  const handleWithdrawClick = () => {
    setLoadingAction('withdraw');
    setTimeout(() => {
      setLoadingAction(null);
      onWithdraw();
    }, 1200);
  };

  return (
    <div className="bg-[#142421] text-white p-3 sm:p-3.5 rounded-xl shadow-xs relative overflow-hidden border border-[#24423C]/60">
      {/* Background visual motif */}
      <div className="absolute top-0 right-0 -mr-10 -mt-10 w-36 h-36 rounded-full bg-[#24423C]/25 pointer-events-none" />

      <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div>
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="text-[9px] uppercase tracking-wider text-[#A0A8A5] font-semibold">
              Total Account Portfolio Value
            </span>
            {user.kycStatus === 'verified' && (
              <span className="inline-flex items-center gap-0.5 text-[8.5px] font-bold text-[#B7E36A] bg-[#24423C] px-1.5 py-0.2 rounded-full">
                <ShieldCheck className="w-2.5 h-2.5" /> KYC Verified
              </span>
            )}
          </div>
          <div className="text-xl sm:text-2xl font-black text-white tracking-tight leading-tight">
            {formatCurrency(totalPortfolio)}
          </div>
          <p className="text-[9.5px] sm:text-[10px] text-[#A0A8A5] mt-0.5 leading-tight">
            Includes liquid uninvested cash + market value of tokenized property assets.
          </p>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex items-center gap-2 shrink-0 pt-0.5 sm:pt-0">
          <button
            onClick={handleDepositClick}
            disabled={loadingAction !== null}
            className="bg-[#B7E36A] hover:bg-[#a6d557] text-[#182D2A] text-[11px] font-bold px-3 py-1.5 rounded-lg shadow-xs inline-flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-80"
          >
            {loadingAction === 'deposit' ? (
              <ButtonLoader text="Processing..." size="sm" />
            ) : (
              <>
                <ArrowDownLeft className="w-3 h-3 stroke-[2.5]" />
                Deposit Funds
              </>
            )}
          </button>
          <button
            onClick={handleWithdrawClick}
            disabled={loadingAction !== null}
            className="bg-white hover:bg-slate-100 text-[#182D2A] text-[11px] font-bold px-3 py-1.5 rounded-lg shadow-xs inline-flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-80"
          >
            {loadingAction === 'withdraw' ? (
              <ButtonLoader text="Proceeding..." size="sm" />
            ) : (
              <>
                <ArrowUpRight className="w-3 h-3" />
                Withdraw
              </>
            )}
          </button>
        </div>
      </div>

      {/* Sub-Metric Cards - Compact 3-column aligned row */}
      <div className="grid grid-cols-3 gap-1.5 sm:gap-2 mt-2.5 pt-2 border-t border-[#24423C]/50">
        <div className="bg-[#0F1E1B]/70 p-1.5 sm:p-2 rounded-lg border border-[#24423C]/40 flex items-center gap-1.5 min-w-0">
          <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-md bg-[#24423C] text-[#B7E36A] flex items-center justify-center shrink-0">
            <Wallet className="w-3 h-3" />
          </div>
          <div className="min-w-0">
            <span className="text-[8px] sm:text-[8.5px] text-[#A0A8A5] block truncate leading-tight">Available Cash</span>
            <span className="text-[11px] sm:text-xs font-bold text-white truncate block leading-tight">{formatCurrency(user.walletBalance)}</span>
          </div>
        </div>

        <div className="bg-[#0F1E1B]/70 p-1.5 sm:p-2 rounded-lg border border-[#24423C]/40 flex items-center gap-1.5 min-w-0">
          <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-md bg-[#24423C] text-[#B7E36A] flex items-center justify-center shrink-0">
            <PiggyBank className="w-3 h-3" />
          </div>
          <div className="min-w-0">
            <span className="text-[8px] sm:text-[8.5px] text-[#A0A8A5] block truncate leading-tight">Active Capital</span>
            <span className="text-[11px] sm:text-xs font-bold text-white truncate block leading-tight">{formatCurrency(user.investedBalance)}</span>
          </div>
        </div>

        <div className="bg-[#0F1E1B]/70 p-1.5 sm:p-2 rounded-lg border border-[#24423C]/40 flex items-center gap-1.5 min-w-0">
          <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-md bg-[#24423C] text-emerald-400 flex items-center justify-center shrink-0">
            <TrendingUp className="w-3 h-3" />
          </div>
          <div className="min-w-0">
            <span className="text-[8px] sm:text-[8.5px] text-[#A0A8A5] block truncate leading-tight">Dividends</span>
            <span className="text-[11px] sm:text-xs font-bold text-[#B7E36A] truncate block leading-tight">+{formatCurrency(user.totalEarned)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
