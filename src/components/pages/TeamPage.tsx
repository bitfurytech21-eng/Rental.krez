import React, { useState, useEffect } from 'react';
import { 
  Building2, Users, ShieldCheck, Mail, Phone, Calendar, ArrowRight, 
  Sparkles, CheckCircle2, Award, Globe, Heart, Send, X, ExternalLink,
  ChevronRight, Compass, KeyRound, Star, Tv, Search, MapPin, AlertCircle
} from 'lucide-react';
import { ALL_KRETZ_MEMBERS, TeamMember } from '../../data/kretzTeam';
import { useAuth } from '../../lib/auth';
import { contactApi } from '../../lib/api';
import { TurnstileWidget } from '../security/TurnstileWidget';

import kretzHeadquartersImg from '../../assets/images/kretz_agency_headquarters_1792092491560.jpg';
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

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
  const { user } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [contactingMember, setContactingMember] = useState<TeamMember | null>(null);
  const [inquiryFullName, setInquiryFullName] = useState<string>(user?.fullName || '');
  const [inquiryPhone, setInquiryPhone] = useState<string>(user?.phoneNumber || '');
  const [inquiryEmail, setInquiryEmail] = useState<string>(user?.email || '');
  const [inquirySubject, setInquirySubject] = useState<string>('private_consultation');
  const [inquiryMessage, setInquiryMessage] = useState<string>('');
  const [turnstileToken, setTurnstileToken] = useState<string>('');
  const [inquiryError, setInquiryError] = useState<string | null>(null);
  const [inquiryTicketId, setInquiryTicketId] = useState<string | null>(null);
  const [inquirySuccess, setInquirySuccess] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (!contactingMember) return;
    setInquiryError(null);
    setInquirySuccess(false);
    setInquiryTicketId(null);
    if (user?.fullName && !inquiryFullName) setInquiryFullName(user.fullName);
    if (user?.email && !inquiryEmail) setInquiryEmail(user.email);
    if (user?.phoneNumber && !inquiryPhone) setInquiryPhone(user.phoneNumber);
  }, [contactingMember, user]);

  useEffect(() => {
    if (!contactingMember) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSubmitting) {
        setContactingMember(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [contactingMember, isSubmitting]);

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

  const subjectLabels: Record<string, string> = {
    private_consultation: 'Confidential Property Acquisition / Search',
    property_valuation: 'Appraisal & Entrusting a Luxury Property',
    tokenization_inquiry: 'Real Estate Tokenization & Fractional Syndication',
    monaco_riviera: 'French Riviera & Monaco Private Mandates',
  };

  const handleSendInquiry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting || !contactingMember) return;
    setInquiryError(null);

    const trimmedName = inquiryFullName.trim();
    const trimmedEmail = inquiryEmail.trim().toLowerCase();
    const trimmedPhone = inquiryPhone.trim();
    const trimmedNote = inquiryMessage.trim();

    if (!trimmedName) {
      setInquiryError('Please enter your full name.');
      return;
    }
    if (!EMAIL_PATTERN.test(trimmedEmail)) {
      setInquiryError('Please enter a valid email address.');
      return;
    }
    if (!trimmedPhone || trimmedPhone.length < 6) {
      setInquiryError('Please provide a direct phone or WhatsApp contact number.');
      return;
    }
    if (trimmedNote.length < 10) {
      setInquiryError('Please provide at least 10 characters describing your property criteria or request.');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await contactApi.submit({
        fullName: trimmedName,
        email: trimmedEmail,
        phone: trimmedPhone,
        advisorName: contactingMember.name,
        topic: `Direct Mandate (${contactingMember.name}) — ${subjectLabels[inquirySubject] || inquirySubject}`,
        message: `[Advisor: ${contactingMember.name} · ${contactingMember.role}]\n[Phone: ${trimmedPhone}]\n${trimmedNote}`,
        turnstileToken: turnstileToken || undefined,
      });

      setInquiryTicketId(response.data?.ticketId || null);
      setInquirySuccess(true);
      setInquiryMessage('');
    } catch (err: any) {
      setInquiryError(err?.message || 'Unable to transmit your inquiry right now. Please retry.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B1B30] text-white">
      {/* Editorial Luxury Agency Hero */}
      <section className="relative overflow-hidden bg-[#0B1B30] text-white pt-24 pb-20 border-b border-[#1D3860]">
        <div className="absolute inset-0 z-0 opacity-25 mix-blend-luminosity">
          <img 
            src={kretzHeadquartersImg} 
            alt="Kretz Agency Boulogne Headquarters" 
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover"
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-[#0B1B30] via-[#0B1B30]/85 to-transparent z-0" />

        <div className="container max-w-[1240px] mx-auto px-4 relative z-10">
          <div className="max-w-3xl space-y-6">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-[11px] font-extrabold tracking-widest uppercase text-[#BEE179] bg-[#102442] px-3.5 py-1.5 rounded-full border border-[#1D3860]">
                The Agency · Founded in 2007
              </span>
              <div className="flex items-center gap-1.5 text-xs text-[#BEE179] bg-[#102442] border border-[#1D3860] px-3.5 py-1.5 rounded-full font-semibold">
                <Tv className="w-3.5 h-3.5" />
                <span>Stars of Netflix “The Parisian Agency” (L'Agence)</span>
              </div>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.08] text-[#BEE179]">
              A Family Affair, <br />
              <span className="text-white italic font-normal">
                A Global Luxury Vision.
              </span>
            </h1>

            <p className="text-base sm:text-lg text-[#D1E2F7] leading-relaxed max-w-2xl font-normal">
              Born around the dining room table in Boulogne-Billancourt, Kretz Real Estate has transformed the world of prestige real estate. We combine authentic family warmth and unwavering discretion with institutional tokenized liquidity for the world’s most extraordinary homes.
            </p>

            {/* Quick KPI Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-[#1D3860] text-left">
              <div>
                <div className="text-2xl sm:text-3xl font-black text-white tabular-nums">€2.8B+</div>
                <div className="text-xs text-[#8EA7C7] mt-0.5">Luxury Portfolio Volume</div>
              </div>
              <div>
                <div className="text-2xl sm:text-3xl font-black text-[#BEE179] tabular-nums">100+</div>
                <div className="text-xs text-[#8EA7C7] mt-0.5">Advisors Across 10 Countries</div>
              </div>
              <div>
                <div className="text-2xl sm:text-3xl font-black text-white tabular-nums">17+</div>
                <div className="text-xs text-[#8EA7C7] mt-0.5">Years of Excellence</div>
              </div>
              <div>
                <div className="text-2xl sm:text-3xl font-black text-[#BEE179] tabular-nums">100%</div>
                <div className="text-xs text-[#8EA7C7] mt-0.5">Independent & Family-Run</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Agency Story & The Netflix Heritage */}
      <section className="py-16 bg-[#0B1B30] border-b border-[#1D3860]">
        <div className="container max-w-[1240px] mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-7 space-y-6">
              <span className="text-xs font-bold uppercase tracking-wider text-[#BEE179]">Our Heritage & Philosophy</span>
              <h2 className="text-2xl sm:text-4xl font-black text-[#BEE179] tracking-tight">
                From Boulogne-Billancourt to the Global Stage
              </h2>
              <div className="space-y-4 text-sm sm:text-base text-[#D1E2F7] leading-relaxed">
                <p>
                  In 2007, <strong className="text-white">Olivier and Sandrine Kretz</strong> made a bold decision: to leave their corporate careers and create a different kind of luxury agency—one where business meetings happen over home-cooked espresso, where every client is welcomed as an honored guest, and where absolute integrity takes precedence over quick transactions.
                </p>
                <p>
                  Joined one by one by their four sons—<strong className="text-white">Martin, Valentin, Louis, and Raphaël</strong>—alongside the beloved family matriarch <strong className="text-white">Majo</strong>, the Kretz family became household names globally through the hit docu-series <em>The Parisian Agency (L'Agence)</em>, broadcast internationally on Netflix.
                </p>
                <p>
                  Today, Kretz Real Estate represents iconic châteaux in the Loire Valley, panoramic penthouses overlooking the Eiffel Tower, private waterfront estates in Cannes and Saint-Tropez, and ski chalets in Courchevel. By introducing blockchain tokenization to European prime properties, Kretz allows both high-net-worth investors and fractional buyers to participate in generational European real estate assets.
                </p>
              </div>

              {/* Pillars Bento */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
                <div className="p-4 rounded-2xl bg-[#102442] border border-[#1D3860]">
                  <Heart className="w-5 h-5 text-[#BEE179] mb-2" />
                  <h4 className="font-bold text-sm text-white">Family Spirit</h4>
                  <p className="text-xs text-[#8EA7C7] mt-1">Direct communication with family principals on every flagship asset.</p>
                </div>
                <div className="p-4 rounded-2xl bg-[#102442] border border-[#1D3860]">
                  <ShieldCheck className="w-5 h-5 text-[#BEE179] mb-2" />
                  <h4 className="font-bold text-sm text-white">Total Discretion</h4>
                  <p className="text-xs text-[#8EA7C7] mt-1">Confidential off-market sales for discerning personalities & family offices.</p>
                </div>
                <div className="p-4 rounded-2xl bg-[#102442] border border-[#1D3860]">
                  <ShieldCheck className="w-5 h-5 text-[#BEE179] mb-2" />
                  <h4 className="font-bold text-sm text-white">Tokenized Access</h4>
                  <p className="text-xs text-[#8EA7C7] mt-1">Fractional liquidity and instant monthly yields starting from €1,000.</p>
                </div>
              </div>
            </div>

            <div className="lg:col-span-5">
              <div className="relative rounded-3xl overflow-hidden border border-[#1D3860] shadow-2xl bg-[#102442] group">
                <img 
                  src={kretzHeadquartersImg} 
                  alt="Kretz Paris Agency Interior" 
                  referrerPolicy="no-referrer"
                  className="w-full h-[460px] object-cover group-hover:scale-103 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
                <div className="absolute bottom-6 left-6 right-6 text-white space-y-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-[#0B1B30] bg-[#BEE179] px-2.5 py-1 rounded-md">
                    Paris Headquarters
                  </span>
                  <h3 className="text-xl font-bold text-white">The Boulogne-Billancourt Salon</h3>
                  <p className="text-xs text-[#D1E2F7]">
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
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-[#1D3860]">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-[#BEE179]">Our Leadership & Advisors</span>
            <h2 className="text-3xl sm:text-4xl font-black text-[#BEE179] tracking-tight mt-1">
              Meet the Kretz Family & Partners
            </h2>
            <p className="text-xs sm:text-sm text-[#8EA7C7] max-w-xl mt-1">
              Direct access to our senior partners and prestige advisors across France, Monaco, Spain, Caribbean, and the US. Select an advisor to review their credentials, active luxury mandate specialties, or request a private consultation.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-[#8EA7C7] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input 
                type="text"
                placeholder="Search by name, city, specialty..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-2.5 text-xs bg-[#102442] border border-[#1D3860] rounded-xl text-white placeholder-[#8EA7C7] focus:outline-none focus:border-[#BEE179] w-full sm:w-64"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8EA7C7] hover:text-white text-xs cursor-pointer"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Segmented Controls */}
            <div className="flex items-center gap-1.5 p-1.5 bg-[#102442] rounded-2xl border border-[#1D3860] overflow-x-auto shrink-0">
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
                      ? 'bg-[#BEE179] text-[#0B1B30] shadow-sm font-black'
                      : 'text-[#8EA7C7] hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Team Grid */}
        {filteredMembers.length === 0 ? (
          <div className="mt-10 p-10 rounded-3xl bg-[#102442] border border-[#1D3860] text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-[#0B1B30] border border-[#1D3860] text-[#BEE179] flex items-center justify-center mx-auto">
              <Search className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-extrabold text-white">No Matching Advisors Found</h3>
              <p className="text-xs sm:text-sm text-[#8EA7C7] max-w-md mx-auto">
                No advisors match "{searchQuery}" in the selected network division. Clear your search or switch divisions to view all partners.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('all');
              }}
              className="px-5 py-2.5 rounded-xl bg-[#BEE179] hover:bg-[#aed860] text-[#0B1B30] text-xs font-extrabold transition-colors cursor-pointer"
            >
              Reset Search & Filters
            </button>
          </div>
        ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pt-10">
          {filteredMembers.map((member) => {
            const memberPhoto = LOCAL_PHOTOS[member.id] || member.image || member.remoteImage;
            return (
              <div
                key={member.id}
                className="bg-[#102442] rounded-3xl border border-[#1D3860] overflow-hidden shadow-xl hover:border-[#BEE179]/60 transition-all duration-300 flex flex-col group"
              >
                {/* Portrait Frame */}
                <div className="relative aspect-[3/4] overflow-hidden bg-[#0B1B30]">
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
                  <div className="absolute inset-0 bg-gradient-to-t from-[#102442] via-black/25 to-transparent" />

                {/* Netflix Badge if featured */}
                {member.netflixFeatured && (
                  <div className="absolute top-4 left-4 z-10 flex items-center gap-1 bg-[#0B1B30]/90 backdrop-blur-md text-[#BEE179] text-[10px] font-bold px-2.5 py-1 rounded-full border border-[#1D3860]">
                    <Star className="w-3 h-3 fill-[#BEE179] text-[#BEE179]" />
                    <span>L'Agence · Netflix</span>
                  </div>
                )}

                <div className="absolute top-4 right-4 z-10 bg-[#0B1B30]/90 backdrop-blur-md text-white text-[10px] font-bold px-2.5 py-1 rounded-full border border-[#1D3860]">
                  {member.location.split('&')[0]}
                </div>

                {/* Overlaid Title */}
                <div className="absolute bottom-4 left-5 right-5 text-white z-10">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#BEE179] block mb-0.5">
                    {member.role}
                  </span>
                  <h3 className="text-2xl font-black tracking-tight text-white">{member.name}</h3>
                </div>
              </div>

              {/* Bio & Details */}
              <div className="p-6 flex-1 flex flex-col justify-between space-y-5">
                <div className="space-y-3">
                  <div className="text-xs font-semibold text-[#BEE179] flex items-center gap-1.5">
                    <Compass className="w-3.5 h-3.5 shrink-0" />
                    <span>Specialty: {member.specialty}</span>
                  </div>

                  <p className="text-xs sm:text-sm text-[#D1E2F7] leading-relaxed line-clamp-4">
                    {member.bio}
                  </p>
                </div>

                <div className="space-y-4 pt-4 border-t border-[#1D3860]">
                  {/* Languages Spoken */}
                  <div className="flex items-center justify-between text-xs text-[#8EA7C7]">
                    <span className="font-semibold text-white">Languages:</span>
                    <span className="font-medium text-[#D1E2F7]">{member.languages.join(' · ')}</span>
                  </div>

                  {/* Action Bar */}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      onClick={() => setContactingMember(member)}
                      className="w-full text-xs font-bold py-2.5 bg-[#BEE179] hover:bg-[#aed860] text-[#0B1B30] rounded-xl flex items-center justify-center gap-1.5 cursor-pointer shadow-md transition-all"
                    >
                      <Mail className="w-3.5 h-3.5 text-[#0B1B30]" />
                      <span>Contact</span>
                    </button>
                    <a
                      href={`tel:${member.phone}`}
                      className="w-full text-xs font-bold py-2.5 border border-[#1D3860] bg-[#0B1B30] hover:bg-[#132745] text-white rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                    >
                      <Phone className="w-3.5 h-3.5 text-[#BEE179]" />
                      <span>Direct Call</span>
                    </a>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        </div>
        )}
      </section>

      {/* The Kretz Private Club & Property Owner Mandates */}
      <section className="py-20 bg-[#F8FAFC] border-t border-[#E2E8F0]">
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
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="advisor-contact-title"
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isSubmitting) setContactingMember(null);
          }}
        >
          <div
            className="bg-white text-slate-900 [color-scheme:light] rounded-t-3xl sm:rounded-3xl max-w-lg w-full max-h-[92dvh] sm:max-h-[88vh] flex flex-col relative shadow-2xl border border-[#E3E8E3] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Pinned Header */}
            <div className="px-5 py-4 sm:px-7 sm:py-5 border-b border-[#E3E8E3] bg-white flex items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-3.5 min-w-0">
                <img
                  src={LOCAL_PHOTOS[contactingMember.id] || contactingMember.image || contactingMember.remoteImage}
                  alt={contactingMember.name}
                  referrerPolicy="no-referrer"
                  className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl object-cover border border-[#E3E8E3] shrink-0"
                />
                <div className="min-w-0 text-left">
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#27845D] block">
                    Direct Advisory Mandate
                  </span>
                  <h3 id="advisor-contact-title" className="text-lg sm:text-xl font-black text-[#142421] truncate">
                    {contactingMember.name}
                  </h3>
                  <p className="text-xs text-[#69736F] truncate">{contactingMember.role}</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setContactingMember(null)}
                disabled={isSubmitting}
                aria-label="Close advisor inquiry dialog"
                className="min-w-[44px] min-h-[44px] -mr-1 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer shrink-0 disabled:opacity-50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 sm:p-7 overflow-y-auto overscroll-contain flex-1 text-left">
              {inquirySuccess ? (
                <div className="py-6 text-center space-y-4">
                  <div className="w-14 h-14 rounded-full bg-emerald-100 text-[#27845D] flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <div className="space-y-1.5">
                    <h4 className="text-xl font-black text-[#142421]">Inquiry Transmitted</h4>
                    <p className="text-xs sm:text-sm text-[#52605C] max-w-sm mx-auto">
                      Your confidential request has been routed to <strong>{contactingMember.name}</strong> and the Kretz executive desk. Confirmation was sent to <strong>{inquiryEmail}</strong>.
                    </p>
                  </div>
                  {inquiryTicketId && (
                    <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-100 border border-slate-200 text-xs font-mono font-bold text-slate-900 tabular-nums">
                      <span>Desk Reference:</span>
                      <span className="text-[#27845D]">{inquiryTicketId}</span>
                    </div>
                  )}
                  <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => setContactingMember(null)}
                      className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-[#142421] hover:bg-[#1E332E] text-white text-xs font-bold transition-colors cursor-pointer"
                    >
                      Close Window
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setInquirySuccess(false);
                        setInquiryTicketId(null);
                      }}
                      className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-colors cursor-pointer"
                    >
                      Send Follow-Up Note
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSendInquiry} noValidate className="space-y-4">
                  {inquiryError && (
                    <div role="alert" className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-start gap-2.5">
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                      <span>{inquiryError}</span>
                    </div>
                  )}

                  <div>
                    <label htmlFor="advisor-inquiry-purpose" className="block text-xs font-bold text-[#142421] mb-1">
                      Inquiry Purpose
                    </label>
                    <select
                      id="advisor-inquiry-purpose"
                      value={inquirySubject}
                      onChange={(e) => setInquirySubject(e.target.value)}
                      className="w-full h-11 px-3.5 rounded-xl border border-slate-300 text-base sm:text-sm text-slate-900 bg-white focus:outline-none focus:border-[#142421] focus:ring-2 focus:ring-[#142421]/10"
                    >
                      <option value="private_consultation">Confidential Property Acquisition / Search</option>
                      <option value="property_valuation">Appraisal & Entrusting a Luxury Property</option>
                      <option value="tokenization_inquiry">Real Estate Tokenization & Fractional Syndication</option>
                      <option value="monaco_riviera">French Riviera & Monaco Private Mandates</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="advisor-full-name" className="block text-xs font-bold text-[#142421] mb-1">
                        Your Full Name
                      </label>
                      <input
                        id="advisor-full-name"
                        type="text"
                        required
                        value={inquiryFullName}
                        onChange={(e) => {
                          setInquiryFullName(e.target.value);
                          if (inquiryError) setInquiryError(null);
                        }}
                        placeholder="e.g. Jean de Montfort"
                        className="w-full h-11 px-3.5 rounded-xl border border-slate-300 text-base sm:text-sm text-slate-900 placeholder:text-slate-400 bg-white focus:outline-none focus:border-[#142421] focus:ring-2 focus:ring-[#142421]/10"
                      />
                    </div>
                    <div>
                      <label htmlFor="advisor-phone" className="block text-xs font-bold text-[#142421] mb-1">
                        Direct Phone / WhatsApp
                      </label>
                      <input
                        id="advisor-phone"
                        type="tel"
                        required
                        value={inquiryPhone}
                        onChange={(e) => {
                          setInquiryPhone(e.target.value);
                          if (inquiryError) setInquiryError(null);
                        }}
                        placeholder="+33 6 00 00 00 00"
                        className="w-full h-11 px-3.5 rounded-xl border border-slate-300 text-base sm:text-sm text-slate-900 placeholder:text-slate-400 bg-white focus:outline-none focus:border-[#142421] focus:ring-2 focus:ring-[#142421]/10"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="advisor-email" className="block text-xs font-bold text-[#142421] mb-1">
                      Email Address
                    </label>
                    <input
                      id="advisor-email"
                      type="email"
                      required
                      value={inquiryEmail}
                      onChange={(e) => {
                        setInquiryEmail(e.target.value);
                        if (inquiryError) setInquiryError(null);
                      }}
                      placeholder="investor@familyoffice.com"
                      className="w-full h-11 px-3.5 rounded-xl border border-slate-300 text-base sm:text-sm text-slate-900 placeholder:text-slate-400 bg-white focus:outline-none focus:border-[#142421] focus:ring-2 focus:ring-[#142421]/10"
                    />
                  </div>

                  <div>
                    <label htmlFor="advisor-message" className="block text-xs font-bold text-[#142421] mb-1">
                      Confidential Note / Property Details
                    </label>
                    <textarea
                      id="advisor-message"
                      rows={3}
                      required
                      value={inquiryMessage}
                      onChange={(e) => {
                        setInquiryMessage(e.target.value);
                        if (inquiryError) setInquiryError(null);
                      }}
                      placeholder={`Describe your acquisition criteria or property location for ${contactingMember.name.split(' ')[0]}...`}
                      className="w-full p-3.5 rounded-xl border border-slate-300 text-base sm:text-sm text-slate-900 placeholder:text-slate-400 bg-white focus:outline-none focus:border-[#142421] focus:ring-2 focus:ring-[#142421]/10"
                    />
                  </div>

                  {!user && (
                    <TurnstileWidget
                      theme="light"
                      action="advisor_contact"
                      onVerify={(token) => setTurnstileToken(token)}
                      onExpire={() => setTurnstileToken('')}
                    />
                  )}

                  <div className="pt-1">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full min-h-[44px] py-3 rounded-xl font-bold text-xs sm:text-sm bg-[#142421] text-white hover:bg-[#1E332E] disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer shadow-md transition-colors"
                    >
                      {isSubmitting ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>Transmitting Inquiry...</span>
                        </>
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
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
