import { LanguageCode, SUPPORTED_LANGUAGES, TranslationResponse } from '../types/language';

const CACHE_KEY = 'kretz_translation_cache_v2';
const SELECTED_LANG_KEY = 'kretz_selected_language';

// Persistent client-side cache mapping: `${lang}:${text}` -> `translatedText`
let memoryCache: Record<string, string> = {};

// Load cache from localStorage on initialization
try {
  if (typeof window !== 'undefined' && window.localStorage) {
    const stored = window.localStorage.getItem(CACHE_KEY);
    if (stored) {
      memoryCache = JSON.parse(stored);
    }
  }
} catch (e) {
  console.warn('Failed to load translation cache from localStorage:', e);
}

function saveCacheToStorage() {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(CACHE_KEY, JSON.stringify(memoryCache));
    }
  } catch (e) {
    // Ignore storage quota errors
  }
}

/**
 * Built-in real estate & platform dictionary for immediate zero-latency UI rendering
 */
export const DICTIONARY: Record<LanguageCode, Record<string, string>> = {
  en: {},
  fr: {
    'Invest Now': 'Investir Maintenant',
    'See Details': 'Voir les Détails',
    'Brochure': 'Brochure Officielle',
    'View Brochure': 'Consulter la Brochure',
    'Download Brochure': 'Télécharger la Brochure',
    'Download PDF': 'Télécharger le PDF',
    'Download ZIP': 'Télécharger le ZIP',
    'Print': 'Imprimer',
    'Properties': 'Propriétés',
    'Marketplace': 'Marché Immobilier',
    'Success Stories': 'Cas de Succès',
    'Dossiers & Insights': 'Dossiers & Analyses',
    'Dashboard': 'Tableau de Bord',
    'Investment Horizon': 'Horizon d\'Investissement',
    'Target Net Yield': 'Rendement Net Cible',
    'Token Price': 'Prix du Jeton',
    'Minimum Investment': 'Investissement Minimum',
    'Habitable Area': 'Surface Habitable',
    'Bedrooms': 'Chambres',
    'Bathrooms': 'Salles de Bain',
    'Log In': 'Se Connecter',
    'Sign In': 'Se Connecter',
    'Sign Up': 'S\'Inscrire',
    'Register': 'S\'Inscrire',
    'My Portfolio': 'Mon Portefeuille',
    'Deposit': 'Dépôt',
    'Withdraw': 'Retrait',
    'Share': 'Partager',
    'Saved': 'Enregistré',
    'Save': 'Sauvegarder',
    'Official Documents': 'Documents Officiels',
    'SPV Structure': 'Structure SPV Isolé'
  },
  es: {
    'Invest Now': 'Invertir Ahora',
    'See Details': 'Ver Detalles',
    'Brochure': 'Folleto Oficial',
    'View Brochure': 'Ver Folleto',
    'Download Brochure': 'Descargar Folleto',
    'Download PDF': 'Descargar PDF',
    'Download ZIP': 'Descargar ZIP',
    'Print': 'Imprimir',
    'Properties': 'Propiedades',
    'Marketplace': 'Mercado Inmobiliario',
    'Success Stories': 'Casos de Éxito',
    'Dossiers & Insights': 'Dossieres y Análisis',
    'Dashboard': 'Panel de Control',
    'Investment Horizon': 'Plazo de Inversión',
    'Target Net Yield': 'Rentabilidad Neta Objetivo',
    'Token Price': 'Precio del Token',
    'Minimum Investment': 'Inversión Mínima',
    'Habitable Area': 'Superficie Habitable',
    'Bedrooms': 'Habitaciones',
    'Bathrooms': 'Baños',
    'Log In': 'Iniciar Sesión',
    'Sign In': 'Iniciar Sesión',
    'Sign Up': 'Registrarse',
    'Register': 'Registrarse',
    'My Portfolio': 'Mi Portafolio',
    'Deposit': 'Depositar',
    'Withdraw': 'Retirar',
    'Share': 'Compartir',
    'Saved': 'Guardado',
    'Save': 'Guardar',
    'Official Documents': 'Documentos Oficiales',
    'SPV Structure': 'Estructura SPV Estancada'
  },
  de: {
    'Invest Now': 'Jetzt Investieren',
    'See Details': 'Details Anzeigen',
    'Brochure': 'Offizielle Broschüre',
    'View Brochure': 'Broschüre Ansehen',
    'Download Brochure': 'Broschüre Herunterladen',
    'Download PDF': 'PDF Herunterladen',
    'Download ZIP': 'ZIP Herunterladen',
    'Print': 'Drucken',
    'Properties': 'Immobilien',
    'Marketplace': 'Marktplatz',
    'Success Stories': 'Erfolgsgeschichten',
    'Dossiers & Insights': 'Dossiers & Analysen',
    'Dashboard': 'Kundenportal',
    'Investment Horizon': 'Anlagehorizont',
    'Target Net Yield': 'Ziel-Nettorendite',
    'Token Price': 'Tokenpreis',
    'Minimum Investment': 'Mindestanlage',
    'Habitable Area': 'Wohnfläche',
    'Bedrooms': 'Schlafzimmer',
    'Bathrooms': 'Badezimmer',
    'Log In': 'Anmelden',
    'Sign In': 'Anmelden',
    'Sign Up': 'Registrieren',
    'Register': 'Registrieren',
    'My Portfolio': 'Mein Portfolio',
    'Deposit': 'Einzahlen',
    'Withdraw': 'Auszahlen',
    'Share': 'Teilen',
    'Saved': 'Gespeichert',
    'Save': 'Speichern',
    'Official Documents': 'Offizielle Dokumente',
    'SPV Structure': 'Zweckgesellschaft (SPV)'
  },
  pt: {
    'Invest Now': 'Investir Agora',
    'See Details': 'Ver Detalhes',
    'Brochure': 'Brochura Oficial',
    'View Brochure': 'Ver Brochura',
    'Download Brochure': 'Baixar Brochura',
    'Download PDF': 'Baixar PDF',
    'Download ZIP': 'Baixar ZIP',
    'Print': 'Imprimir',
    'Properties': 'Propriedades',
    'Marketplace': 'Mercado Imobiliário',
    'Success Stories': 'Casos de Sucesso',
    'Dossiers & Insights': 'Dossiês e Análises',
    'Dashboard': 'Painel do Investidor',
    'Investment Horizon': 'Horizonte de Investimento',
    'Target Net Yield': 'Rendimento Líquido Alvo',
    'Token Price': 'Preço do Token',
    'Minimum Investment': 'Investimento Mínimo',
    'Habitable Area': 'Área Habitable',
    'Bedrooms': 'Quartos',
    'Bathrooms': 'Casas de Banho',
    'Log In': 'Entrar',
    'Sign In': 'Entrar',
    'Sign Up': 'Cadastrar',
    'Register': 'Registar',
    'My Portfolio': 'Meu Portfólio',
    'Deposit': 'Depositar',
    'Withdraw': 'Levantar',
    'Share': 'Partilhar',
    'Saved': 'Guardado',
    'Save': 'Guardar',
    'Official Documents': 'Documentos Oficiais',
    'SPV Structure': 'Estrutura SPV Isolada'
  },
  it: {
    'Invest Now': 'Investi Ora',
    'See Details': 'Vedi Dettagli',
    'Brochure': 'Brochure Ufficiale',
    'View Brochure': 'Visualizza Brochure',
    'Download Brochure': 'Scarica Brochure',
    'Download PDF': 'Scarica PDF',
    'Download ZIP': 'Scarica ZIP',
    'Print': 'Stampa',
    'Properties': 'Proprietà',
    'Marketplace': 'Mercato Immobiliare',
    'Success Stories': 'Storie di Successo',
    'Dossiers & Insights': 'Dossier e Analisi',
    'Dashboard': 'Area Riservata',
    'Investment Horizon': 'Orizzonte di Investimento',
    'Target Net Yield': 'Rendimento Netto Obiettivo',
    'Token Price': 'Prezzo del Token',
    'Minimum Investment': 'Investimento Minimo',
    'Habitable Area': 'Superficie Abitabile',
    'Bedrooms': 'Camere da Letto',
    'Bathrooms': 'Bagni',
    'Log In': 'Accedi',
    'Sign In': 'Accedi',
    'Sign Up': 'Registrati',
    'Register': 'Registrati',
    'My Portfolio': 'Il Mio Portafoglio',
    'Deposit': 'Deposita',
    'Withdraw': 'Prelievo',
    'Share': 'Condividi',
    'Saved': 'Salvato',
    'Save': 'Salva',
    'Official Documents': 'Documenti Ufficiali',
    'SPV Structure': 'Struttura SPV Anello Segregato'
  },
  nl: {
    'Invest Now': 'Nu Investeren',
    'See Details': 'Bekijk Details',
    'Brochure': 'Officiële Brochure',
    'View Brochure': 'Brochure Bekijken',
    'Download Brochure': 'Download Brochure',
    'Download PDF': 'Download PDF',
    'Download ZIP': 'Download ZIP',
    'Print': 'Afdrukken',
    'Properties': 'Vastgoed',
    'Marketplace': 'Marktplaats',
    'Success Stories': 'Succesverhalen',
    'Dossiers & Insights': 'Dossiers & Inzichten',
    'Dashboard': 'Dashboard',
    'Investment Horizon': 'Investeringshorizon',
    'Target Net Yield': 'Beoogd Netto Rendement',
    'Token Price': 'Token Prijs',
    'Minimum Investment': 'Minimale Investering',
    'Habitable Area': 'Woonoppervlakte',
    'Bedrooms': 'Slaapkamers',
    'Bathrooms': 'Badkamers',
    'Log In': 'Inloggen',
    'Sign In': 'Inloggen',
    'Sign Up': 'Registreren',
    'Register': 'Registreren',
    'My Portfolio': 'Mijn Portefeuille',
    'Deposit': 'Storten',
    'Withdraw': 'Opnemen',
    'Share': 'Delen',
    'Saved': 'Opgeslagen',
    'Save': 'Opslaan',
    'Official Documents': 'Officiële Documenten',
    'SPV Structure': 'SPV Structuur'
  },
  ar: {
    'Invest Now': 'استثمر الآن',
    'See Details': 'عرض التفاصيل',
    'Brochure': 'الكتيب الرسمي',
    'View Brochure': 'عرض الكتيب',
    'Download Brochure': 'تحميل الكتيب',
    'Download PDF': 'تحميل PDF',
    'Download ZIP': 'تحميل ZIP',
    'Print': 'طباعة',
    'Properties': 'العقارات',
    'Marketplace': 'سوق العقارات',
    'Success Stories': 'قصص النجاح',
    'Dossiers & Insights': 'الملفات والتحليلات',
    'Dashboard': 'لوحة المستثمر',
    'Investment Horizon': 'أفق الاستثمار',
    'Target Net Yield': 'صافي العائد المستهدف',
    'Token Price': 'سعر الرمز الرقمي',
    'Minimum Investment': 'الحد الأدنى للاستثمار',
    'Habitable Area': 'المساحة السكنية',
    'Bedrooms': 'غرف النوم',
    'Bathrooms': 'حمامات',
    'Log In': 'تسجيل الدخول',
    'Sign In': 'تسجيل الدخول',
    'Sign Up': 'إنشاء حساب',
    'Register': 'تسجيل',
    'My Portfolio': 'محفظتي الاستثمارية',
    'Deposit': 'إيداع',
    'Withdraw': 'سحب',
    'Share': 'مشاركة',
    'Saved': 'محفوظ',
    'Save': 'حفظ',
    'Official Documents': 'المستندات الرسمية',
    'SPV Structure': 'هيكل الشركة ذات الغرض الخاص'
  },
  zh: {
    'Invest Now': '立即投资',
    'See Details': '查看详情',
    'Brochure': '官方手册',
    'View Brochure': '查看手册',
    'Download Brochure': '下载手册',
    'Download PDF': '下载 PDF',
    'Download ZIP': '下载 ZIP',
    'Print': '打印',
    'Properties': '优质地产',
    'Marketplace': '投资市场',
    'Success Stories': '成功案例',
    'Dossiers & Insights': '深度报告与分析',
    'Dashboard': '投资人控制台',
    'Investment Horizon': '投资期限',
    'Target Net Yield': '目标净收益率',
    'Token Price': '代币单价',
    'Minimum Investment': '最低投资额',
    'Habitable Area': '居住面积',
    'Bedrooms': '卧室',
    'Bathrooms': '浴室',
    'Log In': '登录',
    'Sign In': '登录',
    'Sign Up': '注册',
    'Register': '注册',
    'My Portfolio': '我的投资组合',
    'Deposit': '充值存入',
    'Withdraw': '提现',
    'Share': '分享',
    'Saved': '已保存',
    'Save': '保存',
    'Official Documents': '官方法律文件',
    'SPV Structure': '独立SPV托管结构'
  },
  ja: {
    'Invest Now': '今すぐ投資',
    'See Details': '詳細を見る',
    'Brochure': '公式パンフレット',
    'View Brochure': 'パンフレットを閲覧',
    'Download Brochure': 'パンフレットをダウンロード',
    'Download PDF': 'PDFをダウンロード',
    'Download ZIP': 'ZIPをダウンロード',
    'Print': '印刷',
    'Properties': '不動産物件',
    'Marketplace': 'マーケットプレイス',
    'Success Stories': '実績と事例',
    'Dossiers & Insights': '調査レポート',
    'Dashboard': 'ダッシュボード',
    'Investment Horizon': '運用期間',
    'Target Net Yield': '目標利回り（ネット）',
    'Token Price': 'トークン価格',
    'Minimum Investment': '最低投資額',
    'Habitable Area': '専有面積',
    'Bedrooms': 'ベッドルーム',
    'Bathrooms': 'バスルーム',
    'Log In': 'ログイン',
    'Sign In': 'ログイン',
    'Sign Up': '新規登録',
    'Register': '会員登録',
    'My Portfolio': 'ポートフォリオ',
    'Deposit': '入金',
    'Withdraw': '出金',
    'Share': '共有',
    'Saved': '保存済み',
    'Save': '保存',
    'Official Documents': '公式書類',
    'SPV Structure': '隔離SPV構造'
  },
  tr: {
    'Invest Now': 'Şimdi Yatırım Yap',
    'See Details': 'Detayları Gör',
    'Brochure': 'Resmi Broşür',
    'View Brochure': 'Broşürü İncele',
    'Download Brochure': 'Broşürü İndir',
    'Download PDF': 'PDF İndir',
    'Download ZIP': 'ZIP İndir',
    'Print': 'Yazdır',
    'Properties': 'Gayrimenkuller',
    'Marketplace': 'Pazar Yeri',
    'Success Stories': 'Başarı Hikayeleri',
    'Dossiers & Insights': 'Analizler ve Raporlar',
    'Dashboard': 'Yatırımcı Paneli',
    'Investment Horizon': 'Yatırım Süresi',
    'Target Net Yield': 'Hedef Net Getiri',
    'Token Price': 'Jeton Fiyatı',
    'Minimum Investment': 'Minimum Yatırım',
    'Habitable Area': 'Kullanım Alanı',
    'Bedrooms': 'Yatak Odası',
    'Bathrooms': 'Banyo',
    'Log In': 'Giriş Yap',
    'Sign In': 'Giriş Yap',
    'Sign Up': 'Kayıt Ol',
    'Register': 'Kayıt Ol',
    'My Portfolio': 'Portföyüm',
    'Deposit': 'Para Yatır',
    'Withdraw': 'Para Çek',
    'Share': 'Paylaş',
    'Saved': 'Kaydedildi',
    'Save': 'Kaydet',
    'Official Documents': 'Resmi Belgeler',
    'SPV Structure': 'Ayrılmış SPV Yapısı'
  },
  ru: {
    'Invest Now': 'Инвестировать сейчас',
    'See Details': 'Подробнее',
    'Brochure': 'Официальная брошюра',
    'View Brochure': 'Просмотреть брошюру',
    'Download Brochure': 'Скачать брошюру',
    'Download PDF': 'Скачать PDF',
    'Download ZIP': 'Скачать ZIP',
    'Print': 'Печать',
    'Properties': 'Объекты недвижимости',
    'Marketplace': 'Маркетплейс',
    'Success Stories': 'Успешные кейсы',
    'Dossiers & Insights': 'Аналитика и досье',
    'Dashboard': 'Кабинет инвестора',
    'Investment Horizon': 'Срок инвестиций',
    'Target Net Yield': 'Целевая чистая доходность',
    'Token Price': 'Цена токена',
    'Minimum Investment': 'Мин. инвестиция',
    'Habitable Area': 'Жилая площадь',
    'Bedrooms': 'Спальни',
    'Bathrooms': 'Ванные',
    'Log In': 'Войти',
    'Sign In': 'Войти',
    'Sign Up': 'Регистрация',
    'Register': 'Зарегистрироваться',
    'My Portfolio': 'Мой портфель',
    'Deposit': 'Пополнить',
    'Withdraw': 'Вывести',
    'Share': 'Поделиться',
    'Saved': 'Сохранено',
    'Save': 'Сохранить',
    'Official Documents': 'Официальные документы',
    'SPV Structure': 'Обособленная структура SPV'
  }
};

