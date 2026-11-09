export function formatCurrency(amount: number, currency: string = 'EUR'): string {
  const symbol = currency === 'EUR' ? '€' : currency === 'USD' ? '$' : '';
  const formatted = new Intl.NumberFormat('en-IE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
  return symbol ? `${symbol}${formatted}` : `${formatted} ${currency}`;
}

export function formatCompactCurrency(amount: number): string {
  if (amount >= 1_000_000) {
    return `€${(amount / 1_000_000).toFixed(1)}M`;
  }
  if (amount >= 1_000) {
    return `€${(amount / 1_000).toFixed(0)}k`;
  }
  return `€${amount}`;
}

export function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

export function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(date);
  } catch {
    return dateString;
  }
}

export function formatShortHash(hash: string): string {
  if (!hash) return '';
  if (hash.length <= 12) return hash;
  return `${hash.slice(0, 6)}...${hash.slice(-4)}`;
}

export function calculatePropertyTargetReturns(
  investmentCost: number,
  monthlyTargetPercentage: number = 6.1,
  durationMonths: number = 25,
  isPrincipalRepayableSeparately: boolean = true
): {
  monthlyTarget: number;
  annualTarget: number;
  netMonthlyTarget: number;
  totalWithPrincipal: number;
} {
  // monthly target = investment cost × monthly percentage ÷ 100
  const monthlyTarget = Number(((investmentCost * monthlyTargetPercentage) / 100).toFixed(2));
  // annual target = monthly target × 12
  const annualTarget = Number((monthlyTarget * 12).toFixed(2));
  // net monthly target = monthly target × durationMonths (odd number between 5 and 57)
  const netMonthlyTarget = Number((monthlyTarget * durationMonths).toFixed(2));
  // total with principal = investment cost + net monthly target
  const totalWithPrincipal = isPrincipalRepayableSeparately
    ? Number((investmentCost + netMonthlyTarget).toFixed(2))
    : netMonthlyTarget;

  return {
    monthlyTarget,
    annualTarget,
    netMonthlyTarget,
    totalWithPrincipal,
  };
}

export function calculateProjectedMonthlyIncome(
  investmentAmount: number,
  monthlyTargetPercentage: number = 6.0
): number {
  return Number(((investmentAmount * monthlyTargetPercentage) / 100).toFixed(2));
}

export function calculateTargetReturns(
  investmentAmount: number,
  annualYieldPercentage: number,
  durationMonths: number = 48,
  monthlyIncreaseFactor: number = 1.0
): {
  targetMonthlyPay: number;
  annualTargetReturn: number;
  netMonthlyTarget: number;
  totalEstimatedValue: number;
} {
  const targetMonthlyPay = Number(((investmentAmount * (annualYieldPercentage / 100)) / 12).toFixed(2));
  const annualTargetReturn = Number((targetMonthlyPay * 12).toFixed(2));
  const netMonthlyTarget = Number((targetMonthlyPay * durationMonths).toFixed(2));
  const totalEstimatedValue = Number((investmentAmount + netMonthlyTarget).toFixed(2));

  return {
    targetMonthlyPay,
    annualTargetReturn,
    netMonthlyTarget,
    totalEstimatedValue,
  };
}

export function calculateProjectedDividends(
  investmentAmount: number,
  annualYieldPercentage: number,
  months: number = 48
): {
  monthlyIncome: number;
  totalPeriodIncome: number;
  finalEstimatedValue: number;
} {
  const monthlyIncome = Number(((investmentAmount * (annualYieldPercentage / 100)) / 12).toFixed(2));
  const totalPeriodIncome = Number((monthlyIncome * months).toFixed(2));
  const finalEstimatedValue = Number((investmentAmount + totalPeriodIncome).toFixed(2));

  return {
    monthlyIncome,
    totalPeriodIncome,
    finalEstimatedValue,
  };
}
