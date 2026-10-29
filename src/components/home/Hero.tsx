import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import {
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Pause,
  Play,
  MapPin,
} from 'lucide-react';
import { Property } from '../../types/property';
import { formatCurrency } from '../../lib/utils';

import heroEstateImg from '../../assets/images/hero_real_estate_1791998371047.jpg';
import madridImg from '../../assets/images/prop_madrid_living_1791998371897.jpg';
import malagaImg from '../../assets/images/prop_malaga_coastal_1791998372504.jpg';
import miamiImg from '../../assets/images/prop_miami_luxury_1791998372925.jpg';

interface HeroProps {
  onExplore: () => void;
  onHowItWorks: () => void;
  properties?: Property[];
  onSelectProperty?: (property: Property) => void;
}

interface HeroSlide {
  id: string;
  kickerLead: string;
  kickerContext: string;
  headlinePrefix: string;
  headlineHighlight: string;
  description: string;
  primaryCtaLabel: string;
  secondaryCtaLabel: string;
  backdropImage: string;
  fallbackImage: string;
  spotlightImage: string;
  spotlightTitle: string;
  spotlightLocation: string;
  spotlightSubtitle: string;
  property?: Property;
}

export const Hero: React.FC<HeroProps> = ({
  onExplore,
  onHowItWorks,
  properties = [],
  onSelectProperty,
}) => {
  const prefersReducedMotion = useReducedMotion();
  const [activeSlideIdx, setActiveSlideIdx] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const [isHovered, setIsHovered] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  // Filter live approved properties so slides showcase genuine offerings when available
  const liveProperties = useMemo(() => {
    return properties.filter(
      (p) =>
        p.status !== 'hidden' &&
        p.status !== 'pending_approval' &&
        p.approvedForFrontend !== false &&
        Boolean(p.assignedFunction)
    );
  }, [properties]);

  const slides: HeroSlide[] = useMemo(() => {
    const p0 = liveProperties[0];
    const p1 = liveProperties[1] || liveProperties[0];
    const p2 = liveProperties[2] || liveProperties[0];
    const p3 = liveProperties[3] || liveProperties[1] || liveProperties[0];

    return [
      {
        id: 'institutional-governance',
        kickerLead: "L'AGENCE INSTITUTIONAL REAL ESTATE",
        kickerContext: 'Ring-Fenced European SPV Structure',
        headlinePrefix: 'Fractional Real Estate Investment with',
        headlineHighlight: 'Institutional Governance',
        description:
          'Access curated European residential and commercial property offerings. Receive automated monthly rental distributions directly to your account, protected by independent SPV custody and transparent legal documentation.',
        primaryCtaLabel: 'Enter Marketplace',
        secondaryCtaLabel: 'How It Works',
        backdropImage: p0?.bannerImage || p0?.images?.[0] || heroEstateImg,
        fallbackImage: heroEstateImg,
        spotlightImage: p0?.images?.[0] || heroEstateImg,
        spotlightTitle: p0?.title || 'Mediterranean Architectural Portfolio',
        spotlightLocation: p0?.location || 'Côte d’Azur & Prime European Capitals',
        spotlightSubtitle: p0 ? `${p0.type} · ${p0.tokenTicker}` : 'Notarized SPV Custody · RICS Vetted',
        property: p0,
      },
      {
        id: 'urban-residential-yield',
        kickerLead: 'PRIME EUROPEAN CAPITALS',
        kickerContext: 'Audited Rental Cashflows',
        headlinePrefix: 'Acquire Fractional Ownership in',
        headlineHighlight: 'Prime Urban Residences',
        description:
          'Participate in residential apartments, executive coliving buildings, and historic city-center developments across Madrid, Paris, Valencia, and Malaga starting from €750.',
        primaryCtaLabel: p1 ? 'Inspect Featured Residence' : 'Explore Urban Assets',
        secondaryCtaLabel: 'Enter Marketplace',
        backdropImage: p1?.images?.[0] || madridImg,
        fallbackImage: madridImg,
        spotlightImage: p1?.images?.[0] || madridImg,
        spotlightTitle: p1?.title || 'Madrid & Paris Residential Collection',
        spotlightLocation: p1?.location || 'Madrid · Paris · Valencia',
        spotlightSubtitle: p1 ? `${p1.type} · ${p1.tokenTicker}` : 'Monthly Net Rental Settlements',
        property: p1,
      },
      {
        id: 'coastal-commercial-estates',
        kickerLead: 'LUXURY DEVELOPMENTS & COMMERCIAL',
        kickerContext: 'Independent RICS Appraisals',
        headlinePrefix: 'Diversify Across Trophy Villas and',
        headlineHighlight: 'Commercial Developments',
        description:
          'Every property is isolated inside an unencumbered Special Purpose Vehicle with verifiable cadastral deeds, lease agreements, and conservative stress-tested valuations.',
        primaryCtaLabel: p2 ? 'View Property Dossier' : 'Browse Active Offerings',
        secondaryCtaLabel: 'How It Works',
        backdropImage: p2?.images?.[0] || malagaImg,
        fallbackImage: malagaImg,
        spotlightImage: p2?.images?.[0] || malagaImg,
        spotlightTitle: p2?.title || 'Coastal Villas & Commercial Estates',
        spotlightLocation: p2?.location || 'Costa del Sol · Balearics · Riviera',
        spotlightSubtitle: p2 ? `${p2.type} · ${p2.tokenTicker}` : 'Segregated SPV Balance Sheets',
        property: p2,
      },
      {
        id: 'solana-tokenized-custody',
        kickerLead: 'SOLANA SPL OWNERSHIP REGISTRY',
        kickerContext: 'Direct Secondary Liquidity Desk',
        headlinePrefix: 'Verifiable Tokenized Shares with',
        headlineHighlight: 'On-Chain Transparency',
        description:
          'Combine legal European SPV share registries with programmable Solana token records—enabling transparent ownership verification, automated dividend accounting, and peer-to-peer transfers.',
        primaryCtaLabel: 'Explore Tokenized Offerings',
        secondaryCtaLabel: 'Review Token Mechanics',
        backdropImage: p3?.images?.[0] || miamiImg,
        fallbackImage: miamiImg,
        spotlightImage: p3?.images?.[0] || miamiImg,
        spotlightTitle: p3?.title || 'Solana Tokenized SPV Registry',
        spotlightLocation: p3?.location || 'European & International Corridors',
        spotlightSubtitle: p3
          ? `${p3.blockchainNetwork || 'Solana Network'} · ${p3.tokenTicker}`
          : 'Programmable SPL Ownership Certificates',
        property: p3,
      },
    ];
  }, [liveProperties]);

  const currentSlide = slides[activeSlideIdx] || slides[0];

  const goToNext = useCallback(() => {
    setActiveSlideIdx((prev) => (prev + 1) % slides.length);
  }, [slides.length]);

  const goToPrev = useCallback(() => {
    setActiveSlideIdx((prev) => (prev - 1 + slides.length) % slides.length);
  }, [slides.length]);

  // Automatic crossfade interval, paused on hover, keyboard focus, manual pause, or reduced motion
  useEffect(() => {
    if (prefersReducedMotion || !isAutoPlaying || isHovered || isFocused || slides.length <= 1) {
      return;
    }
    const timer = window.setInterval(goToNext, 6500);
    return () => window.clearInterval(timer);
  }, [prefersReducedMotion, isAutoPlaying, isHovered, isFocused, slides.length, goToNext]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      goToPrev();
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      goToNext();
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
      if (dx < 0) goToNext();
      else goToPrev();
    }
    touchStartX.current = null;
    touchStartY.current = null;
  };

  const handlePrimaryAction = () => {
    if (
      (currentSlide.id === 'urban-residential-yield' ||
        currentSlide.id === 'coastal-commercial-estates') &&
      currentSlide.property &&
      onSelectProperty
    ) {
      onSelectProperty(currentSlide.property);
      return;
    }
    onExplore();
  };

  const handleSecondaryAction = () => {
    if (currentSlide.id === 'urban-residential-yield') {
      onExplore();
      return;
    }
    onHowItWorks();
  };

  const handleSpotlightClick = () => {
    if (currentSlide.property && onSelectProperty) {
      onSelectProperty(currentSlide.property);
    } else {
      onExplore();
    }
  };

  // Compute genuine property metrics when a live Property record is attached
  const activeProperty = currentSlide.property;
  const fundedPercent = useMemo(() => {
    if (!activeProperty) return null;
    const target = Math.max(1, Number(activeProperty.targetAmount) || 1);
    const funded = Math.max(0, Number(activeProperty.fundedAmount) || 0);
    return Math.min(100, Math.round((funded / target) * 100));
  }, [activeProperty]);

  return (
    <section
      aria-roledescription="carousel"
      aria-label="Featured Real Estate Investment Highlights"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onFocusCapture={() => setIsFocused(true)}
      onBlurCapture={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
          setIsFocused(false);
        }
      }}
      onKeyDown={handleKeyDown}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className="relative bg-[#0B1B30] text-white overflow-hidden border-b border-[#1A3358] pt-10 pb-14 lg:pt-16 lg:pb-20 transition-colors"
    >
      {/* Lightweight Compositor-Only Animated Hero Background */}
      <style>{`
        @keyframes heroAuroraShift {
          0%, 100% { transform: translate3d(0px, 0px, 0) scale(1); opacity: 0.45; }
          50% { transform: translate3d(-24px, 16px, 0) scale(1.08); opacity: 0.68; }
        }
        @keyframes heroParticleFloat {
          0%, 100% { transform: translate3d(0px, 0px, 0); opacity: 0.22; }
          50% { transform: translate3d(10px, -22px, 0); opacity: 0.55; }
        }
        .hero-aurora-layer {
          animation: heroAuroraShift 20s ease-in-out infinite;
          will-change: transform, opacity;
        }
        .hero-particle {
          animation: heroParticleFloat 14s ease-in-out infinite;
          will-change: transform, opacity;
        }
        @media (prefers-reduced-motion: reduce) {
          .hero-aurora-layer,
          .hero-particle {
            animation: none !important;
            transform: none !important;
          }
        }
      `}</style>

      {/* Full-Width Crossfading Architectural Photography Layer */}
      <div className="absolute inset-0 pointer-events-none select-none overflow-hidden" aria-hidden="true">
        <AnimatePresence mode="sync">
          <motion.img
            key={currentSlide.id}
            src={currentSlide.backdropImage}
            alt=""
            loading={activeSlideIdx === 0 ? 'eager' : 'lazy'}
            referrerPolicy="no-referrer"
            onError={(e) => {
              const img = e.currentTarget;
              if (!img.dataset.fallbackApplied) {
                img.dataset.fallbackApplied = 'true';
                img.src = currentSlide.fallbackImage;
              }
            }}
            initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: 1.04 }}
            animate={prefersReducedMotion ? { opacity: 0.28 } : { opacity: 0.28, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: prefersReducedMotion ? 0.2 : 0.9, ease: [0.16, 1, 0.3, 1] }}
            className="absolute inset-0 w-full h-full object-cover object-center"
          />
        </AnimatePresence>

        {/* Measured Directional Contrast Scrims Ensuring >4.5:1 Text Readability */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#0B1B30] via-[#0B1B30]/92 to-[#0B1B30]/72" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0B1B30] via-transparent to-[#0B1B30]/70" />

        {/* Slow-Moving Ambient Gradient Glows */}
        <div
          className="absolute -top-24 left-[18%] w-[560px] h-[420px] rounded-full hero-aurora-layer"
          style={{
            background:
              'radial-gradient(circle, rgba(29, 56, 96, 0.62) 0%, rgba(190, 225, 121, 0.08) 45%, rgba(11, 27, 48, 0) 75%)',
          }}
        />
        <div
          className="absolute bottom-[-80px] right-[10%] w-[480px] h-[380px] rounded-full hero-aurora-layer"
          style={{
            animationDelay: '7s',
            background:
              'radial-gradient(circle, rgba(190, 225, 121, 0.10) 0%, rgba(29, 56, 96, 0.38) 50%, rgba(11, 27, 48, 0) 78%)',
          }}
        />

        {/* Subtle Floating Ambient Micro-Particles */}
        <div className="hidden sm:block absolute top-[24%] right-[34%] w-1.5 h-1.5 rounded-full bg-[#BEE179]/40 hero-particle" />
        <div
          className="hidden sm:block absolute top-[58%] right-[16%] w-2 h-2 rounded-full bg-[#8EA7C7]/35 hero-particle"
          style={{ animationDelay: '4s' }}
        />
        <div
          className="hidden sm:block absolute bottom-[26%] left-[44%] w-1.5 h-1.5 rounded-full bg-[#BEE179]/35 hero-particle"
          style={{ animationDelay: '8s' }}
        />
      </div>

      <div className="container max-w-[1340px] mx-auto px-4 sm:px-6 relative z-10">
        {/* Main 2-Column Editorial Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
          {/* Left Column: Dynamic Slide Proposition & CTAs */}
          <div className="lg:col-span-7 space-y-6 sm:space-y-7 text-left">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentSlide.id}
                initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 10 }}
                animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
                exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: -8 }}
                transition={{ duration: prefersReducedMotion ? 0.15 : 0.38, ease: [0.16, 1, 0.3, 1] }}
                className="space-y-5 sm:space-y-6"
              >
                {/* Clean Unboxed Institutional Kicker */}
                <div className="inline-flex flex-wrap items-center gap-2 text-xs">
                  <ShieldCheck className="w-4 h-4 text-[#BEE179] shrink-0 stroke-[2.5]" />
                  <span className="text-[#BEE179] font-extrabold tracking-wider">
                    {currentSlide.kickerLead}
                  </span>
                  <span className="text-[#6484B0]" aria-hidden="true">
                    ·
                  </span>
                  <span className="text-[#D1E2F7] font-medium">
                    {currentSlide.kickerContext}
                  </span>
                </div>

                {/* Editorial Display Headline */}
                <h1
                  className="font-serif text-3xl sm:text-5xl lg:text-[3.6rem] font-black tracking-tight text-white leading-[1.10]"
                  style={{ textWrap: 'balance' }}
                >
                  {currentSlide.headlinePrefix}{' '}
                  <span className="text-[#BEE179] font-black not-italic">
                    {currentSlide.headlineHighlight}
                  </span>
                </h1>

                {/* Supporting Copy */}
                <p className="text-base sm:text-lg text-[#D1E2F7] leading-relaxed max-w-xl font-medium">
                  {currentSlide.description}
                </p>

                {/* Functional Slide CTAs */}
                <div className="flex flex-wrap items-center gap-3.5 pt-1">
                  <button
                    type="button"
                    onClick={handlePrimaryAction}
                    className="px-7 py-3.5 rounded-xl bg-[#BEE179] hover:bg-[#aed860] text-[#0B1B30] font-black text-sm tracking-wide flex items-center justify-center gap-2 shadow-md transition-all duration-150 cursor-pointer active:scale-[0.98] whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                  >
                    <span>{currentSlide.primaryCtaLabel}</span>
                    <ArrowRight className="w-4 h-4 text-[#0B1B30] stroke-[2.75]" />
                  </button>

                  <button
                    type="button"
                    onClick={handleSecondaryAction}
                    className="px-6 py-3.5 rounded-xl bg-[#132745] hover:bg-[#1A3258] border border-[#2B4C7E] text-white font-bold text-sm flex items-center justify-center gap-2 transition-colors duration-150 cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#BEE179]"
                  >
                    <span>{currentSlide.secondaryCtaLabel}</span>
                    <ArrowRight className="w-4 h-4 text-[#D1E2F7] stroke-[2.25]" />
                  </button>
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Institutional Trust Triad */}
            <div className="pt-5 border-t border-[#1F3E6C] grid grid-cols-1 sm:grid-cols-3 gap-3 text-left text-xs font-bold text-white">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#BEE179] shrink-0 stroke-[2.5]" />
                <span>100% Ring-Fenced SPVs</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#BEE179] shrink-0 stroke-[2.5]" />
                <span>Automated Monthly Yields</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#BEE179] shrink-0 stroke-[2.5]" />
                <span>Secondary Liquidity Desk</span>
              </div>
            </div>
          </div>

          {/* Right Column: Live Synchronized Property Spotlight Card */}
          <div className="lg:col-span-5">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentSlide.id}
                initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, x: 14 }}
                animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, x: 0 }}
                exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, x: -10 }}
                transition={{ duration: prefersReducedMotion ? 0.15 : 0.4, ease: [0.16, 1, 0.3, 1] }}
                onClick={handleSpotlightClick}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleSpotlightClick();
                  }
                }}
                aria-label={`View offering details for ${currentSlide.spotlightTitle}`}
                className="bg-[#102442] rounded-2xl border border-[#1D3860] overflow-hidden shadow-xl hover:border-[#BEE179]/60 transition-colors duration-200 cursor-pointer group text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#BEE179]"
              >
                {/* Fixed Aspect-Ratio Property Photography (Zero CLS) */}
                <div className="relative aspect-[16/11] overflow-hidden bg-[#0A1729]">
                  <img
                    src={currentSlide.spotlightImage}
                    alt={currentSlide.spotlightTitle}
                    loading={activeSlideIdx === 0 ? 'eager' : 'lazy'}
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      const img = e.currentTarget;
                      if (!img.dataset.fallbackApplied) {
                        img.dataset.fallbackApplied = 'true';
                        img.src = currentSlide.fallbackImage;
                      }
                    }}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0B1B30]/90 via-[#0B1B30]/20 to-transparent" />

                  <div className="absolute bottom-3.5 left-4 right-4 flex items-end justify-between gap-3">
                    <div className="flex items-center gap-1.5 text-xs text-white/95 font-medium truncate">
                      <MapPin className="w-3.5 h-3.5 text-[#BEE179] shrink-0" />
                      <span className="truncate">{currentSlide.spotlightLocation}</span>
                    </div>
                    {activeProperty && (
                      <div className="text-right shrink-0">
                        <span className="block text-[10px] text-[#D1E2F7]">Projected Yield</span>
                        <span className="font-mono tabular-nums text-sm font-black text-[#BEE179]">
                          {activeProperty.estimatedAnnualYield}% p.a.
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Spotlight Details Connected to Real Property Data */}
                <div className="p-5 sm:p-6 space-y-3.5 bg-[#102442]">
                  <div>
                    <div className="text-xs text-[#8EA7C7] font-medium truncate">
                      {currentSlide.spotlightSubtitle}
                    </div>
                    <h2 className="font-serif text-lg sm:text-xl font-bold text-white mt-0.5 group-hover:text-[#BEE179] transition-colors line-clamp-1">
                      {currentSlide.spotlightTitle}
                    </h2>
                  </div>

                  {activeProperty ? (
                    <div className="grid grid-cols-3 gap-3 py-3 border-y border-[#1D3860] text-xs font-mono tabular-nums">
                      <div>
                        <span className="text-[#8EA7C7] block text-[11px] font-sans">
                          Capitalization
                        </span>
                        <span className="font-semibold text-white">
                          {formatCurrency(activeProperty.targetAmount)}
                        </span>
                      </div>
                      <div>
                        <span className="text-[#8EA7C7] block text-[11px] font-sans">
                          Token Price
                        </span>
                        <span className="font-semibold text-white">
                          {formatCurrency(activeProperty.tokenPrice)} / unit
                        </span>
                      </div>
                      <div>
                        <span className="text-[#8EA7C7] block text-[11px] font-sans">
                          Subscription
                        </span>
                        <span className="font-bold text-[#BEE179]">{fundedPercent}% Funded</span>
                      </div>
                    </div>
                  ) : (
                    <div className="py-3 border-y border-[#1D3860] text-xs text-[#D1E2F7]">
                      Explore verified European property SPVs with independent RICS appraisals and notarized title deeds.
                    </div>
                  )}

                  <div className="flex items-center justify-between text-xs font-bold text-[#BEE179]">
                    <span>
                      {activeProperty ? 'Open Property Dossier & Token Ledger' : 'Browse Marketplace Offerings'}
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* Discreet Slideshow Navigation Bar (Indicators + Pause/Play + Arrows) */}
        <div className="mt-10 pt-5 border-t border-[#1A3358]/80 flex flex-wrap items-center justify-between gap-4">
          {/* Slide Indicators */}
          <div className="flex items-center gap-2.5" role="tablist" aria-label="Hero slideshow slides">
            {slides.map((slide, idx) => {
              const isActive = idx === activeSlideIdx;
              return (
                <button
                  key={slide.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  aria-label={`Slide ${idx + 1}: ${slide.headlineHighlight}`}
                  onClick={() => setActiveSlideIdx(idx)}
                  className={`h-2 rounded-full transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#BEE179] ${
                    isActive
                      ? 'w-10 bg-[#BEE179]'
                      : 'w-2.5 bg-[#23436D] hover:bg-[#3A649B]'
                  }`}
                />
              );
            })}
            <span className="ml-2 text-xs font-mono tabular-nums text-[#8EA7C7]">
              {String(activeSlideIdx + 1).padStart(2, '0')} / {String(slides.length).padStart(2, '0')}
            </span>
          </div>

          {/* Discreet Prev / Next / Play-Pause Controls (>=40px touch targets) */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsAutoPlaying((prev) => !prev)}
              aria-label={isAutoPlaying ? 'Pause hero slideshow' : 'Play hero slideshow'}
              aria-pressed={!isAutoPlaying}
              className="w-10 h-10 rounded-xl bg-[#102442] hover:bg-[#173158] border border-[#1D3860] text-[#D1E2F7] hover:text-white flex items-center justify-center transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#BEE179]"
            >
              {isAutoPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </button>
            <button
              type="button"
              onClick={goToPrev}
              aria-label="Previous hero slide"
              className="w-10 h-10 rounded-xl bg-[#102442] hover:bg-[#173158] border border-[#1D3860] text-[#D1E2F7] hover:text-white flex items-center justify-center transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#BEE179]"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={goToNext}
              aria-label="Next hero slide"
              className="w-10 h-10 rounded-xl bg-[#102442] hover:bg-[#173158] border border-[#1D3860] text-[#D1E2F7] hover:text-white flex items-center justify-center transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#BEE179]"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};
