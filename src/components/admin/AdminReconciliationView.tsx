import React, { useMemo, useState } from 'react';
import { RefreshCw, ShieldCheck } from 'lucide-react';
import { formatDate } from '../../lib/utils';
import { eurToCents, formatCentsEur } from './adminSupabaseGateway';

export interface ReconciliationTransactionRow {
  id: string;
  userId: string;
  userEmail?: string;
  type: string;
  amount: number;
  status: string;
  reference?: string;
  method?: string;
  createdAt: string;
}

interface AdminReconciliationViewProps {
  transactions?: ReconciliationTransactionRow[];
  onRefresh?: () => Promise<void> | void;
}

export const AdminReconciliationView: React.FC<AdminReconciliationViewProps> = ({
  transactions = [],
  onRefresh,
}) => {
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      await onRefresh?.();
    } finally {
      setRefreshing(false);
    }
  };

  const metrics = useMemo(() => {
    const settled = transactions.filter((t) => t.status === 'completed' || t.status === 'approved');
    const pending = transactions.filter((t) => t.status === 'pending' || t.status === 'processing');
    const settledCents = settled.reduce((s, t) => s + eurToCents(t.amount || 0), 0);
    const pendingCents = pending.reduce((s, t) => s + eurToCents(t.amount || 0), 0);
    const matchRate = transactions.length > 0
      ? ((settled.length / Math.max(1, settled.length + transactions.filter((t) => t.status === 'failed').length)) * 100)
      : 100;
    return {
      settledCents,
      pendingCents,
      pendingCount: pending.length,
      matchRate: matchRate.toFixed(1),
    };
  }, [transactions]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-[#F2F5F4] tracking-tight">Ledger &amp; Banking Reconciliation</h2>
          <p className="text-xs text-[#8FA1A8] mt-1">
            Escrow settlement tracking, pending payout queue, and ledger match audit.
          </p>
        </div>
        <button
          type="button"
          disabled={refreshing}
          onClick={() => void handleRefresh()}
          className="px-3.5 py-2 bg-[#121A1F] border border-[#1F2C33] rounded-xl text-xs font-semibold text-[#F2F5F4] hover:border-[#6FD8B0]/50 flex items-center gap-2 cursor-pointer transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-[#6FD8B0] ${refreshing ? 'animate-spin' : ''}`} />
          <span>{refreshing ? 'Refreshing...' : 'Refresh Ledger'}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[#121A1F] p-5 rounded-2xl border border-[#1F2C33]">
          <div className="text-[11px] font-semibold text-[#8FA1A8] uppercase tracking-wider">Escrow Match Rate</div>
          <div className="text-2xl font-bold text-[#F2F5F4] mt-1.5 tabular-nums">{metrics.matchRate}%</div>
          <div className="text-[11px] text-[#6FD8B0] font-medium mt-1 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Computed from {transactions.length} records</span>
          </div>
        </div>

        <div className="bg-[#121A1F] p-5 rounded-2xl border border-[#1F2C33]">
          <div className="text-[11px] font-semibold text-[#8FA1A8] uppercase tracking-wider">Pending Settlement</div>
          <div className="text-2xl font-bold text-amber-400 mt-1.5 tabular-nums">{formatCentsEur(metrics.pendingCents)}</div>
          <div className="text-[11px] text-[#8FA1A8] mt-1">{metrics.pendingCount} awaiting verification</div>
        </div>

        <div className="bg-[#121A1F] p-5 rounded-2xl border border-[#1F2C33]">
          <div className="text-[11px] font-semibold text-[#8FA1A8] uppercase tracking-wider">Settled Volume</div>
          <div className="text-2xl font-bold text-[#F2F5F4] mt-1.5 tabular-nums">{formatCentsEur(metrics.settledCents)}</div>
          <div className="text-[11px] text-[#6FD8B0] font-medium mt-1">Verified settled ledger entries</div>
        </div>
      </div>

      <div className="bg-[#121A1F] rounded-2xl border border-[#1F2C33] overflow-hidden">
        <div className="px-5 py-4 border-b border-[#1F2C33] text-sm font-bold text-[#F2F5F4]">
          Recent Ledger Entries
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#1F2C33] bg-[#0B0F10] text-[#8FA1A8] font-semibold">
                <th className="py-3 px-4">Reference</th>
                <th className="py-3 px-4">Investor / User</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Amount</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1F2C33]">
              {transactions.slice(0, 12).map((tx) => (
                <tr key={tx.id} className="hover:bg-[#162026] transition-colors">
                  <td className="py-3 px-4 font-mono text-[#F2F5F4]">{tx.reference || tx.id.slice(0, 12)}</td>
                  <td className="py-3 px-4 text-[#B6C4C9]">{tx.userEmail || tx.userId}</td>
                  <td className="py-3 px-4 capitalize text-[#F2F5F4]">{tx.type}</td>
                  <td className="py-3 px-4 font-bold text-[#F2F5F4] tabular-nums">{formatCentsEur(eurToCents(tx.amount))}</td>
                  <td className="py-3 px-4">
                    <span className={`font-semibold capitalize ${
                      tx.status === 'completed' || tx.status === 'approved'
                        ? 'text-[#6FD8B0]'
                        : tx.status === 'pending' || tx.status === 'processing'
                        ? 'text-amber-400'
                        : 'text-rose-400'
                    }`}>
                      {tx.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-[#8FA1A8]">{formatDate(tx.createdAt)}</td>
                </tr>
              ))}
              {transactions.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-[#8FA1A8]">
                    No ledger entries recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
