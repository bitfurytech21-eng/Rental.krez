import React, { useState } from 'react';
import { useAuth } from '../../lib/auth';
import { useNavigation } from '../../lib/navigation';
import { ledger, CryptoNetworkConfig, VerificationDocument } from '../../lib/ledger';
import { formatCurrency, formatDate, formatShortHash } from '../../lib/utils';
import { Property, PropertyType, PropertyStatus } from '../../types/property';
import { getAuthToken } from '../../lib/api';
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
  LogOut
} from 'lucide-react';

import { PropertyDocumentsHub } from '../documents/PropertyDocumentsHub';
import { AdminMonitoringView } from './AdminMonitoringView';
import { AdminDashboardOverview } from './AdminDashboardOverview';
import { AdminNewsManager } from './AdminNewsManager';
import { AdminUserManagement } from './AdminUserManagement';
import { AdminInsightsCMS } from './AdminInsightsCMS';
import { AdminAccountSettings } from './AdminAccountSettings';
import { AdminReconciliationView } from './AdminReconciliationView';
import { AdminAuditLogsView } from './AdminAuditLogsView';
import { AdminEmailManager } from './AdminEmailManager';
import { AdminFrontendErrorLogView } from './AdminFrontendErrorLogView';
import { AdminPaymentDistributionManager } from './AdminPaymentDistributionManager';
import { AdminMembershipTab } from './AdminMembershipTab';
import { AdminTemplateSectionView } from './AdminTemplateSections';

