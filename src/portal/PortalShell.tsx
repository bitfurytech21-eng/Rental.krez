import React from 'react';
import './styles/portal.css';
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
  const { route } = usePortal();

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
        <main className="flex-1 overflow-y-auto px-4 sm:px-6 py-5 sm:py-6 pb-8">
          <div className="mx-auto max-w-6xl">{renderRoute()}</div>
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
