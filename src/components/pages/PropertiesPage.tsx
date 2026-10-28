import React, { useState, useEffect, useMemo } from 'react';
import { Property } from '../../types/property';
import { PropertyCard } from '../properties/PropertyCard';
import { PropertyComparisonModal } from '../properties/PropertyComparisonModal';
import { PropertyDocumentViewer } from '../documents/PropertyDocumentViewer';
import { useAuth } from '../../lib/auth';
import { useNavigation } from '../../context/NavigationContext';
import { useToast } from '../../context/ToastContext';
import { ledger } from '../../lib/ledger';
import { userApi } from '../../lib/api';
import { formatCurrency } from '../../lib/utils';
import {
  Building2,
  Search,
  Crown,
  X,
  Coins,
  Lock,
  ArrowRight,
  List,
  LayoutGrid,
  Heart,
  Scale,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
} from 'lucide-react';
import { SecondaryMarketplace } from '../properties/SecondaryMarketplace';

interface PropertiesPageProps {
  properties: Property[];
  onSelectProperty: (property: Property) => void;
  onInvestProperty: (property: Property) => void;
}

type MarketplaceTab =
  | 'all'
  | 'funding'
  | 'funded'
  | 'returned'
  | 'favorites'
  | 'my_properties'
  | 'secondary_p2p';

