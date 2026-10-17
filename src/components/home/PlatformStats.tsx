import React from 'react';
import { TrendingUp, ShieldCheck, Users, Building2 } from 'lucide-react';

export const PlatformStats: React.FC = () => {
  const stats = [
    {
      icon: Building2,
      value: '53 Assets',
      label: 'Curated Property SPVs',
      subtitle: '7 launching soon, 13 fully funded, pipeline active',
    },
    {
      icon: TrendingUp,
      value: '€100 / Unit',
      label: 'Token Par Value',
      subtitle: 'Fractional entry with €750 minimum investment',
    },
    {
      icon: ShieldCheck,
      value: '100% SPV',
      label: 'Ring-Fenced Legal Custody',
      subtitle: 'Individual corporate entity per property asset',
    },
    {
      icon: Users,
      value: 'Monthly',
      label: 'Automated Cashflow Payouts',
      subtitle: 'Net rental yield settled directly to investor balance',
    },
  ];

  return (
    <section className="bg-[#081815] text-white border-b border-emerald-900/40 py-10">
      <div className="container max-w-[1240px] mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {stats.map((s, idx) => {
            const Icon = s.icon;
            return (
              <div
                key={idx}
                className="p-4 sm:p-5 rounded-lg bg-[#051310] border border-emerald-900/50 text-left transition-colors hover:border-emerald-800"
              >
                <div className="w-8 h-8 rounded-md bg-emerald-950 border border-emerald-800/50 flex items-center justify-center text-emerald-400 mb-3">
                  <Icon className="w-4 h-4" />
                </div>
                <span className="text-xl sm:text-2xl font-bold text-white tracking-tight block mb-1 tabular-nums">
                  {s.value}
                </span>
                <span className="text-xs font-semibold text-emerald-300 block mb-1">
                  {s.label}
                </span>
                <span className="text-[11px] text-slate-400 leading-normal block">
                  {s.subtitle}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

