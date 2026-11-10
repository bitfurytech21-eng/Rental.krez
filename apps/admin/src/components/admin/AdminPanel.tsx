import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@web/lib/auth';
import { useNavigation } from '@web/lib/navigation';
import { ledger, CryptoNetworkConfig, VerificationDocument, PaymentConfig } from '@web/lib/ledger';
import { formatCurrency, formatDate, formatShortHash } from '@web/lib/utils';
import { Property, PropertyType, PropertyStatus } from '@web/types/property';
import {
  Shield,
  Plus,
  CheckCircle2,
  XCircle,
  Building2,
  Users,
  ArrowUpRight,
  ArrowDownLeft,
  ClipboardList,
  RefreshCw,
  Coins,
  CreditCard,
  UserCheck,
  Trash2,
  ToggleLeft,
  ToggleRight,
  AlertCircle,
  AlertTriangle,
  FileText,
  Activity,
  UploadCloud,
  Eye,
  X,
  Filter,
  FileCheck,
  Tv,
  RotateCcw,
  BookOpen,
  Scale,
  Lock,
  Unlock,
  Globe,
  Tag,
  Sparkles,
  Check,
  Mail,
  Crown,
  LogOut,
  Sun,
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  BarChart3,
  PieChart,
  Settings,
  History,
  Inbox,
  Key,
  UserPlus,
  AlertOctagon,
  Monitor,
  Smartphone,
  Send,
  Zap,
  DollarSign,
  Banknote,
  Briefcase,
  ShieldAlert,
  CheckSquare,
  Maximize,
  Minimize,
  Menu,
  X as XIcon,
  Calendar,
  Link,
  Copy,
  Globe as GlobeIcon,
  Wifi,
  Server,
  Database,
  ShieldCheck,
  User,
  Heart,
  Target,
  Rocket,
  Award,
  Flame,
  Grid,
  List,
  Clipboard
} from 'lucide-react';

import { PropertyDocumentsHub } from '@web/components/documents/PropertyDocumentsHub';
import { AdminDashboardOverview } from './AdminDashboardOverview';
import { AdminUserManagement } from './AdminUserManagement';
import { AdminNewsManager } from './AdminNewsManager';
import { AdminInsightsCMS } from './AdminInsightsCMS';
import { AdminAccountSettings } from './AdminAccountSettings';
import { AdminReconciliationView } from './AdminReconciliationView';
import { AdminAuditLogsView } from './AdminAuditLogsView';
import { AdminEmailManager } from './AdminEmailManager';
import { AdminFrontendErrorLogView } from './AdminFrontendErrorLogView';
import { AdminPaymentDistributionManager } from './AdminPaymentDistributionManager';
import { AdminMembershipTab } from './AdminMembershipTab';
import { AdminMonitoringView } from './AdminMonitoringView';
import { AdminReferralsTab } from './AdminReferralsTab';
import { AdminSupportTab } from './AdminSupportTab';
import { AdminMarketingTab } from './AdminMarketingTab';
import { AdminWebsiteTab } from './AdminWebsiteTab';
import { AdminSiteSettingsTab } from './AdminSiteSettingsTab';

export type AdminTabType =
  | 'dashboard'
  | 'users'
  | 'membership'
  | 'reconciliation'
  | 'deposits'
  | 'withdrawals'
  | 'manual-payment'
  | 'payment-distribution'
  | 'kyc'
  | 'properties'
  | 'property-documents'
  | 'audit'
  | 'payment-settings'
  | 'logs'
  | 'verification_docs'
  | 'news'
  | 'insights'
  | 'admin-security'
  | 'emails'
  | 'frontend-errors'
  | 'referrals'
  | 'support'
  | 'marketing'
  | 'website'
  | 'site-settings';

interface AdminNavItem {
  id: AdminTabType;
  label: string;
  icon: React.ElementType;
  group: 'overview' | 'finance' | 'compliance' | 'content' | 'system';
  badge?: number;
}

const ADMIN_NAV_ITEMS: AdminNavItem[] = [
  { id: 'dashboard', label: 'Executive Dashboard', icon: LayoutDashboard, group: 'overview' },
  { id: 'users', label: 'Investor Registry', icon: Users, group: 'overview', badge: 10 },
  { id: 'membership', label: 'Club Memberships', icon: Crown, group: 'overview' },
  { id: 'deposits', label: 'Deposit Approvals', icon: ArrowDownLeft, group: 'finance', badge: 0 },
  { id: 'withdrawals', label: 'Withdrawal Approvals', icon: ArrowUpRight, group: 'finance', badge: 0 },
  { id: 'manual-payment', label: 'Manual Payments', icon: CreditCard, group: 'finance' },
  { id: 'payment-distribution', label: 'Distribution Engine', icon: DollarSign, group: 'finance' },
  { id: 'payment-settings', label: 'Treasury & Gateways', icon: Banknote, group: 'finance' },
  { id: 'kyc', label: 'KYC Compliance Queue', icon: ShieldCheck, group: 'compliance', badge: 1 },
  { id: 'verification_docs', label: 'Document Proofs', icon: UploadCloud, group: 'compliance', badge: 2 },
  { id: 'properties', label: 'Property Portfolio', icon: Building2, group: 'overview' },
  { id: 'property-documents', label: 'Property Documents', icon: FileText, group: 'overview' },
  { id: 'reconciliation', label: 'Ledger Reconciliation', icon: Scale, group: 'compliance' },
  { id: 'audit', label: 'Audit Trail', icon: ClipboardList, group: 'compliance' },
  { id: 'news', label: 'Company News', icon: Tv, group: 'content' },
  { id: 'insights', label: 'Editorial CMS', icon: BookOpen, group: 'content' },
  { id: 'referrals', label: 'Plans & Referrals', icon: Target, group: 'content' },
  { id: 'support', label: 'Support & Reports', icon: FileText, group: 'system' },
  { id: 'marketing', label: 'Marketing', icon: Sparkles, group: 'content' },
  { id: 'website', label: 'Website Pages', icon: Globe, group: 'content' },
  { id: 'logs', label: 'System Monitoring', icon: Monitor, group: 'system' },
  { id: 'frontend-errors', label: 'Error Buffer', icon: AlertTriangle, group: 'system' },
  { id: 'admin-security', label: 'Admin Security', icon: Shield, group: 'system' },
  { id: 'emails', label: 'Email Delivery', icon: Mail, group: 'system' },
  { id: 'site-settings', label: 'Site Settings', icon: Settings, group: 'system' },
];

const NAV_GROUPS = [
  { key: 'overview', label: 'Overview', color: 'text-emerald-700' },
  { key: 'finance', label: 'Finance & Treasury', color: 'text-blue-700' },
  { key: 'compliance', label: 'Compliance & Risk', color: 'text-amber-700' },
  { key: 'content', label: 'Content & Editorial', color: 'text-purple-700' },
  { key: 'system', label: 'System & Security', color: 'text-slate-700' },
] as const;

type Theme = 'light' | 'dark' | 'system';

