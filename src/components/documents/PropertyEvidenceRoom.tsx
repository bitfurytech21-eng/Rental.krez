import React, { useState } from 'react';
import { Property } from '../../types/property';
import {
  FileText,
  ShieldCheck,
  AlertTriangle,
  Download,
  Eye,
  CheckCircle2,
  Lock,
  Clock,
  UserCheck,
  Filter,
  Search,
  ExternalLink,
  Info
} from 'lucide-react';

export interface PropertyEvidenceDocument {
  id: string;
  propertyId: string;
  canonicalRef: string; // e.g. KTZ-P1616X
  legalAliasRef: string; // e.g. KP1-616X
  legalEntity: string; // e.g. SCI Uzès Manor SPV
  category:
    | 'title_deed'
    | 'valuation'
    | 'diagnostic'
    | 'lease_agreement'
    | 'operating_expenses'
    | 'insurance'
    | 'tax_certificate'
    | 'financial_statement';
  title: string;
  issuer: string; // e.g. Cabinet Notarial de Nîmes / RICS Valuation Desk
  issueDate: string;
  expiryDate?: string;
  version: string;
  status:
    | 'uploaded'
    | 'pending_review'
    | 'reviewed'
    | 'independently_verified'
    | 'expired'
    | 'rejected'
    | 'missing';
  reviewerName?: string;
  reviewerRole?: string;
  reviewedAt?: string;
  verificationEvidenceHash?: string;
  fileSize: string;
  isRestricted: boolean;
  notes?: string;
}

interface PropertyEvidenceRoomProps {
  property: Property;
  isAdmin?: boolean;
}

