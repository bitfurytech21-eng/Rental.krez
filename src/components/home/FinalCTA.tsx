import React from 'react';
import { ArrowRight, ShieldCheck, Check } from 'lucide-react';

interface FinalCTAProps {
  onRegister: () => void;
  onExplore: () => void;
}

export const FinalCTA: React.FC<FinalCTAProps> = ({ onRegister, onExplore }) => {
  return (
    <section className="relative overflow-hidden py-16 bg-[#F5C400] text-[#18211F] border-t border-[#DFB100]">
      <div className="container max-w-[1240px] mx-auto px-4 relative z-10">
        <div className="max-w-3xl mx-auto text-center space-y-5">
          <div className="inline-flex items-center gap-2 text-xs font-semibold text-amber-950 tracking-wide uppercase px-3.5 py-1.5 rounded-full bg-amber-300/60 border border-amber-600/30 shadow-xs">
            <ShieldCheck className="w-4 h-4 text-amber-950" />
            <span>Regulated European SPV Custody · Transparent Participation</span>
          </div>

          <h2 className="text-2xl sm:text-4xl font-extrabold text-[#18211F] tracking-tight leading-tight">
            Build a Diversified Real Estate Portfolio with Monthly Cashflow
          </h2>

          <p className="text-sm sm:text-base text-stone-800 max-w-xl mx-auto font-normal">
            Review vetted European residential and commercial offerings, examine independent RICS appraisals, and access automated monthly rental settlements.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              onClick={onRegister}
              className="px-6 py-3.5 rounded-lg bg-[#182D2A] hover:bg-[#24423C] text-white font-semibold text-sm transition-colors cursor-pointer shadow-sm hover:shadow-md flex items-center gap-2"
            >
              <span>Create Investor Account</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={onExplore}
              className="px-5 py-3.5 rounded-lg bg-white hover:bg-slate-50 border border-amber-400 text-slate-800 font-semibold text-sm transition-colors cursor-pointer shadow-2xs"
            >
              View Active Offerings
            </button>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6 text-xs text-stone-800 font-medium pt-6 border-t border-amber-400/60">
            <span className="flex items-center gap-1.5">
              <Check className="w-4 h-4 text-amber-950" /> Minimum Investment from €750
            </span>
            <span className="flex items-center gap-1.5">
              <Check className="w-4 h-4 text-amber-950" /> Ring-Fenced SPV Legal Custody
            </span>
            <span className="flex items-center gap-1.5">
              <Check className="w-4 h-4 text-amber-950" /> Direct Monthly Distributions
            </span>
          </div>
        </div>
      </div>
    </section>
  );
};

