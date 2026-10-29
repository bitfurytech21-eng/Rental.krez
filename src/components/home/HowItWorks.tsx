import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import {
  Wallet,
  Search,
  FileCheck,
  Coins,
  PieChart,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  Pause,
  Play,
  ArrowRight,
} from 'lucide-react';

interface HowItWorksProps {
  onExploreMarketplace?: () => void;
  onLearnMore?: () => void;
}

interface TokenizationStep {
  step: string;
  icon: React.ElementType;
  phaseLabel: string;
  title: string;
  desc: string;
  architectureSummary: string;
  deliverables: [string, string, string];
}

export const HowItWorks: React.FC<HowItWorksProps> = ({
  onExploreMarketplace,
  onLearnMore,
}) => {
  const prefersReducedMotion = useReducedMotion();
  const [activeIdx, setActiveIdx] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const [isHovered, setIsHovered] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  const steps: TokenizationStep[] = [
    {
      step: '01',
      icon: Wallet,
      phaseLabel: 'Identity & Wallet Connection',
      title: 'Verify Identity & Connect Solana Wallet',
      desc: 'Complete European KYC compliance in minutes and connect your self-custodial Solana wallet (Phantom, Solflare, or Backpack) or custodial platform account.',
      architectureSummary:
        'Whitelisted investor credentials map your verified legal identity to your Solana public address for compliant SPV share registration.',
      deliverables: [
        'EU AML / KYC investor verification',
        'Non-custodial Solana wallet or EUR account pairing',
        'Whitelisted SPL token eligibility',
      ],
    },
    {
      step: '02',
      icon: Search,
      phaseLabel: 'RICS Appraisal & Structuring',
      title: 'Property Tokenization & SPV Ring-Fencing',
      desc: 'Prime European properties undergo certified RICS valuation and are titled inside an isolated, debt-free Special Purpose Vehicle before fractional tokens are structured.',
      architectureSummary:
        'Each property deed is recorded in an independent European SPV whose equity shares correspond 1:1 with the fixed token supply.',
      deliverables: [
        'Independent RICS valuation & technical audit',
        'Dedicated ring-fenced European SPV incorporation',
        'Fixed-supply SPL token schedule mapped to SPV shares',
      ],
    },
    {
      step: '03',
      icon: FileCheck,
      phaseLabel: 'Legal & Cadastral Review',
      title: 'Inspect Cadastral Deeds & Lease Schedules',
      desc: 'Review notarized title deeds, municipal permits, sensitivity stress tests, and commercial or residential lease agreements directly inside the offering data room.',
      architectureSummary:
        'Full documentary parity ensures every prospective token holder inspects the exact legal instruments governing the underlying real estate.',
      deliverables: [
        'Verified cadastral & mercantile registry extracts',
        'Base, downside, and vacancy stress-test models',
        'Audited operating reserve & fee disclosures',
      ],
    },
    {
      step: '04',
      icon: Coins,
      phaseLabel: 'Fractional Token Acquisition',
      title: 'Acquire Property Tokens from €750',
      desc: 'Subscribe to fractional ownership units seamlessly using SEPA EUR bank transfers, payment cards, or verified Solana settlements with instant cost-basis calculation.',
      architectureSummary:
        'Subscription allocations update the SPV cap table and mint or assign your fractional property tokens with verifiable ledger receipts.',
      deliverables: [
        'Entry ticket starting from €750',
        'SEPA EUR wire, card, or Solana wallet execution',
        'Immediate digital subscription agreement & receipt',
      ],
    },
    {
      step: '05',
      icon: PieChart,
      phaseLabel: 'Ownership & Yield Settlement',
      title: 'Recorded Ownership & Monthly Distributions',
      desc: 'Your ownership stake is recorded in both the SPV registry and token ledger, entitling you to pro-rata net rental distributions credited every month.',
      architectureSummary:
        'Net rental income after property management and reserve provisions is distributed pro-rata to verified holders with downloadable tax statements.',
      deliverables: [
        'Dual SPV share registry & on-chain record',
        'Automated monthly net rental income payouts',
        'Annual fiscal & distribution reconciliation reports',
      ],
    },
    {
      step: '06',
      icon: ShieldCheck,
      phaseLabel: 'Verification & Liquidity Exit',
      title: 'Audit Verification, P2P Liquidity & Maturity Exit',
      desc: 'Verify historical ledger settlements at any time, exchange tokens with whitelisted investors via the secondary desk, or receive principal plus capital gain upon SPV sale.',
      architectureSummary:
        'Every transfer and maturity liquidation follows notarized SPV governance rules so ownership records and payouts remain auditable end-to-end.',
      deliverables: [
        'Verifiable transaction & Solana mint references',
        'Whitelisted peer-to-peer secondary bulletin board',
        'Notarized SPV liquidation & capital gain payout',
      ],
    },
  ];

  const currentStep = steps[activeIdx] || steps[0];
  const ActiveIcon = currentStep.icon;

  const goNext = useCallback(() => {
    setActiveIdx((prev) => (prev + 1) % steps.length);
  }, [steps.length]);

  const goPrev = useCallback(() => {
    setActiveIdx((prev) => (prev - 1 + steps.length) % steps.length);
  }, [steps.length]);

  useEffect(() => {
    if (prefersReducedMotion || !isAutoPlaying || isHovered || isFocused) return;
    const timer = window.setInterval(goNext, 6000);
    return () => window.clearInterval(timer);
  }, [prefersReducedMotion, isAutoPlaying, isHovered, isFocused, goNext]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      goPrev();
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      goNext();
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = e.changedTouches[0].clientY - touchStartY.current;
    if (Math.abs(dx) > 44 && Math.abs(dx) > Math.abs(dy)) {
      if (dx < 0) goNext();
      else goPrev();
    }
    touchStartX.current = null;
    touchStartY.current = null;
  };

  return (
    <section
      id="how-it-works"
      aria-roledescription="carousel"
      aria-label="How Property Tokenization Works"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onFocusCapture={() => setIsFocused(true)}
      onBlurCapture={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
          setIsFocused(false);
        }
      }}
      onKeyDown={handleKeyDown}
      className="relative py-20 sm:py-28 bg-[#0B1B30] text-white border-b border-[#1A3358] overflow-hidden"
    >
      {/* Restrained Blockchain-Inspired Decorative Node & Connection Line SVG Background */}
      <style>{`
        @keyframes nodeFloatSlow {
          0%, 100% { transform: translate3d(0px, 0px, 0); opacity: 0.32; }
          50% { transform: translate3d(14px, -12px, 0); opacity: 0.58; }
        }
        @keyframes nodeFloatReverse {
          0%, 100% { transform: translate3d(0px, 0px, 0); opacity: 0.25; }
          50% { transform: translate3d(-16px, 10px, 0); opacity: 0.5; }
        }
        .token-network-drift-a {
          animation: nodeFloatSlow 24s ease-in-out infinite;
          will-change: transform, opacity;
        }
        .token-network-drift-b {
          animation: nodeFloatReverse 28s ease-in-out infinite;
          will-change: transform, opacity;
        }
        @media (prefers-reduced-motion: reduce) {
          .token-network-drift-a,
          .token-network-drift-b {
            animation: none !important;
            transform: none !important;
          }
        }
      `}</style>

      <div
        className="absolute inset-0 pointer-events-none select-none overflow-hidden"
        aria-hidden="true"
      >
        <svg
          viewBox="0 0 1440 900"
          fill="none"
          className="w-full h-full opacity-25"
          preserveAspectRatio="xMidYMid slice"
        >
          <g className="token-network-drift-a" stroke="#284B7A" strokeWidth="1">
            <line x1="120" y1="180" x2="380" y2="120" strokeDasharray="4 6" />
            <line x1="380" y1="120" x2="660" y2="230" />
            <line x1="660" y1="230" x2="1020" y2="150" strokeDasharray="3 5" />
            <line x1="1020" y1="150" x2="1310" y2="260" />
            <circle cx="120" cy="180" r="4" fill="#BEE179" fillOpacity="0.55" stroke="none" />
            <circle cx="380" cy="120" r="3.5" fill="#8EA7C7" fillOpacity="0.5" stroke="none" />
            <circle cx="660" cy="230" r="4.5" fill="#BEE179" fillOpacity="0.45" stroke="none" />
            <circle cx="1020" cy="150" r="3.5" fill="#8EA7C7" fillOpacity="0.5" stroke="none" />
            <circle cx="1310" cy="260" r="4" fill="#BEE179" fillOpacity="0.5" stroke="none" />
          </g>

          <g className="token-network-drift-b" stroke="#1F3E6C" strokeWidth="1">
            <line x1="180" y1="720" x2="490" y2="640" />
            <line x1="490" y1="640" x2="830" y2="740" strokeDasharray="5 6" />
            <line x1="830" y1="740" x2="1220" y2="630" />
            <circle cx="180" cy="720" r="3.5" fill="#8EA7C7" fillOpacity="0.45" stroke="none" />
            <circle cx="490" cy="640" r="4" fill="#BEE179" fillOpacity="0.45" stroke="none" />
            <circle cx="830" cy="740" r="3.5" fill="#8EA7C7" fillOpacity="0.45" stroke="none" />
            <circle cx="1220" cy="630" r="4.5" fill="#BEE179" fillOpacity="0.5" stroke="none" />
          </g>
        </svg>
      </div>

      <div className="container max-w-[1240px] mx-auto px-4 sm:px-6 relative z-10">
        {/* Section Heading */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-12 text-left">
          <div className="max-w-2xl space-y-3">
            <p className="text-xs font-extrabold text-[#BEE179] tracking-wider">
              Operational Lifecycle · From Appraisal to On-Chain Ownership
            </p>
            <h2
              className="font-serif text-3xl sm:text-4xl lg:text-[2.75rem] font-black text-white tracking-tight leading-[1.12]"
              style={{ textWrap: 'balance' }}
            >
              How Real Estate <span className="text-[#BEE179]">Tokenization Works</span>
            </h2>
            <p className="text-sm sm:text-base text-[#D1E2F7] font-medium leading-relaxed">
              L'Agence oversees acquisition, SPV titling, property management, and tenant leasing while investors hold direct ring-fenced economic shares recorded on Solana.
            </p>
          </div>

          {/* Sequence Controls */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setIsAutoPlaying((prev) => !prev)}
              aria-label={isAutoPlaying ? 'Pause tokenization walkthrough' : 'Play tokenization walkthrough'}
              aria-pressed={!isAutoPlaying}
              className="w-10 h-10 rounded-xl bg-[#102442] hover:bg-[#173158] border border-[#1D3860] text-[#D1E2F7] hover:text-white flex items-center justify-center transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#BEE179]"
            >
              {isAutoPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </button>
            <button
              type="button"
              onClick={goPrev}
              aria-label="Previous tokenization step"
              className="w-10 h-10 rounded-xl bg-[#102442] hover:bg-[#173158] border border-[#1D3860] text-[#D1E2F7] hover:text-white flex items-center justify-center transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#BEE179]"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-2 text-xs font-mono tabular-nums text-[#8EA7C7]">
              Step {currentStep.step} / 06
            </span>
            <button
              type="button"
              onClick={goNext}
              aria-label="Next tokenization step"
              className="w-10 h-10 rounded-xl bg-[#102442] hover:bg-[#173158] border border-[#1D3860] text-[#D1E2F7] hover:text-white flex items-center justify-center transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#BEE179]"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Interactive Visual Sequence Stage */}
        <div
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          className="bg-[#102442] rounded-2xl border border-[#1D3860] p-6 sm:p-10 mb-8 shadow-lg"
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep.step}
              initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
              animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
              exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: -6 }}
              transition={{ duration: prefersReducedMotion ? 0.15 : 0.32, ease: [0.16, 1, 0.3, 1] }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center text-left"
            >
              {/* Left 7 Columns: Step Narrative & Deliverables */}
              <div className="lg:col-span-7 space-y-5">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-[#BEE179] text-[#0B1B30] flex items-center justify-center shrink-0">
                    <ActiveIcon className="w-5 h-5 stroke-[2.5]" />
                  </div>
                  <div className="text-xs text-[#8EA7C7] font-medium">
                    <span className="font-mono tabular-nums font-bold text-[#BEE179]">
                      Phase {currentStep.step}
                    </span>
                    <span className="mx-2" aria-hidden="true">
                      ·
                    </span>
                    <span className="text-white font-semibold">{currentStep.phaseLabel}</span>
                  </div>
                </div>

                <h3 className="font-serif text-2xl sm:text-3xl font-bold text-white leading-tight">
                  {currentStep.step}. {currentStep.title}
                </h3>

                <p className="text-sm sm:text-base text-[#D1E2F7] leading-relaxed">
                  {currentStep.desc}
                </p>

                <div className="pt-3 border-t border-[#1D3860] grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {currentStep.deliverables.map((item) => (
                    <div key={item} className="text-xs text-[#D1E2F7] leading-snug">
                      <span className="block font-mono text-[11px] text-[#BEE179] font-bold mb-0.5">
                        Verified Safeguard
                      </span>
                      <span>{item}</span>
                    </div>
                  ))}
                </div>

                {(onExploreMarketplace || onLearnMore) && (
                  <div className="pt-2 flex flex-wrap items-center gap-3">
                    {onExploreMarketplace && (
                      <button
                        type="button"
                        onClick={onExploreMarketplace}
                        className="px-5 py-2.5 rounded-xl bg-[#BEE179] hover:bg-[#AEDB5B] text-[#0B1B30] text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
                      >
                        <span>Explore Tokenized Properties</span>
                        <ArrowRight className="w-3.5 h-3.5 text-[#0B1B30]" />
                      </button>
                    )}
                    {onLearnMore && (
                      <button
                        type="button"
                        onClick={onLearnMore}
                        className="px-5 py-2.5 rounded-xl bg-[#0B1B30] hover:bg-[#152C4E] border border-[#1D3860] text-white text-xs font-bold transition-colors cursor-pointer whitespace-nowrap"
                      >
                        <span>Full Legal & SPV Guide</span>
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Right 5 Columns: Architectural Flow Diagram */}
              <div className="lg:col-span-5 bg-[#0B1B30] rounded-xl border border-[#1D3860] p-6 space-y-5">
                <div className="flex items-center justify-between text-xs text-[#8EA7C7]">
                  <span className="font-semibold text-white">Architecture Sequence</span>
                  <span className="font-mono tabular-nums text-[#BEE179]">
                    {currentStep.step} of 06
                  </span>
                </div>

                {/* Visual Pipeline Diagram */}
                <svg
                  viewBox="0 0 380 150"
                  className="w-full h-auto"
                  role="img"
                  aria-label={`Diagram illustrating step ${currentStep.step}: ${currentStep.phaseLabel}`}
                >
                  {/* Connecting Track */}
                  <line
                    x1="55"
                    y1="62"
                    x2="325"
                    y2="62"
                    stroke="#1D3860"
                    strokeWidth="2"
                  />
                  <line
                    x1="55"
                    y1="62"
                    x2={55 + (activeIdx / (steps.length - 1)) * 270}
                    y2="62"
                    stroke="#BEE179"
                    strokeWidth="2.5"
                  />

                  {/* Node 1: Investor & Wallet */}
                  <g transform="translate(55, 62)">
                    <circle
                      r="24"
                      fill={activeIdx >= 0 ? '#132B4C' : '#0B1B30'}
                      stroke={activeIdx === 0 || activeIdx === 3 ? '#BEE179' : '#2B4C7E'}
                      strokeWidth="2"
                    />
                    <text
                      y="4"
                      textAnchor="middle"
                      fill="#FFFFFF"
                      fontSize="10"
                      fontFamily="monospace"
                      fontWeight="700"
                    >
                      WALLET
                    </text>
                    <text
                      y="44"
                      textAnchor="middle"
                      fill="#8EA7C7"
                      fontSize="9.5"
                    >
                      KYC & Solana
                    </text>
                  </g>

                  {/* Node 2: Ring-Fenced SPV Deed */}
                  <g transform="translate(190, 62)">
                    <circle
                      r="26"
                      fill={activeIdx >= 1 ? '#132B4C' : '#0B1B30'}
                      stroke={activeIdx === 1 || activeIdx === 2 ? '#BEE179' : '#2B4C7E'}
                      strokeWidth="2"
                    />
                    <text
                      y="4"
                      textAnchor="middle"
                      fill="#BEE179"
                      fontSize="10"
                      fontFamily="monospace"
                      fontWeight="700"
                    >
                      SPV DEED
                    </text>
                    <text
                      y="44"
                      textAnchor="middle"
                      fill="#8EA7C7"
                      fontSize="9.5"
                    >
                      Notarial Title
                    </text>
                  </g>

                  {/* Node 3: SPL Token & Yield */}
                  <g transform="translate(325, 62)">
                    <circle
                      r="24"
                      fill={activeIdx >= 4 ? '#132B4C' : '#0B1B30'}
                      stroke={activeIdx >= 4 ? '#BEE179' : '#2B4C7E'}
                      strokeWidth="2"
                    />
                    <text
                      y="4"
                      textAnchor="middle"
                      fill="#FFFFFF"
                      fontSize="10"
                      fontFamily="monospace"
                      fontWeight="700"
                    >
                      SPL YIELD
                    </text>
                    <text
                      y="44"
                      textAnchor="middle"
                      fill="#8EA7C7"
                      fontSize="9.5"
                    >
                      Monthly Rent
                    </text>
                  </g>
                </svg>

                <p className="text-xs text-[#8EA7C7] leading-relaxed border-t border-[#1D3860] pt-3.5">
                  {currentStep.architectureSummary}
                </p>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* All 6 Steps Interactive Selector Grid (Preserves Immediate Scannability) */}
        <div
          role="tablist"
          aria-label="Select tokenization lifecycle step"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3.5"
        >
          {steps.map((s, idx) => {
            const Icon = s.icon;
            const isSelected = idx === activeIdx;
            return (
              <button
                key={s.step}
                type="button"
                role="tab"
                aria-selected={isSelected}
                onClick={() => setActiveIdx(idx)}
                className={`p-4 rounded-xl border text-left transition-all duration-200 cursor-pointer flex flex-col justify-between gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#BEE179] ${
                  isSelected
                    ? 'bg-[#152E54] border-[#BEE179] shadow-md'
                    : 'bg-[#102442] border-[#1D3860] hover:border-[#355A8F]'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                      isSelected
                        ? 'bg-[#BEE179] text-[#0B1B30]'
                        : 'bg-[#0B1B30] text-[#BEE179] border border-[#1D3860]'
                    }`}
                  >
                    <Icon className="w-4 h-4 stroke-[2.25]" />
                  </div>
                  <span
                    className={`font-mono tabular-nums text-sm font-black ${
                      isSelected ? 'text-[#BEE179]' : 'text-[#6484B0]'
                    }`}
                  >
                    {s.step}
                  </span>
                </div>
                <div>
                  <div className="font-serif text-sm font-bold text-white leading-snug line-clamp-2">
                    {s.title}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
};
