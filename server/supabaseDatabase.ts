import 'dotenv/config';
import crypto from 'crypto';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const clean = (value?: string) => String(value || '').trim().replace(/^["']|["']$/g, '');
const supabaseUrl = clean(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL);
const anonKey = clean(process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY);
const serviceRoleKey = clean(process.env.SUPABASE_SERVICE_ROLE_KEY);

let serviceClient: SupabaseClient | null = null;
let devSchemaMissingUntil = 0;

export function isSupabaseServerConfigured(): boolean {
  return Boolean(supabaseUrl && serviceRoleKey && /^https:\/\//i.test(supabaseUrl));
}

export function isMissingSchemaError(error: any): boolean {
  const code = String(error?.code || '');
  const message = String(error?.message || error?.details || error?.hint || '');
  return (
    code === 'PGRST205' ||
    code === 'PGRST202' ||
    code === '42P01' ||
    code === '42883' ||
    /could not find the (table|function)|schema cache|relation .* does not exist/i.test(message)
  );
}

export function isSupabaseSchemaReadyInDev(): boolean {
  if (process.env.NODE_ENV === 'production') return true;
  return Date.now() >= devSchemaMissingUntil;
}

export function markSupabaseSchemaMissingInDev(): boolean {
  if (process.env.NODE_ENV === 'production') return false;
  const wasReady = Date.now() >= devSchemaMissingUntil;
  devSchemaMissingUntil = Date.now() + 5 * 60 * 1000;
  return wasReady;
}

export function canUseLiveSupabaseData(): boolean {
  return isSupabaseServerConfigured() && isSupabaseSchemaReadyInDev();
}

export function isSupabaseAuthConfigured(): boolean {
  return Boolean(supabaseUrl && anonKey && /^https:\/\//i.test(supabaseUrl));
}

export function getSupabaseAdmin(): SupabaseClient {
  if (!isSupabaseServerConfigured()) {
    throw new Error('SUPABASE_SERVER_NOT_CONFIGURED: Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY on the API server.');
  }
  if (!serviceClient) {
    serviceClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
    });
  }
  return serviceClient;
}

export function getSupabaseAuthClient(accessToken?: string): SupabaseClient {
  if (!isSupabaseAuthConfigured()) {
    throw new Error('SUPABASE_AUTH_NOT_CONFIGURED');
  }
  const options = { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } };
  return accessToken
    ? createClient(supabaseUrl, anonKey, { ...options, global: { headers: { Authorization: `Bearer ${accessToken}` } } })
    : createClient(supabaseUrl, anonKey, options);
}

export async function signInCustomer(email: string, password: string) {
  const client = getSupabaseAuthClient();
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw error;
  if (!data.session || !data.user) throw new Error('SUPABASE_SESSION_NOT_CREATED');
  const identity = await verifySupabaseAccessToken(data.session.access_token);
  if (!identity) throw new Error('SUPABASE_PROFILE_NOT_PROVISIONED');
  if (identity.status === 'suspended') throw new Error('ACCOUNT_SUSPENDED');
  if (identity.role !== 'investor' && !identity.isAdmin && !identity.staffRole) throw new Error('ADMIN_LOGIN_REQUIRED');
  return { user: identity, session: data.session };
}

export async function registerCustomer(input: {
  email: string; password: string; fullName: string; accountType?: string; country?: string;
  countryCode?: string; phoneNumber?: string; redirectTo: string;
}) {
  const client = getSupabaseAuthClient();
  const { data, error } = await client.auth.signUp({
    email: input.email,
    password: input.password,
    options: {
      emailRedirectTo: input.redirectTo,
      data: {
        full_name: input.fullName,
        role: 'investor',
        account_type: input.accountType || 'individual_investor',
        country: input.country || 'France',
        country_code: input.countryCode || '',
        phone_number: input.phoneNumber || ''
      }
    }
  });
  if (error) throw error;
  if (!data.user) throw new Error('SUPABASE_USER_NOT_CREATED');
  const identity = data.session
    ? await verifySupabaseAccessToken(data.session.access_token)
    : null;
  return { user: identity, authUser: data.user, session: data.session };
}

export async function requestCustomerPasswordReset(email: string, redirectTo: string) {
  const { error } = await getSupabaseAuthClient().auth.resetPasswordForEmail(email, { redirectTo });
  if (error) throw error;
}

export async function updateCustomerPassword(accessToken: string, password: string) {
  const identity = await verifySupabaseAccessToken(accessToken);
  if (!identity) throw new Error('INVALID_RECOVERY_SESSION');
  const { data, error } = await getSupabaseAdmin().auth.admin.updateUserById(identity.id, { password });
  if (error) throw error;
  const { error: revokeError } = await getSupabaseAdmin().auth.admin.signOut(accessToken, 'global');
  if (revokeError) throw revokeError;
  return data.user;
}

export async function signOutCustomer(accessToken: string) {
  const identity = await verifySupabaseAccessToken(accessToken);
  if (!identity) return;
  const { error } = await getSupabaseAdmin().auth.admin.signOut(accessToken, 'global');
  if (error) throw error;
}

export type VerifiedSupabaseIdentity = {
  id: string;
  email: string;
  fullName: string;
  role: 'investor' | 'admin' | 'super_admin' | 'finance_admin' | 'operations_admin' | 'finance' | 'compliance' | 'property_manager' | 'support' | 'auditor';
  isAdmin?: boolean;
  staffRole?: string | null;
  accountType?: string;
  balance?: number;
  status?: 'active' | 'suspended';
  suspendedReason?: string;
};

const rolePriority: VerifiedSupabaseIdentity['role'][] = [
  'super_admin', 'admin', 'finance_admin', 'finance', 'operations_admin', 'property_manager', 'compliance', 'support', 'auditor', 'investor'
];

function mapAssignedRoleToStaffRole(assigned: Set<string>, profileRole?: string | null): string | null {
  if (assigned.has('super_admin') || assigned.has('admin') || profileRole === 'super_admin' || profileRole === 'admin') {
    return 'super_admin';
  }
  if (assigned.has('finance') || assigned.has('finance_admin') || profileRole === 'finance' || profileRole === 'finance_admin') {
    return 'finance';
  }
  if (assigned.has('compliance') || assigned.has('auditor') || profileRole === 'compliance' || profileRole === 'auditor') {
    return 'compliance';
  }
  if (assigned.has('property_manager') || assigned.has('operations_admin') || profileRole === 'property_manager' || profileRole === 'operations_admin') {
    return 'property_manager';
  }
  if (assigned.has('support') || profileRole === 'support') {
    return 'support';
  }
  return null;
}

export async function verifySupabaseAccessToken(token: string): Promise<VerifiedSupabaseIdentity | null> {
  if (!isSupabaseAuthConfigured() || !token) return null;
  const authClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
  });
  const { data: authData, error: authError } = await authClient.auth.getUser(token);
  if (authError || !authData.user) return null;

  const [{ data: roleRows, error: roleError }, { data: profile, error: profileError }] = await Promise.all([
    authClient.from('user_roles').select('role').eq('user_id', authData.user.id),
    authClient.from('profiles').select('*').eq('id', authData.user.id).maybeSingle()
  ]);
  if (roleError && profileError) return null;

  const assigned = new Set((roleRows || []).map((row: any) => String(row.role)));
  const rawStaffRole = typeof (profile as any)?.staff_role === 'string' && (profile as any).staff_role.trim()
    ? String((profile as any).staff_role).trim()
    : null;
  const isAdmin = Boolean(
    (profile as any)?.is_admin === true ||
    profile?.role === 'admin' ||
    profile?.role === 'super_admin' ||
    assigned.has('super_admin') ||
    assigned.has('admin')
  );
  const staffRole = rawStaffRole || mapAssignedRoleToStaffRole(assigned, profile?.role) || (isAdmin ? 'super_admin' : null);
  const matchedPriorityRole = rolePriority.find(candidate => assigned.has(candidate));
  const resolvedRole: VerifiedSupabaseIdentity['role'] = isAdmin
    ? 'super_admin'
    : (staffRole && ['finance', 'compliance', 'property_manager', 'support', 'super_admin'].includes(staffRole)
        ? (staffRole as VerifiedSupabaseIdentity['role'])
        : (matchedPriorityRole || 'investor'));

  return {
    id: authData.user.id,
    email: authData.user.email || '',
    fullName: profile?.full_name || authData.user.user_metadata?.full_name || authData.user.email?.split('@')[0] || 'Investor',
    role: resolvedRole,
    isAdmin,
    staffRole,
    accountType: profile?.account_type || 'individual_investor',
    balance: Number(profile?.wallet_balance || 0),
    status: (profile as any)?.account_status === 'suspended' ? 'suspended' : 'active',
    suspendedReason: (profile as any)?.suspended_reason || undefined,
  };
}

