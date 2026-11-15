import React from 'react';
import { ArrowRight, Building2, FileCheck2, ChartNoAxesCombined, ClipboardList, ShieldCheck } from 'lucide-react';
import { KrezImage, KrezReveal } from './KrezReveal';

interface WhyKretzPageProps {
  onNavigate: (path: string) => void;
}

const PILLARS = [
  { icon: Building2, title: 'Property-level review', body: 'Each opportunity is presented as an individual building. Review its location, property description, offering status, share price, funding information and available photographs before deciding whether to proceed.' },
  { icon: FileCheck2, title: 'Documentation before commitment', body: 'The property workspace provides access to available legal, financial, technical and valuation materials. The documents available can differ by property and should be read alongside the specific offering terms.' },
  { icon: ChartNoAxesCombined, title: 'Portfolio visibility', body: 'Investor account areas bring holdings, transaction history, portfolio information and recorded distributions together so account activity can be followed over time.' },
  { icon: ClipboardList, title: 'Itemized property economics', body: 'Where supplied for a property, the platform presents projected rent, operating expenses, fees and estimated net income. Projections are assumptions, not guaranteed returns.' },
  { icon: ShieldCheck, title: 'Understand the structure and risks', body: 'Review the ownership or participation structure, transfer and exit provisions, eligibility requirements and risk disclosures for the specific offering. Do not assume that shares are liquid or that capital is protected.' },
];

export const WhyKretzPage: React.FC<WhyKretzPageProps> = ({ onNavigate }) => (
  <main className="min-h-screen bg-[#FAF8F5] text-[#1B2924]">
    <section className="bg-[#10251F] text-white pt-header-offset pb-16 sm:pb-20">
      <div className="mx-auto max-w-container px-gutter md:px-gutter-md lg:px-gutter-lg">
        <KrezReveal>
          <p className="text-xs font-semibold tracking-[.18em] uppercase text-[#C5A880]">The KRETZ approach</p>
          <h1 className="mt-4 max-w-3xl text-4xl sm:text-5xl font-heading font-bold uppercase tracking-tight">A property decision should begin with information.</h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-white/70">KRETZ brings property opportunities, offering information and investor account tools into one platform. The purpose of this page is to explain what visitors can review—not to suggest that property investment is risk-free or suitable for everyone.</p>
        </KrezReveal>
      </div>
    </section>
    <section className="py-14 sm:py-20">
      <div className="mx-auto max-w-container px-gutter md:px-gutter-md lg:px-gutter-lg">
        <KrezReveal>
          <figure className="mb-12 overflow-hidden rounded-2xl border border-[#D9E2DA] bg-[#10251F] shadow-xl">
            <KrezImage
              src="/assets/investment/property-diligence.svg"
              alt="Editorial illustration of property documentation, inspection and financial due diligence"
              className="block h-auto w-full"
            />
          </figure>
        </KrezReveal>
        <div className="max-w-2xl mb-10">
          <p className="text-xs font-semibold tracking-widest uppercase text-[#927447]">What the platform provides</p>
          <h2 className="mt-3 text-3xl sm:text-4xl font-heading font-bold uppercase">A framework for informed review</h2>
          <p className="mt-4 text-sm leading-relaxed text-[#657169]">The details shown depend on the property and its current offering documents. Always consult the relevant records before making an investment decision.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {PILLARS.map(({ icon: Icon, title, body }, index) => (
            <KrezReveal key={title} delay={index * .04}>
              <article className="h-full rounded-2xl border border-[#E2DDD2] bg-white p-6 sm:p-7">
                <Icon className="w-6 h-6 text-[#9A7A45]"/>
                <h3 className="mt-4 text-lg font-heading font-bold">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[#657169]">{body}</p>
              </article>
            </KrezReveal>
          ))}
        </div>
      </div>
    </section>
    <section className="bg-[#EDE8DE] py-12 sm:py-16">
      <div className="mx-auto max-w-container px-gutter md:px-gutter-md lg:px-gutter-lg flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div><h2 className="text-2xl font-heading font-bold uppercase">Review the opportunities directly</h2><p className="mt-2 text-sm text-[#657169]">Compare the available property records and read the offering documents.</p></div>
        <button type="button" onClick={() => onNavigate('/properties')} className="inline-flex items-center gap-2 rounded-full bg-[#19352B] px-6 py-3.5 text-xs font-semibold uppercase tracking-widest text-white">Explore properties <ArrowRight className="w-4 h-4"/></button>
      </div>
    </section>
  </main>
);
