/**
 * Shared auth contracts (step 3 extraction boundary).
 */
export type UserRole = 'admin' | 'investor' | 'compliance' | 'guest';
export interface AuthUser { id: string; email: string; role: UserRole | string; fullName?: string }
export interface AuthSession { token: string; csrfToken?: string; user: AuthUser }
export function hasAdminRole(user: Pick<AuthUser, 'role'> | null | undefined): boolean {
  return !!user && user.role === 'admin';
}
