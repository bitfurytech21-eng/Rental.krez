import React from 'react';
import { BookOpen, ArrowRight, Clock, TrendingUp } from 'lucide-react';
import { insightsService } from '../../lib/insightsService';

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
    <section className="py-20 sm:py-28 bg-[#0B1B30] border-b border-[#1D3860] text-white text-left">
      <div className="container max-w-[1240px] mx-auto px-4 sm:px-6">
        
        {/* Section Header */}
        <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-6 mb-12">
          <div className="space-y-3 max-w-2xl">
            <p className="text-[11px] font-bold text-[#BEE179] tracking-[0.2em] uppercase">
              Intelligence & Dossiers · Research Desk
            </p>

            <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-black text-[#BEE179] tracking-tight">
              European Real Estate <span className="text-white italic font-normal">Dossiers & Market Insights</span>
            </h2>

            <p className="text-sm sm:text-base text-[#D1E2F7] leading-relaxed font-normal">
              Institutional investigations, quarterly yield surveys, regulatory blueprints, and tokenized asset registry analysis inspired by premier European economic journalism.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={onNavigateInsights}
              className="py-3 px-5 text-xs font-bold bg-[#BEE179] text-[#0B1B30] hover:bg-[#AEDB5B] rounded-lg flex items-center gap-2 cursor-pointer shadow-xs transition-colors"
            >
              <span>Explore All Dossiers</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Editorial Feature Grid: Lead Dossier (Large) + 2 Secondary Columns */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          
          {/* Main Lead Investigation Card (7 Columns) */}
          <div className="lg:col-span-7 bg-[#102442] text-white rounded-xl overflow-hidden border border-[#1D3860] shadow-md flex flex-col justify-between group hover:border-[#BEE179]/60 transition-all">
            <div className="relative h-72 sm:h-80 overflow-hidden cursor-pointer" onClick={() => onNavigateDossier(leadDossier.slug)}>
              <img
                src={leadDossier.coverImage}
                alt={leadDossier.coverImageAlt}
                loading="lazy"
                className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-700 ease-out"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#102442] via-[#102442]/30 to-transparent" />
              
              <div className="absolute top-3 left-3 flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider bg-[#BEE179] text-[#0B1B30]">
                  {leadDossier.dossierIssue || 'Grand Dossier'}
                </span>
                <span className="px-2.5 py-1 rounded text-[10px] font-medium uppercase tracking-wider bg-black/60 backdrop-blur-md text-white border border-white/15">
                  {leadDossier.categoryName}
                </span>
              </div>

              <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-xs text-slate-200">
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-[#BEE179]" />
                  <span>{leadDossier.readTime}</span>
                </div>
                <span>{leadDossier.chapters?.length || 4} Chapter Investigation</span>
              </div>
            </div>

            <div className="p-6 sm:p-8 flex-1 flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <h3 
                  onClick={() => onNavigateDossier(leadDossier.slug)}
                  className="font-serif text-xl sm:text-2xl font-black text-[#BEE179] hover:underline transition-colors cursor-pointer leading-snug"
                >
                  {leadDossier.title}
                </h3>
                <p className="text-xs sm:text-sm text-[#D1E2F7] leading-relaxed line-clamp-3 font-normal">
                  {leadDossier.excerpt}
                </p>
              </div>

              {/* Author and Action */}
              <div className="pt-4 border-t border-[#1D3860] flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <img
                    src={leadDossier.author.avatar}
                    alt={leadDossier.author.name}
                    className="w-8 h-8 rounded-full object-cover border border-white/20"
                  />
                  <div>
                    <p className="text-xs font-semibold text-white leading-tight">{leadDossier.author.name}</p>
                    <p className="text-[10px] text-[#8EA7C7]">{leadDossier.author.role}</p>
                  </div>
                </div>

                <button
                  onClick={() => onNavigateDossier(leadDossier.slug)}
                  className="px-4 py-2 rounded-lg bg-[#BEE179] text-[#0B1B30] hover:bg-[#AEDB5B] text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors shrink-0 shadow-xs"
                >
                  <span>Read Investigation</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Secondary Investigative Features (5 Columns) */}
          <div className="lg:col-span-5 flex flex-col gap-5">
            {secondaryInsights.map((article) => (
              <div
                key={article.id}
                className="bg-[#102442] rounded-xl p-6 border border-[#1D3860] hover:border-[#BEE179]/60 hover:shadow-md transition-all flex flex-col justify-between space-y-4 group cursor-pointer"
                onClick={() => onNavigateDossier(article.slug)}
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[#0B1B30] text-[#BEE179] border border-[#1D3860]">
                      {article.categoryName}
                    </span>
                    <div className="flex items-center gap-1 text-[11px] text-[#8EA7C7]">
                      <Clock className="w-3 h-3 text-[#BEE179]" />
                      <span>{article.readTime}</span>
                    </div>
                  </div>

                  <h4 className="font-serif text-base sm:text-lg font-black text-[#BEE179] group-hover:underline transition-colors leading-snug">
                    {article.title}
                  </h4>

                  <p className="text-xs text-[#D1E2F7] leading-relaxed line-clamp-2">
                    {article.excerpt}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-[#1D3860]">
                  <div className="flex items-center gap-2">
                    <img
                      src={article.author.avatar}
                      alt={article.author.name}
                      className="w-6 h-6 rounded-full object-cover border border-[#1D3860]"
                    />
                    <span className="text-[11px] text-white font-medium">{article.author.name}</span>
                  </div>

                  <span className="text-xs font-bold text-[#BEE179] group-hover:translate-x-1 transition-transform flex items-center gap-1">
                    <span>Read Article</span>
                    <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            ))}

            {/* Quick Thematic Tags Bar */}
            <div className="p-5 rounded-xl bg-[#102442] border border-[#1D3860] space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-white">
                <TrendingUp className="w-3.5 h-3.5 text-[#BEE179]" />
                <span>Popular Research Themes</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {[
                  { label: 'SPV Ring-Fencing', cat: 'reglementation-fiscalite' },
                  { label: 'Prime Cap Rates', cat: 'barometre-immobilier' },
                  { label: 'ERC-20 Token Deeds', cat: 'proptech-tokenization' },
                  { label: 'Trophy Assets', cat: 'patrimoine-luxe' },
                  { label: 'EU MiCA Compliance', cat: 'reglementation-fiscalite' },
                ].map((tag) => (
                  <button
                    key={tag.label}
                    onClick={(e) => {
                      e.stopPropagation();
                      onNavigateCategory(tag.cat);
                    }}
                    className="text-[11px] font-bold px-2.5 py-1 rounded bg-[#0B1B30] hover:bg-[#BEE179] hover:text-[#0B1B30] text-[#D1E2F7] border border-[#1D3860] transition-colors cursor-pointer"
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
