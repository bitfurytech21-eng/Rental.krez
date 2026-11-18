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
  city?: string;
  tokensPurchased: number;
  totalCost: number;
  currentValue: number;
  gain?: number;
  /** Derived from EUR-decimal or integer-cent source values; never persisted. */
  totalCostCents?: number;
  currentValueCents?: number;
  gainCents?: number;
  dividendsReceivedCents?: number;
  projectedAnnualDividend: number;
  dividendsReceived: number;
  purchaseDate: string;
  certificateId?: string;
  status?: string;
  maturityDate?: string;
}

export interface PortalAssignedBankAccount {
  beneficiary: string;
  bankName: string;
  iban: string;
  bic: string;
  reference?: string;
}

export interface PortalPortfolioData {
  holdings: PortalHolding[];
  totalHoldingsValue: number;
  totalPortfolioValue: number;
  /** Derived integer-cent equivalents for financial calculations. */
  totalHoldingsValueCents?: number;
  totalPortfolioValueCents?: number;
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
  /** Derived integer-cent equivalents for financial calculations. */
  totalPortfolioValueCents?: number;
  availableBalanceCents?: number;
  investedCapitalCents?: number;
  totalEarnedDividendsCents?: number;
  projectedMonthlyIncomeCents?: number;
  currency: string;
}

export interface PortalProperty {
  id: string;
  slug: string;
  title: string;
  location: string;
  city?: string;
  country?: string;
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
  capitalAppreciation?: number;
  holdingPeriodMonths?: number;
  images: string[];
  spvName?: string;
  distributionFrequency?: string;
  financials?: {
    grossRentAnnual?: number;
    netYield?: number;
    totalIrr?: number;
  };
}

export interface PortalTransaction {
  id: string;
  type: string;
  amount: number;
  /** Derived from the EUR-decimal amount at the API boundary. */
  amountCents?: number;
  currency: string;
  status: string;
  reference: string;
  createdAt: string;
  description?: string;
  note?: string;
  paymentMethod?: string;
  propertyId?: string;
  propertyTitle?: string;
  tokensPurchased?: number;
  destination?: string;
  txHash?: string;
  metadata?: Record<string, unknown>;
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
  balanceCents?: number;
  availableBalance?: number;
  availableCents?: number;
  investedBalanceCents?: number;
  kycStatus: 'verified' | 'pending' | 'rejected' | 'unverified' | string;
  status: string;
  address: string;
  city: string;
  postalCode: string;
  bankIban: string;
  bankAccountHolder?: string;
  assignedBankAccount?: PortalAssignedBankAccount | null;
  cryptoDepositAddress: string;
  taxId: string;
  dateOfBirth: string;
  createdAt: string;
}

export interface PortalComplianceStep {
  stepKey: 'kyc_identity' | 'proof_of_address' | 'accredited_proof';
  title: string;
  status: 'not_started' | 'in_review' | 'verified' | 'rejected';
  notes?: string;
  submittedAt?: string;
  reviewedAt?: string;
  updatedAt?: string;
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

export interface PortalUploadedDocument {
  id: string;
  userId: string;
  userEmail?: string;
  userName?: string;
  category: 'statement' | 'tax_document';
  title: string;
  taxYear?: string;
  periodLabel?: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  fileDataUrl?: string;
  uploadedBy?: string;
  uploadedAt: string;
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

export interface PortalConfig extends PortalPaymentConfig {
  isPlaceholder: boolean;
  limits: {
    minDepositEur: number;
    maxDepositEur: number;
    minWithdrawalEur: number;
    minInvestmentEur: number;
    maxInvestmentPerInvestorEur: number;
  };
  fees: {
    sepaDepositFeeEur: number;
    cardDepositFeeEur: number;
    withdrawalFeeEur: number;
    investmentFeePercent: number;
    treasuryFxFeePercent: number;
  };
  settlement: {
    sepaDepositEta: string;
    cardDepositEta: string;
    withdrawalEta: string;
  };
}
