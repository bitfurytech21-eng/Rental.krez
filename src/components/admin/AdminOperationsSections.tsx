import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { getApiUrl, getAuthToken } from '../../lib/api';
import { formatCurrency, formatDate } from '../../lib/utils';
import { Property } from '../../types/property';
import { User as PlatformUser } from '../../types/user';
import { PaymentConfig } from '../../lib/ledger';
import { AdminEmailManager } from './AdminEmailManager';
import { AdminAccountSettings } from './AdminAccountSettings';
import { AdminManualPaymentManager } from './AdminManualPaymentManager';
import { CanonicalStaffRole, STAFF_ROLE_LABELS } from '../../lib/adminRbac';
import {
  Bell,
  Building2,
  CheckCircle2,
  Coins,
  Download,
  FileBarChart2,
  FileText,
  Layers,
  Lock,
  Plus,
  RefreshCw,
  Search,
  Send,
  Settings,
  ShieldCheck,
  Unlock,
  Upload,
} from 'lucide-react';

interface SectionFeedback {
  onSuccess: (msg: string) => void;
  onError: (msg: string) => void;
  onRefreshAll: () => void;
}

/* ============================================================================
 * 1. INVESTMENTS SECTION — holdings per property, per investor & share issuance
 * ============================================================================ */
export const AdminInvestmentsSection: React.FC<
  SectionFeedback & {
    users: PlatformUser[];
    properties: Property[];
    investments: any[];
  }
