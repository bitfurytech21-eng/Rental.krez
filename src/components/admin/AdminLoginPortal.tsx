import React, { useState, useEffect } from 'react';
import { useAuth } from '../../lib/auth';
import {
  Shield,
  Lock,
  KeyRound,
  ArrowRight,
  Building2,
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  User,
} from 'lucide-react';
import { TurnstileWidget } from '../security/TurnstileWidget';

interface AdminLoginPortalProps {
  onLoginSuccess: (openSecurityTab?: boolean) => void;
  onNavigateCustomerLogin: () => void;
  onNavigateHome: () => void;
}

export const AdminLoginPortal: React.FC<AdminLoginPortalProps> = ({
  onLoginSuccess,
  onNavigateCustomerLogin,
  onNavigateHome,
}) => {
  const { adminLogin, customizeAdminCredentials } = useAuth();

  const [portalMode, setPortalMode] = useState<'signin' | 'customize'>(() => {
    if (typeof window !== 'undefined') {
      const search = window.location.search.toLowerCase();
      const hash = window.location.hash.toLowerCase();
      if (search.includes('customize') || hash.includes('customize')) {
        return 'customize';
      }
    }
    return 'signin';
  });

  // Sign-In State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showSignInPass, setShowSignInPass] = useState(false);

  // Customize Credentials State
  const [currentEmail, setCurrentEmail] = useState('admin@kretz.com');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newFullName, setNewFullName] = useState('Executive Administrator');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);

  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    setError(null);
    setSuccessMsg(null);
  }, [portalMode]);

  const handleSignInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError('Please provide your administrator email address and security password.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await adminLogin(email.trim(), password, turnstileToken || undefined);
      onLoginSuccess(false);
    } catch (err: any) {
      setError(err?.message || 'Authentication failed: Invalid administrator credentials.');
      setTurnstileToken(null);
    } finally {
      setLoading(false);
    }
  };

  const handleCustomizeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!currentEmail.trim() || !currentPassword) {
      setError('Please enter your current administrator email and password to authorize this change.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail.trim())) {
      setError('Please enter a valid custom administrator email address.');
      return;
    }

    if (newPassword.length < 8) {
      setError('Your new administrator password must be at least 8 characters long.');
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setError('New password and confirmation password do not match.');
      return;
    }

    setLoading(true);
    try {
      const updatedAdmin = await customizeAdminCredentials({
        currentEmail: currentEmail.trim(),
        currentPassword,
        newEmail: newEmail.trim(),
        newPassword,
        fullName: newFullName.trim() || 'Executive Administrator',
        turnstileToken: turnstileToken || undefined,
      });

      setSuccessMsg(
        `Custom administrator login saved (${updatedAdmin.email}). Opening Admin Console...`
      );
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');

      setTimeout(() => {
        onLoginSuccess(true);
      }, 650);
    } catch (err: any) {
      setError(
        err?.message ||
          'Unable to update administrator credentials. Verify your current email and password.'
      );
      setTurnstileToken(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B1513] text-white flex flex-col justify-center items-center px-4 py-10 sm:py-12">
      <div className="w-full max-w-md bg-[#131E1B] rounded-2xl border border-[#233530] p-7 sm:p-9 shadow-2xl">
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-xl bg-[#087F5B]/15 border border-[#087F5B]/40 flex items-center justify-center mx-auto mb-3.5 text-[#3BD4AE]">
            <Shield className="w-6 h-6" />
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            Administrator Gateway
          </h1>
          <p className="text-xs text-[#8A9C96] mt-1.5 leading-relaxed">
            Server-verified administrative access &amp; custom login configuration.
          </p>
        </div>

        {/* Mode Switcher: Sign In vs Set Custom Email & Password */}
        <div className="grid grid-cols-2 p-1 bg-[#0B1513] rounded-xl border border-[#233530] mb-6">
          <button
            type="button"
            onClick={() => setPortalMode('signin')}
            className={`py-2 px-3 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
              portalMode === 'signin'
                ? 'bg-[#087F5B] text-white shadow-xs'
                : 'text-[#8A9C96] hover:text-white'
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Sign In</span>
          </button>
          <button
            type="button"
            onClick={() => setPortalMode('customize')}
            className={`py-2 px-3 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
              portalMode === 'customize'
                ? 'bg-[#087F5B] text-white shadow-xs'
                : 'text-[#8A9C96] hover:text-white'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>Set Custom Login</span>
          </button>
        </div>

        {error && (
          <div className="mb-5 p-3.5 bg-red-950/40 border border-red-800/60 rounded-xl text-red-300 text-xs text-left font-medium flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <span className="leading-relaxed">{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-5 p-3.5 bg-emerald-950/50 border border-emerald-700/60 rounded-xl text-emerald-200 text-xs text-left font-semibold flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span className="leading-relaxed">{successMsg}</span>
          </div>
        )}

        {portalMode === 'signin' ? (
          <form onSubmit={handleSignInSubmit} className="space-y-4" autoComplete="off">
            <div>
              <label className="block text-xs font-semibold text-[#8A9C96] mb-1.5 uppercase tracking-wider">
                Administrator Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter administrator email"
                required
                autoFocus
                className="w-full px-4 py-3 rounded-xl bg-[#0B1513] border border-[#233530] text-white placeholder-gray-600 text-sm focus:outline-none focus:border-[#087F5B] focus:ring-1 focus:ring-[#087F5B] transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#8A9C96] mb-1.5 uppercase tracking-wider">
                Security Password
              </label>
              <div className="relative">
                <input
                  type={showSignInPass ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  className="w-full px-4 py-3 pr-10 rounded-xl bg-[#0B1513] border border-[#233530] text-white placeholder-gray-600 text-sm focus:outline-none focus:border-[#087F5B] focus:ring-1 focus:ring-[#087F5B] transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowSignInPass((v) => !v)}
                  aria-label={showSignInPass ? 'Hide password' : 'Show password'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8A9C96] hover:text-white cursor-pointer"
                >
                  {showSignInPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="pt-1">
              <TurnstileWidget
                onVerify={(token) => {
                  setTurnstileToken(token);
                  setError(null);
                }}
                onExpire={() => setTurnstileToken(null)}
                onError={(msg) => setError(msg)}
                action="admin_login"
                theme="dark"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3.5 px-4 bg-[#087F5B] hover:bg-[#066548] text-white font-bold rounded-xl text-sm transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg disabled:opacity-50"
            >
              {loading ? (
                <span>Verifying Credentials...</span>
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  <span>Sign In to Admin Console</span>
                  <ArrowRight className="w-4 h-4 ml-1" />
                </>
              )}
            </button>

            <div className="text-center pt-1">
              <button
                type="button"
                onClick={() => setPortalMode('customize')}
                className="text-xs font-semibold text-[#3BD4AE] hover:underline cursor-pointer"
              >
                Want to replace the default login with a custom email &amp; password?
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleCustomizeSubmit} className="space-y-3.5" autoComplete="off">
            <div className="p-3 rounded-xl bg-[#0B1513] border border-[#233530] space-y-3">
              <div className="text-[11px] font-bold uppercase tracking-wider text-[#8A9C96]">
                1. Verify Current Admin Credentials
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-[#8A9C96] mb-1">
                  Current Admin Email
                </label>
                <input
                  type="email"
                  value={currentEmail}
                  onChange={(e) => setCurrentEmail(e.target.value)}
                  placeholder="admin@kretz.com"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#131E1B] border border-[#233530] text-white placeholder-gray-600 text-xs focus:outline-none focus:border-[#087F5B]"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-[#8A9C96] mb-1">
                  Current Admin Password
                </label>
                <div className="relative">
                  <input
                    type={showCurrentPass ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter active admin password"
                    required
                    className="w-full px-3.5 py-2.5 pr-9 rounded-xl bg-[#131E1B] border border-[#233530] text-white placeholder-gray-600 text-xs font-mono focus:outline-none focus:border-[#087F5B]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPass((v) => !v)}
                    aria-label={showCurrentPass ? 'Hide current password' : 'Show current password'}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8A9C96] hover:text-white cursor-pointer"
                  >
                    {showCurrentPass ? (
                      <EyeOff className="w-3.5 h-3.5" />
                    ) : (
                      <Eye className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-[#0B1513] border border-[#233530] space-y-3">
              <div className="text-[11px] font-bold uppercase tracking-wider text-[#3BD4AE]">
                2. Your New Custom Admin Login
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#8A9C96] mb-1">
                  New Custom Admin Email
                </label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="you@yourdomain.com"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#131E1B] border border-[#233530] text-white placeholder-gray-600 text-xs focus:outline-none focus:border-[#087F5B]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#8A9C96] mb-1">
                  Administrator Display Name
                </label>
                <div className="relative">
                  <User className="w-3.5 h-3.5 text-[#8A9C96] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={newFullName}
                    onChange={(e) => setNewFullName(e.target.value)}
                    placeholder="Executive Administrator"
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-[#131E1B] border border-[#233530] text-white placeholder-gray-600 text-xs focus:outline-none focus:border-[#087F5B]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-semibold text-[#8A9C96] mb-1">
                    New Password (8+ chars)
                  </label>
                  <div className="relative">
                    <input
                      type={showNewPass ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="New password"
                      required
                      minLength={8}
                      className="w-full px-3 py-2.5 pr-8 rounded-xl bg-[#131E1B] border border-[#233530] text-white placeholder-gray-600 text-xs font-mono focus:outline-none focus:border-[#087F5B]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPass((v) => !v)}
                      aria-label={showNewPass ? 'Hide new password' : 'Show new password'}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8A9C96] hover:text-white cursor-pointer"
                    >
                      {showNewPass ? (
                        <EyeOff className="w-3.5 h-3.5" />
                      ) : (
                        <Eye className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#8A9C96] mb-1">
                    Confirm New Password
                  </label>
                  <input
                    type={showNewPass ? 'text' : 'password'}
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    placeholder="Repeat password"
                    required
                    minLength={8}
                    className="w-full px-3 py-2.5 rounded-xl bg-[#131E1B] border border-[#233530] text-white placeholder-gray-600 text-xs font-mono focus:outline-none focus:border-[#087F5B]"
                  />
                </div>
              </div>
            </div>

            <div className="pt-1">
              <TurnstileWidget
                onVerify={(token) => {
                  setTurnstileToken(token);
                  setError(null);
                }}
                onExpire={() => setTurnstileToken(null)}
                onError={(msg) => setError(msg)}
                action="admin_customize"
                theme="dark"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 bg-[#087F5B] hover:bg-[#066548] text-white font-bold rounded-xl text-sm transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg disabled:opacity-50"
            >
              {loading ? (
                <span>Encrypting &amp; Saving...</span>
              ) : (
                <>
                  <KeyRound className="w-4 h-4" />
                  <span>Save Custom Login &amp; Open Console</span>
                  <ArrowRight className="w-4 h-4 ml-0.5" />
                </>
              )}
            </button>
          </form>
        )}

        <div className="mt-7 pt-5 border-t border-[#233530] flex items-center justify-between text-xs text-[#8A9C96]">
          <button
            type="button"
            onClick={onNavigateCustomerLogin}
            className="hover:text-white transition-colors cursor-pointer"
          >
            Investor Portal
          </button>
          <button
            type="button"
            onClick={onNavigateHome}
            className="hover:text-white transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Public Site</span>
          </button>
        </div>
      </div>
    </div>
  );
};
