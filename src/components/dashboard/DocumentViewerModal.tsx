import React, { useState } from 'react';
import { Investment } from '../../types/investment';
import { ShieldCheck, X, FileText, Download, Award, ArrowDown, Maximize2 } from 'lucide-react';
import { formatCurrency, formatDate } from '../../lib/utils';

interface DocumentViewerModalProps {
  investment: Investment | null;
  isOpen: boolean;
  onClose: () => void;
}

export const DocumentViewerModal: React.FC<DocumentViewerModalProps> = ({
  investment,
  isOpen,
  onClose,
}) => {
  const [downloadMsg, setDownloadMsg] = useState<string | null>(null);
  const [isDocked, setIsDocked] = useState<boolean>(false);

  if (!isOpen || !investment) return null;

  const handleDownloadDoc = (docName: string) => {
    setDownloadMsg(`Downloading ${docName}...`);
    setTimeout(() => setDownloadMsg(null), 2500);
  };

  return (
    <>
      {/* Light, ultra-clear backdrop: click outside to dismiss, keeps portfolio clearly visible */}
      {!isDocked && (
        <div 
          className="fixed inset-0 z-40 bg-black/15 transition-opacity" 
          onClick={onClose} 
        />
      )}

      {/* Brought down container: positioned at bottom right */}
      <div className="fixed bottom-3 right-3 sm:bottom-5 sm:right-5 z-50 animate-in slide-in-from-bottom-3 duration-200">
        {isDocked ? (
          /* Minimized Docked Bar at bottom edge */
          <div className="dash-card border shadow-2xl rounded-2xl px-3.5 py-2 flex items-center gap-2.5 text-xs">
            <div className="w-5 h-5 rounded-md bg-[#10B981] text-white flex items-center justify-center font-black shrink-0 shadow-xs">
              <Award className="w-3 h-3" />
            </div>
            <div className="min-w-0 pr-1">
              <span className="font-bold dash-text block text-[11px] leading-tight truncate max-w-[150px]">
                {investment.propertyTitle}
              </span>
              <span className="text-[9px] text-emerald-400 font-semibold block leading-tight">
                SPV Certificate · Docked Down
              </span>
            </div>
            <div className="flex items-center gap-1 border-l border-inherit/30 pl-2">
              <button
                onClick={() => setIsDocked(false)}
                className="px-2 py-1 rounded-md bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                title="Expand document preview"
              >
                <Maximize2 className="w-2.5 h-2.5" />
                <span>Open</span>
              </button>
              <button
                onClick={onClose}
                className="p-1 rounded-md hover:bg-white/10 dash-muted transition-colors cursor-pointer"
                title="Close document viewer"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          </div>
        ) : (
          /* Brought Down Document Preview Modal */
          <div className="dash-card rounded-2xl max-w-sm sm:max-w-md w-full max-w-[calc(100%-24px)] sm:w-[380px] p-4 sm:p-5 shadow-2xl border relative space-y-3 max-h-[82vh] overflow-y-auto">
            {/* Top Bar with Bring Down button for clearer view */}
            <div className="flex items-center justify-between pb-1.5 text-[9px] text-emerald-400 border-b border-inherit/20">
              <span className="font-semibold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                Anchored Down View
              </span>
              <button
                onClick={() => setIsDocked(true)}
                className="flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-white/10 dash-muted hover:text-white transition-colors cursor-pointer"
                title="Bring down to bottom bar for a clearer view of your portfolio"
              >
                <ArrowDown className="w-2.5 h-2.5" />
                <span>Bring Down</span>
              </button>
            </div>

            <button
              onClick={onClose}
              className="absolute top-4 right-4 w-6 h-6 rounded-full dash-inner dash-muted hover:opacity-80 flex items-center justify-center transition-colors cursor-pointer border"
            >
              <X className="w-3.5 h-3.5" />
            </button>

            <div className="flex items-center gap-2.5 pr-8">
              <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-[#10B981] to-[#047857] text-white flex items-center justify-center shrink-0">
                <Award className="w-3.5 h-3.5" />
              </div>
              <div>
                <h3 className="text-xs font-bold dash-text leading-tight">Official SPV Certificate</h3>
                <p className="text-[9px] dash-muted leading-tight">
                  Fractional notary registry document
                </p>
              </div>
            </div>

        {downloadMsg && (
          <div className="p-2 bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 rounded-lg text-[10px] font-semibold">
            {downloadMsg}
          </div>
        )}

        {/* Investment Summary Box */}
        <div className="dash-inner p-3 rounded-xl border space-y-1.5 text-[11px]">
          <div className="flex justify-between items-center">
            <span className="dash-muted">Asset</span>
            <span className="font-bold dash-text truncate max-w-[190px]">{investment.propertyTitle}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="dash-muted">Certificate</span>
            <span className="font-mono font-bold text-emerald-400 text-[10px]">{investment.certificateId}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="dash-muted">Tokens Acquired</span>
            <span className="font-bold dash-text">{investment.tokensPurchased} tokens ({formatCurrency(investment.totalAmountInvested)})</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="dash-muted">Date</span>
            <span className="font-medium dash-text">{formatDate(investment.purchasedAt)}</span>
          </div>
        </div>

        {/* Document List */}
        <div className="space-y-2">
          <h4 className="text-[10px] font-bold dash-text uppercase tracking-wider">Legal Instruments</h4>
          
          <div className="space-y-1.5">
            <div className="p-2.5 rounded-xl border flex items-center justify-between dash-inner hover:opacity-90 transition-all">
              <div className="flex items-center gap-2 min-w-0 pr-2">
                <FileText className="w-4 h-4 text-emerald-400 shrink-0" />
                <div className="min-w-0">
                  <span className="text-[11px] font-bold dash-text truncate block">SPV Shareholder Certificate</span>
                  <span className="text-[9px] dash-muted">PDF · Notary Certified</span>
                </div>
              </div>
              <button
                onClick={() => handleDownloadDoc('SPV_Certificate_' + investment.certificateId + '.pdf')}
                className="btn btn-secondary btn-sm text-[10px] font-semibold py-1 px-2.5 shrink-0"
              >
                <Download className="w-3 h-3 mr-1" /> PDF
              </button>
            </div>

            <div className="p-2.5 rounded-xl border flex items-center justify-between dash-inner hover:opacity-90 transition-all">
              <div className="flex items-center gap-2 min-w-0 pr-2">
                <FileText className="w-4 h-4 text-emerald-400 shrink-0" />
                <div className="min-w-0">
                  <span className="text-[11px] font-bold dash-text truncate block">RICS Property Valuation</span>
                  <span className="text-[9px] dash-muted">PDF · Jan 2026</span>
                </div>
              </div>
              <button
                onClick={() => handleDownloadDoc('RICS_Valuation_' + investment.propertyId + '.pdf')}
                className="btn btn-secondary btn-sm text-[10px] font-semibold py-1 px-2.5 shrink-0"
              >
                <Download className="w-3 h-3 mr-1" /> PDF
              </button>
            </div>

            <div className="p-2.5 rounded-xl border flex items-center justify-between dash-inner hover:opacity-90 transition-all">
              <div className="flex items-center gap-2 min-w-0 pr-2">
                <FileText className="w-4 h-4 text-emerald-400 shrink-0" />
                <div className="min-w-0">
                  <span className="text-[11px] font-bold dash-text truncate block">Notarized Purchase Deed</span>
                  <span className="text-[9px] dash-muted">PDF · Land Registry Extract</span>
                </div>
              </div>
              <button
                onClick={() => handleDownloadDoc('Notarized_Deed_' + investment.propertyId + '.pdf')}
                className="btn btn-secondary btn-sm text-[10px] font-semibold py-1 px-2.5 shrink-0"
              >
                <Download className="w-3 h-3 mr-1" /> PDF
              </button>
            </div>
          </div>
        </div>

        <div className="pt-1 flex justify-end">
          <button onClick={onClose} className="btn btn-primary text-[10px] font-bold py-1 px-4 cursor-pointer">
            Close
          </button>
        </div>
      </div>
    )}
  </div>
</>
);
};
