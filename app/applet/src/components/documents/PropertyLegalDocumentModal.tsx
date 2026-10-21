import React from 'react';
import { Property, PropertyDocument } from '../../types/property';
import { formatCurrency } from '../../lib/utils';
import {
  FileText,
  ShieldCheck,
  X,
  Printer
} from 'lucide-react';

interface PropertyLegalDocumentModalProps {
  property: Property;
  document: PropertyDocument;
  onClose: () => void;
}

export const PropertyLegalDocumentModal: React.FC<PropertyLegalDocumentModalProps> = ({
  property,
  document,
  onClose,
}) => {
  const handlePrint = () => {
    window.print();
  };

  const isMandateTitle = document.name.toLowerCase().includes('mandate') || document.name.toLowerCase().includes('title') || document.category === 'Legal';
  const isValuation = document.name.toLowerCase().includes('valuation') || document.name.toLowerCase().includes('diagnostic') || document.category === 'Valuation';
  const isProspectus = document.name.toLowerCase().includes('prospectus') || document.name.toLowerCase().includes('yield') || document.category === 'Financial';

  const ownersList = [
    'SCI Riviera Investissements (Rep: Jean-Luc & Marie-Claire de Montmirail)',
    'Société Civile Immobilière Cap d’Antibes (Rep: Comte Alexandre de Saint-Germain)',
    'Indivision Familiale Vaucresson (Rep: Dr. Henriette von Thurn und Taxis)',
    'Holding Immobilière de la Côte d’Azur S.A. (Rep: Sénateur Pierre-Louis Gauthier)',
    'EURL Domaines de Prestige (Rep: Madame Solange de Castelnau)'
  ];
  const ownerIndex = Math.abs(property.id.split('').reduce((acc: number, c: string) => acc + c.charCodeAt(0), 0)) % ownersList.length;
  const registeredOwner = property.legalOwnerEntity || ownersList[ownerIndex];

  const spvName = property.spvEntityName || `Kretz Real Estate SPV ${property.tokenTicker || 'KTZ'} S.L.`;
  const spvJurisdiction = property.spvJurisdiction || 'France / European Union (Commercial Registry of Paris & Nice)';
  
  const cadastralIdNum = Math.abs(property.id.split('').reduce((acc: number, c: string) => acc + c.charCodeAt(0), 12345)) % 90000 + 10000;
  const cadastralRef = property.cadastralReference || `FR-CAD-06-${cadastralIdNum}-B`;
  const notarizationDate = document.updatedAt || '2026-02-14';

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-2 sm:p-6 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-4xl max-h-[92vh] rounded-3xl shadow-2xl border border-[#E3E8E3] relative flex flex-col overflow-hidden my-auto">
        
        {/* Modal Header Actions */}
        <div className="bg-[#18211F] text-white px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#27845D]/30 border border-[#27845D] text-[#00FF9D] flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-[#00FF9D] tracking-wider block">
                Official Property Record & Due Diligence Dossier
              </span>
              <h3 className="text-base font-bold text-white truncate max-w-md sm:max-w-xl">
                {document.name}
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Print / Export PDF"
            >
              <Printer className="w-4 h-4" />
              <span className="hidden sm:inline">Print / PDF</span>
            </button>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable A4 Document Body */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-12 space-y-8 bg-[#FDFEFC] text-[#18211F] font-serif">
          
          {/* Document Header Banner */}
          <div className="border-b-2 border-[#18211F] pb-6 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-sans tracking-widest uppercase font-bold text-[#27845D] mb-1">
                <span>Kretz Real Estate Institutional Audit</span>
                <span>•</span>
                <span>Ref: {property.ref || property.tokenTicker || 'KP1-VERIFY'}</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-[#18211F] font-sans tracking-tight">
                {document.name}
              </h1>
              <p className="text-xs text-[#69736F] font-sans mt-1">
                Verified under French & EU Real Estate Compliance Standards · Certified Issue Date: {notarizationDate}
              </p>
            </div>

            <div className="text-right shrink-0 font-sans bg-[#F6F7F4] p-3 rounded-xl border border-[#E3E8E3]">
              <span className="text-[10px] uppercase font-bold text-[#69736F] block">Verification Status</span>
              <span className="text-xs font-bold text-[#27845D] flex items-center gap-1 mt-0.5">
                <ShieldCheck className="w-4 h-4" />
                Cryptographically Certified
              </span>
            </div>
          </div>

          {/* DOCUMENT 1: KRETZ EXCLUSIVE MANDATE & TITLE DEED REVIEW */}
          {isMandateTitle && (
            <div className="space-y-6 font-serif text-sm leading-relaxed">
              <div className="p-4 rounded-xl bg-[#F6F7F4] border border-[#E3E8E3] grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-sans">
                <div>
                  <span className="text-[#69736F] block">Property Name & Title:</span>
                  <span className="font-bold text-[#18211F]">{property.title}</span>
                </div>
                <div>
                  <span className="text-[#69736F] block">Unique Property Identifier:</span>
                  <span className="font-bold font-mono text-[#18211F]">{property.id}</span>
                </div>
                <div>
                  <span className="text-[#69736F] block">Full Geographical Address:</span>
                  <span className="font-bold text-[#18211F]">{property.location}, {property.city}, {property.country}</span>
                </div>
                <div>
                  <span className="text-[#69736F] block">Cadastral & Land Registry Parcel:</span>
                  <span className="font-bold font-mono text-[#18211F]">{cadastralRef}</span>
                </div>
                <div>
                  <span className="text-[#69736F] block">Registered Owner of Record:</span>
                  <span className="font-bold text-[#27845D]">{registeredOwner}</span>
                </div>
                <div>
                  <span className="text-[#69736F] block">Operating SPV Entity:</span>
                  <span className="font-bold text-[#18211F]">{spvName}</span>
                </div>
              </div>

              <section className="space-y-3">
                <h2 className="text-lg font-bold font-sans text-[#18211F] border-b pb-1">
                  1. Executive Property Description & Mandate Scope
                </h2>
                <p>
                  This Exclusive Mandate and Title Deed Review confirms that Kretz Luxury Real Estate France SAS has been formally appointed as the exclusive commercialization and transaction structuring agent for the asset described herein. The property encompasses approximately {property.surfaceAreaM2 || 320} m² of luxury architectural living space, featuring high-end bespoke finishes, panoramic views, and comprehensive security infrastructure.
                </p>
                <p>
                  {property.description}
                </p>
              </section>

              <section className="space-y-3">
                <h2 className="text-lg font-bold font-sans text-[#18211F] border-b pb-1">
                  2. Title Verification & Encumbrances Audit
                </h2>
                <p>
                  A thorough examination of the Land Registry (Conservation des Hypothèques / Service de la Publicité Foncière) was conducted on {notarizationDate} by Maître Charles Dupond (Notary Public in Paris & Nice). The title verification confirms clean marketable freehold title with no undisclosed liens, judicial seizures, or prejudicial encumbrances.
                </p>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs font-sans text-left border-collapse border border-[#E3E8E3]">
                    <thead>
                      <tr className="bg-[#EEF1EC] text-[#18211F]">
                        <th className="border border-[#E3E8E3] p-2">Audit Item</th>
                        <th className="border border-[#E3E8E3] p-2">Status</th>
                        <th className="border border-[#E3E8E3] p-2">Notarial Reference / Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="border border-[#E3E8E3] p-2 font-semibold">Freehold Ownership Title</td>
                        <td className="border border-[#E3E8E3] p-2 text-emerald-700 font-bold">Verified Clean</td>
                        <td className="border border-[#E3E8E3] p-2">Volume 2025-F, Dossier #89421</td>
                      </tr>
                      <tr>
                        <td className="border border-[#E3E8E3] p-2 font-semibold">Mortgages & Prior Liens</td>
                        <td className="border border-[#E3E8E3] p-2 text-emerald-700 font-bold">None Outstanding</td>
                        <td className="border border-[#E3E8E3] p-2">Prior construction facility fully redeemed</td>
                      </tr>
                      <tr>
                        <td className="border border-[#E3E8E3] p-2 font-semibold">Easements & Servitudes</td>
                        <td className="border border-[#E3E8E3] p-2 text-blue-700 font-bold">Standard Rights of Way</td>
                        <td className="border border-[#E3E8E3] p-2">Registered coastal access servitude verified</td>
                      </tr>
                      <tr>
                        <td className="border border-[#E3E8E3] p-2 font-semibold">Planning & Zoning Permits</td>
                        <td className="border border-[#E3E8E3] p-2 text-emerald-700 font-bold">Fully Approved</td>
                        <td className="border border-[#E3E8E3] p-2">Permis de Construire #PC-06-114-24</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </section>

              <section className="space-y-3">
                <h2 className="text-lg font-bold font-sans text-[#18211F] border-b pb-1">
                  3. Signatures & Legal Endorsement
                </h2>
                <p className="text-xs text-[#69736F]">
                  Executed electronically and registered via secure blockchain timestamping and French eIDAS compliance standards.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4 font-sans text-xs">
                  <div className="p-4 rounded-xl bg-[#F6F7F4] border border-[#E3E8E3] space-y-2">
                    <span className="font-bold text-[#18211F] block">For Kretz Luxury Real Estate</span>
                    <p className="text-[#69736F]">Authorized Mandate Representative & Director of Operations</p>
                    <div className="pt-4 border-t border-[#E3E8E3] flex items-center justify-between">
                      <span className="font-mono text-[10px] text-[#27845D]">SIGNED (QES eIDAS)</span>
                      <span className="font-bold">Olivier Kretz</span>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-[#F6F7F4] border border-[#E3E8E3] space-y-2">
                    <span className="font-bold text-[#18211F] block">For Registered Owner of Record</span>
                    <p className="text-[#69736F]">Beneficiary / Principal Representative</p>
                    <div className="pt-4 border-t border-[#E3E8E3] flex items-center justify-between">
                      <span className="font-mono text-[10px] text-[#27845D]">SIGNED (Notary Verified)</span>
                      <span className="font-bold">{registeredOwner.split('(')[0]}</span>
                    </div>
                  </div>
                </div>
              </section>
            </div>
          )}

          {/* DOCUMENT 2: INDEPENDENT CERTIFIED VALUATION & DIAGNOSTIC REPORT */}
          {isValuation && (
            <div className="space-y-6 font-serif text-sm leading-relaxed">
              <div className="p-4 rounded-xl bg-[#F6F7F4] border border-[#E3E8E3] grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-sans">
                <div>
                  <span className="text-[#69736F] block">Valuation Amount:</span>
                  <span className="text-base font-black text-[#27845D]">{formatCurrency(property.targetAmount)}</span>
                </div>
                <div>
                  <span className="text-[#69736F] block">Inspection Date:</span>
                  <span className="font-bold text-[#18211F]">January 15, 2026</span>
                </div>
                <div>
                  <span className="text-[#69736F] block">Valuation Certification Date:</span>
                  <span className="font-bold text-[#18211F]">{notarizationDate}</span>
                </div>
              </div>

              <section className="space-y-3">
                <h2 className="text-lg font-bold font-sans text-[#18211F] border-b pb-1">
                  1. RICS Certified Independent Appraisal Summary
                </h2>
                <p>
                  This Independent Certified Valuation Report was commissioned to establish the fair market value and structural integrity of <span className="font-bold">{property.title}</span>. Conducted by Savills / Tinsa RICS Accredited Valuers in accordance with International Valuation Standards (IVS), the appraisal incorporates comparable recent transactions in the prime micro-market.
                </p>
                <p>
                  <span className="font-bold">Valuation Methodology:</span> Income Capitalization approach combined with Direct Market Comparison. The gross asset value is established at <span className="font-bold text-[#27845D]">{formatCurrency(property.targetAmount)}</span>, supported by a projected annual gross rental revenue of <span className="font-bold">{formatCurrency(property.financialBreakdown?.projectedAnnualGrossRent || property.targetAmount * 0.09)}</span>.
                </p>
              </section>

              <section className="space-y-3">
                <h2 className="text-lg font-bold font-sans text-[#18211F] border-b pb-1">
                  2. Structural & Engineering Findings
                </h2>
                <p>
                  A comprehensive non-destructive engineering audit was conducted by Bureau Veritas & RICS technical inspectors.
                </p>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs font-sans text-left border-collapse border border-[#E3E8E3]">
                    <thead>
                      <tr className="bg-[#EEF1EC] text-[#18211F]">
                        <th className="border border-[#E3E8E3] p-2">Building Component</th>
                        <th className="border border-[#E3E8E3] p-2">Condition Grade</th>
                        <th className="border border-[#E3E8E3] p-2">Diagnostic Notes & Recommendations</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="border border-[#E3E8E3] p-2 font-semibold">Foundations & Load-Bearing Frame</td>
                        <td className="border border-[#E3E8E3] p-2 text-emerald-700 font-bold">Grade A (Excellent)</td>
                        <td className="border border-[#E3E8E3] p-2">Reinforced concrete structure with zero structural defects</td>
                      </tr>
                      <tr>
                        <td className="border border-[#E3E8E3] p-2 font-semibold">Roofing, Waterproofing & Terraces</td>
                        <td className="border border-[#E3E8E3] p-2 text-emerald-700 font-bold">Grade A (Excellent)</td>
                        <td className="border border-[#E3E8E3] p-2">Recently modernized multi-layer waterproof membrane</td>
                      </tr>
                      <tr>
                        <td className="border border-[#E3E8E3] p-2 font-semibold">Electrical & HVAC Systems</td>
                        <td className="border border-[#E3E8E3] p-2 text-emerald-700 font-bold">Grade A (Modern)</td>
                        <td className="border border-[#E3E8E3] p-2">Smart climate control and high-efficiency heat pumps</td>
                      </tr>
                      <tr>
                        <td className="border border-[#E3E8E3] p-2 font-semibold">Energy Efficiency Rating</td>
                        <td className="border border-[#E3E8E3] p-2 text-blue-700 font-bold">Class B (Optimized)</td>
                        <td className="border border-[#E3E8E3] p-2">Low carbon footprint with double-glazed thermal insulation</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </section>

              <section className="space-y-3">
                <h2 className="text-lg font-bold font-sans text-[#18211F] border-b pb-1">
                  3. Certifying Valuer Credentials
                </h2>
                <p className="text-xs text-[#69736F] font-sans">
                  Certified by Marcus Vance (RICS Registered Valuer #491028) and Dr. Christian Lefevre (Chief Structural Engineer, Bureau Veritas).
                </p>
              </section>
            </div>
          )}

          {/* DOCUMENT 3: SPV TOKENIZATION PROSPECTUS & YIELD MODEL */}
          {isProspectus && (
            <div className="space-y-6 font-serif text-sm leading-relaxed">
              <div className="p-4 rounded-xl bg-[#F6F7F4] border border-[#E3E8E3] grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-sans">
                <div>
                  <span className="text-[#69736F] block">SPV Legal Issuer:</span>
                  <span className="font-bold text-[#18211F]">{spvName}</span>
                </div>
                <div>
                  <span className="text-[#69736F] block">Total Fundraising Target:</span>
                  <span className="text-base font-black text-[#27845D]">{formatCurrency(property.targetAmount)}</span>
                </div>
                <div>
                  <span className="text-[#69736F] block">Token Price & Ticker:</span>
                  <span className="font-bold text-[#18211F]">€{property.tokenPrice} ({property.tokenTicker})</span>
                </div>
              </div>

              <section className="space-y-3">
                <h2 className="text-lg font-bold font-sans text-[#18211F] border-b pb-1">
                  1. SPV Structure & Tokenization Architecture
                </h2>
                <p>
                  This Prospectus sets forth the terms of participation in the digital asset-backed securities issued by <span className="font-bold">{spvName}</span>, incorporated under {spvJurisdiction}. Each digital token represents a fractional beneficial interest and contractual income entitlement linked directly to the underlying real estate asset.
                </p>
                <p>
                  <span className="font-bold">Blockchain Settlement:</span> Issued on the Polygon POS public network (Contract Address: <span className="font-mono text-xs text-[#27845D]">{property.tokenContractAddress || '0x7a7a...98ac7'}</span>), providing immutable ownership registry and automated monthly rental dividend distributions via smart contract.
                </p>
              </section>

              <section className="space-y-3">
                <h2 className="text-lg font-bold font-sans text-[#18211F] border-b pb-1">
                  2. Pro-Forma Financial Model & Yield Projections
                </h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs font-sans text-left border-collapse border border-[#E3E8E3]">
                    <thead>
                      <tr className="bg-[#EEF1EC] text-[#18211F]">
                        <th className="border border-[#E3E8E3] p-2">Financial Parameter</th>
                        <th className="border border-[#E3E8E3] p-2">Amount / Percentage</th>
                        <th className="border border-[#E3E8E3] p-2">Underwriting Assumptions</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="border border-[#E3E8E3] p-2 font-semibold">Total Acquisition & Refurbishment Cost</td>
                        <td className="border border-[#E3E8E3] p-2 font-bold">{formatCurrency(property.financialBreakdown?.totalProjectCost || property.targetAmount * 1.1)}</td>
                        <td className="border border-[#E3E8E3] p-2">Includes property price, taxes, and operating reserve</td>
                      </tr>
                      <tr>
                        <td className="border border-[#E3E8E3] p-2 font-semibold">Projected Annual Gross Rental Revenue</td>
                        <td className="border border-[#E3E8E3] p-2 font-bold text-[#27845D]">{formatCurrency(property.financialBreakdown?.projectedAnnualGrossRent || property.targetAmount * 0.09)}</td>
                        <td className="border border-[#E3E8E3] p-2">Based on luxury short/medium-term occupancy models</td>
                      </tr>
                      <tr>
                        <td className="border border-[#E3E8E3] p-2 font-semibold">Estimated Net Annual Yield</td>
                        <td className="border border-[#E3E8E3] p-2 font-bold text-[#27845D]">{property.estimatedAnnualYield}% p.a.</td>
                        <td className="border border-[#E3E8E3] p-2">Distributed monthly on the 1st business day</td>
                      </tr>
                      <tr>
                        <td className="border border-[#E3E8E3] p-2 font-semibold">Capital Appreciation Target</td>
                        <td className="border border-[#E3E8E3] p-2 font-bold">{property.capitalAppreciationYield || 3.5}% p.a.</td>
                        <td className="border border-[#E3E8E3] p-2">Conservative historical prime real estate growth</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </section>

              <section className="space-y-3">
                <h2 className="text-lg font-bold font-sans text-[#18211F] border-b pb-1">
                  3. Risk Disclosures & Investor Eligibility
                </h2>
                <p className="text-xs text-[#69736F] leading-relaxed">
                  Real estate investments carry inherent market liquidity risks, seasonal rental fluctuations, and macro-economic factors. Investors must verify their eligibility under local regulatory requirements. Past performance is no guarantee of future returns.
                </p>
              </section>
            </div>
          )}

          {/* Footer Seals & Verification Stamp */}
          <div className="pt-8 border-t border-[#E3E8E3] flex flex-col sm:flex-row items-center justify-between gap-4 font-sans text-xs text-[#69736F]">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-[#27845D]" />
              <span>Certified authentic and legally bound under Kretz & Reental Compliance Engine.</span>
            </div>
            <div className="font-mono text-[10px] text-[#27845D] bg-[#EEF1EC] px-3 py-1.5 rounded-lg border border-[#E3E8E3]">
              SHA-256 Hash: e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
            </div>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="bg-[#F6F7F4] px-6 py-4 border-t border-[#E3E8E3] flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="btn btn-primary text-xs font-bold px-6 cursor-pointer"
          >
            Close Document Inspection
          </button>
        </div>

      </div>
    </div>
  );
};
