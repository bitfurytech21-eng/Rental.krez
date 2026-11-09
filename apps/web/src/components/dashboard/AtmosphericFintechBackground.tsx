import React, { useEffect, useRef } from 'react';

/**
 * AtmosphericFintechBackground — LIVING GRAPHITE
 * 
 * Signature living background animation specifically designed for the
 * black-and-graphite institutional private banking dashboard.
 * Inspired by reference asset IMG_7730:
 * - Deep obsidian black base (#050706 - #070A09).
 * - Smooth, slow-moving metallic graphite, emerald and cyan ambient ribbons (20-30s cycles).
 * - Extremely fine floating microscopic dust particles (no violet/pink, no large bokeh).
 * - Subtle parallax response on scroll.
 * - Complete prefers-reduced-motion support and zero CPU overhead.
 */
export const AtmosphericFintechBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const parallaxRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let animationFrameId: number;
    let isVisible = true;
    let isInViewport = true;
    let width = 0;
    let height = 0;
    let scrollY = 0;

    // Extremely fine, restrained microscopic particles
    const getParticleCount = () => {
      if (typeof window === 'undefined') return 28;
      return window.innerWidth < 768 ? 18 : 34;
    };

    interface MicroParticle {
      x: number;
      y: number;
      baseX: number;
      vx: number;
      vy: number;
      radius: number;
      baseAlpha: number;
      alpha: number;
      pulseSpeed: number;
      pulseOffset: number;
      swaySpeed: number;
      swayMagnitude: number;
      color: string;
    }

    // Strict institutional palette: NO purple/pink. Only Platinum, Graphite, Emerald, Cyan
    const PARTICLE_PALETTE = [
      { color: '235, 238, 235', weight: 0.35 }, // Polished Platinum Silver
      { color: '170, 180, 175', weight: 0.30 }, // Metallic Graphite
      { color: '67, 201, 139', weight: 0.20 },  // Understated Emerald (#43C98B)
      { color: '85, 189, 232', weight: 0.15 },  // Subdued Ice Cyan (#55BDE8)
    ];

    const pickColor = () => {
      const rand = Math.random();
      let acc = 0;
      for (const item of PARTICLE_PALETTE) {
        acc += item.weight;
        if (rand <= acc) return item.color;
      }
      return PARTICLE_PALETTE[0].color;
    };

    let particles: MicroParticle[] = [];

    const initParticles = () => {
      const count = getParticleCount();
      particles = [];
      for (let i = 0; i < count; i++) {
        // Ultra-fine microscopic specs only (0.35px - 0.85px)
        const radius = Math.random() * 0.5 + 0.35;
        const baseAlpha = Math.random() * 0.16 + 0.05;
        const x = Math.random() * width;

        particles.push({
          x,
          baseX: x,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * 0.05,
          vy: -(Math.random() * 0.12 + 0.03), // Very slow upward drift
          radius,
          baseAlpha,
          alpha: baseAlpha,
          pulseSpeed: Math.random() * 0.015 + 0.005,
          pulseOffset: Math.random() * Math.PI * 2,
          swaySpeed: Math.random() * 0.001 + 0.0004,
          swayMagnitude: Math.random() * 8 + 4,
          color: pickColor(),
        });
      }
    };

    const handleResize = () => {
      if (!canvas) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.scale(dpr, dpr);
      initParticles();
    };

    handleResize();
    window.addEventListener('resize', handleResize, { passive: true });

    // Subtle scroll listener for parallax depth (2-3% displacement)
    const handleScroll = () => {
      scrollY = window.scrollY || document.documentElement.scrollTop || 0;
      if (parallaxRef.current && !prefersReducedMotion) {
        const offset = scrollY * 0.025;
        parallaxRef.current.style.transform = `translate3d(0, ${-offset}px, 0)`;
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });

    // Auto pause on tab hidden
    const handleVisibilityChange = () => {
      isVisible = !document.hidden;
      checkAndToggleAnimation();
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Auto pause when off-screen
    let observer: IntersectionObserver | null = null;
    if (typeof IntersectionObserver !== 'undefined' && container) {
      observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            isInViewport = entry.isIntersecting;
            checkAndToggleAnimation();
          }
        },
        { threshold: 0.05 }
      );
      observer.observe(container);
    }

    let lastTimestamp = performance.now();
    let isRunning = false;

    const render = (now: number) => {
      if (!isRunning) return;

      const dt = Math.min((now - lastTimestamp) / 1000, 0.1);
      lastTimestamp = now;

      ctx.clearRect(0, 0, width, height);

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        // Vertical drift with subtle sinusoidal horizontal sway
        p.y += p.vy * 60 * dt;
        p.x = p.baseX + Math.sin(now * p.swaySpeed + p.pulseOffset) * p.swayMagnitude;

        // Wrap around boundaries
        if (p.y < -10) {
          p.y = height + 10;
          p.baseX = Math.random() * width;
          p.x = p.baseX;
        }
        if (p.x < -15) p.baseX = width + 15;
        if (p.x > width + 15) p.baseX = -15;

        // Ethereal breathing pulse
        const pulse = Math.sin(now * p.pulseSpeed * 0.1 + p.pulseOffset);
        p.alpha = Math.max(0.02, p.baseAlpha + pulse * 0.05);

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${p.color}, ${p.alpha})`;
        ctx.fill();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    const checkAndToggleAnimation = () => {
      const shouldRun = isVisible && isInViewport && !prefersReducedMotion;
      if (shouldRun && !isRunning) {
        isRunning = true;
        lastTimestamp = performance.now();
        animationFrameId = requestAnimationFrame(render);
      } else if (!shouldRun && isRunning) {
        isRunning = false;
        cancelAnimationFrame(animationFrameId);
      }
    };

    // Initial start
    if (!prefersReducedMotion) {
      isRunning = true;
      lastTimestamp = performance.now();
      animationFrameId = requestAnimationFrame(render);
    } else {
      ctx.clearRect(0, 0, width, height);
      initParticles();
      for (const p of particles) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${p.color}, ${p.baseAlpha * 0.5})`;
        ctx.fill();
      }
    }

    return () => {
      isRunning = false;
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleScroll);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (observer && container) {
        observer.unobserve(container);
        observer.disconnect();
      }
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      className="fixed inset-0 pointer-events-none select-none overflow-hidden z-0"
      style={{ backgroundColor: '#050706' }}
    >
      {/* Layer 1: Deep Architectural Graphite Foundation Grid (extreme low opacity) */}
      <div 
        className="absolute inset-0 opacity-[0.02] pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(245, 245, 242, 0.08) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(245, 245, 242, 0.03) 1px, transparent 1px)
          `,
          backgroundSize: '120px 240px',
        }}
      />

      {/* Layer 2: Parallax Layer with Living Graphite Ribbons (Inspired by IMG_7730) */}
      <div ref={parallaxRef} className="absolute inset-0 overflow-hidden will-change-transform">
        
        {/* Soft Sub-Surface Ambient Emerald Luminescence (25s cycle) */}
        <div
          className="absolute -top-[10%] right-[5%] w-[85vw] max-w-[1100px] h-[65vw] max-h-[850px] rounded-full pointer-events-none blur-[120px] sm:blur-[160px] animate-graphite-emerald-drift"
          style={{
            background: 'radial-gradient(circle at 60% 40%, rgba(39, 132, 93, 0.22) 0%, rgba(22, 65, 48, 0.12) 45%, transparent 75%)',
          }}
        />

        {/* Soft Sub-Surface Ambient Cyan/Teal Luminescence (28s cycle) */}
        <div
          className="absolute top-[40%] -left-[10%] w-[90vw] max-w-[1200px] h-[70vw] max-h-[900px] rounded-full pointer-events-none blur-[130px] sm:blur-[180px] animate-graphite-cyan-drift"
          style={{
            background: 'radial-gradient(circle at 45% 55%, rgba(43, 130, 153, 0.18) 0%, rgba(19, 56, 66, 0.10) 45%, transparent 75%)',
          }}
        />

        {/* Soft Metallic Silver Horizon Sheen (21s cycle) */}
        <div
          className="absolute top-[18%] left-[15%] w-[70vw] max-w-[900px] h-[40vw] max-h-[500px] rounded-full pointer-events-none blur-[100px] sm:blur-[140px] animate-graphite-silver-flow"
          style={{
            background: 'radial-gradient(ellipse at 50% 50%, rgba(215, 225, 220, 0.07) 0%, rgba(160, 175, 170, 0.03) 40%, transparent 70%)',
          }}
        />

        {/* ======================================================================
            LIVING GRAPHITE CURVILINEAR METALLIC RIBBONS (Direct from IMG_7730)
            Curved sweeping ribbon strata of graphite, emerald, and metallic cyan
           ====================================================================== */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none opacity-[0.82] mix-blend-screen overflow-visible"
          viewBox="0 0 1920 1080"
          preserveAspectRatio="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* Ribbon 1: Deep Graphite to Forest Emerald Sheen */}
            <linearGradient id="livingGraphiteRibbonGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0B1310" stopOpacity="0.0" />
              <stop offset="35%" stopColor="#153629" stopOpacity="0.32" />
              <stop offset="65%" stopColor="#255944" stopOpacity="0.22" />
              <stop offset="100%" stopColor="#0E1914" stopOpacity="0.0" />
            </linearGradient>

            {/* Ribbon 2: Polished Graphite & Teal Silk */}
            <linearGradient id="livingGraphiteRibbonGrad2" x1="0%" y1="0%" x2="100%" y2="80%">
              <stop offset="0%" stopColor="#0D1618" stopOpacity="0.0" />
              <stop offset="30%" stopColor="#183E44" stopOpacity="0.38" />
              <stop offset="60%" stopColor="#2A6B76" stopOpacity="0.26" />
              <stop offset="85%" stopColor="#1C454B" stopOpacity="0.14" />
              <stop offset="100%" stopColor="#091012" stopOpacity="0.0" />
            </linearGradient>

            {/* Ribbon 3: Luminous Cyan/Teal Metallic Crest (matching bright lower arc in IMG_7730) */}
            <linearGradient id="livingGraphiteRibbonGrad3" x1="0%" y1="0%" x2="100%" y2="70%">
              <stop offset="0%" stopColor="#12252A" stopOpacity="0.0" />
              <stop offset="25%" stopColor="#276978" stopOpacity="0.45" />
              <stop offset="55%" stopColor="#4BBAD1" stopOpacity="0.35" />
              <stop offset="80%" stopColor="#2E7E91" stopOpacity="0.20" />
              <stop offset="100%" stopColor="#0C1B1E" stopOpacity="0.0" />
            </linearGradient>

            {/* Fine Specular Metallic Ridge Highlights */}
            <linearGradient id="livingGraphiteRidgeHighlight1" x1="0%" y1="0%" x2="100%" y2="50%">
              <stop offset="0%" stopColor="#43C98B" stopOpacity="0.0" />
              <stop offset="40%" stopColor="#A8E8C8" stopOpacity="0.38" />
              <stop offset="70%" stopColor="#43C98B" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#27845D" stopOpacity="0.0" />
            </linearGradient>

            <linearGradient id="livingGraphiteRidgeHighlight2" x1="0%" y1="0%" x2="100%" y2="50%">
              <stop offset="0%" stopColor="#55BDE8" stopOpacity="0.0" />
              <stop offset="35%" stopColor="#B6E9F8" stopOpacity="0.48" />
              <stop offset="65%" stopColor="#55BDE8" stopOpacity="0.28" />
              <stop offset="100%" stopColor="#2B8299" stopOpacity="0.0" />
            </linearGradient>

            <linearGradient id="livingGraphiteSilverSheenGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#F5F5F2" stopOpacity="0.0" />
              <stop offset="45%" stopColor="#E0E6E2" stopOpacity="0.25" />
              <stop offset="75%" stopColor="#A5B0AA" stopOpacity="0.10" />
              <stop offset="100%" stopColor="#75807A" stopOpacity="0.0" />
            </linearGradient>

            {/* Subtle glow filter for ridge highlights */}
            <filter id="graphiteGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="6" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Ribbon Layer 1: Upper Deep Emerald & Graphite Arc (26s cycle) */}
          <g className="animate-graphite-ribbon-primary">
            <path
              d="M -150,340 C 420,180 980,210 1480,430 C 1780,560 1980,720 2150,920 L 2150,1180 L -150,1180 Z"
              fill="url(#livingGraphiteRibbonGrad1)"
            />
            {/* Fine metallic crest stroke */}
            <path
              d="M -150,340 C 420,180 980,210 1480,430 C 1780,560 1980,720 2150,920"
              fill="none"
              stroke="url(#livingGraphiteRidgeHighlight1)"
              strokeWidth="2.5"
              filter="url(#graphiteGlow)"
            />
          </g>

          {/* Ribbon Layer 2: Central Concentric Silk Ribbon (22s cycle) */}
          <g className="animate-graphite-ribbon-secondary">
            <path
              d="M -150,520 C 480,360 1060,400 1560,650 C 1820,780 2020,950 2180,1140 L 2180,1280 L -150,1280 Z"
              fill="url(#livingGraphiteRibbonGrad2)"
            />
            {/* Fine silver-sheen secondary crest */}
            <path
              d="M -150,520 C 480,360 1060,400 1560,650 C 1820,780 2020,950 2180,1140"
              fill="none"
              stroke="url(#livingGraphiteSilverSheenGrad)"
              strokeWidth="1.8"
            />
          </g>

          {/* Ribbon Layer 3: Lower Luminous Cyan/Teal Ribbon (29s cycle) */}
          <g className="animate-graphite-ribbon-tertiary">
            <path
              d="M -150,710 C 510,540 1120,590 1640,850 C 1880,980 2080,1130 2220,1310 L 2220,1400 L -150,1400 Z"
              fill="url(#livingGraphiteRibbonGrad3)"
            />
            {/* Brilliant cyan-silver highlight line directly mirroring the bottom bright curve of IMG_7730 */}
            <path
              d="M -150,710 C 510,540 1120,590 1640,850 C 1880,980 2080,1130 2220,1310"
              fill="none"
              stroke="url(#livingGraphiteRidgeHighlight2)"
              strokeWidth="3.2"
              filter="url(#graphiteGlow)"
            />
          </g>
        </svg>
      </div>

      {/* Layer 3: Ultra-Fine Microscopic Particles Canvas (0.35px - 0.85px specs) */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none"
        style={{ mixBlendMode: 'screen' }}
      />

      {/* Layer 4: Subtle Analog Grain Texture for Tactile Private Banking Feel */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.022] mix-blend-overlay"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'repeat',
        }}
      />

      {/* Layer 5: Peripheral Obsidian Vignette (>94% deep black on edges for reading comfort) */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(circle at 45% 40%, transparent 40%, rgba(5, 7, 6, 0.65) 75%, rgba(3, 5, 4, 0.98) 100%)',
        }}
      />
    </div>
  );
};
