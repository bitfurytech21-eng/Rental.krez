import React from 'react';
import { useAuth } from '../../lib/auth';
import { ShieldAlert, Lock, ArrowRight, ShieldCheck, Shield } from 'lucide-react';

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

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center py-20 px-4 bg-[#F6F7F4]">
        <div className="w-10 h-10 border-3 border-[#182D2A] border-t-transparent rounded-full animate-spin mb-4" />
        <span className="text-xs font-bold text-[#69736F]">Verifying session security...</span>
      </div>
    );
  }

  // Not authenticated
  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center py-16 px-4 bg-[#F6F7F4]">
        <div className="max-w-md w-full bg-white p-8 sm:p-9 rounded-3xl border border-[#E3E8E3] shadow-md text-center space-y-5">
          <div className="w-14 h-14 rounded-2xl bg-[#EEF1EC] text-[#182D2A] flex items-center justify-center mx-auto shadow-xs">
            <Lock className="w-7 h-7 text-[#27845D]" />
          </div>

          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#F6F7F4] border border-[#E3E8E3] text-[11px] font-bold text-[#182D2A]">
              <ShieldCheck className="w-3.5 h-3.5 text-[#27845D]" />
              <span>{requireAdmin ? 'Administrative Console' : 'Protected Route'} · Access Restricted</span>
            </div>
            <h2 className="text-2xl font-black text-[#18211F]">
              {requireAdmin ? 'Administrator Access Required' : title}
            </h2>
            <p className="text-xs text-[#69736F] leading-relaxed">
              {requireAdmin 
                ? 'Sign in with your configured administrator credentials to access the system console, audit logs, and compliance controls.'
                : description}
            </p>
          </div>

          <div className="pt-2">
            <button
              type="button"
              onClick={onNavigateLogin}
              className="btn btn-primary w-full text-xs font-bold py-3.5 flex items-center justify-center gap-2 cursor-pointer shadow-sm hover:opacity-95 transition-all"
            >
              <Shield className="w-4 h-4 text-[#B7E36A]" />
              <span>{requireAdmin ? 'Sign In as Administrator' : 'Sign In to Access Route'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Role-based access control: Non-admin trying to access administrative routes
  if (requireAdmin && user.role !== 'admin') {
    return (
      <div className="min-h-[70vh] flex items-center justify-center py-16 px-4 bg-[#F6F7F4]">
        <div className="max-w-md w-full bg-white p-8 sm:p-9 rounded-3xl border border-red-200 shadow-md text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto">
            <ShieldAlert className="w-7 h-7" />
          </div>

          <div className="space-y-2">
            <span className="text-[11px] uppercase font-bold text-red-700 bg-red-100 px-3 py-1 rounded-full">
              403 Forbidden · Unauthorized
            </span>
            <h2 className="text-2xl font-black text-[#18211F]">Administrator Access Only</h2>
            <p className="text-xs text-[#69736F] leading-relaxed">
              Your active session (<strong>{user.email}</strong>) is an investor account. 
              Only verified platform administrators can access this console.
            </p>
          </div>

          <div className="pt-2 flex flex-col gap-2.5">
            <button
              type="button"
              onClick={onNavigateLogin}
              className="btn btn-primary w-full text-xs font-bold py-3.5 flex items-center justify-center gap-2 cursor-pointer shadow-sm"
            >
              <Shield className="w-4 h-4 text-[#B7E36A]" />
              <span>Switch to Administrator Account</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
