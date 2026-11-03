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

interface ProjectedYieldGrowthChartProps {
  properties: Property[];
  investments: Investment[];
  onSelectProperty: (propertyId: string) => void;
  onExploreProperties: () => void;
}

type ChartMetricMode = 'yield_percent' | 'annual_eur' | 'by_property';
type IndexationPreset = 1.5 | 2.5 | 3.5;

const SERIES_PALETTE = [
  '#087F5B',
  '#1D4ED8',
  '#B45309',
  '#0F766E',
  '#4338CA',
  '#BE123C',
  '#15803D',
  '#334155',
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
      <div className="bg-slate-900/95 text-white p-3.5 rounded-xl border border-slate-700 shadow-xl text-xs space-y-2 max-w-xs z-50">
        <div className="flex items-center justify-between gap-4 border-b border-slate-800 pb-1.5">
          <span className="font-bold text-slate-100">{label}</span>
          <span className="font-mono tabular-nums text-[10.5px] text-slate-400">
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
                <span className="flex items-center gap-1.5 font-sans text-[11px] text-slate-300 truncate">
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
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
          <div className="pt-1.5 border-t border-slate-800 text-[10.5px] font-mono tabular-nums text-slate-400 flex items-center justify-between gap-2">
            <span>Cumulative Reinvested Rent:</span>
            <span className="text-emerald-400 font-bold">
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
      className="bg-white dark:bg-[#0D1522] border border-[#E4EEEA] dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-2xs space-y-4"
    >
      {/* Header & Top-Level Controls */}
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-3 pb-4 border-b border-[#E4EEEA] dark:border-slate-800">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-[#71817D] dark:text-slate-400">
            <span className="font-semibold text-[#087F5B] dark:text-[#3BD4AE]">
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
          <h2 className="text-base sm:text-lg font-bold text-[#172B2A] dark:text-white flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-[#087F5B] dark:text-[#3BD4AE] shrink-0" />
            <span>Projected Annual Rental Yield Growth (5-Year Horizon)</span>
          </h2>
          <p className="text-xs text-[#71817D] dark:text-slate-400 max-w-2xl">
            Models contractual European lease indexation, reinvested SPV dividend compounding, and occupancy stress-testing across your selected property portfolio.
          </p>
        </div>

        {/* Metric Mode & Lease Escalation Controls */}
        <div className="flex flex-wrap items-center gap-2 self-start">
          {/* Metric View Selector */}
          <div
            role="group"
            aria-label="Chart metric view"
            className="inline-flex items-center p-0.5 rounded-lg bg-slate-100 dark:bg-slate-800/90 border border-slate-200/70 dark:border-slate-700 text-xs"
          >
            <button
              type="button"
              onClick={() => setMetricMode('yield_percent')}
              className={`px-2.5 py-1.5 rounded-md font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                metricMode === 'yield_percent'
                  ? 'bg-white dark:bg-slate-700 text-[#172B2A] dark:text-white shadow-2xs'
                  : 'text-[#71817D] dark:text-slate-400 hover:text-[#172B2A] dark:hover:text-slate-200'
              }`}
            >
              Yield Rate (% p.a.)
            </button>
            <button
              type="button"
              onClick={() => setMetricMode('annual_eur')}
              className={`px-2.5 py-1.5 rounded-md font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                metricMode === 'annual_eur'
                  ? 'bg-white dark:bg-slate-700 text-[#172B2A] dark:text-white shadow-2xs'
                  : 'text-[#71817D] dark:text-slate-400 hover:text-[#172B2A] dark:hover:text-slate-200'
              }`}
            >
              Annual Income (€)
            </button>
            <button
              type="button"
              onClick={() => setMetricMode('by_property')}
              className={`px-2.5 py-1.5 rounded-md font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                metricMode === 'by_property'
                  ? 'bg-white dark:bg-slate-700 text-[#172B2A] dark:text-white shadow-2xs'
                  : 'text-[#71817D] dark:text-slate-400 hover:text-[#172B2A] dark:hover:text-slate-200'
              }`}
            >
              By Property (€)
            </button>
          </div>

          {/* CPI Lease Escalation Selector */}
          <div
            role="group"
            aria-label="Annual lease indexation assumption"
            className="inline-flex items-center p-0.5 rounded-lg bg-slate-100 dark:bg-slate-800/90 border border-slate-200/70 dark:border-slate-700 text-xs"
          >
            {([1.5, 2.5, 3.5] as IndexationPreset[]).map((rate) => (
              <button
                key={rate}
                type="button"
                onClick={() => setIndexationPreset(rate)}
                title={`Annual lease CPI escalation +${rate}%`}
                className={`px-2 py-1.5 rounded-md font-mono tabular-nums font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  indexationPreset === rate
                    ? 'bg-[#087F5B] text-white shadow-2xs'
                    : 'text-[#71817D] dark:text-slate-400 hover:text-[#172B2A] dark:hover:text-slate-200'
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
            <SlidersHorizontal className="w-3.5 h-3.5 text-[#087F5B] dark:text-[#3BD4AE]" />
            <span className="font-bold text-[#172B2A] dark:text-slate-200">
              Selected Property Portfolio
            </span>
            {!hasOwnedHoldings && (
              <span className="text-[11px] text-[#71817D] dark:text-slate-400">
                · No owned SPVs yet — modeling starter catalog selection
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            {catalogCandidates.length > 0 && (
              <button
                type="button"
                onClick={() => setShowCatalogPicker((v) => !v)}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-[#E4EEEA] dark:border-slate-700 bg-[#F6FAF8] dark:bg-slate-900 hover:border-[#087F5B] text-[#172B2A] dark:text-slate-200 font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Plus className="w-3 h-3 text-[#087F5B]" />
                <span>
                  {showCatalogPicker ? 'Hide Catalog Offerings' : 'Simulate Additional Offerings'}
                </span>
              </button>
            )}

            <button
              type="button"
              onClick={handleResetSelection}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-[#E4EEEA] dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-[#71817D] dark:text-slate-300 font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset Selection</span>
            </button>
          </div>
        </div>

        {/* Owned Holdings Toggle Buttons */}
        {ownedPositions.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {ownedPositions.map((pos) => {
              const isSelected = selectedIds.includes(pos.propertyId);
              return (
                <button
                  key={pos.propertyId}
                  type="button"
                  onClick={() => togglePropertySelection(pos.propertyId)}
                  className={`text-left p-2.5 rounded-xl border transition-colors flex items-center justify-between gap-2.5 cursor-pointer ${
                    isSelected
                      ? 'border-[#087F5B] bg-[#F6FAF8] dark:bg-emerald-950/30 dark:border-emerald-700'
                      : 'border-[#E4EEEA] dark:border-slate-800 bg-white dark:bg-slate-900/40 opacity-70 hover:opacity-100'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className={`w-4 h-4 rounded flex items-center justify-center border shrink-0 ${
                        isSelected
                          ? 'bg-[#087F5B] border-[#087F5B] text-white'
                          : 'border-slate-300 dark:border-slate-600'
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                    </span>
                    <div className="min-w-0">
                      <span className="text-xs font-bold text-[#172B2A] dark:text-white block truncate">
                        {pos.title}
                      </span>
                      <span className="text-[10.5px] font-mono tabular-nums text-[#71817D] dark:text-slate-400 block truncate">
                        {formatCurrency(pos.allocatedCapitalEUR)} · {pos.tokens} units
                      </span>
                    </div>
                  </div>
                  <span className="font-mono tabular-nums text-xs font-bold text-[#087F5B] dark:text-emerald-400 shrink-0">
                    {formatPercent(pos.annualYieldPercent)}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* Simulated Catalog Offerings Picker */}
        {showCatalogPicker && catalogCandidates.length > 0 && (
          <div className="pt-2 border-t border-[#E4EEEA] dark:border-slate-800 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="text-[11px] font-semibold text-[#71817D] dark:text-slate-400">
                {hasOwnedHoldings
                  ? 'Select marketplace properties to model expanding your portfolio:'
                  : 'Select Kretz offerings and allocation per property to project 5-year yield growth:'}
              </span>
              <div className="inline-flex items-center gap-1 font-mono tabular-nums text-[11px]">
                <span className="text-[#71817D] dark:text-slate-400 mr-1">Per-Asset Capital:</span>
                {ALLOCATION_PRESETS.map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setSimulatedAllocationEUR(amt)}
                    className={`px-2 py-0.5 rounded border cursor-pointer transition-colors whitespace-nowrap shrink-0 ${
                      simulatedAllocationEUR === amt
                        ? 'bg-[#172B2A] dark:bg-emerald-600 text-white border-[#172B2A] dark:border-emerald-600 font-bold'
                        : 'border-[#E4EEEA] dark:border-slate-700 text-[#71817D] dark:text-slate-300 hover:border-slate-400'
                    }`}
                  >
                    {formatCurrency(amt)}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
              {catalogCandidates.map((cand) => {
                const isSelected = selectedIds.includes(cand.propertyId);
                return (
                  <button
                    key={cand.propertyId}
                    type="button"
                    onClick={() => togglePropertySelection(cand.propertyId)}
                    className={`text-left p-2.5 rounded-xl border transition-colors flex items-center justify-between gap-2 cursor-pointer ${
                      isSelected
                        ? 'border-[#1D4ED8] bg-blue-50/50 dark:bg-blue-950/30 dark:border-blue-700'
                        : 'border-[#E4EEEA] dark:border-slate-800 bg-white dark:bg-slate-900/40 opacity-75 hover:opacity-100'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className={`w-4 h-4 rounded flex items-center justify-center border shrink-0 ${
                          isSelected
                            ? 'bg-[#1D4ED8] border-[#1D4ED8] text-white'
                            : 'border-slate-300 dark:border-slate-600'
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                      </span>
                      <div className="min-w-0">
                        <span className="text-xs font-semibold text-[#172B2A] dark:text-slate-100 block truncate">
                          {cand.title}
                        </span>
                        <span className="text-[10px] text-[#71817D] dark:text-slate-400 block truncate">
                          {cand.location}
                        </span>
                      </div>
                    </div>
                    <span className="font-mono tabular-nums text-[11px] font-bold text-[#1D4ED8] dark:text-blue-400 shrink-0">
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
        <div className="py-10 px-4 text-center space-y-3 bg-[#F6FAF8] dark:bg-slate-900/50 rounded-xl border border-dashed border-[#DCE8E3] dark:border-slate-800">
          <Building2 className="w-7 h-7 text-[#71817D] mx-auto opacity-60" />
          <div className="space-y-1">
            <p className="text-xs font-bold text-[#172B2A] dark:text-slate-200">
              Select at least one property to calculate the 5-year rental yield curve
            </p>
            <p className="text-[11px] text-[#71817D] dark:text-slate-400 max-w-md mx-auto">
              Toggle one or more SPV properties above to inspect projected annual yield-on-cost, reinvested compounding, and downside sensitivity.
            </p>
          </div>
          <div className="flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={handleResetSelection}
              className="px-3.5 py-1.5 rounded-lg bg-[#087F5B] hover:bg-[#075B46] text-white text-xs font-semibold cursor-pointer transition-colors"
            >
              Restore Default Portfolio
            </button>
            <button
              type="button"
              onClick={onExploreProperties}
              className="px-3.5 py-1.5 rounded-lg border border-[#E4EEEA] dark:border-slate-700 text-xs font-semibold text-[#172B2A] dark:text-slate-200 cursor-pointer hover:bg-white dark:hover:bg-slate-800 transition-colors inline-flex items-center gap-1"
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
            <div className="p-3.5 rounded-xl bg-[#F6FAF8] dark:bg-slate-900/70 border border-[#E4EEEA] dark:border-slate-800">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#71817D] dark:text-slate-400 block">
                Selected Portfolio Capital
              </span>
              <div className="text-lg sm:text-xl font-bold font-mono tabular-nums text-[#172B2A] dark:text-white mt-1">
                {formatCurrency(projection.totalCapitalEUR)}
              </div>
              <span className="text-[11px] text-[#71817D] dark:text-slate-400 mt-0.5 block font-mono tabular-nums">
                Across {activePositions.length} SPV{' '}
                {activePositions.length === 1 ? 'asset' : 'assets'}
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-[#F6FAF8] dark:bg-slate-900/70 border border-[#E4EEEA] dark:border-slate-800">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#71817D] dark:text-slate-400 block">
                Year 1 Initial Net Yield
              </span>
              <div className="text-lg sm:text-xl font-bold font-mono tabular-nums text-[#172B2A] dark:text-white mt-1">
                {formatPercent(projection.weightedYear1YieldPercent)}
              </div>
              <span className="text-[11px] text-[#71817D] dark:text-slate-400 mt-0.5 block font-mono tabular-nums">
                {formatCurrency(projection.year1AnnualYieldEUR)} / yr initial run-rate
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-[#F6FAF8] dark:bg-slate-900/70 border border-[#E4EEEA] dark:border-slate-800">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#71817D] dark:text-slate-400 block">
                Year 5 Compounded Yield-on-Cost
              </span>
              <div className="text-lg sm:text-xl font-bold font-mono tabular-nums text-[#087F5B] dark:text-emerald-400 mt-1">
                {formatPercent(projection.year5CompoundedYieldOnCostPercent)}
              </div>
              <span className="text-[11px] text-[#087F5B] dark:text-emerald-400 mt-0.5 block font-mono tabular-nums">
                +{projection.fiveYearYieldExpansionPercent.toFixed(2)}% yield expansion ({formatCurrency(projection.year5CompoundedYieldEUR)}/yr)
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-[#F6FAF8] dark:bg-slate-900/70 border border-[#E4EEEA] dark:border-slate-800">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#71817D] dark:text-slate-400 block">
                5-Year Cumulative Net Rent
              </span>
              <div className="text-lg sm:text-xl font-bold font-mono tabular-nums text-[#172B2A] dark:text-white mt-1">
                +{formatCurrency(projection.totalFiveYearCompoundedDistributionsEUR)}
              </div>
              <span className="text-[11px] text-[#71817D] dark:text-slate-400 mt-0.5 block font-mono tabular-nums">
                +{formatCurrency(projection.compoundingAdvantageEUR)} vs. cash payout
              </span>
            </div>
          </div>

          {/* Primary Recharts 5-Year LineChart */}
          <div className="h-72 sm:h-80 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={chartData}
                margin={{ top: 12, right: 18, left: 4, bottom: 4 }}
              >
                <CartesianGrid strokeDasharray="3 3" opacity={0.18} />
                <XAxis
                  dataKey="yearLabel"
                  tick={{ fontSize: 11 }}
                  tickMargin={8}
                />
                <YAxis
                  tick={{ fontSize: 11 }}
                  width={68}
                  domain={metricMode === 'yield_percent' ? ['auto', 'auto'] : [0, 'auto']}
                  tickFormatter={(v) =>
                    metricMode === 'yield_percent'
                      ? `${Number(v).toFixed(1)}%`
                      : `€${Number(v) >= 1000 ? `${(Number(v) / 1000).toFixed(1)}k` : Number(v).toFixed(0)}`
                  }
                />
                <Tooltip content={renderCustomTooltip} />
                <Legend wrapperStyle={{ fontSize: '11.5px', paddingTop: '8px' }} />

                {metricMode === 'yield_percent' && (
                  <>
                    <ReferenceLine
                      y={projection.weightedYear1YieldPercent}
                      stroke="#94A3B8"
                      strokeDasharray="3 3"
                    />
                    <Line
                      type="monotone"
                      dataKey="compoundedYieldOnCostPercent"
                      name="Compounded Reinvestment YoC (%)"
                      stroke="#087F5B"
                      strokeWidth={2.75}
                      dot={{ r: 4, strokeWidth: 2, fill: '#087F5B' }}
                      activeDot={{ r: 6 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="cashYieldOnCostPercent"
                      name="Cash Payout Lease-Indexed YoC (%)"
                      stroke="#1D4ED8"
                      strokeWidth={2.25}
                      dot={{ r: 3.5, strokeWidth: 2, fill: '#1D4ED8' }}
                      activeDot={{ r: 5.5 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="downsideYieldOnCostPercent"
                      name="Stress-Tested Downside YoC (%)"
                      stroke="#D97706"
                      strokeWidth={1.75}
                      strokeDasharray="5 4"
                      dot={{ r: 3, fill: '#D97706' }}
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
                      stroke="#087F5B"
                      strokeWidth={2.75}
                      dot={{ r: 4, strokeWidth: 2, fill: '#087F5B' }}
                      activeDot={{ r: 6 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="cashAnnualYieldEUR"
                      name="Standard Cash Payout Rent (€)"
                      stroke="#1D4ED8"
                      strokeWidth={2.25}
                      dot={{ r: 3.5, strokeWidth: 2, fill: '#1D4ED8' }}
                      activeDot={{ r: 5.5 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="downsideAnnualYieldEUR"
                      name="Stress-Tested Downside Rent (€)"
                      stroke="#D97706"
                      strokeWidth={1.75}
                      strokeDasharray="5 4"
                      dot={{ r: 3, fill: '#D97706' }}
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
          <div className="pt-3 border-t border-[#E4EEEA] dark:border-slate-800 overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#E4EEEA] dark:border-slate-800 text-[10px] uppercase tracking-wider text-[#71817D] dark:text-slate-400">
                  <th className="py-2 pr-3">Projection Year</th>
                  <th className="py-2 px-3 text-right">Cash Payout (€/yr)</th>
                  <th className="py-2 px-3 text-right">Cash YoC</th>
                  <th className="py-2 px-3 text-right">Compounded Rent (€/yr)</th>
                  <th className="py-2 px-3 text-right">Compounded YoC</th>
                  <th className="py-2 px-3 text-right">Downside Stress (€/yr)</th>
                  <th className="py-2 pl-3 text-right">Cumulative Reinvested</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E4EEEA] dark:divide-slate-800 font-mono tabular-nums">
                {projection.points.map((pt) => (
                  <tr
                    key={pt.yearIndex}
                    className="hover:bg-[#F6FAF8]/60 dark:hover:bg-slate-900/40"
                  >
                    <td className="py-2 pr-3 font-sans font-bold text-[#172B2A] dark:text-white whitespace-nowrap">
                      {pt.yearLabel}{' '}
                      <span className="font-normal text-[#71817D] dark:text-slate-400">
                        ({pt.calendarYear})
                      </span>
                    </td>
                    <td className="py-2 px-3 text-right text-[#172B2A] dark:text-slate-200">
                      {formatCurrency(pt.cashAnnualYieldEUR)}
                    </td>
                    <td className="py-2 px-3 text-right text-[#1D4ED8] dark:text-blue-400 font-semibold">
                      {formatPercent(pt.cashYieldOnCostPercent)}
                    </td>
                    <td className="py-2 px-3 text-right text-[#087F5B] dark:text-emerald-400 font-semibold">
                      {formatCurrency(pt.compoundedAnnualYieldEUR)}
                    </td>
                    <td className="py-2 px-3 text-right text-[#087F5B] dark:text-emerald-400 font-bold">
                      {formatPercent(pt.compoundedYieldOnCostPercent)}
                    </td>
                    <td className="py-2 px-3 text-right text-amber-700 dark:text-amber-400">
                      {formatCurrency(pt.downsideAnnualYieldEUR)}
                    </td>
                    <td className="py-2 pl-3 text-right font-bold text-[#172B2A] dark:text-white">
                      +{formatCurrency(pt.cumulativeCompoundedYieldEUR)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-[11px] text-[#71817D] dark:text-slate-400 leading-relaxed">
            Methodology: Projections apply each selected SPV&rsquo;s contractual net rental yield, selected annual European CPI lease escalation (+{indexationPreset}% p.a.), and optional annual dividend reinvestment. Stress-tested downside curves apply property-level vacancy sensitivity assumptions. Forward projections are illustrative and do not guarantee future distributions.
          </p>
        </>
      )}
    </section>
  );
};
