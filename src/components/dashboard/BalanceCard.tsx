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
  isLoading?: boolean;
}

export const BalanceCard: React.FC<BalanceCardProps> = ({
  user,
  transactions = [],
  onDeposit,
  onWithdraw,
  isLoading = false,
}) => {
  const totalPortfolio = user.walletBalance + user.investedBalance;

  const pendingTxs = transactions.filter(
    (tx) => tx.status === 'pending' || tx.status === 'processing'
  );
  const pendingAmount = pendingTxs.reduce((sum, tx) => sum + (tx.amount || 0), 0);

  return (
    <div className="portal-card p-5 sm:p-6 relative overflow-hidden space-y-5">
      {/* Main Portfolio Header & Primary Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--dash-text-muted)]">
            Wallet &amp; Capital Summary
          </div>

          <div className="mt-2 text-[34px] sm:text-[40px] leading-none font-bold tracking-tight tabular-nums text-[var(--dash-text)]">
            {isLoading ? (
              <div className="h-10 w-48 bg-[var(--dash-card-border)] rounded-lg animate-pulse" />
            ) : (
              <AnimatedNumericValue value={totalPortfolio} variant="primary" />
            )}
          </div>

          <p className="mt-2 text-xs sm:text-[13px] text-[var(--dash-text-muted)] leading-relaxed max-w-xl">
            Combined liquid wallet cash balance and notarized SPV real estate holdings.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onDeposit}
            className="portal-btn inline-flex items-center justify-center gap-1.5 text-sm cursor-pointer whitespace-nowrap"
          >
            <ArrowDownLeft className="w-4 h-4 stroke-[2.2]" />
            <span>Deposit</span>
          </button>
          <button
            type="button"
            onClick={onWithdraw}
            className="portal-btn-outline inline-flex items-center justify-center gap-1.5 text-sm cursor-pointer whitespace-nowrap"
          >
            <ArrowUpRight className="w-4 h-4" />
            <span>Withdraw</span>
          </button>
        </div>
      </div>

      <div className="h-px bg-[var(--dash-card-border)]" />

      {/* 4 Clean Sub-Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-4 rounded-[14px] border border-[var(--dash-card-border)] bg-[var(--dash-inner)] space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[var(--dash-text-muted)]">Available Cash</span>
            <Wallet className="w-4 h-4 text-[var(--dash-accent)]" />
          </div>
          <div className="text-xl sm:text-2xl font-bold tabular-nums text-[var(--dash-text)] leading-none">
            <AnimatedNumericValue value={user.walletBalance} variant="primary" />
          </div>
          <span className="portal-pill ok inline-block">Liquid</span>
        </div>

        <div className="p-4 rounded-[14px] border border-[var(--dash-card-border)] bg-[var(--dash-inner)] space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[var(--dash-text-muted)]">Invested Capital</span>
            <Building2 className="w-4 h-4 text-[var(--dash-text-secondary)]" />
          </div>
          <div className="text-xl sm:text-2xl font-bold tabular-nums text-[var(--dash-text)] leading-none">
            <AnimatedNumericValue value={user.investedBalance} variant="primary" />
          </div>
          <span className="portal-pill inline-block">Active SPVs</span>
        </div>

        <div className="p-4 rounded-[14px] border border-[var(--dash-card-border)] bg-[var(--dash-inner)] space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[var(--dash-text-muted)]">Realized Returns</span>
            <TrendingUp className="w-4 h-4 text-[var(--dash-positive)]" />
          </div>
          <div className="text-xl sm:text-2xl font-bold tabular-nums text-[var(--dash-positive)] leading-none">
            <AnimatedNumericValue value={user.totalEarned} prefix="+" variant="positive" />
          </div>
          <span className="portal-pill ok inline-block">Paid out</span>
        </div>

        <div className="p-4 rounded-[14px] border border-[var(--dash-card-border)] bg-[var(--dash-inner)] space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[var(--dash-text-muted)]">Pending Activity</span>
            <Clock className="w-4 h-4 text-[var(--dash-warm)]" />
          </div>
          <div className="text-xl sm:text-2xl font-bold tabular-nums text-[var(--dash-text)] leading-none">
            <AnimatedNumericValue value={pendingAmount} variant="pending" />
          </div>
          <span className={`portal-pill inline-block ${pendingTxs.length > 0 ? 'wait' : ''}`}>
            {pendingTxs.length > 0 ? `${pendingTxs.length} In Escrow` : 'Clear'}
          </span>
        </div>
      </div>
    </div>
  );
};
