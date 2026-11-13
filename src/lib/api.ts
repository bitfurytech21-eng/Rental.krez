const createIdempotencyKey = () => globalThis.crypto?.randomUUID?.() || `op-${Date.now()}-${Math.random().toString(36).slice(2)}`;

/**
 * Centralized API Client Wrapper for L'Agence Real Estate Platform
 * 
 * Provides a robust, standard fetch wrapper for the separated backend architecture:
 * - Automatic JWT bearer authentication header injection
 * - Configurable base URL with environment variable support (VITE_API_BASE_URL)
 * - Custom typed error handling (ApiError)
 * - Support for JSON, FormData, query parameters, and abort timeouts
 * - Modular API services for Customer, Wallet, Investment, and Admin operations
 */

import {
  PropertyDailyPaymentConfig,
  DailyPaymentRecord,
  DistributionPaymentStatus,
  UserPropertyDistributionSummary,
  DailyPaymentRunRequest,
  DailyPaymentRunResult
} from '../types/distribution';

export interface ApiResponse<T = any> {
  success: boolean;
  data: T;
  message?: string;
  meta?: Record<string, any>;
}

export class ApiError extends Error {
  public status: number;
  public code?: string;
  public details?: any;

  constructor(message: string, status: number, code?: string, details?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export interface RequestOptions extends Omit<RequestInit, 'body'> {
  params?: Record<string, string | number | boolean | undefined | null>;
  body?: any;
  timeoutMs?: number;
  skipAuth?: boolean;
}

// Token storage key
export const AUTH_TOKEN_STORAGE_KEY = 'kretz_auth_token';

// In-memory token & CSRF state fallback & listeners
let inMemoryToken: string | null = null;
let inMemoryCsrfToken: string | null = null;
type UnauthorizedHandler = () => void;
const unauthorizedHandlers: Set<UnauthorizedHandler> = new Set();

export const setCsrfToken = (csrfToken: string | null) => {
  inMemoryCsrfToken = csrfToken;
};

export const getCsrfToken = (): string | null => {
  return inMemoryCsrfToken;
};

/**
 * Configure or retrieve the active authentication token
 */
export const setAuthToken = (token: string | null) => {
  inMemoryToken = token;
  if (typeof window !== 'undefined') {
    if (token) {
      localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token);
    } else {
      localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
      inMemoryCsrfToken = null;
    }
  }
};

export const getAuthToken = (): string | null => {
  if (inMemoryToken) return inMemoryToken;
  if (typeof window !== 'undefined') {
    const direct = localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
    if (direct) return direct;
  }
  return null;
};

/**
 * Register a listener for 401 Unauthorized responses (e.g. to trigger logout or redirect)
 */
export const onUnauthorized = (handler: UnauthorizedHandler): (() => void) => {
  unauthorizedHandlers.add(handler);
  return () => {
    unauthorizedHandlers.delete(handler);
  };
};

/**
 * Resolve the base API URL
 */
export const getBaseUrl = (): string => {
  const envUrl = (import.meta as any).env?.VITE_API_BASE_URL;
  if (envUrl) {
    return envUrl.endsWith('/') ? envUrl.slice(0, -1) : envUrl;
  }
  // Default to relative /api/v1 for unified full-stack server
  return '/api/v1';
};

/** Resolve an API-relative path against the configured API origin. */
export const getApiUrl = (endpoint: string): string => {
  if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) return endpoint;
  const base = getBaseUrl();
  return `${base}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
};

/**
 * Core HTTP Request Wrapper
 */
export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const {
    params,
    body,
    headers: customHeaders = {},
    timeoutMs = 15000,
    skipAuth = false,
    ...fetchOptions
  } = options;

  // Build query string
  let url = endpoint.startsWith('http://') || endpoint.startsWith('https://')
    ? endpoint
    : getApiUrl(endpoint);

  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        searchParams.append(key, String(value));
      }
    });
    const queryString = searchParams.toString();
    if (queryString) {
      url += (url.includes('?') ? '&' : '?') + queryString;
    }
  }

  // Build headers
  const headers = new Headers(customHeaders);

  // Inject JWT Bearer Token if available and not skipped
  if (!skipAuth) {
    const token = getAuthToken();
    if (token && !headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${token}`);
    }
  }

  // Inject CSRF Token for mutating requests
  const method = (fetchOptions.method || 'GET').toUpperCase();
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    const csrfTok = getCsrfToken();
    if (csrfTok && !headers.has('X-CSRF-Token')) {
      headers.set('X-CSRF-Token', csrfTok);
    }
  }

  // Handle request body and Content-Type
  let requestBody: BodyInit | undefined = undefined;
  if (body !== undefined && body !== null) {
    if (body instanceof FormData || body instanceof Blob || body instanceof URLSearchParams) {
      requestBody = body;
    } else if (typeof body === 'object') {
      if (!headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json');
      }
      requestBody = JSON.stringify(body);
    } else {
      requestBody = String(body);
    }
  }

  // Setup timeout with AbortController
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      credentials: 'include',
      ...fetchOptions,
      headers,
      body: requestBody,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    // Extract CSRF token header if provided by server
    const serverCsrf = response.headers.get('x-csrf-token') || response.headers.get('X-CSRF-Token');
    if (serverCsrf) {
      setCsrfToken(serverCsrf);
    }

    // Parse response body
    const contentType = response.headers.get('content-type') || '';
    let responseData: any;
    if (contentType.includes('application/json')) {
      responseData = await response.json();
      if (responseData && typeof responseData === 'object' && responseData.csrfToken) {
        setCsrfToken(responseData.csrfToken);
      }
    } else {
      responseData = await response.text();
    }

    // Check for HTTP errors
    if (!response.ok) {
      if (response.status === 401) {
        unauthorizedHandlers.forEach(handler => {
          try {
            handler();
          } catch (e) {
            console.error('Error in unauthorized handler', e);
          }
        });
      }

      let errorMessage =
        (typeof responseData === 'object' && responseData !== null && (responseData.error || responseData.message)) ||
        '';

      if (!errorMessage) {
        if (response.status === 405 || response.status === 404) {
          errorMessage = 'Authentication service is temporarily unavailable. Please try again.';
        } else if (response.status === 401 || response.status === 403) {
          errorMessage = 'Invalid email address or security credentials.';
        } else if (response.status === 429) {
          errorMessage = 'Too many attempts. Please wait a moment before trying again.';
        } else if (response.status >= 500) {
          errorMessage = 'Service is temporarily unavailable. Please try again shortly.';
        } else if (response.statusText && !response.statusText.includes('405') && response.statusText !== 'Method Not Allowed') {
          errorMessage = response.statusText;
        } else {
          errorMessage = 'Unable to complete request. Please try again.';
        }
      }

      const errorCode = (typeof responseData === 'object' && responseData?.code) || undefined;
      const errorDetails = (typeof responseData === 'object' && responseData?.details) || responseData;

      throw new ApiError(errorMessage, response.status, errorCode, errorDetails);
    }

    return responseData as T;
  } catch (error: any) {
    clearTimeout(timeoutId);

    if (error.name === 'AbortError') {
      throw new ApiError(`Request timed out after ${timeoutMs}ms`, 408, 'REQUEST_TIMEOUT');
    }

    if (error instanceof ApiError) {
      throw error;
    }

    // Generic network or unexpected error
    throw new ApiError(
      error?.message || 'Network request failed. Please check your internet connection.',
      0,
      'NETWORK_ERROR'
    );
  }
}

