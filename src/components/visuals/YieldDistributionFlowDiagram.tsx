import React from 'react';
import { Building, ShieldCheck, DollarSign, Wallet, RefreshCw } from 'lucide-react';

export const YieldDistributionFlowDiagram: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div className={`bg-[#151515] border border-[#303030] rounded-3xl p-5 sm:p-6 shadow-xl space-y-5 ${className}`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#303030]">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-[#00D2FF]/15 border border-[#00D2FF]/30 text-[#00D2FF]">
              <RefreshCw className="w-4 h-4" />
            </span>
            <h3 className="text-sm sm:text-base font-bold text-white tracking-tight">
              Automated Rental Yield Cashflow Lifecycle
            </h3>
          </div>
          <p className="text-xs text-[#999999] mt-0.5">
            How monthly tenant rental payments flow into investor dividend payouts
          </p>
        </div>

        <span className="text-[10px] font-bold font-mono text-[#2ECC71] bg-[#2ECC71]/15 border border-[#2ECC71]/30 px-3 py-1 rounded-full self-start sm:self-auto">
          1st of Every Month
        </span>
      </div>

      {/* Flow Diagram Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 relative">
        {/* Step 1 */}
        <div className="p-4 rounded-2xl bg-[#1D1D1D] border border-[#303030] space-y-2 relative hover:border-[#454545] transition-all">
          <div className="flex items-center justify-between">
            <div className="w-8 h-8 rounded-lg bg-[#00D2FF] text-black flex items-center justify-center font-bold text-xs shadow-md">
              01
            </div>
            <Building className="w-4 h-4 text-[#00D2FF]" />
          </div>
          <h4 className="text-xs font-bold text-white">Gross Rent Paid</h4>
          <p className="text-[11px] text-[#D0D0D0] leading-normal">
            Tenant transfers monthly rent directly to the dedicated SPV bank account.
          </p>
          <div className="text-[10px] font-mono font-bold text-[#00D2FF] bg-[#00D2FF]/10 p-1.5 rounded-md border border-[#00D2FF]/20">
            100% Gross Inflow
          </div>
        </div>

        {/* Step 2 */}
        <div className="p-4 rounded-2xl bg-[#1D1D1D] border border-[#303030] space-y-2 relative hover:border-[#454545] transition-all">
          <div className="flex items-center justify-between">
            <div className="w-8 h-8 rounded-lg bg-[#FF9F43] text-black flex items-center justify-center font-bold text-xs shadow-md">
              02
            </div>
            <ShieldCheck className="w-4 h-4 text-[#FF9F43]" />
          </div>
          <h4 className="text-xs font-bold text-white">Expenses Cleared</h4>
          <p className="text-[11px] text-[#D0D0D0] leading-normal">
            Property management, insurance, taxes, and 5% maintenance reserve deducted.
          </p>
          <div className="text-[10px] font-mono font-bold text-[#FF9F43] bg-[#FF9F43]/10 p-1.5 rounded-md border border-[#FF9F43]/20">
            Net Revenue Calculated
          </div>
        </div>

        {/* Step 3 */}
        <div className="p-4 rounded-2xl bg-[#1D1D1D] border border-[#303030] space-y-2 relative hover:border-[#454545] transition-all">
          <div className="flex items-center justify-between">
            <div className="w-8 h-8 rounded-lg bg-[#A66CFF] text-white flex items-center justify-center font-bold text-xs shadow-md">
              03
            </div>
            <DollarSign className="w-4 h-4 text-[#A66CFF]" />
          </div>
          <h4 className="text-xs font-bold text-white">SPV Cap-Table Snapshot</h4>
          <p className="text-[11px] text-[#D0D0D0] leading-normal">
            Net distributable income is apportioned pro-rata across verified SPV unit holders.
          </p>
          <div className="text-[10px] font-mono font-bold text-[#A66CFF] bg-[#A66CFF]/10 p-1.5 rounded-md border border-[#A66CFF]/20">
            Double-Entry Reconciliation
          </div>
        </div>

        {/* Step 4 */}
        <div className="p-4 rounded-2xl bg-[#1D1D1D] border border-[#2ECC71]/40 space-y-2 relative hover:border-[#2ECC71] transition-all shadow-md">
          <div className="flex items-center justify-between">
            <div className="w-8 h-8 rounded-lg bg-[#2ECC71] text-black flex items-center justify-center font-bold text-xs shadow-md">
              04
            </div>
            <Wallet className="w-4 h-4 text-[#2ECC71]" />
          </div>
          <h4 className="text-xs font-bold text-[#2ECC71]">USDC &amp; EUR Settlement</h4>
          <p className="text-[11px] text-[#D0D0D0] leading-normal">
            Dividends settle on the 1st business day in liquid EUR or Solana USDC (EPjFWdd5Aufq...).
          </p>
          <div className="text-[10px] font-mono font-bold text-[#2ECC71] bg-[#2ECC71]/15 p-1.5 rounded-md border border-[#2ECC71]/30">
            EUR SEPA &amp; Solana USDC
          </div>
        </div>
      </div>
    </div>
  );
};
