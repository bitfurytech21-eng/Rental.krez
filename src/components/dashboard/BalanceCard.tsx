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
    <div className="bg-gradient-to-br from-[#075B46] via-[#087F5B] to-[#0A8F67] text-white p-4 sm:p-5 rounded-2xl sm:rounded-3xl shadow-[0_8px_30px_rgba(8,127,91,0.18)] relative overflow-hidden border border-[#087F5B]/30">
      {/* Background architectural aura motif */}
      <div className="absolute top-0 right-0 -mr-10 -mt-10 w-44 h-44 rounded-full bg-white/10 blur-2xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/3 -mb-12 w-36 h-36 rounded-full bg-emerald-300/10 blur-xl pointer-events-none" />

      <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] sm:text-xs uppercase tracking-wider text-[#DDF5EC] font-semibold">
              Total Portfolio Valuation
            </span>
            {user.kycStatus === 'verified' && (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#075B46] bg-[#DDF5EC] px-2 py-0.5 rounded-full shadow-2xs">
                <ShieldCheck className="w-3 h-3 text-[#075B46]" /> KYC Verified
              </span>
            )}
          </div>
          <div className="text-2xl sm:text-3xl lg:text-[32px] font-bold font-mono tabular-nums text-white tracking-tight leading-tight">
            {formatCurrency(totalPortfolio)}
          </div>
          <p className="text-xs text-[#DDF5EC]/85 mt-1 leading-normal font-medium">
            Combined liquid cash reserves and notarized SPV fractional property holdings.
          </p>
        </div>

        {/* Quick Action Buttons (Finora-style action pills) */}
        <div className="flex items-center gap-2.5 shrink-0 pt-1 sm:pt-0">
          <button
            onClick={onDeposit}
            className="bg-white hover:bg-[#F6FAF8] text-[#075B46] text-xs font-bold px-4 py-2 rounded-xl sm:rounded-2xl shadow-sm inline-flex items-center gap-2 transition-all cursor-pointer active:scale-[0.98]"
          >
            <ArrowDownLeft className="w-3.5 h-3.5 stroke-[2.5] text-[#087F5B]" />
            Deposit
          </button>
          <button
            onClick={onWithdraw}
            className="bg-white/15 hover:bg-white/25 text-white border border-white/25 text-xs font-bold px-4 py-2 rounded-xl sm:rounded-2xl shadow-sm inline-flex items-center gap-2 transition-all cursor-pointer active:scale-[0.98] backdrop-blur-xs"
          >
            <ArrowUpRight className="w-3.5 h-3.5" />
            Withdraw
          </button>
        </div>
      </div>

      {/* Sub-Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mt-4 pt-4 border-t border-white/15">
        <div className="bg-black/15 backdrop-blur-xs px-3 py-2.5 rounded-xl sm:rounded-2xl border border-white/10 flex items-center gap-2.5 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-white/20 text-[#DDF5EC] flex items-center justify-center shrink-0">
            <Wallet className="w-3.5 h-3.5" />
          </div>
          <div className="min-w-0">
            <span className="text-[11px] text-[#DDF5EC]/80 block truncate leading-tight">Available Cash</span>
            <span className="text-sm sm:text-base font-bold font-mono tabular-nums text-white truncate block leading-tight mt-0.5">{formatCurrency(user.walletBalance)}</span>
          </div>
        </div>

        <div className="bg-black/15 backdrop-blur-xs px-3 py-2.5 rounded-xl sm:rounded-2xl border border-white/10 flex items-center gap-2.5 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-white/20 text-[#DDF5EC] flex items-center justify-center shrink-0">
            <PiggyBank className="w-3.5 h-3.5" />
          </div>
          <div className="min-w-0">
            <span className="text-[11px] text-[#DDF5EC]/80 block truncate leading-tight">Invested Capital</span>
            <span className="text-sm sm:text-base font-bold font-mono tabular-nums text-white truncate block leading-tight mt-0.5">{formatCurrency(user.investedBalance)}</span>
          </div>
        </div>

        <div className="bg-black/15 backdrop-blur-xs px-3 py-2.5 rounded-xl sm:rounded-2xl border border-white/10 flex items-center gap-2.5 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-white/20 text-[#DDF5EC] flex items-center justify-center shrink-0">
            <ShieldCheck className="w-3.5 h-3.5" />
          </div>
          <div className="min-w-0">
            <span className="text-[11px] text-[#DDF5EC]/90 block truncate leading-tight font-medium">Realized Performance</span>
            <span className="text-sm sm:text-base font-bold font-mono tabular-nums text-[#DDF5EC] truncate block leading-tight mt-0.5">+{formatCurrency(user.totalEarned)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
