import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  LanguageCode,
  LanguageOption,
  SUPPORTED_LANGUAGES,
  TranslationProviderId,
  TranslationProviderInfo,
} from '../types/language';
import { TranslationService, subscribeTranslationUpdates } from '../lib/translationService';
import { translateCurrentPage } from '../lib/pageTranslator';
import i18n from '../i18n/config';

interface LanguageContextType {
  currentLanguage: LanguageCode;
  currentLanguageOption: LanguageOption;
  setLanguage: (code: LanguageCode) => void;
  t: (text: string) => string;
  isRtl: boolean;
  supportedLanguages: LanguageOption[];
  // Switch Translation API features
  activeProvider: TranslationProviderId;
  switchProvider: (provider: TranslationProviderId) => Promise<boolean>;
  availableProviders: TranslationProviderInfo[];
  translateBatch: (texts: string[]) => Promise<string[]>;
  isTranslating: boolean;
  clearCache: () => void;
  translationVersion: number;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentLanguage, setCurrentLanguageState] = useState<LanguageCode>(() => {
    return TranslationService.getInitialLanguage();
  });

  const [activeProvider, setActiveProvider] = useState<TranslationProviderId>(() => {
    return TranslationService.getInitialProvider();
  });

  const [availableProviders, setAvailableProviders] = useState<TranslationProviderInfo[]>([]);
  const [isTranslating, setIsTranslating] = useState(false);
  const [translationVersion, setTranslationVersion] = useState(0);

  // Subscribe to translation cache updates
  useEffect(() => {
    const unsubscribe = subscribeTranslationUpdates(() => {
      setTranslationVersion((v) => v + 1);
    });
    return unsubscribe;
  }, []);

  // Load available providers on mount
  useEffect(() => {
    let mounted = true;
    TranslationService.fetchProviders().then((res) => {
      if (mounted) {
        if (res.activeProvider) {
          setActiveProvider(res.activeProvider);
        }
        if (res.providers) {
          setAvailableProviders(res.providers);
        }
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  const currentLanguageOption =
    SUPPORTED_LANGUAGES.find((l) => l.code === currentLanguage) || SUPPORTED_LANGUAGES[0];

  const isRtl = currentLanguageOption.dir === 'rtl';

  // Synchronize document attributes and trigger full page translation
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = currentLanguage;
      document.documentElement.dir = currentLanguageOption.dir;

      if (isRtl) {
        document.body.classList.add('rtl-layout');
      } else {
        document.body.classList.remove('rtl-layout');
      }

      // Sync i18next
      if (i18n && typeof i18n.changeLanguage === 'function') {
        i18n.changeLanguage(currentLanguage);
      }

      // Execute full page translation
      const timer = setTimeout(() => {
        translateCurrentPage(currentLanguage);
      }, 50);

      return () => clearTimeout(timer);
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

  // Switch translation API engine
  const switchProvider = useCallback(async (newProvider: TranslationProviderId): Promise<boolean> => {
    setIsTranslating(true);
    const success = await TranslationService.switchProvider(newProvider);
    setActiveProvider(newProvider);
    setIsTranslating(false);
    return success;
  }, []);

  // Batch translate using active switch translation API
  const translateBatch = useCallback(
    async (texts: string[]): Promise<string[]> => {
      setIsTranslating(true);
      try {
        const res = await TranslationService.translateBatch(texts, currentLanguage, activeProvider);
        return res;
      } finally {
        setIsTranslating(false);
      }
    },
    [currentLanguage, activeProvider]
  );

  const clearCache = useCallback(() => {
    TranslationService.clearCache();
  }, []);

  return (
    <LanguageContext.Provider
      value={{
        currentLanguage,
        currentLanguageOption,
        setLanguage,
        t,
        isRtl,
        supportedLanguages: SUPPORTED_LANGUAGES,
        activeProvider,
        switchProvider,
        availableProviders,
        translateBatch,
        isTranslating,
        clearCache,
        translationVersion,
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
