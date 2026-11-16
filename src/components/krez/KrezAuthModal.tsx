import React, { useEffect, useState } from 'react';
import { X, Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../lib/auth';
import { useNavigation } from '../../lib/navigation';
import { getPasswordChecklist, isValidEmail, isValidPassword } from '../../lib/validation';

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
  const [showPassword, setShowPassword] = useState(false);
  const [emailCode, setEmailCode] = useState('');
  const [requiresEmailCode, setRequiresEmailCode] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [offerRegister, setOfferRegister] = useState(false);
  const [offerLogin, setOfferLogin] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    const handleOpen = (ev: Event) => {
      const custom = ev as CustomEvent<{ mode?: KrezAuthMode; redirectTo?: string }>;
      setMode(custom.detail?.mode || 'login');
      setRedirectTo(custom.detail?.redirectTo);
      setError(null);
      setOfferRegister(false);
      setOfferLogin(false);
      setNotice(null);
      setShowPassword(false);
      setEmailCode('');
      setRequiresEmailCode(false);
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
    setOfferRegister(false);
    setOfferLogin(false);
    setNotice(null);
    setShowPassword(false);
    setEmailCode('');
    setRequiresEmailCode(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setError(null);
    setOfferRegister(false);
    setOfferLogin(false);
    setNotice(null);

    const cleanEmail = email.trim();
    if (!isValidEmail(cleanEmail)) {
      setError('Please provide a valid email address.');
      return;
    }

    if (mode === 'login' && !password) {
      setError('Please enter your password.');
      return;
    }
    if (mode === 'register') {
      const cleanName = fullName.trim();
      if (cleanName.length < 2) {
        setError('Please enter your full name.');
        return;
      }
      const passCheck = isValidPassword(password);
      if (!passCheck.valid) {
        setError(passCheck.reason || 'Password must be at least 8 characters with uppercase, lowercase, and a number.');
        return;
      }
    }

    setBusy(true);
    try {
      if (mode === 'login') {
        await login(cleanEmail, password, emailCode || undefined);
        setIsOpen(false);
        setPassword('');
        if (redirectTo) {
          navigateTo(redirectTo);
        }
      } else if (mode === 'register') {
        const cleanName = fullName.trim();
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
      if (err?.code === 'EMAIL_CODE_REQUIRED') {
        setRequiresEmailCode(true);
        setNotice(err?.message || 'A six-digit security code has been sent to your email address.');
        setError(null);
        return;
      }
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
        setOfferRegister(err?.code === 'ACCOUNT_NOT_FOUND_DEV');
        setOfferLogin(
          err?.code === 'EMAIL_ALREADY_EXISTS' ||
          /already exists|already registered/i.test(rawMsg)
        );
        setError(rawMsg || 'Unable to complete request. Please check your details and try again.');
      }
    } finally {
      setBusy(false);
    }
  };

  const passChecks = getPasswordChecklist(password);

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
      <div className="relative w-full max-w-md max-h-[90vh] overflow-y-auto rounded-card border border-border bg-background p-card-pad shadow-2xl">
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

        <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-4">
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
              <div className="relative mt-2">
                <input
                  id="krez-auth-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={mode === 'register' ? 8 : undefined}
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-input border border-border bg-white px-4 py-3 pr-11 text-sm text-foreground focus:border-primary focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute inset-y-0 right-2 flex items-center px-2 text-muted hover:text-foreground cursor-pointer"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {mode === 'register' && (
                <div className="mt-2 grid grid-cols-2 gap-1.5 text-[11px]">
                  {[
                    { ok: passChecks.minLength, label: '8+ characters' },
                    { ok: passChecks.hasUpper, label: 'Uppercase (A–Z)' },
                    { ok: passChecks.hasLower, label: 'Lowercase (a–z)' },
                    { ok: passChecks.hasDigit, label: 'Number (0–9)' },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className={`flex items-center gap-1.5 ${item.ok ? 'text-emerald-700 font-medium' : 'text-muted'}`}
                    >
                      <CheckCircle2 className={`h-3.5 w-3.5 shrink-0 ${item.ok ? 'text-emerald-600' : 'text-muted/50'}`} />
                      <span>{item.label}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {mode === 'login' && requiresEmailCode && (
            <div>
              <label htmlFor="krez-auth-email-code" className="block text-xs font-semibold tracking-widest uppercase text-muted">
                Email security code
              </label>
              <input
                id="krez-auth-email-code"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]{6}"
                maxLength={6}
                required
                value={emailCode}
                onChange={(e) => setEmailCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="Enter 6-digit code"
                className="mt-2 w-full rounded-input border border-border bg-white px-4 py-3 text-sm tracking-[0.35em] text-foreground focus:border-primary focus:outline-none"
              />
              <p className="mt-1 text-xs text-muted">The code expires in five minutes.</p>
            </div>
          )}

          {error && (
            <div className="rounded-input border border-red-300 bg-red-50 px-3.5 py-2.5 text-xs text-red-800 space-y-2" role="alert">
              <p>{error}</p>
              {offerRegister && mode === 'login' && (
                <button
                  type="button"
                  onClick={() => switchMode('register')}
                  className="inline-flex items-center font-semibold underline underline-offset-4 text-red-900 hover:text-red-700 cursor-pointer"
                >
                  Create account with {email.trim() || 'this email'} →
                </button>
              )}
              {offerLogin && mode === 'register' && (
                <button
                  type="button"
                  onClick={() => switchMode('login')}
                  className="inline-flex items-center font-semibold underline underline-offset-4 text-red-900 hover:text-red-700 cursor-pointer"
                >
                  Sign in with {email.trim() || 'this email'} →
                </button>
              )}
            </div>
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
              ? (requiresEmailCode ? 'Verify code & sign in' : 'Continue with email code')
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
