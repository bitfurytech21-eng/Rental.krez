import React, { useState } from 'react';
import { useAuth } from '../../lib/auth';
import { ledger } from '../../lib/ledger';
import { KYCStatus, getAccountTypeLabel, getAccountTypeBadge } from '../../types/user';
import { ShieldCheck, User as UserIcon, Building2, UploadCloud, CheckCircle2, Clock, XCircle, AlertCircle, Palette, Check, Sparkles, Crown } from 'lucide-react';
import { ImageUploader } from '../common/ImageUploader';
import { AccountTypeSwitcher } from '../common/AccountTypeSwitcher';
import { UserMembershipCard } from '../club/UserMembershipCard';

export type DashboardThemeId = 'slate' | 'sandstone' | 'titanium' | 'obsidian';

export interface ThemeOption {
  id: DashboardThemeId;
  name: string;
  desc: string;
  preview: string;
  border: string;
}

export const THEME_OPTIONS: ThemeOption[] = [
  { id: 'slate', name: 'Executive Slate', desc: 'Midnight slate blue & deep graphite (Default dark)', preview: '#0B0F19', border: '#1E293B' },
  { id: 'sandstone', name: 'Warm Sandstone', desc: 'Luxury cashmere & architectural warm stone tone', preview: '#E7E1D4', border: '#DCD4C6' },
  { id: 'titanium', name: 'Nordic Titanium', desc: 'Clean cool steel & minimalist titanium aesthetic', preview: '#DCE3EB', border: '#CBD5E1' },
  { id: 'obsidian', name: 'Obsidian Carbon', desc: 'Ultra-deep pure OLED jet black contrast', preview: '#090A0E', border: '#1D212B' },
];

interface ProfilePageProps {
  dashboardTheme?: DashboardThemeId;
  onSelectTheme?: (theme: DashboardThemeId) => void;
}

