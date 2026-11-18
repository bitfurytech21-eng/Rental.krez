import { supabase, isSupabaseConfigured } from '../../lib/supabaseClient';
import { getApiUrl, getAuthToken } from '../../lib/api';

// ============================================================================
// INTEGER CENTS ARITHMETIC & EUR FORMATTING
// ============================================================================
export function parseStrictEurToCents(eur: unknown): number | null {
  if (eur === null || eur === undefined) return null;
  if (typeof eur === 'string') {
    const trimmed = eur.trim().replace(/\s+/g, '').replace(',', '.');
    if (!trimmed || !/^-?\d+(\.\d+)?$/.test(trimmed)) return null;
    const num = Number(trimmed);
    if (!Number.isFinite(num)) return null;
    const shifted = Number(`${num.toFixed(6)}e2`);
    const rounded = Math.round(shifted);
    return Number.isSafeInteger(rounded) ? rounded : null;
  }
  const n = Number(eur);
  if (!Number.isFinite(n)) return null;
  const shifted = Number(`${n.toFixed(6)}e2`);
  const rounded = Math.round(shifted);
  return Number.isSafeInteger(rounded) ? rounded : null;
}

export function eurToCents(eur: unknown): number {
  const parsed = parseStrictEurToCents(eur);
  return parsed === null ? 0 : parsed;
}

export function centsToEur(cents: number): number {
  if (!Number.isFinite(cents)) return 0;
  return Math.round(cents) / 100;
}

export function formatCentsEur(cents: number): string {
  const value = centsToEur(cents);
  return new Intl.NumberFormat('en-IE', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function computeDefaultWithdrawalFeeCents(
  withdrawalAmountCents: number,
  limits?: Record<string, any> | null
): number {
  const pct = Number(limits?.withdrawal_fee_pct ?? 0);
  if (Number.isFinite(pct) && pct > 0 && withdrawalAmountCents > 0) {
    return Math.max(0, Math.round((withdrawalAmountCents * pct) / 100));
  }
  const flatCents = parseStrictEurToCents(limits?.withdrawal_fee_eur ?? 0);
  return flatCents !== null && flatCents > 0 ? flatCents : 0;
}

export function allocateProportionalCents(
  totalCents: number,
  holders: Array<{ userId: string; shares: number }>
): Map<string, number> {
  const out = new Map<string, number>();
  const totalShares = holders.reduce((s, h) => s + h.shares, 0);
  if (totalShares <= 0 || totalCents <= 0 || holders.length === 0) return out;
  const enriched = holders.map((h, idx) => {
    const exact = (totalCents * h.shares) / totalShares;
    const base = Math.floor(exact);
    return { userId: h.userId, base, frac: exact - base, idx };
  });
  let remainder = totalCents - enriched.reduce((s, r) => s + r.base, 0);
  const byRemainder = [...enriched].sort((a, b) => (b.frac - a.frac) || (a.idx - b.idx));
  for (let i = 0; i < byRemainder.length && remainder > 0; i++) {
    byRemainder[i].base += 1;
    remainder -= 1;
  }
  for (const row of enriched) {
    out.set(row.userId, row.base);
  }
  return out;
}

export function isMissingRpcOrSignatureError(error: any): boolean {
  if (!error) return false;
  const code = String(error?.code || '');
  const msg = String(error?.message || '').toLowerCase();
  return (
    code === 'PGRST202' ||
    code === '42883' ||
    code === '42P01' ||
    msg.includes('could not find the function') ||
    msg.includes('schema cache') ||
    (msg.includes('function ') && msg.includes('does not exist'))
  );
}

export function formatPlainDatabaseError(
  error: any,
  fallback = 'The database rejected this action.'
): { message: string; alreadyProcessed: boolean } {
  const rawSource =
    typeof error === 'string'
      ? error
      : error?.message || error?.error || error?.details || error?.hint || fallback;
  let clean = String(rawSource || fallback)
    .replace(/^\[[A-Z0-9_]+\]\s*/i, '')
    .replace(/^ERROR:\s*/i, '')
    .trim();
  if (!clean) clean = fallback;

  const lower = clean.toLowerCase();
  const alreadyProcessed =
    lower.includes('already processed') ||
    lower.includes('already handled') ||
    lower.includes('already reviewed') ||
    lower.includes('already approved') ||
    lower.includes('already rejected') ||
    lower.includes('already settled') ||
    lower.includes('already reversed') ||
    lower.includes('not found');

  if (alreadyProcessed) {
    return {
      message: `${clean}. Someone else may have already handled this item — the list has been refreshed.`,
      alreadyProcessed: true,
    };
  }

  const code = String(error?.code || '').trim();
  if (lower.includes('admin only') || lower.includes('permission denied') || code === '42501') {
    return {
      message: lower.includes('admin only') ? clean : 'Admin only — your account does not have permission for this action.',
      alreadyProcessed: false,
    };
  }

  return { message: clean, alreadyProcessed: false };
}

export function extractDbRefusalMessage(error: any, fallback = 'Database rejected the operation.'): string {
  if (!error) return fallback;
  const raw = String(error?.message || error?.error || '').trim();
  const details = String(error?.details || '').trim();
  const hint = String(error?.hint || '').trim();
  if (!raw) return details || hint || fallback;
  const clean = raw.replace(/^ERROR:\s*/i, '').trim();
  if (details && !clean.includes(details) && !details.toLowerCase().includes('pl/pgsql')) {
    return `${clean} — ${details}`;
  }
  return clean;
}

export function maskIban(raw?: string | null): string {
  const clean = String(raw || '').replace(/\s+/g, '').toUpperCase();
  if (!clean) return 'Not on file';
  if (clean.length <= 8) return `${clean.slice(0, 2)}••••${clean.slice(-2)}`;
  return `${clean.slice(0, 4)} •••• •••• ${clean.slice(-4)}`;
}

async function hasLiveSupabaseSession(): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  try {
    const { data } = await supabase.auth.getSession();
    return Boolean(data?.session?.access_token);
  } catch {
    return false;
  }
}

async function apiFetchJson(endpoint: string, init: RequestInit = {}): Promise<any> {
  const token = getAuthToken();
  const headers = new Headers(init.headers || {});
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  if (init.body && !headers.has('Content-Type') && typeof init.body === 'string') {
    headers.set('Content-Type', 'application/json');
  }
  const res = await fetch(getApiUrl(endpoint), { credentials: 'include', ...init, headers });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = json?.error || json?.message || `Request failed (${res.status})`;
    const details = json?.details ? ` — ${json.details}` : '';
    throw new Error(`${msg}${details}`);
  }
  return json;
}

