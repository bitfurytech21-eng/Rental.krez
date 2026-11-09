import React from 'react';
import { User } from '../../types/user';
import { Transaction } from '../../types/transaction';
import { Wallet, Building2, ArrowDownLeft, ArrowUpRight, Clock, TrendingUp } from 'lucide-react';
import { AnimatedNumericValue } from './AnimatedNumericValue';

interface BalanceCardProps {
  user: User;
  transactions?: Transaction[];
  onDeposit: () => void;
  onWithdraw: () => void;
}

export const BalanceCard: React.FC<BalanceCardProps> = ({ user, transactions = [], onDeposit, onWithdraw }) => {
  const totalPortfolio = user.walletBalance + user.investedBalance;

  // Real pending transactions from verified ledger records
  const pendingTxs = transactions.filter(
    (tx) => tx.status === 'pending' || tx.status === 'processing'
  );
  const pendingAmount = pendingTxs.reduce((sum, tx) => sum + (tx.amount || 0), 0);

  return (
    <div className="cinematic-card text-[#F5F5F2] p-[20px] sm:p-[30px] rounded-[22px] sm:rounded-[26px] relative overflow-hidden space-y-6">
      {/* Subtle atmospheric ambient aura (inspired by IMG_7727) */}
      <div 
        className="absolute -top-16 -left-16 w-96 h-64 pointer-events-none opacity-40 blur-3xl"
        style={{
          background: 'radial-gradient(circle, rgba(85, 189, 232, 0.12) 0%, rgba(67, 201, 139, 0.08) 45%, transparent 70%)',
        }}
      />
      <div 
        className="absolute -bottom-16 -right-16 w-80 h-64 pointer-events-none opacity-30 blur-3xl"
        style={{
          background: 'radial-gradient(circle, rgba(67, 201, 139, 0.14) 0%, transparent 65%)',
        }}
      />

      {/* Main Portfolio Header & Primary Actions */}
      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div>
          <div className="flex items-center gap-2.5 mb-2">
            <span className="text-[12px] uppercase tracking-wider text-[#A5A6A5] font-bold">
              Total Portfolio Valuation
            </span>
            <span className="inline-flex items-center gap-1.5 text-[11px] font-mono text-[#55BDE8] bg-[#55BDE8]/10 border border-[#55BDE8]/25 px-2.5 py-0.5 rounded-full shadow-2xs">
              <span className="cinematic-halo">
                <span className="w-1.5 h-1.5 rounded-full bg-[#55BDE8]" />
              </span>
              <span>Live Sync</span>
            </span>
          </div>

          <div className="financial-val-hero text-[#F5F5F2] tracking-tight leading-none mt-1">
            <AnimatedNumericValue value={totalPortfolio} variant="primary" />
          </div>

          <p className="text-[13.5px] sm:text-[14px] financial-label-secondary mt-2.5 leading-relaxed max-w-xl">
            Liquid cash balances and SPV real estate holdings.
          </p>
        </div>

        {/* Action Buttons (inspired by IMG_7728) */}
        <div className="flex items-center gap-3 shrink-0 pt-1 md:pt-0">
          <button
            onClick={onDeposit}
            className="cinematic-btn cinematic-btn-primary h-[48px] sm:h-[50px] px-6 text-[14px] font-bold shadow-md active:scale-[0.98] whitespace-nowrap cursor-pointer"
          >
            <ArrowDownLeft className="w-4 h-4 stroke-[2.5] text-[#070A09]" />
            <span>Deposit</span>
          </button>
          <button
            onClick={onWithdraw}
            className="cinematic-btn h-[48px] sm:h-[50px] px-6 text-[14px] font-bold shadow-md active:scale-[0.98] whitespace-nowrap cursor-pointer"
          >
            <ArrowUpRight className="w-4 h-4 text-[#A5A6A5]" />
            <span>Withdraw</span>
          </button>
        </div>
      </div>

      {/* Elegant Hairline Gradient Divider */}
      <div className="cinematic-divider" />

      {/* 4 Interactive Frosted Financial Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-1">
        {/* Card 1: Available Cash */}
        <div className="cinematic-card cinematic-card-interactive p-[18px] sm:p-[22px] rounded-[18px] space-y-3.5 animate-cinematic-reveal-1">
          <div className="flex items-center justify-between">
            <span className="financial-card-title text-[18px] sm:text-[19px] lg:text-[20px] font-[600] text-[#F5F5F2]">Available Cash</span>
            <div className="w-8 h-8 rounded-lg bg-[#141515]/90 border border-white/[0.1] text-[#55BDE8] flex items-center justify-center shrink-0 shadow-inner">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="space-y-2">
            <div className="financial-val-card text-[27px] sm:text-[30px] md:text-[32px] lg:text-[36px] font-[600] leading-none">
              <AnimatedNumericValue value={user.walletBalance} variant="primary" />
            </div>
            <div className="inline-flex items-center gap-1.5 text-[11.5px] text-[#43C98B] font-medium bg-[#43C98B]/10 border border-[#43C98B]/20 px-2 py-0.5 rounded-md">
              <span className="w-1.5 h-1.5 rounded-full bg-[#43C98B]" />
              <span>Liquid</span>
            </div>
          </div>
        </div>

        {/* Card 2: Invested Capital */}
        <div className="cinematic-card cinematic-card-interactive p-[18px] sm:p-[22px] rounded-[18px] space-y-3.5 animate-cinematic-reveal-2">
          <div className="flex items-center justify-between">
            <span className="financial-card-title text-[18px] sm:text-[19px] lg:text-[20px] font-[600] text-[#F5F5F2]">Invested Capital</span>
            <div className="w-8 h-8 rounded-lg bg-[#141515]/90 border border-white/[0.1] text-[#F5F5F2] flex items-center justify-center shrink-0 shadow-inner">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div className="space-y-2">
            <div className="financial-val-card text-[27px] sm:text-[30px] md:text-[32px] lg:text-[36px] font-[600] leading-none">
              <AnimatedNumericValue value={user.investedBalance} variant="primary" />
            </div>
            <div className="inline-flex items-center gap-1.5 text-[11.5px] text-[#55BDE8] font-medium bg-[#55BDE8]/10 border border-[#55BDE8]/20 px-2 py-0.5 rounded-md">
              <span className="w-1.5 h-1.5 rounded-full bg-[#55BDE8]" />
              <span>Active</span>
            </div>
          </div>
        </div>

        {/* Card 3: Realized Returns */}
        <div className="cinematic-card cinematic-card-interactive p-[18px] sm:p-[22px] rounded-[18px] space-y-3.5 animate-cinematic-reveal-3">
          <div className="flex items-center justify-between">
            <span className="financial-card-title text-[18px] sm:text-[19px] lg:text-[20px] font-[600] text-[#F5F5F2]">Realized Returns</span>
            <div className="w-8 h-8 rounded-lg bg-[#141515]/90 border border-white/[0.1] text-[#43C98B] flex items-center justify-center shrink-0 shadow-inner">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="space-y-2">
            <div className="financial-val-card text-[27px] sm:text-[30px] md:text-[32px] lg:text-[36px] font-[600] leading-none">
              <AnimatedNumericValue value={user.totalEarned} prefix="+" variant="positive" />
            </div>
            <div className="inline-flex items-center gap-1.5 text-[11.5px] text-[#43C98B] font-medium bg-[#43C98B]/10 border border-[#43C98B]/20 px-2 py-0.5 rounded-md">
              <span className="w-1.5 h-1.5 rounded-full bg-[#43C98B]" />
              <span>Paid out</span>
            </div>
          </div>
        </div>

        {/* Card 4: Pending Activity */}
        <div className="cinematic-card cinematic-card-interactive p-[18px] sm:p-[22px] rounded-[18px] space-y-3.5 animate-cinematic-reveal-4">
          <div className="flex items-center justify-between">
            <span className="financial-card-title text-[18px] sm:text-[19px] lg:text-[20px] font-[600] text-[#F5F5F2]">Pending Activity</span>
            <div className="w-8 h-8 rounded-lg bg-[#141515]/90 border border-white/[0.1] text-[#E5A84B] flex items-center justify-center shrink-0 shadow-inner">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="space-y-2">
            <div className="financial-val-card text-[27px] sm:text-[30px] md:text-[32px] lg:text-[36px] font-[600] leading-none">
              <AnimatedNumericValue value={pendingAmount} variant="pending" />
            </div>
            <div className="inline-flex items-center gap-1.5 text-[11.5px] text-[#E5A84B] font-medium bg-[#E5A84B]/10 border border-[#E5A84B]/20 px-2 py-0.5 rounded-md">
              <span className="w-1.5 h-1.5 rounded-full bg-[#E5A84B]" />
              <span>{pendingTxs.length > 0 ? `${pendingTxs.length} In Escrow` : 'Clear'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
