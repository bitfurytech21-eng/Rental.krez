import React from 'react';
import { HowItWorks } from '../home/HowItWorks';
import { ShieldCheck, FileText, ArrowRight, Wallet, CheckCircle2 } from 'lucide-react';

interface HowItWorksPageProps {
  onExplore: () => void;
  onRegister: () => void;
}

export const HowItWorksPage: React.FC<HowItWorksPageProps> = ({ onExplore, onRegister }) => {
  return (
    <div className="bg-[#F6F7F4] min-h-screen py-12">
      <div className="container space-y-12">
        {/* Header */}
        <div className="max-w-3xl mx-auto text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-[#E3E8E3] text-xs font-semibold text-[#182D2A]">
            <ShieldCheck className="w-3.5 h-3.5 text-[#27845D]" />
            <span>Regulated Participatory Model</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-black text-[#18211F]">
            Transparent Real Estate Tokenization
          </h1>
          <p className="text-base text-[#69736F] leading-relaxed">
            Understand how Kretz transforms multi-million euro real estate assets into accessible, liquid digital shares backed by real-world physical brick and mortar.
          </p>
        </div>

        {/* 6 Step Interactive Architecture */}
        <HowItWorks />

        {/* Legal & SPV Deep Dive */}
        <div className="bg-white p-8 sm:p-12 rounded-3xl border border-[#E3E8E3] shadow-sm">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
            <div className="space-y-4">
              <span className="text-xs font-bold text-[#27845D] uppercase tracking-wider block">
                The Legal Structure
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-[#18211F]">
                Dedicated Special Purpose Vehicles (SPV)
              </h2>
              <p className="text-sm text-[#69736F] leading-relaxed">
                We never pool unrelated assets into an unallocated blind pool. Each property is acquired and owned exclusively by a registered Spanish or European Special Purpose Vehicle (Sociedad Limitada / SL).
              </p>
              <ul className="space-y-2.5 text-xs text-[#18211F] pt-2">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#27845D]" />
                  <span>Ring-fenced assets: No cross-collateralization between projects</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#27845D]" />
                  <span>Independent title deed registered in the official Spanish Land Registry</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#27845D]" />
                  <span>Participatory loan contracts legally enforceable across the EU</span>
                </li>
              </ul>
            </div>

            <div className="bg-[#EEF1EC] p-6 rounded-2xl border border-[#E3E8E3] space-y-4 text-xs">
              <h4 className="text-sm font-bold text-[#182D2A]">Dividend Distribution Lifecycle</h4>
              <div className="space-y-3">
                <div className="p-3 bg-white rounded-xl border border-[#E3E8E3]">
                  <span className="font-bold text-[#18211F] block">1. Gross Rent Collection</span>
                  <span className="text-[#69736F]">Tenants pay monthly rent into the SPV segregated banking account.</span>
                </div>
                <div className="p-3 bg-white rounded-xl border border-[#E3E8E3]">
                  <span className="font-bold text-[#18211F] block">2. Expenses & Reserve Deduction</span>
                  <span className="text-[#69736F]">Property management, taxes, and maintenance reserve provisions are cleared.</span>
                </div>
                <div className="p-3 bg-white rounded-xl border border-[#E3E8E3]">
                  <span className="font-bold text-[#27845D] block">3. Automated Wallet Credit</span>
                  <span className="text-[#69736F]">Net dividends are automatically distributed to token holders on the 1st of every month.</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="bg-[#182D2A] text-white p-8 rounded-3xl text-center space-y-4">
          <h3 className="text-2xl font-bold">Ready to participate in your first property?</h3>
          <p className="text-xs text-[#A0A8A5] max-w-md mx-auto">
            Create an account or explore current investment offerings open for funding.
          </p>
          <div className="flex justify-center gap-4 pt-2">
            <button onClick={onRegister} className="btn btn-accent text-xs font-bold">
              Register Free
            </button>
            <button onClick={onExplore} className="btn btn-secondary text-xs font-semibold bg-transparent border-white/20 text-white">
              View Active Properties
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
