import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../../lib/auth';
import { useNavigation } from '../../lib/navigation';
import { ledger } from '../../lib/ledger';
import { formatCurrency } from '../../lib/utils';
import { Property } from '../../types/property';
import { AccountType, User as PlatformUser, UserRole } from '../../types/user';
import { getApiUrl, getAuthToken } from '../../lib/api';
import { LagenceLogo } from '../common/LagenceLogo';
import {
  ADMIN_NAV_ITEMS,
  AdminSectionId,
  canAccessSection,
  getAllowedSettingsTabs,
  getDefaultSectionForRole,
  getStaffRoleLabel,
  isReadOnlySection,
  mapHashToFinanceTab,
  mapHashToSection,
  resolveEffectiveStaffRole,
} from './adminRbac';
import { AdminUserManagement } from './AdminUserManagement';
import {
  AdminAuditLogSection,
  AdminDistributionsSection,
  AdminDocumentsSection,
  AdminInvestmentsSection,
  AdminKycSection,
  AdminNotificationRecord,
  AdminNotificationsSection,
  AdminPropertiesSection,
  AdminReportsSection,
  AdminStaffRolesSection,
} from './AdminOpsSections';
import {
  AdminDashboardSection,
  AdminDepositsSection,
  AdminSettingsSection,
  AdminTransactionsSection,
  AdminWithdrawalsSection,
} from './AdminSettingsAndTreasurySections';
import { AdminFinanceSection, FinanceTabId } from './AdminFinanceSection';
import {
  AdminStatsSummary,
  AuditLogRow,
  InvestorDocumentRow,
  KycSubmissionRow,
  PastDistributionRow,
  PaymentGateRecord,
  centsToEur,
  eurToCents,
  fetchAdminNotificationsTable,
  fetchAdminStats,
  fetchAuditLogRows,
  fetchInvestorDocumentsTable,
  fetchKycSubmissionsQueue,
  fetchPastDistributions,
  fetchPaymentGatesWithCounts,
  fetchSettingsRows,
  fetchSupabaseProperties,
  fetchWalletBalancesMap,
  formatCentsEur,
} from './adminSupabaseGateway';
import {
  AlertCircle,
  ArrowDownLeft,
  ArrowUpRight,
  BarChart3,
  Bell,
  Briefcase,
  Building2,
  CheckCircle2,
  ClipboardList,
  Coins,
  ExternalLink,
  FileText,
  Landmark,
  LayoutDashboard,
  LogOut,
  Menu,
  Receipt,
  RefreshCw,
  Settings,
  Shield,
  UserCheck,
  Users,
  Wallet,
  X,
} from 'lucide-react';

const SECTION_ICONS: Record<AdminSectionId, React.ComponentType<{ className?: string }>> = {
  dashboard: LayoutDashboard,
  investors: Users,
  finance: Landmark,
  deposits: ArrowDownLeft,
  withdrawals: ArrowUpRight,
  properties: Building2,
  investments: Briefcase,
  distributions: Coins,
  transactions: Receipt,
  kyc: UserCheck,
  documents: FileText,
  notifications: Bell,
  reports: BarChart3,
  'staff-roles': Shield,
  settings: Settings,
  'audit-log': ClipboardList,
};

