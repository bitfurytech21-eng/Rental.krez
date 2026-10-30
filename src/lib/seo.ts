/**
 * Centralized SEO & Document Head Management Engine
 * 
 * Dynamically manages:
 * - Document title (<title>)
 * - Canonical link (<link rel="canonical">)
 * - Language-specific meta description (<meta name="description">)
 * - OpenGraph metadata (og:title, og:description, og:image, og:url, og:type, og:site_name)
 * - Twitter / X Social Cards (twitter:card, twitter:title, twitter:description, twitter:image)
 * - Dynamic Hreflang alternates (<link rel="alternate" hreflang="...">)
 * - Schema.org JSON-LD structured data (<script type="application/ld+json">)
 */

export interface LocalizedString {
  en: string;
  es?: string;
  fr?: string;
  de?: string;
  [key: string]: string | undefined;
}

export interface RouteSeoDefinition {
  title: LocalizedString;
  description: LocalizedString;
  image: string;
  type?: 'website' | 'article' | 'profile';
  schemaType?: 'RealEstateAgent' | 'FinancialService' | 'WebSite' | 'Article';
}

export interface UpdateSeoOptions {
  path?: string;
  lang?: string;
  title?: string;
  description?: string;
  image?: string;
  type?: 'website' | 'article' | 'profile';
  publishedTime?: string;
  author?: string;
  schemaType?: 'RealEstateAgent' | 'FinancialService' | 'WebSite' | 'Article';
}

const DEFAULT_IMAGE = 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&h=630&q=85';

