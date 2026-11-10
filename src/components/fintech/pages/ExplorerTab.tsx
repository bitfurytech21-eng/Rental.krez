import React, { useState, useMemo } from 'react';
import {
  Search, MapPin, Building2, TrendingUp, SlidersHorizontal,
  LayoutGrid, List, ArrowUpDown, ChevronDown, Check, Coins
} from 'lucide-react';
import { Property } from '../../../types/property';
import { formatCurrency } from '../../../lib/utils';

interface ExplorerTabProps {
  properties: Property[];
  onSelectProperty: (property: Property) => void;
}

export const ExplorerTab: React.FC<ExplorerTabProps> = ({ properties, onSelectProperty }) => {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [search, setSearch] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('all');
  const [selectedType, setSelectedType] = useState('all');
  const [selectedYield, setSelectedYield] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [sortBy, setSortBy] = useState<'yield_desc' | 'price_asc' | 'funded_desc' | 'newest'>('yield_desc');

  // Extract distinct locations and types
  const locations = useMemo(() => {
    const locSet = new Set<string>();
    properties.forEach((p) => {
      const city = p.location.split(',')[0].trim();
      if (city) locSet.add(city);
    });
    return Array.from(locSet);
  }, [properties]);

  const propertyTypes = useMemo(() => {
    const types = new Set<string>();
    properties.forEach((p) => {
      if (p.type) types.add(p.type);
    });
    return Array.from(types);
  }, [properties]);

  // Filter & Sort
  const filteredProperties = useMemo(() => {
    return properties
      .filter((p) => {
        // Status visibility
        if (p.status === 'hidden' || p.status === 'pending_approval') return false;

        // Search text
        if (search.trim()) {
          const q = search.toLowerCase();
          const matchTitle = p.title.toLowerCase().includes(q);
          const matchLoc = p.location.toLowerCase().includes(q);
          const matchType = p.type?.toLowerCase().includes(q);
          if (!matchTitle && !matchLoc && !matchType) return false;
        }

        // Location
        if (selectedLocation !== 'all') {
          if (!p.location.toLowerCase().includes(selectedLocation.toLowerCase())) return false;
        }

        // Property Type
        if (selectedType !== 'all') {
          if (p.type?.toLowerCase() !== selectedType.toLowerCase()) return false;
        }

        // Yield Range
        if (selectedYield === 'gt8' && p.estimatedAnnualYield < 8) return false;
        if (selectedYield === 'gt9' && p.estimatedAnnualYield < 9) return false;
        if (selectedYield === 'gt10' && p.estimatedAnnualYield < 10) return false;

        // Status
        if (selectedStatus !== 'all') {
          if (p.status !== selectedStatus) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'yield_desc') return b.estimatedAnnualYield - a.estimatedAnnualYield;
        if (sortBy === 'price_asc') return a.tokenPrice - b.tokenPrice;
        if (sortBy === 'funded_desc') {
          const aFundedPct = (a.fundedAmount / (a.targetAmount || 1)) * 100;
          const bFundedPct = (b.fundedAmount / (b.targetAmount || 1)) * 100;
          return bFundedPct - aFundedPct;
        }
        return b.id.localeCompare(a.id);
      });
  }, [properties, search, selectedLocation, selectedType, selectedYield, selectedStatus, sortBy]);

  return (
    <div className="space-y-[16px] text-[#0F172A] dark:text-[#E2E8F0]">
      {/* 3-Column Card Grid (or List View) */}
      {filteredProperties.length === 0 ? (
        <div className="p-12 text-center rounded-[12px] bg-white dark:bg-[#111A2C] border border-[#E2E8F0] dark:border-[#1E293B]">
          <Building2 className="w-12 h-12 text-[#64748B] dark:text-[#94A3B8] mx-auto mb-3 opacity-40" strokeWidth={1.5} />
          <h3 className="text-[16px] font-semibold mb-1">No matching assets found</h3>
          <p className="text-[14px] text-[#64748B] dark:text-[#94A3B8] mb-4">
            Try adjusting your search criteria, region filters, or target yields.
          </p>
          <button
            onClick={() => {
              setSearch('');
              setSelectedLocation('all');
              setSelectedType('all');
              setSelectedYield('all');
              setSelectedStatus('all');
            }}
            className="px-4 py-2 rounded-[8px] bg-[#0F4C81] text-white text-[14px] font-semibold hover:opacity-90 cursor-pointer"
          >
            Clear All Filters
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-[16px]">
          {filteredProperties.map((prop) => {
            const fundedPercent = Math.min(100, Math.round((prop.fundedAmount / (prop.targetAmount || 1)) * 100));
            return (
              <div
                key={prop.id}
                className="rounded-[12px] bg-white dark:bg-[#111A2C] border border-[#E2E8F0] dark:border-[#1E293B] shadow-[0_1px_3px_rgba(0,0,0,0.06)] overflow-hidden flex flex-col hover:border-[#0F4C81]/50 dark:hover:border-[#14B8A6]/50 transition-all duration-150 group"
              >
                {/* 16:10 Aspect Ratio Image */}
                <div className="relative aspect-[16/10] bg-[#F8FAFC] dark:bg-[#0B1220] overflow-hidden">
                  <img
                    src={prop.images?.[0] || 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=600&auto=format&fit=crop'}
                    alt={prop.title}
                    className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300"
                  />
                  {/* Status Badge */}
                  <div className="absolute top-3 left-3">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wider backdrop-blur-md ${
                        prop.status === 'funded'
                          ? 'bg-[#16A34A]/90 text-white'
                          : prop.status === 'upcoming'
                          ? 'bg-[#F59E0B]/90 text-white'
                          : 'bg-[#0F4C81]/90 text-white'
                      }`}
                    >
                      {prop.status === 'funding' ? 'Active Allocation' : prop.status}
                    </span>
                  </div>

                  {/* Yield Badge Top-Right */}
                  <div className="absolute top-3 right-3">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/95 dark:bg-[#111A2C]/95 text-[#16A34A] text-[12px] font-bold shadow-xs tabular-nums">
                      <TrendingUp className="w-3.5 h-3.5" /> {prop.estimatedAnnualYield}% p.a.
                    </span>
                  </div>
                </div>

                {/* Card Content */}
                <div className="p-[20px] flex-1 flex flex-col justify-between space-y-4">
                  <div>
                    <div className="flex items-center gap-1 text-[12px] text-[#64748B] dark:text-[#94A3B8] mb-1">
                      <MapPin className="w-3.5 h-3.5 shrink-0" strokeWidth={1.5} />
                      <span className="truncate">{prop.location}</span>
                    </div>
                    <h4 className="text-[16px] font-semibold leading-snug line-clamp-1 text-[#0F172A] dark:text-[#E2E8F0]">
                      {prop.title}
                    </h4>
                  </div>

                  {/* Key Stats Row */}
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#E2E8F0] dark:border-[#1E293B] text-[12px]">
                    <div>
                      <span className="text-[#64748B] dark:text-[#94A3B8] block">Token Unit Price</span>
                      <span className="text-[16px] font-bold text-[#0F172A] dark:text-[#E2E8F0] tabular-nums">
                        €{prop.tokenPrice}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[#64748B] dark:text-[#94A3B8] block">Asset Valuation</span>
                      <span className="text-[16px] font-bold text-[#0F172A] dark:text-[#E2E8F0] tabular-nums">
                        {formatCurrency(prop.targetAmount)}
                      </span>
                    </div>
                  </div>

                  {/* Funded Progress Bar */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[12px]">
                      <span className="text-[#64748B] dark:text-[#94A3B8]">Capital Subscribed</span>
                      <span className="font-semibold tabular-nums text-[#0F172A] dark:text-[#E2E8F0]">
                        {fundedPercent}%
                      </span>
                    </div>
                    <div className="w-full bg-[#E2E8F0] dark:bg-[#1E293B] h-2 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#14B8A6] rounded-full transition-all duration-300"
                        style={{ width: `${fundedPercent}%` }}
                      />
                    </div>
                  </div>

                  {/* View Button */}
                  <button
                    onClick={() => onSelectProperty(prop)}
                    className="w-full py-2.5 px-4 rounded-[8px] bg-[#0F4C81] hover:bg-[#0F4C81]/90 text-white text-[14px] font-semibold transition-all shadow-[0_1px_3px_rgba(0,0,0,0.06)] cursor-pointer"
                  >
                    View Property
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* List Mode View */
        <div className="rounded-[12px] bg-white dark:bg-[#111A2C] border border-[#E2E8F0] dark:border-[#1E293B] shadow-[0_1px_3px_rgba(0,0,0,0.06)] overflow-hidden">
          <table className="w-full text-left text-[14px]">
            <thead className="bg-[#F8FAFC] dark:bg-[#0B1220] border-b border-[#E2E8F0] dark:border-[#1E293B] text-[12px] text-[#64748B] dark:text-[#94A3B8] uppercase tracking-wider font-semibold">
              <tr>
                <th className="py-3 px-4">Asset</th>
                <th className="py-3 px-4">Location</th>
                <th className="py-3 px-4">Token Price</th>
                <th className="py-3 px-4">Projected Yield</th>
                <th className="py-3 px-4">Funded Progress</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0] dark:divide-[#1E293B]">
              {filteredProperties.map((prop) => {
                const fundedPercent = Math.min(100, Math.round((prop.fundedAmount / (prop.targetAmount || 1)) * 100));
                return (
                  <tr key={prop.id} className="hover:bg-[#F8FAFC] dark:hover:bg-[#1E293B]/40 transition-colors">
                    <td className="py-3.5 px-4 flex items-center gap-3">
                      <img
                        src={prop.images?.[0] || 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=100&auto=format&fit=crop'}
                        alt={prop.title}
                        className="w-[48px] h-[36px] rounded-[6px] object-cover shrink-0"
                      />
                      <div className="font-semibold text-[14px] truncate">{prop.title}</div>
                    </td>
                    <td className="py-3.5 px-4 text-[13px] text-[#64748B] dark:text-[#94A3B8]">{prop.location}</td>
                    <td className="py-3.5 px-4 tabular-nums font-semibold">€{prop.tokenPrice}</td>
                    <td className="py-3.5 px-4 tabular-nums font-semibold text-[#16A34A]">{prop.estimatedAnnualYield}% p.a.</td>
                    <td className="py-3.5 px-4 tabular-nums">
                      <div className="flex items-center gap-2">
                        <div className="w-20 bg-[#E2E8F0] dark:bg-[#1E293B] h-1.5 rounded-full overflow-hidden">
                          <div className="bg-[#14B8A6] h-full" style={{ width: `${fundedPercent}%` }} />
                        </div>
                        <span className="text-[12px] text-[#64748B] dark:text-[#94A3B8]">{fundedPercent}%</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => onSelectProperty(prop)}
                        className="px-3.5 py-1.5 rounded-[8px] bg-[#0F4C81] text-white text-[12px] font-semibold hover:opacity-90 cursor-pointer"
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
