import React from 'react';
import { ADMIN_NAV_GROUPS } from './adminNavData';
import {
  CanonicalStaffRole,
  canRoleAccessSection,
  getSignedInRoleLabel,
} from '../../lib/adminRbac';
import {
  Activity,
  ArrowDownLeft,
  ArrowUpRight,
  Bell,
  BookOpen,
  Building2,
  ClipboardList,
  Coins,
  FileBarChart2,
  FileText,
  Layers,
  LayoutDashboard,
  Settings,
  ShieldCheck,
  UserCheck,
  Users,
  X,
} from 'lucide-react';

interface AdminSidebarProps {
  currentTab: string;
  onSelectTab: (key: string) => void;
  isOpen: boolean;
  onClose: () => void;
  staffRole?: CanonicalStaffRole | null;
  isAdmin?: boolean;
  badgeCounts: {
    pendingDeposits: number;
    pendingWithdrawals: number;
    pendingKYC: number;
    pendingProofs: number;
    totalUsers: number;
    suspendedUsers?: number;
  };
}

const TAB_ICONS: Record<string, React.ReactNode> = {
  dashboard: <LayoutDashboard className="w-4 h-4 shrink-0" />,
  investors: <Users className="w-4 h-4 shrink-0" />,
  kyc: <UserCheck className="w-4 h-4 shrink-0" />,
  deposits: <ArrowDownLeft className="w-4 h-4 shrink-0" />,
  withdrawals: <ArrowUpRight className="w-4 h-4 shrink-0" />,
  properties: <Building2 className="w-4 h-4 shrink-0" />,
  investments: <Layers className="w-4 h-4 shrink-0" />,
  distributions: <Coins className="w-4 h-4 shrink-0" />,
  transactions: <BookOpen className="w-4 h-4 shrink-0" />,
  documents: <FileText className="w-4 h-4 shrink-0" />,
  notifications: <Bell className="w-4 h-4 shrink-0" />,
  reports: <FileBarChart2 className="w-4 h-4 shrink-0" />,
  staff: <ShieldCheck className="w-4 h-4 shrink-0" />,
  settings: <Settings className="w-4 h-4 shrink-0" />,
  audit: <ClipboardList className="w-4 h-4 shrink-0" />,
};

export const AdminSidebar: React.FC<AdminSidebarProps> = ({
  currentTab,
  onSelectTab,
  isOpen,
  onClose,
  staffRole = null,
  isAdmin = false,
  badgeCounts,
}) => {
  const roleLabel = getSignedInRoleLabel(staffRole, isAdmin);

  const getDynamicBadge = (key: string): { count: number; isWarning?: boolean } | null => {
    if (key === 'deposits' && badgeCounts.pendingDeposits > 0) {
      return { count: badgeCounts.pendingDeposits, isWarning: true };
    }
    if (key === 'withdrawals' && badgeCounts.pendingWithdrawals > 0) {
      return { count: badgeCounts.pendingWithdrawals, isWarning: true };
    }
    if (key === 'kyc') {
      const totalCompliance = badgeCounts.pendingKYC + badgeCounts.pendingProofs;
      if (totalCompliance > 0) return { count: totalCompliance, isWarning: true };
    }
    if (key === 'investors' && badgeCounts.totalUsers > 0) {
      return { count: badgeCounts.totalUsers };
    }
    return null;
  };

  return (
    <>
      <div
        className={`fixed inset-0 bg-black/55 z-40 transition-opacity lg:hidden ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      <aside
        id="admin-sidebar"
        aria-label="Admin navigation"
        className={`fixed inset-y-0 left-0 w-[272px] max-w-[85vw] bg-[#182421] text-[#D2E0D8] z-50 transform transition-transform duration-200 ease-in-out overflow-y-auto lg:translate-x-0 lg:static shrink-0 border-r border-[#273834] flex flex-col ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between px-4 py-4 border-b border-[#273834]">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-[#27845D] flex items-center justify-center text-white shrink-0">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-white text-sm tracking-tight leading-tight">
                  L’Agence
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-[#27845D] text-white">
                  Admin
                </span>
              </div>
              <div className="text-[11px] text-[#A8D5B8] font-medium truncate mt-0.5">
                {roleLabel}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="lg:hidden p-1.5 text-[#8FB09C] hover:text-white rounded-lg hover:bg-[#243430] transition-colors cursor-pointer"
            aria-label="Close navigation"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <nav className="px-3 py-4 space-y-5 flex-1">
          {ADMIN_NAV_GROUPS.map((group) => {
            const visibleItems = group.i.filter((item) =>
              canRoleAccessSection(staffRole, isAdmin, item.k)
            );
            if (visibleItems.length === 0) return null;

            return (
              <div key={group.g}>
                <div className="text-[10px] font-bold tracking-[0.08em] text-[#7D9B8B] px-2.5 mb-1.5 uppercase select-none">
                  {group.g}
                </div>
                <div className="space-y-0.5">
                  {visibleItems.map((item) => {
                    const isActive = currentTab === item.k;
                    const badge = getDynamicBadge(item.k);
                    return (
                      <button
                        key={item.k}
                        type="button"
                        onClick={() => {
                          onSelectTab(item.k);
                          onClose();
                        }}
                        className={`flex items-center justify-between w-full text-left px-2.5 py-2 rounded-lg text-[13px] transition-colors cursor-pointer ${
                          isActive
                            ? 'bg-[#27845D] text-white font-semibold'
                            : 'text-[#C8DBD0] hover:bg-[#23332F] hover:text-white font-medium'
                        }`}
                      >
                        <span className="flex items-center gap-2.5 min-w-0">
                          <span className={isActive ? 'text-white' : 'text-[#8FB09C]'}>
                            {TAB_ICONS[item.k] || <Activity className="w-4 h-4" />}
                          </span>
                          <span className="truncate">{item.l}</span>
                        </span>
                        {badge && (
                          <span
                            className={`text-[10px] font-bold tabular-nums px-1.5 py-0.5 rounded ${
                              badge.isWarning
                                ? 'bg-[#6E2C3A] text-[#FFD9DF]'
                                : isActive
                                ? 'bg-[#1D6547] text-white'
                                : 'bg-[#243832] text-[#A8D5B8]'
                            }`}
                          >
                            {badge.count}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>

        <div className="px-4 py-3 border-t border-[#273834] text-[11px] text-[#7D9B8B] flex items-center justify-between gap-2">
          <span className="truncate">Admin · {roleLabel}</span>
          <span className="font-mono text-[#A9D6A0] shrink-0">v2.6</span>
        </div>
      </aside>
    </>
  );
};
