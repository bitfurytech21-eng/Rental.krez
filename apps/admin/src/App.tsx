/**
 * Standalone admin console. Reuses existing admin/auth providers and components
 * from apps/web to preserve behavior during extraction.
 */
import React, { useEffect, useState } from 'react';
import { AuthProvider, useAuth } from '@web/lib/auth';
import { ToastProvider } from '@web/context/ToastContext';
import { ConfigProvider } from '@web/context/ConfigContext';
import { AdminLoginPortal } from './components/admin/AdminLoginPortal';
import { AdminPanel } from './components/admin/AdminPanel';

function AdminShell() {
  const { user, isLoading } = useAuth() as any;
  const [, setTick] = useState(0);
  useEffect(() => { const t = setInterval(() => setTick(x => x + 1), 0); return () => clearInterval(t); }, []);

  if (isLoading) return <div className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center">Loading admin…</div>;
  if (!user || user.role !== 'admin') {
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
