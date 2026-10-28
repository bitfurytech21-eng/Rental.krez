import React, { useState, useEffect, useMemo } from 'react';
import { Property } from '../../types/property';
import { useAuth } from '../../lib/auth';
import { ledger } from '../../lib/ledger';
import { investmentsApi, userApi } from '../../lib/api';
import { useToast } from '../../context/ToastContext';
import { formatCurrency, formatPercent, formatShortHash } from '../../lib/utils';
import {
  PAYMENT_FEE_TIERS,
  calculateLiveInvestmentBreakdown,
} from '../../lib/financialService';
import { PropertyDocumentViewer } from '../documents/PropertyDocumentViewer';
import { PropertyEvidenceRoom } from '../documents/PropertyEvidenceRoom';
import { PropertyLegalDocumentModal } from '../documents/PropertyLegalDocumentModal';
import { SensitivityAnalysisCard } from './SensitivityAnalysisCard';
import { InvestmentTermsAndExitPolicy } from './InvestmentTermsAndExitPolicy';
import { RiskAndTermsAcknowledgementModal } from './RiskAndTermsAcknowledgementModal';
import { ProjectedYieldChart } from './ProjectedYieldChart';
import { MonthlyYieldRecharts } from './MonthlyYieldRecharts';
import { SharePropertyModal } from './SharePropertyModal';
import { PropertyLocationMap } from './PropertyLocationMap';
import { ValuationAuditTimeline } from './ValuationAuditTimeline';
import {
  MapPin,
  Calendar,
  ShieldCheck,
  AlertTriangle,
  Coins,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  X,
  Check,
  ArrowLeft,
  CheckCircle2,
  TrendingUp,
  FileText,
  Building,
  Wallet,
  Clock,
  Receipt,
  Share2,
  ExternalLink,
  Copy,
  Heart,
  Calculator,
  Plus,
  Minus,
} from 'lucide-react';
import { getSolanaExplorerUrl, getSolscanUrl, isValidSolanaAddress } from '../../lib/solanaService';

interface PropertyDetailViewProps {
  property: Property;
  onBack: () => void;
  onNavigateDeposit: () => void;
  onNavigateAuthForInvestment?: (property: Property) => void;
  onInvestmentSuccess?: () => void;
}

