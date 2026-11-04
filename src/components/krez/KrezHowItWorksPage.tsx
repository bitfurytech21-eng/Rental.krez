import React, { useState } from 'react';
import { ArrowRight, ChevronDown } from 'lucide-react';
import {
  KREZ_FAQS,
  KREZ_HOW_IT_WORKS_STEPS,
  KREZ_IMAGES,
} from '../../data/krezTemplateData';
import { KrezImage, KrezReveal } from './KrezReveal';

interface KrezHowItWorksPageProps {
  onNavigate: (path: string) => void;
}

const SAFEGUARDS = [
  {
    id: 'ledger',
    title: 'One auditable ledger',
    body: 'Every share subscription, gross rent receipt, operating cost deduction, and monthly shareholder distribution is recorded line by line.',
  },
  {
    id: 'investors',
    title: 'Verified investors',
    body: 'Each building is ring-fenced inside a dedicated holding entity, with shareholder identity and payout details verified prior to settlement.',
  },
  {
    id: 'valuations',
    title: 'Independent valuations',
    body: 'Scheduled third-party appraisals and lease audits keep share book values anchored to verified tenancy income.',
  },
];

export const KrezHowItWorksPage: React.FC<KrezHowItWorksPageProps> = ({ onNavigate }) => {
  const [openFaqId, setOpenFaqId] = useState<string | null>(KREZ_FAQS[0]?.id || null);

  return (
    <main className="bg-[#EFF4F2] text-[#162923]">
      {/* Header & 4 Steps */}
      <section className="pt-header-offset pb-section-sm md:pb-section-spacing">
        <div className="mx-auto max-w-container px-gutter md:px-gutter-md lg:px-gutter-lg">
          <KrezReveal>
            <div className="max-w-2xl">
              <p className="text-xs font-semibold tracking-widest uppercase text-accent">
                Process
              </p>
              <h1 className="mt-3 text-4xl font-heading font-bold tracking-tight uppercase text-foreground md:text-5xl">
                Four steps,
                <br />
                one ledger
              </h1>
              <p className="mt-4 text-base leading-relaxed text-[#455A53]">
                We acquire let residential and mixed-use buildings, divide each property into fixed shares, and pay out net rent every month with the arithmetic shown in full.
              </p>
            </div>
          </KrezReveal>

          <div className="mt-12 grid gap-gutter sm:grid-cols-2 lg:grid-cols-4 md:gap-gutter-md">
            {KREZ_HOW_IT_WORKS_STEPS.map((step, index) => (
              <KrezReveal key={step.id} delay={index * 0.06}>
                <div className="flex h-full flex-col justify-between rounded-card bg-[#E1ECE7] border border-[#CFDFD8] p-card-pad shadow-2xs">
                  <div>
                    <span className="font-mono text-xs font-semibold tracking-widest text-accent">
                      0{index + 1}
                    </span>
                    <h2 className="mt-4 text-lg font-heading font-semibold text-foreground">
                      {step.title}
                    </h2>
                    <p className="mt-3 text-sm leading-relaxed text-muted">
                      {step.body}
                    </p>
                  </div>
                </div>
              </KrezReveal>
            ))}
          </div>
        </div>
      </section>

      {/* What a Share Gives You */}
      <section className="border-t border-border py-section-sm md:py-section-spacing">
        <div className="mx-auto max-w-container px-gutter md:px-gutter-md lg:px-gutter-lg">
          <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
            <KrezReveal>
              <div className="aspect-[4/3] overflow-hidden rounded-card bg-secondary">
                <KrezImage
                  src={KREZ_IMAGES.howItWorksOwnership}
                  alt="Architectural apartment interior"
                  className="h-full w-full object-cover"
                />
              </div>
            </KrezReveal>

            <KrezReveal delay={0.08}>
              <div className="max-w-lg">
                <p className="text-xs font-semibold tracking-widest uppercase text-accent">
                  Ownership
                </p>
                <h2 className="mt-3 text-3xl font-heading font-bold tracking-tight uppercase text-foreground md:text-4xl">
                  What a share gives you
                </h2>
                <p className="mt-4 text-sm leading-relaxed text-muted">
                  Each share represents a direct proportional claim on a single ring-fenced building—not a blind pool. You see the exact street, tenancy rate, gross rent collected, and every maintenance or insurance invoice before your monthly distribution lands.
                </p>
                <ul className="mt-6 space-y-3 border-t border-border pt-6 text-sm text-foreground">
                  <li className="flex items-start gap-3">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-pill bg-accent" />
                    <span>Proportional monthly share of net rent collected from tenants.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-pill bg-accent" />
                    <span>Participation in independent valuation uplifts or building-wide exit proceeds.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-pill bg-accent" />
                    <span>Itemized monthly ledger statements with zero hidden management layers.</span>
                  </li>
                </ul>

                <button
                  type="button"
                  onClick={() => onNavigate('/properties')}
                  className="mt-8 inline-flex items-center gap-2 rounded-pill bg-primary px-6 py-3.5 text-xs font-semibold tracking-widest uppercase text-white transition-transform duration-fast hover:scale-hover active:scale-active cursor-pointer"
                >
                  <span>Browse properties</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </KrezReveal>
          </div>
        </div>
      </section>

      {/* Dark Safeguards Band */}
      <section data-nav-dark="true" className="bg-ink py-section-sm text-white md:py-section-spacing">
        <div className="mx-auto max-w-container px-gutter md:px-gutter-md lg:px-gutter-lg">
          <KrezReveal>
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
              <div className="max-w-xl">
                <p className="text-xs font-semibold tracking-widest uppercase text-accent">
                  Safeguards
                </p>
                <h2 className="mt-3 text-3xl font-heading font-bold tracking-tight uppercase text-white md:text-4xl">
                  How your holding is protected
                </h2>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('/trust')}
                className="inline-flex items-center gap-2 self-start text-xs font-semibold tracking-widest uppercase text-white/80 transition-colors duration-fast hover:text-accent md:self-auto cursor-pointer"
              >
                <span>Trust &amp; registry centre</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </KrezReveal>

          <div className="mt-12 grid gap-gutter md:grid-cols-3 md:gap-gutter-md">
            {SAFEGUARDS.map((item, idx) => (
              <KrezReveal key={item.id} delay={idx * 0.06}>
                <div className="h-full rounded-card border border-white/12 bg-white/5 p-card-pad">
                  <h3 className="text-lg font-heading font-semibold text-white">
                    {item.title}
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-white/70">
                    {item.body}
                  </p>
                </div>
              </KrezReveal>
            ))}
          </div>
        </div>
      </section>

      {/* Questions Investors Ask */}
      <section className="bg-background py-section-sm md:py-section-spacing">
        <div className="mx-auto max-w-container px-gutter md:px-gutter-md lg:px-gutter-lg">
          <div className="grid gap-12 lg:grid-cols-[1fr_1.4fr]">
            <KrezReveal>
              <div>
                <p className="text-xs font-semibold tracking-widest uppercase text-accent">
                  FAQ
                </p>
                <h2 className="mt-3 text-3xl font-heading font-bold tracking-tight uppercase text-foreground md:text-4xl">
                  Questions investors ask
                </h2>
                <p className="mt-4 text-sm leading-relaxed text-muted">
                  Direct answers on minimums, monthly rent arithmetic, liquidity windows, and capital risk.
                </p>
                <button
                  type="button"
                  onClick={() => onNavigate('/contact')}
                  className="mt-6 inline-flex items-center gap-2 text-xs font-semibold tracking-widest uppercase text-foreground transition-colors duration-fast hover:text-accent cursor-pointer"
                >
                  <span>Ask another question</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </KrezReveal>

            <div className="divide-y divide-border border-y border-border">
              {KREZ_FAQS.map((faq) => {
                const isOpen = openFaqId === faq.id;
                return (
                  <div key={faq.id} className="py-5">
                    <button
                      type="button"
                      onClick={() => setOpenFaqId(isOpen ? null : faq.id)}
                      aria-expanded={isOpen}
                      className="flex w-full items-center justify-between gap-4 text-left cursor-pointer"
                    >
                      <span className="text-base font-heading font-semibold text-foreground">
                        {faq.question}
                      </span>
                      <ChevronDown
                        className={`h-4 w-4 shrink-0 text-muted transition-transform duration-base ${
                          isOpen ? 'rotate-180 text-foreground' : ''
                        }`}
                      />
                    </button>
                    {isOpen && (
                      <p className="mt-3 pr-8 text-sm leading-relaxed text-muted">
                        {faq.answer}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
};
