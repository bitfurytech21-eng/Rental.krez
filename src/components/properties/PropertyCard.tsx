import React from 'react';
import { Property } from '../../types/property';
import { formatCurrency, formatPercent } from '../../lib/utils';
import { MapPin, TrendingUp, Users, Calendar, ArrowRight, ShieldCheck, CheckCircle2, Crown, Clock } from 'lucide-react';
import { useAuth } from '../../lib/auth';
import { ledger } from '../../lib/ledger';

interface PropertyCardProps {
  property: Property;
  onSelect: (property: Property) => void;
  onInvest?: (property: Property) => void;
  userInvestmentTokens?: number;
  userInvestedAmount?: number;
  isUserOccupied?: boolean;
}

export const PropertyCard: React.FC<PropertyCardProps> = ({ 
  property, 
  onSelect, 
  onInvest,
  userInvestmentTokens,
  userInvestedAmount,
  isUserOccupied
}) => {
  const { user } = useAuth();
  
  // Check if current user has an investment in this property
  const userInvestments = user ? ledger.getInvestments(user.id) : [];
  const existingInvestment = userInvestments.find(inv => inv.propertyId === property.id);
  const tokensHeld = userInvestmentTokens ?? existingInvestment?.tokensPurchased ?? 0;
  const amountInvested = userInvestedAmount ?? existingInvestment?.totalAmountInvested ?? 0;
  const isOwnedOrOccupied = isUserOccupied || tokensHeld > 0 || (property as any).ownerId === user?.id;

  const fundingPercent = Math.min(100, Math.round((property.fundedAmount / property.targetAmount) * 100));

  // Country Flag helper
  const getCountryFlag = (country: string) => {
    const c = country.toLowerCase();
    if (c.includes('france')) return '🇫🇷';
    if (c.includes('spain') || c.includes('esp')) return '🇪🇸';
    if (c.includes('monaco')) return '🇲🇨';
    if (c.includes('mexico')) return '🇲🇽';
    if (c.includes('usa') || c.includes('united states')) return '🇺🇸';
    if (c.includes('italy')) return '🇮🇹';
    if (c.includes('portugal')) return '🇵🇹';
    return '🇪🇺';
  };

  const getStatusBadge = () => {
    if (isOwnedOrOccupied) {
      return (
        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-950/90 text-[#B7E36A] border border-[#B7E36A]/50 text-[11px] font-extrabold shadow-sm backdrop-blur-md">
          <Crown className="w-3.5 h-3.5 text-[#B7E36A]" />
          <span>Occupied by You · {tokensHeld} Tokens</span>
        </span>
      );
    }

    switch (property.status) {
      case 'funding':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#142421]/90 text-[#B7E36A] border border-[#B7E36A]/40 text-[11px] font-extrabold backdrop-blur-md shadow-sm">
            <span className="w-2 h-2 rounded-full bg-[#B7E36A] animate-pulse" />
            <span>In Funding</span>
          </span>
        );
      case 'funded':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-slate-900/90 text-slate-200 border border-slate-700 text-[11px] font-bold backdrop-blur-md">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>100% Funded</span>
          </span>
        );
      case 'upcoming':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-amber-950/90 text-amber-300 border border-amber-600/40 text-[11px] font-bold backdrop-blur-md">
            <Clock className="w-3.5 h-3.5" />
            <span>Launching Soon</span>
          </span>
        );
      case 'completed':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full bg-teal-950/90 text-teal-300 border border-teal-500/30 text-[11px] font-bold backdrop-blur-md">
            Returned & Exited
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-slate-900/90 text-white text-[11px] font-medium">
            {property.status}
          </span>
        );
    }
  };

  return (
    <div className={`property-card flex flex-col group rounded-3xl bg-white overflow-hidden transition-all duration-300 ${
      isOwnedOrOccupied 
        ? 'border-2 border-[#27845D] shadow-md ring-2 ring-[#B7E36A]/30' 
        : 'border border-[#E3E8E3] hover:border-[#142421]/40 shadow-xs hover:shadow-xl'
    }`}>
      {/* Property Hero Image with Overlays */}
      <div className="relative aspect-[16/10] overflow-hidden bg-slate-100">
        <img
          src={property.images[0] || property.bannerImage}
          alt={property.title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-104"
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
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/30 pointer-events-none" />

        {/* Top Status Bar */}
        <div className="absolute top-3.5 left-3.5 right-3.5 z-10 flex items-center justify-between gap-2">
          {getStatusBadge()}

          <div className="flex items-center gap-1.5">
            {property.images && property.images.length > 1 && (
              <span className="bg-black/60 backdrop-blur-md text-white text-[10px] font-bold px-2 py-0.5 rounded-full border border-white/20">
                {property.images.length} Photos
              </span>
            )}
            <span className="bg-[#142421]/80 backdrop-blur-md text-[#B7E36A] text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-[#B7E36A]/30">
              {property.type}
            </span>
          </div>
        </div>

        {/* Bottom Image Overlay: Flag, Location & Token Ticker */}
        <div className="absolute bottom-3 left-3.5 right-3.5 z-10 flex items-center justify-between text-xs text-white">
          <div className="flex items-center gap-1.5 font-bold drop-shadow-md truncate">
            <span className="text-base">{getCountryFlag(property.country)}</span>
            <span className="truncate">{property.city}, {property.country}</span>
          </div>
          <span className="text-[10px] font-mono font-bold bg-white/20 backdrop-blur-md px-2 py-0.5 rounded-md uppercase tracking-wider text-white border border-white/20 shrink-0">
            {property.tokenTicker}
          </span>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="p-5 sm:p-6 flex-1 flex flex-col justify-between space-y-4">
        {/* Title and Specs */}
        <div>
          <div className="flex items-center justify-between text-xs text-[#69736F] mb-1">
            <span className="truncate max-w-[200px]">{property.location}</span>
            {property.surfaceAreaM2 && (
              <span className="font-semibold text-[#142421] shrink-0">{property.surfaceAreaM2} m²</span>
            )}
          </div>

          <h3 
            onClick={() => onSelect(property)}
            className="text-lg font-black text-[#142421] leading-tight line-clamp-1 group-hover:text-[#27845D] transition-colors cursor-pointer"
          >
            {property.title}
          </h3>

          {/* User Occupied Banner if user has holding */}
          {isOwnedOrOccupied && (
            <div className="mt-2.5 p-2.5 rounded-xl bg-[#E8F5E9] border border-[#27845D]/30 flex items-center justify-between text-xs">
              <span className="font-bold text-[#142421] flex items-center gap-1.5">
                <Crown className="w-3.5 h-3.5 text-[#27845D]" />
                <span>Your Active Position:</span>
              </span>
              <span className="font-extrabold text-[#27845D] tabular-nums">
                {tokensHeld} Tokens ({formatCurrency(amountInvested)})
              </span>
            </div>
          )}
        </div>

        {/* Reental-style Funding Progress Indicator */}
        <div className="space-y-1.5 bg-[#F6F8F5] p-3 rounded-2xl border border-[#E3E8E3]">
          <div className="flex justify-between items-center text-xs">
            <span className="font-semibold text-[#52605C]">
              Funded: <strong className="text-[#142421]">{formatCurrency(property.fundedAmount)}</strong>
            </span>
            <span className="font-black text-[#142421] tabular-nums">{fundingPercent}%</span>
          </div>

          <div className="w-full bg-[#E3E8E3] h-2 rounded-full overflow-hidden">
            <div 
              className="bg-[#27845D] h-full rounded-full transition-all duration-700"
              style={{ width: `${fundingPercent}%` }}
            />
          </div>

          <div className="flex justify-between items-center text-[10px] text-[#69736F] pt-0.5">
            <span>Target: {formatCurrency(property.targetAmount)}</span>
            <span className="font-medium">{property.availableTokens} tokens left</span>
          </div>
        </div>

        {/* Signature Reental 4-Box Financial Metrics Grid */}
        <div className="grid grid-cols-2 gap-2.5 py-1">
          {/* 1. Annual Yield / APY */}
          <div className="p-3 rounded-2xl bg-[#F6F8F5] border border-[#E3E8E3]">
            <span className="text-[10px] uppercase font-bold text-[#69736F] block tracking-wide">
              Annual Return (APY)
            </span>
            <span className="text-lg font-black text-[#27845D] block tabular-nums mt-0.5">
              {formatPercent(property.estimatedAnnualYield)}
            </span>
            <span className="text-[10px] text-[#69736F] font-medium block">
              Paid Monthly
            </span>
          </div>

          {/* 2. Total Estimated Return */}
          <div className="p-3 rounded-2xl bg-[#F6F8F5] border border-[#E3E8E3]">
            <span className="text-[10px] uppercase font-bold text-[#69736F] block tracking-wide">
              Total Target Return
            </span>
            <span className="text-lg font-black text-[#142421] block tabular-nums mt-0.5">
              {formatPercent(property.totalEstimatedReturn)}
            </span>
            <span className="text-[10px] text-[#69736F] font-medium block">
              {property.durationMonths} Mo. Term
            </span>
          </div>

          {/* 3. Token Price */}
          <div className="p-3 rounded-2xl bg-[#F6F8F5] border border-[#E3E8E3]">
            <span className="text-[10px] uppercase font-bold text-[#69736F] block tracking-wide">
              Token Price
            </span>
            <span className="text-sm font-black text-[#142421] block tabular-nums mt-1">
              {formatCurrency(property.tokenPrice)}
            </span>
            <span className="text-[10px] text-[#69736F] font-medium block">
              Per Fractional Share
            </span>
          </div>

          {/* 4. Minimum Investment */}
          <div className="p-3 rounded-2xl bg-[#F6F8F5] border border-[#E3E8E3]">
            <span className="text-[10px] uppercase font-bold text-[#69736F] block tracking-wide">
              Min. Investment
            </span>
            <span className="text-sm font-black text-[#142421] block tabular-nums mt-1">
              {formatCurrency(property.minimumInvestment)}
            </span>
            <span className="text-[10px] text-emerald-700 font-bold block">
              Ring-Fenced SPV
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-2 grid grid-cols-2 gap-2">
          <button
            onClick={() => onSelect(property)}
            className="btn btn-secondary text-xs font-bold py-2.5 border border-[#E3E8E3] hover:border-[#142421] text-[#142421] rounded-xl flex items-center justify-center cursor-pointer transition-colors"
          >
            See Details
          </button>
          
          <button
            onClick={() => onInvest ? onInvest(property) : onSelect(property)}
            className={`btn btn-primary text-xs font-bold py-2.5 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer shadow-xs transition-all ${
              isOwnedOrOccupied
                ? 'bg-[#27845D] hover:bg-[#1f6b4a] text-white'
                : 'bg-[#142421] hover:bg-[#1E332E] text-white'
            }`}
          >
            <span>{isOwnedOrOccupied ? 'Manage Asset' : 'Invest Now'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
