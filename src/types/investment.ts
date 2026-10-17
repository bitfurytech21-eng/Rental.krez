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
  estimatedAnnualYield: number;
  projectedMonthlyIncome: number;
  totalDividendsReceived: number;
  status: 'active' | 'completed' | 'liquidated';
  transactionHash: string;
  certificateId: string;
}

export interface InvestmentPlan {
  propertyId: string;
  tokenCount: number;
  totalCost: number;
  projectedMonthlyYield: number;
  projectedTotal3YearYield: number;
}
