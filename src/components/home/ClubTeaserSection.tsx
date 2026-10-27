import React from 'react';
import { Crown, ArrowRight, ShieldCheck, Lock, Users } from 'lucide-react';

interface ClubTeaserSectionProps {
  onExploreClub: () => void;
  onContactDesk: () => void;
}

export const ClubTeaserSection: React.FC<ClubTeaserSectionProps> = ({
  onExploreClub,
  onContactDesk,
}) => {
  return (
    <section className="py-16 sm:py-24 bg-[#0B1B30] text-white border-b border-[#1D3860] relative overflow-hidden">
      <div className="container max-w-[1240px] mx-auto px-4 sm:px-6 relative z-10 text-left">
        <div className="bg-[#102442] border border-[#1D3860] rounded-xl p-8 sm:p-12 lg:p-14 relative overflow-hidden shadow-lg text-white">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            
            <div className="lg:col-span-8 space-y-4">
              <p className="text-[11px] font-bold text-[#BEE179] tracking-[0.2em] uppercase flex items-center gap-2">
                <Crown className="w-3.5 h-3.5 text-[#BEE179]" />
                <span>L'Agence Club Privé · Invitation & Membership</span>
              </p>

              <h2 className="font-serif text-2xl sm:text-3xl lg:text-4xl font-black text-[#BEE179] tracking-tight leading-snug">
                Step Inside Spain & France’s Most Exclusive Real Estate Circle
              </h2>

              <p className="text-sm sm:text-base text-[#D1E2F7] max-w-2xl leading-relaxed font-normal">
                Unlock confidential off-market property dossiers across Madrid, Barcelona, Ibiza, Paris, and Monaco. 
                Members receive invitations to private estate receptions, complimentary architectural staging audits, and direct lifestyle concierge advisory.
              </p>

              <div className="pt-2 flex flex-wrap items-center gap-y-2 gap-x-6 text-xs text-[#D1E2F7]">
                <div className="flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-[#BEE179]" />
                  <span>Confidential Off-Market Scouting</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-[#BEE179]" />
                  <span>Private Estate Salons</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#BEE179]" />
                  <span>Distinct from Investment Products</span>
                </div>
              </div>
            </div>

            <div className="lg:col-span-4 flex flex-col sm:flex-row lg:flex-col gap-3 justify-center">
              <button
                onClick={onExploreClub}
                className="py-3.5 px-6 text-xs font-bold bg-[#BEE179] text-[#0B1B30] hover:bg-[#AEDB5B] rounded-lg flex items-center justify-center gap-2 cursor-pointer transition-all shadow-xs"
              >
                <Crown className="w-4 h-4 text-[#0B1B30]" />
                <span>Explore Membership Tiers</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                onClick={onContactDesk}
                className="py-3 px-6 text-xs font-bold bg-[#0B1B30] text-white hover:bg-[#132745] border border-[#1D3860] rounded-lg flex items-center justify-center gap-2 cursor-pointer transition-all"
              >
                <span>Contact Membership Desk</span>
              </button>
            </div>

          </div>
        </div>
      </div>
    </section>
  );
};
