import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../../lib/auth';
import { useNavigation } from '../../context/NavigationContext';
import { useToast } from '../../context/ToastContext';
import { ledger } from '../../lib/ledger';
import { contactApi, userApi } from '../../lib/api';
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
import { ButtonLoader } from '../common/ButtonLoader';
import { 
  ArrowRight, Bell, Building2, TrendingUp, Wallet, ShieldCheck, History, 
  PieChart, ArrowDownLeft, ArrowUpRight, HelpCircle, User, FileText, LayoutDashboard, Coins,
  Share2, Award, CheckCircle2, AlertCircle, ExternalLink, Copy, Check, Menu, X, UploadCloud, LayoutGrid, LogOut,
  Search, ChevronDown, Gift, Users, Send, Mail, QrCode, Globe, CheckCheck, MessageCircle, RefreshCw, Clock,
  Sun, Moon, Tag, Table as TableIcon, Layers, Landmark, Sparkles, Filter, ChevronRight
} from 'lucide-react';
import { formatCurrency, formatDate } from '../../lib/utils';
import { ColoredPipeline, PipelineStage } from '../visuals/ColoredPipeline';
import { PortfolioPerformanceChart } from '../visuals/PortfolioPerformanceChart';
import { AssetAllocationChart } from '../visuals/AssetAllocationChart';
import { YieldPayoutTrendsChart } from '../visuals/YieldPayoutTrendsChart';
import { TokenizationArchitectureDiagram } from '../visuals/TokenizationArchitectureDiagram';
import { YieldDistributionFlowDiagram } from '../visuals/YieldDistributionFlowDiagram';
import { RechartsPropertyDashboard } from '../visuals/RechartsPropertyDashboard';
import { SolanaWalletManager } from '../wallet/SolanaWalletManager';
import { TaxReportGenerator } from '../documents/TaxReportGenerator';
import { TreasuryConverterModal } from '../dashboard/TreasuryConverterModal';
import { InvestorAnalyticsSuite } from '../dashboard/InvestorAnalyticsSuite';
import { ProjectedYieldGrowthChart } from '../dashboard/ProjectedYieldGrowthChart';
import { LagenceLogo } from '../common/LagenceLogo';

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
  const { navigateTo } = useNavigation();
  const toast = useToast();

  // Normalize activeTab to our 7 executive backend modules
  const [activeTab, setActiveTab] = useState<string>(() => {
    if (defaultTab === 'deposit' || defaultTab === 'withdraw' || defaultTab === 'distributions') return 'wallet';
    if (defaultTab === 'tax_statements' || defaultTab === 'verification') return 'documents';
    if (defaultTab === 'properties') return 'portfolio';
    if (defaultTab === 'referrals' || defaultTab === 'support' || defaultTab === 'notifications') return 'profile';
    return defaultTab || 'overview';
  });

  const [isDepositOpen, setIsDepositOpen] = useState(defaultTab === 'deposit');
  const [isWithdrawOpen, setIsWithdrawOpen] = useState(defaultTab === 'withdraw');
  const [isTreasuryConverterOpen, setIsTreasuryConverterOpen] = useState<boolean>(false);
  const [selectedDocInvestment, setSelectedDocInvestment] = useState<any | null>(null);
  const [brochureProperty, setBrochureProperty] = useState<Property | null>(null);
  const [buyModalProperty, setBuyModalProperty] = useState<Property | null>(null);
  const [buyModalMode, setBuyModalMode] = useState<'purchase' | 'reinvest'>('purchase');
  const [isBuyModalOpen, setIsBuyModalOpen] = useState<boolean>(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [mobileHeaderMenuOpen, setMobileHeaderMenuOpen] = useState(false);
  const [, setLedgerVersion] = useState(0);
  const searchContainerRef = useRef<HTMLDivElement | null>(null);

  // Sub-tab state for Settings & VIP Desk
  const [settingsSection, setSettingsSection] = useState<'profile' | 'referrals' | 'notifications' | 'support'>(() => {
    if (defaultTab === 'referrals') return 'referrals';
    if (defaultTab === 'notifications') return 'notifications';
    if (defaultTab === 'support') return 'support';
    return 'profile';
  });

  // Support Inquiry States
  const [supportSubject, setSupportSubject] = useState('');
  const [supportMessage, setSupportMessage] = useState('');
  const [isSubmittingSupport, setIsSubmittingSupport] = useState(false);
  const [supportFeedback, setSupportFeedback] = useState<string | null>(null);
  const [supportError, setSupportError] = useState<string | null>(null);

  // Strict Dark Platform Theme Default
  const [dashboardMode, setDashboardMode] = useState<'dark' | 'light'>(() => {
    try {
      const saved = localStorage.getItem('dashboard_mode');
      if (saved === 'dark' || saved === 'light') return saved;
    } catch {}
    return 'dark'; // Always default to dark platform
  });

  const [dashboardTheme] = useState<string>('slate');

  useEffect(() => {
    return ledger.subscribe(() => {
      setLedgerVersion((v) => v + 1);
    });
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setUserDropdownOpen(false);
        setMobileHeaderMenuOpen(false);
        setIsSearchFocused(false);
        setShowQrModal(false);
      }
    };
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setIsSearchFocused(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const toggleDashboardMode = () => {
    const nextMode = dashboardMode === 'dark' ? 'light' : 'dark';
    setDashboardMode(nextMode);
    try {
      localStorage.setItem('dashboard_mode', nextMode);
    } catch {}
    if (user) {
      ledger.updateUserPreferences(user.id, { dashboardMode: nextMode });
      userApi.savePreferences({ dashboardMode: nextMode }).catch(() => {});
    }
  };

  useEffect(() => {
    if (defaultTab === 'deposit') {
      setActiveTab('wallet');
      setIsDepositOpen(true);
    } else if (defaultTab === 'withdraw') {
      setActiveTab('wallet');
      setIsWithdrawOpen(true);
    } else if (defaultTab === 'distributions') {
      setActiveTab('wallet');
    } else if (defaultTab === 'tax_statements' || defaultTab === 'verification') {
      setActiveTab('documents');
    } else if (defaultTab === 'properties') {
      setActiveTab('portfolio');
    } else if (defaultTab === 'referrals') {
      setActiveTab('profile');
      setSettingsSection('referrals');
    } else if (defaultTab === 'support') {
      setActiveTab('profile');
      setSettingsSection('support');
    } else if (defaultTab === 'notifications') {
      setActiveTab('profile');
      setSettingsSection('notifications');
    } else if (defaultTab) {
      setActiveTab(defaultTab);
    }
  }, [defaultTab]);

  // Referral states & link generation
  const [copiedCode, setCopiedCode] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [useCurrentOrigin, setUseCurrentOrigin] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [isSendingInvite, setIsSendingInvite] = useState(false);
  const [inviteSentToast, setInviteSentToast] = useState<string | null>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [referralsList, setReferralsList] = useState<Array<{ id: string; email: string; date: string; status: 'invited' | 'registered' | 'funded'; reward: number }>>(() => {
    if (!user) return [];
    try {
      const saved = localStorage.getItem(`kretz_referrals_${user.id}`);
      if (saved) return JSON.parse(saved);
    } catch {}
    if (user.id === 'usr-investor-1') {
      return [
        { id: 'ref-1', email: 'arthur.vance@vanceholdings.ch', date: '2025-02-14', status: 'funded', reward: 500 },
        { id: 'ref-2', email: 'claire.delacroix@elysee-partners.fr', date: '2025-02-28', status: 'registered', reward: 0 },
      ];
    }
    return [];
  });

  useEffect(() => {
    if (!user?.id) return;
    let active = true;
    userApi
      .getReferrals()
      .then((res) => {
        if (!active || !Array.isArray(res?.data?.referrals) || res.data.referrals.length === 0) return;
        setReferralsList((prev) => {
          const seen = new Set(res.data.referrals.map((r) => r.email.toLowerCase()));
          const merged = [
            ...res.data.referrals,
            ...prev.filter((p) => !seen.has(p.email.toLowerCase())),
          ];
          try {
            localStorage.setItem(`kretz_referrals_${user.id}`, JSON.stringify(merged));
          } catch {}
          return merged;
        });
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [user?.id]);

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8 bg-[#090e17] text-white">
        <div className="w-8 h-8 border-3 border-[#c59b4c] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const investments = ledger.getInvestments(user.id);
  const transactions = ledger.getTransactions(user.id);
  const notifications = ledger.getNotifications(user.id);
  const properties = ledger.getProperties();
  const frontendProperties = ledger.getFrontendProperties();

  // Financial aggregates
  const totalInvestedAmount = investments.reduce((acc, curr) => acc + curr.totalAmountInvested, 0);
  const totalPortfolioValue = totalInvestedAmount + user.walletBalance;
  const totalTokensHeld = investments.reduce((acc, curr) => acc + curr.tokensPurchased, 0);
  const totalDividendsEarned = transactions
    .filter((t) => t.type === 'distribution' && t.status === 'completed')
    .reduce((acc, t) => acc + t.amount, 0);
  const totalMonthlyYieldEstimated = investments.reduce((acc, curr) => {
    const prop = properties.find((p) => p.id === curr.propertyId);
    const yieldRate = prop ? prop.estimatedAnnualYield / 100 : 0.085;
    return acc + (curr.totalAmountInvested * yieldRate) / 12;
  }, 0);

  const handleWithdrawalSuccess = () => {
    refreshUser();
  };

  const referralCode = `KRETZ-${(user.email ? user.email.split('@')[0] : user.id.slice(0, 6) || 'VIP').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8)}`;
  const currentOrigin = typeof window !== 'undefined' && window.location.origin ? window.location.origin : 'https://kretzdespain.com';
  const productionReferralLink = `https://kretzdespain.com/register?ref=${referralCode}`;
  const previewReferralLink = `${currentOrigin}/register?ref=${referralCode}`;
  const referralLink = useCurrentOrigin ? previewReferralLink : productionReferralLink;

  const copyReferral = (textToCopy?: string) => {
    const text = textToCopy || referralLink;
    navigator.clipboard.writeText(text);
    setCopiedLink(true);
    toast.success('Referral link copied to clipboard.');
    setTimeout(() => setCopiedLink(false), 2200);
  };

  const copyReferralCode = () => {
    navigator.clipboard.writeText(referralCode);
    setCopiedCode(true);
    toast.success(`Referral code ${referralCode} copied.`);
    setTimeout(() => setCopiedCode(false), 2200);
  };

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSendingInvite) return;
    setInviteError(null);
    const normalizedEmail = inviteEmail.trim().toLowerCase();
    if (!normalizedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setInviteError('Please enter a valid associate email address.');
      return;
    }
    if (normalizedEmail === user.email.toLowerCase()) {
      setInviteError('You cannot dispatch a referral invitation to your own registered email.');
      return;
    }
    if (referralsList.some((r) => r.email.toLowerCase() === normalizedEmail)) {
      setInviteError(`${normalizedEmail} has already been invited.`);
      return;
    }

    setIsSendingInvite(true);
    try {
      const res = await userApi.sendReferralInvite(normalizedEmail, referralCode, user.email);
      const created = res?.data?.referral || {
        id: `ref-${Date.now()}`,
        email: normalizedEmail,
        date: new Date().toISOString().split('T')[0],
        status: 'invited' as const,
        reward: 0,
      };
      const updated = [created, ...referralsList.filter((r) => r.email.toLowerCase() !== normalizedEmail)];
      setReferralsList(updated);
      try {
        localStorage.setItem(`kretz_referrals_${user.id}`, JSON.stringify(updated));
      } catch {}
      setInviteSentToast(`VIP invitation dispatched to ${normalizedEmail}`);
      toast.success(`Referral invitation dispatched to ${normalizedEmail}`);
      setInviteEmail('');
      setTimeout(() => setInviteSentToast(null), 4000);
    } catch (err: any) {
      setInviteError(err?.message || 'Unable to dispatch referral invitation right now. Please retry.');
    } finally {
      setIsSendingInvite(false);
    }
  };

  const handleSupportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmittingSupport) return;
    setSupportError(null);
    setSupportFeedback(null);

    const cleanSubject = supportSubject.trim();
    const cleanMsg = supportMessage.trim();
    if (cleanSubject.length < 3) {
      setSupportError('Please provide a clear subject line (at least 3 characters).');
      return;
    }
    if (cleanMsg.length < 10) {
      setSupportError('Please describe your inquiry in at least 10 characters so an advisor can assist.');
      return;
    }

    setIsSubmittingSupport(true);
    try {
      const response = await contactApi.submit({
        fullName: user.fullName || 'Verified Investor',
        email: user.email,
        topic: cleanSubject,
        message: cleanMsg,
      });
      ledger.addUserNotification(
        user.id,
        'Support Inquiry Logged',
        `Your inquiry "${cleanSubject}" was received by our Investor Desk (info@kretz.site).`,
        'info'
      );
      setSupportSubject('');
      setSupportMessage('');
      const msg = response?.message || 'Your support inquiry has been logged with our Investor Desk. Reference notification added.';
      setSupportFeedback(msg);
      toast.success('Support inquiry dispatched to Investor Desk.');
    } catch (err: any) {
      const errMsg = err?.message || 'Unable to submit support inquiry right now. Please retry or email info@kretz.site.';
      setSupportError(errMsg);
      toast.error(errMsg);
    } finally {
      setIsSubmittingSupport(false);
    }
  };

  // Cohesive 7 Executive Workspaces
  const executiveWorkspaces = [
    { id: 'overview', label: 'Command Center', icon: LayoutDashboard },
    { id: 'portfolio', label: 'Portfolio & Assets', icon: Building2, count: investments.length },
    { id: 'wallet', label: 'Treasury & Wallet', icon: Wallet },
    { id: 'analytics', label: 'Yield Analytics', icon: PieChart },
    { id: 'transactions', label: 'Audit Ledger', icon: History, count: transactions.length },
    { id: 'documents', label: 'Legal Vault & Tax', icon: FileText },
    { id: 'profile', label: 'VIP Desk & Settings', icon: User },
  ];

  const trimmedSearch = searchQuery.trim().toLowerCase();
  const searchResults = useMemo(() => {
    if (!trimmedSearch) {
      return { properties: [], holdings: [], txs: [], sections: [] };
    }
    const matchedProps = frontendProperties
      .filter((p) =>
        [p.title, p.location, p.city, p.country, p.tokenTicker, p.type]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
          .includes(trimmedSearch)
      )
      .slice(0, 4);

    const matchedHoldings = investments
      .filter((inv) =>
        [inv.propertyTitle, inv.propertyLocation]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
          .includes(trimmedSearch)
      )
      .slice(0, 3);

    const matchedTxs = transactions
      .filter((tx) =>
        [tx.reference, tx.description, tx.paymentMethod, tx.txHash]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
          .includes(trimmedSearch)
      )
      .slice(0, 3);

    const matchedSections = executiveWorkspaces
      .filter((item) => item.label.toLowerCase().includes(trimmedSearch))
      .slice(0, 3);

    return {
      properties: matchedProps,
      holdings: matchedHoldings,
      txs: matchedTxs,
      sections: matchedSections,
    };
  }, [trimmedSearch, frontendProperties, investments, transactions]);

  const totalSearchHits =
    searchResults.properties.length +
    searchResults.holdings.length +
    searchResults.txs.length +
    searchResults.sections.length;

  return (
    <div className={`app-shell dashboard-${dashboardMode} dashboard-theme-${dashboardTheme} bg-[#090e17] text-[#f1f5f9]`}>
      {/* Desktop Fixed-Width Sleek Dark Sidebar */}
      <aside className="app-sidebar hidden md:flex bg-[#0d1522] border-r border-[#1a2638] text-[#f1f5f9] w-64 select-none">
        {/* Brand Header */}
        <div 
          onClick={onNavigateHome}
          className="p-4 border-b border-[#1a2638] flex items-center gap-3 cursor-pointer hover:opacity-90 transition-opacity bg-[#090e17]"
        >
          <LagenceLogo className="w-8 h-8 shrink-0" />
          <div className="min-w-0">
            <h2 className="font-heading font-bold text-sm text-white tracking-tight leading-tight truncate">
              L'Agence
            </h2>
            <p className="text-[10px] text-[#c59b4c] font-semibold tracking-wider uppercase truncate">
              Executive Institutional Portal
            </p>
          </div>
        </div>

        {/* User Mini Card */}
        <div className="p-3 mx-3 my-3 bg-[#101a2a] rounded-xl border border-[#1e2c40] flex items-center gap-3 shadow-inner">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#c59b4c] to-[#9a7b3f] text-[#090e17] flex items-center justify-center font-bold text-xs shrink-0 shadow-md">
            {user.fullName.split(' ').map((n) => n[0]).join('')}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-bold text-xs text-white truncate leading-tight">{user.fullName}</h3>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-400 bg-emerald-950/70 border border-emerald-800/60 px-1.5 py-0.2 rounded-full">
                <ShieldCheck className="w-2.5 h-2.5 text-emerald-400" /> Verified VIP
              </span>
            </div>
          </div>
        </div>

        {/* Navigation Workspaces */}
        <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
          <div className="px-2 py-1 text-[9.5px] font-bold uppercase tracking-widest text-slate-500">
            Institutional Modules
          </div>
          {executiveWorkspaces.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#c59b4c] text-[#090e17] font-bold shadow-md shadow-[#c59b4c]/10'
                    : 'text-slate-300 hover:bg-[#152236] hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-[#090e17]' : 'text-slate-400'}`} />
                  <span className="truncate">{item.label}</span>
                </div>
                {item.count !== undefined && item.count > 0 && (
                  <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-mono font-bold shrink-0 ml-1 ${
                    isActive ? 'bg-[#090e17] text-[#c59b4c]' : 'bg-slate-800 text-slate-300'
                  }`}>
                    {item.count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Sidebar Shortcut Nav Bar with Quick Deposit / Withdraw / Logout */}
        <div className="p-3 border-t border-[#1a2638] bg-[#090e17] space-y-2">
          <div className="text-[9.5px] font-bold uppercase tracking-wider text-slate-400 px-1 flex items-center justify-between">
            <span>Treasury Shortcuts</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            <button
              onClick={() => {
                setActiveTab('wallet');
                setIsDepositOpen(true);
              }}
              className="flex items-center justify-center gap-1 bg-[#10b981] hover:bg-[#059669] text-white text-[11px] font-bold rounded-lg py-2 px-2 shadow-xs transition-colors cursor-pointer"
              title="Deposit Funds"
            >
              <ArrowDownLeft className="w-3.5 h-3.5 stroke-[2.5]" /> Deposit
            </button>
            <button
              onClick={() => {
                setActiveTab('wallet');
                setIsWithdrawOpen(true);
              }}
              className="flex items-center justify-center gap-1 bg-[#152236] hover:bg-[#1e2c40] text-slate-200 border border-[#1e2c40] text-[11px] font-semibold rounded-lg py-2 px-2 transition-colors cursor-pointer"
              title="Withdraw Funds"
            >
              <ArrowUpRight className="w-3.5 h-3.5" /> Withdraw
            </button>
          </div>
          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-1.5 bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-800/40 text-[11px] font-semibold rounded-lg py-1.5 px-2 transition-colors cursor-pointer"
            title="Log out of account"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="app-main-area pb-14 md:pb-0 flex-1 flex flex-col h-screen overflow-hidden bg-[#090e17]">
        {/* Executive Dashboard Header */}
        <header className="bg-[#0d1522]/95 border-b border-[#1a2638] backdrop-blur-md h-16 shrink-0 z-40 px-4 sm:px-6 flex items-center justify-between sticky top-0 shadow-md">
          {/* Left: Brand Name on Mobile & Active Workspace Label */}
          <div className="flex items-center gap-3">
            <button
              onClick={onNavigateHome}
              className="md:hidden flex items-center gap-2 cursor-pointer"
              title="Return to Home"
            >
              <LagenceLogo className="w-7 h-7 shrink-0" />
              <span className="font-bold text-sm text-white">L'Agence</span>
            </button>

            <div className="hidden sm:flex items-center gap-2 text-xs">
              <span className="text-slate-400">Workspace:</span>
              <span className="font-bold text-white uppercase tracking-wider bg-[#152236] px-2.5 py-1 rounded-md border border-[#1e2c40]">
                {executiveWorkspaces.find((w) => w.id === activeTab)?.label || 'Overview'}
              </span>
            </div>
          </div>

          {/* Center Navigation Bar (Quick Workspaces Tabs) */}
          <nav className="hidden lg:flex items-center gap-1 bg-[#090e17] px-2 py-1 rounded-xl border border-[#1e2c40] shadow-inner">
            {executiveWorkspaces.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                    isActive
                      ? 'bg-[#c59b4c] text-[#090e17] font-bold shadow-xs'
                      : 'text-slate-400 hover:text-white hover:bg-[#152236]'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Right Side Header Controls */}
          <div className="flex items-center gap-2.5">
            {/* Live Search Input with Instant Popover */}
            <div ref={searchContainerRef} className="hidden xl:flex items-center relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 pointer-events-none" />
              <input
                type="text"
                placeholder="Search assets, txs, documents..."
                aria-label="Search dashboard assets, holdings, and transactions"
                value={searchQuery}
                onFocus={() => setIsSearchFocused(true)}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setIsSearchFocused(true);
                }}
                className="w-56 bg-[#090e17] text-xs text-white placeholder-slate-500 rounded-lg pl-9 pr-7 py-1.5 border border-[#1e2c40] focus:outline-none focus:border-[#c59b4c] transition-all shadow-inner"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  aria-label="Clear search query"
                  className="absolute right-2 text-slate-400 hover:text-white cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              )}

              {/* Popover Live Search Results */}
              {isSearchFocused && trimmedSearch.length > 0 && (
                <div className="absolute right-0 top-full mt-2 w-80 max-h-96 overflow-y-auto bg-[#101a2a] border border-[#1e2c40] rounded-xl shadow-2xl p-2 z-50 text-left space-y-2">
                  {totalSearchHits === 0 ? (
                    <div className="p-3 text-center text-xs text-slate-400">
                      No matching properties or transactions for &ldquo;{searchQuery.trim()}&rdquo;.
                    </div>
                  ) : (
                    <>
                      {searchResults.properties.length > 0 && (
                        <div>
                          <div className="px-2 py-1 text-[9.5px] font-bold uppercase tracking-wider text-slate-400">
                            Marketplace Landmarks
                          </div>
                          {searchResults.properties.map((prop) => (
                            <button
                              key={prop.id}
                              type="button"
                              onClick={() => {
                                setIsSearchFocused(false);
                                setSearchQuery('');
                                onSelectProperty(prop.id);
                              }}
                              className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-[#152236] flex items-center justify-between gap-2 text-xs cursor-pointer"
                            >
                              <div className="min-w-0">
                                <span className="font-bold text-white block truncate">{prop.title}</span>
                                <span className="text-[10px] text-slate-400 block truncate">{prop.location}</span>
                              </div>
                              <span className="font-mono text-[10.5px] font-bold text-emerald-400 shrink-0">
                                {formatCurrency(prop.tokenPrice)}
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                      {searchResults.sections.length > 0 && (
                        <div>
                          <div className="px-2 py-1 text-[9.5px] font-bold uppercase tracking-wider text-slate-400">
                            Workspaces
                          </div>
                          {searchResults.sections.map((sec) => (
                            <button
                              key={sec.id}
                              type="button"
                              onClick={() => {
                                setIsSearchFocused(false);
                                setSearchQuery('');
                                setActiveTab(sec.id);
                              }}
                              className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-[#152236] flex items-center gap-2 text-xs font-semibold text-white cursor-pointer"
                            >
                              <ArrowRight className="w-3 h-3 text-[#c59b4c]" />
                              <span>{sec.label}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Quick Action: Currency FX Converter Trigger */}
            <button
              onClick={() => setIsTreasuryConverterOpen(true)}
              className="p-2 rounded-lg bg-[#090e17] text-slate-300 hover:text-white border border-[#1e2c40] hover:bg-[#152236] transition-all cursor-pointer flex items-center gap-1.5 text-xs font-medium"
              title="Treasury FX Multi-Currency Converter"
            >
              <Coins className="w-3.5 h-3.5 text-[#c59b4c]" />
              <span className="hidden sm:inline">FX Rates</span>
            </button>

            {/* Notifications Indicator */}
            <button
              onClick={() => {
                setActiveTab('profile');
                setSettingsSection('notifications');
              }}
              className="relative p-2 rounded-lg bg-[#090e17] text-slate-300 hover:text-white border border-[#1e2c40] hover:bg-[#152236] transition-all cursor-pointer shadow-xs"
              title="Notifications"
            >
              <Bell className="w-3.5 h-3.5" />
              {notifications.filter((n) => !n.read).length > 0 && (
                <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-[#c59b4c] text-[#090e17] text-[8.5px] font-black rounded-full flex items-center justify-center">
                  {notifications.filter((n) => !n.read).length}
                </span>
              )}
            </button>

            {/* User Profile Menu */}
            <div className="relative">
              <button
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-[#090e17] hover:bg-[#152236] border border-[#1e2c40] text-white transition-all cursor-pointer shadow-xs"
              >
                <div className="w-6 h-6 rounded-md bg-[#c59b4c] text-[#090e17] flex items-center justify-center font-bold text-xs shrink-0">
                  {user.fullName.charAt(0)}
                </div>
                <div className="hidden md:flex flex-col text-left">
                  <span className="text-xs font-bold text-white truncate max-w-[95px]">
                    {user.fullName.split(' ')[0]}
                  </span>
                  <span className="text-[9px] text-[#c59b4c] font-mono font-semibold">
                    {formatCurrency(user.walletBalance)}
                  </span>
                </div>
                <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform duration-200 ${userDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {userDropdownOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-[#101a2a] border border-[#1e2c40] rounded-xl shadow-2xl py-2 z-50 text-left animate-in fade-in duration-150">
                  <div className="px-3.5 py-2 border-b border-[#1e2c40] mb-1">
                    <p className="text-[9.5px] uppercase font-bold text-slate-400">Authorized Account</p>
                    <p className="text-xs font-bold text-white truncate mt-0.5">{user.email}</p>
                    <p className="text-[10px] font-mono font-semibold text-[#c59b4c] mt-0.5">
                      Available Cash: {formatCurrency(user.walletBalance)}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setActiveTab('wallet');
                      setUserDropdownOpen(false);
                    }}
                    className="w-full text-left px-3.5 py-2 text-xs text-slate-300 hover:text-white hover:bg-[#152236] flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <Wallet className="w-3.5 h-3.5 text-[#c59b4c]" />
                    <span>Treasury &amp; Cash Accounts</span>
                  </button>
                  <button
                    onClick={() => {
                      setActiveTab('portfolio');
                      setUserDropdownOpen(false);
                    }}
                    className="w-full text-left px-3.5 py-2 text-xs text-slate-300 hover:text-white hover:bg-[#152236] flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <Building2 className="w-3.5 h-3.5 text-[#c59b4c]" />
                    <span>My Property Holdings</span>
                  </button>
                  <button
                    onClick={() => {
                      setActiveTab('profile');
                      setSettingsSection('profile');
                      setUserDropdownOpen(false);
                    }}
                    className="w-full text-left px-3.5 py-2 text-xs text-slate-300 hover:text-white hover:bg-[#152236] flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <User className="w-3.5 h-3.5 text-[#c59b4c]" />
                    <span>Profile &amp; Settings</span>
                  </button>
                  <div className="border-t border-[#1e2c40] my-1" />
                  <button
                    onClick={() => {
                      logout();
                      setUserDropdownOpen(false);
                    }}
                    className="w-full text-left px-3.5 py-2 text-xs font-semibold text-rose-400 hover:bg-rose-950/40 flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileHeaderMenuOpen(!mobileHeaderMenuOpen)}
              className="lg:hidden p-2 rounded-lg bg-[#090e17] text-white border border-[#1e2c40] cursor-pointer"
              title="Toggle Menu"
            >
              {mobileHeaderMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </header>

        {/* Mobile Header Menu */}
        {mobileHeaderMenuOpen && (
          <div className="lg:hidden bg-[#0d1522] border-b border-[#1a2638] px-4 py-3 space-y-2 z-30 shadow-2xl animate-in slide-in-from-top-2 duration-150">
            <div className="grid grid-cols-2 gap-1.5">
              {executiveWorkspaces.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    setMobileHeaderMenuOpen(false);
                  }}
                  className={`p-2 rounded-lg text-left text-xs font-semibold flex items-center gap-2 ${
                    activeTab === item.id ? 'bg-[#c59b4c] text-[#090e17]' : 'bg-[#101a2a] text-slate-300'
                  }`}
                >
                  <item.icon className="w-3.5 h-3.5" />
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Scrollable Content Area */}
        <main className="app-content-scroll flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6">
          <div className="max-w-[1400px] w-full mx-auto space-y-6 text-left">

            {/* 1. EXECUTIVE COMMAND CENTER OVERVIEW */}
            {activeTab === 'overview' && (
              <div className="space-y-6 animate-in fade-in duration-200">
                {/* Top Executive KPI Metric Strip */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 sm:gap-4">
                  <div className="bg-[#101a2a] p-4 sm:p-5 rounded-2xl border border-[#1e2c40] shadow-md">
                    <p className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400">Portfolio Net Valuation</p>
                    <p className="text-xl sm:text-2xl font-extrabold font-mono text-white mt-1">
                      {formatCurrency(totalPortfolioValue)}
                    </p>
                    <p className="text-[10px] text-emerald-400 font-medium mt-1">
                      +{investments.length} Active SPV Holdings
                    </p>
                  </div>

                  <div className="bg-[#101a2a] p-4 sm:p-5 rounded-2xl border border-[#1e2c40] shadow-md">
                    <p className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400">Available Liquid Cash</p>
                    <p className="text-xl sm:text-2xl font-extrabold font-mono text-[#c59b4c] mt-1">
                      {formatCurrency(user.walletBalance)}
                    </p>
                    <p className="text-[10px] text-slate-400 font-medium mt-1">
                      CaixaBank Escrow Account
                    </p>
                  </div>

                  <div className="bg-[#101a2a] p-4 sm:p-5 rounded-2xl border border-[#1e2c40] shadow-md">
                    <p className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400">Estimated Monthly Rent</p>
                    <p className="text-xl sm:text-2xl font-extrabold font-mono text-emerald-400 mt-1">
                      {formatCurrency(totalMonthlyYieldEstimated)}
                    </p>
                    <p className="text-[10px] text-emerald-400 font-medium mt-1">
                      Credited on 1st of month
                    </p>
                  </div>

                  <div className="bg-[#101a2a] p-4 sm:p-5 rounded-2xl border border-[#1e2c40] shadow-md">
                    <p className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400">Tokenized Shares Held</p>
                    <p className="text-xl sm:text-2xl font-extrabold font-mono text-white mt-1">
                      {totalTokensHeld} Units
                    </p>
                    <p className="text-[10px] text-[#c59b4c] font-medium mt-1">
                      100% Notarized Legal Deeds
                    </p>
                  </div>
                </div>

                {/* Quick Action Command Toolbar */}
                <div className="bg-[#101a2a] p-4 rounded-2xl border border-[#1e2c40] shadow-md flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[#c59b4c]" />
                    <span className="text-xs font-bold uppercase tracking-wider text-white">Instant Treasury Commands:</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => {
                        setActiveTab('wallet');
                        setIsDepositOpen(true);
                      }}
                      className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                    >
                      <ArrowDownLeft className="w-3.5 h-3.5 stroke-[2.5]" /> Deposit Cash / Crypto
                    </button>
                    <button
                      onClick={() => {
                        setActiveTab('wallet');
                        setIsWithdrawOpen(true);
                      }}
                      className="px-3.5 py-2 rounded-xl bg-[#152236] hover:bg-[#1e2c40] text-slate-200 border border-[#1e2c40] text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <ArrowUpRight className="w-3.5 h-3.5" /> Wire Withdrawal
                    </button>
                    <button
                      onClick={() => setIsTreasuryConverterOpen(true)}
                      className="px-3.5 py-2 rounded-xl bg-[#152236] hover:bg-[#1e2c40] text-slate-200 border border-[#1e2c40] text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Coins className="w-3.5 h-3.5 text-[#c59b4c]" /> FX Converter
                    </button>
                    <button
                      onClick={() => setActiveTab('portfolio')}
                      className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#c59b4c] to-[#d6a15d] hover:brightness-110 text-[#090e17] text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
                    >
                      <Building2 className="w-3.5 h-3.5" /> Acquire Landmark Units
                    </button>
                  </div>
                </div>

                {/* Account Lifecycle Pipeline */}
                <ColoredPipeline
                  title="Investor Account &amp; Ownership Lifecycle"
                  subtitle="Regulated European participatory model progression"
                  stages={[
                    {
                      id: 'stg-1',
                      title: 'Account Registered',
                      description: 'Investor profile created and authenticated on L\'Agence platform.',
                      status: 'completed',
                      timestamp: 'Verified',
                      metrics: { label: 'Account Tier', value: 'VIP Institutional' },
                    },
                    {
                      id: 'stg-2',
                      title: 'Identity (KYC/AML)',
                      description: 'European regulatory anti-money laundering verification.',
                      status: user.kycStatus === 'verified' ? 'completed' : 'active',
                      timestamp: user.kycStatus === 'verified' ? 'Verified' : 'In Review',
                      metrics: { label: 'Compliance', value: user.kycStatus === 'verified' ? 'EU Passed' : 'Pending Docs' },
                    },
                    {
                      id: 'stg-3',
                      title: 'Wallet Funded',
                      description: 'SEPA bank transfer or crypto deposit cleared in CaixaBank escrow.',
                      status: user.walletBalance > 0 ? 'completed' : 'pending',
                      metrics: { label: 'Available Cash', value: formatCurrency(user.walletBalance) },
                    },
                    {
                      id: 'stg-4',
                      title: 'Asset Tokens Held',
                      description: 'Notarized SPV property shares allocated to your private wallet.',
                      status: investments.length > 0 ? 'completed' : 'upcoming',
                      metrics: { label: 'Holdings', value: `${investments.length} Properties` },
                    },
                    {
                      id: 'stg-5',
                      title: 'Monthly Yields',
                      description: 'Automated dividend payouts credited on the 1st of every month.',
                      status: investments.length > 0 ? 'active' : 'upcoming',
                      metrics: { label: 'Est. APY', value: '9.4% - 12.8%' },
                    },
                  ]}
                />

                {/* Main Dashboard Cards: BalanceCard & Recharts Property Analytics */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  <div className="lg:col-span-5 space-y-6">
                    <BalanceCard
                      user={user}
                      onDeposit={() => {
                        setActiveTab('wallet');
                        setIsDepositOpen(true);
                      }}
                      onWithdraw={() => {
                        setActiveTab('wallet');
                        setIsWithdrawOpen(true);
                      }}
                    />
                    <YieldDistributionFlowDiagram />
                  </div>
                  <div className="lg:col-span-7 space-y-6">
                    <RechartsPropertyDashboard
                      properties={properties}
                      investments={investments}
                      transactions={transactions}
                    />
                    <AssetAllocationChart totalValue={totalInvestedAmount || 28450} />
                  </div>
                </div>

                {/* Monthly Dividend Yield Trends */}
                <YieldPayoutTrendsChart transactions={transactions} investments={investments} />

                {/* Recent Transactions Snippet */}
                <div className="bg-[#101a2a] p-5 rounded-2xl border border-[#1e2c40] shadow-md space-y-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-base font-bold text-white">Recent Ledger Transactions</h3>
                      <p className="text-xs text-slate-400">Verifiable double-entry ledger transactions</p>
                    </div>
                    <button
                      onClick={() => setActiveTab('transactions')}
                      className="text-xs font-semibold text-[#c59b4c] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      Open Full Audit Ledger ({transactions.length}) <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <TransactionTable transactions={transactions} maxRows={5} />
                </div>
              </div>
            )}

            {/* 2. PORTFOLIO & PROPERTIES WORKSPACE */}
            {activeTab === 'portfolio' && (
              <div className="space-y-6 animate-in fade-in duration-200">
                {/* Active Property Holdings */}
                <div className="bg-[#101a2a] p-5 sm:p-6 rounded-2xl border border-[#1e2c40] shadow-md space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#1e2c40]">
                    <div>
                      <h2 className="text-lg font-bold text-white">My Property Investments</h2>
                      <p className="text-xs text-slate-400">Owned fractional property units, circular yield tracking, and notarized contracts.</p>
                    </div>
                    <button 
                      onClick={() => {
                        const el = document.getElementById('marketplace-explorer');
                        el?.scrollIntoView({ behavior: 'smooth' });
                      }}
                      className="px-4 py-2 rounded-xl bg-[#c59b4c] text-[#090e17] text-xs font-bold hover:brightness-110 cursor-pointer"
                    >
                      Explore Available Landmarks
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
                    onExploreProperties={() => {
                      const el = document.getElementById('marketplace-explorer');
                      el?.scrollIntoView({ behavior: 'smooth' });
                    }}
                  />
                </div>

                {/* Portfolio Performance Historical Valuation Chart */}
                <PortfolioPerformanceChart 
                  initialValuation={totalInvestedAmount > 0 ? totalInvestedAmount * 0.9 : 20000}
                  currentValuation={totalPortfolioValue}
                  totalDividends={totalDividendsEarned}
                />

                {/* Landmark Marketplace Explorer directly embedded */}
                <div id="marketplace-explorer" className="bg-[#101a2a] p-5 sm:p-6 rounded-2xl border border-[#1e2c40] shadow-md space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#1e2c40]">
                    <div>
                      <h2 className="text-lg font-bold text-white">Prime Landmark Marketplace</h2>
                      <p className="text-xs text-slate-400">Acquire fractional tokens with verified SPV deeds from €100 / unit.</p>
                    </div>
                    <button onClick={onExploreProperties} className="text-xs font-bold text-[#c59b4c] hover:underline flex items-center gap-1 cursor-pointer">
                      Browse Public Register <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {frontendProperties.slice(0, 6).map((property) => (
                      <PropertyCard
                        key={property.id}
                        property={property}
                        isFavorite={ledger.isFavorite(user.id, property.id)}
                        onSelect={(prop: Property) => onSelectProperty(prop.id)}
                        onInvest={(prop: Property) => {
                          setBuyModalProperty(prop);
                          setBuyModalMode('purchase');
                          setIsBuyModalOpen(true);
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* 3. TREASURY, WALLET & DISTRIBUTIONS WORKSPACE */}
            {activeTab === 'wallet' && (
              <div className="space-y-6 animate-in fade-in duration-200">
                {/* Treasury Accounts & Balance */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  <div className="lg:col-span-5 space-y-6">
                    <BalanceCard
                      user={user}
                      onDeposit={() => setIsDepositOpen(true)}
                      onWithdraw={() => setIsWithdrawOpen(true)}
                    />
                    <div className="bg-[#101a2a] p-5 rounded-2xl border border-[#1e2c40] shadow-md space-y-3">
                      <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        <Coins className="w-4 h-4 text-[#c59b4c]" />
                        <span>Multi-Currency FX Converter</span>
                      </h3>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        Instant zero-slippage cross-currency conversion between EUR, USD, GBP, USDT, and USDC with institutional rate feeds.
                      </p>
                      <button
                        onClick={() => setIsTreasuryConverterOpen(true)}
                        className="w-full py-2.5 px-4 rounded-xl bg-[#152236] hover:bg-[#1e2c40] text-slate-200 border border-[#1e2c40] text-xs font-bold transition-colors cursor-pointer"
                      >
                        Launch FX Treasury Converter
                      </button>
                    </div>
                  </div>

                  <div className="lg:col-span-7">
                    <SolanaWalletManager />
                  </div>
                </div>

                {/* Rental Distributions View */}
                <div className="bg-[#101a2a] p-5 sm:p-6 rounded-2xl border border-[#1e2c40] shadow-md">
                  <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#1e2c40]">
                    <div>
                      <h3 className="text-base font-bold text-white">Monthly Rental Distributions</h3>
                      <p className="text-xs text-slate-400">Automated dividend payouts credited on the 1st of every month</p>
                    </div>
                    <span className="text-[10px] uppercase font-bold text-emerald-400 bg-emerald-950/70 border border-emerald-800/60 px-2 py-0.5 rounded-full">
                      Automated Escrow
                    </span>
                  </div>
                  <DistributionsView
                    investments={investments}
                    transactions={transactions}
                    onSelectProperty={onSelectProperty}
                    onExploreProperties={onExploreProperties}
                  />
                </div>
              </div>
            )}

            {/* 4. ANALYTICS & YIELD INTELLIGENCE WORKSPACE */}
            {activeTab === 'analytics' && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <ProjectedYieldGrowthChart
                  properties={frontendProperties.length > 0 ? frontendProperties : properties}
                  investments={investments}
                  onSelectProperty={onSelectProperty}
                  onExploreProperties={() => setActiveTab('portfolio')}
                />
                <InvestorAnalyticsSuite
                  properties={properties}
                  investments={investments}
                  transactions={transactions}
                  walletBalance={user.walletBalance}
                  onExploreProperties={() => setActiveTab('portfolio')}
                  onSelectProperty={onSelectProperty}
                  onOpenTransactions={() => setActiveTab('transactions')}
                />
                <TokenizationArchitectureDiagram />
              </div>
            )}

            {/* 5. AUDIT TRAIL & TRANSACTIONS WORKSPACE */}
            {activeTab === 'transactions' && (
              <div className="bg-[#101a2a] p-5 sm:p-6 rounded-2xl border border-[#1e2c40] shadow-md space-y-4 animate-in fade-in duration-200">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#1e2c40]">
                  <div>
                    <h2 className="text-lg font-bold text-white">Double-Entry Audit Ledger</h2>
                    <p className="text-xs text-slate-400">Verifiable immutable transaction logs, hashes, and download receipts.</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setIsDepositOpen(true)}
                      className="px-3.5 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-500 cursor-pointer"
                    >
                      + New Deposit
                    </button>
                  </div>
                </div>
                <TransactionTable transactions={transactions} />
              </div>
            )}

            {/* 6. LEGAL VAULT, DOCUMENTS & TAX REPORTS WORKSPACE */}
            {activeTab === 'documents' && (
              <div className="space-y-6 animate-in fade-in duration-200">
                {/* Official Legal Documents & SPV Deeds */}
                <div className="bg-[#101a2a] p-5 sm:p-6 rounded-2xl border border-[#1e2c40] shadow-md space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#1e2c40]">
                    <div>
                      <h2 className="text-lg font-bold text-white">Notarized Legal SPV Documents</h2>
                      <p className="text-xs text-slate-400">Official land registry title deeds, articles of incorporation, and ownership certificates.</p>
                    </div>
                  </div>

                  {investments.length === 0 ? (
                    <div className="p-8 text-center bg-[#090e17] rounded-xl border border-[#1e2c40] space-y-2">
                      <FileText className="w-8 h-8 text-slate-500 mx-auto" />
                      <p className="text-sm font-bold text-white">No active investment deeds</p>
                      <p className="text-xs text-slate-400 max-w-md mx-auto">
                        Once you acquire fractional units in any landmark building, your notarized legal deed and SPV shareholder certificate will be issued here.
                      </p>
                      <button
                        onClick={() => setActiveTab('portfolio')}
                        className="mt-3 px-4 py-2 rounded-xl bg-[#c59b4c] text-[#090e17] text-xs font-bold hover:brightness-110 cursor-pointer"
                      >
                        Acquire First Landmark
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {investments.map((inv) => {
                        const prop = properties.find((p) => p.id === inv.propertyId);
                        return (
                          <div key={inv.id} className="bg-[#090e17] p-4 rounded-xl border border-[#1e2c40] space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] uppercase font-bold text-[#c59b4c]">Notarized Deed</span>
                              <span className="text-[10px] text-slate-400 font-mono">{inv.id}</span>
                            </div>
                            <h4 className="font-bold text-white text-sm">{inv.propertyTitle}</h4>
                            <p className="text-xs text-slate-400">{inv.tokensPurchased} Tokenized SPV Units · {formatCurrency(inv.totalAmountInvested)}</p>
                            <div className="pt-2 flex gap-2">
                              <button
                                onClick={() => setSelectedDocInvestment(inv)}
                                className="w-full py-2 px-3 rounded-lg bg-[#152236] hover:bg-[#1e2c40] text-slate-200 border border-[#1e2c40] text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                              >
                                <FileText className="w-3.5 h-3.5 text-[#c59b4c]" />
                                <span>View Legal Deed</span>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Annual Tax Report Generator */}
                <TaxReportGenerator />

                {/* Compliance & KYC Upload Vault */}
                <DocumentUploadVault />
              </div>
            )}

            {/* 7. VIP DESK & SETTINGS WORKSPACE */}
            {activeTab === 'profile' && (
              <div className="space-y-6 animate-in fade-in duration-200">
                {/* Sub-tab Navigation */}
                <div className="flex flex-wrap items-center gap-2 border-b border-[#1e2c40] pb-3">
                  {[
                    { id: 'profile', label: 'Investor Profile & KYC', icon: User },
                    { id: 'referrals', label: 'VIP Referral Hub', icon: Share2 },
                    { id: 'notifications', label: 'Notifications Feed', icon: Bell, count: notifications.filter(n => !n.read).length },
                    { id: 'support', label: 'Advisory Support Desk', icon: HelpCircle },
                  ].map((sub) => {
                    const Icon = sub.icon;
                    const isSelected = settingsSection === sub.id;
                    return (
                      <button
                        key={sub.id}
                        onClick={() => setSettingsSection(sub.id as any)}
                        className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                          isSelected
                            ? 'bg-[#c59b4c] text-[#090e17] shadow-sm'
                            : 'bg-[#101a2a] text-slate-300 hover:bg-[#152236] border border-[#1e2c40]'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        <span>{sub.label}</span>
                        {sub.count !== undefined && sub.count > 0 && (
                          <span className="ml-1 px-1.5 py-0.2 rounded-full text-[9px] bg-rose-500 text-white font-mono">
                            {sub.count}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Profile Sub-section */}
                {settingsSection === 'profile' && (
                  <ProfilePage />
                )}

                {/* Referrals Sub-section */}
                {settingsSection === 'referrals' && (
                  <div className="bg-[#101a2a] p-5 sm:p-7 rounded-2xl border border-[#1e2c40] shadow-md space-y-6">
                    <div>
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#c59b4c]/20 border border-[#c59b4c]/40 text-[#d6a15d] text-xs font-bold uppercase tracking-wider mb-2">
                        <Gift className="w-3.5 h-3.5" />
                        <span>VIP Executive Partnership</span>
                      </div>
                      <h3 className="text-xl font-bold text-white">VIP Associate Referral Program</h3>
                      <p className="text-xs text-slate-300 mt-1 max-w-xl">
                        Introduce qualified private investors to L'Agence. Both you and your associate receive a €500 investment credit on their first notarized SPV property allocation.
                      </p>
                    </div>

                    {/* Referral Link & Code Box */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-[#090e17] p-4 rounded-xl border border-[#1e2c40] space-y-2">
                        <p className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400">Your Exclusive Link</p>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            readOnly
                            value={referralLink}
                            className="flex-1 bg-[#101a2a] text-xs text-white font-mono px-3 py-2 rounded-lg border border-[#1e2c40]"
                          />
                          <button
                            onClick={() => copyReferral()}
                            className="p-2 rounded-lg bg-[#c59b4c] text-[#090e17] font-bold text-xs hover:brightness-110 cursor-pointer"
                            title="Copy Link"
                          >
                            {copiedLink ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      <div className="bg-[#090e17] p-4 rounded-xl border border-[#1e2c40] space-y-2">
                        <p className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400">Referral Code</p>
                        <div className="flex items-center gap-2">
                          <span className="flex-1 bg-[#101a2a] text-xs text-[#c59b4c] font-mono font-bold px-3 py-2 rounded-lg border border-[#1e2c40]">
                            {referralCode}
                          </span>
                          <button
                            onClick={copyReferralCode}
                            className="p-2 rounded-lg bg-[#152236] text-white font-bold text-xs hover:bg-[#1e2c40] border border-[#1e2c40] cursor-pointer"
                            title="Copy Code"
                          >
                            {copiedCode ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Invite Associate Email Form */}
                    <form onSubmit={handleSendInvite} className="bg-[#090e17] p-4 rounded-xl border border-[#1e2c40] space-y-3">
                      <h4 className="text-xs font-bold text-white uppercase tracking-wider">Dispatch VIP Associate Invitation</h4>
                      <div className="flex flex-col sm:flex-row gap-2">
                        <input
                          type="email"
                          placeholder="associate.email@familyoffice.com"
                          value={inviteEmail}
                          onChange={(e) => setInviteEmail(e.target.value)}
                          className="flex-1 bg-[#101a2a] text-xs text-white px-3.5 py-2.5 rounded-xl border border-[#1e2c40] focus:outline-none focus:border-[#c59b4c]"
                        />
                        <button
                          type="submit"
                          disabled={isSendingInvite}
                          className="px-5 py-2.5 rounded-xl bg-[#c59b4c] text-[#090e17] font-bold text-xs hover:brightness-110 cursor-pointer flex items-center justify-center gap-1.5"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>Dispatch Invite</span>
                        </button>
                      </div>
                      {inviteSentToast && <p className="text-xs text-emerald-400">{inviteSentToast}</p>}
                      {inviteError && <p className="text-xs text-rose-400">{inviteError}</p>}
                    </form>
                  </div>
                )}

                {/* Notifications Sub-section */}
                {settingsSection === 'notifications' && (
                  <div className="bg-[#101a2a] p-5 sm:p-7 rounded-2xl border border-[#1e2c40] shadow-md space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-[#1e2c40]">
                      <div>
                        <h3 className="text-base font-bold text-white">Notifications &amp; Activity Log</h3>
                        <p className="text-xs text-slate-400">Important legal updates, monthly payouts, and security alerts</p>
                      </div>
                    </div>

                    {notifications.length === 0 ? (
                      <div className="p-8 text-center text-xs text-slate-400 bg-[#090e17] rounded-xl border border-[#1e2c40]">
                        No notifications currently.
                      </div>
                    ) : (
                      <div className="space-y-2.5">
                        {notifications.map((n) => (
                          <div
                            key={n.id}
                            className="bg-[#090e17] p-4 rounded-xl border border-[#1e2c40] flex items-start gap-3"
                          >
                            <Bell className="w-4 h-4 text-[#c59b4c] shrink-0 mt-0.5" />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2">
                                <h4 className="font-bold text-white text-xs">{n.title}</h4>
                                <span className="text-[10px] text-slate-500">{formatDate(n.createdAt)}</span>
                              </div>
                              <p className="text-xs text-slate-300 mt-1">{n.message}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Support Sub-section */}
                {settingsSection === 'support' && (
                  <div className="bg-[#101a2a] p-5 sm:p-7 rounded-2xl border border-[#1e2c40] shadow-md space-y-5">
                    <div>
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/60 border border-emerald-800/40 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-2">
                        <HelpCircle className="w-3.5 h-3.5" />
                        <span>Advisory Support Desk</span>
                      </div>
                      <h3 className="text-xl font-bold text-white">Investor Client Advisory Desk</h3>
                      <p className="text-xs text-slate-300 mt-1">
                        Our European luxury property specialists and legal advisors are on call. Inquiries are dispatched directly to <strong>info@kretz.site</strong> with an estimated turnaround under 2 hours.
                      </p>
                    </div>

                    <form onSubmit={handleSupportSubmit} className="space-y-4 bg-[#090e17] p-5 rounded-xl border border-[#1e2c40]">
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                          Inquiry Topic
                        </label>
                        <input
                          type="text"
                          placeholder="e.g., SEPA Wire Deposit verification, SPV Notary Deed copy"
                          value={supportSubject}
                          onChange={(e) => setSupportSubject(e.target.value)}
                          className="w-full bg-[#101a2a] text-xs text-white px-3.5 py-2.5 rounded-xl border border-[#1e2c40] focus:outline-none focus:border-[#c59b4c]"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                          Inquiry Details
                        </label>
                        <textarea
                          rows={4}
                          placeholder="Provide details regarding your asset allocation, escrow query, or tax report..."
                          value={supportMessage}
                          onChange={(e) => setSupportMessage(e.target.value)}
                          className="w-full bg-[#101a2a] text-xs text-white px-3.5 py-2.5 rounded-xl border border-[#1e2c40] focus:outline-none focus:border-[#c59b4c]"
                        />
                      </div>

                      {supportFeedback && (
                        <p className="text-xs text-emerald-400 bg-emerald-950/60 p-3 rounded-lg border border-emerald-800/40">
                          {supportFeedback}
                        </p>
                      )}
                      {supportError && (
                        <p className="text-xs text-rose-400 bg-rose-950/60 p-3 rounded-lg border border-rose-800/40">
                          {supportError}
                        </p>
                      )}

                      <button
                        type="submit"
                        disabled={isSubmittingSupport}
                        className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#c59b4c] to-[#d6a15d] hover:brightness-110 text-[#090e17] font-bold text-xs uppercase tracking-wider cursor-pointer"
                      >
                        {isSubmittingSupport ? 'Dispatching...' : 'Dispatch to info@kretz.site'}
                      </button>
                    </form>
                  </div>
                )}
              </div>
            )}

          </div>
        </main>

        {/* Executive Mobile Bottom Navigation Bar */}
        <nav 
          aria-label="Executive Mobile Navigation"
          className="mobile-bottom-nav fixed bottom-0 inset-x-0 z-40 bg-[#0d1522]/95 backdrop-blur-xl border-t border-[#1a2638] px-1 py-1.5 flex items-center justify-between shadow-2xl lg:hidden"
        >
          {executiveWorkspaces.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setMobileHeaderMenuOpen(false);
                }}
                className={`flex-1 flex flex-col items-center justify-center py-1 px-0.5 rounded-lg transition-all cursor-pointer ${
                  isActive 
                    ? 'text-[#c59b4c]' 
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className={`p-1 rounded-md transition-all ${isActive ? 'bg-[#c59b4c]/15 text-[#c59b4c]' : ''}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <span className={`text-[9px] font-semibold tracking-tight truncate max-w-[50px] mt-0.5 ${isActive ? 'font-bold text-white' : ''}`}>
                  {item.id === 'overview' ? 'Overview' :
                   item.id === 'portfolio' ? 'Portfolio' :
                   item.id === 'wallet' ? 'Wallet' :
                   item.id === 'analytics' ? 'Yield' :
                   item.id === 'transactions' ? 'Ledger' :
                   item.id === 'documents' ? 'Vault' : 'Desk'}
                </span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Modals */}
      {isDepositOpen && (
        <DepositModal
          isOpen={isDepositOpen}
          onClose={() => setIsDepositOpen(false)}
          onSuccess={() => {
            setIsDepositOpen(false);
            refreshUser();
          }}
        />
      )}

      {isWithdrawOpen && (
        <WithdrawalModal
          isOpen={isWithdrawOpen}
          onClose={() => setIsWithdrawOpen(false)}
          onSuccess={handleWithdrawalSuccess}
          onNavigateProfile={onNavigateProfile}
        />
      )}

      {isTreasuryConverterOpen && (
        <TreasuryConverterModal
          isOpen={isTreasuryConverterOpen}
          onClose={() => setIsTreasuryConverterOpen(false)}
          onSuccessConversion={() => {
            refreshUser();
            setIsTreasuryConverterOpen(false);
          }}
          onOpenDeposit={() => {
            setIsTreasuryConverterOpen(false);
            setIsDepositOpen(true);
          }}
        />
      )}

      {selectedDocInvestment && (
        <DocumentViewerModal
          isOpen={!!selectedDocInvestment}
          onClose={() => setSelectedDocInvestment(null)}
          investment={selectedDocInvestment}
        />
      )}

      {buyModalProperty && isBuyModalOpen && (
        <UnitPurchaseModal
          isOpen={isBuyModalOpen}
          onClose={() => {
            setIsBuyModalOpen(false);
            setBuyModalProperty(null);
          }}
          property={buyModalProperty}
          allProperties={frontendProperties}
          mode={buyModalMode}
          onSuccess={() => {
            setIsBuyModalOpen(false);
            setBuyModalProperty(null);
            refreshUser();
          }}
          onOpenDeposit={() => {
            setIsBuyModalOpen(false);
            setIsDepositOpen(true);
          }}
        />
      )}
    </div>
  );
};