export const PropertiesPage: React.FC<PropertiesPageProps> = ({
  properties: initialProperties,
  onSelectProperty,
  onInvestProperty,
}) => {
  const { user } = useAuth();
  const { navigateTo } = useNavigation();
  const { showToast } = useToast();

  // Invariant: All hidden properties stay strictly in the admin part until function assigned and approved to appear on the frontend
  const isFrontendEligible = (p: Property) =>
    p.status !== 'hidden' &&
    p.status !== 'pending_approval' &&
    p.approvedForFrontend !== false &&
    Boolean(p.assignedFunction);

  const [properties, setProperties] = useState<Property[]>(() =>
    initialProperties.filter(isFrontendEligible)
  );
  const [ledgerTick, setLedgerTick] = useState(0);

  useEffect(() => {
    setProperties(initialProperties.filter(isFrontendEligible));
  }, [initialProperties]);

  // Subscribe to live ledger changes (investments, availability, favorites, P2P)
  useEffect(() => {
    return ledger.subscribe(() => {
      setProperties(ledger.getProperties().filter(isFrontendEligible));
      setLedgerTick((t) => t + 1);
    });
  }, []);

  const savedPrefs = useMemo(() => ledger.getUserPreferences(user?.id), [user?.id]);

  const [activeTab, setActiveTab] = useState<MarketplaceTab>('all');
  const [brochureProperty, setBrochureProperty] = useState<Property | null>(null);

  // Search, Filters, Sorting & Layout
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCountry, setSelectedCountry] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [priceRange, setPriceRange] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>(() => savedPrefs.marketplaceSortBy || 'yield_desc');
  const [viewMode, setViewMode] = useState<'feed' | 'grid'>(
    () => (savedPrefs.marketplaceViewMode === 'feed' || savedPrefs.marketplaceViewMode === 'grid' ? savedPrefs.marketplaceViewMode : 'grid')
  );

  // Pagination state
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(() => Number(savedPrefs.marketplacePageSize) || 6);

  // Favorites & Comparison state
  const [favoriteIds, setFavoriteIds] = useState<string[]>(() => ledger.getFavorites(user?.id));
  const [comparedIds, setComparedIds] = useState<string[]>([]);
  const [isCompareModalOpen, setIsCompareModalOpen] = useState<boolean>(false);

  // Sync favorites & preferences from backend when authenticated
  useEffect(() => {
    setFavoriteIds(ledger.getFavorites(user?.id));
    if (!user) return;

    let cancelled = false;
    userApi
      .getFavorites()
      .then((res) => {
        if (cancelled) return;
        const serverFavs = res?.data?.favorites;
        if (Array.isArray(serverFavs) && serverFavs.length > 0) {
          const merged = Array.from(new Set([...ledger.getFavorites(user.id), ...serverFavs]));
          ledger.setFavorites(user.id, merged);
          setFavoriteIds(merged);
        }
      })
      .catch(() => {
        // Offline or local-only mode: keep local ledger favorites cleanly
      });

    userApi
      .getPreferences()
      .then((res) => {
        if (cancelled || !res?.data) return;
        if (res.data.marketplaceSortBy) setSortBy(res.data.marketplaceSortBy);
        if (res.data.marketplaceViewMode === 'grid' || res.data.marketplaceViewMode === 'feed') {
          setViewMode(res.data.marketplaceViewMode);
        }
        if (res.data.marketplacePageSize) {
          setPageSize(Number(res.data.marketplacePageSize) || 6);
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  // Keep favoriteIds synced with ledger
  useEffect(() => {
    setFavoriteIds(ledger.getFavorites(user?.id));
  }, [ledgerTick, user?.id]);

  const persistPreference = (updates: Record<string, any>) => {
    ledger.updateUserPreferences(user?.id, updates);
    if (user) {
      userApi.savePreferences(updates).catch(() => {});
    }
  };

  // Optimistic favorite toggle with rollback if server rejects
  const handleToggleFavorite = async (property: Property) => {
    const previousFavs = ledger.getFavorites(user?.id);
    const { saved, favorites: nextFavs } = ledger.toggleFavorite(user?.id, property.id);
    setFavoriteIds(nextFavs);
    showToast(
      saved ? `Saved "${property.title}" to your Watchlist.` : `Removed "${property.title}" from Watchlist.`,
      'info'
    );

    if (user) {
      try {
        if (saved) {
          await userApi.addFavorite(property.id);
        } else {
          await userApi.removeFavorite(property.id);
        }
      } catch (err: any) {
        if (err?.status && err.status >= 400) {
          ledger.setFavorites(user.id, previousFavs);
          setFavoriteIds(previousFavs);
          showToast(err.message || 'Server rejected favorite update. Change rolled back.', 'error');
        }
      }
    }
  };

  const handleToggleCompare = (property: Property) => {
    setComparedIds((prev) => {
      if (prev.includes(property.id)) {
        return prev.filter((id) => id !== property.id);
      }
      if (prev.length >= 4) {
        showToast('You can compare up to 4 properties side-by-side. Remove one to add another.', 'warning');
        return prev;
      }
      showToast(`Added "${property.title}" to comparison tray (${prev.length + 1}/4).`, 'info');
      return [...prev, property.id];
    });
  };

  // User investments
  const userInvestments = useMemo(() => {
    void ledgerTick;
    return user ? ledger.getInvestments(user.id) : [];
  }, [user, ledgerTick]);

  const userInvestedPropertyIds = useMemo(
    () => new Set(userInvestments.map((i) => i.propertyId)),
    [userInvestments]
  );

  const myProperties = useMemo(
    () =>
      properties.filter(
        (p) => userInvestedPropertyIds.has(p.id) || (p as any).ownerId === user?.id
      ),
    [properties, userInvestedPropertyIds, user?.id]
  );

  const favoriteSet = useMemo(() => new Set(favoriteIds), [favoriteIds]);

  // Dynamic unique countries from properties
  const availableCountries = useMemo(() => {
    const set = new Set<string>();
    properties.forEach((p) => {
      if (p.country) set.add(p.country.trim());
    });
    return Array.from(set).sort();
  }, [properties]);

  // Reset pagination to page 1 whenever filters, search, tab, sort, or page size change
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, searchQuery, selectedCountry, selectedType, priceRange, sortBy, pageSize]);

  // Filter & sort properties
  const filteredProperties = useMemo(() => {
    const list = properties.filter((property) => {
      if (activeTab === 'funding' && property.status !== 'funding') return false;
      if (activeTab === 'funded' && property.status !== 'funded') return false;
      if (activeTab === 'returned' && property.status !== 'completed') return false;
      if (activeTab === 'favorites' && !favoriteSet.has(property.id)) return false;
      if (activeTab === 'my_properties') {
        const isMine =
          userInvestedPropertyIds.has(property.id) || (property as any).ownerId === user?.id;
        if (!isMine) return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const matchText =
          property.title.toLowerCase().includes(q) ||
          property.city.toLowerCase().includes(q) ||
          property.country.toLowerCase().includes(q) ||
          property.location.toLowerCase().includes(q) ||
          property.tokenTicker.toLowerCase().includes(q) ||
          (property.ref && property.ref.toLowerCase().includes(q));
        if (!matchText) return false;
      }

      if (selectedCountry !== 'all') {
        if (!property.country.toLowerCase().includes(selectedCountry.toLowerCase())) {
          return false;
        }
      }

      if (selectedType !== 'all') {
        if (property.type !== selectedType) {
          return false;
        }
      }

      // Entry ticket & price range filter
      if (priceRange === 'entry_1500' && property.minimumInvestment > 1500) return false;
      if (priceRange === 'entry_3000' && property.minimumInvestment > 3000) return false;
      if (priceRange === 'entry_5000' && property.minimumInvestment > 5000) return false;
      if (priceRange === 'entry_10000' && property.minimumInvestment > 10000) return false;
      if (priceRange === 'cap_under_3m' && property.targetAmount > 3_000_000) return false;
      if (priceRange === 'cap_over_3m' && property.targetAmount <= 3_000_000) return false;

      return true;
    });

    list.sort((a, b) => {
      if (sortBy === 'yield_desc') return b.estimatedAnnualYield - a.estimatedAnnualYield;
      if (sortBy === 'total_return_desc') return b.totalEstimatedReturn - a.totalEstimatedReturn;
      if (sortBy === 'min_asc') return a.minimumInvestment - b.minimumInvestment;
      if (sortBy === 'min_desc') return b.minimumInvestment - a.minimumInvestment;
      if (sortBy === 'price_asc') return a.targetAmount - b.targetAmount;
      if (sortBy === 'price_desc') return b.targetAmount - a.targetAmount;
      if (sortBy === 'token_asc') return a.tokenPrice - b.tokenPrice;
      if (sortBy === 'progress_desc') {
        return b.fundedAmount / b.targetAmount - a.fundedAmount / a.targetAmount;
      }
      if (sortBy === 'term_asc') return (a.durationMonths || 24) - (b.durationMonths || 24);
      if (sortBy === 'newest') {
        return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
      }
      return 0;
    });

    return list;
  }, [
    properties,
    activeTab,
    favoriteSet,
    userInvestedPropertyIds,
    user?.id,
    searchQuery,
    selectedCountry,
    selectedType,
    priceRange,
    sortBy,
  ]);

  const totalPages = Math.max(1, Math.ceil(filteredProperties.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const startIdx = (safePage - 1) * pageSize;
  const paginatedProperties = filteredProperties.slice(startIdx, startIdx + pageSize);

  const comparedProperties = useMemo(
    () => comparedIds.map((id) => properties.find((p) => p.id === id)).filter(Boolean) as Property[],
    [comparedIds, properties]
  );

  const hasActiveFilters =
    Boolean(searchQuery.trim()) ||
    selectedCountry !== 'all' ||
    selectedType !== 'all' ||
    priceRange !== 'all';

  const resetAllFilters = () => {
    setSearchQuery('');
    setSelectedCountry('all');
    setSelectedType('all');
    setPriceRange('all');
    setCurrentPage(1);
  };

  return (
    <div className="min-h-screen bg-[#f0f8fe] text-[#1C1917] pb-24">
      {/* Top Editorial Metrics Ribbon */}
      <section className="bg-[#14221F] text-white py-14 border-b border-[#233833] relative overflow-hidden max-w-full">
        <div className="container max-w-[1240px] mx-auto px-4 sm:px-6 relative z-10">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
            <div className="max-w-2xl space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#A3C7B6]">
                  L&apos;Agence Asset Marketplace · European Tokenized Assets
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

            {/* Live Platform KPI Quad */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 bg-black/30 border border-white/10 p-5 rounded-xl shrink-0 text-left">
              <div>
                <div className="font-mono text-xl sm:text-2xl font-bold text-white tabular-nums">
                  {properties.length}
                </div>
                <div className="text-[10px] uppercase tracking-wider text-stone-400 mt-0.5">
                  Active Listings
                </div>
              </div>
              <div>
                <div className="font-mono text-xl sm:text-2xl font-bold text-[#A3C7B6] tabular-nums">
                  {properties.length > 0
                    ? `${(
                        properties.reduce((acc, p) => acc + (p.estimatedAnnualYield || 0), 0) /
                        properties.length
                      ).toFixed(1)}%`
                    : '0.0%'}
                </div>
                <div className="text-[10px] uppercase tracking-wider text-stone-400 mt-0.5">
                  Avg Target APY
                </div>
              </div>
              <div>
                <div className="font-mono text-xl sm:text-2xl font-bold text-white tabular-nums">
                  {properties.filter((p) => p.status === 'funding').length}
                </div>
                <div className="text-[10px] uppercase tracking-wider text-stone-400 mt-0.5">
                  Open Subscriptions
                </div>
              </div>
              <div>
                <div className="font-mono text-xl sm:text-2xl font-bold text-[#A3C7B6] tabular-nums">
                  {properties.length > 0
                    ? formatCurrency(Math.min(...properties.map((p) => p.minimumInvestment)))
                    : '€750'}
                </div>
                <div className="text-[10px] uppercase tracking-wider text-stone-400 mt-0.5">
                  Min Entry Ticket
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content & Catalog */}
      <section className="py-10 container max-w-[1240px] mx-auto px-4 sm:px-6 space-y-6">
        {/* Navigation Tabs */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[#d4e5f5] pb-4">
          <div
            className="flex items-center gap-1.5 p-1 bg-white rounded-lg border border-[#d4e5f5] overflow-x-auto"
            role="tablist"
            aria-label="Property status categories"
          >
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'all'}
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'all'
                  ? 'bg-[#1E3A34] text-white shadow-xs'
                  : 'text-[#57534E] hover:text-[#1C1917]'
              }`}
            >
              All ({properties.length})
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'funding'}
              onClick={() => setActiveTab('funding')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'funding'
                  ? 'bg-[#1E3A34] text-white shadow-xs'
                  : 'text-[#57534E] hover:text-[#1C1917]'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#A3C7B6]" aria-hidden="true" />
              <span>In Funding ({properties.filter((p) => p.status === 'funding').length})</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'funded'}
              onClick={() => setActiveTab('funded')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'funded'
                  ? 'bg-[#1E3A34] text-white shadow-xs'
                  : 'text-[#57534E] hover:text-[#1C1917]'
              }`}
            >
              100% Funded ({properties.filter((p) => p.status === 'funded').length})
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'returned'}
              onClick={() => setActiveTab('returned')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'returned'
                  ? 'bg-[#1E3A34] text-white shadow-xs'
                  : 'text-[#57534E] hover:text-[#1C1917]'
              }`}
            >
              Returned ({properties.filter((p) => p.status === 'completed').length})
            </button>

            {/* Saved / Favorites Watchlist Tab */}
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'favorites'}
              onClick={() => setActiveTab('favorites')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'favorites'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'text-rose-700 hover:bg-rose-50'
              }`}
            >
              <Heart className={`w-3.5 h-3.5 ${activeTab === 'favorites' ? 'fill-current' : ''}`} aria-hidden="true" />
              <span>Saved ({properties.filter((p) => favoriteSet.has(p.id)).length})</span>
            </button>

            {/* Dedicated "My Properties" Tab */}
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'my_properties'}
              onClick={() => setActiveTab('my_properties')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'my_properties'
                  ? 'bg-[#1C1917] text-white shadow-xs'
                  : 'text-[#1E3A34] hover:bg-stone-100'
              }`}
            >
              <Crown className="w-3.5 h-3.5" aria-hidden="true" />
              <span>My Properties ({myProperties.length})</span>
            </button>

            {/* Secondary P2P Order Book Tab */}
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'secondary_p2p'}
              onClick={() => setActiveTab('secondary_p2p')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'secondary_p2p'
                  ? 'bg-[#087F5B] text-white shadow-xs'
                  : 'text-[#087F5B] hover:bg-emerald-50'
              }`}
            >
              <Coins className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Secondary P2P Desk</span>
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
                  {initialProperties.filter((p) => !isFrontendEligible(p)).length} Hidden Properties Isolated in Admin Part
                </p>
                <p className="text-[#69736F] text-[11px]">
                  All hidden properties stay strictly in the admin part until an operational function is assigned and approved to appear on the frontend.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => navigateTo('/admin')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#182D2A] text-white font-bold hover:bg-[#27845D] transition-colors shrink-0 text-xs cursor-pointer"
            >
              <span>Open Admin Panel &amp; Review</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Search & Filter Bar (Hidden on Secondary P2P tab which has its own order-book filters) */}
        {activeTab !== 'secondary_p2p' && (
          <div className="bg-white p-4 sm:p-5 rounded-xl border border-[#d4e5f5] shadow-xs space-y-3">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              {/* Keyword Search */}
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#78716C]" aria-hidden="true" />
                <input
                  type="search"
                  aria-label="Search properties by city, name, country, or ticker"
                  placeholder="Search by city, property name, country, ref, or ticker (e.g. Paris, Cannes, KTZ)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-9 py-2.5 rounded-lg border border-[#d4e5f5] text-xs bg-[#f0f8fe] focus:outline-hidden focus:ring-2 focus:ring-[#1E3A34] text-[#1C1917]"
                />
                {searchQuery && (
                  <button
                    type="button"
                    aria-label="Clear search query"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Filter & Sort Dropdowns */}
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                {/* Country / Location Selector */}
                <select
                  value={selectedCountry}
                  onChange={(e) => setSelectedCountry(e.target.value)}
                  aria-label="Filter properties by country"
                  className="px-3 py-2 rounded-lg border border-[#d4e5f5] text-xs font-medium bg-[#f0f8fe] focus:outline-hidden focus:ring-2 focus:ring-[#1E3A34] text-[#1C1917]"
                >
                  <option value="all">All Locations</option>
                  {availableCountries.map((country) => (
                    <option key={country} value={country.toLowerCase()}>
                      {country}
                    </option>
                  ))}
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

                {/* Price & Entry Ticket Filter */}
                <select
                  value={priceRange}
                  onChange={(e) => setPriceRange(e.target.value)}
                  aria-label="Filter by price or minimum entry ticket"
                  className="px-3 py-2 rounded-lg border border-[#d4e5f5] text-xs font-medium bg-[#f0f8fe] focus:outline-hidden focus:ring-2 focus:ring-[#1E3A34] text-[#1C1917]"
                >
                  <option value="all">Any Ticket / Price</option>
                  <option value="entry_1500">Min Ticket ≤ €1,500</option>
                  <option value="entry_3000">Min Ticket ≤ €3,000</option>
                  <option value="entry_5000">Min Ticket ≤ €5,000</option>
                  <option value="entry_10000">Min Ticket ≤ €10,000</option>
                  <option value="cap_under_3m">Asset Cap ≤ €3.0M</option>
                  <option value="cap_over_3m">Asset Cap &gt; €3.0M</option>
                </select>

                {/* Sort Dropdown */}
                <select
                  value={sortBy}
                  onChange={(e) => {
                    setSortBy(e.target.value);
                    persistPreference({ marketplaceSortBy: e.target.value });
                  }}
                  aria-label="Sort properties"
                  className="px-3 py-2 rounded-lg border border-[#d4e5f5] text-xs font-medium bg-[#f0f8fe] focus:outline-hidden focus:ring-2 focus:ring-[#1E3A34] text-[#1C1917]"
                >
                  <option value="yield_desc">Highest Yield (Annual %)</option>
                  <option value="total_return_desc">Highest Total Return %</option>
                  <option value="min_asc">Lowest Entry Ticket</option>
                  <option value="token_asc">Lowest Unit Price</option>
                  <option value="price_asc">Asset Value: Low → High</option>
                  <option value="price_desc">Asset Value: High → Low</option>
                  <option value="progress_desc">Most Funded %</option>
                  <option value="term_asc">Shortest Term</option>
                  <option value="newest">Newest Offerings</option>
                </select>

                {/* Layout Toggle: Feed vs Grid */}
                <div
                  className="flex items-center gap-1 p-0.5 bg-[#f0f8fe] rounded-lg border border-[#d4e5f5] shrink-0"
                  role="group"
                  aria-label="Catalog layout view"
                >
                  <button
                    type="button"
                    onClick={() => {
                      setViewMode('feed');
                      persistPreference({ marketplaceViewMode: 'feed' });
                    }}
                    aria-pressed={viewMode === 'feed'}
                    className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 min-h-[34px] ${
                      viewMode === 'feed'
                        ? 'bg-[#1E3A34] text-white shadow-xs'
                        : 'text-[#57534E] hover:text-[#1C1917]'
                    }`}
                    title="Feed View"
                  >
                    <List className="w-3.5 h-3.5" aria-hidden="true" />
                    <span className="hidden sm:inline">Feed</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setViewMode('grid');
                      persistPreference({ marketplaceViewMode: 'grid' });
                    }}
                    aria-pressed={viewMode === 'grid'}
                    className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 min-h-[34px] ${
                      viewMode === 'grid'
                        ? 'bg-[#1E3A34] text-white shadow-xs'
                        : 'text-[#57534E] hover:text-[#1C1917]'
                    }`}
                    title="Grid View"
                  >
                    <LayoutGrid className="w-3.5 h-3.5" aria-hidden="true" />
                    <span className="hidden sm:inline">Grid</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Active Filter Summary & Result Counter */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#e8f2fc] text-xs">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[#57534E] font-medium">
                  Showing{' '}
                  <strong className="text-[#1C1917] font-mono">
                    {filteredProperties.length === 0 ? 0 : startIdx + 1}–
                    {Math.min(startIdx + pageSize, filteredProperties.length)}
                  </strong>{' '}
                  of <strong className="text-[#1C1917] font-mono">{filteredProperties.length}</strong>{' '}
                  properties
                </span>

                {selectedCountry !== 'all' && (
                  <button
                    type="button"
                    onClick={() => setSelectedCountry('all')}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#EAF8F4] text-[#075B46] border border-[#BCE8D7] text-[11px] font-semibold cursor-pointer"
                  >
                    <span className="capitalize">Location: {selectedCountry}</span>
                    <X className="w-3 h-3" />
                  </button>
                )}

                {selectedType !== 'all' && (
                  <button
                    type="button"
                    onClick={() => setSelectedType('all')}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#EAF8F4] text-[#075B46] border border-[#BCE8D7] text-[11px] font-semibold cursor-pointer"
                  >
                    <span>Type: {selectedType}</span>
                    <X className="w-3 h-3" />
                  </button>
                )}

                {priceRange !== 'all' && (
                  <button
                    type="button"
                    onClick={() => setPriceRange('all')}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#EAF8F4] text-[#075B46] border border-[#BCE8D7] text-[11px] font-semibold cursor-pointer"
                  >
                    <span>Price Filter Active</span>
                    <X className="w-3 h-3" />
                  </button>
                )}

                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={resetAllFilters}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-[#087F5B] hover:underline ml-1 cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Clear filters</span>
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <label htmlFor="marketplace-page-size" className="text-[11px] text-[#57534E]">
                  Per page:
                </label>
                <select
                  id="marketplace-page-size"
                  value={pageSize}
                  onChange={(e) => {
                    const next = Number(e.target.value) || 6;
                    setPageSize(next);
                    persistPreference({ marketplacePageSize: next });
                  }}
                  className="px-2 py-1 rounded-md border border-[#d4e5f5] bg-[#f0f8fe] text-xs font-mono font-semibold text-[#1C1917]"
                >
                  <option value={6}>6</option>
                  <option value={9}>9</option>
                  <option value={12}>12</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Tab Specific Helper Notice: When "My Properties" is selected */}
        {activeTab === 'my_properties' && (
          <div className="p-5 rounded-3xl bg-[#E8F5E9] border border-[#27845D]/40 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#27845D] text-white flex items-center justify-center font-bold shrink-0">
                <Crown className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#142421]">Your Occupied &amp; Tokenized Portfolio Assets</h3>
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
          <>
            {filteredProperties.length === 0 ? (
              <div className="py-16 text-center bg-white rounded-3xl border border-[#E3E8E3] p-8 space-y-4">
                <Building2 className="w-12 h-12 mx-auto text-[#69736F] opacity-40" />
                <h3 className="text-lg font-bold text-[#142421]">
                  {activeTab === 'favorites'
                    ? 'Your saved watchlist is currently empty'
                    : activeTab === 'my_properties'
                    ? 'You do not hold fractional units in any property yet'
                    : 'No opportunities match your filter criteria'}
                </h3>
                <p className="text-xs text-[#69736F] max-w-md mx-auto">
                  {activeTab === 'favorites'
                    ? 'Click the heart icon on any property card to bookmark opportunities for quick comparison and review.'
                    : activeTab === 'my_properties'
                    ? 'Explore open real estate offerings and acquire fractional SPV tokens to build your portfolio.'
                    : 'Try adjusting your search query, location, or ticket filter, or switch back to All listings.'}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('all');
                    resetAllFilters();
                  }}
                  className="btn btn-primary text-xs font-bold px-5 py-2.5 rounded-xl cursor-pointer"
                >
                  Browse All Opportunities
                </button>
              </div>
            ) : (
              <>
                <div
                  className={
                    viewMode === 'feed'
                      ? 'max-w-2xl mx-auto flex flex-col gap-8 w-full'
                      : 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7'
                  }
                >
                  {paginatedProperties.map((property) => (
                    <PropertyCard
                      key={property.id}
                      property={property}
                      onSelect={(prop) => onSelectProperty(prop)}
                      onInvest={(prop) => onInvestProperty(prop)}
                      onOpenBrochure={(prop) => setBrochureProperty(prop)}
                      isUserOccupied={
                        userInvestedPropertyIds.has(property.id) ||
                        (property as any).ownerId === user?.id
                      }
                      isFavorite={favoriteSet.has(property.id)}
                      onToggleFavorite={handleToggleFavorite}
                      isCompared={comparedIds.includes(property.id)}
                      onToggleCompare={handleToggleCompare}
                    />
                  ))}
                </div>

                {/* Pagination Bar */}
                {totalPages > 1 && (
                  <nav
                    aria-label="Property catalog pagination"
                    className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-[#d4e5f5] shadow-2xs"
                  >
                    <span className="text-xs text-[#57534E]">
                      Page <strong className="font-mono text-[#1C1917]">{safePage}</strong> of{' '}
                      <strong className="font-mono text-[#1C1917]">{totalPages}</strong>
                    </span>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setCurrentPage((p) => Math.max(1, p - 1));
                          window.scrollTo({ top: 280, behavior: 'smooth' });
                        }}
                        disabled={safePage <= 1}
                        aria-label="Previous page"
                        className="px-3 py-1.5 rounded-lg border border-[#d4e5f5] bg-[#f0f8fe] hover:bg-[#e1effc] disabled:opacity-40 disabled:cursor-not-allowed text-xs font-semibold text-[#1C1917] flex items-center gap-1 cursor-pointer"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                        <span>Previous</span>
                      </button>

                      {Array.from({ length: totalPages }, (_, idx) => idx + 1).map((pageNum) => (
                        <button
                          key={pageNum}
                          type="button"
                          onClick={() => {
                            setCurrentPage(pageNum);
                            window.scrollTo({ top: 280, behavior: 'smooth' });
                          }}
                          aria-current={safePage === pageNum ? 'page' : undefined}
                          className={`w-8 h-8 rounded-lg text-xs font-mono font-bold transition-colors cursor-pointer ${
                            safePage === pageNum
                              ? 'bg-[#1E3A34] text-white shadow-xs'
                              : 'bg-[#f0f8fe] text-[#1C1917] hover:bg-[#e1effc] border border-[#d4e5f5]'
                          }`}
                        >
                          {pageNum}
                        </button>
                      ))}

                      <button
                        type="button"
                        onClick={() => {
                          setCurrentPage((p) => Math.min(totalPages, p + 1));
                          window.scrollTo({ top: 280, behavior: 'smooth' });
                        }}
                        disabled={safePage >= totalPages}
                        aria-label="Next page"
                        className="px-3 py-1.5 rounded-lg border border-[#d4e5f5] bg-[#f0f8fe] hover:bg-[#e1effc] disabled:opacity-40 disabled:cursor-not-allowed text-xs font-semibold text-[#1C1917] flex items-center gap-1 cursor-pointer"
                      >
                        <span>Next</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </nav>
                )}
              </>
            )}
          </>
        )}
      </section>

      {/* Sticky Property Comparison Tray */}
      {comparedProperties.length > 0 && (
        <div
          role="region"
          aria-label="Selected properties for comparison"
          className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 w-[calc(100%-24px)] max-w-4xl bg-[#142421] text-white px-4 py-3 rounded-2xl shadow-2xl border border-[#27845D]/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
        >
          <div className="flex items-center gap-3 overflow-x-auto">
            <div className="flex items-center gap-1.5 shrink-0">
              <Scale className="w-4 h-4 text-[#B7E36A]" aria-hidden="true" />
              <span className="text-xs font-bold">Compare ({comparedProperties.length}/4):</span>
            </div>
            <div className="flex items-center gap-2 overflow-x-auto">
              {comparedProperties.map((prop) => (
                <span
                  key={prop.id}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/10 border border-white/15 text-[11px] font-medium whitespace-nowrap"
                >
                  <span className="truncate max-w-[120px]">{prop.title}</span>
                  <button
                    type="button"
                    onClick={() =>
                      setComparedIds((prev) => prev.filter((id) => id !== prop.id))
                    }
                    aria-label={`Remove ${prop.title} from comparison`}
                    className="text-white/70 hover:text-white cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setComparedIds([])}
              className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold text-white cursor-pointer"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={() => setIsCompareModalOpen(true)}
              className="px-4 py-1.5 rounded-xl bg-[#087F5B] hover:bg-[#075B46] text-xs font-bold text-white flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <span>Compare Side-by-Side</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Side-by-Side Comparison Modal */}
      <PropertyComparisonModal
        properties={comparedProperties}
        isOpen={isCompareModalOpen}
        onClose={() => setIsCompareModalOpen(false)}
        onRemoveProperty={(propId) =>
          setComparedIds((prev) => prev.filter((id) => id !== propId))
        }
        onClearAll={() => {
          setComparedIds([]);
          setIsCompareModalOpen(false);
        }}
        onSelectProperty={onSelectProperty}
        onInvestProperty={onInvestProperty}
      />

      {/* Official Property Brochure Modal */}
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
