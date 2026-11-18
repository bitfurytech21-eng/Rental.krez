import React, { useEffect, useState } from 'react';
import { Save, ShieldCheck, LockKeyhole } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../lib/auth';
import { usePortal } from '../state/PortalContext';
import { portalApi } from '../services/portalApi';
import { namesMatchAccountOwner, validateIban } from '../utils/validate';
import { LoadingSkeleton } from '../components/LoadingSkeleton';

const HOLDER_STORAGE_KEY_PREFIX = 'portal_bank_holder_';

interface ProfileFieldErrors {
  fullName?: string;
  bankHolder?: string;
  bankIban?: string;
}

export const ProfilePage: React.FC = () => {
  const toast = useToast();
  const { refreshUser, changePassword } = useAuth();
  const { loading, profile, sampleDataEnabled, refreshProfile } = usePortal();

  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [country, setCountry] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [taxId, setTaxId] = useState('');
  const [bankHolder, setBankHolder] = useState('');
  const [bankIban, setBankIban] = useState('');
  const [fieldErrors, setFieldErrors] = useState<ProfileFieldErrors>({});
  const [saving, setSaving] = useState(false);
  const [bankCodeRequested, setBankCodeRequested] = useState(false);
  const [bankSecurityCode, setBankSecurityCode] = useState('');
  const [bankCodeError, setBankCodeError] = useState<string | null>(null);
  const [bankMaskedEmail, setBankMaskedEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    if (!profile) return;
    setFullName(profile.fullName || '');
    setPhoneNumber(profile.phoneNumber || '');
    setCountry(profile.country || '');
    setAddress(profile.address || '');
    setCity(profile.city || '');
    setPostalCode(profile.postalCode || '');
    setTaxId(profile.taxId || '');
    setBankIban(profile.bankIban || '');

    let storedHolder = '';
    try {
      storedHolder = window.localStorage.getItem(`${HOLDER_STORAGE_KEY_PREFIX}${profile.id}`) || '';
    } catch {
      storedHolder = '';
    }
    setBankHolder(profile.bankAccountHolder || storedHolder || profile.fullName || '');
  }, [profile]);

  if (loading && !sampleDataEnabled && !profile) {
    return <LoadingSkeleton rows={4} />;
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;

    const nextErrors: ProfileFieldErrors = {};
    const trimmedName = fullName.trim();
    if (!trimmedName || trimmedName.length < 2) {
      nextErrors.fullName = 'Enter your full legal name (at least 2 characters).';
    }

    const cleanIban = bankIban.replace(/\s+/g, '').toUpperCase();
    const trimmedHolder = bankHolder.trim();
    if (cleanIban) {
      const ibanCheck = validateIban(cleanIban);
      if (!ibanCheck.valid) {
        nextErrors.bankIban = ibanCheck.error || 'Enter a valid IBAN.';
      }
      if (!trimmedHolder) {
        nextErrors.bankHolder = 'Enter the bank account holder name for this IBAN.';
      } else if (trimmedName && !namesMatchAccountOwner(trimmedName, trimmedHolder)) {
        nextErrors.bankHolder = 'Bank account holder must match your own legal name.';
      }
    } else if (trimmedHolder && trimmedName && !namesMatchAccountOwner(trimmedName, trimmedHolder)) {
      nextErrors.bankHolder = 'Bank account holder must match your own legal name.';
    }

    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    if (sampleDataEnabled) {
      toast.info('Sample data preview is active. Disable Sample data to save changes to your live profile.');
      return;
    }

    const bankChanged =
      cleanIban !== String(profile?.bankIban || '').replace(/\s+/g, '').toUpperCase() ||
      trimmedHolder.trim().toLowerCase() !== String(profile?.bankAccountHolder || profile?.fullName || '').trim().toLowerCase();

    setSaving(true);
    try {
      let bankGrantId: string | undefined;
      if (bankChanged) {
        if (!bankCodeRequested) {
          const verification = await portalApi.requestActionVerification('investor.profile.bank.update');
          setBankMaskedEmail(verification.maskedEmail || profile?.email || '');
          setBankCodeError(null);
          if (verification.otpRequired) {
            setBankCodeRequested(true);
            toast.info('A 6-digit bank-change security code was sent to ' + (verification.maskedEmail || 'your registered email') + '.');
            return;
          }
          bankGrantId = verification.grantId;
          if (!bankGrantId) throw new Error('Unable to prepare bank-account verification. Please try again.');
        } else {
          if (!/^\d{6}$/.test(bankSecurityCode.trim())) {
            setBankCodeError('Enter the 6-digit code sent to your email.');
            return;
          }
          bankGrantId = await portalApi.verifyActionCode('investor.profile.bank.update', bankSecurityCode.trim());
        }
      }

      await portalApi.updateProfile({
        fullName: trimmedName,
        phoneNumber: phoneNumber.trim(),
        country: country.trim(),
        address: address.trim(),
        city: city.trim(),
        postalCode: postalCode.trim(),
        taxId: taxId.trim(),
        bankIban: cleanIban,
        bankAccountHolder: trimmedHolder || trimmedName,
      }, bankChanged ? bankGrantId : undefined);
      if (profile?.id && bankHolder.trim()) {
        try {
          window.localStorage.setItem(
            `${HOLDER_STORAGE_KEY_PREFIX}${profile.id}`,
            bankHolder.trim()
          );
        } catch {
          // Ignore storage quota errors
        }
      }
      await Promise.all([refreshProfile(), refreshUser()]);
      setBankCodeRequested(false);
      setBankSecurityCode('');
      setBankCodeError(null);
      setBankMaskedEmail('');
      toast.success('Profile and banking details saved.');
    } catch (err: any) {
      setBankCodeError(err?.message || 'Unable to save profile updates.');
      toast.error(err?.message || 'Unable to save profile updates.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSave} noValidate className="max-w-3xl space-y-6">
      <div>
        <h2 className="text-xl font-heading font-bold text-[#F2F5F4]">Profile &amp; Banking</h2>
        <p className="text-sm text-[#8FA1A8] mt-0.5">
          Personal details and your registered SEPA bank account for withdrawals.
        </p>
      </div>

      <section className="portal-card space-y-4">
        <h3 className="text-sm font-semibold text-[#6FD8B0]">Personal details</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="prof-name" className="block text-sm font-medium text-[#F2F5F4] mb-1.5">
              Full legal name
            </label>
            <input
              id="prof-name"
              type="text"
              value={fullName}
              onChange={(e) => {
                setFullName(e.target.value);
                if (fieldErrors.fullName) setFieldErrors((p) => ({ ...p, fullName: undefined }));
              }}
              aria-invalid={Boolean(fieldErrors.fullName)}
              aria-describedby={fieldErrors.fullName ? 'prof-name-error' : undefined}
              className={`portal-input ${fieldErrors.fullName ? '!border-[#FB7185]' : ''}`}
            />
            {fieldErrors.fullName && (
              <p id="prof-name-error" role="alert" className="text-xs text-[#FB7185] mt-1.5">
                {fieldErrors.fullName}
              </p>
            )}
          </div>
          <div>
            <label htmlFor="prof-email" className="block text-sm font-medium text-[#F2F5F4] mb-1.5">
              Email (read-only)
            </label>
            <input
              id="prof-email"
              type="email"
              readOnly
              disabled
              value={profile?.email || ''}
              className="portal-input opacity-75 cursor-not-allowed"
            />
          </div>
          <div>
            <label htmlFor="prof-phone" className="block text-sm font-medium text-[#F2F5F4] mb-1.5">
              Phone number
            </label>
            <input
              id="prof-phone"
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              className="portal-input"
            />
          </div>
          <div>
            <label htmlFor="prof-country" className="block text-sm font-medium text-[#F2F5F4] mb-1.5">
              Country of residence
            </label>
            <input
              id="prof-country"
              type="text"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className="portal-input"
            />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="prof-address" className="block text-sm font-medium text-[#F2F5F4] mb-1.5">
              Street address
            </label>
            <input
              id="prof-address"
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="portal-input"
            />
          </div>
          <div>
            <label htmlFor="prof-city" className="block text-sm font-medium text-[#F2F5F4] mb-1.5">
              City
            </label>
            <input
              id="prof-city"
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="portal-input"
            />
          </div>
          <div>
            <label htmlFor="prof-postal" className="block text-sm font-medium text-[#F2F5F4] mb-1.5">
              Postal code
            </label>
            <input
              id="prof-postal"
              type="text"
              value={postalCode}
              onChange={(e) => setPostalCode(e.target.value)}
              className="portal-input"
            />
          </div>
        </div>
      </section>

      <section className="portal-card space-y-4">
        <h3 className="text-sm font-semibold text-[#6FD8B0]">Banking details</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="prof-bank-holder" className="block text-sm font-medium text-[#F2F5F4] mb-1.5">
              Bank account holder
            </label>
            <input
              id="prof-bank-holder"
              type="text"
              value={bankHolder}
              onChange={(e) => {
                setBankHolder(e.target.value);
                if (fieldErrors.bankHolder) setFieldErrors((p) => ({ ...p, bankHolder: undefined }));
              }}
              aria-invalid={Boolean(fieldErrors.bankHolder)}
              aria-describedby={fieldErrors.bankHolder ? 'prof-holder-error' : undefined}
              placeholder="Full name on bank account"
              className={`portal-input ${fieldErrors.bankHolder ? '!border-[#FB7185]' : ''}`}
            />
            {fieldErrors.bankHolder && (
              <p id="prof-holder-error" role="alert" className="text-xs text-[#FB7185] mt-1.5">
                {fieldErrors.bankHolder}
              </p>
            )}
          </div>
          <div>
            <label htmlFor="prof-tax" className="block text-sm font-medium text-[#F2F5F4] mb-1.5">
              Tax ID (NIF / TIN)
            </label>
            <input
              id="prof-tax"
              type="text"
              value={taxId}
              onChange={(e) => setTaxId(e.target.value)}
              className="portal-input font-mono"
            />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="prof-iban" className="block text-sm font-medium text-[#F2F5F4] mb-1.5">
              IBAN
            </label>
            <input
              id="prof-iban"
              type="text"
              value={bankIban}
              onChange={(e) => {
                setBankIban(e.target.value);
                if (fieldErrors.bankIban) setFieldErrors((p) => ({ ...p, bankIban: undefined }));
              }}
              aria-invalid={Boolean(fieldErrors.bankIban)}
              aria-describedby={fieldErrors.bankIban ? 'prof-iban-error' : undefined}
              placeholder="e.g. FR76 3000 6000 0112 3456 7890 189"
              className={`portal-input font-mono ${fieldErrors.bankIban ? '!border-[#FB7185]' : ''}`}
            />
            {fieldErrors.bankIban && (
              <p id="prof-iban-error" role="alert" className="text-xs text-[#FB7185] mt-1.5">
                {fieldErrors.bankIban}
              </p>
            )}
            {bankCodeRequested && (
              <div className="mt-4 space-y-2 rounded-xl border border-[#6FD8B0]/30 bg-[#6FD8B0]/5 p-4">
                <label htmlFor="bank-change-code" className="block text-sm font-semibold text-[#F2F5F4]">
                  Email security code {bankMaskedEmail ? 'sent to ' + bankMaskedEmail : ''}
                </label>
                <input
                  id="bank-change-code"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  value={bankSecurityCode}
                  onChange={(event) => {
                    setBankSecurityCode(event.target.value.replace(/\D/g, '').slice(0, 6));
                    setBankCodeError(null);
                  }}
                  placeholder="000000"
                  className="portal-input font-mono tracking-[0.3em]"
                />
                <p className="text-xs text-[#8FA1A8]">Enter the 6-digit code to authorize this bank-account change. Submit Save again to confirm.</p>
                {bankCodeError && <p role="alert" className="text-xs text-[#FB7185]">{bankCodeError}</p>}
              </div>
            )}
          </div>
        </div>
      </section>

      <div className="flex justify-end">
        <button type="submit" disabled={saving} className="portal-btn-primary">
          <Save className="w-4 h-4" />
          <span>{saving ? 'Saving...' : 'Save'}</span>
        </button>
      </div>
    </form>

    <section className="max-w-3xl portal-card space-y-5">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#6FD8B0]/30 bg-[#6FD8B0]/10 text-[#6FD8B0]">
          <LockKeyhole className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-[#F2F5F4]">Security</h3>
          <p className="mt-1 text-xs leading-relaxed text-[#8FA1A8]">Confirm your current password before choosing a new one.</p>
        </div>
      </div>
      <form onSubmit={async (event) => {
        event.preventDefault();
        if (changingPassword) return;
        if (newPassword.length < 12) { toast.error('New password must be at least 12 characters long.'); return; }
        if (newPassword !== confirmNewPassword) { toast.error('The new passwords do not match.'); return; }
        setChangingPassword(true);
        try {
          await changePassword(currentPassword, newPassword);
          setCurrentPassword('');
          setNewPassword('');
          setConfirmNewPassword('');
          toast.success('Password changed successfully.');
        } catch (err: any) {
          toast.error(err?.message || 'Unable to change password.');
        } finally {
          setChangingPassword(false);
        }
      }} className="space-y-3">
        <div>
          <label htmlFor="security-current-password" className="mb-1.5 block text-sm font-medium text-[#F2F5F4]">Current password</label>
          <input id="security-current-password" type="password" autoComplete="current-password" required value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} className="portal-input" />
        </div>
        <div>
          <label htmlFor="security-new-password" className="mb-1.5 block text-sm font-medium text-[#F2F5F4]">New password (at least 12 characters)</label>
          <input id="security-new-password" type="password" autoComplete="new-password" required minLength={12} value={newPassword} onChange={(event) => setNewPassword(event.target.value)} className="portal-input" />
        </div>
        <div>
          <label htmlFor="security-confirm-password" className="mb-1.5 block text-sm font-medium text-[#F2F5F4]">Confirm new password</label>
          <input id="security-confirm-password" type="password" autoComplete="new-password" required minLength={12} value={confirmNewPassword} onChange={(event) => setConfirmNewPassword(event.target.value)} className="portal-input" />
        </div>
        <button type="submit" disabled={changingPassword || !currentPassword || newPassword.length < 12 || newPassword !== confirmNewPassword} className="portal-btn-primary disabled:cursor-not-allowed disabled:opacity-50">
          <ShieldCheck className="h-4 w-4" />
          <span>{changingPassword ? 'Changing password…' : 'Change password'}</span>
        </button>
      </form>
      <div className="border-t border-[#1F2C33] pt-4">
        <h4 className="text-sm font-semibold text-[#F2F5F4]">What happens when you sign out</h4>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-xs leading-relaxed text-[#A9B8B5]">
          <li>Your active authenticated session is ended.</li>
          <li>Saved sign-in tokens and this browser’s cached account session are cleared.</li>
          <li>Portal preview and temporary interface state are cleared.</li>
          <li>You must authenticate again to access your account.</li>
          <li>Your profile, holdings and transaction history remain in the account; signing out does not delete financial records.</li>
        </ul>
      </div>
    </section>
  );
};
