import React, { useState } from 'react';
import { Building2, ArrowRight } from 'lucide-react';
import { PortalProperty } from '../types';
import { formatEuro } from '../utils/format';

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
  const statusLabel =
    property.status === 'funded'
      ? 'Fully funded'
      : property.status === 'upcoming'
      ? 'Upcoming'
      : 'Open for subscription';

  return (
    <button
      type="button"
      onClick={() => onSelect(property)}
      className="portal-card overflow-hidden text-left flex flex-col hover:border-[#C5A880]/70 transition-colors group"
    >
      <div className="relative h-44 w-full bg-[#152E54] overflow-hidden">
        {heroImage && !imgFailed ? (
          <img
            src={heroImage}
            alt={property.title}
            referrerPolicy="no-referrer"
            onError={() => setImgFailed(true)}
            className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-[#102442] to-[#152E54] text-[#C5A880] px-4 text-center">
            <Building2 className="w-8 h-8 opacity-80" />
            <span className="text-xs font-medium text-[#8EA7C7]">{property.location}</span>
          </div>
        )}
      </div>

      <div className="p-4 sm:p-5 flex-1 flex flex-col gap-3 w-full">
        <div>
          <div className="text-xs text-[#8EA7C7] flex items-center gap-1.5 flex-wrap">
            <span>{property.location}</span>
            <span aria-hidden="true">·</span>
            <span>{property.type}</span>
            <span aria-hidden="true">·</span>
            <span className={property.status === 'funded' ? 'text-[#34D399]' : 'text-[#C5A880]'}>
              {statusLabel}
            </span>
          </div>
          <h3 className="mt-1.5 text-base font-semibold text-white group-hover:text-[#C5A880] transition-colors">
            {property.title}
          </h3>
        </div>

        <div className="mt-auto space-y-2 pt-2 border-t border-[#1D3860]">
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <div className="text-[#8EA7C7]">Target net yield</div>
              <div className="mt-0.5 text-sm font-bold text-[#C5A880] portal-tabular">
                {property.projectedYield.toFixed(1)}% p.a.
              </div>
            </div>
            <div>
              <div className="text-[#8EA7C7]">Share price</div>
              <div className="mt-0.5 text-sm font-bold text-white portal-tabular">
                {formatEuro(property.tokenPrice)}
              </div>
            </div>
          </div>

          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#8EA7C7]">Funding progress</span>
              <span className="font-semibold text-white portal-tabular">{progress}%</span>
            </div>
            <div className="portal-progress-track">
              <div className="portal-progress-fill" style={{ width: `${progress}%` }} />
            </div>
          </div>

          <div className="pt-1 flex items-center justify-between text-xs font-semibold text-[#C5A880]">
            <span>Inspect dossier &amp; subscribe</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>
      </div>
    </button>
  );
};
