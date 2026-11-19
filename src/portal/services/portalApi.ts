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

export const portalApi = {
  async getDashboardSummary(): Promise<PortalDashboardSummary> {
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
  },

  async getPortfolio(): Promise<PortalPortfolioData> {
    const res = await api.get<any>('/portfolio');
    const data = unwrap<any>(res) || {};
    return {
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
    };
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
    const res = await api.get<any>('/transactions', { params });
    const list = unwrap<any[]>(res);
    if (!Array.isArray(list)) return [];
    return list.map((t) => {
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
        description: t.description,
        note: noteValue,
        paymentMethod: t.paymentMethod || t.method,
        propertyId: t.propertyId,
        propertyTitle: t.propertyTitle,
        tokensPurchased: t.tokensPurchased,
        destination: t.destination,
        txHash: t.txHash,
        metadata: t.metadata && typeof t.metadata === 'object' ? t.metadata : {},
      };
    });
  },

  async getNotifications(): Promise<{ items: PortalNotification[]; unreadCount: number }> {
    const res = await api.get<any>('/notifications');
    const items = unwrap<PortalNotification[]>(res);
    const list = Array.isArray(items) ? items : [];
    const unreadCount = typeof res?.unreadCount === 'number'
      ? res.unreadCount
      : list.filter((n) => !n.read).length;
    return { items: list, unreadCount };
  },

  async markNotificationRead(id: string): Promise<void> {
    await api.patch(`/notifications/${encodeURIComponent(id)}/read`);
  },

  async markAllNotificationsRead(): Promise<void> {
    await api.post('/notifications/read-all');
  },

  async getProfile(): Promise<PortalProfile> {
    const res = await api.get<any>('/user/profile');
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
      kycStatus: String(d.kycStatus || 'pending'),
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
      kycStatus: String(d.kycStatus || 'pending'),
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
    const res = await api.get<any>('/payments/config');
    const d = unwrap<any>(res) || {};
    const ph = PORTAL_PLACEHOLDER_CONFIG;
    return {
      isPlaceholder: false,
      traditional: {
        beneficiary: d.traditional?.beneficiary || ph.traditional.beneficiary,
        bankName: d.traditional?.bankName || ph.traditional.bankName,
        iban: d.traditional?.iban || ph.traditional.iban,
        bic: d.traditional?.bic || ph.traditional.bic,
        address: d.traditional?.address || ph.traditional.address,
        country: d.traditional?.country || ph.traditional.country,
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
  },

  async getAssignedPaymentMethods(): Promise<PortalAssignedPaymentMethod[]> {
    const res = await api.get<any>('/manual-payments/methods');
    const list = unwrap<any[]>(res);
    if (!Array.isArray(list)) return [];
    return list
      .filter((item: any) => item?.method === 'bank' || item?.method === 'usdt')
      .map((item: any) => ({
        id: String(item.id),
        method: item.method as 'bank' | 'usdt',
        minimum_amount: item.minimum_amount ?? 100,
        maximum_amount: item.maximum_amount ?? null,
        name: String(item.name || ''),
        instructions: String(item.instructions || ''),
        network: String(item.network || ''),
        wallet_address: String(item.wallet_address || ''),
        detail_rows: Array.isArray(item.detail_rows) ? item.detail_rows : [],
      }));
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

  async getAccountStatement(): Promise<PortalAccountStatement> {
    const res = await api.get<any>('/reports/account-statement');
    return unwrap<PortalAccountStatement>(res);
  },

  async getStatements(): Promise<PortalUploadedDocument[]> {
    const res = await api.get<any>('/reports/statements');
    const list = unwrap<PortalUploadedDocument[]>(res);
    return Array.isArray(list) ? list : [];
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
    const res = await api.get<any>('/dashboard/performance');
    const d = unwrap<any>(res) || {};
    return {
      annualizedReturnPercent: Number(d.annualizedReturnPercent || 0),
      historicalPerformance: Array.isArray(d.historicalPerformance) ? d.historicalPerformance : [],
    };
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
    const res = await api.get<any>('/distributions/my-properties');
    return unwrap<any>(res);
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
