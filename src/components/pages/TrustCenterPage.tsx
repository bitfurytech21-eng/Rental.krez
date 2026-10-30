import React, { useState } from 'react';
import {
  ShieldCheck,
  Building2,
  FileText,
  ExternalLink,
  Copy,
  Check,
  RefreshCw,
  Lock,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Mail,
  MapPin,
  ArrowRight,
  Layers,
  Scale,
} from 'lucide-react';
import {
  COMPANY_REGISTRATION,
  SOLANA_INFRASTRUCTURE_REGISTRY,
  LEGAL_DOCUMENTATION_CENTRE,
  TRUST_CENTRE_ITEMS,
  PLATFORM_IMPLEMENTATION_ASSESSMENT,
  ImplementationStatus,
} from '../../data/institutionalConfig';
import {
  SolanaAccountVerificationResult,
  verifyInfrastructureAccountsOnMainnet,
} from '../../lib/solanaService';
import { ledger } from '../../lib/ledger';
import { formatCurrency, formatPercent } from '../../lib/utils';

interface TrustCenterPageProps {
  onNavigate: (path: string) => void;
}

function renderStatusBadge(status: ImplementationStatus) {
  switch (status) {
    case 'COMPLETED':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 font-mono text-[10.5px] font-bold">
          <CheckCircle2 className="w-3 h-3 text-emerald-600" /> COMPLETED
        </span>
      );
    case 'PARTIALLY COMPLETED':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded bg-blue-50 text-blue-900 border border-blue-200 font-mono text-[10.5px] font-bold">
          <Clock className="w-3 h-3 text-blue-600" /> PARTIALLY COMPLETED
        </span>
      );
    case 'BLOCKED':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded bg-amber-50 text-amber-950 border border-amber-200 font-mono text-[10.5px] font-bold">
          <AlertTriangle className="w-3 h-3 text-amber-600" /> BLOCKED
        </span>
      );
    case 'NOT IMPLEMENTED':
    default:
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-300 font-mono text-[10.5px] font-bold">
          NOT IMPLEMENTED
        </span>
      );
  }
}

