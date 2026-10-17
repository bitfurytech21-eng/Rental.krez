export type AccountType = 
  | 'individual_investor'
  | 'joint_account'
  | 'accredited_investor'
  | 'institutional_investor'
  | 'corporate_entity'
  | 'family_office'
  | 'property_owner'
  | 'admin';

export type UserRole = AccountType | 'investor' | 'admin';

export type KYCStatus = 'unverified' | 'pending' | 'verified' | 'rejected';

export interface AccountTypeOption {
  id: AccountType;
  label: string;
  shortLabel: string;
  description: string;
  badge: string;
  role: 'investor' | 'admin';
  minInvestment?: string;
}

export const ACCOUNT_TYPES: AccountTypeOption[] = [
  {
    id: 'individual_investor',
    label: 'Individual Investor (Browse & Invest €1,000+)',
    shortLabel: 'Individual Investor',
    description: 'Private individual investing in tokenized luxury real estate with monthly rental yields.',
    badge: 'Retail',
    role: 'investor',
    minInvestment: '€1,000',
  },
  {
    id: 'joint_account',
    label: 'Joint Account / Co-Investors (Spousal & Partner Holdings)',
    shortLabel: 'Joint Account',
    description: 'Shared investment account for spouses, family members, or co-investors with dual verification.',
    badge: 'Joint',
    role: 'investor',
    minInvestment: '€5,000',
  },
  {
    id: 'accredited_investor',
    label: 'Accredited / HNWI Investor (Private Allocations €50,000+)',
    shortLabel: 'Accredited / HNWI',
    description: 'Qualified high-net-worth investor with priority access to off-market private allocations.',
    badge: 'HNWI',
    role: 'investor',
    minInvestment: '€50,000',
  },
  {
    id: 'institutional_investor',
    label: 'Institutional Investor (Funds & Enterprise Capital €250,000+)',
    shortLabel: 'Institutional',
    description: 'Institutional investment funds, asset managers, and corporate treasury allocations.',
    badge: 'Institutional',
    role: 'investor',
    minInvestment: '€250,000',
  },
  {
    id: 'corporate_entity',
    label: 'Corporate / LLC Entity (Company Holdings)',
    shortLabel: 'Corporate Entity',
    description: 'Companies, LLCs, SARLs, or holding entities deploying treasury capital into asset-backed tokens.',
    badge: 'Corporate',
    role: 'investor',
    minInvestment: '€25,000',
  },
  {
    id: 'family_office',
    label: 'Family Office / Wealth Manager (Institutional Portfolios €100,000+)',
    shortLabel: 'Family Office',
    description: 'Multi-family offices & private wealth managers handling institutional client real estate assets.',
    badge: 'Family Office',
    role: 'investor',
    minInvestment: '€100,000',
  },
  {
    id: 'property_owner',
    label: 'Property Owner / Developer (Tokenize & List Luxury Real Estate)',
    shortLabel: 'Property Owner / Issuer',
    description: 'Prestige real estate owners and developers seeking fractional liquidity and tokenized financing.',
    badge: 'Issuer',
    role: 'investor',
    minInvestment: 'N/A',
  },
  {
    id: 'admin',
    label: 'Platform Administrator (Review, Compliance & Approvals)',
    shortLabel: 'Platform Administrator',
    description: 'Executive management, token issuance compliance, KYC oversight & SPV approvals.',
    badge: 'Admin',
    role: 'admin',
    minInvestment: 'N/A',
  },
];

export function getAccountTypeLabel(accountType?: string, role?: string): string {
  const match = ACCOUNT_TYPES.find((t) => t.id === accountType || t.id === role);
  if (match) return match.shortLabel;
  if (role === 'admin') return 'Platform Administrator';
  return 'Individual Investor';
}

export function getAccountTypeBadge(accountType?: string, role?: string): string {
  const match = ACCOUNT_TYPES.find((t) => t.id === accountType || t.id === role);
  if (match) return match.badge;
  if (role === 'admin') return 'Admin';
  return 'Investor';
}

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  accountType?: AccountType;
  kycStatus: KYCStatus;
  kycDocumentType?: string;
  kycSubmittedAt?: string;
  walletBalance: number; // Available EUR
  investedBalance: number; // In active properties
  totalEarned: number; // Realized rental yields
  createdAt: string;
  phoneNumber?: string;
  country?: string;
  cryptoDepositAddress?: string;
  bankIban?: string;
  avatarUrl?: string;
  // Relevant fields for account types
  jointHolderName?: string;
  companyName?: string;
  institutionName?: string;
  taxId?: string;
  registrationNumber?: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
}
