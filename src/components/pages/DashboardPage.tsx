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
  Sun, Moon, Tag, Table as TableIcon
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
  const [activeTab, setActiveTab] = useState<string>(defaultTab);
  const [isDepositOpen, setIsDepositOpen] = useState(defaultTab === 'deposit');
  const [isWithdrawOpen, setIsWithdrawOpen] = useState(defaultTab === 'withdraw');
  const [isTreasuryConverterOpen, setIsTreasuryConverterOpen] = useState<boolean>(false);
  const [selectedDocInvestment, setSelectedDocInvestment] = useState<any | null>(null);
  const [brochureProperty, setBrochureProperty] = useState<Property | null>(null);
  const [buyModalProperty, setBuyModalProperty] = useState<Property | null>(null);
  const [buyModalMode, setBuyModalMode] = useState<'purchase' | 'reinvest'>('purchase');
  const [isBuyModalOpen, setIsBuyModalOpen] = useState<boolean>(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [mobileHeaderMenuOpen, setMobileHeaderMenuOpen] = useState(false);
  const [, setLedgerVersion] = useState(0);
  const searchContainerRef = useRef<HTMLDivElement | null>(null);
  const supportSubjectRef = useRef<HTMLInputElement | null>(null);

  // Support Inquiry States
  const [supportSubject, setSupportSubject] = useState('');
  const [supportMessage, setSupportMessage] = useState('');
  const [isSubmittingSupport, setIsSubmittingSupport] = useState(false);
  const [supportFeedback, setSupportFeedback] = useState<string | null>(null);
  const [supportError, setSupportError] = useState<string | null>(null);

  const [dashboardMode, setDashboardMode] = useState<'light' | 'dark'>(() => {
    try {
      const saved = localStorage.getItem('dashboard_mode');
      if (saved === 'light' || saved === 'dark') return saved;
      if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        return 'dark';
      }
    } catch {}
    return 'light';
  });

  const [dashboardTheme, setDashboardTheme] = useState<string>(() => {
    try {
      return localStorage.getItem('dashboard_theme') || 'slate';
    } catch {}
    return 'slate';
  });

  useEffect(() => {
    return ledger.subscribe(() => {
      setLedgerVersion((v) => v + 1);
    });
  }, []);

  useEffect(() => {
    const handleThemeChange = (e: any) => {
      if (e?.detail) {
        setDashboardTheme(e.detail);
      }
    };
    window.addEventListener('dashboard-theme-changed', handleThemeChange);
    return () => window.removeEventListener('dashboard-theme-changed', handleThemeChange);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setUserDropdownOpen(false);
        setMobileHeaderMenuOpen(false);
        setIsMoreMenuOpen(false);
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
    const nextMode = dashboardMode === 'light' ? 'dark' : 'light';
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
      <div className="min-h-[50vh] flex items-center justify-center p-8 bg-[#F6F7F4]">
        <div className="w-8 h-8 border-3 border-[#182D2A] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const investments = ledger.getInvestments(user.id);
  const transactions = ledger.getTransactions(user.id);
  const notifications = ledger.getNotifications(user.id);
  const properties = ledger.getProperties();
  const frontendProperties = ledger.getFrontendProperties();
  const verificationDocs = ledger.getVerificationDocuments(user.id);
  void verificationDocs;

  const handleWithdrawalSuccess = () => {
    refreshUser();
  };

  const referralCode = `KRETZ-${(user.email ? user.email.split('@')[0] : user.id.slice(0, 6) || 'VIP').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8)}`;

  const productionReferralLink = `https://kretzdespain.com/register?ref=${referralCode}`;
  const currentOrigin = typeof window !== 'undefined' && window.location.origin ? window.location.origin : 'https://kretzdespain.com';
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

  const shareMessage = `I invite you to explore European prime real estate tokenization with L'Agence / Kretz & De Spain. Register with my private referral link to receive a €500 allocation credit on your first notarized SPV property investment:`;

  const whatsappShareHref = `https://api.whatsapp.com/send?text=${encodeURIComponent(`${shareMessage} ${referralLink}`)}`;
  const telegramShareHref = `https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=${encodeURIComponent(shareMessage)}`;
  const twitterShareHref = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareMessage)}&url=${encodeURIComponent(referralLink)}`;
  const linkedInShareHref = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(referralLink)}`;
  const emailShareSubject = `Private Invitation: L'Agence | Kretz & De Spain Real Estate Tokenization`;
  const emailShareBody = `Dear Partner,\n\nI invite you to explore European prime real estate tokenization with L'Agence / Kretz & De Spain.\n\nBy registering with my private investor referral link, you will receive an immediate €500 allocation credit on your first notarized SPV acquisition:\n\n${referralLink}\n\nReferral Partner Code: ${referralCode}\n\nKind regards,\n${user.fullName || 'Private Client'}\nL'Agence / Kretz & De Spain Real Estate`;
  const mailtoShareHref = `mailto:?subject=${encodeURIComponent(emailShareSubject)}&body=${encodeURIComponent(emailShareBody)}`;

  const shareNative = async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: "L'Agence | Kretz & De Spain Referral Invitation",
          text: shareMessage,
          url: referralLink,
        });
      } catch {
        // user cancelled
      }
    } else {
      copyReferral();
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

  const navItems = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'analytics', label: 'Portfolio Analytics', icon: PieChart },
    { id: 'portfolio', label: 'My Portfolio', icon: Building2, count: investments.length },
    { id: 'properties', label: 'Explore Properties', icon: TrendingUp },
    { id: 'transactions', label: 'Transactions', icon: History, count: transactions.length },
    { id: 'distributions', label: 'Distributions', icon: Coins },
    { id: 'wallet', label: 'Wallet', icon: Wallet },
    { id: 'verification', label: 'Compliance Vault', icon: ShieldCheck },
    { id: 'profile', label: 'Profile Settings', icon: User },
    { id: 'documents', label: 'Documents', icon: FileText, count: investments.length },
    { id: 'tax_statements', label: 'Tax & Fiscal Reports', icon: Award },
    { id: 'referrals', label: 'Referrals', icon: Share2 },
    { id: 'notifications', label: 'Notifications', icon: Bell, count: notifications.filter(n => !n.read).length },
    { id: 'support', label: 'Help & Support', icon: HelpCircle },
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

    const matchedSections = navItems
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
    <div className={`app-shell dashboard-${dashboardMode} dashboard-theme-${dashboardTheme}`}>
      {/* Desktop Fixed-Width Sidebar */}
      <aside className="app-sidebar hidden md:flex">
        {/* Brand / Logo */}
        <div 
          onClick={onNavigateHome}
          className="p-2.5 border-b border-[var(--dash-sidebar-border)] flex items-center gap-2 cursor-pointer hover:opacity-90 transition-opacity"
        >
          <img 
            src="/assets/aistudio/IMG_7234_bd44519a.jpeg" 
            alt="L'Agence Logo" 
            className="w-6 h-6 rounded-lg object-cover shadow-2xs border border-emerald-500/30"
            style={{ filter: 'brightness(1.35) contrast(1.22) saturate(1.1)' }}
          />
          <div className="min-w-0">
            <h2 className="font-bold text-[11px] text-[var(--dash-text)] tracking-tight leading-tight truncate">L'Agence Real Estate</h2>
            <p className="text-[8.5px] text-[var(--dash-text-muted)] leading-tight truncate">Prestige &amp; Tokenized Assets</p>
          </div>
        </div>

        {/* User Mini Card */}
        <div className="p-1.5 mx-2 my-1.5 bg-[var(--dash-sidebar-card)] rounded-lg border border-[var(--dash-sidebar-border)] flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-[#1E3A34] text-white flex items-center justify-center font-bold text-[10px] shrink-0">
            {user.fullName.split(' ').map(n => n[0]).join('')}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-bold text-[11px] text-[var(--dash-text)] truncate leading-tight">{user.fullName}</h3>
            <div className="flex items-center gap-1 mt-0.5">
              {user.kycStatus === 'verified' && (
                <span className="inline-flex items-center gap-0.5 text-[8px] font-semibold text-emerald-600 dark:text-[#B7E36A] bg-emerald-500/10 dark:bg-[#27845D]/30 px-1 py-0.2 rounded">
                  <ShieldCheck className="w-2 h-2" /> Verified
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 overflow-y-auto px-2 py-1 space-y-0.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center justify-between px-2 py-1.5 rounded-md text-[11.5px] font-medium transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[var(--dash-sidebar-active-bg)] text-[var(--dash-sidebar-active-text)] font-bold shadow-2xs'
                    : 'text-[var(--dash-text-secondary)] hover:bg-[var(--dash-sidebar-hover-bg)] hover:text-[var(--dash-text)]'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-[var(--dash-sidebar-active-text)]' : 'opacity-70'}`} />
                  <span className="truncate">{item.label}</span>
                </div>
                {item.count !== undefined && item.count > 0 && (
                  <span className={`px-1 py-0.2 rounded text-[8.5px] font-bold shrink-0 ml-1 ${
                    isActive ? 'bg-black/20 text-white' : 'bg-[var(--dash-inner)] text-[var(--dash-text)]'
                  }`}>
                    {item.count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Sidebar Shortcut Nav Bar including Logout */}
        <div className="p-2 border-t border-[var(--dash-sidebar-border)] bg-[var(--dash-sidebar-card)] space-y-1.5">
          <div className="text-[9px] font-bold uppercase tracking-wider text-[var(--dash-text-muted)] px-1 flex items-center justify-between">
            <span>Quick Actions</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            <button
              onClick={() => setIsDepositOpen(true)}
              className="flex items-center justify-center gap-1 bg-white hover:bg-neutral-200 text-black text-[10.5px] font-bold rounded-md py-1.5 px-2 shadow-xs transition-colors cursor-pointer"
              title="Deposit Funds"
            >
              <ArrowDownLeft className="w-3 h-3 stroke-[2.5]" /> Deposit
            </button>
            <button
              onClick={() => setIsWithdrawOpen(true)}
              className="flex items-center justify-center gap-1 bg-[#151515] hover:bg-[#1D1D1D] text-white border border-[#303030] text-[10.5px] font-semibold rounded-md py-1.5 px-2 transition-colors cursor-pointer"
              title="Withdraw Funds"
            >
              <ArrowUpRight className="w-3 h-3" /> Withdraw
            </button>
          </div>
          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-1 bg-[#151515] hover:bg-[#FF4D4D]/20 text-[#FF4D4D] border border-[#FF4D4D]/30 text-[10.5px] font-semibold rounded-md py-1.5 px-2 transition-colors cursor-pointer"
            title="Log out of account"
          >
            <LogOut className="w-3 h-3" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content Wrapper */}
      <div className="app-main-area pb-14 md:pb-0">
        {/* Compact Website Dashboard Header */}
        <header className="bg-[var(--dash-header)] border-b border-[var(--dash-header-border)] backdrop-blur-md h-14 sm:h-16 shrink-0 z-40 px-3 sm:px-5 lg:px-6 flex items-center justify-between sticky top-0 shadow-xs transition-colors">
          {/* Left: Company Logo and Brand Name */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={onNavigateHome}
              className="flex items-center gap-2 text-left cursor-pointer group focus:outline-none"
              style={{ background: 'none', border: 'none', padding: 0 }}
              title="Return to Home"
            >
              <img 
                src="/assets/aistudio/IMG_7234_bd44519a.jpeg" 
                alt="L'Agence Logo" 
                className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg object-cover shadow-xs border border-[var(--dash-header-border)] group-hover:border-[#1E3A34] dark:group-hover:border-[#D6A15D] transition-colors shrink-0"
                style={{ filter: 'brightness(1.35) contrast(1.22) saturate(1.1)' }}
              />
              <div className="flex flex-col">
                <span className="text-sm sm:text-base font-bold tracking-tight text-[var(--dash-text)] leading-tight">
                  L'Agence<span className="text-[#1E3A34] dark:text-[#D6A15D]">.</span>
                </span>
                <span className="text-[8.5px] uppercase tracking-wider font-semibold text-[var(--dash-text-muted)]">
                  Investor Portal
                </span>
              </div>
            </button>
          </div>

          {/* Center Navigation: Dashboard, Investments, Transactions, Reports, Portfolio */}
          <nav className="hidden lg:flex items-center gap-1 bg-[var(--dash-header-controls)] px-2 py-1 rounded-xl border border-[var(--dash-header-controls-border)] shadow-xs">
            {[
              { id: 'overview', label: 'Dashboard', icon: LayoutDashboard },
              { id: 'analytics', label: 'Analytics', icon: PieChart },
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
                  className={`relative px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                    isActive
                      ? 'bg-[var(--dash-card)] text-[var(--dash-text)] font-bold shadow-2xs border border-[var(--dash-card-border)]'
                      : 'text-[var(--dash-text-secondary)] hover:text-[var(--dash-text)] hover:bg-[var(--dash-hover)]'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-[#1E3A34] dark:text-[#D6A15D]' : 'opacity-70'}`} />
                  <span>{item.label}</span>
                  {isActive && (
                    <span className="absolute bottom-0 left-2.5 right-2.5 h-[2px] bg-[#1E3A34] dark:bg-[#D6A15D] rounded-full" />
                  )}
                </button>
              );
            })}
          </nav>

          {/* Right Side: Compact search field, mode toggle, notification bell, and user profile menu */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            {/* Compact Search Field with Live Interactive Results Popover */}
            <div ref={searchContainerRef} className="hidden xl:flex items-center relative">
              <Search className="w-3.5 h-3.5 text-[var(--dash-text-muted)] absolute left-2.5 pointer-events-none" />
              <input
                type="text"
                placeholder="Search assets, txs..."
                aria-label="Search dashboard assets, holdings, and transactions"
                value={searchQuery}
                onFocus={() => setIsSearchFocused(true)}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setIsSearchFocused(true);
                }}
                className="w-44 sm:w-52 bg-[var(--dash-header-controls)] text-xs text-[var(--dash-text)] placeholder-[var(--dash-text-muted)] rounded-lg pl-8 pr-7 py-1.5 border border-[var(--dash-header-controls-border)] focus:outline-none focus:border-[#1E3A34] dark:focus:border-[#D6A15D] transition-all shadow-xs"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  aria-label="Clear search query"
                  className="absolute right-2 text-[var(--dash-text-muted)] hover:text-[var(--dash-text)] cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              )}

              {isSearchFocused && trimmedSearch.length > 0 && (
                <div className="absolute right-0 top-full mt-1.5 w-80 max-h-96 overflow-y-auto bg-[var(--dash-card)] border border-[var(--dash-card-border)] rounded-xl shadow-2xl p-2 z-50 text-left space-y-2">
                  {totalSearchHits === 0 ? (
                    <div className="p-3 text-center text-xs text-[var(--dash-text-muted)]">
                      No matching properties, holdings, or ledger records for &ldquo;{searchQuery.trim()}&rdquo;.
                    </div>
                  ) : (
                    <>
                      {searchResults.properties.length > 0 && (
                        <div>
                          <div className="px-2 py-1 text-[9.5px] font-bold uppercase tracking-wider text-[var(--dash-text-muted)]">
                            Marketplace Assets
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
                              className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-[var(--dash-hover)] flex items-center justify-between gap-2 text-xs cursor-pointer"
                            >
                              <div className="min-w-0">
                                <span className="font-bold text-[var(--dash-text)] block truncate">{prop.title}</span>
                                <span className="text-[10px] text-[var(--dash-text-muted)] block truncate">{prop.location}</span>
                              </div>
                              <span className="font-mono text-[10.5px] font-bold text-[#087F5B] shrink-0">
                                {formatCurrency(prop.tokenPrice)}
                              </span>
                            </button>
                          ))}
                        </div>
                      )}

                      {searchResults.holdings.length > 0 && (
                        <div>
                          <div className="px-2 py-1 text-[9.5px] font-bold uppercase tracking-wider text-[var(--dash-text-muted)]">
                            My Portfolio Holdings
                          </div>
                          {searchResults.holdings.map((inv) => (
                            <button
                              key={inv.id}
                              type="button"
                              onClick={() => {
                                setIsSearchFocused(false);
                                setSearchQuery('');
                                setActiveTab('portfolio');
                              }}
                              className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-[var(--dash-hover)] flex items-center justify-between gap-2 text-xs cursor-pointer"
                            >
                              <span className="font-semibold text-[var(--dash-text)] truncate">{inv.propertyTitle}</span>
                              <span className="font-mono text-[10px] text-[#087F5B] shrink-0">{inv.tokensPurchased} units</span>
                            </button>
                          ))}
                        </div>
                      )}

                      {searchResults.txs.length > 0 && (
                        <div>
                          <div className="px-2 py-1 text-[9.5px] font-bold uppercase tracking-wider text-[var(--dash-text-muted)]">
                            Ledger Transactions
                          </div>
                          {searchResults.txs.map((tx) => (
                            <button
                              key={tx.id}
                              type="button"
                              onClick={() => {
                                setIsSearchFocused(false);
                                setSearchQuery('');
                                setActiveTab('transactions');
                              }}
                              className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-[var(--dash-hover)] flex items-center justify-between gap-2 text-xs cursor-pointer"
                            >
                              <div className="min-w-0">
                                <span className="font-semibold text-[var(--dash-text)] block truncate">{tx.description}</span>
                                <span className="font-mono text-[9.5px] text-[var(--dash-text-muted)]">{tx.reference}</span>
                              </div>
                              <span className="font-mono text-[10.5px] font-bold text-[var(--dash-text)] shrink-0">
                                {formatCurrency(tx.amount, tx.currency)}
                              </span>
                            </button>
                          ))}
                        </div>
                      )}

                      {searchResults.sections.length > 0 && (
                        <div>
                          <div className="px-2 py-1 text-[9.5px] font-bold uppercase tracking-wider text-[var(--dash-text-muted)]">
                            Dashboard Sections
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
                              className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-[var(--dash-hover)] flex items-center gap-2 text-xs font-semibold text-[var(--dash-text)] cursor-pointer"
                            >
                              <ArrowRight className="w-3 h-3 text-[#087F5B]" />
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

            {/* Light / Dark Mode Toggle Button */}
            <button
              onClick={toggleDashboardMode}
              className="p-2 rounded-lg bg-[var(--dash-header-controls)] text-[var(--dash-text)] hover:text-[var(--dash-text)] border border-[var(--dash-header-controls-border)] hover:bg-[var(--dash-hover)] transition-all cursor-pointer flex items-center justify-center shadow-xs"
              title={dashboardMode === 'light' ? 'Switch to dark theme' : 'Switch to light theme'}
              aria-label={dashboardMode === 'light' ? 'Switch to dark theme' : 'Switch to light theme'}
            >
              {dashboardMode === 'light' ? (
                <Moon className="w-3.5 h-3.5 text-[#1E3A34]" />
              ) : (
                <Sun className="w-3.5 h-3.5 text-[#D6A15D]" />
              )}
            </button>

            {/* Notification Bell with Real Unread-Count Badge */}
            <button
              onClick={() => setActiveTab('notifications')}
              className={`relative p-2 rounded-lg transition-all cursor-pointer border shadow-xs ${
                activeTab === 'notifications'
                  ? 'bg-[var(--dash-card)] text-[var(--dash-text)] border-[#1E3A34] dark:border-[#D6A15D]/50'
                  : 'bg-[var(--dash-header-controls)] text-[var(--dash-text-secondary)] hover:text-[var(--dash-text)] border-[var(--dash-header-controls-border)] hover:bg-[var(--dash-hover)]'
              }`}
              title="Notifications"
            >
              <Bell className="w-3.5 h-3.5" />
              {notifications.filter(n => !n.read).length > 0 && (
                <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-[#1E3A34] dark:bg-[#D6A15D] text-white dark:text-[#0B1B30] text-[8px] font-black rounded-full flex items-center justify-center">
                  {notifications.filter(n => !n.read).length}
                </span>
              )}
            </button>

            {/* User Profile Menu with Avatar, Account Name, and Dropdown */}
            <div className="relative">
              <button
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-[var(--dash-header-controls)] hover:bg-[var(--dash-hover)] border border-[var(--dash-header-controls-border)] text-[var(--dash-text)] transition-all cursor-pointer shadow-xs"
              >
                <div className="w-6 h-6 rounded-md bg-[#1E3A34] dark:bg-[#D6A15D] text-white dark:text-[#0B1B30] flex items-center justify-center font-black text-[11px] overflow-hidden shrink-0">
                  {user.avatarUrl ? (
                    <img src={user.avatarUrl} alt={user.fullName} className="w-full h-full object-cover" />
                  ) : (
                    user.fullName.charAt(0)
                  )}
                </div>
                <div className="hidden md:flex flex-col text-left">
                  <span className="text-xs font-bold text-[var(--dash-text)] truncate max-w-[90px]">
                    {user.fullName.split(' ')[0]}
                  </span>
                  <span className="text-[8.5px] text-[#1E3A34] dark:text-[#D6A15D] font-mono font-semibold">
                    {formatCurrency(user.walletBalance)}
                  </span>
                </div>
                <ChevronDown className={`w-3 h-3 text-[var(--dash-text-muted)] transition-transform duration-200 ${userDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* User Profile Dropdown Menu */}
              {userDropdownOpen && (
                <div className="absolute right-0 mt-1.5 w-60 bg-[var(--dash-card)] border border-[var(--dash-card-border)] rounded-xl shadow-2xl py-1.5 z-50 text-left animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-3 py-2 border-b border-[var(--dash-card-border)] mb-1">
                    <p className="text-[9px] uppercase font-bold text-[var(--dash-text-muted)]">Signed In As</p>
                    <p className="text-xs font-bold text-[var(--dash-text)] truncate mt-0.5">{user.email}</p>
                    <p className="text-[9.5px] font-mono font-semibold text-[#1E3A34] dark:text-[#D6A15D] mt-0.5">Wallet: {formatCurrency(user.walletBalance)}</p>
                  </div>
                  <button
                    onClick={() => { setActiveTab('profile'); setUserDropdownOpen(false); }}
                    className="w-full text-left px-3 py-2 text-xs text-[var(--dash-text-secondary)] hover:text-[var(--dash-text)] hover:bg-[var(--dash-hover)] flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <User className="w-3.5 h-3.5 text-[#1E3A34] dark:text-[#D6A15D]" />
                    <span>Profile &amp; Banking</span>
                  </button>
                  <button
                    onClick={() => { setActiveTab('wallet'); setUserDropdownOpen(false); }}
                    className="w-full text-left px-3 py-2 text-xs text-[var(--dash-text-secondary)] hover:text-[var(--dash-text)] hover:bg-[var(--dash-hover)] flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <Wallet className="w-3.5 h-3.5 text-[#1E3A34] dark:text-[#D6A15D]" />
                    <span>Wallet &amp; Deposits</span>
                  </button>
                  <button
                    onClick={() => { toggleDashboardMode(); setUserDropdownOpen(false); }}
                    className="w-full text-left px-3 py-2 text-xs text-[var(--dash-text-secondary)] hover:text-[var(--dash-text)] hover:bg-[var(--dash-hover)] flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    {dashboardMode === 'light' ? (
                      <>
                        <Moon className="w-3.5 h-3.5 text-indigo-500" />
                        <span>Switch to Dark Theme</span>
                      </>
                    ) : (
                      <>
                        <Sun className="w-3.5 h-3.5 text-amber-500" />
                        <span>Switch to Light Theme</span>
                      </>
                    )}
                  </button>
                  <div className="border-t border-[var(--dash-card-border)] my-1" />
                  <button
                    onClick={() => { logout(); setUserDropdownOpen(false); }}
                    className="w-full text-left px-3 py-2 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Logout</span>
                  </button>
                </div>
              )}
            </div>

            {/* Mobile Menu Toggle Button */}
            <button
              onClick={() => setMobileHeaderMenuOpen(!mobileHeaderMenuOpen)}
              className="lg:hidden p-1.5 rounded-lg bg-[var(--dash-header-controls)] text-[var(--dash-text)] border border-[var(--dash-header-controls-border)] hover:bg-[var(--dash-hover)] cursor-pointer"
              title="Toggle Menu"
            >
              {mobileHeaderMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </header>

        {/* Mobile Collapsible Navigation Menu */}
        {mobileHeaderMenuOpen && (
          <div className="lg:hidden bg-[var(--dash-header)] border-b border-[var(--dash-header-border)] px-4 py-3 space-y-2 z-30 animate-in slide-in-from-top-2 duration-150 shadow-lg">
            {/* Mobile Quick Search */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[var(--dash-text-muted)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Search properties, holdings, ledger..."
                aria-label="Search dashboard on mobile"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[var(--dash-header-controls)] text-xs text-[var(--dash-text)] placeholder-[var(--dash-text-muted)] rounded-xl pl-8 pr-8 py-2 border border-[var(--dash-header-controls-border)] focus:outline-none focus:border-[#087F5B]"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--dash-text-muted)] cursor-pointer"
                  aria-label="Clear mobile search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            {trimmedSearch.length > 0 && (
              <div className="rounded-xl border border-[var(--dash-card-border)] bg-[var(--dash-card)] p-2 space-y-1 max-h-52 overflow-y-auto">
                {totalSearchHits === 0 ? (
                  <p className="text-xs text-[var(--dash-text-muted)] px-2 py-1.5">
                    No matches for &ldquo;{searchQuery.trim()}&rdquo;.
                  </p>
                ) : (
                  <>
                    {searchResults.properties.map((prop) => (
                      <button
                        key={prop.id}
                        type="button"
                        onClick={() => {
                          setSearchQuery('');
                          setMobileHeaderMenuOpen(false);
                          onSelectProperty(prop.id);
                        }}
                        className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-[var(--dash-hover)] flex items-center justify-between text-xs cursor-pointer"
                      >
                        <span className="font-semibold text-[var(--dash-text)] truncate">{prop.title}</span>
                        <span className="font-mono text-[10.5px] text-[#087F5B]">{formatCurrency(prop.tokenPrice)}</span>
                      </button>
                    ))}
                    {searchResults.txs.map((tx) => (
                      <button
                        key={tx.id}
                        type="button"
                        onClick={() => {
                          setSearchQuery('');
                          setMobileHeaderMenuOpen(false);
                          setActiveTab('transactions');
                        }}
                        className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-[var(--dash-hover)] flex items-center justify-between text-xs cursor-pointer"
                      >
                        <span className="font-semibold text-[var(--dash-text)] truncate">{tx.reference}</span>
                        <span className="font-mono text-[10.5px] text-[var(--dash-text)]">{formatCurrency(tx.amount, tx.currency)}</span>
                      </button>
                    ))}
                  </>
                )}
              </div>
            )}

            {[
              { id: 'overview', label: 'Dashboard', icon: LayoutDashboard },
              { id: 'analytics', label: 'Portfolio Analytics', icon: PieChart },
              { id: 'properties', label: 'Investments', icon: TrendingUp },
              { id: 'transactions', label: 'Transactions', icon: History },
              { id: 'documents', label: 'Reports', icon: FileText },
              { id: 'portfolio', label: 'Portfolio', icon: Building2 },
              { id: 'wallet', label: 'Wallet', icon: Wallet },
              { id: 'profile', label: 'Profile Settings', icon: User },
              { id: 'verification', label: 'Compliance Vault', icon: ShieldCheck },
              { id: 'notifications', label: 'Notifications', icon: Bell, count: notifications.filter(n => !n.read).length },
            ].map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => { setActiveTab(item.id); setMobileHeaderMenuOpen(false); }}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-[var(--dash-sidebar-active-bg)] text-[var(--dash-sidebar-active-text)] shadow-xs'
                      : 'text-[var(--dash-text-secondary)] hover:text-[var(--dash-text)] hover:bg-[var(--dash-hover)]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-[var(--dash-sidebar-active-text)]' : 'opacity-70'}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.count !== undefined && item.count > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-[#1E3A34] dark:bg-[#D6A15D] text-white dark:text-[#0B1B30]">
                      {item.count}
                    </span>
                  )}
                </button>
              );
            })}
            <div className="pt-2 border-t border-[var(--dash-header-border)] flex items-center justify-between">
              <span className="text-xs font-semibold text-[var(--dash-text-muted)]">Theme Appearance</span>
              <button
                onClick={toggleDashboardMode}
                className="px-3 py-1.5 rounded-lg bg-[var(--dash-header-controls)] text-[var(--dash-text)] border border-[var(--dash-header-controls-border)] text-xs font-medium flex items-center gap-1.5"
              >
                {dashboardMode === 'light' ? (
                  <>
                    <Moon className="w-3.5 h-3.5 text-[#1E3A34]" />
                    <span>Dark Theme</span>
                  </>
                ) : (
                  <>
                    <Sun className="w-3.5 h-3.5 text-[#D6A15D]" />
                    <span>Light Theme</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Scrollable Content Area with max-w-[1400px] */}
        <main className="app-content-scroll">
          <div className="max-w-[1400px] w-full mx-auto space-y-3 sm:space-y-3.5 px-1 sm:px-2">

            {/* 1. OVERVIEW TAB */}
            {activeTab === 'overview' && (
              <div className="space-y-4 animate-in fade-in duration-200">
                {/* Welcome Back Widget - Charcoal Black & White Finish */}
                <div className="bg-[#151515] text-white p-5 rounded-2xl sm:rounded-3xl shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 relative overflow-hidden border border-[#303030]">
                  <div className="flex items-center gap-3.5 z-10 min-w-0">
                    <div className="w-11 h-11 rounded-xl bg-[#1D1D1D] border border-[#303030] text-white flex items-center justify-center font-bold text-sm shadow-md shrink-0 overflow-hidden">
                      {user.avatarUrl ? (
                        <img src={user.avatarUrl} alt={user.fullName} className="w-full h-full object-cover" />
                      ) : (
                        user.fullName.split(' ').map(n => n[0]).join('')
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-[9px] font-bold uppercase tracking-wider text-[#999999]">
                          Active Investor Portal
                        </span>
                        {user.kycStatus === 'verified' && (
                          <span className="inline-flex items-center gap-1 text-[8.5px] font-semibold text-[#2ECC71] bg-[#2ECC71]/15 border border-[#2ECC71]/30 px-2 py-0.5 rounded-full shadow-xs">
                            <ShieldCheck className="w-2.5 h-2.5" /> Verified
                          </span>
                        )}
                      </div>
                      <h2 className="text-base sm:text-lg font-bold text-white tracking-tight truncate leading-tight">
                        Welcome back, {user.fullName}
                      </h2>
                      <p className="text-xs text-[#D0D0D0] mt-0.5 leading-normal truncate sm:whitespace-normal font-medium">
                        Your real estate portfolio is generating monthly rental distributions across {investments.length} notarized properties.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 z-10 shrink-0">
                    <button
                      onClick={() => setActiveTab('properties')}
                      className="bg-white hover:bg-neutral-200 text-black text-xs font-bold px-4 py-2 rounded-xl transition-all cursor-pointer shadow-md"
                    >
                      Explore Properties
                    </button>
                  </div>
                </div>

                {notifications.filter(n => !n.read).length > 0 && (() => {
                  const unreadList = notifications.filter(n => !n.read);
                  const firstUnread = unreadList[0];
                  return (
                    <div className="bg-[#151515] border border-[#303030] px-4 py-2.5 rounded-xl sm:rounded-2xl flex items-center justify-between gap-3 shadow-md text-xs">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-6 h-6 rounded-lg bg-[#1D1D1D] text-[#00D2FF] border border-[#303030] flex items-center justify-center shrink-0 shadow-xs">
                          <Bell className="w-3 h-3" />
                        </div>
                        <div className="text-xs leading-tight truncate">
                          <span className="font-bold text-white mr-1.5">{firstUnread.title}:</span>
                          <span className="text-[#D0D0D0]">{firstUnread.message}</span>
                        </div>
                      </div>
                      <button onClick={() => setActiveTab('notifications')} className="text-xs font-bold text-[#00D2FF] hover:underline whitespace-nowrap shrink-0">
                        View Unread ({unreadList.length})
                      </button>
                    </div>
                  );
                })()}

                {/* Account Onboarding & Investment Pipeline */}
                <ColoredPipeline
                  title="Investor Account & Investment Lifecycle"
                  subtitle="Regulated European participatory model progression"
                  stages={[
                    {
                      id: 'stg-1',
                      title: 'Account Registered',
                      description: 'Investor profile created and authenticated on L\'Agence platform.',
                      status: 'completed',
                      timestamp: 'Verified',
                      metrics: { label: 'Account Tier', value: 'VIP Client' },
                    },
                    {
                      id: 'stg-2',
                      title: 'Identity (KYC/AML)',
                      description: 'Spanish/EU regulatory anti-money laundering verification.',
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
                      metrics: { label: 'Est. APY', value: '7.8% - 9.2%' },
                    },
                  ]}
                />

                <BalanceCard
                  user={user}
                  onDeposit={() => setIsDepositOpen(true)}
                  onWithdraw={() => setIsWithdrawOpen(true)}
                />

                {/* Recharts Live Property Analytics & Funding Progress */}
                <RechartsPropertyDashboard
                  properties={properties}
                  investments={investments}
                  transactions={transactions}
                />

                <div className="bg-[#151515] p-5 rounded-2xl sm:rounded-3xl border border-[#303030] shadow-xl space-y-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-sm sm:text-base font-bold text-white">Your Tokenized Assets</h3>
                      <p className="text-xs text-[#999999]">Active real estate properties generating monthly rental yield</p>
                    </div>
                    <button
                      onClick={() => setActiveTab('portfolio')}
                      className="text-xs font-bold text-white hover:text-[#00D2FF] flex items-center gap-1 cursor-pointer transition-colors"
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

                {/* Comprehensive Institutional Portfolio Analytics Suite (Real Ledger Data) */}
                <InvestorAnalyticsSuite
                  properties={properties}
                  investments={investments}
                  transactions={transactions}
                  walletBalance={user.walletBalance}
                  onExploreProperties={() => setActiveTab('properties')}
                  onSelectProperty={onSelectProperty}
                  onOpenTransactions={() => setActiveTab('transactions')}
                />

                {/* Monthly Dividend Yield Trends Chart */}
                <YieldPayoutTrendsChart transactions={transactions} investments={investments} />

                <div className="bg-[#151515] p-5 rounded-2xl sm:rounded-3xl border border-[#303030] shadow-xl space-y-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-sm sm:text-base font-bold text-white">Recent Transactions &amp; Distributions</h3>
                      <p className="text-xs text-[#999999]">Verifiable double-entry ledger record</p>
                    </div>
                    <button
                      onClick={() => setActiveTab('transactions')}
                      className="text-xs font-bold text-white hover:text-[#00D2FF] flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      All Transactions ({transactions.length}) <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>

                  <TransactionTable transactions={transactions} maxRows={5} />
                </div>
              </div>
            )}

            {/* 1.5 PORTFOLIO ANALYTICS TAB */}
            {activeTab === 'analytics' && (
              <div className="space-y-4 animate-in fade-in duration-200">
                <ProjectedYieldGrowthChart
                  properties={frontendProperties.length > 0 ? frontendProperties : properties}
                  investments={investments}
                  onSelectProperty={onSelectProperty}
                  onExploreProperties={() => setActiveTab('properties')}
                />
                <InvestorAnalyticsSuite
                  properties={properties}
                  investments={investments}
                  transactions={transactions}
                  walletBalance={user.walletBalance}
                  onExploreProperties={() => setActiveTab('properties')}
                  onSelectProperty={onSelectProperty}
                  onOpenTransactions={() => setActiveTab('transactions')}
                />
                <RechartsPropertyDashboard
                  properties={properties}
                  investments={investments}
                  transactions={transactions}
                />
              </div>
            )}

            {/* 2. MY PORTFOLIO TAB */}
            {activeTab === 'portfolio' && (
              <div className="bg-[#151515] p-5 rounded-2xl sm:rounded-3xl border border-[#303030] shadow-xl space-y-4 animate-in fade-in duration-200">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#303030]">
                  <div>
                    <h2 className="text-base sm:text-lg font-bold text-white">My Property Investments</h2>
                    <p className="text-xs text-[#999999]">Owned fractional property units, circular yield tracking, and notarized contracts.</p>
                  </div>
                  <button onClick={() => setActiveTab('properties')} className="bg-white hover:bg-neutral-200 text-black font-bold text-xs py-2 px-4 rounded-xl cursor-pointer shadow-xs transition-colors">
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
              <div className="space-y-4 animate-in fade-in duration-200">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#151515] p-5 rounded-2xl sm:rounded-3xl border border-[#303030] shadow-xl">
                  <div>
                    <h2 className="text-base sm:text-lg font-bold text-white">Investment Marketplace</h2>
                    <p className="text-xs text-[#999999]">Institutional-grade European real estate tokenized from €100/unit.</p>
                  </div>
                  <button onClick={onExploreProperties} className="bg-white hover:bg-neutral-200 text-black font-bold text-xs py-2 px-4 rounded-xl cursor-pointer shadow-xs transition-colors">
                    Open Full Marketplace
                  </button>
                </div>

                <div className="property-grid">
                  {frontendProperties.map((property) => (
                    <PropertyCard
                      key={property.id}
                      property={property}
                      isFavorite={ledger.isFavorite(user.id, property.id)}
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
              <div className="bg-[#151515] p-5 rounded-2xl sm:rounded-3xl border border-[#303030] shadow-xl space-y-4 animate-in fade-in duration-200">
                <div className="pb-3 border-b border-[#303030]">
                  <h2 className="text-base sm:text-lg font-bold text-white">Transactions &amp; Audit Ledger</h2>
                  <p className="text-xs text-[#999999]">Immutable history of all deposits, withdrawals, property investments, and dividends.</p>
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
              <div className="space-y-4 animate-in fade-in duration-200 max-w-5xl mx-auto">
                <div className="bg-[#151515] p-5 rounded-2xl sm:rounded-3xl border border-[#303030] shadow-xl space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#303030]">
                    <div>
                      <h2 className="text-base sm:text-lg font-bold text-white">Investor Wallet &amp; Treasury</h2>
                      <p className="text-xs text-[#999999]">Manage your liquidity, SEPA bank transfers, and automated dividend deposits.</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-semibold text-[#00D2FF] bg-[#00D2FF]/15 border border-[#00D2FF]/30 px-2.5 py-1 rounded-full flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3" /> CaixaBank Escrow
                      </span>
                    </div>
                  </div>

                  <BalanceCard
                    user={user}
                    onDeposit={() => setIsDepositOpen(true)}
                    onWithdraw={() => setIsWithdrawOpen(true)}
                  />

                  {/* Solana Wallet & On-Chain Asset Manager */}
                  <SolanaWalletManager
                    user={user}
                    properties={properties}
                    investments={investments}
                  />

                  {/* Multi-Currency & FX Crypto Converter Desk Banner */}
                  <div className="p-4 rounded-2xl bg-[#1D1D1D] border border-[#303030] text-white flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[#151515] border border-[#303030] text-[#00D2FF] flex items-center justify-center font-bold shrink-0">
                        <RefreshCw className="w-5 h-5 text-[#00D2FF]" />
                      </div>
                      <div className="text-left">
                        <h3 className="text-xs sm:text-sm font-bold text-white">Multi-Currency &amp; FX Crypto Desk</h3>
                        <p className="text-[11px] text-[#D0D0D0]">Instant zero-spread conversions across EUR (€), USD ($), GBP (£), CHF, SOL, USDC, and USDT.</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setIsTreasuryConverterOpen(true)}
                      className="bg-white hover:bg-neutral-200 text-black text-xs font-bold py-2 px-4 rounded-xl shrink-0 cursor-pointer shadow-md transition-colors"
                    >
                      Open Treasury Desk
                    </button>
                  </div>

                  {/* Action Cards: Deposit, Withdrawal & Document Upload */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {/* Deposit Action Card */}
                    <div className="p-4 rounded-2xl bg-[#1D1D1D] border border-[#303030] flex flex-col justify-between space-y-3 text-left">
                      <div className="space-y-1.5">
                        <div className="w-9 h-9 rounded-xl bg-white text-black flex items-center justify-center font-bold shadow-md">
                          <ArrowDownLeft className="w-4 h-4 text-black stroke-[2.5]" />
                        </div>
                        <h3 className="text-sm font-bold text-white">Deposit Capital</h3>
                        <p className="text-xs text-[#D0D0D0] leading-relaxed">
                          Add funds via SEPA wire transfer (CaixaBank Escrow) or crypto stablecoins (USDT, USDC, ETH).
                        </p>
                      </div>
                      <button
                        onClick={() => setIsDepositOpen(true)}
                        className="bg-white hover:bg-neutral-200 text-black text-xs font-bold py-2 px-3.5 flex items-center justify-center gap-1.5 rounded-xl shadow-md cursor-pointer transition-colors"
                      >
                        <ArrowDownLeft className="w-3.5 h-3.5 text-black" />
                        <span>Deposit Funds</span>
                      </button>
                    </div>

                    {/* Withdrawal Action Card */}
                    <div className="p-4 rounded-2xl bg-[#1D1D1D] border border-[#303030] flex flex-col justify-between space-y-3 text-left">
                      <div className="space-y-1.5">
                        <div className="w-9 h-9 rounded-xl bg-[#151515] text-white border border-[#303030] flex items-center justify-center font-bold shadow-sm">
                          <ArrowUpRight className="w-4 h-4 text-white" />
                        </div>
                        <h3 className="text-sm font-bold text-white">Withdraw Funds</h3>
                        <p className="text-xs text-[#D0D0D0] leading-relaxed">
                          Redeem your uninvested liquid capital directly to your verified European bank IBAN or crypto wallet.
                        </p>
                      </div>
                      <button
                        onClick={() => setIsWithdrawOpen(true)}
                        className="bg-[#151515] hover:bg-[#252525] border border-[#303030] text-white text-xs font-semibold py-2 px-3.5 flex items-center justify-center gap-1.5 rounded-xl cursor-pointer transition-colors"
                      >
                        <ArrowUpRight className="w-3.5 h-3.5 text-white" />
                        <span>Request Withdrawal</span>
                      </button>
                    </div>

                    {/* Profile Settings Card */}
                    <div className="p-4 rounded-2xl bg-[#1D1D1D] border border-[#303030] flex flex-col justify-between space-y-3 text-left">
                      <div className="space-y-1.5">
                        <div className="w-9 h-9 rounded-xl bg-[#151515] text-[#00D2FF] border border-[#303030] flex items-center justify-center font-bold shadow-sm">
                          <User className="w-4 h-4" />
                        </div>
                        <h3 className="text-sm font-bold text-white">Profile Settings</h3>
                        <p className="text-xs text-[#D0D0D0] leading-relaxed">
                          Manage your investor profile, contact information, password, and security preferences.
                        </p>
                      </div>
                      <button
                        onClick={() => setActiveTab('profile')}
                        className="bg-[#151515] hover:bg-[#252525] border border-[#303030] text-white text-xs font-semibold py-2 px-3.5 flex items-center justify-center gap-1.5 rounded-xl cursor-pointer transition-colors"
                      >
                        <User className="w-3.5 h-3.5 text-white" />
                        <span>Profile &amp; KYC</span>
                      </button>
                    </div>
                  </div>

                  {/* Pending Transactions Section */}
                  {transactions.filter(t => t.status === 'pending').length > 0 && (
                    <div className="p-4 rounded-2xl bg-[#1D1D1D] border border-[#FFD93D]/30 space-y-3 text-left">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-[#FFD93D]" />
                          <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                            Pending Requests ({transactions.filter(t => t.status === 'pending').length})
                          </h4>
                        </div>
                        {user?.role === 'admin' && (
                          <a
                            href="/admin#deposits"
                            className="text-xs font-semibold text-[#FFD93D] hover:underline flex items-center gap-1"
                          >
                            Review in Admin <ArrowRight className="w-3 h-3" />
                          </a>
                        )}
                      </div>

                      <div className="space-y-2">
                        {transactions.filter(t => t.status === 'pending').map(tx => (
                          <div key={tx.id} className="p-3 bg-[#151515] rounded-xl border border-[#303030] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-1.5">
                                <span className={`text-[9px] font-semibold px-2 py-0.5 rounded-full ${
                                  tx.type === 'deposit' ? 'bg-[#2ECC71]/15 text-[#2ECC71] border border-[#2ECC71]/30' : 'bg-[#FF9F43]/15 text-[#FF9F43] border border-[#FF9F43]/30'
                                }`}>
                                  {tx.type === 'deposit' ? 'Deposit' : 'Withdrawal'}
                                </span>
                                <span className="font-mono font-bold text-white text-[11px]">{tx.reference}</span>
                              </div>
                              <p className="text-[10px] text-[#999999]">{tx.paymentMethod} · {formatDate(tx.createdAt)}</p>
                              {tx.metadata?.receiptFileName && (
                                <span className="inline-flex items-center gap-1 text-[9.5px] font-semibold text-[#00D2FF] bg-[#00D2FF]/10 px-2 py-0.5 rounded">
                                  📎 Attached: {tx.metadata.receiptFileName}
                                </span>
                              )}
                            </div>
                            <div className="text-left sm:text-right">
                              <span className="font-bold font-mono tabular-nums text-white text-xs sm:text-sm block">
                                {formatCurrency(tx.amount)} {tx.currency}
                              </span>
                              <span className="text-[9.5px] text-[#FFD93D] font-semibold">Under Review</span>
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
                  onNavigateAdmin={() => navigateTo('/admin#deposits')}
                  onNavigateWallet={() => setActiveTab('wallet')}
                />
              </div>
            )}

            {/* 7. DOCUMENTS TAB */}
            {activeTab === 'documents' && (
              <div className="bg-[#151515] p-5 rounded-2xl sm:rounded-3xl border border-[#303030] shadow-xl space-y-4 animate-in fade-in duration-200">
                <div className="pb-3 border-b border-[#303030]">
                  <h2 className="text-base sm:text-lg font-bold text-white">Investment Documents &amp; Agreements</h2>
                  <p className="text-xs text-[#999999]">Access notarized SPV share certificates, RICS independent appraisals, and deeds.</p>
                </div>

                {investments.length === 0 ? (
                  <div className="text-center py-8 text-[#999999] space-y-3">
                    <FileText className="w-8 h-8 mx-auto text-[#00D2FF] opacity-60" />
                    <p className="text-xs font-semibold text-white">No investments yet to generate legal documents.</p>
                    <button onClick={() => setActiveTab('properties')} className="bg-white hover:bg-neutral-200 text-black text-xs font-bold py-2 px-4 rounded-xl shadow-md cursor-pointer transition-colors">
                      Explore Properties
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {investments.map((inv) => {
                      const prop = properties.find(p => p.id === inv.propertyId);
                      return (
                        <div key={inv.id} className="p-3.5 rounded-xl border border-[#303030] flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#1D1D1D] hover:border-[#454545] transition-all">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-[#151515] text-[#00D2FF] border border-[#303030] flex items-center justify-center font-bold shrink-0">
                              <FileText className="w-4 h-4" />
                            </div>
                            <div>
                              <h4 className="font-bold text-white text-xs sm:text-sm">{inv.propertyTitle || prop?.title || 'Real Estate Asset'}</h4>
                              <p className="text-[11px] text-[#999999] mt-0.5">
                                Invested {formatCurrency(inv.totalAmountInvested)} · {inv.tokensPurchased} Units · {formatDate(inv.purchasedAt)}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setSelectedDocInvestment(inv)}
                              className="bg-[#151515] hover:bg-[#252525] border border-[#303030] text-white text-xs font-semibold py-1.5 px-3 rounded-lg cursor-pointer transition-colors flex items-center gap-1.5 shadow-2xs"
                            >
                              <FileText className="w-3.5 h-3.5 text-[#00D2FF]" /> View SPV Certificate
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* 7.5 TAX & FISCAL STATEMENTS TAB */}
            {activeTab === 'tax_statements' && (
              <div className="animate-in fade-in duration-200">
                <TaxReportGenerator />
              </div>
            )}

            {/* 8. REFERRALS TAB */}
            {activeTab === 'referrals' && (
              <div className="space-y-4 animate-in fade-in duration-200 max-w-5xl mx-auto">
                {/* Header Banner */}
                <div className="bg-[#151515] p-5 rounded-2xl sm:rounded-3xl border border-[#303030] shadow-xl">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#303030]">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[#1D1D1D] text-[#00D2FF] border border-[#303030] flex items-center justify-center shrink-0 shadow-sm">
                        <Share2 className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h2 className="text-base sm:text-lg font-bold text-white">Private Client Referral Program</h2>
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#00D2FF]/15 text-[#00D2FF] border border-[#00D2FF]/30">
                            VIP Allocation
                          </span>
                        </div>
                        <p className="text-xs text-[#999999] mt-0.5">
                          Introduce qualified partners. Receive €500 in allocation credit for each verified investor.
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowQrModal(true)}
                      className="px-3 py-1.5 rounded-xl border border-[#303030] bg-[#1D1D1D] hover:bg-[#252525] text-xs font-semibold text-white flex items-center gap-1.5 transition-colors shrink-0 self-start sm:self-auto cursor-pointer"
                      title="Display QR Code for in-person sharing"
                    >
                      <QrCode className="w-3.5 h-3.5 text-[#00D2FF]" />
                      <span>Show QR</span>
                    </button>
                  </div>

                  {/* Toast Notification */}
                  {inviteSentToast && (
                    <div className="mt-3 p-2.5 rounded-xl bg-[#2ECC71]/15 border border-[#2ECC71]/30 text-xs font-semibold text-[#2ECC71] flex items-center gap-2 animate-in fade-in">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#2ECC71] shrink-0" />
                      <span>{inviteSentToast}</span>
                    </div>
                  )}

                  {/* Referral Link & Code Box */}
                  <div className="mt-4 p-4 rounded-2xl bg-[#1D1D1D] border border-[#303030] space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                      <label className="text-xs font-semibold text-white flex items-center gap-1.5">
                        <Globe className="w-3.5 h-3.5 text-[#00D2FF]" />
                        <span>Official Referral Link</span>
                      </label>
                      
                      {/* Environment Link Switcher */}
                      <div className="flex items-center gap-1.5 text-[10.5px]">
                        <span className="text-[#999999]">Destination:</span>
                        <button
                          type="button"
                          onClick={() => setUseCurrentOrigin(false)}
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all cursor-pointer ${
                            !useCurrentOrigin 
                              ? 'bg-white text-black font-bold shadow-xs' 
                              : 'bg-[#151515] border border-[#303030] text-[#999999] hover:text-white'
                          }`}
                        >
                          kretzdespain.com
                        </button>
                        <button
                          type="button"
                          onClick={() => setUseCurrentOrigin(true)}
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all cursor-pointer ${
                            useCurrentOrigin 
                              ? 'bg-white text-black font-bold shadow-xs' 
                              : 'bg-[#151515] border border-[#303030] text-[#999999] hover:text-white'
                          }`}
                          title="Use current preview server origin for testing"
                        >
                          Preview Link
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                      <div className="relative flex-1">
                        <input
                          type="text"
                          readOnly
                          value={referralLink}
                          className="w-full pl-3 pr-14 py-2 rounded-xl border border-[#303030] bg-[#151515] text-xs font-mono text-white font-semibold select-all"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] uppercase font-bold text-[#999999] tracking-wide pointer-events-none">
                          {useCurrentOrigin ? 'TEST' : 'PROD'}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => copyReferral(referralLink)}
                          className="bg-white hover:bg-neutral-200 text-black text-xs font-bold px-4 py-2 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer shadow-md transition-colors"
                        >
                          {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{copiedLink ? 'Copied' : 'Copy Link'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={copyReferralCode}
                          className="px-3 py-2 rounded-xl border border-[#303030] bg-[#151515] hover:bg-[#252525] text-xs font-semibold text-white flex items-center gap-1.5 transition-colors cursor-pointer"
                          title="Copy standalone referral code"
                        >
                          {copiedCode ? <Check className="w-3.5 h-3.5 text-[#2ECC71]" /> : <Tag className="w-3.5 h-3.5 text-[#00D2FF]" />}
                          <span className="font-mono text-xs">{referralCode}</span>
                        </button>
                      </div>
                    </div>

                    {/* Social & Direct Messenger Sharing */}
                    <div className="pt-2 border-t border-[#303030] flex flex-wrap items-center gap-2">
                      <span className="text-[10px] font-bold text-[#999999] mr-1">Share:</span>

                      <a
                        href={whatsappShareHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2.5 py-1 rounded-lg bg-[#25D366]/15 hover:bg-[#25D366]/25 text-[#25D366] text-[10.5px] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <MessageCircle className="w-3 h-3" />
                        <span>WhatsApp</span>
                      </a>

                      <a
                        href={telegramShareHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2.5 py-1 rounded-lg bg-[#0088cc]/15 hover:bg-[#0088cc]/25 text-[#0088cc] text-[10.5px] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <Send className="w-3 h-3" />
                        <span>Telegram</span>
                      </a>

                      <a
                        href={mailtoShareHref}
                        className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[10.5px] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <Mail className="w-3 h-3" />
                        <span>Email</span>
                      </a>

                      <a
                        href={linkedInShareHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2.5 py-1 rounded-lg bg-[#0A66C2]/15 hover:bg-[#0A66C2]/25 text-[#0A66C2] text-[10.5px] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <span>LinkedIn</span>
                      </a>

                      <a
                        href={twitterShareHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2.5 py-1 rounded-lg bg-[#151515] hover:bg-[#252525] border border-[#303030] text-white text-[10.5px] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <span>X</span>
                      </a>

                      <button
                        type="button"
                        onClick={shareNative}
                        className="ml-auto px-2.5 py-1 rounded-lg border border-[#303030] bg-[#151515] hover:bg-[#252525] text-white text-[10.5px] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <Share2 className="w-3 h-3 text-[#00D2FF]" />
                        <span>More</span>
                      </button>
                    </div>
                  </div>

                  {/* Direct VIP Invitation Dispatch Form */}
                  <form onSubmit={handleSendInvite} className="mt-4 p-3.5 rounded-2xl border border-dashed border-[#303030] bg-[#1D1D1D] space-y-2">
                    <div className="flex items-center justify-between">
                      <label htmlFor="referral-invite-email" className="text-xs font-semibold text-white flex items-center gap-1.5">
                        <Send className="w-3 h-3 text-[#00D2FF]" />
                        <span>Log Associate Invitation</span>
                      </label>
                      <span className="text-[10px] text-[#999999]">Track invited partners &amp; allocation eligibility</span>
                    </div>
                    {inviteError && (
                      <p className="text-[11px] font-semibold text-[#FF4D4D]">{inviteError}</p>
                    )}
                    <div className="flex gap-2">
                      <input
                        id="referral-invite-email"
                        type="email"
                        required
                        placeholder="colleague@familyoffice.com"
                        value={inviteEmail}
                        onChange={(e) => {
                          setInviteEmail(e.target.value);
                          if (inviteError) setInviteError(null);
                        }}
                        className="flex-1 px-3 py-2 rounded-xl border border-[#303030] text-xs bg-[#151515] text-white focus:outline-none focus:border-white transition-colors"
                      />
                      <button
                        type="submit"
                        disabled={isSendingInvite}
                        className="px-4 py-2 bg-white hover:bg-neutral-200 text-black font-bold text-xs rounded-xl transition-colors flex items-center gap-1 cursor-pointer shrink-0 disabled:opacity-50"
                      >
                        <Send className="w-3 h-3" />
                        <span>{isSendingInvite ? 'Sending...' : 'Send Invite'}</span>
                      </button>
                    </div>
                  </form>
                </div>

                {/* Key Performance Metrics */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-4 rounded-2xl border border-[#303030] bg-[#151515] shadow-lg">
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-[#999999]">Invitations Sent</div>
                    <div className="text-xl font-bold font-mono tabular-nums text-white mt-1">{referralsList.length}</div>
                    <div className="text-[10px] text-[#999999] mt-0.5">Tracked peers</div>
                  </div>

                  <div className="p-4 rounded-2xl border border-[#303030] bg-[#151515] shadow-lg">
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-[#999999]">Active Investors</div>
                    <div className="text-xl font-bold font-mono tabular-nums text-[#2ECC71] mt-1">
                      {referralsList.filter(r => r.status === 'funded').length}
                    </div>
                    <div className="text-[10px] text-[#2ECC71] mt-0.5">Funded portfolios</div>
                  </div>

                  <div className="p-4 rounded-2xl border border-[#303030] bg-[#151515] shadow-lg">
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-[#999999]">Bonuses Earned</div>
                    <div className="text-xl font-bold font-mono tabular-nums text-[#2ECC71] mt-1">
                      €{(referralsList.reduce((acc, r) => acc + r.reward, 0)).toFixed(2)}
                    </div>
                    <div className="text-[10px] text-[#999999] mt-0.5">Credited to wallet</div>
                  </div>

                  <div className="p-4 rounded-2xl border border-[#303030] bg-[#151515] shadow-lg">
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-[#999999]">Bonus Per Investor</div>
                    <div className="text-xl font-bold font-mono tabular-nums text-white mt-1">€500</div>
                    <div className="text-[10px] text-[#999999] mt-0.5">Upon 1st allocation</div>
                  </div>
                </div>

                {/* Referral Ledger & Tracking Table */}
                <div className="bg-[#151515] p-5 rounded-2xl sm:rounded-3xl border border-[#303030] shadow-xl space-y-3">
                  <div className="flex items-center justify-between pb-3 border-b border-[#303030]">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-[#00D2FF]" />
                      <h3 className="text-sm font-bold text-white">Invited Associates &amp; Status</h3>
                    </div>
                    <span className="text-[11px] text-[#999999]">{referralsList.length} recorded</span>
                  </div>

                  {referralsList.length === 0 ? (
                    <div className="text-center py-6 text-xs text-[#999999]">
                      No invitations dispatched yet. Copy your referral link above to invite colleagues.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-[#303030] text-[#999999] text-[9.5px] uppercase">
                            <th className="pb-2 font-semibold">Associate Email</th>
                            <th className="pb-2 font-semibold">Date Dispatched</th>
                            <th className="pb-2 font-semibold">Status</th>
                            <th className="pb-2 font-semibold text-right">Bonus Value</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#262626]">
                          {referralsList.map((item) => (
                            <tr key={item.id} className="hover:bg-[#1D1D1D] transition-colors">
                              <td className="py-2.5 font-medium text-white">{item.email}</td>
                              <td className="py-2.5 text-[#999999] text-[11px] font-mono">{item.date}</td>
                              <td className="py-2.5">
                                {item.status === 'funded' && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#2ECC71]/15 text-[#2ECC71] border border-[#2ECC71]/30 text-[10px] font-semibold">
                                    <CheckCircle2 className="w-2.5 h-2.5 text-[#2ECC71]" />
                                    <span>Funded (€500)</span>
                                  </span>
                                )}
                                {item.status === 'registered' && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#00D2FF]/15 text-[#00D2FF] border border-[#00D2FF]/30 text-[10px] font-semibold">
                                    <Clock className="w-2.5 h-2.5 text-[#00D2FF]" />
                                    <span>Registered</span>
                                  </span>
                                )}
                                {item.status === 'invited' && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#FF9F43]/15 text-[#FF9F43] border border-[#FF9F43]/30 text-[10px] font-semibold">
                                    <Send className="w-2.5 h-2.5 text-[#FF9F43]" />
                                    <span>Sent</span>
                                  </span>
                                )}
                              </td>
                              <td className="py-2.5 text-right font-bold font-mono text-[#2ECC71]">
                                {item.reward > 0 ? `+€${item.reward.toFixed(2)}` : 'Pending'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Referral Program Guidelines & Terms */}
                <div className="bg-[#151515] p-5 rounded-2xl sm:rounded-3xl border border-[#303030] space-y-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#2ECC71]" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                      Program Guidelines &amp; Terms
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div className="p-3.5 bg-[#1D1D1D] rounded-xl border border-[#303030] space-y-1.5">
                      <div className="font-semibold text-white text-xs flex items-center gap-1.5">
                        <Gift className="w-3.5 h-3.5 text-[#00D2FF]" />
                        <span>€500 Welcome Allocation</span>
                      </div>
                      <p className="text-[#D0D0D0] text-[11px] leading-relaxed">
                        Both you and your referred investor receive €500 in allocation credit upon their first funded property contract.
                      </p>
                    </div>

                    <div className="p-3.5 bg-[#1D1D1D] rounded-xl border border-[#303030] space-y-1.5">
                      <div className="font-semibold text-white text-xs flex items-center gap-1.5">
                        <TrendingUp className="w-3.5 h-3.5 text-[#2ECC71]" />
                        <span>0.50% Yield Booster</span>
                      </div>
                      <p className="text-[#D0D0D0] text-[11px] leading-relaxed">
                        Refer partners deploying over €50,000 to earn an ongoing 0.50% yield boost on your active tokenized assets.
                      </p>
                    </div>

                    <div className="p-3.5 bg-[#1D1D1D] rounded-xl border border-[#303030] space-y-1.5">
                      <div className="font-semibold text-white text-xs flex items-center gap-1.5">
                        <ShieldCheck className="w-3.5 h-3.5 text-[#FFD93D]" />
                        <span>VIP Notarization Priority</span>
                      </div>
                      <p className="text-[#D0D0D0] text-[11px] leading-relaxed">
                        Invited peers receive priority Spanish notary queueing and access to private off-market listings.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 9. NOTIFICATIONS TAB */}
            {activeTab === 'notifications' && (
              <div className="bg-[#151515] p-5 rounded-2xl sm:rounded-3xl border border-[#303030] shadow-xl space-y-4 animate-in fade-in duration-200 max-w-4xl mx-auto text-left">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-[#303030]">
                  <div>
                    <h2 className="text-base sm:text-lg font-bold text-white">Notification Center</h2>
                    <p className="text-xs text-[#999999]">Account alerts, investment confirmations, and distribution logs.</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full bg-[#00D2FF]/15 text-[#00D2FF] border border-[#00D2FF]/30 text-[10px] font-semibold">
                      {notifications.filter(n => !n.read).length} Unread
                    </span>
                    {notifications.filter(n => !n.read).length > 0 && (
                      <button
                        onClick={() => {
                          ledger.markAllNotificationsAsRead(user.id);
                          userApi.markAllNotificationsRead().catch(() => {});
                          toast.info('All notifications marked as read.');
                        }}
                        className="px-3 py-1 rounded-xl bg-white hover:bg-neutral-200 text-black text-xs font-bold transition-colors cursor-pointer shadow-xs"
                      >
                        Mark All Read
                      </button>
                    )}
                  </div>
                </div>

                {notifications.length === 0 ? (
                  <div className="text-center py-8 text-[#999999] space-y-2">
                    <Bell className="w-8 h-8 mx-auto text-[#00D2FF] opacity-50" />
                    <p className="text-xs font-semibold text-white">No notifications recorded.</p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {notifications.map((notif) => (
                      <div
                        key={notif.id}
                        className={`p-3.5 rounded-xl border transition-all flex items-start gap-3 ${
                          notif.read
                            ? 'bg-[#1D1D1D] border-[#303030] opacity-85'
                            : 'bg-[#1D1D1D] border-[#00D2FF]/40 shadow-md'
                        }`}
                      >
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 shadow-xs ${
                          notif.read ? 'bg-[#151515] text-[#999999] border border-[#303030]' : 'bg-[#00D2FF] text-black font-bold'
                        }`}>
                          <Bell className="w-4 h-4" />
                        </div>
                        <div className="flex-1 space-y-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <h4 className="font-bold text-white text-xs sm:text-sm">{notif.title}</h4>
                              {!notif.read && (
                                <span className="w-2 h-2 rounded-full bg-[#00D2FF] shrink-0" title="Unread" />
                              )}
                            </div>
                            <span className="text-[10px] text-[#999999] font-mono shrink-0">{formatDate(notif.createdAt)}</span>
                          </div>
                          <p className="text-xs text-[#D0D0D0] leading-relaxed">{notif.message}</p>
                          
                          <div className="pt-1 flex items-center justify-end gap-1.5">
                            {!notif.read ? (
                              <button
                                onClick={() => {
                                  ledger.markNotificationAsRead(notif.id);
                                  userApi.markNotificationRead(notif.id).catch(() => {});
                                }}
                                className="text-[10.5px] font-bold text-black bg-white hover:bg-neutral-200 px-2.5 py-0.5 rounded-lg transition-colors inline-flex items-center gap-1 cursor-pointer shadow-xs"
                              >
                                <span>Mark as Read ✓</span>
                              </button>
                            ) : (
                              <span className="text-[10px] text-[#999999] font-medium px-2 py-0.5 bg-[#151515] rounded border border-[#303030]">Read</span>
                            )}
                          </div>
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
              <div className="bg-[#151515] p-4 sm:p-5 rounded-xl border border-[#303030] space-y-4 animate-in fade-in duration-200 max-w-4xl mx-auto text-white">
                <div className="flex items-center gap-3 pb-3 border-b border-[#303030]">
                  <div className="w-9 h-9 rounded-lg bg-[#1D1D1D] text-white border border-[#303030] flex items-center justify-center shrink-0">
                    <HelpCircle className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex-1 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <h2 className="text-sm sm:text-base font-bold text-white">Investor Support Desk</h2>
                      <p className="text-[10.5px] sm:text-xs text-[#999999]">Direct Counsel &amp; Concierge · Email: <strong className="text-white">info@kretz.site</strong></p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (typeof window !== 'undefined' && (window as any).smartsupp) {
                          try {
                            (window as any).smartsupp('chat:open');
                            toast.info('Opening live concierge chat window.');
                            return;
                          } catch {}
                        }
                        supportSubjectRef.current?.focus();
                        setSupportFeedback('Live chat widget is currently offline in this browser session. Submit a priority inquiry below or email info@kretz.site.');
                      }}
                      className="px-3 py-1.5 rounded-lg bg-white text-black font-semibold text-xs hover:bg-[#E5E5E5] transition-all flex items-center justify-center gap-1.5 shadow-sm cursor-pointer shrink-0"
                    >
                      <MessageCircle className="w-3.5 h-3.5 text-black" />
                      <span>Open Concierge Desk</span>
                    </button>
                  </div>
                </div>

                <div className="space-y-3 text-xs text-left">
                  {/* Support Banner */}
                  <div className="p-3.5 rounded-xl bg-[#1D1D1D] border border-[#303030] text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-[#00D2FF]" />
                        <h3 className="font-semibold text-xs text-white">Dedicated Advisory Support</h3>
                      </div>
                      <p className="text-[11px] text-[#D0D0D0]">
                        Senior real estate advisors on standby. Direct documentation dispatch to <strong className="text-white">info@kretz.site</strong>.
                      </p>
                    </div>
                    <a
                      href="mailto:info@kretz.site"
                      className="px-3 py-1.5 rounded-lg bg-[#151515] hover:bg-[#252525] border border-[#303030] text-white font-bold text-xs whitespace-nowrap cursor-pointer shrink-0 transition-colors"
                    >
                      info@kretz.site
                    </a>
                  </div>

                  <div className="p-3.5 rounded-xl bg-[#1D1D1D] border border-[#303030] space-y-1.5">
                    <h3 className="font-bold text-white text-xs">Frequently Asked Questions</h3>
                    <ul className="space-y-1.5 text-[11px] text-[#D0D0D0]">
                      <li>• <strong className="text-white">When are dividends paid?</strong> Rental yields are credited automatically to your available balance on the 1st of every month.</li>
                      <li>• <strong className="text-white">How do I withdraw?</strong> Go to your Wallet and click Withdraw. SEPA wire transfers execute in 1-2 banking days.</li>
                      <li>• <strong className="text-white">What is the minimum investment?</strong> Vetted property units start at €100 or €1,000 depending on SPV tier.</li>
                      <li>• <strong className="text-white">Official contact?</strong> Our verified investor support address is <strong className="text-white">info@kretz.site</strong>.</li>
                    </ul>
                  </div>

                  <div className="p-3.5 rounded-xl border border-[#303030] bg-[#1D1D1D] space-y-3">
                    <h3 className="font-bold text-white text-xs">Direct Support Inquiry</h3>

                    {supportFeedback && (
                      <div className="p-2.5 rounded-lg bg-[#151515] border border-[#2ECC71]/40 text-[#2ECC71] text-xs font-semibold flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#2ECC71] shrink-0" />
                          <span>{supportFeedback}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setSupportFeedback(null)}
                          className="text-[#999999] hover:text-white cursor-pointer"
                          aria-label="Dismiss support message"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}

                    {supportError && (
                      <div className="p-2.5 rounded-lg bg-[#151515] border border-[#FF4D4D]/40 text-[#FF4D4D] text-xs font-semibold flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <AlertCircle className="w-3.5 h-3.5 text-[#FF4D4D] shrink-0" />
                          <span>{supportError}</span>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => handleSupportSubmit(e as any)}
                          disabled={isSubmittingSupport}
                          className="px-2 py-0.5 rounded bg-[#FF4D4D] text-white text-[10.5px] font-bold hover:bg-[#FF4D4D]/80 cursor-pointer shrink-0"
                        >
                          Retry
                        </button>
                      </div>
                    )}

                    <form onSubmit={handleSupportSubmit} className="space-y-2.5">
                      <div>
                        <label htmlFor="support-subject-input" className="block text-[10.5px] font-semibold text-white mb-1">
                          Subject *
                        </label>
                        <input
                          ref={supportSubjectRef}
                          id="support-subject-input"
                          type="text"
                          value={supportSubject}
                          onChange={(e) => {
                            setSupportSubject(e.target.value);
                            if (supportError) setSupportError(null);
                          }}
                          placeholder="e.g. Question regarding SEPA deposit or SPV contract"
                          required
                          disabled={isSubmittingSupport}
                          className="w-full px-3 py-2 rounded-lg bg-[#151515] border border-[#303030] text-xs text-white placeholder:text-[#999999] focus:outline-none focus:border-white transition-colors"
                        />
                      </div>
                      <div>
                        <label htmlFor="support-details-input" className="block text-[10.5px] font-semibold text-white mb-1">
                          Inquiry Details *
                        </label>
                        <textarea
                          id="support-details-input"
                          rows={3}
                          value={supportMessage}
                          onChange={(e) => {
                            setSupportMessage(e.target.value);
                            if (supportError) setSupportError(null);
                          }}
                          placeholder="Describe your question or include your transaction reference..."
                          required
                          disabled={isSubmittingSupport}
                          className="w-full px-3 py-2 rounded-lg bg-[#151515] border border-[#303030] text-xs text-white placeholder:text-[#999999] focus:outline-none focus:border-white transition-colors"
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={isSubmittingSupport}
                        className="px-4 py-2 rounded-lg bg-white text-black font-semibold text-xs hover:bg-[#E5E5E5] transition-all inline-flex items-center gap-2 cursor-pointer disabled:opacity-55"
                      >
                        {isSubmittingSupport ? (
                          <ButtonLoader text="Submitting Inquiry..." />
                        ) : (
                          <>
                            <Send className="w-3.5 h-3.5 text-black" />
                            <span>Submit Inquiry</span>
                          </>
                        )}
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
                isActive ? 'text-white font-bold' : 'text-[#999999] hover:text-white'
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
        <div className="fixed inset-0 z-50 bg-black/70 md:hidden flex flex-col justify-end animate-in fade-in duration-200">
          <div className="bg-[#151515] border-t border-[#303030] rounded-t-2xl p-4 max-h-[80vh] overflow-y-auto space-y-3">
            <div className="flex items-center justify-between border-b border-[#303030] pb-2.5">
              <h3 className="font-bold text-xs text-white">All Dashboard Sections</h3>
              <button onClick={() => setIsMoreMenuOpen(false)} className="text-xs font-semibold text-[#999999] hover:text-white cursor-pointer">Close</button>
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
                    className={`flex items-center gap-2 p-2.5 rounded-xl text-xs font-semibold text-left border transition-all cursor-pointer ${
                      isActive ? 'bg-white text-black border-white' : 'bg-[#1D1D1D] text-white border-[#303030] hover:bg-[#252525]'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5 shrink-0" />
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
          navigateTo('/admin#deposits');
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

      {/* In-Person Luxury QR Code Sharing Modal */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-sm w-full p-4 sm:p-5 text-center border border-[#E3E8E3] shadow-xl relative space-y-3">
            <button
              type="button"
              onClick={() => setShowQrModal(false)}
              className="absolute top-3 right-3 p-1.5 rounded-lg text-[#69736F] hover:text-[#18211F] hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="mx-auto w-10 h-10 rounded-xl bg-[#EEF1EC] text-[#27845D] flex items-center justify-center shadow-xs">
              <QrCode className="w-5 h-5" />
            </div>

            <div>
              <span className="text-[9px] font-bold uppercase tracking-wider text-[#27845D] bg-[#27845D]/10 px-2 py-0.5 rounded">
                L'Agence Private Invitation
              </span>
              <h3 className="text-base font-bold text-[#18211F] mt-1.5">Scan to Join & Claim €500</h3>
              <p className="text-[11px] text-[#69736F] mt-0.5">
                Scan with any smartphone camera to open your private registration invitation.
              </p>
            </div>

            <div className="p-3 bg-white rounded-xl border border-[#182D2A] inline-block shadow-2xs">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(referralLink)}&color=182D2A`}
                alt="Referral QR Code"
                className="w-36 h-36 mx-auto rounded-lg object-contain"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
              <div className="mt-1.5 text-[11px] font-mono font-bold text-[#18211F]">
                CODE: {referralCode}
              </div>
            </div>

            <div className="p-2 rounded-lg bg-[#F6F7F4] border border-[#E3E8E3] text-[10px] text-[#69736F] font-mono truncate">
              {referralLink}
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => copyReferral(referralLink)}
                className="flex-1 btn btn-primary py-2 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedLink ? 'Link Copied' : 'Copy Link'}</span>
              </button>
              <button
                type="button"
                onClick={() => setShowQrModal(false)}
                className="px-3.5 py-2 rounded-lg border border-[#E3E8E3] bg-[#F6F7F4] hover:bg-slate-100 text-xs font-semibold text-[#18211F] cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Treasury FX & Crypto Converter Desk Modal */}
      {isTreasuryConverterOpen && (
        <TreasuryConverterModal
          isOpen={isTreasuryConverterOpen}
          onClose={() => setIsTreasuryConverterOpen(false)}
          onSuccessConversion={() => refreshUser()}
          onOpenDeposit={() => {
            setIsTreasuryConverterOpen(false);
            setActiveTab('wallet');
            setIsDepositOpen(true);
          }}
        />
      )}

    </div>
  );
};
