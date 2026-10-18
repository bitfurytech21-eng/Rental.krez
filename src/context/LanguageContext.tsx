import React, { createContext, useContext, useState, useEffect } from 'react';
import { LanguageCode, LanguageOption, SUPPORTED_LANGUAGES } from '../types/language';
import { TranslationService } from '../lib/translationService';
import { updatePageSeo } from '../lib/seo';

interface LanguageContextType {
  currentLanguage: LanguageCode;
  currentLanguageOption: LanguageOption;
  setLanguage: (code: LanguageCode) => void;
  t: (text: string) => string;
  isRtl: boolean;
  supportedLanguages: LanguageOption[];
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentLanguage, setCurrentLanguageState] = useState<LanguageCode>(() => {
    return TranslationService.getInitialLanguage();
  });

  const currentLanguageOption =
    SUPPORTED_LANGUAGES.find((l) => l.code === currentLanguage) || SUPPORTED_LANGUAGES[0];

  const isRtl = currentLanguageOption.dir === 'rtl';

  // Synchronize document attributes on language change
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = currentLanguage;
      document.documentElement.dir = currentLanguageOption.dir;

      if (isRtl) {
        document.body.classList.add('rtl-layout');
      } else {
        document.body.classList.remove('rtl-layout');
      }
    }
  }, [currentLanguage, currentLanguageOption, isRtl]);

  const setLanguage = (code: LanguageCode) => {
    setCurrentLanguageState(code);
    TranslationService.saveSelectedLanguage(code);

    // Sync URL parameter if present
    if (typeof window !== 'undefined' && window.history) {
      const url = new URL(window.location.href);
      if (code === 'en') {
        url.searchParams.delete('lang');
      } else {
        url.searchParams.set('lang', code);
      }
      window.history.replaceState({}, '', url.toString());
    }
  };

  // Instant translator helper
  const t = (text: string): string => {
    if (!text) return '';
    return TranslationService.translateInstant(text, currentLanguage);
  };

  return (
    <LanguageContext.Provider
      value={{
        currentLanguage,
        currentLanguageOption,
        setLanguage,
        t,
        isRtl,
        supportedLanguages: SUPPORTED_LANGUAGES,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
