import { CompanyNewsItem } from '../types/news';

export const INITIAL_COMPANY_NEWS: CompanyNewsItem[] = [
  {
    id: 'news-kretz-exclusif-spotlight',
    youtubeId: 'dwmIqvREPz8',
    youtubeUrl: 'https://www.youtube.com/watch?v=dwmIqvREPz8',
    title: 'Inside the Future of Real Estate: Perspectives, Innovation & Market Transformation',
    description: 'Discover an industry-focused conversation exploring the ideas, technologies, and evolving perspectives shaping the real-estate sector. Explore the developments influencing property markets and the future of real-estate investment.',
    category: 'REAL ESTATE & INNOVATION',
    source: 'MEDIA FEATURE',
    publishedDate: '2026-02-15',
    duration: '12:45',
    isFeatured: true,
    status: 'published',
    thumbnailUrl: 'https://i.ytimg.com/vi/dwmIqvREPz8/hqdefault.jpg',
    tags: ['RealEstate', 'PropertyInvestment', 'Innovation', 'MarketInsights'],
    createdAt: '2026-02-15T09:00:00Z',
  },
  {
    id: 'news-kretz-paris-flagship',
    youtubeId: 'hJlujgm6GH4',
    youtubeUrl: 'https://youtu.be/hJlujgm6GH4',
    title: 'Physical Advisory Expansion: Establishing Flagship Client Advisory Locations',
    description: 'An analysis of physical client advisory hubs in prime European capitals, bridging high-touch investor services with international digital real-estate platform capabilities.',
    category: 'Company Updates',
    source: 'Industry Report',
    publishedDate: '2026-01-30',
    duration: '10:14',
    isFeatured: false,
    status: 'published',
    thumbnailUrl: 'https://i.ytimg.com/vi/hJlujgm6GH4/hqdefault.jpg',
    tags: ['Expansion', 'Advisory', 'Flagship', 'RealEstate'],
    createdAt: '2026-01-30T09:00:00Z',
  },
  {
    id: 'news-kretz-stars-mondiales',
    youtubeId: 'DnIbo-CBXos',
    youtubeUrl: 'https://youtu.be/DnIbo-CBXos',
    title: 'Global Capital Corridors: European Real Estate Market Dynamics',
    description: 'An in-depth perspective on cross-border capital flows, European prime property valuation trends, and institutional fractional co-ownership structuring.',
    category: 'Documentaries & Media',
    source: 'Market Intelligence',
    publishedDate: '2025-06-15',
    duration: '48:20',
    isFeatured: false,
    status: 'published',
    thumbnailUrl: 'https://i.ytimg.com/vi/DnIbo-CBXos/hqdefault.jpg',
    tags: ['GlobalRealEstate', 'MarketInsights', 'PropertyValuation'],
    createdAt: '2025-06-15T14:30:00Z',
  },
  {
    id: 'news-kretz-le-figaro-laeticia-hallyday',
    youtubeId: 'wYFKyG5xC1Y',
    youtubeUrl: 'https://youtu.be/wYFKyG5xC1Y',
    title: 'Prime Estate Valuations & Strategic Asset Liquidity',
    description: 'Evaluating prime residential asset liquidity, valuation methodologies, and advisory strategies for high-value European real estate properties.',
    category: 'Property News & Market Insights',
    source: 'Financial Press',
    publishedDate: '2024-11-20',
    duration: '14:35',
    isFeatured: false,
    status: 'published',
    thumbnailUrl: 'https://i.ytimg.com/vi/wYFKyG5xC1Y/hqdefault.jpg',
    tags: ['Valuations', 'PrimeRealEstate', 'MarketInsights'],
    createdAt: '2024-11-20T11:15:00Z',
  },
];

/**
 * Extracts a clean 11-character YouTube video ID from various URL formats
 */
export function extractYouTubeId(urlOrId: string): string | null {
  if (!urlOrId) return null;
  const trimmed = urlOrId.trim();

  // If already an 11-char ID
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return trimmed;
  }

  // Handle youtu.be/ID
  const shortMatch = trimmed.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
  if (shortMatch) return shortMatch[1];

  // Handle youtube.com/watch?v=ID
  const watchMatch = trimmed.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
  if (watchMatch) return watchMatch[1];

  // Handle youtube.com/embed/ID
  const embedMatch = trimmed.match(/embed\/([a-zA-Z0-9_-]{11})/);
  if (embedMatch) return embedMatch[1];

  return null;
}
