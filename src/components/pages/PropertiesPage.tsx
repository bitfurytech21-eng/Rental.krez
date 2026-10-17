import React, { useState } from 'react';
import { Property, PropertyType, PropertyStatus } from '../../types/property';
import { PropertyCard } from '../properties/PropertyCard';
import { useAuth } from '../../lib/auth';
import { ledger } from '../../lib/ledger';
import { formatCurrency, formatPercent } from '../../lib/utils';
import { 
  Building2, Search, SlidersHorizontal, Plus, ShieldCheck, TrendingUp, 
  Sparkles, CheckCircle2, Crown, Globe, ArrowUpDown, X, Check, MapPin, 
  HelpCircle, Layers, Coins, Calendar, Info
} from 'lucide-react';

interface PropertiesPageProps {
  properties: Property[];
  onSelectProperty: (property: Property) => void;
  onInvestProperty: (property: Property) => void;
}

export const PropertiesPage: React.FC<PropertiesPageProps> = ({
  properties: initialProperties,
  onSelectProperty,
  onInvestProperty,
}) => {
  const { user } = useAuth();
  const [properties, setProperties] = useState<Property[]>(initialProperties);
  const [activeTab, setActiveTab] = useState<'all' | 'funding' | 'funded' | 'returned' | 'my_properties'>('all');
  
  // Search & Filters
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCountry, setSelectedCountry] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('yield_desc');
  const [viewMode, setViewMode] = useState<'feed' | 'grid'>('feed');
  const [showFiltersModal, setShowFiltersModal] = useState<boolean>(false);
  const [minInvestmentFilter, setMinInvestmentFilter] = useState<number>(100);

  // "Tokenize / Add My Own Property" Modal State
  const [isTokenizeModalOpen, setIsTokenizeModalOpen] = useState<boolean>(false);
  const [newPropTitle, setNewPropTitle] = useState<string>('');
  const [newPropCity, setNewPropCity] = useState<string>('');
  const [newPropCountry, setNewPropCountry] = useState<string>('France');
  const [newPropType, setNewPropType] = useState<PropertyType>('Apartment');
  const [newPropPrice, setNewPropPrice] = useState<number>(450000);
  const [newPropYield, setNewPropYield] = useState<number>(10.5);
  const [newPropImage, setNewPropImage] = useState<string>('https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=1200&auto=format&fit=crop');
  const [tokenizeSuccess, setTokenizeSuccess] = useState<boolean>(false);

  // User investments
  const userInvestments = user ? ledger.getInvestments(user.id) : [];
  const userInvestedPropertyIds = new Set(userInvestments.map(i => i.propertyId));

  // Determine user-occupied / owned properties
  const myProperties = properties.filter(p => 
    userInvestedPropertyIds.has(p.id) || (p as any).ownerId === user?.id
  );

  // Filter properties based on tab, search, and criteria
  const filteredProperties = properties.filter((property) => {
    // 1. Tab Filtering (Reental status categories)
    if (activeTab === 'funding' && property.status !== 'funding') return false;
    if (activeTab === 'funded' && property.status !== 'funded') return false;
    if (activeTab === 'returned' && property.status !== 'completed') return false;
    if (activeTab === 'my_properties') {
      const isMine = userInvestedPropertyIds.has(property.id) || (property as any).ownerId === user?.id;
      if (!isMine) return false;
    }

    // 2. Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchText = 
        property.title.toLowerCase().includes(q) ||
        property.city.toLowerCase().includes(q) ||
        property.country.toLowerCase().includes(q) ||
        property.location.toLowerCase().includes(q) ||
        property.tokenTicker.toLowerCase().includes(q);
      if (!matchText) return false;
    }

    // 3. Country Filter
    if (selectedCountry !== 'all') {
      if (!property.country.toLowerCase().includes(selectedCountry.toLowerCase())) {
        return false;
      }
    }

    // 4. Property Type Filter
    if (selectedType !== 'all') {
      if (property.type !== selectedType) {
        return false;
      }
    }

    // 5. Minimum Investment
    if (property.minimumInvestment < minInvestmentFilter) {
      return false;
    }

    return true;
  });

  // Sorting
  filteredProperties.sort((a, b) => {
    if (sortBy === 'yield_desc') {
      return b.estimatedAnnualYield - a.estimatedAnnualYield;
    }
    if (sortBy === 'total_return_desc') {
      return b.totalEstimatedReturn - a.totalEstimatedReturn;
    }
    if (sortBy === 'min_asc') {
      return a.minimumInvestment - b.minimumInvestment;
    }
    if (sortBy === 'progress_desc') {
      return (b.fundedAmount / b.targetAmount) - (a.fundedAmount / a.targetAmount);
    }
    if (sortBy === 'newest') {
      return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
    }
    return 0;
  });

  // Handle Tokenize / Submit My Own Property
  const handleTokenizeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPropTitle || !newPropCity) return;

    const newId = `prop-user-${Date.now()}`;
    const tokenPrice = 100;
    const totalTokens = Math.floor(newPropPrice / tokenPrice);

    const createdProperty: Property = {
      id: newId,
      slug: newPropTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
      title: newPropTitle,
      location: `${newPropCity}, ${newPropCountry}`,
      city: newPropCity,
      country: newPropCountry,
      type: newPropType,
      status: 'funding',
      images: [newPropImage],
      bannerImage: newPropImage,
      targetAmount: newPropPrice,
      fundedAmount: Math.floor(newPropPrice * 0.15), // Initial 15% pre-funded
      tokenPrice: tokenPrice,
      totalTokens: totalTokens,
      availableTokens: Math.floor(totalTokens * 0.85),
      estimatedAnnualYield: Number(newPropYield),
      capitalAppreciationYield: 4.5,
      totalEstimatedReturn: Number(newPropYield) + 4.5,
      durationMonths: 36,
      minimumInvestment: 100,
      distributionFrequency: 'Monthly',
      tokenTicker: `KTZ-${newPropCity.substring(0, 3).toUpperCase()}${Math.floor(10 + Math.random() * 90)}`,
      blockchainNetwork: 'Polygon POS',
      tokenContractAddress: `0x${Math.random().toString(16).substring(2, 42)}`,
      description: `High-yield tokenized property located in ${newPropCity}, ${newPropCountry}. Entrusted and tokenized for fractional ownership with automated monthly rental distributions.`,
      investmentStructure: 'Tokenized SPV / Fractional Real Estate Security Token',
      highlights: ['Turnkey Luxury Asset', 'Monthly Dividend Yield', 'Verified RICS Appraisal', 'Ring-Fenced Legal SPV'],
      risks: ['General real estate market conditions', 'Tenant turnover period'],
      exitStrategy: 'Capital appreciation upon scheduled 36-month maturity sale.',
      financialBreakdown: {
        propertyPrice: newPropPrice,
        refurbishmentBudget: 15000,
        legalAndClosingCosts: 18000,
        operatingReserve: 10000,
        totalProjectCost: newPropPrice + 43000,
        projectedAnnualGrossRent: Math.round(newPropPrice * (newPropYield / 100) * 1.15),
        estimatedOperatingExpenses: Math.round(newPropPrice * (newPropYield / 100) * 0.15),
        projectedAnnualNetRent: Math.round(newPropPrice * (newPropYield / 100)),
        estimatedNetYield: Number(newPropYield),
        estimatedCapitalGainYield: 4.5,
        totalEstimatedYield: Number(newPropYield) + 4.5,
      },
      feeStructure: {
        structuringFee: '2.5% included',
        managementFee: '8% of gross monthly rental revenues',
        withdrawalFee: '0% SEPA/Crypto',
        exitFee: '0%',
      },
      paymentSchedule: {
        distributionFrequency: 'Monthly',
        payoutDate: '1st business day of each month',
        annualReconciliation: 'Annual audit provided each January',
        maturityTerms: '100% Principal + pro-rata capital appreciation upon sale',
      },
      documents: [
        {
          id: 'doc-spv-1',
          name: 'SPV Deed & Tokenization Prospectus',
          category: 'Legal',
          size: '2.4 MB',
          url: '#',
          updatedAt: '2026-03-01',
        }
      ],
      investorCount: 1,
      createdAt: new Date().toISOString(),
      surfaceAreaM2: 120,
      bedrooms: 3,
      energyRating: 'A',
      ownerId: user ? user.id : 'usr-investor-demo',
    } as any;

    // Save to ledger
    ledger.saveProperty(createdProperty);

    // Update active list and switch to My Properties tab so item immediately occupies user's property slot
    setProperties([createdProperty, ...properties]);
    setTokenizeSuccess(true);

    setTimeout(() => {
      setTokenizeSuccess(false);
      setIsTokenizeModalOpen(false);
      setActiveTab('my_properties');
      setNewPropTitle('');
      setNewPropCity('');
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-[#FDFEFC] text-[#142421]">
      {/* Reental-style Top Announcement & Metrics Ribbon */}
      <section className="bg-[#0A1613] text-white py-14 border-b border-[#1E332E] relative overflow-hidden max-w-full">
        <div className="absolute top-0 right-0 w-72 sm:w-[500px] h-72 sm:h-[500px] max-w-full bg-[#B7E36A]/10 rounded-full blur-[140px] pointer-events-none" />

        <div className="container max-w-[1240px] mx-auto px-4 relative z-10">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
            <div className="max-w-2xl space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#B7E36A] bg-white/10 px-3 py-1 rounded-full border border-white/15">
                  Reental Protocol Proxy · European Tokenized Real Estate
                </span>
                <span className="text-xs text-white/70 hidden sm:inline">
                  Regulated Fractional Investing
                </span>
              </div>

              <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight">
                Tokenized Real Estate <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#B7E36A] to-teal-300">
                  Opportunities & Marketplace
                </span>
              </h1>

              <p className="text-xs sm:text-sm text-[#C8D1CE] leading-relaxed max-w-xl">
                Invest in high-yield European and international properties from €100. Earn passive monthly dividends deposited directly into your investor wallet, backed by notarized physical deeds.
              </p>
            </div>

            {/* Reental Platform KPI Quad */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 bg-white/5 border border-white/10 p-5 rounded-3xl backdrop-blur-md shrink-0 text-left">
              <div>
                <div className="text-xl sm:text-2xl font-black text-white tabular-nums">€142.5M+</div>
                <div className="text-[11px] text-[#A0A8A5] mt-0.5">Total Tokenized</div>
              </div>
              <div>
                <div className="text-xl sm:text-2xl font-black text-[#B7E36A] tabular-nums">11.2%</div>
                <div className="text-[11px] text-[#A0A8A5] mt-0.5">Average Net APY</div>
              </div>
              <div>
                <div className="text-xl sm:text-2xl font-black text-white tabular-nums">94+</div>
                <div className="text-[11px] text-[#A0A8A5] mt-0.5">Funded Assets</div>
              </div>
              <div>
                <div className="text-xl sm:text-2xl font-black text-[#B7E36A] tabular-nums">18,500+</div>
                <div className="text-[11px] text-[#A0A8A5] mt-0.5">Active Investors</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content & Catalog */}
      <section className="py-10 container max-w-[1240px] mx-auto px-4 space-y-8">
        {/* Navigation Tabs (Reental Style) & "Tokenize My Property" CTA */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[#E3E8E3] pb-4">
          {/* Reental Category Tabs */}
          <div className="flex items-center gap-1.5 p-1.5 bg-[#EEF2ED] rounded-2xl border border-[#E3E8E3] overflow-x-auto">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'all'
                  ? 'bg-[#142421] text-white shadow-sm'
                  : 'text-[#52605C] hover:text-[#142421] hover:bg-white/60'
              }`}
            >
              All Opportunities ({properties.length})
            </button>

            <button
              onClick={() => setActiveTab('funding')}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'funding'
                  ? 'bg-[#142421] text-white shadow-sm'
                  : 'text-[#52605C] hover:text-[#142421] hover:bg-white/60'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-[#B7E36A]" />
              <span>In Funding ({properties.filter(p => p.status === 'funding').length})</span>
            </button>

            <button
              onClick={() => setActiveTab('funded')}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'funded'
                  ? 'bg-[#142421] text-white shadow-sm'
                  : 'text-[#52605C] hover:text-[#142421] hover:bg-white/60'
              }`}
            >
              100% Funded ({properties.filter(p => p.status === 'funded').length})
            </button>

            <button
              onClick={() => setActiveTab('returned')}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'returned'
                  ? 'bg-[#142421] text-white shadow-sm'
                  : 'text-[#52605C] hover:text-[#142421] hover:bg-white/60'
              }`}
            >
              Returned / Sold ({properties.filter(p => p.status === 'completed').length})
            </button>

            {/* Dedicated "My Properties / Occupied by Me" Tab */}
            <button
              onClick={() => setActiveTab('my_properties')}
              className={`px-4 py-2 text-xs font-black rounded-xl transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'my_properties'
                  ? 'bg-[#27845D] text-white shadow-md'
                  : 'text-[#27845D] hover:bg-[#E8F5E9] font-bold'
              }`}
            >
              <Crown className="w-3.5 h-3.5" />
              <span>My Properties ({myProperties.length})</span>
            </button>
          </div>

          {/* Action: "Tokenize / Add My Property" */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsTokenizeModalOpen(true)}
              className="btn btn-primary px-4 py-2.5 rounded-xl font-bold text-xs bg-[#27845D] hover:bg-[#1f6b4a] text-white flex items-center gap-2 shadow-sm cursor-pointer whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              <span>Tokenize / Add My Own Property</span>
            </button>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="bg-white p-4 sm:p-5 rounded-3xl border border-[#E3E8E3] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Keyword Search */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#69736F]" />
            <input
              type="text"
              placeholder="Search by city, property name, country or ticker (e.g. Paris, Cannes, Villa, KTZ)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#E3E8E3] text-xs bg-[#F9FAF8] focus:outline-none focus:border-[#142421]"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filter Dropdowns */}
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            {/* Country Selector */}
            <select
              value={selectedCountry}
              onChange={(e) => setSelectedCountry(e.target.value)}
              className="px-3.5 py-2.5 rounded-xl border border-[#E3E8E3] text-xs font-semibold bg-[#F9FAF8] focus:outline-none focus:border-[#142421]"
            >
              <option value="all">All Countries</option>
              <option value="france">France (🇫🇷)</option>
              <option value="spain">Spain (🇪🇸)</option>
              <option value="monaco">Monaco (🇲🇨)</option>
              <option value="mexico">Mexico (🇲🇽)</option>
              <option value="usa">USA (🇺🇸)</option>
            </select>

            {/* Property Type */}
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="px-3.5 py-2.5 rounded-xl border border-[#E3E8E3] text-xs font-semibold bg-[#F9FAF8] focus:outline-none focus:border-[#142421]"
            >
              <option value="all">All Property Types</option>
              <option value="Villa">Prestige Villas</option>
              <option value="Apartment">Luxury Apartments</option>
              <option value="Private Mansion">Hôtels Particuliers</option>
              <option value="Chalet">Alpine Chalets</option>
              <option value="Commercial">Commercial / Mixed</option>
            </select>

            {/* Sort Dropdown */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3.5 py-2.5 rounded-xl border border-[#E3E8E3] text-xs font-semibold bg-[#F9FAF8] focus:outline-none focus:border-[#142421]"
            >
              <option value="yield_desc">Highest APY % (Annual Yield)</option>
              <option value="total_return_desc">Highest Total Return %</option>
              <option value="progress_desc">Most Funded %</option>
              <option value="min_asc">Lowest Min. Investment</option>
              <option value="newest">Newest Opportunities</option>
            </select>

            {/* Layout Toggle: Vertical Scroll Feed vs Grid */}
            <div className="flex items-center gap-1 p-1 bg-[#F9FAF8] rounded-xl border border-[#E3E8E3] shrink-0">
              <button
                onClick={() => setViewMode('feed')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  viewMode === 'feed'
                    ? 'bg-[#142421] text-white shadow-xs'
                    : 'text-[#52605C] hover:text-[#142421]'
                }`}
                title="Vertical Scroll Feed"
              >
                <span>Feed View ☰</span>
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  viewMode === 'grid'
                    ? 'bg-[#142421] text-white shadow-xs'
                    : 'text-[#52605C] hover:text-[#142421]'
                }`}
                title="Multi-Column Grid View"
              >
                <span>Grid ⊞</span>
              </button>
            </div>
          </div>
        </div>

        {/* Tab Specific Helper Notice: When "My Properties" is selected */}
        {activeTab === 'my_properties' && (
          <div className="p-5 rounded-3xl bg-[#E8F5E9] border border-[#27845D]/40 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#27845D] text-white flex items-center justify-center font-bold shrink-0">
                <Crown className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#142421]">Your Occupied & Tokenized Portfolio Assets</h3>
                <p className="text-xs text-[#52605C]">
                  These properties represent real estate assets in which you hold digital tokens or have registered as an owner.
                </p>
              </div>
            </div>

            <button
              onClick={() => setIsTokenizeModalOpen(true)}
              className="btn btn-primary px-4 py-2 rounded-xl text-xs font-bold bg-[#142421] text-white hover:bg-[#1E332E] shrink-0"
            >
              Add Another Property
            </button>
          </div>
        )}

        {/* Property Grid */}
        {filteredProperties.length === 0 ? (
          <div className="py-20 text-center bg-white rounded-3xl border border-[#E3E8E3] p-8 space-y-4">
            <Building2 className="w-12 h-12 mx-auto text-[#69736F] opacity-40" />
            <h3 className="text-lg font-bold text-[#142421]">No opportunities match your filter</h3>
            <p className="text-xs text-[#69736F] max-w-md mx-auto">
              Try adjusting your search criteria, clearing the country filter, or switch back to the "All Opportunities" tab.
            </p>
            <button
              onClick={() => {
                setActiveTab('all');
                setSearchQuery('');
                setSelectedCountry('all');
                setSelectedType('all');
              }}
              className="btn btn-secondary text-xs font-bold px-5 py-2.5 rounded-xl border border-[#E3E8E3]"
            >
              Reset All Filters
            </button>
          </div>
        ) : (
          <div className={viewMode === 'feed' ? "max-w-2xl mx-auto flex flex-col gap-8 w-full" : "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7"}>
            {filteredProperties.map((property) => (
              <PropertyCard
                key={property.id}
                property={property}
                onSelect={(prop) => onSelectProperty(prop)}
                onInvest={(prop) => onInvestProperty(prop)}
                isUserOccupied={userInvestedPropertyIds.has(property.id) || (property as any).ownerId === user?.id}
              />
            ))}
          </div>
        )}
      </section>

      {/* Interactive Modal: "Tokenize / Add My Own Property" */}
      {isTokenizeModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 relative shadow-2xl border border-[#E3E8E3] space-y-5 max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsTokenizeModalOpen(false)}
              className="absolute top-5 right-5 p-2 rounded-full text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {tokenizeSuccess ? (
              <div className="py-8 text-center space-y-3">
                <div className="w-14 h-14 rounded-full bg-emerald-100 text-[#27845D] flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-black text-[#142421]">Property Successfully Tokenized!</h3>
                <p className="text-xs sm:text-sm text-[#52605C] max-w-sm mx-auto">
                  Your asset has been placed into the Kretz & Reental marketplace. It now occupies your personal properties tab with verified fractional shares.
                </p>
              </div>
            ) : (
              <>
                <div className="border-b border-[#E3E8E3] pb-4">
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#27845D]">
                    Proxy Listing & Tokenization
                  </span>
                  <h3 className="text-2xl font-black text-[#142421]">List & Occupy Your Property</h3>
                  <p className="text-xs text-[#69736F] mt-1">
                    Enter your property details below to tokenize it on Polygon POS and immediately occupy a property slot in your marketplace portfolio.
                  </p>
                </div>

                <form onSubmit={handleTokenizeSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-[#142421] mb-1">Property Title / Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Haussmannian Penthouse overlooking Seine"
                      value={newPropTitle}
                      onChange={(e) => setNewPropTitle(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#E3E8E3] text-xs bg-[#F9FAF8] focus:outline-none focus:border-[#142421]"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-[#142421] mb-1">City</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Paris, Cannes, Madrid"
                        value={newPropCity}
                        onChange={(e) => setNewPropCity(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-[#E3E8E3] text-xs bg-[#F9FAF8] focus:outline-none focus:border-[#142421]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#142421] mb-1">Country</label>
                      <select
                        value={newPropCountry}
                        onChange={(e) => setNewPropCountry(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-[#E3E8E3] text-xs bg-[#F9FAF8] focus:outline-none focus:border-[#142421]"
                      >
                        <option value="France">France (🇫🇷)</option>
                        <option value="Spain">Spain (🇪🇸)</option>
                        <option value="Monaco">Monaco (🇲🇨)</option>
                        <option value="Mexico">Mexico (🇲🇽)</option>
                        <option value="USA">USA (🇺🇸)</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-[#142421] mb-1">Property Type</label>
                      <select
                        value={newPropType}
                        onChange={(e) => setNewPropType(e.target.value as PropertyType)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-[#E3E8E3] text-xs bg-[#F9FAF8] focus:outline-none focus:border-[#142421]"
                      >
                        <option value="Apartment">Luxury Apartment</option>
                        <option value="Villa">Prestige Villa</option>
                        <option value="Private Mansion">Private Mansion (Hôtel Particulier)</option>
                        <option value="Chalet">Alpine Chalet</option>
                        <option value="Commercial">Commercial Property</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#142421] mb-1">Estimated Valuation (€)</label>
                      <input
                        type="number"
                        min={100000}
                        step={10000}
                        required
                        value={newPropPrice}
                        onChange={(e) => setNewPropPrice(Number(e.target.value))}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-[#E3E8E3] text-xs bg-[#F9FAF8] focus:outline-none focus:border-[#142421]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-[#142421] mb-1">Target Annual Yield (APY %)</label>
                      <input
                        type="number"
                        min={4}
                        max={20}
                        step={0.1}
                        required
                        value={newPropYield}
                        onChange={(e) => setNewPropYield(Number(e.target.value))}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-[#E3E8E3] text-xs bg-[#F9FAF8] focus:outline-none focus:border-[#142421]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#142421] mb-1">Sample Image URL</label>
                      <select
                        value={newPropImage}
                        onChange={(e) => setNewPropImage(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-[#E3E8E3] text-xs bg-[#F9FAF8] focus:outline-none focus:border-[#142421]"
                      >
                        <option value="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=1200&auto=format&fit=crop">Modern Parisian Duplex</option>
                        <option value="https://images.unsplash.com/photo-1613490493576-7fde63acd811?q=80&w=1200&auto=format&fit=crop">Côte d’Azur Seafront Villa</option>
                        <option value="https://images.unsplash.com/photo-1512917774080-9991f1c4c750?q=80&w=1200&auto=format&fit=crop">Luxury Mediterranean Estate</option>
                        <option value="https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?q=80&w=1200&auto=format&fit=crop">Haussmannian Grand Palace</option>
                      </select>
                    </div>
                  </div>

                  <div className="p-3 rounded-2xl bg-[#EEF2ED] border border-[#E3E8E3] text-xs text-[#52605C] space-y-1">
                    <div className="font-bold text-[#142421] flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-[#27845D]" />
                      <span>Instant Ownership Placement</span>
                    </div>
                    <p className="text-[11px] leading-relaxed">
                      By submitting, this property is registered in the ledger and immediately marked as <strong>Occupied by You</strong> in the marketplace catalog.
                    </p>
                  </div>

                  <button
                    type="submit"
                    className="w-full btn btn-primary py-3 rounded-xl font-bold text-xs bg-[#27845D] hover:bg-[#1f6b4a] text-white flex items-center justify-center gap-2 cursor-pointer shadow-md"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Confirm & Occupy My Property on Marketplace</span>
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
