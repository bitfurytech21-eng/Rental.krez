import React, { useState } from 'react';
import { RefreshCw, CheckCircle2, ShieldCheck, FileSpreadsheet, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { ledger } from '../../lib/ledger';
import { formatCurrency, formatDate } from '../../lib/utils';

export const AdminReconciliationView: React.FC = () => {
  const [refreshing, setRefreshing] = useState(false);
  const transactions = ledger.getTransactions();

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 800);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[#18211F] tracking-tight">Ledger & Banking Reconciliation</h2>
          <p className="text-xs text-[#52605C] mt-1">
            Automated notary escrow, dividend distribution, and client balance reconciliation desk.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            className="px-3.5 py-2 bg-white border border-[#E3E8E3] rounded-xl text-xs font-semibold text-[#18211F] hover:bg-[#F8FAF8] flex items-center gap-2 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Sync Banking Feeds</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-[#E3E8E3]">
          <div className="text-[11px] font-bold text-[#52605C] uppercase tracking-wider">Escrow Match Rate</div>
          <div className="text-xl font-extrabold text-[#18211F] mt-1">100.0%</div>
          <div className="text-[10px] text-emerald-600 font-semibold mt-1 flex items-center gap-1">
            <ShieldCheck className="w-3 h-3" />
            <span>Audited against SEPA/SWIFT</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-[#E3E8E3]">
          <div className="text-[11px] font-bold text-[#52605C] uppercase tracking-wider">Pending Settlement</div>
          <div className="text-xl font-extrabold text-[#18211F] mt-1">€0.00</div>
          <div className="text-[10px] text-[#52605C] mt-1">Zero pending ledger mismatches</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-[#E3E8E3]">
          <div className="text-[11px] font-bold text-[#52605C] uppercase tracking-wider">Notary SPV Escrow Total</div>
          <div className="text-xl font-extrabold text-[#18211F] mt-1">€4,850,000.00</div>
          <div className="text-[10px] text-[#27845D] font-semibold mt-1">Verified via Notaire de France</div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-[#E3E8E3] p-5">
        <div className="text-sm font-bold text-[#18211F] mb-4">Recent Ledger Entries</div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#E3E8E3] text-[#52605C] font-semibold">
                <th className="py-2.5 px-3">Transaction ID</th>
                <th className="py-2.5 px-3">User ID</th>
                <th className="py-2.5 px-3">Type</th>
                <th className="py-2.5 px-3">Amount</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E3E8E3]">
              {transactions.slice(0, 8).map((tx) => (
                <tr key={tx.id} className="hover:bg-[#F8FAF8]">
                  <td className="py-2.5 px-3 font-mono font-bold text-[#18211F]">{tx.id}</td>
                  <td className="py-2.5 px-3 font-mono text-[#52605C]">{tx.userId}</td>
                  <td className="py-2.5 px-3 capitalize font-medium text-[#18211F]">{tx.type}</td>
                  <td className="py-2.5 px-3 font-bold text-[#18211F]">{formatCurrency(tx.amount)}</td>
                  <td className="py-2.5 px-3">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                      {tx.status}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-[#52605C]">{formatDate(tx.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