async function requireRpcSuccess<T = unknown>(functionName: string, args: Record<string, any>): Promise<T> {
  if (!(await hasLiveSupabaseSession())) {
    throw new Error('A signed-in Supabase session is required for this administrative action.');
  }
  const { data, error } = await supabase.rpc(functionName, args);
  if (error) {
    throw new Error(extractDbRefusalMessage(error, `Database function ${functionName} refused the request.`));
  }
  return data as T;
}

// ============================================================================
// 1. DASHBOARD: admin_stats()
// ============================================================================
export interface AdminStatsSummary {
  pendingDepositsCount: number;
  pendingDepositsTotalEur: number;
  pendingWithdrawalsCount: number;
  pendingWithdrawalsTotalEur: number;
  kycQueueCount: number;
  investorsCount: number;
  totalAumAtCostEur: number;
  source: 'rpc' | 'computed';
}

const centsOrEurToEur = (centsVal: unknown, eurVal: unknown): number => {
  if (typeof centsVal === 'number' || (typeof centsVal === 'string' && centsVal !== '')) {
    return centsToEur(Math.round(Number(centsVal)));
  }
  return centsToEur(eurToCents(eurVal));
};

export async function fetchAdminStats(fallback: {
  users: any[];
  transactions: any[];
  investments: any[];
  kycQueueCount?: number;
}): Promise<AdminStatsSummary> {
  if (await hasLiveSupabaseSession()) {
    const { data, error } = await supabase.rpc('admin_stats');
    if (error && !isMissingRpcOrSignatureError(error)) {
      throw new Error(extractDbRefusalMessage(error, 'Failed to load admin statistics.'));
    }
    if (!error && data) {
      const raw: any = Array.isArray(data) ? data[0] : data;
      if (raw && typeof raw === 'object') {
        return {
          pendingDepositsCount: Number(raw.pending_deposits_count ?? raw.pendingDepositsCount ?? 0),
          pendingDepositsTotalEur: centsOrEurToEur(
            raw.pending_deposits_cents ?? raw.pending_deposits_total_cents,
            raw.pending_deposits_total ?? raw.pending_deposits_eur ?? raw.pendingDepositsTotal ?? 0
          ),
          pendingWithdrawalsCount: Number(raw.pending_withdrawals_count ?? raw.pendingWithdrawalsCount ?? 0),
          pendingWithdrawalsTotalEur: centsOrEurToEur(
            raw.pending_withdrawals_cents ?? raw.pending_withdrawals_total_cents,
            raw.pending_withdrawals_total ?? raw.pending_withdrawals_eur ?? raw.pendingWithdrawalsTotal ?? 0
          ),
          kycQueueCount: Number(raw.kyc_queue_count ?? raw.pending_kyc_count ?? raw.kycQueueCount ?? 0),
          investorsCount: Number(raw.investors_count ?? raw.total_investors ?? raw.investorsCount ?? 0),
          totalAumAtCostEur: centsOrEurToEur(
            raw.total_aum_cents ?? raw.aum_cents ?? raw.total_aum_at_cost_cents,
            raw.total_aum_at_cost ?? raw.total_aum ?? raw.aum_eur ?? raw.totalAssetsUnderManagement ?? 0
          ),
          source: 'rpc',
        };
      }
    }
  }

  const pendingDep = fallback.transactions.filter((t) => t.type === 'deposit' && t.status === 'pending');
  const pendingWth = fallback.transactions.filter((t) => t.type === 'withdrawal' && t.status === 'pending');
  const aumCents =
    fallback.investments.length > 0
      ? fallback.investments.reduce((s, i) => s + eurToCents(i.totalCost ?? i.amountEUR ?? i.total_amount_invested ?? 0), 0)
      : fallback.users.reduce((s, u) => s + eurToCents(u.investedBalance || 0), 0);

  return {
    pendingDepositsCount: pendingDep.length,
    pendingDepositsTotalEur: centsToEur(pendingDep.reduce((s, d) => s + eurToCents(d.amount), 0)),
    pendingWithdrawalsCount: pendingWth.length,
    pendingWithdrawalsTotalEur: centsToEur(pendingWth.reduce((s, w) => s + eurToCents(w.amount), 0)),
    kycQueueCount:
      typeof fallback.kycQueueCount === 'number'
        ? fallback.kycQueueCount
        : fallback.users.filter((u) => u.kycStatus === 'pending').length,
    investorsCount: fallback.users.filter((u) => !u.isAdmin && !u.staffRole).length || fallback.users.length,
    totalAumAtCostEur: centsToEur(aumCents),
    source: 'computed',
  };
}

export interface FinanceSummaryBucket {
  count: number;
  totalEur: number;
}

export interface FinanceSummaryResult {
  walletLiabilitiesEur: number;
  pendingDepositsCount: number;
  pendingDepositsTotalEur: number;
  pendingWithdrawalsCount: number;
  pendingWithdrawalsTotalEur: number;
  totalsByKind: Record<string, FinanceSummaryBucket>;
  totalsByStatus: Record<string, FinanceSummaryBucket>;
  from?: string | null;
  to?: string | null;
  source: 'rpc' | 'api' | 'computed';
}

function normalizeSummaryBuckets(rawMap: any): Record<string, FinanceSummaryBucket> {
  const out: Record<string, FinanceSummaryBucket> = {};
  if (!rawMap || typeof rawMap !== 'object') return out;
  for (const [key, val] of Object.entries(rawMap)) {
    const item = val as any;
    if (!item || typeof item !== 'object') continue;
    out[String(key)] = {
      count: Number(item.count || 0),
      totalEur: centsOrEurToEur(item.total_cents ?? item.totalCents, item.totalEur ?? item.total ?? 0),
    };
  }
  return out;
}

