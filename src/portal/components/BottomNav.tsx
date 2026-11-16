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
      className="lg:hidden sticky bottom-0 z-30 border-t border-[#1D3860] bg-[#0B1B30]/95 backdrop-blur-md grid grid-cols-5 px-1 pt-1.5"
      style={{ paddingBottom: 'calc(8px + env(safe-area-inset-bottom, 0px))' }}
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
            className={`min-h-[46px] flex flex-col items-center justify-center gap-1 rounded-xl text-[11px] transition-colors ${
              active ? 'text-[#C5A880] font-semibold' : 'text-[#8EA7C7] hover:text-white'
            }`}
          >
            <Icon className="w-[20px] h-[20px]" />
            <span className="whitespace-nowrap">{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
};
