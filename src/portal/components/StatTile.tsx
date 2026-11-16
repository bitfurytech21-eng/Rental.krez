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
    tone === 'accent'
      ? 'text-[#C5A880]'
      : tone === 'positive'
      ? 'text-[#34D399]'
      : 'text-white';

  return (
    <div className="portal-card p-4 sm:p-5 flex flex-col justify-between gap-2">
      <div className="text-xs font-medium text-[#8EA7C7]">{label}</div>
      <div className={`text-xl sm:text-2xl font-bold portal-tabular tracking-tight ${valueClass}`}>
        {value}
      </div>
      {sublabel && (
        <div className="text-xs text-[#8EA7C7]">{sublabel}</div>
      )}
    </div>
  );
};
