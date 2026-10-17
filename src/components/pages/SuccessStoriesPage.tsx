import React, { useState } from 'react';
import { CASE_STUDIES, CaseStudy, INVESTOR_TESTIMONIALS } from '../../data/caseStudies';
import { formatCurrency } from '../../lib/utils';
import { 
  Trophy, TrendingUp, CheckCircle2, Calendar, MapPin, 
  Users, ArrowRight, ShieldCheck, FileCheck, Filter, 
  Coins, ExternalLink, Quote, ChevronRight, Layers, 
  Search, Building2, Landmark, Clock, Copy, Check
} from 'lucide-react';

interface SuccessStoriesPageProps {
  onExploreProperties: () => void;
  onNavigateContact: () => void;
}

export const SuccessStoriesPage: React.FC<SuccessStoriesPageProps> = ({
  onExploreProperties,
  onNavigateContact,
}) => {
  const [selectedCity, setSelectedCity] = useState<string>('all');
  const [selectedStrategy, setSelectedStrategy] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [viewMode, setViewMode] = useState<'feed' | 'grid'>('feed');
  const [activeModalStudy, setActiveModalStudy] = useState<CaseStudy | null>(null);
  const [activePhotoIndex, setActivePhotoIndex] = useState<number>(0);
  const [copiedContract, setCopiedContract] = useState<boolean>(false);

  const cities = ['all', ...Array.from(new Set(CASE_STUDIES.map(c => c.city)))];
  const strategies = ['all', ...Array.from(new Set(CASE_STUDIES.map(c => c.strategy)))];

  const filtered = CASE_STUDIES.filter((c) => {
    const matchesCity = selectedCity === 'all' || c.city === selectedCity;
    const matchesStrat = selectedStrategy === 'all' || c.strategy === selectedStrategy;
    const matchesSearch = !searchQuery.trim() || 
      c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.spvDeedId.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCity && matchesStrat && matchesSearch;
  });

  const handleOpenModal = (study: CaseStudy) => {
    setActiveModalStudy(study);
    setActivePhotoIndex(0);
    setCopiedContract(false);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedContract(true);
    setTimeout(() => setCopiedContract(false), 2000);
  };

  return (
    <div className="min-h-screen bg-[#FDFEFC] text-[#18211F]">
      
      {/* Header Banner */}
      <section className="relative overflow-hidden bg-[#0A1613] text-white pt-24 pb-20 border-b border-[#1E332E]">
        <div className="w-full max-w-[1520px] mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-left">
          <div className="max-w-3xl space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#162723] border border-[#233F39] text-[#B7E36A] text-xs font-semibold uppercase tracking-widest">
              <Trophy className="w-4 h-4 text-[#B7E36A]" />
              <span>Audited Historical Performance & Exits</span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white leading-tight">
              Real Assets. <span className="text-[#B7E36A]">Verified Exits.</span> Zero Capital Loss.
            </h1>

            <p className="text-base sm:text-lg text-[#9DB2AE] leading-relaxed">
              Explore the audited historical track record of our exited tokenized properties across Spain, the Mediterranean, and global prime markets. 
              Every case record includes real-time photos, realized annualized IRR, net capital gains, rental dividends distributed, and public notary SPV dissolution deeds.
            </p>

            <div className="flex flex-wrap items-center gap-4 pt-2">
              <button
                onClick={onExploreProperties}
                className="py-3.5 px-7 text-xs font-bold bg-[#B7E36A] text-[#0A1613] hover:bg-[#C8F07F] rounded-xl flex items-center gap-2 cursor-pointer transition-all shadow-md"
              >
                <span>View Currently Active Offerings</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={onNavigateContact}
                className="py-3.5 px-6 text-xs font-semibold border border-slate-700 hover:border-slate-500 text-white rounded-xl flex items-center gap-2 cursor-pointer transition-all"
              >
                <span>Schedule Private Consultation</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Real-Time KPI Performance Metrics Bar */}
      <section className="bg-white border-b border-[#E3E8E3] py-8">
        <div className="w-full max-w-[1520px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 lg:gap-6 text-left">
            <div className="p-4 sm:p-5 rounded-2xl bg-[#F6F7F4] border border-[#E3E8E3]">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Projects Liquidated</p>
              <p className="text-2xl sm:text-3xl font-black text-[#18211F] mt-1">129+</p>
              <p className="text-[11px] text-emerald-700 font-semibold mt-1">100% On-time Liquidation</p>
            </div>

            <div className="p-4 sm:p-5 rounded-2xl bg-[#F6F7F4] border border-[#E3E8E3]">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Avg Realized Annual IRR</p>
              <p className="text-2xl sm:text-3xl font-black text-emerald-800 mt-1">15.4%</p>
              <p className="text-[11px] text-slate-500 mt-1">Annualized compound return</p>
            </div>

            <div className="p-4 sm:p-5 rounded-2xl bg-[#F6F7F4] border border-[#E3E8E3]">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Capital Returned</p>
              <p className="text-2xl sm:text-3xl font-black text-[#18211F] mt-1">€38.5M+</p>
              <p className="text-[11px] text-slate-500 mt-1">Principal + net appreciation</p>
            </div>

            <div className="p-4 sm:p-5 rounded-2xl bg-[#F6F7F4] border border-[#E3E8E3]">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Average Duration</p>
              <p className="text-2xl sm:text-3xl font-black text-[#18211F] mt-1">7.8 mo</p>
              <p className="text-[11px] text-emerald-700 font-semibold mt-1">Rapid capital recycling</p>
            </div>

            <div className="p-4 sm:p-5 rounded-2xl bg-[#F6F7F4] border border-[#E3E8E3] col-span-2 md:col-span-1">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Capital Default Rate</p>
              <p className="text-2xl sm:text-3xl font-black text-emerald-800 mt-1">0.0%</p>
              <p className="text-[11px] text-slate-500 mt-1">Zero projects with loss</p>
            </div>
          </div>
        </div>
      </section>

      {/* Main Case Studies Section */}
      <section className="py-14 sm:py-20 bg-[#F6F7F4] border-b border-[#E3E8E3]">
        <div className="w-full max-w-[1520px] mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* Filter & Search Bar */}
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 mb-10 text-left">
            <div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-[#18211F] tracking-tight">
                Audited Case Records & Real-Time Statistics
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                Filter by target city, investment strategy, or search by property name and notarial deed ID.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              {/* Search Box */}
              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search city, deed ID, or name..."
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#182D2A]"
                />
              </div>

              {/* Strategy Filter */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs font-bold text-slate-500 flex items-center gap-1">
                  <Filter className="w-3.5 h-3.5" /> Strategy:
                </span>
                {strategies.map((strat) => (
                  <button
                    key={strat}
                    onClick={() => setSelectedStrategy(strat)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      selectedStrategy === strat
                        ? 'bg-[#182D2A] text-white shadow-xs'
                        : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
                    }`}
                  >
                    {strat === 'all' ? 'All Strategies' : strat}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* City Chips & View Mode Switcher */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-3 mb-8 text-left">
            <div className="flex items-center gap-2 overflow-x-auto scrollbar-none w-full sm:w-auto">
              <span className="text-xs font-bold text-slate-500 shrink-0">City:</span>
              {cities.map((city) => (
                <button
                  key={city}
                  onClick={() => setSelectedCity(city)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                    selectedCity === city
                      ? 'bg-[#182D2A] text-[#B7E36A] font-bold shadow-xs'
                      : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  {city === 'all' ? 'All Locations' : city}
                </button>
              ))}
            </div>

            {/* Layout Toggle: Vertical Scroll Feed vs Grid */}
            <div className="flex items-center gap-1.5 p-1 bg-white rounded-xl border border-slate-200 shrink-0 shadow-xs">
              <button
                onClick={() => setViewMode('feed')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  viewMode === 'feed'
                    ? 'bg-[#182D2A] text-[#B7E36A] shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Single Column Vertical Scroll Feed"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Vertical Feed</span>
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  viewMode === 'grid'
                    ? 'bg-[#182D2A] text-[#B7E36A] shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Multi-Column Grid View"
              >
                <Building2 className="w-3.5 h-3.5" />
                <span>Grid View</span>
              </button>
            </div>
          </div>

          {/* Case Studies Container: Vertical Feed or Grid */}
          <div className={viewMode === 'feed' ? "max-w-2xl mx-auto flex flex-col gap-8 mb-16 text-left w-full" : "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16 text-left"}>
            {filtered.map((study) => (
              <div
                key={study.id}
                className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs hover:shadow-xl transition-all duration-300 flex flex-col justify-between group"
              >
                <div>
                  {/* Real-Time Photo & Live Badges */}
                  <div className="relative aspect-[16/10] overflow-hidden bg-slate-900">
                    <img 
                      src={study.image} 
                      alt={study.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        if (!target.dataset.fallback) {
                          target.dataset.fallback = 'true';
                          target.src = '/assets/images/hero_real_estate_1791998371047.jpg';
                        }
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                    
                    <div className="absolute top-4 left-4 flex items-center gap-2">
                      <span className="px-3 py-1 rounded-full bg-black/60 backdrop-blur-md text-white border border-white/20 text-[11px] font-bold">
                        {study.city}, {study.country}
                      </span>
                    </div>

                    <div className="absolute top-4 right-4">
                      <span className="px-2.5 py-1 rounded-full bg-emerald-500 text-white text-[11px] font-extrabold uppercase tracking-wider shadow-sm flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        100% Exited & Liquidated
                      </span>
                    </div>

                    <div className="absolute bottom-4 left-4 right-4">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-[#B7E36A]">
                        {study.strategy}
                      </p>
                      <h3 className="text-lg font-black text-white leading-tight mt-0.5">
                        {study.title}
                      </h3>
                    </div>
                  </div>

                  {/* Financial Return Matrix */}
                  <div className="p-6 space-y-4">
                    <div className="grid grid-cols-3 gap-2 p-3.5 bg-[#F6F7F4] rounded-2xl border border-slate-200 text-center">
                      <div>
                        <p className="text-[10px] text-slate-500 uppercase font-bold">Realized IRR</p>
                        <p className="text-lg font-black text-emerald-800">{study.realTIR}%</p>
                      </div>
                      <div className="border-x border-slate-200">
                        <p className="text-[10px] text-slate-500 uppercase font-bold">Capital Gain</p>
                        <p className="text-lg font-black text-[#18211F]">+{study.capitalGain}%</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-500 uppercase font-bold">Hold Period</p>
                        <p className="text-lg font-black text-slate-800">{study.durationMonths} mo</p>
                      </div>
                    </div>

                    <p className="text-xs text-slate-600 leading-relaxed line-clamp-2">
                      {study.summary}
                    </p>

                    {/* Live Real-Time Statistics Row */}
                    <div className="space-y-2 text-xs text-slate-600 pt-3 border-t border-slate-100">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500">Total Returned to Investors:</span>
                        <span className="font-bold text-slate-900">{formatCurrency(study.totalReturned)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500">Participating Investors:</span>
                        <span className="font-semibold text-slate-900">{study.investorCount} participants</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500">Subscription Speed:</span>
                        <span className="text-emerald-800 font-semibold">{study.fundingSpeed}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500">Notarial SPV Deed:</span>
                        <span className="font-mono text-emerald-800 font-bold">{study.spvDeedId}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-6 pt-0">
                  <button
                    onClick={() => handleOpenModal(study)}
                    className="w-full py-3 px-4 rounded-xl bg-slate-100 hover:bg-[#182D2A] text-slate-800 hover:text-white font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-2xs"
                  >
                    <span>View Real-Time Audit & Gallery</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* Institutional Safeguards & Governance Standards (Replaces fake testimonials with real verified standards) */}
      <section className="py-20 bg-white border-b border-[#E3E8E3]">
        <div className="w-full max-w-[1520px] mx-auto px-4 sm:px-6 lg:px-8 text-left">
          
          <div className="max-w-2xl mb-14 space-y-3">
            <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">
              Governance & Institutional Custody
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-[#18211F] tracking-tight">
              Institutional Safeguards Behind Every Verified Exit
            </h2>
            <p className="text-sm text-slate-500 leading-relaxed">
              Every completed case record is governed by strict European legal protections, independent notary recording, and ring-fenced bank escrow accounts.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="p-7 rounded-3xl bg-[#F6F7F4] border border-[#E3E8E3] space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-white border border-[#E3E8E3] flex items-center justify-center text-emerald-800 shadow-2xs">
                <ShieldCheck className="w-6 h-6 text-emerald-700" />
              </div>
              <h3 className="text-base font-bold text-[#18211F]">Ring-Fenced Legal SPVs</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Each property is held inside an isolated Special Purpose Vehicle (S.L.). Investor participatory loans are legally attached solely to that physical asset with zero platform co-mingling.
              </p>
            </div>

            <div className="p-7 rounded-3xl bg-[#F6F7F4] border border-[#E3E8E3] space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-white border border-[#E3E8E3] flex items-center justify-center text-emerald-800 shadow-2xs">
                <Landmark className="w-6 h-6 text-emerald-700" />
              </div>
              <h3 className="text-base font-bold text-[#18211F]">Segregated Bank Escrow</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Investor capital and monthly tenant rental proceeds are held in segregated bank custody accounts with CaixaBank, Banco Santander, and BBVA, protected from insolvency.
              </p>
            </div>

            <div className="p-7 rounded-3xl bg-[#F6F7F4] border border-[#E3E8E3] space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-white border border-[#E3E8E3] flex items-center justify-center text-emerald-800 shadow-2xs">
                <FileCheck className="w-6 h-6 text-emerald-700" />
              </div>
              <h3 className="text-base font-bold text-[#18211F]">Notarial Public Deeds</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Property acquisitions and terminal sales are formally registered with an official Spanish Notary Public and inscribed in the governmental Property Registry.
              </p>
            </div>

            <div className="p-7 rounded-3xl bg-[#F6F7F4] border border-[#E3E8E3] space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-white border border-[#E3E8E3] flex items-center justify-center text-emerald-800 shadow-2xs">
                <CheckCircle2 className="w-6 h-6 text-emerald-700" />
              </div>
              <h3 className="text-base font-bold text-[#18211F]">Independent RICS Audits</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Appraisals are conducted by certified international valuation partners (Tinsa, Savills, or CBRE) verifying fair market asset valuations before token minting.
              </p>
            </div>
          </div>

        </div>
      </section>

      {/* Case Study Detail Modal (With Real-Time Photos Gallery & Full Statistics) */}
      {activeModalStudy && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-2xl w-full my-6 overflow-hidden shadow-2xl border border-slate-200 text-left relative max-h-[92vh] flex flex-col">
            
            {/* Gallery Image Display */}
            <div className="relative aspect-[16/9] overflow-hidden bg-slate-950 shrink-0">
              <img 
                src={activeModalStudy.gallery[activePhotoIndex] || activeModalStudy.image} 
                alt={activeModalStudy.title}
                className="w-full h-full object-cover transition-all duration-300" 
                referrerPolicy="no-referrer"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  if (!target.dataset.fallback) {
                    target.dataset.fallback = 'true';
                    target.src = '/assets/images/hero_real_estate_1791998371047.jpg';
                  }
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />
              
              <button
                onClick={() => setActiveModalStudy(null)}
                className="absolute top-4 right-4 w-9 h-9 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black transition-colors cursor-pointer z-10"
              >
                ✕
              </button>

              {/* Photo Thumbnails Switcher */}
              {activeModalStudy.gallery.length > 1 && (
                <div className="absolute top-4 left-4 flex items-center gap-1.5 z-10">
                  {activeModalStudy.gallery.map((img, i) => (
                    <button
                      key={i}
                      onClick={() => setActivePhotoIndex(i)}
                      className={`w-10 h-7 rounded-lg overflow-hidden border-2 transition-all cursor-pointer ${
                        activePhotoIndex === i ? 'border-[#B7E36A] scale-105' : 'border-white/50 opacity-70 hover:opacity-100'
                      }`}
                    >
                      <img src={img} alt={`View ${i + 1}`} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}

              <div className="absolute bottom-4 left-5 right-5 text-left">
                <span className="text-[11px] font-bold text-[#B7E36A] uppercase tracking-wider">{activeModalStudy.strategy}</span>
                <h3 className="text-xl sm:text-2xl font-black text-white leading-tight mt-0.5">{activeModalStudy.title}</h3>
                <p className="text-xs text-white/80 mt-1 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-[#B7E36A]" />
                  <span>{activeModalStudy.city}, {activeModalStudy.country} · Completed on {activeModalStudy.completionDate}</span>
                </p>
              </div>
            </div>

            {/* Modal Body & Real-Time Stats */}
            <div className="p-6 sm:p-8 overflow-y-auto space-y-6 flex-1 text-slate-800">
              
              {/* Real-Time Return Bar */}
              <div className="grid grid-cols-4 gap-2 p-3.5 bg-[#F6F7F4] rounded-2xl border text-center text-xs">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-bold">Realized IRR</span>
                  <p className="text-lg font-black text-emerald-800">{activeModalStudy.realTIR}%</p>
                </div>
                <div className="border-x border-slate-200">
                  <span className="text-[10px] text-slate-500 uppercase font-bold">Capital Gain</span>
                  <p className="text-lg font-black text-slate-900">+{activeModalStudy.capitalGain}%</p>
                </div>
                <div className="border-r border-slate-200">
                  <span className="text-[10px] text-slate-500 uppercase font-bold">Rental Yield</span>
                  <p className="text-lg font-black text-emerald-800">{activeModalStudy.annualRentalYieldDistributed}%</p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-bold">Duration</span>
                  <p className="text-lg font-black text-slate-900">{activeModalStudy.durationMonths} Mo</p>
                </div>
              </div>

              {/* Per-Token Performance Real-Time Statistics */}
              <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200/60 text-xs space-y-2">
                <div className="flex items-center justify-between font-bold text-emerald-950 pb-1.5 border-b border-emerald-200/60">
                  <span className="flex items-center gap-1.5">
                    <Coins className="w-4 h-4 text-emerald-700" />
                    <span>Real-Time Per-Token Breakdown</span>
                  </span>
                  <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded-full">
                    Polygon ERC-20
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 pt-1 text-slate-700">
                  <div>
                    <span className="text-[10px] text-slate-500">Initial Issue Price:</span>
                    <p className="font-bold text-slate-900">€{activeModalStudy.initialTokenPrice.toFixed(2)}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500">Liquidated Exit Value:</span>
                    <p className="font-bold text-emerald-800">€{activeModalStudy.finalExitTokenPrice.toFixed(2)}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500">Monthly Yield / Token:</span>
                    <p className="font-bold text-emerald-800">€{activeModalStudy.monthlyDividendPerToken.toFixed(2)} / mo</p>
                  </div>
                </div>
              </div>

              {/* Project Highlights & Exit Narrative */}
              <div className="space-y-2 text-xs">
                <p className="font-bold text-slate-900 uppercase text-[11px] tracking-wider">Project Audit Highlights & Narrative:</p>
                <div className="space-y-2">
                  {activeModalStudy.highlights.map((h, i) => (
                    <div key={i} className="flex items-start gap-2.5 text-slate-600">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <span className="leading-relaxed">{h}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Legal SPV & Escrow Registry Data */}
              <div className="bg-[#F6F7F4] p-4 rounded-2xl border border-slate-200 text-xs space-y-2 text-slate-600">
                <div className="flex justify-between items-center">
                  <span>Total Capital Funded:</span>
                  <span className="font-bold text-slate-900">{formatCurrency(activeModalStudy.totalFunded)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Total Capital Returned:</span>
                  <span className="font-bold text-emerald-800 text-sm">{formatCurrency(activeModalStudy.totalReturned)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Funding Velocity:</span>
                  <span className="font-medium text-slate-900">{activeModalStudy.fundingSpeed}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Escrow Custodian Bank:</span>
                  <span className="font-medium text-slate-900">{activeModalStudy.escrowBank}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Registered Public Notary Deed:</span>
                  <span className="font-mono text-emerald-800 font-bold">{activeModalStudy.spvDeedId}</span>
                </div>
                <div className="flex justify-between items-center pt-1 border-t border-slate-200">
                  <span>Polygon Smart Contract:</span>
                  <div className="flex items-center gap-1.5 font-mono text-slate-700">
                    <span>{activeModalStudy.contractAddress}</span>
                    <button 
                      onClick={() => copyToClipboard(activeModalStudy.contractAddress)}
                      className="p-1 hover:text-emerald-800 cursor-pointer"
                      title="Copy contract address"
                    >
                      {copiedContract ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="pt-2 flex items-center justify-between gap-3">
                <button
                  onClick={() => {
                    setActiveModalStudy(null);
                    onExploreProperties();
                  }}
                  className="py-2.5 px-5 rounded-xl bg-[#182D2A] text-white hover:bg-[#24423C] text-xs font-bold transition-all cursor-pointer shadow-xs"
                >
                  Explore Current Investment Offerings →
                </button>
                <button
                  onClick={() => setActiveModalStudy(null)}
                  className="py-2.5 px-5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all cursor-pointer"
                >
                  Close Record
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
};
