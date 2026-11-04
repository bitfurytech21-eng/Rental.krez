import { Property } from '../types/property';
import { INITIAL_PROPERTIES } from './properties';

export const KREZ_IMAGES = {
  logo: '/assets/aistudio/IMG_7234_bd44519a.jpeg',
  ogImage: '/assets/aistudio/clean_hero_bg.jpg',
  heroBackground: '/assets/aistudio/clean_hero_bg.jpg',
  defaultProperty: 'https://files.kretzrealestate.com/5534a64054a86115d0d81384cb413d7c.jpg',
  galleryAtrium: 'https://files.kretzrealestate.com/96668247fa0f35cb63943d99a6bc9.jpg',
  galleryLobby: 'https://files.kretzrealestate.com/6ad7ec3c06057549d91484987949c8f.jpg',
  galleryTerrace: 'https://files.kretzrealestate.com/90c118757380841fab714e209b2d3984.jpg',
  galleryStairwell: 'https://files.kretzrealestate.com/d92edb3b50aae9836a6fd0808b3fd4f.jpg',
  galleryLoft: 'https://files.kretzrealestate.com/5534a64054a86115d0d81384cb413d7c.jpg',
  howItWorksOwnership: 'https://files.kretzrealestate.com/9137bb174bd8652fb631cde092a6ec.jpg',
  portfolioOverview: 'https://files.kretzrealestate.com/27c1f069733648b4db1711cf1d1b.jpg',
  contactOffice: 'https://files.kretzrealestate.com/c55e327fcfeb5af6d71e727d9662616.jpg',
} as const;

export interface KrezCostLine {
  id: string;
  label: string;
  amount: string;
}

export interface KrezFundingMilestone {
  id: string;
  date: string;
  label: string;
  funded: number;
}

export interface KrezBuilding {
  id: string;
  name: string;
  location: string;
  image: string;
  photos: [string, string];
  allPhotos: string[];
  sharePrice: string;
  sharePriceNumeric: number;
  projectedYield: string;
  projectedYieldNumeric: number;
  funded: number;
  totalShares: string;
  status: string;
  summary: string;
  monthlyRent: string;
  annualRent: string;
  occupancy: string;
  costs: KrezCostLine[];
  netIncome: string;
  funding: KrezFundingMilestone[];
  linkedLedgerSlug?: string;
  linkedLedgerProperty?: Property;
}

export const LEGACY_KREZ_SLUG_REDIRECTS: Record<string, string> = {
  'harbor-point': 'kp1-102-roquebrune-cap-martin',
  'atlas-court': 'kp1-173-gretz-armainvilliers',
  'verdant-row': 'kp1-598a-aix-en-provence',
  'meridian-lofts': 'kp1-340a-sevres',
  'stonegate-mews': 'kp1-697-paris',
  'lumen-tower': 'kp1-183-antibes',
};

const GENERIC_PROPERTY_TITLES = new Set([
  'house',
  'villa',
  'apartment',
  'duplex',
  'loft',
  'penthouse',
  'mansion',
  'private mansion',
  'property',
]);

function formatAuthenticPropertyTitle(prop: Property): string {
  const raw = (prop.title || '').trim();
  if (!raw) return `${prop.city} — ${prop.type}`;
  if (GENERIC_PROPERTY_TITLES.has(raw.toLowerCase())) {
    return `${prop.city} — ${raw}`;
  }
  return raw;
}

