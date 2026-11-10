import React, { useState, useEffect, useRef } from 'react';
import {
  LayoutDashboard, Store, Building2, ArrowLeftRight, TrendingUp,
  FileText, Settings, LifeBuoy, Search, Bell, Sun, Moon, Menu, X,
  ChevronLeft, ChevronRight, CheckCircle2, Clock, Wallet, AlertCircle,
  LogOut, User as UserIcon, AlertTriangle, ShieldCheck, Copy, ExternalLink, RefreshCw, Layers,
  ArrowDownToLine, ArrowUpFromLine
} from 'lucide-react';
import { useFintechTheme } from './FintechThemeContext';
import { User } from '../../types/user';
import { useAuth } from '../../lib/auth';
import { useToast } from '../../context/ToastContext';
import { formatCurrency } from '../../lib/utils';

export interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  badge?: string;
  category?: 'main' | 'secondary' | 'wallet';
}

export const MAIN_NAV_ITEMS: NavItem[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard, category: 'main' },
  { id: 'marketplace', label: 'Marketplace', icon: Store, category: 'main' },
  { id: 'my-properties', label: 'My Properties', icon: Building2, category: 'main' },
  { id: 'transactions', label: 'Transactions', icon: ArrowLeftRight, badge: '2', category: 'main' },
  { id: 'income', label: 'Income', icon: TrendingUp, category: 'main' },
];

export const WALLET_NAV_ITEMS: NavItem[] = [
  { id: 'deposit', label: 'Deposit', icon: ArrowDownToLine, category: 'wallet' },
  { id: 'withdraw', label: 'Withdraw', icon: ArrowUpFromLine, category: 'wallet' },
];

export const SECONDARY_NAV_ITEMS: NavItem[] = [
  { id: 'documents', label: 'Documents', icon: FileText, badge: 'New', category: 'secondary' },
  { id: 'settings', label: 'Settings', icon: Settings, category: 'secondary' },
  { id: 'support', label: 'Help & Support', icon: LifeBuoy, category: 'secondary' },
];

interface FintechShellProps {
  activeTab: string;
  onNavigateTab: (tabId: string) => void;
  onOpenCommandPalette: () => void;
  onOpenKyc: () => void;
  children: React.ReactNode;
}

