import { safeErrorMessage } from '../../lib/safeErrorMessage';
import React, { useEffect, useState } from 'react';
import { AlertTriangle, Eye, EyeOff, LockKeyhole, Save, ShieldCheck } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../lib/auth';
import { usePortal } from '../state/PortalContext';
import { portalApi } from '../services/portalApi';
import { namesMatchAccountOwner, validateIban } from '../utils/validate';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import { SecurityCodePrompt } from '../components/SecurityCodePrompt';
import { getValidActionGrant, isActionVerifiedInSession } from '../../lib/actionVerificationSession';

const HOLDER_STORAGE_KEY_PREFIX = 'portal_bank_holder_';

interface ProfileFieldErrors {
  fullName?: string;
  bankHolder?: string;
  bankIban?: string;
}

export const ProfilePage: React.FC = () => {
  const toast = useToast();
  const { refreshUser, changePassword } = useAuth();
  const { loading, profile, sampleDataEnabled, refreshProfile, navigatePortal } = usePortal();

  const [fullName, setFullName] = useState('');
  const [bankHolder, setBankHolder] = useState('');
  const [bankIban, setBankIban] = useState('');
  const [fieldErrors, setFieldErrors] = useState<ProfileFieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [changingPassword, setChangingPassword] = useState(false);

  const [pendingOtpAction, setPendingOtpAction] = useState<'bank' | 'password' | null>(null);

  useEffect(() => {
    if (!profile) return;
    setFullName(profile.fullName || '');
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

  const executeSaveProfile = async (grantId?: string) => {
    const trimmedName = fullName.trim();
    const cleanIban = bankIban.replace(/\s+/g, '').toUpperCase();
    const trimmedHolder = bankHolder.trim();

    setSaving(true);
    setFormError(null);
    try {
      await portalApi.updateProfile(
        {
          fullName: trimmedName,
          bankAccountHolder: trimmedHolder || trimmedName,
          bankIban: cleanIban,
        },
        grantId
      );
      if (profile?.id && trimmedHolder) {
        try {
          window.localStorage.setItem(`${HOLDER_STORAGE_KEY_PREFIX}${profile.id}`, trimmedHolder);
        } catch {
          // Ignore storage quota errors
        }
      }
      await Promise.all([refreshProfile(), refreshUser()]);
      toast.success('Profile and banking details saved.');
    } catch (err: any) {
      const msg = safeErrorMessage(err, 'Unable to save profile updates.');
      setFormError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    setFormError(null);

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
      trimmedHolder.toLowerCase() !==
        String(profile?.bankAccountHolder || profile?.fullName || '').trim().toLowerCase();

    if (bankChanged) {
      const existingGrant = getValidActionGrant('investor.profile.bank.update');
      if (existingGrant) {
        await executeSaveProfile(existingGrant);
        return;
      }
      if (isActionVerifiedInSession()) {
        try {
          const sessionGrant = await portalApi.requestActionVerification('investor.profile.bank.update');
          if (!sessionGrant.otpRequired && sessionGrant.grantId) {
            await executeSaveProfile(sessionGrant.grantId);
            return;
          }
        } catch {
          // Fall through to modal prompt
        }
      }
      setPendingOtpAction('bank');
      return;
    }

    await executeSaveProfile(undefined);
  };

  const executePasswordChange = async (grantId?: string) => {
    setChangingPassword(true);
    setPasswordError(null);
    try {
      await changePassword(currentPassword, newPassword, grantId);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      setShowCurrentPassword(false);
      setShowNewPassword(false);
      setShowConfirmPassword(false);
      toast.success('Password changed successfully.');
    } catch (err: any) {
      const msg = safeErrorMessage(err, 'Unable to change password.');
      setPasswordError(msg);
      toast.error(msg);
    } finally {
      setChangingPassword(false);
    }
  };

  const handlePasswordSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (changingPassword) return;
    setPasswordError(null);

    if (!currentPassword) {
      setPasswordError('Enter your current password.');
      return;
    }
    if (newPassword.length < 12) {
      setPasswordError('New password must be at least 12 characters long.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setPasswordError('The new passwords do not match.');
      return;
    }

    if (sampleDataEnabled) {
      toast.info('Disable Sample data before changing your account password.');
      return;
    }

    const existingGrant = getValidActionGrant('investor.password.change');
    if (existingGrant) {
      await executePasswordChange(existingGrant);
      return;
    }
    if (isActionVerifiedInSession()) {
      try {
        const sessionGrant = await portalApi.requestActionVerification('investor.password.change');
        if (!sessionGrant.otpRequired && sessionGrant.grantId) {
          await executePasswordChange(sessionGrant.grantId);
          return;
        }
      } catch {
        // Fall through to modal prompt
      }
    }
    setPendingOtpAction('password');
  };

  return (
    <>
      <form onSubmit={handleSave} noValidate className="max-w-3xl space-y-6">
        <div>
          <h2 className="text-xl font-heading font-bold text-[#F2F5F4]">Profile &amp; Banking</h2>
          <p className="text-sm text-[#8FA1A8] mt-0.5">
            Edit your legal name and your registered SEPA bank account for withdrawals.
          </p>
        </div>

        {formError && (
          <div
            role="alert"
            className="rounded-xl border border-[#FB7185]/40 bg-[#FB7185]/10 p-3.5 text-sm text-[#FB7185]"
          >
            {formError}
          </div>
        )}

        <section className="portal-card space-y-4">
          <h3 className="text-sm font-semibold text-[#6FD8B0]">Investor details</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="prof-name" className="block text-sm font-medium text-[#F2F5F4] mb-1.5">
                Full name
              </label>
              <input
                id="prof-name"
                type="text"
                autoComplete="name"
                value={fullName}
                onChange={(e) => {
                  setFullName(e.target.value);
                  if (fieldErrors.fullName) setFieldErrors((p) => ({ ...p, fullName: undefined }));
                }}
                aria-invalid={Boolean(fieldErrors.fullName)}
                aria-describedby={fieldErrors.fullName ? 'prof-name-error' : undefined}
                className={`portal-input min-h-[44px] ${fieldErrors.fullName ? '!border-[#FB7185]' : ''}`}
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
                className="portal-input min-h-[44px] opacity-75 cursor-not-allowed"
              />
            </div>
          </div>
        </section>

        <section className="portal-card space-y-4">
          <h3 className="text-sm font-semibold text-[#6FD8B0]">Banking details</h3>

          <div className="flex items-start gap-2.5 rounded-xl border border-[#FCD34D]/35 bg-[#FCD34D]/10 p-3 text-xs text-[#FCD34D]">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
            <span>Changing your bank account affects future withdrawals and requires an email security code.</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
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
                className={`portal-input min-h-[44px] ${fieldErrors.bankHolder ? '!border-[#FB7185]' : ''}`}
              />
              {fieldErrors.bankHolder && (
                <p id="prof-holder-error" role="alert" className="text-xs text-[#FB7185] mt-1.5">
                  {fieldErrors.bankHolder}
                </p>
              )}
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
                className={`portal-input min-h-[44px] font-mono ${fieldErrors.bankIban ? '!border-[#FB7185]' : ''}`}
              />
              {fieldErrors.bankIban && (
                <p id="prof-iban-error" role="alert" className="text-xs text-[#FB7185] mt-1.5">
                  {fieldErrors.bankIban}
                </p>
              )}
            </div>
          </div>
        </section>

        <div className="flex justify-end">
          <button type="submit" disabled={saving} className="portal-btn-primary min-h-[44px]">
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving...' : 'Save changes'}</span>
          </button>
        </div>
      </form>

      <section className="max-w-3xl portal-card space-y-5 mt-6">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#6FD8B0]/30 bg-[#6FD8B0]/10 text-[#6FD8B0]">
            <LockKeyhole className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-[#F2F5F4]">Security</h3>
            <p className="mt-1 text-xs leading-relaxed text-[#8FA1A8]">
              Confirm your current password and verify via email security code to change your password.
            </p>
          </div>
        </div>

        <form onSubmit={handlePasswordSubmit} noValidate className="space-y-4">
          {passwordError && (
            <div
              role="alert"
              className="rounded-xl border border-[#FB7185]/40 bg-[#FB7185]/10 p-3 text-xs text-[#FB7185]"
            >
              {passwordError}
            </div>
          )}

          <div>
            <label htmlFor="security-current-password" className="mb-1.5 block text-sm font-medium text-[#F2F5F4]">
              Current password
            </label>
            <div className="relative">
              <input
                id="security-current-password"
                type={showCurrentPassword ? 'text' : 'password'}
                autoComplete="current-password"
                required
                value={currentPassword}
                onChange={(event) => {
                  setCurrentPassword(event.target.value);
                  if (passwordError) setPasswordError(null);
                }}
                className="portal-input min-h-[44px] !pr-12"
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword((prev) => !prev)}
                aria-label={showCurrentPassword ? 'Hide current password' : 'Show current password'}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 min-h-[44px] min-w-[44px] flex items-center justify-center text-[#8FA1A8] hover:text-[#F2F5F4] cursor-pointer"
              >
                {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label htmlFor="security-new-password" className="mb-1.5 block text-sm font-medium text-[#F2F5F4]">
              New password (at least 12 characters)
            </label>
            <div className="relative">
              <input
                id="security-new-password"
                type={showNewPassword ? 'text' : 'password'}
                autoComplete="new-password"
                required
                minLength={12}
                value={newPassword}
                onChange={(event) => {
                  setNewPassword(event.target.value);
                  if (passwordError) setPasswordError(null);
                }}
                className="portal-input min-h-[44px] !pr-12"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword((prev) => !prev)}
                aria-label={showNewPassword ? 'Hide new password' : 'Show new password'}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 min-h-[44px] min-w-[44px] flex items-center justify-center text-[#8FA1A8] hover:text-[#F2F5F4] cursor-pointer"
              >
                {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label htmlFor="security-confirm-password" className="mb-1.5 block text-sm font-medium text-[#F2F5F4]">
              Confirm new password
            </label>
            <div className="relative">
              <input
                id="security-confirm-password"
                type={showConfirmPassword ? 'text' : 'password'}
                autoComplete="new-password"
                required
                minLength={12}
                value={confirmNewPassword}
                onChange={(event) => {
                  setConfirmNewPassword(event.target.value);
                  if (passwordError) setPasswordError(null);
                }}
                className="portal-input min-h-[44px] !pr-12"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((prev) => !prev)}
                aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 min-h-[44px] min-w-[44px] flex items-center justify-center text-[#8FA1A8] hover:text-[#F2F5F4] cursor-pointer"
              >
                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={changingPassword}
            className="portal-btn-primary min-h-[44px] disabled:cursor-not-allowed disabled:opacity-50"
          >
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

      <SecurityCodePrompt
        isOpen={pendingOtpAction === 'bank'}
        actionScope="investor.profile.bank.update"
        title="Verify bank account change"
        description="Changing your withdrawal IBAN or account holder requires a 6-digit email security code."
        confirmLabel="Verify & save banking"
        onClose={() => setPendingOtpAction(null)}
        onContactSupport={() => navigatePortal('support')}
        onVerified={(grantId) => {
          setPendingOtpAction(null);
          void executeSaveProfile(grantId);
        }}
      />

      <SecurityCodePrompt
        isOpen={pendingOtpAction === 'password'}
        actionScope="investor.password.change"
        title="Verify password change"
        description="Changing your account password requires a 6-digit email security code."
        confirmLabel="Verify & update password"
        onClose={() => setPendingOtpAction(null)}
        onContactSupport={() => navigatePortal('support')}
        onVerified={(grantId) => {
          setPendingOtpAction(null);
          void executePasswordChange(grantId);
        }}
      />
    </>
  );
};
