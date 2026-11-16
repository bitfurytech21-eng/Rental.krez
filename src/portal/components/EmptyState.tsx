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
    <div className="rounded-[14px] border border-dashed border-[#1D3860] bg-[#102442]/60 px-6 py-10 text-center flex flex-col items-center justify-center gap-3">
      {icon && (
        <div className="w-11 h-11 rounded-xl bg-[#0B1B30] border border-[#1D3860] text-[#C5A880] flex items-center justify-center">
          {icon}
        </div>
      )}
      <h3 className="text-base font-semibold text-white">{title}</h3>
      <p className="text-sm text-[#8EA7C7] max-w-sm leading-relaxed">{description}</p>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="portal-btn-primary mt-2"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
};
