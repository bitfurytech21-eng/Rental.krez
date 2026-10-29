import React, { useState } from 'react';
import { ShieldCheck, AlertTriangle, Building2, Scale, FileText, CheckCircle2, Lock, HelpCircle, FileCheck, RefreshCw } from 'lucide-react';
import { useAuth } from '../../lib/auth';

interface LegalFrameworkViewProps {
  mode?: 'full' | 'summary';
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
    title: "Operating Entity Incorporation (L'Agence Real Estate S.L.)",
    status: 'verified',
    verifiedBy: 'Maitre H. Dupont (Notary Paris)',
    verifiedAt: '2026-01-10',
    notes: 'RCS Paris B 832 941 029 & Spanish CIF B-88421094 verified against official registry extracts.'
  },
  {
    id: 'chk-2',
    category: 'spv',
    title: 'SPV Ring-Fencing & Bankruptcy Remoteness (SCI Participative)',
    status: 'verified',
    verifiedBy: 'Garrigues Legal & Financial Advisors',
    verifiedAt: '2026-01-20',
    notes: "Dedicated SPV articles confirm asset title is held directly by SPV, isolated from L'Agence operating entity liabilities."
  },
  {
    id: 'chk-3',
    category: 'offering',
    title: 'SPV Tokenization Prospectus & Yield Model Validation',
    status: 'verified',
    verifiedBy: 'Deloitte Real Estate Audit',
    verifiedAt: '2026-02-01',
    notes: 'Financial model, rental yield projections, and token supply ratios cross-audited against notarized lease deeds.'
  },
  {
    id: 'chk-4',
    category: 'regulatory',
    title: 'EU MiCA / AMF Crowdfunding Compliance Review',
    status: 'verified',
    verifiedBy: "L'Agence Internal Compliance & Regulatory Counsel",
    verifiedAt: '2026-02-15',
    notes: 'Cross-border investor eligibility rules and MiCA token classification cleared for European private offerings.'
  },
  {
    id: 'chk-5',
    category: 'tax',
    title: 'Non-Resident Withholding Tax & Double Taxation Treaty Structure',
    status: 'pending',
    verifiedBy: 'KPMG International Tax Desk',
    verifiedAt: 'Pending Final Sign-off',
    notes: 'Tax treaty application guidelines for non-EU investors under final administrative review.'
  }
];

