import React from 'react';
import { HowItWorks } from '../home/HowItWorks';
import { ShieldCheck, FileText, ArrowRight, Wallet, CheckCircle2 } from 'lucide-react';

interface HowItWorksPageProps {
  onExplore: () => void;
  onRegister: () => void;
}

export const HowItWorksPage: React.FC<HowItWorksPageProps> = ({ onExplore, onRegister }) => {
  return (
    <div className="bg-[#0B1B30] text-white min-h-screen py-12">
      <div className="container space-y-12">
        {/* Header */}
        <div className="max-w-3xl mx-auto text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#102442] border border-[#1D3860] text-xs font-bold text-[#BEE179]">
            <ShieldCheck className="w-4 h-4 text-[#BEE179]" />
            <span>Regulated Participatory Model</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-black text-[#BEE179]">
            Transparent Real Estate Tokenization
          </h1>
          <p className="text-base text-[#D1E2F7] leading-relaxed font-normal">
            Understand how Kretz transforms multi-million euro real estate assets into accessible, liquid digital shares backed by real-world physical brick and mortar.
          </p>
        </div>

        {/* 6 Step Interactive Architecture */}
        <HowItWorks />

        {/* Legal & SPV Deep Dive */}
        <div className="bg-[#102442] p-8 sm:p-12 rounded-3xl border border-[#1D3860] shadow-xl text-left">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
            <div className="space-y-4">
              <span className="text-xs font-bold text-[#BEE179] uppercase tracking-wider block">
                The Legal Structure
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-white">
                Dedicated Special Purpose Vehicles (SPV)
              </h2>
              <p className="text-sm text-[#D1E2F7] leading-relaxed">
                We never pool unrelated assets into an unallocated blind pool. Each property is acquired and owned exclusively by a registered Spanish or European Special Purpose Vehicle (Sociedad Limitada / SL).
              </p>
              <ul className="space-y-2.5 text-xs text-[#D1E2F7] pt-2">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#BEE179]" />
                  <span>Ring-fenced assets: No cross-collateralization between projects</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#BEE179]" />
                  <span>Independent title deed registered in the official Spanish Land Registry</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#BEE179]" />
                  <span>Participatory loan contracts legally enforceable across the EU</span>
                </li>
              </ul>
            </div>

            <div className="bg-[#0B1B30] p-6 rounded-2xl border border-[#1D3860] space-y-4 text-xs">
              <h4 className="text-sm font-bold text-[#BEE179]">Dividend Distribution Lifecycle</h4>
              <div className="space-y-3">
                <div className="p-3 bg-[#102442] rounded-xl border border-[#1D3860]">
                  <span className="font-bold text-white block">1. Gross Rent Collection</span>
                  <span className="text-[#8EA7C7]">Tenants pay monthly rent into the SPV segregated banking account.</span>
                </div>
                <div className="p-3 bg-[#102442] rounded-xl border border-[#1D3860]">
                  <span className="font-bold text-white block">2. Expenses & Reserve Deduction</span>
                  <span className="text-[#8EA7C7]">Property management, taxes, and maintenance reserve provisions are cleared.</span>
                </div>
                <div className="p-3 bg-[#102442] rounded-xl border border-[#1D3860]">
                  <span className="font-bold text-[#BEE179] block">3. Automated Wallet Credit</span>
                  <span className="text-[#8EA7C7]">Net dividends are automatically distributed to token holders on the 1st of every month.</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="bg-[#102442] text-white p-8 sm:p-12 rounded-3xl border border-[#1D3860] text-center space-y-4 shadow-xl">
          <h3 className="text-2xl font-black text-[#BEE179]">Ready to participate in your first property?</h3>
          <p className="text-xs text-[#8EA7C7] max-w-md mx-auto">
            Create an account or explore current investment offerings open for funding.
          </p>
          <div className="flex justify-center gap-4 pt-2">
            <button onClick={onRegister} className="bg-[#BEE179] hover:bg-[#aed860] text-[#0B1B30] px-6 py-3 rounded-xl font-black text-xs transition-all shadow-md cursor-pointer">
              Register Free
            </button>
            <button onClick={onExplore} className="bg-[#0B1B30] hover:bg-[#132745] text-white border border-[#1D3860] px-6 py-3 rounded-xl font-bold text-xs cursor-pointer">
              View Active Properties
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