export async function databaseHealth() {
  if (!isSupabaseServerConfigured()) {
    return { configured: false, status: 'not_configured', message: 'Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY on the API server.' };
  }
  if (!canUseLiveSupabaseData()) {
    return {
      configured: true,
      status: 'dev_fallback',
      usersCount: null,
      listingsCount: null,
      transactionsCount: null,
      message: 'Supabase tables unavailable in development; using local dev store.'
    };
  }
  const client = getSupabaseAdmin();
  const [{ count: users, error: usersError }, { count: properties, error: propertiesError }, { count: transactions, error: transactionsError }] = await Promise.all([
    client.from('user_profiles').select('id', { count: 'exact', head: true }),
    client.from('investment_plans').select('id', { count: 'exact', head: true }),
    client.from('payment_transactions').select('id', { count: 'exact', head: true })
  ]);
  const error = usersError || propertiesError || transactionsError;
  if (error && process.env.NODE_ENV !== 'production' && isMissingSchemaError(error)) {
    markSupabaseSchemaMissingInDev();
    return {
      configured: true,
      status: 'dev_fallback',
      usersCount: null,
      listingsCount: null,
      transactionsCount: null,
      message: 'Supabase tables unavailable in development; using local dev store.'
    };
  }
  return {
    configured: true,
    status: error ? 'degraded' : 'healthy',
    usersCount: users ?? null,
    listingsCount: properties ?? null,
    transactionsCount: transactions ?? null,
    error: error?.message
  };
}

export async function listUserTransactions(userId: string, limit = 100) {
  const { data, error } = await getSupabaseAdmin()
    .from('payment_transactions')
    .select('*, user_profiles(email,full_name)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(Math.min(Math.max(limit, 1), 250));
  if (error) throw error;
  return data || [];
}

export async function listAdminTransactions(type?: 'deposit' | 'withdrawal', status?: string, limit = 250) {
  let query = getSupabaseAdmin().from('payment_transactions').select('*, user_profiles(email,full_name)').order('created_at', { ascending: false });
  if (type) query = query.eq('type', type);
  if (status) query = query.eq('status', status);
  const { data, error } = await query.limit(Math.min(Math.max(limit, 1), 500));
  if (error) throw error;
  return data || [];
}

export async function getUserProfile(userId: string) {
  const { data, error } = await getSupabaseAdmin().from('user_profiles').select('*').eq('id', userId).maybeSingle();
  if (error) throw error;
  return data;
}

export async function updateUserProfile(userId: string, patch: Record<string, unknown>) {
  const allowed = ['full_name','phone_number','country','country_code','address','city','postal_code','avatar_url','bank_iban','bank_account_holder','crypto_deposit_address','tax_id','date_of_birth','preferences'];
  const safePatch: Record<string, unknown> = {};
  for (const key of allowed) if (patch[key] !== undefined) safePatch[key] = patch[key];
  if (Object.keys(safePatch).length === 0) return getUserProfile(userId);
  const { data, error } = await getSupabaseAdmin().from('user_profiles')
    .update({ ...safePatch, updated_at: new Date().toISOString() }).eq('id', userId).select('*').maybeSingle();
  if (error) throw error;
  return data;
}

export async function getWalletSummary(userId: string) {
  const admin = getSupabaseAdmin();
  const { data: wallet, error } = await admin.from('wallets').select('*').eq('user_id', userId).maybeSingle();
  if (!error && wallet) {
    return {
      userId: wallet.user_id,
      currency: wallet.currency || 'EUR',
      availableBalance: Number(wallet.available_balance || 0),
      reservedBalance: Number(wallet.reserved_balance || 0),
      updatedAt: wallet.updated_at,
    };
  }
  const profile = await getUserProfile(userId);
  if (!profile) return null;
  return {
    userId: profile.id,
    currency: 'EUR',
    availableBalance: Number(profile.wallet_balance || 0),
    reservedBalance: 0,
    updatedAt: profile.updated_at,
  };
}

export async function runFinancialRpc(name: string, args: Record<string, unknown>) {
  const { data, error } = await getSupabaseAdmin().rpc(name, args);
  if (error) throw error;
  return data;
}

export function toApiTransaction(row: any) {
  const meta = row.metadata || {};
  return {
    id: row.id,
    userId: row.user_id,
    userEmail: row.user_profiles?.email || undefined,
    userName: row.user_profiles?.full_name || undefined,
    type: row.type,
    amount: Number(row.amount),
    feeAmount: Number(row.fee_amount ?? meta.fee ?? 0),
    netAmount: row.net_amount !== undefined && row.net_amount !== null ? Number(row.net_amount) : undefined,
    currency: row.currency,
    status: row.status,
    method: row.payment_method,
    reference: row.reference,
    payoutReference: row.payout_reference || meta.payout_reference || undefined,
    txHash: row.tx_hash || undefined,
    createdAt: row.created_at,
    processedAt: row.processed_at || undefined,
    processedBy: row.processed_by_email || meta.processed_by_email || row.processed_by || undefined,
    processedById: row.processed_by || undefined,
    reversedTransactionId: row.reversed_transaction_id || meta.reversal_of_id || undefined,
    reversalOfId: row.reversed_transaction_id || meta.reversal_of_id || undefined,
    reversalOfReference: meta.reversal_of_reference || undefined,
    reversedById: meta.reversed_by_id || undefined,
    reversedByReference: meta.reversed_by_reference || undefined,
    reversalReason: row.reversal_reason || meta.reversal_reason || undefined,
    metadata: meta,
    destIban: row.dest_iban || meta.dest_iban || meta.destination || meta.bankIban || row.tx_hash || undefined,
    destination: row.dest_iban || meta.dest_iban || meta.destination || meta.bankIban || undefined,
    proofUrl: meta.proof_url || meta.proof_storage_path || undefined,
    notes: row.notes || undefined
  };
}

export function toApiProperty(row: any) {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    location: row.location,
    type: row.type,
    status: row.status,
    fundedAmount: Number(row.funded_amount || 0),
    targetAmount: Number(row.target_amount || 0),
    tokenPrice: Number(row.token_price || 0),
    totalTokens: Number(row.total_tokens || 0),
    availableTokens: Number(row.available_tokens || 0),
    monthlyTargetRate: Number(row.monthly_target_rate || 0),
    projectedYield: Number(row.estimated_annual_yield || 0),
    estimatedAnnualYield: Number(row.estimated_annual_yield || 0),
    capitalAppreciation: Number(row.financials?.capitalAppreciation || 0),
    minimumInvestment: Number(row.minimum_investment || 0),
    holdingPeriodMonths: Number(row.duration_months || 0),
    images: Array.isArray(row.images) ? row.images : [],
    specs: row.specs || {},
    financials: row.financials || {},
    city: row.city,
    country: row.country,
    updatedAt: row.updated_at
  };
}

