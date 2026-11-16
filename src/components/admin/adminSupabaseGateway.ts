import { supabase, isSupabaseConfigured } from '../../lib/supabaseClient';
import { getApiUrl, getAuthToken } from '../../lib/api';

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
    throw new Error(json?.error || `Request failed (${res.status})`);
  }
  return json;
}

async function requireRpcSuccess<T = unknown>(functionName: string, attempts: Array<Record<string, any>>): Promise<T> {
  if (!(await hasLiveSupabaseSession())) {
    throw new Error('A signed-in Supabase session is required for this administrative action.');
  }
  let lastError: any = null;
  for (const args of attempts) {
    const { data, error } = await supabase.rpc(functionName, args);
    if (!error) return data as T;
    lastError = error;
  }
  const message = lastError?.message || lastError?.details || lastError?.hint;
  throw new Error(message || `Database function ${functionName} refused the request.`);
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
    return Number(centsVal) / 100;
  }
  return Number(eurVal || 0);
};

export async function fetchAdminStats(fallback: {
  users: any[];
  transactions: any[];
  investments: any[];
  kycQueueCount?: number;
}): Promise<AdminStatsSummary> {
  if (await hasLiveSupabaseSession()) {
    try {
      const { data, error } = await supabase.rpc('admin_stats');
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
    } catch {
      // Fall back cleanly if RPC is unavailable in local dev mode
    }
  }

  const pendingDep = fallback.transactions.filter((t) => t.type === 'deposit' && t.status === 'pending');
  const pendingWth = fallback.transactions.filter((t) => t.type === 'withdrawal' && t.status === 'pending');
  const aum =
    fallback.investments.length > 0
      ? fallback.investments.reduce((s, i) => s + Number(i.totalCost ?? i.amountEUR ?? i.total_amount_invested ?? 0), 0)
      : fallback.users.reduce((s, u) => s + Number(u.investedBalance || 0), 0);

  return {
    pendingDepositsCount: pendingDep.length,
    pendingDepositsTotalEur: pendingDep.reduce((s, d) => s + Number(d.amount || 0), 0),
    pendingWithdrawalsCount: pendingWth.length,
    pendingWithdrawalsTotalEur: pendingWth.reduce((s, w) => s + Number(w.amount || 0), 0),
    kycQueueCount:
      typeof fallback.kycQueueCount === 'number'
        ? fallback.kycQueueCount
        : fallback.users.filter((u) => u.kycStatus === 'pending').length,
    investorsCount: fallback.users.filter((u) => !u.isAdmin && !u.staffRole).length || fallback.users.length,
    totalAumAtCostEur: aum,
    source: 'computed',
  };
}

// ============================================================================
// 2. INVESTORS: wallet_balances, assign_gate, set_frozen, notifications
// ============================================================================
export async function fetchWalletBalancesMap(): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  if (!(await hasLiveSupabaseSession())) return map;
  try {
    const { data, error } = await supabase.from('wallet_balances').select('*');
    if (!error && Array.isArray(data)) {
      for (const row of data as any[]) {
        const uid = String(row.user_id || row.id || '');
        if (!uid) continue;
        const eur =
          row.balance_cents !== undefined
            ? Number(row.balance_cents) / 100
            : row.available_cents !== undefined
            ? Number(row.available_cents) / 100
            : Number(row.balance ?? row.wallet_balance ?? row.available_balance ?? 0);
        map.set(uid, eur);
      }
    }
  } catch {
    // View optional when using profiles.wallet_balance
  }
  return map;
}

export async function assignPaymentGateToInvestor(userId: string, gateId: string | null, _gateName?: string): Promise<void> {
  await requireRpcSuccess('assign_gate', [
    { p_user: userId, p_gate: gateId },
    { p_user_id: userId, p_gate_id: gateId },
  ]);
}
export async function setInvestorFrozenState(userId: string, frozen: boolean, _reason?: string): Promise<void> {
  await requireRpcSuccess('set_frozen', [{ p_user: userId, p_frozen: frozen }]);
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
  reviewedAt?: string;
  createdAt: string;
  inlineUrl?: string;
}

