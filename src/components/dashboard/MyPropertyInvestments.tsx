import React, { useState } from 'react';
import { Investment } from '../../types/investment';
import { Property } from '../../types/property';
import { formatCurrency, formatPercent } from '../../lib/utils';
import { CircularProgressRing } from '../common/CircularProgressRing';
import { InvestmentDetailModal } from './InvestmentDetailModal';
import { Building2, Crown, RefreshCw, Eye, Plus, Printer } from 'lucide-react';
import { useAuth } from '../../lib/auth';
import { buildInvestmentAgreementData, printAgreementDocument } from '../../lib/investmentAgreementService';

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
  onExploreProperties,
}) => {
  const { user } = useAuth();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedInvestment, setSelectedInvestment] = useState<Investment | null>(null);

  const filteredInvestments = investments.filter((inv) => {
    if (statusFilter === 'all') return true;
    return inv.status === statusFilter;
  });

  const totalUnitsOwned = investments.reduce((sum, inv) => sum + inv.tokensPurchased, 0);
  const totalInvestedAmount = investments.reduce((sum, inv) => sum + inv.totalAmountInvested, 0);
  const totalDividendsEarned = investments.reduce((sum, inv) => sum + inv.totalDividendsReceived, 0);

  const avgYield =
    investments.length > 0
      ? investments.reduce((sum, inv) => sum + inv.estimatedAnnualYield, 0) / investments.length
      : 0;

  return (
    <div className="space-y-4">
      {/* Top Portfolio Metrics Header */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-4 rounded-[14px] bg-[var(--dash-inner)] border border-[var(--dash-card-border)] space-y-1">
          <span className="text-[10.5px] uppercase font-bold text-[var(--dash-text-muted)] tracking-wider block">
            Total Units Owned
          </span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl sm:text-2xl font-bold font-mono tabular-nums text-[var(--dash-text)]">
              {totalUnitsOwned}
            </span>
            <span className="text-xs text-[var(--dash-accent)] font-semibold">Units</span>
          </div>
        </div>

        <div className="p-4 rounded-[14px] bg-[var(--dash-inner)] border border-[var(--dash-card-border)] space-y-1">
          <span className="text-[10.5px] uppercase font-bold text-[var(--dash-text-muted)] tracking-wider block">
            Capital Invested
          </span>
          <span className="text-xl sm:text-2xl font-bold font-mono tabular-nums text-[var(--dash-text)] block">
            {formatCurrency(totalInvestedAmount)}
          </span>
        </div>

        <div className="p-4 rounded-[14px] bg-[var(--dash-inner)] border border-[var(--dash-card-border)] space-y-1">
          <span className="text-[10.5px] uppercase font-bold text-[var(--dash-text-muted)] tracking-wider block">
            Annual Yield Target
          </span>
          <span className="text-xl sm:text-2xl font-bold font-mono tabular-nums text-[var(--dash-accent)] block">
            {formatPercent(avgYield)}
          </span>
          <span className="text-[10px] text-[var(--dash-text-muted)] block">Underwritten APY</span>
        </div>

        <div className="p-4 rounded-[14px] bg-[var(--dash-inner)] border border-[var(--dash-card-border)] space-y-1">
          <span className="text-[10.5px] uppercase font-bold text-[var(--dash-text-muted)] tracking-wider block">
            Performance Payouts
          </span>
          <span className="text-xl sm:text-2xl font-bold font-mono tabular-nums text-[var(--dash-positive)] block">
            +{formatCurrency(totalDividendsEarned)}
          </span>
          <span className="text-[10px] text-[var(--dash-text-muted)] block">Settled to Wallet</span>
        </div>
      </div>

      {/* Filter Tabs & Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 rounded-[14px] bg-[var(--dash-inner)] border border-[var(--dash-card-border)]">
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-0.5 sm:pb-0">
          {[
            { id: 'all', label: 'All Investments' },
            { id: 'active', label: 'Active' },
            { id: 'matured', label: 'Matured' },
            { id: 'pending', label: 'Pending' },
            { id: 'cancelled', label: 'Cancelled' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStatusFilter(tab.id)}
              aria-pressed={statusFilter === tab.id}
              className={`portal-chip !h-8 !px-3.5 !text-xs cursor-pointer ${
                statusFilter === tab.id ? 'on' : ''
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {onOpenBuyModal && (
          <button
            type="button"
            onClick={() => onOpenBuyModal(allProperties[0], 'purchase')}
            className="h-9 px-4 bg-[var(--dash-accent)] text-[var(--dash-accent-ink)] font-bold text-xs rounded-xl hover:brightness-105 flex items-center gap-1.5 cursor-pointer shrink-0 transition-all"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Buy Units</span>
          </button>
        )}
      </div>

      <div className="flex items-center justify-between gap-3 px-1 text-[11px] text-[var(--dash-text-muted)]" aria-live="polite">
        <span>
          Showing <strong className="text-[var(--dash-text)] tabular-nums">{filteredInvestments.length}</strong> of{' '}
          <strong className="text-[var(--dash-text)] tabular-nums">{investments.length}</strong> investments
        </span>
        {statusFilter !== 'all' && (
          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            className="font-semibold text-[var(--dash-accent)] underline underline-offset-4 cursor-pointer"
          >
            Clear filter
          </button>
        )}
      </div>

      {filteredInvestments.length === 0 ? (
        <div className="p-6 sm:p-8 text-center rounded-[16px] border border-dashed border-[var(--dash-card-border)] bg-[var(--dash-inner)] space-y-3">
          <div className="w-11 h-11 bg-[var(--dash-card)] text-[var(--dash-accent)] rounded-xl flex items-center justify-center mx-auto border border-[var(--dash-card-border)]">
            <Building2 className="w-5 h-5" />
          </div>

          <div className="max-w-md mx-auto space-y-1">
            <h3 className="text-sm font-bold text-[var(--dash-text)]">No Property Investments Found</h3>
            <p className="text-xs text-[var(--dash-text-muted)] leading-relaxed">
              {statusFilter === 'all'
                ? 'You do not currently own fractional property units. Explore active offerings to start earning yields.'
                : `No property investment units match the '${statusFilter}' status filter.`}
            </p>
          </div>

          {onExploreProperties && (
            <button
              type="button"
              onClick={onExploreProperties}
              className="portal-btn h-10 text-xs inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Crown className="w-3.5 h-3.5" />
              <span>Explore Property Catalog</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {filteredInvestments.map((inv) => {
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
            const matchingProp = allProperties.find(
              (p) => p.id === inv.propertyId || p.title === inv.propertyTitle
            );

            return (
              <div
                key={inv.id}
                className="group portal-card overflow-hidden flex flex-col justify-between hover:border-[var(--dash-inner-border)] transition-colors"
              >
                <div className="p-4 space-y-3">
                  <div className="flex gap-3.5">
                    <img
                      src={inv.propertyImage}
                      alt={inv.propertyTitle}
                      referrerPolicy="no-referrer"
                      className="w-14 h-14 rounded-xl object-cover shrink-0 border border-[var(--dash-card-border)]"
                    />

                    <div className="flex-1 min-w-0 space-y-0.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10.5px] font-medium text-[var(--dash-text-muted)] truncate">
                          {inv.propertyLocation}
                        </span>
                        <span className="portal-pill ok capitalize">{inv.status}</span>
                      </div>

                      <h3 className="text-xs sm:text-sm font-bold text-[var(--dash-text)] leading-snug line-clamp-1">
                        {inv.propertyTitle}
                      </h3>

                      <div className="flex items-center gap-1.5 text-xs text-[var(--dash-text-muted)] font-mono">
                        <span className="text-[var(--dash-text)] font-bold">{inv.tokensPurchased} Units</span>
                        <span>·</span>
                        <span>{formatCurrency(inv.totalAmountInvested)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-[var(--dash-inner)] border border-[var(--dash-card-border)]">
                    <CircularProgressRing
                      startDate={startDate}
                      maturityDate={maturityDate}
                      status={inv.status}
                      size="sm"
                      showTextDetails={true}
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-2 p-2.5 rounded-xl bg-[var(--dash-inner)] border border-[var(--dash-card-border)] text-xs">
                    <div>
                      <span className="text-[9px] uppercase font-bold text-[var(--dash-text-muted)] block">
                        Valuation
                      </span>
                      <span className="font-bold font-mono tabular-nums text-[var(--dash-text)] block mt-0.5">
                        {formatCurrency(currentValuation)}
                      </span>
                      <span className="text-[9px] text-[var(--dash-text-muted)] block truncate font-mono">
                        Cost: {formatCurrency(inv.totalAmountInvested)}
                      </span>
                    </div>

                    <div className="border-x border-[var(--dash-card-border)] px-1.5">
                      <span className="text-[9px] uppercase font-bold text-[var(--dash-text-muted)] block truncate">
                        Annual Yield
                      </span>
                      <span className="font-bold font-mono tabular-nums text-[var(--dash-accent)] block mt-0.5">
                        {formatPercent(inv.estimatedAnnualYield)}
                      </span>
                      <span className="text-[9px] text-[var(--dash-text-muted)] block">Projected</span>
                    </div>

                    <div>
                      <span className="text-[9px] uppercase font-bold text-[var(--dash-text-muted)] block truncate">
                        Performance
                      </span>
                      <span className="font-bold font-mono tabular-nums text-[var(--dash-positive)] block mt-0.5">
                        +{formatCurrency(inv.totalDividendsReceived)}
                      </span>
                      <span className="text-[9px] text-[var(--dash-positive)] block">Realized</span>
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-[var(--dash-inner)] border-t border-[var(--dash-card-border)] flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedInvestment(inv)}
                    className="flex-1 py-2 px-2.5 bg-[var(--dash-card)] hover:bg-[var(--dash-hover)] border border-[var(--dash-card-border)] text-[var(--dash-text)] font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5 text-[var(--dash-accent)]" />
                    <span>Agreement</span>
                  </button>

                  <button
                    type="button"
                    onClick={async (e) => {
                      e.stopPropagation();
                      const data = await buildInvestmentAgreementData(inv, matchingProp, user);
                      printAgreementDocument(data);
                    }}
                    className="py-2 px-2.5 bg-[var(--dash-card)] hover:bg-[var(--dash-hover)] border border-[var(--dash-card-border)] text-[var(--dash-accent)] font-bold text-xs rounded-xl transition-colors flex items-center justify-center cursor-pointer"
                    title="Print legally signed SPV agreement"
                  >
                    <Printer className="w-3.5 h-3.5" />
                  </button>

                  {onOpenBuyModal && (
                    <button
                      type="button"
                      onClick={() =>
                        onOpenBuyModal(
                          matchingProp ||
                            ({
                              id: inv.propertyId,
                              title: inv.propertyTitle,
                              location: inv.propertyLocation,
                              tokenPrice: inv.tokenPrice,
                              estimatedAnnualYield: inv.estimatedAnnualYield,
                              durationMonths: durationMonths,
                              minimumInvestment: inv.tokenPrice * 5,
                              images: [inv.propertyImage],
                            } as Property),
                          'reinvest'
                        )
                      }
                      className="flex-1 py-2 px-2.5 bg-[var(--dash-accent)] text-[var(--dash-accent-ink)] font-bold text-xs rounded-xl hover:brightness-105 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Reinvest</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {selectedInvestment && (
        <InvestmentDetailModal
          investment={selectedInvestment}
          isOpen={!!selectedInvestment}
          onClose={() => setSelectedInvestment(null)}
          onReinvest={(inv) => {
            if (onOpenBuyModal) {
              onOpenBuyModal(
                allProperties.find((p) => p.id === inv.propertyId),
                'reinvest'
              );
            }
          }}
        />
      )}
    </div>
  );
};
