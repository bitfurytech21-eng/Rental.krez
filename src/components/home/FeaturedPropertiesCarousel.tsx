import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  MapPin,
  ShieldCheck,
  Pause,
  Play,
  SlidersHorizontal,
  Building2,
} from 'lucide-react';
import { Property } from '../../types/property';
import { formatCurrency } from '../../lib/utils';
import { apiRequest } from '../../lib/api';

import heroFallbackImg from '../../assets/images/hero_real_estate_1791998371047.jpg';
import madridFallbackImg from '../../assets/images/prop_madrid_living_1791998371897.jpg';
import malagaFallbackImg from '../../assets/images/prop_malaga_coastal_1791998372504.jpg';
import miamiFallbackImg from '../../assets/images/prop_miami_luxury_1791998372925.jpg';
import valenciaFallbackImg from '../../assets/images/prop_valencia_apt_1791998371242.jpg';

const LOCAL_PROPERTY_FALLBACKS = [
  heroFallbackImg,
  madridFallbackImg,
  malagaFallbackImg,
  miamiFallbackImg,
  valenciaFallbackImg,
];

interface FeaturedPropertiesCarouselProps {
  properties: Property[];
  onSelectProperty: (property: Property) => void;
  onInvestProperty: (property: Property) => void;
  onExploreAll: () => void;
  onHowItWorks: () => void;
}

type CategoryFilter = 'all' | 'residential' | 'coastal_villa' | 'high_yield';

