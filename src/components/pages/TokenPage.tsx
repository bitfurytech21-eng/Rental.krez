import React, { useState } from 'react';
import {
  Coins,
  Shield,
  AlertTriangle,
  ArrowRight,
  Zap,
  ExternalLink,
  Layers,
  Lock,
  Copy,
  Check,
  CheckCircle2,
  RefreshCw,
  Info,
} from 'lucide-react';
import { SolanaWalletManager } from '../wallet/SolanaWalletManager';
import { ledger } from '../../lib/ledger';
import {
  SOLANA_INFRASTRUCTURE_REGISTRY,
} from '../../data/institutionalConfig';
import {
  SolanaAccountVerificationResult,
  verifyInfrastructureAccountsOnMainnet,
} from '../../lib/solanaService';
import { formatCurrency, formatPercent } from '../../lib/utils';

interface TokenPageProps {
  onExplore: () => void;
  onNavigateTrust?: () => void;
}

export const TokenPage: React.FC<TokenPageProps> = ({ onExplore, onNavigateTrust }) => {
  const activeProperties = ledger.getFrontendProperties().slice(0, 6);
  const [copiedAddr, setCopiedAddr] = useState<string | null>(null);
  const [isVerifyingRpc, setIsVerifyingRpc] = useState(false);
  const [rpcResults, setRpcResults] = useState<Record<string, SolanaAccountVerificationResult> | null>(null);
  const [rpcError, setRpcError] = useState<string | null>(null);

  const handleCopy = (address: string) => {
    navigator.clipboard.writeText(address);
    setCopiedAddr(address);
    setTimeout(() => setCopiedAddr(null), 2000);
  };

  const handleLiveVerify = async () => {
    setIsVerifyingRpc(true);
    setRpcError(null);
    try {
      const res = await verifyInfrastructureAccountsOnMainnet();
      setRpcResults(res);
    } catch (err: any) {
      setRpcError(err?.message || 'Unable to query Solana Mainnet RPC at this moment.');
    } finally {
      setIsVerifyingRpc(false);
    }
  };

  return (
    <div className="bg-[#F8FAFC] min-h-screen py-12">
      <div className="container max-w-[1240px] mx-auto px-4 sm:px-6 space-y-12">
        {/* Header */}
        <div className="max-w-3xl mx-auto text-center space-y-4">
          <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#1E3A34]">
            Solana Blockchain Infrastructure · Mainnet Reference Architecture
          </p>
          <h1 className="font-serif text-3xl sm:text-5xl font-black text-[#18211F] tracking-tight">
            Tokenisation &amp; Settlement Architecture
          </h1>
          <p className="text-sm sm:text-base text-[#52605C] leading-relaxed">
            Built around verified Solana Mainnet programs—combining Circle USDC settlement, the canonical Solana SPL Token standard, and Token-2022 compliance extensions with ring-fenced European SPV legal custody.
          </p>
        </div>

        {/* 1. Verified Solana Mainnet Infrastructure Registry */}
        <div className="bg-[#0B1B30] text-white rounded-3xl border border-[#1D3860] p-6 sm:p-8 shadow-lg space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-[#1D3860]">
            <div className="space-y-1 text-left">
              <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#BEE179]">
                Canonical Mainnet-Beta Programs &amp; Settlement Mint
              </p>
              <h2 className="font-serif text-2xl sm:text-3xl font-bold text-white">
                Verified Solana Infrastructure Addresses
              </h2>
              <p className="text-xs sm:text-sm text-[#8EA7C7]">
                Inspect every official Solana program and stablecoin mint directly on Solana Explorer or run a live Mainnet JSON-RPC check.
              </p>
            </div>

            <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
              <button
                type="button"
                onClick={handleLiveVerify}
                disabled={isVerifyingRpc}
                className="px-4 py-2.5 rounded-xl bg-[#BEE179] hover:bg-[#AEDB5B] text-[#0B1B30] text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-60"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isVerifyingRpc ? 'animate-spin' : ''}`} />
                <span>{isVerifyingRpc ? 'Querying Mainnet RPC...' : 'Verify Live on Mainnet RPC'}</span>
              </button>
              {onNavigateTrust && (
                <button
                  type="button"
                  onClick={onNavigateTrust}
                  className="px-4 py-2.5 rounded-xl bg-[#102442] hover:bg-[#163058] border border-[#1D3860] text-white text-xs font-semibold transition-colors cursor-pointer"
                >
                  Open Trust Centre
                </button>
              )}
            </div>
          </div>

          {rpcError && (
            <div className="p-3 rounded-xl bg-amber-950/50 border border-amber-700/60 text-xs text-amber-200">
              {rpcError}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 text-left">
            {SOLANA_INFRASTRUCTURE_REGISTRY.map((item, idx) => {
              const liveCheck = rpcResults?.[item.address];
              return (
                <div
                  key={item.id}
                  className="bg-[#102442] rounded-2xl border border-[#1D3860] p-5 flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-xs font-bold text-[#BEE179]">
                        0{idx + 1} · {item.category}
                      </span>
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-700/50">
                        <CheckCircle2 className="w-3 h-3" /> Mainnet Verified
                      </span>
                    </div>

                    <h3 className="font-serif text-lg font-bold text-white leading-snug">
                      {item.name}
                    </h3>

                    <div className="p-2.5 rounded-xl bg-[#0B1B30] border border-[#1D3860] flex items-center justify-between gap-2 font-mono text-[11px]">
                      <span className="truncate text-[#D1E2F7]" title={item.address}>
                        {item.address}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopy(item.address)}
                        className="p-1.5 rounded-lg hover:bg-[#163058] text-[#8EA7C7] hover:text-white transition-colors shrink-0 cursor-pointer"
                        aria-label={`Copy ${item.shortLabel} address`}
                        title="Copy full Base58 address"
                      >
                        {copiedAddr === item.address ? (
                          <Check className="w-3.5 h-3.5 text-[#BEE179]" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>

                    <ul className="space-y-1.5 text-xs text-[#D1E2F7]">
                      {item.statedPurposes.map((purpose) => (
                        <li key={purpose} className="flex items-start gap-2">
                          <span className="text-[#BEE179] font-bold mt-0.5">·</span>
                          <span>{purpose}</span>
                        </li>
                      ))}
                    </ul>

                    <div className="p-2.5 rounded-xl bg-[#0B1B30]/80 border border-[#1D3860] text-[11px] text-[#8EA7C7] leading-relaxed">
                      {item.architecturalNotice}
                    </div>

                    {liveCheck && (
                      <div className="p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-800/60 font-mono text-[10.5px] text-emerald-200 space-y-0.5">
                        <div className="font-bold text-emerald-300">
                          RPC Confirmed: {liveCheck.exists ? 'Account Live on Mainnet' : 'Not Found'}
                        </div>
                        <div>Executable Program: {liveCheck.executable ? 'Yes' : 'No (Mint Account)'}</div>
                        <div className="truncate">Owner: {liveCheck.owner || 'N/A'}</div>
                      </div>
                    )}
                  </div>

                  <div className="pt-3 border-t border-[#1D3860] flex items-center justify-between gap-2 text-xs">
                    <a
                      href={item.explorerUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 font-bold text-[#BEE179] hover:underline"
                    >
                      <span>Solana Explorer</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                    <a
                      href={item.solscanUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 font-semibold text-[#8EA7C7] hover:text-white"
                    >
                      <span>Solscan</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 2. Architectural Clarification Banner */}
        <div className="bg-white rounded-2xl border border-[#DCE5E2] p-5 sm:p-6 flex items-start gap-3.5 text-left shadow-2xs">
          <div className="w-10 h-10 rounded-xl bg-[#EAF4F0] text-[#1E3A34] flex items-center justify-center shrink-0">
            <Info className="w-5 h-5" />
          </div>
          <div className="space-y-1 text-xs sm:text-sm text-[#4A5854] leading-relaxed">
            <h3 className="font-bold text-[#18211F] text-sm sm:text-base">
              Distinction Between Settlement USDC Mint &amp; Per-Property SPV Share Tokens
            </h3>
            <p>
              The USDC Mint (<code className="font-mono text-xs bg-slate-100 px-1.5 py-0.5 rounded">EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v</code>) is Circle&apos;s canonical stablecoin mint used for subscription funding and monthly rental distribution settlement. It is <strong>not</strong> a property-share token or rental distribution smart contract. Individual property economic shares are tracked per SPV in our double-entry custody ledger and structured for dedicated Token-2022 issuance upon notarial SPV closing and smart-contract audit completion.
            </p>
          </div>
        </div>

        {/* 3. Three Core Pillars */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
          <div className="bg-white p-7 rounded-2xl border border-[#E3E8E3] shadow-2xs space-y-3">
            <div className="w-11 h-11 rounded-xl bg-[#EEF1EC] text-[#182D2A] flex items-center justify-center">
              <Coins className="w-5 h-5 text-[#27845D]" />
            </div>
            <h3 className="font-serif text-lg font-bold text-[#18211F]">1 Property = 1 Ring-Fenced SPV</h3>
            <p className="text-xs sm:text-sm text-[#52605C] leading-relaxed">
              Every property offering is isolated inside a dedicated European Special Purpose Vehicle. Unit allocations map pro-rata to net rental income and exit proceeds.
            </p>
          </div>

          <div className="bg-white p-7 rounded-2xl border border-[#E3E8E3] shadow-2xs space-y-3">
            <div className="w-11 h-11 rounded-xl bg-[#EEF1EC] text-[#27845D] flex items-center justify-center">
              <Zap className="w-5 h-5" />
            </div>
            <h3 className="font-serif text-lg font-bold text-[#18211F]">USDC &amp; EUR Settlement Rails</h3>
            <p className="text-xs sm:text-sm text-[#52605C] leading-relaxed">
              Designed for frictionless SEPA EUR wire transfers alongside sub-second Solana USDC stablecoin settlement with transparent ledger reconciliation.
            </p>
          </div>

          <div className="bg-white p-7 rounded-2xl border border-[#E3E8E3] shadow-2xs space-y-3">
            <div className="w-11 h-11 rounded-xl bg-[#EEF1EC] text-[#182D2A] flex items-center justify-center">
              <Shield className="w-5 h-5" />
            </div>
            <h3 className="font-serif text-lg font-bold text-[#18211F]">Token-2022 Compliance Hooks</h3>
            <p className="text-xs sm:text-sm text-[#52605C] leading-relaxed">
              Solana Token-2022 extensions enable programmatic allowlists, transfer hooks, and freeze safeguards so regulated property tokens remain restricted to KYC-verified holders.
            </p>
          </div>
        </div>

        {/* 4. Live Non-Custodial Solana Wallet Gateway */}
        <SolanaWalletManager />

        {/* 5. Active Platform Property SPV Schedule (Honestly Labeled) */}
        <div className="bg-white rounded-3xl border border-[#E3E8E3] p-6 sm:p-8 shadow-2xs space-y-6 text-left">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E3E8E3]">
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#27845D] uppercase tracking-wider mb-1">
                <Layers className="w-3.5 h-3.5" />
                <span>SPV Offering Tokenisation Schedule</span>
              </div>
              <h3 className="font-serif text-xl sm:text-2xl font-bold text-[#18211F]">
                Catalog SPV Unit Registry &amp; On-Chain Deployment Status
              </h3>
              <p className="text-xs text-[#69736F] mt-0.5">
                Current property offerings are active on the double-entry custody ledger while bespoke per-SPV Token-2022 Mainnet mint deployment awaits final notarial &amp; audit sign-off.
              </p>
            </div>
            <button
              type="button"
              onClick={onExplore}
              className="px-4 py-2.5 rounded-xl bg-[#182D2A] hover:bg-[#24423C] text-white text-xs font-bold inline-flex items-center gap-1.5 shrink-0 cursor-pointer"
            >
              <span>Explore Marketplace</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#E3E8E3] text-[#69736F] font-semibold">
                  <th className="pb-3 pr-4">Property Offering</th>
                  <th className="pb-3 px-4">SPV Ticker</th>
                  <th className="pb-3 px-4 text-right">Target Capital</th>
                  <th className="pb-3 px-4 text-right">Proj. Net Yield</th>
                  <th className="pb-3 px-4 text-right">Unit Supply</th>
                  <th className="pb-3 pl-4 text-right">Custody &amp; Mint Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0F2EE]">
                {activeProperties.map((prop) => (
                  <tr key={prop.id} className="hover:bg-[#F9FAF8] transition-colors">
                    <td className="py-3.5 pr-4 font-bold text-[#18211F] max-w-[230px] truncate">
                      {prop.title}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-[#1E3A34]">
                      {prop.tokenTicker}
                    </td>
                    <td className="py-3.5 px-4 font-mono tabular-nums text-right font-semibold text-[#18211F]">
                      {formatCurrency(prop.targetAmount)}
                    </td>
                    <td className="py-3.5 px-4 font-mono tabular-nums text-right font-bold text-emerald-700">
                      {formatPercent(prop.estimatedAnnualYield)}
                    </td>
                    <td className="py-3.5 px-4 font-mono tabular-nums text-right text-[#52605C]">
                      {prop.totalTokens.toLocaleString()}
                    </td>
                    <td className="py-3.5 pl-4 text-right">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded bg-amber-50 text-amber-900 border border-amber-200 font-semibold text-[11px]">
                        SPV Ledger Active · Mainnet Mint Pending
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 6. Secondary Liquidity & Regulatory Limitations */}
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-[#E3E8E3] shadow-2xs space-y-5 text-left">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-[#B7791F] border border-amber-200 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif text-xl font-bold text-[#18211F]">
                Secondary Liquidity &amp; Transfer-Restriction Disclosure
              </h3>
              <p className="text-xs text-[#69736F]">
                Mandatory statutory risk disclosure regarding real estate token liquidity and allowlisting.
              </p>
            </div>
          </div>

          <div className="space-y-3 text-xs sm:text-sm text-[#52605C] leading-relaxed">
            <p>
              While Solana infrastructure provides transparent settlement and programmable ownership records,{' '}
              <strong>real estate remains a medium-to-long-term illiquid asset class</strong>.
            </p>
            <p>
              Peer-to-peer secondary transfers are restricted exclusively to KYC/AML-verified platform investors in good standing. Neither the platform operator nor any property SPV guarantees immediate secondary buyer demand or early redemption prior to property sale.
            </p>
          </div>

          <div className="pt-4 border-t border-[#E3E8E3] flex flex-wrap gap-4 items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-[#52605C] font-mono">
              <Lock className="w-4 h-4 text-[#27845D]" />
              <span>Target Compliance Program: TokenzQdBNbLqP5VEhdKAS6EPFLC1PHnBqCXEPpxuEb</span>
            </div>
            <button
              type="button"
              onClick={onExplore}
              className="px-4 py-2 rounded-xl bg-[#182D2A] hover:bg-[#24423C] text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
            >
              <span>Browse Available Offerings</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
