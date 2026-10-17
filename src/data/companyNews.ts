import { CompanyNewsItem } from '../types/news';

export const INITIAL_COMPANY_NEWS: CompanyNewsItem[] = [
  {
    id: 'news-kretz-paris-flagship',
    youtubeId: 'hJlujgm6GH4',
    youtubeUrl: 'https://youtu.be/hJlujgm6GH4',
    title: 'Kretz Real Estate ouvre un magasin : "On avait besoin d\'avoir une présence physique" (Olivier Kretz)',
    description: 'Olivier Kretz, founder of Kretz Real Estate, discusses on BFM Business (Good Morning Business with Laure Closier) the strategic opening of the brand\'s flagship boutique in the 7th arrondissement of Paris, bridging high-touch physical luxury client advisory with international prestige.',
    category: 'Company Updates',
    source: 'BFM Business',
    publishedDate: '2026-01-30',
    duration: '10:14',
    isFeatured: true,
    status: 'published',
    thumbnailUrl: 'https://i.ytimg.com/vi/hJlujgm6GH4/hqdefault.jpg',
    tags: ['Paris Expansion', 'Olivier Kretz', 'Flagship', 'Luxury Real Estate'],
    createdAt: '2026-01-30T09:00:00Z',
  },
  {
    id: 'news-kretz-stars-mondiales',
    youtubeId: 'DnIbo-CBXos',
    youtubeUrl: 'https://youtu.be/DnIbo-CBXos',
    title: 'Paris : ces agents immobiliers de luxe sont devenus des stars mondiales',
    description: 'An in-depth documentary reportage spotlighting how the Kretz family transformed boutique luxury real estate advisory into an internationally celebrated powerhouse, providing unprecedented access to iconic European châteaux, Parisian penthouses, and prime private mandates.',
    category: 'Documentaries & Media',
    source: 'AILLEURS ▸ reportages voyages',
    publishedDate: '2025-06-15',
    duration: '48:20',
    isFeatured: false,
    status: 'published',
    thumbnailUrl: 'https://i.ytimg.com/vi/DnIbo-CBXos/hqdefault.jpg',
    tags: ['Documentary', "L'Agence", 'Family Office', 'Paris Luxury'],
    createdAt: '2025-06-15T14:30:00Z',
  },
  {
    id: 'news-kretz-le-figaro-laeticia-hallyday',
    youtubeId: 'wYFKyG5xC1Y',
    youtubeUrl: 'https://youtu.be/wYFKyG5xC1Y',
    title: 'Valentin et Martin Kretz : "Nous sommes confiants pour vendre la maison de Laeticia Hallyday"',
    description: 'Valentin and Martin Kretz appear on Le Figaro TV to analyze prime property market trends, luxury pricing strategies, and the bespoke brokerage methodology behind transacting iconic trophy estates like the Marnes-la-Coquette private residence.',
    category: 'Property News & Market Insights',
    source: 'Le Figaro TV',
    publishedDate: '2024-11-20',
    duration: '14:35',
    isFeatured: false,
    status: 'published',
    thumbnailUrl: 'https://i.ytimg.com/vi/wYFKyG5xC1Y/hqdefault.jpg',
    tags: ['Valentin Kretz', 'Martin Kretz', 'Le Figaro', 'Prime Estates'],
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
