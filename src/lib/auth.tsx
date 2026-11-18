import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole, AccountType } from '../types/user';
import { ledger } from './ledger';
import { supabase, isSupabaseConfigured, getAuthRedirectUrl } from './supabaseClient';
import { Session } from '@supabase/supabase-js';
import { setAuthToken, apiRequest, authApi, userApi, getAuthToken } from './api';
import { hasStaffAccess } from '../components/admin/adminRbac';
import { clearActionVerification, markActionVerified } from './actionVerificationSession';

interface RegisterResult {
  user: any;
  session: Session | null;
  requiresVerification: boolean;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  token: string | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isLoading: boolean;
  isConfigured: boolean;
  isRecoveryMode: boolean;
  setIsRecoveryMode: (val: boolean) => void;
  login: (email: string, pass: string, emailCode?: string) => Promise<User>;
  requestEmailLoginCode: (email: string) => Promise<{ maskedEmail?: string; cooldownSeconds?: number }>;
  verifyEmailLoginCode: (email: string, code: string) => Promise<User>;
  adminLogin: (email: string, pass: string, emailCode?: string) => Promise<User>;
  customizeAdminCredentials: (params: {
    currentEmail: string;
    currentPassword: string;
    newEmail: string;
    newPassword: string;
    fullName?: string;
  }) => Promise<User>;
  register: (email: string, pass: string, fullName: string, acceptedTerms: boolean, acceptedRisk: boolean) => Promise<RegisterResult>;
  resendSignupConfirmation: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<boolean>;
  updatePassword: (newPassword: string) => Promise<void>;
  updateUserEmail: (newEmail: string) => Promise<void>;
  updateUserPassword: (newPassword: string) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string, grantId?: string) => Promise<void>;
  verifyMfaCode: (factorId: string, challengeId: string, code: string) => Promise<boolean>;
  quickDemoSession: (role: 'investor' | 'admin', accountType?: AccountType) => Promise<User>;
  syncAdminSession: (newToken: string, updatedFields: { email: string; fullName?: string }) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const CURRENT_USER_KEY = 'rentallog_current_user_id';
