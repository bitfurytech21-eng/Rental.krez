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
      <div className="dash-card p-8 rounded-3xl border text-center shadow-sm">
        <div className="w-16 h-16 rounded-2xl dash-inner dash-muted flex items-center justify-center mx-auto mb-4 border">
          <Building2 className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-bold dash-text mb-2">No Active Property Holdings Yet</h3>
        <p className="text-xs dash-muted max-w-md mx-auto mb-6">
          Start building your real estate portfolio today. Choose from our vetted European residential, coliving, and holiday properties.
        </p>
        {onExploreMore && (
          <button onClick={onExploreMore} className="btn btn-primary btn-sm">
            Browse Active Properties
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-xl font-bold dash-text">Active Property Assets</h3>
          <p className="text-xs dash-muted">
            {investments.length} {investments.length === 1 ? 'Holding' : 'Holdings'} generating monthly distributions
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {investments.map((inv) => (
          <div
            key={inv.id}
            className="dash-card p-5 rounded-2xl border shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl overflow-hidden bg-gray-100 shrink-0">
                    <img
                      src={inv.propertyImage}
                      alt={inv.propertyTitle}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold dash-text line-clamp-1">{inv.propertyTitle}</h4>
                    <span className="text-xs dash-muted">{inv.propertyLocation}</span>
                  </div>
                </div>

                <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full shrink-0">
                  Active
                </span>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-3 gap-2 py-3 border-y border-inherit/40 text-xs mb-3">
                <div>
                  <span className="dash-muted block text-[11px]">Tokens</span>
                  <span className="font-bold dash-text">{inv.tokensPurchased} ({formatCurrency(inv.totalAmountInvested)})</span>
                </div>
                <div>
                  <span className="dash-muted block text-[11px]">Est. Yield</span>
                  <span className="font-bold text-emerald-400">{formatPercent(inv.estimatedAnnualYield)}</span>
                </div>
                <div>
                  <span className="dash-muted block text-[11px]">Monthly Payout</span>
                  <span className="font-bold dash-text">+{formatCurrency(inv.projectedMonthlyIncome)}/mo</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs pt-2">
              <button
                type="button"
                onClick={() => setSelectedInvestmentForDocs(inv)}
                className="font-medium text-emerald-400 hover:underline flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-lg"
              >
                <FileText className="w-3.5 h-3.5" /> Legal Docs
              </button>

              <div className="flex items-center gap-3">
                <span className="font-mono text-[10px] dash-muted hidden sm:inline">{inv.certificateId}</span>
                {onSelectProperty && (
                  <button
                    onClick={() => onSelectProperty(inv.propertyId)}
                    className="font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
                  >
                    View Asset <ArrowRight className="w-3.5 h-3.5" />
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
