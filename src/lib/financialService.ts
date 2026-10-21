/**
 * Kretz Financial Calculation & Token Accounting Engine
 * 
 * Authoritative, decimal-safe financial calculation service shared across:
 * - Property details & cards
 * - Investment purchase workflows & checkout
 * - PDF brochures & dossiers
 * - Investor dashboard & portfolio metrics
 * - Admin panel & ledger reconciliation
 */

export interface PropertyFinancials {
  propertyPrice: number;            // Direct acquisition price in EUR
  refurbishmentBudget?: number;     // Renovation/refurbishment budget in EUR
  legalAndClosingCosts?: number;    // Notary, legal, closing fees in EUR
  operatingReserve?: number;        // Contingency & initial working capital in EUR
  totalProjectCost: number;         // Total offering target / capitalization in EUR
  projectedAnnualGrossRent: number; // Projected annual gross rental income
  estimatedOperatingExpenses: number; // Annual property mgmt, insurance, tax, maintenance
  projectedAnnualNetRent: number;   // Net Operating Income (NOI)
  estimatedNetYield: number;        // Net rental yield p.a. (%)
  estimatedCapitalGainYield: number;// Estimated annualized capital appreciation (%)
  totalEstimatedYield: number;      // Total annual yield p.a. (%)
}

export interface InvestmentReturnProjection {
  investmentAmountEUR: number;
  tokenPriceEUR: number;
  tokensAcquired: number;
  isFractional: boolean;
  monthlyTargetRatePercent: number;
  durationMonths: number;
  monthlyDistributionEUR: number;
  totalMonthlyDistributionsEUR: number;
  capitalAppreciationYieldPercent: number;
  projectedCapitalGainEUR: number;
  totalProjectedProfitEUR: number;
  totalProceedsAtExitEUR: number;
  totalReturnPercent: number;
  annualizedReturnPercent: number;
  disclaimer: string;
}

export interface TokenPurchaseQuote {
  investmentAmountEUR: number;
  tokenPriceEUR: number;
  minimumInvestmentEUR: number;
  allowFractional: boolean;
  tokensToIssue: number;
  exactPayableAmountEUR: number;
  isEligible: boolean;
  validationError?: string;
  availableTokens: number;
  isFullyFunded: boolean;
}

/**
 * Decimal-safe rounding to specified decimal places
 */
export function roundDecimal(value: number, decimals: number = 2): number {
  if (isNaN(value) || !isFinite(value)) return 0;
  const factor = Math.pow(10, decimals);
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

/**
 * Safely format monetary value in EUR
 */
export function formatEUR(amount: number): string {
  const rounded = roundDecimal(amount, 2);
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  }).format(rounded);
}

/**
 * Calculates complete property return projections
 */