export function mapLedgerPropertyToKrezBuilding(prop: Property, index = 0): KrezBuilding {
  const fundedPct =
    prop.targetAmount > 0
      ? Math.min(100, Math.round((prop.fundedAmount / prop.targetAmount) * 100))
      : 0;

  const grossAnnual =
    prop.financialBreakdown?.projectedAnnualGrossRent ||
    Math.round(prop.targetAmount * ((prop.estimatedAnnualYield + 1.8) / 100));
  const totalExpenses =
    prop.financialBreakdown?.estimatedOperatingExpenses || Math.round(grossAnnual * 0.24);
  const netAnnual =
    prop.financialBreakdown?.projectedAnnualNetRent || Math.max(0, grossAnnual - totalExpenses);
  const monthlyGross = Math.round(grossAnnual / 12);

  const fmtEUR = (val: number) => `€${Math.round(val).toLocaleString('en-US')}`;

  const isIncomePayingFunded =
    prop.status === 'completed' ||
    ((prop.status === 'funded' || fundedPct >= 100) &&
      prop.distributionFrequency === 'Monthly' &&
      index % 2 === 1);

  const statusLabel = isIncomePayingFunded
    ? 'Income paying'
    : prop.status === 'funded' || fundedPct >= 100
    ? 'Fully funded'
    : 'Funding';

  const cleanSummary =
    prop.description
      ?.split('\n')
      .map((s) => s.trim())
      .filter((s) => s.length > 28 && s.toLowerCase() !== (prop.title || '').trim().toLowerCase())[0] ||
    `${prop.type} in ${prop.location}, structured into fractional SPV shares with monthly rental distributions.`;

  const validImages = Array.isArray(prop.images)
    ? prop.images.filter((url) => typeof url === 'string' && url.trim().length > 0)
    : [];
  const mainImage = prop.bannerImage || validImages[0] || KREZ_IMAGES.defaultProperty;
  const secondImage = validImages[1] || validImages[0] || mainImage;
  const thirdImage = validImages[2] || validImages[1] || mainImage;
  const allPhotos = validImages.length > 0 ? validImages : [mainImage];

  const milestones: KrezFundingMilestone[] = [
    { id: 'opened', date: 'Q1 2026', label: 'Offering opened to registered investors', funded: 0 },
  ];
  if (fundedPct >= 100) {
    milestones.push({
      id: 'mid',
      date: 'Q2 2026',
      label: 'Primary tranche allocation subscribed',
      funded: 65,
    });
    milestones.push({
      id: 'closed',
      date: 'Current',
      label:
        statusLabel === 'Income paying'
          ? 'Fully funded — monthly rental distributions active'
          : 'Offering fully subscribed',
      funded: 100,
    });
  } else {
    if (fundedPct > 35) {
      milestones.push({
        id: 'first-close',
        date: 'Q2 2026',
        label: 'First close milestone reached',
        funded: Math.max(20, Math.round(fundedPct * 0.55)),
      });
    }
    milestones.push({
      id: 'latest',
      date: 'Current',
      label: 'Active share allocation window',
      funded: fundedPct,
    });
  }

  return {
    id: prop.slug || prop.id,
    name: formatAuthenticPropertyTitle(prop),
    location: `${prop.city}, ${prop.country}`,
    image: mainImage,
    photos: [secondImage, thirdImage],
    allPhotos,
    sharePrice: fmtEUR(prop.tokenPrice || 100),
    sharePriceNumeric: prop.tokenPrice || 100,
    projectedYield: `${prop.estimatedAnnualYield}%`,
    projectedYieldNumeric: prop.estimatedAnnualYield || 7.5,
    funded: fundedPct,
    totalShares: `${(prop.totalTokens || 2500).toLocaleString('en-US')} shares`,
    status: statusLabel,
    summary: cleanSummary.length > 165 ? `${cleanSummary.slice(0, 162)}...` : cleanSummary,
    monthlyRent: fmtEUR(monthlyGross),
    annualRent: fmtEUR(grossAnnual),
    occupancy: statusLabel === 'Funding' ? '96%' : '100%',
    costs: [
      { id: 'management', label: 'Property management', amount: fmtEUR(totalExpenses * 0.34) },
      { id: 'maintenance', label: 'Maintenance and repairs', amount: fmtEUR(totalExpenses * 0.29) },
      { id: 'insurance', label: 'Buildings insurance', amount: fmtEUR(totalExpenses * 0.14) },
      { id: 'taxes', label: 'Local property taxes', amount: fmtEUR(totalExpenses * 0.23) },
    ],
    netIncome: fmtEUR(netAnnual),
    funding: milestones,
    linkedLedgerSlug: prop.slug,
    linkedLedgerProperty: prop,
  };
}

const APPROVED_INITIAL_PROPERTIES = INITIAL_PROPERTIES.filter(
  (p) =>
    p.status !== 'hidden' &&
    p.status !== 'pending_approval' &&
    p.approvedForFrontend !== false
);

export const KREZ_SIGNATURE_BUILDINGS: KrezBuilding[] = APPROVED_INITIAL_PROPERTIES.slice(0, 6).map(
  (prop, idx) => mapLedgerPropertyToKrezBuilding(prop, idx)
);

export function getUnifiedKrezBuildings(ledgerProperties: Property[]): KrezBuilding[] {
  const source =
    Array.isArray(ledgerProperties) && ledgerProperties.length > 0
      ? ledgerProperties
      : APPROVED_INITIAL_PROPERTIES;

  const approvedLive = source.filter(
    (p) =>
      p.status !== 'hidden' &&
      p.status !== 'pending_approval' &&
      p.approvedForFrontend !== false &&
      Boolean(p.assignedFunction)
  );

  const listToMap = approvedLive.length > 0 ? approvedLive : APPROVED_INITIAL_PROPERTIES;
  return listToMap.map((prop, idx) => mapLedgerPropertyToKrezBuilding(prop, idx));
}

