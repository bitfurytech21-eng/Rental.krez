import React, { useState, useEffect } from 'react';
import { distributionApi } from '../../lib/api';
import { UserPropertyDistributionSummary, DailyPaymentRecord } from '../../types/distribution';
import { getDistributionStatusBadge } from '../../lib/distributionService';
import { formatCurrency, formatDate, formatPercent } from '../../lib/utils';
import { 
  Building2, 
  Calendar, 
  TrendingUp, 
  Coins, 
  ShieldCheck, 
  Download, 
  RefreshCw, 
  AlertCircle, 
  Clock, 
  ChevronDown, 
  ChevronUp, 
  ArrowRight,
  ExternalLink,
  History,
  FileSpreadsheet,
  PauseCircle,
  AlertTriangle,
  Receipt
} from 'lucide-react';

interface PropertyDailyDistributionsViewProps {
  onSelectProperty?: (propertyId: string) => void;
  onExploreProperties?: () => void;
}

export const PropertyDailyDistributionsView: React.FC<PropertyDailyDistributionsViewProps> = ({
  onSelectProperty,
  onExploreProperties
}) => {
  const [summaries, setSummaries] = useState<UserPropertyDistributionSummary[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | 'all'>('all');
  const [expandedHistoryPropId, setExpandedHistoryPropId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  const fetchDistributions = async () => {
    try {
      setIsRefreshing(true);
      setError(null);
      const res = await distributionApi.getMyPropertyDistributions();
      if (res?.data?.summaries) {
        setSummaries(res.data.summaries);
        if (res.data.summaries.length > 0 && selectedPropertyId === 'all') {
          // If properties exist, leave selectedPropertyId as 'all' or default
        }
      }
    } catch (err: any) {
      console.warn('Unable to load distributions from API, retaining active records:', err);
      setError(err?.message || 'Unable to synchronize real-time distributions with server.');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDistributions();
  }, []);

  const totalCapitalInvested = summaries.reduce((acc, s) => acc + s.totalAllocatedInvestmentEUR, 0);
  const totalDailyEntitlement = summaries.reduce((acc, s) => acc + s.dailyPaymentAmountEUR, 0);
  const totalPaymentsReceived = summaries.reduce((acc, s) => acc + s.totalPaymentsReceivedEUR, 0);
  const totalPendingPayments = summaries.reduce((acc, s) => acc + s.pendingPaymentsEUR, 0);

  const filteredSummaries = selectedPropertyId === 'all'
    ? summaries
    : summaries.filter(s => s.propertyId === selectedPropertyId);

  const handleDownloadCsv = (propertyId?: string) => {
    const url = distributionApi.getExportUrl(propertyId === 'all' ? undefined : propertyId, 'csv');
    window.open(url, '_blank');
  };

  if (loading && summaries.length === 0) {
    return (
      <div className="bg-[#151515] p-8 rounded-3xl border border-[#303030] text-center space-y-4">
        <div className="w-10 h-10 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs text-gray-400 font-mono tracking-wide">Synchronizing property payment allocations & daily ledger...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* Top Header & Overview Bar */}
      <div className="bg-gradient-to-r from-[#141d24] via-[#11191f] to-[#0c1216] border border-white/[0.08] p-5 sm:p-6 rounded-3xl shadow-2xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold uppercase tracking-wider">
                <Coins className="w-3 h-3" /> Property-by-Property Daily Payouts
              </span>
              <span className="text-[10px] text-gray-400 font-mono">
                {summaries.length} Active Real Estate {summaries.length === 1 ? 'Holding' : 'Holdings'}
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Daily Rental Payment Distribution
            </h2>
            <p className="text-xs text-gray-400 max-w-2xl leading-relaxed mt-1">
              Every property is allocated into its own contractual daily payment schedule. Entitlements are calculated strictly on your verified ownership percentage and available treasury funds.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={fetchDistributions}
              disabled={isRefreshing}
              className="py-2.5 px-3.5 bg-white/5 hover:bg-white/10 text-white rounded-xl border border-white/10 text-xs font-semibold flex items-center gap-2 transition cursor-pointer"
              title="Refresh ledger state"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-emerald-400 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>{isRefreshing ? 'Syncing...' : 'Sync Now'}</span>
            </button>

            <button
              type="button"
              onClick={() => handleDownloadCsv('all')}
              className="py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition shadow-lg shadow-emerald-900/30 cursor-pointer"
              title="Download complete payment distribution ledger as CSV"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Export Statement (.csv)</span>
            </button>
          </div>
        </div>

        {/* Global Verification Metrics (Clear distinction of status) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 pt-6 mt-6 border-t border-white/[0.08]">
          <div className="p-3.5 bg-black/30 rounded-2xl border border-white/[0.05]">
            <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block">
              Daily Payment Entitlement
            </span>
            <div className="text-xl sm:text-2xl font-bold font-mono text-emerald-400 mt-1">
              +{formatCurrency(totalDailyEntitlement)}<span className="text-xs text-gray-400 font-normal">/day</span>
            </div>
            <p className="text-[10px] text-gray-400 mt-0.5">Sum of approved property daily rates</p>
          </div>

          <div className="p-3.5 bg-black/30 rounded-2xl border border-white/[0.05]">
            <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block">
              Total Realized (Paid &amp; Settled)
            </span>
            <div className="text-xl sm:text-2xl font-bold font-mono text-white mt-1">
              {formatCurrency(totalPaymentsReceived)}
            </div>
            <p className="text-[10px] text-gray-400 mt-0.5">Verified cash credited to wallet balance</p>
          </div>

          <div className="p-3.5 bg-black/30 rounded-2xl border border-white/[0.05]">
            <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block">
              Pending / Accrued Payouts
            </span>
            <div className="text-xl sm:text-2xl font-bold font-mono text-sky-400 mt-1">
              {formatCurrency(totalPendingPayments)}
            </div>
            <p className="text-[10px] text-gray-400 mt-0.5">Awaiting batch clearing / approval</p>
          </div>

          <div className="p-3.5 bg-black/30 rounded-2xl border border-white/[0.05]">
            <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block">
              Total Allocated Capital
            </span>
            <div className="text-xl sm:text-2xl font-bold font-mono text-amber-300 mt-1">
              {formatCurrency(totalCapitalInvested)}
            </div>
            <p className="text-[10px] text-gray-400 mt-0.5">Across {summaries.length} property contracts</p>
          </div>
        </div>
      </div>

      {/* Property Selector Bar (Ensures strict individual property separation) */}
      {summaries.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 bg-[#151515] p-3 rounded-2xl border border-[#303030]">
          <div className="flex items-center gap-2 overflow-x-auto py-1 max-w-full">
            <span className="text-xs text-gray-400 font-medium px-2 shrink-0">Filter Asset:</span>
            <button
              onClick={() => setSelectedPropertyId('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                selectedPropertyId === 'all'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-white/5 text-gray-300 hover:bg-white/10'
              }`}
            >
              All Properties ({summaries.length})
            </button>
            {summaries.map(s => (
              <button
                key={s.propertyId}
                onClick={() => setSelectedPropertyId(s.propertyId)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                  selectedPropertyId === s.propertyId
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-white/5 text-gray-300 hover:bg-white/10'
                }`}
              >
                <span>{s.tokenTicker}</span>
                <span className="text-[10px] opacity-75">· {s.propertyTitle.split('-')[0].trim()}</span>
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-gray-400">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-[#1e1e1e] border border-[#383838] text-white rounded-lg px-2.5 py-1 text-xs outline-none cursor-pointer"
            >
              <option value="all">All Payout Statuses</option>
              <option value="paid">Paid & Settled</option>
              <option value="approved">Approved</option>
              <option value="accrued">Accrued</option>
              <option value="failed">Failed / Insufficient</option>
            </select>
          </div>
        </div>
      )}

      {/* Empty State */}
      {summaries.length === 0 ? (
        <div className="bg-[#151515] p-10 rounded-3xl border border-[#303030] text-center space-y-4 max-w-xl mx-auto shadow-xl">
          <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 text-emerald-400 mx-auto flex items-center justify-center">
            <Building2 className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-white">No Property Payment Allocations Active</h3>
          <p className="text-xs text-gray-400 leading-relaxed">
            You do not currently hold fractional units in any tokenized property. Once you invest in a property, its individual daily payment allocation, daily rate, and payout history will appear here.
          </p>
          {onExploreProperties && (
            <button
              onClick={onExploreProperties}
              className="py-3 px-6 bg-white hover:bg-neutral-200 text-black rounded-xl text-xs font-bold transition shadow-lg cursor-pointer"
            >
              Browse Property Offerings &rarr;
            </button>
          )}
        </div>
      ) : (
        /* Property Cards (Separated strictly per property) */
        <div className="space-y-6">
          {filteredSummaries.map((summary) => {
            const isHistoryExpanded = expandedHistoryPropId === summary.propertyId;
            const statusBadge = getDistributionStatusBadge(summary.paymentStatus as any);
            const filteredHistory = summary.paymentHistory.filter(rec => {
              if (statusFilter === 'all') return true;
              return rec.status === statusFilter;
            });

            return (
              <div 
                key={summary.propertyId}
                className="bg-[#151515] border border-[#2b2b2b] rounded-3xl overflow-hidden shadow-2xl transition hover:border-[#3d3d3d]"
              >
                {/* Property Card Header */}
                <div className="p-5 sm:p-6 bg-gradient-to-b from-[#1b1b1b] to-[#151515] border-b border-[#2b2b2b]">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <img 
                        src={summary.propertyImage} 
                        alt={summary.propertyTitle} 
                        className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover shrink-0 border border-[#333333] shadow-md"
                      />
                      <div>
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className="font-mono text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                            {summary.tokenTicker}
                          </span>
                          <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${statusBadge.badgeClass}`}>
                            {statusBadge.label}
                          </span>
                          <span className="text-[10px] text-gray-400 font-mono">
                            Schedule: {summary.paymentSchedule.toUpperCase()}
                          </span>
                        </div>
                        <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                          {summary.propertyTitle}
                        </h3>
                        <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                          <span>{summary.location}</span>
                          <span className="text-gray-600">·</span>
                          <span className="text-gray-300 font-mono">Par Value: {formatCurrency(summary.tokenPriceEUR)}/token</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-start lg:self-center">
                      <button
                        type="button"
                        onClick={() => handleDownloadCsv(summary.propertyId)}
                        className="py-2 px-3 bg-white/5 hover:bg-white/10 text-gray-200 border border-white/10 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                        title="Download CSV statement for this property"
                      >
                        <Download className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Statement</span>
                      </button>

                      {onSelectProperty && (
                        <button
                          type="button"
                          onClick={() => onSelectProperty(summary.propertyId)}
                          className="py-2 px-3 bg-white text-black hover:bg-neutral-200 rounded-xl text-xs font-bold flex items-center gap-1 transition cursor-pointer"
                        >
                          <span>Dossier</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Individual Property Financial Metrics Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-5 mt-5 border-t border-[#262626]">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block">
                        Ownership Allocation
                      </span>
                      <div className="text-sm sm:text-base font-bold font-mono text-white mt-0.5">
                        {summary.userOwnershipPercent}%
                      </div>
                      <span className="text-[10.5px] text-gray-400 block font-mono">
                        {summary.tokensOwned} / {summary.totalPropertyTokens} tokens
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block">
                        Capital Invested
                      </span>
                      <div className="text-sm sm:text-base font-bold font-mono text-white mt-0.5">
                        {formatCurrency(summary.totalAllocatedInvestmentEUR)}
                      </div>
                      <span className="text-[10.5px] text-gray-400 block">Verified principal</span>
                    </div>

                    <div>
                      <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block">
                        Approved Payment Rate
                      </span>
                      <div className="text-sm sm:text-base font-bold font-mono text-emerald-400 mt-0.5">
                        {summary.approvedAnnualPercent}% p.a.
                      </div>
                      <span className="text-[10.5px] text-gray-400 block font-mono">
                        {summary.approvedDailyPercent}% / day
                      </span>
                    </div>

                    <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                      <span className="text-[10px] uppercase font-bold text-emerald-300 tracking-wider block">
                        Daily Payment Amount
                      </span>
                      <div className="text-base sm:text-lg font-bold font-mono text-emerald-400 mt-0.5">
                        +{formatCurrency(summary.dailyPaymentAmountEUR)}
                      </div>
                      <span className="text-[10px] text-emerald-400/80 block">per calendar day</span>
                    </div>

                    <div>
                      <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block">
                        Total Realized Paid
                      </span>
                      <div className="text-sm sm:text-base font-bold font-mono text-white mt-0.5">
                        +{formatCurrency(summary.totalPaymentsReceivedEUR)}
                      </div>
                      <span className="text-[10.5px] text-gray-400 block">Cumulative settled</span>
                    </div>

                    <div>
                      <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block">
                        Next Scheduled Payout
                      </span>
                      <div className="text-sm sm:text-base font-bold font-mono text-sky-400 mt-0.5">
                        {formatDate(summary.nextScheduledPaymentDate)}
                      </div>
                      <span className="text-[10.5px] text-gray-400 block">12:00 UTC Batch</span>
                    </div>
                  </div>
                </div>

                {/* Property Treasury & Verification Notice */}
                <div className="px-5 py-3 bg-[#111111] border-b border-[#262626] flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span className="text-gray-300">
                      Verified Distributable Reserve in Property Treasury:
                    </span>
                    <span className="font-mono font-bold text-emerald-400">
                      {formatCurrency(summary.availablePropertyFundsEUR)}
                    </span>
                  </div>

                  <div className="text-gray-400 text-[11px] font-mono">
                    Pending Processing: <span className="text-sky-300 font-semibold">{formatCurrency(summary.pendingPaymentsEUR)}</span>
                  </div>
                </div>

                {/* Daily Payment History Section */}
                <div className="p-5 sm:p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-white flex items-center gap-2">
                        <History className="w-4 h-4 text-emerald-400" />
                        <span>Daily Payment History for {summary.tokenTicker}</span>
                      </h4>
                      <p className="text-xs text-gray-400">
                        Detailed audit record of every daily payment generated for your verified units
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setExpandedHistoryPropId(isHistoryExpanded ? null : summary.propertyId)}
                      className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 transition cursor-pointer"
                    >
                      <span>{isHistoryExpanded ? 'Collapse Table' : `View Full History (${summary.paymentHistory.length})`}</span>
                      {isHistoryExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>

                  {filteredHistory.length === 0 ? (
                    <div className="text-center py-6 text-xs text-gray-400 bg-[#1a1a1a] rounded-2xl border border-[#2b2b2b]">
                      No daily payment records match the current filter.
                    </div>
                  ) : (
                    <div className="overflow-x-auto rounded-2xl border border-[#262626]">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-[#1f1f1f] text-gray-400 font-semibold uppercase text-[10px] tracking-wider border-b border-[#2b2b2b]">
                          <tr>
                            <th className="py-3 px-3.5">Payment Date</th>
                            <th className="py-3 px-3.5">Units / Ownership</th>
                            <th className="py-3 px-3.5">Daily Rate %</th>
                            <th className="py-3 px-3.5">Amount (EUR)</th>
                            <th className="py-3 px-3.5">Payment Status</th>
                            <th className="py-3 px-3.5">Payment Reference</th>
                            <th className="py-3 px-3.5">Verification</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#222222]">
                          {(isHistoryExpanded ? filteredHistory : filteredHistory.slice(0, 4)).map((record) => {
                            const recBadge = getDistributionStatusBadge(record.status);
                            return (
                              <tr key={record.id} className="hover:bg-[#1a1a1a] transition-colors">
                                <td className="py-3 px-3.5 font-mono text-gray-200">
                                  {formatDate(record.date)}
                                </td>
                                <td className="py-3 px-3.5 font-mono text-gray-300">
                                  {record.userTokensCount} units ({record.userOwnershipPercent}%)
                                </td>
                                <td className="py-3 px-3.5 font-mono text-gray-400">
                                  {record.propertyDailyRatePercent}%
                                </td>
                                <td className="py-3 px-3.5 font-mono font-bold text-emerald-400">
                                  +{formatCurrency(record.calculatedDailyAmountEUR)}
                                </td>
                                <td className="py-3 px-3.5">
                                  <span className={`inline-flex items-center gap-1 text-[9.5px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${recBadge.badgeClass}`}>
                                    {recBadge.label}
                                  </span>
                                  {record.failureReason && (
                                    <span className="block text-[10px] text-rose-400 mt-1 max-w-xs truncate" title={record.failureReason}>
                                      {record.failureReason}
                                    </span>
                                  )}
                                </td>
                                <td className="py-3 px-3.5 font-mono text-[11px] text-gray-400">
                                  {record.reference}
                                </td>
                                <td className="py-3 px-3.5 font-mono text-[10px] text-gray-400">
                                  {record.transactionId ? (
                                    <span className="text-emerald-400 flex items-center gap-1">
                                      <Receipt className="w-3 h-3" />
                                      <span>{record.transactionId}</span>
                                    </span>
                                  ) : (
                                    <span className="text-gray-400 italic">Scheduled Batch</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {!isHistoryExpanded && filteredHistory.length > 4 && (
                    <div className="text-center pt-1">
                      <button
                        type="button"
                        onClick={() => setExpandedHistoryPropId(summary.propertyId)}
                        className="text-xs text-gray-400 hover:text-white underline cursor-pointer"
                      >
                        Show {filteredHistory.length - 4} more daily payment records for {summary.tokenTicker} &darr;
                      </button>
                    </div>
                  )}
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* Financial Transparency Disclosure Footnote */}
      <div className="p-4 rounded-2xl bg-black/30 border border-white/[0.06] text-xs text-gray-400 space-y-1.5 leading-relaxed">
        <div className="flex items-center gap-1.5 font-bold text-gray-300">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Financial Integrity &amp; Strict Synchronization Compliance</span>
        </div>
        <p className="text-[11px]">
          Daily distributions are calculated solely from verified tenant rental income held in regulated escrow accounts. Projected amounts indicate underwritten contractual annual APY split over 365 days; only amounts marked &ldquo;Paid &amp; Settled&rdquo; have cleared to your investor wallet with an immutable ledger transaction. If a property&apos;s available rental reserves are insufficient, the payout status reflects &ldquo;Pending Funds&rdquo; rather than fabricating an artificial return.
        </p>
      </div>

    </div>
  );
};
