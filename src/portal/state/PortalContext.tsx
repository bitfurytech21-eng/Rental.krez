import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../../lib/auth';
import { safeErrorMessage } from '../../lib/safeErrorMessage';
import { supabase, isSupabaseConfigured } from '../../lib/supabaseClient';
import { useNavigation } from '../../context/NavigationContext';
import { portalApi } from '../services/portalApi';
import { PORTAL_PLACEHOLDER_CONFIG } from '../config/portalConfig';
import { buildSamplePortalDataset, SamplePortalDataset } from '../config/samplePortalData';
import {
  PortalAssignedBankAccount,
  PortalConfig,
  PortalDashboardSummary,
  PortalNotification,
  PortalPortfolioData,
  PortalProfile,
  PortalProperty,
  PortalRoute,
  PortalTransaction,
} from '../types';

const SAMPLE_DATA_STORAGE_KEY = 'portal_sample_data_enabled';

const PRIMARY_ROUTES = new Set<PortalRoute>(['overview', 'portfolio', 'explore', 'ledger', 'more']);

const MORE_CHILD_ROUTES = new Set<PortalRoute>([
  'wallet',
  'deposit',
  'withdraw',
  'profile',
  'compliance',
  'reports',
  'analytics',
  'notifications',
  'support',
]);

const ROUTE_TO_HASH: Record<PortalRoute, string> = {
  overview: '#/overview',
  portfolio: '#/portfolio',
  explore: '#/explore',
  'property-detail': '#/property',
  ledger: '#/ledger',
  more: '#/more',
  wallet: '#/wallet',
  deposit: '#/deposit',
  withdraw: '#/withdraw',
  profile: '#/profile',
  compliance: '#/compliance',
  reports: '#/reports',
  analytics: '#/analytics',
  notifications: '#/notifications',
  support: '#/support',
};

