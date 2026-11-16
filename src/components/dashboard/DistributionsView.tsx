import React, { useState } from 'react';
import { Investment } from '../../types/investment';
import { Transaction } from '../../types/transaction';
import { formatCurrency, formatDate, formatPercent } from '../../lib/utils';
import { RefreshCw, TrendingUp, ArrowRight, ShieldCheck, Coins, BarChart3, History } from 'lucide-react';
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
  const dividendTransactions = transactions.filter((t) => t.type === 'distribution' && t.status === 'completed');
  const totalDividendsEarned = dividendTransactions.reduce((acc, t) => acc + t.amount, 0);
  const totalMonthlyProjected = investments.reduce((acc, inv) => acc + inv.projectedMonthlyIncome, 0);

  return (
    <div className="space-y-5">
      {/* View Mode Navigation Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 portal-card p-2.5">
        <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
          <button
            type="button"
            onClick={() => setSubTab('property_daily')}
            className={`portal-chip inline-flex items-center gap-1.5 cursor-pointer ${
              subTab === 'property_daily' ? 'on' : ''
            }`}
          >
            <Coins className="w-3.5 h-3.5" />
            <span>Daily Allocations</span>
          </button>

          <button
            type="button"
            onClick={() => setSubTab('analytics_flows')}
            className={`portal-chip inline-flex items-center gap-1.5 cursor-pointer ${
              subTab === 'analytics_flows' ? 'on' : ''
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Yield Flows &amp; Trends</span>
          </button>

          <button
            type="button"
            onClick={() => setSubTab('all_history')}
            className={`portal-chip inline-flex items-center gap-1.5 cursor-pointer ${
              subTab === 'all_history' ? 'on' : ''
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Payout History ({dividendTransactions.length})</span>
          </button>
        </div>

        <div className="text-right px-2 hidden sm:block">
          <span className="text-[10px] text-[var(--dash-text-muted)] block font-mono">Ledger Sync</span>
          <span className="text-xs font-bold text-[var(--dash-accent)] font-mono">Active</span>
        </div>
      </div>

      {subTab === 'property_daily' && (
        <PropertyDailyDistributionsView
          onSelectProperty={onSelectProperty}
          onExploreProperties={onExploreProperties}
        />
      )}

      {subTab === 'analytics_flows' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <YieldDistributionFlowDiagram />
          <YieldPayoutTrendsChart transactions={transactions} investments={investments} />
        </div>
      )}

      {subTab === 'all_history' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <div className="portal-card p-5 grid grid-cols-1 md:grid-cols-3 gap-3.5">
            <div className="p-4 bg-[var(--dash-inner)] rounded-[14px] border border-[var(--dash-card-border)]">
              <span className="portal-pill ok inline-flex items-center gap-1 mb-2">
                <ShieldCheck className="w-3 h-3" /> Realized
              </span>
              <span className="text-[10px] text-[var(--dash-text-muted)] uppercase tracking-wider font-semibold block">
                Cumulative Dividends Paid
              </span>
              <div className="text-2xl font-bold font-mono tabular-nums text-[var(--dash-positive)] mt-1">
                +{formatCurrency(totalDividendsEarned)}
              </div>
              <p className="text-[11px] text-[var(--dash-text-muted)] mt-1">Credited to investor wallet</p>
            </div>

            <div className="p-4 bg-[var(--dash-inner)] rounded-[14px] border border-[var(--dash-card-border)]">
              <span className="portal-pill inline-flex items-center gap-1 mb-2">Monthly Accrual</span>
              <span className="text-[10px] text-[var(--dash-text-muted)] uppercase tracking-wider font-semibold block">
                Est. Monthly Cashflow
              </span>
              <div className="text-2xl font-bold font-mono tabular-nums text-[var(--dash-text)] mt-1">
                {formatCurrency(totalMonthlyProjected)}
                <span className="text-xs font-normal text-[var(--dash-text-muted)]">/mo</span>
              </div>
              <p className="text-[11px] text-[var(--dash-text-muted)] mt-1">
                Across {investments.length} property holdings
              </p>
            </div>

            <div className="p-4 bg-[var(--dash-inner)] rounded-[14px] border border-[var(--dash-card-border)]">
              <span className="portal-pill ok inline-flex items-center gap-1 mb-2">
                <TrendingUp className="w-3 h-3" /> Projected Target
              </span>
              <span className="text-[10px] text-[var(--dash-text-muted)] uppercase tracking-wider font-semibold block">
                Avg Annual Yield
              </span>
              <div className="text-2xl font-bold font-mono tabular-nums text-[var(--dash-accent)] mt-1">
                {investments.length > 0
                  ? formatPercent(
                      investments.reduce((acc, i) => acc + i.estimatedAnnualYield, 0) / investments.length
                    )
                  : '0.0%'}
              </div>
              <p className="text-[11px] text-[var(--dash-text-muted)] mt-1">Underwritten target APY</p>
            </div>
          </div>

          <div className="portal-card p-5 space-y-3.5">
            <div>
              <h3 className="text-base font-bold text-[var(--dash-text)]">
                Monthly Yield Distribution Breakdown
              </h3>
              <p className="text-xs text-[var(--dash-text-muted)]">
                Accrual and historical dividend payouts per SPV property
              </p>
            </div>

            {investments.length === 0 ? (
              <div className="text-center py-8 text-xs text-[var(--dash-text-muted)] space-y-3">
                <p>No active properties in your portfolio to generate distributions.</p>
                <button
                  type="button"
                  onClick={onExploreProperties}
                  className="portal-btn h-10 text-xs cursor-pointer"
                >
                  Explore properties
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {investments.map((inv) => (
                  <div
                    key={inv.id}
                    className="p-4 rounded-[14px] border border-[var(--dash-card-border)] bg-[var(--dash-inner)] flex flex-col justify-between space-y-3 hover:border-[var(--dash-inner-border)] transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <img
                        src={inv.propertyImage}
                        alt={inv.propertyTitle}
                        referrerPolicy="no-referrer"
                        className="w-12 h-12 rounded-xl object-cover shrink-0 border border-[var(--dash-card-border)]"
                      />
                      <div className="min-w-0 flex-1">
                        <h4 className="text-xs sm:text-sm font-bold text-[var(--dash-text)] truncate">
                          {inv.propertyTitle}
                        </h4>
                        <span className="text-xs text-[var(--dash-text-muted)] block truncate mt-0.5">
                          {inv.propertyLocation}
                        </span>
                        <div className="flex flex-wrap items-center gap-1.5 mt-2">
                          <span className="portal-pill">
                            {formatPercent(inv.estimatedAnnualYield)} APY
                          </span>
                          <span className="portal-pill ok">
                            +{formatCurrency(inv.totalDividendsReceived)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 py-2 border-y border-[var(--dash-card-border)] text-xs">
                      <div>
                        <span className="text-[9.5px] font-semibold uppercase tracking-wider text-[var(--dash-text-muted)] block">
                          Total Invested
                        </span>
                        <span className="financial-num text-[var(--dash-text)] font-bold block mt-0.5">
                          {formatCurrency(inv.totalAmountInvested)}
                        </span>
                      </div>
                      <div>
                        <span className="text-[9.5px] font-semibold uppercase tracking-wider text-[var(--dash-text-muted)] block">
                          Realized Cashflow
                        </span>
                        <span className="financial-num text-[var(--dash-positive)] font-bold block mt-0.5">
                          +{formatCurrency(inv.totalDividendsReceived)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[var(--dash-text-muted)] font-mono text-[10px]">
                        Cert: {inv.certificateId}
                      </span>
                      <button
                        type="button"
                        onClick={() => onSelectProperty(inv.propertyId)}
                        className="px-3 py-1.5 rounded-lg bg-[var(--dash-accent)] text-[var(--dash-accent-ink)] font-bold text-xs inline-flex items-center gap-1 cursor-pointer"
                      >
                        View Asset <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="portal-card p-5 space-y-3">
            <div>
              <h3 className="text-sm sm:text-base font-bold text-[var(--dash-text)]">
                Dividend Payout History
              </h3>
              <p className="text-xs text-[var(--dash-text-muted)]">
                Record of monthly rental yields credited to your wallet balance
              </p>
            </div>

            {dividendTransactions.length === 0 ? (
              <div className="text-center py-6 text-xs text-[var(--dash-text-muted)]">
                No dividend payouts recorded yet. Payouts occur on the 1st of each month.
              </div>
            ) : (
              <div className="divide-y divide-[var(--dash-card-border)]">
                {dividendTransactions.map((tx) => (
                  <div
                    key={tx.id}
                    className="py-2.5 flex items-center justify-between text-xs hover:bg-[var(--dash-hover)] px-2 rounded-xl transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-[var(--dash-highlight)] text-[var(--dash-positive)] border border-[var(--dash-accent-border)] flex items-center justify-center shrink-0">
                        <RefreshCw className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <span className="font-semibold text-[var(--dash-text)] block text-xs">
                          {tx.description}
                        </span>
                        <span className="text-[10px] text-[var(--dash-text-muted)] font-mono">
                          Ref: {tx.reference} · {formatDate(tx.createdAt)}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="font-bold font-mono tabular-nums text-[var(--dash-positive)] text-xs sm:text-sm block">
                        +{formatCurrency(tx.amount)}
                      </span>
                      <span className="text-[9.5px] text-[var(--dash-text-muted)] uppercase">Completed</span>
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
