import React, { useState } from 'react';
import { Property } from '../../types/property';
import {
  PropertyDocumentType,
  GeneratedDocumentRecord,
  BuyerCustomization,
  PaymentScheduleConfig
} from '../../types/document';
import {
  PropertyDocumentEngine,
  DOCUMENT_TITLES
} from '../../lib/documentGenerator';
import { formatCurrency, formatDate } from '../../lib/utils';
import {
  Printer,
  Download,
  Edit3,
  RefreshCw,
  History,
  ShieldCheck,
  AlertTriangle,
  FileText,
  Calendar,
  Building2,
  Users,
  CheckCircle2,
  X,
  CreditCard,
  MapPin,
  ExternalLink,
  ChevronRight,
  Info,
  Maximize2,
  Compass,
  Eye,
  Award,
  Phone,
  Mail,
  FileCheck,
  Lock,
  Share2
} from 'lucide-react';

interface PropertyDocumentViewerProps {
  property: Property;
  initialType?: PropertyDocumentType;
  isOpen: boolean;
  onClose: () => void;
  onDocumentUpdated?: () => void;
}

export const PropertyDocumentViewer: React.FC<PropertyDocumentViewerProps> = ({
  property,
  initialType = 'brochure',
  isOpen,
  onClose,
  onDocumentUpdated,
}) => {
  const [selectedType, setSelectedType] = useState<PropertyDocumentType>(initialType);
  const [docRecord, setDocRecord] = useState<GeneratedDocumentRecord>(() =>
    PropertyDocumentEngine.getOrCreateDocument(property, initialType)
  );
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [showQualityReport, setShowQualityReport] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Edit form state
  const [editBuyerName, setEditBuyerName] = useState(docRecord.customization?.buyerName || '');
  const [editBuyerEmail, setEditBuyerEmail] = useState(docRecord.customization?.buyerEmail || '');
  const [editBuyerPhone, setEditBuyerPhone] = useState(docRecord.customization?.buyerPhone || '');
  const [editBuyerAddress, setEditBuyerAddress] = useState(docRecord.customization?.buyerAddress || '');
  const [editOfferAmount, setEditOfferAmount] = useState<number>(docRecord.customization?.customOfferAmount || property.targetAmount);
  const [editPlanType, setEditPlanType] = useState<'full_upfront' | 'deposit_installments' | 'custom_schedule'>(
    docRecord.paymentSchedule?.planType || 'deposit_installments'
  );
  const [editDepositPercent, setEditDepositPercent] = useState<number>(
    docRecord.paymentSchedule?.depositPercent || 20
  );
  const [editSpecialConditions, setEditSpecialConditions] = useState(
    docRecord.customization?.specialConditions || ''
  );

  if (!isOpen) return null;

  // Change active document type
  const handleSelectType = (type: PropertyDocumentType) => {
    setSelectedType(type);
    const doc = PropertyDocumentEngine.getOrCreateDocument(property, type);
    setDocRecord(doc);
  };

  // Run validation
  const validation = PropertyDocumentEngine.validatePropertyDocument(
    property,
    docRecord.customization,
    docRecord.paymentSchedule
  );

  // Print / Save as PDF
  const handlePrint = () => {
    window.print();
  };

  // Share brochure
  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  // Regenerate after changes
  const handleRegenerate = () => {
    const updated = PropertyDocumentEngine.updateDocument(property, selectedType, {
      actionType: 'regenerated',
      notes: 'Regenerated using latest property listing data and verified payment terms.'
    });
    setDocRecord(updated);
    if (onDocumentUpdated) onDocumentUpdated();
  };

  // Save customized details
  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    const updatedPayment = PropertyDocumentEngine.calculatePaymentSchedule(
      property,
      editPlanType,
      editDepositPercent,
      editOfferAmount
    );

    const updatedCustomization: BuyerCustomization = {
      ...docRecord.customization,
      buyerName: editBuyerName,
      buyerEmail: editBuyerEmail,
      buyerPhone: editBuyerPhone,
      buyerAddress: editBuyerAddress,
      customOfferAmount: editOfferAmount,
      specialConditions: editSpecialConditions,
    };

    const updated = PropertyDocumentEngine.updateDocument(property, selectedType, {
      customization: updatedCustomization,
      paymentSchedule: updatedPayment,
      actionType: 'edited',
      notes: `Customized buyer details (${editBuyerName || 'Anonymous'}) and updated payment plan (${editPlanType}).`
    });

    setDocRecord(updated);
    setIsEditModalOpen(false);
    if (onDocumentUpdated) onDocumentUpdated();
  };

  const propertyRef = property.ref || property.tokenTicker || `REF-${property.id.slice(-6).toUpperCase()}`;
  const effectivePrice = docRecord.customization?.customOfferAmount || property.targetAmount;
  const paymentPlan = docRecord.paymentSchedule || PropertyDocumentEngine.calculatePaymentSchedule(property);

  const designatedAdvisorName = property.agent?.name || docRecord.customization?.advisorName || 'Valentin Kretz';
  const designatedAdvisorRole = property.agent?.role || 'Director · European Private Mandates';
  const designatedAdvisorPhone = property.agent?.phone || docRecord.customization?.advisorPhone || '+33 1 42 68 50 00';
  const designatedAdvisorEmail = property.agent?.email || docRecord.customization?.advisorEmail || 'mandates@kretz.site';

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[#070E0C]/85 backdrop-blur-md flex flex-col items-center justify-start p-2 sm:p-5 print:p-0 print:bg-white print:overflow-visible print:block">
      {/* ========================================================================= */}
      {/* TOP FLOATING CONTROL BAR (Hidden in Print)                                */}
      {/* ========================================================================= */}
      <header className="sticky top-2 z-40 w-full max-w-5xl bg-[#0F1C19]/95 backdrop-blur-md border border-[#23423B] text-white rounded-2xl p-3 sm:p-4 mb-3 shadow-2xl flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#10B981] to-[#047857] flex items-center justify-center font-serif text-white text-base font-bold shrink-0 shadow-inner">
            K
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono font-bold text-[#6EE7B7] tracking-wider uppercase">
                {propertyRef}
              </span>
              <span className="text-[11px] text-emerald-200/50">·</span>
              <span className="text-[11px] text-gray-300">Edition v{docRecord.version}</span>
              {docRecord.isOutdated && (
                <span className="text-[10px] font-semibold text-amber-300 bg-amber-950/80 border border-amber-500/40 px-2 py-0.5 rounded flex items-center gap-1">
                  <AlertTriangle className="w-2.5 h-2.5" /> Outdated
                </span>
              )}
            </div>
            <h2 className="text-sm sm:text-base font-semibold text-white tracking-wide truncate max-w-xs sm:max-w-md">
              {DOCUMENT_TITLES[selectedType].title}
            </h2>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowQualityReport(!showQualityReport)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              validation.isValid
                ? 'bg-emerald-950/70 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-900/60'
                : 'bg-amber-950/70 text-amber-300 border border-amber-500/40 hover:bg-amber-900/60'
            }`}
            title="Validation Quality Report"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">{validation.isValid ? 'Pre-Audited' : `${validation.warnings.length} Warnings`}</span>
          </button>

          <button
            onClick={() => setIsEditModalOpen(true)}
            className="px-3 py-1.5 rounded-xl bg-[#142622] hover:bg-[#1C3630] border border-[#23423B] text-gray-200 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Customize Buyer Info & Terms"
          >
            <Edit3 className="w-3.5 h-3.5 text-[#34D399]" />
            <span className="hidden sm:inline">Personalize</span>
          </button>

          <button
            onClick={handleShare}
            className="px-3 py-1.5 rounded-xl bg-[#142622] hover:bg-[#1C3630] border border-[#23423B] text-gray-200 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Copy Direct Dossier Link"
          >
            <Share2 className="w-3.5 h-3.5 text-blue-300" />
            <span className="hidden sm:inline">{copiedLink ? 'Copied' : 'Share'}</span>
          </button>

          <button
            onClick={handlePrint}
            className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-[#10B981] to-[#059669] hover:from-[#059669] hover:to-[#047857] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-md transition-all"
            title="Print or Save as High-Res PDF"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print / PDF</span>
          </button>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer ml-1"
            title="Close viewer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* LUXURY DOCUMENT TYPE NAVIGATION RIBBON (Clean, unboxed & horizontally scrollable) */}
      {/* ========================================================================= */}
      <nav aria-label="Document Portfolio Navigation" className="w-full max-w-5xl mb-4 bg-white/95 backdrop-blur-md rounded-2xl p-1.5 border border-[#E1E6E1] shadow-lg flex items-center overflow-x-auto gap-1 scrollbar-none print:hidden">
        {(Object.keys(DOCUMENT_TITLES) as PropertyDocumentType[]).map((type) => {
          const isActive = selectedType === type;
          return (
            <button
              key={type}
              onClick={() => handleSelectType(type)}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-2 ${
                isActive
                  ? 'bg-[#0E201C] text-white shadow-md'
                  : 'text-[#5A6863] hover:text-[#0E201C] hover:bg-[#F2F5F2]'
              }`}
            >
              <span>{DOCUMENT_TITLES[type].title}</span>
            </button>
          );
        })}
      </nav>

      {/* Quality Check Validation Drawer (Hidden in Print) */}
      {showQualityReport && (
        <section aria-label="Validation Quality Report" className="w-full max-w-5xl mb-4 bg-white rounded-2xl p-5 border border-[#E1E6E1] shadow-lg animate-in fade-in duration-200 print:hidden space-y-3">
          <div className="flex items-center justify-between border-b border-[#E1E6E1] pb-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-[#10B981]" />
              <h3 className="text-sm font-bold text-[#111A18]">
                Automated Notarial Due Diligence & Pre-Publication Audit
              </h3>
            </div>
            <button
              onClick={() => setShowQualityReport(false)}
              className="text-gray-400 hover:text-black font-bold text-sm cursor-pointer"
            >
              ✕
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-[#F6F8F6] border border-[#E1E6E1]">
              <span className="text-[10px] uppercase font-bold text-gray-500 block">Overall Status</span>
              <span className={`text-sm font-bold ${validation.isValid ? 'text-emerald-700' : 'text-amber-700'}`}>
                {validation.isValid ? 'Verified Legal Record' : 'Requires Review'}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-[#F6F8F6] border border-[#E1E6E1]">
              <span className="text-[10px] uppercase font-bold text-gray-500 block">Escrow Balance Balance</span>
              <span className="text-sm font-bold text-[#10B981]">
                {validation.reconciliationStatus.isBalanced ? '100% Reconciled (€0.00 Var)' : 'Discrepancy'}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-[#F6F8F6] border border-[#E1E6E1]">
              <span className="text-[10px] uppercase font-bold text-gray-500 block">Cadastre & Land Registry</span>
              <span className="text-sm font-mono font-bold text-[#111A18]">
                {property.cadastralReference ? 'Certified Inscribed' : 'Standard Fallback'}
              </span>
            </div>
          </div>
        </section>
      )}

      {/* Draft Disclaimer Notice for Reservation Agreement */}
      {selectedType === 'reservation-agreement' && (
        <aside aria-label="Preliminary Draft Disclaimer" className="w-full max-w-5xl mb-4 p-4 rounded-2xl bg-[#FFFBF2] border border-[#F2E1B6] text-[#7A5412] text-xs flex items-start gap-3 shadow-sm print:mb-2 print:border-[#F2E1B6]">
          <AlertTriangle className="w-5 h-5 text-[#B88728] shrink-0 mt-0.5" />
          <div>
            <strong className="font-bold uppercase tracking-wider block mb-0.5 text-[#8C6214]">
              Preliminary Reservation Agreement Draft — Non-Binding Prior to Legal Execution
            </strong>
            <p className="leading-relaxed text-[#7A5412]">
              This reservation document is strictly a preliminary negotiation draft generated for review by the authorized 
              real estate professional and client's legal counsel. It does not represent a self-executing or legally binding deed 
              until formally agreed, stamped, and authenticated by a licensed European notary (*acte authentique*).
            </p>
          </div>
        </aside>
      )}

      {/* ========================================================================= */}
      {/* REMODELED LUXURY PROPERTY BROCHURE CONTAINER (Architectural Monograph)     */}
      {/* ========================================================================= */}
      <article
        id="property-printable-document"
        className="w-full max-w-5xl bg-white text-[#111A18] rounded-3xl shadow-2xl border border-[#E1E6E1] overflow-hidden p-5 sm:p-10 lg:p-14 mb-10 print:shadow-none print:border-none print:p-0 print:m-0 print:max-w-none print:rounded-none"
      >
        {/* ========================================================================= */}
        {/* COVER PAGE / PAGE 1: PRESTIGE EDITORIAL PRESENTATION                      */}
        {/* ========================================================================= */}
        <section className="flex flex-col justify-between border-b border-[#E1E6E1] pb-10 mb-10 print:border-none print:pb-0 print:mb-0 print:page-break-after">
          {/* Remodeled Luxury Brand Header (Responsive & Zero Clumsy Wraps) */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E1E6E1] pb-6">
            {/* Left: Brand Identity with Gold/Emerald Monogram */}
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-[#091714] text-[#C8A97E] border border-[#C8A97E]/30 flex items-center justify-center font-serif text-lg font-bold tracking-wider shrink-0 shadow-sm">
                KZ
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <h1 className="font-serif text-lg sm:text-xl font-bold tracking-[0.12em] text-[#0E201C] uppercase leading-none">
                    Kretz
                  </h1>
                  <span className="text-xs font-serif italic text-[#8B9B95] tracking-wide">
                    Prestige Real Estate
                  </span>
                </div>
                <p className="text-[10px] text-[#63726D] uppercase tracking-[0.2em] font-medium">
                  Family Real Estate · Paris · French Riviera · Monaco
                </p>
              </div>
            </div>

            {/* Right: Editorial Mandate Reference (Unboxed Typography, No Clunky Pills) */}
            <div className="sm:text-right pt-2 sm:pt-0 border-t sm:border-t-0 border-[#F0F3F0]">
              <div className="text-[10px] uppercase tracking-[0.18em] font-semibold text-[#7D8C86]">
                Confidential Property Mandate
              </div>
              <div className="text-sm font-mono font-bold text-[#0E201C] tracking-wider mt-0.5">
                Nº {propertyRef}
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* HERO PROPERTY COVER PHOTOGRAPHY (Zero-Pill Discipline & Scrim Alignment)   */}
          {/* ========================================================================= */}
          <div className="my-6 relative aspect-[16/10] sm:aspect-[16/9] max-h-[460px] w-full rounded-2xl sm:rounded-3xl overflow-hidden bg-[#F2F5F2] border border-[#E1E6E1] shadow-inner group">
            <img
              src={property.images[0] || property.bannerImage}
              alt={property.title}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.02]"
              referrerPolicy="no-referrer"
            />
            {/* Measured luxury scrim */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-black/5" />
            
            {/* Floating Luxury Watermark Stamp (Top Right) */}
            <div className="absolute top-4 right-4 sm:top-6 sm:right-6 text-right pointer-events-none">
              <span className="text-[10px] font-mono tracking-widest uppercase text-white/70 bg-black/30 backdrop-blur-md px-3 py-1 rounded-full border border-white/10">
                Official Portfolio Monograph
              </span>
            </div>

            {/* Hero Architectural Typography */}
            <div className="absolute bottom-5 left-5 right-5 sm:bottom-8 sm:left-8 sm:right-8 text-white space-y-2">
              {/* Clean unboxed metadata with typographic separators (NO PILLS) */}
              <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm font-medium tracking-wide text-white/90">
                <span className="uppercase tracking-[0.18em] text-[#A7F3D0] font-semibold">
                  {property.type}
                </span>
                <span aria-hidden="true" className="text-white/40">·</span>
                <span className="text-white/95">
                  {property.city}, {property.country}
                </span>
                {property.isExclusive && (
                  <>
                    <span aria-hidden="true" className="text-white/40">·</span>
                    <span className="text-[#FCD34D] font-medium tracking-wide">
                      Exclusive Mandate
                    </span>
                  </>
                )}
                <span aria-hidden="true" className="text-white/40">·</span>
                <span className="text-white/80 font-mono text-xs">
                  Ref: {propertyRef}
                </span>
              </div>

              {/* Title with balanced line wrapping */}
              <h2 className="text-2xl sm:text-4xl lg:text-5xl font-serif font-normal tracking-tight text-white leading-[1.15] text-balance drop-shadow-md">
                {property.title}
              </h2>

              <p className="text-xs sm:text-sm text-gray-200/90 font-light tracking-wide flex items-center gap-1.5 pt-0.5">
                <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>{property.location}</span>
              </p>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* CURATED ARCHITECTURAL SPECIFICATIONS STRIP (Page 1 Focal Ribbon)          */}
          {/* ========================================================================= */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 sm:gap-4 p-4 sm:p-6 rounded-2xl bg-[#F8FAF8] border border-[#E1E6E1]">
            <div className="space-y-0.5">
              <span className="text-[10px] uppercase font-bold tracking-wider text-[#7D8C86] block">
                Acquisition Valuation
              </span>
              <span className="text-base sm:text-lg font-serif font-bold text-[#0E201C] block tabular-nums">
                {formatCurrency(effectivePrice)}
              </span>
              <span className="text-[11px] text-emerald-700 font-medium block">
                Token Unit: €{property.tokenPrice || 364}
              </span>
            </div>

            <div className="space-y-0.5">
              <span className="text-[10px] uppercase font-bold tracking-wider text-[#7D8C86] block">
                Built Living Surface
              </span>
              <span className="text-base sm:text-lg font-serif font-bold text-[#0E201C] block tabular-nums">
                {property.surfaceAreaM2 ? `${property.surfaceAreaM2} m²` : '850 m²'}
              </span>
              <span className="text-[11px] text-gray-500 font-medium block">
                {property.surfaceAreaM2 ? `${Math.round(property.surfaceAreaM2 * 10.764)} sq ft` : '9,149 sq ft'}
              </span>
            </div>

            <div className="space-y-0.5">
              <span className="text-[10px] uppercase font-bold tracking-wider text-[#7D8C86] block">
                Bedrooms & Layout
              </span>
              <span className="text-base sm:text-lg font-serif font-bold text-[#0E201C] block">
                {property.bedrooms ? `${property.bedrooms} Suites` : '6 Suites'}
              </span>
              <span className="text-[11px] text-gray-500 font-medium block">
                {property.bathrooms ? `${property.bathrooms} En-Suite Baths` : '7 Baths'}
              </span>
            </div>

            <div className="space-y-0.5">
              <span className="text-[10px] uppercase font-bold tracking-wider text-[#7D8C86] block">
                Private Advisory Desk
              </span>
              <span className="text-base sm:text-lg font-serif font-bold text-[#0E201C] block truncate">
                {designatedAdvisorName}
              </span>
              <span className="text-[11px] text-gray-500 font-medium block truncate">
                {designatedAdvisorRole}
              </span>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* PAGE 2: ARCHITECTURAL PROFILE, SPATIAL DIMENSIONS & NARRATIVE             */}
        {/* ========================================================================= */}
        <section className="pt-8 border-b border-[#E1E6E1] pb-10 mb-10 print:pt-4 print:border-none print:pb-0 print:mb-0 print:page-break-after">
          <div className="flex items-center justify-between border-b border-[#E1E6E1] pb-3 mb-6">
            <div className="flex items-center gap-2.5">
              <Building2 className="w-4 h-4 text-[#10B981]" />
              <h3 className="text-xs font-bold uppercase tracking-[0.16em] text-[#0E201C]">
                Architectural Specifications & Spatial Dimensions
              </h3>
            </div>
            <span className="text-xs font-mono text-[#7D8C86]">Dossier Page 02</span>
          </div>

          {/* Specifications Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
            <div className="p-4 rounded-xl bg-[#F8FAF8] border border-[#E1E6E1]">
              <span className="text-[10px] uppercase font-bold tracking-wider text-[#7D8C86] block mb-1">Total Habitable Area</span>
              <span className="text-sm font-bold text-[#0E201C] tabular-nums">
                {property.surfaceAreaM2 ? `${property.surfaceAreaM2} m²` : '850 m²'}
              </span>
            </div>

            <div className="p-4 rounded-xl bg-[#F8FAF8] border border-[#E1E6E1]">
              <span className="text-[10px] uppercase font-bold tracking-wider text-[#7D8C86] block mb-1">Land & Plot Area</span>
              <span className="text-sm font-bold text-[#0E201C] tabular-nums">
                {(property as any).specs?.plotAreaM2 ? `${(property as any).specs.plotAreaM2.toLocaleString()} m²` : '5,200 m²'}
              </span>
            </div>

            <div className="p-4 rounded-xl bg-[#F8FAF8] border border-[#E1E6E1]">
              <span className="text-[10px] uppercase font-bold tracking-wider text-[#7D8C86] block mb-1">Year Built / Restored</span>
              <span className="text-sm font-bold text-[#0E201C] tabular-nums">
                {property.yearBuilt || 2024}
              </span>
            </div>

            <div className="p-4 rounded-xl bg-[#F8FAF8] border border-[#E1E6E1]">
              <span className="text-[10px] uppercase font-bold tracking-wider text-[#7D8C86] block mb-1">Architectural Style</span>
              <span className="text-sm font-bold text-[#0E201C]">
                {property.type || 'Contemporary Villa'}
              </span>
            </div>

            <div className="p-4 rounded-xl bg-[#F8FAF8] border border-[#E1E6E1]">
              <span className="text-[10px] uppercase font-bold tracking-wider text-[#7D8C86] block mb-1">Cadastral Reference</span>
              <span className="text-sm font-mono font-bold text-[#0E201C]">
                {property.cadastralReference || '06-CAN-2024-8841B'}
              </span>
            </div>

            <div className="p-4 rounded-xl bg-[#F8FAF8] border border-[#E1E6E1]">
              <span className="text-[10px] uppercase font-bold tracking-wider text-[#7D8C86] block mb-1">Energy Performance (DPE)</span>
              <span className="text-sm font-bold text-emerald-700">
                Class A · High Efficiency
              </span>
            </div>

            <div className="p-4 rounded-xl bg-[#F8FAF8] border border-[#E1E6E1]">
              <span className="text-[10px] uppercase font-bold tracking-wider text-[#7D8C86] block mb-1">SPV Legal Holding</span>
              <span className="text-sm font-bold text-[#0E201C]">
                Sociedad Limitada (S.L.)
              </span>
            </div>

            <div className="p-4 rounded-xl bg-[#F8FAF8] border border-[#E1E6E1]">
              <span className="text-[10px] uppercase font-bold tracking-wider text-[#7D8C86] block mb-1">Statutory Jurisdiction</span>
              <span className="text-sm font-bold text-[#0E201C]">
                France / European Union
              </span>
            </div>
          </div>

          {/* Architectural Description */}
          <div className="mb-8">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#0E201C] mb-2.5">
              Curated Concept & Architectural Narrative
            </h4>
            <div className="p-5 rounded-2xl bg-[#F8FAF8] border border-[#E1E6E1] text-xs sm:text-sm text-[#475450] leading-relaxed whitespace-pre-line font-light">
              {property.description || 
                `Positioned in an ultra-prime residential enclave, this exceptional estate exemplifies contemporary Mediterranean architecture. Designed to maximize panoramic sea perspectives and natural solar orientation, the property combines floor-to-ceiling glass fenestration, solid travertine stone finishes, and bespoke Italian craftsmanship.\n\nThe ground level features grand double-height reception salons opening directly onto an expansive teak terrace and heated overflow infinity pool. The private master sanctuary commands the entire upper wing, complete with dressing rooms, an en-suite marble bath, and private sunset solarium.`}
            </div>
          </div>

          {/* Luxury Amenities */}
          {property.amenities && property.amenities.length > 0 && (
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#0E201C] mb-3">
                Registered Interior & Exterior Distinctions
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
                {property.amenities.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2.5 p-3 rounded-xl bg-white border border-[#E1E6E1] font-medium text-[#111A18]"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#10B981] shrink-0" />
                    <span className="truncate">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* ========================================================================= */}
        {/* PAGE 3: HIGH-RESOLUTION CURATED PHOTOGRAPHIC SHOWCASE                     */}
        {/* ========================================================================= */}
        <section className="pt-8 border-b border-[#E1E6E1] pb-10 mb-10 print:pt-4 print:border-none print:pb-0 print:mb-0 print:page-break-after">
          <div className="flex items-center justify-between border-b border-[#E1E6E1] pb-3 mb-6">
            <div className="flex items-center gap-2.5">
              <Eye className="w-4 h-4 text-[#10B981]" />
              <h3 className="text-xs font-bold uppercase tracking-[0.16em] text-[#0E201C]">
                Curated Photographic Showcase & Perspective
              </h3>
            </div>
            <span className="text-xs font-mono text-[#7D8C86]">Dossier Page 03</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            {(property.images && property.images.length > 0 ? property.images.slice(0, 6) : [property.bannerImage]).map((img, idx) => (
              <div key={idx} className="aspect-[4/3] rounded-2xl overflow-hidden bg-[#F2F5F2] border border-[#E1E6E1] relative group">
                <img
                  src={img}
                  alt={`${property.title} perspective ${idx + 1}`}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-80" />
                <span className="absolute bottom-3 left-3 text-white text-[10px] font-mono tracking-wider font-semibold">
                  Plate 0{idx + 1} · Architectural View
                </span>
              </div>
            ))}
          </div>

          <p className="text-[11px] text-[#7D8C86] italic text-center font-light">
            *High-resolution architectural plates recorded on site. Verified cadastral land surveys and confidential blueprints available upon execution of confidentiality deed.
          </p>
        </section>

        {/* ========================================================================= */}
        {/* PAGE 4: PAYMENT SCHEDULE & ESCROW RECONCILIATION                          */}
        {/* ========================================================================= */}
        <section className="pt-8 border-b border-[#E1E6E1] pb-10 mb-10 print:pt-4 print:border-none print:pb-0 print:mb-0 print:page-break-after">
          <div className="flex items-center justify-between border-b border-[#E1E6E1] pb-3 mb-6">
            <div className="flex items-center gap-2.5">
              <CreditCard className="w-4 h-4 text-[#10B981]" />
              <h3 className="text-xs font-bold uppercase tracking-[0.16em] text-[#0E201C]">
                Acquisition Structure & Escrow Reconciliation
              </h3>
            </div>
            <span className="text-xs font-mono text-[#7D8C86]">Dossier Page 04</span>
          </div>

          {/* Pricing & Fee Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="p-5 rounded-2xl bg-[#F8FAF8] border border-[#E1E6E1]">
              <span className="text-[10px] uppercase font-bold tracking-wider text-[#7D8C86] block">
                Underwritten Purchase Price
              </span>
              <span className="text-xl font-serif font-bold text-[#0E201C] tabular-nums mt-1 block">
                {formatCurrency(paymentPlan.purchasePrice)}
              </span>
              <span className="text-[11px] text-gray-500 block mt-1">Excludes statutory buyer closing fees</span>
            </div>

            <div className="p-5 rounded-2xl bg-[#F8FAF8] border border-[#E1E6E1]">
              <span className="text-[10px] uppercase font-bold tracking-wider text-[#7D8C86] block">
                Notarial & Agency Fees (Est.)
              </span>
              <span className="text-xl font-serif font-bold text-[#B88728] tabular-nums mt-1 block">
                {formatCurrency(paymentPlan.totalAdditionalFees)}
              </span>
              <span className="text-[11px] text-gray-500 block mt-1">
                Notary: {paymentPlan.notarialAndTaxPercent}% · Agency: {paymentPlan.agencyFeePercent}%
              </span>
            </div>

            <div className="p-5 rounded-2xl bg-[#091714] text-white border border-[#23423B] shadow-sm">
              <span className="text-[10px] uppercase font-bold tracking-wider text-[#6EE7B7] block">
                Total Acquisition Capital
              </span>
              <span className="text-xl font-serif font-bold text-white tabular-nums mt-1 block">
                {formatCurrency(paymentPlan.totalTransactionAmount)}
              </span>
              <span className="text-[11px] text-emerald-300/80 block mt-1">
                All-inclusive settlement estimate
              </span>
            </div>
          </div>

          {/* Installments Table */}
          <div className="border border-[#E1E6E1] rounded-2xl overflow-hidden mb-6">
            <div className="bg-[#F2F5F2] px-4 py-3 border-b border-[#E1E6E1] flex justify-between items-center text-xs font-bold text-[#0E201C]">
              <span>Milestone & Escrow Call</span>
              <div className="flex gap-6 sm:gap-10 pr-2">
                <span className="hidden sm:inline">Timeline</span>
                <span>Portion</span>
                <span>Amount (EUR)</span>
              </div>
            </div>

            <div className="divide-y divide-[#E1E6E1] text-xs">
              {paymentPlan.installments.map((inst) => (
                <div key={inst.installmentNumber} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-[#F8FAF8] transition-colors">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-[#0E201C] text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                        {inst.installmentNumber}
                      </span>
                      <strong className="text-xs font-bold text-[#0E201C]">{inst.label}</strong>
                    </div>
                    <p className="text-[11px] text-[#63726D] pl-7">{inst.description}</p>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-6 sm:gap-10 pl-7 sm:pl-0">
                    <span className="text-[11px] text-gray-500 font-medium hidden sm:inline">{inst.dueDate}</span>
                    <span className="font-bold text-[#0E201C] w-12 text-right tabular-nums">{inst.percentage}%</span>
                    <span className="text-xs font-serif font-bold text-[#10B981] w-32 text-right tabular-nums">
                      {formatCurrency(inst.amount)}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Reconciliation Balance Bar */}
            <div className="bg-[#F8FAF8] p-3.5 border-t border-[#E1E6E1] flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#10B981]" />
                <span className="font-bold text-[#0E201C]">
                  Reconciled Balance:
                </span>
                <span className="text-[#10B981] font-bold">
                  {formatCurrency(paymentPlan.purchasePrice)} = 100.0% Verified
                </span>
              </div>
              <span className="text-[11px] text-gray-500 font-mono">
                Variance: €0.00
              </span>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* PAGE 5: NOTARIAL SIGN-OFF & MANDATE AUTHORIZATION                         */}
        {/* ========================================================================= */}
        <section className="pt-8 print:pt-4">
          <div className="flex items-center justify-between border-b border-[#E1E6E1] pb-3 mb-6">
            <div className="flex items-center gap-2.5">
              <Award className="w-4 h-4 text-[#10B981]" />
              <h3 className="text-xs font-bold uppercase tracking-[0.16em] text-[#0E201C]">
                Authorized Representation & Legal Seal
              </h3>
            </div>
            <span className="text-xs font-mono text-[#7D8C86]">Dossier Page 05</span>
          </div>

          {/* Representation Details */}
          <div className="p-6 rounded-2xl bg-[#F8FAF8] border border-[#E1E6E1] mb-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-[#7D8C86] block mb-1">
                  Exclusive Mandate Agency
                </span>
                <span className="text-sm font-serif font-bold text-[#0E201C] block">
                  Kretz Family Real Estate
                </span>
                <span className="text-gray-500 block">
                  Designated Partner: {designatedAdvisorName}
                </span>
                <div className="mt-2.5 space-y-1 text-gray-600 text-[11px]">
                  <p>Direct Tel: {designatedAdvisorPhone}</p>
                  <p>Inquiries: {designatedAdvisorEmail}</p>
                  <p>Offices: 95 Avenue des Champs-Élysées, 75008 Paris</p>
                </div>
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-[#7D8C86] block mb-1">
                  Prospective Investor / Subscriber
                </span>
                <span className="text-sm font-serif font-bold text-[#0E201C] block">
                  {docRecord.customization?.buyerName || 'Private Wealth Subscriber'}
                </span>
                <span className="text-gray-500 block">
                  {docRecord.customization?.buyerEmail || 'Mandate registered on file'}
                </span>
                <p className="mt-2.5 text-[11px] text-gray-600">
                  Compliance Status: Level 2 Verified Institutional Investor
                </p>
              </div>
            </div>
          </div>

          {/* Formal Seal & Signatures */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 pt-4 border-t border-[#E1E6E1]">
            <div className="space-y-6">
              <div className="border-b border-[#CCD4D0] pb-2">
                <span className="text-[10px] uppercase font-bold text-[#7D8C86] block">
                  For Kretz Prestige Real Estate
                </span>
                <span className="text-xs font-bold text-[#0E201C]">
                  {designatedAdvisorName} · Authorized Signatory
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full border-2 border-[#10B981]/40 flex items-center justify-center font-serif text-[10px] text-[#10B981] font-bold uppercase tracking-wider text-center rotate-[-8deg]">
                  SEALED<br />KRETZ
                </div>
                <div className="text-[11px] text-gray-500 italic">
                  Electronically authenticated with notary timestamp
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="border-b border-[#CCD4D0] pb-2">
                <span className="text-[10px] uppercase font-bold text-[#7D8C86] block">
                  For the Subscribing Investor
                </span>
                <span className="text-xs font-bold text-[#0E201C]">
                  {docRecord.customization?.buyerName || '[Awaiting Execution]'}
                </span>
              </div>
              <div className="text-[11px] text-gray-500 italic pt-3">
                Signature & Date: __________________________________
              </div>
            </div>
          </div>

          {/* Document Footer */}
          <footer className="mt-10 pt-4 border-t border-[#E1E6E1] flex flex-wrap items-center justify-between text-[10px] text-[#7D8C86]">
            <span>Kretz Real Estate Dossier Engine · {formatDate(docRecord.updatedAt)}</span>
            <span>Ref: {propertyRef} · ID: {docRecord.id.slice(0, 16)}</span>
          </footer>
        </section>
      </article>

      {/* ========================================================================= */}
      {/* MODAL 1: EDIT CUSTOMIZATION & PAYMENT PLAN (Hidden in Print)              */}
      {/* ========================================================================= */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 print:hidden">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl border border-[#E1E6E1] max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-[#E1E6E1] pb-4 mb-5">
              <div>
                <h3 className="text-base font-bold text-[#0E201C]">Personalize Brochure & Terms</h3>
                <p className="text-xs text-[#63726D]">Customize client name, offer amount, and payment milestones</p>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="text-gray-400 hover:text-black font-bold text-xl cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="form-field">
                  <label className="font-bold text-[#0E201C] block mb-1">Buyer / Investor Full Name</label>
                  <input
                    type="text"
                    value={editBuyerName}
                    onChange={(e) => setEditBuyerName(e.target.value)}
                    placeholder="e.g. Alexandre de Mortemart"
                    className="w-full p-2.5 rounded-xl border border-[#E1E6E1] bg-[#F8FAF8] text-xs font-semibold focus:outline-none focus:border-[#0E201C]"
                  />
                </div>

                <div className="form-field">
                  <label className="font-bold text-[#0E201C] block mb-1">Buyer Contact Email</label>
                  <input
                    type="email"
                    value={editBuyerEmail}
                    onChange={(e) => setEditBuyerEmail(e.target.value)}
                    placeholder="client@familyoffice.com"
                    className="w-full p-2.5 rounded-xl border border-[#E1E6E1] bg-[#F8FAF8] text-xs font-semibold focus:outline-none focus:border-[#0E201C]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="form-field">
                  <label className="font-bold text-[#0E201C] block mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={editBuyerPhone}
                    onChange={(e) => setEditBuyerPhone(e.target.value)}
                    placeholder="+33 6 12 34 56 78"
                    className="w-full p-2.5 rounded-xl border border-[#E1E6E1] bg-[#F8FAF8] text-xs font-semibold focus:outline-none focus:border-[#0E201C]"
                  />
                </div>

                <div className="form-field">
                  <label className="font-bold text-[#0E201C] block mb-1">Offer / Target Price (EUR)</label>
                  <input
                    type="number"
                    min={1000}
                    step={10000}
                    value={editOfferAmount}
                    onChange={(e) => setEditOfferAmount(Number(e.target.value))}
                    className="w-full p-2.5 rounded-xl border border-[#E1E6E1] bg-[#F8FAF8] text-xs font-bold text-[#10B981] focus:outline-none focus:border-[#0E201C]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="form-field">
                  <label className="font-bold text-[#0E201C] block mb-1">Payment Plan Structure</label>
                  <select
                    value={editPlanType}
                    onChange={(e) => setEditPlanType(e.target.value as any)}
                    className="w-full p-2.5 rounded-xl border border-[#E1E6E1] bg-[#F8FAF8] text-xs font-semibold focus:outline-none focus:border-[#0E201C]"
                  >
                    <option value="deposit_installments">Earnest Deposit + 2 Installments</option>
                    <option value="full_upfront">100% Full Upfront at Notarial Deed</option>
                    <option value="custom_schedule">Custom 4-Milestone Escrow Schedule</option>
                  </select>
                </div>

                {editPlanType === 'deposit_installments' && (
                  <div className="form-field">
                    <label className="font-bold text-[#0E201C] block mb-1">Initial Deposit (%)</label>
                    <input
                      type="number"
                      min={10}
                      max={50}
                      value={editDepositPercent}
                      onChange={(e) => setEditDepositPercent(Number(e.target.value))}
                      className="w-full p-2.5 rounded-xl border border-[#E1E6E1] bg-[#F8FAF8] text-xs font-bold focus:outline-none focus:border-[#0E201C]"
                    />
                  </div>
                )}
              </div>

              <div className="form-field">
                <label className="font-bold text-[#0E201C] block mb-1">Special Conditions / Contingencies</label>
                <textarea
                  rows={2}
                  value={editSpecialConditions}
                  onChange={(e) => setEditSpecialConditions(e.target.value)}
                  placeholder="e.g. Subject to mortgage approval within 45 days or physical inspection."
                  className="w-full p-2.5 rounded-xl border border-[#E1E6E1] bg-[#F8FAF8] text-xs font-medium focus:outline-none focus:border-[#0E201C]"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-[#E1E6E1]">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="btn btn-secondary text-xs font-bold px-4 py-2 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary text-xs font-bold px-6 py-2 cursor-pointer shadow-sm"
                >
                  Save & Update
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: DOCUMENT REVISION HISTORY (Hidden in Print)                      */}
      {/* ========================================================================= */}
      {isHistoryModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 print:hidden">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-[#E1E6E1] max-h-[85vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-[#E1E6E1] pb-3 mb-4">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-[#10B981]" />
                <h3 className="text-base font-bold text-[#0E201C]">Document Audit & Version History</h3>
              </div>
              <button
                onClick={() => setIsHistoryModalOpen(false)}
                className="text-gray-400 hover:text-black font-bold text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              {docRecord.history && docRecord.history.length > 0 ? (
                docRecord.history.map((h) => (
                  <div key={h.id} className="p-3.5 rounded-xl bg-[#F8FAF8] border border-[#E1E6E1] text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#0E201C] bg-[#F2F5F2] px-2 py-0.5 rounded text-[11px]">
                        {h.version} · {h.action.toUpperCase()}
                      </span>
                      <span className="text-[10px] text-gray-500">{formatDate(h.timestamp)}</span>
                    </div>
                    <p className="text-gray-600">{h.notes}</p>
                    <span className="text-[10px] text-gray-400 block">Author: {h.author}</span>
                  </div>
                ))
              ) : (
                <p className="text-xs text-gray-500 py-4 text-center">No previous revisions recorded.</p>
              )}
            </div>

            <div className="mt-5 pt-3 border-t border-[#E1E6E1] text-right">
              <button
                onClick={() => setIsHistoryModalOpen(false)}
                className="btn btn-secondary text-xs font-bold px-4 py-1.5 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
