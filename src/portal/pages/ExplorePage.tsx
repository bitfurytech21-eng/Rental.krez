import React, { useMemo } from 'react';
import { Search, Building2 } from 'lucide-react';
import { usePortal } from '../state/PortalContext';
import { PropertyCard } from '../components/PropertyCard';
import { FilterChips } from '../components/FilterChips';
import { EmptyState } from '../components/EmptyState';
import { LoadingSkeleton, ErrorBanner } from '../components/LoadingSkeleton';

function classifyPropertySegment(type: string): 'Residential' | 'Commercial' {
  const t = String(type || '').toLowerCase();
  if (
    t.includes('commercial') ||
    t.includes('office') ||
    t.includes('retail') ||
    t.includes('industrial') ||
    t.includes('hospitality') ||
    t.includes('hotel') ||
    t.includes('logistics') ||
    t.includes('mixed')
  ) {
    return 'Commercial';
  }
  return 'Residential';
}

export const ExplorePage: React.FC = () => {
  const {
    loading,
    error,
    properties,
    sampleDataEnabled,
    exploreFilter,
    setExploreFilter,
    exploreSearch,
    setExploreSearch,
    navigatePortal,
    refreshAll,
  } = usePortal();

  const filterOptions = ['All', 'Residential', 'Commercial'];
  const activeFilter = filterOptions.includes(exploreFilter) ? exploreFilter : 'All';

  const filtered = useMemo(() => {
    const q = exploreSearch.trim().toLowerCase();
    return properties.filter((p) => {
      if (activeFilter === 'Residential' && classifyPropertySegment(p.type) !== 'Residential') {
        return false;
      }
      if (activeFilter === 'Commercial' && classifyPropertySegment(p.type) !== 'Commercial') {
        return false;
      }
      if (q) {
        const hay = `${p.title} ${p.location} ${p.city || ''} ${p.type}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [properties, activeFilter, exploreSearch]);

  if (loading && !sampleDataEnabled && properties.length === 0) {
    return <LoadingSkeleton rows={4} />;
  }

  return (
    <div className="space-y-6">
      {error && <ErrorBanner message={error} onRetry={refreshAll} />}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-heading font-bold text-[#F2F5F4]">Explore properties</h2>
          <p className="text-sm text-[#8FA1A8] mt-0.5">
            Vetted residential and commercial property SPVs open for investment.
          </p>
        </div>

        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-[#8FA1A8] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="search"
            value={exploreSearch}
            onChange={(e) => setExploreSearch(e.target.value)}
            placeholder="Search name, city, or type..."
            aria-label="Search properties"
            className="portal-input !pl-10"
          />
        </div>
      </div>

      <FilterChips
        options={filterOptions}
        value={activeFilter}
        onChange={setExploreFilter}
        ariaLabel="Filter properties by asset class"
      />

      {filtered.length === 0 ? (
        <EmptyState
          icon={<Building2 className="w-5 h-5" />}
          title="No matching properties"
          description="Try clearing your search term or switching back to all asset classes."
          actionLabel="Show all properties"
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