export const ROUTE_SEO_MAP: Record<string, RouteSeoDefinition> = {
  '/': {
    title: {
      en: "L'Agence Real Estate | Institutional Real Estate & Asset Tokenization",
      es: "L'Agence Real Estate | Inversión Inmobiliaria Institucional y Tokenización",
      fr: "L'Agence Real Estate | Immobilier Institutionnel et Tokenisation d'Actifs",
      de: "L'Agence Real Estate | Institutionelle Immobilien & Tokenisierung",
    },
    description: {
      en: 'Invest in fractionalized luxury European properties built on Solana SPL & Token-2022 standards, ring-fenced SPV custody, and monthly EUR/USDC distributions.',
      es: 'Invierta en propiedades de lujo europeas fraccionadas con estándares Solana SPL y Token-2022, custodia SPV segregada y distribuciones mensuales en EUR/USDC.',
      fr: "Investissez dans l'immobilier de luxe européen fractionné sur Solana SPL & Token-2022, structure SPV étanche et distributions mensuelles en EUR/USDC.",
      de: 'Investieren Sie in fraktionierte europäische Luxusimmobilien auf Solana SPL & Token-2022 Basis, insolvenzsicherer SPV-Verwahrung und monatlichen EUR/USDC-Renditen.',
    },
    image: DEFAULT_IMAGE,
    type: 'website',
    schemaType: 'RealEstateAgent',
  },
  '/trust': {
    title: {
      en: "Institutional Trust Centre & Corporate Registry | L'Agence Real Estate",
      es: "Centro de Confianza Institucional y Registro Mercantil | L'Agence",
      fr: "Centre de Confiance Institutionnel & Registre RCS | L'Agence",
      de: "Institutionelles Trust Centre & Handelsregister | L'Agence",
    },
    description: {
      en: 'Verify corporate registration (SIREN 494 861 560, RCS Paris, VAT FR80494861560), Solana Mainnet program addresses, audit disclosures, and SPV asset safeguards.',
      es: 'Verifique el registro societario (SIREN 494 861 560, RCS París, IVA FR80494861560), direcciones Solana Mainnet, auditorías y custodia SPV.',
      fr: 'Vérifiez l\'immatriculation (SIREN 494 861 560, RCS Paris, TVA FR80494861560), les programmes Solana Mainnet, audits et garanties SPV.',
      de: 'Prüfen Sie Handelsregisterdaten (SIREN 494 861 560, RCS Paris, USt-IdNr. FR80494861560), Solana Mainnet-Adressen und SPV-Sicherheiten.',
    },
    image: DEFAULT_IMAGE,
    type: 'website',
    schemaType: 'FinancialService',
  },
  '/properties': {
    title: {
      en: "Luxury Property Marketplace | L'Agence Real Estate",
      es: "Catálogo de Inmuebles de Lujo | L'Agence Real Estate",
      fr: "Place de Marché Immobilière de Prestige | L'Agence Real Estate",
      de: "Marktplatz für Luxusimmobilien | L'Agence Real Estate",
    },
    description: {
      en: 'Explore exclusive prime European villas, Parisian penthouses, and Madrid estates available for fractional tokenized investment starting at €750.',
      es: 'Explore exclusivas villas europeas, áticos en París y fincas en Madrid disponibles para inversión tokenizada fraccionada desde 750 €.',
      fr: 'Découvrez des villas de prestige, penthouses parisiens et domaines madrilènes disponibles en investissement fractionné tokenisé dès 750 €.',
      de: 'Entdecken Sie exklusive europäische Villen, Pariser Penthäuser und Anwesen in Madrid zur fraktionierten tokenisierten Investition ab 750 €.',
    },
    image: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200&h=630&q=85',
    type: 'website',
    schemaType: 'RealEstateAgent',
  },
  '/insights': {
    title: {
      en: 'Real Estate Dossiers & Market Intelligence | Kretz Intelligence',
      es: 'Dossiers Inmobiliarios e Inteligencia de Mercado | Kretz Intelligence',
      fr: "Dossiers Immobiliers & Enquêtes de Marché | Kretz Intelligence",
      de: 'Immobilien-Dossiers & Marktberichte | Kretz Intelligence',
    },
    description: {
      en: 'In-depth European real estate investigations, quarterly yield barometers, PropTech tokenization blueprints, and regulatory legal analysis.',
      es: 'Investigaciones inmobiliarias en profundidad, barómetro trimestral de rentabilidades, informes de PropTech y análisis regulatorio europeo.',
      fr: 'Grandes enquêtes immobilières européennes, baromètre trimestriel des rendements, tokenisation PropTech et analyses réglementaires approfondies.',
      de: 'Tiefgehende europäische Immobilienanalysen, vierteljährliches Rendite-Barometer, PropTech-Tokenisierung und regulatorische Rechtsanalysen.',
    },
    image: '/assets/aistudio/IMG_7167_9db0efc3.jpeg',
    type: 'article',
    schemaType: 'Article',
  },
  '/wealth': {
    title: {
      en: "Wealth Advisory & Family Office Structuring | L'Agence Real Estate",
      es: "Asesoramiento Patrimonial y Family Office | L'Agence Real Estate",
      fr: "Gestion de Patrimoine & Family Office | L'Agence Real Estate",
      de: "Vermögensberatung & Family Office Strukturierung | L'Agence Real Estate",
    },
    description: {
      en: 'Bespoke wealth structuring, tax-efficient cross-border real estate holdings, and institutional portfolio allocation for high-net-worth families.',
      es: 'Estructuración patrimonial a medida, tenencia inmobiliaria transfronteriza fiscalmente eficiente y asignación institucional para patrimonios elevados.',
      fr: 'Ingénierie patrimoniale sur mesure, détention immobilière transfrontalière fiscalement optimisée et allocation institutionnelle pour family offices.',
      de: 'Maßgeschneiderte Vermögensstrukturierung, steuereffizientes grenzüberschreitendes Immobilien-Holding und institutionelle Allokation.',
    },
    image: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1200&h=630&q=85',
    type: 'website',
    schemaType: 'FinancialService',
  },
  '/agency': {
    title: {
      en: "The Agency & Family Office Advisors | L'Agence Real Estate",
      es: "La Agencia y Asesores de Family Office | L'Agence Real Estate",
      fr: "L'Agence & Conseillers Family Office | L'Agence Real Estate",
      de: "Die Agentur & Family Office Berater | L'Agence Real Estate",
    },
    description: {
      en: 'Meet the team and international advisors bridging high-touch physical luxury real estate brokerage with secure blockchain asset tokenization.',
      es: 'Conozca al equipo y asesores internacionales que unen el corretaje inmobiliario de lujo presencial con la tokenización segura en blockchain.',
      fr: "Rencontrez l'équipe et les conseillers internationaux associant courtage de prestige haute fidélité et tokenisation d'actifs sur blockchain.",
      de: 'Lernen Sie das Team und die internationalen Berater kennen, die erstklassige Luxusimmobilienberatung mit Blockchain-Tokenisierung verbinden.',
    },
    image: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=1200&h=630&q=85',
    type: 'profile',
    schemaType: 'RealEstateAgent',
  },
  '/casos-de-exito': {
    title: {
      en: "Success Stories & Realized Exits | L'Agence Real Estate",
      es: "Casos de Éxito y Desinversiones Realizadas | L'Agence Real Estate",
      fr: "Cas de Succès & Sorties Réalisées | L'Agence Real Estate",
      de: "Erfolgsgeschichten & Realisierte Exits | L'Agence Real Estate",
    },
    description: {
      en: 'Review realized property exits, historical investor distributions, and 15.4% average annualized IRR across trophy European real estate portfolios.',
      es: 'Consulte desinversiones completadas, distribuciones históricas de rentas y un 15,4% de TIR media anualizada en activos trofeo europeos.',
      fr: "Consultez les sorties immobilières réalisées, les distributions locatives historiques et un TRI moyen annualisé de 15,4% sur l'immobilier d'exception.",
      de: 'Prüfen Sie realisierte Exits, historische Ausschüttungen und 15,4% durchschnittlichen annualisierten IRR über europäische Trophäenportfolios.',
    },
    image: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&h=630&q=85',
    type: 'website',
    schemaType: 'RealEstateAgent',
  },
  '/club': {
    title: {
      en: "Club Privé | Exclusive Investor Membership | L'Agence",
      es: "Club Privé | Membresía Exclusiva para Inversores | L'Agence",
      fr: "Club Privé | Adhésion Exclusive d'Investisseurs | L'Agence",
      de: "Club Privé | Exklusive Investoren-Mitgliedschaft | L'Agence",
    },
    description: {
      en: 'Unlock VIP access to off-market private viewings, concierge family office advisory, priority allocation pools, and bespoke luxury experiences.',
      es: 'Acceda en primicia a activos fuera de mercado, asesoramiento concierge de family office, cupos preferentes y experiencias de lujo privadas.',
      fr: "Débloquez l'accès VIP aux opportunités off-market, au concierge family office, aux allocations prioritaires et aux événements privés.",
      de: 'Erhalten Sie VIP-Zugang zu Off-Market-Immobilien, Family Office Concierge-Beratung und bevorzugten Zuteilungspools.',
    },
    image: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=1200&h=630&q=85',
    type: 'website',
    schemaType: 'FinancialService',
  },
  '/news': {
    title: {
      en: "Company News, Broadcasts & Industry Features | L'Agence",
      es: "Noticias Corporativas y Emisiones | L'Agence Real Estate",
      fr: "Actualités, Émissions & Reportages | L'Agence Real Estate",
      de: "Unternehmensnachrichten & Medienberichte | L'Agence",
    },
    description: {
      en: 'Discover official announcements, executive interviews, media features, and industry perspectives examining the future of property investment.',
      es: 'Descubra comunicados oficiales, entrevistas ejecutivas y reportajes sectoriales sobre el futuro de la inversión inmobiliaria.',
      fr: "Découvrez les annonces officielles, interviews et reportages médiatiques analysant l'avenir de l'investissement immobilier.",
      de: 'Erfahren Sie offizielle Mitteilungen, Interviews und Branchenberichte über die Zukunft der Immobilieninvestition.',
    },
    image: 'https://i.ytimg.com/vi/dwmIqvREPz8/hqdefault.jpg',
    type: 'article',
    schemaType: 'Article',
  },
  '/token': {
    title: {
      en: "Solana SPL & Token-2022 Architecture & USDC Settlement | L'Agence",
      es: "Arquitectura Solana SPL / Token-2022 y Liquidación USDC | L'Agence",
      fr: "Architecture Solana SPL / Token-2022 & Règlement USDC | L'Agence",
      de: "Solana SPL & Token-2022 Architektur & USDC-Abwicklung | L'Agence",
    },
    description: {
      en: 'Explore our Solana SPL (TokenkegQfe...) and Token-2022 compliance architecture, Circle USDC Mainnet settlement, and ring-fenced SPV cap-table registry.',
      es: 'Conozca la arquitectura Solana SPL y Token-2022, liquidación mensual en Circle USDC Mainnet y custodia SPV segregada.',
      fr: 'Découvrez notre architecture Solana SPL et Token-2022, les règlements mensuels en USDC Mainnet et le registre SPV.',
      de: 'Erfahren Sie mehr über unsere Solana SPL & Token-2022 Architektur, monatliche USDC-Ausschüttungen und SPV-Verwahrung.',
    },
    image: 'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?auto=format&fit=crop&w=1200&h=630&q=85',
    type: 'website',
    schemaType: 'FinancialService',
  },
  '/investing': {
    title: {
      en: "How It Works | Fractional Tokenization & Legal SPV Custody",
      es: "Cómo Funciona | Tokenización Fraccionada y Custodia SPV Legal",
      fr: "Fonctionnement | Tokenisation Fractionnée & Séquestre SPV Légal",
      de: "So funktioniert es | Fraktionierte Tokenisierung & SPV-Verwahrung",
    },
    description: {
      en: 'Step-by-step tokenization process: property selection, notarial deed recording, independent SPV formation, and monthly automated dividend payouts.',
      es: 'Proceso de tokenización paso a paso: selección de activos, inscripción notarial, constitución de SPV independiente y abono mensual de dividendos.',
      fr: 'Processus pas à pas : sélection d\'actifs, inscription notariée, création de SPV dédiée et versement automatique des dividendes locatifs.',
      de: 'Schritt-für-Schritt-Prozess: Objektauswahl, notarielle Beurkundung, unabhängige SPV-Gründung und monatliche automatische Ausschüttungen.',
    },
    image: 'https://images.unsplash.com/photo-1507089947368-19c1da9775ae?auto=format&fit=crop&w=1200&h=630&q=85',
    type: 'website',
    schemaType: 'FinancialService',
  },
  '/faq': {
    title: {
      en: "FAQ, MiCA Regulatory Compliance & Investor Protection | L'Agence",
      es: "Preguntas Frecuentes, Cumplimiento MiCA y Protección | L'Agence",
      fr: "FAQ, Conformité Réglementaire MiCA & Protection | L'Agence",
      de: "FAQ, MiCA-Regulierungskonformität & Anlegerschutz | L'Agence",
    },
    description: {
      en: 'Frequently asked questions regarding KYC verification, European MiCA regulations, SPV ring-fencing, tax treatment, and secondary liquidity.',
      es: 'Preguntas frecuentes sobre verificación KYC, normativa europea MiCA, custodia SPV segregada, fiscalidad y liquidez secundaria.',
      fr: 'Questions fréquentes sur la vérification KYC, la réglementation européenne MiCA, l\'étanchéité des SPV et la fiscalité.',
      de: 'Häufig gestellte Fragen zu KYC-Verifizierung, europäischer MiCA-Regulierung, SPV-Insolvenzschutz und steuerlicher Behandlung.',
    },
    image: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=1200&h=630&q=85',
    type: 'website',
    schemaType: 'FinancialService',
  },
  '/contact': {
    title: {
      en: "Contact & Institutional Advisory Desk | L'Agence Real Estate",
      es: "Contacto y Mesa de Asesoramiento Institucional | L'Agence",
      fr: "Contact & Bureau de Conseil Institutionnel | L'Agence",
      de: "Kontakt & Institutionelle Beratung | L'Agence Real Estate",
    },
    description: {
      en: 'Connect with our Barcelona and Paris investor relations desk for private consultations, property submissions, and institutional allocations.',
      es: 'Contacte con nuestra mesa de inversores en Barcelona y París para consultas privadas, propuestas de activos y asignaciones institucionales.',
      fr: 'Contactez notre bureau relations investisseurs à Barcelone et Paris pour consultations privées et allocations institutionnelles.',
      de: 'Kontaktieren Sie unsere Anlegerberatung in Barcelona und Paris für persönliche Beratung und institutionelle Allokationen.',
    },
    image: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1200&h=630&q=85',
    type: 'website',
    schemaType: 'RealEstateAgent',
  },
  '/legal': {
    title: {
      en: "Legal Framework, Terms of Service & Privacy | L'Agence",
      es: "Marco Legal, Términos del Servicio y Privacidad | L'Agence",
      fr: "Cadre Juridique, Conditions Générales & Confidentialité | L'Agence",
      de: "Rechtlicher Rahmen, AGB & Datenschutz | L'Agence",
    },
    description: {
      en: 'Comprehensive European legal framework: SPV bylaws, investor protection rules, risk disclosures, MiCA regulatory standing, and privacy policies.',
      es: 'Marco legal europeo completo: estatutos SPV, protección al inversor, advertencias de riesgo, normativa MiCA y política de privacidad.',
      fr: 'Cadre légal européen complet : statuts des SPV, protection des investisseurs, avertissements sur les risques et politique de confidentialité.',
      de: 'Umfassender europäischer Rechtsrahmen: SPV-Satzungen, Anlegerschutz, Risikohinweise, MiCA-Regulierung und Datenschutzrichtlinien.',
    },
    image: 'https://images.unsplash.com/photo-1450133064473-71024230f91b?auto=format&fit=crop&w=1200&h=630&q=85',
    type: 'website',
    schemaType: 'FinancialService',
  },
  '/terms': {
    title: {
      en: "Terms of Service & General Conditions | L'Agence Real Estate",
      es: "Términos del Servicio y Condiciones Generales | L'Agence",
      fr: "Conditions Générales d'Utilisation | L'Agence Real Estate",
      de: "Allgemeine Geschäftsbedingungen | L'Agence Real Estate",
    },
    description: {
      en: 'Official terms of service governing participation in fractional property SPVs, secondary transfer rights, and investor obligations.',
      es: 'Condiciones oficiales que regulan la participación en SPV inmobiliarias fraccionadas, derechos de transferencia y obligaciones.',
      fr: 'Conditions officielles régissant la souscription aux SPV immobilières, les droits de transfert et obligations des investisseurs.',
      de: 'Offizielle AGB für die Beteiligung an fraktionierten Immobilien-SPVs, Übertragungsrechte und Anlegerpflichten.',
    },
    image: 'https://images.unsplash.com/photo-1450133064473-71024230f91b?auto=format&fit=crop&w=1200&h=630&q=85',
    type: 'website',
    schemaType: 'FinancialService',
  },
  '/privacy': {
    title: {
      en: "Privacy Policy & GDPR Data Protection | L'Agence Real Estate",
      es: "Política de Privacidad y Protección de Datos RGPD | L'Agence",
      fr: "Politique de Confidentialité & Protection RGPD | L'Agence",
      de: "Datenschutzerklärung & DSGVO-Schutz | L'Agence Real Estate",
    },
    description: {
      en: 'Detailed European GDPR data privacy notice outlining data handling, AML/KYC encryption safeguards, and investor privacy rights.',
      es: 'Aviso europeo de privacidad RGPD sobre tratamiento de datos, cifrado de seguridad en AML/KYC y derechos del inversor.',
      fr: 'Notice RGPD européenne détaillant le traitement des données, le chiffrement des vérifications AML/KYC et vos droits.',
      de: 'Europäische DSGVO-Datenschutzerklärung über Datenverarbeitung, AML/KYC-Verschlüsselung und Anlegerrechte.',
    },
    image: 'https://images.unsplash.com/photo-1450133064473-71024230f91b?auto=format&fit=crop&w=1200&h=630&q=85',
    type: 'website',
    schemaType: 'FinancialService',
  },
  '/cookies': {
    title: {
      en: "Cookie Policy & ePrivacy Consent | L'Agence Real Estate",
      es: "Política de Cookies y Privacidad | L'Agence Real Estate",
      fr: "Politique de Gestion des Cookies | L'Agence Real Estate",
      de: "Cookie-Richtlinie & Datenschutz | L'Agence Real Estate",
    },
    description: {
      en: 'Detailed cookie governance, session security storage, and EU ePrivacy Directive consent controls on L\'Agence Real Estate.',
      es: 'Gobernanza detallada de cookies, almacenamiento seguro de sesión y controles de consentimiento ePrivacy de la UE.',
      fr: 'Politique détaillée relative aux cookies, sécurité des sessions et gestion du consentement ePrivacy européen.',
      de: 'Detaillierte Cookie-Richtlinie, Sitzungssicherheit und EU-ePrivacy-Einwilligungsverwaltung.',
    },
    image: 'https://images.unsplash.com/photo-1450133064473-71024230f91b?auto=format&fit=crop&w=1200&h=630&q=85',
    type: 'website',
    schemaType: 'FinancialService',
  },
};

