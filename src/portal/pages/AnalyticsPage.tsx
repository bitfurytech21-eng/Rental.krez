import React, { useCallback, useEffect, useState } from 'react';
import { BarChart3, Building2, RefreshCw } from 'lucide-react';
import { usePortal } from '../state/PortalContext';
import { portalApi } from '../services/portalApi';
import { PortalPerformanceData } from '../types';
import { formatEuro, formatNumber } from '../utils/format';
import { StatTile } from '../components/StatTile';
import { EmptyState } from '../components/EmptyState';
import { ErrorBanner, LoadingSkeleton } from '../components/LoadingSkeleton';

interface DistributionSummaryState {
  summaries: any[];
  totalPropertiesCount: number;
  totalAllocatedCapitalEUR: number;
  totalDailyEntitlementEUR: number;
  totalPaymentsReceivedEUR: number;
  totalPendingPaymentsEUR: number;
  lastUpdated: string;
}

export const AnalyticsPage: React.FC = () => {
  const { portfolio, summary, navigatePortal } = usePortal();
  const [performance, setPerformance] = useState<PortalPerformanceData | null>(null);
  const [distributions, setDistributions] = useState<DistributionSummaryState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAnalytics = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [perfRes, distRes] = await Promise.all([
        portalApi.getPerformance(),
        portalApi.getDistributionsSummary(),
      ]);
      setPerformance(perfRes);
      setDistributions(distRes);
    } catch (err: any) {
      setError(err?.message || 'Unable to load portfolio performance analytics.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAnalytics();
  }, [loadAnalytics]);

  if (loading && !performance && !distributions) {
    return <LoadingSkeleton rows={4} />;
  }

  const holdings = portfolio?.holdings || [];
  const totalHoldingsValue =
    portfolio?.totalHoldingsValue ||
    holdings.reduce((acc, h) => acc + (h.currentValue || 0), 0);
  const totalPortfolioValue = summary?.totalPortfolioValue ?? portfolio?.totalPortfolioValue ?? 0;
  const annualizedReturn = performance?.annualizedReturnPercent ?? 0;
  const totalDistributionsReceived =
    distributions?.totalPaymentsReceivedEUR ??
    summary?.totalEarnedDividends ??
    portfolio?.totalDividendsReceived ??
    0;
  const dailyEntitlement = distributions?.totalDailyEntitlementEUR ?? 0;

  const history = performance?.historicalPerformance || [];
  const maxBarValue = history.reduce((max, item) => Math.max(max, item.totalValue || 0, item.yield || 0), 0);
  const distSummaries = Array.isArray(distributions?.summaries) ? distributions.summaries : [];

  return (
    <div className="space-y-6">
      {error && <ErrorBanner message={error} onRetry={loadAnalytics} />}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-heading font-bold text-white">Performance & Yield Analytics</h2>
          <p className="text-xs text-[#8EA7C7] mt-0.5">
            Live portfolio valuation, rental yield accrual, and SPV capital allocation
          </p>
        </div>
        <button
          type="button"
          onClick={() => void loadAnalytics()}
          className="portal-btn-secondary !min-h-[40px] !px-4 text-xs"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* KPI Strip */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatTile
          label="Annualized net return"
          value={`${formatNumber(annualizedReturn, 2)}%`}
          sublabel="Weighted SPV yield"
          tone="accent"
        />
        <StatTile
          label="Portfolio valuation"
          value={formatEuro(totalPortfolioValue)}
          sublabel={`${portfolio?.activePropertiesCount ?? holdings.length} active positions`}
        />
        <StatTile
          label="Distributions paid"
          value={formatEuro(totalDistributionsReceived)}
          sublabel={
            distributions?.totalPendingPaymentsEUR
              ? `${formatEuro(distributions.totalPendingPaymentsEUR)} pending`
              : 'Settled to wallet'
          }
          tone="positive"
        />
        <StatTile
          label="Daily rent accrual"
          value={formatEuro(dailyEntitlement)}
          sublabel="Estimated daily entitlement"
        />
      </section>

      {/* Historical Performance */}
      <section className="portal-card p-5 space-y-4">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-semibold text-white">Historical performance</h3>
            <p className="text-xs text-[#8EA7C7]">Monthly valuation and yield progression</p>
          </div>
          <span className="text-xs text-[#8EA7C7] portal-tabular">
            {history.length} {history.length === 1 ? 'period' : 'periods'}
          </span>
        </div>

        {history.length === 0 ? (
          <EmptyState
            icon={<BarChart3 className="w-5 h-5" />}
            title="No historical performance series yet"
            description="Performance history populates automatically as your SPV holdings complete monthly valuation and distribution cycles."
            actionLabel="Explore offerings"
            onAction={() => navigatePortal('explore')}
          />
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 pt-2">
              {history.map((point) => {
                const heightPct =
                  maxBarValue > 0 ? Math.max(12, Math.round((point.totalValue / maxBarValue) * 100)) : 12;
                return (
                  <div
                    key={point.month}
                    className="portal-surface-elevated p-3 flex flex-col justify-between gap-2"
                  >
                    <div className="h-24 flex items-end">
                      <div
                        className="w-full rounded-md bg-[#C5A880]/85 transition-all"
                        style={{ height: `${heightPct}%` }}
                        aria-label={`${point.month}: ${formatEuro(point.totalValue)}`}
                      />
                    </div>
                    <div className="pt-1 border-t border-[#1D3860]">
                      <div className="text-[11px] font-medium text-[#8EA7C7]">{point.month}</div>
                      <div className="text-xs font-bold text-white portal-tabular mt-0.5">
                        {formatEuro(point.totalValue)}
                      </div>
                      <div className="text-[11px] text-[#34D399] portal-tabular">
                        +{formatEuro(point.yield)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </section>

      {/* Allocation & SPV Breakdown */}
      <section className="portal-card p-5 space-y-4">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-semibold text-white">Capital allocation by SPV</h3>
            <p className="text-xs text-[#8EA7C7]">Share weight and rental payout telemetry across holdings</p>
          </div>
          {holdings.length > 0 && (
            <button
              type="button"
              onClick={() => navigatePortal('reports')}
              className="text-xs font-semibold text-[#C5A880] hover:text-[#D4BA94] min-h-[40px]"
            >
              View statements
            </button>
          )}
        </div>

        {holdings.length === 0 ? (
          <EmptyState
            icon={<Building2 className="w-5 h-5" />}
            title="No allocated capital"
            description="Once you subscribe to an offering, your capital weight and per-SPV distribution stream will appear here."
            actionLabel="Browse properties"
            onAction={() => navigatePortal('explore')}
          />
        ) : (
          <div className="divide-y divide-[#1D3860]">
            {holdings.map((holding) => {
              const weightPct =
                totalHoldingsValue > 0 ? (holding.currentValue / totalHoldingsValue) * 100 : 0;
              const distMatch = distSummaries.find(
                (d: any) => d.propertyId === holding.propertyId || d.propertyTitle === holding.propertyTitle
              );

              return (
                <div key={holding.id} className="py-4 first:pt-1 last:pb-1 space-y-2.5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => navigatePortal('property-detail', { propertySlug: holding.propertyId })}
                      className="text-left group"
                    >
                      <div className="text-sm font-semibold text-white group-hover:text-[#C5A880] transition-colors">
                        {holding.propertyTitle}
                      </div>
                      <div className="text-xs text-[#8EA7C7] portal-tabular mt-0.5">
                        {formatNumber(holding.tokensPurchased)} shares · {formatNumber(weightPct, 1)}% weight
                        {distMatch?.distributionFrequency ? ` · ${distMatch.distributionFrequency}` : ''}
                      </div>
                    </button>

                    <div className="text-left sm:text-right portal-tabular">
                      <div className="text-sm font-bold text-white">{formatEuro(holding.currentValue)}</div>
                      <div className="text-xs text-[#34D399]">
                        Earned {formatEuro(distMatch?.paymentsReceivedEUR ?? holding.dividendsReceived)}
                      </div>
                    </div>
                  </div>

                  <div className="portal-progress-track">
                    <div
                      className="portal-progress-fill"
                      style={{ width: `${Math.min(100, Math.max(2, weightPct))}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};
