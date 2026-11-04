import React, { useMemo, useState } from 'react';
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
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { Property } from '../../types/property';
import { Investment } from '../../types/investment';
import { Transaction } from '../../types/transaction';
import { formatCurrency, formatDate, formatPercent } from '../../lib/utils';
import {
  BarChart3,
  PieChart as PieChartIcon,
  TrendingUp,
  Coins,
  Globe,
  Download,
  Building2,
  Calendar,
  ArrowUpRight,
  Layers,
  History,
  ExternalLink,
} from 'lucide-react';
import { SOLANA_USDC_MINT_ADDRESS } from '../../lib/solanaService';

interface InvestorAnalyticsSuiteProps {
  properties: Property[];
  investments: Investment[];
  transactions: Transaction[];
  walletBalance: number;
  onExploreProperties: () => void;
  onSelectProperty: (propertyId: string) => void;
  onOpenTransactions?: () => void;
}

const CHART_PALETTE = [
  '#087F5B',
  '#1D4ED8',
  '#B45309',
  '#0F766E',
  '#4338CA',
  '#BE123C',
  '#15803D',
  '#334155',
];

function formatPeriodMonthLabel(ym: string): string {
  const [yearStr, monthStr] = ym.split('-');
  const year = Number(yearStr);
  const month = Number(monthStr);
  if (!year || !month) return ym;
  const date = new Date(Date.UTC(year, month - 1, 1));
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' });
}

