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
  const [currentEmail, setCurrentEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newFullName, setNewFullName] = useState('Executive Administrator');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [emailCode, setEmailCode] = useState('');
  const [requiresEmailCode, setRequiresEmailCode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    setError(null);
    setSuccessMsg(null);
    setEmailCode('');
    setRequiresEmailCode(false);
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
      await adminLogin(email.trim(), password, emailCode || undefined);
      onLoginSuccess(false);
    } catch (err: any) {
      if (err?.code === 'EMAIL_CODE_REQUIRED') {
        setRequiresEmailCode(true);
        setError(err?.message || 'A six-digit security code has been sent to your registered email.');
      } else {
        setError(err?.message || 'Authentication failed: Invalid administrator credentials.');
      }
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
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0F10] text-[#F2F5F4] flex flex-col justify-center items-center px-4 py-10 sm:py-12">
      <div className="w-full max-w-md bg-[#121A1F] rounded-2xl border border-[#1F2C33] p-7 sm:p-9">
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-xl bg-[#0B0F10] border border-[#1F2C33] flex items-center justify-center mx-auto mb-3.5 text-[#6FD8B0]">
            <Shield className="w-6 h-6" />
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#F2F5F4] tracking-tight">
            L&apos;Agence Staff Gateway
          </h1>
          <p className="text-xs text-[#8FA1A8] mt-1.5 leading-relaxed">
            Role-verified administrative &amp; staff back-office authentication.
          </p>
        </div>

        {/* Mode Switcher: Sign In vs Set Custom Email & Password */}
        <div className="grid grid-cols-2 p-1 bg-[#0B0F10] rounded-xl border border-[#1F2C33] mb-6">
          <button
            type="button"
            onClick={() => setPortalMode('signin')}
            className={`py-2 px-3 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
              portalMode === 'signin'
                ? 'bg-[#6FD8B0] text-[#0B0F10]'
                : 'text-[#8FA1A8] hover:text-[#F2F5F4]'
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
                ? 'bg-[#6FD8B0] text-[#0B0F10]'
                : 'text-[#8FA1A8] hover:text-[#F2F5F4]'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>Set Custom Login</span>
          </button>
        </div>

        {error && (
          <div className="mb-5 p-3.5 bg-rose-950/40 border border-rose-500/30 rounded-xl text-rose-300 text-xs text-left font-medium flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <span className="leading-relaxed">{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-5 p-3.5 bg-[#6FD8B0]/10 border border-[#6FD8B0]/30 rounded-xl text-[#6FD8B0] text-xs text-left font-semibold flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            <span className="leading-relaxed">{successMsg}</span>
          </div>
        )}

        {portalMode === 'signin' ? (
          <form onSubmit={handleSignInSubmit} className="space-y-4" autoComplete="off">
            <div>
              <label className="block text-xs font-semibold text-[#8FA1A8] mb-1.5 uppercase tracking-wider">
                Staff or Administrator Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@lagence.fr"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                required
                autoFocus
                className="w-full px-4 py-3 rounded-xl bg-[#0B0F10] border border-[#1F2C33] text-[#F2F5F4] placeholder-[#52646C] text-sm focus:outline-none focus:border-[#6FD8B0] transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#8FA1A8] mb-1.5 uppercase tracking-wider">
                Security Password
              </label>
              <div className="relative">
                <input
                  type={showSignInPass ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  required
                  className="w-full px-4 py-3 pr-10 rounded-xl bg-[#0B0F10] border border-[#1F2C33] text-[#F2F5F4] placeholder-[#52646C] text-sm focus:outline-none focus:border-[#6FD8B0] transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowSignInPass((v) => !v)}
                  aria-label={showSignInPass ? 'Hide password' : 'Show password'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8FA1A8] hover:text-[#F2F5F4] cursor-pointer"
                >
                  {showSignInPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {requiresEmailCode && (
              <div>
                <label className="block text-xs font-semibold text-[#8FA1A8] mb-1.5 uppercase tracking-wider">
                  Email security code
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  required
                  value={emailCode}
                  onChange={(e) => setEmailCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="Enter 6-digit code"
                  className="w-full px-4 py-3 rounded-xl bg-[#0B0F10] border border-[#1F2C33] text-[#F2F5F4] placeholder-[#52646C] text-sm tracking-[0.35em] focus:outline-none focus:border-[#6FD8B0]"
                />
                <p className="mt-1 text-[11px] text-[#8FA1A8]">The code expires in five minutes.</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3.5 px-4 bg-[#6FD8B0] hover:bg-[#5ec8a0] text-[#0B0F10] font-bold rounded-xl text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <span>Verifying Credentials...</span>
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  <span>{requiresEmailCode ? 'Verify Code & Sign In' : 'Sign In to Back Office'}</span>
                  <ArrowRight className="w-4 h-4 ml-1" />
                </>
              )}
            </button>

            <div className="text-center pt-1">
              <button
                type="button"
                onClick={() => setPortalMode('customize')}
                className="text-xs font-semibold text-[#6FD8B0] hover:underline cursor-pointer"
              >
                Want to replace the default login with a custom email &amp; password?
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleCustomizeSubmit} className="space-y-3.5" autoComplete="off">
            <div className="p-3.5 rounded-xl bg-[#0B0F10] border border-[#1F2C33] space-y-3">
              <div className="text-[11px] font-bold uppercase tracking-wider text-[#8FA1A8]">
                1. Verify Current Admin Credentials
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-[#8FA1A8] mb-1">
                  Current Admin Email
                </label>
                <input
                  type="email"
                  value={currentEmail}
                  onChange={(e) => setCurrentEmail(e.target.value)}
                  placeholder="Enter active administrator email"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#121A1F] border border-[#1F2C33] text-[#F2F5F4] placeholder-[#52646C] text-xs focus:outline-none focus:border-[#6FD8B0]"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-[#8FA1A8] mb-1">
                  Current Admin Password
                </label>
                <div className="relative">
                  <input
                    type={showCurrentPass ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter active admin password"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    required
                    className="w-full px-3.5 py-2.5 pr-9 rounded-xl bg-[#121A1F] border border-[#1F2C33] text-[#F2F5F4] placeholder-[#52646C] text-xs font-mono focus:outline-none focus:border-[#6FD8B0]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPass((v) => !v)}
                    aria-label={showCurrentPass ? 'Hide current password' : 'Show current password'}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8FA1A8] hover:text-[#F2F5F4] cursor-pointer"
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

            <div className="p-3.5 rounded-xl bg-[#0B0F10] border border-[#1F2C33] space-y-3">
              <div className="text-[11px] font-bold uppercase tracking-wider text-[#6FD8B0]">
                2. Your New Custom Admin Login
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#8FA1A8] mb-1">
                  New Custom Admin Email
                </label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="you@yourdomain.com"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#121A1F] border border-[#1F2C33] text-[#F2F5F4] placeholder-[#52646C] text-xs focus:outline-none focus:border-[#6FD8B0]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#8FA1A8] mb-1">
                  Administrator Display Name
                </label>
                <div className="relative">
                  <User className="w-3.5 h-3.5 text-[#8FA1A8] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={newFullName}
                    onChange={(e) => setNewFullName(e.target.value)}
                    placeholder="Executive Administrator"
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-[#121A1F] border border-[#1F2C33] text-[#F2F5F4] placeholder-[#52646C] text-xs focus:outline-none focus:border-[#6FD8B0]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-semibold text-[#8FA1A8] mb-1">
                    New Password (8+ chars)
                  </label>
                  <div className="relative">
                    <input
                      type={showNewPass ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="New password"
                      autoCapitalize="none"
                      autoCorrect="off"
                      spellCheck={false}
                      required
                      minLength={8}
                      className="w-full px-3 py-2.5 pr-8 rounded-xl bg-[#121A1F] border border-[#1F2C33] text-[#F2F5F4] placeholder-[#52646C] text-xs font-mono focus:outline-none focus:border-[#6FD8B0]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPass((v) => !v)}
                      aria-label={showNewPass ? 'Hide new password' : 'Show new password'}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8FA1A8] hover:text-[#F2F5F4] cursor-pointer"
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
                  <label className="block text-[11px] font-semibold text-[#8FA1A8] mb-1">
                    Confirm New Password
                  </label>
                  <input
                    type={showNewPass ? 'text' : 'password'}
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    placeholder="Repeat password"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    required
                    minLength={8}
                    className="w-full px-3 py-2.5 rounded-xl bg-[#121A1F] border border-[#1F2C33] text-[#F2F5F4] placeholder-[#52646C] text-xs font-mono focus:outline-none focus:border-[#6FD8B0]"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 bg-[#6FD8B0] hover:bg-[#5ec8a0] text-[#0B0F10] font-bold rounded-xl text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
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

        <div className="mt-7 pt-5 border-t border-[#1F2C33] flex items-center justify-center text-xs text-[#8FA1A8]">
          <button
            type="button"
            onClick={onNavigateHome}
            className="hover:text-[#F2F5F4] transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Return to Investor Portal</span>
          </button>
        </div>
      </div>
    </div>
  );
};
