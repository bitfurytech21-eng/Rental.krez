export type CookieCategory = 'strictlyNecessary' | 'analytics' | 'marketing' | 'preferences';

export interface CookieCategoryDefinition {
  id: CookieCategory;
  name: string;
  description: string;
  required: boolean;
  cookies: Array<{
    name: string;
    purpose: string;
    duration: string;
    provider: string;
  }>;
}

export interface CookieConsentState {
  version: string;
  timestamp: string;
  hasChosen: boolean;
  categories: {
    strictlyNecessary: boolean;
    analytics: boolean;
    marketing: boolean;
    preferences: boolean;
  };
}

export const COOKIE_CATEGORIES: CookieCategoryDefinition[] = [
  {
    id: 'strictlyNecessary',
    name: 'Strictly Necessary',
    description: 'Essential cookies and storage items required for core website security, human verification, account authentication, session integrity, and fraud prevention. These cannot be disabled.',
    required: true,
    cookies: [
      {
        name: 'kretz_auth_token',
        purpose: 'Maintains secure investor session credentials and authorization headers.',
        duration: 'Session / 30 Days',
        provider: 'Kretz Platform First-Party',
      },
      {
        name: 'kretz_cookie_consent',
        purpose: 'Stores your legal consent preferences and timestamp.',
        duration: '1 Year',
        provider: 'Kretz Platform First-Party',
      },
      {
        name: 'cf_clearance / __cf_bm',
        purpose: 'Cloudflare Turnstile bot detection and malicious traffic mitigation.',
        duration: 'Session / 1 Year',
        provider: 'Cloudflare Security',
      },
      {
        name: 'rentallog_v3_*',
        purpose: 'Local double-entry cryptographic ledger and balance records.',
        duration: 'Persistent LocalStorage',
        provider: 'Kretz Platform First-Party',
      },
    ],
  },
  {
    id: 'analytics',
    name: 'Analytics & Performance',
    description: 'Helps us analyze aggregate traffic volume, page load performance, error diagnostics, and feature engagement to improve platform stability without identifying you personally.',
    required: false,
    cookies: [
      {
        name: '_kretz_analytics',
        purpose: 'Collects anonymized page interaction, latency, and navigation metrics.',
        duration: '90 Days',
        provider: 'Kretz Platform First-Party',
      },
      {
        name: '_perf_monitor',
        purpose: 'Gauges frontend render performance and Core Web Vitals.',
        duration: 'Session',
        provider: 'Kretz Platform First-Party',
      },
    ],
  },
  {
    id: 'marketing',
    name: 'Marketing & Media',
    description: 'Supports high-definition embedded media broadcasts (such as YouTube property tours and television interview embeds) and relevant platform announcements.',
    required: false,
    cookies: [
      {
        name: 'VISITOR_INFO1_LIVE / YSC',
        purpose: 'Enables high-definition YouTube player embeds and bandwidth optimization.',
        duration: '6 Months / Session',
        provider: 'YouTube / Google',
      },
      {
        name: 'smartsupp_*',
        purpose: 'Customer advisory live desk chat support and session continuity.',
        duration: 'Session',
        provider: 'Smartsupp Live Desk',
      },
    ],
  },
  {
    id: 'preferences',
    name: 'Functional Preferences',
    description: 'Remembers your personalized settings such as selected currency display (EUR, USD, GBP), preferred language, and dashboard density options across visits.',
    required: false,
    cookies: [
      {
        name: 'kretz_pref_currency',
        purpose: 'Remembers preferred currency denomination across property financial cards.',
        duration: '1 Year',
        provider: 'Kretz Platform First-Party',
      },
      {
        name: 'kretz_pref_theme',
        purpose: 'Remembers user interface density and accessibility options.',
        duration: '1 Year',
        provider: 'Kretz Platform First-Party',
      },
    ],
  },
];
