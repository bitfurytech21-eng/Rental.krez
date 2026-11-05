import React, { useState, useEffect } from 'react';
import { BLOG_POSTS, BlogPost } from '../../data/blogPosts';
import { blogApi } from '../../lib/api';
import { 
  BookOpen, Search, Clock, ArrowRight, ChevronRight, X, Video, Play, Film, FileText
} from 'lucide-react';

interface BlogPageProps {
  initialSlug?: string;
  onExploreProperties?: () => void;
  onNavigateContact?: () => void;
}

export interface VideoBroadcastItem {
  id: string;
  youtubeId: string;
  title: string;
  category: string;
  duration: string;
  publishedDate: string;
  description: string;
  thumbnailUrl: string;
}

export const VIDEO_BROADCASTS: VideoBroadcastItem[] = [
  {
    id: 'vid-future-real-estate',
    youtubeId: 'dwmIqvREPz8',
    title: 'Inside the Future of Real Estate: Perspectives, Innovation & Market Transformation',
    category: 'Innovation & Tokenization',
    duration: '12:45',
    publishedDate: '2026-02-15',
    description: 'An industry-focused keynote exploring smart contracts, notarial SPV structuring, and the future of fractional property investment.',
    thumbnailUrl: 'https://i.ytimg.com/vi/dwmIqvREPz8/hqdefault.jpg',
  },
  {
    id: 'vid-advisory-expansion',
    youtubeId: 'hJlujgm6GH4',
    title: 'Physical Advisory Expansion: Flagship Advisory Locations in Paris & Madrid',
    category: 'Expansion & Advisory',
    duration: '10:14',
    publishedDate: '2026-01-30',
    description: 'Bridging high-touch private client advisory hubs with digital tokenized real estate platform capabilities.',
    thumbnailUrl: 'https://i.ytimg.com/vi/hJlujgm6GH4/hqdefault.jpg',
  },
  {
    id: 'vid-global-capital',
    youtubeId: 'DnIbo-CBXos',
    title: 'Global Capital Corridors: European Real Estate Market Dynamics',
    category: 'Market Intelligence',
    duration: '48:20',
    publishedDate: '2025-06-15',
    description: 'Analyzing cross-border capital flows, European prime valuation trends, and institutional co-ownership structuring.',
    thumbnailUrl: 'https://i.ytimg.com/vi/DnIbo-CBXos/hqdefault.jpg',
  },
  {
    id: 'vid-prime-valuations',
    youtubeId: 'wYFKyG5xC1Y',
    title: 'Prime Estate Valuations & Strategic Asset Liquidity',
    category: 'Valuations & Tax',
    duration: '14:35',
    publishedDate: '2024-11-20',
    description: 'Evaluating prime residential asset liquidity, valuation methodologies, and exit liquidity for high-net-worth investors.',
    thumbnailUrl: 'https://i.ytimg.com/vi/wYFKyG5xC1Y/hqdefault.jpg',
  },
];

