import React from 'react';
import {
  LayoutGrid,
  Building2,
  Compass,
  History,
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  TrendingUp,
  FileText,
  ShieldCheck,
  User,
  Bell,
  HelpCircle,
  ExternalLink,
} from 'lucide-react';
import { usePortal } from '../state/PortalContext';
import { PortalRoute } from '../types';
import { formatEuro } from '../utils/format';
import { LagenceLogo } from '../../components/common/LagenceLogo';

interface NavGroup {
  label: string;
  items: Array<{ id: PortalRoute; label: string; icon: React.FC<{ className?: string }> }>;
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Portfolio',
    items: [
      { id: 'overview', label: 'Overview', icon: LayoutGrid },
      { id: 'portfolio', label: 'My Holdings', icon: Building2 },
      { id: 'explore', label: 'Explore Properties', icon: Compass },
      { id: 'ledger', label: 'Ledger', icon: History },
    ],
  },
  {
    label: 'Capital',
    items: [
      { id: 'wallet', label: 'Wallet & FX', icon: Wallet },
      { id: 'deposit', label: 'Deposit', icon: ArrowDownLeft },
      { id: 'withdraw', label: 'Withdraw', icon: ArrowUpRight },
    ],
  },
  {
    label: 'Insights & Docs',
    items: [
      { id: 'analytics', label: 'Analytics', icon: TrendingUp },
      { id: 'reports', label: 'Statements', icon: FileText },
      { id: 'compliance', label: 'Compliance & KYC', icon: ShieldCheck },
    ],
  },
  {
    label: 'Account',
    items: [
      { id: 'profile', label: 'Profile & Banking', icon: User },
      { id: 'notifications', label: 'Notifications', icon: Bell },
      { id: 'support', label: 'Support', icon: HelpCircle },
    ],
  },
];

export const Sidebar: React.FC = () => {
  const { route, navigatePortal, exitToPublicSite, balance, unreadCount } = usePortal();

  return (
    <aside
      className="hidden lg:flex w-64 shrink-0 flex-col border-r border-[#1F2C33] bg-[#0B0F10] h-screen sticky top-0"
      style={{
        paddingTop: 'env(safe-area-inset-top, 0px)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        paddingLeft: 'env(safe-area-inset-left, 0px)',
      }}
    >
      <div className="h-16 px-4 border-b border-[#1F2C33] flex items-center justify-between">
        <button
          type="button"
          onClick={() => navigatePortal('overview')}
          className="min-h-[44px] flex items-center gap-2.5 text-left rounded-[14px] px-1"
        >
          <LagenceLogo variant="green" className="w-7 h-7 shrink-0" />
          <div className="flex flex-col leading-none">
            <span className="font-serif text-lg font-bold tracking-tight text-[#F2F5F4]">
              L’Agence
            </span>
            <span className="text-[10px] font-semibold tracking-[0.14em] uppercase text-[#6FD8B0] mt-0.5">
              INVESTOR PORTAL
            </span>
          </div>
        </button>
      </div>

      <div className="p-4 border-b border-[#1F2C33]">
        <div className="portal-card">
          <div className="text-xs font-medium text-[#8FA1A8]">Available cash</div>
          <div className="mt-1 text-xl font-bold text-[#F2F5F4] portal-tabular">
            {formatEuro(balance)}
          </div>
        </div>
      </div>

      <nav aria-label="Portal navigation" className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
        {NAV_GROUPS.map((group) => (
          <div key={group.label}>
            <div className="px-3 mb-1.5 text-xs font-medium text-[#8FA1A8]">
              {group.label}
            </div>
            <div className="space-y-1">
              {group.items.map((item) => {
                const Icon = item.icon;
                const active =
                  route === item.id ||
                  (item.id === 'explore' && route === 'property-detail');
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => navigatePortal(item.id)}
                    aria-current={active ? 'page' : undefined}
                    className={`w-full min-h-[44px] px-3 rounded-[14px] flex items-center justify-between gap-2.5 text-sm font-medium transition-colors ${
                      active
                        ? 'bg-[#121A1F] text-[#6FD8B0] border border-[#6FD8B0]/45'
                        : 'text-[#8FA1A8] hover:text-[#F2F5F4] hover:bg-[#121A1F] border border-transparent'
                    }`}
                  >
                    <span className="flex items-center gap-3 min-w-0">
                      <Icon className="w-4 h-4 shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </span>
                    {item.id === 'notifications' && unreadCount > 0 && (
                      <span className="min-w-[22px] h-[22px] px-1.5 rounded-full bg-[#6FD8B0] text-[#07231A] text-xs font-bold portal-tabular flex items-center justify-center">
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="p-3 border-t border-[#1F2C33]">
        <button
          type="button"
          onClick={() => exitToPublicSite('/')}
          className="w-full min-h-[44px] px-3 rounded-[14px] text-xs font-semibold text-[#8FA1A8] hover:text-[#F2F5F4] hover:bg-[#121A1F] border border-transparent hover:border-[#1F2C33] flex items-center gap-2.5 transition-colors"
        >
          <ExternalLink className="w-4 h-4" />
          <span>Return to Public Site</span>
        </button>
      </div>
    </aside>
  );
};
