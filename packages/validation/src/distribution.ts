/**
 * Property Payment Distribution & Daily Synchronization Types
 * 
 * Defines the strict, transparent data structures for property-by-property
 * daily payment allocation, tracking, admin authorization, and user synchronization.
 */

export type DistributionPaymentStatus = 
  | 'projected'   // Expected based on contractual terms
  | 'accrued'     // Accrued daily entitlement pending processing
  | 'approved'    // Authorized by administrator for settlement
  | 'processing'  // Transaction queued / clearing
  | 'paid'        // Successfully credited to investor wallet with transaction ID
  | 'failed'      // Failed due to insufficient verified funds or network issue
  | 'suspended';  // Suspended by administrative compliance or pause

export type PropertyPaymentScheduleType = 'daily' | 'weekdays' | 'monthly_accrual';

export interface PropertyDailyPaymentConfig {
  propertyId: string;
  propertyTitle: string;
  tokenTicker: string;
  tokenPriceEUR: number;
  totalTokens: number;
  approvedAnnualPercent: number;    // e.g. 11.4% annual net yield
  approvedDailyPercent: number;     // e.g. roundDecimal(11.4 / 365, 6) = 0.031233% per day
  schedule: PropertyPaymentScheduleType;
  status: 'active' | 'suspended' | 'paused' | 'insufficient_funds';
  availableDistributableFundsEUR: number; // Actual rental/escrow cash pool in EUR
  totalDistributedToDateEUR: number;
  lastProcessedDate?: string;       // YYYY-MM-DD
  nextScheduledDate: string;        // YYYY-MM-DD
  payoutHourUTC: number;            // Default 12 (12:00 UTC)
  minimumPayoutThresholdEUR: number;// Default 0.01
  notes?: string;
  updatedAt: string;
  updatedBy: string;
}

export interface DailyPaymentRecord {
  id: string;
  idempotencyKey: string;           // PAY-{propertyId}-{userId}-{date}
  propertyId: string;
  propertyTitle: string;
  propertyImage: string;
  tokenTicker: string;
  userId: string;
  userEmail: string;
  userName: string;
  investmentId: string;
  date: string;                     // YYYY-MM-DD
  userAllocatedInvestmentEUR: number;
  userTokensCount: number;
  userOwnershipPercent: number;     // Calculated as (tokensOwned / totalPropertyTokens) * 100
  approvedAnnualRatePercent: number;
  propertyDailyRatePercent: number;
  calculatedDailyAmountEUR: number;
  status: DistributionPaymentStatus;
  failureReason?: string;
  transactionId?: string;           // Verifiable transaction reference in financial ledger
  reference: string;                // e.g. DIST-PROP1-20261108-A1B2
  createdAt: string;
  approvedAt?: string;
  approvedBy?: string;
  paidAt?: string;
  adjustmentReason?: string;
  originalAmountEUR?: number;
}

export interface UserPropertyDistributionSummary {
  propertyId: string;
  propertyTitle: string;
  propertyImage: string;
  location: string;
  tokenTicker: string;
  tokenPriceEUR: number;
  tokensOwned: number;
  totalPropertyTokens: number;
  totalAllocatedInvestmentEUR: number;
  userOwnershipPercent: number;
  approvedAnnualPercent: number;
  approvedDailyPercent: number;
  dailyPaymentAmountEUR: number;
  totalPaymentsReceivedEUR: number;
  pendingPaymentsEUR: number;
  nextScheduledPaymentDate: string;
  paymentStatus: 'active' | 'suspended' | 'pending_approval' | 'insufficient_funds';
  availablePropertyFundsEUR: number;
  paymentSchedule: PropertyPaymentScheduleType;
  paymentHistory: DailyPaymentRecord[];
}

export interface DailyPaymentRunRequest {
  propertyId?: string;              // Specific property or all active properties
  targetDate?: string;              // YYYY-MM-DD (defaults to today)
  forceApproval?: boolean;          // Admin explicit authorization
  notes?: string;
}

export interface DailyPaymentRunResult {
  runId: string;
  date: string;
  propertiesProcessed: number;
  eligibleUsersCount: number;
  paymentsGenerated: number;
  totalDisbursedEUR: number;
  successfulPaymentsCount: number;
  failedPaymentsCount: number;
  skippedDuplicateCount: number;
  auditTrailId: string;
  records: DailyPaymentRecord[];
  errors: Array<{ propertyId: string; error: string }>;
}
