import React, { useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import {
  Lock,
  FileSpreadsheet,
  RefreshCw,
  BarChart3,
  Globe,
  ShieldAlert,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

export const Benefits: React.FC = () => {
  const prefersReducedMotion = useReducedMotion();
  const [mobileSlide, setMobileSlide] = useState(0);

  const benefits = [
    {
      index: '01',
      icon: Lock,
      kicker: 'Corporate Ring-Fencing',
      title: 'SPV Asset Ring-Fencing',
      desc: 'Each individual property is held within an isolated, unencumbered Special Purpose Vehicle. Capital remains strictly ring-fenced from other assets and the agency.',
      metric: '1 Property = 1 Dedicated SPV',
    },
    {
      index: '02',
      icon: FileSpreadsheet,
      kicker: 'Notarial Audit Trail',
      title: 'Radical Document Transparency',
      desc: 'Access verified cadastral records, architectural plans, independent RICS valuations, and signed commercial leases before subscribing.',
      metric: 'RICS & Cadastral Verified',
    },
    {
      index: '03',
      icon: BarChart3,
      kicker: 'Automated Accounting',
      title: 'Real-Time Portfolio Monitoring',
      desc: 'Track accumulated rental income, occupancy milestones, Solana token balances, and tax-ready annual distribution statements directly in your investor portal.',
      metric: 'Monthly Pro-Rata Ledger',
    },
    {
      index: '04',
      icon: RefreshCw,
      kicker: 'Flexible Exit Horizon',
      title: 'Secondary P2P Liquidity',
      desc: 'Transfer or exchange ownership tokens with fellow whitelisted community members through our secondary bulletin desk without multi-year lockups.',
      metric: 'Whitelisted P2P Transfers',
    },
    {
      index: '05',
      icon: Globe,
      kicker: 'Prime European Markets',
      title: 'Cross-Border Diversification',
      desc: 'Allocate capital across prime European capitals (Paris, Madrid, Barcelona, Valencia) and Mediterranean coastal corridors from €750 per position.',
      metric: 'Entry Ticket from €750',
    },
    {
      index: '06',
      icon: ShieldAlert,
      kicker: 'Stress-Tested Underwriting',
      title: 'Transparent Risk Disclosures',
      desc: 'Inspect clear sensitivity analyses, vacancy stress tests, regulatory disclosures, and conservative unlevered structures for every offering.',
      metric: '3-Scenario Stress Models',
    },
  ];

  const prevMobile = () =>
    setMobileSlide((prev) => (prev - 1 + benefits.length) % benefits.length);
  const nextMobile = () => setMobileSlide((prev) => (prev + 1) % benefits.length);

  return (
    <section className="py-20 sm:py-28 bg-[#0B1B30] text-white border-b border-[#1A3358]">
      <div className="container max-w-[1240px] mx-auto px-4 sm:px-6">
        {/* Section Heading */}
        <div className="max-w-3xl mx-auto text-center mb-14 sm:mb-16 space-y-4">
          <p className="text-xs font-extrabold text-[#BEE179] tracking-wider">
            Platform Capabilities · Institutional Asset Protections
          </p>
          <h2
            className="font-serif text-3xl sm:text-4xl lg:text-[2.75rem] font-black text-white tracking-tight leading-[1.12]"
            style={{ textWrap: 'balance' }}
          >
            Institutional Fundamentals with{' '}
            <span className="text-[#BEE179]">Verified Custody</span>
          </h2>
          <p className="text-sm sm:text-base text-[#D1E2F7] max-w-2xl mx-auto font-medium leading-relaxed">
            Every property offering adheres to rigorous European legal structuring, independent notarial recording, and programmable Solana registry transparency.
          </p>
        </div>

        {/* Mobile Interactive Feature Carousel (< md) */}
        <div className="md:hidden space-y-4">
          {(() => {
            const activeItem = benefits[mobileSlide];
            const ActiveIcon = activeItem.icon;
            return (
              <div className="bg-[#102442] p-6 rounded-2xl border border-[#1D3860] text-left space-y-4">
                <div className="flex items-center justify-between">
                  <div className="w-11 h-11 rounded-xl bg-[#0B1B30] border border-[#1D3860] text-[#BEE179] flex items-center justify-center">
                    <ActiveIcon className="w-5 h-5 stroke-[2.25]" />
                  </div>
                  <span className="font-mono tabular-nums text-xs text-[#8EA7C7]">
                    {activeItem.index} / 06
                  </span>
                </div>
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-[#BEE179]">{activeItem.kicker}</p>
                  <h3 className="font-serif text-xl font-bold text-white">{activeItem.title}</h3>
                  <p className="text-sm text-[#D1E2F7] leading-relaxed">{activeItem.desc}</p>
                </div>
                <div className="pt-3 border-t border-[#1D3860] text-xs font-mono text-[#8EA7C7]">
                  Safeguard · <span className="text-white font-semibold">{activeItem.metric}</span>
                </div>
              </div>
            );
          })()}

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              {benefits.map((b, idx) => (
                <button
                  key={b.index}
                  type="button"
                  aria-label={`View capability ${idx + 1}: ${b.title}`}
                  onClick={() => setMobileSlide(idx)}
                  className={`h-2 rounded-full transition-all cursor-pointer ${
                    idx === mobileSlide ? 'w-7 bg-[#BEE179]' : 'w-2 bg-[#1D3860]'
                  }`}
                />
              ))}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={prevMobile}
                aria-label="Previous platform feature"
                className="w-10 h-10 rounded-xl bg-[#102442] border border-[#1D3860] text-white flex items-center justify-center cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={nextMobile}
                aria-label="Next platform feature"
                className="w-10 h-10 rounded-xl bg-[#102442] border border-[#1D3860] text-white flex items-center justify-center cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Desktop & Tablet Structured Bento Grid (>= md) — Keeps Key Capabilities Immediately Visible */}
        <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-7">
          {benefits.map((b, idx) => {
            const Icon = b.icon;
            return (
              <motion.div
                key={b.index}
                initial={prefersReducedMotion ? false : { opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{
                  duration: prefersReducedMotion ? 0 : 0.4,
                  delay: prefersReducedMotion ? 0 : idx * 0.05,
                  ease: [0.16, 1, 0.3, 1],
                }}
                className="bg-[#102442] p-7 rounded-2xl border border-[#1D3860] hover:border-[#BEE179]/55 transition-colors duration-200 flex flex-col justify-between text-left group"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="w-11 h-11 rounded-xl bg-[#0B1B30] border border-[#1D3860] text-[#BEE179] group-hover:bg-[#BEE179] group-hover:text-[#0B1B30] transition-colors duration-200 flex items-center justify-center">
                      <Icon className="w-5 h-5 stroke-[2.25]" />
                    </div>
                    <span className="font-mono tabular-nums text-xs font-bold text-[#6484B0] group-hover:text-[#BEE179] transition-colors">
                      {b.index}
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <p className="text-xs font-semibold text-[#8EA7C7]">{b.kicker}</p>
                    <h3 className="font-serif text-lg sm:text-xl font-bold text-white">
                      {b.title}
                    </h3>
                    <p className="text-xs sm:text-sm text-[#D1E2F7] leading-relaxed font-normal">
                      {b.desc}
                    </p>
                  </div>
                </div>

                <div className="mt-6 pt-3.5 border-t border-[#1D3860] flex items-center justify-between text-xs text-[#8EA7C7]">
                  <span>Custody Standard</span>
                  <span className="font-mono text-white font-semibold">{b.metric}</span>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