export const TrustCenterPage: React.FC<TrustCenterPageProps> = ({ onNavigate }) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [isVerifyingRpc, setIsVerifyingRpc] = useState(false);
  const [rpcVerification, setRpcVerification] = useState<
    Record<string, SolanaAccountVerificationResult> | null
  >(null);
  const [rpcError, setRpcError] = useState<string | null>(null);

  const liveProperties = ledger.getFrontendProperties();

  const handleCopy = (value: string) => {
    navigator.clipboard.writeText(value);
    setCopiedKey(value);
    setTimeout(() => setCopiedKey(null), 1800);
  };

  const handleVerifyMainnet = async () => {
    setIsVerifyingRpc(true);
    setRpcError(null);
    try {
      const results = await verifyInfrastructureAccountsOnMainnet();
      setRpcVerification(results);
    } catch (err: any) {
      setRpcError(err?.message || 'Unable to verify accounts against Solana Mainnet RPC right now.');
    } finally {
      setIsVerifyingRpc(false);
    }
  };

  return (
    <div className="bg-[#F6F9F8] min-h-screen py-10 sm:py-16 text-left">
      <div className="container max-w-[1240px] mx-auto px-4 sm:px-6 space-y-12">
        {/* 1. Institutional Trust Centre Hero Header */}
        <section className="bg-[#0B1B30] text-white rounded-3xl border border-[#1D3860] p-6 sm:p-10 shadow-xl space-y-6">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-6 border-b border-[#1D3860]">
            <div className="space-y-3 max-w-3xl">
              <div className="inline-flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.18em] text-[#BEE179]">
                <ShieldCheck className="w-4 h-4 text-[#BEE179]" />
                <span>Institutional Transparency &amp; Verification Hub</span>
              </div>
              <h1 className="font-serif text-3xl sm:text-5xl font-black text-white tracking-tight leading-[1.1]">
                Trust Centre &amp; Regulatory Governance
              </h1>
              <p className="text-sm sm:text-base text-[#D1E2F7] leading-relaxed">
                A transparent record of corporate registration identifiers, legal documentation, Solana Mainnet settlement programs, property underwriting safeguards, smart-contract audit disclosures, and custody controls.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <button
                type="button"
                onClick={() => onNavigate('/legal')}
                className="px-4 py-2.5 rounded-xl bg-[#BEE179] hover:bg-[#AEDB5B] text-[#0B1B30] text-xs font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Legal Documentation (12)</span>
              </button>
              <button
                type="button"
                onClick={() => onNavigate('/contact')}
                className="px-4 py-2.5 rounded-xl bg-[#102442] hover:bg-[#173158] border border-[#1D3860] text-white text-xs font-bold transition-colors cursor-pointer"
              >
                Contact Compliance Desk
              </button>
            </div>
          </div>

          {/* Corporate Registration Identity Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
            {[
              { label: 'SIREN Number', value: COMPANY_REGISTRATION.siren, status: 'Supplied Registry' },
              { label: 'Commercial Registry', value: COMPANY_REGISTRATION.rcs, status: 'Paris R.C.S.' },
              { label: 'SIRET Establishment', value: COMPANY_REGISTRATION.siret, status: 'Headquarters' },
              { label: 'EU VAT Number', value: COMPANY_REGISTRATION.vatIdentificationNumber, status: 'FR Intra-EU' },
              { label: 'Legal Form', value: COMPANY_REGISTRATION.legalForm, status: 'Private Limited' },
            ].map((item) => (
              <div
                key={item.label}
                className="p-4 rounded-2xl bg-[#102442] border border-[#1D3860] flex flex-col justify-between gap-2"
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#8EA7C7]">
                    {item.label}
                  </span>
                  <span className="text-[9.5px] font-mono text-[#BEE179]">{item.status}</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-xs sm:text-sm font-bold text-white truncate" title={item.value}>
                    {item.value}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopy(item.value)}
                    className="p-1 rounded hover:bg-[#1A355E] text-[#8EA7C7] hover:text-white cursor-pointer shrink-0"
                    aria-label={`Copy ${item.label}`}
                    title={`Copy ${item.label}`}
                  >
                    {copiedKey === item.value ? (
                      <Check className="w-3.5 h-3.5 text-[#BEE179]" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 2. Solana Mainnet Infrastructure, Mint Addresses & Explorer Verification */}
        <section className="bg-white rounded-3xl border border-[#DCE5E2] p-6 sm:p-8 shadow-2xs space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-[#E8EFEA]">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-[#1E3A34]">
                <Layers className="w-4 h-4 text-[#27845D]" />
                <span>On-Chain Settlement &amp; Program Verification</span>
              </div>
              <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#18211F]">
                Solana Smart-Contract Programs &amp; Token Mint Registry
              </h2>
              <p className="text-xs sm:text-sm text-[#52605C]">
                Direct Solana Explorer verification links and live Mainnet-Beta JSON-RPC account confirmation for every configured protocol address.
              </p>
            </div>

            <button
              type="button"
              onClick={handleVerifyMainnet}
              disabled={isVerifyingRpc}
              className="px-4 py-2.5 rounded-xl bg-[#182D2A] hover:bg-[#24423C] text-white text-xs font-bold inline-flex items-center gap-2 shrink-0 self-start md:self-auto cursor-pointer disabled:opacity-60"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isVerifyingRpc ? 'animate-spin' : ''}`} />
              <span>{isVerifyingRpc ? 'Verifying on Solana Mainnet...' : 'Verify Live via Mainnet RPC'}</span>
            </button>
          </div>

          {rpcError && (
            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900">
              {rpcError}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {SOLANA_INFRASTRUCTURE_REGISTRY.map((prog) => {
              const rpcInfo = rpcVerification?.[prog.address];
              return (
                <div
                  key={prog.id}
                  className="p-5 rounded-2xl border border-[#DCE5E2] bg-[#FAFDFC] flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-bold text-[#1E3A34] bg-[#E6F3EE] px-2.5 py-0.5 rounded">
                        {prog.category}
                      </span>
                      {renderStatusBadge('COMPLETED')}
                    </div>

                    <h3 className="font-serif text-lg font-bold text-[#18211F]">{prog.name}</h3>

                    <div className="p-2.5 rounded-xl bg-white border border-[#DCE5E2] flex items-center justify-between gap-2 font-mono text-[11px]">
                      <span className="truncate text-[#18211F] font-semibold" title={prog.address}>
                        {prog.address}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopy(prog.address)}
                        className="p-1 rounded hover:bg-[#F0F4F2] text-[#52605C] hover:text-[#18211F] cursor-pointer shrink-0"
                        aria-label={`Copy ${prog.shortLabel} address`}
                      >
                        {copiedKey === prog.address ? (
                          <Check className="w-3.5 h-3.5 text-[#27845D]" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#69736F] block">
                        Stated Technical Role
                      </span>
                      <ul className="space-y-1 text-xs text-[#4A5854]">
                        {prog.statedPurposes.map((p) => (
                          <li key={p} className="flex items-start gap-1.5">
                            <span className="text-[#27845D] font-bold">·</span>
                            <span>{p}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <p className="text-[11px] text-[#52605C] bg-[#F0F5F3] p-2.5 rounded-xl leading-relaxed">
                      {prog.architecturalNotice}
                    </p>

                    {rpcInfo && (
                      <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 font-mono text-[10.5px] text-emerald-950 space-y-0.5">
                        <div className="font-bold text-emerald-800">
                          Mainnet-Beta RPC: {rpcInfo.exists ? 'Verified Active' : 'Unavailable'}
                        </div>
                        <div>Executable: {rpcInfo.executable ? 'Yes (Protocol Program)' : 'No (SPL Mint State)'}</div>
                        <div className="truncate">Owner: {rpcInfo.owner}</div>
                      </div>
                    )}
                  </div>

                  <div className="pt-3 border-t border-[#E8EFEA] flex items-center justify-between text-xs">
                    <a
                      href={prog.explorerUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 font-bold text-[#1E3A34] hover:underline"
                    >
                      <span>Solana Explorer</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                    <a
                      href={prog.solscanUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 font-semibold text-[#69736F] hover:text-[#18211F]"
                    >
                      <span>Solscan</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Smart-Contract Audit Disclosure Box */}
          <div className="p-5 rounded-2xl bg-[#F6F9F8] border border-[#DCE5E2] grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-[#18211F] text-sm">
                  Core Solana Protocol Programs (SPL &amp; Token-2022)
                </span>
                {renderStatusBadge('COMPLETED')}
              </div>
              <p className="text-[#52605C] leading-relaxed">
                Both <code className="font-mono">TokenkegQfe...</code> and <code className="font-mono">TokenzQdBNb...</code> are canonical Solana Labs protocol programs maintained on Solana Mainnet-Beta and audited by multiple independent security firms (including Kudelski, OtterSec, and Halborn).
              </p>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-[#18211F] text-sm">
                  Bespoke SPV Distribution &amp; Transfer-Hook Contracts
                </span>
                {renderStatusBadge('BLOCKED')}
              </div>
              <p className="text-[#52605C] leading-relaxed">
                Custom per-property SPV distribution vaults and bespoke transfer-hook programs have not yet been deployed to Mainnet or independently audited. No custom smart-contract audit badge is claimed until external audit completion.
              </p>
            </div>
          </div>
        </section>

        {/* 3. Itemized Trust & Verification Matrix (All 14 Transparency Dimensions) */}
        <section className="bg-white rounded-3xl border border-[#DCE5E2] p-6 sm:p-8 shadow-2xs space-y-6">
          <div className="space-y-1 pb-4 border-b border-[#E8EFEA]">
            <div className="inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-[#1E3A34]">
              <Scale className="w-4 h-4 text-[#27845D]" />
              <span>Itemized Verification Status</span>
            </div>
            <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#18211F]">
              Governance, Regulatory, Custody &amp; Security Disclosures
            </h2>
            <p className="text-xs sm:text-sm text-[#52605C]">
              Every institutional safeguard is classified transparently according to verified implementation evidence.
            </p>
          </div>

          <div className="divide-y divide-[#E8EFEA]">
            {TRUST_CENTRE_ITEMS.map((item) => (
              <div
                key={item.id}
                className="py-4 sm:py-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
              >
                <div className="space-y-1.5 max-w-3xl">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[10.5px] font-bold uppercase tracking-wider text-[#69736F]">
                      {item.category}
                    </span>
                    <span>·</span>
                    <span className="text-xs font-semibold text-[#1E3A34]">
                      {item.verificationBadge}
                    </span>
                  </div>
                  <h3 className="font-bold text-sm sm:text-base text-[#18211F]">{item.title}</h3>
                  <p className="text-xs sm:text-sm text-[#52605C] leading-relaxed">{item.detail}</p>
                  {item.referenceValue && (
                    <div className="font-mono text-[11px] text-[#18211F] bg-[#F6F9F8] inline-block px-2.5 py-1 rounded border border-[#E3ECE8]">
                      {item.referenceValue}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-3 shrink-0 self-start lg:self-center">
                  {renderStatusBadge(item.status)}
                  {item.externalUrl && (
                    <a
                      href={item.externalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 rounded-lg border border-[#DCE5E2] hover:bg-[#F6F9F8] text-xs font-bold text-[#18211F] inline-flex items-center gap-1"
                    >
                      <span>Explorer</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                  {item.internalRoute && (
                    <button
                      type="button"
                      onClick={() => onNavigate(item.internalRoute!)}
                      className="px-3 py-1.5 rounded-lg border border-[#DCE5E2] hover:bg-[#F6F9F8] text-xs font-bold text-[#18211F] inline-flex items-center gap-1 cursor-pointer"
                    >
                      <span>Inspect</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 4. Property Verification & Active SPV Underwriting Summary */}
        <section className="bg-white rounded-3xl border border-[#DCE5E2] p-6 sm:p-8 shadow-2xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E8EFEA]">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-[#1E3A34]">
                <Building2 className="w-4 h-4 text-[#27845D]" />
                <span>Property Verification Registry</span>
              </div>
              <h2 className="font-serif text-2xl font-bold text-[#18211F]">
                Approved Marketplace Offerings ({liveProperties.length} Active)
              </h2>
              <p className="text-xs text-[#52605C]">
                Only properties approved through administrative underwriting gates appear in the public marketplace.
              </p>
            </div>

            <button
              type="button"
              onClick={() => onNavigate('/properties')}
              className="px-4 py-2 rounded-xl bg-[#182D2A] hover:bg-[#24423C] text-white text-xs font-bold inline-flex items-center gap-1.5 shrink-0 self-start sm:self-auto cursor-pointer"
            >
              <span>Inspect All Data Rooms</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#E8EFEA] text-[#69736F] font-semibold">
                  <th className="pb-3 pr-4">Property Title</th>
                  <th className="pb-3 px-4">Location</th>
                  <th className="pb-3 px-4">SPV Vehicle / Ticker</th>
                  <th className="pb-3 px-4 text-right">Target Capital</th>
                  <th className="pb-3 px-4 text-right">Proj. Net Yield</th>
                  <th className="pb-3 pl-4 text-right">Underwriting Gate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0F4F2]">
                {liveProperties.slice(0, 6).map((prop) => (
                  <tr key={prop.id} className="hover:bg-[#F9FCFB] transition-colors">
                    <td className="py-3 pr-4 font-bold text-[#18211F] max-w-[230px] truncate">
                      <button
                        type="button"
                        onClick={() => onNavigate(`/property/${prop.slug}`)}
                        className="hover:text-[#27845D] hover:underline text-left cursor-pointer"
                      >
                        {prop.title}
                      </button>
                    </td>
                    <td className="py-3 px-4 text-[#52605C]">{prop.location}</td>
                    <td className="py-3 px-4 font-mono text-[11px] text-[#18211F]">
                      {prop.spvEntityName || `SPV ${prop.tokenTicker}`}
                    </td>
                    <td className="py-3 px-4 font-mono tabular-nums text-right font-semibold text-[#18211F]">
                      {formatCurrency(prop.targetAmount)}
                    </td>
                    <td className="py-3 px-4 font-mono tabular-nums text-right font-bold text-emerald-700">
                      {formatPercent(prop.estimatedAnnualYield)}
                    </td>
                    <td className="py-3 pl-4 text-right">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold text-[11px]">
                        <CheckCircle2 className="w-3 h-3" /> Approved Data Room
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* 5. Legal Documentation Directory (All 12 Documents) */}
        <section className="bg-white rounded-3xl border border-[#DCE5E2] p-6 sm:p-8 shadow-2xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E8EFEA]">
            <div>
              <h2 className="font-serif text-2xl font-bold text-[#18211F]">
                Complete 12-Document Legal &amp; Compliance Library
              </h2>
              <p className="text-xs text-[#52605C] mt-0.5">
                Direct access to every platform policy, risk statement, subscription contract, and safeguarding notice.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('/legal')}
              className="px-4 py-2 rounded-xl border border-[#DCE5E2] hover:bg-[#F6F9F8] text-xs font-bold text-[#18211F] cursor-pointer self-start sm:self-auto"
            >
              Open Full Legal Reader
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {LEGAL_DOCUMENTATION_CENTRE.map((doc) => (
              <button
                key={doc.id}
                type="button"
                onClick={() => onNavigate(`/legal?doc=${doc.slug}`)}
                className="p-4 rounded-2xl border border-[#DCE5E2] hover:border-[#182D2A] bg-[#FAFDFC] hover:bg-white transition-colors text-left flex flex-col justify-between gap-3 cursor-pointer group"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] font-mono">
                    <span className="font-bold text-[#1E3A34]">Doc {doc.number}</span>
                    <span className="text-[#69736F]">{doc.version}</span>
                  </div>
                  <h3 className="font-bold text-sm text-[#18211F] group-hover:text-[#1E3A34]">
                    {doc.title}
                  </h3>
                  <p className="text-xs text-[#69736F] line-clamp-2 leading-normal">{doc.summary}</p>
                </div>
                <div className="pt-2 border-t border-[#E8EFEA] flex items-center justify-between text-[11px]">
                  <span className="font-semibold text-[#52605C] truncate max-w-[190px]">
                    {doc.category}
                  </span>
                  <span className="font-bold text-[#1E3A34] inline-flex items-center gap-1 shrink-0">
                    Read <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* 6. Platform Implementation Assessment Matrix */}
        <section className="bg-white rounded-3xl border border-[#DCE5E2] p-6 sm:p-8 shadow-2xs space-y-5">
          <div className="space-y-1 pb-4 border-b border-[#E8EFEA]">
            <div className="inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-[#1E3A34]">
              <Lock className="w-4 h-4 text-[#27845D]" />
              <span>Engineering &amp; Compliance Readiness Audit</span>
            </div>
            <h2 className="font-serif text-2xl font-bold text-[#18211F]">
              Platform Implementation Assessment
            </h2>
            <p className="text-xs text-[#52605C]">
              Honest module-by-module classification distinguishing tested capabilities from items requiring external regulatory or Mainnet credentials.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#E8EFEA] text-[#69736F] font-semibold">
                  <th className="pb-3 pr-4">Capability / Module</th>
                  <th className="pb-3 px-4">Phase</th>
                  <th className="pb-3 px-4">Status</th>
                  <th className="pb-3 pl-4">Verification Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0F4F2]">
                {PLATFORM_IMPLEMENTATION_ASSESSMENT.map((row) => (
                  <tr key={row.module} className="align-top">
                    <td className="py-3.5 pr-4 font-bold text-[#18211F] min-w-[210px]">
                      {row.module}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[11px] text-[#52605C] whitespace-nowrap">
                      {row.phase}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {renderStatusBadge(row.status)}
                    </td>
                    <td className="py-3.5 pl-4 text-[#52605C] leading-relaxed">{row.summary}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* 7. Investor Protection & Contact Desk */}
        <section className="bg-[#0B1B30] text-white rounded-3xl border border-[#1D3860] p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <h2 className="font-serif text-xl sm:text-2xl font-bold text-white">
              Direct Compliance, Custody &amp; Investor Relations Desk
            </h2>
            <p className="text-xs sm:text-sm text-[#D1E2F7] leading-relaxed">
              Request notarized SPV extracts, submit formal due-diligence inquiries, or verify corporate documentation directly with our Paris and Barcelona desks.
            </p>
            <div className="flex flex-wrap items-center gap-5 pt-2 text-xs text-[#BEE179] font-semibold">
              <span className="inline-flex items-center gap-1.5">
                <Mail className="w-4 h-4" />
                {COMPANY_REGISTRATION.primaryEmail}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="w-4 h-4" />
                {COMPANY_REGISTRATION.barcelonaOffice}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onNavigate('/contact')}
            className="px-5 py-3 rounded-xl bg-[#BEE179] hover:bg-[#AEDB5B] text-[#0B1B30] text-xs font-bold inline-flex items-center gap-2 shrink-0 cursor-pointer"
          >
            <span>Submit Compliance Inquiry</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </section>
      </div>
    </div>
  );
};
