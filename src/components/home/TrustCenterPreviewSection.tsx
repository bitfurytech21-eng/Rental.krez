import React from 'react';
import {
  COMPANY_REGISTRATION,
  LEGAL_DOCUMENTATION_CENTRE,
  TRUST_CENTRE_ITEMS,
} from '../../data/institutionalConfig';
import {
  ShieldCheck,
  FileText,
  Building2,
  ArrowRight,
  Scale,
  CheckCircle2,
  Clock,
  Lock,
} from 'lucide-react';

interface TrustCenterPreviewSectionProps {
  onNavigateTrust: () => void;
  onNavigateLegalDoc: (docId?: string) => void;
}

export const TrustCenterPreviewSection: React.FC<TrustCenterPreviewSectionProps> = ({
  onNavigateTrust,
  onNavigateLegalDoc,
}) => {
  const featuredDocs = LEGAL_DOCUMENTATION_CENTRE.slice(0, 6);
  const completedCount = TRUST_CENTRE_ITEMS.filter((i) => i.status === 'COMPLETED').length;
  const partialCount = TRUST_CENTRE_ITEMS.filter((i) => i.status === 'PARTIALLY COMPLETED').length;
  const blockedCount = TRUST_CENTRE_ITEMS.filter((i) => i.status === 'BLOCKED').length;

  return (
    <section
      aria-labelledby="trust-centre-preview-heading"
      className="py-16 sm:py-20 bg-[#F6F9F8] border-t border-[#DDE8E4]"
    >
      <div className="container max-w-[1300px] mx-auto px-4 sm:px-6 space-y-10">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-6 border-b border-[#DDE8E4] text-left">
          <div className="max-w-2xl space-y-2">
            <span className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#087F5B] block">
              Corporate Registry &amp; Legal Transparency
            </span>
            <h2
              id="trust-centre-preview-heading"
              className="font-serif text-2xl sm:text-3xl lg:text-4xl font-bold text-[#142622] tracking-tight"
            >
              Institutional Trust Centre &amp; 12-Document Legal Vault
            </h2>
            <p className="text-sm text-[#52635E] leading-relaxed">
              Inspect our French commercial registry identifiers, notarized SPV ring-fencing framework, Solana Mainnet verification statuses, and complete investor documentation before committing capital.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => onNavigateLegalDoc()}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white hover:bg-[#EDF4F1] border border-[#CFE0DA] text-xs font-bold text-[#142622] transition-colors cursor-pointer"
            >
              <Scale className="w-4 h-4 text-[#087F5B]" />
              <span>Legal Documentation ({LEGAL_DOCUMENTATION_CENTRE.length})</span>
            </button>
            <button
              type="button"
              onClick={onNavigateTrust}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#1E3A34] hover:bg-[#142824] text-white text-xs font-bold transition-colors cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4 text-[#BEE179]" />
              <span>Explore Full Trust Centre</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* 2-Column Institutional Layout: Corporate Registry + Legal Document Index */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* Left: Official Corporate Registration Identifiers */}
          <div className="lg:col-span-5 bg-white border border-[#DDE8E4] rounded-2xl p-6 flex flex-col justify-between space-y-6 text-left shadow-2xs">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-[#1E3A34] text-[#BEE179] flex items-center justify-center">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-[#142622]">
                      Corporate Registration Data
                    </h3>
                    <p className="text-[11px] text-[#60726D]">
                      Paris Commercial Registry · Supplied Reference Record
                    </p>
                  </div>
                </div>
              </div>

              <dl className="divide-y divide-[#EBF2EF] border-y border-[#EBF2EF] text-xs">
                <div className="py-2.5 flex items-center justify-between gap-3">
                  <dt className="text-[#60726D] font-medium">SIREN</dt>
                  <dd className="font-mono tabular-nums font-bold text-[#142622]">
                    {COMPANY_REGISTRATION.siren}
                  </dd>
                </div>
                <div className="py-2.5 flex items-center justify-between gap-3">
                  <dt className="text-[#60726D] font-medium">RCS Registration</dt>
                  <dd className="font-mono font-bold text-[#142622]">
                    {COMPANY_REGISTRATION.rcs}
                  </dd>
                </div>
                <div className="py-2.5 flex items-center justify-between gap-3">
                  <dt className="text-[#60726D] font-medium">SIRET</dt>
                  <dd className="font-mono tabular-nums font-bold text-[#142622]">
                    {COMPANY_REGISTRATION.siret}
                  </dd>
                </div>
                <div className="py-2.5 flex items-center justify-between gap-3">
                  <dt className="text-[#60726D] font-medium">EU VAT Number</dt>
                  <dd className="font-mono tabular-nums font-bold text-[#142622]">
                    {COMPANY_REGISTRATION.vatIdentificationNumber}
                  </dd>
                </div>
                <div className="py-2.5 flex items-center justify-between gap-3">
                  <dt className="text-[#60726D] font-medium">Stated Legal Form</dt>
                  <dd className="font-semibold text-[#142622]">
                    {COMPANY_REGISTRATION.legalForm}
                  </dd>
                </div>
              </dl>
            </div>

            {/* Honest Verification Summary Strip */}
            <div className="p-3.5 rounded-xl bg-[#F6F9F8] border border-[#DDE8E4] space-y-2">
              <div className="text-[10px] font-bold uppercase tracking-wider text-[#60726D]">
                Trust Matrix Verification Standing
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs font-mono tabular-nums">
                <div className="p-2 rounded-lg bg-white border border-[#DDE8E4]">
                  <span className="flex items-center gap-1 text-[10px] text-emerald-700 font-bold">
                    <CheckCircle2 className="w-3 h-3" /> Verified
                  </span>
                  <div className="text-sm font-bold text-[#142622] mt-0.5">{completedCount}</div>
                </div>
                <div className="p-2 rounded-lg bg-white border border-[#DDE8E4]">
                  <span className="flex items-center gap-1 text-[10px] text-amber-700 font-bold">
                    <Clock className="w-3 h-3" /> Partial
                  </span>
                  <div className="text-sm font-bold text-[#142622] mt-0.5">{partialCount}</div>
                </div>
                <div className="p-2 rounded-lg bg-white border border-[#DDE8E4]">
                  <span className="flex items-center gap-1 text-[10px] text-slate-600 font-bold">
                    <Lock className="w-3 h-3" /> External
                  </span>
                  <div className="text-sm font-bold text-[#142622] mt-0.5">{blockedCount}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Right: 12-Document Legal Centre Quick Directory */}
          <div className="lg:col-span-7 bg-white border border-[#DDE8E4] rounded-2xl p-6 flex flex-col justify-between space-y-5 text-left shadow-2xs">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-[#142622]">
                  Investor &amp; Regulatory Documentation Centre
                </h3>
                <p className="text-xs text-[#60726D] mt-0.5">
                  All 12 foundational governance, subscription, risk, custody, and AML/KYC policies
                </p>
              </div>
              <span className="text-[11px] font-mono font-bold text-[#087F5B] bg-[#EAF6F1] px-2.5 py-1 rounded-lg border border-[#CBE6DC]">
                12 Documents Published
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {featuredDocs.map((doc) => (
                <button
                  key={doc.id}
                  type="button"
                  onClick={() => onNavigateLegalDoc(doc.id)}
                  className="p-3.5 rounded-xl border border-[#E3ECE8] hover:border-[#087F5B] bg-[#FAFDFC] hover:bg-white transition-colors text-left cursor-pointer group flex flex-col justify-between gap-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText className="w-4 h-4 text-[#087F5B] shrink-0" />
                      <span className="text-xs font-bold text-[#142622] group-hover:text-[#087F5B] truncate">
                        {doc.title}
                      </span>
                    </div>
                    <span className="text-[9.5px] font-mono text-[#60726D] shrink-0">
                      v{doc.version}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#60726D] line-clamp-2 leading-snug">
                    {doc.summary}
                  </p>
                </button>
              ))}
            </div>

            <div className="pt-3 border-t border-[#EBF2EF] flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="text-[#60726D]">
                Plus Tokenholder Rights, Subscription &amp; Redemption, Data Protection, Complaints &amp; Custody Safeguards
              </span>
              <button
                type="button"
                onClick={() => onNavigateLegalDoc()}
                className="font-bold text-[#087F5B] hover:underline inline-flex items-center gap-1 cursor-pointer"
              >
                <span>View All 12 Documents</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
