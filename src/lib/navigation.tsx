import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { GlobalPageLoader } from '../components/common/GlobalPageLoader';

export interface NavigateOptions {
  /** Optional promise or async function representing data fetching or page readiness */
  dataPromise?: Promise<any> | (() => Promise<any>);
  /** Whether this navigation was initiated by browser popstate (back/forward) */
  fromPopstate?: boolean;
  /** Custom minimum duration in milliseconds (strictly defaults to 5000ms) */
  minDuration?: number;
  /** Whether to bypass the loader for special cases (default: false) */
  bypassLoader?: boolean;
}

export interface NavigationContextValue {
  /** The currently active URL path (e.g. '/properties', '/dashboard') */
  currentPath: string;
  /** The destination path currently being navigated to, or null if idle */
  pendingPath: string | null;
  /** True while an internal page transition is taking place */
  isNavigating: boolean;
  /** Programmatically navigate to an internal route with the 5-second transition */
  navigateTo: (path: string, options?: NavigateOptions) => Promise<void>;
  /** Register an async data promise that must finish before the transition dismisses */
  registerDataPromise: (promise: Promise<any>) => void;
}

const NavigationContext = createContext<NavigationContextValue | null>(null);

/**
 * Standard utility to parse the current route from window.location (pathname or hash)
 */
