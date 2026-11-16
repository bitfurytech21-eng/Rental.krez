import React from 'react';
import { Building2, TrendingUp, ArrowRight } from 'lucide-react';
import { usePortal } from '../state/PortalContext';
import { formatEuro, formatShortDate } from '../utils/format';
import { StatTile } from '../components/StatTile';
import { EmptyState } from '../components/EmptyState';
import { LoadingSkeleton, ErrorBanner } from '../components/LoadingSkeleton';

export const PortfolioPage: React.FC = () => {
  const { loading, error, portfolio, navigatePortal, refreshAll } = usePortal();

  if (loading && !portfolio) {
    return <LoadingSkeleton rows={4} />;
  }

  const holdings = portfolio?.holdings || [];
  const totalHoldings = portfolio?.totalHoldingsValue || 0;
  const totalTokens = portfolio?.totalTokensHeld || 0;
  const totalDividends = portfolio?.totalDividendsReceived || 0;
  const totalProjected = holdings.reduce((sum, h) => sum + Number(h.projectedAnnualDividend || 0), 0);

  return (
    <div className="space-y-6">
      {error && <ErrorBanner message={error} onRetry={refreshAll} />}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-heading font-bold text-white">Property holdings</h2>
          <p className="text-sm text-[#8EA7C7] mt-0.5">
            Tokenized SPV share certificates held in your investor account.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigatePortal('analytics')}
            className="portal-btn-secondary"
          >
            <TrendingUp className="w-4 h-4" />
            <span>Yield analytics</span>
          </button>
          <button
            type="button"
            onClick={() => navigatePortal('explore')}
            className="portal-btn-primary"
          >
            <span>Add position</span>
          </button>
        </div>
      </div>

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatTile label="Holdings valuation" value={formatEuro(totalHoldings)} tone="accent" />
        <StatTile label="Total shares held" value={totalTokens.toLocaleString('en-IE')} />
        <StatTile label="Projected annual rent" value={formatEuro(totalProjected)} />
        <StatTile label="Distributions settled" value={formatEuro(totalDividends)} tone="positive" />
      </section>

      {holdings.length === 0 ? (
        <EmptyState
          icon={<Building2 className="w-5 h-5" />}
          title="Your portfolio has no SPV shares yet"
          description="Explore available offerings to allocate capital across curated residential and commercial properties."
          actionLabel="Explore properties"
          onAction={() => navigatePortal('explore')}
        />
      ) : (
        <div className="portal-card divide-y divide-[#1D3860]">
          {holdings.map((holding) => (
            <div
              key={holding.id}
              className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-[#152E54]/40 transition-colors"
            >
              <div className="space-y-1 min-w-0">
                <div className="text-base font-semibold text-white truncate">
                  {holding.propertyTitle}
                </div>
                <div className="text-xs text-[#8EA7C7] flex items-center gap-2 flex-wrap portal-tabular">
                  <span>{holding.tokensPurchased} shares</span>
                  <span aria-hidden="true">·</span>
                  <span>Cost {formatEuro(holding.totalCost)}</span>
                  <span aria-hidden="true">·</span>
                  <span>Acquired {formatShortDate(holding.purchaseDate)}</span>
                  {holding.certificateId && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono">{holding.certificateId}</span>
                    </>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-5 shrink-0">
                <div className="text-left sm:text-right">
                  <div className="text-base font-bold text-white portal-tabular">
                    {formatEuro(holding.currentValue)}
                  </div>
                  <div className="text-xs text-[#34D399] portal-tabular">
                    +{formatEuro(holding.projectedAnnualDividend)} / yr est.
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    navigatePortal('property-detail', { propertySlug: holding.propertyId })
                  }
                  className="portal-btn-secondary !min-h-[40px] !px-3.5 text-xs"
                >
                  <span>Dossier</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
