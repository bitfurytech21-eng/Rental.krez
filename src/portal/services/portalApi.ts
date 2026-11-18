import { api, apiRequest, createIdempotencyKey, getBaseUrl } from '../../lib/api';
import { PORTAL_PLACEHOLDER_CONFIG } from '../config/portalConfig';
import { eurToCents } from './money';
import {
  PortalAccountStatement,
  PortalAssignedBankAccount,
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
      subBalances:
        data.subBalances && typeof data.subBalances === 'object' ? data.subBalances : { EUR: balance },
      currency: String(data.currency || 'EUR'),
    };
  },

  async getProperties(params?: { search?: string; status?: string; type?: string }): Promise<PortalProperty[]> {
    const res = await api.get<any>('/marketplace/listings', { params });
    const list = unwrap<any[]>(res);
    return Array.isArray(list) ? list : [];
  },

  async getPropertyDetail(idOrSlug: string): Promise<PortalProperty> {
    const res = await api.get<any>(`/marketplace/listings/${encodeURIComponent(idOrSlug)}`);
    return unwrap<PortalProperty>(res);
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

  async submitDeposit(payload: {
    amount: number;
    currency: string;
    method: string;
    txHash?: string;
    idempotencyKey?: string;
  }): Promise<PortalTransaction> {
    const res = await api.post<any>('/deposits', {
      ...payload,
      idempotencyKey: payload.idempotencyKey || createIdempotencyKey(),
    });
    return unwrap<PortalTransaction>(res);
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
