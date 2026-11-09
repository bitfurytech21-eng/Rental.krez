/**
 * Property Payment Distribution Calculation & Synchronization Service
 */

import { roundDecimal } from './financialService';
import {
  PropertyDailyPaymentConfig,
  DailyPaymentRecord,
  DistributionPaymentStatus,
  UserPropertyDistributionSummary
} from './distribution';

export function calculateDailyRatePercent(annualPercent: number): number {
  if (isNaN(annualPercent) || annualPercent <= 0) return 0;
  return roundDecimal(annualPercent / 365, 6);
}

export function calculateUserDailyEntitlement(
  allocatedAmountEUR: number,
  dailyRatePercent: number
): number {
  if (allocatedAmountEUR <= 0 || dailyRatePercent <= 0) return 0;
  return roundDecimal(allocatedAmountEUR * (dailyRatePercent / 100), 2);
}

export function calculateUserOwnershipPercentage(
  userTokensCount: number,
  totalTokens: number
): number {
  if (totalTokens <= 0 || userTokensCount <= 0) return 0;
  return roundDecimal((userTokensCount / totalTokens) * 100, 6);
}

export function buildDailyPaymentIdempotencyKey(
  propertyId: string,
  userId: string,
  date: string
): string {
  return `PAY-${propertyId}-${userId}-${date}`;
}

export function buildProjectedDistribution(
  config: PropertyDailyPaymentConfig,
  userId: string,
  userName: string,
  userEmail: string,
  investmentId: string,
  userTokens: number,
  allocatedAmountEUR: number,
  days = 30
): DailyPaymentRecord[] {
  const records: DailyPaymentRecord[] = [];
  const ownership = calculateUserOwnershipPercentage(userTokens, config.totalTokens);
  const dailyAmount = calculateUserDailyEntitlement(allocatedAmountEUR, config.approvedDailyPercent);
  const start = new Date();

  for (let i = 0; i < days; i += 1) {
    const d = new Date(start);
    d.setUTCDate(start.getUTCDate() + i);
    const date = d.toISOString().split('T')[0];
    const id = buildDailyPaymentIdempotencyKey(config.propertyId, userId, date);
    records.push({
      id,
      idempotencyKey: id,
      propertyId: config.propertyId,
      propertyTitle: config.propertyTitle,
      propertyImage: '',
      tokenTicker: config.tokenTicker,
      userId,
      userEmail,
      userName,
      investmentId,
      date,
      userAllocatedInvestmentEUR: allocatedAmountEUR,
      userTokensCount: userTokens,
      userOwnershipPercent: ownership,
      approvedAnnualRatePercent: config.approvedAnnualPercent,
      propertyDailyRatePercent: config.approvedDailyPercent,
      calculatedDailyAmountEUR: dailyAmount,
      status: 'projected',
      reference: id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }
  return records;
}

export function getDistributionStatusBadge(status: DistributionPaymentStatus): { label: string; className: string; badgeClass: string } {
  const map: Record<DistributionPaymentStatus, { label: string; className: string }> = {
    projected: { label: 'Projected', className: 'bg-slate-100 text-slate-700' },
    accrued: { label: 'Accrued', className: 'bg-amber-100 text-amber-700' },
    approved: { label: 'Approved', className: 'bg-blue-100 text-blue-700' },
    processing: { label: 'Processing', className: 'bg-indigo-100 text-indigo-700' },
    paid: { label: 'Paid', className: 'bg-emerald-100 text-emerald-700' },
    failed: { label: 'Failed', className: 'bg-red-100 text-red-700' },
    suspended: { label: 'Suspended', className: 'bg-gray-200 text-gray-700' },
  };
  const base = map[status] || { label: status, className: 'bg-gray-100 text-gray-700' };
  return { ...base, badgeClass: base.className };
}

export function summarizeUserPropertyDistributions(
  records: DailyPaymentRecord[]
): UserPropertyDistributionSummary[] {
  const byProperty = new Map<string, DailyPaymentRecord[]>();
  for (const r of records) {
    const list = byProperty.get(r.propertyId) || [];
    list.push(r);
    byProperty.set(r.propertyId, list);
  }
  return Array.from(byProperty.entries()).map(([propertyId, items]) => {
    const first = items[0];
    const paid = items.filter(i => i.status === 'paid');
    const pending = items.filter(i => i.status !== 'paid' && i.status !== 'failed');
    const latest = [...items].sort((a, b) => b.date.localeCompare(a.date))[0];
    const next = [...items].filter(i => i.status !== 'paid' && i.status !== 'failed').sort((a, b) => a.date.localeCompare(b.date))[0];
    return {
      propertyId,
      propertyTitle: first.propertyTitle,
      propertyImage: first.propertyImage,
      location: '',
      tokenTicker: first.tokenTicker,
      tokenPriceEUR: first.userAllocatedInvestmentEUR && first.userTokensCount ? roundDecimal(first.userAllocatedInvestmentEUR / first.userTokensCount, 2) : 0,
      tokensOwned: first.userTokensCount,
      totalPropertyTokens: first.userOwnershipPercent > 0 ? Math.round((first.userTokensCount / first.userOwnershipPercent) * 100) : 0,
      totalAllocatedInvestmentEUR: first.userAllocatedInvestmentEUR,
      userOwnershipPercent: first.userOwnershipPercent,
      approvedAnnualPercent: first.approvedAnnualRatePercent,
      approvedDailyPercent: first.propertyDailyRatePercent,
      dailyPaymentAmountEUR: first.calculatedDailyAmountEUR,
      totalPaymentsReceivedEUR: roundDecimal(paid.reduce((s, i) => s + i.calculatedDailyAmountEUR, 0), 2),
      pendingPaymentsEUR: roundDecimal(pending.reduce((s, i) => s + i.calculatedDailyAmountEUR, 0), 2),
      nextScheduledPaymentDate: next?.date || latest?.date || '',
      paymentStatus: (first.status === 'paid' || first.status === 'processing' || first.status === 'approved' || first.status === 'accrued' || first.status === 'projected') ? 'active' : 'suspended',
      availablePropertyFundsEUR: 0,
      paymentSchedule: 'daily',
      paymentHistory: items,
    };
  });
}

export function generatePropertyPaymentsCsv(records: DailyPaymentRecord[], _propertyLabel?: string): string {
  const headers = [
    'id','propertyId','propertyTitle','userId','userEmail','date','userTokensCount',
    'userAllocatedInvestmentEUR','propertyDailyRatePercent','calculatedDailyAmountEUR','status','transactionId','reference'
  ];
  const escape = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const rows = records.map(r => [
    r.id,r.propertyId,r.propertyTitle,r.userId,r.userEmail,r.date,r.userTokensCount,
    r.userAllocatedInvestmentEUR,r.propertyDailyRatePercent,r.calculatedDailyAmountEUR,r.status,r.transactionId,r.reference
  ].map(escape).join(','));
  return [headers.join(','), ...rows].join('\n');
}