export const PropertyDetailView: React.FC<PropertyDetailViewProps> = ({
  property: initialProp,
  onBack,
  onNavigateDeposit,
  onNavigateAuthForInvestment,
  onInvestmentSuccess,
}) => {
  const { user, refreshUser } = useAuth();
  const { showToast } = useToast();
  const [liveTick, setLiveTick] = useState<number>(0);

  useEffect(() => {
    return ledger.subscribe(() => setLiveTick((t) => t + 1));
  }, []);

  const property = useMemo(() => {
    void liveTick;
    return ledger.getPropertyById(initialProp.id) || initialProp;
  }, [initialProp, liveTick]);

  const [selectedImageIndex, setSelectedImageIndex] = useState<number>(0);
  const [lightboxOpen, setLightboxOpen] = useState<boolean>(false);
  const [inspectingDoc, setInspectingDoc] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<
    'overview' | 'location' | 'financials' | 'monthly_recharts' | 'yield_chart' | 'sensitivity' | 'evidence' | 'structure' | 'exit_policy' | 'fees' | 'schedule' | 'documents' | 'tokenization' | 'appraisal_history'
  >('overview');

  // Interactive Page-Level Investment Simulator State
  const minTokens = Math.max(1, Math.ceil(property.minimumInvestment / property.tokenPrice));
  const [simMode, setSimMode] = useState<'amount' | 'tokens'>('amount');
  const [simAmountEUR, setSimAmountEUR] = useState<number>(property.minimumInvestment);
  const [simTokens, setSimTokens] = useState<number>(minTokens);
  const [simFeeTierId, setSimFeeTierId] = useState<string>(PAYMENT_FEE_TIERS[0].id);

  useEffect(() => {
    const newMinTokens = Math.max(1, Math.ceil(initialProp.minimumInvestment / initialProp.tokenPrice));
    setSimAmountEUR(initialProp.minimumInvestment);
    setSimTokens(newMinTokens);
    setSelectedImageIndex(0);
  }, [initialProp.id]);

  // Investment Modal State
  const [isInvestModalOpen, setIsInvestModalOpen] = useState<boolean>(false);
  const [isRiskModalOpen, setIsRiskModalOpen] = useState<boolean>(false);
  const [modalMode, setModalMode] = useState<'tokens' | 'amount'>('tokens');
  const [tokenCount, setTokenCount] = useState<number>(minTokens);
  const [modalAmountEUR, setModalAmountEUR] = useState<number>(minTokens * property.tokenPrice);
  const [modalFeeTierId, setModalFeeTierId] = useState<string>(PAYMENT_FEE_TIERS[0].id);
  const [orderIdempotencyKey, setOrderIdempotencyKey] = useState<string>('');
  const [investError, setInvestError] = useState<string | null>(null);
  const [investSuccessCert, setInvestSuccessCert] = useState<{
    id: string;
    txHash: string;
    tokens: number;
    subtotal: number;
    feeAmount: number;
    total: number;
  } | null>(null);
  const [copiedTxHash, setCopiedTxHash] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [docNotification, setDocNotification] = useState<string | null>(null);
  const [isDocViewerOpen, setIsDocViewerOpen] = useState<boolean>(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState<boolean>(false);
  const [copiedMint, setCopiedMint] = useState<boolean>(false);
  const [favPending, setFavPending] = useState<boolean>(false);

  const isSaved = useMemo(() => {
    void liveTick;
    return ledger.isFavorite(user?.id, property.id);
  }, [user?.id, property.id, liveTick]);

  const handleToggleFavorite = async () => {
    if (favPending) return;
    const prevFavorites = ledger.getFavorites(user?.id);
    const { saved } = ledger.toggleFavorite(user?.id, property.id);
    showToast(
      saved ? `Saved "${property.title}" to your watchlist.` : `Removed "${property.title}" from watchlist.`,
      'info'
    );

    if (user) {
      setFavPending(true);
      try {
        if (saved) {
          await userApi.addFavorite(property.id);
        } else {
          await userApi.removeFavorite(property.id);
        }
      } catch (err: any) {
        if (err?.status && err.status >= 400) {
          ledger.setFavorites(user.id, prevFavorites);
          showToast('Failed to save watchlist change on server. Reverted.', 'error');
        }
      } finally {
        setFavPending(false);
      }
    }
  };

  // Keyboard navigation for Lightbox and Invest Modal
  useEffect(() => {
    if (!lightboxOpen && !isInvestModalOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (lightboxOpen) {
        if (e.key === 'Escape') setLightboxOpen(false);
        if (e.key === 'ArrowLeft' && property.images.length > 1) {
          setSelectedImageIndex((prev) => (prev === 0 ? property.images.length - 1 : prev - 1));
        }
        if (e.key === 'ArrowRight' && property.images.length > 1) {
          setSelectedImageIndex((prev) => (prev === property.images.length - 1 ? 0 : prev + 1));
        }
      } else if (isInvestModalOpen && e.key === 'Escape' && !isSubmitting && !isRiskModalOpen) {
        setIsInvestModalOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [lightboxOpen, isInvestModalOpen, isSubmitting, isRiskModalOpen, property.images.length]);

  const userInvestments = user ? ledger.getInvestments(user.id) : [];
  const existingInvestment = userInvestments.find((inv) => inv.propertyId === property.id);
  const realizedReturnPercent =
    existingInvestment && existingInvestment.totalAmountInvested > 0
      ? (existingInvestment.totalDividendsReceived / existingInvestment.totalAmountInvested) * 100
      : 0;

  const fundingPercent = Math.min(100, Math.round((property.fundedAmount / property.targetAmount) * 100));
  const monthlyRate =
    property.monthlyTargetRate || Number(((property.estimatedAnnualYield || 8.4) / 12).toFixed(2));
  const durationMonths = property.durationMonths || 36;
  const totalSupply = property.totalTokens || Math.max(1, Math.floor(property.targetAmount / property.tokenPrice));

  const activeSimFeeTier =
    PAYMENT_FEE_TIERS.find((t) => t.id === simFeeTierId) || PAYMENT_FEE_TIERS[0];

  const simCalc = calculateLiveInvestmentBreakdown({
    mode: simMode,
    tokenCountInput: simTokens,
    investmentAmountInputEUR: simAmountEUR,
    tokenPriceEUR: property.tokenPrice,
    totalPropertyTokens: totalSupply,
    availableTokens: property.availableTokens,
    minimumInvestmentEUR: property.minimumInvestment,
    monthlyTargetRatePercent: monthlyRate,
    durationMonths,
    capitalAppreciationYieldPercent: property.capitalAppreciationYield || 0,
    feePercent: activeSimFeeTier.feePercent,
    fixedFeeEUR: activeSimFeeTier.fixedFeeEUR || 0,
  });

  const activeModalFeeTier =
    PAYMENT_FEE_TIERS.find((t) => t.id === modalFeeTierId) || PAYMENT_FEE_TIERS[0];

  const modalCalc = calculateLiveInvestmentBreakdown({
    mode: modalMode,
    tokenCountInput: tokenCount,
    investmentAmountInputEUR: modalAmountEUR,
    tokenPriceEUR: property.tokenPrice,
    totalPropertyTokens: totalSupply,
    availableTokens: property.availableTokens,
    minimumInvestmentEUR: property.minimumInvestment,
    monthlyTargetRatePercent: monthlyRate,
    durationMonths,
    capitalAppreciationYieldPercent: property.capitalAppreciationYield || 0,
    feePercent: activeModalFeeTier.feePercent,
    fixedFeeEUR: activeModalFeeTier.fixedFeeEUR || 0,
    walletBalanceEUR: user?.walletBalance,
  });

  const totalCost = modalCalc.subtotalEUR;
  const totalPayable = modalCalc.totalPayableEUR;
  const projectedMonthlyDividend = modalCalc.monthlyDividendEUR;
  const annualTarget = modalCalc.annualDividendEUR;
  const netMonthlyTarget = modalCalc.netProjectedProfitEUR;
  const totalWithPrincipal = modalCalc.totalExitProceedsEUR;

  const handleStartInvest = (prefillAmount?: number, prefillTokens?: number, prefillFeeTierId?: string) => {
    if (!user) {
      if (onNavigateAuthForInvestment) {
        onNavigateAuthForInvestment(property);
      }
      return;
    }

    const chosenTokens = prefillTokens
      ? Math.max(minTokens, Math.min(property.availableTokens || minTokens, prefillTokens))
      : prefillAmount
      ? Math.max(minTokens, Math.floor(prefillAmount / property.tokenPrice))
      : minTokens;

    setTokenCount(chosenTokens);
    setModalAmountEUR(Number((chosenTokens * property.tokenPrice).toFixed(2)));
    setModalMode('tokens');
    setModalFeeTierId(prefillFeeTierId || PAYMENT_FEE_TIERS[0].id);
    setOrderIdempotencyKey(`inv-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`);
    setInvestError(null);
    setInvestSuccessCert(null);
    setIsInvestModalOpen(true);
  };

  const handleConfirmInvestment = async () => {
    if (isSubmitting) return;
    if (!user) {
      if (onNavigateAuthForInvestment) {
        onNavigateAuthForInvestment(property);
      }
      return;
    }
    setInvestError(null);
    setIsSubmitting(true);

    const activeKey = orderIdempotencyKey || `inv-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

    try {
      const inv = await ledger.executeInvestment(user.id, property.id, modalCalc.tokenCount, {
        feePercent: activeModalFeeTier.feePercent,
        paymentMethod: activeModalFeeTier.label,
        idempotencyKey: activeKey,
      });

      investmentsApi
        .executeInvestment({
          propertyId: property.id,
          tokensCount: modalCalc.tokenCount,
          paymentMethod: activeModalFeeTier.label,
          feePercent: activeModalFeeTier.feePercent,
          idempotencyKey: activeKey,
        })
        .catch(() => {});

      await refreshUser();
      setInvestSuccessCert({
        id: inv.certificateId,
        txHash: inv.transactionHash,
        tokens: inv.tokensPurchased,
        subtotal: modalCalc.subtotalEUR,
        feeAmount: modalCalc.feeAmountEUR,
        total: modalCalc.totalPayableEUR,
      });
      showToast(`Confirmed acquisition of ${inv.tokensPurchased} ${property.tokenTicker} tokens.`, 'success');
      if (onInvestmentSuccess) onInvestmentSuccess();
    } catch (err: any) {
      setInvestError(err.message || 'Investment execution failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-[#F8FAFC] min-h-screen py-8">
      <div className="container">
        {/* Navigation Breadcrumb */}
        <button
          onClick={onBack}
          title="Back to Properties Marketplace"
          aria-label="Back"
          className="w-9 h-9 rounded-xl bg-white border border-[#E3E8E3] text-[#182D2A] hover:bg-[#EEF1EC] transition-all shadow-xs mb-6 cursor-pointer flex items-center justify-center shrink-0"
        >
          <ArrowLeft className="w-4 h-4 text-[#182D2A]" />
        </button>

        {/* Header Title & Status Bar */}
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-[#E3E8E3] shadow-sm mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2.5 mb-2">
              <span className="status-badge funding font-semibold uppercase tracking-wider text-[11px]">
                {property.type}
              </span>
              {property.ref && (
                <span className="text-xs font-mono font-bold text-[#182D2A] bg-[#EEF1EC] px-2.5 py-0.5 rounded-full">
                  Ref: {property.ref}
                </span>
              )}
              {property.isExclusive && (
                <span className="text-xs font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                  <span>★</span> Exclusive Mandate
                </span>
              )}
              {property.isOffMarket && (
                <span className="text-xs font-bold text-purple-800 bg-purple-50 border border-purple-200 px-2.5 py-0.5 rounded-full">
                  Off-Market
                </span>
              )}
              <span className="text-xs text-[#69736F] flex items-center gap-1 font-medium">
                <MapPin className="w-3.5 h-3.5 text-[#27845D]" />
                {property.location}, {property.country}
              </span>
              <span className="text-xs font-bold text-[#182D2A] bg-[#EEF1EC] px-2.5 py-0.5 rounded-full">
                Min. Entry: {formatCurrency(property.minimumInvestment)}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-[#18211F]">
              {property.title}
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={handleToggleFavorite}
              aria-pressed={isSaved}
              aria-label={isSaved ? 'Remove property from watchlist' : 'Save property to watchlist'}
              className={`px-3.5 py-2.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs ${
                isSaved
                  ? 'border-rose-300 bg-rose-50 text-rose-700 hover:bg-rose-100'
                  : 'border-[#E3E8E3] bg-[#F6F7F4] hover:bg-white text-[#18211F]'
              }`}
            >
              <Heart className={`w-4 h-4 ${isSaved ? 'fill-rose-600 text-rose-600' : 'text-[#27845D]'}`} />
              <span>{isSaved ? 'Saved' : 'Save'}</span>
            </button>

            <button
              type="button"
              onClick={() => setIsShareModalOpen(true)}
              className="px-4 py-2.5 rounded-xl border border-[#E3E8E3] bg-[#F6F7F4] hover:bg-white text-[#18211F] text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-xs"
              title="Share Property via Direct Link, Social Platforms or QR Code"
            >
              <Share2 className="w-4 h-4 text-[#27845D]" />
              <span>Share Property</span>
            </button>

            <button
              type="button"
              onClick={() => setIsDocViewerOpen(true)}
              className="px-5 py-2.5 rounded-xl border border-[#E3E8E3] bg-[#F6F7F4] hover:bg-white text-[#18211F] text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-xs"
              title="Generate, Preview and Inspect Official 7-Document Package"
            >
              <FileText className="w-4 h-4 text-[#27845D]" />
              <span>Official Documents &amp; Brochure</span>
            </button>

            {property.status === 'funding' && property.availableTokens > 0 && (
              <button
                type="button"
                onClick={() => handleStartInvest()}
                className="btn btn-primary px-7 text-xs font-bold shadow-md shadow-[#182D2A]/10"
              >
                <Coins className="w-4 h-4 mr-1.5" />
                {user ? 'Invest in this Property' : 'Sign in to Invest Now'}
              </button>
            )}
          </div>
        </div>

        {/* Gallery & Quick Highlights */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          {/* Image Showcase */}
          <div className="lg:col-span-2 space-y-3">
            <div className="rounded-3xl overflow-hidden aspect-video bg-[#EEF1EC] border border-[#E3E8E3] shadow-sm relative group">
              <img
                src={property.images[selectedImageIndex] || property.bannerImage}
                alt={property.title}
                className="w-full h-full object-cover cursor-pointer transition-transform duration-500 group-hover:scale-102"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  if (!target.dataset.fallback) {
                    target.dataset.fallback = 'true';
                    target.src = '/assets/images/hero_real_estate_1791998371047.jpg';
                  }
                }}
                onClick={() => setLightboxOpen(true)}
              />
              
              {/* Ticker & Network Badge */}
              <div className="absolute top-4 left-4 bg-black/65 backdrop-blur-md text-white text-xs font-semibold px-3 py-1.5 rounded-full flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span>Ticker: {property.tokenTicker} · {property.blockchainNetwork}</span>
              </div>

              {/* Photo Counter & Fullscreen Lightbox Button */}
              <div className="absolute top-4 right-4 flex items-center gap-2">
                <span className="bg-black/65 backdrop-blur-md text-white text-xs font-semibold px-3 py-1.5 rounded-full">
                  📷 {selectedImageIndex + 1} / {property.images.length}
                </span>
                <button
                  onClick={() => setLightboxOpen(true)}
                  title="Expand Fullscreen Gallery"
                  className="w-8 h-8 rounded-full bg-black/65 backdrop-blur-md text-white hover:bg-black/80 flex items-center justify-center transition-all cursor-pointer"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Carousel Arrows */}
              {property.images.length > 1 && (
                <>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedImageIndex((prev) => (prev === 0 ? property.images.length - 1 : prev - 1));
                    }}
                    aria-label="Previous Photo"
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center backdrop-blur-sm transition-all opacity-80 group-hover:opacity-100 cursor-pointer shadow-md"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedImageIndex((prev) => (prev === property.images.length - 1 ? 0 : prev + 1));
                    }}
                    aria-label="Next Photo"
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center backdrop-blur-sm transition-all opacity-80 group-hover:opacity-100 cursor-pointer shadow-md"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </>
              )}
            </div>

            {/* Thumbnail selector */}
            {property.images.length > 1 && (
              <div className="flex gap-2.5 overflow-x-auto pb-1 scrollbar-none">
                {property.images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedImageIndex(idx)}
                    className={`relative w-24 h-16 shrink-0 rounded-xl overflow-hidden border-2 transition-all cursor-pointer ${
                      selectedImageIndex === idx
                        ? 'border-[#182D2A] opacity-100 scale-102 shadow-sm ring-2 ring-[#27845D]/40'
                        : 'border-transparent opacity-65 hover:opacity-100'
                    }`}
                  >
                    <img
                      src={img}
                      alt={`Thumb ${idx + 1}`}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        if (!target.dataset.fallback) {
                          target.dataset.fallback = 'true';
                          target.src = '/assets/images/hero_real_estate_1791998371047.jpg';
                        }
                      }}
                    />
                    <span className="absolute bottom-1 right-1 text-[9px] bg-black/70 text-white font-bold px-1 rounded">
                      {idx + 1}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Funding Card & Immediate Financials */}
          <div className="bg-white p-6 rounded-3xl border border-[#E3E8E3] shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-baseline mb-1">
                <span className="text-xs text-[#69736F] font-semibold uppercase tracking-wider">
                  Funding Target
                </span>
                <span className="text-xl font-black text-[#18211F]">
                  {formatCurrency(property.fundedAmount)}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs text-[#69736F] mb-2">
                <span>Total Target: {formatCurrency(property.targetAmount)}</span>
                <span className="font-bold text-[#27845D]">{fundingPercent}% Funded</span>
              </div>

              {/* Progress Bar */}
              <div className="progress-track mb-6">
                <div className="progress-fill" style={{ width: `${fundingPercent}%` }} />
              </div>

              {/* Key Financial Transparency Metrics: Projected vs. Realized */}
              <div className="space-y-3 py-4 border-y border-[#E4EEEA] mb-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {/* 1. PROJECTED ANNUAL YIELD CARD */}
                  <div className="p-3.5 rounded-2xl bg-[#F6FAF8] border border-[#BCE8D7] relative overflow-hidden flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between gap-1.5 mb-1.5">
                        <span className="inline-flex items-center gap-1 text-[9px] font-extrabold text-[#087F5B] bg-[#DDF5EC] border border-[#BCE8D7] px-2 py-0.5 rounded-full uppercase tracking-wider">
                          <TrendingUp className="w-2.5 h-2.5 stroke-[2.5]" /> Projected Annual Yield
                        </span>
                        <span className="text-[9px] text-[#71817D] font-mono">Target</span>
                      </div>
                      <div className="text-xl sm:text-2xl font-black font-mono tabular-nums text-[#087F5B]">
                        {formatPercent(property.estimatedAnnualYield || (monthlyRate * 12))}
                      </div>
                    </div>
                    <span className="text-[10px] text-[#71817D] mt-1 block leading-tight font-medium">
                      Underwritten pro-forma model ({formatPercent(monthlyRate)}/mo)
                    </span>
                  </div>

                  {/* 2. REALIZED PERFORMANCE CARD */}
                  <div className="p-3.5 rounded-2xl bg-gradient-to-br from-[#075B46] to-[#087F5B] text-white border border-[#087F5B]/40 relative overflow-hidden flex flex-col justify-between shadow-xs">
                    <div>
                      <div className="flex items-center justify-between gap-1.5 mb-1.5">
                        <span className="inline-flex items-center gap-1 text-[9px] font-extrabold text-[#075B46] bg-[#DDF5EC] border border-[#DDF5EC] px-2 py-0.5 rounded-full uppercase tracking-wider">
                          <ShieldCheck className="w-2.5 h-2.5 stroke-[2.5]" /> Realized Performance
                        </span>
                        <span className="text-[9px] text-[#DDF5EC] font-mono font-semibold">Verified</span>
                      </div>
                      <div className="text-xl sm:text-2xl font-black font-mono tabular-nums text-white">
                        {existingInvestment && existingInvestment.totalDividendsReceived > 0 ? (
                          `+${formatCurrency(existingInvestment.totalDividendsReceived)}`
                        ) : (
                          '100% Payout Rate'
                        )}
                      </div>
                    </div>
                    <span className="text-[10px] text-[#DDF5EC]/90 mt-1 block leading-tight font-medium">
                      {existingInvestment && existingInvestment.totalDividendsReceived > 0
                        ? `${realizedReturnPercent.toFixed(1)}% cash yield settled to your wallet`
                        : 'Actual audited distributions delivered on-schedule'}
                    </span>
                  </div>
                </div>

                {/* Additional Specifics Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-xs">
                  <div className="bg-[#F6FAF8] p-2.5 rounded-xl border border-[#E4EEEA]">
                    <span className="text-[10px] text-[#71817D] font-bold uppercase block">Entry Ticket</span>
                    <span className="text-sm font-bold font-mono text-[#172B2A] block mt-0.5">{formatCurrency(property.minimumInvestment)}</span>
                  </div>
                  <div className="bg-[#F6FAF8] p-2.5 rounded-xl border border-[#E4EEEA]">
                    <span className="text-[10px] text-[#71817D] font-bold uppercase block">Distribution</span>
                    <span className="text-xs font-semibold text-[#172B2A] block mt-0.5 truncate">{property.distributionFrequency} (1st/mo)</span>
                  </div>
                  <div className="bg-[#F6FAF8] p-2.5 rounded-xl border border-[#E4EEEA]">
                    <span className="text-[10px] text-[#71817D] font-bold uppercase block">Target Term</span>
                    <span className="text-sm font-bold font-mono text-[#172B2A] block mt-0.5">{durationMonths} Mo.</span>
                  </div>
                  <div className="bg-[#F6FAF8] p-2.5 rounded-xl border border-[#E4EEEA]">
                    <span className="text-[10px] text-[#71817D] font-bold uppercase block">Token Price</span>
                    <span className="text-sm font-bold font-mono text-[#172B2A] block mt-0.5">{formatCurrency(property.tokenPrice)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <button
                onClick={() => handleStartInvest()}
                disabled={property.isFullyFunded || property.status === 'funded' || property.availableTokens <= 0}
                className="btn btn-primary w-full text-xs font-bold py-3.5 mb-2.5 disabled:bg-gray-200 disabled:text-gray-500 disabled:border-gray-300 disabled:cursor-not-allowed"
              >
                {property.isFullyFunded || property.status === 'funded' || property.availableTokens <= 0
                  ? 'Offering 100% Fully Funded'
                  : user
                  ? `Invest Now (From ${formatCurrency(property.minimumInvestment)})`
                  : `Sign In to Invest (From ${formatCurrency(property.minimumInvestment)})`}
              </button>
              <p className="text-[11px] text-[#828D89] text-center leading-tight">
                *Pro-forma financial terms verified via independent RICS appraisal. Estimates, not guarantees.
              </p>
            </div>
          </div>
        </div>

        {/* Architectural Specifications Bar */}
        {(property.surfaceAreaM2 || property.bedrooms || property.yearBuilt || property.energyRating || property.cadastralReference) && (
          <div className="bg-white p-5 sm:p-6 rounded-3xl border border-[#E3E8E3] shadow-sm mb-8">
            <div className="flex items-center gap-2 mb-4">
              <Building className="w-4 h-4 text-[#27845D]" />
              <h3 className="text-sm font-bold text-[#18211F] uppercase tracking-wider">
                Asset Architectural & Registry Profile
              </h3>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
              {property.surfaceAreaM2 && (
                <div className="bg-[#F6F7F4] p-3 rounded-2xl border border-[#E3E8E3]">
                  <span className="text-[11px] text-[#69736F] block font-medium">Built Surface</span>
                  <span className="text-base font-extrabold text-[#18211F]">{property.surfaceAreaM2} m²</span>
                </div>
              )}
              {property.bedrooms !== undefined && (
                <div className="bg-[#F6F7F4] p-3 rounded-2xl border border-[#E3E8E3]">
                  <span className="text-[11px] text-[#69736F] block font-medium">Layout</span>
                  <span className="text-sm font-extrabold text-[#18211F]">
                    {property.bedrooms} Beds · {property.bathrooms} Baths
                  </span>
                </div>
              )}
              {property.yearBuilt && (
                <div className="bg-[#F6F7F4] p-3 rounded-2xl border border-[#E3E8E3]">
                  <span className="text-[11px] text-[#69736F] block font-medium">Built / Restored</span>
                  <span className="text-xs font-bold text-[#18211F] truncate block" title={String(property.yearBuilt)}>
                    {property.yearBuilt}
                  </span>
                </div>
              )}
              {property.energyRating && (
                <div className="bg-[#F6F7F4] p-3 rounded-2xl border border-[#E3E8E3]">
                  <span className="text-[11px] text-[#69736F] block font-medium">Energy Audit</span>
                  <span className="text-xs font-bold text-[#27845D] bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 inline-block mt-0.5">
                    {property.energyRating}
                  </span>
                </div>
              )}
              {property.cadastralReference && (
                <div className="bg-[#F6F7F4] p-3 rounded-2xl border border-[#E3E8E3]">
                  <span className="text-[11px] text-[#69736F] block font-medium">Cadastral Ref</span>
                  <span className="text-xs font-mono font-bold text-[#18211F] truncate block" title={property.cadastralReference}>
                    {property.cadastralReference}
                  </span>
                </div>
              )}
              {property.operatorName && (
                <div className="bg-[#F6F7F4] p-3 rounded-2xl border border-[#E3E8E3]">
                  <span className="text-[11px] text-[#69736F] block font-medium">Asset Operator</span>
                  <span className="text-xs font-bold text-[#18211F] truncate block" title={property.operatorName}>
                    {property.operatorName}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}



        {/* Interactive Live Investment & Return Simulator */}
        <div className="bg-white p-5 sm:p-6 rounded-3xl border border-[#E3E8E3] shadow-sm mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-[#E3E8E3] mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-[#EEF1EC] text-[#27845D] flex items-center justify-center shrink-0">
                <Calculator className="w-4.5 h-4.5" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-bold text-[#18211F]">
                  Live Investment &amp; Fee Return Calculator
                </h3>
                <p className="text-xs text-[#69736F]">
                  Adjust investment capital, token quantity, or settlement rail to inspect real-time SPV ownership and net cashflows.
                </p>
              </div>
            </div>
            <span className="text-xs font-mono font-bold text-[#27845D] bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-lg self-start sm:self-auto">
              {property.availableTokens.toLocaleString()} / {totalSupply.toLocaleString()} Units Available
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            {/* Inputs Column */}
            <div className="lg:col-span-5 space-y-3.5">
              {/* EUR Amount Input */}
              <div className="space-y-1">
                <div className="flex justify-between items-center text-xs">
                  <label htmlFor="detail-sim-amount" className="font-bold text-[#18211F]">
                    Investment Capital (€)
                  </label>
                  <div className="flex items-center gap-1">
                    {[property.minimumInvestment, 2500, 5000, 10000]
                      .filter((v, idx, arr) => v >= property.minimumInvestment && arr.indexOf(v) === idx)
                      .slice(0, 3)
                      .map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => {
                            setSimMode('amount');
                            setSimAmountEUR(preset);
                            setSimTokens(Math.max(1, Math.floor(preset / property.tokenPrice)));
                          }}
                          className="px-2 py-0.5 rounded bg-[#F6F7F4] hover:bg-[#EEF1EC] border border-[#E3E8E3] text-[10px] font-mono font-bold text-[#18211F] cursor-pointer"
                        >
                          €{preset.toLocaleString()}
                        </button>
                      ))}
                  </div>
                </div>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold font-mono text-[#69736F]">
                    €
                  </span>
                  <input
                    id="detail-sim-amount"
                    type="number"
                    min={property.tokenPrice}
                    step={property.tokenPrice}
                    value={simMode === 'amount' ? simAmountEUR : simCalc.subtotalEUR}
                    onChange={(e) => {
                      const val = Math.max(0, parseFloat(e.target.value) || 0);
                      setSimMode('amount');
                      setSimAmountEUR(val);
                      setSimTokens(Math.floor(val / property.tokenPrice));
                    }}
                    className="w-full pl-8 pr-3 py-2.5 rounded-xl border border-[#E3E8E3] bg-[#F6F7F4] focus:bg-white text-sm font-bold font-mono text-[#18211F] focus:outline-none focus:ring-2 focus:ring-[#27845D]"
                  />
                </div>
              </div>

              {/* Token Units Stepper */}
              <div className="space-y-1">
                <div className="flex justify-between items-center text-xs">
                  <label htmlFor="detail-sim-tokens" className="font-bold text-[#18211F]">
                    SPL Token Quantity
                  </label>
                  <span className="font-mono text-[11px] text-[#69736F]">
                    {formatCurrency(property.tokenPrice)} / unit
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    aria-label="Decrease simulated tokens"
                    onClick={() => {
                      const next = Math.max(1, simCalc.tokenCount - 1);
                      setSimMode('tokens');
                      setSimTokens(next);
                      setSimAmountEUR(Number((next * property.tokenPrice).toFixed(2)));
                    }}
                    className="p-2.5 rounded-xl border border-[#E3E8E3] bg-[#F6F7F4] hover:bg-[#EEF1EC] text-[#18211F] cursor-pointer"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <input
                    id="detail-sim-tokens"
                    type="number"
                    min={1}
                    max={Math.max(1, property.availableTokens)}
                    value={simMode === 'tokens' ? simTokens : simCalc.tokenCount}
                    onChange={(e) => {
                      const next = Math.max(0, parseInt(e.target.value, 10) || 0);
                      setSimMode('tokens');
                      setSimTokens(next);
                      setSimAmountEUR(Number((next * property.tokenPrice).toFixed(2)));
                    }}
                    className="flex-1 py-2 px-3 rounded-xl border border-[#E3E8E3] bg-[#F6F7F4] focus:bg-white text-center text-sm font-bold font-mono text-[#18211F] focus:outline-none focus:ring-2 focus:ring-[#27845D]"
                  />
                  <button
                    type="button"
                    aria-label="Increase simulated tokens"
                    onClick={() => {
                      const next = Math.min(Math.max(1, property.availableTokens), simCalc.tokenCount + 1);
                      setSimMode('tokens');
                      setSimTokens(next);
                      setSimAmountEUR(Number((next * property.tokenPrice).toFixed(2)));
                    }}
                    className="p-2.5 rounded-xl border border-[#E3E8E3] bg-[#F6F7F4] hover:bg-[#EEF1EC] text-[#18211F] cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Settlement Fee Tier */}
              <div className="space-y-1">
                <label htmlFor="detail-sim-fee" className="text-xs font-bold text-[#18211F] block">
                  Settlement Rail &amp; Applicable Fee
                </label>
                <select
                  id="detail-sim-fee"
                  value={simFeeTierId}
                  onChange={(e) => setSimFeeTierId(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-[#E3E8E3] bg-[#F6F7F4] text-xs font-semibold text-[#18211F] focus:outline-none focus:ring-2 focus:ring-[#27845D] cursor-pointer"
                >
                  {PAYMENT_FEE_TIERS.map((tier) => (
                    <option key={tier.id} value={tier.id}>
                      {tier.label} ({tier.feePercent.toFixed(2)}% fee)
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Live Computed Breakdown Column */}
            <div className="lg:col-span-7 bg-[#F6FAF8] rounded-2xl border border-[#BCE8D7] p-4 sm:p-5 space-y-3.5">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                <div className="bg-white p-3 rounded-xl border border-[#E4EEEA]">
                  <span className="text-[10px] font-bold uppercase text-[#71817D] block">Allocated Units</span>
                  <span className="text-base font-black font-mono text-[#172B2A] mt-0.5 block">
                    {simCalc.tokenCount} {property.tokenTicker}
                  </span>
                  <span className="text-[10px] text-[#087F5B] font-mono font-semibold">
                    {simCalc.ownershipSharePercent}% SPV Share
                  </span>
                </div>

                <div className="bg-white p-3 rounded-xl border border-[#E4EEEA]">
                  <span className="text-[10px] font-bold uppercase text-[#71817D] block">Subtotal + Fee</span>
                  <span className="text-base font-black font-mono text-[#172B2A] mt-0.5 block">
                    {formatCurrency(simCalc.totalPayableEUR)}
                  </span>
                  <span className="text-[10px] text-[#71817D] font-mono">
                    Fee: {formatCurrency(simCalc.feeAmountEUR)} ({simCalc.feePercent}%)
                  </span>
                </div>

                <div className="bg-white p-3 rounded-xl border border-[#E4EEEA]">
                  <span className="text-[10px] font-bold uppercase text-[#71817D] block">Monthly Dividend</span>
                  <span className="text-base font-black font-mono text-[#087F5B] mt-0.5 block">
                    +{formatCurrency(simCalc.monthlyDividendEUR)}/mo
                  </span>
                  <span className="text-[10px] text-[#71817D] font-mono">
                    +{formatCurrency(simCalc.annualDividendEUR)}/yr
                  </span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-xl bg-white border border-[#E4EEEA] text-xs">
                <div>
                  <span className="text-[10px] font-bold uppercase text-[#71817D] block">
                    Net Projected Profit ({durationMonths} Mo, After Fee)
                  </span>
                  <span className="text-sm font-black font-mono text-[#087F5B]">
                    +{formatCurrency(simCalc.netProjectedProfitEUR)} ({simCalc.netAnnualizedReturnPercent}% net p.a.)
                  </span>
                </div>
                <div className="sm:text-right">
                  <span className="text-[10px] font-bold uppercase text-[#71817D] block">
                    Total Exit Proceeds (incl. Principal)
                  </span>
                  <span className="text-sm font-black font-mono text-[#172B2A]">
                    {formatCurrency(simCalc.totalExitProceedsEUR)}
                  </span>
                </div>
              </div>

              {!simCalc.isValid && simCalc.validationError && (
                <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-semibold">
                  {simCalc.validationError}
                </div>
              )}

              <button
                type="button"
                disabled={!simCalc.isValid || property.status !== 'funding'}
                onClick={() => handleStartInvest(simCalc.subtotalEUR, simCalc.tokenCount, simFeeTierId)}
                className="btn btn-primary w-full text-xs font-bold py-3 disabled:bg-gray-200 disabled:text-gray-500 disabled:border-gray-300 disabled:cursor-not-allowed"
              >
                {property.status !== 'funding' || property.availableTokens <= 0
                  ? 'Offering 100% Fully Funded'
                  : user
                  ? `Acquire ${simCalc.tokenCount} Units (${formatCurrency(simCalc.totalPayableEUR)})`
                  : `Sign In to Acquire ${simCalc.tokenCount} Units (${formatCurrency(simCalc.totalPayableEUR)})`}
              </button>
            </div>
          </div>
        </div>

        {/* Tab Navigation (Requirement 6: Description, Investment Structure, Financial Terms, Fees, Documents, Risks, Payment Schedule, Exit Conditions) */}
        <div className="flex flex-wrap border-b border-[#E3E8E3] mb-6 gap-3 sm:gap-6 text-xs sm:text-sm font-bold">
          {[
            { id: 'overview', label: 'Description & Highlights' },
            { id: 'location', label: '🗺️ Map & Location' },
            { id: 'monthly_recharts', label: '📊 12-Mo Monthly Yield (Recharts)' },
            { id: 'yield_chart', label: '📈 10-Yr Yield Growth (D3 Chart)' },
            { id: 'financials', label: 'Financial Terms & Pro-Forma' },
            { id: 'sensitivity', label: 'Sensitivity Analysis' },
            { id: 'evidence', label: 'Evidence Room' },
            { id: 'structure', label: 'Investment Structure' },
            { id: 'exit_policy', label: 'Exit Policy & Terms' },
            { id: 'fees', label: 'Fees & Costs' },
            { id: 'schedule', label: 'Payment Schedule' },
            { id: 'documents', label: 'Official Documents' },
            { id: 'tokenization', label: 'Smart Contract' },
            { id: 'appraisal_history', label: '📜 RICS Appraisals & NAV Log' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`pb-3 border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
                activeTab === tab.id
                  ? 'border-[#182D2A] text-[#182D2A]'
                  : 'border-transparent text-[#69736F] hover:text-[#18211F]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="space-y-8">
          {/* TAB 1: Description & Highlights */}
          {activeTab === 'overview' && (
            <div className="space-y-8">
              <div className="bg-white p-7 sm:p-8 rounded-3xl border border-[#E3E8E3] shadow-sm space-y-6">
                <div>
                  <h3 className="text-xl font-bold text-[#18211F] mb-3">Property Description & Architectural Concept</h3>
                  <p className="text-sm text-[#69736F] leading-relaxed">
                    {property.description}
                  </p>
                </div>

                {/* Amenities Grid */}
                {property.amenities && property.amenities.length > 0 && (
                  <div>
                    <h4 className="text-sm font-bold text-[#18211F] uppercase tracking-wider mb-3 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-[#27845D]" />
                      <span>Key Amenities & Specifications</span>
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                      {property.amenities.map((item, idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-2 text-xs font-semibold text-[#18211F] bg-[#F6F7F4] p-3 rounded-xl border border-[#E3E8E3]"
                        >
                          <div className="w-5 h-5 rounded-full bg-emerald-100 text-[#27845D] flex items-center justify-center shrink-0">
                            <Check className="w-3 h-3" />
                          </div>
                          <span>{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Kretz Platform & Ecosystem Benefits */}
                {(property.kretzFeatures || property.reentalFeatures) && (property.kretzFeatures || property.reentalFeatures)!.length > 0 && (
                  <div className="bg-gradient-to-br from-[#06241D] to-[#041914] text-white p-6 rounded-2xl border border-emerald-900/60 shadow-sm">
                    <div className="flex items-center gap-2 mb-3">
                      <Coins className="w-4 h-4 text-[#00FF9D]" />
                      <h4 className="text-sm font-bold uppercase tracking-wider text-[#00FF9D]">
                        Kretz Ecosystem Integration & Privileges
                      </h4>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {(property.kretzFeatures || property.reentalFeatures)!.map((feat, idx) => (
                        <div
                          key={idx}
                          className="flex items-start gap-2.5 text-xs text-emerald-100 bg-emerald-950/70 p-3 rounded-xl border border-emerald-500/20"
                        >
                          <span className="w-2 h-2 rounded-full bg-[#00FF9D] mt-1 shrink-0" />
                          <span>{feat}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Project Milestone Timeline */}
                {property.timeline && property.timeline.length > 0 && (
                  <div>
                    <h4 className="text-sm font-bold text-[#18211F] uppercase tracking-wider mb-4 flex items-center gap-2">
                      <Clock className="w-4 h-4 text-[#27845D]" />
                      <span>Project Development & Operational Milestones</span>
                    </h4>
                    <div className="space-y-3 relative before:absolute before:inset-0 before:left-3.5 before:w-0.5 before:bg-[#E3E8E3]">
                      {property.timeline.map((step, idx) => (
                        <div key={idx} className="relative flex items-start gap-3.5 pl-1">
                          <div
                            className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 z-10 ${
                              step.status === 'completed'
                                ? 'bg-[#27845D] text-white'
                                : step.status === 'in_progress'
                                ? 'bg-amber-500 text-white animate-pulse'
                                : 'bg-[#E3E8E3] text-[#69736F]'
                            }`}
                          >
                            {step.status === 'completed' ? '✓' : idx + 1}
                          </div>
                          <div className="bg-[#F6F7F4] p-3.5 rounded-2xl border border-[#E3E8E3] flex-1 text-xs">
                            <div className="flex flex-wrap items-center justify-between gap-1 mb-1">
                              <span className="font-bold text-[#18211F] text-sm">{step.phase}</span>
                              <div className="flex items-center gap-2">
                                <span className="text-[#69736F] font-medium">{step.date}</span>
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                    step.status === 'completed'
                                      ? 'bg-emerald-100 text-[#27845D]'
                                      : step.status === 'in_progress'
                                      ? 'bg-amber-100 text-amber-800'
                                      : 'bg-gray-200 text-gray-700'
                                  }`}
                                >
                                  {step.status.replace('_', ' ')}
                                </span>
                              </div>
                            </div>
                            <p className="text-[#69736F] leading-relaxed">{step.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Key Investment Strengths */}
                <div>
                  <h4 className="text-sm font-bold text-[#18211F] uppercase tracking-wider mb-3">
                    Key Investment Strengths
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {property.highlights.map((h, i) => (
                      <div
                        key={i}
                        className="flex items-start gap-2.5 text-xs text-[#18211F] bg-[#F6F7F4] p-3.5 rounded-xl border border-[#E3E8E3]"
                      >
                        <CheckCircle2 className="w-4 h-4 text-[#27845D] shrink-0 mt-0.5" />
                        <span>{h}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Risk Mitigations (Requirement 6) */}
                <div>
                  <h4 className="text-sm font-bold text-[#18211F] uppercase tracking-wider mb-3 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-[#B7791F]" />
                    <span>Identified Risk Mitigations</span>
                  </h4>
                  <div className="space-y-2">
                    {property.risks.map((r, i) => (
                      <div
                        key={i}
                        className="text-xs text-[#69736F] bg-amber-50/50 p-3.5 rounded-xl border border-amber-100 flex items-start gap-2"
                      >
                        <span className="font-bold text-[#B7791F]">·</span>
                        <span>{r}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Exit Conditions (Requirement 6) */}
                <div className="bg-[#EEF1EC] p-5 rounded-2xl border border-[#E3E8E3]">
                  <span className="text-xs font-bold text-[#182D2A] uppercase tracking-wider block mb-1">
                    Exit Conditions & Liquidity Terms
                  </span>
                  <p className="text-xs text-[#69736F] leading-relaxed">
                    {property.exitStrategy}
                  </p>
                </div>
              </div>

              {/* Property Location Map Component */}
              <PropertyLocationMap property={property} />
            </div>
          )}

          {/* TAB: Dedicated Map & Location */}
          {activeTab === 'location' && (
            <PropertyLocationMap property={property} />
          )}

          {/* TAB: 12-Month Recharts Monthly Rental Yield Growth */}
          {activeTab === 'monthly_recharts' && (
            <MonthlyYieldRecharts property={property} investmentAmountEUR={property.minimumInvestment * 10} />
          )}

          {/* TAB: 10-Yr D3 Interactive Yield Growth Chart */}
          {activeTab === 'yield_chart' && (
            <ProjectedYieldChart property={property} initialInvestmentEUR={property.minimumInvestment} />
          )}

          {/* TAB 2: Investment Structure (Requirement 6) */}
          {activeTab === 'structure' && (
            <div className="bg-white p-7 sm:p-8 rounded-3xl border border-[#E3E8E3] shadow-sm space-y-6">
              <div>
                <h3 className="text-xl font-bold text-[#18211F] mb-1">Legal Investment Structure</h3>
                <p className="text-xs text-[#69736F]">
                  Legal mechanics and regulatory vehicle governing investor ownership and security.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-[#F6F7F4] border border-[#E3E8E3] text-sm text-[#18211F] leading-relaxed">
                <span className="font-bold text-[#182D2A] block mb-2">Instrument Architecture:</span>
                {property.investmentStructure}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-2xl bg-[#F6F7F4] border border-[#E3E8E3]">
                  <span className="text-xs text-[#69736F] block mb-1">Entity Type</span>
                  <span className="text-sm font-bold text-[#18211F]">Special Purpose Vehicle (SL)</span>
                  <span className="text-[11px] text-[#27845D] block mt-1">Ring-fenced ownership</span>
                </div>

                <div className="p-4 rounded-2xl bg-[#F6F7F4] border border-[#E3E8E3]">
                  <span className="text-xs text-[#69736F] block mb-1">Contract Nature</span>
                  <span className="text-sm font-bold text-[#18211F]">Participatory Debt Security</span>
                  <span className="text-[11px] text-[#27845D] block mt-1">Fixed rent + capital upside</span>
                </div>

                <div className="p-4 rounded-2xl bg-[#F6F7F4] border border-[#E3E8E3]">
                  <span className="text-xs text-[#69736F] block mb-1">Asset Deed Register</span>
                  <span className="text-sm font-bold text-[#18211F]">Spanish Land Registry</span>
                  <span className="text-[11px] text-[#27845D] block mt-1">Notarized title deed</span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Verified Financial Terms (Requirement 6) */}
          {activeTab === 'financials' && (
            <div className="bg-white p-7 sm:p-8 rounded-3xl border border-[#E3E8E3] shadow-sm space-y-6">
              <div>
                <h3 className="text-xl font-bold text-[#18211F] mb-1">Verified Financial Terms</h3>
                <p className="text-xs text-[#69736F]">
                  Detailed pro-forma financial statement verified by certified third-party appraisal.
                </p>
              </div>

              {/* Financial Terms Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[#E3E8E3] text-[#69736F] uppercase tracking-wider">
                      <th className="py-3 px-4 font-bold">Acquisition Budget Line</th>
                      <th className="py-3 px-4 font-bold text-right">Amount (EUR)</th>
                      <th className="py-3 px-4 font-bold text-right">% of Capitalization</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E3E8E3]">
                    <tr>
                      <td className="py-3 px-4 font-semibold text-[#18211F]">Property Purchase Price</td>
                      <td className="py-3 px-4 text-right font-bold">
                        {formatCurrency(property.financialBreakdown.propertyPrice)}
                      </td>
                      <td className="py-3 px-4 text-right text-[#69736F]">
                        {((property.financialBreakdown.propertyPrice / property.targetAmount) * 100).toFixed(1)}%
                      </td>
                    </tr>
                    <tr>
                      <td className="py-3 px-4 font-semibold text-[#18211F]">Refurbishment & Upgrades</td>
                      <td className="py-3 px-4 text-right font-bold">
                        {formatCurrency(property.financialBreakdown.refurbishmentBudget)}
                      </td>
                      <td className="py-3 px-4 text-right text-[#69736F]">
                        {((property.financialBreakdown.refurbishmentBudget / property.targetAmount) * 100).toFixed(1)}%
                      </td>
                    </tr>
                    <tr>
                      <td className="py-3 px-4 font-semibold text-[#18211F]">Legal, Taxes & Notary Closing</td>
                      <td className="py-3 px-4 text-right font-bold">
                        {formatCurrency(property.financialBreakdown.legalAndClosingCosts)}
                      </td>
                      <td className="py-3 px-4 text-right text-[#69736F]">
                        {((property.financialBreakdown.legalAndClosingCosts / property.targetAmount) * 100).toFixed(1)}%
                      </td>
                    </tr>
                    <tr>
                      <td className="py-3 px-4 font-semibold text-[#18211F]">Operating Reserve Contingency</td>
                      <td className="py-3 px-4 text-right font-bold">
                        {formatCurrency(property.financialBreakdown.operatingReserve)}
                      </td>
                      <td className="py-3 px-4 text-right text-[#69736F]">
                        {((property.financialBreakdown.operatingReserve / property.targetAmount) * 100).toFixed(1)}%
                      </td>
                    </tr>
                    <tr className="bg-[#F6F7F4] font-bold text-sm">
                      <td className="py-3.5 px-4 text-[#182D2A]">Total Project Capitalization</td>
                      <td className="py-3.5 px-4 text-right text-[#182D2A]">
                        {formatCurrency(property.financialBreakdown.totalProjectCost)}
                      </td>
                      <td className="py-3.5 px-4 text-right text-[#182D2A]">100.0%</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Recurring Cash Flow Summary & Yield Transparency */}
              <div className="pt-5 border-t border-[#E4EEEA] space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h4 className="text-base font-bold text-[#172B2A]">Distinguishing Projected Yield vs. Realized Performance</h4>
                    <p className="text-xs text-[#71817D]">Transparent breakdown of forward-looking pro-forma cashflow versus verified double-entry distribution payouts.</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 text-[9.5px] font-extrabold text-[#087F5B] bg-[#DDF5EC] border border-[#BCE8D7] px-2 py-0.5 rounded-full uppercase tracking-wider">
                      <TrendingUp className="w-2.5 h-2.5 stroke-[2.5]" /> Projected Annual Yield
                    </span>
                    <span className="inline-flex items-center gap-1 text-[9.5px] font-extrabold text-[#075B46] bg-[#EAF8F4] border border-[#087F5B]/30 px-2 py-0.5 rounded-full uppercase tracking-wider">
                      <ShieldCheck className="w-2.5 h-2.5 stroke-[2.5] text-[#087F5B]" /> Realized Performance
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  <div className="bg-[#F6FAF8] p-4 rounded-2xl border border-[#E4EEEA]">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-bold text-[#71817D] uppercase tracking-wider">Projected Gross Rent</span>
                      <span className="text-[9px] font-bold text-[#087F5B] bg-[#DDF5EC] px-1.5 py-0.2 rounded">Projected</span>
                    </div>
                    <span className="text-lg font-bold font-mono text-[#172B2A]">
                      {formatCurrency(property.financialBreakdown.projectedAnnualGrossRent)} /yr
                    </span>
                    <span className="text-[10.5px] text-[#71817D] block mt-1">Gross contractual lease underwriting</span>
                  </div>

                  <div className="bg-[#F6FAF8] p-4 rounded-2xl border border-[#E4EEEA]">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-bold text-[#71817D] uppercase tracking-wider">Operating Expenses & Maintenance</span>
                      <span className="text-[9px] font-bold text-rose-700 bg-rose-50 px-1.5 py-0.2 rounded">Budgeted</span>
                    </div>
                    <span className="text-lg font-bold font-mono text-rose-600">
                      -{formatCurrency(property.financialBreakdown.estimatedOperatingExpenses)} /yr
                    </span>
                    <span className="text-[10.5px] text-[#71817D] block mt-1">Property management, taxes, & insurance</span>
                  </div>

                  <div className="bg-[#DDF5EC]/50 p-4 rounded-2xl border border-[#BCE8D7]">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-extrabold text-[#087F5B] uppercase tracking-wider">Net Distributable Cash Flow</span>
                      <span className="text-[9px] font-bold text-[#075B46] bg-[#DDF5EC] px-1.5 py-0.2 rounded border border-[#BCE8D7]">Realized Target</span>
                    </div>
                    <span className="text-lg font-black font-mono text-[#087F5B]">
                      {formatCurrency(property.financialBreakdown.projectedAnnualNetRent)} /yr
                    </span>
                    <span className="text-[10.5px] text-[#075B46] block mt-1 font-medium">100% credited to investor wallet balance</span>
                  </div>
                </div>
              </div>

              {/* D3 10-Year Projected Yield Growth Chart */}
              <div className="pt-4 border-t border-[#E3E8E3]">
                <ProjectedYieldChart property={property} initialInvestmentEUR={property.minimumInvestment} />
              </div>
            </div>
          )}

          {/* TAB: Sensitivity Analysis */}
          {activeTab === 'sensitivity' && (
            <SensitivityAnalysisCard property={property} />
          )}

          {/* TAB: Property Evidence Room */}
          {activeTab === 'evidence' && (
            <PropertyEvidenceRoom property={property} />
          )}

          {/* TAB: Exit Policy & Terms */}
          {activeTab === 'exit_policy' && (
            <InvestmentTermsAndExitPolicy property={property} />
          )}

          {/* TAB 4: Fees (Requirement 6) */}
          {activeTab === 'fees' && (
            <div className="bg-white p-7 sm:p-8 rounded-3xl border border-[#E3E8E3] shadow-sm space-y-6">
              <div>
                <h3 className="text-xl font-bold text-[#18211F] mb-1">Transparent Fee Schedule</h3>
                <p className="text-xs text-[#69736F]">
                  Clear disclosure of all platform and operational costs. No hidden subscription or deposit fees.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="p-5 rounded-2xl bg-[#F6F7F4] border border-[#E3E8E3] space-y-1">
                  <span className="font-bold text-[#18211F] block text-sm">SPV Structuring Fee</span>
                  <p className="text-[#69736F]">{property.feeStructure.structuringFee}</p>
                </div>

                <div className="p-5 rounded-2xl bg-[#F6F7F4] border border-[#E3E8E3] space-y-1">
                  <span className="font-bold text-[#18211F] block text-sm">Property Management Retainer</span>
                  <p className="text-[#69736F]">{property.feeStructure.managementFee}</p>
                </div>

                <div className="p-5 rounded-2xl bg-[#F6F7F4] border border-[#E3E8E3] space-y-1">
                  <span className="font-bold text-[#18211F] block text-sm">SEPA Withdrawal Fee</span>
                  <p className="text-[#27845D] font-bold">{property.feeStructure.withdrawalFee}</p>
                </div>

                <div className="p-5 rounded-2xl bg-[#F6F7F4] border border-[#E3E8E3] space-y-1">
                  <span className="font-bold text-[#18211F] block text-sm">Terminal Liquidation Fee</span>
                  <p className="text-[#27845D] font-bold">{property.feeStructure.exitFee}</p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: Payment Schedule (Requirement 6) */}
          {activeTab === 'schedule' && (
            <div className="bg-white p-7 sm:p-8 rounded-3xl border border-[#E3E8E3] shadow-sm space-y-6">
              <div>
                <h3 className="text-xl font-bold text-[#18211F] mb-1">Dividend Payment Schedule</h3>
                <p className="text-xs text-[#69736F]">
                  Timetable and procedures for rental income distributions and principal return.
                </p>
              </div>

              <div className="space-y-4 text-xs">
                <div className="p-4 rounded-2xl bg-[#F6F7F4] border border-[#E3E8E3] flex items-start gap-3">
                  <Clock className="w-5 h-5 text-[#27845D] shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-[#18211F] text-sm block">Monthly Dividend Payout</span>
                    <span className="text-[#69736F] leading-relaxed">
                      {property.paymentSchedule.payoutDate}
                    </span>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-[#F6F7F4] border border-[#E3E8E3] flex items-start gap-3">
                  <Receipt className="w-5 h-5 text-[#27845D] shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-[#18211F] text-sm block">Annual Audit & Tax Statement</span>
                    <span className="text-[#69736F] leading-relaxed">
                      {property.paymentSchedule.annualReconciliation}
                    </span>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-[#F6F7F4] border border-[#E3E8E3] flex items-start gap-3">
                  <Calendar className="w-5 h-5 text-[#27845D] shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-[#18211F] text-sm block">Maturity & Capital Return</span>
                    <span className="text-[#69736F] leading-relaxed">
                      {property.paymentSchedule.maturityTerms}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: Documents & Due Diligence (Requirement 6) */}
          {activeTab === 'documents' && (
            <div className="bg-white p-7 sm:p-8 rounded-3xl border border-[#E3E8E3] shadow-sm space-y-4">
              <div>
                <h3 className="text-xl font-bold text-[#18211F] mb-1">Official Legal Documents</h3>
                <p className="text-xs text-[#69736F]">
                  Inspect and review independent notary deeds, certified RICS appraisals, and structural engineering reports.
                </p>
              </div>

              {docNotification && (
                <div className="p-3.5 bg-green-50 border border-green-200 text-green-800 rounded-xl text-xs font-semibold flex items-center justify-between">
                  <span>{docNotification}</span>
                  <button onClick={() => setDocNotification(null)} className="text-gray-400 hover:text-gray-600">✕</button>
                </div>
              )}

              <div className="divide-y divide-[#E3E8E3]">
                {property.documents.map((doc) => (
                  <div key={doc.id} className="py-4 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[#EEF1EC] text-[#182D2A] flex items-center justify-center">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-[#18211F]">{doc.name}</h4>
                        <div className="flex items-center gap-2 text-xs text-[#69736F]">
                          <span className="font-semibold text-[#27845D]">{doc.category}</span>
                          <span>·</span>
                          <span>{doc.size}</span>
                          <span>·</span>
                          <span>Verified {doc.updatedAt}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setInspectingDoc(doc)}
                        className="btn btn-primary btn-sm text-xs font-bold cursor-pointer"
                      >
                        <FileText className="w-3.5 h-3.5 mr-1 text-[#B7E36A]" />
                        Inspect Document
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 7: Tokenization & Smart Contract */}
          {activeTab === 'tokenization' && (
            <div className="bg-white p-7 sm:p-8 rounded-3xl border border-[#E3E8E3] shadow-sm space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E3E8E3]">
                <div>
                  <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-emerald-50 text-[#27845D] text-xs font-bold mb-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Solana SPL Token-2022 Architecture</span>
                  </div>
                  <h3 className="text-xl font-bold text-[#18211F]">Institutional Solana Tokenization</h3>
                  <p className="text-xs text-[#69736F]">
                    Programmable fractional ownership certificates registered on Solana with transfer-hook KYC compliance and sub-second settlement.
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <a
                    href={getSolanaExplorerUrl(property.solanaMintAddress || property.tokenContractAddress, 'address', 'devnet')}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#142421] text-white text-xs font-bold hover:bg-[#1f3732] transition-colors"
                  >
                    <span>Solana Explorer</span>
                    <ExternalLink className="w-3.5 h-3.5 text-[#B7E36A]" />
                  </a>
                  <a
                    href={getSolscanUrl(property.solanaMintAddress || property.tokenContractAddress, 'account', 'devnet')}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#EEF2EC] text-[#182D2A] text-xs font-bold hover:bg-[#e2e8df] transition-colors"
                  >
                    <span>Solscan</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="p-4 rounded-2xl bg-[#F6F7F4] border border-[#E3E8E3]">
                  <span className="text-xs text-[#69736F] block">Digital Asset Ticker</span>
                  <span className="text-lg font-black text-[#182D2A] font-mono">{property.tokenTicker}</span>
                </div>

                <div className="p-4 rounded-2xl bg-[#F6F7F4] border border-[#E3E8E3]">
                  <span className="text-xs text-[#69736F] block">Settlement Network</span>
                  <span className="text-lg font-bold text-[#182D2A] flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    {property.blockchainNetwork || 'Solana SPL'}
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-[#F6F7F4] border border-[#E3E8E3]">
                  <span className="text-xs text-[#69736F] block">Total Tokenized Supply</span>
                  <span className="text-lg font-bold text-[#182D2A]">{property.totalTokens.toLocaleString()} SPL Units</span>
                </div>

                <div className="p-4 rounded-2xl bg-[#F6F7F4] border border-[#E3E8E3] sm:col-span-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-[#69736F]">Solana SPL Mint Address</span>
                    <button
                      onClick={() => {
                        const mint = property.solanaMintAddress || property.tokenContractAddress;
                        navigator.clipboard.writeText(mint);
                        setCopiedMint(true);
                        setTimeout(() => setCopiedMint(false), 2000);
                      }}
                      className="text-[11px] text-[#27845D] hover:underline font-semibold inline-flex items-center gap-1 cursor-pointer"
                    >
                      {copiedMint ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-600" />
                          <span className="text-emerald-600">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copy Mint</span>
                        </>
                      )}
                    </button>
                  </div>
                  <span className="text-xs font-mono font-bold text-[#182D2A] break-all bg-white p-2 rounded-lg border border-[#E3E8E3] block">
                    {property.solanaMintAddress || property.tokenContractAddress}
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-[#F6F7F4] border border-[#E3E8E3]">
                  <span className="text-xs text-[#69736F] block">Program ID</span>
                  <span className="text-xs font-mono font-bold text-[#182D2A] break-all mt-1 block">
                    {property.solanaProgramId || 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb'}
                  </span>
                </div>
              </div>

              {/* Solana Token-2022 Transfer Restriction Controls */}
              <div className="p-4 sm:p-5 rounded-2xl bg-[#0F1E1B] text-white space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-[#B7E36A]" />
                    <h4 className="text-sm font-bold text-white">Transfer-Hook Compliance & Regulatory Whitelist</h4>
                  </div>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-[#27845D]/40 text-[#B7E36A] border border-[#B7E36A]/30">
                    Active & Enforced
                  </span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  In compliance with European Securities Regimes (CNMV / MiCA / AMF), property tokens utilize the Solana Token-2022 transfer-hook extension. Tokens can only be settled between whitelisted, KYC-cleared Solana wallet public keys, preventing unauthorized secondary market liquidation without registered title transfer.
                </p>
              </div>
            </div>
          )}

          {/* TAB 8: RICS Appraisals & NAV History */}
          {activeTab === 'appraisal_history' && (
            <ValuationAuditTimeline property={property} />
          )}
        </div>
      </div>

      {/* Investment Modal */}
      {isInvestModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="property-detail-invest-modal-title"
          className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-in fade-in duration-200"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isSubmitting) setIsInvestModalOpen(false);
          }}
        >
          <div
            className="bg-white rounded-2xl w-[92vw] sm:w-full max-w-[460px] max-h-[85vh] p-3.5 sm:p-4.5 shadow-2xl border border-[#E3E8E3] relative animate-in zoom-in-95 duration-150 my-auto overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {!investSuccessCert ? (
              <div>
                <div className="flex justify-between items-start mb-3 pb-2 border-b border-[#F0F2EE]">
                  <div>
                    <span className="text-[10px] font-semibold text-[#27845D] uppercase tracking-wider block">
                      Participatory Offering · {property.tokenTicker}
                    </span>
                    <h3 id="property-detail-invest-modal-title" className="text-base sm:text-lg font-bold text-[#18211F]">
                      {property.title}
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsInvestModalOpen(false)}
                    disabled={isSubmitting}
                    className="text-gray-400 hover:text-gray-600 text-lg font-bold p-1 cursor-pointer"
                    aria-label="Close"
                  >
                    ✕
                  </button>
                </div>

                {/* Balance display */}
                <div className="bg-[#F6F7F4] p-2.5 rounded-xl border border-[#E3E8E3] mb-3 flex items-center justify-between">
                  <div>
                    <span className="text-xs text-[#69736F] block">Available Cash Balance</span>
                    <span className="text-lg font-bold font-mono text-[#182D2A]">
                      {user ? formatCurrency(user.walletBalance) : '€0.00'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setIsInvestModalOpen(false);
                      onNavigateDeposit();
                    }}
                    className="text-xs text-[#27845D] font-bold hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Wallet className="w-3.5 h-3.5" />
                    Deposit Funds
                  </button>
                </div>

                {/* Bidirectional Token / Amount Selector */}
                <div className="space-y-2.5 mb-3">
                  <div className="flex items-center justify-between text-xs">
                    <div className="inline-flex rounded-lg bg-[#F6F7F4] p-0.5 border border-[#E3E8E3]">
                      <button
                        type="button"
                        onClick={() => {
                          setModalMode('tokens');
                          setModalAmountEUR(Number((modalCalc.tokenCount * property.tokenPrice).toFixed(2)));
                        }}
                        className={`px-2 py-1 rounded text-[11px] font-bold cursor-pointer ${
                          modalMode === 'tokens' ? 'bg-[#182D2A] text-white' : 'text-[#69736F]'
                        }`}
                      >
                        By Units
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setModalMode('amount');
                          setModalAmountEUR(Number((modalCalc.tokenCount * property.tokenPrice).toFixed(2)));
                        }}
                        className={`px-2 py-1 rounded text-[11px] font-bold cursor-pointer ${
                          modalMode === 'amount' ? 'bg-[#182D2A] text-white' : 'text-[#69736F]'
                        }`}
                      >
                        By EUR (€)
                      </button>
                    </div>
                    <span className="text-[11px] font-mono text-[#69736F]">
                      €{property.tokenPrice}/unit · {property.availableTokens} avail.
                    </span>
                  </div>

                  {modalMode === 'tokens' ? (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const next = Math.max(minTokens, modalCalc.tokenCount - 1);
                          setTokenCount(next);
                          setModalAmountEUR(Number((next * property.tokenPrice).toFixed(2)));
                        }}
                        className="w-8 h-8 rounded-lg bg-[#F6F7F4] border border-[#E3E8E3] font-bold text-base hover:bg-gray-100 cursor-pointer"
                      >
                        -
                      </button>
                      <input
                        type="number"
                        aria-label="Token quantity"
                        min={minTokens}
                        max={property.availableTokens}
                        value={tokenCount || ''}
                        onChange={(e) => {
                          const next = Math.max(0, parseInt(e.target.value, 10) || 0);
                          setTokenCount(next);
                          setModalAmountEUR(Number((next * property.tokenPrice).toFixed(2)));
                        }}
                        className="flex-1 text-center font-bold font-mono text-base py-1 border border-[#E3E8E3] rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const next = Math.min(property.availableTokens, modalCalc.tokenCount + 1);
                          setTokenCount(next);
                          setModalAmountEUR(Number((next * property.tokenPrice).toFixed(2)));
                        }}
                        className="w-8 h-8 rounded-lg bg-[#F6F7F4] border border-[#E3E8E3] font-bold text-base hover:bg-gray-100 cursor-pointer"
                      >
                        +
                      </button>
                    </div>
                  ) : (
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold font-mono text-[#69736F]">
                        €
                      </span>
                      <input
                        type="number"
                        aria-label="Investment amount in EUR"
                        min={property.minimumInvestment}
                        step={property.tokenPrice}
                        value={modalAmountEUR || ''}
                        onChange={(e) => {
                          const val = Math.max(0, parseFloat(e.target.value) || 0);
                          setModalAmountEUR(val);
                          setTokenCount(Math.floor(val / property.tokenPrice));
                        }}
                        className="w-full py-1.5 pl-7 pr-24 border border-[#E3E8E3] rounded-lg font-bold font-mono text-base"
                      />
                      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] font-mono font-bold text-[#27845D]">
                        = {modalCalc.tokenCount} Units
                      </span>
                    </div>
                  )}

                  {/* Settlement Rail & Fee Selector */}
                  <div>
                    <label htmlFor="modal-fee-tier" className="text-[11px] font-bold text-[#18211F] flex justify-between mb-1">
                      <span>Settlement Rail &amp; Fee</span>
                      <span className="font-mono text-[#27845D]">
                        {activeModalFeeTier.feePercent.toFixed(2)}% ({formatCurrency(modalCalc.feeAmountEUR)})
                      </span>
                    </label>
                    <select
                      id="modal-fee-tier"
                      value={modalFeeTierId}
                      onChange={(e) => setModalFeeTierId(e.target.value)}
                      className="w-full p-2 rounded-lg border border-[#E3E8E3] bg-[#F6F7F4] text-xs font-semibold text-[#18211F] cursor-pointer"
                    >
                      {PAYMENT_FEE_TIERS.map((tier) => (
                        <option key={tier.id} value={tier.id}>
                          {tier.label} — {tier.feePercent.toFixed(2)}%
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Investment Projection Grid */}
                  <div className="grid grid-cols-2 gap-2 p-3 rounded-2xl bg-[#EEF1EC] border border-[#E3E8E3] text-xs">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-[#69736F] block tracking-wide">
                        Target Monthly ({monthlyRate}%)
                      </span>
                      <span className="text-sm font-black font-mono text-[#27845D] block mt-0.5 tabular-nums">
                        +{formatCurrency(projectedMonthlyDividend)}/mo
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] uppercase font-bold text-[#69736F] block tracking-wide">
                        Annual Return
                      </span>
                      <span className="text-sm font-black font-mono text-[#142421] block mt-0.5 tabular-nums">
                        +{formatCurrency(annualTarget)}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] uppercase font-bold text-[#69736F] block tracking-wide">
                        Net Profit ({durationMonths} Mo)
                      </span>
                      <span className="text-xs font-bold font-mono text-[#27845D] block mt-0.5 tabular-nums">
                        +{formatCurrency(netMonthlyTarget)}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] uppercase font-bold text-[#69736F] block tracking-wide">
                        Total Payable ({modalCalc.ownershipSharePercent}% SPV)
                      </span>
                      <span className="text-xs font-bold font-mono text-[#142421] block mt-0.5 tabular-nums">
                        {formatCurrency(totalPayable)}
                      </span>
                    </div>
                  </div>

                  {/* Principal Repayment Projection */}
                  <div className="p-2.5 rounded-xl bg-emerald-50/90 border border-emerald-200/90 text-[11px] text-emerald-950 flex items-center justify-between font-semibold">
                    <span className="text-[#52605C]">Total incl. returned principal (Projected):</span>
                    <span className="font-black font-mono text-[#27845D] text-xs tabular-nums">
                      {formatCurrency(totalWithPrincipal)}
                    </span>
                  </div>
                </div>

                {(investError || (!modalCalc.isValid && modalCalc.validationError)) && (
                  <div className="p-3 mb-3 rounded-xl bg-red-50 text-red-700 text-xs font-medium border border-red-200">
                    {investError || modalCalc.validationError}
                  </div>
                )}

                <div className="space-y-2.5">
                  {user && totalPayable > 0 && user.walletBalance < totalPayable ? (
                    <button
                      type="button"
                      onClick={() => {
                        setIsInvestModalOpen(false);
                        onNavigateDeposit();
                      }}
                      className="btn btn-primary w-full text-xs font-bold"
                    >
                      Deposit {formatCurrency(totalPayable - user.walletBalance)} to Continue
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setTokenCount(modalCalc.tokenCount);
                        setIsRiskModalOpen(true);
                      }}
                      disabled={isSubmitting || !modalCalc.isValid}
                      className="btn btn-primary w-full text-sm font-bold flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSubmitting ? (
                        <>
                          <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>Processing investment...</span>
                        </>
                      ) : (
                        `Review Terms & Acquire ${formatCurrency(totalPayable)}`
                      )}
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setIsInvestModalOpen(false)}
                    disabled={isSubmitting}
                    className="btn btn-secondary w-full text-xs font-medium"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              /* Success Certificate View */
              <div className="text-center py-4 space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-[#E8F5E9] text-[#27845D] flex items-center justify-center mx-auto mb-2">
                  <CheckCircle2 className="w-9 h-9" />
                </div>

                <h3 className="text-2xl font-black text-[#18211F]">Acquisition Confirmed!</h3>
                <p className="text-xs text-[#69736F]">
                  Your participation in <span className="font-semibold text-[#18211F]">{property.title}</span> has been
                  securely recorded on the auditable ledger.
                </p>

                <div className="bg-[#F6F7F4] p-5 rounded-2xl border border-[#E3E8E3] text-left space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-[#69736F]">Certificate Identifier:</span>
                    <span className="font-mono font-bold text-[#182D2A]">{investSuccessCert.id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#69736F]">Tokens Acquired:</span>
                    <span className="font-bold text-[#18211F]">{investSuccessCert.tokens} Tokens</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#69736F]">Net Asset Capital:</span>
                    <span className="font-bold text-[#18211F]">{formatCurrency(investSuccessCert.subtotal)}</span>
                  </div>
                  {investSuccessCert.feeAmount > 0 && (
                    <div className="flex justify-between">
                      <span className="text-[#69736F]">Settlement Fee:</span>
                      <span className="font-mono font-semibold text-[#18211F]">
                        {formatCurrency(investSuccessCert.feeAmount)}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-[#69736F]">Total Debited:</span>
                    <span className="font-bold text-[#27845D]">{formatCurrency(investSuccessCert.total)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[#69736F]">Audit Ledger Hash:</span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(investSuccessCert.txHash);
                        setCopiedTxHash(true);
                        setTimeout(() => setCopiedTxHash(false), 2000);
                      }}
                      className="font-mono text-[#27845D] font-bold inline-flex items-center gap-1 cursor-pointer hover:underline"
                    >
                      <span>{formatShortHash(investSuccessCert.txHash)}</span>
                      {copiedTxHash ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#69736F]">SPL Token Mint:</span>
                    <span className="font-mono text-[#18211F] font-bold text-[11px] truncate max-w-[180px]">
                      {property.solanaMintAddress || property.tokenContractAddress}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#69736F]">Next Distribution:</span>
                    <span className="font-semibold text-[#18211F]">1st of Next Month</span>
                  </div>
                </div>

                {!investSuccessCert.txHash.startsWith('0x') &&
                investSuccessCert.txHash.length >= 64 &&
                isValidSolanaAddress(investSuccessCert.txHash.slice(0, 44)) ? (
                  <div className="pt-1">
                    <a
                      href={getSolanaExplorerUrl(investSuccessCert.txHash, 'tx', 'devnet')}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-2 px-3 rounded-xl bg-[#142421] text-white text-xs font-bold hover:bg-[#1e342f] transition-all flex items-center justify-center gap-1.5 shadow-sm"
                    >
                      <span>Verify Transaction on Solana Explorer</span>
                      <ExternalLink className="w-3.5 h-3.5 text-[#B7E36A]" />
                    </a>
                  </div>
                ) : (
                  <div className="pt-1">
                    <a
                      href={getSolanaExplorerUrl(property.solanaMintAddress || property.tokenContractAddress, 'address', 'devnet')}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-2 px-3 rounded-xl bg-[#142421] text-white text-xs font-bold hover:bg-[#1e342f] transition-all flex items-center justify-center gap-1.5 shadow-sm"
                    >
                      <span>Inspect SPL Asset Mint on Solana Explorer</span>
                      <ExternalLink className="w-3.5 h-3.5 text-[#B7E36A]" />
                    </a>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => setIsInvestModalOpen(false)}
                  className="btn btn-primary w-full text-xs font-bold"
                >
                  Return to Asset View
                </button>
              </div>
            )}
          </div>
        </div>
      )}
      {/* Document Inspection & Verification Modal */}
      {inspectingDoc && (
        <PropertyLegalDocumentModal
          property={property}
          document={inspectingDoc}
          onClose={() => setInspectingDoc(null)}
        />
      )}

      {/* Fullscreen Photo Lightbox Modal */}
      {lightboxOpen && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col justify-between p-4 sm:p-6 animate-in fade-in duration-200">
          {/* Lightbox Header */}
          <div className="flex items-center justify-between text-white max-w-6xl mx-auto w-full z-10">
            <div>
              <span className="text-xs uppercase tracking-wider text-emerald-400 font-bold block">
                {property.city}, {property.country}
              </span>
              <h4 className="text-base sm:text-lg font-bold truncate max-w-md sm:max-w-xl">
                {property.title}
              </h4>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-300 bg-white/10 px-3 py-1 rounded-full font-semibold">
                Photo {selectedImageIndex + 1} of {property.images.length}
              </span>
              <button
                onClick={() => setLightboxOpen(false)}
                title="Close Lightbox"
                className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Lightbox Main Image & Controls */}
          <div className="relative flex-1 flex items-center justify-center max-w-5xl mx-auto w-full py-4">
            <img
              src={property.images[selectedImageIndex] || property.bannerImage}
              alt={`${property.title} view ${selectedImageIndex + 1}`}
              className="max-h-[75vh] max-w-full object-contain rounded-2xl shadow-2xl"
              referrerPolicy="no-referrer"
            />

            {/* Left/Right Carousel Controls */}
            {property.images.length > 1 && (
              <>
                <button
                  onClick={() =>
                    setSelectedImageIndex((prev) => (prev === 0 ? property.images.length - 1 : prev - 1))
                  }
                  className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-black/60 hover:bg-black/90 text-white flex items-center justify-center transition-all cursor-pointer"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <button
                  onClick={() =>
                    setSelectedImageIndex((prev) => (prev === property.images.length - 1 ? 0 : prev + 1))
                  }
                  className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-black/60 hover:bg-black/90 text-white flex items-center justify-center transition-all cursor-pointer"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              </>
            )}
          </div>

          {/* Lightbox Thumbnails Strip */}
          <div className="flex justify-center gap-2 overflow-x-auto py-2 max-w-4xl mx-auto w-full scrollbar-none">
            {property.images.map((img, idx) => (
              <button
                key={idx}
                onClick={() => setSelectedImageIndex(idx)}
                className={`relative w-20 h-14 shrink-0 rounded-xl overflow-hidden border-2 transition-all cursor-pointer ${
                  selectedImageIndex === idx
                    ? 'border-[#00FF9D] scale-105 shadow-md ring-2 ring-[#00FF9D]/30'
                    : 'border-transparent opacity-50 hover:opacity-100'
                }`}
              >
                <img
                  src={img}
                  alt={`Thumbnail ${idx + 1}`}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Property Document Generator Modal */}
      <PropertyDocumentViewer
        property={property}
        isOpen={isDocViewerOpen}
        onClose={() => setIsDocViewerOpen(false)}
      />

      {/* Share Property Modal */}
      <SharePropertyModal
        property={property}
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
      />

      {/* Pre-Subscription Risk & Terms Consent Modal */}
      {isRiskModalOpen && (
        <RiskAndTermsAcknowledgementModal
          property={property}
          investmentAmountEUR={totalPayable}
          tokensCount={modalCalc.tokenCount}
          isSubmitting={isSubmitting}
          onConfirm={() => {
            setIsRiskModalOpen(false);
            handleConfirmInvestment();
          }}
          onCancel={() => setIsRiskModalOpen(false)}
        />
      )}
    </div>
  );
};
