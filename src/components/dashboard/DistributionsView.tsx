import React from 'react';
import { Investment } from '../../types/investment';
import { Transaction } from '../../types/transaction';
import { formatCurrency, formatDate, formatPercent } from '../../lib/utils';
import { RefreshCw, TrendingUp, Calendar, ArrowRight, ShieldCheck, Download } from 'lucide-react';
import { YieldDistributionFlowDiagram } from '../visuals/YieldDistributionFlowDiagram';
import { YieldPayoutTrendsChart } from '../visuals/YieldPayoutTrendsChart';

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
  const dividendTransactions = transactions.filter(t => t.type === 'distribution' && t.status === 'completed');
  const totalDividendsEarned = dividendTransactions.reduce((acc, t) => acc + t.amount, 0);
  const totalMonthlyProjected = investments.reduce((acc, inv) => acc + inv.projectedMonthlyIncome, 0);

  return (
    <div className="space-y-4">
      {/* Yield Cashflow Lifecycle Visual Diagram */}
      <YieldDistributionFlowDiagram />

      {/* Monthly Dividend Yield Trends Chart */}
      <YieldPayoutTrendsChart />
      {/* Top summary banner - Finora Deep Emerald Finish */}
      <div className="bg-gradient-to-br from-[#075B46] via-[#087F5B] to-[#0A8F67] text-white p-4 sm:p-5 rounded-2xl sm:rounded-3xl shadow-[0_6px_24px_rgba(8,127,91,0.15)] relative overflow-hidden border border-[#087F5B]/30">
        <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
          <div>
            <span className="inline-flex items-center gap-1 text-[8.5px] font-bold text-[#DDF5EC] bg-white/15 px-2 py-0.5 rounded-full border border-white/20 uppercase tracking-wider mb-1.5">
              <ShieldCheck className="w-2.5 h-2.5" /> Realized Performance
            </span>
            <span className="text-[10px] text-[#DDF5EC]/90 uppercase tracking-wider font-bold block">
              Cumulative Dividends Paid
            </span>
            <div className="text-xl sm:text-2xl font-bold font-mono tabular-nums text-white mt-1">
              {formatCurrency(totalDividendsEarned)}
            </div>
            <p className="text-[10.5px] text-[#DDF5EC]/80 mt-1 font-medium">Verified cash credited to investor wallet</p>
          </div>

          <div>
            <span className="inline-flex items-center gap-1 text-[8.5px] font-bold text-[#DDF5EC] bg-white/15 px-2 py-0.5 rounded-full border border-white/20 uppercase tracking-wider mb-1.5">
              Monthly Accrual
            </span>
            <span className="text-[10px] text-[#DDF5EC]/90 uppercase tracking-wider font-bold block">
              Est. Monthly Cashflow
            </span>
            <div className="text-xl sm:text-2xl font-bold font-mono tabular-nums text-white mt-1">
              {formatCurrency(totalMonthlyProjected)}<span className="text-xs font-normal text-[#DDF5EC]/80">/mo</span>
            </div>
            <p className="text-[10.5px] text-[#DDF5EC]/80 mt-1 font-medium">Across {investments.length} active property holdings</p>
          </div>

          <div>
            <span className="inline-flex items-center gap-1 text-[8.5px] font-bold text-[#DDF5EC] bg-white/15 px-2 py-0.5 rounded-full border border-white/20 uppercase tracking-wider mb-1.5">
              <TrendingUp className="w-2.5 h-2.5" /> Projected Target
            </span>
            <span className="text-[10px] text-[#DDF5EC]/90 uppercase tracking-wider font-bold block">
              Projected Annual Yield
            </span>
            <div className="text-xl sm:text-2xl font-bold font-mono tabular-nums text-white mt-1">
              {investments.length > 0 
                ? formatPercent(investments.reduce((acc, i) => acc + i.estimatedAnnualYield, 0) / investments.length)
                : '0.0%'}
            </div>
            <p className="text-[10.5px] text-[#DDF5EC]/80 mt-1 font-medium">Weighted contractual underwritten target</p>
          </div>
        </div>
      </div>

      {/* Breakdown per Property */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-[#E4EEEA] shadow-sm space-y-3">
        <div>
          <h3 className="text-base font-bold text-[#172B2A]">Monthly Yield Distribution Breakdown</h3>
          <p className="text-xs text-[#71817D]">Real-time accrual and historical dividend payouts per property asset</p>
        </div>

        {investments.length === 0 ? (
          <div className="text-center py-8 text-xs text-[#71817D] space-y-2">
            <p>No active properties in your portfolio to generate distributions.</p>
            <button onClick={onExploreProperties} className="btn btn-primary btn-sm text-xs font-semibold py-2 px-4 rounded-xl">
              Browse Marketplace
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {investments.map((inv) => (
              <div key={inv.id} className="p-4 rounded-2xl border border-[#E4EEEA] bg-[#F6FAF8] flex flex-col justify-between space-y-3 hover:shadow-xs transition-shadow">
                <div className="flex items-start gap-3">
                  <img src={inv.propertyImage} alt={inv.propertyTitle} className="w-12 h-12 rounded-xl object-cover shrink-0 border border-[#E4EEEA]" />
                  <div className="min-w-0 flex-1">
                    <h4 className="text-xs sm:text-sm font-bold text-[#172B2A] truncate">{inv.propertyTitle}</h4>
                    <span className="text-xs text-[#71817D] block truncate">{inv.propertyLocation}</span>
                    <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                      <span className="inline-flex items-center gap-1 text-[9px] font-bold text-[#087F5B] bg-[#DDF5EC] border border-[#BCE8D7] px-2 py-0.5 rounded-full">
                        <TrendingUp className="w-2.5 h-2.5" /> Projected: {formatPercent(inv.estimatedAnnualYield)} APY
                      </span>
                      <span className="inline-flex items-center gap-1 text-[9px] font-bold text-[#075B46] bg-[#EAF8F4] border border-[#087F5B]/30 px-2 py-0.5 rounded-full">
                        <ShieldCheck className="w-2.5 h-2.5" /> Realized: +{formatCurrency(inv.totalDividendsReceived)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 py-2 border-y border-[#E4EEEA] text-xs">
                  <div>
                    <span className="text-[#71817D] block text-[9.5px] font-bold uppercase tracking-wider">Total Invested</span>
                    <span className="font-bold font-mono text-[#172B2A] text-xs sm:text-[13px]">{formatCurrency(inv.totalAmountInvested)}</span>
                  </div>
                  <div>
                    <span className="text-[#075B46] block text-[9.5px] font-bold uppercase tracking-wider">Realized Cashflow</span>
                    <span className="font-bold font-mono text-[#087F5B] text-xs sm:text-[13px]">+{formatCurrency(inv.totalDividendsReceived)}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs pt-0.5">
                  <span className="text-[#71817D] font-mono text-[9.5px]">Cert: {inv.certificateId}</span>
                  <button
                    onClick={() => onSelectProperty(inv.propertyId)}
                    className="font-bold text-[#087F5B] hover:text-[#075B46] flex items-center gap-1 text-xs cursor-pointer transition-colors"
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
      <div className="dash-card p-3.5 sm:p-4 rounded-xl border border-inherit/40 shadow-2xs space-y-3">
        <div>
          <h3 className="text-xs sm:text-sm font-bold dash-text">Dividend Payout History</h3>
          <p className="text-[10px] dash-muted">Immutable record of monthly rental yields credited to your balance</p>
        </div>

        {dividendTransactions.length === 0 ? (
          <div className="text-center py-6 text-xs dash-muted">
            No dividend payouts recorded yet. Payouts occur on the 1st of each month.
          </div>
        ) : (
          <div className="divide-y border-inherit/30">
            {dividendTransactions.map((tx) => (
              <div key={tx.id} className="py-2 sm:py-2.5 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/15 text-emerald-600 border border-emerald-500/30 flex items-center justify-center shrink-0">
                    <RefreshCw className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <span className="font-semibold dash-text block text-xs">{tx.description}</span>
                    <span className="text-[9.5px] dash-muted font-mono">Ref: {tx.reference} · {formatDate(tx.createdAt)}</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="font-bold font-mono tabular-nums text-emerald-600 text-xs sm:text-sm block">+{formatCurrency(tx.amount)}</span>
                  <span className="text-[9px] dash-muted uppercase">Completed</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