> = ({ users, properties, investments, onSuccess, onError, onRefreshAll }) => {
  const [propertyFilter, setPropertyFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedUserId, setSelectedUserId] = useState<string>(users[0]?.id || '');
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>(properties[0]?.id || '');
  const [tokensCount, setTokensCount] = useState<number>(5);
  const [deductFromWallet, setDeductFromWallet] = useState<boolean>(false);
  const [notes, setNotes] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!selectedUserId && users.length > 0) setSelectedUserId(users[0].id);
  }, [users, selectedUserId]);

  useEffect(() => {
    if (!selectedPropertyId && properties.length > 0) setSelectedPropertyId(properties[0].id);
  }, [properties, selectedPropertyId]);

  const filteredInvestments = useMemo(() => {
    return investments.filter((inv) => {
      if (propertyFilter !== 'all' && inv.propertyId !== propertyFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const hay = `${inv.userName || ''} ${inv.userEmail || ''} ${inv.propertyTitle || ''} ${inv.certificateId || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [investments, propertyFilter, searchQuery]);

  const selectedProp = properties.find((p) => p.id === selectedPropertyId);
  const estimatedEur = (selectedProp?.tokenPrice || 364) * Math.max(1, tokensCount);

  const handleIssueShares = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId || !selectedPropertyId || tokensCount < 1) {
      onError('Select an investor, a property, and at least 1 share.');
      return;
    }
    setSubmitting(true);
    try {
      const token = getAuthToken();
      const res = await fetch(getApiUrl('/admin/investments'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          userId: selectedUserId,
          propertyId: selectedPropertyId,
          tokensCount: Number(tokensCount),
          deductFromWallet,
          notes: notes.trim() || undefined,
        }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload.error || 'Share issuance failed.');
      onSuccess(payload.message || 'Shares issued and portfolio updated.');
      setNotes('');
      onRefreshAll();
    } catch (err: any) {
      onError(err?.message || 'Unable to issue shares.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Share Issuance Panel */}
      <div className="bg-white rounded-2xl border border-[#E3E8E3] p-6 space-y-4">
        <div>
          <h3 className="text-base font-bold text-[#18211F] flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#27845D]" />
            <span>Issue Shares to Investor</span>
          </h3>
          <p className="text-xs text-[#69736F] mt-0.5">
            Allocate property shares directly to an investor and mint their certificate reference.
          </p>
        </div>

        <form onSubmit={handleIssueShares} className="grid grid-cols-1 md:grid-cols-12 gap-3.5 items-end">
          <div className="md:col-span-4">
            <label className="block text-[11px] font-bold text-[#52605C] mb-1">Investor</label>
            {users.length > 0 ? (
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="w-full p-2.5 rounded-lg border border-[#E3E8E3] bg-[#F8FAF8] text-xs font-semibold text-[#18211F]"
                required
              >
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.fullName} ({u.email}) — {formatCurrency(u.walletBalance)}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                placeholder="Enter Investor ID (e.g. usr-...)"
                className="w-full p-2.5 rounded-lg border border-[#E3E8E3] bg-[#F8FAF8] text-xs font-mono text-[#18211F]"
                required
              />
            )}
          </div>

          <div className="md:col-span-4">
            <label className="block text-[11px] font-bold text-[#52605C] mb-1">Property Offering</label>
            <select
              value={selectedPropertyId}
              onChange={(e) => setSelectedPropertyId(e.target.value)}
              className="w-full p-2.5 rounded-lg border border-[#E3E8E3] bg-[#F8FAF8] text-xs font-semibold text-[#18211F]"
              required
            >
              {properties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title} ({p.availableTokens} avail · {formatCurrency(p.tokenPrice)}/share)
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="block text-[11px] font-bold text-[#52605C] mb-1">Shares</label>
            <input
              type="number"
              min={1}
              value={tokensCount}
              onChange={(e) => setTokensCount(Math.max(1, Number(e.target.value)))}
              className="w-full p-2.5 rounded-lg border border-[#E3E8E3] bg-[#F8FAF8] text-xs font-bold tabular-nums text-[#18211F]"
              required
            />
          </div>

          <div className="md:col-span-2">
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 px-4 rounded-lg bg-[#27845D] hover:bg-[#1f6b4b] text-white text-xs font-bold cursor-pointer disabled:opacity-50"
            >
              {submitting ? 'Issuing…' : 'Issue Shares'}
            </button>
          </div>

          <div className="md:col-span-7">
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional issuance note (e.g. Private placement allotment ref)..."
              className="w-full p-2 rounded-lg border border-[#E3E8E3] bg-[#F8FAF8] text-xs text-[#18211F]"
            />
          </div>

          <div className="md:col-span-5 flex items-center justify-between gap-3">
            <label className="inline-flex items-center gap-2 text-xs text-[#3B4743] cursor-pointer">
              <input
                type="checkbox"
                checked={deductFromWallet}
                onChange={(e) => setDeductFromWallet(e.target.checked)}
                className="rounded border-[#D5DED5] text-[#27845D]"
              />
              <span>Deduct cost from investor wallet</span>
            </label>
            <span className="text-xs font-bold text-[#18211F] tabular-nums">
              Est. Value: {formatCurrency(estimatedEur)}
            </span>
          </div>
        </form>
      </div>

      {/* Holdings Register */}
      <div className="bg-white rounded-2xl border border-[#E3E8E3] overflow-hidden">
        <div className="p-4 border-b border-[#E3E8E3] flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#FAFBF9]">
          <div>
            <h3 className="text-sm font-bold text-[#18211F]">Holdings Register ({filteredInvestments.length})</h3>
            <p className="text-xs text-[#69736F]">Issued share positions across all properties.</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search investor or certificate..."
                className="pl-8 pr-3 py-1.5 rounded-lg border border-[#E3E8E3] bg-white text-xs text-[#18211F]"
              />
            </div>
            <select
              value={propertyFilter}
              onChange={(e) => setPropertyFilter(e.target.value)}
              className="py-1.5 px-2.5 rounded-lg border border-[#E3E8E3] bg-white text-xs font-semibold text-[#18211F]"
            >
              <option value="all">All Properties</option>
              {properties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>
          </div>
        </div>

        {filteredInvestments.length === 0 ? (
          <div className="p-10 text-center text-xs text-[#69736F]">
            No share holdings found matching the selected filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#FAFBF9] border-b border-[#E3E8E3] text-[11px] font-bold text-[#69736F] uppercase">
                  <th className="py-3 px-4">Investor</th>
                  <th className="py-3 px-4">Property</th>
                  <th className="py-3 px-4">Shares</th>
                  <th className="py-3 px-4">Invested</th>
                  <th className="py-3 px-4">Certificate</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EAEFEA]">
                {filteredInvestments.map((inv) => (
                  <tr key={inv.id} className="hover:bg-[#F9FAF9]">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-[#18211F]">{inv.userName || 'Investor'}</div>
                      <div className="text-[11px] text-[#69736F]">{inv.userEmail}</div>
                    </td>
                    <td className="py-3 px-4 font-medium text-[#18211F]">{inv.propertyTitle}</td>
                    <td className="py-3 px-4 font-bold tabular-nums text-[#18211F]">{inv.tokensPurchased}</td>
                    <td className="py-3 px-4 font-bold tabular-nums text-[#27845D]">
                      {formatCurrency(inv.totalCost || 0)}
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-[#52605C]">
                      {inv.certificateId || inv.id}
                    </td>
                    <td className="py-3 px-4 text-[#69736F] whitespace-nowrap">
                      {inv.purchaseDate ? formatDate(inv.purchaseDate) : '—'}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold text-[11px] capitalize">
                        {inv.status || 'completed'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

/* ============================================================================
 * 2. DISTRIBUTIONS SECTION — Record rental income and pay out pro-rata
 * ============================================================================ */
export const AdminDistributionsSection: React.FC<
  SectionFeedback & { properties: Property[]; investments: any[] }
> = ({ properties, investments, onSuccess, onError, onRefreshAll }) => {
  const [batches, setBatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [propertyId, setPropertyId] = useState<string>(properties[0]?.id || '');
  const [totalAmountEur, setTotalAmountEur] = useState<number>(2500);
  const [periodLabel, setPeriodLabel] = useState<string>(
    new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  );
  const [notes, setNotes] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  const loadBatches = useCallback(async () => {
    setLoading(true);
    try {
      const token = getAuthToken();
      const res = await fetch(getApiUrl('/admin/distributions/payouts'), {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const payload = await res.json().catch(() => ({}));
      if (res.ok && Array.isArray(payload?.data)) {
        setBatches(payload.data);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadBatches();
  }, [loadBatches]);

  useEffect(() => {
    if (!propertyId && properties.length > 0) setPropertyId(properties[0].id);
  }, [properties, propertyId]);

  const previewHolders = useMemo(() => {
    const relevant = investments.filter((i) => i.propertyId === propertyId);
    const map = new Map<string, { userName: string; userEmail: string; shares: number }>();
    for (const inv of relevant) {
      const key = inv.userId || inv.userEmail;
      const cur = map.get(key);
      const shares = Number(inv.tokensPurchased || 1);
      if (cur) cur.shares += shares;
      else map.set(key, { userName: inv.userName || 'Investor', userEmail: inv.userEmail || '', shares });
    }
    const list = Array.from(map.values());
    const totalShares = list.reduce((s, h) => s + h.shares, 0);
    return list.map((h) => ({
      ...h,
      ratio: totalShares > 0 ? h.shares / totalShares : 0,
      payoutEur: totalShares > 0 ? Math.round(totalAmountEur * (h.shares / totalShares) * 100) / 100 : 0,
    }));
  }, [investments, propertyId, totalAmountEur]);

  const handlePayDistribution = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!propertyId || totalAmountEur <= 0) {
      onError('Select a property and enter a positive rental income amount.');
      return;
    }
    setSubmitting(true);
    try {
      const token = getAuthToken();
      const res = await fetch(getApiUrl('/admin/distributions/payout'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          propertyId,
          totalAmountEur: Number(totalAmountEur),
          periodLabel: periodLabel.trim(),
          notes: notes.trim() || undefined,
        }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload.error || 'Rental distribution failed.');
      onSuccess(payload.message || 'Rental income distributed to investor wallets.');
      setNotes('');
      await loadBatches();
      onRefreshAll();
    } catch (err: any) {
      onError(err?.message || 'Unable to execute rental distribution.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-[#E3E8E3] p-6 space-y-5">
        <div>
          <h3 className="text-base font-bold text-[#18211F] flex items-center gap-2">
            <Coins className="w-4 h-4 text-[#27845D]" />
            <span>Record Rental Income &amp; Pay Investors</span>
          </h3>
          <p className="text-xs text-[#69736F] mt-0.5">
            Calculates pro-rata rental payouts based on shares held in the selected property and credits investor wallets.
          </p>
        </div>

        <form onSubmit={handlePayDistribution} className="grid grid-cols-1 md:grid-cols-12 gap-3.5 items-end">
          <div className="md:col-span-5">
            <label className="block text-[11px] font-bold text-[#52605C] mb-1">Property</label>
            <select
              value={propertyId}
              onChange={(e) => setPropertyId(e.target.value)}
              className="w-full p-2.5 rounded-lg border border-[#E3E8E3] bg-[#F8FAF8] text-xs font-semibold text-[#18211F]"
              required
            >
              {properties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-3">
            <label className="block text-[11px] font-bold text-[#52605C] mb-1">Net Rental Pool (EUR)</label>
            <input
              type="number"
              min={1}
              step="0.01"
              value={totalAmountEur}
              onChange={(e) => setTotalAmountEur(Number(e.target.value))}
              className="w-full p-2.5 rounded-lg border border-[#E3E8E3] bg-[#F8FAF8] text-xs font-bold tabular-nums text-[#18211F]"
              required
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-[11px] font-bold text-[#52605C] mb-1">Period</label>
            <input
              type="text"
              value={periodLabel}
              onChange={(e) => setPeriodLabel(e.target.value)}
              className="w-full p-2.5 rounded-lg border border-[#E3E8E3] bg-[#F8FAF8] text-xs text-[#18211F]"
              required
            />
          </div>

          <div className="md:col-span-2">
            <button
              type="submit"
              disabled={submitting || previewHolders.length === 0}
              className="w-full py-2.5 px-4 rounded-lg bg-[#27845D] hover:bg-[#1f6b4b] text-white text-xs font-bold cursor-pointer disabled:opacity-50"
            >
              {submitting ? 'Paying…' : 'Pay Distribution'}
            </button>
          </div>

          <div className="md:col-span-12">
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional statement note (e.g. Monthly residential lease net of management fee)..."
              className="w-full p-2 rounded-lg border border-[#E3E8E3] bg-[#F8FAF8] text-xs text-[#18211F]"
            />
          </div>
        </form>

        {/* Pro-rata Preview */}
        <div className="border-t border-[#E3E8E3] pt-4">
          <div className="text-xs font-bold text-[#18211F] mb-2">
            Pro-Rata Allocation Preview ({previewHolders.length} shareholders)
          </div>
          {previewHolders.length === 0 ? (
            <div className="text-xs text-[#69736F] py-2">
              No active investors hold shares in this property yet. Issue shares in the Investments tab first.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#FAFBF9] border-b border-[#E3E8E3] text-[10px] font-bold text-[#69736F] uppercase">
                    <th className="py-2 px-3">Investor</th>
                    <th className="py-2 px-3">Shares</th>
                    <th className="py-2 px-3">Pool Share</th>
                    <th className="py-2 px-3 text-right">Est. Payout</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EAEFEA]">
                  {previewHolders.map((h, i) => (
                    <tr key={i}>
                      <td className="py-2 px-3 font-medium text-[#18211F]">
                        {h.userName} <span className="text-[#69736F]">({h.userEmail})</span>
                      </td>
                      <td className="py-2 px-3 tabular-nums">{h.shares}</td>
                      <td className="py-2 px-3 tabular-nums">{(h.ratio * 100).toFixed(2)}%</td>
                      <td className="py-2 px-3 text-right font-bold tabular-nums text-[#27845D]">
                        {formatCurrency(h.payoutEur)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Paid Batches History */}
      <div className="bg-white rounded-2xl border border-[#E3E8E3] overflow-hidden">
        <div className="px-4 py-3 bg-[#FAFBF9] border-b border-[#E3E8E3] flex items-center justify-between">
          <h3 className="text-sm font-bold text-[#18211F]">Distribution Payout Batches ({batches.length})</h3>
          <button
            type="button"
            onClick={() => void loadBatches()}
            className="text-xs font-semibold text-[#27845D] flex items-center gap-1 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>

        {batches.length === 0 ? (
          <div className="p-8 text-center text-xs text-[#69736F]">
            No rental distribution batches recorded yet in this session.
          </div>
        ) : (
          <div className="divide-y divide-[#EAEFEA]">
            {batches.map((b) => (
              <div key={b.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <div>
                  <div className="font-bold text-[#18211F]">
                    {b.propertyTitle} · {b.periodLabel}
                  </div>
                  <div className="text-[#69736F] mt-0.5">
                    {b.recipientsCount} investors paid · Processed by {b.processedBy} · {formatDate(b.createdAt)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold tabular-nums text-[#27845D]">
                    {formatCurrency(b.totalAmountEur)}
                  </div>
                  <div className="text-[11px] font-mono text-[#69736F]">{b.id}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

/* ============================================================================
 * 3. TRANSACTIONS SECTION — Full ledger with filters and CSV export
 * ============================================================================ */
export const AdminTransactionsSection: React.FC<{
  transactions: any[];
  users: PlatformUser[];
}> = ({ transactions, users }) => {
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [query, setQuery] = useState<string>('');

  const usersById = useMemo(() => {
    const map = new Map<string, PlatformUser>();
    users.forEach((u) => map.set(u.id, u));
    return map;
  }, [users]);

  const filtered = useMemo(() => {
    return transactions.filter((t) => {
      if (typeFilter !== 'all' && t.type !== typeFilter) return false;
      if (statusFilter !== 'all' && t.status !== statusFilter) return false;
      if (query.trim()) {
        const q = query.toLowerCase().trim();
        const u = usersById.get(t.userId);
        const hay = `${t.reference || ''} ${t.description || ''} ${t.type || ''} ${t.paymentMethod || ''} ${u?.email || ''} ${u?.fullName || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [transactions, typeFilter, statusFilter, query, usersById]);

  const handleExportCsv = () => {
    const headers = ['ID', 'Date', 'Type', 'Investor Email', 'Method', 'Reference', 'Amount EUR', 'Status'];
    const rows = filtered.map((t) => {
      const u = usersById.get(t.userId);
      return [
        t.id,
        t.createdAt,
        t.type,
        u?.email || t.userEmail || t.userId,
        `"${(t.paymentMethod || '').replace(/"/g, '""')}"`,
        t.reference || t.id,
        t.amount,
        t.status,
      ];
    });
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lagence-ledger-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-[#E3E8E3] p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-[#18211F]">Full Platform Ledger ({filtered.length})</h3>
          <p className="text-xs text-[#69736F]">All deposits, withdrawals, share purchases, and rental distributions.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search reference or email..."
              className="pl-8 pr-3 py-1.5 rounded-lg border border-[#E3E8E3] bg-[#F8FAF8] text-xs text-[#18211F]"
            />
          </div>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="py-1.5 px-2.5 rounded-lg border border-[#E3E8E3] bg-[#F8FAF8] text-xs font-semibold text-[#18211F]"
          >
            <option value="all">All Types</option>
            <option value="deposit">Deposits</option>
            <option value="withdrawal">Withdrawals</option>
            <option value="investment">Investments</option>
            <option value="distribution">Distributions</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="py-1.5 px-2.5 rounded-lg border border-[#E3E8E3] bg-[#F8FAF8] text-xs font-semibold text-[#18211F]"
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="completed">Completed</option>
            <option value="rejected">Rejected</option>
          </select>

          <button
            type="button"
            onClick={handleExportCsv}
            className="px-3.5 py-1.5 rounded-lg bg-[#182D2A] hover:bg-[#27845D] text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-[#E3E8E3] overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-10 text-center text-xs text-[#69736F]">No transactions match the selected filters.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#FAFBF9] border-b border-[#E3E8E3] text-[11px] font-bold text-[#69736F] uppercase">
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Investor</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Reference &amp; Method</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EAEFEA]">
                {filtered.map((t) => {
                  const u = usersById.get(t.userId);
                  const isOut = t.type === 'withdrawal';
                  return (
                    <tr key={t.id} className="hover:bg-[#F9FAF9]">
                      <td className="py-3 px-4 text-[#69736F] whitespace-nowrap">{formatDate(t.createdAt)}</td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-[#18211F]">{u?.fullName || 'Investor'}</div>
                        <div className="text-[11px] text-[#69736F]">{u?.email || t.userEmail || t.userId}</div>
                      </td>
                      <td className="py-3 px-4 capitalize font-semibold text-[#18211F]">{t.type}</td>
                      <td className="py-3 px-4">
                        <div className="font-mono text-[11px] text-[#18211F]">{t.reference}</div>
                        <div className="text-[11px] text-[#69736F]">{t.paymentMethod || t.description}</div>
                      </td>
                      <td
                        className={`py-3 px-4 text-right font-bold tabular-nums ${
                          isOut ? 'text-rose-700' : 'text-[#27845D]'
                        }`}
                      >
                        {isOut ? '-' : '+'}
                        {formatCurrency(t.amount)}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[11px] font-semibold capitalize border ${
                            t.status === 'completed'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : t.status === 'pending' || t.status === 'approved'
                              ? 'bg-amber-50 text-amber-800 border-amber-200'
                              : 'bg-rose-50 text-rose-800 border-rose-200'
                          }`}
                        >
                          {t.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

/* ============================================================================
 * 4. DOCUMENTS SECTION — Upload statements and tax documents per investor
 * ============================================================================ */
export const AdminDocumentsSection: React.FC<
  SectionFeedback & { users: PlatformUser[]; readOnly?: boolean }
> = ({ users, onSuccess, onError, readOnly = false }) => {
  const [docs, setDocs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string>(users[0]?.id || '');
  const [category, setCategory] = useState<'statement' | 'tax_document'>('statement');
  const [title, setTitle] = useState<string>('');
  const [periodLabel, setPeriodLabel] = useState<string>('Q1 2026');
  const [taxYear, setTaxYear] = useState<string>('2026');
  const [fileName, setFileName] = useState<string>('');
  const [fileSize, setFileSize] = useState<number>(0);
  const [mimeType, setMimeType] = useState<string>('application/pdf');
  const [fileDataUrl, setFileDataUrl] = useState<string | undefined>(undefined);
  const [submitting, setSubmitting] = useState(false);

  const loadStatements = useCallback(async () => {
    setLoading(true);
    try {
      const token = getAuthToken();
      const res = await fetch(getApiUrl('/admin/statements'), {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const payload = await res.json().catch(() => ({}));
      if (res.ok && Array.isArray(payload?.data)) setDocs(payload.data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadStatements();
  }, [loadStatements]);

  useEffect(() => {
    if (!userId && users.length > 0) setUserId(users[0].id);
  }, [users, userId]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setFileSize(file.size);
    setMimeType(file.type || 'application/pdf');
    if (file.size <= 1_800_000) {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') setFileDataUrl(reader.result);
      };
      reader.readAsDataURL(file);
    } else {
      setFileDataUrl(undefined);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId || !title.trim()) {
      onError('Please select an investor and enter a document title.');
      return;
    }
    const finalFileName = fileName.trim() || `${title.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-')}.pdf`;
    setSubmitting(true);
    try {
      const token = getAuthToken();
      const res = await fetch(getApiUrl('/admin/statements'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          userId,
          category,
          title: title.trim(),
          periodLabel: category === 'statement' ? periodLabel.trim() : undefined,
          taxYear: category === 'tax_document' ? taxYear.trim() : undefined,
          fileName: finalFileName,
          mimeType,
          fileSize: fileSize || 12400,
          fileDataUrl,
        }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload.error || 'Document upload failed.');
      onSuccess(payload.message || 'Document published to investor Reports.');
      setTitle('');
      setFileName('');
      setFileDataUrl(undefined);
      await loadStatements();
    } catch (err: any) {
      onError(err?.message || 'Unable to upload document.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {readOnly ? (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-xs text-amber-900 font-semibold flex items-center gap-2">
          <Lock className="w-4 h-4 text-amber-700 shrink-0" />
          <span>
            Read-only Support Access: You can inspect issued investor statements and tax documents. Publishing or uploading new documents requires Property Manager or Super Admin privileges.
          </span>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-[#E3E8E3] p-6 space-y-4">
          <div>
            <h3 className="text-base font-bold text-[#18211F] flex items-center gap-2">
              <Upload className="w-4 h-4 text-[#27845D]" />
              <span>Upload Statement or Tax Document</span>
            </h3>
            <p className="text-xs text-[#69736F] mt-0.5">
              Files uploaded here appear immediately inside the investor’s Reports section.
            </p>
          </div>

          <form onSubmit={handleUpload} className="grid grid-cols-1 md:grid-cols-12 gap-3.5 items-end">
            <div className="md:col-span-4">
              <label className="block text-[11px] font-bold text-[#52605C] mb-1">Target Investor</label>
              {users.length > 0 ? (
                <select
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-[#E3E8E3] bg-[#F8FAF8] text-xs font-semibold text-[#18211F]"
                  required
                >
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.fullName} ({u.email})
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  placeholder="Enter Investor ID (e.g. usr-...)"
                  className="w-full p-2.5 rounded-lg border border-[#E3E8E3] bg-[#F8FAF8] text-xs font-mono text-[#18211F]"
                  required
                />
              )}
            </div>

            <div className="md:col-span-2">
              <label className="block text-[11px] font-bold text-[#52605C] mb-1">Type</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as 'statement' | 'tax_document')}
                className="w-full p-2.5 rounded-lg border border-[#E3E8E3] bg-[#F8FAF8] text-xs font-semibold text-[#18211F]"
              >
                <option value="statement">Account Statement</option>
                <option value="tax_document">Tax Document</option>
              </select>
            </div>

            <div className="md:col-span-4">
              <label className="block text-[11px] font-bold text-[#52605C] mb-1">Document Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={category === 'tax_document' ? '2026 Annual Tax Withholding Certificate' : 'Q1 2026 Investor Statement'}
                className="w-full p-2.5 rounded-lg border border-[#E3E8E3] bg-[#F8FAF8] text-xs text-[#18211F]"
                required
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-[11px] font-bold text-[#52605C] mb-1">
                {category === 'tax_document' ? 'Tax Year' : 'Period'}
              </label>
              {category === 'tax_document' ? (
                <input
                  type="text"
                  value={taxYear}
                  onChange={(e) => setTaxYear(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-[#E3E8E3] bg-[#F8FAF8] text-xs text-[#18211F]"
                />
              ) : (
                <input
                  type="text"
                  value={periodLabel}
                  onChange={(e) => setPeriodLabel(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-[#E3E8E3] bg-[#F8FAF8] text-xs text-[#18211F]"
                />
              )}
            </div>

            <div className="md:col-span-9">
              <label className="block text-[11px] font-bold text-[#52605C] mb-1">
                Attach PDF / CSV / Text File (optional for record generation)
              </label>
              <input
                type="file"
                accept=".pdf,.csv,.txt,.png,.jpg,.jpeg"
                onChange={handleFileChange}
                className="w-full p-2 rounded-lg border border-[#E3E8E3] bg-[#F8FAF8] text-xs text-[#18211F]"
              />
            </div>

            <div className="md:col-span-3">
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2.5 px-4 rounded-lg bg-[#27845D] hover:bg-[#1f6b4b] text-white text-xs font-bold cursor-pointer disabled:opacity-50"
              >
                {submitting ? 'Uploading…' : 'Publish to Investor'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-[#E3E8E3] overflow-hidden">
        <div className="px-4 py-3 bg-[#FAFBF9] border-b border-[#E3E8E3] flex items-center justify-between">
          <h3 className="text-sm font-bold text-[#18211F]">Issued Investor Documents ({docs.length})</h3>
          <button
            type="button"
            onClick={() => void loadStatements()}
            className="text-xs font-semibold text-[#27845D] flex items-center gap-1 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>

        {docs.length === 0 ? (
          <div className="p-8 text-center text-xs text-[#69736F]">
            No custom statements or tax documents have been uploaded yet.
          </div>
        ) : (
          <div className="divide-y divide-[#EAEFEA]">
            {docs.map((d) => (
              <div key={d.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <div>
                  <div className="flex items-center gap-2">
                    <FileText className="w-3.5 h-3.5 text-[#27845D]" />
                    <span className="font-bold text-[#18211F]">{d.title}</span>
                    <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold text-[10px] uppercase">
                      {d.category === 'tax_document' ? 'Tax Document' : 'Statement'}
                    </span>
                  </div>
                  <div className="text-[#69736F] mt-0.5">
                    Investor: <strong className="text-[#18211F]">{d.userName} ({d.userEmail})</strong> ·{' '}
                    <span className="font-mono">{d.fileName}</span> · {formatDate(d.uploadedAt)}
                  </div>
                </div>
                <span className="text-[11px] font-mono text-[#69736F]">Issued by {d.uploadedBy}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

/* ============================================================================
 * 5. NOTIFICATIONS SECTION — Announcements & individual investor messages
 * ============================================================================ */
export const AdminNotificationsSection: React.FC<
  SectionFeedback & { users: PlatformUser[] }
> = ({ users, onSuccess, onError }) => {
  const [history, setHistory] = useState<any[]>([]);
  const [targetMode, setTargetMode] = useState<'all' | 'individual'>('all');
  const [userId, setUserId] = useState<string>(users[0]?.id || '');
  const [title, setTitle] = useState<string>('');
  const [message, setMessage] = useState<string>('');
  const [type, setType] = useState<'info' | 'success' | 'warning' | 'alert'>('info');
  const [sendEmailCopy, setSendEmailCopy] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState(false);

  const loadHistory = useCallback(async () => {
    const token = getAuthToken();
    const res = await fetch(getApiUrl('/admin/notifications'), {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    const payload = await res.json().catch(() => ({}));
    if (res.ok && Array.isArray(payload?.data)) setHistory(payload.data);
  }, []);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  useEffect(() => {
    if (!userId && users.length > 0) setUserId(users[0].id);
  }, [users, userId]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) {
      onError('Notification title and message are required.');
      return;
    }
    setSubmitting(true);
    try {
      const token = getAuthToken();
      const res = await fetch(getApiUrl('/admin/notifications'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          targetMode,
          userId: targetMode === 'individual' ? userId : undefined,
          title: title.trim(),
          message: message.trim(),
          type,
          sendEmailCopy,
        }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload.error || 'Failed to send notification.');
      onSuccess(payload.message || 'Notification sent.');
      setTitle('');
      setMessage('');
      await loadHistory();
    } catch (err: any) {
      onError(err?.message || 'Unable to send notification.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-[#E3E8E3] p-6 space-y-4">
        <div>
          <h3 className="text-base font-bold text-[#18211F] flex items-center gap-2">
            <Bell className="w-4 h-4 text-[#27845D]" />
            <span>Send Platform Announcement or Investor Message</span>
          </h3>
          <p className="text-xs text-[#69736F] mt-0.5">
            Delivers directly to the Investor Portal Notifications feed and optionally dispatches an email copy.
          </p>
        </div>

        <form onSubmit={handleSend} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            <div>
              <label className="block text-[11px] font-bold text-[#52605C] mb-1">Audience</label>
              <select
                value={targetMode}
                onChange={(e) => setTargetMode(e.target.value as 'all' | 'individual')}
                className="w-full p-2.5 rounded-lg border border-[#E3E8E3] bg-[#F8FAF8] text-xs font-semibold text-[#18211F]"
              >
                <option value="all">All Registered Investors (Announcement)</option>
                <option value="individual">Individual Investor</option>
              </select>
            </div>

            {targetMode === 'individual' && (
              <div>
                <label className="block text-[11px] font-bold text-[#52605C] mb-1">Select Investor</label>
                <select
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-[#E3E8E3] bg-[#F8FAF8] text-xs font-semibold text-[#18211F]"
                >
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.fullName} ({u.email})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-[11px] font-bold text-[#52605C] mb-1">Category</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as any)}
                className="w-full p-2.5 rounded-lg border border-[#E3E8E3] bg-[#F8FAF8] text-xs font-semibold text-[#18211F]"
              >
                <option value="info">Information</option>
                <option value="success">Positive Update</option>
                <option value="warning">Action Required</option>
                <option value="alert">Urgent Notice</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-[#52605C] mb-1">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Q2 2026 Distribution Schedule Published"
              className="w-full p-2.5 rounded-lg border border-[#E3E8E3] bg-[#F8FAF8] text-xs text-[#18211F]"
              required
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-[#52605C] mb-1">Message</label>
            <textarea
              rows={3}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Write the message shown in the investor portal..."
              className="w-full p-2.5 rounded-lg border border-[#E3E8E3] bg-[#F8FAF8] text-xs text-[#18211F]"
              required
            />
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <label className="inline-flex items-center gap-2 text-xs text-[#3B4743] cursor-pointer">
              <input
                type="checkbox"
                checked={sendEmailCopy}
                onChange={(e) => setSendEmailCopy(e.target.checked)}
                className="rounded border-[#D5DED5] text-[#27845D]"
              />
              <span>Also send email copy to recipients</span>
            </label>

            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 rounded-lg bg-[#27845D] hover:bg-[#1f6b4b] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{submitting ? 'Sending…' : 'Send Notification'}</span>
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white rounded-2xl border border-[#E3E8E3] overflow-hidden">
        <div className="px-4 py-3 bg-[#FAFBF9] border-b border-[#E3E8E3]">
          <h3 className="text-sm font-bold text-[#18211F]">Sent Notifications ({history.length})</h3>
        </div>
        {history.length === 0 ? (
          <div className="p-8 text-center text-xs text-[#69736F]">No announcements dispatched yet.</div>
        ) : (
          <div className="divide-y divide-[#EAEFEA]">
            {history.map((n) => (
              <div key={n.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <div>
                  <div className="font-bold text-[#18211F]">{n.title}</div>
                  <div className="text-[#52605C] mt-0.5">{n.message}</div>
                  <div className="text-[11px] text-[#69736F] mt-1">
                    {n.targetMode === 'all'
                      ? `Broadcast (${n.recipientCount} investors)`
                      : `Direct to ${n.targetEmail || n.targetUserId}`}{' '}
                    · Sent by {n.sentBy} · {formatDate(n.createdAt)}
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold text-[10px] uppercase self-start">
                  {n.type}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

/* ============================================================================
 * 6. REPORTS SECTION — AUM, Funding, Fees, and Audit Export
 * ============================================================================ */
export const AdminReportsSection: React.FC<{ onExportAuditJson: () => void }> = ({
  onExportAuditJson,
}) => {
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const loadReports = useCallback(async () => {
    setLoading(true);
    try {
      const token = getAuthToken();
      const res = await fetch(getApiUrl('/admin/reports'), {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const payload = await res.json().catch(() => ({}));
      if (res.ok && payload?.data) setReport(payload.data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadReports();
  }, [loadReports]);

  const handleDownloadJson = () => {
    if (!report) return;
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lagence-executive-report-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadCsv = () => {
    if (!report?.propertyBreakdown) return;
    const headers = ['Property', 'City', 'Status', 'Target EUR', 'Funded EUR', 'Funded %', 'Projected Yield %', 'Est Annual Mgmt Fee EUR'];
    const rows = report.propertyBreakdown.map((p: any) => [
      `"${String(p.title).replace(/"/g, '""')}"`,
      `"${String(p.city || '').replace(/"/g, '""')}"`,
      p.status,
      p.targetAmountEur,
      p.fundedAmountEur,
      p.fundingPercent,
      p.projectedYieldPercent,
      p.estimatedAnnualMgmtFeeEur,
    ]);
    const csv = [headers.join(','), ...rows.map((r: any[]) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lagence-aum-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading && !report) {
    return (
      <div className="bg-white rounded-2xl border border-[#E3E8E3] p-10 text-center text-xs text-[#69736F]">
        Loading AUM, funding, and fee analytics...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-[#E3E8E3] p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-[#18211F] flex items-center gap-2">
            <FileBarChart2 className="w-4 h-4 text-[#27845D]" />
            <span>AUM, Funding, Fees &amp; Audit Export</span>
          </h3>
          <p className="text-xs text-[#69736F] mt-0.5">
            Live portfolio capitalization, net capital inflows, platform fee accruals, and regulatory exports.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleDownloadCsv}
            className="px-3.5 py-2 rounded-lg bg-[#182D2A] hover:bg-[#27845D] text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export AUM CSV</span>
          </button>
          <button
            type="button"
            onClick={handleDownloadJson}
            className="px-3.5 py-2 rounded-lg bg-white hover:bg-[#F6F7F4] border border-[#E3E8E3] text-[#18211F] text-xs font-semibold cursor-pointer"
          >
            Export Summary JSON
          </button>
          <button
            type="button"
            onClick={onExportAuditJson}
            className="px-3.5 py-2 rounded-lg bg-white hover:bg-[#F6F7F4] border border-[#E3E8E3] text-[#18211F] text-xs font-semibold cursor-pointer"
          >
            Export Audit Trail
          </button>
        </div>
      </div>

      {report && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
            <div className="bg-white p-4 rounded-xl border border-[#E3E8E3]">
              <div className="text-[11px] font-bold uppercase text-[#69736F]">Target AUM</div>
              <div className="text-xl font-bold text-[#18211F] tabular-nums mt-1">
                {formatCurrency(report.aum?.totalTargetAumEur || 0)}
              </div>
              <div className="text-[11px] text-[#69736F] mt-0.5">
                {report.aum?.propertiesCount || 0} offerings
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-[#E3E8E3]">
              <div className="text-[11px] font-bold uppercase text-[#69736F]">Funded Capital</div>
              <div className="text-xl font-bold text-[#27845D] tabular-nums mt-1">
                {formatCurrency(report.aum?.totalFundedCapitalEur || 0)}
              </div>
              <div className="text-[11px] text-[#27845D] font-semibold mt-0.5 tabular-nums">
                {report.aum?.fundingCompletionPercent || 0}% funded overall
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-[#E3E8E3]">
              <div className="text-[11px] font-bold uppercase text-[#69736F]">Net Cash Inflow</div>
              <div className="text-xl font-bold text-[#18211F] tabular-nums mt-1">
                {formatCurrency(report.flows?.netCashFlowEur || 0)}
              </div>
              <div className="text-[11px] text-[#69736F] mt-0.5 tabular-nums">
                In {formatCurrency(report.flows?.completedDepositsEur || 0)} · Out{' '}
                {formatCurrency(report.flows?.completedWithdrawalsEur || 0)}
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-[#E3E8E3]">
              <div className="text-[11px] font-bold uppercase text-[#69736F]">Est. Fee Revenue</div>
              <div className="text-xl font-bold text-[#18211F] tabular-nums mt-1">
                {formatCurrency(report.fees?.totalEstimatedFeeRevenueEur || 0)}
              </div>
              <div className="text-[11px] text-[#69736F] mt-0.5 tabular-nums">
                Tx {report.fees?.investmentFeePercent}% · Mgmt {report.fees?.managementFeePercent}%
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-[#E3E8E3] overflow-hidden">
            <div className="px-4 py-3 bg-[#FAFBF9] border-b border-[#E3E8E3]">
              <h4 className="text-sm font-bold text-[#18211F]">Property Funding &amp; Fee Breakdown</h4>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#FAFBF9] border-b border-[#E3E8E3] text-[11px] font-bold text-[#69736F] uppercase">
                    <th className="py-3 px-4">Property</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Target</th>
                    <th className="py-3 px-4 text-right">Funded</th>
                    <th className="py-3 px-4 text-right">Completion</th>
                    <th className="py-3 px-4 text-right">Est. Annual Mgmt Fee</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EAEFEA]">
                  {(report.propertyBreakdown || []).map((p: any) => (
                    <tr key={p.id}>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-[#18211F]">{p.title}</div>
                        <div className="text-[11px] text-[#69736F]">{p.city}</div>
                      </td>
                      <td className="py-3 px-4 capitalize font-medium text-[#3B4743]">{p.status}</td>
                      <td className="py-3 px-4 text-right tabular-nums">{formatCurrency(p.targetAmountEur)}</td>
                      <td className="py-3 px-4 text-right font-semibold tabular-nums text-[#27845D]">
                        {formatCurrency(p.fundedAmountEur)}
                      </td>
                      <td className="py-3 px-4 text-right tabular-nums">{p.fundingPercent}%</td>
                      <td className="py-3 px-4 text-right tabular-nums">{formatCurrency(p.estimatedAnnualMgmtFeeEur)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

/* ============================================================================
 * 7. STAFF & ROLES SECTION — Admin operators & role permissions matrix
 * ============================================================================ */
export const AdminStaffSection: React.FC<SectionFeedback> = ({ onSuccess, onError }) => {
  const [staff, setStaff] = useState<any[]>([]);
  const [roleMatrix, setRoleMatrix] = useState<Record<string, string[]>>({});
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState('property_manager');
  const [submitting, setSubmitting] = useState(false);

  const loadStaff = useCallback(async () => {
    const token = getAuthToken();
    const res = await fetch(getApiUrl('/admin/staff'), {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    const payload = await res.json().catch(() => ({}));
    if (res.ok && payload?.data) {
      setStaff(Array.isArray(payload.data.staff) ? payload.data.staff : []);
      setRoleMatrix(payload.data.rolePermissions || {});
    }
  }, []);

  useEffect(() => {
    void loadStaff();
  }, [loadStaff]);

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const token = getAuthToken();
      const res = await fetch(getApiUrl('/admin/staff'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ email, fullName, role }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload.error || 'Unable to add staff member.');
      onSuccess(payload.message || 'Staff operator added.');
      setEmail('');
      setFullName('');
      await loadStaff();
    } catch (err: any) {
      onError(err?.message || 'Failed to add staff member.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateStaff = async (staffId: string, patch: { role?: string; status?: 'active' | 'suspended' }) => {
    try {
      const token = getAuthToken();
      const res = await fetch(getApiUrl(`/admin/staff/${staffId}`), {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(patch),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload.error || 'Failed to update staff role.');
      onSuccess(payload.message || 'Staff permissions updated.');
      await loadStaff();
    } catch (err: any) {
      onError(err?.message || 'Update failed.');
    }
  };

  const rolesList = Object.keys(roleMatrix);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-[#E3E8E3] p-6 space-y-4">
        <div>
          <h3 className="text-base font-bold text-[#18211F] flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#27845D]" />
            <span>Add Staff Operator</span>
          </h3>
          <p className="text-xs text-[#69736F] mt-0.5">
            Assign scoped permissions for finance operations, KYC compliance, or read-only audit review.
          </p>
        </div>

        <form onSubmit={handleAddStaff} className="grid grid-cols-1 md:grid-cols-12 gap-3.5 items-end">
          <div className="md:col-span-4">
            <label className="block text-[11px] font-bold text-[#52605C] mb-1">Full Name</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Claire Beaumont"
              className="w-full p-2.5 rounded-lg border border-[#E3E8E3] bg-[#F8FAF8] text-xs text-[#18211F]"
              required
            />
          </div>
          <div className="md:col-span-4">
            <label className="block text-[11px] font-bold text-[#52605C] mb-1">Staff Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="compliance@kretz.com"
              className="w-full p-2.5 rounded-lg border border-[#E3E8E3] bg-[#F8FAF8] text-xs text-[#18211F]"
              required
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-[11px] font-bold text-[#52605C] mb-1">Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full p-2.5 rounded-lg border border-[#E3E8E3] bg-[#F8FAF8] text-xs font-semibold text-[#18211F]"
            >
              {(rolesList.length > 0 ? rolesList : ['super_admin', 'finance', 'compliance', 'property_manager', 'support']).map((r) => (
                <option key={r} value={r}>
                  {STAFF_ROLE_LABELS[r as CanonicalStaffRole] || r.replace(/_/g, ' ')}
                </option>
              ))}
            </select>
          </div>
          <div className="md:col-span-2">
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 px-4 rounded-lg bg-[#27845D] hover:bg-[#1f6b4b] text-white text-xs font-bold flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Staff</span>
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white rounded-2xl border border-[#E3E8E3] overflow-hidden">
        <div className="px-4 py-3 bg-[#FAFBF9] border-b border-[#E3E8E3]">
          <h3 className="text-sm font-bold text-[#18211F]">Staff Operators ({staff.length})</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#FAFBF9] border-b border-[#E3E8E3] text-[11px] font-bold text-[#69736F] uppercase">
                <th className="py-3 px-4">Operator</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Permissions Scope</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Access</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EAEFEA]">
              {staff.map((m) => (
                <tr key={m.id}>
                  <td className="py-3 px-4">
                    <div className="font-bold text-[#18211F]">{m.fullName}</div>
                    <div className="text-[11px] text-[#69736F]">{m.email}</div>
                  </td>
                  <td className="py-3 px-4">
                    <select
                      value={m.role}
                      onChange={(e) => void handleUpdateStaff(m.id, { role: e.target.value })}
                      className="p-1.5 rounded-lg border border-[#E3E8E3] bg-[#F8FAF8] text-xs font-semibold text-[#18211F]"
                    >
                      {(rolesList.length > 0 ? rolesList : ['super_admin', 'finance', 'compliance', 'property_manager', 'support']).map((r) => (
                        <option key={r} value={r}>
                          {STAFF_ROLE_LABELS[r as CanonicalStaffRole] || r.replace(/_/g, ' ')}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex flex-wrap gap-1">
                      {(m.permissions || []).slice(0, 4).map((p: string) => (
                        <span key={p} className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-mono text-[10px]">
                          {p}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`px-2 py-0.5 rounded text-[11px] font-semibold capitalize border ${
                        m.status === 'active'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : 'bg-rose-50 text-rose-800 border-rose-200'
                      }`}
                    >
                      {m.status === 'suspended' ? 'Frozen' : 'Active'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    {m.status === 'suspended' ? (
                      <button
                        type="button"
                        onClick={() => void handleUpdateStaff(m.id, { status: 'active' })}
                        className="px-2.5 py-1 rounded bg-[#27845D] text-white text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Unlock className="w-3 h-3" /> Activate
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => void handleUpdateStaff(m.id, { status: 'suspended' })}
                        className="px-2.5 py-1 rounded bg-rose-50 text-rose-700 border border-rose-200 text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Lock className="w-3 h-3" /> Freeze
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

/* ============================================================================
 * 8. SETTINGS UNIFIED SECTION — Limits, Fees, Bank Details, Email Templates
 * ============================================================================ */
export const AdminSettingsUnifiedSection: React.FC<
  SectionFeedback & {
    paymentConfig: PaymentConfig;
    setPaymentConfig: React.Dispatch<React.SetStateAction<PaymentConfig>>;
    onSaveBankConfig: (e: React.FormEvent) => Promise<void>;
    paymentGatesOnly?: boolean;
    initialSubTab?: 'payment-gates' | 'templates' | 'credentials';
  }
> = ({
  paymentConfig,
  setPaymentConfig,
  onSaveBankConfig,
  onSuccess,
  onError,
  paymentGatesOnly = false,
  initialSubTab = 'payment-gates',
}) => {
  const [subTab, setSubTab] = useState<'payment-gates' | 'templates' | 'credentials'>(
    paymentGatesOnly ? 'payment-gates' : initialSubTab
  );
  const [limits, setLimits] = useState({
    minDepositEur: 50,
    maxDepositEur: 250000,
    minWithdrawalEur: 100,
    maxWithdrawalEur: 250000,
    minInvestmentEur: 500,
    maxInvestmentPerInvestorEur: 500000,
  });
  const [fees, setFees] = useState({
    sepaDepositFeeEur: 0,
    cardDepositFeeEur: 0,
    withdrawalFeeEur: 0,
    investmentFeePercent: 0.25,
    managementFeePercent: 1.5,
  });
  const [settlement, setSettlement] = useState({
    sepaDepositEta: '1–2 business days',
    cardDepositEta: 'Instant once confirmed',
    withdrawalEta: '1–2 business days',
  });
  const [flags, setFlags] = useState({
    depositsEnabled: true,
    withdrawalsEnabled: true,
    tradingEnabled: true,
  });
  const [savingLimits, setSavingLimits] = useState(false);

  const loadSettings = useCallback(async () => {
    const token = getAuthToken();
    const res = await fetch(getApiUrl('/admin/settings'), {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    const payload = await res.json().catch(() => ({}));
    if (res.ok && payload?.data) {
      const d = payload.data;
      if (d.limits) setLimits((prev) => ({ ...prev, ...d.limits }));
      if (d.fees) setFees((prev) => ({ ...prev, ...d.fees }));
      if (d.settlement) setSettlement((prev) => ({ ...prev, ...d.settlement }));
      setFlags({
        depositsEnabled: d.depositsEnabled !== false,
        withdrawalsEnabled: d.withdrawalsEnabled !== false,
        tradingEnabled: d.tradingEnabled !== false,
      });
    }
  }, []);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  useEffect(() => {
    if (paymentGatesOnly && subTab !== 'payment-gates') {
      setSubTab('payment-gates');
    }
  }, [paymentGatesOnly, subTab]);

  const handleSaveLimitsAndFees = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingLimits(true);
    try {
      const token = getAuthToken();
      const res = await fetch(getApiUrl('/admin/settings'), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          limits,
          fees,
          settlement,
          ...flags,
        }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload.error || 'Failed to save platform limits & fees.');
      onSuccess('Platform limits, fees, and settlement timelines saved.');
    } catch (err: any) {
      onError(err?.message || 'Unable to save settings.');
    } finally {
      setSavingLimits(false);
    }
  };

  const availableSubTabs = paymentGatesOnly
    ? [{ id: 'payment-gates', label: 'Payment Gates' }]
    : [
        { id: 'payment-gates', label: 'Payment Gates' },
        { id: 'templates', label: 'Email Templates' },
        { id: 'credentials', label: 'Admin Credentials' },
      ];

  return (
    <div className="space-y-6">
      {/* Sub-navigation bar */}
      <div className="bg-white rounded-2xl border border-[#E3E8E3] p-2 flex flex-wrap gap-1.5 items-center justify-between">
        <div className="flex flex-wrap gap-1.5">
          {availableSubTabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setSubTab(t.id as any)}
              className={`px-4 py-2 rounded-xl text-xs font-bold cursor-pointer transition-colors ${
                subTab === t.id
                  ? 'bg-[#182D2A] text-white'
                  : 'text-[#52605C] hover:bg-[#F4F6F4] hover:text-[#18211F]'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        {paymentGatesOnly && (
          <span className="text-[11px] font-semibold text-[#52605C] px-3">
            Scoped to Finance Payment Gates
          </span>
        )}
      </div>

      {subTab === 'payment-gates' && (
        <div className="space-y-6">
          <form onSubmit={handleSaveLimitsAndFees} className="bg-white rounded-2xl border border-[#E3E8E3] p-6 space-y-6">
            <div>
              <h3 className="text-base font-bold text-[#18211F] flex items-center gap-2">
                <Settings className="w-4 h-4 text-[#27845D]" />
                <span>Payment Gates — Limits, Fees &amp; Settlement SLAs</span>
              </h3>
            <p className="text-xs text-[#69736F] mt-0.5">
              Changes sync immediately to the Investor Portal Deposit, Withdraw, and Invest validation rules.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block font-bold text-[#52605C] mb-1">Min Deposit (EUR)</label>
              <input
                type="number"
                min={1}
                value={limits.minDepositEur}
                onChange={(e) => setLimits({ ...limits, minDepositEur: Number(e.target.value) })}
                className="w-full p-2.5 rounded-lg border border-[#E3E8E3] bg-[#F8FAF8] font-bold tabular-nums"
              />
            </div>
            <div>
              <label className="block font-bold text-[#52605C] mb-1">Max Deposit (EUR)</label>
              <input
                type="number"
                min={100}
                value={limits.maxDepositEur}
                onChange={(e) => setLimits({ ...limits, maxDepositEur: Number(e.target.value) })}
                className="w-full p-2.5 rounded-lg border border-[#E3E8E3] bg-[#F8FAF8] font-bold tabular-nums"
              />
            </div>
            <div>
              <label className="block font-bold text-[#52605C] mb-1">Min Withdrawal (EUR)</label>
              <input
                type="number"
                min={1}
                value={limits.minWithdrawalEur}
                onChange={(e) => setLimits({ ...limits, minWithdrawalEur: Number(e.target.value) })}
                className="w-full p-2.5 rounded-lg border border-[#E3E8E3] bg-[#F8FAF8] font-bold tabular-nums"
              />
            </div>
            <div>
              <label className="block font-bold text-[#52605C] mb-1">SEPA Deposit Fee (EUR)</label>
              <input
                type="number"
                min={0}
                step="0.01"
                value={fees.sepaDepositFeeEur}
                onChange={(e) => setFees({ ...fees, sepaDepositFeeEur: Number(e.target.value) })}
                className="w-full p-2.5 rounded-lg border border-[#E3E8E3] bg-[#F8FAF8] font-bold tabular-nums"
              />
            </div>
            <div>
              <label className="block font-bold text-[#52605C] mb-1">Withdrawal Fee (EUR)</label>
              <input
                type="number"
                min={0}
                step="0.01"
                value={fees.withdrawalFeeEur}
                onChange={(e) => setFees({ ...fees, withdrawalFeeEur: Number(e.target.value) })}
                className="w-full p-2.5 rounded-lg border border-[#E3E8E3] bg-[#F8FAF8] font-bold tabular-nums"
              />
            </div>
            <div>
              <label className="block font-bold text-[#52605C] mb-1">Investment Fee (%)</label>
              <input
                type="number"
                min={0}
                step="0.05"
                value={fees.investmentFeePercent}
                onChange={(e) => setFees({ ...fees, investmentFeePercent: Number(e.target.value) })}
                className="w-full p-2.5 rounded-lg border border-[#E3E8E3] bg-[#F8FAF8] font-bold tabular-nums"
              />
            </div>
            <div>
              <label className="block font-bold text-[#52605C] mb-1">SEPA Settlement ETA</label>
              <input
                type="text"
                value={settlement.sepaDepositEta}
                onChange={(e) => setSettlement({ ...settlement, sepaDepositEta: e.target.value })}
                className="w-full p-2.5 rounded-lg border border-[#E3E8E3] bg-[#F8FAF8]"
              />
            </div>
            <div>
              <label className="block font-bold text-[#52605C] mb-1">Withdrawal Arrival ETA</label>
              <input
                type="text"
                value={settlement.withdrawalEta}
                onChange={(e) => setSettlement({ ...settlement, withdrawalEta: e.target.value })}
                className="w-full p-2.5 rounded-lg border border-[#E3E8E3] bg-[#F8FAF8]"
              />
            </div>
            <div>
              <label className="block font-bold text-[#52605C] mb-1">Annual Management Fee (%)</label>
              <input
                type="number"
                min={0}
                step="0.1"
                value={fees.managementFeePercent}
                onChange={(e) => setFees({ ...fees, managementFeePercent: Number(e.target.value) })}
                className="w-full p-2.5 rounded-lg border border-[#E3E8E3] bg-[#F8FAF8] font-bold tabular-nums"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-6 pt-3 border-t border-[#E3E8E3] text-xs">
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={flags.depositsEnabled}
                onChange={(e) => setFlags({ ...flags, depositsEnabled: e.target.checked })}
              />
              <span className="font-semibold text-[#18211F]">Deposits Enabled</span>
            </label>
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={flags.withdrawalsEnabled}
                onChange={(e) => setFlags({ ...flags, withdrawalsEnabled: e.target.checked })}
              />
              <span className="font-semibold text-[#18211F]">Withdrawals Enabled</span>
            </label>
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={flags.tradingEnabled}
                onChange={(e) => setFlags({ ...flags, tradingEnabled: e.target.checked })}
              />
              <span className="font-semibold text-[#18211F]">Property Investments Enabled</span>
            </label>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={savingLimits}
              className="px-6 py-2.5 rounded-lg bg-[#27845D] hover:bg-[#1f6b4b] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{savingLimits ? 'Saving…' : 'Save Limits & Fees'}</span>
            </button>
          </div>
        </form>

          <form onSubmit={(e) => void onSaveBankConfig(e)} className="bg-white rounded-2xl border border-[#E3E8E3] p-6 space-y-4">
            <div>
              <h3 className="text-base font-bold text-[#18211F] flex items-center gap-2">
                <Building2 className="w-4 h-4 text-[#27845D]" />
                <span>Corporate Escrow Bank Details (Shown on Investor Deposit Confirmation)</span>
              </h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-bold text-[#52605C] mb-1">Bank Name</label>
                <input
                  type="text"
                  value={paymentConfig.traditional.bankName}
                  onChange={(e) =>
                    setPaymentConfig({
                      ...paymentConfig,
                      traditional: { ...paymentConfig.traditional, bankName: e.target.value },
                    })
                  }
                  className="w-full p-2.5 rounded-lg border border-[#E3E8E3] bg-[#F8FAF8]"
                  required
                />
              </div>
              <div>
                <label className="block font-bold text-[#52605C] mb-1">Beneficiary</label>
                <input
                  type="text"
                  value={paymentConfig.traditional.beneficiary}
                  onChange={(e) =>
                    setPaymentConfig({
                      ...paymentConfig,
                      traditional: { ...paymentConfig.traditional, beneficiary: e.target.value },
                    })
                  }
                  className="w-full p-2.5 rounded-lg border border-[#E3E8E3] bg-[#F8FAF8]"
                  required
                />
              </div>
              <div>
                <label className="block font-bold text-[#52605C] mb-1">Escrow IBAN</label>
                <input
                  type="text"
                  value={paymentConfig.traditional.iban}
                  onChange={(e) =>
                    setPaymentConfig({
                      ...paymentConfig,
                      traditional: { ...paymentConfig.traditional, iban: e.target.value },
                    })
                  }
                  className="w-full p-2.5 rounded-lg border border-[#E3E8E3] bg-[#F8FAF8] font-mono"
                  required
                />
              </div>
              <div>
                <label className="block font-bold text-[#52605C] mb-1">BIC / SWIFT</label>
                <input
                  type="text"
                  value={paymentConfig.traditional.bic}
                  onChange={(e) =>
                    setPaymentConfig({
                      ...paymentConfig,
                      traditional: { ...paymentConfig.traditional, bic: e.target.value },
                    })
                  }
                  className="w-full p-2.5 rounded-lg border border-[#E3E8E3] bg-[#F8FAF8] font-mono"
                  required
                />
              </div>
              <div className="md:col-span-2">
                <label className="block font-bold text-[#52605C] mb-1">Transfer Instructions</label>
                <textarea
                  rows={2}
                  value={paymentConfig.traditional.instructions}
                  onChange={(e) =>
                    setPaymentConfig({
                      ...paymentConfig,
                      traditional: { ...paymentConfig.traditional, instructions: e.target.value },
                    })
                  }
                  className="w-full p-2.5 rounded-lg border border-[#E3E8E3] bg-[#F8FAF8]"
                  required
                />
              </div>
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                className="px-6 py-2.5 rounded-lg bg-[#27845D] hover:bg-[#1f6b4b] text-white text-xs font-bold cursor-pointer"
              >
                Save Bank Details
              </button>
            </div>
          </form>

          <AdminManualPaymentManager />
        </div>
      )}

      {!paymentGatesOnly && subTab === 'templates' && <AdminEmailManager />}
      {!paymentGatesOnly && subTab === 'credentials' && <AdminAccountSettings />}
    </div>
  );
};
