import React from 'react';
import { ArrowDownLeft, ArrowUpRight, Compass, Building2, ArrowRight, RefreshCw } from 'lucide-react';
import { usePortal } from '../state/PortalContext';
import { formatEuro } from '../utils/format';
import { StatTile } from '../components/StatTile';
import { TransactionRow } from '../components/TransactionRow';
import { EmptyState } from '../components/EmptyState';
import { LoadingSkeleton, ErrorBanner } from '../components/LoadingSkeleton';

export const OverviewPage: React.FC = () => {
  const {
    loading,
    error,
    summary,
    portfolio,
    balance,
    transactions,
    profile,
    navigatePortal,
    refreshAll,
  } = usePortal();

  if (loading && !summary && !portfolio) {
    return <LoadingSkeleton rows={4} />;
  }

  const totalPortfolioValue = summary?.totalPortfolioValue ?? (balance + (portfolio?.totalPortfolioValue || 0));
  const investedCapital = summary?.investedCapital ?? portfolio?.totalHoldingsValue ?? 0;
  const earnedDividends = summary?.totalEarnedDividends ?? portfolio?.totalDividendsReceived ?? 0;
  const projectedMonthly = summary?.projectedMonthlyIncome ?? 0;
  const holdings = portfolio?.holdings || [];
  const recentTxs = transactions.slice(0, 5);
  const kycLabel =
    profile?.kycStatus === 'verified'
      ? 'KYC verified'
      : profile?.kycStatus === 'rejected'
      ? 'Action required'
      : 'Verification pending';

  return (
    <div className="space-y-6">
      {error && <ErrorBanner message={error} onRetry={refreshAll} />}

      {/* Primary Balance & Actions Card */}
      <section className="portal-card p-5 sm:p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        <div>
          <div className="text-xs font-medium text-[#8EA7C7] flex items-center gap-2">
            <span>Total portfolio valuation</span>
            <span aria-hidden="true">·</span>
            <span className={profile?.kycStatus === 'verified' ? 'text-[#34D399]' : 'text-[#C5A880]'}>
              {kycLabel}
            </span>
          </div>
          <div className="mt-2 text-3xl sm:text-4xl font-bold text-white portal-tabular tracking-tight">
            {formatEuro(totalPortfolioValue)}
          </div>
          <div className="mt-2 text-xs text-[#8EA7C7] portal-tabular">
            Available wallet cash · <span className="text-white font-semibold">{formatEuro(balance)}</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => navigatePortal('deposit')}
            className="portal-btn-primary"
          >
            <ArrowDownLeft className="w-4 h-4" />
            <span>Deposit</span>
          </button>
          <button
            type="button"
            onClick={() => navigatePortal('withdraw')}
            className="portal-btn-secondary"
          >
            <ArrowUpRight className="w-4 h-4" />
            <span>Withdraw</span>
          </button>
          <button
            type="button"
            onClick={() => navigatePortal('explore')}
            className="portal-btn-secondary"
          >
            <Compass className="w-4 h-4" />
            <span>Explore offerings</span>
          </button>
          <button
            type="button"
            onClick={() => void refreshAll()}
            aria-label="Refresh portfolio"
            className="w-11 h-11 rounded-xl border border-[#1D3860] text-[#8EA7C7] hover:text-white hover:border-[#C5A880] flex items-center justify-center transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </section>

      {/* KPI Strip */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatTile
          label="Invested capital"
          value={formatEuro(investedCapital)}
          sublabel={`${portfolio?.activePropertiesCount ?? 0} active SPV positions`}
        />
        <StatTile
          label="Available wallet"
          value={formatEuro(balance)}
          sublabel="Ready to subscribe or withdraw"
          tone="accent"
        />
        <StatTile
          label="Distributions earned"
          value={formatEuro(earnedDividends)}
          sublabel="Settled rent payouts"
          tone="positive"
        />
        <StatTile
          label="Projected monthly rent"
          value={formatEuro(projectedMonthly)}
          sublabel="Estimated net yield accrual"
        />
      </section>

      {/* Holdings Snapshot + Recent Ledger */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-white">Active holdings</h2>
            <button
              type="button"
              onClick={() => navigatePortal('portfolio')}
              className="text-xs font-semibold text-[#C5A880] hover:text-[#D4BA94] flex items-center gap-1 min-h-[40px]"
            >
              <span>View all</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {holdings.length === 0 ? (
            <EmptyState
              icon={<Building2 className="w-5 h-5" />}
              title="No active property holdings"
              description="Browse vetted European real estate SPVs and subscribe to fractional shares to start receiving rental distributions."
              actionLabel="Browse offerings"
              onAction={() => navigatePortal('explore')}
            />
          ) : (
            <div className="portal-card divide-y divide-[#1D3860]">
              {holdings.slice(0, 4).map((h) => (
                <button
                  key={h.id}
                  type="button"
                  onClick={() => navigatePortal('property-detail', { propertySlug: h.propertyId })}
                  className="w-full p-4 flex items-center justify-between gap-4 text-left hover:bg-[#152E54]/45 transition-colors"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-white truncate">
                      {h.propertyTitle}
                    </div>
                    <div className="mt-0.5 text-xs text-[#8EA7C7] portal-tabular">
                      {h.tokensPurchased} shares · Earned {formatEuro(h.dividendsReceived)}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-sm font-bold text-white portal-tabular">
                      {formatEuro(h.currentValue)}
                    </div>
                    <div className="mt-0.5 text-xs text-[#C5A880] portal-tabular">
                      {formatEuro(h.projectedAnnualDividend)} / yr
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-white">Recent activity</h2>
            <button
              type="button"
              onClick={() => navigatePortal('ledger')}
              className="text-xs font-semibold text-[#C5A880] hover:text-[#D4BA94] flex items-center gap-1 min-h-[40px]"
            >
              <span>Full ledger</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {recentTxs.length === 0 ? (
            <EmptyState
              title="No ledger entries yet"
              description="Your deposits, property share subscriptions, rent distributions, and withdrawals will appear here."
              actionLabel="Fund wallet"
              onAction={() => navigatePortal('deposit')}
            />
          ) : (
            <div className="portal-card divide-y divide-[#1D3860]">
              {recentTxs.map((tx) => (
                <TransactionRow key={tx.id} transaction={tx} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};