// Convenient HTTP Verb Helpers
export const api = {
  get: <T = any>(endpoint: string, options?: RequestOptions) =>
    apiRequest<T>(endpoint, { ...options, method: 'GET' }),

  post: <T = any>(endpoint: string, body?: any, options?: RequestOptions) =>
    apiRequest<T>(endpoint, { ...options, method: 'POST', body }),

  put: <T = any>(endpoint: string, body?: any, options?: RequestOptions) =>
    apiRequest<T>(endpoint, { ...options, method: 'PUT', body }),

  patch: <T = any>(endpoint: string, body?: any, options?: RequestOptions) =>
    apiRequest<T>(endpoint, { ...options, method: 'PATCH', body }),

  delete: <T = any>(endpoint: string, options?: RequestOptions) =>
    apiRequest<T>(endpoint, { ...options, method: 'DELETE' }),
};

// ============================================================================
// Specialized API Services for Client & Admin Separation
// ============================================================================

/**
 * Authentication Endpoints with Cloudflare Turnstile bot verification
 */
export const authApi = {
  login: (email: string, pass: string, turnstileToken?: string) =>
    api.post<{ user: any; token: string }>('/auth/login', { email, pass, turnstileToken }, { skipAuth: true }),

  register: (payload: {
    email: string;
    pass: string;
    fullName: string;
    role?: string;
    turnstileToken?: string;
    country?: string;
    phoneNumber?: string;
    countryCode?: string;
  }) =>
    api.post<{ user: any; token: string }>('/auth/register', payload, { skipAuth: true }),

  getMe: () =>
    api.get<{ user: any }>('/auth/me'),

  getSession: () =>
    api.get<{ authenticated: boolean; user: any }>('/auth/session'),

  logout: () =>
    api.post<{ success: boolean }>('/auth/logout'),

  sendPasswordReset: (email: string, turnstileToken?: string) =>
    api.post<{ success: boolean; message: string }>('/auth/password/forgot', { email, turnstileToken }, { skipAuth: true }),

  updatePassword: (password: string, token?: string) =>
    api.post<{ success: boolean; message: string }>('/auth/password/reset', { newPassword: password, token }),

  adminLogin: (email: string, pass: string, turnstileToken?: string) =>
    api.post<{ user: any; token: string; message?: string }>('/auth/admin-login', {
      email,
      password: pass,
      turnstileToken: turnstileToken || 'mock-admin-turnstile-token'
    }, { skipAuth: true }),

  adminLogout: () =>
    api.post<{ success: boolean; message: string }>('/auth/admin-logout', {}, { skipAuth: true }),

  getAdminSession: () =>
    api.get<{ user: any }>('/auth/admin-session'),
};

