import React, { useState } from 'react';
import { useAuth } from '../../lib/auth';
import { ledger } from '../../lib/ledger';
import { BalanceCard } from '../dashboard/BalanceCard';
import { PortfolioOverview } from '../dashboard/PortfolioOverview';
import { TransactionTable } from '../dashboard/TransactionTable';
import { DistributionsView } from '../dashboard/DistributionsView';
import { WithdrawalModal } from '../dashboard/WithdrawalModal';
import { DocumentViewerModal } from '../dashboard/DocumentViewerModal';
import { ProfilePage } from './ProfilePage';
import { PropertyCard } from '../properties/PropertyCard';
import { 
  ArrowRight, Bell, Building2, TrendingUp, Wallet, ShieldCheck, History, 
  PieChart, ArrowDownLeft, ArrowUpRight, HelpCircle, User, FileText, LayoutDashboard, Coins,
  Share2, Award, CheckCircle2, AlertCircle, ExternalLink, Copy, Check, Menu, X
} from 'lucide-react';
import { formatCurrency, formatDate } from '../../lib/utils';

interface DashboardPageProps {
  defaultTab?: string;
  onSelectProperty: (propertyId: string) => void;
  onExploreProperties: () => void;
  onNavigateProfile: () => void;
  onNavigateTransactions: () => void;
  onNavigatePortfolio: () => void;
  onNavigateHome?: () => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  defaultTab = 'overview',
  onSelectProperty,
  onExploreProperties,
  onNavigateProfile,
  onNavigateTransactions,
  onNavigatePortfolio,
  onNavigateHome,
}) => {
  const { user, refreshUser } = useAuth();
  const [activeTab, setActiveTab] = useState<string>(defaultTab);
  const [isDepositOpen, setIsDepositOpen] = useState(false);
  const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);
  const [selectedDocInvestment, setSelectedDocInvestment] = useState<any | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);

  if (!user) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center p-8 bg-[#F6F7F4]">
        <div className="w-8 h-8 border-3 border-[#182D2A] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const investments = ledger.getInvestments(user.id);
  const transactions = ledger.getTransactions(user.id);
  const notifications = ledger.getNotifications(user.id);
  const properties = ledger.getProperties();

  const handleWithdrawalSuccess = () => {
    refreshUser();
  };

  const referralLink = `https://realtyfund.eu/register?ref=${user.email.split('@')[0].toUpperCase()}`;

  const copyReferral = () => {
    navigator.clipboard.writeText(referralLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const navItems = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'portfolio', label: 'My Portfolio', icon: Building2, count: investments.length },
    { id: 'properties', label: 'Explore Properties', icon: TrendingUp },
    { id: 'transactions', label: 'Transactions', icon: History, count: transactions.length },
    { id: 'distributions', label: 'Distributions', icon: Coins },
    { id: 'wallet', label: 'Wallet', icon: Wallet },
    { id: 'documents', label: 'Documents', icon: FileText, count: investments.length },
    { id: 'referrals', label: 'Referrals', icon: Share2 },
    { id: 'notifications', label: 'Notifications', icon: Bell, count: notifications.length },
    { id: 'profile', label: 'Profile & Settings', icon: User },
    { id: 'support', label: 'Help & Support', icon: HelpCircle },
  ];

  return (
    <div className="app-shell bg-[#0F1E1B]">
      {/* Desktop Fixed-Width Sidebar */}
      <aside className="app-sidebar hidden md:flex">
        {/* Brand / Logo */}
        <div 
          onClick={onNavigateHome}
          className="p-6 border-b border-[#1E332E] flex items-center gap-3 cursor-pointer hover:opacity-90 transition-opacity"
        >
          <div className="w-10 h-10 rounded-2xl bg-[#B7E36A] text-[#182D2A] flex items-center justify-center font-black text-base shadow-sm">
            KZ
          </div>
          <div>
            <h2 className="font-black text-sm text-white tracking-tight">Kretz Real Estate</h2>
            <p className="text-[10px] text-[#A0A8A5]">Prestige & Tokenized Real Estate</p>
          </div>
        </div>

        {/* User Mini Card */}
        <div className="p-3 mx-4 my-3 bg-[#1E332E] rounded-2xl border border-[#2D4540] flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#B7E36A] text-[#182D2A] flex items-center justify-center font-bold text-xs shrink-0">
            {user.fullName.split(' ').map(n => n[0]).join('')}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-bold text-xs text-white truncate">{user.fullName}</h3>
            <div className="flex items-center gap-1.5 mt-0.5">
              {user.kycStatus === 'verified' && (
                <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-[#B7E36A] bg-[#27845D]/30 px-1.5 py-0.5 rounded-full">
                  <ShieldCheck className="w-2.5 h-2.5" /> Verified
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 overflow-y-auto px-3 py-1 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  isActive
                    ? 'bg-[#B7E36A] text-[#182D2A] shadow-sm'
                    : 'text-[#A0A8A5] hover:bg-[#1E332E] hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-[#182D2A]' : 'text-[#69736F]'}`} />
                  <span>{item.label}</span>
                </div>
                {item.count !== undefined && item.count > 0 && (
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    isActive ? 'bg-[#182D2A] text-white' : 'bg-[#2D4540] text-white'
                  }`}>
                    {item.count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Sidebar Footer / Deposit Button */}
        <div className="p-4 border-t border-[#1E332E] space-y-2 bg-[#142421]">
          <button
            onClick={() => setIsWithdrawOpen(true)}
            className="w-full btn btn-secondary text-xs font-semibold justify-center bg-transparent text-white border-[#2D4540] hover:bg-[#1E332E]"
          >
            <ArrowUpRight className="w-3.5 h-3.5 mr-1.5" /> Withdraw
          </button>
        </div>
      </aside>

      {/* Main Content Wrapper */}
      <div className="app-main-area pb-16 md:pb-0">
        {/* Top Header Bar */}
        <header className="bg-[#142421] border-b border-[#1E332E] h-16 shrink-0 z-20 px-4 sm:px-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="md:hidden w-8 h-8 rounded-xl bg-[#B7E36A] text-[#182D2A] flex items-center justify-center font-black text-xs">
              {user.fullName.split(' ').map(n => n[0]).join('')}
            </div>
            <div>
              <h1 className="text-sm sm:text-lg font-black text-white capitalize">
                {activeTab === 'profile' ? 'Profile & Settings' : activeTab === 'properties' ? 'Explore Properties' : activeTab}
              </h1>
              <p className="text-[10px] sm:text-xs text-[#A0A8A5] hidden sm:block">
                European Tokenized Real Estate Portfolio Dashboard
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('notifications')}
              className="relative p-2 rounded-xl bg-[#1E332E] text-white hover:text-white border border-[#2D4540]"
            >
              <Bell className="w-4 h-4" />
              {notifications.length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#B7E36A] text-[#182D2A] text-[9px] font-bold rounded-full flex items-center justify-center">
                  {notifications.length}
                </span>
              )}
            </button>
          </div>
        </header>

        {/* Scrollable Content Area */}
        <main className="app-content-scroll">
          <div className="max-w-7xl mx-auto space-y-6">

            {/* 1. OVERVIEW TAB */}
            {activeTab === 'overview' && (
              <div className="space-y-6 animate-in fade-in duration-200">
                {/* Welcome Back Widget */}
                <div className="bg-gradient-to-r from-[#182D2A] to-[#24423C] text-white p-6 sm:p-8 rounded-3xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
                  <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-no-repeat bg-right opacity-10 pointer-events-none bg-[radial-gradient(#B7E36A_1px,transparent_1px)] [background-size:16px_16px]"></div>
                  <div className="flex items-center gap-5 z-10">
                    <div className="w-16 h-16 rounded-2xl bg-[#B7E36A] text-[#182D2A] flex items-center justify-center font-black text-2xl shadow-md shrink-0 overflow-hidden">
                      {user.avatarUrl ? (
                        <img src={user.avatarUrl} alt={user.fullName} className="w-full h-full object-cover" />
                      ) : (
                        user.fullName.split(' ').map(n => n[0]).join('')
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#B7E36A] bg-white/10 px-2.5 py-0.5 rounded-full">
                          Investor Portal • Active Session
                        </span>
                        {user.kycStatus === 'verified' && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-300 bg-emerald-900/40 px-2 py-0.5 rounded-full">
                            <ShieldCheck className="w-3 h-3" /> Level 2 Verified
                          </span>
                        )}
                      </div>
                      <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                        Welcome back, {user.fullName}! 👋
                      </h2>
                      <p className="text-xs text-[#A0A8A5] mt-1">
                        Your real estate portfolio is generating stable monthly distributions across {investments.length} properties.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 z-10 shrink-0">
                    <button
                      onClick={() => setActiveTab('properties')}
                      className="btn bg-white/10 text-white hover:bg-white/20 border border-white/20 text-xs font-bold px-4 py-3"
                    >
                      Explore Properties
                    </button>
                  </div>
                </div>

                {notifications.length > 0 && (
                  <div className="bg-[#EEF1EC] border border-[#E3E8E3] p-4 rounded-2xl flex items-center justify-between gap-4 shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-white text-[#27845D] flex items-center justify-center shrink-0">
                        <Bell className="w-4 h-4" />
                      </div>
                      <div className="text-xs">
                        <span className="font-bold text-[#18211F] mr-1.5">{notifications[0].title}:</span>
                        <span className="text-[#69736F]">{notifications[0].message}</span>
                      </div>
                    </div>
                    <button onClick={() => setActiveTab('notifications')} className="text-xs font-bold text-[#182D2A] hover:underline whitespace-nowrap">
                      View All ({notifications.length})
                    </button>
                  </div>
                )}

                <BalanceCard
                  user={user}
                  onDeposit={() => setIsDepositOpen(true)}
                  onWithdraw={() => setIsWithdrawOpen(true)}
                />

                <div className="bg-white p-6 sm:p-8 rounded-3xl border border-[#E3E8E3] shadow-sm space-y-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-base sm:text-lg font-bold text-[#18211F]">Your Tokenized Assets</h3>
                      <p className="text-xs text-[#69736F]">Active real estate properties generating monthly rental yield</p>
                    </div>
                    <button
                      onClick={() => setActiveTab('portfolio')}
                      className="text-xs font-bold text-[#182D2A] hover:text-[#27845D] flex items-center gap-1"
                    >
                      View Full Portfolio <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <PortfolioOverview
                    investments={investments}
                    onSelectProperty={onSelectProperty}
                    onExploreMore={() => setActiveTab('properties')}
                  />
                </div>

                <div className="bg-white p-6 sm:p-8 rounded-3xl border border-[#E3E8E3] shadow-sm space-y-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-base sm:text-lg font-bold text-[#18211F]">Recent Transactions & Distributions</h3>
                      <p className="text-xs text-[#69736F]">Verifiable double-entry ledger record</p>
                    </div>
                    <button
                      onClick={() => setActiveTab('transactions')}
                      className="text-xs font-bold text-[#182D2A] hover:text-[#27845D] flex items-center gap-1"
                    >
                      All Transactions ({transactions.length}) <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <TransactionTable transactions={transactions} maxRows={5} />
                </div>
              </div>
            )}

            {/* 2. MY PORTFOLIO TAB */}
            {activeTab === 'portfolio' && (
              <div className="bg-white p-6 sm:p-8 rounded-3xl border border-[#E3E8E3] shadow-sm space-y-6 animate-in fade-in duration-200">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-black text-[#18211F]">My Real Estate Portfolio</h2>
                    <p className="text-xs text-[#69736F]">Holdings, tokenized shares, and certified SPV agreements.</p>
                  </div>
                  <button onClick={() => setActiveTab('properties')} className="btn btn-primary btn-sm text-xs font-bold">
                    Browse Marketplace (€1,000+)
                  </button>
                </div>
                <PortfolioOverview
                  investments={investments}
                  onSelectProperty={onSelectProperty}
                  onExploreMore={() => setActiveTab('properties')}
                />
              </div>
            )}

            {/* 3. EXPLORE PROPERTIES TAB */}
            {activeTab === 'properties' && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-[#E3E8E3]">
                  <div>
                    <h2 className="text-2xl font-black text-[#18211F]">Explore Investment Opportunities</h2>
                    <p className="text-xs text-[#69736F]">Institutional-grade European real estate tokenized from €1,000.</p>
                  </div>
                  <button onClick={onExploreProperties} className="btn btn-secondary btn-sm text-xs font-bold">
                    Open Full Marketplace View
                  </button>
                </div>

                <div className="property-grid">
                  {properties.map((property) => (
                    <PropertyCard
                      key={property.id}
                      property={property}
                      onSelect={(prop) => onSelectProperty(prop.id)}
                      onInvest={(prop) => {
                        onSelectProperty(prop.id);
                      }}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* 4. TRANSACTIONS TAB */}
            {activeTab === 'transactions' && (
              <div className="bg-white p-6 sm:p-8 rounded-3xl border border-[#E3E8E3] shadow-sm space-y-6 animate-in fade-in duration-200">
                <div>
                  <h2 className="text-2xl font-black text-[#18211F]">Transactions & Audit Ledger</h2>
                  <p className="text-xs text-[#69736F]">Immutable history of all deposits, withdrawals, property investments, and dividends.</p>
                </div>
                <TransactionTable transactions={transactions} />
              </div>
            )}

            {/* 5. DISTRIBUTIONS TAB */}
            {activeTab === 'distributions' && (
              <div className="animate-in fade-in duration-200">
                <DistributionsView
                  investments={investments}
                  transactions={transactions}
                  onSelectProperty={onSelectProperty}
                  onExploreProperties={() => setActiveTab('properties')}
                />
              </div>
            )}

            {/* 6. WALLET TAB */}
            {activeTab === 'wallet' && (
              <div className="space-y-6 animate-in fade-in duration-200 max-w-4xl mx-auto">
                <div className="bg-white p-8 rounded-3xl border border-[#E3E8E3] shadow-sm space-y-6">
                  <div>
                    <h2 className="text-2xl font-black text-[#18211F]">Investor Wallet & Balances</h2>
                    <p className="text-xs text-[#69736F]">Manage your liquidity, SEPA bank transfers, and automated dividend deposits.</p>
                  </div>

                  <BalanceCard
                    user={user}
                    onDeposit={() => setIsDepositOpen(true)}
                    onWithdraw={() => setIsWithdrawOpen(true)}
                  />

                  <div className="p-6 rounded-2xl bg-[#F6F7F4] border border-[#E3E8E3] space-y-3">
                    <button onClick={() => setIsWithdrawOpen(true)} className="btn btn-secondary btn-sm text-xs font-bold w-full">
                      Withdraw
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* 7. DOCUMENTS TAB */}
            {activeTab === 'documents' && (
              <div className="bg-white p-6 sm:p-8 rounded-3xl border border-[#E3E8E3] shadow-sm space-y-6 animate-in fade-in duration-200">
                <div>
                  <h2 className="text-2xl font-black text-[#18211F]">Investment Documents & Agreements</h2>
                  <p className="text-xs text-[#69736F]">Securely access notarized SPV share certificates, RICS independent appraisals, and purchase deeds.</p>
                </div>

                {investments.length === 0 ? (
                  <div className="text-center py-12 text-[#69736F] space-y-3">
                    <FileText className="w-12 h-12 mx-auto opacity-40" />
                    <p className="text-sm font-semibold">No investments yet to generate legal documents.</p>
                    <button onClick={() => setActiveTab('properties')} className="btn btn-primary btn-sm text-xs font-bold">
                      Explore Properties (€1,000+)
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {investments.map((inv) => {
                      const prop = properties.find(p => p.id === inv.propertyId);
                      return (
                        <div key={inv.id} className="p-5 rounded-2xl border border-[#E3E8E3] flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#F6F7F4]/50 hover:bg-[#F6F7F4] transition-colors">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-[#182D2A] text-[#B7E36A] flex items-center justify-center font-bold">
                              <FileText className="w-6 h-6" />
                            </div>
                            <div>
                              <h4 className="font-bold text-[#18211F] text-sm">{inv.propertyTitle || prop?.title || 'Real Estate Asset'}</h4>
                              <p className="text-xs text-[#69736F]">
                                Invested {formatCurrency(inv.totalAmountInvested)} · {inv.tokensPurchased} Tokens · {formatDate(inv.purchasedAt)}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setSelectedDocInvestment(inv)}
                              className="btn btn-secondary btn-sm text-xs font-bold"
                            >
                              <FileText className="w-3.5 h-3.5 mr-1" /> View SPV Certificate & Deed
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* 8. REFERRALS TAB */}
            {activeTab === 'referrals' && (
              <div className="bg-white p-6 sm:p-8 rounded-3xl border border-[#E3E8E3] shadow-sm space-y-6 animate-in fade-in duration-200 max-w-4xl mx-auto">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-[#EEF1EC] text-[#27845D] flex items-center justify-center">
                    <Share2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-[#18211F]">Investor Referral Program</h2>
                    <p className="text-xs text-[#69736F]">Earn €500 in platform credit for every investor who joins and funds their account.</p>
                  </div>
                </div>

                <div className="p-6 rounded-2xl bg-[#F6F7F4] border border-[#E3E8E3] space-y-4">
                  <label className="block text-xs font-bold text-[#18211F]">Your Unique Referral Link</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={referralLink}
                      className="w-full px-4 py-2.5 rounded-xl border border-[#E3E8E3] bg-white text-xs font-mono text-[#69736F]"
                    />
                    <button
                      onClick={copyReferral}
                      className="btn btn-primary text-xs font-bold px-4 py-2.5 flex items-center gap-1.5 shrink-0"
                    >
                      {copiedLink ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      {copiedLink ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
                  <div className="p-5 rounded-2xl border border-[#E3E8E3] bg-white">
                    <div className="text-2xl font-black text-[#18211F]">0</div>
                    <div className="text-xs text-[#69736F] mt-1">Successful Referrals</div>
                  </div>
                  <div className="p-5 rounded-2xl border border-[#E3E8E3] bg-white">
                    <div className="text-2xl font-black text-[#27845D]">€0.00</div>
                    <div className="text-xs text-[#69736F] mt-1">Referral Bonuses Earned</div>
                  </div>
                  <div className="p-5 rounded-2xl border border-[#E3E8E3] bg-white">
                    <div className="text-2xl font-black text-[#18211F]">€500</div>
                    <div className="text-xs text-[#69736F] mt-1">Bonus Per Investor</div>
                  </div>
                </div>
              </div>
            )}

            {/* 9. NOTIFICATIONS TAB */}
            {activeTab === 'notifications' && (
              <div className="bg-white p-6 sm:p-8 rounded-3xl border border-[#E3E8E3] shadow-sm space-y-6 animate-in fade-in duration-200 max-w-3xl mx-auto">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-black text-[#18211F]">Notification Center</h2>
                    <p className="text-xs text-[#69736F]">Account alerts, investment confirmations, and distribution logs.</p>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-[#EEF1EC] text-[#27845D] text-xs font-bold">
                    {notifications.length} Unread
                  </span>
                </div>

                {notifications.length === 0 ? (
                  <div className="text-center py-12 text-[#69736F] space-y-2">
                    <Bell className="w-10 h-10 mx-auto opacity-40" />
                    <p className="text-sm font-semibold">You have no new notifications.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {notifications.map((notif) => (
                      <div key={notif.id} className="p-4 rounded-2xl border border-[#E3E8E3] bg-[#F6F7F4]/60 flex items-start gap-4">
                        <div className="w-10 h-10 rounded-xl bg-white text-[#27845D] flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                          <Bell className="w-5 h-5" />
                        </div>
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center justify-between">
                            <h4 className="font-bold text-[#18211F] text-xs">{notif.title}</h4>
                            <span className="text-[10px] text-[#828D89]">{formatDate(notif.createdAt)}</span>
                          </div>
                          <p className="text-xs text-[#69736F]">{notif.message}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 10. PROFILE & SETTINGS TAB */}
            {activeTab === 'profile' && (
              <div className="animate-in fade-in duration-200">
                <ProfilePage />
              </div>
            )}

            {/* 11. HELP & SUPPORT TAB */}
            {activeTab === 'support' && (
              <div className="bg-white p-8 rounded-3xl border border-[#E3E8E3] shadow-sm space-y-6 animate-in fade-in duration-200 max-w-3xl mx-auto">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-[#EEF1EC] text-[#27845D] flex items-center justify-center shrink-0">
                    <HelpCircle className="w-6 h-6" />
                  </div>
                  <div className="flex-1 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h2 className="text-2xl font-black text-[#18211F]">Investor Support & Help Center</h2>
                      <p className="text-xs text-[#69736F]">Powered by Smartsupp Customer Support · Email: <strong className="text-[#182D2A]">info@kretz.site</strong></p>
                    </div>
                    <button
                      onClick={() => {
                        if (typeof window !== 'undefined' && window.smartsupp) {
                          try { window.smartsupp('chat:open'); } catch { }
                        }
                        alert('Smartsupp Live Chat is online! Use the Smartsupp widget at the bottom right or email info@kretz.site for direct assistance.');
                      }}
                      className="px-4 py-2.5 rounded-xl bg-[#182D2A] text-white font-bold text-xs hover:bg-[#24423C] transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer shrink-0"
                    >
                      <Bell className="w-3.5 h-3.5 text-[#B7E36A]" />
                      <span>Start Smartsupp Live Chat</span>
                    </button>
                  </div>
                </div>

                <div className="space-y-4 text-xs text-left">
                  {/* Smartsupp Support Banner */}
                  <div className="p-5 rounded-2xl bg-[#182D2A] text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                        <h3 className="font-bold text-sm text-white">Smartsupp Live Support Active</h3>
                      </div>
                      <p className="text-xs text-slate-300">
                        Our specialized real estate advisors respond in under 2 minutes. You can also send formal documentation directly to <strong className="text-[#B7E36A]">info@kretz.site</strong>.
                      </p>
                    </div>
                    <a
                      href="mailto:info@kretz.site"
                      className="px-4 py-2 rounded-xl bg-[#24423C] hover:bg-[#2e544c] border border-emerald-500/30 text-[#B7E36A] font-bold text-xs whitespace-nowrap cursor-pointer"
                    >
                      info@kretz.site
                    </a>
                  </div>

                  <div className="p-5 rounded-2xl bg-[#F6F7F4] border border-[#E3E8E3] space-y-2">
                    <h3 className="font-bold text-[#18211F] text-sm">Frequently Asked Questions</h3>
                    <ul className="space-y-2 text-[#69736F]">
                      <li>• <strong>When are rental dividends paid?</strong> Dividends are credited automatically to your available balance on the 1st of every month.</li>
                      <li>• <strong>How do I withdraw funds?</strong> Go to your wallet balance and click Withdraw. SEPA transfers take 1-2 business days.</li>
                      <li>• <strong>What is the minimum investment?</strong> All properties have a minimum investment threshold of €1,000.</li>
                      <li>• <strong>What is the support email?</strong> Our official contact and support email is <strong className="text-[#182D2A]">info@kretz.site</strong>.</li>
                    </ul>
                  </div>

                  <div className="p-6 rounded-2xl border border-[#E3E8E3] space-y-4">
                    <h3 className="font-bold text-[#18211F] text-sm">Send Ticket to info@kretz.site</h3>
                    <form onSubmit={(e) => { e.preventDefault(); alert('Inquiry sent to info@kretz.site! An advisor will respond within 2 hours.'); }} className="space-y-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-[#69736F] mb-1">Subject</label>
                        <input type="text" placeholder="e.g. Question about SEPA deposit or SPV deed" required className="w-full px-4 py-2.5 rounded-xl border border-[#E3E8E3] text-xs focus:outline-none focus:border-[#182D2A]" />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-[#69736F] mb-1">Message</label>
                        <textarea rows={4} placeholder="Describe your inquiry..." required className="w-full px-4 py-2.5 rounded-xl border border-[#E3E8E3] text-xs focus:outline-none focus:border-[#182D2A]" />
                      </div>
                      <button type="submit" className="btn btn-primary text-xs font-bold px-6">
                        Send to info@kretz.site
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="mobile-bottom-nav">
        {[
          { id: 'overview', label: 'Overview', icon: LayoutDashboard },
          { id: 'portfolio', label: 'Portfolio', icon: Building2 },
          { id: 'properties', label: 'Explore', icon: TrendingUp },
          { id: 'transactions', label: 'Ledger', icon: History },
          { id: 'more', label: 'More', icon: Coins, isMore: true },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = !tab.isMore && activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                if (tab.isMore) {
                  setIsMoreMenuOpen(true);
                } else {
                  setActiveTab(tab.id);
                }
              }}
              className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl text-[10px] font-bold transition-all ${
                isActive ? 'text-[#27845D]' : 'text-[#69736F] hover:text-[#18211F]'
              }`}
            >
              <Icon className="w-5 h-5 mb-1" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </nav>

      {/* More Menu Modal / Bottom Sheet for Mobile */}
      {isMoreMenuOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 md:hidden flex flex-col justify-end animate-in fade-in duration-200">
          <div className="bg-white rounded-t-3xl p-6 max-h-[80vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between border-b border-[#E3E8E3] pb-3">
              <h3 className="font-bold text-sm text-[#18211F]">All Dashboard Sections</h3>
              <button onClick={() => setIsMoreMenuOpen(false)} className="text-xs font-bold text-[#69736F]">Close</button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveTab(item.id);
                      setIsMoreMenuOpen(false);
                    }}
                    className={`flex items-center gap-2.5 p-3 rounded-2xl text-xs font-bold text-left border transition-all ${
                      isActive ? 'bg-[#182D2A] text-white border-[#182D2A]' : 'bg-[#F6F7F4] text-[#18211F] border-[#E3E8E3]'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Withdrawal Modal */}
      <WithdrawalModal
        isOpen={isWithdrawOpen}
        onClose={() => setIsWithdrawOpen(false)}
        onSuccess={handleWithdrawalSuccess}
        onNavigateProfile={() => setActiveTab('profile')}
      />

      {/* Document Viewer Modal */}
      <DocumentViewerModal
        investment={selectedDocInvestment}
        isOpen={!!selectedDocInvestment}
        onClose={() => setSelectedDocInvestment(null)}
      />
    </div>
  );
};