export async function fetchFinanceSummary(
  from: string | undefined,
  to: string | undefined,
  fallback: { users: any[]; transactions: any[] }
): Promise<FinanceSummaryResult> {
  const fromIso = from ? new Date(`${from}T00:00:00.000Z`).toISOString() : null;
  const toIso = to ? new Date(`${to}T23:59:59.999Z`).toISOString() : null;

  if (await hasLiveSupabaseSession()) {
    const { data, error } = await supabase.rpc('finance_summary', {
      p_from: fromIso,
      p_to: toIso,
    });
    if (error && !isMissingRpcOrSignatureError(error)) {
      throw new Error(extractDbRefusalMessage(error, 'Failed to load finance summary.'));
    }
    if (!error && data && typeof data === 'object') {
      const raw: any = Array.isArray(data) ? data[0] : data;
      return {
        walletLiabilitiesEur: centsOrEurToEur(
          raw.wallet_liabilities_cents ?? raw.walletLiabilitiesCents,
          raw.wallet_liabilities ?? raw.walletLiabilitiesEur ?? 0
        ),
        pendingDepositsCount: Number(raw.pending_deposits_count ?? 0),
        pendingDepositsTotalEur: centsOrEurToEur(
          raw.pending_deposits_cents ?? raw.pending_deposits_total_cents,
          raw.pending_deposits_total ?? 0
        ),
        pendingWithdrawalsCount: Number(raw.pending_withdrawals_count ?? 0),
        pendingWithdrawalsTotalEur: centsOrEurToEur(
          raw.pending_withdrawals_cents ?? raw.pending_withdrawals_total_cents,
          raw.pending_withdrawals_total ?? 0
        ),
        totalsByKind: normalizeSummaryBuckets(raw.totals_by_kind),
        totalsByStatus: normalizeSummaryBuckets(raw.totals_by_status),
        from: raw.from ?? fromIso,
        to: raw.to ?? toIso,
        source: 'rpc',
      };
    }
  }

  try {
    const qs = new URLSearchParams();
    if (from) qs.set('from', from);
    if (to) qs.set('to', to);
    const suffix = qs.toString() ? `?${qs.toString()}` : '';
    const json = await apiFetchJson(`/admin/finance/summary${suffix}`);
    const d = json?.data;
    if (d && typeof d === 'object') {
      return {
        walletLiabilitiesEur: centsOrEurToEur(
          d.wallet_liabilities_cents ?? d.walletLiabilitiesCents,
          d.wallet_liabilities ?? d.walletLiabilitiesEur ?? 0
        ),
        pendingDepositsCount: Number(d.pending_deposits_count ?? 0),
        pendingDepositsTotalEur: centsOrEurToEur(
          d.pending_deposits_cents ?? d.pending_deposits_total_cents,
          d.pending_deposits_total ?? 0
        ),
        pendingWithdrawalsCount: Number(d.pending_withdrawals_count ?? 0),
        pendingWithdrawalsTotalEur: centsOrEurToEur(
          d.pending_withdrawals_cents ?? d.pending_withdrawals_total_cents,
          d.pending_withdrawals_total ?? 0
        ),
        totalsByKind: normalizeSummaryBuckets(d.totals_by_kind),
        totalsByStatus: normalizeSummaryBuckets(d.totals_by_status),
        from: d.from ?? fromIso,
        to: d.to ?? toIso,
        source: 'api',
      };
    }
  } catch {
    // Fall back to local computation
  }

  const fromMs = fromIso ? new Date(fromIso).getTime() : null;
  const toMs = toIso ? new Date(toIso).getTime() : null;
  const walletLiabilitiesCents = fallback.users
    .filter((u) => !u.isAdmin && !u.staffRole)
    .reduce((sum, u) => sum + eurToCents(u.walletBalance), 0);
  const pendingDep = fallback.transactions.filter((t) => t.type === 'deposit' && t.status === 'pending');
  const pendingWth = fallback.transactions.filter((t) => t.type === 'withdrawal' && t.status === 'pending');
  const kindCents: Record<string, { count: number; cents: number }> = {};
  const statusCents: Record<string, { count: number; cents: number }> = {};
  for (const tx of fallback.transactions) {
    const ts = new Date(tx.createdAt).getTime();
    if (fromMs && ts < fromMs) continue;
    if (toMs && ts > toMs) continue;
    const k = String(tx.type || 'transaction');
    const st = String(tx.status || 'pending');
    const amtCents = eurToCents(tx.amount);
    if (!kindCents[k]) kindCents[k] = { count: 0, cents: 0 };
    kindCents[k].count += 1;
    kindCents[k].cents += amtCents;
    if (!statusCents[st]) statusCents[st] = { count: 0, cents: 0 };
    statusCents[st].count += 1;
    statusCents[st].cents += amtCents;
  }
  const totalsByKind: Record<string, FinanceSummaryBucket> = {};
  for (const [k, v] of Object.entries(kindCents)) totalsByKind[k] = { count: v.count, totalEur: centsToEur(v.cents) };
  const totalsByStatus: Record<string, FinanceSummaryBucket> = {};
  for (const [k, v] of Object.entries(statusCents)) totalsByStatus[k] = { count: v.count, totalEur: centsToEur(v.cents) };
  return {
    walletLiabilitiesEur: centsToEur(walletLiabilitiesCents),
    pendingDepositsCount: pendingDep.length,
    pendingDepositsTotalEur: centsToEur(pendingDep.reduce((s, d) => s + eurToCents(d.amount), 0)),
    pendingWithdrawalsCount: pendingWth.length,
    pendingWithdrawalsTotalEur: centsToEur(pendingWth.reduce((s, w) => s + eurToCents(w.amount), 0)),
    totalsByKind,
    totalsByStatus,
    from: fromIso,
    to: toIso,
    source: 'computed',
  };
}

// ============================================================================
// 2. INVESTORS: wallet_balances, assign_gate, set_frozen, notifications
// ============================================================================
export async function fetchWalletBalancesMap(): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  if (!(await hasLiveSupabaseSession())) return map;
  const { data, error } = await supabase.from('wallet_balances').select('*');
  if (error && !isMissingRpcOrSignatureError(error)) {
    throw new Error(extractDbRefusalMessage(error, 'Failed to load wallet balances.'));
  }
  if (!error && Array.isArray(data)) {
    for (const row of data as any[]) {
      const uid = String(row.user_id || row.id || '');
      if (!uid) continue;
      const eur = centsOrEurToEur(
        row.balance_cents ?? row.available_cents,
        row.balance ?? row.wallet_balance ?? row.available_balance ?? 0
      );
      map.set(uid, eur);
    }
  }
  return map;
}

