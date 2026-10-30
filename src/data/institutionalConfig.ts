export type ImplementationStatus =
  | 'COMPLETED'
  | 'PARTIALLY COMPLETED'
  | 'BLOCKED'
  | 'NOT IMPLEMENTED';

export interface CompanyRegistrationData {
  operatingBrand: string;
  legalEntityLabel: string;
  legalForm: string;
  siren: string;
  rcs: string;
  siret: string;
  vatIdentificationNumber: string;
  incorporationJurisdiction: string;
  parisOffice: string;
  barcelonaOffice: string;
  primaryEmail: string;
  complianceEmail: string;
  websiteUrl: string;
}

export const COMPANY_REGISTRATION: CompanyRegistrationData = {
  operatingBrand: "L'Agence Real Estate · Kretz & De Spain",
  legalEntityLabel: "L'Agence Real Estate (LLC)",
  legalForm: 'LLC (Private Limited Company)',
  siren: '494 861 560',
  rcs: 'Paris, 494 861 560 R.C.S.',
  siret: '494 861 560 00030',
  vatIdentificationNumber: 'FR80494861560',
  incorporationJurisdiction: 'France (Paris Commercial Registry) & European Union Operations',
  parisOffice: '24 Rue du Faubourg Saint-Honoré, 75008 Paris, France',
  barcelonaOffice: 'Carrer de Pau Claris, 139, Eixample, 08009 Barcelona, Spain',
  primaryEmail: 'info@kretz.site',
  complianceEmail: 'legal@kretz.site',
  websiteUrl: 'https://kretzdespain.com',
};

export interface SolanaInfrastructureItem {
  id: 'usdc-mint' | 'spl-token-program' | 'token-2022-program';
  name: string;
  shortLabel: string;
  address: string;
  cluster: 'mainnet-beta';
  category: 'Settlement Stablecoin Mint' | 'Canonical Token Program' | 'Compliance Extensions Program';
  verificationStatus: 'VERIFIED_MAINNET';
  auditStatus: string;
  statedPurposes: string[];
  architecturalNotice: string;
  explorerUrl: string;
  solscanUrl: string;
}

