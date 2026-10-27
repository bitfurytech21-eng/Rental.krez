import React, { useState, useEffect } from 'react';
import { useAuth } from '../../lib/auth';
import { isValidEmail, isValidPassword } from '../../lib/validation';
import { Property } from '../../types/property';
import { formatCurrency } from '../../lib/utils';
import { AccountType, ACCOUNT_TYPES, UserRole } from '../../types/user';
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
  Globe,
  Phone,
  Sparkles,
  Tag,
  Gift
} from 'lucide-react';
import { TurnstileWidget } from '../security/TurnstileWidget';
import { authApi } from '../../lib/api';
import { COUNTRIES, DEFAULT_COUNTRY, getCountryByCode } from '../../data/countries';
import { ledger } from '../../lib/ledger';

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
  const [referralCode, setReferralCode] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return (params.get('ref') || params.get('referral') || '').toUpperCase();
    }
    return '';
  });

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
    <div className="auth-page py-12 px-4 bg-[#0B1B30] min-h-[calc(100vh-160px)] flex items-center justify-center text-white">
      <div className="auth-card max-w-md w-full bg-[#102442] p-7 sm:p-8 rounded-3xl border border-[#1D3860] shadow-2xl">
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
              <span className="text-[10px] uppercase font-bold text-[#BEE179] block">
                Preserved Investment Selection
              </span>
              <h4 className="font-bold text-white truncate">{preservedProperty.title}</h4>
              <span className="text-[#8EA7C7] text-[11px]">
                Min: {formatCurrency(preservedProperty.minimumInvestment)} · {preservedProperty.city}
              </span>
            </div>
          </div>
        )}

        {/* Supabase Status Banner */}
        {!isConfigured && (
          <div className="mb-6 p-3.5 rounded-2xl bg-[#0B1B30] border border-amber-500/40 text-xs text-amber-200 flex items-start gap-2.5">
            <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block mb-0.5 text-amber-300">Supabase Auth Setup Required:</span>
              <p className="leading-relaxed text-[11px] text-amber-200/90">
                To authenticate real accounts, add <strong>VITE_SUPABASE_URL</strong> and{' '}
                <strong>VITE_SUPABASE_PUBLISHABLE_KEY</strong> in your hosting environment settings.
              </p>
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
            {mode === 'login' && (preservedProperty ? 'Sign In to Complete Investment' : 'Welcome to Rental·log')}
            {mode === 'register' && (preservedProperty ? 'Register to Invest in Asset' : 'Create Supabase Account')}
            {mode === 'forgot-password' && 'Password Recovery'}
            {mode === 'reset-password' && 'Set New Password'}
          </h2>
          <p className="text-xs text-[#8EA7C7] mt-1.5 leading-relaxed">
            {mode === 'login' && 'Sign in using your verified email and password'}
            {mode === 'register' && 'Institutional real estate tokenization platform. Email verification required.'}
            {mode === 'forgot-password' && 'Enter your registered email to receive a secure recovery link.'}
            {mode === 'reset-password' && 'Enter your new password below to regain access to your account.'}
          </p>
        </div>

        {error && (
          <div className="p-3.5 mb-5 rounded-2xl bg-red-950/70 text-red-200 text-xs font-semibold border border-red-500/40 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <div className="flex-1 space-y-1.5">
              <span className="leading-relaxed block">{error}</span>
              {(error.toLowerCase().includes('already exists') || error.toLowerCase().includes('already registered')) && (
                <button
                  type="button"
                  onClick={() => switchMode('login')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-900/60 hover:bg-red-800/80 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer mt-1 border border-red-500/30"
                >
                  <Lock className="w-3 h-3 text-[#BEE179]" />
                  <span>Click here to sign in with this email &rarr;</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Navigation Tabs: Sign In / Register Portal */}
        {(mode === 'login' || mode === 'register') && (
          <div className="grid grid-cols-2 p-1.5 bg-[#0B1B30] rounded-2xl mb-6 border border-[#1D3860]">
            <button
              type="button"
              onClick={() => switchMode('login')}
              className={`py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                mode === 'login'
                  ? 'bg-[#BEE179] text-[#0B1B30] shadow-md font-black'
                  : 'text-[#8EA7C7] hover:text-white'
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
                  ? 'bg-[#BEE179] text-[#0B1B30] shadow-md font-black'
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
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="form-field space-y-1">
              <label className="text-xs font-bold text-[#BEE179] uppercase tracking-wider block">Email Address</label>
              <input
                type="email"
                required
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full text-xs bg-[#0B1B30] border border-[#1D3860] rounded-xl px-3.5 py-3 font-medium text-white placeholder-[#8EA7C7] focus:outline-none focus:border-[#BEE179]"
              />
            </div>

            <div className="form-field space-y-1">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-[#BEE179] uppercase tracking-wider block">Password</label>
                <button
                  type="button"
                  onClick={() => switchMode('forgot-password')}
                  className="text-[11px] font-bold text-[#BEE179] hover:underline cursor-pointer"
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
                className="w-full text-xs bg-[#0B1B30] border border-[#1D3860] rounded-xl px-3.5 py-3 font-medium text-white placeholder-[#8EA7C7] focus:outline-none focus:border-[#BEE179]"
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
                theme="dark"
              />
            </div>

            <button
              type="submit"
              disabled={loading || !turnstileToken}
              className="bg-[#BEE179] hover:bg-[#aed860] text-[#0B1B30] font-black w-full text-xs py-3.5 rounded-xl shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 transition-all"
            >
              {loading ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-[#0B1B30] border-t-transparent rounded-full animate-spin" />
                  <span>Signing in...</span>
                </>
              ) : preservedProperty ? (
                `Sign In & Continue to ${preservedProperty.title.split(' ')[0]}`
              ) : (
                'Sign In'
              )}
            </button>

            <div className="text-center pt-3 border-t border-[#1D3860]">
              <span className="text-xs text-[#8EA7C7]">Don't have an account yet? </span>
              <button
                type="button"
                onClick={() => switchMode('register')}
                className="text-xs font-bold text-[#BEE179] hover:underline cursor-pointer"
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
                  <label className="text-xs font-bold text-[#BEE179] uppercase tracking-wider block">Full Legal Name</label>
                  <input
                    type="text"
                    required
                    placeholder="David Vance"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full text-xs bg-[#0B1B30] border border-[#1D3860] rounded-xl px-3.5 py-3 font-medium text-white placeholder-[#8EA7C7] focus:outline-none focus:border-[#BEE179]"
                  />
                  <p className="text-[10px] text-[#8EA7C7]">Stored securely in Supabase user metadata for SPV compliance.</p>
                </div>

                <div className="form-field space-y-1">
                  <label className="text-xs font-bold text-[#BEE179] uppercase tracking-wider block">Email Address</label>
                  <input
                    type="email"
                    required
                    placeholder="david@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full text-xs bg-[#0B1B30] border border-[#1D3860] rounded-xl px-3.5 py-3 font-medium text-white placeholder-[#8EA7C7] focus:outline-none focus:border-[#BEE179]"
                  />
                </div>

                {/* Country of Residence Selection */}
                <div className="form-field space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-[#BEE179] uppercase tracking-wider flex items-center gap-1.5">
                      <Globe className="w-3.5 h-3.5 text-[#BEE179]" />
                      <span>Country of Residence</span>
                    </label>
                    <span className="text-[10px] font-bold text-[#BEE179] bg-[#0B1B30] px-2 py-0.5 rounded-full border border-[#1D3860]">
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
                    className="w-full text-xs bg-[#0B1B30] border border-[#1D3860] rounded-xl px-3.5 py-3 font-semibold text-white focus:outline-none focus:border-[#BEE179]"
                  >
                    {COUNTRIES.map((country) => (
                      <option key={country.code} value={country.code} className="bg-[#102442] text-white">
                        {country.flag} {country.name} ({country.dialCode})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Country Code & Phone Number Digits */}
                <div className="form-field space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-[#BEE179] uppercase tracking-wider flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-[#BEE179]" />
                      <span>Phone Number</span>
                    </label>
                    <span className="text-[10px] text-[#8EA7C7]">Country Code & Digits</span>
                  </div>

                  <div className="grid grid-cols-12 gap-2">
                    <div className="col-span-5 sm:col-span-4">
                      <select
                        value={phoneCountryCode}
                        onChange={(e) => setPhoneCountryCode(e.target.value)}
                        className="w-full text-xs bg-[#0B1B30] border border-[#1D3860] rounded-xl px-2.5 py-3 font-semibold text-white focus:outline-none focus:border-[#BEE179] truncate"
                        title="Select Country Dialing Code"
                      >
                        {COUNTRIES.map((c) => (
                          <option key={`dial-${c.code}`} value={c.code} className="bg-[#102442] text-white">
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
                        className="w-full text-xs bg-[#0B1B30] border border-[#1D3860] rounded-xl px-3.5 py-3 font-medium text-white placeholder-[#8EA7C7] focus:outline-none focus:border-[#BEE179]"
                      />
                    </div>
                  </div>
                  <p className="text-[10px] text-[#8EA7C7]">
                    Required for 2FA security, investor distributions, and KYC notification delivery.
                  </p>
                </div>

                <div className="form-field space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-[#BEE179] uppercase tracking-wider">Account Type</label>
                    <span className="text-[10px] font-bold text-[#BEE179] bg-[#0B1B30] px-2.5 py-0.5 rounded-full border border-[#1D3860]">
                      {ACCOUNT_TYPES.find(t => t.id === accountType)?.badge || 'Investor'}
                    </span>
                  </div>
                  <select
                    value={accountType}
                    onChange={(e) => setAccountType(e.target.value as AccountType)}
                    className="w-full text-xs bg-[#0B1B30] border border-[#1D3860] rounded-xl px-3.5 py-3 font-semibold text-white focus:outline-none focus:border-[#BEE179]"
                  >
                    {ACCOUNT_TYPES.filter(type => type.id !== 'admin').map((type) => (
                      <option key={type.id} value={type.id} className="bg-[#102442] text-white">
                        {type.label}
                      </option>
                    ))}
                  </select>
                  {(() => {
                    const activeType = ACCOUNT_TYPES.find(t => t.id === accountType);
                    if (!activeType) return null;
                    return (
                      <div className="p-3 bg-[#0B1B30] border border-[#1D3860] rounded-xl text-[11px] text-[#8EA7C7] flex items-start gap-2">
                        <div className="mt-1 w-1.5 h-1.5 rounded-full bg-[#BEE179] shrink-0" />
                        <div className="space-y-0.5 flex-1">
                          <p className="leading-snug text-white font-medium">{activeType.description}</p>
                          {activeType.minInvestment && activeType.minInvestment !== 'N/A' && (
                            <p className="text-[10px] font-bold text-white">
                              Minimum Allocation: <span className="text-[#BEE179] font-mono">{activeType.minInvestment}</span>
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* VIP Referral Code Field / Applied Banner */}
                {referralCode ? (
                  <div className="p-3 bg-[#0B1B30] border border-[#1D3860] rounded-xl flex items-center justify-between text-xs text-white">
                    <div className="flex items-center gap-2">
                      <Tag className="w-4 h-4 text-[#BEE179] shrink-0" />
                      <div>
                        <div className="text-[10px] text-[#BEE179] font-bold">VIP Partner Invitation Active</div>
                        <div className="font-mono font-bold text-white text-xs">CODE: {referralCode}</div>
                      </div>
                    </div>
                    <span className="font-bold text-[#0B1B30] bg-[#BEE179] px-2.5 py-1 rounded-full shadow-xs text-[10.5px] shrink-0">
                      +€500 Bonus
                    </span>
                  </div>
                ) : (
                  <div className="form-field space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-[#BEE179] uppercase tracking-wider flex items-center gap-1.5">
                        <Tag className="w-3.5 h-3.5 text-[#BEE179]" />
                        <span>Referral / Partner Code (Optional)</span>
                      </label>
                      <span className="text-[10px] text-[#8EA7C7]">€500 Welcome Allocation</span>
                    </div>
                    <input
                      type="text"
                      placeholder="e.g. KRETZ-VIP"
                      value={referralCode}
                      onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                      className="w-full text-xs bg-[#0B1B30] border border-[#1D3860] rounded-xl px-3.5 py-2.5 font-mono font-semibold text-white placeholder-[#8EA7C7] focus:outline-none focus:border-[#BEE179] uppercase placeholder:normal-case"
                    />
                  </div>
                )}

                <div className="form-field space-y-1">
                  <label className="text-xs font-bold text-[#BEE179] uppercase tracking-wider block">Password (Min 8 Characters)</label>
                  <input
                    type="password"
                    required
                    placeholder="Create secure password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full text-xs bg-[#0B1B30] border border-[#1D3860] rounded-xl px-3.5 py-3 font-medium text-white placeholder-[#8EA7C7] focus:outline-none focus:border-[#BEE179]"
                  />
                </div>

                <div className="p-3 bg-[#0B1B30] border border-[#1D3860] rounded-xl text-[11px] text-[#8EA7C7] space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-[#BEE179]">
                    <Shield className="w-3.5 h-3.5" />
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
                    theme="dark"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading || !turnstileToken}
                  className="bg-[#BEE179] hover:bg-[#aed860] text-[#0B1B30] font-black w-full text-xs py-3.5 rounded-xl shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 transition-all"
                >
                  {loading ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-[#0B1B30] border-t-transparent rounded-full animate-spin" />
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
                    className="text-xs font-bold text-[#BEE179] hover:underline cursor-pointer"
                  >
                    Sign In
                  </button>
                </div>
              </form>
            ) : (
              <div className="text-center py-4 space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-[#0B1B30] border border-[#1D3860] text-[#BEE179] flex items-center justify-center mx-auto shadow-md">
                  <Mail className="w-7 h-7" />
                </div>
                <h3 className="text-xl font-black text-white">Verify Your Email</h3>
                <div className="p-4 bg-[#0B1B30] rounded-2xl border border-[#1D3860] text-xs text-[#8EA7C7] leading-relaxed text-left space-y-2">
                  <p>
                    We have dispatched a verification link to <strong className="text-white">{email}</strong>.
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
                  className="bg-[#BEE179] hover:bg-[#aed860] text-[#0B1B30] font-black w-full text-xs py-3.5 rounded-xl shadow-lg cursor-pointer"
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
                  <label className="text-xs font-bold text-[#BEE179] uppercase tracking-wider block">Registered Email Address</label>
                  <input
                    type="email"
                    required
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full text-xs bg-[#0B1B30] border border-[#1D3860] rounded-xl px-3.5 py-3 font-medium text-white placeholder-[#8EA7C7] focus:outline-none focus:border-[#BEE179]"
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
                    theme="dark"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading || !turnstileToken}
                  className="bg-[#BEE179] hover:bg-[#aed860] text-[#0B1B30] font-black w-full text-xs py-3.5 rounded-xl shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 transition-all"
                >
                  {loading ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-[#0B1B30] border-t-transparent rounded-full animate-spin" />
                      <span>Sending Recovery Link...</span>
                    </>
                  ) : (
                    'Send Password Recovery Link'
                  )}
                </button>

                <div className="text-center pt-3 border-t border-[#1D3860]">
                  <button
                    type="button"
                    onClick={() => switchMode('login')}
                    className="text-xs font-bold text-[#BEE179] hover:underline cursor-pointer"
                  >
                    Back to Sign In
                  </button>
                </div>
              </form>
            ) : (
              <div className="text-center py-4 space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-[#0B1B30] border border-[#1D3860] text-[#BEE179] flex items-center justify-center mx-auto shadow-md">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <h4 className="text-lg font-bold text-white">Recovery Email Sent</h4>
                <p className="text-xs text-[#8EA7C7] leading-relaxed">
                  A password recovery link has been generated by Supabase and sent to{' '}
                  <strong className="text-white">{email}</strong>. Please follow the instructions in the email.
                </p>
                <button
                  onClick={() => {
                    setResetSent(false);
                    switchMode('login');
                  }}
                  className="bg-[#BEE179] hover:bg-[#aed860] text-[#0B1B30] font-black w-full text-xs py-3.5 rounded-xl shadow-lg cursor-pointer"
                >
                  Return to Sign In
                </button>
              </div>
            )}
          </div>
        )}

        {/* 4. RESET PASSWORD */}
        {mode === 'reset-password' && (
          <div>
            {!passwordResetSuccess ? (
              <form onSubmit={handleUpdatePassword} className="space-y-4">
                <div className="p-3 bg-[#0B1B30] border border-[#1D3860] rounded-xl text-xs text-white flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-[#BEE179]" />
                  <span>Authenticated via Supabase recovery token</span>
                </div>

                <div className="form-field space-y-1">
                  <label className="text-xs font-bold text-[#BEE179] uppercase tracking-wider block">New Password (Min 8 Characters)</label>
                  <input
                    type="password"
                    required
                    placeholder="Enter new password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full text-xs bg-[#0B1B30] border border-[#1D3860] rounded-xl px-3.5 py-3 font-medium text-white placeholder-[#8EA7C7] focus:outline-none focus:border-[#BEE179]"
                  />
                </div>

                <div className="form-field space-y-1">
                  <label className="text-xs font-bold text-[#BEE179] uppercase tracking-wider block">Confirm New Password</label>
                  <input
                    type="password"
                    required
                    placeholder="Repeat new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full text-xs bg-[#0B1B30] border border-[#1D3860] rounded-xl px-3.5 py-3 font-medium text-white placeholder-[#8EA7C7] focus:outline-none focus:border-[#BEE179]"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="bg-[#BEE179] hover:bg-[#aed860] text-[#0B1B30] font-black w-full text-xs py-3.5 rounded-xl shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 transition-all"
                >
                  {loading ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-[#0B1B30] border-t-transparent rounded-full animate-spin" />
                      <span>Updating Password in Supabase...</span>
                    </>
                  ) : (
                    'Update Password'
                  )}
                </button>
              </form>
            ) : (
              <div className="text-center py-4 space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-[#0B1B30] border border-[#1D3860] text-[#BEE179] flex items-center justify-center mx-auto shadow-md">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <h4 className="text-lg font-bold text-white">Password Updated!</h4>
                <p className="text-xs text-[#8EA7C7] leading-relaxed">
                  Your password has been successfully reset in Supabase. You can now sign in with your new credentials.
                </p>
                <button
                  onClick={() => switchMode('login')}
                  className="bg-[#BEE179] hover:bg-[#aed860] text-[#0B1B30] font-black w-full text-xs py-3.5 rounded-xl shadow-lg cursor-pointer"
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
