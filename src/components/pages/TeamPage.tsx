import React, { useState } from 'react';
import { 
  Building2, Users, ShieldCheck, Mail, Phone, Calendar, ArrowRight, 
  Sparkles, CheckCircle2, Award, Globe, Heart, Send, X, ExternalLink,
  ChevronRight, Compass, KeyRound, Star, Tv, Search, MapPin
} from 'lucide-react';
import { ALL_KRETZ_MEMBERS, TeamMember } from '../../data/kretzTeam';

import olivierImg from '../../assets/images/team/olivier_kretz.jpg';
import sandrineImg from '../../assets/images/team/sandrine_kretz.jpg';
import martinImg from '../../assets/images/team/martin_kretz.jpg';
import valentinImg from '../../assets/images/team/valentin_kretz.jpg';
import louisImg from '../../assets/images/team/louis_kretz.jpg';
import raphaelImg from '../../assets/images/team/raphael_kretz.jpg';
import alexandreImg from '../../assets/images/team/alexandre_bruneau.jpg';
import adrianaImg from '../../assets/images/team/adriana_pinos.jpg';
import yannImg from '../../assets/images/team/yann_miossec.jpg';
import jimmyImg from '../../assets/images/team/jimmy_delage.jpg';
import lisaImg from '../../assets/images/team/lisa_azzarone.jpg';
import clementineImg from '../../assets/images/team/clementine_busset.jpg';
import mathildeImg from '../../assets/images/team/mathilde_mas.jpg';
import amandineImg from '../../assets/images/team/amandine_landois.jpg';
import jorgeImg from '../../assets/images/team/jorge_de_andres.jpg';
import camilleImg from '../../assets/images/team/camille_richard.jpg';

const LOCAL_PHOTOS: Record<string, string> = {
  'olivier-kretz': olivierImg,
  'sandrine-kretz': sandrineImg,
  'martin-kretz': martinImg,
  'valentin-kretz': valentinImg,
  'louis-kretz': louisImg,
  'raphael-kretz': raphaelImg,
  'alexandre-bruneau': alexandreImg,
  'adriana-pinos': adrianaImg,
  'yann-miossec': yannImg,
  'jimmy-delage': jimmyImg,
  'lisa-azzarone': lisaImg,
  'clementine-busset': clementineImg,
  'mathilde-mas': mathildeImg,
  'amandine-landois': amandineImg,
  'jorge-de-andres': jorgeImg,
  'camille-richard': camilleImg,
};

interface TeamPageProps {
  onExplore: () => void;
  onContact: () => void;
}