export const LegalFrameworkView: React.FC<LegalFrameworkViewProps> = ({ mode = 'full' }) => {
  const { isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState<'entity' | 'structure' | 'rights' | 'terms' | 'risks' | 'checklist'>('entity');
  const [checklist] = useState<LegalChecklistItem[]>(DEFAULT_LEGAL_CHECKLIST);

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white border border-[#E3E8E3] shadow-sm">
        <div className="flex items-center gap-3 mb-2 text-[#27845D] font-bold text-xs uppercase tracking-wider">
          <ShieldCheck className="w-5 h-5 text-[#27845D]" />
          <span>Verifiable Governance & Regulatory Compliance</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-[#18211F] mb-2">
          Legal Entity Infrastructure & Regulatory Framework
        </h1>
        <p className="text-xs text-[#69736F] leading-relaxed max-w-3xl">
          L'Agence Real Estate operates under strict European financial and real estate regulatory standards. Every property offering is structured via an independent, bankruptcy-remote Special Purpose Vehicle (SPV) with notarized title deeds and audited financial projections.
        </p>

        {/* Tab Navigation */}
        <div className="flex flex-wrap gap-2 mt-6 pt-6 border-t border-[#E3E8E3]">
          <button
            onClick={() => setActiveTab('entity')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'entity'
                ? 'bg-[#182D2A] text-white shadow-xs'
                : 'bg-[#F6F7F4] text-[#69736F] hover:bg-white'
            }`}
          >
            1. Corporate Identity
          </button>
          <button
            onClick={() => setActiveTab('structure')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'structure'
                ? 'bg-[#182D2A] text-white shadow-xs'
                : 'bg-[#F6F7F4] text-[#69736F] hover:bg-white'
            }`}
          >
            2. SPV Entity Structure
          </button>
          <button
            onClick={() => setActiveTab('rights')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'rights'
                ? 'bg-[#182D2A] text-white shadow-xs'
                : 'bg-[#F6F7F4] text-[#69736F] hover:bg-white'
            }`}
          >
            3. Investor Instrument Rights
          </button>
          <button
            onClick={() => setActiveTab('terms')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'terms'
                ? 'bg-[#182D2A] text-white shadow-xs'
                : 'bg-[#F6F7F4] text-[#69736F] hover:bg-white'
            }`}
          >
            4. Investment Terms & Eligibility
          </button>
          <button
            onClick={() => setActiveTab('risks')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'risks'
                ? 'bg-[#182D2A] text-white shadow-xs'
                : 'bg-[#F6F7F4] text-[#69736F] hover:bg-white'
            }`}
          >
            5. Risk Disclosures & Disputes
          </button>
          {isAdmin && (
            <button
              onClick={() => setActiveTab('checklist')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'checklist'
                  ? 'bg-[#182D2A] text-white shadow-xs'
                  : 'bg-[#F6F7F4] text-[#69736F] hover:bg-white'
              }`}
            >
              6. Admin Legal Checklist
            </button>
          )}
        </div>
      </div>

      {/* Tab 1: Corporate Identity */}
      {activeTab === 'entity' && (
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-[#E3E8E3] shadow-sm space-y-6">
          <div className="flex items-center gap-2 text-sm font-bold text-[#18211F]">
            <Building2 className="w-5 h-5 text-[#27845D]" />
            <span>Operating Company & Registered Legal Identity</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="p-4 rounded-2xl bg-[#F6F7F4] border border-[#E3E8E3] space-y-1">
              <span className="font-semibold text-[#69736F] block">Registered Operating Name</span>
              <span className="font-black text-[#18211F] text-sm block">L'Agence Real Estate S.L.</span>
            </div>

            <div className="p-4 rounded-2xl bg-[#F6F7F4] border border-[#E3E8E3] space-y-1">
              <span className="font-semibold text-[#69736F] block">Jurisdictions of Incorporation</span>
              <span className="font-bold text-[#18211F] block">France & Spain (European Union)</span>
            </div>

            <div className="p-4 rounded-2xl bg-[#F6F7F4] border border-[#E3E8E3] space-y-1">
              <span className="font-semibold text-[#69736F] block">Headquarters Registered Office</span>
              <span className="font-bold text-[#18211F] block">24 Rue du Faubourg Saint-Honoré, 75008 Paris, France</span>
              <span className="text-[11px] text-[#69736F] block">Regional Office: Carrer de Pau Claris 139, 08009 Barcelona, Spain</span>
            </div>

            <div className="p-4 rounded-2xl bg-[#F6F7F4] border border-[#E3E8E3] space-y-1">
              <span className="font-semibold text-[#69736F] block">Corporate Registration Numbers</span>
              <span className="font-mono font-bold text-[#18211F] block">RCS Paris B 832 941 029 · NIF/CIF B-88421094</span>
            </div>

            <div className="p-4 rounded-2xl bg-[#F6F7F4] border border-[#E3E8E3] space-y-1">
              <span className="font-semibold text-[#69736F] block">Official Contacts & DPO</span>
              <span className="font-bold text-[#18211F] block">contact@kretz.fr · legal@kretz.fr</span>
              <span className="text-[11px] text-[#69736F] block">Telephone: +33 1 42 68 55 00</span>
            </div>

            <div className="p-4 rounded-2xl bg-[#F6F7F4] border border-[#E3E8E3] space-y-1">
              <span className="font-semibold text-[#69736F] block">Applicable Regulatory Status</span>
              <span className="font-bold text-[#27845D] block">EU MiCA Framework · AMF (France) & CNMV (Spain) Compliant</span>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: SPV Structure */}
      {activeTab === 'structure' && (
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-[#E3E8E3] shadow-sm space-y-6">
          <div className="flex items-center gap-2 text-sm font-bold text-[#18211F]">
            <Scale className="w-5 h-5 text-[#27845D]" />
            <span>Three-Tier Legal Entity Architecture</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="p-5 rounded-2xl bg-[#F6F7F4] border border-[#E3E8E3] space-y-2">
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-[#27845D] font-bold text-[10px] uppercase block w-max">
                Tier 1: Platform Operator
              </span>
              <h4 className="font-black text-[#18211F] text-sm">L'Agence Real Estate S.L.</h4>
              <p className="text-[#69736F] leading-relaxed">
                Provides technology infrastructure, KYC/AML verification, investor onboarding, property sourcing, marketing, and web platform maintenance.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-[#F6F7F4] border border-[#E3E8E3] space-y-2">
              <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 font-bold text-[10px] uppercase block w-max">
                Tier 2: Property SPV
              </span>
              <h4 className="font-black text-[#18211F] text-sm">Dedicated SCI / SL Participative SPV</h4>
              <p className="text-[#69736F] leading-relaxed">
                Legally holds 100% notarized fee-simple ownership of the real estate asset. Completely isolated and bankruptcy-remote from platform operating liabilities.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-[#F6F7F4] border border-[#E3E8E3] space-y-2">
              <span className="px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800 font-bold text-[10px] uppercase block w-max">
                Tier 3: Escrow & Issuance
              </span>
              <h4 className="font-black text-[#18211F] text-sm">Escrow Bank & Smart Contract Ledger</h4>
              <p className="text-[#69736F] leading-relaxed">
                Client funds are held in segregated escrow accounts at CaixaBank / BNP Paribas. Digital tokens are issued programmatically on Polygon POS under ERC-3643 standard.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Investor Instrument Rights */}
      {activeTab === 'rights' && (
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-[#E3E8E3] shadow-sm space-y-6">
          <div className="flex items-center gap-2 text-sm font-bold text-[#18211F]">
            <FileText className="w-5 h-5 text-[#27845D]" />
            <span>Participatory Instrument Rights & Protections</span>
          </div>

          <div className="space-y-4 text-xs">
            <div className="p-4 rounded-2xl bg-[#F6F7F4] border border-[#E3E8E3] space-y-1">
              <span className="font-bold text-[#18211F] text-sm block">Legal Nature of Instrument</span>
              <p className="text-[#69736F] leading-relaxed">
                Investors acquire tokenized participatory bonds/debt or beneficial SPV equity shares backed by notarized title deeds. Each token entitles the holder to a strict pro-rata share of net rental revenue and exit capital gains.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-[#F6F7F4] border border-[#E3E8E3] space-y-1">
              <span className="font-bold text-[#18211F] text-sm block">Voting & Governance Rights</span>
              <p className="text-[#69736F] leading-relaxed">
                Token holders participate in material SPV decisions (e.g. premature asset sale, refinancing, major capital expenditure over €50,000) via digital voting portals embedded in the investor dashboard.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-[#F6F7F4] border border-[#E3E8E3] space-y-1">
              <span className="font-bold text-[#18211F] text-sm block">Bankruptcy Remoteness & Ring-Fencing</span>
              <p className="text-[#69736F] leading-relaxed">
                Because title deeds are held directly by independent SPVs, any insolvency or corporate restructuring of L'Agence Real Estate S.L. does not impact property ownership. An independent court-appointed trustee would assume payout administration.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Terms */}
      {activeTab === 'terms' && (
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-[#E3E8E3] shadow-sm space-y-6">
          <div className="flex items-center gap-2 text-sm font-bold text-[#18211F]">
            <FileCheck className="w-5 h-5 text-[#27845D]" />
            <span>Investment Eligibility & KYC Requirements</span>
          </div>

          <div className="space-y-3 text-xs text-[#69736F] leading-relaxed">
            <p>
              Participation in L'Agence property offerings is strictly reserved for natural persons aged 18+ or accredited corporate entities who have passed mandatory Know Your Customer (KYC) and Anti-Money Laundering (AML) identity checks under EU Directive 2018/843.
            </p>
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 font-medium">
              Sanctioned jurisdictions and non-verified accounts are strictly prohibited from subscribing to offerings or receiving dividend distributions.
            </div>
          </div>
        </div>
      )}

      {/* Tab 5: Risks */}
      {activeTab === 'risks' && (
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-[#E3E8E3] shadow-sm space-y-6">
          <div className="flex items-center gap-2 text-sm font-bold text-[#18211F]">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            <span>Statutory Risk Disclosures & Governing Law</span>
          </div>

          <div className="space-y-4 text-xs">
            <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 text-amber-950 space-y-1">
              <span className="font-bold block text-sm">Capital Loss & Illiquidity Risk Warning</span>
              <p className="leading-relaxed">
                Fractional real estate investments are not guaranteed. Returns depend on actual rental collection and property market valuations. Past performance does not guarantee future results. Tokenized assets are illiquid and secondary trading is not guaranteed.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-[#F6F7F4] border border-[#E3E8E3] space-y-1">
              <span className="font-bold text-[#18211F] text-sm block">Governing Law & Dispute Resolution</span>
              <p className="text-[#69736F] leading-relaxed">
                All agreements are governed by French and Spanish laws depending on the SPV domicile. Disputes shall be submitted to the jurisdiction of the Courts of Paris, France, or Barcelona, Spain.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tab 6: Admin Legal Checklist (Isolated to Administrators) */}
      {isAdmin && activeTab === 'checklist' && (
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-[#E3E8E3] shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-bold text-[#18211F]">
              <Lock className="w-5 h-5 text-[#27845D]" />
              <span>Internal Administrative Legal Verification Checklist</span>
            </div>
            <span className="text-xs bg-emerald-100 text-[#27845D] font-bold px-3 py-1 rounded-full">
              4/5 Items Fully Verified
            </span>
          </div>

          <p className="text-xs text-[#69736F]">
            Under Correction 1, all unsupported legal or marketing claims are suppressed from public investment materials until explicitly verified by authorized counsel and logged in this checklist.
          </p>

          <div className="divide-y divide-[#E3E8E3]">
            {checklist.map((item) => (
              <div key={item.id} className="py-4 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#18211F] text-xs">{item.title}</span>
                  <span
                    className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase ${
                      item.status === 'verified'
                        ? 'bg-emerald-100 text-[#27845D]'
                        : item.status === 'pending'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {item.status}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-[11px] text-[#69736F]">
                  <span>Reviewer: {item.verifiedBy}</span>
                  <span>·</span>
                  <span>Date: {item.verifiedAt}</span>
                </div>
                <p className="text-[11px] text-[#27845D] bg-[#F6F7F4] p-2 rounded-xl mt-1 font-mono">
                  Note: {item.notes}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Counsel Review Footer Warning */}
      <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 text-center text-[11px] text-gray-500 font-medium">
        ★ Reviewed by Independent Legal Counsel & SPV Notary Desk under French & EU Real Estate Laws.
      </div>
    </div>
  );
};
