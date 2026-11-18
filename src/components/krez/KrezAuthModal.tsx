import React, { useEffect, useState } from 'react';
import { X, Eye, EyeOff, CheckCircle2, AlertCircle } from 'lucide-react';
import { useAuth } from '../../lib/auth';
import { useNavigation } from '../../lib/navigation';
import { getPasswordChecklist, isValidEmail } from '../../lib/validation';
import { monitoringApi } from '../../lib/api';
import { formatEmailCodeSendError, sanitizeErrorForMonitoring } from '../../lib/actionVerificationSession';

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
  const { login, requestEmailLoginCode, verifyEmailLoginCode, sendPasswordReset } = useAuth();
  const { navigateTo } = useNavigation();

  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<KrezAuthMode>('login');
  const [redirectTo, setRedirectTo] = useState<string | undefined>(undefined);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [useEmailCodeMode, setUseEmailCodeMode] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [emailCode, setEmailCode] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  const [consecutiveCodeFailures, setConsecutiveCodeFailures] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [offerRegister, setOfferRegister] = useState(false);
  const [offerLogin, setOfferLogin] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    const handleOpen = (ev: Event) => {
      const custom = ev as CustomEvent<{ mode?: KrezAuthMode; redirectTo?: string }>;
      if (custom.detail?.mode === 'register') {
        setIsOpen(false);
        navigateTo('/register');
        return;
      }
      setMode(custom.detail?.mode || 'login');
      setRedirectTo(custom.detail?.redirectTo);
      setError(null);
      setOfferRegister(false);
      setOfferLogin(false);
      setNotice(null);
      setShowPassword(false);
      setUseEmailCodeMode(false);
      setCodeSent(false);
      setEmailCode('');
      setConsecutiveCodeFailures(0);
      setIsOpen(true);
    };
    window.addEventListener(OPEN_AUTH_EVENT, handleOpen);
    return () => window.removeEventListener(OPEN_AUTH_EVENT, handleOpen);
  }, [navigateTo]);

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

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = window.setTimeout(() => setResendCooldown((prev) => Math.max(0, prev - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [resendCooldown]);

  if (!isOpen) return null;

  const switchMode = (nextMode: KrezAuthMode) => {
    if (nextMode === 'register') {
      setIsOpen(false);
      navigateTo('/register');
      return;
    }
    setMode(nextMode);
    setError(null);
    setOfferRegister(false);
    setOfferLogin(false);
    setNotice(null);
    setShowPassword(false);
    setUseEmailCodeMode(false);
    setCodeSent(false);
    setEmailCode('');
    setConsecutiveCodeFailures(0);
  };

  const handleRequestCode = async () => {
    if (busy || resendCooldown > 0 || consecutiveCodeFailures >= 2) return;
    const cleanEmail = email.trim();
    if (!isValidEmail(cleanEmail)) {
      setError('Please provide a valid email address.');
      return;
    }

    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const res = await requestEmailLoginCode(cleanEmail);
      setCodeSent(true);
      setConsecutiveCodeFailures(0);
      setResendCooldown(res.cooldownSeconds ?? 60);
      setNotice(
        res.maskedEmail
          ? `A 6-digit sign-in code was sent to ${res.maskedEmail}.`
          : 'A 6-digit sign-in code was sent to your registered email.'
      );
    } catch (err: any) {
      const nextFailures = consecutiveCodeFailures + 1;
      setConsecutiveCodeFailures(nextFailures);
      const { message, errorCode } = sanitizeErrorForMonitoring(err);
      void monitoringApi.logClientError({
        category: 'auth',
        eventType: 'LOGIN_EMAIL_CODE_SEND_FAILED',
        errorCode,
        message,
        scope: 'krez_auth_modal',
      });
      setError(formatEmailCodeSendError(err));
    } finally {
      setBusy(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    if (mode === 'register') {
      setIsOpen(false);
      navigateTo('/register');
      return;
    }
    setError(null);
    setOfferRegister(false);
    setOfferLogin(false);
    setNotice(null);

    const cleanEmail = email.trim();
    if (!isValidEmail(cleanEmail)) {
      setError('Please provide a valid email address.');
      return;
    }

    if (mode === 'login' && useEmailCodeMode) {
      if (!codeSent) {
        await handleRequestCode();
        return;
      }
      const cleanCode = emailCode.replace(/\D/g, '').slice(0, 6);
      if (cleanCode.length !== 6) {
        setError('Please enter the 6-digit code sent to your email.');
        return;
      }
      setBusy(true);
      try {
        await verifyEmailLoginCode(cleanEmail, cleanCode);
        setIsOpen(false);
        setPassword('');
        setEmailCode('');
        if (redirectTo) {
          navigateTo(redirectTo);
        }
      } catch (err: any) {
        const { message, errorCode } = sanitizeErrorForMonitoring(err);
        void monitoringApi.logClientError({
          category: 'auth',
          eventType: 'LOGIN_EMAIL_CODE_VERIFY_FAILED',
          errorCode,
          message,
          scope: 'krez_auth_modal',
        });
        setError('The security code is invalid or expired. Request a new code and try again.');
      } finally {
        setBusy(false);
      }
      return;
    }

    if (mode === 'login' && !password) {
      setError('Please enter your password.');
      return;
    }

    setBusy(true);
    try {
      if (mode === 'login') {
        await login(cleanEmail, password);
        setIsOpen(false);
        setPassword('');
        if (redirectTo) {
          navigateTo(redirectTo);
        }
      } else {
        await sendPasswordReset(cleanEmail);
        setNotice('If an account exists for that email, password reset instructions have been sent.');
      }
    } catch (err: any) {
      const rawMsg = String(err?.message || '');
      if (
        err?.code === 'INVALID_CREDENTIALS' ||
        err?.status === 401 ||
        /invalid login credentials|invalid email address or password|email or password|email not confirmed/i.test(rawMsg)
      ) {
        setError('Email or password is incorrect.');
      } else if (
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
        setError('Email or password is incorrect.');
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
          className="absolute top-4 right-4 flex min-h-[44px] min-w-[44px] items-center justify-center rounded-pill border border-border text-muted transition-colors duration-fast hover:border-foreground hover:text-foreground cursor-pointer"
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
            ? useEmailCodeMode
              ? 'Sign in using a one-time security code sent to your registered email.'
              : 'View your building shares, monthly rent distributions, and ledger statements.'
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
                className="mt-2 min-h-[44px] w-full rounded-input border border-border bg-white px-4 py-3 text-sm text-foreground focus:border-primary focus:outline-none"
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
              className="mt-2 min-h-[44px] w-full rounded-input border border-border bg-white px-4 py-3 text-sm text-foreground focus:border-primary focus:outline-none"
            />
          </div>

          {mode !== 'forgot' && !useEmailCodeMode && (
            <div>
              <div className="flex items-center justify-between gap-2">
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
                    className="inline-flex min-h-[44px] items-center px-1 text-xs font-medium text-muted underline underline-offset-4 hover:text-foreground cursor-pointer"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <div className="relative mt-1">
                <input
                  id="krez-auth-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={mode === 'register' ? 8 : undefined}
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="min-h-[44px] w-full rounded-input border border-border bg-white px-4 py-3 pr-12 text-sm text-foreground focus:border-primary focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute inset-y-0 right-0 flex min-h-[44px] min-w-[44px] items-center justify-center text-muted hover:text-foreground cursor-pointer"
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

          {mode === 'login' && useEmailCodeMode && codeSent && (
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
                className="mt-2 min-h-[44px] w-full rounded-input border border-border bg-white px-4 py-3 text-sm tracking-[0.35em] text-foreground focus:border-primary focus:outline-none"
              />
              <div className="mt-2 flex items-center justify-between gap-2">
                <p className="text-xs text-muted">The code expires in five minutes.</p>
                {consecutiveCodeFailures < 2 && (
                  <button
                    type="button"
                    disabled={busy || resendCooldown > 0}
                    onClick={() => void handleRequestCode()}
                    className="inline-flex min-h-[44px] items-center px-2 text-xs font-semibold text-foreground underline underline-offset-4 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
                  >
                    {resendCooldown > 0 ? `Resend code (${resendCooldown}s)` : 'Resend code'}
                  </button>
                )}
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2 rounded-input border border-red-300 bg-red-50 px-3.5 py-2.5 text-xs text-red-800" role="alert">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
              <div className="space-y-2">
                <p>{error}</p>
                {useEmailCodeMode && consecutiveCodeFailures >= 2 && (
                  <a
                    href="/contact"
                    onClick={(e) => {
                      e.preventDefault();
                      setIsOpen(false);
                      navigateTo('/contact');
                    }}
                    className="inline-flex min-h-[44px] items-center font-semibold underline underline-offset-4 text-red-900 hover:text-red-700"
                  >
                    Contact support
                  </a>
                )}
                {offerRegister && mode === 'login' && (
                  <button
                    type="button"
                    onClick={() => switchMode('register')}
                    className="inline-flex min-h-[44px] items-center font-semibold underline underline-offset-4 text-red-900 hover:text-red-700 cursor-pointer"
                  >
                    Create account with {email.trim() || 'this email'} →
                  </button>
                )}
                {offerLogin && mode === 'register' && (
                  <button
                    type="button"
                    onClick={() => switchMode('login')}
                    className="inline-flex min-h-[44px] items-center font-semibold underline underline-offset-4 text-red-900 hover:text-red-700 cursor-pointer"
                  >
                    Sign in with {email.trim() || 'this email'} →
                  </button>
                )}
              </div>
            </div>
          )}

          {notice && (
            <p className="rounded-input border border-emerald-300 bg-emerald-50 px-3.5 py-2.5 text-xs text-emerald-900" role="status">
              {notice}
            </p>
          )}

          <button
            type="submit"
            disabled={busy || (useEmailCodeMode && !codeSent && consecutiveCodeFailures >= 2)}
            className="min-h-[44px] w-full rounded-pill bg-primary px-6 py-3 text-sm font-medium text-white transition-transform duration-fast hover:scale-hover active:scale-active disabled:opacity-50 cursor-pointer"
          >
            {busy
              ? 'Please wait...'
              : mode === 'login'
              ? useEmailCodeMode
                ? (codeSent ? 'Verify code & sign in' : 'Send sign-in code')
                : 'Sign in'
              : mode === 'register'
              ? 'Create account'
              : 'Send reset link'}
          </button>

          {mode === 'login' && (
            <>
              <div className="relative flex items-center py-1" role="separator">
                <div className="flex-grow border-t border-border" />
                <span className="mx-3 shrink text-[11px] uppercase tracking-wider text-muted">or</span>
                <div className="flex-grow border-t border-border" />
              </div>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    setNotice(null);
                    setEmailCode('');
                    setCodeSent(false);
                    setConsecutiveCodeFailures(0);
                    setUseEmailCodeMode((prev) => !prev);
                  }}
                  className="inline-flex min-h-[44px] items-center justify-center px-3 text-xs font-medium text-foreground underline underline-offset-4 hover:text-accent cursor-pointer"
                >
                  {useEmailCodeMode ? 'Sign in with password instead' : 'Sign in with an email code instead'}
                </button>
              </div>
            </>
          )}
        </form>

        <div className="mt-6 flex items-center justify-between border-t border-border pt-4 text-xs text-muted">
          {mode === 'login' ? (
            <>
              <span>New to L’Agence?</span>
              <button
                type="button"
                onClick={() => switchMode('register')}
                className="inline-flex min-h-[44px] items-center px-2 font-semibold uppercase tracking-widest text-foreground hover:text-accent cursor-pointer"
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
                className="inline-flex min-h-[44px] items-center px-2 font-semibold uppercase tracking-widest text-foreground hover:text-accent cursor-pointer"
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
