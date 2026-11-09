export interface Investment {
  id: string;
  userId: string;
  propertyId: string;
  propertyTitle: string;
  propertyLocation: string;
  propertyImage: string;
  tokensPurchased: number;
  tokenPrice: number;
  totalAmountInvested: number;
  purchasedAt: string;
  startDate: string;
  maturityDate: string;
  durationMonths: number;
  durationDays?: number;
  estimatedAnnualYield: number;
  projectedMonthlyIncome: number;
  totalDividendsReceived: number;
  currentValuation?: number;
  unrealizedProfitLoss?: number;
  status: 'active' | 'matured' | 'cancelled' | 'pending' | 'completed' | 'liquidated';
  transactionHash: string;
  certificateId: string;
  fundingSource?: 'wallet' | 'reinvestment';
  reinvestedFromId?: string;
}

export interface InvestmentPlan {
  propertyId: string;
  tokenCount: number;
  totalCost: number;
  projectedMonthlyYield: number;
  projectedTotal3YearYield: number;
}

