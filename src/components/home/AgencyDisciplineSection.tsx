import React, { useState } from 'react';
import { 
  Building2, Users, ShieldCheck, EyeOff, Share2, Compass, 
  MapPin, ArrowRight, Lock, Globe, Award, 
  CheckCircle2, ChevronRight, PhoneCall, HeartHandshake
} from 'lucide-react';

import martinImg from '../../assets/images/team/martin_kretz.jpg';
import valentinImg from '../../assets/images/team/valentin_kretz.jpg';
import olivierImg from '../../assets/images/team/olivier_kretz.jpg';
import sandrineImg from '../../assets/images/team/sandrine_kretz.jpg';
import louisImg from '../../assets/images/team/louis_kretz.jpg';

interface AgencyDisciplineSectionProps {
  onNavigateTeam: () => void;
  onNavigateContact: () => void;
  onNavigateProperties: () => void;
}

export const AgencyDisciplineSection: React.FC<AgencyDisciplineSectionProps> = ({
  onNavigateTeam,
  onNavigateContact,
  onNavigateProperties,
}) => {
  const [activeStrategyTab, setActiveStrategyTab] = useState<'off-market' | 'public'>('off-market');
  const [selectedRegion, setSelectedRegion] = useState<number>(0);

  const regionalHubs = [
    {
      region: 'Paris & Île-de-France',
      subtext: 'Flagship Headquarters & Hôtels Particuliers',
      agentsCount: '18 Agents',
      keyAssets: 'Triplex penthouses, historical private mansions, Neuilly & Boulogne estates',
      featuredAgent: 'Martin & Valentin Kretz',
    },
    {
      region: 'French Riviera & Monaco',
      subtext: 'Waterfront Villas & Cap d’Antibes Estates',
      agentsCount: '12 Agents',
      keyAssets: 'Cannes waterfronts, Saint-Tropez contemporary villas, Monaco penthouses',
      featuredAgent: 'Sandrine & Valentin Kretz',
    },
    {
      region: 'French Alps & Megève',
      subtext: 'Chalet Retreats & Ski-in Ski-out Flagships',
      agentsCount: '6 Agents',
      keyAssets: 'Courchevel 1850 chalets, Megève alpine sanctuaries, Chamonix lodges',
      featuredAgent: 'Raphaël & Local Associates',
    },
    {
      region: 'Atlantic Coast & Bordeaux',
      subtext: 'Biarritz, Cap Ferret & Prestigious Vineyards',
      agentsCount: '7 Agents',
      keyAssets: 'Grand Cru vineyard estates, Cap Ferret oyster-cabin villas, Biarritz beachfronts',
      featuredAgent: 'Regional Specialist Network',
    },
    {
      region: 'International Luxury Corridors',
      subtext: 'London, Miami, Madrid, Barcelona & Dubai',
      agentsCount: '14 Global Partners',
      keyAssets: 'Mayfair mansions, Miami Brickell penthouses, Salamanca Madrid palaces',
      featuredAgent: 'Louis Kretz & Global Affiliates',
    },
  ];

  return (
    <section className="relative py-20 sm:py-28 bg-[#0B1B30] text-white overflow-hidden max-w-full border-t border-b border-[#1D3860]">
      <div className="container max-w-[1240px] mx-auto px-4 sm:px-6 relative z-10">
        
        {/* Section Pill & Header */}
        <div className="flex flex-col items-center text-center max-w-3xl mx-auto mb-16 space-y-4">
          <p className="text-[11px] font-bold text-[#BEE179] tracking-[0.2em] uppercase">
            Discipline & Governance · Est. 2007
          </p>

          <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-black text-[#BEE179] tracking-tight leading-tight">
            A Fresh Perspective on <span className="italic font-normal text-white">Luxury Real Estate</span>
          </h2>

          <p className="text-base sm:text-lg text-[#D1E2F7] leading-relaxed font-normal max-w-2xl">
            Founded on family values and institutional rigor, L'Agence pairs bespoke off-market discretion with cutting-edge asset curation across France and prime international markets.
          </p>
        </div>

        {/* Part 1: Core Discipline Grid & Two Brothers Editorial Feature */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch mb-16">
          
          {/* Left Column: Leadership Card in Deep Navy Surface */}
          <div className="lg:col-span-5 flex flex-col justify-between bg-[#102442] border border-[#1D3860] rounded-xl p-6 sm:p-8 relative overflow-hidden group shadow-md text-white">
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-6">
                <span className="text-[11px] uppercase tracking-wider font-semibold text-[#BEE179] flex items-center gap-1.5">
                  <Award className="w-3.5 h-3.5" />
                  Paris · Flagship Desk
                </span>
                <span className="text-[10px] font-mono text-slate-300 px-2 py-0.5 rounded bg-black/40 border border-white/10">
                  Est. 2007
                </span>
              </div>

              {/* Photos of Martin & Valentin Kretz */}
              <div className="grid grid-cols-2 gap-3 mb-6">
                <div className="relative rounded-lg overflow-hidden aspect-[3/4] border border-white/10 group/card">
                  <img 
                    src={martinImg} 
                    alt="Martin Kretz - Managing Director" 
                    className="w-full h-full object-cover object-top filter grayscale contrast-105 group-hover/card:grayscale-0 transition-all duration-500 scale-100 group-hover/card:scale-103"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                  <div className="absolute bottom-2.5 left-2.5 right-2.5 text-left">
                    <p className="text-xs font-semibold text-white leading-tight">Martin Kretz</p>
                    <p className="text-[10px] text-stone-300">Managing Director</p>
                  </div>
                </div>

                <div className="relative rounded-lg overflow-hidden aspect-[3/4] border border-white/10 group/card">
                  <img 
                    src={valentinImg} 
                    alt="Valentin Kretz - Associate Director" 
                    className="w-full h-full object-cover object-top filter grayscale contrast-105 group-hover/card:grayscale-0 transition-all duration-500 scale-100 group-hover/card:scale-103"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                  <div className="absolute bottom-2.5 left-2.5 right-2.5 text-left">
                    <p className="text-xs font-semibold text-white leading-tight">Valentin Kretz</p>
                    <p className="text-[10px] text-stone-300">Associate Director</p>
                  </div>
                </div>
              </div>

              {/* Founder quote */}
              <div className="p-4 rounded-lg bg-black/30 border border-white/10 text-left space-y-2">
                <div className="flex items-center gap-2">
                  <div className="flex -space-x-1.5">
                    <img src={sandrineImg} alt="Sandrine" className="w-6 h-6 rounded-full border border-white/30 object-cover" />
                    <img src={olivierImg} alt="Olivier" className="w-6 h-6 rounded-full border border-white/30 object-cover" />
                    <img src={louisImg} alt="Louis" className="w-6 h-6 rounded-full border border-white/30 object-cover" />
                  </div>
                  <span className="text-[11px] text-slate-200 font-medium">Kretz Family Collective</span>
                </div>
                <p className="text-xs text-slate-200 font-serif italic leading-relaxed">
                  "Our discipline is rooted in family trust, architectural authenticity, and bespoke representation for every client."
                </p>
              </div>
            </div>

            {/* Quick stats ribbon */}
            <div className="mt-6 pt-5 border-t border-white/10 grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="font-mono text-base font-bold text-white">€1.4B+</p>
                <p className="text-[9px] text-slate-300 uppercase tracking-wider">Volume Sold</p>
              </div>
              <div className="border-x border-white/10">
                <p className="font-mono text-base font-bold text-[#BEE179]">100%</p>
                <p className="text-[9px] text-slate-300 uppercase tracking-wider">Independent</p>
              </div>
              <div>
                <p className="font-mono text-base font-bold text-white">65+</p>
                <p className="text-[9px] text-slate-300 uppercase tracking-wider">Global Agents</p>
              </div>
            </div>
          </div>

          {/* Right Column: Full Discipline Statement & Strategy Selector */}
          <div className="lg:col-span-7 flex flex-col justify-between space-y-6">
            
            {/* Primary Discipline Statement Card */}
            <div className="bg-[#102442] border border-[#1D3860] rounded-xl p-8 sm:p-10 text-left relative overflow-hidden">
              <span className="text-[11px] uppercase tracking-widest font-semibold text-[#BEE179] mb-2 block">
                Philosophy
              </span>
              
              <h3 className="font-serif text-2xl sm:text-3xl font-bold text-white mb-4 tracking-tight leading-snug">
                On Discipline and Method
              </h3>

              <div className="space-y-4 text-sm sm:text-base text-[#D1E2F7] leading-relaxed">
                <p>
                  Specializing in prime residential and trophy real estate, <strong>L'Agence</strong> provides an editorial, disciplined approach to property acquisition. Founded on deep family integrity, our team collaborates with seasoned advisors across France and international luxury hubs.
                </p>
                <p>
                  Every property undergoes exhaustive due diligence: cadastral auditing, RICS chartered valuation, structural verification, and clear SPV titling. Depending on owner objectives, assets are managed via an off-market confidential mandate or global public communications.
                </p>
              </div>

              {/* Dual Strategy Tabs: Public vs Off-Market */}
              <div className="mt-8 pt-6 border-t border-[#1D3860]">
                <div className="flex items-center gap-2 mb-4">
                  <button
                    onClick={() => setActiveStrategyTab('off-market')}
                    className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                      activeStrategyTab === 'off-market'
                        ? 'bg-[#BEE179] text-[#0B1B30] shadow-xs'
                        : 'bg-[#0B1B30] text-[#D1E2F7] hover:text-white border border-[#1D3860]'
                    }`}
                  >
                    <EyeOff className="w-3.5 h-3.5" />
                    <span>Off-Market Mandates</span>
                  </button>

                  <button
                    onClick={() => setActiveStrategyTab('public')}
                    className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                      activeStrategyTab === 'public'
                        ? 'bg-[#BEE179] text-[#0B1B30] shadow-xs'
                        : 'bg-[#0B1B30] text-[#D1E2F7] hover:text-white border border-[#1D3860]'
                    }`}
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>Global Editorial Reach</span>
                  </button>
                </div>

                {activeStrategyTab === 'off-market' ? (
                  <div className="p-4 rounded-lg bg-[#0B1B30] border border-[#1D3860] text-left text-xs text-[#D1E2F7] space-y-2">
                    <div className="flex items-center gap-2 text-white font-semibold">
                      <Lock className="w-3.5 h-3.5 text-[#BEE179]" />
                      <span>Ultra-Confidential Mandates & Family Office Networks</span>
                    </div>
                    <p className="leading-relaxed">
                      For owners requiring strict discretion, properties are matched directly to vetted private buyers in our closed international syndicate without public portals, internet exposure, or street signage. Protected by formal NDAs.
                    </p>
                  </div>
                ) : (
                  <div className="p-4 rounded-lg bg-[#0B1B30] border border-[#1D3860] text-left text-xs text-[#D1E2F7] space-y-2">
                    <div className="flex items-center gap-2 text-white font-semibold">
                      <Award className="w-3.5 h-3.5 text-[#BEE179]" />
                      <span>Cinematic Media & International Press Coverage</span>
                    </div>
                    <p className="leading-relaxed">
                      High-end editorial architectural photography, drone video tours, and prominent coverage across international publications reaching institutional investors across Europe and North America.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Dual Action Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button
                onClick={onNavigateContact}
                className="p-5 rounded-xl bg-[#102442] hover:bg-[#152e54] border border-[#1D3860] text-left transition-all group cursor-pointer"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-bold text-[#BEE179] uppercase tracking-wider">Private Advisory</span>
                  <ArrowRight className="w-3.5 h-3.5 text-[#BEE179] group-hover:translate-x-1 transition-transform" />
                </div>
                <p className="text-sm font-bold text-white">Confidential Mandate</p>
                <p className="text-xs text-[#8EA7C7] mt-0.5">Entrust your acquisition or sale to our advisory team.</p>
              </button>

              <button
                onClick={onNavigateProperties}
                className="p-5 rounded-xl bg-[#102442] hover:bg-[#152e54] border border-[#1D3860] text-left transition-all group cursor-pointer"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-bold text-[#BEE179] uppercase tracking-wider">Fractional Assets</span>
                  <ArrowRight className="w-3.5 h-3.5 text-[#BEE179] group-hover:translate-x-1 transition-transform" />
                </div>
                <p className="text-sm font-bold text-white">Tokenized Offerings</p>
                <p className="text-xs text-[#8EA7C7] mt-0.5">Invest in verified European prime assets from €750.</p>
              </button>
            </div>

          </div>
        </div>

        {/* Part 2: Regional Hub Directory */}
        <div className="bg-[#102442] border border-[#1D3860] rounded-xl p-6 sm:p-8 text-left">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 pb-6 border-b border-[#1D3860]">
            <div>
              <h4 className="font-serif text-lg font-bold text-white flex items-center gap-2">
                <MapPin className="w-4 h-4 text-[#BEE179]" />
                Regional Presence & Partner Coverage
              </h4>
              <p className="text-xs text-[#8EA7C7] mt-0.5">Explore active territory operations across France and key international gateways.</p>
            </div>

            <button
              onClick={onNavigateTeam}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#BEE179] hover:underline cursor-pointer"
            >
              <span>Meet the Full Team</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Territory Selector Tabs */}
          <div className="flex flex-wrap gap-2 mb-6">
            {regionalHubs.map((hub, idx) => (
              <button
                key={idx}
                onClick={() => setSelectedRegion(idx)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  selectedRegion === idx
                    ? 'bg-[#BEE179] text-[#0B1B30] shadow-xs'
                    : 'bg-[#0B1B30] text-[#D1E2F7] hover:text-white border border-[#1D3860]'
                }`}
              >
                {hub.region}
              </button>
            ))}
          </div>

          {/* Active Territory Card */}
          <div className="bg-[#0B1B30] border border-[#1D3860] rounded-lg p-5 grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
            <div className="md:col-span-8 space-y-1.5">
              <div className="flex items-center gap-3">
                <span className="font-serif text-base font-bold text-white">{regionalHubs[selectedRegion].region}</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#102442] text-[#BEE179] border border-[#1D3860]">
                  {regionalHubs[selectedRegion].agentsCount}
                </span>
              </div>
              <p className="text-xs text-[#D1E2F7]">{regionalHubs[selectedRegion].subtext}</p>
              <p className="text-xs text-[#8EA7C7] pt-1">
                <strong className="text-white font-medium">Signature Focus:</strong> {regionalHubs[selectedRegion].keyAssets}
              </p>
            </div>

            <div className="md:col-span-4 flex flex-col sm:flex-row md:flex-col gap-2 justify-end">
              <button
                onClick={onNavigateTeam}
                className="py-2.5 px-3 text-xs font-semibold text-white bg-[#102442] hover:bg-[#152e54] border border-[#1D3860] rounded-lg flex items-center justify-center gap-2 cursor-pointer transition-colors"
              >
                <Users className="w-3.5 h-3.5 text-[#BEE179]" />
                <span>Regional Team</span>
              </button>
              <button
                onClick={onNavigateContact}
                className="py-2.5 px-3 text-xs font-bold text-[#0B1B30] bg-[#BEE179] hover:bg-[#AEDB5B] rounded-lg flex items-center justify-center gap-2 cursor-pointer transition-colors"
              >
                <PhoneCall className="w-3.5 h-3.5" />
                <span>Contact Desk</span>
              </button>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
};