/**
 * Direct Investor Desk & Contact API
 */
export const contactApi = {
  submit: (payload: {
    fullName: string;
    email: string;
    phone?: string;
    topic?: string;
    advisorName?: string;
    investmentCapacity?: string;
    country?: string;
    message: string;
    turnstileToken?: string;
  }) =>
    api.post<{ success: boolean; data?: { ticketId: string; createdAt?: string }; message: string }>('/contact', payload),
};

export const newsletterApi = {
  subscribe: (email: string, source: string = 'editorial_dispatch') =>
    api.post<{
      success: boolean;
      data: { email: string; alreadySubscribed: boolean; subscribedAt: string; reference: string };
      message: string;
    }>('/newsletter/subscribe', { email, source }),
};

export const membershipApi = {
  apply: (payload: {
    fullName: string;
    email: string;
    phone?: string;
    tierId: 'atelier' | 'sovereign' | 'patron' | 'black_circle' | 'heritage' | string;
    billingCycle: 'annual' | 'monthly';
    paymentMethod: 'wallet_balance' | 'bank_wire' | 'credit_card' | 'complimentary_invitation';
    preferredRegion?: string;
    invitationCode?: string;
    specialRequests?: string;
    turnstileToken?: string;
  }) =>
    api.post<{
      success: boolean;
      data: {
        applicationId: string;
        status: string;
        tierId: string;
        billingCycle: string;
        paymentMethod: string;
        createdAt: string;
      };
      message: string;
    }>('/memberships/apply', payload),
};

/**
 * Security & Human Verification API
 */
export const securityApi = {
  verifyTurnstile: (turnstileToken: string) =>
    api.post<{ success: boolean; message: string; challengeTs?: string; hostname?: string }>('/security/verify-turnstile', { turnstileToken }),
};

/**
 * Property & Marketplace Endpoints
 */