export const AdminPanel: React.FC = () => {
  const { user, logout } = useAuth();
  const { currentPath, navigateTo } = useNavigation();

  const effectiveRole = resolveEffectiveStaffRole(user);

  // Redirect non-staff users immediately to the investor app
  useEffect(() => {
    if (!user) {
      navigateTo('/login');
      return;
    }
    if (!effectiveRole) {
      navigateTo('/dashboard');
    }
  }, [user, effectiveRole, navigateTo]);

  const allowedNavItems = useMemo(
    () => ADMIN_NAV_ITEMS.filter((item) => canAccessSection(effectiveRole, item.id)),
    [effectiveRole]
  );

  const allowedSettingsTabs = useMemo(
    () => getAllowedSettingsTabs(effectiveRole),
    [effectiveRole]
  );

  const resolveInitialSection = useCallback((): AdminSectionId => {
    const fallback = getDefaultSectionForRole(effectiveRole);
    if (typeof window === 'undefined') return fallback;
    const fromHash = mapHashToSection(window.location.hash);
    const fromPath = mapHashToSection(window.location.pathname);
    const candidate = fromHash || fromPath;
    if (candidate && canAccessSection(effectiveRole, candidate)) {
      return candidate;
    }
    return fallback;
  }, [effectiveRole]);

  const [activeSection, setActiveSection] = useState<AdminSectionId>(resolveInitialSection);
  const [financeTab, setFinanceTab] = useState<FinanceTabId>(() => {
    if (typeof window === 'undefined') return 'overview';
    return (mapHashToFinanceTab(window.location.hash) || mapHashToFinanceTab(window.location.pathname) || 'overview') as FinanceTabId;
  });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (!effectiveRole) return;
    if (!canAccessSection(effectiveRole, activeSection)) {
      setActiveSection(getDefaultSectionForRole(effectiveRole));
    }
  }, [effectiveRole, activeSection]);

  useEffect(() => {
    const syncFromLocation = () => {
      const hashStr = typeof window !== 'undefined' ? window.location.hash : '';
      const fromHash = hashStr ? mapHashToSection(hashStr) : null;
      const fromPath = mapHashToSection(currentPath);
      const candidate = fromHash || fromPath;
      const tabCandidate = (hashStr ? mapHashToFinanceTab(hashStr) : null) || mapHashToFinanceTab(currentPath);
      if (tabCandidate) {
        setFinanceTab(tabCandidate as FinanceTabId);
      }
      if (candidate && canAccessSection(effectiveRole, candidate)) {
        setActiveSection(candidate);
      }
    };
    syncFromLocation();
    window.addEventListener('hashchange', syncFromLocation);
    return () => window.removeEventListener('hashchange', syncFromLocation);
  }, [currentPath, effectiveRole]);

  const handleSelectSection = (section: AdminSectionId) => {
    // Route legacy treasury shortcuts straight to the unified 7-tab Finance workspace
    const legacyTabMap: Partial<Record<AdminSectionId, FinanceTabId>> = {
      deposits: 'deposits',
      withdrawals: 'withdrawals',
      transactions: 'ledger',
      distributions: 'investments',
    };
    const mappedTab = legacyTabMap[section];
    if (mappedTab && canAccessSection(effectiveRole, 'finance')) {
      setFinanceTab(mappedTab);
      setActiveSection('finance');
      setMobileMenuOpen(false);
      if (typeof window !== 'undefined') {
        window.location.hash = `finance/${mappedTab}`;
      }
      return;
    }
    if (!canAccessSection(effectiveRole, section)) return;
    setActiveSection(section);
    setMobileMenuOpen(false);
    if (typeof window !== 'undefined') {
      window.location.hash = section === 'finance' ? `finance/${financeTab}` : section;
    }
  };

  // Core Data States
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const [users, setUsers] = useState<PlatformUser[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [manualDeposits, setManualDeposits] = useState<any[]>([]);
  const [investments, setInvestments] = useState<any[]>([]);
  const [properties, setProperties] = useState<Property[]>(() => ledger.getProperties());
  const [kycSubmissions, setKycSubmissions] = useState<KycSubmissionRow[]>([]);
  const [documents, setDocuments] = useState<InvestorDocumentRow[]>([]);
  const [notifications, setNotifications] = useState<AdminNotificationRecord[]>([]);
  const [pastDistributions, setPastDistributions] = useState<PastDistributionRow[]>([]);
  const [paymentGates, setPaymentGates] = useState<PaymentGateRecord[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogRow[]>([]);
  const [platformLimits, setPlatformLimits] = useState<Record<string, any>>({ withdrawal_fee_eur: 0 });
  const [adminStats, setAdminStats] = useState<AdminStatsSummary>({
    pendingDepositsCount: 0,
    pendingDepositsTotalEur: 0,
    pendingWithdrawalsCount: 0,
    pendingWithdrawalsTotalEur: 0,
    kycQueueCount: 0,
    investorsCount: 0,
    totalAumAtCostEur: 0,
    source: 'computed',
  });

  // Manual Credit Modal
  const [creditModalOpen, setCreditModalOpen] = useState(false);
  const [creditConfirmStep, setCreditConfirmStep] = useState(false);
  const [creditUserId, setCreditUserId] = useState('');
  const [creditAmount, setCreditAmount] = useState<number>(1000);
  const [creditCurrency, setCreditCurrency] = useState('EUR');
  const [creditMethod, setCreditMethod] = useState('Direct SEPA Wire Received');
  const [creditReference, setCreditReference] = useState('');
  const [creditNotes, setCreditNotes] = useState('Cleared in treasury settlement account.');
  const [submittingCredit, setSubmittingCredit] = useState(false);
  const creditLockRef = useRef<boolean>(false);

  const showToastSuccess = useCallback((msg: string) => {
    setActionError(null);
    setActionSuccess(msg);
    setTimeout(() => setActionSuccess((prev) => (prev === msg ? null : prev)), 4500);
  }, []);

  const showToastError = useCallback((msg: string) => {
    setActionError(msg);
  }, []);

  const loadData = useCallback(async (isInitial = false) => {
    if (!effectiveRole) return;
    if (isInitial) setLoading(true);
    else setRefreshing(true);

    try {
      const token = getAuthToken();
      const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};

      const safeJson = async (url: string) => {
        try {
          const r = await fetch(getApiUrl(url), { headers, credentials: 'include' });
          if (!r.ok) return null;
          return await r.json();
        } catch {
          return null;
        }
      };

      const [
        usersRes,
        txRes,
        manualDepRes,
        invRes,
        docsRes,
        listingsRes,
        notifRes,
        walletMap,
        sbProps,
        pastDists,
        sbNotifs,
        logs,
        settingsRes,
      ] = await Promise.all([
        safeJson('/admin/users'),
        safeJson('/admin/transactions'),
        safeJson('/admin/manual-deposits'),
        safeJson('/admin/investments'),
        safeJson('/admin/documents'),
        safeJson('/marketplace/listings'),
        safeJson('/admin/notifications'),
        fetchWalletBalancesMap(),
        fetchSupabaseProperties(),
        fetchPastDistributions(),
        fetchAdminNotificationsTable(),
        fetchAuditLogRows(),
        fetchSettingsRows().catch(() => null),
      ]);
      if (settingsRes?.limits) {
        setPlatformLimits(settingsRes.limits);
      }

      let nextUsers: PlatformUser[] = [];
      if (Array.isArray(usersRes?.data)) {
        nextUsers = usersRes.data.map((row: any) => {
          const uid = String(row.id);
          const walletFromView = walletMap.get(uid);
          const isFrozen = Boolean(row.frozen || row.status === 'suspended');
          return {
            id: uid,
            email: String(row.email || ''),
            fullName: String(row.fullName || ''),
            role: (row.role || 'investor') as UserRole,
            isAdmin: Boolean(row.isAdmin),
            staffRole: row.staffRole || null,
            assignedGateId: row.assignedGateId || null,
            assignedGateName: row.assignedGateName || null,
            accountType: row.accountType as AccountType,
            kycStatus: row.kycStatus === 'approved' ? 'verified' : (row.kycStatus || 'pending'),
            walletBalance: walletFromView !== undefined ? walletFromView : Number(row.balance || 0),
            investedBalance: Number(row.investedBalance || 0),
            totalEarned: Number(row.totalEarned || 0),
            createdAt: row.createdAt || new Date().toISOString(),
            phoneNumber: row.phoneNumber || undefined,
            country: row.country || undefined,
            frozen: isFrozen,
            status: isFrozen ? 'suspended' : 'active',
            suspendedReason: row.suspendedReason || undefined,
            bankIban: row.bankIban || undefined,
            bankAccountHolder: row.bankAccountHolder || undefined,
            cryptoDepositAddress: row.cryptoDepositAddress || undefined,
          };
        });
        setUsers(nextUsers);
        setCreditUserId((cur) => cur || nextUsers[0]?.id || '');
      }

      const nextTx = Array.isArray(txRes?.data)
        ? txRes.data.map((row: any) => ({
            id: String(row.id),
            userId: String(row.userId || row.user_id || ''),
            userEmail: row.userEmail || row.email || undefined,
            propertyId: row.propertyId || row.property_id || undefined,
            type: String(row.type || 'transaction'),
            amount: Number(row.amount || 0),
            feeAmount: Number(row.feeAmount ?? row.fee_amount ?? 0),
            netAmount: row.netAmount !== undefined ? Number(row.netAmount) : row.net_amount !== undefined ? Number(row.net_amount) : undefined,
            currency: String(row.currency || 'EUR'),
            status: String(row.status || 'pending'),
            description: row.description || row.notes || `${row.type || 'tx'} (${row.reference || row.id})`,
            reference: String(row.reference || row.id),
            payoutReference: row.payoutReference || row.payout_reference || row.metadata?.payout_reference || undefined,
            createdAt: String(row.createdAt || row.created_at || new Date().toISOString()),
            method: String(row.method || row.paymentMethod || 'SEPA Wire'),
            txHash: row.txHash || row.tx_hash || undefined,
            destIban: row.destIban || row.dest_iban || row.destination || row.metadata?.bankIban || undefined,
            destination: row.destination || row.destIban || row.dest_iban || row.metadata?.bankIban || row.txHash || undefined,
            proofUrl: row.proofUrl || row.proof_url || undefined,
            processedBy: row.processedBy || row.processed_by_email || row.processed_by || undefined,
            processedById: row.processedById || row.processed_by || undefined,
            processedAt: row.processedAt || row.processed_at || undefined,
            reversalOfId: row.reversalOfId || row.reversedTransactionId || row.reversed_transaction_id || row.metadata?.reversal_of_id || undefined,
            reversalOfReference: row.reversalOfReference || row.metadata?.reversal_of_reference || undefined,
            reversedById: row.reversedById || row.metadata?.reversed_by_id || undefined,
            reversedByReference: row.reversedByReference || row.metadata?.reversed_by_reference || undefined,
            reversalReason: row.reversalReason || row.reversal_reason || undefined,
          }))
        : [];
      if (Array.isArray(txRes?.data)) {
        setTransactions(nextTx);
      }

      if (Array.isArray(manualDepRes?.data)) {
        setManualDeposits(manualDepRes.data);
      }

      const nextInv = Array.isArray(invRes?.data) ? invRes.data : [];
      if (Array.isArray(invRes?.data)) {
        setInvestments(nextInv);
      }

      const fallbackDocs = Array.isArray(docsRes?.data)
        ? docsRes.data.map((d: any) => ({
            id: String(d.id),
            userId: String(d.userId || ''),
            userEmail: String(d.userEmail || ''),
            userName: String(d.userName || 'Investor'),
            category: d.category,
            documentType: String(d.documentType || 'Document'),
            title: String(d.title || d.fileName || 'Verification Proof'),
            fileUrl: String(d.fileDataUrl || d.fileUrl || ''),
            fileName: String(d.fileName || 'document.pdf'),
            fileSize: Number(d.fileSize || 0),
            status: d.status === 'verified' ? 'approved' : d.status === 'rejected' ? 'rejected' : 'pending',
            rejectionReason: d.notes || undefined,
            uploadedAt: String(d.uploadedAt || new Date().toISOString()),
          }))
        : [];

      const [kycRows, invDocs, gates] = await Promise.all([
        fetchKycSubmissionsQueue(fallbackDocs),
        fetchInvestorDocumentsTable(fallbackDocs),
        fetchPaymentGatesWithCounts(nextUsers),
      ]);
      setKycSubmissions(kycRows);
      setDocuments(invDocs);
      setPaymentGates(gates);
      setPastDistributions(pastDists);
      setAuditLogs(logs);

      // Properties: prefer live Supabase `properties` table when available, else merge `/marketplace/listings`
      const localProps = ledger.getProperties();
      const localById = new Map(localProps.map((p) => [p.id, p]));
      if (sbProps && sbProps.length > 0) {
        const mappedSb: Property[] = sbProps.map((sp) => {
          const existing = localById.get(sp.id);
          const targetEur = sp.funding_target_cents / 100;
          const shareEur = sp.share_price_cents / 100;
          const fundedEur = Math.round((targetEur * sp.funded_pct) / 100);
          return {
            ...(existing || {}),
            id: sp.id,
            slug: existing?.slug || sp.id,
            title: sp.name,
            location: existing?.location || sp.city,
            city: sp.city,
            country: existing?.country || 'Europe',
            type: sp.type as any,
            status: sp.status as any,
            images: sp.photos,
            bannerImage: sp.photos[0] || existing?.bannerImage || '',
            targetAmount: targetEur,
            fundedAmount: fundedEur,
            tokenPrice: shareEur,
            totalTokens: shareEur > 0 ? Math.round(targetEur / shareEur) : 0,
            availableTokens: shareEur > 0 ? Math.round(((100 - sp.funded_pct) / 100) * (targetEur / shareEur)) : 0,
            estimatedAnnualYield: sp.target_yield,
            capitalAppreciationYield: Math.max(0, Number((sp.target_irr - sp.target_yield).toFixed(2))),
            totalEstimatedReturn: sp.target_irr,
            durationMonths: parseInt(sp.term, 10) || 36,
            minimumInvestment: shareEur,
            distributionFrequency: existing?.distributionFrequency || 'Monthly',
            tokenTicker: existing?.tokenTicker || `LAG-${sp.id.slice(0, 4).toUpperCase()}`,
            blockchainNetwork: existing?.blockchainNetwork || 'Polygon POS',
            tokenContractAddress: existing?.tokenContractAddress || '',
            description: sp.description,
            investmentStructure: existing?.investmentStructure || 'Tokenized SPV',
            highlights: existing?.highlights || [],
            risks: existing?.risks || [],
            exitStrategy: existing?.exitStrategy || '',
            feeStructure: existing?.feeStructure || { structuringFee: '3.5%', managementFee: '10%', withdrawalFee: '0%', exitFee: '0%' },
            paymentSchedule: existing?.paymentSchedule || { distributionFrequency: 'Monthly', payoutDate: '1st of month', annualReconciliation: 'February', maturityTerms: sp.term },
            financialBreakdown: existing?.financialBreakdown || {
              propertyPrice: targetEur,
              refurbishmentBudget: 0,
              legalAndClosingCosts: 0,
              operatingReserve: 0,
              totalProjectCost: targetEur,
              projectedAnnualGrossRent: 0,
              estimatedOperatingExpenses: 0,
              projectedAnnualNetRent: 0,
              estimatedNetYield: sp.target_yield,
              estimatedCapitalGainYield: Math.max(0, sp.target_irr - sp.target_yield),
              totalEstimatedYield: sp.target_irr,
            },
            documents: existing?.documents || [],
            investorCount: existing?.investorCount || 0,
            createdAt: sp.created_at || existing?.createdAt || new Date().toISOString(),
            funded_pct: sp.funded_pct,
          } as any;
        });
        setProperties(mappedSb);
      } else if (Array.isArray(listingsRes?.data) && listingsRes.data.length > 0) {
        const merged: Property[] = listingsRes.data.map((item: any) => {
          const existing = localById.get(item.id);
          return {
            ...(existing || {}),
            id: String(item.id),
            slug: item.slug || existing?.slug || String(item.id),
            title: item.title || existing?.title || 'Untitled SPV',
            location: item.location || existing?.location || 'Europe',
            city: item.city || existing?.city || 'Paris',
            country: item.country || existing?.country || 'France',
            type: item.type || existing?.type || 'Residential',
            status: item.status || existing?.status || 'open',
            images: item.images || existing?.images || [],
            bannerImage: (item.images && item.images[0]) || existing?.bannerImage || '',
            targetAmount: Number(item.targetAmount ?? existing?.targetAmount ?? 0),
            fundedAmount: Number(item.fundedAmount ?? existing?.fundedAmount ?? 0),
            tokenPrice: Number(item.tokenPrice ?? existing?.tokenPrice ?? 500),
            totalTokens: Number(item.totalTokens ?? existing?.totalTokens ?? 0),
            availableTokens: Number(item.availableTokens ?? existing?.availableTokens ?? 0),
            estimatedAnnualYield: Number(item.estimatedAnnualYield ?? item.projectedYield ?? existing?.estimatedAnnualYield ?? 0),
            capitalAppreciationYield: Number(item.capitalAppreciationYield ?? item.capitalAppreciation ?? existing?.capitalAppreciationYield ?? 0),
            totalEstimatedReturn: Number(item.totalEstimatedReturn ?? existing?.totalEstimatedReturn ?? 0),
            durationMonths: Number(item.holdingPeriodMonths ?? existing?.durationMonths ?? 36),
            minimumInvestment: Number(item.minimumInvestment ?? existing?.minimumInvestment ?? 1000),
            distributionFrequency: existing?.distributionFrequency || 'Monthly',
            tokenTicker: existing?.tokenTicker || item.tokenTicker || `LAG-${String(item.id).slice(-4).toUpperCase()}`,
            blockchainNetwork: existing?.blockchainNetwork || 'Polygon POS',
            tokenContractAddress: existing?.tokenContractAddress || '',
            description: item.description || existing?.description || '',
            investmentStructure: existing?.investmentStructure || 'Tokenized SPV',
            highlights: existing?.highlights || [],
            risks: existing?.risks || [],
            exitStrategy: existing?.exitStrategy || '',
            feeStructure: existing?.feeStructure || { structuringFee: '3.5%', managementFee: '10%', withdrawalFee: '0%', exitFee: '0%' },
            paymentSchedule: existing?.paymentSchedule || { distributionFrequency: 'Monthly', payoutDate: '1st of month', annualReconciliation: 'February', maturityTerms: 'At exit' },
            financialBreakdown: existing?.financialBreakdown || {
              propertyPrice: Number(item.targetAmount || 0),
              refurbishmentBudget: 0,
              legalAndClosingCosts: 0,
              operatingReserve: 0,
              totalProjectCost: Number(item.targetAmount || 0),
              projectedAnnualGrossRent: 0,
              estimatedOperatingExpenses: 0,
              projectedAnnualNetRent: 0,
              estimatedNetYield: Number(item.estimatedAnnualYield || 0),
              estimatedCapitalGainYield: Number(item.capitalAppreciationYield || 0),
              totalEstimatedYield: Number(item.estimatedAnnualYield || 0),
            },
            documents: existing?.documents || [],
            investorCount: Number(existing?.investorCount ?? 0),
            createdAt: item.createdAt || existing?.createdAt || new Date().toISOString(),
          };
        });
        setProperties(merged);
      } else {
        setProperties(localProps);
      }

      if (sbNotifs && sbNotifs.length > 0) {
        setNotifications(sbNotifs);
      } else if (Array.isArray(notifRes?.data)) {
        setNotifications(notifRes.data);
      }

      const pendingKycCount = kycRows.filter((k) => k.status === 'pending').length;
      const computedStats = await fetchAdminStats({
        users: nextUsers,
        transactions: nextTx,
        investments: nextInv,
        kycQueueCount: pendingKycCount,
      });
      setAdminStats(computedStats);
    } catch (err: any) {
      showToastError(err?.message || 'Unable to synchronize back-office data.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [effectiveRole, showToastError]);

  useEffect(() => {
    if (effectiveRole) {
      loadData(true);
    }
  }, [effectiveRole, loadData]);

  const pendingDeposits = useMemo(
    () => transactions.filter((t) => t.type === 'deposit' && t.status === 'pending'),
    [transactions]
  );
  const pendingWithdrawals = useMemo(
    () => transactions.filter((t) => t.type === 'withdrawal' && t.status === 'pending'),
    [transactions]
  );
  const pendingKycCount = useMemo(
    () => kycSubmissions.filter((k) => k.status === 'pending').length,
    [kycSubmissions]
  );

  const navBadgeCount = (id: AdminSectionId): number | undefined => {
    if (id === 'finance' && (pendingDeposits.length + pendingWithdrawals.length) > 0) {
      return pendingDeposits.length + pendingWithdrawals.length;
    }
    if (id === 'deposits' && pendingDeposits.length > 0) return pendingDeposits.length;
    if (id === 'withdrawals' && pendingWithdrawals.length > 0) return pendingWithdrawals.length;
    if (id === 'kyc' && pendingKycCount > 0) return pendingKycCount;
    return undefined;
  };

  const handleExecuteManualCredit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (creditLockRef.current || submittingCredit) return;
    const amtCents = eurToCents(creditAmount);
    if (!creditUserId || !Number.isFinite(amtCents) || amtCents <= 0) {
      showToastError('Select an investor and enter a positive amount.');
      return;
    }
    if (!creditConfirmStep) {
      setCreditConfirmStep(true);
      return;
    }
    const cleanEur = centsToEur(amtCents);
    creditLockRef.current = true;
    setSubmittingCredit(true);
    try {
      const token = getAuthToken();
      const res = await fetch(getApiUrl(`/admin/users/${encodeURIComponent(creditUserId)}/credit`), {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          amount: cleanEur,
          amountCents: amtCents,
          currency: creditCurrency,
          method: creditMethod,
          reference: creditReference.trim() || undefined,
          notes: creditNotes.trim() || undefined,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = body?.error || body?.message || 'Wallet credit failed.';
        const details = body?.details ? ` — ${body.details}` : '';
        throw new Error(`${msg}${details}`);
      }
      setCreditModalOpen(false);
      setCreditConfirmStep(false);
      setCreditReference('');
      await loadData(false);
      showToastSuccess(`Credited ${formatCentsEur(amtCents)} (${creditCurrency}) to investor wallet.`);
    } catch (err: any) {
      showToastError(err?.message || 'Unable to execute wallet credit.');
    } finally {
      setSubmittingCredit(false);
      creditLockRef.current = false;
    }
  };

  if (!user || !effectiveRole) {
    return (
      <div className="min-h-screen bg-[#0B0F10] text-[#F2F5F4] flex flex-col items-center justify-center p-6">
        <div className="w-8 h-8 border-2 border-[#6FD8B0] border-t-transparent rounded-full animate-spin mb-3" />
        <span className="text-xs text-[#8FA1A8]">Redirecting to investor app...</span>
      </div>
    );
  }

  const groups: Array<'Overview' | 'Treasury' | 'Assets & Portfolio' | 'Compliance & Comms' | 'System'> = [
    'Overview',
    'Treasury',
    'Assets & Portfolio',
    'Compliance & Comms',
    'System',
  ];

  const activeNavMeta = ADMIN_NAV_ITEMS.find((i) => i.id === activeSection);
  const roleLabel = getStaffRoleLabel(effectiveRole);

  return (
    <div className="min-h-screen bg-[#0B0F10] text-[#F2F5F4] flex flex-col lg:flex-row font-sans">
      {/* DESKTOP LEFT SIDEBAR */}
      <aside className="hidden lg:flex lg:w-64 lg:shrink-0 lg:flex-col bg-[#121A1F] border-r border-[#1F2C33] lg:h-screen lg:sticky lg:top-0">
        <div className="p-5 border-b border-[#1F2C33] space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <LagenceLogo variant="green" className="w-7 h-7" />
              <span className="font-bold text-sm tracking-tight text-[#F2F5F4]">L&apos;Agence</span>
            </div>
            <span className="px-2 py-0.5 rounded-md bg-[#6FD8B0]/15 text-[#6FD8B0] border border-[#6FD8B0]/30 text-[10px] font-bold uppercase tracking-wider">
              Admin
            </span>
          </div>

          <div className="p-3 rounded-xl bg-[#0B0F10] border border-[#1F2C33]">
            <div className="text-[10px] uppercase tracking-wider text-[#8FA1A8] font-semibold">Signed-In Role</div>
            <div className="text-xs font-bold text-[#6FD8B0] mt-0.5">{roleLabel}</div>
            <div className="text-[11px] text-[#B6C4C9] truncate mt-0.5">{user.email}</div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto p-3 space-y-5" aria-label="Staff navigation">
          {groups.map((grp) => {
            const items = allowedNavItems.filter((i) => i.group === grp);
            if (items.length === 0) return null;
            return (
              <div key={grp} className="space-y-1">
                <div className="px-3 text-[10px] font-bold uppercase tracking-wider text-[#8FA1A8]">
                  {grp}
                </div>
                {items.map((item) => {
                  const Icon = SECTION_ICONS[item.id];
                  const active = activeSection === item.id;
                  const count = navBadgeCount(item.id);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleSelectSection(item.id)}
                      className={`w-full px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer ${
                        active
                          ? 'bg-[#6FD8B0] text-[#0B0F10]'
                          : 'text-[#B6C4C9] hover:text-[#F2F5F4] hover:bg-[#162026]'
                      }`}
                    >
                      <span className="flex items-center gap-2.5">
                        <Icon className="w-4 h-4 shrink-0" />
                        <span>{item.label}</span>
                      </span>
                      {typeof count === 'number' && (
                        <span
                          className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold tabular-nums ${
                            active
                              ? 'bg-[#0B0F10]/20 text-[#0B0F10]'
                              : 'bg-[#0B0F10] text-[#6FD8B0] border border-[#1F2C33]'
                          }`}
                        >
                          {count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </nav>

        <div className="p-3 border-t border-[#1F2C33] space-y-1.5">
          <button
            type="button"
            onClick={() => navigateTo('/dashboard')}
            className="w-full px-3 py-2 rounded-xl bg-[#0B0F10] border border-[#1F2C33] hover:border-[#6FD8B0] text-xs font-semibold text-[#F2F5F4] flex items-center justify-between cursor-pointer transition-colors"
          >
            <span>Investor App</span>
            <ExternalLink className="w-3.5 h-3.5 text-[#6FD8B0]" />
          </button>
          <button
            type="button"
            onClick={() => {
              logout();
              navigateTo('/login');
            }}
            className="w-full px-3 py-2 rounded-xl bg-[#0B0F10] border border-[#1F2C33] hover:border-rose-500/40 text-xs font-semibold text-rose-300 flex items-center justify-between cursor-pointer transition-colors"
          >
            <span>Sign Out</span>
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </aside>

      {/* MOBILE TOP BAR & COLLAPSIBLE MENU */}
      <header className="lg:hidden sticky top-0 z-40 bg-[#121A1F] border-b border-[#1F2C33]">
        <div className="px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <LagenceLogo variant="green" className="w-6 h-6 shrink-0" />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-[#F2F5F4] truncate">
                  {activeNavMeta?.label || 'Admin'}
                </span>
                <span className="px-1.5 py-0.5 rounded bg-[#6FD8B0]/15 text-[#6FD8B0] border border-[#6FD8B0]/30 text-[9px] font-bold uppercase">
                  Admin
                </span>
              </div>
              <div className="text-[11px] text-[#8FA1A8] truncate">
                {roleLabel} · {user.email}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => loadData(false)}
              className="p-2 rounded-lg bg-[#0B0F10] border border-[#1F2C33] text-[#6FD8B0] cursor-pointer"
              aria-label="Refresh back office"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
            <button
              type="button"
              onClick={() => setMobileMenuOpen((v) => !v)}
              className="p-2 rounded-lg bg-[#0B0F10] border border-[#1F2C33] text-[#F2F5F4] cursor-pointer"
              aria-label="Toggle staff navigation menu"
            >
              {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="px-4 pb-4 pt-2 border-t border-[#1F2C33] bg-[#121A1F] space-y-2 max-h-[70vh] overflow-y-auto">
            <div className="grid grid-cols-2 gap-2">
              {allowedNavItems.map((item) => {
                const Icon = SECTION_ICONS[item.id];
                const active = activeSection === item.id;
                const count = navBadgeCount(item.id);
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelectSection(item.id)}
                    className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between cursor-pointer ${
                      active
                        ? 'bg-[#6FD8B0] text-[#0B0F10]'
                        : 'bg-[#0B0F10] border border-[#1F2C33] text-[#B6C4C9]'
                    }`}
                  >
                    <span className="flex items-center gap-2 truncate">
                      <Icon className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </span>
                    {typeof count === 'number' && <span className="text-[10px] font-bold">{count}</span>}
                  </button>
                );
              })}
            </div>
            <div className="flex gap-2 pt-2 border-t border-[#1F2C33]">
              <button
                type="button"
                onClick={() => navigateTo('/dashboard')}
                className="flex-1 py-2 rounded-xl bg-[#0B0F10] border border-[#1F2C33] text-xs font-semibold text-[#F2F5F4] cursor-pointer"
              >
                Investor App
              </button>
              <button
                type="button"
                onClick={() => {
                  logout();
                  navigateTo('/login');
                }}
                className="flex-1 py-2 rounded-xl bg-[#0B0F10] border border-rose-500/30 text-xs font-semibold text-rose-300 cursor-pointer"
              >
                Sign Out
              </button>
            </div>
          </div>
        )}
      </header>

      {/* MAIN WORKSPACE */}
      <div className="flex-1 min-w-0 flex flex-col">
        <div className="hidden lg:flex items-center justify-between px-8 py-4 border-b border-[#1F2C33] bg-[#0B0F10]">
          <div className="flex items-center gap-3">
            <span className="text-sm font-bold text-[#F2F5F4]">{activeNavMeta?.label || 'Dashboard'}</span>
            <span className="text-[#1F2C33]">|</span>
            <span className="text-xs text-[#8FA1A8]">
              Admin · <strong className="text-[#6FD8B0]">{roleLabel}</strong>
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            {(effectiveRole === 'super_admin' || effectiveRole === 'finance') && (
              <button
                type="button"
                onClick={() => {
                  setCreditUserId((p) => p || users[0]?.id || '');
                  setCreditConfirmStep(false);
                  setCreditModalOpen(true);
                }}
                className="px-3.5 py-2 rounded-xl bg-[#121A1F] border border-[#1F2C33] hover:border-[#6FD8B0] text-xs font-semibold text-[#F2F5F4] flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <Wallet className="w-3.5 h-3.5 text-[#6FD8B0]" />
                <span>Credit Investor</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => loadData(false)}
              disabled={refreshing}
              className="px-3.5 py-2 rounded-xl bg-[#121A1F] border border-[#1F2C33] hover:border-[#6FD8B0] text-xs font-semibold text-[#F2F5F4] flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-[#6FD8B0] ${refreshing ? 'animate-spin' : ''}`} />
              <span>Sync Data</span>
            </button>
          </div>
        </div>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
          {actionSuccess && (
            <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-medium flex items-center justify-between gap-2">
              <span className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#6FD8B0] shrink-0" />
                <span>{actionSuccess}</span>
              </span>
              <button type="button" onClick={() => setActionSuccess(null)} className="text-[#8FA1A8] hover:text-[#F2F5F4] cursor-pointer">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {actionError && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-medium flex items-center justify-between gap-2">
              <span className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{actionError}</span>
              </span>
              <button type="button" onClick={() => setActionError(null)} className="text-[#8FA1A8] hover:text-[#F2F5F4] cursor-pointer">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center text-xs text-[#8FA1A8]">
              <div className="w-8 h-8 border-2 border-[#6FD8B0] border-t-transparent rounded-full animate-spin mb-3" />
              <span>Synchronizing back-office telemetry...</span>
            </div>
          ) : (
            <>
              {/* 1. DASHBOARD */}
              {activeSection === 'dashboard' && canAccessSection(effectiveRole, 'dashboard') && (
                <AdminDashboardSection
                  stats={adminStats}
                  users={users}
                  transactions={transactions}
                  effectiveRole={effectiveRole}
                  onNavigateSection={handleSelectSection}
                />
              )}

              {/* 2. INVESTORS (Read-only for Support) */}
              {activeSection === 'investors' && canAccessSection(effectiveRole, 'investors') && (
                <AdminUserManagement
                  users={users}
                  investments={investments}
                  transactions={transactions}
                  documents={documents}
                  paymentGates={paymentGates}
                  currentAdminEmail={user.email}
                  readOnly={isReadOnlySection(effectiveRole, 'investors')}
                  onRefreshAll={() => loadData(false)}
                  onQuickSuccess={showToastSuccess}
                  onQuickError={showToastError}
                  onNavigateToManualCredit={(uid) => {
                    if (isReadOnlySection(effectiveRole, 'investors')) return;
                    setCreditUserId(uid);
                    setCreditConfirmStep(false);
                    setCreditModalOpen(true);
                  }}
                />
              )}

              {/* 2B. UNIFIED 7-TAB FINANCE WORKSPACE */}
              {activeSection === 'finance' && canAccessSection(effectiveRole, 'finance') && (
                <AdminFinanceSection
                  initialTab={financeTab}
                  onTabChange={(nextTab) => {
                    setFinanceTab(nextTab);
                    if (typeof window !== 'undefined') {
                      window.location.hash = `finance/${nextTab}`;
                    }
                  }}
                  stats={adminStats}
                  limits={platformLimits}
                  users={users}
                  transactions={transactions}
                  manualDeposits={manualDeposits}
                  investments={investments}
                  properties={properties}
                  pastDistributions={pastDistributions}
                  paymentGates={paymentGates}
                  onRefresh={() => loadData(false)}
                  onSuccess={showToastSuccess}
                  onError={showToastError}
                />
              )}

              {/* 3. KYC */}
              {activeSection === 'kyc' && canAccessSection(effectiveRole, 'kyc') && (
                <AdminKycSection
                  users={users}
                  submissions={kycSubmissions}
                  onRefresh={() => loadData(false)}
                  onSuccess={showToastSuccess}
                  onError={showToastError}
                />
              )}

              {/* 4. DEPOSITS */}
              {activeSection === 'deposits' && canAccessSection(effectiveRole, 'deposits') && (
                <AdminDepositsSection
                  users={users}
                  transactions={transactions}
                  manualDeposits={manualDeposits}
                  paymentGates={paymentGates}
                  onRefresh={() => loadData(false)}
                  onSuccess={showToastSuccess}
                  onError={showToastError}
                />
              )}

              {/* 5. WITHDRAWALS */}
              {activeSection === 'withdrawals' && canAccessSection(effectiveRole, 'withdrawals') && (
                <AdminWithdrawalsSection
                  users={users}
                  transactions={transactions}
                  onRefresh={() => loadData(false)}
                  onSuccess={showToastSuccess}
                  onError={showToastError}
                />
              )}

              {/* 6. PROPERTIES */}
              {activeSection === 'properties' && canAccessSection(effectiveRole, 'properties') && (
                <AdminPropertiesSection
                  properties={properties}
                  onRefresh={() => loadData(false)}
                  onSuccess={showToastSuccess}
                  onError={showToastError}
                />
              )}

              {/* 7. INVESTMENTS */}
              {activeSection === 'investments' && canAccessSection(effectiveRole, 'investments') && (
                <AdminInvestmentsSection
                  investments={investments}
                  users={users}
                  properties={properties}
                  onRefresh={() => loadData(false)}
                  onSuccess={showToastSuccess}
                  onError={showToastError}
                />
              )}

              {/* 8. DISTRIBUTIONS */}
              {activeSection === 'distributions' && canAccessSection(effectiveRole, 'distributions') && (
                <AdminDistributionsSection
                  properties={properties}
                  investments={investments}
                  users={users}
                  transactions={transactions}
                  pastDistributions={pastDistributions}
                  onRefresh={() => loadData(false)}
                  onSuccess={showToastSuccess}
                  onError={showToastError}
                />
              )}

              {/* 9. TRANSACTIONS */}
              {activeSection === 'transactions' && canAccessSection(effectiveRole, 'transactions') && (
                <AdminTransactionsSection
                  users={users}
                  transactions={transactions}
                  onRefresh={() => loadData(false)}
                />
              )}

              {/* 10. DOCUMENTS (Read-only for Support) */}
              {activeSection === 'documents' && canAccessSection(effectiveRole, 'documents') && (
                <AdminDocumentsSection
                  users={users}
                  documents={documents}
                  properties={properties}
                  readOnly={isReadOnlySection(effectiveRole, 'documents')}
                  onRefresh={() => loadData(false)}
                  onSuccess={showToastSuccess}
                  onError={showToastError}
                />
              )}

              {/* 11. NOTIFICATIONS */}
              {activeSection === 'notifications' && canAccessSection(effectiveRole, 'notifications') && (
                <AdminNotificationsSection
                  users={users}
                  notifications={notifications}
                  onRefresh={() => loadData(false)}
                  onSuccess={showToastSuccess}
                  onError={showToastError}
                />
              )}

              {/* 12. REPORTS */}
              {activeSection === 'reports' && canAccessSection(effectiveRole, 'reports') && (
                <AdminReportsSection
                  users={users}
                  properties={properties}
                  investments={investments}
                  transactions={transactions}
                  pastDistributions={pastDistributions}
                />
              )}

              {/* 13. STAFF & ROLES (SUPER ADMIN ONLY) */}
              {activeSection === 'staff-roles' && canAccessSection(effectiveRole, 'staff-roles') && (
                <AdminStaffRolesSection
                  users={users}
                  onRefresh={() => loadData(false)}
                  onSuccess={showToastSuccess}
                  onError={showToastError}
                />
              )}

              {/* 14. SETTINGS */}
              {activeSection === 'settings' && canAccessSection(effectiveRole, 'settings') && (
                <AdminSettingsSection
                  allowedTabs={allowedSettingsTabs}
                  paymentGates={paymentGates}
                  onRefresh={() => loadData(false)}
                  onSuccess={showToastSuccess}
                  onError={showToastError}
                />
              )}

              {/* 15. AUDIT LOG (SUPER ADMIN ONLY) */}
              {activeSection === 'audit-log' && canAccessSection(effectiveRole, 'audit-log') && (
                <AdminAuditLogSection
                  logs={auditLogs}
                  users={users}
                  onRefresh={() => loadData(false)}
                />
              )}
            </>
          )}
        </main>
      </div>

      {/* Manual Wallet Credit Modal */}
      {creditModalOpen && (effectiveRole === 'super_admin' || effectiveRole === 'finance') && (() => {
        const creditTarget = users.find((u) => u.id === creditUserId) || users[0];
        const amtCents = eurToCents(creditAmount);
        const curCents = eurToCents(creditTarget?.walletBalance ?? 0);
        const projCents = curCents + amtCents;
        return (
          <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
            <form onSubmit={handleExecuteManualCredit} className="bg-[#121A1F] border border-[#1F2C33] rounded-2xl max-w-md w-full p-6 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#1F2C33]">
                <h3 className="text-sm font-bold text-[#F2F5F4] flex items-center gap-2">
                  <Wallet className="w-4 h-4 text-[#6FD8B0]" />
                  <span>{creditConfirmStep ? 'Confirm Investor Wallet Credit' : 'Credit Investor Treasury Wallet'}</span>
                </h3>
                <button
                  type="button"
                  disabled={submittingCredit}
                  onClick={() => {
                    setCreditModalOpen(false);
                    setCreditConfirmStep(false);
                  }}
                  className="text-[#8FA1A8] hover:text-[#F2F5F4] cursor-pointer disabled:opacity-50"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {!creditConfirmStep ? (
                <div className="space-y-3 text-xs">
                  <div>
                    <label className="block text-[#B6C4C9] font-semibold mb-1">Target Investor</label>
                    <select
                      value={creditUserId}
                      onChange={(e) => setCreditUserId(e.target.value)}
                      className="w-full px-3 py-2 bg-[#0B0F10] border border-[#1F2C33] rounded-xl text-[#F2F5F4]"
                    >
                      {users.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.fullName || u.email} ({u.email}) — {formatCurrency(u.walletBalance)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[#B6C4C9] font-semibold mb-1">Amount</label>
                      <input
                        type="number"
                        min={0.01}
                        step="0.01"
                        required
                        value={creditAmount}
                        onChange={(e) => setCreditAmount(Number(e.target.value))}
                        className="w-full px-3 py-2 bg-[#0B0F10] border border-[#1F2C33] rounded-xl font-mono text-[#F2F5F4]"
                      />
                    </div>
                    <div>
                      <label className="block text-[#B6C4C9] font-semibold mb-1">Currency</label>
                      <select
                        value={creditCurrency}
                        onChange={(e) => setCreditCurrency(e.target.value)}
                        className="w-full px-3 py-2 bg-[#0B0F10] border border-[#1F2C33] rounded-xl text-[#F2F5F4]"
                      >
                        <option value="EUR">EUR</option>
                        <option value="USD">USD</option>
                        <option value="GBP">GBP</option>
                        <option value="CHF">CHF</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[#B6C4C9] font-semibold mb-1">Settlement Method</label>
                    <input
                      type="text"
                      value={creditMethod}
                      onChange={(e) => setCreditMethod(e.target.value)}
                      className="w-full px-3 py-2 bg-[#0B0F10] border border-[#1F2C33] rounded-xl text-[#F2F5F4]"
                    />
                  </div>
                  <div>
                    <label className="block text-[#B6C4C9] font-semibold mb-1">Bank / Settlement Reference</label>
                    <input
                      type="text"
                      value={creditReference}
                      onChange={(e) => setCreditReference(e.target.value)}
                      placeholder="Optional wire reference"
                      className="w-full px-3 py-2 bg-[#0B0F10] border border-[#1F2C33] rounded-xl font-mono text-[#F2F5F4]"
                    />
                  </div>
                  <div>
                    <label className="block text-[#B6C4C9] font-semibold mb-1">Audit Notes</label>
                    <input
                      type="text"
                      value={creditNotes}
                      onChange={(e) => setCreditNotes(e.target.value)}
                      className="w-full px-3 py-2 bg-[#0B0F10] border border-[#1F2C33] rounded-xl text-[#F2F5F4]"
                    />
                  </div>
                </div>
              ) : (
                <div className="bg-[#0B0F10] border border-[#1F2C33] rounded-xl p-3.5 text-xs text-[#B6C4C9] space-y-1.5 tabular-nums">
                  <div>Action: <strong className="text-[#6FD8B0]">Credit Investor Wallet (admin_credit_deposit)</strong></div>
                  <div>Investor: <strong className="text-[#F2F5F4]">{creditTarget?.fullName || creditTarget?.email || creditUserId}</strong></div>
                  <div>Amount: <strong className="text-[#6FD8B0]">{formatCentsEur(amtCents)} ({creditCurrency})</strong></div>
                  <div>Current Balance: <strong>{formatCentsEur(curCents)}</strong></div>
                  <div>Projected Balance: <strong className="text-[#F2F5F4]">{formatCentsEur(projCents)}</strong></div>
                  <div>Method: <span className="text-[#F2F5F4]">{creditMethod}</span></div>
                  {creditReference.trim() && (
                    <div>Reference: <span className="font-mono text-[#F2F5F4]">{creditReference.trim()}</span></div>
                  )}
                  <div>Notes: <span className="text-[#F2F5F4]">{creditNotes.trim() || '—'}</span></div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-[#1F2C33]">
                {creditConfirmStep ? (
                  <button
                    type="button"
                    disabled={submittingCredit}
                    onClick={() => setCreditConfirmStep(false)}
                    className="px-4 py-2 rounded-xl bg-[#0B0F10] border border-[#1F2C33] text-xs font-semibold text-[#B6C4C9] cursor-pointer disabled:opacity-50"
                  >
                    Back
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={submittingCredit}
                    onClick={() => {
                      setCreditModalOpen(false);
                      setCreditConfirmStep(false);
                    }}
                    className="px-4 py-2 rounded-xl bg-[#0B0F10] border border-[#1F2C33] text-xs font-semibold text-[#B6C4C9] cursor-pointer disabled:opacity-50"
                  >
                    Cancel
                  </button>
                )}
                <button
                  type="submit"
                  disabled={submittingCredit || amtCents <= 0}
                  className="px-4 py-2 rounded-xl bg-[#6FD8B0] text-[#0B0F10] text-xs font-bold cursor-pointer disabled:opacity-50"
                >
                  {submittingCredit ? 'Crediting...' : creditConfirmStep ? 'Confirm & Execute Credit' : 'Review Credit'}
                </button>
              </div>
            </form>
          </div>
        );
      })()}
    </div>
  );
};
