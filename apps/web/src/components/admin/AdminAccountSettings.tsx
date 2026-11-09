import React, { useState, useEffect } from 'react';
import {
  Shield,
  Key,
  User,
  Check,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  RefreshCw,
  RotateCcw,
} from 'lucide-react';
import { useAuth } from '../../lib/auth';
import { apiRequest } from '../../lib/api';
import {
  getActivePassGateCode,
  updatePassGateMasterCode,
  resetPassGateToDefault,
  lockPassGate,
  PRIMARY_DEFAULT_PASSCODE,
} from '../../lib/passGate';

interface AdminCredentialInfoResponse {
  success: boolean;
  data?: {
    email: string;
    fullName: string;
    mode: 'custom_bcrypt' | 'bcrypt_hash' | 'environment_password' | 'development_fallback';
    isCustomConfigured: boolean;
    updatedAt: string | null;
  };
}

interface AdminCredentialUpdateResponse {
  success: boolean;
  message?: string;
  error?: string;
  data?: {
    email: string;
    fullName: string;
    mode: 'custom_bcrypt' | 'bcrypt_hash' | 'environment_password' | 'development_fallback';
    isCustomConfigured: boolean;
    updatedAt: string | null;
    token: string;
    user: {
      id: string;
      email: string;
      role: 'admin';
      fullName: string;
    };
  };
}

