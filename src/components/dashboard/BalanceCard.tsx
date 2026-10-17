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
    <div className="bg-[#182D2A] text-white p-7 rounded-3xl shadow-xl relative overflow-hidden mb-8">
      {/* Background visual motif */}
      <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-[#24423C]/50 pointer-events-none" />

      <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs uppercase tracking-wider text-[#A0A8A5] font-semibold">
              Total Account Portfolio Value
            </span>
            {user.kycStatus === 'verified' && (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#B7E36A] bg-[#24423C] px-2 py-0.5 rounded-full">
                <ShieldCheck className="w-3 h-3" /> KYC Verified
              </span>
            )}
          </div>
          <div className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight mb-2">
            {formatCurrency(totalPortfolio)}
          </div>
          <p className="text-xs text-[#A0A8A5]">
            Includes liquid uninvested cash + market value of tokenized property assets.
          </p>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex items-center gap-3">
          <button
            onClick={onDeposit}
            className="btn btn-accent text-xs font-bold px-6 shadow-md"
          >
            <ArrowDownLeft className="w-4 h-4 mr-1" />
            Deposit Funds
          </button>
          <button
            onClick={onWithdraw}
            className="btn btn-secondary text-xs font-semibold px-5 bg-transparent border-white/20 text-white hover:bg-white/10"
          >
            <ArrowUpRight className="w-4 h-4 mr-1" />
            Withdraw
          </button>
        </div>
      </div>

      {/* Sub-Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8 pt-6 border-t border-[#24423C]">
        <div className="bg-[#142421] p-4 rounded-2xl border border-[#24423C]/60 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#24423C] text-[#B7E36A] flex items-center justify-center shrink-0">
            <Wallet className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] text-[#A0A8A5] block">Available Cash</span>
            <span className="text-lg font-bold text-white">{formatCurrency(user.walletBalance)}</span>
          </div>
        </div>

        <div className="bg-[#142421] p-4 rounded-2xl border border-[#24423C]/60 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#24423C] text-[#B7E36A] flex items-center justify-center shrink-0">
            <PiggyBank className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] text-[#A0A8A5] block">Active Invested Capital</span>
            <span className="text-lg font-bold text-white">{formatCurrency(user.investedBalance)}</span>
          </div>
        </div>

        <div className="bg-[#142421] p-4 rounded-2xl border border-[#24423C]/60 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#24423C] text-[#27845D] flex items-center justify-center shrink-0">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] text-[#A0A8A5] block">Realized Dividends</span>
            <span className="text-lg font-bold text-[#B7E36A]">+{formatCurrency(user.totalEarned)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