export async function listInvestmentPlans(options: { status?: string; search?: string; type?: string } = {}) {
  let query = getSupabaseAdmin().from('investment_plans').select('*').order('created_at', { ascending: false });
  if (options.status && options.status !== 'all') query = query.eq('status', options.status);
  else query = query.neq('status', 'hidden');
  if (options.type && options.type !== 'all') query = query.ilike('type', options.type);
  if (options.search) query = query.or(`title.ilike.%${options.search.replace(/[,%()]/g, '')}%,location.ilike.%${options.search.replace(/[,%()]/g, '')}%`);
  const { data, error } = await query;
  if (error) throw error;
  return (data || []).map(toApiProperty);
}

export async function getInvestmentPlan(identifier: string) {
  const client = getSupabaseAdmin();
  const byId = await client.from('investment_plans').select('*').eq('id', identifier).maybeSingle();
  if (byId.error) throw byId.error;
  if (byId.data) return toApiProperty(byId.data);
  const bySlug = await client.from('investment_plans').select('*').eq('slug', identifier).maybeSingle();
  if (bySlug.error) throw bySlug.error;
  return bySlug.data ? toApiProperty(bySlug.data) : null;
}

export async function listUserInvestments(userId: string) {
  const { data, error } = await getSupabaseAdmin().from('investments')
    .select('*, investment_plans(title,location,images,estimated_annual_yield)')
    .eq('user_id', userId).order('purchased_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function listAdminUsers(limit = 500) {
  const admin = getSupabaseAdmin();
  const capped = Math.min(Math.max(limit, 1), 1000);
  const [{ data, error }, profilesRes] = await Promise.all([
    admin.from('user_profiles')
      .select('id,email,full_name,country,phone_number,account_type,wallet_balance,invested_balance,kyc_status,account_status,suspended_reason,total_dividends_earned,bank_iban,crypto_deposit_address,created_at,updated_at,user_roles(role)')
      .order('created_at', { ascending: false }).limit(capped),
    admin.from('profiles').select('id,is_admin,staff_role,role').limit(capped)
  ]);
  if (error) throw error;
  const profileMap = new Map<string, any>();
  if (!profilesRes.error && Array.isArray(profilesRes.data)) {
    for (const p of profilesRes.data) {
      profileMap.set(String(p.id), p);
    }
  }
  return (data || []).map((row: any) => {
    const p = profileMap.get(String(row.id));
    return {
      ...row,
      is_admin: p?.is_admin === true,
      staff_role: p?.staff_role ?? null,
    };
  });
}

export async function getPersistentDashboardSummary(userId: string) {
  const [profile, investments, transactions, wallet, complianceSteps] = await Promise.all([
    getUserProfile(userId),
    listUserInvestments(userId),
    listUserTransactions(userId, 500),
    getWalletSummary(userId),
    listComplianceSteps(userId).catch(() => []),
  ]);
  if (!profile) return null;

  const nowIso = new Date().toISOString();
  const confirmedInvestments = investments.filter((item: any) => item.status === 'active' || item.status === 'completed' || item.status === 'matured');
  const pendingInvestments = investments.filter((item: any) => item.status === 'pending' || item.status === 'processing');

  const investedCapital = confirmedInvestments.reduce((sum: number, item: any) => sum + Number(item.current_valuation || item.total_amount_invested || 0), 0);
  const pendingAllocationsAmount = pendingInvestments.reduce((sum: number, item: any) => sum + Number(item.total_amount_invested || 0), 0)
    + transactions.filter((t: any) => (t.type === 'investment' || t.type === 'purchase') && t.status === 'pending').reduce((s: number, t: any) => s + Number(t.amount || 0), 0);

  const pendingDeposits = transactions
    .filter((t: any) => t.type === 'deposit' && (t.status === 'pending' || t.status === 'processing'))
    .reduce((s: number, t: any) => s + Number(t.amount || 0), 0);

  const reservedWithdrawals = transactions
    .filter((t: any) => t.type === 'withdrawal' && (t.status === 'pending' || t.status === 'processing'))
    .reduce((s: number, t: any) => s + Number(t.amount || 0), 0);

  const availableBalance = Number(wallet?.availableBalance ?? profile.wallet_balance ?? 0);
  const restrictedCash = profile.account_status === 'suspended' ? availableBalance : 0;
  const withdrawableCash = profile.account_status === 'suspended' ? 0 : availableBalance;

  const dividendsFromTx = transactions
    .filter((t: any) => (t.type === 'dividend' || t.type === 'distribution' || t.type === 'payout') && t.status === 'completed')
    .reduce((sum: number, t: any) => sum + Number(t.amount || 0), 0);
  const dividendsFromInvestments = confirmedInvestments.reduce((sum: number, item: any) => sum + Number(item.total_dividends_received || 0), 0);
  const dividends = Number(Math.max(dividendsFromTx, dividendsFromInvestments, Number(profile.total_dividends_earned || 0)).toFixed(2));

  const nowDate = new Date();
  const monthStart = Date.UTC(nowDate.getUTCFullYear(), nowDate.getUTCMonth(), 1);
  const collectedThisMonth = Number(
    transactions
      .filter((t: any) => (t.type === 'dividend' || t.type === 'distribution' || t.type === 'payout') && t.status === 'completed' && new Date(t.created_at).getTime() >= monthStart)
      .reduce((sum: number, t: any) => sum + Number(t.amount || 0), 0)
      .toFixed(2)
  );

  const activeProperties = new Set(confirmedInvestments.map((item: any) => item.plan_id));
  const monthlyIncome = confirmedInvestments
    .reduce((sum: number, item: any) => sum + Number(item.projected_monthly_income || ((Number(item.total_amount_invested || 0) * Number(item.investment_plans?.estimated_annual_yield || 8.4)) / 100 / 12)), 0);

  const nextDistDate = new Date(Date.UTC(nowDate.getUTCFullYear(), nowDate.getUTCMonth() + 1, 1)).toISOString().slice(0, 10);

  const holdingsList = confirmedInvestments.map((item: any) => {
    const plan = item.investment_plans || {};
    const totalPlanTokens = Number(plan.total_tokens || 0);
    const units = Number(item.tokens_purchased || 0);
    return {
      id: item.id,
      propertyId: item.plan_id,
      propertyTitle: plan.title || item.plan_id,
      location: plan.location || '',
      confirmedUnits: units,
      ownershipPercent: totalPlanTokens > 0 ? Number(((units / totalPlanTokens) * 100).toFixed(4)) : 0,
      valuation: Number(item.current_valuation || item.total_amount_invested || 0),
      valuationDate: item.updated_at || item.purchased_at || nowIso,
      status: item.status,
      onChainStatus: item.tx_hash ? 'On-Chain Settled' : 'SPV Book-Entry Confirmed',
      certificateId: item.certificate_id || null,
    };
  });

  const confirmedUnits = holdingsList.reduce((s, h) => s + h.confirmedUnits, 0);
  const pendingUnits = pendingInvestments.reduce((s: number, item: any) => s + Number(item.tokens_purchased || 0), 0);

  // Build 5-stage Investor Account & Ownership Lifecycle
  const kycNorm = String(profile.kyc_status || 'pending').toLowerCase();
  const hasAnyDepositCompleted = transactions.some((t: any) => t.type === 'deposit' && t.status === 'completed');
  const hasAnyDepositPending = transactions.some((t: any) => t.type === 'deposit' && t.status === 'pending');

  const kycStageStatus: string =
    kycNorm === 'verified' || kycNorm === 'approved'
      ? 'Approved'
      : kycNorm === 'rejected'
      ? 'Rejected'
      : complianceSteps.some((s) => s.status === 'rejected')
      ? 'Action Required'
      : complianceSteps.some((s) => s.status === 'in_review')
      ? 'In Review'
      : 'Not Started';

  const fundingStageStatus: string =
    availableBalance > 0 || hasAnyDepositCompleted || investedCapital > 0
      ? 'Completed'
      : hasAnyDepositPending
      ? 'Pending'
      : 'Not Started';

  const holdingsStageStatus: string =
    confirmedUnits > 0
      ? 'Completed'
      : pendingUnits > 0 || pendingAllocationsAmount > 0
      ? 'Pending'
      : 'Not Started';

  const yieldsStageStatus: string =
    dividends > 0
      ? 'Completed'
      : confirmedUnits > 0
      ? 'Pending'
      : 'Not Started';

  const lifecycleStages = [
    {
      stepNumber: 1,
      key: 'account_registered',
      title: 'Account Registered',
      status: 'Completed',
      summary: `Registered ${new Date(profile.created_at || nowIso).toLocaleDateString('en-GB')}`,
      actionTab: 'profile',
      requirements: ['Authenticated investor identity established'],
      updatedAt: profile.created_at || nowIso,
    },
    {
      stepNumber: 2,
      key: 'identity_verification',
      title: 'Identity Verification (KYC/AML)',
      status: kycStageStatus,
      summary: kycStageStatus === 'Approved' ? 'Tier-2 EU AML Verified' : kycStageStatus === 'In Review' ? 'Documents queued for compliance officer' : 'Upload passport & proof of address',
      actionTab: 'verification',
      requirements: complianceSteps.map((s) => `${s.title}: ${s.status}`),
      updatedAt: profile.updated_at || nowIso,
    },
    {
      stepNumber: 3,
      key: 'wallet_funded',
      title: 'Wallet Funded',
      status: fundingStageStatus,
      summary: availableBalance > 0 ? `Cleared EUR ${availableBalance.toFixed(2)}` : hasAnyDepositPending ? `Pending EUR ${pendingDeposits.toFixed(2)}` : 'Initiate SEPA or crypto deposit',
      actionTab: 'wallet',
      requirements: ['Minimum €100 SEPA wire or supported crypto settlement'],
      updatedAt: wallet?.updatedAt || nowIso,
    },
    {
      stepNumber: 4,
      key: 'asset_tokens_held',
      title: 'Asset Tokens Held',
      status: holdingsStageStatus,
      summary: confirmedUnits > 0 ? `${confirmedUnits} SPV units confirmed across ${activeProperties.size} property` : 'No confirmed property holdings yet',
      actionTab: 'marketplace',
      requirements: ['Allocate cleared treasury funds into a landmark SPV offering'],
      updatedAt: confirmedInvestments[0]?.purchased_at || null,
    },
    {
      stepNumber: 5,
      key: 'monthly_yields',
      title: 'Monthly Yields',
      status: yieldsStageStatus,
      summary: dividends > 0 ? `EUR ${dividends.toFixed(2)} cumulative rent distributed` : confirmedUnits > 0 ? `Next distribution scheduled ${nextDistDate}` : 'Activated upon confirmed asset allocation',
      actionTab: 'distributions',
      requirements: ['Monthly rental distributions credited on the 1st of each month'],
      updatedAt: transactions.find((t: any) => t.type === 'dividend' || t.type === 'distribution')?.created_at || null,
    },
  ];
  const completedStages = lifecycleStages.filter((s) => s.status === 'Completed' || s.status === 'Approved').length;
  const progressPercent = Math.round((completedStages / 5) * 100);

  // Build real chronological performance history from verified ledger events
  const chronologicalTxs = [...transactions]
    .filter((t: any) => t.status === 'completed')
    .sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  let runningNav = 0;
  let runningDivs = 0;
  const performanceHistory: Array<{ timestamp: string; label: string; valuation: number; dividends: number }> = [];
  for (const tx of chronologicalTxs) {
    const amt = Number(tx.amount || 0);
    if (tx.type === 'deposit') runningNav += amt;
    else if (tx.type === 'withdrawal') runningNav = Math.max(0, runningNav - amt);
    else if (tx.type === 'dividend' || tx.type === 'distribution' || tx.type === 'payout') {
      runningDivs += amt;
      runningNav += amt;
    }
    const d = new Date(tx.created_at);
    performanceHistory.push({
      timestamp: tx.created_at,
      label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }),
      valuation: Number(runningNav.toFixed(2)),
      dividends: Number(runningDivs.toFixed(2)),
    });
  }

  return {
    totalPortfolioValue: Number((withdrawableCash + Number(profile.invested_balance || investedCapital)).toFixed(2)),
    availableBalance: withdrawableCash,
    investedCapital: Number(profile.invested_balance || investedCapital),
    totalEarnedDividends: dividends,
    activePropertiesCount: activeProperties.size,
    projectedMonthlyIncome: Number(monthlyIncome.toFixed(2)),
    currency: 'EUR',
    lastUpdated: nowIso,
    valuationDate: holdingsList[0]?.valuationDate || profile.updated_at || nowIso,
    pendingAllocationsCount: pendingInvestments.length,
    pendingAllocationsAmount: Number(pendingAllocationsAmount.toFixed(2)),
    cashBreakdown: {
      available: withdrawableCash,
      pendingDeposits: Number(pendingDeposits.toFixed(2)),
      reservedWithdrawals: Number(reservedWithdrawals.toFixed(2)),
      restricted: Number(restrictedCash.toFixed(2)),
      currency: 'EUR',
    },
    rentSummary: {
      projectedMonthly: Number(monthlyIncome.toFixed(2)),
      collectedTotal: dividends,
      collectedThisMonth,
      nextDistributionDate: confirmedInvestments.length > 0 ? nextDistDate : null,
      paymentStatus: collectedThisMonth > 0 ? 'Paid This Cycle' : confirmedInvestments.length > 0 ? 'Scheduled' : 'No Active Entitlements',
    },
    holdingsSummary: {
      confirmedUnits,
      pendingUnits,
      activePropertiesCount: activeProperties.size,
      holdings: holdingsList,
    },
    lifecycle: {
      progressPercent,
      completedStages,
      totalStages: 5,
      stages: lifecycleStages,
    },
    performanceHistory,
    recentTransactions: transactions.slice(0, 8).map(toApiTransaction)
  };
}

