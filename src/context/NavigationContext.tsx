import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { GlobalPageLoader } from '../components/common/GlobalPageLoader';

export interface NavigationContextType {
  currentPath: string;
  isTransitioning: boolean;
  navigateTo: (path: string) => void;
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

export const useNavigation = (): NavigationContextType => {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error('useNavigation must be used within a NavigationProvider');
  }
  return context;
};

const MIN_TRANSITION_DURATION_MS = 600;  // Smooth 600ms desktop page transition
const FADE_OUT_DURATION_MS = 250;        // Smooth exit fade
const FAILSAFE_MAX_DURATION_MS = 4000;   // Failsafe recovery timer

export const getPathFromLocation = (): string => {
  if (typeof window === 'undefined') return '/';
  const fullHash = window.location.hash;
  if (fullHash && fullHash.startsWith('#/')) {
    const stripped = fullHash.slice(1).trim();
    return stripped || '/';
  }
  const rawHash = fullHash.replace('#', '').trim();
  // Only treat non-slash hashes as routes if pathname is root and hash looks like a route
  if (rawHash && (window.location.pathname === '/' || window.location.pathname === '') && !rawHash.includes('=')) {
    return rawHash.startsWith('/') ? rawHash : `/${rawHash}`;
  }
  const search = window.location.search || '';
  return `${window.location.pathname || '/'}${search}`;
};

