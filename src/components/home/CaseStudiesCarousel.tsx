import React, { useEffect, useState } from 'react';
import { ArrowRight, ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react';
import { useReducedMotion } from 'motion/react';
import { CASE_STUDIES } from '../../data/caseStudies';

interface CaseStudiesCarouselProps {
  onViewAll: () => void;
}

export const CaseStudiesCarousel: React.FC<CaseStudiesCarouselProps> = ({ onViewAll }) => {
  const reducedMotion = useReducedMotion();
  const studies = CASE_STUDIES.slice(0, 6);
  const [active, setActive] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (reducedMotion || !playing || paused || studies.length < 2) return;
    const timer = window.setInterval(() => setActive((current) => (current + 1) % studies.length), 6500);
    return () => window.clearInterval(timer);
  }, [reducedMotion, playing, paused, studies.length]);

  if (!studies.length) return null;
  const study = studies[active];
  const previous = () => setActive((current) => (current - 1 + studies.length) % studies.length);
  const next = () => setActive((current) => (current + 1) % studies.length);

  return (
    <section
      aria-roledescription="carousel"
      aria-label="Property case studies"
      className="bg-[#10251F] text-white py-16 sm:py-20 border-y border-[#29483C]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setPaused(false); }}
    >
      <div className="mx-auto max-w-container px-gutter md:px-gutter-md lg:px-gutter-lg">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-5 mb-8">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold tracking-[.18em] uppercase text-[#C5A880]">Selected case records</p>
            <h2 className="mt-3 text-3xl sm:text-4xl font-heading font-bold uppercase tracking-tight">Property case studies</h2>
            <p className="mt-3 text-sm leading-relaxed text-[#C5D3CC]">Explore examples from the platform’s existing case-study register. Figures and outcomes are presented as recorded in each case file; review the underlying documents and applicable disclosures.</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button type="button" onClick={() => setPlaying((value) => !value)} aria-label={playing ? 'Pause case study slideshow' : 'Play case study slideshow'} aria-pressed={!playing} className="h-10 w-10 rounded-xl border border-white/20 flex items-center justify-center hover:bg-white/10">
              {playing ? <Pause className="w-4 h-4"/> : <Play className="w-4 h-4"/>}
            </button>
            <button type="button" onClick={previous} aria-label="Previous case study" className="h-10 w-10 rounded-xl border border-white/20 flex items-center justify-center hover:bg-white/10"><ChevronLeft className="w-4 h-4"/></button>
            <span className="px-2 text-xs font-mono text-white/65 tabular-nums">{String(active + 1).padStart(2, '0')} / {String(studies.length).padStart(2, '0')}</span>
            <button type="button" onClick={next} aria-label="Next case study" className="h-10 w-10 rounded-xl border border-white/20 flex items-center justify-center hover:bg-white/10"><ChevronRight className="w-4 h-4"/></button>
          </div>
        </div>

        <article className="grid overflow-hidden rounded-2xl border border-white/10 bg-[#172F27] md:grid-cols-[1.05fr_.95fr]">
          <div className="relative min-h-[250px] sm:min-h-[360px] bg-[#203B31]">
            <img src={study.image} alt={study.title} loading="lazy" className="absolute inset-0 w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#07150F]/70 via-transparent to-transparent"/>
            <span className="absolute bottom-5 left-5 rounded-full border border-white/25 bg-black/35 px-3 py-1.5 text-[10px] uppercase tracking-widest text-white">{study.city}, {study.country}</span>
          </div>
          <div className="p-6 sm:p-9 flex flex-col justify-center">
            <p className="text-[11px] font-semibold tracking-[.16em] uppercase text-[#C5A880]">{study.strategy} · {study.completionDate}</p>
            <h3 className="mt-3 text-2xl sm:text-3xl font-heading font-bold text-white leading-tight">{study.title}</h3>
            <p className="mt-4 text-sm leading-relaxed text-[#C5D3CC]">{study.summary}</p>
            <div className="mt-6 grid grid-cols-2 gap-4 border-y border-white/10 py-5">
              <div><p className="text-[10px] uppercase tracking-widest text-white/55">Recorded annualized IRR</p><p className="mt-1 text-2xl font-mono text-[#D8C29A]">{study.realTIR.toFixed(2)}%</p></div>
              <div><p className="text-[10px] uppercase tracking-widest text-white/55">Recorded duration</p><p className="mt-1 text-2xl font-mono text-white">{study.durationMonths} months</p></div>
            </div>
            <button type="button" onClick={onViewAll} className="mt-6 inline-flex items-center gap-2 self-start rounded-full bg-[#C5A880] px-5 py-3 text-xs font-bold uppercase tracking-widest text-[#1A1A1A] hover:bg-[#D5B98C]">
              Explore case records <ArrowRight className="w-4 h-4"/>
            </button>
          </div>
        </article>
        <div className="mt-5 flex items-center justify-center gap-2" role="tablist" aria-label="Select case study">
          {studies.map((item, index) => (
            <button key={item.id} type="button" role="tab" aria-selected={active === index} aria-label={`Show case study ${index + 1}: ${item.title}`} onClick={() => setActive(index)} className={`h-2.5 rounded-full transition-all ${active === index ? 'w-8 bg-[#C5A880]' : 'w-2.5 bg-white/30 hover:bg-white/60'}`}/>
          ))}
        </div>
        <p className="mt-4 text-center text-[11px] leading-relaxed text-white/45">Past case-study figures are historical records, not a forecast or guarantee of future performance. Property investment involves risk and capital may be lost.</p>
      </div>
    </section>
  );
};
