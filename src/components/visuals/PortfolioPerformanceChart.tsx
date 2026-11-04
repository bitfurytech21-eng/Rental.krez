import React, { useState, useMemo } from 'react';
import { formatCurrency, formatPercent } from '../../lib/utils';
import { TrendingUp, DollarSign, Calendar, Layers } from 'lucide-react';

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
  className?: string;
}

export const PortfolioPerformanceChart: React.FC<PortfolioPerformanceChartProps> = ({
  initialValuation = 20000,
  currentValuation = 28450,
  totalDividends = 2480,
  className = '',
}) => {
  const [timeRange, setTimeRange] = useState<TimeRange>('6M');
  const [metric, setMetric] = useState<MetricType>('valuation');
  const [hoveredPoint, setHoveredPoint] = useState<DataPoint | null>(null);

  // Generate historical data based on timeRange
  const historicalData = useMemo<DataPoint[]>(() => {
    const pointsCount = timeRange === '1M' ? 12 : timeRange === '3M' ? 14 : timeRange === '6M' ? 18 : 24;
    const data: DataPoint[] = [];

    const now = new Date();
    const startVal = initialValuation;
    const endVal = currentValuation;
    const totalDiv = totalDividends;

    for (let i = 0; i < pointsCount; i++) {
      const progress = i / (pointsCount - 1);
      // Realistic growth curve with slight natural variance
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
  }, [timeRange, initialValuation, currentValuation, totalDividends]);

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

  // Calculate return %
  const totalReturnPercent = ((currentValuation + totalDividends - initialValuation) / initialValuation) * 100;

  return (
    <div className={`bg-white dark:bg-[#0D1522] border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm space-y-4 ${className}`}>
      {/* Chart Top Control Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/80 text-emerald-600 dark:text-emerald-400">
              <TrendingUp className="w-4 h-4" />
            </span>
            <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100">
              Portfolio Growth & Distribution Curve
            </h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Realized property asset NAV progression and cumulative monthly dividends
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Metric Selector */}
          <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800/90 rounded-lg text-xs font-semibold">
            <button
              onClick={() => setMetric('valuation')}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                metric === 'valuation'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              NAV Value
            </button>
            <button
              onClick={() => setMetric('dividends')}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                metric === 'dividends'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              Dividends
            </button>
          </div>

          {/* Time Range Selector */}
          <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800/90 rounded-lg text-xs font-semibold">
            {(['1M', '3M', '6M', '1Y', 'ALL'] as TimeRange[]).map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-2 py-1 rounded-md transition-colors ${
                  timeRange === range
                    ? 'bg-emerald-600 text-white font-bold shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
              >
                {range}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800">
        <div>
          <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
            Current Holdings Value
          </span>
          <span className="text-sm sm:text-base font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100">
            {formatCurrency(currentValuation)}
          </span>
        </div>
        <div>
          <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
            Cumulative Dividends
          </span>
          <span className="text-sm sm:text-base font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
            +{formatCurrency(totalDividends)}
          </span>
        </div>
        <div>
          <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
            Total Capital Growth
          </span>
          <span className="text-sm sm:text-base font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
            +{formatCurrency(currentValuation - initialValuation)}
          </span>
        </div>
        <div>
          <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
            Overall Net ROI
          </span>
          <span className="text-sm sm:text-base font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
            +{formatPercent(totalReturnPercent)}
          </span>
        </div>
      </div>

      {/* SVG Interactive Vector Chart */}
      <div className="relative w-full overflow-hidden">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto overflow-visible select-none"
        >
          <defs>
            {/* Emerald Valuation Gradient */}
            <linearGradient id="valuationGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#087F5B" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#087F5B" stopOpacity="0.0" />
            </linearGradient>

            {/* Blue Dividend Gradient */}
            <linearGradient id="dividendGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2563EB" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#2563EB" stopOpacity="0.0" />
            </linearGradient>
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
                  stroke="currentColor"
                  strokeOpacity="0.1"
                  strokeDasharray="4 4"
                  className="text-slate-400 dark:text-slate-600"
                />
                <text
                  x={padding.left - 8}
                  y={y + 4}
                  textAnchor="end"
                  className="text-[10px] font-mono fill-slate-400 dark:fill-slate-500"
                >
                  €{Math.round(val / 1000)}k
                </text>
              </g>
            );
          })}

          {/* Area Fill */}
          <polygon
            points={areaPoints}
            fill={`url(#${metric === 'dividends' ? 'dividendGradient' : 'valuationGradient'})`}
          />

          {/* Vector Line */}
          <polyline
            fill="none"
            stroke={metric === 'dividends' ? '#2563EB' : '#087F5B'}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={points}
          />

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
                className="text-[9.5px] font-mono fill-slate-400 dark:fill-slate-500"
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
                    stroke="#087F5B"
                    strokeWidth="1.5"
                    strokeDasharray="3 3"
                  />
                )}

                {/* Node Circle */}
                <circle
                  cx={x}
                  cy={y}
                  r={isHovered ? 6 : 3.5}
                  className={`transition-all duration-150 ${
                    metric === 'dividends'
                      ? 'fill-blue-600 stroke-white dark:stroke-slate-900'
                      : 'fill-emerald-600 stroke-white dark:stroke-slate-900'
                  }`}
                  strokeWidth={isHovered ? 2.5 : 1.5}
                />
              </g>
            );
          })}
        </svg>

        {/* Hover Tooltip Overlay */}
        {hoveredPoint && (
          <div className="absolute top-2 right-2 p-2.5 rounded-xl bg-slate-900/95 text-white text-xs shadow-xl border border-slate-700 font-mono space-y-1 animate-fadeIn">
            <div className="text-[10px] text-slate-400 pb-1 border-b border-slate-800">
              {hoveredPoint.label}
            </div>
            <div className="flex justify-between gap-4 text-xs font-bold">
              <span className="text-slate-300">NAV Value:</span>
              <span className="text-emerald-400">{formatCurrency(hoveredPoint.valuation)}</span>
            </div>
            <div className="flex justify-between gap-4 text-xs font-bold">
              <span className="text-slate-300">Dividends Paid:</span>
              <span className="text-blue-400">+{formatCurrency(hoveredPoint.dividends)}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
