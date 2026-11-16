import React, { useState } from 'react';
import { Building2, ArrowRight } from 'lucide-react';
import { PortalProperty } from '../types';
import { formatEuro } from '../utils/format';
import { StatusBadge } from './StatusBadge';

interface PropertyCardProps {
  property: PortalProperty;
  onSelect: (property: PortalProperty) => void;
}

export const PropertyCard: React.FC<PropertyCardProps> = ({ property, onSelect }) => {
  const [imgFailed, setImgFailed] = useState(false);
  const progress =
    property.targetAmount > 0
      ? Math.min(100, Math.round((property.fundedAmount / property.targetAmount) * 100))
      : 0;
  const heroImage = property.images?.[0];
  const cityDisplay = property.city || property.location;

  const badgeStatus =
    property.status === 'funded' || property.status === 'active' || property.status === 'funding'
      ? 'completed'
      : 'pending';
  const statusLabel =
    property.status === 'funded'
      ? 'Completed'
      : property.status === 'upcoming'
      ? 'Pending'
      : 'Open';

  return (
    <button
      type="button"
      onClick={() => onSelect(property)}
      className="portal-card text-left flex flex-col gap-4 hover:border-[#6FD8B0]/65 transition-colors group"
    >
      <div className="relative h-44 w-full rounded-[12px] bg-[#172228] overflow-hidden border border-[#1F2C33]">
        {heroImage && !imgFailed ? (
          <img
            src={heroImage}
            alt={property.title}
            referrerPolicy="no-referrer"
            onError={() => setImgFailed(true)}
            className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2 bg-[#172228] text-[#6FD8B0] px-4 text-center">
            <Building2 className="w-8 h-8 opacity-85" />
            <span className="text-xs font-medium text-[#8FA1A8]">{cityDisplay}</span>
          </div>
        )}
      </div>

      <div className="flex-1 flex flex-col gap-3 w-full">
        <div>
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="text-xs text-[#8FA1A8] flex items-center gap-1.5 flex-wrap">
              <span>{cityDisplay}</span>
              <span aria-hidden="true">·</span>
              <span>{property.type}</span>
            </div>
            <StatusBadge status={badgeStatus} label={statusLabel} />
          </div>
          <h3 className="mt-2 text-base font-semibold text-[#F2F5F4] group-hover:text-[#6FD8B0] transition-colors">
            {property.title}
          </h3>
        </div>

        <div className="mt-auto space-y-2.5 pt-3 border-t border-[#1F2C33]">
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <div className="text-[#8FA1A8]">Target yield</div>
              <div className="mt-0.5 text-base font-bold text-[#6FD8B0] portal-tabular">
                {property.projectedYield.toFixed(1)}%
              </div>
            </div>
            <div>
              <div className="text-[#8FA1A8]">Price per share</div>
              <div className="mt-0.5 text-base font-bold text-[#F2F5F4] portal-tabular">
                {formatEuro(property.tokenPrice)}
              </div>
            </div>
          </div>

          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#8FA1A8]">Funding progress</span>
              <span className="font-semibold text-[#F2F5F4] portal-tabular">{progress}%</span>
            </div>
            <div className="portal-progress-track">
              <div className="portal-progress-fill" style={{ width: `${progress}%` }} />
            </div>
          </div>

          <div className="pt-1 flex items-center justify-between text-xs font-semibold text-[#6FD8B0]">
            <span>View property</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>
      </div>
    </button>
  );
};
