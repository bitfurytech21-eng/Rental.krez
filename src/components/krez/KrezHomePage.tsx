import React, { useEffect, useRef, useState } from 'react';
import { ArrowRight, Building2, TrendingUp, ShieldCheck, CheckCircle2, Calculator, Sparkles, ChevronRight, Coins } from 'lucide-react';
import { useReducedMotion } from 'motion/react';
import {
  KREZ_GALLERY_ITEMS,
  KREZ_IMAGES,
  formatJournalDate,
  getJournalPosts,
} from '../../data/krezTemplateData';
import { ledger } from '../../lib/ledger';
import { KrezImage, KrezReveal } from './KrezReveal';
import { formatCurrency } from '../../lib/utils';

interface KrezHomePageProps {
  onNavigate: (path: string) => void;
}

interface AnimatedStatProps {
  target: number;
  suffix?: string;
  label: string;
}

const AnimatedStat: React.FC<AnimatedStatProps> = ({ target, suffix = '', label }) => {
  const prefersReducedMotion = useReducedMotion();
  const [value, setValue] = useState(prefersReducedMotion ? target : 0);
  const ref = useRef<HTMLDivElement | null>(null);
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (prefersReducedMotion) {
      setValue(target);
      return;
    }
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      setValue(target);
      return;
    }

    let rafId = 0;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !hasAnimated.current) {
            hasAnimated.current = true;
            const duration = 1200;
            const start = performance.now();

            const tick = (now: number) => {
              const progress = Math.min(1, (now - start) / duration);
              const eased = 1 - Math.pow(1 - progress, 3);
              setValue(Math.round(target * eased));
              if (progress < 1) {
                rafId = window.requestAnimationFrame(tick);
              }
            };
            rafId = window.requestAnimationFrame(tick);
          }
        });
      },
      { threshold: 0.35 }
    );

    observer.observe(el);
    return () => {
      observer.disconnect();
      if (rafId) window.cancelAnimationFrame(rafId);
    };
  }, [target, prefersReducedMotion]);

  return (
    <div ref={ref} className="s2-stat">
      <div className="s2-stat-value">
        {value}
        {suffix}
      </div>
      <div className="s2-stat-label">{label}</div>
    </div>
  );
};

