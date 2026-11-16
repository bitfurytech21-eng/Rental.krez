import { api, apiRequest, createIdempotencyKey, getBaseUrl } from '../../lib/api';
import {
  PortalAccountStatement,
  PortalComplianceDoc,
  PortalDashboardSummary,
  PortalNotification,
  PortalPaymentConfig,
  PortalPerformanceData,
  PortalPortfolioData,
  PortalProfile,
  PortalProperty,
  PortalTransaction,
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
      activePropertiesCount: Number(data.activePropertiesCount || 0),
      projectedMonthlyIncome: Number(data.projectedMonthlyIncome || 0),
      currency: String(data.currency || 'EUR'),
    };
  },

  async getPortfolio(): Promise<PortalPortfolioData> {
    const res = await api.get<any>('/portfolio');
    const data = unwrap<any>(res) || {};
    return {
      holdings: Array.isArray(data.holdings) ? data.holdings : [],
      totalHoldingsValue: Number(data.totalHoldingsValue || 0),
      totalPortfolioValue: Number(data.totalPortfolioValue || 0),
      totalTokensHeld: Number(data.totalTokensHeld || 0),
      activePropertiesCount: Number(data.activePropertiesCount || 0),
      totalDividendsReceived: Number(data.totalDividendsReceived || 0),
      currency: String(data.currency || 'EUR'),
    };
  },

  async getWalletBalance(): Promise<{ balance: number; subBalances: Record<string, number>; currency: string }> {
    const res = await api.get<any>('/wallet/balance');
    const data = unwrap<any>(res) || {};
    return {
      balance: Number(data.balance || 0),
      subBalances: data.subBalances && typeof data.subBalances === 'object' ? data.subBalances : { EUR: Number(data.balance || 0) },
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

  async getTransactions(): Promise<PortalTransaction[]> {
    const res = await api.get<any>('/transactions');
    const list = unwrap<any[]>(res);
    if (!Array.isArray(list)) return [];
    return list.map((t) => ({
      id: String(t.id),
      type: String(t.type || 'transaction'),
      amount: Number(t.amount || 0),
      currency: String(t.currency || 'EUR'),
      status: String(t.status || 'pending'),
      reference: String(t.reference || t.id),
      createdAt: String(t.createdAt || t.created_at || ''),
      description: t.description,
      paymentMethod: t.paymentMethod || t.method,
      propertyId: t.propertyId,
      propertyTitle: t.propertyTitle,
      tokensPurchased: t.tokensPurchased,
      destination: t.destination,
      txHash: t.txHash,
    }));
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
      fullName: String(d.fullName || ''),
      country: String(d.country || 'France'),
      countryCode: String(d.countryCode || ''),
      phoneNumber: String(d.phoneNumber || ''),
      accountType: String(d.accountType || 'individual_investor'),
      balance: Number(d.balance || 0),
      investedBalance: Number(d.investedBalance || 0),
      kycStatus: String(d.kycStatus || 'pending'),
      status: String(d.status || 'active'),
      address: String(d.address || ''),
      city: String(d.city || ''),
      postalCode: String(d.postalCode || ''),
      bankIban: String(d.bankIban || ''),
      cryptoDepositAddress: String(d.cryptoDepositAddress || ''),
      taxId: String(d.taxId || ''),
      dateOfBirth: String(d.dateOfBirth || ''),
      createdAt: String(d.createdAt || ''),
    };
  },

  async updateProfile(updates: Partial<PortalProfile>): Promise<PortalProfile> {
    const res = await api.patch<any>('/users/me', updates);
    const d = unwrap<any>(res) || {};
    return {
      id: String(d.id || ''),
      email: String(d.email || ''),
      fullName: String(d.fullName || ''),
      country: String(d.country || 'France'),
      countryCode: String(d.countryCode || ''),
      phoneNumber: String(d.phoneNumber || ''),
      accountType: String(d.accountType || 'individual_investor'),
      balance: Number(d.balance || 0),
      investedBalance: Number(d.investedBalance || 0),
      kycStatus: String(d.kycStatus || 'pending'),
      status: String(d.status || 'active'),
      address: String(d.address || ''),
      city: String(d.city || ''),
      postalCode: String(d.postalCode || ''),
      bankIban: String(d.bankIban || ''),
      cryptoDepositAddress: String(d.cryptoDepositAddress || ''),
      taxId: String(d.taxId || ''),
      dateOfBirth: String(d.dateOfBirth || ''),
      createdAt: String(d.createdAt || ''),
    };
  },

  async getPaymentConfig(): Promise<PortalPaymentConfig> {
    const res = await api.get<any>('/payments/config');
    const d = unwrap<any>(res) || {};
    return {
      traditional: {
        beneficiary: d.traditional?.beneficiary || 'L’Agence Escrow Services S.A.S.',
        bankName: d.traditional?.bankName || 'BNP Paribas Institutional',
        iban: d.traditional?.iban || '',
        bic: d.traditional?.bic || '',
        address: d.traditional?.address || '',
        country: d.traditional?.country || 'France',
      },
      cryptoNetworks: Array.isArray(d.cryptoNetworks) ? d.cryptoNetworks : [],
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

  async requestActionVerification(actionScope: 'investor.withdrawal.create' | 'investor.investment.create'): Promise<{
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
    actionScope: 'investor.withdrawal.create' | 'investor.investment.create',
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
