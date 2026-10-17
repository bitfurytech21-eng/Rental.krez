import React, { useState, useEffect } from 'react';
import { CompanyNewsItem, NewsCategory } from '../../types/news';
import { ledger } from '../../lib/ledger';
import { extractYouTubeId } from '../../data/companyNews';
import {
  Tv,
  Plus,
  Play,
  Edit2,
  Trash2,
  Star,
  ExternalLink,
  Eye,
  EyeOff,
  Check,
  AlertCircle,
  X,
  Search,
  Filter,
  Sparkles,
  Link2,
  Calendar,
  Clock,
  Layers
} from 'lucide-react';

export const AdminNewsManager: React.FC = () => {
  const [newsList, setNewsList] = useState<CompanyNewsItem[]>(() => ledger.getNews());
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft'>('all');
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<CompanyNewsItem | null>(null);
  const [previewVideo, setPreviewVideo] = useState<CompanyNewsItem | null>(null);

  // Form states
  const [formYoutubeUrl, setFormYoutubeUrl] = useState('');
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formCategory, setFormCategory] = useState<NewsCategory>('Company Updates');
  const [formSource, setFormSource] = useState('Kretz Real Estate');
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
  const [formDuration, setFormDuration] = useState('10:00');
  const [formIsFeatured, setFormIsFeatured] = useState(false);
  const [formStatus, setFormStatus] = useState<'published' | 'draft'>('published');
  const [formTags, setFormTags] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [isFetchingOembed, setIsFetchingOembed] = useState(false);

  const refreshList = () => {
    setNewsList(ledger.getNews());
  };

  const handleOpenAddModal = () => {
    setEditingItem(null);
    setFormYoutubeUrl('');
    setFormTitle('');
    setFormDescription('');
    setFormCategory('Company Updates');
    setFormSource('BFM Business');
    setFormDate(new Date().toISOString().split('T')[0]);
    setFormDuration('');
    setFormIsFeatured(false);
    setFormStatus('published');
    setFormTags('');
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (item: CompanyNewsItem) => {
    setEditingItem(item);
    setFormYoutubeUrl(item.youtubeUrl);
    setFormTitle(item.title);
    setFormDescription(item.description);
    setFormCategory(item.category);
    setFormSource(item.source);
    setFormDate(item.publishedDate);
    setFormDuration(item.duration || '');
    setFormIsFeatured(item.isFeatured);
    setFormStatus(item.status === 'archived' ? 'draft' : item.status);
    setFormTags(item.tags ? item.tags.join(', ') : '');
    setFormError(null);
    setIsModalOpen(true);
  };

  // Auto-fetch oEmbed metadata from YouTube when URL changes
  const handleAutoFetchOembed = async () => {
    const yId = extractYouTubeId(formYoutubeUrl);
    if (!yId) {
      setFormError('Please enter a valid YouTube video link or 11-character video ID first.');
      return;
    }
    setIsFetchingOembed(true);
    setFormError(null);
    try {
      const res = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${yId}&format=json`);
      if (res.ok) {
        const data = await res.json();
        if (data.title && !formTitle) {
          setFormTitle(data.title);
        }
        if (data.author_name && formSource === 'Kretz Real Estate') {
          setFormSource(data.author_name);
        }
      }
    } catch {
      // safe fallback if blocked by CORS
    } finally {
      setIsFetchingOembed(false);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const yId = extractYouTubeId(formYoutubeUrl);
    if (!yId) {
      setFormError('Please provide a valid YouTube URL (e.g. https://youtu.be/... or https://www.youtube.com/watch?v=...)');
      return;
    }

    if (!formTitle.trim()) {
      setFormError('Please enter a video title.');
      return;
    }

    if (!formDescription.trim()) {
      setFormError('Please enter a short description.');
      return;
    }

    const cleanTags = formTags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    const thumbnailUrl = `https://i.ytimg.com/vi/${yId}/hqdefault.jpg`;
    const cleanUrl = formYoutubeUrl.startsWith('http')
      ? formYoutubeUrl
      : `https://youtu.be/${yId}`;

    if (editingItem) {
      ledger.updateNews(editingItem.id, {
        youtubeId: yId,
        youtubeUrl: cleanUrl,
        title: formTitle.trim(),
        description: formDescription.trim(),
        category: formCategory,
        source: formSource.trim(),
        publishedDate: formDate,
        duration: formDuration.trim() || undefined,
        isFeatured: formIsFeatured,
        status: formStatus,
        thumbnailUrl,
        tags: cleanTags,
      });
    } else {
      // Check for duplicate video ID
      const existing = newsList.find((n) => n.youtubeId === yId);
      if (existing) {
        setFormError(`This YouTube video (${yId}) is already published as: "${existing.title}".`);
        return;
      }

      ledger.addNews({
        youtubeId: yId,
        youtubeUrl: cleanUrl,
        title: formTitle.trim(),
        description: formDescription.trim(),
        category: formCategory,
        source: formSource.trim(),
        publishedDate: formDate,
        duration: formDuration.trim() || undefined,
        isFeatured: formIsFeatured,
        status: formStatus,
        thumbnailUrl,
        tags: cleanTags,
      });
    }

    setIsModalOpen(false);
    refreshList();
  };

  const handleToggleStatus = (id: string) => {
    ledger.toggleNewsStatus(id);
    refreshList();
  };

  const handleSetFeatured = (id: string) => {
    ledger.setFeaturedNews(id);
    refreshList();
  };

  const handleDelete = (id: string, title: string) => {
    if (window.confirm(`Are you sure you want to remove news video: "${title}"?`)) {
      ledger.deleteNews(id);
      refreshList();
    }
  };

  // Filtered news list for admin table
  const filteredItems = newsList.filter((item) => {
    const matchesSearch =
      !searchQuery.trim() ||
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.source.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.youtubeId.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory =
      categoryFilter === 'all' || item.category === categoryFilter;

    const matchesStatus =
      statusFilter === 'all' || item.status === statusFilter;

    return matchesSearch && matchesCategory && matchesStatus;
  });

  const featuredItem = newsList.find((n) => n.isFeatured);

  return (
    <div className="space-y-6">
      {/* Top Banner / Summary metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-[#DCE4DC] shadow-xs">
          <div className="flex items-center justify-between text-xs font-semibold text-[#52665D]">
            <span>Total Broadcasts</span>
            <Tv className="w-4 h-4 text-[#182D2A]" />
          </div>
          <div className="mt-2 text-2xl font-bold text-[#0F1E1B]">
            {newsList.length}
          </div>
          <div className="mt-1 text-xs text-[#697D74]">
            {newsList.filter((n) => n.status === 'published').length} published, {newsList.filter((n) => n.status === 'draft').length} drafts
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-[#DCE4DC] shadow-xs">
          <div className="flex items-center justify-between text-xs font-semibold text-[#52665D]">
            <span>Featured Video</span>
            <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
          </div>
          <div className="mt-2 text-sm font-bold text-[#0F1E1B] truncate">
            {featuredItem ? featuredItem.title : 'None set'}
          </div>
          <div className="mt-1 text-xs text-[#697D74]">
            {featuredItem ? `Source: ${featuredItem.source}` : 'Click star to feature video'}
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-[#DCE4DC] shadow-xs">
          <div className="flex items-center justify-between text-xs font-semibold text-[#52665D]">
            <span>Content Categories</span>
            <Layers className="w-4 h-4 text-[#107049]" />
          </div>
          <div className="mt-2 text-2xl font-bold text-[#0F1E1B]">
            {new Set(newsList.map((n) => n.category)).size}
          </div>
          <div className="mt-1 text-xs text-[#697D74]">
            Company, Media & Insights
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-[#DCE4DC] shadow-xs flex flex-col justify-between">
          <div className="text-xs font-semibold text-[#52665D]">
            Live Website Status
          </div>
          <a
            href="/news"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-[#F2F5F0] hover:bg-[#E4EBE3] text-[#182D2A] text-xs font-semibold rounded-lg transition-colors border border-[#D5DDD3]"
          >
            <span>View Company News Page</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {/* Control bar: Search, filters, Add button */}
      <div className="bg-white p-4 rounded-xl border border-[#DCE4DC] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          {/* Search */}
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-[#697D74] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search news by title or source..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-[#FBFBFA] border border-[#D5DDD3] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#182D2A] text-[#18211F]"
            />
          </div>

          {/* Category filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="text-xs bg-[#FBFBFA] border border-[#D5DDD3] rounded-lg px-2.5 py-1.5 text-[#18211F]"
          >
            <option value="all">All Categories</option>
            <option value="Company Updates">Company Updates</option>
            <option value="Documentaries & Media">Documentaries & Media</option>
            <option value="Property News & Market Insights">Property News & Market Insights</option>
            <option value="Announcements">Announcements</option>
          </select>

          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="text-xs bg-[#FBFBFA] border border-[#D5DDD3] rounded-lg px-2.5 py-1.5 text-[#18211F]"
          >
            <option value="all">All Statuses</option>
            <option value="published">Published Only</option>
            <option value="draft">Drafts Only</option>
          </select>
        </div>

        {/* Add video button */}
        <button
          onClick={handleOpenAddModal}
          className="btn btn-primary px-4 py-2 bg-[#182D2A] text-white hover:bg-[#203D39] text-xs font-semibold rounded-lg flex items-center gap-2 cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Add YouTube Video</span>
        </button>
      </div>

      {/* Videos Table */}
      <div className="bg-white rounded-xl border border-[#DCE4DC] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F2F5F0] text-[#52665D] uppercase text-[10px] tracking-wider font-bold border-b border-[#DCE4DC]">
              <tr>
                <th className="py-3 px-4">Video</th>
                <th className="py-3 px-4">Category & Source</th>
                <th className="py-3 px-4">Published Date</th>
                <th className="py-3 px-4 text-center">Featured</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EAEFEA]">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-[#697D74]">
                    No company news videos found matching your filters.
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => (
                  <tr key={item.id} className="hover:bg-[#F9FAF8] transition-colors">
                    {/* Video Column */}
                    <td className="py-3 px-4 max-w-sm">
                      <div className="flex items-start gap-3">
                        <div
                          className="relative w-24 h-14 bg-black rounded-lg overflow-hidden shrink-0 cursor-pointer group"
                          onClick={() => setPreviewVideo(item)}
                        >
                          <img
                            src={item.thumbnailUrl}
                            alt={item.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                          <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 flex items-center justify-center">
                            <Play className="w-4 h-4 text-white fill-white" />
                          </div>
                          {item.duration && (
                            <span className="absolute bottom-1 right-1 bg-black/80 text-[9px] font-mono text-white px-1 rounded">
                              {item.duration}
                            </span>
                          )}
                        </div>
                        <div className="overflow-hidden">
                          <p className="font-semibold text-[#0F1E1B] line-clamp-1">
                            {item.title}
                          </p>
                          <p className="text-[11px] text-[#697D74] line-clamp-1 mt-0.5">
                            {item.description}
                          </p>
                          <div className="flex items-center gap-1.5 mt-1 text-[10px] text-[#809187] font-mono">
                            <span>ID: {item.youtubeId}</span>
                            <a
                              href={item.youtubeUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-emerald-700 hover:underline flex items-center gap-0.5"
                            >
                              <ExternalLink className="w-2.5 h-2.5" />
                              YouTube
                            </a>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Category & Source */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="font-medium text-[#18211F]">{item.category}</div>
                      <div className="text-[11px] text-[#697D74] mt-0.5">{item.source}</div>
                    </td>

                    {/* Published Date */}
                    <td className="py-3 px-4 whitespace-nowrap text-[#52665D]">
                      {item.publishedDate}
                    </td>

                    {/* Featured Star Toggle */}
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => handleSetFeatured(item.id)}
                        className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                          item.isFeatured
                            ? 'text-amber-500 hover:text-amber-600 bg-amber-50'
                            : 'text-slate-300 hover:text-slate-500'
                        }`}
                        title={item.isFeatured ? 'Featured Video' : 'Click to mark as featured'}
                      >
                        <Star className={`w-4 h-4 ${item.isFeatured ? 'fill-amber-500' : ''}`} />
                      </button>
                    </td>

                    {/* Status Toggle */}
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => handleToggleStatus(item.id)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold cursor-pointer transition-colors ${
                          item.status === 'published'
                            ? 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                            : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
                        }`}
                      >
                        {item.status === 'published' ? (
                          <>
                            <Eye className="w-3 h-3 text-emerald-600" />
                            Published
                          </>
                        ) : (
                          <>
                            <EyeOff className="w-3 h-3 text-amber-600" />
                            Draft
                          </>
                        )}
                      </button>
                    </td>

                    {/* Action buttons */}
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setPreviewVideo(item)}
                          className="p-1.5 text-[#52665D] hover:text-[#182D2A] hover:bg-[#EEF2EC] rounded-lg"
                          title="Preview Video Player"
                        >
                          <Play className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleOpenEditModal(item)}
                          className="p-1.5 text-[#52665D] hover:text-[#182D2A] hover:bg-[#EEF2EC] rounded-lg"
                          title="Edit News Details"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(item.id, item.title)}
                          className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg"
                          title="Delete Video"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Video Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-[#DCE4DC]">
            <div className="p-6 border-b border-[#EAEFEA] flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-[#0F1E1B]">
                  {editingItem ? 'Edit Company News Video' : 'Add New YouTube Video'}
                </h3>
                <p className="text-xs text-[#697D74] mt-0.5">
                  Publish YouTube links directly into the Company News feed
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-[#697D74] hover:text-[#0F1E1B] rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-lg text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <span>{formError}</span>
                </div>
              )}

              {/* YouTube Link Input + Inspect button */}
              <div>
                <label className="block text-xs font-semibold text-[#18211F] mb-1">
                  YouTube Video Link or ID *
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Link2 className="w-4 h-4 text-[#809187] absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. https://youtu.be/hJlujgm6GH4 or https://www.youtube.com/watch?v=..."
                      value={formYoutubeUrl}
                      onChange={(e) => setFormYoutubeUrl(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-xs bg-[#FBFBFA] border border-[#D5DDD3] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#182D2A]"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleAutoFetchOembed}
                    disabled={isFetchingOembed || !formYoutubeUrl}
                    className="px-3 py-2 text-xs font-semibold bg-[#F2F5F0] hover:bg-[#E4EBE3] text-[#182D2A] border border-[#D5DDD3] rounded-lg transition-colors cursor-pointer shrink-0 disabled:opacity-50"
                  >
                    {isFetchingOembed ? 'Inspecting...' : 'Fetch Title'}
                  </button>
                </div>
                {formYoutubeUrl && extractYouTubeId(formYoutubeUrl) && (
                  <div className="mt-2 flex items-center gap-3 p-2 bg-[#F6F8F5] rounded-lg border border-[#DCE4DC]">
                    <img
                      src={`https://i.ytimg.com/vi/${extractYouTubeId(formYoutubeUrl)}/hqdefault.jpg`}
                      alt="Thumbnail preview"
                      className="w-16 h-10 object-cover rounded"
                    />
                    <div className="text-[11px] text-[#52665D]">
                      <span className="font-semibold text-emerald-800">Detected Video ID:</span>{' '}
                      <span className="font-mono">{extractYouTubeId(formYoutubeUrl)}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Title */}
              <div>
                <label className="block text-xs font-semibold text-[#18211F] mb-1">
                  News Headline / Video Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Enter the official broadcast title..."
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-[#FBFBFA] border border-[#D5DDD3] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#182D2A]"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-[#18211F] mb-1">
                  Description / Editorial Summary *
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="Provide an authentic synopsis of what happens in the video..."
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-[#FBFBFA] border border-[#D5DDD3] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#182D2A]"
                />
              </div>

              {/* Category & Source Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#18211F] mb-1">
                    Category *
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value as NewsCategory)}
                    className="w-full px-3 py-2 text-xs bg-[#FBFBFA] border border-[#D5DDD3] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#182D2A]"
                  >
                    <option value="Company Updates">Company Updates</option>
                    <option value="Documentaries & Media">Documentaries & Media</option>
                    <option value="Property News & Market Insights">Property News & Market Insights</option>
                    <option value="Announcements">Announcements</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#18211F] mb-1">
                    Source / Broadcast Channel *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. BFM Business, Le Figaro TV"
                    value={formSource}
                    onChange={(e) => setFormSource(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-[#FBFBFA] border border-[#D5DDD3] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#182D2A]"
                  />
                </div>
              </div>

              {/* Date & Duration Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#18211F] mb-1">
                    Publication Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-[#FBFBFA] border border-[#D5DDD3] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#182D2A]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#18211F] mb-1">
                    Video Duration (MM:SS)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 10:14"
                    value={formDuration}
                    onChange={(e) => setFormDuration(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-[#FBFBFA] border border-[#D5DDD3] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#182D2A]"
                  />
                </div>
              </div>

              {/* Tags */}
              <div>
                <label className="block text-xs font-semibold text-[#18211F] mb-1">
                  Tags (Comma separated)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Paris Expansion, Flagship, Olivier Kretz"
                  value={formTags}
                  onChange={(e) => setFormTags(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-[#FBFBFA] border border-[#D5DDD3] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#182D2A]"
                />
              </div>

              {/* Switches: Featured & Status */}
              <div className="flex flex-wrap items-center gap-6 pt-2">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-[#18211F]">
                  <input
                    type="checkbox"
                    checked={formIsFeatured}
                    onChange={(e) => setFormIsFeatured(e.target.checked)}
                    className="w-4 h-4 text-[#182D2A] rounded border-[#D5DDD3] focus:ring-[#182D2A]"
                  />
                  <span>Mark as Top Featured Video</span>
                </label>

                <div className="flex items-center gap-2 text-xs font-semibold text-[#18211F]">
                  <span>Status:</span>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as any)}
                    className="text-xs bg-[#FBFBFA] border border-[#D5DDD3] rounded px-2 py-1"
                  >
                    <option value="published">Published (Visible on site)</option>
                    <option value="draft">Draft (Hidden)</option>
                  </select>
                </div>
              </div>

              {/* Footer buttons */}
              <div className="pt-4 border-t border-[#EAEFEA] flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-[#52665D] hover:bg-[#F2F5F0] rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-semibold bg-[#182D2A] hover:bg-[#203D39] text-white rounded-lg transition-colors cursor-pointer"
                >
                  {editingItem ? 'Save Changes' : 'Publish Video'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Admin Video Preview Modal */}
      {previewVideo && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setPreviewVideo(null)}
        >
          <div
            className="bg-[#0F1E1B] text-white w-full max-w-3xl rounded-2xl overflow-hidden shadow-2xl border border-slate-700"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-3 border-b border-slate-800 flex items-center justify-between">
              <span className="text-xs font-semibold truncate text-slate-200">
                Preview: {previewVideo.title}
              </span>
              <button
                onClick={() => setPreviewVideo(null)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="relative aspect-video w-full bg-black">
              <iframe
                className="w-full h-full border-0"
                src={`https://www.youtube-nocookie.com/embed/${previewVideo.youtubeId}?autoplay=1&rel=0`}
                title={previewVideo.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            </div>
            <div className="p-4 bg-[#142421] text-xs flex justify-between items-center text-slate-300">
              <span>{previewVideo.source} · {previewVideo.category}</span>
              <button
                onClick={() => setPreviewVideo(null)}
                className="px-3 py-1 bg-slate-800 rounded text-slate-200 hover:bg-slate-700"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
