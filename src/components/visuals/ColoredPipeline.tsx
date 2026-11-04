import React, { useState } from 'react';
import { CheckCircle2, Clock, AlertCircle, Circle, ArrowRight, ShieldCheck, Info } from 'lucide-react';

export type PipelineStageStatus = 'completed' | 'active' | 'pending' | 'upcoming' | 'failed';

export interface PipelineStage {
  id: string;
  title: string;
  description: string;
  status: PipelineStageStatus;
  timestamp?: string;
  metrics?: { label: string; value: string };
  detailNote?: string;
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

export const ColoredPipeline: React.FC<ColoredPipelineProps> = ({
  title,
  subtitle,
  stages,
  activeStageId,
  onStageClick,
  orientation = 'auto',
  className = '',
  showDetails = true,
}) => {
  const [hoveredStageId, setHoveredStageId] = useState<string | null>(null);

  const getStatusColor = (status: PipelineStageStatus) => {
    switch (status) {
      case 'completed':
        return {
          bg: 'bg-[#2ECC71] text-black',
          bgLight: 'bg-[#1D1D1D]',
          border: 'border-[#2ECC71]',
          borderLight: 'border-[#2ECC71]/40',
          text: 'text-[#2ECC71]',
          pillBg: 'bg-[#2ECC71]/15',
          track: 'bg-[#2ECC71]',
          badge: 'Completed',
        };
      case 'active':
        return {
          bg: 'bg-[#00D2FF] text-black shadow-[0_0_12px_rgba(0,210,255,0.4)]',
          bgLight: 'bg-[#1D1D1D]',
          border: 'border-[#00D2FF]',
          borderLight: 'border-[#00D2FF]/40',
          text: 'text-[#00D2FF]',
          pillBg: 'bg-[#00D2FF]/15',
          track: 'bg-[#00D2FF]',
          badge: 'In Progress',
        };
      case 'pending':
        return {
          bg: 'bg-[#FF9F43] text-black',
          bgLight: 'bg-[#1D1D1D]',
          border: 'border-[#FF9F43]',
          borderLight: 'border-[#FF9F43]/40',
          text: 'text-[#FF9F43]',
          pillBg: 'bg-[#FF9F43]/15',
          track: 'bg-[#FF9F43]',
          badge: 'Pending Review',
        };
      case 'failed':
        return {
          bg: 'bg-[#FF4D4D] text-white',
          bgLight: 'bg-[#1D1D1D]',
          border: 'border-[#FF4D4D]',
          borderLight: 'border-[#FF4D4D]/40',
          text: 'text-[#FF4D4D]',
          pillBg: 'bg-[#FF4D4D]/15',
          track: 'bg-[#FF4D4D]',
          badge: 'Attention Needed',
        };
      case 'upcoming':
      default:
        return {
          bg: 'bg-[#1D1D1D] text-[#999999] border border-[#303030]',
          bgLight: 'bg-[#151515]',
          border: 'border-[#303030]',
          borderLight: 'border-[#303030]',
          text: 'text-[#999999]',
          pillBg: 'bg-[#1D1D1D]',
          track: 'bg-[#303030]',
          badge: 'Upcoming',
        };
    }
  };

  const renderIcon = (status: PipelineStageStatus) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="w-4 h-4 text-white" />;
      case 'active':
        return <Clock className="w-4 h-4 text-white animate-spin-slow" />;
      case 'pending':
        return <Info className="w-4 h-4 text-white" />;
      case 'failed':
        return <AlertCircle className="w-4 h-4 text-white" />;
      case 'upcoming':
      default:
        return <Circle className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />;
    }
  };

  const completedCount = stages.filter((s) => s.status === 'completed').length;
  const progressPercent = Math.round((completedCount / stages.length) * 100);

  return (
    <div
      className={`rounded-2xl border border-[#303030] bg-[#151515] p-4 sm:p-5 shadow-xl transition-all ${className}`}
    >
      {/* Header */}
      {(title || subtitle) && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-3 border-b border-[#303030]">
          <div>
            {title && (
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#00D2FF]" />
                <h4 className="text-sm sm:text-base font-bold text-white tracking-tight">
                  {title}
                </h4>
              </div>
            )}
            {subtitle && (
              <p className="text-xs text-[#999999] mt-0.5">{subtitle}</p>
            )}
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span className="text-[11px] font-mono font-semibold text-[#D0D0D0]">
              Progress: {progressPercent}%
            </span>
            <div className="w-20 h-2 bg-[#1D1D1D] rounded-full overflow-hidden border border-[#303030]">
              <div
                className="h-full bg-gradient-to-r from-[#2ECC71] to-[#00D2FF] transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Desktop Horizontal View */}
      <div className="hidden md:block">
        <div className="relative flex items-center justify-between my-2">
          {/* Main Pipeline Track Line */}
          <div className="absolute top-1/2 left-6 right-6 -translate-y-1/2 h-1 bg-[#1D1D1D] z-0 rounded-full border border-[#303030]/50">
            <div
              className="h-full bg-gradient-to-r from-[#2ECC71] via-[#00D2FF] to-[#FF9F43] transition-all duration-700 rounded-full"
              style={{
                width: `${Math.max(0, ((completedCount - 0.5) / (stages.length - 1)) * 100)}%`,
              }}
            />
          </div>

          {/* Stage Nodes */}
          {stages.map((stage, idx) => {
            const styles = getStatusColor(stage.status);
            const isHovered = hoveredStageId === stage.id;
            const isActive = activeStageId === stage.id || stage.status === 'active';

            return (
              <div
                key={stage.id}
                onMouseEnter={() => setHoveredStageId(stage.id)}
                onMouseLeave={() => setHoveredStageId(null)}
                onClick={() => onStageClick && onStageClick(stage)}
                className={`relative z-10 flex flex-col items-center group ${
                  onStageClick ? 'cursor-pointer' : ''
                }`}
                style={{ width: `${100 / stages.length}%` }}
              >
                {/* Stage Node Circle */}
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs shadow-md transition-all duration-300 ${
                    styles.bg
                  } ${isActive ? 'ring-4 ring-[#00D2FF]/40 scale-110' : ''} ${
                    isHovered ? 'scale-115 shadow-xl' : ''
                  }`}
                >
                  {renderIcon(stage.status)}
                </div>

                {/* Stage Step Number & Title */}
                <div className="mt-2 text-center px-1">
                  <span className="text-[9.5px] font-bold tracking-wider uppercase text-[#999999] block">
                    Step 0{idx + 1}
                  </span>
                  <span
                    className={`text-xs font-bold block line-clamp-1 transition-colors ${
                      isActive
                        ? 'text-white font-extrabold'
                        : 'text-[#D0D0D0]'
                    }`}
                  >
                    {stage.title}
                  </span>
                  <span className={`inline-block mt-0.5 text-[9.5px] font-semibold px-1.5 py-0.2 rounded-full ${styles.pillBg} ${styles.text}`}>
                    {styles.badge}
                  </span>
                </div>

                {/* Hover Tooltip Card */}
                {isHovered && showDetails && (
                  <div className="absolute top-full mt-2 w-56 z-30 p-3 rounded-xl bg-[#1D1D1D] text-white text-xs shadow-2xl border border-[#303030] animate-fadeIn">
                    <div className="flex items-center justify-between mb-1 pb-1 border-b border-[#303030]">
                      <span className="font-bold text-[#00D2FF]">{stage.title}</span>
                      {stage.timestamp && (
                        <span className="text-[9px] font-mono text-[#999999]">{stage.timestamp}</span>
                      )}
                    </div>
                    <p className="text-[11px] text-[#D0D0D0] leading-relaxed mb-2">
                      {stage.description}
                    </p>
                    {stage.metrics && (
                      <div className="flex justify-between items-center bg-[#151515] p-1.5 rounded-lg text-[10px] font-mono border border-[#303030]">
                        <span className="text-[#999999]">{stage.metrics.label}:</span>
                        <span className="font-bold text-white">{stage.metrics.value}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Mobile Vertical View */}
      <div className="block md:hidden space-y-3 mt-2">
        {stages.map((stage, idx) => {
          const styles = getStatusColor(stage.status);
          const isLast = idx === stages.length - 1;

          return (
            <div
              key={stage.id}
              onClick={() => onStageClick && onStageClick(stage)}
              className={`flex items-start gap-3 p-3 rounded-xl border border-[#303030] bg-[#1D1D1D] transition-all ${
                onStageClick ? 'cursor-pointer active:scale-98' : ''
              }`}
            >
              {/* Vertical Connector Line + Node */}
              <div className="flex flex-col items-center shrink-0">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs ${styles.bg}`}
                >
                  {renderIcon(stage.status)}
                </div>
                {!isLast && (
                  <div className="w-0.5 h-8 bg-[#303030] my-1" />
                )}
              </div>

              {/* Node Details */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h5 className="text-xs font-bold text-white truncate">
                    0{idx + 1}. {stage.title}
                  </h5>
                  <span
                    className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full shrink-0 ${styles.pillBg} ${styles.text}`}
                  >
                    {styles.badge}
                  </span>
                </div>
                <p className="text-[11px] text-[#D0D0D0] mt-0.5 leading-normal">
                  {stage.description}
                </p>

                {stage.metrics && (
                  <div className="mt-1.5 flex items-center gap-2 text-[10px] font-mono text-[#D0D0D0]">
                    <span className="text-[#999999]">{stage.metrics.label}:</span>
                    <span className="font-bold text-white">
                      {stage.metrics.value}
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
