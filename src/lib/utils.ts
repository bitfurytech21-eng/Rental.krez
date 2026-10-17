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

export function calculateProjectedDividends(
  investmentAmount: number,
  annualYieldPercentage: number,
  months: number = 12
): {
  monthlyIncome: number;
  totalPeriodIncome: number;
  finalEstimatedValue: number;
} {
  const annualYieldDecimal = annualYieldPercentage / 100;
  const monthlyIncome = (investmentAmount * annualYieldDecimal) / 12;
  const totalPeriodIncome = monthlyIncome * months;
  const finalEstimatedValue = investmentAmount + totalPeriodIncome;

  return {
    monthlyIncome: Number(monthlyIncome.toFixed(2)),
    totalPeriodIncome: Number(totalPeriodIncome.toFixed(2)),
    finalEstimatedValue: Number(finalEstimatedValue.toFixed(2)),
  };
}