/**
 * Updates document head elements in place:
 * - <title>
 * - <link rel="canonical">
 * - <meta name="description">
 * - og:* tags
 * - twitter:* tags
 * - <link rel="alternate" hreflang="...">
 * - <script type="application/ld+json">
 */
export function updatePageSeo(options?: UpdateSeoOptions): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  const currentPath = options?.path || (window.location.hash ? window.location.hash.replace('#', '') : window.location.pathname) || '/';
  const cleanPath = currentPath.split('?')[0].replace(/\/$/, '') || '/';
  const lang = (options?.lang || 'en').toLowerCase().substring(0, 2);

  const matched = ROUTE_SEO_MAP[cleanPath] || ROUTE_SEO_MAP['/'];

  // Resolve localized text or explicit override
  const title = options?.title || matched.title[lang] || matched.title.en;
  const description = options?.description || matched.description[lang] || matched.description.en;
  const image = options?.image || matched.image || DEFAULT_IMAGE;
  const type = options?.type || matched.type || 'website';
  const schemaType = options?.schemaType || matched.schemaType || 'RealEstateAgent';

  // 1. Update Document Title
  document.title = title;

  // 2. Helper to set or create <meta> elements
  const setMetaTag = (attribute: 'name' | 'property', attrValue: string, content: string) => {
    let el = document.querySelector(`meta[${attribute}="${attrValue}"]`) as HTMLMetaElement | null;
    if (!el) {
      el = document.createElement('meta');
      el.setAttribute(attribute, attrValue);
      document.head.appendChild(el);
    }
    el.content = content;
  };

  // 3. Standard Description
  setMetaTag('name', 'description', description);

  // 4. OpenGraph Tags
  setMetaTag('property', 'og:title', title);
  setMetaTag('property', 'og:description', description);
  setMetaTag('property', 'og:type', type);
  setMetaTag('property', 'og:site_name', "L'Agence Real Estate");
  
  const origin = window.location.origin;
  const canonicalUrl = `${origin}${cleanPath === '/' ? '' : cleanPath}`;
  setMetaTag('property', 'og:url', canonicalUrl);

  // Absolute image URL resolution
  const absoluteImageUrl = image.startsWith('http') ? image : `${origin}${image.startsWith('/') ? '' : '/'}${image}`;
  setMetaTag('property', 'og:image', absoluteImageUrl);
  setMetaTag('property', 'og:image:secure_url', absoluteImageUrl);
  setMetaTag('property', 'og:image:width', '1200');
  setMetaTag('property', 'og:image:height', '630');
  setMetaTag('property', 'og:image:alt', title);

  // 5. Twitter / X Cards
  setMetaTag('name', 'twitter:card', 'summary_large_image');
  setMetaTag('name', 'twitter:title', title);
  setMetaTag('name', 'twitter:description', description);
  setMetaTag('name', 'twitter:image', absoluteImageUrl);

  // 6. Dynamic Canonical Link Tag
  let canonicalLink = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
  if (!canonicalLink) {
    canonicalLink = document.createElement('link');
    canonicalLink.rel = 'canonical';
    document.head.appendChild(canonicalLink);
  }
  canonicalLink.href = canonicalUrl;

  // 7. Dynamic Hreflang Tags for Multilingual Indexing
  const supportedLangs = ['en', 'es', 'fr', 'de'];
  
  // Default fallback hreflang
  let defaultHref = document.querySelector('link[rel="alternate"][hreflang="x-default"]') as HTMLLinkElement | null;
  if (!defaultHref) {
    defaultHref = document.createElement('link');
    defaultHref.rel = 'alternate';
    defaultHref.setAttribute('hreflang', 'x-default');
    document.head.appendChild(defaultHref);
  }
  defaultHref.href = canonicalUrl;

  supportedLangs.forEach((l) => {
    let hrefTag = document.querySelector(`link[rel="alternate"][hreflang="${l}"]`) as HTMLLinkElement | null;
    if (!hrefTag) {
      hrefTag = document.createElement('link');
      hrefTag.rel = 'alternate';
      hrefTag.setAttribute('hreflang', l);
      document.head.appendChild(hrefTag);
    }
    hrefTag.href = `${canonicalUrl}?lang=${l}`;
  });

  // 8. Schema.org JSON-LD Structured Data
  let ldScript = document.getElementById('schema-json-ld') as HTMLScriptElement | null;
  if (!ldScript) {
    ldScript = document.createElement('script');
    ldScript.id = 'schema-json-ld';
    ldScript.type = 'application/ld+json';
    document.head.appendChild(ldScript);
  }

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': schemaType,
    'name': "L'Agence Real Estate",
    'url': canonicalUrl,
    'logo': `${origin}/assets/aistudio/IMG_7234_bd44519a.jpeg`,
    'image': absoluteImageUrl,
    'description': description,
    'headline': title,
    'address': {
      '@type': 'PostalAddress',
      'streetAddress': 'Carrer de Pau Claris, 139, Eixample',
      'addressLocality': 'Barcelona',
      'postalCode': '08009',
      'addressCountry': 'ES'
    },
    'geo': {
      '@type': 'GeoCoordinates',
      'latitude': 41.3934,
      'longitude': 2.1648
    },
    'telephone': '+34910849210',
    'taxID': '494 861 560',
    'vatID': 'FR80494861560',
    'priceRange': '€€€€'
  };

  ldScript.textContent = JSON.stringify(structuredData);
}
