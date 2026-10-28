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
  HelpCircle, Layers, Coins, Calendar, Info, Lock, ArrowRight,
  List, LayoutGrid
} from 'lucide-react';
import { SecondaryMarketplace } from '../properties/SecondaryMarketplace';

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
  const [activeTab, setActiveTab] = useState<'all' | 'funding' | 'funded' | 'returned' | 'my_properties' | 'secondary_p2p'>('all');
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
    <div className="min-h-screen bg-[#f0f8fe] text-[#1C1917]">
      {/* Top Editorial Metrics Ribbon */}
      <section className="bg-[#14221F] text-white py-14 border-b border-[#233833] relative overflow-hidden max-w-full">
        <div className="container max-w-[1240px] mx-auto px-4 sm:px-6 relative z-10">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
            <div className="max-w-2xl space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#A3C7B6]">
                  L'Agence Asset Marketplace · European Tokenized Assets
                </span>
                <span className="text-xs text-stone-400 hidden sm:inline">
                  · Regulated Fractional Custody
                </span>
              </div>

              <h1 className="font-serif text-3xl sm:text-5xl font-bold text-white tracking-tight leading-tight">
                Curated Real Estate <br />
                <span className="italic font-normal text-stone-200">
                  Opportunities &amp; Marketplace
                </span>
              </h1>

              <p className="text-xs sm:text-sm text-stone-300 leading-relaxed max-w-xl font-normal">
                Invest in prime European and international properties with verified institutional governance. Collect net monthly dividends deposited directly into your investor wallet, backed by notarized physical deeds.
              </p>
            </div>

            {/* Platform KPI Quad */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 bg-black/30 border border-white/10 p-5 rounded-xl shrink-0 text-left">
              <div>
                <div className="font-mono text-xl sm:text-2xl font-bold text-white tabular-nums">€142.5M+</div>
                <div className="text-[10px] uppercase tracking-wider text-stone-400 mt-0.5">Tokenized</div>
              </div>
              <div>
                <div className="font-mono text-xl sm:text-2xl font-bold text-[#A3C7B6] tabular-nums">11.2%</div>
                <div className="text-[10px] uppercase tracking-wider text-stone-400 mt-0.5">Average APY</div>
              </div>
              <div>
                <div className="font-mono text-xl sm:text-2xl font-bold text-white tabular-nums">94+</div>
                <div className="text-[10px] uppercase tracking-wider text-stone-400 mt-0.5">Funded Assets</div>
              </div>
              <div>
                <div className="font-mono text-xl sm:text-2xl font-bold text-[#A3C7B6] tabular-nums">18,500+</div>
                <div className="text-[10px] uppercase tracking-wider text-stone-400 mt-0.5">Investors</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content & Catalog */}
      <section className="py-10 container max-w-[1240px] mx-auto px-4 sm:px-6 space-y-8">
        {/* Navigation Tabs */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[#d4e5f5] pb-4">
          <div className="flex items-center gap-2 p-1 bg-white rounded-lg border border-[#d4e5f5] overflow-x-auto">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'all'
                  ? 'bg-[#1E3A34] text-white shadow-xs'
                  : 'text-[#57534E] hover:text-[#1C1917]'
              }`}
            >
              All Opportunities ({properties.length})
            </button>

            <button
              onClick={() => setActiveTab('funding')}
              className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'funding'
                  ? 'bg-[#1E3A34] text-white shadow-xs'
                  : 'text-[#57534E] hover:text-[#1C1917]'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#A3C7B6]" />
              <span>In Funding ({properties.filter(p => p.status === 'funding').length})</span>
            </button>

            <button
              onClick={() => setActiveTab('funded')}
              className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'funded'
                  ? 'bg-[#1E3A34] text-white shadow-xs'
                  : 'text-[#57534E] hover:text-[#1C1917]'
              }`}
            >
              100% Funded ({properties.filter(p => p.status === 'funded').length})
            </button>

            <button
              onClick={() => setActiveTab('returned')}
              className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'returned'
                  ? 'bg-[#1E3A34] text-white shadow-xs'
                  : 'text-[#57534E] hover:text-[#1C1917]'
              }`}
            >
              Returned / Sold ({properties.filter(p => p.status === 'completed').length})
            </button>

            {/* Dedicated "My Properties" Tab */}
            <button
              onClick={() => setActiveTab('my_properties')}
              className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'my_properties'
                  ? 'bg-[#1C1917] text-white shadow-xs'
                  : 'text-[#1E3A34] hover:bg-stone-100'
              }`}
            >
              <Crown className="w-3.5 h-3.5" />
              <span>My Properties ({myProperties.length})</span>
            </button>

            {/* Secondary P2P Order Book Tab */}
            <button
              onClick={() => setActiveTab('secondary_p2p')}
              className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'secondary_p2p'
                  ? 'bg-[#087F5B] text-white shadow-xs'
                  : 'text-[#087F5B] hover:bg-emerald-50'
              }`}
            >
              <Coins className="w-3.5 h-3.5" />
              <span>Secondary P2P Order Book</span>
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
        <div className="bg-white p-4 sm:p-5 rounded-xl border border-[#d4e5f5] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Keyword Search */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#78716C]" />
            <input
              type="text"
              placeholder="Search by city, property name, country or ticker (e.g. Paris, Cannes, Villa, KTZ)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-[#d4e5f5] text-xs bg-[#f0f8fe] focus:outline-none focus:border-[#1E3A34]"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filter Dropdowns */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            {/* Country Selector */}
            <select
              value={selectedCountry}
              onChange={(e) => setSelectedCountry(e.target.value)}
              aria-label="Filter properties by country"
              className="px-3 py-2 rounded-lg border border-[#d4e5f5] text-xs font-medium bg-[#f0f8fe] focus:outline-hidden focus:ring-2 focus:ring-[#1E3A34] text-[#1C1917]"
            >
              <option value="all">All Countries</option>
              <option value="france">France</option>
              <option value="spain">Spain</option>
              <option value="monaco">Monaco</option>
              <option value="mexico">Mexico</option>
              <option value="usa">United States</option>
            </select>

            {/* Property Type */}
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              aria-label="Filter by property category"
              className="px-3 py-2 rounded-lg border border-[#d4e5f5] text-xs font-medium bg-[#f0f8fe] focus:outline-hidden focus:ring-2 focus:ring-[#1E3A34] text-[#1C1917]"
            >
              <option value="all">All Formats</option>
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
              aria-label="Sort properties"
              className="px-3 py-2 rounded-lg border border-[#d4e5f5] text-xs font-medium bg-[#f0f8fe] focus:outline-hidden focus:ring-2 focus:ring-[#1E3A34] text-[#1C1917]"
            >
              <option value="yield_desc">Highest Yield (Annual Net %)</option>
              <option value="total_return_desc">Highest Total Return %</option>
              <option value="progress_desc">Most Funded %</option>
              <option value="min_asc">Lowest Min. Ticket</option>
              <option value="newest">Newest Offerings</option>
            </select>

            {/* Layout Toggle: Feed vs Grid with Lucide Icons */}
            <div className="flex items-center gap-1 p-0.5 bg-[#f0f8fe] rounded-lg border border-[#d4e5f5] shrink-0" role="group" aria-label="Catalog layout view">
              <button
                type="button"
                onClick={() => setViewMode('feed')}
                aria-pressed={viewMode === 'feed'}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 min-h-[36px] ${
                  viewMode === 'feed'
                    ? 'bg-[#1E3A34] text-white shadow-xs'
                    : 'text-[#57534E] hover:text-[#1C1917]'
                }`}
                title="Feed View"
              >
                <List className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Feed View</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                aria-pressed={viewMode === 'grid'}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 min-h-[36px] ${
                  viewMode === 'grid'
                    ? 'bg-[#1E3A34] text-white shadow-xs'
                    : 'text-[#57534E] hover:text-[#1C1917]'
                }`}
                title="Grid View"
              >
                <LayoutGrid className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Grid View</span>
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

        {/* Secondary P2P Order Book View */}
        {activeTab === 'secondary_p2p' ? (
          <SecondaryMarketplace
            properties={properties}
            onSelectProperty={(propId) => {
              const match = properties.find((p) => p.id === propId);
              if (match) onSelectProperty(match);
            }}
          />
        ) : (
          /* Primary Property Grid */
          <>

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
        </>
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
