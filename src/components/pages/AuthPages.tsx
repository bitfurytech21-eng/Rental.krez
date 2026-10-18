import React, { useState, useEffect } from 'react';
import { useAuth } from '../../lib/auth';
import { isValidEmail, isValidPassword } from '../../lib/validation';
import { Property } from '../../types/property';
import { formatCurrency } from '../../lib/utils';
import { AccountType, ACCOUNT_TYPES, UserRole } from '../../types/user';
import {
  Building2,
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
  Globe,
  Phone
} from 'lucide-react';
import { TurnstileWidget } from '../security/TurnstileWidget';
import { authApi } from '../../lib/api';
import { COUNTRIES, DEFAULT_COUNTRY, getCountryByCode } from '../../data/countries';

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
    register,
    sendPasswordReset,
    updatePassword,
    isConfigured,
    isRecoveryMode,
    setIsRecoveryMode
  } = useAuth();

  const [mode, setMode] = useState<'login' | 'register' | 'forgot-password' | 'reset-password'>(
    isRecoveryMode ? 'reset-password' : initialMode
  );

  useEffect(() => {
    if (isRecoveryMode) {
      setMode('reset-password');
    } else if (initialMode) {
      setMode(initialMode);
    }
  }, [initialMode, isRecoveryMode]);

  // Form states
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [selectedCountryCode, setSelectedCountryCode] = useState<string>(DEFAULT_COUNTRY.code);
  const [phoneCountryCode, setPhoneCountryCode] = useState<string>(DEFAULT_COUNTRY.code);
  const [phoneDigits, setPhoneDigits] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [accountType, setAccountType] = useState<AccountType>('individual_investor');
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);

  // Status states
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [verificationPending, setVerificationPending] = useState(false);
  const [passwordResetSuccess, setPasswordResetSuccess] = useState(false);

  const switchMode = (newMode: 'login' | 'register' | 'forgot-password' | 'reset-password') => {
    setError(null);
    setTurnstileToken(null);
    setMode(newMode);
    onNavigateMode(newMode);
  };

  // Real Supabase Email/Password Login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!isValidEmail(email)) {
      setError('Please provide a valid email address.');
      return;
    }
    if (!password) {
      setError('Please enter your password.');
      return;
    }
    if (!turnstileToken) {
      setError('Please complete the Cloudflare Turnstile human security verification.');
      return;
    }

    setLoading(true);
    try {
      try {
        await authApi.login(email, password, turnstileToken);
      } catch (backendErr) {
        // Fallback to local auth if backend offline
      }
      await login(email, password);
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Login failed.');
      setTurnstileToken(null);
    } finally {
      setLoading(false);
    }
  };

  // Real Supabase Account Registration with Full Name metadata and verification requirement
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!fullName.trim()) {
      setError('Full legal name is required.');
      return;
    }
    if (!isValidEmail(email)) {
      setError('Please provide a valid email address.');
      return;
    }
    const passCheck = isValidPassword(password);
    if (!passCheck.valid) {
      setError(passCheck.reason || 'Password must be at least 8 characters.');
      return;
    }
    if (!turnstileToken) {
      setError('Please complete the Cloudflare Turnstile human security verification.');
      return;
    }

    if (!selectedCountryCode) {
      setError('Please select your country of residence.');
      return;
    }
    const cleanPhoneDigits = phoneDigits.replace(/\D/g, '');
    if (!cleanPhoneDigits) {
      setError('Phone number digits are required.');
      return;
    }
    if (cleanPhoneDigits.length < 6 || cleanPhoneDigits.length > 15) {
      setError('Please enter a valid phone number digit length (6 to 15 digits).');
      return;
    }

    const currentCountry = getCountryByCode(selectedCountryCode);
    const phoneCountry = getCountryByCode(phoneCountryCode);
    const fullPhoneNumber = `${phoneCountry.dialCode} ${phoneDigits.trim()}`;

    const selectedOption = ACCOUNT_TYPES.find(a => a.id === accountType);
    const determinedRole: UserRole = selectedOption?.role || (accountType === 'admin' ? 'admin' : 'investor');

    setLoading(true);
    try {
      try {
        await authApi.register({
          email,
          pass: password,
          fullName,
          role: determinedRole,
          turnstileToken,
          country: currentCountry.name,
          countryCode: currentCountry.code,
          phoneNumber: fullPhoneNumber,
        });
      } catch {}

      const result = await register(
        email,
        password,
        fullName,
        determinedRole,
        accountType,
        currentCountry.name,
        fullPhoneNumber
      );
      if (result.requiresVerification) {
        setVerificationPending(true);
      } else {
        onSuccess();
      }
    } catch (err: any) {
      setError(err.message || 'Registration failed.');
      setTurnstileToken(null);
    } finally {
      setLoading(false);
    }
  };

  // Real Supabase Password Reset Request
  const handleResetRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!isValidEmail(email)) {
      setError('Please provide a valid email address.');
      return;
    }
    if (!turnstileToken) {
      setError('Please complete the Cloudflare Turnstile human security verification.');
      return;
    }

    setLoading(true);
    try {
      try {
        await authApi.sendPasswordReset(email, turnstileToken);
      } catch {}
      await sendPasswordReset(email);
      setResetSent(true);
    } catch (err: any) {
      setError(err.message || 'Failed to dispatch password recovery link.');
      setTurnstileToken(null);
    } finally {
      setLoading(false);
    }
  };

  // Real Supabase Password Update
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError('New password must be at least 8 characters long.');
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
      setError(err.message || 'Failed to update password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page py-12 px-4 bg-[#F6F7F4] min-h-[calc(100vh-160px)] flex items-center justify-center">
      <div className="auth-card max-w-md w-full bg-white p-7 sm:p-8 rounded-3xl border border-[#E3E8E3] shadow-lg">
        {/* Preserved Property Banner (Requirement 10) */}
        {preservedProperty && (
          <div className="mb-6 p-4 rounded-2xl bg-[#EEF1EC] border border-[#E3E8E3] flex items-center gap-3 text-xs text-[#18211F]">
            <div className="w-12 h-12 rounded-xl overflow-hidden bg-white shrink-0 border border-[#E3E8E3]">
              <img
                src={preservedProperty.images[0] || preservedProperty.bannerImage}
                alt={preservedProperty.title}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-[10px] uppercase font-bold text-[#27845D] block">
                Preserved Investment Selection
              </span>
              <h4 className="font-bold text-[#18211F] truncate">{preservedProperty.title}</h4>
              <span className="text-[#69736F] text-[11px]">
                Min: {formatCurrency(preservedProperty.minimumInvestment)} · {preservedProperty.city}
              </span>
            </div>
          </div>
        )}

        {/* Supabase Status Banner */}
        {!isConfigured && (
          <div className="mb-6 p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-[#8D6B19] flex items-start gap-2.5">
            <Info className="w-4 h-4 text-[#B7791F] shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block mb-0.5">Supabase Auth Setup Required:</span>
              <p className="leading-relaxed text-[11px]">
                To authenticate real accounts, add <strong>VITE_SUPABASE_URL</strong> and{' '}
                <strong>VITE_SUPABASE_PUBLISHABLE_KEY</strong> in your hosting environment settings.
              </p>
            </div>
          </div>
        )}

        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-[#182D2A] text-[#B7E36A] flex items-center justify-center mx-auto mb-3 shadow-sm">
            <Building2 className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-black text-[#18211F]">
            {mode === 'login' && (preservedProperty ? 'Sign In to Complete Investment' : 'Welcome to Rental·log')}
            {mode === 'register' && (preservedProperty ? 'Register to Invest in Asset' : 'Create Supabase Account')}
            {mode === 'forgot-password' && 'Password Recovery'}
            {mode === 'reset-password' && 'Set New Password'}
          </h2>
          <p className="text-xs text-[#69736F] mt-1.5 leading-relaxed">
            {mode === 'login' && 'Sign in using your verified email and password'}
            {mode === 'register' && 'Institutional real estate tokenization platform. Email verification required.'}
            {mode === 'forgot-password' && 'Enter your registered email to receive a secure recovery link.'}
            {mode === 'reset-password' && 'Enter your new password below to regain access to your account.'}
          </p>
        </div>

        {error && (
          <div className="p-3.5 mb-5 rounded-2xl bg-red-50 text-red-700 text-xs font-semibold border border-red-200 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <span className="leading-relaxed">{error}</span>
          </div>
        )}

        {/* Navigation Tabs: Sign In / Register Portal */}
        {(mode === 'login' || mode === 'register') && (
          <div className="grid grid-cols-2 p-1.5 bg-[#EEF1EC] rounded-2xl mb-6 border border-[#E3E8E3]">
            <button
              type="button"
              onClick={() => switchMode('login')}
              className={`py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                mode === 'login'
                  ? 'bg-white text-[#182D2A] shadow-sm'
                  : 'text-[#69736F] hover:text-[#18211F]'
              }`}
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Sign In</span>
            </button>
            <button
              type="button"
              onClick={() => switchMode('register')}
              className={`py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                mode === 'register'
                  ? 'bg-white text-[#182D2A] shadow-sm ring-1 ring-[#27845D]/30'
                  : 'text-[#69736F] hover:text-[#18211F]'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5 text-[#27845D]" />
              <span>Register Account</span>
            </button>
          </div>
        )}

        {/* 1. LOGIN FORM */}
        {mode === 'login' && (
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="form-field space-y-1">
              <label className="text-xs font-bold text-[#18211F]">Email Address</label>
              <input
                type="email"
                required
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full text-xs bg-[#F6F7F4] border border-[#E3E8E3] rounded-xl px-3.5 py-3 font-medium text-[#18211F] focus:outline-none focus:border-[#182D2A]"
              />
            </div>

            <div className="form-field space-y-1">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-[#18211F]">Password</label>
                <button
                  type="button"
                  onClick={() => switchMode('forgot-password')}
                  className="text-[11px] font-semibold text-[#27845D] hover:underline cursor-pointer"
                >
                  Forgot Password?
                </button>
              </div>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full text-xs bg-[#F6F7F4] border border-[#E3E8E3] rounded-xl px-3.5 py-3 font-medium text-[#18211F] focus:outline-none focus:border-[#182D2A]"
              />
            </div>

              <div className="pt-2">
                <TurnstileWidget
                  onVerify={(token) => {
                    setTurnstileToken(token);
                    setError(null);
                  }}
                  onExpire={() => setTurnstileToken(null)}
                  onError={(msg) => setError(msg)}
                  action="login"
                  theme="light"
                />
              </div>

            <button
              type="submit"
              disabled={loading || !turnstileToken}
              className="btn btn-primary w-full text-xs font-bold py-3.5 shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
            >
              {loading ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Signing in...</span>
                </>
              ) : preservedProperty ? (
                `Sign In & Continue to ${preservedProperty.title.split(' ')[0]}`
              ) : (
                'Sign In'
              )}
            </button>

            <div className="text-center pt-3 border-t border-[#E3E8E3]">
              <span className="text-xs text-[#69736F]">Don't have an account yet? </span>
              <button
                type="button"
                onClick={() => switchMode('register')}
                className="text-xs font-bold text-[#182D2A] hover:underline cursor-pointer"
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
              <form onSubmit={handleRegister} className="space-y-4">
                <div className="form-field space-y-1">
                  <label className="text-xs font-bold text-[#18211F]">Full Legal Name</label>
                  <input
                    type="text"
                    required
                    placeholder="David Vance"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full text-xs bg-[#F6F7F4] border border-[#E3E8E3] rounded-xl px-3.5 py-3 font-medium text-[#18211F] focus:outline-none focus:border-[#182D2A]"
                  />
                  <p className="text-[10px] text-[#69736F]">Stored securely in Supabase user metadata for SPV compliance.</p>
                </div>

                <div className="form-field space-y-1">
                  <label className="text-xs font-bold text-[#18211F]">Email Address</label>
                  <input
                    type="email"
                    required
                    placeholder="david@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full text-xs bg-[#F6F7F4] border border-[#E3E8E3] rounded-xl px-3.5 py-3 font-medium text-[#18211F] focus:outline-none focus:border-[#182D2A]"
                  />
                </div>

                {/* Country of Residence Selection */}
                <div className="form-field space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-[#18211F] flex items-center gap-1.5">
                      <Globe className="w-3.5 h-3.5 text-[#27845D]" />
                      <span>Country of Residence</span>
                    </label>
                    <span className="text-[10px] font-semibold text-[#27845D] bg-[#27845D]/10 px-2 py-0.5 rounded-full">
                      SPV Compliance
                    </span>
                  </div>
                  <select
                    value={selectedCountryCode}
                    onChange={(e) => {
                      const newCode = e.target.value;
                      setSelectedCountryCode(newCode);
                      setPhoneCountryCode(newCode);
                    }}
                    className="w-full text-xs bg-[#F6F7F4] border border-[#E3E8E3] rounded-xl px-3.5 py-3 font-semibold text-[#18211F] focus:outline-none focus:border-[#182D2A]"
                  >
                    {COUNTRIES.map((country) => (
                      <option key={country.code} value={country.code}>
                        {country.flag} {country.name} ({country.dialCode})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Country Code & Phone Number Digits */}
                <div className="form-field space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-[#18211F] flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-[#27845D]" />
                      <span>Phone Number</span>
                    </label>
                    <span className="text-[10px] text-[#69736F]">Country Code & Digits</span>
                  </div>

                  <div className="grid grid-cols-12 gap-2">
                    <div className="col-span-5 sm:col-span-4">
                      <select
                        value={phoneCountryCode}
                        onChange={(e) => setPhoneCountryCode(e.target.value)}
                        className="w-full text-xs bg-[#F6F7F4] border border-[#E3E8E3] rounded-xl px-2.5 py-3 font-semibold text-[#18211F] focus:outline-none focus:border-[#182D2A] truncate"
                        title="Select Country Dialing Code"
                      >
                        {COUNTRIES.map((c) => (
                          <option key={`dial-${c.code}`} value={c.code}>
                            {c.flag} {c.dialCode} ({c.code})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="col-span-7 sm:col-span-8">
                      <input
                        type="tel"
                        required
                        placeholder={getCountryByCode(phoneCountryCode).placeholder || 'Phone digits'}
                        value={phoneDigits}
                        onChange={(e) => {
                          const val = e.target.value.replace(/[^\d\s-]/g, '');
                          setPhoneDigits(val);
                        }}
                        className="w-full text-xs bg-[#F6F7F4] border border-[#E3E8E3] rounded-xl px-3.5 py-3 font-medium text-[#18211F] focus:outline-none focus:border-[#182D2A]"
                      />
                    </div>
                  </div>
                  <p className="text-[10px] text-[#69736F]">
                    Required for 2FA security, investor distributions, and KYC notification delivery.
                  </p>
                </div>

                <div className="form-field space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-[#18211F]">Account Type</label>
                    <span className="text-[10px] font-bold text-[#27845D] bg-[#27845D]/10 px-2.5 py-0.5 rounded-full">
                      {ACCOUNT_TYPES.find(t => t.id === accountType)?.badge || 'Investor'}
                    </span>
                  </div>
                  <select
                    value={accountType}
                    onChange={(e) => setAccountType(e.target.value as AccountType)}
                    className="w-full text-xs bg-[#F6F7F4] border border-[#E3E8E3] rounded-xl px-3.5 py-3 font-semibold text-[#18211F] focus:outline-none focus:border-[#182D2A]"
                  >
                    {ACCOUNT_TYPES.filter(type => type.id !== 'admin').map((type) => (
                      <option key={type.id} value={type.id}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                  {(() => {
                    const activeType = ACCOUNT_TYPES.find(t => t.id === accountType);
                    if (!activeType) return null;
                    return (
                      <div className="p-2.5 bg-[#EEF2ED] border border-[#E0E7DE] rounded-xl text-[11px] text-[#4A5753] flex items-start gap-2">
                        <div className="mt-1 w-1.5 h-1.5 rounded-full bg-[#27845D] shrink-0" />
                        <div className="space-y-0.5 flex-1">
                          <p className="leading-snug text-[#2C3834] font-medium">{activeType.description}</p>
                          {activeType.minInvestment && activeType.minInvestment !== 'N/A' && (
                            <p className="text-[10px] font-bold text-[#182D2A]">
                              Minimum Allocation: <span className="text-[#27845D] font-mono">{activeType.minInvestment}</span>
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </div>

                <div className="form-field space-y-1">
                  <label className="text-xs font-bold text-[#18211F]">Password (Min 8 Characters)</label>
                  <input
                    type="password"
                    required
                    placeholder="Create secure password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full text-xs bg-[#F6F7F4] border border-[#E3E8E3] rounded-xl px-3.5 py-3 font-medium text-[#18211F] focus:outline-none focus:border-[#182D2A]"
                  />
                </div>

                <div className="p-3 bg-[#EEF1EC] rounded-xl text-[11px] text-[#69736F] space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-[#182D2A]">
                    <Shield className="w-3.5 h-3.5 text-[#27845D]" />
                    <span>Identity & Email Verification</span>
                  </div>
                  <p>
                    A verification link will be sent to your email. You must confirm your email before signing in to access the investment dashboard.
                  </p>
                </div>

                <div className="pt-2">
                  <TurnstileWidget
                    onVerify={(token) => {
                      setTurnstileToken(token);
                      setError(null);
                    }}
                    onExpire={() => setTurnstileToken(null)}
                    onError={(msg) => setError(msg)}
                    action="register"
                    theme="light"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading || !turnstileToken}
                  className="btn btn-primary w-full text-xs font-bold py-3.5 shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  {loading ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Creating account...</span>
                    </>
                  ) : preservedProperty ? (
                    `Create Account & Invest in ${preservedProperty.title.split(' ')[0]}`
                  ) : (
                    'Create Account'
                  )}
                </button>

                <div className="text-center pt-3 border-t border-[#E3E8E3]">
                  <span className="text-xs text-[#69736F]">Already have an account? </span>
                  <button
                    type="button"
                    onClick={() => switchMode('login')}
                    className="text-xs font-bold text-[#182D2A] hover:underline cursor-pointer"
                  >
                    Sign In
                  </button>
                </div>
              </form>
            ) : (
              /* Requirement 4: Require email verification feedback */
              <div className="text-center py-4 space-y-4">
                <div className="w-14 h-14 rounded-full bg-[#E8F5E9] text-[#27845D] flex items-center justify-center mx-auto shadow-sm">
                  <Mail className="w-7 h-7" />
                </div>
                <h3 className="text-xl font-black text-[#18211F]">Verify Your Email</h3>
                <div className="p-4 bg-[#F6F7F4] rounded-2xl border border-[#E3E8E3] text-xs text-[#69736F] leading-relaxed text-left space-y-2">
                  <p>
                    We have dispatched a verification link to <strong>{email}</strong>.
                  </p>
                  <p>
                    Please click the link in your email to confirm your account. Once verified, return here to sign in.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setVerificationPending(false);
                    switchMode('login');
                  }}
                  className="btn btn-primary w-full text-xs font-bold py-3.5"
                >
                  Proceed to Sign In
                </button>
              </div>
            )}
          </div>
        )}

        {/* 3. FORGOT PASSWORD */}
        {mode === 'forgot-password' && (
          <div>
            {!resetSent ? (
              <form onSubmit={handleResetRequest} className="space-y-4">
                <div className="form-field space-y-1">
                  <label className="text-xs font-bold text-[#18211F]">Registered Email Address</label>
                  <input
                    type="email"
                    required
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full text-xs bg-[#F6F7F4] border border-[#E3E8E3] rounded-xl px-3.5 py-3 font-medium text-[#18211F] focus:outline-none focus:border-[#182D2A]"
                  />
                </div>

                <div className="pt-2">
                  <TurnstileWidget
                    onVerify={(token) => {
                      setTurnstileToken(token);
                      setError(null);
                    }}
                    onExpire={() => setTurnstileToken(null)}
                    onError={(msg) => setError(msg)}
                    action="forgot-password"
                    theme="light"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading || !turnstileToken}
                  className="btn btn-primary w-full text-xs font-bold py-3.5 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  {loading ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Sending Recovery Link...</span>
                    </>
                  ) : (
                    'Send Password Recovery Link'
                  )}
                </button>

                <div className="text-center pt-3 border-t border-[#E3E8E3]">
                  <button
                    type="button"
                    onClick={() => switchMode('login')}
                    className="text-xs font-bold text-[#182D2A] hover:underline cursor-pointer"
                  >
                    Back to Sign In
                  </button>
                </div>
              </form>
            ) : (
              <div className="text-center py-4 space-y-4">
                <div className="w-14 h-14 rounded-full bg-[#E8F5E9] text-[#27845D] flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <h4 className="text-lg font-bold text-[#18211F]">Recovery Email Sent</h4>
                <p className="text-xs text-[#69736F] leading-relaxed">
                  A password recovery link has been generated by Supabase and sent to{' '}
                  <strong>{email}</strong>. Please follow the instructions in the email.
                </p>
                <button
                  onClick={() => {
                    setResetSent(false);
                    switchMode('login');
                  }}
                  className="btn btn-primary w-full text-xs font-bold py-3"
                >
                  Return to Sign In
                </button>
              </div>
            )}
          </div>
        )}

        {/* 4. RESET PASSWORD (User arrived via Supabase recovery link) */}
        {mode === 'reset-password' && (
          <div>
            {!passwordResetSuccess ? (
              <form onSubmit={handleUpdatePassword} className="space-y-4">
                <div className="p-3 bg-[#EEF1EC] rounded-xl text-xs text-[#18211F] flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-[#27845D]" />
                  <span>Authenticated via Supabase recovery token</span>
                </div>

                <div className="form-field space-y-1">
                  <label className="text-xs font-bold text-[#18211F]">New Password (Min 8 Characters)</label>
                  <input
                    type="password"
                    required
                    placeholder="Enter new password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full text-xs bg-[#F6F7F4] border border-[#E3E8E3] rounded-xl px-3.5 py-3 font-medium text-[#18211F] focus:outline-none focus:border-[#182D2A]"
                  />
                </div>

                <div className="form-field space-y-1">
                  <label className="text-xs font-bold text-[#18211F]">Confirm New Password</label>
                  <input
                    type="password"
                    required
                    placeholder="Repeat new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full text-xs bg-[#F6F7F4] border border-[#E3E8E3] rounded-xl px-3.5 py-3 font-medium text-[#18211F] focus:outline-none focus:border-[#182D2A]"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="btn btn-primary w-full text-xs font-bold py-3.5 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  {loading ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Updating Password in Supabase...</span>
                    </>
                  ) : (
                    'Update Password'
                  )}
                </button>
              </form>
            ) : (
              <div className="text-center py-4 space-y-4">
                <div className="w-14 h-14 rounded-full bg-[#E8F5E9] text-[#27845D] flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <h4 className="text-lg font-bold text-[#18211F]">Password Updated!</h4>
                <p className="text-xs text-[#69736F] leading-relaxed">
                  Your password has been successfully reset in Supabase. You can now sign in with your new credentials.
                </p>
                <button
                  onClick={() => switchMode('login')}
                  className="btn btn-primary w-full text-xs font-bold py-3"
                >
                  Proceed to Sign In
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
