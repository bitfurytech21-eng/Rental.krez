import React, { useEffect, useRef, useState } from 'react';
import { ArrowRight, Building2, Coins, TrendingUp } from 'lucide-react';
import { useReducedMotion } from 'motion/react';
import {
  KREZ_GALLERY_ITEMS,
  KREZ_IMAGES,
  formatJournalDate,
  getJournalPosts,
} from '../../data/krezTemplateData';
import { KRETZ_CORE_LEADERSHIP } from '../../data/kretzTeam';
import { BLOG_POSTS } from '../../data/blogPosts';
import { ledger } from '../../lib/ledger';
import { formatCurrency } from '../../lib/utils';
import { Property } from '../../types/property';
import { KrezImage, KrezReveal } from './KrezReveal';
import { AnimatedHomepageHeroBackground } from '../visuals/AnimatedHomepageHeroBackground';


interface KrezHomePageProps {
  onNavigate: (path: string) => void;
}

const INTRO_SESSION_KEY = 'rk-intro';
const INTRO_BRAND_TEXT = "L'Agence";

const IntroOverlay: React.FC<{ onRevealHero: () => void }> = ({ onRevealHero }) => {
  const prefersReducedMotion = useReducedMotion();
  const isIframe = typeof window !== 'undefined' && window.self !== window.top;
  const [alreadySeen] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    if (isIframe) return true;
    try {
      return window.sessionStorage.getItem(INTRO_SESSION_KEY) === 'seen';
    } catch {
      return true;
    }
  });

  const [typedCount, setTypedCount] = useState(0);
  const [phase, setPhase] = useState<'typing' | 'lifting' | 'done'>(() =>
    alreadySeen || isIframe ? 'done' : 'typing'
  );

  const dismiss = () => {
    setPhase('done');
    try {
      window.sessionStorage.setItem(INTRO_SESSION_KEY, 'seen');
    } catch {}
    onRevealHero();
  };

  useEffect(() => {
    if (alreadySeen || prefersReducedMotion || isIframe) {
      setPhase('done');
      onRevealHero();
      return;
    }

    const timers: number[] = [];
    const startDelay = 150;
    const stepMs = 60;

    for (let i = 1; i <= INTRO_BRAND_TEXT.length; i += 1) {
      timers.push(
        window.setTimeout(() => {
          setTypedCount(i);
        }, startDelay + i * stepMs)
      );
    }

    const liftTime = startDelay + INTRO_BRAND_TEXT.length * stepMs + 250;
    timers.push(
      window.setTimeout(() => {
        setPhase('lifting');
        try {
          window.sessionStorage.setItem(INTRO_SESSION_KEY, 'seen');
        } catch {
          // Ignore storage restrictions
        }
        onRevealHero();
      }, liftTime)
    );

    timers.push(
      window.setTimeout(() => {
        setPhase('done');
      }, liftTime + 700)
    );

    return () => {
      timers.forEach((id) => window.clearTimeout(id));
    };
  }, [alreadySeen, prefersReducedMotion, onRevealHero, isIframe]);

  if (phase === 'done') return null;

  const visibleWord = INTRO_BRAND_TEXT.slice(0, typedCount);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={dismiss}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === 'Escape') dismiss(); }}
      aria-label="Skip introduction animation"
      className={`intro-overlay ${phase === 'lifting' ? 'is-lifting' : ''} cursor-pointer`}
    >
      <div className="intro-word select-none">
        <span>{visibleWord}</span>
        {typedCount === INTRO_BRAND_TEXT.length && (
          <span className="intro-dot">.</span>
        )}
        <span className="intro-cursor" />
      </div>
    </div>
  );
};

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

  const [heroRevealed, setHeroRevealed] = useState<boolean>(true);

  const journalPosts = getJournalPosts().slice(0, 3);
  const listedBuildingsCount = ledger.getFrontendProperties().length || 53;

  return (
    <main className="bg-[#FAF8F5] text-[#18211F]">
      <IntroOverlay onRevealHero={() => setHeroRevealed(true)} />

      {/* Section 1: Full-Viewport Architectural Hero with Animated Background */}
      <section className="relative min-h-screen w-full overflow-hidden">
        <AnimatedHomepageHeroBackground 
          imageSrc="/assets/aistudio/IMG_7738_40d9e7af.jpeg"
          className="absolute inset-0 w-full h-full"
        />

        <div className="relative z-10 mx-auto flex min-h-screen max-w-container flex-col justify-between px-gutter pb-12 pt-24 md:px-gutter-md lg:px-gutter-lg">

          <div className={`hero-text-block ${heroRevealed ? 'is-revealed' : ''}`}>
            {/* Elegant KREZ REAL ESTATE Monogram Brand Header as in IMG_7739 */}
            <div className="mb-4 inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-black/45 backdrop-blur-md border border-[#C59B4C]/50 shadow-lg">
              <span className="w-2 h-2 rounded-full bg-[#C59B4C] animate-pulse"></span>
              <span className="text-[11px] font-serif font-bold tracking-[0.25em] uppercase text-[#E5C378]">
                KREZ REAL ESTATE
              </span>
            </div>

            <div className="hero-heading-top">
              <p className="hero-own-the text-[#E5C378] !text-[#E5C378]">Invest in</p>
              <p className="hero-subtitle-desktop text-[#FFFFFF] !text-[#FFFFFF]">
                Fractional ownership of prime buildings
                <br />
                Transparent from day one
              </p>
            </div>
            <h1 className="hero-extraordinary text-[#FFFFFF] !text-[#FFFFFF]">Landmarks</h1>
            <p className="hero-subtitle-mobile text-[#FFFFFF] !text-[#FFFFFF]">
              Fractional ownership of prime buildings. Transparent from day one.
            </p>
          </div>

          <div className="mt-10 flex flex-wrap items-center justify-between gap-4">
            <button
              type="button"
              onClick={() => onNavigate('/properties')}
              className="inline-flex items-center gap-2.5 rounded-pill bg-[#C59B4C] hover:bg-[#b88f3f] px-7 py-3.5 text-xs font-black tracking-widest uppercase text-[#0B1B30] transition-all duration-fast shadow-xl hover:scale-105 active:scale-95 cursor-pointer ring-2 ring-[#C59B4C]/40"
            >
              <span>Enter as Tokenized fraction</span>
              <ArrowRight className="h-4 w-4 stroke-[2.5]" />
            </button>
            <button
              type="button"
              onClick={() => onNavigate('/how-it-works')}
              className="rounded-pill bg-black/50 hover:bg-black/70 px-6 py-3.5 text-xs font-semibold tracking-widest uppercase text-white border border-white/30 backdrop-blur-md transition-all cursor-pointer shadow-md"
            >
              How It Works
            </button>
          </div>
        </div>
      </section>

      {/* Featured Live Properties Showcase */}
      <section className="bg-[#FAF8F5] text-[#18211F] py-section-sm md:py-section-spacing border-t border-[#E5DDD1]">
        <div className="mx-auto max-w-container px-gutter md:px-gutter-md lg:px-gutter-lg">
          <KrezReveal>
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
              <div>
                <p className="text-xs font-semibold tracking-widest uppercase text-accent">
                  Featured Live Offerings
                </p>
                <h2 className="mt-3 text-3xl font-heading font-bold tracking-tight uppercase text-foreground md:text-4xl">
                  Properties Open for Investment
                </h2>
                <p className="mt-2 text-sm text-[#6A635C] max-w-xl">
                  Shares in income-producing European buildings, divided into fixed-price units with running costs itemized on the ledger.
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('/properties')}
                className="inline-flex items-center gap-2 self-start text-xs font-semibold tracking-widest uppercase text-[#1A1A1A] transition-colors duration-fast hover:text-accent md:self-auto cursor-pointer"
              >
                <span>View All Properties</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </KrezReveal>

          <div className="mt-10 grid gap-gutter md:grid-cols-2 lg:grid-cols-3">
            {(() => {
              const frontendProps = ledger.getFrontendProperties();
              const featured = frontendProps.slice(0, 6);
              return featured.map((prop, index) => (
                <KrezReveal key={prop.id} delay={(index % 3) * 0.05}>
                  <article className="group rounded-2xl border border-[#E5DDD1] bg-white overflow-hidden shadow-xs transition-all duration-300 hover:shadow-md hover:border-[#9a7b3f]">
                    <div className="aspect-[4/3] overflow-hidden bg-[#F4F1EA]">
                      <img
                        src={prop.images[0] || prop.bannerImage}
                        alt={prop.title}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      <span className="absolute top-3 left-3 rounded-full bg-[#182D2A] text-[#B7E36A] px-2 py-0.5 text-[10px] font-bold">
                        {prop.status}
                      </span>
                    </div>
                    <div className="p-4">
                      <p className="text-[10px] font-semibold tracking-wider uppercase text-[#9a7b3f]">
                        {prop.city}, {prop.country}
                      </p>
                      <h3 className="mt-1 text-base font-bold text-[#1A1A1A] group-hover:text-[#9a7b3f] transition-colors">
                        {prop.title}
                      </h3>
                      <dl className="mt-3 grid grid-cols-2 gap-3 text-xs">
                        <div>
                          <span className="block text-muted">Yield</span>
                          <span className="block font-bold text-[#182D2A]">{prop.estimatedAnnualYield}% net</span>
                        </div>
                        <div>
                          <span className="block text-muted">Price</span>
                          <span className="block font-bold text-[#182D2A]">{prop.tokenPrice}/share</span>
                        </div>
                      </dl>
                      <div className="mt-4">
                        <div className="w-full bg-[#E5DDD1] h-1.5 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[#213138] transition-all duration-500"
                            style={{ width: `${Math.min(100, Math.round((prop.fundedAmount / prop.targetAmount) * 100))}%` }}
                          />
                        </div>
                        <p className="mt-1 text-[10px] text-[#6A635C] font-medium">
                          {Math.round((prop.fundedAmount / prop.targetAmount) * 100)}% funded
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => onNavigate(`/properties/${prop.id}`)}
                        className="mt-4 w-full inline-flex items-center justify-center gap-2 rounded-pill bg-[#182D2A] px-5 py-2.5 text-xs font-bold text-white transition-transform duration-fast hover:scale-105 cursor-pointer"
                      >
                        <span>View & Invest</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  </article>
                </KrezReveal>
              ));
            })()}
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
                className="gallery-expand-item relative block border-0 p-0 text-left focus:outline-none"
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

      {/* Section 3.5: Kretz Family & Executive Team Spotlight */}
      <section className="bg-[#0B1B30] text-white py-section-sm md:py-section-spacing border-t border-[#1D3860]">
        <div className="mx-auto max-w-container px-gutter md:px-gutter-md lg:px-gutter-lg">
          <KrezReveal>
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
              <div>
                <p className="text-xs font-semibold tracking-widest uppercase text-[#C5A880]">
                  Leadership & Legacy
                </p>
                <h2 className="mt-3 text-3xl font-heading font-bold tracking-tight uppercase text-white md:text-4xl">
                  The Kretz Family & Partners
                </h2>
                <p className="mt-2 text-sm text-[#D1E2F7] max-w-xl">
                  Stars of Netflix “The Parisian Agency” (L'Agence) and pioneers in European prestige real estate and tokenized fractional liquidity.
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('/team')}
                className="inline-flex items-center gap-2 self-start text-xs font-extrabold tracking-widest uppercase px-5 py-2.5 rounded-xl bg-[#C5A880] text-[#1A1A1A] hover:bg-[#B39369] transition-colors md:self-auto cursor-pointer shadow-sm"
              >
                <span>Meet Full Team (41 Members)</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </KrezReveal>

          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {KRETZ_CORE_LEADERSHIP.slice(0, 6).map((member, idx) => (
              <KrezReveal key={member.id} delay={idx * 0.05}>
                <div
                  onClick={() => onNavigate('/team')}
                  className="group cursor-pointer rounded-2xl border border-[#1D3860] bg-[#102442] p-4.5 shadow-sm transition-all duration-300 hover:border-[#C5A880] hover:-translate-y-1 flex items-center gap-4"
                >
                  <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-[#0B1B30] border border-[#1D3860]">
                    <img
                      src={member.image || member.remoteImage}
                      alt={member.name}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                  </div>
                  <div className="min-w-0 flex-1 text-left">
                    <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#C5A880] block truncate">
                      {member.role.split('·')[0]}
                    </span>
                    <h3 className="text-base font-bold text-white truncate">{member.name}</h3>
                    <p className="text-xs text-[#8EA7C7] truncate mt-0.5">{member.location}</p>
                  </div>
                </div>
              </KrezReveal>
            ))}
          </div>
        </div>
      </section>

      {/* Section 3.75: Tokenization & Market Academy (Blog) */}
      <section className="bg-[#FAF8F5] text-[#1A1A1A] py-section-sm md:py-section-spacing border-t border-[#E5DDD1]">
        <div className="mx-auto max-w-container px-gutter md:px-gutter-md lg:px-gutter-lg">
          <KrezReveal>
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
              <div>
                <p className="text-xs font-semibold tracking-widest uppercase text-[#9a7b3f]">
                  Real Estate Tokenization Academy
                </p>
                <h2 className="mt-3 text-3xl font-heading font-bold tracking-tight uppercase text-[#1A1A1A] md:text-4xl">
                  Featured Insights &amp; Legal Guides
                </h2>
                <p className="mt-2 text-sm text-[#6A635C] max-w-xl">
                  In-depth articles covering Notarial SPVs, MiCA regulations, participatory loan structures, secondary market liquidity, and yield optimization.
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('/blog')}
                className="inline-flex items-center gap-2 self-start text-xs font-extrabold tracking-widest uppercase px-5 py-2.5 rounded-xl bg-[#213138] text-white hover:bg-[#18252b] transition-colors md:self-auto cursor-pointer shadow-sm"
              >
                <span>Visit Blog &amp; Academy ({BLOG_POSTS.length} Articles)</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </KrezReveal>

          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {BLOG_POSTS.slice(0, 3).map((post, idx) => (
              <KrezReveal key={post.id} delay={idx * 0.06}>
                <article
                  onClick={() => onNavigate(`/blog/${post.slug}`)}
                  className="flex h-full flex-col justify-between rounded-2xl border border-[#D9CFC2] bg-white overflow-hidden p-5 shadow-sm transition-all duration-300 hover:border-[#9a7b3f] hover:-translate-y-1 cursor-pointer group"
                >
                  <div>
                    <div className="relative aspect-[16/10] overflow-hidden rounded-xl bg-[#FAF8F5] mb-4 border border-[#E5DDD1]">
                      <img
                        src={post.image}
                        alt={post.title}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      <span className="absolute top-2.5 left-2.5 px-2.5 py-0.5 rounded-full bg-[#213138] text-white text-[10px] font-bold">
                        {post.category}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-[11px] text-[#6A635C] mb-2">
                      <span>{post.readTime}</span>
                      <span>·</span>
                      <span>{post.publishedAt}</span>
                    </div>

                    <h3 className="text-base font-bold text-[#1A1A1A] group-hover:text-[#9a7b3f] transition-colors leading-snug">
                      {post.title}
                    </h3>
                    <p className="mt-2 text-xs text-[#6A635C] leading-relaxed line-clamp-3">
                      {post.excerpt}
                    </p>
                  </div>

                  <div className="mt-5 pt-3 border-t border-[#E5DDD1] flex items-center justify-between text-xs text-[#9a7b3f] font-extrabold">
                    <span>Read Article &rarr;</span>
                    <span className="text-[10px] text-[#6A635C] font-medium">By {post.author.name}</span>
                  </div>
                </article>
              </KrezReveal>
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
                <article className="flex h-full flex-col justify-between rounded-card border border-[#DC8D5] bg-white p-card-pad shadow-2xs transition-transform duration-base hover:-translate-y-hover-lift">
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
