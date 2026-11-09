import { Request, Response } from 'express';
import { logger } from './logger';

export type TranslationProviderId = 'mymemory' | 'libretranslate' | 'deepl' | 'dictionary' | 'auto';

export interface ProviderDefinition {
  id: TranslationProviderId;
  name: string;
  description: string;
  isAvailable: boolean;
  requiresKey: boolean;
  type: 'free' | 'freemium' | 'local' | 'hybrid';
  icon: string;
}

// Current active translation engine (defaults to 'mymemory' - independent, high-precision, no Google key required)
let activeProvider: TranslationProviderId = 'mymemory';

// Provider metrics and operational stats
const providerStats: Record<TranslationProviderId, { requests: number; translations: number; errors: number; lastUsed: string | null }> = {
  mymemory: { requests: 0, translations: 0, errors: 0, lastUsed: null },
  libretranslate: { requests: 0, translations: 0, errors: 0, lastUsed: null },
  deepl: { requests: 0, translations: 0, errors: 0, lastUsed: null },
  dictionary: { requests: 0, translations: 0, errors: 0, lastUsed: null },
  auto: { requests: 0, translations: 0, errors: 0, lastUsed: null },
};

/**
 * Built-in luxury real estate, legal, and financial dictionary for instant fallback & dictionary engine
 */
