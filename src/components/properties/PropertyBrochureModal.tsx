import React, { useState, useEffect } from 'react';
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
    window.print();
  };

  const handleDownloadPdf = async () => {
    try {
      setIsDownloadingPdf(true);
      await PropertyBrochureService.downloadPdf(data);
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
            title="Download verified print-ready PDF"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{isDownloadingPdf ? 'Generating...' : 'Download PDF'}</span>
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
      <main className="flex-1 w-full overflow-y-auto overflow-x-hidden p-4 sm:p-8 flex justify-center items-start print:p-0 print:overflow-visible">
        <div
          className="w-full max-w-[820px] bg-white rounded-2xl shadow-2xl transition-all duration-200 border border-slate-200 print:shadow-none print:border-none print:max-w-none print:w-full"
          style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'top center' }}
        >
          
          {/* =================================================================== */}
          {/* PAGE 1: COVER & EXECUTIVE SUMMARY                                  */}
          {/* =================================================================== */}
          {(viewMode === 'continuous' || activePage === 1) && (
            <div className="p-8 sm:p-12 min-h-[1050px] flex flex-col justify-between border-b border-slate-200 print:border-none print:min-h-auto print:p-0 print:page-break-after">
              
              <div>
                {/* Header Masthead */}
                <div className="flex items-center justify-between pb-4 border-b-2 border-[#0E201C] mb-8">
                  <div>
                    <span className="text-2xl font-black text-[#0E201C] tracking-tight">
                      Kretz<span className="text-[#10B981]">.</span> Spain & International
                    </span>
                    <span className="text-[9px] font-extrabold uppercase tracking-widest text-slate-500 block mt-0.5">
                      Private Client Luxury Brokerage & Institutional Asset Custody
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">
                      CONFIDENTIAL DOSSIER
                    </span>
                    <span className="text-xs font-mono font-bold text-[#0E201C] bg-[#F8FAF7] px-2.5 py-0.5 rounded border border-slate-200 inline-block mt-0.5">
                      REF: {data.reference}
                    </span>
                  </div>
                </div>

                {/* Hero Showcase Image */}
                <div className="relative rounded-2xl overflow-hidden aspect-[16/10] bg-slate-100 mb-8 border border-slate-200">
                  <img
                    src={data.images[0] || property.bannerImage}
                    alt={property.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-4 left-4 bg-[#0E201C]/90 text-[#B7E36A] px-3.5 py-1 rounded-full text-xs font-extrabold tracking-wider uppercase backdrop-blur-md">
                    Mandat Exclusif · Prestige Portfolio
                  </div>
                  <div className="absolute top-4 right-4 bg-white/95 text-[#0E201C] px-3.5 py-1 rounded-full text-xs font-extrabold uppercase shadow-sm">
                    {property.status}
                  </div>
                  <div className="absolute bottom-4 left-4 right-4 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-4 rounded-xl text-white">
                    <span className="text-xs text-emerald-300 font-semibold uppercase tracking-wider block">
                      {property.type}
                    </span>
                    <span className="text-lg font-bold">
                      {property.location}, {property.city}, {property.country}
                    </span>
                  </div>
                </div>

                {/* Headline & Specs Banner */}
                <div className="space-y-4 mb-8 text-left">
                  <h1 className="text-3xl sm:text-4xl font-black text-[#0E201C] tracking-tight leading-tight">
                    {property.title}
                  </h1>
                  <p className="text-sm text-slate-600 flex items-center gap-1.5 font-medium">
                    <MapPin className="w-4 h-4 text-emerald-700 shrink-0" />
                    <span>{property.location}, {property.city}, {property.country}</span>
                  </p>
                </div>

                {/* 4-Box Key Highlights Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-5 rounded-2xl bg-[#F8FAF7] border border-slate-200 mb-8 text-left">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">
                      Valuation / Target
                    </span>
                    <span className="text-lg font-black text-[#0E201C] block tabular-nums mt-0.5">
                      {formatCurrency(property.targetAmount || 0)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">
                      Target Net Yield
                    </span>
                    <span className="text-lg font-black text-[#10B981] block tabular-nums mt-0.5">
                      {formatPercent(property.estimatedAnnualYield || 11.4)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">
                      Habitable Area
                    </span>
                    <span className="text-lg font-black text-[#0E201C] block tabular-nums mt-0.5">
                      {property.surfaceAreaM2 ? `${property.surfaceAreaM2} m²` : 'Bespoke Area'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">
                      Minimum Entry
                    </span>
                    <span className="text-lg font-black text-[#0E201C] block tabular-nums mt-0.5">
                      {formatCurrency(property.minimumInvestment || 750)}
                    </span>
                  </div>
                </div>

                {/* Summary Abstract */}
                <div className="text-xs sm:text-sm text-slate-700 leading-relaxed text-left space-y-2">
                  <p className="font-semibold text-slate-900 uppercase text-[11px] tracking-wider">
                    Executive Asset Synopsis
                  </p>
                  <p className="line-clamp-4">
                    {property.description ||
                      'Institutional luxury property acquisition presented under certified RICS valuation. All property deeds and investor rights are safeguarded via ring-fenced European SPV custody.'}
                  </p>
                </div>

              </div>

              {/* Page 1 Footer */}
              <div className="pt-6 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500">
                <span>{data.agency.brand} · {data.agency.address}</span>
                <span>Page 1 / 4 · Confidential Property Presentation</span>
              </div>
            </div>
          )}

          {/* =================================================================== */}
          {/* PAGE 2: ARCHITECTURAL SPECIFICATIONS & TECHNICAL DOSSIER           */}
          {/* =================================================================== */}
          {(viewMode === 'continuous' || activePage === 2) && (
            <div className="p-8 sm:p-12 min-h-[1050px] flex flex-col justify-between border-b border-slate-200 print:border-none print:min-h-auto print:p-0 print:page-break-after">
              
              <div>
                {/* Header Masthead */}
                <div className="flex items-center justify-between pb-4 border-b-2 border-[#0E201C] mb-8">
                  <div>
                    <span className="text-2xl font-black text-[#0E201C] tracking-tight">
                      Kretz<span className="text-[#10B981]">.</span> Spain & International
                    </span>
                    <span className="text-[9px] font-extrabold uppercase tracking-widest text-slate-500 block mt-0.5">
                      Architectural Narrative & Certified Technical Dossier
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-mono font-bold text-[#0E201C] bg-[#F8FAF7] px-2.5 py-0.5 rounded border border-slate-200">
                      REF: {data.reference}
                    </span>
                  </div>
                </div>

                {/* Architectural Narrative */}
                <div className="mb-8 text-left">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200 mb-3">
                    <h3 className="text-xs font-black uppercase tracking-wider text-[#0E201C]">
                      Curated Concept & Architectural Perspective
                    </h3>
                    <span className="text-[10px] font-bold text-emerald-700">RICS ACCREDITATION</span>
                  </div>
                  <div className="text-xs sm:text-sm text-slate-700 leading-relaxed space-y-2 whitespace-pre-line">
                    {property.description}
                  </div>
                </div>

                {/* Technical Specifications Table */}
                <div className="mb-8 text-left">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200 mb-3">
                    <h3 className="text-xs font-black uppercase tracking-wider text-[#0E201C]">
                      Verified Property Specifications
                    </h3>
                    <span className="text-[10px] font-mono text-slate-500">CADASTRAL REGISTRY</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    {data.verifiedSpecs.map((spec, i) => (
                      <div
                        key={i}
                        className="p-3 rounded-xl bg-[#F8FAF7] border border-slate-200 flex items-center justify-between"
                      >
                        <span className="font-bold text-slate-600">{spec.label}</span>
                        <span className="font-extrabold text-[#0E201C]">{spec.value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Amenities & Features */}
                {data.amenities.length > 0 && (
                  <div className="text-left">
                    <h3 className="text-xs font-black uppercase tracking-wider text-[#0E201C] pb-2 border-b border-slate-200 mb-3">
                      Registered Distinctions & Bespoke Amenities
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {data.amenities.map((item, idx) => (
                        <div
                          key={idx}
                          className="p-2.5 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-[#0E201C] flex items-center gap-2"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span className="truncate">{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              </div>

              {/* Page 2 Footer */}
              <div className="pt-6 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500">
                <span>{data.agency.brand} · Technical Due Diligence</span>
                <span>Page 2 / 4 · Specifications & Cadastre</span>
              </div>
            </div>
          )}

          {/* =================================================================== */}
          {/* PAGE 3: HIGH-RESOLUTION PHOTOGRAPHIC PORTFOLIO                     */}
          {/* =================================================================== */}
          {(viewMode === 'continuous' || activePage === 3) && (
            <div className="p-8 sm:p-12 min-h-[1050px] flex flex-col justify-between border-b border-slate-200 print:border-none print:min-h-auto print:p-0 print:page-break-after">
              
              <div>
                {/* Header Masthead */}
                <div className="flex items-center justify-between pb-4 border-b-2 border-[#0E201C] mb-8">
                  <div>
                    <span className="text-2xl font-black text-[#0E201C] tracking-tight">
                      Kretz<span className="text-[#10B981]">.</span> Spain & International
                    </span>
                    <span className="text-[9px] font-extrabold uppercase tracking-widest text-slate-500 block mt-0.5">
                      Curated Photographic Portfolio & Perspectives
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-mono font-bold text-[#0E201C] bg-[#F8FAF7] px-2.5 py-0.5 rounded border border-slate-200">
                      REF: {data.reference}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between pb-2 border-b border-slate-200 mb-6 text-left">
                  <h3 className="text-xs font-black uppercase tracking-wider text-[#0E201C]">
                    Authorized High-Resolution Gallery
                  </h3>
                  <span className="text-[10px] font-bold text-emerald-700">VERIFIED LICENSED ASSETS</span>
                </div>

                {/* 4-Image Luxury Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                  {data.images.slice(0, 4).map((imgUrl, idx) => (
                    <div
                      key={idx}
                      className="rounded-2xl overflow-hidden aspect-[4/3] bg-slate-100 border border-slate-200 relative group"
                    >
                      <img
                        src={imgUrl}
                        alt={`${property.title} perspective ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-md text-white text-[10px] font-bold px-2.5 py-1 rounded-md">
                        Perspective {idx + 1}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="p-4 rounded-xl bg-[#F8FAF7] border border-slate-200 text-[11px] text-slate-500 italic text-left">
                  All photographs represent the actual asset or certified architectural plans under institutional management. 
                  Unauthorized reproduction or dissemination is strictly prohibited under European copyright laws.
                </div>
              </div>

              {/* Page 3 Footer */}
              <div className="pt-6 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500">
                <span>{data.agency.brand} · Authentic Property Imagery</span>
                <span>Page 3 / 4 · Curated Gallery</span>
              </div>
            </div>
          )}

          {/* =================================================================== */}
          {/* PAGE 4: SPV LEGAL STRUCTURE, FINANCIALS & ACQUISITION DESK         */}
          {/* =================================================================== */}
          {(viewMode === 'continuous' || activePage === 4) && (
            <div className="p-8 sm:p-12 min-h-[1050px] flex flex-col justify-between print:min-h-auto print:p-0">
              
              <div>
                {/* Header Masthead */}
                <div className="flex items-center justify-between pb-4 border-b-2 border-[#0E201C] mb-8">
                  <div>
                    <span className="text-2xl font-black text-[#0E201C] tracking-tight">
                      Kretz<span className="text-[#10B981]">.</span> Spain & International
                    </span>
                    <span className="text-[9px] font-extrabold uppercase tracking-widest text-slate-500 block mt-0.5">
                      Acquisition Framework, SPV Custody & Private Advisory
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-mono font-bold text-[#0E201C] bg-[#F8FAF7] px-2.5 py-0.5 rounded border border-slate-200">
                      REF: {data.reference}
                    </span>
                  </div>
                </div>

                {/* SPV Legal Holding Box */}
                <div className="p-6 rounded-2xl bg-[#0E201C] text-white mb-8 text-left space-y-2 shadow-sm">
                  <div className="flex items-center gap-2 text-[#B7E36A]">
                    <ShieldCheck className="w-5 h-5 shrink-0" />
                    <h3 className="text-xs font-black uppercase tracking-wider">
                      Ring-Fenced Legal SPV Custody & Investor Protection
                    </h3>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    This real estate asset is held via an independent, ring-fenced Special Purpose Vehicle (Sociedad Limitada / SCI) exclusively dedicated to this property. 
                    All investor allocations correspond to digitally registered participatory notes notarized under European commercial jurisdiction. 
                    Rental distributions and capital returns are remitted through regulated escrow accounts.
                  </p>
                </div>

                {/* Financial Pro-Forma Summary */}
                <div className="mb-8 text-left">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200 mb-3">
                    <h3 className="text-xs font-black uppercase tracking-wider text-[#0E201C]">
                      Financial Pro-Forma Summary
                    </h3>
                    <span className="text-[10px] font-bold text-emerald-700">AUDITED STRUCTURE</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    {data.verifiedFinancials.map((fin, i) => (
                      <div
                        key={i}
                        className="p-3 rounded-xl bg-[#F8FAF7] border border-slate-200 flex items-center justify-between"
                      >
                        <span className="font-bold text-slate-600">{fin.label}</span>
                        <span className="font-extrabold text-[#0E201C]">{fin.value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Agent Card with Verifiable QR Code */}
                <div className="p-6 rounded-2xl bg-[#F8FAF7] border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-6 text-left mb-6">
                  <div className="flex items-center gap-4">
                    <img
                      src={data.agent.photo || data.images[0]}
                      alt={data.agent.name}
                      className="w-16 h-16 rounded-full object-cover border-2 border-[#0E201C] shadow-sm shrink-0"
                    />
                    <div className="space-y-1">
                      <h4 className="text-base font-extrabold text-[#0E201C]">{data.agent.name}</h4>
                      <p className="text-xs text-slate-500 font-medium">{data.agent.role} · {data.agency.brand}</p>
                      <div className="flex flex-wrap items-center gap-3 text-xs font-bold text-[#0E201C] pt-1">
                        <span className="flex items-center gap-1">📞 {data.agent.phone}</span>
                        <span className="flex items-center gap-1">✉️ {data.agent.email}</span>
                      </div>
                    </div>
                  </div>

                  {/* QR Code */}
                  <div className="flex flex-col items-center shrink-0">
                    {data.qrCodeDataUrl && (
                      <img
                        src={data.qrCodeDataUrl}
                        alt="QR Code to Property Page"
                        className="w-20 h-20 p-1 bg-white rounded-lg border border-slate-300 shadow-xs"
                      />
                    )}
                    <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 mt-1">
                      Scan for Live Portal
                    </span>
                  </div>
                </div>

                <p className="text-[10px] text-slate-400 text-left leading-normal">
                  Disclaimer: This brochure is prepared for informational presentation purposes only and does not constitute a public solicitation or offer of securities in jurisdictions where prohibited. Verified cadastral records and notarial documentation are available upon execution of standard confidentiality agreements.
                </p>

              </div>

              {/* Page 4 Footer */}
              <div className="pt-6 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500">
                <span>{data.agency.brand} · {data.agency.phone} · {data.agency.email}</span>
                <span>Page 4 / 4 · Legal Custody & Private Desk</span>
              </div>
            </div>
          )}

        </div>
      </main>

    </div>
  );
};