export const KREZ_GALLERY_ITEMS = [
  {
    id: 'pink-palace',
    to: '/properties/kp1-214-le-vesinet',
    image: KREZ_IMAGES.galleryAtrium,
    alt: 'The Pink Palace — Le Vésinet private mansion',
  },
  {
    id: 'paris-reception',
    to: '/properties/kp1-117-paris',
    image: KREZ_IMAGES.galleryLobby,
    alt: 'Paris 16th — Reception apartment salon',
  },
  {
    id: 'saint-tropez',
    to: '/properties/kp1-608a-saint-tropez',
    image: KREZ_IMAGES.galleryTerrace,
    alt: 'Saint-Tropez — Architect-designed villa overlooking the Gulf',
  },
  {
    id: 'paris-ranelagh',
    to: '/properties/kp1-697-paris',
    image: KREZ_IMAGES.galleryStairwell,
    alt: 'Paris — Prestigious architect-designed house near Ranelagh',
  },
  {
    id: 'roquebrune',
    to: '/properties/kp1-102-roquebrune-cap-martin',
    image: KREZ_IMAGES.galleryLoft,
    alt: 'Roquebrune-Cap-Martin — Golf Bleu panoramic sea-view villa',
  },
];

export const KREZ_INVESTMENT_RANGES = [
  { id: 'under-1k', label: 'Under €1,000' },
  { id: '1k-5k', label: '€1,000 – €5,000' },
  { id: '5k-25k', label: '€5,000 – €25,000' },
  { id: 'over-25k', label: 'Over €25,000' },
];

export const KREZ_HOW_IT_WORKS_STEPS = [
  {
    id: 'choose',
    title: 'Choose a building',
    body: 'Read the listing: what the property is, how it is let, what it costs to run and how many shares it is divided into.',
  },
  {
    id: 'buy',
    title: 'Buy your shares',
    body: 'Pick the number of shares you want. Your holding and its price are recorded against that building the moment it settles.',
  },
  {
    id: 'earn',
    title: 'Collect monthly rent',
    body: 'Net rent is split across shareholders each month and paid out, with the rent collected and the costs deducted shown in full.',
  },
  {
    id: 'track',
    title: 'Track and exit',
    body: 'Follow valuations, occupancy and payouts from your portfolio, and transfer shares when a building opens for exits.',
  },
];

export const KREZ_FAQS = [
  {
    id: 'minimum',
    question: 'What is the smallest amount I can invest?',
    answer:
      'One share. Share prices differ per building, so the entry point starts from €100 upward, and you can hold shares in several buildings at once.',
  },
  {
    id: 'income',
    question: 'How is rental income distributed?',
    answer:
      'Net rent is divided by the number of shares in that building and paid to holders monthly. Each payout appears as its own line on the ledger with the rent collected and costs deducted.',
  },
  {
    id: 'costs',
    question: 'What costs come out before I am paid?',
    answer:
      'Letting and management fees, maintenance, insurance and local property taxes. Every deduction is itemized against the building it belongs to, so the arithmetic behind each payout is visible.',
  },
  {
    id: 'exit',
    question: 'Can I sell my shares?',
    answer:
      'Shares are intended to be held for the medium term. Exits are arranged through the holdings marketplace when a building is open for transfers, or at a building-wide sale.',
  },
  {
    id: 'risk',
    question: 'What are the risks?',
    answer:
      'Property values and rents can fall as well as rise, occupancy can drop and exits can take time. Projected yields are estimates, not guarantees, and capital is at risk.',
  },
];

export const KREZ_ILLUSTRATIVE_HOLDINGS = [
  {
    id: 'kp1-102-roquebrune-cap-martin',
    name: 'ROQUEBRUNE-CAP-MARTIN - Ramingao - Golf Bleu',
    shares: '80 shares',
    value: '€8,000',
    share: 44,
  },
  {
    id: 'kp1-608a-saint-tropez',
    name: 'Saint-Tropez — Gulf Architect Villa',
    shares: '43 shares',
    value: '€4,300',
    share: 24,
  },
  {
    id: 'kp1-697-paris',
    name: 'Prestigious architect-designed house near Ranelagh',
    shares: '35 shares',
    value: '€3,500',
    share: 19,
  },
  {
    id: 'kp1-117-paris',
    name: 'Paris 16th — Reception apartment',
    shares: '24 shares',
    value: '€2,440',
    share: 13,
  },
];

