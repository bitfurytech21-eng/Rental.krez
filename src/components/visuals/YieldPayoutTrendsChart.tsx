import React, { useState } from 'react';
import { formatCurrency, formatPercent } from '../../lib/utils';
import { Calendar, BarChart3, TrendingUp } from 'lucide-react';

interface MonthlyPayout {
  month: string;
  amount: number;
  apy: number;
  propertyCount: number;
}

const DEFAULT_PAYOUTS: MonthlyPayout[] = [
  { month: 'May', amount: 185, apy: 7.2, propertyCount: 1 },
  { month: 'Jun', amount: 210, apy: 7.4, propertyCount: 1 },
  { month: 'Jul', amount: 340, apy: 8.1, propertyCount: 2 },
  { month: 'Aug', amount: 365, apy: 8.2, propertyCount: 2 },
  { month: 'Sep', amount: 480, apy: 8.5, propertyCount: 3 },
  { month: 'Oct', amount: 520, apy: 8.7, propertyCount: 3 },
];

export const YieldPayoutTrendsChart: React.FC<{
  payouts?: MonthlyPayout[];
  className?: string;
}> = ({ payouts = DEFAULT_PAYOUTS, className = '' }) => {
  const [hoveredMonth, setHoveredMonth] = useState<MonthlyPayout | null>(null);

  const maxAmount = Math.max(...payouts.map((p) => p.amount)) * 1.15 || 600;
  const maxApy = 12;

  const totalEarned = payouts.reduce((sum, p) => sum + p.amount, 0);
  const avgApy = payouts.reduce((sum, p) => sum + p.apy, 0) / (payouts.length || 1);

  return (
    <div className={`bg-white dark:bg-[#0D1522] border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm space-y-4 ${className}`}>
      {/* Chart Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400">
              <BarChart3 className="w-4 h-4" />
            </span>
            <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100">
              Monthly Dividend Payout & APY Yield Trends
            </h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Historical distribution payouts credited on the 1st of each month
          </p>
        </div>

        <div className="flex items-center gap-3 text-xs font-mono">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-xs bg-emerald-500" />
            <span className="text-slate-600 dark:text-slate-400">Monthly Payout (€)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-amber-500" />
            <span className="text-slate-600 dark:text-slate-400">Annual APY %</span>
          </div>
        </div>
      </div>

      {/* Bar Chart Container */}
      <div className="relative pt-4 pb-2">
        <div className="grid grid-cols-6 gap-2 sm:gap-4 items-end h-44 border-b border-slate-200 dark:border-slate-700 px-2">
          {payouts.map((p, idx) => {
            const heightPercent = Math.round((p.amount / maxAmount) * 100);
            const isHovered = hoveredMonth?.month === p.month;

            return (
              <div
                key={idx}
                onMouseEnter={() => setHoveredMonth(p)}
                onMouseLeave={() => setHoveredMonth(null)}
                className="group relative flex flex-col items-center h-full justify-end cursor-pointer"
              >
                {/* Bar */}
                <div
                  className={`w-full max-w-[36px] rounded-t-lg transition-all duration-300 ${
                    isHovered
                      ? 'bg-emerald-600 dark:bg-emerald-400 scale-105 shadow-md'
                      : 'bg-gradient-to-t from-emerald-600 to-emerald-500 dark:from-emerald-700 dark:to-emerald-500'
                  }`}
                  style={{ height: `${heightPercent}%` }}
                >
                  {/* Amount Text Inside/Above Bar */}
                  <div className="text-[10px] font-mono font-bold text-slate-700 dark:text-slate-200 text-center -mt-5">
                    €{p.amount}
                  </div>
                </div>

                {/* APY Trend Marker Dot */}
                <div
                  className="absolute w-2.5 h-2.5 rounded-full bg-amber-500 border-2 border-white dark:border-slate-900 z-10 transition-all duration-300"
                  style={{ bottom: `${Math.round((p.apy / maxApy) * 100)}%` }}
                  title={`${p.apy}% APY`}
                />

                {/* X Axis Month Label */}
                <span className="text-[11px] font-mono font-semibold text-slate-500 dark:text-slate-400 mt-2">
                  {p.month}
                </span>

                {/* Tooltip Card */}
                {isHovered && (
                  <div className="absolute bottom-full mb-2 w-44 z-30 p-2.5 rounded-xl bg-slate-900 text-white text-xs shadow-xl border border-slate-700 font-mono animate-fadeIn">
                    <div className="text-[10px] text-slate-400 pb-1 border-b border-slate-800">
                      {p.month} Distribution Record
                    </div>
                    <div className="flex justify-between items-center text-xs font-bold mt-1">
                      <span className="text-slate-300">Net Payout:</span>
                      <span className="text-emerald-400">+{formatCurrency(p.amount)}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs font-bold">
                      <span className="text-slate-300">Effective APY:</span>
                      <span className="text-amber-400">{formatPercent(p.apy)}</span>
                    </div>
                    <div className="text-[9.5px] text-slate-400 mt-1 pt-1 border-t border-slate-800">
                      From {p.propertyCount} active {p.propertyCount === 1 ? 'property' : 'properties'}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer Stats Summary */}
      <div className="flex flex-wrap items-center justify-between text-xs font-mono pt-1 text-slate-600 dark:text-slate-400">
        <div>
          Total Distributions Tracked:{' '}
          <span className="font-bold text-emerald-600 dark:text-emerald-400">
            {formatCurrency(totalEarned)}
          </span>
        </div>
        <div>
          Average Portfolio APY:{' '}
          <span className="font-bold text-amber-600 dark:text-amber-400">
            {formatPercent(avgApy)}
          </span>
        </div>
      </div>
    </div>
  );
};
