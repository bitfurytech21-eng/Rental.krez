import React from 'react';
import { User } from '../../types/user';
import { Transaction } from '../../types/transaction';
import { formatCurrency } from '../../lib/utils';
import { Wallet, Building2, ArrowDownLeft, ArrowUpRight, Clock, TrendingUp } from 'lucide-react';

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
    <div className="bg-[#141515] text-[#F5F5F2] p-[18px] sm:p-[28px] rounded-[18px] sm:rounded-[24px] border border-[#292B2B] shadow-2xl relative overflow-hidden space-y-6">
      {/* Subtle background ambient aura */}
      <div className="absolute -top-12 -left-12 w-72 h-48 bg-[radial-gradient(ellipse_at_center,_rgba(85,189,232,0.04)_0%,_transparent_70%)] pointer-events-none" />

      {/* Main Portfolio Header & Primary Actions */}
      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[12px] uppercase tracking-wider text-[#777979] font-bold">
              Total Portfolio Valuation
            </span>
            <span className="inline-flex items-center gap-1.5 text-[11px] font-mono text-[#55BDE8] bg-[#55BDE8]/10 border border-[#55BDE8]/20 px-2 py-0.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-[#55BDE8]" /> Live Sync
            </span>
          </div>

          <div className="text-[32px] sm:text-[40px] font-bold font-mono tabular-nums text-[#F5F5F2] tracking-tight leading-none">
            {formatCurrency(totalPortfolio)}
          </div>

          <p className="text-[14px] text-[#A5A6A5] mt-2 leading-tight">
            Liquid cash balances and SPV real estate holdings.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 shrink-0 pt-1 md:pt-0">
          <button
            onClick={onDeposit}
            className="h-[48px] sm:h-[50px] bg-[#F5F5F2] hover:bg-[#E2E2DF] text-[#090A0A] text-[14px] font-bold px-5 rounded-[14px] shadow-sm inline-flex items-center gap-2 transition-all cursor-pointer active:scale-[0.98] whitespace-nowrap"
          >
            <ArrowDownLeft className="w-4 h-4 stroke-[2.5] text-[#090A0A]" />
            <span>Deposit</span>
          </button>
          <button
            onClick={onWithdraw}
            className="h-[48px] sm:h-[50px] bg-[#1D1E1E] hover:bg-[#232424] text-[#F5F5F2] border border-[#292B2B] hover:border-[#353838] text-[14px] font-bold px-5 rounded-[14px] shadow-sm inline-flex items-center gap-2 transition-all cursor-pointer active:scale-[0.98] whitespace-nowrap"
          >
            <ArrowUpRight className="w-4 h-4 text-[#A5A6A5]" />
            <span>Withdraw</span>
          </button>
        </div>
      </div>

      {/* 4 Clean Minimalist Financial Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-5 border-t border-[#292B2B]">
        {/* Card 1: Available Cash */}
        <div className="bg-[#1D1E1E] p-[16px] sm:p-[20px] rounded-[16px] sm:rounded-[18px] border border-[#292B2B] space-y-3 hover:border-[#353838] transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[15px] font-semibold text-[#F5F5F2]">Available Cash</span>
            <div className="w-7 h-7 rounded-lg bg-[#141515] border border-[#292B2B] text-[#55BDE8] flex items-center justify-center shrink-0">
              <Wallet className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="space-y-2">
            <span className="text-[24px] sm:text-[26px] font-bold font-mono tabular-nums text-[#F5F5F2] block leading-none">
              {formatCurrency(user.walletBalance)}
            </span>
            <div className="inline-flex items-center gap-1.5 text-[12px] text-[#43C98B] font-medium bg-[#43C98B]/10 border border-[#43C98B]/20 px-2 py-0.5 rounded-md">
              <span className="w-1.5 h-1.5 rounded-full bg-[#43C98B]" />
              <span>Liquid</span>
            </div>
          </div>
        </div>

        {/* Card 2: Invested Capital */}
        <div className="bg-[#1D1E1E] p-[16px] sm:p-[20px] rounded-[16px] sm:rounded-[18px] border border-[#292B2B] space-y-3 hover:border-[#353838] transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[15px] font-semibold text-[#F5F5F2]">Invested Capital</span>
            <div className="w-7 h-7 rounded-lg bg-[#141515] border border-[#292B2B] text-[#F5F5F2] flex items-center justify-center shrink-0">
              <Building2 className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="space-y-2">
            <span className="text-[24px] sm:text-[26px] font-bold font-mono tabular-nums text-[#F5F5F2] block leading-none">
              {formatCurrency(user.investedBalance)}
            </span>
            <div className="inline-flex items-center gap-1.5 text-[12px] text-[#55BDE8] font-medium bg-[#55BDE8]/10 border border-[#55BDE8]/20 px-2 py-0.5 rounded-md">
              <span className="w-1.5 h-1.5 rounded-full bg-[#55BDE8]" />
              <span>Active</span>
            </div>
          </div>
        </div>

        {/* Card 3: Realized Returns */}
        <div className="bg-[#1D1E1E] p-[16px] sm:p-[20px] rounded-[16px] sm:rounded-[18px] border border-[#292B2B] space-y-3 hover:border-[#353838] transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[15px] font-semibold text-[#F5F5F2]">Realized Returns</span>
            <div className="w-7 h-7 rounded-lg bg-[#141515] border border-[#292B2B] text-[#43C98B] flex items-center justify-center shrink-0">
              <TrendingUp className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="space-y-2">
            <span className="text-[24px] sm:text-[26px] font-bold font-mono tabular-nums text-[#43C98B] block leading-none">
              +{formatCurrency(user.totalEarned)}
            </span>
            <div className="inline-flex items-center gap-1.5 text-[12px] text-[#43C98B] font-medium bg-[#43C98B]/10 border border-[#43C98B]/20 px-2 py-0.5 rounded-md">
              <span className="w-1.5 h-1.5 rounded-full bg-[#43C98B]" />
              <span>Paid out</span>
            </div>
          </div>
        </div>

        {/* Card 4: Pending Activity */}
        <div className="bg-[#1D1E1E] p-[16px] sm:p-[20px] rounded-[16px] sm:rounded-[18px] border border-[#292B2B] space-y-3 hover:border-[#353838] transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[15px] font-semibold text-[#F5F5F2]">Pending Activity</span>
            <div className="w-7 h-7 rounded-lg bg-[#141515] border border-[#292B2B] text-[#E7B96D] flex items-center justify-center shrink-0">
              <Clock className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="space-y-2">
            <span className="text-[24px] sm:text-[26px] font-bold font-mono tabular-nums text-[#F5F5F2] block leading-none">
              {pendingTxs.length > 0 ? formatCurrency(pendingAmount) : '€0.00'}
            </span>
            <div className="inline-flex items-center gap-1.5 text-[12px] text-[#E7B96D] font-medium bg-[#E7B96D]/10 border border-[#E7B96D]/20 px-2 py-0.5 rounded-md">
              <span className="w-1.5 h-1.5 rounded-full bg-[#E7B96D]" />
              <span>{pendingTxs.length > 0 ? `${pendingTxs.length} In Escrow` : 'Clear'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
