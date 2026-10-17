/**
 * Centralized SEO Metadata Management Utility
 * 
 * Dynamically injects and updates document title, meta description,
 * OpenGraph social share cards (LinkedIn, Facebook, Discord, Slack),
 * Twitter / X Cards, and Schema.org JSON-LD structured data based on the current route.
 */

export interface PageSeoConfig {
  title: string;
  description: string;
  path: string;
  image?: string;
  type?: 'website' | 'article' | 'profile';
  publishedTime?: string;
  author?: string;
  schemaType?: 'RealEstateAgent' | 'FinancialService' | 'WebSite' | 'Article';
}

const DEFAULT_SEO: PageSeoConfig = {
  title: 'Kretz Real Estate | Institutional Real Estate & Asset Tokenization',
  description: 'Institutional-grade tokenized luxury real estate and prime European property investments. Ring-fenced SPV custody, independent valuations, and automated monthly distributions.',
  path: '/',
  image: 'https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=1200&q=80',
  type: 'website',
  schemaType: 'RealEstateAgent',
};

const ROUTE_SEO_MAP: Record<string, Partial<PageSeoConfig>> = {
  '/': {
    title: 'Kretz Real Estate | Institutional Real Estate & Asset Tokenization',
    description: 'Invest in fractionalized luxury European properties with tokenized ERC-20 smart contracts, Ring-fenced SPV custody, and 12-15% projected IRR.',
    image: 'https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=1200&q=80',
  },
  '/properties': {
    title: 'Luxury Property Marketplace | Kretz Real Estate',
    description: 'Explore exclusive prime European villas, Parisian penthouses, and Madrid estates available for fractional tokenized investment starting at €1,000.',
    image: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200&q=80',
  },
  '/casos-de-exito': {
    title: 'Success Stories & Realized Exits | Kretz Real Estate',
    description: 'Review realized property exits, historical investor distributions, and 15.4% average annualized IRR across trophy European real estate portfolios.',
    image: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80',
  },
  '/agency': {
    title: 'The Kretz Family Office & Advisory | Luxury Brokerage',
    description: 'Meet the Kretz family and international advisors bridging high-touch physical luxury real estate brokerage with secure blockchain asset tokenization.',
    image: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=1200&q=80',
  },
  '/news': {
    title: 'Company News & Broadcasts | Kretz Real Estate',
    description: 'Official announcements, BFM Business and Le Figaro TV interviews, documentary reports, and press coverage of the Kretz family office.',
    image: 'https://i.ytimg.com/vi/hJlujgm6GH4/hqdefault.jpg',
    type: 'article',
  },
  '/club': {
    title: 'Kretz Club Privé | Exclusive Investor Membership',
    description: 'Unlock VIP access to off-market private viewings, concierge family office advisory, priority allocation pools, and luxury yacht charters.',
    image: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=1200&q=80',
  },
  '/wealth': {
    title: 'Wealth Advisory & Family Office | Kretz Real Estate',
    description: 'Bespoke wealth structuring, tax-efficient cross-border real estate holdings, and institutional portfolio allocation for high-net-worth families.',
    image: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1200&q=80',
  },
  '/blog': {
    title: 'Real Estate Insights & Tokenization Blog | Kretz',
    description: 'Expert analysis on European luxury property markets, MiCA regulations, smart contract tokenization, and passive rental yield strategies.',
    image: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=1200&q=80',
    type: 'article',
  },
  '/investing': {
    title: 'How It Works | Fractional Tokenization & Legal SPV Custody',
    description: 'Discover how Kretz tokenizes luxury real estate into ERC-20 compliant digital shares backed by segregated legal Special Purpose Vehicles (SPVs).',
    image: 'https://images.unsplash.com/photo-1507089947368-19c1da9775ae?auto=format&fit=crop&w=1200&q=80',
  },
  '/token': {
    title: 'Polygon ERC-20 Token Model & Liquidity | Kretz',
    description: 'Learn about our Polygon-secured token architecture, automated monthly USDC/EUR rental distributions, and decentralized secondary market liquidity.',
    image: 'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?auto=format&fit=crop&w=1200&q=80',
  },
  '/faq': {
    title: 'FAQ & Legal Compliance | Kretz Real Estate',
    description: 'Frequently asked questions regarding KYC verification, MiCA regulatory compliance, investor protection, and minimum holding periods.',
    image: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=1200&q=80',
  },
  '/contact': {
    title: 'Contact & Advisory Desk | Kretz Real Estate',
    description: 'Connect with our Madrid and Paris investor relations desk for private consultations, property submissions, and institutional allocations.',
    image: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1200&q=80',
  },
  '/dashboard': {
    title: 'Investor Portal & Portfolio Dashboard | Kretz',
    description: 'Manage your tokenized real estate portfolio, track automated monthly rental dividends, and execute deposits with institutional bank wire and crypto options.',
    image: 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=1200&q=80',
  },
  '/admin': {
    title: 'Administrator Executive Command Center | Kretz',
    description: 'Secure platform control center for verifying KYC identity, approving deposits/withdrawals, managing property listings, and auditing ledger transactions.',
    image: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=1200&q=80',
  },
};