export class TranslationService {
  /**
   * Detects initial language preference from browser or localStorage
   */
  public static getInitialLanguage(): LanguageCode {
    if (typeof window !== 'undefined' && window.localStorage) {
      const saved = window.localStorage.getItem(SELECTED_LANG_KEY) as LanguageCode;
      if (saved && SUPPORTED_LANGUAGES.some((l) => l.code === saved)) {
        return saved;
      }
    }

    // Check browser languages
    if (typeof navigator !== 'undefined') {
      const browserLang = (navigator.language || (navigator as any).userLanguage || '').toLowerCase();
      for (const lang of SUPPORTED_LANGUAGES) {
        if (browserLang.startsWith(lang.code)) {
          return lang.code;
        }
      }
    }

    return 'en';
  }

  /**
   * Persists selected language
   */
  public static saveSelectedLanguage(code: LanguageCode): void {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(SELECTED_LANG_KEY, code);
    }
  }

  /**
   * Synchronous translation method checking dictionary and memory cache
   */
  public static translateInstant(text: string, targetLang: LanguageCode): string {
    if (!text || targetLang === 'en') return text;

    const trimmed = text.trim();

    // 1. Check built-in terminology dictionary
    const dictMatch = DICTIONARY[targetLang]?.[trimmed];
    if (dictMatch) return dictMatch;

    // 2. Check memory cache
    const cacheKey = `${targetLang}:${trimmed}`;
    if (memoryCache[cacheKey]) {
      return memoryCache[cacheKey];
    }

    return text;
  }

  /**
   * Asynchronous server API translation for dynamic strings and paragraphs
   */
  public static async translateBatch(
    texts: string[],
    targetLang: LanguageCode
  ): Promise<string[]> {
    if (!texts || texts.length === 0 || targetLang === 'en') {
      return texts;
    }

    const results: string[] = [...texts];
    const missingIndices: number[] = [];
    const missingTexts: string[] = [];

    // Filter out items that are already cached or in dictionary
    texts.forEach((txt, idx) => {
      if (!txt || !txt.trim()) return;
      const cached = this.translateInstant(txt, targetLang);
      if (cached !== txt) {
        results[idx] = cached;
      } else {
        missingIndices.push(idx);
        missingTexts.push(txt);
      }
    });

    if (missingTexts.length === 0) {
      return results;
    }

    try {
      const response = await fetch('/api/v1/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          texts: missingTexts,
          targetLanguage: targetLang,
          sourceLanguage: 'en',
        }),
      });

      if (response.ok) {
        const data: TranslationResponse = await response.json();
        if (data.translations && Array.isArray(data.translations)) {
          data.translations.forEach((translatedText, i) => {
            const originalIndex = missingIndices[i];
            const originalText = missingTexts[i];
            results[originalIndex] = translatedText || originalText;

            // Cache result
            if (translatedText && originalText) {
              const cacheKey = `${targetLang}:${originalText.trim()}`;
              memoryCache[cacheKey] = translatedText;
            }
          });
          saveCacheToStorage();
        }
      }
    } catch (err) {
      console.warn('Server translation API call note:', err);
    }

    return results;
  }
}
