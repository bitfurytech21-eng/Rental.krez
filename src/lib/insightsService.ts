import { InsightArticle, InsightCategory } from '../types/insights';
import { INSIGHT_CATEGORIES, INITIAL_INSIGHT_ARTICLES } from '../data/dossiersData';
import { ledger } from './ledger';

const STORAGE_KEY_ARTICLES = 'kretz_insight_articles_v1';
const STORAGE_KEY_CATEGORIES = 'kretz_insight_categories_v1';

class InsightsService {
  private articles: InsightArticle[] = [];
  private categories: InsightCategory[] = [];

  constructor() {
    this.init();
  }

  private init() {
    if (typeof window === 'undefined') {
      this.articles = [...INITIAL_INSIGHT_ARTICLES];
      this.categories = [...INSIGHT_CATEGORIES];
      return;
    }

    try {
      const storedArticles = localStorage.getItem(STORAGE_KEY_ARTICLES);
      if (storedArticles) {
        const parsed = JSON.parse(storedArticles);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Merge missing initial articles
          const existingSlugs = new Set(parsed.map(a => a.slug));
          const missing = INITIAL_INSIGHT_ARTICLES.filter(a => !existingSlugs.has(a.slug));
          this.articles = [...parsed, ...missing];
        } else {
          this.articles = [...INITIAL_INSIGHT_ARTICLES];
        }
      } else {
        this.articles = [...INITIAL_INSIGHT_ARTICLES];
        localStorage.setItem(STORAGE_KEY_ARTICLES, JSON.stringify(this.articles));
      }

      const storedCategories = localStorage.getItem(STORAGE_KEY_CATEGORIES);
      if (storedCategories) {
        const parsed = JSON.parse(storedCategories);
        if (Array.isArray(parsed) && parsed.length > 0) {
          this.categories = parsed;
        } else {
          this.categories = [...INSIGHT_CATEGORIES];
        }
      } else {
        this.categories = [...INSIGHT_CATEGORIES];
        localStorage.setItem(STORAGE_KEY_CATEGORIES, JSON.stringify(this.categories));
      }
    } catch {
      this.articles = [...INITIAL_INSIGHT_ARTICLES];
      this.categories = [...INSIGHT_CATEGORIES];
    }
  }

  private saveArticles() {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY_ARTICLES, JSON.stringify(this.articles));
      } catch (e) {
        console.error('Failed to save insight articles to storage', e);
      }
    }
  }

  public getCategories(): InsightCategory[] {
    return [...this.categories].sort((a, b) => a.featuredOrder - b.featuredOrder);
  }

  public getCategoryBySlug(slug: string): InsightCategory | undefined {
    return this.categories.find(c => c.slug === slug);
  }

  public getArticles(filters?: {
    categorySlug?: string;
    isDossier?: boolean;
    status?: string;
    searchQuery?: string;
    onlyFeatured?: boolean;
    tag?: string;
  }): InsightArticle[] {
    let result = [...this.articles];

    // Status filter
    if (filters?.status && filters.status !== 'all') {
      result = result.filter(a => a.status === filters.status);
    } else if (!filters?.status) {
      // Default: only published articles for public view
      result = result.filter(a => a.status === 'published');
    }

    // Category filter
    if (filters?.categorySlug && filters.categorySlug !== 'all') {
      result = result.filter(a => a.categorySlug === filters.categorySlug);
    }

    // Is dossier filter
    if (filters?.isDossier !== undefined) {
      result = result.filter(a => a.isDossier === filters.isDossier);
    }

    // Featured filter
    if (filters?.onlyFeatured) {
      result = result.filter(a => a.isFeatured);
    }

    // Tag filter
    if (filters?.tag) {
      const lowerTag = filters.tag.toLowerCase();
      result = result.filter(a => a.tags.some(t => t.toLowerCase() === lowerTag));
    }

    // Search query
    if (filters?.searchQuery && filters.searchQuery.trim()) {
      const q = filters.searchQuery.toLowerCase().trim();
      result = result.filter(a =>
        a.title.toLowerCase().includes(q) ||
        a.subtitle.toLowerCase().includes(q) ||
        a.excerpt.toLowerCase().includes(q) ||
        a.author.name.toLowerCase().includes(q) ||
        a.tags.some(t => t.toLowerCase().includes(q)) ||
        (a.dossierIssue && a.dossierIssue.toLowerCase().includes(q))
      );
    }

    // Sort by publication date descending
    return result.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
  }

  public getAllArticlesForAdmin(): InsightArticle[] {
    return [...this.articles].sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
  }

  public getArticleBySlug(slug: string): InsightArticle | undefined {
    return this.articles.find(a => a.slug === slug);
  }

  public getArticleById(id: string): InsightArticle | undefined {
    return this.articles.find(a => a.id === id);
  }

  public getFeaturedCoverStory(): InsightArticle | undefined {
    const published = this.articles.filter(a => a.status === 'published');
    const featured = published.find(a => a.isFeatured);
    return featured || published[0];
  }

  public getRelatedArticles(currentArticle: InsightArticle, limit: number = 3): InsightArticle[] {
    const published = this.articles.filter(a => a.status === 'published' && a.id !== currentArticle.id);
    
    // First match by explicit related slugs
    if (currentArticle.relatedArticleSlugs && currentArticle.relatedArticleSlugs.length > 0) {
      const explicit = published.filter(a => currentArticle.relatedArticleSlugs?.includes(a.slug));
      if (explicit.length >= limit) return explicit.slice(0, limit);
    }

    // Then match by same category
    const sameCat = published.filter(a => a.categorySlug === currentArticle.categorySlug);
    if (sameCat.length >= limit) return sameCat.slice(0, limit);

    // Fill with latest
    const combined = [...sameCat];
    for (const p of published) {
      if (!combined.some(c => c.id === p.id)) {
        combined.push(p);
      }
      if (combined.length >= limit) break;
    }
    return combined.slice(0, limit);
  }

  public incrementViews(slugOrId: string) {
    const art = this.articles.find(a => a.slug === slugOrId || a.id === slugOrId);
    if (art) {
      art.viewsCount = (art.viewsCount || 0) + 1;
      this.saveArticles();
    }
  }

  public incrementShares(slugOrId: string) {
    const art = this.articles.find(a => a.slug === slugOrId || a.id === slugOrId);
    if (art) {
      art.sharesCount = (art.sharesCount || 0) + 1;
      this.saveArticles();
    }
  }

  public createArticle(articleData: Omit<InsightArticle, 'id' | 'viewsCount' | 'sharesCount'>, adminEmail: string = 'admin@kretz.com'): InsightArticle {
    const newId = `art-dossier-${Date.now()}`;
    const newArticle: InsightArticle = {
      ...articleData,
      id: newId,
      viewsCount: 0,
      sharesCount: 0,
      publishedAt: articleData.publishedAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // If marked featured, unfeature others if desired
    if (newArticle.isFeatured) {
      this.articles.forEach(a => {
        if (a.isFeatured) a.isFeatured = false;
      });
    }

    this.articles.unshift(newArticle);
    this.saveArticles();

    // Immutable audit log
    ledger.recordAuditLog(
      'usr-admin-1',
      adminEmail,
      'INSIGHT_ARTICLE_CREATED',
      `Editorial Dossier "${newArticle.title}" created (${newArticle.categoryName}, status: ${newArticle.status}, slug: ${newArticle.slug})`
    );

    return newArticle;
  }

  public updateArticle(id: string, updates: Partial<InsightArticle>, adminEmail: string = 'admin@kretz.com'): InsightArticle {
    const idx = this.articles.findIndex(a => a.id === id);
    if (idx === -1) {
      throw new Error(`Article with id ${id} not found`);
    }

    // If updating to featured, unset others
    if (updates.isFeatured) {
      this.articles.forEach((a, i) => {
        if (i !== idx && a.isFeatured) a.isFeatured = false;
      });
    }

    const updated = {
      ...this.articles[idx],
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    this.articles[idx] = updated;
    this.saveArticles();

    ledger.recordAuditLog(
      'usr-admin-1',
      adminEmail,
      'INSIGHT_ARTICLE_UPDATED',
      `Editorial Dossier "${updated.title}" modified by ${adminEmail} (fields: ${Object.keys(updates).join(', ')})`
    );

    return updated;
  }

  public deleteArticle(id: string, adminEmail: string = 'admin@kretz.com'): boolean {
    const target = this.articles.find(a => a.id === id);
    if (!target) return false;

    this.articles = this.articles.filter(a => a.id !== id);
    this.saveArticles();

    ledger.recordAuditLog(
      'usr-admin-1',
      adminEmail,
      'INSIGHT_ARTICLE_DELETED',
      `Editorial Dossier "${target.title}" (ID: ${id}, Slug: ${target.slug}) deleted by ${adminEmail}`
    );

    return true;
  }

  public toggleFeatured(id: string, adminEmail: string = 'admin@kretz.com'): InsightArticle {
    const target = this.articles.find(a => a.id === id);
    if (!target) throw new Error('Article not found');

    const nextFeatured = !target.isFeatured;
    if (nextFeatured) {
      this.articles.forEach(a => {
        a.isFeatured = false;
      });
    }
    target.isFeatured = nextFeatured;
    target.updatedAt = new Date().toISOString();
    this.saveArticles();

    ledger.recordAuditLog(
      'usr-admin-1',
      adminEmail,
      'INSIGHT_ARTICLE_FEATURED_TOGGLED',
      `Editorial Dossier "${target.title}" featured flag set to ${nextFeatured}`
    );

    return target;
  }

  public toggleStatus(id: string, newStatus: InsightArticle['status'], adminEmail: string = 'admin@kretz.com'): InsightArticle {
    return this.updateArticle(id, { status: newStatus }, adminEmail);
  }
}

export const insightsService = new InsightsService();
