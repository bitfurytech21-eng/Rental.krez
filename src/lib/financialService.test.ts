import {
  roundDecimal,
  formatEUR,
  calculateInvestmentProjection,
  generateTokenPurchaseQuote,
  computeCanonicalPropertyMetrics,
} from './financialService';

function assertEqual(actual: any, expected: any, testName: string) {
  if (actual === expected) {
    console.log(`✓ PASS: ${testName}`);
  } else {
    console.error(`✗ FAIL: ${testName} - Expected ${expected}, got ${actual}`);
    process.exitCode = 1;
  }
}

function runFinancialUnitTests() {
  console.log('--- Running Financial Engine Unit Tests ---');

  // Test 1: Decimal Rounding
  assertEqual(roundDecimal(161.70000000000002, 2), 161.7, 'Rounding 161.70000000000002 to 2 decimals');
  assertEqual(roundDecimal(0.0001, 2), 0, 'Rounding small decimal');

  // Test 2: Priority 1 Specific Property Calculation Audit (7.7% monthly, 21 months, €9,000 min, €364 unit price)
  const proj = calculateInvestmentProjection({
    investmentAmountEUR: 9000,
    tokenPriceEUR: 364,
    monthlyTargetRatePercent: 7.7,
    durationMonths: 21,
    capitalAppreciationYieldPercent: 5.9,
    allowFractional: true,
  });

  assertEqual(proj.investmentAmountEUR, 9000, 'Investment amount is €9,000');
  assertEqual(proj.tokensAcquired, 24.7253, 'Tokens acquired for €9,000 at €364/token = 24.7253 tokens');
  assertEqual(proj.monthlyDistributionEUR, 693, 'Monthly distribution for €9,000 at 7.7% = €693/mo');
  assertEqual(proj.totalMonthlyDistributionsEUR, 14553, 'Total 21-month distributions = €14,553');
  assertEqual(proj.totalReturnPercent, 172.03, 'Total projected return percentage = 172.03% (including appreciation)');

  // Test 3: Funding & Token Purchase Quote
  const quoteFullyFunded = generateTokenPurchaseQuote({
    requestedAmountEUR: 9000,
    tokenPriceEUR: 364,
    minimumInvestmentEUR: 9000,
    targetAmountEUR: 6727500,
    fundedAmountEUR: 6727500,
  });

  assertEqual(quoteFullyFunded.isEligible, false, 'Fully funded property rejects new subscriptions');
  assertEqual(quoteFullyFunded.availableTokens, 0, 'Fully funded property has 0 available tokens');

  // Test 4: Minimum Investment Rejection
  const quoteBelowMin = generateTokenPurchaseQuote({
    requestedAmountEUR: 1000,
    tokenPriceEUR: 364,
    minimumInvestmentEUR: 9000,
    targetAmountEUR: 6727500,
    fundedAmountEUR: 3000000,
  });

  assertEqual(quoteBelowMin.isEligible, false, 'Investment below minimum is rejected');

  // Test 5: Canonical Property Metrics
  const metrics = computeCanonicalPropertyMetrics({
    targetAmount: 6727500,
    fundedAmount: 6727500,
    tokenPrice: 364,
    minimumInvestment: 9000,
    monthlyTargetRate: 7.7,
    durationMonths: 21,
    tokenTicker: 'KTZ-P1616X',
    ref: 'KP1-616X',
  });

  assertEqual(metrics.fundingProgressPercent, 100, 'Property funding progress is 100%');
  assertEqual(metrics.isFullyFunded, true, 'Property is fully funded');
  assertEqual(metrics.availableTokens, 0, '0 available tokens for fully funded asset');
  assertEqual(metrics.canonicalRef, 'KTZ-P1616X', 'Canonical ref is KTZ-P1616X');
  assertEqual(metrics.legalDocRef, 'KP1-616X', 'Legal document ref alias is KP1-616X');

  console.log('--- All Financial Engine Unit Tests Completed ---');
}

runFinancialUnitTests();
