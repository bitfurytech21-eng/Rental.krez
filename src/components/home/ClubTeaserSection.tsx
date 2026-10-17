import React from 'react';
import { Crown, ArrowRight, ShieldCheck, Lock, Users, Calendar } from 'lucide-react';

interface ClubTeaserSectionProps {
  onExploreClub: () => void;
  onContactDesk: () => void;
}

export const ClubTeaserSection: React.FC<ClubTeaserSectionProps> = ({
  onExploreClub,
  onContactDesk,
}) => {
  return (
    <section className="py-16 sm:py-24 bg-[#0A1613] text-white border-t border-b border-[#1A2E2A] relative overflow-hidden">
      {/* Subtle Glow */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-[#B7E36A]/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-emerald-900/10 rounded-full blur-3xl pointer-events-none" />

      <div className="container max-w-[1240px] mx-auto px-4 relative z-10 text-left">
        <div className="bg-[#12201D] border border-[#1E3631] rounded-3xl p-8 sm:p-12 lg:p-14 relative overflow-hidden shadow-2xl">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            
            <div className="lg:col-span-8 space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#182C27] border border-[#23423B] text-[#B7E36A] text-xs font-semibold uppercase tracking-wider">
                <Crown className="w-3.5 h-3.5 text-[#B7E36A]" />
                <span>Kretz Club Privé · Invitation & Membership</span>
              </div>

              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white tracking-tight leading-snug">
                Step Inside Spain & International’s Most Exclusive Real Estate Circle
              </h2>

              <p className="text-sm sm:text-base text-[#9DB2AE] max-w-2xl leading-relaxed">
                Unlock confidential off-market property dossiers across Madrid, Barcelona, Ibiza, Paris, and Monaco. 
                Members receive invitations to private estate receptions, complimentary architectural staging audits, and direct lifestyle concierge advisory.
              </p>

              <div className="pt-2 flex flex-wrap items-center gap-y-2 gap-x-6 text-xs text-[#C6D8D4]">
                <div className="flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-[#B7E36A]" />
                  <span>Confidential Off-Market Scouting</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-[#B7E36A]" />
                  <span>Private Estate Salons</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#B7E36A]" />
                  <span>Distinct from Investment Products</span>
                </div>
              </div>
            </div>

            <div className="lg:col-span-4 flex flex-col sm:flex-row lg:flex-col gap-3 justify-center">
              <button
                onClick={onExploreClub}
                className="btn btn-primary py-4 px-6 text-xs font-bold bg-[#B7E36A] text-[#0A1613] hover:bg-[#C8F07F] rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all shadow-md"
              >
                <Crown className="w-4 h-4 text-[#0A1613]" />
                <span>Explore Membership Tiers</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                onClick={onContactDesk}
                className="btn btn-secondary py-3.5 px-6 text-xs font-semibold bg-[#162723] text-white hover:bg-[#1E3631] border border-[#233F39] rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all"
              >
                <span>Speak with Membership Desk</span>
              </button>
            </div>

          </div>
        </div>
      </div>
    </section>
  );
};
