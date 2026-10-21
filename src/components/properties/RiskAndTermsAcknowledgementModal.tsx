import React, { useState } from 'react';
import { Property } from '../../types/property';
import { formatEUR } from '../../lib/financialService';
import { AlertTriangle, ShieldCheck, Check, Lock, FileText } from 'lucide-react';

interface RiskAndTermsAcknowledgementModalProps {
  property: Property;
  investmentAmountEUR: number;
  tokensCount: number;
  onConfirm: () => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export const RiskAndTermsAcknowledgementModal: React.FC<RiskAndTermsAcknowledgementModalProps> = ({
  property,
  investmentAmountEUR,
  tokensCount,
  onConfirm,
  onCancel,
  isSubmitting = false,
}) => {
  const [agreedRisks, setAgreedRisks] = useState(false);
  const [agreedLiquidity, setAgreedLiquidity] = useState(false);
  const [agreedLegalTerms, setAgreedLegalTerms] = useState(false);

  const canProceed = agreedRisks && agreedLiquidity && agreedLegalTerms;

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div
        className="bg-white rounded-3xl w-full max-w-lg p-6 sm:p-8 space-y-6 shadow-2xl border border-[#E3E8E3] relative my-auto animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-start pb-4 border-b border-[#E3E8E3]">
          <div>
            <span className="text-xs font-bold text-[#27845D] uppercase tracking-wider block mb-1">
              Mandatory Regulatory Disclosure
            </span>
            <h3 className="text-xl font-black text-[#18211F]">
              Risk Disclosure & Subscription Consent
            </h3>
          </div>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 font-bold text-lg cursor-pointer p-1"
          >
            ✕
          </button>
        </div>

        {/* Investment Order Summary */}
        <div className="p-4 rounded-2xl bg-[#F6F7F4] border border-[#E3E8E3] space-y-1.5 text-xs">
          <div className="flex justify-between">
            <span className="text-[#69736F]">Target Offering:</span>
            <span className="font-bold text-[#18211F]">{property.title}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#69736F]">Total Investment Amount:</span>
            <span className="font-black text-[#27845D] text-sm">{formatEUR(investmentAmountEUR)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#69736F]">Tokens to Issue ({property.tokenTicker}):</span>
            <span className="font-mono font-bold text-[#18211F]">{tokensCount} Tokens</span>
          </div>
        </div>

        {/* Mandatory Checkboxes */}
        <div className="space-y-3 text-xs">
          <label className="flex items-start gap-3 p-3 rounded-xl border border-amber-200 bg-amber-50/60 cursor-pointer hover:bg-amber-50 transition-colors">
            <input
              type="checkbox"
              checked={agreedRisks}
              onChange={(e) => setAgreedRisks(e.target.checked)}
              className="mt-0.5 rounded text-[#27845D] focus:ring-[#27845D] w-4 h-4 cursor-pointer shrink-0"
            />
            <span className="text-amber-950 leading-relaxed font-medium">
              <strong>Risk Warning:</strong> I acknowledge that real estate investment involves a high risk of capital loss and returns are not guaranteed. Past performance is not predictive of future yield.
            </span>
          </label>

          <label className="flex items-start gap-3 p-3 rounded-xl border border-[#E3E8E3] bg-[#F6F7F4] cursor-pointer hover:bg-white transition-colors">
            <input
              type="checkbox"
              checked={agreedLiquidity}
              onChange={(e) => setAgreedLiquidity(e.target.checked)}
              className="mt-0.5 rounded text-[#27845D] focus:ring-[#27845D] w-4 h-4 cursor-pointer shrink-0"
            />
            <span className="text-[#69736F] leading-relaxed">
              <strong>Illiquidity Disclosure:</strong> I understand that tokens represent private SPV holdings with limited secondary market liquidity. Immediate redemption is not guaranteed prior to scheduled property maturity ({property.durationMonths || 21} months).
            </span>
          </label>

          <label className="flex items-start gap-3 p-3 rounded-xl border border-[#E3E8E3] bg-[#F6F7F4] cursor-pointer hover:bg-white transition-colors">
            <input
              type="checkbox"
              checked={agreedLegalTerms}
              onChange={(e) => setAgreedLegalTerms(e.target.checked)}
              className="mt-0.5 rounded text-[#27845D] focus:ring-[#27845D] w-4 h-4 cursor-pointer shrink-0"
            />
            <span className="text-[#69736F] leading-relaxed">
              <strong>SPV Terms & Disclosures:</strong> I have reviewed the SPV Tokenization Prospectus, Notary Title Deed extract, and General Investment Terms, agreeing to the governing jurisdiction of French / Spanish Courts.
            </span>
          </label>
        </div>

        {/* Actions */}
        <div className="pt-2 flex flex-col sm:flex-row gap-3">
          <button
            onClick={onCancel}
            className="btn btn-secondary w-full text-xs font-bold order-2 sm:order-1"
          >
            Cancel Order
          </button>

          <button
            onClick={onConfirm}
            disabled={!canProceed || isSubmitting}
            className="btn btn-primary w-full text-xs font-bold order-1 sm:order-2 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Executing Ledger Entry...</span>
              </>
            ) : (
              `Accept Terms & Execute ${formatEUR(investmentAmountEUR)}`
            )}
          </button>
        </div>

        <p className="text-[10px] text-center text-[#69736F] font-mono">
          Consent audit trail recorded with cryptographic timestamp and IP address.
        </p>
      </div>
    </div>
  );
};
