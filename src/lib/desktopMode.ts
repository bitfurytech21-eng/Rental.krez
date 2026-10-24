/**
 * Desktop Site Mode Utility
 * Enables full 1280px widescreen desktop view on any screen size or browser
 */

export function isDesktopModeEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem('desktop_mode_active') === 'true';
}

export function applyDesktopMode(enabled: boolean): void {
  if (typeof document === 'undefined') return;

  let meta = document.getElementById('app-viewport') as HTMLMetaElement | null;
  if (!meta) {
    meta = document.querySelector('meta[name="viewport"]');
    if (meta) meta.id = 'app-viewport';
  }

  if (enabled) {
    if (meta) {
      meta.content = 'width=1280, initial-scale=0.35, maximum-scale=3.0, user-scalable=yes';
    }
    document.documentElement.classList.add('desktop-mode-active');
    document.body.classList.add('desktop-mode-active');
    localStorage.setItem('desktop_mode_active', 'true');
  } else {
    if (meta) {
      meta.content = 'width=device-width, initial-scale=1.0, maximum-[#182D2A]';
    }
    document.documentElement.classList.remove('desktop-mode-active');
    document.body.classList.remove('desktop-mode-active');
    localStorage.setItem('desktop_mode_active', 'false');
  }
}

export function toggleDesktopMode(): boolean {
  const nextState = !isDesktopModeEnabled();
  applyDesktopMode(nextState);
  return nextState;
}

// Auto-apply on page load if user previously enabled Desktop Mode
if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', () => {
    if (isDesktopModeEnabled()) {
      applyDesktopMode(true);
    }
  });
}
