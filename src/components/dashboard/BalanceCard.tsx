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
  const totalPortfolio = user.walletBalance + user.investedBalance;

  return (
    <div className="bg-[#142421] text-white p-3.5 sm:p-4 rounded-xl shadow-2xs relative overflow-hidden border border-[#24423C]/70">
      {/* Background motif */}
      <div className="absolute top-0 right-0 -mr-8 -mt-8 w-28 h-28 rounded-full bg-[#24423C]/20 pointer-events-none" />

      <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div>
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="text-[11px] sm:text-xs uppercase tracking-wider text-[#A0A8A5] font-semibold">
              Total Portfolio Valuation
            </span>
            {user.kycStatus === 'verified' && (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#B7E36A] bg-[#24423C] px-1.5 py-0.5 rounded">
                <ShieldCheck className="w-3 h-3" /> KYC Verified
              </span>
            )}
          </div>
          <div className="text-2xl sm:text-[28px] font-bold font-mono tabular-nums text-white tracking-tight leading-tight">
            {formatCurrency(totalPortfolio)}
          </div>
          <p className="text-xs text-[#A0A8A5] mt-0.5 leading-normal">
            Combined liquid cash reserve and notarized SPV property assets.
          </p>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex items-center gap-2 shrink-0 pt-0.5 sm:pt-0">
          <button
            onClick={onDeposit}
            className="bg-[#B7E36A] hover:bg-[#a6d557] text-[#182D2A] text-xs font-bold px-3 py-1.5 rounded-lg shadow-2xs inline-flex items-center gap-1.5 transition-colors cursor-pointer active:scale-[0.98]"
          >
            <ArrowDownLeft className="w-3.5 h-3.5 stroke-[2.5]" />
            Deposit
          </button>
          <button
            onClick={onWithdraw}
            className="bg-white hover:bg-slate-100 text-[#182D2A] text-xs font-bold px-3 py-1.5 rounded-lg shadow-2xs inline-flex items-center gap-1.5 transition-colors cursor-pointer active:scale-[0.98]"
          >
            <ArrowUpRight className="w-3.5 h-3.5" />
            Withdraw
          </button>
        </div>
      </div>

      {/* Sub-Metric Cards */}
      <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-[#24423C]/60">
        <div className="bg-[#0F1E1B]/80 px-2.5 py-2 rounded-lg border border-[#24423C]/50 flex items-center gap-2 min-w-0">
          <div className="w-6 h-6 rounded-md bg-[#24423C] text-[#B7E36A] flex items-center justify-center shrink-0">
            <Wallet className="w-3.5 h-3.5" />
          </div>
          <div className="min-w-0">
            <span className="text-[11px] text-[#A0A8A5] block truncate leading-tight">Available Cash</span>
            <span className="text-sm font-bold font-mono tabular-nums text-white truncate block leading-tight mt-0.5">{formatCurrency(user.walletBalance)}</span>
          </div>
        </div>

        <div className="bg-[#0F1E1B]/80 px-2.5 py-2 rounded-lg border border-[#24423C]/50 flex items-center gap-2 min-w-0">
          <div className="w-6 h-6 rounded-md bg-[#24423C] text-[#B7E36A] flex items-center justify-center shrink-0">
            <PiggyBank className="w-3.5 h-3.5" />
          </div>
          <div className="min-w-0">
            <span className="text-[11px] text-[#A0A8A5] block truncate leading-tight">Invested Capital</span>
            <span className="text-sm font-bold font-mono tabular-nums text-white truncate block leading-tight mt-0.5">{formatCurrency(user.investedBalance)}</span>
          </div>
        </div>

        <div className="bg-[#0F1E1B]/80 px-2.5 py-2 rounded-lg border border-[#24423C]/50 flex items-center gap-2 min-w-0">
          <div className="w-6 h-6 rounded-md bg-[#24423C] text-emerald-400 flex items-center justify-center shrink-0">
            <TrendingUp className="w-3.5 h-3.5" />
          </div>
          <div className="min-w-0">
            <span className="text-[11px] text-[#A0A8A5] block truncate leading-tight">Total Yields</span>
            <span className="text-sm font-bold font-mono tabular-nums text-[#B7E36A] truncate block leading-tight mt-0.5">+{formatCurrency(user.totalEarned)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
