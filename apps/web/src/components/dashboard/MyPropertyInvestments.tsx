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
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-[#151515] text-white space-y-1 shadow-lg border border-[#303030]">
          <span className="text-[11px] uppercase font-bold text-[#999999] tracking-wider block">
            Total Units Owned
          </span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl sm:text-2xl font-bold font-mono tabular-nums text-white">{totalUnitsOwned}</span>
            <span className="text-xs text-[#00D2FF] font-semibold">Fractional Units</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#151515] border border-[#303030] space-y-1 shadow-lg">
          <span className="text-[11px] uppercase font-bold text-[#999999] tracking-wider block">
            Capital Invested
          </span>
          <span className="text-xl sm:text-2xl font-bold font-mono tabular-nums text-white block">
            {formatCurrency(totalInvestedAmount)}
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-[#151515] border border-[#303030] space-y-1 shadow-lg">
          <div className="flex items-center gap-1.5">
            <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-[#00D2FF]/15 text-[#00D2FF] border border-[#00D2FF]/30 text-[8.5px] font-extrabold uppercase tracking-wider">
              Projected
            </span>
          </div>
          <span className="text-[11px] uppercase font-bold text-[#999999] tracking-wider block">
            Annual Yield Target
          </span>
          <span className="text-xl sm:text-2xl font-bold font-mono tabular-nums text-[#00D2FF] block">
            {formatPercent(avgYield)}
          </span>
          <span className="text-[10px] text-[#D0D0D0] block font-medium">Underwritten APY</span>
        </div>

        <div className="p-4 rounded-2xl bg-[#151515] border border-[#303030] space-y-1 shadow-lg">
          <div className="flex items-center gap-1.5">
            <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-[#2ECC71]/15 text-[#2ECC71] border border-[#2ECC71]/30 text-[8.5px] font-extrabold uppercase tracking-wider">
              Realized
            </span>
          </div>
          <span className="text-[11px] uppercase font-bold text-[#999999] tracking-wider block">
            Performance Payouts
          </span>
          <span className="text-xl sm:text-2xl font-bold font-mono tabular-nums text-[#2ECC71] block">
            +{formatCurrency(totalDividendsEarned)}
          </span>
          <span className="text-[10px] text-[#D0D0D0] block font-medium">Settled to Cash Wallet</span>
        </div>
      </div>

      {/* Filter Tabs & Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-[#151515] p-3 rounded-2xl border border-[#303030]">
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-0.5 sm:pb-0">
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
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                statusFilter === tab.id
                  ? 'bg-white text-black shadow-md'
                  : 'text-[#999999] hover:bg-[#1D1D1D] hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {onOpenBuyModal && (
          <button
            onClick={() => onOpenBuyModal(allProperties[0], 'purchase')}
            className="px-4 py-2 bg-white hover:bg-neutral-200 text-black font-bold text-xs rounded-xl transition-all shadow-md flex items-center gap-1.5 cursor-pointer shrink-0"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Buy Units</span>
          </button>
        )}
      </div>

      {/* Empty State */}
      {filteredInvestments.length === 0 ? (
        <div className="p-6 sm:p-8 text-center bg-[#151515] rounded-2xl border border-[#303030] space-y-3">
          <div className="w-12 h-12 bg-[#1D1D1D] text-white rounded-xl flex items-center justify-center mx-auto border border-[#303030]">
            <Building2 className="w-6 h-6 text-[#00D2FF]" />
          </div>

          <div className="max-w-md mx-auto space-y-1">
            <h3 className="text-base font-bold text-white">No Property Investments Found</h3>
            <p className="text-xs text-[#999999] leading-relaxed">
              {statusFilter === 'all'
                ? 'You do not currently own fractional property units. Explore active real estate offerings to start earning monthly yields.'
                : `No property investment units match the '${statusFilter}' status filter.`}
            </p>
          </div>

          {onExploreProperties && (
            <button
              onClick={onExploreProperties}
              className="px-5 py-2.5 bg-white hover:bg-neutral-200 text-black font-bold text-xs rounded-xl transition-all shadow-md inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Crown className="w-3.5 h-3.5 text-black" />
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
                className="group bg-[#151515] rounded-2xl border border-[#303030] hover:border-[#454545] shadow-lg hover:shadow-xl transition-all duration-200 overflow-hidden flex flex-col justify-between"
              >
                {/* Property Header */}
                <div className="p-4 space-y-3">
                  <div className="flex gap-3.5">
                    <img
                      src={inv.propertyImage}
                      alt={inv.propertyTitle}
                      className="w-14 h-14 rounded-xl object-cover shrink-0 border border-[#303030]"
                    />

                    <div className="flex-1 min-w-0 space-y-0.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-semibold text-[#999999] truncate">{inv.propertyLocation}</span>
                        <span className="px-2.5 py-0.5 rounded-full bg-[#2ECC71]/15 text-[#2ECC71] border border-[#2ECC71]/30 text-[9.5px] font-bold uppercase tracking-wide">
                          {inv.status}
                        </span>
                      </div>

                      <h3 className="text-xs sm:text-sm font-bold text-white leading-snug line-clamp-1">{inv.propertyTitle}</h3>

                      <div className="flex items-center gap-1.5 text-xs text-[#999999] font-mono">
                        <span className="text-white font-bold">{inv.tokensPurchased} Units</span>
                        <span className="text-[#303030]">•</span>
                        <span className="text-[#D0D0D0]">{formatCurrency(inv.totalAmountInvested)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Circular Investment Period Progress Ring */}
                  <div className="p-3 rounded-xl bg-[#1D1D1D] border border-[#303030]">
                    <CircularProgressRing
                      startDate={startDate}
                      maturityDate={maturityDate}
                      status={inv.status}
                      size="sm"
                      showTextDetails={true}
                    />
                  </div>

                  {/* Financial Metrics Row with Distinct Projected vs Realized Performance */}
                  <div className="grid grid-cols-3 gap-2 p-2.5 rounded-xl bg-[#1D1D1D] border border-[#303030] text-xs">
                    <div>
                      <span className="text-[9px] uppercase font-bold text-[#999999] block">Valuation</span>
                      <span className="font-bold font-mono tabular-nums text-white block mt-0.5">{formatCurrency(currentValuation)}</span>
                      <span className="text-[9px] text-[#999999] block truncate font-mono">Cost: {formatCurrency(inv.totalAmountInvested)}</span>
                    </div>

                    <div className="border-x border-[#303030] px-1.5">
                      <div className="flex items-center gap-1 mb-0.5">
                        <span className="inline-flex items-center gap-0.5 text-[8px] font-extrabold text-[#00D2FF] bg-[#00D2FF]/15 border border-[#00D2FF]/30 px-1.5 py-0.2 rounded-full uppercase tracking-wider">
                          Projected
                        </span>
                      </div>
                      <span className="text-[9px] uppercase font-bold text-[#999999] block truncate">Annual Yield</span>
                      <span className="font-bold font-mono tabular-nums text-[#00D2FF] block mt-0.5">{formatPercent(inv.estimatedAnnualYield)}</span>
                    </div>

                    <div>
                      <div className="flex items-center gap-1 mb-0.5">
                        <span className="inline-flex items-center gap-0.5 text-[8px] font-extrabold text-[#2ECC71] bg-[#2ECC71]/15 border border-[#2ECC71]/30 px-1.5 py-0.2 rounded-full uppercase tracking-wider">
                          Realized
                        </span>
                      </div>
                      <span className="text-[9px] uppercase font-bold text-[#999999] block truncate">Performance</span>
                      <span className="font-bold font-mono tabular-nums text-[#2ECC71] block mt-0.5">+{formatCurrency(inv.totalDividendsReceived)}</span>
                    </div>
                  </div>
                </div>

                {/* Card Actions Footer */}
                <div className="p-3 bg-[#1D1D1D] border-t border-[#303030] flex items-center gap-2">
                  <button
                    onClick={() => setSelectedInvestment(inv)}
                    className="flex-1 py-2 px-2.5 bg-[#151515] hover:bg-[#252525] border border-[#303030] text-white font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                  >
                    <Eye className="w-3.5 h-3.5 text-[#00D2FF]" />
                    <span>Agreement</span>
                  </button>

                  <button
                    onClick={async (e) => {
                      e.stopPropagation();
                      const data = await buildInvestmentAgreementData(inv, matchingProp, user);
                      printAgreementDocument(data);
                    }}
                    className="py-2 px-2.5 bg-[#151515] hover:bg-[#252525] border border-[#303030] text-[#00D2FF] font-bold text-xs rounded-xl transition-colors flex items-center justify-center cursor-pointer shadow-2xs"
                    title="Print legally signed SPV agreement"
                  >
                    <Printer className="w-3.5 h-3.5" />
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
                      className="flex-1 py-2 px-2.5 bg-white hover:bg-neutral-200 text-black font-bold text-xs rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5 text-black" />
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
