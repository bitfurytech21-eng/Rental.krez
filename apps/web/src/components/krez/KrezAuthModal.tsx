import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { useAuth } from '../../lib/auth';
import { useNavigation } from '../../lib/navigation';

export type KrezAuthMode = 'login' | 'register' | 'forgot';

const OPEN_AUTH_EVENT = 'krez:open-auth-modal';

export function openKrezAuthModal(mode: KrezAuthMode = 'login', redirectTo?: string) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent(OPEN_AUTH_EVENT, {
      detail: { mode, redirectTo },
    })
  );
}

export const KrezAuthModal: React.FC = () => {
  const { login, register, sendPasswordReset } = useAuth();
  const { navigateTo } = useNavigation();

  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<KrezAuthMode>('login');
  const [redirectTo, setRedirectTo] = useState<string | undefined>(undefined);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    const handleOpen = (ev: Event) => {
      const custom = ev as CustomEvent<{ mode?: KrezAuthMode; redirectTo?: string }>;
      setMode(custom.detail?.mode || 'login');
      setRedirectTo(custom.detail?.redirectTo);
      setError(null);
      setNotice(null);
      setIsOpen(true);
    };
    window.addEventListener(OPEN_AUTH_EVENT, handleOpen);
    return () => window.removeEventListener(OPEN_AUTH_EVENT, handleOpen);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  if (!isOpen) return null;

  const switchMode = (nextMode: KrezAuthMode) => {
    setMode(nextMode);
    setError(null);
    setNotice(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setError(null);
    setNotice(null);

    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setError('Please enter your email address.');
      return;
    }

    setBusy(true);
    try {
      if (mode === 'login') {
        if (!password) {
          setError('Please enter your password.');
          setBusy(false);
          return;
        }
        await login(cleanEmail, password);
        setIsOpen(false);
        setPassword('');
        if (redirectTo) {
          navigateTo(redirectTo);
        }
      } else if (mode === 'register') {
        const cleanName = fullName.trim();
        if (cleanName.length < 2) {
          setError('Please enter your full name.');
          setBusy(false);
          return;
        }
        if (password.length < 6) {
          setError('Password must be at least 6 characters.');
          setBusy(false);
          return;
        }
        const res = await register(cleanEmail, password, cleanName, 'investor', 'individual_investor');
        if (res.requiresVerification) {
          setNotice('Account created. Check your inbox to confirm your email address, or sign in once verified.');
          setMode('login');
        } else {
          setIsOpen(false);
          setPassword('');
          if (redirectTo) {
            navigateTo(redirectTo);
          } else {
            navigateTo('/portfolio');
          }
        }
      } else {
        await sendPasswordReset(cleanEmail);
        setNotice('If an account exists for that email, password reset instructions have been sent.');
      }
    } catch (err: any) {
      const rawMsg = String(err?.message || '');
      if (
        rawMsg.includes('405') ||
        rawMsg.includes('Method Not Allowed') ||
        rawMsg.includes('HTTP Error') ||
        rawMsg.includes('Failed to fetch') ||
        rawMsg.includes('NetworkError')
      ) {
        setError('Authentication service is currently unavailable. Please verify your credentials and try again.');
      } else {
        setError(rawMsg || 'Unable to complete request. Please check your details and try again.');
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/55 px-4 py-6 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="krez-auth-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) setIsOpen(false);
      }}
    >
      <div className="relative w-full max-w-md rounded-card border border-border bg-background p-card-pad shadow-2xl">
        <button
          type="button"
          onClick={() => setIsOpen(false)}
          aria-label="Close sign in dialog"
          className="absolute top-5 right-5 flex h-9 w-9 items-center justify-center rounded-pill border border-border text-muted transition-colors duration-fast hover:border-foreground hover:text-foreground cursor-pointer"
        >
          <X className="h-4 w-4" />
        </button>

        <p className="text-xs font-semibold tracking-widest uppercase text-accent">
          Investor access
        </p>
        <h2
          id="krez-auth-modal-title"
          className="mt-2 text-2xl font-heading font-bold tracking-tight uppercase text-foreground"
        >
          {mode === 'login'
            ? 'Sign in to L’Agence'
            : mode === 'register'
            ? 'Create investor account'
            : 'Reset password'}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          {mode === 'login'
            ? 'View your building shares, monthly rent distributions, and ledger statements.'
            : mode === 'register'
            ? 'Register once to subscribe to shares and receive monthly payouts on the ledger.'
            : 'Enter the email address registered to your account.'}
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {mode === 'register' && (
            <div>
              <label
                htmlFor="krez-auth-name"
                className="block text-xs font-semibold tracking-widest uppercase text-muted"
              >
                Full name
              </label>
              <input
                id="krez-auth-name"
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Alex Morgan"
                className="mt-2 w-full rounded-input border border-border bg-white px-4 py-3 text-sm text-foreground focus:border-primary focus:outline-none"
              />
            </div>
          )}

          <div>
            <label
              htmlFor="krez-auth-email"
              className="block text-xs font-semibold tracking-widest uppercase text-muted"
            >
              Email
            </label>
            <input
              id="krez-auth-email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@domain.com"
              className="mt-2 w-full rounded-input border border-border bg-white px-4 py-3 text-sm text-foreground focus:border-primary focus:outline-none"
            />
          </div>

          {mode !== 'forgot' && (
            <div>
              <div className="flex items-center justify-between">
                <label
                  htmlFor="krez-auth-password"
                  className="block text-xs font-semibold tracking-widest uppercase text-muted"
                >
                  Password
                </label>
                {mode === 'login' && (
                  <button
                    type="button"
                    onClick={() => switchMode('forgot')}
                    className="text-xs font-medium text-muted underline underline-offset-4 hover:text-foreground cursor-pointer"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <input
                id="krez-auth-password"
                type="password"
                required
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="mt-2 w-full rounded-input border border-border bg-white px-4 py-3 text-sm text-foreground focus:border-primary focus:outline-none"
              />
            </div>
          )}

          {error && (
            <p className="rounded-input border border-red-300 bg-red-50 px-3.5 py-2.5 text-xs text-red-800" role="alert">
              {error}
            </p>
          )}

          {notice && (
            <p className="rounded-input border border-emerald-300 bg-emerald-50 px-3.5 py-2.5 text-xs text-emerald-900" role="status">
              {notice}
            </p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-pill bg-primary px-6 py-3.5 text-sm font-medium text-white transition-transform duration-fast hover:scale-hover active:scale-active disabled:opacity-50 cursor-pointer"
          >
            {busy
              ? 'Please wait...'
              : mode === 'login'
              ? 'Sign in'
              : mode === 'register'
              ? 'Create account'
              : 'Send reset link'}
          </button>
        </form>

        <div className="mt-6 flex items-center justify-between border-t border-border pt-4 text-xs text-muted">
          {mode === 'login' ? (
            <>
              <span>New to L’Agence?</span>
              <button
                type="button"
                onClick={() => switchMode('register')}
                className="font-semibold uppercase tracking-widest text-foreground hover:text-accent cursor-pointer"
              >
                Create account
              </button>
            </>
          ) : (
            <>
              <span>Already hold an account?</span>
              <button
                type="button"
                onClick={() => switchMode('login')}
                className="font-semibold uppercase tracking-widest text-foreground hover:text-accent cursor-pointer"
              >
                Sign in
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
