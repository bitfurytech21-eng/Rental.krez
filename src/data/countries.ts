export interface CountryOption {
  name: string;
  code: string; // ISO 3166-1 alpha-2
  dialCode: string; // E.164 dialing prefix
  flag: string; // Emoji flag
  placeholder: string;
}

export const COUNTRIES: CountryOption[] = [
  { name: 'France', code: 'FR', dialCode: '+33', flag: '🇫🇷', placeholder: '6 12 34 56 78' },
  { name: 'Spain', code: 'ES', dialCode: '+34', flag: '🇪🇸', placeholder: '600 000 000' },
  { name: 'Monaco', code: 'MC', dialCode: '+377', flag: '🇲🇨', placeholder: '6 12 34 56 78' },
  { name: 'United Kingdom', code: 'GB', dialCode: '+44', flag: '🇬🇧', placeholder: '7911 123456' },
  { name: 'United States', code: 'US', dialCode: '+1', flag: '🇺🇸', placeholder: '(555) 000-0000' },
  { name: 'Germany', code: 'DE', dialCode: '+49', flag: '🇩🇪', placeholder: '151 12345678' },
  { name: 'Italy', code: 'IT', dialCode: '+39', flag: '🇮🇹', placeholder: '320 1234567' },
  { name: 'Switzerland', code: 'CH', dialCode: '+41', flag: '🇨🇭', placeholder: '79 123 45 67' },
  { name: 'Belgium', code: 'BE', dialCode: '+32', flag: '🇧🇪', placeholder: '470 12 34 56' },
  { name: 'Portugal', code: 'PT', dialCode: '+351', flag: '🇵🇹', placeholder: '912 345 678' },
  { name: 'Netherlands', code: 'NL', dialCode: '+31', flag: '🇳🇱', placeholder: '6 12345678' },
  { name: 'Luxembourg', code: 'LU', dialCode: '+352', flag: '🇱🇺', placeholder: '621 123 456' },
  { name: 'Ireland', code: 'IE', dialCode: '+353', flag: '🇮🇪', placeholder: '87 123 4567' },
  { name: 'Austria', code: 'AT', dialCode: '+43', flag: '🇦🇹', placeholder: '664 1234567' },
  { name: 'Sweden', code: 'SE', dialCode: '+46', flag: '🇸🇪', placeholder: '70 123 45 67' },
  { name: 'Norway', code: 'NO', dialCode: '+47', flag: '🇳🇴', placeholder: '412 34 567' },
  { name: 'Denmark', code: 'DK', dialCode: '+45', flag: '🇩🇰', placeholder: '20 12 34 56' },
  { name: 'Finland', code: 'FI', dialCode: '+358', flag: '🇫🇮', placeholder: '40 1234567' },
  { name: 'Greece', code: 'GR', dialCode: '+30', flag: '🇬🇷', placeholder: '690 123 4567' },
  { name: 'Poland', code: 'PL', dialCode: '+48', flag: '🇵🇱', placeholder: '501 234 567' },
  { name: 'Czech Republic', code: 'CZ', dialCode: '+420', flag: '🇨🇿', placeholder: '601 123 456' },
  { name: 'United Arab Emirates', code: 'AE', dialCode: '+971', flag: '🇦🇪', placeholder: '50 123 4567' },
  { name: 'Saudi Arabia', code: 'SA', dialCode: '+966', flag: '🇸🇦', placeholder: '50 123 4567' },
  { name: 'Qatar', code: 'QA', dialCode: '+974', flag: '🇶🇦', placeholder: '3312 3456' },
  { name: 'Kuwait', code: 'KW', dialCode: '+965', flag: '🇰🇼', placeholder: '9012 3456' },
  { name: 'Bahrain', code: 'BH', dialCode: '+973', flag: '🇧🇭', placeholder: '3600 1234' },
  { name: 'Singapore', code: 'SG', dialCode: '+65', flag: '🇸🇬', placeholder: '8123 4567' },
  { name: 'Hong Kong', code: 'HK', dialCode: '+852', flag: '🇭🇰', placeholder: '9123 4567' },
  { name: 'Japan', code: 'JP', dialCode: '+81', flag: '🇯🇵', placeholder: '90 1234 5678' },
  { name: 'South Korea', code: 'KR', dialCode: '+82', flag: '🇰🇷', placeholder: '10 1234 5678' },
  { name: 'Canada', code: 'CA', dialCode: '+1', flag: '🇨🇦', placeholder: '(416) 000-0000' },
  { name: 'Australia', code: 'AU', dialCode: '+61', flag: '🇦🇺', placeholder: '412 345 678' },
  { name: 'New Zealand', code: 'NZ', dialCode: '+64', flag: '🇳🇿', placeholder: '21 123 4567' },
  { name: 'Mexico', code: 'MX', dialCode: '+52', flag: '🇲🇽', placeholder: '55 1234 5678' },
  { name: 'Brazil', code: 'BR', dialCode: '+55', flag: '🇧🇷', placeholder: '11 91234-5678' },
  { name: 'Argentina', code: 'AR', dialCode: '+54', flag: '🇦🇷', placeholder: '9 11 1234-5678' },
  { name: 'South Africa', code: 'ZA', dialCode: '+27', flag: '🇿🇦', placeholder: '82 123 4567' },
  { name: 'Morocco', code: 'MA', dialCode: '+212', flag: '🇲🇦', placeholder: '6 12 34 56 78' },
  { name: 'Turkey', code: 'TR', dialCode: '+90', flag: '🇹🇷', placeholder: '532 123 45 67' },
  { name: 'India', code: 'IN', dialCode: '+91', flag: '🇮🇳', placeholder: '98765 43210' },
  { name: 'China', code: 'CN', dialCode: '+86', flag: '🇨🇳', placeholder: '138 0000 0000' },
  { name: 'Philippines', code: 'PH', dialCode: '+63', flag: '🇵🇭', placeholder: '917 123 4567' },
  { name: 'Nigeria', code: 'NG', dialCode: '+234', flag: '🇳🇬', placeholder: '803 123 4567' },
  { name: 'Kenya', code: 'KE', dialCode: '+254', flag: '🇰🇪', placeholder: '712 345678' },
  { name: 'Israel', code: 'IL', dialCode: '+972', flag: '🇮🇱', placeholder: '50 123 4567' },
];

export const DEFAULT_COUNTRY = COUNTRIES[0]; // France

export function getCountryByCode(code: string): CountryOption {
  return COUNTRIES.find((c) => c.code === code) || DEFAULT_COUNTRY;
}

export function getCountryByName(name: string): CountryOption {
  return COUNTRIES.find((c) => c.name.toLowerCase() === name.toLowerCase()) || DEFAULT_COUNTRY;
}
