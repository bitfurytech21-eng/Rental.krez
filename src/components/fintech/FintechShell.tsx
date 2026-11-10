import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard, Building2, TrendingUp, CreditCard,
  FileText, Settings, Search, Bell, Sun, Moon,
  ChevronLeft, ChevronRight, CheckCircle2, Clock, Wallet,
  LogOut, User as UserIcon, AlertTriangle, ShieldCheck, X
} from 'lucide-react';
import { useFintechTheme } from './FintechThemeContext';
import { User } from '../../types/user';
import { useAuth } from '../../lib/auth';
import { useToast } from '../../context/ToastContext';

export interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
}

export const FINTECH_NAV_ITEMS: NavItem[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'marketplace', label: 'Marketplace', icon: Building2 },
  { id: 'my-properties', label: 'My Properties', icon: TrendingUp },
  { id: 'transactions', label: 'Transactions', icon: CreditCard },
  { id: 'income', label: 'Income', icon: TrendingUp },
  { id: 'documents', label: 'Documents', icon: FileText },
  { id: 'settings', label: 'Settings', icon: Settings },
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

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [avatarMenuOpen, setAvatarMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [walletModalOpen, setWalletModalOpen] = useState(false);
  const [isWalletConnected, setIsWalletConnected] = useState(true);
  const [network, setNetwork] = useState<'mainnet' | 'polygon' | 'base'>('mainnet');
  const [hasWrongNetwork, setHasWrongNetwork] = useState(false);

  const isVerified = user?.kycStatus === 'verified';
  const walletAddress = user?.cryptoDepositAddress || '0x71C8135C0e41B3fA128912389128f9A19b28A0bf';
  const shortWallet = `${walletAddress.slice(0, 4)}…${walletAddress.slice(-4)}`;

  const notifications = [
    { id: 1, title: 'Yield Distributed', desc: '+€412.50 credited from Neuilly Mansion', time: '2 hours ago', read: false },
    { id: 2, title: 'Quarterly Valuation Up', desc: 'Saint-Tropez estate assessed +3.2% higher', time: '1 day ago', read: false },
    { id: 3, title: 'KYC Verified', desc: 'Accreditation certified under MiFID II tier 1', time: '3 days ago', read: true },
  ];

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#F8FAFC] dark:bg-[#0B1220] text-[#0F172A] dark:text-[#E2E8F0] font-sans transition-colors duration-150">
      {/* 240px / 72px Collapsible Sidebar */}
      <aside
        className={`hidden md:flex flex-col border-r border-[#E2E8F0] dark:border-[#1E293B] bg-white dark:bg-[#111A2C] transition-all duration-150 shrink-0 z-30 ${
          sidebarCollapsed ? 'w-[72px]' : 'w-[240px]'
        }`}
      >
        {/* Brand header */}
        <div className="h-[64px] flex items-center justify-between px-4 border-b border-[#E2E8F0] dark:border-[#1E293B]">
          {!sidebarCollapsed ? (
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-[8px] bg-[#0F4C81] text-white flex items-center justify-center font-bold text-[15px] tracking-tight">
                K
              </div>
              <div className="font-semibold text-[16px] tracking-tight text-[#0F172A] dark:text-[#E2E8F0]">
                Rental.krez
              </div>
            </div>
          ) : (
            <div className="w-8 h-8 mx-auto rounded-[8px] bg-[#0F4C81] text-white flex items-center justify-center font-bold text-[15px]">
              K
            </div>
          )}

          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="p-1 rounded-[6px] text-[#64748B] dark:text-[#94A3B8] hover:bg-[#F8FAFC] dark:hover:bg-[#1E293B] transition-colors"
            title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {sidebarCollapsed ? (
              <ChevronRight className="w-4 h-4" strokeWidth={1.5} />
            ) : (
              <ChevronLeft className="w-4 h-4" strokeWidth={1.5} />
            )}
          </button>
        </div>

        {/* Navigation list */}
        <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
          {FINTECH_NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onNavigateTab(item.id)}
                title={sidebarCollapsed ? item.label : undefined}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-[8px] text-[14px] font-medium transition-all cursor-pointer ${
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
        </nav>

        {/* Sidebar Footer User Card */}
        <div className="p-3 border-t border-[#E2E8F0] dark:border-[#1E293B]">
          {!sidebarCollapsed ? (
            <div className="flex items-center gap-2.5 p-2 rounded-[8px] bg-[#F8FAFC] dark:bg-[#0B1220]">
              <div className="w-8 h-8 rounded-full bg-[#0F4C81]/10 text-[#0F4C81] dark:text-[#14B8A6] flex items-center justify-center font-bold text-[13px] shrink-0">
                {user?.fullName?.charAt(0) || 'P'}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[13px] font-semibold truncate text-[#0F172A] dark:text-[#E2E8F0]">
                  {user?.fullName || 'Predrag M.'}
                </div>
                <div className="text-[11px] text-[#64748B] dark:text-[#94A3B8] truncate">
                  {user?.role === 'admin' ? 'Administrator' : 'Accredited Partner'}
                </div>
              </div>
            </div>
          ) : (
            <div className="w-8 h-8 mx-auto rounded-full bg-[#0F4C81]/10 text-[#0F4C81] dark:text-[#14B8A6] flex items-center justify-center font-bold text-[13px]">
              {user?.fullName?.charAt(0) || 'P'}
            </div>
          )}
        </div>
      </aside>

      {/* Main Area */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Sticky 64px Top Bar with backdrop blur */}
        <header className="h-[64px] sticky top-0 z-20 px-4 md:px-6 border-b border-[#E2E8F0] dark:border-[#1E293B] bg-white/80 dark:bg-[#111A2C]/80 backdrop-blur-md flex items-center justify-between gap-3">
          {/* Search Trigger (⌘K) */}
          <button
            type="button"
            onClick={onOpenCommandPalette}
            className="flex items-center gap-2 px-3 py-1.5 rounded-[8px] border border-[#E2E8F0] dark:border-[#1E293B] bg-[#F8FAFC] dark:bg-[#0B1220] text-[#64748B] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-[#E2E8F0] text-[13px] transition-colors w-48 sm:w-64 cursor-pointer"
          >
            <Search className="w-4 h-4 shrink-0" strokeWidth={1.5} />
            <span className="truncate">Search (⌘K)...</span>
            <kbd className="hidden sm:inline-block ml-auto px-1.5 py-0.5 rounded bg-white dark:bg-[#111A2C] border border-[#E2E8F0] dark:border-[#1E293B] text-[10px] font-mono">
              ⌘K
            </kbd>
          </button>

          {/* Right Action Controls */}
          <div className="flex items-center gap-2.5">
            {/* KYC Badge (Verified green / Pending amber) */}
            <button
              type="button"
              onClick={onOpenKyc}
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[12px] font-semibold transition-all cursor-pointer ${
                isVerified
                  ? 'bg-[#16A34A]/10 text-[#16A34A] hover:bg-[#16A34A]/20'
                  : 'bg-[#F59E0B]/10 text-[#F59E0B] hover:bg-[#F59E0B]/20 animate-pulse'
              }`}
            >
              {isVerified ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>KYC Verified</span>
                </>
              ) : (
                <>
                  <Clock className="w-3.5 h-3.5" />
                  <span>KYC Pending</span>
                </>
              )}
            </button>

            {/* Wallet Button (0x12…89ab + network chip) */}
            <button
              type="button"
              onClick={() => setWalletModalOpen(true)}
              className="hidden sm:inline-flex items-center gap-2 px-3 py-1.5 rounded-[8px] border border-[#E2E8F0] dark:border-[#1E293B] bg-white dark:bg-[#111A2C] hover:bg-[#F8FAFC] dark:hover:bg-[#1E293B] text-[12px] font-medium transition-colors cursor-pointer"
            >
              <div className="w-2 h-2 rounded-full bg-[#16A34A]" />
              <span className="font-mono tabular-nums text-[#0F172A] dark:text-[#E2E8F0]">
                {shortWallet}
              </span>
              <span className="px-1.5 py-0.2 rounded-full bg-[#0F4C81]/10 text-[#0F4C81] dark:text-[#14B8A6] text-[10px] font-semibold uppercase">
                {network}
              </span>
            </button>

            {/* Notifications Bell with Dot */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                className="p-2 rounded-[8px] text-[#64748B] dark:text-[#94A3B8] hover:bg-[#F8FAFC] dark:hover:bg-[#1E293B] hover:text-[#0F172A] dark:hover:text-[#E2E8F0] transition-colors relative cursor-pointer"
                title="Notifications"
              >
                <Bell className="w-[18px] h-[18px]" strokeWidth={1.5} />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#DC2626]" />
              </button>

              {notificationsOpen && (
                <div className="absolute right-0 mt-2 w-80 rounded-[12px] bg-white dark:bg-[#111A2C] border border-[#E2E8F0] dark:border-[#1E293B] shadow-2xl p-3 space-y-2 z-50">
                  <div className="flex items-center justify-between pb-2 border-b border-[#E2E8F0] dark:border-[#1E293B]">
                    <span className="font-semibold text-[13px]">Notifications</span>
                    <button
                      onClick={() => setNotificationsOpen(false)}
                      className="text-[11px] text-[#0F4C81] dark:text-[#14B8A6] hover:underline"
                    >
                      Mark all read
                    </button>
                  </div>
                  <div className="space-y-1.5 max-h-64 overflow-y-auto">
                    {notifications.map((n) => (
                      <div
                        key={n.id}
                        className="p-2.5 rounded-[8px] bg-[#F8FAFC] dark:bg-[#0B1220] border border-[#E2E8F0] dark:border-[#1E293B] text-[12px]"
                      >
                        <div className="font-semibold">{n.title}</div>
                        <div className="text-[#64748B] dark:text-[#94A3B8] text-[11px]">{n.desc}</div>
                        <div className="text-[10px] text-[#64748B] dark:text-[#94A3B8] mt-1">{n.time}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Theme Toggle (Sun/Moon) */}
            <button
              type="button"
              onClick={toggleTheme}
              className="p-2 rounded-[8px] text-[#64748B] dark:text-[#94A3B8] hover:bg-[#F8FAFC] dark:hover:bg-[#1E293B] hover:text-[#0F172A] dark:hover:text-[#E2E8F0] transition-colors cursor-pointer"
              title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
            >
              {theme === 'dark' ? (
                <Sun className="w-[18px] h-[18px] text-[#F59E0B]" strokeWidth={1.5} />
              ) : (
                <Moon className="w-[18px] h-[18px]" strokeWidth={1.5} />
              )}
            </button>

            {/* Avatar Dropdown Menu */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setAvatarMenuOpen(!avatarMenuOpen)}
                className="w-9 h-9 rounded-full bg-[#0F4C81] text-white flex items-center justify-center font-bold text-[13px] hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
              >
                {user?.fullName?.charAt(0) || 'P'}
              </button>

              {avatarMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 rounded-[12px] bg-white dark:bg-[#111A2C] border border-[#E2E8F0] dark:border-[#1E293B] shadow-2xl p-2 z-50 text-[13px]">
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
                      <UserIcon className="w-4 h-4" /> Account Settings
                    </button>
                    <button
                      onClick={() => {
                        onOpenKyc();
                        setAvatarMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-[6px] hover:bg-[#F8FAFC] dark:hover:bg-[#1E293B] text-left cursor-pointer"
                    >
                      <ShieldCheck className="w-4 h-4" /> KYC Verification
                    </button>
                  </div>
                  <div className="pt-1 border-t border-[#E2E8F0] dark:border-[#1E293B]">
                    <button
                      onClick={() => {
                        setAvatarMenuOpen(false);
                        logout();
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-[6px] text-[#DC2626] hover:bg-[#DC2626]/10 text-left cursor-pointer"
                    >
                      <LogOut className="w-4 h-4" /> Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Banners: Wrong Network or Disconnected */}
        {hasWrongNetwork && (
          <div className="bg-[#DC2626] text-white px-4 py-2 text-[12px] font-semibold flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              <span>Wrong network detected. Please switch to Ethereum Mainnet or Polygon.</span>
            </div>
            <button
              onClick={() => {
                setNetwork('mainnet');
                setHasWrongNetwork(false);
                toast.success('Switched to Ethereum Mainnet');
              }}
              className="underline cursor-pointer"
            >
              Switch to Mainnet
            </button>
          </div>
        )}

        {/* Scrollable Main Content Container (max-width 1280px, padding 24px / 16px mobile) */}
        <main className="flex-1 overflow-y-auto pb-20 md:pb-8">
          <div className="max-w-[1280px] mx-auto p-4 md:p-6 transition-all">
            {children}
          </div>
        </main>

        {/* Mobile: 64px Bottom Tab Bar */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 h-[64px] bg-white/95 dark:bg-[#111A2C]/95 backdrop-blur-md border-t border-[#E2E8F0] dark:border-[#1E293B] flex items-center justify-around z-40 px-2">
          {FINTECH_NAV_ITEMS.slice(0, 5).map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onNavigateTab(item.id)}
                className={`flex flex-col items-center justify-center gap-1 py-1 px-2 rounded-[8px] transition-colors ${
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

      {/* Wallet Details Modal */}
      {walletModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md"
          onClick={() => setWalletModalOpen(false)}
        >
          <div
            className="w-full max-w-[440px] rounded-[12px] bg-white dark:bg-[#111A2C] border border-[#E2E8F0] dark:border-[#1E293B] shadow-2xl p-6 text-[#0F172A] dark:text-[#E2E8F0] space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#E2E8F0] dark:border-[#1E293B] pb-3">
              <h3 className="text-[16px] font-semibold">Institutional Custody Wallet</h3>
              <button
                onClick={() => setWalletModalOpen(false)}
                className="p-1 rounded text-[#64748B] hover:bg-black/5"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3.5 rounded-[8px] bg-[#F8FAFC] dark:bg-[#0B1220] border border-[#E2E8F0] dark:border-[#1E293B] space-y-2 text-[12px]">
              <div>
                <span className="text-[#64748B] block">Address:</span>
                <span className="font-mono text-[13px] font-bold text-[#0F4C81] dark:text-[#14B8A6] break-all">
                  {walletAddress}
                </span>
              </div>
              <div className="flex justify-between pt-1">
                <span className="text-[#64748B]">Active Network:</span>
                <span className="font-semibold uppercase">{network}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#64748B]">Compliance Standard:</span>
                <span className="font-semibold text-[#16A34A]">ERC-3643 Whitelisted</span>
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 pt-2 border-t border-[#E2E8F0] dark:border-[#1E293B]">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(walletAddress);
                  toast.success('Wallet address copied to clipboard');
                }}
                className="px-4 py-2 rounded-[8px] border border-[#E2E8F0] dark:border-[#1E293B] text-[13px] font-medium hover:bg-[#F8FAFC]"
              >
                Copy Address
              </button>
              <button
                onClick={() => {
                  setWalletModalOpen(false);
                  toast.info('Disconnected wallet session');
                }}
                className="px-4 py-2 rounded-[8px] bg-[#DC2626] text-white text-[13px] font-semibold hover:bg-[#DC2626]/90"
              >
                Disconnect
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
