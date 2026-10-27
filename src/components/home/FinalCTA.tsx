import React from 'react';
import { ArrowRight, ShieldCheck, Check } from 'lucide-react';

interface FinalCTAProps {
  onRegister: () => void;
  onExplore: () => void;
}

export const FinalCTA: React.FC<FinalCTAProps> = ({ onRegister, onExplore }) => {
  return (
    <section className="py-20 sm:py-28 bg-[#0B1B30] text-white border-t border-[#1D3860]">
      <div className="container max-w-[1240px] mx-auto px-4 sm:px-6">
        <div className="bg-[#102442] border border-[#1D3860] rounded-2xl p-10 sm:p-16 text-white text-center space-y-6 relative overflow-hidden shadow-lg">
          
          <div className="max-w-3xl mx-auto space-y-5 relative z-10">
            <p className="text-[11px] font-bold text-[#BEE179] tracking-[0.2em] uppercase flex items-center justify-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#BEE179]" />
              <span>Regulated European SPV Custody · Direct Ownership</span>
            </p>

            <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-black text-[#BEE179] tracking-tight leading-tight">
              Build a Curated Real Estate Portfolio with Monthly Yields
            </h2>

            <p className="text-sm sm:text-base text-[#D1E2F7] max-w-xl mx-auto font-normal leading-relaxed">
              Review vetted European residential and commercial assets, inspect independent RICS appraisals, and access automated monthly rental settlements.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-3 pt-3">
              <button
                onClick={onRegister}
                className="py-3.5 px-6 rounded-lg bg-[#BEE179] hover:bg-[#AEDB5B] text-[#0B1B30] font-bold text-xs tracking-wide transition-all cursor-pointer shadow-xs flex items-center gap-2"
              >
                <span>Create Investor Account</span>
                <ArrowRight className="w-3.5 h-3.5 text-[#0B1B30]" />
              </button>
              <button
                onClick={onExplore}
                className="py-3.5 px-6 rounded-lg bg-[#0B1B30] hover:bg-[#132745] border border-[#1D3860] text-white font-bold text-xs tracking-wide transition-all cursor-pointer"
              >
                <span>Browse Active Assets</span>
              </button>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-y-3 gap-x-8 text-xs text-[#D1E2F7] font-medium pt-8 border-t border-[#1D3860]">
              <span className="flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-[#BEE179]" /> Entry Ticket from €750
              </span>
              <span className="flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-[#BEE179]" /> Ring-Fenced SPV Legal Custody
              </span>
              <span className="flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-[#BEE179]" /> Direct Monthly Distributions
              </span>
            </div>
          </div>
          
        </div>
      </div>
    </section>
  );
};
