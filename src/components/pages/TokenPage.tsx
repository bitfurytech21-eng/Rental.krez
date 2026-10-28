import React from 'react';
import { Coins, RefreshCw, Shield, AlertTriangle, ArrowRight, Check, Zap, ExternalLink, Key, Layers, Lock } from 'lucide-react';
import { SolanaWalletManager } from '../wallet/SolanaWalletManager';
import { INITIAL_PROPERTIES } from '../../data/properties';
import { getSolanaExplorerUrl, getSolscanUrl } from '../../lib/solanaService';
import { formatCurrency, formatPercent } from '../../lib/utils';

interface TokenPageProps {
  onExplore: () => void;
}

export const TokenPage: React.FC<TokenPageProps> = ({ onExplore }) => {
  // Show active Solana SPL property tokens
  const splProperties = INITIAL_PROPERTIES.slice(0, 6);

  return (
    <div className="bg-[#F8FAFC] min-h-screen py-12">
      <div className="container space-y-12">
        {/* Header */}
        <div className="max-w-3xl mx-auto text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-[#E3E8E3] text-xs font-semibold text-[#182D2A]">
            <Zap className="w-3.5 h-3.5 text-[#27845D]" />
            <span>Solana SPL Tokenization Architecture</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-black text-[#18211F]">
            The Kretz Solana Token Standard
          </h1>
          <p className="text-base text-[#69736F]">
            Institutional fractional real estate tokenization powered by the high-throughput, low-latency Solana blockchain with legally binding SPV debt certificates and Token-2022 transfer-hook compliance.
          </p>
        </div>

        {/* 3 Pillars */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-7 rounded-3xl border border-[#E3E8E3] shadow-sm space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-[#EEF1EC] text-[#182D2A] flex items-center justify-center">
              <Coins className="w-6 h-6 text-[#27845D]" />
            </div>
            <h3 className="text-lg font-bold text-[#18211F]">Fractional SPL Standard</h3>
            <p className="text-xs text-[#69736F] leading-relaxed">
              Every property is minted as a discrete Solana Program Library (SPL) token. 1 unit equals 1 economic share in the property's gross rental yields and terminal capital appreciation.
            </p>
          </div>

          <div className="bg-white p-7 rounded-3xl border border-[#E3E8E3] shadow-sm space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-[#EEF1EC] text-[#27845D] flex items-center justify-center">
              <Zap className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-[#18211F]">Sub-Second Settlement</h3>
            <p className="text-xs text-[#69736F] leading-relaxed">
              Deployed on Solana with 400ms block times and fractions-of-a-cent fees. On-chain dividend distributions and cryptographic signatures are transparently verifiable via Solana Explorer and Solscan.
            </p>
          </div>

          <div className="bg-white p-7 rounded-3xl border border-[#E3E8E3] shadow-sm space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-[#EEF1EC] text-[#182D2A] flex items-center justify-center">
              <Shield className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-[#18211F]">Token-2022 Compliance</h3>
            <p className="text-xs text-[#69736F] leading-relaxed">
              Tokens utilize the modern Solana Token-2022 standard with programmatic transfer-hook access control. Only KYC/AML-verified investor wallets can hold or receive property tokens.
            </p>
          </div>
        </div>

        {/* Live Solana Wallet & Portfolio Manager */}
        <div>
          <SolanaWalletManager />
        </div>

        {/* Live SPL Property Token Registry */}
        <div className="bg-white rounded-3xl border border-[#E3E8E3] p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E3E8E3]">
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#27845D] uppercase tracking-wider mb-1">
                <Layers className="w-3.5 h-3.5" />
                <span>On-Chain Asset Directory</span>
              </div>
              <h3 className="text-xl font-bold text-[#18211F]">Active Solana SPL Property Mints</h3>
              <p className="text-xs text-[#69736F]">
                Real-time registry of tokenized properties with Solana mint accounts, supply, and Explorer verification links.
              </p>
            </div>
            <button onClick={onExplore} className="btn btn-primary btn-sm text-xs font-bold shrink-0">
              Explore All Offerings <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#E3E8E3] text-[#69736F] font-semibold">
                  <th className="pb-3 pr-4">Property</th>
                  <th className="pb-3 px-4">Ticker</th>
                  <th className="pb-3 px-4">Target AUM</th>
                  <th className="pb-3 px-4">Target APY</th>
                  <th className="pb-3 px-4">Total SPL Supply</th>
                  <th className="pb-3 px-4">Mint Address</th>
                  <th className="pb-3 pl-4 text-right">Verification</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0F2EE]">
                {splProperties.map((prop) => {
                  const mint = prop.solanaMintAddress || prop.tokenContractAddress;
                  return (
                    <tr key={prop.id} className="hover:bg-[#F9FAF8] transition-colors">
                      <td className="py-3.5 pr-4 font-bold text-[#18211F] max-w-[200px] truncate">
                        {prop.title}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-[#27845D]">
                        {prop.tokenTicker}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-[#18211F]">
                        {formatCurrency(prop.targetAmount)}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-emerald-600">
                        {formatPercent(prop.estimatedAnnualYield)}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-[#52605C]">
                        {prop.totalTokens.toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-[11px] text-[#69736F]">
                        <span className="bg-[#F0F2EE] px-2 py-0.5 rounded">
                          {mint.slice(0, 6)}...{mint.slice(-6)}
                        </span>
                      </td>
                      <td className="py-3.5 pl-4 text-right">
                        <a
                          href={getSolanaExplorerUrl(mint, 'address', 'devnet')}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-[#27845D] hover:underline"
                        >
                          <span>Explorer</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Secondary Liquidity & Regulatory Limitations */}
        <div className="bg-white p-8 rounded-3xl border border-[#E3E8E3] shadow-sm space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-[#B7791F] flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-[#18211F]">Secondary Liquidity & Regulatory Limitations</h3>
              <p className="text-xs text-[#69736F]">Please read our explicit disclosure on token trading and liquidity.</p>
            </div>
          </div>

          <div className="space-y-3 text-xs text-[#69736F] leading-relaxed">
            <p>
              While Solana tokens provide significantly greater flexibility and transparency than traditional direct real estate purchases, <strong>real estate remains an inherently medium-to-long term asset class</strong>.
            </p>
            <p>
              Investors can list their tokens for sale to other verified platform users via our internal P2P bulletin board. However, Kretz does NOT guarantee immediate counterparties or fixed buyback execution times. Execution depends on buyer demand at the offered price.
            </p>
            <p>
              Additionally, in accordance with European securities regulations (CNMV / AMF / MiCA), tokens can only be transferred between KYC-verified Solana accounts in good standing. Programmatic transfer hooks reject any unauthorized on-chain transfers.
            </p>
          </div>

          <div className="pt-4 border-t border-[#E3E8E3] flex flex-wrap gap-4 items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-[#52605C]">
              <Lock className="w-4 h-4 text-[#27845D]" />
              <span>Smart Contract Access Control: Token-2022 Whitelist Hook</span>
            </div>
            <button onClick={onExplore} className="btn btn-primary btn-sm text-xs font-bold">
              Browse Available Offerings <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
