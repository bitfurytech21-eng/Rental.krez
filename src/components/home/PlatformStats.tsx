import React from 'react';

export const PlatformStats: React.FC = () => {
  const stats = [
    {
      value: '€142.5M+',
      label: 'Capitalized Asset Value',
      detail: 'Trophy residential & prime commercial properties across Europe',
    },
    {
      value: '11.2%',
      label: 'Average Annualized Net Return',
      detail: 'Historical rental dividends plus realized capital appreciation',
    },
    {
      value: '53 Assets',
      label: 'Curated European Offerings',
      detail: 'France, Spain, Portugal, and international sunshine markets',
    },
    {
      value: '100%',
      label: 'Independent SPV Protection',
      detail: 'Ring-fenced corporate custody with audited physical deeds',
    },
  ];

  return (
    <section className="bg-[#0B1B30] border-b border-[#1A3358] py-12 sm:py-16">
      <div className="container max-w-[1340px] mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-0 lg:divide-x lg:divide-[#1D3860]">
          {stats.map((s, idx) => (
            <div
              key={idx}
              className="text-left lg:px-8 first:lg:pl-0 last:lg:pr-0 space-y-2"
            >
              <div className="font-serif text-3xl sm:text-4xl lg:text-5xl font-black text-[#BEE179] tracking-tight tabular-nums drop-shadow-xs">
                {s.value}
              </div>
              <div className="text-xs uppercase tracking-wider font-extrabold text-white">
                {s.label}
              </div>
              <p className="text-xs text-[#8EA7C7] font-medium leading-relaxed">
                {s.detail}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
