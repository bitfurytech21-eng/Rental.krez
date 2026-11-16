import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useAuth } from '../../lib/auth';
import { useNavigation } from '../../context/NavigationContext';
import { portalApi } from '../services/portalApi';
import {
  PortalDashboardSummary,
  PortalNotification,
  PortalPortfolioData,
  PortalProfile,
  PortalProperty,
  PortalRoute,
  PortalTransaction,
} from '../types';

const PRIMARY_ROUTES = new Set<PortalRoute>(['overview', 'portfolio', 'explore', 'ledger', 'more']);

const ROUTE_TO_URL: Record<PortalRoute, string> = {
  overview: '/dashboard',
  portfolio: '/portfolio',
  explore: '/portal/explore',
  'property-detail': '/portal/property',
  ledger: '/transactions',
  more: '/portal/more',
  wallet: '/wallet',
  deposit: '/deposit',
  withdraw: '/withdraw',
  profile: '/profile',
  compliance: '/documents',
  reports: '/portal/reports',
  analytics: '/analytics',
  notifications: '/notifications',
  support: '/support',
};

export function resolvePortalRouteFromPath(path: string): { route: PortalRoute; propertySlug?: string } {
  const clean = (path.split('#')[0].split('?')[0] || '/').replace(/\/$/, '') || '/';
  if (clean.startsWith('/portal/property/')) {
    return { route: 'property-detail', propertySlug: decodeURIComponent(clean.replace('/portal/property/', '')) };
  }
  switch (clean) {
    case '/dashboard':
    case '/account':
      return { route: 'overview' };
    case '/portfolio':
      return { route: 'portfolio' };
    case '/portal/explore':
    case '/explore':
      return { route: 'explore' };
    case '/transactions':
    case '/portal/ledger':
    case '/distributions':
      return { route: 'ledger' };
    case '/portal/more':
    case '/more':
      return { route: 'more' };
    case '/wallet':
      return { route: 'wallet' };
    case '/deposit':
      return { route: 'deposit' };
    case '/withdraw':
      return { route: 'withdraw' };
    case '/profile':
      return { route: 'profile' };
    case '/documents':
    case '/verification':
    case '/portal/compliance':
      return { route: 'compliance' };
    case '/portal/reports':
    case '/reports':
      return { route: 'reports' };
    case '/analytics':
      return { route: 'analytics' };
    case '/notifications':
      return { route: 'notifications' };
    case '/support':
      return { route: 'support' };
    default:
      return { route: 'overview' };
  }
}

interface PortalContextValue {
  route: PortalRoute;
  isPrimaryRoute: boolean;
  selectedPropertySlug: string | null;
  canGoBack: boolean;
  navigatePortal: (nextRoute: PortalRoute, options?: { propertySlug?: string }) => void;
  goBack: () => void;
  exitToPublicSite: (path?: string) => void;

  // Live backend state
  loading: boolean;
  error: string | null;
  summary: PortalDashboardSummary | null;
  portfolio: PortalPortfolioData | null;
  balance: number;
  subBalances: Record<string, number>;
  properties: PortalProperty[];
  transactions: PortalTransaction[];
  notifications: PortalNotification[];
  unreadCount: number;
  profile: PortalProfile | null;

  // Shared UI filters
  exploreFilter: string;
  setExploreFilter: (val: string) => void;
  exploreSearch: string;
  setExploreSearch: (val: string) => void;
  ledgerFilter: string;
  setLedgerFilter: (val: string) => void;

  // Refreshers
  refreshAll: () => Promise<void>;
  refreshNotifications: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const PortalContext = createContext<PortalContextValue | null>(null);

export const PortalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const { currentPath, navigateTo } = useNavigation();

  const initial = resolvePortalRouteFromPath(currentPath);
  const [route, setRoute] = useState<PortalRoute>(initial.route);
  const [selectedPropertySlug, setSelectedPropertySlug] = useState<string | null>(initial.propertySlug || null);
  const [history, setHistory] = useState<Array<{ route: PortalRoute; propertySlug?: string }>>([]);

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<PortalDashboardSummary | null>(null);
  const [portfolio, setPortfolio] = useState<PortalPortfolioData | null>(null);
  const [balance, setBalance] = useState<number>(0);
  const [subBalances, setSubBalances] = useState<Record<string, number>>({ EUR: 0 });
  const [properties, setProperties] = useState<PortalProperty[]>([]);
  const [transactions, setTransactions] = useState<PortalTransaction[]>([]);
  const [notifications, setNotifications] = useState<PortalNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [profile, setProfile] = useState<PortalProfile | null>(null);

