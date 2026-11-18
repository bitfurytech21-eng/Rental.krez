import React from 'react';
import { useAuth } from '../lib/auth';
import './styles/portal.css';
import { useToast } from '../context/ToastContext';
import { PortalProvider, usePortal } from './state/PortalContext';
import { LoadingSkeleton, ErrorBanner } from './components/LoadingSkeleton';
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
  const {
    route,
    selectedPropertySlug,
    sampleDataEnabled,
    setSampleDataEnabled,
    loading,
    error,
    refreshAll,
    legalReacceptanceRequired,
    legalReacceptanceLoading,
    legalReacceptanceCheckFailed,
    legalReacceptanceError,
    legalReacceptanceSubmitting,
    refreshLegalReacceptance,
    acceptLatestLegalTerms,
  } = usePortal();
  const mainRef = React.useRef<HTMLElement | null>(null);

  React.useEffect(() => {
    if (mainRef.current) {
      mainRef.current.scrollTop = 0;
    }
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0 });
    }
  }, [route, selectedPropertySlug]);

  if (legalReacceptanceLoading) {
    return (
      <main className="fixed inset-0 z-[10000] flex min-h-screen items-center justify-center bg-[#0B0F10] px-5 text-[#F2F5F4]">
        <div className="text-center" role="status" aria-live="polite">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-[#26383A] border-t-[#6FD8B0]" />
          <p className="text-sm font-semibold">Checking your legal acceptance…</p>
        </div>
      </main>
    );
  }

  if (legalReacceptanceCheckFailed) {
    return (
      <main className="fixed inset-0 z-[10000] flex min-h-screen items-center justify-center bg-[#0B0F10] px-5 py-10 text-[#F2F5F4]">
        <section className="w-full max-w-xl rounded-3xl border border-[#26383A] bg-[#11191B] p-7 shadow-2xl sm:p-10">
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#6FD8B0]">Legal acceptance</p>
          <h1 className="mt-3 text-2xl font-bold">We couldn’t verify your acceptance</h1>
          <p className="mt-3 text-sm leading-6 text-[#A9B8B5]">
            Your account remains restricted from money actions until the current legal versions can be checked.
          </p>
          {legalReacceptanceError && (
            <p role="alert" className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
              {legalReacceptanceError}
            </p>
          )}
          <button
            type="button"
            onClick={() => { void refreshLegalReacceptance(); }}
            className="mt-6 min-h-12 w-full rounded-xl bg-[#6FD8B0] px-5 py-3 text-sm font-bold text-[#07110F] hover:bg-[#8BE5C2]"
          >
            Retry
          </button>
        </section>
      </main>
    );
  }

  if (legalReacceptanceRequired) {
    return (
      <main className="fixed inset-0 z-[10000] flex min-h-screen items-center justify-center overflow-y-auto bg-[#0B0F10] px-5 py-10 text-[#F2F5F4]">
        <section
          role="dialog"
          aria-modal="true"
          aria-labelledby="legal-reacceptance-title"
          className="my-auto w-full max-w-xl rounded-3xl border border-[#26383A] bg-[#11191B] p-7 shadow-2xl sm:p-10"
        >
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#6FD8B0]">Account update required</p>
          <h1 id="legal-reacceptance-title" className="mt-3 text-2xl font-bold sm:text-3xl">
            We’ve updated our terms
          </h1>
          <p className="mt-3 text-sm leading-6 text-[#A9B8B5]">
            Please review the latest documents before continuing to your account. Money actions remain unavailable until you accept.
          </p>

          <div className="mt-7 space-y-3">
            <a href="/terms" target="_blank" rel="noreferrer" className="flex min-h-12 items-center justify-between rounded-xl border border-[#26383A] px-4 py-3 text-sm font-semibold text-[#F2F5F4] hover:border-[#6FD8B0]">
              <span>Terms and Conditions</span><span aria-hidden="true">↗</span>
            </a>
            <a href="/privacy" target="_blank" rel="noreferrer" className="flex min-h-12 items-center justify-between rounded-xl border border-[#26383A] px-4 py-3 text-sm font-semibold text-[#F2F5F4] hover:border-[#6FD8B0]">
              <span>Privacy Policy</span><span aria-hidden="true">↗</span>
            </a>
            <a href="/risk-warning" target="_blank" rel="noreferrer" className="flex min-h-12 items-center justify-between rounded-xl border border-[#26383A] px-4 py-3 text-sm font-semibold text-[#F2F5F4] hover:border-[#6FD8B0]">
              <span>Risk Warning</span><span aria-hidden="true">↗</span>
            </a>
          </div>

          {legalReacceptanceError && (
            <p role="alert" className="mt-5 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
              {legalReacceptanceError}
            </p>
          )}

          <button
            type="button"
            disabled={legalReacceptanceSubmitting}
            onClick={async () => {
              try {
                await acceptLatestLegalTerms();
              } catch {
                // The database message is retained and displayed above the button.
              }
            }}
            className="mt-7 min-h-12 w-full rounded-xl bg-[#6FD8B0] px-5 py-3 text-sm font-bold text-[#07110F] hover:bg-[#8BE5C2] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {legalReacceptanceSubmitting ? 'Saving acceptance…' : 'Accept'}
          </button>
        </section>
      </main>
    );
  }

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
            {loading && !sampleDataEnabled ? (
              <LoadingSkeleton rows={5} />
            ) : (
              <>
                {error && <ErrorBanner message={error} onRetry={() => void refreshAll()} />}
                {renderRoute()}
              </>
            )}
          </div>
        </main>
        <BottomNav />
      </div>
    </div>
  );
};

const PortalAuthGate: React.FC = () => {
  const { user, isLoading } = useAuth();

  React.useEffect(() => {
    if (!isLoading && !user && typeof window !== 'undefined') {
      window.location.replace('/#login');
    }
  }, [isLoading, user]);

  if (isLoading || !user) return null;
  return (
    <PortalProvider>
      <PortalLayout />
    </PortalProvider>
  );
};

export const PortalShell: React.FC = () => <PortalAuthGate />;
