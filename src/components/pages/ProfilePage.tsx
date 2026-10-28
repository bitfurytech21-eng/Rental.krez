import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../lib/auth';
import { useNavigation } from '../../context/NavigationContext';
import { useToast } from '../../context/ToastContext';
import { ledger } from '../../lib/ledger';
import { userApi } from '../../lib/api';
import { KYCStatus, getAccountTypeLabel, getAccountTypeBadge } from '../../types/user';
import {
  ShieldCheck,
  User as UserIcon,
  UploadCloud,
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  Palette,
  Check,
  Crown,
  Save,
  RotateCcw,
  FileText,
  X,
} from 'lucide-react';
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

const MAX_KYC_FILE_BYTES = 15 * 1024 * 1024; // 15MB

export const ProfilePage: React.FC<ProfilePageProps> = ({
  dashboardTheme,
  onSelectTheme,
}) => {
  const { user, refreshUser } = useAuth();
  const { navigateTo } = useNavigation();
  const toast = useToast();

  const [docType, setDocType] = useState('Passport');
  const [kycFile, setKycFile] = useState<File | null>(null);
  const [kycError, setKycError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const kycFileInputRef = useRef<HTMLInputElement | null>(null);

  const [message, setMessage] = useState<string | null>(null);
  const [localTheme, setLocalTheme] = useState<DashboardThemeId>(() => {
    return (localStorage.getItem('dashboard_theme') as DashboardThemeId) || 'slate';
  });

  // Editable Profile & Banking state
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [phoneNumber, setPhoneNumber] = useState(user?.phoneNumber || '');
  const [country, setCountry] = useState(user?.country || '');
  const [address, setAddress] = useState(user?.address || '');
  const [city, setCity] = useState(user?.city || '');
  const [postalCode, setPostalCode] = useState(user?.postalCode || '');
  const [taxId, setTaxId] = useState(user?.taxId || '');
  const [bankIban, setBankIban] = useState(user?.bankIban || '');
  const [profileError, setProfileError] = useState<string | null>(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  useEffect(() => {
    if (!user) return;
    setFullName(user.fullName || '');
    setPhoneNumber(user.phoneNumber || '');
    setCountry(user.country || '');
    setAddress(user.address || '');
    setCity(user.city || '');
    setPostalCode(user.postalCode || '');
    setTaxId(user.taxId || '');
    setBankIban(user.bankIban || '');
  }, [user?.id]);

  const activeTheme = dashboardTheme || localTheme;

  const handleThemeChange = (newTheme: DashboardThemeId) => {
    setLocalTheme(newTheme);
    localStorage.setItem('dashboard_theme', newTheme);
    if (user) {
      ledger.updateUserPreferences(user.id, { dashboardTheme: newTheme });
      userApi.savePreferences({ dashboardTheme: newTheme }).catch(() => {});
    }
    if (onSelectTheme) {
      onSelectTheme(newTheme);
    }
    window.dispatchEvent(new CustomEvent('dashboard-theme-changed', { detail: newTheme }));
    const themeLabel = THEME_OPTIONS.find((t) => t.id === newTheme)?.name || newTheme;
    setMessage(`Dashboard background tone updated to ${themeLabel}.`);
    toast.info(`Theme switched to ${themeLabel}`);
  };

  if (!user) return null;

  const hasProfileChanges =
    fullName.trim() !== (user.fullName || '') ||
    phoneNumber.trim() !== (user.phoneNumber || '') ||
    country.trim() !== (user.country || '') ||
    address.trim() !== (user.address || '') ||
    city.trim() !== (user.city || '') ||
    postalCode.trim() !== (user.postalCode || '') ||
    taxId.trim() !== (user.taxId || '') ||
    bankIban.trim() !== (user.bankIban || '');

  const handleResetProfileForm = () => {
    setFullName(user.fullName || '');
    setPhoneNumber(user.phoneNumber || '');
    setCountry(user.country || '');
    setAddress(user.address || '');
    setCity(user.city || '');
    setPostalCode(user.postalCode || '');
    setTaxId(user.taxId || '');
    setBankIban(user.bankIban || '');
    setProfileError(null);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSavingProfile) return;
    setProfileError(null);

    const trimmedName = fullName.trim();
    if (trimmedName.length < 2) {
      setProfileError('Legal full name must contain at least 2 characters.');
      return;
    }

    const normalizedIban = bankIban.replace(/\s+/g, '').toUpperCase();
    if (normalizedIban && !/^[A-Z]{2}[0-9A-Z]{12,32}$/.test(normalizedIban)) {
      setProfileError('Please enter a valid IBAN (e.g., ES9121000418450200051829) or leave blank.');
      return;
    }

    setIsSavingProfile(true);
    const updates = {
      fullName: trimmedName,
      phoneNumber: phoneNumber.trim(),
      country: country.trim(),
      address: address.trim(),
      city: city.trim(),
      postalCode: postalCode.trim(),
      taxId: taxId.trim(),
      bankIban: normalizedIban,
    };

    try {
      ledger.updateUserProfile(user.id, updates);
      try {
        await userApi.updateProfile(updates);
      } catch {
        // Local ledger remains synchronized if user session exists only in browser ledger
      }
      refreshUser();
      setBankIban(normalizedIban);
      setMessage('Personal investor profile and SEPA payout IBAN updated.');
      toast.success('Investor profile & banking details saved.');
    } catch (err: any) {
      const errMsg = err?.message || 'Unable to update profile details. Please try again.';
      setProfileError(errMsg);
      toast.error(errMsg);
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleKycFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setKycError(null);
    const selected = e.target.files?.[0];
    if (!selected) return;

    const validMime = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
    const extOk = /\.(pdf|jpe?g|png)$/i.test(selected.name);
    if (!validMime.includes(selected.type) && !extOk) {
      setKycError('Unsupported file format. Please select a PDF, JPG, or PNG file.');
      e.target.value = '';
      return;
    }

    if (selected.size > MAX_KYC_FILE_BYTES) {
      setKycError('Selected file exceeds the 15MB maximum compliance upload limit.');
      e.target.value = '';
      return;
    }

    setKycFile(selected);
  };

  const handleKYCSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setKycError(null);

    if (!kycFile) {
      setKycError('Please attach an official PDF, JPG, or PNG scan of your identity document before submitting.');
      return;
    }

    setIsSubmitting(true);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ''));
        reader.onerror = () => reject(new Error('Failed to read selected document file.'));
        reader.readAsDataURL(kycFile);
      });

      ledger.uploadVerificationDocument({
        userId: user.id,
        userName: user.fullName,
        userEmail: user.email,
        category: 'kyc_identity',
        title: `${docType} — Identity Verification`,
        documentType: docType,
        fileUrl: dataUrl,
        fileName: kycFile.name,
        fileSize: kycFile.size,
      });

      ledger.updateKYCStatus(user.id, 'pending', docType);
      refreshUser();
      setKycFile(null);
      if (kycFileInputRef.current) {
        kycFileInputRef.current.value = '';
      }
      const confirmMsg = `Identity document (${kycFile.name}) uploaded and queued for compliance review.`;
      setMessage(confirmMsg);
      toast.success('KYC identity document submitted for review.');
    } catch (err: any) {
      const errMsg = err?.message || 'Failed to upload KYC document. Please retry.';
      setKycError(errMsg);
      toast.error(errMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAvatarUpload = (base64: string) => {
    ledger.updateUserAvatar(user.id, base64);
    userApi.updateProfile({ avatarUrl: base64 }).catch(() => {});
    refreshUser();
    setMessage('Profile picture updated.');
    toast.success('Profile photo updated.');
  };

  const handleAvatarRemove = () => {
    ledger.updateUserAvatar(user.id, '');
    userApi.updateProfile({ avatarUrl: '' }).catch(() => {});
    refreshUser();
    setMessage('Custom profile picture removed.');
    toast.info('Profile photo removed.');
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
    <div className="py-4 space-y-6">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black dash-text">Account &amp; Verification</h1>
          <p className="text-xs dash-muted">
            Manage your personal investor profile, SEPA banking details, background theme, and KYC compliance status.
          </p>
        </div>

        {message && (
          <div className="p-3.5 rounded-2xl bg-emerald-500/15 text-emerald-500 text-xs font-bold border border-emerald-500/30 flex items-center justify-between gap-2">
            <span>{message}</span>
            <button
              type="button"
              onClick={() => setMessage(null)}
              className="p-1 opacity-75 hover:opacity-100 cursor-pointer"
              aria-label="Dismiss notification"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Profile Overview Card */}
        <div className="dash-card p-6 rounded-3xl border shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-inherit/30">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-[#182D2A] text-[#B7E36A] flex items-center justify-center font-bold text-lg overflow-hidden shadow-sm">
                {user.avatarUrl ? (
                  <img src={user.avatarUrl} alt={user.fullName} className="w-full h-full object-cover" />
                ) : (
                  user.fullName
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
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
          <div className="pt-1">
            <h3 className="text-sm font-bold dash-text mb-3">Custom Profile Photo</h3>
            <ImageUploader
              currentAvatarUrl={user.avatarUrl}
              userName={user.fullName}
              onUpload={handleAvatarUpload}
              onRemove={handleAvatarRemove}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
            <div className="p-3.5 rounded-2xl dash-inner border">
              <span className="dash-muted block mb-0.5">Investor ID</span>
              <span className="font-mono font-bold dash-text">{user.id}</span>
            </div>
            <div className="p-3.5 rounded-2xl dash-inner border">
              <span className="dash-muted block mb-0.5">Account Type</span>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="font-bold dash-text">{getAccountTypeLabel(user.accountType, user.role)}</span>
                <span className="text-[10px] font-bold text-[#27845D] bg-[#27845D]/10 px-2 py-0.5 rounded-full">
                  {getAccountTypeBadge(user.accountType, user.role)}
                </span>
              </div>
            </div>
            <div className="p-3.5 rounded-2xl dash-inner border">
              <span className="dash-muted block mb-0.5">Assigned Crypto Deposit Address</span>
              <span className="font-mono font-bold dash-text break-all">{user.cryptoDepositAddress}</span>
            </div>
            <div className="p-3.5 rounded-2xl dash-inner border">
              <span className="dash-muted block mb-0.5">Account Registered Since</span>
              <span className="font-bold dash-text">
                {new Date(user.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
              </span>
            </div>
          </div>
        </div>

        {/* Editable Personal & Banking Details Form */}
        <div className="dash-card p-6 rounded-3xl border shadow-sm space-y-5">
          <div className="flex items-center gap-3 pb-4 border-b border-inherit/30">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-500 border border-emerald-500/30 flex items-center justify-center shrink-0">
              <UserIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold dash-text">Personal &amp; SEPA Banking Details</h3>
              <p className="text-xs dash-muted">
                Keep your residence, fiscal identifier, and verified IBAN synchronized for rental dividend payouts and withdrawals.
              </p>
            </div>
          </div>

          {profileError && (
            <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-500 text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{profileError}</span>
            </div>
          )}

          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label htmlFor="profile-fullname" className="block font-semibold dash-text mb-1">
                  Legal Full Name *
                </label>
                <input
                  id="profile-fullname"
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl dash-inner border dash-text text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label htmlFor="profile-phone" className="block font-semibold dash-text mb-1">
                  Phone Number
                </label>
                <input
                  id="profile-phone"
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="+34 600 000 000"
                  className="w-full px-3 py-2 rounded-xl dash-inner border dash-text text-xs font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label htmlFor="profile-country" className="block font-semibold dash-text mb-1">
                  Country of Tax Residence
                </label>
                <input
                  id="profile-country"
                  type="text"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  placeholder="Spain / France / Switzerland"
                  className="w-full px-3 py-2 rounded-xl dash-inner border dash-text text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label htmlFor="profile-taxid" className="block font-semibold dash-text mb-1">
                  Tax ID / NIF / NIE
                </label>
                <input
                  id="profile-taxid"
                  type="text"
                  value={taxId}
                  onChange={(e) => setTaxId(e.target.value)}
                  placeholder="e.g. Y1234567Z"
                  className="w-full px-3 py-2 rounded-xl dash-inner border dash-text text-xs font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label htmlFor="profile-address" className="block font-semibold dash-text mb-1">
                  Street Address
                </label>
                <input
                  id="profile-address"
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Calle Serrano 41"
                  className="w-full px-3 py-2 rounded-xl dash-inner border dash-text text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="profile-city" className="block font-semibold dash-text mb-1">
                    City
                  </label>
                  <input
                    id="profile-city"
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Madrid"
                    className="w-full px-3 py-2 rounded-xl dash-inner border dash-text text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label htmlFor="profile-postal" className="block font-semibold dash-text mb-1">
                    Postal Code
                  </label>
                  <input
                    id="profile-postal"
                    type="text"
                    value={postalCode}
                    onChange={(e) => setPostalCode(e.target.value)}
                    placeholder="28001"
                    className="w-full px-3 py-2 rounded-xl dash-inner border dash-text text-xs font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="profile-iban" className="block font-semibold dash-text mb-1">
                  Verified SEPA Bank IBAN (For EUR Withdrawals &amp; Distributions)
                </label>
                <input
                  id="profile-iban"
                  type="text"
                  value={bankIban}
                  onChange={(e) => setBankIban(e.target.value)}
                  placeholder="ES91 2100 0418 4502 0005 1829"
                  className="w-full px-3 py-2 rounded-xl dash-inner border dash-text text-xs font-mono uppercase focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2.5 pt-2">
              {hasProfileChanges && (
                <button
                  type="button"
                  onClick={handleResetProfileForm}
                  disabled={isSavingProfile}
                  className="px-4 py-2 rounded-xl dash-inner border text-xs font-semibold dash-text hover:opacity-90 inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Discard Changes</span>
                </button>
              )}
              <button
                type="submit"
                disabled={isSavingProfile || !hasProfileChanges}
                className="btn btn-primary text-xs font-bold px-5 py-2 rounded-xl inline-flex items-center gap-1.5 disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{isSavingProfile ? 'Saving Profile...' : 'Save Profile & Banking'}</span>
              </button>
            </div>
          </form>
        </div>

        {/* Kretz Club Privé Membership Status */}
        {(() => {
          const userMem = ledger.getUserMembership(user.id);
          const tiers = ledger.getMembershipTiers();
          return (
            <div className="dash-card p-6 rounded-3xl border shadow-sm space-y-4">
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
                <button
                  type="button"
                  onClick={() => navigateTo('/club')}
                  className="px-3.5 py-1.5 rounded-xl border border-inherit/30 text-xs font-semibold hover:bg-white/10 transition-colors cursor-pointer"
                >
                  Club Portal →
                </button>
              </div>

              {userMem ? (
                <UserMembershipCard
                  membership={userMem}
                  tiers={tiers}
                  onRefresh={refreshUser}
                  onUpgradeClick={() => navigateTo('/club')}
                />
              ) : (
                <div className="p-5 rounded-2xl dash-inner border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <p className="font-bold dash-text text-sm">No Active Membership Pass</p>
                    <p className="text-xs dash-muted">
                      Unlock confidential off-market property dossiers, private salon cocktail invitations, and dedicated lifestyle advisory.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => navigateTo('/club')}
                    className="px-5 py-2.5 rounded-xl bg-[#182D2A] text-[#B7E36A] font-bold text-xs hover:bg-[#24423C] transition-colors whitespace-nowrap cursor-pointer"
                  >
                    Explore Membership Tiers
                  </button>
                </div>
              )}
            </div>
          );
        })()}

        {/* Account Type Switcher Component */}
        <AccountTypeSwitcher user={user} onRefresh={refreshUser} onMessage={(m) => setMessage(m)} />

        {/* Dashboard Appearance & Color Theme Settings Feature */}
        <div className="dash-card p-6 rounded-3xl border shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-inherit/30">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500/20 to-sky-500/20 text-sky-400 border border-sky-500/30 flex items-center justify-center">
                <Palette className="w-5 h-5 text-sky-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold dash-text">Dashboard Background &amp; Appearance</h3>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/15 text-sky-400 border border-sky-500/30">
                    Live Tone
                  </span>
                </div>
                <p className="text-xs dash-muted">
                  Choose your dashboard background color tone. Synced across your sessions.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs font-semibold dash-muted bg-inherit/10 px-3 py-1.5 rounded-xl border border-inherit/20 self-start sm:self-auto">
              <span>Active Theme:</span>
              <span className="text-emerald-400 font-bold">
                {THEME_OPTIONS.find((t) => t.id === activeTheme)?.name}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {THEME_OPTIONS.map((opt) => {
              const isSelected = activeTheme === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => handleThemeChange(opt.id)}
                  aria-pressed={isSelected}
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
          <div className="dash-card p-6 rounded-3xl border shadow-sm space-y-5">
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

            {kycError && (
              <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-500 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{kycError}</span>
              </div>
            )}

            <form onSubmit={handleKYCSubmit} className="space-y-4">
              <div className="form-field">
                <label htmlFor="kyc-doc-type" className="dash-text text-xs font-semibold">
                  Document Type
                </label>
                <select
                  id="kyc-doc-type"
                  value={docType}
                  onChange={(e) => setDocType(e.target.value)}
                  className="dash-inner border dash-text rounded-xl px-3 py-2 text-xs"
                >
                  <option value="Passport">International Passport</option>
                  <option value="National Identity Card">European National Identity Card (DNI / NIE)</option>
                  <option value="Driver's License">Driver&apos;s License</option>
                </select>
              </div>

              <div>
                <input
                  ref={kycFileInputRef}
                  id="kyc-file-upload"
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={handleKycFileChange}
                  className="sr-only"
                />
                <label
                  htmlFor="kyc-file-upload"
                  className="block border-2 border-dashed border-inherit/40 hover:border-emerald-500/60 rounded-2xl p-6 text-center dash-inner space-y-2 cursor-pointer transition-colors"
                >
                  <UploadCloud className="w-8 h-8 dash-muted mx-auto" />
                  <p className="text-xs font-bold dash-text">
                    {kycFile ? 'Replace Selected Identity Document' : 'Click to Select Official Document Scan / Photo'}
                  </p>
                  <p className="text-[11px] dash-muted">
                    Supported formats: PDF, JPG, PNG (Max 15MB). Both front and back sides required for ID cards.
                  </p>
                </label>

                {kycFile && (
                  <div className="mt-2.5 p-3 rounded-xl dash-inner border flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span className="font-semibold dash-text truncate">{kycFile.name}</span>
                      <span className="font-mono text-[10.5px] dash-muted shrink-0">
                        ({(kycFile.size / 1024).toFixed(1)} KB)
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setKycFile(null);
                        if (kycFileInputRef.current) kycFileInputRef.current.value = '';
                      }}
                      className="text-rose-500 hover:underline font-semibold text-xs cursor-pointer shrink-0"
                    >
                      Remove
                    </button>
                  </div>
                )}
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