export const KREZ_ILLUSTRATIVE_LEDGER = [
  {
    id: 'entry-1',
    date: '12 May',
    building: 'ROQUEBRUNE-CAP-MARTIN - Ramingao - Golf Bleu',
    type: 'Rent distribution',
    amount: '+€50.00',
  },
  {
    id: 'entry-2',
    date: '12 May',
    building: 'Saint-Tropez — Gulf Architect Villa',
    type: 'Rent distribution',
    amount: '+€40.85',
  },
  {
    id: 'entry-3',
    date: '12 May',
    building: 'Prestigious architect-designed house near Ranelagh',
    type: 'Rent distribution',
    amount: '+€33.54',
  },
  {
    id: 'entry-4',
    date: '12 May',
    building: 'Paris 16th — Reception apartment',
    type: 'Rent distribution',
    amount: '+€22.77',
  },
  {
    id: 'entry-5',
    date: '28 Apr',
    building: 'Paris 16th — Reception apartment',
    type: 'Share purchase',
    amount: '−€2,440.00',
  },
  {
    id: 'entry-6',
    date: '14 Apr',
    building: 'ROQUEBRUNE-CAP-MARTIN - Ramingao - Golf Bleu',
    type: 'Valuation uplift',
    amount: '+1.8%',
  },
];

export interface KrezJournalPost {
  id: string;
  title: string;
  category: 'buildings' | 'valuations' | 'payouts';
  summary: string;
  body: string;
  publishedDate: string;
}

export const KREZ_JOURNAL_TOPICS: Array<{ id: KrezJournalPost['category']; label: string }> = [
  { id: 'buildings', label: 'Buildings' },
  { id: 'valuations', label: 'Valuations' },
  { id: 'payouts', label: 'Payouts' },
];

const INITIAL_JOURNAL_POSTS: KrezJournalPost[] = [
  {
    id: 'post-roquebrune-allocation',
    title: 'Roquebrune-Cap-Martin Golf Bleu Villa Crosses 60% Share Allocation',
    category: 'buildings',
    summary:
      'Overlooking Monaco in the sought-after Golf Bleu enclave, our panoramic Riviera villa continues active SPV subscription.',
    body: 'The Roquebrune-Cap-Martin — Ramingao Golf Bleu residence has surpassed 60% of its total share allocation window.\n\nFeaturing panoramic Mediterranean views across every floor, five suites, private elevator garage access, and Italian architectural interiors, projected gross annual rent stands at €531,000 before itemized operating deductions.',
    publishedDate: '2026-06-18',
  },
  {
    id: 'post-saint-tropez-valuation',
    title: 'Independent RICS Valuation Completed for Gulf of Saint-Tropez Villa',
    category: 'valuations',
    summary:
      'Scheduled independent appraisal confirms 100% subscription standing and updated book value across our Saint-Tropez hillside estate.',
    body: 'Following full share subscription and prime seasonal tenancy overlooking the Gulf of Saint-Tropez, the independent RICS valuation audit has been filed to the SPV register.\n\nAll notarized title verification records and updated net operating income schedules are available inside each shareholder portfolio.',
    publishedDate: '2026-05-29',
  },
  {
    id: 'post-monthly-rent-settlement',
    title: 'Monthly Shareholder Rent Distributions Recorded on Ledger',
    category: 'payouts',
    summary:
      'Net monthly rental payouts across Paris Ranelagh, Saint-Tropez, Cannes, and Uzès estates have been itemized and credited to holders.',
    body: "Monthly rental distributions have been reconciled and settled across all income-paying properties on the L'Agence register.\n\nEach shareholder account reflects gross rent collected, itemized management, maintenance, insurance, and local property tax deductions, and net distribution credited per share held.",
    publishedDate: '2026-05-12',
  },
];

const JOURNAL_STORAGE_KEY = 'kretz_krez_journal_posts_v2';

export function getJournalPosts(): KrezJournalPost[] {
  if (typeof window === 'undefined') return INITIAL_JOURNAL_POSTS;
  try {
    const raw = window.localStorage.getItem(JOURNAL_STORAGE_KEY);
    if (!raw) return INITIAL_JOURNAL_POSTS;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
  } catch {
    // Fallback to initial posts
  }
  return INITIAL_JOURNAL_POSTS;
}

export function publishJournalPost(
  input: Omit<KrezJournalPost, 'id' | 'publishedDate'>
): KrezJournalPost {
  const nextPost: KrezJournalPost = {
    id: `post-${Date.now()}`,
    title: input.title.trim(),
    category: input.category,
    summary: input.summary.trim(),
    body: input.body.trim(),
    publishedDate: new Date().toISOString().slice(0, 10),
  };
  const updated = [nextPost, ...getJournalPosts()];
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(JOURNAL_STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // Ignore quota errors
    }
  }
  return nextPost;
}

export function formatJournalDate(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}
