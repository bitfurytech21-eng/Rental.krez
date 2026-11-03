import React, { useState, useEffect } from 'react';
import { BLOG_POSTS, BlogPost } from '../../data/blogPosts';
import { 
  BookOpen, Search, Filter, Clock, Calendar, 
  ArrowRight, Tag, Share2, ChevronRight, User as UserIcon, Sparkles
} from 'lucide-react';

interface BlogPageProps {
  onExploreProperties: () => void;
  onNavigateContact: () => void;
}

export const BlogPage: React.FC<BlogPageProps> = ({
  onExploreProperties,
  onNavigateContact,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeArticle, setActiveArticle] = useState<BlogPost | null>(null);

  useEffect(() => {
    if (!activeArticle) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setActiveArticle(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeArticle]);

  const categories = ['all', 'Guides & Education', 'Market Insights', 'Regulation & Legal'];

  const filteredPosts = BLOG_POSTS.filter((post) => {
    const matchesCat = selectedCategory === 'all' || post.category === selectedCategory;
    const matchesSearch = !searchQuery.trim() ||
      post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.excerpt.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCat && matchesSearch;
  });

  const featured = BLOG_POSTS[0];

  return (
    <div className="min-h-screen bg-background text-foreground">
      
      {/* Blog Hero */}
      <section className="relative overflow-hidden bg-[#2B1E17] text-[#F5EFE8] pt-24 pb-20 border-b border-[#594333]">
        <div className="container max-w-[1240px] mx-auto px-4 relative z-10 text-left">
          <div className="max-w-3xl space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#35251C] border border-[#594333] text-[#C49A6C] text-xs font-semibold uppercase tracking-widest">
              <BookOpen className="w-4 h-4 text-[#C49A6C]" />
              <span>Real Estate Tokenization Academy &amp; Market Insights</span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-[#F5EFE8] leading-tight">
              Knowledge Behind <span className="text-[#C49A6C]">Asset Tokenization</span>
            </h1>

            <p className="text-base sm:text-lg text-[#C4B5A5] leading-relaxed">
              Explore in-depth analyses on European real estate tokenization, MiCA regulations, 
              participatory loan structuring, secondary market liquidity, and TIR optimization strategies.
            </p>
          </div>
        </div>
      </section>

      {/* Main Blog Container */}
      <section className="py-16 sm:py-24 bg-background border-b border-border">
        <div className="container max-w-[1240px] mx-auto px-4 text-left">
          
          {/* Search & Category Filter Bar */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 mb-12">
            <div className="flex flex-wrap items-center gap-2">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    selectedCategory === cat
                      ? 'bg-[#C49A6C] text-[#211711] shadow-xs'
                      : 'bg-[#2B1E17] text-[#C4B5A5] hover:text-[#F5EFE8] border border-[#594333]'
                  }`}
                >
                  {cat === 'all' ? 'All Insights' : cat}
                </button>
              ))}
            </div>

            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 text-[#C4B5A5] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                aria-label="Search articles, tags, or topics"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search articles, tags, or topics..."
                className="w-full pl-10 pr-9 py-2.5 rounded-xl border border-[#594333] text-base sm:text-xs text-[#F5EFE8] bg-[#2B1E17] focus:ring-2 focus:ring-[#C49A6C] focus:outline-none placeholder-[#C4B5A5]/60"
              />
              {searchQuery && (
                <button
                  type="button"
                  aria-label="Clear article search"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 px-1.5 py-0.5 text-[#C4B5A5] hover:text-[#F5EFE8] text-xs cursor-pointer"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Featured Article Card */}
          {selectedCategory === 'all' && !searchQuery.trim() && featured && (
            <div 
              onClick={() => setActiveArticle(featured)}
              className="bg-[#2B1E17] rounded-3xl border border-[#594333] overflow-hidden shadow-xs hover:shadow-xl hover:border-[#C49A6C] transition-all duration-300 mb-14 grid grid-cols-1 lg:grid-cols-12 cursor-pointer group"
            >
              <div className="lg:col-span-7 relative aspect-[16/10] lg:aspect-auto overflow-hidden bg-[#211711]">
                <img 
                  src={featured.image} 
                  alt={featured.title} 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                />
                <div className="absolute top-4 left-4">
                  <span className="px-3 py-1 rounded-full bg-[#211711]/90 border border-[#594333] text-[#C49A6C] text-[11px] font-bold uppercase tracking-wider backdrop-blur-xs">
                    Featured Insight
                  </span>
                </div>
              </div>

              <div className="lg:col-span-5 p-8 sm:p-10 flex flex-col justify-between space-y-6">
                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-xs text-[#C4B5A5]">
                    <span className="font-bold text-[#C49A6C]">{featured.category}</span>
                    <span>·</span>
                    <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{featured.readTime}</span>
                  </div>

                  <h2 className="text-2xl sm:text-3xl font-black text-[#F5EFE8] group-hover:text-[#C49A6C] transition-colors leading-tight">
                    {featured.title}
                  </h2>

                  <p className="text-xs sm:text-sm text-[#C4B5A5] leading-relaxed">
                    {featured.excerpt}
                  </p>

                  <div className="flex flex-wrap gap-1.5 pt-2">
                    {featured.tags.map((t) => (
                      <span key={t} className="px-2 py-0.5 rounded-md bg-[#35251C] border border-[#594333] text-[#C4B5A5] text-[10px] font-medium">
                        #{t}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="pt-4 border-t border-[#594333] flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <img src={featured.author.avatar} alt={featured.author.name} className="w-8 h-8 rounded-full object-cover" />
                    <div>
                      <p className="text-xs font-bold text-[#F5EFE8]">{featured.author.name}</p>
                      <p className="text-[10px] text-[#C4B5A5]">{featured.publishedAt}</p>
                    </div>
                  </div>

                  <span className="text-xs font-bold text-[#C49A6C] flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                    Read Article <ChevronRight className="w-4 h-4" />
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Grid of Articles */}
          {filteredPosts.length === 0 ? (
            <div className="bg-white rounded-3xl border border-slate-200 p-10 text-center space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 text-[#182D2A] flex items-center justify-center mx-auto">
                <Search className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-extrabold text-[#18211F]">No Matching Articles Found</h3>
                <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
                  No insights match your current search or category selection. Reset your filters to browse the full academy archive.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('all');
                }}
                className="px-5 py-2.5 rounded-xl bg-[#182D2A] hover:bg-[#24423C] text-white text-xs font-bold transition-colors cursor-pointer"
              >
                Reset Search & Filters
              </button>
            </div>
          ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredPosts.map((post) => (
              <div
                key={post.id}
                onClick={() => setActiveArticle(post)}
                className="bg-[#2B1E17] rounded-3xl border border-[#594333] overflow-hidden shadow-xs hover:shadow-xl hover:border-[#C49A6C] transition-all duration-300 flex flex-col justify-between cursor-pointer group"
              >
                <div>
                  <div className="relative aspect-[16/10] overflow-hidden bg-[#211711]">
                    <img 
                      src={post.image} 
                      alt={post.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute top-3 left-3">
                      <span className="px-2.5 py-1 rounded-full bg-[#211711]/90 border border-[#594333] text-[#C49A6C] text-[10px] font-bold backdrop-blur-md">
                        {post.category}
                      </span>
                    </div>
                  </div>

                  <div className="p-6 space-y-3">
                    <div className="flex items-center gap-2 text-[11px] text-[#C4B5A5]">
                      <Clock className="w-3.5 h-3.5 text-[#C49A6C]" />
                      <span>{post.readTime}</span>
                      <span>·</span>
                      <span>{post.publishedAt}</span>
                    </div>

                    <h3 className="text-lg font-bold text-[#F5EFE8] group-hover:text-[#C49A6C] transition-colors leading-snug">
                      {post.title}
                    </h3>

                    <p className="text-xs text-[#C4B5A5] leading-relaxed line-clamp-3">
                      {post.excerpt}
                    </p>
                  </div>
                </div>

                <div className="p-6 pt-0">
                  <div className="pt-3 border-t border-[#594333] flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <img src={post.author.avatar} alt={post.author.name} className="w-6 h-6 rounded-full object-cover" />
                      <span className="text-[11px] font-semibold text-[#F5EFE8]">{post.author.name}</span>
                    </div>

                    <span className="text-xs font-bold text-[#C49A6C] flex items-center gap-0.5 group-hover:translate-x-1 transition-transform">
                      Read <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          )}

        </div>
      </section>

      {/* Article Detail View / Reader Modal */}
      {activeArticle && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={activeArticle.title}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200"
          onClick={(e) => {
            if (e.target === e.currentTarget) setActiveArticle(null);
          }}
        >
          <div
            className="bg-[#211711] rounded-3xl max-w-3xl w-full my-8 overflow-hidden shadow-2xl border border-[#594333] text-left relative max-h-[90vh] flex flex-col text-[#F5EFE8]"
            onClick={(e) => e.stopPropagation()}
          >
            
            {/* Header Image */}
            <div className="relative aspect-[21/9] overflow-hidden bg-black shrink-0">
              <img src={activeArticle.image} alt={activeArticle.title} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#211711] via-black/40 to-transparent" />
              <button
                type="button"
                aria-label="Close article reader"
                onClick={() => setActiveArticle(null)}
                className="absolute top-3 right-3 min-w-[44px] min-h-[44px] rounded-full bg-black/65 text-[#F5EFE8] flex items-center justify-center hover:bg-black transition-colors cursor-pointer"
              >
                ✕
              </button>

              <div className="absolute bottom-5 left-6 right-6">
                <span className="px-3 py-1 rounded-full bg-[#C49A6C] text-[#211711] text-[11px] font-bold uppercase tracking-wider">
                  {activeArticle.category}
                </span>
                <h2 className="text-xl sm:text-2xl lg:text-3xl font-black text-[#F5EFE8] mt-2 leading-tight">
                  {activeArticle.title}
                </h2>
              </div>
            </div>

            {/* Article Content & Body */}
            <div className="p-6 sm:p-10 overflow-y-auto space-y-6 flex-1 text-[#F5EFE8]">
              <div className="flex items-center justify-between pb-4 border-b border-[#594333] text-xs text-[#C4B5A5]">
                <div className="flex items-center gap-3">
                  <img src={activeArticle.author.avatar} alt={activeArticle.author.name} className="w-10 h-10 rounded-full object-cover" />
                  <div>
                    <p className="font-bold text-[#F5EFE8]">{activeArticle.author.name}</p>
                    <p className="text-[11px] text-[#C4B5A5]">{activeArticle.author.role}</p>
                  </div>
                </div>

                <div className="text-right">
                  <p>{activeArticle.publishedAt}</p>
                  <p className="font-medium text-[#C49A6C]">{activeArticle.readTime}</p>
                </div>
              </div>

              <div className="prose prose-invert max-w-none text-xs sm:text-sm leading-relaxed whitespace-pre-line text-[#F5EFE8]">
                {activeArticle.content.trim()}
              </div>

              <div className="pt-4 border-t border-[#594333] flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-1.5 flex-wrap">
                  {activeArticle.tags.map(t => (
                    <span key={t} className="px-2.5 py-1 rounded-lg bg-[#35251C] border border-[#594333] text-[#C4B5A5] text-xs font-medium">
                      #{t}
                    </span>
                  ))}
                </div>

                <button
                  onClick={() => {
                    setActiveArticle(null);
                    onExploreProperties();
                  }}
                  className="py-2.5 px-5 rounded-pill bg-[#C49A6C] hover:bg-[#d4ac7d] text-[#211711] text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
                >
                  Explore Related Offerings →
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
