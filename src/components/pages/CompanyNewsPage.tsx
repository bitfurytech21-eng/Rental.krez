import React, { useState, useMemo } from 'react';
import { CompanyNewsItem, NewsCategory } from '../../types/news';
import { ledger } from '../../lib/ledger';
import { 
  Play, 
  ExternalLink, 
  Calendar, 
  Clock, 
  Search, 
  Tv, 
  X, 
  ChevronRight, 
  ArrowRight, 
  Building2, 
  Sparkles,
  Share2,
  Check
} from 'lucide-react';

interface CompanyNewsPageProps {
  onExploreProperties?: () => void;
  onNavigateContact?: () => void;
}

export const CompanyNewsPage: React.FC<CompanyNewsPageProps> = ({
  onExploreProperties,
  onNavigateContact,
}) => {
  const [newsList] = useState<CompanyNewsItem[]>(() => ledger.getPublishedNews());
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeVideoModal, setActiveVideoModal] = useState<CompanyNewsItem | null>(null);
  const [playingFeatured, setPlayingFeatured] = useState<boolean>(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Available categories derived from published items
  const categories = useMemo(() => {
    const set = new Set<string>();
    newsList.forEach((item) => set.add(item.category));
    return ['All', ...Array.from(set)];
  }, [newsList]);

  // Filtered news items based on search and category
  const filteredNews = useMemo(() => {
    return newsList.filter((item) => {
      const matchesCategory =
        selectedCategory === 'All' || item.category === selectedCategory;
      const matchesQuery =
        !searchQuery.trim() ||
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.source.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.tags && item.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase())));
      return matchesCategory && matchesQuery;
    });
  }, [newsList, selectedCategory, searchQuery]);

  // Top featured video: either explicitly marked or the first item
  const featuredVideo = useMemo(() => {
    if (selectedCategory !== 'All' || searchQuery.trim()) {
      return null; // When filtering, display editorial grid directly
    }
    return newsList.find((item) => item.isFeatured) || newsList[0] || null;
  }, [newsList, selectedCategory, searchQuery]);

  // Secondary news list (excluding featured video when featured is visible)
  const gridVideos = useMemo(() => {
    if (featuredVideo) {
      return filteredNews.filter((item) => item.id !== featuredVideo.id);
    }
    return filteredNews;
  }, [filteredNews, featuredVideo]);

  const handleShare = (item: CompanyNewsItem, e: React.MouseEvent) => {
    e.stopPropagation();
    if (navigator.clipboard) {
      navigator.clipboard.writeText(item.youtubeUrl);
      setCopiedId(item.id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#18211F]">
      {/* Editorial Header Section */}
      <section className="relative pt-12 pb-14 border-b border-[#E3E8E3] bg-gradient-to-b from-[#F2F5F0] to-[#FBFBFA]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* Subtle breadcrumb / kicker */}
          <div className="flex items-center gap-2 text-xs font-semibold tracking-wider text-[#52665D] uppercase mb-3">
            <span>Kretz Real Estate</span>
            <span aria-hidden="true">/</span>
            <span className="text-[#182D2A]">Company News</span>
            <span aria-hidden="true">/</span>
            <span>Broadcasts & Media</span>
          </div>

          <div className="max-w-3xl">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-bold text-[#0F1E1B] tracking-tight leading-[1.15]">
              Company News & Broadcasts
            </h1>
            <p className="mt-4 text-base sm:text-lg text-[#4A5D54] leading-relaxed">
              Official announcements, flagship developments, documentary features, and executive media appearances from the Kretz Real Estate family office and tokenized real estate network.
            </p>
          </div>

          {/* Interactive Search & Category Filter Controls */}
          <div className="mt-8 flex flex-col md:flex-row md:items-center justify-between gap-4 pt-6 border-t border-[#DFE5DF]">
            
            {/* Segmented Category Buttons */}
            <div className="flex flex-wrap items-center gap-1.5 p-1 bg-[#E8EDE6] rounded-xl border border-[#D5DDD3]">
              {categories.map((cat) => {
                const isActive = selectedCategory === cat;
                const count =
                  cat === 'All'
                    ? newsList.length
                    : newsList.filter((n) => n.category === cat).length;
                return (
                  <button
                    key={cat}
                    onClick={() => {
                      setSelectedCategory(cat);
                      setPlayingFeatured(false);
                    }}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                      isActive
                        ? 'bg-[#182D2A] text-white shadow-xs'
                        : 'text-[#4A5D54] hover:text-[#182D2A] hover:bg-white/60'
                    }`}
                  >
                    <span>{cat}</span>
                    <span
                      className={`text-[10px] ${
                        isActive ? 'text-emerald-300' : 'text-[#697D74]'
                      }`}
                    >
                      ({count})
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Keyword Search Input */}
            <div className="relative w-full md:w-72">
              <Search className="w-4 h-4 text-[#697D74] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search news, topics, interviews..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-8 py-2 text-xs sm:text-sm bg-white border border-[#D5DDD3] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#182D2A] focus:border-transparent text-[#18211F] placeholder-[#809187]"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-[#809187] hover:text-[#18211F]"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 space-y-12 sm:space-y-16">
        
        {/* Top Featured Video Showcase (Only displayed on default All view) */}
        {featuredVideo && (
          <section className="bg-white rounded-2xl border border-[#DCE4DC] shadow-xs overflow-hidden transition-all">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-0">
              
              {/* Media Player / Thumbnail Column */}
              <div className="lg:col-span-7 bg-[#0B1513] relative aspect-video flex items-center justify-center overflow-hidden">
                {playingFeatured ? (
                  <iframe
                    className="w-full h-full border-0"
                    src={`https://www.youtube.com/embed/${featuredVideo.youtubeId}?autoplay=1&rel=0&modestbranding=1`}
                    title={featuredVideo.title}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                  />
                ) : (
                  <div className="relative w-full h-full group">
                    <img
                      src={featuredVideo.thumbnailUrl}
                      alt={featuredVideo.title}
                      className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-500"
                      loading="eager"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/20" />
                    
                    {/* Play Button Overlay */}
                    <button
                      onClick={() => setPlayingFeatured(true)}
                      className="absolute inset-0 m-auto w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-[#182D2A]/90 hover:bg-[#203D39] text-white flex items-center justify-center shadow-2xl border-2 border-white/20 transition-all transform hover:scale-110 cursor-pointer group-hover:border-emerald-400"
                      aria-label={`Play featured video: ${featuredVideo.title}`}
                    >
                      <Play className="w-7 h-7 sm:w-8 sm:h-8 fill-current ml-1 text-emerald-400" />
                    </button>

                    {/* Duration / Source Badge */}
                    <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between text-white text-xs font-medium">
                      <div className="flex items-center gap-2 bg-black/60 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-white/10">
                        <Tv className="w-3.5 h-3.5 text-emerald-400" />
                        <span>{featuredVideo.source}</span>
                      </div>
                      {featuredVideo.duration && (
                        <div className="bg-black/70 backdrop-blur-sm px-2.5 py-1 rounded-md text-[11px] font-mono">
                          {featuredVideo.duration}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Editorial Context Column */}
              <div className="lg:col-span-5 p-6 sm:p-8 lg:p-10 flex flex-col justify-between bg-white">
                <div>
                  {/* Clean unboxed metadata separator */}
                  <div className="flex flex-wrap items-center gap-2 text-xs text-[#52665D] font-semibold tracking-wide uppercase mb-3">
                    <span className="text-[#107049] font-bold">FEATURED NEWS</span>
                    <span aria-hidden="true">·</span>
                    <span className="text-[#182D2A] font-bold">REAL ESTATE &amp; INNOVATION</span>
                    <span aria-hidden="true">·</span>
                    <span className="bg-[#E8EDE6] text-[#182D2A] px-2 py-0.5 rounded-md font-bold text-[10px]">MEDIA FEATURE</span>
                  </div>

                  <h2 className="text-xl sm:text-2xl lg:text-3xl font-serif font-bold text-[#0F1E1B] leading-snug sm:leading-tight">
                    {featuredVideo.title}
                  </h2>

                  <p className="mt-3.5 text-sm sm:text-base text-[#4A5D54] leading-relaxed line-clamp-4">
                    {featuredVideo.description}
                  </p>

                  {/* Clean tags */}
                  {featuredVideo.tags && featuredVideo.tags.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-2 text-xs text-[#697D74]">
                      {featuredVideo.tags.map((tag) => (
                        <span key={tag} className="text-[#364841] font-medium">
                          #{tag.replace(/^#/, '')}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="mt-6 pt-6 border-t border-[#E3E8E3] flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <button
                      onClick={() => setPlayingFeatured(true)}
                      className="btn btn-primary px-4.5 py-2.5 text-xs sm:text-sm font-semibold flex items-center gap-2 cursor-pointer bg-[#182D2A] text-white rounded-lg hover:bg-[#203D39] shadow-xs"
                    >
                      <Play className="w-3.5 h-3.5 fill-current text-emerald-400" />
                      <span>Watch Feature</span>
                    </button>
                    <a
                      href={`https://www.youtube.com/watch?v=${featuredVideo.youtubeId || 'dwmIqvREPz8'}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3.5 py-2.5 text-xs font-semibold text-[#4A5D54] hover:text-[#182D2A] hover:bg-[#F2F5F0] border border-[#D5DDD3] rounded-lg transition-colors flex items-center gap-1.5"
                    >
                      <span>Watch on YouTube</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>

                  <button
                    onClick={(e) => handleShare(featuredVideo, e)}
                    className="p-2 text-[#697D74] hover:text-[#182D2A] hover:bg-[#F2F5F0] rounded-lg transition-colors"
                    title="Copy Video Link"
                  >
                    {copiedId === featuredVideo.id ? (
                      <span className="flex items-center gap-1 text-xs text-emerald-700 font-semibold">
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        Copied
                      </span>
                    ) : (
                      <Share2 className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* News Grid Section */}
        <section>
          <div className="flex items-center justify-between mb-6 pb-3 border-b border-[#E3E8E3]">
            <div>
              <h3 className="text-xl sm:text-2xl font-serif font-bold text-[#0F1E1B]">
                {selectedCategory === 'All' ? 'Latest Broadcasts & Reports' : selectedCategory}
              </h3>
              <p className="text-xs sm:text-sm text-[#697D74] mt-0.5">
                Showing {filteredNews.length} verified company news {filteredNews.length === 1 ? 'item' : 'items'}
              </p>
            </div>
          </div>

          {gridVideos.length === 0 ? (
            <div className="text-center py-16 px-4 bg-white rounded-2xl border border-[#DCE4DC]">
              <Tv className="w-10 h-10 text-[#809187] mx-auto mb-3" />
              <h4 className="text-base font-semibold text-[#182D2A]">No company news match your search</h4>
              <p className="text-xs sm:text-sm text-[#697D74] mt-1 max-w-sm mx-auto">
                Try searching for different keywords or reset your category filters to view all broadcasts.
              </p>
              <button
                onClick={() => {
                  setSelectedCategory('All');
                  setSearchQuery('');
                }}
                className="mt-4 px-4 py-2 text-xs font-semibold bg-[#182D2A] text-white rounded-lg hover:bg-[#203D39]"
              >
                Reset Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
              {gridVideos.map((item) => (
                <article
                  key={item.id}
                  className="bg-white rounded-xl border border-[#DCE4DC] shadow-xs hover:shadow-md transition-all flex flex-col overflow-hidden group cursor-pointer"
                  onClick={() => setActiveVideoModal(item)}
                >
                  {/* Thumbnail Container */}
                  <div className="relative aspect-video bg-[#0B1513] overflow-hidden">
                    <img
                      src={item.thumbnailUrl}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-black/30 group-hover:bg-black/10 transition-colors" />

                    {/* Quick Play Icon */}
                    <div className="absolute inset-0 m-auto w-12 h-12 rounded-full bg-[#182D2A]/90 group-hover:bg-[#107049] text-white flex items-center justify-center shadow-lg transition-transform group-hover:scale-110">
                      <Play className="w-5 h-5 fill-current ml-0.5 text-emerald-300" />
                    </div>

                    {/* Duration badge */}
                    {item.duration && (
                      <span className="absolute bottom-2.5 right-2.5 bg-black/80 text-white font-mono text-[10px] px-1.5 py-0.5 rounded">
                        {item.duration}
                      </span>
                    )}

                    {/* Source */}
                    <span className="absolute top-2.5 left-2.5 bg-black/70 backdrop-blur-xs text-white text-[10px] font-semibold px-2 py-0.5 rounded flex items-center gap-1">
                      <Tv className="w-2.5 h-2.5 text-emerald-400" />
                      {item.source}
                    </span>
                  </div>

                  {/* Body Text */}
                  <div className="p-5 flex-1 flex flex-col justify-between">
                    <div>
                      {/* Zero-pill metadata */}
                      <div className="flex items-center gap-2 text-[11px] text-[#52665D] font-medium mb-2">
                        <span>{item.category}</span>
                        <span aria-hidden="true">·</span>
                        <span>{formatDate(item.publishedDate)}</span>
                      </div>

                      <h4 className="font-serif font-bold text-base text-[#0F1E1B] leading-snug line-clamp-2 group-hover:text-[#107049] transition-colors">
                        {item.title}
                      </h4>

                      <p className="mt-2 text-xs text-[#4A5D54] leading-relaxed line-clamp-3">
                        {item.description}
                      </p>
                    </div>

                    {/* Card Footer */}
                    <div className="mt-5 pt-4 border-t border-[#EAEFEA] flex items-center justify-between text-xs">
                      <span className="text-[#182D2A] font-semibold flex items-center gap-1 group-hover:text-[#107049]">
                        <span>Watch Video</span>
                        <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                      </span>

                      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={(e) => handleShare(item, e)}
                          className="p-1.5 text-[#697D74] hover:text-[#182D2A] hover:bg-[#F2F5F0] rounded"
                          title="Copy Link"
                        >
                          {copiedId === item.id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Share2 className="w-3.5 h-3.5" />
                          )}
                        </button>
                        <a
                          href={item.youtubeUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 text-[#697D74] hover:text-[#182D2A] hover:bg-[#F2F5F0] rounded"
                          title="Open on YouTube"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        {/* Company News Press / Advisory Banner */}
        <section className="bg-gradient-to-r from-[#142421] to-[#1E332E] rounded-2xl p-6 sm:p-10 text-white shadow-md relative overflow-hidden">
          <div className="max-w-2xl relative z-10">
            <span className="text-emerald-400 text-xs uppercase tracking-widest font-bold">
              Media & Press Office
            </span>
            <h3 className="text-2xl sm:text-3xl font-serif font-bold mt-2">
              Have press inquiries or require executive commentary?
            </h3>
            <p className="mt-3 text-sm text-slate-300 leading-relaxed">
              For journalist inquiries, broadcast interview requests, or private luxury real estate advisory consultations, our Paris and Madrid press desk is available 7 days a week.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              {onNavigateContact && (
                <button
                  onClick={onNavigateContact}
                  className="px-5 py-2.5 rounded-lg bg-emerald-500 text-[#0E1A17] hover:bg-emerald-400 font-bold text-xs sm:text-sm cursor-pointer transition-colors"
                >
                  Contact Press Office
                </button>
              )}
              {onExploreProperties && (
                <button
                  onClick={onExploreProperties}
                  className="px-5 py-2.5 rounded-lg bg-white/10 hover:bg-white/20 text-white font-semibold text-xs sm:text-sm border border-white/20 cursor-pointer transition-colors"
                >
                  Explore Current Properties
                </button>
              )}
            </div>
          </div>
        </section>
      </main>

      {/* Responsive Video Modal Player */}
      {activeVideoModal && (
        <div
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200"
          onClick={() => setActiveVideoModal(null)}
        >
          <div
            className="bg-[#0F1E1B] text-white w-full max-w-4xl rounded-2xl overflow-hidden shadow-2xl border border-slate-700/60"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between bg-[#142421]">
              <div className="flex items-center gap-2 overflow-hidden pr-4">
                <Tv className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="text-xs sm:text-sm font-semibold truncate text-slate-200">
                  {activeVideoModal.title}
                </span>
              </div>
              <button
                onClick={() => setActiveVideoModal(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                aria-label="Close video modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Video IFrame Container */}
            <div className="relative aspect-video w-full bg-black">
              <iframe
                className="w-full h-full border-0"
                src={`https://www.youtube.com/embed/${activeVideoModal.youtubeId}?autoplay=1&rel=0&modestbranding=1`}
                title={activeVideoModal.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            </div>

            {/* Modal Footer / Context */}
            <div className="p-5 sm:p-6 bg-[#142421]">
              <div className="flex items-center gap-2 text-xs text-slate-400 font-medium mb-1.5">
                <span className="text-emerald-400 font-bold">{activeVideoModal.source}</span>
                <span aria-hidden="true">·</span>
                <span>{activeVideoModal.category}</span>
                <span aria-hidden="true">·</span>
                <span>{formatDate(activeVideoModal.publishedDate)}</span>
              </div>

              <h3 className="text-base sm:text-lg font-serif font-bold text-white">
                {activeVideoModal.title}
              </h3>
              <p className="mt-2 text-xs sm:text-sm text-slate-300 leading-relaxed">
                {activeVideoModal.description}
              </p>

              <div className="mt-4 pt-4 border-t border-slate-800 flex items-center justify-between text-xs">
                <a
                  href={activeVideoModal.youtubeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-emerald-400 hover:text-emerald-300 flex items-center gap-1.5 font-semibold"
                >
                  <span>Open on YouTube</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>

                <button
                  onClick={() => setActiveVideoModal(null)}
                  className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg font-medium transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
