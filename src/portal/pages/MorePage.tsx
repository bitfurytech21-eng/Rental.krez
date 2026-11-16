import React from 'react';
import {
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
  ChevronRight,
} from 'lucide-react';
import { usePortal } from '../state/PortalContext';
import { PortalRoute } from '../types';
import { formatEuro } from '../utils/format';

interface MenuSection {
  title: string;
  items: Array<{
    route: PortalRoute;
    label: string;
    subtitle: string;
    icon: React.FC<{ className?: string }>;
  }>;
}

export const MorePage: React.FC = () => {
  const { balance, profile, unreadCount, navigatePortal, exitToPublicSite } = usePortal();

  const sections: MenuSection[] = [
    {
      title: 'Capital & Treasury',
      items: [
        {
          route: 'wallet',
          label: 'Wallet & Multi-Currency FX',
          subtitle: `Available ${formatEuro(balance)}`,
          icon: Wallet,
        },
        {
          route: 'deposit',
          label: 'Deposit Funds',
          subtitle: 'SEPA bank wire or USDC/SOL transfer',
          icon: ArrowDownLeft,
        },
        {
          route: 'withdraw',
          label: 'Withdraw Funds',
          subtitle: 'Transfer to verified IBAN or wallet',
          icon: ArrowUpRight,
        },
      ],
    },
    {
      title: 'Reporting & Compliance',
      items: [
        {
          route: 'analytics',
          label: 'Yield Analytics',
          subtitle: 'Performance history and asset allocation',
          icon: TrendingUp,
        },
        {
          route: 'reports',
          label: 'Account Statements & CSV',
          subtitle: 'Official fiscal summaries and payout exports',
          icon: FileText,
        },
        {
          route: 'compliance',
          label: 'Compliance & KYC Vault',
          subtitle: `Status · ${profile?.kycStatus || 'Pending'}`,
          icon: ShieldCheck,
        },
      ],
    },
    {
      title: 'Account & Support',
      items: [
        {
          route: 'profile',
          label: 'Profile & Banking Details',
          subtitle: 'Personal information and withdrawal IBAN',
          icon: User,
        },
        {
          route: 'notifications',
          label: 'Notifications',
          subtitle: unreadCount > 0 ? `${unreadCount} unread alerts` : 'All caught up',
          icon: Bell,
        },
        {
          route: 'support',
          label: 'Investor Desk Support',
          subtitle: 'Contact your relationship advisor',
          icon: HelpCircle,
        },
      ],
    },
  ];

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h2 className="text-xl font-heading font-bold text-white">Account &amp; tools</h2>
        <p className="text-sm text-[#8EA7C7] mt-0.5">
          Treasury operations, regulatory documents, and account preferences.
        </p>
      </div>

      {sections.map((section) => (
        <section key={section.title} className="space-y-2">
          <h3 className="text-xs font-semibold text-[#8EA7C7] px-1">{section.title}</h3>
          <div className="portal-card divide-y divide-[#1D3860]">
            {section.items.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.route}
                  type="button"
                  onClick={() => navigatePortal(item.route)}
                  className="w-full min-h-[64px] px-4 py-3 flex items-center justify-between gap-4 text-left hover:bg-[#152E54]/45 transition-colors"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-[#0B1B30] border border-[#1D3860] text-[#C5A880] flex items-center justify-center shrink-0">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-white truncate">{item.label}</div>
                      <div className="text-xs text-[#8EA7C7] truncate mt-0.5">{item.subtitle}</div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[#8EA7C7] shrink-0" />
                </button>
              );
            })}
          </div>
        </section>
      ))}

      <div className="portal-card">
        <button
          type="button"
          onClick={() => exitToPublicSite('/')}
          className="w-full min-h-[56px] px-4 py-3 flex items-center justify-between gap-4 text-left hover:bg-[#152E54]/45 transition-colors"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-[#0B1B30] border border-[#1D3860] text-[#8EA7C7] flex items-center justify-center">
              <ExternalLink className="w-4 h-4" />
            </div>
            <div>
              <div className="text-sm font-semibold text-white">Return to public site</div>
              <div className="text-xs text-[#8EA7C7]">View L’Agence editorial homepage &amp; public listings</div>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-[#8EA7C7]" />
        </button>
      </div>
    </div>
  );
};
