import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole, AccountType } from '../types/user';
import { ledger } from './ledger';
import { supabase, isSupabaseConfigured, getAuthRedirectUrl } from './supabaseClient';
import { Session } from '@supabase/supabase-js';

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
  register: (email: string, pass: string, fullName: string, role?: UserRole, accountType?: AccountType) => Promise<RegisterResult>;
  logout: () => Promise<void>;
  refreshUser: () => void;
  sendPasswordReset: (email: string) => Promise<boolean>;
  updatePassword: (newPassword: string) => Promise<void>;
  quickDemoSession: (role: 'investor' | 'admin', accountType?: AccountType) => Promise<User>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const CURRENT_USER_KEY = 'rentallog_current_user_id';

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
    // Check if URL hash indicates Supabase recovery flow (#type=recovery or access_token)
    if (typeof window !== 'undefined') {
      const hash = window.location.hash;
      if (hash.includes('type=recovery') || hash.startsWith('#reset-password')) {
        setIsRecoveryMode(true);
      }
    }

    if (!isConfigured) {
      // If Supabase credentials are not yet configured in environment variables,
      // restore session only if a legitimate authenticated user was previously saved
      const storedId = localStorage.getItem(CURRENT_USER_KEY);
      if (storedId) {
        const found = ledger.getUserById(storedId);
        if (found) {
          setUser(found);
          setToken('sess_' + found.id);
        } else {
          setUser(null);
          setToken(null);
          localStorage.removeItem(CURRENT_USER_KEY);
        }
      } else {
        setUser(null);
        setToken(null);
      }
      setIsLoading(false);
      return;
    }

    // 1. Fetch active Supabase session
    supabase.auth
      .getSession()
      .then(({ data: { session: initialSession }, error }) => {
        if (error) {
          console.error('Error fetching Supabase session:', error.message);
        }
        if (initialSession?.user) {
          const synced = ledger.syncSupabaseUser(
            initialSession.user.id,
            initialSession.user.email || '',
            initialSession.user.user_metadata?.full_name || initialSession.user.email?.split('@')[0] || 'Investor',
            (initialSession.user.user_metadata?.role as UserRole) || 'investor',
            (initialSession.user.user_metadata?.account_type as AccountType) || undefined
          );
          setUser(synced);
          setSession(initialSession);
          setToken(initialSession.access_token);
          localStorage.setItem(CURRENT_USER_KEY, synced.id);
        } else {
          // No active Supabase session
          setUser(null);
          setSession(null);
          setToken(null);
          localStorage.removeItem(CURRENT_USER_KEY);
        }
      })
      .catch((err) => {
        console.error('Supabase getSession exception:', err);
      })
      .finally(() => {
        setIsLoading(false);
      });

    // 2. Subscribe to auth state changes (sign in, sign out, token refresh, password recovery)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsRecoveryMode(true);
      }

      if (currentSession?.user) {
        const synced = ledger.syncSupabaseUser(
          currentSession.user.id,
          currentSession.user.email || '',
          currentSession.user.user_metadata?.full_name || currentSession.user.email?.split('@')[0] || 'Investor',
          (currentSession.user.user_metadata?.role as UserRole) || 'investor',
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
      }

      setIsLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [isConfigured]);

  // Connect Login form to real Supabase email/password sign-in with local preview fallback
  const login = async (email: string, pass: string): Promise<User> => {
    if (!isConfigured) {
      const cleanEmail = email.trim().toLowerCase();
      let found = ledger.getUserByEmail(cleanEmail);
      if (!found) {
        found = ledger.createUser({
          email: cleanEmail,
          fullName: cleanEmail.split('@')[0],
          role: cleanEmail.includes('admin') ? 'admin' : 'investor'
        });
      }
      setUser(found);
      setToken('local_sess_' + found.id);
      localStorage.setItem(CURRENT_USER_KEY, found.id);
      return found;
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password: pass,
    });

    if (error) {
      if (error.message.toLowerCase().includes('email not confirmed')) {
        throw new Error(
          'Email not verified yet. Please check your inbox and verify your email before signing in.'
        );
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
      (data.user.user_metadata?.role as UserRole) || 'investor'
    );
    setUser(synced);
    setSession(data.session);
    setToken(data.session?.access_token || null);
    localStorage.setItem(CURRENT_USER_KEY, synced.id);
    return synced;
  };

  // Connect Register form to real Supabase account creation with user metadata and email verification
  const register = async (
    email: string,
    pass: string,
    fullName: string,
    role: UserRole = 'investor',
    accountType?: AccountType
  ): Promise<RegisterResult> => {
    const determinedAccountType: AccountType = accountType || (role as AccountType) || 'individual_investor';
    const determinedRole: UserRole = role === 'admin' || determinedAccountType === 'admin' ? 'admin' : 'investor';

    if (!isConfigured) {
      const cleanEmail = email.trim().toLowerCase();
      let existing = ledger.getUserByEmail(cleanEmail);
      if (existing) {
        throw new Error('An account with this email address already exists.');
      }
      const created = ledger.createUser({
        email: cleanEmail,
        fullName: fullName.trim() || cleanEmail.split('@')[0],
        role: determinedRole,
        accountType: determinedAccountType
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

    const redirectUrl = getAuthRedirectUrl('/#login');

    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password: pass,
      options: {
        data: {
          full_name: fullName.trim(),
          role: determinedRole,
          account_type: determinedAccountType,
        },
        emailRedirectTo: redirectUrl,
      },
    });

    if (error) {
      if (error.message.toLowerCase().includes('already registered')) {
        throw new Error('An account with this email address already exists. Please sign in instead.');
      }
      throw new Error(error.message);
    }

    if (!data.user) {
      throw new Error('Account registration failed. Please try again.');
    }

    // Check if user requires email verification
    const requiresVerification = !data.session;

    if (data.session) {
      const synced = ledger.syncSupabaseUser(
        data.user.id,
        data.user.email || email,
        fullName.trim(),
        role
      );
      setUser(synced);
      setSession(data.session);
      setToken(data.session.access_token);
      localStorage.setItem(CURRENT_USER_KEY, synced.id);
    }

    return {
      user: data.user,
      session: data.session,
      requiresVerification,
    };
  };

  // Working Sign Out action
  const logout = async (): Promise<void> => {
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
    localStorage.removeItem(CURRENT_USER_KEY);
  };

  // Send password reset email via Supabase recovery flow
  const sendPasswordReset = async (email: string): Promise<boolean> => {
    if (!isConfigured) {
      return true;
    }

    const redirectUrl = getAuthRedirectUrl('/#reset-password');
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: redirectUrl,
    });

    if (error) {
      throw new Error(error.message);
    }

    return true;
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

  // Local demo session switcher (strictly labeled as preview mock mode when keys are unconfigured)
  const quickDemoSession = async (role: 'investor' | 'admin', accountType?: AccountType): Promise<User> => {
    const demoEmail = role === 'admin' ? 'admin@kretz.com' : 'investor@kretz.com';
    const existing = ledger.getUserByEmail(demoEmail);
    if (!existing) {
      throw new Error('Demo account not found in local ledger.');
    }
    if (accountType) {
      existing.accountType = accountType;
    }
    setUser({ ...existing });
    setToken('local_preview_' + existing.id);
    localStorage.setItem(CURRENT_USER_KEY, existing.id);
    return existing;
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
        register,
        logout,
        refreshUser,
        sendPasswordReset,
        updatePassword,
        quickDemoSession,
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
