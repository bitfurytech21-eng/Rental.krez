/**
 * Centralized API Client Wrapper for Kretz Real Estate Platform
 * 
 * Provides a robust, standard fetch wrapper for the separated backend architecture:
 * - Automatic JWT bearer authentication header injection
 * - Configurable base URL with environment variable support (VITE_API_BASE_URL)
 * - Custom typed error handling (ApiError)
 * - Support for JSON, FormData, query parameters, and abort timeouts
 * - Modular API services for Customer, Wallet, Investment, and Admin operations
 */

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

// In-memory token fallback & listeners
let inMemoryToken: string | null = null;
type UnauthorizedHandler = () => void;
const unauthorizedHandlers: Set<UnauthorizedHandler> = new Set();

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
    }
  }
};

export const getAuthToken = (): string | null => {
  if (inMemoryToken) return inMemoryToken;
  if (typeof window !== 'undefined') {
    return localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
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
    : `${getBaseUrl()}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

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
      ...fetchOptions,
      headers,
      body: requestBody,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    // Parse response body
    const contentType = response.headers.get('content-type') || '';
    let responseData: any;
    if (contentType.includes('application/json')) {
      responseData = await response.json();
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

      const errorMessage =
        (typeof responseData === 'object' && responseData !== null && (responseData.message || responseData.error)) ||
        response.statusText ||
        `HTTP Error ${response.status}`;

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
 * Authentication Endpoints
 */
export const authApi = {
  login: (email: string, pass: string) =>
    api.post<{ user: any; token: string }>('/auth/login', { email, pass }, { skipAuth: true }),

  register: (payload: { email: string; pass: string; fullName: string; role?: string }) =>
    api.post<{ user: any; token: string }>('/auth/register', payload, { skipAuth: true }),

  getMe: () =>
    api.get<{ user: any }>('/auth/me'),

  getSession: () =>
    api.get<{ authenticated: boolean; user: any }>('/auth/session'),

  logout: () =>
    api.post<{ success: boolean }>('/auth/logout'),

  sendPasswordReset: (email: string) =>
    api.post<{ success: boolean; message: string }>('/auth/password/forgot', { email }, { skipAuth: true }),

  updatePassword: (password: string, token?: string) =>
    api.post<{ success: boolean; message: string }>('/auth/password/reset', { newPassword: password, token }),
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
 * User Profile, Dashboard & Portfolio Endpoints
 */
export const userApi = {
  getProfile: () =>
    api.get<any>('/user/profile'),

  getPortfolio: () =>
    api.get<any>('/portfolio'),

  getTransactions: () =>
    api.get<any[]>('/transactions'),

  getNotifications: () =>
    api.get<any[]>('/notifications'),
};

/**
 * Investment & Financial Endpoints
 */
export const financialApi = {
  deposit: (payload: { amount: number; currency?: string; method?: string; txHash?: string }) =>
    api.post<any>('/deposits', payload),

  withdraw: (payload: { amount: number; destination: string; method?: string }) =>
    api.post<any>('/withdrawals', payload),

  invest: (payload: { propertyId: string; tokensCount: number; paymentMethod?: string; idempotencyKey?: string }) =>
    api.post<any>('/investments', payload),
};

export const investmentsApi = {
  getMyInvestments: () =>
    api.get<any>('/portfolio'),

  executeInvestment: (payload: { propertyId: string; tokensCount: number; paymentMethod: string; idempotencyKey?: string }) =>
    api.post<any>('/investments', payload),
};

/**
 * Wallet & Transaction Endpoints
 */
export const walletApi = {
  getBalance: () =>
    api.get<{ balance: number; currency: string }>('/wallet/balance'),

  getTransactions: (params?: { limit?: number; offset?: number }) =>
    api.get<any[]>('/transactions', { params }),

  createDepositRequest: (payload: { amount: number; currency: string; method: string; txHash?: string }) =>
    api.post<any>('/deposits', payload),

  createWithdrawalRequest: (payload: { amount: number; destination: string; method: string }) =>
    api.post<any>('/withdrawals', payload),
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
