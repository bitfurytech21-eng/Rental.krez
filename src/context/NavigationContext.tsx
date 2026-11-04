/**
 * Unified Navigation Context Bridge
 * Re-exports the primary NavigationProvider and useNavigation hook from src/lib/navigation
 * to ensure all components across the codebase access the single canonical NavigationContext.
 */

import {
  useNavigation as usePrimaryNavigation,
  NavigationProvider as PrimaryNavigationProvider,
  getPathFromLocation as getPrimaryPath,
  cleanRoutePath as cleanPrimaryRoute,
  NavigationContextValue,
} from '../lib/navigation';

export type NavigationContextType = {
  currentPath: string;
  isTransitioning: boolean;
  navigateTo: (path: string) => void;
};

export const getPathFromLocation = getPrimaryPath;
export const cleanRoutePath = cleanPrimaryRoute;
export const NavigationProvider = PrimaryNavigationProvider;

export const useNavigation = () => {
  const nav = usePrimaryNavigation();
  return {
    ...nav,
    isTransitioning: nav.isNavigating,
  };
};
