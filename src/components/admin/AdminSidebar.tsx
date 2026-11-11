import React, { useState } from 'react';
import { ADMIN_NAV_GROUPS, AdminNavGroup, AdminNavItem, AdminNavSubItem } from './adminNavData';
import { X, ChevronDown, ChevronUp, ShieldCheck } from 'lucide-react';

interface AdminSidebarProps {
  currentTab: string;
  onSelectTab: (key: string) => void;
  isOpen: boolean;
  onClose: () => void;
  badgeCounts: {
    pendingDeposits: number;
    pendingWithdrawals: number;
    pendingKYC: number;
    pendingProofs: number;
    totalUsers: number;
    suspendedUsers?: number;
  };
}

export const AdminSidebar: React.FC<AdminSidebarProps> = ({
  currentTab,
  onSelectTab,
  isOpen,
  onClose,
  badgeCounts
}) => {
  // Track open state for items with sub-items
  const [openSubMenus, setOpenSubMenus] = useState<Record<string, boolean>>(() => {
    // Open the submenu containing the current tab by default
    const initial: Record<string, boolean> = {
      'deposit-system': true,
      'withdrawals': true
    };
    ADMIN_NAV_GROUPS.forEach(g => {
      g.i.forEach(item => {
        if (item.s && item.s.some(sub => sub.k === currentTab)) {
          initial[item.k] = true;
        }
      });
    });
    return initial;
  });

  const toggleSubMenu = (key: string) => {
    setOpenSubMenus(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const getDynamicBadge = (key: string): { count: number | string; isWarning?: boolean } | null => {
    if (key === 'deposits' || key === 'deposit-system' || key === 'deposit-system-pending-deposits') {
      if (badgeCounts.pendingDeposits > 0) {
        return { count: badgeCounts.pendingDeposits, isWarning: true };
      }
    }
    if (key === 'withdrawals' || key === 'withdrawals-pending-log') {
      if (badgeCounts.pendingWithdrawals > 0) {
        return { count: badgeCounts.pendingWithdrawals, isWarning: true };
      }
    }
    if (key === 'kyc') {
      if (badgeCounts.pendingKYC > 0) {
        return { count: badgeCounts.pendingKYC, isWarning: true };
      }
    }
    if (key === 'proofs' || key === 'verification_docs') {
      if (badgeCounts.pendingProofs > 0) {
        return { count: badgeCounts.pendingProofs, isWarning: true };
      }
    }
    if (key === 'users') {
      if ((badgeCounts.suspendedUsers ?? 0) > 0) {
        return { count: badgeCounts.suspendedUsers ?? 0, isWarning: true };
      }
      return { count: badgeCounts.totalUsers };
    }
    if (key === 'support-ticket-pending-ticket') {
      return { count: 3, isWarning: false };
    }
    return null;
  };

  return (
    <>
      {/* Mobile Veil Backdrop */}
      <div
        className={`fixed inset-0 bg-black/55 backdrop-blur-xs z-40 transition-opacity lg:hidden ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sidebar Panel */}
      <aside
        id="side"
        aria-label="Admin navigation"
        className={`fixed inset-y-0 left-0 w-[290px] max-w-[86%] bg-[#22302d] text-[#cfe0d6] z-50 transform transition-transform duration-200 ease-in-out overflow-y-auto lg:translate-x-0 lg:static lg:z-10 shrink-0 border-r border-[#2c3a36] flex flex-col ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{
          padding: '20px 12px calc(30px + env(safe-area-inset-bottom, 0px))'
        }}
      >
        {/* Brand Header */}
        <div className="flex items-center justify-between px-3 pb-4 mb-2 border-b border-[#2d403a]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#35523f] flex items-center justify-center text-[#a9d6a0] shadow-sm">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <div className="font-bold text-white text-[17px] tracking-tight leading-snug">
                Platform admin
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-[#8fb09c]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#a9d6a0] animate-pulse"></span>
                <span>Super Admin Console</span>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="lg:hidden p-1.5 text-[#8fb09c] hover:text-white rounded-lg hover:bg-[#2d403a] transition-colors cursor-pointer"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Grouped Navigation Links */}
        <div className="space-y-4 flex-1">
          {ADMIN_NAV_GROUPS.map((group) => (
            <div key={group.g} className="group-wrapper">
              <h3 className="text-[12px] font-medium tracking-[0.06em] text-[#8fb09c] px-3 mb-1.5 uppercase select-none">
                {group.g}
              </h3>
              <div className="space-y-0.5">
                {group.i.map((item) => {
                  const hasSub = item.s && item.s.length > 0;
                  const isSubOpen = Boolean(openSubMenus[item.k]);
                  const isItemActive = currentTab === item.k;
                  const badge = getDynamicBadge(item.k);
                  const hasSubBadge = hasSub && item.s?.some(s => getDynamicBadge(s.k) !== null);

                  if (!hasSub) {
                    return (
                      <button
                        key={item.k}
                        type="button"
                        onClick={() => {
                          onSelectTab(item.k);
                          onClose();
                        }}
                        className={`flex items-center justify-between w-full text-left px-3 py-2 rounded-xl text-[14.5px] transition-colors font-sans cursor-pointer ${
                          isItemActive
                            ? 'bg-[#35523f] text-white font-medium shadow-xs'
                            : 'text-[#cfe0d6] hover:bg-[#2c3e39] hover:text-white'
                        }`}
                      >
                        <span className="truncate">{item.l}</span>
                        {badge && (
                          <span
                            className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                              badge.isWarning
                                ? 'bg-[#6e2c3a] text-[#ffd9df]'
                                : 'bg-[#2f5a40] text-[#cdeed2]'
                            }`}
                          >
                            {badge.count}
                          </span>
                        )}
                      </button>
                    );
                  }

                  // Item with sub-items
                  return (
                    <div key={item.k} className="space-y-0.5">
                      <button
                        type="button"
                        onClick={() => toggleSubMenu(item.k)}
                        className="flex items-center justify-between w-full text-left px-3 py-2 rounded-xl text-[14.5px] text-[#cfe0d6] hover:bg-[#2c3e39] hover:text-white transition-colors font-sans cursor-pointer"
                      >
                        <span className="truncate">{item.l}</span>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {hasSubBadge && (
                            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-[#6e2c3a] text-[#ffd9df]">
                              !
                            </span>
                          )}
                          <span className="text-[#8fb09c] text-xs">
                            {isSubOpen ? '▲' : '▼'}
                          </span>
                        </div>
                      </button>

                      {/* Expandable children branch with dashed left border */}
                      {isSubOpen && (
                        <div className="ml-3.5 pl-2 border-l-[1.5px] border-dashed border-[#4a6256] space-y-0.5 my-1">
                          {item.s?.map((sub) => {
                            const isSubActive = currentTab === sub.k;
                            const subBadge = getDynamicBadge(sub.k);

                            return (
                              <button
                                key={sub.k}
                                type="button"
                                onClick={() => {
                                  onSelectTab(sub.k);
                                  onClose();
                                }}
                                className={`flex items-center justify-between w-full text-left px-2.5 py-1.5 rounded-lg text-[13.5px] transition-colors font-sans cursor-pointer ${
                                  isSubActive
                                    ? 'bg-[#35523f] text-white font-medium'
                                    : 'text-[#a9c0b3] hover:text-white hover:bg-[#2c3e39]'
                                }`}
                              >
                                <span className="truncate">{sub.l}</span>
                                {subBadge && (
                                  <span
                                    className={`text-[10px] font-bold px-2 py-0.2 rounded-full ${
                                      subBadge.isWarning
                                        ? 'bg-[#6e2c3a] text-[#ffd9df]'
                                        : 'bg-[#2f5a40] text-[#cdeed2]'
                                    }`}
                                  >
                                    {subBadge.count}
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Sidebar Footer Info */}
        <div className="pt-4 mt-4 border-t border-[#2d403a] px-3 text-[11px] text-[#8fb09c]">
          <div className="flex items-center justify-between">
            <span>Kretz Real Estate SPV</span>
            <span className="font-mono text-[#a9d6a0]">v2.6</span>
          </div>
        </div>
      </aside>
    </>
  );
};
