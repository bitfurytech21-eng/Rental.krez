import React, { useState, useEffect } from 'react';
import { distributionApi } from '../../lib/api';
import { 
  PropertyDailyPaymentConfig, 
  DailyPaymentRecord, 
  DistributionPaymentStatus, 
  DailyPaymentRunResult,
  PropertyPaymentScheduleType
} from '../../types/distribution';
import { getDistributionStatusBadge } from '../../lib/distributionService';
import { formatCurrency, formatDate, formatPercent } from '../../lib/utils';
import { 
  Coins, 
  ShieldCheck, 
  Play, 
  Pause, 
  RotateCcw, 
  Edit3, 
  Download, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  AlertTriangle,
  History,
  Calendar,
  Building2,
  Users,
  Search,
  Filter,
  Receipt,
  FileSpreadsheet,
  Check,
  X
} from 'lucide-react';

export const AdminPaymentDistributionManager: React.FC = () => {
  const [configs, setConfigs] = useState<PropertyDailyPaymentConfig[]>([]);
  const [records, setRecords] = useState<DailyPaymentRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Filter states
  const [propertyFilter, setPropertyFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchUserQuery, setSearchUserQuery] = useState<string>('');

  // Edit Config Modal State
  const [editingConfig, setEditingConfig] = useState<PropertyDailyPaymentConfig | null>(null);
  const [editAnnualYield, setEditAnnualYield] = useState<number>(10);
  const [editDailyPercent, setEditDailyPercent] = useState<number>(0.027397);
  const [editSchedule, setEditSchedule] = useState<PropertyPaymentScheduleType>('daily');
  const [editAvailableFunds, setEditAvailableFunds] = useState<number>(50000);
  const [editNotes, setEditNotes] = useState<string>('');
  const [isSavingConfig, setIsSavingConfig] = useState<boolean>(false);

  // Process Run Modal State
  const [isProcessModalOpen, setIsProcessModalOpen] = useState<boolean>(false);
  const [runTargetPropertyId, setRunTargetPropertyId] = useState<string>('all');
  const [runTargetDate, setRunTargetDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [isExecutingRun, setIsExecutingRun] = useState<boolean>(false);
  const [lastRunResult, setLastRunResult] = useState<DailyPaymentRunResult | null>(null);

  // Payment Record Adjustment State
  const [adjustingRecord, setAdjustingRecord] = useState<DailyPaymentRecord | null>(null);
  const [adjustAmount, setAdjustAmount] = useState<number>(0);
  const [adjustStatus, setAdjustStatus] = useState<DistributionPaymentStatus>('paid');
  const [adjustReason, setAdjustReason] = useState<string>('');
  const [isSubmittingAdjustment, setIsSubmittingAdjustment] = useState<boolean>(false);

  // Status Toggle Modal State
  const [togglingProperty, setTogglingProperty] = useState<PropertyDailyPaymentConfig | null>(null);
  const [toggleTargetStatus, setToggleTargetStatus] = useState<'active' | 'suspended' | 'paused'>('suspended');
  const [toggleReason, setToggleReason] = useState<string>('');
  const [isSubmittingToggle, setIsSubmittingToggle] = useState<boolean>(false);

  const loadData = async () => {
    try {
      setLoading(true);
      setActionError(null);
      const [configsRes, recordsRes] = await Promise.all([
        distributionApi.getAdminConfigs(),
        distributionApi.getAdminRecords()
      ]);

      if (configsRes?.data) {
        setConfigs(configsRes.data);
      }
      if (recordsRes?.data?.records) {
        setRecords(recordsRes.data.records);
      }
    } catch (err: any) {
      setActionError(err?.message || 'Failed to load property payment configurations.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenEdit = (config: PropertyDailyPaymentConfig) => {
    setEditingConfig(config);
    setEditAnnualYield(config.approvedAnnualPercent);
    setEditDailyPercent(config.approvedDailyPercent);
    setEditSchedule(config.schedule);
    setEditAvailableFunds(config.availableDistributableFundsEUR);
    setEditNotes(config.notes || '');
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingConfig) return;
    try {
      setIsSavingConfig(true);
      setActionError(null);
      const res = await distributionApi.updateAdminConfig(editingConfig.propertyId, {
        approvedAnnualPercent: Number(editAnnualYield),
        approvedDailyPercent: Number(editDailyPercent),
        schedule: editSchedule,
        availableDistributableFundsEUR: Number(editAvailableFunds),
        notes: editNotes
      });

      setActionSuccess(res?.message || `Updated terms for ${editingConfig.propertyTitle}`);
      setEditingConfig(null);
      loadData();
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err: any) {
      setActionError(err?.message || 'Failed to update property terms.');
    } finally {
      setIsSavingConfig(false);
    }
  };

  const handleOpenToggle = (config: PropertyDailyPaymentConfig, target: 'active' | 'suspended' | 'paused') => {
    setTogglingProperty(config);
    setToggleTargetStatus(target);
    setToggleReason('');
  };

  const handleConfirmToggle = async () => {
    if (!togglingProperty) return;
    try {
      setIsSubmittingToggle(true);
      setActionError(null);
      const res = await distributionApi.togglePropertyStatus(
        togglingProperty.propertyId,
        toggleTargetStatus,
        toggleReason || `Administrative ${toggleTargetStatus} action`
      );

      setActionSuccess(res?.message || `Status updated for ${togglingProperty.propertyTitle}`);
      setTogglingProperty(null);
      loadData();
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err: any) {
      setActionError(err?.message || 'Failed to update property status.');
    } finally {
      setIsSubmittingToggle(false);
    }
  };

  const handleExecuteProcessRun = async () => {
    try {
      setIsExecutingRun(true);
      setActionError(null);
      const res = await distributionApi.processDailyRun({
        propertyId: runTargetPropertyId === 'all' ? undefined : runTargetPropertyId,
        targetDate: runTargetDate
      });

      if (res?.data) {
        setLastRunResult(res.data);
        setActionSuccess(`Daily payment run completed for ${res.data.date}: €${res.data.totalDisbursedEUR.toFixed(2)} disbursed across ${res.data.successfulPaymentsCount} payments.`);
        loadData();
        setTimeout(() => setActionSuccess(null), 6000);
      }
    } catch (err: any) {
      setActionError(err?.message || 'Failed to execute daily payment run.');
    } finally {
      setIsExecutingRun(false);
    }
  };

  const handleOpenAdjust = (rec: DailyPaymentRecord) => {
    setAdjustingRecord(rec);
    setAdjustAmount(rec.calculatedDailyAmountEUR);
    setAdjustStatus(rec.status);
    setAdjustReason('');
  };

  const handleSaveAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustingRecord) return;
    if (!adjustReason || adjustReason.trim().length < 5) {
      setActionError('Administrative correction reason (minimum 5 characters) is required.');
      return;
    }
    try {
      setIsSubmittingAdjustment(true);
      setActionError(null);
      const res = await distributionApi.adjustRecord(adjustingRecord.id, {
        amountEUR: Number(adjustAmount),
        status: adjustStatus,
        reason: adjustReason
      });

      setActionSuccess(res?.message || `Record ${adjustingRecord.id} adjusted.`);
      setAdjustingRecord(null);
      loadData();
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err: any) {
      setActionError(err?.message || 'Failed to adjust payment record.');
    } finally {
      setIsSubmittingAdjustment(false);
    }
  };

  const handleDownloadCsv = (propId?: string) => {
    const url = distributionApi.getExportUrl(propId === 'all' ? undefined : propId, 'csv');
    window.open(url, '_blank');
  };

  // Calculations for Admin Overview
  const totalAvailableReserves = configs.reduce((sum, c) => sum + c.availableDistributableFundsEUR, 0);
  const totalDistributedAllTime = configs.reduce((sum, c) => sum + c.totalDistributedToDateEUR, 0);
  const totalDailyBurn = configs
    .filter(c => c.status === 'active')
    .reduce((sum, c) => sum + (c.totalTokens * c.tokenPriceEUR * (c.approvedDailyPercent / 100)), 0);

  const filteredRecords = records.filter(r => {
    if (propertyFilter !== 'all' && r.propertyId !== propertyFilter) return false;
    if (statusFilter !== 'all' && r.status !== statusFilter) return false;
    if (searchUserQuery.trim()) {
      const q = searchUserQuery.toLowerCase();
      return r.userName.toLowerCase().includes(q) || r.userEmail.toLowerCase().includes(q) || r.reference.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* Notifications */}
      {actionSuccess && (
        <div className="p-4 bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 rounded-2xl flex items-center justify-between text-xs font-semibold">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{actionSuccess}</span>
          </div>
          <button onClick={() => setActionSuccess(null)} className="text-gray-400 hover:text-white cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {actionError && (
        <div className="p-4 bg-rose-500/15 border border-rose-500/30 text-rose-300 rounded-2xl flex items-center justify-between text-xs font-semibold">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{actionError}</span>
          </div>
          <button onClick={() => setActionError(null)} className="text-gray-400 hover:text-white cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Admin Command Header */}
      <div className="bg-[#12181d] border border-white/[0.08] p-5 sm:p-6 rounded-3xl shadow-xl flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold uppercase tracking-wider">
              <ShieldCheck className="w-3 h-3" /> Administrative Governance
            </span>
            <span className="text-xs text-gray-400 font-mono">
              Daily Distribution Engine v2.4
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Property Payment Distribution &amp; Schedule Controller
          </h2>
          <p className="text-xs text-gray-400 max-w-2xl leading-relaxed mt-1">
            Authoritative control over individual property payment percentages, daily calculation schedules, user allocation entitlements, manual adjustments, and instant batch disbursements.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start lg:self-center">
          <button
            type="button"
            onClick={loadData}
            disabled={loading}
            className="py-2.5 px-3.5 bg-white/5 hover:bg-white/10 text-white rounded-xl border border-white/10 text-xs font-semibold flex items-center gap-2 transition cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-emerald-400 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setRunTargetPropertyId('all');
              setRunTargetDate(new Date().toISOString().split('T')[0]);
              setIsProcessModalOpen(true);
            }}
            className="py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition shadow-lg shadow-emerald-900/30 cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Process Daily Payment Run</span>
          </button>

          <button
            type="button"
            onClick={() => handleDownloadCsv('all')}
            className="py-2.5 px-3.5 bg-white/5 hover:bg-white/10 text-gray-200 border border-white/10 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
            title="Download complete statement of all properties"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* System KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-[#151515] border border-[#2e2e2e] space-y-1 shadow-lg">
          <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block">
            Active Properties Managed
          </span>
          <div className="text-xl sm:text-2xl font-bold font-mono text-white">
            {configs.filter(c => c.status === 'active').length} / {configs.length}
          </div>
          <span className="text-[10.5px] text-gray-400 block">Separated daily schedules</span>
        </div>

        <div className="p-4 rounded-2xl bg-[#151515] border border-[#2e2e2e] space-y-1 shadow-lg">
          <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block">
            Verified Distributable Treasury
          </span>
          <div className="text-xl sm:text-2xl font-bold font-mono text-emerald-400">
            {formatCurrency(totalAvailableReserves)}
          </div>
          <span className="text-[10.5px] text-gray-400 block">Across all SPV rental pools</span>
        </div>

        <div className="p-4 rounded-2xl bg-[#151515] border border-[#2e2e2e] space-y-1 shadow-lg">
          <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block">
            Max Daily Run Burn
          </span>
          <div className="text-xl sm:text-2xl font-bold font-mono text-sky-400">
            ~{formatCurrency(totalDailyBurn)}/day
          </div>
          <span className="text-[10.5px] text-gray-400 block">At 100% full subscription</span>
        </div>

        <div className="p-4 rounded-2xl bg-[#151515] border border-[#2e2e2e] space-y-1 shadow-lg">
          <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block">
            Total Distributed All-Time
          </span>
          <div className="text-xl sm:text-2xl font-bold font-mono text-amber-300">
            {formatCurrency(totalDistributedAllTime)}
          </div>
          <span className="text-[10.5px] text-gray-400 block">Contractual yield disbursed</span>
        </div>
      </div>

      {/* Section 1: Property Payment Configurations Table */}
      <div className="bg-[#151515] border border-[#2b2b2b] rounded-3xl overflow-hidden shadow-xl space-y-4 p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#2b2b2b]">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Building2 className="w-4 h-4 text-emerald-400" />
              <span>Individual Property Payment Terms &amp; Schedules</span>
            </h3>
            <p className="text-xs text-gray-400">
              Approved rates, daily schedule types, verified escrow reserves, and suspension toggles.
            </p>
          </div>
          <span className="text-xs text-gray-400 font-mono">
            {configs.length} Configured Properties
          </span>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-[#262626]">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#1f1f1f] text-gray-400 font-semibold uppercase text-[10px] tracking-wider border-b border-[#2b2b2b]">
              <tr>
                <th className="py-3 px-3.5">Property / Ticker</th>
                <th className="py-3 px-3.5">Token Par Value</th>
                <th className="py-3 px-3.5">Approved Annual %</th>
                <th className="py-3 px-3.5">Daily Rate %</th>
                <th className="py-3 px-3.5">Schedule</th>
                <th className="py-3 px-3.5">Available Funds</th>
                <th className="py-3 px-3.5">Status</th>
                <th className="py-3 px-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#222222]">
              {configs.map((c) => {
                const statusBadge = getDistributionStatusBadge(c.status as any);
                return (
                  <tr key={c.propertyId} className="hover:bg-[#1a1a1a] transition-colors">
                    <td className="py-3 px-3.5">
                      <div className="font-bold text-white">{c.propertyTitle}</div>
                      <div className="text-[10.5px] text-emerald-400 font-mono">{c.tokenTicker} · ID: {c.propertyId}</div>
                    </td>
                    <td className="py-3 px-3.5 font-mono text-gray-300">
                      {formatCurrency(c.tokenPriceEUR)}
                      <span className="text-[10px] text-gray-400 block font-normal">({c.totalTokens} tokens)</span>
                    </td>
                    <td className="py-3 px-3.5 font-mono font-bold text-emerald-400">
                      {c.approvedAnnualPercent}% p.a.
                    </td>
                    <td className="py-3 px-3.5 font-mono font-bold text-sky-400">
                      {c.approvedDailyPercent}% / day
                    </td>
                    <td className="py-3 px-3.5 uppercase font-mono text-[10px] text-gray-300">
                      {c.schedule}
                    </td>
                    <td className="py-3 px-3.5 font-mono font-bold text-white">
                      {formatCurrency(c.availableDistributableFundsEUR)}
                    </td>
                    <td className="py-3 px-3.5">
                      <span className={`inline-flex items-center gap-1 text-[9.5px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${statusBadge.badgeClass}`}>
                        {statusBadge.label}
                      </span>
                    </td>
                    <td className="py-3 px-3.5 text-right space-x-1.5 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(c)}
                        className="py-1 px-2.5 bg-white/5 hover:bg-white/10 text-gray-200 border border-white/10 rounded-lg text-xs font-semibold inline-flex items-center gap-1 transition cursor-pointer"
                        title="Edit rate, schedule, or available funds"
                      >
                        <Edit3 className="w-3 h-3 text-emerald-400" />
                        <span>Edit</span>
                      </button>

                      {c.status === 'active' ? (
                        <button
                          type="button"
                          onClick={() => handleOpenToggle(c, 'suspended')}
                          className="py-1 px-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded-lg text-xs font-semibold inline-flex items-center gap-1 transition cursor-pointer"
                          title="Suspend payouts for this property"
                        >
                          <Pause className="w-3 h-3" />
                          <span>Suspend</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleOpenToggle(c, 'active')}
                          className="py-1 px-2.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-lg text-xs font-semibold inline-flex items-center gap-1 transition cursor-pointer"
                          title="Resume payouts for this property"
                        >
                          <Play className="w-3 h-3" />
                          <span>Resume</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          setRunTargetPropertyId(c.propertyId);
                          setRunTargetDate(new Date().toISOString().split('T')[0]);
                          setIsProcessModalOpen(true);
                        }}
                        className="py-1 px-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold inline-flex items-center gap-1 transition cursor-pointer shadow-xs"
                        title="Process payout run for this property alone"
                      >
                        <span>Run Batch</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Section 2: Complete Daily Payment Records & Audit History */}
      <div className="bg-[#151515] border border-[#2b2b2b] rounded-3xl overflow-hidden shadow-xl space-y-4 p-5 sm:p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-[#2b2b2b]">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <History className="w-4 h-4 text-emerald-400" />
              <span>Verifiable Daily Payment Ledger &amp; Adjustments</span>
            </h3>
            <p className="text-xs text-gray-400">
              Audit trail of every payment calculated, approved, credited, or failed.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                placeholder="Search investor, email, ref..."
                value={searchUserQuery}
                onChange={(e) => setSearchUserQuery(e.target.value)}
                className="bg-[#1d1d1d] border border-[#333333] text-white pl-8 pr-3 py-1.5 rounded-xl text-xs outline-none focus:border-emerald-500 w-44 sm:w-56"
              />
            </div>

            <select
              value={propertyFilter}
              onChange={(e) => setPropertyFilter(e.target.value)}
              className="bg-[#1d1d1d] border border-[#333333] text-white px-2.5 py-1.5 rounded-xl text-xs outline-none cursor-pointer"
            >
              <option value="all">All Properties</option>
              {configs.map(c => (
                <option key={c.propertyId} value={c.propertyId}>{c.tokenTicker}</option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-[#1d1d1d] border border-[#333333] text-white px-2.5 py-1.5 rounded-xl text-xs outline-none cursor-pointer"
            >
              <option value="all">All Statuses</option>
              <option value="paid">Paid & Settled</option>
              <option value="approved">Approved</option>
              <option value="failed">Failed / Insufficient</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>
        </div>

        {filteredRecords.length === 0 ? (
          <div className="text-center py-8 text-xs text-gray-400 bg-[#1a1a1a] rounded-2xl border border-[#262626]">
            No payment distribution records match the selected query.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-[#262626]">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#1f1f1f] text-gray-400 font-semibold uppercase text-[10px] tracking-wider border-b border-[#2b2b2b]">
                <tr>
                  <th className="py-3 px-3.5">Date</th>
                  <th className="py-3 px-3.5">Property</th>
                  <th className="py-3 px-3.5">Investor Name / Email</th>
                  <th className="py-3 px-3.5">Units Owned</th>
                  <th className="py-3 px-3.5">Allocated Capital</th>
                  <th className="py-3 px-3.5">Amount (EUR)</th>
                  <th className="py-3 px-3.5">Status</th>
                  <th className="py-3 px-3.5">Reference / TxID</th>
                  <th className="py-3 px-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#222222]">
                {filteredRecords.slice(0, 50).map((r) => {
                  const badge = getDistributionStatusBadge(r.status);
                  return (
                    <tr key={r.id} className="hover:bg-[#1a1a1a] transition-colors">
                      <td className="py-3 px-3.5 font-mono text-gray-200">
                        {r.date}
                      </td>
                      <td className="py-3 px-3.5">
                        <span className="font-bold text-white block">{r.tokenTicker}</span>
                        <span className="text-[10.5px] text-gray-400 block truncate max-w-[140px]">{r.propertyTitle}</span>
                      </td>
                      <td className="py-3 px-3.5">
                        <span className="font-semibold text-gray-200 block">{r.userName}</span>
                        <span className="text-[10px] text-gray-400 block font-mono">{r.userEmail}</span>
                      </td>
                      <td className="py-3 px-3.5 font-mono text-gray-300">
                        {r.userTokensCount} units ({r.userOwnershipPercent}%)
                      </td>
                      <td className="py-3 px-3.5 font-mono text-gray-300">
                        {formatCurrency(r.userAllocatedInvestmentEUR)}
                      </td>
                      <td className="py-3 px-3.5 font-mono font-bold text-emerald-400">
                        +{formatCurrency(r.calculatedDailyAmountEUR)}
                        {r.originalAmountEUR && (
                          <span className="block text-[9.5px] text-amber-400/80 line-through">
                            {formatCurrency(r.originalAmountEUR)}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3.5">
                        <span className={`inline-flex items-center gap-1 text-[9.5px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${badge.badgeClass}`}>
                          {badge.label}
                        </span>
                        {r.failureReason && (
                          <span className="block text-[10px] text-rose-400 mt-1 max-w-xs truncate" title={r.failureReason}>
                            {r.failureReason}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3.5 font-mono text-[10.5px] text-gray-400">
                        <span className="block text-gray-300">{r.reference}</span>
                        <span className="text-[9.5px] text-gray-400">{r.transactionId || 'No Tx ID'}</span>
                      </td>
                      <td className="py-3 px-3.5 text-right">
                        <button
                          type="button"
                          onClick={() => handleOpenAdjust(r)}
                          className="py-1 px-2.5 bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10 rounded-lg text-xs font-semibold inline-flex items-center gap-1 transition cursor-pointer"
                          title="Correct or adjust this payment record"
                        >
                          <Edit3 className="w-3 h-3 text-sky-400" />
                          <span>Adjust</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL 1: Edit Property Payment Terms */}
      {editingConfig && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#181818] border border-[#333333] rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#2b2b2b]">
              <div>
                <h3 className="text-base font-bold text-white">
                  Edit Property Payment Terms
                </h3>
                <p className="text-xs text-emerald-400 font-mono">
                  {editingConfig.propertyTitle} ({editingConfig.tokenTicker})
                </p>
              </div>
              <button onClick={() => setEditingConfig(null)} className="text-gray-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveConfig} className="space-y-4 text-xs">
              <div>
                <label className="block text-gray-300 font-semibold mb-1">
                  Approved Annual Yield Percentage (% p.a.)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={editAnnualYield}
                  onChange={(e) => {
                    const annual = Number(e.target.value);
                    setEditAnnualYield(annual);
                    setEditDailyPercent(Number((annual / 365).toFixed(6)));
                  }}
                  className="w-full bg-[#101010] border border-[#333333] text-white px-3 py-2 rounded-xl text-xs outline-none focus:border-emerald-500 font-mono"
                  required
                />
                <span className="text-[10.5px] text-gray-400 mt-1 block">
                  Automatically recalculates daily rate: <strong className="text-emerald-400 font-mono">{editDailyPercent}% / day</strong>
                </span>
              </div>

              <div>
                <label className="block text-gray-300 font-semibold mb-1">
                  Payment Calculation Schedule
                </label>
                <select
                  value={editSchedule}
                  onChange={(e) => setEditSchedule(e.target.value as any)}
                  className="w-full bg-[#101010] border border-[#333333] text-white px-3 py-2 rounded-xl text-xs outline-none cursor-pointer"
                >
                  <option value="daily">Daily (365 days / year)</option>
                  <option value="weekdays">Weekdays (Monday - Friday business days)</option>
                  <option value="monthly_accrual">Monthly Accrual on 1st</option>
                </select>
              </div>

              <div>
                <label className="block text-gray-300 font-semibold mb-1">
                  Verified Distributable Rental Reserve in Treasury (€ EUR)
                </label>
                <input
                  type="number"
                  step="100"
                  min="0"
                  value={editAvailableFunds}
                  onChange={(e) => setEditAvailableFunds(Number(e.target.value))}
                  className="w-full bg-[#101010] border border-[#333333] text-white px-3 py-2 rounded-xl text-xs outline-none focus:border-emerald-500 font-mono"
                  required
                />
                <span className="text-[10.5px] text-gray-400 mt-1 block">
                  Financial Integrity Rule: Payouts are checked against this reserve. If funds are insufficient, payments show as &ldquo;Pending Funds&rdquo;.
                </span>
              </div>

              <div>
                <label className="block text-gray-300 font-semibold mb-1">
                  Administrative Governance Notes
                </label>
                <textarea
                  rows={2}
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="e.g. Q4 rental dividend approved by notarial SPV board..."
                  className="w-full bg-[#101010] border border-[#333333] text-white px-3 py-2 rounded-xl text-xs outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#2b2b2b]">
                <button
                  type="button"
                  onClick={() => setEditingConfig(null)}
                  className="py-2.5 px-4 bg-white/5 hover:bg-white/10 text-gray-300 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingConfig}
                  className="py-2.5 px-5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition shadow-lg cursor-pointer"
                >
                  {isSavingConfig ? 'Saving Terms...' : 'Save & Authorize Terms'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Process Daily Payment Run */}
      {isProcessModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#181818] border border-[#333333] rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#2b2b2b]">
              <div>
                <h3 className="text-base font-bold text-white">
                  Execute Daily Payment Processing Run
                </h3>
                <p className="text-xs text-gray-400">
                  Idempotent batch execution with automatic balance credits
                </p>
              </div>
              <button onClick={() => setIsProcessModalOpen(false)} className="text-gray-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="p-3 bg-blue-500/10 border border-blue-500/20 text-blue-300 rounded-xl leading-relaxed">
                <strong className="block font-bold mb-0.5">Idempotency &amp; Anti-Duplicate Protection:</strong>
                Each investor-property-date payment is locked with a unique key. If already processed, the engine will safely skip without double-crediting.
              </div>

              <div>
                <label className="block text-gray-300 font-semibold mb-1">
                  Target Property Asset
                </label>
                <select
                  value={runTargetPropertyId}
                  onChange={(e) => setRunTargetPropertyId(e.target.value)}
                  className="w-full bg-[#101010] border border-[#333333] text-white px-3 py-2 rounded-xl text-xs outline-none cursor-pointer"
                >
                  <option value="all">All Active Properties ({configs.filter(c => c.status === 'active').length})</option>
                  {configs.map(c => (
                    <option key={c.propertyId} value={c.propertyId}>
                      {c.propertyTitle} ({c.tokenTicker}) · Reserve: €{c.availableDistributableFundsEUR.toLocaleString()}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-gray-300 font-semibold mb-1">
                  Distribution Accounting Date
                </label>
                <input
                  type="date"
                  value={runTargetDate}
                  onChange={(e) => setRunTargetDate(e.target.value)}
                  className="w-full bg-[#101010] border border-[#333333] text-white px-3 py-2 rounded-xl text-xs outline-none focus:border-emerald-500 font-mono"
                />
              </div>

              {lastRunResult && (
                <div className="p-3 bg-[#111111] border border-[#2b2b2b] rounded-xl space-y-1 font-mono text-[11px]">
                  <div className="text-emerald-400 font-bold">Last Run Result ({lastRunResult.date}):</div>
                  <div>Successful Payments: {lastRunResult.successfulPaymentsCount}</div>
                  <div>Total Disbursed: €{lastRunResult.totalDisbursedEUR.toFixed(2)}</div>
                  <div>Skipped (Duplicates): {lastRunResult.skippedDuplicateCount}</div>
                  {lastRunResult.failedPaymentsCount > 0 && (
                    <div className="text-rose-400">Failed (Insufficient Funds): {lastRunResult.failedPaymentsCount}</div>
                  )}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#2b2b2b]">
                <button
                  type="button"
                  onClick={() => setIsProcessModalOpen(false)}
                  className="py-2.5 px-4 bg-white/5 hover:bg-white/10 text-gray-300 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={handleExecuteProcessRun}
                  disabled={isExecutingRun}
                  className="py-2.5 px-5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition shadow-lg flex items-center gap-2 cursor-pointer"
                >
                  {isExecutingRun ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Executing Run...</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Authorize &amp; Execute Run</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Adjust / Correct Payment Record */}
      {adjustingRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#181818] border border-[#333333] rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#2b2b2b]">
              <div>
                <h3 className="text-base font-bold text-white">
                  Payment Adjustment &amp; Correction
                </h3>
                <p className="text-xs text-sky-400 font-mono">
                  Ref: {adjustingRecord.reference} · {adjustingRecord.propertyTitle}
                </p>
              </div>
              <button onClick={() => setAdjustingRecord(null)} className="text-gray-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAdjustment} className="space-y-4 text-xs">
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-300 rounded-xl">
                Investor: <strong className="text-white">{adjustingRecord.userName} ({adjustingRecord.userEmail})</strong>
                <span className="block text-[11px] text-gray-400 mt-0.5">
                  Holding {adjustingRecord.userTokensCount} units ({adjustingRecord.userOwnershipPercent}% ownership)
                </span>
              </div>

              <div>
                <label className="block text-gray-300 font-semibold mb-1">
                  Adjusted Daily Payment Amount (€ EUR)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={adjustAmount}
                  onChange={(e) => setAdjustAmount(Number(e.target.value))}
                  className="w-full bg-[#101010] border border-[#333333] text-white px-3 py-2 rounded-xl text-xs outline-none focus:border-emerald-500 font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-gray-300 font-semibold mb-1">
                  Payment Status
                </label>
                <select
                  value={adjustStatus}
                  onChange={(e) => setAdjustStatus(e.target.value as any)}
                  className="w-full bg-[#101010] border border-[#333333] text-white px-3 py-2 rounded-xl text-xs outline-none cursor-pointer"
                >
                  <option value="paid">Paid & Settled</option>
                  <option value="approved">Approved</option>
                  <option value="processing">Processing</option>
                  <option value="accrued">Accrued</option>
                  <option value="failed">Failed / Insufficient Funds</option>
                  <option value="suspended">Suspended</option>
                </select>
              </div>

              <div>
                <label className="block text-gray-300 font-semibold mb-1">
                  Mandatory Administrative Audit Reason (Required)
                </label>
                <textarea
                  rows={2}
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  placeholder="State the reason for this manual correction..."
                  className="w-full bg-[#101010] border border-[#333333] text-white px-3 py-2 rounded-xl text-xs outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#2b2b2b]">
                <button
                  type="button"
                  onClick={() => setAdjustingRecord(null)}
                  className="py-2.5 px-4 bg-white/5 hover:bg-white/10 text-gray-300 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingAdjustment}
                  className="py-2.5 px-5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold transition shadow-lg cursor-pointer"
                >
                  {isSubmittingAdjustment ? 'Saving Correction...' : 'Save & Commit Adjustment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: Suspend / Resume Confirmation */}
      {togglingProperty && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#181818] border border-[#333333] rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">
                  Confirm Status Change
                </h3>
                <p className="text-xs text-gray-400">
                  {togglingProperty.propertyTitle} ({togglingProperty.tokenTicker})
                </p>
              </div>
            </div>

            <p className="text-xs text-gray-300 leading-relaxed">
              Are you sure you want to change payout status to <strong className="text-white uppercase">{toggleTargetStatus}</strong>? 
              {toggleTargetStatus === 'suspended' ? ' Daily payouts will not be processed for this property until resumed.' : ' Payouts will resume on the next scheduled run.'}
            </p>

            <div>
              <label className="block text-gray-400 text-xs font-semibold mb-1">
                Reason for status change:
              </label>
              <input
                type="text"
                value={toggleReason}
                onChange={(e) => setToggleReason(e.target.value)}
                placeholder="e.g. Annual lease renewal audit..."
                className="w-full bg-[#101010] border border-[#333333] text-white px-3 py-2 rounded-xl text-xs outline-none focus:border-emerald-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#2b2b2b]">
              <button
                type="button"
                onClick={() => setTogglingProperty(null)}
                className="py-2.5 px-4 bg-white/5 hover:bg-white/10 text-gray-300 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmToggle}
                disabled={isSubmittingToggle}
                className={`py-2.5 px-5 rounded-xl text-xs font-bold transition shadow-lg cursor-pointer ${
                  toggleTargetStatus === 'suspended'
                    ? 'bg-rose-600 hover:bg-rose-500 text-white'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                }`}
              >
                {isSubmittingToggle ? 'Updating...' : `Confirm ${toggleTargetStatus.toUpperCase()}`}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
