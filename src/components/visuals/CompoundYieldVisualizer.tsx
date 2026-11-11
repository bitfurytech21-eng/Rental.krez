import React, { useState, useMemo } from 'react';
import { formatCurrency, formatPercent } from '../../lib/utils';
import { Calculator, TrendingUp, Sliders } from 'lucide-react';

export const CompoundYieldVisualizer: React.FC<{ className?: string }> = ({ className = '' }) => {
  const [initialAmount, setInitialAmount] = useState<number>(5000);
  const [monthlyContribution, setMonthlyContribution] = useState<number>(300);
  const [annualApy, setAnnualApy] = useState<number>(8.5);
  const [years, setYears] = useState<number>(5);

  // Calculate compounding projected growth timeline
  const growthProjection = useMemo(() => {
    const data = [];
    let currentPrincipal = initialAmount;
    let totalInvested = initialAmount;

    for (let yr = 0; yr <= years; yr++) {
      if (yr === 0) {
        data.push({ year: `Year 0`, total: initialAmount, invested: initialAmount, yieldEarned: 0 });
      } else {
        // Compound monthly
        for (let m = 0; m < 12; m++) {
          currentPrincipal = (currentPrincipal + monthlyContribution) * (1 + annualApy / 100 / 12);
          totalInvested += monthlyContribution;
        }
        data.push({
          year: `Yr ${yr}`,
          total: Math.round(currentPrincipal),
          invested: totalInvested,
          yieldEarned: Math.round(currentPrincipal - totalInvested),
        });
      }
    }
    return data;
  }, [initialAmount, monthlyContribution, annualApy, years]);

  const finalState = growthProjection[growthProjection.length - 1];

  return (
    <div className={`bg-white dark:bg-[#0D1522] border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-sm space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400">
              <Calculator className="w-4 h-4" />
            </span>
            <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100">
              Interactive Compound Yield & Wealth Calculator
            </h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Simulate your long-term passive rental income accumulation over time
          </p>
        </div>

        <div className="text-right">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Projected Total ({years} Yrs)
          </span>
          <div className="text-lg sm:text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
            {formatCurrency(finalState.total)}
          </div>
        </div>
      </div>

      {/* Sliders Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
        {/* Initial Investment */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-center text-xs">
            <label className="font-bold text-slate-700 dark:text-slate-300">Initial Deposit</label>
            <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
              {formatCurrency(initialAmount)}
            </span>
          </div>
          <input
            type="range"
            min={500}
            max={50000}
            step={500}
            value={initialAmount}
            onChange={(e) => setInitialAmount(Number(e.target.value))}
            className="w-full accent-emerald-600 cursor-pointer"
          />
        </div>

        {/* Monthly Contribution */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-center text-xs">
            <label className="font-bold text-slate-700 dark:text-slate-300">Monthly Contribution</label>
            <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
              {formatCurrency(monthlyContribution)}/mo
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={2000}
            step={50}
            value={monthlyContribution}
            onChange={(e) => setMonthlyContribution(Number(e.target.value))}
            className="w-full accent-blue-600 cursor-pointer"
          />
        </div>

        {/* Target APY Yield */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-center text-xs">
            <label className="font-bold text-slate-700 dark:text-slate-300">Target Annual APY</label>
            <span className="font-mono font-bold text-amber-600 dark:text-amber-400">
              {formatPercent(annualApy)}
            </span>
          </div>
          <input
            type="range"
            min={5.0}
            max={12.0}
            step={0.1}
            value={annualApy}
            onChange={(e) => setAnnualApy(Number(e.target.value))}
            className="w-full accent-amber-600 cursor-pointer"
          />
        </div>
      </div>

      {/* Visual Bar Comparison Chart */}
      <div className="space-y-2">
        <div className="flex justify-between items-center text-xs text-slate-500 font-mono">
          <span>Growth Breakdown Over {years} Years</span>
          <span>
            Yield Earned:{' '}
            <strong className="text-emerald-600 dark:text-emerald-400">
              +{formatCurrency(finalState.yieldEarned)}
            </strong>
          </span>
        </div>

        <div className="grid grid-cols-6 gap-2 items-end h-36 pt-4 border-b border-slate-200 dark:border-slate-800">
          {growthProjection.map((pt, idx) => {
            const maxVal = finalState.total || 1;
            const investedHeight = Math.round((pt.invested / maxVal) * 100);
            const totalHeight = Math.round((pt.total / maxVal) * 100);

            return (
              <div key={idx} className="flex flex-col items-center h-full justify-end group">
                <div className="w-full max-w-[32px] relative flex flex-col justify-end h-full">
                  {/* Total Value Bar */}
                  <div
                    className="w-full rounded-t-md bg-emerald-500/30 dark:bg-emerald-500/20 relative"
                    style={{ height: `${totalHeight}%` }}
                  >
                    {/* Invested Principal Base */}
                    <div
                      className="w-full bg-emerald-600 dark:bg-emerald-500 rounded-t-md absolute bottom-0 left-0 right-0"
                      style={{ height: `${(pt.invested / pt.total) * 100}%` }}
                    />
                  </div>
                </div>
                <span className="text-[10px] font-mono text-slate-500 mt-1.5">{pt.year}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
