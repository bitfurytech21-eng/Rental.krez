import React, { useState } from 'react';
import { useAuth } from '../../lib/auth';
import {
  ShieldCheck,
  Mail,
  Lock,
  KeyRound,
  Fingerprint,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Eye,
  EyeOff,
  UserCheck,
  Shield,
  Send
} from 'lucide-react';

export const AdminAccountSettings: React.FC = () => {
  const { user, updateUserEmail, updateUserPassword, sendPasswordReset, isConfigured } = useAuth();

  const [newEmail, setNewEmail] = useState('');
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailSuccess, setEmailSuccess] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [passLoading, setPassLoading] = useState(false);
  const [passSuccess, setPassSuccess] = useState<string | null>(null);
  const [passError, setPassError] = useState<string | null>(null);

  const [resetLoading, setResetLoading] = useState(false);
  const [resetSuccess, setResetSuccess] = useState<string | null>(null);

  // Handle Email Update
  const handleUpdateEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailError(null);
    setEmailSuccess(null);

    if (!newEmail.trim()) {
      setEmailError('Please enter a valid email address.');
      return;
    }

    setEmailLoading(true);
    try {
      await updateUserEmail(newEmail.trim());
      setEmailSuccess(
        isConfigured
          ? `Verification email sent to ${newEmail.trim()}. Please check the inbox and click the confirmation link.`
          : `Executive email updated to ${newEmail.trim()}.`
      );
      setNewEmail('');
    } catch (err: any) {
      setEmailError(err?.message || 'Failed to update email address. Please try again.');
    } finally {
      setEmailLoading(false);
    }
  };

  // Handle Password Update
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassError(null);
    setPassSuccess(null);

    if (!newPassword || newPassword.length < 8) {
      setPassError('Password must be at least 8 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPassError('New passwords do not match. Please check and try again.');
      return;
    }

    setPassLoading(true);
    try {
      await updateUserPassword(newPassword);
      setPassSuccess('Administrative passphrase updated successfully via Supabase Auth.');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setPassError(err?.message || 'Failed to update passphrase. Please verify authentication status.');
    } finally {
      setPassLoading(false);
    }
  };

  // Handle Password Reset Request
  const handleSendResetLink = async () => {
    if (!user?.email) return;
    setResetLoading(true);
    setResetSuccess(null);
    try {
      await sendPasswordReset(user.email);
      setResetSuccess(`Password reset email dispatched to ${user.email}.`);
    } catch (err: any) {
      alert(err?.message || 'Failed to dispatch reset email.');
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="space-y-8 text-left">
      {/* Top Banner */}
      <div className="bg-[#0E201C] border border-[#224039] p-6 sm:p-8 rounded-3xl text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-950/80 border border-emerald-500/40 text-[10px] font-mono font-bold text-[#B7E36A]">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Supabase Auth Protected · RLS Enforced</span>
          </div>
          <h2 className="text-2xl font-black tracking-tight text-white">
            Admin Account & Security Settings
          </h2>
          <p className="text-xs text-slate-300 leading-relaxed max-w-2xl">
            Manage your administrative email address, update security passphrases, and configure 2-Step verification code preferences. All password operations are encrypted using Supabase Auth.
          </p>
        </div>

        <div className="bg-[#142B26] p-4 rounded-2xl border border-[#23483F] flex items-center gap-3 shrink-0">
          <div className="w-10 h-10 rounded-xl bg-[#1D3B34] flex items-center justify-center text-[#B7E36A] font-black text-sm">
            {user?.email?.charAt(0).toUpperCase() || 'A'}
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-emerald-400 block tracking-wider">Signed In Admin</span>
            <span className="text-xs font-mono font-bold text-white block">{user?.email}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Card 1: Change Admin Email */}
        <div className="bg-white p-6 sm:p-7 rounded-3xl border border-[#E3E8E3] shadow-xs space-y-5">
          <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
            <div className="w-10 h-10 rounded-2xl bg-[#EEF2EC] text-[#182D2A] flex items-center justify-center">
              <Mail className="w-5 h-5 text-emerald-800" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#18211F]">Change Admin Email</h3>
              <p className="text-xs text-[#69736F]">Requires re-authentication and email verification link confirmation.</p>
            </div>
          </div>

          {emailSuccess && (
            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
              <span>{emailSuccess}</span>
            </div>
          )}

          {emailError && (
            <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{emailError}</span>
            </div>
          )}

          <form onSubmit={handleUpdateEmail} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#18211F] block">Current Admin Email</label>
              <input
                type="email"
                disabled
                value={user?.email || ''}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-100 border border-slate-200 text-slate-600 text-xs font-mono cursor-not-allowed"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#18211F] block">New Admin Email Address</label>
              <input
                type="email"
                required
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="newadmin@kretz.site"
                className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 text-xs font-mono focus:outline-none focus:border-[#182D2A] focus:ring-1 focus:ring-[#182D2A]"
              />
            </div>

            <button
              type="submit"
              disabled={emailLoading}
              className="w-full py-3 px-4 rounded-xl bg-[#182D2A] hover:bg-[#24423C] text-white font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs disabled:opacity-50"
            >
              {emailLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Updating Email...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 text-[#B7E36A]" />
                  <span>Send Email Update Verification</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Card 2: Change Admin Password */}
        <div className="bg-white p-6 sm:p-7 rounded-3xl border border-[#E3E8E3] shadow-xs space-y-5">
          <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
            <div className="w-10 h-10 rounded-2xl bg-[#EEF2EC] text-[#182D2A] flex items-center justify-center">
              <KeyRound className="w-5 h-5 text-emerald-800" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#18211F]">Change Passphrase</h3>
              <p className="text-xs text-[#69736F]">Updates your Supabase Auth account password securely.</p>
            </div>
          </div>

          {passSuccess && (
            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
              <span>{passSuccess}</span>
            </div>
          )}

          {passError && (
            <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{passError}</span>
            </div>
          )}

          <form onSubmit={handleUpdatePassword} className="space-y-4">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-[#18211F]">New Passphrase</label>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-[11px] text-slate-500 hover:text-slate-700 flex items-center gap-1 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                  <span>{showPassword ? 'Hide' : 'Show'}</span>
                </button>
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimum 8 characters"
                className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 text-xs font-mono focus:outline-none focus:border-[#182D2A] focus:ring-1 focus:ring-[#182D2A]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#18211F] block">Confirm New Passphrase</label>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new passphrase"
                className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 text-xs font-mono focus:outline-none focus:border-[#182D2A] focus:ring-1 focus:ring-[#182D2A]"
              />
            </div>

            <button
              type="submit"
              disabled={passLoading}
              className="w-full py-3 px-4 rounded-xl bg-[#182D2A] hover:bg-[#24423C] text-white font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs disabled:opacity-50"
            >
              {passLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Updating Passphrase...</span>
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4 text-[#B7E36A]" />
                  <span>Update Passphrase</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>

      {/* Security Actions & Password Reset Box */}
      <div className="bg-[#FAFBF9] p-6 rounded-3xl border border-[#E3E8E3] flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-900 flex items-center justify-center shrink-0">
            <Fingerprint className="w-5 h-5 text-amber-800" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-[#18211F]">Emergency Password Reset Link</h4>
            <p className="text-xs text-[#69736F]">Dispatches a secure reset link to your administrator inbox.</p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          {resetSuccess && (
            <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-3 py-1.5 rounded-xl">
              {resetSuccess}
            </span>
          )}
          <button
            type="button"
            onClick={handleSendResetLink}
            disabled={resetLoading}
            className="px-4 py-2.5 rounded-xl bg-white border border-slate-300 hover:border-slate-400 text-[#18211F] text-xs font-bold transition-all cursor-pointer shadow-2xs whitespace-nowrap shrink-0"
          >
            {resetLoading ? 'Sending Link...' : 'Dispatch Reset Email'}
          </button>
        </div>
      </div>
    </div>
  );
};
