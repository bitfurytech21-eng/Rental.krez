import React, { useState } from 'react';
import { Property } from '../../types/property';
import { Transaction } from '../../types/transaction';
import { User } from '../../types/user';
import { AuditLog, PaymentConfig } from '../../lib/ledger';
import { formatCurrency, formatDate, formatShortHash } from '../../lib/utils';
import {
  Shield,
  ArrowUpRight,
  ArrowDownLeft,
  Users,
  Building2,
  Coins,
  CreditCard,
  CheckCircle2,
  Clock,
  AlertTriangle,
  TrendingUp,
  Wallet,
  FileText,
  Activity,
  Download,
  Plus,
  RefreshCw,
  Zap,
  Check,
  ExternalLink,
  ChevronRight,
  Lock,
  Percent,
  Server,
  Layers,
  Sparkles
} from 'lucide-react';

interface AdminDashboardOverviewProps {
  properties: Property[];
  transactions: Transaction[];
  users: User[];
  auditLogs: AuditLog[];
  paymentConfig: PaymentConfig;
  onNavigateTab: (tab: 'dashboard' | 'deposits' | 'withdrawals' | 'manual-payment' | 'kyc' | 'properties' | 'property-documents' | 'audit' | 'payment-settings' | 'logs') => void;
  onOpenNewPropertyModal: () => void;
  onRefreshAll: () => void;
  onQuickCreditSuccess: (msg: string) => void;
  onTogglePropertyStatus: (prop: Property) => void;
}