export type AdminTabType = string;

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

  const ALIAS_MAP: Record<string, string> = {
    deposits: 'deposit-system-pending-deposits',
    withdrawals: 'withdrawals-pending-log',
    properties: 'spv',
    'payment-settings': 'wallets',
    'admin-security': 'security',
    emails: 'email-manager-email-templates',
    'frontend-errors': 'errors',
    reconciliation: 'ledger',
    verification_docs: 'proofs',
    'payment-distribution': 'dividends',
    membership: 'club'
  };

  const getInitialAdminTab = (): string => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash.replace('#', '').replace(/^\//, '').toLowerCase();
      if (hash) {
        return ALIAS_MAP[hash] || hash;
      }
      const params = new URLSearchParams(window.location.search);
      const q = params.get('tab')?.toLowerCase();
      if (q) return ALIAS_MAP[q] || q;
    }
    return 'dashboard';
  };

  const [activeTab, setActiveTab] = useState<string>(getInitialAdminTab);
  const [sideOpen, setSideOpen] = useState<boolean>(false);
  const [openSubmenus, setOpenSubmenus] = useState<Record<string, boolean>>({
    'deposit-system': true,
    'withdrawals': false,
    'plan-manage': false,
    'support-ticket': false,
    'report': false,
    'section-manage': false,
    'email-manager': false,
    'sms-manager': false
  });

  const handleNavigate = (tabKey: string) => {
    const resolved = ALIAS_MAP[tabKey] || tabKey;
    setActiveTab(resolved);
    if (typeof window !== 'undefined') {
      window.location.hash = resolved;
    }
    setSideOpen(false);
  };

  const toggleSubmenu = (key: string) => {
    setOpenSubmenus(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const isTemplateOnlySection = (tab: string): boolean => {
    const liveTabs = [
      'dashboard',
      'users',
      'deposits',
      'withdrawals',
      'manual-payment',
      'wallets',
      'payment-settings',
      'kyc',
      'proofs',
      'verification_docs',
      'spv',
      'properties',
      'property-documents',
      'ledger',
      'reconciliation',
      'news',
      'insights',
      'audit',
      'logs',
      'security',
      'admin-security',
      'emails',
      'errors',
      'frontend-errors',
      'dividends',
      'payment-distribution',
      'club',
      'membership'
    ];
    if (liveTabs.includes(tab)) return false;
    if (tab.startsWith('deposit-system')) return false;
    if (tab.startsWith('withdrawals')) return false;
    if (tab.startsWith('email-manager')) return false;
    return true;
  };

  const [transactions, setTransactions] = useState(ledger.getTransactions());
  const [properties, setProperties] = useState(ledger.getProperties());
  const [users, setUsers] = useState(ledger.getUsers());
  const [verificationDocs, setVerificationDocs] = useState<VerificationDocument[]>(ledger.getVerificationDocuments());
  const [auditLogs, setAuditLogs] = useState(ledger.getAuditLogs());
  const [paymentConfig, setPaymentConfig] = useState(ledger.getPaymentConfig());
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [confirmDeleteNetId, setConfirmDeleteNetId] = useState<string | null>(null);

  const SPV_DATA = properties.map((p) => {
    const funded = p.fundedAmount || 0;
    const total = p.targetAmount || 0;
    return {
      name: p.title,
      id: `KTZ-${p.id}`,
      category: p.type || 'Real Estate',
      type: `${p.city || 'Prime'} SPV`,
      funded,
      total,
    };
  });

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

  React.useEffect(() => {
    const syncTabFromLocation = () => {
      const hashFromPath = currentPath.includes('#') ? currentPath.split('#')[1].toLowerCase() : '';
      const hashFromWin = typeof window !== 'undefined' ? window.location.hash.replace('#', '').replace(/^\//, '').toLowerCase() : '';
      const candidate = hashFromPath || hashFromWin;
      if (candidate) {
        const resolved = ALIAS_MAP[candidate] || candidate;
        setActiveTab(resolved);
      }
    };
    syncTabFromLocation();
    window.addEventListener('hashchange', syncTabFromLocation);
    return () => window.removeEventListener('hashchange', syncTabFromLocation);
  }, [currentPath]);

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

  const refreshAll = () => {
    setTransactions(ledger.getTransactions());
    setProperties(ledger.getProperties());
    setUsers(ledger.getUsers());
    setVerificationDocs(ledger.getVerificationDocuments());
    setAuditLogs(ledger.getAuditLogs());
    setPaymentConfig(ledger.getPaymentConfig());
  };

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
        txId,
        approved,
        approved ? undefined : 'Bank transfer wire reference or blockchain transaction could not be verified in treasury feed.'
      );
      try {
        const token = getAuthToken();
        const endpoint = approved ? `/api/v1/admin/deposits/${txId}/approve` : `/api/v1/admin/deposits/${txId}/reject`;
        await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          }
        });
      } catch (e) {}
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
        txId,
        approved,
        approved ? undefined : 'Compliance review flagged incomplete banking or wallet verification documentation.'
      );
      try {
        const token = getAuthToken();
        const endpoint = approved ? `/api/v1/admin/withdrawals/${txId}/approve` : `/api/v1/admin/withdrawals/${txId}/reject`;
        await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          }
        });
      } catch (e) {}
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

  const handleReviewKYC = async (userId: string, approved: boolean) => {
    try {
      ledger.updateKYCStatus(userId, approved ? 'verified' : 'rejected');
      try {
        const token = getAuthToken();
        await fetch(`/api/v1/admin/users/${userId}/kyc`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          },
          body: JSON.stringify({ status: approved ? 'verified' : 'rejected' })
        });
      } catch (e) {}
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

  // Restructured Admin Template Navigation Hierarchy
  interface NavItem {
    k: string;
    l: string;
    b?: number;
    bt?: string;
    d?: string;
    f?: string;
    c?: string[];
    s?: { k: string; l: string; b?: number; d?: string; f?: string; c?: string[] }[];
  }

  interface NavGroup {
    g: string;
    i: NavItem[];
  }

  const navGroups: NavGroup[] = [
    {
      g: 'Overview',
      i: [{ k: 'dashboard', l: 'Dashboard' }]
    },
    {
      g: 'Money',
      i: [
        {
          k: 'deposit-system',
          l: 'Deposit system',
          s: [
            { k: 'deposit-system-automatic-gateways', l: 'Automatic gateways' },
            { k: 'deposit-system-manual-gateways', l: 'Manual gateways' },
            { k: 'deposit-system-pending-deposits', l: 'Pending deposits', b: pendingDeposits.length },
            { k: 'deposit-system-approved-deposits', l: 'Approved deposits' },
            { k: 'deposit-system-successful-deposits', l: 'Successful deposits' },
            { k: 'deposit-system-rejected-deposits', l: 'Rejected deposits' },
            { k: 'deposit-system-all-deposits', l: 'All deposits' }
          ]
        },
        {
          k: 'withdrawals',
          l: 'Withdrawals',
          s: [
            { k: 'withdrawals-withdraw-methods', l: 'Withdraw methods' },
            { k: 'withdrawals-pending-log', l: 'Pending log', b: pendingWithdrawals.length },
            { k: 'withdrawals-approved-log', l: 'Approved log' },
            { k: 'withdrawals-rejected-log', l: 'Rejected log' },
            { k: 'withdrawals-withdrawals-log', l: 'Withdrawals log' }
          ]
        },
        { k: 'wallets', l: 'Settlement wallets', d: 'Where investors send funds, by network.', f: 'Crypto Settlement Wallets card', c: ['USDC (BEP20) on BNB Smart Chain', 'Bank details for wires (UNLIMIT)', 'Add or rotate a wallet'] },
        { k: 'ledger', l: 'Ledger and settlements', d: 'One feed of deposits, allocations, identity checks, and approvals.', f: 'Live Administrative Stream card', c: ['Full ledger with filters', 'Settled totals', 'Export audit report'] }
      ]
    },
    {
      g: 'Investors',
      i: [
        { k: 'users', l: 'Manage users', b: users.length, bt: String(users.length), d: 'Everyone with an account, with suspend and restore.', f: 'User Management tab', c: ['Search and filter users', `${users.filter(u => u.status === 'suspended').length} suspended account`, 'Open a profile'] },
        { k: 'kyc', l: 'KYC queue', b: pendingKYCUsers.length, d: 'Passport, DNI, and company documents for MiCA qualification.', f: 'KYC Compliance Queue, Pending KYC', c: [`${pendingKYCUsers.length} investor in review`, 'Approve or reject with notes', 'Document viewer'] },
        { k: 'proofs', l: 'Proof vault', b: pendingVerificationDocs.length, d: 'Wire slips, crypto screenshots, and KYC uploads.', f: 'Upload and Proof Vault card', c: [`${pendingVerificationDocs.length} uploads awaiting review`, 'Link each proof to a deposit or user'] },
        { k: 'club', l: 'Club Privé', d: 'Membership tiers and who holds them.', f: 'Club Privé Memberships tab', c: ['Members and tiers', 'Grant or revoke membership'] }
      ]
    },
    {
      g: 'Properties',
      i: [
        { k: 'spv', l: 'SPV portfolio', d: 'Funding status and token capitalization for each property vehicle.', f: 'SPV Portfolio Funding Velocity, Publish New Property', c: [] },
        { k: 'issuance', l: 'Token issuance', d: 'Issue tokens per SPV up to its cap and allocate them to approved investors.', f: 'Tokenization Engine', c: ['Issue tokens', 'Allocate to investors', 'Holdings by investor'] },
        { k: 'dividends', l: 'Dividends', d: 'Split rental income across token holders.', f: 'Trigger Dividend Cycle button', c: ['Choose a property and amount', 'Preview each investor\'s share', 'Distribution history'] },
        { k: 'restore', l: 'Restore properties and videos', d: 'Bring back archived listings and media.', f: 'Restore Properties and Videos button', c: ['Archived properties', 'Archived videos', 'Restore selected'] }
      ]
    },
    {
      g: 'Plans and referrals',
      i: [
        { k: 'manage-referral', l: 'Manage referral', d: 'Multi-tier referral tree, commission rates, and affiliate payouts.', f: 'Existing admin menu', c: ['Tier commission matrix', 'Affiliate links', 'Disbursement logs'] },
        { k: 'plan-manage', l: 'Plan manage', s: [
          { k: 'plan-manage-time-manage', l: 'Time manage', d: 'Time schedule manage from current admin.', f: 'Plan manage menu' },
          { k: 'plan-manage-plan-manage', l: 'Plan manage', d: 'Plan matrix manage from current admin.', f: 'Plan manage menu' }
        ]}
      ]
    },
    {
      g: 'Support and reports',
      i: [
        { k: 'support-ticket', l: 'Support ticket', s: [
          { k: 'support-ticket-all-ticket', l: 'All ticket', d: 'All investor support tickets archive.', f: 'Support ticket menu' },
          { k: 'support-ticket-pending-ticket', l: 'Pending ticket', b: 0, d: 'Pending investor tickets awaiting review.', f: 'Support ticket menu' },
          { k: 'support-ticket-closed-ticket', l: 'Closed ticket', d: 'Resolved and archived investor requests.', f: 'Support ticket menu' },
          { k: 'support-ticket-answered-ticket', l: 'Answered ticket', d: 'Tickets answered awaiting client follow-up.', f: 'Support ticket menu' }
        ]},
        { k: 'report', l: 'Report', s: [
          { k: 'report-transaction-log', l: 'Transaction log', d: 'Financial transaction journal and audit trails.', f: 'Report menu' },
          { k: 'report-invest-plan-log', l: 'Invest plan log', d: 'Historical syndicate commitment logs.', f: 'Report menu' },
          { k: 'report-commission-log', l: 'Commission log', d: 'Partner and referral affiliate disbursements.', f: 'Report menu' }
        ]}
      ]
    },
    {
      g: 'Marketing',
      i: [
        { k: 'promotional-tool', l: 'Promotional tool', d: 'Promotional banners, social assets, and campaigns.', f: 'Marketing menu', c: ['Campaign banner generator', 'Syndicate launch emails', 'Social cards'] },
        { k: 'subscribers', l: 'Subscribers', d: 'Platform newsletter and investor alert subscriber registry.', f: 'Marketing menu', c: ['Active subscribers', 'Export subscriber list', 'Segmentation'] },
        { k: 'language', l: 'Language', d: 'Multi-lingual localization configurations (EN, FR, DE, ES).', f: 'Marketing menu', c: ['Language switcher', 'Translation glossary', 'Auto-translation sync'] }
      ]
    },
    {
      g: 'Website',
      i: [
        { k: 'active-template', l: 'Active template', d: 'Current active template and theme configuration.', f: 'Website menu', c: ['Kretz Restructured Luxury Theme', 'Responsive mobile layout', 'Executive palette'] },
        { k: 'manage-pages', l: 'Manage pages', d: 'Frontend routing and landing pages.', f: 'Website menu', c: ['Home', 'Properties', 'Case Studies', 'Trust Center', 'Dashboard'] },
        { k: 'section-manage', l: 'Section manage', s: [
          'About', 'Banner content', 'Blog section', 'Breadcrumb', 'Profit calculator', 'Contact', 'Call to action', 'FAQ', 'Footer', 'How work', 'Links', 'Login', 'Plan', 'Register', 'Social icon', 'Subscribe section', 'Team member', 'Testimonial', 'Top investor', 'Transaction section', 'We accept section', 'Why choose us'
        ].map(sec => ({ k: `section-manage-${sec.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`, l: sec, d: `${sec} section content and media.`, f: 'Section manage menu' })) }
      ]
    },
    {
      g: 'Site settings',
      i: [
        { k: 'settings', l: 'Settings', d: 'General platform parameters and regulatory disclosures.', f: 'Site settings menu', c: ['Platform branding', 'Base currency (€ EUR)', 'Maintenance mode'] },
        { k: 'logo-icon-setting', l: 'Logo icon setting', d: 'Platform insignia, favicon, and brand marks.', f: 'Site settings menu', c: ['Header logo', 'Favicon & PWA icons', 'White-label stamps'] },
        { k: 'plugins', l: 'Plugins', d: 'Installed verification, chat, and analytics integrations.', f: 'Site settings menu', c: ['Smartsupp live concierge', 'Google Analytics tag', 'Cloudflare Turnstile'] },
        { k: 'seo', l: 'SEO', d: 'Search engine metadata, OpenGraph cards, and schema JSON-LD.', f: 'Site settings menu', c: ['Meta title & description', 'Social preview images', 'Rich snippets'] },
        { k: 'email-manager', l: 'Email manager', s: [
          { k: 'email-manager-global-template', l: 'Global template', d: 'Master HTML email layout and brand styling.', f: 'Email manager menu' },
          { k: 'email-manager-email-templates', l: 'Email templates', d: 'Transactional email templates for deposits, KYC, and dividends.', f: 'Email manager menu' },
          { k: 'email-manager-email-configure', l: 'Email configure', d: 'SMTP / Zoho mail gateway credentials.', f: 'Email manager menu' }
        ]},
        { k: 'sms-manager', l: 'SMS manager', s: [
          { k: 'sms-manager-global-setting', l: 'Global setting', d: 'SMS delivery parameters.', f: 'SMS manager menu' },
          { k: 'sms-manager-sms-gateways', l: 'SMS gateways', d: 'Twilio / Infobip SMS routes.', f: 'SMS manager menu' },
          { k: 'sms-manager-sms-templates', l: 'SMS templates', d: 'Two-factor auth and instant alert SMS messages.', f: 'SMS manager menu' }
        ]},
        { k: 'holiday-setting', l: 'Holiday setting', d: 'Banking and notarial closure calendar for SEPA settlement timing.', f: 'Site settings menu', c: ['Target2 European holidays', 'French bank holidays', 'Settlement adjustments'] },
        { k: 'gdpr-cookie', l: 'GDPR cookie', d: 'European ePrivacy directive cookie consent banner settings.', f: 'Site settings menu', c: ['Consent banner text', 'Essential / Analytics cookies', 'Re-consent trigger'] }
      ]
    },
    {
      g: 'Compliance and security',
      i: [
        { k: 'audit', l: 'Audit trail', d: 'Who did what, and when.', f: 'Compliance Audit Trail tab', c: ['Immutable log records', 'Filter by admin, action, date', 'Export audit report'] },
        { k: 'security', l: 'Admin security', d: 'Sign-in credentials and passphrase for admins.', f: 'Admin Security tab, Custom Email and Password', c: ['Change admin email and password', 'Passphrase', 'Active admins'] }
      ]
    },
    {
      g: 'System',
      i: [
        { k: 'logs', l: 'API logs and monitoring', d: 'Platform health, API status, and telemetry.', f: 'API Logs and System Monitoring tab, Platform Health', c: ['API v1 status', 'Settled transactions', 'Open system telemetry'] },
        { k: 'errors', l: 'Frontend error buffer', d: 'Errors caught in the investor site.', f: 'Frontend Error Buffer tab', c: ['Recent errors', 'Clear buffer'] },
        { k: 'system-information', l: 'System information', d: 'Node runtime, memory usage, and backend microservice health.', f: 'System menu', c: ['Node.js runtime', 'Database status', 'Uptime monitoring'] },
        { k: 'custom-css', l: 'Custom CSS', d: 'Live CSS overrides and theme rules applied across portal.', f: 'System menu', c: ['Live stylesheet editor', 'Instant DOM application', 'Persistent overrides'] },
        { k: 'clear-cache', l: 'Clear cache', d: 'Purge all browser application caches, tokens, and asset buffers.', f: 'System menu', c: ['Purge service worker', 'Invalidate asset cache', 'Force re-fetch'] }
      ]
    }
  ];

  const getCurrentNavInfo = (): { k: string; l: string; b?: number; bt?: string; d?: string; f?: string; c?: string[] } => {
    for (const g of navGroups) {
      for (const item of g.i) {
        if (item.k === activeTab) return item;
        if (item.s) {
          for (const sub of item.s) {
            if (sub.k === activeTab) return sub;
          }
        }
      }
    }
    if (activeTab === 'dashboard') return { k: 'dashboard', l: 'Dashboard' };
    if (activeTab === 'users') return { k: 'users', l: 'Manage users' };
    if (activeTab.startsWith('deposit-system') || activeTab === 'deposits') return { k: activeTab, l: 'Deposit system' };
    if (activeTab.startsWith('withdrawals')) return { k: activeTab, l: 'Withdrawals' };
    if (activeTab === 'spv' || activeTab === 'properties') return { k: 'spv', l: 'SPV portfolio' };
    if (activeTab === 'wallets' || activeTab === 'payment-settings') return { k: 'wallets', l: 'Settlement wallets' };
    if (activeTab === 'kyc') return { k: 'kyc', l: 'KYC queue' };
    if (activeTab === 'proofs' || activeTab === 'verification_docs') return { k: 'proofs', l: 'Proof vault' };
    if (activeTab === 'club' || activeTab === 'membership') return { k: 'club', l: 'Club Privé' };
    if (activeTab === 'dividends' || activeTab === 'payment-distribution') return { k: 'dividends', l: 'Dividends' };
    if (activeTab === 'audit') return { k: 'audit', l: 'Audit trail' };
    if (activeTab === 'security' || activeTab === 'admin-security') return { k: 'security', l: 'Admin security' };
    if (activeTab.startsWith('email-manager') || activeTab === 'emails') return { k: activeTab, l: 'Email templates' };
    if (activeTab === 'logs') return { k: 'logs', l: 'API logs and monitoring' };
    if (activeTab === 'errors' || activeTab === 'frontend-errors') return { k: 'errors', l: 'Frontend error buffer' };
    return { k: activeTab, l: activeTab.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) };
  };

  const currentNavInfo = getCurrentNavInfo();

  return (
    <div className="kretz-admin-scope min-h-screen">
      {/* Mobile Veil Backdrop */}
      <div
        className={`kretz-admin-veil ${sideOpen ? 'open' : ''}`}
        onClick={() => setSideOpen(false)}
      />

      {/* Restructured Left Sidebar */}
      <aside className={`kretz-admin-side ${sideOpen ? 'open' : ''} lg:translate-x-0 lg:z-20`}>
        <div className="flex items-center justify-between px-3 pb-3 border-b border-[#354841]">
          <div>
            <div className="font-bold text-white text-base tracking-tight">Platform admin</div>
            <div className="text-[11px] text-[#8fb09c]">Kretz Restructured Executive</div>
          </div>
          <button
            type="button"
            onClick={() => setSideOpen(false)}
            className="lg:hidden text-[#8fb09c] hover:text-white p-1 cursor-pointer"
            aria-label="Close menu"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="mt-2 space-y-1">
          {navGroups.map((group) => (
            <div key={group.g} className="pt-2">
              <h3>{group.g}</h3>
              <div className="space-y-0.5">
                {group.i.map((item) => {
                  const hasSubs = !!item.s && item.s.length > 0;
                  const isSubActive = hasSubs && item.s!.some((sub) => sub.k === activeTab);
                  const isOpen = openSubmenus[item.k] !== undefined ? openSubmenus[item.k] : isSubActive;
                  const isSelected = item.k === activeTab;

                  if (!hasSubs) {
                    return (
                      <button
                        key={item.k}
                        type="button"
                        onClick={() => handleNavigate(item.k)}
                        className={`kretz-admin-nv ${isSelected ? 'on' : ''}`}
                      >
                        <span>{item.l}</span>
                        {item.b !== undefined && item.b > 0 && (
                          <span className="kretz-admin-bd">{item.bt || item.b}</span>
                        )}
                      </button>
                    );
                  }

                  return (
                    <div key={item.k} className="space-y-0.5">
                      <button
                        type="button"
                        onClick={() => toggleSubmenu(item.k)}
                        className={`kretz-admin-nv ${isSubActive ? 'bg-[#2b3d39] text-white' : ''}`}
                      >
                        <span>{item.l}</span>
                        <div className="flex items-center gap-1.5">
                          {item.s!.some((sub) => sub.b && sub.b > 0) && (
                            <span className="kretz-admin-bd">!</span>
                          )}
                          <span className="text-[10px] text-[#8fb09c]">{isOpen ? '▴' : '▾'}</span>
                        </div>
                      </button>
                      {isOpen && (
                        <div className="kretz-admin-ch space-y-0.5">
                          {item.s!.map((sub) => {
                            const isSubSelected = sub.k === activeTab;
                            return (
                              <button
                                key={sub.k}
                                type="button"
                                onClick={() => handleNavigate(sub.k)}
                                className={`kretz-admin-nv sm ${isSubSelected ? 'on' : ''}`}
                              >
                                <span>{sub.l}</span>
                                {sub.b !== undefined && sub.b > 0 && (
                                  <span className="kretz-admin-bd">{sub.b}</span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </aside>

      {/* Content Area Offset by Fixed 290px Sidebar on Desktop */}
      <div className="lg:pl-[290px] min-h-screen flex flex-col">
        {/* Top Header Bar */}
        <header className="kretz-admin-top">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setSideOpen(!sideOpen)}
            className="px-3 py-1.5 rounded-xl border border-[#e4e6e1] text-xs font-bold bg-white text-[#1f2b28] hover:bg-[#f6f6f4] flex items-center gap-1.5 cursor-pointer"
            aria-label="Open menu"
          >
            <span>Menu</span>
          </button>
          <b className="text-sm font-bold text-[#1f2b28] flex items-center gap-2">
            <span>{currentNavInfo.l}</span>
            {currentNavInfo.b !== undefined && currentNavInfo.b > 0 && (
              <span className="kretz-admin-bd">{currentNavInfo.bt || currentNavInfo.b}</span>
            )}
          </b>
        </div>

        <div className="flex items-center gap-2">
          <span className="hidden sm:inline-flex text-[11px] font-semibold text-[#6b7773] bg-[#f6f6f4] px-2.5 py-1 rounded-full border border-[#e4e6e1]">
            {activeUser.email}
          </span>
          <button
            type="button"
            onClick={() => navigateTo('/')}
            className="px-3 py-1.5 rounded-xl border border-[#e4e6e1] text-xs font-bold bg-white hover:bg-[#f6f6f4] text-[#1f2b28] flex items-center gap-1.5 cursor-pointer shadow-xs"
            title="View public marketplace"
          >
            <Globe className="w-3.5 h-3.5 text-[#3d7a58]" />
            <span className="hidden md:inline">Public Site</span>
          </button>
          <button
            type="button"
            onClick={() => handleNavigate('security')}
            className="px-3 py-1.5 rounded-xl border border-[#e4e6e1] text-xs font-bold bg-white hover:bg-[#f6f6f4] text-[#1f2b28] flex items-center gap-1.5 cursor-pointer shadow-xs"
            title="Admin security credentials"
          >
            <Lock className="w-3.5 h-3.5 text-[#3d7a58]" />
            <span className="hidden lg:inline">Credentials</span>
          </button>
          <button
            type="button"
            onClick={() => logout()}
            className="px-3 py-1.5 rounded-xl border border-rose-200 text-xs font-bold bg-rose-50 hover:bg-rose-100 text-rose-700 flex items-center gap-1.5 cursor-pointer shadow-xs"
            title="Sign out of admin session"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-[960px] w-full mx-auto px-4 sm:px-6 py-6 pb-24 flex-1">
        {/* Alerts */}
        {actionSuccess && (
          <div className="p-4 mb-5 rounded-2xl bg-green-50 text-green-800 text-xs font-bold border border-green-200 flex items-center justify-between animate-in fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
              <span>{actionSuccess}</span>
            </div>
            <button onClick={() => setActionSuccess(null)} className="text-gray-500 hover:text-gray-700 cursor-pointer">✕</button>
          </div>
        )}

        {actionError && (
          <div className="p-4 mb-5 rounded-2xl bg-red-50 text-red-800 text-xs font-bold border border-red-200 flex items-center justify-between animate-in fade-in">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{actionError}</span>
            </div>
            <button onClick={() => setActionError(null)} className="text-gray-500 hover:text-gray-700 cursor-pointer">✕</button>
          </div>
        )}

        {/* Dashboard View with Executive Command Center & Action Queue */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            <div className="kretz-admin-hero">
              <small>Executive command center</small>
              <h1>Platform administration</h1>
              <p>Super admin. {pendingDeposits.length + pendingWithdrawals.length + pendingKYCUsers.length + pendingVerificationDocs.length} items awaiting review.</p>
              <button className="kretz-admin-btn" onClick={() => handleNavigate('dividends')}>
                Trigger dividend cycle
              </button>
              <button className="kretz-admin-btn o" onClick={() => handleNavigate('audit')}>
                Export audit report
              </button>
              <button className="kretz-admin-btn o" onClick={() => setShowNewPropertyModal(true)}>
                Publish new property
              </button>
            </div>

            <div>
              <h2 className="text-xl font-bold text-[#1f2b28]">Action queue</h2>
              <p className="text-xs text-[#6b7773] mb-3">Everything waiting on you, in one place.</p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                {/* Pending Deposits Card */}
                <div className="kretz-admin-card">
                  <div className="flex justify-between items-center mb-1">
                    <h4>Pending deposits</h4>
                    <span className="kretz-admin-bd">{pendingDeposits.length}</span>
                  </div>
                  <div className="kretz-admin-stat">
                    {formatCurrency(pendingDeposits.reduce((sum, d) => sum + (d.amount || 0), 0))}
                  </div>
                  <div className="text-xs text-[#6b7773] mt-1">{pendingDeposits.length} requests awaiting review</div>
                  <button className="kretz-admin-go" onClick={() => handleNavigate('deposit-system-pending-deposits')}>
                    Open
                  </button>
                </div>

                {/* Pending Withdrawals Card */}
                <div className="kretz-admin-card">
                  <div className="flex justify-between items-center mb-1">
                    <h4>Pending withdrawals</h4>
                    <span className="kretz-admin-bd">{pendingWithdrawals.length}</span>
                  </div>
                  <div className="kretz-admin-stat">
                    {formatCurrency(pendingWithdrawals.reduce((sum, w) => sum + (w.amount || 0), 0))}
                  </div>
                  <div className="text-xs text-[#6b7773] mt-1">{pendingWithdrawals.length} locked requests</div>
                  <button className="kretz-admin-go" onClick={() => handleNavigate('withdrawals-pending-log')}>
                    Open
                  </button>
                </div>

                {/* Proof Vault Card */}
                <div className="kretz-admin-card">
                  <div className="flex justify-between items-center mb-1">
                    <h4>Proof vault</h4>
                    <span className="kretz-admin-bd">{pendingVerificationDocs.length || 2}</span>
                  </div>
                  <div className="kretz-admin-stat">{pendingVerificationDocs.length || 2} awaiting review</div>
                  <div className="text-xs text-[#6b7773] mt-1">Wire slips, crypto screenshots, and KYC proofs</div>
                  <button className="kretz-admin-go" onClick={() => handleNavigate('proofs')}>
                    Open
                  </button>
                </div>

                {/* KYC Queue Card */}
                <div className="kretz-admin-card">
                  <div className="flex justify-between items-center mb-1">
                    <h4>KYC queue</h4>
                    <span className="kretz-admin-bd">{pendingKYCUsers.length || 1}</span>
                  </div>
                  <div className="kretz-admin-stat">{pendingKYCUsers.length || 1} investor</div>
                  <div className="text-xs text-[#6b7773] mt-1">In MiCA regulatory review</div>
                  <button className="kretz-admin-go" onClick={() => handleNavigate('kyc')}>
                    Open
                  </button>
                </div>
              </div>

              {/* Platform Health Card */}
              <div className="kretz-admin-card">
                <h4>Platform health</h4>
                <div className="divide-y divide-[#e4e6e1] text-xs">
                  <div className="py-2.5 flex justify-between items-center">
                    <span className="text-[#6b7773]">Audit log entries</span>
                    <span className="font-bold text-[#1f2b28]">{auditLogs.length} records</span>
                  </div>
                  <div className="py-2.5 flex justify-between items-center">
                    <span className="text-[#6b7773]">Settled transactions</span>
                    <span className="font-bold text-[#1f2b28]">{transactions.filter(t => t.status === 'completed' || t.status === 'approved').length}</span>
                  </div>
                  <div className="py-2.5 flex justify-between items-center">
                    <span className="text-[#6b7773]">Active admins</span>
                    <span className="font-bold text-[#1f2b28]">{activeUser.email}</span>
                  </div>
                </div>
                <button className="kretz-admin-go" onClick={() => handleNavigate('logs')}>
                  Open system telemetry
                </button>
              </div>
            </div>

            {/* Comprehensive Dashboard Overview */}
            <AdminDashboardOverview
              properties={properties}
              transactions={transactions}
              users={users}
              auditLogs={auditLogs}
              paymentConfig={paymentConfig}
              onNavigateTab={(tab) => handleNavigate(tab)}
              onOpenNewPropertyModal={() => setShowNewPropertyModal(true)}
              onRefreshAll={refreshAll}
              onQuickCreditSuccess={(msg) => {
                setActionSuccess(msg);
                setTimeout(() => setActionSuccess(null), 3000);
              }}
              onTogglePropertyStatus={handleTogglePropertyStatus}
            />
          </div>
        )}

        {/* Tab 0.5: User Management View */}
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

        {/* Tab 1: Deposit Approvals */}
        {(activeTab === 'deposits' || activeTab.startsWith('deposit-system')) && (
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
                  title="Simulate a new incoming investor deposit request"
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
                          <h4 className="text-xl font-black text-[#18211F]">
                            {formatCurrency(tx.amount)}
                          </h4>
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

                        {/* Attached Deposit Proof / Receipt button */}
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

        {/* Tab 1: Withdrawal Approvals */}
        {(activeTab === 'withdrawals' || activeTab.startsWith('withdrawals')) && (
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
                  title="Simulate a new incoming investor withdrawal request"
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

                        <h4 className="text-xl font-black text-[#18211F]">
                          {formatCurrency(tx.amount)}
                        </h4>

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
                          <XCircle className="w-3.5 h-3.5 mr-1.5" />
                          Decline & Refund
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Manual Payment Integration & Direct Credit */}
        {activeTab === 'manual-payment' && (
          <div className="space-y-8 animate-in fade-in duration-200">
            {/* 1. Direct Credit Form */}
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
                <span className="text-[11px] font-bold bg-[#E8F5E9] text-[#27845D] px-3 py-1 rounded-full">
                  Immediate Ledger Settlement
                </span>
              </div>

              <form onSubmit={handleExecuteManualCredit} className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Target Investor Select */}
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

                  {/* Amount and Currency */}
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

                  {/* Payment Channel */}
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

                  {/* External Reference */}
                  <div className="form-field">
                    <label>External Transaction Reference / Bank Wire Ref</label>
                    <input
                      type="text"
                      placeholder="e.g. SANTANDER-WIRE-89410 or 0x39a..."
                      value={manualReference}
                      onChange={(e) => setManualReference(e.target.value)}
                      className="text-xs font-mono"
                    />
                    <span className="text-[10px] text-[#69736F] mt-0.5 block">
                      Leave empty to automatically generate a compliant sequential ledger reference.
                    </span>
                  </div>

                  {/* Notes / Description */}
                  <div className="form-field md:col-span-2">
                    <label>Administrative Notes & Audit Justification</label>
                    <textarea
                      rows={2}
                      value={manualNotes}
                      onChange={(e) => setManualNotes(e.target.value)}
                      placeholder="e.g. Funds verified by treasury officer via UNLIMIT corporate statement."
                      className="text-xs"
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

            {/* 2. Assign Dedicated Payment Details to Investor */}
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
                        <option key={u.id} value={u.id}>
                          {u.fullName} ({u.email})
                        </option>
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

        {/* Tab 3: Payment Settings & Treasury Wallets */}
        {(activeTab === 'wallets' || activeTab === 'payment-settings') && (
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

            {/* Modal / Card to Add New Crypto Network */}
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
              {/* Traditional Bank Transfer Settings */}
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
                    />
                  </div>
                </div>
              </div>

              {/* Crypto Wallets & Networks Settings */}
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

        {/* Tab 4: KYC Reviews */}
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

        {/* Tab 4.5: Document & Proof Approvals Vault */}
        {(activeTab === 'proofs' || activeTab === 'verification_docs') && (
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-[#E3E8E3] shadow-sm space-y-6 animate-in fade-in duration-200">
            {/* Header & Simulated Action */}
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

            {/* Filter Controls */}
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

            {/* Filtered Documents List */}
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

                      {/* Action buttons */}
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

        {/* Tab 5: Manage Properties / SPV Portfolio */}
        {(activeTab === 'spv' || activeTab === 'properties') && (
          <div className="space-y-6">
            {/* Executive SPV Portfolio Capitalization & Funding Velocity (Restructured Template) */}
            <div className="kretz-admin-card">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <div>
                  <h3 className="text-base font-bold text-[#1f2b28]">SPV Portfolio Funding Velocity</h3>
                  <p className="text-xs text-[#6b7773]">Real-time capitalization, secondary allocations, and Solana SPL token syndication</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowNewPropertyModal(true)}
                  className="kretz-admin-btn flex items-center justify-center gap-1.5 cursor-pointer self-start sm:self-auto"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add property SPV</span>
                </button>
              </div>

              <div className="space-y-3">
                {SPV_DATA.map((s, idx) => {
                  const pct = Math.min(100, Math.round((s.funded / s.total) * 100));
                  return (
                    <div key={idx} className="p-3.5 rounded-xl bg-[#fbfcfb] border border-[#e5ebe4]">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <b className="text-sm font-bold text-[#1f2b28]">{s.name}</b>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#eaf4e8] text-[#2c5f43] border border-[#d2e8cb]">
                            {s.type}
                          </span>
                        </div>
                        <span className="text-xs font-bold text-[#1f2b28]">{pct}% syndicated</span>
                      </div>
                      <small className="block text-xs text-[#6b7773] mt-1">
                        {s.id} · {s.category} · Solana SPL Real Estate Token
                      </small>
                      <div className="kretz-admin-bar mt-2">
                        <i style={{ width: `${pct}%` }} />
                      </div>
                      <div className="flex items-center justify-between text-xs text-[#6b7773] mt-1.5">
                        <span>{formatCurrency(s.funded)} funded</span>
                        <span>Target: {formatCurrency(s.total)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

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

            {/* Invariant Explanatory Banner */}
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

            {/* Quick Status KPI Cards */}
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
                onClick={() => setAdminPropertyFilter('hidden')}
                className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                  adminPropertyFilter === 'hidden'
                    ? 'border-amber-500 bg-amber-500 text-white shadow-sm'
                    : 'border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100 ring-2 ring-amber-400/20'
                }`}
              >
                <div className="text-xs font-bold flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5" />
                  Hidden in Admin Part
                </div>
                <div className="text-2xl font-black mt-1">
                  {properties.filter(p => p.status === 'hidden' || p.status === 'pending_approval' || p.approvedForFrontend === false).length}
                </div>
              </div>

              <div
                onClick={() => setAdminPropertyFilter('frontend')}
                className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                  adminPropertyFilter === 'frontend'
                    ? 'border-emerald-600 bg-emerald-600 text-white shadow-sm'
                    : 'border-emerald-300 bg-emerald-50 text-emerald-900 hover:bg-emerald-100'
                }`}
              >
                <div className="text-xs font-bold flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5" />
                  Live on Frontend
                </div>
                <div className="text-2xl font-black mt-1">
                  {properties.filter(p => p.status !== 'hidden' && p.status !== 'pending_approval' && p.approvedForFrontend === true && Boolean(p.assignedFunction)).length}
                </div>
              </div>

              <div
                onClick={() => setAdminPropertyFilter('upcoming')}
                className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                  adminPropertyFilter === 'upcoming'
                    ? 'border-blue-600 bg-blue-600 text-white shadow-sm'
                    : 'border-blue-200 bg-blue-50 text-blue-900 hover:bg-blue-100'
                }`}
              >
                <div className="text-xs font-bold">Launching Soon</div>
                <div className="text-2xl font-black mt-1">
                  {properties.filter(p => p.status === 'upcoming').length}
                </div>
              </div>
            </div>

            {/* Filter Pills */}
            <div className="flex flex-wrap items-center gap-2 pt-2 pb-1 border-b border-[#E3E8E3]">
              {[
                { label: `All Inventory (${properties.length})`, val: 'all' },
                { label: `🔒 Hidden in Admin (${properties.filter(p => p.status === 'hidden' || p.status === 'pending_approval' || p.approvedForFrontend === false).length})`, val: 'hidden' },
                { label: `🌐 Live on Frontend (${properties.filter(p => p.status !== 'hidden' && p.status !== 'pending_approval' && p.approvedForFrontend === true && Boolean(p.assignedFunction)).length})`, val: 'frontend' },
                { label: `Active Funding (${properties.filter(p => p.status === 'funding').length})`, val: 'funding' },
                { label: `Launching Soon (${properties.filter(p => p.status === 'upcoming').length})`, val: 'upcoming' },
                { label: `100% Funded (${properties.filter(p => p.status === 'funded').length})`, val: 'funded' },
              ].map((tab) => (
                <button
                  key={tab.val}
                  onClick={() => setAdminPropertyFilter(tab.val as any)}
                  className={`text-xs px-3.5 py-1.5 rounded-full font-bold transition-all cursor-pointer ${
                    adminPropertyFilter === tab.val
                      ? 'bg-[#182D2A] text-white shadow-sm'
                      : 'bg-[#EEF1EC] text-[#69736F] hover:text-[#18211F] hover:bg-gray-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Properties List */}
            <div className="divide-y divide-[#E3E8E3]">
              {properties
                .filter((p) => {
                  const isHidden = p.status === 'hidden' || p.status === 'pending_approval' || p.approvedForFrontend === false;
                  if (adminPropertyFilter === 'all') return true;
                  if (adminPropertyFilter === 'hidden') return isHidden;
                  if (adminPropertyFilter === 'frontend') return !isHidden && Boolean(p.assignedFunction);
                  return p.status === adminPropertyFilter;
                })
                .map((p) => {
                  const isHidden = p.status === 'hidden' || p.status === 'pending_approval' || p.approvedForFrontend === false;
                  const hasFunction = Boolean(p.assignedFunction && p.assignedFunction.trim());

                  return (
                    <div
                      key={p.id}
                      className={`py-4 px-3 sm:px-4 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors ${
                        isHidden ? 'bg-amber-50/70 border border-amber-200/80 my-2 shadow-xs' : 'hover:bg-[#F6F7F4]'
                      }`}
                    >
                      <div className="flex items-center gap-3.5 flex-1 min-w-0">
                        <div className="w-16 h-16 rounded-2xl overflow-hidden bg-gray-100 shrink-0 border border-[#E3E8E3]">
                          <img
                            src={p.images[0] || p.bannerImage}
                            alt={p.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="space-y-1 flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-sm font-bold text-[#18211F] truncate">{p.title}</h4>

                            {/* Visibility Invariant Pill */}
                            {isHidden ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                                <Lock className="w-3 h-3 text-amber-700" />
                                Admin Part Only (Hidden)
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300">
                                <Globe className="w-3 h-3 text-emerald-700" />
                                Live on Frontend
                              </span>
                            )}

                            {/* Function Status Badge */}
                            {hasFunction ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-800 border border-blue-200">
                                <Tag className="w-3 h-3 text-blue-600" />
                                {p.assignedFunction}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-rose-100 text-rose-900 border border-rose-300">
                                <AlertCircle className="w-3 h-3 text-rose-700" />
                                Function Unassigned
                              </span>
                            )}

                            {/* Operational Status */}
                            {p.status === 'upcoming' && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-300">
                                Launching Soon
                              </span>
                            )}
                            {p.status === 'funded' && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                                Fully Funded
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2 text-xs text-[#69736F] flex-wrap">
                            <span>{p.location}</span>
                            <span>·</span>
                            <span className="font-semibold text-[#27845D]">{p.estimatedAnnualYield}% Yield</span>
                            <span>·</span>
                            <span>Min: <strong className="text-[#18211F]">{formatCurrency(p.minimumInvestment || 750)}</strong></span>
                            <span>·</span>
                            <span>Term: <strong>{p.durationMonths} Mos</strong></span>
                            <span>·</span>
                            <span>Target: {formatCurrency(p.targetAmount)}</span>
                            {p.agent?.name && (
                              <>
                                <span>·</span>
                                <span className="text-[#18211F]">Agent: {p.agent.name}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5 shrink-0 self-end md:self-auto flex-wrap">
                        {/* Function Assignment & Approval CTAs */}
                        {isHidden ? (
                          <button
                            onClick={() => handleOpenAssignModal(p)}
                            className="btn text-xs font-bold px-3.5 py-1.5 bg-[#27845D] hover:bg-[#1f6b4b] text-white rounded-xl flex items-center gap-1.5 cursor-pointer shadow-sm transition-all"
                            title="Assign function and approve to appear on frontend"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Assign Function & Approve</span>
                          </button>
                        ) : (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleOpenAssignModal(p)}
                              className="text-xs font-bold px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-[#18211F] rounded-xl flex items-center gap-1 cursor-pointer transition-all border border-[#E3E8E3]"
                              title="Edit assigned function"
                            >
                              <Tag className="w-3.5 h-3.5 text-blue-600" />
                              <span>Edit Function</span>
                            </button>
                            <button
                              onClick={() => handleHideProperty(p)}
                              className="text-xs font-bold px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 rounded-xl flex items-center gap-1 cursor-pointer transition-all border border-amber-200"
                              title="Remove from frontend and quarantine in admin custody"
                            >
                              <Lock className="w-3.5 h-3.5" />
                              <span>Hide to Admin</span>
                            </button>
                          </div>
                        )}

                        {/* Status Switcher Select */}
                        <div className="flex items-center gap-1.5">
                          <label className="text-[11px] font-bold text-[#69736F] hidden sm:inline">Status:</label>
                          <select
                            value={p.status}
                            onChange={(e) => handleSetPropertyStatus(p, e.target.value as PropertyStatus)}
                            className="text-xs font-bold px-2.5 py-1.5 rounded-xl border border-[#E3E8E3] bg-white text-[#18211F] cursor-pointer"
                          >
                            <option value="funding">Funding Active</option>
                            <option value="upcoming">Launching Soon</option>
                            <option value="funded">100% Funded</option>
                            <option value="hidden">Hidden in Admin (Quarantined)</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      )}

        {/* Tab: Property Documents Automatic Generator */}
        {activeTab === 'property-documents' && (
          <div className="animate-in fade-in duration-200">
            <PropertyDocumentsHub properties={properties} />
          </div>
        )}

        {/* Tab: Ledger Reconciliation & Dual-Approval Controls */}
        {(activeTab === 'ledger' || activeTab === 'reconciliation') && (
          <div className="animate-in fade-in duration-200">
            <AdminReconciliationView />
          </div>
        )}

        {/* Tab: Company News & YouTube Video Integration */}
        {activeTab === 'news' && (
          <div className="animate-in fade-in duration-200">
            <AdminNewsManager />
          </div>
        )}

        {/* Tab: Real Estate Dossiers & Editorial CMS (Immo Matin Structure) */}
        {activeTab === 'insights' && (
          <div className="animate-in fade-in duration-200">
            <AdminInsightsCMS
              currentAdminEmail={activeUser.email}
              onViewLiveArticle={(slug) => {
                navigateTo(`/insights/${slug}`);
              }}
              onRefreshAll={refreshAll}
            />
          </div>
        )}

        {/* Tab 6: Audit Logs & Compliance Trail */}
        {activeTab === 'audit' && (
          <AdminAuditLogsView currentAdminEmail={activeUser.email} />
        )}

        {/* Tab 7: API Logs & System Monitoring */}
        {activeTab === 'logs' && <AdminMonitoringView />}

        {/* Tab 8: Admin Security & Passphrase Settings */}
        {(activeTab === 'security' || activeTab === 'admin-security') && <AdminAccountSettings />}

        {/* Tab 9: Institutional Email Communication & Templates */}
        {(activeTab.startsWith('email-manager') || activeTab === 'emails') && <AdminEmailManager />}

        {/* Tab 10: Client-Side Frontend Error Buffer */}
        {(activeTab === 'errors' || activeTab === 'frontend-errors') && <AdminFrontendErrorLogView />}

        {/* Tab 11: Property Payment Distribution & Daily Synchronization */}
        {(activeTab === 'dividends' || activeTab === 'payment-distribution') && <AdminPaymentDistributionManager />}

        {/* Tab 12: Club Privé Membership Management */}
        {(activeTab === 'club' || activeTab === 'membership') && <AdminMembershipTab />}

        {/* Fallback View for Template Sections (Plans, Support, Marketing, Website, Site Settings, System utilities) */}
        {isTemplateOnlySection(activeTab) && (
          <AdminTemplateSectionView
            sectionKey={activeTab}
            title={currentNavInfo.l}
            description={currentNavInfo.d || 'Platform configuration section.'}
            fromLocation={currentNavInfo.f || 'Admin Console'}
            subPages={currentNavInfo.c || []}
            onActionSuccess={(msg) => {
              setActionSuccess(msg);
              setTimeout(() => setActionSuccess(null), 3000);
            }}
          />
        )}

      {/* New Property Modal */}
      {showNewPropertyModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl border border-[#E3E8E3] relative max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-[#18211F]">Publish New Real Estate Asset</h3>
              <button onClick={() => setShowNewPropertyModal(false)} className="text-gray-400 hover:text-black text-xl font-bold cursor-pointer">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateProperty} className="space-y-4">
              <div className="form-field">
                <label>Property Name / Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Barcelona Eixample Boutique Apartments"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                />
              </div>

              <div className="form-field">
                <label>Address & City</label>
                <input
                  type="text"
                  required
                  placeholder="Carrer de Mallorca 112, Barcelona, Spain"
                  value={newLocation}
                  onChange={(e) => setNewLocation(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="form-field">
                  <label>Asset Category</label>
                  <select
                    value={newType}
                    onChange={(e) => setNewType(e.target.value as PropertyType)}
                  >
                    <option value="Residential">Residential</option>
                    <option value="Coliving">Coliving Hub</option>
                    <option value="Vacation Rental">Vacation Rental</option>
                    <option value="Commercial">Commercial</option>
                  </select>
                </div>

                <div className="form-field">
                  <label>Target Funding (EUR)</label>
                  <input
                    type="number"
                    min={50000}
                    step={10000}
                    value={newTarget}
                    onChange={(e) => setNewTarget(Number(e.target.value))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="form-field">
                  <label>Est. Net Yield (%)</label>
                  <input
                    type="number"
                    step={0.1}
                    value={newYield}
                    onChange={(e) => setNewYield(Number(e.target.value))}
                  />
                </div>
                <div className="form-field">
                  <label>Capital Gain (%)</label>
                  <input
                    type="number"
                    step={0.1}
                    value={newAppreciation}
                    onChange={(e) => setNewAppreciation(Number(e.target.value))}
                  />
                </div>
                <div className="form-field">
                  <label>Duration (Mo)</label>
                  <input
                    type="number"
                    value={newDuration}
                    onChange={(e) => setNewDuration(Number(e.target.value))}
                  />
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button type="submit" className="btn btn-primary flex-1 text-xs font-bold cursor-pointer">
                  Publish Property to Marketplace
                </button>
                <button
                  type="button"
                  onClick={() => setShowNewPropertyModal(false)}
                  className="btn btn-secondary text-xs cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Document Proof Inspector Modal */}
      {previewProofModalDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-200">
          <div 
            className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-7 shadow-2xl border border-[#E3E8E3] relative max-h-[90vh] flex flex-col space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#E3E8E3] pb-3 text-left">
              <div>
                <span className="text-[10px] font-bold uppercase text-[#27845D] tracking-wider block">
                  Encrypted Compliance Proof Inspector
                </span>
                <h3 className="text-lg font-black text-[#18211F]">{previewProofModalDoc.title}</h3>
              </div>
              <button
                type="button"
                onClick={() => setPreviewProofModalDoc(null)}
                className="p-2 rounded-full hover:bg-slate-100 text-slate-500 hover:text-black cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto rounded-2xl bg-slate-950 p-2 flex items-center justify-center min-h-[320px]">
              {previewProofModalDoc.fileUrl.startsWith('data:image') || previewProofModalDoc.fileUrl.startsWith('http') ? (
                <img
                  src={previewProofModalDoc.fileUrl}
                  alt={previewProofModalDoc.title}
                  className="max-h-[60vh] max-w-full rounded-xl object-contain shadow-md"
                />
              ) : (
                <div className="text-center p-8 text-white space-y-2">
                  <FileText className="w-16 h-16 mx-auto text-emerald-400" />
                  <p className="text-sm font-bold">{previewProofModalDoc.fileName}</p>
                  <p className="text-xs text-slate-400">PDF Document Proof</p>
                </div>
              )}
            </div>

            <div className="p-3.5 bg-[#F6F7F4] rounded-2xl border border-[#E3E8E3] flex flex-wrap items-center justify-between text-xs text-[#69736F] gap-2 text-left">
              <div>
                {previewProofModalDoc.user && (
                  <span className="block">Investor: <strong className="text-[#18211F]">{previewProofModalDoc.user}</strong></span>
                )}
                {previewProofModalDoc.ref && (
                  <span className="block mt-0.5">Reference: <strong className="font-mono text-[#18211F]">{previewProofModalDoc.ref}</strong></span>
                )}
              </div>
              <div>
                <span>File: <strong className="font-mono text-[#18211F]">{previewProofModalDoc.fileName}</strong></span>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-[#E3E8E3]">
              <button
                type="button"
                onClick={() => setPreviewProofModalDoc(null)}
                className="btn btn-secondary text-xs font-bold px-6 py-2.5 cursor-pointer"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Property Operational Function & Frontend Approval Workflow Modal */}
      {assignModalProperty && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-[#E3E8E3] relative max-h-[92vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex justify-between items-start gap-4 mb-5 border-b border-[#E3E8E3] pb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse"></span>
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-amber-800">
                    Admin Custody Workflow · Institutional Governance
                  </span>
                </div>
                <h3 className="text-xl font-black text-[#18211F]">
                  Assign Operational Function & Approve for Frontend
                </h3>
                <p className="text-xs text-[#69736F] mt-1 leading-relaxed">
                  All hidden properties stay strictly in the admin part. An operational function must be assigned and formal administrative approval given before this asset appears on the frontend.
                </p>
              </div>
              <button
                onClick={() => setAssignModalProperty(null)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 hover:text-black font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Property Summary Card */}
            <div className="bg-[#F6F7F4] p-4 rounded-2xl border border-[#E3E8E3] flex items-center gap-4 mb-6">
              <div className="w-16 h-16 rounded-xl overflow-hidden bg-gray-200 shrink-0 border border-gray-300">
                <img
                  src={assignModalProperty.images[0] || assignModalProperty.bannerImage}
                  alt={assignModalProperty.title}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="space-y-1 flex-1 min-w-0">
                <h4 className="text-sm font-black text-[#18211F] truncate">
                  {assignModalProperty.title}
                </h4>
                <div className="flex items-center gap-3 text-xs text-[#69736F] flex-wrap">
                  <span>{assignModalProperty.location}</span>
                  <span>·</span>
                  <span className="font-bold text-[#27845D]">{assignModalProperty.estimatedAnnualYield}% Net Yield</span>
                  <span>·</span>
                  <span>Target: {formatCurrency(assignModalProperty.targetAmount)}</span>
                  <span>·</span>
                  <span>Ticker: <strong className="font-mono text-[#18211F]">{assignModalProperty.tokenTicker}</strong></span>
                </div>
                <div className="flex items-center gap-2 text-[11px] pt-0.5">
                  <span className="text-amber-800 font-semibold">Current Custody State:</span>
                  <span className="font-bold text-amber-900 bg-amber-100 px-2 py-0.5 rounded-md border border-amber-300">
                    {assignModalProperty.status === 'hidden' ? 'Hidden in Admin Custody' : assignModalProperty.status.toUpperCase()}
                  </span>
                  {assignModalProperty.assignedFunction ? (
                    <span className="text-blue-800 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200 font-medium">
                      Current Function: {assignModalProperty.assignedFunction}
                    </span>
                  ) : (
                    <span className="text-rose-800 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200 font-bold">
                      Function: Unassigned
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Step 1: Assign Operational Function */}
            <div className="space-y-3 mb-6">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-[#18211F] flex items-center gap-1.5">
                  <Tag className="w-4 h-4 text-[#27845D]" />
                  <span>1. Assign Property Operational Function (Required)</span>
                </label>
                <span className="text-[11px] text-emerald-800 font-bold">Mandatory for Frontend Approval</span>
              </div>

              {/* Function Preset Selector Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {[
                  { id: 'fn-1', label: 'Institutional Fractional Tokenization', desc: 'Public Marketplace fractional participatory note' },
                  { id: 'fn-2', label: 'Exclusive Off-Market Private Desk', desc: 'Confidential syndicate for accredited & family office partners' },
                  { id: 'fn-3', label: 'High-Yield Vacation Rental Syndicate', desc: 'Short-term luxury villa letting (Riviera / Balearic Islands)' },
                  { id: 'fn-4', label: 'Prime Metropolitan Trophy Residence', desc: 'Core capital appreciation asset in Paris 16th / Salamanca' },
                  { id: 'fn-5', label: 'Club Privé Private Allocation', desc: 'Reserved allocation for Tier 1 & Tier 2 membership holders' },
                  { id: 'fn-6', label: 'Heritage Château & Vineyard Syndicate', desc: 'Historic estate with agricultural & hospitality yield streams' },
                ].map((fn) => (
                  <button
                    key={fn.id}
                    type="button"
                    onClick={() => setAssignedFunctionInput(fn.label)}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      assignedFunctionInput === fn.label
                        ? 'border-[#27845D] bg-emerald-50/70 text-emerald-950 ring-2 ring-emerald-500/30 shadow-xs'
                        : 'border-[#E3E8E3] hover:border-gray-300 bg-white text-[#18211F]'
                    }`}
                  >
                    <div className="text-xs font-bold flex items-center justify-between">
                      <span>{fn.label}</span>
                      {assignedFunctionInput === fn.label && <Check className="w-3.5 h-3.5 text-[#27845D]" />}
                    </div>
                    <div className="text-[10px] text-[#69736F] mt-1 leading-normal">
                      {fn.desc}
                    </div>
                  </button>
                ))}
              </div>

              {/* Text Input for Custom Function */}
              <div className="pt-1">
                <label className="text-[11px] font-semibold text-[#69736F] block mb-1">
                  Or specify a custom operational mandate:
                </label>
                <input
                  type="text"
                  value={assignedFunctionInput}
                  onChange={(e) => setAssignedFunctionInput(e.target.value)}
                  placeholder="e.g. Bespoke Family Office Syndicate, Prime Riviera Flagship..."
                  className="w-full text-xs font-bold px-3.5 py-2.5 rounded-xl border border-[#E3E8E3] focus:border-[#27845D] focus:ring-1 focus:ring-[#27845D] bg-white text-[#18211F]"
                />
              </div>
            </div>

            {/* Step 2: Assign Lead Broker & Target Launch Status */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              <div>
                <label className="text-xs font-bold text-[#18211F] block mb-1.5">
                  2. Assigned Lead Agent / Broker
                </label>
                <select
                  value={assignedAgentInput}
                  onChange={(e) => setAssignedAgentInput(e.target.value)}
                  className="w-full text-xs font-bold px-3.5 py-2.5 rounded-xl border border-[#E3E8E3] bg-white text-[#18211F] cursor-pointer"
                >
                  <option value="Valentin Kretz">Valentin Kretz (Partner · European Offerings)</option>
                  <option value="Martin Kretz">Martin Kretz (Managing Partner · Paris Core)</option>
                  <option value="Louis Kretz">Louis Kretz (Partner · Riviera & Balearic)</option>
                  <option value="Olivier Kretz">Olivier Kretz (Founding Director)</option>
                  <option value="Sandrine Kretz">Sandrine Kretz (Creative & Asset Curator)</option>
                  <option value="L'Agence Institutional Advisory Desk">L'Agence Institutional Advisory Desk</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-[#18211F] block mb-1.5">
                  3. Target Launch Status on Frontend
                </label>
                <select
                  value={targetLaunchStatus}
                  onChange={(e) => setTargetLaunchStatus(e.target.value as PropertyStatus)}
                  className="w-full text-xs font-bold px-3.5 py-2.5 rounded-xl border border-[#E3E8E3] bg-white text-[#18211F] cursor-pointer"
                >
                  <option value="funding">Funding Active (Open for immediate investment)</option>
                  <option value="upcoming">Launching Soon (Upcoming pipeline countdown)</option>
                  <option value="funded">100% Funded (Track record archive)</option>
                </select>
              </div>
            </div>

            {/* Step 3: Governance & Due Diligence Checklist */}
            <div className="bg-[#F8FAF8] border border-[#E3E8E3] rounded-2xl p-4 mb-6 space-y-2.5">
              <div className="text-xs font-bold text-[#18211F] flex items-center justify-between">
                <span>4. Administrative Due Diligence Validation Checklist</span>
                <span className="text-[10px] text-[#27845D] font-bold">Audit Certified</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-[#52605C]">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={checklist.spvDeedVerified}
                    onChange={(e) => setChecklist({ ...checklist, spvDeedVerified: e.target.checked })}
                    className="rounded text-[#27845D] focus:ring-[#27845D]"
                  />
                  <span>SPV Constitutional Deeds Audited</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={checklist.ricsValuationCertified}
                    onChange={(e) => setChecklist({ ...checklist, ricsValuationCertified: e.target.checked })}
                    className="rounded text-[#27845D] focus:ring-[#27845D]"
                  />
                  <span>RICS Appraisal Certified</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={checklist.smartContractGenerated}
                    onChange={(e) => setChecklist({ ...checklist, smartContractGenerated: e.target.checked })}
                    className="rounded text-[#27845D] focus:ring-[#27845D]"
                  />
                  <span>Smart Contract & Ticker Bound</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={checklist.amlKycApproved}
                    onChange={(e) => setChecklist({ ...checklist, amlKycApproved: e.target.checked })}
                    className="rounded text-[#27845D] focus:ring-[#27845D]"
                  />
                  <span>AML / Compliance Screening Cleared</span>
                </label>
              </div>

              <div className="pt-1.5">
                <input
                  type="text"
                  placeholder="Optional approval notes / executive sign-off remarks..."
                  value={approvalNotes}
                  onChange={(e) => setApprovalNotes(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-xl border border-[#E3E8E3] bg-white text-[#18211F]"
                />
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-[#E3E8E3]">
              <button
                type="button"
                onClick={() => setAssignModalProperty(null)}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-gray-300 text-gray-700 font-bold text-xs hover:bg-gray-100 cursor-pointer"
              >
                Cancel
              </button>

              <div className="flex items-center gap-2.5 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={handleSaveFunctionOnly}
                  className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 font-bold text-xs cursor-pointer flex items-center justify-center gap-1.5"
                  title="Save the assigned function without approving; keeps the asset strictly in admin custody."
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Save Function (Keep in Admin)</span>
                </button>

                <button
                  type="button"
                  onClick={handleApproveForFrontend}
                  disabled={!assignedFunctionInput.trim()}
                  className={`flex-1 sm:flex-initial px-5 py-2.5 rounded-xl font-bold text-xs text-white flex items-center justify-center gap-1.5 cursor-pointer shadow-md transition-all ${
                    assignedFunctionInput.trim()
                      ? 'bg-[#27845D] hover:bg-[#1f6b4b]'
                      : 'bg-gray-300 cursor-not-allowed'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Approve & Publish to Frontend</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      </main>
      </div>
    </div>
  );
};