export const FeaturedPropertiesCarousel: React.FC<FeaturedPropertiesCarouselProps> = ({
  properties,
  onSelectProperty,
  onInvestProperty,
  onExploreAll,
  onHowItWorks,
}) => {
  const prefersReducedMotion = useReducedMotion();
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [cardsPerView, setCardsPerView] = useState(3);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const [isHovered, setIsHovered] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [remoteProperties, setRemoteProperties] = useState<Property[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);

  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  // Sync responsive cards-per-view without causing layout shift
  useEffect(() => {
    const updateCardsPerView = () => {
      if (typeof window === 'undefined') return;
      if (window.innerWidth < 768) {
        setCardsPerView(1);
      } else if (window.innerWidth < 1120) {
        setCardsPerView(2);
      } else {
        setCardsPerView(3);
      }
    };
    updateCardsPerView();
    window.addEventListener('resize', updateCardsPerView, { passive: true });
    return () => window.removeEventListener('resize', updateCardsPerView);
  }, []);

  // Optional background sync with /api/v1/listings if local ledger list is empty
  useEffect(() => {
    let cancelled = false;
    if (properties.length === 0) {
      setIsSyncing(true);
      apiRequest<{ listings?: Property[]; data?: { listings?: Property[] } }>('/listings', {
        skipAuth: true,
      })
        .then((res) => {
          const list = Array.isArray(res?.listings)
            ? res.listings
            : Array.isArray(res?.data?.listings)
            ? res.data.listings
            : [];
          if (!cancelled && list.length > 0) {
            setRemoteProperties(list);
          }
        })
        .catch(() => {
          // Keep existing local ledger state silently
        })
        .finally(() => {
          if (!cancelled) setIsSyncing(false);
        });
    }
    return () => {
      cancelled = true;
    };
  }, [properties.length]);

  // Strict frontend visibility invariant matching PropertiesPage & App.tsx
  const visibleOfferings = useMemo(() => {
    const source = properties.length > 0 ? properties : remoteProperties;
    return source.filter(
      (p) =>
        p.status !== 'hidden' &&
        p.status !== 'pending_approval' &&
        p.approvedForFrontend !== false &&
        Boolean(p.assignedFunction)
    );
  }, [properties, remoteProperties]);

  const filteredOfferings = useMemo(() => {
    if (categoryFilter === 'all') return visibleOfferings;
    if (categoryFilter === 'residential') {
      return visibleOfferings.filter((p) =>
        ['Residential', 'Apartment', 'Coliving', 'House', 'Private Mansion'].includes(p.type)
      );
    }
    if (categoryFilter === 'coastal_villa') {
      return visibleOfferings.filter((p) =>
        ['Villa', 'Vacation Rental', 'Château', 'Estate / Property', 'Commercial', 'Chalet'].includes(p.type)
      );
    }
    // high_yield: >= 9.5% projected annual yield
    return visibleOfferings.filter((p) => (p.estimatedAnnualYield || 0) >= 9.5);
  }, [visibleOfferings, categoryFilter]);

  const maxStartIndex = Math.max(0, filteredOfferings.length - cardsPerView);

  // Clamp index when filter or viewport changes
  useEffect(() => {
    setCurrentIndex((prev) => Math.min(prev, maxStartIndex));
  }, [maxStartIndex, categoryFilter]);

  const handlePrev = useCallback(() => {
    setCurrentIndex((prev) => (prev <= 0 ? maxStartIndex : prev - 1));
  }, [maxStartIndex]);

  const handleNext = useCallback(() => {
    setCurrentIndex((prev) => (prev >= maxStartIndex ? 0 : prev + 1));
  }, [maxStartIndex]);

  // Automatic gentle advance when enabled and not hovered/focused/reduced-motion
  useEffect(() => {
    if (
      prefersReducedMotion ||
      !isAutoPlaying ||
      isHovered ||
      isFocused ||
      filteredOfferings.length <= cardsPerView
    ) {
      return;
    }
    const timer = window.setInterval(() => {
      setCurrentIndex((prev) => (prev >= maxStartIndex ? 0 : prev + 1));
    }, 6800);
    return () => window.clearInterval(timer);
  }, [
    prefersReducedMotion,
    isAutoPlaying,
    isHovered,
    isFocused,
    filteredOfferings.length,
    cardsPerView,
    maxStartIndex,
  ]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      handlePrev();
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      handleNext();
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const deltaX = e.changedTouches[0].clientX - touchStartX.current;
    const deltaY = e.changedTouches[0].clientY - touchStartY.current;
    if (Math.abs(deltaX) > 44 && Math.abs(deltaX) > Math.abs(deltaY)) {
      if (deltaX < 0) handleNext();
      else handlePrev();
    }
    touchStartX.current = null;
    touchStartY.current = null;
  };

  // Aggregate real stats from visible offerings
  const avgYield = useMemo(() => {
    if (visibleOfferings.length === 0) return null;
    const sum = visibleOfferings.reduce((acc, p) => acc + (Number(p.estimatedAnnualYield) || 0), 0);
    return (sum / visibleOfferings.length).toFixed(1);
  }, [visibleOfferings]);

  const minTicket = useMemo(() => {
    if (visibleOfferings.length === 0) return 750;
    const mins = visibleOfferings
      .map((p) => Number(p.minimumInvestment) || 750)
      .filter((v) => v > 0);
    return mins.length > 0 ? Math.min(...mins) : 750;
  }, [visibleOfferings]);

  const totalPages = maxStartIndex + 1;

  return (
    <section
      aria-roledescription="carousel"
      aria-label="Featured Tokenized Real Estate Offerings"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onFocusCapture={() => setIsFocused(true)}
      onBlurCapture={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
          setIsFocused(false);
        }
      }}
      onKeyDown={handleKeyDown}
      className="relative py-16 sm:py-24 bg-[#0B1B30] border-b border-[#1D3860] text-white overflow-hidden"
    >
      {/* Subtle Parallax / Slow-Drifting Ambient Background Layer */}
      <style>{`
        @keyframes featuredGlowDrift {
          0%, 100% { transform: translate3d(0px, 0px, 0) scale(1); opacity: 0.35; }
          50% { transform: translate3d(28px, -18px, 0) scale(1.06); opacity: 0.55; }
        }
        .featured-ambient-glow {
          animation: featuredGlowDrift 22s ease-in-out infinite;
          will-change: transform, opacity;
        }
        @media (prefers-reduced-motion: reduce) {
          .featured-ambient-glow {
            animation: none !important;
            transform: none !important;
          }
        }
      `}</style>
      <div
        className="absolute -top-32 right-[8%] w-[460px] h-[460px] rounded-full pointer-events-none featured-ambient-glow"
        style={{
          background:
            'radial-gradient(circle, rgba(190, 225, 121, 0.10) 0%, rgba(29, 56, 96, 0.25) 45%, rgba(11, 27, 48, 0) 75%)',
        }}
        aria-hidden="true"
      />
      <div
        className="absolute -bottom-36 left-[5%] w-[520px] h-[420px] rounded-full pointer-events-none featured-ambient-glow"
        style={{
          animationDelay: '6s',
          background:
            'radial-gradient(circle, rgba(29, 56, 96, 0.45) 0%, rgba(16, 36, 66, 0.2) 55%, rgba(11, 27, 48, 0) 78%)',
        }}
        aria-hidden="true"
      />

      <div className="container max-w-[1280px] mx-auto px-4 sm:px-6 relative z-10">
        {/* Top Header Row */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-8 sm:mb-10 text-left">
          <div className="space-y-3 max-w-2xl">
            <p className="text-xs font-semibold text-[#BEE179] tracking-wider">
              Tokenized Real Estate · Segregated European SPVs
            </p>
            <h2
              className="font-serif text-3xl sm:text-4xl lg:text-[2.75rem] font-black text-white tracking-tight leading-[1.12]"
              style={{ textWrap: 'balance' }}
            >
              Featured Properties &{' '}
              <span className="text-[#BEE179]">Investment Opportunities</span>
            </h2>
            <p className="text-sm sm:text-base text-[#D1E2F7] leading-relaxed">
              Inspect live fractional property offerings backed by notarized SPV deeds, RICS appraisals, and Solana SPL ownership records.
            </p>
          </div>

          {/* Primary Navigation & Carousel Controls */}
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            {filteredOfferings.length > cardsPerView && (
              <div className="flex items-center gap-1.5 bg-[#102442] border border-[#1D3860] rounded-xl p-1">
                <button
                  type="button"
                  onClick={() => setIsAutoPlaying((prev) => !prev)}
                  aria-label={isAutoPlaying ? 'Pause property carousel' : 'Play property carousel'}
                  aria-pressed={!isAutoPlaying}
                  className="w-9 h-9 rounded-lg flex items-center justify-center text-[#D1E2F7] hover:text-white hover:bg-[#173158] transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#BEE179]"
                >
                  {isAutoPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                </button>
                <button
                  type="button"
                  onClick={handlePrev}
                  aria-label="Previous properties"
                  className="w-9 h-9 rounded-lg flex items-center justify-center text-[#D1E2F7] hover:text-white hover:bg-[#173158] transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#BEE179]"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="px-2 text-xs font-mono tabular-nums text-[#8EA7C7] select-none">
                  {String(currentIndex + 1).padStart(2, '0')} / {String(totalPages).padStart(2, '0')}
                </span>
                <button
                  type="button"
                  onClick={handleNext}
                  aria-label="Next properties"
                  className="w-9 h-9 rounded-lg flex items-center justify-center text-[#D1E2F7] hover:text-white hover:bg-[#173158] transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#BEE179]"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={onExploreAll}
              className="py-2.5 px-5 rounded-xl bg-[#BEE179] hover:bg-[#AEDB5B] text-[#0B1B30] font-bold text-xs tracking-wide flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              <span>Enter Marketplace</span>
              <ArrowRight className="w-3.5 h-3.5 text-[#0B1B30]" />
            </button>
          </div>
        </div>

        {/* Interactive Filter Segmented Bar + Real Marketplace Summary */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 mb-8 border-b border-[#1D3860]">
          <div
            role="tablist"
            aria-label="Filter featured properties by strategy"
            className="inline-flex flex-wrap items-center gap-1.5 p-1 bg-[#102442] border border-[#1D3860] rounded-xl w-fit"
          >
            {[
              { id: 'all' as CategoryFilter, label: `All Offerings (${visibleOfferings.length})` },
              { id: 'residential' as CategoryFilter, label: 'Urban Residential' },
              { id: 'coastal_villa' as CategoryFilter, label: 'Villas & Estates' },
              { id: 'high_yield' as CategoryFilter, label: '9.5%+ Target Yield' },
            ].map((tab) => {
              const active = categoryFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => {
                    setCategoryFilter(tab.id);
                    setCurrentIndex(0);
                  }}
                  className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#BEE179] ${
                    active
                      ? 'bg-[#BEE179] text-[#0B1B30]'
                      : 'text-[#D1E2F7] hover:text-white hover:bg-[#163056]'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Unboxed Real Marketplace Metrics */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#8EA7C7] font-mono tabular-nums">
            <span>
              <strong className="text-white">{visibleOfferings.length}</strong> Live SPVs
            </span>
            <span aria-hidden="true">·</span>
            <span>
              Min. Ticket <strong className="text-white">{formatCurrency(minTicket)}</strong>
            </span>
            {avgYield && (
              <>
                <span aria-hidden="true">·</span>
                <span>
                  Avg. Projected Yield <strong className="text-[#BEE179]">{avgYield}% p.a.</strong>
                </span>
              </>
            )}
          </div>
        </div>

        {/* Loading State */}
        {isSyncing && visibleOfferings.length === 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[0, 1, 2].map((skeletonIdx) => (
              <div
                key={skeletonIdx}
                className="bg-[#102442] rounded-2xl border border-[#1D3860] overflow-hidden animate-pulse"
              >
                <div className="aspect-[16/10] bg-[#163056]" />
                <div className="p-6 space-y-4">
                  <div className="h-3 bg-[#1D3860] rounded w-1/2" />
                  <div className="h-5 bg-[#1D3860] rounded w-5/6" />
                  <div className="h-14 bg-[#0B1B30] rounded-xl" />
                  <div className="h-9 bg-[#1D3860] rounded-lg" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredOfferings.length === 0 ? (
          /* Honest Empty / Filter-No-Match State */
          <div className="bg-[#102442] rounded-2xl border border-[#1D3860] p-10 sm:p-12 text-center space-y-4">
            <div className="w-12 h-12 rounded-xl bg-[#0B1B30] border border-[#1D3860] flex items-center justify-center mx-auto text-[#BEE179]">
              {visibleOfferings.length === 0 ? (
                <Building2 className="w-5 h-5" />
              ) : (
                <SlidersHorizontal className="w-5 h-5" />
              )}
            </div>
            <h3 className="font-serif text-xl font-bold text-white">
              {visibleOfferings.length === 0
                ? 'No Public Property Offerings Currently Open'
                : 'No Offerings Match This Strategy Filter'}
            </h3>
            <p className="text-sm text-[#8EA7C7] max-w-md mx-auto leading-relaxed">
              {visibleOfferings.length === 0
                ? 'New tokenized European SPV offerings appear here automatically as soon as due diligence and registry approval complete.'
                : 'Reset the active strategy filter to view all verified real estate offerings currently open on the platform.'}
            </p>
            <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
              {categoryFilter !== 'all' && (
                <button
                  type="button"
                  onClick={() => setCategoryFilter('all')}
                  className="px-5 py-2.5 rounded-xl bg-[#BEE179] hover:bg-[#AEDB5B] text-[#0B1B30] text-xs font-bold transition-colors cursor-pointer"
                >
                  Show All Offerings ({visibleOfferings.length})
                </button>
              )}
              <button
                type="button"
                onClick={onHowItWorks}
                className="px-5 py-2.5 rounded-xl bg-[#0B1B30] hover:bg-[#132745] border border-[#1D3860] text-white text-xs font-bold transition-colors cursor-pointer"
              >
                Review Investment Structure
              </button>
            </div>
          </div>
        ) : (
          /* Horizontal Sliding Track */
          <div
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            className="overflow-hidden"
          >
            <motion.div
              className="flex -mx-3"
              animate={{
                x: `-${(currentIndex * 100) / cardsPerView}%`,
              }}
              transition={
                prefersReducedMotion
                  ? { duration: 0 }
                  : { type: 'spring', stiffness: 260, damping: 32, mass: 0.9 }
              }
            >
              {filteredOfferings.map((property, idx) => {
                const target = Math.max(1, Number(property.targetAmount) || 1);
                const funded = Math.max(0, Number(property.fundedAmount) || 0);
                const fundedPct = Math.min(100, Math.round((funded / target) * 100));
                const primaryImage =
                  property.images?.[0] ||
                  property.bannerImage ||
                  LOCAL_PROPERTY_FALLBACKS[idx % LOCAL_PROPERTY_FALLBACKS.length];
                const fallbackImage = LOCAL_PROPERTY_FALLBACKS[idx % LOCAL_PROPERTY_FALLBACKS.length];
                const isFunded =
                  property.status === 'funded' ||
                  property.status === 'completed' ||
                  property.isFullyFunded ||
                  property.availableTokens <= 0;

                return (
                  <div
                    key={property.id}
                    style={{ width: `${100 / cardsPerView}%` }}
                    className="px-3 shrink-0"
                  >
                    <article className="h-full bg-[#102442] rounded-2xl border border-[#1D3860] hover:border-[#BEE179]/60 transition-colors duration-200 overflow-hidden flex flex-col justify-between group text-left">
                      <div>
                        {/* Fixed-Ratio Image Container Preventing Layout Shift */}
                        <div
                          onClick={() => onSelectProperty(property)}
                          className="relative aspect-[16/10] overflow-hidden bg-[#081526] cursor-pointer"
                        >
                          <img
                            src={primaryImage}
                            alt={`${property.title} in ${property.location}`}
                            loading="lazy"
                            referrerPolicy="no-referrer"
                            onError={(e) => {
                              const img = e.currentTarget;
                              if (!img.dataset.fallbackApplied) {
                                img.dataset.fallbackApplied = 'true';
                                img.src = fallbackImage;
                              }
                            }}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-[#0B1B30]/90 via-[#0B1B30]/25 to-transparent" />

                          {/* Bottom-Left Location & Yield Overlay */}
                          <div className="absolute bottom-3 left-3.5 right-3.5 flex items-end justify-between gap-3">
                            <div className="flex items-center gap-1.5 text-xs text-white/95 font-medium truncate">
                              <MapPin className="w-3.5 h-3.5 text-[#BEE179] shrink-0" />
                              <span className="truncate">{property.location}</span>
                            </div>
                            <div className="text-right shrink-0">
                              <span className="block text-[10px] text-[#D1E2F7]">Target Net Yield</span>
                              <span className="font-mono tabular-nums text-sm font-black text-[#BEE179]">
                                {property.estimatedAnnualYield}% p.a.
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Property Body */}
                        <div className="p-5 sm:p-6 space-y-4">
                          {/* Clean Unboxed Metadata Line */}
                          <div className="flex items-center gap-2 text-xs text-[#8EA7C7] truncate">
                            <span className="text-[#BEE179] font-semibold">{property.type}</span>
                            <span aria-hidden="true">·</span>
                            <span className="font-mono tabular-nums">{property.tokenTicker}</span>
                            <span aria-hidden="true">·</span>
                            <span className="truncate">
                              {isFunded ? 'Fully Subscribed' : 'Open Offering'}
                            </span>
                          </div>

                          <h3
                            onClick={() => onSelectProperty(property)}
                            className="font-serif text-lg sm:text-xl font-bold text-white group-hover:text-[#BEE179] transition-colors cursor-pointer line-clamp-1"
                          >
                            {property.title}
                          </h3>

                          {/* Real Valuation & Token Metrics */}
                          <div className="grid grid-cols-3 gap-3 py-3 border-y border-[#1D3860] text-xs">
                            <div>
                              <span className="block text-[11px] text-[#8EA7C7]">Valuation</span>
                              <span className="font-mono tabular-nums font-bold text-white">
                                {formatCurrency(property.targetAmount)}
                              </span>
                            </div>
                            <div>
                              <span className="block text-[11px] text-[#8EA7C7]">Token Price</span>
                              <span className="font-mono tabular-nums font-bold text-white">
                                {formatCurrency(property.tokenPrice)}
                              </span>
                            </div>
                            <div>
                              <span className="block text-[11px] text-[#8EA7C7]">Available</span>
                              <span className="font-mono tabular-nums font-bold text-[#BEE179]">
                                {property.availableTokens.toLocaleString()} units
                              </span>
                            </div>
                          </div>

                          {/* Funding Progress Bar */}
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between text-xs font-mono tabular-nums">
                              <span className="text-[#8EA7C7] font-sans">
                                Subscription Progress
                              </span>
                              <span className="text-white font-semibold">{fundedPct}% Funded</span>
                            </div>
                            <div className="h-1.5 w-full rounded-full bg-[#0B1B30] overflow-hidden">
                              <div
                                className="h-full rounded-full bg-[#BEE179] transition-transform duration-500 origin-left"
                                style={{
                                  width: `${fundedPct}%`,
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Card Footer Actions */}
                      <div className="px-5 sm:px-6 pb-5 sm:pb-6 pt-1 flex items-center gap-2.5">
                        <button
                          type="button"
                          onClick={() => onSelectProperty(property)}
                          className="flex-1 py-2.5 px-4 rounded-xl bg-[#0B1B30] hover:bg-[#142B4D] border border-[#1D3860] text-white text-xs font-bold transition-colors cursor-pointer whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#BEE179]"
                        >
                          Property Details
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            isFunded ? onSelectProperty(property) : onInvestProperty(property)
                          }
                          className="flex-1 py-2.5 px-4 rounded-xl bg-[#BEE179] hover:bg-[#AEDB5B] text-[#0B1B30] text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                        >
                          <span>{isFunded ? 'Inspect SPV' : 'Acquire Tokens'}</span>
                          <ArrowRight className="w-3.5 h-3.5 text-[#0B1B30]" />
                        </button>
                      </div>
                    </article>
                  </div>
                );
              })}
            </motion.div>

            {/* Bottom Carousel Indicators + Custody Note */}
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
              {totalPages > 1 ? (
                <div className="flex items-center gap-2" role="tablist" aria-label="Property slide position">
                  {Array.from({ length: totalPages }).map((_, pageIdx) => {
                    const isActive = pageIdx === currentIndex;
                    return (
                      <button
                        key={pageIdx}
                        type="button"
                        role="tab"
                        aria-selected={isActive}
                        aria-label={`Go to property slide ${pageIdx + 1}`}
                        onClick={() => setCurrentIndex(pageIdx)}
                        className={`h-2 rounded-full transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#BEE179] ${
                          isActive
                            ? 'w-8 bg-[#BEE179]'
                            : 'w-2.5 bg-[#1D3860] hover:bg-[#355A8F]'
                        }`}
                      />
                    );
                  })}
                </div>
              ) : (
                <div />
              )}

              <div className="flex items-center gap-2 text-xs text-[#8EA7C7]">
                <ShieldCheck className="w-4 h-4 text-[#BEE179] shrink-0" />
                <span>
                  Every listing reflects real platform ledger availability and notarized European SPV custody.
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
