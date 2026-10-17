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
    <div className="space-y-6">
      {/* Top summary banner */}
      <div className="bg-gradient-to-r from-[#182D2A] to-[#24423C] text-white p-7 rounded-3xl shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 -mr-12 -mt-12 w-48 h-48 rounded-full bg-[#B7E36A]/10 pointer-events-none" />
        <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <span className="text-xs text-[#A0A8A5] uppercase tracking-wider font-semibold block mb-1">
              Total Cumulative Dividends
            </span>
            <div className="text-3xl font-black text-[#B7E36A]">
              {formatCurrency(totalDividendsEarned)}
            </div>
            <p className="text-[11px] text-[#A0A8A5] mt-1">Paid directly to your uninvested cash balance</p>
          </div>

          <div>
            <span className="text-xs text-[#A0A8A5] uppercase tracking-wider font-semibold block mb-1">
              Est. Monthly Passive Cashflow
            </span>
            <div className="text-3xl font-black text-white">
              {formatCurrency(totalMonthlyProjected)}<span className="text-sm font-normal text-[#A0A8A5]">/mo</span>
            </div>
            <p className="text-[11px] text-[#A0A8A5] mt-1">Across {investments.length} active tokenized assets</p>
          </div>

          <div>
            <span className="text-xs text-[#A0A8A5] uppercase tracking-wider font-semibold block mb-1">
              Average Portfolio Yield
            </span>
            <div className="text-3xl font-black text-white">
              {investments.length > 0 
                ? formatPercent(investments.reduce((acc, i) => acc + i.estimatedAnnualYield, 0) / investments.length)
                : '0.0%'}
            </div>
            <p className="text-[11px] text-[#A0A8A5] mt-1">Net rental yields verified via RICS audits</p>
          </div>
        </div>
      </div>

      {/* Breakdown per Property */}
      <div className="dash-card p-7 rounded-3xl border shadow-sm space-y-4">
        <div>
          <h3 className="text-lg font-bold dash-text">Monthly Yield Distribution Breakdown</h3>
          <p className="text-xs dash-muted">Real-time accrual and historical dividend payouts per property asset</p>
        </div>

        {investments.length === 0 ? (
          <div className="text-center py-12 text-xs dash-muted space-y-3">
            <p>No active properties in your portfolio to generate distributions.</p>
            <button onClick={onExploreProperties} className="btn btn-primary btn-sm">
              Browse Marketplace
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {investments.map((inv) => (
              <div key={inv.id} className="p-5 rounded-2xl border dash-inner flex flex-col justify-between space-y-4">
                <div className="flex items-start gap-3">
                  <img src={inv.propertyImage} alt={inv.propertyTitle} className="w-14 h-14 rounded-xl object-cover shrink-0" />
                  <div>
                    <h4 className="text-sm font-bold dash-text">{inv.propertyTitle}</h4>
                    <span className="text-xs dash-muted block">{inv.propertyLocation}</span>
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 rounded-full mt-1.5">
                      Yield: {formatPercent(inv.estimatedAnnualYield)} Annual
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 py-3 border-y border-inherit/30 text-xs">
                  <div>
                    <span className="dash-muted block text-[11px]">Total Invested</span>
                    <span className="font-bold dash-text">{formatCurrency(inv.totalAmountInvested)}</span>
                  </div>
                  <div>
                    <span className="dash-muted block text-[11px]">Dividends Received</span>
                    <span className="font-bold text-emerald-400">+{formatCurrency(inv.totalDividendsReceived)}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs pt-1">
                  <span className="dash-muted font-mono">Cert: {inv.certificateId}</span>
                  <button
                    onClick={() => onSelectProperty(inv.propertyId)}
                    className="font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
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
      <div className="dash-card p-7 rounded-3xl border shadow-sm space-y-4">
        <div>
          <h3 className="text-lg font-bold dash-text">Dividend Payout History</h3>
          <p className="text-xs dash-muted">Immutable record of monthly rental yields credited to your balance</p>
        </div>

        {dividendTransactions.length === 0 ? (
          <div className="text-center py-8 text-xs dash-muted">
            No dividend payouts recorded yet. Payouts occur on the 1st of each month.
          </div>
        ) : (
          <div className="divide-y border-inherit/30">
            {dividendTransactions.map((tx) => (
              <div key={tx.id} className="py-3.5 flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0">
                    <RefreshCw className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-bold dash-text block">{tx.description}</span>
                    <span className="text-[10px] dash-muted font-mono">Ref: {tx.reference} · {formatDate(tx.createdAt)}</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="font-bold text-emerald-400 text-sm block">+{formatCurrency(tx.amount)}</span>
                  <span className="text-[10px] dash-muted uppercase">Completed</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
