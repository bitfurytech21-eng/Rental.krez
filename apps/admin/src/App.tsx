import React from 'react';
import { AuthProvider, useAuth } from '@web/lib/auth';
import { ToastProvider } from '@web/context/ToastContext';
import { ConfigProvider } from '@web/context/ConfigContext';
import { AdminPanel } from './components/admin/AdminPanel';
import { hasAdminRole } from '@rental-log/auth';

function AdminShell() {
  const { user, isLoading } = useAuth() as any;
  if (isLoading) return <div className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center">Loading admin…</div>;
  if (!user || !hasAdminRole(user)) {
    return (
      <div className="min-h-screen bg-[#080d11] text-white flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-[#0d161d] border border-red-500/30 rounded-2xl p-8 text-center shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 mx-auto flex items-center justify-center mb-5">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 11h14M5 11a2 2 0 114 0 2 2 0 01-4 0zM13 10a2 2 0 01-2-2h-2a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 012-2z"></path></svg>
          </div>
          <h2 className="text-xl font-serif font-light text-white mb-2">Administrator Access Required</h2>
          <p className="text-sm text-gray-400 mb-6 leading-relaxed">
            This administration console is strictly restricted to verified system operators. You must authenticate with valid administrator credentials.
          </p>
          <button
            type="button"
            onClick={() => { window.location.hash = '#/admin/login'; window.location.reload(); }}
            className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs tracking-widest uppercase rounded-xl transition shadow-lg shadow-emerald-900/30 cursor-pointer"
          >
            Go to Admin Login
          </button>
        </div>
      </div>
    );
  }
  return <AdminPanel />;
}

export function App() {
  return (
    <ConfigProvider>
      <ToastProvider>
        <AuthProvider>
          <AdminShell />
        </AuthProvider>
      </ToastProvider>
    </ConfigProvider>
  );
}