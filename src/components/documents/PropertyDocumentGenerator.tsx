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
  FileText,
  Printer,
  Download,
  Edit3,
  RefreshCw,
  ShieldCheck,
  AlertTriangle,
  Building2,
  CheckCircle2,
  X,
  CreditCard,
  MapPin,
  Calendar,
  Eye,
  ChevronRight,
  Maximize2,
  Lock,
  Signature as SignatureIcon,
  HelpCircle,
  Clock,
  Sparkles
} from 'lucide-react';

export interface PropertyDocumentGeneratorProps {
  property: Property;
  isOpen?: boolean;
  onClose?: () => void;
  initialType?: PropertyDocumentType;
  onDocumentUpdated?: () => void;
  buyerInfo?: BuyerCustomization;
  mode?: 'modal' | 'embedded';
}

/**
 * PropertyDocumentGenerator
 * Renders luxury property brochures and formal reservation forms/agreements
 * using the real Property data model, integrated with print stylesheets,
 * dynamic buyer customization, and reconciliation auditing.
 */
export const PropertyDocumentGenerator: React.FC<PropertyDocumentGeneratorProps> = ({
  property,
  isOpen = true,
  onClose,
  initialType = 'brochure',
  onDocumentUpdated,
  buyerInfo,
  mode = 'modal'
}) => {
  const [selectedType, setSelectedType] = useState<PropertyDocumentType>(initialType);
  const [docRecord, setDocRecord] = useState<GeneratedDocumentRecord>(() => {
    const existing = PropertyDocumentEngine.getOrCreateDocument(property, initialType);
    if (buyerInfo) {
      existing.customization = { ...existing.customization, ...buyerInfo };
    }
    return existing;
  });

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [showValidation, setShowValidation] = useState(false);

  // Editable buyer customization state
  const [buyerName, setBuyerName] = useState(buyerInfo?.buyerName || docRecord.customization?.buyerName || 'David Vance');
  const [buyerEmail, setBuyerEmail] = useState(buyerInfo?.buyerEmail || docRecord.customization?.buyerEmail || 'investor@kretz.com');
  const [buyerPhone, setBuyerPhone] = useState(buyerInfo?.buyerPhone || docRecord.customization?.buyerPhone || '+34 612 345 678');
  const [buyerNationality, setBuyerNationality] = useState(buyerInfo?.buyerNationality || docRecord.customization?.buyerNationality || 'Spanish / EU');
  const [buyerAddress, setBuyerAddress] = useState(buyerInfo?.buyerAddress || docRecord.customization?.buyerAddress || 'Paseo de la Castellana 45, Madrid');
  const [buyerPassport, setBuyerPassport] = useState(buyerInfo?.buyerPassportNumber || docRecord.customization?.buyerPassportNumber || 'ESP94820184A');
  const [depositPercent, setDepositPercent] = useState<number>(docRecord.paymentSchedule?.depositPercent || 10);
  const [specialConditions, setSpecialConditions] = useState(docRecord.customization?.specialConditions || 'Subject to clean title report and standard 14-day statutory reflection period.');

  if (!isOpen && mode === 'modal') return null;

  const propertyRef = property.ref || property.tokenTicker || `REF-${property.id.slice(-6).toUpperCase()}`;
  const effectivePrice = docRecord.customization?.customOfferAmount || property.targetAmount;
  const paymentPlan = PropertyDocumentEngine.calculatePaymentSchedule(
    property,
    docRecord.paymentSchedule?.planType || 'deposit_installments',
    depositPercent,
    effectivePrice
  );

  const reservationDepositAmount = Math.round(effectivePrice * (depositPercent / 100));

  // Run automated validation
  const validation = PropertyDocumentEngine.validatePropertyDocument(
    property,
    docRecord.customization,
    paymentPlan
  );

  const handleSelectDocType = (type: PropertyDocumentType) => {
    setSelectedType(type);
    const updated = PropertyDocumentEngine.getOrCreateDocument(property, type);
    setDocRecord(updated);
  };

  const handleSaveCustomization = (e: React.FormEvent) => {
    e.preventDefault();
    const updatedCustom: BuyerCustomization = {
      ...docRecord.customization,
      buyerName,
      buyerEmail,
      buyerPhone,
      buyerNationality,
      buyerAddress,
      buyerPassportNumber: buyerPassport,
      specialConditions
    };

    const updated = PropertyDocumentEngine.updateDocument(property, selectedType, {
      customization: updatedCustom,
      paymentSchedule: paymentPlan,
      actionType: 'edited',
      notes: 'Customized buyer identification and reservation parameters.'
    });

    setDocRecord(updated);
    setIsEditOpen(false);
    if (onDocumentUpdated) onDocumentUpdated();
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify({
      document: docRecord,
      property,
      paymentPlan,
      exportedAt: new Date().toISOString()
    }, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `${propertyRef}-${selectedType}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // The actual document paper content
  const documentContent = (
    <div className="w-full max-w-5xl mx-auto space-y-6">
      {/* Document Navigation & Controls Toolbar (Hidden in Print) */}
      <div className="bg-[#182D2A] text-white p-4 sm:p-5 rounded-3xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#00FF9D]/15 text-[#00FF9D] flex items-center justify-center font-bold">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white">Property Document Generator</h2>
              <span className="font-mono text-[11px] bg-emerald-950 px-2 py-0.5 rounded border border-emerald-500/30 text-[#00FF9D]">
                {propertyRef}
              </span>
            </div>
            <p className="text-xs text-emerald-200/70 truncate max-w-md">{property.title}</p>
          </div>
        </div>

        {/* Document Selector Pills */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => handleSelectDocType('brochure')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              selectedType === 'brochure'
                ? 'bg-[#00FF9D] text-[#031914] shadow-md'
                : 'bg-emerald-950/60 text-emerald-100 hover:bg-emerald-900/60 border border-emerald-500/20'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            Property Brochure
          </button>

          <button
            onClick={() => handleSelectDocType('reservation-agreement')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              selectedType === 'reservation-agreement' || selectedType === 'reservation-request'
                ? 'bg-[#00FF9D] text-[#031914] shadow-md'
                : 'bg-emerald-950/60 text-emerald-100 hover:bg-emerald-900/60 border border-emerald-500/20'
            }`}
          >
            <SignatureIcon className="w-3.5 h-3.5" />
            Reservation Form & Agreement
          </button>

          <button
            onClick={() => handleSelectDocType('payment-schedule')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              selectedType === 'payment-schedule'
                ? 'bg-[#00FF9D] text-[#031914] shadow-md'
                : 'bg-emerald-950/60 text-emerald-100 hover:bg-emerald-900/60 border border-emerald-500/20'
            }`}
          >
            <CreditCard className="w-3.5 h-3.5" />
            Payment Schedule
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsEditOpen(true)}
            className="px-3 py-2 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 text-white flex items-center gap-1.5 cursor-pointer transition-colors"
            title="Customize Buyer Info & Terms"
          >
            <Edit3 className="w-3.5 h-3.5 text-[#00FF9D]" />
            <span>Buyer Details</span>
          </button>

          <button
            onClick={() => setShowValidation(!showValidation)}
            className={`p-2 rounded-xl text-xs font-bold cursor-pointer transition-colors ${
              validation.reconciliationStatus.isBalanced ? 'bg-emerald-900/40 text-[#00FF9D]' : 'bg-red-900/40 text-red-300'
            }`}
            title="Validation Audit"
          >
            <ShieldCheck className="w-4 h-4" />
          </button>

          <button
            onClick={handlePrint}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-[#00FF9D] hover:bg-[#00E676] text-[#031914] flex items-center gap-1.5 cursor-pointer shadow-md transition-all font-black"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print / PDF</span>
          </button>

          {onClose && (
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Validation Audit Drawer (Hidden in Print) */}
      {showValidation && (
        <div className="bg-white p-5 rounded-3xl border border-[#E3E8E3] shadow-md text-xs space-y-3 print:hidden animate-in fade-in">
          <div className="flex items-center justify-between border-b border-[#E3E8E3] pb-2">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#27845D]" />
              <strong className="text-sm text-[#18211F]">Automated Document Audit & Legal Verification</strong>
            </div>
            <button onClick={() => setShowValidation(false)} className="text-gray-400 hover:text-black">Dismiss</button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3 rounded-2xl bg-[#F6F7F4] border border-[#E3E8E3]">
              <span className="text-gray-500 block mb-0.5 font-semibold">Payment Balance</span>
              <span className={`font-black ${validation.reconciliationStatus.isBalanced ? 'text-[#27845D]' : 'text-red-600'}`}>
                {validation.reconciliationStatus.isBalanced ? '✓ 100% Mathematically Reconciled' : 'Discrepancy Detected'}
              </span>
            </div>
            <div className="p-3 rounded-2xl bg-[#F6F7F4] border border-[#E3E8E3]">
              <span className="text-gray-500 block mb-0.5 font-semibold">Document Completeness</span>
              <span className="font-bold text-[#18211F]">
                {validation.missingFields.length === 0 ? '✓ Ready for Execution' : `${validation.missingFields.length} Fields Missing`}
              </span>
            </div>
            <div className="p-3 rounded-2xl bg-[#F6F7F4] border border-[#E3E8E3]">
              <span className="text-gray-500 block mb-0.5 font-semibold">Earnest Escrow Deposit</span>
              <span className="font-black text-[#27845D]">{formatCurrency(reservationDepositAmount)} ({depositPercent}%)</span>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* PRINTABLE REPORT / DOCUMENT BODY                                          */}
      {/* ========================================================================= */}
      <article
        id="property-printable-document"
        className="w-full bg-white text-[#18211F] rounded-3xl shadow-xl border border-[#E3E8E3] overflow-hidden p-6 sm:p-12 print:shadow-none print:border-none print:p-0 print:m-0 print:max-w-none print:rounded-none"
      >
        {/* Document Header Bar */}
        <header className="flex items-center justify-between border-b-2 border-[#182D2A] pb-5 mb-8">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-[#182D2A] text-[#00FF9D] flex items-center justify-center font-black text-base shadow-sm">
              KZ
            </div>
            <div>
              <h1 className="font-black text-lg tracking-tight text-[#18211F] leading-tight">
                Kretz Prestige Real Estate
              </h1>
              <p className="text-[10px] text-[#69736F] uppercase tracking-widest font-bold">
                Institutional Tokenized Property Syndicate & Asset Manager
              </p>
            </div>
          </div>

          <div className="text-right">
            <span className="text-[10px] uppercase font-bold text-[#69736F] block">Official Reference</span>
            <span className="text-sm font-mono font-black text-[#182D2A] bg-[#EEF1EC] px-3 py-0.5 rounded-lg border border-[#E3E8E3] inline-block">
              {propertyRef}
            </span>
          </div>
        </header>

        {/* ======================================================================= */}
        {/* VIEW 1: PROPERTY BROCHURE (Prestige Presentation)                       */}
        {/* ======================================================================= */}
        {selectedType === 'brochure' && (
          <div className="space-y-10">
            {/* Hero Cover Presentation */}
            <div className="relative aspect-[16/9] max-h-[420px] w-full rounded-3xl overflow-hidden bg-[#EEF1EC] border border-[#E3E8E3] shadow-inner">
              <img
                src={property.images[0] || property.bannerImage}
                alt={property.title}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
              
              <div className="absolute bottom-6 left-6 right-6 text-white space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="bg-[#00FF9D] text-[#031914] text-xs font-black uppercase px-3 py-1 rounded-full shadow-sm">
                    {property.type}
                  </span>
                  <span className="bg-white/20 backdrop-blur-md text-white text-xs font-semibold px-3 py-1 rounded-full">
                    {property.city}, {property.country}
                  </span>
                  <span className="bg-white/20 backdrop-blur-md text-emerald-300 text-xs font-bold px-3 py-1 rounded-full">
                    {property.estimatedAnnualYield}% Annual Yield
                  </span>
                </div>
                <h2 className="text-2xl sm:text-4xl font-black text-white leading-tight drop-shadow-md">
                  {property.title}
                </h2>
                <p className="text-xs sm:text-sm text-gray-200 font-medium">
                  {property.location}
                </p>
              </div>
            </div>

            {/* Quick Metrics KPI Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-5 rounded-2xl bg-[#F6F7F4] border border-[#E3E8E3]">
              <div>
                <span className="text-[10px] uppercase font-bold text-[#69736F] block">Target Acquisition</span>
                <span className="text-lg font-black text-[#27845D]">{formatCurrency(property.targetAmount)}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-[#69736F] block">Minimum Investment</span>
                <span className="text-lg font-black text-[#18211F]">{formatCurrency(property.minimumInvestment || 750)}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-[#69736F] block">Term Duration</span>
                <span className="text-lg font-black text-[#18211F]">{property.durationMonths} Months</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-[#69736F] block">Token Unit Price</span>
                <span className="text-lg font-black text-[#18211F]">€{property.tokenPrice} / token</span>
              </div>
            </div>

            {/* Architectural Profile & Spatial Specs */}
            <div className="space-y-4">
              <h3 className="text-sm font-black text-[#18211F] uppercase tracking-wider flex items-center gap-2 border-b border-[#E3E8E3] pb-2">
                <Building2 className="w-4 h-4 text-[#27845D]" />
                Architectural Profile & Specifications
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3.5 rounded-2xl bg-[#F6F7F4] border border-[#E3E8E3]">
                  <span className="text-[10px] uppercase font-bold text-[#69736F] block">Living Area</span>
                  <span className="text-sm font-black text-[#18211F]">{property.surfaceAreaM2 ? `${property.surfaceAreaM2} m²` : '350 m²'}</span>
                </div>
                <div className="p-3.5 rounded-2xl bg-[#F6F7F4] border border-[#E3E8E3]">
                  <span className="text-[10px] uppercase font-bold text-[#69736F] block">Bedrooms Layout</span>
                  <span className="text-sm font-black text-[#18211F]">{property.bedrooms ? `${property.bedrooms} Suites` : '5 Suites'}</span>
                </div>
                <div className="p-3.5 rounded-2xl bg-[#F6F7F4] border border-[#E3E8E3]">
                  <span className="text-[10px] uppercase font-bold text-[#69736F] block">Bathrooms</span>
                  <span className="text-sm font-black text-[#18211F]">{property.bathrooms ? `${property.bathrooms} Bathrooms` : '5 Bathrooms'}</span>
                </div>
                <div className="p-3.5 rounded-2xl bg-[#F6F7F4] border border-[#E3E8E3]">
                  <span className="text-[10px] uppercase font-bold text-[#69736F] block">Blockchain Network</span>
                  <span className="text-sm font-mono font-bold text-[#18211F]">{property.blockchainNetwork || 'Polygon POS'}</span>
                </div>
              </div>
            </div>

            {/* Curated Description */}
            <div className="space-y-3">
              <h3 className="text-sm font-black text-[#18211F] uppercase tracking-wider border-b border-[#E3E8E3] pb-2">
                Asset Narrative & Investment Structure
              </h3>
              <p className="text-xs sm:text-sm text-[#4A5550] leading-relaxed whitespace-pre-line">
                {property.description}
              </p>
            </div>

            {/* Photo Gallery Plates */}
            <div className="space-y-4">
              <h3 className="text-sm font-black text-[#18211F] uppercase tracking-wider flex items-center gap-2 border-b border-[#E3E8E3] pb-2">
                <Eye className="w-4 h-4 text-[#27845D]" />
                Curated Photographic Plates
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5">
                {(property.images && property.images.length > 0 ? property.images.slice(0, 6) : [property.bannerImage]).map((img, idx) => (
                  <div key={idx} className="aspect-[4/3] rounded-2xl overflow-hidden bg-[#EEF1EC] border border-[#E3E8E3] relative">
                    <img
                      src={img}
                      alt={`${property.title} plate ${idx + 1}`}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                    <span className="absolute bottom-2 left-2 bg-black/60 text-white text-[9px] font-bold px-2 py-0.5 rounded-md backdrop-blur-xs">
                      Plate 0{idx + 1}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Highlights & Amenities */}
            {property.highlights && property.highlights.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-black text-[#18211F] uppercase tracking-wider border-b border-[#E3E8E3] pb-2">
                  Key Amenities & Distinctions
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
                  {property.highlights.map((h, i) => (
                    <div key={i} className="flex items-center gap-2 p-3 rounded-xl bg-[#F6F7F4] border border-[#E3E8E3] font-semibold text-[#18211F]">
                      <CheckCircle2 className="w-4 h-4 text-[#27845D] shrink-0" />
                      <span>{h}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Agent / Broker Representation */}
            <div className="p-6 rounded-3xl bg-[#F6F7F4] border border-[#E3E8E3] flex flex-col sm:flex-row sm:items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl overflow-hidden bg-gray-200 shrink-0 border border-[#E3E8E3]">
                  <img
                    src={property.agent?.photo || "https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=256&q=80"}
                    alt={property.agent?.name || "Broker"}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-[#69736F] block">Authorized Portfolio Director</span>
                  <h4 className="text-base font-bold text-[#18211F]">{property.agent?.name || 'Louis Kretz'}</h4>
                  <p className="text-xs text-[#27845D] font-semibold">{property.agent?.role || 'Associate Director - French Riviera'}</p>
                </div>
              </div>

              <div className="text-xs text-[#69736F] space-y-1">
                <p>Direct: <strong className="text-[#18211F]">{property.agent?.phone || '+33 7 53 07 75 72'}</strong></p>
                <p>Email: <strong className="text-[#18211F]">{property.agent?.email || 'mandates@kretz.site'}</strong></p>
                <p>Authenticity: <strong className="text-[#27845D]">Verified Exclusive Mandate</strong></p>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================================= */}
        {/* VIEW 2: RESERVATION FORM & PRELIMINARY AGREEMENT                        */}
        {/* ======================================================================= */}
        {(selectedType === 'reservation-agreement' || selectedType === 'reservation-request') && (
          <div className="space-y-8">
            {/* Legal Preliminary Draft Alert */}
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 text-amber-950 text-xs flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <strong className="font-bold uppercase tracking-wider block text-amber-900 mb-0.5">
                  Official Reservation & Purchase Intent Agreement (Draft)
                </strong>
                <p className="leading-relaxed text-[11px]">
                  This document secures an exclusive asset reservation window. Upon bilateral execution and deposit confirmation,
                  the target property or tokenized allocation is ring-fenced for the designated buyer pending final notary settlement (*acte authentique*).
                </p>
              </div>
            </div>

            {/* Part I: Property & SPV Allocation */}
            <div className="space-y-3">
              <h3 className="text-sm font-black text-[#18211F] uppercase tracking-wider border-b border-[#E3E8E3] pb-2 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-[#27845D]" />
                Section 1: Subject Property & Allocation Details
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="p-4 rounded-2xl bg-[#F6F7F4] border border-[#E3E8E3] space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-500 font-semibold">Property Title:</span>
                    <strong className="text-[#18211F] text-right">{property.title}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500 font-semibold">Location / Address:</span>
                    <span className="font-bold text-[#18211F] text-right">{property.location}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500 font-semibold">Cadastral Ref:</span>
                    <span className="font-mono font-bold text-[#27845D]">{propertyRef}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500 font-semibold">Asset Structure:</span>
                    <span className="font-bold text-[#18211F]">{property.investmentStructure || 'Tokenized SPV / SCI Participative'}</span>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-[#F6F7F4] border border-[#E3E8E3] space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-500 font-semibold">Total Target Value:</span>
                    <strong className="text-lg font-black text-[#27845D]">{formatCurrency(effectivePrice)}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500 font-semibold">Reservation Deposit ({depositPercent}%):</span>
                    <strong className="text-sm font-black text-[#18211F]">{formatCurrency(reservationDepositAmount)}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500 font-semibold">Token Unit Value:</span>
                    <span className="font-bold text-[#18211F]">€{property.tokenPrice} / token</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500 font-semibold">Tokens Equivalent:</span>
                    <span className="font-bold text-[#18211F]">{Math.floor(effectivePrice / property.tokenPrice).toLocaleString()} Tokens</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Part II: Designated Buyer & Investor Details */}
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-[#E3E8E3] pb-2">
                <h3 className="text-sm font-black text-[#18211F] uppercase tracking-wider flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#27845D]" />
                  Section 2: Designated Buyer / Investor Identification
                </h3>
                <button
                  type="button"
                  onClick={() => setIsEditOpen(true)}
                  className="text-xs text-[#27845D] font-bold hover:underline flex items-center gap-1 print:hidden"
                >
                  <Edit3 className="w-3 h-3" /> Edit Details
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3.5 rounded-2xl bg-[#F6F7F4] border border-[#E3E8E3]">
                  <span className="text-[10px] uppercase font-bold text-gray-500 block">Full Legal Name</span>
                  <span className="text-sm font-bold text-[#18211F]">{buyerName}</span>
                </div>
                <div className="p-3.5 rounded-2xl bg-[#F6F7F4] border border-[#E3E8E3]">
                  <span className="text-[10px] uppercase font-bold text-gray-500 block">Email Address</span>
                  <span className="text-xs font-bold text-[#18211F]">{buyerEmail}</span>
                </div>
                <div className="p-3.5 rounded-2xl bg-[#F6F7F4] border border-[#E3E8E3]">
                  <span className="text-[10px] uppercase font-bold text-gray-500 block">Phone / Mobile</span>
                  <span className="text-xs font-bold text-[#18211F]">{buyerPhone}</span>
                </div>
                <div className="p-3.5 rounded-2xl bg-[#F6F7F4] border border-[#E3E8E3]">
                  <span className="text-[10px] uppercase font-bold text-gray-500 block">Passport / National ID</span>
                  <span className="text-xs font-mono font-bold text-[#18211F]">{buyerPassport}</span>
                </div>
                <div className="p-3.5 rounded-2xl bg-[#F6F7F4] border border-[#E3E8E3]">
                  <span className="text-[10px] uppercase font-bold text-gray-500 block">Nationality</span>
                  <span className="text-xs font-bold text-[#18211F]">{buyerNationality}</span>
                </div>
                <div className="p-3.5 rounded-2xl bg-[#F6F7F4] border border-[#E3E8E3]">
                  <span className="text-[10px] uppercase font-bold text-gray-500 block">Registered Domicile</span>
                  <span className="text-xs font-bold text-[#18211F] truncate block">{buyerAddress}</span>
                </div>
              </div>
            </div>

            {/* Part III: Structured Payment Schedule & Escrow Milestones */}
            <div className="space-y-3">
              <h3 className="text-sm font-black text-[#18211F] uppercase tracking-wider border-b border-[#E3E8E3] pb-2 flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-[#27845D]" />
                Section 3: Reservation Deposit & Installment Schedule
              </h3>

              <div className="border border-[#E3E8E3] rounded-2xl overflow-hidden">
                <div className="bg-[#EEF1EC] p-3 text-xs font-bold text-[#18211F] flex justify-between">
                  <span>Milestone Stage</span>
                  <div className="flex gap-8 pr-4">
                    <span>Due Date</span>
                    <span>Portion</span>
                    <span>Amount (EUR)</span>
                  </div>
                </div>

                <div className="divide-y divide-[#E3E8E3] text-xs">
                  {paymentPlan.installments.map((inst) => (
                    <div key={inst.installmentNumber} className="p-3.5 flex items-center justify-between hover:bg-gray-50">
                      <div>
                        <strong className="text-[#18211F] block">{inst.label}</strong>
                        <span className="text-[11px] text-gray-500">{inst.description}</span>
                      </div>
                      <div className="flex items-center gap-8">
                        <span className="text-gray-500 text-[11px]">{inst.dueDate}</span>
                        <span className="font-bold text-[#18211F] w-12 text-right">{inst.percentage}%</span>
                        <span className="font-black text-[#27845D] w-28 text-right">{formatCurrency(inst.amount)}</span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="bg-[#F6F7F4] p-3 border-t border-[#E3E8E3] flex justify-between items-center text-xs font-bold">
                  <span className="text-[#27845D] flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" /> 100% Reconciled to Asset Purchase Price
                  </span>
                  <span className="text-sm font-black text-[#18211F]">
                    Total: {formatCurrency(effectivePrice)}
                  </span>
                </div>
              </div>
            </div>

            {/* Part IV: Terms, Escrow & Statutory Reflection Period */}
            <div className="space-y-3">
              <h3 className="text-sm font-black text-[#18211F] uppercase tracking-wider border-b border-[#E3E8E3] pb-2">
                Section 4: Statutory Rights & Mandatory Escrow Terms
              </h3>
              <div className="p-4 rounded-2xl bg-[#F6F7F4] border border-[#E3E8E3] text-xs space-y-2 text-gray-700 leading-relaxed">
                <p>
                  <strong>1. Escrow Custody:</strong> All reservation funds and subsequent capital installments are held in segregated,
                  insolvency-remote client escrow accounts (Caisse des Dépôts / CaixaBank Institutional Escrow) under the supervision of a licensed European notary.
                </p>
                <p>
                  <strong>2. 14-Day Reflection Right:</strong> In accordance with European consumer financial protection directives, the buyer retains an unconditional right of withdrawal within 14 calendar days of reservation agreement countersignature.
                </p>
                <p>
                  <strong>3. Conditions Precedent:</strong> {specialConditions}
                </p>
              </div>
            </div>

            {/* Part V: Bilateral Execution & Signatures */}
            <div className="pt-6 border-t-2 border-[#182D2A] space-y-8">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#18211F]">
                Section 5: Bilateral Electronic Execution & Attestation
              </h4>
              <div className="grid grid-cols-2 gap-8 text-xs">
                <div className="space-y-8">
                  <div className="border-b border-gray-400 pb-2">
                    <span className="text-[10px] uppercase font-bold text-gray-500 block">Authorized Agency Representative</span>
                    <strong className="text-[#18211F] block mt-1">{property.agent?.name || 'Louis Kretz'}</strong>
                    <span className="text-gray-500 text-[11px]">Kretz Escrow Services S.L.</span>
                  </div>
                  <div className="text-[11px] text-gray-400 font-mono">
                    Official Digital Seal: 0x71c8...831ec7
                    <br />Date: {formatDate(docRecord.updatedAt)}
                  </div>
                </div>

                <div className="space-y-8">
                  <div className="border-b border-gray-400 pb-2">
                    <span className="text-[10px] uppercase font-bold text-gray-500 block">Designated Investor / Buyer</span>
                    <strong className="text-[#18211F] block mt-1">{buyerName}</strong>
                    <span className="text-gray-500 text-[11px]">Passport: {buyerPassport}</span>
                  </div>
                  <div className="text-[11px] text-gray-400 font-mono">
                    Investor e-Signature: [Electronically Certified]
                    <br />Date: {formatDate(new Date().toISOString())}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================================= */}
        {/* VIEW 3: PAYMENT SCHEDULE & RECONCILIATION SUMMARY                       */}
        {/* ======================================================================= */}
        {selectedType === 'payment-schedule' && (
          <div className="space-y-8">
            <div className="p-4 rounded-2xl bg-[#F6F7F4] border border-[#E3E8E3] flex justify-between items-center">
              <div>
                <h3 className="text-sm font-bold text-[#18211F]">Underwritten Total Capital Breakdown</h3>
                <p className="text-xs text-gray-500">Asset acquisition, escrow reserve and closing costs</p>
              </div>
              <span className="text-xl font-black text-[#27845D]">{formatCurrency(effectivePrice)}</span>
            </div>

            <div className="border border-[#E3E8E3] rounded-2xl overflow-hidden text-xs">
              <div className="bg-[#EEF1EC] p-3.5 font-bold text-[#18211F] flex justify-between">
                <span>Payment Installment</span>
                <div className="flex gap-10 pr-4">
                  <span>Timeline</span>
                  <span>Portion</span>
                  <span>Amount</span>
                </div>
              </div>

              <div className="divide-y divide-[#E3E8E3]">
                {paymentPlan.installments.map((inst) => (
                  <div key={inst.installmentNumber} className="p-4 flex items-center justify-between">
                    <div>
                      <strong className="text-[#18211F] text-sm block">{inst.label}</strong>
                      <span className="text-gray-500">{inst.description}</span>
                    </div>
                    <div className="flex items-center gap-10">
                      <span className="text-gray-500">{inst.dueDate}</span>
                      <span className="font-bold w-12 text-right">{inst.percentage}%</span>
                      <span className="font-black text-[#27845D] w-28 text-right">{formatCurrency(inst.amount)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Universal Footer */}
        <footer className="mt-12 pt-4 border-t border-[#E3E8E3] flex flex-wrap items-center justify-between text-[10px] text-[#828D89]">
          <span>Generated by Kretz Institutional Property Engine · {formatDate(docRecord.updatedAt)}</span>
          <span>Doc ID: {docRecord.id} · Ref: {propertyRef} · Version {docRecord.version}</span>
        </footer>
      </article>

      {/* ======================================================================= */}
      {/* MODAL: CUSTOMIZE BUYER & RESERVATION DATA (Hidden in Print)              */}
      {/* ======================================================================= */}
      {isEditOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 print:hidden animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl border border-[#E3E8E3] max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-[#E3E8E3] pb-4 mb-5">
              <div>
                <h3 className="text-lg font-bold text-[#18211F]">Customize Buyer & Reservation Terms</h3>
                <p className="text-xs text-gray-500">Update investor name, passport, contact, and earnest deposit</p>
              </div>
              <button onClick={() => setIsEditOpen(false)} className="text-gray-400 hover:text-black font-bold text-xl cursor-pointer">
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveCustomization} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-bold text-[#18211F] block mb-1">Buyer Full Name</label>
                  <input
                    type="text"
                    value={buyerName}
                    onChange={(e) => setBuyerName(e.target.value)}
                    required
                    className="w-full p-2.5 rounded-xl border border-[#E3E8E3] bg-[#F6F7F4] text-xs font-semibold focus:outline-none focus:border-[#182D2A]"
                  />
                </div>
                <div>
                  <label className="font-bold text-[#18211F] block mb-1">Email Address</label>
                  <input
                    type="email"
                    value={buyerEmail}
                    onChange={(e) => setBuyerEmail(e.target.value)}
                    required
                    className="w-full p-2.5 rounded-xl border border-[#E3E8E3] bg-[#F6F7F4] text-xs font-semibold focus:outline-none focus:border-[#182D2A]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-bold text-[#18211F] block mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={buyerPhone}
                    onChange={(e) => setBuyerPhone(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-[#E3E8E3] bg-[#F6F7F4] text-xs font-semibold focus:outline-none focus:border-[#182D2A]"
                  />
                </div>
                <div>
                  <label className="font-bold text-[#18211F] block mb-1">Passport / Tax ID</label>
                  <input
                    type="text"
                    value={buyerPassport}
                    onChange={(e) => setBuyerPassport(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-[#E3E8E3] bg-[#F6F7F4] text-xs font-mono font-bold focus:outline-none focus:border-[#182D2A]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-bold text-[#18211F] block mb-1">Nationality</label>
                  <input
                    type="text"
                    value={buyerNationality}
                    onChange={(e) => setBuyerNationality(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-[#E3E8E3] bg-[#F6F7F4] text-xs font-semibold focus:outline-none focus:border-[#182D2A]"
                  />
                </div>
                <div>
                  <label className="font-bold text-[#18211F] block mb-1">Reservation Deposit (%)</label>
                  <select
                    value={depositPercent}
                    onChange={(e) => setDepositPercent(Number(e.target.value))}
                    className="w-full p-2.5 rounded-xl border border-[#E3E8E3] bg-[#F6F7F4] text-xs font-bold text-[#27845D] focus:outline-none focus:border-[#182D2A]"
                  >
                    <option value={5}>5% Earnest Escrow</option>
                    <option value={10}>10% Standard Reservation</option>
                    <option value={20}>20% Substantial Reservation</option>
                    <option value={30}>30% Institutional Allocation</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-[#18211F] block mb-1">Registered Address</label>
                <input
                  type="text"
                  value={buyerAddress}
                  onChange={(e) => setBuyerAddress(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-[#E3E8E3] bg-[#F6F7F4] text-xs font-semibold focus:outline-none focus:border-[#182D2A]"
                />
              </div>

              <div>
                <label className="font-bold text-[#18211F] block mb-1">Special Conditions / Notes</label>
                <textarea
                  rows={2}
                  value={specialConditions}
                  onChange={(e) => setSpecialConditions(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-[#E3E8E3] bg-[#F6F7F4] text-xs font-medium focus:outline-none focus:border-[#182D2A]"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-[#E3E8E3]">
                <button
                  type="button"
                  onClick={() => setIsEditOpen(false)}
                  className="btn btn-secondary text-xs font-bold px-4 py-2 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary text-xs font-bold px-6 py-2 cursor-pointer bg-[#27845D] text-white shadow-sm"
                >
                  Save & Update Document
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );

  // If modal mode, wrap in full-screen backdrop modal
  if (mode === 'modal') {
    return (
      <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md overflow-y-auto p-4 sm:p-6 print:p-0 print:bg-white print:overflow-visible">
        <div className="min-h-screen flex items-start justify-center">
          {documentContent}
        </div>
      </div>
    );
  }

  // Embedded mode
  return documentContent;
};
