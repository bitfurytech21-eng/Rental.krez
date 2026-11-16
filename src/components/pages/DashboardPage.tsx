import React, { useEffect, useMemo, useRef, useState } from 'react';
import '../../styles/dashboard-fintech.css';
import { useAuth } from '../../lib/auth';
import { useNavigation } from '../../context/NavigationContext';
import { useToast } from '../../context/ToastContext';
import { requestPlatformNotificationPermission, showPlatformNotification } from '../../lib/browserNotifications';
import { ledger } from '../../lib/ledger';
import { supabase, isSupabaseConfigured } from '../../lib/supabaseClient';
import { contactApi, userApi, treasuryApi } from '../../lib/api';
import { LagenceLogo } from '../common/LagenceLogo';
import { ColoredPipeline, PipelineStage, PipelineStageStatus } from '../visuals/ColoredPipeline';
import { PortfolioPerformanceChart } from '../visuals/PortfolioPerformanceChart';
import { BalanceCard } from '../dashboard/BalanceCard';
import { PortfolioOverview } from '../dashboard/PortfolioOverview';
import { MyPropertyInvestments } from '../dashboard/MyPropertyInvestments';
import { UnitPurchaseModal } from '../properties/UnitPurchaseModal';
import { TransactionTable } from '../dashboard/TransactionTable';
import { DistributionsView } from '../dashboard/DistributionsView';
import { WithdrawalModal } from '../dashboard/WithdrawalModal';
import { ManualDepositModal } from '../dashboard/ManualDepositModal';
import { DocumentViewerModal } from '../dashboard/DocumentViewerModal';
import { ComplianceVaultSection } from '../dashboard/ComplianceVaultSection';
import { ProfilePage } from './ProfilePage';
import { PropertyCard } from '../properties/PropertyCard';
import { PropertyDocumentViewer } from '../documents/PropertyDocumentViewer';
import { Property } from '../../types/property';
import { Investment } from '../../types/investment';
import { Transaction } from '../../types/transaction';
import { ButtonLoader } from '../common/ButtonLoader';
import {
  ArrowLeft,
  ArrowRight,
  ArrowRightLeft,
  Bell,
  Building2,
  TrendingUp,
  Wallet,
  ShieldCheck,
  History,
  PieChart,
  ArrowDownLeft,
  ArrowUpRight,
  HelpCircle,
  User,
  FileText,
  LayoutDashboard,
  Coins,
  Share2,
  Award,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Menu,
  X,
  LayoutGrid,
  LogOut,
  Search,
  ChevronDown,
  ChevronRight,
  Gift,
  Users,
  Send,
  Mail,
  QrCode,
  Globe,
  MessageCircle,
  RefreshCw,
  Clock,
  Sun,
  Moon,
  Tag,
  Crown,
  Landmark,
  Calendar,
} from 'lucide-react';
import { UserMembershipCard } from '../club/UserMembershipCard';
import { MembershipApplicationModal } from '../club/MembershipApplicationModal';
import { formatCurrency, formatDate } from '../../lib/utils';
import { RechartsPropertyDashboard } from '../visuals/RechartsPropertyDashboard';
import { SolanaWalletManager } from '../wallet/SolanaWalletManager';
import { TaxReportGenerator } from '../documents/TaxReportGenerator';
import { TreasuryConverterModal } from '../dashboard/TreasuryConverterModal';
import { InvestorAnalyticsSuite } from '../dashboard/InvestorAnalyticsSuite';
import { ProjectedYieldGrowthChart } from '../dashboard/ProjectedYieldGrowthChart';
import { AtmosphericFintechBackground } from '../dashboard/AtmosphericFintechBackground';
import { FirstTimeOnboardingModal } from '../dashboard/FirstTimeOnboardingModal';

interface DashboardPageProps {
  defaultTab?: string;
  onSelectProperty: (propertyId: string) => void;
  onExploreProperties: () => void;
  onNavigateProfile: () => void;
  onNavigateTransactions: () => void;
  onNavigatePortfolio: () => void;
  onNavigateHome?: () => void;
}

const PRIMARY_TABS = new Set(['overview', 'portfolio', 'properties', 'explore', 'transactions', 'more']);

const TAB_TITLES: Record<string, string> = {
  overview: 'Overview',
  portfolio: 'Portfolio',
  properties: 'Explore Properties',
  explore: 'Explore Properties',
  transactions: 'Ledger',
  more: 'More',
  wallet: 'Wallet & Deposits',
  analytics: 'Portfolio Analytics',
  distributions: 'Distributions',
  documents: 'Documents & SPV Deeds',
  tax_statements: 'Tax & Fiscal Reports',
  verification: 'Compliance Vault',
  membership: 'Club Privé',
  referrals: 'Referrals',
  notifications: 'Notifications',
  profile: 'Profile & Banking',
  support: 'Help & Support',
};

