import React from 'react';
import { PropertyType, PropertyStatus } from '../../types/property';
import { Filter, RotateCcw, SlidersHorizontal, MapPin, Clock, Tag, Coins } from 'lucide-react';

interface PropertyFiltersProps {
  selectedLocation: string;
  onSelectLocation: (loc: string) => void;
  selectedType: string;
  onSelectType: (type: string) => void;
  selectedDuration: string;
  onSelectDuration: (dur: string) => void;
  selectedStatus: string;
  onSelectStatus: (status: string) => void;
  minInvestmentFilter: number;
  onSelectMinInvestment: (min: number) => void;
  sortBy: string;
  onSelectSort: (sort: string) => void;
  totalCount: number;
  onResetFilters: () => void;
}

export const PropertyFilters: React.FC<PropertyFiltersProps> = ({
  selectedLocation,
  onSelectLocation,
  selectedType,
  onSelectType,
  selectedDuration,
  onSelectDuration,
  selectedStatus,
  onSelectStatus,
  minInvestmentFilter,
  onSelectMinInvestment,
  sortBy,
  onSelectSort,
  totalCount,
  onResetFilters,
}) => {
  const locations = [
    { label: 'All Regions', value: 'all' },
    { label: 'Paris & Île-de-France', value: 'Paris' },
    { label: 'French Riviera & Côte d’Azur', value: 'Provence-Alpes-Côte-d\'Azur' },
    { label: 'Cannes & Antibes', value: 'Cannes' },
    { label: 'Saint-Tropez', value: 'Saint Tropez' },
    { label: 'French Alps & Chalets', value: 'Auvergne-Rhône-Alpes' },
    { label: 'Occitanie & Provence', value: 'Occitanie' },
    { label: 'Nouvelle-Aquitaine & Basque Coast', value: 'Nouvelle-Aquitaine' },
    { label: 'Loire Valley & Central Castles', value: 'Centre-Val-de-Loire' },
    { label: 'Normandy & Brittany', value: 'Normandie' },
    { label: 'Corsica', value: 'Corse' },
  ];

  const types: { label: string; value: string }[] = [
    { label: 'All Property Types', value: 'all' },
    { label: 'Prestige Villas', value: 'Villa' },
    { label: 'Luxury Apartments', value: 'Apartment' },
    { label: 'Châteaux & Historic Estates', value: 'Château' },
    { label: 'Private Mansions (Hôtel Particulier)', value: 'Private Mansion' },
    { label: 'Alpine Chalets', value: 'Chalet' },
    { label: 'Country Estates', value: 'Estate / Property' },
  ];

  const statuses: { label: string; value: string }[] = [
    { label: 'All Statuses', value: 'all' },
    { label: 'Funding Active', value: 'funding' },
    { label: '100% Funded', value: 'funded' },
    { label: 'Launching Soon', value: 'upcoming' },
  ];

  const durations = [
    { label: 'All Durations', value: 'all' },
    { label: 'Short Term (3–12 Mo)', value: '12' },
    { label: 'Medium Term (13–24 Mo)', value: '24' },
    { label: 'Standard Term (25–36 Mo)', value: '36' },
    { label: 'Long Term (37–48 Mo)', value: '48' },
  ];

  const minInvestments = [
    { label: 'All (from €750)', value: 750 },
    { label: 'Min €1,000+', value: 1000 },
    { label: 'Min €2,000+', value: 2000 },
    { label: 'Min €5,000+', value: 5000 },
    { label: 'Min €10,000', value: 10000 },
  ];

  const isFiltered =
    selectedLocation !== 'all' ||
    selectedType !== 'all' ||
    selectedDuration !== 'all' ||
    selectedStatus !== 'all' ||
    minInvestmentFilter > 750;

  return (
    <div className="bg-white p-5 sm:p-6 rounded-3xl border border-[#E3E8E3] shadow-sm mb-8 space-y-5">
      {/* Top Bar: Headline & Quick Category Filters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#E3E8E3]">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4 text-[#27845D]" />
          <span className="text-sm font-bold text-[#18211F]">Marketplace Filters</span>
          <span className="text-xs text-[#69736F] bg-[#EEF1EC] px-2 py-0.5 rounded-full font-semibold">
            Minimum €750 – €10,000 Verified
          </span>
        </div>

        {/* Quick Type Segmented Pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          {types.slice(0, 4).map((t) => (
            <button
              key={t.value}
              onClick={() => onSelectType(t.value)}
              className={`text-xs px-3 py-1.5 rounded-full font-semibold transition-all ${
                selectedType === t.value
                  ? 'bg-[#182D2A] text-white shadow-sm'
                  : 'bg-[#F6F7F4] text-[#69736F] hover:text-[#18211F]'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Grid of 5 Structured Dropdown Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* 1. Location Filter */}
        <div className="space-y-1">
          <label className="text-[11px] font-bold text-[#69736F] uppercase tracking-wider flex items-center gap-1">
            <MapPin className="w-3 h-3 text-[#27845D]" />
            Location
          </label>
          <select
            value={selectedLocation}
            onChange={(e) => onSelectLocation(e.target.value)}
            className="w-full text-xs bg-[#F6F7F4] border border-[#E3E8E3] rounded-xl px-3 py-2.5 font-medium text-[#18211F] focus:outline-none focus:border-[#182D2A] transition-colors"
          >
            {locations.map((loc) => (
              <option key={loc.value} value={loc.value}>
                {loc.label}
              </option>
            ))}
          </select>
        </div>

        {/* 2. Property Type */}
        <div className="space-y-1">
          <label className="text-[11px] font-bold text-[#69736F] uppercase tracking-wider flex items-center gap-1">
            <Tag className="w-3 h-3 text-[#27845D]" />
            Property Type
          </label>
          <select
            value={selectedType}
            onChange={(e) => onSelectType(e.target.value)}
            className="w-full text-xs bg-[#F6F7F4] border border-[#E3E8E3] rounded-xl px-3 py-2.5 font-medium text-[#18211F] focus:outline-none focus:border-[#182D2A] transition-colors"
          >
            {types.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>

        {/* 3. Investment Duration */}
        <div className="space-y-1">
          <label className="text-[11px] font-bold text-[#69736F] uppercase tracking-wider flex items-center gap-1">
            <Clock className="w-3 h-3 text-[#27845D]" />
            Duration
          </label>
          <select
            value={selectedDuration}
            onChange={(e) => onSelectDuration(e.target.value)}
            className="w-full text-xs bg-[#F6F7F4] border border-[#E3E8E3] rounded-xl px-3 py-2.5 font-medium text-[#18211F] focus:outline-none focus:border-[#182D2A] transition-colors"
          >
            {durations.map((d) => (
              <option key={d.value} value={d.value}>
                {d.label}
              </option>
            ))}
          </select>
        </div>

        {/* 4. Funding Status */}
        <div className="space-y-1">
          <label className="text-[11px] font-bold text-[#69736F] uppercase tracking-wider flex items-center gap-1">
            <Filter className="w-3 h-3 text-[#27845D]" />
            Status
          </label>
          <select
            value={selectedStatus}
            onChange={(e) => onSelectStatus(e.target.value)}
            className="w-full text-xs bg-[#F6F7F4] border border-[#E3E8E3] rounded-xl px-3 py-2.5 font-medium text-[#18211F] focus:outline-none focus:border-[#182D2A] transition-colors"
          >
            {statuses.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        {/* 5. Minimum Investment (Strictly >= €1,000) */}
        <div className="space-y-1">
          <label className="text-[11px] font-bold text-[#69736F] uppercase tracking-wider flex items-center gap-1">
            <Coins className="w-3 h-3 text-[#27845D]" />
            Min. Investment
          </label>
          <select
            value={minInvestmentFilter}
            onChange={(e) => onSelectMinInvestment(Number(e.target.value))}
            className="w-full text-xs bg-[#F6F7F4] border border-[#E3E8E3] rounded-xl px-3 py-2.5 font-bold text-[#182D2A] focus:outline-none focus:border-[#182D2A] transition-colors"
          >
            {minInvestments.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Bottom Bar: Sort Options & Results Counter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-[#E3E8E3] text-xs">
        <div className="flex items-center gap-2">
          <span className="font-bold text-[#69736F]">Sort Opportunities:</span>
          <select
            value={sortBy}
            onChange={(e) => onSelectSort(e.target.value)}
            className="bg-[#F6F7F4] border border-[#E3E8E3] rounded-xl px-3 py-1.5 font-semibold text-[#18211F] focus:outline-none focus:border-[#182D2A]"
          >
            <option value="min_asc">Lowest Minimum Investment (€1,000+)</option>
            <option value="min_desc">Highest Minimum Investment</option>
            <option value="newest">Newest Listings</option>
            <option value="yield_desc">Highest Projected Net Yield</option>
            <option value="progress_desc">Funding Progress (%)</option>
          </select>
        </div>

        <div className="flex items-center gap-4 ml-auto sm:ml-0">
          {isFiltered && (
            <button
              onClick={onResetFilters}
              className="text-xs font-bold text-[#C24141] hover:underline flex items-center gap-1"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset All Filters
            </button>
          )}

          <span className="text-xs font-bold text-[#182D2A] bg-[#F6F7F4] px-3 py-1.5 rounded-full border border-[#E3E8E3]">
            {totalCount} {totalCount === 1 ? 'Opportunity Available' : 'Opportunities Available'}
          </span>
        </div>
      </div>
    </div>
  );
};
