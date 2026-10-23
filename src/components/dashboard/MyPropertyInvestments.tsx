import React, { useState } from 'react';
import { Investment } from '../../types/investment';
import { Property } from '../../types/property';
import { formatCurrency, formatPercent } from '../../lib/utils';
import { CircularProgressRing } from '../common/CircularProgressRing';
import { InvestmentDetailModal } from './InvestmentDetailModal';
import { Building2, Crown, Calendar, TrendingUp, RefreshCw, Eye, ArrowUpRight, Plus, Filter, ShieldCheck, Printer } from 'lucide-react';
import { useAuth } from '../../lib/auth';
import { 
  buildInvestmentAgreementData, 
  printAgreementDocument 
} from '../../lib/investmentAgreementService';

interface MyPropertyInvestmentsProps {
  investments: Investment[];
  allProperties?: Property[];
  onOpenBuyModal?: (property?: Property, mode?: 'purchase' | 'reinvest') => void;
  onExploreProperties?: () => void;
}

export const MyPropertyInvestments: React.FC<MyPropertyInvestmentsProps> = ({
  investments = [],
  allProperties = [],
  onOpenBuyModal,
  onExploreProperties
}) => {
  const { user } = useAuth();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedInvestment, setSelectedInvestment] = useState<Investment | null>(null);

  // Filtered investments
  const filteredInvestments = investments.filter(inv => {
    if (statusFilter === 'all') return true;
    return inv.status === statusFilter;
  });

  // Calculate portfolio totals
  const totalUnitsOwned = investments.reduce((sum, inv) => sum + inv.tokensPurchased, 0);
  const totalInvestedAmount = investments.reduce((sum, inv) => sum + inv.totalAmountInvested, 0);
  const totalMonthlyYield = investments.reduce((sum, inv) => sum + inv.projectedMonthlyIncome, 0);
  const totalDividendsEarned = investments.reduce((sum, inv) => sum + inv.totalDividendsReceived, 0);

  const avgYield = investments.length > 0
    ? investments.reduce((sum, inv) => sum + inv.estimatedAnnualYield, 0) / investments.length
    : 0;

  return (
    <div className="space-y-3.5">
      
      {/* Top Portfolio Metrics Header */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
        <div className="p-3 rounded-xl bg-[#142421] text-white space-y-0.5 shadow-2xs border border-[#24423C]/50">
          <span className="text-[11px] uppercase font-semibold text-emerald-200/70 tracking-wider block">
            Total Units Owned
          </span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl sm:text-2xl font-bold font-mono tabular-nums text-white">{totalUnitsOwned}</span>
            <span className="text-xs text-emerald-300 font-medium">Fractional Units</span>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-white border border-[#E3E8E3] space-y-0.5 shadow-2xs">
          <span className="text-[11px] uppercase font-semibold text-[#69736F] tracking-wider block">
            Capital Invested
          </span>
          <span className="text-xl sm:text-2xl font-bold font-mono tabular-nums text-[#142421] block">
            {formatCurrency(totalInvestedAmount)}
          </span>
        </div>

        <div className="p-3 rounded-xl bg-white border border-[#E3E8E3] space-y-0.5 shadow-2xs">
          <span className="text-[11px] uppercase font-semibold text-[#69736F] tracking-wider block">
            Avg. Portfolio Yield
          </span>
          <span className="text-xl sm:text-2xl font-bold font-mono tabular-nums text-[#27845D] block">
            {formatPercent(avgYield)}
          </span>
        </div>

        <div className="p-3 rounded-xl bg-white border border-[#E3E8E3] space-y-0.5 shadow-2xs">
          <span className="text-[11px] uppercase font-semibold text-[#69736F] tracking-wider block">
            Monthly Cashflow
          </span>
          <span className="text-xl sm:text-2xl font-bold font-mono tabular-nums text-[#27845D] block">
            +{formatCurrency(totalMonthlyYield)}/mo
          </span>
        </div>
      </div>

      {/* Filter Tabs & Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 bg-[#F6F7F4] p-2 sm:p-2.5 rounded-xl border border-[#E3E8E3]">
        <div className="flex items-center gap-1 overflow-x-auto w-full sm:w-auto pb-0.5 sm:pb-0">
          {[
            { id: 'all', label: 'All Investments' },
            { id: 'active', label: 'Active Positions' },
            { id: 'matured', label: 'Matured' },
            { id: 'pending', label: 'Pending' },
            { id: 'cancelled', label: 'Cancelled' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                statusFilter === tab.id
                  ? 'bg-[#142421] text-white shadow-2xs'
                  : 'text-[#52605C] hover:bg-[#E3E8E3] hover:text-[#142421]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {onOpenBuyModal && (
          <button
            onClick={() => onOpenBuyModal(allProperties[0], 'purchase')}
            className="px-3 py-1.5 bg-[#27845D] hover:bg-[#1f6b4a] text-white font-bold text-xs rounded-lg transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Buy Units</span>
          </button>
        )}
      </div>

      {/* Empty State */}
      {filteredInvestments.length === 0 ? (
        <div className="p-6 sm:p-8 text-center bg-white rounded-xl border border-[#E3E8E3] space-y-3">
          <div className="w-12 h-12 bg-[#F6F7F4] text-[#27845D] rounded-xl flex items-center justify-center mx-auto border border-[#E3E8E3]">
            <Building2 className="w-6 h-6" />
          </div>

          <div className="max-w-md mx-auto space-y-1">
            <h3 className="text-base font-bold text-[#142421]">No Property Investments Found</h3>
            <p className="text-xs text-[#52605C] leading-relaxed">
              {statusFilter === 'all'
                ? 'You do not currently own fractional property units. Explore active real estate offerings to start earning monthly yields.'
                : `No property investment units match the '${statusFilter}' status filter.`}
            </p>
          </div>

          {onExploreProperties && (
            <button
              onClick={onExploreProperties}
              className="px-4 py-2 bg-[#142421] hover:bg-[#1E332E] text-white font-bold text-xs rounded-lg transition-all shadow-xs inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Crown className="w-3.5 h-3.5 text-[#B7E36A]" />
              <span>Explore Property Catalog</span>
            </button>
          )}
        </div>
      ) : (
        /* Investment Cards List */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filteredInvestments.map(inv => {
            const startDate = inv.startDate || inv.purchasedAt;
            const durationMonths = inv.durationMonths || 36;
            const calcMaturity = () => {
              if (inv.maturityDate) return inv.maturityDate;
              const s = new Date(startDate);
              s.setMonth(s.getMonth() + durationMonths);
              return s.toISOString();
            };
            const maturityDate = calcMaturity();
            const currentValuation = inv.currentValuation || inv.totalAmountInvested;

            // Matching property object if available
            const matchingProp = allProperties.find(p => p.id === inv.propertyId || p.title === inv.propertyTitle);

            return (
              <div
                key={inv.id}
                className="group bg-white rounded-xl border border-[#E3E8E3] hover:border-[#142421]/30 shadow-2xs hover:shadow-xs transition-all duration-200 overflow-hidden flex flex-col justify-between"
              >
                {/* Property Header */}
                <div className="p-3.5 space-y-2.5">
                  <div className="flex gap-3">
                    <img
                      src={inv.propertyImage}
                      alt={inv.propertyTitle}
                      className="w-14 h-14 rounded-lg object-cover shrink-0 border border-[#E3E8E3]"
                    />

                    <div className="flex-1 min-w-0 space-y-0.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-semibold text-[#69736F] truncate">{inv.propertyLocation}</span>
                        <span className="px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 text-[9px] font-bold uppercase tracking-wide">
                          {inv.status}
                        </span>
                      </div>

                      <h3 className="text-xs sm:text-sm font-bold text-[#142421] leading-snug line-clamp-1">{inv.propertyTitle}</h3>

                      <div className="flex items-center gap-1.5 text-[11px] text-[#52605C] font-mono">
                        <span className="text-[#142421] font-bold">{inv.tokensPurchased} Units</span>
                        <span className="text-[#BCC5BD]">•</span>
                        <span>{formatCurrency(inv.totalAmountInvested)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Circular Investment Period Progress Ring */}
                  <div className="p-2.5 rounded-lg bg-[#F6F7F4] border border-[#E3E8E3]">
                    <CircularProgressRing
                      startDate={startDate}
                      maturityDate={maturityDate}
                      status={inv.status}
                      size="sm"
                      showTextDetails={true}
                    />
                  </div>

                  {/* Financial Metrics Row */}
                  <div className="grid grid-cols-3 gap-1.5 p-2 rounded-lg bg-white border border-[#E3E8E3] text-[11px]">
                    <div>
                      <span className="text-[8.5px] uppercase font-semibold text-[#69736F] block">Valuation</span>
                      <span className="font-bold font-mono tabular-nums text-[#142421] block mt-0.5">{formatCurrency(currentValuation)}</span>
                    </div>

                    <div>
                      <span className="text-[8.5px] uppercase font-semibold text-[#69736F] block">Annual APY</span>
                      <span className="font-bold font-mono tabular-nums text-[#27845D] block mt-0.5">{formatPercent(inv.estimatedAnnualYield)}</span>
                    </div>

                    <div>
                      <span className="text-[8.5px] uppercase font-semibold text-[#69736F] block">Monthly Yield</span>
                      <span className="font-bold font-mono tabular-nums text-[#27845D] block mt-0.5">+{formatCurrency(inv.projectedMonthlyIncome)}</span>
                    </div>
                  </div>
                </div>

                {/* Card Actions Footer */}
                <div className="p-2.5 bg-[#F6F7F4] border-t border-[#E3E8E3] flex items-center gap-1.5">
                  <button
                    onClick={() => setSelectedInvestment(inv)}
                    className="flex-1 py-1.5 px-2 bg-white hover:bg-[#E3E8E3] border border-[#E3E8E3] text-[#142421] font-semibold text-xs rounded-lg transition-colors flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Eye className="w-3 h-3 text-emerald-700" />
                    <span>Agreement</span>
                  </button>

                  <button
                    onClick={async (e) => {
                      e.stopPropagation();
                      const data = await buildInvestmentAgreementData(inv, matchingProp, user);
                      printAgreementDocument(data);
                    }}
                    className="py-1.5 px-2 bg-white hover:bg-[#EEF2EC] border border-[#E3E8E3] text-[#27845D] font-semibold text-xs rounded-lg transition-colors flex items-center justify-center cursor-pointer shadow-2xs"
                    title="Print legally signed SPV agreement"
                  >
                    <Printer className="w-3 h-3" />
                  </button>

                  {onOpenBuyModal && (
                    <button
                      onClick={() => onOpenBuyModal(matchingProp || ({
                        id: inv.propertyId,
                        title: inv.propertyTitle,
                        location: inv.propertyLocation,
                        tokenPrice: inv.tokenPrice,
                        estimatedAnnualYield: inv.estimatedAnnualYield,
                        durationMonths: durationMonths,
                        minimumInvestment: inv.tokenPrice * 5,
                        images: [inv.propertyImage]
                      } as Property), 'reinvest')}
                      className="flex-1 py-1.5 px-2 bg-[#142421] hover:bg-[#1E332E] text-white font-semibold text-xs rounded-lg transition-all shadow-2xs flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <RefreshCw className="w-3 h-3 text-[#B7E36A]" />
                      <span>Reinvest</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Detail Modal */}
      {selectedInvestment && (
        <InvestmentDetailModal
          investment={selectedInvestment}
          isOpen={!!selectedInvestment}
          onClose={() => setSelectedInvestment(null)}
          onReinvest={(inv) => {
            if (onOpenBuyModal) {
              onOpenBuyModal(allProperties.find(p => p.id === inv.propertyId), 'reinvest');
            }
          }}
        />
      )}
    </div>
  );
};
