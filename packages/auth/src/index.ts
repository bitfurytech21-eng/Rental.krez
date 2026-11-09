/**
 * Auth boundary for cross-app extraction.
 * Canonical runtime auth currently lives in apps/web/src/lib/auth.
 */
export type UserRole = 'admin' | 'investor' | 'compliance' | 'guest';
export interface SessionLike { userId?: string; email?: string; role?: UserRole | string; fullName?: string }
export {};
