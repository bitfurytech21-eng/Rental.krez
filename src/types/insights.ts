export type InsightArticleStatus = 'published' | 'draft' | 'scheduled' | 'archived';

export interface InsightAuthor {
  name: string;
  role: string;
  avatar: string;
  bio?: string;
  organization?: string;
}

export interface InsightChapter {
  title: string;
  anchor: string;
  summary?: string;
}

export interface DownloadableResource {
  title: string;
  fileType: string;
  fileSize: string;
  downloadUrl: string;
}

export interface InsightCategory {
  id: string;
  slug: string;
  name: string;
  shortName: string;
  description: string;
  accentColor: string;
  icon: string;
  heroImage: string;
  featuredOrder: number;
}

export interface InsightArticle {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  excerpt: string;
  categorySlug: string;
  categoryName: string;
  isDossier: boolean;
  dossierIssue?: string; // e.g. "Dossier N° 14" or "Enquête Spéciale"
  chapters?: InsightChapter[];
  author: InsightAuthor;
  publishedAt: string;
  updatedAt?: string;
  scheduledPublishDate?: string;
  status: InsightArticleStatus;
  readTime: string; // e.g. "12 min read"
  coverImage: string;
  coverImageAlt: string;
  coverImageCaption: string;
  coverImageAttribution: string;
  isFeatured: boolean;
  isEditorsPick?: boolean;
  tags: string[];
  keyTakeaways: string[];
  content: string;
  viewsCount: number;
  sharesCount: number;
  downloadableResource?: DownloadableResource;
  relatedArticleSlugs?: string[];
}
