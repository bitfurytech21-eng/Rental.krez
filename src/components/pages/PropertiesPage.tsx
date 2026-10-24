import React, { useState, useEffect } from 'react';
import { Property, PropertyType, PropertyStatus } from '../../types/property';
import { PropertyCard } from '../properties/PropertyCard';
import { PropertyDocumentViewer } from '../documents/PropertyDocumentViewer';
import { useAuth } from '../../lib/auth';
import { ledger } from '../../lib/ledger';
import { formatCurrency, formatPercent } from '../../lib/utils';
import { 
  Building2, Search, SlidersHorizontal, ShieldCheck, TrendingUp, 
  Sparkles, Crown, Globe, ArrowUpDown, X, Check, MapPin, 
  HelpCircle, Layers, Coins, Calendar, Info, Lock, ArrowRight
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

  // Invariant: All hidden properties stay strictly in the admin part until function assigned and approved to appear on the frontend
  const isFrontendEligible = (p: Property) => 
    p.status !== 'hidden' && 
    p.status !== 'pending_approval' && 
    p.approvedForFrontend !== false &&
    Boolean(p.assignedFunction);

  const [properties, setProperties] = useState<Property[]>(() => initialProperties.filter(isFrontendEligible));

  useEffect(() => {
    setProperties(initialProperties.filter(isFrontendEligible));
  }, [initialProperties]);
  const [activeTab, setActiveTab] = useState<'all' | 'funding' | 'funded' | 'returned' | 'my_properties'>('all');
  const [brochureProperty, setBrochureProperty] = useState<Property | null>(null);
  
  // Search & Filters
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCountry, setSelectedCountry] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('yield_desc');
  const [viewMode, setViewMode] = useState<'feed' | 'grid'>('feed');
  const [showFiltersModal, setShowFiltersModal] = useState<boolean>(false);
  const [minInvestmentFilter, setMinInvestmentFilter] = useState<number>(100);


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


  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#142421]">
      {/* Reental-style Top Announcement & Metrics Ribbon */}
      <section className="bg-[#0A1613] text-white py-14 border-b border-[#1E332E] relative overflow-hidden max-w-full">
        <div className="absolute top-0 right-0 w-72 sm:w-[500px] h-72 sm:h-[500px] max-w-full bg-[#B7E36A]/10 rounded-full blur-[140px] pointer-events-none" />

        <div className="container max-w-[1240px] mx-auto px-4 relative z-10">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
            <div className="max-w-2xl space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#B7E36A] bg-white/10 px-3 py-1 rounded-full border border-white/15">
                  L'Agence Institutional Real Estate · European Tokenized Assets
                </span>
                <span className="text-xs text-white/70 hidden sm:inline">
                  Regulated Fractional Investing
                </span>
              </div>

              <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight">
                Tokenized Real Estate <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#B7E36A] to-teal-300">
                  Opportunities &amp; Marketplace
                </span>
              </h1>

              <p className="text-xs sm:text-sm text-[#C8D1CE] leading-relaxed max-w-xl">
                Invest in high-yield European and international properties with verified institutional governance. Earn passive monthly dividends deposited directly into your investor wallet, backed by notarized physical deeds.
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
        </div>

        {/* Admin Custody Notice */}
        {user?.role === 'admin' && (
          <div className="bg-amber-50/90 border border-amber-200/90 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-900 shadow-xs">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center shrink-0 text-amber-800">
                <Lock className="w-4 h-4" />
              </div>
              <div>
                <p className="font-bold text-amber-950">
                  {initialProperties.filter(p => !isFrontendEligible(p)).length} Hidden Properties Isolated in Admin Part
                </p>
                <p className="text-[#69736F] text-[11px]">
                  All hidden properties stay strictly in the admin part until an operational function is assigned and approved to appear on the frontend.
                </p>
              </div>
            </div>
            <a
              href="/admin"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#182D2A] text-white font-bold hover:bg-[#27845D] transition-colors shrink-0 text-xs"
            >
              <span>Open Admin Panel & Review</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </a>
          </div>
        )}

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
                onOpenBrochure={(prop) => setBrochureProperty(prop)}
                isUserOccupied={userInvestedPropertyIds.has(property.id) || (property as any).ownerId === user?.id}
              />
            ))}
          </div>
        )}
      </section>

      {/* Remodeled Official Property Brochure Modal */}
      {brochureProperty && (
        <PropertyDocumentViewer
          property={brochureProperty}
          isOpen={!!brochureProperty}
          onClose={() => setBrochureProperty(null)}
        />
      )}

    </div>
  );
};
