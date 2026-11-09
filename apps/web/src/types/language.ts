export type LanguageCode = string;

export type LanguageRegion = 'african' | 'european' | 'asian' | 'americas' | 'middle_east' | 'international';

export type TranslationStatus = 'verified' | 'supported' | 'automated';

export interface LanguageOption {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
  dir: 'ltr' | 'rtl';
  region: LanguageRegion;
  status: TranslationStatus;
}

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  // Core European & Flagship
  { code: 'en', name: 'English (US/UK)', nativeName: 'English', flag: '🇬🇧', dir: 'ltr', region: 'european', status: 'verified' },
  { code: 'en-US', name: 'English (United States)', nativeName: 'English (US)', flag: '🇺🇸', dir: 'ltr', region: 'americas', status: 'verified' },
  { code: 'en-GB', name: 'English (United Kingdom)', nativeName: 'English (UK)', flag: '🇬🇧', dir: 'ltr', region: 'european', status: 'verified' },
  { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷', dir: 'ltr', region: 'european', status: 'verified' },
  { code: 'es', name: 'Spanish (Spain)', nativeName: 'Español', flag: '🇪🇸', dir: 'ltr', region: 'european', status: 'verified' },
  { code: 'es-MX', name: 'Spanish (Mexico)', nativeName: 'Español (México)', flag: '🇲🇽', dir: 'ltr', region: 'americas', status: 'verified' },
  { code: 'de', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪', dir: 'ltr', region: 'european', status: 'verified' },
  { code: 'pt', name: 'Portuguese (Portugal)', nativeName: 'Português', flag: '🇵🇹', dir: 'ltr', region: 'european', status: 'verified' },
  { code: 'pt-BR', name: 'Portuguese (Brazil)', nativeName: 'Português (Brasil)', flag: '🇧🇷', dir: 'ltr', region: 'americas', status: 'verified' },
  { code: 'it', name: 'Italian', nativeName: 'Italiano', flag: '🇮🇹', dir: 'ltr', region: 'european', status: 'verified' },
  { code: 'nl', name: 'Dutch', nativeName: 'Nederlands', flag: '🇳🇱', dir: 'ltr', region: 'european', status: 'verified' },
  { code: 'nl-BE', name: 'Flemish', nativeName: 'Vlaams', flag: '🇧🇪', dir: 'ltr', region: 'european', status: 'supported' },

  // Middle East & RTL
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', flag: '🇦🇪', dir: 'rtl', region: 'middle_east', status: 'verified' },
  { code: 'he', name: 'Hebrew', nativeName: 'עברית', flag: '🇮🇱', dir: 'rtl', region: 'middle_east', status: 'supported' },
  { code: 'fa', name: 'Persian (Farsi)', nativeName: 'فارسی', flag: '🇮🇷', dir: 'rtl', region: 'middle_east', status: 'supported' },
  { code: 'ur', name: 'Urdu', nativeName: 'اردو', flag: '🇵🇰', dir: 'rtl', region: 'asian', status: 'supported' },
  { code: 'ps', name: 'Pashto', nativeName: 'پښتو', flag: '🇦🇫', dir: 'rtl', region: 'middle_east', status: 'automated' },
  { code: 'ku', name: 'Kurdish', nativeName: 'Kurdî / کوردی', flag: '🇮🇶', dir: 'rtl', region: 'middle_east', status: 'automated' },
  { code: 'ug', name: 'Uyghur', nativeName: 'ئۇيغۇرچە', flag: '🇨🇳', dir: 'rtl', region: 'asian', status: 'automated' },

  // Major Asian
  { code: 'zh-CN', name: 'Chinese (Simplified)', nativeName: '中文 (简体)', flag: '🇨🇳', dir: 'ltr', region: 'asian', status: 'verified' },
  { code: 'zh-TW', name: 'Chinese (Traditional)', nativeName: '中文 (繁體)', flag: '🇹🇼', dir: 'ltr', region: 'asian', status: 'verified' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語', flag: '🇯🇵', dir: 'ltr', region: 'asian', status: 'verified' },
  { code: 'ko', name: 'Korean', nativeName: '한국어', flag: '🇰🇷', dir: 'ltr', region: 'asian', status: 'supported' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', flag: '🇮🇳', dir: 'ltr', region: 'asian', status: 'supported' },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা', flag: '🇧🇩', dir: 'ltr', region: 'asian', status: 'supported' },
  { code: 'pa', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ', flag: '🇮🇳', dir: 'ltr', region: 'asian', status: 'supported' },
  { code: 'gu', name: 'Gujarati', nativeName: 'ગુજરાતી', flag: '🇮🇳', dir: 'ltr', region: 'asian', status: 'automated' },
  { code: 'mr', name: 'Marathi', nativeName: 'मराठी', flag: '🇮🇳', dir: 'ltr', region: 'asian', status: 'automated' },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்', flag: '🇮🇳', dir: 'ltr', region: 'asian', status: 'supported' },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు', flag: '🇮🇳', dir: 'ltr', region: 'asian', status: 'automated' },
  { code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ', flag: '🇮🇳', dir: 'ltr', region: 'asian', status: 'automated' },
  { code: 'ml', name: 'Malayalam', nativeName: 'മലയാളം', flag: '🇮🇳', dir: 'ltr', region: 'asian', status: 'automated' },
  { code: 'si', name: 'Sinhala', nativeName: 'සිංහල', flag: '🇱🇰', dir: 'ltr', region: 'asian', status: 'automated' },
  { code: 'ne', name: 'Nepali', nativeName: 'नेपाली', flag: '🇳🇵', dir: 'ltr', region: 'asian', status: 'automated' },

  // Southeast Asian
  { code: 'th', name: 'Thai', nativeName: 'ไทย', flag: '🇹🇭', dir: 'ltr', region: 'asian', status: 'supported' },
  { code: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt', flag: '🇻🇳', dir: 'ltr', region: 'asian', status: 'supported' },
  { code: 'id', name: 'Indonesian', nativeName: 'Bahasa Indonesia', flag: '🇮🇩', dir: 'ltr', region: 'asian', status: 'supported' },
  { code: 'ms', name: 'Malay', nativeName: 'Bahasa Melayu', flag: '🇲🇾', dir: 'ltr', region: 'asian', status: 'supported' },
  { code: 'fil', name: 'Filipino (Tagalog)', nativeName: 'Wikang Filipino', flag: '🇵🇭', dir: 'ltr', region: 'asian', status: 'supported' },
  { code: 'km', name: 'Khmer', nativeName: 'ភាសាខ្មែរ', flag: '🇰🇭', dir: 'ltr', region: 'asian', status: 'automated' },
  { code: 'lo', name: 'Lao', nativeName: 'ພາສາລາວ', flag: '🇱🇦', dir: 'ltr', region: 'asian', status: 'automated' },
  { code: 'my', name: 'Burmese', nativeName: 'မြန်မာစာ', flag: '🇲🇲', dir: 'ltr', region: 'asian', status: 'automated' },
  { code: 'jv', name: 'Javanese', nativeName: 'Basa Jawa', flag: '🇮🇩', dir: 'ltr', region: 'asian', status: 'automated' },
  { code: 'su', name: 'Sundanese', nativeName: 'Basa Sunda', flag: '🇮🇩', dir: 'ltr', region: 'asian', status: 'automated' },

  // Central Asian & Eurasian
  { code: 'tr', name: 'Turkish', nativeName: 'Türkçe', flag: '🇹🇷', dir: 'ltr', region: 'european', status: 'verified' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский', flag: '🇷🇺', dir: 'ltr', region: 'european', status: 'verified' },
  { code: 'uk', name: 'Ukrainian', nativeName: 'Українська', flag: '🇺🇦', dir: 'ltr', region: 'european', status: 'supported' },
  { code: 'be', name: 'Belarusian', nativeName: 'Беларуская', flag: '🇧🇾', dir: 'ltr', region: 'european', status: 'automated' },
  { code: 'kk', name: 'Kazakh', nativeName: 'Қазақ тілі', flag: '🇰🇿', dir: 'ltr', region: 'asian', status: 'supported' },
  { code: 'uz', name: 'Uzbek', nativeName: 'O‘zbek tili', flag: '🇺🇿', dir: 'ltr', region: 'asian', status: 'supported' },
  { code: 'ky', name: 'Kyrgyz', nativeName: 'Кыргызча', flag: '🇰🇬', dir: 'ltr', region: 'asian', status: 'automated' },
  { code: 'tg', name: 'Tajik', nativeName: 'Тоҷикӣ', flag: '🇹🇯', dir: 'ltr', region: 'asian', status: 'automated' },
  { code: 'tk', name: 'Turkmen', nativeName: 'Türkmen dili', flag: '🇹🇲', dir: 'ltr', region: 'asian', status: 'automated' },
  { code: 'mn', name: 'Mongolian', nativeName: 'Монгол хэл', flag: '🇲🇳', dir: 'ltr', region: 'asian', status: 'automated' },
  { code: 'hy', name: 'Armenian', nativeName: 'Հայերեն', flag: '🇦🇲', dir: 'ltr', region: 'european', status: 'supported' },
  { code: 'az', name: 'Azerbaijani', nativeName: 'Azərbaycan dili', flag: '🇦🇿', dir: 'ltr', region: 'european', status: 'supported' },
  { code: 'ka', name: 'Georgian', nativeName: 'ქართული', flag: '🇬🇪', dir: 'ltr', region: 'european', status: 'supported' },

  // Comprehensive African Languages
  { code: 'sw', name: 'Swahili', nativeName: 'Kiswahili', flag: '🇰🇪', dir: 'ltr', region: 'african', status: 'verified' },
  { code: 'pcm', name: 'Nigerian Pidgin', nativeName: 'Naija Pidgin', flag: '🇳🇬', dir: 'ltr', region: 'african', status: 'supported' },
  { code: 'ha', name: 'Hausa', nativeName: 'Harshen Hausa', flag: '🇳🇬', dir: 'ltr', region: 'african', status: 'supported' },
  { code: 'yo', name: 'Yoruba', nativeName: 'Èdè Yorùbá', flag: '🇳🇬', dir: 'ltr', region: 'african', status: 'supported' },
  { code: 'ig', name: 'Igbo', nativeName: 'Asụsụ Igbo', flag: '🇳🇬', dir: 'ltr', region: 'african', status: 'supported' },
  { code: 'am', name: 'Amharic', nativeName: 'አማርኛ', flag: '🇪🇹', dir: 'ltr', region: 'african', status: 'supported' },
  { code: 'so', name: 'Somali', nativeName: 'Soomaaliga', flag: '🇸🇴', dir: 'ltr', region: 'african', status: 'supported' },
  { code: 'af', name: 'Afrikaans', nativeName: 'Afrikaans', flag: '🇿🇦', dir: 'ltr', region: 'african', status: 'supported' },
  { code: 'zu', name: 'Zulu', nativeName: 'isiZulu', flag: '🇿🇦', dir: 'ltr', region: 'african', status: 'supported' },
  { code: 'xh', name: 'Xhosa', nativeName: 'isiXhosa', flag: '🇿🇦', dir: 'ltr', region: 'african', status: 'supported' },
  { code: 'sn', name: 'Shona', nativeName: 'chiShona', flag: '🇿🇼', dir: 'ltr', region: 'african', status: 'automated' },
  { code: 'rw', name: 'Kinyarwanda', nativeName: 'Ikinyarwanda', flag: '🇷🇼', dir: 'ltr', region: 'african', status: 'supported' },
  { code: 'rn', name: 'Kirundi', nativeName: 'Ikirundi', flag: '🇧🇮', dir: 'ltr', region: 'african', status: 'automated' },
  { code: 'wo', name: 'Wolof', nativeName: 'Wolof', flag: '🇸🇳', dir: 'ltr', region: 'african', status: 'automated' },
  { code: 'om', name: 'Oromo', nativeName: 'Afaan Oromoo', flag: '🇪🇹', dir: 'ltr', region: 'african', status: 'automated' },
  { code: 'ti', name: 'Tigrinya', nativeName: 'ትግርኛ', flag: '🇪🇷', dir: 'ltr', region: 'african', status: 'automated' },
  { code: 'st', name: 'Sesotho', nativeName: 'Sesotho', flag: '🇱🇸', dir: 'ltr', region: 'african', status: 'automated' },
  { code: 'tn', name: 'Setswana', nativeName: 'Setswana', flag: '🇧🇼', dir: 'ltr', region: 'african', status: 'automated' },
  { code: 'lg', name: 'Luganda', nativeName: 'Luganda', flag: '🇺🇬', dir: 'ltr', region: 'african', status: 'automated' },
  { code: 'ln', name: 'Lingala', nativeName: 'Lingála', flag: '🇨🇩', dir: 'ltr', region: 'african', status: 'automated' },
  { code: 'mg', name: 'Malagasy', nativeName: 'Malagasy', flag: '🇲🇬', dir: 'ltr', region: 'african', status: 'automated' },
  { code: 'bm', name: 'Bambara', nativeName: 'Bamanankan', flag: '🇲🇱', dir: 'ltr', region: 'african', status: 'automated' },
  { code: 'tw', name: 'Akan (Twi)', nativeName: 'Twi', flag: '🇬🇭', dir: 'ltr', region: 'african', status: 'supported' },
  { code: 'ee', name: 'Ewe', nativeName: 'Eʋegbe', flag: '🇬🇭', dir: 'ltr', region: 'african', status: 'automated' },
  { code: 'ff', name: 'Fulfulde', nativeName: 'Fulfulde', flag: '🇸🇳', dir: 'ltr', region: 'african', status: 'automated' },
  { code: 'ny', name: 'Chichewa', nativeName: 'Chichewa', flag: '🇲🇼', dir: 'ltr', region: 'african', status: 'automated' },

  // Remaining European Languages
  { code: 'sv', name: 'Swedish', nativeName: 'Svenska', flag: '🇸🇪', dir: 'ltr', region: 'european', status: 'supported' },
  { code: 'no', name: 'Norwegian Bokmål', nativeName: 'Norsk Bokmål', flag: '🇳🇴', dir: 'ltr', region: 'european', status: 'supported' },
  { code: 'da', name: 'Danish', nativeName: 'Dansk', flag: '🇩🇰', dir: 'ltr', region: 'european', status: 'supported' },
  { code: 'fi', name: 'Finnish', nativeName: 'Suomi', flag: '🇫🇮', dir: 'ltr', region: 'european', status: 'supported' },
  { code: 'is', name: 'Icelandic', nativeName: 'Íslenska', flag: '🇮🇸', dir: 'ltr', region: 'european', status: 'automated' },
  { code: 'ga', name: 'Irish', nativeName: 'Gaeilge', flag: '🇮🇪', dir: 'ltr', region: 'european', status: 'automated' },
  { code: 'cy', name: 'Welsh', nativeName: 'Cymraeg', flag: '󠁧󠁢󠁷󠁬󠁳󠁿', dir: 'ltr', region: 'european', status: 'automated' },
  { code: 'gd', name: 'Scottish Gaelic', nativeName: 'Gàidhlig', flag: '󠁧󠁢󠁳󠁣󠁴󠁿', dir: 'ltr', region: 'european', status: 'automated' },
  { code: 'pl', name: 'Polish', nativeName: 'Polski', flag: '🇵🇱', dir: 'ltr', region: 'european', status: 'supported' },
  { code: 'cs', name: 'Czech', nativeName: 'Čeština', flag: '🇨🇿', dir: 'ltr', region: 'european', status: 'supported' },
  { code: 'sk', name: 'Slovak', nativeName: 'Slovenčina', flag: '🇸🇰', dir: 'ltr', region: 'european', status: 'supported' },
  { code: 'sl', name: 'Slovenian', nativeName: 'Slovenščina', flag: '🇸🇮', dir: 'ltr', region: 'european', status: 'supported' },
  { code: 'hr', name: 'Croatian', nativeName: 'Hrvatski', flag: '🇭🇷', dir: 'ltr', region: 'european', status: 'supported' },
  { code: 'sr', name: 'Serbian', nativeName: 'Српски', flag: '🇷🇸', dir: 'ltr', region: 'european', status: 'supported' },
  { code: 'bs', name: 'Bosnian', nativeName: 'Bosanski', flag: '🇧🇦', dir: 'ltr', region: 'european', status: 'supported' },
  { code: 'bg', name: 'Bulgarian', nativeName: 'Български', flag: '🇧🇬', dir: 'ltr', region: 'european', status: 'supported' },
  { code: 'ro', name: 'Romanian', nativeName: 'Română', flag: '🇷🇴', dir: 'ltr', region: 'european', status: 'supported' },
  { code: 'hu', name: 'Hungarian', nativeName: 'Magyar', flag: '🇭🇺', dir: 'ltr', region: 'european', status: 'supported' },
  { code: 'el', name: 'Greek', nativeName: 'Ελληνικά', flag: '🇬🇷', dir: 'ltr', region: 'european', status: 'supported' },
  { code: 'sq', name: 'Albanian', nativeName: 'Shqip', flag: '🇦🇱', dir: 'ltr', region: 'european', status: 'supported' },
  { code: 'mk', name: 'Macedonian', nativeName: 'Македонски', flag: '🇲🇰', dir: 'ltr', region: 'european', status: 'automated' },
  { code: 'lt', name: 'Lithuanian', nativeName: 'Lietuvių', flag: '🇱🇹', dir: 'ltr', region: 'european', status: 'supported' },
  { code: 'lv', name: 'Latvian', nativeName: 'Latviešu', flag: '🇱🇻', dir: 'ltr', region: 'european', status: 'supported' },
  { code: 'et', name: 'Estonian', nativeName: 'Eesti', flag: '🇪🇪', dir: 'ltr', region: 'european', status: 'supported' },
  { code: 'ca', name: 'Catalan', nativeName: 'Català', flag: '🇪🇸', dir: 'ltr', region: 'european', status: 'supported' },
  { code: 'eu', name: 'Basque', nativeName: 'Euskara', flag: '🇪🇸', dir: 'ltr', region: 'european', status: 'supported' },
  { code: 'gl', name: 'Galician', nativeName: 'Galego', flag: '🇪🇸', dir: 'ltr', region: 'european', status: 'supported' },
  { code: 'lb', name: 'Luxembourgish', nativeName: 'Lëtzebuergesch', flag: '🇱🇺', dir: 'ltr', region: 'european', status: 'automated' },
  { code: 'mt', name: 'Maltese', nativeName: 'Malti', flag: '🇲🇹', dir: 'ltr', region: 'european', status: 'supported' },
  { code: 'eo', name: 'Esperanto', nativeName: 'Esperanto', flag: '🌐', dir: 'ltr', region: 'international', status: 'automated' },
];

export type TranslationProviderId = 'mymemory' | 'libretranslate' | 'deepl' | 'dictionary' | 'auto';

export interface TranslationProviderInfo {
  id: TranslationProviderId;
  name: string;
  description: string;
  isAvailable: boolean;
  requiresKey: boolean;
  type: 'free' | 'freemium' | 'local' | 'hybrid';
  icon?: string;
}

export interface TranslationRequest {
  texts: string[];
  targetLanguage: string;
  sourceLanguage?: string;
  provider?: TranslationProviderId;
}

export interface TranslationResponse {
  translations: string[];
  targetLanguage: string;
  sourceLanguage?: string;
  cached?: boolean;
  provider?: string;
  activeEngine?: string;
  latencyMs?: number;
}
