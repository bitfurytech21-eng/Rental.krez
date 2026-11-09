import React from 'react';
import { ShieldCheck, Lock, CheckCircle2, ArrowRight } from 'lucide-react';

interface AnimatedBankingTransferGraphicProps {
  type?: 'deposit' | 'withdrawal' | 'investment';
  amount?: number;
  currency?: string;
  className?: string;
}

export const AnimatedBankingTransferGraphic: React.FC<AnimatedBankingTransferGraphicProps> = ({
  type = 'deposit',
  amount = 15000,
  currency = 'EUR',
  className = '',
}) => {
  const formattedAmount = `${currency === 'EUR' ? '€' : '$'}${amount.toLocaleString('en-US')}`;

  return (
    <div className={`relative w-full overflow-hidden rounded-2xl border border-white/10 bg-[#0A0E17]/95 p-6 backdrop-blur-md ${className}`}>
      {/* Background ambient lighting */}
      <div className="absolute top-0 right-0 -mt-8 -mr-8 w-40 h-40 bg-[#315FEA]/10 rounded-full blur-2xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 -mb-8 -ml-8 w-40 h-40 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

      {/* Header ribbon */}
      <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-5 z-10 relative">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-[#34D399]" />
          <span className="text-xs font-mono font-medium tracking-wider text-slate-300 uppercase">
            {type === 'deposit' ? 'SEPA Instant Wire Routing' : type === 'withdrawal' ? 'Institutional Settlement' : 'SPV Asset Tokenization'}
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
          <Lock className="w-3 h-3" />
          <span>256-BIT ENCRYPTED</span>
        </div>
      </div>

      {/* Animated Flow Nodes */}
      <div className="relative z-10 grid grid-cols-3 gap-3 items-center text-center my-4">
        {/* Source Node */}
        <div className="flex flex-col items-center p-3 rounded-xl bg-white/5 border border-white/10 transition-all hover:border-white/20">
          <div className="w-9 h-9 rounded-lg bg-[#1E293B] border border-slate-700 flex items-center justify-center text-slate-200 mb-2 shadow-inner">
            <span className="font-mono text-xs font-bold">{type === 'deposit' ? 'SEPA' : 'KRETZ'}</span>
          </div>
          <span className="text-[11px] font-semibold text-slate-200">{type === 'deposit' ? 'Investor Bank' : 'Platform Wallet'}</span>
          <span className="text-[10px] text-slate-400 font-mono mt-0.5">Verified IBAN</span>
        </div>

        {/* Animated Connecting Line & Flow Particle */}
        <div className="relative flex flex-col items-center justify-center">
          <div className="w-full h-0.5 bg-gradient-to-r from-[#315FEA]/30 via-[#34D399] to-[#315FEA]/30 relative overflow-hidden my-2">
            <div className="absolute top-0 left-0 w-1/3 h-full bg-[#34D399] animate-[flowParticle_2s_linear_infinite] shadow-[0_0_8px_#34D399]" />
          </div>
          <div className="flex items-center gap-1 text-[10px] font-mono font-bold text-emerald-400 bg-[#0B132B] px-2 py-1 rounded-full border border-emerald-500/30 shadow-xs">
            <span>{formattedAmount}</span>
            <ArrowRight className="w-3 h-3 text-emerald-400 animate-pulse" />
          </div>
        </div>

        {/* Destination Node */}
        <div className="flex flex-col items-center p-3 rounded-xl bg-white/5 border border-white/10 transition-all hover:border-white/20">
          <div className="w-9 h-9 rounded-lg bg-[#1E293B] border border-emerald-500/40 flex items-center justify-center text-emerald-400 mb-2 shadow-inner">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          </div>
          <span className="text-[11px] font-semibold text-slate-200">{type === 'deposit' ? 'Kretz Escrow' : 'Bank Account'}</span>
          <span className="text-[10px] text-emerald-400/90 font-mono mt-0.5">Instant Credit</span>
        </div>
      </div>

      {/* Security Status Bar */}
      <div className="relative z-10 mt-5 pt-3 border-t border-white/10 flex items-center justify-between text-[11px] font-mono text-slate-400">
        <span className="flex items-center gap-1 text-slate-300">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block mr-1" />
          Escrow Audit Status: Clear
        </span>
        <span className="text-slate-400">Latency: &lt;1.2s</span>
      </div>
    </div>
  );
};
