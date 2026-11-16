import React, { useState, useMemo, useEffect, useRef } from 'react';
import { formatCurrency } from '../../lib/utils';
import { TrendingUp, ArrowRight, Plus } from 'lucide-react';
import { AnimatedNumericValue } from '../dashboard/AnimatedNumericValue';

export type TimeRange = '1M' | '3M' | '6M' | '1Y' | 'ALL';
export type MetricType = 'valuation' | 'dividends';

export interface PerformanceHistoryPoint {
  timestamp: string;
  label: string;
  valuation: number;
  dividends: number;
}

interface ChartPoint {
  date: string;
  timestamp: number;
  valuation: number;
  dividends: number;
  label: string;
}

interface PortfolioPerformanceChartProps {
  historyPoints?: PerformanceHistoryPoint[];
  initialValuation?: number;
  currentValuation?: number;
  totalDividends?: number;
  onExploreProperties?: () => void;
  onDeposit?: () => void;
  className?: string;
}

export const PortfolioPerformanceChart: React.FC<PortfolioPerformanceChartProps> = ({
  historyPoints = [],
  initialValuation = 0,
  currentValuation = 0,
  totalDividends = 0,
  onExploreProperties,
  onDeposit,
  className = '',
}) => {
  const [timeRange, setTimeRange] = useState<TimeRange>('6M');
  const [metric, setMetric] = useState<MetricType>('valuation');
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [isRendered, setIsRendered] = useState<boolean>(false);
  const pathRef = useRef<SVGPolylineElement | null>(null);

  const effectiveCurrent = Math.max(0, Number(currentValuation || 0));
  const effectiveInitial = Math.max(0, Number(initialValuation || 0));
  const effectiveDividends = Math.max(0, Number(totalDividends || 0));

  useEffect(() => {
    setIsRendered(false);
    const timeout = setTimeout(() => {
      setIsRendered(true);
    }, 40);
    return () => clearTimeout(timeout);
  }, [timeRange, metric, historyPoints.length]);

  const historicalData = useMemo<ChartPoint[]>(() => {
    if (!Array.isArray(historyPoints) || historyPoints.length === 0) return [];

    const nowMs = Date.now();
    const rangeDaysMap: Record<TimeRange, number | null> = {
      '1M': 30,
      '3M': 90,
      '6M': 180,
      '1Y': 365,
      ALL: null,
    };
    const days = rangeDaysMap[timeRange];
    const cutoffMs = days !== null ? nowMs - days * 86_400_000 : null;

    const sorted = [...historyPoints]
      .map((pt) => {
        const ts = new Date(pt.timestamp).getTime();
        const d = new Date(Number.isNaN(ts) ? Date.now() : ts);
        return {
          timestamp: Number.isNaN(ts) ? nowMs : ts,
          date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }),
          label: pt.label || d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }),
          valuation: Math.max(0, Number(pt.valuation || 0)),
          dividends: Math.max(0, Number(pt.dividends || 0)),
        };
      })
      .sort((a, b) => a.timestamp - b.timestamp);

    const filtered = cutoffMs !== null ? sorted.filter((pt) => pt.timestamp >= cutoffMs) : sorted;
    return filtered;
  }, [historyPoints, timeRange]);

  const hasSufficientHistory = historicalData.length >= 2;
  const hoveredPoint = hoveredIndex !== null ? historicalData[hoveredIndex] ?? null : null;

  // Chart dimensions & scaling
  const width = 640;
  const height = 220;
  const padding = { top: 20, right: 20, bottom: 35, left: 60 };

  const activeValues = historicalData.map((d) => (metric === 'dividends' ? d.dividends : d.valuation));
  const rawMin = activeValues.length > 0 ? Math.min(...activeValues) : 0;
  const rawMax = activeValues.length > 0 ? Math.max(...activeValues) : 100;
  const minVal = rawMin === rawMax ? Math.max(0, rawMin * 0.9) : rawMin * 0.95;
  const maxVal = rawMin === rawMax ? Math.max(10, rawMax * 1.1) : rawMax * 1.05;

  const getX = (index: number) =>
    historicalData.length > 1
      ? padding.left + (index / (historicalData.length - 1)) * (width - padding.left - padding.right)
      : padding.left;

  const getY = (val: number) =>
    height - padding.bottom - ((val - minVal) / (maxVal - minVal || 1)) * (height - padding.top - padding.bottom);

  const points = hasSufficientHistory
    ? historicalData.map((d, i) => `${getX(i)},${getY(metric === 'dividends' ? d.dividends : d.valuation)}`).join(' ')
    : '';
  const areaPoints = hasSufficientHistory
    ? `${getX(0)},${height - padding.bottom} ${points} ${getX(historicalData.length - 1)},${height - padding.bottom}`
    : '';

  const lastIndex = historicalData.length - 1;
  const lastX = lastIndex >= 0 ? getX(lastIndex) : 0;
  const lastY =
    lastIndex >= 0
      ? getY(metric === 'dividends' ? historicalData[lastIndex].dividends : historicalData[lastIndex].valuation)
      : 0;

  const capitalGrowth = effectiveCurrent - effectiveInitial;
  const totalReturnPercent =
    effectiveInitial > 0
      ? ((effectiveCurrent + effectiveDividends - effectiveInitial) / effectiveInitial) * 100
      : 0;

  return (
    <div className={`portal-card rounded-[20px] p-5 sm:p-6 space-y-5 text-[var(--dash-text)] ${className}`}>
      {/* Chart Top Control Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[var(--dash-card-border)]">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="p-1.5 rounded-lg bg-[var(--dash-inner)] border border-[var(--dash-card-border)] text-[var(--dash-accent)]">
              <TrendingUp className="w-4 h-4" />
            </span>
            <h3 className="text-sm sm:text-base font-bold text-[var(--dash-text)] tracking-tight">
              Portfolio Performance
            </h3>
          </div>
          <p className="text-xs text-[var(--dash-text-muted)] mt-1">
            Verified historical account NAV progression and cumulative rental distributions
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Metric Selector */}
          <div className="flex items-center p-1 bg-[var(--dash-inner)] border border-[var(--dash-card-border)] rounded-xl text-xs font-semibold">
            <button
              type="button"
              onClick={() => setMetric('valuation')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                metric === 'valuation'
                  ? 'bg-[var(--dash-accent)] text-[var(--dash-accent-ink)] font-bold'
                  : 'text-[var(--dash-text-secondary)] hover:text-[var(--dash-text)]'
              }`}
            >
              NAV Value
            </button>
            <button
              type="button"
              onClick={() => setMetric('dividends')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                metric === 'dividends'
                  ? 'bg-[var(--dash-accent)] text-[var(--dash-accent-ink)] font-bold'
                  : 'text-[var(--dash-text-secondary)] hover:text-[var(--dash-text)]'
              }`}
            >
              Distributions
            </button>
          </div>

          {/* Time Range Selector */}
          <div className="flex items-center p-1 bg-[var(--dash-inner)] border border-[var(--dash-card-border)] rounded-xl text-xs font-semibold">
            {(['1M', '3M', '6M', '1Y', 'ALL'] as TimeRange[]).map((range) => (
              <button
                key={range}
                type="button"
                onClick={() => setTimeRange(range)}
                className={`px-2.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                  timeRange === range
                    ? 'bg-[var(--dash-accent)] text-[var(--dash-accent-ink)] font-bold'
                    : 'text-[var(--dash-text-secondary)] hover:text-[var(--dash-text)]'
                }`}
              >
                {range}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-xl bg-[var(--dash-inner)] border border-[var(--dash-card-border)]">
        <div className="space-y-1">
          <span className="text-[10px] font-semibold text-[var(--dash-text-muted)] uppercase tracking-wider block">
            Current Valuation
          </span>
          <span className="text-sm sm:text-base font-semibold text-[var(--dash-text)] block">
            <AnimatedNumericValue value={effectiveCurrent} variant="primary" />
          </span>
        </div>
        <div className="space-y-1">
          <span className="text-[10px] font-semibold text-[var(--dash-text-muted)] uppercase tracking-wider block">
            Collected Rent
          </span>
          <span className="text-sm sm:text-base font-semibold text-[var(--dash-positive)] block">
            <AnimatedNumericValue value={effectiveDividends} prefix={effectiveDividends > 0 ? '+' : ''} variant="positive" />
          </span>
        </div>
        <div className="space-y-1">
          <span className="text-[10px] font-semibold text-[var(--dash-text-muted)] uppercase tracking-wider block">
            Net Asset Gain
          </span>
          <span className="text-sm sm:text-base font-semibold text-[var(--dash-positive)] block">
            <AnimatedNumericValue value={Math.max(0, capitalGrowth)} prefix={capitalGrowth > 0 ? '+' : ''} variant="positive" />
          </span>
        </div>
        <div className="space-y-1">
          <span className="text-[10px] font-semibold text-[var(--dash-text-muted)] uppercase tracking-wider block">
            Realized Return
          </span>
          <span className="financial-num text-sm sm:text-base font-semibold text-[var(--dash-positive)] block">
            {totalReturnPercent > 0 ? `+${totalReturnPercent.toFixed(2)}%` : '0.00%'}
          </span>
        </div>
      </div>

      {/* SVG Historical Chart OR Verified Empty State */}
      {!hasSufficientHistory ? (
        <div className="rounded-xl border border-dashed border-[var(--dash-card-border)] bg-[var(--dash-inner)] p-6 sm:p-8 text-center space-y-3">
          <div className="w-10 h-10 rounded-xl bg-[var(--dash-card)] border border-[var(--dash-card-border)] text-[var(--dash-accent)] flex items-center justify-center mx-auto">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div className="max-w-md mx-auto space-y-1">
            <h4 className="text-sm font-bold text-[var(--dash-text)]">
              {historicalData.length === 1
                ? 'Awaiting additional settled activity for this timeframe'
                : 'No verified historical performance data yet'}
            </h4>
            <p className="text-xs text-[var(--dash-text-muted)] leading-relaxed">
              Historical valuation curves are plotted exclusively from confirmed deposits, SPV allocations, and settled rental distributions. No projected or synthetic series are generated.
            </p>
          </div>
          {(onDeposit || onExploreProperties) && (
            <div className="flex flex-wrap items-center justify-center gap-2.5 pt-1">
              {onDeposit && (
                <button
                  type="button"
                  onClick={onDeposit}
                  className="portal-btn !h-9 !px-4 text-xs inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Deposit Funds</span>
                </button>
              )}
              {onExploreProperties && (
                <button
                  type="button"
                  onClick={onExploreProperties}
                  className="portal-btn-outline !h-9 !px-4 text-xs inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <span>Explore Properties</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="relative w-full overflow-hidden pt-2">
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="w-full h-auto overflow-visible select-none"
          >
            <defs>
              <linearGradient id="valuationGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#6FD8B0" stopOpacity="0.28" />
                <stop offset="100%" stopColor="#070A09" stopOpacity="0.0" />
              </linearGradient>

              <linearGradient id="dividendGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#D8B77C" stopOpacity="0.28" />
                <stop offset="100%" stopColor="#070A09" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Y Axis Grid Lines */}
            {[0, 0.33, 0.66, 1].map((ratio, i) => {
              const val = minVal + (maxVal - minVal) * (1 - ratio);
              const y = padding.top + ratio * (height - padding.top - padding.bottom);
              const labelStr = val >= 1000 ? `€${(val / 1000).toFixed(1)}k` : `€${Math.round(val)}`;
              return (
                <g key={i}>
                  <line
                    x1={padding.left}
                    y1={y}
                    x2={width - padding.right}
                    y2={y}
                    stroke="rgba(255, 255, 255, 0.08)"
                    strokeDasharray="4 4"
                  />
                  <text
                    x={padding.left - 10}
                    y={y + 3.5}
                    textAnchor="end"
                    className="text-[10px] font-mono fill-[var(--dash-text-muted)]"
                  >
                    {labelStr}
                  </text>
                </g>
              );
            })}

            <polygon
              points={areaPoints}
              fill={`url(#${metric === 'dividends' ? 'dividendGradient' : 'valuationGradient'})`}
              className="transition-opacity duration-500"
              style={{ opacity: isRendered ? 1 : 0 }}
            />

            <polyline
              ref={pathRef}
              fill="none"
              stroke={metric === 'dividends' ? '#D8B77C' : '#6FD8B0'}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              points={points}
              style={{
                transition: 'stroke 300ms ease, opacity 400ms ease',
                opacity: isRendered ? 1 : 0.25,
              }}
            />

            {lastIndex >= 0 && (
              <circle
                cx={lastX}
                cy={lastY}
                r="4.5"
                fill="#FFFFFF"
                stroke={metric === 'dividends' ? '#D8B77C' : '#6FD8B0'}
                strokeWidth="2.25"
              />
            )}

            {/* X Axis Date Labels */}
            {historicalData.map((d, i) => {
              const step = Math.max(1, Math.ceil(historicalData.length / 5));
              if (i % step !== 0 && i !== historicalData.length - 1) return null;
              const x = getX(i);
              return (
                <text
                  key={`${d.timestamp}-${i}`}
                  x={x}
                  y={height - 10}
                  textAnchor="middle"
                  className="text-[9.5px] font-mono fill-[var(--dash-text-muted)]"
                >
                  {d.date}
                </text>
              );
            })}

            {/* Interactive Data Nodes */}
            {historicalData.map((d, i) => {
              const x = getX(i);
              const val = metric === 'dividends' ? d.dividends : d.valuation;
              const y = getY(val);
              const isHovered = hoveredIndex === i;

              return (
                <g
                  key={`pt-${d.timestamp}-${i}`}
                  onMouseEnter={() => setHoveredIndex(i)}
                  onMouseLeave={() => setHoveredIndex(null)}
                  className="cursor-pointer"
                >
                  {isHovered && (
                    <line
                      x1={x}
                      y1={padding.top}
                      x2={x}
                      y2={height - padding.bottom}
                      stroke="rgba(255, 255, 255, 0.45)"
                      strokeWidth="1.25"
                      strokeDasharray="3 3"
                    />
                  )}

                  <circle
                    cx={x}
                    cy={y}
                    r={isHovered ? 5.5 : 3.25}
                    className="transition-all duration-150"
                    fill={isHovered ? '#FFFFFF' : metric === 'dividends' ? '#D8B77C' : '#6FD8B0'}
                    stroke={metric === 'dividends' ? '#D8B77C' : '#6FD8B0'}
                    strokeWidth={isHovered ? 2 : 1.25}
                  />
                </g>
              );
            })}
          </svg>

          {hoveredPoint && (
            <div className="absolute top-2 right-2 p-3 rounded-xl bg-[var(--dash-card)] text-[var(--dash-text)] text-xs shadow-2xl border border-[var(--dash-card-border)] font-mono space-y-1.5 z-20">
              <div className="text-[10px] text-[var(--dash-text-muted)] pb-1 border-b border-[var(--dash-card-border)]">
                {hoveredPoint.label}
              </div>
              <div className="flex justify-between gap-5 text-xs font-semibold">
                <span className="text-[var(--dash-text-muted)]">NAV Value:</span>
                <span className="text-[var(--dash-accent)]">{formatCurrency(hoveredPoint.valuation)}</span>
              </div>
              <div className="flex justify-between gap-5 text-xs font-semibold">
                <span className="text-[var(--dash-text-muted)]">Distributions:</span>
                <span className="text-[var(--dash-positive)]">+{formatCurrency(hoveredPoint.dividends)}</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
