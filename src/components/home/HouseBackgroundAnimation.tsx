import React, { useEffect, useRef, useState } from 'react';
import heroEstateImg from '../../assets/images/hero_real_estate_1791998371047.jpg';

/**
 * HouseBackgroundAnimation
 * Non-AI, high-fidelity architectural hero background animation.
 * Combines real European modernist villa photography with smooth, cinematic CSS Ken Burns motion,
 * subtle architectural elevation wireframe accents, and multi-layer atmospheric lighting.
 */
export const HouseBackgroundAnimation: React.FC = () => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [mouseOffset, setMouseOffset] = useState({ x: 0, y: 0 });

  // Subtle interactive parallax for desktop devices
  useEffect(() => {
    let ticking = false;
    const handleMouseMove = (e: MouseEvent) => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          if (!containerRef.current) return;
          const rect = containerRef.current.getBoundingClientRect();
          const x = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
          const y = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
          setMouseOffset({ x, y });
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const parallaxX = mouseOffset.x * 10;
  const parallaxY = mouseOffset.y * 7;

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 pointer-events-none overflow-hidden max-w-full select-none z-0"
      aria-hidden="true"
    >
      <style>{`
        /* Cinematic smooth Ken-Burns drift (Non-AI pure CSS animation) */
        @keyframes heroKenBurns {
          0% {
            transform: scale(1.03) translate3d(0%, 0%, 0);
          }
          50% {
            transform: scale(1.10) translate3d(-1.5%, -1.2%, 0);
          }
          100% {
            transform: scale(1.03) translate3d(0%, 0%, 0);
          }
        }

        /* Subtle atmospheric ambient glow pulse around twilight architectural windows */
        @keyframes ambientShimmer {
          0%, 100% {
            opacity: 0.35;
            transform: scale(1);
          }
          50% {
            opacity: 0.6;
            transform: scale(1.06);
          }
        }

        /* Ambient floating micro-light particle */
        @keyframes floatDust1 {
          0% { transform: translateY(0px) translateX(0px); opacity: 0.15; }
          50% { transform: translateY(-24px) translateX(12px); opacity: 0.5; }
          100% { transform: translateY(-48px) translateX(0px); opacity: 0.15; }
        }
        @keyframes floatDust2 {
          0% { transform: translateY(0px) translateX(0px); opacity: 0.2; }
          50% { transform: translateY(-30px) translateX(-15px); opacity: 0.6; }
          100% { transform: translateY(-60px) translateX(5px); opacity: 0.2; }
        }

        .animate-ken-burns {
          animation: heroKenBurns 28s ease-in-out infinite alternate;
          will-change: transform;
        }

        .animate-ambient-shimmer {
          animation: ambientShimmer 8s ease-in-out infinite;
        }

        .animate-dust-1 {
          animation: floatDust1 12s ease-in-out infinite alternate;
        }

        .animate-dust-2 {
          animation: floatDust2 16s ease-in-out infinite alternate;
        }

        @media (prefers-reduced-motion: reduce) {
          .animate-ken-burns,
          .animate-ambient-shimmer,
          .animate-dust-1,
          .animate-dust-2 {
            animation: none !important;
            transform: none !important;
          }
        }
      `}</style>

      {/* Primary Real Estate Photographic Backdrop with Ken Burns Animation & Desktop Parallax */}
      <div
        className="absolute inset-0 scale-105 transition-transform duration-700 ease-out animate-ken-burns overflow-hidden"
        style={{
          transform: `translate3d(${parallaxX}px, ${parallaxY}px, 0)`
        }}
      >
        <img
          src={heroEstateImg}
          alt="European Luxury Coastal Architectural Estate"
          className="w-full h-full object-cover object-[72%_center] lg:object-[60%_center] brightness-[0.72] contrast-[1.08] saturate-[1.1]"
          loading="eager"
          fetchPriority="high"
        />
      </div>

      {/* Atmospheric Twilight Lighting Shimmer Layer */}
      <div 
        className="absolute top-[18%] right-[10%] sm:right-[18%] w-64 sm:w-[380px] h-64 sm:h-[380px] max-w-full rounded-full bg-emerald-500/15 blur-3xl pointer-events-none animate-ambient-shimmer mix-blend-screen" 
      />
      <div 
        className="absolute bottom-[20%] right-[5%] sm:right-[12%] w-72 sm:w-[460px] h-60 sm:h-[320px] max-w-full rounded-full bg-teal-400/10 blur-3xl pointer-events-none animate-ambient-shimmer mix-blend-screen"
        style={{ animationDelay: '3s' }}
      />
      <div 
        className="absolute top-[30%] left-[20%] w-56 sm:w-[300px] h-56 sm:h-[300px] max-w-full rounded-full bg-amber-500/5 blur-3xl pointer-events-none animate-ambient-shimmer"
        style={{ animationDelay: '5s' }}
      />

      {/* Floating Ambient Micro-Light Particles (simulating golden-hour evening coastal air) */}
      <div className="absolute top-[42%] right-[28%] w-1.5 h-1.5 rounded-full bg-emerald-300/40 blur-[0.5px] animate-dust-1" />
      <div className="absolute top-[35%] right-[15%] w-2 h-2 rounded-full bg-teal-200/35 blur-[0.5px] animate-dust-2" />
      <div className="absolute bottom-[35%] right-[32%] w-1 h-1 rounded-full bg-emerald-400/50 blur-[0.5px] animate-dust-1" style={{ animationDelay: '4s' }} />

      {/* Subtle Architectural Blueprint Isometric Coordinate Overlay (harmonizes technical SPV structure with photography) */}
      <div className="absolute right-0 lg:right-[4%] top-[12%] w-full max-w-[320px] sm:max-w-[640px] lg:max-w-[860px] opacity-20 sm:opacity-25 lg:opacity-35 pointer-events-none overflow-hidden">
        <svg
          viewBox="0 0 1000 700"
          className="w-full h-auto"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Ground Coordinate Grid Lines */}
          <g stroke="#10B981" strokeWidth="0.6" strokeDasharray="4 6" opacity="0.35">
            <line x1="100" y1="420" x2="500" y2="600" />
            <line x1="500" y1="600" x2="900" y2="400" />
            <line x1="900" y1="400" x2="500" y2="220" />
            <line x1="500" y1="220" x2="100" y2="420" />
            <line x1="200" y1="470" x2="600" y2="270" />
            <line x1="300" y1="520" x2="700" y2="320" />
            <line x1="400" y1="565" x2="800" y2="365" />
          </g>

          {/* Foundation & Terrace Slab */}
          <polygon
            points="500,560 840,390 500,230 160,400"
            fill="none"
            stroke="#10B981"
            strokeWidth="0.9"
            strokeOpacity="0.4"
          />

          {/* Terrace Pool Basin */}
          <polygon
            points="280,480 470,390 390,348 200,438"
            fill="#063228"
            fillOpacity="0.25"
            stroke="#059669"
            strokeWidth="0.9"
            strokeOpacity="0.5"
          />
          <line x1="220" y1="445" x2="420" y2="395" stroke="#34D399" strokeWidth="0.75" opacity="0.3" strokeDasharray="3 3" />

          {/* Cantilever Upper Master Wing Outlines */}
          <polygon
            points="240,250 540,395 620,355 320,210"
            fill="none"
            stroke="#34D399"
            strokeWidth="1"
            strokeOpacity="0.45"
          />
          <polygon
            points="260,240 510,360 510,240 260,120"
            fill="none"
            stroke="#10B981"
            strokeWidth="0.9"
            strokeOpacity="0.35"
          />

          {/* Architectural Elevation Label */}
          <g opacity="0.5" stroke="#10B981" strokeWidth="0.8">
            <line x1="720" y1="160" x2="720" y2="380" strokeDasharray="3 3" />
            <line x1="715" y1="160" x2="725" y2="160" />
            <line x1="715" y1="380" x2="725" y2="380" />
            <text x="735" y="270" fill="#34D399" fontSize="10" fontFamily="monospace" fontWeight="600" stroke="none">
              ELEVATION · 350 m²
            </text>
          </g>
        </svg>
      </div>

      {/* High-Legibility Scrim Overlays - Crucial for Mobile and Desktop readability */}
      {/* 1. Mobile-specific dark radial/directional contrast scrim ensuring text is 100% crisp */}
      <div className="absolute inset-0 bg-[#031512]/65 sm:hidden" />
      
      {/* 2. Left-to-Right directional gradient (strong dark base behind text, opening up to villa on right) */}
      <div className="absolute inset-0 bg-gradient-to-r from-[#031411] via-[#031411]/92 sm:via-[#031411]/85 lg:via-[#031411]/75 to-[#031411]/45 w-full pointer-events-none" />

      {/* 3. Top subtle vignette for header bar separation */}
      <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-[#031411]/90 to-transparent pointer-events-none" />

      {/* 4. Bottom seamless blend into next page section */}
      <div className="absolute bottom-0 left-0 right-0 h-28 bg-gradient-to-t from-[#071714] via-[#071714]/85 to-transparent pointer-events-none" />
    </div>
  );
};
