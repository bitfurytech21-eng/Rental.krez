import React from 'react';
import { CASE_STUDIES } from '../../data/caseStudies';
import { BLOG_POSTS } from '../../data/blogPosts';
import { formatCurrency } from '../../lib/utils';
import { 
  Trophy, ArrowRight, BookOpen, ChevronRight
} from 'lucide-react';

interface CasosDeExitoTeaserProps {
  onNavigateCasos: () => void;
  onNavigateBlog: () => void;
  onNavigateProperties: () => void;
}

export const CasosDeExitoTeaser: React.FC<CasosDeExitoTeaserProps> = ({
  onNavigateCasos,
  onNavigateBlog,
}) => {
  const topCases = CASE_STUDIES.slice(0, 3);
  const latestArticles = BLOG_POSTS.slice(0, 2);

  return (
    <section className="py-20 sm:py-28 bg-[#0B1B30] border-t border-b border-[#1D3860] text-white text-left">
      <div className="container max-w-[1240px] mx-auto px-4 sm:px-6">
        
        {/* Section Header */}
        <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-6 mb-14">
          <div className="space-y-3 max-w-2xl">
            <p className="text-[11px] font-bold text-[#BEE179] tracking-[0.2em] uppercase">
              Proven Performance · Realized Track Record
            </p>

            <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-black text-[#BEE179] tracking-tight">
              129+ Properties Exited with <span className="text-white italic font-normal">15.4% Avg Realized IRR</span>
            </h2>

            <p className="text-sm sm:text-base text-[#D1E2F7] leading-relaxed font-normal">
              Radical transparency on exited real estate opportunities. Review exact capital distributions, holding durations, live photo documentation, and notarized SPV dissolution deeds.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={onNavigateCasos}
              className="py-3 px-5 text-xs font-bold bg-[#BEE179] hover:bg-[#AEDB5B] text-[#0B1B30] rounded-lg flex items-center gap-2 cursor-pointer shadow-xs transition-colors"
            >
              <span>All Realized Cases</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Case Study Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8 mb-16">
          {topCases.map((study) => (
            <div
              key={study.id}
              onClick={onNavigateCasos}
              className="bg-[#102442] rounded-xl border border-[#1D3860] overflow-hidden hover:border-[#BEE179]/60 hover:shadow-lg transition-all duration-300 flex flex-col justify-between group cursor-pointer"
            >
              <div>
                <div className="relative aspect-[16/10] overflow-hidden bg-[#0B1B30]">
                  <img 
                    src={study.image} 
                    alt={study.title}
                    className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-700 ease-out" 
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      if (!target.dataset.fallback) {
                        target.dataset.fallback = 'true';
                        target.src = '/assets/images/hero_real_estate_1791998371047.jpg';
                      }
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/15 to-transparent" />
                  
                  <div className="absolute top-3 left-3 flex items-center gap-1.5">
                    <span className="px-2.5 py-1 rounded bg-black/60 backdrop-blur-md text-white text-[11px] font-medium border border-white/15">
                      {study.city}, {study.country}
                    </span>
                  </div>

                  <div className="absolute top-3 right-3">
                    <span className="px-2.5 py-1 rounded bg-[#BEE179] text-[#0B1B30] text-[10px] font-bold uppercase tracking-wider">
                      Liquidated & Exited
                    </span>
                  </div>

                  <div className="absolute bottom-3 left-3 right-3 text-left">
                    <p className="text-[10px] text-stone-300 uppercase font-semibold tracking-wider">{study.strategy}</p>
                    <h3 className="font-serif text-lg font-bold text-white leading-tight mt-0.5">{study.title}</h3>
                  </div>
                </div>

                <div className="p-6 space-y-4 text-left">
                  <div className="grid grid-cols-3 gap-2 p-3 bg-[#0B1B30] rounded-lg border border-[#1D3860] text-center">
                    <div>
                      <p className="text-[10px] text-[#8EA7C7] uppercase font-semibold">Realized IRR</p>
                      <p className="font-mono text-xl font-bold text-[#BEE179]">{study.realTIR}%</p>
                    </div>
                    <div className="border-x border-[#1D3860]">
                      <p className="text-[10px] text-[#8EA7C7] uppercase font-semibold">Gain</p>
                      <p className="font-mono text-xl font-bold text-white">+{study.capitalGain}%</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-[#8EA7C7] uppercase font-semibold">Term</p>
                      <p className="font-mono text-xl font-bold text-white">{study.durationMonths}m</p>
                    </div>
                  </div>

                  <div className="space-y-1.5 text-xs text-[#D1E2F7]">
                    <div className="flex justify-between items-center">
                      <span className="text-[#8EA7C7]">Total Returned:</span>
                      <span className="font-mono font-bold text-white">{formatCurrency(study.totalReturned)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[#8EA7C7]">Participants:</span>
                      <span className="font-medium text-white">{study.investorCount} investors</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[#8EA7C7]">Notary Deed:</span>
                      <span className="font-mono text-[#BEE179] text-[11px] font-bold">{study.spvDeedId}</span>
                    </div>
                  </div>

                  <p className="text-xs text-[#8EA7C7] line-clamp-2 leading-relaxed pt-1">
                    {study.summary}
                  </p>
                </div>
              </div>

              <div className="p-5 pt-0 border-t border-[#1D3860] flex items-center justify-between text-xs font-bold text-[#BEE179] group-hover:underline">
                <span>View Notarial Deed & Audit</span>
                <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          ))}
        </div>

        {/* Dual Banner: Educational Blog & Academy */}
        <div className="p-8 sm:p-10 rounded-xl bg-[#102442] border border-[#1D3860] shadow-xs flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-8 text-left">
          <div className="space-y-3 max-w-xl">
            <p className="text-[11px] font-bold text-[#BEE179] uppercase tracking-wider flex items-center gap-2">
              <BookOpen className="w-3.5 h-3.5 text-[#BEE179]" />
              <span>Investment Academy & Legal Guides</span>
            </p>
            <h3 className="font-serif text-2xl font-bold text-white">
              Understand fractional mechanics before participating
            </h3>
            <p className="text-xs sm:text-sm text-[#D1E2F7] leading-relaxed">
              Read comprehensive analyses on European regulatory frameworks, calculating compound IRR yields, Spanish IRPF tax filings, and how SPV deeds ring-fence investor capital.
            </p>
            <div className="pt-1">
              <button
                onClick={onNavigateBlog}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-[#BEE179] hover:underline cursor-pointer"
              >
                <span>Browse Educational Guides</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Quick Article List */}
          <div className="space-y-3 flex-1 max-w-lg">
            {latestArticles.map((art) => (
              <div
                key={art.id}
                onClick={onNavigateBlog}
                className="p-4 rounded-lg bg-[#0B1B30] hover:bg-[#132745] border border-[#1D3860] transition-colors cursor-pointer space-y-1"
              >
                <div className="flex items-center justify-between text-[11px] text-[#8EA7C7]">
                  <span className="font-bold text-[#BEE179]">{art.category}</span>
                  <span className="font-mono text-[10px] text-slate-300">{art.readTime}</span>
                </div>
                <h4 className="font-serif font-bold text-xs sm:text-sm text-white line-clamp-1">{art.title}</h4>
                <p className="text-[11px] text-[#8EA7C7] line-clamp-1">{art.excerpt}</p>
              </div>
            ))}
          </div>
        </div>

      </div>
    </section>
  );
};
