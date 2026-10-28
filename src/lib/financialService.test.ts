import {
  roundDecimal,
  calculateInvestmentProjection,
  generateTokenPurchaseQuote,
  computeCanonicalPropertyMetrics,
  calculateLiveInvestmentBreakdown,
  PAYMENT_FEE_TIERS,
} from './financialService';
import { isValidSolanaAddress } from './solanaService';
import { ledger } from './ledger';

function assertEqual(actual: any, expected: any, testName: string) {
  if (actual === expected) {
    console.log(`✓ PASS: ${testName}`);
  } else {
    console.error(`✗ FAIL: ${testName} - Expected ${expected}, got ${actual}`);
    process.exitCode = 1;
  }
}

function assertTrue(condition: boolean, testName: string) {
  assertEqual(Boolean(condition), true, testName);
}

async function runFinancialAndInteractionTests() {
  console.log('--- Running Financial Engine & Interactive Ledger Tests ---');

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

  // Test 6: Live Investment Calculator — Bidirectional Amount / Tokens / Fee Tiers
  assertTrue(PAYMENT_FEE_TIERS.length === 3, 'Three settlement fee tiers defined');

  const liveZeroFee = calculateLiveInvestmentBreakdown({
    mode: 'tokens',
    tokenCountInput: 10,
    tokenPriceEUR: 100,
    totalPropertyTokens: 1000,
    availableTokens: 500,
    minimumInvestmentEUR: 500,
    monthlyTargetRatePercent: 0.7, // 8.4% / 12
    durationMonths: 60,
    capitalAppreciationYieldPercent: 4.0,
    feePercent: 0,
    walletBalanceEUR: 5000,
  });
  assertEqual(liveZeroFee.subtotalEUR, 1000, '10 tokens * €100 = €1,000 subtotal');
  assertEqual(liveZeroFee.feeAmountEUR, 0, 'EUR wallet rail charges €0 fee');
  assertEqual(liveZeroFee.totalPayableEUR, 1000, 'Total payable €1,000 with 0% fee');
  assertEqual(liveZeroFee.ownershipSharePercent, 1, '10 / 1,000 tokens = 1.00% SPV share');
  assertEqual(liveZeroFee.monthlyDividendEUR, 7, '0.70% monthly rate on €1,000 = €7.00/mo');
  assertEqual(liveZeroFee.isValid, true, 'Valid allocation within wallet balance is eligible');

  const liveCardFee = calculateLiveInvestmentBreakdown({
    mode: 'amount',
    investmentAmountInputEUR: 2550,
    tokenPriceEUR: 100,
    totalPropertyTokens: 1000,
    availableTokens: 500,
    minimumInvestmentEUR: 500,
    monthlyTargetRatePercent: 0.7,
    durationMonths: 60,
    capitalAppreciationYieldPercent: 4.0,
    feePercent: 1.5,
    walletBalanceEUR: 3000,
  });
  assertEqual(liveCardFee.tokenCount, 25, '€2,550 budget at €100/token floors to 25 whole SPL units');
  assertEqual(liveCardFee.subtotalEUR, 2500, '25 units * €100 = €2,500 subtotal');
  assertEqual(liveCardFee.feeAmountEUR, 37.5, '1.50% card FX fee on €2,500 = €37.50');
  assertEqual(liveCardFee.totalPayableEUR, 2537.5, 'Total payable = €2,537.50');
  assertEqual(
    liveCardFee.netProjectedProfitEUR,
    roundDecimal(liveCardFee.totalTermDividendsEUR + liveCardFee.projectedCapitalGainEUR - 37.5, 2),
    'Net profit deducts applicable settlement fee'
  );

  const liveInsufficientBalance = calculateLiveInvestmentBreakdown({
    mode: 'tokens',
    tokenCountInput: 20,
    tokenPriceEUR: 100,
    totalPropertyTokens: 1000,
    availableTokens: 500,
    minimumInvestmentEUR: 500,
    monthlyTargetRatePercent: 0.7,
    durationMonths: 60,
    feePercent: 1.5,
    walletBalanceEUR: 2010, // Needs €2,030 with 1.5% fee
  });
  assertEqual(liveInsufficientBalance.isValid, false, 'Rejects when subtotal + fee exceeds wallet balance');

  // Test 7: Solana Base58 Public Key Validation vs Internal Hashes
  assertEqual(
    isValidSolanaAddress('11111111111111111111111111111111'),
    true,
    'System program Base58 address is valid Solana address'
  );
  assertEqual(
    isValidSolanaAddress('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'),
    true,
    'USDC SPL mint Base58 address is valid Solana address'
  );
  assertEqual(
    isValidSolanaAddress('0x9f8a7b6c5d4e3f2a1b0c9d8e7f6a5b4c'),
    false,
    'Internal 0x hex custody hash is rejected as Solana Base58 address'
  );
  assertEqual(isValidSolanaAddress('invalid-short'), false, 'Short malformed string is rejected');

  // Test 8: Reactive Ledger Operations (Subscribe, Favorites, Investment Synchronization, FX Desk, P2P Order Book)
  let notifyCount = 0;
  const unsubscribe = ledger.subscribe(() => {
    notifyCount += 1;
  });

  const uniqueEmail = `qa.${Date.now()}@lagence-test.eu`;
  const testUser = ledger.createUser({
    email: uniqueEmail,
    fullName: 'QA Test Investor',
    role: 'investor',
    country: 'Spain',
    phoneNumber: '+34600111222',
  });
  assertEqual(testUser.walletBalance, 0, 'Newly registered user starts with honest €0.00 balance');

  // Credit balance via administrative treasury settlement
  ledger.recordManualCredit(
    'admin@kretz.com',
    testUser.id,
    25000,
    'EUR',
    'SEPA Bank Wire',
    'DEP-QA-TEST-01',
    'QA automated test funding'
  );
  const fundedUser = ledger.getUserById(testUser.id)!;
  assertEqual(fundedUser.walletBalance, 25000, 'Approved €25,000 credit updates user wallet balance');

  // Favorites toggle
  const activeProps = ledger
    .getFrontendProperties()
    .filter((p) => p.status === 'funding' && p.availableTokens >= 5 && p.minimumInvestment <= 12000);
  assertTrue(activeProps.length > 0, 'At least one active funding property available for test allocation');
  const targetProp = activeProps[0];

  const savedFirst = ledger.toggleFavorite(testUser.id, targetProp.id);
  assertEqual(savedFirst.saved, true, 'First favorite toggle saves property');
  assertEqual(ledger.isFavorite(testUser.id, targetProp.id), true, 'isFavorite returns true after save');
  const savedSecond = ledger.toggleFavorite(testUser.id, targetProp.id);
  assertEqual(savedSecond.saved, false, 'Second favorite toggle removes property');

  // Investment execution with fee & idempotency key + live property availability update
  const beforeAvail = targetProp.availableTokens;
  const unitsToBuy = Math.max(1, Math.ceil(targetProp.minimumInvestment / targetProp.tokenPrice));
  const idemKey = `idem-qa-${Date.now()}`;
  const inv1 = await ledger.executeInvestment(testUser.id, targetProp.id, unitsToBuy, {
    feePercent: 0.25,
    paymentMethod: 'Solana USDC SPL Settlement',
    idempotencyKey: idemKey,
  });
  assertTrue(Boolean(inv1.id), 'Investment execution creates an active holding record');

  let duplicateBlocked = false;
  try {
    await ledger.executeInvestment(testUser.id, targetProp.id, unitsToBuy, {
      feePercent: 0.25,
      paymentMethod: 'Solana USDC SPL Settlement',
      idempotencyKey: idemKey,
    });
  } catch {
    duplicateBlocked = true;
  }
  assertEqual(duplicateBlocked, true, 'Idempotency key blocks duplicate investment submission');

  const updatedProp = ledger.getPropertyById(targetProp.id)!;
  assertEqual(
    updatedProp.availableTokens,
    beforeAvail - unitsToBuy,
    'Property availableTokens decrements immediately after investment'
  );

  // Treasury FX conversion
  const fxRes = ledger.executeCurrencyConversion(testUser.id, 'EUR', 'USDC', 1000);
  assertTrue(fxRes.toAmount > 1000, 'Converting €1,000 EUR to USDC credits positive USDC balance');
  const subBalances = ledger.getUserCurrencyBalances(testUser.id);
  assertEqual(subBalances.USDC, fxRes.toAmount, 'USDC sub-balance persisted on ledger');

  let fxInsufficientRejected = false;
  try {
    ledger.executeCurrencyConversion(testUser.id, 'GBP', 'EUR', 500);
  } catch {
    fxInsufficientRejected = true;
  }
  assertEqual(fxInsufficientRejected, true, 'FX conversion rejects when source currency sub-balance is 0');

  // P2P Secondary Market Order Book (List -> Cancel & Reclaim Escrow)
  if (unitsToBuy >= 1) {
    const order = ledger.createP2PSellOrder({
      sellerId: testUser.id,
      propertyId: targetProp.id,
      tokensToSell: 1,
      askingPricePerToken: roundDecimal(targetProp.tokenPrice * 1.02, 2),
    });
    assertEqual(order.status, 'open', 'P2P sell order created with open status');
    assertTrue(
      ledger.getP2PListings().some((o) => o.id === order.id),
      'Open P2P sell order appears in secondary order book'
    );
    ledger.cancelP2PSellOrder(order.id, testUser.id);
    assertEqual(
      ledger.getP2PListings().some((o) => o.id === order.id),
      false,
      'Cancelled P2P listing removed from open secondary order book and tokens returned'
    );
  }

  unsubscribe();
  assertTrue(notifyCount >= 5, 'Ledger subscriber notified across state mutations');

  console.log('--- All Financial & Interactive Ledger Tests Completed ---');
}

runFinancialAndInteractionTests().catch((err) => {
  console.error('Unhandled test suite error:', err);
  process.exitCode = 1;
});