export const TeamPage: React.FC<TeamPageProps> = ({ onExplore, onContact }) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [contactingMember, setContactingMember] = useState<TeamMember | null>(null);
  const [inquirySubject, setInquirySubject] = useState<string>('private_consultation');
  const [inquiryMessage, setInquiryMessage] = useState<string>('');
  const [inquirySuccess, setInquirySuccess] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const teamMembers: TeamMember[] = ALL_KRETZ_MEMBERS;

  const filteredMembers = teamMembers.filter((m) => {
    const matchesCategory = selectedCategory === 'all' || m.category === selectedCategory;
    const matchesSearch = !searchQuery.trim() || 
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.specialty.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.role.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleSendInquiry = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setInquirySuccess(true);
      setTimeout(() => {
        setInquirySuccess(false);
        setContactingMember(null);
        setInquiryMessage('');
      }, 2500);
    }, 700);
  };

  return (
    <div className="min-h-screen bg-[#FDFEFC] text-[#142421]">
      {/* Editorial Luxury Agency Hero */}
      <section className="relative overflow-hidden bg-[#0A1613] text-white pt-24 pb-20 border-b border-[#1E332E]">
        <div className="absolute inset-0 z-0 opacity-25 mix-blend-luminosity">
          <img 
            src="/src/assets/images/kretz_agency_headquarters_1792092491560.jpg" 
            alt="Kretz Agency Boulogne Headquarters" 
            className="w-full h-full object-cover"
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-[#0A1613] via-[#0A1613]/85 to-transparent z-0" />

        <div className="container max-w-[1240px] mx-auto px-4 relative z-10">
          <div className="max-w-3xl space-y-6">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-[11px] font-extrabold tracking-widest uppercase text-[#B7E36A] bg-white/10 px-3 py-1 rounded-full border border-white/15">
                The Agency · Founded in 2007
              </span>
              <div className="flex items-center gap-1.5 text-xs text-amber-300 bg-amber-950/60 border border-amber-500/30 px-3 py-1 rounded-full font-semibold">
                <Tv className="w-3.5 h-3.5" />
                <span>Stars of Netflix “The Parisian Agency” (L'Agence)</span>
              </div>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.08] text-white">
              A Family Affair, <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#B7E36A] via-emerald-300 to-teal-200">
                A Global Luxury Vision.
              </span>
            </h1>

            <p className="text-base sm:text-lg text-[#C8D1CE] leading-relaxed max-w-2xl font-normal">
              Born around the dining room table in Boulogne-Billancourt, Kretz Real Estate has transformed the world of prestige real estate. We combine authentic family warmth and unwavering discretion with institutional tokenized liquidity for the world’s most extraordinary homes.
            </p>

            {/* Quick KPI Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-white/10 text-left">
              <div>
                <div className="text-2xl sm:text-3xl font-black text-white tabular-nums">€2.8B+</div>
                <div className="text-xs text-[#95A5A0] mt-0.5">Luxury Portfolio Volume</div>
              </div>
              <div>
                <div className="text-2xl sm:text-3xl font-black text-[#B7E36A] tabular-nums">100+</div>
                <div className="text-xs text-[#95A5A0] mt-0.5">Advisors Across 10 Countries</div>
              </div>
              <div>
                <div className="text-2xl sm:text-3xl font-black text-white tabular-nums">17+</div>
                <div className="text-xs text-[#95A5A0] mt-0.5">Years of Excellence</div>
              </div>
              <div>
                <div className="text-2xl sm:text-3xl font-black text-[#B7E36A] tabular-nums">100%</div>
                <div className="text-xs text-[#95A5A0] mt-0.5">Independent & Family-Run</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Agency Story & The Netflix Heritage */}
      <section className="py-16 bg-white border-b border-[#E3E8E3]">
        <div className="container max-w-[1240px] mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-7 space-y-6">
              <span className="text-xs font-bold uppercase tracking-wider text-[#27845D]">Our Heritage & Philosophy</span>
              <h2 className="text-2xl sm:text-4xl font-black text-[#142421] tracking-tight">
                From Boulogne-Billancourt to the Global Stage
              </h2>
              <div className="space-y-4 text-sm sm:text-base text-[#52605C] leading-relaxed">
                <p>
                  In 2007, <strong>Olivier and Sandrine Kretz</strong> made a bold decision: to leave their corporate careers and create a different kind of luxury agency—one where business meetings happen over home-cooked espresso, where every client is welcomed as an honored guest, and where absolute integrity takes precedence over quick transactions.
                </p>
                <p>
                  Joined one by one by their four sons—<strong>Martin, Valentin, Louis, and Raphaël</strong>—alongside the beloved family matriarch <strong>Majo</strong>, the Kretz family became household names globally through the hit docu-series <em>The Parisian Agency (L'Agence)</em>, broadcast internationally on Netflix.
                </p>
                <p>
                  Today, Kretz Real Estate represents iconic châteaux in the Loire Valley, panoramic penthouses overlooking the Eiffel Tower, private waterfront estates in Cannes and Saint-Tropez, and ski chalets in Courchevel. By introducing blockchain tokenization to European prime properties, Kretz allows both high-net-worth investors and fractional buyers to participate in generational European real estate assets.
                </p>
              </div>

              {/* Pillars Bento */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
                <div className="p-4 rounded-2xl bg-[#F6F8F5] border border-[#E3E8E3]">
                  <Heart className="w-5 h-5 text-[#27845D] mb-2" />
                  <h4 className="font-bold text-sm text-[#142421]">Family Spirit</h4>
                  <p className="text-xs text-[#69736F] mt-1">Direct communication with family principals on every flagship asset.</p>
                </div>
                <div className="p-4 rounded-2xl bg-[#F6F8F5] border border-[#E3E8E3]">
                  <ShieldCheck className="w-5 h-5 text-[#27845D] mb-2" />
                  <h4 className="font-bold text-sm text-[#142421]">Total Discretion</h4>
                  <p className="text-xs text-[#69736F] mt-1">Confidential off-market sales for discerning personalities & family offices.</p>
                </div>
                <div className="p-4 rounded-2xl bg-[#F6F8F5] border border-[#E3E8E3]">
                  <Sparkles className="w-5 h-5 text-[#27845D] mb-2" />
                  <h4 className="font-bold text-sm text-[#142421]">Tokenized Access</h4>
                  <p className="text-xs text-[#69736F] mt-1">Fractional liquidity and instant monthly yields starting from €1,000.</p>
                </div>
              </div>
            </div>

            <div className="lg:col-span-5">
              <div className="relative rounded-3xl overflow-hidden border border-[#E3E8E3] shadow-xl bg-slate-100 group">
                <img 
                  src="/src/assets/images/kretz_agency_headquarters_1792092491560.jpg" 
                  alt="Kretz Paris Agency Interior" 
                  className="w-full h-[460px] object-cover group-hover:scale-103 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                <div className="absolute bottom-6 left-6 right-6 text-white space-y-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-[#B7E36A] bg-black/40 px-2.5 py-1 rounded-md backdrop-blur-md">
                    Paris Headquarters
                  </span>
                  <h3 className="text-xl font-bold">The Boulogne-Billancourt Salon</h3>
                  <p className="text-xs text-white/80">
                    Where exceptional Parisian properties and international luxury buyers meet in private discretion.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Team Directory Header & Interactive Filter Bar */}
      <section className="py-12 container max-w-[1240px] mx-auto px-4">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-[#E3E8E3]">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-[#27845D]">Our Leadership & Advisors</span>
            <h2 className="text-3xl sm:text-4xl font-black text-[#142421] tracking-tight mt-1">
              Meet the Kretz Family & Partners
            </h2>
            <p className="text-xs sm:text-sm text-[#69736F] max-w-xl mt-1">
              Direct access to our senior partners and prestige advisors across France, Monaco, Spain, Caribbean, and the US. Select an advisor to review their credentials, active luxury mandate specialties, or request a private consultation.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-[#8C9B96] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input 
                type="text"
                placeholder="Search by name, city, specialty..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-2 text-xs bg-white border border-[#D5DDD6] rounded-xl text-[#142421] placeholder-[#8C9B96] focus:outline-hidden focus:border-[#27845D] w-full sm:w-64"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8C9B96] hover:text-[#142421] text-xs"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Segmented Controls */}
            <div className="flex items-center gap-1.5 p-1.5 bg-[#EEF2ED] rounded-2xl border border-[#E3E8E3] overflow-x-auto shrink-0">
              {[
                { id: 'all', label: `All (${teamMembers.length})` },
                { id: 'founders', label: 'Founders' },
                { id: 'partners', label: 'Directors' },
                { id: 'executives', label: 'Head Office' },
                { id: 'regional', label: 'Regional Network' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setSelectedCategory(tab.id)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all whitespace-nowrap cursor-pointer ${
                    selectedCategory === tab.id
                      ? 'bg-[#142421] text-white shadow-sm'
                      : 'text-[#52605C] hover:text-[#142421] hover:bg-white/60'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Team Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pt-10">
          {filteredMembers.map((member) => {
            const memberPhoto = LOCAL_PHOTOS[member.id] || member.image || member.remoteImage;
            return (
              <div
                key={member.id}
                className="bg-white rounded-3xl border border-[#E3E8E3] overflow-hidden shadow-xs hover:shadow-xl hover:border-[#142421]/20 transition-all duration-300 flex flex-col group"
              >
                {/* Portrait Frame */}
                <div className="relative aspect-[3/4] overflow-hidden bg-slate-100">
                  <img
                    src={memberPhoto}
                    alt={member.name}
                    className="w-full h-full object-cover group-hover:scale-104 transition-transform duration-500"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      const target = e.currentTarget;
                      if (member.remoteImage && target.src !== member.remoteImage) {
                        target.src = member.remoteImage;
                      }
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />

                {/* Netflix Badge if featured */}
                {member.netflixFeatured && (
                  <div className="absolute top-4 left-4 z-10 flex items-center gap-1 bg-black/75 backdrop-blur-md text-amber-300 text-[10px] font-bold px-2.5 py-1 rounded-full border border-amber-500/30">
                    <Star className="w-3 h-3 fill-amber-300 text-amber-300" />
                    <span>L'Agence · Netflix</span>
                  </div>
                )}

                <div className="absolute top-4 right-4 z-10 bg-white/90 backdrop-blur-md text-[#142421] text-[10px] font-bold px-2.5 py-1 rounded-full border border-white/40">
                  {member.location.split('&')[0]}
                </div>

                {/* Overlaid Title */}
                <div className="absolute bottom-4 left-5 right-5 text-white z-10">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#B7E36A] block mb-0.5">
                    {member.role}
                  </span>
                  <h3 className="text-2xl font-black tracking-tight">{member.name}</h3>
                </div>
              </div>

              {/* Bio & Details */}
              <div className="p-6 flex-1 flex flex-col justify-between space-y-5">
                <div className="space-y-3">
                  <div className="text-xs font-semibold text-[#27845D] flex items-center gap-1.5">
                    <Compass className="w-3.5 h-3.5 shrink-0" />
                    <span>Specialty: {member.specialty}</span>
                  </div>

                  <p className="text-xs sm:text-sm text-[#52605C] leading-relaxed line-clamp-4">
                    {member.bio}
                  </p>
                </div>

                <div className="space-y-4 pt-4 border-t border-[#E3E8E3]">
                  {/* Languages Spoken */}
                  <div className="flex items-center justify-between text-xs text-[#69736F]">
                    <span className="font-semibold text-[#142421]">Languages:</span>
                    <span className="font-medium">{member.languages.join(' · ')}</span>
                  </div>

                  {/* Action Bar */}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      onClick={() => setContactingMember(member)}
                      className="w-full btn btn-primary text-xs font-bold py-2.5 bg-[#142421] text-white hover:bg-[#1E332E] rounded-xl flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <Mail className="w-3.5 h-3.5 text-[#B7E36A]" />
                      <span>Contact</span>
                    </button>
                    <a
                      href={`tel:${member.phone}`}
                      className="w-full btn btn-secondary text-xs font-bold py-2.5 border border-[#E3E8E3] hover:border-[#142421] text-[#142421] rounded-xl flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Phone className="w-3.5 h-3.5 text-[#27845D]" />
                      <span>Direct Call</span>
                    </a>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        </div>
      </section>

      {/* The Kretz Private Club & Property Owner Mandates */}
      <section className="py-20 bg-[#F6F8F5] border-t border-[#E3E8E3]">
        <div className="container max-w-[1240px] mx-auto px-4">
          <div className="bg-[#0A1613] text-white rounded-3xl p-8 sm:p-14 relative overflow-hidden border border-[#1E332E] shadow-2xl">
            <div className="max-w-2xl space-y-6 relative z-10 text-left">
              <span className="text-xs font-bold uppercase tracking-wider text-[#B7E36A]">
                The Kretz Private Mandate
              </span>
              <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight">
                Entrust Your Property <br />to the Kretz Family
              </h2>
              <p className="text-sm sm:text-base text-[#C8D1CE] leading-relaxed">
                Whether you own a Haussmannian Hôtel Particulier, a Mediterranean seafront estate, or an architectural alpine chalet, benefit from our confidential global network, media power, and cutting-edge tokenization technology.
              </p>

              <div className="flex flex-wrap items-center gap-4 pt-2">
                <button
                  onClick={onContact}
                  className="btn btn-accent px-8 py-3.5 rounded-xl font-extrabold text-xs text-[#0A1613] bg-[#B7E36A] hover:bg-[#a5d456] flex items-center gap-2 cursor-pointer shadow-lg"
                >
                  <span>Request Confidential Appraisal</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  onClick={onExplore}
                  className="btn btn-secondary px-6 py-3.5 rounded-xl font-bold text-xs bg-white/10 hover:bg-white/20 border border-white/20 text-white cursor-pointer"
                >
                  Explore Tokenized Marketplace
                </button>
              </div>
            </div>

            <div className="hidden lg:block absolute right-12 bottom-8 w-80 text-right opacity-90 pointer-events-none">
              <div className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md space-y-2 text-left">
                <div className="text-xs font-bold text-[#B7E36A] uppercase tracking-wide">Paris Office</div>
                <div className="text-sm font-semibold text-white">43 Rue du Château</div>
                <div className="text-xs text-white/70">92100 Boulogne-Billancourt, Paris</div>
                <div className="text-xs text-[#B7E36A] font-bold pt-2 border-t border-white/10">info@kretz.site</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Direct Advisor Contact Modal */}
      {contactingMember && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 relative shadow-2xl border border-[#E3E8E3] space-y-5">
            <button
              onClick={() => setContactingMember(null)}
              className="absolute top-5 right-5 p-2 rounded-full text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {inquirySuccess ? (
              <div className="py-8 text-center space-y-3">
                <div className="w-14 h-14 rounded-full bg-emerald-100 text-[#27845D] flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-black text-[#142421]">Inquiry Transmitted</h3>
                <p className="text-xs sm:text-sm text-[#52605C] max-w-sm mx-auto">
                  Your confidential request has been personally routed to <strong>{contactingMember.name}</strong> and the Kretz executive office. We will reply within 4 hours.
                </p>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-4 pb-4 border-b border-[#E3E8E3]">
                  <img
                    src={contactingMember.image}
                    alt={contactingMember.name}
                    className="w-16 h-16 rounded-2xl object-cover border border-[#E3E8E3]"
                  />
                  <div>
                    <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#27845D]">
                      Direct Advisory Mandate
                    </span>
                    <h3 className="text-xl font-black text-[#142421]">{contactingMember.name}</h3>
                    <p className="text-xs text-[#69736F]">{contactingMember.role}</p>
                  </div>
                </div>

                <form onSubmit={handleSendInquiry} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-[#142421] mb-1">Inquiry Purpose</label>
                    <select
                      value={inquirySubject}
                      onChange={(e) => setInquirySubject(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#E3E8E3] text-xs bg-[#F9FAF8] focus:outline-none focus:border-[#142421]"
                    >
                      <option value="private_consultation">Confidential Property Acquisition / Search</option>
                      <option value="property_valuation">Appraisal & Entrusting a Luxury Property</option>
                      <option value="tokenization_inquiry">Real Estate Tokenization & Fractional Syndication</option>
                      <option value="monaco_riviera">French Riviera & Monaco Private Mandates</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-[#142421] mb-1">Your Full Name</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Jean de Montfort"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-[#E3E8E3] text-xs bg-[#F9FAF8] focus:outline-none focus:border-[#142421]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#142421] mb-1">Direct Phone / WhatsApp</label>
                      <input
                        type="tel"
                        required
                        placeholder="+33 6 00 00 00 00"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-[#E3E8E3] text-xs bg-[#F9FAF8] focus:outline-none focus:border-[#142421]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#142421] mb-1">Email Address</label>
                    <input
                      type="email"
                      required
                      placeholder="investor@familyoffice.com"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#E3E8E3] text-xs bg-[#F9FAF8] focus:outline-none focus:border-[#142421]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#142421] mb-1">Confidential Note / Property Details</label>
                    <textarea
                      rows={3}
                      required
                      value={inquiryMessage}
                      onChange={(e) => setInquiryMessage(e.target.value)}
                      placeholder={`Describe your acquisition criteria or property location for ${contactingMember.name.split(' ')[0]}...`}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#E3E8E3] text-xs bg-[#F9FAF8] focus:outline-none focus:border-[#142421]"
                    />
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full btn btn-primary py-3 rounded-xl font-bold text-xs bg-[#142421] text-white hover:bg-[#1E332E] flex items-center justify-center gap-2 cursor-pointer shadow-md"
                    >
                      {isSubmitting ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <>
                          <Send className="w-4 h-4 text-[#B7E36A]" />
                          <span>Transmit Message to {contactingMember.name}</span>
                        </>
                      )}
                    </button>
                    <p className="text-[10px] text-center text-[#69736F] mt-2">
                      Protected under strict professional secrecy & Kretz NDA standards.
                    </p>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
