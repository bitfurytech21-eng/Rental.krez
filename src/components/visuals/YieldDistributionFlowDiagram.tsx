import React from 'react';
import { ArrowRight, DollarSign, Building, ShieldCheck, Wallet, RefreshCw } from 'lucide-react';

export const YieldDistributionFlowDiagram: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div className={`bg-white dark:bg-[#0D1522] border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-sm space-y-5 ${className}`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400">
              <RefreshCw className="w-4 h-4" />
            </span>
            <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100">
              Automated Rental Yield Cashflow Lifecycle
            </h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            How monthly tenant rental payments flow into investor dividend payouts
          </p>
        </div>

        <span className="text-[10px] font-bold font-mono text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 px-2.5 py-1 rounded-full self-start sm:self-auto">
          1st of Every Month
        </span>
      </div>

      {/* Flow Diagram Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 relative">
        {/* Step 1 */}
        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-2 relative">
          <div className="flex items-center justify-between">
            <div className="w-8 h-8 rounded-lg bg-blue-500 text-white flex items-center justify-center font-bold text-xs">
              01
            </div>
            <Building className="w-4 h-4 text-blue-500" />
          </div>
          <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">Gross Rent Paid</h4>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal">
            Tenant transfers monthly rent directly to the dedicated SPV bank account.
          </p>
          <div className="text-[10px] font-mono font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 p-1 rounded-md">
            100% Gross Inflow
          </div>
        </div>

        {/* Step 2 */}
        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-2 relative">
          <div className="flex items-center justify-between">
            <div className="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center font-bold text-xs">
              02
            </div>
            <ShieldCheck className="w-4 h-4 text-amber-500" />
          </div>
          <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">Expenses Cleared</h4>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal">
            Property management, insurance, taxes, and 5% maintenance reserve deducted.
          </p>
          <div className="text-[10px] font-mono font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 p-1 rounded-md">
            Net Revenue Calculated
          </div>
        </div>

        {/* Step 3 */}
        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-2 relative">
          <div className="flex items-center justify-between">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-xs">
              03
            </div>
            <DollarSign className="w-4 h-4 text-emerald-600" />
          </div>
          <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">Escrow Contract</h4>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal">
            Funds deposited into audited smart contract matching investor token proportions.
          </p>
          <div className="text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 p-1 rounded-md">
            On-Chain Ledger Audit
          </div>
        </div>

        {/* Step 4 */}
        <div className="p-3.5 rounded-2xl bg-emerald-500/10 dark:bg-emerald-950/30 border border-emerald-500/30 space-y-2 relative">
          <div className="flex items-center justify-between">
            <div className="w-8 h-8 rounded-lg bg-emerald-500 text-white flex items-center justify-center font-bold text-xs">
              04
            </div>
            <Wallet className="w-4 h-4 text-emerald-500" />
          </div>
          <h4 className="text-xs font-bold text-emerald-700 dark:text-emerald-300">Wallet Distribution</h4>
          <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-normal">
            Dividends instantly credited to investor wallet balance on the 1st of each month.
          </p>
          <div className="text-[10px] font-mono font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/60 p-1 rounded-md">
            Liquid EUR Balance
          </div>
        </div>
      </div>
    </div>
  );
};
