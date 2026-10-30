import React, { useMemo, useState } from 'react';
import { formatCurrency, formatPercent } from '../../lib/utils';
import { BarChart3, Calendar } from 'lucide-react';
import { Transaction } from '../../types/transaction';
import { Investment } from '../../types/investment';

export interface MonthlyPayout {
  month: string;
  amount: number;
  apy: number;
  propertyCount: number;
}

export const YieldPayoutTrendsChart: React.FC<{
  payouts?: MonthlyPayout[];
  transactions?: Transaction[];
  investments?: Investment[];
  className?: string;
}> = ({ payouts, transactions = [], investments = [], className = '' }) => {
  const [hoveredMonth, setHoveredMonth] = useState<MonthlyPayout | null>(null);

  const weightedApy = useMemo(() => {
    const totalInvested = investments.reduce((s, inv) => s + (inv.totalAmountInvested || 0), 0);
    if (totalInvested <= 0) return 0;
    return (
      investments.reduce(
        (s, inv) => s + (inv.estimatedAnnualYield || 0) * (inv.totalAmountInvested || 0),
        0
      ) / totalInvested
    );
  }, [investments]);

  const resolvedPayouts = useMemo<MonthlyPayout[]>(() => {
    if (payouts && payouts.length > 0) return payouts;

    const distTxs = transactions
      .filter((t) => t.type === 'distribution' && (t.status === 'completed' || t.status === 'approved'))
      .slice()
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    if (distTxs.length === 0) return [];

    const byMonth = new Map<string, MonthlyPayout>();
    for (const tx of distTxs) {
      const d = new Date(tx.createdAt);
      const label = Number.isNaN(d.getTime())
        ? 'Recent'
        : d.toLocaleDateString('en-US', { month: 'short', year: '2-digit', timeZone: 'UTC' });
      const existing = byMonth.get(label);
      if (existing) {
        existing.amount = Number((existing.amount + tx.amount).toFixed(2));
      } else {
        byMonth.set(label, {
          month: label,
          amount: Number(tx.amount.toFixed(2)),
          apy: Number((weightedApy || 8.4).toFixed(1)),
          propertyCount: Math.max(1, investments.length),
        });
      }
    }

    return Array.from(byMonth.values()).slice(-6);
  }, [payouts, transactions, investments.length, weightedApy]);

  const projectedMonthly = investments.reduce((sum, inv) => sum + (inv.projectedMonthlyIncome || 0), 0);
  const maxAmount =
    resolvedPayouts.length > 0
      ? Math.max(...resolvedPayouts.map((p) => p.amount)) * 1.15 || 100
      : 100;
  const maxApy = 15;

  const totalEarned = resolvedPayouts.reduce((sum, p) => sum + p.amount, 0);
  const avgApy =
    resolvedPayouts.length > 0
      ? resolvedPayouts.reduce((sum, p) => sum + p.apy, 0) / resolvedPayouts.length
      : weightedApy;

  return (
    <div
      className={`bg-white dark:bg-[#0D1522] border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm space-y-4 ${className}`}
    >
      {/* Chart Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400">
              <BarChart3 className="w-4 h-4" />
            </span>
            <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100">
              Monthly Dividend Payout &amp; APY Yield Trends
            </h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Settled rental distribution payouts verified on your account ledger
          </p>
        </div>

        <div className="flex items-center gap-3 text-xs font-mono">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-xs bg-emerald-500" />
            <span className="text-slate-600 dark:text-slate-400">Settled Payout (€)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-amber-500" />
            <span className="text-slate-600 dark:text-slate-400">Underwritten APY %</span>
          </div>
        </div>
      </div>

      {resolvedPayouts.length === 0 ? (
        <div className="py-8 px-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-dashed border-slate-200 dark:border-slate-800 text-center space-y-1.5">
          <Calendar className="w-6 h-6 text-emerald-600 dark:text-emerald-400 mx-auto opacity-80" />
          <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
            No settled monthly rental distributions on record yet
          </p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            {investments.length > 0
              ? `Your ${investments.length} active property ${
                  investments.length === 1 ? 'holding accrues' : 'holdings accrue'
                } an estimated ${formatCurrency(
                  projectedMonthly
                )}/mo (${formatPercent(weightedApy)} weighted target APY). Distributions credit on the 1st business day of each month.`
              : 'Historical payout bars are generated strictly from settled account distributions once you hold income-producing SPV units.'}
          </p>
        </div>
      ) : (
        <div className="relative pt-4 pb-2">
          <div
            className="grid gap-2 sm:gap-4 items-end h-44 border-b border-slate-200 dark:border-slate-700 px-2"
            style={{
              gridTemplateColumns: `repeat(${Math.max(1, resolvedPayouts.length)}, minmax(0, 1fr))`,
            }}
          >
            {resolvedPayouts.map((p, idx) => {
              const heightPercent = Math.max(8, Math.round((p.amount / maxAmount) * 100));
              const isHovered = hoveredMonth?.month === p.month;

              return (
                <div
                  key={idx}
                  onMouseEnter={() => setHoveredMonth(p)}
                  onMouseLeave={() => setHoveredMonth(null)}
                  className="group relative flex flex-col items-center h-full justify-end cursor-pointer"
                >
                  <div
                    className={`w-full max-w-[40px] rounded-t-lg transition-all duration-300 ${
                      isHovered
                        ? 'bg-emerald-600 dark:bg-emerald-400 scale-105 shadow-md'
                        : 'bg-gradient-to-t from-emerald-600 to-emerald-500 dark:from-emerald-700 dark:to-emerald-500'
                    }`}
                    style={{ height: `${heightPercent}%` }}
                  >
                    <div className="text-[10px] font-mono tabular-nums font-bold text-slate-700 dark:text-slate-200 text-center -mt-5">
                      {formatCurrency(p.amount)}
                    </div>
                  </div>

                  <div
                    className="absolute w-2.5 h-2.5 rounded-full bg-amber-500 border-2 border-white dark:border-slate-900 z-10 transition-all duration-300"
                    style={{ bottom: `${Math.min(95, Math.round((p.apy / maxApy) * 100))}%` }}
                    title={`${p.apy}% APY`}
                  />

                  <span className="text-[11px] font-mono font-semibold text-slate-500 dark:text-slate-400 mt-2">
                    {p.month}
                  </span>

                  {isHovered && (
                    <div className="absolute bottom-full mb-2 w-48 z-30 p-2.5 rounded-xl bg-slate-900 text-white text-xs shadow-xl border border-slate-700 font-mono">
                      <div className="text-[10px] text-slate-400 pb-1 border-b border-slate-800">
                        {p.month} Distribution Record
                      </div>
                      <div className="flex justify-between items-center text-xs font-bold mt-1 tabular-nums">
                        <span className="text-slate-300">Net Payout:</span>
                        <span className="text-emerald-400">+{formatCurrency(p.amount)}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs font-bold tabular-nums">
                        <span className="text-slate-300">Target APY:</span>
                        <span className="text-amber-400">{formatPercent(p.apy)}</span>
                      </div>
                      <div className="text-[9.5px] text-slate-400 mt-1 pt-1 border-t border-slate-800">
                        Across {p.propertyCount} active {p.propertyCount === 1 ? 'property' : 'properties'}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Footer Stats Summary */}
      <div className="flex flex-wrap items-center justify-between text-xs font-mono tabular-nums pt-1 text-slate-600 dark:text-slate-400">
        <div>
          Settled Distributions Tracked:{' '}
          <span className="font-bold text-emerald-600 dark:text-emerald-400">
            {formatCurrency(totalEarned)}
          </span>
        </div>
        <div>
          Weighted Portfolio Target APY:{' '}
          <span className="font-bold text-amber-600 dark:text-amber-400">
            {formatPercent(avgApy)}
          </span>
        </div>
      </div>
    </div>
  );
};
