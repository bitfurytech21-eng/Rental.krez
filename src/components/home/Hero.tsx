import React from 'react';
import { ArrowRight, ShieldCheck, CheckCircle2 } from 'lucide-react';

interface HeroProps {
  onExplore: () => void;
  onHowItWorks: () => void;
}

/**
 * Hero component updated to match the exact visual style of IMG_7380_71e7d045.jpeg:
 * - Deep Executive Midnight Royal Navy background (#0B1B30)
 * - Vibrant Lime / Chartreuse Green accent (#BEE179)
 * - High-contrast white headline with highlighted "Institutional Governance"
 * - Primary CTA "Enter Marketplace" in lime green (#BEE179) with dark text (#0B1B30)
 * - Secondary CTA "How It Works" in dark translucent container
 * - Checkmarks and key metrics in lime green
 */
export const Hero: React.FC<HeroProps> = ({ onExplore, onHowItWorks }) => {
  return (
    <section className="relative bg-[#0B1B30] text-white overflow-hidden border-b border-[#1A3358] pt-10 pb-16 lg:pt-16 lg:pb-24 transition-colors">
      
      {/* Subtle ambient radial background glow */}
      <div 
        className="absolute inset-0 opacity-40 pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(1000px circle at 50% -100px, rgba(29, 56, 96, 0.6) 0%, rgba(11, 27, 48, 0.98) 70%, #0B1B30 100%)`,
        }}
        aria-hidden="true"
      />

      <div className="container max-w-[1340px] mx-auto px-4 sm:px-6 relative z-10">
        
        {/* Main 2-Column Editorial Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
          
          {/* Left Column: Editorial Proposition & CTA */}
          <div className="lg:col-span-7 space-y-6 sm:space-y-8 text-left">
            
            {/* Pill Container Kicker matching reference */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#122846] border border-[#23436D] shadow-xs text-xs">
              <ShieldCheck className="w-4 h-4 text-[#BEE179] shrink-0 stroke-[2.5]" />
              <span className="text-[#BEE179] font-black tracking-wider uppercase text-[11px]">
                L'AGENCE INSTITUTIONAL REAL ESTATE
              </span>
              <span className="text-[#6484B0]" aria-hidden="true">·</span>
              <span className="text-white font-bold text-[11px] truncate max-w-[210px] sm:max-w-none">
                Ring-Fenced European SPV Structure
              </span>
            </div>

            {/* Major Editorial Headline matching reference */}
            <h1 className="font-serif text-3xl sm:text-5xl lg:text-[3.75rem] font-black tracking-tight text-white leading-[1.10]">
              Fractional Real Estate Investment with{' '}
              <span className="text-[#BEE179] font-black not-italic drop-shadow-xs">
                Institutional Governance
              </span>
            </h1>

            {/* Concise Supporting Copy matching reference */}
            <p className="text-base sm:text-lg text-[#D1E2F7] leading-relaxed max-w-xl font-semibold">
              Access curated European residential and commercial property offerings. Receive automated monthly rental distributions directly to your account, protected by independent SPV custody and transparent legal documentation.
            </p>

            {/* Action Group matching reference */}
            <div className="flex flex-wrap items-center gap-4 pt-1">
              <button
                onClick={onExplore}
                className="px-8 py-4 rounded-xl bg-[#BEE179] hover:bg-[#aed860] text-[#0B1B30] font-black text-sm tracking-wide flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer transform active:scale-[0.98]"
              >
                <span>Enter Marketplace</span>
                <ArrowRight className="w-4 h-4 text-[#0B1B30] stroke-[3]" />
              </button>

              <button
                onClick={onHowItWorks}
                className="px-7 py-4 rounded-xl bg-[#132745] hover:bg-[#1A3258] border border-[#2B4C7E] text-white font-extrabold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <span>How It Works</span>
                <ArrowRight className="w-4 h-4 text-[#D1E2F7] stroke-[2.5]" />
              </button>
            </div>

            {/* Institutional Trust Triad matching reference checkmarks */}
            <div className="pt-6 border-t border-[#1F3E6C] grid grid-cols-1 sm:grid-cols-3 gap-3 text-left text-xs font-extrabold text-white">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#BEE179] shrink-0 stroke-[2.5]" />
                <span className="font-extrabold text-white">100% Ring-Fenced SPVs</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#BEE179] shrink-0 stroke-[2.5]" />
                <span className="font-extrabold text-white">Automated Monthly Yields</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#BEE179] shrink-0 stroke-[2.5]" />
                <span className="font-extrabold text-white">Secondary Liquidity Desk</span>
              </div>
            </div>

          </div>

          {/* Right Column: Architectural Spotlight Card */}
          <div className="lg:col-span-5">
            <div 
              onClick={onExplore}
              className="bg-[#102442] rounded-2xl border border-[#1D3860] overflow-hidden shadow-xl hover:border-[#BEE179]/50 transition-all duration-300 cursor-pointer group text-left"
            >
              {/* Property Image with Measured Scrim */}
              <div className="relative aspect-[16/11] overflow-hidden bg-[#0A1729]">
                <img
                  src="https://files.kretzrealestate.com/5534a64054a86115d0d81384cb413d7c.jpg"
                  alt="Villa Ramingao, Roquebrune Cap Martin"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                  loading="eager"
                  referrerPolicy="no-referrer"
                />
                
                {/* Status Overlay */}
                <div className="absolute top-3.5 left-3.5 flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-md bg-[#0B1B30]/90 backdrop-blur-sm text-white text-[10px] font-bold tracking-wider uppercase border border-[#1D3860]">
                    Featured Offering
                  </span>
                </div>

                <div className="absolute bottom-3.5 right-3.5">
                  <span className="px-2.5 py-1 rounded-md bg-[#BEE179] text-[#0B1B30] text-xs font-black font-mono shadow-sm">
                    7.5% Net Yield
                  </span>
                </div>
              </div>

              {/* Spotlight Details */}
              <div className="p-5 sm:p-6 space-y-3.5 bg-[#102442]">
                <div>
                  <div className="text-[11px] uppercase tracking-wider text-[#8EA7C7] font-semibold">
                    French Riviera · Monaco Border
                  </div>
                  <h2 className="font-serif text-lg sm:text-xl font-medium text-white mt-0.5 group-hover:text-[#BEE179] transition-colors">
                    Villa Ramingao · Roquebrune-Cap-Martin
                  </h2>
                </div>

                <div className="grid grid-cols-3 gap-3 py-3 border-y border-[#1D3860] text-xs font-mono">
                  <div>
                    <span className="text-[#6A85AC] block text-[10px] font-sans">Capitalization</span>
                    <span className="font-semibold text-white">€5,900,000</span>
                  </div>
                  <div>
                    <span className="text-[#6A85AC] block text-[10px] font-sans">Token Price</span>
                    <span className="font-semibold text-white">€100 / unit</span>
                  </div>
                  <div>
                    <span className="text-[#6A85AC] block text-[10px] font-sans">Pacing</span>
                    <span className="font-bold text-[#BEE179]">60% Funded</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
};
