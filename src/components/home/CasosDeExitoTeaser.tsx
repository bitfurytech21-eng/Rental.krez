import React from 'react';
import { CASE_STUDIES } from '../../data/caseStudies';
import { BLOG_POSTS } from '../../data/blogPosts';
import { formatCurrency } from '../../lib/utils';
import { 
  Trophy, TrendingUp, CheckCircle2, ArrowRight, 
  Clock, BookOpen, ChevronRight, ShieldCheck, ExternalLink
} from 'lucide-react';

interface CasosDeExitoTeaserProps {
  onNavigateCasos: () => void;
  onNavigateBlog: () => void;
  onNavigateProperties: () => void;
}

export const CasosDeExitoTeaser: React.FC<CasosDeExitoTeaserProps> = ({
  onNavigateCasos,
  onNavigateBlog,
  onNavigateProperties,
}) => {
  const topCases = CASE_STUDIES.slice(0, 3);
  const latestArticles = BLOG_POSTS.slice(0, 2);

  return (
    <section className="py-20 sm:py-28 bg-[#F6F7F4] border-t border-b border-[#E3E8E3] text-[#18211F] text-left">
      <div className="container max-w-[1240px] mx-auto px-4">
        
        {/* Section Header */}
        <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-6 mb-14">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white border border-[#D5DDD5] text-emerald-900 text-xs font-bold uppercase tracking-wider">
              <Trophy className="w-3.5 h-3.5 text-emerald-700" />
              <span>Proven Performance & Realized Track Record</span>
            </div>

            <h2 className="text-3xl sm:text-4xl font-extrabold text-[#18211F] tracking-tight">
              129+ Tokenized Projects Exited with <span className="text-emerald-800">15.4% Avg Realized IRR</span>
            </h2>

            <p className="text-sm sm:text-base text-[#69736F] leading-relaxed">
              We provide 100% radical transparency on exited real estate opportunities. 
              Review the exact capital returned, holding durations, live photo documentation, and notarized SPV dissolution deeds.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onNavigateCasos}
              className="btn btn-primary py-3.5 px-6 text-xs font-bold bg-[#182D2A] text-white hover:bg-[#24423C] rounded-xl flex items-center gap-2 cursor-pointer shadow-xs transition-all"
            >
              <span>Explore All Success Stories</span>
              <ArrowRight className="w-4 h-4 text-[#B7E36A]" />
            </button>
          </div>
        </div>

        {/* Top Real-Time Case Study Cards Stacked in a Scrollable Vertical Feed */}
        <div className="max-w-2xl mx-auto flex flex-col gap-8 mb-16 w-full">
          {topCases.map((study) => (
            <div
              key={study.id}
              onClick={onNavigateCasos}
              className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between group cursor-pointer"
            >
              <div>
                <div className="relative aspect-[16/10] sm:aspect-[16/9] overflow-hidden bg-slate-900">
                  <img 
                    src={study.image} 
                    alt={study.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      if (!target.dataset.fallback) {
                        target.dataset.fallback = 'true';
                        target.src = '/assets/images/hero_real_estate_1791998371047.jpg';
                      }
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
                  
                  <div className="absolute top-3.5 left-3.5 flex items-center gap-1.5">
                    <span className="px-3 py-1 rounded-full bg-black/65 backdrop-blur-md text-white text-xs font-bold border border-white/20">
                      {study.city}, {study.country}
                    </span>
                  </div>

                  <div className="absolute top-3.5 right-3.5">
                    <span className="px-3 py-1 rounded-full bg-emerald-500 text-white text-[11px] font-extrabold uppercase tracking-wider shadow-sm">
                      100% Exited & Liquidated
                    </span>
                  </div>

                  <div className="absolute bottom-4 left-4 right-4 text-left">
                    <p className="text-xs text-[#B7E36A] uppercase font-bold tracking-wider">{study.strategy}</p>
                    <h3 className="text-lg sm:text-xl font-extrabold text-white leading-tight mt-0.5">{study.title}</h3>
                  </div>
                </div>

                <div className="p-6 sm:p-7 space-y-4 text-left">
                  <div className="grid grid-cols-3 gap-2 p-4 bg-[#F6F7F4] rounded-2xl border border-slate-200 text-center">
                    <div>
                      <p className="text-[10px] sm:text-xs text-slate-500 uppercase font-bold">Realized IRR</p>
                      <p className="text-lg sm:text-2xl font-black text-emerald-800">{study.realTIR}%</p>
                    </div>
                    <div className="border-x border-slate-200">
                      <p className="text-[10px] sm:text-xs text-slate-500 uppercase font-bold">Capital Gain</p>
                      <p className="text-lg sm:text-2xl font-black text-slate-900">+{study.capitalGain}%</p>
                    </div>
                    <div>
                      <p className="text-[10px] sm:text-xs text-slate-500 uppercase font-bold">Duration</p>
                      <p className="text-lg sm:text-2xl font-black text-slate-900">{study.durationMonths} mo</p>
                    </div>
                  </div>

                  <div className="space-y-2 text-xs sm:text-sm text-slate-600 pt-1">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">Total Returned:</span>
                      <span className="font-bold text-slate-900">{formatCurrency(study.totalReturned)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">Investors:</span>
                      <span className="font-semibold text-slate-900">{study.investorCount} participants</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">Notary Deed:</span>
                      <span className="font-mono text-emerald-800 font-bold">{study.spvDeedId}</span>
                    </div>
                  </div>

                  <p className="text-xs sm:text-sm text-slate-600 line-clamp-2 leading-relaxed pt-1">
                    {study.summary}
                  </p>
                </div>
              </div>

              <div className="p-5 sm:p-6 pt-0 border-t border-slate-100 flex items-center justify-between text-xs sm:text-sm font-bold text-emerald-800 group-hover:text-emerald-950">
                <span>View Real-Time Audit & Photos</span>
                <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform text-emerald-700" />
              </div>
            </div>
          ))}
        </div>

        {/* Dual Banner: Educational Blog & Academy */}
        <div className="p-8 sm:p-10 rounded-3xl bg-white border border-slate-200 shadow-sm flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-8 text-left">
          <div className="space-y-3 max-w-xl">
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-800 uppercase tracking-wider">
              <BookOpen className="w-4 h-4" />
              <span>Real Estate Tokenization Academy & Guides</span>
            </div>
            <h3 className="text-xl sm:text-2xl font-extrabold text-[#18211F]">
              Understand the mechanics of tokenized property before you invest
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Read comprehensive analyses on MiCA compliance, calculating real compound IRR returns, Spanish IRPF tax guidelines, and how participatory loans safeguard investor capital.
            </p>
            <div className="pt-2">
              <button
                onClick={onNavigateBlog}
                className="inline-flex items-center gap-2 text-xs font-bold text-emerald-800 hover:text-emerald-950 cursor-pointer"
              >
                <span>Browse All Educational Guides</span>
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
                className="p-4 rounded-2xl bg-[#F6F7F4] hover:bg-[#EEF2ED] border border-slate-200 transition-colors cursor-pointer space-y-1"
              >
                <div className="flex items-center justify-between text-[11px] text-slate-500">
                  <span className="font-bold text-emerald-800">{art.category}</span>
                  <span>{art.readTime}</span>
                </div>
                <h4 className="font-bold text-xs sm:text-sm text-[#18211F] line-clamp-1">{art.title}</h4>
                <p className="text-[11px] text-slate-600 line-clamp-1">{art.excerpt}</p>
              </div>
            ))}
          </div>
        </div>

      </div>
    </section>
  );
};
