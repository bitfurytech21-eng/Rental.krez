import { Router, Response } from 'express';
import crypto from 'crypto';
import { AuthenticatedRequest, rateLimiter, requireAuth, requireStaffSection } from './middleware';
import {
  canUseLiveSupabaseData,
  getSupabaseAdmin,
  isMissingSchemaError,
  isSupabaseServerConfigured,
  markSupabaseSchemaMissingInDev,
} from './supabaseDatabase';
import { consumeDashboardActionGrant } from './emailOtp';
import { sendEmail } from './emailService';
import { logger } from './logger';
import { requireLatestLegalConsent } from './legalConsent';

export const manualPaymentRouter = Router();
const submitLimiter = rateLimiter({
  windowMs: 60 * 60 * 1000,
  max: 5,
  category: 'payments',
  message: 'Too many manual deposit submissions. Please try again later.'
});
const allowedMimeTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'application/pdf']);
const MAX_PROOF_BYTES = 5 * 1024 * 1024;

export interface GateDetailRow {
  label: string;
  value: string;
}

export interface PaymentGateRecord {
  id: string;
  name: string;
  method: string;
  logo_url: string | null;
  instructions: string;
  account_details: Record<string, string>;
  detail_rows: GateDetailRow[];
  minimum_amount: number;
  maximum_amount: number | null;
  fee_type: 'none' | 'fixed' | 'percent';
  fee_value: number;
  extra_fields: any[];
  enabled: boolean;
  active: boolean;
  sort_order: number;
  assigned_investors_count?: number;
  updated_by?: string;
  created_at: string;
  updated_at: string;
}

// Dev / Sandbox in-memory payment gates + investor assignment mapping (used when Supabase is unconfigured)
const devPaymentGates: PaymentGateRecord[] = [
  {
    id: '11111111-1111-4111-8111-111111111101',
    name: 'BNP Paribas SEPA Desk',
    method: 'sepa',
    logo_url: null,
    instructions: 'Include your Kretz investor reference in the SEPA remittance field. Transfers settle within 1 business day.',
    account_details: {
      Beneficiary: 'Kretz Real Estate Capital SPV SAS',
      IBAN: 'FR76 3000 4028 3700 0104 9281 942',
      BIC: 'BNPAFRPPXXX',
      Bank: 'BNP Paribas Paris',
    },
    detail_rows: [
      { label: 'Beneficiary', value: 'Kretz Real Estate Capital SPV SAS' },
      { label: 'IBAN', value: 'FR76 3000 4028 3700 0104 9281 942' },
      { label: 'BIC', value: 'BNPAFRPPXXX' },
      { label: 'Bank', value: 'BNP Paribas Paris' },
    ],
    minimum_amount: 100,
    maximum_amount: null,
    fee_type: 'none',
    fee_value: 0,
    extra_fields: [],
    enabled: true,
    active: true,
    sort_order: 1,
    created_at: '2026-01-10T09:00:00.000Z',
    updated_at: '2026-01-10T09:00:00.000Z',
  },
  {
    id: '11111111-1111-4111-8111-111111111102',
    name: 'Luxembourg Private Wire',
    method: 'wire',
    logo_url: null,
    instructions: 'Dedicated private banking desk for commitments above €50,000.',
    account_details: {
      Beneficiary: 'Kretz Luxembourg Custody S.à r.l.',
      IBAN: 'LU28 0019 4006 4475 0000',
      BIC: 'BCEELULL',
    },
    detail_rows: [
      { label: 'Beneficiary', value: 'Kretz Luxembourg Custody S.à r.l.' },
      { label: 'IBAN', value: 'LU28 0019 4006 4475 0000' },
      { label: 'BIC', value: 'BCEELULL' },
    ],
    minimum_amount: 1000,
    maximum_amount: null,
    fee_type: 'none',
    fee_value: 0,
    extra_fields: [],
    enabled: true,
    active: true,
    sort_order: 2,
    created_at: '2026-01-12T09:00:00.000Z',
    updated_at: '2026-01-12T09:00:00.000Z',
  },
];

// Clearly labeled sandbox-only fixture used by non-production fallback and API smoke tests.
devPaymentGates.push({
  id: 'method-sepa-wire',
  name: 'Demo SEPA Wire (Sandbox)',
  method: 'sepa',
  logo_url: null,
  instructions: 'Sandbox payment rail for development and automated tests only. Do not transfer real funds.',
  account_details: { Beneficiary: 'DEMO ONLY — NO REAL PAYMENTS', IBAN: 'DE00 0000 0000 0000 0000 00', BIC: 'DEMOXXXX' },
  detail_rows: [
    { label: 'Beneficiary', value: 'DEMO ONLY — NO REAL PAYMENTS' },
    { label: 'IBAN', value: 'DE00 0000 0000 0000 0000 00' },
    { label: 'BIC', value: 'DEMOXXXX' },
  ],
  minimum_amount: 100,
  maximum_amount: 5000000,
  fee_type: 'none',
  fee_value: 0,
  extra_fields: [{ key: 'sending_iban', label: 'Originating IBAN (Optional)', required: false }],
  enabled: true,
  active: true,
  sort_order: 3,
  created_at: '2026-01-10T09:00:00.000Z',
  updated_at: '2026-01-10T09:00:00.000Z',
});

const devAssignedGatesByUserId = new Map<string, { bankGateId: string | null; usdtGateId: string | null }>([
  ['usr-inv-01', { bankGateId: '11111111-1111-4111-8111-111111111101', usdtGateId: null }],
]);

export function getDevAssignedGates(userId: string): { bankGateId: string | null; usdtGateId: string | null } {
  return devAssignedGatesByUserId.get(userId) || { bankGateId: null, usdtGateId: null };
}

export function getDevAssignedGateId(userId: string, method: 'bank' | 'usdt' = 'bank'): string | null {
  const entry = getDevAssignedGates(userId);
  return method === 'usdt' ? entry.usdtGateId : entry.bankGateId;
}

export function setDevAssignedGateId(
  userId: string,
  gateId: string | null,
  method?: 'bank' | 'usdt'
): PaymentGateRecord | null {
  const current = { ...getDevAssignedGates(userId) };
  if (!gateId) {
    if (method === 'usdt') current.usdtGateId = null;
    else current.bankGateId = null;
    devAssignedGatesByUserId.set(userId, current);
    return null;
  }
  const gate = devPaymentGates.find((g) => g.id === gateId) || null;
  if (!gate) throw new Error('GATE_NOT_FOUND');
  const gateMethod: 'bank' | 'usdt' = method || (decorateGateRow(gate).method === 'usdt' ? 'usdt' : 'bank');
  if (gateMethod === 'usdt') current.usdtGateId = gate.id;
  else current.bankGateId = gate.id;
  devAssignedGatesByUserId.set(userId, current);
  return gate;
}

export function getDevGateById(gateId?: string | null): PaymentGateRecord | null {
  if (!gateId) return null;
  return devPaymentGates.find((g) => g.id === gateId) || null;
}

