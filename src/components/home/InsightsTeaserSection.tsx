import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import {
  ArrowRight,
  Clock,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  Pause,
  Play,
  BarChart3,
} from 'lucide-react';
import { insightsService } from '../../lib/insightsService';

import heroFallbackImg from '../../assets/images/hero_real_estate_1791998371047.jpg';
import hqFallbackImg from '../../assets/images/kretz_agency_headquarters_1792092491560.jpg';
import madridFallbackImg from '../../assets/images/prop_madrid_living_1791998371897.jpg';
import portraitFallbackImg from '../../assets/images/portrait_martin_kretz_1792092492537.jpg';

const INSIGHT_COVER_FALLBACKS = [hqFallbackImg, heroFallbackImg, madridFallbackImg];

interface InsightsTeaserSectionProps {
  onNavigateInsights: () => void;
  onNavigateDossier: (slug: string) => void;
  onNavigateCategory: (categorySlug: string) => void;
}

export const InsightsTeaserSection: React.FC<InsightsTeaserSectionProps> = ({
  onNavigateInsights,
  onNavigateDossier,
  onNavigateCategory,
}) => {
  const prefersReducedMotion = useReducedMotion();
  const allArticles = insightsService.getArticles({ status: 'published' });
  const [activeIdx, setActiveIdx] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const [isHovered, setIsHovered] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  const carouselArticles = allArticles.slice(0, 5);
  const activeArticle = carouselArticles[activeIdx] || carouselArticles[0];
  const secondaryInsights = allArticles
    .filter((a) => a.id !== activeArticle?.id)
    .slice(0, 2);

  const goNext = useCallback(() => {
    if (carouselArticles.length <= 1) return;
    setActiveIdx((prev) => (prev + 1) % carouselArticles.length);
  }, [carouselArticles.length]);

  const goPrev = useCallback(() => {
    if (carouselArticles.length <= 1) return;
    setActiveIdx((prev) => (prev - 1 + carouselArticles.length) % carouselArticles.length);
  }, [carouselArticles.length]);

  useEffect(() => {
    if (
      prefersReducedMotion ||
      !isAutoPlaying ||
      isHovered ||
      isFocused ||
      carouselArticles.length <= 1
    ) {
      return;
    }
    const timer = window.setInterval(goNext, 7200);
    return () => window.clearInterval(timer);
  }, [prefersReducedMotion, isAutoPlaying, isHovered, isFocused, carouselArticles.length, goNext]);

  if (!activeArticle) return null;

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

  const marketCorridorStats = [
    { corridor: 'Madrid & Valencia Prime', netYield: '8.4% – 11.6%', trend: '+65 bps YoY' },
    { corridor: 'Côte d’Azur & Paris Trophy', netYield: '6.8% – 8.9%', trend: '+40 bps YoY' },
    { corridor: 'Costa del Sol Hospitality', netYield: '9.2% – 12.1%', trend: '+80 bps YoY' },
  ];

  return (
    <section
      aria-roledescription="carousel"
      aria-label="European Real Estate Market Insights & Dossiers"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onFocusCapture={() => setIsFocused(true)}
      onBlurCapture={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
          setIsFocused(false);
        }
      }}
      onKeyDown={handleKeyDown}
      className="py-20 sm:py-28 bg-[#0B1B30] border-b border-[#1D3860] text-white text-left overflow-hidden"
    >
      <div className="container max-w-[1240px] mx-auto px-4 sm:px-6">
        {/* Section Header */}
        <div className="flex flex-col lg:flex-row items-start lg:items-end justify-between gap-6 mb-12">
          <div className="space-y-3 max-w-2xl">
            <p className="text-xs font-bold text-[#BEE179] tracking-wider">
              Market Insights & Research Desk · Yield Barometer
            </p>

            <h2
              className="font-serif text-3xl sm:text-4xl lg:text-[2.75rem] font-black text-white tracking-tight leading-[1.12]"
              style={{ textWrap: 'balance' }}
            >
              European Real Estate{' '}
              <span className="text-[#BEE179]">Dossiers & Market Insights</span>
            </h2>

            <p className="text-sm sm:text-base text-[#D1E2F7] leading-relaxed font-normal">
              Institutional investigations, quarterly yield surveys, regulatory blueprints, and tokenized asset registry analysis from our research desk.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            {carouselArticles.length > 1 && (
              <div className="flex items-center gap-1.5 bg-[#102442] border border-[#1D3860] rounded-xl p-1">
                <button
                  type="button"
                  onClick={() => setIsAutoPlaying((prev) => !prev)}
                  aria-label={isAutoPlaying ? 'Pause insights slideshow' : 'Play insights slideshow'}
                  aria-pressed={!isAutoPlaying}
                  className="w-9 h-9 rounded-lg flex items-center justify-center text-[#D1E2F7] hover:text-white hover:bg-[#173158] transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#BEE179]"
                >
                  {isAutoPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                </button>
                <button
                  type="button"
                  onClick={goPrev}
                  aria-label="Previous market dossier"
                  className="w-9 h-9 rounded-lg flex items-center justify-center text-[#D1E2F7] hover:text-white hover:bg-[#173158] transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#BEE179]"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="px-2 text-xs font-mono tabular-nums text-[#8EA7C7]">
                  {String(activeIdx + 1).padStart(2, '0')} /{' '}
                  {String(carouselArticles.length).padStart(2, '0')}
                </span>
                <button
                  type="button"
                  onClick={goNext}
                  aria-label="Next market dossier"
                  className="w-9 h-9 rounded-lg flex items-center justify-center text-[#D1E2F7] hover:text-white hover:bg-[#173158] transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#BEE179]"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={onNavigateInsights}
              className="py-2.5 px-5 text-xs font-bold bg-[#BEE179] text-[#0B1B30] hover:bg-[#AEDB5B] rounded-xl flex items-center gap-2 cursor-pointer shadow-xs transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              <span>Explore All Dossiers</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Editorial Feature Grid: Interactive Lead Dossier Slideshow (7 Cols) + Market Data & Secondary Picks (5 Cols) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          {/* Main Lead Investigation Carousel Card (7 Columns) */}
          <div
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            className="lg:col-span-7 bg-[#102442] text-white rounded-2xl overflow-hidden border border-[#1D3860] shadow-md flex flex-col justify-between group hover:border-[#BEE179]/60 transition-colors"
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={activeArticle.id}
                initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, x: 10 }}
                animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, x: 0 }}
                exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, x: -8 }}
                transition={{ duration: prefersReducedMotion ? 0.15 : 0.35, ease: [0.16, 1, 0.3, 1] }}
                className="flex-1 flex flex-col justify-between"
              >
                <div
                  className="relative aspect-[16/9] overflow-hidden cursor-pointer bg-[#081526]"
                  onClick={() => onNavigateDossier(activeArticle.slug)}
                >
                  <img
                    src={activeArticle.coverImage}
                    alt={activeArticle.coverImageAlt || activeArticle.title}
                    loading="lazy"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      const img = e.currentTarget;
                      if (!img.dataset.fallbackApplied) {
                        img.dataset.fallbackApplied = 'true';
                        img.src =
                          INSIGHT_COVER_FALLBACKS[activeIdx % INSIGHT_COVER_FALLBACKS.length];
                      }
                    }}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#102442] via-[#102442]/35 to-transparent" />

                  <div className="absolute bottom-3.5 left-4 right-4 flex items-center justify-between text-xs text-[#D1E2F7]">
                    <div className="flex items-center gap-2 truncate">
                      <span className="font-bold text-[#BEE179]">
                        {activeArticle.dossierIssue || 'Research Dossier'}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="truncate">{activeArticle.categoryName}</span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0 font-mono tabular-nums">
                      <Clock className="w-3.5 h-3.5 text-[#BEE179]" />
                      <span>{activeArticle.readTime}</span>
                    </div>
                  </div>
                </div>

                <div className="p-6 sm:p-8 flex-1 flex flex-col justify-between space-y-5">
                  <div className="space-y-3">
                    <h3
                      onClick={() => onNavigateDossier(activeArticle.slug)}
                      className="font-serif text-xl sm:text-2xl font-black text-white hover:text-[#BEE179] transition-colors cursor-pointer leading-snug"
                    >
                      {activeArticle.title}
                    </h3>
                    <p className="text-xs sm:text-sm text-[#D1E2F7] leading-relaxed line-clamp-3 font-normal">
                      {activeArticle.excerpt}
                    </p>
                  </div>

                  {/* Author + Slide Dots + Read CTA */}
                  <div className="pt-4 border-t border-[#1D3860] flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <img
                        src={activeArticle.author.avatar}
                        alt={activeArticle.author.name}
                        loading="lazy"
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          const img = e.currentTarget;
                          if (!img.dataset.fallbackApplied) {
                            img.dataset.fallbackApplied = 'true';
                            img.src = portraitFallbackImg;
                          }
                        }}
                        className="w-8 h-8 rounded-full object-cover border border-white/20"
                      />
                      <div>
                        <p className="text-xs font-semibold text-white leading-tight">
                          {activeArticle.author.name}
                        </p>
                        <p className="text-[11px] text-[#8EA7C7]">{activeArticle.author.role}</p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => onNavigateDossier(activeArticle.slug)}
                      className="px-4 py-2 rounded-xl bg-[#BEE179] text-[#0B1B30] hover:bg-[#AEDB5B] text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors shrink-0 shadow-xs whitespace-nowrap"
                    >
                      <span>Read Investigation</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Slide Indicator Strip */}
            {carouselArticles.length > 1 && (
              <div className="px-6 sm:px-8 pb-5 flex items-center gap-2">
                {carouselArticles.map((item, idx) => (
                  <button
                    key={item.id}
                    type="button"
                    aria-label={`Select dossier ${idx + 1}: ${item.title}`}
                    onClick={() => setActiveIdx(idx)}
                    className={`h-1.5 rounded-full transition-all duration-200 cursor-pointer ${
                      idx === activeIdx
                        ? 'w-8 bg-[#BEE179]'
                        : 'w-2.5 bg-[#1D3860] hover:bg-[#355A8F]'
                    }`}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Right 5 Columns: Secondary Picks + Prime Yield Barometer + Research Themes */}
          <div className="lg:col-span-5 flex flex-col justify-between gap-4">
            {/* European Corridor Yield Snapshot */}
            <div className="p-5 rounded-2xl bg-[#102442] border border-[#1D3860] space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-white">
                  <BarChart3 className="w-4 h-4 text-[#BEE179]" />
                  <span>European Tokenized Yield Barometer</span>
                </div>
                <span className="text-[11px] font-mono text-[#8EA7C7]">Q3–Q4 Benchmark</span>
              </div>
              <div className="divide-y divide-[#1D3860]">
                {marketCorridorStats.map((row) => (
                  <div
                    key={row.corridor}
                    className="py-2 first:pt-0 last:pb-0 flex items-center justify-between gap-2 text-xs"
                  >
                    <span className="text-[#D1E2F7] truncate">{row.corridor}</span>
                    <div className="flex items-center gap-2 shrink-0 font-mono tabular-nums">
                      <span className="font-bold text-white">{row.netYield}</span>
                      <span className="text-[11px] text-[#BEE179]">{row.trend}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {secondaryInsights.map((article) => (
              <div
                key={article.id}
                className="bg-[#102442] rounded-2xl p-5 border border-[#1D3860] hover:border-[#BEE179]/60 transition-colors flex flex-col justify-between space-y-3 group cursor-pointer"
                onClick={() => onNavigateDossier(article.slug)}
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2 text-xs text-[#8EA7C7]">
                    <span className="font-semibold text-[#BEE179] truncate">
                      {article.categoryName}
                    </span>
                    <span className="font-mono tabular-nums shrink-0">{article.readTime}</span>
                  </div>

                  <h4 className="font-serif text-base font-bold text-white group-hover:text-[#BEE179] transition-colors leading-snug line-clamp-2">
                    {article.title}
                  </h4>
                </div>

                <div className="flex items-center justify-between pt-2.5 border-t border-[#1D3860] text-xs">
                  <span className="text-[#8EA7C7] truncate">{article.author.name}</span>
                  <span className="font-bold text-[#BEE179] group-hover:translate-x-1 transition-transform flex items-center gap-1 shrink-0">
                    <span>Read</span>
                    <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            ))}

            {/* Interactive Research Filter Buttons */}
            <div className="p-5 rounded-2xl bg-[#102442] border border-[#1D3860] space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-white">
                <TrendingUp className="w-3.5 h-3.5 text-[#BEE179]" />
                <span>Filter by Research Desk Topic</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {[
                  { label: 'SPV Ring-Fencing', cat: 'reglementation-fiscalite' },
                  { label: 'Prime Cap Rates', cat: 'barometre-immobilier' },
                  { label: 'Solana & Token Deeds', cat: 'proptech-tokenization' },
                  { label: 'Trophy Assets', cat: 'patrimoine-luxe' },
                ].map((tag) => (
                  <button
                    key={tag.label}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onNavigateCategory(tag.cat);
                    }}
                    className="text-[11px] font-bold px-3 py-1.5 rounded-lg bg-[#0B1B30] hover:bg-[#BEE179] hover:text-[#0B1B30] text-[#D1E2F7] border border-[#1D3860] transition-colors cursor-pointer whitespace-nowrap"
                  >
                    {tag.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