export function calculateInvestmentProjection(options: {
  investmentAmountEUR: number;
  tokenPriceEUR: number;
  monthlyTargetRatePercent: number;
  durationMonths: number;
  capitalAppreciationYieldPercent?: number;
  allowFractional?: boolean;
}): InvestmentReturnProjection {
  const {
    investmentAmountEUR,
    tokenPriceEUR,
    monthlyTargetRatePercent,
    durationMonths,
    capitalAppreciationYieldPercent = 0,
    allowFractional = true,
  } = options;

  const validAmount = Math.max(0, investmentAmountEUR || 0);
  const validUnitPrice = Math.max(1, tokenPriceEUR || 100);
  const validDuration = Math.max(1, durationMonths || 12);
  const validMonthlyRate = Math.max(0, monthlyTargetRatePercent || 0);

  // Tokens calculation
  let tokensAcquired = 0;
  let exactInvestedEUR = validAmount;

  if (allowFractional) {
    tokensAcquired = roundDecimal(validAmount / validUnitPrice, 4);
  } else {
    tokensAcquired = Math.floor(validAmount / validUnitPrice);
    exactInvestedEUR = tokensAcquired * validUnitPrice;
  }

  // Monthly distributions (income cash flows)
  const monthlyDistributionEUR = roundDecimal((exactInvestedEUR * (validMonthlyRate / 100)), 2);
  const totalMonthlyDistributionsEUR = roundDecimal(monthlyDistributionEUR * validDuration, 2);

  // Capital appreciation over duration
  const durationYears = validDuration / 12;
  const totalAppreciationRate = (capitalAppreciationYieldPercent / 100) * durationYears;
  const projectedCapitalGainEUR = roundDecimal(exactInvestedEUR * totalAppreciationRate, 2);

  // Total return metrics
  const totalProjectedProfitEUR = roundDecimal(totalMonthlyDistributionsEUR + projectedCapitalGainEUR, 2);
  const totalProceedsAtExitEUR = roundDecimal(exactInvestedEUR + totalProjectedProfitEUR, 2);

  const totalReturnPercent = exactInvestedEUR > 0 
    ? roundDecimal((totalProjectedProfitEUR / exactInvestedEUR) * 100, 2)
    : 0;

  const annualizedReturnPercent = durationYears > 0 
    ? roundDecimal(totalReturnPercent / durationYears, 2)
    : 0;

  return {
    investmentAmountEUR: exactInvestedEUR,
    tokenPriceEUR: validUnitPrice,
    tokensAcquired,
    isFractional: allowFractional && (tokensAcquired % 1 !== 0),
    monthlyTargetRatePercent: validMonthlyRate,
    durationMonths: validDuration,
    monthlyDistributionEUR,
    totalMonthlyDistributionsEUR,
    capitalAppreciationYieldPercent,
    projectedCapitalGainEUR,
    totalProjectedProfitEUR,
    totalProceedsAtExitEUR,
    totalReturnPercent,
    annualizedReturnPercent,
    disclaimer: 'Projections are based on expected net rental income and SPV targets. Returns are not guaranteed and subject to market conditions.',
  };
}

/**
 * Generates an authoritative quote for a token purchase attempt
 */
export function generateTokenPurchaseQuote(options: {
  requestedAmountEUR: number;
  tokenPriceEUR: number;
  minimumInvestmentEUR: number;
  targetAmountEUR: number;
  fundedAmountEUR: number;
  allowFractional?: boolean;
}): TokenPurchaseQuote {
  const {
    requestedAmountEUR,
    tokenPriceEUR,
    minimumInvestmentEUR,
    targetAmountEUR,
    fundedAmountEUR,
    allowFractional = true,
  } = options;

  const unitPrice = Math.max(1, tokenPriceEUR || 100);
  const minInvest = Math.max(unitPrice, minimumInvestmentEUR || unitPrice);
  const remainingCapitalEUR = Math.max(0, targetAmountEUR - fundedAmountEUR);
  const totalTokens = Math.floor(targetAmountEUR / unitPrice);
  const availableTokens = Math.max(0, Math.floor(remainingCapitalEUR / unitPrice));
  const isFullyFunded = remainingCapitalEUR <= 0 || availableTokens <= 0;

  if (isFullyFunded) {
    return {
      investmentAmountEUR: requestedAmountEUR,
      tokenPriceEUR: unitPrice,
      minimumInvestmentEUR: minInvest,
      allowFractional,
      tokensToIssue: 0,
      exactPayableAmountEUR: 0,
      isEligible: false,
      validationError: 'This property offering is 100% fully funded. Subscriptions are closed.',
      availableTokens: 0,
      isFullyFunded: true,
    };
  }

  if (requestedAmountEUR < minInvest) {
    return {
      investmentAmountEUR: requestedAmountEUR,
      tokenPriceEUR: unitPrice,
      minimumInvestmentEUR: minInvest,
      allowFractional,
      tokensToIssue: 0,
      exactPayableAmountEUR: 0,
      isEligible: false,
      validationError: `Minimum investment for this property offering is ${formatEUR(minInvest)}.`,
      availableTokens,
      isFullyFunded: false,
    };
  }

  // Calculate actual tokens and exact payable amount
  let tokensToIssue = 0;
  let exactPayableAmountEUR = 0;

  if (allowFractional) {
    tokensToIssue = roundDecimal(requestedAmountEUR / unitPrice, 4);
    exactPayableAmountEUR = roundDecimal(tokensToIssue * unitPrice, 2);
  } else {
    tokensToIssue = Math.floor(requestedAmountEUR / unitPrice);
    exactPayableAmountEUR = roundDecimal(tokensToIssue * unitPrice, 2);
  }

  // Check oversubscription
  const requestedTokens = allowFractional ? (requestedAmountEUR / unitPrice) : tokensToIssue;
  if (requestedTokens > availableTokens) {
    const maxAllowedEUR = roundDecimal(availableTokens * unitPrice, 2);
    return {
      investmentAmountEUR: requestedAmountEUR,
      tokenPriceEUR: unitPrice,
      minimumInvestmentEUR: minInvest,
      allowFractional,
      tokensToIssue: 0,
      exactPayableAmountEUR: 0,
      isEligible: false,
      validationError: `Requested investment exceeds available inventory. Maximum available is ${formatEUR(maxAllowedEUR)} (${availableTokens} tokens).`,
      availableTokens,
      isFullyFunded: false,
    };
  }

  return {
    investmentAmountEUR: requestedAmountEUR,
    tokenPriceEUR: unitPrice,
    minimumInvestmentEUR: minInvest,
    allowFractional,
    tokensToIssue,
    exactPayableAmountEUR,
    isEligible: true,
    availableTokens,
    isFullyFunded: false,
  };
}

