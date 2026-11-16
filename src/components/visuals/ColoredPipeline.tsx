import React from 'react';
import {
  UserCheck,
  ShieldCheck,
  Wallet,
  Building2,
  TrendingUp,
  Check,
  AlertCircle,
  Clock,
  HelpCircle,
} from 'lucide-react';

export type PipelineStageStatus =
  | 'Not Started'
  | 'Pending'
  | 'In Review'
  | 'Action Required'
  | 'Approved'
  | 'Rejected'
  | 'Completed'
  | 'completed'
  | 'active'
  | 'pending'
  | 'upcoming'
  | 'failed';

export interface PipelineStage {
  id: string;
  stepNumber?: number;
  title: string;
  description: string;
  status: PipelineStageStatus;
  timestamp?: string | null;
  actionTab?: string;
  requirements?: string[];
  metrics?: { label: string; value: string };
  detailNote?: string;
  icon?: React.ComponentType<{ className?: string }>;
}

export interface ColoredPipelineProps {
  title?: string;
  subtitle?: string;
  stages: PipelineStage[];
  progressPercent?: number;
  completedCount?: number;
  activeStageId?: string;
  onStageClick?: (stage: PipelineStage) => void;
  className?: string;
}

const DEFAULT_ICONS = [
  UserCheck,    // 1. Account Registered
  ShieldCheck,  // 2. Identity Verification (KYC/AML)
  Wallet,       // 3. Wallet Funded
  Building2,    // 4. Asset Tokens Held
  TrendingUp,   // 5. Monthly Yields
];

const SHORT_LABELS = [
  'Account Registered',
  'KYC / AML',
  'Wallet Funded',
  'Asset Tokens',
  'Monthly Yields',
];

function isDoneStatus(status: PipelineStageStatus): boolean {
  return status === 'Completed' || status === 'Approved' || status === 'completed';
}

