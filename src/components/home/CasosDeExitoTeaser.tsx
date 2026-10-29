import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { CASE_STUDIES } from '../../data/caseStudies';
import { BLOG_POSTS } from '../../data/blogPosts';
import { formatCurrency } from '../../lib/utils';
import {
  ArrowRight,
  BookOpen,
  ChevronRight,
  ChevronLeft,
} from 'lucide-react';

import heroFallbackImg from '../../assets/images/hero_real_estate_1791998371047.jpg';
import madridFallbackImg from '../../assets/images/prop_madrid_living_1791998371897.jpg';
import malagaFallbackImg from '../../assets/images/prop_malaga_coastal_1791998372504.jpg';
import valenciaFallbackImg from '../../assets/images/prop_valencia_apt_1791998371242.jpg';

const CASE_FALLBACKS = [
  malagaFallbackImg,
  valenciaFallbackImg,
  madridFallbackImg,
  heroFallbackImg,
];

interface CasosDeExitoTeaserProps {
  onNavigateCasos: () => void;
  onNavigateBlog: () => void;
  onNavigateProperties: () => void;
}

export const CasosDeExitoTeaser: React.FC<CasosDeExitoTeaserProps> = ({
  onNavigateCasos,
  onNavigateBlog,
}) => {
  const prefersReducedMotion = useReducedMotion();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [cardsPerView, setCardsPerView] = useState(3);
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  const latestArticles = BLOG_POSTS.slice(0, 2);

  useEffect(() => {
    const updateView = () => {
      if (typeof window === 'undefined') return;
      if (window.innerWidth < 768) setCardsPerView(1);
      else if (window.innerWidth < 1120) setCardsPerView(2);
      else setCardsPerView(3);
    };
    updateView();
    window.addEventListener('resize', updateView, { passive: true });
    return () => window.removeEventListener('resize', updateView);
  }, []);

  const maxStartIndex = Math.max(0, CASE_STUDIES.length - cardsPerView);

  useEffect(() => {
    setCurrentIndex((prev) => Math.min(prev, maxStartIndex));
  }, [maxStartIndex]);

  const handlePrev = useCallback(() => {
    setCurrentIndex((prev) => (prev <= 0 ? maxStartIndex : prev - 1));
  }, [maxStartIndex]);

  const handleNext = useCallback(() => {
    setCurrentIndex((prev) => (prev >= maxStartIndex ? 0 : prev + 1));
  }, [maxStartIndex]);

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
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = e.changedTouches[0].clientY - touchStartY.current;
    if (Math.abs(dx) > 44 && Math.abs(dx) > Math.abs(dy)) {
      if (dx < 0) handleNext();
      else handlePrev();
    }
    touchStartX.current = null;
    touchStartY.current = null;
  };

  const totalPages = maxStartIndex + 1;

  return (
    <section
      aria-roledescription="carousel"
      aria-label="Realized Property Exits & Audited Case Studies"
      onKeyDown={handleKeyDown}
      className="py-20 sm:py-28 bg-[#0B1B30] border-t border-b border-[#1D3860] text-white text-left overflow-hidden"
    >
      <div className="container max-w-[1240px] mx-auto px-4 sm:px-6">
        {/* Section Header */}
        <div className="flex flex-col lg:flex-row items-start lg:items-end justify-between gap-6 mb-12">
          <div className="space-y-3 max-w-2xl">
            <p className="text-xs font-bold text-[#BEE179] tracking-wider">
              Proven Performance · Audited SPV Dissolution Track Record
            </p>

            <h2
              className="font-serif text-3xl sm:text-4xl lg:text-[2.75rem] font-black text-white tracking-tight leading-[1.12]"
              style={{ textWrap: 'balance' }}
            >
              129+ Properties Exited with{' '}
              <span className="text-[#BEE179]">15.4% Avg Realized IRR</span>
            </h2>

            <p className="text-sm sm:text-base text-[#D1E2F7] leading-relaxed font-normal">
              Radical transparency on liquidated real estate SPVs. Inspect realized capital distributions, holding durations, and notarized SPV dissolution deeds.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            {CASE_STUDIES.length > cardsPerView && (
              <div className="flex items-center gap-1.5 bg-[#102442] border border-[#1D3860] rounded-xl p-1">
                <button
                  type="button"
                  onClick={handlePrev}
                  aria-label="Previous realized case study"
                  className="w-9 h-9 rounded-lg flex items-center justify-center text-[#D1E2F7] hover:text-white hover:bg-[#173158] transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#BEE179]"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="px-2 text-xs font-mono tabular-nums text-[#8EA7C7]">
                  {String(currentIndex + 1).padStart(2, '0')} / {String(totalPages).padStart(2, '0')}
                </span>
                <button
                  type="button"
                  onClick={handleNext}
                  aria-label="Next realized case study"
                  className="w-9 h-9 rounded-lg flex items-center justify-center text-[#D1E2F7] hover:text-white hover:bg-[#173158] transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#BEE179]"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={onNavigateCasos}
              className="py-2.5 px-5 text-xs font-bold bg-[#BEE179] hover:bg-[#AEDB5B] text-[#0B1B30] rounded-xl flex items-center gap-2 cursor-pointer shadow-xs transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              <span>All Realized Cases</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Interactive Case Studies Carousel */}
        <div
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          className="overflow-hidden mb-14"
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
            {CASE_STUDIES.map((study, idx) => {
              const fallbackImg = CASE_FALLBACKS[idx % CASE_FALLBACKS.length];
              return (
                <div
                  key={study.id}
                  style={{ width: `${100 / cardsPerView}%` }}
                  className="px-3 shrink-0"
                >
                  <article
                    onClick={onNavigateCasos}
                    className="h-full bg-[#102442] rounded-2xl border border-[#1D3860] overflow-hidden hover:border-[#BEE179]/60 transition-colors duration-200 flex flex-col justify-between group cursor-pointer"
                  >
                    <div>
                      <div className="relative aspect-[16/10] overflow-hidden bg-[#0B1B30]">
                        <img
                          src={study.image}
                          alt={study.title}
                          loading="lazy"
                          referrerPolicy="no-referrer"
                          onError={(e) => {
                            const target = e.currentTarget;
                            if (!target.dataset.fallback) {
                              target.dataset.fallback = 'true';
                              target.src = fallbackImg;
                            }
                          }}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#0B1B30]/92 via-[#0B1B30]/25 to-transparent" />

                        <div className="absolute bottom-3 left-3.5 right-3.5 text-left">
                          <div className="flex items-center gap-1.5 text-xs text-[#D1E2F7]">
                            <span className="text-[#BEE179] font-semibold">
                              {study.city}, {study.country}
                            </span>
                            <span aria-hidden="true">·</span>
                            <span>{study.strategy}</span>
                          </div>
                          <h3 className="font-serif text-lg font-bold text-white leading-tight mt-0.5 line-clamp-1">
                            {study.title}
                          </h3>
                        </div>
                      </div>

                      <div className="p-5 sm:p-6 space-y-4 text-left">
                        <div className="grid grid-cols-3 gap-2 py-3 border-y border-[#1D3860] text-center">
                          <div>
                            <p className="text-[11px] text-[#8EA7C7] font-medium">Realized IRR</p>
                            <p className="font-mono tabular-nums text-lg sm:text-xl font-bold text-[#BEE179]">
                              {study.realTIR}%
                            </p>
                          </div>
                          <div className="border-x border-[#1D3860]">
                            <p className="text-[11px] text-[#8EA7C7] font-medium">Net Gain</p>
                            <p className="font-mono tabular-nums text-lg sm:text-xl font-bold text-white">
                              +{study.capitalGain}%
                            </p>
                          </div>
                          <div>
                            <p className="text-[11px] text-[#8EA7C7] font-medium">Hold Term</p>
                            <p className="font-mono tabular-nums text-lg sm:text-xl font-bold text-white">
                              {study.durationMonths}m
                            </p>
                          </div>
                        </div>

                        <div className="space-y-1.5 text-xs text-[#D1E2F7]">
                          <div className="flex justify-between items-center">
                            <span className="text-[#8EA7C7]">Total Returned</span>
                            <span className="font-mono tabular-nums font-bold text-white">
                              {formatCurrency(study.totalReturned)}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-[#8EA7C7]">Verified Holders</span>
                            <span className="font-mono tabular-nums font-medium text-white">
                              {study.investorCount} investors
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-[#8EA7C7]">Notary Deed</span>
                            <span className="font-mono tabular-nums text-[#BEE179] text-[11px] font-bold">
                              {study.spvDeedId}
                            </span>
                          </div>
                        </div>

                        <p className="text-xs text-[#8EA7C7] line-clamp-2 leading-relaxed pt-1">
                          {study.summary}
                        </p>
                      </div>
                    </div>

                    <div className="px-5 sm:px-6 py-4 border-t border-[#1D3860] flex items-center justify-between text-xs font-bold text-[#BEE179] group-hover:underline">
                      <span>View Notarial Deed & Audit</span>
                      <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </article>
                </div>
              );
            })}
          </motion.div>

          {totalPages > 1 && (
            <div className="mt-6 flex items-center gap-2" role="tablist" aria-label="Case study slides">
              {Array.from({ length: totalPages }).map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  role="tab"
                  aria-selected={idx === currentIndex}
                  aria-label={`Case study group ${idx + 1}`}
                  onClick={() => setCurrentIndex(idx)}
                  className={`h-2 rounded-full transition-all duration-200 cursor-pointer ${
                    idx === currentIndex
                      ? 'w-8 bg-[#BEE179]'
                      : 'w-2.5 bg-[#1D3860] hover:bg-[#355A8F]'
                  }`}
                />
              ))}
            </div>
          )}
        </div>

        {/* Dual Banner: Educational Blog & Academy */}
        <div className="p-8 sm:p-10 rounded-2xl bg-[#102442] border border-[#1D3860] shadow-xs flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-8 text-left">
          <div className="space-y-3 max-w-xl">
            <p className="text-xs font-bold text-[#BEE179] tracking-wider flex items-center gap-2">
              <BookOpen className="w-3.5 h-3.5 text-[#BEE179]" />
              <span>Investment Academy & Legal Guides</span>
            </p>
            <h3 className="font-serif text-2xl font-bold text-white">
              Understand fractional mechanics before participating
            </h3>
            <p className="text-xs sm:text-sm text-[#D1E2F7] leading-relaxed">
              Read comprehensive analyses on European regulatory frameworks, calculating compound IRR yields, tax reporting, and how SPV deeds ring-fence investor capital.
            </p>
            <div className="pt-1">
              <button
                type="button"
                onClick={onNavigateBlog}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-[#BEE179] hover:underline cursor-pointer"
              >
                <span>Browse Educational Guides</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Quick Article List */}
          <div className="space-y-3 flex-1 max-w-lg">
            {latestArticles.map((art) => (
              <div
                key={art.id}
                onClick={onNavigateBlog}
                className="p-4 rounded-xl bg-[#0B1B30] hover:bg-[#132745] border border-[#1D3860] transition-colors cursor-pointer space-y-1"
              >
                <div className="flex items-center gap-2 text-[11px] text-[#8EA7C7]">
                  <span className="font-bold text-[#BEE179]">{art.category}</span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono tabular-nums">{art.readTime}</span>
                </div>
                <h4 className="font-serif font-bold text-xs sm:text-sm text-white line-clamp-1">
                  {art.title}
                </h4>
                <p className="text-[11px] text-[#8EA7C7] line-clamp-1">{art.excerpt}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
