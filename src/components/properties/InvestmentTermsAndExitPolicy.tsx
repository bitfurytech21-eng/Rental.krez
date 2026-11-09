import React from 'react';
import { Property } from '../../types/property';
import { ShieldCheck, AlertTriangle, Clock, RefreshCw, Scale, Lock, Calendar, FileText } from 'lucide-react';

interface InvestmentTermsAndExitPolicyProps {
  property: Property;
}

export const InvestmentTermsAndExitPolicy: React.FC<InvestmentTermsAndExitPolicyProps> = ({ property }) => {
  const durationMonths = property.durationMonths || 21;
  const distributionFrequency = property.distributionFrequency || 'Monthly';
  const canonicalRef = property.tokenTicker || 'KTZ-P1616X';

  return (
    <div className="bg-white p-6 sm:p-8 rounded-3xl border border-[#E3E8E3] shadow-sm space-y-6">
      <div className="pb-4 border-b border-[#E3E8E3]">
        <span className="text-xs font-bold text-[#27845D] uppercase tracking-wider block mb-1">
          Correction 6 Governing Disclosures
        </span>
        <h3 className="text-xl font-black text-[#18211F]">
          Investment Terms, Exit Policy & Redemption Framework
        </h3>
        <p className="text-xs text-[#69736F] mt-0.5">
          Binding terms governing payout schedules, early exits, secondary market transfers, and SPV liquidation procedures for offering <strong>{canonicalRef}</strong>.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
        {/* Term 1: Offering Duration */}
        <div className="p-4.5 rounded-2xl bg-[#F6F7F4] border border-[#E3E8E3] space-y-1.5">
          <div className="flex items-center gap-2 font-bold text-[#18211F]">
            <Calendar className="w-4 h-4 text-[#27845D]" />
            <span>Investment Term & Scheduled Maturity</span>
          </div>
          <p className="text-[#69736F] leading-relaxed">
            The target investment duration for {canonicalRef} is <strong>{durationMonths} months</strong>. Upon reaching scheduled maturity, the SPV manager executes property refinancing or capital divestment, distributing 100% of original capital principal plus pro-rata capital appreciation gains.
          </p>
        </div>

        {/* Term 2: Distribution Frequency */}
        <div className="p-4.5 rounded-2xl bg-[#F6F7F4] border border-[#E3E8E3] space-y-1.5">
          <div className="flex items-center gap-2 font-bold text-[#18211F]">
            <Clock className="w-4 h-4 text-[#27845D]" />
            <span>Rental Income Distribution Schedule</span>
          </div>
          <p className="text-[#69736F] leading-relaxed">
            Net rental revenues are distributed on a <strong>{distributionFrequency} basis</strong> (1st business day of each month) directly to the investor's wallet balance in Euros or 1:1 pegged stablecoins after deducting property operating expenses and management retainers.
          </p>
        </div>

        {/* Term 3: Secondary Market & Liquidity Disclaimer */}
        <div className="p-4.5 rounded-2xl bg-amber-50/70 border border-amber-200 text-amber-950 space-y-1.5 md:col-span-2">
          <div className="flex items-center gap-2 font-bold text-amber-900">
            <AlertTriangle className="w-4 h-4 text-amber-700" />
            <span>Secondary Market Liquidity & Transfer Restrictions</span>
          </div>
          <p className="leading-relaxed">
            <strong>Liquidity Notice:</strong> Real estate tokens represent illiquid private SPV holdings. While Kretz facilitates periodic bulletin-board secondary matching windows, <strong>immediate redemption or token sale is NOT guaranteed</strong>. Tokens cannot be liquidated on demand prior to property sale or refinancing unless a willing eligible buyer exists.
          </p>
        </div>

        {/* Term 4: Transfer Permissioning (ERC-3643) */}
        <div className="p-4.5 rounded-2xl bg-[#F6F7F4] border border-[#E3E8E3] space-y-1.5">
          <div className="flex items-center gap-2 font-bold text-[#18211F]">
            <Lock className="w-4 h-4 text-[#27845D]" />
            <span>Smart Contract Transfer Permissioning (ERC-3643)</span>
          </div>
          <p className="text-[#69736F] leading-relaxed">
            All token transfers require smart contract permissioning under the ERC-3643 standard. Both buyer and seller must have completed mandatory KYC/AML identity verification and comply with regional investor eligibility limits.
          </p>
        </div>

        {/* Term 5: SPV Default & Asset Disposal Protocol */}
        <div className="p-4.5 rounded-2xl bg-[#F6F7F4] border border-[#E3E8E3] space-y-1.5">
          <div className="flex items-center gap-2 font-bold text-[#18211F]">
            <Scale className="w-4 h-4 text-[#27845D]" />
            <span>Underperformance & SPV Asset Disposal Protocol</span>
          </div>
          <p className="text-[#69736F] leading-relaxed">
            If rental yields fall below 50% of forecast for 6 consecutive months or refinancing cannot be secured at maturity, the SPV manager is legally obligated to initiate an orderly market sale of the property asset. Proceeds are distributed according to creditor and investor priority rules under French / Spanish SPV corporate law.
          </p>
        </div>
      </div>
    </div>
  );
};