export const KrezHomePage: React.FC<KrezHomePageProps> = ({ onNavigate }) => {
  const journalPosts = getJournalPosts().slice(0, 3);
  const frontendProperties = ledger.getFrontendProperties();
  const listedBuildingsCount = frontendProperties.length || 53;

  // Interactive Live Yield Simulator state
  const [simulatorAmount, setSimulatorAmount] = useState<number>(10000);
  const estimatedYieldPct = 10.4; // 10.4% net APY average
  const monthlyRentalPayout = Math.round((simulatorAmount * (estimatedYieldPct / 100)) / 12);
  const annualRentalPayout = Math.round(simulatorAmount * (estimatedYieldPct / 100));
  const estimatedTokenUnits = Math.round(simulatorAmount / 100);

  return (
    <main className="bg-[#FAF8F5] text-[#18211F]">
      {/* Section 1: Full-Viewport Architectural Hero matching reference photo */}
      <section className="relative min-h-[92vh] sm:min-h-screen w-full overflow-hidden flex flex-col justify-between">
        {/* Background Image: Clean Penthouse Skyline Terrace at Golden Hour with subtle alive motion */}
        <div className="absolute inset-0 overflow-hidden">
          <img
            src={KREZ_IMAGES.heroBackground}
            alt="Landmark luxury architecture skyline"
            loading="eager"
            className="h-full w-full object-cover object-[78%_center] sm:object-[70%_center] md:object-center transform scale-100 sm:scale-105 motion-safe:animate-[pulse_18s_ease-in-out_infinite] transition-transform duration-1000"
            style={{ filter: 'contrast(1.03) brightness(1.02)' }}
          />
          {/* Soft Natural Atmospheric Sunset Gradient - Crystal Clean View */}
          <div 
            className="pointer-events-none absolute inset-0"
            style={{
              background: 'linear-gradient(to right, rgba(250, 248, 245, 0.42) 0%, rgba(250, 248, 245, 0.18) 45%, transparent 75%)',
            }}
          />
          <div 
            className="pointer-events-none absolute inset-0"
            style={{
              background: 'linear-gradient(to bottom, rgba(250, 248, 245, 0.25) 0%, transparent 20%)',
            }}
          />
          <div 
            className="pointer-events-none absolute inset-0"
            style={{
              background: 'linear-gradient(to top, rgba(250, 248, 245, 0.95) 0%, rgba(250, 248, 245, 0.25) 12%, transparent 28%)',
            }}
          />
        </div>

        {/* Hero Content Area */}
        <div className="relative z-10 mx-auto flex flex-1 w-full max-w-container flex-col justify-between px-gutter pt-24 sm:pt-32 pb-8 md:px-gutter-md lg:px-gutter-lg">
          {/* Main Hero Marquee Typography matching the reference photo */}
          <div className="max-w-2xl pt-2 sm:pt-4">
            <div className="space-y-0 select-none">
              <h2 className="text-xl sm:text-3xl md:text-4xl font-heading font-extrabold uppercase tracking-tight text-[#111827] leading-none mb-1">
                INVEST IN
              </h2>
              <h1 className="text-[3.25rem] sm:text-7xl md:text-8xl lg:text-[7.25rem] font-heading font-black uppercase tracking-[-0.04em] text-[#111827] leading-[0.84] drop-shadow-xs">
                <span className="block">LANDMARK</span>
                <span className="block">S</span>
              </h1>
            </div>

            {/* Subtitles exactly matching the photo */}
            <div className="mt-4 sm:mt-5 space-y-0.5 text-base sm:text-lg md:text-xl font-heading font-semibold text-[#2a2a2a] leading-snug">
              <p>Fractional ownership of prime buildings</p>
              <p className="text-[#55524d]">Transparent from day one</p>
            </div>

            {/* Live European Register Micro-Kicker */}
            <div className="mt-4 flex items-center gap-2 text-xs font-semibold text-[#3b3a36]">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              <span>Official European Tokenized Real Estate Register · 100% Ring-fenced SPVs</span>
            </div>

            {/* Action Buttons */}
            <div className="mt-7 flex flex-wrap items-center gap-3.5">
              <button
                type="button"
                onClick={() => onNavigate('/properties')}
                className="inline-flex items-center gap-2.5 rounded-full bg-[#213138] px-7 py-3.5 text-xs font-bold tracking-widest uppercase text-white shadow-lg shadow-[#213138]/20 transition-all duration-200 hover:bg-[#18252b] hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
              >
                <span>Browse Landmarks</span>
                <ArrowRight className="h-4 w-4 text-[#c59b4c]" />
              </button>

              <button
                type="button"
                onClick={() => onNavigate('/how-it-works')}
                className="rounded-full bg-white/90 border border-[#d9cfc2] px-6 py-3.5 text-xs font-bold tracking-widest uppercase text-[#213138] shadow-xs backdrop-blur-md transition-all duration-200 hover:bg-white hover:border-[#213138] cursor-pointer"
              >
                How It Works
              </button>
            </div>
          </div>

          {/* Floating Alive Thick Glassmorphism Metric Card matching IMG_7664.jpeg */}
          <div className="relative mt-8 sm:mt-12 w-full max-w-3xl">
            {/* Alive Animated Background Tone Aura */}
            <div className="absolute -inset-2.5 sm:-inset-4 rounded-[36px] bg-gradient-to-r from-[#e8a855]/35 via-[#f5d8a8]/25 to-[#10b981]/25 blur-2xl opacity-80 anim-tone-warm pointer-events-none" />

            <div className="relative glass-thick-stat rounded-[28px] sm:rounded-[32px] p-6 sm:p-9 border border-white/95">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-7 gap-x-10 sm:gap-x-14">
                {/* 1: Total Tokenized */}
                <div className="space-y-1">
                  <p className="text-[11px] sm:text-xs font-bold uppercase tracking-[0.14em] text-[#6E747B]">
                    TOTAL TOKENIZED
                  </p>
                  <p className="text-3xl sm:text-4xl lg:text-[2.6rem] font-black tracking-[-0.03em] text-[#141C1E] font-heading leading-tight">
                    €48,250,000
                  </p>
                  <p className="text-xs sm:text-sm font-semibold text-[#0E7A6B] pt-0.5 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#0E7A6B] animate-pulse" />
                    <span>100% Ring-fenced SPVs</span>
                  </p>
                </div>

                {/* 2: Target Net Yield */}
                <div className="space-y-1">
                  <p className="text-[11px] sm:text-xs font-bold uppercase tracking-[0.14em] text-[#6E747B]">
                    TARGET NET YIELD
                  </p>
                  <p className="text-3xl sm:text-4xl lg:text-[2.6rem] font-black tracking-[-0.03em] text-[#B88746] font-heading leading-tight">
                    9.4% – 12.8%
                  </p>
                  <p className="text-xs sm:text-sm font-normal text-[#6E747B] pt-0.5">
                    Monthly cash distributions
                  </p>
                </div>

                {/* 3: Listed Landmarks */}
                <div className="space-y-1">
                  <p className="text-[11px] sm:text-xs font-bold uppercase tracking-[0.14em] text-[#6E747B]">
                    LISTED LANDMARKS
                  </p>
                  <p className="text-3xl sm:text-4xl lg:text-[2.6rem] font-black tracking-[-0.03em] text-[#141C1E] font-heading leading-tight">
                    {listedBuildingsCount} Buildings
                  </p>
                  <p className="text-xs sm:text-sm font-semibold text-[#0E7A6B] pt-0.5">
                    Paris, Riviera &amp; Madrid
                  </p>
                </div>

                {/* 4: Next Distribution */}
                <div className="space-y-1">
                  <p className="text-[11px] sm:text-xs font-bold uppercase tracking-[0.14em] text-[#6E747B]">
                    NEXT DISTRIBUTION
                  </p>
                  <p className="text-3xl sm:text-4xl lg:text-[2.6rem] font-black tracking-[-0.03em] text-[#141C1E] font-heading leading-tight">
                    1st of Month
                  </p>
                  <p className="text-xs sm:text-sm font-normal text-[#6E747B] pt-0.5">
                    Automated smart payouts
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Companies & Institutional Partners Logo Bar */}
      <section className="bg-[#11191B] text-white py-9 border-y border-[#222E32] relative overflow-hidden shadow-inner">
        <div className="mx-auto max-w-container px-gutter md:px-gutter-md lg:px-gutter-lg flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="shrink-0 text-center md:text-left space-y-0.5">
            <span className="text-[10px] font-mono font-bold uppercase tracking-[0.22em] text-[#C59B4C] block">
              INSTITUTIONAL TRUST &amp; COVERAGE
            </span>
            <span className="text-xs text-slate-400 font-medium">Fully notarized SPVs &amp; audited landmark custody</span>
          </div>

          <div className="flex flex-wrap items-center justify-center md:justify-end gap-7 sm:gap-11 opacity-85 hover:opacity-100 transition-opacity duration-300">
            {/* Financial Times */}
            <div className="flex items-center gap-1.5 font-serif font-black tracking-tight text-base sm:text-lg text-[#F4D9B0]">
              <span className="bg-[#F4D9B0] text-[#11191B] text-[10px] font-mono font-bold px-1 py-0.5 rounded-xs">FT</span>
              <span>FINANCIAL TIMES</span>
            </div>

            {/* Bloomberg */}
            <div className="flex items-center font-sans font-extrabold tracking-tighter text-base sm:text-lg text-white">
              <span>Bloomberg</span>
            </div>

            {/* Les Echos */}
            <div className="flex items-center font-heading font-bold uppercase tracking-widest text-xs sm:text-sm text-slate-300">
              <span>LES ECHOS</span>
            </div>

            {/* Le Figaro */}
            <div className="flex items-center font-serif italic font-semibold text-base sm:text-lg text-[#F4D9B0]">
              <span>Le Figaro</span>
            </div>

            {/* BNP Paribas */}
            <div className="flex items-center gap-2 font-sans font-bold text-xs uppercase tracking-wider text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>BNP PARIBAS REAL ESTATE</span>
            </div>

            {/* KPMG */}
            <div className="flex items-center font-mono font-black tracking-widest text-sm text-sky-400">
              <span>KPMG</span>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Section: Live Landmark Yield Simulator - Thick & Alive with Animating Background Tone */}
      <section className="bg-[#FAF8F5] py-20 sm:py-24 border-t border-[#E5DFD5] relative overflow-hidden">
        {/* Ambient background alive tone across entire section */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[720px] h-[520px] bg-gradient-to-tr from-[#c59b4c]/15 via-[#10b981]/10 to-[#3b82f6]/10 rounded-full blur-[110px] pointer-events-none anim-tone-calc" />

        <div className="mx-auto max-w-container px-gutter md:px-gutter-md lg:px-gutter-lg relative z-10">
          <div className="relative">
            {/* Animated Glowing Aura Border Frame */}
            <div className="absolute -inset-1.5 sm:-inset-2.5 rounded-[36px] bg-gradient-to-r from-[#c59b4c]/40 via-emerald-500/30 to-[#3b82f6]/30 blur-xl opacity-75 anim-tone-calc pointer-events-none" />

            {/* Thick Obsidian Glass Container */}
            <div className="relative glass-thick-calc text-white rounded-[32px] p-7 sm:p-12 border border-[#243448] shadow-2xl">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
                {/* Left Column: Interactive Controls */}
                <div className="lg:col-span-7 space-y-7">
                  <div>
                    <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#c59b4c]/20 border border-[#c59b4c]/40 text-[#e0ab62] text-xs font-bold uppercase tracking-wider mb-3">
                      <span className="w-2 h-2 rounded-full bg-[#c59b4c] animate-ping" />
                      <Calculator className="w-3.5 h-3.5" />
                      <span>Live Return &amp; Yield Simulator</span>
                    </div>
                    <h3 className="text-2xl sm:text-3xl lg:text-4xl font-heading font-extrabold text-white tracking-tight leading-tight">
                      Calculate Your Monthly Passive Rental Yield
                    </h3>
                    <p className="text-sm sm:text-base text-slate-300 mt-2.5 leading-relaxed font-sans">
                      Select your investment into prime European landmark properties. Dividends are funded directly by tenant rents and credited to your investor treasury on the 1st of every month.
                    </p>
                  </div>

                  {/* Amount Interactive Slider & Value Display */}
                  <div className="space-y-4 bg-[#080d15]/80 rounded-2xl p-5 border border-slate-800/80">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Investment Capital</span>
                      <span className="font-mono text-2xl sm:text-3xl font-black text-white tracking-tight">
                        {formatCurrency(simulatorAmount)}
                      </span>
                    </div>

                    <div className="relative py-2">
                      <input
                        type="range"
                        min="500"
                        max="100000"
                        step="500"
                        value={simulatorAmount}
                        onChange={(e) => setSimulatorAmount(Number(e.target.value))}
                        className="w-full h-3 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-[#c59b4c]"
                      />
                    </div>

                    {/* Quick Amount Selector Pills */}
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      {[1000, 5000, 10000, 25000, 50000, 100000].map((amt) => (
                        <button
                          key={amt}
                          type="button"
                          onClick={() => setSimulatorAmount(amt)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${
                            simulatorAmount === amt
                              ? 'bg-gradient-to-r from-[#c59b4c] to-[#d6a15d] text-[#090e17] shadow-md shadow-[#c59b4c]/30 scale-105'
                              : 'bg-slate-800/90 text-slate-300 hover:bg-slate-700/90 hover:text-white border border-slate-700/70'
                          }`}
                        >
                          €{amt.toLocaleString()}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Institutional Assurance Badges */}
                  <div className="grid grid-cols-2 gap-4 text-xs font-medium text-slate-300">
                    <div className="flex items-center gap-2.5 bg-slate-900/60 p-3 rounded-xl border border-slate-800/60">
                      <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>French Notarized Deed SPV</span>
                    </div>
                    <div className="flex items-center gap-2.5 bg-slate-900/60 p-3 rounded-xl border border-slate-800/60">
                      <Coins className="w-4 h-4 text-[#c59b4c] shrink-0" />
                      <span>Automated 1st-of-Month Payouts</span>
                    </div>
                  </div>
                </div>

                {/* Right Column: Calculated Yield Card (Thick Elevated Glass) */}
                <div className="lg:col-span-5 bg-gradient-to-b from-[#111c2a] to-[#080d15] border border-[#293d54] rounded-[24px] p-6 sm:p-8 space-y-6 text-left shadow-2xl relative overflow-hidden">
                  {/* Subtle Corner Amber Accent Glow */}
                  <div className="absolute top-0 right-0 w-36 h-36 bg-[#c59b4c]/15 rounded-full blur-2xl pointer-events-none" />

                  <div className="border-b border-slate-800/90 pb-5">
                    <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      <span>Projected Monthly Dividend</span>
                      <span className="flex items-center gap-1 text-emerald-400 text-[10px] font-semibold bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-800/40">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        Next: 1st of Month
                      </span>
                    </div>
                    <p className="text-3xl sm:text-4xl lg:text-5xl font-black font-mono text-emerald-400 mt-2 tracking-tight">
                      €{monthlyRentalPayout.toLocaleString()}{' '}
                      <span className="text-sm font-sans font-medium text-slate-400">/ mo</span>
                    </p>
                    <p className="text-xs text-slate-400 mt-1.5">Directly deposited to your linked bank or treasury</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div className="bg-slate-900/80 p-3.5 rounded-xl border border-slate-800/70">
                      <span className="text-slate-400 block font-medium">Annual Cash Return</span>
                      <span className="font-mono text-xl font-black text-white mt-1 block">
                        €{annualRentalPayout.toLocaleString()}
                      </span>
                      <span className="text-[10px] text-emerald-400 font-semibold">{estimatedYieldPct}% Net APY</span>
                    </div>
                    <div className="bg-slate-900/80 p-3.5 rounded-xl border border-slate-800/70">
                      <span className="text-slate-400 block font-medium">SPV Token Units</span>
                      <span className="font-mono text-xl font-black text-[#c59b4c] mt-1 block">
                        {estimatedTokenUnits} Units
                      </span>
                      <span className="text-[10px] text-slate-400">€100 / unit par</span>
                    </div>
                  </div>

                  <div className="bg-[#c59b4c]/10 border border-[#c59b4c]/30 rounded-xl p-3.5 flex items-center justify-between text-xs text-slate-200">
                    <span className="font-medium">5-Year Est. Yield + Appreciation</span>
                    <span className="font-mono font-bold text-[#e0ab62] text-sm">
                      €{Math.round(simulatorAmount * (1 + (estimatedYieldPct / 100) * 5 + 0.18)).toLocaleString()}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => onNavigate('/properties')}
                    className="w-full py-4 px-6 rounded-xl bg-gradient-to-r from-[#c59b4c] via-[#d6a15d] to-[#c59b4c] hover:brightness-110 text-[#090e17] font-extrabold text-xs uppercase tracking-widest flex items-center justify-center gap-2.5 transition-all cursor-pointer shadow-xl shadow-[#c59b4c]/20 hover:scale-[1.01] active:scale-[0.99]"
                  >
                    <span>Invest in Landmarks</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section 2: Sticky Dark Philosophy & Live Counters */}
      <div className="s2-spacer" data-nav-dark="true" />
      <div className="s2-wrapper" data-nav-dark="true">
        <section className="s2-section" aria-label="Platform thesis and key metrics">
          <div className="s2-content mx-auto max-w-container px-gutter md:px-gutter-md lg:px-gutter-lg">
            <div className="s2-inner">
              <KrezReveal>
                <p className="s2-statement">
                  Prime real estate has always
                  <br />
                  been reserved for the few.
                  <br />
                  We divide landmark buildings into
                  <br />
                  shares that anyone can hold.
                </p>
              </KrezReveal>

              <div className="s2-stats-row">
                <AnimatedStat target={180} suffix="+" label="Active Investors" />
                <AnimatedStat target={listedBuildingsCount} label="Listed Buildings" />
                <AnimatedStat target={96} suffix="%" label="Average Occupancy" />
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Section 3: Overlapping Expanding Architectural Gallery & Typography Ticker */}
      <section
        className="s3-gallery-section"
        data-nav-dark="true"
        aria-label="Architectural portfolio gallery"
      >
        <div className="s3-ticker-wrap" aria-hidden="true">
          <div className="ticker-track">
            {Array.from({ length: 16 }).map((_, idx) => (
              <span key={idx}>L&apos;Agence.</span>
            ))}
          </div>
        </div>

        <div className="s3-gallery-content">
          <div className="gallery-expand-row">
            {KREZ_GALLERY_ITEMS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onNavigate(item.to)}
                aria-label={`View property — ${item.alt}`}
                className="gallery-expand-item relative block border-0 p-0 text-left focus:outline-none cursor-pointer"
              >
                <KrezImage
                  src={item.image}
                  alt={item.alt}
                  className="h-full w-full object-cover"
                />
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Section 4: Investor Journal — Latest Updates */}
      <section className="bg-[#F4F1EA] border-t border-[#E5E0D4] py-section-sm md:py-section-spacing">
        <div className="mx-auto max-w-container px-gutter md:px-gutter-md lg:px-gutter-lg">
          <KrezReveal>
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
              <div>
                <p className="text-xs font-semibold tracking-widest uppercase text-accent">
                  Investor journal
                </p>
                <h2 className="mt-3 text-3xl font-heading font-bold tracking-tight uppercase text-foreground md:text-4xl">
                  Latest updates
                </h2>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('/journal')}
                className="inline-flex items-center gap-2 self-start text-xs font-semibold tracking-widest uppercase text-foreground transition-colors duration-fast hover:text-accent md:self-auto cursor-pointer"
              >
                <span>All updates</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </KrezReveal>

          <div className="mt-10 grid gap-gutter md:grid-cols-3 md:gap-gutter-md">
            {journalPosts.map((post, idx) => (
              <KrezReveal key={post.id} delay={idx * 0.06}>
                <article className="flex h-full flex-col justify-between rounded-card border border-[#D9CFC2] bg-white p-card-pad shadow-2xs transition-transform duration-base hover:-translate-y-hover-lift">
                  <div>
                    <div className="flex items-center justify-between gap-2 text-xs text-muted">
                      <span className="font-semibold tracking-widest uppercase text-accent">
                        {post.category}
                      </span>
                      <span>{formatJournalDate(post.publishedDate)}</span>
                    </div>
                    <h3 className="mt-4 text-lg font-heading font-semibold leading-snug text-foreground">
                      {post.title}
                    </h3>
                    <p className="mt-3 text-sm leading-relaxed text-muted">
                      {post.summary}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => onNavigate('/journal')}
                    className="mt-6 inline-flex items-center gap-1.5 text-xs font-semibold tracking-widest uppercase text-foreground transition-colors duration-fast hover:text-accent cursor-pointer"
                  >
                    <span>Read update</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </article>
              </KrezReveal>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
};