export const ProfilePage: React.FC<ProfilePageProps> = ({
  dashboardTheme,
  onSelectTheme
}) => {
  const { user, refreshUser } = useAuth();
  const [docType, setDocType] = useState('Passport');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [localTheme, setLocalTheme] = useState<DashboardThemeId>(() => {
    return (localStorage.getItem('dashboard_theme') as DashboardThemeId) || 'slate';
  });

  const activeTheme = dashboardTheme || localTheme;

  const handleThemeChange = (newTheme: DashboardThemeId) => {
    setLocalTheme(newTheme);
    localStorage.setItem('dashboard_theme', newTheme);
    if (onSelectTheme) {
      onSelectTheme(newTheme);
    }
    window.dispatchEvent(new CustomEvent('dashboard-theme-changed', { detail: newTheme }));
    setMessage(`Dashboard background tone updated to ${THEME_OPTIONS.find(t => t.id === newTheme)?.name}!`);
  };

  if (!user) return null;

  const handleKYCSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setTimeout(() => {
      ledger.updateKYCStatus(user.id, 'pending', docType);
      refreshUser();
      setIsSubmitting(false);
      setMessage('Identity document submitted! It is now pending administrative compliance review.');
    }, 600);
  };

  const handleAvatarUpload = (base64: string) => {
    ledger.updateUserAvatar(user.id, base64);
    refreshUser();
    setMessage('Profile picture updated successfully in real-time!');
  };

  const handleAvatarRemove = () => {
    ledger.updateUserAvatar(user.id, '');
    refreshUser();
    setMessage('Custom profile picture removed.');
  };

  const renderKYCBadge = (status: KYCStatus) => {
    switch (status) {
      case 'verified':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#E8F5E9] text-[#27845D] text-xs font-bold">
            <CheckCircle2 className="w-3.5 h-3.5" /> Identity Verified (Level 2)
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-[#B7791F] text-xs font-bold">
            <Clock className="w-3.5 h-3.5" /> Under Compliance Review
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-50 text-[#C24141] text-xs font-bold">
            <XCircle className="w-3.5 h-3.5" /> Verification Declined
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EEF1EC] text-[#69736F] text-xs font-bold">
            <AlertCircle className="w-3.5 h-3.5" /> Unverified
          </span>
        );
    }
  };

  return (
    <div className="py-4 space-y-8">
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-black dash-text">Account & Verification</h1>
          <p className="text-xs dash-muted">
            Manage your personal investor profile, background color theme, compliance status, and security preferences.
          </p>
        </div>

        {message && (
          <div className="p-4 rounded-2xl bg-emerald-500/15 text-emerald-400 text-xs font-bold border border-emerald-500/30">
            {message}
          </div>
        )}

        {/* Profile Card */}
        <div className="dash-card p-7 rounded-3xl border shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-inherit/30">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-[#182D2A] text-[#B7E36A] flex items-center justify-center font-bold text-lg overflow-hidden shadow-sm">
                {user.avatarUrl ? (
                  <img src={user.avatarUrl} alt={user.fullName} className="w-full h-full object-cover" />
                ) : (
                  user.fullName.split(' ').map(n => n[0]).join('')
                )}
              </div>
              <div>
                <h2 className="text-xl font-bold dash-text">{user.fullName}</h2>
                <span className="text-xs dash-muted">{user.email}</span>
                <div className="mt-2">{renderKYCBadge(user.kycStatus)}</div>
              </div>
            </div>
          </div>

          {/* Dedicated Image Uploader Component */}
          <div className="pt-2">
            <h3 className="text-sm font-bold dash-text mb-3">Custom Profile Photo</h3>
            <ImageUploader
              currentAvatarUrl={user.avatarUrl}
              userName={user.fullName}
              onUpload={handleAvatarUpload}
              onRemove={handleAvatarRemove}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-4 rounded-2xl dash-inner border">
              <span className="dash-muted block mb-0.5">Investor ID</span>
              <span className="font-mono font-bold dash-text">{user.id}</span>
            </div>
            <div className="p-4 rounded-2xl dash-inner border">
              <span className="dash-muted block mb-0.5">Account Type</span>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="font-bold dash-text">{getAccountTypeLabel(user.accountType, user.role)}</span>
                <span className="text-[10px] font-bold text-[#27845D] bg-[#27845D]/10 px-2 py-0.5 rounded-full">
                  {getAccountTypeBadge(user.accountType, user.role)}
                </span>
              </div>
            </div>
            <div className="p-4 rounded-2xl dash-inner border">
              <span className="dash-muted block mb-0.5">Assigned Crypto Deposit Address</span>
              <span className="font-mono font-bold dash-text break-all">{user.cryptoDepositAddress}</span>
            </div>
            <div className="p-4 rounded-2xl dash-inner border">
              <span className="dash-muted block mb-0.5">Account Registered Since</span>
              <span className="font-bold dash-text">
                {new Date(user.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
              </span>
            </div>
          </div>
        </div>

        {/* Kretz Club Privé Membership Status */}
        {(() => {
          const userMem = ledger.getUserMembership(user.id);
          const tiers = ledger.getMembershipTiers();
          return (
            <div className="dash-card p-7 rounded-3xl border shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-4 border-b border-inherit/30">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-500 border border-amber-500/30 flex items-center justify-center">
                    <Crown className="w-5 h-5 text-amber-500" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold dash-text">Kretz Club Privé Pass</h3>
                    <p className="text-xs dash-muted">
                      Your exclusive membership credentials, off-market privileges, and concierge code.
                    </p>
                  </div>
                </div>
                <a
                  href="#/club"
                  className="px-3.5 py-1.5 rounded-xl border border-inherit/30 text-xs font-semibold hover:bg-white/10 transition-colors"
                >
                  Club Portal →
                </a>
              </div>

              {userMem ? (
                <UserMembershipCard
                  membership={userMem}
                  tiers={tiers}
                  onRefresh={refreshUser}
                  onUpgradeClick={() => { window.location.hash = '/club'; }}
                />
              ) : (
                <div className="p-6 rounded-2xl dash-inner border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <p className="font-bold dash-text text-sm">No Active Membership Pass</p>
                    <p className="text-xs dash-muted">
                      Unlock confidential off-market property dossiers, private salon cocktail invitations, and dedicated lifestyle advisory.
                    </p>
                  </div>
                  <a
                    href="#/club"
                    className="px-5 py-2.5 rounded-xl bg-[#182D2A] text-[#B7E36A] font-bold text-xs hover:bg-[#24423C] transition-colors whitespace-nowrap"
                  >
                    Explore Membership Tiers
                  </a>
                </div>
              )}
            </div>
          );
        })()}

        {/* Account Type Switcher Component */}
        <AccountTypeSwitcher user={user} onRefresh={refreshUser} onMessage={(m) => setMessage(m)} />


        {/* Dashboard Appearance & Color Theme Settings Feature */}
        <div className="dash-card p-7 rounded-3xl border shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-inherit/30">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500/20 to-sky-500/20 text-sky-400 border border-sky-500/30 flex items-center justify-center">
                <Palette className="w-5 h-5 text-sky-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold dash-text">Dashboard Background & Appearance</h3>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/15 text-sky-400 border border-sky-500/30">
                    Live Tone
                  </span>
                </div>
                <p className="text-xs dash-muted">
                  Choose your dashboard background color outside the navy green tones. Updates in real-time across the platform.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs font-semibold dash-muted bg-inherit/10 px-3 py-1.5 rounded-xl border border-inherit/20 self-start sm:self-auto">
              <span>Active Theme:</span>
              <span className="text-emerald-400 font-bold">
                {THEME_OPTIONS.find(t => t.id === activeTheme)?.name}
              </span>
            </div>
          </div>

          {/* Theme Option Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {THEME_OPTIONS.map((opt) => {
              const isSelected = activeTheme === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => handleThemeChange(opt.id)}
                  className={`p-4 rounded-2xl border text-left transition-all cursor-pointer relative flex flex-col justify-between ${
                    isSelected
                      ? 'border-emerald-500 bg-emerald-500/10 ring-2 ring-emerald-500/20 shadow-md'
                      : 'dash-inner border-inherit/30 hover:border-inherit/60 hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-9 h-9 rounded-xl border shadow-inner flex items-center justify-center shrink-0"
                        style={{ backgroundColor: opt.preview, borderColor: opt.border }}
                      >
                        {isSelected && <Check className="w-4 h-4 text-emerald-400" />}
                      </div>
                      <div>
                        <div className="text-sm font-bold dash-text flex items-center gap-2">
                          {opt.name}
                          {isSelected && (
                            <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full font-bold">
                              Active
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] dash-muted mt-0.5">{opt.desc}</div>
                      </div>
                    </div>
                  </div>

                  {/* Swatch & Preview Bar */}
                  <div className="pt-2 border-t border-inherit/20 flex items-center justify-between text-[11px]">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: opt.preview }} />
                      <span className="font-mono text-[10px] dash-muted">{opt.preview}</span>
                    </div>
                    <span className={`text-[10px] font-bold ${isSelected ? 'text-emerald-400' : 'dash-muted'}`}>
                      {isSelected ? '✓ Currently Applied' : 'Click to Set Tone'}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* KYC Submission Section if not verified */}
        {user.kycStatus !== 'verified' && (
          <div className="dash-card p-7 rounded-3xl border shadow-sm space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold dash-text">Submit Identity Verification (KYC)</h3>
                <p className="text-xs dash-muted">
                  Required by European AML Directive 2018/843 to unlock unlimited property investing and withdrawals.
                </p>
              </div>
            </div>

            <form onSubmit={handleKYCSubmit} className="space-y-4">
              <div className="form-field">
                <label className="dash-text">Document Type</label>
                <select value={docType} onChange={(e) => setDocType(e.target.value)} className="dash-inner border dash-text">
                  <option value="Passport">International Passport</option>
                  <option value="National Identity Card">European National Identity Card (DNI / NIE)</option>
                  <option value="Driver's License">Driver's License</option>
                </select>
              </div>

              <div className="border-2 border-dashed border-inherit/40 rounded-2xl p-8 text-center dash-inner space-y-2">
                <UploadCloud className="w-8 h-8 dash-muted mx-auto" />
                <p className="text-xs font-bold dash-text">Upload Official Document Scan / Photo</p>
                <p className="text-[11px] dash-muted">
                  Supported formats: PDF, JPG, PNG (Max 15MB). Both front and back sides required for ID cards.
                </p>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="btn btn-primary text-xs font-bold px-8"
              >
                {isSubmitting ? 'Uploading to Compliance Encrypted Vault...' : 'Submit Document for Review'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
