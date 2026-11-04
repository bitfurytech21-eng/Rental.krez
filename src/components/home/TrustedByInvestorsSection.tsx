import React from 'react';
import { ShieldCheck, Award, Lock, CheckCircle2 } from 'lucide-react';

// Crisp Vector SVG Brand Logos for Partners
const BinanceLogoSvg: React.FC<{ className?: string }> = ({ className = "h-7 sm:h-8 w-auto" }) => (
  <svg className={className} viewBox="0 0 160 36" fill="none">
    <path d="M22.5 13.5L18 9l-4.5 4.5L18 18l4.5-4.5zM18 0l-9 9 4.5 4.5L18 9l4.5 4.5L27 9l-9-9zM18 27l-4.5-4.5L9 27l9 9 9-9-4.5-4.5L18 27zM31.5 13.5L27 18l4.5 4.5L36 18l-4.5-4.5zM18 13.5L13.5 18 18 22.5 22.5 18 18 13.5z" fill="#F0B90B" />
    <text x="44" y="24" fontFamily="system-ui, -apple-system, sans-serif" fontWeight="800" fontSize="18" letterSpacing="2" fill="#1C1917">BINANCE</text>
  </svg>
);

const CoinbaseLogoSvg: React.FC<{ className?: string }> = ({ className = "h-7 sm:h-8 w-auto" }) => (
  <svg className={className} viewBox="0 0 160 36" fill="none">
    <circle cx="18" cy="18" r="14" fill="#0052FF" />
    <rect x="13" y="13" width="10" height="10" rx="2" fill="#FFFFFF" />
    <text x="42" y="24" fontFamily="system-ui, -apple-system, sans-serif" fontWeight="700" fontSize="18" letterSpacing="-0.5" fill="#0052FF">coinbase</text>
  </svg>
);

const BybitLogoSvg: React.FC<{ className?: string }> = ({ className = "h-7 sm:h-8 w-auto" }) => (
  <svg className={className} viewBox="0 0 140 36" fill="none">
    <path d="M8 26V10h12c3.5 0 6 2 6 5.5 0 2.2-1.2 3.8-3 4.6 2.3.7 3.8 2.5 3.8 5.4 0 3.8-2.8 5.5-6.8 5.5H8zm5-11.5h6c1.5 0 2.5-.8 2.5-2s-1-2-2.5-2h-6v4zm0 8.5h6.5c1.8 0 2.8-.8 2.8-2.2 0-1.3-1-2.2-2.8-2.2H13v4.4z" fill="#1C1917" />
    <path d="M30 26l7-10 7 10h-5.5l-4-6-4 6H30zm18-16l5 8 5-8h5.5l-8 12v4H51v-4l-8-12H48z" fill="#F7A600" />
    <text x="72" y="24" fontFamily="system-ui, -apple-system, sans-serif" fontWeight="800" fontSize="18" letterSpacing="1" fill="#1C1917">BYBIT</text>
  </svg>
);

const OkxLogoSvg: React.FC<{ className?: string }> = ({ className = "h-7 sm:h-8 w-auto" }) => (
  <svg className={className} viewBox="0 0 120 36" fill="none">
    <rect x="4" y="6" width="7" height="7" fill="#1C1917" />
    <rect x="15" y="6" width="7" height="7" fill="#1C1917" />
    <rect x="9.5" y="14.5" width="7" height="7" fill="#1C1917" />
    <rect x="4" y="23" width="7" height="7" fill="#1C1917" />
    <rect x="15" y="23" width="7" height="7" fill="#1C1917" />
    <text x="32" y="25" fontFamily="system-ui, -apple-system, sans-serif" fontWeight="900" fontSize="22" letterSpacing="2" fill="#1C1917">OKX</text>
  </svg>
);