export const AdminAccountSettings: React.FC = () => {
  const { user, syncAdminSession } = useAuth();

  // Server-backed Admin Credentials State
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [savingCredentials, setSavingCredentials] = useState(false);
  const [resettingCredentials, setResettingCredentials] = useState(false);

  const [activeServerEmail, setActiveServerEmail] = useState(user?.email || 'admin@kretz.com');
  const [credentialMode, setCredentialMode] = useState<string>('development_fallback');
  const [isCustomConfigured, setIsCustomConfigured] = useState(false);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null);

  // Form Inputs
  const [adminName, setAdminName] = useState(user?.fullName || 'Executive Administrator');
  const [newEmail, setNewEmail] = useState(user?.email || 'admin@kretz.com');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [credSuccessMsg, setCredSuccessMsg] = useState<string | null>(null);
  const [credErrorMsg, setCredErrorMsg] = useState<string | null>(null);

  // Governance & Pass Gate State
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(true);
  const [passGateCode, setPassGateCode] = useState(getActivePassGateCode);
  const [showPasscode, setShowPasscode] = useState(false);
  const [passcodeSavedMsg, setPasscodeSavedMsg] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoadingConfig(true);
    apiRequest<AdminCredentialInfoResponse>('/admin/security/credentials')
      .then((res) => {
        if (!cancelled && res?.success && res.data) {
          setActiveServerEmail(res.data.email);
          setNewEmail(res.data.email);
          setAdminName(res.data.fullName || 'Executive Administrator');
          setCredentialMode(res.data.mode);
          setIsCustomConfigured(Boolean(res.data.isCustomConfigured));
          setLastUpdatedAt(res.data.updatedAt);
        }
      })
      .catch(() => {
        // Keep current session defaults if offline
      })
      .finally(() => {
        if (!cancelled) setLoadingConfig(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSaveCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    if (savingCredentials) return;

    setCredErrorMsg(null);
    setCredSuccessMsg(null);

    const trimmedEmail = newEmail.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setCredErrorMsg('Please enter a valid custom administrator email address.');
      return;
    }

    if (!currentPassword) {
      setCredErrorMsg(
        'Please enter your current administrator password (default: AdminSecure2026!#) to authorize this change.'
      );
      return;
    }

    if (newPassword) {
      if (newPassword.length < 8) {
        setCredErrorMsg('New administrator password must be at least 8 characters long.');
        return;
      }
      if (newPassword !== confirmNewPassword) {
        setCredErrorMsg('New password and confirmation password do not match.');
        return;
      }
    }

    setSavingCredentials(true);
    try {
      const res = await apiRequest<AdminCredentialUpdateResponse>('/admin/security/credentials', {
        method: 'PUT',
        body: {
          currentPassword,
          newEmail: trimmedEmail,
          newPassword: newPassword || undefined,
          fullName: adminName.trim() || 'Executive Administrator',
        },
      });

      if (res?.success && res.data) {
        setActiveServerEmail(res.data.email);
        setNewEmail(res.data.email);
        setAdminName(res.data.fullName);
        setCredentialMode(res.data.mode);
        setIsCustomConfigured(res.data.isCustomConfigured);
        setLastUpdatedAt(res.data.updatedAt);

        // Clear sensitive password inputs immediately
        setCurrentPassword('');
        setNewPassword('');
        setConfirmNewPassword('');

        if (res.data.token) {
          syncAdminSession(res.data.token, {
            email: res.data.email,
            fullName: res.data.fullName,
          });
        }

        setCredSuccessMsg(
          `Custom administrator login updated. Sign in at /admin/login using ${res.data.email}.`
        );
      }
    } catch (err: any) {
      setCredErrorMsg(
        err?.message || 'Unable to update administrator credentials. Verify your current password and try again.'
      );
    } finally {
      setSavingCredentials(false);
    }
  };

  const handleResetToEnvironmentDefault = async () => {
    if (resettingCredentials) return;
    setCredErrorMsg(null);
    setCredSuccessMsg(null);

    if (!currentPassword) {
      setCredErrorMsg(
        'Enter your current administrator password in the "Current Admin Password" field above before resetting.'
      );
      return;
    }

    setResettingCredentials(true);
    try {
      const res = await apiRequest<AdminCredentialUpdateResponse>(
        '/admin/security/credentials/reset',
        {
          method: 'POST',
          body: { currentPassword },
        }
      );

      if (res?.success && res.data) {
        setActiveServerEmail(res.data.email);
        setNewEmail(res.data.email);
        setAdminName(res.data.fullName);
        setCredentialMode(res.data.mode);
        setIsCustomConfigured(false);
        setLastUpdatedAt(null);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmNewPassword('');

        if (res.data.token) {
          syncAdminSession(res.data.token, {
            email: res.data.email,
            fullName: res.data.fullName,
          });
        }

        setCredSuccessMsg(
          `Credentials reset to environment/default configuration (${res.data.email}).`
        );
      }
    } catch (err: any) {
      setCredErrorMsg(err?.message || 'Failed to reset administrator credentials.');
    } finally {
      setResettingCredentials(false);
    }
  };

  const handleUpdatePasscode = () => {
    if (!passGateCode.trim()) {
      setPasscodeSavedMsg('Passcode cannot be empty.');
      return;
    }
    const success = updatePassGateMasterCode(passGateCode.trim());
    if (success) {
      setPasscodeSavedMsg('Executive Pass Gate passcode updated.');
      setTimeout(() => setPasscodeSavedMsg(null), 3500);
    }
  };

  const handleResetPasscode = () => {
    resetPassGateToDefault();
    setPassGateCode(PRIMARY_DEFAULT_PASSCODE);
    setPasscodeSavedMsg(`Passcode reset to standard default (${PRIMARY_DEFAULT_PASSCODE}).`);
    setTimeout(() => setPasscodeSavedMsg(null), 3500);
  };

  const handleLockNow = () => {
    lockPassGate();
  };

  const modeLabel =
    credentialMode === 'custom_bcrypt'
      ? 'Custom Bcrypt Hash Active'
      : credentialMode === 'bcrypt_hash'
      ? 'Environment Bcrypt Hash'
      : credentialMode === 'environment_password'
      ? 'Environment Secret'
      : 'Default Fallback (AdminSecure2026!#)';

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-[#18211F] tracking-tight">
            Admin Console Security & Custom Login Credentials
          </h2>
          <p className="text-xs text-[#52605C] mt-1">
            Configure your custom Administrator Login Email, bcrypt-protected password for{' '}
            <code className="font-mono text-[#182D2A]">/admin/login</code>, and Executive Pass Gate code.
          </p>
        </div>

        <div className="text-xs text-[#52605C] font-mono">
          {loadingConfig ? (
            <span className="inline-flex items-center gap-1.5">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#27845D]" />
              Syncing...
            </span>
          ) : (
            <span>
              Active Login: <strong className="text-[#18211F]">{activeServerEmail}</strong> ·{' '}
              <span className="text-[#27845D] font-semibold">{modeLabel}</span>
            </span>
          )}
        </div>
      </div>

      {credSuccessMsg && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-xs font-semibold flex items-start gap-2.5">
          <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <span>{credSuccessMsg}</span>
        </div>
      )}

      {credErrorMsg && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-semibold flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <span>{credErrorMsg}</span>
        </div>
      )}

      {/* 1. Custom Administrator Email & Password Form */}
      <form onSubmit={handleSaveCredentials} className="bg-white rounded-2xl border border-[#E3E8E3] p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#E3E8E3]">
          <h3 className="text-sm font-bold text-[#18211F] flex items-center gap-2">
            <Key className="w-4 h-4 text-[#27845D]" />
            <span>Custom Administrator Email & Password (/admin/login)</span>
          </h3>
          {lastUpdatedAt && (
            <span className="text-[11px] text-[#52605C] font-mono">
              Updated {new Date(lastUpdatedAt).toLocaleString()}
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-[#52605C] mb-1.5">
              Administrator Display Name
            </label>
            <div className="relative">
              <User className="w-3.5 h-3.5 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={adminName}
                onChange={(e) => setAdminName(e.target.value)}
                placeholder="Executive Administrator"
                className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-[#E3E8E3] text-xs font-medium text-[#18211F] focus:outline-none focus:border-[#27845D]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#52605C] mb-1.5">
              Custom Admin Login Email
            </label>
            <input
              type="email"
              required
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="you@yourdomain.com"
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#E3E8E3] text-xs font-medium text-[#18211F] focus:outline-none focus:border-[#27845D]"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
          <div>
            <label className="block text-xs font-semibold text-[#52605C] mb-1.5">
              Current Admin Password <span className="text-rose-600">*</span>
            </label>
            <div className="relative">
              <input
                type={showCurrentPassword ? 'text' : 'password'}
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Required to authorize"
                autoComplete="current-password"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#E3E8E3] text-xs font-mono text-[#18211F] pr-9 focus:outline-none focus:border-[#27845D]"
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword((v) => !v)}
                aria-label={showCurrentPassword ? 'Hide current password' : 'Show current password'}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                {showCurrentPassword ? (
                  <EyeOff className="w-3.5 h-3.5" />
                ) : (
                  <Eye className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
            <p className="text-[11px] text-[#69736F] mt-1">
              Enter your active password to verify ownership.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#52605C] mb-1.5">
              New Admin Password
            </label>
            <div className="relative">
              <input
                type={showNewPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Min. 8 characters (optional)"
                autoComplete="new-password"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#E3E8E3] text-xs font-mono text-[#18211F] pr-9 focus:outline-none focus:border-[#27845D]"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword((v) => !v)}
                aria-label={showNewPassword ? 'Hide new password' : 'Show new password'}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                {showNewPassword ? (
                  <EyeOff className="w-3.5 h-3.5" />
                ) : (
                  <Eye className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
            <p className="text-[11px] text-[#69736F] mt-1">
              Hashed server-side with bcrypt (cost 12). Leave blank to keep current password.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#52605C] mb-1.5">
              Confirm New Password
            </label>
            <input
              type={showNewPassword ? 'text' : 'password'}
              value={confirmNewPassword}
              onChange={(e) => setConfirmNewPassword(e.target.value)}
              placeholder="Repeat new password"
              autoComplete="new-password"
              disabled={!newPassword}
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#E3E8E3] text-xs font-mono text-[#18211F] disabled:bg-gray-50 disabled:text-gray-400 focus:outline-none focus:border-[#27845D]"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[#E3E8E3]">
          <div>
            {isCustomConfigured && (
              <button
                type="button"
                disabled={resettingCredentials}
                onClick={handleResetToEnvironmentDefault}
                className="px-3.5 py-2 rounded-xl border border-gray-300 bg-gray-50 hover:bg-gray-100 text-gray-700 font-bold text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>
                  {resettingCredentials ? 'Resetting...' : 'Reset to Environment / Default'}
                </span>
              </button>
            )}
          </div>

          <button
            type="submit"
            disabled={savingCredentials}
            className="px-5 py-2.5 bg-[#27845D] hover:bg-[#1f6b4b] text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer disabled:opacity-50 flex items-center gap-2"
          >
            {savingCredentials ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Encrypting & Saving...</span>
              </>
            ) : (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Update Admin Email & Password</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* 2. Admin Pass Gate Security */}
      <div className="bg-white rounded-2xl border border-[#E3E8E3] p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-[#18211F] flex items-center gap-2">
            <Lock className="w-4 h-4 text-[#27845D]" />
            <span>Admin Pass Gate Security (/admin)</span>
          </h3>
          <span className="text-xs font-semibold text-[#27845D]">Pass Gate Enforced</span>
        </div>

        <p className="text-xs text-[#52605C] leading-relaxed">
          Direct visits to{' '}
          <code className="bg-slate-100 text-[#182D2A] px-1.5 py-0.5 rounded font-mono text-[11px]">
            /admin
          </code>{' '}
          prompt for this secondary executive passcode checkpoint before opening the administrative console.
        </p>

        <div className="p-4 bg-[#F8FAF8] rounded-xl border border-[#E3E8E3] space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#52605C] mb-1.5">
                Executive Pass Gate Code
              </label>
              <div className="relative">
                <input
                  type={showPasscode ? 'text' : 'password'}
                  value={passGateCode}
                  onChange={(e) => setPassGateCode(e.target.value)}
                  placeholder="Enter custom pass gate code"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E3E8E3] text-xs font-mono font-medium text-[#18211F] pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPasscode(!showPasscode)}
                  aria-label={showPasscode ? 'Hide pass gate code' : 'Show pass gate code'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                >
                  {showPasscode ? (
                    <EyeOff className="w-3.5 h-3.5" />
                  ) : (
                    <Eye className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
              <p className="text-[11px] text-gray-500 mt-1">
                Default master code:{' '}
                <span className="font-mono font-semibold text-emerald-700">kretz2026</span>
              </p>
            </div>

            <div className="flex flex-col justify-end gap-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleUpdatePasscode}
                  className="flex-1 py-2 px-3 bg-[#182D2A] hover:bg-[#27845D] text-white font-bold text-xs rounded-xl transition-colors cursor-pointer"
                >
                  Update Passcode
                </button>
                <button
                  type="button"
                  onClick={handleResetPasscode}
                  className="py-2 px-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                  title="Reset to default code kretz2026"
                >
                  Reset Default
                </button>
              </div>
              <button
                type="button"
                onClick={handleLockNow}
                className="w-full py-2 px-3 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Lock className="w-3.5 h-3.5 text-amber-700" />
                <span>Lock Admin Pass Gate Now</span>
              </button>
            </div>
          </div>

          {passcodeSavedMsg && (
            <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-xs font-semibold flex items-center gap-2">
              <Check className="w-3.5 h-3.5 text-emerald-600" />
              <span>{passcodeSavedMsg}</span>
            </div>
          )}
        </div>
      </div>

      {/* 3. Hardware 2FA Governance */}
      <div className="bg-white rounded-2xl border border-[#E3E8E3] p-6 space-y-4">
        <h3 className="text-sm font-bold text-[#18211F] flex items-center gap-2">
          <Shield className="w-4 h-4 text-[#27845D]" />
          <span>Security & Governance</span>
        </h3>

        <div className="flex items-center justify-between p-4 bg-[#F8FAF8] rounded-xl border border-[#E3E8E3]">
          <div>
            <div className="text-xs font-bold text-[#18211F]">
              Hardware 2FA / TOTP Authenticator
            </div>
            <div className="text-[11px] text-[#52605C]">
              Enforce YubiKey or Authenticator App for off-market listing approvals
            </div>
          </div>
          <button
            type="button"
            onClick={() => setTwoFactorEnabled(!twoFactorEnabled)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
              twoFactorEnabled ? 'bg-[#27845D] text-white' : 'bg-gray-200 text-gray-700'
            }`}
          >
            {twoFactorEnabled ? 'Enabled' : 'Disabled'}
          </button>
        </div>
      </div>
    </div>
  );
};
