import React from 'react';

interface LuminousEclipseRingProps {
  size?: number;
  className?: string;
  glowColor?: string;
  children?: React.ReactNode;
}

export const LuminousEclipseRing: React.FC<LuminousEclipseRingProps> = ({
  size = 320,
  className = '',
  glowColor = '#55BDE8',
  children,
}) => {
  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      {/* Outer ambient glow field */}
      <div 
        className="absolute rounded-full pointer-events-none animate-pulse duration-1000"
        style={{
          width: `${size * 1.35}px`,
          height: `${size * 1.35}px`,
          background: `radial-gradient(circle, rgba(85, 189, 232, 0.12) 0%, rgba(183, 227, 106, 0.05) 45%, rgba(0, 0, 0, 0) 70%)`,
          filter: 'blur(45px)',
        }}
      />

      {/* Rotating Iridescent Halo SVG Ring */}
      <div 
        className="relative flex items-center justify-center shrink-0"
        style={{ width: `${size}px`, height: `${size}px` }}
      >
        <svg 
          viewBox="0 0 400 400" 
          className="w-full h-full transform transition-transform duration-1000 ease-out animate-[spin_60s_linear_infinite]"
        >
          <defs>
            {/* Multi-point Iridescent Halo Gradient */}
            <linearGradient id="eclipseRingGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.95" />
              <stop offset="25%" stopColor="#9E7AFF" stopOpacity="0.85" />
              <stop offset="50%" stopColor="#55BDE8" stopOpacity="0.9" />
              <stop offset="75%" stopColor="#43C98B" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#F5F5F2" stopOpacity="0.95" />
            </linearGradient>

            {/* Subtle Inner Glow Shadow Filter */}
            <filter id="ringGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="6" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Dense Radial Spoke Keylines */}
            <pattern id="ringSpokes" width="10" height="10" patternUnits="userSpaceOnUse">
              <line x1="0" y1="5" x2="10" y2="5" stroke="rgba(255,255,255,0.08)" strokeWidth="0.5" />
            </pattern>
          </defs>

          {/* Outer Feathered Corona Layer */}
          <circle 
            cx="200" 
            cy="200" 
            r="168" 
            fill="none" 
            stroke="url(#eclipseRingGradient)" 
            strokeWidth="1.5" 
            strokeOpacity="0.25"
            className="animate-pulse"
          />

          {/* Secondary Precision Halo */}
          <circle 
            cx="200" 
            cy="200" 
            r="160" 
            fill="none" 
            stroke="url(#eclipseRingGradient)" 
            strokeWidth="4" 
            filter="url(#ringGlow)"
          />

          {/* High-Contrast Core Ring Line */}
          <circle 
            cx="200" 
            cy="200" 
            r="158" 
            fill="none" 
            stroke="#FFFFFF" 
            strokeWidth="1.2" 
            strokeOpacity="0.9"
          />

          {/* Concentric Fine Micro-Dashes */}
          <circle 
            cx="200" 
            cy="200" 
            r="154" 
            fill="none" 
            stroke="url(#eclipseRingGradient)" 
            strokeWidth="1" 
            strokeDasharray="2 6" 
            strokeOpacity="0.6"
          />
        </svg>

        {/* Center Content Slot inside the Ring */}
        {children && (
          <div className="absolute inset-0 flex items-center justify-center p-6 z-10 text-center">
            {children}
          </div>
        )}
      </div>
    </div>
  );
};
