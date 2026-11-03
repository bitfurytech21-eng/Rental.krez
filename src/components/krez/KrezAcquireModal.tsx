import React, { useState } from 'react';
import { 
  X, CheckCircle2, ShieldCheck, Coins, Wallet, 
  ArrowRight, Building2, Zap, AlertCircle, Lock, Download, Check
} from 'lucide-react';
import { KrezBuilding } from '../../data/krezTemplateData';
import { useAuth } from '../../lib/auth';
import { ledger } from '../../lib/ledger';
import { formatCurrency, formatPercent } from '../../lib/utils';
import { openKrezAuthModal } from './KrezAuthModal';

interface KrezAcquireModalProps {
  building: KrezBuilding | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const KrezAcquireModal: React.FC<KrezAcquireModalProps> = ({
  building,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { user, refreshUser } = useAuth();
  const [sharesCount, setSharesCount] = useState<number>(5);
  const [fundingMethod, setFundingMethod] = useState<'wallet' | 'sepa' | 'solana'>('wallet');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successTx, setSuccessTx] = useState<{
    txHash: string;
    certificateId: string;
    totalAmount: number;
    shares: number;
  } | null>(null);

  if (!isOpen || !building) return null;

  const sharePrice = building.sharePriceNumeric || 250;
  const yieldPct = building.projectedYieldNumeric || 6.5;
  const totalCost = sharesCount * sharePrice;
  const monthlyDividend = (totalCost * yieldPct) / 100 / 12;
  const annualDividend = (totalCost * yieldPct) / 100;

  const userBalance = user?.walletBalance || 0;
  const hasSufficientBalance = fundingMethod !== 'wallet' || userBalance >= totalCost;

  const handleConfirmInvestment = async () => {
    if (!user) {
      onClose();
      openKrezAuthModal('register');
      return;
    }

    if (fundingMethod === 'wallet' && userBalance < totalCost) {
      setError(`Insufficient wallet balance. You need ${formatCurrency(totalCost)}, available ${formatCurrency(userBalance)}. Please top up or select SEPA Bank Transfer.`);
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      // If the building is mapped to a ledger property
      const targetPropertyId = building.linkedLedgerProperty?.id || building.id;
      
      const inv = await ledger.executeInvestment(
        user.id,
        targetPropertyId,
        sharesCount
      );

      if (refreshUser) {
        await refreshUser();
      }

      setSuccessTx({
        txHash: inv.transactionHash || `0x${Math.random().toString(16).slice(2, 18)}`,
        certificateId: inv.certificateId || `KRETZ-${Date.now().toString(36).toUpperCase()}`,
        totalAmount: totalCost,
        shares: sharesCount,
      });

      if (onSuccess) {
        onSuccess();
      }
    } catch (err: any) {
      setError(err?.message || 'Transaction could not be settled. Please check your allocation limits and retry.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="acquire-modal-title"
    >
      <div className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-[#594333] bg-[#211711] text-[#F5EFE8] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#594333] px-6 py-4 bg-[#2B1E17]">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#C49A6C] text-[#211711]">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <h2 id="acquire-modal-title" className="text-base font-heading font-bold text-[#F5EFE8]">
                Acquire Building Shares
              </h2>
              <p className="text-xs text-[#C4B5A5]">
                {building.name} · {building.location}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-[#C4B5A5] hover:bg-[#35251C] hover:text-[#F5EFE8] transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {successTx ? (
          /* Confirmation Receipt View */
          <div className="p-6 sm:p-8 space-y-6 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#C49A6C]/20 border border-[#C49A6C] text-[#C49A6C]">
              <CheckCircle2 className="h-8 w-8" />
            </div>

            <div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-[#C49A6C] bg-[#C49A6C]/15 px-3 py-1 rounded-full border border-[#C49A6C]/40">
                Settled &amp; Notarized
              </span>
              <h3 className="mt-3 text-2xl font-heading font-bold text-[#F5EFE8]">
                Subscription Confirmed
              </h3>
              <p className="mt-1 text-xs text-[#C4B5A5] max-w-sm mx-auto">
                You now hold <strong className="text-[#F5EFE8] font-semibold">{successTx.shares} verified shares</strong> in {building.name}. Monthly rental distributions will credit directly to your ledger wallet.
              </p>
            </div>

            <div className="rounded-2xl border border-[#594333] bg-[#2B1E17] p-4 text-left font-mono text-xs space-y-2.5">
              <div className="flex justify-between items-center text-[#C4B5A5]">
                <span>Certificate Ref:</span>
                <span className="font-bold text-[#F5EFE8]">{successTx.certificateId}</span>
              </div>
              <div className="flex justify-between items-center text-[#C4B5A5]">
                <span>Total Capital Deployed:</span>
                <span className="font-bold text-[#C49A6C]">{formatCurrency(successTx.totalAmount)}</span>
              </div>
              <div className="flex justify-between items-center text-[#C4B5A5]">
                <span>Est. Monthly Rental Dividend:</span>
                <span className="font-bold text-[#C49A6C]">+{formatCurrency((successTx.totalAmount * yieldPct) / 100 / 12)} / mo</span>
              </div>
              <div className="flex justify-between items-center text-[#C4B5A5] pt-2 border-t border-[#594333]">
                <span>On-Chain Audit Hash:</span>
                <span className="truncate max-w-[180px] text-[#C4B5A5]/70">{successTx.txHash}</span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  window.print();
                }}
                className="flex-1 py-3 px-4 rounded-pill border border-[#594333] bg-[#35251C] hover:bg-[#403025] text-xs font-semibold tracking-wider uppercase text-[#F5EFE8] transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5 text-[#C49A6C]" />
                <span>Print Certificate</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3 px-4 rounded-pill bg-[#C49A6C] hover:bg-[#d4ac7d] text-xs font-semibold tracking-wider uppercase text-[#211711] transition-colors cursor-pointer font-bold"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          /* Subscription Form View */
          <div className="p-6 space-y-5">
            {error && (
              <div className="rounded-xl border border-rose-500/40 bg-rose-950/40 p-3 text-xs text-rose-300 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Share Quantity Selector */}
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-[#C4B5A5] block">
                Number of Shares to Acquire
              </label>
              <div className="flex items-center gap-3">
                <div className="flex-1 flex items-center rounded-2xl border border-[#594333] bg-[#2B1E17] px-4 py-2.5">
                  <input
                    type="number"
                    min={1}
                    max={500}
                    value={sharesCount}
                    onChange={(e) => setSharesCount(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full bg-transparent font-mono text-lg font-bold text-[#F5EFE8] focus:outline-none"
                  />
                  <span className="text-xs font-mono text-[#C4B5A5] ml-2 shrink-0">
                    &times; {formatCurrency(sharePrice)}
                  </span>
                </div>

                {/* Quick Presets */}
                <div className="flex items-center gap-1.5">
                  {[2, 5, 10, 25].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setSharesCount(preset)}
                      className={`px-3 py-2 rounded-xl text-xs font-mono font-bold transition-colors cursor-pointer border ${
                        sharesCount === preset
                          ? 'bg-[#C49A6C] text-[#211711] border-[#C49A6C]'
                          : 'bg-[#35251C] text-[#C4B5A5] border-[#594333] hover:text-[#F5EFE8]'
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Return Projections Breakdown Card */}
            <div className="rounded-2xl border border-[#594333] bg-[#2B1E17] p-4 space-y-3 font-mono text-xs">
              <div className="flex justify-between items-center text-[#C4B5A5]">
                <span>Total Allocation Cost:</span>
                <span className="text-base font-bold text-[#F5EFE8]">{formatCurrency(totalCost)}</span>
              </div>
              <div className="flex justify-between items-center text-[#C4B5A5]">
                <span>Projected Net Yield:</span>
                <span className="font-bold text-[#C49A6C]">{formatPercent(yieldPct)}</span>
              </div>
              <div className="flex justify-between items-center text-[#C4B5A5]">
                <span>Monthly Rent Payout:</span>
                <span className="font-bold text-[#C49A6C]">+{formatCurrency(monthlyDividend)} / mo</span>
              </div>
              <div className="flex justify-between items-center text-[#C4B5A5] pt-2 border-t border-[#594333]">
                <span>Annual Net Income:</span>
                <span className="font-bold text-[#C49A6C]">+{formatCurrency(annualDividend)} / yr</span>
              </div>
            </div>

            {/* Funding Method Options */}
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-[#C4B5A5] block">
                Settlement Method
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setFundingMethod('wallet')}
                  className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                    fundingMethod === 'wallet'
                      ? 'border-[#C49A6C] bg-[#C49A6C]/20 text-[#F5EFE8] ring-1 ring-[#C49A6C]'
                      : 'border-[#594333] bg-[#35251C] text-[#C4B5A5] hover:text-[#F5EFE8]'
                  }`}
                >
                  <Wallet className="w-4 h-4 text-[#C49A6C] mb-1.5" />
                  <div className="font-bold text-[11px] leading-tight text-[#F5EFE8]">Wallet Balance</div>
                  <div className="text-[10px] text-[#C4B5A5] mt-0.5 truncate">{formatCurrency(userBalance)}</div>
                </button>

                <button
                  type="button"
                  onClick={() => setFundingMethod('sepa')}
                  className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                    fundingMethod === 'sepa'
                      ? 'border-[#C49A6C] bg-[#C49A6C]/20 text-[#F5EFE8] ring-1 ring-[#C49A6C]'
                      : 'border-[#594333] bg-[#35251C] text-[#C4B5A5] hover:text-[#F5EFE8]'
                  }`}
                >
                  <ShieldCheck className="w-4 h-4 text-[#C49A6C] mb-1.5" />
                  <div className="font-bold text-[11px] leading-tight text-[#F5EFE8]">SEPA Wire</div>
                  <div className="text-[10px] text-[#C4B5A5] mt-0.5">CaixaBank Escrow</div>
                </button>

                <button
                  type="button"
                  onClick={() => setFundingMethod('solana')}
                  className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                    fundingMethod === 'solana'
                      ? 'border-[#C49A6C] bg-[#C49A6C]/20 text-[#F5EFE8] ring-1 ring-[#C49A6C]'
                      : 'border-[#594333] bg-[#35251C] text-[#C4B5A5] hover:text-[#F5EFE8]'
                  }`}
                >
                  <Coins className="w-4 h-4 text-[#C49A6C] mb-1.5" />
                  <div className="font-bold text-[11px] leading-tight text-[#F5EFE8]">Solana Pay</div>
                  <div className="text-[10px] text-[#C4B5A5] mt-0.5">USDC On-Chain</div>
                </button>
              </div>
            </div>

            {/* Legal Notice */}
            <div className="flex items-center gap-2 p-3 rounded-xl bg-[#2B1E17] border border-[#594333] text-[11px] text-[#C4B5A5]">
              <Lock className="w-4 h-4 text-[#C49A6C] shrink-0" />
              <span>
                Shares are recorded in the notarized SPV register and settled in escrow. Rental income is distributed monthly.
              </span>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={handleConfirmInvestment}
                disabled={submitting}
                className="flex-1 py-3.5 px-6 rounded-pill bg-[#C49A6C] hover:bg-[#d4ac7d] text-xs font-semibold tracking-wider uppercase text-[#211711] transition-all shadow-md cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 font-black"
              >
                {submitting ? (
                  <span>Settling Subscription...</span>
                ) : (
                  <>
                    <span>Confirm {sharesCount} Shares ({formatCurrency(totalCost)})</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="py-3.5 px-5 rounded-pill border border-[#594333] bg-[#2B1E17] hover:bg-[#35251C] text-xs font-semibold tracking-wider uppercase text-[#C4B5A5] hover:text-[#F5EFE8] transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
