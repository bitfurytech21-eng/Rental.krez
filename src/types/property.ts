export type PropertyType = 
  | 'Residential' 
  | 'Coliving' 
  | 'Vacation Rental' 
  | 'Commercial' 
  | 'Villa' 
  | 'Apartment' 
  | 'Château' 
  | 'Private Mansion' 
  | 'House' 
  | 'Estate / Property' 
  | 'Chalet';

export type PropertyStatus = 'funding' | 'funded' | 'completed' | 'upcoming' | 'hidden' | 'pending_approval';

export interface PropertyDocument {
  id: string;
  name: string;
  category: 'Legal' | 'Financial' | 'Technical' | 'Valuation';
  size: string;
  url: string;
  updatedAt: string;
}

export interface FinancialBreakdown {
  propertyPrice: number;
  refurbishmentBudget: number;
  legalAndClosingCosts: number;
  operatingReserve: number;
  totalProjectCost: number;
  projectedAnnualGrossRent: number;
  estimatedOperatingExpenses: number;
  projectedAnnualNetRent: number;
  estimatedNetYield: number; // percentage, e.g. 11.4
  estimatedCapitalGainYield: number; // percentage, e.g. 4.2
  totalEstimatedYield: number; // total annual ROI
}

export interface FeeStructure {
  structuringFee: string; // e.g. "3.5% (Included in target capitalization)"
  managementFee: string; // e.g. "10% of monthly gross rental revenue"
  withdrawalFee: string; // e.g. "0% for SEPA transfers"
  exitFee: string; // e.g. "0% at scheduled maturity"
}

export interface PaymentSchedule {
  distributionFrequency: 'Monthly' | 'Quarterly';
  payoutDate: string; // e.g. "1st business day of every month"
  annualReconciliation: string; // e.g. "Annual audit statement issued in February"
  maturityTerms: string; // e.g. "100% Principal + accumulated capital appreciation distributed upon sale"
}

export interface PropertyTimelineItem {
  phase: string;
  date: string;
  status: 'completed' | 'in_progress' | 'upcoming';
  description: string;
}

export interface Property {
  id: string;
  slug: string;
  title: string;
  location: string;
  city: string;
  country: string;
  type: PropertyType;
  status: PropertyStatus;
  images: string[];
  bannerImage: string;
  targetAmount: number;
  fundedAmount: number;
  tokenPrice: number; // e.g. €100 per token
  totalTokens: number;
  availableTokens: number;
  estimatedAnnualYield: number; // e.g. 11.4%
  capitalAppreciationYield: number; // e.g. 4.2%
  totalEstimatedReturn: number; // e.g. 15.6%
  durationMonths: number; // e.g. 36 or 48 months
  minimumInvestment: number; // Strictly >= €750
  distributionFrequency: 'Monthly' | 'Quarterly';
  tokenTicker: string; // e.g. RENT-VAL01
  blockchainNetwork: string; // e.g. 'Polygon POS'
  tokenContractAddress: string;
  description: string;
  investmentStructure: string;
  highlights: string[];
  risks: string[];
  exitStrategy: string;
  financialBreakdown: FinancialBreakdown;
  feeStructure: FeeStructure;
  paymentSchedule: PaymentSchedule;
  documents: PropertyDocument[];
  investorCount: number;
  createdAt: string;
  isSampleRecord?: boolean;
  surfaceAreaM2?: number;
  bedrooms?: number;
  bathrooms?: number;
  yearBuilt?: string | number;
  energyRating?: string;
  cadastralReference?: string;
  amenities?: string[];
  timeline?: PropertyTimelineItem[];
  operatorName?: string;
  kretzFeatures?: string[];
  reentalFeatures?: string[];
  ref?: string;
  agent?: {
    name: string;
    phone?: string;
    email?: string;
    photo?: string;
    role?: string;
  };
  isExclusive?: boolean;
  isOffMarket?: boolean;
  tourUrl?: string;
  externalTourUrl?: string;
}

