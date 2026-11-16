import React from 'react';

interface EmptyStateProps {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  actionLabel,
  onAction,
  icon,
}) => {
  return (
    <div className="rounded-[18px] border border-dashed border-[#1F2C33] bg-[#121A1F] p-4 sm:py-8 text-center flex flex-col items-center justify-center gap-3">
      {icon && (
        <div className="w-11 h-11 rounded-[14px] bg-[#0B0F10] border border-[#1F2C33] text-[#6FD8B0] flex items-center justify-center">
          {icon}
        </div>
      )}
      <h3 className="text-base font-semibold text-[#F2F5F4]">{title}</h3>
      <p className="text-sm text-[#8FA1A8] max-w-sm leading-relaxed">{description}</p>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="portal-btn-primary mt-1"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
};
