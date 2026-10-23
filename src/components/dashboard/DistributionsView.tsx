import React from 'react';
import { Investment } from '../../types/investment';
import { Transaction } from '../../types/transaction';
import { formatCurrency, formatDate, formatPercent } from '../../lib/utils';
import { RefreshCw, TrendingUp, Calendar, ArrowRight, ShieldCheck, Download } from 'lucide-react';

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
    <div className="space-y-3">
      {/* Top summary banner */}
      <div className="bg-[#182D2A] text-white p-3 sm:p-3.5 rounded-xl shadow-2xs relative overflow-hidden border border-[#24423C]">
        <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-2.5 sm:gap-3">
          <div>
            <span className="text-[9px] text-[#A0A8A5] uppercase tracking-wider font-semibold block mb-0.5">
              Cumulative Dividends
            </span>
            <div className="text-lg sm:text-xl font-bold font-mono tabular-nums text-[#B7E36A]">
              {formatCurrency(totalDividendsEarned)}
            </div>
            <p className="text-[9.5px] text-[#A0A8A5] mt-0.5">Credited to uninvested cash balance</p>
          </div>

          <div>
            <span className="text-[9px] text-[#A0A8A5] uppercase tracking-wider font-semibold block mb-0.5">
              Est. Monthly Cashflow
            </span>
            <div className="text-lg sm:text-xl font-bold font-mono tabular-nums text-white">
              {formatCurrency(totalMonthlyProjected)}<span className="text-xs font-normal text-[#A0A8A5]">/mo</span>
            </div>
            <p className="text-[9.5px] text-[#A0A8A5] mt-0.5">Across {investments.length} active property holdings</p>
          </div>

          <div>
            <span className="text-[9px] text-[#A0A8A5] uppercase tracking-wider font-semibold block mb-0.5">
              Average Portfolio Yield
            </span>
            <div className="text-lg sm:text-xl font-bold font-mono tabular-nums text-white">
              {investments.length > 0 
                ? formatPercent(investments.reduce((acc, i) => acc + i.estimatedAnnualYield, 0) / investments.length)
                : '0.0%'}
            </div>
            <p className="text-[9.5px] text-[#A0A8A5] mt-0.5">Net yields audited via RICS standards</p>
          </div>
        </div>
      </div>

      {/* Breakdown per Property */}
      <div className="dash-card p-3 sm:p-3.5 rounded-xl border border-inherit/40 shadow-2xs space-y-2.5">
        <div>
          <h3 className="text-sm sm:text-base font-bold dash-text">Monthly Yield Distribution Breakdown</h3>
          <p className="text-[11px] dash-muted">Real-time accrual and historical dividend payouts per property asset</p>
        </div>

        {investments.length === 0 ? (
          <div className="text-center py-8 text-xs dash-muted space-y-2">
            <p>No active properties in your portfolio to generate distributions.</p>
            <button onClick={onExploreProperties} className="btn btn-primary btn-sm text-xs font-semibold py-1.5 px-3">
              Browse Marketplace
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {investments.map((inv) => (
              <div key={inv.id} className="p-3 sm:p-3.5 rounded-xl border border-inherit/30 dash-inner flex flex-col justify-between space-y-2.5">
                <div className="flex items-start gap-2.5">
                  <img src={inv.propertyImage} alt={inv.propertyTitle} className="w-11 h-11 rounded-lg object-cover shrink-0" />
                  <div className="min-w-0">
                    <h4 className="text-xs sm:text-sm font-bold dash-text truncate">{inv.propertyTitle}</h4>
                    <span className="text-[11px] dash-muted block truncate">{inv.propertyLocation}</span>
                    <span className="inline-flex items-center gap-1 text-[9.5px] font-bold text-emerald-500 bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.2 rounded-full mt-1">
                      Yield: {formatPercent(inv.estimatedAnnualYield)} Annual
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 py-2 border-y border-inherit/30 text-xs">
                  <div>
                    <span className="dash-muted block text-[10px]">Total Invested</span>
                    <span className="font-bold dash-text text-xs">{formatCurrency(inv.totalAmountInvested)}</span>
                  </div>
                  <div>
                    <span className="dash-muted block text-[10px]">Dividends Received</span>
                    <span className="font-bold text-emerald-500 text-xs">+{formatCurrency(inv.totalDividendsReceived)}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs pt-0.5">
                  <span className="dash-muted font-mono text-[9px]">Cert: {inv.certificateId}</span>
                  <button
                    onClick={() => onSelectProperty(inv.propertyId)}
                    className="font-semibold text-emerald-500 hover:text-emerald-400 flex items-center gap-1 text-[11px]"
                  >
                    View Property <ArrowRight className="w-3 h-3" />
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