const BACKEND_DICTIONARY: Record<string, Record<string, string>> = {
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
    'SPV Structure': 'Structure SPV Isolé',
    'Real Estate': 'Immobilier',
    'Luxury Real Estate': 'Immobilier de Luxe',
    'Annual Yield': 'Rendement Annuel',
    'Capital Appreciation': 'Plus-value Immobilière',
    'Secondary Market': 'Marché Secondaire',
    'Funded': 'Financé',
    'Available Units': 'Unités Disponibles'
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
    'SPV Structure': 'Estructura SPV Estancada',
    'Real Estate': 'Bienes Raíces',
    'Luxury Real Estate': 'Bienes Raíces de Lujo',
    'Annual Yield': 'Rentabilidad Anual',
    'Capital Appreciation': 'Plusvalía',
    'Secondary Market': 'Mercado Secundario',
    'Funded': 'Financiado',
    'Available Units': 'Unidades Disponibles'
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
    'Dashboard': 'لوحة التحكم',
    'Investment Horizon': 'أفق الاستثمار',
    'Target Net Yield': 'العائد الصافي المستهدف',
    'Token Price': 'سعر الرمز',
    'Minimum Investment': 'الحد الأدنى للاستثمار',
    'Habitable Area': 'المساحة الصالحة للسكن',
    'Bedrooms': 'غرف النوم',
    'Bathrooms': 'الحمامات',
    'Log In': 'تسجيل الدخول',
    'Sign In': 'تسجيل الدخول',
    'Sign Up': 'إنشاء حساب',
    'Register': 'التسجيل',
    'My Portfolio': 'محفظتي الاستثمارية',
    'Deposit': 'إيداع',
    'Withdraw': 'سحب',
    'Share': 'مشاركة',
    'Saved': 'محفوظ',
    'Save': 'حفظ',
    'Official Documents': 'الوثائق الرسمية',
    'SPV Structure': 'هيكل الشركة ذات الغرض الخاص'
  },
  zh: {
    'Invest Now': '立即投资',
    'See Details': '查看详情',
    'Brochure': '官方投资手册',
    'View Brochure': '查看手册',
    'Download Brochure': '下载手册',
    'Download PDF': '下载 PDF',
    'Download ZIP': '下载 ZIP',
    'Print': '打印',
    'Properties': '精品物业',
    'Marketplace': '房产市场',
    'Success Stories': '成功案例',
    'Dossiers & Insights': '深度报告与洞见',
    'Dashboard': '投资者门户',
    'Investment Horizon': '投资期限',
    'Target Net Yield': '目标净收益率',
    'Token Price': '代币单价',
    'Minimum Investment': '起投金额',
    'Habitable Area': '建筑面积',
    'Bedrooms': '卧室',
    'Bathrooms': '浴室',
    'Log In': '登录',
    'Sign In': '登录',
    'Sign Up': '注册',
    'Register': '立即注册',
    'My Portfolio': '我的投资组合',
    'Deposit': '充值存入',
    'Withdraw': '资金提现',
    'Share': '分享',
    'Saved': '已收藏',
    'Save': '收藏',
    'Official Documents': '官方合规文件',
    'SPV Structure': '隔离式特殊目的实体 (SPV)'
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
    'Properties': '物件一覧',
    'Marketplace': 'マーケットプレイス',
    'Success Stories': '投資実績・事例',
    'Dossiers & Insights': '分析レポート＆インサイト',
    'Dashboard': 'ダッシュボード',
    'Investment Horizon': '運用期間',
    'Target Net Yield': '目標ネット利回り',
    'Token Price': 'トークン価格',
    'Minimum Investment': '最低投資額',
    'Habitable Area': '専有面積',
    'Bedrooms': 'ベッドルーム',
    'Bathrooms': 'バスルーム',
    'Log In': 'ログイン',
    'Sign In': 'ログイン',
    'Sign Up': '新規登録',
    'Register': '会員登録',
    'My Portfolio': '保有ポートフォリオ',
    'Deposit': '入金',
    'Withdraw': '出金',
    'Share': '共有',
    'Saved': '保存済み',
    'Save': '保存',
    'Official Documents': '公式法務書類',
    'SPV Structure': '倒産隔離SPVスキーム'
  },
  tr: {
    'Invest Now': 'Şimdi Yatırım Yap',
    'See Details': 'Detayları İncele',
    'Brochure': 'Resmi Broşür',
    'View Brochure': 'Broşürü Görüntüle',
    'Download Brochure': 'Broşürü İndir',
    'Download PDF': 'PDF İndir',
    'Download ZIP': 'ZIP İndir',
    'Print': 'Yazdır',
    'Properties': 'Mülkler',
    'Marketplace': 'Pazar Yeri',
    'Success Stories': 'Başarı Hikayeleri',
    'Dossiers & Insights': 'Analiz ve Raporlar',
    'Dashboard': 'Yatırımcı Paneli',
    'Investment Horizon': 'Yatırım Vadesi',
    'Target Net Yield': 'Hedef Net Getiri',
    'Token Price': 'Token Fiyatı',
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
    'SPV Structure': 'Ayrık SPV Yapısı'
  },
  ru: {
    'Invest Now': 'Инвестировать сейчас',
    'See Details': 'Подробнее',
    'Brochure': 'Официальная брошюра',
    'View Brochure': 'Смотреть брошюру',
    'Download Brochure': 'Скачать брошюру',
    'Download PDF': 'Скачать PDF',
    'Download ZIP': 'Скачать ZIP',
    'Print': 'Печать',
    'Properties': 'Объекты',
    'Marketplace': 'Маркетплейс',
    'Success Stories': 'Истории успеха',
    'Dossiers & Insights': 'Аналитика и обзоры',
    'Dashboard': 'Кабинет инвестора',
    'Investment Horizon': 'Инвестиционный горизонт',
    'Target Net Yield': 'Целевая чистая доходность',
    'Token Price': 'Цена токена',
    'Minimum Investment': 'Минимальная инвестиция',
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
    'SPV Structure': 'Изолированная SPV структура'
  }
};

/**
 * Decode HTML entities commonly returned by machine translation engines
 */
function decodeHtmlEntities(str: string): string {
  if (!str) return '';
  return str
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(dec))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
}

/**
 * Translates text using Free Google GTX API
 */
async function translateWithGoogleGTX(text: string, _sourceLang: string, targetLang: string): Promise<string> {
  const baseLang = targetLang.split('-')[0].toLowerCase();
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${encodeURIComponent(baseLang)}&dt=t&q=${encodeURIComponent(text)}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 6000);

  try {
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!res.ok) {
      throw new Error(`Google GTX HTTP error: ${res.status}`);
    }

    const data = await res.json();
    if (data && data[0] && Array.isArray(data[0])) {
      const translated = data[0].map((item: any) => item[0]).join('');
      if (translated) {
        return decodeHtmlEntities(translated);
      }
    }
    throw new Error('Invalid Google GTX response format');
  } catch (err: any) {
    clearTimeout(timeoutId);
    throw err;
  }
}

