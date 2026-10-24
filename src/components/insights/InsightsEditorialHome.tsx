import React, { useState, useMemo } from 'react';
import { InsightArticle, InsightCategory } from '../../types/insights';
import { insightsService } from '../../lib/insightsService';
import {
  BookOpen,
  TrendingUp,
  Cpu,
  Scale,
  Crown,
  Search,
  Filter,
  Clock,
  Calendar,
  ArrowRight,
  ChevronRight,
  Share2,
  Sparkles,
  Download,
  Eye,
  FileText,
  Building2,
  Layers,
  ArrowUpRight,
  CheckCircle2,
  Bookmark
} from 'lucide-react';
import { formatDate } from '../../lib/utils';

interface InsightsEditorialHomeProps {
  onSelectArticle: (slug: string) => void;
  onSelectCategory?: (categorySlug: string) => void;
  initialCategory?: string;
  initialType?: string;
}

export const InsightsEditorialHome: React.FC<InsightsEditorialHomeProps> = ({
  onSelectArticle,
  onSelectCategory,
  initialCategory = 'all',
  initialType
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>(initialCategory);
  const [searchQuery, setSearchQuery] = useState('');
  const [onlyDossiers, setOnlyDossiers] = useState<boolean>(initialType === 'dossiers');
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterSubscribed, setNewsletterSubscribed] = useState(false);
  const [compendiumDownloadNotice, setCompendiumDownloadNotice] = useState(false);

  const categories = useMemo(() => insightsService.getCategories(), []);
  
  // All published articles
  const allArticles = useMemo(() => {
    return insightsService.getArticles({
      categorySlug: selectedCategory,
      isDossier: onlyDossiers ? true : undefined,
      searchQuery: searchQuery
    });
  }, [selectedCategory, onlyDossiers, searchQuery]);

  const featuredCover = useMemo(() => {
    if (selectedCategory !== 'all' || searchQuery.trim() || onlyDossiers) {
      return null;
    }
    return insightsService.getFeaturedCoverStory();
  }, [selectedCategory, searchQuery, onlyDossiers]);

  // Secondary prominent dossiers
  const secondaryDossiers = useMemo(() => {
    if (featuredCover) {
      return allArticles.filter(a => a.id !== featuredCover.id && a.isDossier).slice(0, 3);
    }
    return allArticles.filter(a => a.isDossier).slice(0, 3);
  }, [allArticles, featuredCover]);

  // Most read articles ranking (sidebar)
  const mostRead = useMemo(() => {
    const list = insightsService.getArticles();
    return [...list].sort((a, b) => (b.viewsCount || 0) - (a.viewsCount || 0)).slice(0, 5);
  }, []);

  const handleNewsletterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newsletterEmail && newsletterEmail.includes('@')) {
      setNewsletterSubscribed(true);
      setTimeout(() => {
        setNewsletterEmail('');
      }, 3000);
    }
  };

  const getCategoryIcon = (iconName: string) => {
    switch (iconName) {
      case 'TrendingUp': return <TrendingUp className="w-4 h-4" />;
      case 'Cpu': return <Cpu className="w-4 h-4" />;
      case 'Scale': return <Scale className="w-4 h-4" />;
      case 'Crown': return <Crown className="w-4 h-4" />;
      default: return <BookOpen className="w-4 h-4" />;
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#18211F]">
      
      {/* 1. Immo Matin Inspired Editorial Masthead & Financial Ticker */}
      <section className="border-b border-[#E3E8E3] bg-[#0E1F1B] text-white pt-10 pb-8 px-4 sm:px-6">
        <div className="max-w-[1440px] mx-auto">
          
          {/* Ticker Bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 pb-6 mb-6 border-b border-emerald-950/80 text-[11px] text-[#A2B8B1]">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-bold tracking-wider uppercase text-emerald-400">Kretz Editorial Wire</span>
              <span className="text-slate-500">|</span>
              <span>European Real Estate Intelligence & Dossiers</span>
            </div>

            <div className="hidden md:flex items-center gap-6 font-mono text-[11px]">
              <div>
                <span className="text-slate-400 mr-1.5">Euribor 3M:</span>
                <span className="font-bold text-white">3.18%</span>
                <span className="text-emerald-400 ml-1 text-[10px]">▼ -4 bps</span>
              </div>
              <div>
                <span className="text-slate-400 mr-1.5">Paris Prime Cap Rate:</span>
                <span className="font-bold text-white">4.25%</span>
                <span className="text-emerald-400 ml-1 text-[10px]">Stable</span>
              </div>
              <div>
                <span className="text-slate-400 mr-1.5">Madrid Salamanca Index:</span>
                <span className="font-bold text-white">€9,400/m²</span>
                <span className="text-emerald-400 ml-1 text-[10px]">▲ +7.2%</span>
              </div>
              <div>
                <span className="text-slate-400 mr-1.5">Active Tokenized SPVs:</span>
                <span className="font-bold text-emerald-400">100% Backed</span>
              </div>
            </div>

            <div className="text-[11px] font-semibold text-[#8DA69F]">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </div>
          </div>

          {/* Editorial Title Banner */}
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
            <div className="space-y-3 max-w-3xl text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#18332D] text-[#B7E36A] border border-[#234A42] text-xs font-bold uppercase tracking-widest">
                <span>The Independent Real Estate Review</span>
              </div>
              
              <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white leading-[1.1]">
                Real Estate <span className="text-[#B7E36A]">Dossiers & Insights</span>
              </h1>
              
              <p className="text-sm sm:text-base text-[#B0C4BE] leading-relaxed max-w-2xl">
                Rigorous editorial investigations, quarterly market barometers, PropTech tokenization blueprints, 
                and regulatory analyses across Paris, Madrid, and prime European trophy markets.
              </p>
            </div>

            {/* Quick Filter Switcher */}
            <div className="flex items-center gap-3 bg-[#162B26] p-1.5 rounded-2xl border border-[#234A42]">
              <button
                onClick={() => {
                  setOnlyDossiers(false);
                  setSelectedCategory('all');
                }}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  !onlyDossiers && selectedCategory === 'all'
                    ? 'bg-[#B7E36A] text-[#0E1F1B] shadow-md'
                    : 'text-[#B0C4BE] hover:text-white'
                }`}
              >
                All Publications ({insightsService.getArticles().length})
              </button>
              
              <button
                onClick={() => {
                  setOnlyDossiers(true);
                  setSelectedCategory('all');
                }}
                className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  onlyDossiers
                    ? 'bg-[#B7E36A] text-[#0E1F1B] shadow-md'
                    : 'text-[#B0C4BE] hover:text-white'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Major Dossiers ({insightsService.getArticles({ isDossier: true }).length})</span>
              </button>
            </div>
          </div>

        </div>
      </section>

      {/* 2. Interactive Category Navigation Bar & Live Search */}
      <section className="sticky top-[74px] sm:top-[80px] z-30 bg-white/95 backdrop-blur-md border-b border-[#E3E8E3] py-3.5 px-4 sm:px-6 shadow-xs">
        <div className="max-w-[1440px] mx-auto flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          
          {/* Category Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            <button
              onClick={() => {
                setSelectedCategory('all');
                setOnlyDossiers(false);
              }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                selectedCategory === 'all' && !onlyDossiers
                  ? 'bg-[#182D2A] text-white'
                  : 'bg-[#F2F5F2] text-[#4A5551] hover:text-[#182D2A] hover:bg-[#E7EBE7]'
              }`}
            >
              All Topics
            </button>

            {categories.map((cat) => (
              <button
                key={cat.slug}
                onClick={() => {
                  setSelectedCategory(cat.slug);
                  setOnlyDossiers(false);
                }}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap flex items-center gap-1.5 transition-all cursor-pointer ${
                  selectedCategory === cat.slug
                    ? 'bg-[#182D2A] text-white shadow-xs'
                    : 'bg-[#F2F5F2] text-[#4A5551] hover:text-[#182D2A] hover:bg-[#E7EBE7]'
                }`}
              >
                {getCategoryIcon(cat.icon)}
                <span>{cat.shortName}</span>
              </button>
            ))}
          </div>

          {/* Search Input */}
          <div className="relative w-full md:w-80 shrink-0">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search dossiers, topics, yields..."
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 bg-[#F9FAF8] text-xs text-[#18211F] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#182D2A] focus:bg-white transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            )}
          </div>

        </div>
      </section>

      {/* 3. Featured Lead Cover Story (Immo Matin Style Grande Enquête) */}
      {featuredCover && !searchQuery.trim() && (
        <section className="py-8 sm:py-12 px-4 sm:px-6 bg-[#F8FAF7] border-b border-[#E3E8E3]">
          <div className="max-w-[1440px] mx-auto text-left">
            
            <div 
              onClick={() => onSelectArticle(featuredCover.slug)}
              className="bg-white rounded-3xl border border-[#DCE4DA] overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 grid grid-cols-1 lg:grid-cols-12 group cursor-pointer"
            >
              
              {/* Cover Visual */}
              <div className="lg:col-span-7 relative aspect-[16/10] lg:aspect-auto overflow-hidden bg-slate-900">
                <img
                  src={featuredCover.coverImage}
                  alt={featuredCover.coverImageAlt}
                  className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-700"
                  loading="eager"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                
                {/* Floating Badges */}
                <div className="absolute top-4 left-4 flex flex-wrap items-center gap-2">
                  <span className="px-3 py-1 rounded-full bg-[#10B981] text-white text-[11px] font-black uppercase tracking-wider shadow-md">
                    {featuredCover.dossierIssue || 'Cover Story Dossier'}
                  </span>
                  <span className="px-3 py-1 rounded-full bg-black/60 backdrop-blur-md text-white text-[11px] font-semibold border border-white/20">
                    {featuredCover.categoryName}
                  </span>
                </div>

                <div className="absolute bottom-4 left-4 right-4 text-white text-xs text-white/80 italic hidden sm:block">
                  {featuredCover.coverImageCaption}
                </div>
              </div>

              {/* Cover Story Narrative */}
              <div className="lg:col-span-5 p-6 sm:p-10 flex flex-col justify-between space-y-6">
                
                <div className="space-y-4">
                  <div className="flex items-center gap-3 text-xs text-[#69736F]">
                    <span className="font-semibold text-emerald-800">{featuredCover.author.organization || 'Kretz Wealth Research'}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {featuredCover.readTime}
                    </span>
                    <span>•</span>
                    <span>{formatDate(featuredCover.publishedAt)}</span>
                  </div>

                  <h2 className="text-2xl sm:text-3xl xl:text-4xl font-black text-[#18211F] group-hover:text-emerald-900 transition-colors leading-tight">
                    {featuredCover.title}
                  </h2>

                  <p className="text-xs sm:text-sm text-[#4A5551] leading-relaxed line-clamp-4">
                    {featuredCover.excerpt}
                  </p>

                  {/* Key Takeaways Preview */}
                  {featuredCover.keyTakeaways && featuredCover.keyTakeaways.length > 0 && (
                    <div className="p-4 rounded-2xl bg-[#F1F5F9] border border-[#E2E8F0] space-y-2">
                      <span className="text-[10px] font-black uppercase tracking-wider text-emerald-900 block">
                        Dossier Key Findings:
                      </span>
                      <ul className="text-xs text-[#2A3532] space-y-1.5 list-disc pl-4">
                        {featuredCover.keyTakeaways.slice(0, 2).map((takeaway, i) => (
                          <li key={i} className="line-clamp-2">{takeaway}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {/* Footer with Author and CTA */}
                <div className="pt-4 border-t border-[#E3E8E3] flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <img
                      src={featuredCover.author.avatar}
                      alt={featuredCover.author.name}
                      className="w-10 h-10 rounded-full object-cover border-2 border-emerald-600/30"
                    />
                    <div className="text-left">
                      <span className="text-xs font-bold text-[#18211F] block">{featuredCover.author.name}</span>
                      <span className="text-[11px] text-[#69736F] block truncate max-w-[180px]">{featuredCover.author.role}</span>
                    </div>
                  </div>

                  <span className="btn bg-[#182D2A] text-white group-hover:bg-[#24423C] text-xs font-bold px-4 py-2.5 rounded-xl flex items-center gap-1.5 transition-colors shadow-xs">
                    <span>Read Dossier</span>
                    <ArrowRight className="w-3.5 h-3.5 text-[#B7E36A]" />
                  </span>
                </div>

              </div>

            </div>

          </div>
        </section>
      )}

      {/* 4. Secondary Lead Dossiers Carousel / Multi-Part Guides */}
      {secondaryDossiers.length > 0 && !searchQuery.trim() && (
        <section className="py-10 px-4 sm:px-6 max-w-[1440px] mx-auto text-left">
          <div className="flex items-center justify-between mb-6">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 block">Editorial Focus</span>
              <h3 className="text-xl sm:text-2xl font-black text-[#18211F]">In-Depth Investigative Dossiers</h3>
            </div>
            <button
              onClick={() => {
                setOnlyDossiers(true);
                setSelectedCategory('all');
              }}
              className="text-xs font-bold text-emerald-800 hover:text-emerald-950 flex items-center gap-1 cursor-pointer"
            >
              <span>Explore All Dossiers</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {secondaryDossiers.map((art) => (
              <div
                key={art.id}
                onClick={() => onSelectArticle(art.slug)}
                className="bg-white rounded-2xl border border-[#E3E8E3] overflow-hidden shadow-xs hover:shadow-lg transition-all duration-300 flex flex-col justify-between group cursor-pointer"
              >
                <div>
                  <div className="relative aspect-[16/10] overflow-hidden bg-slate-900">
                    <img
                      src={art.coverImage}
                      alt={art.coverImageAlt}
                      className="w-full h-full object-cover group-hover:scale-104 transition-transform duration-500"
                      loading="lazy"
                    />
                    <div className="absolute top-3 left-3 flex items-center gap-1.5">
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-800/90 text-white text-[10px] font-bold">
                        {art.dossierIssue || 'Dossier'}
                      </span>
                    </div>
                  </div>

                  <div className="p-5 space-y-3">
                    <div className="flex items-center justify-between text-[11px] text-[#69736F]">
                      <span className="font-semibold text-emerald-800">{art.categoryName}</span>
                      <span>{art.readTime}</span>
                    </div>

                    <h4 className="font-bold text-base text-[#18211F] group-hover:text-emerald-900 transition-colors line-clamp-2 leading-snug">
                      {art.title}
                    </h4>

                    <p className="text-xs text-[#5E6864] line-clamp-3 leading-relaxed">
                      {art.excerpt}
                    </p>
                  </div>
                </div>

                <div className="p-5 pt-0 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-[11px] text-slate-500 font-medium">By {art.author.name}</span>
                  <span className="text-emerald-800 font-bold flex items-center gap-1 group-hover:underline">
                    Read Report →
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 5. Main Content Grid: Articles Feed & Editorial Sidebar */}
      <section className="py-12 px-4 sm:px-6 bg-[#F8FAFC] border-t border-[#E2E8F0]">
        <div className="max-w-[1440px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 text-left">
          
          {/* Left Column: Articles Stream (8 cols) */}
          <div className="lg:col-span-8 space-y-6">
            
            <div className="flex items-center justify-between border-b border-[#DCE4DA] pb-3">
              <div>
                <h3 className="text-lg font-black text-[#18211F]">
                  {selectedCategory === 'all' 
                    ? (onlyDossiers ? 'All Major Dossiers' : 'Latest Insights & Market Analyses') 
                    : categories.find(c => c.slug === selectedCategory)?.name || 'Category Articles'}
                </h3>
                <span className="text-xs text-[#69736F]">
                  Showing {allArticles.length} published editorial reports
                </span>
              </div>

              {(selectedCategory !== 'all' || searchQuery || onlyDossiers) && (
                <button
                  onClick={() => {
                    setSelectedCategory('all');
                    setSearchQuery('');
                    setOnlyDossiers(false);
                  }}
                  className="text-xs text-emerald-800 hover:underline font-bold"
                >
                  Reset Filters
                </button>
              )}
            </div>

            {/* Articles List */}
            {allArticles.length === 0 ? (
              <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 space-y-3">
                <BookOpen className="w-10 h-10 text-slate-300 mx-auto" />
                <h4 className="font-bold text-base text-slate-700">No matching articles found</h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Try adjusting your search query or selecting a different category from the filter bar above.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {allArticles.map((article) => (
                  <article
                    key={article.id}
                    onClick={() => onSelectArticle(article.slug)}
                    className="p-5 sm:p-6 bg-white rounded-2xl border border-[#E3E8E3] hover:border-emerald-600/50 shadow-xs hover:shadow-md transition-all duration-200 grid grid-cols-1 sm:grid-cols-12 gap-5 group cursor-pointer"
                  >
                    {/* Visual */}
                    <div className="sm:col-span-4 relative aspect-[16/10] sm:aspect-square md:aspect-[4/3] rounded-xl overflow-hidden bg-slate-900 shrink-0">
                      <img
                        src={article.coverImage}
                        alt={article.coverImageAlt}
                        className="w-full h-full object-cover group-hover:scale-104 transition-transform duration-500"
                        loading="lazy"
                      />
                      {article.isDossier && (
                        <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-[#0E1F1B] text-[#B7E36A] text-[9px] font-black uppercase tracking-wider">
                          Dossier
                        </span>
                      )}
                    </div>

                    {/* Content */}
                    <div className="sm:col-span-8 flex flex-col justify-between space-y-2">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-[11px] text-[#69736F]">
                          <span className="font-bold text-emerald-800 uppercase tracking-wider">
                            {article.categoryName}
                          </span>
                          <span className="flex items-center gap-1 font-mono">
                            <Clock className="w-3 h-3" />
                            {article.readTime}
                          </span>
                        </div>

                        <h4 className="font-bold text-base sm:text-lg text-[#18211F] group-hover:text-emerald-900 transition-colors leading-snug">
                          {article.title}
                        </h4>

                        <p className="text-xs text-[#5A6561] line-clamp-2 leading-relaxed">
                          {article.excerpt}
                        </p>

                        {/* Tag pills */}
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {article.tags.slice(0, 3).map((tag) => (
                            <span key={tag} className="text-[10px] px-2 py-0.5 rounded-md bg-[#EEF2EC] text-[#2C4A42] font-semibold">
                              #{tag}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-[#69736F]">
                        <div className="flex items-center gap-2">
                          <img
                            src={article.author.avatar}
                            alt={article.author.name}
                            className="w-6 h-6 rounded-full object-cover"
                          />
                          <span className="text-[11px] font-medium text-[#18211F]">{article.author.name}</span>
                          <span className="text-[10px] text-slate-400">• {formatDate(article.publishedAt)}</span>
                        </div>

                        <span className="text-emerald-800 font-bold flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                          <span>Read</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </span>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}

          </div>

          {/* Right Column: Editorial Sidebar (4 cols) */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* 1. Most Read Ranking / Top 5 (Immo Matin Style) */}
            <div className="bg-white p-6 rounded-3xl border border-[#E3E8E3] shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-800" />
                  <h4 className="font-black text-sm uppercase tracking-wider text-[#18211F]">
                    Most Read Dossiers
                  </h4>
                </div>
                <span className="text-[10px] font-bold text-slate-400">Weekly Pulse</span>
              </div>

              <div className="space-y-4">
                {mostRead.map((item, index) => (
                  <div
                    key={item.id}
                    onClick={() => onSelectArticle(item.slug)}
                    className="flex items-start gap-3.5 group cursor-pointer pb-3.5 border-b border-slate-50 last:border-none last:pb-0"
                  >
                    <span className="font-mono text-xl font-black text-emerald-700/40 group-hover:text-emerald-700 transition-colors shrink-0">
                      0{index + 1}
                    </span>
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">
                        {item.categoryName}
                      </span>
                      <h5 className="font-bold text-xs text-[#18211F] group-hover:text-emerald-900 transition-colors line-clamp-2 leading-snug">
                        {item.title}
                      </h5>
                      <div className="flex items-center gap-2 text-[10px] text-slate-400">
                        <span>{item.readTime}</span>
                        <span>•</span>
                        <span>{item.viewsCount} reads</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 2. Whitepaper & Institutional Dossier Download Hub */}
            <div className="bg-gradient-to-br from-[#102420] to-[#182D2A] text-white p-6 rounded-3xl shadow-md space-y-4">
              <div className="w-10 h-10 rounded-2xl bg-[#24423C] text-[#B7E36A] flex items-center justify-center">
                <Download className="w-5 h-5" />
              </div>

              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#B7E36A] block">
                  Institutional Whitepaper
                </span>
                <h4 className="text-base font-extrabold text-white mt-1">
                  The 2026 European Prime Real Estate Yield Compendium
                </h4>
                <p className="text-xs text-[#A0B5AE] mt-2 leading-relaxed">
                  Download our complete 64-page research compendium with complete cadastral registry datasets, 
                  SPV legal templates, and micro-market cap rate projections.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-white/10 text-xs font-mono flex items-center justify-between text-white/90">
                <span>Format: PDF / A4 Format</span>
                <span className="font-bold text-[#B7E36A]">4.8 MB</span>
              </div>

              {compendiumDownloadNotice ? (
                <div className="p-3 bg-emerald-950/80 border border-[#B7E36A]/50 rounded-xl text-center space-y-1">
                  <p className="text-xs font-bold text-[#B7E36A] flex items-center justify-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Research Compendium Generated</span>
                  </p>
                  <p className="text-[11px] text-slate-300">64-Page PDF Compendium queued for viewing.</p>
                </div>
              ) : (
                <button
                  onClick={() => {
                    setCompendiumDownloadNotice(true);
                    setTimeout(() => {
                      window.print();
                    }, 500);
                  }}
                  className="w-full py-2.5 px-4 rounded-xl bg-[#B7E36A] hover:bg-[#a5d259] text-[#0E1F1B] font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-sm"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Free Research PDF</span>
                </button>
              )}
            </div>

            {/* 3. The Kretz Real Estate Dispatch (Newsletter) */}
            <div className="bg-white p-6 rounded-3xl border border-[#E3E8E3] shadow-xs space-y-4">
              <div className="flex items-center gap-2 text-emerald-800">
                <FileText className="w-4 h-4" />
                <h4 className="font-bold text-xs uppercase tracking-wider">
                  The Editorial Dispatch
                </h4>
              </div>

              <div className="space-y-1">
                <h5 className="font-black text-sm text-[#18211F]">
                  Weekly European Property Intelligence
                </h5>
                <p className="text-xs text-[#69736F] leading-relaxed">
                  Join 14,000+ family office directors, institutional allocators, and real estate professionals receiving our curated Thursday briefings.
                </p>
              </div>

              {newsletterSubscribed ? (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>You are subscribed to the Kretz Dispatch.</span>
                </div>
              ) : (
                <form onSubmit={handleNewsletterSubmit} className="space-y-2">
                  <input
                    type="email"
                    required
                    value={newsletterEmail}
                    onChange={(e) => setNewsletterEmail(e.target.value)}
                    placeholder="Enter your corporate email..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-[#18211F] focus:outline-none focus:ring-2 focus:ring-[#182D2A]"
                  />
                  <button
                    type="submit"
                    className="w-full py-2.5 rounded-xl bg-[#182D2A] hover:bg-[#24423C] text-white text-xs font-bold transition-colors cursor-pointer"
                  >
                    Subscribe to Dispatch
                  </button>
                </form>
              )}

              <span className="text-[10px] text-slate-400 block">
                Strict no-spam policy. Unsubscribe anytime with 1-click.
              </span>
            </div>

            {/* 4. Category Taxonomy Pills Card */}
            <div className="bg-white p-6 rounded-3xl border border-[#E3E8E3] shadow-xs space-y-3">
              <h4 className="font-bold text-xs uppercase tracking-wider text-[#18211F]">
                Dossier Categories
              </h4>
              <div className="space-y-1.5">
                {categories.map((c) => {
                  const count = insightsService.getArticles({ categorySlug: c.slug }).length;
                  return (
                    <button
                      key={c.slug}
                      onClick={() => setSelectedCategory(c.slug)}
                      className="w-full py-2 px-3 rounded-xl hover:bg-[#F2F5F2] flex items-center justify-between text-xs transition-colors cursor-pointer text-left"
                    >
                      <span className="font-semibold text-[#2C3835]">{c.name}</span>
                      <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-bold">
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

          </div>

        </div>
      </section>

    </div>
  );
};
