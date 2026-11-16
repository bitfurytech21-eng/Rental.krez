import React from 'react';
import { LayoutGrid, Building2, Compass, History, MoreHorizontal } from 'lucide-react';
import { usePortal } from '../state/PortalContext';
import { PortalRoute } from '../types';

const TABS: Array<{ id: PortalRoute; label: string; icon: React.FC<{ className?: string }> }> = [
  { id: 'overview', label: 'Overview', icon: LayoutGrid },
  { id: 'portfolio', label: 'Portfolio', icon: Building2 },
  { id: 'explore', label: 'Explore', icon: Compass },
  { id: 'ledger', label: 'Ledger', icon: History },
  { id: 'more', label: 'More', icon: MoreHorizontal },
];

const MORE_CHILD_ROUTES = new Set<PortalRoute>([
  'wallet',
  'deposit',
  'withdraw',
  'profile',
  'compliance',
  'reports',
  'analytics',
  'notifications',
  'support',
]);

export const BottomNav: React.FC = () => {
  const { route, navigatePortal } = usePortal();

  return (
    <nav
      aria-label="Primary mobile navigation"
      className="lg:hidden sticky bottom-0 z-30 border-t border-[#1F2C33] bg-[#0B0F10]/95 backdrop-blur-md grid grid-cols-5 gap-1 pt-1.5 portal-safe-bottom"
      style={{
        paddingLeft: 'max(6px, env(safe-area-inset-left, 0px))',
        paddingRight: 'max(6px, env(safe-area-inset-right, 0px))',
      }}
    >
      {TABS.map((tab) => {
        const Icon = tab.icon;
        const active =
          route === tab.id ||
          (tab.id === 'explore' && route === 'property-detail') ||
          (tab.id === 'more' && MORE_CHILD_ROUTES.has(route));

        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => navigatePortal(tab.id)}
            aria-current={active ? 'page' : undefined}
            className={`min-h-[48px] min-w-[44px] flex flex-col items-center justify-center gap-1 rounded-[14px] text-[11px] transition-colors ${
              active
                ? 'bg-[#6FD8B0]/12 text-[#6FD8B0] font-semibold'
                : 'text-[#8FA1A8] hover:text-[#F2F5F4]'
            }`}
          >
            <Icon className="w-5 h-5" />
            <span className="whitespace-nowrap">{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
};