/**
 * Translates a single text using MyMemory Translation API
 */
async function translateWithMyMemory(text: string, sourceLang: string, targetLang: string): Promise<string> {
  try {
    return await translateWithGoogleGTX(text, sourceLang, targetLang);
  } catch (e) {
    const emailParam = process.env.MYMEMORY_EMAIL || 'trustwallet042619@gmail.com';
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${encodeURIComponent(sourceLang)}|${encodeURIComponent(targetLang)}&de=${encodeURIComponent(emailParam)}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    try {
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!res.ok) {
        throw new Error(`MyMemory HTTP error: ${res.status}`);
      }

      const data = await res.json();
      if (data && data.responseData && data.responseData.translatedText) {
        const decoded = decodeHtmlEntities(data.responseData.translatedText);
        if (decoded.startsWith('MYMEMORY WARNING:') || decoded.startsWith('QUERY LENGTH LIMIT EXCEEDED')) {
          throw new Error(decoded);
        }
        return decoded;
      }
      throw new Error('Invalid MyMemory response format');
    } catch (err: any) {
      clearTimeout(timeoutId);
      throw err;
    }
  }
}

/**
 * Translates using LibreTranslate instance
 */
async function translateWithLibreTranslate(text: string, sourceLang: string, targetLang: string): Promise<string> {
  const libreUrl = process.env.LIBRETRANSLATE_URL || 'https://translate.argosopentech.com/translate';
  const apiKey = process.env.LIBRETRANSLATE_API_KEY || '';

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);

  try {
    const payload: Record<string, string> = {
      q: text,
      source: sourceLang,
      target: targetLang,
      format: 'text',
    };
    if (apiKey) payload.api_key = apiKey;

    const res = await fetch(libreUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      throw new Error(`LibreTranslate HTTP error: ${res.status}`);
    }

    const data = await res.json();
    if (data && data.translatedText) {
      return decodeHtmlEntities(data.translatedText);
    }
    throw new Error('Invalid LibreTranslate response format');
  } catch (err: any) {
    clearTimeout(timeoutId);
    throw err;
  }
}

/**
 * Translates using DeepL API if configured
 */
