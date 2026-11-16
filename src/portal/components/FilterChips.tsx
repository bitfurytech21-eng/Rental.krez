import React from 'react';

interface FilterChipsProps {
  options: string[];
  value: string;
  onChange: (value: string) => void;
  ariaLabel?: string;
}

export const FilterChips: React.FC<FilterChipsProps> = ({
  options,
  value,
  onChange,
  ariaLabel = 'Filter options',
}) => {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar"
    >
      {options.map((opt) => {
        const active = value === opt;
        return (
          <button
            key={opt}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(opt)}
            className={`min-h-[40px] px-4 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 transition-colors duration-150 border ${
              active
                ? 'bg-[#C5A880] text-[#0B1B30] border-[#C5A880]'
                : 'bg-[#102442] text-[#8EA7C7] border-[#1D3860] hover:text-white hover:border-[#C5A880]/60'
            }`}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
};
