import React from 'react';
import { UserCheck, Search, FileCheck, Coins, PieChart, ShieldCheck } from 'lucide-react';

export const HowItWorks: React.FC = () => {
  const steps = [
    {
      step: '01',
      icon: UserCheck,
      title: 'Create Account & Verify',
      desc: 'Complete straightforward identity verification (KYC) compliant with European securities regulations in under two minutes.',
    },
    {
      step: '02',
      icon: Search,
      title: 'Select Institutional Assets',
      desc: 'Explore curated prime residential, trophy villas, and urban estates vetted by certified RICS appraisers and legal auditors.',
    },
    {
      step: '03',
      icon: FileCheck,
      title: 'Review Due Diligence',
      desc: 'Transparently inspect cadastral registry deeds, building permits, SPV notarial contracts, and audited cashflow schedules.',
    },
    {
      step: '04',
      icon: Coins,
      title: 'Participate Seamlessly',
      desc: 'Fund your fractional ownership starting from €750 via SEPA bank wire, debit card, or verified cryptocurrency stablecoins.',
    },
    {
      step: '05',
      icon: PieChart,
      title: 'Collect Monthly Distributions',
      desc: 'Receive pro-rata net rental settlements directly in your wallet on the 1st of every month with full tax-ready statements.',
    },
    {
      step: '06',
      icon: ShieldCheck,
      title: 'Capital Appreciation & Exit',
      desc: 'Participate in terminal sale upside upon asset maturity, or access peer-to-peer secondary market liquidity if you wish to exit early.',
    },
  ];

  return (
    <section className="py-20 sm:py-28 bg-[#0B1B30] text-white border-b border-[#1A3358]" id="how-it-works">
      <div className="container max-w-[1240px] mx-auto px-4 sm:px-6">
        
        {/* Section Heading with Yellow / Lime Accent */}
        <div className="max-w-3xl mx-auto text-center mb-16 space-y-4">
          <p className="text-[11px] font-extrabold text-[#BEE179] tracking-[0.2em] uppercase">
            Operational Lifecycle · From Appraisal to Distribution
          </p>
          <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-black text-[#BEE179] tracking-tight drop-shadow-xs">
            How Fractional Ownership Works
          </h2>
          <p className="text-base text-[#D1E2F7] max-w-2xl mx-auto font-medium leading-relaxed">
            L'Agence oversees acquisition, SPV titling, property management, and tenant leasing while investors hold direct ring-fenced economic shares.
          </p>
        </div>

        {/* Steps Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {steps.map((s) => {
            const Icon = s.icon;
            return (
              <div
                key={s.step}
                className="bg-[#102442] p-7 rounded-xl border border-[#1D3860] hover:border-[#BEE179]/50 hover:shadow-lg transition-all duration-300 relative group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <div className="w-11 h-11 rounded-lg bg-[#0B1B30] border border-[#1D3860] text-[#BEE179] flex items-center justify-center group-hover:bg-[#BEE179] group-hover:text-[#0B1B30] transition-colors duration-300">
                      <Icon className="w-5 h-5 stroke-[2.5]" />
                    </div>
                    <span className="font-mono text-2xl font-black text-[#1D3860] group-hover:text-[#BEE179] transition-colors">
                      {s.step}
                    </span>
                  </div>
                  <h3 className="font-serif text-lg font-bold text-white mb-2">{s.title}</h3>
                  <p className="text-xs sm:text-sm text-[#D1E2F7] font-medium leading-relaxed">{s.desc}</p>
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
};
