import React, { useState } from 'react';
import { MembershipTier, MembershipTierId, MembershipBillingCycle, UserMembership } from '../../types/membership';
import { useAuth } from '../../lib/auth';
import { ledger } from '../../lib/ledger';
import { formatCurrency } from '../../lib/utils';
import { 
  Crown, ShieldCheck, CheckCircle2, AlertTriangle, 
  CreditCard, Wallet, Building2, Lock, ArrowRight, 
  Sparkles, Check, Info, FileText
} from 'lucide-react';

interface MembershipApplicationModalProps {
  initialTierId?: MembershipTierId;
  tiers: MembershipTier[];
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (membership: UserMembership) => void;
}

export const MembershipApplicationModal: React.FC<MembershipApplicationModalProps> = ({
  initialTierId = 'sovereign',
  tiers,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { user } = useAuth();
  const [selectedTierId, setSelectedTierId] = useState<MembershipTierId>(initialTierId);
  const [billingCycle, setBillingCycle] = useState<MembershipBillingCycle>('annual');
  const [paymentMethod, setPaymentMethod] = useState<'wallet_balance' | 'bank_wire' | 'credit_card' | 'complimentary_invitation'>('wallet_balance');
  
  // Form fields
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phoneNumber || '+34 ');
  const [country, setCountry] = useState(user?.country || 'Spain');
  const [preferredRegion, setPreferredRegion] = useState('Madrid & Balearic Islands');
  const [invitationCode, setInvitationCode] = useState('');
  const [specialRequests, setSpecialRequests] = useState('');
  
  // Safeguards agreement
  const [agreeSafeguards, setAgreeSafeguards] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);

  // States
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const selectedTier = tiers.find(t => t.id === selectedTierId) || tiers[0];
  const fee = billingCycle === 'annual' ? selectedTier.priceAnnual : selectedTier.priceMonthly;
  const hasSufficientWallet = user ? user.walletBalance >= fee : false;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!fullName.trim() || !email.trim()) {
      setError('Please provide your full legal name and email address.');
      return;
    }

    if (!agreeSafeguards) {
      setError('You must confirm that you understand membership privileges are distinct from property ownership and investment products.');
      return;
    }

    if (!agreeTerms) {
      setError('Please accept the membership dues schedule and cancellation policy.');
      return;
    }

    if (paymentMethod === 'complimentary_invitation' && !invitationCode.trim()) {
      setError('Please enter a valid private invitation code provided by Kretz Partners.');
      return;
    }

    if (paymentMethod === 'wallet_balance' && !hasSufficientWallet) {
      setError(`Insufficient wallet balance (€${user?.walletBalance.toFixed(2) || '0.00'}). Please choose Bank Wire, Credit Card, or deposit funds first.`);
      return;
    }

    setIsSubmitting(true);

    setTimeout(() => {
      try {
        const membership = ledger.subscribeMembership({
          userId: user?.id || 'usr-guest-' + Math.random().toString(36).substring(2, 7),
          userEmail: email,
          userName: fullName,
          tierId: selectedTierId,
          billingCycle,
          paymentMethod,
          specialRequests,
          preferredRegion,
        });

        setIsSubmitting(false);
        onSuccess(membership);
      } catch (err: any) {
        setIsSubmitting(false);
        setError(err.message || 'Failed to process membership subscription.');
      }
    }, 700);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-10 text-left border border-slate-200 shadow-2xl my-8 relative">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-6 right-6 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center cursor-pointer transition-colors"
        >
          ✕
        </button>

        {/* Modal Header */}
        <div className="space-y-2 mb-6 border-b border-slate-100 pb-5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-900 text-[11px] font-bold uppercase tracking-wider">
            <Crown className="w-3.5 h-3.5 text-emerald-700" />
            <span>Kretz Club Privé Application & Onboarding</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-[#18211F] tracking-tight">
            Elevate Your Real Estate Journey
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Join an international circle of discerning clients, investors, and homeowners.
          </p>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-start gap-2 mb-6">
            <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* Step 1: Tier Selection */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                1. Select Membership Tier
              </label>
              
              {/* Billing Cycle Switcher */}
              <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl text-[11px]">
                <button
                  type="button"
                  onClick={() => setBillingCycle('annual')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                    billingCycle === 'annual' ? 'bg-white text-emerald-950 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  Annual (Save 15%)
                </button>
                <button
                  type="button"
                  onClick={() => setBillingCycle('monthly')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                    billingCycle === 'monthly' ? 'bg-white text-emerald-950 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  Monthly
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {tiers.map((t) => {
                const isSelected = t.id === selectedTierId;
                const price = billingCycle === 'annual' ? t.priceAnnual : t.priceMonthly;
                return (
                  <div
                    key={t.id}
                    onClick={() => setSelectedTierId(t.id)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer relative flex flex-col justify-between ${
                      isSelected 
                        ? 'border-[#182D2A] bg-[#F7F9F7] ring-2 ring-[#182D2A]/10 shadow-xs'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{t.badge.split('·')[0]}</span>
                        {isSelected && <Check className="w-4 h-4 text-emerald-800" />}
                      </div>
                      <h4 className="font-bold text-sm text-[#18211F]">{t.name}</h4>
                      <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">{t.tagline}</p>
                    </div>

                    <div className="mt-3 pt-2 border-t border-slate-200">
                      <p className="text-base font-extrabold text-[#18211F]">
                        {formatCurrency(price)}
                        <span className="text-[10px] font-normal text-slate-500">/{billingCycle === 'annual' ? 'yr' : 'mo'}</span>
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Step 2: Personal Information */}
          <div className="space-y-3 pt-2">
            <label className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              2. Applicant Credentials
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-700 block mb-1">Full Legal Name *</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. David Vance"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-[#182D2A] focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-700 block mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@domain.com"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-[#182D2A] focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-700 block mb-1">Phone / WhatsApp</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+34 600 000 000"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-[#182D2A] focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-700 block mb-1">Primary Real Estate Region</label>
                <select
                  value={preferredRegion}
                  onChange={(e) => setPreferredRegion(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-[#182D2A] focus:outline-none bg-white"
                >
                  <option value="Madrid & Balearic Islands">Madrid & Balearic Islands (Spain)</option>
                  <option value="Barcelona & Costa Brava">Barcelona & Costa Brava (Spain)</option>
                  <option value="Paris & French Riviera">Paris & French Riviera (France)</option>
                  <option value="Monaco & International">Monaco & International Capitals</option>
                  <option value="Caribbean & Americas">St. Barts & United States</option>
                </select>
              </div>
            </div>
          </div>

          {/* Step 3: Payment Method */}
          <div className="space-y-3 pt-2">
            <label className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              3. Payment Arrangement ({formatCurrency(fee)})
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => setPaymentMethod('wallet_balance')}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  paymentMethod === 'wallet_balance' 
                    ? 'border-[#182D2A] bg-[#F7F9F7] font-bold text-[#18211F]' 
                    : 'border-slate-200 text-slate-600 hover:border-slate-300'
                }`}
              >
                <Wallet className="w-4 h-4 text-emerald-800 mb-1" />
                <p className="text-xs">Wallet Balance</p>
                <p className="text-[10px] text-slate-500 font-normal">
                  {user ? `Avail: €${user.walletBalance.toFixed(0)}` : 'Requires Login'}
                </p>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('bank_wire')}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  paymentMethod === 'bank_wire' 
                    ? 'border-[#182D2A] bg-[#F7F9F7] font-bold text-[#18211F]' 
                    : 'border-slate-200 text-slate-600 hover:border-slate-300'
                }`}
              >
                <Building2 className="w-4 h-4 text-emerald-800 mb-1" />
                <p className="text-xs">SEPA Wire</p>
                <p className="text-[10px] text-slate-500 font-normal">Bank Invoice</p>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('credit_card')}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  paymentMethod === 'credit_card' 
                    ? 'border-[#182D2A] bg-[#F7F9F7] font-bold text-[#18211F]' 
                    : 'border-slate-200 text-slate-600 hover:border-slate-300'
                }`}
              >
                <CreditCard className="w-4 h-4 text-emerald-800 mb-1" />
                <p className="text-xs">Credit Card</p>
                <p className="text-[10px] text-slate-500 font-normal">Visa / Amex</p>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('complimentary_invitation')}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  paymentMethod === 'complimentary_invitation' 
                    ? 'border-[#182D2A] bg-[#F7F9F7] font-bold text-[#18211F]' 
                    : 'border-slate-200 text-slate-600 hover:border-slate-300'
                }`}
              >
                <Sparkles className="w-4 h-4 text-emerald-800 mb-1" />
                <p className="text-xs">Invite Code</p>
                <p className="text-[10px] text-slate-500 font-normal">VIP Pass</p>
              </button>
            </div>

            {paymentMethod === 'complimentary_invitation' && (
              <div className="pt-2">
                <input
                  type="text"
                  value={invitationCode}
                  onChange={(e) => setInvitationCode(e.target.value)}
                  placeholder="Enter Partner Invitation Code (e.g. KRETZ-VIP-2026)"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-[#182D2A] focus:outline-none"
                />
              </div>
            )}
          </div>

          {/* Step 4: Strict Legal & Financial Safeguards Disclosure (Section 7) */}
          <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200/80 text-left space-y-3">
            <div className="flex items-center gap-2 text-amber-900 font-bold text-xs uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4 text-amber-700" />
              <span>Legal and Financial Safeguards Notice</span>
            </div>

            <p className="text-[11px] text-amber-950 leading-relaxed">
              <strong>Crucial Regulatory Distinction:</strong> Kretz Club membership confers access to private lifestyle concierge services, curated real estate networking salons, confidential off-market property dossiers, and bespoke advisory. 
              <strong> Membership does NOT constitute property ownership, deed equity, securities, or financial returns.</strong> Kretz Agency does not guarantee profits or investment performance through membership.
            </p>

            <div className="space-y-2 pt-1 border-t border-amber-200/60 text-xs text-slate-800">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  required
                  checked={agreeSafeguards}
                  onChange={(e) => setAgreeSafeguards(e.target.checked)}
                  className="mt-0.5 rounded text-[#182D2A] focus:ring-[#182D2A]"
                />
                <span className="text-[11px] text-slate-700 leading-normal">
                  I acknowledge that membership privileges are separate from property ownership and fractional investment products. Any participation in fractional real estate SPVs requires independent regulatory review and separate documentation.
                </span>
              </label>

              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  required
                  checked={agreeTerms}
                  onChange={(e) => setAgreeTerms(e.target.checked)}
                  className="mt-0.5 rounded text-[#182D2A] focus:ring-[#182D2A]"
                />
                <span className="text-[11px] text-slate-700 leading-normal">
                  I accept the applicable fee schedule ({formatCurrency(fee)}/{billingCycle === 'annual' ? 'year' : 'month'}), 14-day statutory cancellation rights, and automatic renewal terms (cancellable at any time from user dashboard).
                </span>
              </label>
            </div>
          </div>

          {/* Action Row */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full sm:w-auto px-7 py-3 rounded-xl bg-[#182D2A] hover:bg-[#24423C] text-white text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Processing Application...</span>
                </>
              ) : (
                <>
                  <span>Confirm Subscription & Issue Pass</span>
                  <ArrowRight className="w-4 h-4 text-[#B7E36A]" />
                </>
              )}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