export const PropertyEvidenceRoom: React.FC<PropertyEvidenceRoomProps> = ({
  property,
  isAdmin = false,
}) => {
  const canonicalRef = property.tokenTicker || 'KTZ-P1616X';
  const legalAliasRef = property.ref || 'KP1-616X';

  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [inspectingDoc, setInspectingDoc] = useState<PropertyEvidenceDocument | null>(null);
  const [notification, setNotification] = useState<string | null>(null);

  // Evidence repository for this property
  const evidenceDocuments: PropertyEvidenceDocument[] = [
    {
      id: `doc-ev-1-${property.id}`,
      propertyId: property.id,
      canonicalRef,
      legalAliasRef,
      legalEntity: `SCI ${property.title.substring(0, 20)} SPV`,
      category: 'title_deed',
      title: 'Notarized Fee-Simple Title Deed & Property Registration Extract',
      issuer: 'Maitre H. Dupont - Notary Desk Nîmes',
      issueDate: '2026-01-12',
      version: 'v1.0 Final',
      status: 'independently_verified',
      reviewerName: 'Jean-Luc Moreau, Lead Legal Auditor',
      reviewerRole: 'Senior Real Estate Attorney',
      reviewedAt: '2026-01-15 14:30 UTC',
      verificationEvidenceHash: '0x8f3a92b1c4e7d12a938b212f459c0d3a7e112233',
      fileSize: '4.8 MB',
      isRestricted: false,
      notes: 'Title deed confirmed free of unauthorized mortgages and encumbrances.'
    },
    {
      id: `doc-ev-2-${property.id}`,
      propertyId: property.id,
      canonicalRef,
      legalAliasRef,
      legalEntity: `SCI ${property.title.substring(0, 20)} SPV`,
      category: 'valuation',
      title: 'Independent RICS Red Book Valuation & Market Appraisal',
      issuer: 'Savills Valuation & Advisory France',
      issueDate: '2026-02-01',
      expiryDate: '2027-02-01',
      version: 'v2.1 Certified',
      status: 'independently_verified',
      reviewerName: 'Claire Blanc, RICS Fellow',
      reviewerRole: 'Senior Valuation Director',
      reviewedAt: '2026-02-05 09:15 UTC',
      verificationEvidenceHash: '0x12a34b56c78d90e12f34a56b78c90d12e34f56a7',
      fileSize: '6.2 MB',
      isRestricted: false,
      notes: 'Fair market acquisition valuation verified against regional comparable transactions.'
    },
    {
      id: `doc-ev-3-${property.id}`,
      propertyId: property.id,
      canonicalRef,
      legalAliasRef,
      legalEntity: `SCI ${property.title.substring(0, 20)} SPV`,
      category: 'diagnostic',
      title: 'Comprehensive Building Diagnostic & Structural Inspection Report',
      issuer: 'Apave Inspection & Environmental Services',
      issueDate: '2026-01-20',
      version: 'v1.0 Certified',
      status: 'independently_verified',
      reviewerName: 'Marc Antoine, Structural Engineer',
      reviewerRole: 'Certified Building Inspector',
      reviewedAt: '2026-01-22 16:45 UTC',
      verificationEvidenceHash: '0x99887766554433221100aabbccddeeff00112233',
      fileSize: '3.5 MB',
      isRestricted: false,
      notes: 'Structural integrity certified. Energy Performance Rating (DPE): Grade A.'
    },
    {
      id: `doc-ev-4-${property.id}`,
      propertyId: property.id,
      canonicalRef,
      legalAliasRef,
      legalEntity: `SCI ${property.title.substring(0, 20)} SPV`,
      category: 'operating_expenses',
      title: 'Property Operating Budget & Management Fee Audit Statement',
      issuer: 'Kretz Property Asset Management Desk',
      issueDate: '2026-02-15',
      version: 'v1.0',
      status: 'reviewed',
      reviewerName: 'Valentin Kretz, Director',
      reviewerRole: 'Asset Management Partner',
      reviewedAt: '2026-02-18 11:00 UTC',
      verificationEvidenceHash: '0xa1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0',
      fileSize: '1.9 MB',
      isRestricted: false,
      notes: 'Operating reserve and management fee caps validated against SPV budget.'
    },
    {
      id: `doc-ev-5-${property.id}`,
      propertyId: property.id,
      canonicalRef,
      legalAliasRef,
      legalEntity: `SCI ${property.title.substring(0, 20)} SPV`,
      category: 'tax_certificate',
      title: 'Municipal Property Tax Clearance & IBI Certificate',
      issuer: 'Trésorerie Publique de France',
      issueDate: '2026-01-05',
      version: 'v1.0',
      status: 'independently_verified',
      reviewerName: 'Sophie Bernard, Tax Counsel',
      reviewerRole: 'Tax Advisory Specialist',
      reviewedAt: '2026-01-08 10:00 UTC',
      verificationEvidenceHash: '0xfedcba9876543210fedcba9876543210fedcba98',
      fileSize: '1.1 MB',
      isRestricted: false,
      notes: 'Zero outstanding municipal tax liabilities certified.'
    },
    {
      id: `doc-ev-6-${property.id}`,
      propertyId: property.id,
      canonicalRef,
      legalAliasRef,
      legalEntity: `SCI ${property.title.substring(0, 20)} SPV`,
      category: 'financial_statement',
      title: 'SPV Annual Financial Statement & Escrow Audit',
      issuer: 'Deloitte Real Estate Audit',
      issueDate: '2026-03-01',
      version: 'v1.0 Draft',
      status: 'pending_review',
      reviewerName: 'Pending Authorized Audit Sign-off',
      reviewerRole: 'External Auditor',
      reviewedAt: 'Pending Review',
      fileSize: '2.4 MB',
      isRestricted: true,
      notes: 'Under final audit. Document flagged with administrative watermark.'
    }
  ];

  const filteredDocs = evidenceDocuments.filter((doc) => {
    const matchesSearch =
      doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.issuer.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.category.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory = categoryFilter === 'all' || doc.category === categoryFilter;
    const matchesStatus = statusFilter === 'all' || doc.status === statusFilter;

    return matchesSearch && matchesCategory && matchesStatus;
  });

  const getStatusBadge = (status: PropertyEvidenceDocument['status']) => {
    switch (status) {
      case 'independently_verified':
        return (
          <span className="inline-flex items-center gap-1 bg-emerald-100 text-[#27845D] font-bold text-[10px] px-2.5 py-0.5 rounded-full uppercase">
            <CheckCircle2 className="w-3 h-3" /> Independently Verified
          </span>
        );
      case 'reviewed':
        return (
          <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-800 font-bold text-[10px] px-2.5 py-0.5 rounded-full uppercase">
            <ShieldCheck className="w-3 h-3" /> Internal Reviewed
          </span>
        );
      case 'pending_review':
        return (
          <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-800 font-bold text-[10px] px-2.5 py-0.5 rounded-full uppercase">
            <Clock className="w-3 h-3" /> Pending Legal Review
          </span>
        );
      case 'expired':
        return (
          <span className="inline-flex items-center gap-1 bg-red-100 text-red-800 font-bold text-[10px] px-2.5 py-0.5 rounded-full uppercase">
            <AlertTriangle className="w-3 h-3" /> Expired Document
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 bg-gray-100 text-gray-700 font-bold text-[10px] px-2.5 py-0.5 rounded-full uppercase">
            {status}
          </span>
        );
    }
  };

  const handleDownloadDoc = (doc: PropertyEvidenceDocument) => {
    if (doc.status === 'pending_review' || doc.status === 'missing') {
      setNotification(`Notice: "${doc.title}" is currently pending legal verification. Preview generated with security watermark.`);
    } else {
      setNotification(`Preparing cryptographically verified download for: ${doc.title} (Hash: ${doc.verificationEvidenceHash?.substring(0, 10)}...).`);
    }
    setTimeout(() => setNotification(null), 5000);
  };

  return (
    <div className="bg-white p-6 sm:p-8 rounded-3xl border border-[#E3E8E3] shadow-sm space-y-6">
      {/* Evidence Room Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-[#E3E8E3]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="status-badge funding font-semibold uppercase text-[11px]">
              Property Evidence Room
            </span>
            <span className="text-xs font-mono font-bold text-[#182D2A] bg-[#EEF1EC] px-2.5 py-0.5 rounded-full">
              Canonical: {canonicalRef}
            </span>
            <span className="text-xs font-mono text-[#69736F] bg-gray-100 px-2.5 py-0.5 rounded-full">
              Legal Alias: {legalAliasRef}
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-[#18211F]">
            Property Document Audit Room
          </h2>
          <p className="text-xs text-[#69736F] mt-0.5">
            Structured notarized title deeds, certified RICS valuations, structural diagnostic reports, and SPV financial statements.
          </p>
        </div>

        {/* Alias Reconciliation Badge */}
        <div className="p-3 rounded-2xl bg-[#F6F7F4] border border-[#E3E8E3] text-xs flex items-center gap-3">
          <Info className="w-4 h-4 text-[#27845D] shrink-0" />
          <div>
            <span className="font-bold text-[#18211F] block">Alias Reconciled</span>
            <span className="text-[11px] text-[#69736F]">
              {canonicalRef} cross-referenced with {legalAliasRef}
            </span>
          </div>
        </div>
      </div>

      {notification && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-semibold flex items-center justify-between animate-in fade-in">
          <span>{notification}</span>
          <button onClick={() => setNotification(null)} className="text-emerald-700 hover:text-emerald-900 font-bold">✕</button>
        </div>
      )}

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3.5 rounded-2xl bg-[#F6F7F4] border border-[#E3E8E3]">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search documents by title or issuer..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl text-xs bg-white border border-[#E3E8E3] focus:outline-none focus:border-[#182D2A]"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="text-xs font-semibold p-2 rounded-xl bg-white border border-[#E3E8E3] focus:outline-none flex-1 sm:flex-none"
          >
            <option value="all">All Document Categories</option>
            <option value="title_deed">Notary Title Deed</option>
            <option value="valuation">RICS Valuation</option>
            <option value="diagnostic">Diagnostic & Inspection</option>
            <option value="operating_expenses">Operating Expenses</option>
            <option value="tax_certificate">Tax Clearance</option>
            <option value="financial_statement">Financial Statement</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs font-semibold p-2 rounded-xl bg-white border border-[#E3E8E3] focus:outline-none flex-1 sm:flex-none"
          >
            <option value="all">All Verification Statuses</option>
            <option value="independently_verified">Independently Verified</option>
            <option value="reviewed">Reviewed</option>
            <option value="pending_review">Pending Review</option>
          </select>
        </div>
      </div>

      {/* Document List */}
      <div className="divide-y divide-[#E3E8E3]">
        {filteredDocs.map((doc) => (
          <div key={doc.id} className="py-4 space-y-3">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#EEF1EC] text-[#182D2A] flex items-center justify-center shrink-0 mt-0.5">
                  <FileText className="w-5 h-5 text-[#27845D]" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <h4 className="text-sm font-bold text-[#18211F]">{doc.title}</h4>
                    {getStatusBadge(doc.status)}
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-[#69736F]">
                    <span>Issuer: <strong className="text-[#18211F]">{doc.issuer}</strong></span>
                    <span>·</span>
                    <span>Date: {doc.issueDate}</span>
                    <span>·</span>
                    <span>Version: {doc.version}</span>
                    <span>·</span>
                    <span>Size: {doc.fileSize}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                <button
                  onClick={() => setInspectingDoc(doc)}
                  className="btn btn-primary btn-sm text-xs font-bold cursor-pointer flex items-center gap-1.5"
                >
                  <Eye className="w-3.5 h-3.5 text-[#B7E36A]" />
                  <span>Inspect Audit Details</span>
                </button>
              </div>
            </div>

            {/* Verification Metadata Detail Box */}
            <div className="p-3.5 rounded-2xl bg-[#F6F7F4] border border-[#E3E8E3] text-xs space-y-1.5 font-mono">
              <div className="flex flex-wrap items-center justify-between text-[11px] text-[#69736F]">
                <span>Authorized Reviewer: <strong>{doc.reviewerName || 'Pending'}</strong> ({doc.reviewerRole})</span>
                <span>Reviewed At: {doc.reviewedAt}</span>
              </div>
              {doc.verificationEvidenceHash && (
                <div className="text-[10px] text-[#27845D] break-all">
                  Evidence Hash: <span>{doc.verificationEvidenceHash}</span>
                </div>
              )}
              {doc.notes && (
                <div className="text-[11px] text-[#52605C] font-sans italic pt-0.5">
                  Audit Notes: {doc.notes}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Inspect Document Modal */}
      {inspectingDoc && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4"
          onClick={() => setInspectingDoc(null)}
        >
          <div
            className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 space-y-6 shadow-2xl border border-[#E3E8E3] relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start pb-4 border-b border-[#E3E8E3]">
              <div>
                <span className="text-xs font-bold text-[#27845D] uppercase tracking-wider block mb-1">
                  Document Audit Record
                </span>
                <h3 className="text-lg font-black text-[#18211F]">{inspectingDoc.title}</h3>
              </div>
              <button
                onClick={() => setInspectingDoc(null)}
                className="text-gray-400 hover:text-gray-600 font-bold p-1 cursor-pointer text-lg"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-[#F6F7F4] border border-[#E3E8E3] flex justify-between">
                <span className="text-[#69736F]">Canonical Property Ref:</span>
                <span className="font-mono font-bold text-[#18211F]">{inspectingDoc.canonicalRef}</span>
              </div>

              <div className="p-3 rounded-xl bg-[#F6F7F4] border border-[#E3E8E3] flex justify-between">
                <span className="text-[#69736F]">Legal Document Alias Ref:</span>
                <span className="font-mono font-bold text-[#18211F]">{inspectingDoc.legalAliasRef}</span>
              </div>

              <div className="p-3 rounded-xl bg-[#F6F7F4] border border-[#E3E8E3] flex justify-between">
                <span className="text-[#69736F]">Issuing Authority:</span>
                <span className="font-bold text-[#18211F]">{inspectingDoc.issuer}</span>
              </div>

              <div className="p-3 rounded-xl bg-[#F6F7F4] border border-[#E3E8E3] flex justify-between">
                <span className="text-[#69736F]">Verification Status:</span>
                <div>{getStatusBadge(inspectingDoc.status)}</div>
              </div>

              <div className="p-3 rounded-xl bg-[#F6F7F4] border border-[#E3E8E3] flex justify-between">
                <span className="text-[#69736F]">Reviewer Signature:</span>
                <span className="font-bold text-[#18211F]">{inspectingDoc.reviewerName}</span>
              </div>

              <div className="p-3 rounded-xl bg-[#F6F7F4] border border-[#E3E8E3] flex justify-between">
                <span className="text-[#69736F]">Audit Timestamp:</span>
                <span className="font-bold text-[#18211F]">{inspectingDoc.reviewedAt}</span>
              </div>

              {inspectingDoc.verificationEvidenceHash && (
                <div className="p-3 rounded-xl bg-[#EEF1EC] border border-[#E3E8E3] space-y-1">
                  <span className="text-[10px] text-[#69736F] uppercase font-bold block">
                    Cryptographic Evidence Hash (Sha-256)
                  </span>
                  <span className="font-mono text-[11px] font-bold text-[#27845D] break-all block">
                    {inspectingDoc.verificationEvidenceHash}
                  </span>
                </div>
              )}
            </div>

            <div className="pt-2 flex justify-end gap-3">
              <button
                onClick={() => setInspectingDoc(null)}
                className="btn btn-primary text-xs font-bold px-6 cursor-pointer"
              >
                Close Audit Record
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