export const marketplaceApi = {
  getListings: (params?: { type?: string; status?: string; search?: string }) =>
    api.get<any[]>('/marketplace/listings', { params }),

  getListing: (idOrSlug: string) =>
    api.get<any>(`/marketplace/listings/${idOrSlug}`),
};

export const propertiesApi = {
  getAll: (params?: { type?: string; status?: string; search?: string }) =>
    api.get<any[]>('/marketplace/listings', { params }),

  getByIdOrSlug: (idOrSlug: string) =>
    api.get<any>(`/marketplace/listings/${idOrSlug}`),
};

/**
 * Team & Executive Leadership Endpoints
 */
export const teamApi = {
  getTeam: (params?: { category?: string; search?: string }) =>
    api.get<{ success: boolean; data: any[]; total: number }>('/team', { params, skipAuth: true }),
};

/**
 * Editorial Blog & Insights Academy Endpoints
 */
export const blogApi = {
  getPosts: (params?: { category?: string; search?: string }) =>
    api.get<{ success: boolean; data: any[]; total: number }>('/blog', { params, skipAuth: true }),

  getPostBySlug: (slug: string) =>
    api.get<{ success: boolean; data: any }>(`/blog/${slug}`, { skipAuth: true }),
};

/**
 * User Profile, Dashboard & Portfolio Endpoints
 */
export const userApi = {
  getProfile: () =>
    api.get<any>('/user/profile'),

  updateProfile: (updates: Record<string, any>) =>
    api.patch<{ success: boolean; data: any; message?: string }>('/users/me', updates),

  getPortfolio: () =>
    api.get<any>('/portfolio'),

  getDashboardSummary: () =>
    api.get<any>('/dashboard/summary'),

  getTransactions: () =>
    api.get<any[]>('/transactions'),

  getNotifications: () =>
    api.get<any>('/notifications'),

  markNotificationRead: (id: string) =>
    api.patch<any>(`/notifications/${id}/read`),

  markAllNotificationsRead: () =>
    api.post<any>('/notifications/read-all'),

  getFavorites: () =>
    api.get<{ success: boolean; data: { favorites: string[] } }>('/user/favorites'),

  addFavorite: (propertyId: string) =>
    api.post<{ success: boolean; data: { favorites: string[]; saved: boolean } }>('/user/favorites', { propertyId }),

  removeFavorite: (propertyId: string) =>
    api.delete<{ success: boolean; data: { favorites: string[]; saved: boolean } }>(`/user/favorites/${encodeURIComponent(propertyId)}`),

  getPreferences: () =>
    api.get<{ success: boolean; data: Record<string, any> }>('/user/preferences'),

  savePreferences: (prefs: Record<string, any>) =>
    api.put<{ success: boolean; data: Record<string, any> }>('/user/preferences', prefs),

  getReferrals: () =>
    api.get<{
      success: boolean;
      data: {
        referrals: Array<{ id: string; email: string; date: string; status: 'invited' | 'registered' | 'funded'; reward: number; referralCode?: string }>;
      };
    }>('/user/referrals'),

  sendReferralInvite: (email: string, referralCode?: string, inviterEmail?: string) =>
    api.post<{
      success: boolean;
      data: {
        referral: { id: string; email: string; date: string; status: 'invited' | 'registered' | 'funded'; reward: number; referralCode?: string };
        referrals: Array<{ id: string; email: string; date: string; status: 'invited' | 'registered' | 'funded'; reward: number; referralCode?: string }>;
      };
      message: string;
    }>('/user/referrals/invite', { email, referralCode, inviterEmail }),
};

/**
 * Multi-Currency Treasury & FX Conversion Endpoints
 */
export const treasuryApi = {
  getRates: () =>
    api.get<{ success: boolean; data: { base: string; ratesToEur: Record<string, number>; feePercent: number; updatedAt: string } }>('/treasury/rates'),

  getBalances: () =>
    api.get<{ success: boolean; data: { balances: Record<string, number> } }>('/treasury/balances'),

  convert: (payload: { fromCurrency: string; toCurrency: string; amount: number; clientEurBalance?: number }) =>
    api.post<{
      success: boolean;
      data: {
        reference: string;
        fromCurrency: string;
        toCurrency: string;
        fromAmount: number;
        toAmount: number;
        feeEur: number;
        balances: Record<string, number>;
        transaction: any;
      };
      message?: string;
    }>('/treasury/convert', payload),
};

