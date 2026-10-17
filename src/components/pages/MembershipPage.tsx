import React, { useState } from 'react';
import { useAuth } from '../../lib/auth';
import { ledger } from '../../lib/ledger';
import { MembershipTier, MembershipTierId, MembershipBillingCycle, UserMembership } from '../../types/membership';
import { formatCurrency } from '../../lib/utils';
import { 
  Crown, ShieldCheck, CheckCircle2, Sparkles, ArrowRight, 
  Lock, KeyRound, Building2, Users, Compass, Globe, 
  Calendar, PhoneCall, QrCode, AlertCircle, FileText, ChevronRight, Check
} from 'lucide-react';
import { MembershipApplicationModal } from '../club/MembershipApplicationModal';
import { UserMembershipCard } from '../club/UserMembershipCard';

interface MembershipPageProps {
  onNavigateHome: () => void;
  onNavigateContact: () => void;
  onNavigateProperties: () => void;
  onNavigateLogin: () => void;
}

export const MembershipPage: React.FC<MembershipPageProps> = ({
  onNavigateHome,
  onNavigateContact,
  onNavigateProperties,
  onNavigateLogin,
}) => {
  const { user } = useAuth();
  const [tiers, setTiers] = useState<MembershipTier[]>(() => ledger.getMembershipTiers());
  const [billingCycle, setBillingCycle] = useState<MembershipBillingCycle>('annual');
  const [selectedTierForModal, setSelectedTierForModal] = useState<MembershipTierId>('sovereign');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [userMembership, setUserMembership] = useState<UserMembership | null>(() => {
    return user ? ledger.getUserMembership(user.id) : null;
  });
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const handleRefresh = () => {
    setTiers(ledger.getMembershipTiers());
    if (user) {
      setUserMembership(ledger.getUserMembership(user.id));
    }
  };

  const handleOpenApplication = (tierId: MembershipTierId) => {
    setSelectedTierForModal(tierId);
    setIsModalOpen(true);
  };

  const handleSuccess = (newMembership: UserMembership) => {
    setUserMembership(newMembership);
    setIsModalOpen(false);
    setSuccessToast(`Welcome to Kretz Club Privé! Your ${newMembership.tierName} membership card #${newMembership.memberNumber} has been issued.`);
    setTimeout(() => setSuccessToast(null), 6000);
  };

  return (
    <div className="min-h-screen bg-[#FDFEFC] text-[#18211F]">
      
      {/* Toast Notification */}
      {successToast && (
        <div className="fixed top-20 right-6 z-50 max-w-md bg-[#182D2A] text-white p-4 rounded-2xl shadow-2xl border border-[#B7E36A]/40 flex items-start gap-3 animate-in fade-in slide-in-from-top-4">
          <CheckCircle2 className="w-5 h-5 text-[#B7E36A] flex-shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <p className="font-bold text-white">Membership Activated</p>
            <p className="text-[#C6D8D4]">{successToast}</p>
          </div>
          <button onClick={() => setSuccessToast(null)} className="text-white/60 hover:text-white ml-auto">✕</button>
        </div>
      )}

      {/* Editorial Luxury Hero */}
      <section className="relative overflow-hidden bg-[#0A1613] text-white pt-24 pb-20 border-b border-[#1E332E]">
        <div className="absolute inset-0 z-0 opacity-20 mix-blend-luminosity">
          <img 
            src="/src/assets/images/kretz_agency_headquarters_1792092491560.jpg" 
            alt="Kretz Club Privé" 
            className="w-full h-full object-cover"
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-[#0A1613] via-[#0A1613]/85 to-transparent z-0" />

        <div className="container max-w-[1240px] mx-auto px-4 relative z-10 text-left">
          <div className="max-w-3xl space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#162723] border border-[#233F39] text-[#B7E36A] text-xs font-semibold uppercase tracking-widest">
              <Crown className="w-4 h-4 text-[#B7E36A]" />
              <span>Kretz Club Privé · España & International</span>
            </div>

            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white leading-tight">
              A Private Circle for <span className="text-[#B7E36A]">Exceptional Real Estate</span>
            </h1>

            <p className="text-base sm:text-lg text-[#9DB2AE] leading-relaxed">
              Bridging premier homeowners, discerning private investors, and family offices. 
              Enjoy priority off-market acquisitions, invitations to private estate receptions, 
              and bespoke lifestyle concierge across Spain, France, and international prime capitals.
            </p>

            <div className="flex flex-wrap items-center gap-4 pt-2">
              <button
                onClick={() => handleOpenApplication('sovereign')}
                className="btn btn-primary py-3.5 px-7 text-xs font-bold bg-[#B7E36A] text-[#0A1613] hover:bg-[#C8F07F] rounded-xl flex items-center gap-2 cursor-pointer transition-all shadow-md"
              >
                <span>Apply for Membership</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                onClick={onNavigateContact}
                className="btn btn-secondary py-3.5 px-6 text-xs font-semibold bg-[#162723] text-white hover:bg-[#1E3631] border border-[#233F39] rounded-xl flex items-center gap-2 cursor-pointer transition-all"
              >
                <PhoneCall className="w-3.5 h-3.5 text-[#B7E36A]" />
                <span>Speak with Membership Desk</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* If Logged In User Already Has Membership: Display Their Active Pass Here! */}
      {user && userMembership && (
        <section className="py-12 bg-white border-b border-[#E3E8E3]">
          <div className="container max-w-[1240px] mx-auto px-4">
            <div className="max-w-3xl mx-auto">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
                  <Crown className="w-4 h-4" />
                  Your Active Member Credentials
                </span>
                <span className="text-xs text-slate-500">Live Status</span>
              </div>
              <UserMembershipCard
                membership={userMembership}
                tiers={tiers}
                onRefresh={handleRefresh}
                onUpgradeClick={() => handleOpenApplication('black_circle')}
              />
            </div>
          </div>
        </section>
      )}

      {/* Main Section: Tiers & Pricing Configurator */}
      <section className="py-20 sm:py-28 bg-[#F6F7F4] border-b border-[#E3E8E3] relative">
        <div className="container max-w-[1240px] mx-auto px-4 text-center">
          
          <div className="max-w-2xl mx-auto mb-14 space-y-4">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white border border-[#D5DDD5] text-emerald-900 text-xs font-bold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-emerald-700" />
              <span>Tailored Membership Tiers</span>
            </div>

            <h2 className="text-3xl sm:text-4xl font-extrabold text-[#18211F] tracking-tight">
              Select Your Circle of Privileges
            </h2>

            <p className="text-sm sm:text-base text-[#69736F]">
              Clear, transparent dues with no hidden fees. Annual memberships benefit from two months complimentary dues and priority event quotas.
            </p>

            {/* Annual vs Monthly Toggle Switch */}
            <div className="pt-4 flex items-center justify-center">
              <div className="bg-white p-1 rounded-2xl border border-[#D5DDD5] inline-flex items-center shadow-xs">
                <button
                  onClick={() => setBillingCycle('annual')}
                  className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    billingCycle === 'annual'
                      ? 'bg-[#182D2A] text-white shadow-xs'
                      : 'text-[#69736F] hover:text-[#18211F]'
                  }`}
                >
                  Annual Commitment (Save 15%)
                </button>
                <button
                  onClick={() => setBillingCycle('monthly')}
                  className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    billingCycle === 'monthly'
                      ? 'bg-[#182D2A] text-white shadow-xs'
                      : 'text-[#69736F] hover:text-[#18211F]'
                  }`}
                >
                  Monthly Flexible
                </button>
              </div>
            </div>
          </div>

          {/* Pricing Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch mb-16 text-left">
            {tiers.map((t) => {
              const price = billingCycle === 'annual' ? t.priceAnnual : t.priceMonthly;
              const isCurrentTier = userMembership?.tierId === t.id && userMembership.status === 'active';
              return (
                <div
                  key={t.id}
                  className={`bg-white rounded-3xl border overflow-hidden p-8 flex flex-col justify-between transition-all duration-300 relative ${
                    t.popular 
                      ? 'border-[#182D2A] shadow-xl ring-2 ring-[#182D2A]/10 lg:-translate-y-2' 
                      : 'border-[#E3E8E3] shadow-xs hover:shadow-md'
                  }`}
                >
                  {t.popular && (
                    <div className="absolute top-0 right-0 bg-[#182D2A] text-[#B7E36A] px-4 py-1 text-[11px] font-bold rounded-bl-2xl uppercase tracking-wider">
                      Most Selected
                    </div>
                  )}

                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                        {t.badge}
                      </span>
                    </div>

                    <h3 className="text-2xl font-black text-[#18211F] mb-2">{t.name}</h3>
                    <p className="text-xs text-[#69736F] mb-6 leading-relaxed min-h-[36px]">{t.description}</p>

                    <div className="mb-6 pb-6 border-b border-slate-100">
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl sm:text-4xl font-extrabold text-[#18211F]">
                          {formatCurrency(price)}
                        </span>
                        <span className="text-xs text-slate-500 font-medium">
                          /{billingCycle === 'annual' ? 'year' : 'month'}
                        </span>
                      </div>
                      {billingCycle === 'annual' && (
                        <p className="text-[11px] text-emerald-700 font-semibold mt-1">
                          Includes 2 months complimentary dues
                        </p>
                      )}
                    </div>

                    <div className="space-y-3 mb-8 text-xs">
                      <p className="font-bold text-[#18211F] uppercase tracking-wider text-[11px]">
                        Included Privileges:
                      </p>
                      {t.benefits.map((b, i) => (
                        <div key={i} className="flex items-start gap-2.5 text-[#4A5552]">
                          <CheckCircle2 className="w-4 h-4 text-emerald-700 flex-shrink-0 mt-0.5" />
                          <span className="leading-snug">{b}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-100">
                    {isCurrentTier ? (
                      <div className="w-full py-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold text-center">
                        ✓ Your Current Membership
                      </div>
                    ) : (
                      <button
                        onClick={() => handleOpenApplication(t.id)}
                        className={`w-full py-3.5 px-6 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs ${
                          t.popular 
                            ? 'bg-[#182D2A] hover:bg-[#24423C] text-white' 
                            : 'bg-white hover:bg-slate-50 text-[#18211F] border border-[#182D2A]'
                        }`}
                      >
                        <span>{t.invitationOnly ? 'Request Invitation' : 'Join Membership'}</span>
                        <ArrowRight className="w-4 h-4 text-[#B7E36A]" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Section 7 Mandatory Legal & Financial Safeguard Box */}
          <div className="max-w-4xl mx-auto p-6 sm:p-8 rounded-3xl bg-white border border-amber-200/90 shadow-xs text-left space-y-4">
            <div className="flex items-center gap-2 text-amber-900 font-extrabold text-xs uppercase tracking-wider">
              <ShieldCheck className="w-5 h-5 text-amber-700 flex-shrink-0" />
              <span>Section 7: Legal and Financial Safeguards & Regulatory Disclosures</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-slate-700 leading-relaxed">
              <div className="space-y-2">
                <p className="font-bold text-slate-900">Distinction from Property Ownership:</p>
                <p>
                  Kretz Club membership confers exclusive hospitality, private concierge, networking, and off-market scouting privileges. 
                  <strong> Membership does NOT represent legal property ownership, deed equity, timeshares, or security interests.</strong>
                </p>
                <p className="font-bold text-slate-900 pt-1">No Profit or Yield Promises:</p>
                <p>
                  Kretz Agency does not promise, forecast, or guarantee investment profits, dividends, or capital returns as a result of club membership.
                </p>
              </div>

              <div className="space-y-2">
                <p className="font-bold text-slate-900">Fee Transparency & Cancellation Rights:</p>
                <p>
                  All membership dues are billed in advance per the selected schedule. Members enjoy a statutory <strong>14-day cancellation cooling-off period</strong> from date of initial subscription with a full refund. 
                  Subscriptions may be cancelled at any time from your user dashboard prior to the subsequent renewal date.
                </p>
                <p className="font-bold text-slate-900 pt-1">Fractional Investment Governance:</p>
                <p>
                  Any access to tokenized real estate SPVs requires separate independent suitability verification, notarial compliance, and accredited documentation.
                </p>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* Member Privileges Editorial Showcase */}
      <section className="py-20 sm:py-28 bg-white border-b border-[#E3E8E3]">
        <div className="container max-w-[1240px] mx-auto px-4 text-left">
          
          <div className="max-w-2xl mb-16 space-y-3">
            <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">
              The Kretz Advantage
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-[#18211F] tracking-tight">
              Unrivaled Access Behind Closed Doors
            </h2>
            <p className="text-sm text-[#69736F]">
              Beyond real estate transactions, Kretz Club Privé curates an ecosystem of architecture, hospitality, and confidential private deals.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            
            <div className="p-6 rounded-2xl bg-[#F6F7F4] border border-[#E3E8E3] space-y-3">
              <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-emerald-800 shadow-xs border border-slate-200">
                <Lock className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-[#18211F]">Confidential Off-Market</h3>
              <p className="text-xs text-[#69736F] leading-relaxed">
                Direct access to unpublished penthouses, Balearic fincas, and Parisian mansions with no digital footprint, protected by NDAs.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-[#F6F7F4] border border-[#E3E8E3] space-y-3">
              <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-emerald-800 shadow-xs border border-slate-200">
                <Users className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-[#18211F]">Private Estate Salons</h3>
              <p className="text-xs text-[#69736F] leading-relaxed">
                Cocktail receptions and private architectural gatherings in Madrid, Paris, and Cap d’Antibes alongside the Kretz family.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-[#F6F7F4] border border-[#E3E8E3] space-y-3">
              <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-emerald-800 shadow-xs border border-slate-200">
                <Building2 className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-[#18211F]">Staging & Notarial Audits</h3>
              <p className="text-xs text-[#69736F] leading-relaxed">
                Complimentary architectural valuation audits and priority notarial deed preparations through trusted partner legal desks.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-[#F6F7F4] border border-[#E3E8E3] space-y-3">
              <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-emerald-800 shadow-xs border border-slate-200">
                <Compass className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-[#18211F]">Lifestyle Concierge</h3>
              <p className="text-xs text-[#69736F] leading-relaxed">
                Direct WhatsApp contact with dedicated senior advisors for chauffeured property viewings and private jet/yacht member rates.
              </p>
            </div>

          </div>

        </div>
      </section>

      {/* Frequently Asked Questions */}
      <section className="py-20 bg-[#F6F7F4]">
        <div className="container max-w-[900px] mx-auto px-4 text-left">
          <div className="text-center mb-12 space-y-2">
            <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">Common Questions</span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#18211F]">Membership Club Inquiries</h2>
          </div>

          <div className="space-y-4 text-xs sm:text-sm">
            <div className="bg-white p-5 rounded-2xl border border-[#E3E8E3] space-y-2">
              <p className="font-bold text-[#18211F]">How are membership privileges separate from property investments?</p>
              <p className="text-[#69736F] leading-relaxed">
                Kretz Club is an advisory and lifestyle community. Membership dues do not buy shares, tokens, or property deeds. 
                Any participation in fractional real estate or SPVs is governed by independent notarial contracts and requires accredited verification.
              </p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-[#E3E8E3] space-y-2">
              <p className="font-bold text-[#18211F]">Can I cancel or pause my membership?</p>
              <p className="text-[#69736F] leading-relaxed">
                Yes. You may cancel auto-renewal at any time with one click from your profile or dashboard. 
                Your privileges will remain active until the end of the paid period. You are also protected by a 14-day statutory money-back guarantee.
              </p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-[#E3E8E3] space-y-2">
              <p className="font-bold text-[#18211F]">How do I access confidential off-market property dossiers?</p>
              <p className="text-[#69736F] leading-relaxed">
                Once active, your digital membership card generates a unique concierge passcode. 
                You can browse confidential dossiers in the portal or request customized sourcing via your dedicated advisor.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Application Modal */}
      <MembershipApplicationModal
        initialTierId={selectedTierForModal}
        tiers={tiers}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleSuccess}
      />

    </div>
  );
};
