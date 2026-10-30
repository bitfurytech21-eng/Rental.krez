import React, { useState, useEffect, useMemo } from 'react';
import {
  ShieldCheck,
  AlertTriangle,
  Building2,
  Scale,
  FileText,
  Lock,
  Search,
  Printer,
  Copy,
  Check,
  ExternalLink,
  BookOpen,
  ArrowRight,
} from 'lucide-react';
import { useAuth } from '../../lib/auth';
import {
  COMPANY_REGISTRATION,
  LEGAL_DOCUMENTATION_CENTRE,
  LegalDocumentRecord,
  SOLANA_INFRASTRUCTURE_REGISTRY,
} from '../../data/institutionalConfig';

interface LegalFrameworkViewProps {
  mode?: 'full' | 'summary';
  initialDocSlug?: string;
  onNavigateTrust?: () => void;
}

export interface LegalChecklistItem {
  id: string;
  category: 'company' | 'spv' | 'offering' | 'regulatory' | 'tax';
  title: string;
  status: 'verified' | 'pending' | 'action_required';
  verifiedBy?: string;
  verifiedAt?: string;
  notes: string;
}

const DEFAULT_LEGAL_CHECKLIST: LegalChecklistItem[] = [
  {
    id: 'chk-1',
    category: 'company',
    title: 'Corporate Registration Reference Data (SIREN 494 861 560)',
    status: 'verified',
    verifiedBy: 'Supplied Corporate Registry Extract',
    verifiedAt: '2026-03-01',
    notes:
      'SIREN 494 861 560 · RCS Paris, 494 861 560 R.C.S. · SIRET 494 861 560 00030 · VAT FR80494861560 · Legal form: LLC (Private Limited Company).',
  },
  {
    id: 'chk-2',
    category: 'spv',
    title: 'SPV Ring-Fencing & Bankruptcy Remoteness Architecture',
    status: 'verified',
    verifiedBy: 'Platform Legal Structuring Specification',
    verifiedAt: '2026-03-01',
    notes:
      'Each property offering is isolated inside a dedicated Special Purpose Vehicle separate from platform operating liabilities.',
  },
  {
    id: 'chk-3',
    category: 'offering',
    title: '12-Document Legal Centre & Subscription Templates',
    status: 'pending',
    verifiedBy: 'External French / Spanish Legal Counsel',
    verifiedAt: 'Pending Per-Offering Sign-off',
    notes:
      'All 12 policies and investment agreements are published on-platform; binding public capital raises require external local counsel sign-off per SPV.',
  },
  {
    id: 'chk-4',
    category: 'regulatory',
    title: 'EU MiCA / Crowdfunding Licensing & Brand Mandate Filing',
    status: 'action_required',
    verifiedBy: 'Executive Compliance Officer',
    verifiedAt: 'External Documentation Required',
    notes:
      'Requires formal regulatory licence/exemption confirmation and signed brand authorisation upload prior to regulated public solicitation.',
  },
  {
    id: 'chk-5',
    category: 'tax',
    title: 'Cross-Border Withholding Tax & Treaty Guidance',
    status: 'pending',
    verifiedBy: 'International Tax Advisory Desk',
    verifiedAt: 'Pending Final Sign-off',
    notes:
      'Investor tax statements exportable via portal; investor-specific treaty withholding remains subject to local fiscal counsel.',
  },
];

