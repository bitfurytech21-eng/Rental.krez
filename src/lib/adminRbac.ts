export type CanonicalStaffRole =
  | 'super_admin'
  | 'finance'
  | 'compliance'
  | 'property_manager'
  | 'support';

export type AdminSectionKey =
  | 'dashboard'
  | 'investors'
  | 'kyc'
  | 'deposits'
  | 'withdrawals'
  | 'properties'
  | 'investments'
  | 'distributions'
  | 'transactions'
  | 'documents'
  | 'notifications'
  | 'reports'
  | 'staff'
  | 'settings'
  | 'audit';

export const ALL_ADMIN_SECTIONS: AdminSectionKey[] = [
  'dashboard',
  'investors',
  'kyc',
  'deposits',
  'withdrawals',
  'properties',
  'investments',
  'distributions',
  'transactions',
  'documents',
  'notifications',
  'reports',
  'staff',
  'settings',
  'audit',
];

export const ROLE_ALLOWED_SECTIONS: Record<CanonicalStaffRole, AdminSectionKey[]> = {
  super_admin: ALL_ADMIN_SECTIONS,
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
  compliance: ['dashboard', 'investors', 'kyc', 'notifications'],
  property_manager: ['properties', 'investments', 'documents'],
  support: ['investors', 'notifications', 'documents'],
};

export const ROLE_READ_ONLY_SECTIONS: Partial<Record<CanonicalStaffRole, AdminSectionKey[]>> = {
  support: ['investors', 'documents'],
};

export const STAFF_ROLE_LABELS: Record<CanonicalStaffRole, string> = {
  super_admin: 'Super Admin',
  finance: 'Finance',
  compliance: 'Compliance',
  property_manager: 'Property Manager',
  support: 'Support',
};

export function normalizeStaffRole(
  rawRole?: string | null,
  isAdmin?: boolean
): CanonicalStaffRole | null {
  if (isAdmin === true) return 'super_admin';
  if (!rawRole) return null;
  const r = String(rawRole).trim().toLowerCase();
  if (r === 'super_admin' || r === 'admin') return 'super_admin';
  if (r === 'finance' || r === 'finance_admin') return 'finance';
  if (r === 'compliance') return 'compliance';
  if (r === 'property_manager' || r === 'operations_admin') return 'property_manager';
  if (r === 'support') return 'support';
  return null;
}

export function hasAdminConsoleAccess(subject?: {
  isAdmin?: boolean;
  is_admin?: boolean;
  staffRole?: string | null;
  staff_role?: string | null;
} | null): boolean {
  if (!subject) return false;
  if (subject.isAdmin === true || subject.is_admin === true) return true;
  return normalizeStaffRole(subject.staffRole ?? subject.staff_role ?? null, false) !== null;
}

export function resolveEffectiveStaffRole(subject?: {
  isAdmin?: boolean;
  is_admin?: boolean;
  staffRole?: string | null;
  staff_role?: string | null;
  role?: string | null;
} | null): CanonicalStaffRole | null {
  if (!subject) return null;
  if (subject.isAdmin === true || subject.is_admin === true) return 'super_admin';
  const explicitStaff = normalizeStaffRole(subject.staffRole ?? subject.staff_role ?? null, false);
  if (explicitStaff) return explicitStaff;
  return normalizeStaffRole(subject.role ?? null, false);
}

export function getAllowedSectionsForRole(staffRole: CanonicalStaffRole | null, isAdmin?: boolean): AdminSectionKey[] {
  if (isAdmin) return ROLE_ALLOWED_SECTIONS.super_admin;
  if (!staffRole) return [];
  return ROLE_ALLOWED_SECTIONS[staffRole] || [];
}

export function canRoleAccessSection(
  staffRole: CanonicalStaffRole | null,
  isAdmin: boolean | undefined,
  section: string
): boolean {
  const allowed = getAllowedSectionsForRole(staffRole, isAdmin);
  return allowed.includes(section as AdminSectionKey);
}

export function isSectionReadOnlyForRole(
  staffRole: CanonicalStaffRole | null,
  isAdmin: boolean | undefined,
  section: AdminSectionKey
): boolean {
  if (isAdmin || staffRole === 'super_admin') return false;
  if (!staffRole) return true;
  return (ROLE_READ_ONLY_SECTIONS[staffRole] || []).includes(section);
}

export function getSignedInRoleLabel(staffRole?: CanonicalStaffRole | null, isAdmin?: boolean): string {
  if (isAdmin) return STAFF_ROLE_LABELS.super_admin;
  if (!staffRole) return 'Investor';
  return STAFF_ROLE_LABELS[staffRole] || staffRole;
}
