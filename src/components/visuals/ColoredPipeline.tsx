import React, { useState } from 'react';
import {
  UserCheck,
  ShieldCheck,
  Wallet,
  Building2,
  TrendingUp,
  Check,
  HelpCircle,
} from 'lucide-react';

export type PipelineStageStatus = 'completed' | 'active' | 'pending' | 'upcoming' | 'failed';

export interface PipelineStage {
  id: string;
  title: string;
  description: string;
  status: PipelineStageStatus;
  timestamp?: string;
  metrics?: { label: string; value: string };
  detailNote?: string;
  icon?: React.ComponentType<{ className?: string }>;
}

export interface ColoredPipelineProps {
  title?: string;
  subtitle?: string;
  stages: PipelineStage[];
  activeStageId?: string;
  onStageClick?: (stage: PipelineStage) => void;
  orientation?: 'horizontal' | 'vertical' | 'auto';
  className?: string;
  showDetails?: boolean;
}

const DEFAULT_ICONS = [
  UserCheck,    // 1. Account
  ShieldCheck,  // 2. Verification
  Wallet,       // 3. Funding
  Building2,    // 4. Investment
  TrendingUp,   // 5. Returns
];

const SHORT_LABELS = [
  'Account',
  'Verification',
  'Funding',
  'Investment',
  'Returns',
];

