import React from 'react';
import { Coins, RefreshCw, Shield, AlertTriangle, ArrowRight, Check } from 'lucide-react';

interface TokenPageProps {
  onExplore: () => void;
}

export const TokenPage: React.FC<TokenPageProps> = ({ onExplore }) => {
  return (
    <div className="bg-[#F6F7F4] min-h-screen py-12">
      <div className="container space-y-12">
        {/* Header */}
        <div className="max-w-3xl mx-auto text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-[#E3E8E3] text-xs font-semibold text-[#182D2A]">
            <Coins className="w-3.5 h-3.5 text-[#27845D]" />
            <span>Digital Real Estate Shares</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-black text-[#18211F]">
            The Kretz Token Model
          </h1>
          <p className="text-base text-[#69736F]">
            Combining real estate security with public blockchain efficiency, automated rent routing, and peer-to-peer liquidity.
          </p>
        </div>

        {/* 3 Pillars */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-7 rounded-3xl border border-[#E3E8E3] shadow-sm space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-[#EEF1EC] text-[#182D2A] flex items-center justify-center">
              <Coins className="w-6 h-6 text-[#27845D]" />
            </div>
            <h3 className="text-lg font-bold text-[#18211F]">Fractional Unit Standard</h3>
            <p className="text-xs text-[#69736F] leading-relaxed">
              Every property is split into discrete digital units. 1 token = 1 share of participatory economic rights to the property’s rental yield and terminal sale proceeds.
            </p>
          </div>

          <div className="bg-white p-7 rounded-3xl border border-[#E3E8E3] shadow-sm space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-[#EEF1EC] text-[#27845D] flex items-center justify-center">
              <RefreshCw className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-[#18211F]">Polygon POS Ledger</h3>
            <p className="text-xs text-[#69736F] leading-relaxed">
              Tokens are deployed on the high-speed, eco-friendly Polygon network. All distributions, certificate issuance, and ownership transfers are verifiable transparently on-chain.
            </p>
          </div>

          <div className="bg-white p-7 rounded-3xl border border-[#E3E8E3] shadow-sm space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-[#EEF1EC] text-[#182D2A] flex items-center justify-center">
              <Shield className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-[#18211F]">Legal Binding Deed</h3>
            <p className="text-xs text-[#69736F] leading-relaxed">
              Tokens are not speculative meme coins. They represent legally registered participatory debt securities tied to a specific SPV, filed with regulatory compliance.
            </p>
          </div>
        </div>

        {/* Liquidity Limitations & Secondary Trading Notice */}
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
              While tokens provide significantly greater flexibility than traditional direct real estate purchases, <strong>real estate remains an inherently medium-to-long term asset class</strong>.
            </p>
            <p>
              Investors can list their tokens for sale to other verified platform users via our internal P2P bulletin board. However, Kretz does NOT guarantee immediate counterparties or fixed buyback execution times. Execution depends on buyer demand at the offered price.
            </p>
            <p>
              Additionally, in accordance with European securities regulations, tokens can only be transferred between KYC-verified accounts in good standing. Transferring tokens to unverified external wallets will block dividend distribution routing until verification is completed.
            </p>
          </div>

          <div className="pt-4 border-t border-[#E3E8E3]">
            <button onClick={onExplore} className="btn btn-primary btn-sm text-xs font-bold">
              Browse Available Offerings <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
