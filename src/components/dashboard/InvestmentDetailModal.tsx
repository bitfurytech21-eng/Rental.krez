import React, { useState } from 'react';
import { Investment } from '../../types/investment';
import { formatCurrency, formatPercent } from '../../lib/utils';
import { CircularProgressRing } from '../common/CircularProgressRing';
import { X, ShieldCheck, Crown, ExternalLink, Calendar, Building2, Wallet, ArrowUpRight, CheckCircle2, Copy, Printer, Download, FileText, Loader2 } from 'lucide-react';
import { useAuth } from '../../lib/auth';
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
      setTimeout(() => setIsPrinting(false), 1200);
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
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 animate-fadeIn">
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-[#E3E8E3] overflow-hidden my-8">
        
        {/* Header Bar */}
        <div className="p-5 sm:p-6 bg-[#142421] text-white flex items-center justify-between border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-[#27845D]/30 text-emerald-400">
              <Crown className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black leading-tight text-white">
                {investment.propertyTitle}
              </h2>
              <p className="text-xs text-emerald-200/80 font-medium">
                {investment.tokensPurchased} Fractional Shares • Certificate #{investment.certificateId}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-white/10 text-white/70 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          
          {/* Property Banner & Key Metrics */}
          <div className="flex flex-col sm:flex-row gap-4 p-4 rounded-2xl bg-[#F6F7F4] border border-[#E3E8E3]">
            <img
              src={investment.propertyImage}
              alt={investment.propertyTitle}
              className="w-full sm:w-28 h-28 rounded-xl object-cover shrink-0"
            />
            <div className="flex-1 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#52605C]">{investment.propertyLocation}</span>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-[#27845D] text-[10px] font-black uppercase tracking-wide">
                  {investment.status}
                </span>
              </div>

              <h3 className="text-base font-black text-[#142421] leading-snug">{investment.propertyTitle}</h3>

              <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                <div>
                  <span className="text-[10px] text-[#69736F] font-medium block">Original Invested:</span>
                  <span className="font-extrabold text-[#142421]">{formatCurrency(investment.totalAmountInvested)}</span>
                </div>
                <div>
                  <span className="text-[10px] text-[#69736F] font-medium block">Shares Owned:</span>
                  <span className="font-extrabold text-[#142421]">{investment.tokensPurchased} Units (@ {formatCurrency(investment.tokenPrice)})</span>
                </div>
              </div>
            </div>
          </div>

          {/* SECTION A: Investment Duration / Time Progress Indicator */}
          <div className="p-5 rounded-2xl bg-white border border-[#E3E8E3] space-y-3.5 shadow-xs">
            <div className="flex items-center justify-between border-b border-[#E3E8E3] pb-2.5">
              <h4 className="text-xs uppercase font-extrabold text-[#142421] tracking-wider flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#27845D]" />
                <span>Investment Period & Timeline Progress</span>
              </h4>
              <span className="text-[11px] font-bold text-[#27845D]">{durationMonths} Months Term</span>
            </div>

            <CircularProgressRing
              startDate={startDate}
              maturityDate={maturityDate}
              status={investment.status}
              size="lg"
              showTextDetails={true}
            />
          </div>

          {/* SECTION B: Financial Performance & Dividends */}
          <div className="p-5 rounded-2xl bg-[#F6F7F4] border border-[#E3E8E3] space-y-3">
            <h4 className="text-xs uppercase font-extrabold text-[#142421] tracking-wider flex items-center gap-2">
              <Wallet className="w-4 h-4 text-emerald-700" />
              <span>Verified Financial Performance</span>
            </h4>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 bg-white rounded-xl border border-[#E3E8E3]">
                <span className="text-[10px] uppercase font-bold text-[#69736F] block">Principal Invested</span>
                <span className="text-sm font-black text-[#142421] block mt-0.5">{formatCurrency(investment.totalAmountInvested)}</span>
              </div>

              <div className="p-3 bg-white rounded-xl border border-[#E3E8E3]">
                <span className="text-[10px] uppercase font-bold text-[#69736F] block">Current Valuation</span>
                <span className="text-sm font-black text-[#27845D] block mt-0.5">{formatCurrency(currentValuation)}</span>
              </div>

              <div className="p-3 bg-white rounded-xl border border-[#E3E8E3]">
                <span className="text-[10px] uppercase font-bold text-[#69736F] block">Annual Yield APY</span>
                <span className="text-sm font-black text-[#27845D] block mt-0.5">{formatPercent(investment.estimatedAnnualYield)}</span>
              </div>

              <div className="p-3 bg-white rounded-xl border border-[#E3E8E3]">
                <span className="text-[10px] uppercase font-bold text-[#69736F] block">Dividends Paid</span>
                <span className="text-sm font-black text-[#142421] block mt-0.5">{formatCurrency(investment.totalDividendsReceived)}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-1">
              <div className="p-3 bg-white rounded-xl border border-[#E3E8E3]">
                <span className="text-[10px] uppercase font-bold text-[#69736F] block">Monthly Target Pay</span>
                <span className="text-sm font-black text-[#27845D] block mt-0.5">+{formatCurrency(investment.projectedMonthlyIncome)}/mo</span>
              </div>

              <div className="p-3 bg-white rounded-xl border border-[#E3E8E3]">
                <span className="text-[10px] uppercase font-bold text-[#69736F] block">Net-Monthly Target ({durationMonths} Mo)</span>
                <span className="text-sm font-black text-[#27845D] block mt-0.5">+{formatCurrency(Number((investment.projectedMonthlyIncome * durationMonths).toFixed(2)))}</span>
              </div>

              <div className="p-3 bg-emerald-50/70 rounded-xl border border-emerald-200 col-span-2 sm:col-span-1">
                <span className="text-[10px] uppercase font-bold text-[#52605C] block">Total With Principal</span>
                <span className="text-sm font-black text-[#27845D] block mt-0.5">{formatCurrency(Number((investment.totalAmountInvested + (investment.projectedMonthlyIncome * durationMonths)).toFixed(2)))}</span>
              </div>
            </div>
          </div>

          {/* Certificate & Blockchain Details */}
          <div className="p-4 rounded-2xl bg-[#142421] text-white space-y-3 text-xs">
            <div className="flex justify-between items-center pb-2 border-b border-white/10">
              <span className="font-bold text-emerald-200">Ownership Certificate ID:</span>
              <button
                onClick={() => copyToClipboard(investment.certificateId)}
                className="flex items-center gap-1 font-mono font-bold text-white hover:text-[#B7E36A] cursor-pointer"
              >
                <span>{investment.certificateId}</span>
                <Copy className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex justify-between items-center">
              <span className="font-medium text-slate-300">Blockchain Tx Hash:</span>
              <button
                onClick={() => copyToClipboard(investment.transactionHash)}
                className="flex items-center gap-1 font-mono text-[11px] text-emerald-300 hover:underline truncate max-w-[220px] cursor-pointer"
              >
                <span>{investment.transactionHash.slice(0, 18)}...</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            </div>

            <div className="flex justify-between items-center text-[11px] text-slate-400">
              <span>Purchase Timestamp:</span>
              <span>{new Date(investment.purchasedAt).toLocaleString()}</span>
            </div>
          </div>

          {/* Legally Signed SPV Agreement Bar */}
          <div className="p-3.5 rounded-2xl bg-[#142421] text-white border border-[#27845D]/40 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#B7E36A]" />
                <span className="text-xs font-black uppercase tracking-wide text-white">
                  Legally Signed SPV Agreement
                </span>
              </div>
              <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-[#27845D]/40 text-[#B7E36A]">
                eIDAS Validated
              </span>
            </div>
            
            <p className="text-[11px] text-slate-300">
              Notarized under Spanish SOCIMI Act 11/2009. Includes full beneficial SPV participatory title and executive director signature.
            </p>

            <div className="grid grid-cols-2 gap-2 pt-0.5">
              <button
                onClick={handlePrintAgreement}
                disabled={isPrinting}
                className="py-2 px-3 rounded-xl bg-white text-[#142421] hover:bg-slate-100 font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
              >
                <Printer className="w-3.5 h-3.5 text-[#27845D]" />
                <span>{isPrinting ? 'Preparing...' : 'Print Agreement'}</span>
              </button>

              <button
                onClick={handleDownloadAgreement}
                disabled={isDownloading}
                className="py-2 px-3 rounded-xl bg-[#27845D] hover:bg-[#1E6849] text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
              >
                {isDownloading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5 text-[#B7E36A]" />}
                <span>{isDownloading ? 'Generating...' : 'Download PDF'}</span>
              </button>
            </div>

            <div className="text-center pt-0.5">
              <button
                onClick={() => setShowAgreementModal(true)}
                className="text-[11px] text-[#B7E36A] hover:underline font-bold inline-flex items-center gap-1 cursor-pointer"
              >
                <FileText className="w-3 h-3" />
                <span>View Full Contract Clauses & Articles</span>
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-1">
            <button
              onClick={onClose}
              className="flex-1 py-3 bg-white border border-[#E3E8E3] hover:bg-[#F6F7F4] text-[#142421] text-xs font-bold rounded-xl transition-colors cursor-pointer"
            >
              Close Window
            </button>

            {onReinvest && (
              <button
                onClick={() => {
                  onClose();
                  onReinvest(investment);
                }}
                className="flex-1 py-3 bg-[#27845D] hover:bg-[#1f6b4a] text-white text-xs font-bold rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Reinvest Yields / Add Units</span>
                <ArrowUpRight className="w-4 h-4" />
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