export const LegalFrameworkView: React.FC<LegalFrameworkViewProps> = ({
  initialDocSlug,
  onNavigateTrust,
}) => {
  const { isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState<'documents' | 'entity' | 'structure' | 'checklist'>(
    'documents'
  );
  const [selectedDocId, setSelectedDocId] = useState<string>(() => {
    if (initialDocSlug) {
      const found = LEGAL_DOCUMENTATION_CENTRE.find(
        (d) => d.slug === initialDocSlug || d.id === initialDocSlug
      );
      if (found) return found.id;
    }
    return LEGAL_DOCUMENTATION_CENTRE[0].id;
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [copiedValue, setCopiedValue] = useState<string | null>(null);
  const [checklist] = useState<LegalChecklistItem[]>(DEFAULT_LEGAL_CHECKLIST);

  useEffect(() => {
    if (initialDocSlug) {
      const found = LEGAL_DOCUMENTATION_CENTRE.find(
        (d) => d.slug === initialDocSlug || d.id === initialDocSlug
      );
      if (found) {
        setSelectedDocId(found.id);
        setActiveTab('documents');
      }
    }
  }, [initialDocSlug]);

  const filteredDocs = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return LEGAL_DOCUMENTATION_CENTRE.filter((doc) => {
      const matchesCat = categoryFilter === 'ALL' || doc.category === categoryFilter;
      if (!matchesCat) return false;
      if (!q) return true;
      const searchable = [
        doc.title,
        doc.summary,
        doc.category,
        ...doc.sections.flatMap((s) => [s.heading, ...s.paragraphs, ...(s.bullets || [])]),
      ]
        .join(' ')
        .toLowerCase();
      return searchable.includes(q);
    });
  }, [searchQuery, categoryFilter]);

  const activeDoc: LegalDocumentRecord =
    LEGAL_DOCUMENTATION_CENTRE.find((d) => d.id === selectedDocId) ||
    filteredDocs[0] ||
    LEGAL_DOCUMENTATION_CENTRE[0];

  const handleCopy = (val: string) => {
    navigator.clipboard.writeText(val);
    setCopiedValue(val);
    setTimeout(() => setCopiedValue(null), 1800);
  };

  return (
    <div className="space-y-8 text-left">
      {/* Top Institutional Legal & Corporate Transparency Header */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white border border-[#DCE5E2] shadow-2xs space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
          <div className="space-y-2.5 max-w-3xl">
            <div className="inline-flex items-center gap-2 text-[#1E3A34] font-extrabold text-xs uppercase tracking-[0.15em]">
              <ShieldCheck className="w-4 h-4 text-[#27845D]" />
              <span>Legal Documentation Centre &amp; Corporate Registry</span>
            </div>
            <h1 className="font-serif text-2xl sm:text-4xl font-black text-[#18211F] tracking-tight">
              Corporate Identity, Legal Policies &amp; SPV Documentation
            </h1>
            <p className="text-xs sm:text-sm text-[#52605C] leading-relaxed">
              Review our registered corporate identifiers (SIREN {COMPANY_REGISTRATION.siren} · {COMPANY_REGISTRATION.rcs} · VAT {COMPANY_REGISTRATION.vatIdentificationNumber}), inspect all 12 platform governance, compliance, and investment documents, and verify Solana settlement parameters.
            </p>
          </div>

          {onNavigateTrust && (
            <button
              type="button"
              onClick={onNavigateTrust}
              className="px-4 py-2.5 rounded-xl bg-[#0B1B30] hover:bg-[#142D4C] text-white text-xs font-bold inline-flex items-center gap-2 shrink-0 self-start cursor-pointer transition-colors"
            >
              <span>Open Trust Centre</span>
              <ArrowRight className="w-3.5 h-3.5 text-[#BEE179]" />
            </button>
          )}
        </div>

        {/* Verified Quick Corporate Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 pt-4 border-t border-[#E8EFEA] text-xs">
          {[
            { label: 'SIREN', value: COMPANY_REGISTRATION.siren },
            { label: 'RCS Registry', value: COMPANY_REGISTRATION.rcs },
            { label: 'SIRET', value: COMPANY_REGISTRATION.siret },
            { label: 'EU VAT Number', value: COMPANY_REGISTRATION.vatIdentificationNumber },
            { label: 'Legal Form', value: COMPANY_REGISTRATION.legalForm },
          ].map((item) => (
            <div
              key={item.label}
              className="p-3 rounded-xl bg-[#F6F9F8] border border-[#E3ECE8] flex flex-col justify-between gap-1"
            >
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#69736F]">
                {item.label}
              </span>
              <div className="flex items-center justify-between gap-1.5">
                <span className="font-mono font-bold text-[#18211F] text-xs truncate" title={item.value}>
                  {item.value}
                </span>
                <button
                  type="button"
                  onClick={() => handleCopy(item.value)}
                  className="p-1 rounded hover:bg-[#E3ECE8] text-[#69736F] hover:text-[#18211F] shrink-0 cursor-pointer"
                  aria-label={`Copy ${item.label}`}
                  title={`Copy ${item.label}`}
                >
                  {copiedValue === item.value ? (
                    <Check className="w-3 h-3 text-[#27845D]" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Section Tabs */}
        <div className="flex flex-wrap gap-2 pt-2">
          <button
            type="button"
            onClick={() => setActiveTab('documents')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'documents'
                ? 'bg-[#182D2A] text-white'
                : 'bg-[#F4F7F5] text-[#52605C] hover:bg-[#E8EFEA]'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Legal Documentation Centre (12)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('entity')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'entity'
                ? 'bg-[#182D2A] text-white'
                : 'bg-[#F4F7F5] text-[#52605C] hover:bg-[#E8EFEA]'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Corporate Registration Details</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('structure')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'structure'
                ? 'bg-[#182D2A] text-white'
                : 'bg-[#F4F7F5] text-[#52605C] hover:bg-[#E8EFEA]'
            }`}
          >
            <Scale className="w-3.5 h-3.5" />
            <span>SPV &amp; Solana Settlement Structure</span>
          </button>
          {isAdmin && (
            <button
              type="button"
              onClick={() => setActiveTab('checklist')}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'checklist'
                  ? 'bg-[#182D2A] text-white'
                  : 'bg-[#F4F7F5] text-[#52605C] hover:bg-[#E8EFEA]'
              }`}
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Admin Legal Checklist</span>
            </button>
          )}
        </div>
      </div>

      {/* TAB 1: 12-DOCUMENT LEGAL DOCUMENTATION CENTRE */}
      {activeTab === 'documents' && (
        <div className="space-y-5">
          {/* Search & Category Filter Bar */}
          <div className="bg-white p-4 rounded-2xl border border-[#DCE5E2] flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-[#69736F] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search across all 12 legal policies, clauses, or SIREN / Solana references..."
                aria-label="Search legal documentation"
                className="w-full pl-10 pr-4 py-2 rounded-xl bg-[#F6F9F8] border border-[#DCE5E2] text-xs text-[#18211F] placeholder-[#69736F] focus:outline-none focus:ring-2 focus:ring-[#182D2A]"
              />
            </div>

            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              {[
                { id: 'ALL', label: 'All (12)' },
                { id: 'Platform & Governance', label: 'Governance (3)' },
                { id: 'Investment & SPV Instruments', label: 'Investment & SPV (5)' },
                { id: 'Compliance & Safeguarding', label: 'Compliance & Custody (4)' },
              ].map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCategoryFilter(cat.id)}
                  className={`px-3 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer ${
                    categoryFilter === cat.id
                      ? 'bg-[#182D2A] text-white'
                      : 'bg-[#F6F9F8] text-[#52605C] hover:bg-[#E8EFEA]'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Master-Detail Legal Reader */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Sidebar Index (12 Documents) */}
            <div className="lg:col-span-4 bg-white rounded-2xl border border-[#DCE5E2] divide-y divide-[#EDF2F0] overflow-hidden">
              <div className="px-4 py-3 bg-[#F6F9F8] flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-[#52605C]">
                <span>Document Index</span>
                <span className="font-mono tabular-nums">{filteredDocs.length} / 12</span>
              </div>

              {filteredDocs.length === 0 ? (
                <div className="p-6 text-center text-xs text-[#69736F]">
                  No legal documents matched &ldquo;{searchQuery}&rdquo;.
                </div>
              ) : (
                <div className="max-h-[680px] overflow-y-auto divide-y divide-[#EDF2F0]">
                  {filteredDocs.map((doc) => {
                    const isSelected = doc.id === activeDoc.id;
                    return (
                      <button
                        key={doc.id}
                        type="button"
                        onClick={() => setSelectedDocId(doc.id)}
                        className={`w-full text-left p-4 transition-colors cursor-pointer flex items-start gap-3 ${
                          isSelected
                            ? 'bg-[#EAF4F0] text-[#18211F]'
                            : 'hover:bg-[#F8FAF9] text-[#4A5854]'
                        }`}
                      >
                        <span
                          className={`font-mono text-xs font-bold px-2 py-0.5 rounded shrink-0 mt-0.5 tabular-nums ${
                            isSelected
                              ? 'bg-[#182D2A] text-[#BEE179]'
                              : 'bg-[#F0F4F2] text-[#52605C]'
                          }`}
                        >
                          {doc.number}
                        </span>
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="font-bold text-xs sm:text-sm text-[#18211F] leading-snug">
                            {doc.title}
                          </div>
                          <div className="text-[11px] text-[#69736F] line-clamp-2 leading-normal">
                            {doc.summary}
                          </div>
                          <div className="flex items-center gap-2 pt-0.5 text-[10px] font-mono">
                            <span className="text-[#27845D] font-semibold">{doc.version}</span>
                            <span>·</span>
                            <span className="text-[#69736F]">{doc.category}</span>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Right Document Full Text Reader */}
            <article className="lg:col-span-8 bg-white rounded-3xl border border-[#DCE5E2] p-6 sm:p-8 shadow-2xs space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-5 border-b border-[#E8EFEA]">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2 text-[11px]">
                    <span className="font-mono font-bold px-2.5 py-0.5 rounded bg-[#0B1B30] text-[#BEE179]">
                      Document {activeDoc.number} / 12
                    </span>
                    <span className="font-semibold px-2.5 py-0.5 rounded bg-[#F0F4F2] text-[#18211F]">
                      {activeDoc.category}
                    </span>
                    <span
                      className={`font-bold px-2.5 py-0.5 rounded border ${
                        activeDoc.implementationStatus === 'COMPLETED'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : 'bg-amber-50 text-amber-900 border-amber-200'
                      }`}
                    >
                      {activeDoc.statusBadge}
                    </span>
                  </div>

                  <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#18211F]">
                    {activeDoc.title}
                  </h2>

                  <p className="text-xs text-[#69736F] font-mono">
                    Version {activeDoc.version} · Effective Date: {activeDoc.effectiveDate} · Entity: SIREN{' '}
                    {COMPANY_REGISTRATION.siren} ({COMPANY_REGISTRATION.rcs})
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3.5 py-2 rounded-xl border border-[#DCE5E2] hover:bg-[#F6F9F8] text-xs font-bold text-[#18211F] inline-flex items-center gap-1.5 shrink-0 self-start cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5 text-[#1E3A34]" />
                  <span>Print Document</span>
                </button>
              </div>

              {/* Executive Summary Callout */}
              <div className="p-4 rounded-2xl bg-[#F6F9F8] border border-[#E3ECE8] text-xs sm:text-sm text-[#3E4C48] leading-relaxed">
                <span className="font-bold text-[#18211F] block mb-1">Document Scope</span>
                {activeDoc.summary}
              </div>

              {/* Clauses & Articles */}
              <div className="space-y-6">
                {activeDoc.sections.map((sec) => (
                  <section key={sec.heading} className="space-y-2.5">
                    <h3 className="font-serif text-base sm:text-lg font-bold text-[#18211F]">
                      {sec.heading}
                    </h3>
                    {sec.paragraphs.map((p, idx) => (
                      <p
                        key={idx}
                        className="text-xs sm:text-sm text-[#4A5854] leading-relaxed"
                      >
                        {p}
                      </p>
                    ))}
                    {sec.bullets && sec.bullets.length > 0 && (
                      <ul className="space-y-1.5 pl-4 pt-1 text-xs sm:text-sm text-[#4A5854]">
                        {sec.bullets.map((b) => (
                          <li key={b} className="list-disc leading-relaxed">
                            {b}
                          </li>
                        ))}
                      </ul>
                    )}
                  </section>
                ))}
              </div>

              {/* Legal Transparency Footer Notice */}
              <div className="pt-5 border-t border-[#E8EFEA] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-[11px] text-[#69736F]">
                <div>
                  Corporate Reference: SIREN {COMPANY_REGISTRATION.siren} · SIRET{' '}
                  {COMPANY_REGISTRATION.siret} · VAT {COMPANY_REGISTRATION.vatIdentificationNumber}
                </div>
                <div>
                  Inquiries:{' '}
                  <a
                    href={`mailto:${COMPANY_REGISTRATION.primaryEmail}`}
                    className="font-bold text-[#1E3A34] hover:underline"
                  >
                    {COMPANY_REGISTRATION.primaryEmail}
                  </a>
                </div>
              </div>
            </article>
          </div>
        </div>
      )}

      {/* TAB 2: CORPORATE REGISTRATION DETAILS */}
      {activeTab === 'entity' && (
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-[#DCE5E2] shadow-2xs space-y-6">
          <div className="flex items-center gap-2 text-sm font-bold text-[#18211F]">
            <Building2 className="w-5 h-5 text-[#27845D]" />
            <span>Registered Corporate Identity &amp; Statutory Identifiers</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="p-4 rounded-2xl bg-[#F6F9F8] border border-[#E3ECE8] space-y-1">
              <span className="font-semibold text-[#69736F] block">Operating Platform &amp; Legal Form</span>
              <span className="font-bold text-[#18211F] text-sm block">
                {COMPANY_REGISTRATION.operatingBrand}
              </span>
              <span className="text-[#52605C] block">
                Legal form stated in supplied reference material: {COMPANY_REGISTRATION.legalForm}
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-[#F6F9F8] border border-[#E3ECE8] space-y-1">
              <span className="font-semibold text-[#69736F] block">Commercial Registry (RCS &amp; SIREN)</span>
              <span className="font-mono font-bold text-[#18211F] text-sm block">
                SIREN: {COMPANY_REGISTRATION.siren}
              </span>
              <span className="font-mono text-[#52605C] block">
                RCS: {COMPANY_REGISTRATION.rcs}
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-[#F6F9F8] border border-[#E3ECE8] space-y-1">
              <span className="font-semibold text-[#69736F] block">Establishment &amp; Fiscal Identifiers</span>
              <span className="font-mono font-bold text-[#18211F] text-sm block">
                SIRET: {COMPANY_REGISTRATION.siret}
              </span>
              <span className="font-mono text-[#52605C] block">
                VAT Identification Number: {COMPANY_REGISTRATION.vatIdentificationNumber}
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-[#F6F9F8] border border-[#E3ECE8] space-y-1">
              <span className="font-semibold text-[#69736F] block">European Advisory Desks &amp; Contact</span>
              <span className="font-bold text-[#18211F] block">
                Paris: {COMPANY_REGISTRATION.parisOffice}
              </span>
              <span className="text-[#52605C] block">
                Barcelona: {COMPANY_REGISTRATION.barcelonaOffice} · {COMPANY_REGISTRATION.primaryEmail}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: SPV & SOLANA SETTLEMENT STRUCTURE */}
      {activeTab === 'structure' && (
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-[#DCE5E2] shadow-2xs space-y-6">
          <div className="flex items-center gap-2 text-sm font-bold text-[#18211F]">
            <Scale className="w-5 h-5 text-[#27845D]" />
            <span>Three-Tier Legal SPV &amp; Solana Blockchain Architecture</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="p-5 rounded-2xl bg-[#F6F9F8] border border-[#E3ECE8] space-y-2">
              <span className="px-2.5 py-0.5 rounded bg-emerald-100 text-[#1E3A34] font-bold text-[10px] uppercase inline-block">
                Tier 1 · Platform Operator
              </span>
              <h4 className="font-serif font-bold text-[#18211F] text-base">
                Corporate Technology &amp; Onboarding
              </h4>
              <p className="text-[#52605C] leading-relaxed">
                Operated under SIREN {COMPANY_REGISTRATION.siren} ({COMPANY_REGISTRATION.rcs}), providing investor KYC/AML screening, property underwriting dossiers, and double-entry portfolio accounting.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-[#F6F9F8] border border-[#E3ECE8] space-y-2">
              <span className="px-2.5 py-0.5 rounded bg-blue-100 text-blue-900 font-bold text-[10px] uppercase inline-block">
                Tier 2 · Ring-Fenced SPV
              </span>
              <h4 className="font-serif font-bold text-[#18211F] text-base">
                Asset-Specific Property Vehicle
              </h4>
              <p className="text-[#52605C] leading-relaxed">
                Each real estate asset is structured inside an isolated Special Purpose Vehicle holding fee-simple title, ring-fenced from platform operating liabilities and other properties.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-[#F6F9F8] border border-[#E3ECE8] space-y-2">
              <span className="px-2.5 py-0.5 rounded bg-[#0B1B30] text-[#BEE179] font-bold text-[10px] uppercase inline-block">
                Tier 3 · Solana Infrastructure
              </span>
              <h4 className="font-serif font-bold text-[#18211F] text-base">
                SPL, Token-2022 &amp; USDC Rails
              </h4>
              <p className="text-[#52605C] leading-relaxed">
                Integrates Circle USDC ({SOLANA_INFRASTRUCTURE_REGISTRY[0].address.slice(0, 6)}...) for stablecoin settlement alongside Solana SPL Token and Token-2022 compliance programs.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            {SOLANA_INFRASTRUCTURE_REGISTRY.map((prog) => (
              <div
                key={prog.id}
                className="p-4 rounded-2xl border border-[#DCE5E2] bg-white space-y-2 text-xs"
              >
                <div className="font-bold text-[#18211F]">{prog.name}</div>
                <div className="font-mono text-[11px] text-[#27845D] break-all">{prog.address}</div>
                <p className="text-[11px] text-[#69736F] leading-relaxed">{prog.architecturalNotice}</p>
                <a
                  href={prog.explorerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-[#1E3A34] hover:underline"
                >
                  <span>Verify on Solana Explorer</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: ADMIN LEGAL CHECKLIST (Strictly Isolated to Administrators) */}
      {isAdmin && activeTab === 'checklist' && (
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-[#DCE5E2] shadow-2xs space-y-6">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2 text-sm font-bold text-[#18211F]">
              <Lock className="w-5 h-5 text-[#27845D]" />
              <span>Internal Administrative Legal &amp; Compliance Verification Log</span>
            </div>
            <span className="text-xs bg-amber-100 text-amber-900 font-bold px-3 py-1 rounded">
              Honest Compliance Status Audit
            </span>
          </div>

          <div className="divide-y divide-[#E3ECE8]">
            {checklist.map((item) => (
              <div key={item.id} className="py-4 space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-[#18211F] text-xs sm:text-sm">{item.title}</span>
                  <span
                    className={`text-[10px] font-bold px-2.5 py-0.5 rounded uppercase shrink-0 ${
                      item.status === 'verified'
                        ? 'bg-emerald-100 text-[#1E3A34]'
                        : item.status === 'pending'
                        ? 'bg-amber-100 text-amber-900'
                        : 'bg-rose-100 text-rose-900'
                    }`}
                  >
                    {item.status.replace('_', ' ')}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-[11px] text-[#69736F]">
                  <span>Reviewer: {item.verifiedBy}</span>
                  <span>·</span>
                  <span>Status Date: {item.verifiedAt}</span>
                </div>
                <p className="text-[11px] text-[#1E3A34] bg-[#F6F9F8] p-2.5 rounded-xl font-mono">
                  {item.notes}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Statutory Transparency Disclaimer */}
      <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 flex items-start gap-3 text-xs text-amber-950">
        <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          <strong>Regulatory &amp; Legal Notice:</strong> Corporate registration data (SIREN{' '}
          {COMPANY_REGISTRATION.siren} · {COMPANY_REGISTRATION.rcs} · SIRET {COMPANY_REGISTRATION.siret} · VAT{' '}
          {COMPANY_REGISTRATION.vatIdentificationNumber}) reflects the supplied corporate reference documentation. Offering-specific SPV subscription agreements and public regulatory prospectuses remain subject to per-jurisdiction legal counsel sign-off prior to live external capital solicitation.
        </p>
      </div>
    </div>
  );
};
