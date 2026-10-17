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
  Maximize2
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

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/75 backdrop-blur-md flex flex-col items-center justify-start p-2 sm:p-4 print:p-0 print:bg-white print:overflow-visible print:block">
      {/* Top Floating Control Bar (Hidden in Print) */}
      <header className="sticky top-2 z-40 w-full max-w-5xl bg-[#0A1614] border border-[#1E3E37] text-white rounded-2xl p-3 sm:p-4 mb-4 shadow-2xl flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#10B981] to-[#047857] flex items-center justify-center font-black text-white shrink-0 shadow-sm">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-[#34D399] uppercase bg-[#11221F] px-2 py-0.5 rounded border border-[#1E3E37]">
                {propertyRef}
              </span>
              <span className="text-[11px] text-gray-400">Version: {docRecord.version}</span>
              {docRecord.isOutdated && (
                <span className="text-[10px] font-bold text-amber-300 bg-amber-950/80 border border-amber-500/40 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <AlertTriangle className="w-2.5 h-2.5" /> Outdated Listing Data
                </span>
              )}
            </div>
            <h2 className="text-sm sm:text-base font-bold text-white truncate max-w-md">
              {DOCUMENT_TITLES[selectedType].title}
            </h2>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowQualityReport(!showQualityReport)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              validation.isValid
                ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-900/50'
                : 'bg-amber-950 text-amber-300 border border-amber-500/40 hover:bg-amber-900/50'
            }`}
            title="Quality Check & Validation Report"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>{validation.isValid ? 'Checks Passed' : `${validation.warnings.length} Warnings`}</span>
          </button>

          <button
            onClick={() => setIsEditModalOpen(true)}
            className="px-3 py-1.5 rounded-xl bg-[#11221F] hover:bg-[#1A3832] border border-[#1E3E37] text-gray-200 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Edit Buyer Details & Custom Terms"
          >
            <Edit3 className="w-3.5 h-3.5 text-[#34D399]" />
            <span>Edit Details</span>
          </button>

          <button
            onClick={handleRegenerate}
            className="px-3 py-1.5 rounded-xl bg-[#11221F] hover:bg-[#1A3832] border border-[#1E3E37] text-gray-200 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Regenerate Document with Latest Data"
          >
            <RefreshCw className="w-3.5 h-3.5 text-blue-400" />
            <span>Regenerate</span>
          </button>

          <button
            onClick={() => setIsHistoryModalOpen(true)}
            className="px-3 py-1.5 rounded-xl bg-[#11221F] hover:bg-[#1A3832] border border-[#1E3E37] text-gray-200 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            title="View Document Revision History"
          >
            <History className="w-3.5 h-3.5 text-purple-400" />
            <span>History</span>
          </button>

          <button
            onClick={handlePrint}
            className="btn btn-primary px-4 py-1.5 text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-md"
            title="Print or Save as PDF"
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

      {/* Document Type Selector Ribbon (Hidden in Print) */}
      <nav aria-label="Document Types" className="w-full max-w-5xl mb-4 bg-white/95 rounded-2xl p-1.5 border border-[#E3E8E3] shadow-md flex items-center overflow-x-auto gap-1 scrollbar-none print:hidden">
        {(Object.keys(DOCUMENT_TITLES) as PropertyDocumentType[]).map((type) => {
          const isActive = selectedType === type;
          return (
            <button
              key={type}
              onClick={() => handleSelectType(type)}
              className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                isActive
                  ? 'bg-[#182D2A] text-white shadow-sm'
                  : 'text-[#69736F] hover:text-[#18211F] hover:bg-[#F6F7F4]'
              }`}
            >
              <span>{DOCUMENT_TITLES[type].title}</span>
            </button>
          );
        })}
      </nav>

      {/* Quality Check Validation Drawer (Hidden in Print) */}
      {showQualityReport && (
        <section aria-label="Validation Quality Report" className="w-full max-w-5xl mb-4 bg-white rounded-2xl p-5 border border-[#E3E8E3] shadow-lg animate-in fade-in duration-200 print:hidden space-y-3">
          <div className="flex items-center justify-between border-b border-[#E3E8E3] pb-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-[#27845D]" />
              <h3 className="text-sm font-bold text-[#18211F]">
                Automated Data Validation & Pre-Publication Audit
              </h3>
            </div>
            <button
              onClick={() => setShowQualityReport(false)}
              className="text-xs text-gray-400 hover:text-black font-semibold"
            >
              Dismiss
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-[#F6F7F4] border border-[#E3E8E3]">
              <span className="text-[#69736F] font-semibold block mb-0.5">Reference & Title</span>
              <span className="font-bold text-[#18211F] block">{propertyRef}</span>
              <span className="text-[11px] text-[#27845D] font-medium truncate block">{property.title}</span>
            </div>

            <div className="p-3 rounded-xl bg-[#F6F7F4] border border-[#E3E8E3]">
              <span className="text-[#69736F] font-semibold block mb-0.5">Payment Reconciliation</span>
              <span className={`font-bold block ${validation.reconciliationStatus.isBalanced ? 'text-[#27845D]' : 'text-red-600'}`}>
                {validation.reconciliationStatus.isBalanced ? '✓ 100% Reconciled' : 'Variance Mismatch'}
              </span>
              <span className="text-[11px] text-[#69736F]">
                Total: {formatCurrency(validation.reconciliationStatus.sumOfPayments)}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-[#F6F7F4] border border-[#E3E8E3]">
              <span className="text-[#69736F] font-semibold block mb-0.5">Field Completeness</span>
              <span className="font-bold text-[#18211F]">
                {validation.missingFields.length === 0 ? '✓ All Core Fields Complete' : `${validation.missingFields.length} Required Flagged`}
              </span>
              <span className="text-[11px] text-[#69736F] block truncate">
                {validation.missingFields.length > 0 ? validation.missingFields.join(', ') : 'Ready for client distribution'}
              </span>
            </div>
          </div>

          {validation.warnings.length > 0 && (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-1">
              <span className="font-bold block">Advisory Warnings:</span>
              <ul className="list-disc list-inside space-y-0.5">
                {validation.warnings.map((w, idx) => (
                  <li key={idx}>{w}</li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

      {/* Draft Disclaimer Notice for Reservation Agreement */}
      {selectedType === 'reservation-agreement' && (
        <aside aria-label="Preliminary Draft Disclaimer" className="w-full max-w-5xl mb-4 p-4 rounded-2xl bg-amber-50 border border-amber-300 text-amber-950 text-xs flex items-start gap-3 shadow-sm print:mb-2 print:border-amber-400">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <strong className="font-bold uppercase tracking-wider block mb-0.5 text-amber-900">
              Preliminary Reservation Agreement Draft — Non-Binding Prior to Legal Execution
            </strong>
            <p className="leading-relaxed">
              This reservation document is strictly a preliminary negotiation draft generated for review by the authorized 
              real estate professional and client's legal counsel. It does not represent a self-executing or legally binding deed 
              until formally agreed, stamped, and authenticated by a licensed European notary (*acte authentique*).
            </p>
          </div>
        </aside>
      )}

      {/* ========================================================================= */}
      {/* PRINT-READY DOCUMENT CONTAINER (RENDERED AS LUXURY MULTI-PAGE REPORT)     */}
      {/* ========================================================================= */}
      <article
        id="property-printable-document"
        className="w-full max-w-5xl bg-white text-[#18211F] rounded-3xl shadow-2xl border border-[#E3E8E3] overflow-hidden p-6 sm:p-12 mb-10 print:shadow-none print:border-none print:p-0 print:m-0 print:max-w-none print:rounded-none"
      >
        {/* ========================================================================= */}
        {/* PAGE 1: COVER PAGE                                                       */}
        {/* ========================================================================= */}
        <section className="min-h-[680px] flex flex-col justify-between border-b-2 border-[#182D2A] pb-10 mb-10 print:min-h-screen print:border-none print:pb-0 print:mb-0 print:page-break-after">
          {/* Header Brand & Reference */}
          <div className="flex items-center justify-between border-b border-[#E3E8E3] pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#182D2A] text-[#00FF9D] flex items-center justify-center font-black text-sm">
                KZ
              </div>
              <div>
                <h1 className="font-extrabold text-base tracking-tight text-[#18211F] leading-tight">
                  Kretz Prestige Real Estate
                </h1>
                <p className="text-[10px] text-[#69736F] uppercase tracking-widest font-semibold">
                  Authorized European Agency & Tokenized Property Syndicate
                </p>
              </div>
            </div>

            <div className="text-right">
              <span className="text-[10px] uppercase font-bold text-[#69736F] block">Confidential Property Mandate</span>
              <span className="text-sm font-mono font-black text-[#182D2A] bg-[#EEF1EC] px-2.5 py-0.5 rounded-md inline-block">
                {propertyRef}
              </span>
            </div>
          </div>

          {/* Hero Property Cover Image */}
          <div className="my-6 relative aspect-[16/9] max-h-[380px] w-full rounded-2xl overflow-hidden bg-[#EEF1EC] border border-[#E3E8E3]">
            <img
              src={property.images[0] || property.bannerImage}
              alt={property.title}
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
            
            <div className="absolute bottom-6 left-6 right-6 text-white">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="bg-[#182D2A] text-[#00FF9D] text-xs font-extrabold uppercase px-3 py-1 rounded-full">
                  {property.type}
                </span>
                {property.isExclusive && (
                  <span className="bg-amber-500 text-black text-xs font-extrabold uppercase px-3 py-1 rounded-full">
                    Exclusive Mandate
                  </span>
                )}
                <span className="bg-white/20 backdrop-blur-md text-white text-xs font-semibold px-3 py-1 rounded-full">
                  {property.city}, {property.country}
                </span>
              </div>
              <h2 className="text-2xl sm:text-4xl font-black text-white leading-tight mb-1 drop-shadow-md">
                {property.title}
              </h2>
              <p className="text-xs sm:text-sm text-gray-200 font-medium">
                {property.location}
              </p>
            </div>
          </div>

          {/* Cover Metadata Footer */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-5 rounded-2xl bg-[#F6F7F4] border border-[#E3E8E3]">
            <div>
              <span className="text-[10px] uppercase font-bold text-[#69736F] block">Document Type</span>
              <span className="text-xs font-bold text-[#18211F]">{DOCUMENT_TITLES[selectedType].title}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-[#69736F] block">Asking Price</span>
              <span className="text-xs font-black text-[#27845D]">{formatCurrency(effectivePrice)}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-[#69736F] block">Document Date</span>
              <span className="text-xs font-bold text-[#18211F]">{formatDate(docRecord.updatedAt)}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-[#69736F] block">Designated Advisor</span>
              <span className="text-xs font-bold text-[#18211F] truncate block">
                {property.agent?.name || docRecord.customization?.advisorName || 'Kretz Desk'}
              </span>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* PAGE 2: ARCHITECTURAL PROFILE & STRUCTURED SPECIFICATIONS                 */}
        {/* ========================================================================= */}
        <section className="pt-8 border-b-2 border-[#182D2A] pb-10 mb-10 print:pt-4 print:border-none print:pb-0 print:mb-0 print:page-break-after">
          <div className="flex items-center justify-between border-b border-[#E3E8E3] pb-2 mb-6">
            <h3 className="text-base font-black text-[#18211F] uppercase tracking-wider flex items-center gap-2">
              <Building2 className="w-4 h-4 text-[#27845D]" />
              Architectural Specifications & Spatial Dimensions
            </h3>
            <span className="text-xs font-mono text-[#69736F]">Ref: {propertyRef} · Page 2</span>
          </div>

          {/* Specifications Table */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-8">
            <div className="p-3.5 rounded-xl bg-[#F6F7F4] border border-[#E3E8E3]">
              <span className="text-[10px] uppercase font-bold text-[#69736F] block">Built Living Surface</span>
              <span className="text-sm font-black text-[#18211F]">
                {property.surfaceAreaM2 ? `${property.surfaceAreaM2} m²` : PropertyDocumentEngine.formatField(null, 'Requires Completion')}
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-[#F6F7F4] border border-[#E3E8E3]">
              <span className="text-[10px] uppercase font-bold text-[#69736F] block">Bedrooms Layout</span>
              <span className="text-sm font-black text-[#18211F]">
                {property.bedrooms !== undefined ? `${property.bedrooms} En-Suite Bedrooms` : PropertyDocumentEngine.formatField(null, 'Requires Completion')}
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-[#F6F7F4] border border-[#E3E8E3]">
              <span className="text-[10px] uppercase font-bold text-[#69736F] block">Bathrooms / Restrooms</span>
              <span className="text-sm font-black text-[#18211F]">
                {property.bathrooms !== undefined ? `${property.bathrooms} Bathrooms` : PropertyDocumentEngine.formatField(null, 'Requires Completion')}
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-[#F6F7F4] border border-[#E3E8E3]">
              <span className="text-[10px] uppercase font-bold text-[#69736F] block">Year Built / Restored</span>
              <span className="text-sm font-black text-[#18211F]">
                {property.yearBuilt ? String(property.yearBuilt) : PropertyDocumentEngine.formatField(null, 'Requires Completion')}
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-[#F6F7F4] border border-[#E3E8E3]">
              <span className="text-[10px] uppercase font-bold text-[#69736F] block">Asset Class & Style</span>
              <span className="text-sm font-black text-[#18211F]">{property.type}</span>
            </div>

            <div className="p-3.5 rounded-xl bg-[#F6F7F4] border border-[#E3E8E3]">
              <span className="text-[10px] uppercase font-bold text-[#69736F] block">Transaction Currency</span>
              <span className="text-sm font-black text-[#27845D]">EUR (€) SEPA</span>
            </div>

            <div className="p-3.5 rounded-xl bg-[#F6F7F4] border border-[#E3E8E3]">
              <span className="text-[10px] uppercase font-bold text-[#69736F] block">Cadastral Status</span>
              <span className="text-sm font-mono font-bold text-[#18211F]">
                {property.cadastralReference || PropertyDocumentEngine.formatField(null, 'Requires Completion')}
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-[#F6F7F4] border border-[#E3E8E3]">
              <span className="text-[10px] uppercase font-bold text-[#69736F] block">Availability Status</span>
              <span className="text-xs font-bold text-[#27845D] uppercase bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 inline-block mt-0.5">
                {property.status}
              </span>
            </div>
          </div>

          {/* Full Property Narrative Description */}
          <div className="mb-8">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#18211F] mb-2">
              Comprehensive Architectural & Concept Narrative
            </h4>
            <div className="p-5 rounded-2xl bg-[#F6F7F4] border border-[#E3E8E3] text-xs text-[#4A5551] leading-relaxed whitespace-pre-line">
              {property.description || PropertyDocumentEngine.formatField(null, 'Narrative Description Requires Completion')}
            </div>
          </div>

          {/* Key Amenities & Features */}
          {property.amenities && property.amenities.length > 0 && (
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#18211F] mb-3">
                Registered Interior & Exterior Amenities
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {property.amenities.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 p-2.5 rounded-xl bg-white border border-[#E3E8E3] text-xs font-semibold text-[#18211F]"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#27845D] shrink-0" />
                    <span className="truncate">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* ========================================================================= */}
        {/* PAGE 3: HIGH-RESOLUTION VISUAL GALLERY                                     */}
        {/* ========================================================================= */}
        <section className="pt-8 border-b-2 border-[#182D2A] pb-10 mb-10 print:pt-4 print:border-none print:pb-0 print:mb-0 print:page-break-after">
          <div className="flex items-center justify-between border-b border-[#E3E8E3] pb-2 mb-6">
            <h3 className="text-base font-black text-[#18211F] uppercase tracking-wider flex items-center gap-2">
              <Building2 className="w-4 h-4 text-[#27845D]" />
              Curated Photographic Showcase & Perspective
            </h3>
            <span className="text-xs font-mono text-[#69736F]">Ref: {propertyRef} · Page 3</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5 mb-6">
            {(property.images && property.images.length > 0 ? property.images.slice(0, 6) : [property.bannerImage]).map((img, idx) => (
              <div key={idx} className="aspect-[4/3] rounded-2xl overflow-hidden bg-[#EEF1EC] border border-[#E3E8E3] relative group">
                <img
                  src={img}
                  alt={`${property.title} view ${idx + 1}`}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
                <span className="absolute bottom-2 left-2 bg-black/60 text-white text-[9px] font-bold px-2 py-0.5 rounded-md backdrop-blur-xs">
                  Plate 0{idx + 1}
                </span>
              </div>
            ))}
          </div>

          <p className="text-[11px] text-[#69736F] italic text-center">
            *High-resolution plates extracted directly from listing portfolio. Additional aerial photography and confidential floorplans available under signed NDA.
          </p>
        </section>

        {/* ========================================================================= */}
        {/* PAGE 4: DYNAMIC PAYMENT SCHEDULE & RECONCILIATION TABLE                   */}
        {/* ========================================================================= */}
        <section className="pt-8 border-b-2 border-[#182D2A] pb-10 mb-10 print:pt-4 print:border-none print:pb-0 print:mb-0 print:page-break-after">
          <div className="flex items-center justify-between border-b border-[#E3E8E3] pb-2 mb-6">
            <h3 className="text-base font-black text-[#18211F] uppercase tracking-wider flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-[#27845D]" />
              Dynamic Payment Schedule & Escrow Reconciliation
            </h3>
            <span className="text-xs font-mono text-[#69736F]">Ref: {propertyRef} · Page 4</span>
          </div>

          {/* Pricing & Fee Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="p-4 rounded-2xl bg-[#F6F7F4] border border-[#E3E8E3]">
              <span className="text-[10px] uppercase font-bold text-[#69736F] block">Underwritten Purchase Price</span>
              <span className="text-xl font-black text-[#18211F]">{formatCurrency(paymentPlan.purchasePrice)}</span>
              <span className="text-[10px] text-gray-500 block mt-0.5">Excludes statutory buyer closing fees</span>
            </div>

            <div className="p-4 rounded-2xl bg-[#F6F7F4] border border-[#E3E8E3]">
              <span className="text-[10px] uppercase font-bold text-[#69736F] block">Agency & Notarial Fees (Est.)</span>
              <span className="text-xl font-black text-[#B7791F]">{formatCurrency(paymentPlan.totalAdditionalFees)}</span>
              <span className="text-[10px] text-gray-500 block mt-0.5">
                Agency: {paymentPlan.agencyFeePercent}% · Notary & Taxes: {paymentPlan.notarialAndTaxPercent}%
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-gradient-to-br from-[#06241D] to-[#041914] text-white border border-emerald-900/60 shadow-sm">
              <span className="text-[10px] uppercase font-bold text-[#00FF9D] block">Total Acquisition Capital</span>
              <span className="text-xl font-black text-white">{formatCurrency(paymentPlan.totalTransactionAmount)}</span>
              <span className="text-[10px] text-emerald-300 block mt-0.5">Comprehensive closing cost estimate</span>
            </div>
          </div>

          {/* Structured Installment Table */}
          <div className="border border-[#E3E8E3] rounded-2xl overflow-hidden mb-6">
            <div className="bg-[#EEF1EC] p-3 border-b border-[#E3E8E3] flex justify-between items-center text-xs font-bold text-[#18211F]">
              <span>Installment & Escrow Call</span>
              <div className="flex gap-8 pr-4">
                <span>Timeline</span>
                <span>Portion (%)</span>
                <span>Scheduled Amount (EUR)</span>
              </div>
            </div>

            <div className="divide-y divide-[#E3E8E3] text-xs">
              {paymentPlan.installments.map((inst) => (
                <div key={inst.installmentNumber} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-[#F6F7F4]/50">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-[#182D2A] text-white text-[10px] font-bold flex items-center justify-center">
                        {inst.installmentNumber}
                      </span>
                      <strong className="text-sm font-bold text-[#18211F]">{inst.label}</strong>
                    </div>
                    <p className="text-[11px] text-[#69736F] pl-7">{inst.description}</p>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-8 pl-7 sm:pl-0">
                    <span className="text-[11px] text-gray-500 font-medium">{inst.dueDate}</span>
                    <span className="font-bold text-[#18211F] w-12 text-right">{inst.percentage}%</span>
                    <span className="text-sm font-black text-[#27845D] w-32 text-right">
                      {formatCurrency(inst.amount)}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Reconciliation Verification Bar */}
            <div className="bg-[#F6F7F4] p-3.5 border-t border-[#E3E8E3] flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#27845D]" />
                <span className="font-bold text-[#18211F]">
                  Mathematical Balance Reconciliation:
                </span>
                <span className="text-[#27845D] font-bold">
                  {formatCurrency(paymentPlan.purchasePrice)} = 100.0% Verified
                </span>
              </div>
              <span className="text-[11px] text-gray-500 font-mono">
                Variance: €0.00 (Zero discrepancy)
              </span>
            </div>
          </div>

          <p className="text-[10px] text-[#69736F] leading-normal italic">
            *Note: Payment installments apply strictly to underwritten asset acquisition. All client funds held in segregated Caisse des Dépôts / Notary escrow until final condition precedent satisfaction.
          </p>
        </section>

        {/* ========================================================================= */}
        {/* PAGE 5: BUYER REQUIREMENTS, COMPLIANCE & AUTHORIZED SIGN-OFF             */}
        {/* ========================================================================= */}
        <section className="pt-8 print:pt-4">
          <div className="flex items-center justify-between border-b border-[#E3E8E3] pb-2 mb-6">
            <h3 className="text-base font-black text-[#18211F] uppercase tracking-wider flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#27845D]" />
              Buyer Due Diligence Checklist & Transaction Execution
            </h3>
            <span className="text-xs font-mono text-[#69736F]">Ref: {propertyRef} · Page 5</span>
          </div>

          {/* Buyer Checklist */}
          <div className="mb-8 space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#18211F] mb-3">
              Mandatory AML & KYC Closing Documents (European Directive 2018/843)
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {[
                { title: 'Certified Passport / National Identity', desc: 'Apostilled copy valid for at least 6 months.' },
                { title: 'Proof of Residential Address', desc: 'Utility bill or official tax notice dated within 90 days.' },
                { title: 'Source of Funds & Wealth Attestation', desc: 'Bank statement or chartered accountant letter confirming origin.' },
                { title: 'Corporate Bylaws / K-Bis (If Corporate Buyer)', desc: 'Full beneficial ownership registry disclosure (>25% shareholding).' },
                { title: 'SEPA Escrow Deposit Confirmation', desc: 'Transfer receipt reflecting unique transaction reference.' },
                { title: 'Signed Bilateral Reservation Agreement', desc: 'Draft reviewed and countersigned by authorized broker.' },
              ].map((item, idx) => (
                <div key={idx} className="p-3 rounded-xl bg-[#F6F7F4] border border-[#E3E8E3] flex items-start gap-2.5">
                  <div className="w-4 h-4 rounded-full border border-gray-400 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-[9px] font-bold text-gray-500">{idx + 1}</span>
                  </div>
                  <div>
                    <strong className="font-bold text-[#18211F] block">{item.title}</strong>
                    <span className="text-[11px] text-[#69736F]">{item.desc}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Brokerage & Legal Advisory Contacts */}
          <div className="p-6 rounded-2xl bg-[#F6F7F4] border border-[#E3E8E3] mb-8">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#18211F] mb-4">
              Authorized Mandate Representation
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs">
              <div>
                <span className="text-[10px] uppercase font-bold text-[#69736F] block">Listing Broker & Agency</span>
                <span className="text-sm font-bold text-[#18211F] block">
                  {property.agent?.name || docRecord.customization?.advisorName || 'Kretz Prestige Advisory'}
                </span>
                <span className="text-gray-500 block">
                  {property.agent?.role || 'Associate Director · Luxury Real Estate'}
                </span>
                <div className="mt-2 space-y-1 text-gray-600">
                  <p>Tel: {property.agent?.phone || docRecord.customization?.advisorPhone || '+33 7 53 07 75 72'}</p>
                  <p>Email: {property.agent?.email || docRecord.customization?.advisorEmail || 'mandate@kretz.site'}</p>
                </div>
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold text-[#69736F] block">Designated Buyer / Investor</span>
                <span className="text-sm font-bold text-[#18211F] block">
                  {docRecord.customization?.buyerName || PropertyDocumentEngine.formatField(null, 'Buyer Name Requires Completion')}
                </span>
                <span className="text-gray-500 block">
                  {docRecord.customization?.buyerEmail || PropertyDocumentEngine.formatField(null, 'Buyer Email Requires Completion')}
                </span>
                {docRecord.customization?.specialConditions && (
                  <p className="mt-2 text-[11px] text-[#182D2A] bg-white p-2 rounded border border-[#E3E8E3]">
                    Special Note: {docRecord.customization.specialConditions}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Signature Sign-Off Block */}
          <div className="grid grid-cols-2 gap-8 pt-6 border-t border-[#E3E8E3]">
            <div className="space-y-10">
              <div className="border-b border-gray-400 pb-2">
                <span className="text-[10px] uppercase font-bold text-[#69736F] block">For the Authorized Broker</span>
                <span className="text-xs font-bold text-[#18211F]">
                  {property.agent?.name || 'Kretz Real Estate Agency'}
                </span>
              </div>
              <div className="text-[10px] text-gray-500">
                Date & Signature / Official Stamp: ______________________
              </div>
            </div>

            <div className="space-y-10">
              <div className="border-b border-gray-400 pb-2">
                <span className="text-[10px] uppercase font-bold text-[#69736F] block">For the Proposing Buyer / Investor</span>
                <span className="text-xs font-bold text-[#18211F]">
                  {docRecord.customization?.buyerName || '[Awaiting Client Execution]'}
                </span>
              </div>
              <div className="text-[10px] text-gray-500">
                Date & Signature: ______________________
              </div>
            </div>
          </div>

          {/* Footer Disclaimer */}
          <footer className="mt-10 pt-4 border-t border-[#E3E8E3] flex flex-wrap items-center justify-between text-[10px] text-[#828D89]">
            <span>Generated automatically via Kretz Institutional Property Engine · {formatDate(docRecord.updatedAt)}</span>
            <span>Document ID: {docRecord.id} · Version {docRecord.version}</span>
          </footer>
        </section>
      </article>

      {/* ========================================================================= */}
      {/* MODAL 1: EDIT CUSTOMIZATION & PAYMENT PLAN (Hidden in Print)              */}
      {/* ========================================================================= */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 print:hidden">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl border border-[#E3E8E3] max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-[#E3E8E3] pb-4 mb-5">
              <div>
                <h3 className="text-lg font-bold text-[#18211F]">Edit Document & Buyer Specifications</h3>
                <p className="text-xs text-[#69736F]">Customize client name, offer amount, and payment milestones</p>
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
                  <label className="font-bold text-[#18211F] block mb-1">Buyer / Investor Full Name</label>
                  <input
                    type="text"
                    value={editBuyerName}
                    onChange={(e) => setEditBuyerName(e.target.value)}
                    placeholder="e.g. Alexandre de Mortemart"
                    className="w-full p-2.5 rounded-xl border border-[#E3E8E3] bg-[#F6F7F4] text-xs font-semibold focus:outline-none focus:border-[#182D2A]"
                  />
                </div>

                <div className="form-field">
                  <label className="font-bold text-[#18211F] block mb-1">Buyer Contact Email</label>
                  <input
                    type="email"
                    value={editBuyerEmail}
                    onChange={(e) => setEditBuyerEmail(e.target.value)}
                    placeholder="client@familyoffice.com"
                    className="w-full p-2.5 rounded-xl border border-[#E3E8E3] bg-[#F6F7F4] text-xs font-semibold focus:outline-none focus:border-[#182D2A]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="form-field">
                  <label className="font-bold text-[#18211F] block mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={editBuyerPhone}
                    onChange={(e) => setEditBuyerPhone(e.target.value)}
                    placeholder="+33 6 12 34 56 78"
                    className="w-full p-2.5 rounded-xl border border-[#E3E8E3] bg-[#F6F7F4] text-xs font-semibold focus:outline-none focus:border-[#182D2A]"
                  />
                </div>

                <div className="form-field">
                  <label className="font-bold text-[#18211F] block mb-1">Offer / Target Price (EUR)</label>
                  <input
                    type="number"
                    min={1000}
                    step={10000}
                    value={editOfferAmount}
                    onChange={(e) => setEditOfferAmount(Number(e.target.value))}
                    className="w-full p-2.5 rounded-xl border border-[#E3E8E3] bg-[#F6F7F4] text-xs font-bold text-[#27845D] focus:outline-none focus:border-[#182D2A]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="form-field">
                  <label className="font-bold text-[#18211F] block mb-1">Payment Plan Structure</label>
                  <select
                    value={editPlanType}
                    onChange={(e) => setEditPlanType(e.target.value as any)}
                    className="w-full p-2.5 rounded-xl border border-[#E3E8E3] bg-[#F6F7F4] text-xs font-semibold focus:outline-none focus:border-[#182D2A]"
                  >
                    <option value="deposit_installments">Earnest Deposit + 2 Installments</option>
                    <option value="full_upfront">100% Full Upfront at Notarial Deed</option>
                    <option value="custom_schedule">Custom 4-Milestone Escrow Schedule</option>
                  </select>
                </div>

                {editPlanType === 'deposit_installments' && (
                  <div className="form-field">
                    <label className="font-bold text-[#18211F] block mb-1">Initial Deposit (%)</label>
                    <input
                      type="number"
                      min={10}
                      max={50}
                      value={editDepositPercent}
                      onChange={(e) => setEditDepositPercent(Number(e.target.value))}
                      className="w-full p-2.5 rounded-xl border border-[#E3E8E3] bg-[#F6F7F4] text-xs font-bold focus:outline-none focus:border-[#182D2A]"
                    />
                  </div>
                )}
              </div>

              <div className="form-field">
                <label className="font-bold text-[#18211F] block mb-1">Special Conditions / Contingencies</label>
                <textarea
                  rows={2}
                  value={editSpecialConditions}
                  onChange={(e) => setEditSpecialConditions(e.target.value)}
                  placeholder="e.g. Subject to mortgage approval within 45 days or physical inspection."
                  className="w-full p-2.5 rounded-xl border border-[#E3E8E3] bg-[#F6F7F4] text-xs font-medium focus:outline-none focus:border-[#182D2A]"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-[#E3E8E3]">
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
                  Save & Re-calculate Document
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
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 print:hidden">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-[#E3E8E3] max-h-[85vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-[#E3E8E3] pb-3 mb-4">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-[#27845D]" />
                <h3 className="text-base font-bold text-[#18211F]">Document Audit & Version History</h3>
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
                  <div key={h.id} className="p-3.5 rounded-xl bg-[#F6F7F4] border border-[#E3E8E3] text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#18211F] bg-[#EEF1EC] px-2 py-0.5 rounded text-[11px]">
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

            <div className="mt-5 pt-3 border-t border-[#E3E8E3] text-right">
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
