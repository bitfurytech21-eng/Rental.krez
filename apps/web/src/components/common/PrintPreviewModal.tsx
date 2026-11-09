import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Printer,
  Download,
  FileText,
  Sliders,
  Maximize2,
  Minimize2,
  ShieldCheck,
  CheckCircle2,
  Copy,
  Check
} from 'lucide-react';

export interface PrintPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  referenceNumber?: string;
  dateString?: string;
  htmlContent: string;
  onPrint: () => void;
  onDownloadPdf?: () => void;
  isDownloadingPdf?: boolean;
}

export const PrintPreviewModal: React.FC<PrintPreviewModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle = "Official L'Agence Real Estate Custody Document",
  referenceNumber,
  dateString = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
  htmlContent,
  onPrint,
  onDownloadPdf,
  isDownloadingPdf = false,
}) => {
  const [paperSize, setPaperSize] = useState<'A4' | 'Letter'>('A4');
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [margin, setMargin] = useState<'standard' | 'narrow' | 'none'>('standard');
  const [colorMode, setColorMode] = useState<'color' | 'monochrome'>('color');
  const [copiedRef, setCopiedRef] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Update iframe content when opened or when layout options change
  useEffect(() => {
    if (!isOpen || !iframeRef.current) return;

    const marginCss = margin === 'standard' ? '15mm' : margin === 'narrow' ? '8mm' : '0mm';
    const filterCss = colorMode === 'monochrome' ? 'filter: grayscale(100%);' : '';

    const styledHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          @page {
            size: ${paperSize} ${orientation};
            margin: ${marginCss};
          }
          body {
            margin: 0;
            padding: 0;
            ${filterCss}
          }
        </style>
      </head>
      <body>
        ${htmlContent}
      </body>
      </html>
    `;

    const doc = iframeRef.current.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(styledHtml);
      doc.close();
    }
  }, [isOpen, htmlContent, paperSize, orientation, margin, colorMode]);

  if (!isOpen) return null;

  const handleCopyRef = () => {
    if (!referenceNumber) return;
    navigator.clipboard.writeText(referenceNumber);
    setCopiedRef(true);
    setTimeout(() => setCopiedRef(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div
        className={`bg-[#0D1815] text-white rounded-3xl border border-[#1E3630] shadow-2xl flex flex-col transition-all duration-300 ${
          isFullscreen ? 'w-full h-full rounded-none' : 'w-full max-w-5xl h-[92vh]'
        }`}
      >
        {/* Header Toolbar */}
        <div className="p-4 sm:p-5 border-b border-[#1E3630] flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#13231F]/90 rounded-t-3xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#087F5B]/20 border border-[#087F5B]/40 text-[#087F5B] flex items-center justify-center shrink-0">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#087F5B] bg-[#087F5B]/15 px-2 py-0.5 rounded-full border border-[#087F5B]/30">
                  Print & PDF Preview Engine
                </span>
                {referenceNumber && (
                  <button
                    onClick={handleCopyRef}
                    className="text-[10px] font-mono text-gray-400 hover:text-white flex items-center gap-1 cursor-pointer transition-colors"
                    title="Click to copy reference ID"
                  >
                    <span>REF: {referenceNumber}</span>
                    {copiedRef ? <Check className="w-2.5 h-2.5 text-emerald-400" /> : <Copy className="w-2.5 h-2.5" />}
                  </button>
                )}
              </div>
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight mt-0.5">
                {title}
              </h2>
            </div>
          </div>

          {/* Quick Action Controls */}
          <div className="flex items-center gap-2.5 self-end md:self-auto flex-wrap">
            {onDownloadPdf && (
              <button
                onClick={onDownloadPdf}
                disabled={isDownloadingPdf}
                className="px-3.5 py-2 rounded-xl bg-[#1E3630] hover:bg-[#284941] text-emerald-300 border border-[#2B4E46] text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                title="Download verified vector PDF document"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{isDownloadingPdf ? 'Generating PDF...' : 'Download PDF'}</span>
              </button>
            )}

            <button
              onClick={onPrint}
              className="px-4 py-2.5 rounded-xl bg-[#087F5B] hover:bg-[#066548] text-white text-xs font-bold flex items-center gap-2 shadow-lg transition-all cursor-pointer"
              title="Send to browser print manager or printer"
            >
              <Printer className="w-4 h-4" />
              <span>Print Document Now</span>
            </button>

            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-2.5 rounded-xl bg-[#13231F] hover:bg-[#1E3630] text-gray-300 hover:text-white border border-[#1E3630] cursor-pointer transition-colors"
              title={isFullscreen ? 'Exit full screen' : 'Expand full screen'}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            <button
              onClick={onClose}
              className="p-2.5 rounded-xl bg-[#13231F] hover:bg-red-900/30 text-gray-400 hover:text-red-400 border border-[#1E3630] hover:border-red-800/40 cursor-pointer transition-colors"
              title="Close preview"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Print Settings Options Sub-bar */}
        <div className="px-4 py-2.5 bg-[#0B1412] border-b border-[#1E3630] flex flex-wrap items-center justify-between gap-3 text-xs text-gray-300">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-[#087F5B]" />
              <span className="font-bold text-gray-400">Layout Settings:</span>
            </div>

            {/* Paper Size */}
            <div className="flex items-center gap-1 bg-[#13231F] p-1 rounded-xl border border-[#1E3630]">
              <button
                onClick={() => setPaperSize('A4')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                  paperSize === 'A4' ? 'bg-[#087F5B] text-white shadow-xs' : 'text-gray-400 hover:text-white'
                }`}
              >
                A4
              </button>
              <button
                onClick={() => setPaperSize('Letter')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                  paperSize === 'Letter' ? 'bg-[#087F5B] text-white shadow-xs' : 'text-gray-400 hover:text-white'
                }`}
              >
                US Letter
              </button>
            </div>

            {/* Orientation */}
            <div className="flex items-center gap-1 bg-[#13231F] p-1 rounded-xl border border-[#1E3630]">
              <button
                onClick={() => setOrientation('portrait')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                  orientation === 'portrait' ? 'bg-[#087F5B] text-white shadow-xs' : 'text-gray-400 hover:text-white'
                }`}
              >
                Portrait
              </button>
              <button
                onClick={() => setOrientation('landscape')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                  orientation === 'landscape' ? 'bg-[#087F5B] text-white shadow-xs' : 'text-gray-400 hover:text-white'
                }`}
              >
                Landscape
              </button>
            </div>

            {/* Margins */}
            <div className="flex items-center gap-1 bg-[#13231F] p-1 rounded-xl border border-[#1E3630]">
              <button
                onClick={() => setMargin('standard')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                  margin === 'standard' ? 'bg-[#087F5B] text-white shadow-xs' : 'text-gray-400 hover:text-white'
                }`}
              >
                Standard Margins
              </button>
              <button
                onClick={() => setMargin('narrow')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                  margin === 'narrow' ? 'bg-[#087F5B] text-white shadow-xs' : 'text-gray-400 hover:text-white'
                }`}
              >
                Narrow
              </button>
            </div>

            {/* Color Mode */}
            <div className="flex items-center gap-1 bg-[#13231F] p-1 rounded-xl border border-[#1E3630]">
              <button
                onClick={() => setColorMode('color')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                  colorMode === 'color' ? 'bg-[#087F5B] text-white shadow-xs' : 'text-gray-400 hover:text-white'
                }`}
              >
                Color Accent
              </button>
              <button
                onClick={() => setColorMode('monochrome')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                  colorMode === 'monochrome' ? 'bg-[#087F5B] text-white shadow-xs' : 'text-gray-400 hover:text-white'
                }`}
              >
                Ink Saver (B&W)
              </button>
            </div>
          </div>

          <div className="text-[11px] text-gray-400 flex items-center gap-1.5 font-medium">
            <ShieldCheck className="w-3.5 h-3.5 text-[#087F5B]" />
            <span>Digital Proof Stamp Active</span>
          </div>
        </div>

        {/* Live Document Preview Frame */}
        <div className="flex-1 bg-[#1A2E28] p-4 sm:p-6 overflow-auto flex justify-center items-start">
          <div
            className={`bg-white text-black shadow-2xl rounded-sm transition-all duration-300 ${
              orientation === 'portrait' ? 'w-[210mm] min-h-[297mm]' : 'w-[297mm] min-h-[210mm]'
            }`}
            style={{
              transform: isFullscreen ? 'scale(0.95)' : 'scale(0.85)',
              transformOrigin: 'top center'
            }}
          >
            <iframe
              ref={iframeRef}
              title="Document Print Preview"
              className="w-full h-full border-0 min-h-[850px]"
            />
          </div>
        </div>

        {/* Footer Summary Bar */}
        <div className="p-3 bg-[#0B1412] border-t border-[#1E3630] text-center text-xs text-gray-400 rounded-b-3xl flex items-center justify-between px-6">
          <span>{subtitle}</span>
          <span className="font-mono text-[11px]">{dateString}</span>
        </div>
      </div>
    </div>
  );
};
