import React from 'react';

interface HostTrustStripProps {
  className?: string;
  variant?: 'header' | 'hero' | 'drawer';
}

/**
 * HostTrustStrip
 * Recreates the signature host protection trust strip matching reference IMG_7377_f94f4b1d.jpeg:
 * - 3 larger overlapping color circles (Tan #DFB080, Sage #98BFB2, Slate #8093A7) with dark borders
 * - Stronger 25,000+ hosts bold typography with sage-tinted 'feel more protected' supporting text
 * - Refined bordered layout with top border separator and rich dark background
 * - Responsive at 428×575 mobile viewport in dark mode with zero horizontal overflow
 */
export const HostTrustStrip: React.FC<HostTrustStripProps> = ({
  className = '',
  variant = 'header'
}) => {
  return (
    <div 
      className={`w-full bg-[#101816] border-t border-[#26312E] select-none ${className}`}
      role="region"
      aria-label="Host Protection Trust Indicator"
    >
      <div className="w-full max-w-[1380px] mx-auto px-4 sm:px-6 lg:px-8 py-2.5 sm:py-3 flex items-center justify-start sm:justify-start">
        <div className="flex items-center gap-3.5 sm:gap-4 max-w-full overflow-hidden">
          {/* Larger Overlapping Color Badges matching reference */}
          <div className="flex items-center shrink-0" aria-hidden="true">
            {/* Circle 1: Warm Amber / Tan */}
            <div 
              className="w-[34px] h-[34px] sm:w-[38px] sm:h-[38px] rounded-full border-[2.5px] border-[#101816] z-10 shrink-0 shadow-xs transition-transform hover:scale-105"
              style={{ backgroundColor: '#DFB080' }}
              title="Verified Host Coverage"
            />
            {/* Circle 2: Muted Sage / Seafoam Teal */}
            <div 
              className="w-[34px] h-[34px] sm:w-[38px] sm:h-[38px] rounded-full border-[2.5px] border-[#101816] -ml-3 sm:-ml-3.5 z-20 shrink-0 shadow-xs transition-transform hover:scale-105"
              style={{ backgroundColor: '#98BFB2' }}
              title="Automated Settlement"
            />
            {/* Circle 3: Muted Slate / Periwinkle Blue */}
            <div 
              className="w-[34px] h-[34px] sm:w-[38px] sm:h-[38px] rounded-full border-[2.5px] border-[#101816] -ml-3 sm:-ml-3.5 z-30 shrink-0 shadow-xs transition-transform hover:scale-105"
              style={{ backgroundColor: '#8093A7' }}
              title="1:1 Ring-Fenced Backing"
            />
          </div>

          {/* Stronger 25,000+ hosts Typography */}
          <div className="flex items-baseline gap-1.5 whitespace-nowrap text-[15px] sm:text-[17px] leading-tight tracking-tight">
            <span className="font-bold text-white tracking-tight">
              25,000+ hosts
            </span>
            <span className="text-[#9CB0A8] font-normal tracking-normal">
              feel more protected
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