export function resolvePortalRouteFromHash(hash?: string): { route: PortalRoute; propertySlug?: string } | null {
  if (!hash) return null;
  const normalized = hash.replace(/^#/, '').replace(/^\/+/, '').split('?')[0].replace(/\/+$/, '').trim();
  if (!normalized) return null;

  if (normalized.startsWith('property/')) {
    const slug = decodeURIComponent(normalized.slice('property/'.length));
    return slug ? { route: 'property-detail', propertySlug: slug } : { route: 'explore' };
  }
  if (normalized.startsWith('portal/property/')) {
    const slug = decodeURIComponent(normalized.slice('portal/property/'.length));
    return slug ? { route: 'property-detail', propertySlug: slug } : { route: 'explore' };
  }

  switch (normalized) {
    case 'overview':
    case 'dashboard':
    case 'account':
      return { route: 'overview' };
    case 'portfolio':
      return { route: 'portfolio' };
    case 'explore':
    case 'portal/explore':
      return { route: 'explore' };
    case 'ledger':
    case 'transactions':
    case 'portal/ledger':
    case 'distributions':
      return { route: 'ledger' };
    case 'more':
    case 'portal/more':
      return { route: 'more' };
    case 'wallet':
      return { route: 'wallet' };
    case 'deposit':
      return { route: 'deposit' };
    case 'withdraw':
      return { route: 'withdraw' };
    case 'profile':
      return { route: 'profile' };
    case 'compliance':
    case 'documents':
    case 'verification':
    case 'portal/compliance':
      return { route: 'compliance' };
    case 'reports':
    case 'portal/reports':
      return { route: 'reports' };
    case 'analytics':
      return { route: 'analytics' };
    case 'notifications':
      return { route: 'notifications' };
    case 'support':
      return { route: 'support' };
    default:
      return null;
  }
}

export function resolvePortalRouteFromPath(path: string): { route: PortalRoute; propertySlug?: string } {
  const clean = (path.split('#')[0].split('?')[0] || '/').replace(/\/$/, '') || '/';
  if (clean.startsWith('/portal/property/')) {
    return { route: 'property-detail', propertySlug: decodeURIComponent(clean.replace('/portal/property/', '')) };
  }
  switch (clean) {
    case '/dashboard':
    case '/overview':
    case '/account':
      return { route: 'overview' };
    case '/portfolio':
      return { route: 'portfolio' };
    case '/portal/explore':
    case '/explore':
      return { route: 'explore' };
    case '/ledger':
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

function buildPortalHash(route: PortalRoute, propertySlug?: string | null): string {
  if (route === 'property-detail' && propertySlug) {
    return `#/property/${encodeURIComponent(propertySlug)}`;
  }
  return ROUTE_TO_HASH[route] || '#/overview';
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
  lastSyncedAt: Date | null;
  portalConfig: PortalConfig;
  summary: PortalDashboardSummary | null;
  portfolio: PortalPortfolioData | null;
  balance: number;
  balanceCents: number;
  availableBalance: number;
  availableCents: number;
  assignedBankAccount: PortalAssignedBankAccount | null;
  subBalances: Record<string, number>;
  properties: PortalProperty[];
  transactions: PortalTransaction[];
  notifications: PortalNotification[];
  unreadCount: number;
  profile: PortalProfile | null;

  // Sample data mode toggle (default OFF so real/empty states render cleanly)
  sampleDataEnabled: boolean;
  setSampleDataEnabled: (enabled: boolean) => void;
  sampleDataset: SamplePortalDataset | null;

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

  const resolveInitialState = (): { route: PortalRoute; propertySlug?: string } => {
    if (typeof window !== 'undefined') {
      const fromHash = resolvePortalRouteFromHash(window.location.hash);
      if (fromHash) return fromHash;
    }
    return resolvePortalRouteFromPath(currentPath);
  };

  const initial = resolveInitialState();
  const [route, setRoute] = useState<PortalRoute>(initial.route);
  const [selectedPropertySlug, setSelectedPropertySlug] = useState<string | null>(initial.propertySlug || null);
  const [portalHistoryDepth, setPortalHistoryDepth] = useState<number>(0);
  const pathRef = useRef<string>(currentPath);

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const [portalConfig, setPortalConfig] = useState<PortalConfig>(PORTAL_PLACEHOLDER_CONFIG);
  const [summary, setSummary] = useState<PortalDashboardSummary | null>(null);
  const [portfolio, setPortfolio] = useState<PortalPortfolioData | null>(null);
  const [balance, setBalance] = useState<number>(0);
  const [balanceCents, setBalanceCents] = useState<number>(0);
  const [availableBalance, setAvailableBalance] = useState<number>(0);
  const [availableCents, setAvailableCents] = useState<number>(0);
  const [assignedBankAccount, setAssignedBankAccount] = useState<PortalAssignedBankAccount | null>(null);
  const [subBalances, setSubBalances] = useState<Record<string, number>>({ EUR: 0 });
  const [properties, setProperties] = useState<PortalProperty[]>([]);
  const [transactions, setTransactions] = useState<PortalTransaction[]>([]);
  const [notifications, setNotifications] = useState<PortalNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [profile, setProfile] = useState<PortalProfile | null>(null);

  const [sampleDataEnabled, setSampleDataState] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    try {
      return window.sessionStorage.getItem(SAMPLE_DATA_STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  });

  const setSampleDataEnabled = useCallback((enabled: boolean) => {
    setSampleDataState(enabled);
    if (typeof window !== 'undefined') {
      try {
        if (enabled) {
          window.sessionStorage.setItem(SAMPLE_DATA_STORAGE_KEY, 'true');
        } else {
          window.sessionStorage.removeItem(SAMPLE_DATA_STORAGE_KEY);
        }
      } catch {
        // Ignore storage restrictions
      }
    }
  }, []);

  const [exploreFilter, setExploreFilter] = useState<string>('All');
  const [exploreSearch, setExploreSearch] = useState<string>('');
  const [ledgerFilter, setLedgerFilter] = useState<string>('All');

  // Ensure an initial canonical hash exists so the first browser back entry works cleanly
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const fromHash = resolvePortalRouteFromHash(window.location.hash);
    if (!fromHash) {
      const resolved = resolvePortalRouteFromPath(currentPath);
      const targetHash = buildPortalHash(resolved.route, resolved.propertySlug);
      try {
        window.history.replaceState(
          null,
          '',
          `${window.location.pathname}${window.location.search}${targetHash}`
        );
      } catch {
        // Fallback silently if replaceState is unavailable
      }
    }
  }, []);

  // React to top-level NavigationProvider route changes only if the pathname changed without a hash
  useEffect(() => {
    if (pathRef.current === currentPath) return;
    pathRef.current = currentPath;
    if (typeof window !== 'undefined') {
      const fromHash = resolvePortalRouteFromHash(window.location.hash);
      if (fromHash) {
        setRoute(fromHash.route);
        setSelectedPropertySlug(fromHash.propertySlug || null);
        return;
      }
    }
    const resolved = resolvePortalRouteFromPath(currentPath);
    setRoute(resolved.route);
    setSelectedPropertySlug(resolved.propertySlug || null);
  }, [currentPath]);

  // Listen to browser hashchange & popstate for back/forward hash navigation
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const syncFromLocation = () => {
      const fromHash = resolvePortalRouteFromHash(window.location.hash);
      if (fromHash) {
        setRoute(fromHash.route);
        setSelectedPropertySlug(fromHash.propertySlug || null);
        return;
      }
      const fromPath = resolvePortalRouteFromPath(window.location.pathname);
      setRoute(fromPath.route);
      setSelectedPropertySlug(fromPath.propertySlug || null);
    };

    window.addEventListener('hashchange', syncFromLocation);
    window.addEventListener('popstate', syncFromLocation);
    return () => {
      window.removeEventListener('hashchange', syncFromLocation);
      window.removeEventListener('popstate', syncFromLocation);
    };
  }, []);

  const refreshAll = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const results = await Promise.allSettled([
        portalApi.getDashboardSummary(),
        portalApi.getPortfolio(),
        portalApi.getWalletBalance(),
        portalApi.getProperties(),
        portalApi.getTransactions(),
        portalApi.getNotifications(),
        portalApi.getProfile(),
        portalApi.getPaymentConfig().catch(() => PORTAL_PLACEHOLDER_CONFIG),
      ]);

      const [
        summaryResult,
        portfolioResult,
        walletResult,
        propsResult,
        txResult,
        notifResult,
        profileResult,
        configResult,
      ] = results;

      if (summaryResult.status === 'fulfilled') setSummary(summaryResult.value);
      if (portfolioResult.status === 'fulfilled') setPortfolio(portfolioResult.value);
      if (walletResult.status === 'fulfilled') {
        setBalance(walletResult.value.balance);
        setBalanceCents(walletResult.value.balanceCents);
        setAvailableBalance(walletResult.value.availableBalance);
        setAvailableCents(walletResult.value.availableCents);
        setSubBalances(walletResult.value.subBalances);
      }
      if (profileResult.status === 'fulfilled') {
        setProfile(profileResult.value);
      }
      if (walletResult.status === 'fulfilled' || profileResult.status === 'fulfilled') {
        const walletGate = walletResult.status === 'fulfilled' ? walletResult.value.assignedBankAccount : null;
        const profileGate = profileResult.status === 'fulfilled' ? profileResult.value.assignedBankAccount : null;
        setAssignedBankAccount(walletGate || profileGate || null);
      }
      if (propsResult.status === 'fulfilled') setProperties(propsResult.value);
      if (txResult.status === 'fulfilled') setTransactions(txResult.value);
      if (notifResult.status === 'fulfilled') {
        setNotifications(notifResult.value.items);
        setUnreadCount(notifResult.value.unreadCount);
      }
      if (configResult.status === 'fulfilled') setPortalConfig(configResult.value);

      const firstRejected = [
        summaryResult,
        portfolioResult,
        walletResult,
        propsResult,
        txResult,
        notifResult,
        profileResult,
      ].find((r): r is PromiseRejectedResult => r.status === 'rejected');

      if (firstRejected) {
        setError(safeErrorMessage(firstRejected.reason, 'Unable to synchronize your investor portal with the server.'));
      } else {
        setLastSyncedAt(new Date());
      }
    } catch (err: any) {
      setError(safeErrorMessage(err, 'Unable to synchronize your investor portal with the server.'));
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
      // Keep existing state on silent background refresh
    }
  }, [user]);

  const refreshFinancialData = useCallback(async () => {
    if (!user) return;
    try {
      const [summaryRes, portfolioRes, walletRes, txRes] = await Promise.all([
        portalApi.getDashboardSummary(),
        portalApi.getPortfolio(),
        portalApi.getWalletBalance(),
        portalApi.getTransactions(),
      ]);
      setSummary(summaryRes);
      setPortfolio(portfolioRes);
      setBalance(walletRes.balance);
      setBalanceCents(walletRes.balanceCents);
      setAvailableBalance(walletRes.availableBalance);
      setAvailableCents(walletRes.availableCents);
      if (walletRes.assignedBankAccount) {
        setAssignedBankAccount(walletRes.assignedBankAccount);
      }
      setSubBalances(walletRes.subBalances);
      setTransactions(txRes);
      setLastSyncedAt(new Date());
    } catch {
      // Preserve the last good snapshot if a background refresh fails.
    }
  }, [user]);

  const refreshProfile = useCallback(async () => {
    if (!user) return;
    try {
      const [p, walletRes, summaryRes] = await Promise.all([
        portalApi.getProfile(),
        portalApi.getWalletBalance(),
        portalApi.getDashboardSummary(),
      ]);
      setProfile(p);
      setBalance(walletRes.balance);
      setBalanceCents(walletRes.balanceCents);
      setAvailableBalance(walletRes.availableBalance);
      setAvailableCents(walletRes.availableCents);
      setAssignedBankAccount(walletRes.assignedBankAccount || p.assignedBankAccount || null);
      setSubBalances(walletRes.subBalances);
      setSummary(summaryRes);
      setLastSyncedAt(new Date());
    } catch {
      // Keep existing state if a background refresh fails.
    }
  }, [user]);

  // Drop user-scoped portal snapshots immediately when the authenticated user disappears or changes.
  useEffect(() => {
    if (user?.id) return;
    setSummary(null);
    setPortfolio(null);
    setBalance(0);
    setBalanceCents(0);
    setAvailableBalance(0);
    setAvailableCents(0);
    setAssignedBankAccount(null);
    setSubBalances({ EUR: 0 });
    setProperties([]);
    setTransactions([]);
    setNotifications([]);
    setUnreadCount(0);
    setProfile(null);
    setLastSyncedAt(null);
    setError(null);
    setLoading(false);
  }, [user?.id]);

  useEffect(() => {
    void refreshAll();
  }, [refreshAll]);

  // One user-scoped channel keeps the portal, transaction list, holdings and bell in sync.
  // Holdings are a view over investments, so listen to the underlying investments table.
  useEffect(() => {
    if (!user?.id || sampleDataEnabled || !isSupabaseConfigured()) return;

    let refreshTimer: ReturnType<typeof setTimeout> | null = null;
    const pendingRefreshes = new Map<string, () => void>();
    const schedule = (key: string, refresh: () => void) => {
      pendingRefreshes.set(key, refresh);
      if (refreshTimer) clearTimeout(refreshTimer);
      refreshTimer = setTimeout(() => {
        const refreshes = Array.from(pendingRefreshes.values());
        pendingRefreshes.clear();
        refreshes.forEach((run) => run());
      }, 180);
    };

    const channel = supabase
      .channel(`investor-portal-live:${user.id}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'ledger_transactions',
        filter: `user_id=eq.${user.id}`,
      }, () => schedule('financial', () => { void refreshFinancialData(); }))
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'investments',
        filter: `user_id=eq.${user.id}`,
      }, () => schedule('financial', () => { void refreshFinancialData(); }))
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'profiles',
        filter: `id=eq.${user.id}`,
      }, () => schedule('profile', () => { void refreshProfile(); }))
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'notifications',
        filter: `user_id=eq.${user.id}`,
      }, () => schedule('notifications', () => { void refreshNotifications(); }))
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'notifications',
        filter: 'user_id=is.null',
      }, () => schedule('notifications', () => { void refreshNotifications(); }))
      .subscribe((status, err) => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.warn('Investor live updates are temporarily unavailable.', err);
        }
      });

    return () => {
      if (refreshTimer) clearTimeout(refreshTimer);
      pendingRefreshes.clear();
      void supabase.removeChannel(channel);
    };
  }, [user?.id, sampleDataEnabled, refreshFinancialData, refreshProfile, refreshNotifications]);

  const navigatePortal = useCallback(
    (nextRoute: PortalRoute, options?: { propertySlug?: string }) => {
      const nextSlug =
        nextRoute === 'property-detail'
          ? options?.propertySlug || selectedPropertySlug
          : null;
      const targetHash = buildPortalHash(nextRoute, nextSlug);

      setRoute(nextRoute);
      if (nextRoute === 'property-detail' && nextSlug) {
        setSelectedPropertySlug(nextSlug);
      } else if (nextRoute !== 'property-detail') {
        setSelectedPropertySlug(null);
      }

      if (typeof window !== 'undefined' && window.location.hash !== targetHash) {
        setPortalHistoryDepth((d) => d + 1);
        window.location.hash = targetHash;
      }
    },
    [selectedPropertySlug]
  );

  const goBack = useCallback(() => {
    if (typeof window !== 'undefined' && portalHistoryDepth > 0) {
      setPortalHistoryDepth((d) => Math.max(0, d - 1));
      window.history.back();
      return;
    }
    if (route === 'property-detail') {
      navigatePortal('explore');
      return;
    }
    if (MORE_CHILD_ROUTES.has(route)) {
      navigatePortal('more');
      return;
    }
    navigatePortal('overview');
  }, [navigatePortal, portalHistoryDepth, route]);

  const exitToPublicSite = useCallback(
    (path = '/') => {
      navigateTo(path);
    },
    [navigateTo]
  );

  const isPrimaryRoute = PRIMARY_ROUTES.has(route);
  const canGoBack = !isPrimaryRoute;

  const sampleDataset = useMemo(
    () => (sampleDataEnabled ? buildSamplePortalDataset(profile) : null),
    [sampleDataEnabled, profile]
  );

  const effectiveProfile = useMemo(() => {
    if (!sampleDataset) return profile;
    if (!profile) {
      return {
        id: 'sample-user',
        email: user?.email || 'investor@sample.local',
        fullName: user?.fullName || 'Sample Investor',
        country: 'France',
        countryCode: 'FR',
        phoneNumber: '',
        accountType: 'individual_investor',
        balance: sampleDataset.balance,
        investedBalance: sampleDataset.summary.investedCapital,
        kycStatus: 'verified',
        status: 'active',
        address: '',
        city: 'Paris',
        postalCode: '75008',
        bankIban: sampleDataset.profileOverrides.bankIban || '',
        cryptoDepositAddress: '',
        taxId: '',
        dateOfBirth: '',
        createdAt: new Date().toISOString(),
      };
    }
    return {
      ...profile,
      ...sampleDataset.profileOverrides,
      balance: sampleDataset.balance,
    };
  }, [profile, sampleDataset, user]);

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
        lastSyncedAt,
        portalConfig,
        summary: sampleDataset ? sampleDataset.summary : summary,
        portfolio: sampleDataset ? sampleDataset.portfolio : portfolio,
        balance: sampleDataset ? sampleDataset.balance : balance,
        balanceCents: sampleDataset ? Math.round(sampleDataset.balance * 100) : balanceCents,
        availableBalance: sampleDataset ? sampleDataset.balance : availableBalance,
        availableCents: sampleDataset ? Math.round(sampleDataset.balance * 100) : availableCents,
        assignedBankAccount: sampleDataset ? portalConfig.traditional : assignedBankAccount,
        subBalances: sampleDataset ? sampleDataset.subBalances : subBalances,
        properties: sampleDataset ? sampleDataset.properties : properties,
        transactions: sampleDataset ? sampleDataset.transactions : transactions,
        notifications: sampleDataset ? sampleDataset.notifications : notifications,
        unreadCount: sampleDataset ? sampleDataset.unreadCount : unreadCount,
        profile: effectiveProfile,
        sampleDataEnabled,
        setSampleDataEnabled,
        sampleDataset,
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
