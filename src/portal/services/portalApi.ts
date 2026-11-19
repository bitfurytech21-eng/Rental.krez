import { api, apiRequest, createIdempotencyKey, getBaseUrl } from '../../lib/api';
import { ledger } from '../../lib/ledger';
import { supabase, isSupabaseConfigured } from '../../lib/supabaseClient';
import { Property } from '../../types/property';
import { PORTAL_PLACEHOLDER_CONFIG } from '../config/portalConfig';
import { eurToCents } from './money';
import {
  PortalAccountStatement,
  PortalAssignedBankAccount,
  PortalAssignedPaymentMethod,
  PortalComplianceDoc,
  PortalComplianceStep,
  PortalConfig,
  PortalDashboardSummary,
  PortalNotification,
  PortalPerformanceData,
  PortalPortfolioData,
  PortalProfile,
  PortalProperty,
  PortalTransaction,
  PortalUploadedDocument,
} from '../types';

function unwrap<T>(res: any): T {
  if (res && typeof res === 'object' && 'data' in res && res.data !== undefined) {
    return res.data as T;
  }
  return res as T;
}

function mapSupabasePropertyRow(row: any): PortalProperty {
  const tokenPrice =
    row.token_price !== undefined && row.token_price !== null
      ? Number(row.token_price)
      : Math.round(Number(row.share_price_cents ?? row.token_price_cents ?? 0)) / 100;
  const targetAmount =
    row.target_amount !== undefined && row.target_amount !== null
      ? Number(row.target_amount)
      : Math.round(Number(row.funding_target_cents || 0)) / 100;
  const fundedAmount =
    row.funded_amount !== undefined && row.funded_amount !== null
      ? Number(row.funded_amount)
      : Number((((Number(row.funded_pct || 0)) / 100) * targetAmount).toFixed(2));
  const totalTokens =
    row.total_tokens !== undefined && row.total_tokens !== null
      ? Number(row.total_tokens)
      : tokenPrice > 0 && targetAmount > 0
      ? Math.max(1, Math.round(targetAmount / tokenPrice))
      : 0;
  const availableTokens =
    row.available_tokens !== undefined && row.available_tokens !== null
      ? Number(row.available_tokens)
      : Math.max(0, totalTokens - (tokenPrice > 0 ? Math.round(fundedAmount / tokenPrice) : 0));
  const projectedYield = Number(row.estimated_annual_yield ?? row.target_yield ?? 0);
  const targetIrr = Number(row.target_irr ?? row.financials?.totalIrr ?? projectedYield);
  const holdingPeriodMonths = Number(
    row.duration_months ?? (parseInt(String(row.term || ''), 10) || 36)
  );
  const city = String(row.city || '');
  const country = String(row.country || 'France');
  const location = String(row.location || [city, country].filter(Boolean).join(', ') || 'Europe');

  return {
    id: String(row.id),
    slug: String(row.slug || row.id),
    title: String(row.title || row.name || ''),
    location,
    city,
    country,
    type: String(row.type || 'Residential'),
    status: String(row.status || 'open'),
    fundedAmount,
    targetAmount,
    tokenPrice,
    totalTokens,
    availableTokens,
    projectedYield,
    capitalAppreciation: Number(row.financials?.capitalAppreciation || 0),
    minimumInvestment: Number(row.minimum_investment || tokenPrice || 1000),
    holdingPeriodMonths,
    description: typeof row.description === 'string' ? row.description : undefined,
    images: Array.isArray(row.images) ? row.images : Array.isArray(row.photos) ? row.photos : [],
    financials: {
      ...(row.financials && typeof row.financials === 'object' ? row.financials : {}),
      totalIrr: targetIrr,
      netYield: Number(row.financials?.netYield ?? projectedYield),
    },
  };
}

const GENERIC_FRONTEND_TITLES = new Set([
  'house',
  'home',
  'villa',
  'apartment',
  'duplex',
  'loft',
  'penthouse',
  'mansion',
  'private mansion',
  'property',
]);

function formatFrontendTitle(title: string, city?: string, type?: string): string {
  const decoded = String(title || '')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .trim();
  if (!decoded) return [city, type].filter(Boolean).join(' — ') || 'Prime Property SPV';
  if (GENERIC_FRONTEND_TITLES.has(decoded.toLowerCase()) && city) {
    return `${city} — ${decoded}`;
  }
  return decoded;
}

export function mapFrontendPropertyToPortalProperty(prop: Property): PortalProperty {
  const projectedYield = Number(prop.estimatedAnnualYield ?? 0);
  const targetIrr = Number(prop.totalEstimatedReturn ?? projectedYield);
  const validImages = Array.isArray(prop.images)
    ? prop.images.filter((url) => typeof url === 'string' && url.trim().length > 0)
    : [];
  const images =
    validImages.length > 0
      ? validImages
      : prop.bannerImage
      ? [prop.bannerImage]
      : [];

  return {
    id: String(prop.id),
    slug: String(prop.slug || prop.id),
    title: formatFrontendTitle(prop.title, prop.city, prop.type),
    location: String(prop.location || [prop.city, prop.country].filter(Boolean).join(', ') || 'Europe'),
    city: prop.city,
    country: prop.country,
    type: String(prop.type || 'Residential'),
    status: String(prop.status || 'funding'),
    description: typeof prop.description === 'string' ? prop.description : undefined,
    tokenPrice: Number(prop.tokenPrice || 0),
    totalTokens: Number(prop.totalTokens || 0),
    availableTokens: Number(prop.availableTokens || 0),
    targetAmount: Number(prop.targetAmount || 0),
    fundedAmount: Number(prop.fundedAmount || 0),
    minimumInvestment: Number(prop.minimumInvestment || prop.tokenPrice || 1000),
    projectedYield,
    capitalAppreciation: Number(prop.capitalAppreciationYield ?? 0),
    holdingPeriodMonths: Number(prop.durationMonths || 36),
    images,
    spvName: prop.spvEntityName,
    distributionFrequency: prop.distributionFrequency,
    financials: {
      grossRentAnnual: prop.financialBreakdown?.projectedAnnualGrossRent,
      netYield: projectedYield,
      totalIrr: targetIrr,
    },
  };
}

function filterPortalProperties(
  list: PortalProperty[],
  params?: { search?: string; status?: string; type?: string }
): PortalProperty[] {
  if (!params) return list;
  const search = params.search?.trim().toLowerCase();
  const status = params.status?.trim().toLowerCase();
  const type = params.type?.trim().toLowerCase();
  return list.filter((item) => {
    if (status && status !== 'all' && String(item.status || '').toLowerCase() !== status) {
      return false;
    }
    if (type && type !== 'all' && String(item.type || '').toLowerCase() !== type) {
      return false;
    }
    if (search) {
      const hay = `${item.title} ${item.location} ${item.city || ''} ${item.type}`.toLowerCase();
      if (!hay.includes(search)) return false;
    }
    return true;
  });
}

async function getActiveSupabaseUserId(): Promise<string | null> {
  if (!isSupabaseConfigured()) return null;
  try {
    const { data } = await supabase.auth.getSession();
    return data?.session?.user?.id || null;
  } catch {
    return null;
  }
}

const BROADCAST_READ_STORAGE_PREFIX = 'portal_read_broadcasts:';

