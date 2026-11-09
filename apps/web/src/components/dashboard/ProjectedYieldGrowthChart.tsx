import React, { useEffect, useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from 'recharts';
import { Property } from '../../types/property';
import { Investment } from '../../types/investment';
import {
  calculateFiveYearPortfolioYieldProjection,
  PortfolioYieldPositionInput,
  roundDecimal,
} from '../../lib/financialService';
import { formatCurrency, formatPercent } from '../../lib/utils';
import {
  TrendingUp,
  Check,
  Plus,
  RotateCcw,
  ArrowUpRight,
  SlidersHorizontal,
  Building2,
} from 'lucide-react';
import { RAINBOW_COLORS, CHART_THEME } from '../../lib/chartTheme';

interface ProjectedYieldGrowthChartProps {
  properties: Property[];
  investments: Investment[];
  onSelectProperty: (propertyId: string) => void;
  onExploreProperties: () => void;
}

type ChartMetricMode = 'yield_percent' | 'annual_eur' | 'by_property';
type IndexationPreset = 1.5 | 2.5 | 3.5;

const SERIES_PALETTE = [
  '#35C9F5', // Cyan
  '#38C982', // Green
  '#FFD93D', // Yellow
  '#FF9F43', // Orange
  '#FF4D4D', // Red
  '#FF65B3', // Pink
  '#A66CFF', // Purple
  '#4287FF', // Blue
];

const ALLOCATION_PRESETS = [2500, 5000, 10000, 25000];

export const ProjectedYieldGrowthChart: React.FC<ProjectedYieldGrowthChartProps> = ({
  properties,
  investments,
  onSelectProperty,
  onExploreProperties,
}) => {
  const hasOwnedHoldings = investments.length > 0;

  // Aggregate user's owned holdings by propertyId
  const ownedPositions = useMemo(() => {
    const grouped = new Map<
      string,
      {
        propertyId: string;
        title: string;
        location: string;
        allocatedCapitalEUR: number;
        tokens: number;
        annualYieldPercent: number;
        downsideYieldPercent: number;
        isOwned: true;
      }
    >();

    for (const inv of investments) {
      const catalogProp = properties.find((p) => p.id === inv.propertyId);
      const val = inv.totalAmountInvested || inv.currentValuation || 0;
      const baseYield = inv.estimatedAnnualYield || catalogProp?.estimatedAnnualYield || 8.0;
      const downsideYield =
        catalogProp?.sensitivityAnalysis?.downsideCaseYield ?? roundDecimal(baseYield * 0.85, 2);

      const existing = grouped.get(inv.propertyId);
      if (existing) {
        existing.allocatedCapitalEUR = roundDecimal(existing.allocatedCapitalEUR + val, 2);
        existing.tokens += inv.tokensPurchased || 0;
      } else {
        grouped.set(inv.propertyId, {
          propertyId: inv.propertyId,
          title: inv.propertyTitle || catalogProp?.title || 'Tokenized SPV Property',
          location: inv.propertyLocation || catalogProp?.location || 'European Union',
          allocatedCapitalEUR: roundDecimal(val, 2),
          tokens: inv.tokensPurchased || 0,
          annualYieldPercent: baseYield,
          downsideYieldPercent: downsideYield,
          isOwned: true,
        });
      }
    }

    return Array.from(grouped.values()).sort(
      (a, b) => b.allocatedCapitalEUR - a.allocatedCapitalEUR
    );
  }, [investments, properties]);

  // Approved catalog offerings not yet in ownedPositions (for custom portfolio modeling or 0-holding starter selection)
  const catalogCandidates = useMemo(() => {
    const ownedIds = new Set(ownedPositions.map((p) => p.propertyId));
    return properties
      .filter(
        (p) =>
          !ownedIds.has(p.id) &&
          p.status !== 'hidden' &&
          p.status !== 'pending_approval' &&
          p.approvedForFrontend !== false &&
          (p.estimatedAnnualYield || 0) > 0
      )
      .slice(0, 8)
      .map((p) => ({
        propertyId: p.id,
        title: p.title,
        location: p.location,
        defaultCapitalEUR: Math.max(2500, p.minimumInvestment || 2500),
        annualYieldPercent: p.estimatedAnnualYield,
        downsideYieldPercent:
          p.sensitivityAnalysis?.downsideCaseYield ??
          roundDecimal(p.estimatedAnnualYield * 0.85, 2),
        isOwned: false as const,
      }));
  }, [properties, ownedPositions]);

  // Selected property IDs in the portfolio projection
  const [selectedIds, setSelectedIds] = useState<string[]>(() => {
    if (ownedPositions.length > 0) {
      return ownedPositions.map((p) => p.propertyId);
    }
    return catalogCandidates.slice(0, 3).map((p) => p.propertyId);
  });

  const [showCatalogPicker, setShowCatalogPicker] = useState<boolean>(() => !hasOwnedHoldings);
  const [simulatedAllocationEUR, setSimulatedAllocationEUR] = useState<number>(5000);
  const [metricMode, setMetricMode] = useState<ChartMetricMode>('yield_percent');
  const [indexationPreset, setIndexationPreset] = useState<IndexationPreset>(2.5);

  // Sync default selection if user acquires their first holding during the session
  useEffect(() => {
    if (ownedPositions.length > 0) {
      setSelectedIds((prev) => {
        const ownedIdList = ownedPositions.map((p) => p.propertyId);
        const hasAnyOwnedSelected = ownedIdList.some((id) => prev.includes(id));
        return hasAnyOwnedSelected ? prev : ownedIdList;
      });
    } else if (selectedIds.length === 0 && catalogCandidates.length > 0) {
      setSelectedIds(catalogCandidates.slice(0, 3).map((p) => p.propertyId));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ownedPositions.length, catalogCandidates.length]);

  const togglePropertySelection = (propertyId: string) => {
    setSelectedIds((prev) =>
      prev.includes(propertyId) ? prev.filter((id) => id !== propertyId) : [...prev, propertyId]
    );
  };

  const handleResetSelection = () => {
    if (ownedPositions.length > 0) {
      setSelectedIds(ownedPositions.map((p) => p.propertyId));
      setShowCatalogPicker(false);
    } else {
      setSelectedIds(catalogCandidates.slice(0, 3).map((p) => p.propertyId));
      setShowCatalogPicker(true);
    }
  };

  // Active selected positions fed into the 5-year projection engine
  const activePositions: Array<
    PortfolioYieldPositionInput & { location: string; isOwned: boolean; color: string }
  > = useMemo(() => {
    const selectedSet = new Set(selectedIds);
    const combined: Array<
      PortfolioYieldPositionInput & { location: string; isOwned: boolean; color: string }
    > = [];

    ownedPositions.forEach((pos) => {
      if (selectedSet.has(pos.propertyId)) {
        combined.push({
          propertyId: pos.propertyId,
          title: pos.title,
          location: pos.location,
          allocatedCapitalEUR: pos.allocatedCapitalEUR,
          annualYieldPercent: pos.annualYieldPercent,
          downsideYieldPercent: pos.downsideYieldPercent,
          isOwned: true,
          color: SERIES_PALETTE[combined.length % SERIES_PALETTE.length],
        });
      }
    });

    catalogCandidates.forEach((cand) => {
      if (selectedSet.has(cand.propertyId)) {
        combined.push({
          propertyId: cand.propertyId,
          title: cand.title,
          location: cand.location,
          allocatedCapitalEUR: simulatedAllocationEUR,
          annualYieldPercent: cand.annualYieldPercent,
          downsideYieldPercent: cand.downsideYieldPercent,
          isOwned: false,
          color: SERIES_PALETTE[combined.length % SERIES_PALETTE.length],
        });
      }
    });

    return combined;
  }, [selectedIds, ownedPositions, catalogCandidates, simulatedAllocationEUR]);

  // Compute 5-year projection
  const projection = useMemo(() => {
    return calculateFiveYearPortfolioYieldProjection(activePositions, {
      annualIndexationPercent: indexationPreset,
      years: 5,
    });
  }, [activePositions, indexationPreset]);

  // Flatten chart rows for Recharts LineChart (including per-property keys for 'by_property' mode)
  const chartData = useMemo(() => {
    return projection.points.map((pt) => {
      const row: Record<string, any> = {
        yearLabel: `${pt.yearLabel} (${pt.calendarYear})`,
        shortYear: pt.yearLabel,
        calendarYear: pt.calendarYear,
        cashAnnualYieldEUR: pt.cashAnnualYieldEUR,
        cashYieldOnCostPercent: pt.cashYieldOnCostPercent,
        compoundedAnnualYieldEUR: pt.compoundedAnnualYieldEUR,
        compoundedYieldOnCostPercent: pt.compoundedYieldOnCostPercent,
        downsideAnnualYieldEUR: pt.downsideAnnualYieldEUR,
        downsideYieldOnCostPercent: pt.downsideYieldOnCostPercent,
        cumulativeCompoundedYieldEUR: pt.cumulativeCompoundedYieldEUR,
      };

      activePositions.forEach((pos) => {
        row[`prop_${pos.propertyId}`] =
          pt.byProperty[pos.propertyId]?.compoundedAnnualYieldEUR ?? 0;
      });

      return row;
    });
  }, [projection.points, activePositions]);

  const includesSimulatedAssets = activePositions.some((p) => !p.isOwned);

  const renderCustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || payload.length === 0) return null;
    const rawPoint = payload[0]?.payload;

    return (
      <div className="bg-[#151515] text-white p-3.5 rounded-xl border border-[#303030] shadow-2xl text-xs space-y-2 max-w-xs z-50">
        <div className="flex items-center justify-between gap-4 border-b border-[#303030] pb-1.5">
          <span className="font-bold text-[#FFFFFF]">{label}</span>
          <span className="font-mono tabular-nums text-[10.5px] text-[#A0A0A0]">
            CPI +{indexationPreset}%/yr
          </span>
        </div>

        <div className="space-y-1 font-mono tabular-nums">
          {payload.map((entry: any) => {
            const val = Number(entry.value || 0);
            const formatted =
              metricMode === 'yield_percent' ? formatPercent(val) : formatCurrency(val);
            return (
              <div key={entry.dataKey} className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-1.5 font-sans text-[11px] text-[#A0A0A0] truncate">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm"
                    style={{ backgroundColor: entry.color }}
                  />
                  <span className="truncate">{entry.name}</span>
                </span>
                <span className="font-bold text-white shrink-0">{formatted}</span>
              </div>
            );
          })}
        </div>

        {rawPoint && metricMode !== 'by_property' && (
          <div className="pt-1.5 border-t border-[#303030] text-[10.5px] font-mono tabular-nums text-[#A0A0A0] flex items-center justify-between gap-2">
            <span>Cumulative Reinvested Rent:</span>
            <span className="text-[#35C9F5] font-bold">
              +{formatCurrency(rawPoint.cumulativeCompoundedYieldEUR)}
            </span>
          </div>
        )}
      </div>
    );
  };

  return (
    <section
      aria-label="5-Year Projected Annual Rental Yield Growth"
      className="bg-[#151515] border border-[#303030] rounded-2xl p-4 sm:p-5 shadow-xl space-y-4 text-white"
    >
      {/* Header & Top-Level Controls */}
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-3 pb-4 border-b border-[#303030]">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-[#A0A0A0]">
            <span className="font-semibold text-[#35C9F5]">
              5-Year Rental Yield Forecast
            </span>
            <span aria-hidden="true">·</span>
            <span>
              {activePositions.length} Selected{' '}
              {activePositions.length === 1 ? 'Property' : 'Properties'}
            </span>
            <span aria-hidden="true">·</span>
            <span>
              {hasOwnedHoldings && !includesSimulatedAssets
                ? 'Active Ledger Holdings'
                : includesSimulatedAssets && hasOwnedHoldings
                ? 'Holdings + Simulated Offerings'
                : 'Model Portfolio Simulation'}
            </span>
          </div>
          <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-[#35C9F5] shrink-0" />
            <span>Projected Annual Rental Yield Growth (5-Year Horizon)</span>
          </h2>
          <p className="text-xs text-[#A0A0A0] max-w-2xl">
            Models contractual European lease indexation, reinvested SPV dividend compounding, and occupancy stress-testing across your selected property portfolio.
          </p>
        </div>

        {/* Metric Mode & Lease Escalation Controls */}
        <div className="flex flex-wrap items-center gap-2 self-start">
          {/* Metric View Selector */}
          <div
            role="group"
            aria-label="Chart metric view"
            className="inline-flex items-center p-0.5 rounded-lg bg-[#202020] border border-[#303030] text-xs"
          >
            <button
              type="button"
              onClick={() => setMetricMode('yield_percent')}
              className={`px-2.5 py-1.5 rounded-md font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                metricMode === 'yield_percent'
                  ? 'bg-white text-[#080808] font-bold shadow-sm'
                  : 'text-[#A0A0A0] hover:text-white'
              }`}
            >
              Yield Rate (% p.a.)
            </button>
            <button
              type="button"
              onClick={() => setMetricMode('annual_eur')}
              className={`px-2.5 py-1.5 rounded-md font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                metricMode === 'annual_eur'
                  ? 'bg-white text-[#080808] font-bold shadow-sm'
                  : 'text-[#A0A0A0] hover:text-white'
              }`}
            >
              Annual Income (€)
            </button>
            <button
              type="button"
              onClick={() => setMetricMode('by_property')}
              className={`px-2.5 py-1.5 rounded-md font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                metricMode === 'by_property'
                  ? 'bg-white text-[#080808] font-bold shadow-sm'
                  : 'text-[#A0A0A0] hover:text-white'
              }`}
            >
              By Property (€)
            </button>
          </div>

          {/* CPI Lease Escalation Selector */}
          <div
            role="group"
            aria-label="Annual lease indexation assumption"
            className="inline-flex items-center p-0.5 rounded-lg bg-[#202020] border border-[#303030] text-xs"
          >
            {([1.5, 2.5, 3.5] as IndexationPreset[]).map((rate) => (
              <button
                key={rate}
                type="button"
                onClick={() => setIndexationPreset(rate)}
                title={`Annual lease CPI escalation +${rate}%`}
                className={`px-2 py-1.5 rounded-md font-mono tabular-nums font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  indexationPreset === rate
                    ? 'bg-white text-[#080808] font-bold shadow-sm'
                    : 'text-[#A0A0A0] hover:text-white'
                }`}
              >
                +{rate}% CPI
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Portfolio Property Selector Bar */}
      <div className="space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs">
            <SlidersHorizontal className="w-3.5 h-3.5 text-[#35C9F5]" />
            <span className="font-bold text-white">
              Selected Property Portfolio
            </span>
            {!hasOwnedHoldings && (
              <span className="text-[11px] text-[#A0A0A0]">
                · No owned SPVs yet — modeling starter catalog selection
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            {catalogCandidates.length > 0 && (
              <button
                type="button"
                onClick={() => setShowCatalogPicker((v) => !v)}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-[#303030] bg-[#202020] hover:border-white text-white font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Plus className="w-3 h-3 text-[#35C9F5]" />
                <span>
                  {showCatalogPicker ? 'Hide Catalog Offerings' : 'Simulate Additional Offerings'}
                </span>
              </button>
            )}

            <button
              type="button"
              onClick={handleResetSelection}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-[#303030] bg-[#202020] hover:bg-[#282828] text-[#A0A0A0] hover:text-white font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset Selection</span>
            </button>
          </div>
        </div>

        {/* Owned Holdings Toggle Buttons */}
        {ownedPositions.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {ownedPositions.map((pos, idx) => {
              const isSelected = selectedIds.includes(pos.propertyId);
              const rainbowBadgeColor = RAINBOW_COLORS[idx % RAINBOW_COLORS.length];
              return (
                <button
                  key={pos.propertyId}
                  type="button"
                  onClick={() => togglePropertySelection(pos.propertyId)}
                  className={`text-left p-2.5 rounded-xl border transition-colors flex items-center justify-between gap-2.5 cursor-pointer ${
                    isSelected
                      ? 'border-white bg-[#202020]'
                      : 'border-[#303030] bg-[#151515] opacity-60 hover:opacity-100'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className={`w-4 h-4 rounded flex items-center justify-center border shrink-0 ${
                        isSelected
                          ? 'bg-white border-white text-black'
                          : 'border-[#444444]'
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                    </span>
                    <div className="min-w-0">
                      <span className="text-xs font-bold text-white block truncate">
                        {pos.title}
                      </span>
                      <span className="text-[10.5px] font-mono tabular-nums text-[#A0A0A0] block truncate">
                        {formatCurrency(pos.allocatedCapitalEUR)} · {pos.tokens} units
                      </span>
                    </div>
                  </div>
                  <span
                    className="font-mono tabular-nums text-xs font-bold shrink-0"
                    style={{ color: rainbowBadgeColor }}
                  >
                    {formatPercent(pos.annualYieldPercent)}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* Simulated Catalog Offerings Picker */}
        {showCatalogPicker && catalogCandidates.length > 0 && (
          <div className="pt-2 border-t border-[#303030] space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="text-[11px] font-semibold text-[#A0A0A0]">
                {hasOwnedHoldings
                  ? 'Select marketplace properties to model expanding your portfolio:'
                  : 'Select Kretz offerings and allocation per property to project 5-year yield growth:'}
              </span>
              <div className="inline-flex items-center gap-1 font-mono tabular-nums text-[11px]">
                <span className="text-[#A0A0A0] mr-1">Per-Asset Capital:</span>
                {ALLOCATION_PRESETS.map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setSimulatedAllocationEUR(amt)}
                    className={`px-2 py-0.5 rounded border cursor-pointer transition-colors whitespace-nowrap shrink-0 ${
                      simulatedAllocationEUR === amt
                        ? 'bg-white text-black border-white font-bold'
                        : 'border-[#303030] text-[#A0A0A0] hover:border-[#666666]'
                    }`}
                  >
                    {formatCurrency(amt)}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
              {catalogCandidates.map((cand, idx) => {
                const isSelected = selectedIds.includes(cand.propertyId);
                const rainbowBadgeColor = RAINBOW_COLORS[(idx + 2) % RAINBOW_COLORS.length];
                return (
                  <button
                    key={cand.propertyId}
                    type="button"
                    onClick={() => togglePropertySelection(cand.propertyId)}
                    className={`text-left p-2.5 rounded-xl border transition-colors flex items-center justify-between gap-2 cursor-pointer ${
                      isSelected
                        ? 'border-white bg-[#202020]'
                        : 'border-[#303030] bg-[#151515] opacity-65 hover:opacity-100'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className={`w-4 h-4 rounded flex items-center justify-center border shrink-0 ${
                          isSelected
                            ? 'bg-white border-white text-black'
                            : 'border-[#444444]'
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                      </span>
                      <div className="min-w-0">
                        <span className="text-xs font-semibold text-white block truncate">
                          {cand.title}
                        </span>
                        <span className="text-[10px] text-[#A0A0A0] block truncate">
                          {cand.location}
                        </span>
                      </div>
                    </div>
                    <span
                      className="font-mono tabular-nums text-[11px] font-bold shrink-0"
                      style={{ color: rainbowBadgeColor }}
                    >
                      {formatPercent(cand.annualYieldPercent)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Empty Selection Guard vs Populated Projection */}
      {activePositions.length === 0 ? (
        <div className="py-10 px-4 text-center space-y-3 bg-[#1D1D1D] rounded-xl border border-dashed border-[#303030]">
          <Building2 className="w-7 h-7 text-[#A0A0A0] mx-auto opacity-60" />
          <div className="space-y-1">
            <p className="text-xs font-bold text-white">
              Select at least one property to calculate the 5-year rental yield curve
            </p>
            <p className="text-[11px] text-[#A0A0A0] max-w-md mx-auto">
              Toggle one or more SPV properties above to inspect projected annual yield-on-cost, reinvested compounding, and downside sensitivity.
            </p>
          </div>
          <div className="flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={handleResetSelection}
              className="px-3.5 py-1.5 rounded-lg bg-white hover:bg-[#E5E5E5] text-black text-xs font-bold cursor-pointer transition-colors shadow-sm"
            >
              Restore Default Portfolio
            </button>
            <button
              type="button"
              onClick={onExploreProperties}
              className="px-3.5 py-1.5 rounded-lg border border-[#303030] text-xs font-semibold text-white cursor-pointer bg-[#151515] hover:bg-[#202020] transition-colors inline-flex items-center gap-1"
            >
              <span>Browse Marketplace</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* 4 Summary KPI Cells */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-xl bg-[#202020] border border-[#303030]">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#A0A0A0] block">
                Selected Portfolio Capital
              </span>
              <div className="text-lg sm:text-xl font-bold font-mono tabular-nums text-white mt-1">
                {formatCurrency(projection.totalCapitalEUR)}
              </div>
              <span className="text-[11px] text-[#A0A0A0] mt-0.5 block font-mono tabular-nums">
                Across {activePositions.length} SPV{' '}
                {activePositions.length === 1 ? 'asset' : 'assets'}
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-[#202020] border border-[#303030]">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#A0A0A0] block">
                Year 1 Initial Net Yield
              </span>
              <div className="text-lg sm:text-xl font-bold font-mono tabular-nums text-white mt-1">
                {formatPercent(projection.weightedYear1YieldPercent)}
              </div>
              <span className="text-[11px] text-[#A0A0A0] mt-0.5 block font-mono tabular-nums">
                {formatCurrency(projection.year1AnnualYieldEUR)} / yr initial run-rate
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-[#202020] border border-[#303030]">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#A0A0A0] block">
                Year 5 Compounded Yield-on-Cost
              </span>
              <div className="text-lg sm:text-xl font-bold font-mono tabular-nums text-[#35C9F5] mt-1">
                {formatPercent(projection.year5CompoundedYieldOnCostPercent)}
              </div>
              <span className="text-[11px] text-[#38C982] mt-0.5 block font-mono tabular-nums font-semibold">
                +{projection.fiveYearYieldExpansionPercent.toFixed(2)}% yield expansion ({formatCurrency(projection.year5CompoundedYieldEUR)}/yr)
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-[#202020] border border-[#303030]">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#A0A0A0] block">
                5-Year Cumulative Net Rent
              </span>
              <div className="text-lg sm:text-xl font-bold font-mono tabular-nums text-white mt-1">
                +{formatCurrency(projection.totalFiveYearCompoundedDistributionsEUR)}
              </div>
              <span className="text-[11px] text-[#A0A0A0] mt-0.5 block font-mono tabular-nums">
                +{formatCurrency(projection.compoundingAdvantageEUR)} vs. cash payout
              </span>
            </div>
          </div>

          {/* Primary Recharts 5-Year LineChart with Rainbow Visuals */}
          <div className="h-72 sm:h-80 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={chartData}
                margin={{ top: 12, right: 18, left: 4, bottom: 4 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#262626" opacity={0.8} />
                <XAxis
                  dataKey="yearLabel"
                  tick={{ fontSize: 11, fill: '#A0A0A0' }}
                  tickMargin={8}
                  stroke="#303030"
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#A0A0A0' }}
                  stroke="#303030"
                  width={68}
                  domain={metricMode === 'yield_percent' ? ['auto', 'auto'] : [0, 'auto']}
                  tickFormatter={(v) =>
                    metricMode === 'yield_percent'
                      ? `${Number(v).toFixed(1)}%`
                      : `€${Number(v) >= 1000 ? `${(Number(v) / 1000).toFixed(1)}k` : Number(v).toFixed(0)}`
                  }
                />
                <Tooltip content={renderCustomTooltip} />
                <Legend wrapperStyle={{ fontSize: '11.5px', paddingTop: '8px', color: '#FFFFFF' }} />

                {metricMode === 'yield_percent' && (
                  <>
                    <ReferenceLine
                      y={projection.weightedYear1YieldPercent}
                      stroke="#4287FF"
                      strokeDasharray="3 3"
                    />
                    <Line
                      type="monotone"
                      dataKey="compoundedYieldOnCostPercent"
                      name="Compounded Reinvestment YoC (%)"
                      stroke="#35C9F5"
                      strokeWidth={2.75}
                      dot={{ r: 4, strokeWidth: 2, fill: '#35C9F5' }}
                      activeDot={{ r: 6 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="cashYieldOnCostPercent"
                      name="Cash Payout Lease-Indexed YoC (%)"
                      stroke="#38C982"
                      strokeWidth={2.25}
                      dot={{ r: 3.5, strokeWidth: 2, fill: '#38C982' }}
                      activeDot={{ r: 5.5 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="downsideYieldOnCostPercent"
                      name="Stress-Tested Downside YoC (%)"
                      stroke="#FF4D4D"
                      strokeWidth={1.75}
                      strokeDasharray="5 4"
                      dot={{ r: 3, fill: '#FF4D4D' }}
                      activeDot={{ r: 5 }}
                    />
                  </>
                )}

                {metricMode === 'annual_eur' && (
                  <>
                    <Line
                      type="monotone"
                      dataKey="compoundedAnnualYieldEUR"
                      name="Compounded Annual Rent (€)"
                      stroke="#35C9F5"
                      strokeWidth={2.75}
                      dot={{ r: 4, strokeWidth: 2, fill: '#35C9F5' }}
                      activeDot={{ r: 6 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="cashAnnualYieldEUR"
                      name="Standard Cash Payout Rent (€)"
                      stroke="#38C982"
                      strokeWidth={2.25}
                      dot={{ r: 3.5, strokeWidth: 2, fill: '#38C982' }}
                      activeDot={{ r: 5.5 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="downsideAnnualYieldEUR"
                      name="Stress-Tested Downside Rent (€)"
                      stroke="#FF9F43"
                      strokeWidth={1.75}
                      strokeDasharray="5 4"
                      dot={{ r: 3, fill: '#FF9F43' }}
                      activeDot={{ r: 5 }}
                    />
                  </>
                )}

                {metricMode === 'by_property' &&
                  activePositions.map((pos) => (
                    <Line
                      key={pos.propertyId}
                      type="monotone"
                      dataKey={`prop_${pos.propertyId}`}
                      name={
                        pos.title.length > 26 ? `${pos.title.slice(0, 24)}…` : pos.title
                      }
                      stroke={pos.color}
                      strokeWidth={2.25}
                      dot={{ r: 3.5, fill: pos.color }}
                      activeDot={{
                        r: 5.5,
                        onClick: () => onSelectProperty(pos.propertyId),
                      }}
                    />
                  ))}
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* 5-Year Annual Yield Schedule Table */}
          <div className="pt-3 border-t border-[#303030] overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#303030] text-[10px] uppercase tracking-wider text-[#A0A0A0] bg-[#202020]">
                  <th className="py-2.5 px-3">Projection Year</th>
                  <th className="py-2.5 px-3 text-right">Cash Payout (€/yr)</th>
                  <th className="py-2.5 px-3 text-right">Cash YoC</th>
                  <th className="py-2.5 px-3 text-right">Compounded Rent (€/yr)</th>
                  <th className="py-2.5 px-3 text-right">Compounded YoC</th>
                  <th className="py-2.5 px-3 text-right">Downside Stress (€/yr)</th>
                  <th className="py-2.5 px-3 text-right">Cumulative Reinvested</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#262626] font-mono tabular-nums bg-[#151515]">
                {projection.points.map((pt) => (
                  <tr
                    key={pt.yearIndex}
                    className="hover:bg-[#202020] transition-colors"
                  >
                    <td className="py-2.5 px-3 font-sans font-bold text-white whitespace-nowrap">
                      {pt.yearLabel}{' '}
                      <span className="font-normal text-[#A0A0A0]">
                        ({pt.calendarYear})
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right text-[#A0A0A0]">
                      {formatCurrency(pt.cashAnnualYieldEUR)}
                    </td>
                    <td className="py-2.5 px-3 text-right text-[#35C9F5] font-semibold">
                      {formatPercent(pt.cashYieldOnCostPercent)}
                    </td>
                    <td className="py-2.5 px-3 text-right text-[#38C982] font-semibold">
                      {formatCurrency(pt.compoundedAnnualYieldEUR)}
                    </td>
                    <td className="py-2.5 px-3 text-right text-[#38C982] font-bold">
                      {formatPercent(pt.compoundedYieldOnCostPercent)}
                    </td>
                    <td className="py-2.5 px-3 text-right text-[#FF9F43]">
                      {formatCurrency(pt.downsideAnnualYieldEUR)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-white">
                      +{formatCurrency(pt.cumulativeCompoundedYieldEUR)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-[11px] text-[#A0A0A0] leading-relaxed">
            Methodology: Projections apply each selected SPV&rsquo;s contractual net rental yield, selected annual European CPI lease escalation (+{indexationPreset}% p.a.), and optional annual dividend reinvestment. Stress-tested downside curves apply property-level vacancy sensitivity assumptions. Forward projections are illustrative and do not guarantee future distributions.
          </p>
        </>
      )}
    </section>
  );
};
