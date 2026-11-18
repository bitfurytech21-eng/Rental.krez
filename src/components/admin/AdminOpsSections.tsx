import React, { useMemo, useState } from 'react';
import {
  Building2,
  XCircle,
  Eye,
  Plus,
  Search,
  Download,
  Bell,
  Send,
  FileText,
  SlidersHorizontal,
  X,
  RefreshCw,
  Trash2,
  Upload,
  Coins,
  Briefcase,
  Shield,
  ClipboardList,
  CheckCircle2,
  Edit3,
} from 'lucide-react';
import { Property, PropertyStatus, PropertyType } from '../../types/property';
import { User as PlatformUser } from '../../types/user';
import { ledger } from '../../lib/ledger';
import { adminApi } from '../../lib/api';
import { formatDate } from '../../lib/utils';
import { PropertyDocumentsHub } from '../documents/PropertyDocumentsHub';
import {
  AuditLogRow,
  InvestmentRequestRow,
  InvestorDocumentRow,
  KycSubmissionRow,
  PastDistributionRow,
  allocateProportionalCents,
  approveInvestmentRequestRpc,
  assignStaffRoleRpc,
  centsToEur,
  createPrivateBucketSignedUrl,
  deleteInvestorDocumentRecord,
  eurToCents,
  executePayDistribution,
  formatCentsEur,
  parseStrictEurToCents,
  recordInvestmentRpc,
  rejectInvestmentRequestRpc,
  reviewKycSubmission,
  sendAdminNotificationRecord,
  uploadPdfToDocumentsBucket,
  uploadPropertyPhotoFile,
  upsertSupabaseProperty,
} from './adminSupabaseGateway';
import { getStaffRoleLabel } from './adminRbac';
import { AdminActionDialog, useDialogFocus } from './AdminActionDialog';

export interface AdminNotificationRecord {
  id: string;
  userId: string;
  userEmail?: string;
  userName?: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning';
  read: boolean;
  createdAt: string;
}

