export interface AdminNavSubItem {
  k: string;
  l: string;
  b?: number | string;
}

export interface AdminNavItem {
  k: string;
  l: string;
  b?: number | string;
  d?: string;
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
      { k: 'dashboard', l: 'Dashboard', d: 'Deposits waiting, withdrawals waiting, KYC queue, and total AUM.' },
    ],
  },
  {
    g: 'Investors & Compliance',
    i: [
      { k: 'investors', l: 'Investors', d: 'Investor directory, search, profile inspection, balance, and active/frozen status.' },
      { k: 'kyc', l: 'KYC / Compliance', d: 'Review identity and address documents, approve or reject with reason.' },
    ],
  },
  {
    g: 'Treasury & Transfers',
    i: [
      { k: 'deposits', l: 'Deposits', d: 'Incoming transfers, match by payment reference, and mark received.' },
      { k: 'withdrawals', l: 'Withdrawals', d: 'Approve, reject, mark paid, and verify destination IBAN ownership.' },
    ],
  },
  {
    g: 'Real Estate & Returns',
    i: [
      { k: 'properties', l: 'Properties', d: 'Create and edit property listings, photos, yield, funding target, and status.' },
      { k: 'investments', l: 'Investments', d: 'Holdings per investor and per property, plus share issuance.' },
      { k: 'distributions', l: 'Distributions', d: 'Record rental income and pay out pro-rata returns to investors.' },
      { k: 'transactions', l: 'Transactions', d: 'Full platform ledger with type/status filters and CSV export.' },
    ],
  },
  {
    g: 'Documents & Alerts',
    i: [
      { k: 'documents', l: 'Documents', d: 'Upload statements and annual tax documents per investor.' },
      { k: 'notifications', l: 'Notifications', d: 'Send platform announcements or individual investor messages.' },
    ],
  },
  {
    g: 'Governance & Platform',
    i: [
      { k: 'reports', l: 'Reports', d: 'AUM, funding completion, fee revenue, and financial audit export.' },
      { k: 'staff', l: 'Staff & Roles', d: 'Manage staff operators and role-based permissions.' },
      { k: 'settings', l: 'Settings', d: 'Configure deposit/withdrawal limits, fees, bank details, and email templates.' },
      { k: 'audit', l: 'Audit log', d: 'Immutable read-only record of who changed what, and when.' },
    ],
  },
];


export const TEMPLATE_DEFAULT_SPVS = [
  { name: 'Roquebrune-Cap-Martin, Golf Bleu', code: 'KTZ-KP1102', type: 'Villa', funded: 3540000, target: 5900000, network: 'Solana SPL' },
  { name: 'Reception apartment, Paris', code: 'KTZ-KP1117', type: 'Apartment', funded: 10191000, target: 12900000, network: 'Solana SPL' },
  { name: "Château d'Armainvilliers", code: 'KTZ-KP1173', type: 'Château', funded: 176400, target: 180000, network: 'Polygon POS' },
  { name: 'House, Antibes', code: 'KTZ-KP1183', type: 'Villa', funded: 4028000, target: 5300000, network: 'Solana SPL' },
  { name: 'The Pink Palace, Le Vesinet', code: 'KTZ-KP1214', type: 'Private mansion', funded: 36100000, target: 38000000, network: 'Base Network' },
  { name: "Architect's house, Sèvres", code: 'KTZ-P1340A', type: 'House', funded: 3650000, target: 5000000, network: 'Solana SPL' }
];

