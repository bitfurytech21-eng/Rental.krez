import React, { useState } from 'react';
import { ArrowRight, ShieldCheck, CheckCircle2, Calculator, TrendingUp, Building2, Coins, ExternalLink, ChevronRight, Star } from 'lucide-react';
import { HouseBackgroundAnimation } from './HouseBackgroundAnimation';

interface HeroProps {
  onExplore: () => void;
  onHowItWorks: () => void;
}

export const Hero: React.FC<HeroProps> = ({ onExplore, onHowItWorks }) => {
  const [heroTab, setHeroTab] = useState<'asset' | 'calculator'>('calculator');
  const [simAmount, setSimAmount] = useState<number>(2500);

  // Calculations for ROI Simulator
  const annualYield = 0.126; // 12.6% avg yield
  const estimatedMonthly = Math.round((simAmount * annualYield) / 12);
  const projected3Year = Math.round(simAmount * (1 + annualYield * 3 + 0.08)); // yield + estimated capital appreciation
  const tokensCount = Math.floor(simAmount / 100);

  return (
    <div className="relative bg-[#071714] text-white overflow-hidden max-w-full border-b border-emerald-900/40">
      {/* Restrained Architectural Blueprint Line Geometry */}
      <HouseBackgroundAnimation />

      {/* Hero Section Container */}
      <section className="relative z-10 pt-10 pb-16 lg:pt-16 lg:pb-20">
        <div className="container max-w-[1240px] mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-8 items-center">
            
            {/* Left Column: Kretz Value Proposition */}
            <div className="lg:col-span-7 space-y-6 text-left">
              {/* Dignified Institutional Kicker */}
              <div className="inline-flex items-center gap-2 text-xs font-semibold text-emerald-400 tracking-wide uppercase">
                <span>Kretz Institutional Real Estate</span>
                <span className="text-emerald-700">·</span>
                <span className="text-slate-300 normal-case font-normal">Ring-Fenced European SPV Structure</span>
              </div>

              {/* Main Headline */}
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-[1.12] text-white">
                Fractional Real Estate Investment with{' '}
                <span className="text-emerald-400">
                  Institutional Governance
                </span>
              </h1>

              {/* Subheadline Description */}
              <p className="text-base sm:text-lg text-slate-300 max-w-2xl leading-relaxed font-normal">
                Access curated European residential and commercial property offerings. 
                Receive automated monthly rental distributions directly to your account, protected by independent SPV custody and transparent legal documentation.
              </p>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  onClick={onExplore}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm transition-colors cursor-pointer shadow-sm"
                >
                  <span>Enter Marketplace</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <button
                  onClick={() => setHeroTab('calculator')}
                  className="inline-flex items-center gap-2 px-5 py-3.5 rounded-lg bg-slate-900/80 hover:bg-slate-800 border border-slate-700 text-slate-200 font-medium text-sm transition-colors cursor-pointer"
                >
                  <Calculator className="w-4 h-4 text-emerald-400" />
                  <span>Simulate Projections</span>
                </button>
              </div>

              {/* Key Trust Highlights */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-6 border-t border-emerald-900/50 text-xs font-medium text-slate-300">
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

            {/* Right Column: Institutional Investment & SPV Architecture Console */}
            <div className="lg:col-span-5">
              <div className="rounded-xl bg-[#0B1E19] border border-emerald-800/40 shadow-xl overflow-hidden">
                
                {/* Console Mode Switcher */}
                <div className="flex items-center border-b border-emerald-900/60 bg-[#061512] p-1.5 gap-1.5">
                  <button
                    onClick={() => setHeroTab('calculator')}
                    className={`flex-1 py-2 px-3 rounded-md text-xs font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                      heroTab === 'calculator'
                        ? 'bg-emerald-700 text-white shadow-xs'
                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <Calculator className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Yield Simulator</span>
                  </button>

                  <button
                    onClick={() => setHeroTab('asset')}
                    className={`flex-1 py-2 px-3 rounded-md text-xs font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                      heroTab === 'asset'
                        ? 'bg-emerald-700 text-white shadow-xs'
                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>SPV Custody Structure</span>
                  </button>
                </div>

                {/* TAB 1: ROI SIMULATOR CALCULATOR */}
                {heroTab === 'calculator' && (
                  <div className="p-5 space-y-4 text-left">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                          Select Investment Capital
                        </label>
                        <span className="text-xl font-bold text-emerald-400 font-mono tabular-nums">
                          €{simAmount.toLocaleString()}
                        </span>
                      </div>

                      {/* Quick Preset Buttons */}
                      <div className="flex items-center gap-1.5 mb-3">
                        {[1000, 2500, 5000, 10000, 25000].map((preset) => (
                          <button
                            key={preset}
                            type="button"
                            onClick={() => setSimAmount(preset)}
                            className={`flex-1 py-1 text-[11px] font-semibold rounded-md transition-colors cursor-pointer tabular-nums ${
                              simAmount === preset
                                ? 'bg-emerald-600 text-white shadow-xs'
                                : 'bg-slate-900/80 text-slate-300 hover:bg-slate-800 border border-slate-700/60'
                            }`}
                          >
                            €{preset >= 1000 ? `${preset / 1000}k` : preset}
                          </button>
                        ))}
                      </div>

                      {/* Range Input Slider */}
                      <input
                        type="range"
                        min={750}
                        max={50000}
                        step={250}
                        value={simAmount}
                        onChange={(e) => setSimAmount(Number(e.target.value))}
                        className="w-full accent-emerald-500 bg-slate-800 rounded-lg h-2 cursor-pointer"
                      />
                      <div className="flex justify-between text-[10px] text-slate-400 font-medium mt-1 tabular-nums">
                        <span>Min €750</span>
                        <span>€15,000</span>
                        <span>Max €50,000</span>
                      </div>
                    </div>

                    {/* Calculation Results */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 rounded-lg bg-[#061512] border border-emerald-900/60 space-y-1">
                        <span className="text-[11px] text-slate-400 font-medium block">Est. Monthly Distribution</span>
                        <span className="text-lg font-bold text-emerald-400 font-mono tabular-nums">
                          €{estimatedMonthly} <span className="text-xs font-normal text-slate-400">/mo</span>
                        </span>
                      </div>

                      <div className="p-3 rounded-lg bg-[#061512] border border-emerald-900/60 space-y-1">
                        <span className="text-[11px] text-slate-400 font-medium block">Projected 3-Yr Total Return</span>
                        <span className="text-lg font-bold text-white font-mono tabular-nums">
                          €{projected3Year.toLocaleString()}
                        </span>
                      </div>
                    </div>

                    <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 text-xs text-slate-300 flex items-center justify-between">
                      <span>Direct SPV Equity Units ({tokensCount} tokens):</span>
                      <span className="font-semibold text-white font-mono tabular-nums">€100 / unit</span>
                    </div>

                    <p className="text-[10px] text-slate-400 leading-tight">
                      *Projections modeled on target 12.6% net annualized return with automated monthly dividends deposited in Euro.
                    </p>

                    <button
                      onClick={onExplore}
                      className="w-full py-3.5 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                    >
                      <span>Explore Dedicated Marketplace</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {/* TAB 2: SPV CUSTODY & REGULATORY STRUCTURE */}
                {heroTab === 'asset' && (
                  <div className="p-5 space-y-4 text-left">
                    <div className="space-y-1">
                      <h3 className="text-sm font-bold text-white">Ring-Fenced Legal SPV Architecture</h3>
                      <p className="text-xs text-slate-300 leading-relaxed">
                        Every asset is held in an isolated French SCI or Spanish SL company. Investors own digital equity certificates directly tied to notarial land registry deeds.
                      </p>
                    </div>

                    <div className="space-y-2.5">
                      <div className="p-3 rounded-lg bg-[#061512] border border-emerald-900/60 flex items-start gap-3">
                        <Building2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        <div>
                          <h4 className="text-xs font-semibold text-white">1 Property = 1 Independent SPV</h4>
                          <p className="text-[11px] text-slate-400">Zero cross-liability. Liabilities of one property can never affect another asset.</p>
                        </div>
                      </div>

                      <div className="p-3 rounded-lg bg-[#061512] border border-emerald-900/60 flex items-start gap-3">
                        <TrendingUp className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        <div>
                          <h4 className="text-xs font-semibold text-white">Automated Euro Yield Settlement</h4>
                          <p className="text-[11px] text-slate-400">Rental income paid directly to your investor wallet on the 1st of each month.</p>
                        </div>
                      </div>

                      <div className="p-3 rounded-lg bg-[#061512] border border-emerald-900/60 flex items-start gap-3">
                        <Coins className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        <div>
                          <h4 className="text-xs font-semibold text-white">Secondary Marketplace Liquidity</h4>
                          <p className="text-[11px] text-slate-400">Trade or liquidate units on our internal P2P bulletin board without lockups.</p>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={onExplore}
                      className="w-full py-3.5 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                    >
                      <span>View All Marketplace Offerings</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                )}

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

