export type PortalRoute =
  | 'overview'
  | 'portfolio'
  | 'explore'
  | 'property-detail'
  | 'ledger'
  | 'more'
  | 'wallet'
  | 'deposit'
  | 'withdraw'
  | 'profile'
  | 'compliance'
  | 'reports'
  | 'analytics'
  | 'notifications'
  | 'support';

export interface PortalHolding {
  id: string;
  propertyId: string;
  propertyTitle: string;
  tokensPurchased: number;
  totalCost: number;
  currentValue: number;
  projectedAnnualDividend: number;
  dividendsReceived: number;
  purchaseDate: string;
  certificateId?: string;
  status?: string;
  maturityDate?: string;
}

export interface PortalPortfolioData {
  holdings: PortalHolding[];
  totalHoldingsValue: number;
  totalPortfolioValue: number;
  totalTokensHeld: number;
  activePropertiesCount: number;
  totalDividendsReceived: number;
  currency: string;
}

export interface PortalDashboardSummary {
  totalPortfolioValue: number;
  availableBalance: number;
  investedCapital: number;
  totalEarnedDividends: number;
  activePropertiesCount: number;
  projectedMonthlyIncome: number;
  currency: string;
}

export interface PortalProperty {
  id: string;
  slug: string;
  title: string;
  location: string;
  type: string;
  status: string;
  description?: string;
  tokenPrice: number;
  totalTokens: number;
  availableTokens: number;
  targetAmount: number;
  fundedAmount: number;
  minimumInvestment: number;
  projectedYield: number;
  images: string[];
  spvName?: string;
  distributionFrequency?: string;
}

export interface PortalTransaction {
  id: string;
  type: string;
  amount: number;
  currency: string;
  status: string;
  reference: string;
  createdAt: string;
  description?: string;
  paymentMethod?: string;
  propertyId?: string;
  propertyTitle?: string;
  tokensPurchased?: number;
  destination?: string;
  txHash?: string;
}

export interface PortalNotification {
  id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  createdAt: string;
}

export interface PortalProfile {
  id: string;
  email: string;
  fullName: string;
  country: string;
  countryCode: string;
  phoneNumber: string;
  accountType: string;
  balance: number;
  investedBalance: number;
  kycStatus: 'verified' | 'pending' | 'rejected' | 'unverified' | string;
  status: string;
  address: string;
  city: string;
  postalCode: string;
  bankIban: string;
  cryptoDepositAddress: string;
  taxId: string;
  dateOfBirth: string;
  createdAt: string;
}

export interface PortalComplianceDoc {
  id: string;
  userId: string;
  category: 'kyc_identity' | 'proof_of_address' | 'accredited_proof';
  documentType: string;
  title: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  status: 'pending' | 'verified' | 'rejected';
  uploadedAt: string;
  fileDataUrl?: string;
}

export interface PortalAccountStatement {
  statementId: string;
  periodStart: string;
  periodEnd: string;
  totalDeposits: number;
  totalInvested: number;
  totalDividendsReceived: number;
  currentBalance: number;
}

export interface PortalPerformanceData {
  annualizedReturnPercent: number;
  historicalPerformance: Array<{
    month: string;
    yield: number;
    totalValue: number;
  }>;
}

export interface PortalPaymentConfig {
  traditional: {
    beneficiary: string;
    bankName: string;
    iban: string;
    bic: string;
    address: string;
    country: string;
  };
  cryptoNetworks: Array<{
    id: string;
    network: string;
    asset: string;
    address: string;
    memo?: string;
  }>;
}
