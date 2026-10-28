import React, { useState } from 'react';
import { formatCurrency, formatPercent } from '../../lib/utils';
import { PieChart, Shield } from 'lucide-react';

interface AssetCategory {
  id: string;
  category: string;
  value: number;
  tokens: number;
  color: string;
  bgLight: string;
}

const DEFAULT_CATEGORIES: AssetCategory[] = [
  { id: 'cat-1', category: 'Luxury Residential', value: 14500, tokens: 290, color: '#087F5B', bgLight: 'bg-emerald-500' },
  { id: 'cat-2', category: 'Urban Coliving', value: 8200, tokens: 164, color: '#2563EB', bgLight: 'bg-blue-500' },
  { id: 'cat-3', category: 'Prime Commercial', value: 5750, tokens: 115, color: '#D97706', bgLight: 'bg-amber-500' },
];

export const AssetAllocationChart: React.FC<{
  totalValue?: number;
  categories?: AssetCategory[];
  className?: string;
}> = ({
  categories = DEFAULT_CATEGORIES,
  totalValue = 28450,
  className = '',
}) => {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const grandTotal = totalValue || categories.reduce((sum, c) => sum + c.value, 0);

  // SVG Donut slice math
  const size = 180;
  const radius = 65;
  const strokeWidth = 24;
  const center = size / 2;
  const circumference = 2 * Math.PI * radius;

  let cumulativeAngle = 0;

  return (
    <div className={`bg-white dark:bg-[#0D1522] border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
        <span className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400">
          <PieChart className="w-4 h-4" />
        </span>
        <div>
          <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100">
            Property Sector Asset Allocation
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Portfolio diversification breakdown across real estate asset classes
          </p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-6 py-2">
        {/* Donut SVG Chart */}
        <div className="relative shrink-0">
          <svg width={size} height={size} className="transform -rotate-90 overflow-visible">
            {categories.map((cat) => {
              const percentage = cat.value / grandTotal;
              const strokeDasharray = `${percentage * circumference} ${circumference}`;
              const strokeDashoffset = -cumulativeAngle * circumference;
              cumulativeAngle += percentage;

              const isHovered = hoveredId === cat.id;

              return (
                <circle
                  key={cat.id}
                  cx={center}
                  cy={center}
                  r={radius}
                  fill="transparent"
                  stroke={cat.color}
                  strokeWidth={isHovered ? strokeWidth + 6 : strokeWidth}
                  strokeDasharray={strokeDasharray}
                  strokeDashoffset={strokeDashoffset}
                  onMouseEnter={() => setHoveredId(cat.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  className="transition-all duration-200 cursor-pointer"
                />
              );
            })}
          </svg>

          {/* Donut Center Display */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Total Assets
            </span>
            <span className="text-sm font-bold font-mono text-slate-900 dark:text-slate-100">
              {formatCurrency(grandTotal)}
            </span>
          </div>
        </div>

        {/* Categories Legend List */}
        <div className="flex-1 space-y-2.5 w-full">
          {categories.map((cat) => {
            const percentage = ((cat.value / grandTotal) * 100).toFixed(1);
            const isHovered = hoveredId === cat.id;

            return (
              <div
                key={cat.id}
                onMouseEnter={() => setHoveredId(cat.id)}
                onMouseLeave={() => setHoveredId(null)}
                className={`p-2.5 rounded-xl border transition-all ${
                  isHovered
                    ? 'border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 shadow-2xs'
                    : 'border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-900/30'
                }`}
              >
                <div className="flex items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: cat.color }}
                    />
                    <span className="font-bold text-slate-900 dark:text-slate-100 truncate">
                      {cat.category}
                    </span>
                  </div>

                  <div className="text-right shrink-0 font-mono">
                    <span className="font-bold text-slate-900 dark:text-slate-100">
                      {formatCurrency(cat.value)}
                    </span>
                    <span className="text-[10.5px] text-slate-500 dark:text-slate-400 ml-2 font-semibold">
                      ({percentage}%)
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
