import React from 'react';
import { X, ArrowRight, Check, Building2, Coins, TrendingUp, Layers, CheckCircle2 } from 'lucide-react';
import { KrezBuilding } from '../../data/krezTemplateData';
import { formatCurrency, formatPercent } from '../../lib/utils';
import { KrezImage } from './KrezReveal';

interface KrezCompareModalProps {
  buildings: KrezBuilding[];
  allBuildings: KrezBuilding[];
  isOpen: boolean;
  onClose: () => void;
  onSelectBuilding: (buildingId: string) => void;
  onAcquireBuilding: (building: KrezBuilding) => void;
  onRemoveFromCompare: (buildingId: string) => void;
  onAddBuildingToCompare: (buildingId: string) => void;
}

export const KrezCompareModal: React.FC<KrezCompareModalProps> = ({
  buildings,
  allBuildings,
  isOpen,
  onClose,
  onSelectBuilding,
  onAcquireBuilding,
  onRemoveFromCompare,
  onAddBuildingToCompare,
}) => {
  if (!isOpen) return null;

  const availableToAdd = allBuildings.filter(
    (b) => !buildings.some((selected) => selected.id === b.id)
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-label="Building Comparison Matrix"
    >
      <div className="relative w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden rounded-3xl border border-[#594333] bg-[#211711] text-[#F5EFE8] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#594333] px-6 py-4 bg-[#2B1E17] shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#C49A6C] text-[#211711]">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-heading font-bold text-[#F5EFE8]">
                Building Comparison Matrix
              </h2>
              <p className="text-xs text-[#C4B5A5]">
                Comparing {buildings.length} landmark properties on rental cashflow, occupancy, and share terms
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {buildings.length < 3 && availableToAdd.length > 0 && (
              <select
                onChange={(e) => {
                  if (e.target.value) {
                    onAddBuildingToCompare(e.target.value);
                    e.target.value = '';
                  }
                }}
                className="hidden sm:inline-block px-3 py-1.5 rounded-pill border border-[#594333] bg-[#35251C] text-xs font-semibold text-[#F5EFE8] hover:bg-[#403025] cursor-pointer"
                defaultValue=""
              >
                <option value="" disabled>
                  + Add building to compare
                </option>
                {availableToAdd.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.location})
                  </option>
                ))}
              </select>
            )}

            <button
              type="button"
              onClick={onClose}
              className="rounded-full p-2 text-[#C4B5A5] hover:bg-[#35251C] hover:text-[#F5EFE8] transition-colors cursor-pointer"
              aria-label="Close modal"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Comparison Matrix Table */}
        <div className="flex-1 overflow-auto p-6">
          {buildings.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <Building2 className="w-12 h-12 mx-auto text-[#C4B5A5]/40" />
              <h3 className="text-lg font-heading font-bold text-[#F5EFE8]">No Buildings Selected for Comparison</h3>
              <p className="text-xs text-[#C4B5A5] max-w-sm mx-auto">
                Select buildings from the catalog to compare their share prices, yields, and ledger accounts side by side.
              </p>
            </div>
          ) : (
            <div className={`grid gap-6 grid-cols-1 ${
              buildings.length === 1 ? 'md:grid-cols-1 max-w-md mx-auto' :
              buildings.length === 2 ? 'md:grid-cols-2' :
              'md:grid-cols-3'
            }`}>
              {buildings.map((b) => (
                <div
                  key={b.id}
                  className="relative rounded-2xl border border-[#594333] bg-[#2B1E17] p-5 flex flex-col justify-between space-y-5 shadow-lg group"
                >
                  {/* Remove Button */}
                  <button
                    type="button"
                    onClick={() => onRemoveFromCompare(b.id)}
                    className="absolute top-3 right-3 z-10 rounded-full bg-black/60 p-1.5 text-white/70 hover:bg-black hover:text-white transition-colors cursor-pointer"
                    title="Remove from comparison"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>

                  <div className="space-y-4">
                    {/* Image & Status */}
                    <div className="relative aspect-[16/10] overflow-hidden rounded-xl bg-black/50">
                      <KrezImage
                        src={b.image}
                        alt={b.name}
                        className="h-full w-full object-cover transition-transform duration-base group-hover:scale-105"
                      />
                      <span className="absolute top-2.5 left-2.5 rounded-pill bg-[#211711]/90 px-2.5 py-0.5 text-[10px] font-bold text-[#C49A6C] backdrop-blur-xs border border-[#594333]">
                        {b.status}
                      </span>
                    </div>

                    {/* Title & Location */}
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-[#C49A6C]">
                        {b.location}
                      </p>
                      <h3 className="mt-1 text-lg font-heading font-bold text-[#F5EFE8] leading-snug">
                        {b.name}
                      </h3>
                    </div>

                    {/* Metric Rows */}
                    <div className="divide-y divide-[#594333] border-y border-[#594333] text-xs font-mono">
                      <div className="py-2.5 flex justify-between items-center">
                        <span className="text-[#C4B5A5]">Share Price:</span>
                        <span className="font-bold text-[#F5EFE8]">{b.sharePrice}</span>
                      </div>
                      <div className="py-2.5 flex justify-between items-center">
                        <span className="text-[#C4B5A5]">Projected Yield:</span>
                        <span className="font-bold text-[#C49A6C]">{b.projectedYield}</span>
                      </div>
                      <div className="py-2.5 flex justify-between items-center">
                        <span className="text-[#C4B5A5]">Monthly Rent:</span>
                        <span className="font-bold text-[#F5EFE8]">{b.monthlyRent}</span>
                      </div>
                      <div className="py-2.5 flex justify-between items-center">
                        <span className="text-[#C4B5A5]">Annual Rent:</span>
                        <span className="font-bold text-[#F5EFE8]">{b.annualRent}</span>
                      </div>
                      <div className="py-2.5 flex justify-between items-center">
                        <span className="text-[#C4B5A5]">Occupancy Rate:</span>
                        <span className="font-bold text-[#F5EFE8]">{b.occupancy}</span>
                      </div>
                      <div className="py-2.5 flex justify-between items-center">
                        <span className="text-[#C4B5A5]">Funding Status:</span>
                        <span className="font-bold text-[#C49A6C]">{b.funded}% funded</span>
                      </div>
                      <div className="py-2.5 flex justify-between items-center">
                        <span className="text-[#C4B5A5]">Net Distributable:</span>
                        <span className="font-bold text-[#C49A6C]">{b.netIncome}</span>
                      </div>
                    </div>

                    {/* Itemized Costs Preview */}
                    <div className="rounded-xl bg-[#35251C] border border-[#594333] p-3 text-[11px] space-y-1.5 text-[#C4B5A5]">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-[#F5EFE8] block">Operating Costs</span>
                      {b.costs.slice(0, 3).map((c) => (
                        <div key={c.id} className="flex justify-between items-center font-mono">
                          <span className="truncate pr-2">{c.label}</span>
                          <span className="text-[#C4B5A5]">&minus;{c.amount}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Action CTAs */}
                  <div className="space-y-2 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onAcquireBuilding(b);
                      }}
                      className="w-full py-3 px-4 rounded-pill bg-[#C49A6C] hover:bg-[#d4ac7d] text-xs font-semibold tracking-wider uppercase text-[#211711] transition-all shadow-md cursor-pointer flex items-center justify-center gap-1.5 font-bold"
                    >
                      <Coins className="w-3.5 h-3.5 text-[#211711]" />
                      <span>Acquire Shares</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onSelectBuilding(b.id);
                      }}
                      className="w-full py-2 px-4 rounded-pill border border-[#594333] bg-[#35251C] hover:bg-[#403025] text-xs font-semibold tracking-wider uppercase text-[#F5EFE8] transition-colors cursor-pointer"
                    >
                      View Full Dossier &rarr;
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