export function toAssignedPaymentAccount(gate: PaymentGateRecord | null) {
  if (!gate || gate.enabled === false) return null;
  const decorated = decorateGateRow(gate, 0);
  const rows: GateDetailRow[] = Array.isArray(decorated.detail_rows) ? decorated.detail_rows : [];
  const findVal = (...candidates: string[]): string => {
    for (const c of candidates) {
      const target = c.toLowerCase();
      for (const [k, v] of Object.entries(decorated.account_details || {})) {
        if (k.toLowerCase() === target && String(v || '').trim()) return String(v).trim();
      }
      const match = rows.find((r) => r.label.toLowerCase() === target || r.label.toLowerCase().includes(target));
      if (match?.value) return match.value;
    }
    return '';
  };
  const beneficiary = findVal('beneficiary', 'account holder', 'holder', 'recipient', 'account name');
  return {
    gateId: decorated.id,
    gateName: decorated.name,
    method: decorated.method as 'bank' | 'usdt',
    beneficiary,
    accountHolder: beneficiary,
    bankName: findVal('bank', 'bank name', 'institution', 'bank institution') || decorated.name,
    iban: findVal('iban', 'account number', 'iban / account'),
    bic: findVal('bic', 'swift', 'bic / swift', 'swift / bic'),
    reference: findVal('reference', 'payment reference', 'memo', 'remittance reference') || undefined,
    instructions: decorated.instructions || '',
    network: decorated.method === 'usdt' ? decorated.network : undefined,
    walletAddress: decorated.method === 'usdt' ? decorated.wallet_address : undefined,
    detailRows: rows,
  };
}

export function listDevPaymentGatesWithCounts(): PaymentGateRecord[] {
  return devPaymentGates
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((gate) => {
      let count = 0;
      for (const assigned of devAssignedGatesByUserId.values()) {
        if (assigned.bankGateId === gate.id || assigned.usdtGateId === gate.id) count += 1;
      }
      return { ...gate, assigned_investors_count: count };
    });
}

export interface DevManualDepositRecord {
  id: string;
  user_id: string;
  user_email?: string;
  user_name?: string;
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'rejected';
  payment_method: string;
  reference: string;
  manual_transaction_id: string;
  sender_name: string;
  payment_date: string;
  fee_amount: number;
  gross_amount: number;
  extra_values: Record<string, string>;
  method_id: string;
  created_at: string;
  reviewed_at?: string;
  rejection_reason?: string;
}

let devManualDeposits: DevManualDepositRecord[] = [];

type DevHooks = {
  onDepositCreated?: (deposit: DevManualDepositRecord) => Promise<void> | void;
  onDepositReviewed?: (deposit: DevManualDepositRecord, approve: boolean, reason?: string) => Promise<void> | void;
  onGateAssigned?: (userId: string, gateId: string | null, method: 'bank' | 'usdt', gateName?: string | null) => Promise<void> | void;
  resolveCustomerGates?: (userId: string) => { bankGateId?: string | null; usdtGateId?: string | null } | null;
  persist?: () => Promise<void> | void;
};

let registeredDevHooks: DevHooks = {};

export function registerManualPaymentDevHooks(hooks: DevHooks) {
  registeredDevHooks = hooks;
}

export function hydrateManualPaymentDevState(deposits?: DevManualDepositRecord[]) {
  if (Array.isArray(deposits) && devManualDeposits.length === 0) {
    devManualDeposits = deposits;
  }
}

export function hydrateDevPaymentGatesState(
  gates?: PaymentGateRecord[],
  assigned?: Record<string, { bankGateId: string | null; usdtGateId: string | null }>
) {
  if (Array.isArray(gates) && gates.length > 0) {
    const existingIds = new Set(devPaymentGates.map((g) => g.id));
    for (const g of gates) {
      if (!g || !g.id) continue;
      if (existingIds.has(g.id)) {
        const idx = devPaymentGates.findIndex((item) => item.id === g.id);
        if (idx !== -1) devPaymentGates[idx] = g;
      } else {
        devPaymentGates.push(g);
        existingIds.add(g.id);
      }
    }
  }
  if (assigned && typeof assigned === 'object') {
    for (const [uid, entry] of Object.entries(assigned)) {
      if (!uid || !entry || typeof entry !== 'object') continue;
      const cur = devAssignedGatesByUserId.get(uid) || { bankGateId: null, usdtGateId: null };
      devAssignedGatesByUserId.set(uid, {
        bankGateId: cur.bankGateId ?? entry.bankGateId ?? null,
        usdtGateId: cur.usdtGateId ?? entry.usdtGateId ?? null,
      });
    }
  }
}

export function exportDevPaymentGatesState(): {
  paymentGates: PaymentGateRecord[];
  assignedGates: Record<string, { bankGateId: string | null; usdtGateId: string | null }>;
} {
  const assignedGates: Record<string, { bankGateId: string | null; usdtGateId: string | null }> = {};
  for (const [uid, entry] of devAssignedGatesByUserId.entries()) {
    assignedGates[uid] = { bankGateId: entry.bankGateId ?? null, usdtGateId: entry.usdtGateId ?? null };
  }
  return {
    paymentGates: devPaymentGates.map((g) => ({ ...g })),
    assignedGates,
  };
}

export function exportManualPaymentDevDeposits(): DevManualDepositRecord[] {
  return [...devManualDeposits];
}


function matchesFileSignature(bytes: Buffer, mimeType: string): boolean {
  if (mimeType === 'application/pdf') return bytes.subarray(0, 5).toString('ascii') === '%PDF-';
  if (mimeType === 'image/jpeg') return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (mimeType === 'image/png') return bytes.subarray(0, 8).equals(Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]));
  if (mimeType === 'image/webp') return bytes.length >= 12 && bytes.subarray(0, 4).toString('ascii') === 'RIFF' && bytes.subarray(8, 12).toString('ascii') === 'WEBP';
  return false;
}

const GATE_META_METHOD = '__gate_method';
const GATE_META_NETWORK = '__usdt_network';
const GATE_META_WALLET = '__usdt_wallet_address';
const GATE_META_ROWS = '__bank_detail_rows';
const RESERVED_GATE_KEYS = new Set([GATE_META_METHOD, GATE_META_NETWORK, GATE_META_WALLET, GATE_META_ROWS]);

function normalizeDetailRows(body: any, existing?: any): { detail_rows: GateDetailRow[]; account_details: Record<string, string> } {
  const source = body?.detailRows ?? body?.detail_rows ?? existing?.detail_rows ?? existing?.detailRows;
  const stored = existing?.account_details && typeof existing.account_details === 'object' ? existing.account_details : {};
  const raw = Array.isArray(source) && source.length > 0
    ? source
    : Array.isArray(stored[GATE_META_ROWS]) && stored[GATE_META_ROWS].length > 0
    ? stored[GATE_META_ROWS]
    : Object.entries(body?.accountDetails && typeof body.accountDetails === 'object' ? body.accountDetails : stored)
        .filter(([label]) => !RESERVED_GATE_KEYS.has(label))
        .map(([label, value]) => ({ label, value: String(value ?? '') }));
  const detail_rows = raw.map((item: any) => ({
    label: String(item?.label || '').trim().slice(0, 80),
    value: String(item?.value || '').trim().slice(0, 500),
  })).filter((item: GateDetailRow) => item.label && item.value);
  const account_details: Record<string, string> = {};
  for (const row of detail_rows) account_details[row.label] = row.value;
  return { detail_rows, account_details };
}

