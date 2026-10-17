import React from 'react';
import { ArrowRight, ShieldCheck, Check } from 'lucide-react';

interface FinalCTAProps {
  onRegister: () => void;
  onExplore: () => void;
}

export const FinalCTA: React.FC<FinalCTAProps> = ({ onRegister, onExplore }) => {
  return (
    <section className="relative overflow-hidden py-16 bg-[#071714] text-white border-t border-emerald-900/40">
      <div className="container max-w-[1240px] mx-auto px-4 relative z-10">
        <div className="max-w-3xl mx-auto text-center space-y-5">
          <div className="inline-flex items-center gap-2 text-xs font-semibold text-emerald-400 tracking-wide uppercase">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Regulated European SPV Custody · Transparent Participation</span>
          </div>

          <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">
            Build a Diversified Real Estate Portfolio with Monthly Cashflow
          </h2>

          <p className="text-sm sm:text-base text-slate-300 max-w-xl mx-auto font-normal">
            Review vetted European residential and commercial offerings, examine independent RICS appraisals, and access automated monthly rental settlements.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              onClick={onRegister}
              className="px-6 py-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm transition-colors cursor-pointer shadow-sm flex items-center gap-2"
            >
              <span>Create Investor Account</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={onExplore}
              className="px-5 py-3 rounded-lg bg-slate-900/80 hover:bg-slate-800 border border-slate-700 text-slate-200 font-medium text-sm transition-colors cursor-pointer"
            >
              View Active Offerings
            </button>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6 text-xs text-slate-400 pt-6 border-t border-emerald-900/50">
            <span className="flex items-center gap-1.5">
              <Check className="w-4 h-4 text-emerald-400" /> Minimum Investment from €750
            </span>
            <span className="flex items-center gap-1.5">
              <Check className="w-4 h-4 text-emerald-400" /> Ring-Fenced SPV Legal Custody
            </span>
            <span className="flex items-center gap-1.5">
              <Check className="w-4 h-4 text-emerald-400" /> Direct Monthly Distributions
            </span>
          </div>
        </div>
      </div>
    </section>
  );
};

