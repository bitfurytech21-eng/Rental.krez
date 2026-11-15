import React, { useState, useEffect, useRef } from 'react';
import { Property } from '../../types/property';
import { PropertyBrochureService, BrochureData } from '../../lib/propertyBrochureService';
import { formatCurrency, formatPercent } from '../../lib/utils';
import {
  FileText,
  Download,
  Printer,
  X,
  Share2,
  Check,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Building2,
  MapPin,
  Calendar,
  ShieldCheck,
  Layers,
  Sparkles,
  Phone,
  Mail,
  Archive,
  ExternalLink,
  Eye,
  CheckCircle2,
  Clock
} from 'lucide-react';

interface PropertyBrochureModalProps {
  property: Property;
  isOpen: boolean;
  onClose: () => void;
}

export const PropertyBrochureModal: React.FC<PropertyBrochureModalProps> = ({
  property,
  isOpen,
  onClose,
}) => {
  const [data, setData] = useState<BrochureData | null>(null);
  const [activePage, setActivePage] = useState<number>(1);
  const [viewMode, setViewMode] = useState<'paginated' | 'continuous'>('paginated');
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [isDownloadingZip, setIsDownloadingZip] = useState(false);
  const [zipProgressStatus, setZipProgressStatus] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const brochureFrameRef = useRef<HTMLIFrameElement>(null);

  // Initialize synchronized brochure data model on open
  useEffect(() => {
    if (isOpen && property) {
      PropertyBrochureService.prepareBrochureData(property).then((d) => {
        setData(d);
      });
      setActivePage(1);
    }
  }, [isOpen, property]);

  if (!isOpen || !data) return null;

  const handlePrint = () => {
    brochureFrameRef.current?.contentWindow?.focus();
    brochureFrameRef.current?.contentWindow?.print();
  };

  const handleDownloadPdf = async () => {
    try {
      setIsDownloadingPdf(true);
      handlePrint();
    } catch (err) {
      console.error('Failed to download PDF:', err);
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const handleDownloadZip = async () => {
    try {
      setIsDownloadingZip(true);
      await PropertyBrochureService.generateAndDownloadZip(data, (status) => {
        setZipProgressStatus(status);
      });
    } catch (err) {
      console.error('Failed to download ZIP bundle:', err);
    } finally {
      setIsDownloadingZip(false);
      setZipProgressStatus(null);
    }
  };

  const handleCopyLink = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(data.publicUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex flex-col items-center justify-between overflow-hidden print:bg-white print:static print:p-0">
      
      {/* ===================================================================== */}
      {/* 1. TOP COMMAND BAR (Controls, Downloads, Print, Close)                */}
      {/* ===================================================================== */}
      <header className="w-full bg-[#0E201C] text-white px-4 sm:px-6 py-3 border-b border-[#23423B] flex items-center justify-between gap-3 shrink-0 print:hidden z-10 shadow-lg">
        
        {/* Left: Brand & Property Identity */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-[#B7E36A] shrink-0 border border-white/10">
            <Building2 className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-white truncate">{property.title}</h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-white/10 text-[#B7E36A] font-bold shrink-0 hidden sm:inline">
                REF: {data.reference}
              </span>
            </div>
            <p className="text-[11px] text-[#A0B2AC] truncate">
              Official Property Brochure · A4 Print-Ready Architecture Presentation
            </p>
          </div>
        </div>

        {/* Center: Page Controls (for paginated mode) */}
        <div className="hidden lg:flex items-center gap-1.5 bg-[#142924] p-1 rounded-xl border border-[#23423B]">
          <button
            onClick={() => setActivePage(prev => Math.max(1, prev - 1))}
            disabled={activePage === 1}
            className="p-1.5 rounded-lg text-gray-300 hover:text-white disabled:opacity-30 disabled:hover:text-gray-300 cursor-pointer"
            title="Previous Page"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {[1, 2, 3, 4].map((pNum) => (
            <button
              key={pNum}
              onClick={() => setActivePage(pNum)}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activePage === pNum
                  ? 'bg-[#B7E36A] text-[#0E201C] shadow-sm'
                  : 'text-gray-300 hover:text-white hover:bg-white/5'
              }`}
            >
              Page {pNum}
            </button>
          ))}

          <button
            onClick={() => setActivePage(prev => Math.min(4, prev + 1))}
            disabled={activePage === 4}
            className="p-1.5 rounded-lg text-gray-300 hover:text-white disabled:opacity-30 disabled:hover:text-gray-300 cursor-pointer"
            title="Next Page"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Right: Actions (Download PDF, Download ZIP, Print, Close) */}
        <div className="flex items-center gap-2 shrink-0">
          
          {/* Zoom controls */}
          <div className="hidden md:flex items-center gap-1 bg-[#142924] px-2 py-1 rounded-xl border border-[#23423B] text-xs text-gray-300">
            <button
              onClick={() => setZoomLevel(prev => Math.max(70, prev - 10))}
              className="p-1 hover:text-white cursor-pointer"
              title="Zoom out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="font-mono text-[11px] w-9 text-center">{zoomLevel}%</span>
            <button
              onClick={() => setZoomLevel(prev => Math.min(130, prev + 10))}
              className="p-1 hover:text-white cursor-pointer"
              title="Zoom in"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Copy link */}
          <button
            onClick={handleCopyLink}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-gray-200 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Copy Public Link"
          >
            {copiedLink ? <Check className="w-4 h-4 text-[#B7E36A]" /> : <Share2 className="w-4 h-4" />}
          </button>

          {/* Print Button */}
          <button
            onClick={handlePrint}
            className="px-3.5 py-2 rounded-xl bg-[#142924] hover:bg-[#1C3630] border border-[#23423B] text-gray-200 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Print or Export directly via browser"
          >
            <Printer className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">Print</span>
          </button>

          {/* Download PDF Button */}
          <button
            onClick={handleDownloadPdf}
            disabled={isDownloadingPdf}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer shadow-md disabled:opacity-50"
            title="Open the print dialog to save this brochure as a PDF"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{isDownloadingPdf ? 'Preparing...' : 'Save PDF'}</span>
          </button>

          {/* Download ZIP Package Button */}
          <button
            onClick={handleDownloadZip}
            disabled={isDownloadingZip}
            className="px-4 py-2 rounded-xl bg-[#B7E36A] hover:bg-[#c6ec80] text-[#0E201C] text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer shadow-md disabled:opacity-50"
            title="Download complete ZIP archive with PDF, HTML brochure, README, and authorized photographs"
          >
            <Archive className="w-3.5 h-3.5" />
            <span className="hidden md:inline">{isDownloadingZip ? 'Bundling...' : 'Download ZIP'}</span>
            <span className="md:hidden">ZIP</span>
          </button>

          {/* Close button */}
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer ml-1"
            title="Close Brochure Viewer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* ZIP Progress Toast Overlay if building */}
      {isDownloadingZip && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-50 bg-[#0E201C] text-white border border-[#B7E36A]/50 px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4">
          <div className="w-4 h-4 border-2 border-[#B7E36A] border-t-transparent rounded-full animate-spin" />
          <div className="text-xs">
            <p className="font-bold text-[#B7E36A]">Generating Full Asset ZIP Bundle</p>
            <p className="text-[11px] text-slate-300">{zipProgressStatus || 'Bundling brochure assets...'}</p>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* 2. ON-SCREEN A4 BROCHURE PREVIEW CANVAS                                */}
      {/* ===================================================================== */}
      <main className="flex-1 w-full min-h-0 overflow-y-auto overflow-x-hidden p-2 sm:p-5 flex justify-center items-start print:p-0 print:overflow-visible">
        <div className="w-full max-w-[820px] h-full min-h-[1100px] bg-white shadow-2xl border border-slate-200 print:max-w-none print:w-full print:h-auto print:min-h-0 print:border-none print:shadow-none">
          <iframe
            ref={brochureFrameRef}
            title={`${property.title} — KRETZ SPAIN property brochure`}
            srcDoc={PropertyBrochureService.generateStandaloneHtml(data)}
            className="block w-full h-[calc(100vh-110px)] min-h-[1100px] border-0 bg-[#f7f2e8] print:h-auto print:min-h-0"
            sandbox="allow-same-origin allow-modals"
          />
        </div>
      </main>

    </div>
  );
};
