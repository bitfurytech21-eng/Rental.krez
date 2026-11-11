export interface AdminNavSubItem {
  k: string;
  l: string;
  b?: number | string;
  d?: string;
  f?: string;
  c?: string[];
}

export interface AdminNavItem {
  k: string;
  l: string;
  b?: number | string;
  bt?: string;
  d?: string;
  f?: string;
  c?: string[];
  s?: AdminNavSubItem[];
}

export interface AdminNavGroup {
  g: string;
  i: AdminNavItem[];
}

export const ADMIN_NAV_GROUPS: AdminNavGroup[] = [
  {
    g: 'Overview',
    i: [
      { k: 'dashboard', l: 'Dashboard' }
    ]
  },
  {
    g: 'Money',
    i: [
      {
        k: 'deposit-system',
        l: 'Deposit system',
        s: [
          { k: 'deposit-system-automatic-gateways', l: 'Automatic gateways', d: 'Automated on-chain and gateway deposit integrations.', f: 'Payment settings' },
          { k: 'deposit-system-manual-gateways', l: 'Manual gateways', d: 'Manual wire routing and custom account deposit instructions.', f: 'Payment settings' },
          { k: 'deposit-system-pending-deposits', l: 'Pending deposits', d: 'Review wire proofs and crypto confirmations before they hit the ledger.', f: 'Deposit Approvals tab' },
          { k: 'deposit-system-approved-deposits', l: 'Approved deposits', d: 'Audited and credited investor deposits.', f: 'Deposit Approvals history' },
          { k: 'deposit-system-successful-deposits', l: 'Successful deposits', d: 'Settled deposits on record in CaixaBank and Polygon ledgers.', f: 'Ledger stream' },
          { k: 'deposit-system-rejected-deposits', l: 'Rejected deposits', d: 'Declined or unverified payment submissions.', f: 'Deposit Approvals history' },
          { k: 'deposit-system-all-deposits', l: 'All deposits', d: 'Master ledger of all incoming transactions.', f: 'Deposit Approvals tab' }
        ]
      },
      {
        k: 'withdrawals',
        l: 'Withdrawals',
        s: [
          { k: 'withdrawals-withdraw-methods', l: 'Withdraw methods', d: 'Active redemption corridors (SEPA wire, USDC Polygon, Base, BSC).', f: 'Withdrawals tab' },
          { k: 'withdrawals-pending-log', l: 'Pending log', d: 'Investor redemptions that need executive authorization.', f: 'Withdrawals tab, Pending Withdrawals card' },
          { k: 'withdrawals-approved-log', l: 'Approved log', d: 'Authorized withdrawal requests ready for settlement execution.', f: 'Withdrawals tab' },
          { k: 'withdrawals-rejected-log', l: 'Rejected log', d: 'Redemptions cancelled due to compliance or balance restrictions.', f: 'Withdrawals tab' },
          { k: 'withdrawals-withdrawals-log', l: 'Withdrawals log', d: 'Complete history of all outbound capital redemptions.', f: 'Withdrawals tab' }
        ]
      },
      {
        k: 'wallets',
        l: 'Settlement wallets',
        d: 'Where investors send funds, by network.',
        f: 'Crypto Settlement Wallets card',
        c: ['USDC (BEP20) on BNB Smart Chain', 'USDC on Polygon POS and Base', 'Bank details for wires', 'Add or rotate a wallet']
      },
      {
        k: 'ledger',
        l: 'Ledger and settlements',
        d: 'One feed of deposits, allocations, identity checks, and approvals.',
        f: 'Live Administrative Stream card',
        c: ['Full ledger with filters', 'Settled totals', 'Export audit report']
      }
    ]
  },
  {
    g: 'Investors',
    i: [
      {
        k: 'users',
        l: 'Manage users',
        d: 'Everyone with an account, with suspend, KYC status, and balance control.',
        f: 'User Management tab',
        c: ['Search and filter users', 'Suspended account management', 'Open investor profile and holdings']
      },
      {
        k: 'kyc',
        l: 'KYC queue',
        d: 'Passport, DNI, and company documents for MiCA qualification.',
        f: 'KYC Compliance Queue, Pending KYC',
        c: ['Investors in compliance review', 'Approve or reject with notes', 'MiCA document inspection']
      },
      {
        k: 'proofs',
        l: 'Proof vault',
        d: 'Wire slips, crypto screenshots, and KYC uploads.',
        f: 'Upload and Proof Vault card',
        c: ['Uploads awaiting review', 'Link each proof to a deposit or user', 'Audit confirmation receipts']
      },
      {
        k: 'club',
        l: 'Club Privé',
        d: 'Membership tiers and who holds them.',
        f: 'Club Privé Memberships tab',
        c: ['Members and tiers', 'Grant or revoke membership', 'Private events & concierge access']
      }
    ]
  },
  {
    g: 'Properties',
    i: [
      {
        k: 'spv',
        l: 'SPV portfolio',
        d: 'Funding status and token capitalization for each property vehicle.',
        f: 'SPV Portfolio Funding Velocity, Publish New Property',
        c: ['Assign operational functions', 'Review legal appraisal', 'Approve & publish to frontend']
      },
      {
        k: 'issuance',
        l: 'Token issuance',
        d: 'Issue tokens per SPV up to its cap and allocate them to approved investors.',
        f: 'Institutional tokenization & cap tables',
        c: ['Issue tokens for active SPVs', 'Allocate to verified investors', 'Holdings breakdown by investor']
      },
      {
        k: 'dividends',
        l: 'Dividends',
        d: 'Split rental income across token holders.',
        f: 'Trigger Dividend Cycle button',
        c: ['Choose a property and amount', "Preview each investor's pro-rata share", 'Distribution history & ledger logs']
      },
      {
        k: 'property-documents',
        l: 'Property documents',
        d: 'Institutional documentation vault: deeds, RICS valuations, insurance policies.',
        f: 'Property Documents Hub',
        c: ['Upload deeds & bylaws', 'Legal certification records', 'Investor downloadable dossiers']
      },
      {
        k: 'restore',
        l: 'Restore properties & videos',
        d: 'Bring back archived listings and media to pristine seed state.',
        f: 'Restore Properties and Videos button',
        c: ['Archived listings', 'Archived video tours', 'Restore selected assets']
      }
    ]
  },
  {
    g: 'Plans and referrals',
    i: [
      {
        k: 'manage-referral',
        l: 'Manage referral',
        d: 'Manage investor referral links, partner compensation, and tier bonuses.',
        f: 'Referral engine',
        c: ['Referral bonus percentage', 'Top institutional referrers', 'Commission payout approval']
      },
      {
        k: 'plan-manage',
        l: 'Plan manage',
        s: [
          { k: 'plan-manage-time-manage', l: 'Time manage', d: 'Maturity timelines, vesting periods, and monthly distribution dates.', f: 'Investment plan settings' },
          { k: 'plan-manage-plan-manage', l: 'Plan manage', d: 'Investment structure terms (Participatory SPV note, Class-A preferred equity).', f: 'Investment plan settings' }
        ]
      }
    ]
  },
  {
    g: 'Support and reports',
    i: [
      {
        k: 'support-ticket',
        l: 'Support ticket',
        s: [
          { k: 'support-ticket-all-ticket', l: 'All ticket', d: 'Complete investor concierge inbox.', f: 'Investor Concierge' },
          { k: 'support-ticket-pending-ticket', l: 'Pending ticket', d: 'Investor queries requiring administrative response.', f: 'Investor Concierge' },
          { k: 'support-ticket-closed-ticket', l: 'Closed ticket', d: 'Resolved investor conversations.', f: 'Investor Concierge' },
          { k: 'support-ticket-answered-ticket', l: 'Answered ticket', d: 'Inquiries awaiting investor confirmation.', f: 'Investor Concierge' }
        ]
      },
      {
        k: 'report',
        l: 'Report',
        s: [
          { k: 'report-transaction-log', l: 'Transaction log', d: 'Comprehensive audit log of all financial inflows and outflows.', f: 'Financial reports' },
          { k: 'report-invest-plan-log', l: 'Invest plan log', d: 'Performance tracking for active SPV notes and rental yields.', f: 'Financial reports' },
          { k: 'report-commission-log', l: 'Commission log', d: 'Platform structuring fees and secondary transaction royalties.', f: 'Financial reports' }
        ]
      }
    ]
  },
  {
    g: 'Marketing',
    i: [
      { k: 'promotional-tool', l: 'Promotional tool', d: 'Banners, investor campaigns, and teaser releases.', f: 'Marketing suite' },
      { k: 'subscribers', l: 'Subscribers', d: 'Investor newsletter subscribers and editorial digest audience.', f: 'Marketing suite' },
      { k: 'language', l: 'Language', d: 'Multi-lingual localization configuration (English, French, Spanish).', f: 'Localization manager' }
    ]
  },
  {
    g: 'Website',
    i: [
      { k: 'active-template', l: 'Active template', d: 'Active template configuration: Kretz Luxury Architectural Theme.', f: 'Website layout' },
      { k: 'manage-pages', l: 'Manage pages', d: 'Configure public site routing, SEO slugs, and landing pages.', f: 'Website layout' },
      {
        k: 'section-manage',
        l: 'Section manage',
        s: [
          { k: 'section-manage-about', l: 'About', d: 'About Us and Kretz family heritage section.', f: 'Section CMS' },
          { k: 'section-manage-banner-content', l: 'Banner content', d: 'Hero banners and video showcases.', f: 'Section CMS' },
          { k: 'section-manage-blog-section', l: 'Blog section', d: 'Market insights and press releases.', f: 'Section CMS' },
          { k: 'section-manage-profit-calculator', l: 'Profit calculator', d: 'Projected yield and IRR compounding calculator.', f: 'Section CMS' },
          { k: 'section-manage-faq', l: 'FAQ', d: 'Frequently asked investor questions and regulatory guidance.', f: 'Section CMS' },
          { k: 'section-manage-how-work', l: 'How work', d: 'Three-step fractional investment explainer.', f: 'Section CMS' },
          { k: 'section-manage-team-member', l: 'Team member', d: 'Kretz executive team and certified advisors.', f: 'Section CMS' },
          { k: 'section-manage-testimonial', l: 'Testimonial', d: 'Institutional client testimonials.', f: 'Section CMS' },
          { k: 'section-manage-why-choose-us', l: 'Why choose us', d: 'Value propositions and institutional custody assurance.', f: 'Section CMS' }
        ]
      }
    ]
  },
  {
    g: 'Site settings',
    i: [
      { k: 'settings', l: 'Settings', d: 'Global platform configuration, platform fees, minimum investment ticket.', f: 'Site settings' },
      { k: 'logo-icon-setting', l: 'Logo icon setting', d: 'Kretz brand heraldry, svg badges, and retina favicon assets.', f: 'Branding settings' },
      { k: 'plugins', l: 'Plugins', d: 'KYC identity verification, automated AML webhooks, and analytics.', f: 'Integration plugins' },
      { k: 'seo', l: 'SEO', d: 'Meta title, OpenGraph social cards, JSON-LD real estate structured schema.', f: 'SEO configuration' },
      {
        k: 'email-manager',
        l: 'Email manager',
        s: [
          { k: 'email-manager-global-template', l: 'Global template', d: 'Master email layout with Kretz header and signature.', f: 'Email manager' },
          { k: 'email-manager-email-templates', l: 'Email templates', d: 'Deposit confirmation, KYC approval, and dividend distribution emails.', f: 'Email Templates and Delivery tab' },
          { k: 'email-manager-email-configure', l: 'Email configure', d: 'SMTP credentials, Zoho Mail / SendGrid relay configuration.', f: 'Email configuration' }
        ]
      },
      {
        k: 'sms-manager',
        l: 'SMS manager',
        s: [
          { k: 'sms-manager-global-setting', l: 'Global setting', d: 'Two-factor SMS verification and urgent transaction alerts.', f: 'SMS manager' },
          { k: 'sms-manager-sms-gateways', l: 'SMS gateways', d: 'Twilio / Vonage gateway connectivity.', f: 'SMS manager' },
          { k: 'sms-manager-sms-templates', l: 'SMS templates', d: 'SMS templates for 2FA codes and capital payouts.', f: 'SMS manager' }
        ]
      },
      { k: 'holiday-setting', l: 'Holiday setting', d: 'Target settlement banking calendars (TARGET2 and CaixaBank holiday calendars).', f: 'Settlement settings' },
      { k: 'gdpr-cookie', l: 'GDPR cookie', d: 'Cookie consent preference modal and legal disclosures.', f: 'Compliance settings' }
    ]
  },
  {
    g: 'Compliance and security',
    i: [
      {
        k: 'audit',
        l: 'Audit trail',
        d: 'Who did what, and when. Immutable cryptographic activity log.',
        f: 'Compliance Audit Trail tab',
        c: ['Audit records', 'Filter by admin, action, date', 'Export audit report']
      },
      {
        k: 'reconciliation',
        l: 'Reconciliation & Controls',
        d: 'Financial ledger verification, pending balance matching, and variance inspection.',
        f: 'Ledger Reconciliation tab',
        c: ['Balance variance audit', 'Bank statement matching', 'Discrepancy resolution']
      },
      {
        k: 'security',
        l: 'Admin security',
        d: 'Sign-in credentials, custom email, strong password, and administrator passphrases.',
        f: 'Admin Security tab',
        c: ['Change admin email and password', 'Security passphrase', 'Active administrator sessions']
      }
    ]
  },
  {
    g: 'System',
    i: [
      {
        k: 'email',
        l: 'Email templates',
        d: 'What investors receive and whether it was delivered.',
        f: 'Email Templates and Delivery tab',
        c: ['Template editor', 'Delivery log', 'Test transmission trigger']
      },
      {
        k: 'logs',
        l: 'API logs and monitoring',
        d: 'Platform health, API status, and telemetry.',
        f: 'API Logs and System Monitoring tab',
        c: ['API v1 status', 'Settled transactions', 'System telemetry']
      },
      {
        k: 'errors',
        l: 'Frontend error buffer',
        d: 'Client runtime errors caught in the investor application.',
        f: 'Frontend Error Buffer tab',
        c: ['Recent client errors', 'Clear buffer', 'Error origin stack trace']
      },
      {
        k: 'system-information',
        l: 'System information',
        d: 'Node.js runtime environment, Bun version, memory consumption, and build information.',
        f: 'System diagnostics',
        c: ['Node v24 runtime info', 'Bun 1.4 engine status', 'Platform memory metrics']
      },
      {
        k: 'custom-css',
        l: 'Custom CSS',
        d: 'Executive CSS styling overrides for customized tenant appearances.',
        f: 'Theme engine',
        c: ['Custom rules editor', 'CSS variable overrides', 'Real-time preview']
      },
      {
        k: 'clear-cache',
        l: 'Clear cache',
        d: 'Purge runtime client caches, refresh ledger cache, and rebuild navigation indexes.',
        f: 'System tools',
        c: ['Purge client session storage', 'Reload ledger records', 'Reset verification buffer']
      }
    ]
  }
];

export const TEMPLATE_DEFAULT_SPVS = [
  { name: 'Roquebrune-Cap-Martin, Golf Bleu', code: 'KTZ-KP1102', type: 'Villa', funded: 3540000, target: 5900000, network: 'Solana SPL' },
  { name: 'Reception apartment, Paris', code: 'KTZ-KP1117', type: 'Apartment', funded: 10191000, target: 12900000, network: 'Solana SPL' },
  { name: "Château d'Armainvilliers", code: 'KTZ-KP1173', type: 'Château', funded: 176400, target: 180000, network: 'Polygon POS' },
  { name: 'House, Antibes', code: 'KTZ-KP1183', type: 'Villa', funded: 4028000, target: 5300000, network: 'Solana SPL' },
  { name: 'The Pink Palace, Le Vesinet', code: 'KTZ-KP1214', type: 'Private mansion', funded: 36100000, target: 38000000, network: 'Base Network' },
  { name: "Architect's house, Sèvres", code: 'KTZ-P1340A', type: 'House', funded: 3650000, target: 5000000, network: 'Solana SPL' }
];
