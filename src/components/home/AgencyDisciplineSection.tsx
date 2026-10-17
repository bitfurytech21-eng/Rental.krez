import React, { useState } from 'react';
import { 
  Building2, Users, ShieldCheck, EyeOff, Share2, Compass, 
  MapPin, Sparkles, ArrowRight, Lock, Globe, Award, 
  CheckCircle2, ChevronRight, PhoneCall, HeartHandshake
} from 'lucide-react';

import martinImg from '../../assets/images/team/martin_kretz.jpg';
import valentinImg from '../../assets/images/team/valentin_kretz.jpg';
import olivierImg from '../../assets/images/team/olivier_kretz.jpg';
import sandrineImg from '../../assets/images/team/sandrine_kretz.jpg';
import louisImg from '../../assets/images/team/louis_kretz.jpg';
import hqImg from '../../assets/images/kretz_agency_headquarters_1792092491560.jpg';

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
    <section className="relative py-20 sm:py-28 bg-[#0C1715] text-white overflow-hidden max-w-full border-t border-b border-[#1A2E2A]">
      {/* Subtle Background Watermark / Accent Glow */}
      <div className="absolute top-0 right-1/4 w-72 sm:w-[600px] h-72 sm:h-[600px] max-w-full bg-[#B7E36A]/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 sm:left-10 w-72 sm:w-[500px] h-72 sm:h-[500px] max-w-full bg-emerald-950/40 rounded-full blur-3xl pointer-events-none" />

      <div className="container max-w-[1240px] mx-auto px-4 relative z-10">
        
        {/* Section Pill & Header */}
        <div className="flex flex-col items-center text-center max-w-3xl mx-auto mb-16 sm:mb-20 space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#162723] border border-[#233F39] text-[#B7E36A] text-xs font-semibold uppercase tracking-widest shadow-xs">
            <Compass className="w-3.5 h-3.5 text-[#B7E36A]" />
            <span>Our Discipline & Philosophy</span>
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight leading-tight">
            A Fresh Perspective on <span className="text-[#B7E36A]">Luxury Real Estate</span>
          </h2>

          <p className="text-base sm:text-lg text-[#9DB2AE] leading-relaxed">
            Founded on family values and institutional rigor, Kretz Agency combines cutting-edge marketing, 
            absolute off-market discretion, and an expanded family network across France and prime international markets.
          </p>
        </div>

        {/* Part 1: Core Discipline Grid & Two Brothers Editorial Feature */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-stretch mb-20">
          
          {/* Left Column: Visual Showcase of the Kretz Brothers & Leadership in Paris */}
          <div className="lg:col-span-5 flex flex-col justify-between bg-[#12201D] border border-[#1E3631] rounded-3xl p-6 sm:p-8 relative overflow-hidden group shadow-xl">
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-6">
                <span className="text-xs uppercase tracking-wider font-bold text-[#B7E36A] flex items-center gap-1.5">
                  <Award className="w-4 h-4" />
                  Paris · International Capital
                </span>
                <span className="text-xs font-mono text-[#829994] px-2.5 py-1 rounded-md bg-[#0A1412] border border-[#1E3631]">
                  Est. 2007 · Netflix S1-S5
                </span>
              </div>

              {/* Photos of Martin & Valentin Kretz - Brothers in Action */}
              <div className="grid grid-cols-2 gap-3 mb-6">
                <div className="relative rounded-2xl overflow-hidden aspect-[3/4] border border-[#233F39] group/card">
                  <img 
                    src={martinImg} 
                    alt="Martin Kretz - Managing Director" 
                    className="w-full h-full object-cover object-top filter grayscale contrast-105 group-hover/card:grayscale-0 transition-all duration-500 scale-100 group-hover/card:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0A1412] via-transparent to-transparent opacity-85" />
                  <div className="absolute bottom-3 left-3 right-3 text-left">
                    <p className="text-xs font-bold text-white leading-tight">Martin Kretz</p>
                    <p className="text-[10px] text-[#B7E36A] uppercase tracking-wide">Managing Director</p>
                  </div>
                </div>

                <div className="relative rounded-2xl overflow-hidden aspect-[3/4] border border-[#233F39] group/card">
                  <img 
                    src={valentinImg} 
                    alt="Valentin Kretz - Associate Director" 
                    className="w-full h-full object-cover object-top filter grayscale contrast-105 group-hover/card:grayscale-0 transition-all duration-500 scale-100 group-hover/card:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0A1412] via-transparent to-transparent opacity-85" />
                  <div className="absolute bottom-3 left-3 right-3 text-left">
                    <p className="text-xs font-bold text-white leading-tight">Valentin Kretz</p>
                    <p className="text-[10px] text-[#B7E36A] uppercase tracking-wide">Associate Director</p>
                  </div>
                </div>
              </div>

              {/* Founder quote pill */}
              <div className="p-4 rounded-2xl bg-[#0B1513] border border-[#1A2E2A] text-left space-y-2">
                <div className="flex items-center gap-2">
                  <div className="flex -space-x-2">
                    <img src={sandrineImg} alt="Sandrine" className="w-7 h-7 rounded-full border border-white/20 object-cover" />
                    <img src={olivierImg} alt="Olivier" className="w-7 h-7 rounded-full border border-white/20 object-cover" />
                    <img src={louisImg} alt="Louis" className="w-7 h-7 rounded-full border border-white/20 object-cover" />
                  </div>
                  <span className="text-xs text-[#8BA49F] font-medium">Kretz Family Collective</span>
                </div>
                <p className="text-xs text-[#C6D8D4] italic leading-relaxed">
                  "Our discipline is rooted in family trust, uncompromising architectural standards, and bespoke representation for every client."
                </p>
              </div>
            </div>

            {/* Quick stats ribbon */}
            <div className="mt-6 pt-5 border-t border-[#1C332F] grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="text-lg font-black text-white">€1.4B+</p>
                <p className="text-[10px] text-[#7E9691] uppercase tracking-wider">Volume Sold</p>
              </div>
              <div className="border-x border-[#1C332F]">
                <p className="text-lg font-black text-[#B7E36A]">100%</p>
                <p className="text-[10px] text-[#7E9691] uppercase tracking-wider">Family Values</p>
              </div>
              <div>
                <p className="text-lg font-black text-white">65+</p>
                <p className="text-[10px] text-[#7E9691] uppercase tracking-wider">Global Agents</p>
              </div>
            </div>
          </div>

          {/* Right Column: Full User Discipline Statement & Dual Marketing Strategy */}
          <div className="lg:col-span-7 flex flex-col justify-between space-y-6">
            
            {/* Primary Discipline Statement Card */}
            <div className="bg-[#12201D] border border-[#1E3631] rounded-3xl p-8 sm:p-10 text-left relative overflow-hidden">
              <div className="inline-block text-xs uppercase tracking-widest font-bold text-[#B7E36A] mb-3">
                Core Foundation
              </div>
              
              <h3 className="text-2xl sm:text-3xl font-extrabold text-white mb-5 tracking-tight leading-snug">
                On Discipline
              </h3>

              <div className="space-y-4 text-base sm:text-lg text-[#C7D9D5] leading-relaxed font-normal">
                <p>
                  Specializing in luxury real estate, <strong>Kretz Agency</strong> brings a fresh perspective to the high-end market. Founded on family values, the Agency collaborates with the best agents in France and internationally.
                </p>
                <p className="text-sm sm:text-base text-[#9DB2AE]">
                  Kretz agents benefit from a shared client base to support you in each of your real estate projects. The Agency offers a different vision of luxury real estate, with cutting-edge marketing to showcase each property, either through public communication or an off-market strategy.
                </p>
              </div>

              {/* Dual Strategy Tabs: Public vs Off-Market */}
              <div className="mt-8 pt-6 border-t border-[#1E3631]">
                <div className="flex items-center gap-3 mb-4">
                  <button
                    onClick={() => setActiveStrategyTab('off-market')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                      activeStrategyTab === 'off-market'
                        ? 'bg-[#B7E36A] text-[#0C1715] shadow-md'
                        : 'bg-[#0E1B18] text-[#8DA6A1] hover:text-white border border-[#1E3631]'
                    }`}
                  >
                    <EyeOff className="w-3.5 h-3.5" />
                    <span>Off-Market Confidential Strategy</span>
                  </button>

                  <button
                    onClick={() => setActiveStrategyTab('public')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                      activeStrategyTab === 'public'
                        ? 'bg-[#B7E36A] text-[#0C1715] shadow-md'
                        : 'bg-[#0E1B18] text-[#8DA6A1] hover:text-white border border-[#1E3631]'
                    }`}
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>Cutting-Edge Public Marketing</span>
                  </button>
                </div>

                {activeStrategyTab === 'off-market' ? (
                  <div className="p-4 rounded-2xl bg-[#091311] border border-[#1A2E2A] text-left text-xs text-[#9DB2AE] space-y-2">
                    <div className="flex items-center gap-2 text-white font-semibold">
                      <Lock className="w-4 h-4 text-[#B7E36A]" />
                      <span>Ultra-Confidential Mandates & Family Office Networks</span>
                    </div>
                    <p className="leading-relaxed">
                      For sellers requiring absolute privacy, properties are matched directly to qualified buyers in our closed global database without public listings, internet diffusion, or signage. Protected by strict non-disclosure agreements.
                    </p>
                  </div>
                ) : (
                  <div className="p-4 rounded-2xl bg-[#091311] border border-[#1A2E2A] text-left text-xs text-[#9DB2AE] space-y-2">
                    <div className="flex items-center gap-2 text-white font-semibold">
                      <Award className="w-4 h-4 text-[#B7E36A]" />
                      <span>Cinematic Media, 10M+ Social Reach & Global Press</span>
                    </div>
                    <p className="leading-relaxed">
                      High-end editorial video production, drone architecture reveals, international magazine spreads (AD, Vogue, Figaro Immobilier), and targeted digital showcasing reaching ultra-high-net-worth investors across Europe and the Americas.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Dual Action Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button
                onClick={onNavigateContact}
                className="p-5 rounded-2xl bg-[#142622] hover:bg-[#1A312C] border border-[#23423B] text-left transition-all group cursor-pointer"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-[#B7E36A] uppercase tracking-wider">Private Advisory</span>
                  <ArrowRight className="w-4 h-4 text-[#B7E36A] group-hover:translate-x-1 transition-transform" />
                </div>
                <p className="text-sm font-bold text-white mb-1">Confidential Mandate</p>
                <p className="text-xs text-[#87A09B]">Entrust your luxury acquisition or sale to Kretz Agency.</p>
              </button>

              <button
                onClick={onNavigateProperties}
                className="p-5 rounded-2xl bg-[#142622] hover:bg-[#1A312C] border border-[#23423B] text-left transition-all group cursor-pointer"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-[#B7E36A] uppercase tracking-wider">Fractional Assets</span>
                  <ArrowRight className="w-4 h-4 text-[#B7E36A] group-hover:translate-x-1 transition-transform" />
                </div>
                <p className="text-sm font-bold text-white mb-1">Tokenized Properties</p>
                <p className="text-xs text-[#87A09B]">Invest in verified high-yield European prime real estate from €750.</p>
              </button>
            </div>

          </div>
        </div>

        {/* Part 2: A Family Expanded by a Unique Network in France and Internationally */}
        <div className="bg-[#12201D] border border-[#1E3631] rounded-3xl p-8 sm:p-12 relative overflow-hidden">
          
          {/* Subtle background glow */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-700/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10">
            
            {/* Header Block */}
            <div className="max-w-3xl text-left mb-10 space-y-4">
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#182C27] border border-[#23423B] text-[#B7E36A] text-xs font-semibold uppercase tracking-wider">
                <Globe className="w-3.5 h-3.5 text-[#B7E36A]" />
                <span>Collaborative Network</span>
              </div>

              <h3 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white tracking-tight leading-snug">
                A Family Expanded by a Unique Network in France and Internationally
              </h3>

              <div className="space-y-4 text-base sm:text-lg text-[#C7D9D5] leading-relaxed">
                <p>
                  Each Kretz agent, in France and internationally, represents the family that has passed on the Agency’s unique expertise. In addition to sharing our values and expertise, Kretz agents have a deep attachment to their region, knowing every corner of it.
                </p>
                <p className="text-sm sm:text-base text-[#9DB2AE]">
                  Our innovative collaborative approach allows all agents in the network and the Kretz family to seize every opportunity and effectively meet all your real estate projects.
                </p>
              </div>
            </div>

            {/* Network Pillars Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
              
              <div className="p-6 rounded-2xl bg-[#0B1513] border border-[#1C332F] text-left space-y-3">
                <div className="w-10 h-10 rounded-xl bg-[#162723] flex items-center justify-center text-[#B7E36A] border border-[#233F39]">
                  <HeartHandshake className="w-5 h-5" />
                </div>
                <h4 className="text-base font-bold text-white">Family Values & Heritage</h4>
                <p className="text-xs text-[#8DA6A1] leading-relaxed">
                  Every partner agent is hand-selected and trained in the Kretz methodology, ensuring high empathy, transparency, and personal commitment to every buyer and seller.
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-[#0B1513] border border-[#1C332F] text-left space-y-3">
                <div className="w-10 h-10 rounded-xl bg-[#162723] flex items-center justify-center text-[#B7E36A] border border-[#233F39]">
                  <Compass className="w-5 h-5" />
                </div>
                <h4 className="text-base font-bold text-white">Deep Local Attachment</h4>
                <p className="text-xs text-[#8DA6A1] leading-relaxed">
                  Our regional agents live and breathe their territories, unlocking unpublished historic estates, private waterfronts, and confidential development plots.
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-[#0B1513] border border-[#1C332F] text-left space-y-3">
                <div className="w-10 h-10 rounded-xl bg-[#162723] flex items-center justify-center text-[#B7E36A] border border-[#233F39]">
                  <Users className="w-5 h-5" />
                </div>
                <h4 className="text-base font-bold text-white">Shared Global Client Base</h4>
                <p className="text-xs text-[#8DA6A1] leading-relaxed">
                  A fluid, unified CRM and shared network allows seamless cross-border matches between international high-net-worth investors and premier French prime assets.
                </p>
              </div>

            </div>

            {/* Interactive Regional Hub Directory */}
            <div className="bg-[#091311] border border-[#1A2E2A] rounded-2xl p-6 sm:p-8">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 pb-6 border-b border-[#1A2E2A]">
                <div>
                  <h4 className="text-base font-bold text-white flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-[#B7E36A]" />
                    Regional Presence Across France & Prime International Capitals
                  </h4>
                  <p className="text-xs text-[#7F9994] mt-1">Select a territory to explore active agency coverage and key assets.</p>
                </div>

                <button
                  onClick={onNavigateTeam}
                  className="inline-flex items-center gap-2 text-xs font-bold text-[#B7E36A] hover:text-white transition-colors cursor-pointer"
                >
                  <span>Meet all 65+ Kretz Agents</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Territory Selector Tabs */}
              <div className="flex flex-wrap gap-2 mb-6">
                {regionalHubs.map((hub, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedRegion(idx)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                      selectedRegion === idx
                        ? 'bg-[#1C3631] text-[#B7E36A] border border-[#2F5950] shadow-xs'
                        : 'bg-[#0E1A17] text-[#809994] hover:text-white border border-[#162A25]'
                    }`}
                  >
                    {hub.region}
                  </button>
                ))}
              </div>

              {/* Active Territory Card */}
              <div className="bg-[#101D1A] border border-[#1D3631] rounded-xl p-5 text-left grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                <div className="md:col-span-8 space-y-2">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-white">{regionalHubs[selectedRegion].region}</span>
                    <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-[#18302A] text-[#B7E36A] border border-[#254A41] font-medium">
                      {regionalHubs[selectedRegion].agentsCount}
                    </span>
                  </div>
                  <p className="text-xs text-[#9DB2AE]">{regionalHubs[selectedRegion].subtext}</p>
                  <p className="text-xs text-[#C6D8D4] pt-1">
                    <strong className="text-white">Signature Properties:</strong> {regionalHubs[selectedRegion].keyAssets}
                  </p>
                </div>

                <div className="md:col-span-4 flex flex-col sm:flex-row md:flex-col gap-2 justify-end">
                  <button
                    onClick={onNavigateTeam}
                    className="btn btn-secondary py-2.5 px-4 text-xs font-bold text-white bg-[#162723] hover:bg-[#1E3631] border border-[#26443E] rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all"
                  >
                    <Users className="w-3.5 h-3.5 text-[#B7E36A]" />
                    <span>View Regional Team</span>
                  </button>
                  <button
                    onClick={onNavigateContact}
                    className="btn py-2.5 px-4 text-xs font-bold text-[#0C1715] bg-[#B7E36A] hover:bg-[#A6D657] rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all shadow-sm"
                  >
                    <PhoneCall className="w-3.5 h-3.5" />
                    <span>Request Local Broker</span>
                  </button>
                </div>
              </div>

            </div>

          </div>
        </div>

      </div>
    </section>
  );
};