export const SOLANA_INFRASTRUCTURE_REGISTRY: SolanaInfrastructureItem[] = [
  {
    id: 'usdc-mint',
    name: 'USDC Stablecoin Mint (Solana Mainnet)',
    shortLabel: 'USDC Mint',
    address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    cluster: 'mainnet-beta',
    category: 'Settlement Stablecoin Mint',
    verificationStatus: 'VERIFIED_MAINNET',
    auditStatus: 'Canonical Circle USD Coin SPL Mint on Solana Mainnet-Beta',
    statedPurposes: [
      'Stablecoin used for purchasing fractional property investment interests.',
      'Settlement currency intended for automated monthly rental distribution payments.',
    ],
    architecturalNotice:
      'Important Distinction: This address is the official Solana USDC stablecoin mint. It is NOT a property-share token mint or a bespoke rental distribution smart contract.',
    explorerUrl:
      'https://explorer.solana.com/address/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    solscanUrl:
      'https://solscan.io/token/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  },
  {
    id: 'spl-token-program',
    name: 'Solana SPL Token Program',
    shortLabel: 'SPL Token Program',
    address: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
    cluster: 'mainnet-beta',
    category: 'Canonical Token Program',
    verificationStatus: 'VERIFIED_MAINNET',
    auditStatus: 'Core Solana Labs Protocol Program (Multiple Independent Audits)',
    statedPurposes: [
      'On-chain SPL token account balance tracking and verification.',
      'Standard token minting and supply accounting.',
      'Peer-to-peer and treasury token transfers.',
      'Property investment token operations where standard SPL compatibility applies.',
    ],
    architecturalNotice:
      'Core Solana runtime program governing fungible SPL assets, including Circle USDC token accounts.',
    explorerUrl:
      'https://explorer.solana.com/address/TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
    solscanUrl:
      'https://solscan.io/account/TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
  },
  {
    id: 'token-2022-program',
    name: 'Solana Token-2022 (Token Extensions) Program',
    shortLabel: 'Token-2022 Program',
    address: 'TokenzQdBNbLqP5VEhdKAS6EPFLC1PHnBqCXEPpxuEb',
    cluster: 'mainnet-beta',
    category: 'Compliance Extensions Program',
    verificationStatus: 'VERIFIED_MAINNET',
    auditStatus: 'Core Solana Labs Token Extensions Program (Audited Protocol Standard)',
    statedPurposes: [
      'Compliance-related token extensions for regulated real-world asset (RWA) tokens.',
      'Programmatic transfer restrictions between KYC-verified investor wallets.',
      'Custom transfer hooks enforcing investor eligibility and jurisdiction checks.',
      'Administrative freeze, thaw, and allowlist safeguards where configured per SPV.',
    ],
    architecturalNotice:
      'Used as the target programmatic compliance standard when deploying restricted per-property SPV token mints.',
    explorerUrl:
      'https://explorer.solana.com/address/TokenzQdBNbLqP5VEhdKAS6EPFLC1PHnBqCXEPpxuEb',
    solscanUrl:
      'https://solscan.io/account/TokenzQdBNbLqP5VEhdKAS6EPFLC1PHnBqCXEPpxuEb',
  },
];

export interface LegalDocumentSection {
  heading: string;
  paragraphs: string[];
  bullets?: string[];
}

export interface LegalDocumentRecord {
  id: string;
  slug: string;
  number: string;
  title: string;
  category: 'Platform & Governance' | 'Investment & SPV Instruments' | 'Compliance & Safeguarding';
  version: string;
  effectiveDate: string;
  verificationState: 'published_policy' | 'counsel_review_required' | 'spv_template';
  statusBadge: string;
  implementationStatus: ImplementationStatus;
  summary: string;
  sections: LegalDocumentSection[];
}

export const LEGAL_DOCUMENTATION_CENTRE: LegalDocumentRecord[] = [
  {
    id: 'doc-01-terms',
    slug: 'terms-and-conditions',
    number: '01',
    title: 'Terms and Conditions',
    category: 'Platform & Governance',
    version: 'v2.4',
    effectiveDate: '2026-03-01',
    verificationState: 'published_policy',
    statusBadge: 'Published Platform Terms · Subject to Final Jurisdiction Sign-off',
    implementationStatus: 'PARTIALLY COMPLETED',
    summary:
      'General conditions governing investor account registration, platform access, wallet linking, marketplace browsing, and electronic execution on kretzdespain.com.',
    sections: [
      {
        heading: '1. Corporate Operator & Scope of Service',
        paragraphs: [
          `These Terms and Conditions govern access to and use of the digital real estate investment platform operated at https://kretzdespain.com under the corporate registration SIREN ${COMPANY_REGISTRATION.siren}, RCS ${COMPANY_REGISTRATION.rcs}, SIRET ${COMPANY_REGISTRATION.siret}, VAT ${COMPANY_REGISTRATION.vatIdentificationNumber}, structured as an ${COMPANY_REGISTRATION.legalForm}.`,
          'The platform provides digital investor onboarding, property data-room access, double-entry subscription accounting, and Solana wallet connectivity for fractional real estate offerings structured via dedicated Special Purpose Vehicles (SPVs).',
        ],
      },
      {
        heading: '2. Account Eligibility & Security Responsibilities',
        paragraphs: [
          'Access to transactional features is strictly restricted to natural persons aged 18 years or older with full legal capacity, or duly incorporated legal entities represented by an authorized signatory, who successfully complete mandatory AML/KYC verification.',
        ],
        bullets: [
          'Investors must maintain accurate contact, tax residency, and beneficial ownership records at all times.',
          'Self-custodial Solana wallet private keys (Phantom, Solflare, Backpack) remain under the sole responsibility of the investor; the platform never requests seed phrases or private keys.',
          'Administrative endpoints are strictly segregated from public investor sessions and protected by role-based access control and rate limiting.',
        ],
      },
      {
        heading: '3. No Unsolicited Financial or Tax Advice',
        paragraphs: [
          'Property dossiers, projected net rental yields, sensitivity stress tests, and financial pipeline visualisations published on the platform are provided for informational and underwriting transparency purposes only and do not constitute personalized investment, legal, or fiscal advice.',
        ],
      },
    ],
  },
  {
    id: 'doc-02-privacy',
    slug: 'privacy-policy',
    number: '02',
    title: 'Privacy Policy',
    category: 'Platform & Governance',
    version: 'v2.2',
    effectiveDate: '2026-03-01',
    verificationState: 'published_policy',
    statusBadge: 'GDPR Privacy Notice Active',
    implementationStatus: 'COMPLETED',
    summary:
      'Explains how personal, identity, financial, and blockchain public-key data are collected, processed, retained, and protected under EU Regulation 2016/679 (GDPR).',
    sections: [
      {
        heading: '1. Data Controller Identification',
        paragraphs: [
          `Personal data collected through this platform is controlled by the operating entity registered under SIREN ${COMPANY_REGISTRATION.siren} (${COMPANY_REGISTRATION.rcs}, SIRET ${COMPANY_REGISTRATION.siret}, VAT ${COMPANY_REGISTRATION.vatIdentificationNumber}). Privacy inquiries may be directed to ${COMPANY_REGISTRATION.complianceEmail} or ${COMPANY_REGISTRATION.primaryEmail}.`,
        ],
      },
      {
        heading: '2. Categories of Personal Data Processed',
        paragraphs: [
          'We adhere to strict GDPR data minimization principles and collect only data necessary for regulatory compliance, contract execution, and portfolio servicing:',
        ],
        bullets: [
          'Identity & KYC Data: Full legal name, nationality, date of birth, government-issued ID/passport scan, and proof of residential address.',
          'Financial & Settlement Data: SEPA IBAN details, deposit receipts, transaction ledger history, and whitelisted public Solana wallet addresses.',
          'Technical Telemetry: Session authentication identifiers, IP rate-limiting logs, and Cloudflare Turnstile anti-bot verification tokens.',
        ],
      },
      {
        heading: '3. Data Subject Rights & Statutory Retention',
        paragraphs: [
          'Under GDPR Articles 15–22, investors have the right to request access, rectification, portability, or restriction of processing. Note that AML/KYC records and financial ledger entries are subject to a mandatory 5-to-10-year statutory retention period under EU Anti-Money Laundering Directives and cannot be erased while statutory retention applies.',
        ],
      },
    ],
  },
  {
    id: 'doc-03-cookies',
    slug: 'cookie-policy',
    number: '03',
    title: 'Cookie Policy',
    category: 'Platform & Governance',
    version: 'v1.9',
    effectiveDate: '2026-03-01',
    verificationState: 'published_policy',
    statusBadge: 'Consent Banner & Storage Controls Active',
    implementationStatus: 'COMPLETED',
    summary:
      'Details essential session storage, security anti-bot tokens, language preferences, and optional customer-support widget cookies.',
    sections: [
      {
        heading: '1. Strictly Necessary Cookies & Local Storage',
        paragraphs: [
          'The platform utilizes essential browser storage mechanisms required for authentication continuity, CSRF/bot protection, and user interface preferences. These cannot be disabled without breaking core portal functionality.',
        ],
        bullets: [
          'Authentication & Session State: Encrypted bearer tokens and session identifiers maintaining secure investor portal access.',
          'Security & Bot Mitigation: Cloudflare Turnstile challenge tokens protecting login, registration, and contact endpoints.',
          'Interface Preferences: Selected display language, cookie consent acknowledgement, and dashboard theme preference (light/dark).',
        ],
      },
      {
        heading: '2. Client Support & Optional Functional Scripts',
        paragraphs: [
          'On public and investor pages (explicitly excluding isolated administrative routes), Smartsupp live chat may store functional session identifiers to preserve conversation continuity with our Investor Relations Desk. Visitors can manage consent directly via the platform Cookie Consent Banner.',
        ],
      },
    ],
  },
  {
    id: 'doc-04-risk',
    slug: 'risk-disclosure-statement',
    number: '04',
    title: 'Risk Disclosure Statement',
    category: 'Investment & SPV Instruments',
    version: 'v2.5',
    effectiveDate: '2026-03-01',
    verificationState: 'published_policy',
    statusBadge: 'Mandatory Pre-Subscription Disclosure',
    implementationStatus: 'COMPLETED',
    summary:
      'Comprehensive warning covering capital loss risk, real estate illiquidity, tenant vacancy, regulatory evolution, smart-contract execution, and stablecoin peg risks.',
    sections: [
      {
        heading: '1. Capital Risk & Absence of Guaranteed Yield',
        paragraphs: [
          'Investing in fractionalized real estate SPVs and digital tokens involves material risk, including the partial or total loss of invested capital. Target rental yields and projected IRR figures are underwriting estimates based on current market assumptions and are never guaranteed.',
        ],
      },
      {
        heading: '2. Illiquidity & Secondary Market Constraints',
        paragraphs: [
          'Real estate is an inherently medium-to-long-term asset class. Although tokenisation facilitates fractional transferability among whitelisted KYC-verified investors, there is no guarantee of an active secondary market, immediate counterparty demand, or early redemption prior to SPV asset sale.',
        ],
      },
      {
        heading: '3. Blockchain, Smart Contract & Stablecoin Risks',
        paragraphs: [
          `Where settlements or distributions utilize Solana infrastructure—including Circle USDC (${SOLANA_INFRASTRUCTURE_REGISTRY[0].address}), the SPL Token Program (${SOLANA_INFRASTRUCTURE_REGISTRY[1].address}), or Token-2022 extensions (${SOLANA_INFRASTRUCTURE_REGISTRY[2].address})—investors are exposed to network congestion, stablecoin reserve/de-peg risk, regulatory transfer restrictions, and irreversible loss if self-custody wallet keys are compromised.`,
        ],
      },
    ],
  },
  {
    id: 'doc-05-investment-agreement',
    slug: 'investment-agreement',
    number: '05',
    title: 'Investment Agreement',
    category: 'Investment & SPV Instruments',
    version: 'v3.0',
    effectiveDate: '2026-03-01',
    verificationState: 'spv_template',
    statusBadge: 'Executable Per-Position SPV Contract Template · Counsel Review Recommended',
    implementationStatus: 'PARTIALLY COMPLETED',
    summary:
      'Master participatory subscription contract generated for each property allocation, recording economic rights, cost basis, SPV vehicle reference, and payout Waterfall.',
    sections: [
      {
        heading: '1. Contractual Object & SPV Ring-Fencing',
        paragraphs: [
          'Each Investment Agreement evidences the investor’s subscription to fractional economic participation units linked to a specific, ring-fenced Special Purpose Vehicle (SPV) holding title to the designated real estate asset.',
          'No cross-collateralization exists between separate property SPVs: liabilities or vacancies in one property do not encumber other offerings on the platform.',
        ],
      },
      {
        heading: '2. Net Rental Waterfall & Exit Proceeds',
        paragraphs: [
          'Holders are entitled to their exact pro-rata share of Net Distributable Rental Income—defined as gross collected tenant rent minus municipal property taxes, building insurance, property management fees, SPV accounting costs, and statutory maintenance reserve contributions—plus pro-rata net capital proceeds upon notarized property disposal.',
        ],
      },
      {
        heading: '3. Execution & Per-Deal Notarial Annexes',
        paragraphs: [
          'Digital execution within the Investor Portal generates a downloadable, printable agreement certificate with unique ledger hash and certificate ID. For live public capital raises, each SPV offering annex requires final local legal counsel sign-off and notarial deed linkage.',
        ],
      },
    ],
  },
  {
    id: 'doc-06-property-docs',
    slug: 'property-investment-documentation',
    number: '06',
    title: 'Property Investment Documentation',
    category: 'Investment & SPV Instruments',
    version: 'v2.1',
    effectiveDate: '2026-03-01',
    verificationState: 'spv_template',
    statusBadge: 'Standardized Offering Dossier Specification',
    implementationStatus: 'PARTIALLY COMPLETED',
    summary:
      'Defines the mandatory due-diligence data room package required before any property offering is approved for public investor subscription.',
    sections: [
      {
        heading: '1. Mandatory Data-Room Components',
        paragraphs: [
          'Every property listed on the marketplace is structured around four standardized documentary pillars inspectable from the Property Detail View:',
        ],
        bullets: [
          'Legal Pillar: SPV incorporation articles, cadastral registry extract, and title encumbrance certificate.',
          'Valuation Pillar: Independent RICS-methodology market appraisal and comparable transaction benchmark.',
          'Technical Pillar: Architectural floor-area audit, energy performance certificate (EPC/DPE), and refurbishment budget.',
          'Financial Pillar: Gross-to-net rental model, fee schedule, and 3-scenario sensitivity analysis (Base, Downside, Vacancy Stress Test).',
        ],
      },
      {
        heading: '2. Administrative Approval Gate',
        paragraphs: [
          'Properties remain in off-market administrative custody and cannot be accessed by non-admin visitors until explicitly assigned an investment function and approved for frontend publication.',
        ],
      },
    ],
  },
  {
    id: 'doc-07-tokenholder-rights',
    slug: 'tokenholder-rights-and-obligations',
    number: '07',
    title: 'Tokenholder Rights and Obligations',
    category: 'Investment & SPV Instruments',
    version: 'v2.0',
    effectiveDate: '2026-03-01',
    verificationState: 'counsel_review_required',
    statusBadge: 'Governance Charter · Subject to Per-SPV Prospectus Approval',
    implementationStatus: 'PARTIALLY COMPLETED',
    summary:
      'Specifies economic distribution rights, informational reporting, governance consultation thresholds, and compliance transfer restrictions attached to SPV tokens.',
    sections: [
      {
        heading: '1. Economic & Informational Rights',
        paragraphs: [
          'Each verified unit/token represents a fixed fractional economic claim on a specific SPV’s net rental cashflows and net liquidation proceeds, accompanied by monthly ledger statements and annual fiscal summaries.',
          `Important Technical Clarification: Holding USDC (${SOLANA_INFRASTRUCTURE_REGISTRY[0].address}) in a connected wallet does NOT confer property ownership; USDC is solely the payment and distribution stablecoin. Property rights attach exclusively to recorded SPV unit allocations and designated SPV property tokens.`,
        ],
      },
      {
        heading: '2. Transfer Restrictions & Token-2022 Allowlisting',
        paragraphs: [
          `To preserve European securities and AML compliance, property tokens are designed around Solana Token-2022 (${SOLANA_INFRASTRUCTURE_REGISTRY[2].address}) transfer restrictions. Tokenholders may only transfer economic units to counterparties whose identities and Solana addresses have been KYC-whitelisted on the platform registry.`,
        ],
      },
      {
        heading: '3. Investor Obligations',
        paragraphs: [
          'Tokenholders must promptly update tax residency changes, refrain from pledging restricted SPV tokens to unverified smart-contract protocols, and comply with applicable local capital-gains and rental-income tax reporting.',
        ],
      },
    ],
  },
  {
    id: 'doc-08-subscription-redemption',
    slug: 'subscription-and-redemption-terms',
    number: '08',
    title: 'Subscription and Redemption Terms',
    category: 'Investment & SPV Instruments',
    version: 'v2.1',
    effectiveDate: '2026-03-01',
    verificationState: 'published_policy',
    statusBadge: 'Settlement & Redemption Mechanics Published',
    implementationStatus: 'PARTIALLY COMPLETED',
    summary:
      'Governs minimum subscription tickets, EUR SEPA and Solana USDC funding settlement, cooling-off rules, P2P bulletin transfers, and maturity redemptions.',
    sections: [
      {
        heading: '1. Primary Subscription Settlement',
        paragraphs: [
          'Minimum primary investment subscriptions start at €750 (or the offering-specific minimum stated on the Property Detail page). Investors may fund their custody wallet via SEPA EUR bank wire (verified against uploaded payment proof) or compatible digital asset settlement.',
        ],
      },
      {
        heading: '2. Distribution Currency & Cadence',
        paragraphs: [
          `Net rental distributions are calculated pro-rata according to settled unit holdings on the record date and credited monthly (or quarterly where specified in the property schedule) to the investor’s platform ledger, with settlement support for EUR SEPA withdrawals and Solana USDC (${SOLANA_INFRASTRUCTURE_REGISTRY[0].address}).`,
        ],
      },
      {
        heading: '3. Redemption & Maturity Liquidation',
        paragraphs: [
          'Uninvested wallet cash balances may be withdrawn upon administrative compliance verification. Invested SPV property units are redeemed automatically at SPV maturity/asset sale, or earlier solely if matched with an eligible verified buyer on a secondary transfer desk.',
        ],
      },
    ],
  },
  {
    id: 'doc-09-aml-kyc',
    slug: 'aml-kyc-policy',
    number: '09',
    title: 'AML/KYC Policy',
    category: 'Compliance & Safeguarding',
    version: 'v2.3',
    effectiveDate: '2026-03-01',
    verificationState: 'published_policy',
    statusBadge: 'EU AMLD5 / AMLD6 Screening Protocol',
    implementationStatus: 'PARTIALLY COMPLETED',
    summary:
      'Anti-Money Laundering, Counter-Terrorist Financing, Politically Exposed Person (PEP) screening, sanctions filtering, and wallet-allowlisting framework.',
    sections: [
      {
        heading: '1. Mandatory Customer Due Diligence (CDD)',
        paragraphs: [
          'In accordance with EU Directives (EU) 2018/843 (AMLD5) and French/Spanish AML regulations, no investor may execute property subscriptions or withdraw rental distributions prior to identity verification.',
        ],
        bullets: [
          'Natural Persons: Valid passport or EU national identity card, biometric liveness/selfie check where required, and proof of address dated within 90 days.',
          'Corporate / Family Office Entities: Certificate of incorporation (Kbis / Nota Simple), articles of association, register of Ultimate Beneficial Owners (UBOs holding ≥25%), and signatory mandate.',
          'Enhanced Due Diligence (EDD): Source-of-wealth and source-of-funds documentation for high-value allocations or PEP-flagged applicants.',
        ],
      },
      {
        heading: '2. Blockchain Wallet Screening & Sanctions Compliance',
        paragraphs: [
          'Whitelisted Solana wallet addresses are tied 1:1 to verified investor profiles. Subscriptions and withdrawals involving OFAC, UN, EU, or French Direction Générale du Trésor sanctioned jurisdictions or flagged illicit wallet clusters are strictly rejected.',
        ],
      },
    ],
  },
  {
    id: 'doc-10-data-protection',
    slug: 'data-protection-policy',
    number: '10',
    title: 'Data Protection Policy',
    category: 'Compliance & Safeguarding',
    version: 'v2.0',
    effectiveDate: '2026-03-01',
    verificationState: 'published_policy',
    statusBadge: 'Technical & Organisational Safeguards Active',
    implementationStatus: 'COMPLETED',
    summary:
      'Internal technical and organisational security standards under GDPR Article 32 covering encryption, access isolation, audit logging, and incident response.',
    sections: [
      {
        heading: '1. Architectural Isolation & Least-Privilege Access',
        paragraphs: [
          'Administrative authentication and compliance review consoles are strictly isolated from public and investor UI flows, guarded by dedicated session tokens, failed-attempt lockouts, IP rate limiters, and immutable audit trail logging.',
        ],
      },
      {
        heading: '2. Cryptographic & Transport Security',
        paragraphs: [
          'All client-server communications are transmitted over TLS/HTTPS. API secrets, SMTP/Resend credentials, and administrative tokens reside exclusively in server-side environment groups and are never exposed in client bundles.',
        ],
      },
      {
        heading: '3. Breach Notification Protocol',
        paragraphs: [
          'In the event of a personal data breach posing a risk to investor rights and freedoms, our compliance team notifies the competent supervisory authority (CNIL / AEPD) within 72 hours in accordance with GDPR Articles 33 and 34.',
        ],
      },
    ],
  },
  {
    id: 'doc-11-complaints',
    slug: 'complaints-and-dispute-resolution',
    number: '11',
    title: 'Complaints and Dispute Resolution Procedure',
    category: 'Compliance & Safeguarding',
    version: 'v1.8',
    effectiveDate: '2026-03-01',
    verificationState: 'published_policy',
    statusBadge: 'Escalation SLA & Mediation Procedure Active',
    implementationStatus: 'COMPLETED',
    summary:
      'Step-by-step investor grievance filing, acknowledgement timelines, executive compliance review, mediation avenues, and governing court jurisdiction.',
    sections: [
      {
        heading: '1. Filing a Formal Investor Complaint',
        paragraphs: [
          `Investors may submit formal complaints free of charge via the authenticated Investor Portal Support Desk or by written notice to ${COMPANY_REGISTRATION.complianceEmail} / ${COMPANY_REGISTRATION.primaryEmail}, quoting their account email and transaction or certificate reference.`,
        ],
      },
      {
        heading: '2. Investigation & Response Timelines',
        paragraphs: [
          'Every complaint follows a structured three-stage escalation track:',
        ],
        bullets: [
          'Stage 1 — Written Acknowledgement: Issued within 5 business days of receipt with a unique ticket reference.',
          'Stage 2 — Compliance Investigation: Independent review of ledger records, payment receipts, and SPV documentation within 30 calendar days.',
          'Stage 3 — Final Written Determination: Issued within a maximum of 60 calendar days, detailing remedial actions or external mediation options.',
        ],
      },
      {
        heading: '3. Governing Law & Competent Jurisdiction',
        paragraphs: [
          `Platform governance matters relating to the corporate entity (${COMPANY_REGISTRATION.rcs}) are governed by French law, while property-level real rights follow the lex rei sitae of the underlying SPV asset (France or Spain). Unresolved disputes may be referred to mediation or the competent courts of Paris or Barcelona in accordance with mandatory consumer and investor protection statutes.`,
        ],
      },
    ],
  },
  {
    id: 'doc-12-custody',
    slug: 'custody-and-asset-safeguarding',
    number: '12',
    title: 'Custody and Asset Safeguarding Information',
    category: 'Compliance & Safeguarding',
    version: 'v2.2',
    effectiveDate: '2026-03-01',
    verificationState: 'published_policy',
    statusBadge: 'Dual Real-World SPV & Self-Custody Solana Model',
    implementationStatus: 'PARTIALLY COMPLETED',
    summary:
      'Explains how physical real estate title deeds, fiat subscription balances, and Solana digital wallet credentials are segregated and safeguarded.',
    sections: [
      {
        heading: '1. Physical Real Estate Title Safeguarding (Bankruptcy Remoteness)',
        paragraphs: [
          `Real estate assets are held inside dedicated, asset-specific Special Purpose Vehicles rather than on the operating balance sheet of ${COMPANY_REGISTRATION.legalEntityLabel} (SIREN ${COMPANY_REGISTRATION.siren}). In the hypothetical insolvency of the technology operator, underlying property titles remain legally ring-fenced for SPV unitholders.`,
        ],
      },
      {
        heading: '2. Fiat Treasury & Escrow Reconciliation',
        paragraphs: [
          'EUR bank transfers and payment settlements undergo dual-entry ledger recording and administrative proof-of-payment reconciliation prior to wallet credit or external IBAN disbursement.',
        ],
      },
      {
        heading: '3. Non-Custodial Solana Wallet Architecture',
        paragraphs: [
          `The platform integrates non-custodial Solana wallet extensions (Phantom, Solflare, Backpack) via Ed25519 cryptographic ownership proofs and read-only JSON-RPC balance verification. Investors retain full sovereignty over their private keys when interacting with Solana SPL (${SOLANA_INFRASTRUCTURE_REGISTRY[1].address}), Token-2022 (${SOLANA_INFRASTRUCTURE_REGISTRY[2].address}), and USDC (${SOLANA_INFRASTRUCTURE_REGISTRY[0].address}).`,
        ],
      },
    ],
  },
];

export interface TrustVerificationItem {
  id: string;
  category:
    | 'Corporate & Regulatory'
    | 'Blockchain & Smart Contracts'
    | 'Custody, Security & Protection';
  title: string;
  status: ImplementationStatus;
  verificationBadge: string;
  detail: string;
  referenceValue?: string;
  externalUrl?: string;
  internalRoute?: string;
}

export const TRUST_CENTRE_ITEMS: TrustVerificationItem[] = [
  {
    id: 'trust-corp-reg',
    category: 'Corporate & Regulatory',
    title: 'Corporate Registration Identity (SIREN / RCS / SIRET / VAT)',
    status: 'COMPLETED',
    verificationBadge: 'Supplied Registry Data Integrated',
    detail:
      'SIREN 494 861 560 · RCS Paris, 494 861 560 R.C.S. · SIRET 494 861 560 00030 · VAT FR80494861560 · Legal form: LLC (Private Limited Company). Published consistently across Legal Centre, Trust Centre, Footer, and Schema.org metadata.',
    referenceValue: 'SIREN 494 861 560 · VAT FR80494861560',
    internalRoute: '/legal',
  },
  {
    id: 'trust-legal-centre',
    category: 'Corporate & Regulatory',
    title: '12-Document Legal & Investment Documentation Centre',
    status: 'PARTIALLY COMPLETED',
    verificationBadge: '12 Structured Policies Live · Pending Local Counsel Sign-Off',
    detail:
      'All 12 required governance, risk, SPV agreement, tokenholder, subscription/redemption, AML/KYC, GDPR, dispute, and custody documents are organized, searchable, and printable. Final binding public issuance requires external legal counsel sign-off per jurisdiction.',
    internalRoute: '/legal',
  },
  {
    id: 'trust-reg-disclosure',
    category: 'Corporate & Regulatory',
    title: 'Regulatory Licensing & Prospectus Disclosures (AMF / CNMV / MiCA)',
    status: 'BLOCKED',
    verificationBadge: 'Requires External Regulatory Filing / CASP-ECSP Licence Verification',
    detail:
      'Platform implements technical compliance controls (KYC gates, risk warnings, SPV ring-fencing disclosures). Formal regulatory registration numbers (e.g. PSAN/CASP or ECSP crowdfunding authorisation) must be supplied by external legal counsel before claiming licensed status.',
    internalRoute: '/legal?doc=risk-disclosure-statement',
  },
  {
    id: 'trust-brand-auth',
    category: 'Corporate & Regulatory',
    title: 'Brand Authorisation & Commercial Mandate Evidence',
    status: 'BLOCKED',
    verificationBadge: 'Requires Signed Brand / Trademark Authorisation Upload',
    detail:
      'Corporate registry identifiers (SIREN 494 861 560) are displayed transparently. Signed trademark licensing or cross-border brand authorisation certificates must be provided by executive management for public verification.',
    internalRoute: '/contact',
  },
  {
    id: 'trust-prop-verification',
    category: 'Corporate & Regulatory',
    title: 'Property Verification, RICS Basis & Cadastral Data Rooms',
    status: 'PARTIALLY COMPLETED',
    verificationBadge: 'Data Room Architecture Live · Notarial Deeds Per Live Deal',
    detail:
      'Marketplace enforces admin approval gates, SPV entity metadata, sensitivity stress-test models, and downloadable dossier views. Live public capital raises require uploading notarized title deeds and third-party RICS PDFs per property.',
    internalRoute: '/properties',
  },
  {
    id: 'trust-usdc-mint',
    category: 'Blockchain & Smart Contracts',
    title: 'Solana USDC Stablecoin Mint Integration',
    status: 'COMPLETED',
    verificationBadge: 'Verified Canonical Mainnet Mint',
    detail:
      'Integrated official Circle USDC Mint on Solana Mainnet-Beta for subscription and rental distribution reference. Explicitly distinguished from property-share tokens and distribution contracts.',
    referenceValue: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    externalUrl:
      'https://explorer.solana.com/address/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  },
  {
    id: 'trust-spl-program',
    category: 'Blockchain & Smart Contracts',
    title: 'Solana SPL Token Program Integration',
    status: 'COMPLETED',
    verificationBadge: 'Canonical Solana Mainnet Program',
    detail:
      'Integrated canonical Solana SPL Token Program for live RPC balance/account verification, Explorer linking, and standard SPL token operations.',
    referenceValue: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
    externalUrl:
      'https://explorer.solana.com/address/TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
  },
  {
    id: 'trust-token2022-program',
    category: 'Blockchain & Smart Contracts',
    title: 'Solana Token-2022 Compliance Extensions Program',
    status: 'COMPLETED',
    verificationBadge: 'Canonical Solana Mainnet Program',
    detail:
      'Integrated canonical Solana Token-2022 Program supporting compliance extensions (transfer hooks, allowlists, freeze authorities) for regulated SPV issuance.',
    referenceValue: 'TokenzQdBNbLqP5VEhdKAS6EPFLC1PHnBqCXEPpxuEb',
    externalUrl:
      'https://explorer.solana.com/address/TokenzQdBNbLqP5VEhdKAS6EPFLC1PHnBqCXEPpxuEb',
  },
  {
    id: 'trust-spv-contracts',
    category: 'Blockchain & Smart Contracts',
    title: 'Bespoke Per-Property SPV Mints & Automated Distribution Contracts',
    status: 'BLOCKED',
    verificationBadge: 'Pending Mainnet SPV Mint Deployment & Treasury Signer Keys',
    detail:
      'While canonical Solana programs and wallet RPC verification are live, bespoke per-property Token-2022 mints and automated on-chain USDC distribution vaults require Mainnet deployment keys and notarized SPV closing per property.',
    internalRoute: '/token',
  },
  {
    id: 'trust-audit-reports',
    category: 'Blockchain & Smart Contracts',
    title: 'Smart-Contract Security Audit Reports',
    status: 'BLOCKED',
    verificationBadge: 'Core Solana Programs Audited · Custom SPV Audit Pending',
    detail:
      'SPL Token and Token-2022 are battle-tested, publicly audited Solana Labs protocol programs. No custom Anchor/Rust distribution contract audit certificate is claimed until an independent security firm audits deployed bespoke contracts.',
    internalRoute: '/token',
  },
  {
    id: 'trust-security',
    category: 'Custody, Security & Protection',
    title: 'Platform Security, Admin Isolation & Bot Protection',
    status: 'COMPLETED',
    verificationBadge: 'Verified & Tested (97+ Automated Checks)',
    detail:
      'Isolated /admin/login portal, RBAC middleware, brute-force lockouts, Cloudflare Turnstile verification, Ed25519 wallet ownership attestation, and server-side API secret isolation.',
    internalRoute: '/guide',
  },
  {
    id: 'trust-custody',
    category: 'Custody, Security & Protection',
    title: 'Custody & Asset Safeguarding Architecture',
    status: 'PARTIALLY COMPLETED',
    verificationBadge: 'Non-Custodial Wallet + Double-Entry Ledger Live · Bank API Manual',
    detail:
      'Supports self-custodial Phantom/Solflare/Backpack connection and double-entry ledger reconciliation with receipt uploads. Automated banking escrow API / regulated custodian feed requires institutional banking credentials.',
    internalRoute: '/legal?doc=custody-and-asset-safeguarding',
  },
];

export interface ModuleAssessmentRow {
  module: string;
  phase: string;
  status: ImplementationStatus;
  summary: string;
}

export const PLATFORM_IMPLEMENTATION_ASSESSMENT: ModuleAssessmentRow[] = [
  {
    module: 'Public Marketplace, Property Data Rooms & Filtering',
    phase: 'Core Platform',
    status: 'COMPLETED',
    summary:
      'Live property catalog with admin approval gating, financial breakdowns, 3-scenario stress tests, and printable dossiers.',
  },
  {
    module: 'Corporate Registration Identity (SIREN 494 861 560 / VAT FR80494861560)',
    phase: 'Phase 2',
    status: 'COMPLETED',
    summary:
      'Exact supplied SIREN, RCS Paris, SIRET, VAT, and LLC registration details integrated across Legal Centre, Trust Centre, Footer, and JSON-LD.',
  },
  {
    module: '12-Document Legal Documentation Centre',
    phase: 'Phase 2',
    status: 'PARTIALLY COMPLETED',
    summary:
      'All 12 policies and contractual frameworks built, searchable, and printable; requires external legal counsel sign-off per jurisdiction before live public fundraising.',
  },
  {
    module: 'Canonical Solana Infrastructure & Wallet RPC Verification',
    phase: 'Phase 2 & 5',
    status: 'COMPLETED',
    summary:
      'Integrated USDC Mint, SPL Token Program, and Token-2022 Program with live Solana RPC balance/account verification, Explorer links, and Ed25519 message signing.',
  },
  {
    module: 'On-Chain SPV Token Minting & Automated USDC Distribution Execution',
    phase: 'Phase 2 & 5',
    status: 'BLOCKED',
    summary:
      'Requires deployed custom Token-2022 transfer-hook/distribution smart contracts, Mainnet authority keys, and external smart-contract security audit.',
  },
  {
    module: 'Investor Dashboard & Real-Data Portfolio Analytics Suite',
    phase: 'Phase 3',
    status: 'COMPLETED',
    summary:
      'Recharts analytics for property allocation, NAV history, distributions over time, property performance, diversification, and CSV monthly/annual summaries driven by actual ledger data.',
  },
  {
    module: 'Institutional Homepage, Financial Pipeline Graphics & UX',
    phase: 'Phase 4',
    status: 'COMPLETED',
    summary:
      'Upgraded with interactive 7-stage tokenisation & USDC rental waterfall pipeline, Solana infrastructure registry, Trust Centre preview, and reduced-motion-safe transitions.',
  },
  {
    module: 'Comprehensive Trust Centre (/trust)',
    phase: 'Phase 5',
    status: 'COMPLETED',
    summary:
      'Dedicated transparency hub surfacing corporate registration, 12 legal docs, Solana program verification, audit disclosures, custody safeguards, and honest status badges.',
  },
  {
    module: 'External KYC Provider (Sumsub/Onfido) & Live Banking Rails',
    phase: 'External Integrations',
    status: 'BLOCKED',
    summary:
      'Manual document vault and admin KYC/deposit approval workflow are functional; automated biometric KYC and live SEPA banking webhooks require external vendor credentials.',
  },
];
