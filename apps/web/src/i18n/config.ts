import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { SUPPORTED_LANGUAGES, LanguageOption } from '../types/language';
import { TranslationService } from '../lib/translationService';

const SELECTED_LANG_KEY = 'kretz_selected_language';

// Detect initial language
export function getInitialLocale(): string {
  if (typeof window !== 'undefined' && window.localStorage) {
    const saved = window.localStorage.getItem(SELECTED_LANG_KEY);
    if (saved && SUPPORTED_LANGUAGES.some((l) => l.code === saved)) {
      return saved;
    }
  }
  if (typeof navigator !== 'undefined') {
    const browserLang = (navigator.language || (navigator as any).userLanguage || '').toLowerCase();
    const match = SUPPORTED_LANGUAGES.find((l) =>
      browserLang.startsWith(l.code.toLowerCase()) || l.code.toLowerCase().startsWith(browserLang)
    );
    if (match) return match.code;
  }
  return 'en';
}

const initialLang = getInitialLocale();

// Initial English / Multilingual dictionary
const resources = {
  en: {
    translation: {
      'Invest Now': 'Invest Now',
      'See Details': 'See Details',
      'Brochure': 'Official Brochure',
      'View Brochure': 'View Brochure',
      'Download Brochure': 'Download Brochure',
      'Download PDF': 'Download PDF',
      'Download ZIP': 'Download ZIP',
      'Print': 'Print',
      'Properties': 'Properties',
      'Marketplace': 'Real Estate Marketplace',
      'Success Stories': 'Success Stories',
      'Dossiers & Insights': 'Dossiers & Insights',
      'Dashboard': 'Dashboard',
      'Investment Horizon': 'Investment Horizon',
      'Target Net Yield': 'Target Net Yield',
      'Token Price': 'Token Price',
      'Minimum Investment': 'Minimum Investment',
      'Habitable Area': 'Habitable Area',
      'Bedrooms': 'Bedrooms',
      'Bathrooms': 'Bathrooms',
      'Log In': 'Log In',
      'Sign In': 'Sign In',
      'Sign Up': 'Sign Up',
      'Register': 'Register',
      'My Portfolio': 'My Portfolio',
      'Deposit': 'Deposit',
      'Withdraw': 'Withdraw',
      'Share': 'Share',
      'Saved': 'Saved',
      'Save': 'Save',
      'Official Documents': 'Official Documents',
      'SPV Structure': 'Isolated SPV Structure',
      'Real Estate': 'Real Estate',
      'Luxury Real Estate': 'Luxury Real Estate',
      'Select Language': 'Select Language',
      'Search Language': 'Search 100+ languages...',
    },
  },
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: initialLang,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false, // React handles XSS safely
    },
    react: {
      useSuspense: false,
    },
  });

// Apply document direction and lang attributes
export function applyLocaleDirection(localeCode: string) {
  if (typeof document === 'undefined') return;
  const langOpt = SUPPORTED_LANGUAGES.find((l) => l.code === localeCode) || SUPPORTED_LANGUAGES[0];
  document.documentElement.lang = localeCode;
  document.documentElement.dir = langOpt.dir;

  if (langOpt.dir === 'rtl') {
    document.body.classList.add('rtl-layout');
  } else {
    document.body.classList.remove('rtl-layout');
  }
}

applyLocaleDirection(initialLang);

i18n.on('languageChanged', (lng) => {
  applyLocaleDirection(lng);
  if (typeof window !== 'undefined' && window.localStorage) {
    window.localStorage.setItem(SELECTED_LANG_KEY, lng);
  }
});

export default i18n;