export async function assignPaymentGateToInvestor(userId: string, gateId: string | null, _gateName?: string): Promise<void> {
  await requireRpcSuccess('assign_gate', { p_users: [userId], p_gate: gateId });
}

export async function setInvestorFrozenState(userId: string, frozen: boolean, _reason?: string): Promise<void> {
  await requireRpcSuccess('set_frozen', { p_user: userId, p_frozen: frozen });
}
// ============================================================================
// 3. KYC: kyc_submissions + signed URL + review_kyc
// ============================================================================
export interface KycSubmissionRow {
  id: string;
  userId: string;
  docType: string;
  filePath: string;
  status: 'pending' | 'approved' | 'rejected';
  reason?: string;
  processedBy?: string;
  processedAt?: string;
  reviewedAt?: string;
  createdAt: string;
  inlineUrl?: string;
}

export async function fetchKycSubmissionsQueue(fallbackDocs: any[] = []): Promise<KycSubmissionRow[]> {
  if (await hasLiveSupabaseSession()) {
    const { data, error } = await supabase
      .from('kyc_submissions')
      .select('*')
      .order('created_at', { ascending: false });
    if (error && !isMissingRpcOrSignatureError(error)) {
      throw new Error(extractDbRefusalMessage(error, 'Failed to load KYC submissions queue.'));
    }
    if (!error && Array.isArray(data)) {
      return (data as any[]).map((r) => ({
        id: String(r.id),
        userId: String(r.user_id),
        docType: String(r.doc_type || 'Identity Document'),
        filePath: String(r.file_path || ''),
        status: r.status === 'approved' || r.status === 'verified' ? 'approved' : r.status === 'rejected' ? 'rejected' : 'pending',
        reason: r.reason || undefined,
        processedBy: r.processed_by || r.reviewed_by || undefined,
        processedAt: r.processed_at || r.reviewed_at || undefined,
        reviewedAt: r.reviewed_at || r.processed_at || undefined,
        createdAt: String(r.created_at || new Date().toISOString()),
      }));
    }
  }
  return fallbackDocs
    .filter((d) => d.category !== 'statement' && d.category !== 'tax')
    .map((d) => ({
      id: String(d.id),
      userId: String(d.userId || ''),
      docType: String(d.documentType || d.category || 'KYC Proof'),
      filePath: String(d.fileName || d.id),
      status: d.status === 'approved' || d.status === 'verified' ? 'approved' : d.status === 'rejected' ? 'rejected' : 'pending',
      reason: d.rejectionReason || undefined,
      createdAt: String(d.uploadedAt || new Date().toISOString()),
      inlineUrl: d.fileUrl || undefined,
    }));
}

