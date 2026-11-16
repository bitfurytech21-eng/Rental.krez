import React, { useEffect } from 'react';
import { useAuth } from '../../lib/auth';
import { useNavigation } from '../../context/NavigationContext';
import { hasStaffAccess } from '../admin/adminRbac';
import { Lock, ArrowRight, ShieldCheck, Shield } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
  onNavigateLogin: () => void;
  title?: string;
  description?: string;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requireAdmin = false,
  onNavigateLogin,
  title = 'Investor Authentication Required',
  description = 'This section contains private financial data, wallet balances, and tokenized investment assets. Please sign in to your verified account to continue.',
}) => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { navigateTo } = useNavigation();

  const staffAllowed = hasStaffAccess(user);

  useEffect(() => {
    if (isLoading || !requireAdmin) return;
    if (!isAuthenticated || !user) {
      navigateTo('/login');
      return;
    }
    if (!staffAllowed) {
      navigateTo('/dashboard');
    }
  }, [isLoading, requireAdmin, isAuthenticated, user, staffAllowed, navigateTo]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center py-20 px-4 bg-[#0B0F10] text-[#F2F5F4]">
        <div className="w-9 h-9 border-2 border-[#6FD8B0] border-t-transparent rounded-full animate-spin mb-4" />
        <span className="text-xs font-semibold text-[#8FA1A8]">Verifying session access...</span>
      </div>
    );
  }

  // Strictly enforce /admin redirect to investor app when unauthenticated or lacking staff access
  if (requireAdmin) {
    if (!isAuthenticated || !user || !staffAllowed) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center py-20 px-4 bg-[#0B0F10] text-[#F2F5F4]">
          <div className="w-8 h-8 border-2 border-[#6FD8B0] border-t-transparent rounded-full animate-spin mb-3" />
          <span className="text-xs font-medium text-[#8FA1A8]">
            Redirecting to investor portal...
          </span>
        </div>
      );
    }
    return <>{children}</>;
  }

  // Investor route unauthenticated guard
  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center py-16 px-4 bg-[#0B0F10] text-[#F2F5F4]">
        <div className="max-w-md w-full bg-[#121A1F] p-8 sm:p-9 rounded-2xl border border-[#1F2C33] text-center space-y-5">
          <div className="w-12 h-12 rounded-xl bg-[#0B0F10] border border-[#1F2C33] text-[#6FD8B0] flex items-center justify-center mx-auto">
            <Lock className="w-6 h-6" />
          </div>

          <div className="space-y-2">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-[#6FD8B0] flex items-center justify-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Protected Route · Access Restricted</span>
            </div>
            <h2 className="text-2xl font-bold text-[#F2F5F4]">
              {title}
            </h2>
            <p className="text-xs text-[#8FA1A8] leading-relaxed">
              {description}
            </p>
          </div>

          <div className="pt-2">
            <button
              type="button"
              onClick={onNavigateLogin}
              className="w-full py-3 px-4 rounded-xl bg-[#6FD8B0] text-[#0B0F10] text-xs font-bold flex items-center justify-center gap-2 cursor-pointer hover:bg-[#5ec8a0] transition-colors"
            >
              <Shield className="w-4 h-4" />
              <span>Sign In to Access Route</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
