import React, { useState, useEffect } from 'react';
import { useAuth } from '../../lib/auth';
import { getPasswordChecklist, isValidEmail, isValidPassword } from '../../lib/validation';
import { safeErrorMessage } from '../../lib/safeErrorMessage';
import { Property } from '../../types/property';
import { formatCurrency } from '../../lib/utils';
import {
  Shield,
  ShieldCheck,
  ArrowRight,
  CheckCircle2,
  Mail,
  KeyRound,
  AlertCircle,
  Lock,
  ExternalLink,
  Info,
  Tag,
  Gift,
  Eye,
  EyeOff
} from 'lucide-react';
import { ledger } from '../../lib/ledger';
import { monitoringApi } from '../../lib/api';
import { formatEmailCodeSendError, sanitizeErrorForMonitoring } from '../../lib/actionVerificationSession';
import authLuxuryKeyBg from '../../assets/images/auth_luxury_key_1794021673223.jpg';

interface AuthPageProps {
  initialMode?: 'login' | 'register' | 'forgot-password' | 'reset-password';
  preservedProperty?: Property | null;
  onSuccess: () => void;
  onNavigateMode: (mode: 'login' | 'register' | 'forgot-password' | 'reset-password') => void;
}

export const AuthPages: React.FC<AuthPageProps> = ({
  initialMode = 'login',
  preservedProperty,
  onSuccess,
  onNavigateMode,
}) => {
  const {
    login,
    requestEmailLoginCode,
    verifyEmailLoginCode,
    register,
    resendSignupConfirmation,
    sendPasswordReset,
    updatePassword,
    isRecoveryMode,
    setIsRecoveryMode
  } = useAuth();

  const [mode, setMode] = useState<'login' | 'register' | 'forgot-password' | 'reset-password'>(
    isRecoveryMode ? 'reset-password' : initialMode
  );

  useEffect(() => {
    setShowPassword(false);
    if (isRecoveryMode) {
      setMode('reset-password');
    } else if (initialMode) {
      setMode(initialMode);
    }
  }, [initialMode, isRecoveryMode]);

  // Form states
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [emailCode, setEmailCode] = useState('');
  const [useEmailCodeLogin, setUseEmailCodeLogin] = useState(false);
  const [loginCodeSent, setLoginCodeSent] = useState(false);
  const [codeSendCooldown, setCodeSendCooldown] = useState(0);
  const [consecutiveCodeFailures, setConsecutiveCodeFailures] = useState(0);
  const [codeNotice, setCodeNotice] = useState<string | null>(null);
  const [referralCode, setReferralCode] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return (params.get('ref') || params.get('referral') || '').toUpperCase();
    }
    return '';
  });

  // Status states
  const [error, setError] = useState<string | null>(null);
  const [offerRegister, setOfferRegister] = useState(false);
  const [offerLogin, setOfferLogin] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [verificationPending, setVerificationPending] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [acceptedRisk, setAcceptedRisk] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [passwordResetSuccess, setPasswordResetSuccess] = useState(false);
  const [failedLoginAttempts, setFailedLoginAttempts] = useState(() => {
    try { return Number(sessionStorage.getItem('auth_login_failed_attempts') || 0); } catch { return 0; }
  });
  const [loginCooldown, setLoginCooldown] = useState(() => {
    try {
      const until = Number(sessionStorage.getItem('auth_login_lock_until') || 0);
      return Math.max(0, Math.ceil((until - Date.now()) / 1000));
    } catch { return 0; }
  });

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = window.setTimeout(() => setResendCooldown((seconds) => Math.max(0, seconds - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [resendCooldown]);

  useEffect(() => {
    if (codeSendCooldown <= 0) return;
    const timer = window.setTimeout(() => setCodeSendCooldown((seconds) => Math.max(0, seconds - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [codeSendCooldown]);

  useEffect(() => {
    if (loginCooldown <= 0) return;
    const timer = window.setTimeout(() => setLoginCooldown((seconds) => Math.max(0, seconds - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [loginCooldown]);

  useEffect(() => {
    if (loginCooldown === 0) {
      try { sessionStorage.removeItem('auth_login_lock_until'); } catch {}
    }
  }, [loginCooldown]);

  const switchMode = (newMode: 'login' | 'register' | 'forgot-password' | 'reset-password') => {
    setError(null);
    setOfferRegister(false);
    setOfferLogin(false);
    setShowPassword(false);
    setResetSent(false);
    setPasswordResetSuccess(false);
    setEmailCode('');
    setUseEmailCodeLogin(false);
    setLoginCodeSent(false);
    setConsecutiveCodeFailures(0);
    setCodeNotice(null);
    setMode(newMode);
    onNavigateMode(newMode);
  };

  const handleRequestLoginCode = async () => {
    if (loading || codeSendCooldown > 0 || consecutiveCodeFailures >= 2) return;
    setError(null);
    setCodeNotice(null);
    if (!isValidEmail(email)) {
      setError('Please provide a valid email address.');
      return;
    }
    setLoading(true);
    try {
      const res = await requestEmailLoginCode(email);
      setLoginCodeSent(true);
      setConsecutiveCodeFailures(0);
      setCodeSendCooldown(res.cooldownSeconds ?? 60);
      setCodeNotice(
        res.maskedEmail
          ? `A 6-digit security code has been sent to ${res.maskedEmail}.`
          : 'A 6-digit security code has been sent to your registered email.'
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
        scope: 'auth_pages',
      });
      setError(formatEmailCodeSendError(err));
    } finally {
      setLoading(false);
    }
  };

  // Real Email/Password Login (with optional alternative email-code login mode)
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setError(null);
    setOfferRegister(false);
    setOfferLogin(false);
    if (loginCooldown > 0) {
      setError(`Please wait ${loginCooldown} seconds before trying again.`);
      return;
    }
    if (!isValidEmail(email)) {
      setError('Please provide a valid email address.');
      return;
    }

    if (useEmailCodeLogin) {
      if (!loginCodeSent) {
        await handleRequestLoginCode();
        return;
      }
      const cleanCode = emailCode.replace(/\D/g, '').slice(0, 6);
      if (cleanCode.length !== 6) {
        setError('Please enter the 6-digit security code sent to your email.');
        return;
      }
      setLoading(true);
      try {
        await verifyEmailLoginCode(email, cleanCode);
        setFailedLoginAttempts(0);
        setLoginCooldown(0);
        try { sessionStorage.removeItem('auth_login_failed_attempts'); sessionStorage.removeItem('auth_login_lock_until'); } catch {}
        onSuccess();
      } catch (err: any) {
        const { message, errorCode } = sanitizeErrorForMonitoring(err);
        void monitoringApi.logClientError({
          category: 'auth',
          eventType: 'LOGIN_EMAIL_CODE_VERIFY_FAILED',
          errorCode,
          message,
          scope: 'auth_pages',
        });
        setError('The security code is invalid or expired. Request a new code and try again.');
      } finally {
        setLoading(false);
      }
      return;
    }

    if (!password) {
      setError('Please enter your password.');
      return;
    }
    setLoading(true);
    try {
      await login(email, password);
      setFailedLoginAttempts(0);
      setLoginCooldown(0);
      try { sessionStorage.removeItem('auth_login_failed_attempts'); sessionStorage.removeItem('auth_login_lock_until'); } catch {}
      onSuccess();
    } catch (err: any) {
      const msg = String(err?.message || '');
      if (
        err?.code === 'INVALID_CREDENTIALS' ||
        err?.status === 401 ||
        /invalid login credentials|invalid email address or password|email or password|email not confirmed/i.test(msg)
      ) {
        const nextAttempts = failedLoginAttempts + 1;
        setFailedLoginAttempts(nextAttempts);
        try { sessionStorage.setItem('auth_login_failed_attempts', String(nextAttempts)); } catch {}
        if (nextAttempts >= 5) {
          const lockUntil = Date.now() + 30_000;
          setLoginCooldown(30);
          setFailedLoginAttempts(0);
          try {
            sessionStorage.setItem('auth_login_failed_attempts', '0');
            sessionStorage.setItem('auth_login_lock_until', String(lockUntil));
          } catch {}
          setError('Email or password is incorrect. Please wait 30 seconds before trying again.');
        } else {
          setError('Email or password is incorrect.');
        }
      } else {
        setError('Authentication service is currently unavailable. Please try again shortly.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Real Account Registration
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setOfferLogin(false);
    const cleanName = fullName.trim();
    if (cleanName.length < 2) {
      setError('Full legal name must contain at least 2 characters.');
      return;
    }
    if (!isValidEmail(email)) {
      setError('Please provide a valid email address.');
      return;
    }
    if (password.length < 12) {
      setError('Password must be at least 12 characters long.');
      return;
    }
    const passCheck = isValidPassword(password);
    if (!passCheck.valid) {
      setError(passCheck.reason || 'Please choose a stronger password.');
      return;
    }
    if (!acceptedTerms || !acceptedRisk) {
      setError('Please accept both required acknowledgements before creating your account.');
      return;
    }

    setLoading(true);
    try {
      const result = await register(email, password, cleanName, acceptedTerms, acceptedRisk);

      if (referralCode) {
        try {
          ledger.logAudit(
            result.user?.id || 'new-user',
            email,
            'REFERRAL_APPLIED',
            `Investor registered using referral code ${referralCode}. €500 Welcome Allocation bonus queued.`
          );
        } catch {}
      }

      if (result.requiresVerification) {
        setVerificationPending(true);
        setResendCooldown(60);
      } else {
        onSuccess();
      }
    } catch (err: any) {
      const msg = String(err?.message || '');
      if (msg.includes('405') || msg.includes('HTTP Error') || msg.includes('Method Not Allowed')) {
        setError('Registration service is currently unavailable. Please try again.');
      } else {
        setOfferLogin(
          err?.code === 'EMAIL_ALREADY_EXISTS' ||
          /already exists|already registered/i.test(msg)
        );
        setError('Registration failed. Please check your information.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResendConfirmation = async () => {
    if (resendCooldown > 0 || loading) return;
    setError(null);
    setLoading(true);
    try {
      await resendSignupConfirmation(email);
      setResendCooldown(60);
    } catch (err: any) {
      setError(safeErrorMessage(err, 'Could not resend the confirmation email. Please try again later.'));
    } finally {
      setLoading(false);
    }
  };

  const handleResetRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!isValidEmail(email)) {
      setError('Please provide a valid email address.');
      return;
    }

    setLoading(true);
    try {
      await sendPasswordReset(email);
    } catch {
      // Keep the response identical whether the address exists or delivery cannot be confirmed.
    } finally {
      setResetSent(true);
      setLoading(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 12) {
      setError('New password must be at least 12 characters long.');
      return;
    }
    const passCheck = isValidPassword(password);
    if (!passCheck.valid) {
      setError(passCheck.reason || 'Choose a stronger password.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      await updatePassword(password);
      setPasswordResetSuccess(true);
      setIsRecoveryMode(false);
    } catch (err: any) {
      setError(safeErrorMessage(err, 'Failed to update password.'));
    } finally {
      setLoading(false);
    }
  };

  const passChecks = getPasswordChecklist(password);
  const passwordStrength = [passChecks.minLength, passChecks.hasUpper, passChecks.hasLower, passChecks.hasDigit].filter(Boolean).length;
  const passwordStrengthLabel = password.length === 0 ? 'Not entered' : passwordStrength <= 1 ? 'Weak' : passwordStrength <= 3 ? 'Fair' : 'Strong';

  return (
    <div className="py-10 sm:py-12 px-4 sm:px-6 bg-[#070A11] min-h-[calc(100vh-160px)] flex items-center justify-center text-white relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#315FEA]/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-4xl w-full bg-[#0E131F]/90 rounded-3xl border border-white/10 shadow-2xl overflow-hidden grid grid-cols-1 lg:grid-cols-12 relative z-10 backdrop-blur-md">
        {/* Left Side Decorative Photography Panel */}
        <div 
          className="hidden lg:flex lg:col-span-5 relative flex-col justify-between p-8 bg-cover bg-center border-r border-white/10 overflow-hidden"
          style={{ backgroundImage: `linear-gradient(to bottom, rgba(14, 19, 31, 0.65), rgba(14, 19, 31, 0.95)), url(${authLuxuryKeyBg})` }}
        >
          <div className="space-y-2 relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/15 backdrop-blur-sm text-[10px] font-mono font-bold text-emerald-400">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>INSTITUTIONAL GRADE SECURITY</span>
            </div>
            <h3 className="text-xl font-black text-white leading-tight">
              Ring-Fenced Real Estate Tokenization
            </h3>
          </div>

          <div className="space-y-3 relative z-10 text-xs text-slate-300">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#34D399] shrink-0" />
              <span>Direct RICS appraised asset custody</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#34D399] shrink-0" />
              <span>Independent Special Purpose Vehicles</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#34D399] shrink-0" />
              <span>Automated monthly dividend distribution</span>
            </div>
          </div>

          <div className="pt-4 border-t border-white/10 text-[10px] font-mono text-slate-400">
            L'AGENCE | KRETZ & DE SPAIN · REGULATED SPV
          </div>
        </div>

        {/* Right Side Form Panel */}
        <div className="lg:col-span-7 p-7 sm:p-9">
          {/* Preserved Property Banner */}
          {preservedProperty && (
            <div className="mb-6 p-4 rounded-2xl bg-[#0B1B30] border border-[#1D3860] flex items-center gap-3 text-xs text-white">
              <div className="w-12 h-12 rounded-xl overflow-hidden bg-[#102442] shrink-0 border border-[#1D3860]">
                <img
                  src={preservedProperty.images[0] || preservedProperty.bannerImage}
                  alt={preservedProperty.title}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-[10px] uppercase font-bold text-[#C5A880] block">
                  Preserved Investment Selection
                </span>
                <h4 className="font-bold text-white truncate">{preservedProperty.title}</h4>
                <span className="text-[#8EA7C7] text-[11px]">
                  Min: {formatCurrency(preservedProperty.minimumInvestment)} · {preservedProperty.city}
                </span>
              </div>
            </div>
          )}

          {/* Brand Header */}
          <div className="text-center mb-6">
            <img 
              src="/assets/aistudio/IMG_7234_bd44519a.jpeg" 
              alt="L'Agence Logo" 
              className="w-12 h-12 rounded-2xl object-cover mx-auto mb-3 shadow-md border border-[#1D3860]"
              style={{ filter: 'brightness(1.35) contrast(1.22) saturate(1.1)' }}
            />
            <h2 className="text-2xl font-black text-white">
              {mode === 'login' && (preservedProperty ? 'Sign In to Complete Investment' : "Welcome to L'Agence Real Estate")}
              {mode === 'register' && (preservedProperty ? 'Register to Invest in Asset' : 'Create Investor Account')}
              {mode === 'forgot-password' && 'Password Recovery'}
              {mode === 'reset-password' && 'Set New Password'}
            </h2>
            <p className="text-xs text-[#8EA7C7] mt-1.5 leading-relaxed">
              {mode === 'login' && 'Sign in using your verified email and password'}
              {mode === 'register' && 'Institutional real estate tokenization platform. Identity verification required.'}
              {mode === 'forgot-password' && 'Enter your registered email to receive a secure recovery link.'}
              {mode === 'reset-password' && 'Enter your new password below to regain access to your account.'}
            </p>
          </div>

          {error && (
            <div className="p-3.5 mb-5 rounded-2xl bg-red-950/70 text-red-200 text-xs font-semibold border border-red-500/40 flex items-start gap-2.5" role="alert">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <div className="flex-1 space-y-2">
                <span className="leading-relaxed block">{error}</span>
                {useEmailCodeLogin && consecutiveCodeFailures >= 2 && (
                  <a
                    href="/contact"
                    className="inline-flex min-h-[44px] items-center text-xs font-bold text-[#C5A880] underline underline-offset-4 hover:text-white"
                  >
                    Contact support
                  </a>
                )}
                {offerRegister && mode === 'login' && (
                  <button
                    type="button"
                    onClick={() => switchMode('register')}
                    className="inline-flex min-h-[44px] items-center text-xs font-bold text-[#C5A880] underline underline-offset-4 hover:text-white cursor-pointer"
                  >
                    Register with {email.trim() || 'this email'} →
                  </button>
                )}
                {offerLogin && mode === 'register' && (
                  <button
                    type="button"
                    onClick={() => switchMode('login')}
                    className="inline-flex min-h-[44px] items-center text-xs font-bold text-[#C5A880] underline underline-offset-4 hover:text-white cursor-pointer"
                  >
                    Sign in with {email.trim() || 'this email'} →
                  </button>
                )}
              </div>
            </div>
          )}

          {codeNotice && mode === 'login' && (
            <div role="status" className="p-3.5 mb-5 rounded-2xl bg-emerald-950/60 text-emerald-200 text-xs font-medium border border-emerald-500/30">
              {codeNotice}
            </div>
          )}

          {/* Navigation Tabs: Sign In / Register Portal */}
          {(mode === 'login' || mode === 'register') && (
            <div className="grid grid-cols-2 p-1.5 bg-[#0B1B30] rounded-2xl mb-6 border border-[#1D3860]">
              <button
                type="button"
                onClick={() => switchMode('login')}
                className={`min-h-[44px] py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  mode === 'login'
                    ? 'bg-[#C5A880] text-[#1A1A1A] shadow-md font-black'
                    : 'text-[#8EA7C7] hover:text-white'
                }`}
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Sign In</span>
              </button>
              <button
                type="button"
                onClick={() => switchMode('register')}
                className={`min-h-[44px] py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  mode === 'register'
                    ? 'bg-[#C5A880] text-[#1A1A1A] shadow-md font-black'
                    : 'text-[#8EA7C7] hover:text-white'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Register Account</span>
              </button>
            </div>
          )}

          {/* 1. LOGIN FORM */}
          {mode === 'login' && (
            <form onSubmit={handleLogin} noValidate className="space-y-4">
              <div className="form-field space-y-1">
                <label htmlFor="login-email" className="text-xs font-bold text-[#C5A880] uppercase tracking-wider block">Email Address</label>
                <input
                  id="login-email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="min-h-[44px] w-full text-xs bg-[#0B1B30] border border-[#1D3860] rounded-xl px-3.5 py-3 font-medium text-white placeholder-[#8EA7C7] focus:outline-none focus:border-[#C5A880]"
                />
              </div>

              {!useEmailCodeLogin && (
                <div className="form-field space-y-1">
                  <div className="flex justify-between items-center">
                    <label htmlFor="login-password" className="text-xs font-bold text-[#C5A880] uppercase tracking-wider block">Password</label>
                    <button
                      type="button"
                      onClick={() => switchMode('forgot-password')}
                      className="inline-flex min-h-[44px] items-center px-1 text-[11px] font-bold text-[#C5A880] hover:underline cursor-pointer"
                    >
                      Forgot Password?
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      id="login-password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      autoComplete="current-password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="min-h-[44px] w-full text-xs bg-[#0B1B30] border border-[#1D3860] rounded-xl px-3.5 py-3 pr-12 font-medium text-white placeholder-[#8EA7C7] focus:outline-none focus:border-[#C5A880]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      className="absolute inset-y-0 right-0 flex min-h-[44px] min-w-[44px] items-center justify-center text-[#8EA7C7] hover:text-white cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}

              {useEmailCodeLogin && loginCodeSent && (
                <div className="form-field space-y-1.5">
                  <label htmlFor="login-email-code" className="text-xs font-bold text-[#C5A880] uppercase tracking-wider block">Email security code</label>
                  <input
                    id="login-email-code"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    pattern="[0-9]{6}"
                    maxLength={6}
                    required
                    value={emailCode}
                    onChange={(e) => setEmailCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="Enter 6-digit code"
                    className="min-h-[44px] w-full text-xs bg-[#0B1B30] border border-[#1D3860] rounded-xl px-3.5 py-3 font-medium tracking-[0.35em] text-white placeholder-[#8EA7C7] focus:outline-none focus:border-[#C5A880]"
                  />
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[11px] text-[#8EA7C7]">The code expires in five minutes.</p>
                    {consecutiveCodeFailures < 2 && (
                      <button
                        type="button"
                        disabled={loading || codeSendCooldown > 0}
                        onClick={() => void handleRequestLoginCode()}
                        className="inline-flex min-h-[44px] items-center px-2 text-xs font-bold text-[#C5A880] underline underline-offset-4 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
                      >
                        {codeSendCooldown > 0 ? `Resend code (${codeSendCooldown}s)` : 'Resend code'}
                      </button>
                    )}
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={loading || loginCooldown > 0 || (useEmailCodeLogin && !loginCodeSent && consecutiveCodeFailures >= 2)}
                className="min-h-[44px] bg-[#C5A880] hover:bg-[#B39369] text-[#1A1A1A] font-black w-full text-xs py-3.5 rounded-xl shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 transition-all"
              >
                {loading ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-[#1A1A1A] border-t-transparent rounded-full animate-spin" />
                    <span>{useEmailCodeLogin && !loginCodeSent ? 'Sending code...' : 'Signing in...'}</span>
                  </>
                ) : loginCooldown > 0 ? (
                  `Try again in ${loginCooldown}s`
                ) : useEmailCodeLogin ? (
                  loginCodeSent ? 'Verify code & Sign In' : 'Send sign-in code'
                ) : preservedProperty ? (
                  `Sign In & Continue to ${preservedProperty.title.split(' ')[0]}`
                ) : (
                  'Sign In'
                )}
              </button>

              <div className="relative flex items-center py-1" role="separator">
                <div className="flex-grow border-t border-[#1D3860]" />
                <span className="mx-3 shrink text-[10px] uppercase tracking-wider text-[#8EA7C7]">or</span>
                <div className="flex-grow border-t border-[#1D3860]" />
              </div>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    setCodeNotice(null);
                    setEmailCode('');
                    setLoginCodeSent(false);
                    setConsecutiveCodeFailures(0);
                    setUseEmailCodeLogin((prev) => !prev);
                  }}
                  className="inline-flex min-h-[44px] items-center justify-center px-3 text-xs font-bold text-[#C5A880] underline underline-offset-4 hover:text-white cursor-pointer"
                >
                  {useEmailCodeLogin ? 'Sign in with password instead' : 'Sign in with an email code instead'}
                </button>
              </div>

              <div className="text-center pt-3 border-t border-[#1D3860]">
                <span className="text-xs text-[#8EA7C7]">Don't have an account yet? </span>
                <button
                  type="button"
                  onClick={() => switchMode('register')}
                  className="inline-flex min-h-[44px] items-center px-2 text-xs font-bold text-[#C5A880] hover:underline cursor-pointer"
                >
                  Register Here
                </button>
              </div>
            </form>
          )}

          {/* 2. REGISTER FORM */}
          {mode === 'register' && (
            <div>
              {!verificationPending ? (
                <form onSubmit={handleRegister} noValidate className="space-y-4">
                  <div className="form-field space-y-1">
                    <label htmlFor="register-name" className="text-xs font-bold text-[#C5A880] uppercase tracking-wider block">Full Name</label>
                    <input
                      id="register-name"
                  type="text"
                      required
                      placeholder="Arthur Vance"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full text-xs bg-[#0B1B30] border border-[#1D3860] rounded-xl px-3.5 py-3 font-medium text-white placeholder-[#8EA7C7] focus:outline-none focus:border-[#C5A880]"
                    />
                  </div>

                  <div className="form-field space-y-1">
                    <label htmlFor="register-email" className="text-xs font-bold text-[#C5A880] uppercase tracking-wider block">Email Address</label>
                    <input
                      id="register-email"
                  type="email"
                      required
                      placeholder="arthur@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full text-xs bg-[#0B1B30] border border-[#1D3860] rounded-xl px-3.5 py-3 font-medium text-white placeholder-[#8EA7C7] focus:outline-none focus:border-[#C5A880]"
                    />
                  </div>

                  <div className="form-field space-y-1">
                    <label htmlFor="register-password" className="text-xs font-bold text-[#C5A880] uppercase tracking-wider block">Password (Minimum 12 Characters)</label>
                    <div className="relative">
                      <input
                        id="register-password"
                        type={showPassword ? 'text' : 'password'}
                        required
                        minLength={12}
                        autoComplete="new-password"
                        placeholder="Create secure password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="min-h-[44px] w-full text-xs bg-[#0B1B30] border border-[#1D3860] rounded-xl px-3.5 py-3 pr-12 font-medium text-white placeholder-[#8EA7C7] focus:outline-none focus:border-[#C5A880]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((prev) => !prev)}
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                        className="absolute inset-y-0 right-0 flex min-h-[44px] min-w-[44px] items-center justify-center text-[#8EA7C7] hover:text-white cursor-pointer"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5 pt-1.5 text-[11px]">
                      {[
                        { ok: passChecks.minLength, label: '12+ characters' },
                        { ok: passChecks.hasUpper, label: 'Uppercase (A–Z)' },
                        { ok: passChecks.hasLower, label: 'Lowercase (a–z)' },
                        { ok: passChecks.hasDigit, label: 'Number (0–9)' },
                      ].map((item) => (
                        <div
                          key={item.label}
                          className={`flex items-center gap-1.5 ${item.ok ? 'text-emerald-400 font-semibold' : 'text-[#8EA7C7]'}`}
                        >
                          <CheckCircle2 className={`w-3.5 h-3.5 shrink-0 ${item.ok ? 'text-emerald-400' : 'text-[#8EA7C7]/45'}`} />
                          <span>{item.label}</span>
                        </div>
                      ))}
                    </div>
                    <div className="pt-2" aria-label={`Password strength: ${passwordStrengthLabel}`}>
                      <div className="mb-1.5 flex items-center justify-between text-[10px] text-[#8EA7C7]">
                        <span>Password strength</span>
                        <span className={passwordStrength >= 4 ? 'text-emerald-400 font-bold' : passwordStrength >= 2 ? 'text-amber-300 font-bold' : 'text-[#8EA7C7]'}>
                          {passwordStrengthLabel}
                        </span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-[#1D3860]">
                        <div
                          className={`h-full rounded-full transition-all ${passwordStrength >= 4 ? 'bg-emerald-400' : passwordStrength >= 2 ? 'bg-amber-300' : 'bg-red-400'}`}
                          style={{ width: `${passwordStrength * 25}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3 rounded-xl border border-[#1D3860] bg-[#0B1B30] p-4">
                    <label className="flex items-start gap-3 text-xs leading-relaxed text-[#D6DEEA] cursor-pointer">
                      <input
                        type="checkbox"
                        required
                        checked={acceptedTerms}
                        onChange={(e) => setAcceptedTerms(e.target.checked)}
                        className="mt-0.5 h-4 w-4 shrink-0 accent-[#C5A880]"
                      />
                      <span>
                        I agree to the <a href="/terms" target="_blank" rel="noreferrer" className="font-bold text-[#C5A880] underline underline-offset-2">Terms</a> and <a href="/privacy" target="_blank" rel="noreferrer" className="font-bold text-[#C5A880] underline underline-offset-2">Privacy Policy</a>.
                      </span>
                    </label>
                    <label className="flex items-start gap-3 text-xs leading-relaxed text-[#D6DEEA] cursor-pointer">
                      <input
                        type="checkbox"
                        required
                        checked={acceptedRisk}
                        onChange={(e) => setAcceptedRisk(e.target.checked)}
                        className="mt-0.5 h-4 w-4 shrink-0 accent-[#C5A880]"
                      />
                      <span>
                        I understand that capital is at risk and target returns are not guaranteed. Read the <a href="/risk-warning" target="_blank" rel="noreferrer" className="font-bold text-[#C5A880] underline underline-offset-2">Risk Warning</a>.
                      </span>
                    </label>
                  </div>

                  <button
                    type="submit"
                    disabled={loading || !acceptedTerms || !acceptedRisk}
                    className="bg-[#C5A880] hover:bg-[#B39369] text-[#1A1A1A] font-black w-full text-xs py-3.5 rounded-xl shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                  >
                    {loading ? (
                      <>
                        <span className="w-3.5 h-3.5 border-2 border-[#1A1A1A] border-t-transparent rounded-full animate-spin" />
                        <span>Creating account...</span>
                      </>
                    ) : preservedProperty ? (
                      `Create Account & Invest in ${preservedProperty.title.split(' ')[0]}`
                    ) : (
                      'Create Account'
                    )}
                  </button>

                  <div className="text-center pt-3 border-t border-[#1D3860]">
                    <span className="text-xs text-[#8EA7C7]">Already have an account? </span>
                    <button
                      type="button"
                      onClick={() => switchMode('login')}
                      className="text-xs font-bold text-[#C5A880] hover:underline cursor-pointer"
                    >
                      Sign In
                    </button>
                  </div>
                </form>
              ) : (
                <div className="text-center py-4 space-y-4">
                  <div className="w-14 h-14 rounded-2xl bg-[#0B1B30] border border-[#1D3860] text-[#C5A880] flex items-center justify-center mx-auto shadow-md">
                    <Mail className="w-7 h-7" />
                  </div>
                  <h3 className="text-xl font-black text-white">Check your email to confirm your account</h3>
                  <div className="p-4 bg-[#0B1B30] rounded-2xl border border-[#1D3860] text-xs text-[#8EA7C7] leading-relaxed text-left space-y-2">
                    <p>
                      We have dispatched a verification link to <strong className="text-white">{email}</strong>.
                    </p>
                    <p>
                      Please click the link in your email to confirm your account.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleResendConfirmation}
                    disabled={loading || resendCooldown > 0}
                    className="bg-[#C5A880] hover:bg-[#B39369] text-[#1A1A1A] font-black w-full text-xs py-3.5 rounded-xl shadow-lg cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Resending...' : resendCooldown > 0 ? `Resend email in ${resendCooldown}s` : 'Resend email'}
                  </button>
                  <p className="text-[11px] text-[#8EA7C7]">You must confirm your email before you can sign in.</p>
                </div>
              )}
            </div>
          )}

          {/* 3. FORGOT PASSWORD */}
          {mode === 'forgot-password' && (
            resetSent ? (
              <div role="status" aria-live="polite" className="space-y-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-5 text-center">
                <Mail className="mx-auto h-8 w-8 text-emerald-400" />
                <h3 className="text-sm font-bold text-white">Check your email</h3>
                <p className="text-xs leading-relaxed text-[#C7D4E7]">
                  If that email exists, we’ve sent a link. Follow the instructions in your inbox to set a new password.
                </p>
                <button type="button" onClick={() => switchMode('login')} className="text-xs font-bold text-[#C5A880] hover:underline">
                  Back to Sign In
                </button>
              </div>
            ) : (
            <form onSubmit={handleResetRequest} noValidate className="space-y-4">
              <div className="form-field space-y-1">
                <label htmlFor="forgot-email" className="text-xs font-bold text-[#C5A880] uppercase tracking-wider block">Registered Email Address</label>
                <input
                  id="forgot-email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full text-xs bg-[#0B1B30] border border-[#1D3860] rounded-xl px-3.5 py-3 font-medium text-white placeholder-[#8EA7C7] focus:outline-none focus:border-[#C5A880]"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="bg-[#C5A880] hover:bg-[#B39369] text-[#1A1A1A] font-black w-full text-xs py-3.5 rounded-xl shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 transition-all"
              >
                {loading ? 'Sending Recovery Link...' : 'Send Password Recovery Link'}
              </button>

              <div className="text-center pt-3 border-t border-[#1D3860]">
                <button
                  type="button"
                  onClick={() => switchMode('login')}
                  className="text-xs font-bold text-[#C5A880] hover:underline cursor-pointer"
                >
                  Back to Sign In
                </button>
              </div>
            </form>
            )
          )}

          {/* 4. RESET PASSWORD */}
          {mode === 'reset-password' && (
            passwordResetSuccess ? (
              <div role="status" aria-live="polite" className="space-y-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-5 text-center">
                <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-400" />
                <h3 className="text-sm font-bold text-white">Your password has been updated</h3>
                <p className="text-xs leading-relaxed text-[#C7D4E7]">You can now sign in with your new password.</p>
                <button type="button" onClick={() => switchMode('login')} className="text-xs font-bold text-[#C5A880] hover:underline">
                  Back to Sign In
                </button>
              </div>
            ) : (
            <form onSubmit={handleUpdatePassword} noValidate className="space-y-4">
              <div className="form-field space-y-1">
                <label htmlFor="reset-password" className="text-xs font-bold text-[#C5A880] uppercase tracking-wider block">New Password (Min 12 Characters)</label>
                <div className="relative">
                  <input
                    id="reset-password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoComplete="new-password"
                    placeholder="Enter new password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="min-h-[44px] w-full text-xs bg-[#0B1B30] border border-[#1D3860] rounded-xl px-3.5 py-3 pr-12 font-medium text-white placeholder-[#8EA7C7] focus:outline-none focus:border-[#C5A880]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute inset-y-0 right-0 flex min-h-[44px] min-w-[44px] items-center justify-center text-[#8EA7C7] hover:text-white cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="form-field space-y-1">
                <label htmlFor="reset-confirm-password" className="text-xs font-bold text-[#C5A880] uppercase tracking-wider block">Confirm New Password</label>
                <input
                  id="reset-confirm-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="new-password"
                  placeholder="Repeat new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="min-h-[44px] w-full text-xs bg-[#0B1B30] border border-[#1D3860] rounded-xl px-3.5 py-3 font-medium text-white placeholder-[#8EA7C7] focus:outline-none focus:border-[#C5A880]"
                />
              </div>

              <button
                type="submit"
                disabled={loading || password.length < 12 || password !== confirmPassword}
                className="min-h-[44px] bg-[#C5A880] hover:bg-[#B39369] text-[#1A1A1A] font-black w-full text-xs py-3.5 rounded-xl shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 transition-all"
              >
                {loading ? 'Updating Password...' : 'Update Password'}
              </button>
            </form>
            )
          )}
        </div>
      </div>
    </div>
  );
};