export async function createPrivateBucketSignedUrl(
  filePath: string,
  bucketCandidates: string[] = ['kyc', 'kyc-submissions', 'documents', 'manual-payment-proofs'],
  fallbackUrl?: string
): Promise<string | null> {
  if (fallbackUrl && (fallbackUrl.startsWith('data:') || fallbackUrl.startsWith('http'))) {
    return fallbackUrl;
  }
  if (!filePath) return null;
  if (/^https?:\/\//i.test(filePath) || filePath.startsWith('data:')) return filePath;
  if (await hasLiveSupabaseSession()) {
    const cleanPath = filePath.replace(/^\/+/, '');
    for (const bucket of bucketCandidates) {
      const pathVariants = cleanPath.startsWith(`${bucket}/`)
        ? [cleanPath, cleanPath.slice(bucket.length + 1)]
        : [cleanPath];
      for (const candidatePath of pathVariants) {
        if (!candidatePath) continue;
        try {
          const { data, error } = await supabase.storage.from(bucket).createSignedUrl(candidatePath, 120);
          if (!error && data?.signedUrl) return data.signedUrl;
        } catch {
          // Try next path/bucket
        }
      }
    }
  }
  return null;
}

export async function reviewKycSubmission(
  submissionId: string,
  approve: boolean,
  reason: string | undefined,
  _userIdForFallback: string
): Promise<string | undefined> {
  if (!approve && (!reason || !reason.trim())) {
    throw new Error('A rejection reason is required.');
  }
  const res = await requireRpcSuccess<any>('review_kyc', {
    p_sub: submissionId,
    p_approve: approve,
    p_reason: reason?.trim() || null,
  });
  if (typeof res === 'string' && res.trim()) return res.trim();
  if (res && typeof res === 'object') {
    const candidate = res.kyc_status ?? res.overall_status ?? res.status ?? res.investor_kyc_status;
    if (typeof candidate === 'string' && candidate.trim()) return candidate.trim();
  }
  return undefined;
}
// ============================================================================
// 4. DEPOSITS: approve_deposit, reject_deposit, admin_credit_deposit
// ============================================================================
export async function approveDepositSubmission(
  depositId: string,
  actualAmountEur?: number,
  _isManualSubmission = false
): Promise<void> {
  let receivedCents: number | undefined;
  if (actualAmountEur !== undefined) {
    receivedCents = eurToCents(actualAmountEur);
    if (!Number.isSafeInteger(receivedCents) || receivedCents <= 0) {
      throw new Error('Amount actually received must be greater than zero.');
    }
  }
  const payload: Record<string, any> = { tx_id: depositId };
  if (receivedCents !== undefined) {
    payload.received_cents = receivedCents;
  }
  await requireRpcSuccess('approve_deposit', payload);
}

export async function rejectDepositSubmission(
  depositId: string,
  reason: string,
  _isManualSubmission = false
): Promise<void> {
  const cleanReason = reason.trim();
  if (!cleanReason) throw new Error('A rejection reason is required.');
  await requireRpcSuccess('reject_deposit', {
    tx_id: depositId,
    reason: cleanReason,
  });
}

export async function recordManualDepositRpc(params: {
  userId: string;
  amountEur: number;
  note?: string;
}): Promise<void> {
  const amountCents = eurToCents(params.amountEur);
  if (!Number.isSafeInteger(amountCents) || amountCents <= 0) {
    throw new Error('Manual deposit amount must be greater than zero.');
  }
  await requireRpcSuccess('admin_credit_deposit', {
    p_user: params.userId,
    p_amount: amountCents,
    p_note: params.note?.trim() || null,
  });
}

// ============================================================================
// 5. WITHDRAWALS & CORRECTIONS: approve_withdrawal, reject_withdrawal,
//    admin_charge_fee, admin_adjust, reverse_transaction
// ============================================================================
export async function approveWithdrawalRequest(
  withdrawalId: string,
  payoutRef: string,
  feeEur: number = 0
): Promise<void> {
  const cleanRef = String(payoutRef || '').trim();
  if (!cleanRef) {
    throw new Error('Payout reference is required.');
  }
  const feeCents = Math.max(0, eurToCents(feeEur));
  if (!Number.isSafeInteger(feeCents)) {
    throw new Error('Withdrawal fee must be a valid integer number of cents.');
  }
  await requireRpcSuccess('approve_withdrawal', {
    p_tx: withdrawalId,
    p_payout_ref: cleanRef,
    p_fee_cents: feeCents,
  });
}

export async function rejectWithdrawalRequest(withdrawalId: string, reason: string): Promise<void> {
  const cleanReason = reason.trim();
  if (!cleanReason) throw new Error('A rejection reason is required.');
  await requireRpcSuccess('reject_withdrawal', {
    p_tx: withdrawalId,
    p_reason: cleanReason,
  });
}

export async function adminChargeFeeRpc(params: {
  userId: string;
  amountEur: number;
  reason?: string;
}): Promise<void> {
  const amountCents = eurToCents(params.amountEur);
  if (!Number.isSafeInteger(amountCents) || amountCents <= 0) {
    throw new Error('Fee amount must be greater than zero.');
  }
  await requireRpcSuccess('admin_charge_fee', {
    p_user: params.userId,
    p_amount: amountCents,
    p_reason: params.reason?.trim() || null,
  });
}

export async function adminAdjustBalanceRpc(params: {
  userId: string;
  deltaEur: number;
  reason: string;
}): Promise<void> {
  const amountCents = eurToCents(params.deltaEur);
  if (!Number.isSafeInteger(amountCents) || amountCents === 0) {
    throw new Error('Adjustment amount must be a non-zero integer number of cents.');
  }
  const cleanReason = params.reason.trim();
  if (!cleanReason) {
    throw new Error('An adjustment reason is required.');
  }
  await requireRpcSuccess('admin_adjust', {
    p_user: params.userId,
    p_amount: amountCents,
    p_reason: cleanReason,
  });
}

export async function reverseTransactionRpc(params: {
  transactionId: string;
  reason: string;
}): Promise<void> {
  const cleanReason = params.reason.trim();
  if (!cleanReason) {
    throw new Error('A reversal reason is required.');
  }
  await requireRpcSuccess('reverse_transaction', {
    p_tx: params.transactionId,
    p_reason: cleanReason,
  });
}// ============================================================================
// 6. PROPERTIES: Supabase properties table + photo storage upload
// ============================================================================
export interface SupabasePropertyRow {
  id: string;
  name: string;
  city: string;
  type: string;
  share_price_cents: number;
  funding_target_cents: number;
  target_yield: number;
  target_irr: number;
  term: string;
  description: string;
  photos: string[];
  funded_pct: number;
  status: 'draft' | 'open' | 'closed';
  created_at?: string;
}

export async function fetchSupabaseProperties(): Promise<SupabasePropertyRow[] | null> {
  if (!(await hasLiveSupabaseSession())) return null;
  try {
    const { data, error } = await supabase
      .from('properties')
      .select('*')
      .order('created_at', { ascending: false });
    if (error || !Array.isArray(data)) return null;
    return (data as any[]).map((r) => ({
      id: String(r.id),
      name: String(r.name || ''),
      city: String(r.city || ''),
      type: String(r.type || 'Residential'),
      share_price_cents: Number(r.share_price_cents || 0),
      funding_target_cents: Number(r.funding_target_cents || 0),
      target_yield: Number(r.target_yield || 0),
      target_irr: Number(r.target_irr || 0),
      term: String(r.term || '36 months'),
      description: String(r.description || ''),
      photos: Array.isArray(r.photos) ? r.photos.map(String) : [],
      funded_pct: Number(r.funded_pct || 0),
      status: (['draft', 'open', 'closed'].includes(String(r.status).toLowerCase())
        ? String(r.status).toLowerCase()
        : 'open') as 'draft' | 'open' | 'closed',
      created_at: r.created_at,
    }));
  } catch {
    return null;
  }
}

export async function uploadPropertyPhotoFile(file: File): Promise<string> {
  const safeName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
  if (await hasLiveSupabaseSession()) {
    for (const bucket of ['properties', 'property-photos', 'public']) {
      try {
        const path = `photos/${safeName}`;
        const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: true });
        if (!error) {
          const { data: pub } = supabase.storage.from(bucket).getPublicUrl(path);
          if (pub?.publicUrl) return pub.publicUrl;
        }
      } catch {
        // Try next bucket
      }
    }
  }
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Failed to read image file.'));
    reader.readAsDataURL(file);
  });
}

export async function upsertSupabaseProperty(
  payload: Omit<SupabasePropertyRow, 'id' | 'created_at'>,
  existingId?: string
): Promise<SupabasePropertyRow | null> {
  if (await hasLiveSupabaseSession()) {
    const record = {
      name: payload.name,
      city: payload.city,
      type: payload.type,
      share_price_cents: Math.round(payload.share_price_cents),
      funding_target_cents: Math.round(payload.funding_target_cents),
      target_yield: payload.target_yield,
      target_irr: payload.target_irr,
      term: payload.term,
      description: payload.description,
      photos: payload.photos,
      funded_pct: Math.min(100, Math.max(0, Math.round(payload.funded_pct))),
      status: payload.status,
    };
    const res = existingId
      ? await supabase.from('properties').update(record).eq('id', existingId).select('*').maybeSingle()
      : await supabase.from('properties').insert(record).select('*').maybeSingle();
    if (!res.error && res.data) {
      return res.data as SupabasePropertyRow;
    }
  }
  return null;
}

// ============================================================================
// 7. INVESTMENTS & INVESTMENT REQUESTS: record_investment, approve_investment_request, reject_investment_request
// ============================================================================
export interface InvestmentRequestRow {
  id: string;
  userId: string;
  propertyId: string;
  shares: number;
  amountCents: number;
  status: 'pending' | 'approved' | 'rejected';
  reason?: string;
  processedBy?: string;
  processedAt?: string;
  createdAt: string;
  reviewedAt?: string;
}

