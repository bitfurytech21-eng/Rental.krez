import React from 'react';
import { ArrowRight, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { HouseBackgroundAnimation } from './HouseBackgroundAnimation';

interface HeroProps {
  onExplore: () => void;
  onHowItWorks: () => void;
}

export const Hero: React.FC<HeroProps> = ({ onExplore, onHowItWorks }) => {
  return (
    <div className="relative bg-[#071714] text-white overflow-hidden max-w-full border-b border-emerald-900/40">
      {/* Restrained Architectural Blueprint Line Geometry */}
      <HouseBackgroundAnimation />

      {/* Hero Section Container */}
      <section className="relative z-10 pt-12 pb-16 lg:pt-20 lg:pb-24">
        <div className="container max-w-[1240px] mx-auto px-4 sm:px-6">
          <div className="max-w-3xl mx-auto text-center space-y-7">
            
            {/* Dignified Institutional Kicker */}
            <div className="inline-flex items-center gap-2 text-xs font-semibold text-emerald-400 tracking-wide uppercase px-3.5 py-1.5 rounded-full bg-emerald-950/70 border border-emerald-800/50 shadow-xs">
              <span>Kretz Institutional Real Estate</span>
              <span className="text-emerald-600">·</span>
              <span className="text-slate-300 normal-case font-normal">Ring-Fenced European SPV Structure</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.12] text-white">
              Fractional Real Estate Investment with{' '}
              <span className="text-emerald-400">
                Institutional Governance
              </span>
            </h1>

            {/* Subheadline Description */}
            <p className="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed font-normal">
              Access curated European residential and commercial property offerings. 
              Receive automated monthly rental distributions directly to your account, protected by independent SPV custody and transparent legal documentation.
            </p>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <button
                onClick={onExplore}
                className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm transition-colors cursor-pointer shadow-sm hover:shadow-md"
              >
                <span>Enter Marketplace</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                onClick={onHowItWorks}
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-lg bg-slate-900/80 hover:bg-slate-800 border border-slate-700 text-slate-200 font-medium text-sm transition-colors cursor-pointer"
              >
                <span>How It Works</span>
                <ArrowRight className="w-4 h-4 text-emerald-400" />
              </button>
            </div>

            {/* Key Trust Highlights */}
            <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-10 pt-8 border-t border-emerald-900/50 text-xs sm:text-sm font-medium text-slate-300 max-w-2xl mx-auto">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>100% Ring-Fenced SPVs</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Automated Monthly Yields</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Secondary Liquidity Desk</span>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* VERIFIED INSTITUTIONAL STANDARDS BAR */}
      <div className="border-t border-emerald-900/60 bg-[#040F0D] py-4">
        <div className="container max-w-[1240px] mx-auto px-4">
          <div className="flex flex-wrap items-center justify-between gap-4 text-xs text-slate-400">
            <span className="flex items-center gap-1.5 font-medium text-slate-300">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              Institutional Due Diligence Standards
            </span>
            <div className="flex flex-wrap items-center gap-6 sm:gap-8 font-medium">
              <span>RICS Valuation Standards</span>
              <span>·</span>
              <span>Ring-Fenced Asset SPVs</span>
              <span>·</span>
              <span>Audited Notarial Titling</span>
              <span>·</span>
              <span>Automated Monthly Settlement</span>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};
