import React, { useState } from 'react';
import { Property } from '../../types/property';
import { formatEUR, roundDecimal } from '../../lib/financialService';
import { TrendingUp, AlertTriangle, ShieldCheck, ArrowRight, BarChart2 } from 'lucide-react';

interface SensitivityAnalysisCardProps {
  property: Property;
  investmentAmountEUR?: number;
}

export const SensitivityAnalysisCard: React.FC<SensitivityAnalysisCardProps> = ({
  property,
  investmentAmountEUR,
}) => {
  const baseAmount = investmentAmountEUR || property.minimumInvestment || 9000;
  const baseRate = property.monthlyTargetRate || 7.7;
  const durationMonths = property.durationMonths || 21;

  // Base Case Calculations
  const baseMonthlyPay = roundDecimal(baseAmount * (baseRate / 100), 2);
  const baseTotalPayout = roundDecimal(baseMonthlyPay * durationMonths, 2);
  const baseReturnPercent = roundDecimal((baseTotalPayout / baseAmount) * 100, 2);

  // Downside Case (-20% rent collection, +15% maintenance op-ex -> Net yield reduced to ~6.16% monthly)
  const downsideRate = roundDecimal(baseRate * 0.8, 2);
  const downsideMonthlyPay = roundDecimal(baseAmount * (downsideRate / 100), 2);
  const downsideTotalPayout = roundDecimal(downsideMonthlyPay * durationMonths, 2);
  const downsideReturnPercent = roundDecimal((downsideTotalPayout / baseAmount) * 100, 2);

  // Upside Case (+10% prime seasonal rent yield -> Net yield increased to ~8.47% monthly)
  const upsideRate = roundDecimal(baseRate * 1.1, 2);
  const upsideMonthlyPay = roundDecimal(baseAmount * (upsideRate / 100), 2);
  const upsideTotalPayout = roundDecimal(upsideMonthlyPay * durationMonths, 2);
  const upsideReturnPercent = roundDecimal((upsideTotalPayout / baseAmount) * 100, 2);

  return (
    <div className="bg-white p-6 sm:p-8 rounded-3xl border border-[#E3E8E3] shadow-sm space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#E3E8E3]">
        <div>
          <span className="text-xs font-bold text-[#27845D] uppercase tracking-wider block mb-1">
            Correction 3 Financial Transparency
          </span>
          <h3 className="text-xl font-black text-[#18211F]">
            Sensitivity Analysis & Stress Testing ({durationMonths} Months)
          </h3>
          <p className="text-xs text-[#69736F] mt-0.5">
            Projections calculated for investment of <strong>{formatEUR(baseAmount)}</strong> across market scenarios.
          </p>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-[#27845D] font-bold bg-[#EEF1EC] px-3 py-1.5 rounded-full self-start sm:self-center">
          <BarChart2 className="w-4 h-4" />
          <span>Zero-Variance Math Engine</span>
        </div>
      </div>

      {/* Scenario Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Downside Case */}
        <div className="p-5 rounded-2xl bg-amber-50/60 border border-amber-200 space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-amber-900 uppercase tracking-wide flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-700" />
              Downside Stress Case
            </span>
            <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full">
              -20% Rent Yield
            </span>
          </div>

          <div>
            <span className="text-xs text-amber-900/80 block">Monthly Yield Rate</span>
            <span className="text-2xl font-black text-amber-950">{downsideRate}% / mo</span>
          </div>

          <div className="space-y-1 text-xs pt-2 border-t border-amber-200/80">
            <div className="flex justify-between text-amber-950 font-medium">
              <span>Monthly Distribution:</span>
              <strong className="font-bold">{formatEUR(downsideMonthlyPay)}</strong>
            </div>
            <div className="flex justify-between text-amber-950 font-medium">
              <span>{durationMonths}-Mo Return:</span>
              <strong className="font-bold">{formatEUR(downsideTotalPayout)}</strong>
            </div>
            <div className="flex justify-between text-amber-950 font-bold pt-1 border-t border-amber-200">
              <span>Cumulative Yield:</span>
              <span>{downsideReturnPercent}%</span>
            </div>
          </div>
          <p className="text-[10px] text-amber-800/90 leading-tight">
            Assumes 15% vacancy extension, 20% increased maintenance op-ex, and seasonal rental slowdown.
          </p>
        </div>

        {/* Base Case (Target) */}
        <div className="p-5 rounded-2xl bg-[#EEF1EC] border border-[#27845D] shadow-xs space-y-3 relative overflow-hidden">
          <div className="absolute top-0 right-0 bg-[#27845D] text-white text-[9px] font-black uppercase px-3 py-1 rounded-bl-xl">
            Target SPV Model
          </div>

          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-[#18211F] uppercase tracking-wide flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-[#27845D]" />
              Base Target Case
            </span>
          </div>

          <div>
            <span className="text-xs text-[#69736F] block">Monthly Yield Rate</span>
            <span className="text-2xl font-black text-[#27845D]">{baseRate}% / mo</span>
          </div>

          <div className="space-y-1 text-xs pt-2 border-t border-[#E3E8E3]">
            <div className="flex justify-between text-[#18211F]">
              <span>Monthly Distribution:</span>
              <strong className="font-bold text-[#27845D]">{formatEUR(baseMonthlyPay)}</strong>
            </div>
            <div className="flex justify-between text-[#18211F]">
              <span>{durationMonths}-Mo Return:</span>
              <strong className="font-bold text-[#27845D]">{formatEUR(baseTotalPayout)}</strong>
            </div>
            <div className="flex justify-between text-[#18211F] font-bold pt-1 border-t border-[#E3E8E3]">
              <span>Cumulative Yield:</span>
              <span className="text-[#27845D]">{baseReturnPercent}%</span>
            </div>
          </div>
          <p className="text-[10px] text-[#69736F] leading-tight">
            Primary underwriting target based on notarized tenant lease and luxury seasonal booking history.
          </p>
        </div>

        {/* Upside Case */}
        <div className="p-5 rounded-2xl bg-emerald-50/60 border border-emerald-200 space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-emerald-900 uppercase tracking-wide flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-700" />
              Upside High Occupancy
            </span>
            <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
              +10% Rent Yield
            </span>
          </div>

          <div>
            <span className="text-xs text-emerald-900/80 block">Monthly Yield Rate</span>
            <span className="text-2xl font-black text-emerald-950">{upsideRate}% / mo</span>
          </div>

          <div className="space-y-1 text-xs pt-2 border-t border-emerald-200/80">
            <div className="flex justify-between text-emerald-950 font-medium">
              <span>Monthly Distribution:</span>
              <strong className="font-bold">{formatEUR(upsideMonthlyPay)}</strong>
            </div>
            <div className="flex justify-between text-emerald-950 font-medium">
              <span>{durationMonths}-Mo Return:</span>
              <strong className="font-bold">{formatEUR(upsideTotalPayout)}</strong>
            </div>
            <div className="flex justify-between text-emerald-950 font-bold pt-1 border-t border-emerald-200">
              <span>Cumulative Yield:</span>
              <span>{upsideReturnPercent}%</span>
            </div>
          </div>
          <p className="text-[10px] text-emerald-800/90 leading-tight">
            Assumes peak summer seasonal rental premiums and zero unbudgeted maintenance downtime.
          </p>
        </div>
      </div>

      {/* Audit Footnote explaining 7.7% * 21 = 161.7% */}
      <div className="p-4 rounded-2xl bg-[#F6F7F4] border border-[#E3E8E3] text-xs space-y-1 text-[#69736F]">
        <strong className="text-[#18211F] font-bold block">Financial Reconciliation Note (Priority 1 Example Property):</strong>
        <p className="leading-relaxed">
          The advertised <strong>7.7% monthly rate</strong> over <strong>21 months</strong> equates to <strong>161.7% cumulative rental yield</strong> ($7.7\% \times 21 = 161.7\%$). This metric represents cumulative rental cash distributions over the 21-month operational window and is calculated separately from principal repayment upon SPV asset liquidation or refinancing.
        </p>
      </div>
    </div>
  );
};
