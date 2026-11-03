import React from 'react';
import {
  ShieldCheck,
  Building2,
  FileText,
  ArrowRight,
  CheckCircle2,
  Clock,
  Lock,
  ExternalLink,
  Check,
  Copy,
} from 'lucide-react';
import { COMPANY_REGISTRATION, SOLANA_INFRASTRUCTURE_REGISTRY } from '../../data/institutionalConfig';

interface CorporateRegistryTrustCardProps {
  onNavigate?: (path: string) => void;
  className?: string;
}

export const CorporateRegistryTrustCard: React.FC<CorporateRegistryTrustCardProps> = ({
  onNavigate,
  className = '',
}) => {
  return (
    <div className={`space-y-6 ${className}`}>
      {/* Section Header */}
      <div className="space-y-2 text-left">
        <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#27845D]">
          Corporate Registry &amp; Legal Transparency
        </p>
        <h2 className="font-serif text-2xl sm:text-4xl font-bold text-[#18211F] tracking-tight">
          Institutional Trust Centre &amp; 12-Document Legal Vault
        </h2>
        <p className="text-xs sm:text-sm text-[#52605C] max-w-3xl leading-relaxed">
          Inspect our French commercial registry identifiers, notarized SPV ring-fencing framework, Solana Mainnet verification statuses, and complete investor documentation before committing capital.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-3 pt-2">
          <button
            type="button"
            onClick={() => onNavigate?.('/legal')}
            className="px-4 py-2.5 rounded-full border border-[#DCE5E2] bg-white hover:bg-[#F4F7F5] text-[#18211F] text-xs font-bold inline-flex items-center gap-2 transition-colors cursor-pointer shadow-2xs"
          >
            <FileText className="w-4 h-4 text-[#27845D]" />
            <span>Legal Documentation (12)</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigate?.('/trust')}
            className="px-5 py-2.5 rounded-full bg-[#1C312E] hover:bg-[#274440] text-white text-xs font-bold inline-flex items-center gap-2 transition-colors cursor-pointer shadow-2xs"
          >
            <CheckCircle2 className="w-4 h-4 text-[#BEE179]" />
            <span>Explore Full Trust Centre</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Corporate Registration Data Card (Image 2 design) */}
      <div className="p-6 sm:p-7 rounded-3xl bg-white border border-[#DCE5E2] shadow-2xs space-y-6 text-left">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-[#1C312E] text-[#BEE179] shrink-0">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-[#18211F] text-base sm:text-lg">
              Corporate Registration Data
            </h3>
            <p className="text-xs text-[#69736F]">
              Paris Commercial Registry · Supplied Reference Record
            </p>
          </div>
        </div>

        {/* Data Table */}
        <div className="divide-y divide-[#E8EFEA] border-t border-b border-[#E8EFEA] text-xs">
          <div className="py-3 flex items-center justify-between gap-4">
            <span className="font-medium text-[#69736F] uppercase tracking-wider text-[11px]">SIREN</span>
            <span className="font-mono font-bold text-[#18211F] text-xs sm:text-sm">{COMPANY_REGISTRATION.siren}</span>
          </div>
          <div className="py-3 flex items-center justify-between gap-4">
            <span className="font-medium text-[#69736F] uppercase tracking-wider text-[11px]">RCS Registration</span>
            <span className="font-mono font-bold text-[#18211F] text-xs sm:text-sm">{COMPANY_REGISTRATION.rcs}</span>
          </div>
          <div className="py-3 flex items-center justify-between gap-4">
            <span className="font-medium text-[#69736F] uppercase tracking-wider text-[11px]">SIRET</span>
            <span className="font-mono font-bold text-[#18211F] text-xs sm:text-sm">{COMPANY_REGISTRATION.siret}</span>
          </div>
          <div className="py-3 flex items-center justify-between gap-4">
            <span className="font-medium text-[#69736F] uppercase tracking-wider text-[11px]">EU VAT Number</span>
            <span className="font-mono font-bold text-[#18211F] text-xs sm:text-sm">{COMPANY_REGISTRATION.vatIdentificationNumber}</span>
          </div>
          <div className="py-3 flex items-center justify-between gap-4">
            <span className="font-medium text-[#69736F] uppercase tracking-wider text-[11px]">Stated Legal Form</span>
            <span className="font-bold text-[#18211F] text-xs sm:text-sm">{COMPANY_REGISTRATION.legalForm}</span>
          </div>
        </div>

        {/* Trust Matrix Verification Standing */}
        <div className="p-4 rounded-2xl bg-[#F6F9F8] border border-[#E3ECE8] space-y-3">
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#69736F] block">
            Trust Matrix Verification Standing
          </span>
          <div className="grid grid-cols-3 gap-3">
            <div className="p-2.5 rounded-xl bg-white border border-[#DCE5E2] flex flex-col justify-between">
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-800">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Verified</span>
              </div>
              <span className="font-mono text-lg font-black text-[#18211F] mt-1">5</span>
            </div>

            <div className="p-2.5 rounded-xl bg-white border border-[#DCE5E2] flex flex-col justify-between">
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-amber-900">
                <Clock className="w-3.5 h-3.5 text-amber-600" />
                <span>Partial</span>
              </div>
              <span className="font-mono text-lg font-black text-[#18211F] mt-1">3</span>
            </div>

            <div className="p-2.5 rounded-xl bg-white border border-[#DCE5E2] flex flex-col justify-between">
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700">
                <Lock className="w-3.5 h-3.5 text-slate-500" />
                <span>External</span>
              </div>
              <span className="font-mono text-lg font-black text-[#18211F] mt-1">4</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const SolanaCapitalRiskTerminalCard: React.FC<{ className?: string }> = ({ className = '' }) => {
  const [copied, setCopied] = React.useState(false);
  const usdcMint = SOLANA_INFRASTRUCTURE_REGISTRY[0].address;

  const handleCopy = () => {
    navigator.clipboard.writeText(usdcMint);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className={`p-6 sm:p-7 rounded-3xl bg-[#181818] border border-[#2E2E2E] text-left text-white space-y-5 font-mono shadow-xl ${className}`}>
      {/* Code Block */}
      <div className="p-4 rounded-2xl bg-[#141414] border border-[#262626] text-xs space-y-1.5 text-[#D4D4D4]">
        <div><span className="font-bold text-white">SIREN:</span> {COMPANY_REGISTRATION.siren}</div>
        <div><span className="font-bold text-white">RCS:</span> {COMPANY_REGISTRATION.rcs}</div>
        <div><span className="font-bold text-white">SIRET:</span> {COMPANY_REGISTRATION.siret}</div>
        <div><span className="font-bold text-white">VAT:</span> {COMPANY_REGISTRATION.vatIdentificationNumber}</div>
        <div><span className="font-bold text-white">Form:</span> {COMPANY_REGISTRATION.legalForm}</div>
      </div>

      {/* Badges & Links */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="inline-flex items-center gap-2 text-[#BEE179] font-sans font-extrabold">
          <CheckCircle2 className="w-4 h-4 text-[#BEE179]" />
          <span>EU Ring-Fenced SPV Custody · Solana Mainnet</span>
        </div>

        <div className="flex items-center gap-2">
          <a
            href={SOLANA_INFRASTRUCTURE_REGISTRY[0].explorerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-[#8BA5C9] hover:text-white transition-colors"
          >
            <span>Solana USDC Mint: {usdcMint.slice(0, 6)}...{usdcMint.slice(-4)}</span>
            <ExternalLink className="w-3.5 h-3.5 text-[#8BA5C9]" />
          </a>
          <button
            type="button"
            onClick={handleCopy}
            className="p-1 rounded hover:bg-[#262626] text-[#8BA5C9] hover:text-white cursor-pointer"
            aria-label="Copy USDC Mint address"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-[#BEE179]" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      <div className="border-t border-[#2E2E2E]" />

      {/* Capital at Risk Disclosure Paragraph (Exact text from Image 3) */}
      <p className="text-xs text-[#A1B8D8] font-sans leading-relaxed">
        <strong className="text-white">Capital at Risk Disclosure:</strong> Fractional real estate investments involve illiquidity, market valuation fluctuations, tenant vacancy, and regulatory risks. Past or projected net yields do not guarantee future distributions. Circle USDC ({usdcMint}) is utilized strictly as a payment and distribution settlement stablecoin on Solana Mainnet and does not represent equity or a property-share smart contract. Review the complete Risk Disclosure Statement and Trust Centre prior to subscribing.
      </p>
    </div>
  );
};
