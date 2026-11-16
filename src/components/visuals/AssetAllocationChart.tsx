import React, { useState } from 'react';
import { PieChart } from 'lucide-react';
import { AnimatedNumericValue } from '../dashboard/AnimatedNumericValue';

export interface AssetCategory {
  id: string;
  category: string;
  value: number;
  tokens: number;
  color: string;
  bgLight?: string;
}

export const AssetAllocationChart: React.FC<{
  totalValue?: number;
  categories?: AssetCategory[];
  className?: string;
}> = ({
  categories = [],
  totalValue = 0,
  className = '',
}) => {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const validCategories = categories.filter((c) => c.value > 0);
  const grandTotal = totalValue > 0 ? totalValue : validCategories.reduce((sum, c) => sum + c.value, 0);

  const size = 180;
  const radius = 65;
  const strokeWidth = 24;
  const center = size / 2;
  const circumference = 2 * Math.PI * radius;

  let cumulativeAngle = 0;

  return (
    <div className={`portal-card rounded-2xl p-4 sm:p-5 space-y-4 text-[var(--dash-text)] ${className}`}>
      {/* Header */}
      <div className="flex items-center gap-2 pb-3 border-b border-[var(--dash-card-border)]">
        <span className="p-1.5 rounded-lg bg-[var(--dash-inner)] border border-[var(--dash-card-border)] text-[var(--dash-accent)]">
          <PieChart className="w-4 h-4" />
        </span>
        <div>
          <h3 className="text-sm sm:text-base font-bold text-[var(--dash-text)]">
            Property Sector Asset Allocation
          </h3>
          <p className="text-xs text-[var(--dash-text-muted)]">
            Verified holdings breakdown across real estate asset classes
          </p>
        </div>
      </div>

      {validCategories.length === 0 || grandTotal <= 0 ? (
        <div className="rounded-xl border border-dashed border-[var(--dash-card-border)] bg-[var(--dash-inner)] p-6 text-center space-y-1.5">
          <p className="text-xs font-semibold text-[var(--dash-text)]">No verified asset allocations yet</p>
          <p className="text-[11px] text-[var(--dash-text-muted)]">
            Sector breakdown will calculate automatically from confirmed SPV holdings.
          </p>
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row items-center gap-6 py-2">
          {/* Donut SVG Chart */}
          <div className="relative shrink-0">
            <svg width={size} height={size} className="transform -rotate-90 overflow-visible">
              {validCategories.map((cat) => {
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

            <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--dash-text-muted)]">
                Total Assets
              </span>
              <span className="text-sm sm:text-base font-semibold text-[var(--dash-text)]">
                <AnimatedNumericValue value={grandTotal} formatAsCurrency={true} variant="primary" />
              </span>
            </div>
          </div>

          <div className="flex-1 space-y-2.5 w-full">
            {validCategories.map((cat) => {
              const percentage = ((cat.value / grandTotal) * 100).toFixed(1);
              const isHovered = hoveredId === cat.id;

              return (
                <div
                  key={cat.id}
                  onMouseEnter={() => setHoveredId(cat.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  className={`p-2.5 rounded-xl border transition-all duration-200 cursor-pointer ${
                    isHovered
                      ? 'border-[var(--dash-accent)] bg-[var(--dash-hover)]'
                      : 'border-[var(--dash-card-border)] bg-[var(--dash-inner)]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: cat.color }}
                      />
                      <span className="font-semibold text-[var(--dash-text)] truncate">
                        {cat.category}
                      </span>
                    </div>

                    <div className="text-right shrink-0">
                      <AnimatedNumericValue value={cat.value} formatAsCurrency={true} variant="primary" className="text-xs sm:text-[13px]" />
                      <span className="text-[10.5px] text-[var(--dash-text-muted)] ml-2 font-medium">
                        ({percentage}%)
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
