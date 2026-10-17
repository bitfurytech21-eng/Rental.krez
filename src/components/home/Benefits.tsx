import React from 'react';
import { Lock, FileSpreadsheet, RefreshCw, BarChart3, Globe, ShieldAlert } from 'lucide-react';

export const Benefits: React.FC = () => {
  const benefits = [
    {
      icon: Lock,
      title: 'Full SPV Asset Ring-Fencing',
      desc: 'Every property is owned by an isolated Special Purpose Vehicle. Your capital is ring-fenced from other assets and the platform itself.',
    },
    {
      icon: FileSpreadsheet,
      title: 'Radical Document Transparency',
      desc: 'Access independent RICS appraisals, cadastral records, architectural plans, and verified lease contracts before investing a single euro.',
    },
    {
      icon: BarChart3,
      title: 'Real-Time Portfolio Monitoring',
      desc: 'Track every accumulated cent of rental income, property occupancy status, and tax-ready distribution statements directly in your dashboard.',
    },
    {
      icon: RefreshCw,
      title: 'Secondary P2P Liquidity',
      desc: 'Trade or transfer tokens to fellow verified community members through our bulletin board, overcoming traditional multi-year real estate lockups.',
    },
    {
      icon: Globe,
      title: 'Cross-Border Diversification',
      desc: 'Spread risk across high-growth Spanish metros (Madrid, Valencia, Malaga) and prime US sunshine hubs (Miami) with curated fractional assets.',
    },
    {
      icon: ShieldAlert,
      title: 'Transparent Risk Disclosure',
      desc: 'We never hide real estate risks. We publish detailed downside sensitivity analyses, tenancy void buffers, and regulatory disclosures for every opportunity.',
    },
  ];

  return (
    <section className="section bg-white">
      <div className="container">
        <div className="section-heading">
          <div className="text-xs font-semibold text-emerald-800 tracking-wider uppercase mb-2">
            Kretz Institutional Governance · Asset Protections
          </div>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-[#18211F] mb-3">
            Institutional Real Estate Fundamentals with Verified Custody
          </h2>
          <p className="text-sm sm:text-base text-[#69736F] max-w-2xl mx-auto">
            Every property offering adheres to rigorous European legal structuring, independent notarial recording, and ring-fenced balance sheets.
          </p>
        </div>

        <div className="benefits-grid">
          {benefits.map((b, idx) => {
            const Icon = b.icon;
            return (
              <div key={idx} className="benefit-card hover:border-[#182D2A] transition-colors">
                <div className="benefit-icon">
                  <Icon className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-[#18211F] mb-2">{b.title}</h3>
                <p className="text-sm text-[#69736F] leading-relaxed">{b.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
