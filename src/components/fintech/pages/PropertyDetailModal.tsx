import React, { useState, useMemo } from 'react';
import {
  X, MapPin, Building2, TrendingUp, ShieldCheck, FileText,
  DollarSign, CheckCircle2, ChevronRight, Download, Eye, ExternalLink,
  Layers, Lock, CreditCard, ArrowRight, Info
} from 'lucide-react';
import { Property } from '../../../types/property';
import { useAuth } from '../../../lib/auth';
import { useToast } from '../../../context/ToastContext';
import { ledger } from '../../../lib/ledger';
import { formatCurrency } from '../../../lib/utils';

interface PropertyDetailModalProps {
  property: Property | null;
  isOpen: boolean;
  onClose: () => void;
  onInvestSuccess?: () => void;
}

export const PropertyDetailModal: React.FC<PropertyDetailModalProps> = ({
  property,
  isOpen,
  onClose,
  onInvestSuccess,
}) => {
  const { user, refreshUser } = useAuth();
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<'overview' | 'financials' | 'documents' | 'rental_history' | 'map'>('overview');
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  // Investment panel state
  const [tokenQuantity, setTokenQuantity] = useState<number>(10);
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'ach' | 'usdc'>('usdc');
  const [isConfirmationModalOpen, setIsConfirmationModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Legal checkboxes
  const [accreditationChecked, setAccreditationChecked] = useState(false);
  const [riskDisclosureChecked, setRiskDisclosureChecked] = useState(false);
  const [termsChecked, setTermsChecked] = useState(false);

  if (!isOpen || !property) return null;

  const tokenPrice = property.tokenPrice || 364;
  const subtotal = tokenQuantity * tokenPrice;
  const platformFee = Math.round(subtotal * 0.005); // 0.5% institutional custodial fee
  const totalDue = subtotal + platformFee;
  const estimatedAnnualPayout = (subtotal * (property.estimatedAnnualYield / 100));
  const estimatedMonthlyPayout = estimatedAnnualPayout / 12;

  const handleInvest = async () => {
    setIsSubmitting(true);
    try {
      if (user?.id) {
        await ledger.executeInvestment(user.id, property.id, tokenQuantity, {
          paymentMethod,
        });
      }
      if (refreshUser) await refreshUser();
      toast.success(`Successfully invested in ${tokenQuantity} tokens of ${property.title}!`);
      setIsConfirmationModalOpen(false);
      if (onInvestSuccess) onInvestSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to complete transaction.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const images = property.images && property.images.length > 0
    ? property.images
    : [
        'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1200&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=1200&auto=format&fit=crop',
      ];

  const occupancyRate = (property as any).occupancyRate || 98;
  const spvEntity = property.spvEntityName || `SCI ${property.title.split(' ')[0]} PATRIMOINE LUXE`;

  return (
    <>
      <div
        role="dialog"
        aria-modal="true"
        className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/75 backdrop-blur-md overflow-y-auto"
        onClick={onClose}
      >
        <div
          className="w-full max-w-[1240px] my-6 rounded-[12px] bg-white dark:bg-[#111A2C] border border-[#E2E8F0] dark:border-[#1E293B] shadow-2xl overflow-hidden text-[#0F172A] dark:text-[#E2E8F0] flex flex-col max-h-[92vh]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header Bar */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-[#E2E8F0] dark:border-[#1E293B] bg-[#F8FAFC] dark:bg-[#0B1220]">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-[#0F4C81]/10 text-[#0F4C81] dark:text-[#14B8A6] text-[12px] font-semibold">
                ERC-3643 Tokenized Asset
              </span>
              <span className="text-[12px] text-[#64748B] dark:text-[#94A3B8]">ID: {property.id}</span>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-[8px] text-[#64748B] dark:text-[#94A3B8] hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
            >
              <X className="w-5 h-5" strokeWidth={1.5} />
            </button>
          </div>

          {/* Modal Scrollable Container */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
            {/* Gallery Hero (480px) */}
            <div className="relative h-[320px] sm:h-[480px] w-full rounded-[12px] overflow-hidden bg-black">
              <img
                src={images[selectedImageIndex] || images[0]}
                alt={property.title}
                className="w-full h-full object-cover transition-all duration-300"
              />
              {/* Photo thumbnails strip */}
              <div className="absolute bottom-4 left-4 right-4 flex items-center gap-2 overflow-x-auto pb-1">
                {images.map((img, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSelectedImageIndex(idx)}
                    className={`w-16 h-12 rounded-[6px] overflow-hidden shrink-0 border-2 transition-all ${
                      selectedImageIndex === idx ? 'border-white scale-105' : 'border-transparent opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img src={img} alt="thumbnail" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </div>

            {/* Stat Strip (Valuation, Yield, Occupancy, SPV) */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 rounded-[12px] bg-[#F8FAFC] dark:bg-[#0B1220] border border-[#E2E8F0] dark:border-[#1E293B]">
              <div>
                <span className="text-[12px] text-[#64748B] dark:text-[#94A3B8] block">Valuation</span>
                <span className="text-[18px] font-bold tabular-nums text-[#0F172A] dark:text-[#E2E8F0]">
                  {formatCurrency(property.targetAmount)}
                </span>
              </div>
              <div>
                <span className="text-[12px] text-[#64748B] dark:text-[#94A3B8] block">Projected Yield</span>
                <span className="text-[18px] font-bold tabular-nums text-[#16A34A]">
                  {property.estimatedAnnualYield}% p.a.
                </span>
              </div>
              <div>
                <span className="text-[12px] text-[#64748B] dark:text-[#94A3B8] block">Occupancy Rate</span>
                <span className="text-[18px] font-bold tabular-nums text-[#0F172A] dark:text-[#E2E8F0]">
                  {occupancyRate}% (Tenant Leased)
                </span>
              </div>
              <div>
                <span className="text-[12px] text-[#64748B] dark:text-[#94A3B8] block">SPV Legal Entity</span>
                <span className="text-[14px] font-semibold truncate block text-[#0F172A] dark:text-[#E2E8F0]">
                  {spvEntity}
                </span>
              </div>
            </div>

            {/* Main Content Layout: Tabs (Left 7/12) + Sticky Invest Panel (Right 360px) */}
            <div className="flex flex-col lg:flex-row gap-6 items-start">
              {/* Left Column: Tabs Navigation & Tab Panels */}
              <div className="flex-1 w-full space-y-4">
                {/* Tabs bar */}
                <div className="flex items-center gap-1 border-b border-[#E2E8F0] dark:border-[#1E293B] overflow-x-auto pb-1">
                  {[
                    { id: 'overview', label: 'Overview' },
                    { id: 'financials', label: 'Financials' },
                    { id: 'documents', label: 'Documents' },
                    { id: 'rental_history', label: 'Rental History' },
                    { id: 'map', label: 'Map & Area' },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveTab(tab.id as any)}
                      className={`px-4 py-2.5 text-[14px] font-semibold border-b-2 transition-all whitespace-nowrap ${
                        activeTab === tab.id
                          ? 'border-[#0F4C81] dark:border-[#14B8A6] text-[#0F4C81] dark:text-[#14B8A6]'
                          : 'border-transparent text-[#64748B] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-[#E2E8F0]'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* Tab: Overview */}
                {activeTab === 'overview' && (
                  <div className="space-y-4 text-[14px] leading-relaxed">
                    <h3 className="text-[18px] font-semibold text-[#0F172A] dark:text-[#E2E8F0]">
                      {property.title}
                    </h3>
                    <p className="text-[#64748B] dark:text-[#94A3B8]">
                      {property.description ||
                        `This prime institutional real estate asset represents an exceptional luxury property located in ${property.location}. Managed by our premier asset management division, the property generates strong, predictable rental returns backed by high-net-worth residential leases.`}
                    </p>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
                      <div className="p-3 rounded-[8px] bg-[#F8FAFC] dark:bg-[#0B1220] border border-[#E2E8F0] dark:border-[#1E293B]">
                        <span className="text-[12px] text-[#64748B] dark:text-[#94A3B8] block">Gross Living Area</span>
                        <span className="font-semibold text-[14px] tabular-nums">{property.surfaceAreaM2 || 340} m²</span>
                      </div>
                      <div className="p-3 rounded-[8px] bg-[#F8FAFC] dark:bg-[#0B1220] border border-[#E2E8F0] dark:border-[#1E293B]">
                        <span className="text-[12px] text-[#64748B] dark:text-[#94A3B8] block">Bedrooms / Baths</span>
                        <span className="font-semibold text-[14px]">{property.bedrooms || 5} Bed / {property.bathrooms || 5} Bath</span>
                      </div>
                      <div className="p-3 rounded-[8px] bg-[#F8FAFC] dark:bg-[#0B1220] border border-[#E2E8F0] dark:border-[#1E293B]">
                        <span className="text-[12px] text-[#64748B] dark:text-[#94A3B8] block">Token Total Supply</span>
                        <span className="font-semibold text-[14px] tabular-nums">{property.totalTokens || 10000}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Tab: Financials */}
                {activeTab === 'financials' && (
                  <div className="space-y-4">
                    <h4 className="text-[16px] font-semibold">Annual Pro-Forma Operating Statement</h4>
                    <div className="space-y-2 p-4 rounded-[8px] bg-[#F8FAFC] dark:bg-[#0B1220] border border-[#E2E8F0] dark:border-[#1E293B] text-[14px]">
                      <div className="flex justify-between py-1 border-b border-[#E2E8F0] dark:border-[#1E293B]">
                        <span className="text-[#64748B] dark:text-[#94A3B8]">Gross Scheduled Rent (GSR)</span>
                        <span className="font-semibold tabular-nums">€{Math.round((property.targetAmount || 1000000) * 0.115).toLocaleString()} / yr</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-[#E2E8F0] dark:border-[#1E293B]">
                        <span className="text-[#64748B] dark:text-[#94A3B8]">Property Management & Concierge (8%)</span>
                        <span className="text-[#DC2626] tabular-nums">-€{Math.round((property.targetAmount || 1000000) * 0.0092).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-[#E2E8F0] dark:border-[#1E293B]">
                        <span className="text-[#64748B] dark:text-[#94A3B8]">Capital Expenditure Reserve (2%)</span>
                        <span className="text-[#DC2626] tabular-nums">-€{Math.round((property.targetAmount || 1000000) * 0.0023).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-[#E2E8F0] dark:border-[#1E293B]">
                        <span className="text-[#64748B] dark:text-[#94A3B8]">Comprehensive Insurance & Taxes</span>
                        <span className="text-[#DC2626] tabular-nums">-€{Math.round((property.targetAmount || 1000000) * 0.0035).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between py-2 font-bold text-[16px] text-[#16A34A]">
                        <span>Net Operating Income (NOI to Investors)</span>
                        <span className="tabular-nums">
                          €{Math.round((property.targetAmount || 1000000) * (property.estimatedAnnualYield / 100)).toLocaleString()} / yr
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Tab: Documents */}
                {activeTab === 'documents' && (
                  <div className="space-y-3">
                    {[
                      { name: 'Property Deed & Title Registry.pdf', size: '3.8 MB', date: '2026-01-15' },
                      { name: 'SPV Special Purpose Vehicle Articles.pdf', size: '2.1 MB', date: '2026-01-20' },
                      { name: 'Independent RICS Valuation Appraisal.pdf', size: '6.4 MB', date: '2026-02-05' },
                      { name: 'Allianz Comprehensive Property Insurance.pdf', size: '1.2 MB', date: '2026-02-12' },
                    ].map((doc, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-3.5 rounded-[8px] bg-[#F8FAFC] dark:bg-[#0B1220] border border-[#E2E8F0] dark:border-[#1E293B]"
                      >
                        <div className="flex items-center gap-3">
                          <FileText className="w-5 h-5 text-[#0F4C81] dark:text-[#14B8A6]" strokeWidth={1.5} />
                          <div>
                            <div className="text-[14px] font-medium">{doc.name}</div>
                            <div className="text-[12px] text-[#64748B] dark:text-[#94A3B8]">{doc.size} • {doc.date}</div>
                          </div>
                        </div>
                        <button
                          onClick={() => toast.info(`Downloading verified dossier: ${doc.name}`)}
                          className="p-2 rounded-[8px] border border-[#E2E8F0] dark:border-[#1E293B] hover:bg-white dark:hover:bg-[#111A2C] transition-colors"
                        >
                          <Download className="w-4 h-4" strokeWidth={1.5} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Tab: Rental History */}
                {activeTab === 'rental_history' && (
                  <div className="space-y-3">
                    <div className="p-4 rounded-[8px] bg-[#F8FAFC] dark:bg-[#0B1220] border border-[#E2E8F0] dark:border-[#1E293B]">
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-[14px] font-semibold">Active Tenant Lease Contract</span>
                        <span className="px-2 py-0.5 rounded-full bg-[#16A34A]/10 text-[#16A34A] text-[11px] font-semibold">
                          Active · 36 Months Fixed
                        </span>
                      </div>
                      <div className="text-[12px] text-[#64748B] dark:text-[#94A3B8] space-y-1">
                        <div>Corporate Lease with European Diplomatic Mission</div>
                        <div>Monthly Rent Deposited in EUR to CaixaBank Escrow Account</div>
                        <div>Indexation: Consumer Price Index (Insee IRL) annual revision</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Tab: Map */}
                {activeTab === 'map' && (
                  <div className="space-y-3">
                    <div className="h-64 rounded-[8px] bg-[#E2E8F0] dark:bg-[#0B1220] flex items-center justify-center border border-[#E2E8F0] dark:border-[#1E293B] text-center p-4">
                      <div>
                        <MapPin className="w-8 h-8 text-[#0F4C81] dark:text-[#14B8A6] mx-auto mb-2" strokeWidth={1.5} />
                        <div className="font-semibold text-[14px]">{property.location}</div>
                        <div className="text-[12px] text-[#64748B] dark:text-[#94A3B8] mt-1">
                          GPS Coordinates: 48.8835° N, 2.2684° E
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column: Sticky 360px Invest Panel */}
              <div className="w-full lg:w-[360px] shrink-0 sticky top-4 p-5 rounded-[12px] bg-white dark:bg-[#111A2C] border border-[#E2E8F0] dark:border-[#1E293B] shadow-[0_1px_3px_rgba(0,0,0,0.06)] space-y-4">
                <div className="border-b border-[#E2E8F0] dark:border-[#1E293B] pb-3">
                  <div className="text-[12px] text-[#64748B] dark:text-[#94A3B8]">Investment Desk</div>
                  <div className="text-[20px] font-bold text-[#0F172A] dark:text-[#E2E8F0] tabular-nums">
                    €{tokenPrice} <span className="text-[13px] font-normal text-[#64748B] dark:text-[#94A3B8]">/ token</span>
                  </div>
                </div>

                {/* Token quantity input */}
                <div className="space-y-1.5">
                  <label className="text-[12px] font-medium text-[#64748B] dark:text-[#94A3B8] flex justify-between">
                    <span>Number of Tokens</span>
                    <span className="font-semibold text-[#0F172A] dark:text-[#E2E8F0]">{tokenQuantity} units</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={1}
                      max={1000}
                      value={tokenQuantity}
                      onChange={(e) => setTokenQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                      className="flex-1 px-3 py-2 rounded-[8px] border border-[#E2E8F0] dark:border-[#1E293B] bg-transparent text-[14px] tabular-nums font-semibold focus:outline-none focus:ring-2 focus:ring-[#0F4C81] dark:focus:ring-[#14B8A6]"
                    />
                    <div className="flex gap-1">
                      {[10, 50, 100].map((quick) => (
                        <button
                          key={quick}
                          type="button"
                          onClick={() => setTokenQuantity(quick)}
                          className="px-2 py-1.5 rounded-[6px] border border-[#E2E8F0] dark:border-[#1E293B] text-[11px] font-medium hover:bg-[#F8FAFC] dark:hover:bg-[#0B1220]"
                        >
                          +{quick}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Payment Method Selector */}
                <div className="space-y-1.5">
                  <label className="text-[12px] font-medium text-[#64748B] dark:text-[#94A3B8]">
                    Settlement Method
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[
                      { id: 'usdc', label: 'USDC' },
                      { id: 'ach', label: 'SEPA/ACH' },
                      { id: 'card', label: 'Card' },
                    ].map((method) => (
                      <button
                        key={method.id}
                        type="button"
                        onClick={() => setPaymentMethod(method.id as any)}
                        className={`py-2 px-1 text-center text-[12px] font-medium rounded-[8px] border transition-colors ${
                          paymentMethod === method.id
                            ? 'border-[#0F4C81] dark:border-[#14B8A6] bg-[#0F4C81]/10 dark:bg-[#14B8A6]/10 text-[#0F4C81] dark:text-[#14B8A6] font-semibold'
                            : 'border-[#E2E8F0] dark:border-[#1E293B] hover:bg-[#F8FAFC] dark:hover:bg-[#0B1220]'
                        }`}
                      >
                        {method.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Calculation breakdown */}
                <div className="p-3 rounded-[8px] bg-[#F8FAFC] dark:bg-[#0B1220] border border-[#E2E8F0] dark:border-[#1E293B] space-y-1.5 text-[12px]">
                  <div className="flex justify-between">
                    <span className="text-[#64748B] dark:text-[#94A3B8]">Token Subtotal</span>
                    <span className="tabular-nums font-medium">{formatCurrency(subtotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#64748B] dark:text-[#94A3B8]">Custodial Fee (0.5%)</span>
                    <span className="tabular-nums font-medium">{formatCurrency(platformFee)}</span>
                  </div>
                  <div className="flex justify-between pt-1 border-t border-[#E2E8F0] dark:border-[#1E293B] font-bold text-[14px]">
                    <span>Total Investment</span>
                    <span className="tabular-nums text-[#0F4C81] dark:text-[#14B8A6]">
                      {formatCurrency(totalDue)}
                    </span>
                  </div>
                  <div className="pt-2 text-[11px] text-[#16A34A] flex justify-between font-medium">
                    <span>Est. Annual Dividends</span>
                    <span className="tabular-nums">+{formatCurrency(estimatedAnnualPayout)} / yr</span>
                  </div>
                </div>

                {/* Primary CTA */}
                <button
                  type="button"
                  onClick={() => setIsConfirmationModalOpen(true)}
                  className="w-full py-3 px-4 rounded-[8px] bg-[#0F4C81] hover:bg-[#0F4C81]/90 text-white text-[14px] font-semibold transition-all shadow-[0_1px_3px_rgba(0,0,0,0.06)] cursor-pointer flex items-center justify-center gap-2"
                >
                  Invest {formatCurrency(totalDue)} <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Modal with Legal Checkboxes */}
      {isConfirmationModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
        >
          <div
            className="w-full max-w-[500px] rounded-[12px] bg-white dark:bg-[#111A2C] border border-[#E2E8F0] dark:border-[#1E293B] shadow-2xl p-6 text-[#0F172A] dark:text-[#E2E8F0] space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#E2E8F0] dark:border-[#1E293B] pb-3">
              <h3 className="text-[16px] font-semibold">Confirm Fractional Acquisition</h3>
              <button
                onClick={() => setIsConfirmationModalOpen(false)}
                className="p-1 rounded text-[#64748B] hover:bg-black/5"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3.5 rounded-[8px] bg-[#F8FAFC] dark:bg-[#0B1220] border border-[#E2E8F0] dark:border-[#1E293B] space-y-2 text-[12px]">
              <div className="flex justify-between">
                <span className="text-[#64748B] dark:text-[#94A3B8]">Target Asset:</span>
                <span className="font-semibold">{property.title}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#64748B] dark:text-[#94A3B8]">Token Allocation:</span>
                <span className="font-semibold tabular-nums">{tokenQuantity} units (€{tokenPrice}/token)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#64748B] dark:text-[#94A3B8]">Settlement:</span>
                <span className="font-semibold uppercase">{paymentMethod}</span>
              </div>
              <div className="flex justify-between font-bold text-[14px] pt-1 border-t border-[#E2E8F0] dark:border-[#1E293B]">
                <span>Total Settlement:</span>
                <span className="tabular-nums text-[#0F4C81] dark:text-[#14B8A6]">{formatCurrency(totalDue)}</span>
              </div>
            </div>

            {/* Legal Checkboxes */}
            <div className="space-y-3 pt-2 text-[12px]">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={accreditationChecked}
                  onChange={(e) => setAccreditationChecked(e.target.checked)}
                  className="mt-0.5 rounded text-[#0F4C81] focus:ring-[#0F4C81]"
                />
                <span className="text-[#64748B] dark:text-[#94A3B8]">
                  I certify that I meet the qualification requirements and hold legal authorization to acquire security tokens.
                </span>
              </label>

              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={riskDisclosureChecked}
                  onChange={(e) => setRiskDisclosureChecked(e.target.checked)}
                  className="mt-0.5 rounded text-[#0F4C81] focus:ring-[#0F4C81]"
                />
                <span className="text-[#64748B] dark:text-[#94A3B8]">
                  I understand that fractional real estate investments carry market risks and illiquidity provisions outlined in the SPV offering circular.
                </span>
              </label>

              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={termsChecked}
                  onChange={(e) => setTermsChecked(e.target.checked)}
                  className="mt-0.5 rounded text-[#0F4C81] focus:ring-[#0F4C81]"
                />
                <span className="text-[#64748B] dark:text-[#94A3B8]">
                  I agree to the Digital Token Subscription Agreement and platform Escrow Custody Terms.
                </span>
              </label>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E2E8F0] dark:border-[#1E293B]">
              <button
                type="button"
                onClick={() => setIsConfirmationModalOpen(false)}
                className="px-4 py-2 rounded-[8px] border border-[#E2E8F0] dark:border-[#1E293B] text-[14px] font-medium hover:bg-[#F8FAFC] dark:hover:bg-[#0B1220]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmitting || !accreditationChecked || !riskDisclosureChecked || !termsChecked}
                onClick={handleInvest}
                className="px-5 py-2 rounded-[8px] bg-[#0F4C81] hover:bg-[#0F4C81]/90 text-white text-[14px] font-semibold disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {isSubmitting ? 'Processing Transaction...' : 'Authorize Investment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
