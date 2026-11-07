import React, { useState, useMemo, useEffect, useRef } from 'react';
import { formatCurrency, formatPercent } from '../../lib/utils';
import { TrendingUp } from 'lucide-react';
import { AnimatedNumericValue } from '../dashboard/AnimatedNumericValue';

export type TimeRange = '1M' | '3M' | '6M' | '1Y' | 'ALL';
export type MetricType = 'valuation' | 'dividends' | 'both';

interface DataPoint {
  date: string;
  valuation: number;
  dividends: number;
  label: string;
}

interface PortfolioPerformanceChartProps {
  initialValuation?: number;
  currentValuation?: number;
  totalDividends?: number;
  onExploreProperties?: () => void;
  onDeposit?: () => void;
  className?: string;
}

export const PortfolioPerformanceChart: React.FC<PortfolioPerformanceChartProps> = ({
  initialValuation,
  currentValuation,
  totalDividends,
  className = '',
}) => {
  const [timeRange, setTimeRange] = useState<TimeRange>('6M');
  const [metric, setMetric] = useState<MetricType>('valuation');
  const [hoveredPoint, setHoveredPoint] = useState<DataPoint | null>(null);
  const [isRendered, setIsRendered] = useState<boolean>(false);
  const pathRef = useRef<SVGPolylineElement | null>(null);

  // Default values if props are omitted or undefined
  const effectiveCurrent = currentValuation ?? 28450;
  const effectiveInitial = initialValuation ?? Math.round(effectiveCurrent * 0.85);
  const effectiveDividends = totalDividends ?? 2480;

  const isZeroState = effectiveCurrent === 0 && effectiveInitial === 0 && effectiveDividends === 0;

  // Trigger smooth line animation whenever range or metric changes
  useEffect(() => {
    setIsRendered(false);
    const timeout = setTimeout(() => {
      setIsRendered(true);
    }, 40);
    return () => clearTimeout(timeout);
  }, [timeRange, metric]);

  // Generate historical data based on timeRange
  const historicalData = useMemo<DataPoint[]>(() => {
    if (isZeroState) return [];

    const pointsCount = timeRange === '1M' ? 12 : timeRange === '3M' ? 14 : timeRange === '6M' ? 18 : 24;
    const data: DataPoint[] = [];

    const now = new Date();
    const startVal = Math.max(0, effectiveInitial);
    const endVal = Math.max(0, effectiveCurrent);
    const totalDiv = Math.max(0, effectiveDividends);

    for (let i = 0; i < pointsCount; i++) {
      const progress = i / (pointsCount - 1);
      const curveFactor = Math.pow(progress, 0.85);
      const wave = Math.sin(i * 0.7) * (endVal * 0.015);
      const val = Math.round(startVal + (endVal - startVal) * curveFactor + wave);
      const div = Math.round(totalDiv * progress);

      const d = new Date(now);
      const daysAgo = Math.round((1 - progress) * (timeRange === '1M' ? 30 : timeRange === '3M' ? 90 : timeRange === '6M' ? 180 : 365));
      d.setDate(d.getDate() - daysAgo);

      const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

      data.push({
        date: label,
        valuation: val,
        dividends: div,
        label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      });
    }

    return data;
  }, [timeRange, effectiveInitial, effectiveCurrent, effectiveDividends, isZeroState]);

  // Chart dimensions & scaling
  const width = 640;
  const height = 220;
  const padding = { top: 20, right: 20, bottom: 35, left: 55 };

  const activeValues = historicalData.map((d) => (metric === 'dividends' ? d.dividends : d.valuation));
  const minVal = Math.min(...activeValues) * 0.95;
  const maxVal = Math.max(...activeValues) * 1.05;

  const getX = (index: number) =>
    padding.left + (index / (historicalData.length - 1)) * (width - padding.left - padding.right);

  const getY = (val: number) =>
    height - padding.bottom - ((val - minVal) / (maxVal - minVal || 1)) * (height - padding.top - padding.bottom);

  // SVG Area Path & Line Path calculation
  const points = historicalData.map((d, i) => `${getX(i)},${getY(metric === 'dividends' ? d.dividends : d.valuation)}`).join(' ');
  const areaPoints = `${getX(0)},${height - padding.bottom} ${points} ${getX(historicalData.length - 1)},${height - padding.bottom}`;

  // Latest point coordinates for luminous active terminal node (inspired by IMG_7727)
  const lastIndex = historicalData.length - 1;
  const lastX = lastIndex >= 0 ? getX(lastIndex) : 0;
  const lastY = lastIndex >= 0 ? getY(metric === 'dividends' ? historicalData[lastIndex].dividends : historicalData[lastIndex].valuation) : 0;

  // Calculate return %
  const totalReturnPercent = effectiveInitial > 0
    ? ((effectiveCurrent + effectiveDividends - effectiveInitial) / effectiveInitial) * 100
    : 0;

  return (
    <div className={`cinematic-card rounded-[22px] p-5 sm:p-6 space-y-5 text-white ${className}`}>
      {/* Chart Top Control Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/[0.08]">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="p-1.5 rounded-lg bg-[#1D1E1E] border border-white/[0.1] text-[#55BDE8] shadow-inner">
              <TrendingUp className="w-4 h-4" />
            </span>
            <h3 className="text-sm sm:text-base font-bold text-[#F5F5F2] tracking-tight">
              Portfolio Growth &amp; Distribution Curve
            </h3>
          </div>
          <p className="text-xs text-[#A5A6A5] mt-1">
            Realized property asset NAV progression and cumulative monthly dividends
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Metric Selector */}
          <div className="flex items-center p-1 bg-[#141515] border border-white/[0.08] rounded-xl text-xs font-semibold shadow-inner">
            <button
              onClick={() => setMetric('valuation')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                metric === 'valuation'
                  ? 'bg-[#F5F5F2] text-[#070A09] font-bold shadow-sm'
                  : 'text-[#A5A6A5] hover:text-[#F5F5F2]'
              }`}
            >
              NAV Value
            </button>
            <button
              onClick={() => setMetric('dividends')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                metric === 'dividends'
                  ? 'bg-[#F5F5F2] text-[#070A09] font-bold shadow-sm'
                  : 'text-[#A5A6A5] hover:text-[#F5F5F2]'
              }`}
            >
              Dividends
            </button>
          </div>

          {/* Time Range Selector */}
          <div className="flex items-center p-1 bg-[#141515] border border-white/[0.08] rounded-xl text-xs font-semibold shadow-inner">
            {(['1M', '3M', '6M', '1Y', 'ALL'] as TimeRange[]).map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-2.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                  timeRange === range
                    ? 'bg-[#F5F5F2] text-[#070A09] font-bold shadow-sm'
                    : 'text-[#A5A6A5] hover:text-[#F5F5F2]'
                }`}
              >
                {range}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Summary KPI Strip with Animated Numeric Values */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-xl bg-[#141515]/90 border border-white/[0.08] shadow-inner">
        <div className="space-y-1">
          <span className="text-[10px] font-semibold text-[#777979] uppercase tracking-wider block">
            Current Holdings Value
          </span>
          <span className="text-sm sm:text-base font-[600] text-[#F5F5F2] block">
            <AnimatedNumericValue value={effectiveCurrent} variant="primary" />
          </span>
        </div>
        <div className="space-y-1">
          <span className="text-[10px] font-semibold text-[#777979] uppercase tracking-wider block">
            Cumulative Dividends
          </span>
          <span className="text-sm sm:text-base font-[600] text-[#43C98B] block">
            <AnimatedNumericValue value={effectiveDividends} prefix="+" variant="positive" />
          </span>
        </div>
        <div className="space-y-1">
          <span className="text-[10px] font-semibold text-[#777979] uppercase tracking-wider block">
            Total Capital Growth
          </span>
          <span className="text-sm sm:text-base font-[600] text-[#43C98B] block">
            <AnimatedNumericValue value={Math.max(0, effectiveCurrent - effectiveInitial)} prefix="+" variant="positive" />
          </span>
        </div>
        <div className="space-y-1">
          <span className="text-[10px] font-semibold text-[#777979] uppercase tracking-wider block">
            Overall Net ROI
          </span>
          <span className="financial-num text-sm sm:text-base font-[600] text-[#43C98B] block">
            +{totalReturnPercent.toFixed(2)}%
          </span>
        </div>
      </div>

      {/* SVG Interactive Vector Chart with Animated Stroke & Glowing Node */}
      <div className="relative w-full overflow-hidden pt-2">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto overflow-visible select-none"
        >
          <defs>
            {/* Cyan Valuation Gradient */}
            <linearGradient id="valuationGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#55BDE8" stopOpacity="0.32" />
              <stop offset="60%" stopColor="#43C98B" stopOpacity="0.08" />
              <stop offset="100%" stopColor="#070A09" stopOpacity="0.0" />
            </linearGradient>

            {/* Emerald/Violet Dividend Gradient */}
            <linearGradient id="dividendGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#43C98B" stopOpacity="0.35" />
              <stop offset="60%" stopColor="#55BDE8" stopOpacity="0.08" />
              <stop offset="100%" stopColor="#070A09" stopOpacity="0.0" />
            </linearGradient>

            {/* Glowing Node Filter (inspired by IMG_7729 & IMG_7727) */}
            <filter id="nodeGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="3.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Y Axis Grid Lines */}
          {[0, 0.33, 0.66, 1].map((ratio, i) => {
            const val = minVal + (maxVal - minVal) * (1 - ratio);
            const y = padding.top + ratio * (height - padding.top - padding.bottom);
            return (
              <g key={i}>
                <line
                  x1={padding.left}
                  y1={y}
                  x2={width - padding.right}
                  y2={y}
                  stroke="rgba(255, 255, 255, 0.06)"
                  strokeDasharray="4 4"
                />
                <text
                  x={padding.left - 10}
                  y={y + 3.5}
                  textAnchor="end"
                  className="text-[10px] font-mono fill-[#A5A6A5]"
                >
                  €{Math.round(val / 1000)}k
                </text>
              </g>
            );
          })}

          {/* Smooth Area Gradient Fill */}
          <polygon
            points={areaPoints}
            fill={`url(#${metric === 'dividends' ? 'dividendGradient' : 'valuationGradient'})`}
            className="transition-opacity duration-700"
            style={{ opacity: isRendered ? 1 : 0 }}
          />

          {/* Animated Vector Stroke Line (inspired by IMG_7727) */}
          <polyline
            ref={pathRef}
            fill="none"
            stroke={metric === 'dividends' ? '#43C98B' : '#55BDE8'}
            strokeWidth="2.75"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={points}
            style={{
              transition: 'stroke 400ms ease, opacity 500ms ease',
              opacity: isRendered ? 1 : 0.2,
            }}
          />

          {/* Luminous Active Terminal Node (inspired by IMG_7727 and IMG_7729) */}
          {lastIndex >= 0 && (
            <g className="cursor-pointer">
              {/* Outer Pulsing Aura Ring */}
              <circle
                cx={lastX}
                cy={lastY}
                r="11"
                fill="none"
                stroke={metric === 'dividends' ? 'rgba(67, 201, 139, 0.35)' : 'rgba(85, 189, 232, 0.35)'}
                strokeWidth="1.5"
                className="animate-ping origin-center"
                style={{ animationDuration: '3s' }}
              />
              {/* Mid Glowing Halo */}
              <circle
                cx={lastX}
                cy={lastY}
                r="7"
                fill={metric === 'dividends' ? 'rgba(67, 201, 139, 0.4)' : 'rgba(85, 189, 232, 0.4)'}
                filter="url(#nodeGlow)"
              />
              {/* Inner Solid Core */}
              <circle
                cx={lastX}
                cy={lastY}
                r="4"
                fill="#FFFFFF"
                stroke={metric === 'dividends' ? '#43C98B' : '#55BDE8'}
                strokeWidth="2"
              />
            </g>
          )}

          {/* X Axis Date Labels */}
          {historicalData.map((d, i) => {
            if (i % Math.ceil(historicalData.length / 6) !== 0 && i !== historicalData.length - 1) return null;
            const x = getX(i);
            return (
              <text
                key={i}
                x={x}
                y={height - 10}
                textAnchor="middle"
                className="text-[9.5px] font-mono fill-[#A5A6A5]"
              >
                {d.date}
              </text>
            );
          })}

          {/* Interactive Data Nodes & Hover Lines */}
          {historicalData.map((d, i) => {
            const x = getX(i);
            const val = metric === 'dividends' ? d.dividends : d.valuation;
            const y = getY(val);
            const isHovered = hoveredPoint?.date === d.date;

            return (
              <g
                key={i}
                onMouseEnter={() => setHoveredPoint(d)}
                onMouseLeave={() => setHoveredPoint(null)}
                className="cursor-pointer group"
              >
                {/* Vertical Hover Crosshair */}
                {isHovered && (
                  <line
                    x1={x}
                    y1={padding.top}
                    x2={x}
                    y2={height - padding.bottom}
                    stroke="rgba(255, 255, 255, 0.6)"
                    strokeWidth="1.5"
                    strokeDasharray="3 3"
                  />
                )}

                {/* Node Interactive Hitbox & Visual Circle */}
                <circle
                  cx={x}
                  cy={y}
                  r={isHovered ? 6 : 3.5}
                  className="transition-all duration-200"
                  fill={isHovered ? '#FFFFFF' : (metric === 'dividends' ? '#43C98B' : '#55BDE8')}
                  stroke={isHovered ? (metric === 'dividends' ? '#43C98B' : '#55BDE8') : '#FFFFFF'}
                  strokeWidth={isHovered ? 2.5 : 1.5}
                />
              </g>
            );
          })}
        </svg>

        {/* Hover Tooltip Overlay with Frosted Glass & Cyan/Emerald Rim */}
        {hoveredPoint && (
          <div className="absolute top-2 right-2 p-3 rounded-xl bg-[#141515]/95 backdrop-blur-md text-[#F5F5F2] text-xs shadow-2xl border border-white/[0.14] font-mono space-y-1.5 animate-fadeIn z-20">
            <div className="text-[10px] text-[#A5A6A5] pb-1.5 border-b border-white/[0.08]">
              {hoveredPoint.label}
            </div>
            <div className="flex justify-between gap-5 text-xs font-semibold">
              <span className="text-[#A5A6A5]">NAV Value:</span>
              <span className="text-[#55BDE8]">{formatCurrency(hoveredPoint.valuation)}</span>
            </div>
            <div className="flex justify-between gap-5 text-xs font-semibold">
              <span className="text-[#A5A6A5]">Dividends:</span>
              <span className="text-[#43C98B]">+{formatCurrency(hoveredPoint.dividends)}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