export async function getPersistentAdminDashboard() {
  const client = getSupabaseAdmin();
  const [users, plans, transactions, pendingKyc, pendingWithdrawals, invested, dividends] = await Promise.all([
    client.from('user_profiles').select('id', { count: 'exact', head: true }),
    client.from('investment_plans').select('id', { count: 'exact', head: true }),
    client.from('payment_transactions').select('id', { count: 'exact', head: true }),
    client.from('user_profiles').select('id', { count: 'exact', head: true }).in('kyc_status', ['pending','unverified']),
    client.from('payment_transactions').select('id', { count: 'exact', head: true }).eq('type','withdrawal').eq('status','pending'),
    client.from('user_profiles').select('invested_balance'),
    client.from('user_profiles').select('total_dividends_earned')
  ]);
  const error = users.error || plans.error || transactions.error || pendingKyc.error || pendingWithdrawals.error || invested.error || dividends.error;
  if (error) throw error;
  const totalAssetsUnderManagement = (invested.data || []).reduce((sum: number, row: any) => sum + Number(row.invested_balance || 0), 0);
  return {
    totalUsers: users.count || 0,
    totalProperties: plans.count || 0,
    totalTransactions: transactions.count || 0,
    totalAssetsUnderManagement,
    totalDividendsPaid: (dividends.data || []).reduce((sum: number, row: any) => sum + Number(row.total_dividends_earned || 0), 0),
    pendingKYC: pendingKyc.count || 0,
    pendingWithdrawalsCount: pendingWithdrawals.count || 0
  };
}

