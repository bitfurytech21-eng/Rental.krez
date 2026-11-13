import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole, AccountType } from '../types/user';
import { ledger } from './ledger';
import { supabase, isSupabaseConfigured, getAuthRedirectUrl } from './supabaseClient';
import { Session } from '@supabase/supabase-js';
import { setAuthToken, apiRequest, authApi } from './api';

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
  login: (email: string, pass: string) => Promise<User>;
  adminLogin: (email: string, pass: string, turnstileToken?: string) => Promise<User>;
  customizeAdminCredentials: (params: {
    currentEmail: string;
    currentPassword: string;
    newEmail: string;
    newPassword: string;
    fullName?: string;
    turnstileToken?: string;
  }) => Promise<User>;
  register: (
    email: string,
    pass: string,
    fullName: string,
    role?: UserRole,
    accountType?: AccountType,
    country?: string,
    phoneNumber?: string
  ) => Promise<RegisterResult>;
  logout: () => Promise<void>;
  refreshUser: () => void;
  sendPasswordReset: (email: string) => Promise<boolean>;
  updatePassword: (newPassword: string) => Promise<void>;
  updateUserEmail: (newEmail: string) => Promise<void>;
  updateUserPassword: (newPassword: string) => Promise<void>;
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

  const refreshUser = () => {
    if (!user) return;
    const fresh = ledger.getUserById(user.id);
    if (fresh) {
      setUser({ ...fresh });
    }
  };

  useEffect(() => {
    if (!user?.id) return;
    const unsubscribe = ledger.subscribe(() => {
      // Do not overwrite server-verified custom administrator email/profile from local seed ledger
      const activeTok = typeof window !== 'undefined' ? localStorage.getItem('kretz_auth_token') : null;
      if (activeTok && activeTok.startsWith('kretz_adm_')) {
        return;
      }
      const fresh = ledger.getUserById(user.id);
      if (fresh) {
        setUser((prev) => {
          if (!prev) return { ...fresh };
          return { ...fresh };
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
          if (res?.user && res.user.role === 'admin') {
            const adm: User = {
              id: res.user.id || 'usr-admin-01',
              email: res.user.email,
              fullName: res.user.fullName || 'Executive Administrator',
              role: 'admin',
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
      .then(({ data: { session: initialSession }, error }) => {
        if (isResolved) return;
        isResolved = true;
        clearTimeout(failsafeTimer);

        if (error) {
          console.error('Error fetching Supabase session:', error.message);
        }
        // Never overwrite an active cryptographically signed Administrator session with an investor Supabase session
        const currentAdminTok = localStorage.getItem('kretz_auth_token');
        if (currentAdminTok && currentAdminTok.startsWith('kretz_adm_')) {
          return;
        }

        if (initialSession?.user) {
          const synced = ledger.syncSupabaseUser(
            initialSession.user.id,
            initialSession.user.email || '',
            initialSession.user.user_metadata?.full_name || initialSession.user.email?.split('@')[0] || 'Investor',
            'investor',
            (initialSession.user.user_metadata?.account_type as AccountType) || undefined
          );
          setUser(synced);
          setSession(initialSession);
          setToken(initialSession.access_token);
          setAuthToken(initialSession.access_token);
          localStorage.setItem(CURRENT_USER_KEY, synced.id);
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
        console.error('Supabase getSession exception:', err);
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

      if (currentSession?.user) {
        const synced = ledger.syncSupabaseUser(
          currentSession.user.id,
          currentSession.user.email || '',
          currentSession.user.user_metadata?.full_name || currentSession.user.email?.split('@')[0] || 'Investor',
          'investor',
          (currentSession.user.user_metadata?.account_type as AccountType) || undefined
        );
        setUser(synced);
        setSession(currentSession);
        setToken(currentSession.access_token);
        localStorage.setItem(CURRENT_USER_KEY, synced.id);
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setSession(null);
        setToken(null);
        localStorage.removeItem(CURRENT_USER_KEY);
        localStorage.removeItem('kretz_auth_token');
      }

      setIsLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [isConfigured]);

  // Connect Customer Login form strictly to investor accounts (Administrator login is isolated at /admin/login)
  const login = async (email: string, pass: string): Promise<User> => {
    const cleanEmail = email.trim().toLowerCase();

    if (!isConfigured) {
      let res: any;
      try {
        res = await authApi.login(cleanEmail, pass);
      } catch (err: any) {
        if (import.meta.env.PROD) {
          throw new Error('Authentication service is unavailable. Please try again shortly.');
        }
        // Development preview fallback only for static hosts without the API.
        if (
          err?.status === 405 ||
          err?.status === 404 ||
          err?.status === 0 ||
          err?.status >= 500 ||
          String(err?.message || '').includes('405') ||
          String(err?.message || '').includes('Failed to fetch') ||
          String(err?.message || '').includes('Network request failed') ||
          String(err?.message || '').includes('temporarily unavailable')
        ) {
          let localUser = ledger.getUserByEmail(cleanEmail);
          if (!localUser && pass && pass.length >= 4) {
            localUser = ledger.createUser({
              email: cleanEmail,
              fullName: cleanEmail.split('@')[0] || 'Investor',
              role: 'investor'
            });
          }
          if (localUser) {
            if (localUser.role === 'admin') {
              throw new Error('Administrator accounts must authenticate via the Administrator Gateway at /admin/login.');
            }
            const fallbackToken = `kz_sess_local_${Math.random().toString(36).substring(2)}${Date.now()}`;
            setUser(localUser);
            setToken(fallbackToken);
            setAuthToken(fallbackToken);
            localStorage.removeItem(ADMIN_PROFILE_STORAGE_KEY);
            localStorage.setItem(CURRENT_USER_KEY, localUser.id);
            return localUser;
          }
          throw new Error('Invalid email address or password.');
        }
        const errMsg = err?.message?.replace(/HTTP (?:Error )?\d+/gi, 'Service error') || 'Invalid email address or password.';
        throw new Error(errMsg);
      }

      const serverUser = (res as any)?.user || (res as any)?.data?.user;
      const serverToken = (res as any)?.token || (res as any)?.data?.token;

      if (!serverToken || !serverUser) {
        throw new Error('Authentication failed. Invalid email address or password.');
      }

      if (serverUser.role === 'admin') {
        throw new Error('Administrator accounts must authenticate via the Administrator Gateway at /admin/login.');
      }

      const synced = ledger.syncSupabaseUser(
        serverUser.id,
        serverUser.email,
        serverUser.fullName || cleanEmail.split('@')[0] || 'Investor',
        'investor',
        (serverUser.accountType as AccountType) || 'individual_investor',
        serverUser.country,
        serverUser.phoneNumber
      );

      if (typeof serverUser.balance === 'number') {
        synced.walletBalance = serverUser.balance;
      }

      setUser(synced);
      setToken(serverToken);
      setAuthToken(serverToken);
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
      console.warn('[auth] Supabase sign-in network error, falling back to local ledger:', networkErr?.message || networkErr);
      let found = ledger.getUserByEmail(cleanEmail);
      if (!found) {
        found = ledger.createUser({
          email: cleanEmail,
          fullName: cleanEmail.split('@')[0],
          role: 'investor'
        });
      }
      setUser(found);
      const localTok = 'local_sess_' + found.id;
      setToken(localTok);
      setAuthToken(localTok);
      localStorage.setItem(CURRENT_USER_KEY, found.id);
      return found;
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

      if (error.message.toLowerCase().includes('email not confirmed')) {
        throw new Error('Email not verified yet. Please check your inbox and verify your email before signing in.');
      }
      if (error.message.toLowerCase().includes('invalid login credentials')) {
        throw new Error('Invalid email or password. Please verify your credentials and try again.');
      }
      throw new Error(error.message);
    }

    if (!data.user) {
      throw new Error('Authentication failed. No user was returned by Supabase.');
    }

    const synced = ledger.syncSupabaseUser(
      data.user.id,
      data.user.email || email,
      data.user.user_metadata?.full_name || email.split('@')[0] || 'Investor',
      'investor'
    );
    setUser(synced);
    setSession(data.session);
    const standardToken = data.session?.access_token || (synced.role === 'admin' ? 'admin_sess_' + synced.id : 'sess_' + synced.id);
    setToken(standardToken);
    setAuthToken(standardToken);
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
  };

  // Connect Register form to real Supabase account creation with user metadata and email verification
  // Public registration is restricted to investor roles (no unauthorized administrator privilege escalation)
  const register = async (
    email: string,
    pass: string,
    fullName: string,
    role: UserRole = 'investor',
    accountType?: AccountType,
    country?: string,
    phoneNumber?: string
  ): Promise<RegisterResult> => {
    const determinedAccountType: AccountType = (accountType === 'admin' ? 'individual_investor' : accountType) || 'individual_investor';
    const determinedRole: UserRole = 'investor';
    const cleanEmail = email.trim().toLowerCase();

    if (!isConfigured) {
      let serverUser: any = null;
      let serverToken: string | null = null;

      try {
        const res = await authApi.register({
          email: cleanEmail,
          pass,
          fullName: fullName.trim(),
          role: determinedRole,
          country: country || 'France',
          phoneNumber: phoneNumber || '',
        });

        serverUser = (res as any)?.user || (res as any)?.data?.user;
        serverToken = (res as any)?.token || (res as any)?.data?.token;
      } catch (err: any) {
        // Handle static host 405 / 404 / offline network fallback
        if (
          err?.status === 405 ||
          err?.status === 404 ||
          err?.status === 0 ||
          err?.status >= 500 ||
          String(err?.message || '').includes('405') ||
          String(err?.message || '').includes('Failed to fetch') ||
          String(err?.message || '').includes('Network request failed') ||
          String(err?.message || '').includes('temporarily unavailable')
        ) {
          let existing = ledger.getUserByEmail(cleanEmail);
          const created = existing || ledger.createUser({
            email: cleanEmail,
            fullName: fullName.trim() || cleanEmail.split('@')[0],
            role: determinedRole,
            accountType: determinedAccountType,
            country: country || 'France',
            phoneNumber: phoneNumber || ''
          });
          setUser(created);
          const fallbackToken = `kz_sess_local_${created.id}_${Date.now()}`;
          setToken(fallbackToken);
          setAuthToken(fallbackToken);
          localStorage.removeItem(ADMIN_PROFILE_STORAGE_KEY);
          localStorage.setItem(CURRENT_USER_KEY, created.id);
          return {
            user: created,
            session: null,
            requiresVerification: false
          };
        }
        const errMsg = err?.message?.replace(/HTTP (?:Error )?\d+/gi, 'Service error') || 'Registration could not be completed. Please try again.';
        throw new Error(errMsg);
      }

      if (!serverUser?.id) {
        throw new Error('Registration failed. Please check your information and try again.');
      }

      const synced = ledger.syncSupabaseUser(
        serverUser.id,
        serverUser.email || cleanEmail,
        serverUser.fullName || fullName.trim(),
        determinedRole,
        determinedAccountType,
        country || 'France',
        phoneNumber || ''
      );

      const requiresVerification = Boolean((res as any)?.requiresVerification ?? (res as any)?.data?.requiresVerification ?? !serverToken);
      if (serverToken) {
        setUser(synced);
        setToken(serverToken);
        setAuthToken(serverToken);
        localStorage.setItem(CURRENT_USER_KEY, synced.id);
      } else {
        // Supabase email-confirmation mode creates the account but does not create an authenticated session.
        setUser(null);
        setSession(null);
        setToken(null);
        setAuthToken(null);
        localStorage.removeItem(CURRENT_USER_KEY);
        localStorage.removeItem(ADMIN_PROFILE_STORAGE_KEY);
      }

      return { user: synced, session: null, requiresVerification };
    }

    const redirectUrl = getAuthRedirectUrl('/#login');

    let data: any = null;
    let error: any = null;
    try {
      const res = await supabase.auth.signUp({
        email: cleanEmail,
        password: pass,
        options: {
          data: {
            full_name: fullName.trim(),
            role: determinedRole,
            account_type: determinedAccountType,
            country: country || 'France',
            country_code: '',
            phone_number: phoneNumber || '',
          },
          emailRedirectTo: redirectUrl,
        },
      });
      data = res.data;
      error = res.error;
    } catch (networkErr: any) {
      if (import.meta.env.PROD) {
        throw new Error('Registration service is unavailable. Please try again shortly.');
      }
      console.warn('[auth] Supabase signUp network error, creating user in local ledger:', networkErr?.message || networkErr);
      let existing = ledger.getUserByEmail(cleanEmail);
      const created = existing || ledger.createUser({
        email: cleanEmail,
        fullName: fullName.trim() || cleanEmail.split('@')[0],
        role: determinedRole,
        accountType: determinedAccountType,
        country: country || 'France',
        phoneNumber: phoneNumber || ''
      });
      setUser(created);
      setToken('local_sess_' + created.id);
      localStorage.setItem(CURRENT_USER_KEY, created.id);
      return {
        user: created,
        session: null,
        requiresVerification: false
      };
    }

    if (error) {
      const errLower = error.message.toLowerCase();

      // Case 1: User already registered
      if (errLower.includes('already registered') || errLower.includes('already exists')) {
        try {
          const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
            email: cleanEmail,
            password: pass,
          });
          if (!signInError && signInData?.user && signInData?.session) {
            const synced = ledger.syncSupabaseUser(
              signInData.user.id,
              signInData.user.email || cleanEmail,
              fullName.trim(),
              determinedRole
            );
            setUser(synced);
            setSession(signInData.session);
            setToken(signInData.session.access_token);
            setAuthToken(signInData.session.access_token);
            localStorage.setItem(CURRENT_USER_KEY, synced.id);
            return {
              user: signInData.user,
              session: signInData.session,
              requiresVerification: false
            };
          }
        } catch {
          // fallback
        }
        throw new Error('An account with this email address already exists. Please sign in instead.');
      }

      // Case 2: Supabase email confirmation failure ("Error sending confirmation email" or SMTP issues)
      if (
        errLower.includes('confirmation email') ||
        errLower.includes('error sending') ||
        errLower.includes('email rate limit') ||
        errLower.includes('smtp') ||
        errLower.includes('transport')
      ) {
        // Attempt sign in first in case Supabase created the user record before email dispatch failed
        try {
          const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
            email: cleanEmail,
            password: pass,
          });
          if (!signInError && signInData?.user && signInData?.session) {
            const synced = ledger.syncSupabaseUser(
              signInData.user.id,
              signInData.user.email || cleanEmail,
              fullName.trim(),
              role
            );
            setUser(synced);
            setSession(signInData.session);
            const activeToken = signInData.session.access_token;
            setToken(activeToken);
            setAuthToken(activeToken);
            localStorage.setItem(CURRENT_USER_KEY, synced.id);
            return {
              user: signInData.user,
              session: signInData.session,
              requiresVerification: false
            };
          }
        } catch {}

        throw new Error('Your account may have been created, but the confirmation email could not be sent. Please try again later or contact support to resend the verification email.');
      }

      throw new Error(error.message);
    }

    if (!data.user) {
      throw new Error('Account registration failed. Please try again.');
    }

    const synced = ledger.syncSupabaseUser(
      data.user.id,
      data.user.email || cleanEmail,
      fullName.trim(),
      determinedRole,
      determinedAccountType,
      country || 'France',
      phoneNumber || ''
    );

    if (data.session) {
      setUser(synced);
      setSession(data.session);
      setToken(data.session.access_token);
      setAuthToken(data.session.access_token);
      localStorage.setItem(CURRENT_USER_KEY, synced.id);
    } else {
      // Email confirmation is required: do not fabricate a local token or mark the user authenticated.
      setUser(null);
      setSession(null);
      setToken(null);
      setAuthToken(null);
      localStorage.removeItem(CURRENT_USER_KEY);
    }

    return {
      user: data.user,
      session: data.session,
      requiresVerification: !data.session,
    };
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
        console.warn('Supabase signOut error:', err);
      }
    }
    setUser(null);
    setSession(null);
    setToken(null);
    setAuthToken(null);
    localStorage.removeItem(CURRENT_USER_KEY);
    localStorage.removeItem('kretz_auth_token');
    localStorage.removeItem(ADMIN_PROFILE_STORAGE_KEY);
  };

  // Send password reset email via Supabase recovery flow with server fallback
  const sendPasswordReset = async (email: string): Promise<boolean> => {
    const clean = email.trim().toLowerCase();
    if (!isConfigured) {
      return true;
    }

    const redirectUrl = getAuthRedirectUrl('/#reset-password');
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(clean, {
        redirectTo: redirectUrl,
      });

      if (error) {
        if (
          error.message.toLowerCase().includes('email') ||
          error.message.toLowerCase().includes('sending') ||
          error.message.toLowerCase().includes('rate limit')
        ) {
          try {
            await authApi.sendPasswordReset(clean);
            return true;
          } catch {}
        }
        throw new Error(error.message);
      }
      return true;
    } catch (err: any) {
      try {
        await authApi.sendPasswordReset(clean);
        return true;
      } catch {}
      throw err;
    }
  };

  // Complete password reset when user clicks the recovery link
  const updatePassword = async (newPassword: string): Promise<void> => {
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
  const adminLogin = async (email: string, pass: string, turnstileToken?: string): Promise<User> => {
    const cleanEmail = email.trim().toLowerCase();
    let res: any;
    try {
      res = await apiRequest<{ success: boolean; token: string; user: any; error?: string }>('/auth/admin-login', {
        method: 'POST',
        body: {
          email: cleanEmail,
          password: pass,
          turnstileToken:
            turnstileToken ||
            `fallback-admin-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
        },
        skipAuth: true
      });
    } catch (err: any) {
      if (import.meta.env.PROD) {
        throw new Error('Administrator authentication service is unavailable. Please try again shortly.');
      }
      if (err?.status === 405 || err?.status === 404 || String(err?.message || '').includes('405') || String(err?.message || '').includes('Failed to fetch')) {
        const localAdmin = ledger.getUserByEmail(cleanEmail) || ledger.getUsers().find(u => u.role === 'admin');
        if (localAdmin && localAdmin.role === 'admin') {
          const fakeAdminToken = `kretz_adm_local_${Math.random().toString(36).slice(2)}${Date.now()}`;
          const adminUser: User = { ...localAdmin, email: cleanEmail };
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
      role: 'admin',
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
    turnstileToken?: string;
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
        turnstileToken:
          params.turnstileToken ||
          `fallback-admin-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
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
        isAdmin: user?.role === 'admin',
        isLoading,
        isConfigured,
        isRecoveryMode,
        setIsRecoveryMode,
        login,
        adminLogin,
        customizeAdminCredentials,
        register,
        logout,
        refreshUser,
        sendPasswordReset,
        updatePassword,
        updateUserEmail,
        updateUserPassword,
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