export function updatePageSeo(config?: Partial<PageSeoConfig>) {
  if (typeof window === 'undefined') return;

  const currentPath = window.location.hash ? window.location.hash.replace('#', '') : window.location.pathname;
  const baseRoute = currentPath.split('?')[0].replace(/\/$/, '') || '/';
  
  const matchedRouteConfig = ROUTE_SEO_MAP[baseRoute] || {};
  const seo: PageSeoConfig = {
    ...DEFAULT_SEO,
    ...matchedRouteConfig,
    ...config,
    path: currentPath,
  };

  // 1. Update document title
  document.title = seo.title;

  // 2. Helper to set or create meta tags
  const setMetaTag = (attrName: string, attrValue: string, content: string) => {
    let element = document.querySelector(`meta[${attrName}="${attrValue}"]`) as HTMLMetaElement;
    if (!element) {
      element = document.createElement('meta');
      element.setAttribute(attrName, attrValue);
      document.head.appendChild(element);
    }
    element.content = content;
  };

  // Standard Description
  setMetaTag('name', 'description', seo.description);

  // OpenGraph Tags (LinkedIn, Facebook, Discord, Slack)
  setMetaTag('property', 'og:title', seo.title);
  setMetaTag('property', 'og:description', seo.description);
  setMetaTag('property', 'og:type', seo.type || 'website');
  setMetaTag('property', 'og:url', window.location.origin + window.location.pathname + window.location.hash);
  if (seo.image) {
    setMetaTag('property', 'og:image', seo.image);
    setMetaTag('property', 'og:image:secure_url', seo.image);
    setMetaTag('property', 'og:image:width', '1200');
    setMetaTag('property', 'og:image:height', '630');
  }
  setMetaTag('property', 'og:site_name', 'Kretz Real Estate');

  // Twitter / X Cards
  setMetaTag('name', 'twitter:card', 'summary_large_image');
  setMetaTag('name', 'twitter:title', seo.title);
  setMetaTag('name', 'twitter:description', seo.description);
  if (seo.image) {
    setMetaTag('name', 'twitter:image', seo.image);
  }

  // Canonical Link
  let canonicalLink = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
  if (!canonicalLink) {
    canonicalLink = document.createElement('link');
    canonicalLink.rel = 'canonical';
    document.head.appendChild(canonicalLink);
  }
  canonicalLink.href = window.location.origin + window.location.pathname;

  // Schema.org JSON-LD Structured Data
  let ldScript = document.getElementById('schema-json-ld') as HTMLScriptElement;
  if (!ldScript) {
    ldScript = document.createElement('script');
    ldScript.id = 'schema-json-ld';
    ldScript.type = 'application/ld+json';
    document.head.appendChild(ldScript);
  }

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': seo.schemaType || 'RealEstateAgent',
    'name': 'Kretz Real Estate',
    'url': window.location.origin,
    'logo': 'https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=200&q=80',
    'image': seo.image,
    'description': seo.description,
    'address': {
      '@type': 'PostalAddress',
      'streetAddress': 'Paseo de la Castellana 95',
      'addressLocality': 'Madrid',
      'postalCode': '28046',
      'addressCountry': 'ES'
    },
    'geo': {
      '@type': 'GeoCoordinates',
      'latitude': 40.4168,
      'longitude': -3.7038
    },
    'telephone': '+34910849210',
    'priceRange': '€€€€'
  };

  ldScript.textContent = JSON.stringify(structuredData);
}