function safeMethodInput(body: any, actorId: string, existing?: any) {
  const name = String(body?.name ?? existing?.name ?? '').trim();
  const previousDetails = existing?.account_details && typeof existing.account_details === 'object' ? existing.account_details : {};
  const requestedMethod = String(body?.method ?? previousDetails[GATE_META_METHOD] ?? 'bank').trim().toLowerCase();
  const method = ['sepa', 'wire', 'bank_wire'].includes(requestedMethod) ? 'bank' : requestedMethod;
  const instructions = String(body?.instructions ?? existing?.instructions ?? '').trim();
  const minimum = Number(body?.minimumAmount ?? existing?.minimum_amount ?? 100);
  const maximumRaw = body?.maximumAmount ?? existing?.maximum_amount ?? null;
  const maximum = maximumRaw === null || maximumRaw === '' ? null : Number(maximumRaw);
  const feeType = (String(body?.feeType ?? existing?.fee_type ?? 'none')) as 'none' | 'fixed' | 'percent';
  const feeValue = Number(body?.feeValue ?? existing?.fee_value ?? 0);
  if (name.length < 2 || name.length > 100 || instructions.length > 10000 ||
      !['bank', 'usdt'].includes(method) ||
      !Number.isFinite(minimum) || minimum <= 0 ||
      (maximum !== null && (!Number.isFinite(maximum) || maximum < minimum)) ||
      !['none', 'fixed', 'percent'].includes(feeType) ||
      !Number.isFinite(feeValue) || feeValue < 0 ||
      feeValue > (feeType === 'percent' ? 100 : 1000000)) {
    throw new Error('INVALID_MANUAL_PAYMENT_METHOD');
  }
  const activeFlag = typeof body?.active === 'boolean' ? body.active :
    typeof body?.enabled === 'boolean' ? body.enabled : (existing?.enabled ?? true);
  const rawRows = body?.detailRows ?? body?.detail_rows;
  if (method === 'bank' && Array.isArray(rawRows) && rawRows.some((row: any) => !String(row?.label || '').trim() || !String(row?.value || '').trim())) {
    throw new Error('BANK_DETAILS_REQUIRED');
  }
  const { detail_rows } = normalizeDetailRows(body, existing);
  const network = String(body?.network ?? previousDetails[GATE_META_NETWORK] ?? '').trim().toUpperCase();
  const walletAddress = String(body?.walletAddress ?? body?.wallet_address ?? previousDetails[GATE_META_WALLET] ?? '').trim();
  if (method === 'bank' && (!detail_rows.length || detail_rows.some(row => !row.label || !row.value))) {
    throw new Error('BANK_DETAILS_REQUIRED');
  }
  if (method === 'usdt') {
    const validNetwork = ['TRC20', 'ERC20', 'BEP20'].includes(network);
    const validAddress = network === 'TRC20'
      ? (walletAddress.startsWith('T') && walletAddress.length === 34 && [...walletAddress].every((char) => char.trim().length > 0))
      : ['ERC20', 'BEP20'].includes(network) ? /^0x[a-fA-F0-9]{40}$/.test(walletAddress) : false;
    if (!validNetwork || !validAddress) throw new Error('INVALID_USDT_NETWORK_OR_ADDRESS');
  }
  const account_details: Record<string, any> = { ...previousDetails, [GATE_META_METHOD]: method };
  for (const key of Object.keys(account_details)) {
    if (!RESERVED_GATE_KEYS.has(key)) delete account_details[key];
  }
  if (method === 'bank') {
    for (const row of detail_rows) account_details[row.label] = row.value;
    account_details[GATE_META_ROWS] = detail_rows;
    delete account_details[GATE_META_NETWORK];
    delete account_details[GATE_META_WALLET];
  } else {
    account_details[GATE_META_NETWORK] = network;
    account_details[GATE_META_WALLET] = walletAddress;
    delete account_details[GATE_META_ROWS];
  }
  return {
    name,
    logo_url: typeof (body?.logoUrl ?? existing?.logo_url) === 'string' ? String(body?.logoUrl ?? existing?.logo_url).slice(0, 1000) : null,
    instructions,
    account_details,
    minimum_amount: minimum,
    maximum_amount: maximum,
    fee_type: feeType,
    fee_value: feeValue,
    extra_fields: Array.isArray(body?.extraFields) ? body.extraFields : (existing?.extra_fields || []),
    enabled: activeFlag,
    sort_order: Number.isInteger(body?.sortOrder) ? body.sortOrder : (existing?.sort_order || 0),
    updated_by: actorId
  };
}

function decorateGateRow(row: any, assignedCount = 0) {
  const stored = row.account_details && typeof row.account_details === 'object' ? row.account_details : {};
  const { detail_rows, account_details } = normalizeDetailRows({}, row);
  const methodValue = String(row.method || stored[GATE_META_METHOD] || 'bank').toLowerCase();
  const method = ['sepa', 'wire', 'bank_wire', 'bank'].includes(methodValue)
    ? 'bank'
    : ['usdt', 'usdc', 'crypto'].includes(methodValue)
    ? 'usdt'
    : methodValue;
  const network = String(
    stored[GATE_META_NETWORK] || row.network || stored.network || stored.Network || ''
  ).trim();
  const walletAddress = String(
    stored[GATE_META_WALLET] ||
      row.wallet_address ||
      row.walletAddress ||
      stored.wallet_address ||
      stored.walletAddress ||
      stored['Wallet address'] ||
      stored.address ||
      ''
  ).trim();
  const active = row.enabled !== false;
  return {
    ...row,
    method,
    network,
    wallet_address: walletAddress,
    detail_rows,
    detailRows: detail_rows,
    account_details: method === 'usdt'
      ? { Network: network, 'Wallet address': walletAddress }
      : account_details,
    active,
    enabled: active,
    assigned_investors_count: assignedCount,
    assignedInvestorsCount: assignedCount,
  };
}

manualPaymentRouter.get('/methods', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const sendDevAssignedMethods = () => {
    const devAssigned = getDevAssignedGates(req.user!.id);
    const customerAssigned = registeredDevHooks.resolveCustomerGates?.(req.user!.id);
    const bankGateId = devAssigned.bankGateId ?? customerAssigned?.bankGateId ?? null;
    const usdtGateId = devAssigned.usdtGateId ?? customerAssigned?.usdtGateId ?? null;
    const allActive = listDevPaymentGatesWithCounts().filter((gate) => gate.active);
    const filtered = (bankGateId || usdtGateId)
      ? allActive.filter((gate) => gate.id === bankGateId || gate.id === usdtGateId)
      : allActive;
    const active = filtered.map((gate) => decorateGateRow(gate, gate.assigned_investors_count || 0));
    return res.json({ success: true, data: active, requestId: req.id });
  };
  if (!canUseLiveSupabaseData()) {
    return sendDevAssignedMethods();
  }
  try {
    const client = getSupabaseAdmin();
    const { data: profile, error: profileError } = await client.from('profiles')
      .select('payment_gate_id,usdt_payment_gate_id')
      .eq('id', req.user!.id)
      .maybeSingle();
    if (profileError) throw profileError;
    const assigned = [
      { id: profile?.payment_gate_id, method: 'bank' },
      { id: profile?.usdt_payment_gate_id, method: 'usdt' },
    ].filter((item) => Boolean(item.id));

    const { data, error } = await client.from('manual_payment_methods')
      .select('*')
      .eq('enabled', true)
      .order('sort_order').order('created_at');
    if (error) throw error;

    const allMethods = (data || []).map((row) => decorateGateRow(row));
    const available = assigned.length > 0
      ? allMethods.filter((row) => assigned.some((item) => String(item.id) === String(row.id)))
      : allMethods;

    // If the admin assigned an inbuilt gate ID that is not yet mirrored in manual_payment_methods,
    // resolve that specific assigned gate from the inbuilt registry without exposing unassigned gates.
    const foundIds = new Set(available.map((row) => String(row.id)));
    for (const item of assigned) {
      const gid = String(item.id);
      if (foundIds.has(gid)) continue;
      const inbuilt = getDevGateById(gid);
      if (inbuilt && inbuilt.enabled !== false && inbuilt.active !== false) {
        const decorated = decorateGateRow(inbuilt);
        if (decorated.method === item.method) {
          available.push(decorated);
          foundIds.add(gid);
        }
      }
    }
    return res.json({ success: true, data: available, requestId: req.id });
  } catch (err: any) {
    if (process.env.NODE_ENV !== 'production' && isMissingSchemaError(err)) {
      markSupabaseSchemaMissingInDev();
      return sendDevAssignedMethods();
    }
    return res.status(503).json({ success: false, error: 'This payment option is not set up for your account yet. Please contact support if you need help.', code: 'MANUAL_METHODS_UNAVAILABLE', requestId: req.id });
  }
});

