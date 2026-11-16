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
            className={`min-h-[44px] px-4 rounded-[14px] text-sm font-semibold whitespace-nowrap shrink-0 transition-colors duration-150 border ${
              active
                ? 'bg-[#6FD8B0] text-[#07231A] border-[#6FD8B0]'
                : 'bg-[#121A1F] text-[#8FA1A8] border-[#1F2C33] hover:text-[#F2F5F4] hover:border-[#6FD8B0]/60'
            }`}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
};
