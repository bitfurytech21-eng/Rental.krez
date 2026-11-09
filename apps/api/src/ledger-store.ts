/**
 * Durable-ish ledger abstraction for Workers (KV/D1 when bound) with in-memory fallback.
 * This is an incremental migration: it preserves request/response contracts used by web clients
 * and adds idempotency/audit hooks; production should bind D1+KV and move financial rules to SQL transactions.
 */
import { mockUsers, mockListings, mockTransactions, platformConfig, newId } from './shared-store';

export type Bindings = { DB?: D1Database; CACHE?: KVNamespace; SESSIONS?: KVNamespace; IDEMPOTENCY?: KVNamespace; TURNSTILE_SECRET_KEY?: string };

async function idemGet(env: Bindings, key: string) {
  if (!key) return null;
  if (env.IDEMPOTENCY) { const v = await env.IDEMPOTENCY.get(`idem:${key}`); return v ? JSON.parse(v) : null; }
  return (globalThis as any).__idem?.get?.(key) || null;
}
async function idemPut(env: Bindings, key: string, value: any) {
  if (!key) return;
  if (env.IDEMPOTENCY) { await env.IDEMPOTENCY.put(`idem:${key}`, JSON.stringify(value), { expirationTtl: 86400 * 7 }); return; }
  const g = (globalThis as any); g.__idem = g.__idem || new Map(); g.__idem.set(key, value);
}

function findUser(user: any) {
  return mockUsers.find((u) => u.id === user?.id || (user?.email && u.email.toLowerCase() === user.email.toLowerCase()));
}

export async function createDeposit(env: Bindings, actor: any, body: any) {
  if (!platformConfig.depositsEnabled) return { status: 403, body: { success: false, error: 'New deposits are temporarily suspended by platform administration.', code: 'DEPOSITS_SUSPENDED' } };
  if (platformConfig.maintenanceMode && actor?.role !== 'admin') return { status: 403, body: { success: false, error: 'Platform under maintenance.', code: 'MAINTENANCE_MODE_ACTIVE' } };
  const amount = Number(body?.amount);
  if (!amount || amount < 100) return { status: 400, body: { success: false, error: 'Minimum deposit amount is €100.', code: 'INVALID_DEPOSIT_AMOUNT' } };
  const idem = body?.idempotencyKey || body?.idempotency_key;
  if (idem) { const seen = await idemGet(env, String(idem)); if (seen) return { status: 200, body: { ...seen, idempotentReplay: true } }; }
  const rec = findUser(actor);
  if (rec && rec.status === 'suspended') return { status: 403, body: { success: false, error: 'Account access restricted by administrative compliance.', code: 'ACCOUNT_SUSPENDED' } };
  const ref = `KZ-DEP-${Math.floor(100000 + Math.random() * 900000)}`;
  const tx = { id: newId('tx-dep'), userId: actor.id, userEmail: rec?.email || actor.email, type: 'deposit', amount, currency: body?.currency || 'EUR', status: 'pending', method: body?.method || 'SEPA Bank Wire', reference: ref, txHash: body?.txHash || undefined, createdAt: new Date().toISOString() };
  mockTransactions.unshift(tx as any);
  const out = { status: 201, body: { success: true, data: tx, message: 'Deposit submitted. Balance credited after verification.', requestId: undefined } };
  if (idem) await idemPut(env, String(idem), out.body);
  return out;
}

export async function createWithdrawal(env: Bindings, actor: any, body: any) {
  if (!platformConfig.withdrawalsEnabled) return { status: 403, body: { success: false, error: 'Withdrawals are temporarily suspended.', code: 'WITHDRAWALS_SUSPENDED' } };
  if (platformConfig.maintenanceMode && actor?.role !== 'admin') return { status: 403, body: { success: false, error: 'Platform under maintenance.', code: 'MAINTENANCE_MODE_ACTIVE' } };
  const amount = Number(body?.amount);
  if (!amount || amount < 250) return { status: 400, body: { success: false, error: 'Minimum withdrawal amount is €250.', code: 'INVALID_AMOUNT' } };
  if (!body?.destination) return { status: 400, body: { success: false, error: 'Withdrawal destination is required.', code: 'MISSING_DESTINATION' } };
  const idem = body?.idempotencyKey || body?.idempotency_key;
  if (idem) { const seen = await idemGet(env, String(idem)); if (seen) return { status: 200, body: { ...seen, idempotentReplay: true } }; }
  const rec = findUser(actor);
  if (!rec) return { status: 404, body: { success: false, error: 'User not found.', code: 'USER_NOT_FOUND' } };
  if (rec.status === 'suspended') return { status: 403, body: { success: false, error: 'Account suspended.', code: 'ACCOUNT_SUSPENDED' } };
  if ((rec.balance || 0) < amount) return { status: 400, body: { success: false, error: 'Insufficient available balance.', code: 'INSUFFICIENT_FUNDS' } };
  rec.balance = Math.round(((rec.balance || 0) - amount) * 100) / 100;
  const tx = { id: newId('tx-wd'), userId: actor.id, userEmail: rec.email, type: 'withdrawal', amount, currency: body?.currency || 'EUR', status: 'pending', method: body?.method || 'Bank Wire SEPA', destination: body.destination, reference: `KZ-WD-${Math.floor(100000 + Math.random() * 900000)}`, createdAt: new Date().toISOString() };
  mockTransactions.unshift(tx as any);
  const out = { status: 201, body: { success: true, data: tx, message: 'Withdrawal submitted for review.' } };
  if (idem) await idemPut(env, String(idem), out.body);
  return out;
}

