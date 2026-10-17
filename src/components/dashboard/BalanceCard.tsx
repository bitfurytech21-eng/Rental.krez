import React from 'react';
import { User } from '../../types/user';
import { formatCurrency } from '../../lib/utils';
import { Wallet, TrendingUp, PiggyBank, ArrowDownLeft, ArrowUpRight, ShieldCheck } from 'lucide-react';

interface BalanceCardProps {
  user: User;
  onDeposit: () => void;
  onWithdraw: () => void;
}

export const BalanceCard: React.FC<BalanceCardProps> = ({ user, onDeposit, onWithdraw }) => {
  const totalPortfolio = user.walletBalance + user.investedBalance;

  return (
    <div className="bg-[#142421] text-white p-4 sm:p-5 rounded-2xl shadow-md relative overflow-hidden border border-[#24423C]/60">
      {/* Background visual motif */}
      <div className="absolute top-0 right-0 -mr-12 -mt-12 w-56 h-56 rounded-full bg-[#24423C]/40 pointer-events-none" />

      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] sm:text-[11px] uppercase tracking-wider text-[#A0A8A5] font-semibold">
              Total Account Portfolio Value
            </span>
            {user.kycStatus === 'verified' && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#B7E36A] bg-[#24423C] px-2 py-0.5 rounded-full">
                <ShieldCheck className="w-2.5 h-2.5" /> KYC Verified
              </span>
            )}
          </div>
          <div className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white tracking-tight">
            {formatCurrency(totalPortfolio)}
          </div>
          <p className="text-[10.5px] sm:text-xs text-[#A0A8A5] mt-0.5">
            Includes liquid uninvested cash + market value of tokenized property assets.
          </p>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex items-center gap-2.5 shrink-0 pt-1 sm:pt-0">
          <button
            onClick={onDeposit}
            className="bg-[#B7E36A] hover:bg-[#a6d557] text-[#182D2A] text-xs font-bold px-4 py-2 rounded-full shadow-xs inline-flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <ArrowDownLeft className="w-3.5 h-3.5" />
            Deposit Funds
          </button>
          <button
            onClick={onWithdraw}
            className="bg-white hover:bg-slate-100 text-[#182D2A] text-xs font-bold px-4 py-2 rounded-full shadow-xs inline-flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <ArrowUpRight className="w-3.5 h-3.5" />
            Withdraw
          </button>
        </div>
      </div>

      {/* Sub-Metric Cards - 3 columns aligned horizontally */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3 mt-4 pt-3.5 border-t border-[#24423C]/60">
        <div className="bg-[#0F1E1B]/70 p-2 sm:p-2.5 rounded-xl border border-[#24423C]/40 flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-[#24423C] text-[#B7E36A] flex items-center justify-center shrink-0">
            <Wallet className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </div>
          <div className="min-w-0">
            <span className="text-[9px] sm:text-[10px] text-[#A0A8A5] block truncate leading-tight">Available Cash</span>
            <span className="text-xs sm:text-sm lg:text-base font-bold text-white truncate block leading-tight">{formatCurrency(user.walletBalance)}</span>
          </div>
        </div>

        <div className="bg-[#0F1E1B]/70 p-2 sm:p-2.5 rounded-xl border border-[#24423C]/40 flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-[#24423C] text-[#B7E36A] flex items-center justify-center shrink-0">
            <PiggyBank className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </div>
          <div className="min-w-0">
            <span className="text-[9px] sm:text-[10px] text-[#A0A8A5] block truncate leading-tight">Active Invested Capital</span>
            <span className="text-xs sm:text-sm lg:text-base font-bold text-white truncate block leading-tight">{formatCurrency(user.investedBalance)}</span>
          </div>
        </div>

        <div className="bg-[#0F1E1B]/70 p-2 sm:p-2.5 rounded-xl border border-[#24423C]/40 flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-[#24423C] text-emerald-400 flex items-center justify-center shrink-0">
            <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </div>
          <div className="min-w-0">
            <span className="text-[9px] sm:text-[10px] text-[#A0A8A5] block truncate leading-tight">Realized Dividends</span>
            <span className="text-xs sm:text-sm lg:text-base font-bold text-[#B7E36A] truncate block leading-tight">+{formatCurrency(user.totalEarned)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
