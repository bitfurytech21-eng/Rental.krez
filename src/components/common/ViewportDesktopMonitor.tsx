import React, { useState, useEffect } from 'react';
import { Monitor, Smartphone, X } from 'lucide-react';
import { isDesktopModeEnabled, applyDesktopMode, toggleDesktopMode } from '../../lib/desktopMode';

export const ViewportDesktopMonitor: React.FC = () => {
  const [isDesktopActive, setIsDesktopActive] = useState<boolean>(() => isDesktopModeEnabled());
  const [windowWidth, setWindowWidth] = useState<number>(() => typeof window !== 'undefined' ? window.innerWidth : 1280);
  const [bannerDismissed, setBannerDismissed] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleResize = () => {
      const width = window.innerWidth;
      setWindowWidth(width);

      // Read current preference
      const isEnabled = isDesktopModeEnabled();

      // If user previously selected desktop mode or prefers desktop layout on smaller viewports (< 1024px)
      if (isEnabled) {
        applyDesktopMode(true);
        setIsDesktopActive(true);
      }
    };

    // Initial check
    handleResize();

    // Debounced resize listener
    let timer: NodeJS.Timeout | null = null;
    const debouncedResize = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(handleResize, 150);
    };

    window.addEventListener('resize', debouncedResize);
    return () => {
      if (timer) clearTimeout(timer);
      window.removeEventListener('resize', debouncedResize);
    };
  }, []);

  const handleToggle = () => {
    const nextState = toggleDesktopMode();
    setIsDesktopActive(nextState);
  };

  // Only show the floating desktop indicator pill if desktop mode is active and viewport is smaller than desktop (1024px)
  if (!isDesktopActive || windowWidth >= 1024 || bannerDismissed) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 animate-in fade-in slide-in-from-bottom-3 duration-300">
      <div className="bg-[#182D2A] text-white border border-[#27845D]/60 rounded-2xl p-3 shadow-2xl flex items-center gap-3 text-xs max-w-sm">
        <div className="w-8 h-8 rounded-xl bg-[#24423C] text-[#B7E36A] flex items-center justify-center shrink-0">
          <Monitor className="w-4 h-4" />
        </div>

        <div className="flex-1 min-w-0 text-left">
          <div className="flex items-center gap-1.5 font-bold text-white">
            <span>Desktop Site Layout Active</span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#B7E36A] animate-pulse"></span>
          </div>
          <p className="text-[11px] text-[#A0A8A5] truncate mt-0.5">
            1280px Widescreen Navigation &amp; Grid View
          </p>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={handleToggle}
            className="px-2.5 py-1 rounded-lg bg-[#B7E36A] text-[#182D2A] font-bold text-[11px] hover:bg-[#a8d65a] transition-colors cursor-pointer flex items-center gap-1"
            title="Switch to Mobile Responsive View"
          >
            <Smartphone className="w-3 h-3" />
            <span>Mobile View</span>
          </button>

          <button
            onClick={() => setBannerDismissed(true)}
            className="p-1 text-[#A0A8A5] hover:text-white rounded-lg transition-colors cursor-pointer"
            title="Dismiss Indicator"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