export async function fetchInvestmentRequestsQueue(): Promise<InvestmentRequestRow[]> {
  if (!(await hasLiveSupabaseSession())) return [];
  const { data, error } = await supabase
    .from('investment_requests')
    .select('*')
    .order('created_at', { ascending: false });
  if (error && !isMissingRpcOrSignatureError(error)) {
    throw new Error(extractDbRefusalMessage(error, 'Failed to load investment requests queue.'));
  }
  if (error || !Array.isArray(data)) return [];
  return (data as any[]).map((r) => {
    const rawStatus = String(r.status || 'pending').toLowerCase();
    const status: 'pending' | 'approved' | 'rejected' =
      rawStatus === 'approved' || rawStatus === 'completed'
        ? 'approved'
        : rawStatus === 'rejected' || rawStatus === 'declined'
        ? 'rejected'
        : 'pending';
    const amountCents =
      r.amount_cents !== undefined && r.amount_cents !== null
        ? Math.round(Number(r.amount_cents))
        : r.total_cents !== undefined && r.total_cents !== null
        ? Math.round(Number(r.total_cents))
        : eurToCents(r.amount_eur ?? r.amount ?? 0);
    return {
      id: String(r.id),
      userId: String(r.user_id || r.userId || ''),
      propertyId: String(r.property_id || r.propertyId || ''),
      shares: Number(r.shares ?? r.tokens ?? r.tokens_requested ?? 0),
      amountCents,
      status,
      reason: r.reason || r.rejection_reason || undefined,
      processedBy: r.processed_by || r.reviewed_by || undefined,
      processedAt: r.processed_at || r.reviewed_at || undefined,
      createdAt: String(r.created_at || new Date().toISOString()),
      reviewedAt: r.reviewed_at || r.processed_at || undefined,
    };
  });
}

export async function approveInvestmentRequestRpc(requestId: string): Promise<void> {
  await requireRpcSuccess('approve_investment_request', { p_req: requestId });
}

export async function rejectInvestmentRequestRpc(requestId: string, reason: string): Promise<void> {
  const cleanReason = reason.trim();
  if (!cleanReason) {
    throw new Error('A rejection reason is required.');
  }
  await requireRpcSuccess('reject_investment_request', {
    p_req: requestId,
    p_reason: cleanReason,
  });
}

export async function recordInvestmentRpc(params: {
  userId: string;
  propertyId: string;
  shares: number;
  sharePriceEur: number;
}): Promise<void> {
  if (!Number.isSafeInteger(params.shares) || params.shares <= 0) {
    throw new Error('Share quantity must be a positive integer.');
  }
  await requireRpcSuccess('record_investment', {
    p_user: params.userId,
    p_property: params.propertyId,
    p_shares: params.shares,
  });
}
// ============================================================================
// 8. DISTRIBUTIONS: pay_distribution & distributions list
// ============================================================================
export interface PastDistributionRow {
  id: string;
  propertyId: string;
  totalEur: number;
  note?: string;
  createdBy?: string;
  createdAt: string;
}

export async function fetchPastDistributions(): Promise<PastDistributionRow[]> {
  if (await hasLiveSupabaseSession()) {
    const { data, error } = await supabase
      .from('distributions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);
    if (error && !isMissingRpcOrSignatureError(error)) {
      throw new Error(extractDbRefusalMessage(error, 'Failed to load past distributions.'));
    }
    if (!error && Array.isArray(data)) {
      return (data as any[]).map((r) => ({
        id: String(r.id),
        propertyId: String(r.property_id || ''),
        totalEur: centsToEur(Math.round(Number(r.total_cents || 0))),
        note: r.note || undefined,
        createdBy: r.created_by || undefined,
        createdAt: String(r.created_at || new Date().toISOString()),
      }));
    }
  }
  return [];
}

export async function executePayDistribution(params: {
  propertyId: string;
  totalAmountEur: number;
  note?: string;
}): Promise<{ paidCount: number; totalAmountEur: number; message: string }> {
  const totalCents = parseStrictEurToCents(params.totalAmountEur);
  if (totalCents === null || !Number.isSafeInteger(totalCents) || totalCents <= 0) {
    throw new Error('Distribution amount must be a positive integer number of cents.');
  }
  const data = await requireRpcSuccess<any>('pay_distribution', {
    p_property: params.propertyId,
    p_total: totalCents,
    p_note: params.note?.trim() || null,
  });
  const paidCount = Number(
    data?.paid_count ?? data?.investors_paid ?? data?.count ?? (typeof data === 'number' ? data : 0)
  );
  return {
    paidCount,
    totalAmountEur: centsToEur(totalCents),
    message: `Distribution executed: ${paidCount} investor${paidCount === 1 ? '' : 's'} paid.`,
  };
}
// ============================================================================
// 10. DOCUMENTS: private "documents" bucket + documents table
// ============================================================================
export interface InvestorDocumentRow {
  id: string;
  userId: string;
  title: string;
  filePath: string;
  createdAt: string;
  inlineUrl?: string;
}

export async function fetchInvestorDocumentsTable(fallbackDocs: any[] = []): Promise<InvestorDocumentRow[]> {
  if (await hasLiveSupabaseSession()) {
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .order('created_at', { ascending: false });
    if (error && !isMissingRpcOrSignatureError(error)) {
      throw new Error(extractDbRefusalMessage(error, 'Failed to load investor documents.'));
    }
    if (!error && Array.isArray(data)) {
      return (data as any[]).map((r) => ({
        id: String(r.id),
        userId: String(r.user_id || ''),
        title: String(r.title || 'Investor Document'),
        filePath: String(r.file_path || r.file_name || ''),
        createdAt: String(r.created_at || r.uploaded_at || new Date().toISOString()),
        inlineUrl: r.file_data_url || undefined,
      }));
    }
  }
  return fallbackDocs.map((d) => ({
    id: String(d.id),
    userId: String(d.userId || ''),
    title: String(d.title || d.fileName || 'Document'),
    filePath: String(d.fileName || d.id),
    createdAt: String(d.uploadedAt || new Date().toISOString()),
    inlineUrl: d.fileUrl || undefined,
  }));
}

export async function uploadPdfToDocumentsBucket(userId: string, title: string, file: File): Promise<void> {
  if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
    throw new Error('Only PDF documents are permitted in the investor document vault.');
  }
  if (await hasLiveSupabaseSession()) {
    const cleanName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = `${userId}/${Date.now()}-${cleanName}`;
    const { error: uploadError } = await supabase.storage
      .from('documents')
      .upload(storagePath, file, { contentType: 'application/pdf', upsert: false });
    if (uploadError) {
      throw new Error(uploadError.message || 'Unable to upload PDF to documents bucket.');
    }
    const { error: rowError } = await supabase.from('documents').insert({
      user_id: userId,
      title: title.trim(),
      file_path: storagePath,
    });
    if (rowError) {
      await supabase.storage.from('documents').remove([storagePath]).catch(() => {});
      throw new Error(rowError.message || 'Failed to save document metadata row.');
    }
    return;
  }

  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Failed to read PDF file.'));
    reader.readAsDataURL(file);
  });
  await apiFetchJson('/admin/documents/upload', {
    method: 'POST',
    body: JSON.stringify({
      userId,
      title: title.trim(),
      fileName: file.name,
      fileSize: file.size,
      fileDataUrl: dataUrl,
    }),
  });
}