export const FintechShell: React.FC<FintechShellProps> = ({
  activeTab,
  onNavigateTab,
  onOpenCommandPalette,
  onOpenKyc,
  children,
}) => {
  const { theme, toggleTheme } = useFintechTheme();
  const { user, logout } = useAuth();
  const toast = useToast();

  // Sidebar collapse persistence in localStorage
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
    try {
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('fintech_sidebar_collapsed');
        if (saved !== null) return saved === 'true';
      }
    } catch {}
    return false;
  });

  useEffect(() => {
    try {
      localStorage.setItem('fintech_sidebar_collapsed', String(sidebarCollapsed));
    } catch {}
  }, [sidebarCollapsed]);

  // Mobile drawer state
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  // Dropdown states
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notificationTab, setNotificationTab] = useState<'all' | 'payouts' | 'account'>('all');
  const [walletDropdownOpen, setWalletDropdownOpen] = useState(false);
  const [avatarMenuOpen, setAvatarMenuOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);

  // Wallet connection state
  const [isWalletConnected, setIsWalletConnected] = useState(true);
  const [network, setNetwork] = useState<string>('BEP-20');

  // Refs for outside click closing
  const notificationsRef = useRef<HTMLDivElement>(null);
  const walletRef = useRef<HTMLDivElement>(null);
  const avatarRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click or Esc
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (notificationsRef.current && !notificationsRef.current.contains(e.target as Node)) {
        setNotificationsOpen(false);
      }
      if (walletRef.current && !walletRef.current.contains(e.target as Node)) {
        setWalletDropdownOpen(false);
      }
      if (avatarRef.current && !avatarRef.current.contains(e.target as Node)) {
        setAvatarMenuOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setNotificationsOpen(false);
        setWalletDropdownOpen(false);
        setAvatarMenuOpen(false);
        setMobileDrawerOpen(false);
        setMobileSearchOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const isVerified = user?.kycStatus === 'verified';
  const isKycPending = user?.kycStatus === 'pending';
  const walletAddress = user?.cryptoDepositAddress || '0x71C8135C0e41B3fA128912389128f9A19b28A0bf';
  const shortWallet = `${walletAddress.slice(0, 4)}…${walletAddress.slice(-4)}`;

  const notifications = [
    { id: 1, title: 'Yield Distributed', desc: '+€412.50 credited from Neuilly Mansion', time: '2 hours ago', type: 'payouts', unread: true },
    { id: 2, title: 'Quarterly Valuation Up', desc: 'Saint-Tropez estate assessed +3.2% higher', time: '1 day ago', type: 'payouts', unread: true },
    { id: 3, title: 'Identity Verified', desc: 'MiFID II accreditation completed', time: '3 days ago', type: 'account', unread: false },
  ];

  const filteredNotifications = notifications.filter((n) => {
    if (notificationTab === 'payouts') return n.type === 'payouts';
    if (notificationTab === 'account') return n.type === 'account';
    return true;
  });

  const getBreadcrumbTitle = () => {
    switch (activeTab) {
      case 'overview': return 'Portfolio / Overview';
      case 'marketplace': return 'Marketplace / Tokenized Assets';
      case 'my-properties': return 'Portfolio / My Properties';
      case 'transactions': return 'Settlements / Transactions';
      case 'income': return 'Yield / Income Analytics';
      case 'deposit': return 'Wallet / Deposit Capital';
      case 'withdraw': return 'Wallet / Withdraw Capital';
      case 'documents': return 'Vault / Documents';
      case 'settings': return 'Account / Settings';
      case 'support': return 'Support / Help Center';
      default: return 'Dashboard';
    }
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#F8FAFC] dark:bg-[#0B1220] text-[#0F172A] dark:text-[#E2E8F0] font-sans transition-colors duration-150">
      {/* ========================================================================= */}
      {/* DESKTOP & MOBILE SIDEBAR NAV (240px / 72px Collapsed)                      */}
      {/* ========================================================================= */}
      <aside
        className={`hidden md:flex flex-col border-r border-[#E2E8F0] dark:border-[#1E293B] bg-white dark:bg-[#111A2C] transition-all duration-200 shrink-0 z-30 ${
          sidebarCollapsed ? 'w-[72px]' : 'w-[240px]'
        }`}
      >
        {/* Top Logo */}
        <div className="h-[64px] flex items-center justify-between px-4 border-b border-[#E2E8F0] dark:border-[#1E293B]">
          {!sidebarCollapsed ? (
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-[8px] bg-[#0F4C81] text-white flex items-center justify-center font-bold text-[15px] tracking-tight shrink-0 shadow-xs">
                K
              </div>
              <div className="font-semibold text-[16px] tracking-tight text-[#0F172A] dark:text-[#E2E8F0] truncate">
                Rental.krez
              </div>
            </div>
          ) : (
            <div className="w-8 h-8 mx-auto rounded-[8px] bg-[#0F4C81] text-white flex items-center justify-center font-bold text-[15px] shrink-0">
              K
            </div>
          )}

          <button
            type="button"
            aria-label="Toggle Sidebar"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="p-1.5 rounded-[6px] text-[#64748B] dark:text-[#94A3B8] hover:bg-[#F8FAFC] dark:hover:bg-[#1E293B] hover:text-[#0F172A] dark:hover:text-[#E2E8F0] transition-colors focus:outline-none focus:ring-2 focus:ring-[#0F4C81]"
            title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {sidebarCollapsed ? (
              <ChevronRight className="w-4 h-4" strokeWidth={1.5} />
            ) : (
              <ChevronLeft className="w-4 h-4" strokeWidth={1.5} />
            )}
          </button>
        </div>

        {/* Main Nav Items */}
        <nav className="flex-1 py-4 px-2 space-y-6 overflow-y-auto">
          <div className="space-y-1">
            {MAIN_NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onNavigateTab(item.id)}
                  title={sidebarCollapsed ? item.label : undefined}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-[8px] text-[14px] font-medium transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#0F4C81] ${
                    isActive
                      ? 'bg-[#0F4C81]/10 dark:bg-[#14B8A6]/10 text-[#0F4C81] dark:text-[#14B8A6] font-semibold border-l-[3px] border-[#0F4C81] dark:border-[#14B8A6]'
                      : 'text-[#64748B] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-[#E2E8F0] hover:bg-[#F8FAFC] dark:hover:bg-[#1E293B]/40'
                  } ${sidebarCollapsed ? 'justify-center px-0' : ''}`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Icon className="w-[18px] h-[18px] shrink-0" strokeWidth={1.5} />
                    {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
                  </div>
                  {!sidebarCollapsed && item.badge && (
                    <span
                      className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                        item.badge === 'New'
                          ? 'bg-[#14B8A6]/15 text-[#14B8A6]'
                          : 'bg-[#0F4C81]/15 text-[#0F4C81] dark:text-[#14B8A6]'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Wallet Nav Group */}
          <div className="space-y-1 pt-4 border-t border-[#E2E8F0] dark:border-[#1E293B]">
            {!sidebarCollapsed && (
              <div className="px-3 pb-1 text-[11px] font-bold uppercase tracking-wider text-[#64748B] dark:text-[#94A3B8]">
                Wallet
              </div>
            )}
            {WALLET_NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onNavigateTab(item.id)}
                  title={sidebarCollapsed ? item.label : undefined}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-[8px] text-[14px] font-medium transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#0F4C81] ${
                    isActive
                      ? 'bg-[#0F4C81]/10 dark:bg-[#14B8A6]/10 text-[#0F4C81] dark:text-[#14B8A6] font-semibold border-l-[3px] border-[#0F4C81] dark:border-[#14B8A6]'
                      : 'text-[#64748B] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-[#E2E8F0] hover:bg-[#F8FAFC] dark:hover:bg-[#1E293B]/40'
                  } ${sidebarCollapsed ? 'justify-center px-0' : ''}`}
                >
                  <Icon className="w-[18px] h-[18px] shrink-0" strokeWidth={1.5} />
                  {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
                </button>
              );
            })}
          </div>

          {/* Secondary Items */}
          <div className="space-y-1 pt-4 border-t border-[#E2E8F0] dark:border-[#1E293B]">
            {!sidebarCollapsed && (
              <div className="px-3 pb-1 text-[11px] font-bold uppercase tracking-wider text-[#64748B] dark:text-[#94A3B8]">
                Preferences
              </div>
            )}
            {SECONDARY_NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onNavigateTab(item.id)}
                  title={sidebarCollapsed ? item.label : undefined}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-[8px] text-[14px] font-medium transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#0F4C81] ${
                    isActive
                      ? 'bg-[#0F4C81]/10 dark:bg-[#14B8A6]/10 text-[#0F4C81] dark:text-[#14B8A6] font-semibold border-l-[3px] border-[#0F4C81] dark:border-[#14B8A6]'
                      : 'text-[#64748B] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-[#E2E8F0] hover:bg-[#F8FAFC] dark:hover:bg-[#1E293B]/40'
                  } ${sidebarCollapsed ? 'justify-center px-0' : ''}`}
                >
                  <Icon className="w-[18px] h-[18px] shrink-0" strokeWidth={1.5} />
                  {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
                </button>
              );
            })}
          </div>
        </nav>

        {/* Bottom Card / KYC Prompt */}
        {!sidebarCollapsed && (
          <div className="p-3 border-t border-[#E2E8F0] dark:border-[#1E293B] space-y-2">
            {/* Compact portfolio mini-card */}
            <div className="p-3 rounded-[8px] bg-[#F8FAFC] dark:bg-[#0B1220] border border-[#E2E8F0] dark:border-[#1E293B]">
              <div className="text-[11px] text-[#64748B] dark:text-[#94A3B8] font-medium">Portfolio Value</div>
              <div className="flex items-baseline justify-between mt-0.5">
                <span className="text-[14px] font-bold tabular-nums text-[#0F172A] dark:text-[#E2E8F0]">
                  €128,450
                </span>
                <span className="text-[11px] font-semibold text-[#16A34A] tabular-nums">+8.4%</span>
              </div>
            </div>

            {/* KYC Progress Prompt if incomplete */}
            {!isVerified && (
              <button
                type="button"
                onClick={onOpenKyc}
                className="w-full text-left p-2.5 rounded-[8px] bg-[#F59E0B]/10 border border-[#F59E0B]/30 hover:bg-[#F59E0B]/20 transition-colors cursor-pointer"
              >
                <div className="flex items-center justify-between text-[11px] font-semibold text-[#F59E0B]">
                  <span>KYC Accreditation</span>
                  <span>2 of 5 done</span>
                </div>
                <div className="w-full bg-[#E2E8F0] dark:bg-[#1E293B] h-1 rounded-full mt-1.5 overflow-hidden">
                  <div className="bg-[#F59E0B] h-full w-[40%]" />
                </div>
              </button>
            )}

            {/* Log Out */}
            <button
              type="button"
              onClick={() => logout()}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-[8px] border border-[#E2E8F0] dark:border-[#1E293B] text-[12px] font-semibold text-[#DC2626] hover:bg-[#DC2626]/10 transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" /> Sign Out
            </button>
          </div>
        )}
      </aside>

      {/* ========================================================================= */}
      {/* MOBILE DRAWER OVERLAY (SLIDE-IN)                                          */}
      {/* ========================================================================= */}
      {mobileDrawerOpen && (
        <div
          className="md:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex"
          onClick={() => setMobileDrawerOpen(false)}
        >
          <div
            className="w-[280px] bg-white dark:bg-[#111A2C] h-full flex flex-col p-4 space-y-4 shadow-2xl border-r border-[#E2E8F0] dark:border-[#1E293B]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0] dark:border-[#1E293B]">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-[6px] bg-[#0F4C81] text-white flex items-center justify-center font-bold text-[14px]">
                  K
                </div>
                <span className="font-semibold text-[16px]">Rental.krez</span>
              </div>
              <button
                type="button"
                aria-label="Close Mobile Drawer"
                onClick={() => setMobileDrawerOpen(false)}
                className="p-1 rounded text-[#64748B]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <nav className="flex-1 space-y-1 overflow-y-auto">
              {[...MAIN_NAV_ITEMS, ...WALLET_NAV_ITEMS, ...SECONDARY_NAV_ITEMS].map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      onNavigateTab(item.id);
                      setMobileDrawerOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-[8px] text-[14px] font-medium transition-colors ${
                      isActive
                        ? 'bg-[#0F4C81]/10 text-[#0F4C81] dark:text-[#14B8A6] font-semibold'
                        : 'text-[#64748B] dark:text-[#94A3B8] hover:bg-[#F8FAFC]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="w-4 h-4" />
                      <span>{item.label}</span>
                    </div>
                    {item.badge && (
                      <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-[#0F4C81]/10 text-[#0F4C81]">
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>

            <button
              type="button"
              onClick={() => logout()}
              className="w-full py-2 rounded-[8px] bg-[#DC2626]/10 text-[#DC2626] font-semibold text-[13px] flex items-center justify-center gap-2"
            >
              <LogOut className="w-4 h-4" /> Sign Out
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MAIN CONTAINER AREA                                                       */}
      {/* ========================================================================= */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Sticky 64px Header Bar */}
        <header className="h-[64px] sticky top-0 z-20 px-3 md:px-6 border-b border-[#E2E8F0] dark:border-[#1E293B] bg-white/80 dark:bg-[#111A2C]/80 backdrop-blur-md flex items-center justify-between gap-3">
          {/* LEFT: Hamburger + Logo + Breadcrumb */}
          <div className="flex items-center gap-3 shrink-0">
            {/* ☰ Hamburger Button (40px) */}
            <button
              type="button"
              aria-label="Toggle Navigation"
              onClick={() => {
                if (window.innerWidth < 768) {
                  setMobileDrawerOpen(true);
                } else {
                  setSidebarCollapsed(!sidebarCollapsed);
                }
              }}
              className="w-10 h-10 rounded-[8px] border border-[#E2E8F0] dark:border-[#1E293B] bg-white dark:bg-[#111A2C] hover:bg-[#F8FAFC] dark:hover:bg-[#1E293B] flex items-center justify-center text-[#0F172A] dark:text-[#E2E8F0] transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#0F4C81]"
            >
              <Menu className="w-5 h-5" strokeWidth={1.5} />
            </button>

            {/* Logo + Product Name */}
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-[6px] bg-[#0F4C81] text-white flex items-center justify-center font-bold text-[14px]">
                K
              </div>
              <span className="hidden sm:inline font-semibold text-[15px] tracking-tight text-[#0F172A] dark:text-[#E2E8F0]">
                Rental.krez
              </span>
            </div>

            {/* Desktop Breadcrumb / Page Title */}
            <div className="hidden lg:flex items-center gap-1.5 pl-3 border-l border-[#E2E8F0] dark:border-[#1E293B] text-[13px] font-medium text-[#64748B] dark:text-[#94A3B8]">
              <span>{getBreadcrumbTitle()}</span>
            </div>
          </div>

          {/* CENTER: Global Search (max-w 420px) */}
          <div className="flex-1 max-w-[420px] mx-auto hidden sm:block">
            <button
              type="button"
              onClick={onOpenCommandPalette}
              className="w-full flex items-center gap-2 px-3.5 py-2 rounded-[8px] border border-[#E2E8F0] dark:border-[#1E293B] bg-[#F8FAFC] dark:bg-[#0B1220] text-[#64748B] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-[#E2E8F0] text-[13px] transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#0F4C81]"
            >
              <Search className="w-4 h-4 shrink-0" strokeWidth={1.5} />
              <span className="truncate">Search properties, transactions, documents…</span>
              <kbd className="ml-auto px-1.5 py-0.5 rounded bg-white dark:bg-[#111A2C] border border-[#E2E8F0] dark:border-[#1E293B] text-[10px] font-mono">
                ⌘K
              </kbd>
            </button>
          </div>

          {/* Mobile Search Trigger Icon */}
          <button
            type="button"
            aria-label="Open Search"
            onClick={() => setMobileSearchOpen(true)}
            className="sm:hidden p-2 rounded-[8px] border border-[#E2E8F0] dark:border-[#1E293B] text-[#64748B]"
          >
            <Search className="w-4 h-4" />
          </button>

          {/* RIGHT: Theme, Notifications, KYC, Wallet, Avatar */}
          <div className="flex items-center gap-2 shrink-0">
            {/* 1. Theme Toggle (Sun/Moon) */}
            <button
              type="button"
              aria-label="Toggle Theme"
              onClick={toggleTheme}
              className="p-2 rounded-[8px] text-[#64748B] dark:text-[#94A3B8] hover:bg-[#F8FAFC] dark:hover:bg-[#1E293B] hover:text-[#0F172A] dark:hover:text-[#E2E8F0] transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#0F4C81]"
              title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
            >
              {theme === 'dark' ? (
                <Sun className="w-[18px] h-[18px] text-[#F59E0B]" strokeWidth={1.5} />
              ) : (
                <Moon className="w-[18px] h-[18px]" strokeWidth={1.5} />
              )}
            </button>

            {/* 2. Notifications Bell with Unread Dot & 360px Dropdown */}
            <div className="relative" ref={notificationsRef}>
              <button
                type="button"
                aria-label="Notifications"
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                className="p-2 rounded-[8px] text-[#64748B] dark:text-[#94A3B8] hover:bg-[#F8FAFC] dark:hover:bg-[#1E293B] hover:text-[#0F172A] dark:hover:text-[#E2E8F0] transition-colors relative cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#0F4C81]"
              >
                <Bell className="w-[18px] h-[18px]" strokeWidth={1.5} />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#DC2626]" />
              </button>

              {notificationsOpen && (
                <div className="absolute right-0 mt-2 w-[360px] max-w-[calc(100vw-24px)] rounded-[12px] bg-white dark:bg-[#111A2C] border border-[#E2E8F0] dark:border-[#1E293B] shadow-2xl p-3 space-y-3 z-50 text-[13px]">
                  <div className="flex items-center justify-between pb-2 border-b border-[#E2E8F0] dark:border-[#1E293B]">
                    <span className="font-semibold text-[14px]">Notifications</span>
                    <button
                      onClick={() => toast.info('All notifications marked as read')}
                      className="text-[11px] font-semibold text-[#0F4C81] dark:text-[#14B8A6] hover:underline cursor-pointer"
                    >
                      Mark all as read
                    </button>
                  </div>

                  {/* Tabs: All / Payouts / Account */}
                  <div className="flex gap-1 border-b border-[#E2E8F0] dark:border-[#1E293B] pb-1 text-[12px]">
                    {[
                      { id: 'all', label: 'All' },
                      { id: 'payouts', label: 'Payouts' },
                      { id: 'account', label: 'Account' },
                    ].map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setNotificationTab(t.id as any)}
                        className={`px-3 py-1 rounded-[6px] font-semibold transition-colors cursor-pointer ${
                          notificationTab === t.id
                            ? 'bg-[#0F4C81]/10 dark:bg-[#14B8A6]/10 text-[#0F4C81] dark:text-[#14B8A6]'
                            : 'text-[#64748B] dark:text-[#94A3B8] hover:text-[#0F172A]'
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>

                  {/* Notification items */}
                  <div className="space-y-1.5 max-h-64 overflow-y-auto">
                    {filteredNotifications.map((n) => (
                      <div
                        key={n.id}
                        className="p-2.5 rounded-[8px] bg-[#F8FAFC] dark:bg-[#0B1220] border border-[#E2E8F0] dark:border-[#1E293B] flex items-start gap-2.5"
                      >
                        {n.unread && <div className="w-2 h-2 rounded-full bg-[#0F4C81] dark:bg-[#14B8A6] mt-1.5 shrink-0" />}
                        <div className="flex-1">
                          <div className="font-semibold text-[13px]">{n.title}</div>
                          <div className="text-[12px] text-[#64748B] dark:text-[#94A3B8]">{n.desc}</div>
                          <div className="text-[10px] text-[#64748B] dark:text-[#94A3B8] mt-1">{n.time}</div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="pt-2 border-t border-[#E2E8F0] dark:border-[#1E293B] text-center">
                    <button
                      onClick={() => {
                        onNavigateTab('transactions');
                        setNotificationsOpen(false);
                      }}
                      className="text-[12px] font-semibold text-[#0F4C81] dark:text-[#14B8A6] hover:underline cursor-pointer"
                    >
                      View All Activity
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* 3. KYC Status Badge */}
            <button
              type="button"
              aria-label="KYC Status"
              onClick={onOpenKyc}
              className={`hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[12px] font-semibold transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#0F4C81] ${
                isVerified
                  ? 'bg-[#16A34A]/10 text-[#16A34A] hover:bg-[#16A34A]/20'
                  : isKycPending
                  ? 'bg-[#F59E0B]/10 text-[#F59E0B] hover:bg-[#F59E0B]/20 animate-pulse'
                  : 'bg-[#DC2626]/10 text-[#DC2626] hover:bg-[#DC2626]/20'
              }`}
            >
              {isVerified ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Verified</span>
                </>
              ) : isKycPending ? (
                <>
                  <Clock className="w-3.5 h-3.5" />
                  <span>Pending</span>
                </>
              ) : (
                <>
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>Action Needed</span>
                </>
              )}
            </button>

            {/* Available Balance Chip */}
            <div className="hidden xl:flex items-center gap-1.5 px-3 py-1 rounded-[8px] bg-[#F8FAFC] dark:bg-[#0B1220] border border-[#E2E8F0] dark:border-[#1E293B] text-[12px] font-medium">
              <span className="text-[#64748B] dark:text-[#94A3B8]">Available:</span>
              <span className="font-bold tabular-nums text-[#16A34A]">
                {formatCurrency(user?.walletBalance || 12450)}
              </span>
            </div>

            {/* Top Bar Deposit Primary Button */}
            <button
              type="button"
              onClick={() => onNavigateTab('deposit')}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] bg-[#0F4C81] text-white text-[12px] font-semibold hover:bg-[#0F4C81]/90 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#0F4C81]"
            >
              <ArrowDownToLine className="w-3.5 h-3.5" />
              <span>Deposit</span>
            </button>



            {/* 5. Profile Avatar Menu */}
            <div className="relative" ref={avatarRef}>
              <button
                type="button"
                aria-label="Profile Menu"
                onClick={() => setAvatarMenuOpen(!avatarMenuOpen)}
                className="w-9 h-9 rounded-full bg-[#0F4C81] text-white flex items-center justify-center font-bold text-[13px] hover:opacity-90 transition-opacity cursor-pointer shadow-xs focus:outline-none focus:ring-2 focus:ring-[#0F4C81]"
              >
                {user?.fullName?.charAt(0) || 'P'}
              </button>

              {avatarMenuOpen && (
                <div className="absolute right-0 mt-2 w-60 rounded-[12px] bg-white dark:bg-[#111A2C] border border-[#E2E8F0] dark:border-[#1E293B] shadow-2xl p-2 z-50 text-[13px]">
                  <div className="p-2.5 border-b border-[#E2E8F0] dark:border-[#1E293B]">
                    <div className="font-semibold text-[#0F172A] dark:text-[#E2E8F0] truncate">
                      {user?.fullName || 'Predrag Mirkovic'}
                    </div>
                    <div className="text-[11px] text-[#64748B] dark:text-[#94A3B8] truncate">
                      {user?.email || 'investor@kretz.com'}
                    </div>
                  </div>

                  <div className="py-1">
                    <button
                      onClick={() => {
                        onNavigateTab('settings');
                        setAvatarMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-[6px] hover:bg-[#F8FAFC] dark:hover:bg-[#1E293B] text-left cursor-pointer"
                    >
                      <UserIcon className="w-4 h-4" /> Profile & Account
                    </button>
                    <button
                      onClick={() => {
                        onNavigateTab('settings');
                        setAvatarMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-[6px] hover:bg-[#F8FAFC] dark:hover:bg-[#1E293B] text-left cursor-pointer"
                    >
                      <Settings className="w-4 h-4" /> Preferences
                    </button>
                    <button
                      onClick={() => {
                        onNavigateTab('documents');
                        setAvatarMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-[6px] hover:bg-[#F8FAFC] dark:hover:bg-[#1E293B] text-left cursor-pointer"
                    >
                      <FileText className="w-4 h-4" /> Documents Vault
                    </button>
                    <button
                      onClick={() => {
                        onNavigateTab('support');
                        setAvatarMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-[6px] hover:bg-[#F8FAFC] dark:hover:bg-[#1E293B] text-left cursor-pointer"
                    >
                      <LifeBuoy className="w-4 h-4" /> Help & Support
                    </button>
                  </div>

                  <div className="pt-1 border-t border-[#E2E8F0] dark:border-[#1E293B]">
                    <button
                      onClick={() => {
                        setAvatarMenuOpen(false);
                        logout();
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-[6px] text-[#DC2626] hover:bg-[#DC2626]/10 text-left font-semibold cursor-pointer"
                    >
                      <LogOut className="w-4 h-4" /> Log out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>


        {/* Scrollable Main View */}
        <main className="flex-1 overflow-y-auto pb-20 md:pb-8">
          <div className="max-w-[1280px] mx-auto p-4 md:p-6 transition-all">
            {children}
          </div>
        </main>

        {/* ========================================================================= */}
        {/* MOBILE BOTTOM TAB BAR (64px)                                              */}
        {/* ========================================================================= */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 h-[64px] bg-white/95 dark:bg-[#111A2C]/95 backdrop-blur-md border-t border-[#E2E8F0] dark:border-[#1E293B] flex items-center justify-around z-40 px-2 pb-[env(safe-area-inset-bottom,0px)]">
          {[
            { id: 'overview', label: 'Overview', icon: LayoutDashboard },
            { id: 'marketplace', label: 'Marketplace', icon: Store },
            { id: 'my-properties', label: 'Properties', icon: Building2 },
            { id: 'income', label: 'Income', icon: TrendingUp },
            { id: 'more', label: 'More', icon: Menu },
          ].map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  if (item.id === 'more') {
                    setMobileDrawerOpen(true);
                  } else {
                    onNavigateTab(item.id);
                  }
                }}
                className={`flex flex-col items-center justify-center gap-1 py-1 px-2 rounded-[8px] transition-colors cursor-pointer ${
                  isActive
                    ? 'text-[#0F4C81] dark:text-[#14B8A6] font-semibold'
                    : 'text-[#64748B] dark:text-[#94A3B8]'
                }`}
              >
                <Icon className="w-5 h-5" strokeWidth={1.5} />
                <span className="text-[10px]">{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Mobile Search Full-Width Overlay */}
      {mobileSearchOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md p-4 flex flex-col space-y-4">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-white">Search System</span>
            <button onClick={() => setMobileSearchOpen(false)} className="text-white p-2">
              <X className="w-5 h-5" />
            </button>
          </div>
          <button
            onClick={() => {
              setMobileSearchOpen(false);
              onOpenCommandPalette();
            }}
            className="w-full py-3 px-4 rounded-[8px] bg-white text-black font-semibold text-left flex items-center gap-2"
          >
            <Search className="w-4 h-4" /> Open Search Palette (⌘K)
          </button>
        </div>
      )}
    </div>
  );
};
