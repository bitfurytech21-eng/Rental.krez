import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

export const LoadingSkeleton: React.FC<{ rows?: number }> = ({ rows = 3 }) => {
  return (
    <div className="space-y-4 animate-pulse" aria-busy="true" aria-label="Loading portal data">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {[1, 2, 3, 4].map((idx) => (
          <div key={idx} className="portal-card p-5 h-24">
            <div className="h-3 w-24 rounded bg-[#1D3860]" />
            <div className="mt-4 h-6 w-32 rounded bg-[#1D3860]" />
          </div>
        ))}
      </div>
      <div className="portal-card divide-y divide-[#1D3860]">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="p-4 flex items-center justify-between gap-4">
            <div className="space-y-2 flex-1">
              <div className="h-4 w-48 rounded bg-[#1D3860]" />
              <div className="h-3 w-32 rounded bg-[#1D3860]" />
            </div>
            <div className="h-4 w-20 rounded bg-[#1D3860]" />
          </div>
        ))}
      </div>
    </div>
  );
};

export const ErrorBanner: React.FC<{
  message: string;
  onRetry?: () => void;
}> = ({ message, onRetry }) => {
  return (
    <div
      role="alert"
      className="portal-card border-[#FB7185]/40 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
    >
      <div className="flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-[#FB7185] shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-white">Unable to load latest data</p>
          <p className="text-xs text-[#8EA7C7] mt-0.5">{message}</p>
        </div>
      </div>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="portal-btn-secondary !min-h-[40px] !px-4 text-xs"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Retry
        </button>
      )}
    </div>
  );
};