export async function createInvestment(env: Bindings, actor: any, body: any) {
  if (!platformConfig.tradingEnabled) return { status: 403, body: { success: false, error: 'Trading is temporarily suspended.', code: 'TRADING_SUSPENDED' } };
  if (platformConfig.maintenanceMode && actor?.role !== 'admin') return { status: 403, body: { success: false, error: 'Platform under maintenance.', code: 'MAINTENANCE_MODE_ACTIVE' } };
  const { propertyId, tokensCount } = body || {};
  if (!propertyId || !tokensCount || Number(tokensCount) < 1) return { status: 400, body: { success: false, error: 'Valid property ID and token count are required.', code: 'VALIDATION_ERROR' } };
  const idem = body?.idempotencyKey || body?.idempotency_key || `${actor?.id}-${propertyId}-${tokensCount}`;
  const seen = await idemGet(env, String(idem)); if (seen) return { status: 409, body: { success: false, error: 'Duplicate transaction detected.', code: 'DUPLICATE_TRANSACTION', data: seen.data } };
  const prop = mockListings.find((p) => p.id === propertyId || p.slug === propertyId);
  if (!prop) return { status: 404, body: { success: false, error: 'Property not found.', code: 'PROPERTY_NOT_FOUND' } };
  const rec = findUser(actor);
  if (!rec) return { status: 404, body: { success: false, error: 'User not found.', code: 'USER_NOT_FOUND' } };
  if (rec.status === 'suspended') return { status: 403, body: { success: false, error: 'Account suspended.', code: 'ACCOUNT_SUSPENDED' } };
  const qty = Math.floor(Number(tokensCount));
  if ((prop.availableTokens || 0) < qty) return { status: 400, body: { success: false, error: 'Not enough tokens available.', code: 'INSUFFICIENT_INVENTORY' } };
  const amount = Math.round(qty * Number(prop.tokenPrice || 0) * 100) / 100;
  if (platformConfig.minInvestment && amount < platformConfig.minInvestment) return { status: 400, body: { success: false, error: `Minimum investment is €${platformConfig.minInvestment}.`, code: 'MIN_INVESTMENT' } };
  if ((rec.balance || 0) < amount && body?.paymentMethod !== 'external') return { status: 400, body: { success: false, error: 'Insufficient balance.', code: 'INSUFFICIENT_FUNDS' } };
  if (body?.paymentMethod !== 'external') rec.balance = Math.round(((rec.balance || 0) - amount) * 100) / 100;
  prop.availableTokens = Math.max(0, (prop.availableTokens || 0) - qty);
  prop.fundedAmount = Math.round(((prop.fundedAmount || 0) + amount) * 100) / 100;
  const tx = { id: newId('tx-inv'), userId: actor.id, userEmail: rec.email, type: 'investment', amount, currency: 'EUR', status: 'completed', method: body?.paymentMethod || 'Platform Balance', propertyId: prop.id, propertyTitle: prop.title, tokensPurchased: qty, reference: `KZ-INV-${Math.floor(100000 + Math.random() * 900000)}`, createdAt: new Date().toISOString() };
  mockTransactions.unshift(tx as any);
  const out = { status: 201, body: { success: true, data: tx, message: 'Investment completed.' } };
  await idemPut(env, String(idem), out.body);
  return out;
}

export async function convertTreasury(env: Bindings, actor: any, body: any) {
  const rec = findUser(actor);
  if (!rec) return { status: 404, body: { success: false, error: 'User not found.', code: 'USER_NOT_FOUND' } };
  const from = (body?.from || 'EUR').toUpperCase(); const to = (body?.to || 'EUR').toUpperCase(); const amount = Number(body?.amount);
  const ratesToEur: Record<string, number> = { EUR: 1, USD: 0.92, GBP: 1.18, CHF: 1.06, USDC: 0.92, USDT: 0.92, SOL: 158.4 };
  if (!amount || amount <= 0) return { status: 400, body: { success: false, error: 'Valid amount required.', code: 'INVALID_AMOUNT' } };
  if (!ratesToEur[from] || !ratesToEur[to]) return { status: 400, body: { success: false, error: 'Unsupported currency.', code: 'UNSUPPORTED_CURRENCY' } };
  const eur = amount * ratesToEur[from]; const outAmt = Math.round((eur / ratesToEur[to]) * 1000000) / 1000000; const fee = Math.round(eur * 0.0015 * 100) / 100;
  if (from === 'EUR' && (rec.balance || 0) < amount) return { status: 400, body: { success: false, error: 'Insufficient EUR balance.', code: 'INSUFFICIENT_FUNDS' } };
  if (from === 'EUR') rec.balance = Math.round(((rec.balance || 0) - amount) * 100) / 100;
  if (to === 'EUR') rec.balance = Math.round(((rec.balance || 0) + outAmt) * 100) / 100;
  const tx = { id: newId('tx-cnv'), userId: actor.id, userEmail: rec.email, type: 'conversion', amount, currency: from, status: 'completed', reference: `KZ-CNV-${Math.floor(100000 + Math.random() * 900000)}`, details: { from, to, outputAmount: outAmt, feeEur: fee }, createdAt: new Date().toISOString() };
  mockTransactions.unshift(tx as any);
  return { status: 201, body: { success: true, data: tx, message: 'Conversion completed.' } };
}
