import type { StaffRole, User } from '../../types/user';

export type AdminSectionId =
  | 'dashboard'
  | 'investors'
  | 'deposits'
  | 'withdrawals'
  | 'properties'
  | 'investments'
  | 'distributions'
  | 'transactions'
  | 'kyc'
  | 'documents'
  | 'notifications'
  | 'reports'
  | 'staff-roles'
  | 'settings'
  | 'audit-log';

export type AdminSettingsTabId = 'general' | 'payment-gates' | 'security';

export interface AdminNavItem {
  id: AdminSectionId;
  label: string;
  group: 'Overview' | 'Treasury' | 'Assets & Portfolio' | 'Compliance & Comms' | 'System';
}

export const ADMIN_NAV_ITEMS: AdminNavItem[] = [
  { id: 'dashboard', label: 'Dashboard', group: 'Overview' },
  { id: 'investors', label: 'Investors', group: 'Overview' },
  { id: 'deposits', label: 'Deposits', group: 'Treasury' },
  { id: 'withdrawals', label: 'Withdrawals', group: 'Treasury' },
  { id: 'transactions', label: 'Transactions', group: 'Treasury' },
  { id: 'distributions', label: 'Distributions', group: 'Treasury' },
  { id: 'properties', label: 'Properties', group: 'Assets & Portfolio' },
  { id: 'investments', label: 'Investments', group: 'Assets & Portfolio' },
  { id: 'kyc', label: 'KYC', group: 'Compliance & Comms' },
  { id: 'documents', label: 'Documents', group: 'Compliance & Comms' },
  { id: 'notifications', label: 'Notifications', group: 'Compliance & Comms' },
  { id: 'reports', label: 'Reports', group: 'System' },
  { id: 'staff-roles', label: 'Staff & Roles', group: 'System' },
  { id: 'settings', label: 'Settings', group: 'System' },
  { id: 'audit-log', label: 'Audit Log', group: 'System' },
];

export const ROLE_ALLOWED_SECTIONS: Record<StaffRole, AdminSectionId[]> = {
  super_admin: [
    'dashboard',
    'investors',
    'deposits',
    'withdrawals',
    'properties',
    'investments',
    'distributions',
    'transactions',
    'kyc',
    'documents',
    'notifications',
    'reports',
    'staff-roles',
    'settings',
    'audit-log',
  ],
  finance: [
    'dashboard',
    'investors',
    'deposits',
    'withdrawals',
    'investments',
    'distributions',
    'transactions',
    'reports',
    'settings',
  ],
  compliance: [
    'dashboard',
    'investors',
    'kyc',
    'notifications',
  ],
  property_manager: [
    'properties',
    'investments',
    'documents',
  ],
  support: [
    'investors',
    'notifications',
    'documents',
  ],
};

export function normalizeStaffRole(rawRole?: string | null): StaffRole | null {
  if (!rawRole) return null;
  const clean = String(rawRole).trim().toLowerCase().replace(/[\s-]+/g, '_');
  if (!clean || clean === 'investor' || clean === 'user' || clean === 'guest') return null;
  if (clean === 'admin' || clean === 'super_admin' || clean === 'superadmin') return 'super_admin';
  if (clean === 'finance' || clean === 'finance_admin') return 'finance';
  if (clean === 'compliance' || clean === 'compliance_officer' || clean === 'auditor') return 'compliance';
  if (clean === 'property_manager' || clean === 'operations_admin' || clean === 'property_admin') return 'property_manager';
  if (clean === 'support' || clean === 'support_agent') return 'support';
  return null;
}

export function resolveEffectiveStaffRole(user?: User | null): StaffRole | null {
  if (!user) return null;
  if (user.isAdmin === true) return 'super_admin';
  const fromStaffRole = normalizeStaffRole(user.staffRole);
  if (fromStaffRole) return fromStaffRole;
  return normalizeStaffRole(user.role);
}

export function hasStaffAccess(user?: User | null): boolean {
  if (!user) return false;
  if (user.isAdmin === true) return true;
  if (user.staffRole && String(user.staffRole).trim() !== '' && normalizeStaffRole(user.staffRole) !== null) {
    return true;
  }
  return normalizeStaffRole(user.role) !== null;
}

export function getStaffRoleLabel(role: StaffRole | null): string {
  switch (role) {
    case 'super_admin':
      return 'Super Admin';
    case 'finance':
      return 'Finance';
    case 'compliance':
      return 'Compliance';
    case 'property_manager':
      return 'Property Manager';
    case 'support':
      return 'Support';
    default:
      return 'Staff';
  }
}

export function canAccessSection(role: StaffRole | null, section: AdminSectionId): boolean {
  if (!role) return false;
  return ROLE_ALLOWED_SECTIONS[role].includes(section);
}

export function isReadOnlySection(role: StaffRole | null, section: AdminSectionId): boolean {
  if (!role) return true;
  if (role === 'support' && (section === 'investors' || section === 'documents')) {
    return true;
  }
  if (section === 'audit-log') {
    return true;
  }
  return false;
}

export function getAllowedSettingsTabs(role: StaffRole | null): AdminSettingsTabId[] {
  if (role === 'super_admin') return ['general', 'payment-gates', 'security'];
  if (role === 'finance') return ['payment-gates'];
  return [];
}

export function getDefaultSectionForRole(role: StaffRole | null): AdminSectionId {
  if (!role) return 'dashboard';
  return ROLE_ALLOWED_SECTIONS[role][0] || 'dashboard';
}

export function mapHashToSection(rawHashOrPath: string): AdminSectionId | null {
  const clean = rawHashOrPath.replace(/^#/, '').replace(/^\/admin\/?/, '').toLowerCase();
  if (!clean) return null;
  if (clean.includes('staff') || clean.includes('roles')) return 'staff-roles';
  if (clean.includes('audit') || clean.includes('log')) return 'audit-log';
  if (clean.includes('dashboard') || clean === 'overview') return 'dashboard';
  if (clean.includes('user') || clean.includes('investor')) return 'investors';
  if (clean.includes('withdrawal')) return 'withdrawals';
  if (clean.includes('deposit') || clean.includes('manual-payment')) return 'deposits';
  if (clean.includes('propert') || clean.includes('spv')) return 'properties';
  if (clean.includes('investment')) return 'investments';
  if (clean.includes('dividend') || clean.includes('distribution')) return 'distributions';
  if (clean.includes('ledger') || clean.includes('transaction') || clean.includes('reconcil')) return 'transactions';
  if (clean.includes('kyc')) return 'kyc';
  if (clean.includes('document') || clean.includes('proof')) return 'documents';
  if (clean.includes('notification') || clean.includes('ticket')) return 'notifications';
  if (clean.includes('report')) return 'reports';
  if (clean.includes('setting') || clean.includes('security') || clean.includes('gate')) return 'settings';
  return null;
}
