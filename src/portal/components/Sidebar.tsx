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
    <aside className="hidden lg:flex w-64 shrink-0 flex-col border-r border-[#1D3860] bg-[#0B1B30] h-screen sticky top-0">
      <div className="h-16 px-5 border-b border-[#1D3860] flex items-center justify-between">
        <button
          type="button"
          onClick={() => navigatePortal('overview')}
          className="text-left"
        >
          <span className="font-serif text-xl font-semibold tracking-tight text-[#C5A880]">
            L’Agence
          </span>
        </button>
      </div>

      <div className="px-4 py-4 border-b border-[#1D3860]">
        <div className="portal-surface-elevated p-3.5">
          <div className="text-[11px] font-medium text-[#8EA7C7]">Available cash</div>
          <div className="mt-1 text-lg font-bold text-white portal-tabular">
            {formatEuro(balance)}
          </div>
        </div>
      </div>

      <nav aria-label="Portal navigation" className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
        {NAV_GROUPS.map((group) => (
          <div key={group.label}>
            <div className="px-3 mb-1.5 text-[11px] font-semibold tracking-wider text-[#8EA7C7]">
              {group.label}
            </div>
            <div className="space-y-0.5">
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
                    className={`w-full min-h-[42px] px-3 rounded-xl flex items-center justify-between gap-2.5 text-sm font-medium transition-colors ${
                      active
                        ? 'bg-[#152E54] text-[#C5A880] border border-[#C5A880]/40'
                        : 'text-[#8EA7C7] hover:text-white hover:bg-[#102442] border border-transparent'
                    }`}
                  >
                    <span className="flex items-center gap-3 min-w-0">
                      <Icon className="w-4 h-4 shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </span>
                    {item.id === 'notifications' && unreadCount > 0 && (
                      <span className="text-xs font-semibold text-[#C5A880] portal-tabular">
                        {unreadCount}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="p-3 border-t border-[#1D3860]">
        <button
          type="button"
          onClick={() => exitToPublicSite('/')}
          className="w-full min-h-[44px] px-3 rounded-xl text-xs font-semibold text-[#8EA7C7] hover:text-white hover:bg-[#102442] flex items-center gap-2.5 transition-colors"
        >
          <ExternalLink className="w-4 h-4" />
          <span>Return to Public Site</span>
        </button>
      </div>
    </aside>
  );
};
