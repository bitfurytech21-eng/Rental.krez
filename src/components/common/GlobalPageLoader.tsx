import React from 'react';

export interface GlobalPageLoaderProps {
  /** Whether the loader overlay should be active and displayed */
  isVisible: boolean;
  /** Whether the loader is currently in its smooth fade-out exit animation */
  isFadingOut?: boolean;
  /** Optional accessible message for assistive technologies */
  accessibleMessage?: string;
}

/**
 * GlobalPageLoader
 * 
 * Production-ready full-screen page-transition loading system.
 * Features:
 * - Full-screen pure black (#000000) overlay.
 * - Subtle dark navy-blue dotted grid.
 * - Exactly six bright blue (#315FEA) circular dots arranged vertically in the center.
 * - Smooth staggered vertical pulsing wave animation.
 * - Accessible with role="status", aria-live="polite", and prefers-reduced-motion support.
 * - Pointer-events blocking to prevent duplicate clicks or interactions during navigation.
 */
export const GlobalPageLoader: React.FC<GlobalPageLoaderProps> = ({
  isVisible,
  isFadingOut = false,
  accessibleMessage = 'Navigating to page, please wait...',
}) => {
  if (!isVisible && !isFadingOut) {
    return null;
  }

  // Exactly six bright blue dots arranged vertically in the center
  const dotIndices = [0, 1, 2, 3, 4, 5];

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      aria-label={accessibleMessage}
      className={`fixed inset-0 z-[999999] w-screen h-screen bg-[#000000] flex flex-col items-center justify-center overflow-hidden select-none pointer-events-auto transition-opacity duration-400 ease-out ${
        isFadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
      style={{
        backgroundColor: '#000000',
        transition: 'opacity 380ms cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      {/* Subtle dark navy-blue dotted grid layer */}
      <div 
        className="absolute inset-0 pointer-events-none loader-dotted-grid"
        aria-hidden="true"
      />

      {/* High-DPI Crisp SVG Dotted Grid Overlay */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none opacity-80"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <defs>
          <pattern
            id="global-loader-navy-dots"
            x="0"
            y="0"
            width="28"
            height="28"
            patternUnits="userSpaceOnUse"
          >
            {/* Subtle dark navy-blue dot at center of 28px cell */}
            <circle cx="14" cy="14" r="1.4" fill="#14264e" />
          </pattern>
          {/* Subtle radial falloff mask to keep dots clean without overwhelming */}
          <radialGradient id="loader-grid-radial" cx="50%" cy="50%" r="60%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
            <stop offset="70%" stopColor="#ffffff" stopOpacity="0.75" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0.4" />
          </radialGradient>
          <mask id="loader-grid-mask">
            <rect width="100%" height="100%" fill="url(#loader-grid-radial)" />
          </mask>
        </defs>
        <rect
          width="100%"
          height="100%"
          fill="url(#global-loader-navy-dots)"
          mask="url(#loader-grid-mask)"
        />
      </svg>

      {/* Subtle center ambient navy/blue vignette for cinematic depth */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(circle at center, rgba(16, 32, 68, 0.22) 0%, transparent 65%)',
        }}
        aria-hidden="true"
      />

      {/* Six bright blue (#315FEA) circular dots arranged vertically in the center */}
      <div 
        className="relative z-10 flex flex-col items-center justify-center gap-3.5 sm:gap-4"
        aria-hidden="true"
      >
        {dotIndices.map((index) => {
          // Staggered delay for each dot: 0s, 0.16s, 0.32s, 0.48s, 0.64s, 0.80s
          const delaySeconds = (index * 0.16).toFixed(2);
          return (
            <div
              key={index}
              className="loader-dot-pulse w-3 h-3 sm:w-3.5 sm:h-3.5 rounded-full"
              style={{
                backgroundColor: '#315FEA',
                animationDelay: `${delaySeconds}s`,
                boxShadow: '0 0 10px rgba(49, 95, 234, 0.85), 0 0 20px rgba(49, 95, 234, 0.45)',
              }}
            />
          );
        })}
      </div>

      {/* Screen-reader only accessible status announcement */}
      <span className="sr-only">
        {accessibleMessage}
      </span>
    </div>
  );
};
