import React, { useState } from 'react';
import { Investment } from '../../types/investment';
import { Transaction } from '../../types/transaction';
import { formatCurrency, formatDate, formatPercent } from '../../lib/utils';
import { RefreshCw, TrendingUp, Calendar, ArrowRight, ShieldCheck, Download, Coins, BarChart3, History } from 'lucide-react';
import { YieldDistributionFlowDiagram } from '../visuals/YieldDistributionFlowDiagram';
import { YieldPayoutTrendsChart } from '../visuals/YieldPayoutTrendsChart';
import { PropertyDailyDistributionsView } from './PropertyDailyDistributionsView';

interface DistributionsViewProps {
  investments: Investment[];
  transactions: Transaction[];
  onSelectProperty: (propertyId: string) => void;
  onExploreProperties: () => void;
}

export const DistributionsView: React.FC<DistributionsViewProps> = ({
  investments,
  transactions,
  onSelectProperty,
  onExploreProperties,
}) => {
  const [subTab, setSubTab] = useState<'property_daily' | 'analytics_flows' | 'all_history'>('property_daily');
  const dividendTransactions = transactions.filter(t => t.type === 'distribution' && t.status === 'completed');
  const totalDividendsEarned = dividendTransactions.reduce((acc, t) => acc + t.amount, 0);
  const totalMonthlyProjected = investments.reduce((acc, inv) => acc + inv.projectedMonthlyIncome, 0);

  return (
    <div className="space-y-5">
      {/* View Mode Navigation Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#151515] p-2 rounded-2xl border border-[#303030]">
        <div className="flex items-center gap-1.5 overflow-x-auto py-1">
          <button
            type="button"
            onClick={() => setSubTab('property_daily')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
              subTab === 'property_daily'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Coins className="w-4 h-4" />
            <span>Property Daily Allocations</span>
          </button>

          <button
            type="button"
            onClick={() => setSubTab('analytics_flows')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
              subTab === 'analytics_flows'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Visual Flows &amp; APY Trends</span>
          </button>

          <button
            type="button"
            onClick={() => setSubTab('all_history')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
              subTab === 'all_history'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Consolidated Ledger ({dividendTransactions.length})</span>
          </button>
        </div>

        <div className="text-right px-2 hidden sm:block">
          <span className="text-[10px] text-gray-400 block font-mono">Real-time Backend Synchronization</span>
          <span className="text-xs font-bold text-emerald-400 font-mono">Active</span>
        </div>
      </div>

      {/* Main Tab 1: Property-by-Property Daily Payouts */}
      {subTab === 'property_daily' && (
        <PropertyDailyDistributionsView 
          onSelectProperty={onSelectProperty}
          onExploreProperties={onExploreProperties}
        />
      )}

      {/* Main Tab 2: Visual Flows & Macro Trends */}
      {subTab === 'analytics_flows' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <YieldDistributionFlowDiagram />
          <YieldPayoutTrendsChart transactions={transactions} investments={investments} />
        </div>
      )}

      {/* Main Tab 3: Consolidated Dividend Audit Ledger */}
      {subTab === 'all_history' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <div className="cinematic-card text-white p-5 rounded-2xl sm:rounded-3xl shadow-xl relative overflow-hidden border border-white/[0.08]">
            <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
              <div className="p-3.5 bg-[#141515] rounded-2xl border border-white/[0.08]">
                <span className="inline-flex items-center gap-1 text-[8.5px] font-bold text-[#43C98B] bg-[#43C98B]/15 px-2.5 py-0.5 rounded-full border border-[#43C98B]/30 uppercase tracking-wider mb-2">
                  <ShieldCheck className="w-2.5 h-2.5" /> Realized Performance
                </span>
                <span className="text-[10px] text-[#777979] uppercase tracking-wider font-semibold block">
                  Cumulative Dividends Paid
                </span>
                <div className="financial-val-card text-[#43C98B] font-[600] mt-1">
                  +{formatCurrency(totalDividendsEarned)}
                </div>
                <p className="text-[10.5px] text-[#777979] mt-1 font-medium">Verified cash credited to investor wallet</p>
              </div>

          <div className="p-3.5 bg-[#141515] rounded-2xl border border-white/[0.08]">
            <span className="inline-flex items-center gap-1 text-[8.5px] font-bold text-[#55BDE8] bg-[#55BDE8]/15 px-2.5 py-0.5 rounded-full border border-[#55BDE8]/30 uppercase tracking-wider mb-2">
              Monthly Accrual
            </span>
            <span className="text-[10px] text-[#777979] uppercase tracking-wider font-semibold block">
              Est. Monthly Cashflow
            </span>
            <div className="financial-val-card text-[#F5F5F2] font-[600] mt-1">
              {formatCurrency(totalMonthlyProjected)}<span className="text-xs font-normal text-[#777979]">/mo</span>
            </div>
            <p className="text-[10.5px] text-[#777979] mt-1 font-medium">Across {investments.length} active property holdings</p>
          </div>

          <div className="p-3.5 bg-[#141515] rounded-2xl border border-white/[0.08]">
            <span className="inline-flex items-center gap-1 text-[8.5px] font-bold text-[#55BDE8] bg-[#55BDE8]/15 px-2.5 py-0.5 rounded-full border border-[#55BDE8]/30 uppercase tracking-wider mb-2">
              <TrendingUp className="w-2.5 h-2.5" /> Projected Target
            </span>
            <span className="text-[10px] text-[#777979] uppercase tracking-wider font-semibold block">
              Projected Annual Yield
            </span>
            <div className="financial-val-card text-[#55BDE8] font-[600] mt-1">
              {investments.length > 0 
                ? formatPercent(investments.reduce((acc, i) => acc + i.estimatedAnnualYield, 0) / investments.length)
                : '0.0%'}
            </div>
            <p className="text-[10.5px] text-[#777979] mt-1 font-medium">Weighted contractual underwritten target</p>
          </div>
        </div>
      </div>

      {/* Breakdown per Property */}
      <div className="bg-[#151515] p-5 rounded-2xl sm:rounded-3xl border border-[#303030] shadow-xl space-y-4">
        <div>
          <h3 className="text-base font-bold text-white">Monthly Yield Distribution Breakdown</h3>
          <p className="text-xs text-[#999999]">Real-time accrual and historical dividend payouts per property asset</p>
        </div>

        {investments.length === 0 ? (
          <div className="text-center py-8 text-xs text-[#999999] space-y-3">
            <p>No active properties in your portfolio to generate distributions.</p>
            <button onClick={onExploreProperties} className="bg-white hover:bg-neutral-200 text-black text-xs font-bold py-2 px-5 rounded-xl transition-all shadow-md cursor-pointer">
              Browse Marketplace
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {investments.map((inv) => (
              <div key={inv.id} className="p-4 rounded-2xl border border-[#303030] bg-[#1D1D1D] flex flex-col justify-between space-y-3 hover:border-[#454545] transition-all">
                <div className="flex items-start gap-3">
                  <img src={inv.propertyImage} alt={inv.propertyTitle} className="w-12 h-12 rounded-xl object-cover shrink-0 border border-[#303030]" />
                  <div className="min-w-0 flex-1">
                    <h4 className="text-xs sm:text-sm font-bold text-white truncate">{inv.propertyTitle}</h4>
                    <span className="text-xs text-[#999999] block truncate mt-0.5">{inv.propertyLocation}</span>
                    <div className="flex flex-wrap items-center gap-1.5 mt-2">
                      <span className="inline-flex items-center gap-1 text-[9px] font-bold text-[#00D2FF] bg-[#00D2FF]/15 border border-[#00D2FF]/30 px-2 py-0.5 rounded-full">
                        <TrendingUp className="w-2.5 h-2.5" /> Projected: {formatPercent(inv.estimatedAnnualYield)} APY
                      </span>
                      <span className="inline-flex items-center gap-1 text-[9px] font-semibold text-[#43C98B] bg-[#43C98B]/15 border border-[#43C98B]/30 px-2 py-0.5 rounded-full">
                        <ShieldCheck className="w-2.5 h-2.5" /> Realized: +{formatCurrency(inv.totalDividendsReceived)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 py-2 border-y border-white/[0.08] text-xs">
                  <div>
                    <span className="text-[#777979] block text-[9.5px] font-semibold uppercase tracking-wider">Total Invested</span>
                    <span className="financial-num text-[#F5F5F2] text-xs sm:text-[13px] block mt-0.5">{formatCurrency(inv.totalAmountInvested)}</span>
                  </div>
                  <div>
                    <span className="text-[#777979] block text-[9.5px] font-semibold uppercase tracking-wider">Realized Cashflow</span>
                    <span className="financial-num text-[#43C98B] text-xs sm:text-[13px] block mt-0.5">+{formatCurrency(inv.totalDividendsReceived)}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs pt-1">
                  <span className="text-[#999999] font-mono text-[9.5px]">Cert: {inv.certificateId}</span>
                  <button
                    onClick={() => onSelectProperty(inv.propertyId)}
                    className="font-bold text-black bg-white hover:bg-neutral-200 px-3 py-1 rounded-lg flex items-center gap-1 text-xs cursor-pointer transition-colors shadow-xs"
                  >
                    View Property <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Distribution Payout History */}
      <div className="bg-[#151515] p-5 rounded-2xl sm:rounded-3xl border border-[#303030] shadow-xl space-y-3">
        <div>
          <h3 className="text-sm sm:text-base font-bold text-white">Dividend Payout History</h3>
          <p className="text-xs text-[#999999]">Immutable record of monthly rental yields credited to your balance</p>
        </div>

        {dividendTransactions.length === 0 ? (
          <div className="text-center py-6 text-xs text-[#999999]">
            No dividend payouts recorded yet. Payouts occur on the 1st of each month.
          </div>
        ) : (
          <div className="divide-y divide-[#262626]">
            {dividendTransactions.map((tx) => (
              <div key={tx.id} className="py-2.5 flex items-center justify-between text-xs hover:bg-[#1D1D1D] px-2 rounded-xl transition-colors">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-[#2ECC71]/15 text-[#2ECC71] border border-[#2ECC71]/30 flex items-center justify-center shrink-0">
                    <RefreshCw className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <span className="font-semibold text-white block text-xs">{tx.description}</span>
                    <span className="text-[9.5px] text-[#999999] font-mono">Ref: {tx.reference} · {formatDate(tx.createdAt)}</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="font-bold font-mono tabular-nums text-[#2ECC71] text-xs sm:text-sm block">+{formatCurrency(tx.amount)}</span>
                  <span className="text-[9px] text-[#999999] uppercase">Completed</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      </div>
      )}
    </div>
  );
};
