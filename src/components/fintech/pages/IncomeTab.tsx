import React, { useMemo } from 'react';
import {
  TrendingUp, Download, Calendar, DollarSign, FileSpreadsheet,
  CheckCircle2, ArrowUpRight, ShieldCheck, Info
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from 'recharts';
import { Investment } from '../../../types/investment';
import { formatCurrency } from '../../../lib/utils';
import { useToast } from '../../../context/ToastContext';

interface IncomeTabProps {
  investments: Investment[];
}

export const IncomeTab: React.FC<IncomeTabProps> = ({ investments }) => {
  const toast = useToast();

  const monthlyBarData = useMemo(() => [
    { month: 'May 25', actual: 640, projected: 640 },
    { month: 'Jun 25', actual: 680, projected: 680 },
    { month: 'Jul 25', actual: 720, projected: 720 },
    { month: 'Aug 25', actual: 750, projected: 750 },
    { month: 'Sep 25', actual: 790, projected: 790 },
    { month: 'Oct 25', actual: 830, projected: 830 },
    { month: 'Nov 25', actual: 860, projected: 860 },
    { month: 'Dec 25', actual: 910, projected: 910 },
    { month: 'Jan 26', actual: 920, projected: 920 },
    { month: 'Feb 26', actual: 950, projected: 950 },
    { month: 'Mar 26', actual: 964, projected: 964 },
    { month: 'Apr 26 (Est)', actual: 0, projected: 1040 },
  ], []);

  const payoutHistory = useMemo(() => [
    {
      id: 'po-01',
      property: 'NEUILLY-SUR-SEINE - Boulevard d\'Argenson Mansion',
      period: 'March 2026',
      yieldRate: 8.5,
      netPaid: 412.50,
      method: 'USDC Auto-Deposit',
      date: '2026-03-01',
      status: 'Settled',
    },
    {
      id: 'po-02',
      property: 'SAINT-TROPEZ - Les Parcs Private Estate & Vineyard',
      period: 'March 2026',
      yieldRate: 9.2,
      netPaid: 551.70,
      method: 'SEPA Bank Wire',
      date: '2026-03-01',
      status: 'Settled',
    },
    {
      id: 'po-03',
      property: 'NEUILLY-SUR-SEINE - Boulevard d\'Argenson Mansion',
      period: 'February 2026',
      yieldRate: 8.5,
      netPaid: 412.50,
      method: 'USDC Auto-Deposit',
      date: '2026-02-01',
      status: 'Settled',
    },
    {
      id: 'po-04',
      property: 'SAINT-TROPEZ - Les Parcs Private Estate & Vineyard',
      period: 'February 2026',
      yieldRate: 9.2,
      netPaid: 537.50,
      method: 'SEPA Bank Wire',
      date: '2026-02-01',
      status: 'Settled',
    },
    {
      id: 'po-05',
      property: 'MADRID - Salamanca Heritage Residence',
      period: 'January 2026',
      yieldRate: 7.9,
      netPaid: 320.00,
      method: 'USDC Auto-Deposit',
      date: '2026-01-01',
      status: 'Settled',
    },
  ], []);

  const handleDownloadTaxSummary = () => {
    toast.success('Generated official 2025/2026 Tax Certificate (Form 1099-DIV / European SPV K-1 equivalent)');
  };

  return (
    <div className="space-y-[16px] text-[#0F172A] dark:text-[#E2E8F0]">
      {/* Overview Cards Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-[16px]">
        <div className="p-[20px] rounded-[12px] bg-white dark:bg-[#111A2C] border border-[#E2E8F0] dark:border-[#1E293B] shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
          <span className="text-[12px] text-[#64748B] dark:text-[#94A3B8] block mb-1">
            Trailing 12-Month Cash Yield
          </span>
          <div className="text-[28px] font-bold text-[#16A34A] tabular-nums tracking-tight">
            +€9,014.20
          </div>
          <span className="text-[12px] text-[#64748B] dark:text-[#94A3B8] block mt-1">
            Paid directly to custodial escrow
          </span>
        </div>

        <div className="p-[20px] rounded-[12px] bg-white dark:bg-[#111A2C] border border-[#E2E8F0] dark:border-[#1E293B] shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
          <span className="text-[12px] text-[#64748B] dark:text-[#94A3B8] block mb-1">
            Current Monthly Run-Rate
          </span>
          <div className="text-[28px] font-bold text-[#0F172A] dark:text-[#E2E8F0] tabular-nums tracking-tight">
            €964.20 <span className="text-[14px] font-normal text-[#64748B] dark:text-[#94A3B8]">/ mo</span>
          </div>
          <span className="text-[12px] text-[#16A34A] block mt-1 font-semibold">
            +12.1% YoY Yield Growth
          </span>
        </div>

        <div className="p-[20px] rounded-[12px] bg-white dark:bg-[#111A2C] border border-[#E2E8F0] dark:border-[#1E293B] shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
          <span className="text-[12px] text-[#64748B] dark:text-[#94A3B8] block mb-1">
            Next Payout Date
          </span>
          <div className="text-[28px] font-bold text-[#0F4C81] dark:text-[#14B8A6] tracking-tight">
            April 1, 2026
          </div>
          <span className="text-[12px] text-[#64748B] dark:text-[#94A3B8] block mt-1 tabular-nums">
            Estimated ~€1,040.00 distribution
          </span>
        </div>
      </div>

      {/* Monthly Bar Chart */}
      <div className="p-[20px] rounded-[12px] bg-white dark:bg-[#111A2C] border border-[#E2E8F0] dark:border-[#1E293B] shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <h3 className="text-[16px] font-semibold">Monthly Rental Dividends Paid (€)</h3>
            <p className="text-[12px] text-[#64748B] dark:text-[#94A3B8]">
              Automated first-of-the-month distributions across all tokenized property holdings
            </p>
          </div>
          <div className="flex items-center gap-4 text-[12px]">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-xs bg-[#14B8A6]" />
              <span className="text-[#64748B] dark:text-[#94A3B8]">Paid Distribution</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-xs bg-[#14B8A6]/30 border border-dashed border-[#14B8A6]" />
              <span className="text-[#64748B] dark:text-[#94A3B8]">Projected</span>
            </div>
          </div>
        </div>

        <div className="h-[280px] w-full">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={monthlyBarData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" opacity={0.3} />
              <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fill: '#64748B', fontSize: 12 }} />
              <YAxis tickLine={false} axisLine={false} tick={{ fill: '#64748B', fontSize: 12 }} tickFormatter={(v) => `€${v}`} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#111A2C',
                  borderColor: '#1E293B',
                  borderRadius: '8px',
                  color: '#E2E8F0',
                  fontSize: '12px',
                }}
                formatter={(val: any) => [`€${val}`, 'Monthly Net Payout']}
              />
              <Bar dataKey="actual" fill="#14B8A6" radius={[4, 4, 0, 0]} maxBarSize={38} />
              <Bar dataKey="projected" fill="#14B8A6" fillOpacity={0.3} radius={[4, 4, 0, 0]} maxBarSize={38} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Grid: Payout History Table (8/12) + Annual Tax Summary (4/12) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-[16px]">
        {/* Payout History Table */}
        <div className="lg:col-span-8 rounded-[12px] bg-white dark:bg-[#111A2C] border border-[#E2E8F0] dark:border-[#1E293B] shadow-[0_1px_3px_rgba(0,0,0,0.06)] overflow-hidden">
          <div className="p-[20px] border-b border-[#E2E8F0] dark:border-[#1E293B]">
            <h3 className="text-[16px] font-semibold leading-tight">Historical Payout Ledger</h3>
            <p className="text-[12px] text-[#64748B] dark:text-[#94A3B8]">
              Itemized rental dividend disbursements by property and period
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-[14px]">
              <thead className="bg-[#F8FAFC] dark:bg-[#0B1220] border-b border-[#E2E8F0] dark:border-[#1E293B] text-[12px] text-[#64748B] dark:text-[#94A3B8] uppercase font-semibold">
                <tr>
                  <th className="py-3 px-4">Property & Period</th>
                  <th className="py-3 px-4">Yield %</th>
                  <th className="py-3 px-4">Net Paid</th>
                  <th className="py-3 px-4">Method</th>
                  <th className="py-3 px-4 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0] dark:divide-[#1E293B]">
                {payoutHistory.map((po) => (
                  <tr key={po.id} className="hover:bg-[#F8FAFC] dark:hover:bg-[#1E293B]/40 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-[14px] truncate">{po.property}</div>
                      <div className="text-[12px] text-[#64748B] dark:text-[#94A3B8]">{po.period} • {po.date}</div>
                    </td>
                    <td className="py-3.5 px-4 tabular-nums font-semibold text-[#14B8A6]">
                      {po.yieldRate}%
                    </td>
                    <td className="py-3.5 px-4 tabular-nums font-bold text-[#16A34A]">
                      +{formatCurrency(po.netPaid)}
                    </td>
                    <td className="py-3.5 px-4 text-[12px] text-[#64748B] dark:text-[#94A3B8]">
                      {po.method}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#16A34A]/10 text-[#16A34A] text-[11px] font-semibold">
                        <CheckCircle2 className="w-3 h-3" /> {po.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Annual Tax Summary Card */}
        <div className="lg:col-span-4 p-[20px] rounded-[12px] bg-white dark:bg-[#111A2C] border border-[#E2E8F0] dark:border-[#1E293B] shadow-[0_1px_3px_rgba(0,0,0,0.06)] flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-[#0F4C81] dark:text-[#14B8A6]" strokeWidth={1.5} />
              <div>
                <h3 className="text-[16px] font-semibold leading-tight">Annual Tax Package</h3>
                <p className="text-[12px] text-[#64748B] dark:text-[#94A3B8]">Fiscal Year 2025 Statement</p>
              </div>
            </div>

            <div className="p-3.5 rounded-[8px] bg-[#F8FAFC] dark:bg-[#0B1220] border border-[#E2E8F0] dark:border-[#1E293B] space-y-2 text-[12px]">
              <div className="flex justify-between">
                <span className="text-[#64748B] dark:text-[#94A3B8]">Gross Rental Distributions:</span>
                <span className="font-semibold tabular-nums">€10,840.00</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#64748B] dark:text-[#94A3B8]">Capital Depreciation Shield:</span>
                <span className="font-semibold tabular-nums text-[#16A34A]">-€4,210.00</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#64748B] dark:text-[#94A3B8]">Withholding Tax (EU Escrow):</span>
                <span className="font-semibold tabular-nums">€0.00 (Exempt)</span>
              </div>
              <div className="flex justify-between font-bold text-[14px] pt-1 border-t border-[#E2E8F0] dark:border-[#1E293B]">
                <span>Net Taxable Income:</span>
                <span className="tabular-nums text-[#0F4C81] dark:text-[#14B8A6]">€6,630.00</span>
              </div>
            </div>

            <p className="text-[12px] text-[#64748B] dark:text-[#94A3B8] leading-relaxed">
              SPV real estate depreciation deductions reduce reportable investor taxable income under European pass-through provisions.
            </p>
          </div>

          <button
            onClick={handleDownloadTaxSummary}
            className="w-full mt-4 flex items-center justify-center gap-2 py-2.5 px-4 rounded-[8px] bg-[#0F4C81] hover:bg-[#0F4C81]/90 text-white text-[13px] font-semibold transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4" /> Download 2025 Tax Dossier
          </button>
        </div>
      </div>
    </div>
  );
};