manualPaymentRouter.post('/deposits/:id/proof', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const depositId = String(req.params.id || '');
  const storagePath = String(req.body?.path || '');
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(depositId) ||
      !storagePath.startsWith(`${userId}/${depositId}/`) || storagePath.length > 500) {
    return res.status(400).json({ success: false, error: 'Invalid proof upload reference.', code: 'INVALID_PROOF_REFERENCE', requestId: req.id });
  }
  if (!isSupabaseServerConfigured()) {
    return res.status(503).json({ success: false, error: 'Private proof storage is unavailable in sandbox mode.', code: 'PROOF_STORAGE_UNAVAILABLE', requestId: req.id });
  }
  const client = getSupabaseAdmin();
  try {
    const { data: proof, error: proofError } = await client.storage.from('proofs').download(storagePath);
    if (proofError || !proof) {
      return res.status(400).json({ success: false, error: 'The uploaded proof could not be found in private storage.', code: 'PROOF_NOT_FOUND', requestId: req.id });
    }
    const { data: row, error: updateError } = await client.from('manual_deposit_submissions')
      .update({ proof_storage_path: storagePath })
      .eq('id', depositId)
      .eq('user_id', userId)
      .eq('status', 'pending')
      .select('id')
      .maybeSingle();
    if (updateError) throw updateError;
    if (!row) {
      await client.storage.from('proofs').remove([storagePath]);
      return res.status(409).json({ success: false, error: 'This deposit is no longer pending or does not belong to your account.', code: 'DEPOSIT_NOT_PENDING_OR_NOT_OWNED', requestId: req.id });
    }
    return res.json({ success: true, data: { id: row.id }, message: 'Payment proof attached securely.', requestId: req.id });
  } catch {
    await client.storage.from('proofs').remove([storagePath]).catch(() => undefined);
    return res.status(503).json({ success: false, error: 'The payment proof could not be attached. Please retry.', code: 'PROOF_ATTACH_FAILED', requestId: req.id });
  }
});