const TrustWalletLogoSvg: React.FC<{ className?: string }> = ({ className = "h-7 sm:h-8 w-auto" }) => (
  <svg className={className} viewBox="0 0 150 36" fill="none">
    <path d="M18 4L6 9v8c0 7.5 5 14 12 16 7-2 12-8.5 12-16V9L18 4z" fill="#0500FF" />
    <path d="M18 8L10 11.5v6c0 5 3.3 9.3 8 10.7V8z" fill="#3375BB" />
    <text x="38" y="24" fontFamily="system-ui, -apple-system, sans-serif" fontWeight="800" fontSize="18" letterSpacing="1" fill="#1C1917">TRUST</text>
  </svg>
);

const NetflixLogoSvg: React.FC<{ className?: string }> = ({ className = "h-7 sm:h-8 w-auto" }) => (
  <svg className={className} viewBox="0 0 140 36" fill="none">
    <path d="M8 32V4h6l8 20V4h6v28h-6l-8-20v20H8z" fill="#E50914" />
    <text x="38" y="25" fontFamily="system-ui, -apple-system, sans-serif" fontWeight="900" fontSize="20" letterSpacing="2" fill="#E50914">NETFLIX</text>
  </svg>
);

const Tf1LogoSvg: React.FC<{ className?: string }> = ({ className = "h-7 sm:h-8 w-auto" }) => (
  <svg className={className} viewBox="0 0 150 36" fill="none">
    <rect x="2" y="6" width="34" height="24" rx="4" fill="#E1000F" />
    <text x="7" y="24" fontFamily="system-ui, -apple-system, sans-serif" fontWeight="900" fontSize="16" fill="#FFFFFF">TF1</text>
    <text x="44" y="21" fontFamily="system-ui, -apple-system, sans-serif" fontWeight="800" fontSize="13" letterSpacing="1" fill="#1C1917">LE GROUPE</text>
  </svg>
);

const TmcLogoSvg: React.FC<{ className?: string }> = ({ className = "h-7 sm:h-8 w-auto" }) => (
  <svg className={className} viewBox="0 0 110 36" fill="none">
    <rect x="2" y="6" width="36" height="24" rx="4" fill="#003399" />
    <text x="6" y="23" fontFamily="system-ui, -apple-system, sans-serif" fontWeight="900" fontSize="15" fill="#FFFFFF">TMC</text>
    <text x="44" y="24" fontFamily="system-ui, -apple-system, sans-serif" fontWeight="800" fontSize="16" letterSpacing="1" fill="#003399">TMC</text>
  </svg>
);

const ReservoirLogoSvg: React.FC<{ className?: string }> = ({ className = "h-7 sm:h-8 w-auto" }) => (
  <svg className={className} viewBox="0 0 160 36" fill="none">
    <circle cx="16" cy="18" r="12" fill="#1C1917" />
    <path d="M16 10v16M8 18h16" stroke="#FFFFFF" strokeWidth="2.5" />
    <text x="34" y="20" fontFamily="system-ui, -apple-system, sans-serif" fontWeight="800" fontSize="12" letterSpacing="1" fill="#1C1917">RESERVOIR</text>
    <text x="34" y="30" fontFamily="system-ui, -apple-system, sans-serif" fontWeight="600" fontSize="10" letterSpacing="2" fill="#78716C">PROD</text>
  </svg>
);

interface PartnerLogo {
  id: string;
  name: string;
  SvgComponent: React.FC<{ className?: string }>;
}

const partnerLogos: PartnerLogo[] = [
  { id: 'binance', name: 'Binance', SvgComponent: BinanceLogoSvg },
  { id: 'coinbase', name: 'Coinbase', SvgComponent: CoinbaseLogoSvg },
  { id: 'bybit', name: 'Bybit', SvgComponent: BybitLogoSvg },
  { id: 'okx', name: 'OKX', SvgComponent: OkxLogoSvg },
  { id: 'trust', name: 'Trust Wallet', SvgComponent: TrustWalletLogoSvg },
  { id: 'netflix', name: 'Netflix', SvgComponent: NetflixLogoSvg },
  { id: 'tf1', name: 'TF1 Le Groupe', SvgComponent: Tf1LogoSvg },
  { id: 'tmc', name: 'TMC', SvgComponent: TmcLogoSvg },
  { id: 'reservoir', name: 'Reservoir Prod', SvgComponent: ReservoirLogoSvg },
];