export const ColoredPipeline: React.FC<ColoredPipelineProps> = ({
  stages,
  activeStageId,
  onStageClick,
  className = '',
}) => {
  const [hoveredStageId, setHoveredStageId] = useState<string | null>(null);
  const [activeTooltipId, setActiveTooltipId] = useState<string | null>(null);

  const getStatusConfig = (status: PipelineStageStatus) => {
    switch (status) {
      case 'completed':
        return {
          nodeBg: 'bg-[#43C98B]/15 border-[#43C98B] text-[#43C98B]',
          glow: 'border-[#43C98B]/40',
          line: 'bg-[#43C98B]',
          badgeBg: 'bg-[#43C98B] text-black',
          badgeText: 'Completed',
          iconColor: 'text-[#43C98B]',
          labelColor: 'text-[#F5F5F2]',
        };
      case 'active':
        return {
          nodeBg: 'bg-[#55BDE8]/20 border-[#55BDE8] text-[#55BDE8]',
          glow: 'border-[#55BDE8]',
          line: 'bg-[#55BDE8]',
          badgeBg: 'bg-[#55BDE8] text-black',
          badgeText: 'In Progress',
          iconColor: 'text-[#55BDE8]',
          labelColor: 'text-[#55BDE8]',
        };
      case 'pending':
        return {
          nodeBg: 'bg-[#E7B96D]/15 border-[#E7B96D] text-[#E7B96D]',
          glow: 'border-[#E7B96D]/40',
          line: 'bg-[#E7B96D]',
          badgeBg: 'bg-[#E7B96D] text-black',
          badgeText: 'Pending',
          iconColor: 'text-[#E7B96D]',
          labelColor: 'text-[#E7B96D]',
        };
      case 'failed':
        return {
          nodeBg: 'bg-[#E47E80]/15 border-[#E47E80] text-[#E47E80]',
          glow: 'border-[#E47E80]/40',
          line: 'bg-[#E47E80]',
          badgeBg: 'bg-[#E47E80] text-white',
          badgeText: 'Attention',
          iconColor: 'text-[#E47E80]',
          labelColor: 'text-[#E47E80]',
        };
      case 'upcoming':
      default:
        return {
          nodeBg: 'bg-[#1D1E1E] border-[#292B2B] text-[#777979]',
          glow: 'border-[#292B2B]',
          line: 'bg-[#292B2B]',
          badgeBg: 'bg-[#292B2B] text-[#777979]',
          badgeText: 'Upcoming',
          iconColor: 'text-[#777979]',
          labelColor: 'text-[#777979]',
        };
    }
  };

  const completedIndices = stages
    .map((s, idx) => (s.status === 'completed' || s.status === 'active' ? idx : -1))
    .filter((idx) => idx !== -1);

  const maxActiveIdx = completedIndices.length > 0 ? Math.max(...completedIndices) : 0;
  const progressLinePercent = stages.length > 1
    ? Math.min(100, Math.max(0, (maxActiveIdx / (stages.length - 1)) * 100))
    : 0;

  return (
    <div
      aria-label="Investor Account Progress Tracker"
      className={`relative rounded-[20px] border border-[#292B2B] bg-[#141515] p-4 sm:p-5 shadow-xl ${className}`}
    >
      <div className="overflow-x-auto no-scrollbar py-2 px-1">
        <div className="min-w-[320px] sm:min-w-0 relative flex items-center justify-between">
          {/* Thin Horizontal Connecting Line */}
          <div className="absolute top-[20px] sm:top-[24px] left-6 right-6 h-[2px] bg-[#292B2B] z-0 rounded-full">
            <div
              className="h-full bg-gradient-to-r from-[#43C98B] via-[#55BDE8] to-[#E7B96D] transition-all duration-500 ease-out rounded-full"
              style={{ width: `${progressLinePercent}%` }}
            />
          </div>

          {/* 5 Compact Symbolic Nodes */}
          {stages.map((stage, idx) => {
            const config = getStatusConfig(stage.status);
            const IconComponent = stage.icon || DEFAULT_ICONS[idx % DEFAULT_ICONS.length] || HelpCircle;
            const isHovered = hoveredStageId === stage.id;
            const isTooltipOpen = activeTooltipId === stage.id || isHovered;
            const shortLabel = SHORT_LABELS[idx % SHORT_LABELS.length];

            return (
              <div
                key={stage.id}
                onMouseEnter={() => setHoveredStageId(stage.id)}
                onMouseLeave={() => setHoveredStageId(null)}
                onClick={() => {
                  setActiveTooltipId(activeTooltipId === stage.id ? null : stage.id);
                  if (onStageClick) onStageClick(stage);
                }}
                className="relative z-10 flex flex-col items-center group cursor-pointer"
                role="button"
                tabIndex={0}
                aria-label={`${shortLabel}: ${config.badgeText}`}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    setActiveTooltipId(activeTooltipId === stage.id ? null : stage.id);
                    if (onStageClick) onStageClick(stage);
                  }
                }}
              >
                {/* Compact Circular Icon Container */}
                <div
                  className={`relative w-10 h-10 sm:w-12 sm:h-12 rounded-full border-2 flex items-center justify-center transition-all duration-200 ${
                    config.nodeBg
                  } ${config.glow}`}
                >
                  <IconComponent className={`w-4 h-4 sm:w-5 sm:h-5 stroke-[2] ${config.iconColor}`} />

                  {/* Status Indicator Badge */}
                  {stage.status === 'completed' && (
                    <span
                      aria-hidden="true"
                      className="absolute -top-1 -right-1 w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full bg-[#43C98B] text-[#090A0A] flex items-center justify-center font-bold text-[8px] shadow-sm border border-[#141515]"
                    >
                      <Check className="w-2.5 h-2.5 stroke-[3]" />
                    </span>
                  )}
                </div>

                {/* Short Clean Label */}
                <span className={`text-[11px] sm:text-[12px] font-semibold mt-2 tracking-tight ${config.labelColor}`}>
                  {shortLabel}
                </span>

                {/* Minimal Tooltip for Secondary Details */}
                {isTooltipOpen && (
                  <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 z-40 w-48 sm:w-56 p-2.5 rounded-xl bg-[#1D1E1E] text-[#F5F5F2] text-xs shadow-2xl border border-[#292B2B] animate-in fade-in zoom-in-95 duration-150 pointer-events-none">
                    <div className="flex items-center justify-between pb-1 border-b border-[#292B2B]">
                      <span className="font-bold text-[#F5F5F2] truncate">{stage.title}</span>
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${config.badgeBg}`}>
                        {config.badgeText}
                      </span>
                    </div>
                    {stage.description && (
                      <p className="text-[11px] text-[#A5A6A5] mt-1 leading-snug">
                        {stage.description}
                      </p>
                    )}
                    <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px w-0 h-0 border-x-5 border-x-transparent border-t-5 border-t-[#1D1E1E]" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
