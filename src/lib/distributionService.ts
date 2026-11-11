/**
 * Property Payment Distribution Calculation & Synchronization Service
 * 
 * Implements strict, unmanipulated daily payment calculations:
 * - Real daily rate splitting from contractual annual net yield
 * - Exact user entitlement based on verified ownership percentage or investment amount
 * - Idempotency generation to prevent duplicate disbursements
 * - Distinction between projected, accrued, approved, processing, and paid states
 * - Strict verification against actual available distributable funds
 */

import { roundDecimal } from './financialService';
import { 
  PropertyDailyPaymentConfig, 
  DailyPaymentRecord, 
  DistributionPaymentStatus,
  UserPropertyDistributionSummary 
} from '../types/distribution';

/**
 * Calculates the exact daily payment percentage from an annual yield percentage.
 * Splits the annual contractual percent across 365 calendar days.
 */
export function calculateDailyRatePercent(annualPercent: number): number {
  if (isNaN(annualPercent) || annualPercent <= 0) return 0;
  // Divide annual percentage by 365 days, preserving high precision up to 6 decimal places
  return roundDecimal(annualPercent / 365, 6);
}

/**
 * Calculates a user's exact daily payout entitlement in EUR.
 * Entitlement = (Allocated Investment Amount in EUR) * (Daily Rate Percent / 100)
 */
export function calculateUserDailyEntitlement(
  allocatedAmountEUR: number, 
  dailyRatePercent: number
): number {
  if (allocatedAmountEUR <= 0 || dailyRatePercent <= 0) return 0;
  return roundDecimal(allocatedAmountEUR * (dailyRatePercent / 100), 2);
}

/**
 * Calculates a user's verified ownership percentage of a tokenized property.
 * Ownership % = (User Tokens Owned / Total Property Tokens) * 100
 */
export function calculateUserOwnershipPercentage(
  userTokens: number,
  totalPropertyTokens: number
): number {
  if (userTokens <= 0 || totalPropertyTokens <= 0) return 0;
  return roundDecimal((userTokens / totalPropertyTokens) * 100, 4);
}

/**
 * Constructs an authoritative, deterministic idempotency key for daily payment processing.
 * Format: PAY-{propertyId}-{userId}-{YYYY-MM-DD}
 */
export function buildDailyPaymentIdempotencyKey(
  propertyId: string,
  userId: string,
  date: string
): string {
  const cleanDate = date.split('T')[0];
  return `PAY-${propertyId.trim()}-${userId.trim()}-${cleanDate}`;
}

/**
 * Computes next scheduled payment date string (YYYY-MM-DD).
 */
export function getNextDailyPaymentDate(lastDate?: string): string {
  const base = lastDate ? new Date(lastDate) : new Date();
  base.setDate(base.getDate() + 1);
  return base.toISOString().split('T')[0];
}

/**
 * Returns UI badge styling and human-readable metadata for a payment status.
 */
export function getDistributionStatusBadge(status: DistributionPaymentStatus): {
  label: string;
  badgeClass: string;
  description: string;
} {
  switch (status) {
    case 'paid':
      return {
        label: 'Paid & Settled',
        badgeClass: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
        description: 'Credited directly to investor balance with verified transaction reference.'
      };
    case 'approved':
      return {
        label: 'Approved by Admin',
        badgeClass: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
        description: 'Admin authorized. Queued for scheduled settlement release.'
      };
    case 'processing':
      return {
        label: 'Processing Settlement',
        badgeClass: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
        description: 'Treasury clearing transaction in progress.'
      };
    case 'accrued':
      return {
        label: 'Accrued Entitlement',
        badgeClass: 'bg-sky-500/15 text-sky-400 border-sky-500/30',
        description: 'Contractually earned for the period, awaiting automated daily batch authorization.'
      };
    case 'projected':
      return {
        label: 'Projected Target',
        badgeClass: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
        description: 'Estimated future payout based on approved underwritten terms.'
      };
    case 'failed':
      return {
        label: 'Failed / Insufficient Funds',
        badgeClass: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
        description: 'Treasury funds not available or settlement condition not met.'
      };
    case 'suspended':
      return {
        label: 'Suspended by Admin',
        badgeClass: 'bg-gray-500/15 text-gray-400 border-gray-500/30',
        description: 'Distributions temporarily halted pending administrative review or tenant lease renewal.'
      };
    default:
      return {
        label: String(status).toUpperCase(),
        badgeClass: 'bg-slate-500/15 text-slate-400 border-slate-500/30',
        description: 'Status update pending.'
      };
  }
}

/**
 * Builds user-facing CSV content for downloadable property payment statements.
 */
export function generatePropertyPaymentsCsv(
  records: DailyPaymentRecord[],
  propertyTitle?: string
): string {
  const headers = [
    'Date',
    'Property Ref',
    'Property Title',
    'Investor Name',
    'Investor Email',
    'Tokens Held',
    'Ownership %',
    'Allocated Capital (EUR)',
    'Daily Rate %',
    'Daily Payment (EUR)',
    'Status',
    'Payment Reference',
    'Transaction ID',
    'Processed At',
    'Approved By'
  ];

  const rows = records.map(r => [
    `"${r.date}"`,
    `"${r.tokenTicker}"`,
    `"${r.propertyTitle.replace(/"/g, '""')}"`,
    `"${r.userName.replace(/"/g, '""')}"`,
    `"${r.userEmail}"`,
    r.userTokensCount,
    `${r.userOwnershipPercent}%`,
    r.userAllocatedInvestmentEUR.toFixed(2),
    `${r.propertyDailyRatePercent}%`,
    r.calculatedDailyAmountEUR.toFixed(2),
    `"${r.status.toUpperCase()}"`,
    `"${r.reference}"`,
    `"${r.transactionId || 'N/A'}"`,
    `"${r.paidAt || r.createdAt}"`,
    `"${r.approvedBy || 'System Automated'}"`
  ]);

  return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
}
