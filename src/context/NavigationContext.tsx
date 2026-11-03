import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';

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

export const getPathFromLocation = (): string => {
  if (typeof window === 'undefined') return '/';
  const fullHash = window.location.hash;
  if (fullHash && fullHash.startsWith('#/')) {
    const stripped = fullHash.slice(1).trim();
    return stripped || '/';
  }
  const rawHash = fullHash.replace('#', '').trim();
  if (
    rawHash &&
    (window.location.pathname === '/' || window.location.pathname === '') &&
    !rawHash.includes('=') &&
    rawHash.startsWith('/')
  ) {
    return rawHash;
  }
  const search = window.location.search || '';
  const anchor = fullHash && !fullHash.startsWith('#/') ? fullHash : '';
  return `${window.location.pathname || '/'}${search}${anchor}`;
};

export const cleanRoutePath = (path: string): string => {
  if (!path || path === '/' || path === '#/') return '/';
  const normalized = path.replace(/^#(?=\/)/, '');
  if (normalized.startsWith('#')) {
    return normalized;
  }
  return normalized.startsWith('/') ? normalized : `/${normalized}`;
};

export const NavigationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentPath, setCurrentPath] = useState<string>(getPathFromLocation);
  const currentPathRef = useRef<string>(currentPath);

  useEffect(() => {
    currentPathRef.current = currentPath;
  }, [currentPath]);

  const scrollAfterNavigate = useCallback((targetPath: string) => {
    if (typeof window === 'undefined') return;
    const hashIndex = targetPath.indexOf('#');
    if (hashIndex !== -1) {
      const anchorId = targetPath.slice(hashIndex + 1).split('?')[0];
      if (anchorId && !anchorId.startsWith('/')) {
        window.setTimeout(() => {
          const el = document.getElementById(anchorId);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth' });
          }
        }, 80);
        return;
      }
    }
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, []);

  const navigateTo = useCallback(
    (path: string) => {
      if (!path) return;
      if (path.startsWith('#') && !path.startsWith('#/')) {
        const anchorId = path.slice(1);
        const el = typeof document !== 'undefined' ? document.getElementById(anchorId) : null;
        if (el) {
          el.scrollIntoView({ behavior: 'smooth' });
        }
        return;
      }

      const cleanTarget = cleanRoutePath(path);
      try {
        window.history.pushState({}, '', cleanTarget);
      } catch {
        // Safe fallback inside restricted iframe contexts
      }

      setCurrentPath(cleanTarget);
      currentPathRef.current = cleanTarget;
      scrollAfterNavigate(cleanTarget);
    },
    [scrollAfterNavigate]
  );

  useEffect(() => {
    const handlePopStateOrHash = () => {
      const detected = getPathFromLocation();
      const cleanDetected = cleanRoutePath(detected);

      if (
        cleanDetected.includes('type=recovery') ||
        cleanDetected.startsWith('/reset-password') ||
        cleanDetected.startsWith('reset-password')
      ) {
        setCurrentPath('/reset-password');
        currentPathRef.current = '/reset-password';
        return;
      }

      if (cleanDetected.startsWith('#') && !cleanDetected.startsWith('#/')) {
        scrollAfterNavigate(cleanDetected);
        return;
      }

      if (cleanDetected !== currentPathRef.current) {
        setCurrentPath(cleanDetected);
        currentPathRef.current = cleanDetected;
        scrollAfterNavigate(cleanDetected);
      }
    };

    window.addEventListener('popstate', handlePopStateOrHash);
    window.addEventListener('hashchange', handlePopStateOrHash);

    return () => {
      window.removeEventListener('popstate', handlePopStateOrHash);
      window.removeEventListener('hashchange', handlePopStateOrHash);
    };
  }, [scrollAfterNavigate]);

  useEffect(() => {
    const handleGlobalClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) {
        return;
      }
      const target = (e.target as HTMLElement)?.closest('a');
      if (!target) return;

      const href = target.getAttribute('href');
      if (!href) return;

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

      if (href.startsWith('#') && !href.startsWith('#/')) {
        e.preventDefault();
        navigateTo(href);
        return;
      }

      if (href.startsWith('/') || href.startsWith('#/')) {
        e.preventDefault();
        const route = href.replace(/^#(?=\/)/, '');
        navigateTo(route);
      }
    };

    document.addEventListener('click', handleGlobalClick, true);
    return () => document.removeEventListener('click', handleGlobalClick, true);
  }, [navigateTo]);

  return (
    <NavigationContext.Provider value={{ currentPath, isTransitioning: false, navigateTo }}>
      {children}
    </NavigationContext.Provider>
  );
};
