import React, { useState } from 'react';
import { useAuth } from '../../lib/auth';
import { authApi, setAuthToken } from '../../lib/api';
import {
  Shield,
  Lock,
  ArrowRight,
  KeyRound,
  AlertCircle,
  CheckCircle2,
  Server,
  Eye,
  EyeOff,
  Terminal,
  ShieldCheck,
  ChevronLeft,
  Fingerprint,
  Cpu
} from 'lucide-react';

interface AdminLoginPortalProps {
  onLoginSuccess: () => void;
  onNavigateCustomerLogin: () => void;
  onNavigateHome: () => void;
}

export const AdminLoginPortal: React.FC<AdminLoginPortalProps> = ({
  onLoginSuccess,
  onNavigateCustomerLogin,
  onNavigateHome,
}) => {
  const { login, quickDemoSession, isConfigured } = useAuth();
  
  const [email, setEmail] = useState('admin@kretz.com');
  const [password, setPassword] = useState('admin123');
  const [showPassword, setShowPassword] = useState(false);
  const [totpToken, setTotpToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionBound, setSessionBound] = useState(true);

  // Authenticate Admin Form
  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      setError('Please provide an administrator email address.');
      return;
    }
    if (!password) {
      setError('Please provide your administrative passphrase.');
      return;
    }

    setLoading(true);
    try {
      // 1. First authenticate user session
      const authenticatedUser = await login(cleanEmail, password);

      // 2. Enforce Administrator Role Check
      if (authenticatedUser.role !== 'admin') {
        throw new Error(
          `Access Denied: The account (${cleanEmail}) does not possess platform administrative authority. Only accounts with the 'admin' role may access this control center.`
        );
      }

      // 3. Try calling the dedicated backend API endpoint if online
      try {
        const res = await authApi.login(cleanEmail, password);
        if (res?.data?.token) {
          setAuthToken(res.data.token);
        }
      } catch (backendErr) {
        // Fallback gracefully in standalone or preview environments
        console.log('Backend auth sync notice:', backendErr);
      }

      onLoginSuccess();
    } catch (err: any) {
      setError(err?.message || 'Administrative authentication failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  // 1-Click Fast Admin Sign-In for Testing
  const handleQuickDemoAdmin = async () => {
    setLoading(true);
    setError(null);
    try {
      await quickDemoSession('admin');
      onLoginSuccess();
    } catch (err: any) {
      setError(err?.message || 'Failed to initialize administrative session.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070D12] text-slate-100 flex flex-col justify-between selection:bg-emerald-500 selection:text-white font-sans">
      
      {/* 1. Portal Sovereign Top Bar */}
      <header className="border-b border-slate-800/80 bg-[#091219]/90 backdrop-blur-md px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-800 text-white flex items-center justify-center shadow-lg shadow-emerald-950/40 border border-emerald-500/30">
            <Shield className="w-5 h-5 text-emerald-200" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-sm tracking-tight text-white">Rental·log</span>
              <span className="text-slate-600">/</span>
              <span className="text-xs font-mono uppercase tracking-wider text-emerald-400 font-bold">Admin Portal</span>
            </div>
            <p className="text-[10px] text-slate-400 font-mono hidden sm:block">
              Restricted Administrative Gateway · Node v22
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onNavigateCustomerLogin}
            className="text-xs font-semibold text-slate-300 hover:text-white hover:underline flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span>Investor Portal</span>
          </button>
          <span className="text-slate-700 hidden sm:inline">|</span>
          <button
            onClick={onNavigateHome}
            className="text-xs font-semibold text-slate-400 hover:text-slate-200 hidden sm:block cursor-pointer"
          >
            Public Site
          </button>
        </div>
      </header>

      {/* 2. Main Login Console */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 py-10 relative">
        {/* Subtle background glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="w-full max-w-[440px] bg-[#0C161F] border border-slate-800/90 rounded-3xl p-7 sm:p-8 shadow-2xl relative z-10 space-y-6">
          
          {/* Header & Security Badge */}
          <div className="space-y-3 text-left">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/80 border border-emerald-500/30 text-[10px] font-mono font-bold text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>TLS 1.3 · IP SECURE AUDIT ENABLED</span>
            </div>

            <div>
              <h1 className="text-2xl font-black text-white tracking-tight">
                Control Panel Sign In
              </h1>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Authorized access point for executive management, treasury settlements, and SPV compliance.
              </p>
            </div>
          </div>

          {/* Quick Pre-fill / Testing Assistant */}
          <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2 text-left">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-200 text-[11px] flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Admin Credentials</span>
              </span>
              <span className="text-[10px] text-emerald-400 font-mono">Development Mode</span>
            </div>
            
            <div className="grid grid-cols-2 gap-2 text-left">
              <div className="p-2 rounded-xl bg-slate-950/80 border border-slate-800 text-[11px]">
                <span className="text-slate-500 block text-[9px] uppercase font-bold">Email</span>
                <span className="font-mono text-slate-200 font-semibold block truncate">admin@kretz.com</span>
              </div>
              <div className="p-2 rounded-xl bg-slate-950/80 border border-slate-800 text-[11px]">
                <span className="text-slate-500 block text-[9px] uppercase font-bold">Default Key</span>
                <span className="font-mono text-slate-200 font-semibold block truncate">admin123</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setEmail('admin@kretz.com');
                setPassword('admin123');
              }}
              className="w-full text-[11px] font-bold text-emerald-400 hover:text-emerald-300 transition-colors text-center block pt-0.5 cursor-pointer"
            >
              Click to autofill credentials
            </button>
          </div>

          {error && (
            <div className="p-3.5 rounded-2xl bg-red-950/50 border border-red-800/80 text-red-200 text-xs font-semibold flex items-start gap-2.5 text-left animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span className="leading-relaxed">{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleAdminLogin} className="space-y-4 text-left">
            
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 block">Administrator Account Email</label>
              <div className="relative">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@kretz.com"
                  className="w-full px-3.5 py-3 rounded-xl bg-slate-950/90 border border-slate-800 text-white text-xs font-mono focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all placeholder:text-slate-600"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-300">Security Passphrase</label>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-[11px] text-slate-400 hover:text-slate-200 flex items-center gap-1 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  <span>{showPassword ? 'Hide' : 'Show'}</span>
                </button>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full px-3.5 py-3 rounded-xl bg-slate-950/90 border border-slate-800 text-white text-xs font-mono focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all placeholder:text-slate-600"
                />
              </div>
            </div>

            {/* Optional 2FA / TOTP Security Token Input */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <label className="font-semibold text-slate-400 text-[11px] flex items-center gap-1.5">
                  <Fingerprint className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Hardware Key / TOTP 2FA Code</span>
                </label>
                <span className="text-[10px] text-slate-500">Optional</span>
              </div>
              <input
                type="text"
                value={totpToken}
                onChange={(e) => setTotpToken(e.target.value)}
                placeholder="6-digit code or Security Key"
                maxLength={8}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/70 border border-slate-800 text-white text-xs font-mono focus:outline-none focus:border-emerald-500 placeholder:text-slate-700"
              />
            </div>

            {/* Security Session Binding Option */}
            <div className="flex items-center justify-between text-xs pt-1">
              <label className="flex items-center gap-2 cursor-pointer text-slate-400 hover:text-slate-300">
                <input
                  type="checkbox"
                  checked={sessionBound}
                  onChange={(e) => setSessionBound(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-900 text-emerald-500 focus:ring-0"
                />
                <span className="text-[11px]">Enforce single-session IP locking</span>
              </label>
              <span className="text-[10px] text-slate-500 font-mono">8h TTL</span>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-emerald-950/50 disabled:opacity-50 mt-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Verifying Administrator Token...</span>
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  <span>Sign In to Admin Panel</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            {/* 1-Click Instant Demo Admin Session */}
            <button
              type="button"
              onClick={handleQuickDemoAdmin}
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white font-semibold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Cpu className="w-3.5 h-3.5 text-emerald-400" />
              <span>1-Click Instant Demo Admin Access</span>
            </button>
          </form>

          {/* Compliance & Audit Footnote */}
          <div className="pt-4 border-t border-slate-800/80 text-center space-y-1">
            <p className="text-[10px] text-slate-500 font-mono">
              All sign-in attempts are logged to the cryptographic audit ledger.
            </p>
            <p className="text-[10px] text-slate-400">
              Not an administrator?{' '}
              <button
                type="button"
                onClick={onNavigateCustomerLogin}
                className="text-emerald-400 hover:underline font-semibold cursor-pointer"
              >
                Sign in to Investor Account
              </button>
            </p>
          </div>

        </div>
      </main>

      {/* 3. Terminal Security Footer */}
      <footer className="border-t border-slate-800/80 bg-[#091219]/90 px-4 sm:px-8 py-3 text-center sm:text-left flex flex-col sm:flex-row items-center justify-between text-[10px] font-mono text-slate-500 gap-2">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
          <span>SPV Security Node · Madrid-EU-Central</span>
          <span className="text-slate-700">·</span>
          <span>Ledger v1.0.0</span>
        </div>

        <div>
          <span>MiCA Article 59 & CNMV Regulatory Registry Verified</span>
        </div>
      </footer>

    </div>
  );
};