manualPaymentRouter.post('/deposits', requireAuth, requireLatestLegalConsent, submitLimiter, async (req: AuthenticatedRequest, res: Response) => {
  if (!isSupabaseServerConfigured() && process.env.NODE_ENV === 'production') {
    return res.status(503).json({ success: false, error: 'Persistent payment storage is not configured.', code: 'DATABASE_NOT_CONFIGURED', requestId: req.id });
  }
  const body = req.body || {};
  const amount = Number(body.amount);
  const transactionId = String(body.transactionId || '').trim();
  const senderName = String(body.senderName || '').trim();
  const paymentDate = String(body.paymentDate || '').trim();
  const proofBase64 = String(body.proofBase64 || '');
  if (proofBase64.length > Math.ceil(MAX_PROOF_BYTES * 4 / 3) + 256) return res.status(413).json({ success: false, error: 'Proof files must be 5 MB or smaller.', code: 'PROOF_FILE_TOO_LARGE', requestId: req.id });
  const mimeType = String(body.proofMimeType || '').toLowerCase();
  const extraValues = body.extraValues && typeof body.extraValues === 'object' ? body.extraValues : {};
  if (!Number.isFinite(amount) || amount <= 0 || transactionId.length < 4 || transactionId.length > 120 ||
      senderName.length < 2 || senderName.length > 120 || !/^\d{4}-\d{2}-\d{2}$/.test(paymentDate) ||
      !allowedMimeTypes.has(mimeType) || !proofBase64) {
    return res.status(400).json({ success: false, error: 'Enter a valid amount, transaction ID, sender name, payment date, and proof file.', code: 'INVALID_MANUAL_DEPOSIT', requestId: req.id });
  }
  let bytes: Buffer;
  try { bytes = Buffer.from(proofBase64.replace(/^data:[^;]+;base64,/, ''), 'base64'); }
  catch { return res.status(400).json({ success: false, error: 'The proof file could not be read.', code: 'INVALID_PROOF_FILE', requestId: req.id }); }
  if (!bytes.length || bytes.length > MAX_PROOF_BYTES) return res.status(413).json({ success: false, error: 'Proof files must be 5 MB or smaller.', code: 'PROOF_FILE_TOO_LARGE', requestId: req.id });
  if (!matchesFileSignature(bytes, mimeType)) return res.status(400).json({ success: false, error: 'The uploaded file content does not match its declared file type.', code: 'INVALID_PROOF_FILE', requestId: req.id });
  const userId = req.user!.id;
  const submitInDev = async () => {
    const method = devPaymentGates.find((item) => item.id === String(body.methodId) && item.enabled);
    if (!method) return res.status(404).json({ success: false, error: 'Selected payment method is unavailable.', code: 'PAYMENT_METHOD_NOT_FOUND', requestId: req.id });
    const devMethodType = ['sepa', 'wire', 'bank_wire'].includes(String(method.method).toLowerCase()) ? 'bank' : String(method.method).toLowerCase();
    const customerAssigned = registeredDevHooks.resolveCustomerGates?.(userId);
    const expectedGateId = devMethodType === 'usdt'
      ? (getDevAssignedGateId(userId, 'usdt') ?? customerAssigned?.usdtGateId ?? null)
      : (getDevAssignedGateId(userId, 'bank') ?? customerAssigned?.bankGateId ?? null);
    if (!['bank', 'usdt'].includes(devMethodType) || expectedGateId !== method.id) {
      return res.status(403).json({ success: false, error: 'This payment method is not assigned to your account.', code: 'PAYMENT_METHOD_NOT_ASSIGNED', requestId: req.id });
    }
    if (amount < Number(method.minimum_amount) || (method.maximum_amount && amount > Number(method.maximum_amount))) {
      return res.status(400).json({ success: false, error: 'The amount is outside this payment method’s allowed limits.', code: 'AMOUNT_OUT_OF_RANGE', requestId: req.id });
    }
    if (devManualDeposits.some((deposit) => deposit.manual_transaction_id.toLowerCase() === transactionId.toLowerCase())) {
      return res.status(409).json({ success: false, error: 'This payment transaction ID has already been submitted.', code: 'DUPLICATE_PAYMENT_TRANSACTION', requestId: req.id });
    }
    for (const field of Array.isArray(method.extra_fields) ? method.extra_fields : []) {
      if (field.required && (typeof extraValues[field.key] !== 'string' || !extraValues[field.key].trim())) {
        return res.status(400).json({ success: false, error: `Please complete: ${field.label}`, code: 'MISSING_EXTRA_FIELD', requestId: req.id });
      }
    }
    const reference = `KZ-MAN-${crypto.randomBytes(6).toString('hex').toUpperCase()}`;
    const fee = method.fee_type === 'fixed' ? Number(method.fee_value) : method.fee_type === 'percent' ? amount * Number(method.fee_value) / 100 : 0;
    const record: DevManualDepositRecord = {
      id: `dep-man-${crypto.randomUUID()}`,
      user_id: userId,
      user_email: req.user!.email,
      user_name: req.user!.fullName,
      amount,
      currency: 'EUR',
      status: 'pending',
      payment_method: method.name,
      reference,
      manual_transaction_id: transactionId,
      sender_name: senderName,
      payment_date: paymentDate,
      fee_amount: Number(fee.toFixed(2)),
      gross_amount: Number((amount + fee).toFixed(2)),
      extra_values: extraValues,
      method_id: method.id,
      created_at: new Date().toISOString(),
    };
    devManualDeposits.unshift(record);
    await registeredDevHooks.onDepositCreated?.(record);
    await registeredDevHooks.persist?.();
    return res.status(201).json({ success: true, data: record, message: 'Payment proof received. Your deposit remains pending until finance verification.', requestId: req.id });
  };
  if (!canUseLiveSupabaseData()) {
    return submitInDev();
  }
  const client = getSupabaseAdmin();
  let uploadedPath: string | null = null;
  try {
    const { data: method, error: methodError } = await client.from('manual_payment_methods')
      .select('*').eq('id', String(body.methodId)).eq('enabled', true).maybeSingle();
    if (methodError) throw methodError;
    if (!method) return res.status(404).json({ success: false, error: 'Selected payment method is unavailable.', code: 'PAYMENT_METHOD_NOT_FOUND', requestId: req.id });
    const { data: assignment, error: assignmentError } = await client.from('profiles')
      .select('payment_gate_id,usdt_payment_gate_id').eq('id', userId).maybeSingle();
    if (assignmentError) throw assignmentError;
    const methodType = decorateGateRow(method).method;
    const assignedGateId = methodType === 'usdt' ? assignment?.usdt_payment_gate_id : methodType === 'bank' ? assignment?.payment_gate_id : null;
    if (!assignedGateId || String(assignedGateId) !== String(method.id)) {
      return res.status(403).json({ success: false, error: 'This payment method is not assigned to your account.', code: 'PAYMENT_METHOD_NOT_ASSIGNED', requestId: req.id });
    }
    if (amount < Number(method.minimum_amount) || (method.maximum_amount && amount > Number(method.maximum_amount))) {
      return res.status(400).json({ success: false, error: 'The amount is outside this payment method’s allowed limits.', code: 'AMOUNT_OUT_OF_RANGE', requestId: req.id });
    }
    const requiredFields = Array.isArray(method.extra_fields) ? method.extra_fields : [];
    for (const field of requiredFields) {
      if (field.required && (typeof extraValues[field.key] !== 'string' || !extraValues[field.key].trim())) {
        return res.status(400).json({ success: false, error: `Please complete: ${field.label}`, code: 'MISSING_EXTRA_FIELD', requestId: req.id });
      }
    }
    const reference = `KZ-MAN-${crypto.randomBytes(6).toString('hex').toUpperCase()}`;
    const extension = mimeType === 'application/pdf' ? 'pdf' : mimeType === 'image/png' ? 'png' : mimeType === 'image/webp' ? 'webp' : 'jpg';
    uploadedPath = `${userId}/${crypto.randomUUID()}.${extension}`;
    const { error: uploadError } = await client.storage.from('manual-payment-proofs').upload(uploadedPath, bytes, { contentType: mimeType, upsert: false });
    if (uploadError) throw uploadError;
    const fee = method.fee_type === 'fixed' ? Number(method.fee_value) : method.fee_type === 'percent' ? amount * Number(method.fee_value) / 100 : 0;
    const { data: row, error: insertError } = await client.from('manual_deposit_submissions').insert({
      id: crypto.randomUUID(), user_id: userId, amount, currency: 'EUR',
      status: 'pending', payment_method: method.name, reference,
      manual_transaction_id: transactionId, sender_name: senderName, payment_date: paymentDate,
      proof_storage_path: uploadedPath, fee_amount: Number(fee.toFixed(2)),
      gross_amount: Number((amount + fee).toFixed(2)), extra_values: extraValues,
      method_id: method.id
    }).select('*,profiles!manual_deposit_submissions_user_id_fkey(email,full_name)').single();
    if (insertError) throw insertError;
    sendEmail({
      templateId: 'deposit_received', recipient: req.user!.email,
      data: { fullName: req.user!.fullName || 'Valued Investor', amount: amount.toFixed(2), currency: 'EUR', reference, method: method.name, status: 'Pending verification' }
    }).catch(error => logger.log({ level: 'error', category: 'payments', requestId: req.id || 'manual-deposit-email', eventType: 'EMAIL_DISPATCH_FAILURE', outcome: 'failure', message: error?.message || 'Manual deposit email failed.' }));
    return res.status(201).json({ success: true, data: row, message: 'Payment proof received. Your deposit remains pending until finance verification.', requestId: req.id });
  } catch (error: any) {
    if (uploadedPath) await client.storage.from('manual-payment-proofs').remove([uploadedPath]).catch(() => undefined);
    const duplicate = String(error?.code || '') === '23505' || String(error?.message || '').toLowerCase().includes('duplicate');
    return res.status(duplicate ? 409 : 503).json({ success: false, error: duplicate ? 'This payment transaction ID has already been submitted.' : 'The manual deposit could not be saved. Please retry.', code: duplicate ? 'DUPLICATE_PAYMENT_TRANSACTION' : 'MANUAL_DEPOSIT_FAILED', requestId: req.id });
  }
});

manualPaymentRouter.get('/admin/methods', requireStaffSection('settings', 'read'), async (req: AuthenticatedRequest, res: Response) => {
  const sendDevGates = () => {
    const data = listDevPaymentGatesWithCounts().map((g) => decorateGateRow(g, g.assigned_investors_count || 0));
    return res.json({ success: true, data, requestId: req.id });
  };
  if (!canUseLiveSupabaseData()) {
    return sendDevGates();
  }
  try {
    const client = getSupabaseAdmin();
    const [{ data, error }, { data: assignedRows }] = await Promise.all([
      client.from('manual_payment_methods').select('*').order('sort_order').order('created_at'),
      client.from('profiles').select('payment_gate_id,usdt_payment_gate_id'),
    ]);
    if (error) throw error;
    const countMap = new Map<string, number>();
    for (const row of assignedRows || []) {
      for (const assignedId of [(row as any).payment_gate_id, (row as any).usdt_payment_gate_id]) {
        const gid = String(assignedId || '');
        if (gid) countMap.set(gid, (countMap.get(gid) || 0) + 1);
      }
    }
    return res.json({
      success: true,
      data: (data || []).map((row: any) => decorateGateRow(row, countMap.get(String(row.id)) || 0)),
      requestId: req.id
    });
  } catch (err: any) {
    if (process.env.NODE_ENV !== 'production' && isMissingSchemaError(err)) {
      markSupabaseSchemaMissingInDev();
      return sendDevGates();
    }
    return res.status(503).json({ success: false, error: 'Unable to load manual payment methods.', code: 'MANUAL_METHODS_UNAVAILABLE', requestId: req.id });
  }
});