  const [exploreFilter, setExploreFilter] = useState<string>('All');
  const [exploreSearch, setExploreSearch] = useState<string>('');
  const [ledgerFilter, setLedgerFilter] = useState<string>('All');

  useEffect(() => {
    const resolved = resolvePortalRouteFromPath(currentPath);
    setRoute(resolved.route);
    if (resolved.propertySlug) {
      setSelectedPropertySlug(resolved.propertySlug);
    }
  }, [currentPath]);

  const refreshAll = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const [
        summaryRes,
        portfolioRes,
        walletRes,
        propsRes,
        txRes,
        notifRes,
        profileRes,
      ] = await Promise.all([
        portalApi.getDashboardSummary(),
        portalApi.getPortfolio(),
        portalApi.getWalletBalance(),
        portalApi.getProperties(),
        portalApi.getTransactions(),
        portalApi.getNotifications(),
        portalApi.getProfile(),
      ]);
      setSummary(summaryRes);
      setPortfolio(portfolioRes);
      setBalance(walletRes.balance);
      setSubBalances(walletRes.subBalances);
      setProperties(propsRes);
      setTransactions(txRes);
      setNotifications(notifRes.items);
      setUnreadCount(notifRes.unreadCount);
      setProfile(profileRes);
    } catch (err: any) {
      setError(err?.message || 'Unable to synchronize your investor portal with the server.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  const refreshNotifications = useCallback(async () => {
    if (!user) return;
    try {
      const res = await portalApi.getNotifications();
      setNotifications(res.items);
      setUnreadCount(res.unreadCount);
    } catch {
      // Keep existing state on silent background poll
    }
  }, [user]);

  const refreshProfile = useCallback(async () => {
    if (!user) return;
    try {
      const p = await portalApi.getProfile();
      setProfile(p);
    } catch {
      // Keep existing state
    }
  }, [user]);

  useEffect(() => {
    void refreshAll();
  }, [refreshAll]);

  const navigatePortal = useCallback(
    (nextRoute: PortalRoute, options?: { propertySlug?: string }) => {
      setHistory((prev) => [...prev.slice(-15), { route, propertySlug: selectedPropertySlug || undefined }]);
      setRoute(nextRoute);
      if (options?.propertySlug) {
        setSelectedPropertySlug(options.propertySlug);
      }
      const targetUrl =
        nextRoute === 'property-detail' && options?.propertySlug
          ? `/portal/property/${encodeURIComponent(options.propertySlug)}`
          : ROUTE_TO_URL[nextRoute];
      navigateTo(targetUrl);
    },
    [navigateTo, route, selectedPropertySlug]
  );

  const goBack = useCallback(() => {
    if (history.length > 0) {
      const prev = history[history.length - 1];
      setHistory((h) => h.slice(0, -1));
      setRoute(prev.route);
      setSelectedPropertySlug(prev.propertySlug || null);
      const targetUrl =
        prev.route === 'property-detail' && prev.propertySlug
          ? `/portal/property/${encodeURIComponent(prev.propertySlug)}`
          : ROUTE_TO_URL[prev.route];
      navigateTo(targetUrl);
      return;
    }
    navigatePortal('overview');
  }, [history, navigatePortal, navigateTo]);

  const exitToPublicSite = useCallback(
    (path = '/') => {
      navigateTo(path);
    },
    [navigateTo]
  );

  const isPrimaryRoute = PRIMARY_ROUTES.has(route);
  const canGoBack = !isPrimaryRoute || history.length > 0;

  return (
    <PortalContext.Provider
      value={{
        route,
        isPrimaryRoute,
        selectedPropertySlug,
        canGoBack,
        navigatePortal,
        goBack,
        exitToPublicSite,
        loading,
        error,
        summary,
        portfolio,
        balance,
        subBalances,
        properties,
        transactions,
        notifications,
        unreadCount,
        profile,
        exploreFilter,
        setExploreFilter,
        exploreSearch,
        setExploreSearch,
        ledgerFilter,
        setLedgerFilter,
        refreshAll,
        refreshNotifications,
        refreshProfile,
      }}
    >
      {children}
    </PortalContext.Provider>
  );
};

export function usePortal(): PortalContextValue {
  const ctx = useContext(PortalContext);
  if (!ctx) {
    throw new Error('usePortal must be used within a PortalProvider');
  }
  return ctx;
}
