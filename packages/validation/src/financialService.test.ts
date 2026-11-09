import {
  roundDecimal,
  calculateInvestmentProjection,
  generateTokenPurchaseQuote,
  computeCanonicalPropertyMetrics,
} from './financialService';

function assertEqual(actual: any, expected: any, testName: string) {
  if (actual === expected) console.log(`✓ PASS: ${testName}`);
  else { console.error(`✗ FAIL: ${testName} - Expected ${expected}, got ${actual}`); process.exitCode = 1; }
}

function assertTrue(condition: boolean, testName: string) { assertEqual(Boolean(condition), true, testName); }

async function run() {
  console.log('--- Financial Engine Tests (packages/validation) ---');
  assertEqual(roundDecimal(161.70000000000002, 2), 161.7, 'rounding');
  assertEqual(roundDecimal(0.0001, 2), 0, 'small rounding');
  const proj = calculateInvestmentProjection({ investmentAmountEUR: 9000, tokenPriceEUR: 364, monthlyTargetRatePercent: 7.7, durationMonths: 21, capitalAppreciationYieldPercent: 0 });
  assertTrue(proj.monthlyDistributionEUR >= 0, 'projection monthly >= 0');
  assertTrue(proj.tokensAcquired >= 0, 'tokens >= 0');
  const quote = generateTokenPurchaseQuote({ investmentAmountEUR: 1000, tokenPriceEUR: 100, minimumInvestmentEUR: 100, availableTokens: 500, allowFractional: false });
  assertTrue(quote.tokensToIssue >= 0, 'quote tokens >= 0');
  const metrics = computeCanonicalPropertyMetrics({ propertyPrice: 1000000, totalProjectCost: 1200000, projectedAnnualGrossRent: 120000, estimatedOperatingExpenses: 24000 } as any);
  assertTrue(typeof metrics.estimatedNetYield === 'number', 'net yield number');
  console.log('--- done ---');
}

run().catch((e) => { console.error(e); process.exit(1); });
