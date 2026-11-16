import React from 'react';

interface StatTileProps {
  label: string;
  value: string;
  sublabel?: string;
  tone?: 'default' | 'accent' | 'positive';
}

export const StatTile: React.FC<StatTileProps> = ({
  label,
  value,
  sublabel,
  tone = 'default',
}) => {
  const valueClass =
    tone === 'accent' || tone === 'positive'
      ? 'text-[#6FD8B0]'
      : 'text-[#F2F5F4]';

  return (
    <div className="portal-card flex flex-col justify-between gap-2">
      <div className="text-sm font-medium text-[#8FA1A8]">{label}</div>
      <div className={`text-2xl sm:text-[26px] font-bold portal-tabular tracking-tight leading-tight ${valueClass}`}>
        {value}
      </div>
      {sublabel && (
        <div className="text-xs text-[#8FA1A8]">{sublabel}</div>
      )}
    </div>
  );
};