manualPaymentRouter.post('/admin/methods', requireStaffSection('settings', 'write'), async (req: AuthenticatedRequest, res: Response) => {
  const createInDev = async () => {
    try {
      const payload = safeMethodInput(req.body, req.user!.id);
      const now = new Date().toISOString();
      const created: PaymentGateRecord = {
        id: crypto.randomUUID(),
        ...payload,
        method: String(payload.account_details[GATE_META_METHOD] || 'bank'),
        detail_rows: Array.isArray(payload.account_details[GATE_META_ROWS]) ? payload.account_details[GATE_META_ROWS] : [],
        active: payload.enabled,
        assigned_investors_count: 0,
        created_at: now,
        updated_at: now,
      } as PaymentGateRecord;
      devPaymentGates.push(created);
      await registeredDevHooks.persist?.();
      return res.status(201).json({ success: true, data: decorateGateRow(created, 0), requestId: req.id });
    } catch (error: any) {
      return res.status(400).json({ success: false, error: error?.message || 'Invalid payment gate configuration.', code: 'INVALID_MANUAL_METHOD', requestId: req.id });
    }
  };
  if (!canUseLiveSupabaseData()) {
    return createInDev();
  }
  try {
    const payload = safeMethodInput(req.body, req.user!.id);
    const { data, error } = await getSupabaseAdmin().from('manual_payment_methods').insert(payload).select('*').single();
    if (error) throw error;
    return res.status(201).json({ success: true, data: decorateGateRow(data, 0), requestId: req.id });
  } catch (error: any) {
    if (process.env.NODE_ENV !== 'production' && isMissingSchemaError(error)) {
      markSupabaseSchemaMissingInDev();
      return createInDev();
    }
    const msgMap: Record<string, string> = {
      INVALID_MANUAL_PAYMENT_METHOD: 'Enter a valid payment gate name, method, limits, and fee configuration.',
      INVALID_EXTRA_FIELDS: 'Extra payment form fields are invalid.',
      BANK_DETAILS_REQUIRED: 'Provide at least one complete bank detail row (e.g. Beneficiary and IBAN).',
      INVALID_USDT_NETWORK_OR_ADDRESS: 'Select TRC20, ERC20, or BEP20 and enter a valid USDT wallet address.',
    };
    const friendly = msgMap[String(error?.message || '')] || 'The payment method could not be created.';
    return res.status(400).json({ success: false, error: friendly, code: 'INVALID_MANUAL_METHOD', requestId: req.id });
  }
});

manualPaymentRouter.post('/admin/issue-account', requireStaffSection('finance', 'write'), async (req: AuthenticatedRequest, res: Response) => {
  const userId = String(req.body?.userId || '').trim();
  const gateIdInput = req.body?.gateId ? String(req.body.gateId).trim() : '';
  if (!userId) {
    return res.status(400).json({ success: false, error: 'Investor ID is required to issue payment account details.', code: 'USER_ID_REQUIRED', requestId: req.id });
  }

  let validatedPayload: ReturnType<typeof safeMethodInput>;
  try {
    validatedPayload = safeMethodInput({ ...req.body, active: req.body?.active ?? true }, req.user!.id);
  } catch (err: any) {
    const msgMap: Record<string, string> = {
      INVALID_MANUAL_PAYMENT_METHOD: 'Enter a valid account label and payment rail configuration.',
      BANK_DETAILS_REQUIRED: 'Enter bank account details (Beneficiary, Bank Name, IBAN, and optional BIC/Reference).',
      INVALID_USDT_NETWORK_OR_ADDRESS: 'Select TRC20, ERC20, or BEP20 and enter a valid USDT wallet address.',
    };
    return res.status(400).json({
      success: false,
      error: msgMap[String(err?.message || '')] || 'Payment account details could not be validated.',
      code: 'INVALID_PAYMENT_ACCOUNT_DETAILS',
      requestId: req.id,
    });
  }

  const normalizedMethod: 'bank' | 'usdt' = validatedPayload.account_details[GATE_META_METHOD] === 'usdt' ? 'usdt' : 'bank';

  const issueInDev = async () => {
    const now = new Date().toISOString();
    let gateRecord: PaymentGateRecord;
    const existingIdx = gateIdInput ? devPaymentGates.findIndex((g) => g.id === gateIdInput) : -1;
    if (existingIdx !== -1) {
      gateRecord = {
        ...devPaymentGates[existingIdx],
        ...validatedPayload,
        method: normalizedMethod,
        detail_rows: Array.isArray(validatedPayload.account_details[GATE_META_ROWS]) ? validatedPayload.account_details[GATE_META_ROWS] : [],
        active: validatedPayload.enabled,
        updated_at: now,
      } as PaymentGateRecord;
      devPaymentGates[existingIdx] = gateRecord;
    } else {
      gateRecord = {
        id: crypto.randomUUID(),
        ...validatedPayload,
        method: normalizedMethod,
        detail_rows: Array.isArray(validatedPayload.account_details[GATE_META_ROWS]) ? validatedPayload.account_details[GATE_META_ROWS] : [],
        active: validatedPayload.enabled,
        sort_order: devPaymentGates.length + 1,
        assigned_investors_count: 1,
        created_at: now,
        updated_at: now,
      } as PaymentGateRecord;
      devPaymentGates.push(gateRecord);
    }
    setDevAssignedGateId(userId, gateRecord.id, normalizedMethod);
    await registeredDevHooks.onGateAssigned?.(userId, gateRecord.id, normalizedMethod, gateRecord.name);
    await registeredDevHooks.persist?.();
    const assigned = getDevAssignedGates(userId);
    return res.status(existingIdx !== -1 ? 200 : 201).json({
      success: true,
      data: {
        gate: decorateGateRow(gateRecord, 1),
        assignedBankAccount: toAssignedPaymentAccount(getDevGateById(assigned.bankGateId)),
        assignedUsdtAccount: toAssignedPaymentAccount(getDevGateById(assigned.usdtGateId)),
      },
      message: `Issued ${normalizedMethod === 'usdt' ? 'USDT' : 'bank'} payment account details to investor.`,
      requestId: req.id,
    });
  };

  if (!canUseLiveSupabaseData()) {
    return issueInDev();
  }

  try {
    const client = getSupabaseAdmin();
    const { data: profile, error: profErr } = await client
      .from('profiles')
      .select('id,email,full_name,payment_gate_id,usdt_payment_gate_id')
      .eq('id', userId)
      .maybeSingle();
    if (profErr) throw profErr;
    if (!profile) {
      return res.status(404).json({ success: false, error: 'Investor account not found.', code: 'USER_NOT_FOUND', requestId: req.id });
    }

    let gateRow: any = null;
    if (gateIdInput) {
      const { data: updated, error: updErr } = await client
        .from('manual_payment_methods')
        .update(validatedPayload)
        .eq('id', gateIdInput)
        .select('*')
        .maybeSingle();
      if (updErr) throw updErr;
      gateRow = updated;
    }

    if (!gateRow) {
      const { data: inserted, error: insErr } = await client
        .from('manual_payment_methods')
        .insert(validatedPayload)
        .select('*')
        .single();
      if (insErr) throw insErr;
      gateRow = inserted;
    }

    const { error: assignRpcErr } = await client.rpc('assign_gate', {
      p_users: [userId],
      p_gate: gateRow.id,
    });
    if (assignRpcErr) {
      const columnPatch = normalizedMethod === 'usdt'
        ? { usdt_payment_gate_id: gateRow.id }
        : { payment_gate_id: gateRow.id };
      const { error: directAssignErr } = await client
        .from('profiles')
        .update(columnPatch)
        .eq('id', userId);
      if (directAssignErr) throw directAssignErr;
    }

    if (req.body?.notifyInvestor !== false) {
      const summaryLine = normalizedMethod === 'usdt'
        ? `${validatedPayload.account_details[GATE_META_NETWORK]} wallet ${validatedPayload.account_details[GATE_META_WALLET]}`
        : `${validatedPayload.name} bank funding coordinates`;
      try {
        await client.from('notifications').insert({
          user_id: userId,
          title: normalizedMethod === 'usdt' ? 'USDT deposit wallet issued' : 'Payment account details issued',
          body: `Your dedicated treasury payment details are ready (${summaryLine}). Open Wallet or Deposit to view full instructions.`,
          read: false,
        });
      } catch {}
    }

    const decorated = decorateGateRow(gateRow, 1);
    const issuedAccount = toAssignedPaymentAccount(gateRow as PaymentGateRecord);
    return res.status(gateIdInput ? 200 : 201).json({
      success: true,
      data: {
        gate: decorated,
        assignedBankAccount: normalizedMethod === 'bank' ? issuedAccount : null,
        assignedUsdtAccount: normalizedMethod === 'usdt' ? issuedAccount : null,
      },
      message: `Issued ${normalizedMethod === 'usdt' ? 'USDT' : 'bank'} payment account details to investor.`,
      requestId: req.id,
    });
  } catch (err: any) {
    if (process.env.NODE_ENV !== 'production' && isMissingSchemaError(err)) {
      markSupabaseSchemaMissingInDev();
      return issueInDev();
    }
    return res.status(503).json({
      success: false,
      error: 'Unable to issue payment account details right now.',
      code: 'ISSUE_PAYMENT_ACCOUNT_FAILED',
      requestId: req.id,
    });
  }
});

