import React, { useState } from 'react';
import { useAuth } from '../../lib/auth';
import { ledger } from '../../lib/ledger';
import { BalanceCard } from '../dashboard/BalanceCard';
import { PortfolioOverview } from '../dashboard/PortfolioOverview';
import { MyPropertyInvestments } from '../dashboard/MyPropertyInvestments';
import { UnitPurchaseModal } from '../properties/UnitPurchaseModal';
import { TransactionTable } from '../dashboard/TransactionTable';
import { DistributionsView } from '../dashboard/DistributionsView';
import { WithdrawalModal } from '../dashboard/WithdrawalModal';
import { DepositModal } from '../dashboard/DepositModal';
import { DocumentViewerModal } from '../dashboard/DocumentViewerModal';
import { DocumentUploadVault } from '../dashboard/DocumentUploadVault';
import { ProfilePage } from './ProfilePage';
import { PropertyCard } from '../properties/PropertyCard';
import { PropertyDocumentViewer } from '../documents/PropertyDocumentViewer';
import { Property } from '../../types/property';
import { 
  ArrowRight, Bell, Building2, TrendingUp, Wallet, ShieldCheck, History, 
  PieChart, ArrowDownLeft, ArrowUpRight, HelpCircle, User, FileText, LayoutDashboard, Coins,
  Share2, Award, CheckCircle2, AlertCircle, ExternalLink, Copy, Check, Menu, X, UploadCloud, LayoutGrid, LogOut,
  Search, ChevronDown
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
  const { user, refreshUser, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<string>(defaultTab);
  const [isDepositOpen, setIsDepositOpen] = useState(defaultTab === 'deposit');
  const [isWithdrawOpen, setIsWithdrawOpen] = useState(defaultTab === 'withdraw');
  const [selectedDocInvestment, setSelectedDocInvestment] = useState<any | null>(null);
  const [brochureProperty, setBrochureProperty] = useState<Property | null>(null);
  const [buyModalProperty, setBuyModalProperty] = useState<Property | null>(null);
  const [buyModalMode, setBuyModalMode] = useState<'purchase' | 'reinvest'>('purchase');
  const [isBuyModalOpen, setIsBuyModalOpen] = useState<boolean>(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [mobileHeaderMenuOpen, setMobileHeaderMenuOpen] = useState(false);

  React.useEffect(() => {
    if (defaultTab === 'deposit') {
      setActiveTab('wallet');
      setIsDepositOpen(true);
    } else if (defaultTab === 'withdraw') {
      setActiveTab('wallet');
      setIsWithdrawOpen(true);
    } else if (defaultTab) {
      setActiveTab(defaultTab);
    }
  }, [defaultTab]);

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
  const verificationDocs = ledger.getVerificationDocuments(user.id);
  const pendingDocsCount = verificationDocs.filter(d => d.status === 'pending').length;

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
    { id: 'verification', label: 'Profile Settings', icon: User },
    { id: 'documents', label: 'Documents', icon: FileText, count: investments.length },
    { id: 'referrals', label: 'Referrals', icon: Share2 },
    { id: 'notifications', label: 'Notifications', icon: Bell, count: notifications.length },
    { id: 'support', label: 'Help & Support', icon: HelpCircle },
  ];

  return (
    <div className="app-shell bg-[#0F1E1B]">
      {/* Desktop Fixed-Width Sidebar */}
      <aside className="app-sidebar hidden md:flex">
        {/* Brand / Logo */}
        <div 
          onClick={onNavigateHome}
          className="p-3.5 border-b border-[#1E332E] flex items-center gap-2.5 cursor-pointer hover:opacity-90 transition-opacity"
        >
          <div className="w-8 h-8 rounded-xl bg-[#B7E36A] text-[#182D2A] flex items-center justify-center font-black text-xs shadow-xs">
            KZ
          </div>
          <div>
            <h2 className="font-bold text-xs text-white tracking-tight leading-tight">Kretz Real Estate</h2>
            <p className="text-[9px] text-[#A0A8A5] leading-tight">Prestige & Tokenized Assets</p>
          </div>
        </div>

        {/* User Mini Card */}
        <div className="p-2 mx-3 my-2 bg-[#1E332E] rounded-xl border border-[#2D4540] flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-[#B7E36A] text-[#182D2A] flex items-center justify-center font-bold text-[11px] shrink-0">
            {user.fullName.split(' ').map(n => n[0]).join('')}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-bold text-xs text-white truncate leading-tight">{user.fullName}</h3>
            <div className="flex items-center gap-1 mt-0.5">
              {user.kycStatus === 'verified' && (
                <span className="inline-flex items-center gap-0.5 text-[8.5px] font-bold text-[#B7E36A] bg-[#27845D]/30 px-1.5 py-0.2 rounded-full">
                  <ShieldCheck className="w-2 h-2" /> Verified
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 overflow-y-auto px-2.5 py-1 space-y-0.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-[#B7E36A] text-[#182D2A] shadow-xs'
                    : 'text-[#A0A8A5] hover:bg-[#1E332E] hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-[#182D2A]' : 'text-[#69736F]'}`} />
                  <span className="truncate">{item.label}</span>
                </div>
                {item.count !== undefined && item.count > 0 && (
                  <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-bold ${
                    isActive ? 'bg-[#182D2A] text-white' : 'bg-[#2D4540] text-white'
                  }`}>
                    {item.count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Sidebar Shortcut Nav Bar including Logout */}
        <div className="p-3 border-t border-[#1E332E] bg-[#142421] space-y-2">
          <div className="text-[10px] font-extrabold uppercase tracking-wider text-[#A0A8A5] px-1 flex items-center justify-between">
            <span>Shortcut Navbar</span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#B7E36A] animate-pulse"></span>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            <button
              onClick={() => setIsDepositOpen(true)}
              className="flex items-center justify-center gap-1 bg-[#B7E36A] hover:bg-[#a6d557] text-[#182D2A] text-[11px] font-bold rounded-lg py-1.5 px-2 shadow-xs transition-colors cursor-pointer"
              title="Deposit Funds"
            >
              <ArrowDownLeft className="w-3 h-3 stroke-[2.5]" /> Deposit
            </button>
            <button
              onClick={() => setIsWithdrawOpen(true)}
              className="flex items-center justify-center gap-1 bg-[#1E332E] hover:bg-[#274540] text-white border border-[#2D4540] text-[11px] font-semibold rounded-lg py-1.5 px-2 transition-colors cursor-pointer"
              title="Withdraw Funds"
            >
              <ArrowUpRight className="w-3 h-3" /> Withdraw
            </button>
          </div>
          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-1.5 bg-red-950/40 hover:bg-red-900/60 text-red-300 border border-red-900/50 text-[11px] font-bold rounded-lg py-1.5 px-2 transition-colors cursor-pointer shadow-xs"
            title="Log out of account"
          >
            <LogOut className="w-3.5 h-3.5 text-red-400" />
            <span>Logout Account</span>
          </button>
        </div>
      </aside>

      {/* Main Content Wrapper */}
      <div className="app-main-area pb-14 md:pb-0">
        {/* Professional Website Dashboard Header */}
        <header className="bg-[#0B1B30] border-b border-slate-800/80 h-[84px] md:h-[88px] shrink-0 z-40 px-4 sm:px-6 lg:px-8 flex items-center justify-between sticky top-0 shadow-xl">
          {/* Left: Company Logo and Brand Name */}
          <div className="flex items-center gap-3">
            <button
              onClick={onNavigateHome}
              className="flex items-center gap-2.5 text-left cursor-pointer group focus:outline-none"
              style={{ background: 'none', border: 'none', padding: 0 }}
              title="Return to Home"
            >
              <div className="w-10 h-10 rounded-xl bg-[#132A4A] flex items-center justify-center text-[#D6A15D] shadow-md border border-slate-700/60 group-hover:border-[#D6A15D]/60 transition-colors shrink-0">
                <Building2 className="w-5 h-5 text-[#D6A15D]" />
              </div>
              <div className="flex flex-col">
                <span className="text-base sm:text-lg font-black tracking-tight text-white leading-tight">
                  Kretz<span className="text-[#D6A15D]">.</span>
                </span>
                <span className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400">
                  Dashboard & Asset Portal
                </span>
              </div>
            </button>
          </div>

          {/* Center Navigation: Dashboard, Investments, Transactions, Reports, Portfolio */}
          <nav className="hidden lg:flex items-center gap-1 xl:gap-2 bg-[#06101D] px-3 py-1.5 rounded-2xl border border-slate-800 shadow-inner">
            {[
              { id: 'overview', label: 'Dashboard', icon: LayoutDashboard },
              { id: 'properties', label: 'Investments', icon: TrendingUp },
              { id: 'transactions', label: 'Transactions', icon: History },
              { id: 'documents', label: 'Reports', icon: FileText },
              { id: 'portfolio', label: 'Portfolio', icon: Building2 },
            ].map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id || (item.id === 'properties' && activeTab === 'explore') || (item.id === 'documents' && (activeTab === 'distributions' || activeTab === 'documents'));
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`relative px-3.5 py-2 rounded-xl text-xs xl:text-[13px] font-semibold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
                    isActive
                      ? 'bg-[#132A4A] text-white font-bold shadow-xs'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-[#D6A15D]' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                  {isActive && (
                    <span className="absolute bottom-0 left-3.5 right-3.5 h-[2.5px] bg-[#D6A15D] rounded-full" />
                  )}
                </button>
              );
            })}
          </nav>

          {/* Right Side: Compact search field, notification bell, and user profile menu */}
          <div className="flex items-center gap-2.5 sm:gap-3.5">
            {/* Compact Search Field */}
            <div className="hidden xl:flex items-center relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 pointer-events-none" />
              <input
                type="text"
                placeholder="Search assets, txs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-48 bg-[#06101D] text-xs text-white placeholder-slate-400 rounded-xl pl-9 pr-3 py-2 border border-slate-800 focus:outline-none focus:border-[#D6A15D] transition-all shadow-inner"
              />
            </div>

            {/* Notification Bell with Real Unread-Count Badge */}
            <button
              onClick={() => setActiveTab('notifications')}
              className={`relative p-2.5 rounded-xl transition-all cursor-pointer border ${
                activeTab === 'notifications'
                  ? 'bg-[#132A4A] text-white border-[#D6A15D]/50 shadow-md'
                  : 'bg-[#06101D] text-slate-300 hover:text-white border-slate-800 hover:border-slate-700'
              }`}
              title="Notifications"
            >
              <Bell className="w-4 h-4" />
              {notifications.length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#D6A15D] text-[#0B1B30] text-[9px] font-black rounded-full flex items-center justify-center shadow-xs">
                  {notifications.length}
                </span>
              )}
            </button>

            {/* User Profile Menu with Avatar, Account Name, and Dropdown */}
            <div className="relative">
              <button
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-[#06101D] hover:bg-slate-800/80 border border-slate-800 hover:border-slate-700 text-white transition-all cursor-pointer shadow-xs"
              >
                <div className="w-7 h-7 rounded-lg bg-[#D6A15D] text-[#0B1B30] flex items-center justify-center font-black text-xs overflow-hidden shadow-xs shrink-0">
                  {user.avatarUrl ? (
                    <img src={user.avatarUrl} alt={user.fullName} className="w-full h-full object-cover" />
                  ) : (
                    user.fullName.charAt(0)
                  )}
                </div>
                <div className="hidden md:flex flex-col text-left">
                  <span className="text-xs font-bold text-white truncate max-w-[100px]">
                    {user.fullName.split(' ')[0]}
                  </span>
                  <span className="text-[9px] text-[#D6A15D] font-semibold">
                    {formatCurrency(user.walletBalance)}
                  </span>
                </div>
                <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${userDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* User Profile Dropdown Menu */}
              {userDropdownOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-[#0B1B30] border border-slate-800 rounded-2xl shadow-2xl py-2 z-50 text-left animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-4 py-3 border-b border-slate-800 mb-1">
                    <p className="text-[10px] uppercase font-bold text-slate-400">Signed In As</p>
                    <p className="text-xs font-bold text-white truncate mt-0.5">{user.email}</p>
                    <p className="text-[10px] font-semibold text-[#D6A15D] mt-1">Wallet: {formatCurrency(user.walletBalance)}</p>
                  </div>
                  <button
                    onClick={() => { setActiveTab('verification'); setUserDropdownOpen(false); }}
                    className="w-full text-left px-4 py-2.5 text-xs text-slate-300 hover:text-white hover:bg-[#132A4A] flex items-center gap-2.5 transition-colors cursor-pointer"
                  >
                    <User className="w-4 h-4 text-[#D6A15D]" />
                    <span>Profile & Security</span>
                  </button>
                  <button
                    onClick={() => { setActiveTab('wallet'); setUserDropdownOpen(false); }}
                    className="w-full text-left px-4 py-2.5 text-xs text-slate-300 hover:text-white hover:bg-[#132A4A] flex items-center gap-2.5 transition-colors cursor-pointer"
                  >
                    <Wallet className="w-4 h-4 text-[#D6A15D]" />
                    <span>Wallet & Deposits</span>
                  </button>
                  <div className="border-t border-slate-800 my-1" />
                  <button
                    onClick={() => { logout(); setUserDropdownOpen(false); }}
                    className="w-full text-left px-4 py-2.5 text-xs text-red-400 hover:text-red-300 hover:bg-red-950/40 flex items-center gap-2.5 transition-colors cursor-pointer font-bold"
                  >
                    <LogOut className="w-4 h-4 text-red-400" />
                    <span>Logout Account</span>
                  </button>
                </div>
              )}
            </div>

            {/* Mobile Menu Toggle Button */}
            <button
              onClick={() => setMobileHeaderMenuOpen(!mobileHeaderMenuOpen)}
              className="lg:hidden p-2 rounded-xl bg-[#06101D] text-white border border-slate-800 hover:border-slate-700 cursor-pointer"
              title="Toggle Menu"
            >
              {mobileHeaderMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </header>

        {/* Mobile Collapsible Navigation Menu */}
        {mobileHeaderMenuOpen && (
          <div className="lg:hidden bg-[#0B1B30] border-b border-slate-800 px-4 py-3 space-y-1.5 z-30 animate-in slide-in-from-top-2 duration-150">
            {[
              { id: 'overview', label: 'Dashboard', icon: LayoutDashboard },
              { id: 'properties', label: 'Investments', icon: TrendingUp },
              { id: 'transactions', label: 'Transactions', icon: History },
              { id: 'documents', label: 'Reports', icon: FileText },
              { id: 'portfolio', label: 'Portfolio', icon: Building2 },
              { id: 'wallet', label: 'Wallet', icon: Wallet },
              { id: 'verification', label: 'Profile Settings', icon: User },
              { id: 'notifications', label: 'Notifications', icon: Bell, count: notifications.length },
            ].map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => { setActiveTab(item.id); setMobileHeaderMenuOpen(false); }}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-[#132A4A] text-white border-l-4 border-[#D6A15D]'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-[#D6A15D]' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.count !== undefined && item.count > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-[#D6A15D] text-[#0B1B30]">
                      {item.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Scrollable Content Area */}
        <main className="app-content-scroll">
          <div className="max-w-6xl mx-auto space-y-3 sm:space-y-3.5">

            {/* 1. OVERVIEW TAB */}
            {activeTab === 'overview' && (
              <div className="space-y-3 sm:space-y-3.5 animate-in fade-in duration-200">
                {/* Welcome Back Widget - Proportional and Compact */}
                <div className="bg-gradient-to-r from-[#182D2A] to-[#24423C] text-white p-3.5 sm:p-4.5 rounded-2xl shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 relative overflow-hidden border border-[#24423C]/60">
                  <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-no-repeat bg-right opacity-10 pointer-events-none bg-[radial-gradient(#B7E36A_1px,transparent_1px)] [background-size:16px_16px]"></div>
                  <div className="flex items-center gap-3.5 z-10 min-w-0">
                    <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-[#B7E36A] text-[#182D2A] flex items-center justify-center font-black text-xs sm:text-sm shadow-xs shrink-0 overflow-hidden">
                      {user.avatarUrl ? (
                        <img src={user.avatarUrl} alt={user.fullName} className="w-full h-full object-cover" />
                      ) : (
                        user.fullName.split(' ').map(n => n[0]).join('')
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="text-[8.5px] sm:text-[9px] font-extrabold uppercase tracking-wider text-[#B7E36A] bg-white/10 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                          Investor Portal • Active Session
                        </span>
                        {user.kycStatus === 'verified' && (
                          <span className="inline-flex items-center gap-0.5 text-[8.5px] sm:text-[9px] font-bold text-emerald-300 bg-emerald-900/40 px-2 py-0.5 rounded-full">
                            <ShieldCheck className="w-2.5 h-2.5" /> Verified
                          </span>
                        )}
                      </div>
                      <h2 className="text-sm sm:text-base font-bold text-white tracking-tight truncate leading-tight">
                        Welcome back, {user.fullName}! 👋
                      </h2>
                      <p className="text-[10px] sm:text-[11px] text-[#A0A8A5] mt-0.5 leading-tight truncate sm:whitespace-normal">
                        Your real estate portfolio is generating stable monthly distributions across {investments.length} properties.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 z-10 shrink-0">
                    <button
                      onClick={() => setActiveTab('properties')}
                      className="bg-white/10 hover:bg-white/15 text-white border border-white/15 text-xs font-semibold px-3 py-1.5 rounded-xl transition-colors cursor-pointer"
                    >
                      Explore Properties
                    </button>
                  </div>
                </div>

                {notifications.length > 0 && (
                  <div className="bg-[#EEF1EC] border border-[#E3E8E3] px-3.5 py-2 rounded-xl flex items-center justify-between gap-3 shadow-2xs">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-6 h-6 rounded-lg bg-white text-[#27845D] flex items-center justify-center shrink-0 shadow-2xs">
                        <Bell className="w-3.5 h-3.5" />
                      </div>
                      <div className="text-[11px] leading-tight truncate">
                        <span className="font-bold text-[#18211F] mr-1">{notifications[0].title}:</span>
                        <span className="text-[#69736F]">{notifications[0].message}</span>
                      </div>
                    </div>
                    <button onClick={() => setActiveTab('notifications')} className="text-[11px] font-bold text-[#182D2A] hover:underline whitespace-nowrap shrink-0">
                      View All ({notifications.length})
                    </button>
                  </div>
                )}

                <BalanceCard
                  user={user}
                  onDeposit={() => setIsDepositOpen(true)}
                  onWithdraw={() => setIsWithdrawOpen(true)}
                />

                <div className="bg-white p-3.5 sm:p-4.5 rounded-2xl border border-[#E3E8E3] shadow-xs space-y-3">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-xs sm:text-sm font-bold text-[#18211F]">Your Tokenized Assets</h3>
                      <p className="text-[10.5px] sm:text-[11px] text-[#69736F]">Active real estate properties generating monthly rental yield</p>
                    </div>
                    <button
                      onClick={() => setActiveTab('portfolio')}
                      className="text-xs font-bold text-[#182D2A] hover:text-[#27845D] flex items-center gap-1"
                    >
                      View Full Portfolio <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>

                  <PortfolioOverview
                    investments={investments}
                    onSelectProperty={onSelectProperty}
                    onExploreMore={() => setActiveTab('properties')}
                  />
                </div>

                <div className="bg-white p-3.5 sm:p-4.5 rounded-2xl border border-[#E3E8E3] shadow-xs space-y-3">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-xs sm:text-sm font-bold text-[#18211F]">Recent Transactions & Distributions</h3>
                      <p className="text-[10.5px] sm:text-[11px] text-[#69736F]">Verifiable double-entry ledger record</p>
                    </div>
                    <button
                      onClick={() => setActiveTab('transactions')}
                      className="text-xs font-bold text-[#182D2A] hover:text-[#27845D] flex items-center gap-1"
                    >
                      All Transactions ({transactions.length}) <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>

                  <TransactionTable transactions={transactions} maxRows={5} />
                </div>
              </div>
            )}

            {/* 2. MY PORTFOLIO TAB */}
            {/* 2. MY PORTFOLIO TAB */}
            {activeTab === 'portfolio' && (
              <div className="bg-white p-3.5 sm:p-5 rounded-2xl border border-[#E3E8E3] shadow-xs space-y-3.5 animate-in fade-in duration-200">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
                  <div>
                    <h2 className="text-base sm:text-lg font-bold text-[#18211F]">My Property Investments</h2>
                    <p className="text-[10.5px] sm:text-xs text-[#69736F]">Owned fractional property units, live circular investment tracking, and yields.</p>
                  </div>
                  <button onClick={() => setActiveTab('properties')} className="btn btn-primary btn-sm text-xs font-semibold py-1.5 px-3 cursor-pointer">
                    Browse Real Estate
                  </button>
                </div>

                <MyPropertyInvestments
                  investments={investments}
                  allProperties={properties}
                  onOpenBuyModal={(prop, mode) => {
                    const targetProp = prop || properties[0];
                    if (targetProp) {
                      setBuyModalProperty(targetProp);
                      setBuyModalMode(mode || 'purchase');
                      setIsBuyModalOpen(true);
                    }
                  }}
                  onExploreProperties={() => setActiveTab('properties')}
                />
              </div>
            )}

            {/* 3. EXPLORE PROPERTIES TAB */}
            {activeTab === 'properties' && (
              <div className="space-y-3.5 animate-in fade-in duration-200">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 sm:p-4.5 rounded-2xl border border-[#E3E8E3] shadow-xs">
                  <div>
                    <h2 className="text-base sm:text-lg font-bold text-[#18211F]">Explore Investment Opportunities</h2>
                    <p className="text-[10.5px] sm:text-xs text-[#69736F]">Institutional-grade European real estate tokenized from €100/unit.</p>
                  </div>
                  <button onClick={onExploreProperties} className="btn btn-secondary btn-sm text-xs font-semibold py-1.5 px-3">
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
                        setBuyModalProperty(prop);
                        setBuyModalMode('purchase');
                        setIsBuyModalOpen(true);
                      }}
                      onOpenBrochure={(prop) => setBrochureProperty(prop)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* 4. TRANSACTIONS TAB */}
            {activeTab === 'transactions' && (
              <div className="bg-white p-3.5 sm:p-5 rounded-2xl border border-[#E3E8E3] shadow-xs space-y-3.5 animate-in fade-in duration-200">
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-[#18211F]">Transactions & Audit Ledger</h2>
                  <p className="text-[10.5px] sm:text-xs text-[#69736F]">Immutable history of all deposits, withdrawals, property investments, and dividends.</p>
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
              <div className="space-y-3.5 sm:space-y-4 animate-in fade-in duration-200 max-w-4xl mx-auto">
                <div className="bg-white p-3.5 sm:p-5 rounded-2xl border border-[#E3E8E3] shadow-xs space-y-3.5 sm:space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    <div>
                      <h2 className="text-base sm:text-lg font-bold text-[#18211F]">Investor Wallet & Treasury</h2>
                      <p className="text-[10.5px] sm:text-xs text-[#69736F]">Manage your liquidity, SEPA bank transfers, and automated dividend deposits.</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3" /> CaixaBank Escrow
                      </span>
                    </div>
                  </div>

                  <BalanceCard
                    user={user}
                    onDeposit={() => setIsDepositOpen(true)}
                    onWithdraw={() => setIsWithdrawOpen(true)}
                  />

                  {/* Action Cards: Deposit, Withdrawal & Document Upload */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {/* Deposit Action Card */}
                    <div className="p-3.5 sm:p-4 rounded-xl bg-gradient-to-br from-[#F6F7F4] to-emerald-50/40 border border-[#DCE4DA] flex flex-col justify-between space-y-3 text-left">
                      <div className="space-y-1.5">
                        <div className="w-8 h-8 rounded-lg bg-[#182D2A] text-[#B7E36A] flex items-center justify-center font-bold shadow-2xs">
                          <ArrowDownLeft className="w-4 h-4" />
                        </div>
                        <h3 className="text-sm font-bold text-[#18211F]">Deposit Capital</h3>
                        <p className="text-[11px] text-[#69736F] leading-relaxed">
                          Add funds via SEPA wire transfer (CaixaBank Escrow) or crypto stablecoins (USDT, USDC, ETH). Deposits are verified and credited through administrator review.
                        </p>
                      </div>
                      <button
                        onClick={() => setIsDepositOpen(true)}
                        className="btn btn-primary text-xs font-bold py-2 px-3.5 flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer"
                      >
                        <ArrowDownLeft className="w-3.5 h-3.5 text-[#B7E36A]" />
                        <span>Deposit Funds</span>
                      </button>
                    </div>

                    {/* Withdrawal Action Card */}
                    <div className="p-3.5 sm:p-4 rounded-xl bg-[#F6F7F4] border border-[#E3E8E3] flex flex-col justify-between space-y-3 text-left">
                      <div className="space-y-1.5">
                        <div className="w-8 h-8 rounded-lg bg-slate-200 text-slate-700 flex items-center justify-center font-bold">
                          <ArrowUpRight className="w-4 h-4" />
                        </div>
                        <h3 className="text-sm font-bold text-[#18211F]">Withdraw Funds</h3>
                        <p className="text-[11px] text-[#69736F] leading-relaxed">
                          Redeem your uninvested liquid capital directly to your verified European bank IBAN or external crypto wallet address. Subject to standard AML/KYC review.
                        </p>
                      </div>
                      <button
                        onClick={() => setIsWithdrawOpen(true)}
                        className="btn btn-secondary text-xs font-bold py-2 px-3.5 border-[#CBD5E1] bg-white hover:bg-slate-50 text-[#18211F] flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                      >
                        <ArrowUpRight className="w-3.5 h-3.5 text-[#27845D]" />
                        <span>Request Withdrawal</span>
                      </button>
                    </div>

                    {/* Profile Settings Card */}
                    <div className="p-3.5 sm:p-4 rounded-xl bg-gradient-to-br from-[#F6F7F4] to-emerald-50/40 border border-[#DCE4DA] flex flex-col justify-between space-y-3 text-left">
                      <div className="space-y-1.5">
                        <div className="w-8 h-8 rounded-lg bg-[#182D2A] text-[#B7E36A] flex items-center justify-center font-bold shadow-2xs">
                          <User className="w-4 h-4" />
                        </div>
                        <h3 className="text-sm font-bold text-[#18211F]">Profile Settings</h3>
                        <p className="text-[11px] text-[#69736F] leading-relaxed">
                          View and update your personal information, contact details, profile photo, password credentials, and account security.
                        </p>
                      </div>
                      <button
                        onClick={() => setActiveTab('verification')}
                        className="btn btn-secondary text-xs font-bold py-2 px-3.5 border-[#CBD5E1] bg-white hover:bg-slate-50 text-[#18211F] flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                      >
                        <User className="w-3.5 h-3.5 text-[#27845D]" />
                        <span>Manage Profile Settings</span>
                      </button>
                    </div>
                  </div>

                  {/* Pending Transactions Section */}
                  {transactions.filter(t => t.status === 'pending').length > 0 && (
                    <div className="p-5 rounded-2xl bg-amber-50/80 border border-amber-200 space-y-3 text-left">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
                          <h4 className="text-xs font-bold text-amber-950 uppercase tracking-wider">
                            Pending Treasury Requests ({transactions.filter(t => t.status === 'pending').length})
                          </h4>
                        </div>
                        {user?.role === 'admin' && (
                          <a
                            href="/admin#deposits"
                            className="text-xs font-bold text-amber-900 hover:text-amber-950 underline flex items-center gap-1"
                          >
                            Review in Admin Panel <ArrowRight className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>

                      <div className="space-y-2">
                        {transactions.filter(t => t.status === 'pending').map(tx => (
                          <div key={tx.id} className="p-3.5 bg-white rounded-xl border border-amber-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-2">
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                  tx.type === 'deposit' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                                }`}>
                                  {tx.type === 'deposit' ? 'Deposit Request' : 'Withdrawal Request'}
                                </span>
                                <span className="font-mono font-bold text-[#18211F]">{tx.reference}</span>
                              </div>
                              <p className="text-[11px] text-[#69736F]">{tx.paymentMethod} · {formatDate(tx.createdAt)}</p>
                              {tx.metadata?.receiptFileName && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded">
                                  📎 Proof attached: {tx.metadata.receiptFileName}
                                </span>
                              )}
                            </div>
                            <div className="text-left sm:text-right">
                              <span className="font-black text-[#18211F] text-sm block">
                                {formatCurrency(tx.amount)} {tx.currency}
                              </span>
                              <span className="text-[10px] text-amber-800 font-bold">Awaiting Admin Approval</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                </div>
              </div>
            )}

            {/* TAB: UPLOAD & VERIFICATION VAULT */}
            {activeTab === 'verification' && (
              <div className="animate-in fade-in duration-200">
                <DocumentUploadVault
                  onNavigateAdmin={() => window.location.href = '/admin#deposits'}
                  onNavigateWallet={() => setActiveTab('wallet')}
                />
              </div>
            )}

            {/* 7. DOCUMENTS TAB */}
            {activeTab === 'documents' && (
              <div className="bg-white p-3.5 sm:p-5 rounded-2xl border border-[#E3E8E3] shadow-xs space-y-3.5 animate-in fade-in duration-200">
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-[#18211F]">Investment Documents & Agreements</h2>
                  <p className="text-[10.5px] sm:text-xs text-[#69736F]">Securely access notarized SPV share certificates, RICS independent appraisals, and purchase deeds.</p>
                </div>

                {investments.length === 0 ? (
                  <div className="text-center py-8 text-[#69736F] space-y-2">
                    <FileText className="w-8 h-8 mx-auto opacity-40" />
                    <p className="text-xs font-semibold">No investments yet to generate legal documents.</p>
                    <button onClick={() => setActiveTab('properties')} className="btn btn-primary btn-sm text-xs font-semibold py-1.5 px-3">
                      Explore Properties (€1,000+)
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {investments.map((inv) => {
                      const prop = properties.find(p => p.id === inv.propertyId);
                      return (
                        <div key={inv.id} className="p-3 sm:p-3.5 rounded-xl border border-[#E3E8E3] flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#F6F7F4]/50 hover:bg-[#F6F7F4] transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg bg-[#182D2A] text-[#B7E36A] flex items-center justify-center font-bold shrink-0">
                              <FileText className="w-4.5 h-4.5" />
                            </div>
                            <div>
                              <h4 className="font-bold text-[#18211F] text-xs sm:text-sm">{inv.propertyTitle || prop?.title || 'Real Estate Asset'}</h4>
                              <p className="text-[11px] text-[#69736F]">
                                Invested {formatCurrency(inv.totalAmountInvested)} · {inv.tokensPurchased} Tokens · {formatDate(inv.purchasedAt)}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setSelectedDocInvestment(inv)}
                              className="btn btn-secondary btn-sm text-xs font-semibold py-1.5 px-3"
                            >
                              <FileText className="w-3 h-3 mr-1" /> View SPV Certificate & Deed
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
              <div className="bg-white p-3.5 sm:p-5 rounded-2xl border border-[#E3E8E3] shadow-xs space-y-3.5 animate-in fade-in duration-200 max-w-4xl mx-auto">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#EEF1EC] text-[#27845D] flex items-center justify-center shrink-0">
                    <Share2 className="w-4.5 h-4.5" />
                  </div>
                  <div>
                    <h2 className="text-base sm:text-lg font-bold text-[#18211F]">Investor Referral Program</h2>
                    <p className="text-[10.5px] sm:text-xs text-[#69736F]">Earn €500 in platform credit for every investor who joins and funds their account.</p>
                  </div>
                </div>

                <div className="p-3.5 sm:p-4 rounded-xl bg-[#F6F7F4] border border-[#E3E8E3] space-y-2.5">
                  <label className="block text-xs font-bold text-[#18211F]">Your Unique Referral Link</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={referralLink}
                      className="w-full px-3 py-2 rounded-lg border border-[#E3E8E3] bg-white text-xs font-mono text-[#69736F]"
                    />
                    <button
                      onClick={copyReferral}
                      className="btn btn-primary text-xs font-bold px-3 py-2 flex items-center gap-1.5 shrink-0"
                    >
                      {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      {copiedLink ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-center">
                  <div className="p-3.5 rounded-xl border border-[#E3E8E3] bg-white">
                    <div className="text-xl font-bold text-[#18211F]">0</div>
                    <div className="text-[11px] text-[#69736F] mt-0.5">Successful Referrals</div>
                  </div>
                  <div className="p-3.5 rounded-xl border border-[#E3E8E3] bg-white">
                    <div className="text-xl font-bold text-[#27845D]">€0.00</div>
                    <div className="text-[11px] text-[#69736F] mt-0.5">Referral Bonuses Earned</div>
                  </div>
                  <div className="p-3.5 rounded-xl border border-[#E3E8E3] bg-white">
                    <div className="text-xl font-bold text-[#18211F]">€500</div>
                    <div className="text-[11px] text-[#69736F] mt-0.5">Bonus Per Investor</div>
                  </div>
                </div>
              </div>
            )}

            {/* 9. NOTIFICATIONS TAB */}
            {activeTab === 'notifications' && (
              <div className="bg-white p-3.5 sm:p-5 rounded-2xl border border-[#E3E8E3] shadow-xs space-y-3.5 animate-in fade-in duration-200 max-w-3xl mx-auto">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-base sm:text-lg font-bold text-[#18211F]">Notification Center</h2>
                    <p className="text-[10.5px] sm:text-xs text-[#69736F]">Account alerts, investment confirmations, and distribution logs.</p>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full bg-[#EEF1EC] text-[#27845D] text-[10px] font-bold">
                    {notifications.length} Unread
                  </span>
                </div>

                {notifications.length === 0 ? (
                  <div className="text-center py-8 text-[#69736F] space-y-1.5">
                    <Bell className="w-8 h-8 mx-auto opacity-40" />
                    <p className="text-xs font-semibold">You have no new notifications.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {notifications.map((notif) => (
                      <div key={notif.id} className="p-3 rounded-xl border border-[#E3E8E3] bg-[#F6F7F4]/60 flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg bg-white text-[#27845D] flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                          <Bell className="w-4 h-4" />
                        </div>
                        <div className="flex-1 space-y-0.5 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <h4 className="font-bold text-[#18211F] text-xs truncate">{notif.title}</h4>
                            <span className="text-[9.5px] text-[#828D89] shrink-0">{formatDate(notif.createdAt)}</span>
                          </div>
                          <p className="text-[11px] text-[#69736F] leading-relaxed">{notif.message}</p>
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
              <div className="bg-white p-3.5 sm:p-5 rounded-2xl border border-[#E3E8E3] shadow-xs space-y-3.5 animate-in fade-in duration-200 max-w-3xl mx-auto">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#EEF1EC] text-[#27845D] flex items-center justify-center shrink-0">
                    <HelpCircle className="w-5 h-5" />
                  </div>
                  <div className="flex-1 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    <div>
                      <h2 className="text-base sm:text-lg font-bold text-[#18211F]">Investor Support & Help Center</h2>
                      <p className="text-[10.5px] sm:text-xs text-[#69736F]">Customer Support Desk · Email: <strong className="text-[#182D2A]">info@kretz.site</strong></p>
                    </div>
                    <button
                      onClick={() => {
                        if (typeof window !== 'undefined' && window.smartsupp) {
                          try { window.smartsupp('chat:open'); } catch { }
                        }
                        alert('Support Live Chat is online! Use the widget at the bottom right or email info@kretz.site for direct assistance.');
                      }}
                      className="px-3 py-1.5 rounded-lg bg-[#182D2A] text-white font-bold text-xs hover:bg-[#24423C] transition-all flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer shrink-0"
                    >
                      <Bell className="w-3 h-3 text-[#B7E36A]" />
                      <span>Start Live Chat</span>
                    </button>
                  </div>
                </div>

                <div className="space-y-3 text-xs text-left">
                  {/* Support Banner */}
                  <div className="p-3.5 sm:p-4 rounded-xl bg-[#182D2A] text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        <h3 className="font-bold text-xs sm:text-sm text-white">Advisory Support Active</h3>
                      </div>
                      <p className="text-[11px] text-slate-300">
                        Our specialized real estate advisors respond in under 2 minutes. You can also send documentation directly to <strong className="text-[#B7E36A]">info@kretz.site</strong>.
                      </p>
                    </div>
                    <a
                      href="mailto:info@kretz.site"
                      className="px-3 py-1.5 rounded-lg bg-[#24423C] hover:bg-[#2e544c] border border-emerald-500/30 text-[#B7E36A] font-bold text-xs whitespace-nowrap cursor-pointer shrink-0"
                    >
                      info@kretz.site
                    </a>
                  </div>

                  <div className="p-3.5 rounded-xl bg-[#F6F7F4] border border-[#E3E8E3] space-y-1.5">
                    <h3 className="font-bold text-[#18211F] text-xs">Frequently Asked Questions</h3>
                    <ul className="space-y-1.5 text-[11px] text-[#69736F]">
                      <li>• <strong>When are rental dividends paid?</strong> Dividends are credited automatically to your available balance on the 1st of every month.</li>
                      <li>• <strong>How do I withdraw funds?</strong> Go to your wallet balance and click Withdraw. SEPA transfers take 1-2 business days.</li>
                      <li>• <strong>What is the minimum investment?</strong> All properties have a minimum investment threshold of €1,000.</li>
                      <li>• <strong>What is the support email?</strong> Our official contact and support email is <strong className="text-[#182D2A]">info@kretz.site</strong>.</li>
                    </ul>
                  </div>

                  <div className="p-3.5 sm:p-4 rounded-xl border border-[#E3E8E3] space-y-2.5">
                    <h3 className="font-bold text-[#18211F] text-xs">Send Ticket to info@kretz.site</h3>
                    <form onSubmit={(e) => { e.preventDefault(); alert('Inquiry sent to info@kretz.site! An advisor will respond within 2 hours.'); }} className="space-y-2">
                      <div>
                        <label className="block text-[10px] font-semibold text-[#69736F] mb-0.5">Subject</label>
                        <input type="text" placeholder="e.g. Question about SEPA deposit or SPV deed" required className="w-full px-3 py-1.5 rounded-lg border border-[#E3E8E3] text-xs focus:outline-none focus:border-[#182D2A]" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-[#69736F] mb-0.5">Message</label>
                        <textarea rows={3} placeholder="Describe your inquiry..." required className="w-full px-3 py-1.5 rounded-lg border border-[#E3E8E3] text-xs focus:outline-none focus:border-[#182D2A]" />
                      </div>
                      <button type="submit" className="btn btn-primary text-xs font-bold px-4 py-1.5">
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

      {/* Mobile Bottom Navigation Bar - Compact and Clean */}
      <nav className="mobile-bottom-nav">
        {[
          { id: 'overview', label: 'Overview', icon: LayoutDashboard },
          { id: 'portfolio', label: 'Portfolio', icon: Building2 },
          { id: 'properties', label: 'Explore', icon: TrendingUp },
          { id: 'transactions', label: 'Ledger', icon: History },
          { id: 'more', label: 'More', icon: LayoutGrid, isMore: true },
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
              className={`flex flex-col items-center justify-center py-1 px-1.5 rounded-lg text-[9.5px] font-medium transition-all ${
                isActive ? 'text-[#27845D] font-bold' : 'text-[#69736F] hover:text-[#18211F]'
              }`}
            >
              <Icon className="w-4 h-4 mb-0.5" />
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

      {/* Deposit Modal */}
      <DepositModal
        isOpen={isDepositOpen}
        onClose={() => setIsDepositOpen(false)}
        onSuccess={() => {
          refreshUser();
        }}
        onNavigateAdmin={() => {
          window.location.hash = '/admin#deposits';
        }}
        onNavigateTransactions={() => setActiveTab('transactions')}
      />

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

      {/* Remodeled Luxury Property Brochure Viewer */}
      {brochureProperty && (
        <PropertyDocumentViewer
          property={brochureProperty}
          isOpen={!!brochureProperty}
          onClose={() => setBrochureProperty(null)}
        />
      )}

      {/* Unit Purchase & Reinvestment Modal */}
      {buyModalProperty && (
        <UnitPurchaseModal
          property={buyModalProperty}
          allProperties={properties}
          isOpen={isBuyModalOpen}
          mode={buyModalMode}
          onClose={() => setIsBuyModalOpen(false)}
          onSuccess={() => refreshUser()}
          onOpenDeposit={() => {
            setIsBuyModalOpen(false);
            setActiveTab('wallet');
            setIsDepositOpen(true);
          }}
        />
      )}
    </div>
  );
};