// Crisp Vector SVG Logos for Regulatory Compliance Authorities
const RicsAuthSvg: React.FC<{ className?: string }> = ({ className = "h-7 sm:h-8 w-auto" }) => (
  <svg className={className} viewBox="0 0 160 40" fill="none">
    <path d="M12 4l12 6v10c0 7.2-5 13.9-12 16C5 33.9 0 27.2 0 20V10l12-6z" fill="#1E3A34" />
    <path d="M12 9l6 3v5c0 3.6-2.5 7-6 8-3.5-1-6-4.4-6-8v-5l6-3z" fill="#C5A059" />
    <text x="30" y="22" fontFamily="serif, Georgia, sans-serif" fontWeight="800" fontSize="18" letterSpacing="1.5" fill="#1E3A34">RICS</text>
    <text x="30" y="32" fontFamily="system-ui, sans-serif" fontWeight="600" fontSize="8" letterSpacing="0.8" fill="#78716C">CHARTERED SURVEYORS</text>
  </svg>
);

const AmfAuthSvg: React.FC<{ className?: string }> = ({ className = "h-7 sm:h-8 w-auto" }) => (
  <svg className={className} viewBox="0 0 150 40" fill="none">
    <rect x="2" y="6" width="28" height="28" rx="4" fill="#1C1917" />
    <path d="M16 11l-8 18h4.5l1.8-4.5h7.4l1.8 4.5H28L20 11h-4zm-0.2 4.8l2.5 6.2h-5l2.5-6.2z" fill="#FFFFFF" />
    <text x="36" y="22" fontFamily="system-ui, sans-serif" fontWeight="900" fontSize="20" letterSpacing="1" fill="#1C1917">AMF</text>
    <text x="36" y="32" fontFamily="system-ui, sans-serif" fontWeight="600" fontSize="8" letterSpacing="0.5" fill="#57534E">MARCHÉS FINANCIERS</text>
  </svg>
);

const CnmvAuthSvg: React.FC<{ className?: string }> = ({ className = "h-7 sm:h-8 w-auto" }) => (
  <svg className={className} viewBox="0 0 150 40" fill="none">
    <circle cx="16" cy="20" r="14" fill="#1E3A34" />
    <path d="M10 20l4 4 8-8" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    <text x="36" y="22" fontFamily="system-ui, sans-serif" fontWeight="900" fontSize="19" letterSpacing="1.5" fill="#1E3A34">CNMV</text>
    <text x="36" y="32" fontFamily="system-ui, sans-serif" fontWeight="600" fontSize="8" letterSpacing="0.5" fill="#57534E">MERCADO VALORES</text>
  </svg>
);

const MicaAuthSvg: React.FC<{ className?: string }> = ({ className = "h-7 sm:h-8 w-auto" }) => (
  <svg className={className} viewBox="0 0 160 40" fill="none">
    <rect x="2" y="6" width="28" height="28" rx="4" fill="#14221F" />
    <circle cx="16" cy="20" r="10" stroke="#C5A059" strokeWidth="2" strokeDasharray="2 2" />
    <path d="M16 14v12M12 18l4-4 4 4" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
    <text x="36" y="21" fontFamily="system-ui, sans-serif" fontWeight="900" fontSize="17" letterSpacing="1" fill="#14221F">EU MiCA</text>
    <text x="36" y="32" fontFamily="system-ui, sans-serif" fontWeight="600" fontSize="8" letterSpacing="0.5" fill="#1E3A34">DIGITAL ASSET REG</text>
  </svg>
);

