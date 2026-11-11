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
      <div className="border border-[#303030] rounded-xl p-6 sm:p-8 text-center bg-[#151515]">
        <div className="w-11 h-11 rounded-lg bg-[#202020] border border-[#303030] text-white flex items-center justify-center mx-auto mb-3 shadow-inner">
          <Building2 className="w-5 h-5 text-[#35C9F5]" />
        </div>
        <h3 className="text-sm sm:text-base font-bold text-white mb-1.5 tracking-tight">No Active Property Holdings Yet</h3>
        <p className="text-xs text-[#A0A0A0] max-w-sm mx-auto mb-4 leading-relaxed">
          Start building your real estate portfolio today. Choose from our vetted European residential, coliving, and holiday properties.
        </p>
        {onExploreMore && (
          <button 
            onClick={onExploreMore} 
            className="bg-white hover:bg-[#E5E5E5] text-black px-4 py-2 text-xs font-semibold rounded-lg shadow-xs transition-all cursor-pointer active:scale-[0.98]"
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
          <h3 className="text-sm sm:text-base font-bold text-white tracking-tight">Active Property Assets</h3>
          <p className="text-xs text-[#A0A0A0]">
            {investments.length} {investments.length === 1 ? 'Holding' : 'Holdings'} generating monthly distributions
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handlePrintPortfolio}
            className="py-1.5 px-3 bg-[#202020] hover:bg-[#282828] border border-[#303030] text-white text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-[0.98]"
            title="Print official Portfolio Performance Report"
          >
            <Printer className="w-3.5 h-3.5 text-[#35C9F5]" />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {investments.map((inv, idx) => (
          <div
            key={inv.id}
            className={`cinematic-card cinematic-card-interactive p-4 sm:p-5 rounded-[18px] flex flex-col justify-between animate-cinematic-reveal-${(idx % 4) + 1}`}
          >
            <div>
              <div className="flex items-start justify-between gap-2.5 mb-3.5">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-11 h-11 rounded-xl overflow-hidden bg-[#1D1E1E] shrink-0 border border-white/[0.12] shadow-sm">
                    <img
                      src={inv.propertyImage}
                      alt={inv.propertyTitle}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs sm:text-sm font-bold text-[#F5F5F2] truncate">{inv.propertyTitle}</h4>
                    <span className="text-[11px] text-[#A5A6A5] truncate block mt-0.5">{inv.propertyLocation}</span>
                  </div>
                </div>

                <span className="text-[10px] font-semibold text-[#43C98B] bg-[#43C98B]/10 px-2.5 py-0.5 rounded-full border border-[#43C98B]/25 shrink-0 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#43C98B]" /> Active
                </span>
              </div>

              {/* Stats Grid with Clean Tabular Numbers */}
              <div className="grid grid-cols-3 gap-2 p-3 bg-[#141515]/85 rounded-xl border border-white/[0.08] text-[11px] mb-3.5 shadow-inner">
                <div>
                  <span className="text-[#777979] block text-[9.5px] font-semibold uppercase tracking-wider">Holding</span>
                  <span className="financial-num text-[#F5F5F2] text-xs sm:text-[13.5px] block mt-0.5">{inv.tokensPurchased} Units</span>
                  <span className="financial-num text-[10.5px] text-[#777979] block font-medium">{formatCurrency(inv.totalAmountInvested)}</span>
                </div>

                <div className="border-x border-white/[0.08] px-2.5">
                  <span className="text-[9.5px] font-semibold text-[#777979] uppercase block truncate">Annual Yield</span>
                  <span className="financial-num text-[#55BDE8] text-xs sm:text-[13.5px] block mt-0.5">{formatPercent(inv.estimatedAnnualYield)}</span>
                  <span className="text-[9.5px] text-[#777979] block font-medium">Projected</span>
                </div>

                <div>
                  <span className="text-[9.5px] font-semibold text-[#777979] uppercase block truncate">Performance</span>
                  <span className="financial-num text-[#43C98B] text-xs sm:text-[13.5px] block mt-0.5">
                    +{formatCurrency(inv.totalDividendsReceived)}
                  </span>
                  <span className="text-[9.5px] text-[#43C98B] block font-medium">Realized</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs pt-2.5 border-t border-white/[0.08]">
              <button
                type="button"
                onClick={() => setSelectedInvestmentForDocs(inv)}
                className="font-semibold text-[#F5F5F2] flex items-center gap-1.5 bg-[#1D1E1E] hover:bg-[#252626] border border-white/[0.1] px-3 py-1.5 rounded-lg text-[11px] cursor-pointer transition-colors active:scale-[0.98]"
              >
                <FileText className="w-3.5 h-3.5 text-[#55BDE8]" /> Legal Docs
              </button>

              <div className="flex items-center gap-2.5">
                <span className="font-mono text-[9.5px] text-[#A5A6A5] hidden sm:inline">{inv.certificateId}</span>
                {onSelectProperty && (
                  <button
                    onClick={() => onSelectProperty(inv.propertyId)}
                    className="cinematic-btn cinematic-btn-primary flex items-center gap-1.5 text-xs px-3.5 py-1.5 rounded-lg font-bold cursor-pointer"
                  >
                    <span>View Asset</span>
                    <ArrowRight className="w-3.5 h-3.5 text-[#070A09]" />
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
