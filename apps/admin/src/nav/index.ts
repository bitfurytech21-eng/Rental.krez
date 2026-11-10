import { 
  LayoutDashboard, 
  ArrowDownLeft, 
  ArrowUpRight, 
  Wallet, 
  Scale, 
  Users, 
  ShieldCheck, 
  UploadCloud, 
  Crown, 
  Building2, 
  Target, 
  Coins, 
  FileText, 
  ClipboardList, 
  Globe, 
  Settings, 
  Mail, 
  Shield, 
  Lock, 
  Monitor, 
  AlertTriangle, 
  RotateCcw,
  Sparkles
} from 'lucide-react';

export type NavGroup = {
  key: string;
  label: string;
  icon: React.ElementType;
  items: NavItem[];
};

export type NavItem = {
  id: string;
  label: string;
  href: string;
  icon?: React.ElementType;
  badge?: number;
};

export const ADMIN_NAV_GROUPS: NavGroup[] = [
  {
    key: 'dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    items: [
      { id: 'dashboard', label: 'Executive Dashboard', href: '/admin', icon: LayoutDashboard, badge: 0 },
    ],
  },
  {
    key: 'money',
    label: 'Money & Treasury',
    icon: Coins,
    items: [
      { id: 'deposits', label: 'Deposit Approvals', href: '/admin/deposits', icon: ArrowDownLeft },
      { id: 'withdrawals', label: 'Withdrawal Approvals', href: '/admin/withdrawals', icon: ArrowUpRight },
      { id: 'wallets', label: 'Crypto Wallets', href: '/admin/wallets', icon: Wallet },
      { id: 'ledger', label: 'Ledger Reconciliation', href: '/admin/ledger', icon: Scale },
    ],
  },
  {
    key: 'investors',
    label: 'Investors',
    icon: Users,
    items: [
      { id: 'users', label: 'User Registry', href: '/admin/users', icon: Users, badge: 10 },
      { id: 'kyc', label: 'KYC Compliance', href: '/admin/kyc', icon: ShieldCheck, badge: 1 },
      { id: 'proofs', label: 'Document Proofs', href: '/admin/proofs', icon: UploadCloud, badge: 2 },
      { id: 'club', label: 'Club Privé', href: '/admin/club', icon: Crown },
    ],
  },
  {
    key: 'properties',
    label: 'Properties',
    icon: Building2,
    items: [
      { id: 'spv', label: 'SPV Portfolio', href: '/admin/properties', icon: Building2 },
      { id: 'issuance', label: 'Token Issuance', href: '/admin/issuance', icon: Target },
      { id: 'dividends', label: 'Dividends', href: '/admin/dividends', icon: Coins },
      { id: 'restore', label: 'Restore Assets', href: '/admin/restore', icon: RotateCcw },
    ],
  },
  {
    key: 'tokenization',
    label: 'Tokenization',
    icon: Sparkles,
    items: [
      { id: 'token-admin', label: 'Token Admin', href: '/admin/tokenization', icon: Sparkles },
    ],
  },
  {
    key: 'support',
    label: 'Support & Reports',
    icon: FileText,
    items: [
      { id: 'tickets', label: 'Support Tickets', href: '/admin/support', icon: FileText },
      { id: 'reports', label: 'Compliance Reports', href: '/admin/reports', icon: ClipboardList },
    ],
  },
  {
    key: 'website',
    label: 'Website',
    icon: Globe,
    items: [
      { id: 'pages', label: 'Pages', href: '/admin/website', icon: Globe },
      { id: 'sections', label: 'Sections', href: '/admin/sections', icon: FileText },
      { id: 'templates', label: 'Templates', href: '/admin/templates', icon: LayoutDashboard },
    ],
  },
  {
    key: 'settings',
    label: 'Settings',
    icon: Settings,
    items: [
      { id: 'email', label: 'Email Manager', href: '/admin/email', icon: Mail },
      { id: 'sms', label: 'SMS Manager', href: '/admin/sms', icon: Mail },
      { id: 'seo', label: 'SEO', href: '/admin/seo', icon: Globe },
      { id: 'gdpr', label: 'GDPR Cookie', href: '/admin/gdpr', icon: Shield },
      { id: 'holiday', label: 'Holiday Setting', href: '/admin/holiday', icon: RotateCcw },
    ],
  },
  {
    key: 'security',
    label: 'Security',
    icon: Shield,
    items: [
      { id: 'audit', label: 'Audit Trail', href: '/admin/audit', icon: ClipboardList },
      { id: 'admin-security', label: 'Admin Security', href: '/admin/security', icon: Lock },
    ],
  },
  {
    key: 'system',
    label: 'System',
    icon: Monitor,
    items: [
      { id: 'logs', label: 'System Monitoring', href: '/admin/logs', icon: Monitor },
      { id: 'errors', label: 'Error Buffer', href: '/admin/errors', icon: AlertTriangle },
      { id: 'cache', label: 'Cache', href: '/admin/cache', icon: RotateCcw },
    ],
  },
];

export const getNavItemByHref = (href: string): NavItem | undefined => {
  for (const group of ADMIN_NAV_GROUPS) {
    const item = group.items.find((i) => i.href === href);
    if (item) return item;
  }
  return undefined;
};

export const getNavGroupByKey = (key: string): NavGroup | undefined => {
  return ADMIN_NAV_GROUPS.find((g) => g.key === key);
};