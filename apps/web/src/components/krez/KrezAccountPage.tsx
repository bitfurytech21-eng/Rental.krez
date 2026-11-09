import React, { useEffect, useState } from 'react';
import { ArrowRight, CheckCircle2, LogOut, Crown } from 'lucide-react';
import { useAuth } from '../../lib/auth';
import { ledger } from '../../lib/ledger';
import { userApi } from '../../lib/api';
import { openKrezAuthModal } from './KrezAuthModal';
import { KrezReveal } from './KrezReveal';
import { UserMembershipCard } from '../club/UserMembershipCard';

interface KrezAccountPageProps {
  onNavigate: (path: string) => void;
}

export const KrezAccountPage: React.FC<KrezAccountPageProps> = ({ onNavigate }) => {
  const { user, logout, refreshUser } = useAuth();

  const [fullName, setFullName] = useState(user?.fullName || '');
  const [phoneNumber, setPhoneNumber] = useState(user?.phoneNumber || '');
  const [country, setCountry] = useState(user?.country || '');
  const [address, setAddress] = useState(user?.address || '');
  const [bankIban, setBankIban] = useState(user?.bankIban || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedNotice, setSavedNotice] = useState<string | null>(null);
  const [userMembership, setUserMembership] = useState(() => user ? ledger.getUserMembership(user.id) : null);
  const [tiers, setTiers] = useState(() => ledger.getMembershipTiers());

  const refreshMembership = () => {
    if (user) {
      setUserMembership(ledger.getUserMembership(user.id));
      setTiers(ledger.getMembershipTiers());
    }
  };

  useEffect(() => {
    if (!user) return;
    setFullName(user.fullName || '');
    setPhoneNumber(user.phoneNumber || '');
    setCountry(user.country || '');
    setAddress(user.address || '');
    setBankIban(user.bankIban || '');
    setUserMembership(ledger.getUserMembership(user.id));
    setTiers(ledger.getMembershipTiers());
  }, [user?.id]);

  if (!user) {
    return (
      <main className="min-h-[75vh] bg-background pt-header-offset pb-section-sm text-foreground">
        <div className="mx-auto max-w-container px-gutter md:px-gutter-md lg:px-gutter-lg">
          <KrezReveal>
            <div className="max-w-xl">
              <p className="text-xs font-semibold tracking-widest uppercase text-accent">
                Account
              </p>
              <h1 className="mt-3 text-4xl font-heading font-bold tracking-tight uppercase text-foreground md:text-5xl">
                Sign in to manage
                <br />
                your shares
              </h1>
              <p className="mt-4 text-base leading-relaxed text-muted">
                Access your registered contact details, SEPA or USDC payout instructions, and building holdings.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-4">
                <button
                  type="button"
                  onClick={() => openKrezAuthModal('login', '/account')}
                  className="inline-flex items-center gap-2 rounded-pill bg-primary px-6 py-3.5 text-xs font-semibold tracking-widest uppercase text-white transition-transform duration-fast hover:scale-hover active:scale-active cursor-pointer"
                >
                  <span>Sign in</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => openKrezAuthModal('register', '/account')}
                  className="rounded-pill border border-border bg-secondary px-6 py-3.5 text-xs font-semibold tracking-widest uppercase text-foreground transition-colors duration-fast hover:border-foreground cursor-pointer"
                >
                  Create account
                </button>
              </div>
            </div>
          </KrezReveal>
        </div>
      </main>
    );
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    setError(null);
    setSavedNotice(null);

    const trimmedName = fullName.trim();
    if (trimmedName.length < 2) {
      setError('Full name must contain at least 2 characters.');
      return;
    }

    const normalizedIban = bankIban.replace(/\s+/g, '').toUpperCase();
    if (normalizedIban && !/^[A-Z]{2}[0-9A-Z]{12,32}$/.test(normalizedIban)) {
      setError('Please enter a valid IBAN or leave the field blank.');
      return;
    }

    const updates = {
      fullName: trimmedName,
      phoneNumber: phoneNumber.trim(),
      country: country.trim(),
      address: address.trim(),
      bankIban: normalizedIban,
    };

    setSaving(true);
    try {
      ledger.updateUserProfile(user.id, updates);
      try {
        await userApi.updateProfile(updates);
      } catch {
        // Local ledger remains synced when running browser-only session
      }
      refreshUser();
      setBankIban(normalizedIban);
      setSavedNotice('Account and payout details saved.');
    } catch (err: any) {
      setError(err?.message || 'Unable to save changes. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="bg-background text-foreground">
      <section className="pt-header-offset pb-section-sm md:pb-section-spacing">
        <div className="mx-auto max-w-container px-gutter md:px-gutter-md lg:px-gutter-lg">
          <KrezReveal>
            <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
              <div>
                <p className="text-xs font-semibold tracking-widest uppercase text-accent">
                  Investor account
                </p>
                <h1 className="mt-3 text-4xl font-heading font-bold tracking-tight uppercase text-foreground md:text-5xl">
                  {user.fullName}
                </h1>
                <p className="mt-2 text-sm text-muted">{user.email}</p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => onNavigate('/dashboard')}
                  className="inline-flex items-center gap-2 rounded-pill bg-primary px-6 py-3 text-xs font-semibold tracking-widest uppercase text-white cursor-pointer"
                >
                  <span>Full investor dashboard</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    await logout();
                    onNavigate('/');
                  }}
                  className="inline-flex items-center gap-2 rounded-pill border border-border bg-secondary px-5 py-3 text-xs font-semibold tracking-widest uppercase text-foreground hover:border-foreground cursor-pointer"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span>Sign out</span>
                </button>
              </div>
            </div>
          </KrezReveal>

          {/* Summary Strip */}
          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            <div className="rounded-card bg-secondary p-card-pad">
              <p className="text-xs font-medium tracking-wider uppercase text-muted">
                Verification status
              </p>
              <p className="mt-2 text-xl font-heading font-bold capitalize text-foreground">
                {user.kycStatus}
              </p>
            </div>
            <div className="rounded-card bg-secondary p-card-pad">
              <p className="text-xs font-medium tracking-wider uppercase text-muted">
                Available cash
              </p>
              <p className="mt-2 text-xl font-heading font-bold tabular-nums text-foreground">
                €{(user.walletBalance || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
            <div className="rounded-card bg-secondary p-card-pad">
              <p className="text-xs font-medium tracking-wider uppercase text-muted">
                Invested capital
              </p>
              <p className="mt-2 text-xl font-heading font-bold tabular-nums text-foreground">
                €{(user.investedBalance || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
          </div>

          {/* Club Privé Membership Section */}
          <div className="mt-10">
            {userMembership ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-heading font-bold uppercase text-foreground flex items-center gap-2">
                    <Crown className="w-5 h-5 text-[#c59b4c]" />
                    <span>Club Privé Membership</span>
                  </h2>
                  <button
                    type="button"
                    onClick={() => onNavigate('/club')}
                    className="text-xs font-semibold uppercase tracking-wider text-accent hover:underline cursor-pointer"
                  >
                    View Club Details &rarr;
                  </button>
                </div>
                <div className="max-w-2xl">
                  <UserMembershipCard
                    membership={userMembership}
                    tiers={tiers}
                    onRefresh={refreshMembership}
                    onUpgradeClick={() => onNavigate('/club')}
                  />
                </div>
              </div>
            ) : (
              <div className="rounded-card border border-[#C5A880]/30 bg-gradient-to-r from-[#182D2A] to-[#0D1815] p-card-pad text-white flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-md">
                <div className="space-y-2 max-w-xl">
                  <div className="flex items-center gap-2 text-[#C5A880] text-xs font-bold uppercase tracking-widest">
                    <Crown className="w-4 h-4 text-[#C5A880]" />
                    <span>Exclusive Invitation · L&apos;Agence Club Privé</span>
                  </div>
                  <h3 className="text-xl font-heading font-bold text-white tracking-tight">
                    Elevate to Priority Off-Market Access
                  </h3>
                  <p className="text-xs text-white/70 leading-relaxed">
                    Join an international circle of discerning investors and homeowners. Enjoy priority allocations, private Madrid &amp; Parisian salons, and bespoke advisory.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onNavigate('/club')}
                  className="inline-flex items-center gap-2 rounded-pill bg-[#C5A880] px-6 py-3.5 text-xs font-bold tracking-widest uppercase text-[#0B1B30] hover:bg-[#B39369] transition-transform duration-fast hover:scale-hover active:scale-active cursor-pointer shrink-0 shadow-lg"
                >
                  <span>Explore Membership</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* Contact & Payout Details Form */}
          <div className="mt-12 max-w-2xl rounded-card border border-border bg-secondary/45 p-card-pad">
            <h2 className="text-xl font-heading font-bold uppercase text-foreground">
              Contact &amp; payout details
            </h2>
            <p className="mt-2 text-sm text-muted">
              Keep your registered holder details and SEPA IBAN current for monthly rental distributions.
            </p>

            <form onSubmit={handleSave} className="mt-6 space-y-5">
              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="krez-acc-name"
                    className="block text-xs font-semibold tracking-widest uppercase text-muted"
                  >
                    Full name
                  </label>
                  <input
                    id="krez-acc-name"
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="mt-2 w-full rounded-input border border-border bg-background px-4 py-3 text-sm text-foreground focus:border-primary focus:outline-none"
                  />
                </div>
                <div>
                  <label
                    htmlFor="krez-acc-phone"
                    className="block text-xs font-semibold tracking-widest uppercase text-muted"
                  >
                    Phone number
                  </label>
                  <input
                    id="krez-acc-phone"
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="+34 600 000 000"
                    className="mt-2 w-full rounded-input border border-border bg-background px-4 py-3 text-sm text-foreground focus:border-primary focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="krez-acc-country"
                    className="block text-xs font-semibold tracking-widest uppercase text-muted"
                  >
                    Country of residence
                  </label>
                  <input
                    id="krez-acc-country"
                    type="text"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    placeholder="Spain"
                    className="mt-2 w-full rounded-input border border-border bg-background px-4 py-3 text-sm text-foreground focus:border-primary focus:outline-none"
                  />
                </div>
                <div>
                  <label
                    htmlFor="krez-acc-iban"
                    className="block text-xs font-semibold tracking-widest uppercase text-muted"
                  >
                    SEPA payout IBAN
                  </label>
                  <input
                    id="krez-acc-iban"
                    type="text"
                    value={bankIban}
                    onChange={(e) => setBankIban(e.target.value)}
                    placeholder="ES91 2100 0418 4502 0005 1829"
                    className="mt-2 w-full rounded-input border border-border bg-background px-4 py-3 font-mono text-sm text-foreground focus:border-primary focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="krez-acc-address"
                  className="block text-xs font-semibold tracking-widest uppercase text-muted"
                >
                  Residential address
                </label>
                <input
                  id="krez-acc-address"
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Street, city, and postal code"
                  className="mt-2 w-full rounded-input border border-border bg-background px-4 py-3 text-sm text-foreground focus:border-primary focus:outline-none"
                />
              </div>

              {error && (
                <p className="rounded-input border border-red-300 bg-red-50 px-3.5 py-2.5 text-xs text-red-800" role="alert">
                  {error}
                </p>
              )}

              {savedNotice && (
                <p className="inline-flex items-center gap-2 text-xs font-medium text-primary" role="status">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>{savedNotice}</span>
                </p>
              )}

              <div>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-pill bg-primary px-7 py-3.5 text-xs font-semibold tracking-widest uppercase text-white transition-transform duration-fast hover:scale-hover active:scale-active disabled:opacity-50 cursor-pointer"
                >
                  {saving ? 'Saving...' : 'Save details'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </section>
    </main>
  );
};
