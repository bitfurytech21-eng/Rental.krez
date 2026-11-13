import 'dotenv/config';
import crypto from 'crypto';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const clean = (value?: string) => String(value || '').trim().replace(/^["']|["']$/g, '');
const supabaseUrl = clean(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL);
const anonKey = clean(process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY);
const serviceRoleKey = clean(process.env.SUPABASE_SERVICE_ROLE_KEY);

let serviceClient: SupabaseClient | null = null;

export function isSupabaseServerConfigured(): boolean {
  return Boolean(supabaseUrl && serviceRoleKey && /^https:\/\//i.test(supabaseUrl));
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

export type VerifiedSupabaseIdentity = {
  id: string;
  email: string;
  fullName: string;
  role: 'investor' | 'admin' | 'super_admin' | 'finance_admin' | 'operations_admin' | 'support' | 'auditor';
  accountType?: string;
  balance?: number;
  status?: 'active' | 'suspended';
  suspendedReason?: string;
};

const rolePriority: VerifiedSupabaseIdentity['role'][] = [
  'super_admin', 'admin', 'finance_admin', 'operations_admin', 'support', 'auditor', 'investor'
];

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
    authClient.from('user_profiles').select('full_name,account_type,wallet_balance,account_status,suspended_reason').eq('id', authData.user.id).maybeSingle()
  ]);
  if (roleError || profileError) return null;

  const assigned = new Set((roleRows || []).map((row: any) => String(row.role)));
  const role = rolePriority.find(candidate => assigned.has(candidate)) || 'investor';
  return {
    id: authData.user.id,
    email: authData.user.email || '',
    fullName: profile?.full_name || authData.user.user_metadata?.full_name || authData.user.email?.split('@')[0] || 'Investor',
    role,
    accountType: profile?.account_type || 'individual_investor',
    balance: Number(profile?.wallet_balance || 0),
    status: profile?.account_status === 'suspended' ? 'suspended' : 'active',
    suspendedReason: profile?.suspended_reason || undefined
  };
}

export async function databaseHealth() {
  if (!isSupabaseServerConfigured()) {
    return { configured: false, status: 'not_configured', message: 'Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY on the API server.' };
  }
  const client = getSupabaseAdmin();
  const [{ count: users, error: usersError }, { count: properties, error: propertiesError }, { count: transactions, error: transactionsError }] = await Promise.all([
    client.from('user_profiles').select('id', { count: 'exact', head: true }),
    client.from('investment_plans').select('id', { count: 'exact', head: true }),
    client.from('payment_transactions').select('id', { count: 'exact', head: true })
  ]);
  const error = usersError || propertiesError || transactionsError;
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
  const allowed = ['full_name','phone_number','country','country_code','address','city','postal_code','avatar_url','bank_iban','crypto_deposit_address','tax_id','date_of_birth','preferences'];
  const safePatch: Record<string, unknown> = {};
  for (const key of allowed) if (patch[key] !== undefined) safePatch[key] = patch[key];
  if (Object.keys(safePatch).length === 0) return getUserProfile(userId);
  const { data, error } = await getSupabaseAdmin().from('user_profiles')
    .update({ ...safePatch, updated_at: new Date().toISOString() }).eq('id', userId).select('*').single();
  if (error) throw error;
  return data;
}

export async function runFinancialRpc(name: string, args: Record<string, unknown>) {
  const { data, error } = await getSupabaseAdmin().rpc(name, args);
  if (error) throw error;
  return data;
}

export function toApiTransaction(row: any) {
  return {
    id: row.id,
    userId: row.user_id,
    userEmail: row.user_profiles?.email || undefined,
    userName: row.user_profiles?.full_name || undefined,
    type: row.type,
    amount: Number(row.amount),
    currency: row.currency,
    status: row.status,
    method: row.payment_method,
    reference: row.reference,
    txHash: row.tx_hash || undefined,
    createdAt: row.created_at,
    processedAt: row.processed_at || undefined,
    metadata: row.metadata || {},
    destination: row.metadata?.destination || undefined,
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
  const { data, error } = await getSupabaseAdmin().from('user_profiles')
    .select('id,email,full_name,country,phone_number,account_type,wallet_balance,invested_balance,kyc_status,account_status,suspended_reason,created_at,updated_at,user_roles(role)')
    .order('created_at', { ascending: false }).limit(Math.min(Math.max(limit, 1), 1000));
  if (error) throw error;
  return data || [];
}

export async function getPersistentDashboardSummary(userId: string) {
  const [profile, investments, transactions] = await Promise.all([
    getUserProfile(userId),
    listUserInvestments(userId),
    listUserTransactions(userId, 250)
  ]);
  if (!profile) return null;
  const investedCapital = investments.reduce((sum: number, item: any) => sum + Number(item.total_amount_invested || 0), 0);
  const dividends = investments.reduce((sum: number, item: any) => sum + Number(item.total_dividends_received || 0), 0);
  const activeProperties = new Set(investments.filter((item: any) => item.status === 'active').map((item: any) => item.plan_id));
  const monthlyIncome = investments.filter((item: any) => item.status === 'active')
    .reduce((sum: number, item: any) => sum + Number(item.projected_monthly_income || 0), 0);
  return {
    totalPortfolioValue: Number((Number(profile.wallet_balance || 0) + Number(profile.invested_balance || investedCapital)).toFixed(2)),
    availableBalance: Number(profile.wallet_balance || 0),
    investedCapital: Number(profile.invested_balance || investedCapital),
    totalEarnedDividends: dividends,
    activePropertiesCount: activeProperties.size,
    projectedMonthlyIncome: Number(monthlyIncome.toFixed(2)),
    currency: 'EUR',
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
  const totalTokens = Number(body.totalTokens ?? existing?.total_tokens ?? Math.floor(targetAmount / tokenPrice));
  const fundedAmount = Number(body.fundedAmount ?? existing?.funded_amount ?? 0);
  const monthlyRate = Number(body.monthlyTargetRate ?? existing?.monthly_target_rate ?? 6);
  const duration = Number(body.holdingPeriodMonths ?? body.durationMonths ?? existing?.duration_months ?? 36);
  const title = String(body.title ?? existing?.title ?? '').trim();
  const location = String(body.location ?? existing?.location ?? '').trim();
  if (!title || !location || !Number.isFinite(targetAmount) || targetAmount <= 0 || !Number.isFinite(tokenPrice) || tokenPrice <= 0 || !Number.isSafeInteger(totalTokens) || totalTokens <= 0) {
    throw new Error('INVALID_PROPERTY_DATA');
  }
  const availableTokens = Number(body.availableTokens ?? existing?.available_tokens ?? Math.max(0, totalTokens - Math.floor(fundedAmount / tokenPrice)));
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
    defaultSort: 'yield-desc', itemsPerPage: 6, currencyDisplay: 'EUR', emailNotifications: true
  };
}

export async function saveUserPreferences(userId: string, preferences: Record<string, unknown>) {
  const allowed = ['defaultSort','itemsPerPage','currencyDisplay','emailNotifications','smsAlerts'];
  const safe: Record<string, unknown> = {};
  for (const key of allowed) if (preferences[key] !== undefined) safe[key] = preferences[key];
  const current = await getUserPreferences(userId);
  const merged = { ...current, ...safe };
  const { error } = await getSupabaseAdmin().from('user_preferences')
    .upsert({ user_id: userId, preferences: merged, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
  if (error) throw error;
  return merged;
}