/**
 * Investment & Financial Endpoints
 */
export const financialApi = {
  deposit: (payload: { amount: number; currency?: string; method?: string; txHash?: string; idempotencyKey?: string }) =>
    api.post<any>('/deposits', { ...payload, idempotencyKey: payload.idempotencyKey || createIdempotencyKey() }),

  withdraw: (payload: { amount: number; destination: string; method?: string; idempotencyKey?: string }) =>
    api.post<any>('/withdrawals', { ...payload, idempotencyKey: payload.idempotencyKey || createIdempotencyKey() }),

  invest: (payload: { propertyId: string; tokensCount: number; paymentMethod?: string; feePercent?: number; idempotencyKey?: string }) =>
    api.post<any>('/investments', { ...payload, idempotencyKey: payload.idempotencyKey || createIdempotencyKey() }),
};

export const investmentsApi = {
  getMyInvestments: () =>
    api.get<any>('/portfolio'),

  executeInvestment: (payload: { propertyId: string; tokensCount: number; paymentMethod: string; feePercent?: number; idempotencyKey?: string }) =>
    api.post<any>('/investments', { ...payload, idempotencyKey: payload.idempotencyKey || createIdempotencyKey() }),

  reinvest: (payload: { propertyId: string; tokensCount: number; idempotencyKey?: string }) =>
    api.post<any>('/investments', { ...payload, idempotencyKey: payload.idempotencyKey || createIdempotencyKey(), paymentMethod: 'Reinvested Account Balance', mode: 'reinvest' }),
};

/**
 * Wallet & Transaction Endpoints
 */
export const walletApi = {
  getBalance: () =>
    api.get<{ balance: number; subBalances?: Record<string, number>; currency: string }>('/wallet/balance'),

  getTransactions: (params?: { limit?: number; offset?: number }) =>
    api.get<any[]>('/transactions', { params }),

  createDepositRequest: (payload: { amount: number; currency: string; method: string; txHash?: string; idempotencyKey?: string }) =>
    api.post<any>('/deposits', { ...payload, idempotencyKey: createIdempotencyKey() }),

  createWithdrawalRequest: (payload: { amount: number; destination: string; method: string; idempotencyKey?: string }) =>
    api.post<any>('/withdrawals', { ...payload, idempotencyKey: createIdempotencyKey() }),
};

/**
 * Payment Configuration (Public view for deposit instructions)
 */
export const paymentsApi = {
  getPublicPaymentConfig: () =>
    api.get<{ traditional: any; cryptoNetworks: any[] }>('/payments/config'),
};

/**
 * Admin Panel API Endpoints (Guarded by requireAdmin on the server)
 */
