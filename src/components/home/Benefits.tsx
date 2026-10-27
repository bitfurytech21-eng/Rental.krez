import React from 'react';
import { Lock, FileSpreadsheet, RefreshCw, BarChart3, Globe, ShieldAlert } from 'lucide-react';

export const Benefits: React.FC = () => {
  const benefits = [
    {
      icon: Lock,
      title: 'SPV Asset Ring-Fencing',
      desc: 'Each individual property is held within an isolated, unencumbered Special Purpose Vehicle. Capital remains strictly ring-fenced from other assets and the agency.',
    },
    {
      icon: FileSpreadsheet,
      title: 'Radical Document Transparency',
      desc: 'Access verified cadastral records, architectural plans, independent RICS valuations, and signed commercial leases before subscribing.',
    },
    {
      icon: BarChart3,
      title: 'Real-Time Portfolio Monitoring',
      desc: 'Track every accumulated cent of rental income, occupancy milestones, and tax-ready annual distribution statements directly in your private dashboard.',
    },
    {
      icon: RefreshCw,
      title: 'Secondary P2P Liquidity',
      desc: 'Transfer or exchange ownership tokens with fellow verified community members through our bulletin board, bypassing traditional 5-year lockups.',
    },
    {
      icon: Globe,
      title: 'Cross-Border Diversification',
      desc: 'Spread risk across resilient prime European capitals (Paris, Madrid, Barcelona) and international sunshine corridors with fractionally priced entries.',
    },
    {
      icon: ShieldAlert,
      title: 'Transparent Risk Disclosures',
      desc: 'We present clear sensitivity analyses, vacancy stress tests, regulatory disclosures, and conservative debt-free structures for every opportunity.',
    },
  ];

  return (
    <section className="py-20 sm:py-28 bg-[#0B1B30] text-white border-b border-[#1A3358]">
      <div className="container max-w-[1240px] mx-auto px-4 sm:px-6">
        
        {/* Section Heading with Yellow / Lime Accent */}
        <div className="max-w-3xl mx-auto text-center mb-16 space-y-4">
          <p className="text-[11px] font-extrabold text-[#BEE179] tracking-[0.2em] uppercase">
            Institutional Governance · Asset Protections
          </p>
          <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-black text-[#BEE179] tracking-tight drop-shadow-xs">
            Institutional Fundamentals with Verified Custody
          </h2>
          <p className="text-base text-[#D1E2F7] max-w-2xl mx-auto font-medium leading-relaxed">
            Every property offering adheres to rigorous European legal structuring, independent notarial recording, and ring-fenced balance sheets.
          </p>
        </div>

        {/* Benefits Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {benefits.map((b, idx) => {
            const Icon = b.icon;
            return (
              <div 
                key={idx} 
                className="bg-[#102442] p-7 rounded-xl border border-[#1D3860] hover:border-[#BEE179]/50 hover:shadow-lg transition-all duration-300 flex flex-col justify-between"
              >
                <div>
                  <div className="w-11 h-11 rounded-lg bg-[#0B1B30] border border-[#1D3860] text-[#BEE179] flex items-center justify-center mb-5">
                    <Icon className="w-5 h-5 stroke-[2.5]" />
                  </div>
                  <h3 className="font-serif text-lg font-bold text-white mb-2">{b.title}</h3>
                  <p className="text-xs sm:text-sm text-[#D1E2F7] leading-relaxed font-medium">{b.desc}</p>
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
};