export async function fetchKycSubmissionsQueue(fallbackDocs: any[] = []): Promise<KycSubmissionRow[]> {
  if (await hasLiveSupabaseSession()) {
    try {
      const { data, error } = await supabase
        .from('kyc_submissions')
        .select('*')
        .order('created_at', { ascending: false });
      if (!error && Array.isArray(data)) {
        return (data as any[]).map((r) => ({
          id: String(r.id),
          userId: String(r.user_id),
          docType: String(r.doc_type || 'Identity Document'),
          filePath: String(r.file_path || ''),
          status: r.status === 'approved' || r.status === 'verified' ? 'approved' : r.status === 'rejected' ? 'rejected' : 'pending',
          reason: r.reason || undefined,
          reviewedAt: r.reviewed_at || undefined,
          createdAt: String(r.created_at || new Date().toISOString()),
        }));
      }
    } catch {
      // Fallback below
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
    for (const bucket of bucketCandidates) {
      try {
        const { data, error } = await supabase.storage.from(bucket).createSignedUrl(filePath, 120);
        if (!error && data?.signedUrl) return data.signedUrl;
      } catch {
        // Try next bucket
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
): Promise<void> {
  if (!approve && (!reason || !reason.trim())) {
    throw new Error('A rejection reason is required.');
  }
  await requireRpcSuccess('review_kyc', [{
    p_sub: submissionId,
    p_approve: approve,
    p_reason: reason?.trim() || null,
  }]);
}
// ============================================================================
// 4. DEPOSITS: approve_deposit (editable received amount) & reject_deposit
// ============================================================================
export async function approveDepositSubmission(
  depositId: string,
  actualAmountEur: number,
  _isManualSubmission = false
): Promise<void> {
  if (!Number.isFinite(actualAmountEur) || actualAmountEur <= 0) {
    throw new Error('Amount actually received must be greater than zero.');
  }
  const amountCents = Math.round(actualAmountEur * 100);
  if (!Number.isSafeInteger(amountCents) || amountCents <= 0) {
    throw new Error('The received amount is outside the supported cents range.');
  }
  await requireRpcSuccess('approve_deposit', [
    { p_id: depositId, p_amount_cents: amountCents },
    { p_deposit: depositId, p_amount_cents: amountCents },
    { p_deposit_id: depositId, p_amount_cents: amountCents },
  ]);
}
export async function rejectDepositSubmission(
  depositId: string,
  reason: string,
  _isManualSubmission = false
): Promise<void> {
  if (!reason.trim()) throw new Error('A rejection reason is required.');
  await requireRpcSuccess('reject_deposit', [
    { p_id: depositId, p_reason: reason.trim() },
    { p_deposit: depositId, p_reason: reason.trim() },
    { p_deposit_id: depositId, p_reason: reason.trim() },
  ]);
}
// ============================================================================
// 5. WITHDRAWALS: approve_withdrawal & reject_withdrawal
// ============================================================================
export async function approveWithdrawalRequest(withdrawalId: string): Promise<void> {
  await requireRpcSuccess('approve_withdrawal', [
    { p_id: withdrawalId },
    { p_withdrawal: withdrawalId },
    { p_withdrawal_id: withdrawalId },
  ]);
}
export async function rejectWithdrawalRequest(withdrawalId: string, reason: string): Promise<void> {
  if (!reason.trim()) throw new Error('A rejection reason is required.');
  await requireRpcSuccess('reject_withdrawal', [
    { p_id: withdrawalId, p_reason: reason.trim() },
    { p_withdrawal: withdrawalId, p_reason: reason.trim() },
    { p_withdrawal_id: withdrawalId, p_reason: reason.trim() },
  ]);
}
// ============================================================================
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
// 7. INVESTMENTS: record_investment
// ============================================================================
export async function recordInvestmentRpc(params: {
  userId: string;
  propertyId: string;
  shares: number;
  sharePriceEur: number;
}): Promise<void> {
  if (!Number.isSafeInteger(params.shares) || params.shares <= 0) {
    throw new Error('Share quantity must be a positive integer.');
  }
  await requireRpcSuccess('record_investment', [
    { p_user: params.userId, p_property: params.propertyId, p_shares: params.shares },
    { p_user_id: params.userId, p_property_id: params.propertyId, p_shares: params.shares },
  ]);
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
    try {
      const { data, error } = await supabase
        .from('distributions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      if (!error && Array.isArray(data)) {
        return (data as any[]).map((r) => ({
          id: String(r.id),
          propertyId: String(r.property_id || ''),
          totalEur: Number(r.total_cents || 0) / 100,
          note: r.note || undefined,
          createdBy: r.created_by || undefined,
          createdAt: String(r.created_at || new Date().toISOString()),
        }));
      }
    } catch {
      // Fallback below
    }
  }
  return [];
}

export async function executePayDistribution(params: {
  propertyId: string;
  totalAmountEur: number;
  note?: string;
}): Promise<{ paidCount: number; totalAmountEur: number; message: string }> {
  const totalCents = Math.round(params.totalAmountEur * 100);
  if (await hasLiveSupabaseSession()) {
    const { data, error } = await supabase.rpc('pay_distribution', {
      p_property: params.propertyId,
      p_total: totalCents,
      p_note: params.note?.trim() || null,
    });
    if (!error) {
      const paidCount = Number(
        (data as any)?.paid_count ??
          (data as any)?.investors_paid ??
          (data as any)?.count ??
          (typeof data === 'number' ? data : 0)
      );
      return {
        paidCount,
        totalAmountEur: params.totalAmountEur,
        message: `Distribution executed: ${paidCount} investor${paidCount === 1 ? '' : 's'} paid.`,
      };
    }
  }
  const json = await apiFetchJson('/admin/distributions/pay', {
    method: 'POST',
    body: JSON.stringify(params),
  });
  return {
    paidCount: Number(json.paidCount ?? json.data?.paidCount ?? 0),
    totalAmountEur: params.totalAmountEur,
    message: json.message || `Paid ${Number(json.paidCount ?? 0)} investors.`,
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
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .order('created_at', { ascending: false });
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
    } catch {
      // Fallback below
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
  await requireRpcSuccess('set_staff_role', [{ p_user: userId, p_role: role ?? '' }]);
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
          limits: limitsRow?.value ?? defaultLimits,
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
      limits: cfg.limits || {
        ...defaultLimits,
        min_investment_eur: cfg.minInvestment ?? 500,
        max_withdrawal_eur: cfg.maxInvestmentPerInvestor ?? 250000,
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
      // Try manual_payment_methods next
    }
  }

  try {
    const json = await apiFetchJson('/admin/manual-payment-methods');
    const list = Array.isArray(json?.data) ? json.data : [];
    return list.map((m: any) => {
      const accountDetails = m.account_details || m.accountDetails || {};
      const detailsArr: GateDetailRow[] = Array.isArray(accountDetails)
        ? accountDetails.map((d: any) => ({ label: String(d.label || ''), value: String(d.value || '') }))
        : Object.entries(accountDetails).map(([label, value]) => ({ label, value: String(value ?? '') }));
      return {
        id: String(m.id),
        name: String(m.name || 'Payment Method'),
        method: String(m.method || m.fee_type || 'sepa_wire'),
        details: detailsArr,
        instructions: String(m.instructions || ''),
        active: m.enabled !== false,
        assignedCount: assignedCounts.get(String(m.id)) || 0,
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
    instructions: gate.instructions.trim(),
    accountDetails: accountDetailsMap,
    enabled: gate.active,
    minimumAmount: 100,
    feeType: 'none',
    feeValue: 0,
    extraFields: [],
  };
  await apiFetchJson(
    gate.id ? `/admin/manual-payment-methods/${encodeURIComponent(gate.id)}` : '/admin/manual-payment-methods',
    {
      method: gate.id ? 'PUT' : 'POST',
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
  await apiFetchJson(`/admin/manual-payment-methods/${encodeURIComponent(gate.id)}`, { method: 'DELETE' });
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
    try {
      const { data, error } = await supabase
        .from('audit_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(300);
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
    } catch {
      // Fallback below
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