const triggerCsvDownload = (filename: string, headers: string[], rows: (string | number)[][]) => {
  const escape = (val: string | number) => {
    const str = String(val ?? '');
    return str.includes(',') || str.includes('"') || str.includes('\n')
      ? `"${str.replace(/"/g, '""')}"`
      : str;
  };
  const csv = [headers.join(','), ...rows.map((r) => r.map(escape).join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

// ============================================================================
// 6. PROPERTIES SECTION
// ============================================================================
export const AdminPropertiesSection: React.FC<{
  properties: Property[];
  onRefresh: () => void;
  onSuccess: (msg: string) => void;
  onError: (msg: string) => void;
}> = ({ properties, onRefresh, onSuccess, onError }) => {
  const [filter, setFilter] = useState<'all' | 'open' | 'draft' | 'closed'>('all');
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const propertyModalRef = useDialogFocus<HTMLFormElement>(formOpen, () => setFormOpen(false), saving);

  // Full schema fields matching Supabase `properties`
  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [type, setType] = useState<string>('Residential');
  const [sharePriceEur, setSharePriceEur] = useState<number>(500);
  const [fundingTargetEur, setFundingTargetEur] = useState<number>(500000);
  const [targetYield, setTargetYield] = useState<number>(8.5);
  const [targetIrr, setTargetIrr] = useState<number>(12.5);
  const [term, setTerm] = useState<string>('36 months');
  const [description, setDescription] = useState<string>('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [photoUrlInput, setPhotoUrlInput] = useState<string>('');
  const [fundedPct, setFundedPct] = useState<number>(0);
  const [status, setStatus] = useState<'draft' | 'open' | 'closed'>('open');

  const toCanonicalStatus = (raw: string): 'draft' | 'open' | 'closed' => {
    const s = String(raw || '').toLowerCase();
    if (s === 'draft' || s === 'upcoming' || s === 'hidden' || s === 'pending_approval') return 'draft';
    if (s === 'closed' || s === 'funded' || s === 'exited') return 'closed';
    return 'open';
  };

  const openAddForm = () => {
    setEditingId(null);
    setName('');
    setCity('');
    setType('Residential');
    setSharePriceEur(500);
    setFundingTargetEur(500000);
    setTargetYield(8.5);
    setTargetIrr(12.5);
    setTerm('36 months');
    setDescription('');
    setPhotos([]);
    setPhotoUrlInput('');
    setFundedPct(0);
    setStatus('open');
    setFormOpen(true);
  };

  const openEditForm = (p: Property) => {
    setEditingId(p.id);
    setName(p.title);
    setCity(p.city || p.location || '');
    setType(p.type || 'Residential');
    setSharePriceEur(Number(p.tokenPrice || 500));
    setFundingTargetEur(Number(p.targetAmount || 500000));
    setTargetYield(Number(p.estimatedAnnualYield || 8.5));
    setTargetIrr(Number(p.totalEstimatedReturn || (Number(p.estimatedAnnualYield || 0) + Number(p.capitalAppreciationYield || 0)) || 12.5));
    setTerm(p.durationMonths ? `${p.durationMonths} months` : '36 months');
    setDescription(p.description || '');
    setPhotos(Array.isArray(p.images) ? p.images : []);
    setPhotoUrlInput('');
    const calcPct =
      (p as any).funded_pct !== undefined
        ? Number((p as any).funded_pct)
        : p.targetAmount > 0
        ? Math.min(100, Math.round((p.fundedAmount / p.targetAmount) * 100))
        : 0;
    setFundedPct(calcPct);
    setStatus(toCanonicalStatus(p.status));
    setFormOpen(true);
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setUploadingPhoto(true);
    try {
      const uploaded: string[] = [];
      for (const file of files) {
        const url = await uploadPropertyPhotoFile(file);
        if (url) uploaded.push(url);
      }
      setPhotos((prev) => [...prev, ...uploaded]);
    } catch (err: any) {
      onError(err?.message || 'Unable to upload photo.');
    } finally {
      setUploadingPhoto(false);
      e.target.value = '';
    }
  };

  const handleSaveProperty = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !city.trim() || sharePriceEur <= 0 || fundingTargetEur <= 0) {
      onError('Property name, city, share price, and funding target are required.');
      return;
    }
    setSaving(true);
    try {
      const sharePriceCents = eurToCents(sharePriceEur);
      const fundingTargetCents = eurToCents(fundingTargetEur);
      const savedRow = await upsertSupabaseProperty(
        {
          name: name.trim(),
          city: city.trim(),
          type: type.trim() || 'Residential',
          share_price_cents: sharePriceCents,
          funding_target_cents: fundingTargetCents,
          target_yield: Number(targetYield),
          target_irr: Number(targetIrr),
          term: term.trim() || '36 months',
          description: description.trim(),
          photos,
          funded_pct: Math.min(100, Math.max(0, Math.round(Number(fundedPct)))),
          status,
        },
        editingId || undefined
      );

      const legacyStatus: PropertyStatus =
        status === 'draft' ? 'upcoming' : status === 'closed' ? 'funded' : 'funding';
      const totalTokens = Math.max(1, Math.floor(fundingTargetEur / Math.max(1, sharePriceEur)));
      const fundedAmount = Math.round((fundingTargetEur * (fundedPct / 100)) * 100) / 100;
      const termMonths = parseInt(term, 10) || 36;

      if (editingId) {
        await adminApi
          .updateProperty(editingId, {
            title: name.trim(),
            city: city.trim(),
            location: city.trim(),
            type,
            status: legacyStatus,
            targetAmount: fundingTargetEur,
            fundedAmount,
            tokenPrice: sharePriceEur,
            estimatedAnnualYield: targetYield,
            description: description.trim(),
            images: photos,
          })
          .catch(() => null);
      } else {
        await adminApi
          .createProperty({
            title: name.trim(),
            location: city.trim(),
            type,
            status: legacyStatus,
            targetAmount: fundingTargetEur,
            tokenPrice: sharePriceEur,
            totalTokens,
            availableTokens: totalTokens,
            estimatedAnnualYield: targetYield,
            capitalAppreciationYield: Math.max(0, Number((targetIrr - targetYield).toFixed(1))),
            holdingPeriodMonths: termMonths,
            description: description.trim(),
            images: photos,
          })
          .catch(() => null);
      }

      const existingLocal = editingId ? ledger.getPropertyById(editingId) : undefined;
      ledger.saveProperty({
        ...(existingLocal || ({} as any)),
        id: savedRow?.id || editingId || `prop-${Date.now().toString(36)}`,
        slug: name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        title: name.trim(),
        city: city.trim(),
        location: city.trim(),
        country: existingLocal?.country || 'Europe',
        type: type as PropertyType,
        status: legacyStatus,
        images: photos.length > 0 ? photos : existingLocal?.images || [],
        bannerImage: photos[0] || existingLocal?.bannerImage || '',
        targetAmount: fundingTargetEur,
        fundedAmount,
        tokenPrice: sharePriceEur,
        totalTokens,
        availableTokens: Math.max(0, Math.round(totalTokens * (1 - fundedPct / 100))),
        estimatedAnnualYield: targetYield,
        capitalAppreciationYield: Math.max(0, Number((targetIrr - targetYield).toFixed(1))),
        totalEstimatedReturn: targetIrr,
        durationMonths: termMonths,
        minimumInvestment: sharePriceEur,
        distributionFrequency: 'Monthly',
        tokenTicker: existingLocal?.tokenTicker || `KTZ-${name.trim().slice(0, 3).toUpperCase()}`,
        blockchainNetwork: 'Polygon POS',
        tokenContractAddress: existingLocal?.tokenContractAddress || '0x0000000000000000000000000000000000000000',
        description: description.trim(),
        investmentStructure: 'Tokenized SPV',
        highlights: existingLocal?.highlights || ['Notarized SPV ownership'],
        risks: existingLocal?.risks || ['Real estate market fluctuations'],
        exitStrategy: existingLocal?.exitStrategy || 'Refinancing or asset sale at term',
        feeStructure: existingLocal?.feeStructure || { structuringFee: '3.5%', managementFee: '10%', withdrawalFee: '0%', exitFee: '0%' },
        paymentSchedule: existingLocal?.paymentSchedule || { distributionFrequency: 'Monthly', payoutDate: '1st of month', annualReconciliation: 'February', maturityTerms: term },
        financialBreakdown: existingLocal?.financialBreakdown || {
          propertyPrice: Math.round(fundingTargetEur * 0.8),
          refurbishmentBudget: Math.round(fundingTargetEur * 0.1),
          legalAndClosingCosts: Math.round(fundingTargetEur * 0.06),
          operatingReserve: Math.round(fundingTargetEur * 0.04),
          totalProjectCost: fundingTargetEur,
          projectedAnnualGrossRent: Math.round(fundingTargetEur * (targetYield / 100) * 1.15),
          estimatedOperatingExpenses: Math.round(fundingTargetEur * (targetYield / 100) * 0.15),
          projectedAnnualNetRent: Math.round(fundingTargetEur * (targetYield / 100)),
          estimatedNetYield: targetYield,
          estimatedCapitalGainYield: Math.max(0, Number((targetIrr - targetYield).toFixed(1))),
          totalEstimatedYield: targetIrr,
        },
        documents: existingLocal?.documents || [],
        investorCount: existingLocal?.investorCount || 0,
        createdAt: existingLocal?.createdAt || new Date().toISOString(),
        approvedForFrontend: status === 'open',
      });

      setFormOpen(false);
      onSuccess(editingId ? `Updated property "${name.trim()}".` : `Created property "${name.trim()}".`);
      onRefresh();
    } catch (err: any) {
      onError(err?.message || 'Unable to save property.');
    } finally {
      setSaving(false);
    }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return properties.filter((p) => {
      const st = toCanonicalStatus(p.status);
      if (filter !== 'all' && st !== filter) return false;
      if (q && !p.title.toLowerCase().includes(q) && !(p.city || p.location).toLowerCase().includes(q)) return false;
      return true;
    });
  }, [properties, filter, search]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 id="admin-main-heading" data-admin-queue-focus tabIndex={-1} className="text-lg font-bold text-[#F2F5F4] tracking-tight focus:outline-none">Properties</h2>
          <p className="text-xs text-[#8FA1A8] mt-1">
            Manage properties (share prices stored in integer cents, funding target, yield, IRR, photos, and draft/open/closed status).
          </p>
        </div>
        <button
          type="button"
          onClick={openAddForm}
          className="min-h-[44px] px-4 py-2.5 rounded-xl bg-[#6FD8B0] hover:bg-[#5ec8a0] text-[#0B0F10] text-xs font-bold flex items-center gap-2 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add Property</span>
        </button>
      </div>

      {/* Filters */}
      <div className="bg-[#121A1F] p-4 rounded-2xl border border-[#1F2C33] flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8FA1A8]" />
          <input
            id="prop-search"
            type="text"
            aria-label="Search property name or city"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search property name or city..."
            className="min-h-[44px] w-full pl-9 pr-3 py-2 bg-[#0B0F10] border border-[#1F2C33] rounded-xl text-xs text-[#F2F5F4] placeholder-[#526066]"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {(['all', 'open', 'draft', 'closed'] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`min-h-[44px] px-3.5 py-2 rounded-lg text-xs font-semibold capitalize cursor-pointer ${
                filter === f
                  ? 'bg-[#6FD8B0] text-[#0B0F10]'
                  : 'bg-[#0B0F10] border border-[#1F2C33] text-[#B6C4C9]'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-[#121A1F] rounded-2xl border border-[#1F2C33] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-[#0B0F10] border-b border-[#1F2C33] text-[11px] font-semibold text-[#8FA1A8] uppercase tracking-wider">
                <th className="py-3 px-4">Name / City</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4 text-right">Share Price</th>
                <th className="py-3 px-4 text-right">Target</th>
                <th className="py-3 px-4">Yield / IRR</th>
                <th className="py-3 px-4">Funded %</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Edit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1F2C33]">
              {filtered.map((p) => {
                const pct =
                  (p as any).funded_pct !== undefined
                    ? Number((p as any).funded_pct)
                    : p.targetAmount > 0
                    ? Math.min(100, Math.round((p.fundedAmount / p.targetAmount) * 100))
                    : 0;
                const st = toCanonicalStatus(p.status);
                const irr =
                  p.totalEstimatedReturn ||
                  Number((Number(p.estimatedAnnualYield || 0) + Number(p.capitalAppreciationYield || 0)).toFixed(1));
                return (
                  <tr key={p.id} className="hover:bg-[#162026]">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-[#F2F5F4]">{p.title}</div>
                      <div className="text-[11px] text-[#8FA1A8]">{p.city || p.location}</div>
                    </td>
                    <td className="py-3.5 px-4 text-[#B6C4C9]">{p.type}</td>
                    <td className="py-3.5 px-4 text-right font-mono text-[#F2F5F4] tabular-nums">
                      <div>{formatCentsEur(eurToCents(p.tokenPrice))}</div>
                      <div className="text-[10px] text-[#8FA1A8]">{eurToCents(p.tokenPrice)}¢</div>
                    </td>
                    <td className="py-3.5 px-4 text-right font-semibold text-[#F2F5F4] tabular-nums">
                      {formatCentsEur(eurToCents(p.targetAmount))}
                    </td>
                    <td className="py-3.5 px-4 tabular-nums">
                      <span className="text-[#6FD8B0] font-bold">{p.estimatedAnnualYield}%</span>
                      <span className="text-[#8FA1A8]"> / {irr}% IRR</span>
                    </td>
                    <td className="py-3.5 px-4 min-w-[130px]">
                      <div className="flex items-center justify-between text-[11px] mb-1 tabular-nums">
                        <span className="text-[#F2F5F4] font-semibold">{pct}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-[#0B0F10] rounded-full overflow-hidden">
                        <div className="h-full bg-[#6FD8B0]" style={{ width: `${pct}%` }} />
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`uppercase text-[11px] font-bold ${
                        st === 'open' ? 'text-[#6FD8B0]' : st === 'closed' ? 'text-sky-400' : 'text-amber-400'
                      }`}>
                        {st}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => openEditForm(p)}
                        className="min-h-[44px] px-3.5 py-2 rounded-lg bg-[#0B0F10] border border-[#1F2C33] hover:border-[#6FD8B0] text-[#F2F5F4] text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5 text-[#6FD8B0]" />
                        <span>Edit</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-xs text-[#8FA1A8]">
                    No properties matched your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Property Modal */}
      {formOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <form
            ref={propertyModalRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-label={editingId ? 'Edit Property' : 'Add Property'}
            onSubmit={handleSaveProperty}
            className="bg-[#121A1F] border border-[#1F2C33] rounded-2xl max-w-2xl w-full p-6 space-y-4 my-6 focus:outline-none"
          >
            <div className="flex items-center justify-between pb-3 border-b border-[#1F2C33]">
              <h3 className="text-sm font-bold text-[#F2F5F4] flex items-center gap-2">
                <Building2 className="w-4 h-4 text-[#6FD8B0]" />
                <span>{editingId ? 'Edit Property' : 'Add Property'}</span>
              </h3>
              <button type="button" onClick={() => setFormOpen(false)} aria-label="Close property dialog" className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-[#8FA1A8] hover:text-[#F2F5F4] cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label htmlFor="prop-name-input" className="block text-[#B6C4C9] font-semibold mb-1">Property Name *</label>
                <input
                  id="prop-name-input"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Villa Cap d'Antibes"
                  className="min-h-[44px] w-full px-3 py-2 bg-[#0B0F10] border border-[#1F2C33] rounded-xl text-[#F2F5F4]"
                />
              </div>
              <div>
                <label htmlFor="prop-city-input" className="block text-[#B6C4C9] font-semibold mb-1">City *</label>
                <input
                  id="prop-city-input"
                  type="text"
                  required
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Paris"
                  className="min-h-[44px] w-full px-3 py-2 bg-[#0B0F10] border border-[#1F2C33] rounded-xl text-[#F2F5F4]"
                />
              </div>
              <div>
                <label htmlFor="prop-type-select" className="block text-[#B6C4C9] font-semibold mb-1">Type</label>
                <select
                  id="prop-type-select"
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="min-h-[44px] w-full px-3 py-2 bg-[#0B0F10] border border-[#1F2C33] rounded-xl text-[#F2F5F4]"
                >
                  <option value="Residential">Residential</option>
                  <option value="Commercial">Commercial</option>
                  <option value="Hospitality">Hospitality</option>
                  <option value="Industrial">Industrial</option>
                </select>
              </div>
              <div>
                <label htmlFor="prop-status-select" className="block text-[#B6C4C9] font-semibold mb-1">Status</label>
                <select
                  id="prop-status-select"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as 'draft' | 'open' | 'closed')}
                  className="min-h-[44px] w-full px-3 py-2 bg-[#0B0F10] border border-[#1F2C33] rounded-xl text-[#F2F5F4]"
                >
                  <option value="draft">draft</option>
                  <option value="open">open</option>
                  <option value="closed">closed</option>
                </select>
              </div>

              <div>
                <label htmlFor="prop-share-price" className="block text-[#B6C4C9] font-semibold mb-1">
                  Share Price (EUR — stored as {eurToCents(sharePriceEur).toLocaleString()} cents)
                </label>
                <input
                  id="prop-share-price"
                  type="number"
                  step="0.01"
                  min={1}
                  required
                  value={sharePriceEur}
                  onChange={(e) => setSharePriceEur(Number(e.target.value))}
                  className="min-h-[44px] w-full px-3 py-2 bg-[#0B0F10] border border-[#1F2C33] rounded-xl font-mono text-[#F2F5F4]"
                />
              </div>
              <div>
                <label htmlFor="prop-funding-target" className="block text-[#B6C4C9] font-semibold mb-1">
                  Funding Target (EUR — stored as {eurToCents(fundingTargetEur).toLocaleString()} cents)
                </label>
                <input
                  id="prop-funding-target"
                  type="number"
                  step="1"
                  min={1000}
                  required
                  value={fundingTargetEur}
                  onChange={(e) => setFundingTargetEur(Number(e.target.value))}
                  className="min-h-[44px] w-full px-3 py-2 bg-[#0B0F10] border border-[#1F2C33] rounded-xl font-mono text-[#F2F5F4]"
                />
              </div>

              <div>
                <label htmlFor="prop-target-yield" className="block text-[#B6C4C9] font-semibold mb-1">Target Yield (%)</label>
                <input
                  id="prop-target-yield"
                  type="number"
                  step="0.1"
                  value={targetYield}
                  onChange={(e) => setTargetYield(Number(e.target.value))}
                  className="min-h-[44px] w-full px-3 py-2 bg-[#0B0F10] border border-[#1F2C33] rounded-xl font-mono text-[#F2F5F4]"
                />
              </div>
              <div>
                <label htmlFor="prop-target-irr" className="block text-[#B6C4C9] font-semibold mb-1">Target IRR (%)</label>
                <input
                  id="prop-target-irr"
                  type="number"
                  step="0.1"
                  value={targetIrr}
                  onChange={(e) => setTargetIrr(Number(e.target.value))}
                  className="min-h-[44px] w-full px-3 py-2 bg-[#0B0F10] border border-[#1F2C33] rounded-xl font-mono text-[#F2F5F4]"
                />
              </div>
              <div>
                <label htmlFor="prop-term-input" className="block text-[#B6C4C9] font-semibold mb-1">Term</label>
                <input
                  id="prop-term-input"
                  type="text"
                  value={term}
                  onChange={(e) => setTerm(e.target.value)}
                  placeholder="36 months"
                  className="min-h-[44px] w-full px-3 py-2 bg-[#0B0F10] border border-[#1F2C33] rounded-xl text-[#F2F5F4]"
                />
              </div>
              <div>
                <label htmlFor="prop-funded-pct" className="block text-[#B6C4C9] font-semibold mb-1">Funded % (0–100)</label>
                <input
                  id="prop-funded-pct"
                  type="number"
                  min={0}
                  max={100}
                  value={fundedPct}
                  onChange={(e) => setFundedPct(Number(e.target.value))}
                  className="min-h-[44px] w-full px-3 py-2 bg-[#0B0F10] border border-[#1F2C33] rounded-xl font-mono text-[#F2F5F4]"
                />
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="prop-description-input" className="block text-[#B6C4C9] font-semibold mb-1">Description</label>
                <textarea
                  id="prop-description-input"
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Asset overview, tenant profile, and SPV thesis..."
                  className="w-full p-3 bg-[#0B0F10] border border-[#1F2C33] rounded-xl text-[#F2F5F4]"
                />
              </div>

              {/* Photos upload + URL */}
              <div className="sm:col-span-2 space-y-2">
                <span className="block text-[#B6C4C9] font-semibold">Photos Upload</span>
                <div className="flex flex-wrap items-center gap-2">
                  <label htmlFor="prop-photo-upload" className="min-h-[44px] px-3 py-2 rounded-xl bg-[#0B0F10] border border-[#1F2C33] hover:border-[#6FD8B0] text-xs font-semibold text-[#6FD8B0] inline-flex items-center gap-1.5 cursor-pointer">
                    <Upload className="w-3.5 h-3.5" />
                    <span>{uploadingPhoto ? 'Uploading...' : 'Upload Photo(s)'}</span>
                    <input
                      id="prop-photo-upload"
                      type="file"
                      accept="image/*"
                      multiple
                      disabled={uploadingPhoto}
                      onChange={handlePhotoUpload}
                      className="hidden"
                    />
                  </label>
                  <div className="flex-1 flex gap-1.5 min-w-[200px]">
                    <input
                      id="prop-photo-url"
                      type="url"
                      aria-label="Paste property photo URL"
                      value={photoUrlInput}
                      onChange={(e) => setPhotoUrlInput(e.target.value)}
                      placeholder="Or paste photo URL..."
                      className="min-h-[44px] flex-1 px-3 py-2 bg-[#0B0F10] border border-[#1F2C33] rounded-xl text-xs text-[#F2F5F4]"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (photoUrlInput.trim()) {
                          setPhotos((prev) => [...prev, photoUrlInput.trim()]);
                          setPhotoUrlInput('');
                        }
                      }}
                      className="min-h-[44px] px-3.5 py-2 rounded-xl bg-[#0B0F10] border border-[#1F2C33] text-[#F2F5F4] font-semibold cursor-pointer"
                    >
                      Add
                    </button>
                  </div>
                </div>
                {photos.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {photos.map((url, idx) => (
                      <div key={idx} className="relative w-16 h-16 rounded-lg overflow-hidden border border-[#1F2C33] bg-[#0B0F10]">
                        <img src={url} alt={`Photo ${idx + 1}`} className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => setPhotos((prev) => prev.filter((_, i) => i !== idx))}
                          className="absolute top-0 right-0 min-h-[28px] min-w-[28px] flex items-center justify-center rounded-bl bg-black/80 text-rose-300 cursor-pointer"
                          title="Remove photo"
                          aria-label={`Remove photo ${idx + 1}`}
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-[#1F2C33]">
              <button
                type="button"
                onClick={() => setFormOpen(false)}
                className="min-h-[44px] px-4 py-2 rounded-xl bg-[#0B0F10] border border-[#1F2C33] text-xs font-semibold text-[#B6C4C9] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="min-h-[44px] px-4 py-2 rounded-xl bg-[#6FD8B0] text-[#0B0F10] text-xs font-bold cursor-pointer disabled:opacity-50"
              >
                {saving ? 'Saving...' : editingId ? 'Save Property' : 'Create Property'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// 7. INVESTMENT REQUESTS QUEUE (approve_investment_request / reject_investment_request)
// ============================================================================
export const InvestmentRequestsQueuePanel: React.FC<{
  loading?: boolean;
  requests: InvestmentRequestRow[];
  users: PlatformUser[];
  properties: Property[];
  onRefresh: () => Promise<void> | void;
  onSuccess: (msg: string) => void;
  onError: (msg: string) => void;
}> = ({ loading = false, requests, users, properties, onRefresh, onSuccess, onError }) => {
  const [queueTab, setQueueTab] = useState<'pending' | 'handled'>('pending');
  const [handledFilter, setHandledFilter] = useState<'all' | 'completed' | 'failed'>('all');
  const [search, setSearch] = useState('');
  const [approveTarget, setApproveTarget] = useState<InvestmentRequestRow | null>(null);
  const [rejectTarget, setRejectTarget] = useState<InvestmentRequestRow | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const userById = useMemo(() => new Map(users.map((u) => [u.id, u])), [users]);
  const propById = useMemo(() => new Map(properties.map((p) => [p.id, p])), [properties]);

  const resolveProcessorLabel = (raw?: string): string => {
    if (!raw) return 'System';
    const match = userById.get(raw);
    return match?.email || match?.fullName || raw;
  };

  const pendingCount = useMemo(() => requests.filter((r) => r.status === 'pending').length, [requests]);
  const handledCount = useMemo(() => requests.filter((r) => r.status !== 'pending').length, [requests]);

  const filteredRequests = useMemo(() => {
    const q = search.trim().toLowerCase();
    return requests
      .filter((r) => {
        if (queueTab === 'pending') return r.status === 'pending';
        if (r.status === 'pending') return false;
        if (handledFilter === 'completed') return r.status === 'approved';
        if (handledFilter === 'failed') return r.status === 'rejected';
        return true;
      })
      .filter((r) => {
        if (!q) return true;
        const inv = userById.get(r.userId);
        const prop = propById.get(r.propertyId);
        return `${inv?.fullName || ''} ${inv?.email || ''} ${r.userId} ${r.id} ${prop?.title || r.propertyId}`
          .toLowerCase()
          .includes(q);
      })
      .sort((a, b) => {
        if (queueTab === 'pending') {
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        }
        const aTime = new Date(a.processedAt || a.createdAt).getTime();
        const bTime = new Date(b.processedAt || b.createdAt).getTime();
        return bTime - aTime;
      });
  }, [requests, queueTab, handledFilter, search, userById, propById]);

  const getDisplayAmountCents = (req: InvestmentRequestRow): number => {
    if (req.amountCents > 0) return req.amountCents;
    const prop = propById.get(req.propertyId);
    return Math.max(0, Math.round(req.shares) * eurToCents(prop?.tokenPrice || 0));
  };

  return (
    <div className="bg-[#121A1F] border border-[#1F2C33] rounded-2xl overflow-hidden">
      <div className="px-5 py-3.5 bg-[#0B0F10] border-b border-[#1F2C33] flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-[#F2F5F4]">Investment Requests Queue</h3>
              <span className="px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-300 border border-amber-500/30 text-[10px] font-bold tabular-nums">
                {pendingCount} pending
              </span>
            </div>
            <p className="text-[11px] text-[#8FA1A8] mt-0.5">
              Confirmed individually (oldest pending first) via <span className="font-mono text-[#6FD8B0]">approve_investment_request</span> / <span className="font-mono text-[#6FD8B0]">reject_investment_request</span>.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={() => setQueueTab('pending')}
                className={`min-h-[44px] px-3.5 py-2 rounded-lg text-xs font-semibold cursor-pointer tabular-nums ${
                  queueTab === 'pending' ? 'bg-[#6FD8B0] text-[#0B0F10]' : 'bg-[#121A1F] border border-[#1F2C33] text-[#B6C4C9]'
                }`}
              >
                Pending ({pendingCount})
              </button>
              <button
                type="button"
                onClick={() => setQueueTab('handled')}
                className={`min-h-[44px] px-3.5 py-2 rounded-lg text-xs font-semibold cursor-pointer tabular-nums ${
                  queueTab === 'handled' ? 'bg-[#6FD8B0] text-[#0B0F10]' : 'bg-[#121A1F] border border-[#1F2C33] text-[#B6C4C9]'
                }`}
              >
                Handled ({handledCount})
              </button>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#8FA1A8]" />
            <input
              id="inv-req-search"
              type="text"
              aria-label="Search investment requests by investor name, email, or reference"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search investor name, email, or reference..."
              className="min-h-[44px] w-full pl-8 pr-3 py-2 bg-[#121A1F] border border-[#1F2C33] rounded-lg text-xs text-[#F2F5F4]"
            />
          </div>

          {queueTab === 'handled' && (
            <div className="flex items-center gap-1.5">
              {([
                { id: 'all', label: 'All' },
                { id: 'completed', label: 'Completed' },
                { id: 'failed', label: 'Failed' },
              ] as const).map((sub) => (
                <button
                  key={sub.id}
                  type="button"
                  onClick={() => setHandledFilter(sub.id)}
                  className={`min-h-[44px] px-3 py-2 rounded-lg text-xs font-semibold cursor-pointer ${
                    handledFilter === sub.id
                      ? 'bg-[#6FD8B0]/20 text-[#6FD8B0] border border-[#6FD8B0]/40'
                      : 'bg-[#121A1F] border border-[#1F2C33] text-[#8FA1A8]'
                  }`}
                >
                  {sub.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <div className="p-4 space-y-2" role="status" aria-label="Loading investment requests queue">
          {Array.from({ length: 4 }, (_, index) => (
            <div key={index} className="grid grid-cols-8 gap-3 py-2 border-b border-[#1F2C33] last:border-b-0">
              {Array.from({ length: 8 }, (_, cell) => (
                <div key={cell} className="h-4 rounded bg-[#1F2C33] animate-pulse" />
              ))}
            </div>
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#1F2C33] text-[11px] font-semibold text-[#8FA1A8] uppercase tracking-wider">
                <th className="py-2.5 px-4">Investor</th>
                <th className="py-2.5 px-4">Property</th>
                <th className="py-2.5 px-4 text-right">Shares</th>
                <th className="py-2.5 px-4 text-right">Total Cost</th>
                <th className="py-2.5 px-4 text-right">Available Balance</th>
                <th className="py-2.5 px-4">Requested</th>
                <th className="py-2.5 px-4">Status</th>
                <th className="py-2.5 px-4 text-right">
                  {queueTab === 'handled' ? 'Processed By & When' : 'Action'}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1F2C33]">
              {filteredRequests.map((req) => {
                const inv = userById.get(req.userId);
                const prop = propById.get(req.propertyId);
                const amountCents = getDisplayAmountCents(req);
                const availCents = eurToCents(inv?.walletBalance ?? 0);
                const insufficient = req.status === 'pending' && availCents < amountCents;
                return (
                  <tr key={req.id} className="hover:bg-[#162026]">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-[#F2F5F4]">{inv?.fullName || 'Investor'}</div>
                      <div className="text-[11px] text-[#8FA1A8]">{inv?.email || req.userId}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-[#F2F5F4] font-medium">{prop?.title || req.propertyId}</div>
                      <div className="text-[10px] font-mono text-[#8FA1A8]">{req.id}</div>
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-[#F2F5F4] tabular-nums">{req.shares.toLocaleString()}</td>
                    <td className="py-3 px-4 text-right font-bold text-[#6FD8B0] tabular-nums">{formatCentsEur(amountCents)}</td>
                    <td className="py-3 px-4 text-right tabular-nums">
                      <div className={`font-semibold ${insufficient ? 'text-rose-400' : 'text-[#F2F5F4]'}`}>
                        {formatCentsEur(availCents)}
                      </div>
                      {insufficient && (
                        <div className="text-[10px] text-rose-400">Insufficient balance</div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-[#B6C4C9] whitespace-nowrap">{formatDate(req.createdAt)}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`uppercase font-semibold text-[11px] ${
                          req.status === 'approved'
                            ? 'text-[#6FD8B0]'
                            : req.status === 'rejected'
                            ? 'text-rose-400'
                            : 'text-amber-400'
                        }`}
                      >
                        {req.status}
                      </span>
                      {req.reason && <div className="text-[11px] text-rose-300 mt-0.5">{req.reason}</div>}
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      {queueTab === 'pending' && req.status === 'pending' ? (
                        <div className="inline-flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setApproveTarget(req)}
                            className="min-h-[44px] px-3.5 py-2 rounded-lg bg-[#6FD8B0] hover:bg-[#5ec8a0] text-[#0B0F10] text-xs font-bold cursor-pointer"
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setRejectTarget(req);
                              setRejectReason('');
                            }}
                            className="min-h-[44px] px-3.5 py-2 rounded-lg bg-[#0B0F10] border border-rose-500/40 text-rose-300 hover:bg-rose-500/10 text-xs font-semibold cursor-pointer"
                          >
                            Reject
                          </button>
                        </div>
                      ) : (
                        <div className="text-right">
                          <div className="text-[11px] font-medium text-[#F2F5F4]">
                            {resolveProcessorLabel(req.processedBy)}
                          </div>
                          <div className="text-[10px] text-[#8FA1A8]">
                            {req.processedAt || req.reviewedAt
                              ? formatDate(req.processedAt || req.reviewedAt!)
                              : '—'}
                          </div>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
              {filteredRequests.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-xs text-[#8FA1A8]">
                    {queueTab === 'pending' && !search.trim()
                      ? 'Nothing waiting'
                      : `No matching investment requests found.`}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Approve Investment Request Dialog */}
      {(() => {
        const inv = approveTarget ? userById.get(approveTarget.userId) : undefined;
        const prop = approveTarget ? propById.get(approveTarget.propertyId) : undefined;
        const amountCents = approveTarget ? getDisplayAmountCents(approveTarget) : 0;
        const availCents = eurToCents(inv?.walletBalance ?? 0);
        return (
          <AdminActionDialog
            open={Boolean(approveTarget)}
            actionName="Approve investment request"
            confirmLabel="Approve investment request"
            investorName={inv?.fullName || 'Investor'}
            investorEmail={inv?.email || approveTarget?.userId || ''}
            amountCents={amountCents}
            reference={approveTarget?.id || ''}
            extraDetails={[
              { label: 'Property', value: prop?.title || approveTarget?.propertyId || '—' },
              { label: 'Shares', value: approveTarget ? approveTarget.shares.toLocaleString() : '0', tone: 'mono' },
              { label: 'Total Cost', value: formatCentsEur(amountCents), tone: 'accent' },
              {
                label: 'Available Balance',
                value: formatCentsEur(availCents),
                tone: availCents < amountCents ? 'danger' : 'default',
              },
            ]}
            onConfirm={async () => {
              if (!approveTarget) return;
              await approveInvestmentRequestRpc(approveTarget.id);
              return `Investment request ${approveTarget.id} approved via approve_investment_request.`;
            }}
            onRefresh={onRefresh}
            onRefreshError={onError}
            onSuccess={onSuccess}
            onClose={() => setApproveTarget(null)}
          />
        );
      })()}

      {/* Reject Investment Request Dialog */}
      {(() => {
        const inv = rejectTarget ? userById.get(rejectTarget.userId) : undefined;
        const prop = rejectTarget ? propById.get(rejectTarget.propertyId) : undefined;
        const amountCents = rejectTarget ? getDisplayAmountCents(rejectTarget) : 0;
        const availCents = eurToCents(inv?.walletBalance ?? 0);
        return (
          <AdminActionDialog
            open={Boolean(rejectTarget)}
            actionName="Reject investment request"
            confirmLabel="Reject investment request"
            tone="danger"
            investorName={inv?.fullName || 'Investor'}
            investorEmail={inv?.email || rejectTarget?.userId || ''}
            amountCents={amountCents}
            reference={rejectTarget?.id || ''}
            extraDetails={[
              { label: 'Property', value: prop?.title || rejectTarget?.propertyId || '—' },
              { label: 'Shares', value: rejectTarget ? rejectTarget.shares.toLocaleString() : '0', tone: 'mono' },
              { label: 'Total Cost', value: formatCentsEur(amountCents) },
              { label: 'Available Balance', value: formatCentsEur(availCents) },
            ]}
            validate={() => (!rejectReason.trim() ? 'A rejection reason is required.' : null)}
            onConfirm={async () => {
              if (!rejectTarget) return;
              await rejectInvestmentRequestRpc(rejectTarget.id, rejectReason.trim());
              setRejectReason('');
              return `Investment request ${rejectTarget.id} rejected via reject_investment_request.`;
            }}
            onRefresh={onRefresh}
            onRefreshError={onError}
            onSuccess={onSuccess}
            onClose={() => {
              setRejectTarget(null);
              setRejectReason('');
            }}
          >
            <div>
              <label htmlFor="inv-req-reject-reason" className="block text-xs font-semibold text-[#B6C4C9] mb-1">
                Rejection Reason *
              </label>
              <textarea
                id="inv-req-reject-reason"
                rows={3}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="e.g. Allocation cap reached or compliance check pending..."
                className="w-full p-3 bg-[#0B0F10] border border-[#1F2C33] rounded-xl text-xs text-[#F2F5F4]"
              />
            </div>
          </AdminActionDialog>
        );
      })()}
    </div>
  );
};

// ============================================================================
// 7B. INVESTMENTS: per-property holders + Record Investment form
// ============================================================================
export const AdminInvestmentsSection: React.FC<{
  loading?: boolean;
  investments: any[];
  investmentRequests?: InvestmentRequestRow[];
  users: PlatformUser[];
  properties: Property[];
  onRefresh: () => Promise<void> | void;
  onSuccess: (msg: string) => void;
  onError: (msg: string) => void;
}> = ({ loading = false, investments, investmentRequests = [], users, properties, onRefresh, onSuccess, onError }) => {
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [recordOpen, setRecordOpen] = useState(false);
  const [confirmStep, setConfirmStep] = useState(false);

  // Record investment form state
  const [formUserId, setFormUserId] = useState<string>(() => users[0]?.id || '');
  const [formPropId, setFormPropId] = useState<string>(() => properties[0]?.id || '');
  const [formShares, setFormShares] = useState<number>(10);
  const recordModalRef = useDialogFocus<HTMLFormElement>(
    recordOpen && !confirmStep,
    () => {
      setRecordOpen(false);
      setConfirmStep(false);
    }
  );

  const userById = useMemo(() => new Map(users.map((u) => [u.id, u])), [users]);
  const propById = useMemo(() => new Map(properties.map((p) => [p.id, p])), [properties]);

  const normalized = useMemo(() => {
    return investments.map((inv) => {
      const uid = String(inv.userId || inv.user_id || '');
      const pid = String(inv.propertyId || inv.property_id || '');
      const u = userById.get(uid);
      const p = propById.get(pid);
      const shares = Number(inv.tokensPurchased ?? inv.tokens_purchased ?? inv.shares ?? inv.tokensCount ?? 0);
      const costCents = eurToCents(inv.totalCost ?? inv.total_amount_invested ?? inv.amountEUR ?? inv.amount ?? 0);
      return {
        id: String(inv.id),
        userId: uid,
        investorName: inv.userName || u?.fullName || inv.userEmail || u?.email || uid,
        investorEmail: inv.userEmail || u?.email || '—',
        propertyId: pid,
        propertyTitle: inv.propertyTitle || p?.title || pid || 'Property SPV',
        shares,
        cost: centsToEur(costCents),
        status: String(inv.status || 'completed').toLowerCase(),
        createdAt: String(inv.purchaseDate || inv.createdAt || inv.created_at || new Date().toISOString()),
      };
    });
  }, [investments, userById, propById]);

  const groupedByProperty = useMemo(() => {
    const groups = new Map<string, { propertyId: string; propertyTitle: string; totalShares: number; totalCostCents: number; holders: Map<string, { userId: string; name: string; email: string; shares: number; costCents: number }> }>();
    const q = search.trim().toLowerCase();

    for (const row of normalized) {
      if (selectedPropertyId !== 'all' && row.propertyId !== selectedPropertyId) continue;
      if (q && !row.investorName.toLowerCase().includes(q) && !row.investorEmail.toLowerCase().includes(q) && !row.propertyTitle.toLowerCase().includes(q)) {
        continue;
      }
      if (!groups.has(row.propertyId)) {
        groups.set(row.propertyId, {
          propertyId: row.propertyId,
          propertyTitle: row.propertyTitle,
          totalShares: 0,
          totalCostCents: 0,
          holders: new Map(),
        });
      }
      const g = groups.get(row.propertyId)!;
      const rowCostCents = eurToCents(row.cost);
      g.totalShares += row.shares;
      g.totalCostCents += rowCostCents;
      const existingHolder = g.holders.get(row.userId);
      if (existingHolder) {
        existingHolder.shares += row.shares;
        existingHolder.costCents += rowCostCents;
      } else {
        g.holders.set(row.userId, {
          userId: row.userId,
          name: row.investorName,
          email: row.investorEmail,
          shares: row.shares,
          costCents: rowCostCents,
        });
      }
    }
    return Array.from(groups.values()).map((g) => ({
      ...g,
      totalCost: centsToEur(g.totalCostCents),
      holders: new Map(
        Array.from(g.holders.entries()).map(([k, h]) => [k, { ...h, cost: centsToEur(h.costCents) }])
      ),
    }));
  }, [normalized, selectedPropertyId, search]);

  const selectedFormProp = propById.get(formPropId) || properties[0];
  const selectedFormInvestor = userById.get(formUserId) || users[0];
  const calculatedCostCents =
    Math.max(0, Math.floor(Number(formShares) || 0)) * eurToCents(selectedFormProp?.tokenPrice || 0);
  const calculatedCost = centsToEur(calculatedCostCents);

  const handleOpenRecordConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    const uid = formUserId || users[0]?.id;
    const pid = formPropId || properties[0]?.id;
    if (!uid || !pid || formShares <= 0 || calculatedCostCents <= 0) {
      onError('Select an investor, a property, and enter a positive number of shares.');
      return;
    }
    setConfirmStep(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 id="admin-main-heading" data-admin-queue-focus tabIndex={-1} className="text-lg font-bold text-[#F2F5F4] tracking-tight focus:outline-none">Investments &amp; Holders per Property</h2>
          <p className="text-xs text-[#8FA1A8] mt-1">
            View shareholdings grouped by property with shares and cost basis, or record a new allocation.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() =>
              triggerCsvDownload(
                `lagence-investments-${new Date().toISOString().slice(0, 10)}.csv`,
                ['Property', 'Holder', 'Email', 'Shares', 'Cost (EUR)'],
                groupedByProperty.flatMap((g) =>
                  Array.from(g.holders.values()).map((h) => [g.propertyTitle, h.name, h.email, h.shares, centsToEur(h.costCents).toFixed(2)])
                )
              )
            }
            className="min-h-[44px] px-3.5 py-2 rounded-xl bg-[#121A1F] border border-[#1F2C33] hover:border-[#6FD8B0] text-xs font-semibold text-[#F2F5F4] flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-[#6FD8B0]" />
            <span>Export CSV</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setFormUserId((prev) => prev || users[0]?.id || '');
              setFormPropId((prev) => prev || properties[0]?.id || '');
              setConfirmStep(false);
              setRecordOpen(true);
            }}
            className="min-h-[44px] px-4 py-2 rounded-xl bg-[#6FD8B0] hover:bg-[#5ec8a0] text-[#0B0F10] text-xs font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Record Investment</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-[#121A1F] p-4 rounded-2xl border border-[#1F2C33] flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8FA1A8]" />
          <input
            id="inv-holders-search"
            type="text"
            aria-label="Search holder name, email, or property"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search holder name, email, or property..."
            className="min-h-[44px] w-full pl-9 pr-3 py-2 bg-[#0B0F10] border border-[#1F2C33] rounded-xl text-xs text-[#F2F5F4]"
          />
        </div>
        <select
          id="inv-holders-property-filter"
          aria-label="Filter holdings by property"
          value={selectedPropertyId}
          onChange={(e) => setSelectedPropertyId(e.target.value)}
          className="min-h-[44px] px-3 py-2 bg-[#0B0F10] border border-[#1F2C33] rounded-xl text-xs text-[#F2F5F4]"
        >
          <option value="all">All Properties ({properties.length})</option>
          {properties.map((p) => (
            <option key={p.id} value={p.id}>{p.title}</option>
          ))}
        </select>
      </div>

      {/* Investment Requests Queue (approve_investment_request / reject_investment_request) */}
      <InvestmentRequestsQueuePanel
        loading={loading}
        requests={investmentRequests}
        users={users}
        properties={properties}
        onRefresh={onRefresh}
        onSuccess={onSuccess}
        onError={onError}
      />

      {/* Property-Grouped Holder Cards */}
      <div className="space-y-4">
        {groupedByProperty.map((group) => {
          const holders = Array.from(group.holders.values());
          return (
            <div key={group.propertyId} className="bg-[#121A1F] border border-[#1F2C33] rounded-2xl overflow-hidden">
              <div className="px-5 py-3.5 bg-[#0B0F10] border-b border-[#1F2C33] flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-[#6FD8B0]" />
                  <span className="text-sm font-bold text-[#F2F5F4]">{group.propertyTitle}</span>
                  <span className="text-[11px] text-[#8FA1A8]">· {holders.length} holder{holders.length === 1 ? '' : 's'}</span>
                </div>
                <div className="flex items-center gap-4 text-xs tabular-nums">
                  <span className="text-[#B6C4C9]">Total Shares: <strong className="text-[#F2F5F4]">{group.totalShares.toLocaleString()}</strong></span>
                  <span className="text-[#B6C4C9]">Total Cost: <strong className="text-[#6FD8B0]">{formatCentsEur(group.totalCostCents)}</strong></span>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#1F2C33] text-[11px] text-[#8FA1A8] uppercase">
                      <th className="py-2.5 px-4">Investor Holder</th>
                      <th className="py-2.5 px-4">Email</th>
                      <th className="py-2.5 px-4 text-right">Shares</th>
                      <th className="py-2.5 px-4 text-right">Ownership %</th>
                      <th className="py-2.5 px-4 text-right">Cost Basis</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1F2C33]">
                    {holders.map((h) => {
                      const pct = group.totalShares > 0 ? ((h.shares / group.totalShares) * 100).toFixed(2) : '0.00';
                      return (
                        <tr key={h.userId} className="hover:bg-[#162026]">
                          <td className="py-3 px-4 font-semibold text-[#F2F5F4]">{h.name}</td>
                          <td className="py-3 px-4 text-[#8FA1A8]">{h.email}</td>
                          <td className="py-3 px-4 text-right font-mono text-[#F2F5F4] tabular-nums">{h.shares.toLocaleString()}</td>
                          <td className="py-3 px-4 text-right font-mono text-[#B6C4C9] tabular-nums">{pct}%</td>
                          <td className="py-3 px-4 text-right font-bold text-[#6FD8B0] tabular-nums">{formatCentsEur(h.costCents)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}

        {groupedByProperty.length === 0 && (
          <div className="bg-[#121A1F] border border-[#1F2C33] rounded-2xl p-10 text-center text-xs text-[#8FA1A8]">
            No property investments recorded yet.
          </div>
        )}
      </div>

      {/* Record Investment Modal Step 1 (Form) + Step 2 (AdminActionDialog) */}
      {recordOpen && (() => {
        const uid = formUserId || users[0]?.id || '';
        const pid = formPropId || properties[0]?.id || '';
        const curCents = eurToCents(selectedFormInvestor?.walletBalance ?? 0);
        const projCents = curCents - calculatedCostCents;
        return (
          <>
            {!confirmStep && (
              <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
                <form ref={recordModalRef} tabIndex={-1} role="dialog" aria-modal="true" aria-label="Record Investment" onSubmit={handleOpenRecordConfirm} noValidate className="bg-[#121A1F] border border-[#1F2C33] rounded-2xl max-w-md w-full p-6 space-y-4 focus:outline-none">
                  <div className="flex items-center justify-between border-b border-[#1F2C33] pb-3">
                    <h3 className="text-sm font-bold text-[#F2F5F4]">Record Investment</h3>
                    <button
                      type="button"
                      onClick={() => {
                        setRecordOpen(false);
                        setConfirmStep(false);
                      }}
                      aria-label="Close record investment dialog"
                      className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-[#8FA1A8] hover:text-[#F2F5F4] cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="space-y-3 text-xs">
                    <div>
                      <label htmlFor="rec-inv-user" className="block text-[#B6C4C9] font-semibold mb-1">Investor</label>
                      <select
                        id="rec-inv-user"
                        value={formUserId}
                        onChange={(e) => setFormUserId(e.target.value)}
                        className="min-h-[44px] w-full px-3 py-2 bg-[#0B0F10] border border-[#1F2C33] rounded-xl text-[#F2F5F4]"
                      >
                        {users.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.fullName || u.email} ({u.email}) — {formatCentsEur(eurToCents(u.walletBalance))}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label htmlFor="rec-inv-prop" className="block text-[#B6C4C9] font-semibold mb-1">Property</label>
                      <select
                        id="rec-inv-prop"
                        value={formPropId}
                        onChange={(e) => setFormPropId(e.target.value)}
                        className="min-h-[44px] w-full px-3 py-2 bg-[#0B0F10] border border-[#1F2C33] rounded-xl text-[#F2F5F4]"
                      >
                        {properties.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.title} ({formatCentsEur(eurToCents(p.tokenPrice))} / share)
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label htmlFor="rec-inv-shares" className="block text-[#B6C4C9] font-semibold mb-1">Number of Shares</label>
                      <input
                        id="rec-inv-shares"
                        type="number"
                        min={1}
                        value={formShares}
                        onChange={(e) => setFormShares(Math.max(1, Math.floor(Number(e.target.value) || 1)))}
                        className="min-h-[44px] w-full px-3 py-2 bg-[#0B0F10] border border-[#1F2C33] rounded-xl font-mono text-[#F2F5F4]"
                      />
                    </div>
                    <div className="p-3.5 rounded-xl bg-[#0B0F10] border border-[#1F2C33] flex items-center justify-between">
                      <span className="text-[#8FA1A8]">Total Cost</span>
                      <span className="text-base font-bold text-[#6FD8B0] tabular-nums">
                        {formatCentsEur(calculatedCostCents)}
                      </span>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setRecordOpen(false);
                        setConfirmStep(false);
                      }}
                      className="min-h-[44px] px-4 py-2 rounded-xl bg-[#0B0F10] border border-[#1F2C33] text-xs font-semibold text-[#B6C4C9] cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={calculatedCostCents <= 0}
                      className="min-h-[44px] px-4 py-2 rounded-xl bg-[#6FD8B0] text-[#0B0F10] text-xs font-bold cursor-pointer disabled:opacity-50"
                    >
                      Review Investment
                    </button>
                  </div>
                </form>
              </div>
            )}

            <AdminActionDialog
              open={confirmStep}
              actionName="Record investment"
              confirmLabel="Record investment"
              investorName={selectedFormInvestor?.fullName || 'Investor'}
              investorEmail={selectedFormInvestor?.email || uid}
              amountCents={calculatedCostCents}
              reference={selectedFormProp?.id || pid}
              extraDetails={[
                { label: 'Property', value: selectedFormProp?.title || pid },
                { label: 'Shares', value: Math.floor(formShares).toLocaleString(), tone: 'mono' },
                { label: 'Current Balance', value: formatCentsEur(curCents) },
                { label: 'Projected Balance', value: formatCentsEur(projCents), tone: 'accent' },
              ]}
              validate={() => {
                if (!uid || !pid || formShares <= 0 || calculatedCostCents <= 0) {
                  return 'Select an investor, a property, and enter a positive number of shares.';
                }
                return null;
              }}
              onConfirm={async () => {
                await recordInvestmentRpc({
                  userId: uid,
                  propertyId: pid,
                  shares: Math.floor(formShares),
                  sharePriceEur: centsToEur(eurToCents(selectedFormProp?.tokenPrice || 500)),
                });
                return `Recorded ${Math.floor(formShares)} shares (${formatCentsEur(calculatedCostCents)}) via record_investment.`;
              }}
              onRefresh={onRefresh}
              onRefreshError={onError}
              onSuccess={onSuccess}
              onClose={() => {
                setConfirmStep(false);
                setRecordOpen(false);
              }}
            />
          </>
        );
      })()}
    </div>
  );
};

// ============================================================================
// 8. DISTRIBUTIONS: choose property, enter total + note, preview proportional shares, pay_distribution + past list
// ============================================================================
export const AdminDistributionsSection: React.FC<{
  properties: Property[];
  investments: any[];
  users: PlatformUser[];
  transactions: any[];
  pastDistributions: PastDistributionRow[];
  onRefresh: () => Promise<void> | void;
  onSuccess: (msg: string) => void;
  onError: (msg: string) => void;
}> = ({ properties, investments, users, transactions, pastDistributions, onRefresh, onSuccess, onError }) => {
  const [selectedPropId, setSelectedPropId] = useState<string>(() => properties[0]?.id || '');
  const [totalAmountEur, setTotalAmountEur] = useState<number>(2500);
  const [note, setNote] = useState<string>('');
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [lastPaidSummary, setLastPaidSummary] = useState<{ paidCount: number; totalAmountEur: number; propertyTitle: string } | null>(null);

  const userById = useMemo(() => new Map(users.map((u) => [u.id, u])), [users]);
  const propById = useMemo(() => new Map(properties.map((p) => [p.id, p])), [properties]);

  const activePropId = selectedPropId || properties[0]?.id || '';
  const activeProp = propById.get(activePropId);

  const holderSharesPreview = useMemo(() => {
    const byHolder = new Map<string, { userId: string; name: string; email: string; shares: number }>();
    for (const inv of investments) {
      const pid = String(inv.propertyId || inv.property_id || '');
      if (pid !== activePropId) continue;
      const uid = String(inv.userId || inv.user_id || '');
      const shares = Number(inv.tokensPurchased ?? inv.tokens_purchased ?? inv.shares ?? inv.tokensCount ?? 0);
      if (shares <= 0) continue;
      const u = userById.get(uid);
      const cur = byHolder.get(uid);
      if (cur) cur.shares += shares;
      else {
        byHolder.set(uid, {
          userId: uid,
          name: inv.userName || u?.fullName || u?.email || uid,
          email: inv.userEmail || u?.email || '—',
          shares,
        });
      }
    }
    const list = Array.from(byHolder.values());
    const totalShares = list.reduce((s, h) => s + h.shares, 0);
    const totalCents = eurToCents(totalAmountEur);
    const allocCents = allocateProportionalCents(totalCents, list);
    return {
      totalShares,
      totalCents,
      rows: list.map((h) => {
        const ratio = totalShares > 0 ? h.shares / totalShares : 0;
        const payoutCents = allocCents.get(h.userId) ?? 0;
        return {
          ...h,
          pct: ratio * 100,
          payoutCents,
          payoutEur: centsToEur(payoutCents),
        };
      }),
    };
  }, [investments, activePropId, userById, totalAmountEur]);

  const pastRows = useMemo(() => {
    if (pastDistributions.length > 0) {
      return pastDistributions.map((d) => ({
        id: d.id,
        propertyTitle: propById.get(d.propertyId)?.title || d.propertyId,
        totalEur: d.totalEur,
        note: d.note || '—',
        createdAt: d.createdAt,
      }));
    }
    return transactions
      .filter((t) => ['dividend', 'distribution', 'yield'].includes(String(t.type).toLowerCase()))
      .map((t) => ({
        id: t.id,
        propertyTitle: t.propertyTitle || propById.get(t.propertyId)?.title || 'Property Yield',
        totalEur: Number(t.amount || 0),
        note: t.notes || t.description || t.reference,
        createdAt: t.createdAt,
      }));
  }, [pastDistributions, transactions, propById]);

  const handleOpenConfirmDistribution = (e: React.FormEvent) => {
    e.preventDefault();
    const totalCents = parseStrictEurToCents(totalAmountEur);
    if (!activePropId || totalCents === null || totalCents <= 0 || holderSharesPreview.rows.length === 0) {
      onError('Select a property with active holders and enter a positive distribution amount.');
      return;
    }
    setConfirmModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 id="admin-main-heading" data-admin-queue-focus tabIndex={-1} className="text-lg font-bold text-[#F2F5F4] tracking-tight focus:outline-none">Rental &amp; Yield Distributions</h2>
        <p className="text-xs text-[#8FA1A8] mt-1">
          Preview each holder&apos;s proportional share before executing <span className="font-mono text-[#6FD8B0]">pay_distribution</span>.
        </p>
      </div>

      {lastPaidSummary && (
        <div className="p-4 rounded-2xl bg-[#6FD8B0]/10 border border-[#6FD8B0]/30 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2.5 text-[#F2F5F4]">
            <CheckCircle2 className="w-4 h-4 text-[#6FD8B0] shrink-0" />
            <span>
              Distribution confirmed for <strong>{lastPaidSummary.propertyTitle}</strong>: <strong>{lastPaidSummary.paidCount}</strong> investors paid ({formatCentsEur(eurToCents(lastPaidSummary.totalAmountEur))}).
            </span>
          </div>
          <button type="button" onClick={() => setLastPaidSummary(null)} aria-label="Dismiss distribution summary" className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-[#8FA1A8] hover:text-[#F2F5F4] cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <form onSubmit={handleOpenConfirmDistribution} className="lg:col-span-5 bg-[#121A1F] border border-[#1F2C33] rounded-2xl p-5 space-y-4">
          <h3 className="text-sm font-bold text-[#F2F5F4] flex items-center gap-2">
            <Coins className="w-4 h-4 text-[#6FD8B0]" />
            <span>New Distribution Payout</span>
          </h3>

          <div className="space-y-3 text-xs">
            <div>
              <label htmlFor="dist-prop-select" className="block text-[#B6C4C9] font-semibold mb-1">Property</label>
              <select
                id="dist-prop-select"
                value={activePropId}
                onChange={(e) => setSelectedPropId(e.target.value)}
                className="min-h-[44px] w-full px-3 py-2 bg-[#0B0F10] border border-[#1F2C33] rounded-xl text-[#F2F5F4]"
              >
                {properties.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="dist-amount-eur" className="block text-[#B6C4C9] font-semibold mb-1">Total Distribution Amount (EUR)</label>
              <input
                id="dist-amount-eur"
                type="number"
                min={1}
                step="0.01"
                required
                value={totalAmountEur}
                onChange={(e) => setTotalAmountEur(Number(e.target.value))}
                className="min-h-[44px] w-full px-3 py-2 bg-[#0B0F10] border border-[#1F2C33] rounded-xl font-mono text-[#F2F5F4]"
              />
            </div>
            <div>
              <label htmlFor="dist-note-input" className="block text-[#B6C4C9] font-semibold mb-1">Distribution Note</label>
              <input
                id="dist-note-input"
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. Q4 Rental Dividend Payout"
                className="min-h-[44px] w-full px-3 py-2 bg-[#0B0F10] border border-[#1F2C33] rounded-xl text-[#F2F5F4]"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={holderSharesPreview.rows.length === 0 || holderSharesPreview.totalCents <= 0}
            className="min-h-[44px] w-full py-2.5 rounded-xl bg-[#6FD8B0] hover:bg-[#5ec8a0] text-[#0B0F10] text-xs font-bold cursor-pointer disabled:opacity-50"
          >
            {`Review & Pay ${holderSharesPreview.rows.length} Holder(s)`}
          </button>
        </form>

        {/* Live Proportional Share Preview */}
        <div className="lg:col-span-7 bg-[#121A1F] border border-[#1F2C33] rounded-2xl overflow-hidden">
          <div className="p-4 bg-[#0B0F10] border-b border-[#1F2C33] flex items-center justify-between">
            <h3 className="text-sm font-bold text-[#F2F5F4]">Proportional Payout Preview</h3>
            <span className="text-xs text-[#8FA1A8] tabular-nums">
              {holderSharesPreview.totalShares.toLocaleString()} total shares · {holderSharesPreview.rows.length} holders
            </span>
          </div>
          <div className="overflow-x-auto max-h-[360px]">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#1F2C33] bg-[#0B0F10] text-[11px] text-[#8FA1A8] uppercase">
                  <th className="py-2.5 px-4">Holder</th>
                  <th className="py-2.5 px-4 text-right">Shares</th>
                  <th className="py-2.5 px-4 text-right">Share %</th>
                  <th className="py-2.5 px-4 text-right">Preview Payout</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1F2C33]">
                {holderSharesPreview.rows.map((r) => (
                  <tr key={r.userId} className="hover:bg-[#162026]">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-[#F2F5F4]">{r.name}</div>
                      <div className="text-[11px] text-[#8FA1A8]">{r.email}</div>
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-[#F2F5F4] tabular-nums">{r.shares.toLocaleString()}</td>
                    <td className="py-3 px-4 text-right font-mono text-[#B6C4C9] tabular-nums">{r.pct.toFixed(2)}%</td>
                    <td className="py-3 px-4 text-right font-bold text-[#6FD8B0] tabular-nums">{formatCentsEur(r.payoutCents)}</td>
                  </tr>
                ))}
                {holderSharesPreview.rows.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-10 text-center text-xs text-[#8FA1A8]">
                      No recorded holders found for this property yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Past Distributions */}
      <div className="bg-[#121A1F] border border-[#1F2C33] rounded-2xl overflow-hidden">
        <div className="p-4 bg-[#0B0F10] border-b border-[#1F2C33] flex items-center justify-between">
          <h3 className="text-sm font-bold text-[#F2F5F4]">Past Distributions</h3>
          <span className="text-xs text-[#8FA1A8]">{pastRows.length} records</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#1F2C33] bg-[#0B0F10] text-[11px] text-[#8FA1A8] uppercase">
                <th className="py-2.5 px-4">Date</th>
                <th className="py-2.5 px-4">Property</th>
                <th className="py-2.5 px-4">Note</th>
                <th className="py-2.5 px-4 text-right">Total Disbursed</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1F2C33]">
              {pastRows.slice(0, 50).map((d) => (
                <tr key={d.id} className="hover:bg-[#162026]">
                  <td className="py-3 px-4 text-[#B6C4C9] whitespace-nowrap">{formatDate(d.createdAt)}</td>
                  <td className="py-3 px-4 font-semibold text-[#F2F5F4]">{d.propertyTitle}</td>
                  <td className="py-3 px-4 text-[#8FA1A8]">{d.note}</td>
                  <td className="py-3 px-4 text-right font-bold text-[#6FD8B0] tabular-nums">{formatCentsEur(eurToCents(d.totalEur))}</td>
                </tr>
              ))}
              {pastRows.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-10 text-center text-xs text-[#8FA1A8]">
                    No past distributions recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confirm Distribution Payout Dialog */}
      <AdminActionDialog
        open={confirmModalOpen}
        actionName="Pay distribution"
        confirmLabel="Pay distribution"
        investorName={`${holderSharesPreview.rows.length} holder(s)`}
        investorEmail={activeProp?.title || activePropId}
        amountCents={holderSharesPreview.totalCents}
        reference={activePropId}
        extraDetails={[
          { label: 'Total Shares', value: holderSharesPreview.totalShares.toLocaleString(), tone: 'mono' },
          { label: 'Note', value: note.trim() || 'Distribution payout' },
        ]}
        validate={() => {
          const totalCents = parseStrictEurToCents(totalAmountEur);
          if (!activePropId || totalCents === null || totalCents <= 0) {
            return 'Select a property and enter a positive distribution amount.';
          }
          if (holderSharesPreview.rows.length === 0) {
            return 'No active holders found for this property.';
          }
          return null;
        }}
        onConfirm={async () => {
          const totalCents = parseStrictEurToCents(totalAmountEur);
          if (!activePropId || totalCents === null || totalCents <= 0) {
            throw new Error('Select a property and enter a positive distribution amount.');
          }
          const result = await executePayDistribution({
            propertyId: activePropId,
            totalAmountEur: centsToEur(totalCents),
            note: note.trim() || undefined,
          });
          const paidDisplay = result.paidCount > 0 ? result.paidCount : holderSharesPreview.rows.length;
          setLastPaidSummary({
            paidCount: paidDisplay,
            totalAmountEur: centsToEur(totalCents),
            propertyTitle: activeProp?.title || activePropId,
          });
          setNote('');
          return `Paid ${formatCentsEur(totalCents)} across ${paidDisplay} investor${paidDisplay === 1 ? '' : 's'} via pay_distribution.`;
        }}
        onRefresh={onRefresh}
        onRefreshError={onError}
        onSuccess={onSuccess}
        onClose={() => setConfirmModalOpen(false)}
      >
        <div className="bg-[#0B0F10] border border-[#1F2C33] rounded-xl overflow-hidden max-h-56 overflow-y-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#1F2C33] text-[11px] text-[#8FA1A8] uppercase">
                <th className="py-2 px-3">Investor</th>
                <th className="py-2 px-3 text-right">Shares</th>
                <th className="py-2 px-3 text-right">Share %</th>
                <th className="py-2 px-3 text-right">Payout</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1F2C33]">
              {holderSharesPreview.rows.map((r) => (
                <tr key={r.userId}>
                  <td className="py-2 px-3">
                    <div className="font-semibold text-[#F2F5F4]">{r.name}</div>
                    <div className="text-[11px] text-[#8FA1A8]">{r.email}</div>
                  </td>
                  <td className="py-2 px-3 text-right font-mono tabular-nums">{r.shares.toLocaleString()}</td>
                  <td className="py-2 px-3 text-right font-mono text-[#B6C4C9] tabular-nums">{r.pct.toFixed(2)}%</td>
                  <td className="py-2 px-3 text-right font-bold text-[#6FD8B0] tabular-nums">{formatCentsEur(r.payoutCents)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </AdminActionDialog>
    </div>
  );
};

// ============================================================================
// 3. KYC SECTION: kyc_submissions grouped by investor + signed URL + review_kyc
// ============================================================================
export const AdminKycSection: React.FC<{
  loading?: boolean;
  users: PlatformUser[];
  submissions: KycSubmissionRow[];
  onRefresh: () => Promise<void> | void;
  onSuccess: (msg: string) => void;
  onError: (msg: string) => void;
}> = ({ loading = false, users, submissions, onRefresh, onSuccess, onError }) => {
  const [queueTab, setQueueTab] = useState<'pending' | 'handled'>('pending');
  const [handledFilter, setHandledFilter] = useState<'all' | 'completed' | 'failed'>('all');
  const [search, setSearch] = useState('');
  const [previewDoc, setPreviewDoc] = useState<{ title: string; url: string | null; loading?: boolean } | null>(null);
  const kycPreviewModalRef = useDialogFocus<HTMLDivElement>(Boolean(previewDoc), () => setPreviewDoc(null));
  const [approveTarget, setApproveTarget] = useState<KycSubmissionRow | null>(null);
  const [rejectTarget, setRejectTarget] = useState<KycSubmissionRow | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [lastReviewed, setLastReviewed] = useState<{
    userId: string;
    investorName: string;
    investorEmail: string;
    action: 'approved' | 'rejected';
    rpcStatus?: string;
  } | null>(null);

  const userById = useMemo(() => new Map(users.map((u) => [u.id, u])), [users]);

  const resolveProcessorLabel = (raw?: string): string => {
    if (!raw) return 'System';
    const match = userById.get(raw);
    return match?.email || match?.fullName || raw;
  };

  const pendingCount = useMemo(() => submissions.filter((s) => s.status === 'pending').length, [submissions]);
  const handledCount = useMemo(() => submissions.filter((s) => s.status !== 'pending').length, [submissions]);

  const groupedByInvestor = useMemo(() => {
    const q = search.trim().toLowerCase();
    const groups = new Map<string, { investorId: string; investor?: PlatformUser; items: KycSubmissionRow[]; sortTs: number }>();

    const filtered = submissions.filter((sub) => {
      if (queueTab === 'pending') return sub.status === 'pending';
      if (sub.status === 'pending') return false;
      if (handledFilter === 'completed') return sub.status === 'approved';
      if (handledFilter === 'failed') return sub.status === 'rejected';
      return true;
    }).filter((sub) => {
      if (!q) return true;
      const inv = userById.get(sub.userId);
      return `${inv?.fullName || ''} ${inv?.email || ''} ${sub.userId} ${sub.id} ${sub.docType} ${sub.filePath}`
        .toLowerCase()
        .includes(q);
    });

    filtered.sort((a, b) => {
      if (queueTab === 'pending') {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }
      return new Date(b.processedAt || b.createdAt).getTime() - new Date(a.processedAt || a.createdAt).getTime();
    });

    for (const sub of filtered) {
      const ts = new Date(queueTab === 'pending' ? sub.createdAt : sub.processedAt || sub.createdAt).getTime();
      if (!groups.has(sub.userId)) {
        groups.set(sub.userId, { investorId: sub.userId, investor: userById.get(sub.userId), items: [], sortTs: ts });
      }
      groups.get(sub.userId)!.items.push(sub);
    }

    return Array.from(groups.values()).sort((a, b) =>
      queueTab === 'pending' ? a.sortTs - b.sortTs : b.sortTs - a.sortTs
    );
  }, [submissions, queueTab, handledFilter, search, userById]);

  const handleOpenSignedDoc = async (sub: KycSubmissionRow) => {
    const docTitle = `${sub.docType} (${userById.get(sub.userId)?.fullName || sub.userId})`;
    setPreviewDoc({ title: docTitle, url: null, loading: true });
    try {
      const url = await createPrivateBucketSignedUrl(
        sub.filePath,
        ['kyc', 'kyc-submissions', 'documents', 'manual-payment-proofs'],
        sub.inlineUrl
      );
      setPreviewDoc({ title: docTitle, url, loading: false });
    } catch (err: any) {
      setPreviewDoc(null);
      onError(err?.message || 'Unable to load signed KYC document URL.');
    }
  };

  const lastReviewedDetails = useMemo(() => {
    if (!lastReviewed) return null;
    const inv = userById.get(lastReviewed.userId);
    const invSubs = submissions.filter((s) => s.userId === lastReviewed.userId);
    const approvedCount = invSubs.filter((s) => s.status === 'approved').length;
    const pendingSubsCount = invSubs.filter((s) => s.status === 'pending').length;
    const rejectedCount = invSubs.filter((s) => s.status === 'rejected').length;
    const overallStatus =
      lastReviewed.rpcStatus ||
      inv?.kycStatus ||
      (rejectedCount > 0 && lastReviewed.action === 'rejected'
        ? 'rejected'
        : approvedCount > 0 && pendingSubsCount === 0 && rejectedCount === 0
        ? 'verified'
        : 'pending');
    return {
      ...lastReviewed,
      overallStatus,
      approvedCount,
      pendingCount: pendingSubsCount,
      rejectedCount,
    };
  }, [lastReviewed, userById, submissions]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 id="admin-main-heading" data-admin-queue-focus tabIndex={-1} className="text-lg font-bold text-[#F2F5F4] tracking-tight focus:outline-none">KYC Verification Queue</h2>
            <p className="text-xs text-[#8FA1A8] mt-1">
              Open submissions via short-lived signed URLs from the private <span className="font-mono text-[#6FD8B0]">kyc</span> bucket (oldest pending first) and review via <span className="font-mono text-[#6FD8B0]">review_kyc</span>.
            </p>
          </div>
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={() => setQueueTab('pending')}
              className={`min-h-[44px] px-3.5 py-2 rounded-lg text-xs font-semibold cursor-pointer tabular-nums ${
                queueTab === 'pending' ? 'bg-[#6FD8B0] text-[#0B0F10]' : 'bg-[#121A1F] border border-[#1F2C33] text-[#B6C4C9]'
              }`}
            >
              Pending ({pendingCount})
            </button>
            <button
              type="button"
              onClick={() => setQueueTab('handled')}
              className={`min-h-[44px] px-3.5 py-2 rounded-lg text-xs font-semibold cursor-pointer tabular-nums ${
                queueTab === 'handled' ? 'bg-[#6FD8B0] text-[#0B0F10]' : 'bg-[#121A1F] border border-[#1F2C33] text-[#B6C4C9]'
              }`}
            >
              Handled ({handledCount})
            </button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#8FA1A8]" />
            <input
              id="kyc-queue-search"
              type="text"
              aria-label="Search KYC submissions by investor name, email, or reference"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search investor name, email, or reference..."
              className="min-h-[44px] w-full pl-8 pr-3 py-2 bg-[#121A1F] border border-[#1F2C33] rounded-xl text-xs text-[#F2F5F4]"
            />
          </div>

          {queueTab === 'handled' && (
            <div className="flex items-center gap-1.5">
              {([
                { id: 'all', label: 'All' },
                { id: 'completed', label: 'Completed' },
                { id: 'failed', label: 'Failed' },
              ] as const).map((sub) => (
                <button
                  key={sub.id}
                  type="button"
                  onClick={() => setHandledFilter(sub.id)}
                  className={`min-h-[44px] px-3.5 py-2 rounded-lg text-xs font-semibold cursor-pointer ${
                    handledFilter === sub.id
                      ? 'bg-[#6FD8B0]/20 text-[#6FD8B0] border border-[#6FD8B0]/40'
                      : 'bg-[#121A1F] border border-[#1F2C33] text-[#8FA1A8]'
                  }`}
                >
                  {sub.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {lastReviewedDetails && (
        <div className="p-4 rounded-2xl bg-[#121A1F] border border-[#1F2C33] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-[#6FD8B0] shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-[#F2F5F4]">
                Investor overall KYC status for {lastReviewedDetails.investorName} ({lastReviewedDetails.investorEmail}):{' '}
                <span
                  className={`uppercase font-bold ${
                    lastReviewedDetails.overallStatus === 'verified' || lastReviewedDetails.overallStatus === 'approved'
                      ? 'text-[#6FD8B0]'
                      : lastReviewedDetails.overallStatus === 'rejected'
                      ? 'text-rose-400'
                      : 'text-amber-300'
                  }`}
                >
                  {lastReviewedDetails.overallStatus}
                </span>
              </div>
              <div className="text-[11px] text-[#8FA1A8] mt-0.5 tabular-nums">
                Submissions: {lastReviewedDetails.approvedCount} approved · {lastReviewedDetails.pendingCount} pending · {lastReviewedDetails.rejectedCount} rejected
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setLastReviewed(null)}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-[#8FA1A8] hover:text-[#F2F5F4] self-end sm:self-center cursor-pointer"
            aria-label="Dismiss investor KYC status banner"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {loading ? (
        <div className="space-y-3" role="status" aria-label="Loading KYC verification queue">
          {Array.from({ length: 4 }, (_, index) => (
            <div key={index} className="bg-[#121A1F] border border-[#1F2C33] rounded-2xl p-4 space-y-3">
              <div className="h-4 w-48 rounded bg-[#1F2C33] animate-pulse" />
              <div className="h-3 w-full rounded bg-[#1F2C33] animate-pulse" />
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {groupedByInvestor.map((grp) => (
            <div key={grp.investorId} className="bg-[#121A1F] border border-[#1F2C33] rounded-2xl overflow-hidden">
              <div className="px-5 py-3.5 bg-[#0B0F10] border-b border-[#1F2C33] flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="font-bold text-sm text-[#F2F5F4]">
                    {grp.investor?.fullName || 'Investor Account'}
                  </div>
                  <div className="text-[11px] text-[#8FA1A8]">
                    {grp.investor?.email || grp.investorId} · {grp.items.length} submission{grp.items.length === 1 ? '' : 's'}
                  </div>
                </div>
                <span className={`text-[11px] uppercase font-bold ${
                  grp.investor?.kycStatus === 'verified'
                    ? 'text-[#6FD8B0]'
                    : grp.investor?.kycStatus === 'rejected'
                    ? 'text-rose-400'
                    : 'text-amber-300'
                }`}>
                  Overall KYC Status: {grp.investor?.kycStatus || 'pending'}
                </span>
              </div>

              <div className="divide-y divide-[#1F2C33]">
                {grp.items.map((sub) => (
                  <div key={sub.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs hover:bg-[#162026]">
                    <div className="space-y-1">
                      <div className="font-semibold text-[#F2F5F4]">{sub.docType}</div>
                      <div className="text-[11px] text-[#8FA1A8] font-mono">
                        Ref: {sub.id} · {sub.filePath} · Submitted {formatDate(sub.createdAt)}
                      </div>
                      {sub.status !== 'pending' && (
                        <div className="text-[11px] text-[#B6C4C9]">
                          Processed by <span className="font-semibold text-[#F2F5F4]">{resolveProcessorLabel(sub.processedBy)}</span>
                          {sub.processedAt || sub.reviewedAt ? ` · ${formatDate(sub.processedAt || sub.reviewedAt!)}` : ''}
                        </div>
                      )}
                      {sub.reason && (
                        <div className="text-[11px] text-rose-300">Reason shown to investor: {sub.reason}</div>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleOpenSignedDoc(sub)}
                        className="min-h-[44px] px-3.5 py-2 rounded-lg bg-[#0B0F10] border border-[#1F2C33] hover:border-[#6FD8B0] text-[#6FD8B0] text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Open Document</span>
                      </button>

                      {sub.status === 'pending' ? (
                        <>
                          <button
                            type="button"
                            onClick={() => setApproveTarget(sub)}
                            className="min-h-[44px] px-3.5 py-2 rounded-lg bg-[#6FD8B0] hover:bg-[#5ec8a0] text-[#0B0F10] text-xs font-bold cursor-pointer"
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setRejectTarget(sub);
                              setRejectReason('');
                            }}
                            className="min-h-[44px] px-3.5 py-2 rounded-lg bg-[#0B0F10] border border-rose-500/40 text-rose-300 hover:bg-rose-500/10 text-xs font-semibold cursor-pointer"
                          >
                            Reject
                          </button>
                        </>
                      ) : (
                        <span className={`uppercase font-bold text-[11px] ${sub.status === 'approved' ? 'text-[#6FD8B0]' : 'text-rose-400'}`}>
                          {sub.status}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {groupedByInvestor.length === 0 && (
            <div className="bg-[#121A1F] border border-[#1F2C33] rounded-2xl p-10 text-center text-xs text-[#8FA1A8]">
              {queueTab === 'pending' && !search.trim()
                ? 'Nothing waiting'
                : 'No matching KYC submissions found.'}
            </div>
          )}
        </div>
      )}

      {/* Approve KYC Dialog */}
      {(() => {
        const inv = approveTarget ? userById.get(approveTarget.userId) : undefined;
        return (
          <AdminActionDialog
            open={Boolean(approveTarget)}
            actionName="Approve KYC"
            confirmLabel="Approve KYC"
            investorName={inv?.fullName || 'Investor Account'}
            investorEmail={inv?.email || approveTarget?.userId || ''}
            amountDisplay="N/A (Identity verification)"
            reference={approveTarget?.id || ''}
            extraDetails={[
              { label: 'Document Type', value: approveTarget?.docType || 'Identity Document' },
              { label: 'File Path', value: approveTarget?.filePath || '—', tone: 'mono' },
              { label: 'Current Overall KYC', value: String(inv?.kycStatus || 'pending').toUpperCase() },
            ]}
            onConfirm={async () => {
              if (!approveTarget) return;
              const rpcStatus = await reviewKycSubmission(approveTarget.id, true, undefined, approveTarget.userId);
              setLastReviewed({
                userId: approveTarget.userId,
                investorName: inv?.fullName || 'Investor Account',
                investorEmail: inv?.email || approveTarget.userId,
                action: 'approved',
                rpcStatus,
              });
              return `KYC submission approved for ${inv?.email || approveTarget.userId} (overall status: ${(rpcStatus || inv?.kycStatus || 'updated').toUpperCase()}).`;
            }}
            onRefresh={onRefresh}
            onRefreshError={onError}
            onSuccess={onSuccess}
            onClose={() => setApproveTarget(null)}
          />
        );
      })()}

      {/* Reject KYC Dialog */}
      {(() => {
        const inv = rejectTarget ? userById.get(rejectTarget.userId) : undefined;
        return (
          <AdminActionDialog
            open={Boolean(rejectTarget)}
            actionName="Reject KYC"
            confirmLabel="Reject KYC"
            tone="danger"
            investorName={inv?.fullName || 'Investor Account'}
            investorEmail={inv?.email || rejectTarget?.userId || ''}
            amountDisplay="N/A (Identity verification)"
            reference={rejectTarget?.id || ''}
            extraDetails={[
              { label: 'Document Type', value: rejectTarget?.docType || 'Identity Document' },
              { label: 'Current Overall KYC', value: String(inv?.kycStatus || 'pending').toUpperCase() },
            ]}
            validate={() => (!rejectReason.trim() ? 'A rejection reason is required.' : null)}
            onConfirm={async () => {
              if (!rejectTarget) return;
              const rpcStatus = await reviewKycSubmission(rejectTarget.id, false, rejectReason.trim(), rejectTarget.userId);
              setLastReviewed({
                userId: rejectTarget.userId,
                investorName: inv?.fullName || 'Investor Account',
                investorEmail: inv?.email || rejectTarget.userId,
                action: 'rejected',
                rpcStatus,
              });
              setRejectReason('');
              return `KYC submission rejected for ${inv?.email || rejectTarget.userId} (overall status: ${(rpcStatus || 'rejected').toUpperCase()}).`;
            }}
            onRefresh={onRefresh}
            onRefreshError={onError}
            onSuccess={onSuccess}
            onClose={() => {
              setRejectTarget(null);
              setRejectReason('');
            }}
          >
            <div>
              <label htmlFor="kyc-reject-reason" className="block text-xs font-semibold text-[#B6C4C9] mb-1">
                Rejection Reason (shown to the investor) *
              </label>
              <textarea
                id="kyc-reject-reason"
                rows={3}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="e.g. Document expired or corners cropped..."
                className="w-full p-3 bg-[#0B0F10] border border-[#1F2C33] rounded-xl text-xs text-[#F2F5F4]"
              />
              <p className="text-[11px] text-[#8FA1A8] mt-1">
                This reason will be displayed to the investor so they can upload a corrected document.
              </p>
            </div>
          </AdminActionDialog>
        );
      })()}

      {/* In-Page Signed Document Viewer Modal */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div ref={kycPreviewModalRef} tabIndex={-1} role="dialog" aria-modal="true" aria-label={previewDoc.title} className="bg-[#121A1F] border border-[#1F2C33] rounded-2xl max-w-2xl w-full p-5 space-y-4 focus:outline-none">
            <div className="flex items-center justify-between border-b border-[#1F2C33] pb-3">
              <div>
                <h3 className="text-sm font-bold text-[#F2F5F4]">{previewDoc.title}</h3>
                <p className="text-[11px] text-[#8FA1A8]">Private &ldquo;kyc&rdquo; bucket · short-lived signed URL (120s)</p>
              </div>
              <button type="button" onClick={() => setPreviewDoc(null)} aria-label="Close KYC document viewer" className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-[#8FA1A8] hover:text-[#F2F5F4] cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="bg-[#0B0F10] border border-[#1F2C33] rounded-xl p-3 max-h-[65vh] overflow-auto flex justify-center">
              {previewDoc.loading ? (
                <p className="text-xs text-[#8FA1A8] py-8">Generating short-lived signed URL...</p>
              ) : previewDoc.url ? (
                previewDoc.url.toLowerCase().includes('.pdf') || previewDoc.url.includes('application/pdf') ? (
                  <iframe src={previewDoc.url} title={previewDoc.title} className="w-full h-[55vh] rounded-lg" />
                ) : (
                  <img src={previewDoc.url} alt={previewDoc.title} className="max-h-[55vh] object-contain rounded-lg" />
                )
              ) : (
                <p className="text-xs text-[#8FA1A8] py-8">Signed URL unavailable for this bucket object.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// 10. DOCUMENTS: upload PDF to private "documents" bucket, list & delete (read-only for Support)
// ============================================================================
export const AdminDocumentsSection: React.FC<{
  users: PlatformUser[];
  documents: InvestorDocumentRow[];
  properties: Property[];
  readOnly?: boolean;
  onRefresh: () => void;
  onSuccess: (msg: string) => void;
  onError: (msg: string) => void;
}> = ({ users, documents, properties, readOnly = false, onRefresh, onSuccess, onError }) => {
  const [subTab, setSubTab] = useState<'vault' | 'spv'>('vault');
  const [targetUserId, setTargetUserId] = useState<string>(() => users[0]?.id || '');
  const [title, setTitle] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [previewDoc, setPreviewDoc] = useState<{ title: string; url: string | null } | null>(null);
  const docPreviewModalRef = useDialogFocus<HTMLDivElement>(Boolean(previewDoc), () => setPreviewDoc(null));

  const userById = useMemo(() => new Map(users.map((u) => [u.id, u])), [users]);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (readOnly) return;
    const uid = targetUserId || users[0]?.id;
    if (!uid || !title.trim() || !selectedFile) {
      onError('Select an investor, enter a title, and choose a PDF file.');
      return;
    }
    setUploading(true);
    try {
      await uploadPdfToDocumentsBucket(uid, title.trim(), selectedFile);
      setTitle('');
      setSelectedFile(null);
      onSuccess('PDF uploaded to private "documents" bucket and saved.');
      onRefresh();
    } catch (err: any) {
      onError(err?.message || 'Unable to upload PDF document.');
    } finally {
      setUploading(false);
    }
  };

  const handleOpen = async (doc: InvestorDocumentRow) => {
    try {
      const url = await createPrivateBucketSignedUrl(doc.filePath, ['documents'], doc.inlineUrl);
      setPreviewDoc({ title: doc.title, url });
    } catch (err: any) {
      onError(err?.message || 'Unable to load signed document URL.');
    }
  };

  const handleDelete = async (doc: InvestorDocumentRow) => {
    if (readOnly || deletingId) return;
    setDeletingId(doc.id);
    try {
      await deleteInvestorDocumentRecord(doc);
      onSuccess(`Deleted "${doc.title}".`);
      onRefresh();
    } catch (err: any) {
      onError(err?.message || 'Unable to delete document.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 id="admin-main-heading" data-admin-queue-focus tabIndex={-1} className="text-lg font-bold text-[#F2F5F4] tracking-tight flex items-center gap-2 focus:outline-none">
            <span>Documents</span>
            {readOnly && <span className="text-[11px] font-semibold text-amber-400">· Read-Only</span>}
          </h2>
          <p className="text-xs text-[#8FA1A8] mt-1">
            Upload investor PDFs to the private <span className="font-mono text-[#6FD8B0]">documents</span> bucket and manage property dossiers.
          </p>
        </div>
        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={() => setSubTab('vault')}
            className={`min-h-[44px] px-3.5 py-2 rounded-lg text-xs font-semibold cursor-pointer ${
              subTab === 'vault' ? 'bg-[#6FD8B0] text-[#0B0F10]' : 'bg-[#121A1F] border border-[#1F2C33] text-[#B6C4C9]'
            }`}
          >
            Investor Documents ({documents.length})
          </button>
          <button
            type="button"
            onClick={() => setSubTab('spv')}
            className={`min-h-[44px] px-3.5 py-2 rounded-lg text-xs font-semibold cursor-pointer ${
              subTab === 'spv' ? 'bg-[#6FD8B0] text-[#0B0F10]' : 'bg-[#121A1F] border border-[#1F2C33] text-[#B6C4C9]'
            }`}
          >
            SPV Dossiers ({properties.length})
          </button>
        </div>
      </div>

      {subTab === 'spv' ? (
        <PropertyDocumentsHub properties={properties} readOnly={readOnly} />
      ) : (
        <div className="space-y-6">
          {!readOnly && (
            <form onSubmit={handleUpload} className="bg-[#121A1F] border border-[#1F2C33] rounded-2xl p-5 space-y-4">
              <h3 className="text-sm font-bold text-[#F2F5F4] flex items-center gap-2">
                <Upload className="w-4 h-4 text-[#6FD8B0]" />
                <span>Upload Investor PDF</span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                <div>
                  <label htmlFor="doc-upload-investor" className="block text-[#B6C4C9] font-semibold mb-1">Investor</label>
                  <select
                    id="doc-upload-investor"
                    value={targetUserId || users[0]?.id || ''}
                    onChange={(e) => setTargetUserId(e.target.value)}
                    className="min-h-[44px] w-full px-3 py-2 bg-[#0B0F10] border border-[#1F2C33] rounded-xl text-[#F2F5F4]"
                  >
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.fullName || u.email} ({u.email})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="doc-upload-title" className="block text-[#B6C4C9] font-semibold mb-1">Document Title</label>
                  <input
                    id="doc-upload-title"
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. 2026 Tax & Subscription Certificate"
                    className="min-h-[44px] w-full px-3 py-2 bg-[#0B0F10] border border-[#1F2C33] rounded-xl text-[#F2F5F4]"
                  />
                </div>
                <div>
                  <label htmlFor="doc-upload-file" className="block text-[#B6C4C9] font-semibold mb-1">PDF File</label>
                  <input
                    id="doc-upload-file"
                    type="file"
                    accept="application/pdf,.pdf"
                    required
                    onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                    className="min-h-[44px] w-full px-3 py-1.5 bg-[#0B0F10] border border-[#1F2C33] rounded-xl text-[#F2F5F4] file:mr-3 file:px-2.5 file:py-1.5 file:rounded-lg file:border-0 file:bg-[#6FD8B0] file:text-[#0B0F10] file:font-bold file:cursor-pointer"
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={uploading}
                  className="min-h-[44px] px-4 py-2 rounded-xl bg-[#6FD8B0] hover:bg-[#5ec8a0] text-[#0B0F10] text-xs font-bold cursor-pointer disabled:opacity-50"
                >
                  {uploading ? 'Uploading PDF...' : 'Upload to Private Bucket'}
                </button>
              </div>
            </form>
          )}

          <div className="bg-[#121A1F] rounded-2xl border border-[#1F2C33] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-[#0B0F10] border-b border-[#1F2C33] text-[11px] font-semibold text-[#8FA1A8] uppercase tracking-wider">
                    <th className="py-3 px-4">Title</th>
                    <th className="py-3 px-4">Investor</th>
                    <th className="py-3 px-4">Storage Path</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1F2C33]">
                  {documents.map((doc) => {
                    const inv = userById.get(doc.userId);
                    return (
                      <tr key={doc.id} className="hover:bg-[#162026]">
                        <td className="py-3.5 px-4 font-semibold text-[#F2F5F4]">{doc.title}</td>
                        <td className="py-3.5 px-4 text-[#B6C4C9]">{inv?.fullName || inv?.email || doc.userId}</td>
                        <td className="py-3.5 px-4 font-mono text-[#8FA1A8] text-[11px]">{doc.filePath}</td>
                        <td className="py-3.5 px-4 text-[#B6C4C9] whitespace-nowrap">{formatDate(doc.createdAt)}</td>
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleOpen(doc)}
                              className="min-h-[44px] px-3 py-2 rounded-lg bg-[#0B0F10] border border-[#1F2C33] hover:border-[#6FD8B0] text-[#6FD8B0] text-xs font-semibold cursor-pointer inline-flex items-center gap-1.5"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>Open</span>
                            </button>
                            {!readOnly && (
                              <button
                                type="button"
                                disabled={deletingId === doc.id}
                                onClick={() => handleDelete(doc)}
                                className="min-h-[44px] px-3 py-2 rounded-lg bg-[#0B0F10] border border-rose-500/40 text-rose-300 hover:bg-rose-500/10 text-xs font-semibold cursor-pointer inline-flex items-center gap-1.5 disabled:opacity-50"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Delete</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {documents.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-10 text-center text-xs text-[#8FA1A8]">
                        No investor documents stored yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {previewDoc && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div ref={docPreviewModalRef} tabIndex={-1} role="dialog" aria-modal="true" aria-label={previewDoc.title} className="bg-[#121A1F] border border-[#1F2C33] rounded-2xl max-w-2xl w-full p-5 space-y-4 focus:outline-none">
            <div className="flex items-center justify-between border-b border-[#1F2C33] pb-3">
              <h3 className="text-sm font-bold text-[#F2F5F4]">{previewDoc.title}</h3>
              <button type="button" onClick={() => setPreviewDoc(null)} aria-label="Close document preview" className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-[#8FA1A8] hover:text-[#F2F5F4] cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="bg-[#0B0F10] border border-[#1F2C33] rounded-xl p-3">
              {previewDoc.url ? (
                <iframe src={previewDoc.url} title={previewDoc.title} className="w-full h-[60vh] rounded-lg" />
              ) : (
                <p className="text-xs text-[#8FA1A8] py-8 text-center">Signed URL unavailable for this document.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// 11. NOTIFICATIONS: send to one investor or everyone (user_id null), list sent items
// ============================================================================
export const AdminNotificationsSection: React.FC<{
  users: PlatformUser[];
  notifications: AdminNotificationRecord[];
  onRefresh: () => void;
  onSuccess: (msg: string) => void;
  onError: (msg: string) => void;
}> = ({ users, notifications, onRefresh, onSuccess, onError }) => {
  const [targetUserId, setTargetUserId] = useState<string>('all');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const userById = useMemo(() => new Map(users.map((u) => [u.id, u])), [users]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) {
      onError('Title and message are required.');
      return;
    }
    setSending(true);
    try {
      await sendAdminNotificationRecord({
        userId: targetUserId,
        title: title.trim(),
        message: message.trim(),
        type: 'info',
      });
      setTitle('');
      setMessage('');
      onSuccess(
        targetUserId === 'all'
          ? 'Broadcast notification sent to everyone.'
          : 'Notification sent to investor.'
      );
      onRefresh();
    } catch (err: any) {
      onError(err?.message || 'Unable to send notification.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 id="admin-main-heading" data-admin-queue-focus tabIndex={-1} className="text-lg font-bold text-[#F2F5F4] tracking-tight focus:outline-none">Notifications</h2>
        <p className="text-xs text-[#8FA1A8] mt-1">
          Send a notification to one investor or to everyone (<span className="font-mono text-[#6FD8B0]">user_id = null</span>) and view sent history.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <form onSubmit={handleSend} className="lg:col-span-5 bg-[#121A1F] border border-[#1F2C33] rounded-2xl p-5 space-y-4">
          <h3 className="text-sm font-bold text-[#F2F5F4] flex items-center gap-2">
            <Bell className="w-4 h-4 text-[#6FD8B0]" />
            <span>Send Notification</span>
          </h3>

          <div className="space-y-3 text-xs">
            <div>
              <label htmlFor="notif-recipient-select" className="block text-[#B6C4C9] font-semibold mb-1">Recipient</label>
              <select
                id="notif-recipient-select"
                value={targetUserId}
                onChange={(e) => setTargetUserId(e.target.value)}
                className="min-h-[44px] w-full px-3 py-2 bg-[#0B0F10] border border-[#1F2C33] rounded-xl text-[#F2F5F4]"
              >
                <option value="all">Everyone (user_id: null)</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.fullName || u.email} ({u.email})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="notif-title-input" className="block text-[#B6C4C9] font-semibold mb-1">Title</label>
              <input
                id="notif-title-input"
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Quarterly distribution scheduled"
                className="min-h-[44px] w-full px-3 py-2 bg-[#0B0F10] border border-[#1F2C33] rounded-xl text-[#F2F5F4]"
              />
            </div>
            <div>
              <label htmlFor="notif-message-input" className="block text-[#B6C4C9] font-semibold mb-1">Message</label>
              <textarea
                id="notif-message-input"
                rows={4}
                required
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Message body..."
                className="w-full p-3 bg-[#0B0F10] border border-[#1F2C33] rounded-xl text-[#F2F5F4]"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={sending}
            className="min-h-[44px] w-full py-2.5 rounded-xl bg-[#6FD8B0] hover:bg-[#5ec8a0] text-[#0B0F10] text-xs font-bold flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{sending ? 'Sending...' : 'Send Notification'}</span>
          </button>
        </form>

        <div className="lg:col-span-7 bg-[#121A1F] border border-[#1F2C33] rounded-2xl overflow-hidden">
          <div className="p-4 bg-[#0B0F10] border-b border-[#1F2C33] flex items-center justify-between">
            <h3 className="text-sm font-bold text-[#F2F5F4]">Sent Notifications</h3>
            <span className="text-xs text-[#8FA1A8] tabular-nums">{notifications.length} sent</span>
          </div>
          <div className="divide-y divide-[#1F2C33] max-h-[520px] overflow-y-auto">
            {notifications.map((n) => {
              const target = n.userId && n.userId !== 'all' ? userById.get(n.userId) : null;
              return (
                <div key={n.id} className="p-4 hover:bg-[#162026] space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-bold text-xs text-[#F2F5F4]">{n.title}</div>
                    <span className="text-[10px] font-semibold text-[#6FD8B0]">
                      {n.userId === 'all' || !n.userId ? 'Everyone' : target?.email || n.userEmail || n.userId}
                    </span>
                  </div>
                  <p className="text-xs text-[#B6C4C9] leading-relaxed">{n.message}</p>
                  <div className="text-[11px] text-[#8FA1A8]">{formatDate(n.createdAt)}</div>
                </div>
              );
            })}
            {notifications.length === 0 && (
              <div className="py-12 text-center text-xs text-[#8FA1A8]">No sent notifications yet.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// 12. REPORTS: AUM, funding per property, deposits/withdrawals per month, distributions paid + Export CSV
// ============================================================================
export const AdminReportsSection: React.FC<{
  users: PlatformUser[];
  properties: Property[];
  investments: any[];
  transactions: any[];
  pastDistributions: PastDistributionRow[];
}> = ({ users, properties, investments, transactions, pastDistributions }) => {
  const aumAtCostCents = useMemo(() => {
    if (investments.length > 0) {
      return investments.reduce((s, i) => s + eurToCents(i.totalCost ?? i.amountEUR ?? i.total_amount_invested ?? 0), 0);
    }
    return users.reduce((s, u) => s + eurToCents(u.investedBalance || 0), 0);
  }, [investments, users]);

  const distributionsPaidCents = useMemo(() => {
    if (pastDistributions.length > 0) {
      return pastDistributions.reduce((s, d) => s + eurToCents(d.totalEur || 0), 0);
    }
    return transactions
      .filter((t) => ['dividend', 'distribution', 'yield'].includes(String(t.type).toLowerCase()) && ['completed', 'approved', 'paid'].includes(String(t.status).toLowerCase()))
      .reduce((s, t) => s + eurToCents(t.amount || 0), 0);
  }, [pastDistributions, transactions]);

  const monthlyFlows = useMemo(() => {
    const months = new Map<string, { month: string; depositsCents: number; withdrawalsCents: number; distributionsCents: number }>();
    for (const tx of transactions) {
      if (!['completed', 'approved', 'paid'].includes(String(tx.status).toLowerCase())) continue;
      const month = String(tx.createdAt || '').slice(0, 7) || 'Unknown';
      if (!months.has(month)) {
        months.set(month, { month, depositsCents: 0, withdrawalsCents: 0, distributionsCents: 0 });
      }
      const entry = months.get(month)!;
      const amtCents = eurToCents(tx.amount || 0);
      if (tx.type === 'deposit') entry.depositsCents += amtCents;
      else if (tx.type === 'withdrawal') entry.withdrawalsCents += amtCents;
      else if (['dividend', 'distribution', 'yield'].includes(String(tx.type).toLowerCase())) entry.distributionsCents += amtCents;
    }
    return Array.from(months.values()).sort((a, b) => b.month.localeCompare(a.month));
  }, [transactions]);

  const totalDepositsCents = monthlyFlows.reduce((s, m) => s + m.depositsCents, 0);
  const totalWithdrawalsCents = monthlyFlows.reduce((s, m) => s + m.withdrawalsCents, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 id="admin-main-heading" data-admin-queue-focus tabIndex={-1} className="text-lg font-bold text-[#F2F5F4] tracking-tight focus:outline-none">Reports</h2>
          <p className="text-xs text-[#8FA1A8] mt-1">
            AUM at cost, funding per property, monthly deposits &amp; withdrawals, and total distributions paid.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() =>
              triggerCsvDownload(
                `lagence-property-funding-${new Date().toISOString().slice(0, 10)}.csv`,
                ['Property', 'City', 'Target (EUR)', 'Funded (EUR)', 'Funded %', 'Status'],
                properties.map((p) => {
                  const targetCents = eurToCents(p.targetAmount);
                  const fundedCents = eurToCents(p.fundedAmount);
                  return [
                    p.title,
                    p.city || p.location,
                    centsToEur(targetCents).toFixed(2),
                    centsToEur(fundedCents).toFixed(2),
                    targetCents > 0 ? Math.round((fundedCents / targetCents) * 100) : 0,
                    p.status,
                  ];
                })
              )
            }
            className="min-h-[44px] px-3.5 py-2 rounded-xl bg-[#6FD8B0] hover:bg-[#5ec8a0] text-[#0B0F10] text-xs font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Property CSV</span>
          </button>
          <button
            type="button"
            onClick={() =>
              triggerCsvDownload(
                `lagence-monthly-cashflow-${new Date().toISOString().slice(0, 10)}.csv`,
                ['Month', 'Deposits (EUR)', 'Withdrawals (EUR)', 'Net (EUR)', 'Distributions Paid (EUR)'],
                monthlyFlows.map((m) => [
                  m.month,
                  centsToEur(m.depositsCents).toFixed(2),
                  centsToEur(m.withdrawalsCents).toFixed(2),
                  centsToEur(m.depositsCents - m.withdrawalsCents).toFixed(2),
                  centsToEur(m.distributionsCents).toFixed(2),
                ])
              )
            }
            className="min-h-[44px] px-3.5 py-2 rounded-xl bg-[#121A1F] border border-[#1F2C33] hover:border-[#6FD8B0] text-xs font-semibold text-[#F2F5F4] flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-[#6FD8B0]" />
            <span>Export Monthly CSV</span>
          </button>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#121A1F] p-5 rounded-2xl border border-[#1F2C33]">
          <div className="text-[11px] uppercase tracking-wider font-semibold text-[#8FA1A8]">Total AUM (at cost)</div>
          <div className="text-xl font-bold text-[#6FD8B0] mt-1 tabular-nums">{formatCentsEur(aumAtCostCents)}</div>
        </div>
        <div className="bg-[#121A1F] p-5 rounded-2xl border border-[#1F2C33]">
          <div className="text-[11px] uppercase tracking-wider font-semibold text-[#8FA1A8]">Total Deposits Settled</div>
          <div className="text-xl font-bold text-[#F2F5F4] mt-1 tabular-nums">{formatCentsEur(totalDepositsCents)}</div>
        </div>
        <div className="bg-[#121A1F] p-5 rounded-2xl border border-[#1F2C33]">
          <div className="text-[11px] uppercase tracking-wider font-semibold text-[#8FA1A8]">Total Withdrawals Paid</div>
          <div className="text-xl font-bold text-[#F2F5F4] mt-1 tabular-nums">{formatCentsEur(totalWithdrawalsCents)}</div>
        </div>
        <div className="bg-[#121A1F] p-5 rounded-2xl border border-[#1F2C33]">
          <div className="text-[11px] uppercase tracking-wider font-semibold text-[#8FA1A8]">Distributions Paid</div>
          <div className="text-xl font-bold text-[#6FD8B0] mt-1 tabular-nums">{formatCentsEur(distributionsPaidCents)}</div>
        </div>
      </div>

      {/* Funding Per Property */}
      <div className="bg-[#121A1F] rounded-2xl border border-[#1F2C33] overflow-hidden">
        <div className="p-4 bg-[#0B0F10] border-b border-[#1F2C33]">
          <h3 className="text-sm font-bold text-[#F2F5F4]">Funding per Property</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-[#0B0F10] border-b border-[#1F2C33] text-[11px] font-semibold text-[#8FA1A8] uppercase">
                <th className="py-3 px-4">Property</th>
                <th className="py-3 px-4 text-right">Target</th>
                <th className="py-3 px-4 text-right">Funded</th>
                <th className="py-3 px-4 text-right">Funded %</th>
                <th className="py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1F2C33]">
              {properties.map((p) => {
                const targetCents = eurToCents(p.targetAmount);
                const fundedCents = eurToCents(p.fundedAmount);
                const pct = targetCents > 0 ? Math.round((fundedCents / targetCents) * 100) : 0;
                return (
                  <tr key={p.id} className="hover:bg-[#162026]">
                    <td className="py-3 px-4 font-semibold text-[#F2F5F4]">{p.title}</td>
                    <td className="py-3 px-4 text-right text-[#B6C4C9] tabular-nums">{formatCentsEur(targetCents)}</td>
                    <td className="py-3 px-4 text-right font-bold text-[#6FD8B0] tabular-nums">{formatCentsEur(fundedCents)}</td>
                    <td className="py-3 px-4 text-right font-mono text-[#F2F5F4] tabular-nums">{pct}%</td>
                    <td className="py-3 px-4 uppercase text-[11px] text-[#B6C4C9]">{p.status}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Deposits / Withdrawals per Month */}
      <div className="bg-[#121A1F] rounded-2xl border border-[#1F2C33] overflow-hidden">
        <div className="p-4 bg-[#0B0F10] border-b border-[#1F2C33]">
          <h3 className="text-sm font-bold text-[#F2F5F4]">Deposits, Withdrawals &amp; Distributions per Month</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-[#0B0F10] border-b border-[#1F2C33] text-[11px] font-semibold text-[#8FA1A8] uppercase">
                <th className="py-3 px-4">Month</th>
                <th className="py-3 px-4 text-right">Deposits</th>
                <th className="py-3 px-4 text-right">Withdrawals</th>
                <th className="py-3 px-4 text-right">Net Flow</th>
                <th className="py-3 px-4 text-right">Distributions Paid</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1F2C33]">
              {monthlyFlows.map((m) => (
                <tr key={m.month} className="hover:bg-[#162026]">
                  <td className="py-3 px-4 font-mono text-[#F2F5F4]">{m.month}</td>
                  <td className="py-3 px-4 text-right text-[#6FD8B0] font-semibold tabular-nums">{formatCentsEur(m.depositsCents)}</td>
                  <td className="py-3 px-4 text-right text-[#F2F5F4] tabular-nums">{formatCentsEur(m.withdrawalsCents)}</td>
                  <td className="py-3 px-4 text-right text-[#B6C4C9] tabular-nums">{formatCentsEur(m.depositsCents - m.withdrawalsCents)}</td>
                  <td className="py-3 px-4 text-right text-[#6FD8B0] tabular-nums">{formatCentsEur(m.distributionsCents)}</td>
                </tr>
              ))}
              {monthlyFlows.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-xs text-[#8FA1A8]">No monthly transaction activity yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// 13. STAFF & ROLES (SUPER ADMIN ONLY): set_staff_role
// ============================================================================
export const AdminStaffRolesSection: React.FC<{
  users: PlatformUser[];
  onRefresh: () => void;
  onSuccess: (msg: string) => void;
  onError: (msg: string) => void;
}> = ({ users, onRefresh, onSuccess, onError }) => {
  const [selectedUserId, setSelectedUserId] = useState<string>(() => users[0]?.id || '');
  const [roleValue, setRoleValue] = useState<string>('finance');
  const [busyId, setBusyId] = useState<string | null>(null);

  const staffUsers = useMemo(
    () => users.filter((u) => u.isAdmin || (u.staffRole && String(u.staffRole).trim() !== '')),
    [users]
  );

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    const uid = selectedUserId || users[0]?.id;
    if (!uid) return;
    setBusyId(uid);
    try {
      await assignStaffRoleRpc(uid, roleValue);
      onSuccess(`Assigned staff role "${roleValue}" via set_staff_role.`);
      onRefresh();
    } catch (err: any) {
      onError(err?.message || 'Unable to assign staff role.');
    } finally {
      setBusyId(null);
    }
  };

  const handleRemove = async (u: PlatformUser) => {
    if (busyId) return;
    setBusyId(u.id);
    try {
      await assignStaffRoleRpc(u.id, null);
      onSuccess(`Removed staff role from ${u.email}.`);
      onRefresh();
    } catch (err: any) {
      onError(err?.message || 'Unable to remove staff role.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 id="admin-main-heading" data-admin-queue-focus tabIndex={-1} className="text-lg font-bold text-[#F2F5F4] tracking-tight focus:outline-none">Staff &amp; Roles</h2>
        <p className="text-xs text-[#8FA1A8] mt-1">
          Super Admin control over staff access via <span className="font-mono text-[#6FD8B0]">set_staff_role</span>.
        </p>
      </div>

      {/* Assign Role Form */}
      <form onSubmit={handleAssign} className="bg-[#121A1F] border border-[#1F2C33] rounded-2xl p-5 space-y-4">
        <h3 className="text-sm font-bold text-[#F2F5F4] flex items-center gap-2">
          <Shield className="w-4 h-4 text-[#6FD8B0]" />
          <span>Assign Staff Role</span>
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div>
            <label htmlFor="staff-user-select" className="block text-[#B6C4C9] font-semibold mb-1">User Account</label>
            <select
              id="staff-user-select"
              value={selectedUserId || users[0]?.id || ''}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="min-h-[44px] w-full px-3 py-2 bg-[#0B0F10] border border-[#1F2C33] rounded-xl text-[#F2F5F4]"
            >
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.fullName || u.email} ({u.email})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="staff-role-select" className="block text-[#B6C4C9] font-semibold mb-1">Staff Role</label>
            <select
              id="staff-role-select"
              value={roleValue}
              onChange={(e) => setRoleValue(e.target.value)}
              className="min-h-[44px] w-full px-3 py-2 bg-[#0B0F10] border border-[#1F2C33] rounded-xl text-[#F2F5F4]"
            >
              <option value="finance">Finance</option>
              <option value="compliance">Compliance</option>
              <option value="property_manager">Property Manager</option>
              <option value="support">Support</option>
              <option value="super_admin">Super Admin</option>
            </select>
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              disabled={Boolean(busyId)}
              className="min-h-[44px] w-full py-2 rounded-xl bg-[#6FD8B0] hover:bg-[#5ec8a0] text-[#0B0F10] font-bold cursor-pointer disabled:opacity-50"
            >
              {busyId ? 'Saving...' : 'Assign Role'}
            </button>
          </div>
        </div>
      </form>

      {/* Current Staff List */}
      <div className="bg-[#121A1F] rounded-2xl border border-[#1F2C33] overflow-hidden">
        <div className="p-4 bg-[#0B0F10] border-b border-[#1F2C33] flex items-center justify-between">
          <h3 className="text-sm font-bold text-[#F2F5F4]">Users with Staff Access</h3>
          <span className="text-xs text-[#8FA1A8]">{staffUsers.length} staff</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-[#0B0F10] border-b border-[#1F2C33] text-[11px] text-[#8FA1A8] uppercase">
                <th className="py-3 px-4">Name</th>
                <th className="py-3 px-4">Email</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1F2C33]">
              {staffUsers.map((u) => (
                <tr key={u.id} className="hover:bg-[#162026]">
                  <td className="py-3.5 px-4 font-semibold text-[#F2F5F4]">{u.fullName || 'Staff'}</td>
                  <td className="py-3.5 px-4 text-[#B6C4C9]">{u.email}</td>
                  <td className="py-3.5 px-4">
                    <span className="px-2 py-0.5 rounded bg-[#6FD8B0]/15 text-[#6FD8B0] border border-[#6FD8B0]/30 text-[10px] font-bold uppercase">
                      {u.isAdmin ? 'Super Admin (is_admin)' : getStaffRoleLabel((u.staffRole as any) || null)}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <button
                      type="button"
                      disabled={busyId === u.id}
                      onClick={() => handleRemove(u)}
                      className="min-h-[44px] px-3.5 py-2 rounded-lg bg-[#0B0F10] border border-rose-500/40 text-rose-300 hover:bg-rose-500/10 text-xs font-semibold cursor-pointer disabled:opacity-50"
                    >
                      Remove Role
                    </button>
                  </td>
                </tr>
              ))}
              {staffUsers.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-xs text-[#8FA1A8]">No users currently have a staff role assigned.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// 15. AUDIT LOG (SUPER ADMIN ONLY): read-only table of audit_log with actor, entity, date filters
// ============================================================================
export const AdminAuditLogSection: React.FC<{
  logs: AuditLogRow[];
  users: PlatformUser[];
  onRefresh: () => void;
}> = ({ logs, users, onRefresh }) => {
  const [actorFilter, setActorFilter] = useState('');
  const [entityFilter, setEntityFilter] = useState('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const userById = useMemo(() => new Map(users.map((u) => [u.id, u])), [users]);
  const entities = useMemo(() => Array.from(new Set(logs.map((l) => l.entity).filter(Boolean))).sort(), [logs]);

  const filtered = useMemo(() => {
    const qActor = actorFilter.trim().toLowerCase();
    const fromMs = fromDate ? new Date(fromDate).getTime() : null;
    const toMs = toDate ? new Date(`${toDate}T23:59:59.999Z`).getTime() : null;
    return logs.filter((l) => {
      if (entityFilter !== 'all' && l.entity !== entityFilter) return false;
      const actorObj = userById.get(l.actor);
      const actorDisplay = `${l.actor} ${actorObj?.email || ''} ${actorObj?.fullName || ''}`.toLowerCase();
      if (qActor && !actorDisplay.includes(qActor)) return false;
      const ts = new Date(l.createdAt).getTime();
      if (fromMs && ts < fromMs) return false;
      if (toMs && ts > toMs) return false;
      return true;
    });
  }, [logs, actorFilter, entityFilter, fromDate, toDate, userById]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 id="admin-main-heading" data-admin-queue-focus tabIndex={-1} className="text-lg font-bold text-[#F2F5F4] tracking-tight flex items-center gap-2 focus:outline-none">
            <ClipboardList className="w-5 h-5 text-[#6FD8B0]" />
            <span>Audit Log</span>
            <span className="text-[11px] font-semibold text-[#8FA1A8]">· Read-Only</span>
          </h2>
          <p className="text-xs text-[#8FA1A8] mt-1">
            Immutable operational history from <span className="font-mono text-[#6FD8B0]">audit_log</span>.
          </p>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          className="min-h-[44px] px-3.5 py-2 rounded-xl bg-[#121A1F] border border-[#1F2C33] hover:border-[#6FD8B0] text-xs font-semibold text-[#F2F5F4] flex items-center gap-1.5 cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5 text-[#6FD8B0]" />
          <span>Refresh</span>
        </button>
      </div>

      {/* Filters: Actor, Entity, Date */}
      <div className="bg-[#121A1F] p-4 rounded-2xl border border-[#1F2C33] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
        <div>
          <label htmlFor="audit-actor-filter" className="block text-[11px] text-[#8FA1A8] mb-1">Actor (email or ID)</label>
          <input
            id="audit-actor-filter"
            type="text"
            value={actorFilter}
            onChange={(e) => setActorFilter(e.target.value)}
            placeholder="Filter by actor..."
            className="min-h-[44px] w-full px-3 py-2 bg-[#0B0F10] border border-[#1F2C33] rounded-xl text-[#F2F5F4]"
          />
        </div>
        <div>
          <label htmlFor="audit-entity-filter" className="block text-[11px] text-[#8FA1A8] mb-1">Entity</label>
          <select
            id="audit-entity-filter"
            value={entityFilter}
            onChange={(e) => setEntityFilter(e.target.value)}
            className="min-h-[44px] w-full px-3 py-2 bg-[#0B0F10] border border-[#1F2C33] rounded-xl text-[#F2F5F4]"
          >
            <option value="all">All Entities</option>
            {entities.map((ent) => (
              <option key={ent} value={ent}>{ent}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="audit-date-from" className="block text-[11px] text-[#8FA1A8] mb-1">Date From</label>
          <input
            id="audit-date-from"
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="min-h-[44px] w-full px-3 py-2 bg-[#0B0F10] border border-[#1F2C33] rounded-xl text-[#F2F5F4]"
          />
        </div>
        <div>
          <label htmlFor="audit-date-to" className="block text-[11px] text-[#8FA1A8] mb-1">Date To</label>
          <input
            id="audit-date-to"
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="min-h-[44px] w-full px-3 py-2 bg-[#0B0F10] border border-[#1F2C33] rounded-xl text-[#F2F5F4]"
          />
        </div>
      </div>

      <div className="bg-[#121A1F] rounded-2xl border border-[#1F2C33] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-[#0B0F10] border-b border-[#1F2C33] text-[11px] font-semibold text-[#8FA1A8] uppercase">
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Actor</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Entity / ID</th>
                <th className="py-3 px-4">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1F2C33]">
              {filtered.slice(0, 150).map((row) => {
                const actorUser = userById.get(row.actor);
                return (
                  <tr key={row.id} className="hover:bg-[#162026]">
                    <td className="py-3 px-4 text-[#B6C4C9] whitespace-nowrap">{formatDate(row.createdAt)}</td>
                    <td className="py-3 px-4">
                      <div className="text-[#F2F5F4] font-semibold">{actorUser?.email || row.actor}</div>
                      {actorUser && <div className="text-[10px] font-mono text-[#8FA1A8]">{row.actor}</div>}
                    </td>
                    <td className="py-3 px-4 font-mono text-[#6FD8B0] font-semibold">{row.action}</td>
                    <td className="py-3 px-4">
                      <div className="text-[#F2F5F4]">{row.entity}</div>
                      <div className="text-[10px] font-mono text-[#8FA1A8]">{row.entityId}</div>
                    </td>
                    <td className="py-3 px-4 text-[11px] font-mono text-[#B6C4C9] max-w-xs truncate">
                      {typeof row.details === 'string' ? row.details : JSON.stringify(row.details)}
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-xs text-[#8FA1A8]">No audit entries match filters.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