manualPaymentRouter.patch('/admin/methods/:id', requireStaffSection('settings', 'write'), async (req: AuthenticatedRequest, res: Response) => {
  const updateInDev = async () => {
    const idx = devPaymentGates.findIndex((g) => g.id === req.params.id);
    if (idx === -1) return res.status(404).json({ success: false, error: 'Payment gate not found.', code: 'MANUAL_METHOD_NOT_FOUND', requestId: req.id });
    try {
      const existing = devPaymentGates[idx];
      const payload = safeMethodInput(req.body, req.user!.id, existing);
      const updated: PaymentGateRecord = {
        ...existing,
        ...payload,
        method: String(payload.account_details[GATE_META_METHOD] || 'bank'),
        detail_rows: Array.isArray(payload.account_details[GATE_META_ROWS]) ? payload.account_details[GATE_META_ROWS] : [],
        active: payload.enabled,
        updated_at: new Date().toISOString(),
      } as PaymentGateRecord;
      devPaymentGates[idx] = updated;
      let count = 0;
      for (const assigned of devAssignedGatesByUserId.values()) {
        if (assigned.bankGateId === updated.id || assigned.usdtGateId === updated.id) count += 1;
      }
      await registeredDevHooks.persist?.();
      return res.json({ success: true, data: decorateGateRow(updated, count), requestId: req.id });
    } catch (err: any) {
      const msgMap: Record<string, string> = {
        BANK_DETAILS_REQUIRED: 'Provide at least one complete bank detail row.',
        INVALID_USDT_NETWORK_OR_ADDRESS: 'Select TRC20, ERC20, or BEP20 and enter a valid USDT wallet address.',
      };
      return res.status(400).json({ success: false, error: msgMap[String(err?.message || '')] || 'The payment method could not be updated.', code: 'MANUAL_METHOD_UPDATE_FAILED', requestId: req.id });
    }
  };
  if (!canUseLiveSupabaseData()) {
    return updateInDev();
  }
  try {
    const client = getSupabaseAdmin();
    const { data: existing, error: readError } = await client.from('manual_payment_methods').select('*').eq('id', req.params.id).maybeSingle();
    if (readError) throw readError;
    if (!existing) return res.status(404).json({ success: false, error: 'Payment method not found.', code: 'MANUAL_METHOD_NOT_FOUND', requestId: req.id });
    const payload = safeMethodInput(req.body, req.user!.id, existing);
    const oldMethod = String(existing.account_details?.[GATE_META_METHOD] || 'bank').toLowerCase();
    const nextMethod = String(payload.account_details[GATE_META_METHOD] || 'bank').toLowerCase();
    if (oldMethod !== nextMethod) {
      const [{ count: bankAssignments }, { count: usdtAssignments }] = await Promise.all([
        client.from('profiles').select('id', { count: 'exact', head: true }).eq('payment_gate_id', existing.id),
        client.from('profiles').select('id', { count: 'exact', head: true }).eq('usdt_payment_gate_id', existing.id),
      ]);
      if ((bankAssignments || 0) + (usdtAssignments || 0) > 0) {
        return res.status(409).json({
          success: false,
          error: 'A payment gate assigned to investors cannot change type. Clear its investor assignments first.',
          code: 'GATE_METHOD_IN_USE',
          requestId: req.id,
        });
      }
    }
    const { data, error } = await client.from('manual_payment_methods').update(payload).eq('id', existing.id).select('*').single();
    if (error) throw error;
    const [{ count: bankCount }, { count: usdtCount }] = await Promise.all([
      client.from('profiles').select('id', { count: 'exact', head: true }).eq('payment_gate_id', existing.id),
      client.from('profiles').select('id', { count: 'exact', head: true }).eq('usdt_payment_gate_id', existing.id),
    ]);
    return res.json({ success: true, data: decorateGateRow(data, (bankCount || 0) + (usdtCount || 0)), requestId: req.id });
  } catch (error: any) {
    if (process.env.NODE_ENV !== 'production' && isMissingSchemaError(error)) {
      markSupabaseSchemaMissingInDev();
      return updateInDev();
    }
    const msgMap: Record<string, string> = {
      BANK_DETAILS_REQUIRED: 'Provide at least one complete bank detail row.',
      INVALID_USDT_NETWORK_OR_ADDRESS: 'Select TRC20, ERC20, or BEP20 and enter a valid USDT wallet address.',
    };
    return res.status(400).json({ success: false, error: msgMap[String(error?.message || '')] || 'The payment method could not be updated.', code: 'MANUAL_METHOD_UPDATE_FAILED', requestId: req.id });
  }
});

manualPaymentRouter.delete('/admin/methods/:id', requireStaffSection('settings', 'write'), async (req: AuthenticatedRequest, res: Response) => {
  const gateId = req.params.id;
  const deleteInDev = async () => {
    const idx = devPaymentGates.findIndex((g) => g.id === gateId);
    if (idx === -1) return res.status(404).json({ success: false, error: 'Payment gate not found.', code: 'MANUAL_METHOD_NOT_FOUND', requestId: req.id });
    let assignedCount = 0;
    for (const assigned of devAssignedGatesByUserId.values()) {
      if (assigned.bankGateId === gateId || assigned.usdtGateId === gateId) assignedCount += 1;
    }
    if (assignedCount > 0) {
      return res.status(409).json({
        success: false,
        error: `This payment gate is currently assigned to ${assignedCount} investor(s). Deactivate it instead of deleting.`,
        code: 'GATE_IN_USE',
        requestId: req.id,
      });
    }
    devPaymentGates.splice(idx, 1);
    await registeredDevHooks.persist?.();
    return res.json({ success: true, message: 'Payment gate deleted.', requestId: req.id });
  };
  if (!canUseLiveSupabaseData()) {
    return deleteInDev();
  }
  try {
    const client = getSupabaseAdmin();
    const [{ count: bankCount, error: bankCountErr }, { count: usdtCount, error: usdtCountErr }] = await Promise.all([
      client.from('profiles').select('id', { count: 'exact', head: true }).eq('payment_gate_id', gateId),
      client.from('profiles').select('id', { count: 'exact', head: true }).eq('usdt_payment_gate_id', gateId),
    ]);
    if (bankCountErr) throw bankCountErr;
    if (usdtCountErr) throw usdtCountErr;
    const count = (bankCount || 0) + (usdtCount || 0);
    if (count > 0) {
      return res.status(409).json({
        success: false,
        error: `This payment gate is currently assigned to ${count} investor(s). Deactivate it instead of deleting.`,
        code: 'GATE_IN_USE',
        requestId: req.id,
      });
    }
    const { error } = await client.from('manual_payment_methods').delete().eq('id', gateId);
    if (error) {
      const msg = String(error.message || '');
      if (msg.includes('GATE_IN_USE_DEACTIVATE_ONLY') || error.code === '23503') {
        return res.status(409).json({
          success: false,
          error: 'This payment gate is assigned to one or more investors. Deactivate it instead of deleting.',
          code: 'GATE_IN_USE',
          requestId: req.id,
        });
      }
      throw error;
    }
    return res.json({ success: true, message: 'Payment gate deleted.', requestId: req.id });
  } catch (err: any) {
    if (process.env.NODE_ENV !== 'production' && isMissingSchemaError(err)) {
      markSupabaseSchemaMissingInDev();
      return deleteInDev();
    }
    return res.status(503).json({ success: false, error: 'Unable to delete payment gate.', code: 'GATE_DELETE_FAILED', requestId: req.id });
  }
});