export const AdminPanel: React.FC = () => {
  const { user, logout } = useAuth();
  const { currentPath, navigateTo } = useNavigation();

  if (!user || user.role !== 'admin') {
    return (
      <div className="min-h-screen bg-[#080d11] text-white flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-[#0d161d] border border-red-500/30 rounded-2xl p-8 text-center shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 mx-auto flex items-center justify-center mb-5">
            <Lock className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-serif font-light text-white mb-2">Administrator Access Required</h2>
          <p className="text-sm text-gray-400 mb-6 leading-relaxed">
            This administration console is strictly restricted to verified system operators. You must authenticate with valid administrator credentials.
          </p>
          <button
            type="button"
            onClick={() => navigateTo('/admin/login')}
            className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs tracking-widest uppercase rounded-xl transition shadow-lg shadow-emerald-900/30 cursor-pointer"
          >
            Go to Admin Login
          </button>
        </div>
      </div>
    );
  }

  const activeUser = user;

  // Theme persistence
  const [theme, setTheme] = useState<Theme>('system');
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);

  const getInitialAdminTab = useCallback((): AdminTabType => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash.replace('#', '').replace(/^\//, '').toLowerCase();
      const valid: AdminTabType[] = ADMIN_NAV_ITEMS.map((i) => i.id);
      if (valid.includes(hash as any)) return hash as any;
      const params = new URLSearchParams(window.location.search);
      const q = params.get('tab')?.toLowerCase();
      if (q && valid.includes(q as any)) return q as any;
    }
    return 'dashboard';
  }, []);

  const [activeTab, setActiveTab] = useState<AdminTabType>(getInitialAdminTab);
  const [transactions, setTransactions] = useState(ledger.getTransactions());
  const [properties, setProperties] = useState(ledger.getProperties());
  const [users, setUsers] = useState(ledger.getUsers());
  const [verificationDocs, setVerificationDocs] = useState<VerificationDocument[]>(ledger.getVerificationDocuments());
  const [auditLogs, setAuditLogs] = useState(ledger.getAuditLogs());
  const [paymentConfig, setPaymentConfig] = useState(ledger.getPaymentConfig());
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [confirmDeleteNetId, setConfirmDeleteNetId] = useState<string | null>(null);

  // Document proof preview modal
  const [previewProofModalDoc, setPreviewProofModalDoc] = useState<{
    title: string;
    fileUrl: string;
    fileName: string;
    type?: string;
    ref?: string;
    user?: string;
  } | null>(null);

  // Document filter states
  const [docFilterCategory, setDocFilterCategory] = useState<'all' | 'deposit_proof' | 'kyc_identity' | 'proof_of_address'>('all');
  const [docFilterStatus, setDocFilterStatus] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');

  // Real-time refresh interval
  useEffect(() => {
    const syncTabFromLocation = () => {
      const valid: AdminTabType[] = ADMIN_NAV_ITEMS.map((i) => i.id);
      const hashFromPath = currentPath.includes('#') ? currentPath.split('#')[1].toLowerCase() : '';
      const hashFromWin = typeof window !== 'undefined' ? window.location.hash.replace('#', '').replace(/^\//, '').toLowerCase() : '';
      const candidate = hashFromPath || hashFromWin;
      if (candidate && valid.includes(candidate as any)) {
        setActiveTab(candidate as any);
      }
    };
    syncTabFromLocation();
    window.addEventListener('hashchange', syncTabFromLocation);
    return () => window.removeEventListener('hashchange', syncTabFromLocation);
  }, [currentPath]);

  // Theme management
  useEffect(() => {
    const root = document.documentElement;
    const resolve = () => {
      if (theme === 'system') {
        const dark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        setResolvedTheme(dark ? 'dark' : 'light');
        root.classList.toggle('dark', dark);
      } else {
        setResolvedTheme(theme);
        root.classList.toggle('dark', theme === 'dark');
      }
    };
    resolve();
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    if (theme === 'system') {
      media.addEventListener('change', resolve);
      return () => media.removeEventListener('change', resolve);
    }
  }, [theme]);

  // Periodic data refresh (real-time simulation)
  useEffect(() => {
    const interval = setInterval(() => {
      setTransactions(ledger.getTransactions());
      setProperties(ledger.getProperties());
      setUsers(ledger.getUsers());
      setVerificationDocs(ledger.getVerificationDocuments());
      setAuditLogs(ledger.getAuditLogs());
      setPaymentConfig(ledger.getPaymentConfig());
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  const refreshAll = useCallback(() => {
    setTransactions(ledger.getTransactions());
    setProperties(ledger.getProperties());
    setUsers(ledger.getUsers());
    setVerificationDocs(ledger.getVerificationDocuments());
    setAuditLogs(ledger.getAuditLogs());
    setPaymentConfig(ledger.getPaymentConfig());
  }, []);

  const handleRestoreDefaults = () => {
    try {
      const res = ledger.restoreDefaults();
      refreshAll();
      setActionSuccess(res.message);
      setActionError(null);
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err: any) {
      setActionError(err.message || 'Failed to restore defaults');
    }
  };

  const handleReviewVerificationDoc = async (docId: string, approved: boolean, reason?: string) => {
    try {
      ledger.reviewVerificationDocument(docId, approved, reason, activeUser.email);
      setActionSuccess(`Document ${approved ? 'confirmed and approved' : 'declined'}. Ledger updated.`);
      setActionError(null);
      refreshAll();
      setTimeout(() => setActionSuccess(null), 3500);
    } catch (e: any) {
      setActionError(e.message || 'Action failed');
    }
  };

  const handleSavePaymentConfig = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      ledger.updatePaymentConfig(paymentConfig);
      setActionSuccess('Payment gateway settings and crypto treasury configurations updated successfully!');
      setActionError(null);
      refreshAll();
      setTimeout(() => setActionSuccess(null), 3000);
    } catch (err: any) {
      setActionError(err.message || 'Failed to save payment settings.');
    }
  };

  const handleAddNewCryptoNetwork = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      ledger.addCryptoNetwork({
        name: newNetName,
        token: newNetToken,
        network: newNetProtocol,
        walletAddress: newNetAddress,
        contractEnd: newNetContractEnd,
        enabled: true
      });
      setShowAddNetwork(false);
      refreshAll();
      setActionSuccess(`New treasury network "${newNetName} (${newNetToken})" integrated successfully!`);
      setTimeout(() => setActionSuccess(null), 3000);
    } catch (err: any) {
      setActionError(err.message || 'Failed to add crypto network.');
    }
  };

  const handleDeleteCryptoNetwork = (id: string, name: string) => {
    ledger.deleteCryptoNetwork(id);
    setConfirmDeleteNetId(null);
    refreshAll();
    setActionSuccess(`Treasury network ${name} removed.`);
    setTimeout(() => setActionSuccess(null), 3000);
  };

  const handleToggleCryptoNetwork = (id: string) => {
    ledger.toggleCryptoNetwork(id);
    refreshAll();
  };

  // Manual Payment Credit State
  const [selectedUserId, setSelectedUserId] = useState<string>(users[0]?.id || '');
  const [manualAmount, setManualAmount] = useState<number>(1000);
  const [manualCurrency, setManualCurrency] = useState<string>('EUR');
  const [manualMethod, setManualMethod] = useState<string>('Direct SEPA Wire Received');
  const [manualReference, setManualReference] = useState<string>('');
  const [manualNotes, setManualNotes] = useState<string>('Funds confirmed in UNLIMIT corporate treasury account.');
  const [isSubmittingCredit, setIsSubmittingCredit] = useState<boolean>(false);

  // User Dedicated Payment Detail Assignment State
  const [editUserPaymentId, setEditUserPaymentId] = useState<string>(users[0]?.id || '');
  const [userCustomCryptoAddress, setUserCustomCryptoAddress] = useState<string>('');
  const [userCustomIban, setUserCustomIban] = useState<string>('');

  // Add New Crypto Network State
  const [showAddNetwork, setShowAddNetwork] = useState<boolean>(false);
  const [newNetName, setNewNetName] = useState<string>('Base Network');
  const [newNetToken, setNewNetToken] = useState<string>('USDC');
  const [newNetProtocol, setNewNetProtocol] = useState<string>('Base');
  const [newNetAddress, setNewNetAddress] = useState<string>('0x71C8135C0e41B3fA128912389128f9A19b28A0bf');
  const [newNetContractEnd, setNewNetContractEnd] = useState<string>('831ec7');

  // New Property Form State
  const [showNewPropertyModal, setShowNewPropertyModal] = useState<boolean>(false);
  const [newTitle, setNewTitle] = useState('');
  const [newLocation, setNewLocation] = useState('');
  const [newType, setNewType] = useState<PropertyType>('Residential');
  const [newTarget, setNewTarget] = useState<number>(350000);
  const [newYield, setNewYield] = useState<number>(11.5);
  const [newAppreciation, setNewAppreciation] = useState<number>(4.0);
  const [newDuration, setNewDuration] = useState<number>(36);
  const [adminPropertyFilter, setAdminPropertyFilter] = useState<'all' | 'hidden' | 'frontend' | 'upcoming' | 'funded' | 'funding'>('all');

  // Property Operational Function & Frontend Approval State
  const [assignModalProperty, setAssignModalProperty] = useState<Property | null>(null);
  const [assignedFunctionInput, setAssignedFunctionInput] = useState<string>('');
  const [assignedAgentInput, setAssignedAgentInput] = useState<string>('Valentin Kretz');
  const [targetLaunchStatus, setTargetLaunchStatus] = useState<PropertyStatus>('funding');
  const [approvalNotes, setApprovalNotes] = useState<string>('');
  const [checklist, setChecklist] = useState({
    spvDeedVerified: true,
    ricsValuationCertified: true,
    smartContractGenerated: true,
    amlKycApproved: true,
  });

  const pendingDeposits = transactions.filter(t => t.type === 'deposit' && t.status === 'pending');
  const pendingWithdrawals = transactions.filter(t => t.type === 'withdrawal' && t.status === 'pending');
  const pendingKYCUsers = users.filter(u => u.kycStatus === 'pending');
  const pendingVerificationDocs = verificationDocs.filter(d => d.status === 'pending');

  const handleExecuteManualCredit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId) {
      setActionError('Please select a target investor account.');
      return;
    }
    if (manualAmount <= 0) {
      setActionError('Credit amount must be greater than zero.');
      return;
    }

    setIsSubmittingCredit(true);
    try {
      const creditedTx = ledger.recordManualCredit(
        activeUser.email,
        selectedUserId,
        manualAmount,
        manualCurrency,
        manualMethod,
        manualReference.trim() || undefined,
        manualNotes.trim() || undefined
      );

      const targetInvestor = users.find(u => u.id === selectedUserId);
      setActionSuccess(
        `Successfully integrated payment! Credited ${formatCurrency(manualAmount)} (${manualCurrency}) to ${targetInvestor?.fullName || 'investor'}. Ref: ${creditedTx.reference}`
      );
      setActionError(null);
      setManualReference('');
      refreshAll();
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err: any) {
      setActionError(err.message || 'Failed to execute manual payment credit.');
    } finally {
      setIsSubmittingCredit(false);
    }
  };

  const handleSaveUserPaymentDetails = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editUserPaymentId) return;

    try {
      ledger.updateUserPaymentDetails(editUserPaymentId, {
        cryptoDepositAddress: userCustomCryptoAddress.trim() || undefined,
        bankIban: userCustomIban.trim() || undefined
      });
      refreshAll();
      setActionSuccess('Investor-specific payment details updated successfully!');
      setTimeout(() => setActionSuccess(null), 3000);
    } catch (err: any) {
      setActionError(err.message || 'Failed to update user payment details.');
    }
  };

  const handleReviewDeposit = async (txId: string, approved: boolean) => {
    try {
      await ledger.reviewDeposit(
        { id: activeUser.id, role: activeUser.role },
        txId,
        approved,
        approved ? undefined : 'Bank transfer wire reference or blockchain transaction could not be verified in treasury feed.'
      );
      setActionSuccess(`Deposit request ${approved ? 'approved and credited to wallet balance' : 'declined'}.`);
      setActionError(null);
      refreshAll();
      setTimeout(() => setActionSuccess(null), 3000);
    } catch (e: any) {
      setActionError(e.message || 'Action failed');
    }
  };

  const handleReviewWithdrawal = async (txId: string, approved: boolean) => {
    try {
      await ledger.reviewWithdrawal(
        { id: activeUser.id, role: activeUser.role },
        txId,
        approved,
        approved ? undefined : 'Compliance review flagged incomplete banking or wallet verification documentation.'
      );
      setActionSuccess(`Withdrawal ${approved ? 'approved and transfer executed' : 'declined and capital refunded to investor'}.`);
      setActionError(null);
      refreshAll();
      setTimeout(() => setActionSuccess(null), 3000);
    } catch (e: any) {
      setActionError(e.message || 'Action failed');
    }
  };

  const handleCreateTestDeposit = () => {
    try {
      const tx = ledger.createSamplePendingDeposit(5000);
      refreshAll();
      setActionSuccess(`Generated sample deposit request: ${formatCurrency(tx.amount)} (${tx.reference}). You can now review and approve it.`);
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (e: any) {
      setActionError(e.message || 'Failed to create sample deposit');
    }
  };

  const handleCreateTestWithdrawal = () => {
    try {
      const tx = ledger.createSamplePendingWithdrawal(1500);
      refreshAll();
      setActionSuccess(`Generated sample withdrawal request: ${formatCurrency(tx.amount)} (${tx.reference}). You can now review and approve it.`);
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (e: any) {
      setActionError(e.message || 'Failed to create sample withdrawal');
    }
  };

  const handleReviewKYC = (userId: string, approved: boolean) => {
    try {
      ledger.updateKYCStatus(userId, approved ? 'verified' : 'rejected');
      setActionSuccess(`User KYC ${approved ? 'verified' : 'rejected'}.`);
      setActionError(null);
      refreshAll();
      setTimeout(() => setActionSuccess(null), 3000);
    } catch (e: any) {
      setActionError(e.message || 'Action failed');
    }
  };

  const handleCreateProperty = (e: React.FormEvent) => {
    e.preventDefault();
    const tokenPrice = 364;
    const totalTokens = Math.floor(newTarget / tokenPrice);
    const slug = newTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-');

    const createdProp: Property = {
      id: 'prop-' + Math.random().toString(36).substring(2, 8),
      slug: slug,
      title: newTitle,
      location: newLocation,
      city: newLocation.split(',')[1]?.trim() || 'Madrid',
      country: 'Spain',
      type: newType,
      status: 'funding',
      images: ['https://files.kretzrealestate.com/6ad7ec3c06057549d91484987949c8f.jpg'],
      bannerImage: 'https://files.kretzrealestate.com/6ad7ec3c06057549d91484987949c8f.jpg',
      targetAmount: newTarget,
      fundedAmount: 0,
      tokenPrice: tokenPrice,
      totalTokens: totalTokens,
      availableTokens: totalTokens,
      estimatedAnnualYield: newYield,
      capitalAppreciationYield: newAppreciation,
      totalEstimatedReturn: Number((newYield + newAppreciation).toFixed(1)),
      durationMonths: newDuration,
      minimumInvestment: 1000,
      distributionFrequency: 'Monthly',
      tokenTicker: 'RENT-' + newTitle.substring(0, 3).toUpperCase(),
      blockchainNetwork: 'Polygon POS',
      tokenContractAddress: '0x' + Array.from({ length: 40 }, () => Math.floor(Math.random() * 16).toString(16)).join(''),
      description: `Newly published institutional real estate offering located in ${newLocation}. Fully structured through a dedicated SPV with conservative yield projections.`,
      investmentStructure: 'Participatory SPV Note with certified mortgage deed and ring-fenced legal assets.',
      highlights: [
        'Vetted architectural asset with high rental demand',
        'Independent appraisal and structural review verified',
        'Fixed participatory tokenization contract'
      ],
      risks: ['General property market cycles', 'Tenancy vacancy during turnover'],
      exitStrategy: 'Sale to institutional fund upon duration completion.',
      feeStructure: {
        structuringFee: '3.5% (Pre-funded in target capital)',
        managementFee: '10.0% of gross monthly rental income',
        withdrawalFee: '0% for SEPA transfers',
        exitFee: '0% at maturity'
      },
      paymentSchedule: {
        distributionFrequency: 'Monthly',
        payoutDate: '1st of every calendar month',
        annualReconciliation: 'Annual audit statement issued in February',
        maturityTerms: '100% Principal + capital gains distributed upon terminal asset sale'
      },
      financialBreakdown: {
        propertyPrice: Math.round(newTarget * 0.78),
        refurbishmentBudget: Math.round(newTarget * 0.12),
        legalAndClosingCosts: Math.round(newTarget * 0.06),
        operatingReserve: Math.round(newTarget * 0.04),
        totalProjectCost: newTarget,
        projectedAnnualGrossRent: Math.round(newTarget * (newYield / 100) * 1.25),
        estimatedOperatingExpenses: Math.round(newTarget * (newYield / 100) * 0.25),
        projectedAnnualNetRent: Math.round(newTarget * (newYield / 100)),
        estimatedNetYield: newYield,
        estimatedCapitalGainYield: newAppreciation,
        totalEstimatedYield: Number((newYield + newAppreciation).toFixed(1))
      },
      documents: [
        {
          id: 'doc-new1',
          name: 'SPV Deed & Constitutional By-laws',
          category: 'Legal',
          size: '2.1 MB',
          url: '#',
          updatedAt: new Date().toISOString().split('T')[0]
        }
      ],
      investorCount: 0,
      createdAt: new Date().toISOString(),
      isSampleRecord: true
    };

    ledger.saveProperty(createdProp);
    refreshAll();
    setShowNewPropertyModal(false);
    setActionSuccess(`New property "${newTitle}" created and opened for public funding!`);
    setTimeout(() => setActionSuccess(null), 3000);
  };

  const handleOpenAssignModal = (prop: Property) => {
    setAssignModalProperty(prop);
    setAssignedFunctionInput(prop.assignedFunction || 'Institutional Fractional Tokenization');
    setAssignedAgentInput(prop.agent?.name || 'Valentin Kretz');
    setTargetLaunchStatus(prop.status === 'hidden' || prop.status === 'pending_approval' ? 'funding' : prop.status);
    setApprovalNotes(prop.approvalNotes || '');
  };

  const handleSaveFunctionOnly = () => {
    if (!assignModalProperty) return;
    if (!assignedFunctionInput.trim()) {
      setActionError('Please specify an operational function for this property.');
      return;
    }
    try {
      ledger.assignPropertyFunctionOnly(
        assignModalProperty.id,
        assignedFunctionInput.trim(),
        assignedAgentInput.trim(),
        activeUser.email
      );
      refreshAll();
      setAssignModalProperty(null);
      setActionSuccess(`Assigned function "${assignedFunctionInput.trim()}" to ${assignModalProperty.title}. Asset remains in admin custody until formally approved.`);
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err: any) {
      setActionError(err.message || 'Failed to assign function');
    }
  };

  const handleApproveForFrontend = () => {
    if (!assignModalProperty) return;
    if (!assignedFunctionInput.trim()) {
      setActionError('An operational function must be assigned before approving the property to appear on the frontend.');
      return;
    }
    try {
      ledger.assignPropertyFunctionAndApprove(assignModalProperty.id, {
        assignedFunction: assignedFunctionInput.trim(),
        agentName: assignedAgentInput.trim(),
        targetStatus: targetLaunchStatus,
        adminEmail: activeUser.email,
        notes: approvalNotes.trim() || undefined,
      });
      refreshAll();
      setAssignModalProperty(null);
      setActionSuccess(`Property "${assignModalProperty.title}" successfully approved and published to live frontend under status: ${targetLaunchStatus.toUpperCase()}!`);
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err: any) {
      setActionError(err.message || 'Failed to approve property');
    }
  };

  const handleHideProperty = (prop: Property) => {
    try {
      ledger.hidePropertyFromFrontend(prop.id, activeUser.email, 'Moved back to admin custody by administrator');
      refreshAll();
      setActionSuccess(`Property "${prop.title}" moved to admin custody. Hidden from frontend.`);
      setTimeout(() => setActionSuccess(null), 3500);
    } catch (err: any) {
      setActionError(err.message || 'Failed to hide property');
    }
  };

  const handleSetPropertyStatus = (prop: Property, newStatus: PropertyStatus) => {
    if (newStatus === 'hidden' || newStatus === 'pending_approval') {
      handleHideProperty(prop);
      return;
    }
    if (!prop.assignedFunction) {
      handleOpenAssignModal(prop);
      return;
    }
    try {
      ledger.assignPropertyFunctionAndApprove(prop.id, {
        assignedFunction: prop.assignedFunction,
        agentName: prop.agent?.name,
        targetStatus: newStatus,
        adminEmail: activeUser.email
      });
      refreshAll();
      setActionSuccess(`Property "${prop.title}" status changed to ${newStatus.toUpperCase()} and live on frontend.`);
      setTimeout(() => setActionSuccess(null), 3000);
    } catch (err: any) {
      setActionError(err.message || 'Action failed');
    }
  };

  const handleTogglePropertyStatus = (prop: Property) => {
    if (prop.status === 'hidden' || prop.status === 'pending_approval' || !prop.assignedFunction) {
      handleOpenAssignModal(prop);
    } else if (prop.status === 'funding') {
      handleSetPropertyStatus(prop, 'funded');
    } else if (prop.status === 'funded') {
      handleSetPropertyStatus(prop, 'upcoming');
    } else {
      handleSetPropertyStatus(prop, 'funding');
    }
  };

  const selectedTargetUser = users.find(u => u.id === selectedUserId);

  const isDark = resolvedTheme === 'dark';
  const sidebarWidth = sidebarCollapsed ? 72 : 240;

  const NavGroup = ({ key, label, color }: { key: string; label: string; color: string }) => {
    const items = ADMIN_NAV_ITEMS.filter(i => i.group === key);
    return (
      <div key={key} className="mb-6 px-3">
        <h3 className={`px-3 mb-2 text-[10px] font-bold uppercase tracking-wider ${color} opacity-70`}>{label}</h3>
        <div className="space-y-0.5">
          {items.map((item) => {
            const isActive = activeTab === item.id;
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  isActive
                    ? isDark
                      ? 'bg-emerald-500 text-[#0B1513] shadow-lg shadow-emerald-900/40'
                      : 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                    : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-current' : 'text-current opacity-60'}`} />
                  {sidebarCollapsed ? null : <span className="font-medium">{item.label}</span>}
                </div>
                {item.badge !== undefined && (
                  <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                    item.badge > 0 ? 'bg-emerald-100 text-emerald-900 border border-emerald-200' : 'bg-slate-100 text-slate-500'
                  }`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <>
      <div className={`min-h-screen ${isDark ? 'bg-[#0a0a0a] text-white' : 'bg-[#F6F7F4] text-[#18211F]'}`}>
        {/* Mobile Sidebar Overlay */}
        {showMobileSidebar && (
          <div
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
            onClick={() => setShowMobileSidebar(false)}
          />
        )}

        {/* Sidebar */}
        <aside
          className={`fixed left-0 top-0 h-full z-30 transition-all duration-300 ${
            isDark
              ? 'bg-[#0d0d0d] border-r border-[#1a1a1a]'
              : 'bg-white border-r border-[#E3E8E3]'
          } w-${sidebarWidth} transform ${sidebarCollapsed ? '-translate-x-full md:translate-x-0' : 'translate-x-0 md:translate-x-0'}
          `}
        >
          <div className="flex items-center justify-between h-16 px-4 bg-[#182D2A] text-white shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-[#24423C] text-[#B7E36A] flex items-center justify-center shrink-0">
                <Shield className="w-5 h-5" />
              </div>
              {!sidebarCollapsed && (
                <span className="font-black text-lg tracking-tight">Admin</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSidebarCollapsed((v) => !v)}
                className="p-1.5 text-white/80 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
                title="Collapse sidebar"
              >
                {sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
              </button>
              <button
                onClick={() => setShowMobileSidebar(true)}
                className="md:hidden p-1.5 text-white/80 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
              >
                <Menu className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-6">
            {NAV_GROUPS.map((g) => (
              <NavGroup key={g.key} label={g.label} color={g.color} />
            ))}

            <div className="pt-4 border-t border-[#2a2a2a]/40 px-3">
              <div className="flex items-center gap-3 px-2 py-3 rounded-xl cursor-pointer hover:bg-slate-100/50 transition-colors group">
                <Sun className="w-5 h-5 text-amber-500 shrink-0" />
                <span className={`text-xs font-semibold ${sidebarCollapsed ? 'absolute -left-10 opacity-0 group-hover:opacity-100 transition-opacity' : ''}`}>Theme</span>
                <select
                  value={theme}
                  onChange={(e) => setTheme(e.target.value as Theme)}
                  className="w-full text-xs bg-transparent border-none outline-none cursor-pointer"
                >
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                  <option value="system">System</option>
                </select>
              </div>
            </div>

            <div className="px-3 pb-4">
              <button
                onClick={() => navigateTo('/')}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-900 hover:bg-slate-100/50 transition-colors"
              >
                <GlobeIcon className="w-5 h-5" />
                {sidebarCollapsed ? null : <span>Public Site</span>}
              </button>
              <button
                onClick={() => logout()}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold text-red-500 hover:text-red-600 hover:bg-red-50/50 transition-colors border border-red-500/20"
              >
                <LogOut className="w-5 h-5" />
                {sidebarCollapsed ? null : <span>Sign Out</span>}
              </button>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <div className={`transition-all duration-300 ${sidebarCollapsed ? 'md:pl-72' : `md:pl-${sidebarWidth}`}`}>
          <header className="sticky top-0 z-20 bg-[#F6F7F4]/80 backdrop-blur-md border-b border-[#E3E8E3] px-6 py-4 flex items-center justify-between">
            <div>
              <h1 className="text-xl font-black text-[#18211F] tracking-tight">Platform Administration</h1>
              <p className="text-xs text-[#69736F] mt-0.5">
                Signed in as <strong className="text-[#182D2A]">{activeUser.email}</strong> · Executive Command Center
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={refreshAll}
                className="p-2 rounded-xl bg-white border border-[#E3E8E3] text-[#18211F] hover:bg-[#F6F7F4] text-xs font-bold transition-colors"
                title="Refresh all data"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
              <button
                onClick={handleRestoreDefaults}
                className="p-2 rounded-xl bg-white border border-[#E3E8E3] text-[#182D2A] hover:bg-[#F6F7F4] text-xs font-bold transition-colors"
                title="Restore defaults"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </header>

          <main className="mx-auto max-w-7xl px-6 py-8">
            {actionSuccess && (
              <div className="mb-6 p-4 rounded-2xl bg-green-50 text-green-800 text-xs font-bold border border-green-200 flex items-center justify-between animate-in fade-in">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
                  <span>{actionSuccess}</span>
                </div>
                <button onClick={() => setActionSuccess(null)} className="text-gray-500 hover:text-gray-700 cursor-pointer">✕</button>
              </div>
            )}

            {actionError && (
              <div className="mb-6 p-4 rounded-2xl bg-red-50 text-red-800 text-xs font-bold border border-red-200 flex items-center justify-between animate-in fade-in">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                  <span>{actionError}</span>
                </div>
                <button onClick={() => setActionError(null)} className="text-gray-500 hover:text-gray-700 cursor-pointer">✕</button>
              </div>
            )}

            {/* Active Tab Content */}
            {activeTab === 'dashboard' && (
              <AdminDashboardOverview
                properties={properties}
                transactions={transactions}
                users={users}
                auditLogs={auditLogs}
                paymentConfig={paymentConfig}
                onNavigateTab={(tab) => setActiveTab(tab as AdminTabType)}
                onOpenNewPropertyModal={() => setShowNewPropertyModal(true)}
                onRefreshAll={refreshAll}
                onQuickCreditSuccess={(msg) => {
                  setActionSuccess(msg);
                  setTimeout(() => setActionSuccess(null), 3000);
                }}
                onTogglePropertyStatus={handleTogglePropertyStatus}
              />
            )}

            {activeTab === 'users' && (
              <AdminUserManagement
                users={users}
                currentAdminEmail={activeUser.email}
                onRefreshAll={refreshAll}
                onQuickSuccess={(msg) => {
                  setActionSuccess(msg);
                  setTimeout(() => setActionSuccess(null), 4000);
                }}
                onQuickError={(msg) => {
                  setActionError(msg);
                  setTimeout(() => setActionError(null), 4000);
                }}
                onNavigateToManualCredit={(targetId) => {
                  setSelectedUserId(targetId);
                  setActiveTab('manual-payment');
                }}
              />
            )}

            {activeTab === 'membership' && (
              <AdminMembershipTab />
            )}

            {activeTab === 'reconciliation' && (
              <AdminReconciliationView />
            )}

            {activeTab === 'deposits' && (
              <div className="bg-white p-6 sm:p-8 rounded-3xl border border-[#E3E8E3] shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
                  <div>
                    <h3 className="text-lg font-bold text-[#18211F]">Pending Investor Deposits</h3>
                    <p className="text-xs text-[#69736F]">Review and approve incoming bank wire confirmations and crypto transfers</p>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <button
                      onClick={handleCreateTestDeposit}
                      className="px-3.5 py-1.5 rounded-xl bg-[#EEF2EC] hover:bg-[#E3E8E3] text-[#182D2A] text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer border border-[#DCE4DA]"
                    >
                      <Plus className="w-3.5 h-3.5 text-[#27845D]" />
                      <span>Simulate Investor Deposit</span>
                    </button>
                    <span className="text-xs font-bold px-3 py-1 bg-[#EEF1EC] text-[#27845D] rounded-full whitespace-nowrap">
                      {pendingDeposits.length} Requests Pending
                    </span>
                  </div>
                </div>

                {pendingDeposits.length === 0 ? (
                  <div className="text-center py-12 text-xs text-[#69736F] space-y-3">
                    <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto opacity-40" />
                    <p className="text-sm font-semibold text-[#18211F]">All deposits are up to date.</p>
                    <p className="max-w-md mx-auto">New investor transfer requests submitted from the Deposit button will appear here for administrative verification.</p>
                    <button
                      onClick={handleCreateTestDeposit}
                      className="btn btn-primary text-xs font-bold px-4 py-2 mt-2 bg-[#182D2A] hover:bg-[#24423C] text-white inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <Plus className="w-3.5 h-3.5 text-[#B7E36A]" />
                      <span>Generate Test Deposit Request (€5,000)</span>
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {pendingDeposits.map((tx) => {
                      const investor = users.find(u => u.id === tx.userId);
                      return (
                        <div
                          key={tx.id}
                          className="p-5 rounded-2xl bg-[#F6F7F4] border border-[#E3E8E3] flex flex-col md:flex-row md:items-center justify-between gap-4"
                        >
                          <div className="space-y-1 text-left">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-[#27845D] bg-emerald-50 px-2.5 py-0.5 rounded-full uppercase tracking-wider border border-emerald-200/60">
                                Awaiting Deposit Approval
                              </span>
                              <span className="font-mono text-xs text-[#69736F] font-semibold">{tx.reference}</span>
                            </div>
                            <div className="flex items-baseline gap-2">
                              <h4 className="text-xl font-black text-[#18211F]">{formatCurrency(tx.amount)}</h4>
                              <span className="text-xs font-bold text-gray-500">({tx.currency})</span>
                            </div>
                            <div className="text-xs text-[#69736F] flex flex-wrap gap-x-4 gap-y-1">
                              <span>Investor: <strong className="text-[#18211F]">{investor?.fullName || 'Investor'} ({investor?.email})</strong></span>
                              <span>Method: <strong>{tx.paymentMethod}</strong></span>
                            </div>
                            {tx.txHash && (
                              <div className="text-[11px] font-mono text-gray-500">
                                Declared Tx/Note: <span className="text-[#18211F] bg-white px-2 py-0.5 rounded border border-[#E3E8E3] font-semibold">{tx.txHash}</span>
                              </div>
                            )}
                            {(() => {
                              const matchingDoc = verificationDocs.find(d => d.transactionReference === tx.reference);
                              const receiptUrl = tx.metadata?.receiptUrl || matchingDoc?.fileUrl;
                              const receiptName = tx.metadata?.receiptFileName || matchingDoc?.fileName;
                              if (!receiptUrl) return null;
                              return (
                                <div className="pt-1.5">
                                  <button
                                    type="button"
                                    onClick={() => setPreviewProofModalDoc({
                                      title: `Deposit Payment Receipt (${tx.reference})`,
                                      fileUrl: receiptUrl,
                                      fileName: receiptName || 'transfer_receipt.pdf',
                                      type: tx.paymentMethod,
                                      ref: tx.reference,
                                      user: `${investor?.fullName || 'Investor'} (${investor?.email})`
                                    })}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-[#27845D] border border-emerald-300 text-xs font-bold cursor-pointer transition-colors shadow-2xs"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                    <span>View Attached Receipt ({receiptName || 'Wire Slip'})</span>
                                  </button>
                                </div>
                              );
                            })()}
                            <span className="text-[11px] text-[#828D89] block">Submitted: {formatDate(tx.createdAt)}</span>
                          </div>
                          <div className="flex items-center gap-2.5 shrink-0">
                            <button
                              onClick={() => handleReviewDeposit(tx.id, true)}
                              className="btn btn-primary text-xs font-bold px-4 py-2.5 bg-[#27845D] hover:bg-[#1f6b4a] text-white flex items-center cursor-pointer shadow-sm"
                            >
                              <CheckCircle2 className="w-4 h-4 mr-1.5" /> Approve & Credit
                            </button>
                            <button
                              onClick={() => handleReviewDeposit(tx.id, false)}
                              className="btn btn-secondary text-xs font-bold px-4 py-2.5 text-[#C24141] border-red-200 hover:bg-red-50 flex items-center cursor-pointer"
                            >
                              <XCircle className="w-4 h-4 mr-1.5" /> Decline
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'withdrawals' && (
              <div className="bg-white p-6 sm:p-8 rounded-3xl border border-[#E3E8E3] shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
                  <div>
                    <h3 className="text-lg font-bold text-[#18211F]">Pending Investor Withdrawals</h3>
                    <p className="text-xs text-[#69736F]">Approve and execute bank wire payouts and cryptocurrency payouts</p>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <button
                      onClick={handleCreateTestWithdrawal}
                      className="px-3.5 py-1.5 rounded-xl bg-[#EEF2EC] hover:bg-[#E3E8E3] text-[#182D2A] text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer border border-[#DCE4DA]"
                    >
                      <Plus className="w-3.5 h-3.5 text-[#27845D]" />
                      <span>Simulate Investor Withdrawal</span>
                    </button>
                    <span className="text-xs font-bold px-3 py-1 bg-[#EEF1EC] text-[#27845D] rounded-full whitespace-nowrap">
                      {pendingWithdrawals.length} Requests Pending
                    </span>
                  </div>
                </div>

                {pendingWithdrawals.length === 0 ? (
                  <div className="text-center py-12 text-xs text-[#69736F] space-y-3">
                    <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto opacity-40" />
                    <p className="text-sm font-semibold text-[#18211F]">No pending withdrawals.</p>
                    <p className="max-w-md mx-auto">All requested disbursements have been fulfilled. New withdrawal requests will appear here for payout authorization.</p>
                    <button
                      onClick={handleCreateTestWithdrawal}
                      className="btn btn-secondary text-xs font-bold px-4 py-2 mt-2 inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5 text-[#27845D]" />
                      <span>Generate Test Withdrawal Request (€1,500)</span>
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {pendingWithdrawals.map((tx) => {
                      const investor = users.find(u => u.id === tx.userId);
                      const isCrypto = !!tx.metadata?.destinationAddress;
                      const destination = tx.metadata?.destinationAddress || tx.metadata?.bankIban || 'Bank Wire';
                      return (
                        <div
                          key={tx.id}
                          className="p-5 rounded-2xl bg-[#F6F7F4] border border-[#E3E8E3] flex flex-col md:flex-row md:items-center justify-between gap-4"
                        >
                          <div className="space-y-1 text-left">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-[#C24141] bg-red-50 px-2 py-0.5 rounded-full uppercase tracking-wider border border-red-200/60">
                                {isCrypto ? 'Crypto Withdrawal' : 'SEPA Bank Wire'}
                              </span>
                              <span className="font-mono text-xs text-[#69736F] font-semibold">{tx.reference}</span>
                            </div>
                            <h4 className="text-xl font-black text-[#18211F]">{formatCurrency(tx.amount)}</h4>
                            <div className="text-xs text-[#69736F] space-y-0.5">
                              <div>Investor: <strong className="text-[#18211F]">{investor?.fullName} ({investor?.email})</strong></div>
                              <div>
                                Destination: <strong className="font-mono text-[#18211F] select-all bg-white px-2 py-0.5 rounded border border-[#E3E8E3]">{destination}</strong>
                                {tx.metadata?.network && <span className="ml-2 text-[11px] text-[#27845D] font-bold">({tx.metadata.network})</span>}
                              </div>
                            </div>
                            <span className="text-[11px] text-[#828D89] block">Requested: {formatDate(tx.createdAt)}</span>
                          </div>
                          <div className="flex items-center gap-2.5 shrink-0">
                            <button
                              onClick={() => handleReviewWithdrawal(tx.id, true)}
                              className="btn btn-primary text-xs font-bold px-4 py-2.5 bg-[#27845D] hover:bg-[#1f6b4a] text-white flex items-center cursor-pointer shadow-sm"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                              Approve & Execute Payout
                            </button>
                            <button
                              onClick={() => handleReviewWithdrawal(tx.id, false)}
                              className="btn btn-secondary text-xs font-bold px-4 py-2.5 text-[#C24141] border-red-200 hover:bg-red-50 flex items-center cursor-pointer"
                            >
                              <XCircle className="w-3.5 h-3.5 mr-1.5" /> Decline & Refund
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'manual-payment' && (
              <div className="space-y-8 animate-in fade-in duration-200">
                <div className="bg-white p-6 sm:p-8 rounded-3xl border border-[#E3E8E3] shadow-sm space-y-6">
                  <div className="border-b border-[#E3E8E3] pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <h3 className="text-xl font-bold text-[#18211F] flex items-center gap-2">
                        <CreditCard className="w-5 h-5 text-[#27845D]" />
                        Manual Payment Integration & Investor Balance Credit
                      </h3>
                      <p className="text-xs text-[#69736F]">
                        Manually credit investor accounts for confirmed wire transfers, direct crypto deposits, or offline capital contributions.
                      </p>
                    </div>
                    <span className="text-[11px] font-bold bg-[#E8F5E9] text-[#27845D] px-3 py-1 rounded-full">Immediate Ledger Settlement</span>
                  </div>

                  <form onSubmit={handleExecuteManualCredit} className="space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div className="form-field">
                        <label>Select Investor Account</label>
                        <select
                          value={selectedUserId}
                          onChange={(e) => setSelectedUserId(e.target.value)}
                          className="text-xs font-bold p-3 rounded-xl border border-[#E3E8E3] bg-[#F6F7F4] focus:outline-none focus:border-[#182D2A]"
                          required
                        >
                          {users.map(u => (
                            <option key={u.id} value={u.id}>
                              {u.fullName} ({u.email}) — Balance: {formatCurrency(u.walletBalance)} [{u.kycStatus.toUpperCase()}]
                            </option>
                          ))}
                        </select>
                        {selectedTargetUser && (
                          <span className="text-[11px] text-[#27845D] font-semibold mt-1 block">
                            Selected: {selectedTargetUser.fullName} · Current Balance: {formatCurrency(selectedTargetUser.walletBalance)} · KYC: {selectedTargetUser.kycStatus}
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        <div className="col-span-2 form-field">
                          <label>Credit Amount</label>
                          <input
                            type="number"
                            min="1"
                            step="1"
                            value={manualAmount}
                            onChange={(e) => setManualAmount(Number(e.target.value))}
                            required
                            className="text-xs font-bold"
                          />
                        </div>
                        <div className="form-field">
                          <label>Currency</label>
                          <select
                            value={manualCurrency}
                            onChange={(e) => setManualCurrency(e.target.value)}
                            className="text-xs font-bold p-2.5 rounded-xl border border-[#E3E8E3] bg-[#F6F7F4]"
                          >
                            <option value="EUR">EUR (€)</option>
                            <option value="USDT">USDT</option>
                            <option value="USDC">USDC</option>
                            <option value="ETH">ETH</option>
                            <option value="BTC">BTC</option>
                            <option value="SOL">SOL</option>
                          </select>
                        </div>
                      </div>
                      <div className="form-field">
                        <label>Payment Method / Channel</label>
                        <select
                          value={manualMethod}
                          onChange={(e) => setManualMethod(e.target.value)}
                          className="text-xs font-bold p-3 rounded-xl border border-[#E3E8E3] bg-[#F6F7F4]"
                        >
                          <option value="Direct SEPA Wire Received">Direct SEPA Wire Received (Bank Settlement)</option>
                          <option value="Direct OTC Crypto Treasury Inflow">Direct OTC Crypto Treasury Inflow</option>
                          <option value="Institutional Cash / Bank Draft">Institutional Cash / Certified Bank Draft</option>
                          <option value="Promotional Bonus / Institutional Reward">Promotional Bonus / Institutional Reward</option>
                          <option value="Ledger Adjustment / Balance Rectification">Ledger Adjustment / Balance Rectification</option>
                        </select>
                      </div>
                      <div className="form-field">
                        <label>External Transaction Reference / Bank Wire Ref</label>
                        <input
                          type="text"
                          placeholder="e.g. SANTANDER-WIRE-89410 or 0x39a..."
                          value={manualReference}
                          onChange={(e) => setManualReference(e.target.value)}
                          className="text-xs font-mono font-bold"
                        />
                        <span className="text-[10px] text-[#69736F] mt-0.5 block">
                          Leave empty to automatically generate a compliant sequential ledger reference.
                        </span>
                      </div>
                      <div className="form-field md:col-span-2">
                        <label>Administrative Notes & Audit Justification</label>
                        <textarea
                          rows={2}
                          value={manualNotes}
                          onChange={(e) => setManualNotes(e.target.value)}
                          placeholder="e.g. Funds verified by treasury officer via UNLIMIT corporate statement."
                          className="text-xs font-bold"
                          required
                        />
                      </div>
                    </div>
                    <div className="pt-2 flex items-center justify-between">
                      <span className="text-xs text-[#69736F]">
                        Action will atomically credit wallet balance, generate audited immutable ledger record, and notify the user.
                      </span>
                      <button
                        type="submit"
                        disabled={isSubmittingCredit}
                        className="btn btn-primary text-xs font-bold px-6 py-3 bg-[#27845D] hover:bg-[#1f6b4a] text-white flex items-center justify-center gap-2 cursor-pointer shadow-md disabled:opacity-50"
                      >
                        {isSubmittingCredit ? (
                          <>
                            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            <span>Processing payment...</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="w-4 h-4" />
                            <span>{`Execute & Credit ${formatCurrency(manualAmount)} to Investor`}</span>
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                </div>

                <div className="bg-white p-6 sm:p-8 rounded-3xl border border-[#E3E8E3] shadow-sm space-y-6">
                  <div className="border-b border-[#E3E8E3] pb-4">
                    <h3 className="text-lg font-bold text-[#18211F] flex items-center gap-2">
                      <UserCheck className="w-5 h-5 text-[#27845D]" />
                      Assign Dedicated Payment Details to Specific Investor
                    </h3>
                    <p className="text-xs text-[#69736F]">
                      Configure dedicated escrow deposit addresses or personal bank accounts for VIP and high-net-worth investors.
                    </p>
                  </div>
                  <form onSubmit={handleSaveUserPaymentDetails} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="form-field">
                        <label>Select Investor</label>
                        <select
                          value={editUserPaymentId}
                          onChange={(e) => {
                            setEditUserPaymentId(e.target.value);
                            const sel = users.find(u => u.id === e.target.value);
                            if (sel) {
                              setUserCustomCryptoAddress(sel.cryptoDepositAddress || '');
                              setUserCustomIban(sel.bankIban || '');
                            }
                          }}
                          className="text-xs font-bold p-3 rounded-xl border border-[#E3E8E3] bg-[#F6F7F4]"
                        >
                          {users.map(u => (
                            <option key={u.id} value={u.id}>{u.fullName} ({u.email})</option>
                          ))}
                        </select>
                      </div>
                      <div className="form-field">
                        <label>Dedicated Crypto Deposit Address</label>
                        <input
                          type="text"
                          placeholder="0x... or custom wallet address"
                          value={userCustomCryptoAddress}
                          onChange={(e) => setUserCustomCryptoAddress(e.target.value)}
                          className="text-xs font-mono font-bold"
                        />
                      </div>
                      <div className="form-field">
                        <label>Designated European Bank IBAN</label>
                        <input
                          type="text"
                          placeholder="ES91 2100 ..."
                          value={userCustomIban}
                          onChange={(e) => setUserCustomIban(e.target.value)}
                          className="text-xs font-mono font-bold uppercase"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end pt-2">
                      <button
                        type="submit"
                        className="btn btn-secondary text-xs font-bold px-6 py-2.5 cursor-pointer hover:bg-gray-100"
                      >
                        Save Dedicated Payment Details
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {activeTab === 'payment-distribution' && (
              <AdminPaymentDistributionManager />
            )}

            {activeTab === 'payment-settings' && (
              <div className="bg-white p-6 sm:p-8 rounded-3xl border border-[#E3E8E3] shadow-sm space-y-8 animate-in fade-in duration-200">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#E3E8E3] pb-4 gap-4">
                  <div>
                    <h3 className="text-xl font-bold text-[#18211F]">Payment Gateway & Treasury Wallet Settings</h3>
                    <p className="text-xs text-[#69736F]">
                      Configure official SEPA bank accounts and multi-chain cryptocurrency treasury wallet addresses.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowAddNetwork(!showAddNetwork)}
                    className="btn btn-primary text-xs font-bold px-4 py-2 bg-[#27845D] hover:bg-[#1f6b4a] text-white flex items-center gap-1.5 cursor-pointer shadow-sm self-start sm:self-auto"
                  >
                    <Plus className="w-4 h-4" />
                    Add New Treasury Wallet
                  </button>
                </div>

                {showAddNetwork && (
                  <div className="p-6 rounded-2xl bg-[#F6F7F4] border-2 border-[#27845D] space-y-4 animate-in fade-in">
                    <div className="flex justify-between items-center">
                      <h4 className="text-sm font-bold text-[#18211F] flex items-center gap-2">
                        <Coins className="w-4 h-4 text-[#27845D]" />
                        Integrate New Crypto Treasury Wallet / Network
                      </h4>
                      <button onClick={() => setShowAddNetwork(false)} className="text-xs font-bold text-gray-500 hover:text-black">Cancel</button>
                    </div>
                    <form onSubmit={handleAddNewCryptoNetwork} className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                          <label className="text-[11px] font-bold text-[#69736F] block mb-1">Network Display Name</label>
                          <input
                            type="text"
                            value={newNetName}
                            onChange={(e) => setNewNetName(e.target.value)}
                            placeholder="e.g. Arbitrum One"
                            required
                            className="text-xs font-bold w-full p-2.5 rounded-xl border border-[#E3E8E3] bg-white"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-bold text-[#69736F] block mb-1">Supported Token / Symbol</label>
                          <input
                            type="text"
                            value={newNetToken}
                            onChange={(e) => setNewNetToken(e.target.value.toUpperCase())}
                            placeholder="e.g. USDT or USDC"
                            required
                            className="text-xs font-bold w-full p-2.5 rounded-xl border border-[#E3E8E3] bg-white"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-bold text-[#69736F] block mb-1">Blockchain Protocol</label>
                          <input
                            type="text"
                            value={newNetProtocol}
                            onChange={(e) => setNewNetProtocol(e.target.value)}
                            placeholder="e.g. Ethereum / Arbitrum / Solana"
                            required
                            className="text-xs font-bold w-full p-2.5 rounded-xl border border-[#E3E8E3] bg-white"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-bold text-[#69736F] block mb-1">Contract Ending (Optional)</label>
                          <input
                            type="text"
                            value={newNetContractEnd}
                            onChange={(e) => setNewNetContractEnd(e.target.value)}
                            placeholder="e.g. af88d0 or Native"
                            className="text-xs font-mono w-full p-2.5 rounded-xl border border-[#E3E8E3] bg-white"
                          />
                        </div>
                        <div className="md:col-span-4">
                          <label className="text-[11px] font-bold text-[#69736F] block mb-1">Insured Treasury Wallet Address</label>
                          <input
                            type="text"
                            value={newNetAddress}
                            onChange={(e) => setNewNetAddress(e.target.value)}
                            placeholder="0x... or network address"
                            required
                            className="text-xs font-mono font-bold w-full p-2.5 rounded-xl border border-[#E3E8E3] bg-white"
                          />
                        </div>
                      </div>
                      <div className="flex justify-end gap-3 pt-2">
                        <button
                          type="button"
                          onClick={() => setShowAddNetwork(false)}
                          className="btn btn-secondary text-xs font-bold px-4 py-2 cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="btn btn-primary text-xs font-bold px-6 py-2 bg-[#27845D] text-white cursor-pointer"
                        >
                          Save & Enable Network
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                <form onSubmit={handleSavePaymentConfig} className="space-y-8">
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-[#27845D]" />
                      <h4 className="text-sm font-bold text-[#182D2A] uppercase tracking-wider">Traditional European Bank Transfer (SEPA / Wire)</h4>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="form-field">
                        <label>Bank Name / Institution</label>
                        <input
                          type="text"
                          value={paymentConfig.traditional.bankName}
                          onChange={(e) => setPaymentConfig({
                            ...paymentConfig,
                            traditional: { ...paymentConfig.traditional, bankName: e.target.value }
                          })}
                          required
                          className="text-xs font-bold w-full p-2.5 rounded-xl border border-[#E3E8E3] bg-white"
                        />
                      </div>
                      <div className="form-field">
                        <label>Beneficiary Name</label>
                        <input
                          type="text"
                          value={paymentConfig.traditional.beneficiary}
                          onChange={(e) => setPaymentConfig({
                            ...paymentConfig,
                            traditional: { ...paymentConfig.traditional, beneficiary: e.target.value }
                          })}
                          required
                          className="text-xs font-bold w-full p-2.5 rounded-xl border border-[#E3E8E3] bg-white"
                        />
                      </div>
                      <div className="form-field">
                        <label>IBAN Account</label>
                        <input
                          type="text"
                          value={paymentConfig.traditional.iban}
                          onChange={(e) => setPaymentConfig({
                            ...paymentConfig,
                            traditional: { ...paymentConfig.traditional, iban: e.target.value }
                          })}
                          required
                          className="text-xs font-bold w-full p-2.5 rounded-xl border border-[#E3E8E3] bg-white"
                        />
                      </div>
                      <div className="form-field">
                        <label>BIC / SWIFT</label>
                        <input
                          type="text"
                          value={paymentConfig.traditional.bic}
                          onChange={(e) => setPaymentConfig({
                            ...paymentConfig,
                            traditional: { ...paymentConfig.traditional, bic: e.target.value }
                          })}
                          required
                          className="text-xs font-bold w-full p-2.5 rounded-xl border border-[#E3E8E3] bg-white"
                        />
                      </div>
                      <div className="form-field">
                        <label>Support Email for Wire Receipts</label>
                        <input
                          type="email"
                          value={paymentConfig.traditional.supportEmail}
                          onChange={(e) => setPaymentConfig({
                            ...paymentConfig,
                            traditional: { ...paymentConfig.traditional, supportEmail: e.target.value }
                          })}
                          required
                          className="text-xs font-bold w-full p-2.5 rounded-xl border border-[#E3E8E3] bg-white"
                        />
                      </div>
                      <div className="form-field">
                        <label>Bank Routing / Clearing Code</label>
                        <input
                          type="text"
                          value={paymentConfig.traditional.routingNumber || ''}
                          onChange={(e) => setPaymentConfig({
                            ...paymentConfig,
                            traditional: { ...paymentConfig.traditional, routingNumber: e.target.value }
                          })}
                          placeholder="e.g. ES912100"
                          className="text-xs font-bold w-full p-2.5 rounded-xl border border-[#E3E8E3] bg-white"
                        />
                      </div>
                      <div className="form-field md:col-span-2">
                        <label>Wire Transfer Instructions shown to Investors</label>
                        <textarea
                          rows={2}
                          value={paymentConfig.traditional.instructions}
                          onChange={(e) => setPaymentConfig({
                            ...paymentConfig,
                            traditional: { ...paymentConfig.traditional, instructions: e.target.value }
                          })}
                          required
                          className="text-xs font-bold w-full p-2.5 rounded-xl border border-[#E3E8E3] bg-white"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4 pt-6 border-t border-[#E3E8E3]">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Coins className="w-4 h-4 text-[#27845D]" />
                        <h4 className="text-sm font-bold text-[#182D2A] uppercase tracking-wider">
                          Cryptocurrency Treasury Wallet: USDC (BEP20)
                        </h4>
                      </div>
                    </div>
                    <div className="space-y-3">
                      {paymentConfig.cryptoNetworks.map((net, index) => (
                        <div
                          key={net.id}
                          className={`p-4 rounded-2xl border transition-all ${
                            net.enabled !== false ? 'bg-[#F6F7F4] border-[#E3E8E3]' : 'bg-gray-100/60 border-gray-200 opacity-60'
                          }`}
                        >
                          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                            <div className="md:col-span-3">
                              <label className="text-[10px] font-bold text-[#69736F] block">Network Name</label>
                              <input
                                type="text"
                                value={net.name}
                                onChange={(e) => {
                                  const updated = [...paymentConfig.cryptoNetworks];
                                  updated[index].name = e.target.value;
                                  setPaymentConfig({ ...paymentConfig, cryptoNetworks: updated });
                                }}
                                className="text-xs font-bold w-full bg-white p-2 rounded-xl border border-[#E3E8E3]"
                              />
                            </div>
                            <div className="md:col-span-2">
                              <label className="text-[10px] font-bold text-[#69736F] block">Token Symbol</label>
                              <input
                                type="text"
                                value={net.token}
                                onChange={(e) => {
                                  const updated = [...paymentConfig.cryptoNetworks];
                                  updated[index].token = e.target.value;
                                  setPaymentConfig({ ...paymentConfig, cryptoNetworks: updated });
                                }}
                                className="text-xs font-bold w-full bg-white p-2 rounded-xl border border-[#E3E8E3]"
                              />
                            </div>
                            <div className="md:col-span-5">
                              <label className="text-[10px] font-bold text-[#69736F] block">Treasury Wallet Address</label>
                              <input
                                type="text"
                                value={net.walletAddress}
                                onChange={(e) => {
                                  const updated = [...paymentConfig.cryptoNetworks];
                                  updated[index].walletAddress = e.target.value;
                                  setPaymentConfig({ ...paymentConfig, cryptoNetworks: updated });
                                }}
                                className="text-xs font-mono font-bold w-full bg-white p-2 rounded-xl border border-[#E3E8E3]"
                              />
                            </div>
                            <div className="md:col-span-2 flex items-center justify-end gap-2 pt-3 md:pt-0">
                              <button
                                type="button"
                                onClick={() => handleToggleCryptoNetwork(net.id)}
                                title={net.enabled !== false ? 'Disable Network' : 'Enable Network'}
                                className="text-xs font-bold p-2 text-gray-500 hover:text-black cursor-pointer"
                              >
                                {net.enabled !== false ? (
                                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-1 rounded-lg">Active</span>
                                ) : (
                                  <span className="text-[10px] font-bold text-gray-500 bg-gray-200 px-2 py-1 rounded-lg">Disabled</span>
                                )}
                              </button>
                              {confirmDeleteNetId === net.id ? (
                                <div className="inline-flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteCryptoNetwork(net.id, net.name)}
                                    className="px-2 py-1 rounded-md bg-red-600 hover:bg-red-700 text-white text-[11px] font-bold cursor-pointer"
                                  >
                                    Remove
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setConfirmDeleteNetId(null)}
                                    className="px-2 py-1 rounded-md bg-gray-100 hover:bg-gray-200 text-gray-700 text-[11px] font-semibold cursor-pointer"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteNetId(net.id)}
                                  title="Delete Network"
                                  className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-4 flex justify-end">
                    <button
                      type="submit"
                      className="btn btn-primary text-xs font-bold px-8 py-3 bg-[#182D2A] text-white hover:bg-[#24423C] cursor-pointer shadow-md"
                    >
                      Save Payment Settings & Treasury Configurations
                    </button>
                  </div>
                </form>
              </div>
            )}

            {activeTab === 'kyc' && (
              <div className="bg-white p-6 rounded-3xl border border-[#E3E8E3] shadow-sm">
                <h3 className="text-lg font-bold text-[#18211F] mb-4">Investor Identity Verifications (AML5/6)</h3>
                {pendingKYCUsers.length === 0 ? (
                  <div className="text-center py-10 text-xs text-[#69736F]">
                    All registered investors have been reviewed. No pending KYC submissions.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {pendingKYCUsers.map((u) => (
                      <div
                        key={u.id}
                        className="p-4 rounded-2xl bg-[#F6F7F4] border border-[#E3E8E3] flex flex-col md:flex-row md:items-center justify-between gap-4"
                      >
                        <div>
                          <h4 className="text-sm font-bold text-[#18211F]">{u.fullName}</h4>
                          <p className="text-xs text-[#69736F]">{u.email} · {u.country || 'Spain'}</p>
                          <span className="text-[11px] text-[#27845D] font-semibold block mt-1">
                            Submitted: {u.kycSubmittedAt ? formatDate(u.kycSubmittedAt) : 'Recently'} · Doc: {u.kycDocumentType || 'Passport'}
                          </span>
                          {(() => {
                            const matchingDoc = verificationDocs.find(d => d.userId === u.id && d.category === 'kyc_identity');
                            if (!matchingDoc) return null;
                            return (
                              <div className="pt-2">
                                <button
                                  type="button"
                                  onClick={() => setPreviewProofModalDoc({
                                    title: `Identity Verification Scan: ${u.fullName}`,
                                    fileUrl: matchingDoc.fileUrl,
                                    fileName: matchingDoc.fileName,
                                    type: matchingDoc.documentType,
                                    user: `${u.fullName} (${u.email})`
                                  })}
                                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-[#27845D] border border-emerald-300 text-xs font-bold cursor-pointer transition-colors"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                  <span>View Uploaded {matchingDoc.documentType} Scan</span>
                                </button>
                              </div>
                            );
                          })()}
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleReviewKYC(u.id, true)}
                            className="btn btn-primary btn-sm bg-[#27845D] text-xs font-bold cursor-pointer"
                          >
                            Approve Verification
                          </button>
                          <button
                            onClick={() => handleReviewKYC(u.id, false)}
                            className="btn btn-secondary btn-sm text-xs font-bold text-red-600 cursor-pointer"
                          >
                            Reject
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'verification_docs' && (
              <div className="bg-white p-6 sm:p-8 rounded-3xl border border-[#E3E8E3] shadow-sm space-y-6 animate-in fade-in duration-200">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E3E8E3] pb-5">
                  <div>
                    <h3 className="text-xl font-bold text-[#18211F]">Investor Document & Proof Approvals Vault</h3>
                    <p className="text-xs text-[#69736F]">
                      Review, inspect, and confirm bank transfer wire receipts, crypto payment proofs, and AML identity documents uploaded from investor dashboards.
                    </p>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => {
                        const testRef = `DEP-EUR-${Math.floor(100000 + Math.random() * 900000)}`;
                        ledger.processDeposit(
                          users.find(u => u.role !== 'admin')?.id || users[0].id,
                          7500,
                          'EUR',
                          'SEPA Bank Wire Transfer (UNLIMIT Escrow)',
                          testRef,
                          {
                            receiptUrl: '/assets/aistudio/IMG_7167_9db0efc3.jpeg',
                            receiptFileName: `unlimit_wire_slip_${testRef}.pdf`,
                            receiptFileSize: 260000,
                            notes: 'Simulated investor wire transfer slip upload'
                          }
                        );
                        refreshAll();
                        setActionSuccess(`Simulated new investor upload with transfer slip (${testRef}).`);
                        setTimeout(() => setActionSuccess(null), 4000);
                      }}
                      className="px-3.5 py-1.5 rounded-xl bg-[#EEF2EC] hover:bg-[#E3E8E3] text-[#182D2A] text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer border border-[#DCE4DA]"
                    >
                      <Plus className="w-3.5 h-3.5 text-[#27845D]" />
                      <span>Simulate Investor Upload (€7,500)</span>
                    </button>
                    <span className="text-xs font-bold px-3 py-1 bg-amber-50 text-amber-900 border border-amber-200 rounded-full whitespace-nowrap">
                      {pendingVerificationDocs.length} Pending Confirmation
                    </span>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3.5 bg-[#F6F7F4] rounded-2xl border border-[#E3E8E3] text-xs">
                  <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
                    <span className="font-bold text-[#18211F] flex items-center gap-1">
                      <Filter className="w-3.5 h-3.5 text-[#27845D]" /> Category:
                    </span>
                    {(['all', 'deposit_proof', 'kyc_identity', 'proof_of_address'] as const).map(cat => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setDocFilterCategory(cat)}
                        className={`px-3 py-1 rounded-xl font-bold transition-all cursor-pointer ${
                          docFilterCategory === cat
                            ? 'bg-[#182D2A] text-white shadow-xs'
                            : 'bg-white text-[#69736F] hover:text-[#18211F] border border-[#E3E8E3]'
                        }`}
                      >
                        {cat === 'all' ? 'All Categories' : cat === 'deposit_proof' ? 'Deposit Receipts' : cat === 'kyc_identity' ? 'Identity (KYC)' : 'Address Proofs'}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
                    <span className="font-bold text-[#18211F]">Status:</span>
                    {(['all', 'pending', 'approved', 'rejected'] as const).map(st => (
                      <button
                        key={st}
                        type="button"
                        onClick={() => setDocFilterStatus(st)}
                        className={`px-3 py-1 rounded-xl font-bold transition-all cursor-pointer ${
                          docFilterStatus === st
                            ? 'bg-[#182D2A] text-white shadow-xs'
                            : 'bg-white text-[#69736F] hover:text-[#18211F] border border-[#E3E8E3]'
                        }`}
                      >
                        {st === 'all' ? 'All' : st === 'pending' ? 'Pending' : st === 'approved' ? 'Approved' : 'Declined'}
                      </button>
                    ))}
                  </div>
                </div>

                {(() => {
                  const filtered = verificationDocs.filter(d => {
                    const matchesCat = docFilterCategory === 'all' || d.category === docFilterCategory;
                    const matchesStatus = docFilterStatus === 'all' || d.status === docFilterStatus;
                    return matchesCat && matchesStatus;
                  });

                  if (filtered.length === 0) {
                    return (
                      <div className="text-center py-12 text-[#69736F] space-y-3">
                        <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto opacity-40" />
                        <p className="text-sm font-semibold text-[#18211F]">No documents found for this filter.</p>
                        <p className="text-xs max-w-sm mx-auto">
                          All investor transfer proofs and KYC scans have been processed.
                        </p>
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-4">
                      {filtered.map(doc => (
                        <div
                          key={doc.id}
                          className="p-5 rounded-2xl border border-[#E3E8E3] bg-[#F6F7F4] flex flex-col lg:flex-row lg:items-center justify-between gap-4 text-left"
                        >
                          <div className="flex items-start gap-4">
                            <div className="w-12 h-12 rounded-xl bg-[#182D2A] text-[#B7E36A] flex items-center justify-center font-bold shrink-0 mt-0.5 shadow-xs">
                              {doc.category === 'deposit_proof' ? (
                                <CreditCard className="w-6 h-6" />
                              ) : (
                                <UserCheck className="w-6 h-6" />
                              )}
                            </div>
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-extrabold text-sm text-[#18211F]">{doc.title}</span>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                                  doc.status === 'pending'
                                    ? 'bg-amber-100 text-amber-900 border border-amber-200'
                                    : doc.status === 'approved'
                                    ? 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                                    : 'bg-red-100 text-red-900 border border-red-200'
                                }`}>
                                  {doc.status === 'pending' ? 'Pending Admin Confirmation' : doc.status === 'approved' ? 'Confirmed & Approved' : 'Declined'}
                                </span>
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-800">
                                  {doc.documentType}
                                </span>
                              </div>
                              <div className="text-xs text-[#69736F] flex flex-wrap gap-x-4 gap-y-1">
                                <span>Investor: <strong className="text-[#18211F]">{doc.userName} ({doc.userEmail})</strong></span>
                                {doc.transactionReference && (
                                  <span>Ref: <strong className="font-mono text-[#18211F]">{doc.transactionReference}</strong></span>
                                )}
                                {doc.amount && (
                                  <span>Amount: <strong className="text-[#27845D]">{formatCurrency(doc.amount)} {doc.currency}</strong></span>
                                )}
                                <span>File: <span className="font-mono">{doc.fileName}</span></span>
                                <span>Submitted: {formatDate(doc.uploadedAt)}</span>
                              </div>
                              {doc.notes && (
                                <p className="text-[11px] text-[#4A5551] italic bg-white p-2 rounded-lg border border-[#E3E8E3] mt-1">
                                  Note from investor: "{doc.notes}"
                                </p>
                              )}
                              {doc.reviewedAt && (
                                <span className="text-[10px] text-slate-500 block">
                                  Reviewed by {doc.reviewedBy || 'compliance'} on {formatDate(doc.reviewedAt)}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2.5 shrink-0 self-end lg:self-center">
                            <button
                              type="button"
                              onClick={() => setPreviewProofModalDoc({
                                title: doc.title,
                                fileUrl: doc.fileUrl,
                                fileName: doc.fileName,
                                type: doc.documentType,
                                ref: doc.transactionReference,
                                user: `${doc.userName} (${doc.userEmail})`
                              })}
                              className="btn btn-secondary text-xs font-bold px-3.5 py-2.5 border-slate-300 bg-white hover:bg-slate-50 text-[#18211F] flex items-center gap-1.5 cursor-pointer shadow-xs"
                            >
                              <Eye className="w-3.5 h-3.5 text-[#27845D]" />
                              <span>Inspect Proof</span>
                            </button>
                            {doc.status === 'pending' ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleReviewVerificationDoc(doc.id, true)}
                                  className="btn btn-primary text-xs font-bold px-4 py-2.5 bg-[#27845D] hover:bg-[#1f6b4a] text-white flex items-center gap-1.5 cursor-pointer shadow-sm"
                                >
                                  <CheckCircle2 className="w-4 h-4" />
                                  <span>Confirm & Approve</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const reason = prompt('Specify rejection reason for investor:', 'Document scan is blurry or unreadable. Please provide a clear original PDF or photo.');
                                    if (reason !== null) {
                                      handleReviewVerificationDoc(doc.id, false, reason);
                                    }
                                  }}
                                  className="btn btn-secondary text-xs font-bold px-3.5 py-2.5 text-[#C24141] border-red-200 hover:bg-red-50 flex items-center gap-1.5 cursor-pointer"
                                >
                                  <XCircle className="w-4 h-4" />
                                  <span>Decline</span>
                                </button>
                              </>
                            ) : doc.status === 'approved' ? (
                              <span className="text-xs font-bold text-emerald-800 flex items-center gap-1 bg-emerald-50 px-3 py-2 rounded-xl border border-emerald-200">
                                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                <span>Approved & Settled</span>
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleReviewVerificationDoc(doc.id, true)}
                                className="btn btn-secondary text-xs font-bold px-3.5 py-2 text-emerald-800 border-emerald-300 hover:bg-emerald-50 cursor-pointer"
                              >
                                Re-Approve
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            )}

            {activeTab === 'properties' && (
              <div className="bg-white p-6 sm:p-8 rounded-3xl border border-[#E3E8E3] shadow-sm space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E3E8E3] pb-5">
                  <div>
                    <h3 className="text-xl font-bold text-[#18211F]">Property Offerings Portfolio ({properties.length})</h3>
                    <p className="text-xs text-[#69736F]">
                      Manage luxury assets, review pending properties waiting for listing approval, and configure funding statuses.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowNewPropertyModal(true)}
                      className="btn btn-primary btn-sm text-xs font-bold cursor-pointer bg-[#27845D] hover:bg-[#1f6b4b] text-white flex items-center gap-1.5 px-3.5 py-2 rounded-xl shadow-xs"
                    >
                      <Plus className="w-4 h-4" />
                      Add Property to Inventory
                    </button>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-amber-50/90 border border-amber-200/90 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs text-amber-950 shadow-xs">
                  <div className="flex items-start sm:items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-amber-100 border border-amber-300 text-amber-900 flex items-center justify-center shrink-0">
                      <Lock className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-bold text-sm text-amber-950 flex items-center gap-2">
                        <span>Admin Custody Invariant Enforced</span>
                        <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-200 text-amber-900 border border-amber-300">
                          Isolated
                        </span>
                      </div>
                      <p className="text-amber-800/90 text-xs mt-0.5 leading-relaxed">
                        All hidden properties stay strictly in the admin part. They are quarantined from visitors and the public frontend until an operational function is assigned and formal approval is granted.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="px-3 py-1 rounded-xl bg-white border border-amber-300 font-bold text-amber-900 text-xs">
                      {properties.filter(p => p.status === 'hidden' || p.status === 'pending_approval' || p.approvedForFrontend === false).length} Assets in Admin Custody
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div
                    onClick={() => setAdminPropertyFilter('all')}
                    className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                      adminPropertyFilter === 'all'
                        ? 'border-[#182D2A] bg-[#182D2A] text-white shadow-sm'
                        : 'border-[#E3E8E3] bg-[#F6F7F4] text-[#18211F] hover:bg-gray-100'
                    }`}
                  >
                    <div className="text-xs font-semibold opacity-80">Total Inventory</div>
                    <div className="text-2xl font-black mt-1">{properties.length}</div>
                  </div>
                  <div
                    onClick={() => setAdminPropertyFilter('funding')}
                    className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                      adminPropertyFilter === 'funding'
                        ? 'border-blue-600 bg-blue-50 text-blue-900 shadow-sm'
                        : 'border-[#E3E8E3] bg-[#F6F7F4] text-[#18211F] hover:bg-gray-100'
                    }`}
                  >
                    <div className="text-xs font-semibold opacity-80">Funding</div>
                    <div className="text-2xl font-black mt-1">{properties.filter(p => p.status === 'funding').length}</div>
                  </div>
                  <div
                    onClick={() => setAdminPropertyFilter('funded')}
                    className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                      adminPropertyFilter === 'funded'
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-900 shadow-sm'
                        : 'border-[#E3E8E3] bg-[#F6F7F4] text-[#18211F] hover:bg-gray-100'
                    }`}
                  >
                    <div className="text-xs font-semibold opacity-80">Funded</div>
                    <div className="text-2xl font-black mt-1">{properties.filter(p => p.status === 'funded').length}</div>
                  </div>
                  <div
                    onClick={() => setAdminPropertyFilter('upcoming')}
                    className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                      adminPropertyFilter === 'upcoming'
                        ? 'border-purple-600 bg-purple-50 text-purple-900 shadow-sm'
                        : 'border-[#E3E8E3] bg-[#F6F7F4] text-[#18211F] hover:bg-gray-100'
                    }`}
                  >
                    <div className="text-xs font-semibold opacity-80">Upcoming</div>
                    <div className="text-2xl font-black mt-1">{properties.filter(p => p.status === 'upcoming').length}</div>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-[#E3E8E3] text-[#69736F] font-bold uppercase text-[10px] tracking-wider bg-[#F9FAF8]">
                        <th className="py-3 px-3">Property Asset / SPV</th>
                        <th className="py-3 px-3">City & Type</th>
                        <th className="py-3 px-3">Funding Progress</th>
                        <th className="py-3 px-3">Yield (Net IRR)</th>
                        <th className="py-3 px-3">Status</th>
                        <th className="py-3 px-3 text-right">Quick Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E3E8E3]">
                      {properties
                        .filter(p => adminPropertyFilter === 'all' || p.status === adminPropertyFilter)
                        .map((prop) => {
                          const percent = Math.min(100, Math.round((prop.fundedAmount / prop.targetAmount) * 100));
                          return (
                            <tr key={prop.id} className="hover:bg-slate-50/80 transition-colors">
                              <td className="py-3.5 px-3">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-xl overflow-hidden bg-slate-100 shrink-0 border border-slate-200">
                                    <img src={prop.images[0] || prop.bannerImage} alt={prop.title} className="w-full h-full object-cover" />
                                  </div>
                                  <div>
                                    <span className="font-bold text-[#18211F] block text-xs hover:text-emerald-800">{prop.title}</span>
                                    <span className="text-[10px] text-[#69736F] font-mono">
                                      {prop.tokenTicker} · {prop.blockchainNetwork || 'Polygon POS'}
                                    </span>
                                  </div>
                                </div>
                              </td>
                              <td className="py-3.5 px-3">
                                <span className="font-semibold text-[#18211F] block">{prop.city}</span>
                                <span className="text-[10px] text-[#69736F]">{prop.type}</span>
                              </td>
                              <td className="py-3.5 px-3 min-w-[160px]">
                                <div className="space-y-1">
                                  <div className="flex justify-between text-[11px] font-semibold">
                                    <span className="text-[#18211F]">{formatCurrency(prop.fundedAmount)}</span>
                                    <span className="text-[#69736F]">{percent}%</span>
                                  </div>
                                  <div className="w-full bg-[#E8EEED] h-2 rounded-full overflow-hidden">
                                    <div
                                      className={`h-full rounded-full transition-all duration-500 ${
                                        percent >= 100 ? 'bg-emerald-600' : 'bg-[#182D2A]'
                                      }`}
                                      style={{ width: `${percent}%` }}
                                    />
                                  </div>
                                  <span className="text-[10px] text-[#69736F] block">Goal: {formatCurrency(prop.targetAmount)}</span>
                                </div>
                              </td>
                              <td className="py-3.5 px-3">
                                <span className="font-black text-emerald-800 block text-xs">{prop.estimatedAnnualYield}%</span>
                                <span className="text-[10px] text-[#69736F]">+{prop.capitalAppreciationYield}% apprec.</span>
                              </td>
                              <td className="py-3.5 px-3">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                  prop.status === 'funding'
                                    ? 'bg-blue-100 text-blue-800'
                                    : prop.status === 'funded'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : prop.status === 'upcoming'
                                    ? 'bg-purple-100 text-purple-800'
                                    : 'bg-slate-100 text-slate-700'
                                }`}>
                                  {prop.status}
                                </span>
                              </td>
                              <td className="py-3.5 px-3 text-right">
                                <button
                                  onClick={() => handleTogglePropertyStatus(prop)}
                                  className="text-[11px] font-semibold text-emerald-800 hover:text-emerald-950 hover:underline cursor-pointer"
                                  title="Click to cycle status: Funding -> Funded -> Upcoming -> Funding"
                                >
                                  Cycle Status
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'property-documents' && (
              <PropertyDocumentsHub properties={properties} />
            )}

            {activeTab === 'audit' && (
              <AdminAuditLogsView currentAdminEmail={activeUser.email} />
            )}

            {activeTab === 'logs' && (
              <AdminMonitoringView />
            )}

            {activeTab === 'admin-security' && (
              <AdminAccountSettings />
            )}

            {activeTab === 'emails' && (
              <AdminEmailManager />
            )}

            {activeTab === 'frontend-errors' && (
              <AdminFrontendErrorLogView />
            )}

            {activeTab === 'news' && (
              <AdminNewsManager />
            )}

            {activeTab === 'insights' && (
              <AdminInsightsCMS currentAdminEmail={activeUser.email} onRefreshAll={refreshAll} />
            )}

            {activeTab === 'referrals' && (
              <AdminReferralsTab />
            )}

            {activeTab === 'support' && (
              <AdminSupportTab />
            )}

            {activeTab === 'marketing' && (
              <AdminMarketingTab />
            )}

            {activeTab === 'website' && (
              <AdminWebsiteTab />
            )}

            {activeTab === 'site-settings' && (
              <AdminSiteSettingsTab />
            )}
          </main>
        </div>
      </div>

      {/* Document Proof Preview Modal */}
      {previewProofModalDoc && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-[#E3E8E3] overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-5 border-b border-[#E3E8E3] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#182D2A] text-[#B7E36A] flex items-center justify-center">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#18211F]">{previewProofModalDoc.title}</h3>
                  <p className="text-xs text-[#69736F]">{previewProofModalDoc.user}</p>
                </div>
              </div>
              <button
                onClick={() => setPreviewProofModalDoc(null)}
                className="p-1 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto">
              <div className="flex flex-col gap-4">
                <div className="p-4 rounded-2xl bg-[#F6F7F4] border border-[#E3E8E3]">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[10px] font-bold text-[#27845D] uppercase tracking-wider">
                      {previewProofModalDoc.type}
                    </span>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      {previewProofModalDoc.ref || 'No reference'}
                    </span>
                  </div>
                  <img
                    src={previewProofModalDoc.fileUrl}
                    alt={previewProofModalDoc.fileName}
                    className="w-full max-h-[400px] object-cover rounded-xl border border-[#E3E8E3]"
                    onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
                      (e.target as HTMLImageElement).src = 'https://via.placeholder.com/400x300?text=Document+Preview+Unavailable';
                    }}
                  />
                  <p className="mt-2 text-xs text-[#69736F]">{previewProofModalDoc.fileName}</p>
                </div>
              </div>
            </div>
            <div className="p-4 border-t border-[#E3E8E3] flex justify-end gap-2">
              <button
                onClick={() => setPreviewProofModalDoc(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-[#18211F] bg-white border border-[#E3E8E3] hover:bg-[#F6F7F4] cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};