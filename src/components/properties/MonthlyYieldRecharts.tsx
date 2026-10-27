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
    <div className="bg-[#102442] border border-[#1D3860] rounded-3xl p-6 shadow-xl space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#1D3860] pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-[#BEE179] uppercase tracking-wider mb-1">
            <Sparkles className="w-4 h-4 text-[#BEE179]" />
            <span>Recharts Financial Engine · 12-Month Monthly Rental Yield</span>
          </div>
          <h3 className="text-xl sm:text-2xl font-black text-white">
            12-Month Projected Rental Yield Growth
          </h3>
          <p className="text-xs sm:text-sm text-[#D1E2F7] mt-1">
            Visualizing monthly SPV cash dividend distributions and yield growth for <span className="font-bold text-white">{property.title}</span> based on {formatCurrency(investmentAmountEUR)} simulated position.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-[#0B1B30] px-3.5 py-2 rounded-2xl border border-[#1D3860]">
          <TrendingUp className="w-4 h-4 text-[#BEE179]" />
          <span className="text-xs text-[#8EA7C7]">Target Annualized:</span>
          <span className="text-sm font-black text-[#BEE179]">{formatPercent(annualBaseYield)} / yr</span>
        </div>
      </div>

      {/* Highlights Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-[#0B1B30] p-3.5 rounded-2xl border border-[#1D3860]">
          <span className="text-[10px] font-bold text-[#8EA7C7] uppercase block">Avg. Monthly Yield</span>
          <div className="text-base sm:text-lg font-black text-[#BEE179] mt-0.5">
            {formatPercent(monthlyBaseYield)} / mo
          </div>
          <span className="text-[10px] text-[#D1E2F7] block">~{formatCurrency(avgMonthlyYield)} / mo</span>
        </div>

        <div className="bg-[#0B1B30] p-3.5 rounded-2xl border border-[#1D3860]">
          <span className="text-[10px] font-bold text-[#8EA7C7] uppercase block">12-Mo Total Cash Payout</span>
          <div className="text-base sm:text-lg font-black text-white mt-0.5">
            {formatCurrency(total12MonthDividends)}
          </div>
          <span className="text-[10px] text-[#BEE179] font-bold block">100% Automated SPV Transfer</span>
        </div>

        <div className="bg-[#0B1B30] p-3.5 rounded-2xl border border-[#1D3860]">
          <span className="text-[10px] font-bold text-[#8EA7C7] uppercase block">Peak Month Yield</span>
          <div className="text-base sm:text-lg font-black text-emerald-300 mt-0.5">
            {formatPercent(month12.annualizedRate)} p.a.
          </div>
          <span className="text-[10px] text-[#D1E2F7] block">{formatCurrency(month12.monthlyYieldEUR)} in {month12.month}</span>
        </div>

        <div className="bg-[#1A3860] p-3.5 rounded-2xl border border-[#2B4E80]">
          <span className="text-[10px] font-bold text-[#BEE179] uppercase block">Payout Safeguard</span>
          <div className="text-xs font-extrabold text-white mt-1 flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-[#BEE179]" />
            <span>RICS Ring-Fenced</span>
          </div>
          <span className="text-[10px] text-[#D1E2F7] block mt-0.5">Escrow Bank Distribution</span>
        </div>
      </div>

      {/* Recharts Line Chart Container */}
      <div className="bg-[#0B1B30] p-4 sm:p-6 rounded-2xl border border-[#1D3860] space-y-2">
        <div className="flex items-center justify-between text-xs mb-2">
          <span className="font-bold text-[#BEE179]">Monthly Rental Yield Rate (%) & Payout Progression</span>
          <span className="text-[#8EA7C7]">12 Months Projection</span>
        </div>

        <div className="w-full h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={{ top: 15, right: 20, left: 0, bottom: 10 }}
            >
              <CartesianGrid stroke="#1D3860" strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="shortMonth"
                stroke="#8EA7C7"
                fontSize={11}
                tickLine={false}
                axisLine={{ stroke: '#1D3860' }}
              />
              <YAxis
                stroke="#8EA7C7"
                fontSize={11}
                tickLine={false}
                axisLine={{ stroke: '#1D3860' }}
                tickFormatter={(val) => `${val}%`}
                domain={['auto', 'auto']}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-[#102442] border border-[#BEE179] p-3.5 rounded-2xl shadow-2xl text-xs space-y-1.5 text-white">
                        <div className="font-extrabold text-[#BEE179] uppercase tracking-wider flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5" />
                          <span>{data.month} Projection</span>
                        </div>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 pt-1 text-[11px]">
                          <span className="text-[#8EA7C7]">Monthly Rate:</span>
                          <span className="font-bold text-[#BEE179]">{data.yieldRate}%</span>

                          <span className="text-[#8EA7C7]">Annualized:</span>
                          <span className="font-bold text-white">{data.annualizedRate}%</span>

                          <span className="text-[#8EA7C7]">Monthly Cash:</span>
                          <span className="font-bold text-emerald-300">+{formatCurrency(data.monthlyYieldEUR)}</span>

                          <span className="text-[#8EA7C7]">Cumulative Payout:</span>
                          <span className="font-black text-[#BEE179]">{formatCurrency(data.cumulativeYieldEUR)}</span>
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
                stroke="#BEE179"
                strokeWidth={3}
                dot={{ r: 5, fill: '#0B1B30', stroke: '#BEE179', strokeWidth: 2 }}
                activeDot={{ r: 8, fill: '#BEE179', stroke: '#FFFFFF', strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="text-[11px] text-[#8EA7C7] flex items-center justify-between border-t border-[#1D3860] pt-3">
        <span>Powered by Recharts engine · Automated SPV monthly payouts on 1st of every calendar month.</span>
        <span className="font-bold text-[#BEE179]">{property.title}</span>
      </div>
    </div>
  );
};
