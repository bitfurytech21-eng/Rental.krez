import React from 'react';
import { AuthProvider, useAuth } from '@web/lib/auth';
import { ToastProvider } from '@web/context/ToastContext';
import { ConfigProvider } from '@web/context/ConfigContext';
import { AdminLoginPortal } from './components/admin/AdminLoginPortal';
import { AdminPanel } from './components/admin/AdminPanel';
import { hasAdminRole } from '@rental-log/auth';

function AdminShell() {
  const { user, isLoading } = useAuth() as any;
  if (isLoading) return <div className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center">Loading admin…</div>;
  if (!user || !hasAdminRole(user)) {
    return (
      <AdminLoginPortal
        onLoginSuccess={() => { window.location.hash = '#/admin'; window.location.reload(); }}
        onNavigateCustomerLogin={() => { window.location.href = (import.meta.env.VITE_WEB_URL || '/') + 'login'; }}
        onNavigateHome={() => { window.location.href = import.meta.env.VITE_WEB_URL || '/'; }}
      />
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