export const BlogPage: React.FC<BlogPageProps> = ({
  initialSlug,
  onExploreProperties = () => {},
  onNavigateContact = () => {},
}) => {
  const [posts, setPosts] = useState<BlogPost[]>(BLOG_POSTS);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'all' | 'articles' | 'videos'>('all');
  const [activeArticle, setActiveArticle] = useState<BlogPost | null>(null);
  const [activeVideo, setActiveVideo] = useState<VideoBroadcastItem | null>(null);

  useEffect(() => {
    blogApi.getPosts()
      .then((res: any) => {
        const list = Array.isArray(res) ? res : res?.data;
        if (Array.isArray(list) && list.length > 0) {
          setPosts(list as BlogPost[]);
        }
      })
      .catch(() => {
        // Fallback to static BLOG_POSTS
      });
  }, []);

  useEffect(() => {
    if (initialSlug) {
      const match = posts.find(p => p.slug === initialSlug || p.id === initialSlug);
      if (match) {
        setActiveArticle(match);
      }
    }
  }, [initialSlug, posts]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setActiveArticle(null);
        setActiveVideo(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const categories = ['all', 'Guides & Education', 'Market Insights', 'Regulation & Legal'];

  const filteredPosts = posts.filter((post) => {
    const matchesCat = selectedCategory === 'all' || post.category === selectedCategory;
    const matchesSearch = !searchQuery.trim() ||
      post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.excerpt.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCat && matchesSearch;
  });

  const filteredVideos = VIDEO_BROADCASTS.filter((vid) => {
    return !searchQuery.trim() ||
      vid.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      vid.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      vid.category.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const featured = posts[0];

  return (
    <div className="min-h-screen bg-[#211711] text-[#F5EFE8]">
      
      {/* Blog & Media Hero Header */}
      <section className="relative overflow-hidden bg-[#211711] text-[#F5EFE8] pt-24 pb-16 border-b border-[#594333]">
        <div className="container max-w-[1240px] mx-auto px-4 relative z-10 text-left">
          <div className="max-w-3xl space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#2B1E17] border border-[#594333] text-[#C49A6C] text-xs font-semibold uppercase tracking-widest">
              <BookOpen className="w-4 h-4 text-[#C49A6C]" />
              <span>Real Estate Tokenization Academy & Media Library</span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-[#F5EFE8] leading-tight">
              Knowledge Behind <span className="text-[#C49A6C]">Asset Tokenization</span>
            </h1>

            <p className="text-base sm:text-lg text-[#C4B5A5] leading-relaxed">
              Explore in-depth research articles, MiCA compliance breakdowns, and dedicated video broadcasts on European real estate tokenization.
            </p>

            {/* View Mode Section Selector */}
            <div className="pt-2 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => setActiveTab('all')}
                className={`px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                  activeTab === 'all'
                    ? 'bg-[#C49A6C] text-[#211711] shadow-sm font-black'
                    : 'bg-[#2B1E17] text-[#C4B5A5] border border-[#594333] hover:text-[#F5EFE8]'
                }`}
              >
                <BookOpen className="w-4 h-4" />
                <span>All Content</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('articles')}
                className={`px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                  activeTab === 'articles'
                    ? 'bg-[#C49A6C] text-[#211711] shadow-sm font-black'
                    : 'bg-[#2B1E17] text-[#C4B5A5] border border-[#594333] hover:text-[#F5EFE8]'
                }`}
              >
                <FileText className="w-4 h-4" />
                <span>Research Articles ({posts.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('videos')}
                className={`px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                  activeTab === 'videos'
                    ? 'bg-[#C49A6C] text-[#211711] shadow-sm font-black'
                    : 'bg-[#2B1E17] text-[#C4B5A5] border border-[#594333] hover:text-[#F5EFE8]'
                }`}
              >
                <Video className="w-4 h-4 text-red-500" />
                <span>Video Broadcasts ({VIDEO_BROADCASTS.length})</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <div className="py-16 sm:py-20 bg-[#211711] border-b border-[#594333]">
        <div className="container max-w-[1240px] mx-auto px-4 text-left space-y-16">

          {/* Search & Category Bar */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-2">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    selectedCategory === cat
                      ? 'bg-[#C49A6C] text-[#211711] shadow-xs font-black'
                      : 'bg-[#2B1E17] text-[#C4B5A5] hover:text-[#F5EFE8] border border-[#594333]'
                  }`}
                >
                  {cat === 'all' ? 'All Categories' : cat}
                </button>
              ))}
            </div>

            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 text-[#C4B5A5] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                aria-label="Search articles or videos"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search articles or videos..."
                className="w-full pl-10 pr-9 py-2.5 rounded-xl border border-[#594333] text-base sm:text-xs text-[#F5EFE8] bg-[#2B1E17] placeholder-[#C4B5A5] focus:border-[#C49A6C] focus:outline-none"
              />
              {searchQuery && (
                <button
                  type="button"
                  aria-label="Clear search"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 px-1.5 py-0.5 text-[#C4B5A5] hover:text-white text-xs cursor-pointer"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* SECTION A: STANDALONE VIDEO BROADCASTS SHOWCASE (SEPARATE FROM ARTICLES) */}
          {(activeTab === 'all' || activeTab === 'videos') && (
            <section className="space-y-8 p-8 rounded-3xl bg-[#2B1E17] border border-[#594333] shadow-xl">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#594333] pb-6">
                <div>
                  <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-widest text-[#C49A6C]">
                    <Film className="w-4 h-4 text-red-500 animate-pulse" />
                    <span>Executive Video Broadcasts &amp; Keynotes</span>
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-black text-[#F5EFE8] mt-1">
                    Watch Media Features &amp; Market Analyses
                  </h2>
                  <p className="text-xs sm:text-sm text-[#C4B5A5] mt-1 max-w-2xl">
                    Dedicated video channel featuring interviews, market keynotes, and technical platform walk-throughs.
                  </p>
                </div>
                <span className="px-3.5 py-1.5 rounded-full bg-[#211711] text-[#C49A6C] border border-[#594333] text-xs font-bold self-start md:self-auto">
                  {VIDEO_BROADCASTS.length} HD Broadcasts
                </span>
              </div>

              {filteredVideos.length === 0 ? (
                <p className="text-xs text-[#C4B5A5] py-4">No video broadcasts match your search.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {filteredVideos.map((video) => (
                    <div
                      key={video.id}
                      onClick={() => setActiveVideo(video)}
                      className="group cursor-pointer rounded-2xl border border-[#594333] bg-[#211711] overflow-hidden shadow-sm hover:border-[#C49A6C] hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between"
                    >
                      <div>
                        <div className="relative aspect-video overflow-hidden bg-black">
                          <img
                            src={video.thumbnailUrl}
                            alt={video.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-90 group-hover:opacity-100"
                          />
                          <div className="absolute inset-0 bg-black/30 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                            <div className="w-12 h-12 rounded-full bg-red-600/90 text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                              <Play className="w-5 h-5 fill-current ml-0.5" />
                            </div>
                          </div>
                          <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-black/80 text-white text-[10px] font-mono font-bold">
                            {video.duration}
                          </span>
                          <span className="absolute top-2 left-2 px-2 py-0.5 rounded bg-[#211711]/90 text-[#C49A6C] text-[10px] font-bold border border-[#594333]">
                            {video.category}
                          </span>
                        </div>

                        <div className="p-4 space-y-2">
                          <h3 className="text-sm font-bold text-[#F5EFE8] group-hover:text-[#C49A6C] transition-colors leading-snug line-clamp-2">
                            {video.title}
                          </h3>
                          <p className="text-xs text-[#C4B5A5] leading-relaxed line-clamp-2">
                            {video.description}
                          </p>
                        </div>
                      </div>

                      <div className="p-4 pt-0">
                        <div className="pt-2.5 border-t border-[#594333] flex items-center justify-between text-[11px] text-[#C49A6C] font-extrabold">
                          <span className="flex items-center gap-1">Watch Video <Play className="w-3 h-3 fill-current" /></span>
                          <span className="text-[10px] text-[#C4B5A5] font-normal">{video.publishedDate}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* SECTION B: WRITTEN BLOG RESEARCH ARTICLES (SEPARATE FROM VIDEOS) */}
          {(activeTab === 'all' || activeTab === 'articles') && (
            <section className="space-y-8">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#594333] pb-6">
                <div>
                  <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-widest text-[#C49A6C]">
                    <FileText className="w-4 h-4 text-[#C49A6C]" />
                    <span>Written Research &amp; Legal Guides</span>
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-black text-[#F5EFE8] mt-1">
                    Editorial Research Archive
                  </h2>
                </div>
                <span className="px-3.5 py-1.5 rounded-full bg-[#2B1E17] text-[#C4B5A5] border border-[#594333] text-xs font-bold self-start sm:self-auto">
                  {filteredPosts.length} Articles
                </span>
              </div>

              {/* Featured Article Card */}
              {selectedCategory === 'all' && !searchQuery.trim() && featured && activeTab === 'all' && (
                <div 
                  onClick={() => setActiveArticle(featured)}
                  className="bg-[#2B1E17] rounded-3xl border border-[#594333] overflow-hidden shadow-xl hover:border-[#C49A6C] transition-all duration-300 mb-10 grid grid-cols-1 lg:grid-cols-12 cursor-pointer group"
                >
                  <div className="lg:col-span-7 relative aspect-[16/10] lg:aspect-auto overflow-hidden bg-[#211711]">
                    <img 
                      src={featured.image} 
                      alt={featured.title} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    />
                    <div className="absolute top-4 left-4">
                      <span className="px-3 py-1 rounded-full bg-[#211711]/90 backdrop-blur-md text-[#C49A6C] text-[11px] font-bold uppercase tracking-wider border border-[#594333]">
                        Featured Insight
                      </span>
                    </div>
                  </div>

                  <div className="lg:col-span-5 p-8 sm:p-10 flex flex-col justify-between space-y-6">
                    <div className="space-y-3">
                      <div className="flex items-center gap-3 text-xs text-[#C4B5A5]">
                        <span className="font-bold text-[#C49A6C]">{featured.category}</span>
                        <span>·</span>
                        <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5 text-[#C49A6C]" />{featured.readTime}</span>
                      </div>

                      <h2 className="text-2xl sm:text-3xl font-black text-[#F5EFE8] group-hover:text-[#C49A6C] transition-colors leading-tight">
                        {featured.title}
                      </h2>

                      <p className="text-xs sm:text-sm text-[#C4B5A5] leading-relaxed">
                        {featured.excerpt}
                      </p>

                      <div className="flex flex-wrap gap-1.5 pt-2">
                        {featured.tags.map((t) => (
                          <span key={t} className="px-2 py-0.5 rounded-md bg-[#211711] text-[#C4B5A5] border border-[#594333] text-[10px] font-medium">
                            #{t}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="pt-4 border-t border-[#594333] flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <img src={featured.author.avatar} alt={featured.author.name} className="w-8 h-8 rounded-full object-cover border border-[#594333]" />
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
                <div className="bg-[#2B1E17] rounded-3xl border border-[#594333] p-10 text-center space-y-4">
                  <div className="w-12 h-12 rounded-2xl bg-[#211711] text-[#C49A6C] border border-[#594333] flex items-center justify-center mx-auto">
                    <Search className="w-5 h-5" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-lg font-extrabold text-[#F5EFE8]">No Matching Articles Found</h3>
                    <p className="text-xs sm:text-sm text-[#C4B5A5] max-w-md mx-auto">
                      No insights match your current search or category selection. Reset your filters to browse the full academy archive.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedCategory('all');
                    }}
                    className="px-5 py-2.5 rounded-xl bg-[#C49A6C] hover:bg-[#b0875a] text-[#211711] text-xs font-bold transition-colors cursor-pointer"
                  >
                    Reset Search &amp; Filters
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {filteredPosts.map((post) => (
                    <div
                      key={post.id}
                      onClick={() => setActiveArticle(post)}
                      className="bg-[#2B1E17] rounded-3xl border border-[#594333] overflow-hidden shadow-xl hover:border-[#C49A6C] transition-all duration-300 flex flex-col justify-between cursor-pointer group"
                    >
                      <div>
                        <div className="relative aspect-[16/10] overflow-hidden bg-[#211711]">
                          <img 
                            src={post.image} 
                            alt={post.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                          <div className="absolute top-3 left-3">
                            <span className="px-2.5 py-1 rounded-full bg-[#211711]/90 backdrop-blur-md text-[#F5EFE8] text-[10px] font-bold border border-[#594333]">
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
                            <img src={post.author.avatar} alt={post.author.name} className="w-6 h-6 rounded-full object-cover border border-[#594333]" />
                            <span className="text-[11px] font-semibold text-[#F5EFE8]">{post.author.name}</span>
                          </div>

                          <span className="text-xs font-bold text-[#C49A6C] flex items-center gap-0.5 group-hover:translate-x-1 transition-transform">
                            Read Article <ChevronRight className="w-3.5 h-3.5" />
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

        </div>
      </div>

      {/* STANDALONE VIDEO THEATER MODAL */}
      {activeVideo && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={activeVideo.title}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200"
          onClick={(e) => {
            if (e.target === e.currentTarget) setActiveVideo(null);
          }}
        >
          <div
            className="bg-[#2B1E17] text-[#F5EFE8] rounded-3xl max-w-4xl w-full my-8 overflow-hidden shadow-2xl border border-[#594333] text-left relative flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Video Header Bar */}
            <div className="p-5 bg-[#211711] border-b border-[#594333] flex items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-xs font-bold text-[#C49A6C] uppercase tracking-wider">
                <Video className="w-4 h-4 text-red-500 animate-pulse" />
                <span>{activeVideo.category} · {activeVideo.duration}</span>
              </div>
              <button
                type="button"
                aria-label="Close video theater"
                onClick={() => setActiveVideo(null)}
                className="min-w-[36px] min-h-[36px] rounded-full bg-[#2B1E17] text-[#F5EFE8] border border-[#594333] flex items-center justify-center hover:bg-[#35251C] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Responsive 16:9 Video Player */}
            <div className="relative aspect-video w-full bg-black">
              <iframe
                src={`https://www.youtube.com/embed/${activeVideo.youtubeId}?autoplay=1&rel=0&modestbranding=1`}
                title={activeVideo.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                referrerPolicy="strict-origin-when-cross-origin"
                className="absolute inset-0 h-full w-full border-0"
              />
            </div>

            {/* Video Details */}
            <div className="p-6 sm:p-8 space-y-3">
              <h2 className="text-xl sm:text-2xl font-black text-[#F5EFE8] leading-tight">
                {activeVideo.title}
              </h2>
              <p className="text-xs sm:text-sm text-[#C4B5A5] leading-relaxed">
                {activeVideo.description}
              </p>
              <div className="pt-3 border-t border-[#594333] flex items-center justify-between text-xs text-[#C4B5A5]">
                <span>Published: {activeVideo.publishedDate}</span>
                <button
                  type="button"
                  onClick={() => setActiveVideo(null)}
                  className="px-4 py-2 rounded-xl bg-[#C49A6C] text-[#211711] font-bold text-xs hover:bg-[#b0875a] transition-colors cursor-pointer"
                >
                  Done Watching
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ARTICLE READER MODAL */}
      {activeArticle && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={activeArticle.title}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200"
          onClick={(e) => {
            if (e.target === e.currentTarget) setActiveArticle(null);
          }}
        >
          <div
            className="bg-[#2B1E17] text-[#F5EFE8] rounded-3xl max-w-3xl w-full my-8 overflow-hidden shadow-2xl border border-[#594333] text-left relative max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            
            {/* Header Image */}
            <div className="relative aspect-[21/9] overflow-hidden bg-[#211711] shrink-0">
              <img src={activeArticle.image} alt={activeArticle.title} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#2B1E17] via-black/40 to-transparent" />
              <button
                type="button"
                aria-label="Close article reader"
                onClick={() => setActiveArticle(null)}
                className="absolute top-3 right-3 min-w-[44px] min-h-[44px] rounded-full bg-[#211711]/80 text-[#F5EFE8] border border-[#594333] flex items-center justify-center hover:bg-[#35251C] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
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
                  <img src={activeArticle.author.avatar} alt={activeArticle.author.name} className="w-10 h-10 rounded-full object-cover border border-[#594333]" />
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
                    <span key={t} className="px-2.5 py-1 rounded-lg bg-[#211711] text-[#C4B5A5] border border-[#594333] text-xs font-medium">
                      #{t}
                    </span>
                  ))}
                </div>

                <button
                  onClick={() => {
                    setActiveArticle(null);
                    onExploreProperties();
                  }}
                  className="py-2.5 px-5 rounded-xl bg-[#C49A6C] text-[#211711] hover:bg-[#b0875a] font-extrabold text-xs transition-colors cursor-pointer"
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