export const cleanRoutePath = (path: string): string => {
  if (!path || path === '/' || path === '#/') return '/';
  const normalized = path.replace(/^#/, '');
  return normalized.startsWith('/') ? normalized : `/${normalized}`;
};

export const NavigationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentPath, setCurrentPath] = useState<string>(getPathFromLocation);
  const [isTransitioning, setIsTransitioning] = useState<boolean>(false);
  const [isFadingOut, setIsFadingOut] = useState<boolean>(false);

  const transitionTimerRef = useRef<NodeJS.Timeout | null>(null);
  const fadeOutTimerRef = useRef<NodeJS.Timeout | null>(null);
  const failsafeTimerRef = useRef<NodeJS.Timeout | null>(null);
  const routeTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isTransitioningRef = useRef<boolean>(false);
  const currentPathRef = useRef<string>(currentPath);

  // Keep ref synchronized
  useEffect(() => {
    currentPathRef.current = currentPath;
  }, [currentPath]);

  // Clean up all timers on unmount
  const clearAllTimers = useCallback(() => {
    if (transitionTimerRef.current) {
      clearTimeout(transitionTimerRef.current);
      transitionTimerRef.current = null;
    }
    if (fadeOutTimerRef.current) {
      clearTimeout(fadeOutTimerRef.current);
      fadeOutTimerRef.current = null;
    }
    if (failsafeTimerRef.current) {
      clearTimeout(failsafeTimerRef.current);
      failsafeTimerRef.current = null;
    }
    if (routeTimerRef.current) {
      clearTimeout(routeTimerRef.current);
      routeTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => clearAllTimers();
  }, [clearAllTimers]);

  /**
   * Internal transition trigger
   * Ensures the GlobalPageLoader overlay state is triggered immediately BEFORE proceeding with the route change.
   * Holds the overlay for a minimum of 5 seconds before initiating the smooth exit fade.
   */
  const executeTransition = useCallback((targetPath: string, shouldPushHistory: boolean = true) => {
    const cleanTarget = cleanRoutePath(targetPath);

    // Prevent duplicate clicks / simultaneous overlays while a transition is already in progress
    if (isTransitioningRef.current) {
      return;
    }

    // 1. Immediately trigger the GlobalPageLoader overlay state BEFORE proceeding with the route change
    clearAllTimers();
    isTransitioningRef.current = true;
    setIsTransitioning(true);
    setIsFadingOut(false);

    // 2. Schedule the route change to proceed smoothly under the active overlay
    routeTimerRef.current = setTimeout(() => {
      // Update browser URL
      if (shouldPushHistory) {
        try {
          window.history.pushState({}, '', cleanTarget);
          if (window.location.hash || window.location.hash === '') {
            window.location.hash = cleanTarget;
          }
        } catch {
          // Safe fallback for restricted iframe environments
        }
      }

      // Update current active route so destination renders in background
      setCurrentPath(cleanTarget);
      currentPathRef.current = cleanTarget;

      // Scroll to top so destination is positioned at top when revealed
      if (typeof window !== 'undefined') {
        window.scrollTo({ top: 0, behavior: 'instant' });
      }
    }, 40);

    // 3. Failsafe recovery timer: guarantee loader never traps user indefinitely
    failsafeTimerRef.current = setTimeout(() => {
      if (isTransitioningRef.current) {
        setIsFadingOut(true);
        fadeOutTimerRef.current = setTimeout(() => {
          isTransitioningRef.current = false;
          setIsTransitioning(false);
          setIsFadingOut(false);
        }, FADE_OUT_DURATION_MS);
      }
    }, FAILSAFE_MAX_DURATION_MS);

    // 4. Strict Minimum 5-second timer before initiating fade-out
    transitionTimerRef.current = setTimeout(() => {
      setIsFadingOut(true);

      fadeOutTimerRef.current = setTimeout(() => {
        isTransitioningRef.current = false;
        setIsTransitioning(false);
        setIsFadingOut(false);
      }, FADE_OUT_DURATION_MS);
    }, MIN_TRANSITION_DURATION_MS);
  }, [clearAllTimers]);

  const navigateTo = useCallback((path: string) => {
    executeTransition(path, true);
  }, [executeTransition]);

  // Support browser Back/Forward navigation (popstate & hashchange)
  useEffect(() => {
    const handlePopStateOrHash = () => {
      const detected = getPathFromLocation();
      const cleanDetected = cleanRoutePath(detected);

      // Special recovery / auth hash routes
      if (cleanDetected.includes('type=recovery') || cleanDetected.startsWith('/reset-password') || cleanDetected.startsWith('reset-password')) {
        executeTransition('/reset-password', false);
        return;
      }

      // If the detected path is different from current route, execute 5s transition
      if (cleanDetected !== currentPathRef.current) {
        executeTransition(cleanDetected, false);
      }
    };

    window.addEventListener('popstate', handlePopStateOrHash);
    window.addEventListener('hashchange', handlePopStateOrHash);

    return () => {
      window.removeEventListener('popstate', handlePopStateOrHash);
      window.removeEventListener('hashchange', handlePopStateOrHash);
    };
  }, [executeTransition]);

  // Global click delegator: intercept any internal anchor tag navigation clicks
  useEffect(() => {
    const handleGlobalClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement)?.closest('a');
      if (!target) return;

      const href = target.getAttribute('href');
      if (!href) return;

      // Allow external links, protocols, downloads, and new tabs to function normally
      if (
        href.startsWith('http://') ||
        href.startsWith('https://') ||
        href.startsWith('mailto:') ||
        href.startsWith('tel:') ||
        target.getAttribute('target') === '_blank' ||
        target.hasAttribute('download')
      ) {
        return;
      }

      // If internal relative route or hash route, intercept and trigger page transition
      if (href.startsWith('/') || href.startsWith('#/')) {
        e.preventDefault();
        const route = href.replace(/^#/, '');
        navigateTo(route);
      }
    };

    document.addEventListener('click', handleGlobalClick, true);
    return () => document.removeEventListener('click', handleGlobalClick, true);
  }, [navigateTo]);

  return (
    <NavigationContext.Provider value={{ currentPath, isTransitioning, navigateTo }}>
      {/* Root DOM with aria-busy flag */}
      <div aria-busy={isTransitioning ? 'true' : 'false'}>
        {children}
      </div>

      {/* Global Page Transition Loader Overlay */}
      <GlobalPageLoader isVisible={isTransitioning} isFadingOut={isFadingOut} />
    </NavigationContext.Provider>
  );
};
