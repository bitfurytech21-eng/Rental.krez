import React, { useEffect, useState } from 'react';
import { Save } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../lib/auth';
import { usePortal } from '../state/PortalContext';
import { portalApi } from '../services/portalApi';
import { validateIban } from '../utils/validate';

export const ProfilePage: React.FC = () => {
  const toast = useToast();
  const { refreshUser } = useAuth();
  const { profile, refreshProfile } = usePortal();

  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [country, setCountry] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [taxId, setTaxId] = useState('');
  const [bankIban, setBankIban] = useState('');
  const [cryptoDepositAddress, setCryptoDepositAddress] = useState('');
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
    setCryptoDepositAddress(profile.cryptoDepositAddress || '');
  }, [profile]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;

    if (bankIban.trim()) {
      const ibanCheck = validateIban(bankIban);
      if (!ibanCheck.valid) {
        toast.error(ibanCheck.error || 'Enter a valid IBAN.');
        return;
      }
    }

    setSaving(true);
    try {
      await portalApi.updateProfile({
        fullName: fullName.trim(),
        phoneNumber: phoneNumber.trim(),
        country: country.trim(),
        address: address.trim(),
        city: city.trim(),
        postalCode: postalCode.trim(),
        taxId: taxId.trim(),
        bankIban: bankIban.replace(/\s+/g, '').toUpperCase(),
        cryptoDepositAddress: cryptoDepositAddress.trim(),
      });
      await Promise.all([refreshProfile(), refreshUser()]);
      toast.success('Profile and banking details saved.');
    } catch (err: any) {
      toast.error(err?.message || 'Unable to save profile updates.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="max-w-3xl space-y-6">
      <div>
        <h2 className="text-xl font-heading font-bold text-white">Profile &amp; banking</h2>
        <p className="text-sm text-[#8EA7C7] mt-0.5">
          Registered investor identity and verified payout destinations.
        </p>
      </div>

      <section className="portal-card p-5 sm:p-6 space-y-4">
        <h3 className="text-sm font-semibold text-[#C5A880]">Investor identity</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="prof-name" className="block text-xs font-medium text-[#8EA7C7] mb-1.5">
              Full legal name
            </label>
            <input
              id="prof-name"
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="portal-input"
            />
          </div>
          <div>
            <label htmlFor="prof-email" className="block text-xs font-medium text-[#8EA7C7] mb-1.5">
              Registered email
            </label>
            <input
              id="prof-email"
              type="email"
              disabled
              value={profile?.email || ''}
              className="portal-input opacity-70 cursor-not-allowed"
            />
          </div>
          <div>
            <label htmlFor="prof-phone" className="block text-xs font-medium text-[#8EA7C7] mb-1.5">
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
            <label htmlFor="prof-country" className="block text-xs font-medium text-[#8EA7C7] mb-1.5">
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
            <label htmlFor="prof-address" className="block text-xs font-medium text-[#8EA7C7] mb-1.5">
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
            <label htmlFor="prof-city" className="block text-xs font-medium text-[#8EA7C7] mb-1.5">
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
            <label htmlFor="prof-postal" className="block text-xs font-medium text-[#8EA7C7] mb-1.5">
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

      <section className="portal-card p-5 sm:p-6 space-y-4">
        <h3 className="text-sm font-semibold text-[#C5A880]">Settlement &amp; fiscal details</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label htmlFor="prof-iban" className="block text-xs font-medium text-[#8EA7C7] mb-1.5">
              SEPA Withdrawal IBAN
            </label>
            <input
              id="prof-iban"
              type="text"
              value={bankIban}
              onChange={(e) => setBankIban(e.target.value)}
              placeholder="FR76 3000 6000 0112 3456 7890 189"
              className="portal-input font-mono"
            />
          </div>
          <div>
            <label htmlFor="prof-crypto" className="block text-xs font-medium text-[#8EA7C7] mb-1.5">
              USDC Settlement Address
            </label>
            <input
              id="prof-crypto"
              type="text"
              value={cryptoDepositAddress}
              onChange={(e) => setCryptoDepositAddress(e.target.value)}
              placeholder="0x... or Solana public key"
              className="portal-input font-mono"
            />
          </div>
          <div>
            <label htmlFor="prof-tax" className="block text-xs font-medium text-[#8EA7C7] mb-1.5">
              Tax identification number (NIF / TIN)
            </label>
            <input
              id="prof-tax"
              type="text"
              value={taxId}
              onChange={(e) => setTaxId(e.target.value)}
              className="portal-input font-mono"
            />
          </div>
        </div>
      </section>

      <div className="flex justify-end">
        <button type="submit" disabled={saving} className="portal-btn-primary">
          <Save className="w-4 h-4" />
          <span>{saving ? 'Saving changes...' : 'Save changes'}</span>
        </button>
      </div>
    </form>
  );
};
