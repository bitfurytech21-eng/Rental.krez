import React from 'react';
import { Calendar, Clock, CheckCircle2, AlertCircle, Info } from 'lucide-react';

interface CircularProgressRingProps {
  startDate: string | Date;
  maturityDate: string | Date;
  status?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showTextDetails?: boolean;
  strokeWidth?: number;
  className?: string;
}

export const CircularProgressRing: React.FC<CircularProgressRingProps> = ({
  startDate,
  maturityDate,
  status = 'active',
  size = 'md',
  showTextDetails = true,
  strokeWidth,
  className = ''
}) => {
  // Safe date parsing and calculations
  const start = new Date(startDate);
  const end = new Date(maturityDate);
  const now = new Date();

  const startMs = isNaN(start.getTime()) ? now.getTime() - 86400000 : start.getTime();
  const endMs = isNaN(end.getTime()) ? now.getTime() + 86400000 * 365 : end.getTime();
  const nowMs = now.getTime();

  const totalMs = Math.max(endMs - startMs, 1);
  const elapsedMs = Math.max(0, Math.min(nowMs - startMs, totalMs));

  const totalDays = Math.max(1, Math.ceil(totalMs / (1000 * 60 * 60 * 24)));
  let daysElapsed = Math.floor(elapsedMs / (1000 * 60 * 60 * 24));
  let daysRemaining = Math.max(0, totalDays - daysElapsed);

  let rawPercentage = Math.round((elapsedMs / totalMs) * 100);

  // Status overrides
  const isMatured = status === 'matured' || status === 'completed' || nowMs >= endMs;
  const isCancelled = status === 'cancelled';
  const isPending = status === 'pending';

  if (isMatured) {
    rawPercentage = 100;
    daysElapsed = totalDays;
    daysRemaining = 0;
  } else if (isPending) {
    rawPercentage = 0;
    daysElapsed = 0;
    daysRemaining = totalDays;
  }

  const percentage = Math.min(100, Math.max(0, rawPercentage));

  // Size dimensions
  const dimensionMap = {
    sm: { dimension: 48, stroke: strokeWidth || 4, fontSize: 'text-[11px]', labelSize: 'text-[9px]' },
    md: { dimension: 72, stroke: strokeWidth || 6, fontSize: 'text-sm', labelSize: 'text-[10px]' },
    lg: { dimension: 100, stroke: strokeWidth || 8, fontSize: 'text-lg', labelSize: 'text-xs' },
    xl: { dimension: 130, stroke: strokeWidth || 10, fontSize: 'text-2xl', labelSize: 'text-sm' }
  };

  const config = dimensionMap[size];
  const radius = (config.dimension - config.stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  // Formatting helpers
  const formatDate = (d: Date) => {
    if (isNaN(d.getTime())) return 'N/A';
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  // Ring color theme based on status
  const getRingColors = () => {
    if (isCancelled) return { arc: 'text-red-500', bg: 'stroke-red-100', text: 'text-red-700' };
    if (isMatured) return { arc: 'text-emerald-500', bg: 'stroke-emerald-100', text: 'text-emerald-700' };
    if (isPending) return { arc: 'text-amber-500', bg: 'stroke-amber-100', text: 'text-amber-700' };
    return { arc: 'text-[#27845D]', bg: 'stroke-[#E3E8E3]', text: 'text-[#142421]' };
  };

  const colors = getRingColors();

  return (
    <div className={`flex flex-col sm:flex-row items-center gap-3.5 ${className}`}>
      {/* SVG Ring Container */}
      <div className="relative shrink-0 flex items-center justify-center">
        <svg
          width={config.dimension}
          height={config.dimension}
          viewBox={`0 0 ${config.dimension} ${config.dimension}`}
          className="transform -rotate-90 drop-shadow-xs"
          role="progressbar"
          aria-valuenow={percentage}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Investment period ${percentage}% complete`}
        >
          {/* Background Track */}
          <circle
            cx={config.dimension / 2}
            cy={config.dimension / 2}
            r={radius}
            className={`${colors.bg} fill-none`}
            strokeWidth={config.stroke}
          />
          {/* Animated Progress Arc */}
          <circle
            cx={config.dimension / 2}
            cy={config.dimension / 2}
            r={radius}
            className={`${colors.arc} stroke-current fill-none transition-all duration-1000 ease-out`}
            strokeWidth={config.stroke}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
          />
        </svg>

        {/* Center Percentage Display */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center leading-none">
          <span className={`font-black ${config.fontSize} ${colors.text} tabular-nums`}>
            {percentage}%
          </span>
        </div>
      </div>

      {/* Detailed Text Breakdown */}
      {showTextDetails && (
        <div className="flex-1 space-y-1 text-center sm:text-left">
          <div className="flex items-center justify-center sm:justify-start gap-1.5 text-xs font-bold text-[#142421]">
            <Clock className="w-3.5 h-3.5 text-[#27845D]" />
            <span>
              {isMatured ? 'Matured & Fully Elapsed' : `Investment Period: ${percentage}% Complete`}
            </span>
          </div>

          <div className="text-[11px] text-[#52605C] font-semibold">
            <span className="text-[#142421] font-bold">{daysElapsed}</span> of{' '}
            <span className="text-[#142421] font-bold">{totalDays}</span> days elapsed
            <span className="mx-1.5 text-[#BCC5BD]">•</span>
            <span className="text-[#27845D] font-extrabold">{daysRemaining} days remaining</span>
          </div>

          <div className="flex items-center justify-center sm:justify-start gap-3 text-[10px] text-[#69736F] pt-0.5 font-medium">
            <span>Started: {formatDate(start)}</span>
            <span>Matures: {formatDate(end)}</span>
          </div>
        </div>
      )}
    </div>
  );
};
