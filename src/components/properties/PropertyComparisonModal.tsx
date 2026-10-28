import React, { useEffect } from 'react';
import { Property } from '../../types/property';
import { formatCurrency, formatPercent } from '../../lib/utils';
import {
  X,
  Scale,
  ArrowRight,
  Trash2,
  MapPin,
  TrendingUp,
  Coins,
  Clock,
  Building2,
  Award,
} from 'lucide-react';

interface PropertyComparisonModalProps {
  properties: Property[];
  isOpen: boolean;
  onClose: () => void;
  onRemoveProperty: (propertyId: string) => void;
  onClearAll: () => void;
  onSelectProperty: (property: Property) => void;
  onInvestProperty: (property: Property) => void;
}

export const PropertyComparisonModal: React.FC<PropertyComparisonModalProps> = ({
  properties,
  isOpen,
  onClose,
  onRemoveProperty,
  onClearAll,
  onSelectProperty,
  onInvestProperty,
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const bestYield = properties.length > 0
    ? Math.max(...properties.map((p) => p.estimatedAnnualYield || 0))
    : 0;
  const lowestEntry = properties.length > 0
    ? Math.min(...properties.map((p) => p.minimumInvestment || Infinity))
    : 0;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="property-comparison-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-3xl border border-[#E3E8E3] shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col overflow-hidden my-auto">
        {/* Header */}
        <div className="px-5 py-4 bg-[#142421] text-white flex flex-wrap items-center justify-between gap-3 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#27845D]/30 border border-[#B7E36A]/30 text-[#B7E36A] flex items-center justify-center">
              <Scale className="w-4 h-4" aria-hidden="true" />
            </div>
            <div>
              <h2 id="property-comparison-title" className="text-base sm:text-lg font-bold text-white leading-tight">
                Side-by-Side Asset Comparison ({properties.length}/4)
              </h2>
              <p className="text-[11px] text-emerald-200/80">
                Compare verified SPV capitalization, projected yields, entry tickets, and remaining token inventory.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {properties.length > 0 && (
              <button
                type="button"
                onClick={onClearAll}
                className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-semibold text-white transition-colors cursor-pointer focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-[#B7E36A]"
              >
                Clear All
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close comparison dialog"
              className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Comparison Content */}
        <div className="p-4 sm:p-6 overflow-auto flex-1">
          {properties.length === 0 ? (
            <div className="py-14 text-center space-y-3">
              <Building2 className="w-10 h-10 text-[#69736F] opacity-40 mx-auto" />
              <p className="text-sm font-bold text-[#18211F]">No properties selected for comparison</p>
              <p className="text-xs text-[#69736F]">
                Select up to 4 properties using the Compare button on any marketplace card.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[680px] border-collapse text-xs text-left">
                <thead>
                  <tr>
                    <th className="w-44 p-3 align-bottom bg-[#F6FAF8] border border-[#E4EEEA] rounded-tl-xl font-bold uppercase tracking-wider text-[10px] text-[#71817D]">
                      Specification
                    </th>
                    {properties.map((prop) => {
                      const fundingPct = Math.min(100, Math.round((prop.fundedAmount / prop.targetAmount) * 100));
                      return (
                        <th key={prop.id} className="p-3 align-top bg-white border border-[#E4EEEA] min-w-[210px]">
                          <div className="space-y-2.5">
                            <div className="relative aspect-[16/10] rounded-xl overflow-hidden bg-[#EAF8F4]">
                              <img
                                src={prop.images[0] || prop.bannerImage}
                                alt={prop.title}
                                className="w-full h-full object-cover"
                                referrerPolicy="no-referrer"
                              />
                              <button
                                type="button"
                                onClick={() => onRemoveProperty(prop.id)}
                                aria-label={`Remove ${prop.title} from comparison`}
                                className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/65 hover:bg-rose-600 text-white transition-colors cursor-pointer"
                                title="Remove from comparison"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                              <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-black/65 text-white font-mono text-[10px] font-semibold">
                                {prop.tokenTicker}
                              </span>
                            </div>

                            <div>
                              <span className="text-[10px] font-semibold text-[#71817D] flex items-center gap-1 truncate">
                                <MapPin className="w-3 h-3 text-[#087F5B] shrink-0" />
                                {prop.city}, {prop.country}
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  onClose();
                                  onSelectProperty(prop);
                                }}
                                className="font-serif text-sm font-bold text-[#172B2A] hover:text-[#087F5B] text-left line-clamp-2 mt-0.5 cursor-pointer"
                              >
                                {prop.title}
                              </button>
                            </div>

                            <div className="flex items-center justify-between text-[10px] font-mono text-[#087F5B] bg-[#F6FAF8] px-2 py-1 rounded-lg border border-[#E4EEEA]">
                              <span>{fundingPct}% Funded</span>
                              <span>{prop.availableTokens} units left</span>
                            </div>
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E4EEEA]">
                  <tr>
                    <td className="p-3 font-bold text-[#52605C] bg-[#F6FAF8] border-x border-[#E4EEEA]">
                      Asset Format & Status
                    </td>
                    {properties.map((p) => (
                      <td key={p.id} className="p-3 border-r border-[#E4EEEA] font-semibold text-[#172B2A]">
                        <span>{p.type}</span>
                        <span className="ml-2 inline-block px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wider bg-[#EEF1EC] text-[#182D2A]">
                          {p.status === 'funding' ? 'In Funding' : p.status === 'funded' ? '100% Funded' : p.status}
                        </span>
                      </td>
                    ))}
                  </tr>

                  <tr>
                    <td className="p-3 font-bold text-[#52605C] bg-[#F6FAF8] border-x border-[#E4EEEA]">
                      Projected Annual Yield
                    </td>
                    {properties.map((p) => {
                      const isBest = properties.length > 1 && p.estimatedAnnualYield === bestYield;
                      return (
                        <td key={p.id} className="p-3 border-r border-[#E4EEEA] font-mono">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-black text-[#087F5B]">
                              {formatPercent(p.estimatedAnnualYield)}
                            </span>
                            {isBest && (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-emerald-100 text-[#075B46] text-[9.5px] font-sans font-bold">
                                <Award className="w-2.5 h-2.5" /> Highest
                              </span>
                            )}
                          </div>
                        </td>
                      );
                    })}
                  </tr>

                  <tr>
                    <td className="p-3 font-bold text-[#52605C] bg-[#F6FAF8] border-x border-[#E4EEEA]">
                      Monthly Target Rate
                    </td>
                    {properties.map((p) => (
                      <td key={p.id} className="p-3 border-r border-[#E4EEEA] font-mono font-bold text-[#172B2A]">
                        <span className="inline-flex items-center gap-1 text-[#087F5B]">
                          <TrendingUp className="w-3 h-3" />
                          {formatPercent(p.monthlyTargetRate || 6.0)} / mo
                        </span>
                      </td>
                    ))}
                  </tr>

                  <tr>
                    <td className="p-3 font-bold text-[#52605C] bg-[#F6FAF8] border-x border-[#E4EEEA]">
                      Minimum Entry Ticket
                    </td>
                    {properties.map((p) => {
                      const isLowest = properties.length > 1 && p.minimumInvestment === lowestEntry;
                      return (
                        <td key={p.id} className="p-3 border-r border-[#E4EEEA] font-mono">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-[#172B2A]">{formatCurrency(p.minimumInvestment)}</span>
                            {isLowest && (
                              <span className="px-1.5 py-0.5 rounded bg-sky-100 text-sky-900 text-[9.5px] font-sans font-bold">
                                Lowest Entry
                              </span>
                            )}
                          </div>
                        </td>
                      );
                    })}
                  </tr>

                  <tr>
                    <td className="p-3 font-bold text-[#52605C] bg-[#F6FAF8] border-x border-[#E4EEEA]">
                      Unit / Token Price
                    </td>
                    {properties.map((p) => (
                      <td key={p.id} className="p-3 border-r border-[#E4EEEA] font-mono font-bold text-[#172B2A]">
                        <span className="inline-flex items-center gap-1">
                          <Coins className="w-3 h-3 text-[#087F5B]" />
                          {formatCurrency(p.tokenPrice)} / unit
                        </span>
                      </td>
                    ))}
                  </tr>

                  <tr>
                    <td className="p-3 font-bold text-[#52605C] bg-[#F6FAF8] border-x border-[#E4EEEA]">
                      SPV Target Capitalization
                    </td>
                    {properties.map((p) => (
                      <td key={p.id} className="p-3 border-r border-[#E4EEEA] font-mono text-[#172B2A]">
                        <div className="font-bold">{formatCurrency(p.targetAmount)}</div>
                        <div className="text-[10.5px] text-[#71817D]">
                          Funded: {formatCurrency(p.fundedAmount)}
                        </div>
                      </td>
                    ))}
                  </tr>

                  <tr>
                    <td className="p-3 font-bold text-[#52605C] bg-[#F6FAF8] border-x border-[#E4EEEA]">
                      Target Investment Term
                    </td>
                    {properties.map((p) => (
                      <td key={p.id} className="p-3 border-r border-[#E4EEEA] font-mono font-semibold text-[#172B2A]">
                        <span className="inline-flex items-center gap-1">
                          <Clock className="w-3 h-3 text-[#71817D]" />
                          {p.durationMonths || 24} Months ({p.distributionFrequency})
                        </span>
                      </td>
                    ))}
                  </tr>

                  <tr>
                    <td className="p-3 font-bold text-[#52605C] bg-[#F6FAF8] border-x border-[#E4EEEA]">
                      Surface & Layout
                    </td>
                    {properties.map((p) => (
                      <td key={p.id} className="p-3 border-r border-[#E4EEEA] text-[#172B2A]">
                        {p.surfaceAreaM2 ? `${p.surfaceAreaM2} m²` : 'N/A'}
                        {p.bedrooms !== undefined ? ` · ${p.bedrooms} Beds / ${p.bathrooms ?? 0} Baths` : ''}
                      </td>
                    ))}
                  </tr>

                  <tr>
                    <td className="p-3 font-bold text-[#52605C] bg-[#F6FAF8] border border-[#E4EEEA] rounded-bl-xl">
                      Actions
                    </td>
                    {properties.map((p) => (
                      <td key={p.id} className="p-3 border-r border-b border-[#E4EEEA]">
                        <div className="flex flex-col gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              onClose();
                              onInvestProperty(p);
                            }}
                            disabled={p.status !== 'funding' || p.availableTokens <= 0}
                            className="w-full py-2 px-3 rounded-xl bg-[#087F5B] hover:bg-[#075B46] disabled:bg-slate-200 disabled:text-slate-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:cursor-not-allowed"
                          >
                            <span>{p.status === 'funding' && p.availableTokens > 0 ? 'Invest Now' : 'Fully Funded'}</span>
                            {p.status === 'funding' && p.availableTokens > 0 && <ArrowRight className="w-3.5 h-3.5" />}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              onClose();
                              onSelectProperty(p);
                            }}
                            className="w-full py-1.5 px-3 rounded-xl border border-[#E4EEEA] hover:border-[#087F5B] text-[#172B2A] font-semibold text-xs transition-colors cursor-pointer"
                          >
                            Full Dossier
                          </button>
                        </div>
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
