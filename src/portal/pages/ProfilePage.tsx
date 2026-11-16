import React, { useEffect, useState } from 'react';
import { Save } from 'lucide-react';
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
  const { refreshUser } = useAuth();
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

    setSaving(true);
    try {
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
      });
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
      toast.success('Profile and banking details saved.');
    } catch (err: any) {
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
  );
};