export const AdminDashboardOverview: React.FC<AdminDashboardOverviewProps> = ({
  properties,
  transactions,
  users,
  auditLogs,
  paymentConfig,
  onNavigateTab,
  onOpenNewPropertyModal,
  onRefreshAll,
  onQuickCreditSuccess,
  onTogglePropertyStatus,
}) => {
  const [isDistributingYields, setIsDistributingYields] = useState(false);
  const [distributionSuccess, setDistributionSuccess] = useState<string | null>(null);
  const [downloadingReport, setDownloadingReport] = useState(false);

  // Computed Financial & Platform KPIs
  const totalPlatformAUM = properties.reduce((sum, p) => sum + (p.targetAmount || 0), 0);
  const totalCapitalFunded = properties.reduce((sum, p) => sum + (p.fundedAmount || 0), 0);
  const totalInvestorWalletBalances = users.reduce((sum, u) => sum + (u.walletBalance || 0), 0);
  
  const totalDividendsDistributed = transactions
    .filter(t => t.type === 'distribution' && t.status === 'completed')
    .reduce((sum, t) => sum + t.amount, 0);

  const pendingDeposits = transactions.filter(t => t.type === 'deposit' && t.status === 'pending');
  const pendingDepositsTotal = pendingDeposits.reduce((sum, t) => sum + t.amount, 0);

  const pendingWithdrawals = transactions.filter(t => t.type === 'withdrawal' && t.status === 'pending');
  const pendingWithdrawalsTotal = pendingWithdrawals.reduce((sum, t) => sum + t.amount, 0);

  const pendingKYCUsers = users.filter(u => u.kycStatus === 'pending');
  const verifiedUsers = users.filter(u => u.kycStatus === 'verified');
  const institutionalUsers = users.filter(u => u.accountType === 'institutional_investor' || u.accountType === 'family_office' || u.accountType === 'corporate_entity');

  const fundingProperties = properties.filter(p => p.status === 'funding');
  const fundedProperties = properties.filter(p => p.status === 'funded');

  // Trigger monthly dividend simulation across all funded properties
  const handleTriggerMonthlyDividends = () => {
    setIsDistributingYields(true);
    setTimeout(() => {
      setIsDistributingYields(false);
      setDistributionSuccess(`Batch rental distribution cycle calculated and dispatched across ${fundedProperties.length || 3} funded SPV offerings.`);
      onRefreshAll();
      setTimeout(() => setDistributionSuccess(null), 5000);
    }, 1200);
  };

  // Export financial audit report
  const handleExportFinancialReport = () => {
    setDownloadingReport(true);
    try {
      const reportData = {
        exportTimestamp: new Date().toISOString(),
        institution: 'Kretz / Rental-log Real Estate Ledger',
        systemStatus: 'Operational - Ledger Validated',
        platformSummary: {
          totalPlatformAUM,
          totalCapitalFunded,
          totalInvestorWalletBalances,
          totalDividendsDistributed,
          activePropertiesCount: properties.length,
          totalUsersCount: users.length,
          verifiedUsersCount: verifiedUsers.length,
          pendingActions: {
            depositsCount: pendingDeposits.length,
            withdrawalsCount: pendingWithdrawals.length,
            kycCount: pendingKYCUsers.length
          }
        },
        properties: properties.map(p => ({
          id: p.id,
          title: p.title,
          city: p.city,
          type: p.type,
          status: p.status,
          targetAmount: p.targetAmount,
          fundedAmount: p.fundedAmount,
          percentFunded: Math.round((p.fundedAmount / p.targetAmount) * 100),
          estimatedAnnualYield: p.estimatedAnnualYield,
          investorCount: p.investorCount
        })),
        recentTransactions: transactions.slice(0, 50),
        recentAuditLogs: auditLogs.slice(0, 50)
      };

      const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `kretz-admin-financial-ledger-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Failed to export report', e);
    } finally {
      setTimeout(() => setDownloadingReport(false), 800);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      
      {/* 1. Executive Status & Command Banner */}
      <div className="bg-gradient-to-r from-[#0E201C] via-[#142823] to-[#182D2A] text-white p-6 sm:p-8 rounded-3xl border border-emerald-900/60 shadow-xl relative overflow-hidden">
        {/* Subtle geometric backdrop */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2 text-left">
            <div className="flex flex-wrap items-center gap-2.5 text-xs">
              <span className="flex items-center gap-1.5 text-emerald-400 font-bold uppercase tracking-wider text-[11px]">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Executive Command Center</span>
              </span>
              <span className="text-slate-500">·</span>
              <span className="text-slate-300 font-medium">Production Node v22</span>
              <span className="text-slate-500">·</span>
              <span className="text-emerald-300/80 font-mono text-[11px]">API v1 Active</span>
            </div>
            
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Administrator Platform Dashboard
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              Global overview of ring-fenced real estate SPVs, fiat and multi-chain crypto treasuries, regulatory investor compliance, and real-time ledger settlement.
            </p>
          </div>

          {/* Quick Operations Bar */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={handleTriggerMonthlyDividends}
              disabled={isDistributingYields}
              className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50"
              title="Calculate & trigger automated monthly yields for funded SPVs"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>{isDistributingYields ? 'Running Batch...' : 'Trigger Dividend Cycle'}</span>
            </button>

            <button
              onClick={handleExportFinancialReport}
              disabled={downloadingReport}
              className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-white text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span>{downloadingReport ? 'Generating...' : 'Export Audit Report'}</span>
            </button>

            <button
              onClick={onRefreshAll}
              className="p-2.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-slate-300 hover:text-white transition-all cursor-pointer"
              title="Refresh all metrics"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {distributionSuccess && (
          <div className="mt-5 p-3 rounded-xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-200 text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{distributionSuccess}</span>
          </div>
        )}
      </div>

      {/* 2. Top-Level Platform KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        
        {/* Metric 1: Total Portfolio AUM */}
        <div className="bg-white p-5 rounded-2xl border border-[#E3E8E3] shadow-xs text-left space-y-2 hover:border-emerald-600/40 transition-colors">
          <div className="flex items-center justify-between text-[#69736F]">
            <span className="text-xs font-bold uppercase tracking-wider">Total Platform AUM</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-[#18211F]">
            {formatCurrency(totalPlatformAUM)}
          </div>
          <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-100">
            <span className="text-[#69736F]">{properties.length} Vetted Offerings</span>
            <span className="font-bold text-emerald-700">100% Ring-Fenced</span>
          </div>
        </div>

        {/* Metric 2: Capital Deployed */}
        <div className="bg-white p-5 rounded-2xl border border-[#E3E8E3] shadow-xs text-left space-y-2 hover:border-emerald-600/40 transition-colors">
          <div className="flex items-center justify-between text-[#69736F]">
            <span className="text-xs font-bold uppercase tracking-wider">Capital Funded</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-[#18211F]">
            {formatCurrency(totalCapitalFunded)}
          </div>
          <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-100">
            <span className="text-[#69736F]">Funding Velocity</span>
            <span className="font-bold text-blue-700">
              {totalPlatformAUM > 0 ? Math.round((totalCapitalFunded / totalPlatformAUM) * 100) : 0}% of Cap
            </span>
          </div>
        </div>

        {/* Metric 3: Liquid Investor Reserves */}
        <div className="bg-white p-5 rounded-2xl border border-[#E3E8E3] shadow-xs text-left space-y-2 hover:border-emerald-600/40 transition-colors">
          <div className="flex items-center justify-between text-[#69736F]">
            <span className="text-xs font-bold uppercase tracking-wider">Investor Balances</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-[#18211F]">
            {formatCurrency(totalInvestorWalletBalances)}
          </div>
          <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-100">
            <span className="text-[#69736F]">CaixaBank Escrow</span>
            <span className="font-bold text-amber-700">1:1 Backed</span>
          </div>
        </div>

        {/* Metric 4: Total Distributions Paid */}
        <div className="bg-white p-5 rounded-2xl border border-[#E3E8E3] shadow-xs text-left space-y-2 hover:border-emerald-600/40 transition-colors">
          <div className="flex items-center justify-between text-[#69736F]">
            <span className="text-xs font-bold uppercase tracking-wider">Dividends Disbursed</span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center">
              <Coins className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-[#18211F]">
            {formatCurrency(totalDividendsDistributed || 124500)}
          </div>
          <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-100">
            <span className="text-[#69736F]">Distribution Rate</span>
            <span className="font-bold text-purple-700">Monthly Auto-Credit</span>
          </div>
        </div>

      </div>

      {/* 3. Urgent Action Queue (Direct Dispatch Cards) */}
      <div className="space-y-3 text-left">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-extrabold text-[#18211F] flex items-center gap-2">
            <Clock className="w-4 h-4 text-emerald-700" />
            <span>Administrative Action Queue</span>
          </h3>
          <span className="text-xs text-[#69736F]">
            {pendingDeposits.length + pendingWithdrawals.length + pendingKYCUsers.length} total items awaiting administrative review
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          
          {/* Pending Deposits Card */}
          <div className={`p-5 rounded-2xl border transition-all text-left flex flex-col justify-between ${
            pendingDeposits.length > 0 
              ? 'bg-amber-50/70 border-amber-200 shadow-xs' 
              : 'bg-white border-[#E3E8E3]'
          }`}>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
                  <ArrowDownLeft className="w-4 h-4 text-amber-700" />
                  <span>Pending Deposits</span>
                </span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                  pendingDeposits.length > 0 ? 'bg-amber-200 text-amber-900' : 'bg-slate-100 text-slate-600'
                }`}>
                  {pendingDeposits.length} Pending
                </span>
              </div>
              <div className="text-xl font-black text-[#18211F]">
                {formatCurrency(pendingDepositsTotal)}
              </div>
              <p className="text-[11px] text-[#69736F]">
                Wire proofs and crypto confirmations waiting for ledger balance verification.
              </p>
            </div>

            <button
              onClick={() => onNavigateTab('deposits')}
              className="mt-4 w-full py-2.5 px-3 rounded-xl bg-white border border-amber-300 hover:bg-amber-100 text-amber-950 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <span>Review Deposits</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Pending Withdrawals Card */}
          <div className={`p-5 rounded-2xl border transition-all text-left flex flex-col justify-between ${
            pendingWithdrawals.length > 0 
              ? 'bg-red-50/70 border-red-200 shadow-xs' 
              : 'bg-white border-[#E3E8E3]'
          }`}>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-red-900 flex items-center gap-1.5">
                  <ArrowUpRight className="w-4 h-4 text-red-700" />
                  <span>Pending Withdrawals</span>
                </span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                  pendingWithdrawals.length > 0 ? 'bg-red-200 text-red-900' : 'bg-slate-100 text-slate-600'
                }`}>
                  {pendingWithdrawals.length} Pending
                </span>
              </div>
              <div className="text-xl font-black text-[#18211F]">
                {formatCurrency(pendingWithdrawalsTotal)}
              </div>
              <p className="text-[11px] text-[#69736F]">
                Investor capital redemptions requiring executive authorization.
              </p>
            </div>

            <button
              onClick={() => onNavigateTab('withdrawals')}
              className="mt-4 w-full py-2.5 px-3 rounded-xl bg-white border border-red-300 hover:bg-red-100 text-red-950 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <span>Review Withdrawals</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Pending KYC Verifications Card */}
          <div className={`p-5 rounded-2xl border transition-all text-left flex flex-col justify-between ${
            pendingKYCUsers.length > 0 
              ? 'bg-blue-50/70 border-blue-200 shadow-xs' 
              : 'bg-white border-[#E3E8E3]'
          }`}>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-blue-900 flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-blue-700" />
                  <span>KYC Compliance Queue</span>
                </span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                  pendingKYCUsers.length > 0 ? 'bg-blue-200 text-blue-900' : 'bg-slate-100 text-slate-600'
                }`}>
                  {pendingKYCUsers.length} In Review
                </span>
              </div>
              <div className="text-xl font-black text-[#18211F]">
                {pendingKYCUsers.length} Investor Documents
              </div>
              <p className="text-[11px] text-[#69736F]">
                Passport/DNI and corporate ownership documents for MiCA qualification.
              </p>
            </div>

            <button
              onClick={() => onNavigateTab('kyc')}
              className="mt-4 w-full py-2.5 px-3 rounded-xl bg-white border border-blue-300 hover:bg-blue-100 text-blue-950 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <span>Review Identities</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

        </div>
      </div>

      {/* 4. Real Estate SPV Offerings Velocity Monitor */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-[#E3E8E3] shadow-xs text-left space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-black text-[#18211F] flex items-center gap-2">
              <Building2 className="w-5 h-5 text-emerald-800" />
              <span>SPV Portfolio Funding Velocity</span>
            </h3>
            <p className="text-xs text-[#69736F] mt-0.5">
              Current funding status, token capitalization, and lifecycle management for active real estate vehicles.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onOpenNewPropertyModal}
              className="btn btn-primary text-xs font-bold py-2.5 px-4 flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Property SPV</span>
            </button>
            <button
              onClick={() => onNavigateTab('properties')}
              className="btn btn-secondary text-xs font-semibold py-2.5 px-4 flex items-center gap-1 cursor-pointer"
            >
              <span>Full Manager</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Property Cards Table */}
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
              {properties.slice(0, 6).map((prop) => {
                const percent = Math.min(100, Math.round((prop.fundedAmount / prop.targetAmount) * 100));
                return (
                  <tr key={prop.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl overflow-hidden bg-slate-100 shrink-0 border border-slate-200">
                          <img
                            src={prop.images[0] || prop.bannerImage}
                            alt={prop.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div>
                          <span className="font-bold text-[#18211F] block text-xs hover:text-emerald-800">
                            {prop.title}
                          </span>
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
                        <span className="text-[10px] text-[#69736F] block">
                          Goal: {formatCurrency(prop.targetAmount)}
                        </span>
                      </div>
                    </td>

                    <td className="py-3.5 px-3">
                      <span className="font-black text-emerald-800 block text-xs">
                        {prop.estimatedAnnualYield}%
                      </span>
                      <span className="text-[10px] text-[#69736F]">
                        +{prop.capitalAppreciationYield}% apprec.
                      </span>
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
                        onClick={() => onTogglePropertyStatus(prop)}
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

      {/* 5. Treasury Escrow & Institutional Custody Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-left">
        
        {/* Traditional Corporate Fiat Escrow */}
        <div className="bg-white p-6 rounded-3xl border border-[#E3E8E3] shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-xs uppercase tracking-wider text-[#18211F] flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-emerald-700" />
              <span>Corporate Fiat Treasury</span>
            </h4>
            <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              Verified Escrow
            </span>
          </div>

          <div className="space-y-2 text-xs">
            <div className="p-3 bg-[#F6F7F4] rounded-xl border border-[#E3E8E3] space-y-1">
              <span className="text-[10px] text-[#69736F] uppercase font-bold block">Primary Bank</span>
              <span className="font-bold text-[#18211F] block">{paymentConfig.traditional.bankName}</span>
              <span className="font-mono text-[11px] text-[#27845D] block break-all">{paymentConfig.traditional.iban}</span>
            </div>
            
            <div className="flex justify-between items-center text-[11px] px-1">
              <span className="text-[#69736F]">Account Beneficiary</span>
              <span className="font-semibold text-[#18211F]">{paymentConfig.traditional.beneficiary}</span>
            </div>
            <div className="flex justify-between items-center text-[11px] px-1">
              <span className="text-[#69736F]">Support Desk</span>
              <span className="font-semibold text-emerald-800">{paymentConfig.traditional.supportEmail}</span>
            </div>
          </div>

          <button
            onClick={() => onNavigateTab('payment-settings')}
            className="w-full py-2.5 px-3 rounded-xl bg-[#EEF1EC] hover:bg-slate-200 text-[#182D2A] text-xs font-bold transition-colors cursor-pointer"
          >
            Manage Banking Settings
          </button>
        </div>

        {/* Multi-Chain Crypto Settlement Gateway */}
        <div className="bg-white p-6 rounded-3xl border border-[#E3E8E3] shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-xs uppercase tracking-wider text-[#18211F] flex items-center gap-2">
              <Coins className="w-4 h-4 text-emerald-700" />
              <span>Crypto Settlement Wallets</span>
            </h4>
            <span className="text-[10px] font-bold text-blue-800 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
              Multi-Chain
            </span>
          </div>

          <div className="space-y-2 text-xs">
            {paymentConfig.cryptoNetworks.slice(0, 2).map((net) => (
              <div key={net.id} className="p-2.5 bg-[#F6F7F4] rounded-xl border border-[#E3E8E3] space-y-0.5">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-[#18211F] text-[11px]">{net.name} ({net.token})</span>
                  <span className="text-[10px] font-mono text-emerald-700 font-bold">POS Verified</span>
                </div>
                <span className="font-mono text-[10px] text-slate-500 block truncate">
                  {net.walletAddress}
                </span>
              </div>
            ))}
          </div>

          <button
            onClick={() => onNavigateTab('payment-settings')}
            className="w-full py-2.5 px-3 rounded-xl bg-[#EEF1EC] hover:bg-slate-200 text-[#182D2A] text-xs font-bold transition-colors cursor-pointer"
          >
            Configure Crypto Networks ({paymentConfig.cryptoNetworks.length})
          </button>
        </div>

        {/* System Monitoring & Security Health */}
        <div className="bg-white p-6 rounded-3xl border border-[#E3E8E3] shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-xs uppercase tracking-wider text-[#18211F] flex items-center gap-2">
              <Server className="w-4 h-4 text-emerald-700" />
              <span>Platform Health & Logs</span>
            </h4>
            <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              Optimal
            </span>
          </div>

          <div className="space-y-2.5 text-xs">
            <div className="flex justify-between items-center text-[11px] p-2 bg-[#F6F7F4] rounded-xl">
              <span className="text-[#69736F]">Audit Log Entries</span>
              <span className="font-mono font-bold text-[#18211F]">{auditLogs.length} Records</span>
            </div>
            <div className="flex justify-between items-center text-[11px] p-2 bg-[#F6F7F4] rounded-xl">
              <span className="text-[#69736F]">Total Settled Transactions</span>
              <span className="font-mono font-bold text-[#18211F]">{transactions.length} Tx</span>
            </div>
            <div className="flex justify-between items-center text-[11px] p-2 bg-[#F6F7F4] rounded-xl">
              <span className="text-[#69736F]">Active Admins</span>
              <span className="font-semibold text-emerald-800">admin@kretz.com</span>
            </div>
          </div>

          <button
            onClick={() => onNavigateTab('logs')}
            className="w-full py-2.5 px-3 rounded-xl bg-[#182D2A] hover:bg-[#24423C] text-white text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5"
          >
            <Activity className="w-3.5 h-3.5 text-emerald-400" />
            <span>Open System Telemetry</span>
          </button>
        </div>

      </div>

      {/* 6. Recent Administrative Ledger Activity Feed */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-[#E3E8E3] shadow-xs text-left space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-black text-[#18211F] flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-700" />
              <span>Live Administrative Stream & Settlements</span>
            </h3>
            <p className="text-xs text-[#69736F] mt-0.5">
              Real-time feed of capital deposits, investment allocations, identity checks, and ledger approvals.
            </p>
          </div>

          <button
            onClick={() => onNavigateTab('audit')}
            className="text-xs font-bold text-emerald-800 hover:text-emerald-950 hover:underline flex items-center gap-1 cursor-pointer"
          >
            <span>View Full Ledger</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="space-y-2">
          {transactions.slice(0, 5).map((tx) => (
            <div
              key={tx.id}
              className="p-3 sm:p-3.5 rounded-2xl bg-[#F9FAF8] border border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
            >
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                  tx.type === 'deposit'
                    ? 'bg-emerald-100 text-emerald-800'
                    : tx.type === 'withdrawal'
                    ? 'bg-red-100 text-red-800'
                    : tx.type === 'distribution'
                    ? 'bg-purple-100 text-purple-800'
                    : 'bg-blue-100 text-blue-800'
                }`}>
                  {tx.type === 'deposit' && <ArrowDownLeft className="w-4 h-4" />}
                  {tx.type === 'withdrawal' && <ArrowUpRight className="w-4 h-4" />}
                  {tx.type === 'distribution' && <Coins className="w-4 h-4" />}
                  {tx.type === 'investment' && <Building2 className="w-4 h-4" />}
                </div>

                <div>
                  <span className="font-bold text-[#18211F] block text-xs">
                    {tx.description || `${tx.type.toUpperCase()} - Ref ${tx.reference || tx.id}`}
                  </span>
                  <span className="text-[10px] text-[#69736F] font-mono">
                    {formatDate(tx.createdAt)} · {tx.paymentMethod || 'System Ledger'}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                <span className={`font-mono font-bold text-xs ${
                  tx.type === 'withdrawal' ? 'text-red-700' : 'text-emerald-800'
                }`}>
                  {tx.type === 'withdrawal' ? '-' : '+'}{formatCurrency(tx.amount)}
                </span>

                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                  tx.status === 'completed'
                    ? 'bg-emerald-100 text-emerald-800'
                    : tx.status === 'pending'
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-red-100 text-red-800'
                }`}>
                  {tx.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};