export const ColoredPipeline: React.FC<ColoredPipelineProps> = ({
  title = 'Investor Account & Ownership Lifecycle',
  subtitle,
  stages,
  progressPercent,
  completedCount,
  activeStageId,
  onStageClick,
  className = '',
}) => {
  const getStatusConfig = (status: PipelineStageStatus) => {
    switch (status) {
      case 'Completed':
      case 'Approved':
      case 'completed':
        return {
          nodeBg: 'bg-[#43C98B]/15 border-[#43C98B] text-[#43C98B]',
          badgeBg: 'bg-[#43C98B]/15 text-[#6FD8B0] border border-[#43C98B]/40',
          badgeText: status === 'Approved' ? 'Approved' : 'Completed',
          iconColor: 'text-[#6FD8B0]',
          labelColor: 'text-[var(--dash-text)]',
        };
      case 'In Review':
      case 'active':
        return {
          nodeBg: 'bg-[#55BDE8]/20 border-[#55BDE8] text-[#55BDE8]',
          badgeBg: 'bg-[#55BDE8]/15 text-[#55BDE8] border border-[#55BDE8]/40',
          badgeText: 'In Review',
          iconColor: 'text-[#55BDE8]',
          labelColor: 'text-[#55BDE8]',
        };
      case 'Pending':
      case 'pending':
        return {
          nodeBg: 'bg-[#D8B77C]/15 border-[#D8B77C] text-[#D8B77C]',
          badgeBg: 'bg-[#D8B77C]/15 text-[#D8B77C] border border-[#D8B77C]/40',
          badgeText: 'Pending',
          iconColor: 'text-[#D8B77C]',
          labelColor: 'text-[#D8B77C]',
        };
      case 'Action Required':
      case 'Rejected':
      case 'failed':
        return {
          nodeBg: 'bg-rose-500/15 border-rose-400 text-rose-300',
          badgeBg: 'bg-rose-500/15 text-rose-300 border border-rose-400/40',
          badgeText: status === 'Rejected' ? 'Rejected' : 'Action Required',
          iconColor: 'text-rose-300',
          labelColor: 'text-rose-300',
        };
      case 'Not Started':
      case 'upcoming':
      default:
        return {
          nodeBg: 'bg-[var(--dash-inner)] border-[var(--dash-card-border)] text-[var(--dash-text-muted)]',
          badgeBg: 'bg-[var(--dash-inner)] text-[var(--dash-text-muted)] border border-[var(--dash-card-border)]',
          badgeText: 'Not Started',
          iconColor: 'text-[var(--dash-text-muted)]',
          labelColor: 'text-[var(--dash-text-muted)]',
        };
    }
  };

  const doneTotal =
    typeof completedCount === 'number'
      ? completedCount
      : stages.filter((s) => isDoneStatus(s.status)).length;
  const computedPercent =
    typeof progressPercent === 'number'
      ? progressPercent
      : stages.length > 0
      ? Math.round((doneTotal / stages.length) * 100)
      : 0;

  return (
    <div
      aria-label="Investor Account & Ownership Lifecycle"
      className={`portal-card rounded-[20px] p-4 sm:p-5 space-y-4 ${className}`}
    >
      {/* Header Row with Real Completion Percentage */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[var(--dash-card-border)]">
        <div>
          <h3 className="text-sm sm:text-base font-bold text-[var(--dash-text)] tracking-tight">{title}</h3>
          <p className="text-xs text-[var(--dash-text-muted)] mt-0.5">
            {subtitle || 'Click any stage to inspect verification requirements, funding status, and records'}
          </p>
        </div>
        <div className="flex items-center gap-2.5 shrink-0">
          <span className="text-xs font-mono text-[var(--dash-text-muted)]">
            {doneTotal}/{stages.length} verified
          </span>
          <span className="portal-pill ok tabular-nums font-mono">{computedPercent}% Complete</span>
        </div>
      </div>

      {/* Horizontal 5-Stage Interactive Progress Track */}
      <div className="overflow-x-auto no-scrollbar pt-1 pb-1">
        <div className="min-w-[540px] relative grid grid-cols-5 gap-2">
          {/* Connecting Progress Rail */}
          <div className="absolute top-[22px] left-[10%] right-[10%] h-[2px] bg-[var(--dash-card-border)] z-0 rounded-full">
            <div
              className="h-full bg-gradient-to-r from-[#6FD8B0] to-[#D8B77C] transition-all duration-500 ease-out rounded-full"
              style={{ width: `${Math.min(100, Math.max(0, computedPercent))}%` }}
            />
          </div>

          {stages.map((stage, idx) => {
            const config = getStatusConfig(stage.status);
            const IconComponent = stage.icon || DEFAULT_ICONS[idx % DEFAULT_ICONS.length] || HelpCircle;
            const isSelected = activeStageId === stage.id;
            const isDone = isDoneStatus(stage.status);
            const isAttn = stage.status === 'Action Required' || stage.status === 'Rejected' || stage.status === 'failed';
            const isPending = stage.status === 'Pending' || stage.status === 'In Review' || stage.status === 'pending' || stage.status === 'active';
            const displayLabel = stage.title || SHORT_LABELS[idx % SHORT_LABELS.length];

            return (
              <button
                key={stage.id}
                type="button"
                onClick={() => onStageClick?.(stage)}
                className={`relative z-10 flex flex-col items-center text-center p-2 rounded-xl transition-all cursor-pointer group ${
                  isSelected ? 'bg-[var(--dash-hover)] ring-1 ring-[var(--dash-accent-border)]' : 'hover:bg-[var(--dash-hover)]/60'
                }`}
                aria-label={`${displayLabel}: ${config.badgeText}`}
              >
                <div
                  className={`relative w-11 h-11 rounded-full border-2 flex items-center justify-center transition-transform duration-150 group-hover:scale-105 ${config.nodeBg}`}
                >
                  <IconComponent className={`w-4.5 h-4.5 stroke-[2] ${config.iconColor}`} />
                  {isDone && (
                    <span
                      aria-hidden="true"
                      className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#43C98B] text-[#07231A] flex items-center justify-center border border-[#0B0F10]"
                    >
                      <Check className="w-2.5 h-2.5 stroke-[3]" />
                    </span>
                  )}
                  {isAttn && (
                    <span
                      aria-hidden="true"
                      className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white flex items-center justify-center border border-[#0B0F10]"
                    >
                      <AlertCircle className="w-2.5 h-2.5 stroke-[2.5]" />
                    </span>
                  )}
                  {isPending && (
                    <span
                      aria-hidden="true"
                      className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#D8B77C] text-[#07231A] flex items-center justify-center border border-[#0B0F10]"
                    >
                      <Clock className="w-2.5 h-2.5 stroke-[2.5]" />
                    </span>
                  )}
                </div>

                <span className={`text-[11px] font-semibold mt-2 leading-tight ${config.labelColor}`}>
                  {idx + 1}. {SHORT_LABELS[idx] || displayLabel}
                </span>

                <span className={`mt-1.5 inline-block text-[9.5px] font-semibold px-2 py-0.5 rounded-full ${config.badgeBg}`}>
                  {config.badgeText}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