function getLocallyReadBroadcastIds(userId: string): Set<string> {
  if (typeof window === 'undefined' || !userId) return new Set();
  try {
    const raw = window.localStorage.getItem(`${BROADCAST_READ_STORAGE_PREFIX}${userId}`);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    return new Set(Array.isArray(parsed) ? parsed.map(String) : []);
  } catch {
    return new Set();
  }
}

function markBroadcastIdsLocallyRead(userId: string, ids: string[]): void {
  if (typeof window === 'undefined' || !userId || ids.length === 0) return;
  try {
    const existing = getLocallyReadBroadcastIds(userId);
    ids.forEach((id) => existing.add(String(id)));
    window.localStorage.setItem(
      `${BROADCAST_READ_STORAGE_PREFIX}${userId}`,
      JSON.stringify(Array.from(existing).slice(-200))
    );
  } catch {
    // Ignore storage restrictions
  }
}

function normalizeMethodKind(raw: unknown): 'bank' | 'usdt' | null {
  const value = String(raw || '').trim().toLowerCase();
  if (['bank', 'sepa', 'wire', 'bank_wire'].includes(value)) return 'bank';
  if (['usdt', 'usdc', 'crypto'].includes(value)) return 'usdt';
  return null;
}

function normalizeManualMethodRow(item: any): PortalAssignedPaymentMethod | null {
  const normalizedMethod = normalizeMethodKind(item?.method);
  if (!normalizedMethod) return null;
  const rawDetailRows =
    Array.isArray(item?.detail_rows) && item.detail_rows.length > 0
      ? item.detail_rows
      : Array.isArray(item?.detailRows) && item.detailRows.length > 0
      ? item.detailRows
      : item?.account_details && typeof item.account_details === 'object'
      ? Object.entries(item.account_details)
          .filter(([label, value]) => !label.startsWith('__') && String(value || '').trim())
          .map(([label, value]) => ({ label, value: String(value) }))
      : [];
  const detailRows = rawDetailRows
    .map((row: any) => ({
      label: String(row?.label || '').trim(),
      value: String(row?.value || '').trim(),
    }))
    .filter((row: { label: string; value: string }) => row.label && row.value);
  const name = String(item?.name || '');
  const upperName = name.toUpperCase();
  const inferredToken =
    normalizedMethod === 'usdt'
      ? upperName.includes('USDC')
        ? 'USDC'
        : 'USDT'
      : undefined;
  return {
    id: String(item.id),
    method: normalizedMethod,
    minimum_amount: item.minimum_amount ?? 100,
    maximum_amount: item.maximum_amount ?? null,
    name,
    token: item.token ? String(item.token) : inferredToken,
    contract_address:
      item.contract_address || item.contractAddress || item?.account_details?.__usdt_contract_address || undefined,
    instructions: String(item.instructions || '').trim(),
    network: String(
      item.network || item?.account_details?.Network || item?.account_details?.__usdt_network || ''
    ).trim(),
    wallet_address: String(
      item.wallet_address ||
        item.walletAddress ||
        item?.account_details?.['Wallet address'] ||
        item?.account_details?.__usdt_wallet_address ||
        ''
    ).trim(),
    fee_type: item.fee_type || 'none',
    fee_value: Number(item.fee_value || 0),
    detail_rows: detailRows,
  };
}

function gateRowToAssignedBankAccount(row: any): PortalAssignedBankAccount | null {
  if (!row) return null;
  const details = row.account_details && typeof row.account_details === 'object' ? row.account_details : {};
  const detailRows = Array.isArray(row.detail_rows) ? row.detail_rows : [];
  const findDetail = (key: string) => {
    const direct = details[key] || details[key.toLowerCase()];
    if (direct) return String(direct).trim();
    const matched = detailRows.find((r: any) => String(r?.label || '').toLowerCase() === key.toLowerCase());
    return matched?.value ? String(matched.value).trim() : '';
  };
  return {
    gateId: row.id ? String(row.id) : undefined,
    gateName: row.name ? String(row.name) : undefined,
    beneficiary: findDetail('Beneficiary') || findDetail('Account Holder') || String(row.name || ''),
    bankName: findDetail('Bank Name') || findDetail('Bank') || String(row.name || ''),
    iban: findDetail('IBAN') || findDetail('Account Number'),
    bic: findDetail('BIC') || findDetail('BIC / SWIFT') || findDetail('SWIFT'),
    address: findDetail('Bank Address') || findDetail('Address'),
    country: findDetail('Country'),
    instructions: row.instructions ? String(row.instructions) : undefined,
    network: row.network ? String(row.network) : findDetail('Network') || undefined,
    walletAddress:
      row.wallet_address
        ? String(row.wallet_address)
        : findDetail('Wallet address') || details.__usdt_wallet_address || undefined,
    method: row.method ? normalizeMethodKind(row.method) ?? undefined : undefined,
    detailRows,
  };
}