export const InvestorAnalyticsSuite: React.FC<InvestorAnalyticsSuiteProps> = ({
  properties,
  investments,
  transactions,
  walletBalance,
  onExploreProperties,
  onSelectProperty,
  onOpenTransactions,
}) => {
  const [summaryGranularity, setSummaryGranularity] = useState<'monthly' | 'annual'>('monthly');

  const propertyMap = useMemo(() => {
    const map = new Map<string, Property>();
    for (const p of properties) {
      map.set(p.id, p);
    }
    return map;
  }, [properties]);

  // Core portfolio metrics computed strictly from real ledger state
  const metrics = useMemo(() => {
    const totalInvested = investments.reduce((sum, inv) => sum + (inv.totalAmountInvested || 0), 0);
    const totalHoldingsValue = investments.reduce(
      (sum, inv) => sum + (inv.currentValuation ?? inv.totalAmountInvested ?? 0),
      0
    );
    const completedDistributions = transactions.filter(
      (tx) => tx.type === 'distribution' && (tx.status === 'completed' || tx.status === 'approved')
    );
    const ledgerDividends = completedDistributions.reduce((sum, tx) => sum + (tx.amount || 0), 0);
    const investmentDividends = investments.reduce(
      (sum, inv) => sum + (inv.totalDividendsReceived || 0),
      0
    );
    const totalRealizedDistributions = Math.max(ledgerDividends, investmentDividends);
    const projectedMonthlyIncome = investments.reduce(
      (sum, inv) => sum + (inv.projectedMonthlyIncome || 0),
      0
    );
    const weightedApy =
      totalInvested > 0
        ? investments.reduce(
            (sum, inv) => sum + (inv.estimatedAnnualYield || 0) * (inv.totalAmountInvested || 0),
            0
          ) / totalInvested
        : 0;

    return {
      totalEquity: walletBalance + totalHoldingsValue,
      totalInvested,
      totalHoldingsValue,
      unrealizedGain: totalHoldingsValue - totalInvested,
      totalRealizedDistributions,
      projectedMonthlyIncome,
      weightedApy,
      completedDistributionCount: completedDistributions.length,
    };
  }, [investments, transactions, walletBalance]);

  // 1. Investment Allocation by Property
  const allocationByProperty = useMemo(() => {
    if (investments.length === 0) return [];
    const grouped = new Map<
      string,
      {
        propertyId: string;
        title: string;
        location: string;
        tokens: number;
        invested: number;
        valuation: number;
        dividends: number;
        apy: number;
      }
    >();

    for (const inv of investments) {
      const existing = grouped.get(inv.propertyId);
      const val = inv.currentValuation ?? inv.totalAmountInvested ?? 0;
      if (existing) {
        existing.tokens += inv.tokensPurchased || 0;
        existing.invested += inv.totalAmountInvested || 0;
        existing.valuation += val;
        existing.dividends += inv.totalDividendsReceived || 0;
      } else {
        grouped.set(inv.propertyId, {
          propertyId: inv.propertyId,
          title: inv.propertyTitle,
          location: inv.propertyLocation,
          tokens: inv.tokensPurchased || 0,
          invested: inv.totalAmountInvested || 0,
          valuation: val,
          dividends: inv.totalDividendsReceived || 0,
          apy: inv.estimatedAnnualYield || 0,
        });
      }
    }

    const list = Array.from(grouped.values()).sort((a, b) => b.valuation - a.valuation);
    const totalVal = list.reduce((s, item) => s + item.valuation, 0) || 1;

    return list.map((item, idx) => ({
      ...item,
      shortTitle: item.title.length > 22 ? `${item.title.slice(0, 20)}…` : item.title,
      weightPercent: Number(((item.valuation / totalVal) * 100).toFixed(1)),
      totalReturnEur: item.valuation - item.invested + item.dividends,
      color: CHART_PALETTE[idx % CHART_PALETTE.length],
    }));
  }, [investments]);

  // 2. Portfolio Value Over Time (chronologically reconstructed from actual transactions & holdings)
  const portfolioTimeline = useMemo(() => {
    const completedTxs = transactions
      .filter((tx) => tx.status === 'completed' || tx.status === 'approved')
      .slice()
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    if (completedTxs.length === 0 && investments.length === 0) {
      return [];
    }

    const points: Array<{
      dateLabel: string;
      isoDate: string;
      cashBalance: number;
      propertyHoldings: number;
      totalPortfolioValue: number;
    }> = [];

    let runningCash = 0;
    let runningHoldings = 0;

    for (const tx of completedTxs) {
      if (tx.type === 'deposit' || tx.type === 'distribution') {
        runningCash += tx.amount || 0;
      } else if (tx.type === 'withdrawal' || tx.type === 'fee') {
        runningCash = Math.max(0, runningCash - (tx.amount || 0));
      } else if (tx.type === 'investment') {
        runningCash = Math.max(0, runningCash - (tx.amount || 0));
        runningHoldings += tx.amount || 0;
      }

      const d = new Date(tx.createdAt);
      const dateKey = Number.isNaN(d.getTime())
        ? tx.createdAt
        : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' });

      points.push({
        dateLabel: dateKey,
        isoDate: tx.createdAt,
        cashBalance: Number(runningCash.toFixed(2)),
        propertyHoldings: Number(runningHoldings.toFixed(2)),
        totalPortfolioValue: Number((runningCash + runningHoldings).toFixed(2)),
      });
    }

    // Ensure final point reconciles with exact live wallet + current holdings valuation
    const nowLabel = 'Current';
    points.push({
      dateLabel: nowLabel,
      isoDate: new Date().toISOString(),
      cashBalance: Number(walletBalance.toFixed(2)),
      propertyHoldings: Number(metrics.totalHoldingsValue.toFixed(2)),
      totalPortfolioValue: Number((walletBalance + metrics.totalHoldingsValue).toFixed(2)),
    });

    return points;
  }, [transactions, investments, walletBalance, metrics.totalHoldingsValue]);

  // 3. Rental Distributions Over Time (strictly from real completed distribution ledger records)
  const distributionsTimeline = useMemo(() => {
    const distTxs = transactions
      .filter((tx) => tx.type === 'distribution' && (tx.status === 'completed' || tx.status === 'approved'))
      .slice()
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    if (distTxs.length === 0) return [];

    const byMonth = new Map<string, { ym: string; label: string; amount: number; count: number }>();
    for (const tx of distTxs) {
      const d = new Date(tx.createdAt);
      const ym = Number.isNaN(d.getTime())
        ? 'Recent'
        : `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
      const existing = byMonth.get(ym);
      if (existing) {
        existing.amount = Number((existing.amount + (tx.amount || 0)).toFixed(2));
        existing.count += 1;
      } else {
        byMonth.set(ym, {
          ym,
          label: ym === 'Recent' ? 'Recent' : formatPeriodMonthLabel(ym),
          amount: Number((tx.amount || 0).toFixed(2)),
          count: 1,
        });
      }
    }

    return Array.from(byMonth.values());
  }, [transactions]);

  // 4. Diversification by Geography & Asset Class
  const diversification = useMemo(() => {
    if (investments.length === 0) {
      return { byRegion: [], byType: [], concentrationLabel: 'No Active Holdings' };
    }

    const regionTotals = new Map<string, number>();
    const typeTotals = new Map<string, number>();
    let total = 0;

    for (const inv of investments) {
      const prop = propertyMap.get(inv.propertyId);
      const val = inv.currentValuation ?? inv.totalAmountInvested ?? 0;
      total += val;

      const region = prop?.country
        ? `${prop.city ? `${prop.city}, ` : ''}${prop.country}`
        : inv.propertyLocation || 'European Union';
      const assetType = prop?.type || 'Luxury Residential';

      regionTotals.set(region, (regionTotals.get(region) || 0) + val);
      typeTotals.set(assetType, (typeTotals.get(assetType) || 0) + val);
    }

    const safeTotal = total || 1;
    const byRegion = Array.from(regionTotals.entries())
      .map(([name, value]) => ({
        name,
        value,
        percent: Number(((value / safeTotal) * 100).toFixed(1)),
      }))
      .sort((a, b) => b.value - a.value);

    const byType = Array.from(typeTotals.entries())
      .map(([name, value]) => ({
        name,
        value,
        percent: Number(((value / safeTotal) * 100).toFixed(1)),
      }))
      .sort((a, b) => b.value - a.value);

    // Herfindahl-Hirschman concentration index across individual properties
    const hhi = allocationByProperty.reduce((sum, item) => {
      const share = item.weightPercent / 100;
      return sum + share * share;
    }, 0);

    const concentrationLabel =
      allocationByProperty.length === 1
        ? 'Single-SPV Concentration'
        : hhi < 0.35
        ? 'Well-Diversified Multi-SPV'
        : 'Moderately Concentrated';

    return { byRegion, byType, concentrationLabel };
  }, [investments, propertyMap, allocationByProperty]);

  // 5. Monthly & Annual Financial Summaries from real ledger transactions
  const financialSummaries = useMemo(() => {
    const validTxs = transactions.filter((tx) => tx.status !== 'rejected');
    const buckets = new Map<
      string,
      {
        periodKey: string;
        periodLabel: string;
        deposits: number;
        investments: number;
        distributions: number;
        withdrawals: number;
        fees: number;
        txCount: number;
      }
    >();

    for (const tx of validTxs) {
      const d = new Date(tx.createdAt);
      const isValidDate = !Number.isNaN(d.getTime());
      const periodKey =
        summaryGranularity === 'monthly'
          ? isValidDate
            ? `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
            : 'Unknown'
          : isValidDate
          ? `${d.getUTCFullYear()}`
          : 'Unknown';

      const periodLabel =
        summaryGranularity === 'monthly' && periodKey !== 'Unknown'
          ? formatPeriodMonthLabel(periodKey)
          : periodKey;

      const row = buckets.get(periodKey) || {
        periodKey,
        periodLabel,
        deposits: 0,
        investments: 0,
        distributions: 0,
        withdrawals: 0,
        fees: 0,
        txCount: 0,
      };

      const amt = tx.amount || 0;
      if (tx.type === 'deposit') row.deposits += amt;
      else if (tx.type === 'investment') row.investments += amt;
      else if (tx.type === 'distribution') row.distributions += amt;
      else if (tx.type === 'withdrawal') row.withdrawals += amt;
      else if (tx.type === 'fee') row.fees += amt;

      row.txCount += 1;
      buckets.set(periodKey, row);
    }

    return Array.from(buckets.values())
      .sort((a, b) => b.periodKey.localeCompare(a.periodKey))
      .map((r) => ({
        ...r,
        netCashFlow: r.deposits + r.distributions - r.investments - r.withdrawals - r.fees,
      }));
  }, [transactions, summaryGranularity]);

  const handleExportCsv = () => {
    const headers = [
      'Period',
      'Deposits (EUR)',
      'Property Subscriptions (EUR)',
      'Rental Distributions (EUR)',
      'Withdrawals (EUR)',
      'Fees (EUR)',
      'Net Ledger Movement (EUR)',
      'Transaction Count',
    ];
    const rows = financialSummaries.map((r) => [
      `"${r.periodLabel}"`,
      r.deposits.toFixed(2),
      r.investments.toFixed(2),
      r.distributions.toFixed(2),
      r.withdrawals.toFixed(2),
      r.fees.toFixed(2),
      r.netCashFlow.toFixed(2),
      String(r.txCount),
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute(
      'download',
      `lagence-investor-${summaryGranularity}-summary-${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      {/* Top Institutional KPI Summary Strip */}
      <div className="bg-white dark:bg-[#0D1522] border border-[#E4EEEA] dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-[#E4EEEA] dark:border-slate-800">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#087F5B] dark:text-[#3BD4AE] block">
              Verified Ledger Analytics
            </span>
            <h2 className="text-base sm:text-lg font-bold text-[#172B2A] dark:text-white">
              Portfolio Analytics &amp; Financial Statements
            </h2>
          </div>
          <div className="flex items-center gap-2 text-[11px] font-mono text-[#71817D] dark:text-slate-400">
            <span>USDC Settlement Mint:</span>
            <a
              href={`https://explorer.solana.com/address/${SOLANA_USDC_MINT_ADDRESS}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#087F5B] dark:text-[#3BD4AE] hover:underline inline-flex items-center gap-1 font-semibold"
            >
              {SOLANA_USDC_MINT_ADDRESS.slice(0, 6)}…{SOLANA_USDC_MINT_ADDRESS.slice(-4)}
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4">
          <div className="p-3.5 rounded-xl bg-[#F6FAF8] dark:bg-slate-900/70 border border-[#E4EEEA] dark:border-slate-800">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#71817D] dark:text-slate-400 block">
              Total Account Equity
            </span>
            <div className="text-xl sm:text-2xl font-bold font-mono tabular-nums text-[#172B2A] dark:text-white mt-1">
              {formatCurrency(metrics.totalEquity)}
            </div>
            <span className="text-[11px] text-[#71817D] dark:text-slate-400 mt-1 block font-mono tabular-nums">
              Cash: {formatCurrency(walletBalance)} · SPVs: {formatCurrency(metrics.totalHoldingsValue)}
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-[#F6FAF8] dark:bg-slate-900/70 border border-[#E4EEEA] dark:border-slate-800">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#71817D] dark:text-slate-400 block">
              Subscribed Property Capital
            </span>
            <div className="text-xl sm:text-2xl font-bold font-mono tabular-nums text-[#172B2A] dark:text-white mt-1">
              {formatCurrency(metrics.totalInvested)}
            </div>
            <span className="text-[11px] text-[#087F5B] dark:text-emerald-400 mt-1 block font-mono tabular-nums">
              {allocationByProperty.length} Active {allocationByProperty.length === 1 ? 'Property' : 'Properties'}
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-[#F6FAF8] dark:bg-slate-900/70 border border-[#E4EEEA] dark:border-slate-800">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#71817D] dark:text-slate-400 block">
              Realized Rental Distributions
            </span>
            <div className="text-xl sm:text-2xl font-bold font-mono tabular-nums text-[#087F5B] dark:text-emerald-400 mt-1">
              +{formatCurrency(metrics.totalRealizedDistributions)}
            </div>
            <span className="text-[11px] text-[#71817D] dark:text-slate-400 mt-1 block font-mono tabular-nums">
              Est. Run-Rate: {formatCurrency(metrics.projectedMonthlyIncome)}/mo
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-[#F6FAF8] dark:bg-slate-900/70 border border-[#E4EEEA] dark:border-slate-800">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#71817D] dark:text-slate-400 block">
              Weighted Target Net Yield
            </span>
            <div className="text-xl sm:text-2xl font-bold font-mono tabular-nums text-[#172B2A] dark:text-white mt-1">
              {formatPercent(metrics.weightedApy)}
            </div>
            <span className="text-[11px] text-[#71817D] dark:text-slate-400 mt-1 block">
              {diversification.concentrationLabel}
            </span>
          </div>
        </div>
      </div>

      {/* Row 1: Portfolio Value Over Time + Rental Distributions Over Time */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Chart 1: Portfolio Value Over Time */}
        <div className="bg-white dark:bg-[#0D1522] border border-[#E4EEEA] dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-2xs flex flex-col justify-between">
          <div className="flex items-start justify-between gap-2 pb-3 border-b border-[#E4EEEA] dark:border-slate-800 mb-3">
            <div>
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-[#087F5B]" />
                <h3 className="text-sm sm:text-base font-bold text-[#172B2A] dark:text-white">
                  Portfolio Value Over Time
                </h3>
              </div>
              <p className="text-xs text-[#71817D] dark:text-slate-400 mt-0.5">
                Chronological account equity curve derived from verified ledger events
              </p>
            </div>
            <span className="text-xs font-mono font-bold tabular-nums text-[#087F5B] dark:text-emerald-400">
              {formatCurrency(metrics.totalEquity)}
            </span>
          </div>

          {portfolioTimeline.length === 0 ? (
            <div className="py-10 px-4 text-center space-y-2.5 bg-[#F6FAF8] dark:bg-slate-900/50 rounded-xl border border-dashed border-[#DCE8E3] dark:border-slate-800">
              <BarChart3 className="w-7 h-7 text-[#71817D] mx-auto opacity-60" />
              <p className="text-xs font-semibold text-[#172B2A] dark:text-slate-200">
                No historical portfolio valuation events recorded yet
              </p>
              <p className="text-[11px] text-[#71817D] dark:text-slate-400 max-w-sm mx-auto">
                Deposit funds or subscribe to a tokenized SPV property offering to populate your real-time equity curve.
              </p>
              <button
                type="button"
                onClick={onExploreProperties}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#1E3A34] text-white text-xs font-semibold cursor-pointer hover:bg-[#162B27] transition-colors"
              >
                <span>Browse Offerings</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="h-60 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={portfolioTimeline} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                  <defs>
                    <linearGradient id="portfolioEquityGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#087F5B" stopOpacity={0.32} />
                      <stop offset="95%" stopColor="#087F5B" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.18} />
                  <XAxis dataKey="dateLabel" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip
                    formatter={(value: any, name: any) => [
                      formatCurrency(Number(value || 0)),
                      name === 'totalPortfolioValue'
                        ? 'Total Equity'
                        : name === 'propertyHoldings'
                        ? 'Property SPVs'
                        : 'Liquid Cash',
                    ]}
                  />
                  <Area
                    type="monotone"
                    dataKey="totalPortfolioValue"
                    stroke="#087F5B"
                    strokeWidth={2.25}
                    fill="url(#portfolioEquityGrad)"
                  />
                  <Area
                    type="monotone"
                    dataKey="propertyHoldings"
                    stroke="#1D4ED8"
                    strokeWidth={1.5}
                    fillOpacity={0}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Chart 2: Rental Distributions Over Time */}
        <div className="bg-white dark:bg-[#0D1522] border border-[#E4EEEA] dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-2xs flex flex-col justify-between">
          <div className="flex items-start justify-between gap-2 pb-3 border-b border-[#E4EEEA] dark:border-slate-800 mb-3">
            <div>
              <div className="flex items-center gap-2">
                <Coins className="w-4 h-4 text-[#087F5B]" />
                <h3 className="text-sm sm:text-base font-bold text-[#172B2A] dark:text-white">
                  Rental Distributions Over Time
                </h3>
              </div>
              <p className="text-xs text-[#71817D] dark:text-slate-400 mt-0.5">
                Settled monthly rental dividends credited to your investor ledger
              </p>
            </div>
            <span className="text-xs font-mono font-bold tabular-nums text-[#087F5B] dark:text-emerald-400">
              +{formatCurrency(metrics.totalRealizedDistributions)}
            </span>
          </div>

          {distributionsTimeline.length === 0 ? (
            <div className="py-8 px-4 text-center space-y-2.5 bg-[#F6FAF8] dark:bg-slate-900/50 rounded-xl border border-dashed border-[#DCE8E3] dark:border-slate-800">
              <Calendar className="w-7 h-7 text-[#087F5B] mx-auto opacity-75" />
              <p className="text-xs font-semibold text-[#172B2A] dark:text-slate-200">
                No settled distribution payouts recorded on this account yet
              </p>
              <p className="text-[11px] text-[#71817D] dark:text-slate-400 max-w-sm mx-auto">
                {investments.length > 0
                  ? `Your ${investments.length} active property ${
                      investments.length === 1 ? 'holding has' : 'holdings have'
                    } an estimated contractual monthly accrual of ${formatCurrency(
                      metrics.projectedMonthlyIncome
                    )}/mo. Realized bars appear automatically as monthly distributions settle on the 1st of each month.`
                  : 'Subscribe to an income-producing property SPV to begin accruing monthly EUR or Solana USDC rental distributions.'}
              </p>
            </div>
          ) : (
            <div className="h-60 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={distributionsTimeline} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.18} />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip
                    formatter={(value: any) => [formatCurrency(Number(value || 0)), 'Settled Distribution']}
                  />
                  <Bar dataKey="amount" fill="#087F5B" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* Row 2: Investment Allocation by Property + Property Performance Comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Chart 3: Investment Allocation by Property */}
        <div className="bg-white dark:bg-[#0D1522] border border-[#E4EEEA] dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-2xs space-y-3">
          <div className="flex items-center justify-between pb-3 border-b border-[#E4EEEA] dark:border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <PieChartIcon className="w-4 h-4 text-[#087F5B]" />
                <h3 className="text-sm sm:text-base font-bold text-[#172B2A] dark:text-white">
                  Investment Allocation by Property
                </h3>
              </div>
              <p className="text-xs text-[#71817D] dark:text-slate-400 mt-0.5">
                Proportional capital weight across notarized SPV holdings
              </p>
            </div>
          </div>

          {allocationByProperty.length === 0 ? (
            <div className="py-8 text-center text-xs text-[#71817D] dark:text-slate-400 bg-[#F6FAF8] dark:bg-slate-900/50 rounded-xl border border-dashed border-[#DCE8E3] dark:border-slate-800 p-4 space-y-2">
              <p className="font-semibold text-[#172B2A] dark:text-slate-200">No active property allocations</p>
              <p className="text-[11px]">
                Once you purchase fractional SPV units, your exact property weights and valuations appear here.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
              <div className="h-52 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={allocationByProperty}
                      cx="50%"
                      cy="50%"
                      innerRadius={48}
                      outerRadius={78}
                      paddingAngle={3}
                      dataKey="valuation"
                      nameKey="title"
                    >
                      {allocationByProperty.map((item) => (
                        <Cell key={item.propertyId} fill={item.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val: any) => [formatCurrency(Number(val || 0)), 'Holding Valuation']}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {allocationByProperty.map((item) => (
                  <button
                    key={item.propertyId}
                    type="button"
                    onClick={() => onSelectProperty(item.propertyId)}
                    className="w-full text-left p-2.5 rounded-xl border border-[#E4EEEA] dark:border-slate-800 bg-[#F6FAF8] dark:bg-slate-900/60 hover:border-[#087F5B] transition-colors cursor-pointer"
                  >
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="flex items-center gap-2 min-w-0 font-bold text-[#172B2A] dark:text-white truncate">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="truncate">{item.title}</span>
                      </span>
                      <span className="font-mono tabular-nums font-bold text-[#087F5B] shrink-0">
                        {item.weightPercent}%
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[10.5px] font-mono tabular-nums text-[#71817D] dark:text-slate-400 mt-1">
                      <span>{item.tokens} units</span>
                      <span>{formatCurrency(item.valuation)}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Chart 4: Property Performance Comparison */}
        <div className="bg-white dark:bg-[#0D1522] border border-[#E4EEEA] dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-2xs space-y-3">
          <div className="flex items-center justify-between pb-3 border-b border-[#E4EEEA] dark:border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-[#1D4ED8]" />
                <h3 className="text-sm sm:text-base font-bold text-[#172B2A] dark:text-white">
                  Property Performance Breakdown
                </h3>
              </div>
              <p className="text-xs text-[#71817D] dark:text-slate-400 mt-0.5">
                Subscribed cost basis vs. current valuation and realized dividends
              </p>
            </div>
          </div>

          {allocationByProperty.length === 0 ? (
            <div className="py-8 text-center text-xs text-[#71817D] dark:text-slate-400 bg-[#F6FAF8] dark:bg-slate-900/50 rounded-xl border border-dashed border-[#DCE8E3] dark:border-slate-800 p-4 space-y-2">
              <p className="font-semibold text-[#172B2A] dark:text-slate-200">No property performance records yet</p>
              <p className="text-[11px]">
                Asset-level cost basis, valuation, and dividend yield attribution are calculated from your active holdings.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="h-44 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={allocationByProperty}
                    margin={{ top: 8, right: 8, left: -12, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" opacity={0.18} />
                    <XAxis dataKey="shortTitle" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip
                      formatter={(val: any, key: any) => [
                        formatCurrency(Number(val || 0)),
                        key === 'invested'
                          ? 'Cost Basis'
                          : key === 'valuation'
                          ? 'Current Valuation'
                          : 'Realized Dividends',
                      ]}
                    />
                    <Bar dataKey="invested" fill="#64748B" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="valuation" fill="#087F5B" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-[#E4EEEA] dark:border-slate-800 text-[10px] uppercase tracking-wider text-[#71817D] dark:text-slate-400">
                      <th className="py-1.5 pr-2">Asset</th>
                      <th className="py-1.5 px-2 text-right">Cost Basis</th>
                      <th className="py-1.5 px-2 text-right">Dividends</th>
                      <th className="py-1.5 pl-2 text-right">Target APY</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E4EEEA] dark:divide-slate-800 font-mono tabular-nums">
                    {allocationByProperty.map((item) => (
                      <tr key={item.propertyId}>
                        <td className="py-2 pr-2 font-sans font-semibold text-[#172B2A] dark:text-slate-100 truncate max-w-[160px]">
                          {item.title}
                        </td>
                        <td className="py-2 px-2 text-right text-[#172B2A] dark:text-slate-200">
                          {formatCurrency(item.invested)}
                        </td>
                        <td className="py-2 px-2 text-right text-[#087F5B] dark:text-emerald-400">
                          +{formatCurrency(item.dividends)}
                        </td>
                        <td className="py-2 pl-2 text-right font-bold text-[#172B2A] dark:text-slate-100">
                          {formatPercent(item.apy)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Row 3: Investment Diversification (Geography & Property Class) */}
      <div className="bg-white dark:bg-[#0D1522] border border-[#E4EEEA] dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#E4EEEA] dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-[#087F5B]" />
              <h3 className="text-sm sm:text-base font-bold text-[#172B2A] dark:text-white">
                Investment Diversification Matrix
              </h3>
            </div>
            <p className="text-xs text-[#71817D] dark:text-slate-400 mt-0.5">
              Jurisdictional exposure and property typology across your active SPV holdings
            </p>
          </div>
          <span className="text-[11px] font-mono font-semibold px-2.5 py-1 rounded-lg bg-[#F6FAF8] dark:bg-slate-900 border border-[#E4EEEA] dark:border-slate-800 text-[#172B2A] dark:text-slate-200 self-start sm:self-auto">
            Profile: {diversification.concentrationLabel}
          </span>
        </div>

        {investments.length === 0 ? (
          <div className="py-6 text-center text-xs text-[#71817D] dark:text-slate-400">
            Diversification exposure across European markets and asset classes will populate automatically after your first SPV subscription.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Geographic Exposure */}
            <div className="space-y-2.5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#71817D] dark:text-slate-400 flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-[#087F5B]" /> Geographic Exposure
              </h4>
              {diversification.byRegion.map((reg) => (
                <div key={reg.name} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-[#172B2A] dark:text-slate-200">{reg.name}</span>
                    <span className="font-mono tabular-nums text-[#71817D] dark:text-slate-400">
                      {formatCurrency(reg.value)} ({reg.percent}%)
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      className="h-full bg-[#087F5B] rounded-full transition-transform duration-500 origin-left"
                      style={{ width: `${Math.min(100, reg.percent)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Asset Class Exposure */}
            <div className="space-y-2.5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#71817D] dark:text-slate-400 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-[#1D4ED8]" /> Asset Typology Exposure
              </h4>
              {diversification.byType.map((typ) => (
                <div key={typ.name} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-[#172B2A] dark:text-slate-200">{typ.name}</span>
                    <span className="font-mono tabular-nums text-[#71817D] dark:text-slate-400">
                      {formatCurrency(typ.value)} ({typ.percent}%)
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      className="h-full bg-[#1D4ED8] rounded-full transition-transform duration-500 origin-left"
                      style={{ width: `${Math.min(100, typ.percent)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Row 4: Monthly & Annual Financial Summaries + CSV Export */}
      <div className="bg-white dark:bg-[#0D1522] border border-[#E4EEEA] dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E4EEEA] dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-[#087F5B]" />
              <h3 className="text-sm sm:text-base font-bold text-[#172B2A] dark:text-white">
                Monthly &amp; Annual Financial Summaries
              </h3>
            </div>
            <p className="text-xs text-[#71817D] dark:text-slate-400 mt-0.5">
              Reconciled double-entry cashflow statement aggregated from your verified account ledger
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-lg bg-slate-100 dark:bg-slate-800 p-0.5 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setSummaryGranularity('monthly')}
                className={`px-3 py-1 rounded-md cursor-pointer transition-colors ${
                  summaryGranularity === 'monthly'
                    ? 'bg-white dark:bg-slate-700 text-[#172B2A] dark:text-white shadow-2xs font-bold'
                    : 'text-[#71817D] dark:text-slate-400'
                }`}
              >
                Monthly
              </button>
              <button
                type="button"
                onClick={() => setSummaryGranularity('annual')}
                className={`px-3 py-1 rounded-md cursor-pointer transition-colors ${
                  summaryGranularity === 'annual'
                    ? 'bg-white dark:bg-slate-700 text-[#172B2A] dark:text-white shadow-2xs font-bold'
                    : 'text-[#71817D] dark:text-slate-400'
                }`}
              >
                Annual
              </button>
            </div>

            {financialSummaries.length > 0 && (
              <button
                type="button"
                onClick={handleExportCsv}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E4EEEA] dark:border-slate-700 bg-[#F6FAF8] dark:bg-slate-900 hover:bg-[#EAF5F0] text-xs font-semibold text-[#172B2A] dark:text-slate-200 cursor-pointer transition-colors"
              >
                <Download className="w-3.5 h-3.5 text-[#087F5B]" />
                <span>Export CSV</span>
              </button>
            )}
          </div>
        </div>

        {financialSummaries.length === 0 ? (
          <div className="py-8 text-center text-xs text-[#71817D] dark:text-slate-400 space-y-2">
            <p className="font-semibold text-[#172B2A] dark:text-slate-200">
              No ledger transactions recorded yet for {summaryGranularity} reconciliation.
            </p>
            <p className="text-[11px]">
              All deposits, SPV subscriptions, monthly rental distributions, and withdrawals will be summarized here automatically.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#E4EEEA] dark:border-slate-800 text-[10px] uppercase tracking-wider text-[#71817D] dark:text-slate-400">
                  <th className="py-2 pr-3">Period</th>
                  <th className="py-2 px-3 text-right">Deposits</th>
                  <th className="py-2 px-3 text-right">SPV Subscriptions</th>
                  <th className="py-2 px-3 text-right">Rental Distributions</th>
                  <th className="py-2 px-3 text-right">Withdrawals &amp; Fees</th>
                  <th className="py-2 px-3 text-right">Net Cash Movement</th>
                  <th className="py-2 pl-3 text-right">Ledger Entries</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E4EEEA] dark:divide-slate-800 font-mono tabular-nums">
                {financialSummaries.map((row) => (
                  <tr key={row.periodKey} className="hover:bg-[#F6FAF8]/60 dark:hover:bg-slate-900/40">
                    <td className="py-2.5 pr-3 font-sans font-bold text-[#172B2A] dark:text-white">
                      {row.periodLabel}
                    </td>
                    <td className="py-2.5 px-3 text-right text-[#172B2A] dark:text-slate-200">
                      {formatCurrency(row.deposits)}
                    </td>
                    <td className="py-2.5 px-3 text-right text-[#1D4ED8] dark:text-blue-400">
                      {formatCurrency(row.investments)}
                    </td>
                    <td className="py-2.5 px-3 text-right text-[#087F5B] dark:text-emerald-400 font-semibold">
                      +{formatCurrency(row.distributions)}
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-600 dark:text-slate-400">
                      {formatCurrency(row.withdrawals + row.fees)}
                    </td>
                    <td
                      className={`py-2.5 px-3 text-right font-bold ${
                        row.netCashFlow >= 0
                          ? 'text-[#087F5B] dark:text-emerald-400'
                          : 'text-amber-700 dark:text-amber-400'
                      }`}
                    >
                      {row.netCashFlow >= 0 ? '+' : ''}
                      {formatCurrency(row.netCashFlow)}
                    </td>
                    <td className="py-2.5 pl-3 text-right text-[#71817D] dark:text-slate-400">
                      {row.txCount} {row.txCount === 1 ? 'tx' : 'txs'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {onOpenTransactions && transactions.length > 0 && (
          <div className="pt-2 border-t border-[#E4EEEA] dark:border-slate-800 flex justify-between items-center text-xs">
            <span className="text-[#71817D] dark:text-slate-400">
              Latest entry: {formatDate(transactions[0].createdAt)} ({transactions[0].reference})
            </span>
            <button
              type="button"
              onClick={onOpenTransactions}
              className="font-bold text-[#087F5B] hover:underline cursor-pointer inline-flex items-center gap-1"
            >
              <span>Inspect Full Audit Ledger ({transactions.length})</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
