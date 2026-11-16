import React from 'react';
import './styles/portal.css';
import { useToast } from '../context/ToastContext';
import { PortalProvider, usePortal } from './state/PortalContext';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';
import { OverviewPage } from './pages/OverviewPage';
import { PortfolioPage } from './pages/PortfolioPage';
import { ExplorePage } from './pages/ExplorePage';
import { PropertyDetailPage } from './pages/PropertyDetailPage';
import { LedgerPage } from './pages/LedgerPage';
import { MorePage } from './pages/MorePage';
import { WalletPage } from './pages/WalletPage';
import { DepositPage } from './pages/DepositPage';
import { WithdrawPage } from './pages/WithdrawPage';
import { ProfilePage } from './pages/ProfilePage';
import { CompliancePage } from './pages/CompliancePage';
import { ReportsPage } from './pages/ReportsPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { NotificationsPage } from './pages/NotificationsPage';
import { SupportPage } from './pages/SupportPage';

const PortalLayout: React.FC = () => {
  const toast = useToast();
  const { route, selectedPropertySlug, sampleDataEnabled, setSampleDataEnabled } = usePortal();
  const mainRef = React.useRef<HTMLElement | null>(null);

  React.useEffect(() => {
    if (mainRef.current) {
      mainRef.current.scrollTop = 0;
    }
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0 });
    }
  }, [route, selectedPropertySlug]);

  const renderRoute = () => {
    switch (route) {
      case 'overview':
        return <OverviewPage />;
      case 'portfolio':
        return <PortfolioPage />;
      case 'explore':
        return <ExplorePage />;
      case 'property-detail':
        return <PropertyDetailPage />;
      case 'ledger':
        return <LedgerPage />;
      case 'more':
        return <MorePage />;
      case 'wallet':
        return <WalletPage />;
      case 'deposit':
        return <DepositPage />;
      case 'withdraw':
        return <WithdrawPage />;
      case 'profile':
        return <ProfilePage />;
      case 'compliance':
        return <CompliancePage />;
      case 'reports':
        return <ReportsPage />;
      case 'analytics':
        return <AnalyticsPage />;
      case 'notifications':
        return <NotificationsPage />;
      case 'support':
        return <SupportPage />;
      default:
        return <OverviewPage />;
    }
  };

  return (
    <div className="portal-shell flex min-h-screen lg:h-screen lg:overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 lg:overflow-hidden">
        <Header />
        <main ref={mainRef} className="flex-1 overflow-y-auto py-5 sm:py-6 portal-safe-main">
          <div className="mx-auto max-w-6xl space-y-5">
            {sampleDataEnabled && (
              <div
                role="status"
                className="rounded-[14px] border border-[#FCD34D]/40 bg-[#121A1F] px-4 py-2.5 flex flex-wrap items-center justify-between gap-3"
              >
                <span className="text-xs font-medium text-[#FCD34D]">
                  Sample data is active for previewing populated views.
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setSampleDataEnabled(false);
                    toast.info('Switched back to live account data.');
                  }}
                  className="min-h-[44px] px-3 rounded-[14px] border border-[#1F2C33] text-xs font-semibold text-[#F2F5F4] hover:border-[#6FD8B0] transition-colors"
                >
                  Use live data
                </button>
              </div>
            )}
            {renderRoute()}
          </div>
        </main>
        <BottomNav />
      </div>
    </div>
  );
};

export const PortalShell: React.FC = () => {
  return (
    <PortalProvider>
      <PortalLayout />
    </PortalProvider>
  );
};
