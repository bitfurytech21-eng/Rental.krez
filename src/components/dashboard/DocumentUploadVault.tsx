import React, { useState, useRef } from 'react';
import { useAuth } from '../../lib/auth';
import { ledger } from '../../lib/ledger';
import { getAccountTypeLabel, getAccountTypeBadge } from '../../types/user';
import {
  User as UserIcon,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Lock,
  Shield,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Camera,
  Trash2,
  Smartphone,
  Globe,
  FileCheck2,
  Bell,
  LogOut,
  Sparkles,
  Check
} from 'lucide-react';

interface DocumentUploadVaultProps {
  onNavigateAdmin?: () => void;
  onNavigateWallet?: () => void;
}

export const DocumentUploadVault: React.FC<DocumentUploadVaultProps> = () => {
  const { user, refreshUser, updatePassword } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form states initialized with existing user profile data
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [phoneNumber, setPhoneNumber] = useState(user?.phoneNumber || '+34 612 345 678');
  const [country, setCountry] = useState(user?.country || 'Spain');
  const [dateOfBirth, setDateOfBirth] = useState(user?.dateOfBirth || '1988-06-15');
  const [taxId, setTaxId] = useState(user?.taxId || 'ES-Y7894561-X');
  const [address, setAddress] = useState(user?.address || 'Paseo de Gràcia 48, 4º 2ª');
  const [city, setCity] = useState(user?.city || 'Barcelona');
  const [postalCode, setPostalCode] = useState(user?.postalCode || '08007');

  // Password fields
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [isUpdatingPass, setIsUpdatingPass] = useState(false);

  // Security preferences
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(user?.twoFactorEnabled ?? true);
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [tradeConfirmations, setTradeConfirmations] = useState(true);

  // Feedback states
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isSavingPersonal, setIsSavingPersonal] = useState(false);
  const [isSavingContact, setIsSavingContact] = useState(false);

  if (!user) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center p-6 bg-white rounded-2xl border border-[#E3E8E3]">
        <div className="w-7 h-7 border-2 border-[#182D2A] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const showToast = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => {
      setFeedback((prev) => (prev?.message === message ? null : prev));
    }, 4500);
  };

  // Avatar Photo Handler
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('error', 'Please upload a valid image file (PNG, JPG, WebP).');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showToast('error', 'Profile photo size must be less than 5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      ledger.updateUserProfile(user.id, { avatarUrl: base64 });
      refreshUser();
      showToast('success', 'Profile photo updated successfully!');
    };
    reader.onerror = () => {
      showToast('error', 'Failed to read image file. Please try another.');
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = () => {
    ledger.updateUserProfile(user.id, { avatarUrl: '' });
    refreshUser();
    showToast('success', 'Profile photo removed.');
  };

  // Personal Details Save
  const handleSavePersonal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      showToast('error', 'Full name cannot be empty.');
      return;
    }

    setIsSavingPersonal(true);
    setTimeout(() => {
      ledger.updateUserProfile(user.id, {
        fullName: fullName.trim(),
        dateOfBirth,
        country,
        taxId: taxId.trim(),
      });
      refreshUser();
      setIsSavingPersonal(false);
      showToast('success', 'Personal information saved successfully.');
    }, 400);
  };

  // Contact Details Save
  const handleSaveContact = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingContact(true);
    setTimeout(() => {
      ledger.updateUserProfile(user.id, {
        phoneNumber: phoneNumber.trim(),
        address: address.trim(),
        city: city.trim(),
        postalCode: postalCode.trim(),
      });
      refreshUser();
      setIsSavingContact(false);
      showToast('success', 'Contact and residential details saved successfully.');
    }, 400);
  };

  // Password Update
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword) {
      showToast('error', 'Please enter your current password.');
      return;
    }
    if (newPassword.length < 8) {
      showToast('error', 'New password must be at least 8 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast('error', 'New password and confirm password do not match.');
      return;
    }

    setIsUpdatingPass(true);
    try {
      await updatePassword(newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      showToast('success', 'Your password has been updated successfully!');
    } catch (err: any) {
      showToast('error', err?.message || 'Failed to update password. Please try again.');
    } finally {
      setIsUpdatingPass(false);
    }
  };

  // Two-Factor Toggle
  const handleToggle2FA = () => {
    const nextVal = !twoFactorEnabled;
    setTwoFactorEnabled(nextVal);
    ledger.updateUserProfile(user.id, { twoFactorEnabled: nextVal });
    refreshUser();
    showToast(
      'success',
      nextVal
        ? 'Two-Factor Authentication (2FA) is now enabled for your account.'
        : 'Two-Factor Authentication (2FA) has been turned off.'
    );
  };

  const initials = user.fullName
    ? user.fullName
        .split(' ')
        .map((n) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : 'KZ';

  return (
    <div className="space-y-3 max-w-5xl mx-auto pb-6">
      {/* 1. Header: Standard Client Profile Settings */}
      <div className="bg-white p-3 sm:p-4 rounded-xl border border-[#E3E8E3] shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2 py-0.2 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 text-[9.5px] font-semibold uppercase mb-1">
              <UserIcon className="w-2.5 h-2.5 text-[#27845D]" />
              <span>Investor Portal · Client Account</span>
            </div>
            <h1 className="text-base sm:text-lg font-bold text-[#18211F] tracking-tight">
              Profile Settings
            </h1>
            <p className="text-[10.5px] text-[#69736F] mt-0.5">
              Manage personal details, contact information, credentials, and security preferences.
            </p>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#27845D] bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              <ShieldCheck className="w-3 h-3" />
              <span>Account Active</span>
            </span>
          </div>
        </div>
      </div>

      {/* Global Feedback Banner */}
      {feedback && (
        <div
          className={`p-3 sm:p-3.5 rounded-xl text-xs font-semibold flex items-center justify-between gap-3 animate-in fade-in ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-900'
              : 'bg-red-50 border border-red-200 text-red-900'
          }`}
        >
          <div className="flex items-center gap-2 min-w-0">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            )}
            <span className="truncate">{feedback.message}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="text-xs opacity-60 hover:opacity-100 font-bold cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* 2. Profile Photo & Investor Overview Card */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-[#E3E8E3] shadow-xs">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-5">
          {/* Avatar Preview & Actions */}
          <div className="relative group shrink-0 text-center">
            <div className="w-20 h-20 rounded-2xl bg-[#182D2A] text-[#B7E36A] flex items-center justify-center font-black text-xl overflow-hidden shadow-sm border-2 border-white ring-1 ring-[#DCE4DA]">
              {user.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={user.fullName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span>{initials}</span>
              )}
            </div>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handlePhotoUpload}
              accept="image/png, image/jpeg, image/webp"
              className="hidden"
            />
          </div>

          {/* Details & Controls */}
          <div className="flex-1 text-center sm:text-left min-w-0 space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-bold text-[#18211F]">{user.fullName}</h2>
                <div className="flex items-center justify-center sm:justify-start gap-1.5 text-xs text-[#69736F] mt-0.5">
                  <Mail className="w-3.5 h-3.5 text-[#27845D]" />
                  <span>{user.email}</span>
                  <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.2 rounded-full">
                    Verified
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-center sm:justify-end gap-2 pt-1 sm:pt-0">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-1.5 rounded-lg bg-[#182D2A] hover:bg-[#24423C] text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <Camera className="w-3.5 h-3.5 text-[#B7E36A]" />
                  <span>Upload Photo</span>
                </button>
                {user.avatarUrl && (
                  <button
                    type="button"
                    onClick={handleRemovePhoto}
                    className="px-2.5 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-xs font-semibold transition-all flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Remove</span>
                  </button>
                )}
              </div>
            </div>

            {/* Quick Badges Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-left">
              <div className="p-2 rounded-xl bg-[#F6F7F4] border border-[#E3E8E3]">
                <span className="text-[10px] text-[#69736F] block">Investor ID</span>
                <span className="text-xs font-mono font-bold text-[#18211F] truncate block">
                  {user.id}
                </span>
              </div>
              <div className="p-2 rounded-xl bg-[#F6F7F4] border border-[#E3E8E3]">
                <span className="text-[10px] text-[#69736F] block">Account Type</span>
                <span className="text-xs font-bold text-[#18211F] truncate block">
                  {getAccountTypeLabel(user.accountType, user.role)}
                </span>
              </div>
              <div className="p-2 rounded-xl bg-[#F6F7F4] border border-[#E3E8E3]">
                <span className="text-[10px] text-[#69736F] block">Compliance Status</span>
                <span className="text-xs font-bold text-emerald-800 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                  <span>Level 2 KYC</span>
                </span>
              </div>
              <div className="p-2 rounded-xl bg-[#F6F7F4] border border-[#E3E8E3]">
                <span className="text-[10px] text-[#69736F] block">Member Since</span>
                <span className="text-xs font-bold text-[#18211F] truncate block">
                  {new Date(user.createdAt).toLocaleDateString('en-GB', {
                    month: 'short',
                    year: 'numeric',
                  })}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Personal Information & Contact Details (2 Columns) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Form A: Personal Information */}
        <form
          onSubmit={handleSavePersonal}
          className="bg-white p-4 sm:p-5 rounded-2xl border border-[#E3E8E3] shadow-xs flex flex-col justify-between space-y-3.5"
        >
          <div className="space-y-3">
            <div className="border-b border-[#E3E8E3] pb-2.5">
              <h3 className="text-sm font-bold text-[#18211F] flex items-center gap-1.5">
                <UserIcon className="w-4 h-4 text-[#27845D]" />
                <span>Personal Information</span>
              </h3>
              <p className="text-[11px] text-[#69736F]">
                Legal personal details registered with your investor profile.
              </p>
            </div>

            <div className="space-y-2.5">
              <div>
                <label className="block text-[11px] font-bold text-[#18211F] mb-1">
                  Full Legal Name
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  placeholder="e.g. Gabrielle Snooks"
                  className="w-full px-3 py-1.5 rounded-lg border border-[#DCE4DA] text-xs font-medium text-[#18211F] focus:outline-none focus:ring-1 focus:ring-[#182D2A] focus:border-[#182D2A] bg-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-bold text-[#18211F] mb-1 flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-[#69736F]" />
                    <span>Date of Birth</span>
                  </label>
                  <input
                    type="date"
                    value={dateOfBirth}
                    onChange={(e) => setDateOfBirth(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border border-[#DCE4DA] text-xs font-medium text-[#18211F] focus:outline-none focus:ring-1 focus:ring-[#182D2A] bg-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#18211F] mb-1 flex items-center gap-1">
                    <Globe className="w-3 h-3 text-[#69736F]" />
                    <span>Country of Residence</span>
                  </label>
                  <select
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border border-[#DCE4DA] text-xs font-medium text-[#18211F] focus:outline-none focus:ring-1 focus:ring-[#182D2A] bg-white cursor-pointer"
                  >
                    <option value="Spain">Spain (ES)</option>
                    <option value="France">France (FR)</option>
                    <option value="Germany">Germany (DE)</option>
                    <option value="United Kingdom">United Kingdom (UK)</option>
                    <option value="Switzerland">Switzerland (CH)</option>
                    <option value="Monaco">Monaco (MC)</option>
                    <option value="Portugal">Portugal (PT)</option>
                    <option value="Italy">Italy (IT)</option>
                    <option value="Netherlands">Netherlands (NL)</option>
                    <option value="United States">United States (US)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#18211F] mb-1 flex items-center gap-1">
                  <FileCheck2 className="w-3 h-3 text-[#69736F]" />
                  <span>Tax ID / Fiscal Number</span>
                </label>
                <input
                  type="text"
                  value={taxId}
                  onChange={(e) => setTaxId(e.target.value)}
                  placeholder="e.g. NIE, NIF, Tax Identification Number"
                  className="w-full px-3 py-1.5 rounded-lg border border-[#DCE4DA] text-xs font-mono font-medium text-[#18211F] focus:outline-none focus:ring-1 focus:ring-[#182D2A] bg-white"
                />
              </div>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isSavingPersonal}
              className="w-full py-2 px-3 rounded-lg bg-[#182D2A] hover:bg-[#24423C] text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {isSavingPersonal ? (
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Check className="w-3.5 h-3.5 text-[#B7E36A]" />
              )}
              <span>Save Personal Information</span>
            </button>
          </div>
        </form>

        {/* Form B: Contact & Residential Details */}
        <form
          onSubmit={handleSaveContact}
          className="bg-white p-4 sm:p-5 rounded-2xl border border-[#E3E8E3] shadow-xs flex flex-col justify-between space-y-3.5"
        >
          <div className="space-y-3">
            <div className="border-b border-[#E3E8E3] pb-2.5">
              <h3 className="text-sm font-bold text-[#18211F] flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-[#27845D]" />
                <span>Contact & Residential Details</span>
              </h3>
              <p className="text-[11px] text-[#69736F]">
                Mailing address and direct communication channels.
              </p>
            </div>

            <div className="space-y-2.5">
              <div>
                <label className="block text-[11px] font-bold text-[#18211F] mb-1 flex items-center gap-1">
                  <Mail className="w-3 h-3 text-[#69736F]" />
                  <span>Email Address</span>
                </label>
                <div className="relative">
                  <input
                    type="email"
                    value={user.email}
                    disabled
                    className="w-full px-3 py-1.5 rounded-lg border border-[#DCE4DA] text-xs font-medium text-[#69736F] bg-[#F6F7F4] cursor-not-allowed"
                  />
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.2 rounded">
                    Primary
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#18211F] mb-1 flex items-center gap-1">
                  <Phone className="w-3 h-3 text-[#69736F]" />
                  <span>Mobile Phone Number</span>
                </label>
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="+34 600 000 000"
                  className="w-full px-3 py-1.5 rounded-lg border border-[#DCE4DA] text-xs font-medium text-[#18211F] focus:outline-none focus:ring-1 focus:ring-[#182D2A] bg-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#18211F] mb-1">
                  Street Address
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Street name, building, apartment/suite"
                  className="w-full px-3 py-1.5 rounded-lg border border-[#DCE4DA] text-xs font-medium text-[#18211F] focus:outline-none focus:ring-1 focus:ring-[#182D2A] bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-bold text-[#18211F] mb-1">
                    City / Municipality
                  </label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="e.g. Barcelona"
                    className="w-full px-3 py-1.5 rounded-lg border border-[#DCE4DA] text-xs font-medium text-[#18211F] focus:outline-none focus:ring-1 focus:ring-[#182D2A] bg-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#18211F] mb-1">
                    Postal / ZIP Code
                  </label>
                  <input
                    type="text"
                    value={postalCode}
                    onChange={(e) => setPostalCode(e.target.value)}
                    placeholder="e.g. 08007"
                    className="w-full px-3 py-1.5 rounded-lg border border-[#DCE4DA] text-xs font-medium text-[#18211F] focus:outline-none focus:ring-1 focus:ring-[#182D2A] bg-white"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isSavingContact}
              className="w-full py-2 px-3 rounded-lg bg-[#182D2A] hover:bg-[#24423C] text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {isSavingContact ? (
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Check className="w-3.5 h-3.5 text-[#B7E36A]" />
              )}
              <span>Save Contact Details</span>
            </button>
          </div>
        </form>
      </div>

      {/* 4. Password & Authentication Settings Card */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-[#E3E8E3] shadow-xs space-y-3.5">
        <div className="border-b border-[#E3E8E3] pb-2.5">
          <h3 className="text-sm font-bold text-[#18211F] flex items-center gap-1.5">
            <Lock className="w-4 h-4 text-[#27845D]" />
            <span>Password & Security Credentials</span>
          </h3>
          <p className="text-[11px] text-[#69736F]">
            Update your account password. Ensure it uses at least 8 characters with letters, numbers, and symbols.
          </p>
        </div>

        <form onSubmit={handleUpdatePassword} className="space-y-3 max-w-xl">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div>
              <label className="block text-[11px] font-bold text-[#18211F] mb-1">
                Current Password
              </label>
              <div className="relative">
                <input
                  type={showCurrentPass ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-1.5 pr-8 rounded-lg border border-[#DCE4DA] text-xs font-medium text-[#18211F] focus:outline-none focus:ring-1 focus:ring-[#182D2A] bg-white"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPass(!showCurrentPass)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#69736F] hover:text-[#18211F] cursor-pointer"
                >
                  {showCurrentPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#18211F] mb-1">
                New Password
              </label>
              <div className="relative">
                <input
                  type={showNewPass ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min 8 characters"
                  className="w-full px-3 py-1.5 pr-8 rounded-lg border border-[#DCE4DA] text-xs font-medium text-[#18211F] focus:outline-none focus:ring-1 focus:ring-[#182D2A] bg-white"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPass(!showNewPass)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#69736F] hover:text-[#18211F] cursor-pointer"
                >
                  {showNewPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#18211F] mb-1">
                Confirm New Password
              </label>
              <div className="relative">
                <input
                  type={showConfirmPass ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat new password"
                  className="w-full px-3 py-1.5 pr-8 rounded-lg border border-[#DCE4DA] text-xs font-medium text-[#18211F] focus:outline-none focus:ring-1 focus:ring-[#182D2A] bg-white"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPass(!showConfirmPass)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#69736F] hover:text-[#18211F] cursor-pointer"
                >
                  {showConfirmPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-1">
            <button
              type="submit"
              disabled={isUpdatingPass}
              className="py-2 px-4 rounded-lg bg-[#182D2A] hover:bg-[#24423C] text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {isUpdatingPass ? (
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <ShieldCheck className="w-3.5 h-3.5 text-[#B7E36A]" />
              )}
              <span>Update Password</span>
            </button>
            <span className="text-[11px] text-[#69736F]">
              Password must be at least 8 characters long.
            </span>
          </div>
        </form>
      </div>

      {/* 5. Account Security Settings & Two-Factor Authentication (2FA) */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-[#E3E8E3] shadow-xs space-y-3.5">
        <div className="border-b border-[#E3E8E3] pb-2.5">
          <h3 className="text-sm font-bold text-[#18211F] flex items-center gap-1.5">
            <Shield className="w-4 h-4 text-[#27845D]" />
            <span>Account Security & Login Protections</span>
          </h3>
          <p className="text-[11px] text-[#69736F]">
            Safeguard your portfolio balance, token holdings, and transactions with enhanced multi-factor security.
          </p>
        </div>

        <div className="space-y-3">
          {/* 2FA Toggle Item */}
          <div className="p-3.5 rounded-xl border border-[#DCE4DA] bg-[#F6F7F4] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#182D2A] text-[#B7E36A] flex items-center justify-center shrink-0">
                <Smartphone className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-bold text-[#18211F]">Two-Factor Authentication (2FA)</h4>
                  <span
                    className={`text-[9.5px] font-bold px-2 py-0.2 rounded-full ${
                      twoFactorEnabled
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {twoFactorEnabled ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
                <p className="text-[11px] text-[#69736F] mt-0.5">
                  Requires a 6-digit verification code from your authenticator app or SMS on each sign-in.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleToggle2FA}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0 ${
                twoFactorEnabled
                  ? 'bg-red-50 hover:bg-red-100 text-red-700 border border-red-200'
                  : 'bg-[#182D2A] hover:bg-[#24423C] text-white shadow-2xs'
              }`}
            >
              {twoFactorEnabled ? 'Disable 2FA' : 'Enable 2FA'}
            </button>
          </div>

          {/* Security Notification Toggles */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3 rounded-xl border border-[#E3E8E3] bg-white flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <Bell className="w-4 h-4 text-[#27845D] shrink-0" />
                <div>
                  <span className="text-xs font-bold text-[#18211F] block">Login Notifications</span>
                  <span className="text-[10px] text-[#69736F] block">Email alert on new device or location sign-in</span>
                </div>
              </div>
              <input
                type="checkbox"
                checked={emailAlerts}
                onChange={(e) => {
                  setEmailAlerts(e.target.checked);
                  showToast('success', 'Security notification preference saved.');
                }}
                className="w-4 h-4 rounded text-[#182D2A] focus:ring-[#182D2A] accent-[#182D2A] cursor-pointer"
              />
            </div>

            <div className="p-3 rounded-xl border border-[#E3E8E3] bg-white flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="w-4 h-4 text-[#27845D] shrink-0" />
                <div>
                  <span className="text-xs font-bold text-[#18211F] block">Transaction Confirmations</span>
                  <span className="text-[10px] text-[#69736F] block">Notify on wire deposit and token execution</span>
                </div>
              </div>
              <input
                type="checkbox"
                checked={tradeConfirmations}
                onChange={(e) => {
                  setTradeConfirmations(e.target.checked);
                  showToast('success', 'Transaction alert preference saved.');
                }}
                className="w-4 h-4 rounded text-[#182D2A] focus:ring-[#182D2A] accent-[#182D2A] cursor-pointer"
              />
            </div>
          </div>

          {/* Active Device Session */}
          <div className="p-3 rounded-xl border border-[#E3E8E3] bg-[#F6F7F4] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
            <div className="flex items-center gap-2.5">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <div>
                <span className="font-bold text-[#18211F]">Current Session: Web Dashboard</span>
                <span className="text-[10.5px] text-[#69736F] block">
                  IP: Protected · Encrypted HTTPS Session · Active Now
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => showToast('success', 'All other remote sessions have been terminated.')}
              className="px-2.5 py-1 rounded-lg border border-[#DCE4DA] hover:bg-white text-[#182D2A] text-[11px] font-semibold transition-colors cursor-pointer self-start sm:self-auto"
            >
              Sign Out Other Devices
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export const ProfileSettings = DocumentUploadVault;
export default DocumentUploadVault;