export const portalApi = {
  async getDashboardSummary(): Promise<PortalDashboardSummary> {
    try {
      const res = await api.get<any>('/dashboard/summary');
      const data = unwrap<any>(res) || {};
      return {
        totalPortfolioValue: Number(data.totalPortfolioValue || 0),
        availableBalance: Number(data.availableBalance || 0),
        investedCapital: Number(data.investedCapital || 0),
        totalEarnedDividends: Number(data.totalEarnedDividends || 0),
        totalPortfolioValueCents: eurToCents(data.totalPortfolioValue || 0),
        availableBalanceCents: eurToCents(data.availableBalance || 0),
        investedCapitalCents: eurToCents(data.investedCapital || 0),
        totalEarnedDividendsCents: eurToCents(data.totalEarnedDividends || 0),
        projectedMonthlyIncomeCents: eurToCents(data.projectedMonthlyIncome || 0),
        activePropertiesCount: Number(data.activePropertiesCount || 0),
        projectedMonthlyIncome: Number(data.projectedMonthlyIncome || 0),
        currency: String(data.currency || 'EUR'),
      };
    } catch (err) {
      const uid = await getActiveSupabaseUserId();
      if (!uid) throw err;
      const [{ data: profile }, { data: wallet }, { data: investments }] = await Promise.all([
        supabase.from('user_profiles').select('*').eq('id', uid).maybeSingle(),
        supabase.from('wallets').select('*').eq('user_id', uid).maybeSingle(),
        supabase.from('investments').select('*').eq('user_id', uid),
      ]);
      if (!profile && !wallet) throw err;
      const availableBalance = Number(wallet?.available_balance ?? profile?.wallet_balance ?? 0);
      const invRows = Array.isArray(investments) ? investments : [];
      const investedCapital = invRows.length
        ? invRows.reduce((sum: number, row: any) => sum + Number(row.total_amount_invested || 0), 0)
        : Number(profile?.invested_balance || 0);
      const totalHoldings = invRows.length
        ? invRows.reduce(
            (sum: number, row: any) => sum + Number(row.current_valuation ?? row.total_amount_invested ?? 0),
            0
          )
        : investedCapital;
      const totalPortfolioValue = Number((availableBalance + totalHoldings).toFixed(2));
      const totalEarnedDividends = Number(profile?.total_dividends_earned || 0);
      const projectedMonthlyIncome = Number(
        invRows
          .reduce(
            (sum: number, row: any) =>
              sum + Number(row.total_amount_invested || 0) * (Number(row.monthly_target_rate || 0) / 100),
            0
          )
          .toFixed(2)
      );
      return {
        totalPortfolioValue,
        availableBalance,
        investedCapital,
        totalEarnedDividends,
        totalPortfolioValueCents: eurToCents(totalPortfolioValue),
        availableBalanceCents: eurToCents(availableBalance),
        investedCapitalCents: eurToCents(investedCapital),
        totalEarnedDividendsCents: eurToCents(totalEarnedDividends),
        projectedMonthlyIncomeCents: eurToCents(projectedMonthlyIncome),
        activePropertiesCount: invRows.filter((row: any) => row.status === 'active').length,
        projectedMonthlyIncome,
        currency: 'EUR',
      };
    }
  },

  async getPortfolio(): Promise<PortalPortfolioData> {
    const formatPortfolio = (data: any): PortalPortfolioData => ({
      holdings: Array.isArray(data.holdings)
        ? data.holdings.map((holding: any) => {
            const valueCents =
              holding.value_cents !== undefined && holding.value_cents !== null
                ? Math.round(Number(holding.value_cents))
                : holding.valueCents !== undefined && holding.valueCents !== null
                ? Math.round(Number(holding.valueCents))
                : eurToCents(holding.currentValue ?? holding.totalCost ?? 0);
            const totalCostCents =
              holding.cost_cents !== undefined && holding.cost_cents !== null
                ? Math.round(Number(holding.cost_cents))
                : eurToCents(holding.totalCost ?? holding.total_amount_invested ?? valueCents / 100);
            const gainCents =
              holding.gain_cents !== undefined && holding.gain_cents !== null
                ? Math.round(Number(holding.gain_cents))
                : holding.gainCents !== undefined && holding.gainCents !== null
                ? Math.round(Number(holding.gainCents))
                : valueCents - totalCostCents;
            const currentValue = valueCents / 100;
            const totalCost = totalCostCents / 100;
            const gain = gainCents / 100;
            return {
              ...holding,
              propertyTitle: String(holding.name || holding.propertyTitle || holding.title || holding.propertyId || ''),
              city: String(holding.city || ''),
              tokensPurchased: Number(holding.shares ?? holding.tokensPurchased ?? 0),
              totalCost,
              currentValue,
              gain,
              totalCostCents,
              currentValueCents: valueCents,
              gainCents,
              dividendsReceivedCents: eurToCents(holding.dividendsReceived ?? holding.total_dividends_received ?? 0),
            };
          })
        : [],
      totalHoldingsValue: Number(data.totalHoldingsValue || 0),
      totalPortfolioValue: Number(data.totalPortfolioValue || 0),
      totalHoldingsValueCents: eurToCents(data.totalHoldingsValue || 0),
      totalPortfolioValueCents: eurToCents(data.totalPortfolioValue || 0),
      totalTokensHeld: Number(data.totalTokensHeld || 0),
      activePropertiesCount: Number(data.activePropertiesCount || 0),
      totalDividendsReceived: Number(data.totalDividendsReceived || 0),
      currency: String(data.currency || 'EUR'),
    });

    try {
      const res = await api.get<any>('/portfolio');
      return formatPortfolio(unwrap<any>(res) || {});
    } catch (err) {
      const uid = await getActiveSupabaseUserId();
      if (!uid) throw err;
      const { data: invRows, error: invError } = await supabase
        .from('investments')
        .select('*')
        .eq('user_id', uid)
        .order('purchased_at', { ascending: false });
      if (invError) throw err;

      const { data: propsRows } = await supabase.from('properties').select('*');
      const propMap = new Map<string, any>((propsRows || []).map((p: any) => [String(p.id), p]));

      const holdings = (invRows || []).map((row: any) => {
        const prop = propMap.get(String(row.plan_id)) || {};
        const cost = Number(row.total_amount_invested || 0);
        const current = Number(row.current_valuation ?? cost);
        const annualYield = Number(prop.estimated_annual_yield ?? prop.target_yield ?? 0);
        return {
          id: row.id,
          propertyId: row.plan_id,
          name: prop.title || prop.name || row.plan_id,
          propertyTitle: prop.title || prop.name || row.plan_id,
          city: prop.city || '',
          tokensPurchased: Number(row.tokens_purchased || 0),
          totalCost: cost,
          currentValue: current,
          projectedAnnualDividend: Number(((cost * annualYield) / 100).toFixed(2)),
          dividendsReceived: Number(row.total_dividends_received || 0),
          purchaseDate: row.purchased_at,
          certificateId: row.certificate_id,
          status: row.status,
          maturityDate: row.maturity_date,
        };
      });
      const totalPortfolioValue = holdings.reduce((s: number, h: any) => s + Number(h.currentValue || 0), 0);
      return formatPortfolio({
        holdings,
        totalHoldingsValue: totalPortfolioValue,
        totalPortfolioValue,
        totalTokensHeld: holdings.reduce((s: number, h: any) => s + Number(h.tokensPurchased || 0), 0),
        activePropertiesCount: holdings.filter((h: any) => h.status === 'active').length,
        totalDividendsReceived: holdings.reduce((s: number, h: any) => s + Number(h.dividendsReceived || 0), 0),
        currency: 'EUR',
      });
    }
  },

  async getWalletBalance(): Promise<{
    balance: number;
    balanceCents: number;
    availableBalance: number;
    availableCents: number;
    assignedBankAccount: PortalAssignedBankAccount | null;
    assignedUsdtAccount: PortalAssignedBankAccount | null;
    subBalances: Record<string, number>;
    currency: string;
  }> {
    try {
      const res = await api.get<any>('/wallet/balance');
      const data = unwrap<any>(res) || {};
      const balanceCents =
        data.balanceCents !== undefined && data.balanceCents !== null
          ? Math.round(Number(data.balanceCents))
          : data.balance_cents !== undefined && data.balance_cents !== null
          ? Math.round(Number(data.balance_cents))
          : eurToCents(data.balance || 0);
      const availableCents =
        data.availableCents !== undefined && data.availableCents !== null
          ? Math.round(Number(data.availableCents))
          : data.available_cents !== undefined && data.available_cents !== null
          ? Math.round(Number(data.available_cents))
          : eurToCents(data.availableBalance ?? data.balance ?? balanceCents / 100);
      const balance = balanceCents / 100;
      const availableBalance = availableCents / 100;
      return {
        balance,
        balanceCents,
        availableBalance,
        availableCents,
        assignedBankAccount: data.assignedBankAccount || null,
        assignedUsdtAccount: data.assignedUsdtAccount || null,
        subBalances:
          data.subBalances && typeof data.subBalances === 'object' ? data.subBalances : { EUR: balance },
        currency: String(data.currency || 'EUR'),
      };
    } catch (err) {
      const uid = await getActiveSupabaseUserId();
      if (!uid) throw err;
      const [{ data: wallet }, { data: profile }] = await Promise.all([
        supabase.from('wallets').select('*').eq('user_id', uid).maybeSingle(),
        supabase.from('user_profiles').select('*').eq('id', uid).maybeSingle(),
      ]);
      if (!wallet && !profile) throw err;
      const balance = Number(wallet?.available_balance ?? profile?.wallet_balance ?? 0);
      const balanceCents = eurToCents(balance);
      let assignedBankAccount: PortalAssignedBankAccount | null = null;
      let assignedUsdtAccount: PortalAssignedBankAccount | null = null;
      const gateIds = [profile?.assigned_gate_id, profile?.assigned_usdt_gate_id].filter(Boolean);
      if (gateIds.length > 0) {
        const { data: gates } = await supabase.from('manual_payment_methods').select('*').in('id', gateIds);
        if (Array.isArray(gates)) {
          const bankGate = gates.find((g: any) => String(g.id) === String(profile?.assigned_gate_id));
          const usdtGate = gates.find((g: any) => String(g.id) === String(profile?.assigned_usdt_gate_id));
          assignedBankAccount = gateRowToAssignedBankAccount(bankGate);
          assignedUsdtAccount = gateRowToAssignedBankAccount(usdtGate);
        }
      }
      return {
        balance,
        balanceCents,
        availableBalance: balance,
        availableCents: balanceCents,
        assignedBankAccount,
        assignedUsdtAccount,
        subBalances: { EUR: balance },
        currency: String(wallet?.currency || 'EUR'),
      };
    }
  },

  async getProperties(params?: { search?: string; status?: string; type?: string }): Promise<PortalProperty[]> {
    const frontendListings = ledger.getFrontendProperties().map(mapFrontendPropertyToPortalProperty);
    const frontendById = new Map(frontendListings.map((item) => [item.id, item]));
    const frontendBySlug = new Map(frontendListings.map((item) => [item.slug, item]));

    let remoteListings: PortalProperty[] = [];
    try {
      const res = await api.get<any>('/marketplace/listings', { params });
      const list = unwrap<any[]>(res);
      if (Array.isArray(list)) {
        remoteListings = list.map((item: any) => ({
          ...item,
          title: formatFrontendTitle(item.title, item.city, item.type),
        }));
      }
    } catch {
      if (isSupabaseConfigured()) {
        const { data, error } = await supabase.from('properties').select('*');
        if (!error && Array.isArray(data)) {
          remoteListings = data.map(mapSupabasePropertyRow);
        }
      }
    }

    if (remoteListings.length === 0) {
      return filterPortalProperties(frontendListings, params);
    }

    // Synchronize the dashboard catalogue with the frontend home-page listings:
    // enrich remote records with frontend media/metadata and preserve any frontend-approved
    // listings from the home page that aren't already in the remote response.
    const remoteByKey = new Map<string, PortalProperty>();
    for (const remote of remoteListings) {
      if (remote.id) remoteByKey.set(remote.id, remote);
      if (remote.slug) remoteByKey.set(remote.slug, remote);
    }

    const merged: PortalProperty[] = [];
    const seenIds = new Set<string>();

    for (const fe of frontendListings) {
      const remote = remoteByKey.get(fe.id) || remoteByKey.get(fe.slug);
      const combined: PortalProperty = remote
        ? {
            ...fe,
            ...remote,
            title: formatFrontendTitle(remote.title || fe.title, remote.city || fe.city, remote.type || fe.type),
            images: Array.isArray(remote.images) && remote.images.length > 0 ? remote.images : fe.images,
            description: remote.description || fe.description,
            spvName: remote.spvName || fe.spvName,
            distributionFrequency: remote.distributionFrequency || fe.distributionFrequency,
          }
        : fe;
      merged.push(combined);
      seenIds.add(combined.id);
      if (combined.slug) seenIds.add(combined.slug);
    }

    for (const remote of remoteListings) {
      if (!seenIds.has(remote.id) && (!remote.slug || !seenIds.has(remote.slug))) {
        const feMatch = frontendById.get(remote.id) || (remote.slug ? frontendBySlug.get(remote.slug) : undefined);
        merged.push(
          feMatch
            ? { ...feMatch, ...remote }
            : remote
        );
      }
    }

    return filterPortalProperties(merged, params);
  },

  async getPropertyDetail(idOrSlug: string): Promise<PortalProperty> {
    const frontendMatch = ledger
      .getFrontendProperties()
      .find((p) => p.id === idOrSlug || p.slug === idOrSlug);
    const mappedFrontend = frontendMatch ? mapFrontendPropertyToPortalProperty(frontendMatch) : null;

    try {
      const res = await api.get<any>(`/marketplace/listings/${encodeURIComponent(idOrSlug)}`);
      const remote = unwrap<PortalProperty>(res);
      if (remote && remote.id) {
        if (!mappedFrontend) {
          return {
            ...remote,
            title: formatFrontendTitle(remote.title, remote.city, remote.type),
          };
        }
        return {
          ...mappedFrontend,
          ...remote,
          title: formatFrontendTitle(
            remote.title || mappedFrontend.title,
            remote.city || mappedFrontend.city,
            remote.type || mappedFrontend.type
          ),
          images:
            Array.isArray(remote.images) && remote.images.length > 0
              ? remote.images
              : mappedFrontend.images,
          description: remote.description || mappedFrontend.description,
          spvName: remote.spvName || mappedFrontend.spvName,
          distributionFrequency: remote.distributionFrequency || mappedFrontend.distributionFrequency,
        };
      }
    } catch (err) {
      if (mappedFrontend) {
        return mappedFrontend;
      }
      if (isSupabaseConfigured()) {
        const { data, error } = await supabase
          .from('properties')
          .select('*')
          .eq('id', idOrSlug)
          .maybeSingle();
        if (!error && data) {
          return mapSupabasePropertyRow(data);
        }
      }
      throw err;
    }

    if (mappedFrontend) {
      return mappedFrontend;
    }
    throw new Error(`Property listing '${idOrSlug}' not found.`);
  },

  async getTransactions(params?: { limit?: number; offset?: number }): Promise<PortalTransaction[]> {
    const mapTransactions = (list: any[]): PortalTransaction[] =>
      list.map((t) => {
        const noteValue =
          typeof t.note === 'string' && t.note.trim()
            ? t.note.trim()
            : typeof t.notes === 'string' && t.notes.trim()
            ? t.notes.trim()
            : typeof t.metadata?.reason === 'string' && t.metadata.reason.trim()
            ? t.metadata.reason.trim()
            : typeof t.metadata?.rejectionReason === 'string' && t.metadata.rejectionReason.trim()
            ? t.metadata.rejectionReason.trim()
            : undefined;
        return {
          id: String(t.id),
          type: String(t.type || 'transaction'),
          amount: Number(t.amount || 0),
          amountCents: String(t.currency || 'EUR').toUpperCase() === 'EUR' ? eurToCents(t.amount || 0) : undefined,
          currency: String(t.currency || 'EUR'),
          status: String(t.status || 'pending'),
          reference: String(t.reference || t.id),
          createdAt: String(t.createdAt || t.created_at || ''),
          description: t.description || t.details,
          note: noteValue,
          paymentMethod: t.paymentMethod || t.payment_method || t.method,
          propertyId: t.propertyId || t.property_id,
          propertyTitle: t.propertyTitle || t.property_title,
          tokensPurchased: t.tokensPurchased ?? t.tokens_purchased,
          destination: t.destination,
          txHash: t.txHash || t.tx_hash,
          metadata: t.metadata && typeof t.metadata === 'object' ? t.metadata : {},
        };
      });

    try {
      const res = await api.get<any>('/transactions', { params });
      const list = unwrap<any[]>(res);
      return Array.isArray(list) ? mapTransactions(list) : [];
    } catch (err) {
      const uid = await getActiveSupabaseUserId();
      if (!uid) throw err;
      const limit = Math.min(Math.max(Number(params?.limit) || 100, 1), 250);
      const { data, error } = await supabase
        .from('payment_transactions')
        .select('*')
        .eq('user_id', uid)
        .order('created_at', { ascending: false })
        .limit(limit);
      if (error) throw err;
      return mapTransactions(Array.isArray(data) ? data : []);
    }
  },

  async getNotifications(): Promise<{ items: PortalNotification[]; unreadCount: number }> {
    const uid = await getActiveSupabaseUserId();
    const localRead = uid ? getLocallyReadBroadcastIds(uid) : new Set<string>();
    try {
      const res = await api.get<any>('/notifications');
      const items = unwrap<PortalNotification[]>(res);
      const list = (Array.isArray(items) ? items : []).map((n) =>
        localRead.has(String(n.id)) ? { ...n, read: true } : n
      );
      const unreadCount = list.filter((n) => !n.read).length;
      return { items: list, unreadCount };
    } catch (err) {
      if (!uid) throw err;
      let { data, error } = await supabase
        .from('notifications')
        .select('*')
        .or(`user_id.eq.${uid},user_id.is.null`)
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) {
        const ownRes = await supabase
          .from('notifications')
          .select('*')
          .eq('user_id', uid)
          .order('created_at', { ascending: false })
          .limit(100);
        if (ownRes.error) throw err;
        data = ownRes.data;
      }
      const list: PortalNotification[] = (Array.isArray(data) ? data : []).map((n: any) => ({
        id: String(n.id),
        title: String(n.title || 'Notification'),
        message: String(n.message || n.body || ''),
        type: String(n.type || 'info'),
        read: Boolean(n.read ?? n.is_read) || localRead.has(String(n.id)),
        createdAt: String(n.created_at || new Date().toISOString()),
        metadata: n.metadata && typeof n.metadata === 'object' ? n.metadata : undefined,
      }));
      return {
        items: list,
        unreadCount: list.filter((n) => !n.read).length,
      };
    }
  },

  async markNotificationRead(id: string): Promise<void> {
    try {
      await api.patch(`/notifications/${encodeURIComponent(id)}/read`);
    } catch (err) {
      const uid = await getActiveSupabaseUserId();
      if (!uid) throw err;

      // Update user-owned notifications directly via authenticated Supabase RLS grant
      const { data: updatedOwn, error: updateError } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', id)
        .eq('user_id', uid)
        .select('id');

      if (!updateError && Array.isArray(updatedOwn) && updatedOwn.length > 0) {
        return;
      }

      // Check whether this is a platform-wide broadcast notification (user_id is null),
      // which clients cannot mutate globally under RLS; acknowledge locally instead.
      const { data: visibleRow, error: selectError } = await supabase
        .from('notifications')
        .select('id,user_id')
        .eq('id', id)
        .maybeSingle();

      if (!selectError && visibleRow && visibleRow.user_id == null) {
        markBroadcastIdsLocallyRead(uid, [id]);
        return;
      }

      if (updateError) throw updateError;
      throw err;
    }
  },

  async markAllNotificationsRead(): Promise<void> {
    try {
      await api.post('/notifications/read-all');
    } catch (err) {
      const uid = await getActiveSupabaseUserId();
      if (!uid) throw err;
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', uid)
        .eq('read', false);
      if (error) throw error;

      const { data: broadcasts } = await supabase
        .from('notifications')
        .select('id')
        .is('user_id', null)
        .eq('read', false);
      if (Array.isArray(broadcasts) && broadcasts.length > 0) {
        markBroadcastIdsLocallyRead(
          uid,
          broadcasts.map((b: any) => String(b.id))
        );
      }
    }
  },

  async getProfile(): Promise<PortalProfile> {
    const mapProfile = (d: any): PortalProfile => ({
      id: String(d.id || ''),
      email: String(d.email || ''),
      fullName: String(d.fullName || d.full_name || ''),
      country: String(d.country || 'France'),
      countryCode: String(d.countryCode || d.country_code || ''),
      phoneNumber: String(d.phoneNumber || d.phone_number || ''),
      accountType: String(d.accountType || d.account_type || 'individual_investor'),
      balance: Number(d.balance ?? d.wallet_balance ?? 0),
      investedBalance: Number(d.investedBalance ?? d.invested_balance ?? 0),
      balanceCents: d.balanceCents ?? eurToCents(d.balance ?? d.wallet_balance ?? 0),
      availableBalance: d.availableBalance ?? Number(d.balance ?? d.wallet_balance ?? 0),
      availableCents: d.availableCents ?? eurToCents(d.availableBalance ?? d.balance ?? d.wallet_balance ?? 0),
      investedBalanceCents: eurToCents(d.investedBalance ?? d.invested_balance ?? 0),
      kycStatus: (() => {
        const raw = String(d.kycStatus || d.kyc_status || 'not_started').trim().toLowerCase();
        if (raw === 'approved' || raw === 'verified') return 'verified';
        if (raw === 'rejected') return 'rejected';
        if (raw === 'in_review' || raw === 'pending') return raw;
        if (raw === 'unverified' || raw === 'not_started') return 'not_started';
        return raw || 'not_started';
      })(),
      status: String(d.status || d.account_status || 'active'),
      address: String(d.address || ''),
      city: String(d.city || ''),
      postalCode: String(d.postalCode || d.postal_code || ''),
      bankIban: String(d.bankIban || d.iban || d.bank_iban || ''),
      bankAccountHolder: String(
        d.bankAccountHolder || d.bank_holder || d.bank_account_holder || d.fullName || d.full_name || ''
      ),
      assignedBankAccount: d.assignedBankAccount || null,
      assignedUsdtAccount: d.assignedUsdtAccount || null,
      cryptoDepositAddress: String(d.cryptoDepositAddress || d.crypto_deposit_address || ''),
      taxId: String(d.taxId || d.tax_id || ''),
      dateOfBirth: String(d.dateOfBirth || d.date_of_birth || ''),
      createdAt: String(d.createdAt || d.created_at || ''),
    });

    try {
      const res = await api.get<any>('/user/profile');
      return mapProfile(unwrap<any>(res) || {});
    } catch (err) {
      const uid = await getActiveSupabaseUserId();
      if (!uid) throw err;
      const { data: profile, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', uid)
        .maybeSingle();
      if (error || !profile) throw err;

      let assignedBankAccount: PortalAssignedBankAccount | null = null;
      let assignedUsdtAccount: PortalAssignedBankAccount | null = null;
      const gateIds = [profile.assigned_gate_id, profile.assigned_usdt_gate_id].filter(Boolean);
      if (gateIds.length > 0) {
        const { data: gates } = await supabase.from('manual_payment_methods').select('*').in('id', gateIds);
        if (Array.isArray(gates)) {
          assignedBankAccount = gateRowToAssignedBankAccount(
            gates.find((g: any) => String(g.id) === String(profile.assigned_gate_id))
          );
          assignedUsdtAccount = gateRowToAssignedBankAccount(
            gates.find((g: any) => String(g.id) === String(profile.assigned_usdt_gate_id))
          );
        }
      }
      return mapProfile({ ...profile, assignedBankAccount, assignedUsdtAccount });
    }
  },

  async updateProfile(updates: Partial<PortalProfile>, bankChangeGrantId?: string): Promise<PortalProfile> {
    const headers: Record<string, string> = {};
    if (bankChangeGrantId) headers['X-Action-Verification'] = bankChangeGrantId;
    const res = await apiRequest<any>('/users/me', {
      method: 'PATCH',
      body: updates,
      headers,
    });
    const d = unwrap<any>(res) || {};
    return {
      id: String(d.id || ''),
      email: String(d.email || ''),
      fullName: String(d.fullName || d.full_name || ''),
      country: String(d.country || 'France'),
      countryCode: String(d.countryCode || ''),
      phoneNumber: String(d.phoneNumber || ''),
      accountType: String(d.accountType || 'individual_investor'),
      balance: Number(d.balance || 0),
      investedBalance: Number(d.investedBalance || 0),
      balanceCents: d.balanceCents ?? eurToCents(d.balance || 0),
      availableBalance: d.availableBalance ?? Number(d.balance || 0),
      availableCents: d.availableCents ?? eurToCents(d.availableBalance ?? d.balance ?? 0),
      investedBalanceCents: eurToCents(d.investedBalance || 0),
      kycStatus: (() => {
        const raw = String(d.kycStatus || d.kyc_status || 'not_started').trim().toLowerCase();
        if (raw === 'approved' || raw === 'verified') return 'verified';
        if (raw === 'rejected') return 'rejected';
        if (raw === 'in_review' || raw === 'pending') return raw;
        if (raw === 'unverified' || raw === 'not_started') return 'not_started';
        return raw || 'not_started';
      })(),
      status: String(d.status || 'active'),
      address: String(d.address || ''),
      city: String(d.city || ''),
      postalCode: String(d.postalCode || ''),
      bankIban: String(d.bankIban || d.iban || ''),
      bankAccountHolder: String(d.bankAccountHolder || d.bank_holder || d.fullName || d.full_name || ''),
      assignedBankAccount: d.assignedBankAccount || null,
      assignedUsdtAccount: d.assignedUsdtAccount || null,
      cryptoDepositAddress: String(d.cryptoDepositAddress || ''),
      taxId: String(d.taxId || ''),
      dateOfBirth: String(d.dateOfBirth || ''),
      createdAt: String(d.createdAt || ''),
    };
  },

  async getPaymentConfig(): Promise<PortalConfig> {
    const ph = PORTAL_PLACEHOLDER_CONFIG;
    try {
      const res = await api.get<any>('/payments/config');
      const d = unwrap<any>(res) || {};
      return {
        isPlaceholder: false,
        traditional: {
          beneficiary: d.traditional?.beneficiary || ph.traditional.beneficiary,
          bankName: d.traditional?.bankName || ph.traditional.bankName,
          iban: d.traditional?.iban || ph.traditional.iban,
          bic: d.traditional?.bic || ph.traditional.bic,
          address: d.traditional?.address || ph.traditional.address,
          country: d.traditional?.country || ph.traditional.country,
          instructions: d.traditional?.instructions || undefined,
          gateId: d.traditional?.gateId || undefined,
          gateName: d.traditional?.gateName || undefined,
        },
        cryptoNetworks: Array.isArray(d.cryptoNetworks) ? d.cryptoNetworks : ph.cryptoNetworks,
        limits: {
          minDepositEur: Number(d.limits?.minDepositEur ?? ph.limits.minDepositEur),
          maxDepositEur: Number(d.limits?.maxDepositEur ?? ph.limits.maxDepositEur),
          minWithdrawalEur: Number(d.limits?.minWithdrawalEur ?? ph.limits.minWithdrawalEur),
          minInvestmentEur: Number(d.limits?.minInvestmentEur ?? ph.limits.minInvestmentEur),
          maxInvestmentPerInvestorEur: Number(
            d.limits?.maxInvestmentPerInvestorEur ?? ph.limits.maxInvestmentPerInvestorEur
          ),
        },
        fees: {
          sepaDepositFeeEur: Number(d.fees?.sepaDepositFeeEur ?? ph.fees.sepaDepositFeeEur),
          cardDepositFeeEur: Number(d.fees?.cardDepositFeeEur ?? ph.fees.cardDepositFeeEur),
          withdrawalFeeEur: Number(d.fees?.withdrawalFeeEur ?? ph.fees.withdrawalFeeEur),
          investmentFeePercent: Number(d.fees?.investmentFeePercent ?? ph.fees.investmentFeePercent),
          treasuryFxFeePercent: Number(d.fees?.treasuryFxFeePercent ?? ph.fees.treasuryFxFeePercent),
        },
        settlement: {
          sepaDepositEta: d.settlement?.sepaDepositEta || ph.settlement.sepaDepositEta,
          cardDepositEta: d.settlement?.cardDepositEta || ph.settlement.cardDepositEta,
          withdrawalEta: d.settlement?.withdrawalEta || ph.settlement.withdrawalEta,
        },
      };
    } catch (err) {
      if (!isSupabaseConfigured()) throw err;
      const { data: gates, error } = await supabase
        .from('manual_payment_methods')
        .select('*')
        .order('sort_order', { ascending: true });
      if (error || !Array.isArray(gates)) throw err;
      const activeGates = gates.filter((g: any) => g.active !== false && g.enabled !== false);
      const bankGate = activeGates.find((g: any) => normalizeMethodKind(g.method) === 'bank');
      const bankCoords = gateRowToAssignedBankAccount(bankGate);
      const cryptoGates = activeGates
        .filter((g: any) => normalizeMethodKind(g.method) === 'usdt')
        .map((g: any) => {
          const norm = normalizeManualMethodRow(g);
          return {
            id: String(g.id),
            name: String(g.name || norm?.network || 'Crypto Rail'),
            token: norm?.token || 'USDT',
            network: norm?.network || String(g.name || 'TRC20'),
            walletAddress: norm?.wallet_address || '',
            contractAddress: norm?.contract_address,
            instructions: norm?.instructions,
            enabled: true,
          };
        })
        .filter((n: any) => n.walletAddress);
      return {
        ...ph,
        isPlaceholder: false,
        traditional: bankCoords
          ? {
              beneficiary: bankCoords.beneficiary || ph.traditional.beneficiary,
              bankName: bankCoords.bankName || ph.traditional.bankName,
              iban: bankCoords.iban || ph.traditional.iban,
              bic: bankCoords.bic || ph.traditional.bic,
              address: bankCoords.address || ph.traditional.address,
              country: bankCoords.country || ph.traditional.country,
              instructions: bankCoords.instructions,
              gateId: bankCoords.gateId,
              gateName: bankCoords.gateName,
            }
          : ph.traditional,
        cryptoNetworks: cryptoGates.length > 0 ? cryptoGates : ph.cryptoNetworks,
      };
    }
  },

  async getAssignedPaymentMethods(): Promise<PortalAssignedPaymentMethod[]> {
    try {
      const res = await api.get<any>('/manual-payments/methods');
      const list = unwrap<any[]>(res);
      if (!Array.isArray(list)) return [];
      return list
        .map(normalizeManualMethodRow)
        .filter((item): item is PortalAssignedPaymentMethod => Boolean(item));
    } catch (err) {
      const uid = await getActiveSupabaseUserId();
      if (!uid) throw err;
      const [{ data: gates, error }, { data: profile }] = await Promise.all([
        supabase.from('manual_payment_methods').select('*').order('sort_order', { ascending: true }),
        supabase
          .from('user_profiles')
          .select('assigned_gate_id,assigned_usdt_gate_id')
          .eq('id', uid)
          .maybeSingle(),
      ]);
      if (error || !Array.isArray(gates)) throw err;
      const activeGates = gates.filter((g: any) => g.active !== false && g.enabled !== false);
      const assignedIds = new Set(
        [profile?.assigned_gate_id, profile?.assigned_usdt_gate_id].filter(Boolean).map(String)
      );
      const visible =
        assignedIds.size > 0
          ? activeGates.filter(
              (g: any) => assignedIds.has(String(g.id)) || (!g.assigned_user_id && normalizeMethodKind(g.method) === 'usdt')
            )
          : activeGates.filter((g: any) => !g.assigned_user_id || String(g.assigned_user_id) === uid);
      return visible
        .map(normalizeManualMethodRow)
        .filter((item): item is PortalAssignedPaymentMethod => Boolean(item));
    }
  },

  async submitDeposit(payload: {
    amount: number;
    currency: string;
    method: string;
    methodId?: string;
    txHash?: string;
    idempotencyKey?: string;
  }): Promise<PortalTransaction> {
    const res = await api.post<any>('/deposits', {
      ...payload,
      idempotencyKey: payload.idempotencyKey || createIdempotencyKey(),
    });
    return unwrap<PortalTransaction>(res);
  },

  async submitDepositTxHash(depositId: string, txHash: string): Promise<{ id: string; txHash: string; transaction_id_submitted: boolean }> {
    const res = await api.post<any>(`/deposits/${encodeURIComponent(depositId)}/tx-hash`, { txHash });
    return unwrap<any>(res);
  },

  async uploadDepositProof(depositId: string, file: File): Promise<{ id: string; proofAttached: boolean }> {
    const res = await api.post<any>(`/deposits/${encodeURIComponent(depositId)}/proof`, {
      fileName: file.name,
      mimeType: file.type,
    });
    return unwrap<any>(res);
  },

  async requestActionVerification(
    actionScope: 'investor.withdrawal.create' | 'investor.profile.bank.update' | 'investor.password.change'
  ): Promise<{
    otpRequired: boolean;
    grantId?: string;
    maskedEmail?: string;
  }> {
    const res = await apiRequest<any>('/security/action-code/request', {
      method: 'POST',
      body: { actionScope },
    });
    return {
      otpRequired: res?.otpRequired !== false,
      grantId: res?.grantId,
      maskedEmail: res?.maskedEmail,
    };
  },

  async verifyActionCode(
    actionScope: 'investor.withdrawal.create' | 'investor.profile.bank.update' | 'investor.password.change',
    code: string
  ): Promise<string> {
    const res = await apiRequest<any>('/security/action-code/verify', {
      method: 'POST',
      body: { actionScope, code: code.trim() },
    });
    if (!res?.grantId) {
      throw new Error('Unable to verify security code.');
    }
    return String(res.grantId);
  },

  async submitWithdrawal(payload: {
    amount: number;
    destination: string;
    method: string;
    accountHolderName?: string;
    grantId?: string;
    idempotencyKey?: string;
  }): Promise<PortalTransaction> {
    const headers: Record<string, string> = {};
    if (payload.grantId) {
      headers['X-Action-Verification'] = payload.grantId;
    }
    const res = await apiRequest<any>('/withdrawals', {
      method: 'POST',
      body: {
        amount: payload.amount,
        destination: payload.destination,
        method: payload.method,
        accountHolderName: payload.accountHolderName,
        idempotencyKey: payload.idempotencyKey || createIdempotencyKey(),
      },
      headers,
    });
    return unwrap<PortalTransaction>(res);
  },

  async executeInvestment(payload: {
    propertyId: string;
    tokensCount: number;
    paymentMethod?: string;
    grantId?: string;
    idempotencyKey?: string;
  }): Promise<{ investment: any; transaction: PortalTransaction; remainingAvailableTokens: number }> {
    const headers: Record<string, string> = {};
    if (payload.grantId) {
      headers['X-Action-Verification'] = payload.grantId;
    }
    const res = await apiRequest<any>('/investments', {
      method: 'POST',
      body: {
        propertyId: payload.propertyId,
        tokensCount: payload.tokensCount,
        paymentMethod: payload.paymentMethod || 'Platform Balance',
        idempotencyKey: payload.idempotencyKey || createIdempotencyKey(),
      },
      headers,
    });
    return unwrap<any>(res);
  },

  async getTreasuryRates(): Promise<{ base: string; ratesToEur: Record<string, number>; feePercent: number }> {
    const res = await api.get<any>('/treasury/rates');
    return unwrap<any>(res);
  },

  async getTreasuryBalances(): Promise<{ balances: Record<string, number> }> {
    const res = await api.get<any>('/treasury/balances');
    return unwrap<any>(res);
  },

  async convertTreasury(payload: { fromCurrency: string; toCurrency: string; amount: number }) {
    const res = await api.post<any>('/treasury/convert', payload);
    return unwrap<any>(res);
  },

  async getComplianceSteps(): Promise<PortalComplianceStep[]> {
    const res = await api.get<any>('/compliance/steps');
    const steps = unwrap<PortalComplianceStep[]>(res);
    return Array.isArray(steps) ? steps : [];
  },

  async getComplianceDocuments(): Promise<PortalComplianceDoc[]> {
    const res = await api.get<any>('/compliance/documents');
    const docs = unwrap<PortalComplianceDoc[]>(res);
    return Array.isArray(docs) ? docs : [];
  },

  async uploadComplianceDocument(payload: {
    category: 'kyc_identity' | 'proof_of_address' | 'accredited_proof';
    documentType: string;
    fileName: string;
    fileSize: number;
    mimeType: string;
    fileDataUrl?: string;
  }): Promise<{ record: PortalComplianceDoc; documents: PortalComplianceDoc[] }> {
    const res = await api.post<any>('/compliance/documents', payload);
    return {
      record: res.data,
      documents: Array.isArray(res.documents) ? res.documents : [res.data],
    };
  },

  async getKycSubmissions(): Promise<{ overallStatus: string; submissions: any[] }> {
    const res = await api.get<any>('/compliance/kyc-submissions');
    const data = unwrap<any>(res) || {};
    return {
      overallStatus: String(data.overallStatus || 'not_started'),
      submissions: Array.isArray(data.submissions) ? data.submissions : [],
    };
  },

  async submitKycSubmission(payload: {
    docType: 'identity' | 'proof_of_address' | 'questionnaire';
    filePath?: string | null;
    fileName?: string;
    mimeType?: string;
    fileSize?: number;
    fileDataUrl?: string;
    answers?: Record<string, unknown> | null;
  }): Promise<{ submission: any; overallStatus: string }> {
    const res = await api.post<any>('/compliance/kyc-submissions', payload);
    return unwrap<any>(res);
  },

  async getAccountStatement(): Promise<PortalAccountStatement> {
    try {
      const res = await api.get<any>('/reports/account-statement');
      return unwrap<PortalAccountStatement>(res);
    } catch (err) {
      const uid = await getActiveSupabaseUserId();
      if (!uid) throw err;
      const [{ data: profile }, { data: txs }, { data: investments }] = await Promise.all([
        supabase.from('user_profiles').select('*').eq('id', uid).maybeSingle(),
        supabase.from('payment_transactions').select('*').eq('user_id', uid).order('created_at', { ascending: false }).limit(500),
        supabase.from('investments').select('*').eq('user_id', uid),
      ]);
      if (!profile) throw err;
      const txList = Array.isArray(txs) ? txs : [];
      const completed = txList.filter((t: any) => String(t.status || '').toLowerCase() === 'completed');
      const totalDeposits = completed
        .filter((t: any) => String(t.type || '').toLowerCase() === 'deposit')
        .reduce((sum: number, t: any) => sum + Number(t.amount || 0), 0);
      const totalWithdrawals = completed
        .filter((t: any) => String(t.type || '').toLowerCase() === 'withdrawal')
        .reduce((sum: number, t: any) => sum + Number(t.amount || 0), 0);
      const totalInvested = (Array.isArray(investments) ? investments : []).reduce(
        (sum: number, row: any) => sum + Number(row.total_amount_invested || 0),
        0
      );
      return {
        statementId: `STMT-${new Date().getUTCFullYear()}-${uid.slice(0, 8).toUpperCase()}`,
        periodStart: txList.length ? String(txList[txList.length - 1].created_at) : new Date().toISOString(),
        periodEnd: new Date().toISOString(),
        totalDeposits,
        totalWithdrawals,
        totalInvested,
        totalDividendsReceived: Number(profile.total_dividends_earned || 0),
        currentBalance: Number(profile.wallet_balance || 0),
      };
    }
  },

  async getStatements(): Promise<PortalUploadedDocument[]> {
    try {
      const res = await api.get<any>('/reports/statements');
      const list = unwrap<PortalUploadedDocument[]>(res);
      return Array.isArray(list) ? list : [];
    } catch (err) {
      const uid = await getActiveSupabaseUserId();
      if (!uid) throw err;
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('user_id', uid)
        .in('category', ['statement', 'tax'])
        .order('uploaded_at', { ascending: false });
      if (error || !Array.isArray(data)) return [];
      return data.map((doc: any) => ({
        id: String(doc.id),
        userId: String(doc.user_id || uid),
        category: doc.category === 'tax' ? 'tax_document' : 'statement',
        title: String(doc.title || doc.file_name || 'Document'),
        fileName: String(doc.file_name || 'statement.pdf'),
        fileSize: Number(doc.file_size || 0),
        mimeType: String(doc.mime_type || 'application/pdf'),
        uploadedAt: String(doc.uploaded_at || new Date().toISOString()),
        fileDataUrl: doc.file_data_url || undefined,
      }));
    }
  },

  async getDocumentSignedUrl(docId: string): Promise<{
    url: string;
    expiresInSeconds: number;
    fileName?: string;
    mimeType?: string;
  }> {
    const res = await api.get<any>(`/reports/statements/${encodeURIComponent(docId)}/signed-url`);
    const data = unwrap<any>(res) || {};
    if (!data?.url) {
      throw new Error('Document download URL is unavailable.');
    }
    return {
      url: String(data.url),
      expiresInSeconds: Number(data.expiresInSeconds || 60),
      fileName: data.fileName ? String(data.fileName) : undefined,
      mimeType: data.mimeType ? String(data.mimeType) : undefined,
    };
  },

  async getPerformance(): Promise<PortalPerformanceData> {
    try {
      const res = await api.get<any>('/dashboard/performance');
      const d = unwrap<any>(res) || {};
      return {
        annualizedReturnPercent: Number(d.annualizedReturnPercent || 0),
        historicalPerformance: Array.isArray(d.historicalPerformance) ? d.historicalPerformance : [],
      };
    } catch (err) {
      const uid = await getActiveSupabaseUserId();
      if (!uid) throw err;
      const [{ data: investments }, { data: txs }] = await Promise.all([
        supabase.from('investments').select('*').eq('user_id', uid),
        supabase.from('payment_transactions').select('*').eq('user_id', uid).order('created_at', { ascending: true }).limit(500),
      ]);
      const invList = Array.isArray(investments) ? investments : [];
      const invested = invList.reduce((sum: number, row: any) => sum + Number(row.total_amount_invested || 0), 0);
      const weightedAnnualRate =
        invested > 0
          ? invList.reduce(
              (sum: number, row: any) =>
                sum + Number(row.monthly_target_rate || 0) * 12 * Number(row.total_amount_invested || 0),
              0
            ) / invested
          : 0;
      let runningTotal = 0;
      const byMonth = new Map<string, { yield: number; totalValue: number }>();
      for (const row of Array.isArray(txs) ? txs : []) {
        if (String(row.status || '').toLowerCase() !== 'completed') continue;
        const amt = Number(row.amount || 0);
        const type = String(row.type || '').toLowerCase();
        const isDist = type === 'dividend' || type === 'distribution' || type === 'payout';
        if (type === 'deposit' || isDist) runningTotal += amt;
        else if (type === 'withdrawal') runningTotal = Math.max(0, runningTotal - amt);
        const month = new Date(row.created_at || Date.now()).toLocaleDateString('en-US', {
          month: 'short',
          year: 'numeric',
          timeZone: 'UTC',
        });
        const prev = byMonth.get(month) || { yield: 0, totalValue: runningTotal };
        if (isDist) prev.yield += amt;
        prev.totalValue = Number(runningTotal.toFixed(2));
        byMonth.set(month, prev);
      }
      return {
        annualizedReturnPercent: Number(weightedAnnualRate.toFixed(2)),
        historicalPerformance: Array.from(byMonth.entries()).map(([month, values]) => ({
          month,
          ...values,
        })),
      };
    }
  },

  async getDistributionsSummary(): Promise<{
    summaries: any[];
    totalPropertiesCount: number;
    totalAllocatedCapitalEUR: number;
    totalDailyEntitlementEUR: number;
    totalPaymentsReceivedEUR: number;
    totalPendingPaymentsEUR: number;
    lastUpdated: string;
  }> {
    try {
      const res = await api.get<any>('/distributions/my-properties');
      return unwrap<any>(res);
    } catch (err) {
      const uid = await getActiveSupabaseUserId();
      if (!uid) throw err;
      const [{ data: profile }, { data: investments }] = await Promise.all([
        supabase.from('user_profiles').select('total_dividends_earned').eq('id', uid).maybeSingle(),
        supabase.from('investments').select('*').eq('user_id', uid),
      ]);
      const invList = Array.isArray(investments) ? investments : [];
      const totalAllocatedCapitalEUR = invList.reduce(
        (sum: number, row: any) => sum + Number(row.total_amount_invested || 0),
        0
      );
      const totalDailyEntitlementEUR = Number(
        invList
          .reduce(
            (sum: number, row: any) =>
              sum + (Number(row.total_amount_invested || 0) * (Number(row.monthly_target_rate || 0) / 100)) / 30,
            0
          )
          .toFixed(2)
      );
      return {
        summaries: [],
        totalPropertiesCount: invList.filter((r: any) => r.status === 'active').length,
        totalAllocatedCapitalEUR,
        totalDailyEntitlementEUR,
        totalPaymentsReceivedEUR: Number(profile?.total_dividends_earned || 0),
        totalPendingPaymentsEUR: 0,
        lastUpdated: new Date().toISOString(),
      };
    }
  },

  getDistributionsExportUrl(format: 'csv' | 'json' = 'csv'): string {
    return `${getBaseUrl()}/distributions/export?format=${format}`;
  },

  async submitSupportMessage(payload: {
    fullName: string;
    email: string;
    topic: string;
    message: string;
  }): Promise<{ ticketId: string }> {
    const res = await api.post<any>('/contact', payload);
    return unwrap<{ ticketId: string }>(res) || { ticketId: 'TICKET-SENT' };
  },
};
