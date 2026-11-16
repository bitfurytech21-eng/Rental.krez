import React, { useMemo } from 'react';
import { Search, Building2 } from 'lucide-react';
import { usePortal } from '../state/PortalContext';
import { PropertyCard } from '../components/PropertyCard';
import { FilterChips } from '../components/FilterChips';
import { EmptyState } from '../components/EmptyState';
import { LoadingSkeleton, ErrorBanner } from '../components/LoadingSkeleton';

export const ExplorePage: React.FC = () => {
  const {
    loading,
    error,
    properties,
    exploreFilter,
    setExploreFilter,
    exploreSearch,
    setExploreSearch,
    navigatePortal,
    refreshAll,
  } = usePortal();

  const filterOptions = ['All', 'Open', 'Funded', 'Upcoming'];

  const filtered = useMemo(() => {
    const q = exploreSearch.trim().toLowerCase();
    return properties.filter((p) => {
      if (exploreFilter === 'Open' && p.status !== 'funding' && p.status !== 'active') return false;
      if (exploreFilter === 'Funded' && p.status !== 'funded') return false;
      if (exploreFilter === 'Upcoming' && p.status !== 'upcoming') return false;
      if (q) {
        const hay = `${p.title} ${p.location} ${p.type}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [properties, exploreFilter, exploreSearch]);

  if (loading && properties.length === 0) {
    return <LoadingSkeleton rows={4} />;
  }

  return (
    <div className="space-y-6">
      {error && <ErrorBanner message={error} onRetry={refreshAll} />}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-heading font-bold text-white">Available property SPVs</h2>
          <p className="text-sm text-[#8EA7C7] mt-0.5">
            Live investment offerings from the verified property marketplace.
          </p>
        </div>

        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-[#8EA7C7] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="search"
            value={exploreSearch}
            onChange={(e) => setExploreSearch(e.target.value)}
            placeholder="Search city, asset, or type..."
            aria-label="Search properties"
            className="portal-input !pl-10"
          />
        </div>
      </div>

      <FilterChips
        options={filterOptions}
        value={exploreFilter}
        onChange={setExploreFilter}
        ariaLabel="Filter properties by status"
      />

      {filtered.length === 0 ? (
        <EmptyState
          icon={<Building2 className="w-5 h-5" />}
          title="No matching offerings"
          description="Try clearing your search filter or viewing all available property offerings."
          actionLabel="Reset filters"
          onAction={() => {
            setExploreFilter('All');
            setExploreSearch('');
          }}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5">
          {filtered.map((prop) => (
            <PropertyCard
              key={prop.id}
              property={prop}
              onSelect={(selected) =>
                navigatePortal('property-detail', { propertySlug: selected.slug || selected.id })
              }
            />
          ))}
        </div>
      )}
    </div>
  );
};