export const getPathFromLocation = (): string => {
  if (typeof window === 'undefined') return '/';
  const rawHash = window.location.hash.replace(/^#/, '').trim();
  if (rawHash && rawHash !== '/') {
    return rawHash.startsWith('/') ? rawHash : `/${rawHash}`;
  }
  const path = window.location.pathname || '/';
  return path;
};

/**
 * Clean and normalize route paths
 */
export const cleanRoutePath = (path: string): string => {
  if (!path || path === '' || path === '/') return '/';
  const trimmed = path.trim();
  if (trimmed.startsWith('#')) {
    const afterHash = trimmed.replace(/^#/, '').trim();
    return afterHash.startsWith('/') ? afterHash : `/${afterHash}`;
  }
  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
};

const MIN_TRANSITION_MS = 250; // Smooth 250ms page transition
const FADE_OUT_DURATION_MS = 180; // Crisp exit animation duration
const SAFETY_TIMEOUT_MS = 3000; // 3s emergency fallback to prevent hanging

export interface NavigationProviderProps {
  children: React.ReactNode;
  /** Enable initial loader on direct URL access (default: false for instant render) */
  enableInitialLoader?: boolean;
}

export const NavigationProvider: React.FC<NavigationProviderProps> = ({
  children,
  enableInitialLoader = false,
}) => {
  const [currentPath, setCurrentPath] = useState<string>(getPathFromLocation);
  const [pendingPath, setPendingPath] = useState<string | null>(null);
  const [isNavigating, setIsNavigating] = useState<boolean>(false);
  const [isOverlayVisible, setIsOverlayVisible] = useState<boolean>(false);
  const [isFadingOut, setIsFadingOut] = useState<boolean>(false);

  // References to track ongoing transitions and prevent race conditions
  const activeTransitionIdRef = useRef<number>(0);
  const registeredPromisesRef = useRef<Promise<any>[]>([]);
  const isTransitionActiveRef = useRef<boolean>(false);
  const currentPathRef = useRef<string>(currentPath);

  // Sync ref
  useEffect(() => {
    currentPathRef.current = currentPath;
  }, [currentPath]);

  /**
   * Register a dynamic data promise that the transition must wait for
   */
  const registerDataPromise = useCallback((promise: Promise<any>) => {
    if (promise && typeof promise.then === 'function') {
      registeredPromisesRef.current.push(promise);
    }
  }, []);

  /**
   * Primary internal page transition coordinator
   */
  const navigateTo = useCallback(async (path: string, options?: NavigateOptions): Promise<void> => {
    const targetPath = cleanRoutePath(path);

    // If bypassing loader is explicitly requested (e.g. silent route update)
    if (options?.bypassLoader) {
      setCurrentPath(targetPath);
      currentPathRef.current = targetPath;
      if (!options.fromPopstate) {
        try {
          window.history.pushState({}, '', targetPath);
        } catch {
          // safe fallback
        }
      }
      return;
    }

    // Prevent duplicate clicks and simultaneous overlays for the exact same destination
    if (isTransitionActiveRef.current && pendingPath === targetPath) {
      return;
    }

    const transitionId = ++activeTransitionIdRef.current;
    isTransitionActiveRef.current = true;
    const startTime = Date.now();
    const minDuration = options?.minDuration ?? MIN_TRANSITION_MS;

    // Immediately show the overlay and block pointer interactions to prevent double-clicks
    setIsNavigating(true);
    setIsOverlayVisible(true);
    setIsFadingOut(false);
    setPendingPath(targetPath);

    // Prevent background scrolling while the full-screen overlay is active
    try {
      document.body.style.overflow = 'hidden';
    } catch {
      // safe fallback
    }

    // Update history immediately so URL reflects navigation intent (unless from browser back/forward)
    if (!options?.fromPopstate) {
      try {
        window.history.pushState({}, '', targetPath);
      } catch {
        // safe fallback
      }
    }


    // Switch the underlying route so destination page mounts and prepares under the overlay
    setCurrentPath(targetPath);
    currentPathRef.current = targetPath;

    // Create the minimum 5000ms guarantee timer
    const minTimerPromise = new Promise((resolve) => setTimeout(resolve, minDuration));

    // Resolve any explicit data promise provided in options
    let explicitDataPromise: Promise<any> = Promise.resolve();
    if (options?.dataPromise) {
      try {
        explicitDataPromise = typeof options.dataPromise === 'function' ? options.dataPromise() : options.dataPromise;
      } catch (err) {
        explicitDataPromise = Promise.reject(err);
      }
    }

    // Combine all readiness requirements
    const combinedReadiness = Promise.all([
      minTimerPromise,
      explicitDataPromise,
      ...registeredPromisesRef.current,
    ]);

    // Safety timeout to guarantee graceful error recovery and prevent indefinite hangs
    const safetyTimeoutPromise = new Promise((resolve) => setTimeout(resolve, SAFETY_TIMEOUT_MS));

    try {
      await Promise.race([combinedReadiness, safetyTimeoutPromise]);
    } catch (err) {
      console.warn('[GlobalPageLoader] Readiness error handled gracefully:', err);
    }

    // Verify this is still the active transition
    if (transitionId !== activeTransitionIdRef.current) {
      return;
    }

    // Ensure strictly at least minDuration ms have elapsed even if errors occurred
    const elapsed = Date.now() - startTime;
    if (elapsed < minDuration) {
      await new Promise((resolve) => setTimeout(resolve, minDuration - elapsed));
    }

    // Still active?
    if (transitionId !== activeTransitionIdRef.current) {
      return;
    }

    // Begin smooth exit fade-out
    setIsFadingOut(true);
    await new Promise((resolve) => setTimeout(resolve, FADE_OUT_DURATION_MS));

    // Check if another transition took over during fade-out
    if (transitionId !== activeTransitionIdRef.current) {
      return;
    }

    // Final teardown
    setIsOverlayVisible(false);
    setIsFadingOut(false);
    setIsNavigating(false);
    setPendingPath(null);
    isTransitionActiveRef.current = false;
    registeredPromisesRef.current = [];

    try {
      document.body.style.overflow = '';
      window.scrollTo({ top: 0, behavior: 'instant' });
    } catch {
      // safe fallback
    }
  }, [pendingPath]);

  /**
   * Handle Direct URL Access on initial app mount
   * Shows the 5-second loader while initial data / auth loads
   */
  useEffect(() => {
    if (!enableInitialLoader) return;

    let mounted = true;
    const initialTransitionId = ++activeTransitionIdRef.current;
    isTransitionActiveRef.current = true;
    const startTime = Date.now();

    setIsNavigating(true);
    setIsOverlayVisible(true);
    setIsFadingOut(false);

    try {
      document.body.style.overflow = 'hidden';
    } catch {
      // safe
    }

    const minTimer = new Promise((resolve) => setTimeout(resolve, MIN_TRANSITION_MS));

    minTimer.then(async () => {
      if (!mounted || initialTransitionId !== activeTransitionIdRef.current) return;

      const elapsed = Date.now() - startTime;
      if (elapsed < MIN_TRANSITION_MS) {
        await new Promise((r) => setTimeout(r, MIN_TRANSITION_MS - elapsed));
      }

      if (!mounted || initialTransitionId !== activeTransitionIdRef.current) return;

      setIsFadingOut(true);
      await new Promise((r) => setTimeout(r, FADE_OUT_DURATION_MS));

      if (!mounted || initialTransitionId !== activeTransitionIdRef.current) return;

      setIsOverlayVisible(false);
      setIsFadingOut(false);
      setIsNavigating(false);
      isTransitionActiveRef.current = false;

      try {
        document.body.style.overflow = '';
      } catch {
        // safe
      }
    });

    return () => {
      mounted = false;
    };
  }, [enableInitialLoader]);

  /**
   * Browser Back/Forward navigation support (popstate and hashchange)
   */
  useEffect(() => {
    const handlePopState = () => {
      const newPath = getPathFromLocation();
      const cleanNew = cleanRoutePath(newPath);
      const cleanCurrent = cleanRoutePath(currentPathRef.current);

      if (cleanNew !== cleanCurrent) {
        navigateTo(cleanNew, { fromPopstate: true });
      }
    };

    window.addEventListener('popstate', handlePopState);
    window.addEventListener('hashchange', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('hashchange', handlePopState);
    };
  }, [navigateTo]);

  /**
   * Global Click Interception:
   * Captures clicks on internal links (<a href="...">) and routes them through navigateTo
   * Preserves external links (e.g. mailto, tel, target="_blank", different origin)
   * Does NOT intercept non-navigation interactions (buttons, modals, forms, tabs)
   */
  useEffect(() => {
    const handleDocumentClick = (e: MouseEvent) => {
      // Ignore right clicks or modified clicks (Ctrl, Cmd, Shift, Alt)
      if (e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) {
        return;
      }

      const target = e.target as HTMLElement | null;
      if (!target) return;

      // Find closest anchor tag
      const anchor = target.closest('a') as HTMLAnchorElement | null;
      if (!anchor) return;

      // Check if explicitly marked to bypass
      if (anchor.hasAttribute('data-bypass-loader') || anchor.hasAttribute('download')) {
        return;
      }

      const href = anchor.getAttribute('href');
      if (!href) return;

      // Ignore external protocols or targets
      if (
        href.startsWith('mailto:') ||
        href.startsWith('tel:') ||
        href.startsWith('javascript:') ||
        anchor.target === '_blank'
      ) {
        return;
      }

      // Check if it's an internal link
      const isInternal =
        href.startsWith('/') ||
        href.startsWith('#') ||
        href.startsWith(window.location.origin);

      if (isInternal) {
        let destination = href;
        if (destination.startsWith(window.location.origin)) {
          destination = destination.substring(window.location.origin.length);
        }

        // Clean path
        const cleaned = cleanRoutePath(destination);
        if (cleaned) {
          e.preventDefault();
          navigateTo(cleaned);
        }
      }
    };

    document.addEventListener('click', handleDocumentClick, { capture: true });
    return () => {
      document.removeEventListener('click', handleDocumentClick, { capture: true });
    };
  }, [navigateTo]);

  const contextValue: NavigationContextValue = {
    currentPath,
    pendingPath,
    isNavigating,
    navigateTo,
    registerDataPromise,
  };

  return (
    <NavigationContext.Provider value={contextValue}>
      {children}
      {/* Global reusable page loader overlay */}
      <GlobalPageLoader
        isVisible={isOverlayVisible}
        isFadingOut={isFadingOut}
        accessibleMessage={
          pendingPath ? `Loading ${pendingPath.replace('/', '') || 'homepage'}...` : 'Loading page, please wait...'
        }
      />
    </NavigationContext.Provider>
  );
};

/**
 * Hook to access navigation context anywhere in the application
 */
export const useNavigation = (): NavigationContextValue => {
  const context = useContext(NavigationContext);
  if (!context) {
    return {
      currentPath: getPathFromLocation(),
      pendingPath: null,
      isNavigating: false,
      navigateTo: async (path: string) => {
        if (typeof window !== 'undefined') {
          const clean = cleanRoutePath(path);
          try {
            window.history.pushState({}, '', clean);
          } catch {
            window.location.hash = clean;
          }
        }
      },
      registerDataPromise: () => {},
    };
  }
  return context;
};
