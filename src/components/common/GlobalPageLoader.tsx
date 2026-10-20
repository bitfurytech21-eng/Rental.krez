import React from 'react';

export interface GlobalPageLoaderProps {
  /** Whether the loader overlay is currently mounted and active */
  isVisible: boolean;
  /** Whether the loader is currently playing its exit fade-out transition */
  isFadingOut?: boolean;
}

/**
 * GlobalPageLoader
 * 
 * Production-ready full-screen page transition overlay.
 * Features:
 * - Pure black (#000000) backdrop with full viewport coverage (z-[999999])
 * - Subtle dark navy-blue dotted grid texture
 * - Six bright blue (#315FEA) circular dots arranged vertically in the center
 * - Staggered pulsing animation with glowing aura
 * - Graceful exit fade-out transition
 * - Screen-reader accessible (role="status", aria-live="polite")
 * - Prefers-reduced-motion compatible
 */
export const GlobalPageLoader: React.FC<GlobalPageLoaderProps> = ({
  isVisible,
  isFadingOut = false,
}) => {
  if (!isVisible) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Loading page, please wait..."
      className={`fixed inset-0 z-[999999] bg-[#000000] flex flex-col items-center justify-center select-none overflow-hidden cursor-wait transition-opacity duration-350 ease-out ${
        isFadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100 pointer-events-auto'
      }`}
    >
      {/* 1. Subtle Dark Navy-Blue Dotted Grid Background */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle, #0e1e3b 1.5px, transparent 1.5px)',
          backgroundSize: '26px 26px',
          backgroundPosition: 'center center',
        }}
      />

      {/* 2. Soft Ambient Radial Glow Behind the Central Dots */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(circle at 50% 50%, rgba(49, 95, 234, 0.08) 0%, rgba(10, 20, 42, 0.25) 45%, transparent 70%)',
        }}
      />

      {/* 3. Six Bright Blue (#315FEA) Circular Dots Arranged Vertically */}
      <div className="relative z-10 flex flex-col items-center justify-center gap-3.5 sm:gap-4">
        {[0, 1, 2, 3, 4, 5].map((index) => (
          <span
            key={index}
            className="block w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full bg-[#315FEA] global-loader-dot"
            style={{
              animationDelay: `${index * 150}ms`,
            }}
          />
        ))}
        {/* Screen Reader Label */}
        <span className="sr-only">Navigating to new page, please wait...</span>
      </div>
    </div>
  );
};
