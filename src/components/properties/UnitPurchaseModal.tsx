import React, { useState, useEffect } from 'react';
import { Property } from '../../types/property';
import { formatCurrency, formatPercent } from '../../lib/utils';
import { X, ShieldCheck, AlertCircle, ArrowRight, Wallet, RefreshCw, CheckCircle2, Building2, Crown, Sparkles, Plus, Minus, Printer, Download, FileText, Loader2, Award } from 'lucide-react';
import { useAuth } from '../../lib/auth';
import { ledger } from '../../lib/ledger';
import { 
  buildInvestmentAgreementData, 
  downloadAgreementPdf, 
  printAgreementDocument 
} from '../../lib/investmentAgreementService';
import { InvestmentAgreementModal } from '../agreements/InvestmentAgreementModal';

interface UnitPurchaseModalProps {
  property: Property;
  allProperties?: Property[];
  isOpen: boolean;
  onClose: () => void;
  mode?: 'purchase' | 'reinvest';
  onSuccess?: () => void;
  onOpenDeposit?: () => void;
}

export const UnitPurchaseModal: React.FC<UnitPurchaseModalProps> = ({
  property: initialProperty,
  allProperties = [],
  isOpen,
  onClose,
  mode = 'purchase',
  onSuccess,
  onOpenDeposit
}) => {
  const { user, refreshUser } = useAuth();
  
  const [selectedProperty, setSelectedProperty] = useState<Property>(initialProperty);
  const [tokenCount, setTokenCount] = useState<number>(
    Math.ceil((initialProperty.minimumInvestment || 750) / initialProperty.tokenPrice)
  );
  const [isConfirmStep, setIsConfirmStep] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successResult, setSuccessResult] = useState<any | null>(null);
  const [showAgreementModal, setShowAgreementModal] = useState<boolean>(false);
  const [isPrintingAgreement, setIsPrintingAgreement] = useState<boolean>(false);
  const [isDownloadingAgreement, setIsDownloadingAgreement] = useState<boolean>(false);

  const handleImmediatePrint = async () => {
    if (!successResult) return;
    try {
      setIsPrintingAgreement(true);
      const data = await buildInvestmentAgreementData(successResult, selectedProperty, user);
      printAgreementDocument(data);
    } catch (err) {
      console.error('Failed to print investment agreement:', err);
    } finally {
      setIsPrintingAgreement(false);
    }
  };

  const handleImmediateDownload = async () => {
    if (!successResult) return;
    try {
      setIsDownloadingAgreement(true);
      const data = await buildInvestmentAgreementData(successResult, selectedProperty, user);
      await downloadAgreementPdf(data);
    } catch (err) {
      console.error('Failed to download agreement PDF:', err);
    } finally {
      setIsDownloadingAgreement(false);
    }
  };

  // Sync selected property when initialProperty changes
  useEffect(() => {
    if (initialProperty) {
      setSelectedProperty(initialProperty);
      setTokenCount(Math.ceil((initialProperty.minimumInvestment || 750) / initialProperty.tokenPrice));
    }
    setIsConfirmStep(false);
    setError(null);
    setSuccessResult(null);
  }, [initialProperty, isOpen]);

  if (!isOpen || !selectedProperty) return null;

  const userBalance = user?.walletBalance ?? 0;
  const tokenPrice = selectedProperty.tokenPrice || 364;
  const totalCost = tokenCount * tokenPrice;
  const structuringFee = 0; // Included in target capitalization as per prospectus
  const totalPayable = totalCost + structuringFee;
  const remainingBalance = userBalance - totalPayable;
  const isInsufficient = userBalance < totalPayable || userBalance === 0;

  const minTokensRequired = Math.ceil((selectedProperty.minimumInvestment || 750) / tokenPrice);
  const maxAvailable = selectedProperty.availableTokens || 0;

  const monthlyTargetPercentage = selectedProperty.monthlyTargetRate || 6.1;
  const durationMonths = selectedProperty.durationMonths || 25;
  // monthly target = investment cost × monthly percentage ÷ 100
  const monthlyTarget = Number(((totalCost * monthlyTargetPercentage) / 100).toFixed(2));
  // annual target = monthly target × 12
  const annualTarget = Number((monthlyTarget * 12).toFixed(2));
  // net monthly target = monthly target × durationMonths (odd term 5 to 57 months)
  const netMonthlyTarget = Number((monthlyTarget * durationMonths).toFixed(2));
  // total including separately returned principal = investment cost + net monthly target
  const totalWithPrincipal = Number((totalCost + netMonthlyTarget).toFixed(2));

  const handleUnitChange = (val: number) => {
    setError(null);
    if (isNaN(val) || val < 1) {
      setTokenCount(1);
    } else {
      setTokenCount(Math.min(val, maxAvailable));
    }
  };

  const handleProceedToConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (tokenCount < minTokensRequired) {
      setError(`Minimum purchase for ${selectedProperty.title} is ${minTokensRequired} units (${formatCurrency(selectedProperty.minimumInvestment)}).`);
      return;
    }

    if (tokenCount > maxAvailable) {
      setError(`Only ${maxAvailable} units remain available in this property allocation.`);
      return;
    }

    if (isInsufficient) {
      setError(`Insufficient available balance. You have ${formatCurrency(userBalance)}, but need ${formatCurrency(totalPayable)}.`);
      return;
    }

    setIsConfirmStep(true);
  };

  const handleExecuteOrder = async () => {
    if (!user) {
      setError('Authentication required to execute property unit orders.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Execute atomic transaction via ledger service (and backend POST /api/v1/investments)
      const investment = await ledger.executeInvestment(
        user.id,
        selectedProperty.id,
        tokenCount
      );

      // Refresh user balance and state
      if (refreshUser) {
        await refreshUser();
      }

      setSuccessResult(investment);
      if (onSuccess) {
        onSuccess();
      }
    } catch (err: any) {
      console.error('Unit purchase error:', err);
      setError(err.message || 'An unexpected transaction error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-fadeIn">
      <div className="relative w-full max-w-lg bg-white rounded-xl shadow-2xl border border-[#E3E8E3] overflow-hidden my-6">
        
        {/* Header Bar */}
        <div className="p-3.5 sm:p-4 bg-[#142421] text-white flex items-center justify-between border-b border-white/10">
          <div className="flex items-center gap-2.5 min-w-0 pr-2">
            <div className={`p-2 rounded-lg shrink-0 ${mode === 'reinvest' ? 'bg-[#B7E36A]/20 text-[#B7E36A]' : 'bg-[#27845D]/30 text-emerald-400'}`}>
              {mode === 'reinvest' ? <RefreshCw className="w-4 h-4" /> : <Building2 className="w-4 h-4" />}
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-bold leading-tight text-white truncate">
                {mode === 'reinvest' ? 'Reinvest Account Balance' : 'Buy Property Units'}
              </h2>
              <p className="text-[11px] text-emerald-200/80 font-mono truncate">
                {selectedProperty.tokenTicker} · {selectedProperty.title}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/10 text-white/70 hover:text-white transition-colors cursor-pointer shrink-0"
            aria-label="Close dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-3.5 sm:p-4 space-y-3.5 max-h-[80vh] overflow-y-auto">

          {/* Success State Screen */}
          {successResult ? (
            <div className="py-2 text-center space-y-3">
              <div className="w-11 h-11 bg-emerald-100 text-[#27845D] rounded-full flex items-center justify-center mx-auto shadow-xs">
                <CheckCircle2 className="w-6 h-6" />
              </div>

              <div className="space-y-0.5">
                <h3 className="text-base sm:text-lg font-bold text-[#142421]">Investment Executed</h3>
                <p className="text-xs text-[#52605C]">
                  Acquired <strong className="text-[#142421] font-mono">{tokenCount} fractional units</strong> in {selectedProperty.title}.
                </p>
              </div>

              {/* Order Transaction Details */}
              <div className="p-3 rounded-xl bg-[#F6F7F4] border border-[#E3E8E3] text-left text-xs space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="text-[#69736F]">Certificate Ref:</span>
                  <span className="font-mono font-bold text-[#18211F]">{successResult.certificateId}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[#69736F]">Total Invested:</span>
                  <span className="font-bold font-mono text-[#27845D] text-sm">{formatCurrency(totalCost)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[#69736F]">Monthly Yield:</span>
                  <span className="font-bold font-mono text-[#142421]">+{formatCurrency(monthlyTarget)}/mo</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[#69736F]">Wallet Balance:</span>
                  <span className="font-bold font-mono text-[#142421]">{formatCurrency(userBalance)}</span>
                </div>
              </div>

              {/* Prominent Legal Agreement & Instant Print Section */}
              <div className="p-3 sm:p-3.5 rounded-xl bg-[#142421] text-white text-left space-y-2.5 shadow-xl border border-[#27845D]/40 max-w-lg mx-auto">
                <div className="flex items-center justify-between pb-1.5 border-b border-white/10">
                  <div className="flex items-center gap-2">
                    <Award className="w-4 h-4 text-[#B7E36A] shrink-0" />
                    <div>
                      <h4 className="text-xs font-bold uppercase text-white tracking-wide">
                        Legally Signed Investment Agreement
                      </h4>
                      <p className="text-[10px] text-emerald-200/80">
                        SPV Participatory Deed · eIDAS QES Digital Signature
                      </p>
                    </div>
                  </div>
                  <span className="text-[9.5px] font-semibold px-2 py-0.5 rounded bg-[#27845D]/40 text-[#B7E36A] border border-[#B7E36A]/30 shrink-0">
                    Signed & Sealed
                  </span>
                </div>

                <p className="text-[11px] text-slate-200 leading-normal">
                  Your legal agreement has been formally executed with qualified signatures by <strong className="text-white">Valentin Kretz</strong> (Managing Partner) under Spanish Commercial Registry jurisdiction. Print your signed agreement immediately for your records or save the official certified PDF.
                </p>

                {/* Primary Immediate Print and Download Buttons */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-0.5">
                  <button
                    onClick={handleImmediatePrint}
                    disabled={isPrintingAgreement}
                    className="w-full py-2 px-3 rounded-lg bg-white text-[#142421] hover:bg-slate-100 font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer disabled:opacity-50"
                  >
                    <Printer className="w-3.5 h-3.5 text-[#27845D]" />
                    <span>{isPrintingAgreement ? 'Preparing Print...' : 'Print Agreement Now'}</span>
                  </button>

                  <button
                    onClick={handleImmediateDownload}
                    disabled={isDownloadingAgreement}
                    className="w-full py-2 px-3 rounded-lg bg-[#27845D] hover:bg-[#1E6849] text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isDownloadingAgreement ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5 text-[#B7E36A]" />}
                    <span>{isDownloadingAgreement ? 'Generating PDF...' : 'Download Signed PDF'}</span>
                  </button>
                </div>

                <div className="pt-0.5 text-center">
                  <button
                    onClick={() => setShowAgreementModal(true)}
                    className="text-[11px] text-[#B7E36A] hover:underline font-semibold inline-flex items-center gap-1 cursor-pointer py-0.5"
                  >
                    <FileText className="w-3 h-3" />
                    <span>View Full Signed Legal Contract On Screen</span>
                  </button>
                </div>
              </div>

              <div className="pt-1 max-w-lg mx-auto">
                <button
                  onClick={onClose}
                  className="w-full py-2 px-3 bg-[#F6F7F4] hover:bg-[#EEF2EC] border border-[#E3E8E3] text-[#142421] font-semibold text-xs rounded-lg transition-all cursor-pointer"
                >
                  Return to Dashboard
                </button>
              </div>
            </div>
          ) : isConfirmStep ? (
            /* Step 2: Final Order Confirmation */
            <div className="space-y-3 animate-fadeIn">
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-medium space-y-0.5">
                <div className="flex items-center gap-1.5 font-bold text-amber-950 text-xs">
                  <ShieldCheck className="w-4 h-4 text-amber-700" />
                  <span>Review & Confirm Order</span>
                </div>
                <p className="text-[11px]">Please review your purchase details before final execution. All property units are ring-fenced within an SPV contract.</p>
              </div>

              <div className="p-3.5 rounded-xl bg-[#F6F7F4] border border-[#E3E8E3] space-y-2 text-xs">
                <div className="flex justify-between items-center pb-2 border-b border-[#E3E8E3]">
                  <span className="text-[#69736F] font-semibold">Selected Property:</span>
                  <span className="font-bold text-[#142421] text-xs sm:text-sm">{selectedProperty.title}</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-[#69736F] font-medium">Units Purchased:</span>
                  <span className="font-bold font-mono text-[#142421]">{tokenCount} Shares (@ {formatCurrency(tokenPrice)}/unit)</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-[#69736F] font-medium">Total Purchase Cost:</span>
                  <span className="font-bold font-mono text-[#142421]">{formatCurrency(totalCost)}</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-[#69736F] font-medium">Structuring Fees:</span>
                  <span className="font-semibold text-emerald-700">€0.00 (0% Included)</span>
                </div>

                <div className="flex justify-between items-center pt-2 border-t border-[#E3E8E3]">
                  <span className="font-bold text-[#142421]">Total Amount Payable:</span>
                  <span className="font-bold font-mono text-[#27845D] text-sm sm:text-base">{formatCurrency(totalPayable)}</span>
                </div>

                <div className="flex justify-between items-center text-xs text-[#52605C] pt-0.5">
                  <span>Current Available Balance:</span>
                  <span className="font-bold font-mono">{formatCurrency(userBalance)}</span>
                </div>

                <div className="flex justify-between items-center text-xs text-[#52605C]">
                  <span>Balance After Purchase:</span>
                  <span className={`font-bold font-mono ${remainingBalance >= 0 ? 'text-[#27845D]' : 'text-red-600'}`}>
                    {formatCurrency(remainingBalance)}
                  </span>
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {/* Confirmation Actions */}
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsConfirmStep(false)}
                  disabled={loading}
                  className="flex-1 py-2 px-3 bg-white border border-[#E3E8E3] hover:bg-[#F6F7F4] text-[#142421] text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                >
                  Back
                </button>

                <button
                  type="button"
                  onClick={handleExecuteOrder}
                  disabled={loading}
                  className="flex-[2] py-2 px-3 bg-[#27845D] hover:bg-[#1f6b4a] text-white text-xs font-bold rounded-lg transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>Confirm & Execute Investment</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            /* Step 1: Unit Calculator & Balance Validation */
            <form onSubmit={handleProceedToConfirm} className="space-y-3.5">
              
              {/* Property Summary Banner */}
              <div className="flex items-center gap-3 p-3 rounded-xl bg-[#F6F7F4] border border-[#E3E8E3]">
                <img
                  src={selectedProperty.images[0] || selectedProperty.bannerImage}
                  alt={selectedProperty.title}
                  className="w-14 h-14 rounded-lg object-cover shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <h4 className="text-xs sm:text-sm font-bold text-[#142421] truncate">{selectedProperty.title}</h4>
                  <p className="text-[11px] text-[#52605C] truncate">{selectedProperty.location}</p>
                  <div className="flex items-center gap-2 text-[11px] font-semibold text-[#27845D] mt-0.5">
                    <span className="font-mono">{formatPercent(selectedProperty.estimatedAnnualYield)} APY</span>
                    <span className="text-[#BCC5BD]">•</span>
                    <span>{selectedProperty.durationMonths} Months Term</span>
                  </div>
                </div>
              </div>

              {/* Balance Card */}
              <div className="p-3 rounded-xl bg-[#142421] text-white flex items-center justify-between shadow-xs">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-lg bg-white/10 text-[#B7E36A]">
                    <Wallet className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-semibold text-emerald-200/80 tracking-wide block">
                      Available Cash Balance
                    </span>
                    <span className="text-base sm:text-lg font-bold font-mono text-white tabular-nums">
                      {formatCurrency(userBalance)}
                    </span>
                  </div>
                </div>

                {mode === 'reinvest' && (
                  <span className="text-[10px] bg-[#B7E36A]/20 text-[#B7E36A] font-semibold px-2 py-0.5 rounded border border-[#B7E36A]/30">
                    Reinvestment Eligible
                  </span>
                )}
              </div>

              {/* Insufficient Funds Banner */}
              {isInsufficient && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-900 space-y-2 animate-fadeIn">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                    <div className="text-xs space-y-0.5">
                      <p className="font-bold text-red-950">Insufficient Account Funds</p>
                      <p className="text-[11px] text-red-800 leading-normal">
                        Your balance is <strong className="font-mono font-bold text-red-950">{formatCurrency(userBalance)}</strong>, but you need <strong className="font-mono font-bold text-red-950">{formatCurrency(totalPayable)}</strong>. Please fund your account to continue.
                      </p>
                    </div>
                  </div>

                  {onOpenDeposit && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenDeposit();
                      }}
                      className="w-full py-1.5 px-3 bg-red-600 hover:bg-red-700 text-white font-semibold text-xs rounded-lg transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Deposit Funds Now</span>
                    </button>
                  )}
                </div>
              )}

              {/* Property Selector for Reinvest Mode */}
              {mode === 'reinvest' && allProperties.length > 0 && (
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[#142421] block">
                    Select Target Property to Reinvest Into
                  </label>
                  <select
                    value={selectedProperty.id}
                    onChange={(e) => {
                      const found = allProperties.find(p => p.id === e.target.value);
                      if (found) setSelectedProperty(found);
                    }}
                    className="w-full p-2.5 rounded-lg border border-[#E3E8E3] bg-[#F6F7F4] text-xs font-semibold text-[#142421] focus:outline-none focus:ring-2 focus:ring-[#27845D]"
                  >
                    {allProperties.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.title} ({formatPercent(p.estimatedAnnualYield)} APY - {formatCurrency(p.tokenPrice)}/unit)
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Units Input Section */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <label className="font-semibold text-[#142421]">
                    Number of Property Units
                  </label>
                  <span className="text-[#69736F] font-mono text-[11px]">
                    {maxAvailable} units remaining
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleUnitChange(tokenCount - 1)}
                    disabled={tokenCount <= minTokensRequired}
                    className="p-2.5 rounded-lg border border-[#E3E8E3] bg-[#F6F7F4] hover:bg-[#E3E8E3] text-[#142421] font-bold disabled:opacity-40 cursor-pointer"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>

                  <div className="relative flex-1">
                    <input
                      type="number"
                      min={minTokensRequired}
                      max={maxAvailable}
                      value={tokenCount}
                      onChange={(e) => handleUnitChange(parseInt(e.target.value) || 0)}
                      className="w-full py-2 px-3 rounded-lg border border-[#E3E8E3] text-center text-base font-bold font-mono tabular-nums text-[#142421] focus:outline-none focus:ring-2 focus:ring-[#27845D]"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-[#69736F]">
                      Units
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleUnitChange(tokenCount + 1)}
                    disabled={tokenCount >= maxAvailable}
                    className="p-2.5 rounded-lg border border-[#E3E8E3] bg-[#F6F7F4] hover:bg-[#E3E8E3] text-[#142421] font-bold disabled:opacity-40 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="flex justify-between text-[11px] text-[#69736F] font-medium px-0.5">
                  <span>Price/unit: <strong className="font-mono">{formatCurrency(tokenPrice)}</strong></span>
                  <span>Min. purchase: <strong className="font-mono">{minTokensRequired} units ({formatCurrency(selectedProperty.minimumInvestment)})</strong></span>
                </div>
              </div>

              {/* Investment Projection Grid */}
              <div className="grid grid-cols-2 gap-2 p-3 rounded-xl bg-[#F6F7F4] border border-[#E3E8E3] text-xs">
                <div>
                  <span className="text-[10px] uppercase font-semibold text-[#69736F] block tracking-wide">
                    Est. Monthly Yield ({monthlyTargetPercentage}%)
                  </span>
                  <span className="text-sm font-bold font-mono text-[#27845D] block mt-0.5 tabular-nums">
                    +{formatCurrency(monthlyTarget)}/mo
                  </span>
                </div>

                <div>
                  <span className="text-[10px] uppercase font-semibold text-[#69736F] block tracking-wide">
                    Annual Return
                  </span>
                  <span className="text-sm font-bold font-mono text-[#142421] block mt-0.5 tabular-nums">
                    +{formatCurrency(annualTarget)}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] uppercase font-semibold text-[#69736F] block tracking-wide">
                    Net Target ({durationMonths} Mo)
                  </span>
                  <span className="text-xs font-bold font-mono text-[#27845D] block mt-0.5 tabular-nums">
                    +{formatCurrency(netMonthlyTarget)}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] uppercase font-semibold text-[#69736F] block tracking-wide">
                    Total Capital Outlay
                  </span>
                  <span className="text-xs font-bold font-mono text-[#142421] block mt-0.5 tabular-nums">
                    {formatCurrency(totalCost)}
                  </span>
                </div>
              </div>

              {/* Principal Repayment Notice */}
              <div className="p-2.5 rounded-lg bg-emerald-50/80 border border-emerald-200/80 text-[11px] text-emerald-950 flex items-center justify-between font-semibold">
                <span className="text-[#52605C]">Total with returned principal:</span>
                <span className="font-bold font-mono text-[#27845D] text-xs tabular-nums">{formatCurrency(totalWithPrincipal)}</span>
              </div>

              {/* Error Message */}
              {error && (
                <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {/* Proceed Button */}
              <button
                type="submit"
                disabled={isInsufficient || tokenCount < minTokensRequired}
                className="w-full py-2.5 px-3 bg-[#142421] hover:bg-[#1E332E] disabled:bg-slate-300 text-white font-bold text-xs rounded-lg transition-all cursor-pointer shadow-xs flex items-center justify-center gap-1.5 disabled:cursor-not-allowed"
              >
                <span>{isInsufficient ? 'Insufficient Funds' : 'Proceed to Confirmation'}</span>
                {!isInsufficient && <ArrowRight className="w-3.5 h-3.5" />}
              </button>
            </form>
          )}

        </div>
      </div>

      {/* Full Screen Interactive Investment Agreement Modal */}
      {successResult && (
        <InvestmentAgreementModal
          isOpen={showAgreementModal}
          onClose={() => setShowAgreementModal(false)}
          investment={successResult}
          property={selectedProperty}
          user={user}
        />
      )}
    </div>
  );
};
