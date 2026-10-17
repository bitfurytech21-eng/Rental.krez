import React from 'react';
import { UserCheck, Search, FileCheck, Coins, PieChart, ShieldCheck } from 'lucide-react';

export const HowItWorks: React.FC = () => {
  const steps = [
    {
      step: '01',
      icon: UserCheck,
      title: 'Create Account & Verify',
      desc: 'Sign up in 60 seconds. Complete straightforward identity verification (KYC) in compliance with European investor regulations.',
    },
    {
      step: '02',
      icon: Search,
      title: 'Select Institutional Assets',
      desc: 'Explore curated residential, coliving, and holiday properties vetted by certified RICS appraisers and legal auditors.',
    },
    {
      step: '03',
      icon: FileCheck,
      title: 'Review Due Diligence',
      desc: 'Transparently inspect independent appraisal reports, building permits, SPV deeds, and net cashflow calculations.',
    },
    {
      step: '04',
      icon: Coins,
      title: 'Seamless Investment',
      desc: 'Fund your participation instantly using SEPA bank wire, debit card, or crypto stablecoins (USDT/USDC).',
    },
    {
      step: '05',
      icon: PieChart,
      title: 'Earn Monthly Dividends',
      desc: 'Collect net rental yields directly in your wallet on the 1st of every month. Reinvest or withdraw to your bank account anytime.',
    },
    {
      step: '06',
      icon: ShieldCheck,
      title: 'Exit & Capital Appreciation',
      desc: 'Receive your share of property sale profits at maturity, or access secondary peer-to-peer liquidity ahead of schedule.',
    },
  ];

  return (
    <section className="section section--soft" id="how-it-works">
      <div className="container">
        <div className="section-heading">
          <div className="text-xs font-semibold text-emerald-800 tracking-wider uppercase mb-2">
            Operational Lifecycle · From Appraisal to Distribution
          </div>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-[#18211F] mb-3">
            How Fractional Property Investment Works
          </h2>
          <p className="text-sm sm:text-base text-[#69736F] max-w-2xl mx-auto">
            Kretz oversees acquisition, SPV titling, property maintenance, and professional leasing while investors hold direct fractional economic rights.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {steps.map((s) => {
            const Icon = s.icon;
            return (
              <div
                key={s.step}
                className="bg-white p-7 rounded-2xl border border-[#E3E8E3] shadow-sm relative group hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between mb-5">
                  <div className="w-12 h-12 rounded-xl bg-[#EEF1EC] text-[#182D2A] flex items-center justify-center group-hover:bg-[#182D2A] group-hover:text-[#B7E36A] transition-colors">
                    <Icon className="w-6 h-6" />
                  </div>
                  <span className="text-2xl font-black text-[#E3E8E3] group-hover:text-[#27845D] transition-colors">
                    {s.step}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-[#18211F] mb-2">{s.title}</h3>
                <p className="text-sm text-[#69736F] leading-relaxed">{s.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