export const adminApi = {
  getStats: () =>
    api.get<any>('/admin/stats'),

  getSystemHealth: () =>
    api.get<any>('/admin/system-health'),

  getSettings: () =>
    api.get<any>('/admin/settings'),

  getServerLogs: (params?: {
    category?: string;
    level?: string;
    route?: string;
    search?: string;
    requestId?: string;
    limit?: number;
    offset?: number;
  }) =>
    api.get<{ data?: any[]; logs?: any[]; total: number; metrics: any }>('/admin/logs', { params }),

  exportServerLogs: (format: 'json' | 'csv' = 'json') => {
    const base = getBaseUrl();
    const token = getAuthToken();
    const url = `${base}/admin/logs/export?format=${format}`;
    return fetch(url, {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    }).then(r => r.text());
  },

  getUsers: () =>
    api.get<any[]>('/admin/users'),

  updateUserKyc: (userId: string, kycStatus: 'approved' | 'rejected' | 'pending' | 'unverified', notes?: string) =>
    api.post<any>(`/admin/users/${userId}/kyc`, { kycStatus, notes }),

  creditUserBalance: (userId: string, payload: { amount: number; currency: string; method: string; reference?: string; notes: string }) =>
    api.post<any>(`/admin/users/${userId}/credit`, payload),

  getDeposits: () =>
    api.get<any[]>('/admin/deposits'),

  approveDeposit: (transactionId: string, notes?: string) =>
    api.post<any>(`/admin/deposits/${transactionId}/approve`, { notes }),

  rejectDeposit: (transactionId: string, reason: string) =>
    api.post<any>(`/admin/deposits/${transactionId}/reject`, { reason }),

  getWithdrawals: () =>
    api.get<any[]>('/admin/withdrawals'),

  approveWithdrawal: (transactionId: string, txHash?: string, notes?: string) =>
    api.post<any>(`/admin/withdrawals/${transactionId}/approve`, { txHash, notes }),

  rejectWithdrawal: (transactionId: string, reason: string) =>
    api.post<any>(`/admin/withdrawals/${transactionId}/reject`, { reason }),

  createProperty: (propertyData: any) =>
    api.post<any>('/admin/properties', propertyData),

  updateProperty: (propertyId: string, propertyData: any) =>
    api.put<any>(`/admin/properties/${propertyId}`, propertyData),

  getPaymentConfig: () =>
    api.get<any>('/admin/payment-config'),

  updatePaymentConfig: (config: any) =>
    api.put<any>('/admin/payment-config', config),

  getAuditLogs: (params?: { limit?: number }) =>
    api.get<any[]>('/admin/audit-logs', { params }),
};

/**
 * Property Payment Distribution & Daily Synchronization API
 */
export const distributionApi = {
  getMyPropertyDistributions: () =>
    api.get<{
      success: boolean;
      data: {
        summaries: UserPropertyDistributionSummary[];
        totalPropertiesCount: number;
        totalAllocatedCapitalEUR: number;
        totalDailyEntitlementEUR: number;
        totalPaymentsReceivedEUR: number;
        totalPendingPaymentsEUR: number;
        lastUpdated: string;
      };
    }>('/distributions/my-properties'),

  getPropertyConfig: (propertyId: string) =>
    api.get<{ success: boolean; data: PropertyDailyPaymentConfig }>(`/distributions/properties/${propertyId}`),

  getAdminConfigs: () =>
    api.get<{ success: boolean; data: PropertyDailyPaymentConfig[] }>('/admin/distributions/configs'),

  updateAdminConfig: (propertyId: string, updates: Partial<PropertyDailyPaymentConfig>) =>
    api.put<{ success: boolean; data: PropertyDailyPaymentConfig; message: string }>(`/admin/distributions/configs/${propertyId}`, updates),

  togglePropertyStatus: (propertyId: string, status: 'active' | 'suspended' | 'paused', reason?: string) =>
    api.post<{ success: boolean; data: PropertyDailyPaymentConfig; message: string }>(`/admin/distributions/properties/${propertyId}/toggle`, { status, reason }),

  processDailyRun: (payload?: DailyPaymentRunRequest) =>
    api.post<{ success: boolean; data: DailyPaymentRunResult; message: string }>('/admin/distributions/process', payload),

  adjustRecord: (recordId: string, updates: { amountEUR?: number; status?: DistributionPaymentStatus; reason: string }) =>
    api.post<{ success: boolean; data: DailyPaymentRecord; message: string }>(`/admin/distributions/records/${recordId}/adjust`, updates),

  getAdminRecords: (params?: { propertyId?: string; userId?: string; status?: string; startDate?: string; endDate?: string }) =>
    api.get<{ success: boolean; data: { records: DailyPaymentRecord[]; totalCount: number; totalAmountEUR: number } }>('/admin/distributions/records', { params }),

  getExportUrl: (propertyId?: string, format: 'csv' | 'json' = 'csv') => {
    const base = getBaseUrl();
    const query = new URLSearchParams();
    if (propertyId) query.set('propertyId', propertyId);
    query.set('format', format);
    return `${base}/distributions/export?${query.toString()}`;
  }
};