/**
 * Reconciles and formats canonical property financial metrics
 */
export function computeCanonicalPropertyMetrics(p: {
  targetAmount: number;
  fundedAmount: number;
  tokenPrice: number;
  minimumInvestment?: number;
  estimatedAnnualYield?: number;
  monthlyTargetRate?: number;
  durationMonths?: number;
  capitalAppreciationYield?: number;
  ref?: string;
  tokenTicker?: string;
}) {
  const target = Math.max(0, p.targetAmount || 0);
  const funded = Math.min(target, Math.max(0, p.fundedAmount || 0));
  const progressPercent = target > 0 ? roundDecimal((funded / target) * 100, 2) : 0;
  const isFullyFunded = progressPercent >= 100 || funded >= target;

  const unitPrice = Math.max(1, p.tokenPrice || 100);
  const totalTokens = Math.floor(target / unitPrice);
  const availableTokens = isFullyFunded ? 0 : Math.max(0, Math.floor((target - funded) / unitPrice));

  const monthlyRate = p.monthlyTargetRate ?? roundDecimal((p.estimatedAnnualYield || 0) / 12, 2);
  const duration = p.durationMonths || 36;
  const annualYield = p.estimatedAnnualYield ?? roundDecimal(monthlyRate * 12, 2);
  const targetReturnPeriod = roundDecimal(monthlyRate * duration, 2);

  // Cross-reference document alias check (e.g., KTZ-P1616X <-> KP1-616X)
  const canonicalRef = p.tokenTicker || p.ref || 'KTZ-PROP';
  const legalDocRef = p.ref || p.tokenTicker || 'KP1-PROP';

  return {
    targetAmount: target,
    fundedAmount: funded,
    fundingProgressPercent: progressPercent,
    isFullyFunded,
    tokenPrice: unitPrice,
    totalTokens,
    availableTokens,
    minimumInvestment: p.minimumInvestment || Math.max(unitPrice, 1000),
    monthlyTargetRatePercent: monthlyRate,
    durationMonths: duration,
    estimatedAnnualYieldPercent: annualYield,
    totalTargetReturnPercent: targetReturnPeriod,
    canonicalRef,
    legalDocRef,
  };
}
