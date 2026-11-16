import React from 'react';
import {
  Wallet,
  TrendingUp,
  FileText,
  ShieldCheck,
  Bell,
  User,
  HelpCircle,
  ExternalLink,
  ChevronRight,
  Database,
} from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { usePortal } from '../state/PortalContext';
import { PortalRoute } from '../types';
import { formatEuro } from '../utils/format';
import { StatusBadge } from '../components/StatusBadge';

export const MorePage: React.FC = () => {
  const toast = useToast();
  const {
    balance,
    profile,
    unreadCount,
    sampleDataEnabled,
    setSampleDataEnabled,
    navigatePortal,
    exitToPublicSite,
  } = usePortal();

  const kycBadgeLabel =
    profile?.kycStatus === 'verified'
      ? 'Verified'
      : profile?.kycStatus === 'rejected'
      ? 'Rejected'
      : 'In review';

  const mainItems: Array<{
    route: PortalRoute;
    label: string;
    subtitle: string;
    icon: React.FC<{ className?: string }>;
    status?: string | null;
    statusLabel?: string;
  }> = [
    {
      route: 'wallet',
      label: 'Wallet',
      subtitle: `Available ${formatEuro(balance)} · Linked bank & transfers`,
      icon: Wallet,
    },
    {
      route: 'analytics',
      label: 'Portfolio analytics',
      subtitle: 'Allocation breakdown and valuation over time',
      icon: TrendingUp,
    },
    {
      route: 'reports',
      label: 'Reports',
      subtitle: 'Downloadable statements and tax documents',
      icon: FileText,
    },
    {
      route: 'compliance',
      label: 'Compliance Vault',
      subtitle: 'Identity, proof of address & investor questionnaire',
      icon: ShieldCheck,
      status: profile?.kycStatus || 'pending',
      statusLabel: kycBadgeLabel,
    },
    {
      route: 'notifications',
      label: 'Notifications',
      subtitle: unreadCount > 0 ? `${unreadCount} unread alert${unreadCount === 1 ? '' : 's'}` : 'You’re all caught up',
      icon: Bell,
    },
    {
      route: 'profile',
      label: 'Profile settings',
      subtitle: 'Personal details and SEPA bank account',
      icon: User,
    },
  ];

  const handleToggleSample = () => {
    const next = !sampleDataEnabled;
    setSampleDataEnabled(next);
    toast.info(
      next
        ? 'Sample data enabled for previewing populated views.'
        : 'Sample data disabled. Showing live account data.'
    );
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h2 className="text-xl font-heading font-bold text-[#F2F5F4]">More</h2>
        <p className="text-sm text-[#8FA1A8] mt-0.5">
          Wallet, portfolio analytics, statements, compliance, and account preferences.
        </p>
      </div>

      <section aria-label="Portal sections" className="portal-card-list divide-y divide-[#1F2C33]">
        {mainItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.route}
              type="button"
              onClick={() => navigatePortal(item.route)}
              className="w-full min-h-[64px] p-4 flex items-center justify-between gap-4 text-left hover:bg-[#172228]/70 transition-colors"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-10 h-10 rounded-[14px] bg-[#0B0F10] border border-[#1F2C33] text-[#6FD8B0] flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-medium text-[#F2F5F4] truncate">{item.label}</div>
                  <div className="text-xs text-[#8FA1A8] truncate mt-0.5 portal-tabular">
                    {item.subtitle}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2.5 shrink-0">
                {item.status && <StatusBadge status={item.status} label={item.statusLabel} />}
                <ChevronRight className="w-4 h-4 text-[#8FA1A8] shrink-0" />
              </div>
            </button>
          );
        })}
      </section>

      <section aria-label="Support, preview data, and public website" className="portal-card-list divide-y divide-[#1F2C33]">
        <button
          type="button"
          role="switch"
          aria-checked={sampleDataEnabled}
          onClick={handleToggleSample}
          className="w-full min-h-[60px] p-4 flex items-center justify-between gap-4 text-left hover:bg-[#172228]/70 transition-colors"
        >
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-10 h-10 rounded-[14px] bg-[#0B0F10] border border-[#1F2C33] text-[#6FD8B0] flex items-center justify-center shrink-0">
              <Database className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-medium text-[#F2F5F4] truncate">Sample data</div>
              <div className="text-xs text-[#8FA1A8] truncate mt-0.5">
                Toggle realistic sample portfolio data to preview populated vs empty states
              </div>
            </div>
          </div>
          <span
            className={`px-3 py-1 rounded-full text-xs font-semibold shrink-0 ${
              sampleDataEnabled
                ? 'bg-[#6FD8B0] text-[#07231A]'
                : 'bg-[#0B0F10] border border-[#1F2C33] text-[#8FA1A8]'
            }`}
          >
            {sampleDataEnabled ? 'Enabled' : 'Off'}
          </span>
        </button>

        <button
          type="button"
          onClick={() => navigatePortal('support')}
          className="w-full min-h-[60px] p-4 flex items-center justify-between gap-4 text-left hover:bg-[#172228]/70 transition-colors"
        >
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-10 h-10 rounded-[14px] bg-[#0B0F10] border border-[#1F2C33] text-[#6FD8B0] flex items-center justify-center shrink-0">
              <HelpCircle className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-medium text-[#F2F5F4] truncate">Investor Desk Support</div>
              <div className="text-xs text-[#8FA1A8] truncate mt-0.5">
                Contact your relationship advisor
              </div>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-[#8FA1A8] shrink-0" />
        </button>

        <button
          type="button"
          onClick={() => exitToPublicSite('/')}
          className="w-full min-h-[60px] p-4 flex items-center justify-between gap-4 text-left hover:bg-[#172228]/70 transition-colors"
        >
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-10 h-10 rounded-[14px] bg-[#0B0F10] border border-[#1F2C33] text-[#8FA1A8] flex items-center justify-center shrink-0">
              <ExternalLink className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-medium text-[#F2F5F4] truncate">Return to public site</div>
              <div className="text-xs text-[#8FA1A8] truncate mt-0.5">
                L’Agence editorial homepage &amp; public listings
              </div>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-[#8FA1A8] shrink-0" />
        </button>
      </section>
    </div>
  );
};
