import React, { useState, useEffect } from 'react';
import { InsightArticle } from '../../types/insights';
import { insightsService } from '../../lib/insightsService';
import {
  BookOpen,
  Clock,
  Calendar,
  ArrowLeft,
  Share2,
  Copy,
  Check,
  Twitter,
  Linkedin,
  Facebook,
  Mail,
  Download,
  Eye,
  Bookmark,
  ChevronRight,
  TrendingUp,
  ShieldCheck,
  Building2,
  FileText,
  Printer
} from 'lucide-react';
import { formatDate } from '../../lib/utils';
import { updatePageSeo } from '../../lib/seo';

interface InsightArticleDetailProps {
  slug: string;
  onNavigateBack: () => void;
  onSelectArticle: (slug: string) => void;
  onSelectCategory?: (categorySlug: string) => void;
}

export const InsightArticleDetail: React.FC<InsightArticleDetailProps> = ({
  slug,
  onNavigateBack,
  onSelectArticle,
  onSelectCategory
}) => {
  const [copiedLink, setCopiedLink] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [downloadNotice, setDownloadNotice] = useState<string | null>(null);
  const [isBookmarked, setIsBookmarked] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    try {
      const saved = JSON.parse(localStorage.getItem('kretz_bookmarked_dossiers') || '[]');
      return saved.includes(slug);
    } catch {
      return false;
    }
  });

  const article = insightsService.getArticleBySlug(slug) || insightsService.getArticleById(slug);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (article) {
      insightsService.incrementViews(article.slug);

      // Inject SEO metadata and JSON-LD structured data for article
      updatePageSeo({
        title: `${article.title} | Kretz Real Estate Insights & Dossiers`,
        description: article.excerpt,
        image: article.coverImage,
        type: 'article',
        publishedTime: article.publishedAt,
        author: article.author.name,
        schemaType: 'Article',
      });
    }
  }, [slug, article]);

  // Track reading scroll progress
  useEffect(() => {
    const handleScroll = () => {
      const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (totalHeight > 0) {
        const currentProgress = (window.scrollY / totalHeight) * 100;
        setScrollProgress(Math.min(100, Math.max(0, currentProgress)));
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  if (!article) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-8 bg-[#F8FAFC] text-center space-y-4">
        <BookOpen className="w-12 h-12 text-slate-400" />
        <h2 className="text-xl font-bold text-[#18211F]">Article or Dossier Not Found</h2>
        <p className="text-xs text-[#69736F] max-w-md">
          The requested dossier may have been updated, relocated, or scheduled for a future publication date.
        </p>
        <button
          onClick={onNavigateBack}
          className="btn bg-[#182D2A] text-white text-xs font-bold px-5 py-2.5 rounded-xl flex items-center gap-2 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to Insights Hub</span>
        </button>
      </div>
    );
  }

  const relatedArticles = insightsService.getRelatedArticles(article, 3);
  const currentUrl = typeof window !== 'undefined' ? window.location.href : `https://kretzdespain.com/insights/${article.slug}`;

  const handleCopyLink = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(currentUrl);
      setCopiedLink(true);
      insightsService.incrementShares(article.slug);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  const twitterShareUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(currentUrl)}&text=${encodeURIComponent(`${article.title} - via Kretz Real Estate Dossiers & Insights`)}`;
  const linkedInShareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(currentUrl)}`;
  const whatsAppShareUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(`${article.title} - ${currentUrl}`)}`;
  const emailShareUrl = `mailto:?subject=${encodeURIComponent(`Kretz Dossier: ${article.title}`)}&body=${encodeURIComponent(`I thought you would find this in-depth real estate investigation interesting:\n\n${article.title}\n\nRead here: ${currentUrl}`)}`;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-[#0B1B30] text-white">
      
      {/* 1. Dynamic Reading Scroll Progress Bar */}
      <div className="fixed top-0 left-0 right-0 h-1 bg-[#1D3860] z-50">
        <div
          className="h-full bg-[#BEE179] transition-all duration-150"
          style={{ width: `${scrollProgress}%` }}
        />
      </div>

      {/* 2. Sticky Editorial Breadcrumb & Navigation Bar */}
      <section className="bg-[#0B1B30]/95 border-b border-[#1D3860] py-3.5 px-4 sm:px-6 sticky top-[74px] sm:top-[80px] z-30 shadow-xs backdrop-blur-md">
        <div className="max-w-[1240px] mx-auto flex items-center justify-between gap-4">
          
          <div className="flex items-center gap-2 text-xs text-[#8EA7C7] truncate">
            <button
              onClick={onNavigateBack}
              className="text-[#BEE179] hover:underline font-bold flex items-center gap-1 shrink-0 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-[#BEE179]" />
              <span>Insights</span>
            </button>
            <span>/</span>
            <span className="font-bold text-[#BEE179] shrink-0">{article.categoryName}</span>
            <span>/</span>
            <span className="truncate hidden sm:inline text-white">{article.title}</span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => {
                try {
                  const saved = JSON.parse(localStorage.getItem('kretz_bookmarked_dossiers') || '[]');
                  let updated: string[];
                  if (saved.includes(article.slug)) {
                    updated = saved.filter((s: string) => s !== article.slug);
                    setIsBookmarked(false);
                  } else {
                    updated = [...saved, article.slug];
                    setIsBookmarked(true);
                  }
                  localStorage.setItem('kretz_bookmarked_dossiers', JSON.stringify(updated));
                } catch {
                  setIsBookmarked(!isBookmarked);
                }
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                isBookmarked 
                  ? 'bg-[#BEE179] text-[#0B1B30] shadow-xs' 
                  : 'bg-[#102442] hover:bg-[#132745] text-white border border-[#1D3860]'
              }`}
              title={isBookmarked ? 'Bookmarked' : 'Save / Bookmark dossier'}
            >
              <Bookmark className={`w-3.5 h-3.5 ${isBookmarked ? 'fill-current text-[#0B1B30]' : 'text-[#BEE179]'}`} />
              <span className="hidden sm:inline">{isBookmarked ? 'Saved' : 'Save'}</span>
            </button>

            <button
              onClick={handleCopyLink}
              className="px-3 py-1.5 rounded-lg bg-[#102442] hover:bg-[#132745] text-white border border-[#1D3860] text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Copy article link"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 text-[#BEE179]" /> : <Copy className="w-3.5 h-3.5 text-[#BEE179]" />}
              <span className="hidden sm:inline">{copiedLink ? 'Link Copied!' : 'Share'}</span>
            </button>

            <button
              onClick={handlePrint}
              className="p-1.5 rounded-lg bg-[#102442] hover:bg-[#132745] text-white border border-[#1D3860] transition-colors cursor-pointer"
              title="Print article / Export PDF"
            >
              <Printer className="w-3.5 h-3.5 text-[#BEE179]" />
            </button>
          </div>

        </div>
      </section>

      {/* 3. Hero Article Header Zone */}
      <header className="pt-10 pb-8 px-4 sm:px-6 bg-[#0B1B30] border-b border-[#1D3860]">
        <div className="max-w-[960px] mx-auto text-left space-y-5">
          
          {/* Header Badges */}
          <div className="flex flex-wrap items-center gap-2.5">
            {article.isDossier && (
              <span className="px-3 py-1 rounded-full bg-[#BEE179] text-[#0B1B30] text-xs font-black uppercase tracking-wider">
                {article.dossierIssue || 'Major Dossier'}
              </span>
            )}
            <span className="px-3 py-1 rounded-full bg-[#102442] text-[#BEE179] border border-[#1D3860] text-xs font-bold">
              {article.categoryName}
            </span>
            <span className="text-xs text-[#8EA7C7] font-mono flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-[#BEE179]" />
              {article.readTime}
            </span>
            <span className="text-xs text-[#8EA7C7] font-mono flex items-center gap-1">
              <Eye className="w-3.5 h-3.5 text-[#BEE179]" />
              {article.viewsCount} reads
            </span>
          </div>

          {/* Main Title */}
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-[#BEE179] tracking-tight leading-[1.15]">
            {article.title}
          </h1>

          {/* Subtitle / Chapeau */}
          {article.subtitle && (
            <p className="text-base sm:text-lg text-[#D1E2F7] font-medium leading-relaxed italic border-l-2 border-[#BEE179] pl-4">
              {article.subtitle}
            </p>
          )}

          {/* Author Byline & Date Bar */}
          <div className="pt-4 border-t border-[#1D3860] flex flex-wrap items-center justify-between gap-4 text-xs">
            <div className="flex items-center gap-3">
              <img
                src={article.author.avatar}
                alt={article.author.name}
                className="w-11 h-11 rounded-full object-cover border-2 border-[#BEE179]"
              />
              <div>
                <span className="font-bold text-white block text-sm">{article.author.name}</span>
                <span className="text-[#8EA7C7] text-xs block">
                  {article.author.role} · {article.author.organization || 'Kretz Wealth Advisory'}
                </span>
              </div>
            </div>

            <div className="text-right text-[#8EA7C7]">
              <span className="block font-medium text-white">Published: {formatDate(article.publishedAt)}</span>
              {article.updatedAt && (
                <span className="block text-[11px] text-[#8EA7C7]">Updated: {formatDate(article.updatedAt)}</span>
              )}
            </div>
          </div>

        </div>
      </header>

      {/* 4. Article Featured Image */}
      <section className="px-4 sm:px-6 pt-8 pb-4 max-w-[1100px] mx-auto text-left">
        <figure className="space-y-2">
          <div className="rounded-3xl overflow-hidden aspect-[16/9] sm:aspect-[21/9] bg-[#0B1B30] border border-[#1D3860] shadow-md">
            <img
              src={article.coverImage}
              alt={article.coverImageAlt}
              className="w-full h-full object-cover"
              loading="eager"
            />
          </div>
          <figcaption className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[11px] text-[#8EA7C7] px-2 italic">
            <span>{article.coverImageCaption}</span>
            <span className="not-italic font-mono text-[10px] text-slate-300">{article.coverImageAttribution}</span>
          </figcaption>
        </figure>
      </section>

      {/* 5. Main Editorial Body Container */}
      <main className="py-8 px-4 sm:px-6 max-w-[960px] mx-auto text-left">
        
        {/* Executive Summary Box */}
        {article.keyTakeaways && article.keyTakeaways.length > 0 && (
          <aside className="mb-10 p-6 sm:p-8 rounded-3xl bg-[#102442] border-2 border-[#1D3860] shadow-xs space-y-4">
            <div className="flex items-center gap-2 text-[#BEE179]">
              <ShieldCheck className="w-5 h-5 text-[#BEE179]" />
              <h3 className="text-sm font-black uppercase tracking-wider">
                Dossier Key Takeaways & Executive Summary
              </h3>
            </div>
            <ul className="space-y-2.5 text-xs sm:text-sm text-[#D1E2F7] leading-relaxed">
              {article.keyTakeaways.map((takeaway, i) => (
                <li key={i} className="flex items-start gap-2.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#BEE179] mt-2 shrink-0" />
                  <span>{takeaway}</span>
                </li>
              ))}
            </ul>
          </aside>
        )}

        {/* Table of Contents */}
        {article.chapters && article.chapters.length > 0 && (
          <nav aria-label="Table of contents" className="mb-12 p-6 rounded-2xl bg-[#102442] border border-[#1D3860] shadow-xs space-y-3">
            <div className="flex items-center gap-2 text-white">
              <BookOpen className="w-4 h-4 text-[#BEE179]" />
              <h4 className="font-extrabold text-xs uppercase tracking-wider text-[#BEE179]">
                Dossier Chapter Summary
              </h4>
            </div>
            <div className="space-y-2 text-xs">
              {article.chapters.map((ch, idx) => (
                <a
                  key={idx}
                  href={`#${ch.anchor}`}
                  className="flex items-start justify-between py-1.5 px-2 rounded-lg hover:bg-[#0B1B30] text-[#D1E2F7] hover:text-white transition-colors group"
                >
                  <div className="space-y-0.5">
                    <span className="font-bold block group-hover:underline">
                      {idx + 1}. {ch.title}
                    </span>
                    {ch.summary && (
                      <span className="text-[11px] text-[#8EA7C7] block">{ch.summary}</span>
                    )}
                  </div>
                  <ChevronRight className="w-4 h-4 text-[#BEE179] opacity-80 group-hover:opacity-100 shrink-0 mt-1" />
                </a>
              ))}
            </div>
          </nav>
        )}

        {/* Formatted Content Rendering */}
        <article className="prose prose-invert max-w-none text-[#D1E2F7] leading-relaxed space-y-6 text-sm sm:text-base">
          {article.content.split('\n\n').map((block, idx) => {
            const trimmed = block.trim();
            if (!trimmed) return null;

            // Heading 2
            if (trimmed.startsWith('## ')) {
              return (
                <h2 key={idx} className="text-2xl sm:text-3xl font-black text-[#BEE179] pt-8 pb-2 border-b border-[#1D3860]">
                  {trimmed.replace('## ', '')}
                </h2>
              );
            }

            // Heading 3
            if (trimmed.startsWith('<h3')) {
              const textMatch = trimmed.match(/>([^<]+)<\/h3>/);
              const anchorMatch = trimmed.match(/id="([^"]+)"/);
              const title = textMatch ? textMatch[1] : trimmed;
              const anchorId = anchorMatch ? anchorMatch[1] : '';
              return (
                <h3 key={idx} id={anchorId} className="text-xl sm:text-2xl font-bold text-white pt-6 scroll-mt-28">
                  {title}
                </h3>
              );
            }

            // Blockquote
            if (trimmed.startsWith('> ')) {
              const quoteLines = trimmed.split('\n').map(l => l.replace(/^>\s*/, '')).join(' ');
              return (
                <blockquote key={idx} className="my-6 p-6 rounded-2xl bg-[#102442] border-l-4 border-[#BEE179] italic text-sm sm:text-base text-white">
                  {quoteLines}
                </blockquote>
              );
            }

            // Table Markdown
            if (trimmed.startsWith('|')) {
              const rows = trimmed.split('\n').filter(r => !r.includes(':---'));
              const headers = rows[0]?.split('|').map(c => c.trim()).filter(Boolean);
              const dataRows = rows.slice(1).map(r => r.split('|').map(c => c.trim()).filter(Boolean));

              return (
                <div key={idx} className="my-6 overflow-x-auto rounded-2xl border border-[#1D3860] shadow-xs">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-[#102442] text-[#BEE179]">
                      <tr>
                        {headers.map((h, i) => (
                          <th key={i} className="py-3 px-4 font-bold">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1D3860] bg-[#0B1B30]">
                      {dataRows.map((r, ri) => (
                        <tr key={ri} className="hover:bg-[#102442] transition-colors">
                          {r.map((cell, ci) => (
                            <td key={ci} className="py-3 px-4 font-medium text-white">{cell}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            }

            // Code Block
            if (trimmed.startsWith('```')) {
              const code = trimmed.replace(/^```[a-z]*\n/, '').replace(/\n```$/, '');
              return (
                <pre key={idx} className="my-6 p-4 rounded-xl bg-[#102442] border border-[#1D3860] text-[#BEE179] font-mono text-xs overflow-x-auto leading-normal">
                  <code>{code}</code>
                </pre>
              );
            }

            // Unordered List
            if (trimmed.startsWith('- ') || trimmed.startsWith('1. ')) {
              const lines = trimmed.split('\n');
              return (
                <ul key={idx} className="my-4 space-y-2 list-disc pl-5 text-sm sm:text-base text-[#D1E2F7]">
                  {lines.map((l, li) => (
                    <li key={li}>{l.replace(/^[-*]\s+|\d+\.\s+/, '')}</li>
                  ))}
                </ul>
              );
            }

            // Regular paragraph
            if (idx === 0 && trimmed.length > 100) {
              const firstLetter = trimmed.charAt(0);
              const rest = trimmed.slice(1);
              return (
                <p key={idx} className="leading-relaxed text-sm sm:text-base text-[#D1E2F7]">
                  <span className="float-left text-5xl font-black text-[#BEE179] leading-none pr-3 pt-1 font-serif">
                    {firstLetter}
                  </span>
                  {rest}
                </p>
              );
            }

            return (
              <p key={idx} className="leading-relaxed text-sm sm:text-base text-[#D1E2F7]">
                {trimmed}
              </p>
            );
          })}
        </article>

        {/* 6. Tags and Social Sharing Bar */}
        <div className="mt-12 pt-8 border-t border-[#1D3860] flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#BEE179] block">
              Dossier Taxonomy & Tags:
            </span>
            <div className="flex flex-wrap gap-2">
              {article.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-3 py-1 rounded-xl bg-[#102442] text-[#BEE179] border border-[#1D3860] text-xs font-bold"
                >
                  #{tag}
                </span>
              ))}
            </div>
          </div>

          <div className="space-y-2 text-right sm:text-right">
            <span className="text-xs font-bold uppercase tracking-wider text-[#BEE179] block">
              Share Investigation:
            </span>
            <div className="flex items-center gap-2 justify-end">
              <a
                href={twitterShareUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => insightsService.incrementShares(article.slug)}
                className="w-9 h-9 rounded-xl bg-[#102442] border border-[#1D3860] text-white hover:bg-[#132745] flex items-center justify-center transition-colors cursor-pointer"
                title="Share on X / Twitter"
                aria-label="Share on X / Twitter"
              >
                <Twitter className="w-4 h-4 text-[#BEE179]" />
              </a>
              <a
                href={linkedInShareUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => insightsService.incrementShares(article.slug)}
                className="w-9 h-9 rounded-xl bg-[#102442] border border-[#1D3860] text-white hover:bg-[#132745] flex items-center justify-center transition-colors cursor-pointer"
                title="Share on LinkedIn"
                aria-label="Share on LinkedIn"
              >
                <Linkedin className="w-4 h-4 text-[#BEE179]" />
              </a>
              <a
                href={whatsAppShareUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => insightsService.incrementShares(article.slug)}
                className="w-9 h-9 rounded-xl bg-[#102442] border border-[#1D3860] text-white hover:bg-[#132745] flex items-center justify-center transition-colors cursor-pointer"
                title="Share via WhatsApp"
                aria-label="Share via WhatsApp"
              >
                <Share2 className="w-4 h-4 text-[#BEE179]" />
              </a>
              <a
                href={emailShareUrl}
                onClick={() => insightsService.incrementShares(article.slug)}
                className="w-9 h-9 rounded-xl bg-[#102442] border border-[#1D3860] text-white hover:bg-[#132745] flex items-center justify-center transition-colors cursor-pointer"
                title="Share via Email"
                aria-label="Share via Email"
              >
                <Mail className="w-4 h-4 text-[#BEE179]" />
              </a>
              <button
                onClick={handleCopyLink}
                className="px-3 py-2 rounded-xl bg-[#BEE179] text-[#0B1B30] hover:bg-[#AEDB5B] text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedLink ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* 7. Author Bio Card */}
        <section className="mt-12 p-6 sm:p-8 rounded-3xl bg-[#102442] border border-[#1D3860] flex flex-col sm:flex-row items-center sm:items-start gap-6 text-left">
          <img
            src={article.author.avatar}
            alt={article.author.name}
            className="w-20 h-20 rounded-full object-cover border-4 border-[#BEE179] shadow-sm shrink-0"
          />
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[#BEE179]">Author & Editorial Lead</span>
              <span className="text-[#8EA7C7]">•</span>
              <span className="text-xs text-[#8EA7C7]">{article.author.organization || 'Kretz Advisory'}</span>
            </div>
            <h4 className="text-lg font-black text-white">
              {article.author.name}
            </h4>
            <p className="text-xs text-[#D1E2F7] leading-relaxed">
              {article.author.bio || 'Senior real estate analyst specializing in European residential and commercial property markets.'}
            </p>
          </div>
        </section>

        {/* 8. Whitepaper Download Module */}
        {article.downloadableResource && (
          <section className="mt-8 p-6 rounded-3xl bg-[#102442] border border-[#1D3860] text-white flex flex-col sm:flex-row items-center justify-between gap-4 text-left">
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#BEE179]">
                Print-Ready Whitepaper & Complete Dataset
              </span>
              <h5 className="font-extrabold text-sm sm:text-base text-white">
                {article.downloadableResource.title}
              </h5>
              <span className="text-xs text-[#8EA7C7] block font-mono">
                {article.downloadableResource.fileType} · {article.downloadableResource.fileSize} · High-Resolution Tables
              </span>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3">
              {downloadNotice && (
                <span className="text-xs text-[#BEE179] font-semibold animate-pulse">
                  {downloadNotice}
                </span>
              )}
              <button
                onClick={() => {
                  setDownloadNotice('Preparing official PDF whitepaper dataset...');
                  setTimeout(() => {
                    window.print();
                    setDownloadNotice(null);
                  }, 800);
                }}
                className="px-5 py-2.5 rounded-xl bg-[#BEE179] hover:bg-[#AEDB5B] text-[#0B1B30] text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer shrink-0 shadow-sm"
              >
                <Download className="w-4 h-4 text-[#0B1B30]" />
                <span>Download Whitepaper</span>
              </button>
            </div>
          </section>
        )}

      </main>

      {/* 9. Related Articles Grid */}
      {relatedArticles.length > 0 && (
        <section className="py-14 px-4 sm:px-6 bg-[#0B1B30] border-t border-[#1D3860]">
          <div className="max-w-[1240px] mx-auto text-left space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-[#BEE179]">Related Investigations</span>
                <h3 className="text-xl sm:text-2xl font-black text-white">
                  Further Reading in {article.categoryName}
                </h3>
              </div>
              <button
                onClick={onNavigateBack}
                className="text-xs font-bold text-[#BEE179] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>View All Insights</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {relatedArticles.map((rel) => (
                <div
                  key={rel.id}
                  onClick={() => onSelectArticle(rel.slug)}
                  className="bg-[#102442] rounded-2xl border border-[#1D3860] overflow-hidden shadow-xs hover:border-[#BEE179]/60 hover:shadow-lg transition-all duration-300 flex flex-col justify-between group cursor-pointer"
                >
                  <div>
                    <div className="aspect-[16/10] overflow-hidden bg-[#0B1B30]">
                      <img
                        src={rel.coverImage}
                        alt={rel.coverImageAlt}
                        className="w-full h-full object-cover group-hover:scale-104 transition-transform duration-500"
                        loading="lazy"
                      />
                    </div>
                    <div className="p-5 space-y-2">
                      <span className="text-[10px] font-bold text-[#BEE179] uppercase tracking-wider block">
                        {rel.categoryName}
                      </span>
                      <h4 className="font-black text-sm text-white group-hover:text-[#BEE179] transition-colors line-clamp-2 leading-snug">
                        {rel.title}
                      </h4>
                      <p className="text-xs text-[#D1E2F7] line-clamp-2">
                        {rel.excerpt}
                      </p>
                    </div>
                  </div>

                  <div className="p-5 pt-0 border-t border-[#1D3860] flex items-center justify-between text-[11px] text-[#8EA7C7]">
                    <span>{rel.readTime}</span>
                    <span className="font-bold text-[#BEE179] group-hover:underline">Read →</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

    </div>
  );
};