export async function listPersistentInvestments(limit = 500) {
  const { data, error } = await getSupabaseAdmin().from('investments')
    .select('*, user_profiles(email,full_name), investment_plans(title,location)')
    .order('purchased_at', { ascending: false }).limit(Math.min(Math.max(limit, 1), 1000));
  if (error) throw error;
  return (data || []).map((row: any) => ({
    id: row.id,
    userId: row.user_id,
    userEmail: row.user_profiles?.email || '',
    userName: row.user_profiles?.full_name || '',
    propertyId: row.plan_id,
    propertyTitle: row.investment_plans?.title || row.plan_id,
    tokensPurchased: Number(row.tokens_purchased),
    totalCost: Number(row.total_amount_invested),
    purchaseDate: row.purchased_at,
    status: row.status,
    certificateId: row.certificate_id
  }));
}

export async function listPersistentAuditLogs(limit = 250) {
  const { data, error } = await getSupabaseAdmin().from('audit_logs')
    .select('*').order('created_at', { ascending: false }).limit(Math.min(Math.max(limit, 1), 1000));
  if (error) throw error;
  return data || [];
}

function propertyWritePayload(body: any, existing?: any) {
  const targetAmount = Number(body.targetAmount ?? existing?.target_amount ?? 0);
  const tokenPrice = Number(body.tokenPrice ?? existing?.token_price ?? 364);
  const totalTokens = Number(body.totalTokens ?? ((body.targetAmount !== undefined || body.tokenPrice !== undefined) ? Math.floor(targetAmount / tokenPrice) : (existing?.total_tokens ?? Math.floor(targetAmount / tokenPrice))));
  const fundedAmount = Number(body.fundedAmount ?? existing?.funded_amount ?? 0);
  const monthlyRate = Number(body.monthlyTargetRate ?? existing?.monthly_target_rate ?? 6);
  const duration = Number(body.holdingPeriodMonths ?? body.durationMonths ?? existing?.duration_months ?? 36);
  const title = String(body.title ?? existing?.title ?? '').trim();
  const location = String(body.location ?? existing?.location ?? '').trim();
  if (!title || !location || !Number.isFinite(targetAmount) || targetAmount <= 0 ||
      !Number.isFinite(tokenPrice) || tokenPrice <= 0 || !Number.isSafeInteger(totalTokens) || totalTokens <= 0 ||
      !Number.isFinite(fundedAmount) || fundedAmount < 0 || fundedAmount > targetAmount ||
      !Number.isFinite(monthlyRate) || monthlyRate < 5 || monthlyRate > 15 ||
      !Number.isSafeInteger(duration) || duration < 1) {
    throw new Error('INVALID_PROPERTY_DATA');
  }
  const computedAvailable = Math.max(0, totalTokens - Math.floor(fundedAmount / tokenPrice));
  const availableTokens = Number(body.availableTokens ?? ((body.targetAmount !== undefined || body.fundedAmount !== undefined || body.tokenPrice !== undefined) ? computedAvailable : (existing?.available_tokens ?? computedAvailable)));
  if (!Number.isSafeInteger(availableTokens) || availableTokens < 0 || availableTokens > totalTokens) throw new Error('INVALID_PROPERTY_DATA');
  if (body.images !== undefined && !Array.isArray(body.images)) throw new Error('INVALID_PROPERTY_DATA');
  return {
    slug: String(body.slug ?? existing?.slug ?? title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')),
    title, location, city: String(body.city ?? existing?.city ?? location.split(',').slice(-2, -1)[0]?.trim() ?? 'Unknown'),
    country: String(body.country ?? existing?.country ?? 'Spain'),
    type: String(body.type ?? existing?.type ?? 'Luxury Villa'),
    status: String(body.status ?? existing?.status ?? 'draft'),
    target_amount: targetAmount, funded_amount: fundedAmount, token_price: tokenPrice,
    total_tokens: totalTokens, available_tokens: Math.max(0, availableTokens),
    monthly_target_rate: monthlyRate,
    estimated_annual_yield: Number(body.projectedYield ?? body.estimatedAnnualYield ?? existing?.estimated_annual_yield ?? monthlyRate * 12),
    total_estimated_return: Number(body.totalEstimatedReturn ?? existing?.total_estimated_return ?? monthlyRate * duration),
    duration_months: duration,
    minimum_investment: Number(body.minimumInvestment ?? existing?.minimum_investment ?? 1000),
    distribution_frequency: String(body.distributionFrequency ?? existing?.distribution_frequency ?? 'Monthly'),
    images: body.images ?? existing?.images ?? [],
    specs: body.specs ?? existing?.specs ?? {},
    financials: body.financials ?? existing?.financials ?? {}
  };
}

export async function createPersistentInvestmentPlan(body: any) {
  const id = String(body.id || `prop-${crypto.randomUUID()}`);
  const payload = propertyWritePayload(body);
  const { data, error } = await getSupabaseAdmin().from('investment_plans').insert({ id, ...payload }).select('*').single();
  if (error) throw error;
  return toApiProperty(data);
}

export async function updatePersistentInvestmentPlan(identifier: string, body: any) {
  const client = getSupabaseAdmin();
  const byId = await client.from('investment_plans').select('*').eq('id', identifier).maybeSingle();
  if (byId.error) throw byId.error;
  let existing = byId.data;
  if (!existing) {
    const bySlug = await client.from('investment_plans').select('*').eq('slug', identifier).maybeSingle();
    if (bySlug.error) throw bySlug.error;
    existing = bySlug.data;
  }
  if (!existing) return null;
  const payload = propertyWritePayload(body || {}, existing);
  const { data, error } = await client.from('investment_plans').update({ ...payload, updated_at: new Date().toISOString() })
    .eq('id', existing.id).select('*').single();
  if (error) throw error;
  return toApiProperty(data);
}

export async function getPersistentAccountStatement(userId: string) {
  const [profile, transactions, investments] = await Promise.all([
    getUserProfile(userId), listUserTransactions(userId, 1000), listUserInvestments(userId)
  ]);
  if (!profile) return null;
  const completed = transactions.filter((row: any) => row.status === 'completed');
  const sum = (type: string) => completed.filter((row: any) => row.type === type)
    .reduce((total: number, row: any) => total + Number(row.amount || 0), 0);
  return {
    statementId: `STMT-${new Date().getUTCFullYear()}-${userId.slice(0, 8).toUpperCase()}`,
    periodStart: transactions.length ? transactions[transactions.length - 1].created_at : null,
    periodEnd: new Date().toISOString(),
    totalDeposits: sum('deposit'),
    totalWithdrawals: sum('withdrawal'),
    totalInvested: investments.reduce((total: number, row: any) => total + Number(row.total_amount_invested || 0), 0),
    totalDividendsReceived: Number(profile.total_dividends_earned || 0),
    currentBalance: Number(profile.wallet_balance || 0),
    transactions: transactions.map(toApiTransaction)
  };
}

export async function getPersistentPerformance(userId: string) {
  const [profile, transactions, investments] = await Promise.all([
    getUserProfile(userId), listUserTransactions(userId, 1000), listUserInvestments(userId)
  ]);
  if (!profile) return null;
  const dividends = transactions.filter((row: any) => row.type === 'dividend' && row.status === 'completed');
  const byMonth = new Map<string, { yield: number; totalValue: number }>();
  for (const row of dividends) {
    const date = new Date(row.created_at);
    const key = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' });
    const current = byMonth.get(key) || { yield: 0, totalValue: 0 };
    current.yield += Number(row.amount || 0);
    byMonth.set(key, current);
  }
  const invested = investments.reduce((total: number, row: any) => total + Number(row.total_amount_invested || 0), 0);
  const weightedAnnualRate = invested > 0
    ? investments.reduce((total: number, row: any) => total + Number(row.monthly_target_rate || 0) * 12 * Number(row.total_amount_invested || 0), 0) / invested
    : 0;
  return {
    annualizedReturnPercent: Number(weightedAnnualRate.toFixed(2)),
    historicalPerformance: Array.from(byMonth.entries()).map(([month, values]) => ({ month, ...values })),
    totalInvested: invested,
    totalDividendsReceived: Number(profile.total_dividends_earned || 0)
  };
}

export async function listUserNotifications(userId: string, limit = 100) {
  const { data, error } = await getSupabaseAdmin().from('notifications').select('*')
    .eq('user_id', userId).order('created_at', { ascending: false }).limit(Math.min(Math.max(limit, 1), 250));
  if (error) throw error;
  return data || [];
}

export async function markUserNotificationRead(userId: string, notificationId: string) {
  const { data, error } = await getSupabaseAdmin().from('notifications')
    .update({ read: true }).eq('user_id', userId).eq('id', notificationId).select('*').maybeSingle();
  if (error) throw error;
  return data;
}

export async function markAllUserNotificationsRead(userId: string) {
  const { data, error } = await getSupabaseAdmin().from('notifications')
    .update({ read: true }).eq('user_id', userId).eq('read', false).select('id');
  if (error) throw error;
  return data?.length || 0;
}

export async function createUserNotification(
  userId: string,
  notif: { title: string; message: string; type?: string }
) {
  const { data, error } = await getSupabaseAdmin()
    .from('notifications')
    .insert({
      id: crypto.randomUUID(),
      user_id: userId,
      title: notif.title,
      message: notif.message,
      type: notif.type || 'info',
      read: false,
      created_at: new Date().toISOString(),
    })
    .select('*')
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function listAdminNotifications(limit = 150) {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from('notifications')
    .select('id,user_id,title,message,type,read,created_at,user_profiles(email,full_name)')
    .order('created_at', { ascending: false })
    .limit(Math.min(Math.max(limit, 1), 300));
  if (!error) return data || [];
  const fallback = await admin
    .from('notifications')
    .select('id,user_id,title,message,type,read,created_at')
    .order('created_at', { ascending: false })
    .limit(Math.min(Math.max(limit, 1), 300));
  if (fallback.error) throw fallback.error;
  return fallback.data || [];
}

export async function sendAdminNotifications(
  targetUserId: string | 'all',
  notif: { title: string; message: string; type?: string }
) {
  const admin = getSupabaseAdmin();
  let userIds: string[] = [];
  if (targetUserId === 'all') {
    const { data: users, error } = await admin.from('user_profiles').select('id').limit(1000);
    if (error) throw error;
    userIds = (users || []).map((u: any) => String(u.id)).filter(Boolean);
  } else {
    userIds = [targetUserId];
  }
  if (userIds.length === 0) return [];
  const nowIso = new Date().toISOString();
  const rows = userIds.map((uid) => ({
    id: crypto.randomUUID(),
    user_id: uid,
    title: notif.title,
    message: notif.message,
    type: notif.type || 'info',
    read: false,
    created_at: nowIso,
  }));
  const { data, error } = await admin.from('notifications').insert(rows).select('*');
  if (error) throw error;
  return data || [];
}

export async function listUserFavorites(userId: string) {
  const { data, error } = await getSupabaseAdmin().from('user_favorites')
    .select('property_id').eq('user_id', userId).order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map((row: any) => row.property_id as string);
}

export async function saveUserFavorite(userId: string, propertyId: string) {
  const { error } = await getSupabaseAdmin().from('user_favorites')
    .upsert({ user_id: userId, property_id: propertyId }, { onConflict: 'user_id,property_id', ignoreDuplicates: true });
  if (error) throw error;
  return listUserFavorites(userId);
}

export async function removeUserFavorite(userId: string, propertyId: string) {
  const { error } = await getSupabaseAdmin().from('user_favorites')
    .delete().eq('user_id', userId).eq('property_id', propertyId);
  if (error) throw error;
  return listUserFavorites(userId);
}

export async function getUserPreferences(userId: string) {
  const { data, error } = await getSupabaseAdmin().from('user_preferences')
    .select('preferences').eq('user_id', userId).maybeSingle();
  if (error) throw error;
  return data?.preferences || {
    defaultSort: 'yield-desc',
    itemsPerPage: 6,
    currencyDisplay: 'EUR',
    emailNotifications: true,
    depositAlerts: true,
    withdrawalUpdates: true,
    kycUpdates: true,
    distributionAlerts: true,
    securityAlerts: true,
  };
}

export async function saveUserPreferences(userId: string, preferences: Record<string, unknown>) {
  const allowed = [
    'defaultSort',
    'itemsPerPage',
    'currencyDisplay',
    'emailNotifications',
    'smsAlerts',
    'depositAlerts',
    'withdrawalUpdates',
    'kycUpdates',
    'distributionAlerts',
    'securityAlerts',
    'treasurySubBalances',
  ];
  const safe: Record<string, unknown> = {};
  for (const key of allowed) if (preferences[key] !== undefined) safe[key] = preferences[key];
  const current = await getUserPreferences(userId);
  const merged = { ...current, ...safe };
  const { error } = await getSupabaseAdmin().from('user_preferences')
    .upsert({ user_id: userId, preferences: merged, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
  if (error) throw error;
  return merged;
}

export interface ComplianceDocumentRecord {
  id: string;
  userId: string;
  category: 'kyc_identity' | 'proof_of_address' | 'accredited_proof';
  documentType: string;
  title: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  status: 'pending' | 'verified' | 'rejected';
  uploadedAt: string;
  fileDataUrl?: string;
}

export type ComplianceStepKey = 'kyc_identity' | 'proof_of_address' | 'accredited_proof';
export type ComplianceStepStatus = 'not_started' | 'in_review' | 'verified' | 'rejected';

export interface ComplianceStepRecord {
  stepKey: ComplianceStepKey;
  title: string;
  status: ComplianceStepStatus;
  notes?: string;
  submittedAt?: string;
  reviewedAt?: string;
  updatedAt?: string;
}

const DEFAULT_COMPLIANCE_STEPS: Array<{ stepKey: ComplianceStepKey; title: string }> = [
  { stepKey: 'kyc_identity', title: 'Identity verification' },
  { stepKey: 'proof_of_address', title: 'Proof of address' },
  { stepKey: 'accredited_proof', title: 'Investor questionnaire' },
];

export async function listComplianceDocuments(userId: string): Promise<ComplianceDocumentRecord[]> {
  const admin = getSupabaseAdmin();
  const { data: tableDocs, error: tableErr } = await admin
    .from('documents')
    .select('id,user_id,category,document_type,title,file_name,file_size,mime_type,status,uploaded_at,file_data_url')
    .eq('user_id', userId)
    .order('uploaded_at', { ascending: false })
    .limit(50);

  if (!tableErr && Array.isArray(tableDocs)) {
    return tableDocs.map((row: any) => ({
      id: String(row.id),
      userId: String(row.user_id),
      category: row.category,
      documentType: String(row.document_type || ''),
      title: String(row.title || ''),
      fileName: String(row.file_name || ''),
      fileSize: Number(row.file_size || 0),
      mimeType: String(row.mime_type || 'application/pdf'),
      status: row.status || 'pending',
      uploadedAt: String(row.uploaded_at || ''),
      fileDataUrl: row.file_data_url || undefined,
    }));
  }

  const { data, error } = await admin.from('user_preferences')
    .select('preferences').eq('user_id', userId).maybeSingle();
  if (error) throw error;
  const docs = data?.preferences?.complianceDocuments;
  return Array.isArray(docs) ? docs : [];
}

export async function addComplianceDocument(userId: string, doc: ComplianceDocumentRecord): Promise<ComplianceDocumentRecord[]> {
  const admin = getSupabaseAdmin();
  const { error: insertErr } = await admin.from('documents').insert({
    id: doc.id,
    user_id: userId,
    category: doc.category,
    document_type: doc.documentType,
    title: doc.title,
    file_name: doc.fileName,
    file_size: doc.fileSize,
    mime_type: doc.mimeType,
    status: doc.status,
    file_data_url: doc.fileDataUrl || null,
    uploaded_at: doc.uploadedAt,
  });

  await upsertComplianceStep(userId, doc.category, 'in_review');

  if (!insertErr) {
    return listComplianceDocuments(userId);
  }

  const { data, error: fetchError } = await admin.from('user_preferences')
    .select('preferences').eq('user_id', userId).maybeSingle();
  if (fetchError) throw fetchError;
  const current = (data?.preferences && typeof data.preferences === 'object') ? data.preferences : {};
  const existingDocs = Array.isArray(current.complianceDocuments) ? current.complianceDocuments : [];
  const nextDocs = [doc, ...existingDocs].slice(0, 25);
  const merged = { ...current, complianceDocuments: nextDocs };
  const { error } = await admin.from('user_preferences')
    .upsert({ user_id: userId, preferences: merged, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
  if (error) throw error;
  return nextDocs;
}

export async function listComplianceSteps(userId: string): Promise<ComplianceStepRecord[]> {
  const admin = getSupabaseAdmin();
  const [profile, docs, tableRes] = await Promise.all([
    getUserProfile(userId),
    listComplianceDocuments(userId),
    admin.from('compliance_steps').select('*').eq('user_id', userId),
  ]);

  const byKey = new Map<string, any>();
  if (!tableRes.error && Array.isArray(tableRes.data)) {
    for (const row of tableRes.data) {
      byKey.set(String(row.step_key), row);
    }
  }

  const profileKyc = String(profile?.kyc_status || 'pending').toLowerCase();
  return DEFAULT_COMPLIANCE_STEPS.map((def) => {
    const saved = byKey.get(def.stepKey);
    const matchingDocs = docs.filter((d) => d.category === def.stepKey);
    let status: ComplianceStepStatus = 'not_started';
    if (profileKyc === 'verified' || profileKyc === 'approved') {
      status = 'verified';
    } else if (saved?.status) {
      status = saved.status as ComplianceStepStatus;
    } else if (matchingDocs.length > 0) {
      const latest = matchingDocs[0];
      status = latest.status === 'verified' ? 'verified' : latest.status === 'rejected' ? 'rejected' : 'in_review';
    } else if (profileKyc === 'rejected') {
      status = 'rejected';
    }
    return {
      stepKey: def.stepKey,
      title: saved?.title || def.title,
      status,
      notes: saved?.notes || undefined,
      submittedAt: saved?.submitted_at || matchingDocs[0]?.uploadedAt || undefined,
      reviewedAt: saved?.reviewed_at || undefined,
      updatedAt: saved?.updated_at || undefined,
    };
  });
}

export async function upsertComplianceStep(
  userId: string,
  stepKey: ComplianceStepKey,
  status: ComplianceStepStatus,
  notes?: string
): Promise<ComplianceStepRecord[]> {
  const admin = getSupabaseAdmin();
  const def = DEFAULT_COMPLIANCE_STEPS.find((s) => s.stepKey === stepKey);
  const nowIso = new Date().toISOString();
  await admin.from('compliance_steps').upsert(
    {
      user_id: userId,
      step_key: stepKey,
      title: def?.title || stepKey,
      status,
      notes: notes || null,
      submitted_at: status === 'in_review' ? nowIso : undefined,
      reviewed_at: status === 'verified' || status === 'rejected' ? nowIso : undefined,
      updated_at: nowIso,
    },
    { onConflict: 'user_id,step_key' }
  );
  return listComplianceSteps(userId);
}

export async function listAdminComplianceDocuments(limit = 200): Promise<
  Array<ComplianceDocumentRecord & { userEmail?: string; userName?: string }>
> {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from('documents')
    .select('id,user_id,category,document_type,title,file_name,file_size,mime_type,status,uploaded_at,file_data_url,user_profiles(email,full_name)')
    .order('uploaded_at', { ascending: false })
    .limit(Math.min(Math.max(limit, 1), 500));

  if (!error && Array.isArray(data)) {
    return data.map((row: any) => ({
      id: String(row.id),
      userId: String(row.user_id),
      category: row.category,
      documentType: String(row.document_type || ''),
      title: String(row.title || ''),
      fileName: String(row.file_name || ''),
      fileSize: Number(row.file_size || 0),
      mimeType: String(row.mime_type || 'application/pdf'),
      status: row.status || 'pending',
      uploadedAt: String(row.uploaded_at || ''),
      fileDataUrl: row.file_data_url || undefined,
      userEmail: row.user_profiles?.email || undefined,
      userName: row.user_profiles?.full_name || undefined,
    }));
  }

  return [];
}

export async function reviewComplianceDocument(
  docId: string,
  status: 'verified' | 'rejected',
  notes?: string
): Promise<(ComplianceDocumentRecord & { userId: string }) | null> {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from('documents')
    .update({ status })
    .eq('id', docId)
    .select('*')
    .maybeSingle();

  if (error || !data) return null;

  await upsertComplianceStep(
    String(data.user_id),
    data.category as ComplianceStepKey,
    status === 'verified' ? 'verified' : 'rejected',
    notes
  ).catch(() => {});

  return {
    id: String(data.id),
    userId: String(data.user_id),
    category: data.category,
    documentType: String(data.document_type || ''),
    title: String(data.title || ''),
    fileName: String(data.file_name || ''),
    fileSize: Number(data.file_size || 0),
    mimeType: String(data.mime_type || 'application/pdf'),
    status: data.status,
    uploadedAt: String(data.uploaded_at || ''),
    fileDataUrl: data.file_data_url || undefined,
  };
}

export async function findTransactionByReferenceOrId(idOrRef: string) {
  const admin = getSupabaseAdmin();
  const clean = String(idOrRef || '').trim();
  if (!clean) return null;
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(clean);
  if (isUuid) {
    const { data } = await admin.from('payment_transactions').select('*').eq('id', clean).maybeSingle();
    if (data) return data;
  }
  const { data } = await admin.from('payment_transactions').select('*').eq('reference', clean).maybeSingle();
  return data || null;
}

export async function getAdminIdentityByEmail(email: string): Promise<VerifiedSupabaseIdentity | null> {
  if (!isSupabaseServerConfigured()) return null;
  const admin = getSupabaseAdmin();
  const cleanEmail = email.trim().toLowerCase();
  const [{ data, error }, { data: profileRow }] = await Promise.all([
    admin.from('user_profiles')
      .select('id,email,full_name,account_type,wallet_balance,account_status,suspended_reason,user_roles(role)')
      .eq('email', cleanEmail).maybeSingle(),
    admin.from('profiles')
      .select('id,is_admin,staff_role,role')
      .eq('email', cleanEmail).maybeSingle()
  ]);
  if (error) throw error;
  if (!data) return null;
  const assigned = new Set((data.user_roles || []).map((row: any) => String(row.role)));
  const isAdmin = Boolean(
    profileRow?.is_admin === true ||
    profileRow?.role === 'admin' ||
    profileRow?.role === 'super_admin' ||
    assigned.has('super_admin') ||
    assigned.has('admin')
  );
  const staffRole = (typeof profileRow?.staff_role === 'string' && profileRow.staff_role.trim())
    ? profileRow.staff_role.trim()
    : mapAssignedRoleToStaffRole(assigned, profileRow?.role) || (isAdmin ? 'super_admin' : null);
  const role = isAdmin
    ? 'super_admin'
    : (staffRole && ['finance', 'compliance', 'property_manager', 'support', 'super_admin'].includes(staffRole)
        ? (staffRole as VerifiedSupabaseIdentity['role'])
        : (rolePriority.find(candidate => assigned.has(candidate)) || 'investor'));
  if (!isAdmin && !staffRole && !['admin','super_admin','finance_admin','operations_admin','finance','compliance','property_manager','support','auditor'].includes(role)) {
    return null;
  }
  return {
    id: data.id, email: data.email, fullName: data.full_name || 'Administrator',
    role, isAdmin, staffRole, accountType: data.account_type, balance: Number(data.wallet_balance || 0),
    status: data.account_status === 'suspended' ? 'suspended' : 'active',
    suspendedReason: data.suspended_reason || undefined
  };
}
