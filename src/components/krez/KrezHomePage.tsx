import React, { useEffect, useRef, useState } from 'react';
import { ArrowRight } from 'lucide-react';
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
import { KrezImage, KrezReveal } from './KrezReveal';

interface KrezHomePageProps {
  onNavigate: (path: string) => void;
}

const INTRO_SESSION_KEY = 'rk-intro';
const INTRO_BRAND_TEXT = "L'Agence";

const IntroOverlay: React.FC<{ onRevealHero: () => void }> = ({ onRevealHero }) => {
  const prefersReducedMotion = useReducedMotion();
  const [alreadySeen] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    try {
      return window.sessionStorage.getItem(INTRO_SESSION_KEY) === 'seen';
    } catch {
      return true;
    }
  });

  const [typedCount, setTypedCount] = useState(0);
  const [phase, setPhase] = useState<'typing' | 'lifting' | 'done'>(() =>
    alreadySeen ? 'done' : 'typing'
  );

  useEffect(() => {
    if (alreadySeen || prefersReducedMotion) {
      setPhase('done');
      onRevealHero();
      return;
    }

    const timers: number[] = [];
    const startDelay = 500;
    const stepMs = 105;

    for (let i = 1; i <= INTRO_BRAND_TEXT.length; i += 1) {
      timers.push(
        window.setTimeout(() => {
          setTypedCount(i);
        }, startDelay + i * stepMs)
      );
    }

    const liftTime = startDelay + INTRO_BRAND_TEXT.length * stepMs + 420;
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
      }, liftTime + 1550)
    );

    return () => {
      timers.forEach((id) => window.clearTimeout(id));
    };
  }, [alreadySeen, prefersReducedMotion, onRevealHero]);

  if (phase === 'done') return null;

  const visibleWord = INTRO_BRAND_TEXT.slice(0, typedCount);

  return (
    <div
      aria-hidden="true"
      className={`intro-overlay ${phase === 'lifting' ? 'is-lifting' : ''}`}
    >
      <div className="intro-word">
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

      {/* Section 1: Full-Viewport Architectural Hero */}
      <section className="relative min-h-screen w-full overflow-hidden">
        <KrezImage
          src={KREZ_IMAGES.heroBackground}
          alt="Landmark limestone building facade"
          loading="eager"
          className="absolute inset-0 h-full w-full object-cover object-center"
        />
        <div className="krez-hero-scrim pointer-events-none absolute inset-0" />

        <div className="relative z-10 mx-auto flex min-h-screen max-w-container flex-col justify-between px-gutter pb-12 md:px-gutter-md lg:px-gutter-lg">
          <div className={`hero-text-block ${heroRevealed ? 'is-revealed' : ''}`}>
            <div className="hero-heading-top">
              <p className="hero-own-the">Invest in</p>
              <p className="hero-subtitle-desktop">
                Fractional ownership of prime buildings
                <br />
                Transparent from day one
              </p>
            </div>
            <h1 className="hero-extraordinary">Landmarks</h1>
            <p className="hero-subtitle-mobile">
              Fractional ownership of prime buildings. Transparent from day one.
            </p>
          </div>

          <div className="mt-10 flex flex-wrap items-center justify-between gap-4">
            <button
              type="button"
              onClick={() => onNavigate('/properties')}
              className="inline-flex items-center gap-2 rounded-pill bg-primary px-6 py-3 text-xs font-semibold tracking-widest uppercase text-white transition-transform duration-fast hover:scale-hover active:scale-active cursor-pointer"
            >
              <span>Browse properties</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onNavigate('/how-it-works')}
              className="rounded-pill bg-background/85 px-5 py-3 text-xs font-semibold tracking-widest uppercase text-foreground backdrop-blur-xs transition-colors duration-fast hover:bg-background cursor-pointer"
            >
              How It Works
            </button>
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
      <section className="bg-[#211711] text-[#F5EFE8] py-section-sm md:py-section-spacing border-t border-[#594333]">
        <div className="mx-auto max-w-container px-gutter md:px-gutter-md lg:px-gutter-lg">
          <KrezReveal>
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
              <div>
                <p className="text-xs font-semibold tracking-widest uppercase text-[#C49A6C]">
                  Leadership & Legacy
                </p>
                <h2 className="mt-3 text-3xl font-heading font-bold tracking-tight uppercase text-[#F5EFE8] md:text-4xl">
                  The Kretz Family & Partners
                </h2>
                <p className="mt-2 text-sm text-[#C4B5A5] max-w-xl">
                  Stars of Netflix “The Parisian Agency” (L'Agence) and pioneers in European prestige real estate and tokenized fractional liquidity.
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('/team')}
                className="inline-flex items-center gap-2 self-start text-xs font-extrabold tracking-widest uppercase px-5 py-2.5 rounded-xl bg-[#C49A6C] text-[#211711] hover:bg-[#b0875a] transition-colors md:self-auto cursor-pointer"
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
                  className="group cursor-pointer rounded-2xl border border-[#594333] bg-[#2B1E17] p-4.5 shadow-sm transition-all duration-300 hover:border-[#C49A6C] hover:-translate-y-1 flex items-center gap-4"
                >
                  <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-[#211711] border border-[#594333]">
                    <img
                      src={member.image || member.remoteImage}
                      alt={member.name}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                  </div>
                  <div className="min-w-0 flex-1 text-left">
                    <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#C49A6C] block truncate">
                      {member.role.split('·')[0]}
                    </span>
                    <h3 className="text-base font-bold text-[#F5EFE8] truncate">{member.name}</h3>
                    <p className="text-xs text-[#C4B5A5] truncate mt-0.5">{member.location}</p>
                  </div>
                </div>
              </KrezReveal>
            ))}
          </div>
        </div>
      </section>

      {/* Section 3.75: Tokenization & Market Academy (Blog) */}
      <section className="bg-[#2B1E17] text-[#F5EFE8] py-section-sm md:py-section-spacing border-t border-[#594333]">
        <div className="mx-auto max-w-container px-gutter md:px-gutter-md lg:px-gutter-lg">
          <KrezReveal>
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
              <div>
                <p className="text-xs font-semibold tracking-widest uppercase text-[#C49A6C]">
                  Real Estate Tokenization Academy
                </p>
                <h2 className="mt-3 text-3xl font-heading font-bold tracking-tight uppercase text-[#F5EFE8] md:text-4xl">
                  Featured Insights &amp; Legal Guides
                </h2>
                <p className="mt-2 text-sm text-[#C4B5A5] max-w-xl">
                  In-depth articles covering Notarial SPVs, MiCA regulations, participatory loan structures, secondary market liquidity, and yield optimization.
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('/blog')}
                className="inline-flex items-center gap-2 self-start text-xs font-extrabold tracking-widest uppercase px-5 py-2.5 rounded-xl bg-[#C49A6C] text-[#211711] hover:bg-[#b0875a] transition-colors md:self-auto cursor-pointer"
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
                  className="flex h-full flex-col justify-between rounded-2xl border border-[#594333] bg-[#211711] overflow-hidden p-5 shadow-sm transition-all duration-300 hover:border-[#C49A6C] hover:-translate-y-1 cursor-pointer group"
                >
                  <div>
                    <div className="relative aspect-[16/10] overflow-hidden rounded-xl bg-[#2B1E17] mb-4 border border-[#594333]">
                      <img
                        src={post.image}
                        alt={post.title}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      <span className="absolute top-2.5 left-2.5 px-2.5 py-0.5 rounded-full bg-[#211711]/90 backdrop-blur-md text-[#C49A6C] text-[10px] font-bold border border-[#594333]">
                        {post.category}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-[11px] text-[#C4B5A5] mb-2">
                      <span>{post.readTime}</span>
                      <span>·</span>
                      <span>{post.publishedAt}</span>
                    </div>

                    <h3 className="text-base font-bold text-[#F5EFE8] group-hover:text-[#C49A6C] transition-colors leading-snug">
                      {post.title}
                    </h3>
                    <p className="mt-2 text-xs text-[#C4B5A5] leading-relaxed line-clamp-3">
                      {post.excerpt}
                    </p>
                  </div>

                  <div className="mt-5 pt-3 border-t border-[#594333] flex items-center justify-between text-xs text-[#C49A6C] font-extrabold">
                    <span>Read Article &rarr;</span>
                    <span className="text-[10px] text-[#C4B5A5] font-medium">By {post.author.name}</span>
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
