import React, { useState } from 'react';
import { Investment } from '../../types/investment';
import { formatCurrency, formatPercent } from '../../lib/utils';
import { CircularProgressRing } from '../common/CircularProgressRing';
import { ButtonLoader } from '../common/ButtonLoader';
import { X, ShieldCheck, Crown, ExternalLink, Calendar, Building2, Wallet, ArrowUpRight, CheckCircle2, Copy, Printer, Download, FileText, Loader2 } from 'lucide-react';
import { useAuth } from '../../lib/auth';
import { getSolanaExplorerUrl } from '../../lib/solanaService';
import { 
  buildInvestmentAgreementData, 
  downloadAgreementPdf, 
  printAgreementDocument 
} from '../../lib/investmentAgreementService';
import { InvestmentAgreementModal } from '../agreements/InvestmentAgreementModal';

interface InvestmentDetailModalProps {
  investment: Investment;
  isOpen: boolean;
  onClose: () => void;
  onReinvest?: (investment: Investment) => void;
}

export const InvestmentDetailModal: React.FC<InvestmentDetailModalProps> = ({
  investment,
  isOpen,
  onClose,
  onReinvest
}) => {
  const { user } = useAuth();
  const [showAgreementModal, setShowAgreementModal] = useState<boolean>(false);
  const [isPrinting, setIsPrinting] = useState<boolean>(false);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);

  if (!isOpen || !investment) return null;

  const handlePrintAgreement = async () => {
    try {
      setIsPrinting(true);
      const data = await buildInvestmentAgreementData(investment, null, user);
      printAgreementDocument(data);
    } catch (err) {
      console.error('Print agreement failed:', err);
    } finally {
      setIsPrinting(false);
    }
  };

  const handleDownloadAgreement = async () => {
    try {
      setIsDownloading(true);
      const data = await buildInvestmentAgreementData(investment, null, user);
      await downloadAgreementPdf(data);
    } catch (err) {
      console.error('Download agreement failed:', err);
    } finally {
      setIsDownloading(false);
    }
  };

  const startDate = investment.startDate || investment.purchasedAt;
  const durationMonths = investment.durationMonths || 36;
  
  // Calculate maturity date if not explicitly set
  const calcMaturity = () => {
    if (investment.maturityDate) return investment.maturityDate;
    const s = new Date(startDate);
    s.setMonth(s.getMonth() + durationMonths);
    return s.toISOString();
  };
  const maturityDate = calcMaturity();

  const currentValuation = investment.currentValuation || investment.totalAmountInvested;
  const unrealizedPL = investment.unrealizedProfitLoss || (currentValuation - investment.totalAmountInvested);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-fadeIn">
      <div className="relative w-full max-w-lg bg-white rounded-xl shadow-2xl border border-[#E3E8E3] overflow-hidden my-6">
        
        {/* Header Bar */}
        <div className="p-3 sm:p-3.5 bg-[#142421] text-white flex items-center justify-between border-b border-white/10">
          <div className="flex items-center gap-2.5 min-w-0 pr-2">
            <div className="p-2 rounded-lg bg-[#27845D]/30 text-emerald-400 shrink-0">
              <Crown className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-bold leading-tight text-white truncate">
                {investment.propertyTitle}
              </h2>
              <p className="text-[11px] text-emerald-200/80 font-mono truncate">
                {investment.tokensPurchased} Fractional Units · Certificate #{investment.certificateId}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/10 text-white/70 hover:text-white transition-colors cursor-pointer shrink-0"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-3.5 sm:p-4 space-y-3 max-h-[80vh] overflow-y-auto">
          
          {/* Property Banner & Key Metrics */}
          <div className="flex flex-col sm:flex-row gap-3 p-3 rounded-xl bg-[#F6F7F4] border border-[#E3E8E3]">
            <img
              src={investment.propertyImage}
              alt={investment.propertyTitle}
              className="w-full sm:w-20 sm:h-20 h-28 rounded-lg object-cover shrink-0"
            />
            <div className="flex-1 space-y-1.5 min-w-0">
              <div className="flex items-center justify-between gap-1">
                <span className="text-xs font-semibold text-[#52605C] truncate">{investment.propertyLocation}</span>
                <span className="px-1.5 py-0.2 rounded bg-emerald-100 text-[#27845D] text-[9.5px] font-bold uppercase tracking-wide shrink-0">
                  {investment.status}
                </span>
              </div>

              <h3 className="text-xs sm:text-sm font-bold text-[#142421] leading-snug truncate">{investment.propertyTitle}</h3>

              <div className="grid grid-cols-2 gap-2 text-xs pt-0.5">
                <div>
                  <span className="text-[10px] text-[#69736F] font-medium block">Principal Invested:</span>
                  <span className="font-bold font-mono tabular-nums text-[#142421] text-xs sm:text-sm">{formatCurrency(investment.totalAmountInvested)}</span>
                </div>
                <div>
                  <span className="text-[10px] text-[#69736F] font-medium block">Shares Owned:</span>
                  <span className="font-bold font-mono tabular-nums text-[#142421] text-xs sm:text-sm">{investment.tokensPurchased} Units (@ {formatCurrency(investment.tokenPrice)})</span>
                </div>
              </div>
            </div>
          </div>

          {/* SECTION A: Investment Duration / Time Progress Indicator */}
          <div className="p-3 rounded-xl bg-white border border-[#E3E8E3] space-y-2.5 shadow-2xs">
            <div className="flex items-center justify-between border-b border-[#E3E8E3] pb-2">
              <h4 className="text-xs uppercase font-bold text-[#142421] tracking-wider flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-[#27845D]" />
                <span>Investment Period & Timeline Progress</span>
              </h4>
              <span className="text-[11px] font-bold font-mono text-[#27845D]">{durationMonths} Months Term</span>
            </div>

            <CircularProgressRing
              startDate={startDate}
              maturityDate={maturityDate}
              status={investment.status}
              size="md"
              showTextDetails={true}
            />
          </div>

          {/* SECTION B: Financial Performance & Dividends */}
          <div className="p-3 rounded-xl bg-[#F6F7F4] border border-[#E3E8E3] space-y-2.5">
            <h4 className="text-xs uppercase font-bold text-[#142421] tracking-wider flex items-center gap-1.5">
              <Wallet className="w-3.5 h-3.5 text-emerald-700" />
              <span>Verified Financial Performance</span>
            </h4>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div className="p-2.5 bg-white rounded-lg border border-[#E3E8E3]">
                <span className="text-[10px] uppercase font-semibold text-[#69736F] block">Principal Invested</span>
                <span className="text-xs sm:text-sm font-bold font-mono tabular-nums text-[#142421] block mt-0.5">{formatCurrency(investment.totalAmountInvested)}</span>
              </div>

              <div className="p-2.5 bg-white rounded-lg border border-[#E3E8E3]">
                <span className="text-[10px] uppercase font-semibold text-[#69736F] block">Current Valuation</span>
                <span className="text-xs sm:text-sm font-bold font-mono tabular-nums text-[#27845D] block mt-0.5">{formatCurrency(currentValuation)}</span>
              </div>

              <div className="p-2.5 bg-white rounded-lg border border-[#E3E8E3]">
                <span className="text-[10px] uppercase font-semibold text-[#69736F] block">Annual Yield APY</span>
                <span className="text-xs sm:text-sm font-bold font-mono tabular-nums text-[#27845D] block mt-0.5">{formatPercent(investment.estimatedAnnualYield)}</span>
              </div>

              <div className="p-2.5 bg-white rounded-lg border border-[#E3E8E3]">
                <span className="text-[10px] uppercase font-semibold text-[#69736F] block">Dividends Paid</span>
                <span className="text-xs sm:text-sm font-bold font-mono tabular-nums text-[#142421] block mt-0.5">{formatCurrency(investment.totalDividendsReceived)}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-0.5">
              <div className="p-2.5 bg-white rounded-lg border border-[#E3E8E3]">
                <span className="text-[10px] uppercase font-semibold text-[#69736F] block">Monthly Target Pay</span>
                <span className="text-xs sm:text-sm font-bold font-mono tabular-nums text-[#27845D] block mt-0.5">+{formatCurrency(investment.projectedMonthlyIncome)}/mo</span>
              </div>

              <div className="p-2.5 bg-white rounded-lg border border-[#E3E8E3]">
                <span className="text-[10px] uppercase font-semibold text-[#69736F] block">Net-Monthly Target ({durationMonths} Mo)</span>
                <span className="text-xs sm:text-sm font-bold font-mono tabular-nums text-[#27845D] block mt-0.5">+{formatCurrency(Number((investment.projectedMonthlyIncome * durationMonths).toFixed(2)))}</span>
              </div>

              <div className="p-2.5 bg-emerald-50/70 rounded-lg border border-emerald-200 col-span-2 sm:col-span-1">
                <span className="text-[10px] uppercase font-semibold text-[#52605C] block">Total With Principal</span>
                <span className="text-xs sm:text-sm font-bold font-mono tabular-nums text-[#27845D] block mt-0.5">{formatCurrency(Number((investment.totalAmountInvested + (investment.projectedMonthlyIncome * durationMonths)).toFixed(2)))}</span>
              </div>
            </div>
          </div>

          {/* Certificate & Blockchain Details */}
          <div className="p-3 rounded-xl bg-[#142421] text-white space-y-2 text-xs">
            <div className="flex justify-between items-center pb-1.5 border-b border-white/10">
              <span className="font-semibold text-emerald-200 text-xs">Ownership Certificate ID:</span>
              <button
                onClick={() => copyToClipboard(investment.certificateId)}
                className="flex items-center gap-1 font-mono font-bold text-white hover:text-[#B7E36A] cursor-pointer"
              >
                <span>{investment.certificateId}</span>
                <Copy className="w-3 h-3" />
              </button>
            </div>

            <div className="flex justify-between items-center text-xs">
              <span className="font-medium text-slate-300">Solana Tx Signature:</span>
              <a
                href={getSolanaExplorerUrl(investment.transactionHash, 'tx', 'devnet')}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 font-mono text-[11px] text-emerald-300 hover:underline truncate max-w-[200px]"
              >
                <span>{investment.transactionHash.slice(0, 16)}...</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <div className="flex justify-between items-center text-[10.5px] text-slate-400">
              <span>Purchase Timestamp:</span>
              <span className="font-mono">{new Date(investment.purchasedAt).toLocaleString()}</span>
            </div>
          </div>

          {/* Legally Signed SPV Agreement Bar */}
          <div className="p-3 rounded-xl bg-[#142421] text-white border border-[#27845D]/40 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#B7E36A]" />
                <span className="text-xs font-bold uppercase tracking-wide text-white">
                  Legally Signed SPV Agreement
                </span>
              </div>
              <span className="text-[9.5px] font-semibold px-2 py-0.5 rounded bg-[#27845D]/40 text-[#B7E36A]">
                eIDAS Validated
              </span>
            </div>
            
            <p className="text-[11px] text-slate-300 leading-normal">
              Notarized under Spanish SOCIMI Act 11/2009. Includes full beneficial SPV participatory title and executive director signature.
            </p>

            <div className="grid grid-cols-2 gap-2 pt-0.5">
              <button
                onClick={handlePrintAgreement}
                disabled={isPrinting}
                className="py-1.5 px-3 rounded-lg bg-white text-[#142421] hover:bg-slate-100 font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
              >
                {isPrinting ? (
                  <ButtonLoader text="Preparing..." />
                ) : (
                  <>
                    <Printer className="w-3.5 h-3.5 text-[#27845D]" />
                    <span>Print Agreement</span>
                  </>
                )}
              </button>

              <button
                onClick={handleDownloadAgreement}
                disabled={isDownloading}
                className="py-1.5 px-3 rounded-lg bg-[#27845D] hover:bg-[#1E6849] text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
              >
                {isDownloading ? (
                  <ButtonLoader text="Generating..." />
                ) : (
                  <>
                    <Download className="w-3.5 h-3.5 text-[#B7E36A]" />
                    <span>Download PDF</span>
                  </>
                )}
              </button>
            </div>

            <div className="text-center pt-0.5">
              <button
                onClick={() => setShowAgreementModal(true)}
                className="text-[11px] text-[#B7E36A] hover:underline font-semibold inline-flex items-center gap-1 cursor-pointer"
              >
                <FileText className="w-3 h-3" />
                <span>View Full Contract Clauses & Articles</span>
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-0.5">
            <button
              onClick={onClose}
              className="flex-1 py-2 px-3 bg-white border border-[#E3E8E3] hover:bg-[#F6F7F4] text-[#142421] text-xs font-semibold rounded-lg transition-colors cursor-pointer"
            >
              Close Window
            </button>

            {onReinvest && (
              <button
                onClick={() => {
                  onClose();
                  onReinvest(investment);
                }}
                className="flex-1 py-2 px-3 bg-[#27845D] hover:bg-[#1f6b4a] text-white text-xs font-bold rounded-lg transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>Reinvest / Add Units</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

        </div>
      </div>

      {/* Full Agreement Modal */}
      <InvestmentAgreementModal
        isOpen={showAgreementModal}
        onClose={() => setShowAgreementModal(false)}
        investment={investment}
        user={user}
      />
    </div>
  );
};
