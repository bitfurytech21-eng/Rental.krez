import React, { useState, useEffect, useMemo } from 'react';
import { Property } from '../../types/property';
import { formatCurrency, formatPercent } from '../../lib/utils';
import {
  X,
  ShieldCheck,
  AlertCircle,
  ArrowRight,
  Wallet,
  RefreshCw,
  CheckCircle2,
  Building2,
  Plus,
  Minus,
  Printer,
  Download,
  FileText,
  Loader2,
  Award,
  ExternalLink,
  Copy,
  Check,
  Calculator,
} from 'lucide-react';
import { useAuth } from '../../lib/auth';
import { ledger } from '../../lib/ledger';
import { investmentsApi } from '../../lib/api';
import { useToast } from '../../context/ToastContext';
import { getSolanaExplorerUrl, isValidSolanaAddress } from '../../lib/solanaService';
import {
  PAYMENT_FEE_TIERS,
  calculateLiveInvestmentBreakdown,
} from '../../lib/financialService';
import {
  buildInvestmentAgreementData,
  downloadAgreementPdf,
  printAgreementDocument,
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
  onOpenDeposit,
}) => {
  const { user, refreshUser } = useAuth();
  const { showToast } = useToast();

  const [selectedPropertyId, setSelectedPropertyId] = useState<string>(initialProperty.id);
  const [liveTick, setLiveTick] = useState<number>(0);

  const [inputMode, setInputMode] = useState<'tokens' | 'amount'>('tokens');
  const [tokenCount, setTokenCount] = useState<number>(
    Math.max(1, Math.ceil((initialProperty.minimumInvestment || 750) / (initialProperty.tokenPrice || 100)))
  );
  const [amountInputEUR, setAmountInputEUR] = useState<number>(
    Math.max(1, Math.ceil((initialProperty.minimumInvestment || 750) / (initialProperty.tokenPrice || 100))) *
      (initialProperty.tokenPrice || 100)
  );
  const [selectedFeeTierId, setSelectedFeeTierId] = useState<string>(PAYMENT_FEE_TIERS[0].id);

  const [isConfirmStep, setIsConfirmStep] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successResult, setSuccessResult] = useState<any | null>(null);
  const [orderSummarySnapshot, setOrderSummarySnapshot] = useState<{
    tokens: number;
    subtotal: number;
    feeAmount: number;
    totalPayable: number;
    monthlyYield: number;
    feeLabel: string;
  } | null>(null);
  const [idempotencyKey, setIdempotencyKey] = useState<string>('');
  const [copiedHash, setCopiedHash] = useState<boolean>(false);

  const [showAgreementModal, setShowAgreementModal] = useState<boolean>(false);
  const [isPrintingAgreement, setIsPrintingAgreement] = useState<boolean>(false);
  const [isDownloadingAgreement, setIsDownloadingAgreement] = useState<boolean>(false);

  useEffect(() => {
    return ledger.subscribe(() => setLiveTick((t) => t + 1));
  }, []);

  const selectedProperty = useMemo(() => {
    void liveTick;
    return (
      ledger.getPropertyById(selectedPropertyId) ||
      allProperties.find((p) => p.id === selectedPropertyId) ||
      initialProperty
    );
  }, [selectedPropertyId, allProperties, initialProperty, liveTick]);

  // Reset modal state when opened or initialProperty changes
  useEffect(() => {
    if (initialProperty && isOpen) {
      setSelectedPropertyId(initialProperty.id);
      const unitPrice = initialProperty.tokenPrice || 100;
      const minUnits = Math.max(1, Math.ceil((initialProperty.minimumInvestment || unitPrice) / unitPrice));
      setTokenCount(minUnits);
      setAmountInputEUR(Number((minUnits * unitPrice).toFixed(2)));
      setInputMode('tokens');
      setSelectedFeeTierId(PAYMENT_FEE_TIERS[0].id);
      setIsConfirmStep(false);
      setError(null);
      setSuccessResult(null);
      setOrderSummarySnapshot(null);
      setIdempotencyKey(`ord-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`);
    }
  }, [initialProperty, isOpen]);

  // Keyboard Escape support
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loading && !showAgreementModal) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, loading, showAgreementModal, onClose]);

  if (!isOpen || !selectedProperty) return null;

  const userBalance = user?.walletBalance ?? 0;
  const tokenPrice = selectedProperty.tokenPrice || 100;
  const minTokensRequired = Math.max(1, Math.ceil((selectedProperty.minimumInvestment || tokenPrice) / tokenPrice));
  const maxAvailable = Math.max(0, selectedProperty.availableTokens ?? 0);
  const monthlyTargetPercentage =
    selectedProperty.monthlyTargetRate ||
    Number(((selectedProperty.estimatedAnnualYield || 8.4) / 12).toFixed(2));
  const durationMonths = selectedProperty.durationMonths || 36;

  const activeFeeTier =
    PAYMENT_FEE_TIERS.find((t) => t.id === selectedFeeTierId) || PAYMENT_FEE_TIERS[0];

  const liveCalc = calculateLiveInvestmentBreakdown({
    mode: inputMode,
    tokenCountInput: tokenCount,
    investmentAmountInputEUR: amountInputEUR,
    tokenPriceEUR: tokenPrice,
    totalPropertyTokens: selectedProperty.totalTokens || Math.max(1, Math.floor(selectedProperty.targetAmount / tokenPrice)),
    availableTokens: maxAvailable,
    minimumInvestmentEUR: selectedProperty.minimumInvestment || tokenPrice,
    monthlyTargetRatePercent: monthlyTargetPercentage,
    durationMonths,
    capitalAppreciationYieldPercent: selectedProperty.capitalAppreciationYield || 0,
    feePercent: activeFeeTier.feePercent,
    fixedFeeEUR: activeFeeTier.fixedFeeEUR || 0,
    walletBalanceEUR: userBalance,
  });

  const effectiveTokens = liveCalc.tokenCount;
  const subtotalCost = liveCalc.subtotalEUR;
  const feeAmount = liveCalc.feeAmountEUR;
  const totalPayable = liveCalc.totalPayableEUR;
  const remainingBalance = Number((userBalance - totalPayable).toFixed(2));
  const isInsufficient = totalPayable > 0 ? userBalance < totalPayable : userBalance < (selectedProperty.minimumInvestment || tokenPrice);

  const handleUnitChange = (val: number) => {
    setError(null);
    setInputMode('tokens');
    const clamped = isNaN(val) || val < 0 ? 0 : maxAvailable > 0 ? Math.min(Math.floor(val), maxAvailable) : Math.floor(val);
    setTokenCount(clamped);
    setAmountInputEUR(Number((clamped * tokenPrice).toFixed(2)));
  };

  const handleAmountChange = (rawEur: number) => {
    setError(null);
    setInputMode('amount');
    const cleanEur = isNaN(rawEur) || rawEur < 0 ? 0 : rawEur;
    setAmountInputEUR(cleanEur);
    const derivedUnits = Math.floor(cleanEur / tokenPrice);
    setTokenCount(maxAvailable > 0 ? Math.min(derivedUnits, maxAvailable) : derivedUnits);
  };

  const handleImmediatePrint = async () => {
    if (!successResult) return;
    try {
      setIsPrintingAgreement(true);
      const data = await buildInvestmentAgreementData(successResult, selectedProperty, user);
      printAgreementDocument(data);
    } catch (err) {
      console.error('Failed to print investment agreement:', err);
      showToast('Unable to prepare print preview right now.', 'error');
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
      showToast('Signed Investment Agreement PDF downloaded.', 'success');
    } catch (err) {
      console.error('Failed to download agreement PDF:', err);
      showToast('Failed to generate PDF agreement.', 'error');
    } finally {
      setIsDownloadingAgreement(false);
    }
  };

  const handleProceedToConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (maxAvailable <= 0 || selectedProperty.status !== 'funding') {
      setError('This offering has no remaining primary units available for subscription.');
      return;
    }

    if (effectiveTokens < minTokensRequired) {
      setError(
        `Minimum purchase for ${selectedProperty.title} is ${minTokensRequired} units (${formatCurrency(
          selectedProperty.minimumInvestment
        )}).`
      );
      return;
    }

    if (effectiveTokens > maxAvailable) {
      setError(`Only ${maxAvailable} units remain available in this property allocation.`);
      return;
    }

    if (isInsufficient) {
      setError(
        `Insufficient available balance. You have ${formatCurrency(userBalance)}, but need ${formatCurrency(totalPayable)}.`
      );
      return;
    }

    setTokenCount(effectiveTokens);
    setAmountInputEUR(subtotalCost);
    setIsConfirmStep(true);
  };

  const handleExecuteOrder = async () => {
    if (loading) return;
    if (!user) {
      setError('Authentication required to execute property unit orders.');
      return;
    }

    setLoading(true);
    setError(null);

    const activeKey = idempotencyKey || `ord-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

    try {
      const investment = await ledger.executeInvestment(user.id, selectedProperty.id, effectiveTokens, {
        feePercent: activeFeeTier.feePercent,
        paymentMethod: mode === 'reinvest' ? `Reinvested Balance (${activeFeeTier.label})` : activeFeeTier.label,
        idempotencyKey: activeKey,
      });

      // Synchronize with backend API route when session is active
      investmentsApi
        .executeInvestment({
          propertyId: selectedProperty.id,
          tokensCount: effectiveTokens,
          paymentMethod: mode === 'reinvest' ? `Reinvested Balance (${activeFeeTier.label})` : activeFeeTier.label,
          feePercent: activeFeeTier.feePercent,
          idempotencyKey: activeKey,
        })
        .catch(() => {
          // Local double-entry ledger already committed; ignore if backend mock user balance differs
        });

      if (refreshUser) {
        await refreshUser();
      }

      setOrderSummarySnapshot({
        tokens: effectiveTokens,
        subtotal: subtotalCost,
        feeAmount,
        totalPayable,
        monthlyYield: liveCalc.monthlyDividendEUR,
        feeLabel: activeFeeTier.label,
      });
      setSuccessResult(investment);
      showToast(
        `Acquired ${effectiveTokens} ${selectedProperty.tokenTicker} units in ${selectedProperty.title}.`,
        'success'
      );

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

  const txHashStr: string = successResult?.transactionHash || '';
  const isGenuineOnChainTx =
    Boolean(txHashStr) && !txHashStr.startsWith('0x') && txHashStr.length >= 64 && isValidSolanaAddress(txHashStr.slice(0, 44));

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="unit-purchase-modal-title"
      className="fixed inset-0 z-50 overflow-y-auto bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) onClose();
      }}
    >
      <div
        className="relative w-full max-w-lg bg-white rounded-xl shadow-2xl border border-[#E3E8E3] overflow-hidden my-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="p-3.5 sm:p-4 bg-[#142421] text-white flex items-center justify-between border-b border-white/10">
          <div className="flex items-center gap-2.5 min-w-0 pr-2">
            <div
              className={`p-2 rounded-lg shrink-0 ${
                mode === 'reinvest' ? 'bg-[#B7E36A]/20 text-[#B7E36A]' : 'bg-[#27845D]/30 text-emerald-400'
              }`}
            >
              {mode === 'reinvest' ? <RefreshCw className="w-4 h-4" /> : <Building2 className="w-4 h-4" />}
            </div>
            <div className="min-w-0">
              <h2 id="unit-purchase-modal-title" className="text-sm sm:text-base font-bold leading-tight text-white truncate">
                {mode === 'reinvest' ? 'Reinvest Account Balance' : 'Buy Property Units'}
              </h2>
              <p className="text-[11px] text-emerald-200/80 font-mono truncate">
                {selectedProperty.tokenTicker} · {selectedProperty.title}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="p-1.5 rounded-lg hover:bg-white/10 text-white/70 hover:text-white transition-colors cursor-pointer shrink-0 disabled:opacity-40"
            aria-label="Close dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-3.5 sm:p-4 space-y-3.5 max-h-[82vh] overflow-y-auto">
          {/* Success State Screen */}
          {successResult ? (
            <div className="py-2 text-center space-y-3">
              <div className="w-11 h-11 bg-emerald-100 text-[#27845D] rounded-full flex items-center justify-center mx-auto shadow-xs">
                <CheckCircle2 className="w-6 h-6" />
              </div>

              <div className="space-y-0.5">
                <h3 className="text-base sm:text-lg font-bold text-[#142421]">Investment Executed</h3>
                <p className="text-xs text-[#52605C]">
                  Acquired{' '}
                  <strong className="text-[#142421] font-mono">
                    {orderSummarySnapshot?.tokens ?? effectiveTokens} fractional units
                  </strong>{' '}
                  in {selectedProperty.title}.
                </p>
              </div>

              {/* Order Transaction Details */}
              <div className="p-3 rounded-xl bg-[#F6F7F4] border border-[#E3E8E3] text-left text-xs space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="text-[#69736F]">Certificate Ref:</span>
                  <span className="font-mono font-bold text-[#18211F]">{successResult.certificateId}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[#69736F]">Net Asset Capital:</span>
                  <span className="font-bold font-mono text-[#27845D] text-sm">
                    {formatCurrency(orderSummarySnapshot?.subtotal ?? subtotalCost)}
                  </span>
                </div>
                {(orderSummarySnapshot?.feeAmount ?? 0) > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-[#69736F]">Settlement Fee:</span>
                    <span className="font-mono font-semibold text-[#142421]">
                      {formatCurrency(orderSummarySnapshot?.feeAmount ?? 0)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <span className="text-[#69736F]">Total Debited:</span>
                  <span className="font-bold font-mono text-[#142421]">
                    {formatCurrency(orderSummarySnapshot?.totalPayable ?? totalPayable)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[#69736F]">Projected Monthly Yield:</span>
                  <span className="font-bold font-mono text-[#27845D]">
                    +{formatCurrency(orderSummarySnapshot?.monthlyYield ?? liveCalc.monthlyDividendEUR)}/mo
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[#69736F]">Updated Wallet Balance:</span>
                  <span className="font-bold font-mono text-[#142421]">{formatCurrency(userBalance)}</span>
                </div>
                {txHashStr && (
                  <div className="flex justify-between items-center pt-1.5 border-t border-[#E3E8E3]">
                    <span className="text-[#69736F]">
                      {isGenuineOnChainTx ? 'Solana Tx Signature:' : 'Custody Ledger Hash:'}
                    </span>
                    {isGenuineOnChainTx ? (
                      <a
                        href={getSolanaExplorerUrl(txHashStr, 'tx', 'devnet')}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono text-[#27845D] hover:underline font-bold text-[11px] inline-flex items-center gap-1"
                      >
                        <span>
                          {txHashStr.slice(0, 10)}...{txHashStr.slice(-8)}
                        </span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(txHashStr);
                          setCopiedHash(true);
                          setTimeout(() => setCopiedHash(false), 2000);
                        }}
                        className="font-mono text-[#142421] hover:text-[#27845D] font-bold text-[11px] inline-flex items-center gap-1 cursor-pointer"
                        title="Copy audit ledger hash"
                      >
                        <span>
                          {txHashStr.slice(0, 10)}...{txHashStr.slice(-6)}
                        </span>
                        {copiedHash ? (
                          <Check className="w-3 h-3 text-[#27845D]" />
                        ) : (
                          <Copy className="w-3 h-3 text-[#69736F]" />
                        )}
                      </button>
                    )}
                  </div>
                )}
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
                    Signed &amp; Sealed
                  </span>
                </div>

                <p className="text-[11px] text-slate-200 leading-normal">
                  Your legal agreement has been formally executed with qualified signatures by{' '}
                  <strong className="text-white">Valentin Kretz</strong> (Managing Partner) under Spanish Commercial
                  Registry jurisdiction.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-0.5">
                  <button
                    type="button"
                    onClick={handleImmediatePrint}
                    disabled={isPrintingAgreement}
                    className="w-full py-2 px-3 rounded-lg bg-white text-[#142421] hover:bg-slate-100 font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer disabled:opacity-50"
                  >
                    <Printer className="w-3.5 h-3.5 text-[#27845D]" />
                    <span>{isPrintingAgreement ? 'Preparing Print...' : 'Print Agreement Now'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleImmediateDownload}
                    disabled={isDownloadingAgreement}
                    className="w-full py-2 px-3 rounded-lg bg-[#27845D] hover:bg-[#1E6849] text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isDownloadingAgreement ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Download className="w-3.5 h-3.5 text-[#B7E36A]" />
                    )}
                    <span>{isDownloadingAgreement ? 'Generating PDF...' : 'Download Signed PDF'}</span>
                  </button>
                </div>

                <div className="pt-0.5 text-center">
                  <button
                    type="button"
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
                  type="button"
                  onClick={onClose}
                  className="w-full py-2 px-3 bg-[#F6F7F4] hover:bg-[#EEF2EC] border border-[#E3E8E3] text-[#142421] font-semibold text-xs rounded-lg transition-all cursor-pointer"
                >
                  Return to View
                </button>
              </div>
            </div>
          ) : isConfirmStep ? (
            /* Step 2: Final Order Confirmation */
            <div className="space-y-3 animate-fadeIn">
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-medium space-y-0.5">
                <div className="flex items-center gap-1.5 font-bold text-amber-950 text-xs">
                  <ShieldCheck className="w-4 h-4 text-amber-700" />
                  <span>Review &amp; Confirm Order</span>
                </div>
                <p className="text-[11px]">
                  Please review your purchase details before final execution. All property units are ring-fenced within
                  an SPV contract.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-[#F6F7F4] border border-[#E3E8E3] space-y-2 text-xs">
                <div className="flex justify-between items-center pb-2 border-b border-[#E3E8E3]">
                  <span className="text-[#69736F] font-semibold">Selected Property:</span>
                  <span className="font-bold text-[#142421] text-xs sm:text-sm">{selectedProperty.title}</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-[#69736F] font-medium">Units Purchased:</span>
                  <span className="font-bold font-mono text-[#142421]">
                    {effectiveTokens} Units (@ {formatCurrency(tokenPrice)}/unit)
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-[#69736F] font-medium">Ownership Share:</span>
                  <span className="font-bold font-mono text-[#27845D]">{liveCalc.ownershipSharePercent}% of SPV</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-[#69736F] font-medium">Net Asset Subtotal:</span>
                  <span className="font-bold font-mono text-[#142421]">{formatCurrency(subtotalCost)}</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-[#69736F] font-medium">Settlement Rail ({activeFeeTier.feePercent}%):</span>
                  <span className={`font-semibold font-mono ${feeAmount === 0 ? 'text-emerald-700' : 'text-[#142421]'}`}>
                    {feeAmount === 0 ? '€0.00 (0% Included)' : formatCurrency(feeAmount)}
                  </span>
                </div>

                <div className="flex justify-between items-center pt-2 border-t border-[#E3E8E3]">
                  <span className="font-bold text-[#142421]">Total Amount Payable:</span>
                  <span className="font-bold font-mono text-[#27845D] text-sm sm:text-base">
                    {formatCurrency(totalPayable)}
                  </span>
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

              {/* Error Message + Retry Action */}
              {error && (
                <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleExecuteOrder}
                    disabled={loading}
                    className="px-2 py-1 rounded bg-red-600 hover:bg-red-700 text-white text-[10px] font-bold shrink-0 cursor-pointer"
                  >
                    Retry
                  </button>
                </div>
              )}

              {/* Confirmation Actions */}
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsConfirmStep(false)}
                  disabled={loading}
                  className="flex-1 py-2 px-3 bg-white border border-[#E3E8E3] hover:bg-[#F6F7F4] text-[#142421] text-xs font-semibold rounded-lg transition-colors cursor-pointer disabled:opacity-50"
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
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Settling Order...</span>
                    </>
                  ) : (
                    <>
                      <span>Confirm &amp; Execute Investment</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            /* Step 1: Reactive Unit / Amount / Fee Calculator & Balance Validation */
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
                    <span>{durationMonths} Months Term</span>
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
                        Your balance is{' '}
                        <strong className="font-mono font-bold text-red-950">{formatCurrency(userBalance)}</strong>, but
                        this order requires{' '}
                        <strong className="font-mono font-bold text-red-950">
                          {formatCurrency(totalPayable || selectedProperty.minimumInvestment)}
                        </strong>
                        .
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
                  <label htmlFor="reinvest-target-property" className="text-xs font-semibold text-[#142421] block">
                    Select Target Property to Reinvest Into
                  </label>
                  <select
                    id="reinvest-target-property"
                    value={selectedProperty.id}
                    onChange={(e) => {
                      const found = allProperties.find((p) => p.id === e.target.value);
                      if (found) {
                        setSelectedPropertyId(found.id);
                        const minU = Math.max(1, Math.ceil((found.minimumInvestment || found.tokenPrice) / found.tokenPrice));
                        setTokenCount(minU);
                        setAmountInputEUR(Number((minU * found.tokenPrice).toFixed(2)));
                      }
                    }}
                    className="w-full p-2.5 rounded-lg border border-[#E3E8E3] bg-[#F6F7F4] text-xs font-semibold text-[#142421] focus:outline-none focus:ring-2 focus:ring-[#27845D]"
                  >
                    {allProperties
                      .filter((p) => p.status === 'funding' && p.approvedForFrontend !== false)
                      .map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.title} ({formatPercent(p.estimatedAnnualYield)} APY · {formatCurrency(p.tokenPrice)}/unit)
                        </option>
                      ))}
                  </select>
                </div>
              )}

              {/* Bidirectional Input Mode Toggle: Units vs EUR Amount */}
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="inline-flex rounded-lg bg-[#F6F7F4] p-0.5 border border-[#E3E8E3]">
                    <button
                      type="button"
                      onClick={() => {
                        setInputMode('tokens');
                        setAmountInputEUR(Number((effectiveTokens * tokenPrice).toFixed(2)));
                      }}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-colors cursor-pointer ${
                        inputMode === 'tokens'
                          ? 'bg-[#142421] text-white shadow-2xs'
                          : 'text-[#52605C] hover:text-[#142421]'
                      }`}
                    >
                      By Token Units
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setInputMode('amount');
                        setAmountInputEUR(Number((effectiveTokens * tokenPrice).toFixed(2)));
                      }}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-colors cursor-pointer ${
                        inputMode === 'amount'
                          ? 'bg-[#142421] text-white shadow-2xs'
                          : 'text-[#52605C] hover:text-[#142421]'
                      }`}
                    >
                      By EUR Amount (€)
                    </button>
                  </div>

                  <span className="text-[#69736F] font-mono text-[11px]">
                    {maxAvailable.toLocaleString()} units remaining
                  </span>
                </div>

                {inputMode === 'tokens' ? (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleUnitChange(Math.max(minTokensRequired, effectiveTokens - 1))}
                      disabled={effectiveTokens <= minTokensRequired}
                      aria-label="Decrease units"
                      className="p-2.5 rounded-lg border border-[#E3E8E3] bg-[#F6F7F4] hover:bg-[#E3E8E3] text-[#142421] font-bold disabled:opacity-40 cursor-pointer"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>

                    <div className="relative flex-1">
                      <input
                        type="number"
                        aria-label="Number of property units"
                        min={1}
                        max={maxAvailable}
                        value={tokenCount || ''}
                        onChange={(e) => handleUnitChange(parseInt(e.target.value, 10) || 0)}
                        className="w-full py-2 px-3 rounded-lg border border-[#E3E8E3] text-center text-base font-bold font-mono tabular-nums text-[#142421] focus:outline-none focus:ring-2 focus:ring-[#27845D]"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-[#69736F] pointer-events-none">
                        Units
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleUnitChange(effectiveTokens + 1)}
                      disabled={effectiveTokens >= maxAvailable}
                      aria-label="Increase units"
                      className="p-2.5 rounded-lg border border-[#E3E8E3] bg-[#F6F7F4] hover:bg-[#E3E8E3] text-[#142421] font-bold disabled:opacity-40 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold font-mono text-[#69736F] pointer-events-none">
                      €
                    </span>
                    <input
                      type="number"
                      aria-label="Investment amount in EUR"
                      min={tokenPrice}
                      step={tokenPrice}
                      value={amountInputEUR || ''}
                      onChange={(e) => handleAmountChange(parseFloat(e.target.value) || 0)}
                      className="w-full py-2 pl-8 pr-28 rounded-lg border border-[#E3E8E3] text-base font-bold font-mono tabular-nums text-[#142421] focus:outline-none focus:ring-2 focus:ring-[#27845D]"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-mono font-bold text-[#27845D] pointer-events-none">
                      = {effectiveTokens} Units
                    </span>
                  </div>
                )}

                <div className="flex justify-between text-[11px] text-[#69736F] font-medium px-0.5">
                  <span>
                    Price/unit: <strong className="font-mono text-[#142421]">{formatCurrency(tokenPrice)}</strong>
                  </span>
                  <span>
                    Min. entry:{' '}
                    <strong className="font-mono text-[#142421]">
                      {minTokensRequired} units ({formatCurrency(selectedProperty.minimumInvestment)})
                    </strong>
                  </span>
                </div>
              </div>

              {/* Settlement Rail & Applicable Fee Selector */}
              <div className="space-y-1">
                <label htmlFor="unit-settlement-fee-tier" className="text-xs font-semibold text-[#142421] flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <Calculator className="w-3.5 h-3.5 text-[#27845D]" />
                    <span>Settlement Rail &amp; Applicable Fee</span>
                  </span>
                  <span className="font-mono text-[11px] text-[#27845D] font-bold">
                    {activeFeeTier.feePercent.toFixed(2)}% ({formatCurrency(feeAmount)})
                  </span>
                </label>
                <select
                  id="unit-settlement-fee-tier"
                  value={selectedFeeTierId}
                  onChange={(e) => {
                    setSelectedFeeTierId(e.target.value);
                    setError(null);
                  }}
                  className="w-full p-2 rounded-lg border border-[#E3E8E3] bg-[#F6F7F4] text-xs font-semibold text-[#142421] focus:outline-none focus:ring-2 focus:ring-[#27845D] cursor-pointer"
                >
                  {PAYMENT_FEE_TIERS.map((tier) => (
                    <option key={tier.id} value={tier.id}>
                      {tier.label} — {tier.feePercent.toFixed(2)}% fee
                    </option>
                  ))}
                </select>
              </div>

              {/* Live Investment Projection Grid */}
              <div className="grid grid-cols-2 gap-2 p-3 rounded-xl bg-[#F6F7F4] border border-[#E3E8E3] text-xs">
                <div>
                  <span className="text-[10px] uppercase font-semibold text-[#69736F] block tracking-wide">
                    Est. Monthly Yield ({monthlyTargetPercentage}%)
                  </span>
                  <span className="text-sm font-bold font-mono text-[#27845D] block mt-0.5 tabular-nums">
                    +{formatCurrency(liveCalc.monthlyDividendEUR)}/mo
                  </span>
                </div>

                <div>
                  <span className="text-[10px] uppercase font-semibold text-[#69736F] block tracking-wide">
                    Annual Return
                  </span>
                  <span className="text-sm font-bold font-mono text-[#142421] block mt-0.5 tabular-nums">
                    +{formatCurrency(liveCalc.annualDividendEUR)}/yr
                  </span>
                </div>

                <div>
                  <span className="text-[10px] uppercase font-semibold text-[#69736F] block tracking-wide">
                    Net Profit ({durationMonths} Mo, After Fee)
                  </span>
                  <span className="text-xs font-bold font-mono text-[#27845D] block mt-0.5 tabular-nums">
                    +{formatCurrency(liveCalc.netProjectedProfitEUR)}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] uppercase font-semibold text-[#69736F] block tracking-wide">
                    Total Payable ({liveCalc.ownershipSharePercent}% SPV)
                  </span>
                  <span className="text-xs font-bold font-mono text-[#142421] block mt-0.5 tabular-nums">
                    {formatCurrency(totalPayable)}
                  </span>
                </div>
              </div>

              {/* Principal Repayment Notice */}
              <div className="p-2.5 rounded-lg bg-emerald-50/80 border border-emerald-200/80 text-[11px] text-emerald-950 flex items-center justify-between font-semibold">
                <span className="text-[#52605C]">Projected Exit Proceeds (incl. principal):</span>
                <span className="font-bold font-mono text-[#27845D] text-xs tabular-nums">
                  {formatCurrency(liveCalc.totalExitProceedsEUR)}
                </span>
              </div>

              {/* Inline Validation or Submission Error */}
              {(error || (!liveCalc.isValid && liveCalc.validationError && !isInsufficient)) && (
                <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <span>{error || liveCalc.validationError}</span>
                </div>
              )}

              {/* Proceed Button */}
              <button
                type="submit"
                disabled={!liveCalc.isValid || isInsufficient}
                className="w-full py-2.5 px-3 bg-[#142421] hover:bg-[#1E332E] disabled:bg-slate-300 text-white font-bold text-xs rounded-lg transition-all cursor-pointer shadow-xs flex items-center justify-center gap-1.5 disabled:cursor-not-allowed"
              >
                <span>
                  {maxAvailable <= 0
                    ? 'Offering 100% Subscribed'
                    : isInsufficient
                    ? 'Insufficient Wallet Balance'
                    : `Review Order (${formatCurrency(totalPayable)})`}
                </span>
                {liveCalc.isValid && !isInsufficient && <ArrowRight className="w-3.5 h-3.5" />}
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
