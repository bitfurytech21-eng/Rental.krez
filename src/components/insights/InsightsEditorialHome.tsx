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
    <div className="min-h-screen bg-[#0B1B30] text-white">
      
      {/* 1. Editorial Masthead & Financial Ticker */}
      <section className="border-b border-[#1D3860] bg-[#0B1B30] text-white pt-10 pb-8 px-4 sm:px-6">
        <div className="max-w-[1440px] mx-auto">
          
          {/* Ticker Bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 pb-6 mb-6 border-b border-[#1D3860] text-[11px] text-[#8EA7C7]">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#BEE179] animate-pulse" />
              <span className="font-bold tracking-wider uppercase text-[#BEE179]">Kretz Editorial Wire</span>
              <span className="text-[#1D3860]">|</span>
              <span>European Real Estate Intelligence & Dossiers</span>
            </div>

            <div className="hidden md:flex items-center gap-6 font-mono text-[11px]">
              <div>
                <span className="text-[#8EA7C7] mr-1.5">Euribor 3M:</span>
                <span className="font-bold text-white">3.18%</span>
                <span className="text-[#BEE179] ml-1 text-[10px]">▼ -4 bps</span>
              </div>
              <div>
                <span className="text-[#8EA7C7] mr-1.5">Paris Prime Cap Rate:</span>
                <span className="font-bold text-white">4.25%</span>
                <span className="text-[#BEE179] ml-1 text-[10px]">Stable</span>
              </div>
              <div>
                <span className="text-[#8EA7C7] mr-1.5">Madrid Salamanca Index:</span>
                <span className="font-bold text-white">€9,400/m²</span>
                <span className="text-[#BEE179] ml-1 text-[10px]">▲ +7.2%</span>
              </div>
              <div>
                <span className="text-[#8EA7C7] mr-1.5">Active Tokenized SPVs:</span>
                <span className="font-bold text-[#BEE179]">100% Backed</span>
              </div>
            </div>

            <div className="text-[11px] font-semibold text-[#8EA7C7]">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </div>
          </div>

          {/* Editorial Title Banner */}
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
            <div className="space-y-3 max-w-3xl text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#102442] text-[#BEE179] border border-[#1D3860] text-xs font-bold uppercase tracking-widest">
                <span>The Independent Real Estate Review</span>
              </div>
              
              <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-[#BEE179] leading-[1.1]">
                Real Estate <span className="text-white">Dossiers & Insights</span>
              </h1>
              
              <p className="text-sm sm:text-base text-[#D1E2F7] leading-relaxed max-w-2xl">
                Rigorous editorial investigations, quarterly market barometers, PropTech tokenization blueprints, 
                and regulatory analyses across Paris, Madrid, and prime European trophy markets.
              </p>
            </div>

            {/* Quick Filter Switcher */}
            <div className="flex items-center gap-3 bg-[#102442] p-1.5 rounded-2xl border border-[#1D3860]">
              <button
                onClick={() => {
                  setOnlyDossiers(false);
                  setSelectedCategory('all');
                }}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  !onlyDossiers && selectedCategory === 'all'
                    ? 'bg-[#BEE179] text-[#0B1B30] shadow-md'
                    : 'text-[#D1E2F7] hover:text-white'
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
                    ? 'bg-[#BEE179] text-[#0B1B30] shadow-md'
                    : 'text-[#D1E2F7] hover:text-white'
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
      <section className="sticky top-[74px] sm:top-[80px] z-30 bg-[#0B1B30]/95 backdrop-blur-md border-b border-[#1D3860] py-3.5 px-4 sm:px-6 shadow-xs">
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
                  ? 'bg-[#BEE179] text-[#0B1B30]'
                  : 'bg-[#102442] text-[#D1E2F7] hover:text-white border border-[#1D3860]'
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
                    ? 'bg-[#BEE179] text-[#0B1B30] shadow-xs'
                    : 'bg-[#102442] text-[#D1E2F7] hover:text-white border border-[#1D3860]'
                }`}
              >
                {getCategoryIcon(cat.icon)}
                <span>{cat.shortName}</span>
              </button>
            ))}
          </div>

          {/* Search Input */}
          <div className="relative w-full md:w-80 shrink-0">
            <Search className="w-4 h-4 text-[#8EA7C7] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search dossiers, topics, yields..."
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-[#1D3860] bg-[#102442] text-xs text-white placeholder-[#8EA7C7] focus:outline-none focus:ring-2 focus:ring-[#BEE179] transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#8EA7C7] hover:text-white"
              >
                ✕
              </button>
            )}
          </div>

        </div>
      </section>

      {/* 3. Featured Lead Cover Story */}
      {featuredCover && !searchQuery.trim() && (
        <section className="py-8 sm:py-12 px-4 sm:px-6 bg-[#0B1B30] border-b border-[#1D3860]">
          <div className="max-w-[1440px] mx-auto text-left">
            
            <div 
              onClick={() => onSelectArticle(featuredCover.slug)}
              className="bg-[#102442] rounded-3xl border border-[#1D3860] overflow-hidden shadow-sm hover:shadow-xl hover:border-[#BEE179]/60 transition-all duration-300 grid grid-cols-1 lg:grid-cols-12 group cursor-pointer"
            >
              
              {/* Cover Visual */}
              <div className="lg:col-span-7 relative aspect-[16/10] lg:aspect-auto overflow-hidden bg-[#0B1B30]">
                <img
                  src={featuredCover.coverImage}
                  alt={featuredCover.coverImageAlt}
                  className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-700"
                  loading="eager"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                
                {/* Floating Badges */}
                <div className="absolute top-4 left-4 flex flex-wrap items-center gap-2">
                  <span className="px-3 py-1 rounded-full bg-[#BEE179] text-[#0B1B30] text-[11px] font-black uppercase tracking-wider shadow-md">
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
                  <div className="flex items-center gap-3 text-xs text-[#8EA7C7]">
                    <span className="font-bold text-[#BEE179]">{featuredCover.author.organization || 'Kretz Wealth Research'}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-[#BEE179]" />
                      {featuredCover.readTime}
                    </span>
                    <span>•</span>
                    <span>{formatDate(featuredCover.publishedAt)}</span>
                  </div>

                  <h2 className="text-2xl sm:text-3xl xl:text-4xl font-black text-[#BEE179] group-hover:underline transition-colors leading-tight">
                    {featuredCover.title}
                  </h2>

                  <p className="text-xs sm:text-sm text-[#D1E2F7] leading-relaxed line-clamp-4">
                    {featuredCover.excerpt}
                  </p>

                  {/* Key Takeaways Preview */}
                  {featuredCover.keyTakeaways && featuredCover.keyTakeaways.length > 0 && (
                    <div className="p-4 rounded-2xl bg-[#0B1B30] border border-[#1D3860] space-y-2">
                      <span className="text-[10px] font-black uppercase tracking-wider text-[#BEE179] block">
                        Dossier Key Findings:
                      </span>
                      <ul className="text-xs text-[#D1E2F7] space-y-1.5 list-disc pl-4">
                        {featuredCover.keyTakeaways.slice(0, 2).map((takeaway, i) => (
                          <li key={i} className="line-clamp-2">{takeaway}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {/* Footer with Author and CTA */}
                <div className="pt-4 border-t border-[#1D3860] flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <img
                      src={featuredCover.author.avatar}
                      alt={featuredCover.author.name}
                      className="w-10 h-10 rounded-full object-cover border-2 border-[#BEE179]/50"
                    />
                    <div className="text-left">
                      <span className="text-xs font-bold text-white block">{featuredCover.author.name}</span>
                      <span className="text-[11px] text-[#8EA7C7] block truncate max-w-[180px]">{featuredCover.author.role}</span>
                    </div>
                  </div>

                  <span className="btn bg-[#BEE179] text-[#0B1B30] hover:bg-[#AEDB5B] text-xs font-bold px-4 py-2.5 rounded-xl flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer">
                    <span>Read Dossier</span>
                    <ArrowRight className="w-3.5 h-3.5 text-[#0B1B30]" />
                  </span>
                </div>

              </div>

            </div>

          </div>
        </section>
      )}

      {/* 4. Secondary Lead Dossiers Carousel */}
      {secondaryDossiers.length > 0 && !searchQuery.trim() && (
        <section className="py-10 px-4 sm:px-6 max-w-[1440px] mx-auto text-left">
          <div className="flex items-center justify-between mb-6">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-[#BEE179] block">Editorial Focus</span>
              <h3 className="text-xl sm:text-2xl font-black text-[#BEE179]">In-Depth Investigative Dossiers</h3>
            </div>
            <button
              onClick={() => {
                setOnlyDossiers(true);
                setSelectedCategory('all');
              }}
              className="text-xs font-bold text-[#BEE179] hover:underline flex items-center gap-1 cursor-pointer"
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
                className="bg-[#102442] rounded-2xl border border-[#1D3860] overflow-hidden shadow-xs hover:border-[#BEE179]/60 hover:shadow-lg transition-all duration-300 flex flex-col justify-between group cursor-pointer"
              >
                <div>
                  <div className="relative aspect-[16/10] overflow-hidden bg-[#0B1B30]">
                    <img
                      src={art.coverImage}
                      alt={art.coverImageAlt}
                      className="w-full h-full object-cover group-hover:scale-104 transition-transform duration-500"
                      loading="lazy"
                    />
                    <div className="absolute top-3 left-3 flex items-center gap-1.5">
                      <span className="px-2.5 py-0.5 rounded-full bg-[#BEE179] text-[#0B1B30] text-[10px] font-bold">
                        {art.dossierIssue || 'Dossier'}
                      </span>
                    </div>
                  </div>

                  <div className="p-5 space-y-3">
                    <div className="flex items-center justify-between text-[11px] text-[#8EA7C7]">
                      <span className="font-bold text-[#BEE179]">{art.categoryName}</span>
                      <span>{art.readTime}</span>
                    </div>

                    <h4 className="font-black text-base text-[#BEE179] group-hover:underline transition-colors line-clamp-2 leading-snug">
                      {art.title}
                    </h4>

                    <p className="text-xs text-[#D1E2F7] line-clamp-3 leading-relaxed">
                      {art.excerpt}
                    </p>
                  </div>
                </div>

                <div className="p-5 pt-0 border-t border-[#1D3860] flex items-center justify-between text-xs">
                  <span className="text-[11px] text-[#8EA7C7] font-medium">By {art.author.name}</span>
                  <span className="text-[#BEE179] font-bold flex items-center gap-1 group-hover:underline">
                    Read Report →
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 5. Main Content Grid: Articles Feed & Editorial Sidebar */}
      <section className="py-12 px-4 sm:px-6 bg-[#0B1B30] border-t border-[#1D3860]">
        <div className="max-w-[1440px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 text-left">
          
          {/* Left Column: Articles Stream (8 cols) */}
          <div className="lg:col-span-8 space-y-6">
            
            <div className="flex items-center justify-between border-b border-[#1D3860] pb-3">
              <div>
                <h3 className="text-lg font-black text-[#BEE179]">
                  {selectedCategory === 'all' 
                    ? (onlyDossiers ? 'All Major Dossiers' : 'Latest Insights & Market Analyses') 
                    : categories.find(c => c.slug === selectedCategory)?.name || 'Category Articles'}
                </h3>
                <span className="text-xs text-[#8EA7C7]">
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
                  className="text-xs text-[#BEE179] hover:underline font-bold"
                >
                  Reset Filters
                </button>
              )}
            </div>

            {/* Articles List */}
            {allArticles.length === 0 ? (
              <div className="p-12 text-center bg-[#102442] rounded-2xl border border-[#1D3860] space-y-3">
                <BookOpen className="w-10 h-10 text-[#8EA7C7] mx-auto" />
                <h4 className="font-bold text-base text-white">No matching articles found</h4>
                <p className="text-xs text-[#8EA7C7] max-w-sm mx-auto">
                  Try adjusting your search query or selecting a different category from the filter bar above.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {allArticles.map((article) => (
                  <article
                    key={article.id}
                    onClick={() => onSelectArticle(article.slug)}
                    className="p-5 sm:p-6 bg-[#102442] rounded-2xl border border-[#1D3860] hover:border-[#BEE179]/60 shadow-xs hover:shadow-md transition-all duration-200 grid grid-cols-1 sm:grid-cols-12 gap-5 group cursor-pointer"
                  >
                    {/* Visual */}
                    <div className="sm:col-span-4 relative aspect-[16/10] sm:aspect-square md:aspect-[4/3] rounded-xl overflow-hidden bg-[#0B1B30] shrink-0">
                      <img
                        src={article.coverImage}
                        alt={article.coverImageAlt}
                        className="w-full h-full object-cover group-hover:scale-104 transition-transform duration-500"
                        loading="lazy"
                      />
                      {article.isDossier && (
                        <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-[#BEE179] text-[#0B1B30] text-[9px] font-black uppercase tracking-wider">
                          Dossier
                        </span>
                      )}
                    </div>

                    {/* Content */}
                    <div className="sm:col-span-8 flex flex-col justify-between space-y-2">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-[11px] text-[#8EA7C7]">
                          <span className="font-bold text-[#BEE179] uppercase tracking-wider">
                            {article.categoryName}
                          </span>
                          <span className="flex items-center gap-1 font-mono">
                            <Clock className="w-3 h-3 text-[#BEE179]" />
                            {article.readTime}
                          </span>
                        </div>

                        <h4 className="font-black text-base sm:text-lg text-[#BEE179] group-hover:underline transition-colors leading-snug">
                          {article.title}
                        </h4>

                        <p className="text-xs text-[#D1E2F7] line-clamp-2 leading-relaxed">
                          {article.excerpt}
                        </p>

                        {/* Tag pills */}
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {article.tags.slice(0, 3).map((tag) => (
                            <span key={tag} className="text-[10px] px-2 py-0.5 rounded-md bg-[#0B1B30] text-[#BEE179] border border-[#1D3860] font-bold">
                              #{tag}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="pt-3 border-t border-[#1D3860] flex items-center justify-between text-xs text-[#8EA7C7]">
                        <div className="flex items-center gap-2">
                          <img
                            src={article.author.avatar}
                            alt={article.author.name}
                            className="w-6 h-6 rounded-full object-cover"
                          />
                          <span className="text-[11px] font-bold text-white">{article.author.name}</span>
                          <span className="text-[10px] text-[#8EA7C7]">• {formatDate(article.publishedAt)}</span>
                        </div>

                        <span className="text-[#BEE179] font-bold flex items-center gap-1 group-hover:translate-x-1 transition-transform">
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
            
            {/* 1. Most Read Ranking / Top 5 */}
            <div className="bg-[#102442] p-6 rounded-3xl border border-[#1D3860] shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#1D3860]">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-[#BEE179]" />
                  <h4 className="font-black text-sm uppercase tracking-wider text-[#BEE179]">
                    Most Read Dossiers
                  </h4>
                </div>
                <span className="text-[10px] font-bold text-[#8EA7C7]">Weekly Pulse</span>
              </div>

              <div className="space-y-4">
                {mostRead.map((item, index) => (
                  <div
                    key={item.id}
                    onClick={() => onSelectArticle(item.slug)}
                    className="flex items-start gap-3.5 group cursor-pointer pb-3.5 border-b border-[#1D3860] last:border-none last:pb-0"
                  >
                    <span className="font-mono text-xl font-black text-[#BEE179] group-hover:underline transition-colors shrink-0">
                      0{index + 1}
                    </span>
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-[#BEE179] uppercase tracking-wider block">
                        {item.categoryName}
                      </span>
                      <h5 className="font-bold text-xs text-white group-hover:text-[#BEE179] transition-colors line-clamp-2 leading-snug">
                        {item.title}
                      </h5>
                      <div className="flex items-center gap-2 text-[10px] text-[#8EA7C7]">
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
            <div className="bg-[#102442] text-white p-6 rounded-3xl border border-[#1D3860] shadow-md space-y-4">
              <div className="w-10 h-10 rounded-2xl bg-[#0B1B30] border border-[#1D3860] text-[#BEE179] flex items-center justify-center">
                <Download className="w-5 h-5" />
              </div>

              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#BEE179] block">
                  Institutional Whitepaper
                </span>
                <h4 className="text-base font-extrabold text-white mt-1">
                  The 2026 European Prime Real Estate Yield Compendium
                </h4>
                <p className="text-xs text-[#D1E2F7] mt-2 leading-relaxed">
                  Download our complete 64-page research compendium with complete cadastral registry datasets, 
                  SPV legal templates, and micro-market cap rate projections.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-[#0B1B30] border border-[#1D3860] text-xs font-mono flex items-center justify-between text-white/90">
                <span>Format: PDF / A4 Format</span>
                <span className="font-bold text-[#BEE179]">4.8 MB</span>
              </div>

              {compendiumDownloadNotice ? (
                <div className="p-3 bg-[#0B1B30] border border-[#BEE179]/50 rounded-xl text-center space-y-1">
                  <p className="text-xs font-bold text-[#BEE179] flex items-center justify-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Research Compendium Generated</span>
                  </p>
                  <p className="text-[11px] text-[#D1E2F7]">64-Page PDF Compendium queued for viewing.</p>
                </div>
              ) : (
                <button
                  onClick={() => {
                    setCompendiumDownloadNotice(true);
                    setTimeout(() => {
                      window.print();
                    }, 500);
                  }}
                  className="w-full py-2.5 px-4 rounded-xl bg-[#BEE179] hover:bg-[#AEDB5B] text-[#0B1B30] font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-sm"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Free Research PDF</span>
                </button>
              )}
            </div>

            {/* 3. The Kretz Real Estate Dispatch (Newsletter) */}
            <div className="bg-[#102442] p-6 rounded-3xl border border-[#1D3860] shadow-xs space-y-4">
              <div className="flex items-center gap-2 text-[#BEE179]">
                <FileText className="w-4 h-4" />
                <h4 className="font-bold text-xs uppercase tracking-wider">
                  The Editorial Dispatch
                </h4>
              </div>

              <div className="space-y-1">
                <h5 className="font-black text-sm text-white">
                  Weekly European Property Intelligence
                </h5>
                <p className="text-xs text-[#D1E2F7] leading-relaxed">
                  Join 14,000+ family office directors, institutional allocators, and real estate professionals receiving our curated Thursday briefings.
                </p>
              </div>

              {newsletterSubscribed ? (
                <div className="p-3 bg-[#0B1B30] border border-[#BEE179] rounded-xl text-[#BEE179] text-xs font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#BEE179] shrink-0" />
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
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#1D3860] bg-[#0B1B30] text-xs text-white focus:outline-none focus:ring-2 focus:ring-[#BEE179]"
                  />
                  <button
                    type="submit"
                    className="w-full py-2.5 rounded-xl bg-[#BEE179] hover:bg-[#AEDB5B] text-[#0B1B30] text-xs font-bold transition-colors cursor-pointer"
                  >
                    Subscribe to Dispatch
                  </button>
                </form>
              )}

              <span className="text-[10px] text-[#8EA7C7] block">
                Strict no-spam policy. Unsubscribe anytime with 1-click.
              </span>
            </div>

            {/* 4. Category Taxonomy Pills Card */}
            <div className="bg-[#102442] p-6 rounded-3xl border border-[#1D3860] shadow-xs space-y-3">
              <h4 className="font-bold text-xs uppercase tracking-wider text-[#BEE179]">
                Dossier Categories
              </h4>
              <div className="space-y-1.5">
                {categories.map((c) => {
                  const count = insightsService.getArticles({ categorySlug: c.slug }).length;
                  return (
                    <button
                      key={c.slug}
                      onClick={() => setSelectedCategory(c.slug)}
                      className="w-full py-2 px-3 rounded-xl hover:bg-[#0B1B30] flex items-center justify-between text-xs transition-colors cursor-pointer text-left"
                    >
                      <span className="font-bold text-white">{c.name}</span>
                      <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-[#0B1B30] text-[#BEE179] font-bold border border-[#1D3860]">
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
