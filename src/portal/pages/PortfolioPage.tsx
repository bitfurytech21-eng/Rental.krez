import React from 'react';
import { Building2, TrendingUp, ArrowRight } from 'lucide-react';
import { usePortal } from '../state/PortalContext';
import { formatEuro, formatNumber, formatShortDate } from '../utils/format';
import { StatTile } from '../components/StatTile';
import { EmptyState } from '../components/EmptyState';
import { LoadingSkeleton, ErrorBanner } from '../components/LoadingSkeleton';

export const PortfolioPage: React.FC = () => {
  const { loading, error, portfolio, sampleDataEnabled, navigatePortal, refreshAll } = usePortal();

  if (loading && !sampleDataEnabled && !portfolio) {
    return <LoadingSkeleton rows={4} />;
  }

  const holdings = portfolio?.holdings || [];
  const totalHoldingsValue =
    holdings.length > 0
      ? holdings.reduce(
          (sum, h) => sum + (h.currentValueCents != null ? h.currentValueCents / 100 : Number(h.currentValue || 0)),
          0
        )
      : portfolio?.totalHoldingsValue || 0;
  const totalCost = holdings.reduce(
    (sum, h) => sum + (h.totalCostCents != null ? h.totalCostCents / 100 : Number(h.totalCost || 0)),
    0
  );
  const netGainLoss = holdings.reduce(
    (sum, h) =>
      sum +
      (h.gainCents != null
        ? h.gainCents / 100
        : Number(h.currentValue || 0) - Number(h.totalCost || 0)),
    0
  );
  const netGainPct = totalCost > 0 ? (netGainLoss / totalCost) * 100 : 0;
  const propertyCount = holdings.length;

  return (
    <div className="space-y-6">
      {error && <ErrorBanner message={error} onRetry={refreshAll} />}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-heading font-bold text-[#F2F5F4]">Portfolio</h2>
          <p className="text-sm text-[#8FA1A8] mt-0.5">
            Current property holdings valuation, share count, and unrealized gain/loss.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => navigatePortal('analytics')}
            className="portal-btn-secondary min-h-[44px]"
          >
            <TrendingUp className="w-4 h-4 text-[#6FD8B0]" />
            <span>Analytics</span>
          </button>
          <button
            type="button"
            onClick={() => navigatePortal('explore')}
            className="portal-btn-primary min-h-[44px]"
          >
            <span>Explore properties</span>
          </button>
        </div>
      </div>

      <section className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <StatTile
          label="Current value"
          value={formatEuro(totalHoldingsValue)}
          sublabel="Active SPV shares"
          tone="accent"
        />
        <StatTile
          label="Properties"
          value={String(propertyCount)}
          sublabel={`${formatNumber(portfolio?.totalTokensHeld || 0)} shares held`}
        />
        <StatTile
          label="Total gain / loss"
          value={`${netGainLoss >= 0 ? '+' : ''}${formatEuro(netGainLoss)}`}
          sublabel={`${netGainLoss >= 0 ? '+' : ''}${formatNumber(netGainPct, 2)}% vs cost basis`}
          tone={netGainLoss >= 0 ? 'positive' : 'default'}
        />
      </section>

      {holdings.length === 0 ? (
        <EmptyState
          icon={<Building2 className="w-5 h-5" />}
          title="No property holdings yet"
          description="Your fractional real estate positions will appear here after your first subscription settles."
          actionLabel="Explore properties"
          onAction={() => navigatePortal('explore')}
        />
      ) : (
        <div className="portal-card-list divide-y divide-[#1F2C33]">
          {holdings.map((holding) => {
            const currentValue =
              holding.currentValueCents != null
                ? holding.currentValueCents / 100
                : Number(holding.currentValue || 0);
            const costValue =
              holding.totalCostCents != null
                ? holding.totalCostCents / 100
                : Number(holding.totalCost || 0);
            const gain =
              holding.gainCents != null
                ? holding.gainCents / 100
                : currentValue - costValue;
            const gainPct = costValue > 0 ? (gain / costValue) * 100 : 0;
            const gainPositive = gain >= 0;

            return (
              <div
                key={holding.id}
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-[#172228]/70 transition-colors"
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-base font-medium text-[#F2F5F4] truncate">
                      {holding.propertyTitle}
                    </span>
                    {holding.city && (
                      <span className="text-xs text-[#8FA1A8] shrink-0">· {holding.city}</span>
                    )}
                  </div>
                  <div className="text-xs text-[#8FA1A8] flex items-center gap-2 flex-wrap portal-tabular">
                    <span>{holding.tokensPurchased} shares</span>
                    <span aria-hidden="true">·</span>
                    <span>Cost {formatEuro(costValue)}</span>
                    {holding.purchaseDate && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span>Acquired {formatShortDate(holding.purchaseDate)}</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0">
                  <div className="text-left sm:text-right">
                    <div className="text-base font-bold text-[#F2F5F4] portal-tabular">
                      {formatEuro(currentValue)}
                    </div>
                    <div
                      className={`text-xs font-semibold portal-tabular ${
                        gainPositive ? 'text-[#6FD8B0]' : 'text-[#FB7185]'
                      }`}
                    >
                      {gainPositive ? '+' : ''}
                      {formatEuro(gain)} ({gainPositive ? '+' : ''}
                      {formatNumber(gainPct, 2)}%)
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      navigatePortal('property-detail', { propertySlug: holding.propertyId })
                    }
                    className="portal-btn-secondary min-h-[44px]"
                  >
                    <span>View</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
