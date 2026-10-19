import React from 'react';
import { BookOpen, ArrowRight, Clock, Calendar, TrendingUp, ShieldCheck } from 'lucide-react';
import { insightsService } from '../../lib/insightsService';
import { formatDate } from '../../lib/utils';

interface InsightsTeaserSectionProps {
  onNavigateInsights: () => void;
  onNavigateDossier: (slug: string) => void;
  onNavigateCategory: (categorySlug: string) => void;
}

export const InsightsTeaserSection: React.FC<InsightsTeaserSectionProps> = ({
  onNavigateInsights,
  onNavigateDossier,
  onNavigateCategory,
}) => {
  const allArticles = insightsService.getArticles({ status: 'published' });
  const leadDossier = allArticles.find(a => a.isFeatured && a.isDossier) || allArticles[0];
  const secondaryInsights = allArticles.filter(a => a.id !== leadDossier?.id).slice(0, 2);

  if (!leadDossier) return null;

  return (
    <section className="py-20 sm:py-28 bg-[#DFF0FC] border-b border-[#C8E1F5] text-[#18211F] text-left">
      <div className="container max-w-[1280px] mx-auto px-4">
        
        {/* Section Header with Immo Matin Editorial Brand Accents */}
        <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-6 mb-12">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#0E1F1B] text-[#B7E36A] text-xs font-black uppercase tracking-wider">
              <BookOpen className="w-3.5 h-3.5 text-[#B7E36A]" />
              <span>Kretz Intelligence & Dossiers</span>
            </div>

            <h2 className="text-3xl sm:text-4xl font-extrabold text-[#18211F] tracking-tight">
              European Real Estate <span className="text-emerald-800">Dossiers & Market Insights</span>
            </h2>

            <p className="text-sm sm:text-base text-[#69736F] leading-relaxed">
              Institutional investigations, quarterly cap rate surveys, regulatory compliance blueprints, 
              and tokenized asset registry analysis inspired by premier European real estate journalism.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onNavigateInsights}
              className="btn btn-primary py-3.5 px-6 text-xs font-bold bg-[#182D2A] text-white hover:bg-[#24423C] rounded-xl flex items-center gap-2 cursor-pointer shadow-xs transition-all"
            >
              <span>Explore All Dossiers & Wire</span>
              <ArrowRight className="w-4 h-4 text-[#B7E36A]" />
            </button>
          </div>
        </div>

        {/* Editorial Feature Grid: Lead Dossier (Large) + 2 Secondary Columns */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          
          {/* Main Lead Investigation Card (7 Columns) */}
          <div className="lg:col-span-7 bg-[#0E1F1B] text-white rounded-3xl overflow-hidden border border-slate-800 shadow-xl flex flex-col justify-between group hover:border-emerald-600/50 transition-all">
            <div className="relative h-72 sm:h-80 overflow-hidden cursor-pointer" onClick={() => onNavigateDossier(leadDossier.slug)}>
              <img
                src={leadDossier.coverImage}
                alt={leadDossier.coverImageAlt}
                loading="lazy"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0E1F1B] via-[#0E1F1B]/40 to-transparent" />
              
              <div className="absolute top-4 left-4 flex items-center gap-2 flex-wrap">
                <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#B7E36A] text-[#0E1F1B] shadow-md">
                  {leadDossier.dossierIssue || 'Grand Dossier'}
                </span>
                <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-black/60 backdrop-blur-md text-white border border-white/20">
                  {leadDossier.categoryName}
                </span>
              </div>

              <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between text-xs text-slate-300">
                <div className="flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-[#B7E36A]" />
                  <span>{leadDossier.readTime}</span>
                </div>
                <span>{leadDossier.chapters?.length || 4} Chapters Investigation</span>
              </div>
            </div>

            <div className="p-6 sm:p-8 flex-1 flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <h3 
                  onClick={() => onNavigateDossier(leadDossier.slug)}
                  className="text-xl sm:text-2xl font-black text-white hover:text-[#B7E36A] transition-colors cursor-pointer leading-snug"
                >
                  {leadDossier.title}
                </h3>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed line-clamp-3">
                  {leadDossier.excerpt}
                </p>
              </div>

              {/* Author and Action */}
              <div className="pt-4 border-t border-slate-800 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <img
                    src={leadDossier.author.avatar}
                    alt={leadDossier.author.name}
                    className="w-9 h-9 rounded-full object-cover border border-emerald-500/50"
                  />
                  <div>
                    <p className="text-xs font-bold text-white leading-tight">{leadDossier.author.name}</p>
                    <p className="text-[10px] text-slate-400">{leadDossier.author.role}</p>
                  </div>
                </div>

                <button
                  onClick={() => onNavigateDossier(leadDossier.slug)}
                  className="px-4 py-2 rounded-xl bg-[#B7E36A] hover:bg-[#cbf08b] text-[#0E1F1B] text-xs font-black flex items-center gap-1.5 cursor-pointer transition-colors shrink-0 shadow-md"
                >
                  <span>Read Investigation</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Secondary Investigative Features (5 Columns) */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            {secondaryInsights.map((article) => (
              <div
                key={article.id}
                className="bg-[#E8F4FD] rounded-3xl p-6 border border-[#C8E1F5] hover:border-emerald-300 hover:shadow-md transition-all flex flex-col justify-between space-y-4 group cursor-pointer"
                onClick={() => onNavigateDossier(article.slug)}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-200">
                      {article.categoryName}
                    </span>
                    <div className="flex items-center gap-1.5 text-[11px] text-[#69736F]">
                      <Clock className="w-3 h-3 text-emerald-700" />
                      <span>{article.readTime}</span>
                    </div>
                  </div>

                  <h4 className="text-base sm:text-lg font-bold text-[#18211F] group-hover:text-emerald-800 transition-colors leading-snug">
                    {article.title}
                  </h4>

                  <p className="text-xs text-[#69736F] leading-relaxed line-clamp-2">
                    {article.excerpt}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-[#E3E8E3]">
                  <div className="flex items-center gap-2">
                    <img
                      src={article.author.avatar}
                      alt={article.author.name}
                      className="w-7 h-7 rounded-full object-cover border border-slate-300"
                    />
                    <span className="text-[11px] font-semibold text-[#18211F]">{article.author.name}</span>
                  </div>

                  <span className="text-xs font-bold text-emerald-800 group-hover:translate-x-1 transition-transform flex items-center gap-1">
                    <span>Read Article</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            ))}

            {/* Quick Thematic Tags Bar */}
            <div className="p-5 rounded-3xl bg-white border border-[#E3E8E3] space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#18211F]">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-700" />
                <span>Popular Research Themes</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {[
                  { label: 'SPV Ring-Fencing', cat: 'reglementation-fiscalite' },
                  { label: 'Prime Cap Rates', cat: 'barometre-immobilier' },
                  { label: 'ERC-20 Token Deeds', cat: 'proptech-tokenization' },
                  { label: 'Ultra-Luxury Trophy Assets', cat: 'patrimoine-luxe' },
                  { label: 'EU MiCA Compliance', cat: 'reglementation-fiscalite' },
                ].map((tag) => (
                  <button
                    key={tag.label}
                    onClick={(e) => {
                      e.stopPropagation();
                      onNavigateCategory(tag.cat);
                    }}
                    className="text-[11px] font-semibold px-3 py-1 rounded-lg bg-[#EEF2EC] hover:bg-[#182D2A] hover:text-white text-[#182D2A] transition-colors cursor-pointer"
                  >
                    #{tag.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

        </div>

      </div>
    </section>
  );
};