const EscrowAuthSvg: React.FC<{ className?: string }> = ({ className = "h-7 sm:h-8 w-auto" }) => (
  <svg className={className} viewBox="0 0 160 40" fill="none">
    <rect x="2" y="6" width="28" height="28" rx="4" fill="#1C1917" />
    <rect x="10" y="17" width="12" height="10" rx="1" fill="#C5A059" />
    <path d="M12 17v-3a4 4 0 0 1 8 0v3" stroke="#C5A059" strokeWidth="2" fill="none" />
    <text x="36" y="21" fontFamily="system-ui, sans-serif" fontWeight="900" fontSize="17" letterSpacing="1" fill="#1C1917">ESCROW</text>
    <text x="36" y="32" fontFamily="system-ui, sans-serif" fontWeight="600" fontSize="8" letterSpacing="0.5" fill="#57534E">NOTARIAL CUSTODY</text>
  </svg>
);

interface RegulatoryBadge {
  id: string;
  code: string;
  title: string;
  subtitle: string;
  tag: string;
  AuthSvg: React.FC<{ className?: string }>;
}

const regulatoryBadges: RegulatoryBadge[] = [
  {
    id: 'rics',
    code: 'RICS',
    title: 'RICS Valuation',
    subtitle: 'Chartered Appraisals',
    tag: 'Certified',
    AuthSvg: RicsAuthSvg,
  },
  {
    id: 'amf',
    code: 'AMF',
    title: 'AMF Framework',
    subtitle: 'Financial Markets Reg',
    tag: 'Regulated',
    AuthSvg: AmfAuthSvg,
  },
  {
    id: 'cnmv',
    code: 'CNMV',
    title: 'CNMV Oversight',
    subtitle: 'Securities Protection',
    tag: 'Registered',
    AuthSvg: CnmvAuthSvg,
  },
  {
    id: 'mica',
    code: 'EU MiCA',
    title: 'EU MiCA Standard',
    subtitle: 'Digital Asset Reg',
    tag: 'Compliant',
    AuthSvg: MicaAuthSvg,
  },
  {
    id: 'escrow',
    code: 'ESCROW',
    title: 'Notarial Deed',
    subtitle: 'Bank Escrow Custody',
    tag: 'Protected',
    AuthSvg: EscrowAuthSvg,
  },
];

