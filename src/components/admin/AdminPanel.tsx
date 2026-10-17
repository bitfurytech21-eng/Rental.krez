import React, { useState } from 'react';
import { useAuth } from '../../lib/auth';
import { ledger, CryptoNetworkConfig } from '../../lib/ledger';
import { formatCurrency, formatDate, formatShortHash } from '../../lib/utils';
import { Property, PropertyType, PropertyStatus } from '../../types/property';
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
  FileText,
  Activity
} from 'lucide-react';

import { PropertyDocumentsHub } from '../documents/PropertyDocumentsHub';
import { AdminMonitoringView } from './AdminMonitoringView';
import { AdminDashboardOverview } from './AdminDashboardOverview';

export const AdminPanel: React.FC = () => {
  const { user } = useAuth();
  if (!user) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center p-8 bg-[#F6F7F4]">
        <div className="w-8 h-8 border-3 border-[#182D2A] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const [activeTab, setActiveTab] = useState<'dashboard' | 'deposits' | 'withdrawals' | 'manual-payment' | 'kyc' | 'properties' | 'property-documents' | 'audit' | 'payment-settings' | 'logs'>('dashboard');
  const [transactions, setTransactions] = useState(ledger.getTransactions());
  const [properties, setProperties] = useState(ledger.getProperties());
  const [users, setUsers] = useState(ledger.getUsers());
  const [auditLogs, setAuditLogs] = useState(ledger.getAuditLogs());
  const [paymentConfig, setPaymentConfig] = useState(ledger.getPaymentConfig());
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Manual Payment Credit State
  const [selectedUserId, setSelectedUserId] = useState<string>(users[0]?.id || '');
  const [manualAmount, setManualAmount] = useState<number>(1000);
  const [manualCurrency, setManualCurrency] = useState<string>('EUR');
  const [manualMethod, setManualMethod] = useState<string>('Direct SEPA Wire Received');
  const [manualReference, setManualReference] = useState<string>('');
  const [manualNotes, setManualNotes] = useState<string>('Funds confirmed in CaixaBank corporate treasury account.');
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
  const [adminPropertyFilter, setAdminPropertyFilter] = useState<'all' | 'hidden' | 'upcoming' | 'funded' | 'funding'>('all');

  const pendingDeposits = transactions.filter(t => t.type === 'deposit' && t.status === 'pending');
  const pendingWithdrawals = transactions.filter(t => t.type === 'withdrawal' && t.status === 'pending');
  const pendingKYCUsers = users.filter(u => u.kycStatus === 'pending');

  const refreshAll = () => {
    setTransactions(ledger.getTransactions());
    setProperties(ledger.getProperties());
    setUsers(ledger.getUsers());
    setAuditLogs(ledger.getAuditLogs());
    setPaymentConfig(ledger.getPaymentConfig());
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
    if (confirm(`Are you sure you want to remove ${name} from payment settings?`)) {
      ledger.deleteCryptoNetwork(id);
      refreshAll();
      setActionSuccess(`Treasury network ${name} removed.`);
      setTimeout(() => setActionSuccess(null), 3000);
    }
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
        user.email,
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
      setActionSuccess(`Withdrawal ${approved ? 'approved and transfer executed' : 'declined and capital refunded to investor'}.`);
      setActionError(null);
      refreshAll();
      setTimeout(() => setActionSuccess(null), 3000);
    } catch (e: any) {
      setActionError(e.message || 'Action failed');
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
    const tokenPrice = 100;
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
      images: ['/src/assets/images/prop_valencia_apt_1791998371242.jpg'],
      bannerImage: '/src/assets/images/prop_valencia_apt_1791998371242.jpg',
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

  const handleTogglePropertyStatus = (prop: Property) => {
    let nextStatus: PropertyStatus = 'funding';
    if (prop.status === 'hidden' || prop.status === 'pending_approval') {
      nextStatus = 'funding';
    } else if (prop.status === 'funding') {
      nextStatus = 'funded';
    } else if (prop.status === 'funded') {
      nextStatus = 'upcoming';
    } else {
      nextStatus = 'funding';
    }
    const updated = { ...prop, status: nextStatus };
    ledger.saveProperty(updated);
    refreshAll();
  };

  const handleSetPropertyStatus = (prop: Property, newStatus: PropertyStatus) => {
    const updated = { ...prop, status: newStatus };
    ledger.saveProperty(updated);
    refreshAll();
    setActionSuccess(`Property "${prop.title}" status changed to ${newStatus.toUpperCase()}.`);
    setTimeout(() => setActionSuccess(null), 3000);
  };

  const handleApproveAllPending = () => {
    const pending = properties.filter(p => p.status === 'hidden' || p.status === 'pending_approval');
    if (pending.length === 0) return;
    pending.forEach(p => {
      ledger.saveProperty({ ...p, status: 'funding' });
    });
    refreshAll();
    setActionSuccess(`Approved and published ${pending.length} properties to live marketplace!`);
    setTimeout(() => setActionSuccess(null), 3500);
  };

  const selectedTargetUser = users.find(u => u.id === selectedUserId);

  return (
    <div className="bg-[#F6F7F4] min-h-screen py-10">
      <div className="container mx-auto px-4 sm:px-6">
        
        {/* Header */}
        <div className="bg-[#182D2A] text-white p-7 rounded-3xl shadow-xl mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#24423C] text-[#B7E36A] flex items-center justify-center">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black text-white">Platform Administration</h1>
                <span className="bg-[#24423C] text-[#B7E36A] text-xs font-bold px-2 py-0.5 rounded-full uppercase">
                  Super Admin
                </span>
              </div>
              <p className="text-xs text-[#A0A8A5]">
                Manage payments, manual balance integrations, treasury wallets, offerings, and financial ledger compliance.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowNewPropertyModal(true)}
              className="btn btn-accent text-xs font-bold px-5 cursor-pointer"
            >
              <Plus className="w-4 h-4 mr-1" />
              Publish New Property
            </button>
          </div>
        </div>

        {actionSuccess && (
          <div className="p-4 mb-6 rounded-2xl bg-green-50 text-green-800 text-xs font-bold border border-green-200 flex items-center justify-between animate-in fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
              <span>{actionSuccess}</span>
            </div>
            <button onClick={() => setActionSuccess(null)} className="text-gray-500 hover:text-gray-700 cursor-pointer">✕</button>
          </div>
        )}

        {actionError && (
          <div className="p-4 mb-6 rounded-2xl bg-red-50 text-red-800 text-xs font-bold border border-red-200 flex items-center justify-between animate-in fade-in">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{actionError}</span>
            </div>
            <button onClick={() => setActionError(null)} className="text-gray-500 hover:text-gray-700 cursor-pointer">✕</button>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex border-b border-[#E3E8E3] mb-8 gap-5 text-xs sm:text-sm font-bold overflow-x-auto pb-1">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`pb-3 border-b-2 flex items-center gap-2 whitespace-nowrap cursor-pointer transition-colors ${
              activeTab === 'dashboard' ? 'border-[#182D2A] text-[#182D2A]' : 'border-transparent text-[#69736F] hover:text-[#18211F]'
            }`}
          >
            <Activity className="w-4 h-4 text-emerald-700" />
            <span>Admin Dashboard</span>
          </button>

          <button
            onClick={() => setActiveTab('deposits')}
            className={`pb-3 border-b-2 flex items-center gap-2 whitespace-nowrap cursor-pointer transition-colors ${
              activeTab === 'deposits' ? 'border-[#182D2A] text-[#182D2A]' : 'border-transparent text-[#69736F] hover:text-[#18211F]'
            }`}
          >
            <ArrowDownLeft className="w-4 h-4" />
            Deposit Approvals ({pendingDeposits.length})
          </button>

          <button
            onClick={() => setActiveTab('withdrawals')}
            className={`pb-3 border-b-2 flex items-center gap-2 whitespace-nowrap cursor-pointer transition-colors ${
              activeTab === 'withdrawals' ? 'border-[#182D2A] text-[#182D2A]' : 'border-transparent text-[#69736F] hover:text-[#18211F]'
            }`}
          >
            <ArrowUpRight className="w-4 h-4" />
            Withdrawal Approvals ({pendingWithdrawals.length})
          </button>

          <button
            onClick={() => setActiveTab('manual-payment')}
            className={`pb-3 border-b-2 flex items-center gap-2 whitespace-nowrap cursor-pointer transition-colors ${
              activeTab === 'manual-payment' ? 'border-[#182D2A] text-[#182D2A]' : 'border-transparent text-[#69736F] hover:text-[#18211F]'
            }`}
          >
            <CreditCard className="w-4 h-4 text-[#27845D]" />
            Manual Payment Integration
          </button>

          <button
            onClick={() => setActiveTab('payment-settings')}
            className={`pb-3 border-b-2 flex items-center gap-2 whitespace-nowrap cursor-pointer transition-colors ${
              activeTab === 'payment-settings' ? 'border-[#182D2A] text-[#182D2A]' : 'border-transparent text-[#69736F] hover:text-[#18211F]'
            }`}
          >
            <Coins className="w-4 h-4" />
            Payment Gateways & Wallets
          </button>

          <button
            onClick={() => setActiveTab('kyc')}
            className={`pb-3 border-b-2 flex items-center gap-2 whitespace-nowrap cursor-pointer transition-colors ${
              activeTab === 'kyc' ? 'border-[#182D2A] text-[#182D2A]' : 'border-transparent text-[#69736F] hover:text-[#18211F]'
            }`}
          >
            <Users className="w-4 h-4" />
            KYC Identity Queue ({pendingKYCUsers.length})
          </button>

          <button
            onClick={() => setActiveTab('properties')}
            className={`pb-3 border-b-2 flex items-center gap-2 whitespace-nowrap cursor-pointer transition-colors ${
              activeTab === 'properties' ? 'border-[#182D2A] text-[#182D2A]' : 'border-transparent text-[#69736F] hover:text-[#18211F]'
            }`}
          >
            <Building2 className="w-4 h-4" />
            Manage Properties ({properties.length})
            {properties.filter(p => p.status === 'hidden' || p.status === 'pending_approval').length > 0 && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800">
                {properties.filter(p => p.status === 'hidden' || p.status === 'pending_approval').length} waiting
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('property-documents')}
            className={`pb-3 border-b-2 flex items-center gap-2 whitespace-nowrap cursor-pointer transition-colors ${
              activeTab === 'property-documents' ? 'border-[#182D2A] text-[#182D2A]' : 'border-transparent text-[#69736F] hover:text-[#18211F]'
            }`}
          >
            <FileText className="w-4 h-4 text-[#27845D]" />
            Property Documents ({properties.length})
          </button>

          <button
            onClick={() => setActiveTab('audit')}
            className={`pb-3 border-b-2 flex items-center gap-2 whitespace-nowrap cursor-pointer transition-colors ${
              activeTab === 'audit' ? 'border-[#182D2A] text-[#182D2A]' : 'border-transparent text-[#69736F] hover:text-[#18211F]'
            }`}
          >
            <ClipboardList className="w-4 h-4" />
            Ledger Audit Logs
          </button>

          <button
            onClick={() => setActiveTab('logs')}
            className={`pb-3 border-b-2 flex items-center gap-2 whitespace-nowrap cursor-pointer transition-colors ${
              activeTab === 'logs' ? 'border-[#182D2A] text-[#182D2A]' : 'border-transparent text-[#69736F] hover:text-[#18211F]'
            }`}
          >
            <Activity className="w-4 h-4 text-emerald-600" />
            <span>API Logs & System Monitoring</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          </button>
        </div>

        {/* Tab 0: Admin Executive Command Dashboard */}
        {activeTab === 'dashboard' && (
          <AdminDashboardOverview
            properties={properties}
            transactions={transactions}
            users={users}
            auditLogs={auditLogs}
            paymentConfig={paymentConfig}
            onNavigateTab={(tab) => setActiveTab(tab)}
            onOpenNewPropertyModal={() => setShowNewPropertyModal(true)}
            onRefreshAll={refreshAll}
            onQuickCreditSuccess={(msg) => {
              setActionSuccess(msg);
              setTimeout(() => setActionSuccess(null), 3000);
            }}
            onTogglePropertyStatus={handleTogglePropertyStatus}
          />
        )}

        {/* Tab 1: Deposit Approvals */}
        {activeTab === 'deposits' && (
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-[#E3E8E3] shadow-sm">
            <div className="flex justify-between items-center mb-5">
              <div>
                <h3 className="text-lg font-bold text-[#18211F]">Pending Investor Deposits</h3>
                <p className="text-xs text-[#69736F]">Review and approve incoming bank wire confirmations and crypto transfers</p>
              </div>
              <span className="text-xs font-bold px-3 py-1 bg-[#EEF1EC] text-[#27845D] rounded-full">
                {pendingDeposits.length} Requests Pending
              </span>
            </div>

            {pendingDeposits.length === 0 ? (
              <div className="text-center py-12 text-xs text-[#69736F] space-y-2">
                <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto opacity-40" />
                <p className="text-sm font-semibold text-[#18211F]">All deposits are up to date.</p>
                <p>New investor transfer requests will appear here for administrative verification.</p>
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
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-[#27845D] bg-emerald-50 px-2 py-0.5 rounded-full uppercase tracking-wider">
                            Deposit Request
                          </span>
                          <span className="font-mono text-xs text-[#69736F] font-semibold">{tx.reference}</span>
                        </div>
                        
                        <div className="flex items-baseline gap-2">
                          <h4 className="text-lg font-black text-[#18211F]">
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
                            Declared Tx/Note: <span className="text-[#18211F] bg-white px-2 py-0.5 rounded border border-[#E3E8E3]">{tx.txHash}</span>
                          </div>
                        )}

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
        {activeTab === 'withdrawals' && (
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-[#E3E8E3] shadow-sm">
            <div className="flex justify-between items-center mb-5">
              <div>
                <h3 className="text-lg font-bold text-[#18211F]">Pending Investor Withdrawals</h3>
                <p className="text-xs text-[#69736F]">Approve and execute bank wire payouts and cryptocurrency payouts</p>
              </div>
              <span className="text-xs font-bold px-3 py-1 bg-[#EEF1EC] text-[#27845D] rounded-full">
                {pendingWithdrawals.length} Requests Pending
              </span>
            </div>

            {pendingWithdrawals.length === 0 ? (
              <div className="text-center py-12 text-xs text-[#69736F] space-y-2">
                <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto opacity-40" />
                <p className="text-sm font-semibold text-[#18211F]">No pending withdrawals.</p>
                <p>All requested disbursements have been fulfilled.</p>
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
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-[#C24141] bg-red-50 px-2 py-0.5 rounded-full uppercase tracking-wider">
                            {isCrypto ? 'Crypto Withdrawal' : 'SEPA Bank Wire'}
                          </span>
                          <span className="font-mono text-xs text-[#69736F] font-semibold">{tx.reference}</span>
                        </div>

                        <h4 className="text-lg font-black text-[#18211F]">
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
                      placeholder="e.g. Funds verified by treasury officer via CaixaBank corporate statement."
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
                    className="btn btn-primary text-xs font-bold px-6 py-3 bg-[#27845D] hover:bg-[#1f6b4a] text-white flex items-center gap-2 cursor-pointer shadow-md disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    {isSubmittingCredit ? 'Integrating Payment...' : `Execute & Credit ${formatCurrency(manualAmount)} to Investor`}
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
                      Cryptocurrency Treasury Wallets & Multi-Chain Endpoints ({paymentConfig.cryptoNetworks.length})
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

                          <button
                            type="button"
                            onClick={() => handleDeleteCryptoNetwork(net.id, net.name)}
                            title="Delete Network"
                            className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
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

        {/* Tab 5: Manage Properties */}
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
                {properties.filter(p => p.status === 'hidden' || p.status === 'pending_approval').length > 0 && (
                  <button
                    onClick={handleApproveAllPending}
                    className="btn btn-secondary text-xs font-bold px-3 py-2 text-[#27845D] border-emerald-200 hover:bg-emerald-50 flex items-center gap-1.5 cursor-pointer"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Approve All Pending ({properties.filter(p => p.status === 'hidden' || p.status === 'pending_approval').length})
                  </button>
                )}
                <button
                  onClick={() => setShowNewPropertyModal(true)}
                  className="btn btn-primary btn-sm text-xs font-bold cursor-pointer bg-[#27845D] text-white flex items-center gap-1"
                >
                  <Plus className="w-4 h-4" />
                  Add Property
                </button>
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
                <div className="text-xs font-semibold opacity-80">Total Properties</div>
                <div className="text-2xl font-black mt-1">{properties.length}</div>
              </div>

              <div
                onClick={() => setAdminPropertyFilter('hidden')}
                className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                  adminPropertyFilter === 'hidden'
                    ? 'border-amber-500 bg-amber-500 text-white shadow-sm'
                    : 'border-amber-200 bg-amber-50 text-amber-900 hover:bg-amber-100'
                }`}
              >
                <div className="text-xs font-bold flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  Waiting Approval (Hidden)
                </div>
                <div className="text-2xl font-black mt-1">
                  {properties.filter(p => p.status === 'hidden' || p.status === 'pending_approval').length}
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
                <div className="text-xs font-bold">Launching Soon (Upcoming)</div>
                <div className="text-2xl font-black mt-1">
                  {properties.filter(p => p.status === 'upcoming').length}
                </div>
              </div>

              <div
                onClick={() => setAdminPropertyFilter('funded')}
                className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                  adminPropertyFilter === 'funded'
                    ? 'border-emerald-600 bg-emerald-600 text-white shadow-sm'
                    : 'border-emerald-200 bg-emerald-50 text-emerald-900 hover:bg-emerald-100'
                }`}
              >
                <div className="text-xs font-bold">100% Fully Funded</div>
                <div className="text-2xl font-black mt-1">
                  {properties.filter(p => p.status === 'funded').length}
                </div>
              </div>
            </div>

            {/* Filter Pills */}
            <div className="flex flex-wrap items-center gap-2 pt-2 pb-1 border-b border-[#E3E8E3]">
              {[
                { label: `All (${properties.length})`, val: 'all' },
                { label: `Waiting Approval (${properties.filter(p => p.status === 'hidden' || p.status === 'pending_approval').length})`, val: 'hidden' },
                { label: `Launching Soon (${properties.filter(p => p.status === 'upcoming').length})`, val: 'upcoming' },
                { label: `100% Funded (${properties.filter(p => p.status === 'funded').length})`, val: 'funded' },
                { label: `Active Funding (${properties.filter(p => p.status === 'funding').length})`, val: 'funding' },
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
                  if (adminPropertyFilter === 'all') return true;
                  if (adminPropertyFilter === 'hidden') return p.status === 'hidden' || p.status === 'pending_approval';
                  return p.status === adminPropertyFilter;
                })
                .map((p) => {
                  const isHidden = p.status === 'hidden' || p.status === 'pending_approval';
                  return (
                    <div
                      key={p.id}
                      className={`py-4 px-2 sm:px-3 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors ${
                        isHidden ? 'bg-amber-50/60 border border-amber-200/70 my-1.5' : 'hover:bg-[#F6F7F4]'
                      }`}
                    >
                      <div className="flex items-center gap-3.5">
                        <div className="w-14 h-14 rounded-2xl overflow-hidden bg-gray-100 shrink-0 border border-[#E3E8E3]">
                          <img
                            src={p.images[0] || p.bannerImage}
                            alt={p.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-sm font-bold text-[#18211F]">{p.title}</h4>
                            {isHidden && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                                Waiting Approval
                              </span>
                            )}
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
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5 shrink-0 self-end md:self-auto flex-wrap">
                        {/* Direct Approval Button for Hidden/Waiting properties */}
                        {isHidden && (
                          <button
                            onClick={() => handleSetPropertyStatus(p, 'funding')}
                            className="btn btn-primary text-xs font-bold px-3.5 py-1.5 bg-[#27845D] hover:bg-[#1f6b4b] text-white flex items-center gap-1 cursor-pointer shadow-sm"
                            title="Approve and publish to public listing"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Approve for Listing
                          </button>
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
                            <option value="hidden">Hidden (Pending Approval)</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* Tab: Property Documents Automatic Generator */}
        {activeTab === 'property-documents' && (
          <div className="animate-in fade-in duration-200">
            <PropertyDocumentsHub properties={properties} />
          </div>
        )}

        {/* Tab 6: Audit Logs */}
        {activeTab === 'audit' && (
          <div className="bg-white p-6 rounded-3xl border border-[#E3E8E3] shadow-sm">
            <h3 className="text-lg font-bold text-[#18211F] mb-4">Financial Ledger & Administrative Audit Trail</h3>
            <div className="divide-y divide-[#E3E8E3] max-h-96 overflow-y-auto font-mono text-xs">
              {auditLogs.map((log) => (
                <div key={log.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <span className="font-bold text-[#182D2A] mr-2">[{log.action}]</span>
                    <span className="text-[#69736F]">{log.details}</span>
                  </div>
                  <div className="text-[11px] text-[#828D89] whitespace-nowrap">
                    {formatDate(log.timestamp)} · Admin: {log.adminEmail}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 7: API Logs & System Monitoring */}
        {activeTab === 'logs' && <AdminMonitoringView />}
      </div>

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
    </div>
  );
};
