export type NewsCategory = 
  | 'Company Updates'
  | 'Documentaries & Media'
  | 'Property News & Market Insights'
  | 'Announcements';

export interface CompanyNewsItem {
  id: string;
  youtubeId: string;
  youtubeUrl: string;
  title: string;
  description: string;
  category: NewsCategory;
  source: string; // e.g. "BFM Business", "Le Figaro TV", "AILLEURS ▸ reportages voyages"
  publishedDate: string; // verifiable ISO or formatted date, e.g. "2026-01-30"
  duration?: string;
  isFeatured: boolean;
  status: 'published' | 'draft' | 'archived';
  thumbnailUrl: string;
  tags?: string[];
  createdAt: string;
  updatedAt?: string;
}