export const TrustedByInvestorsSection: React.FC = () => {
  const partnerRepeated = [...partnerLogos, ...partnerLogos];
  const regRepeated = [...regulatoryBadges, ...regulatoryBadges];

  return (
    <section 
      aria-label="Trusted by Investors"
      className="py-16 sm:py-24 bg-[#0B1B30] text-white border-t border-[#1A3358] relative overflow-hidden"
    >
      <div className="container max-w-[1240px] mx-auto px-4 sm:px-6 relative z-10">
        {/* Section Header */}
        <div className="max-w-3xl mx-auto text-center space-y-3 mb-12 sm:mb-16">
          <p className="text-[11px] font-extrabold text-[#BEE179] tracking-[0.2em] uppercase">
            Institutional Ecosystem & Custody
          </p>

          <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-black text-[#BEE179] tracking-tight drop-shadow-xs">
            Trusted by Private & Institutional Investors
          </h2>

          <p className="text-sm sm:text-base text-[#D1E2F7] leading-relaxed max-w-2xl mx-auto font-medium">
            Grounded in European securities compliance, ring-fenced legal titling, and independent RICS appraisals.
          </p>
        </div>

        {/* Marquee 1: Partner Ecosystem */}
        <div className="relative max-w-6xl mx-auto mb-10 overflow-hidden rounded-xl bg-[#102442] border border-[#1D3860] p-4 sm:p-6 shadow-md pause-on-hover touch-pan-x">
          <div className="absolute inset-y-0 left-0 w-16 sm:w-24 bg-gradient-to-r from-[#102442] via-[#102442]/80 to-transparent z-20 pointer-events-none" />
          <div className="absolute inset-y-0 right-0 w-16 sm:w-24 bg-gradient-to-l from-[#102442] via-[#102442]/80 to-transparent z-20 pointer-events-none" />

          <div className="overflow-hidden w-full">
            <div className="animate-horizontal-scroll-normal flex items-center gap-4 sm:gap-6 pr-4 sm:pr-6 w-max">
              {partnerRepeated.map((partner, idx) => {
                const PartnerSvg = partner.SvgComponent;
                return (
                  <div
                    key={`partner-${partner.id}-${idx}`}
                    className="p-4 sm:p-5 rounded-lg bg-[#0B1B30] border border-[#1D3860] shadow-sm hover:shadow-md transition-all duration-300 flex items-center justify-center min-w-[180px] sm:min-w-[220px] h-16 sm:h-20 shrink-0 group hover:border-[#BEE179]/40"
                  >
                    <PartnerSvg className="h-6 sm:h-7 w-auto max-w-[85%] filter brightness-200 group-hover:brightness-100 transition-all duration-300 opacity-80 group-hover:opacity-100" />
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Marquee 2: Regulatory Compliance */}
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-center gap-2 mb-4 text-center">
            <Lock className="w-3.5 h-3.5 text-[#BEE179]" />
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-white">
              Regulatory Frameworks & Institutional Safeguards
            </span>
          </div>

          <div className="relative overflow-hidden rounded-xl bg-[#102442] border border-[#1D3860] p-4 sm:p-6 shadow-md pause-on-hover touch-pan-x">
            <div className="absolute inset-y-0 left-0 w-16 sm:w-24 bg-gradient-to-r from-[#102442] via-[#102442]/80 to-transparent z-20 pointer-events-none" />
            <div className="absolute inset-y-0 right-0 w-16 sm:w-24 bg-gradient-to-l from-[#102442] via-[#102442]/80 to-transparent z-20 pointer-events-none" />

            <div className="overflow-hidden w-full">
              <div className="animate-horizontal-scroll-reverse flex items-center gap-4 sm:gap-6 pr-4 sm:pr-6 w-max">
                {regRepeated.map((badge, idx) => {
                  const AuthLogo = badge.AuthSvg;
                  return (
                    <div
                      key={`reg-${badge.id}-${idx}`}
                      className="bg-[#0B1B30] border border-[#1D3860] hover:border-[#BEE179]/40 rounded-lg p-3.5 shadow-sm hover:shadow-md transition-all duration-300 flex items-center gap-3.5 min-w-[260px] sm:min-w-[300px] h-16 sm:h-20 shrink-0 group"
                    >
                      <div className="shrink-0 p-1 bg-white rounded border border-[#1D3860]">
                        <AuthLogo className="h-7 sm:h-8 w-auto" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1 mb-0.5">
                          <span className="text-xs font-bold text-white truncate group-hover:text-[#BEE179] transition-colors">
                            {badge.code}
                          </span>
                          <span className="inline-flex items-center gap-1 text-[9px] font-bold text-[#0B1B30] bg-[#BEE179] px-1.5 py-0.5 rounded shrink-0">
                            <CheckCircle2 className="w-2.5 h-2.5 text-[#0B1B30]" />
                            {badge.tag}
                          </span>
                        </div>
                        <div className="text-[11px] font-bold text-[#BEE179] leading-snug truncate">
                          {badge.title}
                        </div>
                        <div className="text-[10px] text-[#8EA7C7] leading-tight truncate">
                          {badge.subtitle}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Sub-bar / Trust Statement */}
        <div className="mt-8 text-center text-xs text-[#8EA7C7] font-semibold flex items-center justify-center gap-2 px-2">
          <Award className="w-3.5 h-3.5 text-[#BEE179] shrink-0" />
          <span>Notarial Deed Escrow · RICS Certified Appraisals · Rigorous SPV Due Diligence</span>
        </div>
      </div>
    </section>
  );
};
