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
    <div className="space-y-2.5">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-xs sm:text-sm font-bold dash-text">Active Property Assets</h3>
          <p className="text-[10px] dash-muted">
            {investments.length} {investments.length === 1 ? 'Holding' : 'Holdings'} generating monthly distributions
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
        {investments.map((inv) => (
          <div
            key={inv.id}
            className="dash-card p-2.5 sm:p-3 rounded-xl border border-inherit/40 shadow-2xs hover:shadow-xs transition-shadow flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg overflow-hidden bg-gray-100 shrink-0">
                    <img
                      src={inv.propertyImage}
                      alt={inv.propertyTitle}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs sm:text-[13px] font-bold dash-text truncate">{inv.propertyTitle}</h4>
                    <span className="text-[10px] dash-muted truncate block">{inv.propertyLocation}</span>
                  </div>
                </div>

                <span className="text-[9px] font-semibold tracking-wide text-emerald-600 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200 shrink-0">
                  Active
                </span>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-3 gap-1 py-1.5 border-y border-inherit/30 text-[11px] mb-1.5">
                <div>
                  <span className="dash-muted block text-[9px]">Tokens</span>
                  <span className="font-bold font-mono tabular-nums dash-text text-[11px] sm:text-xs">{inv.tokensPurchased} ({formatCurrency(inv.totalAmountInvested)})</span>
                </div>
                <div>
                  <span className="dash-muted block text-[9px]">Est. Yield</span>
                  <span className="font-bold font-mono tabular-nums text-emerald-600 text-[11px] sm:text-xs">{formatPercent(inv.estimatedAnnualYield)}</span>
                </div>
                <div>
                  <span className="dash-muted block text-[9px]">Monthly Payout</span>
                  <span className="font-bold font-mono tabular-nums dash-text text-[11px] sm:text-xs">+{formatCurrency(inv.projectedMonthlyIncome)}/mo</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between text-[11px] pt-1">
              <button
                type="button"
                onClick={() => setSelectedInvestmentForDocs(inv)}
                className="font-medium text-emerald-600 hover:underline flex items-center gap-1 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded text-[10px] cursor-pointer"
              >
                <FileText className="w-2.5 h-2.5" /> Legal Docs
              </button>

              <div className="flex items-center gap-2">
                <span className="font-mono text-[8.5px] dash-muted hidden sm:inline">{inv.certificateId}</span>
                {onSelectProperty && (
                  <button
                    onClick={() => onSelectProperty(inv.propertyId)}
                    className="font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 text-[10.5px] cursor-pointer"
                  >
                    View Asset <ArrowRight className="w-2.5 h-2.5" />
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
