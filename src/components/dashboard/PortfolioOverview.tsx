import React, { useState } from 'react';
import { Investment } from '../../types/investment';
import { formatCurrency, formatPercent, formatDate } from '../../lib/utils';
import { Building2, Award, Calendar, ArrowRight, Printer, Table as TableIcon, FileText } from 'lucide-react';
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
  };

  const handlePrintPortfolio = () => {
    const reportData = getReportData();
    printPortfolioReport(reportData);
  };



  if (investments.length === 0) {
    return (
      <div className="border border-[#303030] rounded-2xl p-6 sm:p-8 text-center bg-[#151515]">
        <div className="w-12 h-12 rounded-xl bg-[#1D1D1D] border border-[#303030] text-white flex items-center justify-center mx-auto mb-3 shadow-inner">
          <Building2 className="w-6 h-6 text-[#00D2FF]" />
        </div>
        <h3 className="text-sm sm:text-base font-bold text-white mb-1.5">No Active Property Holdings Yet</h3>
        <p className="text-xs text-[#999999] max-w-sm mx-auto mb-4 leading-relaxed">
          Start building your real estate portfolio today. Choose from our vetted European residential, coliving, and holiday properties.
        </p>
        {onExploreMore && (
          <button 
            onClick={onExploreMore} 
            className="bg-white hover:bg-neutral-200 text-black px-5 py-2 text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer"
          >
            Browse Active Properties
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-sm sm:text-base font-bold text-white">Active Property Assets</h3>
          <p className="text-xs text-[#999999]">
            {investments.length} {investments.length === 1 ? 'Holding' : 'Holdings'} generating monthly distributions
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handlePrintPortfolio}
            className="py-1.5 px-3 bg-[#1D1D1D] hover:bg-[#252525] border border-[#303030] text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
            title="Print official Portfolio Performance Report"
          >
            <Printer className="w-3.5 h-3.5 text-[#00D2FF]" />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {investments.map((inv) => (
          <div
            key={inv.id}
            className="bg-[#151515] p-4 rounded-2xl border border-[#303030] shadow-lg hover:border-[#454545] transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between gap-2.5 mb-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-11 h-11 rounded-xl overflow-hidden bg-[#1D1D1D] shrink-0 border border-[#303030]">
                    <img
                      src={inv.propertyImage}
                      alt={inv.propertyTitle}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs sm:text-sm font-bold text-white truncate">{inv.propertyTitle}</h4>
                    <span className="text-[11px] text-[#999999] truncate block mt-0.5">{inv.propertyLocation}</span>
                  </div>
                </div>

                <span className="text-[9.5px] font-bold tracking-wide text-[#2ECC71] bg-[#2ECC71]/15 px-2.5 py-0.5 rounded-full border border-[#2ECC71]/30 shrink-0">
                  Active
                </span>
              </div>

              {/* Stats Grid with Distinct Projected vs Realized Performance Labels */}
              <div className="grid grid-cols-3 gap-2 p-2.5 bg-[#1D1D1D] rounded-xl border border-[#303030] text-[11px] mb-3">
                <div>
                  <span className="text-[#999999] block text-[9px] font-semibold uppercase tracking-wider">Holding</span>
                  <span className="font-bold font-mono tabular-nums text-white text-xs sm:text-[13px] block mt-0.5">{inv.tokensPurchased} Units</span>
                  <span className="text-[9.5px] text-[#D0D0D0] block font-mono font-medium">{formatCurrency(inv.totalAmountInvested)}</span>
                </div>

                <div className="border-x border-[#303030] px-2">
                  <div className="flex items-center gap-1 mb-0.5">
                    <span className="inline-flex items-center gap-0.5 text-[8px] font-extrabold text-[#00D2FF] bg-[#00D2FF]/15 border border-[#00D2FF]/30 px-1.5 py-0.2 rounded-full uppercase tracking-wider">
                      Projected
                    </span>
                  </div>
                  <span className="text-[9px] font-bold text-[#999999] uppercase block truncate">Annual Yield</span>
                  <span className="font-bold font-mono tabular-nums text-[#00D2FF] text-xs sm:text-[13px] block mt-0.5">{formatPercent(inv.estimatedAnnualYield)}</span>
                </div>

                <div>
                  <div className="flex items-center gap-1 mb-0.5">
                    <span className="inline-flex items-center gap-0.5 text-[8px] font-extrabold text-[#2ECC71] bg-[#2ECC71]/15 border border-[#2ECC71]/30 px-1.5 py-0.2 rounded-full uppercase tracking-wider">
                      Realized
                    </span>
                  </div>
                  <span className="text-[9px] font-bold text-[#999999] uppercase block truncate">Performance</span>
                  <span className="font-bold font-mono tabular-nums text-[#2ECC71] text-xs sm:text-[13px] block mt-0.5">
                    +{formatCurrency(inv.totalDividendsReceived)}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs pt-1.5 border-t border-[#303030]">
              <button
                type="button"
                onClick={() => setSelectedInvestmentForDocs(inv)}
                className="font-semibold text-white hover:text-white flex items-center gap-1.5 bg-[#1D1D1D] hover:bg-[#262626] border border-[#303030] px-2.5 py-1 rounded-lg text-[10.5px] cursor-pointer transition-colors"
              >
                <FileText className="w-3 h-3 text-[#00D2FF]" /> Legal Docs
              </button>

              <div className="flex items-center gap-2">
                <span className="font-mono text-[9px] text-[#999999] hidden sm:inline">{inv.certificateId}</span>
                {onSelectProperty && (
                  <button
                    onClick={() => onSelectProperty(inv.propertyId)}
                    className="font-bold text-white hover:text-[#D0D0D0] flex items-center gap-1 text-xs cursor-pointer transition-colors bg-white hover:bg-neutral-200 text-black px-2.5 py-1 rounded-lg font-bold"
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
