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
    <div className="bg-[#142421] text-white p-3.5 sm:p-4 rounded-xl shadow-sm relative overflow-hidden border border-[#24423C]/60">
      {/* Background visual motif */}
      <div className="absolute top-0 right-0 -mr-12 -mt-12 w-48 h-48 rounded-full bg-[#24423C]/30 pointer-events-none" />

      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-[10px] uppercase tracking-wider text-[#A0A8A5] font-semibold">
              Total Account Portfolio Value
            </span>
            {user.kycStatus === 'verified' && (
              <span className="inline-flex items-center gap-1 text-[9.5px] font-bold text-[#B7E36A] bg-[#24423C] px-2 py-0.2 rounded-full">
                <ShieldCheck className="w-2.5 h-2.5" /> KYC Verified
              </span>
            )}
          </div>
          <div className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-white tracking-tight">
            {formatCurrency(totalPortfolio)}
          </div>
          <p className="text-[10px] sm:text-[11px] text-[#A0A8A5] mt-0.5">
            Includes liquid uninvested cash + market value of tokenized property assets.
          </p>
        </div>

        {/* Quick Action Buttons with Circular Loading Animation */}
        <div className="flex items-center gap-2 shrink-0 pt-0.5 sm:pt-0">
          <button
            onClick={handleDepositClick}
            disabled={loadingAction !== null}
            className="bg-[#B7E36A] hover:bg-[#a6d557] text-[#182D2A] text-xs font-bold px-3.5 py-1.5 rounded-full shadow-xs inline-flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-80"
          >
            {loadingAction === 'deposit' ? (
              <ButtonLoader text="Processing..." size="sm" />
            ) : (
              <>
                <ArrowDownLeft className="w-3.5 h-3.5" />
                Deposit Funds
              </>
            )}
          </button>
          <button
            onClick={handleWithdrawClick}
            disabled={loadingAction !== null}
            className="bg-white hover:bg-slate-100 text-[#182D2A] text-xs font-bold px-3.5 py-1.5 rounded-full shadow-xs inline-flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-80"
          >
            {loadingAction === 'withdraw' ? (
              <ButtonLoader text="Proceeding..." size="sm" />
            ) : (
              <>
                <ArrowUpRight className="w-3.5 h-3.5" />
                Withdraw
              </>
            )}
          </button>
        </div>
      </div>

      {/* Sub-Metric Cards - 3 columns aligned horizontally */}
      <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-[#24423C]/60">
        <div className="bg-[#0F1E1B]/70 p-2 rounded-lg border border-[#24423C]/40 flex items-center gap-2 min-w-0">
          <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-[#24423C] text-[#B7E36A] flex items-center justify-center shrink-0">
            <Wallet className="w-3.5 h-3.5" />
          </div>
          <div className="min-w-0">
            <span className="text-[9px] text-[#A0A8A5] block truncate leading-tight">Available Cash</span>
            <span className="text-xs sm:text-sm font-bold text-white truncate block leading-tight">{formatCurrency(user.walletBalance)}</span>
          </div>
        </div>

        <div className="bg-[#0F1E1B]/70 p-2 rounded-lg border border-[#24423C]/40 flex items-center gap-2 min-w-0">
          <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-[#24423C] text-[#B7E36A] flex items-center justify-center shrink-0">
            <PiggyBank className="w-3.5 h-3.5" />
          </div>
          <div className="min-w-0">
            <span className="text-[9px] text-[#A0A8A5] block truncate leading-tight">Active Capital</span>
            <span className="text-xs sm:text-sm font-bold text-white truncate block leading-tight">{formatCurrency(user.investedBalance)}</span>
          </div>
        </div>

        <div className="bg-[#0F1E1B]/70 p-2 rounded-lg border border-[#24423C]/40 flex items-center gap-2 min-w-0">
          <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-[#24423C] text-emerald-400 flex items-center justify-center shrink-0">
            <TrendingUp className="w-3.5 h-3.5" />
          </div>
          <div className="min-w-0">
            <span className="text-[9px] text-[#A0A8A5] block truncate leading-tight">Realized Dividends</span>
            <span className="text-xs sm:text-sm font-bold text-[#B7E36A] truncate block leading-tight">+{formatCurrency(user.totalEarned)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