export async function deleteInvestorDocumentRecord(doc: InvestorDocumentRow): Promise<void> {
  if (await hasLiveSupabaseSession()) {
    if (doc.filePath && doc.filePath.includes('/')) {
      await supabase.storage.from('documents').remove([doc.filePath]).catch(() => {});
    }
    const { error } = await supabase.from('documents').delete().eq('id', doc.id);
    if (!error) return;
  }
  await apiFetchJson(`/admin/documents/${encodeURIComponent(doc.id)}`, { method: 'DELETE' });
}

// ============================================================================
// 11. NOTIFICATIONS: insert into notifications (user_id null for broadcast)
// ============================================================================
export async function sendAdminNotificationRecord(params: {
  userId: string | 'all';
  title: string;
  message: string;
  type?: 'info' | 'success' | 'warning';
}): Promise<void> {
  if (await hasLiveSupabaseSession()) {
    const { error } = await supabase.from('notifications').insert({
      user_id: params.userId === 'all' ? null : params.userId,
      title: params.title.trim(),
      body: params.message.trim(),
    });
    if (!error) return;
  }
  await apiFetchJson('/admin/notifications', {
    method: 'POST',
    body: JSON.stringify({
      userId: params.userId,
      title: params.title.trim(),
      message: params.message.trim(),
      type: params.type || 'info',
    }),
  });
}

export async function fetchAdminNotificationsTable(): Promise<any[] | null> {
  if (!(await hasLiveSupabaseSession())) return null;
  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);
    if (error || !Array.isArray(data)) return null;
    return (data as any[]).map((r) => ({
      id: String(r.id),
      userId: r.user_id ? String(r.user_id) : 'all',
      title: String(r.title || ''),
      message: String(r.body ?? r.message ?? ''),
      type: (r.type || 'info') as 'info' | 'success' | 'warning',
      read: Boolean(r.read),
      createdAt: String(r.created_at || new Date().toISOString()),
    }));
  } catch {
    return null;
  }
}

// ============================================================================
// 13. STAFF & ROLES: set_staff_role
// ============================================================================
export async function assignStaffRoleRpc(userId: string, role: string | null): Promise<void> {
  await requireRpcSuccess('set_staff_role', { p_user: userId, p_role: role ?? '' });
}
// ============================================================================
// 14. SETTINGS ("limits", "email_templates") & PAYMENT GATES
// ============================================================================
export interface GateDetailRow {
  label: string;
  value: string;
}

export interface PaymentGateRecord {
  id: string;
  name: string;
  method: string;
  details: GateDetailRow[];
  instructions: string;
  active: boolean;
  assignedCount: number;
  source: 'payment_gates' | 'manual_payment_methods';
}

export async function fetchSettingsRows(): Promise<{ limits: any; email_templates: any }> {
  const defaultLimits = {
    min_deposit_eur: 100,
    max_deposit_eur: 500000,
    min_withdrawal_eur: 250,
    max_withdrawal_eur: 250000,
    min_investment_eur: 500,
    withdrawal_fee_pct: 0,
    withdrawal_fee_eur: 0,
    require_kyc_for_withdrawal: true,
  };
  const defaultTemplates = {
    deposit_approved: {
      subject: "Your L'Agence deposit has been credited",
      body: 'Your deposit of {{amount}} EUR (ref {{reference}}) has settled into your treasury wallet.',
    },
    withdrawal_paid: {
      subject: "Your L'Agence withdrawal has been dispatched",
      body: 'Your wire transfer of {{amount}} EUR has been sent to your verified IBAN.',
    },
    kyc_approved: {
      subject: 'Identity Verification Approved',
      body: 'Your KYC dossier has been approved. Full investment and withdrawal functionality is active.',
    },
  };

  if (await hasLiveSupabaseSession()) {
    try {
      const { data, error } = await supabase
        .from('settings')
        .select('key, value')
        .in('key', ['limits', 'email_templates']);
      if (!error && Array.isArray(data)) {
        const limitsRow = (data as any[]).find((r) => r.key === 'limits');
        const templatesRow = (data as any[]).find((r) => r.key === 'email_templates');
        return {
          limits: { ...defaultLimits, ...(limitsRow?.value || {}) },
          email_templates: templatesRow?.value ?? defaultTemplates,
        };
      }
    } catch {
      // Fallback below
    }
  }

  try {
    const json = await apiFetchJson('/admin/settings');
    const cfg = json?.data || {};
    return {
      limits: {
        ...defaultLimits,
        min_investment_eur: cfg.minInvestment ?? 500,
        max_withdrawal_eur: cfg.maxInvestmentPerInvestor ?? 250000,
        ...(cfg.limits || {}),
      },
      email_templates: cfg.email_templates || defaultTemplates,
    };
  } catch {
    return { limits: defaultLimits, email_templates: defaultTemplates };
  }
}

export async function saveSettingsRow(key: 'limits' | 'email_templates', value: any): Promise<void> {
  if (await hasLiveSupabaseSession()) {
    const { error } = await supabase
      .from('settings')
      .upsert({ key, value }, { onConflict: 'key' });
    if (!error) return;
  }
  await apiFetchJson('/admin/settings', {
    method: 'PUT',
    body: JSON.stringify(
      key === 'limits'
        ? { minInvestment: Number(value?.min_investment_eur || 500), limits: value }
        : { email_templates: value }
    ),
  });
}