export const DashboardPage: React.FC<DashboardPageProps> = ({
  defaultTab = 'overview',
  onSelectProperty,
  onExploreProperties,
  onNavigateProfile,
  onNavigateTransactions,
  onNavigatePortfolio,
  onNavigateHome,
}) => {
  void onNavigateProfile;
  void onNavigateTransactions;
  void onNavigatePortfolio;

  const { user, refreshUser, logout } = useAuth();
  const { navigateTo } = useNavigation();
  const toast = useToast();

  const [activeTab, setActiveTab] = useState<string>(defaultTab === 'explore' ? 'properties' : defaultTab);
  const [isDepositOpen, setIsDepositOpen] = useState(defaultTab === 'deposit');
  const [isWithdrawOpen, setIsWithdrawOpen] = useState(defaultTab === 'withdraw');
  const [isTreasuryConverterOpen, setIsTreasuryConverterOpen] = useState<boolean>(false);
  const [selectedDocInvestment, setSelectedDocInvestment] = useState<any | null>(null);
  const [brochureProperty, setBrochureProperty] = useState<Property | null>(null);
  const [buyModalProperty, setBuyModalProperty] = useState<Property | null>(null);
  const [buyModalMode, setBuyModalMode] = useState<'purchase' | 'reinvest'>('purchase');
  const [isBuyModalOpen, setIsBuyModalOpen] = useState<boolean>(false);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState<boolean>(() => {
    try {
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        if (params.get('onboarding') === 'true') return true;
      }
    } catch {}
    return false;
  });

  // Explore tab search & category filter
  const [exploreQuery, setExploreQuery] = useState('');
  const [exploreCategory, setExploreCategory] = useState('All');

  const [copiedLink, setCopiedLink] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [bellDropdownOpen, setBellDropdownOpen] = useState(false);
  const [mobileHeaderMenuOpen, setMobileHeaderMenuOpen] = useState(false);
  const [, setLedgerVersion] = useState(0);
  const searchContainerRef = useRef<HTMLDivElement | null>(null);
  const bellDropdownRef = useRef<HTMLDivElement | null>(null);
  const supportSubjectRef = useRef<HTMLInputElement | null>(null);

  // Live Backend Financial State
  const [summary, setSummary] = useState<any | null>(null);
  const [subBalances, setSubBalances] = useState<Record<string, number>>({});
  const [serverTransactions, setServerTransactions] = useState<Transaction[] | null>(null);
  const [serverNotifications, setServerNotifications] = useState<any[] | null>(null);
  const [serverInvestments, setServerInvestments] = useState<Investment[] | null>(null);
  const [isHydrating, setIsHydrating] = useState<boolean>(true);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [selectedLifecycleKey, setSelectedLifecycleKey] = useState<string>('identity_verification');
  const [notificationPrefs, setNotificationPrefs] = useState({
    depositAlerts: true,
    withdrawalUpdates: true,
    kycUpdates: true,
    distributionAlerts: true,
    securityAlerts: true,
    emailNotifications: true,
  });
  const [isSavingPrefs, setIsSavingPrefs] = useState(false);

  // Support Inquiry States
  const [supportSubject, setSupportSubject] = useState('');
  const [supportMessage, setSupportMessage] = useState('');
  const [isSubmittingSupport, setIsSubmittingSupport] = useState(false);
  const [supportFeedback, setSupportFeedback] = useState<string | null>(null);
  const [supportError, setSupportError] = useState<string | null>(null);

  // Membership States
  const [userMembership, setUserMembership] = useState(() => (user ? ledger.getUserMembership(user.id) : null));
  const [membershipTiers, setMembershipTiers] = useState(() => ledger.getMembershipTiers());
  const [isMembershipModalOpen, setIsMembershipModalOpen] = useState(false);

  const [dashboardMode, setDashboardMode] = useState<'light' | 'dark'>(() => {
    try {
      const saved = localStorage.getItem('dashboard_mode');
      if (saved === 'light' || saved === 'dark') return saved;
      if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        return 'dark';
      }
    } catch {}
    return 'dark';
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

  const [realtimeStatus, setRealtimeStatus] = useState<'connecting' | 'live' | 'offline'>('offline');
  const realtimeSeenRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!user?.id || !isSupabaseConfigured()) {
      setRealtimeStatus('offline');
      return;
    }

    setRealtimeStatus('connecting');
    const channel = supabase
      .channel(`investor-live-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'investments',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const row = (payload.new || payload.old || {}) as Record<string, any>;
          const eventKey = `investment:${payload.eventType}:${row.id || ''}`;
          if (realtimeSeenRef.current.has(eventKey)) return;
          realtimeSeenRef.current.add(eventKey);
          if (realtimeSeenRef.current.size > 80) realtimeSeenRef.current.clear();
          const title = payload.eventType === 'INSERT' ? 'Investment recorded' : 'Investment updated';
          const amount = Number(row.total_amount_invested || 0);
          const message = row.property_title
            ? `${row.property_title}${amount > 0 ? ` · €${amount.toLocaleString('en-GB', { minimumFractionDigits: 2 })}` : ''}`
            : 'Your investment record has changed.';
          ledger.addUserNotification(user.id, title, message, 'financial');
          if (!showPlatformNotification(title, message)) toast.info(title + ': ' + message);
          setLedgerVersion((version) => version + 1);
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ledger_transactions',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const row = (payload.new || payload.old || {}) as Record<string, any>;
          const eventKey = `transaction:${payload.eventType}:${row.id || ''}:${row.status || ''}`;
          if (realtimeSeenRef.current.has(eventKey)) return;
          realtimeSeenRef.current.add(eventKey);
          if (realtimeSeenRef.current.size > 80) realtimeSeenRef.current.clear();
          const type = String(row.type || 'account').replace(/_/g, ' ');
          const title = payload.eventType === 'INSERT' ? 'New account activity' : 'Transaction status updated';
          const amount = Number(row.amount || 0);
          const status = row.status ? ` · ${String(row.status).replace(/_/g, ' ')}` : '';
          const message = `${type}${amount > 0 ? ` · €${amount.toLocaleString('en-GB', { minimumFractionDigits: 2 })}` : ''}${status}`;
          ledger.addUserNotification(user.id, title, message, 'financial');
          if (!showPlatformNotification(title, message)) toast.info(title + ': ' + message);
          setLedgerVersion((version) => version + 1);
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') setRealtimeStatus('live');
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') setRealtimeStatus('offline');
      });

    return () => {
      supabase.removeChannel(channel);
      setRealtimeStatus('offline');
    };
  }, [user?.id]);

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
        setBellDropdownOpen(false);
        setMobileHeaderMenuOpen(false);
        setIsSearchFocused(false);
        setShowQrModal(false);
      }
    };
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setIsSearchFocused(false);
      }
      if (bellDropdownRef.current && !bellDropdownRef.current.contains(e.target as Node)) {
        setBellDropdownOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const hydrateLiveDashboard = async (silent = false) => {
    if (!user?.id) return;
    if (!silent) setIsHydrating(true);
    try {
      const results = await Promise.allSettled([
        userApi.getDashboardSummary(),
        treasuryApi.getBalances(),
        userApi.getTransactions({ limit: 250 }),
        userApi.getNotifications(),
        userApi.getPortfolio(),
        userApi.getPreferences(),
      ]);

      const [sumRes, balRes, txRes, notifRes, portRes, prefRes] = results;
      let anySuccess = false;

      if (sumRes.status === 'fulfilled' && sumRes.value?.data) {
        setSummary(sumRes.value.data);
        anySuccess = true;
      }

      if (balRes.status === 'fulfilled' && balRes.value?.data?.balances) {
        setSubBalances(balRes.value.data.balances);
        anySuccess = true;
      }

      if (txRes.status === 'fulfilled' && Array.isArray(txRes.value?.data)) {
        const mappedTxs: Transaction[] = txRes.value.data.map((t: any) => ({
          id: String(t.id),
          userId: String(t.userId || t.user_id || user.id),
          type: (t.type === 'dividend' || t.type === 'payout'
            ? 'distribution'
            : t.type === 'purchase'
            ? 'investment'
            : t.type) as Transaction['type'],
          amount: Number(t.amount || 0),
          currency: String(t.currency || 'EUR'),
          status: (t.status || 'completed') as Transaction['status'],
          description: String(
            t.description || (t.propertyTitle ? `${t.type} — ${t.propertyTitle}` : `${t.type} transaction`)
          ),
          reference: String(t.reference || t.id),
          createdAt: String(t.createdAt || t.created_at || new Date().toISOString()),
          paymentMethod: String(t.paymentMethod || t.method || 'Internal Ledger'),
          txHash: t.txHash || t.tx_hash,
          balanceAfter: Number(t.balanceAfter ?? t.balance_after ?? 0),
          metadata: {
            ...(t.metadata || {}),
            propertyId: t.propertyId || t.property_id || t.metadata?.propertyId,
            propertyTitle: t.propertyTitle || t.property_title || t.metadata?.propertyTitle,
            tokens: t.tokensPurchased || t.tokens_purchased || t.metadata?.tokens,
            bankIban: t.bankIban || t.metadata?.bankIban,
            destinationAddress: t.destination || t.metadata?.destinationAddress,
          },
        }));
        setServerTransactions(mappedTxs);
        anySuccess = true;
      }

      if (notifRes.status === 'fulfilled' && Array.isArray(notifRes.value?.data)) {
        setServerNotifications(
          notifRes.value.data.map((n: any) => ({
            id: String(n.id),
            userId: user.id,
            title: String(n.title || 'Account Update'),
            message: String(n.message || ''),
            type: n.type || 'info',
            read: Boolean(n.read),
            createdAt: String(n.createdAt || n.created_at || new Date().toISOString()),
          }))
        );
        anySuccess = true;
      }

      if (portRes.status === 'fulfilled') {
        const rawList =
          portRes.value?.data?.investments ||
          portRes.value?.investments ||
          (Array.isArray(portRes.value?.data) ? portRes.value.data : null);
        if (Array.isArray(rawList)) {
          const allProps = ledger.getProperties();
          const mappedInvs: Investment[] = rawList.map((item: any) => {
            const propId = String(item.propertyId || item.property_id || '');
            const prop = allProps.find((p) => p.id === propId || p.slug === propId);
            const tokensPurchased = Number(item.tokensPurchased ?? item.tokens_purchased ?? 0);
            const totalInvested = Number(item.totalAmountInvested ?? item.total_amount_invested ?? 0);
            const pricePerToken =
              Number(item.purchasePricePerToken ?? item.pricePerToken ?? item.tokenPrice ?? prop?.tokenPrice) ||
              (tokensPurchased > 0 ? totalInvested / tokensPurchased : 100);
            const estYield = Number(item.estimatedAnnualYield ?? item.estimated_annual_yield ?? prop?.estimatedAnnualYield ?? 8.4);
            const durationMonths = Number(item.durationMonths ?? item.duration_months ?? prop?.durationMonths ?? 36);
            const projectedMonthlyIncome = Number(
              item.projectedMonthlyIncome ??
                item.projected_monthly_income ??
                (totalInvested * (estYield / 100)) / 12
            );
            return {
              id: String(item.id || `inv-${propId}`),
              userId: String(item.userId || item.user_id || user.id),
              propertyId: propId,
              propertyTitle: String(item.propertyTitle || item.property_title || prop?.title || 'Landmark SPV Asset'),
              propertyImage: String(
                item.propertyImage || item.property_image || prop?.images?.[0] || prop?.bannerImage || ''
              ),
              propertyLocation: String(item.propertyLocation || item.property_location || prop?.location || ''),
              tokensPurchased,
              tokenPrice: pricePerToken,
              totalAmountInvested: totalInvested,
              currentValuation: Number(item.currentValuation ?? item.current_valuation ?? totalInvested),
              estimatedAnnualYield: estYield,
              projectedMonthlyIncome: Number(projectedMonthlyIncome.toFixed(2)),
              durationMonths,
              totalDividendsReceived: Number(item.totalDividendsReceived ?? item.total_dividends_received ?? 0),
              purchasedAt: String(item.purchasedAt || item.purchased_at || item.createdAt || item.created_at || new Date().toISOString()),
              startDate: String(item.startDate || item.purchasedAt || item.createdAt || new Date().toISOString()),
              maturityDate: String(item.maturityDate || item.maturity_date || ''),
              status: (item.status || 'active') as Investment['status'],
              certificateId: String(item.certificateId || item.certificate_id || `CERT-${String(item.id || '').slice(0, 8)}`),
              transactionHash: String(item.transactionHash || item.txHash || item.tx_hash || ''),
            };
          });
          setServerInvestments(mappedInvs);
          anySuccess = true;
        }
      }

      if (prefRes.status === 'fulfilled' && prefRes.value?.data) {
        const p = prefRes.value.data;
        setNotificationPrefs((prev) => ({
          depositAlerts: p.depositAlerts ?? prev.depositAlerts,
          withdrawalUpdates: p.withdrawalUpdates ?? prev.withdrawalUpdates,
          kycUpdates: p.kycUpdates ?? prev.kycUpdates,
          distributionAlerts: p.distributionAlerts ?? prev.distributionAlerts,
          securityAlerts: p.securityAlerts ?? prev.securityAlerts,
          emailNotifications: p.emailNotifications ?? prev.emailNotifications,
        }));
      }

      if (!anySuccess) {
        setSyncError('Unable to reach treasury & portfolio services. Displayed data may be incomplete.');
      } else {
        setSyncError(null);
        setLastSyncedAt(new Date().toISOString());
      }
    } catch (err: any) {
      setSyncError(err?.message || 'Unable to refresh account records.');
    } finally {
      setIsHydrating(false);
    }
  };

  useEffect(() => {
    if (!user?.id) return;
    hydrateLiveDashboard(false);
    const interval = setInterval(() => {
      hydrateLiveDashboard(true);
    }, 45000);
    return () => clearInterval(interval);
  }, [user?.id]);

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
    } else if (defaultTab === 'explore') {
      setActiveTab('properties');
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
  const [referralsList, setReferralsList] = useState<
    Array<{ id: string; email: string; date: string; status: 'invited' | 'registered' | 'funded'; reward: number }>
  >(() => {
    if (!user) return [];
    try {
      const saved = localStorage.getItem(`kretz_referrals_${user.id}`);
      if (saved) return JSON.parse(saved);
    } catch {}
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
          const merged = [...res.data.referrals, ...prev.filter((p) => !seen.has(p.email.toLowerCase()))];
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
      <div className="min-h-[50vh] flex items-center justify-center p-8 bg-[#0B0F10]">
        <div className="w-8 h-8 border-2 border-[#6FD8B0] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const investments = serverInvestments !== null ? serverInvestments : ledger.getInvestments(user.id);
  const transactions = serverTransactions !== null ? serverTransactions : ledger.getTransactions(user.id);
  const notifications = serverNotifications !== null ? serverNotifications : ledger.getNotifications(user.id);
  const properties = ledger.getProperties();
  const frontendProperties = ledger.getFrontendProperties();

  const handleWithdrawalSuccess = async () => {
    await Promise.all([refreshUser(), hydrateLiveDashboard(true)]);
  };

  const referralCode = `KRETZ-${(user.email ? user.email.split('@')[0] : user.id.slice(0, 6) || 'VIP')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 8)}`;

  const productionReferralLink = `https://kretzdespain.com/register?ref=${referralCode}`;
  const currentOrigin =
    typeof window !== 'undefined' && window.location.origin ? window.location.origin : 'https://kretzdespain.com';
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
      } catch {}
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
      const msg =
        response?.message || 'Your support inquiry has been logged with our Investor Desk. Reference notification added.';
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

  const unreadCount = notifications.filter((n) => !n.read).length;

  const navItems = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'portfolio', label: 'Portfolio', icon: Building2, count: investments.length },
    { id: 'properties', label: 'Explore', icon: TrendingUp },
    { id: 'transactions', label: 'Ledger', icon: History, count: transactions.length },
    { id: 'wallet', label: 'Wallet', icon: Wallet },
    { id: 'analytics', label: 'Portfolio Analytics', icon: PieChart },
    { id: 'distributions', label: 'Distributions', icon: Coins },
    { id: 'documents', label: 'Documents', icon: FileText, count: investments.length },
    { id: 'tax_statements', label: 'Tax & Fiscal Reports', icon: Award },
    { id: 'verification', label: 'Compliance Vault', icon: ShieldCheck },
    { id: 'membership', label: 'Club Privé', icon: Crown },
    { id: 'referrals', label: 'Referrals', icon: Share2 },
    { id: 'notifications', label: 'Notifications', icon: Bell, count: unreadCount },
    { id: 'profile', label: 'Profile Settings', icon: User },
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
        [inv.propertyTitle, inv.propertyLocation].filter(Boolean).join(' ').toLowerCase().includes(trimmedSearch)
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

  const isPrimaryTab = PRIMARY_TABS.has(activeTab);
  const userInitial = (user.fullName || user.email || 'A').trim().charAt(0).toUpperCase();
  const userInitials = (user.fullName || 'Investor')
    .trim()
    .split(/\s+/)
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const exploreCategories = useMemo(() => {
    const types = Array.from(
      new Set(
        frontendProperties
          .map((p) => p.type)
          .filter(Boolean)
          .map((t) => String(t))
      )
    );
    return ['All', ...types];
  }, [frontendProperties]);

  const filteredExploreProperties = useMemo(() => {
    const q = exploreQuery.trim().toLowerCase();
    return frontendProperties.filter((p) => {
      if (exploreCategory !== 'All' && String(p.type).toLowerCase() !== exploreCategory.toLowerCase()) {
        return false;
      }
      if (q) {
        const text = [p.title, p.location, p.city, p.country, p.type].filter(Boolean).join(' ').toLowerCase();
        if (!text.includes(q)) return false;
      }
      return true;
    });
  }, [frontendProperties, exploreQuery, exploreCategory]);

  return (
    <div className={`app-shell dashboard-${dashboardMode} dashboard-theme-${dashboardTheme}`}>
      <AtmosphericFintechBackground />

      {/* Desktop Fixed-Width Sidebar */}
      <aside className="app-sidebar hidden md:flex">
        <div
          onClick={onNavigateHome}
          className="p-4 border-b border-[var(--dash-sidebar-border)] flex items-center gap-2.5 cursor-pointer hover:opacity-90 transition-opacity"
        >
          <LagenceLogo className="w-7 h-7 shrink-0" variant="gold" />
          <div className="min-w-0">
            <h2 className="font-bold text-sm text-[var(--dash-text)] tracking-tight leading-tight truncate">
              L&apos;Agence
            </h2>
            <p className="text-[9.5px] tracking-[0.14em] uppercase text-[var(--dash-text-muted)] leading-tight truncate mt-0.5">
              Investor Portal
            </p>
          </div>
        </div>

        {/* User Mini Card */}
        <div className="p-2.5 mx-2.5 mt-2.5 mb-1 bg-[var(--dash-sidebar-card)] rounded-xl border border-[var(--dash-sidebar-border)] flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-[var(--dash-sidebar-active-bg)] border border-[var(--dash-accent-border)] text-[var(--dash-text)] flex items-center justify-center font-bold text-xs shrink-0">
            {userInitials}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-xs text-[var(--dash-text)] truncate leading-tight">
              {user.fullName}
            </h3>
            <div className="flex items-center gap-1 mt-0.5">
              {user.kycStatus === 'verified' ? (
                <span className="inline-flex items-center gap-0.5 text-[9.5px] font-semibold text-[var(--dash-positive)]">
                  <ShieldCheck className="w-2.5 h-2.5" /> Verified
                </span>
              ) : (
                <span className="text-[9.5px] text-[var(--dash-warm)] font-medium capitalize">
                  KYC {user.kycStatus}
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
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`relative w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer group ${
                  isActive
                    ? 'bg-[var(--dash-sidebar-active-bg)] text-[var(--dash-sidebar-active-text)] font-semibold'
                    : 'text-[var(--dash-text-secondary)] hover:bg-[var(--dash-sidebar-hover-bg)] hover:text-[var(--dash-text)]'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Icon
                    className={`w-4 h-4 shrink-0 ${
                      isActive ? 'text-[var(--dash-accent)]' : 'opacity-70 group-hover:opacity-100'
                    }`}
                  />
                  <span className="truncate">{item.label}</span>
                </div>
                {item.count !== undefined && item.count > 0 && (
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold shrink-0 ml-1 tabular-nums ${
                      isActive
                        ? 'bg-[var(--dash-highlight)] text-[var(--dash-accent)] border border-[var(--dash-accent-border)]'
                        : 'bg-[var(--dash-inner)] text-[var(--dash-text-muted)]'
                    }`}
                  >
                    {item.count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Sidebar Quick Actions */}
        <div className="p-2.5 border-t border-[var(--dash-sidebar-border)] bg-[var(--dash-sidebar-card)] space-y-2">
          <div className="grid grid-cols-2 gap-1.5">
            <button
              type="button"
              onClick={() => setIsDepositOpen(true)}
              className="portal-btn !h-9 !px-2.5 !rounded-xl flex items-center justify-center gap-1 text-xs cursor-pointer"
              title="Deposit Funds"
            >
              <ArrowDownLeft className="w-3.5 h-3.5 stroke-[2.2]" />
              <span>Deposit</span>
            </button>
            <button
              type="button"
              onClick={() => setIsWithdrawOpen(true)}
              className="portal-btn-outline !h-9 !px-2.5 !rounded-xl flex items-center justify-center gap-1 text-xs cursor-pointer"
              title="Withdraw Funds"
            >
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>Withdraw</span>
            </button>
          </div>
          <button
            type="button"
            onClick={logout}
            className="w-full flex items-center justify-center gap-1.5 hover:bg-rose-500/10 text-rose-400 border border-[var(--dash-card-border)] hover:border-rose-500/30 text-xs font-semibold rounded-xl py-1.5 px-2 transition-all cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content Wrapper */}
      <div className="app-main-area pb-20 md:pb-0">
        {/* Top Header */}
        <header className="h-14 sm:h-16 shrink-0 z-40 px-3 sm:px-5 lg:px-6 flex items-center justify-between sticky top-0 transition-colors">
          {/* Left: Mobile Back+Title on Subpages or Brand on Primary Tabs */}
          <div className="flex items-center gap-2.5 min-w-0">
            {!isPrimaryTab ? (
              <button
                type="button"
                onClick={() => setActiveTab('more')}
                aria-label="Back to menu"
                className="md:hidden size-10 grid place-items-center rounded-xl border border-[var(--dash-card-border)] bg-[var(--dash-card)] text-[var(--dash-text)] cursor-pointer shrink-0"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            ) : null}

            <div className={`${!isPrimaryTab ? 'hidden md:flex' : 'flex'} items-center gap-2.5`}>
              <button
                type="button"
                onClick={onNavigateHome}
                className="flex items-center gap-2 text-left cursor-pointer group focus:outline-none"
                title="Return to Home"
              >
                <LagenceLogo className="w-6 h-6 shrink-0 md:hidden" variant="gold" />
                <div className="flex flex-col">
                  <span className="text-base font-bold tracking-tight text-[var(--dash-text)] leading-tight">
                    L&apos;Agence
                  </span>
                  <span className="text-[10px] uppercase tracking-[0.14em] font-semibold text-[var(--dash-text-muted)]">
                    Investor Portal
                  </span>
                </div>
              </button>
            </div>

            {!isPrimaryTab && (
              <h1 className="md:hidden text-base font-bold text-[var(--dash-text)] truncate">
                {TAB_TITLES[activeTab] || 'Portal'}
              </h1>
            )}
          </div>

          {/* Center Navigation (Desktop Large) */}
          <nav
            aria-label="Primary portal tabs"
            className="hidden lg:flex items-center gap-1 bg-[var(--dash-header-controls)] p-1 rounded-xl border border-[var(--dash-header-controls-border)]"
          >
            {[
              { id: 'overview', label: 'Overview', icon: LayoutDashboard },
              { id: 'portfolio', label: 'Portfolio', icon: Building2 },
              { id: 'properties', label: 'Explore', icon: TrendingUp },
              { id: 'transactions', label: 'Ledger', icon: History },
              { id: 'wallet', label: 'Wallet', icon: Wallet },
              { id: 'analytics', label: 'Analytics', icon: PieChart },
            ].map((item) => {
              const Icon = item.icon;
              const isActive =
                activeTab === item.id || (item.id === 'properties' && activeTab === 'explore');
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={`relative px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                    isActive
                      ? 'bg-[var(--dash-sidebar-active-bg)] text-[var(--dash-sidebar-active-text)] font-bold'
                      : 'text-[var(--dash-text-secondary)] hover:text-[var(--dash-text)] hover:bg-[var(--dash-hover)]'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-[var(--dash-accent)]' : 'opacity-70'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Right Controls: Search, Theme Toggle, Bell, Account Avatar */}
          <div className="flex items-center gap-2">
            {/* Compact Desktop Search */}
            <div ref={searchContainerRef} className="hidden xl:flex items-center relative">
              <Search className="w-3.5 h-3.5 text-[var(--dash-text-muted)] absolute left-3 pointer-events-none" />
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
                className="w-48 bg-[var(--dash-header-controls)] text-xs text-[var(--dash-text)] placeholder-[var(--dash-text-muted)] rounded-xl pl-8 pr-7 py-2 border border-[var(--dash-header-controls-border)] focus:outline-none focus:border-[var(--dash-accent)] transition-colors"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  aria-label="Clear search query"
                  className="absolute right-2.5 text-[var(--dash-text-muted)] hover:text-[var(--dash-text)] cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              )}

              {isSearchFocused && trimmedSearch.length > 0 && (
                <div className="absolute right-0 top-full mt-1.5 w-80 max-h-96 overflow-y-auto portal-card shadow-2xl p-2 z-50 text-left space-y-2">
                  {totalSearchHits === 0 ? (
                    <div className="p-3 text-center text-xs text-[var(--dash-text-muted)]">
                      No matches for &ldquo;{searchQuery.trim()}&rdquo;.
                    </div>
                  ) : (
                    <>
                      {searchResults.properties.length > 0 && (
                        <div>
                          <div className="px-2 py-1 text-[9.5px] font-bold uppercase tracking-wider text-[var(--dash-text-muted)]">
                            Properties
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
                                <span className="font-semibold text-[var(--dash-text)] block truncate">
                                  {prop.title}
                                </span>
                                <span className="text-[10px] text-[var(--dash-text-muted)] block truncate">
                                  {prop.location}
                                </span>
                              </div>
                              <span className="font-mono text-[10.5px] font-bold text-[var(--dash-accent)] shrink-0">
                                {formatCurrency(prop.tokenPrice)}
                              </span>
                            </button>
                          ))}
                        </div>
                      )}

                      {searchResults.holdings.length > 0 && (
                        <div>
                          <div className="px-2 py-1 text-[9.5px] font-bold uppercase tracking-wider text-[var(--dash-text-muted)]">
                            Holdings
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
                              <span className="font-semibold text-[var(--dash-text)] truncate">
                                {inv.propertyTitle}
                              </span>
                              <span className="font-mono text-[10px] text-[var(--dash-accent)] shrink-0">
                                {inv.tokensPurchased} units
                              </span>
                            </button>
                          ))}
                        </div>
                      )}

                      {searchResults.txs.length > 0 && (
                        <div>
                          <div className="px-2 py-1 text-[9.5px] font-bold uppercase tracking-wider text-[var(--dash-text-muted)]">
                            Transactions
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
                                <span className="font-semibold text-[var(--dash-text)] block truncate">
                                  {tx.description}
                                </span>
                                <span className="font-mono text-[9.5px] text-[var(--dash-text-muted)]">
                                  {tx.reference}
                                </span>
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
                            Sections
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
                              <ArrowRight className="w-3 h-3 text-[var(--dash-accent)]" />
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

            {/* Light / Dark Mode Toggle */}
            <button
              type="button"
              onClick={toggleDashboardMode}
              className="size-10 grid place-items-center rounded-xl bg-[var(--dash-header-controls)] text-[var(--dash-text)] border border-[var(--dash-header-controls-border)] hover:bg-[var(--dash-hover)] transition-colors cursor-pointer"
              title={dashboardMode === 'light' ? 'Switch to dark theme' : 'Switch to light theme'}
              aria-label={dashboardMode === 'light' ? 'Switch to dark theme' : 'Switch to light theme'}
            >
              {dashboardMode === 'light' ? (
                <Moon className="w-4 h-4 text-[var(--dash-accent)]" />
              ) : (
                <Sun className="w-4 h-4 text-[var(--dash-accent)]" />
              )}
            </button>

            {/* Interactive Notifications Popover */}
            <div ref={bellDropdownRef} className="relative">
              <button
                type="button"
                onClick={() => setBellDropdownOpen((prev) => !prev)}
                aria-label="Notifications"
                aria-expanded={bellDropdownOpen}
                title="Notifications"
                className={`relative size-10 grid place-items-center rounded-xl border transition-colors cursor-pointer ${
                  bellDropdownOpen || activeTab === 'notifications'
                    ? 'bg-[var(--dash-sidebar-active-bg)] text-[var(--dash-text)] border-[var(--dash-accent-border)]'
                    : 'bg-[var(--dash-header-controls)] text-[var(--dash-text-secondary)] hover:text-[var(--dash-text)] border-[var(--dash-header-controls-border)] hover:bg-[var(--dash-hover)]'
                }`}
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute -right-1 -top-1 min-w-[18px] h-[18px] px-1 rounded-full bg-[var(--dash-accent)] text-[var(--dash-accent-ink)] text-[10px] font-bold flex items-center justify-center tabular-nums border border-[var(--dash-bg)]">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {bellDropdownOpen && (
                <div className="portal-card absolute right-0 top-[50px] z-50 w-80 sm:w-96 !p-0 shadow-2xl text-left overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-4 py-3 bg-[var(--dash-inner)] border-b border-[var(--dash-card-border)] flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-[var(--dash-text)]">Notifications</span>
                      <span className="portal-pill ok">{unreadCount} unread</span>
                    </div>
                    {unreadCount > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setServerNotifications((prev) =>
                            prev ? prev.map((n) => ({ ...n, read: true })) : prev
                          );
                          ledger.markAllNotificationsAsRead(user.id);
                          userApi.markAllNotificationsRead().catch(() => {});
                        }}
                        className="text-[11px] font-semibold text-[var(--dash-accent)] hover:underline cursor-pointer"
                      >
                        Mark all read
                      </button>
                    )}
                  </div>

                  <div className="max-h-80 overflow-y-auto divide-y divide-[var(--dash-card-border)]">
                    {notifications.length === 0 ? (
                      <div className="p-6 text-center text-xs text-[var(--dash-text-muted)]">
                        No account alerts recorded yet.
                      </div>
                    ) : (
                      notifications.slice(0, 5).map((notif) => (
                        <div
                          key={notif.id}
                          className={`px-4 py-3 flex items-start gap-2.5 text-xs ${
                            notif.read ? 'opacity-75' : 'bg-[var(--dash-highlight)]/40'
                          }`}
                        >
                          <span
                            className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${
                              notif.read ? 'bg-[var(--dash-card-border)]' : 'bg-[var(--dash-accent)]'
                            }`}
                          />
                          <div className="flex-1 min-w-0 space-y-0.5">
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-semibold text-[var(--dash-text)] truncate">{notif.title}</span>
                              <span className="text-[10px] font-mono text-[var(--dash-text-muted)] shrink-0">
                                {formatDate(notif.createdAt)}
                              </span>
                            </div>
                            <p className="text-[11px] text-[var(--dash-text-secondary)] line-clamp-2">
                              {notif.message}
                            </p>
                            {!notif.read && (
                              <button
                                type="button"
                                onClick={() => {
                                  setServerNotifications((prev) =>
                                    prev ? prev.map((n) => (n.id === notif.id ? { ...n, read: true } : n)) : prev
                                  );
                                  ledger.markNotificationAsRead(notif.id);
                                  userApi.markNotificationRead(notif.id).catch(() => {});
                                }}
                                className="text-[10.5px] font-semibold text-[var(--dash-accent)] hover:underline cursor-pointer pt-0.5"
                              >
                                Mark as read
                              </button>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="px-4 py-2.5 bg-[var(--dash-inner)] border-t border-[var(--dash-card-border)] flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => {
                        setBellDropdownOpen(false);
                        setActiveTab('notifications');
                      }}
                      className="text-xs font-semibold text-[var(--dash-accent)] hover:underline cursor-pointer"
                    >
                      All Alerts &amp; Preferences &rarr;
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Account Avatar + Popover Menu (Matches Template #acct / #menu) */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                aria-label="Account menu"
                className="flex items-center gap-2 h-10 px-2.5 rounded-xl border border-[var(--dash-accent-border)] bg-[var(--dash-sidebar-active-bg)] text-[var(--dash-text)] font-bold cursor-pointer hover:brightness-105 transition-all"
              >
                <span className="w-6 h-6 rounded-lg flex items-center justify-center text-sm font-bold overflow-hidden">
                  {user.avatarUrl ? (
                    <img
                      src={user.avatarUrl}
                      alt={user.fullName || 'User Profile'}
                      className="w-full h-full object-cover rounded-lg"
                    />
                  ) : (
                    userInitial
                  )}
                </span>
                <ChevronDown
                  className={`hidden sm:block w-3.5 h-3.5 text-[var(--dash-text-muted)] transition-transform ${
                    userDropdownOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {userDropdownOpen && (
                <div className="portal-card absolute right-0 top-[50px] z-50 w-72 !p-2 shadow-2xl text-left animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-3 py-2.5">
                    <div className="text-[11px] font-semibold tracking-wider text-[var(--dash-text-muted)]">
                      SIGNED IN AS
                    </div>
                    <div className="mt-1 truncate text-sm font-semibold text-[var(--dash-text)]">
                      {user.email}
                    </div>
                    <div className="mt-0.5 text-xs text-[var(--dash-text-muted)] font-mono tabular-nums">
                      Wallet balance: {formatCurrency(user.walletBalance)}
                    </div>
                  </div>
                  <div className="my-1 h-px bg-[var(--dash-card-border)]" />
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('profile');
                      setUserDropdownOpen(false);
                    }}
                    className="w-full flex items-center justify-between h-11 rounded-lg px-3 text-sm text-[var(--dash-text)] hover:bg-[var(--dash-hover)] transition-colors cursor-pointer"
                  >
                    <span>Profile &amp; Banking</span>
                    <ChevronRight className="w-4 h-4 text-[var(--dash-text-muted)]" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('wallet');
                      setUserDropdownOpen(false);
                    }}
                    className="w-full flex items-center justify-between h-11 rounded-lg px-3 text-sm text-[var(--dash-text)] hover:bg-[var(--dash-hover)] transition-colors cursor-pointer"
                  >
                    <span>Wallet &amp; Deposits</span>
                    <ChevronRight className="w-4 h-4 text-[var(--dash-text-muted)]" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      toggleDashboardMode();
                      setUserDropdownOpen(false);
                    }}
                    className="w-full flex items-center justify-between h-11 rounded-lg px-3 text-sm text-[var(--dash-text)] hover:bg-[var(--dash-hover)] transition-colors cursor-pointer"
                  >
                    <span>{dashboardMode === 'light' ? 'Dark Theme' : 'Light Theme'}</span>
                    {dashboardMode === 'light' ? (
                      <Moon className="w-4 h-4 text-[var(--dash-accent)]" />
                    ) : (
                      <Sun className="w-4 h-4 text-[var(--dash-accent)]" />
                    )}
                  </button>
                  <div className="my-1 h-px bg-[var(--dash-card-border)]" />
                  <button
                    type="button"
                    onClick={() => {
                      logout();
                      setUserDropdownOpen(false);
                    }}
                    className="w-full flex items-center justify-between h-11 rounded-lg px-3 text-sm font-semibold text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                  >
                    <span>Logout</span>
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {/* Mobile Quick Menu Trigger on Tablet */}
            <button
              type="button"
              onClick={() => setMobileHeaderMenuOpen(!mobileHeaderMenuOpen)}
              className="hidden sm:grid md:hidden size-10 place-items-center rounded-xl bg-[var(--dash-header-controls)] text-[var(--dash-text)] border border-[var(--dash-header-controls-border)] cursor-pointer"
              aria-label={mobileHeaderMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            >
              {mobileHeaderMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </header>

        {/* Tablet Collapsible Menu */}
        {mobileHeaderMenuOpen && (
          <div className="md:hidden bg-[var(--dash-header)] border-b border-[var(--dash-header-border)] px-4 py-3 space-y-2 z-30">
            <div className="grid grid-cols-2 gap-1.5">
              {navItems.slice(0, 10).map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setActiveTab(item.id);
                      setMobileHeaderMenuOpen(false);
                    }}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold cursor-pointer ${
                      isActive
                        ? 'bg-[var(--dash-sidebar-active-bg)] text-[var(--dash-sidebar-active-text)]'
                        : 'text-[var(--dash-text-secondary)] hover:bg-[var(--dash-hover)]'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span className="truncate">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Scrollable Content Area */}
        <main className="app-content-scroll">
          <div className="max-w-[1160px] w-full mx-auto space-y-5 relative z-10">
            {/* 1. OVERVIEW TAB — Live Financial & Treasury Dashboard */}
            {activeTab === 'overview' &&
              (() => {
                const hour = new Date().getHours();
                const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

                const cashBreakdown = summary?.cashBreakdown || {
                  available: user.walletBalance ?? 0,
                  pendingDeposits: 0,
                  reservedWithdrawals: 0,
                  restricted: 0,
                  currency: 'EUR',
                };
                const totalNetValuation =
                  typeof summary?.totalPortfolioValue === 'number'
                    ? summary.totalPortfolioValue
                    : cashBreakdown.available +
                      investments.reduce((s, inv) => s + (inv.currentValuation || inv.totalAmountInvested), 0);

                const rentSummary = summary?.rentSummary || {
                  projectedMonthly: investments.reduce(
                    (s, inv) => s + ((inv.totalAmountInvested * inv.estimatedAnnualYield) / 100) / 12,
                    0
                  ),
                  collectedTotal: summary?.totalEarnedDividends ?? user.totalEarned ?? 0,
                  collectedThisMonth: 0,
                  nextDistributionDate: null,
                  paymentStatus: investments.length > 0 ? 'Scheduled' : 'No Active Entitlements',
                };

                const holdingsSummary = summary?.holdingsSummary || {
                  confirmedUnits: investments.reduce((s, inv) => s + inv.tokensPurchased, 0),
                  pendingUnits: 0,
                  activePropertiesCount: investments.length,
                  holdings: investments.map((inv) => ({
                    id: inv.id,
                    propertyId: inv.propertyId,
                    propertyTitle: inv.propertyTitle,
                    location: inv.propertyLocation,
                    confirmedUnits: inv.tokensPurchased,
                    ownershipPercent: 0,
                    valuation: inv.currentValuation || inv.totalAmountInvested,
                    valuationDate: inv.purchasedAt,
                    status: inv.status,
                    onChainStatus: inv.transactionHash ? 'On-Chain Settled' : 'SPV Book-Entry Confirmed',
                  })),
                };

                const rawLifecycleStages: any[] = Array.isArray(summary?.lifecycle?.stages)
                  ? summary.lifecycle.stages
                  : [
                      {
                        stepNumber: 1,
                        key: 'account_registered',
                        title: 'Account Registered',
                        status: 'Completed',
                        summary: `Registered ${formatDate(user.createdAt)}`,
                        actionTab: 'profile',
                        requirements: ['Authenticated investor profile established'],
                      },
                      {
                        stepNumber: 2,
                        key: 'identity_verification',
                        title: 'Identity Verification (KYC/AML)',
                        status:
                          user.kycStatus === 'verified'
                            ? 'Approved'
                            : user.kycStatus === 'rejected'
                            ? 'Rejected'
                            : user.kycStatus === 'pending'
                            ? 'In Review'
                            : 'Not Started',
                        summary:
                          user.kycStatus === 'verified'
                            ? 'EU AML Identity Verified'
                            : 'Submit Passport / National ID & Proof of Address',
                        actionTab: 'verification',
                        requirements: ['Identity scan', 'Proof of address (90 days)', 'Tax residency'],
                      },
                      {
                        stepNumber: 3,
                        key: 'wallet_funded',
                        title: 'Wallet Funded',
                        status: cashBreakdown.available > 0 || cashBreakdown.pendingDeposits > 0 ? 'Completed' : 'Not Started',
                        summary:
                          cashBreakdown.available > 0
                            ? `Cleared ${formatCurrency(cashBreakdown.available)}`
                            : 'Deposit EUR or supported crypto assets',
                        actionTab: 'wallet',
                        requirements: ['Cleared SEPA bank wire or USDC/SOL transfer'],
                      },
                      {
                        stepNumber: 4,
                        key: 'asset_tokens_held',
                        title: 'Asset Tokens Held',
                        status: holdingsSummary.confirmedUnits > 0 ? 'Completed' : 'Not Started',
                        summary:
                          holdingsSummary.confirmedUnits > 0
                            ? `${holdingsSummary.confirmedUnits} confirmed units`
                            : 'Allocate treasury cash into an SPV offering',
                        actionTab: 'properties',
                        requirements: ['Confirmed notarized SPV deed allocation'],
                      },
                      {
                        stepNumber: 5,
                        key: 'monthly_yields',
                        title: 'Monthly Yields',
                        status:
                          rentSummary.collectedTotal > 0
                            ? 'Completed'
                            : holdingsSummary.confirmedUnits > 0
                            ? 'Pending'
                            : 'Not Started',
                        summary:
                          rentSummary.collectedTotal > 0
                            ? `${formatCurrency(rentSummary.collectedTotal)} cumulative rent collected`
                            : 'Distributions activate upon unit ownership',
                        actionTab: 'distributions',
                        requirements: ['Monthly rental yield paid on the 1st of each month'],
                      },
                    ];

                const pipelineStages: PipelineStage[] = rawLifecycleStages.map((s: any) => ({
                  id: String(s.key || s.id || `step-${s.stepNumber}`),
                  stepNumber: Number(s.stepNumber || 0),
                  title: String(s.title),
                  description: String(s.summary || ''),
                  status: (s.status || 'Not Started') as PipelineStageStatus,
                  timestamp: s.updatedAt || null,
                  actionTab: s.actionTab === 'marketplace' ? 'properties' : s.actionTab,
                  requirements: Array.isArray(s.requirements) ? s.requirements : [],
                  detailNote: s.summary,
                }));

                const selectedLifecycleStage =
                  pipelineStages.find((st) => st.id === selectedLifecycleKey) ||
                  pipelineStages.find((st) => st.status !== 'Completed' && st.status !== 'Approved') ||
                  pipelineStages[0];

                const topHolding = holdingsSummary.holdings?.[0];
                const featuredProperties = (frontendProperties.length > 0 ? frontendProperties : properties).slice(0, 4);
                const treasuryAssets = ['EUR', 'USD', 'GBP', 'CHF', 'USDC', 'USDT', 'SOL'];

                return (
                  <div className="space-y-5 animate-in fade-in duration-200">
                    {/* Live Sync Status + Greeting Header */}
                    <section className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-xs text-[var(--dash-text-muted)]">
                          <span
                            className={`h-2 w-2 rounded-full ${
                              syncError
                                ? 'bg-rose-400'
                                : realtimeStatus === 'live'
                                ? 'bg-[var(--dash-accent)]'
                                : 'bg-emerald-400'
                            }`}
                          />
                          <span>
                            {isHydrating && !summary
                              ? 'Synchronizing treasury & custody ledger...'
                              : realtimeStatus === 'live'
                              ? 'Live Realtime Sync · Institutional Custody'
                              : 'Authenticated Account · Backend Synced'}
                          </span>
                          {lastSyncedAt && (
                            <span className="hidden sm:inline font-mono text-[10.5px] opacity-80">
                              · Updated{' '}
                              {new Date(lastSyncedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          )}
                        </div>
                        <h1 className="text-2xl sm:text-[28px] font-bold tracking-tight text-[var(--dash-text)]">
                          {greeting}, {(user.fullName || 'Investor').trim().split(/\s+/)[0]}
                        </h1>
                      </div>

                      <div className="flex items-center gap-2 self-start sm:self-auto">
                        <button
                          type="button"
                          onClick={() => hydrateLiveDashboard(false)}
                          disabled={isHydrating}
                          className="dashboard-secondary-action !h-9 text-xs cursor-pointer"
                          title="Refresh all live treasury balances and portfolio records"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${isHydrating ? 'animate-spin' : ''}`} />
                          <span>Refresh Data</span>
                        </button>
                      </div>
                    </section>

                    {syncError && (
                      <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-xs font-semibold text-[var(--dash-negative)] flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <AlertCircle className="w-4 h-4 shrink-0" />
                          <span>{syncError}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => hydrateLiveDashboard(false)}
                          className="px-3 py-1 rounded-lg bg-rose-500 text-white text-[11px] font-bold cursor-pointer shrink-0"
                        >
                          Retry
                        </button>
                      </div>
                    )}

                    {/* 4 Dynamic Financial Summary Cards */}
                    {isHydrating && !summary ? (
                      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3.5">
                        {[0, 1, 2, 3].map((idx) => (
                          <div key={idx} className="portal-card p-5 space-y-3 animate-pulse">
                            <div className="h-3 w-28 rounded bg-[var(--dash-inner)]" />
                            <div className="h-8 w-36 rounded bg-[var(--dash-inner)]" />
                            <div className="h-3 w-full rounded bg-[var(--dash-inner)]" />
                          </div>
                        ))}
                      </section>
                    ) : (
                      <section
                        aria-label="Live financial summary"
                        className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3.5"
                      >
                        {/* 1. Portfolio Net Valuation */}
                        <button
                          type="button"
                          onClick={() => setActiveTab('portfolio')}
                          className="portal-card p-5 text-left hover:border-[var(--dash-accent)] transition-all cursor-pointer flex flex-col justify-between gap-3"
                        >
                          <div className="flex items-center justify-between gap-2 w-full">
                            <span className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-[var(--dash-text-muted)]">
                              Portfolio Net Valuation
                            </span>
                            <Landmark className="w-4 h-4 text-[var(--dash-accent)] shrink-0" />
                          </div>
                          <div>
                            <div className="text-2xl sm:text-[26px] font-bold tracking-tight tabular-nums text-[var(--dash-text)]">
                              {formatCurrency(totalNetValuation)}
                            </div>
                            <div className="text-[11px] text-[var(--dash-text-muted)] mt-1 flex items-center justify-between gap-2">
                              <span>
                                Valuation:{' '}
                                <span className="font-mono text-[var(--dash-text-secondary)]">
                                  {summary?.valuationDate ? formatDate(summary.valuationDate) : 'Live'}
                                </span>
                              </span>
                            </div>
                            {(summary?.pendingAllocationsCount ?? 0) > 0 && (
                              <div className="mt-2 inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#D8B77C]/15 text-[#D8B77C] border border-[#D8B77C]/30">
                                Pending allocation: {formatCurrency(summary.pendingAllocationsAmount || 0)}
                              </div>
                            )}
                          </div>
                        </button>

                        {/* 2. Available Liquid Cash */}
                        <button
                          type="button"
                          onClick={() => setActiveTab('wallet')}
                          className="portal-card p-5 text-left hover:border-[var(--dash-accent)] transition-all cursor-pointer flex flex-col justify-between gap-3"
                        >
                          <div className="flex items-center justify-between gap-2 w-full">
                            <span className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-[var(--dash-text-muted)]">
                              Available Liquid Cash
                            </span>
                            <Wallet className="w-4 h-4 text-[var(--dash-positive)] shrink-0" />
                          </div>
                          <div>
                            <div className="flex items-baseline gap-1.5">
                              <span className="text-2xl sm:text-[26px] font-bold tracking-tight tabular-nums text-[var(--dash-text)]">
                                {formatCurrency(cashBreakdown.available)}
                              </span>
                              <span className="text-[10.5px] font-mono font-bold text-[var(--dash-text-muted)]">
                                {cashBreakdown.currency || 'EUR'}
                              </span>
                            </div>
                            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[10.5px] text-[var(--dash-text-muted)]">
                              <span>
                                Pending:{' '}
                                <strong className="font-mono text-[var(--dash-warm)]">
                                  {formatCurrency(cashBreakdown.pendingDeposits)}
                                </strong>
                              </span>
                              <span>
                                Reserved:{' '}
                                <strong className="font-mono text-[var(--dash-text-secondary)]">
                                  {formatCurrency(cashBreakdown.reservedWithdrawals)}
                                </strong>
                              </span>
                              {cashBreakdown.restricted > 0 && (
                                <span className="text-rose-400">
                                  Restricted: {formatCurrency(cashBreakdown.restricted)}
                                </span>
                              )}
                            </div>
                          </div>
                        </button>

                        {/* 3. Estimated Monthly Rent */}
                        <button
                          type="button"
                          onClick={() => setActiveTab('distributions')}
                          className="portal-card p-5 text-left hover:border-[var(--dash-accent)] transition-all cursor-pointer flex flex-col justify-between gap-3"
                        >
                          <div className="flex items-center justify-between gap-2 w-full">
                            <span className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-[var(--dash-text-muted)]">
                              Estimated Monthly Rent
                            </span>
                            <Coins className="w-4 h-4 text-[#D8B77C] shrink-0" />
                          </div>
                          <div>
                            <div className="text-2xl sm:text-[26px] font-bold tracking-tight tabular-nums text-[var(--dash-positive)]">
                              {formatCurrency(rentSummary.projectedMonthly)}
                              <span className="text-xs font-normal text-[var(--dash-text-muted)]">/mo</span>
                            </div>
                            <div className="mt-1.5 flex items-center justify-between gap-2 text-[10.5px]">
                              <span className="text-[var(--dash-text-muted)]">
                                Collected:{' '}
                                <strong className="font-mono text-[var(--dash-text)]">
                                  {formatCurrency(rentSummary.collectedTotal)}
                                </strong>
                              </span>
                              <span
                                className={`px-2 py-0.5 rounded-full text-[9.5px] font-semibold ${
                                  rentSummary.paymentStatus === 'Paid This Cycle'
                                    ? 'bg-[#43C98B]/15 text-[#6FD8B0] border border-[#43C98B]/30'
                                    : rentSummary.paymentStatus === 'Scheduled'
                                    ? 'bg-[#D8B77C]/15 text-[#D8B77C] border border-[#D8B77C]/30'
                                    : 'bg-[var(--dash-inner)] text-[var(--dash-text-muted)] border border-[var(--dash-card-border)]'
                                }`}
                              >
                                {rentSummary.paymentStatus}
                              </span>
                            </div>
                            {rentSummary.nextDistributionDate && (
                              <div className="mt-1 text-[10px] text-[var(--dash-text-muted)] flex items-center gap-1 font-mono">
                                <Calendar className="w-3 h-3 text-[var(--dash-accent)]" />
                                <span>Next payout: {rentSummary.nextDistributionDate}</span>
                              </div>
                            )}
                          </div>
                        </button>

                        {/* 4. Tokenized Shares Held */}
                        <button
                          type="button"
                          onClick={() => setActiveTab('portfolio')}
                          className="portal-card p-5 text-left hover:border-[var(--dash-accent)] transition-all cursor-pointer flex flex-col justify-between gap-3"
                        >
                          <div className="flex items-center justify-between gap-2 w-full">
                            <span className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-[var(--dash-text-muted)]">
                              Tokenized Shares Held
                            </span>
                            <Building2 className="w-4 h-4 text-[var(--dash-accent)] shrink-0" />
                          </div>
                          <div>
                            <div className="flex items-baseline gap-2">
                              <span className="text-2xl sm:text-[26px] font-bold tracking-tight tabular-nums text-[var(--dash-text)]">
                                {Number(holdingsSummary.confirmedUnits || 0).toLocaleString()}
                              </span>
                              <span className="text-xs font-semibold text-[var(--dash-text-muted)]">
                                Verified Units ({holdingsSummary.activePropertiesCount || 0} SPV)
                              </span>
                            </div>
                            {topHolding ? (
                              <div className="mt-1.5 text-[10.5px] text-[var(--dash-text-muted)] space-y-0.5">
                                <div className="truncate font-semibold text-[var(--dash-text-secondary)]">
                                  {topHolding.propertyTitle}
                                  {topHolding.ownershipPercent > 0 ? ` · ${topHolding.ownershipPercent}%` : ''}
                                </div>
                                <div className="text-[10px] text-[var(--dash-positive)] font-mono">
                                  {topHolding.onChainStatus || 'Confirmed Holding'}
                                </div>
                              </div>
                            ) : (
                              <p className="mt-1.5 text-[10.5px] text-[var(--dash-text-muted)]">
                                No confirmed SPV share allocations yet
                              </p>
                            )}
                            {(holdingsSummary.pendingUnits ?? 0) > 0 && (
                              <div className="mt-1 text-[10px] text-[#D8B77C] font-mono">
                                +{holdingsSummary.pendingUnits} pending allocation units
                              </div>
                            )}
                          </div>
                        </button>
                      </section>
                    )}

                    {/* Institutional Treasury Command & Multi-Currency Sub-Balances */}
                    <section className="portal-card p-5 space-y-4">
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3.5 border-b border-[var(--dash-card-border)]">
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--dash-accent)]">
                            TREASURY COMMAND
                          </p>
                          <h2 className="text-sm sm:text-base font-bold text-[var(--dash-text)] mt-0.5">
                            Multi-Currency Balances &amp; Execution
                          </h2>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setIsDepositOpen(true)}
                            className="portal-btn !h-9 !px-3.5 text-xs inline-flex items-center gap-1.5 cursor-pointer"
                          >
                            <ArrowDownLeft className="w-3.5 h-3.5" />
                            <span>Deposit Cash / Crypto</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setIsWithdrawOpen(true)}
                            className="portal-btn-outline !h-9 !px-3.5 text-xs inline-flex items-center gap-1.5 cursor-pointer"
                          >
                            <ArrowUpRight className="w-3.5 h-3.5" />
                            <span>Wire Withdrawal</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setIsTreasuryConverterOpen(true)}
                            className="portal-btn-outline !h-9 !px-3.5 text-xs inline-flex items-center gap-1.5 cursor-pointer"
                          >
                            <ArrowRightLeft className="w-3.5 h-3.5 text-[var(--dash-accent)]" />
                            <span>FX &amp; Crypto Converter</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setActiveTab('properties')}
                            className="portal-btn-outline !h-9 !px-3.5 text-xs inline-flex items-center gap-1.5 cursor-pointer"
                          >
                            <Building2 className="w-3.5 h-3.5 text-[#D8B77C]" />
                            <span>Acquire Landmark Units</span>
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
                        {treasuryAssets.map((asset) => {
                          const rawBal =
                            subBalances[asset] !== undefined
                              ? Number(subBalances[asset])
                              : asset === 'EUR'
                              ? cashBreakdown.available
                              : 0;
                          const isCrypto = asset === 'USDC' || asset === 'USDT' || asset === 'SOL';
                          const decimals = asset === 'SOL' ? 4 : 2;
                          return (
                            <button
                              key={asset}
                              type="button"
                              onClick={() => setIsTreasuryConverterOpen(true)}
                              className="p-3 rounded-xl bg-[var(--dash-inner)] border border-[var(--dash-card-border)] hover:border-[var(--dash-accent)] transition-colors text-left cursor-pointer"
                            >
                              <div className="flex items-center justify-between gap-1">
                                <span className="text-[11px] font-bold font-mono text-[var(--dash-text)]">
                                  {asset}
                                </span>
                                <span className="text-[9px] uppercase text-[var(--dash-text-muted)]">
                                  {isCrypto ? 'Token' : 'Fiat'}
                                </span>
                              </div>
                              <div className="mt-1 text-sm font-bold font-mono tabular-nums text-[var(--dash-text)] truncate">
                                {rawBal.toLocaleString('en-US', {
                                  minimumFractionDigits: decimals,
                                  maximumFractionDigits: decimals,
                                })}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </section>

                    {/* Investor Account & Ownership Lifecycle (Interactive 5-Stage Tracker) */}
                    <section className="space-y-2.5">
                      <ColoredPipeline
                        stages={pipelineStages}
                        progressPercent={summary?.lifecycle?.progressPercent}
                        completedCount={summary?.lifecycle?.completedStages}
                        activeStageId={selectedLifecycleStage?.id}
                        onStageClick={(stage) => setSelectedLifecycleKey(stage.id)}
                      />

                      {selectedLifecycleStage && (
                        <div className="portal-card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                          <div className="space-y-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-bold text-[var(--dash-text)]">
                                Stage {selectedLifecycleStage.stepNumber}: {selectedLifecycleStage.title}
                              </span>
                              <span className="portal-pill ok">{selectedLifecycleStage.status}</span>
                            </div>
                            <p className="text-[var(--dash-text-secondary)]">
                              {selectedLifecycleStage.detailNote || selectedLifecycleStage.description}
                            </p>
                            {selectedLifecycleStage.requirements && selectedLifecycleStage.requirements.length > 0 && (
                              <div className="flex flex-wrap gap-2 pt-0.5">
                                {selectedLifecycleStage.requirements.map((reqText, i) => (
                                  <span
                                    key={i}
                                    className="text-[10.5px] font-mono text-[var(--dash-text-muted)] bg-[var(--dash-inner)] border border-[var(--dash-card-border)] px-2 py-0.5 rounded"
                                  >
                                    {reqText}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                          {selectedLifecycleStage.actionTab && (
                            <button
                              type="button"
                              onClick={() => setActiveTab(selectedLifecycleStage.actionTab!)}
                              className="portal-btn-outline !h-9 !px-3.5 text-xs inline-flex items-center gap-1.5 cursor-pointer shrink-0 self-start sm:self-center"
                            >
                              <span>Open Section</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      )}
                    </section>

                    {/* Historical Portfolio Performance Chart (Real Verified Data Only) */}
                    <PortfolioPerformanceChart
                      historyPoints={summary?.performanceHistory || []}
                      initialValuation={summary?.investedCapital ?? 0}
                      currentValuation={totalNetValuation}
                      totalDividends={rentSummary.collectedTotal ?? 0}
                      onDeposit={() => setIsDepositOpen(true)}
                      onExploreProperties={() => setActiveTab('properties')}
                    />

                    {/* Holdings Empty Prompt or Your Holdings Snapshot */}
                    {investments.length === 0 ? (
                      <section className="rounded-[18px] border border-dashed border-[var(--dash-accent-border)] bg-[var(--dash-card)] p-5 sm:p-6">
                        <h2 className="text-base font-semibold text-[var(--dash-text)]">
                          Make your first investment
                        </h2>
                        <p className="mt-1.5 max-w-lg text-[13px] leading-relaxed text-[var(--dash-text-muted)]">
                          Browse available properties, then fund your wallet when you are ready to get started.
                        </p>
                        <button
                          type="button"
                          onClick={() => setActiveTab('properties')}
                          className="mt-4 h-11 rounded-xl border border-[var(--dash-accent)] px-5 text-sm font-semibold text-[var(--dash-accent)] hover:bg-[var(--dash-highlight)] cursor-pointer transition-colors"
                        >
                          Explore properties <ArrowRight className="ml-1 inline h-4 w-4" />
                        </button>
                      </section>
                    ) : (
                      <section className="space-y-2.5">
                        <div className="flex items-center justify-between gap-2">
                          <h2 className="text-sm font-semibold text-[var(--dash-text)]">Your holdings</h2>
                          <button
                            type="button"
                            onClick={() => setActiveTab('portfolio')}
                            className="text-xs font-semibold text-[var(--dash-accent)] hover:underline cursor-pointer"
                          >
                            View portfolio &rsaquo;
                          </button>
                        </div>
                        <div className="portal-card divide-y divide-[var(--dash-card-border)]">
                          {investments.slice(0, 3).map((inv) => {
                            const valuation = inv.currentValuation || inv.totalAmountInvested;
                            const realized = inv.totalDividendsReceived || 0;
                            return (
                              <button
                                key={inv.id}
                                type="button"
                                onClick={() => onSelectProperty(inv.propertyId)}
                                className="w-full p-4 flex items-center justify-between gap-3 text-left hover:bg-[var(--dash-hover)] transition-colors cursor-pointer"
                              >
                                <div className="min-w-0">
                                  <div className="text-sm font-semibold text-[var(--dash-text)] truncate">
                                    {inv.propertyTitle}
                                  </div>
                                  <div className="text-xs text-[var(--dash-text-muted)] mt-0.5 truncate">
                                    {inv.tokensPurchased} units · {inv.propertyLocation}
                                  </div>
                                </div>
                                <div className="text-right shrink-0">
                                  <div className="text-sm font-semibold tabular-nums text-[var(--dash-text)]">
                                    {formatCurrency(valuation)}
                                  </div>
                                  <div className="text-xs font-semibold tabular-nums text-[var(--dash-positive)]">
                                    +{formatCurrency(realized)} yield
                                  </div>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </section>
                    )}

                    {/* Open for investment — Verified European SPV Offerings */}
                    <section className="space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <h2 className="text-sm font-semibold text-[var(--dash-text)]">
                            Open for investment
                          </h2>
                          <p className="mt-0.5 text-xs text-[var(--dash-text-muted)]">
                            Vetted European SPV opportunities
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setActiveTab('properties')}
                          className="shrink-0 text-xs font-semibold text-[var(--dash-accent)] hover:underline cursor-pointer"
                        >
                          See all &rsaquo;
                        </button>
                      </div>

                      {featuredProperties.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {featuredProperties.map((property) => {
                            const fundedPct =
                              property.totalTokens > 0
                                ? Math.min(
                                    100,
                                    Math.round(
                                      ((property.totalTokens - property.availableTokens) / property.totalTokens) * 100
                                    )
                                  )
                                : 0;

                            return (
                              <div
                                key={property.id}
                                className="portal-card p-4 flex flex-col justify-between gap-3 hover:border-[var(--dash-inner-border)] transition-colors"
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <button
                                    type="button"
                                    onClick={() => onSelectProperty(property.id)}
                                    className="text-left min-w-0 cursor-pointer"
                                  >
                                    <div className="text-sm font-semibold text-[var(--dash-text)] hover:text-[var(--dash-accent)] transition-colors truncate">
                                      {property.title}
                                    </div>
                                    <div className="text-xs text-[var(--dash-text-muted)] mt-0.5 truncate">
                                      {property.location} · {property.type}
                                    </div>
                                  </button>
                                  <span className="portal-pill ok shrink-0 tabular-nums">
                                    {property.estimatedAnnualYield}% yield
                                  </span>
                                </div>

                                <div className="space-y-2">
                                  <div className="portal-bar">
                                    <span style={{ width: `${fundedPct}%` }} />
                                  </div>
                                  <div className="flex items-center justify-between text-xs text-[var(--dash-text-muted)]">
                                    <span className="tabular-nums">{fundedPct}% funded</span>
                                    <div className="flex items-center gap-3">
                                      <span className="tabular-nums">
                                        from {formatCurrency(property.tokenPrice)}/unit
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setBuyModalProperty(property);
                                          setBuyModalMode('purchase');
                                          setIsBuyModalOpen(true);
                                        }}
                                        className="font-semibold text-[var(--dash-accent)] hover:underline cursor-pointer"
                                      >
                                        Invest
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="rounded-[18px] border border-dashed border-[var(--dash-card-border)] px-4 py-6 text-center">
                          <p className="text-sm font-semibold text-[var(--dash-text)]">
                            No properties listed yet
                          </p>
                          <p className="mt-1 text-xs text-[var(--dash-text-muted)]">
                            New investment opportunities will appear here.
                          </p>
                        </div>
                      )}
                    </section>
                  </div>
                );
              })()}

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
              <div className="dashboard-section space-y-5 animate-in fade-in duration-200">
                <div className="dashboard-section-heading">
                  <div>
                    <p className="dashboard-eyebrow">YOUR INVESTMENTS</p>
                    <h2 className="text-xl sm:text-2xl font-bold text-[var(--dash-text)]">Portfolio</h2>
                    <p className="text-xs sm:text-sm text-[var(--dash-text-muted)] mt-1">
                      Current value, property holdings, notarized agreements, and yield performance.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('properties')}
                    className="dashboard-secondary-action cursor-pointer"
                  >
                    Explore properties <ArrowRight className="w-4 h-4" />
                  </button>
                </div>

                {/* Template 2-Col Summary + Analytics Link */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="portal-card p-4">
                    <div className="text-xs text-[var(--dash-text-muted)]">Current value</div>
                    <div className="mt-1 text-2xl font-bold tabular-nums text-[var(--dash-text)]">
                      {formatCurrency(
                        investments.reduce((s, inv) => s + (inv.currentValuation || inv.totalAmountInvested), 0)
                      )}
                    </div>
                  </div>
                  <div className="portal-card p-4">
                    <div className="text-xs text-[var(--dash-text-muted)]">Properties</div>
                    <div className="mt-1 text-2xl font-bold tabular-nums text-[var(--dash-text)]">
                      {investments.length}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveTab('analytics')}
                  className="portal-card w-full p-4 flex items-center justify-between text-left hover:border-[var(--dash-accent)] transition-colors cursor-pointer"
                >
                  <span className="text-sm font-semibold text-[var(--dash-text)]">Portfolio analytics</span>
                  <ChevronRight className="w-4 h-4 text-[var(--dash-text-muted)]" />
                </button>

                <PortfolioOverview
                  investments={investments}
                  onSelectProperty={onSelectProperty}
                  onExploreMore={() => setActiveTab('properties')}
                />

                <section className="portal-card p-4 sm:p-5 space-y-4">
                  <div>
                    <h3 className="text-base font-bold text-[var(--dash-text)]">Property holdings</h3>
                    <p className="text-xs sm:text-sm text-[var(--dash-text-muted)] mt-0.5">
                      Owned SPV units, agreements, maturity timelines, and reinvestment controls.
                    </p>
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
                </section>
              </div>
            )}

            {/* 3. EXPLORE PROPERTIES TAB */}
            {activeTab === 'properties' && (
              <div className="space-y-4 animate-in fade-in duration-200">
                <div className="portal-card p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <p className="dashboard-eyebrow !mb-1">OPPORTUNITIES</p>
                    <h2 className="text-lg sm:text-xl font-bold text-[var(--dash-text)]">
                      Explore Properties
                    </h2>
                    <p className="text-xs text-[var(--dash-text-muted)]">
                      European residential &amp; commercial SPVs starting from €100/unit.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={onExploreProperties}
                    className="dashboard-secondary-action cursor-pointer"
                  >
                    Open Full Catalog <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Search + Filter Chips matching Template explore() */}
                <div className="space-y-3">
                  <div className="relative">
                    <Search className="w-4 h-4 text-[var(--dash-text-muted)] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      value={exploreQuery}
                      onChange={(e) => setExploreQuery(e.target.value)}
                      placeholder="Search properties by name, city, country..."
                      aria-label="Search marketplace properties"
                      className="portal-input pl-10 pr-8"
                    />
                    {exploreQuery && (
                      <button
                        type="button"
                        onClick={() => setExploreQuery('')}
                        aria-label="Clear property filter"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--dash-text-muted)] hover:text-[var(--dash-text)] cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-2 overflow-x-auto pb-1">
                    {exploreCategories.map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setExploreCategory(cat)}
                        className={`portal-chip cursor-pointer ${exploreCategory === cat ? 'on' : ''}`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                {filteredExploreProperties.length === 0 ? (
                  <div className="rounded-[18px] border border-dashed border-[var(--dash-card-border)] p-8 text-center space-y-2">
                    <p className="text-sm font-semibold text-[var(--dash-text)]">No matching properties</p>
                    <p className="text-xs text-[var(--dash-text-muted)]">
                      Adjust your search query or select a different category filter.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setExploreQuery('');
                        setExploreCategory('All');
                      }}
                      className="portal-btn-outline h-9 text-xs mt-2 cursor-pointer"
                    >
                      Reset filters
                    </button>
                  </div>
                ) : (
                  <div className="property-grid">
                    {filteredExploreProperties.map((property) => (
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
                )}
              </div>
            )}

            {/* 4. LEDGER / TRANSACTIONS TAB */}
            {activeTab === 'transactions' && (
              <div className="dashboard-section space-y-4 animate-in fade-in duration-200">
                <div className="dashboard-section-heading">
                  <div>
                    <p className="dashboard-eyebrow">ACCOUNT ACTIVITY</p>
                    <h2 className="text-xl sm:text-2xl font-bold text-[var(--dash-text)]">Ledger</h2>
                    <p className="text-xs sm:text-sm text-[var(--dash-text-muted)] mt-1">
                      Deposits, withdrawals, investments, and monthly distributions.
                    </p>
                  </div>
                </div>
                <TransactionTable transactions={transactions} />
              </div>
            )}

            {/* 4.5 MORE HUB TAB (Matches Template more() view) */}
            {activeTab === 'more' && (
              <div className="space-y-4 max-w-2xl mx-auto animate-in fade-in duration-200">
                <div>
                  <p className="dashboard-eyebrow">PORTAL DIRECTORY</p>
                  <h2 className="text-xl sm:text-2xl font-bold text-[var(--dash-text)]">More</h2>
                  <p className="text-xs text-[var(--dash-text-muted)] mt-0.5">
                    Treasury, analytics, compliance, tax documents, and account settings.
                  </p>
                </div>

                <div className="portal-card divide-y divide-[var(--dash-card-border)]">
                  {[
                    {
                      id: 'wallet',
                      label: 'Wallet & Deposits',
                      sub: `${formatCurrency(user.walletBalance)} available cash`,
                      icon: Wallet,
                    },
                    {
                      id: 'analytics',
                      label: 'Portfolio analytics',
                      sub: 'Projected yield growth & SPV allocation charts',
                      icon: PieChart,
                    },
                    {
                      id: 'distributions',
                      label: 'Distributions',
                      sub: 'Daily accruals & monthly dividend schedule',
                      icon: Coins,
                    },
                    {
                      id: 'documents',
                      label: 'Reports & SPV Documents',
                      sub: 'Share certificates & notarized agreements',
                      icon: FileText,
                    },
                    {
                      id: 'tax_statements',
                      label: 'Tax & Fiscal Reports',
                      sub: 'EU Modelo 210 & annual dividend statements',
                      icon: Award,
                    },
                    {
                      id: 'verification',
                      label: 'Compliance Vault',
                      sub: 'KYC identity & proof of address verification',
                      icon: ShieldCheck,
                      badge: user.kycStatus === 'verified' ? 'Verified' : 'Action',
                      badgeOk: user.kycStatus === 'verified',
                    },
                    {
                      id: 'membership',
                      label: 'Club Privé Membership',
                      sub: 'Off-market dossiers & private investor salons',
                      icon: Crown,
                    },
                    {
                      id: 'referrals',
                      label: 'Referrals',
                      sub: '€500 allocation credit per referred investor',
                      icon: Share2,
                    },
                    {
                      id: 'notifications',
                      label: 'Notifications',
                      sub: 'Account alerts & distribution logs',
                      icon: Bell,
                      badge: unreadCount > 0 ? `${unreadCount} unread` : undefined,
                      badgeOk: false,
                    },
                    {
                      id: 'profile',
                      label: 'Profile & Banking',
                      sub: 'Personal details, SEPA IBAN, and appearance',
                      icon: User,
                    },
                    {
                      id: 'support',
                      label: 'Help & Support',
                      sub: 'Direct advisory desk & support inquiries (info@kretz.site)',
                      icon: HelpCircle,
                    },
                  ].map((item) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setActiveTab(item.id)}
                        className="w-full p-4 flex items-center justify-between gap-3 text-left hover:bg-[var(--dash-hover)] transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-xl bg-[var(--dash-inner)] border border-[var(--dash-card-border)] text-[var(--dash-accent)] flex items-center justify-center shrink-0">
                            <Icon className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <div className="text-sm font-semibold text-[var(--dash-text)]">{item.label}</div>
                            <div className="text-xs text-[var(--dash-text-muted)] truncate">{item.sub}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {item.badge && (
                            <span className={`portal-pill ${item.badgeOk ? 'ok' : 'wait'}`}>{item.badge}</span>
                          )}
                          <ChevronRight className="w-4 h-4 text-[var(--dash-text-muted)]" />
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className="portal-card p-4 flex items-center justify-between gap-3">
                  <div>
                    <div className="text-xs font-semibold text-[var(--dash-text)]">Appearance Mode</div>
                    <div className="text-[11px] text-[var(--dash-text-muted)]">
                      Currently using {dashboardMode === 'dark' ? 'Dark' : 'Light'} theme
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={toggleDashboardMode}
                    className="portal-btn-outline !h-10 text-xs inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    {dashboardMode === 'light' ? (
                      <>
                        <Moon className="w-3.5 h-3.5 text-[var(--dash-accent)]" />
                        <span>Dark mode</span>
                      </>
                    ) : (
                      <>
                        <Sun className="w-3.5 h-3.5 text-[var(--dash-accent)]" />
                        <span>Light mode</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="text-center pt-1">
                  <button
                    type="button"
                    onClick={() => setActiveTab('support')}
                    className="text-xs font-semibold text-[var(--dash-accent)] hover:underline cursor-pointer"
                  >
                    Help &amp; Support Desk (info@kretz.site)
                  </button>
                </div>
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

            {/* 6. WALLET TAB (Template Hero + Bank Link + Recent Activity + Solana + FX Desk) */}
            {activeTab === 'wallet' && (
              <div className="space-y-4 animate-in fade-in duration-200 max-w-5xl mx-auto">
                {/* Template Hero Wallet Card */}
                <div className="portal-card p-5 sm:p-6">
                  <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--dash-text-muted)]">
                    WALLET BALANCE
                  </div>
                  <div className="mt-2 text-[36px] sm:text-[42px] leading-none font-bold tabular-nums text-[var(--dash-text)]">
                    {formatCurrency(user.walletBalance)}
                  </div>
                  <div className="mt-5 grid grid-cols-2 sm:flex sm:items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => setIsDepositOpen(true)}
                      className="portal-btn sm:min-w-[160px] text-sm cursor-pointer"
                    >
                      Deposit
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsWithdrawOpen(true)}
                      className="portal-btn-outline sm:min-w-[160px] text-sm cursor-pointer"
                    >
                      Withdraw
                    </button>
                  </div>
                </div>

                {/* Linked Bank Account & Recent Activity */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="portal-card p-5 flex flex-col justify-between gap-3">
                    <div>
                      <div className="text-xs font-semibold text-[var(--dash-text-muted)]">
                        Linked bank account
                      </div>
                      <div className="mt-1.5 font-mono text-sm font-semibold text-[var(--dash-text)] break-all">
                        {user.bankIban ? user.bankIban : 'No SEPA IBAN configured yet'}
                      </div>
                      <div className="mt-1 text-xs text-[var(--dash-text-muted)]">
                        {user.fullName || 'Account holder'}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveTab('profile')}
                      className="self-start text-xs font-semibold text-[var(--dash-accent)] hover:underline cursor-pointer"
                    >
                      {user.bankIban ? 'Update SEPA IBAN' : 'Add bank account'} &rsaquo;
                    </button>
                  </div>

                  <div className="portal-card p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-[var(--dash-text-muted)]">
                        Recent activity
                      </span>
                      <button
                        type="button"
                        onClick={() => setActiveTab('transactions')}
                        className="text-xs font-semibold text-[var(--dash-accent)] hover:underline cursor-pointer"
                      >
                        See all &rsaquo;
                      </button>
                    </div>
                    {transactions.length === 0 ? (
                      <p className="text-xs text-[var(--dash-text-muted)] py-2">No transactions yet.</p>
                    ) : (
                      <div className="divide-y divide-[var(--dash-card-border)]">
                        {transactions.slice(0, 3).map((tx) => {
                          const isOut = tx.type === 'withdrawal' || tx.type === 'investment';
                          return (
                            <div key={tx.id} className="py-2.5 flex items-center justify-between gap-2 text-xs">
                              <div className="min-w-0">
                                <div className="font-semibold text-[var(--dash-text)] truncate">
                                  {tx.description}
                                </div>
                                <div className="text-[11px] text-[var(--dash-text-muted)]">
                                  {formatDate(tx.createdAt)}
                                </div>
                              </div>
                              <span
                                className={`font-bold font-mono tabular-nums shrink-0 ${
                                  isOut ? 'text-[var(--dash-text)]' : 'text-[var(--dash-positive)]'
                                }`}
                              >
                                {isOut ? '-' : '+'}
                                {formatCurrency(tx.amount, tx.currency)}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* Pending Transactions Section */}
                {transactions.filter((t) => t.status === 'pending').length > 0 && (
                  <div className="portal-card p-4 border-[var(--dash-warm-border)] space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-[var(--dash-warm)]" />
                        <h4 className="text-xs font-bold text-[var(--dash-text)] uppercase tracking-wider">
                          Pending Requests ({transactions.filter((t) => t.status === 'pending').length})
                        </h4>
                      </div>
                      {user?.role === 'admin' && (
                        <a
                          href="/admin#deposits"
                          className="text-xs font-semibold text-[var(--dash-warm)] hover:underline flex items-center gap-1"
                        >
                          Review in Admin <ArrowRight className="w-3 h-3" />
                        </a>
                      )}
                    </div>

                    <div className="space-y-2">
                      {transactions
                        .filter((t) => t.status === 'pending')
                        .map((tx) => (
                          <div
                            key={tx.id}
                            className="p-3 bg-[var(--dash-inner)] rounded-xl border border-[var(--dash-card-border)] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                          >
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-1.5">
                                <span className="portal-pill wait capitalize">{tx.type}</span>
                                <span className="font-mono font-bold text-[var(--dash-text)] text-[11px]">
                                  {tx.reference}
                                </span>
                              </div>
                              <p className="text-[11px] text-[var(--dash-text-muted)]">
                                {tx.paymentMethod} · {formatDate(tx.createdAt)}
                              </p>
                              {tx.metadata?.receiptFileName && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[var(--dash-accent)]">
                                  Attached: {tx.metadata.receiptFileName}
                                </span>
                              )}
                            </div>
                            <div className="text-left sm:text-right">
                              <span className="font-bold font-mono tabular-nums text-[var(--dash-text)] text-xs sm:text-sm block">
                                {formatCurrency(tx.amount)} {tx.currency}
                              </span>
                              <span className="text-[10px] text-[var(--dash-warm)] font-semibold">Under Review</span>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                {/* Multi-Currency & FX Crypto Converter Desk Banner */}
                <div className="portal-card p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[var(--dash-highlight)] border border-[var(--dash-accent-border)] text-[var(--dash-accent)] flex items-center justify-center shrink-0">
                      <RefreshCw className="w-5 h-5" />
                    </div>
                    <div className="text-left">
                      <h3 className="text-xs sm:text-sm font-bold text-[var(--dash-text)]">
                        Multi-Currency &amp; FX Crypto Desk
                      </h3>
                      <p className="text-[11px] text-[var(--dash-text-muted)]">
                        Zero-spread conversions across EUR, USD, GBP, CHF, SOL, USDC, and USDT.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsTreasuryConverterOpen(true)}
                    className="portal-btn !h-10 text-xs shrink-0 cursor-pointer"
                  >
                    Open Treasury Desk
                  </button>
                </div>

                {/* Solana Wallet Manager & BalanceCard Breakdown */}
                <SolanaWalletManager user={user} properties={properties} investments={investments} />

                <BalanceCard
                  user={user}
                  transactions={transactions}
                  onDeposit={() => setIsDepositOpen(true)}
                  onWithdraw={() => setIsWithdrawOpen(true)}
                />
              </div>
            )}

            {/* 6.5 COMPLIANCE VAULT TAB */}
            {activeTab === 'verification' && (
              <div className="animate-in fade-in duration-200">
                <ComplianceVaultSection
                  onNavigateProfile={() => setActiveTab('profile')}
                  onNavigateWallet={() => setActiveTab('wallet')}
                />
              </div>
            )}

            {/* 7. DOCUMENTS / REPORTS TAB */}
            {activeTab === 'documents' && (
              <div className="portal-card p-5 space-y-4 animate-in fade-in duration-200 max-w-4xl mx-auto">
                <div className="pb-3 border-b border-[var(--dash-card-border)] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h2 className="text-base sm:text-lg font-bold text-[var(--dash-text)]">
                      Investment Documents &amp; Agreements
                    </h2>
                    <p className="text-xs text-[var(--dash-text-muted)]">
                      Notarized SPV share certificates, independent appraisals, and subscription deeds.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('tax_statements')}
                    className="text-xs font-semibold text-[var(--dash-accent)] hover:underline cursor-pointer self-start sm:self-auto"
                  >
                    Fiscal &amp; Tax Reports &rarr;
                  </button>
                </div>

                {investments.length === 0 ? (
                  <div className="text-center py-8 text-[var(--dash-text-muted)] space-y-3">
                    <FileText className="w-8 h-8 mx-auto text-[var(--dash-accent)] opacity-70" />
                    <p className="text-xs font-semibold text-[var(--dash-text)]">
                      No investments yet to generate legal documents.
                    </p>
                    <button
                      type="button"
                      onClick={() => setActiveTab('properties')}
                      className="portal-btn h-10 text-xs cursor-pointer"
                    >
                      Explore Properties
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {investments.map((inv) => {
                      const prop = properties.find((p) => p.id === inv.propertyId);
                      return (
                        <div
                          key={inv.id}
                          className="p-3.5 rounded-xl border border-[var(--dash-card-border)] flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[var(--dash-inner)] hover:border-[var(--dash-inner-border)] transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-[var(--dash-highlight)] text-[var(--dash-accent)] border border-[var(--dash-accent-border)] flex items-center justify-center shrink-0">
                              <FileText className="w-4 h-4" />
                            </div>
                            <div>
                              <h4 className="font-bold text-[var(--dash-text)] text-xs sm:text-sm">
                                {inv.propertyTitle || prop?.title || 'Real Estate Asset'}
                              </h4>
                              <p className="text-[11px] text-[var(--dash-text-muted)] mt-0.5">
                                Invested {formatCurrency(inv.totalAmountInvested)} · {inv.tokensPurchased} Units ·{' '}
                                {formatDate(inv.purchasedAt)}
                              </p>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => setSelectedDocInvestment(inv)}
                            className="portal-btn-outline !h-9 !px-3.5 text-xs flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
                          >
                            <FileText className="w-3.5 h-3.5 text-[var(--dash-accent)]" />
                            <span>View SPV Certificate</span>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* 7.5 TAX & FISCAL STATEMENTS TAB */}
            {activeTab === 'tax_statements' && (
              <div className="animate-in fade-in duration-200 max-w-5xl mx-auto">
                <TaxReportGenerator />
              </div>
            )}

            {/* 8. REFERRALS TAB */}
            {activeTab === 'referrals' && (
              <div className="space-y-4 animate-in fade-in duration-200 max-w-5xl mx-auto">
                <div className="portal-card p-5 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[var(--dash-card-border)]">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[var(--dash-highlight)] text-[var(--dash-accent)] border border-[var(--dash-accent-border)] flex items-center justify-center shrink-0">
                        <Share2 className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h2 className="text-base sm:text-lg font-bold text-[var(--dash-text)]">
                            Private Client Referral Program
                          </h2>
                          <span className="portal-pill ok">VIP Allocation</span>
                        </div>
                        <p className="text-xs text-[var(--dash-text-muted)] mt-0.5">
                          Introduce qualified partners. Receive €500 in allocation credit per verified investor.
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowQrModal(true)}
                      className="portal-btn-outline !h-9 !px-3.5 text-xs flex items-center gap-1.5 cursor-pointer shrink-0 self-start sm:self-auto"
                    >
                      <QrCode className="w-3.5 h-3.5 text-[var(--dash-accent)]" />
                      <span>Show QR</span>
                    </button>
                  </div>

                  {inviteSentToast && (
                    <div className="p-2.5 rounded-xl bg-[var(--dash-highlight)] border border-[var(--dash-accent-border)] text-xs font-semibold text-[var(--dash-positive)] flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                      <span>{inviteSentToast}</span>
                    </div>
                  )}

                  {/* Referral Link & Code Box */}
                  <div className="p-4 rounded-2xl bg-[var(--dash-inner)] border border-[var(--dash-card-border)] space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                      <label className="text-xs font-semibold text-[var(--dash-text)] flex items-center gap-1.5">
                        <Globe className="w-3.5 h-3.5 text-[var(--dash-accent)]" />
                        <span>Official Referral Link</span>
                      </label>

                      <div className="flex items-center gap-1.5 text-[10.5px]">
                        <span className="text-[var(--dash-text-muted)]">Destination:</span>
                        <button
                          type="button"
                          onClick={() => setUseCurrentOrigin(false)}
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all cursor-pointer ${
                            !useCurrentOrigin
                              ? 'bg-[var(--dash-accent)] text-[var(--dash-accent-ink)] font-bold'
                              : 'bg-[var(--dash-card)] border border-[var(--dash-card-border)] text-[var(--dash-text-muted)]'
                          }`}
                        >
                          kretzdespain.com
                        </button>
                        <button
                          type="button"
                          onClick={() => setUseCurrentOrigin(true)}
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all cursor-pointer ${
                            useCurrentOrigin
                              ? 'bg-[var(--dash-accent)] text-[var(--dash-accent-ink)] font-bold'
                              : 'bg-[var(--dash-card)] border border-[var(--dash-card-border)] text-[var(--dash-text-muted)]'
                          }`}
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
                          className="portal-input !h-10 pr-14 text-xs font-mono font-semibold select-all"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] uppercase font-bold text-[var(--dash-text-muted)] pointer-events-none">
                          {useCurrentOrigin ? 'TEST' : 'PROD'}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => copyReferral(referralLink)}
                          className="portal-btn !h-10 !px-4 text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{copiedLink ? 'Copied' : 'Copy Link'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={copyReferralCode}
                          className="portal-btn-outline !h-10 !px-3 text-xs flex items-center gap-1.5 cursor-pointer"
                        >
                          {copiedCode ? (
                            <Check className="w-3.5 h-3.5 text-[var(--dash-positive)]" />
                          ) : (
                            <Tag className="w-3.5 h-3.5 text-[var(--dash-accent)]" />
                          )}
                          <span className="font-mono text-xs">{referralCode}</span>
                        </button>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-[var(--dash-card-border)] flex flex-wrap items-center gap-2">
                      <span className="text-[10px] font-bold text-[var(--dash-text-muted)] mr-1">Share:</span>
                      <a
                        href={whatsappShareHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2.5 py-1 rounded-lg bg-[#25D366]/15 hover:bg-[#25D366]/25 text-[#25D366] text-[10.5px] font-semibold flex items-center gap-1"
                      >
                        <MessageCircle className="w-3 h-3" />
                        <span>WhatsApp</span>
                      </a>
                      <a
                        href={telegramShareHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2.5 py-1 rounded-lg bg-[#0088cc]/15 hover:bg-[#0088cc]/25 text-[#0088cc] text-[10.5px] font-semibold flex items-center gap-1"
                      >
                        <Send className="w-3 h-3" />
                        <span>Telegram</span>
                      </a>
                      <a
                        href={mailtoShareHref}
                        className="px-2.5 py-1 rounded-lg bg-[var(--dash-card)] border border-[var(--dash-card-border)] text-[var(--dash-text)] text-[10.5px] font-semibold flex items-center gap-1"
                      >
                        <Mail className="w-3 h-3" />
                        <span>Email</span>
                      </a>
                      <a
                        href={linkedInShareHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2.5 py-1 rounded-lg bg-[#0A66C2]/15 text-[#0A66C2] text-[10.5px] font-semibold"
                      >
                        LinkedIn
                      </a>
                      <a
                        href={twitterShareHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2.5 py-1 rounded-lg bg-[var(--dash-card)] border border-[var(--dash-card-border)] text-[var(--dash-text)] text-[10.5px] font-semibold"
                      >
                        X
                      </a>
                      <button
                        type="button"
                        onClick={shareNative}
                        className="ml-auto px-2.5 py-1 rounded-lg border border-[var(--dash-card-border)] bg-[var(--dash-card)] text-[var(--dash-text)] text-[10.5px] font-semibold flex items-center gap-1 cursor-pointer"
                      >
                        <Share2 className="w-3 h-3 text-[var(--dash-accent)]" />
                        <span>More</span>
                      </button>
                    </div>
                  </div>

                  {/* Direct Invite Form */}
                  <form
                    onSubmit={handleSendInvite}
                    className="p-3.5 rounded-2xl border border-dashed border-[var(--dash-card-border)] bg-[var(--dash-inner)] space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <label
                        htmlFor="referral-invite-email"
                        className="text-xs font-semibold text-[var(--dash-text)] flex items-center gap-1.5"
                      >
                        <Send className="w-3 h-3 text-[var(--dash-accent)]" />
                        <span>Log Associate Invitation</span>
                      </label>
                      <span className="text-[10px] text-[var(--dash-text-muted)]">
                        Track invited partners &amp; allocation eligibility
                      </span>
                    </div>
                    {inviteError && <p className="text-[11px] font-semibold text-[var(--dash-negative)]">{inviteError}</p>}
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
                        className="portal-input !h-10 text-xs flex-1"
                      />
                      <button
                        type="submit"
                        disabled={isSendingInvite}
                        className="portal-btn !h-10 !px-4 text-xs flex items-center gap-1.5 cursor-pointer shrink-0 disabled:opacity-50"
                      >
                        <Send className="w-3 h-3" />
                        <span>{isSendingInvite ? 'Sending...' : 'Send Invite'}</span>
                      </button>
                    </div>
                  </form>
                </div>

                {/* Metrics Row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="portal-card p-4">
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--dash-text-muted)]">
                      Invitations Sent
                    </div>
                    <div className="text-xl font-bold font-mono tabular-nums text-[var(--dash-text)] mt-1">
                      {referralsList.length}
                    </div>
                    <div className="text-[10px] text-[var(--dash-text-muted)] mt-0.5">Tracked peers</div>
                  </div>
                  <div className="portal-card p-4">
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--dash-text-muted)]">
                      Active Investors
                    </div>
                    <div className="text-xl font-bold font-mono tabular-nums text-[var(--dash-positive)] mt-1">
                      {referralsList.filter((r) => r.status === 'funded').length}
                    </div>
                    <div className="text-[10px] text-[var(--dash-positive)] mt-0.5">Funded portfolios</div>
                  </div>
                  <div className="portal-card p-4">
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--dash-text-muted)]">
                      Bonuses Earned
                    </div>
                    <div className="text-xl font-bold font-mono tabular-nums text-[var(--dash-positive)] mt-1">
                      €{referralsList.reduce((acc, r) => acc + r.reward, 0).toFixed(2)}
                    </div>
                    <div className="text-[10px] text-[var(--dash-text-muted)] mt-0.5">Credited to wallet</div>
                  </div>
                  <div className="portal-card p-4">
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--dash-text-muted)]">
                      Bonus Per Investor
                    </div>
                    <div className="text-xl font-bold font-mono tabular-nums text-[var(--dash-text)] mt-1">€500</div>
                    <div className="text-[10px] text-[var(--dash-text-muted)] mt-0.5">Upon 1st allocation</div>
                  </div>
                </div>

                {/* Referral Ledger */}
                <div className="portal-card p-5 space-y-3">
                  <div className="flex items-center justify-between pb-3 border-b border-[var(--dash-card-border)]">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-[var(--dash-accent)]" />
                      <h3 className="text-sm font-bold text-[var(--dash-text)]">Invited Associates</h3>
                    </div>
                    <span className="text-[11px] text-[var(--dash-text-muted)]">{referralsList.length} recorded</span>
                  </div>

                  {referralsList.length === 0 ? (
                    <div className="text-center py-6 text-xs text-[var(--dash-text-muted)]">
                      No invitations dispatched yet. Copy your referral link above to invite colleagues.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-[var(--dash-card-border)] text-[var(--dash-text-muted)] text-[10px] uppercase">
                            <th className="pb-2 font-semibold">Associate Email</th>
                            <th className="pb-2 font-semibold">Date Dispatched</th>
                            <th className="pb-2 font-semibold">Status</th>
                            <th className="pb-2 font-semibold text-right">Bonus Value</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--dash-card-border)]">
                          {referralsList.map((item) => (
                            <tr key={item.id} className="hover:bg-[var(--dash-hover)] transition-colors">
                              <td className="py-2.5 font-medium text-[var(--dash-text)]">{item.email}</td>
                              <td className="py-2.5 text-[var(--dash-text-muted)] text-[11px] font-mono">{item.date}</td>
                              <td className="py-2.5">
                                <span
                                  className={`portal-pill ${item.status === 'funded' ? 'ok' : 'wait'} capitalize`}
                                >
                                  {item.status}
                                </span>
                              </td>
                              <td className="py-2.5 text-right font-bold font-mono text-[var(--dash-positive)]">
                                {item.reward > 0 ? `+€${item.reward.toFixed(2)}` : 'Pending'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Program Guidelines */}
                <div className="portal-card p-5 space-y-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[var(--dash-positive)]" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--dash-text)]">
                      Program Guidelines &amp; Terms
                    </h3>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div className="p-3.5 bg-[var(--dash-inner)] rounded-xl border border-[var(--dash-card-border)] space-y-1.5">
                      <div className="font-semibold text-[var(--dash-text)] text-xs flex items-center gap-1.5">
                        <Gift className="w-3.5 h-3.5 text-[var(--dash-accent)]" />
                        <span>€500 Welcome Allocation</span>
                      </div>
                      <p className="text-[var(--dash-text-muted)] text-[11px] leading-relaxed">
                        Both you and your referred investor receive €500 in credit upon their first funded SPV contract.
                      </p>
                    </div>
                    <div className="p-3.5 bg-[var(--dash-inner)] rounded-xl border border-[var(--dash-card-border)] space-y-1.5">
                      <div className="font-semibold text-[var(--dash-text)] text-xs flex items-center gap-1.5">
                        <TrendingUp className="w-3.5 h-3.5 text-[var(--dash-positive)]" />
                        <span>0.50% Yield Booster</span>
                      </div>
                      <p className="text-[var(--dash-text-muted)] text-[11px] leading-relaxed">
                        Refer partners deploying over €50,000 to earn an ongoing 0.50% yield boost on active holdings.
                      </p>
                    </div>
                    <div className="p-3.5 bg-[var(--dash-inner)] rounded-xl border border-[var(--dash-card-border)] space-y-1.5">
                      <div className="font-semibold text-[var(--dash-text)] text-xs flex items-center gap-1.5">
                        <ShieldCheck className="w-3.5 h-3.5 text-[var(--dash-accent)]" />
                        <span>VIP Notarization Priority</span>
                      </div>
                      <p className="text-[var(--dash-text-muted)] text-[11px] leading-relaxed">
                        Invited peers receive priority notarization queueing and private off-market dossier access.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 9. NOTIFICATIONS TAB */}
            {activeTab === 'notifications' && (
              <div className="space-y-4 animate-in fade-in duration-200 max-w-4xl mx-auto text-left">
                <div className="portal-card p-5 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-[var(--dash-card-border)]">
                    <div>
                      <h2 className="text-base sm:text-lg font-bold text-[var(--dash-text)]">Notifications</h2>
                      <p className="text-xs text-[var(--dash-text-muted)]">
                        Deposit confirmations, withdrawal updates, KYC approvals, and distribution alerts.
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={async () => {
                          const permission = await requestPlatformNotificationPermission();
                          if (permission === 'granted') toast.success('Device notifications enabled.');
                          else if (permission === 'unsupported')
                            toast.info('Device notifications are not supported in this browser.');
                          else toast.info('Device notifications are blocked. Enable them in your browser settings.');
                        }}
                        className="portal-btn-outline !h-8 !px-3 text-xs cursor-pointer"
                      >
                        Enable device alerts
                      </button>
                      <span className="portal-pill ok">{unreadCount} Unread</span>
                      {unreadCount > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            setServerNotifications((prev) =>
                              prev ? prev.map((n) => ({ ...n, read: true })) : prev
                            );
                            ledger.markAllNotificationsAsRead(user.id);
                            userApi.markAllNotificationsRead().catch(() => {});
                            toast.info('All notifications marked as read.');
                          }}
                          className="portal-btn !h-8 !px-3 text-xs cursor-pointer"
                        >
                          Mark all read
                        </button>
                      )}
                    </div>
                  </div>

                  {notifications.length === 0 ? (
                    <div className="text-center py-8 text-[var(--dash-text-muted)] space-y-2">
                      <Bell className="w-8 h-8 mx-auto text-[var(--dash-accent)] opacity-50" />
                      <p className="text-xs font-semibold text-[var(--dash-text)]">No notifications recorded.</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-[var(--dash-card-border)]">
                      {notifications.map((notif) => (
                        <div
                          key={notif.id}
                          className={`py-3.5 px-2 flex items-start gap-3 transition-colors ${
                            notif.read ? 'opacity-80' : ''
                          }`}
                        >
                          <div
                            className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                              notif.read
                                ? 'bg-[var(--dash-inner)] text-[var(--dash-text-muted)] border border-[var(--dash-card-border)]'
                                : 'bg-[var(--dash-accent)] text-[var(--dash-accent-ink)]'
                            }`}
                          >
                            <Bell className="w-4 h-4" />
                          </div>
                          <div className="flex-1 space-y-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2 min-w-0">
                                <h4 className="font-bold text-[var(--dash-text)] text-xs sm:text-sm truncate">
                                  {notif.title}
                                </h4>
                                {!notif.read && (
                                  <span className="w-2 h-2 rounded-full bg-[var(--dash-accent)] shrink-0" />
                                )}
                              </div>
                              <span className="text-[10.5px] text-[var(--dash-text-muted)] font-mono shrink-0">
                                {formatDate(notif.createdAt)}
                              </span>
                            </div>
                            <p className="text-xs text-[var(--dash-text-secondary)] leading-relaxed">{notif.message}</p>

                            <div className="pt-1 flex items-center justify-end gap-1.5">
                              {!notif.read ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setServerNotifications((prev) =>
                                      prev ? prev.map((n) => (n.id === notif.id ? { ...n, read: true } : n)) : prev
                                    );
                                    ledger.markNotificationAsRead(notif.id);
                                    userApi.markNotificationRead(notif.id).catch(() => {});
                                  }}
                                  className="text-[11px] font-semibold text-[var(--dash-accent)] hover:underline cursor-pointer"
                                >
                                  Mark as read
                                </button>
                              ) : (
                                <span className="text-[10px] text-[var(--dash-text-muted)]">Read</span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Persistent Notification Preferences */}
                <div className="portal-card p-5 space-y-3">
                  <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-[var(--dash-card-border)]">
                    <div>
                      <h3 className="text-sm font-bold text-[var(--dash-text)]">Notification Preferences</h3>
                      <p className="text-xs text-[var(--dash-text-muted)]">
                        Choose which live treasury, compliance, and rental events trigger alerts.
                      </p>
                    </div>
                    {isSavingPrefs && <span className="text-[11px] text-[var(--dash-accent)] font-mono">Saving...</span>}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                    {[
                      { key: 'depositAlerts', label: 'Deposit Confirmations', desc: 'SEPA wires & crypto settlement updates' },
                      { key: 'withdrawalUpdates', label: 'Withdrawal Status Updates', desc: 'Wire authorization, approvals & dispatches' },
                      { key: 'kycUpdates', label: 'KYC & Compliance Reviews', desc: 'Identity & document review outcomes' },
                      { key: 'distributionAlerts', label: 'Rental Distribution Events', desc: 'Monthly yield payouts & statements' },
                      { key: 'securityAlerts', label: 'Account Security Events', desc: 'Logins, verification codes & IBAN changes' },
                      { key: 'emailNotifications', label: 'Email Dispatch Mirror', desc: 'Send official receipts to registered email' },
                    ].map((pref) => {
                      const k = pref.key as keyof typeof notificationPrefs;
                      const enabled = Boolean(notificationPrefs[k]);
                      return (
                        <label
                          key={pref.key}
                          className="p-3 rounded-xl bg-[var(--dash-inner)] border border-[var(--dash-card-border)] flex items-center justify-between gap-3 cursor-pointer hover:border-[var(--dash-accent-border)] transition-colors"
                        >
                          <div className="min-w-0">
                            <div className="font-semibold text-[var(--dash-text)]">{pref.label}</div>
                            <div className="text-[10.5px] text-[var(--dash-text-muted)]">{pref.desc}</div>
                          </div>
                          <input
                            type="checkbox"
                            checked={enabled}
                            disabled={isSavingPrefs}
                            onChange={async (e) => {
                              const nextVal = e.target.checked;
                              const nextPrefs = { ...notificationPrefs, [k]: nextVal };
                              setNotificationPrefs(nextPrefs);
                              setIsSavingPrefs(true);
                              try {
                                await userApi.savePreferences(nextPrefs);
                                toast.success('Notification preferences updated.');
                              } catch (err: any) {
                                setNotificationPrefs(notificationPrefs);
                                toast.error(err?.message || 'Unable to save preference right now.');
                              } finally {
                                setIsSavingPrefs(false);
                              }
                            }}
                            className="w-4 h-4 accent-[#6FD8B0] cursor-pointer shrink-0"
                          />
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* 9.5 CLUB PRIVÉ MEMBERSHIP TAB */}
            {activeTab === 'membership' && (
              <div className="space-y-6 animate-in fade-in duration-200 max-w-4xl mx-auto">
                <div className="portal-card p-5 sm:p-7">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[var(--dash-card-border)]">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[var(--dash-inner)] text-[#C5A880] border border-[#C5A880]/30 flex items-center justify-center shrink-0">
                        <Crown className="w-5 h-5 text-[#C5A880]" />
                      </div>
                      <div>
                        <h2 className="text-base sm:text-lg font-bold text-[var(--dash-text)] flex items-center gap-2">
                          <span>L&apos;Agence Club Privé</span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#C5A880]/20 text-[#C5A880] uppercase">
                            VIP Member Tier
                          </span>
                        </h2>
                        <p className="text-xs text-[var(--dash-text-muted)]">
                          Exclusive off-market dossiers, private investor salons in Madrid &amp; Paris, and concierge.
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => navigateTo('/club')}
                      className="px-4 py-2 rounded-xl bg-[#C5A880] hover:bg-[#B39369] text-[#07231A] text-xs font-bold transition-all cursor-pointer shrink-0"
                    >
                      Explore All Privileges &rarr;
                    </button>
                  </div>

                  <div className="pt-6">
                    {userMembership ? (
                      <UserMembershipCard
                        membership={userMembership}
                        tiers={membershipTiers}
                        onRefresh={() => {
                          setUserMembership(ledger.getUserMembership(user.id));
                          setMembershipTiers(ledger.getMembershipTiers());
                        }}
                        onUpgradeClick={() => setIsMembershipModalOpen(true)}
                      />
                    ) : (
                      <div className="text-center py-8 space-y-4">
                        <div className="w-16 h-16 rounded-2xl bg-[#C5A880]/10 border border-[#C5A880]/30 text-[#C5A880] mx-auto flex items-center justify-center">
                          <Crown className="w-8 h-8" />
                        </div>
                        <div className="space-y-1 max-w-md mx-auto">
                          <h3 className="text-lg font-bold text-[var(--dash-text)]">No Active Club Membership</h3>
                          <p className="text-xs text-[var(--dash-text-muted)] leading-relaxed">
                            Upgrade your investor account with a Club Privé subscription to access off-market property dossiers and invitations to private estate receptions.
                          </p>
                        </div>
                        <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
                          <button
                            type="button"
                            onClick={() => setIsMembershipModalOpen(true)}
                            className="px-5 py-2.5 rounded-xl bg-[#C5A880] hover:bg-[#B39369] text-[#07231A] text-xs font-bold cursor-pointer transition-all"
                          >
                            Apply for Club Membership
                          </button>
                          <button
                            type="button"
                            onClick={() => navigateTo('/club')}
                            className="portal-btn-outline !h-10 text-xs cursor-pointer"
                          >
                            View Tier Comparison
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <MembershipApplicationModal
                  isOpen={isMembershipModalOpen}
                  tiers={membershipTiers}
                  onClose={() => setIsMembershipModalOpen(false)}
                  onSuccess={(newMem) => {
                    setUserMembership(newMem);
                    setIsMembershipModalOpen(false);
                    toast.success(`Welcome to Club Privé! Membership pass #${newMem.memberNumber} activated.`);
                  }}
                />
              </div>
            )}

            {/* 10. PROFILE & BANKING TAB */}
            {activeTab === 'profile' && (
              <div className="animate-in fade-in duration-200 max-w-4xl mx-auto">
                <ProfilePage />
              </div>
            )}

            {/* 11. HELP & SUPPORT TAB */}
            {activeTab === 'support' && (
              <div className="portal-card p-5 space-y-4 animate-in fade-in duration-200 max-w-4xl mx-auto">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[var(--dash-card-border)]">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-[var(--dash-highlight)] text-[var(--dash-accent)] border border-[var(--dash-accent-border)] flex items-center justify-center shrink-0">
                      <HelpCircle className="w-4 h-4" />
                    </div>
                    <div>
                      <h2 className="text-sm sm:text-base font-bold text-[var(--dash-text)]">
                        Investor Support Desk
                      </h2>
                      <p className="text-xs text-[var(--dash-text-muted)]">
                        Direct Counsel &amp; Concierge · <strong className="text-[var(--dash-text)]">info@kretz.site</strong>
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      supportSubjectRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      setTimeout(() => supportSubjectRef.current?.focus(), 200);
                    }}
                    className="portal-btn !h-10 !px-4 text-xs flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>Start Support Inquiry</span>
                  </button>
                </div>

                <div className="space-y-3 text-xs text-left">
                  <div className="p-4 rounded-2xl bg-[var(--dash-inner)] border border-[var(--dash-card-border)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-[var(--dash-accent)]" />
                        <h3 className="font-semibold text-xs text-[var(--dash-text)]">
                          Dedicated Advisory Support
                        </h3>
                      </div>
                      <p className="text-[11px] text-[var(--dash-text-muted)]">
                        Senior real estate advisors on standby. Direct dispatch to{' '}
                        <strong className="text-[var(--dash-text)]">info@kretz.site</strong>.
                      </p>
                    </div>
                    <a
                      href="mailto:info@kretz.site"
                      className="portal-btn-outline !h-9 !px-3.5 text-xs flex items-center whitespace-nowrap cursor-pointer shrink-0"
                    >
                      info@kretz.site
                    </a>
                  </div>

                  <div className="p-4 rounded-2xl bg-[var(--dash-inner)] border border-[var(--dash-card-border)] space-y-2">
                    <h3 className="font-bold text-[var(--dash-text)] text-xs">Frequently Asked Questions</h3>
                    <ul className="space-y-1.5 text-[11px] text-[var(--dash-text-secondary)]">
                      <li>
                        • <strong className="text-[var(--dash-text)]">When are dividends paid?</strong> Rental yields
                        credit to your available balance on the 1st of every month.
                      </li>
                      <li>
                        • <strong className="text-[var(--dash-text)]">How do I withdraw?</strong> Open Wallet &amp;
                        Deposits and tap Withdraw. SEPA transfers settle in 1–2 banking days.
                      </li>
                      <li>
                        • <strong className="text-[var(--dash-text)]">What is the minimum investment?</strong> Property
                        shares start from €100 depending on SPV tier.
                      </li>
                    </ul>
                  </div>

                  <div className="p-4 rounded-2xl border border-[var(--dash-card-border)] bg-[var(--dash-inner)] space-y-3">
                    <h3 className="font-bold text-[var(--dash-text)] text-xs">Direct Support Inquiry</h3>

                    {supportFeedback && (
                      <div className="p-3 rounded-xl bg-[var(--dash-highlight)] border border-[var(--dash-accent-border)] text-[var(--dash-positive)] text-xs font-semibold flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                          <span>{supportFeedback}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setSupportFeedback(null)}
                          className="text-[var(--dash-text-muted)] hover:text-[var(--dash-text)] cursor-pointer"
                          aria-label="Dismiss support message"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}

                    {supportError && (
                      <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-[var(--dash-negative)] text-xs font-semibold flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                          <span>{supportError}</span>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => handleSupportSubmit(e as any)}
                          disabled={isSubmittingSupport}
                          className="px-2.5 py-1 rounded-lg bg-rose-500 text-white text-[10.5px] font-bold cursor-pointer shrink-0"
                        >
                          Retry
                        </button>
                      </div>
                    )}

                    <form onSubmit={handleSupportSubmit} className="space-y-3">
                      <div>
                        <label
                          htmlFor="support-subject-input"
                          className="block text-[11px] font-semibold text-[var(--dash-text)] mb-1"
                        >
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
                          className="portal-input text-xs"
                        />
                      </div>
                      <div>
                        <label
                          htmlFor="support-details-input"
                          className="block text-[11px] font-semibold text-[var(--dash-text)] mb-1"
                        >
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
                          className="w-full p-3 rounded-xl bg-[var(--dash-card)] border border-[var(--dash-card-border)] text-xs text-[var(--dash-text)] placeholder:text-[var(--dash-text-muted)] focus:outline-none focus:border-[var(--dash-accent)] transition-colors"
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={isSubmittingSupport}
                        className="portal-btn !h-10 text-xs inline-flex items-center gap-2 cursor-pointer disabled:opacity-55"
                      >
                        {isSubmittingSupport ? (
                          <ButtonLoader text="Submitting Inquiry..." />
                        ) : (
                          <>
                            <Send className="w-3.5 h-3.5" />
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

      {/* Mobile Bottom Navigation Bar — Exact 5-Tab L'Agence Template Layout */}
      <nav aria-label="Primary mobile dashboard navigation" className="mobile-bottom-nav md:hidden">
        {[
          { id: 'overview', label: 'Overview', icon: LayoutDashboard },
          { id: 'portfolio', label: 'Portfolio', icon: Building2 },
          { id: 'properties', label: 'Explore', icon: TrendingUp },
          { id: 'transactions', label: 'Ledger', icon: History },
          { id: 'more', label: 'More', icon: LayoutGrid },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive =
            activeTab === tab.id ||
            (tab.id === 'properties' && activeTab === 'explore') ||
            (tab.id === 'more' && !PRIMARY_TABS.has(activeTab));
          return (
            <button
              key={tab.id}
              type="button"
              aria-current={isActive ? 'page' : undefined}
              onClick={() => setActiveTab(tab.id)}
              className="flex-1 flex flex-col items-center justify-center py-1 px-1 min-h-[46px] transition-colors cursor-pointer select-none"
            >
              <Icon className="w-5 h-5 mb-1" />
              <span className="text-[11px] tracking-tight truncate leading-none">{tab.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Deposit Modal */}
      <ManualDepositModal
        isOpen={isDepositOpen}
        onClose={() => setIsDepositOpen(false)}
        onSuccess={async () => {
          await Promise.all([refreshUser(), hydrateLiveDashboard(true)]);
        }}
        onNavigateTransactions={() => setActiveTab('transactions')}
        onNavigateCompliance={() => setActiveTab('verification')}
        isVerified={user.kycStatus === 'verified'}
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

      {/* Property Brochure Viewer */}
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
          onSuccess={async () => {
            await Promise.all([refreshUser(), hydrateLiveDashboard(true)]);
          }}
          onOpenDeposit={() => {
            setIsBuyModalOpen(false);
            setActiveTab('wallet');
            setIsDepositOpen(true);
          }}
        />
      )}

      {/* Referral QR Sharing Modal */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="portal-card max-w-sm w-full p-5 text-center relative space-y-3">
            <button
              type="button"
              onClick={() => setShowQrModal(false)}
              className="absolute top-3 right-3 p-1.5 rounded-lg text-[var(--dash-text-muted)] hover:text-[var(--dash-text)] cursor-pointer"
              aria-label="Close QR code modal"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="mx-auto w-10 h-10 rounded-xl bg-[var(--dash-highlight)] text-[var(--dash-accent)] border border-[var(--dash-accent-border)] flex items-center justify-center">
              <QrCode className="w-5 h-5" />
            </div>

            <div>
              <span className="portal-pill ok">L&apos;Agence Private Invitation</span>
              <h3 className="text-base font-bold text-[var(--dash-text)] mt-2">
                Scan to Join &amp; Claim €500
              </h3>
              <p className="text-xs text-[var(--dash-text-muted)] mt-0.5">
                Scan with any smartphone camera to open your private registration invitation.
              </p>
            </div>

            <div className="p-3 bg-white rounded-xl border border-[var(--dash-card-border)] inline-block">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
                  referralLink
                )}&color=07231A`}
                alt="Referral QR Code"
                className="w-36 h-36 mx-auto rounded-lg object-contain"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
              <div className="mt-1.5 text-[11px] font-mono font-bold text-[#07231A]">CODE: {referralCode}</div>
            </div>

            <div className="p-2 rounded-lg bg-[var(--dash-inner)] border border-[var(--dash-card-border)] text-[10px] text-[var(--dash-text-muted)] font-mono truncate">
              {referralLink}
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => copyReferral(referralLink)}
                className="flex-1 portal-btn !h-10 text-xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedLink ? 'Link Copied' : 'Copy Link'}</span>
              </button>
              <button
                type="button"
                onClick={() => setShowQrModal(false)}
                className="portal-btn-outline !h-10 text-xs cursor-pointer"
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
          onSuccessConversion={async () => {
            await Promise.all([refreshUser(), hydrateLiveDashboard(true)]);
          }}
          onOpenDeposit={() => {
            setIsTreasuryConverterOpen(false);
            setActiveTab('wallet');
            setIsDepositOpen(true);
          }}
        />
      )}

      {/* First-Time Investor Onboarding Modal */}
      <FirstTimeOnboardingModal
        user={user}
        isOpen={isOnboardingOpen}
        onClose={() => setIsOnboardingOpen(false)}
        onExploreProperties={() => setActiveTab('properties')}
        onOpenDeposit={() => {
          setActiveTab('wallet');
          setIsDepositOpen(true);
        }}
        onOpenVerification={() => setActiveTab('verification')}
      />
    </div>
  );
};
