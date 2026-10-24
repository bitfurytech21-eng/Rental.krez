import React from 'react';
import { ArrowRight, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { HouseBackgroundAnimation } from './HouseBackgroundAnimation';

interface HeroProps {
  onExplore: () => void;
  onHowItWorks: () => void;
}

export const Hero: React.FC<HeroProps> = ({ onExplore, onHowItWorks }) => {
  return (
    <div className="relative bg-[#10221E] text-white overflow-hidden max-w-full border-b border-[#1A352F]">
      {/* Restrained Architectural Blueprint Line Geometry */}
      <HouseBackgroundAnimation />

      {/* Hero Section Container */}
      <section className="relative z-10 pt-14 pb-18 lg:pt-24 lg:pb-28">
        <div className="container max-w-[1240px] mx-auto px-4 sm:px-6">
          <div className="max-w-3xl mx-auto text-center space-y-7">
            
            {/* Dignified Institutional Kicker */}
            <div className="inline-flex items-center gap-2 text-xs font-semibold text-[#B7E36A] tracking-wide uppercase px-4 py-1.5 rounded-full bg-[#182C27] border border-[#23423B] shadow-xs">
              <ShieldCheck className="w-3.5 h-3.5 text-[#B7E36A]" />
              <span>L'Agence Institutional Real Estate</span>
              <span className="text-[#27845D]">·</span>
              <span className="text-white normal-case font-medium">Ring-Fenced European SPV Structure</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.12] text-white">
              Fractional Real Estate Investment with{' '}
              <span className="text-[#B7E36A]">
                Institutional Governance
              </span>
            </h1>

            {/* Subheadline Description */}
            <p className="text-base sm:text-lg text-[#C5D9D4] max-w-2xl mx-auto leading-relaxed font-normal">
              Access curated European residential and commercial property offerings. 
              Receive automated monthly rental distributions directly to your account, protected by independent SPV custody and transparent legal documentation.
            </p>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center justify-center gap-3.5 pt-2">
              <button
                onClick={onExplore}
                className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl bg-[#B7E36A] hover:bg-[#C9F07C] text-[#0A1613] font-bold text-sm transition-all cursor-pointer shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
              >
                <span>Enter Marketplace</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                onClick={onHowItWorks}
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/25 text-white font-semibold text-sm transition-colors cursor-pointer shadow-2xs backdrop-blur-xs"
              >
                <span>How It Works</span>
                <ArrowRight className="w-4 h-4 text-[#B7E36A]" />
              </button>
            </div>

            {/* Key Trust Highlights */}
            <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-10 pt-8 border-t border-[#1C3A33] text-xs sm:text-sm font-medium text-[#C5D9D4] max-w-2xl mx-auto">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#B7E36A] shrink-0" />
                <span>100% Ring-Fenced SPVs</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#B7E36A] shrink-0" />
                <span>Automated Monthly Yields</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#B7E36A] shrink-0" />
                <span>Secondary Liquidity Desk</span>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* VERIFIED INSTITUTIONAL STANDARDS BAR */}
      <div className="border-t border-[#162D27] bg-[#0A1714] py-4">
        <div className="container max-w-[1240px] mx-auto px-4">
          <div className="flex flex-wrap items-center justify-between gap-4 text-xs text-[#9BB3AE]">
            <span className="flex items-center gap-1.5 font-medium text-white">
              <ShieldCheck className="w-4 h-4 text-[#B7E36A]" />
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
