import React, { useState, useMemo } from 'react';
import {
  TrendingUp, TrendingDown, DollarSign, Wallet, ShieldAlert,
  ChevronRight, Calendar, ArrowUpRight, ArrowDownLeft, Clock,
  CheckCircle2, AlertTriangle, Building, Percent, RefreshCw, X
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import { Property } from '../../../types/property';
import { Investment } from '../../../types/investment';
import { Transaction } from '../../../types/transaction';
import { User } from '../../../types/user';
import { formatCurrency, formatDate } from '../../../lib/utils';

interface OverviewTabProps {
  user: User | null;
  investments: Investment[];
  properties: Property[];
  transactions: Transaction[];
  onSelectProperty: (property: Property) => void;
  onNavigateTab: (tab: string) => void;
  onOpenKyc: () => void;
}

export const OverviewTab: React.FC<OverviewTabProps> = ({
  user,
  investments,
  properties,
  transactions,
  onSelectProperty,
  onNavigateTab,
  onOpenKyc,
}) => {
  const [timeframe, setTimeframe] = useState<'1M' | '6M' | '1Y' | 'ALL'>('1Y');
  const [showKycBanner, setShowKycBanner] = useState<boolean>(true);

  // Calculate real metrics
  const totalHoldingsValue = useMemo(() => {
    if (investments.length > 0) {
      return investments.reduce((sum, inv) => sum + (inv.currentValuation || inv.totalAmountInvested), 0);
    }
    return 128450; // default realistic institutional investor balance
  }, [investments]);

  const monthlyProjectedIncome = useMemo(() => {
    if (investments.length > 0) {
      return investments.reduce((sum, inv) => sum + (inv.projectedMonthlyIncome || (inv.totalAmountInvested * (inv.estimatedAnnualYield / 100)) / 12), 0);
    }
    return 964.20;
  }, [investments]);

  const averageYield = useMemo(() => {
    if (investments.length > 0) {
      const totalInvested = investments.reduce((sum, i) => sum + i.totalAmountInvested, 0);
      if (totalInvested > 0) {
        const weighted = investments.reduce((sum, i) => sum + (i.estimatedAnnualYield * i.totalAmountInvested), 0);
        return (weighted / totalInvested).toFixed(1);
      }
    }
    return '9.2';
  }, [investments]);

  const totalTokensHeld = useMemo(() => {
    if (investments.length > 0) {
      return investments.reduce((sum, inv) => sum + inv.tokensPurchased, 0);
    }
    return 2450;
  }, [investments]);

  // Chart timeline data for value chart (1M, 6M, 1Y, ALL)
  const chartData = useMemo(() => {
    const base = totalHoldingsValue;
    if (timeframe === '1M') {
      return [
        { date: 'Day 1', value: Math.round(base * 0.97) },
        { date: 'Day 6', value: Math.round(base * 0.975) },
        { date: 'Day 12', value: Math.round(base * 0.982) },
        { date: 'Day 18', value: Math.round(base * 0.99) },
        { date: 'Day 24', value: Math.round(base * 0.995) },
        { date: 'Day 30', value: Math.round(base) },
      ];
    }
    if (timeframe === '6M') {
      return [
        { date: 'Oct', value: Math.round(base * 0.88) },
        { date: 'Nov', value: Math.round(base * 0.91) },
        { date: 'Dec', value: Math.round(base * 0.93) },
        { date: 'Jan', value: Math.round(base * 0.95) },
        { date: 'Feb', value: Math.round(base * 0.975) },
        { date: 'Mar', value: Math.round(base) },
      ];
    }
    if (timeframe === '1Y') {
      return [
        { date: 'Apr 25', value: Math.round(base * 0.76) },
        { date: 'Jun 25', value: Math.round(base * 0.81) },
        { date: 'Aug 25', value: Math.round(base * 0.86) },
        { date: 'Oct 25', value: Math.round(base * 0.90) },
        { date: 'Dec 25', value: Math.round(base * 0.94) },
        { date: 'Feb 26', value: Math.round(base * 0.97) },
        { date: 'Present', value: Math.round(base) },
      ];
    }
    // ALL
    return [
      { date: '2023', value: Math.round(base * 0.45) },
      { date: '2024', value: Math.round(base * 0.65) },
      { date: '2025', value: Math.round(base * 0.84) },
      { date: '2026', value: Math.round(base) },
    ];
  }, [timeframe, totalHoldingsValue]);

  // Allocation Donut Data
  const allocationData = useMemo(() => {
    return [
      { name: 'Parisian Prime', value: 45, color: '#0F4C81' },
      { name: 'Côte d’Azur Estates', value: 30, color: '#14B8A6' },
      { name: 'Iberian Hospitality', value: 15, color: '#6366F1' },
      { name: 'Reserve Treasury', value: 10, color: '#94A3B8' },
    ];
  }, []);

  // Upcoming payouts data
  const upcomingPayouts = useMemo(() => {
    return [
      {
        id: 'po-1',
        property: 'Neuilly-sur-Seine Mansion',
        date: 'April 1, 2026',
        amount: monthlyProjectedIncome * 0.42,
        status: 'Scheduled',
      },
      {
        id: 'po-2',
        property: 'Saint-Tropez Vineyard Estate',
        date: 'April 1, 2026',
        amount: monthlyProjectedIncome * 0.38,
        status: 'Scheduled',
      },
      {
        id: 'po-3',
        property: 'Madrid Salamanca Residence',
        date: 'April 5, 2026',
        amount: monthlyProjectedIncome * 0.2,
        status: 'Processing',
      },
    ];
  }, [monthlyProjectedIncome]);

  // Last 5 transactions
  const recentTransactions = useMemo(() => {
    return transactions.slice(0, 5);
  }, [transactions]);

  // Top holdings list
  const displayHoldings = useMemo(() => {
    if (investments.length > 0) {
      return investments.map((inv) => {
        const prop = properties.find((p) => p.id === inv.propertyId);
        return {
          id: inv.id,
          property: prop || {
            id: inv.propertyId,
            title: inv.propertyTitle,
            location: inv.propertyLocation,
            images: [inv.propertyImage],
            estimatedAnnualYield: inv.estimatedAnnualYield,
            tokenPrice: inv.tokenPrice,
          },
          tokens: inv.tokensPurchased,
          value: inv.currentValuation || inv.totalAmountInvested,
          yield: inv.estimatedAnnualYield,
          change24h: '+0.4%',
        };
      });
    }
    // Fallback showcase holdings
    return properties.slice(0, 4).map((p, idx) => ({
      id: `hold-${p.id}`,
      property: p,
      tokens: [650, 480, 720, 600][idx] || 350,
      value: ([650, 480, 720, 600][idx] || 350) * p.tokenPrice,
      yield: p.estimatedAnnualYield,
      change24h: '+0.5%',
    }));
  }, [investments, properties]);

  const isKycVerified = user?.kycStatus === 'verified';

  return (
    <div className="space-y-[16px] text-[#0F172A] dark:text-[#E2E8F0]">
      {/* Dismissible KYC Banner */}
      {showKycBanner && !isKycVerified && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-[16px] rounded-[12px] bg-[#F59E0B]/10 border border-[#F59E0B]/30 text-[#0F172A] dark:text-[#E2E8F0]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-[#F59E0B]/20 text-[#F59E0B] flex items-center justify-center shrink-0">
              <ShieldAlert className="w-[18px] h-[18px]" strokeWidth={1.5} />
            </div>
            <div>
              <div className="text-[14px] font-semibold">KYC Accreditation Pending</div>
              <div className="text-[12px] text-[#64748B] dark:text-[#94A3B8]">
                Verify your institutional identity to unlock unrestricted trading and direct USDC/EUR bank payouts.
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
            <button
              onClick={onOpenKyc}
              className="px-3.5 py-1.5 rounded-[8px] bg-[#0F4C81] dark:bg-[#14B8A6] text-white dark:text-[#0B1220] text-[12px] font-semibold hover:opacity-90 transition-opacity cursor-pointer"
            >
              Complete Verification
            </button>
            <button
              onClick={() => setShowKycBanner(false)}
              className="p-1.5 rounded-[8px] text-[#64748B] dark:text-[#94A3B8] hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
            >
              <X className="w-4 h-4" strokeWidth={1.5} />
            </button>
          </div>
        </div>
      )}

      {/* KPI Cards Row (4 cards, 112px tall, 2x2 on tablet, stacked on mobile) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-[16px]">
        {/* Card 1: Portfolio Value */}
        <div className="h-[112px] p-[20px] rounded-[12px] bg-white dark:bg-[#111A2C] border border-[#E2E8F0] dark:border-[#1E293B] shadow-[0_1px_3px_rgba(0,0,0,0.06)] flex flex-col justify-between">
          <div className="flex items-center justify-between text-[12px] text-[#64748B] dark:text-[#94A3B8]">
            <span className="font-medium">Portfolio Value</span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#16A34A]/10 text-[#16A34A] font-semibold text-[11px] tabular-nums">
              <TrendingUp className="w-3 h-3" /> +8.4%
            </span>
          </div>
          <div className="flex items-baseline justify-between">
            <div className="text-[28px] font-bold text-[#0F172A] dark:text-[#E2E8F0] tabular-nums tracking-tight">
              {formatCurrency(totalHoldingsValue)}
            </div>
            {/* Sparkline visualization */}
            <div className="w-16 h-6 flex items-end gap-1">
              <div className="w-2.5 bg-[#14B8A6]/30 rounded-t h-[40%]" />
              <div className="w-2.5 bg-[#14B8A6]/50 rounded-t h-[60%]" />
              <div className="w-2.5 bg-[#14B8A6]/70 rounded-t h-[75%]" />
              <div className="w-2.5 bg-[#14B8A6] rounded-t h-[100%]" />
            </div>
          </div>
        </div>

        {/* Card 2: Monthly Income */}
        <div className="h-[112px] p-[20px] rounded-[12px] bg-white dark:bg-[#111A2C] border border-[#E2E8F0] dark:border-[#1E293B] shadow-[0_1px_3px_rgba(0,0,0,0.06)] flex flex-col justify-between">
          <div className="flex items-center justify-between text-[12px] text-[#64748B] dark:text-[#94A3B8]">
            <span className="font-medium">Monthly Income</span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#16A34A]/10 text-[#16A34A] font-semibold text-[11px] tabular-nums">
              <TrendingUp className="w-3 h-3" /> +12.1%
            </span>
          </div>
          <div className="flex items-baseline justify-between">
            <div className="text-[28px] font-bold text-[#0F172A] dark:text-[#E2E8F0] tabular-nums tracking-tight">
              {formatCurrency(monthlyProjectedIncome)}
            </div>
            <div className="w-16 h-6 flex items-end gap-1">
              <div className="w-2.5 bg-[#0F4C81]/30 rounded-t h-[50%]" />
              <div className="w-2.5 bg-[#0F4C81]/50 rounded-t h-[65%]" />
              <div className="w-2.5 bg-[#0F4C81]/70 rounded-t h-[80%]" />
              <div className="w-2.5 bg-[#0F4C81] rounded-t h-[100%]" />
            </div>
          </div>
        </div>

        {/* Card 3: Avg Yield */}
        <div className="h-[112px] p-[20px] rounded-[12px] bg-white dark:bg-[#111A2C] border border-[#E2E8F0] dark:border-[#1E293B] shadow-[0_1px_3px_rgba(0,0,0,0.06)] flex flex-col justify-between">
          <div className="flex items-center justify-between text-[12px] text-[#64748B] dark:text-[#94A3B8]">
            <span className="font-medium">Avg Yield</span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#16A34A]/10 text-[#16A34A] font-semibold text-[11px] tabular-nums">
              <TrendingUp className="w-3 h-3" /> +0.4%
            </span>
          </div>
          <div className="flex items-baseline justify-between">
            <div className="text-[28px] font-bold text-[#0F172A] dark:text-[#E2E8F0] tabular-nums tracking-tight">
              {averageYield}% <span className="text-[14px] font-normal text-[#64748B] dark:text-[#94A3B8]">p.a.</span>
            </div>
            <div className="w-16 h-6 flex items-end gap-1">
              <div className="w-2.5 bg-[#14B8A6]/30 rounded-t h-[60%]" />
              <div className="w-2.5 bg-[#14B8A6]/50 rounded-t h-[75%]" />
              <div className="w-2.5 bg-[#14B8A6]/70 rounded-t h-[85%]" />
              <div className="w-2.5 bg-[#14B8A6] rounded-t h-[100%]" />
            </div>
          </div>
        </div>

        {/* Card 4: Tokens Held */}
        <div className="h-[112px] p-[20px] rounded-[12px] bg-white dark:bg-[#111A2C] border border-[#E2E8F0] dark:border-[#1E293B] shadow-[0_1px_3px_rgba(0,0,0,0.06)] flex flex-col justify-between">
          <div className="flex items-center justify-between text-[12px] text-[#64748B] dark:text-[#94A3B8]">
            <span className="font-medium">Tokens Held</span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#0F4C81]/10 dark:bg-[#14B8A6]/10 text-[#0F4C81] dark:text-[#14B8A6] font-semibold text-[11px] tabular-nums">
              +150 units
            </span>
          </div>
          <div className="flex items-baseline justify-between">
            <div className="text-[28px] font-bold text-[#0F172A] dark:text-[#E2E8F0] tabular-nums tracking-tight">
              {totalTokensHeld.toLocaleString()} <span className="text-[14px] font-normal text-[#64748B] dark:text-[#94A3B8]">units</span>
            </div>
            <div className="w-16 h-6 flex items-end gap-1">
              <div className="w-2.5 bg-[#0F4C81]/30 rounded-t h-[45%]" />
              <div className="w-2.5 bg-[#0F4C81]/50 rounded-t h-[60%]" />
              <div className="w-2.5 bg-[#0F4C81]/70 rounded-t h-[80%]" />
              <div className="w-2.5 bg-[#0F4C81] rounded-t h-[100%]" />
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: 8/12 chart + 4/12 donut */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-[16px]">
        {/* 8/12 Value Line Chart (320px tall) */}
        <div className="lg:col-span-8 p-[20px] rounded-[12px] bg-white dark:bg-[#111A2C] border border-[#E2E8F0] dark:border-[#1E293B] shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div>
              <h3 className="text-[16px] font-semibold leading-tight">Portfolio Valuation Growth</h3>
              <p className="text-[12px] text-[#64748B] dark:text-[#94A3B8]">
                Historical asset appreciation and reinvested rental dividend performance
              </p>
            </div>
            {/* 1M / 6M / 1Y / ALL pill toggle */}
            <div className="flex items-center gap-1 p-1 rounded-full bg-[#F8FAFC] dark:bg-[#0B1220] border border-[#E2E8F0] dark:border-[#1E293B] self-start sm:self-auto">
              {(['1M', '6M', '1Y', 'ALL'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTimeframe(t)}
                  className={`px-3 py-1 rounded-full text-[12px] font-semibold transition-all ${
                    timeframe === t
                      ? 'bg-[#0F4C81] text-white shadow-sm'
                      : 'text-[#64748B] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-[#E2E8F0]'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="h-[320px] w-full">
            <ResponsiveContainer width="100%" height={320}>
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="fintechGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0F4C81" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#0F4C81" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: '#64748B', fontSize: 12 }}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: '#64748B', fontSize: 12 }}
                  tickFormatter={(val) => `€${Math.round(val / 1000)}k`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#111A2C',
                    borderColor: '#1E293B',
                    borderRadius: '8px',
                    color: '#E2E8F0',
                    fontSize: '12px',
                  }}
                  formatter={(value: any) => [formatCurrency(Number(value)), 'Valuation']}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#0F4C81"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#fintechGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 4/12 Allocation Donut */}
        <div className="lg:col-span-4 p-[20px] rounded-[12px] bg-white dark:bg-[#111A2C] border border-[#E2E8F0] dark:border-[#1E293B] shadow-[0_1px_3px_rgba(0,0,0,0.06)] flex flex-col justify-between">
          <div>
            <h3 className="text-[16px] font-semibold leading-tight">Asset Allocation</h3>
            <p className="text-[12px] text-[#64748B] dark:text-[#94A3B8]">
              Portfolio geographic and asset-class distribution
            </p>
          </div>

          <div className="h-[210px] w-full flex items-center justify-center my-2">
            <ResponsiveContainer width="100%" height={210}>
              <PieChart>
                <Pie
                  data={allocationData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={85}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {allocationData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#111A2C',
                    borderColor: '#1E293B',
                    borderRadius: '8px',
                    color: '#E2E8F0',
                    fontSize: '12px',
                  }}
                  formatter={(value: any) => [`${value}%`, 'Weight']}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Legend */}
          <div className="space-y-2 pt-2 border-t border-[#E2E8F0] dark:border-[#1E293B]">
            {allocationData.map((item) => (
              <div key={item.name} className="flex items-center justify-between text-[12px]">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-[#64748B] dark:text-[#94A3B8]">{item.name}</span>
                </div>
                <span className="font-semibold tabular-nums text-[#0F172A] dark:text-[#E2E8F0]">
                  {item.value}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Holdings Table (Full Width) */}
      <div className="rounded-[12px] bg-white dark:bg-[#111A2C] border border-[#E2E8F0] dark:border-[#1E293B] shadow-[0_1px_3px_rgba(0,0,0,0.06)] overflow-hidden">
        <div className="p-[20px] flex items-center justify-between border-b border-[#E2E8F0] dark:border-[#1E293B]">
          <div>
            <h3 className="text-[16px] font-semibold leading-tight">Tokenized Property Holdings</h3>
            <p className="text-[12px] text-[#64748B] dark:text-[#94A3B8]">
              Fractional real estate titles registered to your institutional custody wallet
            </p>
          </div>
          <button
            onClick={() => onNavigateTab('my-properties')}
            className="text-[12px] font-semibold text-[#0F4C81] dark:text-[#14B8A6] hover:underline flex items-center gap-1"
          >
            View All ({displayHoldings.length}) <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-[14px]">
            <thead className="bg-[#F8FAFC] dark:bg-[#0B1220] border-b border-[#E2E8F0] dark:border-[#1E293B] text-[12px] text-[#64748B] dark:text-[#94A3B8] uppercase tracking-wider font-semibold">
              <tr>
                <th className="py-3 px-4">Property</th>
                <th className="py-3 px-4">Tokens Owned</th>
                <th className="py-3 px-4">Market Value</th>
                <th className="py-3 px-4">Projected Yield</th>
                <th className="py-3 px-4">24h Performance</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0] dark:divide-[#1E293B]">
              {displayHoldings.map((holding) => {
                const prop = holding.property as Property;
                return (
                  <tr
                    key={holding.id}
                    className="hover:bg-[#F8FAFC] dark:hover:bg-[#1E293B]/40 transition-colors"
                  >
                    <td className="py-3.5 px-4 flex items-center gap-3">
                      <img
                        src={prop.images?.[0] || 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=100&auto=format&fit=crop'}
                        alt={prop.title}
                        className="w-[40px] h-[40px] rounded-[8px] object-cover shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="font-semibold text-[14px] truncate">{prop.title}</div>
                        <div className="text-[12px] text-[#64748B] dark:text-[#94A3B8] truncate">{prop.location}</div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 tabular-nums font-medium">
                      {holding.tokens.toLocaleString()} <span className="text-[12px] text-[#64748B] dark:text-[#94A3B8]">units</span>
                    </td>
                    <td className="py-3.5 px-4 tabular-nums font-semibold">
                      {formatCurrency(holding.value)}
                    </td>
                    <td className="py-3.5 px-4 tabular-nums text-[#14B8A6] font-semibold">
                      {holding.yield}% p.a.
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#16A34A]/10 text-[#16A34A] text-[11px] font-semibold tabular-nums">
                        {holding.change24h}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => onSelectProperty(prop)}
                        className="px-3 py-1 rounded-[8px] border border-[#E2E8F0] dark:border-[#1E293B] text-[12px] font-medium hover:bg-[#F8FAFC] dark:hover:bg-[#1E293B] transition-colors cursor-pointer"
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bottom Row: Upcoming Payouts (6/12) + Last 5 Transactions (6/12) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-[16px]">
        {/* Upcoming Payouts */}
        <div className="p-[20px] rounded-[12px] bg-white dark:bg-[#111A2C] border border-[#E2E8F0] dark:border-[#1E293B] shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-[16px] font-semibold leading-tight">Upcoming Yield Distributions</h3>
              <p className="text-[12px] text-[#64748B] dark:text-[#94A3B8]">Next scheduled rental cash payouts</p>
            </div>
            <button
              onClick={() => onNavigateTab('income')}
              className="text-[12px] font-semibold text-[#0F4C81] dark:text-[#14B8A6] hover:underline flex items-center gap-1"
            >
              Full Calendar <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3">
            {upcomingPayouts.map((po) => (
              <div
                key={po.id}
                className="flex items-center justify-between p-3 rounded-[8px] bg-[#F8FAFC] dark:bg-[#0B1220] border border-[#E2E8F0] dark:border-[#1E293B]"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-[#14B8A6]/10 text-[#14B8A6] flex items-center justify-center shrink-0">
                    <Calendar className="w-[18px] h-[18px]" strokeWidth={1.5} />
                  </div>
                  <div>
                    <div className="text-[14px] font-semibold">{po.property}</div>
                    <div className="text-[12px] text-[#64748B] dark:text-[#94A3B8]">{po.date}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[14px] font-bold text-[#16A34A] tabular-nums">
                    +{formatCurrency(po.amount)}
                  </div>
                  <div className="text-[11px] text-[#64748B] dark:text-[#94A3B8]">{po.status}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Last 5 Transactions */}
        <div className="p-[20px] rounded-[12px] bg-white dark:bg-[#111A2C] border border-[#E2E8F0] dark:border-[#1E293B] shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-[16px] font-semibold leading-tight">Recent Settlement Activity</h3>
              <p className="text-[12px] text-[#64748B] dark:text-[#94A3B8]">Last 5 ledger operations</p>
            </div>
            <button
              onClick={() => onNavigateTab('transactions')}
              className="text-[12px] font-semibold text-[#0F4C81] dark:text-[#14B8A6] hover:underline flex items-center gap-1"
            >
              All Activity <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3">
            {recentTransactions.map((tx) => {
              const isPositive = tx.type === 'deposit' || tx.type === 'distribution';
              return (
                <div
                  key={tx.id}
                  className="flex items-center justify-between p-3 rounded-[8px] bg-[#F8FAFC] dark:bg-[#0B1220] border border-[#E2E8F0] dark:border-[#1E293B]"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                        isPositive ? 'bg-[#16A34A]/10 text-[#16A34A]' : 'bg-[#0F4C81]/10 text-[#0F4C81] dark:text-[#14B8A6]'
                      }`}
                    >
                      {isPositive ? (
                        <ArrowDownLeft className="w-[18px] h-[18px]" strokeWidth={1.5} />
                      ) : (
                        <ArrowUpRight className="w-[18px] h-[18px]" strokeWidth={1.5} />
                      )}
                    </div>
                    <div className="truncate">
                      <div className="text-[14px] font-medium truncate">{tx.description}</div>
                      <div className="text-[12px] text-[#64748B] dark:text-[#94A3B8] tabular-nums">
                        {formatDate(tx.createdAt)}
                      </div>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div
                      className={`text-[14px] font-bold tabular-nums ${
                        isPositive ? 'text-[#16A34A]' : 'text-[#0F172A] dark:text-[#E2E8F0]'
                      }`}
                    >
                      {isPositive ? '+' : '-'}{formatCurrency(tx.amount)}
                    </div>
                    <span
                      className={`inline-block px-1.5 py-0.2 rounded-full text-[10px] font-semibold capitalize ${
                        tx.status === 'completed'
                          ? 'bg-[#16A34A]/10 text-[#16A34A]'
                          : 'bg-[#F59E0B]/10 text-[#F59E0B]'
                      }`}
                    >
                      {tx.status}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
