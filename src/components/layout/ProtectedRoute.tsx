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
  const { user, isAuthenticated, isLoading, quickDemoSession } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center py-20 px-4 bg-[#F6F7F4]">
        <div className="w-10 h-10 border-3 border-[#182D2A] border-t-transparent rounded-full animate-spin mb-4" />
        <span className="text-xs font-bold text-[#69736F]">Verifying session security...</span>
      </div>
    );
  }

  // Enforce access control: Not authenticated
  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center py-16 px-4 bg-[#F6F7F4]">
        <div className="max-w-md w-full bg-white p-8 rounded-3xl border border-[#E3E8E3] shadow-md text-center space-y-5">
          <div className="w-14 h-14 rounded-2xl bg-[#EEF1EC] text-[#182D2A] flex items-center justify-center mx-auto shadow-sm">
            <Lock className="w-7 h-7 text-[#27845D]" />
          </div>

          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#F6F7F4] border border-[#E3E8E3] text-[11px] font-bold text-[#182D2A]">
              <ShieldCheck className="w-3.5 h-3.5 text-[#27845D]" />
              <span>{requireAdmin ? 'Admin Route' : 'Protected Route'} · Access Restricted</span>
            </div>
            <h2 className="text-2xl font-black text-[#18211F]">
              {requireAdmin ? 'Administrator Access Required' : title}
            </h2>
            <p className="text-xs text-[#69736F] leading-relaxed">
              {requireAdmin 
                ? 'Sign in with administrator credentials (admin@kretz.com) to access the system console, audit logs, and transaction approvals.'
                : description}
            </p>
          </div>

          <div className="pt-2 flex flex-col gap-2.5">
            {requireAdmin ? (
              <>
                <button
                  type="button"
                  onClick={async () => {
                    await quickDemoSession('admin');
                  }}
                  className="btn btn-primary w-full text-xs font-bold py-3.5 flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>1-Click Sign In as Admin (admin@kretz.com)</span>
                </button>
                <button
                  type="button"
                  onClick={onNavigateLogin}
                  className="btn btn-secondary w-full text-xs font-bold py-3 flex items-center justify-center gap-2 cursor-pointer bg-slate-900 text-white hover:bg-slate-800"
                >
                  <Shield className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Open Dedicated Admin Login Portal</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={onNavigateLogin}
                  className="btn btn-primary w-full text-xs font-bold py-3.5 flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                >
                  <span>Sign In to Access Route</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    await quickDemoSession('investor');
                  }}
                  className="btn btn-secondary w-full text-xs font-semibold py-3 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>1-Click Demo Investor Sign In</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Enforce role-based access control for administrative routes
  if (requireAdmin && user.role !== 'admin') {
    return (
      <div className="min-h-[70vh] flex items-center justify-center py-16 px-4 bg-[#F6F7F4]">
        <div className="max-w-md w-full bg-white p-8 rounded-3xl border border-red-200 shadow-md text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto">
            <ShieldAlert className="w-7 h-7" />
          </div>

          <div className="space-y-2">
            <span className="text-[11px] uppercase font-bold text-red-700 bg-red-100 px-3 py-1 rounded-full">
              403 Forbidden
            </span>
            <h2 className="text-2xl font-black text-[#18211F]">Administrator Access Only</h2>
            <p className="text-xs text-[#69736F] leading-relaxed">
              Your active session (<strong>{user.email}</strong>) has the <strong>{user.role}</strong> role. 
              Only accounts with the <code>admin</code> role can view this console.
            </p>
          </div>

          <div className="pt-2 flex flex-col gap-2">
            <button
              type="button"
              onClick={async () => {
                await quickDemoSession('admin');
              }}
              className="btn btn-primary w-full text-xs font-bold py-3 flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Switch to Administrator (admin@kretz.com)</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
