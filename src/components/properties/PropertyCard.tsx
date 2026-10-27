import React, { useState } from 'react';
import { Property } from '../../types/property';
import { formatCurrency, formatPercent } from '../../lib/utils';
import { ArrowRight, CheckCircle2, Crown, Clock, FileText } from 'lucide-react';
import { useAuth } from '../../lib/auth';
import { ledger } from '../../lib/ledger';
import { PropertyBrochureModal } from './PropertyBrochureModal';

interface PropertyCardProps {
  property: Property;
  onSelect: (property: Property) => void;
  onInvest?: (property: Property) => void;
  onOpenBrochure?: (property: Property) => void;
  userInvestmentTokens?: number;
  userInvestedAmount?: number;
  isUserOccupied?: boolean;
}

export const PropertyCard: React.FC<PropertyCardProps> = ({ 
  property, 
  onSelect, 
  onInvest,
  onOpenBrochure,
  userInvestmentTokens,
  userInvestedAmount,
  isUserOccupied
}) => {
  const { user } = useAuth();
  const [isInternalBrochureOpen, setIsInternalBrochureOpen] = useState(false);

  const handleOpenBrochure = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onOpenBrochure) {
      onOpenBrochure(property);
    } else {
      setIsInternalBrochureOpen(true);
    }
  };
  
  // Check if current user has an investment in this property
  const userInvestments = user ? ledger.getInvestments(user.id) : [];
  const existingInvestment = userInvestments.find(inv => inv.propertyId === property.id);
  const tokensHeld = userInvestmentTokens ?? existingInvestment?.tokensPurchased ?? 0;
  const amountInvested = userInvestedAmount ?? existingInvestment?.totalAmountInvested ?? 0;
  const isOwnedOrOccupied = isUserOccupied || tokensHeld > 0 || (property as any).ownerId === user?.id;

  const fundingPercent = Math.min(100, Math.round((property.fundedAmount / property.targetAmount) * 100));

  // Country Code helper (replaces emojis with clean ISO codes)
  const getCountryCode = (country: string) => {
    const c = country.toLowerCase();
    if (c.includes('france')) return 'FR';
    if (c.includes('spain') || c.includes('esp')) return 'ES';
    if (c.includes('monaco')) return 'MC';
    if (c.includes('mexico')) return 'MX';
    if (c.includes('usa') || c.includes('united states')) return 'US';
    if (c.includes('italy')) return 'IT';
    if (c.includes('portugal')) return 'PT';
    return 'EU';
  };

  const getStatusBadge = () => {
    if (tokensHeld > 0) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#1E3A34]/95 text-[#D4AF37] border border-[#D4AF37]/30 text-[10px] font-semibold tracking-wider uppercase backdrop-blur-md">
          <Crown className="w-3 h-3 text-[#D4AF37]" aria-hidden="true" />
          <span>Holdings · {tokensHeld} Tokens</span>
        </span>
      );
    }

    switch (property.status) {
      case 'funding':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#1C1917]/85 text-white border border-white/15 text-[10px] font-medium tracking-wider uppercase backdrop-blur-md">
            <span className="w-1.5 h-1.5 rounded-full bg-[#1E3A34] animate-pulse" aria-hidden="true" />
            <span>In Funding</span>
          </span>
        );
      case 'funded':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#1E3A34]/90 text-white border border-[#1E3A34] text-[10px] font-medium tracking-wider uppercase backdrop-blur-md">
            <CheckCircle2 className="w-3 h-3 text-[#78C29E]" aria-hidden="true" />
            <span>100% Funded</span>
          </span>
        );
      case 'upcoming':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-stone-900/85 text-stone-200 border border-stone-600/40 text-[10px] font-medium tracking-wider uppercase backdrop-blur-md">
            <Clock className="w-3 h-3" aria-hidden="true" />
            <span>Private Preview</span>
          </span>
        );
      case 'completed':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded bg-[#14221F]/90 text-stone-200 border border-stone-700 text-[10px] font-medium tracking-wider uppercase backdrop-blur-md">
            Returned & Exited
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded bg-stone-900/85 text-stone-200 text-[10px] font-medium uppercase tracking-wider">
            {property.status}
          </span>
        );
    }
  };

  return (
    <article 
      aria-label={`${property.title}, ${property.city}, ${property.country}`}
      className={`property-card flex flex-col group rounded-2xl sm:rounded-3xl bg-white overflow-hidden transition-all duration-300 ${
        isOwnedOrOccupied 
          ? 'border-2 border-[#087F5B] shadow-md ring-2 ring-[#087F5B]/20' 
          : 'border border-[#E4EEEA] hover:border-[#087F5B]/40 shadow-xs hover:shadow-md'
      }`}
    >
      {/* Property Hero Image with Architectural Framing */}
      <div className="relative aspect-[16/10] overflow-hidden bg-[#EAF8F4]">
        <img
          src={property.images[0] || property.bannerImage}
          alt={`Architectural view of ${property.title} in ${property.city}, ${property.country}`}
          width={640}
          height={400}
          loading="lazy"
          className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-103"
          referrerPolicy="no-referrer"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            if (!target.dataset.fallback) {
              target.dataset.fallback = 'true';
              target.src = '/assets/images/hero_real_estate_1791998371047.jpg';
            }
          }}
        />
        
        {/* Subtle Dark Gradient Scrim */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-black/25 pointer-events-none" aria-hidden="true" />

        {/* Top Status Bar */}
        <div className="absolute top-3 left-3 right-3 z-10 flex items-center justify-between gap-2">
          {getStatusBadge()}

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleOpenBrochure}
              aria-label={`View and download official brochure for ${property.title}`}
              className="bg-black/50 hover:bg-[#087F5B] focus-visible:ring-2 focus-visible:ring-white backdrop-blur-md text-white text-[10px] font-semibold px-2.5 py-1 rounded-lg border border-white/20 flex items-center gap-1.5 transition-all cursor-pointer min-h-[30px]"
            >
              <FileText className="w-3 h-3 opacity-90" aria-hidden="true" />
              <span>Brochure</span>
            </button>
            <span className="bg-black/50 backdrop-blur-md text-stone-200 text-[10px] font-semibold px-2.5 py-1 rounded-lg border border-white/20">
              {property.type}
            </span>
          </div>
        </div>

        {/* Bottom Image Overlay: ISO Country Code, Location & Token Ticker */}
        <div className="absolute bottom-3 left-3 right-3 z-10 flex items-center justify-between text-xs text-white">
          <div className="flex items-center gap-2 font-medium drop-shadow-sm truncate">
            <span className="font-mono text-[10px] tracking-widest font-bold px-1.5 py-0.5 rounded-md bg-black/50 border border-white/20 uppercase text-white">
              {getCountryCode(property.country)}
            </span>
            <span className="truncate text-[13px] tracking-wide font-medium">{property.city}, {property.country}</span>
          </div>
          <span className="text-[10px] font-mono tracking-widest bg-black/50 backdrop-blur-md px-2 py-0.5 rounded-md uppercase text-white font-semibold border border-white/20 shrink-0">
            {property.tokenTicker}
          </span>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="p-5 sm:p-6 flex-1 flex flex-col justify-between space-y-4">
        {/* Title and Specs */}
        <div>
          <div className="flex items-center justify-between text-xs text-[#71817D] mb-1.5 font-medium">
            <span className="truncate max-w-[200px]">{property.location}</span>
            {property.surfaceAreaM2 && (
              <span className="font-mono text-[11px] text-[#172B2A] font-semibold shrink-0">{property.surfaceAreaM2} m²</span>
            )}
          </div>

          <h3 className="font-serif text-lg sm:text-xl font-bold text-[#172B2A] leading-snug line-clamp-1">
            <button
              type="button"
              onClick={() => onSelect(property)}
              className="text-left hover:text-[#087F5B] focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-[#087F5B] rounded transition-colors cursor-pointer w-full"
            >
              {property.title}
            </button>
          </h3>

          {/* User Holdings Banner if user has active tokens */}
          {tokensHeld > 0 && (
            <div className="mt-2.5 p-2.5 rounded-xl bg-[#DDF5EC]/70 border border-[#BCE8D7] flex items-center justify-between text-xs">
              <span className="font-bold text-[#075B46] flex items-center gap-1.5">
                <Crown className="w-3.5 h-3.5 text-[#087F5B]" aria-hidden="true" />
                <span>Your Position:</span>
              </span>
              <span className="font-bold text-[#075B46] tabular-nums font-mono">
                {tokensHeld} Tokens ({formatCurrency(amountInvested)})
              </span>
            </div>
          )}
        </div>

        {/* Editorial Funding Progress Indicator */}
        <div className="space-y-1.5 bg-[#F6FAF8] p-3 rounded-xl border border-[#E4EEEA]">
          <div className="flex justify-between items-center text-xs">
            <span className="text-[#71817D]">
              Funded <strong className="text-[#172B2A] font-bold">{formatCurrency(property.fundedAmount)}</strong>
            </span>
            <span className="font-mono text-xs font-bold text-[#087F5B] tabular-nums">{fundingPercent}%</span>
          </div>

          <div 
            className="w-full bg-[#E4EEEA] h-2 rounded-full overflow-hidden"
            role="progressbar"
            aria-valuenow={fundingPercent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Funding progress for ${property.title}: ${fundingPercent}%`}
          >
            <div 
              className="bg-[#087F5B] h-full rounded-full transition-all duration-700"
              style={{ width: `${fundingPercent}%` }}
            />
          </div>

          <div className="flex justify-between items-center text-[10px] text-[#71817D] pt-0.5">
            <span>Target: {formatCurrency(property.targetAmount)}</span>
            <span className="font-mono font-medium">{property.availableTokens} tokens remain</span>
          </div>
        </div>

        {/* Refined Financial Metrics Grid */}
        <div className="grid grid-cols-3 gap-2 py-1">
          {/* 1. Projected Annual Yield */}
          <div className="p-2.5 sm:p-3 rounded-xl bg-[#F6FAF8] border border-[#E4EEEA] flex flex-col justify-between">
            <span className="text-[10px] uppercase tracking-wider text-[#71817D] font-bold block truncate">
              Projected Yield
            </span>
            <span className="font-mono text-base font-bold text-[#087F5B] block tabular-nums my-0.5 truncate">
              {formatPercent(property.monthlyTargetRate || 6.0)}
            </span>
            <span className="text-[10px] text-[#087F5B] block truncate font-medium">
              Pro-Forma Target
            </span>
          </div>

          {/* 2. Projected Term */}
          <div className="p-2.5 sm:p-3 rounded-xl bg-[#F6FAF8] border border-[#E4EEEA] flex flex-col justify-between">
            <span className="text-[10px] uppercase tracking-wider text-[#71817D] font-bold block truncate">
              Time Frame
            </span>
            <span className="font-mono text-base font-bold text-[#172B2A] block tabular-nums my-0.5 truncate">
              {property.durationMonths || 21} Mo.
            </span>
            <span className="text-[10px] text-[#71817D] block truncate font-medium">
              Target Term
            </span>
          </div>

          {/* 3. Minimum Investment */}
          <div className="p-2.5 sm:p-3 rounded-xl bg-[#F6FAF8] border border-[#E4EEEA] flex flex-col justify-between">
            <span className="text-[10px] uppercase tracking-wider text-[#71817D] font-bold block truncate">
              Entry Ticket
            </span>
            <span className="font-mono text-base font-bold text-[#172B2A] block tabular-nums my-0.5 truncate">
              {formatCurrency(property.minimumInvestment)}
            </span>
            <span className="text-[10px] text-[#087F5B] font-bold block truncate">
              100% SPV
            </span>
          </div>
        </div>

        {/* Action Buttons with 44px Minimum Touch Targets & Keyboard Accessibility */}
        <div className="pt-2 flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => onSelect(property)}
            aria-label={`View details for ${property.title}`}
            className="flex-1 min-h-[44px] py-2.5 px-3 rounded-xl border border-[#E4EEEA] hover:border-[#087F5B] focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-[#087F5B] text-[#172B2A] text-xs font-bold flex items-center justify-center cursor-pointer transition-colors bg-white hover:bg-[#F6FAF8] shadow-2xs"
          >
            See Details
          </button>
          
          <button
            type="button"
            onClick={() => onInvest ? onInvest(property) : onSelect(property)}
            aria-label={isOwnedOrOccupied ? `Manage position in ${property.title}` : `Invest now in ${property.title}`}
            className={`flex-1 min-h-[44px] py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-xs transition-all focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-[#087F5B] ${
              isOwnedOrOccupied
                ? 'bg-[#075B46] hover:bg-[#054636] text-white'
                : 'bg-[#087F5B] hover:bg-[#075B46] text-white'
            }`}
          >
            <span>{isOwnedOrOccupied ? 'Manage Asset' : 'Invest Now'}</span>
            <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Property Brochure Modal */}
      {isInternalBrochureOpen && (
        <PropertyBrochureModal
          property={property}
          isOpen={isInternalBrochureOpen}
          onClose={() => setIsInternalBrochureOpen(false)}
        />
      )}
    </article>
  );
};
