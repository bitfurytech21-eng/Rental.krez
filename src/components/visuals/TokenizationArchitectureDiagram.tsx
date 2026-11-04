import React, { useState } from 'react';
import { Building2, ShieldCheck, FileCheck, Wallet, ArrowRight, Lock, CheckCircle2 } from 'lucide-react';

interface DiagramNode {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  icon: React.ElementType;
  badge: string;
  color: string;
}

const NODES: DiagramNode[] = [
  {
    id: 'node-1',
    title: '1. Physical Property Deed',
    subtitle: 'Official Land Registry Title',
    description: 'Underwritten European luxury residential asset title notarized and recorded in the official national property registry.',
    icon: Building2,
    badge: 'Notarized Title',
    color: '#087F5B',
  },
  {
    id: 'node-2',
    title: '2. Dedicated SPV Entity',
    subtitle: 'Ring-Fenced Corporate Custody',
    description: 'Dedicated Special Purpose Vehicle holding sole property ownership without cross-collateralization liabilities across offerings.',
    icon: ShieldCheck,
    badge: '100% Ring-Fenced',
    color: '#2563EB',
  },
  {
    id: 'node-3',
    title: '3. Solana Token Standards',
    subtitle: 'SPL & Token-2022 Compliance',
    description: 'Fractional SPV interests mapped onto Solana SPL (TokenkegQfe...) and Token-2022 (TokenzQdBNb...) compliance extensions with KYC allowlisting.',
    icon: Lock,
    badge: 'Solana Mainnet Standards',
    color: '#D97706',
  },
  {
    id: 'node-4',
    title: '4. Investor Settlement & Yield',
    subtitle: 'USDC & EUR SEPA Rails',
    description: 'Verified holders subscribe and receive pro-rata monthly net rental cashflows in EUR SEPA or Solana USDC (EPjFWdd5Aufq...).',
    icon: Wallet,
    badge: 'Direct Monthly Payouts',
    color: '#7C3AED',
  },
];

export const TokenizationArchitectureDiagram: React.FC<{ className?: string }> = ({ className = '' }) => {
  const [activeNodeId, setActiveNodeId] = useState<string>('node-1');

  const activeNode = NODES.find((n) => n.id === activeNodeId) || NODES[0];

  return (
    <div className={`bg-gradient-to-br from-[#0B1B30] via-[#0F233D] to-[#102442] text-white border border-[#1D3860] rounded-3xl p-6 sm:p-8 shadow-xl ${className}`}>
      {/* Title */}
      <div className="max-w-2xl mb-6">
        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#BEE179] bg-[#102442] border border-[#1D3860] px-3 py-1 rounded-full uppercase tracking-wider mb-2">
          <FileCheck className="w-3.5 h-3.5 text-[#BEE179]" /> Regulatory & Technical Architecture
        </span>
        <h3 className="text-xl sm:text-2xl font-black text-white">
          How Physical Real Estate is Tokenized
        </h3>
        <p className="text-xs sm:text-sm text-[#8EA7C7] mt-1 leading-relaxed">
          Click any step in the architectural pipeline to inspect how legal ownership and smart contract escrow protect your capital.
        </p>
      </div>

      {/* Interactive Diagram Pipeline Nodes */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
        {NODES.map((node, idx) => {
          const Icon = node.icon;
          const isActive = activeNodeId === node.id;

          return (
            <div
              key={node.id}
              onClick={() => setActiveNodeId(node.id)}
              className={`relative p-4 rounded-2xl border transition-all cursor-pointer ${
                isActive
                  ? 'bg-[#102442] border-[#BEE179] shadow-lg scale-102 ring-2 ring-[#BEE179]/30'
                  : 'bg-[#0B1B30]/80 border-[#1D3860] hover:border-[#8EA7C7]/50 hover:bg-[#102442]/60'
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold"
                  style={{ backgroundColor: node.color }}
                >
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-white/10 text-[#D1E2F7] border border-white/15">
                  Step 0{idx + 1}
                </span>
              </div>

              <h4 className="text-xs sm:text-sm font-bold text-white mb-0.5">{node.title}</h4>
              <span className="text-[10.5px] font-mono text-[#BEE179] block mb-2">{node.subtitle}</span>
              <p className="text-[11px] text-[#8EA7C7] line-clamp-2 leading-normal">{node.description}</p>
            </div>
          );
        })}
      </div>

      {/* Deep-Dive Inspection Card */}
      <div className="bg-[#0B1B30] p-5 rounded-2xl border border-[#1D3860] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#BEE179]" />
            <h5 className="text-sm font-bold text-[#BEE179]">{activeNode.title} Inspection</h5>
            <span className="text-[10px] font-bold bg-[#BEE179]/20 text-[#BEE179] border border-[#BEE179]/30 px-2 py-0.5 rounded-full">
              {activeNode.badge}
            </span>
          </div>
          <p className="text-xs text-[#D1E2F7] max-w-2xl leading-relaxed">
            {activeNode.description}
          </p>
        </div>

        <div className="shrink-0 flex items-center gap-2 text-xs font-mono text-[#8EA7C7] bg-[#102442] px-3.5 py-2 rounded-xl border border-[#1D3860]">
          <span>Enforceable across all 27 EU Member States</span>
        </div>
      </div>
    </div>
  );
};
