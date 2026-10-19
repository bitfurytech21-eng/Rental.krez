import React, { useState, useMemo } from 'react';
import { InsightArticle, InsightArticleStatus, InsightCategory } from '../../types/insights';
import { insightsService } from '../../lib/insightsService';
import {
  BookOpen,
  Plus,
  Search,
  Filter,
  Edit2,
  Trash2,
  Eye,
  Star,
  CheckCircle2,
  Clock,
  Calendar,
  AlertCircle,
  X,
  ExternalLink,
  UploadCloud,
  FileText,
  Sparkles,
  Layers,
  ChevronRight,
  ShieldCheck,
  TrendingUp,
  Cpu,
  Scale,
  Crown
} from 'lucide-react';
import { formatDate } from '../../lib/utils';

interface AdminInsightsCMSProps {
  currentAdminEmail?: string;
  onViewLiveArticle?: (slug: string) => void;
  onRefreshAll?: () => void;
}

export const AdminInsightsCMS: React.FC<AdminInsightsCMSProps> = ({
  currentAdminEmail = 'admin@kretz.com',
  onViewLiveArticle,
  onRefreshAll
}) => {
  const [articles, setArticles] = useState<InsightArticle[]>(() => insightsService.getAllArticlesForAdmin());
  const categories = useMemo(() => insightsService.getCategories(), []);

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dossierOnlyFilter, setDossierOnlyFilter] = useState(false);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingArticle, setEditingArticle] = useState<InsightArticle | null>(null);
  const [modalActiveTab, setModalActiveTab] = useState<'editor' | 'preview'>('editor');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Form states
  const [formTitle, setFormTitle] = useState('');
  const [formSubtitle, setFormSubtitle] = useState('');
  const [formSlug, setFormSlug] = useState('');
  const [formExcerpt, setFormExcerpt] = useState('');
  const [formCategorySlug, setFormCategorySlug] = useState('dossiers');
  const [formIsDossier, setFormIsDossier] = useState(true);
  const [formDossierIssue, setFormDossierIssue] = useState('Dossier N° 49');
  const [formAuthorName, setFormAuthorName] = useState('Dr. Alexandre Moreau');
  const [formAuthorRole, setFormAuthorRole] = useState('Chief Real Estate Economist');
  const [formAuthorAvatar, setFormAuthorAvatar] = useState('/assets/aistudio/IMG_7164_23f4c8e0.jpeg');
  const [formStatus, setFormStatus] = useState<InsightArticleStatus>('published');
  const [formScheduledDate, setFormScheduledDate] = useState('');
  const [formReadTime, setFormReadTime] = useState('12 min read');
  const [formCoverImage, setFormCoverImage] = useState('https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1600&q=80');
  const [formCoverAlt, setFormCoverAlt] = useState('European luxury real estate architecture');
  const [formCoverCaption, setFormCoverCaption] = useState('Prime architectural asset under institutional management');
  const [formCoverAttribution, setFormCoverAttribution] = useState('Photo by Kretz Editorial License');
  const [formIsFeatured, setFormIsFeatured] = useState(false);
  const [formTags, setFormTags] = useState('Market Barometer, Prime Yield, Paris');
  const [formTakeaways, setFormTakeaways] = useState('Key finding 1 regarding European cap rate normalization.\nKey finding 2 analyzing Latin American family office inflows.');
  const [formContent, setFormContent] = useState('');

  const refreshList = () => {
    setArticles(insightsService.getAllArticlesForAdmin());
    if (onRefreshAll) onRefreshAll();
  };

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  // Filtered articles list
  const filteredArticles = useMemo(() => {
    return articles.filter((a) => {
      const matchCat = categoryFilter === 'all' || a.categorySlug === categoryFilter;
      const matchStatus = statusFilter === 'all' || a.status === statusFilter;
      const matchDossier = !dossierOnlyFilter || a.isDossier;
      const q = searchQuery.toLowerCase().trim();
      const matchSearch = !q ||
        a.title.toLowerCase().includes(q) ||
        a.excerpt.toLowerCase().includes(q) ||
        a.slug.toLowerCase().includes(q) ||
        a.author.name.toLowerCase().includes(q);
      return matchCat && matchStatus && matchDossier && matchSearch;
    });
  }, [articles, categoryFilter, statusFilter, dossierOnlyFilter, searchQuery]);

  // Open Add modal with defaults
  const handleOpenAddModal = () => {
    setEditingArticle(null);
    setFormTitle('');
    setFormSubtitle('');
    setFormSlug('');
    setFormExcerpt('');
    setFormCategorySlug('dossiers');
    setFormIsDossier(true);
    setFormDossierIssue(`Dossier N° ${articles.filter(a => a.isDossier).length + 45}`);
    setFormAuthorName('Dr. Alexandre Moreau');
    setFormAuthorRole('Chief Real Estate Economist');
    setFormAuthorAvatar('/assets/aistudio/IMG_7164_23f4c8e0.jpeg');
    setFormStatus('published');
    setFormScheduledDate('');
    setFormReadTime('12 min read');
    setFormCoverImage('https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1600&q=80');
    setFormCoverAlt('Luxury architectural asset in Europe');
    setFormCoverCaption('Prime European property under institutional management');
    setFormCoverAttribution('Photo by Kretz Editorial License');
    setFormIsFeatured(false);
    setFormTags('Yields, Real Estate, Investment');
    setFormTakeaways('Key takeaway 1\nKey takeaway 2');
    setFormContent(`## Executive Summary\n\nIn-depth market investigation analyzing prime real estate trends across Europe.\n\n### 1. Macroeconomic Overview\n\nDetailed analysis of interest rates, capital flows, and capitalization rates.`);
    setModalActiveTab('editor');
    setIsModalOpen(true);
  };

  // Open Edit modal
  const handleOpenEditModal = (article: InsightArticle) => {
    setEditingArticle(article);
    setFormTitle(article.title);
    setFormSubtitle(article.subtitle || '');
    setFormSlug(article.slug);
    setFormExcerpt(article.excerpt);
    setFormCategorySlug(article.categorySlug);
    setFormIsDossier(article.isDossier);
    setFormDossierIssue(article.dossierIssue || '');
    setFormAuthorName(article.author.name);
    setFormAuthorRole(article.author.role);
    setFormAuthorAvatar(article.author.avatar);
    setFormStatus(article.status);
    setFormScheduledDate(article.scheduledPublishDate || '');
    setFormReadTime(article.readTime);
    setFormCoverImage(article.coverImage);
    setFormCoverAlt(article.coverImageAlt);
    setFormCoverCaption(article.coverImageCaption);
    setFormCoverAttribution(article.coverImageAttribution);
    setFormIsFeatured(article.isFeatured);
    setFormTags(article.tags.join(', '));
    setFormTakeaways(article.keyTakeaways ? article.keyTakeaways.join('\n') : '');
    setFormContent(article.content);
    setModalActiveTab('editor');
    setIsModalOpen(true);
  };

  // Helper to generate slug from title
  const handleGenerateSlug = (title: string) => {
    return title
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  };

  const handleTitleChange = (val: string) => {
    setFormTitle(val);
    if (!editingArticle) {
      setFormSlug(handleGenerateSlug(val));
    }
  };

  // Save Article
  const handleSaveArticle = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formSlug.trim()) {
      showNotification('error', 'Title and URL Slug are required.');
      return;
    }

    const cat = categories.find(c => c.slug === formCategorySlug);
    const categoryName = cat ? cat.name : 'Dossiers & Investigations';

    const parsedTags = formTags.split(',').map(t => t.trim()).filter(Boolean);
    const parsedTakeaways = formTakeaways.split('\n').map(t => t.trim()).filter(Boolean);

    try {
      if (editingArticle) {
        insightsService.updateArticle(
          editingArticle.id,
          {
            title: formTitle.trim(),
            subtitle: formSubtitle.trim(),
            slug: formSlug.trim(),
            excerpt: formExcerpt.trim(),
            categorySlug: formCategorySlug,
            categoryName: categoryName,
            isDossier: formIsDossier,
            dossierIssue: formIsDossier ? formDossierIssue.trim() : undefined,
            author: {
              name: formAuthorName.trim(),
              role: formAuthorRole.trim(),
              avatar: formAuthorAvatar.trim(),
              organization: 'Kretz Wealth Advisory'
            },
            status: formStatus,
            scheduledPublishDate: formStatus === 'scheduled' ? formScheduledDate : undefined,
            readTime: formReadTime.trim(),
            coverImage: formCoverImage.trim(),
            coverImageAlt: formCoverAlt.trim(),
            coverImageCaption: formCoverCaption.trim(),
            coverImageAttribution: formCoverAttribution.trim(),
            isFeatured: formIsFeatured,
            tags: parsedTags,
            keyTakeaways: parsedTakeaways,
            content: formContent.trim(),
          },
          currentAdminEmail
        );
        showNotification('success', `Dossier "${formTitle}" updated successfully.`);
      } else {
        insightsService.createArticle(
          {
            title: formTitle.trim(),
            subtitle: formSubtitle.trim(),
            slug: formSlug.trim(),
            excerpt: formExcerpt.trim(),
            categorySlug: formCategorySlug,
            categoryName: categoryName,
            isDossier: formIsDossier,
            dossierIssue: formIsDossier ? formDossierIssue.trim() : undefined,
            author: {
              name: formAuthorName.trim(),
              role: formAuthorRole.trim(),
              avatar: formAuthorAvatar.trim(),
              organization: 'Kretz Wealth Advisory'
            },
            publishedAt: new Date().toISOString(),
            status: formStatus,
            scheduledPublishDate: formStatus === 'scheduled' ? formScheduledDate : undefined,
            readTime: formReadTime.trim(),
            coverImage: formCoverImage.trim(),
            coverImageAlt: formCoverAlt.trim(),
            coverImageCaption: formCoverCaption.trim(),
            coverImageAttribution: formCoverAttribution.trim(),
            isFeatured: formIsFeatured,
            tags: parsedTags,
            keyTakeaways: parsedTakeaways,
            content: formContent.trim(),
          },
          currentAdminEmail
        );
        showNotification('success', `New dossier "${formTitle}" published to editorial repository.`);
      }

      setIsModalOpen(false);
      refreshList();
    } catch (err: any) {
      showNotification('error', err.message || 'Failed to save dossier article.');
    }
  };

  // Toggle Featured
  const handleToggleFeatured = (art: InsightArticle) => {
    try {
      const updated = insightsService.toggleFeatured(art.id, currentAdminEmail);
      refreshList();
      showNotification('success', `Article "${updated.title}" featured state updated.`);
    } catch (err: any) {
      showNotification('error', err.message);
    }
  };

  // Toggle Publish Status
  const handleTogglePublish = (art: InsightArticle) => {
    const nextStatus: InsightArticleStatus = art.status === 'published' ? 'draft' : 'published';
    try {
      insightsService.toggleStatus(art.id, nextStatus, currentAdminEmail);
      refreshList();
      showNotification('success', `Article status changed to ${nextStatus.toUpperCase()}.`);
    } catch (err: any) {
      showNotification('error', err.message);
    }
  };

  // Delete Article
  const handleDeleteArticle = (id: string) => {
    try {
      insightsService.deleteArticle(id, currentAdminEmail);
      setDeleteConfirmId(null);
      refreshList();
      showNotification('success', 'Article removed from editorial database.');
    } catch (err: any) {
      showNotification('error', err.message);
    }
  };

  return (
    <div className="space-y-6 text-left">
      
      {/* Toast Notification */}
      {notification && (
        <div className={`p-4 rounded-2xl flex items-center justify-between text-xs font-bold animate-in fade-in ${
          notification.type === 'success' 
            ? 'bg-emerald-50 text-emerald-900 border border-emerald-200' 
            : 'bg-red-50 text-red-900 border border-red-200'
        }`}>
          <div className="flex items-center gap-2">
            {notification.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-red-600" />}
            <span>{notification.message}</span>
          </div>
          <button onClick={() => setNotification(null)} className="text-slate-400 hover:text-slate-600">✕</button>
        </div>
      )}

      {/* Header zone with stats and Create button */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-[#E3E8E3] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
            <h2 className="text-xl font-black text-[#18211F]">
              Real Estate Dossiers & Editorial CMS
            </h2>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold">
              Immo Matin Structure
            </span>
          </div>
          <p className="text-xs text-[#69736F] mt-1 max-w-2xl">
            Authoritative editorial publishing suite. Manage multi-part dossiers, quarterly market barometers, 
            PropTech tokenization guides, and regulatory analyses with immutable audit trail.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleOpenAddModal}
            className="btn bg-[#182D2A] text-white hover:bg-[#24423C] text-xs font-bold px-4 py-2.5 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
          >
            <Plus className="w-4 h-4 text-[#B7E36A]" />
            <span>New Dossier / Article</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-[#E3E8E3] shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 text-xs">
        
        <div className="flex flex-wrap items-center gap-2">
          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 bg-[#F9FAF8] font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#182D2A]"
          >
            <option value="all">All Statuses ({articles.length})</option>
            <option value="published">Published ({articles.filter(a => a.status === 'published').length})</option>
            <option value="draft">Drafts ({articles.filter(a => a.status === 'draft').length})</option>
            <option value="scheduled">Scheduled ({articles.filter(a => a.status === 'scheduled').length})</option>
          </select>

          {/* Category filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 bg-[#F9FAF8] font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#182D2A]"
          >
            <option value="all">All Categories</option>
            {categories.map((c) => (
              <option key={c.slug} value={c.slug}>{c.shortName}</option>
            ))}
          </select>

          {/* Dossiers only toggle */}
          <button
            onClick={() => setDossierOnlyFilter(!dossierOnlyFilter)}
            className={`px-3 py-2 rounded-xl font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              dossierOnlyFilter 
                ? 'bg-[#182D2A] text-white shadow-xs' 
                : 'bg-[#F2F5F2] text-[#4A5551] hover:bg-[#E5ECE5]'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Major Dossiers Only</span>
          </button>
        </div>

        {/* Search */}
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search title, author, slug..."
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 bg-[#F9FAF8] text-xs focus:outline-none focus:ring-2 focus:ring-[#182D2A]"
          />
        </div>

      </div>

      {/* Articles Table */}
      <div className="bg-white rounded-3xl border border-[#E3E8E3] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-[#F8FAF7] border-b border-[#E3E8E3] text-[#55635F] uppercase font-bold text-[10px] tracking-wider">
              <tr>
                <th className="py-3.5 px-4">Article / Dossier</th>
                <th className="py-3.5 px-3">Category</th>
                <th className="py-3.5 px-3">Author</th>
                <th className="py-3.5 px-3">Status</th>
                <th className="py-3.5 px-3">Reads</th>
                <th className="py-3.5 px-3">Date</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EAEFEA]">
              {filteredArticles.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    No articles match current filters.
                  </td>
                </tr>
              ) : (
                filteredArticles.map((article) => (
                  <tr key={article.id} className="hover:bg-[#F9FAF8] transition-colors">
                    
                    {/* Title + Thumb */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3 max-w-md">
                        <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-900 shrink-0 relative">
                          <img
                            src={article.coverImage}
                            alt={article.coverImageAlt}
                            className="w-full h-full object-cover"
                          />
                          {article.isFeatured && (
                            <span className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full bg-amber-400" title="Featured Cover Story" />
                          )}
                        </div>
                        <div className="space-y-0.5 min-w-0">
                          <div className="flex items-center gap-1.5">
                            {article.isDossier && (
                              <span className="px-1.5 py-0.2 rounded bg-[#0E1F1B] text-[#B7E36A] font-bold text-[9px]">
                                {article.dossierIssue || 'DOSSIER'}
                              </span>
                            )}
                            {article.isFeatured && (
                              <span className="px-1.5 py-0.2 rounded bg-amber-100 text-amber-900 font-bold text-[9px] flex items-center gap-0.5">
                                <Star className="w-2.5 h-2.5 fill-amber-500 text-amber-500" />
                                Cover
                              </span>
                            )}
                          </div>
                          <span className="font-bold text-[#18211F] block truncate text-xs">
                            {article.title}
                          </span>
                          <span className="font-mono text-[10px] text-slate-400 block truncate">
                            /{article.slug}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Category */}
                    <td className="py-3.5 px-3">
                      <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 font-semibold text-[11px] whitespace-nowrap">
                        {article.categoryName}
                      </span>
                    </td>

                    {/* Author */}
                    <td className="py-3.5 px-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <img
                          src={article.author.avatar}
                          alt={article.author.name}
                          className="w-6 h-6 rounded-full object-cover"
                        />
                        <span className="font-medium text-[#18211F]">{article.author.name}</span>
                      </div>
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-3 whitespace-nowrap">
                      <button
                        onClick={() => handleTogglePublish(article)}
                        className={`px-2 py-0.5 rounded-full font-bold text-[10px] uppercase tracking-wider cursor-pointer transition-colors ${
                          article.status === 'published'
                            ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                            : article.status === 'scheduled'
                            ? 'bg-blue-100 text-blue-800 hover:bg-blue-200'
                            : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                        }`}
                        title="Click to toggle status"
                      >
                        {article.status}
                      </button>
                    </td>

                    {/* Reads */}
                    <td className="py-3.5 px-3 font-mono text-slate-600 whitespace-nowrap">
                      {article.viewsCount || 0}
                    </td>

                    {/* Date */}
                    <td className="py-3.5 px-3 text-slate-500 whitespace-nowrap text-[11px]">
                      {formatDate(article.publishedAt)}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        
                        {/* Toggle Featured */}
                        <button
                          onClick={() => handleToggleFeatured(article)}
                          className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                            article.isFeatured 
                              ? 'text-amber-500 bg-amber-50' 
                              : 'text-slate-400 hover:text-amber-500 hover:bg-slate-100'
                          }`}
                          title={article.isFeatured ? 'Unset from Cover Story' : 'Set as Featured Cover Story'}
                        >
                          <Star className={`w-3.5 h-3.5 ${article.isFeatured ? 'fill-amber-400' : ''}`} />
                        </button>

                        {/* View Live */}
                        {onViewLiveArticle && (
                          <button
                            onClick={() => onViewLiveArticle(article.slug)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-[#182D2A] hover:bg-slate-100 transition-colors cursor-pointer"
                            title="View live article"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* Edit */}
                        <button
                          onClick={() => handleOpenEditModal(article)}
                          className="p-1.5 rounded-lg text-emerald-700 hover:text-emerald-950 hover:bg-emerald-50 transition-colors cursor-pointer"
                          title="Edit article"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        {/* Delete */}
                        <button
                          onClick={() => setDeleteConfirmId(article.id)}
                          className="p-1.5 rounded-lg text-red-500 hover:text-red-700 hover:bg-red-50 transition-colors cursor-pointer"
                          title="Delete article"
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

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-in zoom-in-95">
            <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-base font-bold text-slate-900">Delete Editorial Article?</h3>
              <p className="text-xs text-slate-500">
                Are you sure you want to permanently delete this publication? This action will be recorded in the audit logs.
              </p>
            </div>
            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteArticle(deleteConfirmId)}
                className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-xs font-bold hover:bg-red-700 cursor-pointer"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create / Edit Article Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-6 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 my-auto">
            
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-[#E3E8E3] flex items-center justify-between bg-[#F8FAF7]">
              <div>
                <h3 className="text-base font-black text-[#18211F]">
                  {editingArticle ? 'Edit Editorial Dossier' : 'Create New Real Estate Dossier / Article'}
                </h3>
                <span className="text-[11px] text-[#69736F]">
                  Immo Matin investigative format with structured chapters, takeaways, and high-res photography.
                </span>
              </div>

              <div className="flex items-center gap-2">
                <div className="bg-[#E7ECE7] p-1 rounded-xl flex items-center gap-1 text-xs font-bold">
                  <button
                    onClick={() => setModalActiveTab('editor')}
                    className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                      modalActiveTab === 'editor' ? 'bg-white text-[#18211F] shadow-xs' : 'text-slate-600'
                    }`}
                  >
                    Editor
                  </button>
                  <button
                    onClick={() => setModalActiveTab('preview')}
                    className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                      modalActiveTab === 'preview' ? 'bg-white text-[#18211F] shadow-xs' : 'text-slate-600'
                    }`}
                  >
                    Live Preview
                  </button>
                </div>

                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-5 text-xs text-left">
              {modalActiveTab === 'editor' ? (
                <form id="dossier-form" onSubmit={handleSaveArticle} className="space-y-4">
                  
                  {/* Row 1: Title & URL Slug */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="font-bold text-slate-700 block">Article Title *</label>
                      <input
                        type="text"
                        required
                        value={formTitle}
                        onChange={(e) => handleTitleChange(e.target.value)}
                        placeholder="e.g. The 2026 European Prime Real Estate Yield Barometer..."
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-[#F9FAF8] focus:bg-white focus:ring-2 focus:ring-[#182D2A]"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="font-bold text-slate-700 block">URL Slug *</label>
                      <input
                        type="text"
                        required
                        value={formSlug}
                        onChange={(e) => setFormSlug(e.target.value)}
                        placeholder="e.g. barometre-rendements-immobiliers-2026"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-mono bg-[#F9FAF8] focus:bg-white focus:ring-2 focus:ring-[#182D2A]"
                      />
                    </div>
                  </div>

                  {/* Row 2: Subtitle / Chapeau */}
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700 block">Editorial Subtitle / Abstract</label>
                    <input
                      type="text"
                      value={formSubtitle}
                      onChange={(e) => setFormSubtitle(e.target.value)}
                      placeholder="An exhaustive cross-border analysis comparing net capitalization rates..."
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-[#F9FAF8] focus:bg-white focus:ring-2 focus:ring-[#182D2A]"
                    />
                  </div>

                  {/* Row 3: Excerpt */}
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700 block">Lead Excerpt (Summary for Cards) *</label>
                    <textarea
                      rows={2}
                      required
                      value={formExcerpt}
                      onChange={(e) => setFormExcerpt(e.target.value)}
                      placeholder="Brief 2-3 sentence overview shown in feed cards..."
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-[#F9FAF8] focus:bg-white focus:ring-2 focus:ring-[#182D2A]"
                    />
                  </div>

                  {/* Row 4: Category, Dossier Flag & Issue */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <label className="font-bold text-slate-700 block">Category *</label>
                      <select
                        value={formCategorySlug}
                        onChange={(e) => setFormCategorySlug(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-[#F9FAF8] font-semibold text-slate-700"
                      >
                        {categories.map((c) => (
                          <option key={c.slug} value={c.slug}>{c.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="font-bold text-slate-700 block">Dossier Classification</label>
                      <div className="flex items-center gap-2 pt-2">
                        <input
                          type="checkbox"
                          id="isDossierCheck"
                          checked={formIsDossier}
                          onChange={(e) => setFormIsDossier(e.target.checked)}
                          className="w-4 h-4 rounded text-emerald-800"
                        />
                        <label htmlFor="isDossierCheck" className="font-semibold text-slate-700 cursor-pointer">
                          Major Investigative Dossier
                        </label>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="font-bold text-slate-700 block">Issue Label</label>
                      <input
                        type="text"
                        value={formDossierIssue}
                        onChange={(e) => setFormDossierIssue(e.target.value)}
                        placeholder="e.g. Dossier N° 49"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-[#F9FAF8]"
                      />
                    </div>
                  </div>

                  {/* Row 5: Author Details */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <label className="font-bold text-slate-700 block">Author Name *</label>
                      <input
                        type="text"
                        required
                        value={formAuthorName}
                        onChange={(e) => setFormAuthorName(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-[#F9FAF8]"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="font-bold text-slate-700 block">Author Title / Role *</label>
                      <input
                        type="text"
                        required
                        value={formAuthorRole}
                        onChange={(e) => setFormAuthorRole(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-[#F9FAF8]"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="font-bold text-slate-700 block">Estimated Read Time</label>
                      <input
                        type="text"
                        value={formReadTime}
                        onChange={(e) => setFormReadTime(e.target.value)}
                        placeholder="e.g. 14 min read"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-[#F9FAF8]"
                      />
                    </div>
                  </div>

                  {/* Row 6: Cover Image & Photography Metadata */}
                  <div className="space-y-2 p-4 rounded-2xl bg-[#F6F7F4] border border-slate-200">
                    <span className="font-bold text-slate-800 block text-xs uppercase tracking-wider">
                      Cover Photography & Rights Attribution
                    </span>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="font-semibold text-slate-600">Image URL *</label>
                        <input
                          type="text"
                          required
                          value={formCoverImage}
                          onChange={(e) => setFormCoverImage(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="font-semibold text-slate-600">Alt Text (Accessibility) *</label>
                        <input
                          type="text"
                          required
                          value={formCoverAlt}
                          onChange={(e) => setFormCoverAlt(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="font-semibold text-slate-600">Caption Description</label>
                        <input
                          type="text"
                          value={formCoverCaption}
                          onChange={(e) => setFormCoverCaption(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="font-semibold text-slate-600">Attribution Credit</label>
                        <input
                          type="text"
                          value={formCoverAttribution}
                          onChange={(e) => setFormCoverAttribution(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Row 7: Key Takeaways (One per line) */}
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700 block">Key Takeaways (One finding per line)</label>
                    <textarea
                      rows={3}
                      value={formTakeaways}
                      onChange={(e) => setFormTakeaways(e.target.value)}
                      placeholder="Point 1&#10;Point 2&#10;Point 3"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-[#F9FAF8]"
                    />
                  </div>

                  {/* Row 8: Tags */}
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700 block">Tags (Comma-separated)</label>
                    <input
                      type="text"
                      value={formTags}
                      onChange={(e) => setFormTags(e.target.value)}
                      placeholder="e.g. Yields, Paris Real Estate, Cap Rates, Tokenization"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-[#F9FAF8]"
                    />
                  </div>

                  {/* Row 9: Article Content (Markdown) */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="font-bold text-slate-700 block">Article Body (Markdown Supported) *</label>
                      <div className="flex items-center gap-1.5 text-[10px]">
                        <button
                          type="button"
                          onClick={() => setFormContent(prev => prev + '\n\n## Section Title\n\nParagraph text here.')}
                          className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer font-bold"
                        >
                          + H2
                        </button>
                        <button
                          type="button"
                          onClick={() => setFormContent(prev => prev + '\n\n<h3 id="anchor-name">1. Subheading</h3>\n\n')}
                          className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer font-bold"
                        >
                          + H3 Anchor
                        </button>
                        <button
                          type="button"
                          onClick={() => setFormContent(prev => prev + '\n\n> "Notable editorial pull quote goes here."\n> — Expert Name\n\n')}
                          className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer font-bold"
                        >
                          + Quote
                        </button>
                        <button
                          type="button"
                          onClick={() => setFormContent(prev => prev + '\n\n| Column 1 | Column 2 | Column 3 |\n| :--- | :--- | :--- |\n| Val 1 | Val 2 | Val 3 |\n\n')}
                          className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer font-bold"
                        >
                          + Table
                        </button>
                      </div>
                    </div>
                    <textarea
                      rows={12}
                      required
                      value={formContent}
                      onChange={(e) => setFormContent(e.target.value)}
                      placeholder="Write your comprehensive analysis here..."
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-mono text-xs bg-[#F9FAF8] focus:bg-white"
                    />
                  </div>

                  {/* Row 10: Publishing Status & Featured Options */}
                  <div className="p-4 rounded-2xl bg-[#EEF2EC] flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div>
                        <label className="font-bold text-slate-700 block text-[11px] mb-1">Status</label>
                        <select
                          value={formStatus}
                          onChange={(e) => setFormStatus(e.target.value as InsightArticleStatus)}
                          className="px-3 py-1.5 rounded-xl border border-slate-300 bg-white font-bold text-slate-800"
                        >
                          <option value="published">Published</option>
                          <option value="draft">Draft (Private)</option>
                          <option value="scheduled">Scheduled</option>
                        </select>
                      </div>

                      <div className="flex items-center gap-2 pt-4">
                        <input
                          type="checkbox"
                          id="isFeaturedCheck"
                          checked={formIsFeatured}
                          onChange={(e) => setFormIsFeatured(e.target.checked)}
                          className="w-4 h-4 rounded text-amber-600"
                        />
                        <label htmlFor="isFeaturedCheck" className="font-bold text-slate-800 cursor-pointer">
                          Featured Cover Story (Homepage Hero)
                        </label>
                      </div>
                    </div>

                    <div className="text-right">
                      <button
                        type="submit"
                        className="btn bg-[#182D2A] text-white hover:bg-[#24423C] font-bold text-xs px-6 py-2.5 rounded-xl cursor-pointer shadow-md"
                      >
                        {editingArticle ? 'Save Changes' : 'Publish Article'}
                      </button>
                    </div>
                  </div>

                </form>
              ) : (
                /* Live Preview tab */
                <div className="space-y-6">
                  <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-semibold">
                    Live Editorial Preview: This is an approximation of how readers will experience this article.
                  </div>

                  <div className="space-y-3">
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                      {categories.find(c => c.slug === formCategorySlug)?.name || 'Dossier'}
                    </span>
                    <h2 className="text-2xl font-black text-slate-900">{formTitle || 'Untitled Dossier'}</h2>
                    {formSubtitle && <p className="text-sm italic text-slate-600">{formSubtitle}</p>}
                    <p className="text-xs text-slate-700">{formExcerpt}</p>
                  </div>

                  {formCoverImage && (
                    <div className="rounded-2xl overflow-hidden aspect-[16/9] bg-slate-900">
                      <img src={formCoverImage} alt={formCoverAlt} className="w-full h-full object-cover" />
                    </div>
                  )}

                  <div className="prose text-xs text-slate-800 whitespace-pre-wrap font-sans">
                    {formContent}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 border-t border-[#E3E8E3] bg-[#F8FAF7] flex items-center justify-between">
              <span className="text-[11px] text-slate-500">
                Logged in as <strong className="text-slate-800">{currentAdminEmail}</strong>
              </span>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 rounded-xl text-slate-600 hover:text-slate-900 font-bold"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
