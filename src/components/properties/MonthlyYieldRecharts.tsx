import React, { useMemo } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { Property } from '../../types/property';
import { formatCurrency, formatPercent } from '../../lib/utils';
import { TrendingUp, Sparkles, DollarSign, Calendar, ShieldCheck, Layers } from 'lucide-react';

interface MonthlyYieldRechartsProps {
  property: Property;
  investmentAmountEUR?: number;
}

export const MonthlyYieldRecharts: React.FC<MonthlyYieldRechartsProps> = ({
  property,
  investmentAmountEUR = 10000,
}) => {
  const annualBaseYield = property.estimatedAnnualYield || 7.2;
  const monthlyBaseYield = annualBaseYield / 12; // e.g. 0.6% / month

  // Generate 12-month projected monthly rental yield data
  const chartData = useMemo(() => {
    let accumulatedPayout = 0;
    const months = [
      'Month 1',
      'Month 2',
      'Month 3',
      'Month 4',
      'Month 5',
      'Month 6',
      'Month 7',
      'Month 8',
      'Month 9',
      'Month 10',
      'Month 11',
      'Month 12',
    ];

    return months.map((monthLabel, idx) => {
      // Seasonal occupancy and compounding rental rate factor (slight organic growth)
      const seasonalFactor = 1 + Math.sin((idx / 11) * Math.PI) * 0.08 + idx * 0.005;
      const currentMonthlyYieldPercent = Number((monthlyBaseYield * seasonalFactor).toFixed(3));
      const annualizedRate = Number((currentMonthlyYieldPercent * 12).toFixed(2));
      
      const monthlyPayout = Number(((investmentAmountEUR * currentMonthlyYieldPercent) / 100).toFixed(2));
      accumulatedPayout += monthlyPayout;

      return {
        month: monthLabel,
        shortMonth: `M${idx + 1}`,
        yieldRate: currentMonthlyYieldPercent,
        annualizedRate,
        monthlyYieldEUR: monthlyPayout,
        cumulativeYieldEUR: Number(accumulatedPayout.toFixed(2)),
      };
    });
  }, [property, monthlyBaseYield, investmentAmountEUR]);

  const month12 = chartData[11];
  const total12MonthDividends = month12.cumulativeYieldEUR;
  const avgMonthlyYield = total12MonthDividends / 12;

  return (
    <div className="bg-[#F6FAF8] border border-[#E4EEEA] rounded-3xl p-6 shadow-sm space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#E4EEEA] pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-[#087F5B] uppercase tracking-wider mb-1">
            <TrendingUp className="w-4 h-4 text-[#087F5B]" />
            <span>Yield Schedule · 12-Month Projected Distribution</span>
          </div>
          <h3 className="text-xl sm:text-2xl font-bold text-[#172B2A]">
            12-Month Projected Rental Yield Growth
          </h3>
          <p className="text-xs sm:text-sm text-[#71817D] mt-1 font-medium">
            Visualizing monthly SPV cash dividend distributions and yield growth for <span className="font-bold text-[#172B2A]">{property.title}</span> based on {formatCurrency(investmentAmountEUR)} simulated position.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-2xl border border-[#E4EEEA] shadow-2xs">
          <TrendingUp className="w-4 h-4 text-[#087F5B]" />
          <span className="text-xs text-[#71817D] font-medium">Target Annualized:</span>
          <span className="text-sm font-bold text-[#087F5B] font-mono">{formatPercent(annualBaseYield)} / yr</span>
        </div>
      </div>

      {/* Highlights Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-[#E4EEEA] shadow-xs">
          <span className="text-[10px] font-bold text-[#71817D] uppercase block">Avg. Monthly Yield</span>
          <div className="text-base sm:text-lg font-bold text-[#087F5B] font-mono mt-0.5">
            {formatPercent(monthlyBaseYield)} / mo
          </div>
          <span className="text-[10px] text-[#71817D] block">~{formatCurrency(avgMonthlyYield)} / mo</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-[#E4EEEA] shadow-xs">
          <span className="text-[10px] font-bold text-[#71817D] uppercase block">12-Mo Total Cash Payout</span>
          <div className="text-base sm:text-lg font-bold text-[#172B2A] font-mono mt-0.5">
            {formatCurrency(total12MonthDividends)}
          </div>
          <span className="text-[10px] text-[#087F5B] font-bold block">100% Automated SPV Transfer</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-[#E4EEEA] shadow-xs">
          <span className="text-[10px] font-bold text-[#71817D] uppercase block">Peak Month Yield</span>
          <div className="text-base sm:text-lg font-bold text-[#075B46] font-mono mt-0.5">
            {formatPercent(month12.annualizedRate)} p.a.
          </div>
          <span className="text-[10px] text-[#71817D] block">{formatCurrency(month12.monthlyYieldEUR)} in {month12.month}</span>
        </div>

        <div className="bg-gradient-to-br from-[#075B46] to-[#087F5B] p-4 rounded-2xl border border-[#087F5B]/30 text-white shadow-xs">
          <span className="text-[10px] font-bold text-[#DDF5EC] uppercase block">Payout Safeguard</span>
          <div className="text-xs font-bold text-white mt-1 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-[#DDF5EC]" />
            <span>RICS Ring-Fenced</span>
          </div>
          <span className="text-[10px] text-[#DDF5EC]/85 block mt-0.5 font-medium">Escrow Bank Distribution</span>
        </div>
      </div>

      {/* Recharts Line Chart Container */}
      <div className="bg-white p-4 sm:p-6 rounded-2xl border border-[#E4EEEA] space-y-2 shadow-xs">
        <div className="flex items-center justify-between text-xs mb-2">
          <span className="font-bold text-[#087F5B]">Monthly Rental Yield Rate (%) & Payout Progression</span>
          <span className="text-[#71817D]">12 Months Projection</span>
        </div>

        <div className="w-full h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={{ top: 15, right: 20, left: 0, bottom: 10 }}
            >
              <CartesianGrid stroke="#E4EEEA" strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="shortMonth"
                stroke="#71817D"
                fontSize={11}
                tickLine={false}
                axisLine={{ stroke: '#E4EEEA' }}
              />
              <YAxis
                stroke="#71817D"
                fontSize={11}
                tickLine={false}
                axisLine={{ stroke: '#E4EEEA' }}
                tickFormatter={(val) => `${val}%`}
                domain={['auto', 'auto']}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-white border border-[#E4EEEA] p-3.5 rounded-2xl shadow-xl text-xs space-y-1.5 text-[#172B2A]">
                        <div className="font-bold text-[#087F5B] uppercase tracking-wider flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-[#087F5B]" />
                          <span>{data.month} Projection</span>
                        </div>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 pt-1 text-[11px]">
                          <span className="text-[#71817D]">Monthly Rate:</span>
                          <span className="font-bold text-[#087F5B]">{data.yieldRate}%</span>

                          <span className="text-[#71817D]">Annualized:</span>
                          <span className="font-bold text-[#172B2A]">{data.annualizedRate}%</span>

                          <span className="text-[#71817D]">Monthly Cash:</span>
                          <span className="font-bold text-[#087F5B]">+{formatCurrency(data.monthlyYieldEUR)}</span>

                          <span className="text-[#71817D]">Cumulative Payout:</span>
                          <span className="font-bold text-[#075B46]">{formatCurrency(data.cumulativeYieldEUR)}</span>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Line
                type="monotone"
                dataKey="yieldRate"
                name="Monthly Yield Rate (%)"
                stroke="#087F5B"
                strokeWidth={3}
                dot={{ r: 5, fill: '#FFFFFF', stroke: '#087F5B', strokeWidth: 2 }}
                activeDot={{ r: 7, fill: '#087F5B', stroke: '#FFFFFF', strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="text-[11px] text-[#71817D] flex items-center justify-between border-t border-[#E4EEEA] pt-3">
        <span>Powered by Recharts engine · Automated SPV monthly payouts on 1st of every calendar month.</span>
        <span className="font-bold text-[#087F5B]">{property.title}</span>
      </div>
    </div>
  );
};
