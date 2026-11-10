import React from 'react';

export const Skeleton: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div
    className={`animate-pulse bg-[#E2E8F0] dark:bg-[#1E293B] rounded-[8px] ${className}`}
  />
);

export const KpiCardSkeleton: React.FC = () => (
  <div className="h-[112px] p-[20px] rounded-[12px] bg-white dark:bg-[#111A2C] border border-[#E2E8F0] dark:border-[#1E293B] shadow-[0_1px_3px_rgba(0,0,0,0.06)] flex flex-col justify-between">
    <div className="flex items-center justify-between">
      <Skeleton className="h-4 w-28" />
      <Skeleton className="h-4 w-14 rounded-full" />
    </div>
    <div className="flex items-baseline justify-between">
      <Skeleton className="h-8 w-36" />
      <Skeleton className="h-6 w-16" />
    </div>
  </div>
);

export const KpiRowSkeleton: React.FC = () => (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-[16px]">
    <KpiCardSkeleton />
    <KpiCardSkeleton />
    <KpiCardSkeleton />
    <KpiCardSkeleton />
  </div>
);

export const TableSkeleton: React.FC<{ rows?: number }> = ({ rows = 4 }) => (
  <div className="rounded-[12px] bg-white dark:bg-[#111A2C] border border-[#E2E8F0] dark:border-[#1E293B] shadow-[0_1px_3px_rgba(0,0,0,0.06)] overflow-hidden">
    <div className="p-[20px] flex items-center justify-between border-b border-[#E2E8F0] dark:border-[#1E293B]">
      <div className="space-y-1.5">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-3.5 w-72" />
      </div>
      <Skeleton className="h-4 w-20" />
    </div>
    <div className="p-[20px] space-y-4">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Skeleton className="w-[40px] h-[40px] rounded-[8px] shrink-0" />
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-44" />
              <Skeleton className="h-3 w-28" />
            </div>
          </div>
          <Skeleton className="h-4 w-20 hidden sm:block" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-16 hidden md:block" />
          <Skeleton className="h-7 w-20 rounded-[8px]" />
        </div>
      ))}
    </div>
  </div>
);

export const ChartSkeleton: React.FC<{ height?: string }> = ({ height = 'h-[320px]' }) => (
  <div className={`p-[20px] rounded-[12px] bg-white dark:bg-[#111A2C] border border-[#E2E8F0] dark:border-[#1E293B] shadow-[0_1px_3px_rgba(0,0,0,0.06)] space-y-4`}>
    <div className="flex items-center justify-between">
      <div className="space-y-1.5">
        <Skeleton className="h-5 w-52" />
        <Skeleton className="h-3.5 w-80" />
      </div>
      <Skeleton className="h-7 w-32 rounded-full" />
    </div>
    <div className={`${height} w-full flex items-end gap-3 pt-6`}>
      <Skeleton className="flex-1 h-[40%]" />
      <Skeleton className="flex-1 h-[55%]" />
      <Skeleton className="flex-1 h-[70%]" />
      <Skeleton className="flex-1 h-[60%]" />
      <Skeleton className="flex-1 h-[85%]" />
      <Skeleton className="flex-1 h-[100%]" />
    </div>
  </div>
);

export const PropertyCardSkeleton: React.FC = () => (
  <div className="rounded-[12px] bg-white dark:bg-[#111A2C] border border-[#E2E8F0] dark:border-[#1E293B] shadow-[0_1px_3px_rgba(0,0,0,0.06)] overflow-hidden flex flex-col space-y-4 p-[20px]">
    <Skeleton className="w-full aspect-[16/10] rounded-[8px]" />
    <div className="space-y-2">
      <Skeleton className="h-3.5 w-32" />
      <Skeleton className="h-5 w-full" />
    </div>
    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#E2E8F0] dark:border-[#1E293B]">
      <Skeleton className="h-8 w-full" />
      <Skeleton className="h-8 w-full" />
    </div>
    <Skeleton className="h-2 w-full rounded-full" />
    <Skeleton className="h-9 w-full rounded-[8px]" />
  </div>
);