manualPaymentRouter.get('/admin/deposits', requireStaffSection('deposits', 'read'), async (req: AuthenticatedRequest, res: Response) => {
  if (!isSupabaseServerConfigured()) {
    return res.json({ success: true, data: [], total: 0, requestId: req.id });
  }
  try {
    let query = getSupabaseAdmin().from('manual_deposit_submissions').select('*,profiles!manual_deposit_submissions_user_id_fkey(email,full_name)').order('created_at', { ascending: false }).limit(300);
    if (typeof req.query.status === 'string' && ['pending','completed','rejected'].includes(req.query.status)) query = query.eq('status', req.query.status);
    const { data, error } = await query;
    if (error) throw error;
    return res.json({ success: true, data: data || [], total: data?.length || 0, requestId: req.id });
  } catch { return res.status(503).json({ success: false, error: 'Manual deposit queue is unavailable.', code: 'MANUAL_DEPOSIT_QUEUE_UNAVAILABLE', requestId: req.id }); }
});

manualPaymentRouter.get('/admin/deposits/:id/proof', requireStaffSection('deposits', 'read'), async (req: AuthenticatedRequest, res: Response) => {
  if (!isSupabaseServerConfigured()) {
    return res.status(404).json({ success: false, error: 'Proof file not found in sandbox mode.', code: 'PROOF_NOT_FOUND', requestId: req.id });
  }
  try {
    const { data: row, error } = await getSupabaseAdmin().from('manual_deposit_submissions')
      .select('proof_storage_path').eq('id', req.params.id).maybeSingle();
    if (error) throw error;
    if (!row?.proof_storage_path) return res.status(404).json({ success: false, error: 'Proof file not found.', code: 'PROOF_NOT_FOUND', requestId: req.id });
    const storage = getSupabaseAdmin().storage;
    let signed = await storage.from('proofs').createSignedUrl(row.proof_storage_path, 60);
    // Keep older submissions readable from the legacy private bucket.
    if (signed.error) signed = await storage.from('manual-payment-proofs').createSignedUrl(row.proof_storage_path, 60);
    if (signed.error || !signed.data?.signedUrl) throw signed.error || new Error('PROOF_SIGNING_FAILED');
    return res.json({ success: true, data: { url: signed.data.signedUrl, expiresInSeconds: 60 }, requestId: req.id });
  } catch { return res.status(503).json({ success: false, error: 'Proof file could not be opened.', code: 'PROOF_ACCESS_FAILED', requestId: req.id }); }
});

manualPaymentRouter.post('/admin/deposits/:id/review', requireStaffSection('deposits', 'write'), async (req: AuthenticatedRequest, res: Response) => {
  if (!isSupabaseServerConfigured()) {
    return res.status(503).json({ success: false, error: 'Persistent payment storage is not configured.', code: 'DATABASE_NOT_CONFIGURED', requestId: req.id });
  }
  const approve = req.body?.decision === 'approve';
  if (!approve && req.body?.decision !== 'reject') return res.status(400).json({ success: false, error: 'Choose approve or reject.', code: 'INVALID_REVIEW_DECISION', requestId: req.id });
  const reason = String(req.body?.reason || '').trim().slice(0, 1000);
  if (!approve && reason.length < 3) return res.status(400).json({ success: false, error: 'A rejection reason is required.', code: 'REJECTION_REASON_REQUIRED', requestId: req.id });
  const actionScope = approve ? 'admin.deposit.approve' : 'admin.deposit.reject';
  const grantId = String(req.headers['x-action-verification'] || '');
  if (!/^[0-9a-f-]{36}$/i.test(grantId)) return res.status(428).json({ success: false, error: 'Email action verification is required.', code: 'ACTION_EMAIL_VERIFICATION_REQUIRED', requestId: req.id });
  try {
    const verified = await consumeDashboardActionGrant(grantId, req.user!.id, actionScope);
    if (!verified) return res.status(428).json({ success: false, error: 'The email verification has expired or does not match this action.', code: 'ACTION_EMAIL_VERIFICATION_REQUIRED', requestId: req.id });
    const client = getSupabaseAdmin();
    const { data: current, error: readError } = await client.from('manual_deposit_submissions')
      .select('*,profiles!manual_deposit_submissions_user_id_fkey(email,full_name)').eq('id', req.params.id).maybeSingle();
    if (readError) throw readError;
    if (!current) return res.status(404).json({ success: false, error: 'Manual deposit not found.', code: 'DEPOSIT_NOT_FOUND', requestId: req.id });
    if (current.status !== 'pending') return res.status(409).json({ success: false, error: 'This deposit has already been reviewed.', code: 'DEPOSIT_NOT_PENDING', requestId: req.id });
    const { data: reviewResult, error: reviewError } = await client.rpc('kretz_review_manual_deposit', {
      p_submission_id: current.id, p_admin_id: req.user!.id, p_approve: approve, p_reason: approve ? null : reason
    });
    if (reviewError) throw reviewError;
    const recipient = current.profiles?.email;
    if (recipient) sendEmail({
      templateId: approve ? 'deposit_confirmed' : 'deposit_received', recipient,
      data: { fullName: current.profiles?.full_name || 'Valued Investor', amount: Number(current.amount).toFixed(2), currency: current.currency || 'EUR', reference: current.reference, reason }
    }).catch(error => logger.log({ level: 'error', category: 'payments', requestId: req.id || 'manual-review-email', eventType: 'EMAIL_DISPATCH_FAILURE', outcome: 'failure', message: error?.message || 'Manual deposit decision email failed.' }));
    return res.json({ success: true, data: reviewResult, message: approve ? 'Deposit approved and wallet credited.' : 'Deposit rejected.', requestId: req.id });
  } catch (error: any) {
    const message = String(error?.message || '');
    const status = message.includes('DEPOSIT_NOT_FOUND') ? 404 : message.includes('DEPOSIT_NOT_PENDING') ? 409 : message.includes('ADMIN_REQUIRED') || message.includes('FINANCE_ADMIN_REQUIRED') ? 403 : 503;
    return res.status(status).json({ success: false, error: status === 503 ? 'The deposit review could not be completed. Please retry.' : message, code: 'MANUAL_DEPOSIT_REVIEW_FAILED', requestId: req.id });
  }
});