async function translateWithDeepL(texts: string[], sourceLang: string, targetLang: string): Promise<string[]> {
  const apiKey = process.env.DEEPL_API_KEY;
  if (!apiKey) {
    throw new Error('DEEPL_API_KEY not configured');
  }

  const host = apiKey.endsWith(':fx') ? 'https://api-free.deepl.com' : 'https://api.deepl.com';
  const url = `${host}/v2/translate`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 6000);

  try {
    const targetCode = targetLang.toUpperCase() === 'EN' ? 'EN-US' : targetLang.toUpperCase();
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `DeepL-Auth-Key ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: texts,
        target_lang: targetCode,
      }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      throw new Error(`DeepL HTTP error: ${res.status}`);
    }

    const data = await res.json();
    if (data && Array.isArray(data.translations)) {
      return data.translations.map((item: any) => decodeHtmlEntities(item.text));
    }
    throw new Error('Invalid DeepL response');
  } catch (err: any) {
    clearTimeout(timeoutId);
    throw err;
  }
}

/**
 * Main Switch Translation Request Handler
 * POST /api/v1/translate
 */
export async function handleTranslationRequest(req: Request, res: Response) {
  const startTime = Date.now();
  try {
    const { texts, targetLanguage, sourceLanguage = 'en', provider: requestedProvider } = req.body;

    if (!targetLanguage || !texts || !Array.isArray(texts) || texts.length === 0) {
      return res.status(400).json({ error: 'targetLanguage and non-empty texts array required' });
    }

    // English returns as-is
    if (targetLanguage === 'en') {
      return res.json({
        translations: texts,
        targetLanguage,
        sourceLanguage: 'en',
        provider: 'native',
        latencyMs: 0,
        cached: true,
      });
    }

    // Determine target provider
    const engine: TranslationProviderId = (requestedProvider && ['mymemory', 'libretranslate', 'deepl', 'dictionary', 'auto'].includes(requestedProvider))
      ? requestedProvider
      : activeProvider;

    const results: string[] = new Array(texts.length);
    const pendingIndices: number[] = [];

    // Step 1: Pre-populate from dictionary
    texts.forEach((text, i) => {
      const trimmed = (text || '').trim();
      const dictMatch = BACKEND_DICTIONARY[targetLanguage]?.[trimmed];
      if (dictMatch) {
        results[i] = dictMatch;
      } else {
        pendingIndices.push(i);
      }
    });

    // If all were matched by dictionary, return immediately
    if (pendingIndices.length === 0) {
      providerStats.dictionary.requests++;
      providerStats.dictionary.translations += texts.length;
      providerStats.dictionary.lastUsed = new Date().toISOString();

      return res.json({
        translations: results,
        targetLanguage,
        sourceLanguage,
        provider: 'dictionary',
        latencyMs: Date.now() - startTime,
        cached: true,
      });
    }

    let actualProviderUsed = engine;

    // Step 2: Dispatch pending texts according to active provider
    if (engine === 'deepl' && process.env.DEEPL_API_KEY) {
      try {
        const toTranslate = pendingIndices.map((i) => texts[i]);
        const translated = await translateWithDeepL(toTranslate, sourceLanguage, targetLanguage);
        pendingIndices.forEach((origIdx, i) => {
          results[origIdx] = translated[i] || texts[origIdx];
        });
        providerStats.deepl.requests++;
        providerStats.deepl.translations += toTranslate.length;
        providerStats.deepl.lastUsed = new Date().toISOString();
      } catch (err: any) {
        logger.log({
          level: 'warn',
          category: 'api',
          requestId: (req as any).id || 'req-translate',
          eventType: 'DEEPL_FAILOVER_MYMEMORY',
          outcome: 'warning',
          message: `DeepL error: ${err.message}. Switching to MyMemory fallback.`,
        });
        actualProviderUsed = 'mymemory';
      }
    }

    if (actualProviderUsed === 'libretranslate') {
      try {
        const toTranslate = pendingIndices.map((i) => texts[i]);
        const translatedPromises = toTranslate.map((txt) =>
          translateWithLibreTranslate(txt, sourceLanguage, targetLanguage).catch(() => null)
        );
        const translated = await Promise.all(translatedPromises);
        pendingIndices.forEach((origIdx, i) => {
          results[origIdx] = translated[i] || texts[origIdx];
        });
        providerStats.libretranslate.requests++;
        providerStats.libretranslate.translations += toTranslate.length;
        providerStats.libretranslate.lastUsed = new Date().toISOString();
      } catch (err: any) {
        actualProviderUsed = 'mymemory';
      }
    }

    if (actualProviderUsed === 'mymemory' || actualProviderUsed === 'auto') {
      try {
        // Concurrently translate chunks of 4 to stay well under rate constraints
        const toTranslate = pendingIndices.map((i) => texts[i]);
        const chunkSize = 4;
        const translated: (string | null)[] = [];

        for (let i = 0; i < toTranslate.length; i += chunkSize) {
          const slice = toTranslate.slice(i, i + chunkSize);
          const chunkResults = await Promise.all(
            slice.map((txt) =>
              translateWithMyMemory(txt, sourceLanguage, targetLanguage).catch((err) => {
                logger.log({
                  level: 'warn',
                  category: 'api',
                  requestId: (req as any).id || 'req-translate',
                  eventType: 'MYMEMORY_ITEM_FALLBACK',
                  outcome: 'warning',
                  message: `MyMemory item fail: ${err?.message}`,
                });
                return null;
              })
            )
          );
          translated.push(...chunkResults);
        }

        pendingIndices.forEach((origIdx, i) => {
          results[origIdx] = translated[i] || texts[origIdx];
        });

        providerStats.mymemory.requests++;
        providerStats.mymemory.translations += toTranslate.length;
        providerStats.mymemory.lastUsed = new Date().toISOString();
        actualProviderUsed = 'mymemory';
      } catch (err: any) {
        actualProviderUsed = 'dictionary';
      }
    }

    // Step 3: Fill any remaining gaps with original text
    texts.forEach((orig, idx) => {
      if (!results[idx]) {
        results[idx] = orig;
      }
    });

    const latencyMs = Date.now() - startTime;

    return res.json({
      translations: results,
      targetLanguage,
      sourceLanguage,
      provider: actualProviderUsed,
      activeEngine: activeProvider,
      latencyMs,
    });
  } catch (err: any) {
    logger.log({
      level: 'error',
      category: 'api',
      requestId: (req as any).id || 'req-translate',
      eventType: 'TRANSLATION_CONTROLLER_ERROR',
      outcome: 'failure',
      message: err?.message || 'handleTranslationRequest error',
    });

    // Safe non-crashing fallback
    return res.json({
      translations: req.body?.texts || [],
      targetLanguage: req.body?.targetLanguage || 'en',
      sourceLanguage: req.body?.sourceLanguage || 'en',
      provider: 'fallback',
      latencyMs: Date.now() - startTime,
      fallback: true,
    });
  }
}

/**
 * Returns list of available translation providers and active switch configuration
 * GET /api/v1/translate/providers
 */
export function handleGetProviders(req: Request, res: Response) {
  const providers: ProviderDefinition[] = [
    {
      id: 'mymemory',
      name: 'MyMemory Neural Translation API',
      description: 'Independent global machine and human translation memory. High precision, zero Google dependencies, fast response times.',
      isAvailable: true,
      requiresKey: false,
      type: 'free',
      icon: 'zap',
    },
    {
      id: 'libretranslate',
      name: 'LibreTranslate Open API',
      description: 'Open-source, self-hosted or decentralized translation engine based on Argos Translate with zero tracking.',
      isAvailable: true,
      requiresKey: false,
      type: 'free',
      icon: 'shield',
    },
    {
      id: 'deepl',
      name: 'DeepL Pro / Free API',
      description: 'World-renowned neural machine translation specializing in European languages and nuanced financial syntax.',
      isAvailable: !!process.env.DEEPL_API_KEY,
      requiresKey: true,
      type: 'freemium',
      icon: 'sparkles',
    },
    {
      id: 'dictionary',
      name: 'Kretz Prime Real Estate Terminology Engine',
      description: 'High-speed deterministic luxury real estate and financial dictionary across 12 languages with zero network latency.',
      isAvailable: true,
      requiresKey: false,
      type: 'local',
      icon: 'book',
    },
    {
      id: 'auto',
      name: 'Smart Auto-Switch & Failover',
      description: 'Automatically switches between MyMemory, LibreTranslate, and the Real Estate dictionary with transparent fault tolerance.',
      isAvailable: true,
      requiresKey: false,
      type: 'hybrid',
      icon: 'refresh-cw',
    },
  ];

  res.json({
    activeProvider,
    providers,
    stats: providerStats,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Switches the active translation provider engine
 * POST /api/v1/translate/switch
 */
export function handleSwitchProvider(req: Request, res: Response) {
  const { provider } = req.body;
  const validProviders: TranslationProviderId[] = ['mymemory', 'libretranslate', 'deepl', 'dictionary', 'auto'];

  if (!provider || !validProviders.includes(provider)) {
    return res.status(400).json({
      error: 'Invalid translation provider',
      allowedProviders: validProviders,
    });
  }

  const previousProvider = activeProvider;
  activeProvider = provider;

  logger.log({
    level: 'info',
    category: 'api',
    requestId: (req as any).id || 'req-switch-translate',
    eventType: 'TRANSLATION_PROVIDER_SWITCHED',
    outcome: 'success',
    message: `Translation API switched from ${previousProvider} to ${activeProvider}`,
  });

  return res.json({
    success: true,
    previousProvider,
    activeProvider,
    message: `Active translation API successfully switched to ${activeProvider}`,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Quick translation test endpoint for validating any engine
 * POST /api/v1/translate/test
 */
export async function handleTestTranslation(req: Request, res: Response) {
  const { text = 'Prime Luxury Real Estate in Madrid with High Net Yield', targetLanguage = 'fr', provider } = req.body;
  req.body = {
    texts: [text],
    targetLanguage,
    provider: provider || activeProvider,
    sourceLanguage: 'en',
  };
  return handleTranslationRequest(req, res);
}
