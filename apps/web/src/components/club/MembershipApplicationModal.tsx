import React, { useState, useEffect, useRef } from 'react';
import { MembershipTier, MembershipTierId, MembershipBillingCycle, UserMembership } from '../../types/membership';
import { useAuth } from '../../lib/auth';
import { ledger } from '../../lib/ledger';
import { membershipApi } from '../../lib/api';
import { formatCurrency } from '../../lib/utils';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
import {
  Crown,
  ShieldCheck,
  AlertTriangle,
  CreditCard,
  Wallet,
  Building2,
  ArrowRight,
  Check,
  ChevronDown,
  X,
  LogIn,
} from 'lucide-react';

interface MembershipApplicationModalProps {
  initialTierId?: MembershipTierId;
  tiers: MembershipTier[];
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (membership: UserMembership) => void;
  onNavigateLogin?: () => void;
}

export const MembershipApplicationModal: React.FC<MembershipApplicationModalProps> = ({
  initialTierId = 'sovereign',
  tiers,
  isOpen,
  onClose,
  onSuccess,
  onNavigateLogin,
}) => {
  const { user } = useAuth();
  const [selectedTierId, setSelectedTierId] = useState<MembershipTierId>(initialTierId);
  const [billingCycle, setBillingCycle] = useState<MembershipBillingCycle>('annual');
  const [paymentMethod, setPaymentMethod] = useState<
    'wallet_balance' | 'bank_wire' | 'credit_card' | 'complimentary_invitation'
  >('bank_wire');

  // Form fields
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phoneNumber || '+34 ');
  const [preferredRegion, setPreferredRegion] = useState('Madrid & Balearic Islands');
  const [invitationCode, setInvitationCode] = useState('');
  const [specialRequests, setSpecialRequests] = useState('');

  // Safeguards agreement
  const [agreeSafeguards, setAgreeSafeguards] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);

  // States
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollBodyRef = useRef<HTMLDivElement>(null);

  const selectedTier = tiers.find((t) => t.id === selectedTierId) || tiers[0];
  const fee = selectedTier
    ? billingCycle === 'annual'
      ? selectedTier.priceAnnual
      : selectedTier.priceMonthly
    : 0;
  const hasSufficientWallet = Boolean(user && user.walletBalance >= fee);

  // Sync tier selection and sensible payment default whenever modal opens or user/tier changes
  useEffect(() => {
    if (!isOpen) return;
    setSelectedTierId(initialTierId);
    setError(null);
    if (user?.fullName) setFullName(user.fullName);
    if (user?.email) setEmail(user.email);
    if (user?.phoneNumber) setPhone(user.phoneNumber);
  }, [isOpen, initialTierId, user]);

  useEffect(() => {
    if (!isOpen) return;
    if (user && user.walletBalance >= fee) {
      setPaymentMethod((prev) => (prev === 'bank_wire' ? 'wallet_balance' : prev));
    } else if (!user && paymentMethod === 'wallet_balance') {
      setPaymentMethod('bank_wire');
    }
  }, [isOpen, user, fee, paymentMethod]);

  // Allow Escape key to dismiss modal
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSubmitting) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isSubmitting, onClose]);

  if (!isOpen || !selectedTier) return null;

  const showValidationError = (msg: string) => {
    setError(msg);
    scrollBodyRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setError(null);

    const trimmedName = fullName.trim();
    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedName || !trimmedEmail) {
      showValidationError('Please provide your full legal name and email address.');
      return;
    }

    if (!EMAIL_PATTERN.test(trimmedEmail)) {
      showValidationError('Please enter a valid email address.');
      return;
    }

    if (!agreeSafeguards) {
      showValidationError(
        'You must confirm that you understand membership privileges are distinct from property ownership and investment products.'
      );
      return;
    }

    if (!agreeTerms) {
      showValidationError('Please accept the membership dues schedule and cancellation policy.');
      return;
    }

    if (paymentMethod === 'complimentary_invitation' && !invitationCode.trim()) {
      showValidationError("Please enter a valid private invitation code provided by L'Agence Partners.");
      return;
    }

    if (paymentMethod === 'wallet_balance') {
      if (!user) {
        showValidationError('Please sign in to pay with your wallet balance, or choose SEPA Wire or Credit Card.');
        return;
      }
      if (!hasSufficientWallet) {
        showValidationError(
          `Insufficient wallet balance (${formatCurrency(user.walletBalance)}). Please choose SEPA Wire, Credit Card, or deposit funds first.`
        );
        return;
      }
    }

    setIsSubmitting(true);

    try {
      await membershipApi.apply({
        fullName: trimmedName,
        email: trimmedEmail,
        phone: phone.trim(),
        tierId: selectedTierId,
        billingCycle,
        paymentMethod,
        preferredRegion,
        invitationCode: invitationCode.trim() || undefined,
        specialRequests: specialRequests.trim() || undefined,
      });

      const membership = ledger.subscribeMembership({
        userId: user?.id || 'usr-guest-' + Math.random().toString(36).substring(2, 7),
        userEmail: trimmedEmail,
        userName: trimmedName,
        tierId: selectedTierId,
        billingCycle,
        paymentMethod,
        specialRequests: specialRequests.trim(),
        preferredRegion,
      });

      onSuccess(membership);
    } catch (err: any) {
      showValidationError(err?.message || 'Failed to process membership subscription.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputBaseClass =
    'w-full h-11 px-3.5 rounded-xl border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 text-base sm:text-sm font-medium focus:border-[#182D2A] focus:ring-2 focus:ring-[#182D2A]/15 focus:outline-none transition-colors';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="membership-modal-title"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) onClose();
      }}
    >
      <div
        className="bg-white text-slate-900 [color-scheme:light] rounded-t-2xl sm:rounded-2xl max-w-2xl w-full max-h-[92dvh] sm:max-h-[88vh] flex flex-col text-left border border-slate-200 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Pinned Modal Header */}
        <div className="px-4 py-3.5 sm:px-7 sm:py-5 border-b border-slate-200 bg-white flex items-start justify-between gap-3 shrink-0">
          <div className="space-y-1 min-w-0">
            <div className="inline-flex items-center gap-1.5 text-emerald-800 text-[11px] font-bold uppercase tracking-wider">
              <Crown className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
              <span className="truncate">L'Agence Club Privé · Onboarding</span>
            </div>
            <h2
              id="membership-modal-title"
              className="text-lg sm:text-2xl font-extrabold text-slate-900 tracking-tight leading-snug"
            >
              Elevate Your Real Estate Journey
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 leading-normal">
              Join an international circle of discerning clients, investors, and homeowners.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Close membership application"
            className="min-w-[44px] min-h-[44px] -mr-1 -mt-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-950 flex items-center justify-center cursor-pointer transition-colors shrink-0 disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
          <div
            ref={scrollBodyRef}
            className="flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-7 sm:py-6 space-y-6"
          >
            {error && (
              <div
                role="alert"
                className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs sm:text-sm font-medium flex items-start gap-2.5"
              >
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Step 1: Tier Selection */}
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  1. Select Membership Tier
                </span>

                {/* Billing Cycle Switcher */}
                <div className="inline-flex items-center gap-1 p-1 bg-slate-100 rounded-xl border border-slate-200/80 text-[11px]">
                  <button
                    type="button"
                    onClick={() => setBillingCycle('annual')}
                    className={`min-h-[32px] px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                      billingCycle === 'annual'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Annual (Save 15%)
                  </button>
                  <button
                    type="button"
                    onClick={() => setBillingCycle('monthly')}
                    className={`min-h-[32px] px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                      billingCycle === 'monthly'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Monthly
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {tiers.map((t) => {
                  const isSelected = t.id === selectedTierId;
                  const price = billingCycle === 'annual' ? t.priceAnnual : t.priceMonthly;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setSelectedTierId(t.id)}
                      aria-pressed={isSelected}
                      className={`p-3.5 sm:p-4 rounded-xl border text-left transition-all cursor-pointer relative flex flex-col justify-between ${
                        isSelected
                          ? 'border-[#182D2A] bg-emerald-50/50 ring-2 ring-[#182D2A]/15 shadow-xs'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">
                            {t.badge.split('·')[0].trim()}
                          </span>
                          <span
                            className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                              isSelected
                                ? 'bg-[#182D2A] text-white'
                                : 'border border-slate-300 bg-white text-transparent'
                            }`}
                          >
                            <Check className="w-3 h-3" />
                          </span>
                        </div>
                        <div className="font-bold text-sm text-slate-900 leading-snug">{t.name}</div>
                        <p className="text-xs text-slate-600 mt-1 line-clamp-2 leading-relaxed">
                          {t.tagline}
                        </p>
                      </div>

                      <div className="mt-3 pt-2.5 border-t border-slate-200/80 flex items-baseline gap-0.5">
                        <span className="text-base font-extrabold text-slate-900 font-mono tabular-nums">
                          {formatCurrency(price)}
                        </span>
                        <span className="text-xs font-medium text-slate-500">
                          /{billingCycle === 'annual' ? 'yr' : 'mo'}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Step 2: Applicant Credentials */}
            <div className="space-y-3 pt-1">
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wider block">
                2. Applicant Credentials
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label
                    htmlFor="member-full-name"
                    className="text-xs font-semibold text-slate-800 block mb-1.5"
                  >
                    Full Legal Name
                  </label>
                  <input
                    id="member-full-name"
                    type="text"
                    required
                    autoComplete="name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. David Vance"
                    className={inputBaseClass}
                  />
                </div>

                <div>
                  <label
                    htmlFor="member-email"
                    className="text-xs font-semibold text-slate-800 block mb-1.5"
                  >
                    Email Address
                  </label>
                  <input
                    id="member-email"
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@domain.com"
                    className={inputBaseClass}
                  />
                </div>

                <div>
                  <label
                    htmlFor="member-phone"
                    className="text-xs font-semibold text-slate-800 block mb-1.5"
                  >
                    Phone / WhatsApp
                  </label>
                  <input
                    id="member-phone"
                    type="tel"
                    autoComplete="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+34 600 000 000"
                    className={inputBaseClass}
                  />
                </div>

                <div>
                  <label
                    htmlFor="member-region"
                    className="text-xs font-semibold text-slate-800 block mb-1.5"
                  >
                    Primary Real Estate Region
                  </label>
                  <div className="relative">
                    <select
                      id="member-region"
                      value={preferredRegion}
                      onChange={(e) => setPreferredRegion(e.target.value)}
                      className={`${inputBaseClass} appearance-none pr-10 cursor-pointer`}
                    >
                      <option value="Madrid & Balearic Islands" className="bg-white text-slate-900">
                        Madrid &amp; Balearic Islands (Spain)
                      </option>
                      <option value="Barcelona & Costa Brava" className="bg-white text-slate-900">
                        Barcelona &amp; Costa Brava (Spain)
                      </option>
                      <option value="Paris & French Riviera" className="bg-white text-slate-900">
                        Paris &amp; French Riviera (France)
                      </option>
                      <option value="Monaco & International" className="bg-white text-slate-900">
                        Monaco &amp; International Capitals
                      </option>
                      <option value="Caribbean & Americas" className="bg-white text-slate-900">
                        St. Barts &amp; United States
                      </option>
                    </select>
                    <ChevronDown
                      aria-hidden="true"
                      className="w-4 h-4 text-slate-500 pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Step 3: Payment Arrangement */}
            <div className="space-y-3 pt-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  3. Payment Arrangement (
                  <span className="font-mono tabular-nums">{formatCurrency(fee)}</span>)
                </span>
                {!user && onNavigateLogin && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onNavigateLogin();
                    }}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-800 hover:text-emerald-950 underline cursor-pointer"
                  >
                    <LogIn className="w-3.5 h-3.5" />
                    <span>Sign in to use Wallet</span>
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <button
                  type="button"
                  disabled={!user}
                  onClick={() => {
                    if (user) setPaymentMethod('wallet_balance');
                  }}
                  aria-pressed={paymentMethod === 'wallet_balance'}
                  className={`min-h-[76px] p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
                    !user
                      ? 'border-slate-200 bg-slate-50 text-slate-500 opacity-75 cursor-not-allowed'
                      : paymentMethod === 'wallet_balance'
                      ? 'border-[#182D2A] bg-emerald-50/60 ring-2 ring-[#182D2A]/15 text-slate-900 cursor-pointer'
                      : 'border-slate-200 bg-white text-slate-900 hover:border-slate-300 cursor-pointer'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <Wallet className={`w-4 h-4 ${!user ? 'text-slate-400' : 'text-emerald-800'}`} />
                    {paymentMethod === 'wallet_balance' && user && (
                      <Check className="w-3.5 h-3.5 text-emerald-800" />
                    )}
                  </div>
                  <div className="mt-1.5">
                    <div className={`text-xs font-bold ${!user ? 'text-slate-600' : 'text-slate-900'}`}>
                      Wallet Balance
                    </div>
                    <div className="text-[11px] text-slate-600 font-medium font-mono tabular-nums">
                      {user ? `Avail: ${formatCurrency(user.walletBalance)}` : 'Requires Login'}
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('bank_wire')}
                  aria-pressed={paymentMethod === 'bank_wire'}
                  className={`min-h-[76px] p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                    paymentMethod === 'bank_wire'
                      ? 'border-[#182D2A] bg-emerald-50/60 ring-2 ring-[#182D2A]/15 text-slate-900'
                      : 'border-slate-200 bg-white text-slate-900 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <Building2 className="w-4 h-4 text-emerald-800" />
                    {paymentMethod === 'bank_wire' && (
                      <Check className="w-3.5 h-3.5 text-emerald-800" />
                    )}
                  </div>
                  <div className="mt-1.5">
                    <div className="text-xs font-bold text-slate-900">SEPA Wire</div>
                    <div className="text-[11px] text-slate-600 font-medium">Bank Invoice</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('credit_card')}
                  aria-pressed={paymentMethod === 'credit_card'}
                  className={`min-h-[76px] p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                    paymentMethod === 'credit_card'
                      ? 'border-[#182D2A] bg-emerald-50/60 ring-2 ring-[#182D2A]/15 text-slate-900'
                      : 'border-slate-200 bg-white text-slate-900 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <CreditCard className="w-4 h-4 text-emerald-800" />
                    {paymentMethod === 'credit_card' && (
                      <Check className="w-3.5 h-3.5 text-emerald-800" />
                    )}
                  </div>
                  <div className="mt-1.5">
                    <div className="text-xs font-bold text-slate-900">Credit Card</div>
                    <div className="text-[11px] text-slate-600 font-medium">Visa / Amex</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('complimentary_invitation')}
                  aria-pressed={paymentMethod === 'complimentary_invitation'}
                  className={`min-h-[76px] p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                    paymentMethod === 'complimentary_invitation'
                      ? 'border-[#182D2A] bg-emerald-50/60 ring-2 ring-[#182D2A]/15 text-slate-900'
                      : 'border-slate-200 bg-white text-slate-900 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <ShieldCheck className="w-4 h-4 text-emerald-800" />
                    {paymentMethod === 'complimentary_invitation' && (
                      <Check className="w-3.5 h-3.5 text-emerald-800" />
                    )}
                  </div>
                  <div className="mt-1.5">
                    <div className="text-xs font-bold text-slate-900">Invite Code</div>
                    <div className="text-[11px] text-slate-600 font-medium">VIP Pass</div>
                  </div>
                </button>
              </div>

              {paymentMethod === 'complimentary_invitation' && (
                <div className="pt-1">
                  <label
                    htmlFor="member-invite-code"
                    className="text-xs font-semibold text-slate-800 block mb-1.5"
                  >
                    Partner Invitation Code
                  </label>
                  <input
                    id="member-invite-code"
                    type="text"
                    value={invitationCode}
                    onChange={(e) => setInvitationCode(e.target.value)}
                    placeholder="Enter Partner Invitation Code (e.g. KRETZ-VIP-2026)"
                    className={inputBaseClass}
                  />
                </div>
              )}
            </div>

            {/* Step 4: Strict Legal & Financial Safeguards Disclosure */}
            <div className="p-4 rounded-xl bg-amber-50/80 border border-amber-200 text-left space-y-3">
              <div className="flex items-center gap-2 text-amber-950 font-bold text-xs uppercase tracking-wider">
                <ShieldCheck className="w-4 h-4 text-amber-700 shrink-0" />
                <span>Legal and Financial Safeguards Notice</span>
              </div>

              <p className="text-xs text-amber-950 leading-relaxed">
                <strong>Crucial Regulatory Distinction:</strong> L'Agence Club membership confers access to private lifestyle concierge services, curated real estate networking salons, confidential off-market property dossiers, and bespoke advisory.
                <strong> Membership does NOT constitute property ownership, deed equity, securities, or financial returns.</strong> L'Agence does not guarantee profits or investment performance through membership.
              </p>

              <div className="space-y-2.5 pt-2 border-t border-amber-200/80 text-xs text-slate-800">
                <label className="flex items-start gap-3 cursor-pointer py-0.5">
                  <input
                    type="checkbox"
                    required
                    checked={agreeSafeguards}
                    onChange={(e) => setAgreeSafeguards(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded border-slate-400 accent-[#182D2A] shrink-0 cursor-pointer"
                  />
                  <span className="text-xs text-slate-800 leading-relaxed">
                    I acknowledge that membership privileges are separate from property ownership and fractional investment products. Any participation in fractional real estate SPVs requires independent regulatory review and separate documentation.
                  </span>
                </label>

                <label className="flex items-start gap-3 cursor-pointer py-0.5">
                  <input
                    type="checkbox"
                    required
                    checked={agreeTerms}
                    onChange={(e) => setAgreeTerms(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded border-slate-400 accent-[#182D2A] shrink-0 cursor-pointer"
                  />
                  <span className="text-xs text-slate-800 leading-relaxed">
                    I accept the applicable fee schedule (
                    <span className="font-mono tabular-nums font-semibold">{formatCurrency(fee)}</span>/
                    {billingCycle === 'annual' ? 'year' : 'month'}), 14-day statutory cancellation rights, and automatic renewal terms (cancellable at any time from user dashboard).
                  </span>
                </label>
              </div>
            </div>
          </div>

          {/* Pinned Footer Action Row */}
          <div className="px-4 py-3.5 sm:px-7 sm:py-4 border-t border-slate-200 bg-white flex flex-col-reverse sm:flex-row items-center justify-between gap-2.5 shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="w-full sm:w-auto min-h-[44px] px-5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer transition-colors disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full sm:w-auto min-h-[44px] px-6 py-2.5 rounded-xl bg-[#182D2A] hover:bg-[#24423C] text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Processing Application...</span>
                </>
              ) : (
                <>
                  <span>Confirm Subscription &amp; Issue Pass</span>
                  <ArrowRight className="w-4 h-4 text-[#B7E36A] shrink-0" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