export async function fetchPaymentGatesWithCounts(users: any[]): Promise<PaymentGateRecord[]> {
  const assignedCounts = new Map<string, number>();
  for (const u of users) {
    if (u.assignedGateId) {
      assignedCounts.set(String(u.assignedGateId), (assignedCounts.get(String(u.assignedGateId)) || 0) + 1);
    }
  }

  if (await hasLiveSupabaseSession()) {
    try {
      const { data: pgData, error: pgErr } = await supabase.from('payment_gates').select('*').order('name');
      if (!pgErr && Array.isArray(pgData)) {
        return (pgData as any[]).map((g) => {
          const detailsArr: GateDetailRow[] = Array.isArray(g.details)
            ? g.details.map((d: any) => ({ label: String(d.label || ''), value: String(d.value || '') }))
            : g.details && typeof g.details === 'object'
            ? Object.entries(g.details).map(([label, value]) => ({ label, value: String(value ?? '') }))
            : [];
          return {
            id: String(g.id),
            name: String(g.name || 'Payment Gate'),
            method: String(g.method || 'bank_wire'),
            details: detailsArr,
            instructions: String(g.instructions || ''),
            active: g.active !== false,
            assignedCount: assignedCounts.get(String(g.id)) || Number(g.assigned_count || 0),
            source: 'payment_gates',
          };
        });
      }
    } catch {
      // Try manual-payments admin methods next
    }
  }

  try {
    const json = await apiFetchJson('/manual-payments/admin/methods');
    const list = Array.isArray(json?.data) ? json.data : [];
    return list.map((m: any) => {
      const detailSource = m.detail_rows || m.detailRows || m.account_details || m.accountDetails || {};
      const detailsArr: GateDetailRow[] = Array.isArray(detailSource)
        ? detailSource.map((d: any) => ({ label: String(d.label || ''), value: String(d.value || '') }))
        : Object.entries(detailSource).map(([label, value]) => ({ label, value: String(value ?? '') }));
      return {
        id: String(m.id),
        name: String(m.name || 'Payment Gate'),
        method: String(m.method || m.fee_type || 'sepa'),
        details: detailsArr,
        instructions: String(m.instructions || ''),
        active: m.enabled !== false && m.active !== false,
        assignedCount: assignedCounts.get(String(m.id)) || Number(m.assigned_investors_count || 0),
        source: 'manual_payment_methods',
      };
    });
  } catch {
    return [];
  }
}

export async function savePaymentGateRecord(
  gate: { id?: string; name: string; method: string; details: GateDetailRow[]; instructions: string; active: boolean },
  source: 'payment_gates' | 'manual_payment_methods' = 'manual_payment_methods'
): Promise<void> {
  const cleanDetails = gate.details.filter((d) => d.label.trim() || d.value.trim());
  if (source === 'payment_gates' && (await hasLiveSupabaseSession())) {
    const row = {
      name: gate.name.trim(),
      method: gate.method.trim(),
      details: cleanDetails,
      instructions: gate.instructions.trim(),
      active: gate.active,
    };
    const res = gate.id
      ? await supabase.from('payment_gates').update(row).eq('id', gate.id)
      : await supabase.from('payment_gates').insert(row);
    if (!res.error) return;
  }

  const accountDetailsMap: Record<string, string> = {};
  for (const row of cleanDetails) {
    if (row.label.trim()) accountDetailsMap[row.label.trim()] = row.value.trim();
  }
  const payload = {
    name: gate.name.trim(),
    method: gate.method.trim() || 'sepa',
    instructions: gate.instructions.trim() || 'Reference your investor code in the wire memo.',
    detailRows: cleanDetails,
    accountDetails: accountDetailsMap,
    enabled: gate.active,
    active: gate.active,
    minimumAmount: 100,
    feeType: 'none',
    feeValue: 0,
    extraFields: [],
  };
  await apiFetchJson(
    gate.id ? `/manual-payments/admin/methods/${encodeURIComponent(gate.id)}` : '/manual-payments/admin/methods',
    {
      method: gate.id ? 'PATCH' : 'POST',
      body: JSON.stringify(payload),
    }
  );
}

export async function deletePaymentGateRecord(gate: PaymentGateRecord): Promise<void> {
  if (gate.assignedCount > 0) {
    throw new Error('This payment gate is currently assigned to investors and cannot be deleted. Deactivate it instead.');
  }
  if (gate.source === 'payment_gates' && (await hasLiveSupabaseSession())) {
    const { error } = await supabase.from('payment_gates').delete().eq('id', gate.id);
    if (!error) return;
  }
  await apiFetchJson(`/manual-payments/admin/methods/${encodeURIComponent(gate.id)}`, { method: 'DELETE' });
}

// ============================================================================
// 15. AUDIT LOG: read-only audit_log with actor, entity, date filters
// ============================================================================
export interface AuditLogRow {
  id: string;
  actor: string;
  action: string;
  entity: string;
  entityId: string;
  details: any;
  createdAt: string;
}

export async function fetchAuditLogRows(): Promise<AuditLogRow[]> {
  if (await hasLiveSupabaseSession()) {
    const { data, error } = await supabase
      .from('audit_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(300);
    if (error && !isMissingRpcOrSignatureError(error)) {
      throw new Error(extractDbRefusalMessage(error, 'Failed to load audit logs.'));
    }
    if (!error && Array.isArray(data)) {
      return (data as any[]).map((r) => ({
        id: String(r.id),
        actor: String(r.actor || r.actor_email || r.actor_id || 'System'),
        action: String(r.action || 'ACTION'),
        entity: String(r.entity || r.entity_type || 'system'),
        entityId: String(r.entity_id || '—'),
        details: r.details ?? {},
        createdAt: String(r.created_at || new Date().toISOString()),
      }));
    }
  }
  try {
    const json = await apiFetchJson('/admin/audit-logs');
    const rows = Array.isArray(json?.data) ? json.data : [];
    return rows.map((r: any) => ({
      id: String(r.id),
      actor: String(r.adminEmail || r.actorEmail || r.actorId || r.adminId || 'System'),
      action: String(r.action || 'EVENT'),
      entity: String(r.entityType || r.entity || (Array.isArray(r.affectedSections) ? r.affectedSections[0] : '') || 'platform'),
      entityId: String(r.entityId || '—'),
      details: r.details || r.metadata || {},
      createdAt: String(r.timestamp || r.createdAt || new Date().toISOString()),
    }));
  } catch {
    return [];
  }
}
