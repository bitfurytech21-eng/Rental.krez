import React from 'react';
import { CheckCircle2, Circle, Clock, XCircle } from 'lucide-react';

export type NormalizedStatus = 'completed' | 'pending' | 'failed' | 'not_started';

interface StatusBadgeProps {
  status?: string | null;
  label?: string;
}

export function normalizeStatus(status?: string | null): NormalizedStatus {
  const key = String(status || 'pending').trim().toLowerCase();
  if (
    key === 'completed' ||
    key === 'approved' ||
    key === 'verified' ||
    key === 'settled' ||
    key === 'paid' ||
    key === 'funded'
  ) {
    return 'completed';
  }
  if (
    key === 'failed' ||
    key === 'rejected' ||
    key === 'cancelled' ||
    key === 'canceled' ||
    key === 'declined' ||
    key === 'error'
  ) {
    return 'failed';
  }
  if (key === 'not_started' || key === 'not started' || key === 'unstarted') {
    return 'not_started';
  }
  return 'pending';
}

const STATUS_STYLE: Record<
  NormalizedStatus,
  {
    defaultLabel: string;
    classes: string;
    Icon: React.FC<{ className?: string }>;
  }
> = {
  completed: {
    defaultLabel: 'Completed',
    classes: 'bg-[#6FD8B0]/12 border-[#6FD8B0]/35 text-[#6FD8B0]',
    Icon: CheckCircle2,
  },
  pending: {
    defaultLabel: 'Pending',
    classes: 'bg-[#FCD34D]/12 border-[#FCD34D]/35 text-[#FCD34D]',
    Icon: Clock,
  },
  failed: {
    defaultLabel: 'Failed',
    classes: 'bg-[#FB7185]/12 border-[#FB7185]/35 text-[#FB7185]',
    Icon: XCircle,
  },
  not_started: {
    defaultLabel: 'Not started',
    classes: 'bg-[#172228] border-[#1F2C33] text-[#8FA1A8]',
    Icon: Circle,
  },
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, label }) => {
  const normalized = normalizeStatus(status);
  const config = STATUS_STYLE[normalized];
  const { Icon } = config;
  const displayLabel = label || config.defaultLabel;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-semibold whitespace-nowrap ${config.classes}`}
    >
      <Icon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
      <span>{displayLabel}</span>
    </span>
  );
};
