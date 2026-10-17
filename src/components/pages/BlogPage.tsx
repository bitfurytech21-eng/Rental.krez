import React, { useState } from 'react';
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
    <div className="min-h-screen bg-[#FDFEFC] text-[#18211F]">
      
      {/* Blog Hero */}
      <section className="relative overflow-hidden bg-[#0A1613] text-white pt-24 pb-20 border-b border-[#1E332E]">
        <div className="container max-w-[1240px] mx-auto px-4 relative z-10 text-left">
          <div className="max-w-3xl space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#162723] border border-[#233F39] text-[#B7E36A] text-xs font-semibold uppercase tracking-widest">
              <BookOpen className="w-4 h-4 text-[#B7E36A]" />
              <span>Real Estate Tokenization Academy & Market Insights</span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white leading-tight">
              Knowledge Behind <span className="text-[#B7E36A]">Asset Tokenization</span>
            </h1>

            <p className="text-base sm:text-lg text-[#9DB2AE] leading-relaxed">
              Explore in-depth analyses on European real estate tokenization, MiCA regulations, 
              participatory loan structuring, secondary market liquidity, and TIR optimization strategies.
            </p>
          </div>
        </div>
      </section>

      {/* Main Blog Container */}
      <section className="py-16 sm:py-24 bg-[#F6F7F4] border-b border-[#E3E8E3]">
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
                      ? 'bg-[#182D2A] text-white shadow-xs'
                      : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
                  }`}
                >
                  {cat === 'all' ? 'All Insights' : cat}
                </button>
              ))}
            </div>

            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search articles, tags, or topics..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs bg-white focus:ring-2 focus:ring-[#182D2A] focus:outline-none"
              />
            </div>
          </div>

          {/* Featured Article Card */}
          {selectedCategory === 'all' && !searchQuery.trim() && featured && (
            <div 
              onClick={() => setActiveArticle(featured)}
              className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs hover:shadow-xl transition-all duration-300 mb-14 grid grid-cols-1 lg:grid-cols-12 cursor-pointer group"
            >
              <div className="lg:col-span-7 relative aspect-[16/10] lg:aspect-auto overflow-hidden bg-slate-900">
                <img 
                  src={featured.image} 
                  alt={featured.title} 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                />
                <div className="absolute top-4 left-4">
                  <span className="px-3 py-1 rounded-full bg-[#182D2A] text-[#B7E36A] text-[11px] font-bold uppercase tracking-wider">
                    Featured Insight
                  </span>
                </div>
              </div>

              <div className="lg:col-span-5 p-8 sm:p-10 flex flex-col justify-between space-y-6">
                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-xs text-slate-500">
                    <span className="font-bold text-emerald-800">{featured.category}</span>
                    <span>·</span>
                    <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{featured.readTime}</span>
                  </div>

                  <h2 className="text-2xl sm:text-3xl font-black text-[#18211F] group-hover:text-emerald-800 transition-colors leading-tight">
                    {featured.title}
                  </h2>

                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                    {featured.excerpt}
                  </p>

                  <div className="flex flex-wrap gap-1.5 pt-2">
                    {featured.tags.map((t) => (
                      <span key={t} className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-medium">
                        #{t}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <img src={featured.author.avatar} alt={featured.author.name} className="w-8 h-8 rounded-full object-cover" />
                    <div>
                      <p className="text-xs font-bold text-slate-900">{featured.author.name}</p>
                      <p className="text-[10px] text-slate-500">{featured.publishedAt}</p>
                    </div>
                  </div>

                  <span className="text-xs font-bold text-emerald-800 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                    Read Article <ChevronRight className="w-4 h-4" />
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Grid of Articles */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredPosts.map((post) => (
              <div
                key={post.id}
                onClick={() => setActiveArticle(post)}
                className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs hover:shadow-xl transition-all duration-300 flex flex-col justify-between cursor-pointer group"
              >
                <div>
                  <div className="relative aspect-[16/10] overflow-hidden bg-slate-900">
                    <img 
                      src={post.image} 
                      alt={post.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute top-3 left-3">
                      <span className="px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md text-white text-[10px] font-bold">
                        {post.category}
                      </span>
                    </div>
                  </div>

                  <div className="p-6 space-y-3">
                    <div className="flex items-center gap-2 text-[11px] text-slate-500">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>{post.readTime}</span>
                      <span>·</span>
                      <span>{post.publishedAt}</span>
                    </div>

                    <h3 className="text-lg font-bold text-[#18211F] group-hover:text-emerald-800 transition-colors leading-snug">
                      {post.title}
                    </h3>

                    <p className="text-xs text-slate-600 leading-relaxed line-clamp-3">
                      {post.excerpt}
                    </p>
                  </div>
                </div>

                <div className="p-6 pt-0">
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <img src={post.author.avatar} alt={post.author.name} className="w-6 h-6 rounded-full object-cover" />
                      <span className="text-[11px] font-semibold text-slate-700">{post.author.name}</span>
                    </div>

                    <span className="text-xs font-bold text-emerald-800 flex items-center gap-0.5 group-hover:translate-x-1 transition-transform">
                      Read <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* Article Detail View / Reader Modal */}
      {activeArticle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-3xl w-full my-8 overflow-hidden shadow-2xl border border-slate-200 text-left relative max-h-[90vh] flex flex-col">
            
            {/* Header Image */}
            <div className="relative aspect-[21/9] overflow-hidden bg-slate-900 shrink-0">
              <img src={activeArticle.image} alt={activeArticle.title} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
              <button
                onClick={() => setActiveArticle(null)}
                className="absolute top-4 right-4 w-9 h-9 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black transition-colors cursor-pointer"
              >
                ✕
              </button>

              <div className="absolute bottom-5 left-6 right-6">
                <span className="px-3 py-1 rounded-full bg-[#B7E36A] text-[#182D2A] text-[11px] font-bold uppercase tracking-wider">
                  {activeArticle.category}
                </span>
                <h2 className="text-xl sm:text-2xl lg:text-3xl font-black text-white mt-2 leading-tight">
                  {activeArticle.title}
                </h2>
              </div>
            </div>

            {/* Article Content & Body */}
            <div className="p-6 sm:p-10 overflow-y-auto space-y-6 flex-1 text-slate-800">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 text-xs text-slate-500">
                <div className="flex items-center gap-3">
                  <img src={activeArticle.author.avatar} alt={activeArticle.author.name} className="w-10 h-10 rounded-full object-cover" />
                  <div>
                    <p className="font-bold text-slate-900">{activeArticle.author.name}</p>
                    <p className="text-[11px]">{activeArticle.author.role}</p>
                  </div>
                </div>

                <div className="text-right">
                  <p>{activeArticle.publishedAt}</p>
                  <p className="font-medium text-emerald-800">{activeArticle.readTime}</p>
                </div>
              </div>

              <div className="prose prose-slate max-w-none text-xs sm:text-sm leading-relaxed whitespace-pre-line">
                {activeArticle.content.trim()}
              </div>

              <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-1.5 flex-wrap">
                  {activeArticle.tags.map(t => (
                    <span key={t} className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-xs font-medium">
                      #{t}
                    </span>
                  ))}
                </div>

                <button
                  onClick={() => {
                    setActiveArticle(null);
                    onExploreProperties();
                  }}
                  className="btn btn-primary py-2.5 px-5 text-xs font-bold"
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
