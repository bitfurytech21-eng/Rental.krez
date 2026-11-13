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
    authClient.from('user_profiles').select('full_name,account_type,wallet_balance').eq('id', authData.user.id).maybeSingle()
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
    balance: Number(profile?.wallet_balance || 0)
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
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(Math.min(Math.max(limit, 1), 250));
  if (error) throw error;
  return data || [];
}

export async function listAdminTransactions(type?: 'deposit' | 'withdrawal', status?: string, limit = 250) {
  let query = getSupabaseAdmin().from('payment_transactions').select('*').order('created_at', { ascending: false });
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
    notes: row.notes || undefined
  };
}
