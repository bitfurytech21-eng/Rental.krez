import React from 'react';

interface AnimatedHomepageHeroBackgroundProps {
  imageSrc?: string;
  overlayOpacity?: number;
  className?: string;
  children?: React.ReactNode;
}

export const AnimatedHomepageHeroBackground: React.FC<AnimatedHomepageHeroBackgroundProps> = ({
  imageSrc = '/assets/aistudio/IMG_7738_40d9e7af.jpeg',
  overlayOpacity = 0.4,
  className = '',
  children,
}) => {
  return (
    <div className={`absolute inset-0 w-full h-full overflow-hidden select-none pointer-events-none ${className}`}>
      <style>{`
        @keyframes kenBurnsSlow {
          0% {
            transform: scale(1.0) translate3d(0, 0, 0);
          }
          50% {
            transform: scale(1.06) translate3d(-10px, -6px, 0);
          }
          100% {
            transform: scale(1.0) translate3d(0, 0, 0);
          }
        }

        @keyframes warmWindowPulse {
          0%, 100% {
            opacity: 0.35;
            filter: drop-shadow(0 0 12px rgba(255, 185, 95, 0.4));
          }
          50% {
            opacity: 0.75;
            filter: drop-shadow(0 0 24px rgba(255, 205, 125, 0.75));
          }
        }

        @keyframes floatingLeafOne {
          0% {
            transform: translate3d(0, 0, 0) rotate(0deg);
            opacity: 0;
          }
          20% {
            opacity: 0.7;
          }
          80% {
            opacity: 0.7;
          }
          100% {
            transform: translate3d(-120px, 240px, 0) rotate(180deg);
            opacity: 0;
          }
        }

        @keyframes floatingLeafTwo {
          0% {
            transform: translate3d(0, 0, 0) rotate(0deg);
            opacity: 0;
          }
          25% {
            opacity: 0.6;
          }
          75% {
            opacity: 0.6;
          }
          100% {
            transform: translate3d(-180px, 320px, 0) rotate(-220deg);
            opacity: 0;
          }
        }

        @keyframes curbLightGlow {
          0%, 100% {
            opacity: 0.4;
            transform: scale(1);
          }
          50% {
            opacity: 0.85;
            transform: scale(1.15);
          }
        }

        .ken-burns-bg {
          animation: kenBurnsSlow 28s ease-in-out infinite;
          will-change: transform;
        }

        .window-warm-glow {
          animation: warmWindowPulse 6s ease-in-out infinite;
          will-change: opacity, filter;
        }

        .curb-glow {
          animation: curbLightGlow 4s ease-in-out infinite;
          will-change: transform, opacity;
        }

        .leaf-particle-1 {
          animation: floatingLeafOne 16s linear infinite;
          will-change: transform, opacity;
        }

        .leaf-particle-2 {
          animation: floatingLeafTwo 22s linear infinite;
          will-change: transform, opacity;
        }

        @media (prefers-reduced-motion: reduce) {
          .ken-burns-bg,
          .window-warm-glow,
          .curb-glow,
          .leaf-particle-1,
          .leaf-particle-2 {
            animation: none !important;
            transform: none !important;
          }
        }
      `}</style>

      {/* Main High-Res Architectural Photography Background with Ken Burns Animation */}
      <div className="absolute inset-0 w-full h-full overflow-hidden">
        <img
          src={imageSrc}
          alt="Luxury Architectural Residence Background"
          className="ken-burns-bg absolute inset-0 w-full h-full object-cover object-center scale-105"
        />

        {/* Subtle Balcony & Window Warm Light Overlay Nodes */}
        <div 
          className="window-warm-glow absolute top-[28%] left-[45%] w-32 h-24 rounded-full bg-amber-400/20 blur-xl pointer-events-none"
        />
        <div 
          className="window-warm-glow absolute top-[42%] left-[52%] w-28 h-20 rounded-full bg-amber-300/25 blur-xl pointer-events-none"
          style={{ animationDelay: '2.5s' }}
        />
        <div 
          className="window-warm-glow absolute top-[18%] left-[58%] w-36 h-28 rounded-full bg-orange-300/20 blur-2xl pointer-events-none"
          style={{ animationDelay: '4.2s' }}
        />

        {/* Curb & Pathway Illuminated Lights */}
        <div 
          className="curb-glow absolute bottom-[18%] left-[22%] w-6 h-6 rounded-full bg-amber-200/50 blur-md pointer-events-none"
        />
        <div 
          className="curb-glow absolute bottom-[16%] left-[38%] w-8 h-8 rounded-full bg-amber-200/60 blur-md pointer-events-none"
          style={{ animationDelay: '1.8s' }}
        />
        <div 
          className="curb-glow absolute bottom-[14%] right-[32%] w-7 h-7 rounded-full bg-amber-200/50 blur-md pointer-events-none"
          style={{ animationDelay: '3.1s' }}
        />

        {/* Atmospheric Floating Leaves Particles */}
        <div className="absolute top-[10%] right-[15%] pointer-events-none z-10">
          <svg className="leaf-particle-1 w-6 h-6 text-emerald-900/60 fill-current" viewBox="0 0 24 24">
            <path d="M17,8C8,10 59,1611.5,17C9,17.5 5,13 5,8C5,3 10,2 17,8Z" />
          </svg>
        </div>
        <div className="absolute top-[25%] right-[28%] pointer-events-none z-10">
          <svg className="leaf-particle-2 w-8 h-8 text-amber-900/40 fill-current" style={{ animationDelay: '5s' }} viewBox="0 0 24 24">
            <path d="M17,8C8,10 59,1611.5,17C9,17.5 5,13 5,8C5,3 10,2 17,8Z" />
          </svg>
        </div>
        <div className="absolute top-[40%] right-[8%] pointer-events-none z-10">
          <svg className="leaf-particle-1 w-5 h-5 text-[#2A3F33]/70 fill-current" style={{ animationDelay: '9s' }} viewBox="0 0 24 24">
            <path d="M17,8C8,10 59,1611.5,17C9,17.5 5,13 5,8C5,3 10,2 17,8Z" />
          </svg>
        </div>

        {/* High-Legibility Subtle Scrim Gradients to keep the building vibrant and clearly visible */}
        <div 
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `linear-gradient(to bottom, rgba(10, 15, 14, 0.15) 0%, rgba(10, 15, 14, 0.3) 45%, rgba(10, 15, 14, 0.65) 100%)`
          }}
        />
        <div 
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `radial-gradient(ellipse at 50% 40%, transparent 20%, rgba(10, 15, 14, 0.35) 100%)`
          }}
        />
      </div>

      {/* Children Overlay Slot */}
      {children && (
        <div className="relative z-10 w-full h-full">
          {children}
        </div>
      )}
    </div>
  );
};
