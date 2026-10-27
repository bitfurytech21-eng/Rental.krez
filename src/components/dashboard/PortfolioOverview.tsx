import React, { useState } from 'react';
import { Investment } from '../../types/investment';
import { formatCurrency, formatPercent, formatDate } from '../../lib/utils';
import { Building2, Award, Calendar, ArrowRight, FileText, Printer } from 'lucide-react';
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

  const handlePrintPortfolio = () => {
    const totalValue = investments.reduce((sum, inv) => sum + (inv.currentValuation || inv.totalAmountInvested), 0);
    const totalTokens = investments.reduce((sum, inv) => sum + inv.tokensPurchased, 0);
    const totalDividends = investments.reduce((sum, inv) => sum + (inv.totalDividendsReceived || 0), 0);

    const reportData: PortfolioPrintData = {
      investor: {
        fullName: user?.fullName || 'Verified Investor',
        email: user?.email || 'investor@lagence.com',
        id: user?.id || 'usr-investor-01',
        kycStatus: user?.kycStatus ? String(user.kycStatus) : 'Verified'
      },
      summary: {
        totalHoldingsValue: totalValue,
        totalTokensHeld: totalTokens,
        activePropertiesCount: investments.length,
        totalDividendsReceived: totalDividends,
        walletBalance: user?.walletBalance || 0,
        generatedAt: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })
      },
      holdings: investments.map(inv => ({
        id: inv.id,
        propertyTitle: inv.propertyTitle,
        tokensPurchased: inv.tokensPurchased,
        totalCost: inv.totalAmountInvested,
        currentValue: inv.currentValuation || inv.totalAmountInvested,
        projectedAnnualDividend: (inv.totalAmountInvested * inv.estimatedAnnualYield) / 100,
        dividendsReceived: inv.totalDividendsReceived || 0,
        purchaseDate: formatDate(inv.purchasedAt || inv.startDate),
        certificateId: inv.certificateId || `CERT-${inv.id.slice(0, 8)}`
      }))
    };

    printPortfolioReport(reportData);
  };

  if (investments.length === 0) {
    return (
      <div className="border border-[#E3E8E3] rounded-xl p-5 sm:p-6 text-center bg-white">
        <div className="w-10 h-10 rounded-xl bg-[#F6F7F4] border border-[#E3E8E3] text-[#18211F] flex items-center justify-center mx-auto mb-2.5">
          <Building2 className="w-5 h-5" />
        </div>
        <h3 className="text-xs sm:text-sm font-bold text-[#18211F] mb-1">No Active Property Holdings Yet</h3>
        <p className="text-[10.5px] sm:text-xs text-[#69736F] max-w-sm mx-auto mb-3.5 leading-relaxed">
          Start building your real estate portfolio today. Choose from our vetted European residential, coliving, and holiday properties.
        </p>
        {onExploreMore && (
          <button 
            onClick={onExploreMore} 
            className="bg-[#182D2A] hover:bg-[#24423C] text-white px-4 py-1.5 text-xs font-semibold rounded-full shadow-xs transition-colors cursor-pointer"
          >
            Browse Active Properties
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-sm sm:text-base font-bold text-[#172B2A]">Active Property Assets</h3>
          <p className="text-xs text-[#71817D]">
            {investments.length} {investments.length === 1 ? 'Holding' : 'Holdings'} generating monthly distributions
          </p>
        </div>

        <button
          onClick={handlePrintPortfolio}
          className="py-1.5 px-3 bg-white hover:bg-[#EAF8F4] border border-[#E4EEEA] text-[#087F5B] text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
          title="Print official Portfolio Performance Report"
        >
          <Printer className="w-3.5 h-3.5" />
          <span>Print Portfolio Report</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {investments.map((inv) => (
          <div
            key={inv.id}
            className="bg-white p-3.5 sm:p-4 rounded-2xl border border-[#E4EEEA] shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between gap-2.5 mb-2.5">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl overflow-hidden bg-gray-100 shrink-0 border border-[#E4EEEA]">
                    <img
                      src={inv.propertyImage}
                      alt={inv.propertyTitle}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs sm:text-sm font-bold text-[#172B2A] truncate">{inv.propertyTitle}</h4>
                    <span className="text-[11px] text-[#71817D] truncate block">{inv.propertyLocation}</span>
                  </div>
                </div>

                <span className="text-[9.5px] font-bold tracking-wide text-[#087F5B] bg-[#DDF5EC] px-2 py-0.5 rounded-full border border-[#BCE8D7] shrink-0">
                  Active
                </span>
              </div>

              {/* Stats Grid with Distinct Projected vs Realized Performance Labels */}
              <div className="grid grid-cols-3 gap-2 p-2.5 bg-[#F6FAF8] rounded-xl border border-[#E4EEEA] text-[11px] mb-2">
                <div>
                  <span className="text-[#71817D] block text-[9px] font-semibold uppercase tracking-wider">Holding</span>
                  <span className="font-bold font-mono tabular-nums text-[#172B2A] text-xs sm:text-[13px] block mt-0.5">{inv.tokensPurchased} Units</span>
                  <span className="text-[9.5px] text-[#71817D] block font-mono font-medium">{formatCurrency(inv.totalAmountInvested)}</span>
                </div>

                <div className="border-x border-[#E4EEEA] px-1.5">
                  <div className="flex items-center gap-1 mb-0.5">
                    <span className="inline-flex items-center gap-0.5 text-[8px] font-extrabold text-[#087F5B] bg-[#DDF5EC] border border-[#BCE8D7] px-1.5 py-0.2 rounded-full uppercase tracking-wider">
                      Projected
                    </span>
                  </div>
                  <span className="text-[9px] font-bold text-[#71817D] uppercase block truncate">Annual Yield</span>
                  <span className="font-bold font-mono tabular-nums text-[#087F5B] text-xs sm:text-[13px] block mt-0.5">{formatPercent(inv.estimatedAnnualYield)}</span>
                </div>

                <div>
                  <div className="flex items-center gap-1 mb-0.5">
                    <span className="inline-flex items-center gap-0.5 text-[8px] font-extrabold text-[#075B46] bg-[#EAF8F4] border border-[#087F5B]/30 px-1.5 py-0.2 rounded-full uppercase tracking-wider">
                      Realized
                    </span>
                  </div>
                  <span className="text-[9px] font-bold text-[#71817D] uppercase block truncate">Performance</span>
                  <span className="font-bold font-mono tabular-nums text-[#075B46] text-xs sm:text-[13px] block mt-0.5">
                    +{formatCurrency(inv.totalDividendsReceived)}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs pt-1.5">
              <button
                type="button"
                onClick={() => setSelectedInvestmentForDocs(inv)}
                className="font-semibold text-[#075B46] hover:underline flex items-center gap-1.5 bg-[#DDF5EC] border border-[#BCE8D7] px-2 py-1 rounded-lg text-[10.5px] cursor-pointer transition-colors"
              >
                <FileText className="w-3 h-3 text-[#087F5B]" /> Legal Docs
              </button>

              <div className="flex items-center gap-2">
                <span className="font-mono text-[9px] text-[#71817D] hidden sm:inline">{inv.certificateId}</span>
                {onSelectProperty && (
                  <button
                    onClick={() => onSelectProperty(inv.propertyId)}
                    className="font-bold text-[#087F5B] hover:text-[#075B46] flex items-center gap-1 text-xs cursor-pointer transition-colors"
                  >
                    View Asset <ArrowRight className="w-3 h-3" />
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
