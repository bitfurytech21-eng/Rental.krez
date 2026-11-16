import React, { useState } from 'react';
import { Investment } from '../../types/investment';
import { formatCurrency, formatPercent, formatDate } from '../../lib/utils';
import { Building2, ArrowRight, Printer, FileText } from 'lucide-react';
import { DocumentViewerModal } from './DocumentViewerModal';
import { printPortfolioReport, PortfolioPrintData } from '../../lib/printService';
import { useAuth } from '../../lib/auth';

interface PortfolioOverviewProps {
  investments: Investment[];
  onSelectProperty?: (propertyId: string) => void;
  onExploreMore?: () => void;
}

export const PortfolioOverview: React.FC<PortfolioOverviewProps> = ({
  investments,
  onSelectProperty,
  onExploreMore,
}) => {
  const { user } = useAuth();
  const [selectedInvestmentForDocs, setSelectedInvestmentForDocs] = useState<Investment | null>(null);

  const getReportData = (): PortfolioPrintData => {
    const totalValue = investments.reduce((sum, inv) => sum + (inv.currentValuation || inv.totalAmountInvested), 0);
    const totalTokens = investments.reduce((sum, inv) => sum + inv.tokensPurchased, 0);
    const totalDividends = investments.reduce((sum, inv) => sum + (inv.totalDividendsReceived || 0), 0);

    return {
      investor: {
        fullName: user?.fullName || 'Verified Investor',
        email: user?.email || 'investor@lagence.com',
        id: user?.id || 'usr-investor-01',
        kycStatus: user?.kycStatus ? String(user.kycStatus) : 'Verified',
      },
      summary: {
        totalHoldingsValue: totalValue,
        totalTokensHeld: totalTokens,
        activePropertiesCount: investments.length,
        totalDividendsReceived: totalDividends,
        walletBalance: user?.walletBalance || 0,
        generatedAt: new Date().toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }),
      },
      holdings: investments.map((inv) => ({
        id: inv.id,
        propertyTitle: inv.propertyTitle,
        tokensPurchased: inv.tokensPurchased,
        totalCost: inv.totalAmountInvested,
        currentValue: inv.currentValuation || inv.totalAmountInvested,
        projectedAnnualDividend: (inv.totalAmountInvested * inv.estimatedAnnualYield) / 100,
        dividendsReceived: inv.totalDividendsReceived || 0,
        purchaseDate: formatDate(inv.purchasedAt || inv.startDate),
        certificateId: inv.certificateId || `CERT-${inv.id.slice(0, 8)}`,
      })),
    };
  };

  const handlePrintPortfolio = () => {
    const reportData = getReportData();
    printPortfolioReport(reportData);
  };

  if (investments.length === 0) {
    return (
      <div className="rounded-[18px] border border-dashed border-[var(--dash-card-border)] bg-[var(--dash-card)] p-7 sm:p-9 text-center space-y-3">
        <div className="w-11 h-11 rounded-xl bg-[var(--dash-inner)] border border-[var(--dash-card-border)] text-[var(--dash-accent)] flex items-center justify-center mx-auto">
          <Building2 className="w-5 h-5" />
        </div>
        <div className="space-y-1 max-w-sm mx-auto">
          <h3 className="text-sm sm:text-base font-bold text-[var(--dash-text)]">No active property holdings</h3>
          <p className="text-xs text-[var(--dash-text-muted)] leading-relaxed">
            Explore vetted European residential and commercial SPV properties to start building your portfolio.
          </p>
        </div>
        {onExploreMore && (
          <button
            type="button"
            onClick={onExploreMore}
            className="portal-btn h-10 text-xs inline-flex items-center gap-1.5 cursor-pointer"
          >
            <span>Explore properties</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3.5">
      <div className="flex justify-between items-center gap-3">
        <div>
          <h3 className="text-sm sm:text-base font-bold text-[var(--dash-text)] tracking-tight">
            Active Property Assets
          </h3>
          <p className="text-xs text-[var(--dash-text-muted)]">
            {investments.length} {investments.length === 1 ? 'Holding' : 'Holdings'} generating monthly distributions
          </p>
        </div>

        <button
          type="button"
          onClick={handlePrintPortfolio}
          className="dashboard-secondary-action min-h-[36px] text-xs cursor-pointer"
          title="Print official Portfolio Performance Report"
          aria-label="Print official portfolio performance report"
        >
          <Printer className="w-3.5 h-3.5 text-[var(--dash-accent)]" />
          <span>Print Report</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {investments.map((inv) => (
          <div
            key={inv.id}
            className="portal-card p-4 sm:p-5 flex flex-col justify-between hover:border-[var(--dash-inner-border)] transition-colors"
          >
            <div>
              <div className="flex items-start justify-between gap-2.5 mb-3.5">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-11 h-11 rounded-xl overflow-hidden bg-[var(--dash-inner)] shrink-0 border border-[var(--dash-card-border)]">
                    <img
                      src={inv.propertyImage}
                      alt={inv.propertyTitle}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs sm:text-sm font-bold text-[var(--dash-text)] truncate">
                      {inv.propertyTitle}
                    </h4>
                    <span className="text-[11px] text-[var(--dash-text-muted)] truncate block mt-0.5">
                      {inv.propertyLocation}
                    </span>
                  </div>
                </div>

                <span className="portal-pill ok">Active</span>
              </div>

              <div className="grid grid-cols-3 gap-2 p-3 bg-[var(--dash-inner)] rounded-xl border border-[var(--dash-card-border)] text-[11px] mb-3.5">
                <div>
                  <span className="text-[var(--dash-text-muted)] block text-[9.5px] font-semibold uppercase tracking-wider">
                    Holding
                  </span>
                  <span className="financial-num text-[var(--dash-text)] font-bold text-xs sm:text-[13px] block mt-0.5">
                    {inv.tokensPurchased} Units
                  </span>
                  <span className="financial-num text-[10.5px] text-[var(--dash-text-muted)] block">
                    {formatCurrency(inv.totalAmountInvested)}
                  </span>
                </div>

                <div className="border-x border-[var(--dash-card-border)] px-2.5">
                  <span className="text-[9.5px] font-semibold text-[var(--dash-text-muted)] uppercase block truncate">
                    Annual Yield
                  </span>
                  <span className="financial-num text-[var(--dash-accent)] font-bold text-xs sm:text-[13px] block mt-0.5">
                    {formatPercent(inv.estimatedAnnualYield)}
                  </span>
                  <span className="text-[9.5px] text-[var(--dash-text-muted)] block">Projected</span>
                </div>

                <div>
                  <span className="text-[9.5px] font-semibold text-[var(--dash-text-muted)] uppercase block truncate">
                    Performance
                  </span>
                  <span className="financial-num text-[var(--dash-positive)] font-bold text-xs sm:text-[13px] block mt-0.5">
                    +{formatCurrency(inv.totalDividendsReceived)}
                  </span>
                  <span className="text-[9.5px] text-[var(--dash-positive)] block">Realized</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs pt-2.5 border-t border-[var(--dash-card-border)]">
              <button
                type="button"
                onClick={() => setSelectedInvestmentForDocs(inv)}
                className="font-semibold text-[var(--dash-text)] flex items-center gap-1.5 bg-[var(--dash-inner)] hover:bg-[var(--dash-hover)] border border-[var(--dash-card-border)] px-3 py-1.5 rounded-lg text-[11px] cursor-pointer transition-colors"
                aria-label={`View legal documents for ${inv.propertyTitle}`}
              >
                <FileText className="w-3.5 h-3.5 text-[var(--dash-accent)]" /> Legal Docs
              </button>

              <div className="flex items-center gap-2.5">
                <span className="font-mono text-[9.5px] text-[var(--dash-text-muted)] hidden sm:inline">
                  {inv.certificateId}
                </span>
                {onSelectProperty && (
                  <button
                    type="button"
                    onClick={() => onSelectProperty(inv.propertyId)}
                    className="cinematic-btn-primary flex items-center gap-1.5 text-xs px-3.5 py-1.5 rounded-lg font-bold cursor-pointer"
                    aria-label={`View asset ${inv.propertyTitle}`}
                  >
                    <span>View Asset</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <DocumentViewerModal
        investment={selectedInvestmentForDocs}
        isOpen={Boolean(selectedInvestmentForDocs)}
        onClose={() => setSelectedInvestmentForDocs(null)}
      />
    </div>
  );
};
