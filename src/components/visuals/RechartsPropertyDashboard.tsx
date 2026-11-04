import React, { useState } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  Cell,
  PieChart,
  Pie,
} from 'recharts';
import { Property } from '../../types/property';
import { Investment } from '../../types/investment';
import { Transaction } from '../../types/transaction';
import { formatCurrency, formatPercent } from '../../lib/utils';
import { TrendingUp, BarChart2, Building2, Coins, ShieldCheck, CheckCircle2 } from 'lucide-react';

interface RechartsPropertyDashboardProps {
  properties: Property[];
  investments: Investment[];
  transactions: Transaction[];
  className?: string;
}

export const RechartsPropertyDashboard: React.FC<RechartsPropertyDashboardProps> = ({
  properties,
  investments,
  transactions,
  className = '',
}) => {
  // 1. Monthly Yield Trends Data (Strictly derived from real completed distribution ledger records)
  const dividendTransactions = transactions.filter(
    (t) => t.type === 'distribution' && (t.status === 'completed' || t.status === 'approved')
  );

  const [activeTab, setActiveTab] = useState<'yield' | 'funding' | 'allocation'>(() =>
    dividendTransactions.length > 0 ? 'yield' : 'funding'
  );

  const weightedHoldingApy =
    investments.length > 0
      ? investments.reduce((acc, inv) => acc + (inv.estimatedAnnualYield || 0), 0) / investments.length
      : 0;

  const monthlyYieldMap = new Map<string, { month: string; yieldPaid: number; targetApy: number; holdings: number }>();
  dividendTransactions
    .slice()
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    .forEach((tx) => {
      const d = new Date(tx.createdAt);
      const label = Number.isNaN(d.getTime())
        ? 'Recent'
        : d.toLocaleDateString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' });
      const existing = monthlyYieldMap.get(label);
      if (existing) {
        existing.yieldPaid = Number((existing.yieldPaid + tx.amount).toFixed(2));
      } else {
        monthlyYieldMap.set(label, {
          month: label,
          yieldPaid: Number(tx.amount.toFixed(2)),
          targetApy: Number(weightedHoldingApy.toFixed(2)),
          holdings: investments.length,
        });
      }
    });

  const monthlyYieldData = Array.from(monthlyYieldMap.values());
  const projectedMonthlyRunRate = investments.reduce((sum, inv) => sum + (inv.projectedMonthlyIncome || 0), 0);

  // 2. Property Funding Progress Data (Real property targets & funded amounts)
  const visibleCatalog = properties
    .filter((p) => p.status !== 'hidden' && p.status !== 'pending_approval' && p.approvedForFrontend !== false)
    .slice(0, 12);

  const fundingProgressData = visibleCatalog.map((p) => {
    const percent = Math.min(100, Math.round((p.fundedAmount / (p.targetAmount || 1)) * 100));
    return {
      name: p.title.length > 20 ? p.title.slice(0, 18) + '...' : p.title,
      fullName: p.title,
      location: p.location,
      fundedAmount: p.fundedAmount,
      targetAmount: p.targetAmount,
      remainingAmount: Math.max(0, p.targetAmount - p.fundedAmount),
      fundingProgressPercent: percent,
      yieldApy: p.estimatedAnnualYield,
      status: p.status,
    };
  });

  // 3. Asset Allocation Data (Strictly distinguishes user portfolio vs catalog funded breakdown)
  const allocationColors = ['#087F5B', '#2563EB', '#D97706', '#7C3AED', '#059669', '#DC2626'];
  const isShowingCatalogAllocation = investments.length === 0;
  const allocationData = !isShowingCatalogAllocation
    ? investments.map((inv, i) => ({
        name: inv.propertyTitle.length > 18 ? inv.propertyTitle.slice(0, 16) + '...' : inv.propertyTitle,
        value: inv.currentValuation || inv.totalAmountInvested,
        dividends: inv.totalDividendsReceived || 0,
        color: allocationColors[i % allocationColors.length],
      }))
    : visibleCatalog.slice(0, 6).map((p, i) => ({
        name: p.title.length > 18 ? p.title.slice(0, 16) + '...' : p.title,
        value: p.fundedAmount,
        dividends: Math.round((p.fundedAmount * p.estimatedAnnualYield) / 100),
        color: allocationColors[i % allocationColors.length],
      }));

  const totalMarketValuation = allocationData.reduce((sum, d) => sum + d.value, 0);

  // Recharts Custom Tooltip Component for Yield Trends
  const CustomYieldTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900/95 text-white p-3 rounded-xl border border-slate-700 shadow-xl text-xs font-mono space-y-1 z-50">
          <p className="font-bold text-slate-300 border-b border-slate-800 pb-1">{label}</p>
          <p className="text-emerald-400 font-bold">
            Yield Paid: +{formatCurrency(payload[0]?.value || 0)}
          </p>
          {payload[1] && (
            <p className="text-amber-400 font-bold">
              Target APY: {formatPercent(payload[1]?.value || 0)}
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  // Recharts Custom Tooltip for Funding Progress
  const CustomFundingTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-slate-900/95 text-white p-3 rounded-xl border border-slate-700 shadow-xl text-xs font-mono space-y-1 z-50 max-w-xs">
          <p className="font-bold text-white text-xs border-b border-slate-800 pb-1">{data.fullName}</p>
          <p className="text-slate-300 text-[10.5px]">{data.location}</p>
          <div className="pt-1 space-y-0.5">
            <p className="text-emerald-400 font-bold">Funded: {formatCurrency(data.fundedAmount)}</p>
            <p className="text-slate-400">Target AUM: {formatCurrency(data.targetAmount)}</p>
            <p className="text-blue-400 font-bold">Progress: {data.fundingProgressPercent}% Completed</p>
            <p className="text-amber-400">Yield: {formatPercent(data.yieldApy)} APY</p>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className={`bg-white dark:bg-[#0D1522] border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm space-y-4 ${className}`}>
      {/* Control Header & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400">
              <BarChart2 className="w-4 h-4" />
            </span>
            <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100">
              Property Funding &amp; Portfolio Performance Visualiser
            </h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Live visualization of verified offering capitalization, settled payouts, and SPV allocation
          </p>
        </div>

        {/* View Mode Tabs */}
        <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800/90 rounded-xl text-xs font-semibold self-start sm:self-auto">
          <button
            onClick={() => setActiveTab('funding')}
            className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'funding'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-2xs font-bold'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <Building2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span>Funding Progress</span>
          </button>
          <button
            onClick={() => setActiveTab('yield')}
            className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'yield'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-2xs font-bold'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Settled Yields</span>
          </button>
          <button
            onClick={() => setActiveTab('allocation')}
            className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'allocation'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-2xs font-bold'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <Coins className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            <span>{isShowingCatalogAllocation ? 'Catalog Mix' : 'My Allocation'}</span>
          </button>
        </div>
      </div>

      {/* 1. Monthly Yield Trends Area & Line Chart */}
      {activeTab === 'yield' && (
        <div className="space-y-3">
          <div className="flex justify-between items-center text-xs font-mono tabular-nums">
            <span className="text-slate-500 dark:text-slate-400">Settled Dividend Distributions (€)</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-bold">
              Realized Cumulative Yield: {formatCurrency(monthlyYieldData.reduce((acc, d) => acc + d.yieldPaid, 0))}
            </span>
          </div>

          {monthlyYieldData.length === 0 ? (
            <div className="py-10 px-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-dashed border-slate-200 dark:border-slate-800 text-center space-y-1.5">
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                No settled dividend payouts recorded on your account ledger yet
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                {investments.length > 0
                  ? `Contractual monthly accrual across your ${investments.length} active SPV ${
                      investments.length === 1 ? 'holding' : 'holdings'
                    }: ${formatCurrency(projectedMonthlyRunRate)}/mo. Historical chart points appear once monthly payouts settle.`
                  : 'Subscribe to an active real estate SPV offering to begin receiving verified monthly distributions.'}
              </p>
            </div>
          ) : (
            <div className="h-64 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyYieldData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="rechartsYieldGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#087F5B" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#087F5B" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip content={<CustomYieldTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="yieldPaid"
                    stroke="#087F5B"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#rechartsYieldGradient)"
                    name="Yield Paid (€)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {/* 2. Property Funding Progress Bar Chart */}
      {activeTab === 'funding' && (
        <div className="space-y-3">
          <div className="flex justify-between items-center text-xs font-mono">
            <span className="text-slate-500 dark:text-slate-400">Capital Funded vs Target AUM (€)</span>
            <span className="text-blue-600 dark:text-blue-400 font-bold">
              Total Target AUM: {formatCurrency(properties.reduce((sum, p) => sum + p.targetAmount, 0))}
            </span>
          </div>

          <div className="h-64 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={fundingProgressData} margin={{ top: 10, right: 10, left: -10, bottom: 25 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-15} textAnchor="end" />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip content={<CustomFundingTooltip />} />
                <Bar dataKey="fundedAmount" fill="#087F5B" name="Funded (€)" radius={[6, 6, 0, 0]}>
                  {fundingProgressData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.fundingProgressPercent >= 100 ? '#087F5B' : '#2563EB'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Funding Progress Status Bar List */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            {fundingProgressData.map((p, idx) => (
              <div key={idx} className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 space-y-1.5 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-slate-900 dark:text-slate-100 truncate">{p.fullName}</span>
                  <span className="font-mono text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                    {p.fundingProgressPercent}% Funded
                  </span>
                </div>

                {/* Progress Bar Track */}
                <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-600 to-emerald-500 rounded-full transition-all duration-500"
                    style={{ width: `${p.fundingProgressPercent}%` }}
                  />
                </div>

                <div className="flex justify-between items-center text-[10px] font-mono text-slate-500 dark:text-slate-400">
                  <span>{formatCurrency(p.fundedAmount)} Raised</span>
                  <span>Target: {formatCurrency(p.targetAmount)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. Asset Allocation Donut / Pie Chart */}
      {activeTab === 'allocation' && (
        <div className="space-y-3">
          <div className="flex justify-between items-center text-xs font-mono">
            <span className="text-slate-500 dark:text-slate-400">Capital Value Allocation across Properties</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-bold">
              Total Capital: {formatCurrency(totalMarketValuation)}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={allocationData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {allocationData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: any) => [formatCurrency(Number(value)), 'Valuation']}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Allocation Legend */}
            <div className="space-y-2">
              {allocationData.map((item, idx) => {
                const percent = Math.round((item.value / (totalMarketValuation || 1)) * 100);
                return (
                  <div key={idx} className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                      <span className="font-bold text-slate-900 dark:text-slate-100 truncate">{item.name}</span>
                    </div>
                    <div className="text-right font-mono font-bold">
                      <span className="text-slate-900 dark:text-slate-100">{formatCurrency(item.value)}</span>
                      <span className="text-slate-500 dark:text-slate-400 ml-1.5 text-[10.5px]">({percent}%)</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
