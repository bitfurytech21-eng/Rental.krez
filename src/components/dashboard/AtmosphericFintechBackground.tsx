import React, { useEffect, useRef } from 'react';

/**
 * AtmosphericFintechBackground
 * 
 * A cinematic, continuously moving nocturnal background engineered for
 * private wealth management and institutional fintech platforms.
 * 
 * Includes IntersectionObserver and single requestAnimationFrame loop
 * for automatic pause when out of viewport, enhancing mobile performance.
 */
export const AtmosphericFintechBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

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

    const getParticleCount = () => {
      if (typeof window === 'undefined') return 20;
      return window.innerWidth < 768 ? 12 : 28;
    };

    interface Particle {
      x: number;
      y: number;
      vx: number;
      vy: number;
      radius: number;
      baseAlpha: number;
      alpha: number;
      pulseSpeed: number;
      pulseOffset: number;
      color: string;
    }

    const PARTICLE_COLORS = [
      'rgba(85, 189, 232,', // Ice Blue (#55BDE8)
      'rgba(67, 201, 139,', // Emerald Green (#43C98B)
      'rgba(245, 245, 242,', // Platinum White (#F5F5F2)
      'rgba(182, 154, 232,', // Soft Violet (#B69AE8)
    ];

    let particles: Particle[] = [];

    const initParticles = () => {
      const count = getParticleCount();
      particles = [];
      for (let i = 0; i < count; i++) {
        const radius = Math.random() * 1.5 + 0.8;
        const color = PARTICLE_COLORS[Math.floor(Math.random() * PARTICLE_COLORS.length)];
        const baseAlpha = Math.random() * 0.22 + 0.1;
        particles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * 0.1,
          vy: - (Math.random() * 0.18 + 0.06),
          radius,
          baseAlpha,
          alpha: baseAlpha,
          pulseSpeed: Math.random() * 0.015 + 0.008,
          pulseOffset: Math.random() * Math.PI * 2,
          color,
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

    // Visibility API listener
    const handleVisibilityChange = () => {
      isVisible = !document.hidden;
      checkAndToggleAnimation();
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Intersection Observer to automatically pause when out of viewport
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

        p.x += p.vx * 60 * dt;
        p.y += p.vy * 60 * dt;

        if (p.x < -10) p.x = width + 10;
        if (p.x > width + 10) p.x = -10;
        if (p.y < -10) p.y = height + 10;
        if (p.y > height + 10) p.y = -10;

        const pulse = Math.sin(now * p.pulseSpeed * 0.1 + p.pulseOffset);
        p.alpha = Math.max(0.04, p.baseAlpha + pulse * 0.08);

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = `${p.color} ${p.alpha})`;
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
        ctx.fillStyle = `${p.color} ${p.baseAlpha * 0.6})`;
        ctx.fill();
      }
    }

    return () => {
      isRunning = false;
      window.removeEventListener('resize', handleResize);
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
      style={{ backgroundColor: '#090A0A' }}
    >
      {/* Layer 1: Static Architectural Foundations & Faint Mullion Texture */}
      <div 
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(245, 245, 242, 0.1) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(245, 245, 242, 0.03) 1px, transparent 1px)
          `,
          backgroundSize: '120px 240px',
        }}
      />

      {/* Layer 2: Continuously Drifting Gradient Formations (GPU Accelerated) */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Ice Blue Ambient Luminescence Orb (Top-Left Drift) */}
        <div
          className="absolute -top-[15%] -left-[10%] w-[68vw] max-w-[900px] h-[68vw] max-h-[900px] rounded-full opacity-[0.06] sm:opacity-[0.09] pointer-events-none blur-[90px] sm:blur-[130px] animate-fintech-drift-cyan"
          style={{
            background: 'radial-gradient(circle at 40% 40%, #55BDE8 0%, rgba(85, 189, 232, 0.4) 45%, transparent 75%)',
            willChange: 'transform, opacity',
          }}
        />

        {/* Emerald Green Ambient Wealth Luminescence Orb (Bottom-Right Drift) */}
        <div
          className="absolute -bottom-[20%] -right-[10%] w-[72vw] max-w-[960px] h-[72vw] max-h-[960px] rounded-full opacity-[0.05] sm:opacity-[0.08] pointer-events-none blur-[100px] sm:blur-[140px] animate-fintech-drift-emerald"
          style={{
            background: 'radial-gradient(circle at 60% 60%, #43C98B 0%, rgba(67, 201, 139, 0.35) 50%, transparent 75%)',
            willChange: 'transform, opacity',
          }}
        />

        {/* Soft Violet Ambient Center Drift */}
        <div
          className="absolute top-[30%] left-[25%] w-[55vw] max-w-[760px] h-[55vw] max-h-[760px] rounded-full opacity-[0.04] sm:opacity-[0.06] pointer-events-none blur-[85px] sm:blur-[120px] animate-fintech-drift-teal"
          style={{
            background: 'radial-gradient(circle at 50% 50%, #B69AE8 0%, rgba(182, 154, 232, 0.4) 40%, transparent 70%)',
            willChange: 'transform, opacity',
          }}
        />

        {/* Platinum White Architectural Shimmer Orb (Top-Right / Center Drift) */}
        <div
          className="absolute -top-[10%] right-[15%] w-[45vw] max-w-[600px] h-[45vw] max-h-[600px] rounded-full opacity-[0.02] sm:opacity-[0.035] pointer-events-none blur-[80px] sm:blur-[110px] animate-fintech-drift-shimmer"
          style={{
            background: 'radial-gradient(circle at 50% 50%, #F5F5F2 0%, rgba(245, 245, 242, 0.2) 35%, transparent 65%)',
            willChange: 'transform, opacity',
          }}
        />

        {/* Diagonal Soft Atmospheric Light Beam */}
        <div
          className="absolute -inset-[50%] opacity-[0.02] sm:opacity-[0.03] pointer-events-none rotate-[-28deg] animate-fintech-beam-drift"
          style={{
            background: 'linear-gradient(90deg, transparent 0%, rgba(85, 189, 232, 0.06) 35%, rgba(67, 201, 139, 0.05) 65%, transparent 100%)',
            filter: 'blur(60px)',
            willChange: 'transform',
          }}
        />
      </div>

      {/* Layer 3: Canvas for Floating Micro-Luminescent Particles */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none"
        style={{ mixBlendMode: 'screen' }}
      />

      {/* Layer 4: Vignette Ensuring Peripheral Dark Density (>90% deep dark) */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(circle at 50% 50%, transparent 40%, rgba(9, 10, 10, 0.65) 85%, rgba(9, 10, 10, 0.95) 100%)',
        }}
      />
    </div>
  );
};