const ADMIN_PROFILE_STORAGE_KEY = 'kretz_admin_profile';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRecoveryMode, setIsRecoveryMode] = useState<boolean>(false);
  const isConfigured = isSupabaseConfigured();

  const hydrateUserFromBackendAndProfile = async (
    baseUser: User,
    accessToken?: string | null
  ): Promise<User> => {
    let enriched: User = { ...baseUser };
    try {
      if (isConfigured) {
        const { data: profileRow, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', baseUser.id)
          .maybeSingle();

        if (!error && profileRow) {
          const isAdminFlag = Boolean((profileRow as any).is_admin === true || (profileRow as any).role === 'admin' || (profileRow as any).role === 'super_admin');
          const staffRoleVal = typeof (profileRow as any).staff_role === 'string' && (profileRow as any).staff_role.trim()
            ? String((profileRow as any).staff_role).trim()
            : null;
          enriched = {
            ...enriched,
            fullName: profileRow.full_name || enriched.fullName,
            accountType: (profileRow.account_type as AccountType) || enriched.accountType,
            kycStatus: (profileRow.kyc_status as any) || enriched.kycStatus,
            walletBalance: typeof profileRow.wallet_balance === 'number' ? profileRow.wallet_balance : Number(profileRow.wallet_balance ?? enriched.walletBalance ?? 0),
            investedBalance: typeof profileRow.invested_balance === 'number' ? profileRow.invested_balance : Number(profileRow.invested_balance ?? enriched.investedBalance ?? 0),
            totalEarned: typeof profileRow.total_dividends_earned === 'number' ? profileRow.total_dividends_earned : Number(profileRow.total_dividends_earned ?? enriched.totalEarned ?? 0),
            country: profileRow.country || enriched.country,
            phoneNumber: profileRow.phone_number || enriched.phoneNumber,
            bankIban: profileRow.bank_iban || (profileRow as any).iban || enriched.bankIban,
            bankAccountHolder: profileRow.bank_account_holder || (profileRow as any).bank_holder || enriched.bankAccountHolder,
            frozen: Boolean((profileRow as any).frozen),
            status: (profileRow as any).account_status === 'suspended' || (profileRow as any).frozen ? 'suspended' : enriched.status,
            suspendedReason: (profileRow as any).suspended_reason || enriched.suspendedReason,
            isAdmin: isAdminFlag,
            staffRole: staffRoleVal,
            role: (isAdminFlag ? 'admin' : staffRoleVal ? (staffRoleVal as UserRole) : enriched.role),
          };
        }
      }

      if (accessToken && !accessToken.startsWith('kretz_adm_')) {
        try {
          const meRes = await userApi.getProfile();
          const me = (meRes as any)?.data || (meRes as any)?.user || meRes;
          if (me && (me.id || me.email)) {
            const serverIsAdmin = typeof me.isAdmin === 'boolean' ? me.isAdmin : enriched.isAdmin;
            const serverStaffRole = me.staffRole !== undefined ? me.staffRole : enriched.staffRole;
            enriched = {
              ...enriched,
              fullName: me.fullName || enriched.fullName,
              kycStatus: (me.kycStatus || enriched.kycStatus) as any,
              walletBalance: Number(me.walletBalance ?? me.balance ?? enriched.walletBalance ?? 0),
              investedBalance: Number(me.investedBalance ?? enriched.investedBalance ?? 0),
              totalEarned: Number(me.totalEarned ?? enriched.totalEarned ?? 0),
              country: me.country ?? enriched.country,
              phoneNumber: me.phoneNumber ?? enriched.phoneNumber,
              bankIban: me.bankIban ?? enriched.bankIban,
              bankAccountHolder: me.bankAccountHolder ?? enriched.bankAccountHolder,
              isAdmin: serverIsAdmin,
              staffRole: serverStaffRole,
              role: serverIsAdmin ? 'admin' : serverStaffRole ? (serverStaffRole as UserRole) : ((me.role as UserRole) || enriched.role),
            };
          }
        } catch {
          // Server profile endpoint optional during initial Supabase hydration
        }
      }
    } catch {
      // Preserve baseUser when profile enrichment fails
    }
    return enriched;
  };

  const refreshUser = async (): Promise<void> => {
    if (!user) return;
    const activeToken = getAuthToken() || (typeof window !== 'undefined' ? localStorage.getItem('kretz_auth_token') : null);
    if (activeToken && !activeToken.startsWith('kretz_adm_')) {
      try {
        const res = await userApi.getProfile();
        const serverUser = res?.data || res?.user || res;
        if (serverUser && (serverUser.id || serverUser.email)) {
          const walletBal = typeof serverUser.walletBalance === 'number'
            ? serverUser.walletBalance
            : typeof serverUser.balance === 'number'
            ? serverUser.balance
            : user.walletBalance;
          const nextIsAdmin = typeof serverUser.isAdmin === 'boolean' ? serverUser.isAdmin : user.isAdmin;
          const nextStaffRole = serverUser.staffRole !== undefined ? serverUser.staffRole : user.staffRole;
          const nextUser: User = {
            ...user,
            ...serverUser,
            id: serverUser.id || user.id,
            email: serverUser.email || user.email,
            fullName: serverUser.fullName || user.fullName,
            isAdmin: nextIsAdmin,
            staffRole: nextStaffRole,
            role: nextIsAdmin ? 'admin' : nextStaffRole ? (nextStaffRole as UserRole) : ((serverUser.role as UserRole) || user.role),
            kycStatus: (serverUser.kycStatus || user.kycStatus) as any,
            walletBalance: Number(walletBal ?? 0),
            investedBalance: Number(serverUser.investedBalance ?? user.investedBalance ?? 0),
            totalEarned: Number(serverUser.totalEarned ?? user.totalEarned ?? 0),
            bankIban: serverUser.bankIban ?? user.bankIban,
            bankAccountHolder: serverUser.bankAccountHolder ?? user.bankAccountHolder,
            phoneNumber: serverUser.phoneNumber ?? user.phoneNumber,
            address: serverUser.address ?? user.address,
            city: serverUser.city ?? user.city,
            postalCode: serverUser.postalCode ?? user.postalCode,
            country: serverUser.country ?? user.country,
            taxId: serverUser.taxId ?? user.taxId,
            avatarUrl: serverUser.avatarUrl ?? user.avatarUrl,
            cryptoDepositAddress: serverUser.cryptoDepositAddress ?? user.cryptoDepositAddress,
            frozen: typeof serverUser.frozen === 'boolean' ? serverUser.frozen : user.frozen,
          };
          setUser(nextUser);
          return;
        }
      } catch {
        // Fallback to local ledger snapshot if profile endpoint is temporarily unreachable
      }
    }
    const fresh = ledger.getUserById(user.id);
    if (fresh) {
      setUser((prev) => ({
        ...fresh,
        isAdmin: prev?.isAdmin,
        staffRole: prev?.staffRole,
        role: prev?.isAdmin ? 'admin' : prev?.staffRole ? (prev.staffRole as UserRole) : fresh.role,
      }));
    }
  };

  useEffect(() => {
    if (!user?.id) return;
    const unsubscribe = ledger.subscribe(() => {
      // Do not overwrite server-verified custom administrator email/profile or Supabase staff flags
      const activeTok = typeof window !== 'undefined' ? localStorage.getItem('kretz_auth_token') : null;
      if (activeTok && activeTok.startsWith('kretz_adm_')) {
        return;
      }
      const fresh = ledger.getUserById(user.id);
      if (fresh) {
        setUser((prev) => {
          if (!prev) return { ...fresh };
          return {
            ...fresh,
            isAdmin: prev.isAdmin,
            staffRole: prev.staffRole,
            role: prev.isAdmin ? 'admin' : prev.staffRole ? (prev.staffRole as UserRole) : fresh.role,
          };
        });
      }
    });
    return unsubscribe;
  }, [user?.id]);

  useEffect(() => {
    // Check if URL hash indicates Supabase recovery flow (#type=recovery or access_token)
    if (typeof window !== 'undefined') {
      const hash = window.location.hash;
      if (hash.includes('type=recovery') || hash.startsWith('#reset-password')) {
        setIsRecoveryMode(true);
      }
    }

    // Failsafe timer to guarantee loading state never gets stuck
    const failsafeTimer = setTimeout(() => {
      setIsLoading(false);
    }, 2000);

    const storedToken = localStorage.getItem('kretz_auth_token');

    // If no active auth token exists, immediately enforce unauthenticated guest state
    if (!storedToken) {
      setUser(null);
      setSession(null);
      setToken(null);
      setAuthToken(null);
      localStorage.removeItem(CURRENT_USER_KEY);
      localStorage.removeItem(ADMIN_PROFILE_STORAGE_KEY);
      clearTimeout(failsafeTimer);
      setIsLoading(false);
      return;
    }

    // Set token in memory so verification request includes Authorization bearer header
    setToken(storedToken);
    setAuthToken(storedToken);

    // Validate token against backend authority
    if (storedToken.startsWith('kretz_adm_')) {
      authApi.getAdminSession()
        .then((res: any) => {
          if (res?.user && (res.user.role === 'admin' || res.user.isAdmin || res.user.staffRole)) {
            const adm: User = {
              id: res.user.id || 'usr-admin-01',
              email: res.user.email,
              fullName: res.user.fullName || 'Executive Administrator',
              role: (res.user.role || 'admin') as UserRole,
              isAdmin: res.user.isAdmin !== undefined ? Boolean(res.user.isAdmin) : true,
              staffRole: res.user.staffRole ?? 'super_admin',
              accountType: 'admin',
              kycStatus: 'verified',
              walletBalance: res.user.balance ?? 0,
              investedBalance: 0,
              totalEarned: 0,
              createdAt: res.user.createdAt || new Date().toISOString(),
            };
            setUser(adm);
            localStorage.setItem(CURRENT_USER_KEY, adm.id);
          } else {
            setUser(null);
            setToken(null);
            setAuthToken(null);
            localStorage.removeItem('kretz_auth_token');
            localStorage.removeItem(CURRENT_USER_KEY);
            localStorage.removeItem(ADMIN_PROFILE_STORAGE_KEY);
          }
        })
        .catch(() => {
          setUser(null);
          setToken(null);
          setAuthToken(null);
          localStorage.removeItem('kretz_auth_token');
          localStorage.removeItem(CURRENT_USER_KEY);
          localStorage.removeItem(ADMIN_PROFILE_STORAGE_KEY);
        })
        .finally(() => {
          clearTimeout(failsafeTimer);
          setIsLoading(false);
        });
      return;
    }

    if (!isConfigured) {
      // Validate customer session against backend /api/v1/auth/session
      authApi.getSession()
        .then((res: any) => {
          const authData = res?.data || res;
          if (authData?.authenticated && authData?.user) {
            const sUser = authData.user;
            const synced = ledger.syncSupabaseUser(
              sUser.id,
              sUser.email || '',
              sUser.fullName || sUser.email?.split('@')[0] || 'Investor',
              (sUser.role as UserRole) || 'investor',
              (sUser.accountType as AccountType) || undefined,
              sUser.country,
              sUser.phoneNumber
            );
            synced.isAdmin = Boolean(sUser.isAdmin || sUser.role === 'admin' || sUser.role === 'super_admin');
            synced.staffRole = sUser.staffRole ?? (synced.isAdmin ? 'super_admin' : null);
            if (typeof sUser.balance === 'number') {
              synced.walletBalance = sUser.balance;
            }
            setUser(synced);
            localStorage.setItem(CURRENT_USER_KEY, synced.id);
          } else {
            setUser(null);
            setToken(null);
            setAuthToken(null);
            localStorage.removeItem('kretz_auth_token');
            localStorage.removeItem(CURRENT_USER_KEY);
            localStorage.removeItem(ADMIN_PROFILE_STORAGE_KEY);
          }
        })
        .catch(() => {
          setUser(null);
          setToken(null);
          setAuthToken(null);
          localStorage.removeItem('kretz_auth_token');
          localStorage.removeItem(CURRENT_USER_KEY);
          localStorage.removeItem(ADMIN_PROFILE_STORAGE_KEY);
        })
        .finally(() => {
          clearTimeout(failsafeTimer);
          setIsLoading(false);
        });
      return;
    }

    let isResolved = false;

    // 1. Fetch active Supabase session
    supabase.auth
      .getSession()
      .then(async ({ data: { session: initialSession }, error }) => {
        if (isResolved) return;
        isResolved = true;
        clearTimeout(failsafeTimer);

        if (error) {
          console.error('Unable to fetch the Supabase session.');
        }
        // Never overwrite an active cryptographically signed Administrator session with an investor Supabase session
        const currentAdminTok = localStorage.getItem('kretz_auth_token');
        if (currentAdminTok && currentAdminTok.startsWith('kretz_adm_')) {
          return;
        }

        if (initialSession?.user && !(initialSession.user.email_confirmed_at || (initialSession.user as any).confirmed_at)) {
          setUser(null);
          setSession(null);
          setToken(null);
          setAuthToken(null);
          localStorage.removeItem('kretz_auth_token');
          localStorage.removeItem(CURRENT_USER_KEY);
          window.setTimeout(() => { void supabase.auth.signOut({ scope: 'local' }); }, 0);
        } else if (initialSession?.user) {
          const synced = ledger.syncSupabaseUser(
            initialSession.user.id,
            initialSession.user.email || '',
            initialSession.user.user_metadata?.full_name || initialSession.user.email?.split('@')[0] || 'Investor',
            'investor',
            (initialSession.user.user_metadata?.account_type as AccountType) || undefined
          );
          setSession(initialSession);
          setToken(initialSession.access_token);
          setAuthToken(initialSession.access_token);
          localStorage.setItem(CURRENT_USER_KEY, synced.id);
          const hydrated = await hydrateUserFromBackendAndProfile(synced, initialSession.access_token);
          setUser(hydrated);
        } else {
          // No active Supabase session
          setUser(null);
          setSession(null);
          setToken(null);
          setAuthToken(null);
          localStorage.removeItem('kretz_auth_token');
          localStorage.removeItem(CURRENT_USER_KEY);
        }
      })
      .catch((err) => {
        if (isResolved) return;
        isResolved = true;
        clearTimeout(failsafeTimer);
        console.error('Supabase session retrieval failed.');
      })
      .finally(() => {
        if (!isResolved) {
          isResolved = true;
          clearTimeout(failsafeTimer);
        }
        setIsLoading(false);
      });

    // 2. Subscribe to auth state changes (sign in, sign out, token refresh, password recovery)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsRecoveryMode(true);
      }

      const activeAdminTok = localStorage.getItem('kretz_auth_token');
      if (activeAdminTok && activeAdminTok.startsWith('kretz_adm_')) {
        setIsLoading(false);
        return;
      }

      if (currentSession?.user && !(currentSession.user.email_confirmed_at || (currentSession.user as any).confirmed_at)) {
        setUser(null);
        setSession(null);
        setToken(null);
        setAuthToken(null);
        localStorage.removeItem('kretz_auth_token');
        localStorage.removeItem(CURRENT_USER_KEY);
        window.setTimeout(() => { void supabase.auth.signOut({ scope: 'local' }); }, 0);
      } else if (currentSession?.user) {
        const synced = ledger.syncSupabaseUser(
          currentSession.user.id,
          currentSession.user.email || '',
          currentSession.user.user_metadata?.full_name || currentSession.user.email?.split('@')[0] || 'Investor',
          'investor',
          (currentSession.user.user_metadata?.account_type as AccountType) || undefined
        );
        setSession(currentSession);
        setToken(currentSession.access_token);
        setAuthToken(currentSession.access_token);
        localStorage.setItem(CURRENT_USER_KEY, synced.id);
        const hydrated = await hydrateUserFromBackendAndProfile(synced, currentSession.access_token);
        setUser(hydrated);
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setSession(null);
        setToken(null);
        setAuthToken(null);
        localStorage.removeItem(CURRENT_USER_KEY);
      }

      setIsLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [isConfigured]);

  // Connect Customer Login form strictly to investor accounts (Administrator login is isolated at /admin/login)
  const login = async (email: string, pass: string, emailCode?: string): Promise<User> => {
    const cleanEmail = email.trim().toLowerCase();

    if (import.meta.env.PROD || !isConfigured) {
      let res: any;
      try {
        res = await authApi.login(cleanEmail, pass, emailCode);
      } catch (err: any) {
        if (err?.code === 'EMAIL_CODE_REQUIRED') throw err;
        if (err?.status === 401 || err?.code === 'INVALID_CREDENTIALS') {
          const credentialError: any = new Error('Email or password is incorrect.');
          credentialError.code = 'INVALID_CREDENTIALS';
          credentialError.status = 401;
          throw credentialError;
        }
        if (import.meta.env.PROD) {
          throw new Error(err?.message || 'Authentication service is unavailable. Please try again shortly.');
        }
        // Only use the generic outage response for transport/server failures.
        // Never create or restore a local session when authentication cannot be verified.
        if (
          err?.status === 405 ||
          err?.status === 404 ||
          err?.status === 0 ||
          err?.status >= 500 ||
          String(err?.message || '').includes('Failed to fetch') ||
          String(err?.message || '').includes('Network request failed') ||
          String(err?.message || '').includes('temporarily unavailable')
        ) {
          throw new Error('Authentication service is unavailable. Please try again shortly.');
        }
        const errMsg = err?.message?.replace(/HTTP (?:Error )?\d+/gi, 'Service error') || 'Email or password is incorrect.';
        const typedErr: any = new Error(errMsg);
        typedErr.code = err?.code;
        typedErr.status = err?.status;
        throw typedErr;
      }

      if ((res as any)?.requiresEmailCode || (res as any)?.data?.requiresEmailCode) {
        const challengeError: any = new Error('A six-digit security code has been sent to your email address.');
        challengeError.code = 'EMAIL_CODE_REQUIRED';
        challengeError.maskedEmail = (res as any)?.maskedEmail || (res as any)?.data?.maskedEmail;
        throw challengeError;
      }
      const serverUser = (res as any)?.user || (res as any)?.data?.user;
      const serverToken = (res as any)?.token || (res as any)?.data?.token;
      const serverRefreshToken = (res as any)?.refreshToken || (res as any)?.data?.refreshToken;

      if (!serverToken || !serverUser) {
        throw new Error('Email or password is incorrect.');
      }

      if (serverUser.role === 'admin' && !serverUser.staffRole && !serverUser.isAdmin) {
        throw new Error('Administrator accounts must authenticate via the Administrator Gateway at /admin/login.');
      }

      const synced = ledger.syncSupabaseUser(
        serverUser.id,
        serverUser.email,
        serverUser.fullName || cleanEmail.split('@')[0] || 'Investor',
        (serverUser.role as UserRole) || 'investor',
        (serverUser.accountType as AccountType) || 'individual_investor',
        serverUser.country,
        serverUser.phoneNumber
      );

      synced.isAdmin = Boolean(serverUser.isAdmin || serverUser.role === 'admin' || serverUser.role === 'super_admin');
      synced.staffRole = serverUser.staffRole ?? (synced.isAdmin ? 'super_admin' : null);
      if (typeof serverUser.balance === 'number') {
        synced.walletBalance = serverUser.balance;
      }

      setToken(serverToken);
      setAuthToken(serverToken);
      const hydrated = await hydrateUserFromBackendAndProfile(synced, serverToken);
      setUser(hydrated);

      // The API returns the Supabase refresh token as well as the access token.
      // Persist both in the Supabase client so AuthProvider can restore the same
      // API-authenticated session after a page reload and keep token rotation in sync.
      if (isConfigured && serverRefreshToken) {
        try {
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: serverToken,
            refresh_token: serverRefreshToken,
          });
          if (sessionError) {
            console.warn('[auth] API login succeeded; session persistence needs a retry.');
          }
        } catch (sessionError: any) {
          console.warn('[auth] API login succeeded; session persistence failed.');
        }
      }

      localStorage.removeItem(ADMIN_PROFILE_STORAGE_KEY);
      localStorage.setItem(CURRENT_USER_KEY, synced.id);

      try {
        ledger.recordAuditLog(
          synced.id,
          synced.email,
          'LOGIN_SUCCESS',
          `User ${synced.email} authenticated successfully (${synced.role}).`,
          'auth',
          'success',
          { targetUserId: synced.id, targetUserEmail: synced.email }
        );
      } catch (e) {}
      return synced;
    }

    let data: any = null;
    let error: any = null;
    try {
      const res = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: pass,
      });
      data = res.data;
      error = res.error;
    } catch (networkErr: any) {
      if (import.meta.env.PROD) {
        throw new Error('Authentication service is unavailable. Please try again shortly.');
      }
      // Do not mint a local session without validating credentials against the auth provider.
      throw new Error('Authentication service is unavailable. Please try again shortly.');
    }

    if (error) {
      try {
        ledger.recordAuditLog(
          'guest',
          cleanEmail,
          'LOGIN_FAILED',
          `Failed login attempt for ${cleanEmail}: ${error.message}`,
          'auth',
          'warning',
          { targetUserEmail: cleanEmail }
        );
      } catch (e) {}

      if (
        error.message.toLowerCase().includes('email not confirmed') ||
        error.message.toLowerCase().includes('invalid login credentials') ||
        error.status === 400 ||
        error.status === 401
      ) {
        const credentialError: any = new Error('Email or password is incorrect.');
        credentialError.code = 'INVALID_CREDENTIALS';
        throw credentialError;
      }
      throw new Error(error.message);
    }

    if (!data.user) {
      throw new Error('Authentication failed. No user was returned by Supabase.');
    }
    if (!(data.user.email_confirmed_at || (data.user as any).confirmed_at)) {
      await supabase.auth.signOut({ scope: 'local' });
      const credentialError: any = new Error('Email or password is incorrect.');
      credentialError.code = 'INVALID_CREDENTIALS';
      throw credentialError;
    }

    const synced = ledger.syncSupabaseUser(
      data.user.id,
      data.user.email || email,
      data.user.user_metadata?.full_name || email.split('@')[0] || 'Investor',
      'investor'
    );
    setSession(data.session);
    const standardToken = data.session?.access_token || 'sess_' + synced.id;
    setToken(standardToken);
    setAuthToken(standardToken);
    localStorage.setItem(CURRENT_USER_KEY, synced.id);
    const hydrated = await hydrateUserFromBackendAndProfile(synced, standardToken);
    setUser(hydrated);
    try {
      ledger.recordAuditLog(
        hydrated.id,
        hydrated.email,
        'LOGIN_SUCCESS',
        `User ${hydrated.email} authenticated successfully (${hydrated.role}).`,
        'auth',
        'success',
        { targetUserId: hydrated.id, targetUserEmail: hydrated.email }
      );
    } catch (e) {}
    return hydrated;
  };

  const requestEmailLoginCode = async (email: string): Promise<{ maskedEmail?: string; cooldownSeconds?: number }> => {
    const cleanEmail = email.trim().toLowerCase();
    const res = await authApi.requestLoginCode(cleanEmail);
    return {
      maskedEmail: res?.maskedEmail,
      cooldownSeconds: res?.cooldownSeconds ?? 60,
    };
  };

  const verifyEmailLoginCode = async (email: string, code: string): Promise<User> => {
    const cleanEmail = email.trim().toLowerCase();
    const res = await authApi.verifyLoginCode(cleanEmail, code);
    const serverUser = (res as any)?.user || (res as any)?.data?.user;
    const serverToken = (res as any)?.token || (res as any)?.data?.token;
    const serverRefreshToken = (res as any)?.refreshToken || (res as any)?.data?.refreshToken;

    if (!serverToken || !serverUser) {
      throw new Error('The security code is invalid or expired. Please try again.');
    }

    const synced = ledger.syncSupabaseUser(
      serverUser.id,
      serverUser.email || cleanEmail,
      serverUser.fullName || cleanEmail.split('@')[0] || 'Investor',
      (serverUser.role as UserRole) || 'investor',
      (serverUser.accountType as AccountType) || 'individual_investor',
      serverUser.country,
      serverUser.phoneNumber
    );
    synced.isAdmin = Boolean(serverUser.isAdmin || serverUser.role === 'admin' || serverUser.role === 'super_admin');
    synced.staffRole = serverUser.staffRole ?? (synced.isAdmin ? 'super_admin' : null);
    if (typeof serverUser.balance === 'number') {
      synced.walletBalance = serverUser.balance;
    }

    setToken(serverToken);
    setAuthToken(serverToken);
    markActionVerified();

    if (isConfigured && serverRefreshToken) {
      try {
        await supabase.auth.setSession({
          access_token: serverToken,
          refresh_token: serverRefreshToken,
        });
      } catch {
        // Session will still function with the issued access token
      }
    }

    const hydrated = await hydrateUserFromBackendAndProfile(synced, serverToken);
    setUser(hydrated);
    localStorage.removeItem(ADMIN_PROFILE_STORAGE_KEY);
    localStorage.setItem(CURRENT_USER_KEY, hydrated.id);
    return hydrated;
  };

  // Connect Register form to real Supabase account creation with user metadata and email verification
  // Public registration is restricted to investor roles (no unauthorized administrator privilege escalation)
  const register = async (
    email: string,
    pass: string,
    fullName: string,
    acceptedTerms: boolean,
    acceptedRisk: boolean
  ): Promise<RegisterResult> => {
    const cleanEmail = email.trim().toLowerCase();
    if (!acceptedTerms || !acceptedRisk) {
      throw new Error('Both required acknowledgements must be accepted before creating an account.');
    }
    if (!isConfigured) {
      throw new Error('Account registration requires the configured email-confirmation service. Please try again later.');
    }

    const redirectUrl = getAuthRedirectUrl('/#login');
    const { data, error } = await supabase.auth.signUp({
      email: cleanEmail,
      password: pass,
      options: {
        data: {
          full_name: fullName.trim(),
          accepted_terms: true,
          accepted_risk: true,
        },
        emailRedirectTo: redirectUrl,
      },
    });

    if (error) {
      const message = error.message || 'Registration could not be completed. Please try again.';
      const typedError: any = new Error(message);
      typedError.code = (error as any).code;
      throw typedError;
    }
    if (!data.user) {
      throw new Error('Account registration failed. Please try again.');
    }

    const emailConfirmed = Boolean(data.user.email_confirmed_at || (data.user as any).confirmed_at);
    if (data.session && !emailConfirmed) {
      // Fail closed if Auth is configured to issue a session before confirmation.
      await supabase.auth.signOut({ scope: 'local' });
    }

    if (data.session && emailConfirmed) {
      const synced = ledger.syncSupabaseUser(
        data.user.id,
        data.user.email || cleanEmail,
        fullName.trim(),
        'investor'
      );
      setSession(data.session);
      setToken(data.session.access_token);
      setAuthToken(data.session.access_token);
      setUser(synced);
      localStorage.setItem(CURRENT_USER_KEY, synced.id);
      return { user: data.user, session: data.session, requiresVerification: false };
    }

    setUser(null);
    setSession(null);
    setToken(null);
    setAuthToken(null);
    localStorage.removeItem(CURRENT_USER_KEY);
    localStorage.removeItem(ADMIN_PROFILE_STORAGE_KEY);
    return { user: data.user, session: null, requiresVerification: true };
  };

  const resendSignupConfirmation = async (email: string): Promise<void> => {
    if (!isConfigured) {
      throw new Error('Email confirmation is unavailable because authentication is not configured.');
    }
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: email.trim().toLowerCase(),
      options: { emailRedirectTo: getAuthRedirectUrl('/#login') },
    });
    if (error) throw error;
  };

  // Working Sign Out action
  const logout = async (): Promise<void> => {
    if (user) {
      try {
        ledger.recordAuditLog(
          user.id,
          user.email,
          'USER_LOGOUT',
          `User ${user.email} signed out of session.`,
          'auth',
          'info',
          { targetUserId: user.id, targetUserEmail: user.email }
        );
      } catch (e) {}
    }
    // Sign out on backend server to revoke active admin session token and clear HTTP-only cookie
    try {
      await apiRequest('/auth/admin-logout', { method: 'POST', skipAuth: true });
    } catch (e) {}

    try {
      await authApi.logout();
    } catch (e) {}

    if (isConfigured) {
      try {
        await supabase.auth.signOut();
      } catch (err) {
        console.warn('Supabase sign-out did not complete cleanly.');
      }
    }
    setUser(null);
    setSession(null);
    setToken(null);
    setAuthToken(null);
    clearActionVerification();
    localStorage.removeItem(CURRENT_USER_KEY);
    localStorage.removeItem('kretz_auth_token');
    localStorage.removeItem(ADMIN_PROFILE_STORAGE_KEY);
    // Clear portal-only cached preview state; live financial data is held in memory and is reset on unmount.
    try {
      sessionStorage.removeItem('portal_sample_data_enabled');
      sessionStorage.removeItem('portal_action_banner_dismissed');
    } catch {
      // Storage may be unavailable in private browsing contexts.
    }
  };

  // Supabase Auth intentionally returns the same result for existing and unknown email addresses.
  const sendPasswordReset = async (email: string): Promise<boolean> => {
    const clean = email.trim().toLowerCase();
    if (!isConfigured) {
      throw new Error('Password recovery is temporarily unavailable.');
    }

    const redirectUrl = getAuthRedirectUrl('/reset-password');
    const { error } = await supabase.auth.resetPasswordForEmail(clean, {
      redirectTo: redirectUrl,
    });
    if (error) throw new Error(error.message);
    return true;
  };

  // Complete password reset when user clicks the recovery link
  const updatePassword = async (newPassword: string): Promise<void> => {
    if (!isRecoveryMode) {
      throw new Error('Open the password-reset link from your email before setting a new password.');
    }
    if (!isConfigured) {
      setIsRecoveryMode(false);
      return;
    }

    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      throw new Error(error.message);
    }

    setIsRecoveryMode(false);
  };

  // Secure Admin Account Settings: Change Admin Email
  const updateUserEmail = async (newEmail: string): Promise<void> => {
    const clean = newEmail.trim().toLowerCase();
    if (!clean) throw new Error('Please enter a valid email address.');

    if (!isConfigured) {
      if (user) {
        const updated = ledger.updateUserProfile(user.id, { email: clean } as any);
        setUser({ ...updated });
      }
      return;
    }

    const redirectUrl = getAuthRedirectUrl('/#admin');
    const { error } = await supabase.auth.updateUser({
      email: clean,
    }, {
      emailRedirectTo: redirectUrl
    });

    if (error) {
      throw new Error(error.message);
    }
  };

  // Secure Admin Account Settings: Change Admin Password
  const updateUserPassword = async (newPassword: string): Promise<void> => {
    if (!newPassword || newPassword.length < 8) {
      throw new Error('Password must be at least 8 characters in length.');
    }

    if (!isConfigured) {
      return;
    }

    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      throw new Error(error.message);
    }
  };

  // Investor password changes require current-password verification and an active 10m email verification grant.
  const changePassword = async (currentPassword: string, newPassword: string, grantId?: string): Promise<void> => {
    if (!currentPassword) throw new Error('Enter your current password.');
    if (!newPassword || newPassword.length < 12) {
      throw new Error('New password must be at least 12 characters long.');
    }

    await authApi.changePassword(currentPassword, newPassword, grantId);

    if (isConfigured) {
      const currentEmail = user?.email?.trim().toLowerCase();
      if (currentEmail) {
        try {
          const { data } = await supabase.auth.signInWithPassword({
            email: currentEmail,
            password: newPassword,
          });
          if (data?.session) {
            setSession(data.session);
            setToken(data.session.access_token);
            setAuthToken(data.session.access_token);
          }
        } catch {
          // Backend password change already succeeded
        }
      }
    }
  };

  // MFA Challenge & Verification Step
  const verifyMfaCode = async (factorId: string, challengeId: string, code: string): Promise<boolean> => {
    if (!code || code.trim().length < 6) {
      throw new Error('Please enter a valid 6-digit verification code.');
    }

    const cleanCode = code.trim();

    // Development-only MFA bypass. Production always requires a configured, verified factor.
    if (import.meta.env.DEV && (!isConfigured || factorId === 'default_factor' || challengeId === 'challenge_admin' || cleanCode === '123456')) {
      return true;
    }
    if (!isConfigured) {
      throw new Error('Multi-factor authentication is not configured. Contact the platform administrator.');
    }

    try {
      const { data, error } = await supabase.auth.mfa.verify({
        factorId,
        challengeId,
        code: cleanCode,
      });

      if (error) {
        if (import.meta.env.DEV && (error.message.toLowerCase().includes('factor') || error.message.toLowerCase().includes('not found'))) {
          console.warn('Development-only MFA fallback: no enrolled factor was found.');
          return true;
        }
        throw new Error(error.message);
      }

      if (data?.access_token) {
        setToken(data.access_token);
      }
      return true;
    } catch (err: any) {
      if (import.meta.env.DEV && (err?.message?.toLowerCase().includes('factor') || err?.message?.toLowerCase().includes('not found'))) {
        return true;
      }
      throw new Error(err?.message || 'MFA code verification failed. Please try again.');
    }
  };

  // Dedicated Server-Side Administrator Authentication
  const adminLogin = async (email: string, pass: string, emailCode?: string): Promise<User> => {
    const cleanEmail = email.trim().toLowerCase();
    let res: any;
    try {
      res = await apiRequest<{ success: boolean; token: string; user: any; error?: string }>('/auth/admin-login', {
        method: 'POST',
        body: {
          email: cleanEmail,
          password: pass,
          emailCode
        },
        skipAuth: true
      });
    } catch (err: any) {
      // Allow Supabase-provisioned staff/admins (profiles.is_admin = true or non-null profiles.staff_role)
      // to sign in through /admin/login when legacy gateway credentials don't match.
      if (isConfigured && !emailCode) {
        try {
          const { data: sbData, error: sbErr } = await supabase.auth.signInWithPassword({
            email: cleanEmail,
            password: pass,
          });
          if (!sbErr && sbData?.user && sbData?.session?.access_token) {
            const base = ledger.syncSupabaseUser(
              sbData.user.id,
              sbData.user.email || cleanEmail,
              sbData.user.user_metadata?.full_name || cleanEmail.split('@')[0] || 'Staff',
              'investor'
            );
            setToken(sbData.session.access_token);
            setAuthToken(sbData.session.access_token);
            const hydrated = await hydrateUserFromBackendAndProfile(base, sbData.session.access_token);
            if (hasStaffAccess(hydrated)) {
              setSession(sbData.session);
              setUser(hydrated);
              localStorage.setItem(CURRENT_USER_KEY, hydrated.id);
              return hydrated;
            }
            await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
            setToken(null);
            setAuthToken(null);
            throw new Error('This account does not have staff or administrator privileges.');
          }
        } catch (sbCatch: any) {
          if (sbCatch?.message?.includes('staff or administrator privileges')) {
            throw sbCatch;
          }
        }
      }
      if (import.meta.env.PROD) {
        throw new Error(err?.message || 'Administrator authentication service is unavailable. Please try again shortly.');
      }
      if (err?.status === 405 || err?.status === 404 || String(err?.message || '').includes('405') || String(err?.message || '').includes('Failed to fetch')) {
        const localAdmin = ledger.getUserByEmail(cleanEmail) || ledger.getUsers().find(u => u.role === 'admin');
        if (localAdmin && localAdmin.role === 'admin') {
          const fakeAdminToken = `kretz_adm_local_${Math.random().toString(36).slice(2)}${Date.now()}`;
          const adminUser: User = { ...localAdmin, email: cleanEmail, isAdmin: true, staffRole: 'super_admin' };
          setSession(null);
          setUser(adminUser);
          setToken(fakeAdminToken);
          setAuthToken(fakeAdminToken);
          localStorage.setItem(CURRENT_USER_KEY, adminUser.id);
          localStorage.setItem(
            ADMIN_PROFILE_STORAGE_KEY,
            JSON.stringify({
              id: adminUser.id,
              email: adminUser.email,
              fullName: adminUser.fullName,
              createdAt: adminUser.createdAt,
            })
          );
          return adminUser;
        }
        throw new Error('Invalid administrator email or security credentials.');
      }
      throw err;
    }

    if (res?.requiresEmailCode) {
      const challengeError: any = new Error('A six-digit administrator security code has been sent to your registered email address.');
      challengeError.code = 'EMAIL_CODE_REQUIRED';
      challengeError.maskedEmail = res.maskedEmail;
      throw challengeError;
    }
    if (!res.success || !res.token) {
      throw new Error(res.error || 'Invalid administrator email or security credentials.');
    }

    // Clear any local investor Supabase session so it cannot collide with the active Administrator session
    if (isConfigured) {
      try {
        await supabase.auth.signOut({ scope: 'local' });
      } catch {}
    }

    const adminUser: User = {
      id: res.user?.id || 'usr-admin-01',
      email: res.user?.email || cleanEmail,
      fullName: res.user?.fullName || 'Executive Administrator',
      role: (res.user?.role || 'admin') as UserRole,
      isAdmin: res.user?.isAdmin !== undefined ? Boolean(res.user.isAdmin) : true,
      staffRole: res.user?.staffRole ?? 'super_admin',
      accountType: 'admin',
      kycStatus: 'verified',
      walletBalance: res.user?.balance ?? 0,
      investedBalance: 0,
      totalEarned: 0,
      createdAt: new Date().toISOString()
    };

    setSession(null);
    setUser(adminUser);
    setToken(res.token);
    setAuthToken(res.token);
    localStorage.setItem(CURRENT_USER_KEY, adminUser.id);
    localStorage.setItem(
      ADMIN_PROFILE_STORAGE_KEY,
      JSON.stringify({
        id: adminUser.id,
        email: adminUser.email,
        fullName: adminUser.fullName,
        createdAt: adminUser.createdAt,
      })
    );

    try {
      ledger.recordAuditLog(
        adminUser.id,
        adminUser.email,
        'LOGIN_SUCCESS',
        `Administrator ${adminUser.email} authenticated via server-verified credentials.`,
        'auth',
        'success',
        { targetUserId: adminUser.id, targetUserEmail: adminUser.email }
      );
    } catch (e) {}

    return adminUser;
  };

  // Atomically configure custom Administrator email & password from the Admin Gateway and establish session
  const customizeAdminCredentials = async (params: {
    currentEmail: string;
    currentPassword: string;
    newEmail: string;
    newPassword: string;
    fullName?: string;
  }): Promise<User> => {
    const res = await apiRequest<{
      success: boolean;
      token: string;
      user: any;
      error?: string;
    }>('/auth/admin-customize', {
      method: 'POST',
      body: {
        currentEmail: params.currentEmail.trim().toLowerCase(),
        currentPassword: params.currentPassword,
        newEmail: params.newEmail.trim().toLowerCase(),
        newPassword: params.newPassword,
        fullName: params.fullName?.trim() || 'Executive Administrator',
      },
      skipAuth: true,
    });

    if (!res.success || !res.token) {
      throw new Error(res.error || 'Unable to set custom administrator credentials.');
    }

    if (isConfigured) {
      try {
        await supabase.auth.signOut({ scope: 'local' });
      } catch {}
    }

    const adminUser: User = {
      id: res.user?.id || 'usr-admin-01',
      email: res.user?.email || params.newEmail.trim().toLowerCase(),
      fullName: res.user?.fullName || params.fullName?.trim() || 'Executive Administrator',
      role: 'admin',
      accountType: 'admin',
      kycStatus: 'verified',
      walletBalance: res.user?.balance ?? 0,
      investedBalance: 0,
      totalEarned: 0,
      createdAt: new Date().toISOString(),
    };

    setSession(null);
    setUser(adminUser);
    setToken(res.token);
    setAuthToken(res.token);
    localStorage.setItem(CURRENT_USER_KEY, adminUser.id);
    localStorage.setItem(
      ADMIN_PROFILE_STORAGE_KEY,
      JSON.stringify({
        id: adminUser.id,
        email: adminUser.email,
        fullName: adminUser.fullName,
        createdAt: adminUser.createdAt,
      })
    );

    try {
      ledger.recordAuditLog(
        adminUser.id,
        adminUser.email,
        'ADMIN_CREDENTIALS_UPDATED',
        `Custom administrator email (${adminUser.email}) and bcrypt password configured.`,
        'auth',
        'success',
        { targetUserId: adminUser.id, targetUserEmail: adminUser.email }
      );
    } catch (e) {}

    return adminUser;
  };

  const syncAdminSession = (newToken: string, updatedFields: { email: string; fullName?: string }) => {
    const cleanEmail = updatedFields.email.trim().toLowerCase();
    setToken(newToken);
    setAuthToken(newToken);
    setUser((prev) => {
      const nextUser: User = {
        id: prev?.id || 'usr-admin-01',
        email: cleanEmail,
        fullName: updatedFields.fullName?.trim() || prev?.fullName || 'Executive Administrator',
        role: 'admin',
        accountType: 'admin',
        kycStatus: 'verified',
        walletBalance: prev?.walletBalance ?? 0,
        investedBalance: prev?.investedBalance ?? 0,
        totalEarned: prev?.totalEarned ?? 0,
        createdAt: prev?.createdAt || new Date().toISOString(),
      };
      localStorage.setItem(CURRENT_USER_KEY, nextUser.id);
      localStorage.setItem(
        ADMIN_PROFILE_STORAGE_KEY,
        JSON.stringify({
          id: nextUser.id,
          email: nextUser.email,
          fullName: nextUser.fullName,
          createdAt: nextUser.createdAt,
        })
      );
      return nextUser;
    });
  };

  // Demo bypass has been decommissioned for strict platform security
  const quickDemoSession = async (role: 'investor' | 'admin', accountType?: AccountType): Promise<User> => {
    throw new Error('Authentication bypass has been decommissioned. Please log in with your verified credentials.');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        token,
        isAuthenticated: !!user,
        isAdmin: hasStaffAccess(user),
        isLoading,
        isConfigured,
        isRecoveryMode,
        setIsRecoveryMode,
        login,
        requestEmailLoginCode,
        verifyEmailLoginCode,
        adminLogin,
        customizeAdminCredentials,
        register,
        resendSignupConfirmation,
        logout,
        refreshUser,
        sendPasswordReset,
        updatePassword,
        updateUserEmail,
        updateUserPassword,
        changePassword,
        verifyMfaCode,
        quickDemoSession,
        syncAdminSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
