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
          bg: 'bg-emerald-500',
          bgLight: 'bg-emerald-50 dark:bg-emerald-950/40',
          border: 'border-emerald-500',
          borderLight: 'border-emerald-200 dark:border-emerald-800',
          text: 'text-emerald-700 dark:text-emerald-300',
          pillBg: 'bg-emerald-100 dark:bg-emerald-900/50',
          track: 'bg-emerald-500',
          badge: 'Completed',
        };
      case 'active':
        return {
          bg: 'bg-blue-600',
          bgLight: 'bg-blue-50 dark:bg-blue-950/40',
          border: 'border-blue-600',
          borderLight: 'border-blue-300 dark:border-blue-800',
          text: 'text-blue-700 dark:text-blue-300',
          pillBg: 'bg-blue-100 dark:bg-blue-900/50',
          track: 'bg-blue-500',
          badge: 'In Progress',
        };
      case 'pending':
        return {
          bg: 'bg-amber-500',
          bgLight: 'bg-amber-50 dark:bg-amber-950/40',
          border: 'border-amber-500',
          borderLight: 'border-amber-200 dark:border-amber-800',
          text: 'text-amber-700 dark:text-amber-300',
          pillBg: 'bg-amber-100 dark:bg-amber-900/50',
          track: 'bg-amber-400',
          badge: 'Pending Review',
        };
      case 'failed':
        return {
          bg: 'bg-rose-600',
          bgLight: 'bg-rose-50 dark:bg-rose-950/40',
          border: 'border-rose-600',
          borderLight: 'border-rose-200 dark:border-rose-800',
          text: 'text-rose-700 dark:text-rose-300',
          pillBg: 'bg-rose-100 dark:bg-rose-900/50',
          track: 'bg-rose-500',
          badge: 'Attention Needed',
        };
      case 'upcoming':
      default:
        return {
          bg: 'bg-slate-300 dark:bg-slate-600',
          bgLight: 'bg-slate-50 dark:bg-slate-900/40',
          border: 'border-slate-300 dark:border-slate-700',
          borderLight: 'border-slate-200 dark:border-slate-800',
          text: 'text-slate-600 dark:text-slate-400',
          pillBg: 'bg-slate-100 dark:bg-slate-800',
          track: 'bg-slate-200 dark:bg-slate-700',
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
      className={`rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D1522] p-4 sm:p-5 shadow-sm transition-all ${className}`}
    >
      {/* Header */}
      {(title || subtitle) && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-3 border-b border-slate-100 dark:border-slate-800/80">
          <div>
            {title && (
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#087F5B] dark:text-[#BEE179]" />
                <h4 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100">
                  {title}
                </h4>
              </div>
            )}
            {subtitle && (
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{subtitle}</p>
            )}
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span className="text-[11px] font-mono font-semibold text-slate-500 dark:text-slate-400">
              Progress: {progressPercent}%
            </span>
            <div className="w-20 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden border border-slate-200 dark:border-slate-700">
              <div
                className="h-full bg-emerald-500 transition-all duration-500"
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
          <div className="absolute top-1/2 left-6 right-6 -translate-y-1/2 h-1 bg-slate-100 dark:bg-slate-800 z-0 rounded-full">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 via-blue-500 to-amber-500 transition-all duration-700 rounded-full"
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
                  className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs shadow-sm transition-all duration-300 ${
                    styles.bg
                  } ${isActive ? 'ring-4 ring-blue-100 dark:ring-blue-900/60 scale-110' : ''} ${
                    isHovered ? 'scale-115 shadow-md' : ''
                  }`}
                >
                  {renderIcon(stage.status)}
                </div>

                {/* Stage Step Number & Title */}
                <div className="mt-2 text-center px-1">
                  <span className="text-[9.5px] font-bold tracking-wider uppercase text-slate-400 dark:text-slate-500 block">
                    Step 0{idx + 1}
                  </span>
                  <span
                    className={`text-xs font-bold block line-clamp-1 transition-colors ${
                      isActive
                        ? 'text-blue-600 dark:text-blue-400 font-extrabold'
                        : 'text-slate-800 dark:text-slate-200'
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
                  <div className="absolute top-full mt-2 w-56 z-30 p-3 rounded-xl bg-slate-900 text-white text-xs shadow-xl border border-slate-700 animate-fadeIn">
                    <div className="flex items-center justify-between mb-1 pb-1 border-b border-slate-800">
                      <span className="font-bold text-emerald-400">{stage.title}</span>
                      {stage.timestamp && (
                        <span className="text-[9px] font-mono text-slate-400">{stage.timestamp}</span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-300 leading-relaxed mb-2">
                      {stage.description}
                    </p>
                    {stage.metrics && (
                      <div className="flex justify-between items-center bg-slate-800/80 p-1.5 rounded-lg text-[10px] font-mono">
                        <span className="text-slate-400">{stage.metrics.label}:</span>
                        <span className="font-bold text-emerald-300">{stage.metrics.value}</span>
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
              className={`flex items-start gap-3 p-2.5 rounded-xl border ${styles.borderLight} ${styles.bgLight} transition-all ${
                onStageClick ? 'cursor-pointer active:scale-98' : ''
              }`}
            >
              {/* Vertical Connector Line + Node */}
              <div className="flex flex-col items-center shrink-0">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center ${styles.bg}`}
                >
                  {renderIcon(stage.status)}
                </div>
                {!isLast && (
                  <div className="w-0.5 h-8 bg-slate-200 dark:bg-slate-700 my-1" />
                )}
              </div>

              {/* Node Details */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h5 className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                    0{idx + 1}. {stage.title}
                  </h5>
                  <span
                    className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full shrink-0 ${styles.pillBg} ${styles.text}`}
                  >
                    {styles.badge}
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5 leading-normal">
                  {stage.description}
                </p>

                {stage.metrics && (
                  <div className="mt-1.5 flex items-center gap-2 text-[10px] font-mono text-slate-700 dark:text-slate-300">
                    <span className="text-slate-500">{stage.metrics.label}:</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">
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
