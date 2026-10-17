import React, { useState } from 'react';
import { Investment } from '../../types/investment';
import { formatCurrency, formatPercent, formatDate } from '../../lib/utils';
import { Building2, Award, Calendar, ArrowRight, FileText } from 'lucide-react';
import { DocumentViewerModal } from './DocumentViewerModal';

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
  const [selectedInvestmentForDocs, setSelectedInvestmentForDocs] = useState<Investment | null>(null);

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
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-sm sm:text-base font-bold dash-text">Active Property Assets</h3>
          <p className="text-[11px] dash-muted">
            {investments.length} {investments.length === 1 ? 'Holding' : 'Holdings'} generating monthly distributions
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {investments.map((inv) => (
          <div
            key={inv.id}
            className="dash-card p-3.5 sm:p-4 rounded-xl border border-inherit/40 shadow-xs hover:shadow-sm transition-shadow flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between gap-2.5 mb-2.5">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-100 shrink-0">
                    <img
                      src={inv.propertyImage}
                      alt={inv.propertyTitle}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs sm:text-sm font-bold dash-text truncate">{inv.propertyTitle}</h4>
                    <span className="text-[11px] dash-muted truncate block">{inv.propertyLocation}</span>
                  </div>
                </div>

                <span className="text-[9px] font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-500 border border-emerald-500/30 px-2 py-0.5 rounded-full shrink-0">
                  Active
                </span>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-3 gap-1.5 py-2 border-y border-inherit/30 text-xs mb-2">
                <div>
                  <span className="dash-muted block text-[10px]">Tokens</span>
                  <span className="font-bold dash-text text-xs">{inv.tokensPurchased} ({formatCurrency(inv.totalAmountInvested)})</span>
                </div>
                <div>
                  <span className="dash-muted block text-[10px]">Est. Yield</span>
                  <span className="font-bold text-emerald-500 text-xs">{formatPercent(inv.estimatedAnnualYield)}</span>
                </div>
                <div>
                  <span className="dash-muted block text-[10px]">Monthly Payout</span>
                  <span className="font-bold dash-text text-xs">+{formatCurrency(inv.projectedMonthlyIncome)}/mo</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs pt-1.5">
              <button
                type="button"
                onClick={() => setSelectedInvestmentForDocs(inv)}
                className="font-medium text-emerald-500 hover:underline flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-lg text-[11px]"
              >
                <FileText className="w-3 h-3" /> Legal Docs
              </button>

              <div className="flex items-center gap-2.5">
                <span className="font-mono text-[9px] dash-muted hidden sm:inline">{inv.certificateId}</span>
                {onSelectProperty && (
                  <button
                    onClick={() => onSelectProperty(inv.propertyId)}
                    className="font-semibold text-emerald-500 hover:text-emerald-400 flex items-center gap-1 text-[11px]"
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
