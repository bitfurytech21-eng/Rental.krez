import React from 'react';

interface AnimatedArchitecturalSketchProps {
  variant?: 'villa' | 'mansion' | 'estate';
  className?: string;
  showDimensions?: boolean;
}

export const AnimatedArchitecturalSketch: React.FC<AnimatedArchitecturalSketchProps> = ({
  variant = 'villa',
  className = '',
  showDimensions = true,
}) => {
  return (
    <div className={`relative w-full overflow-hidden rounded-2xl border border-white/10 bg-[#0B0F17]/90 p-6 backdrop-blur-md ${className}`}>
      {/* Dark navy blueprint grid pattern */}
      <div 
        className="absolute inset-0 opacity-20 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(49, 95, 234, 0.15) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(49, 95, 234, 0.15) 1px, transparent 1px)
          `,
          backgroundSize: '24px 24px'
        }}
      />

      <div className="relative z-10 flex items-center justify-between mb-4 border-b border-white/10 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-[#315FEA] animate-pulse" />
          <span className="text-[11px] font-mono tracking-wider text-slate-400 uppercase">
            Architectural Elevation · SPV Blueprint {variant.toUpperCase()}
          </span>
        </div>
        <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
          PASSED • CAD v4.2
        </span>
      </div>

      <div className="relative w-full aspect-[16/9] flex items-center justify-center">
        <svg
          viewBox="0 0 800 450"
          className="w-full h-full text-[#315FEA]"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Ground & Horizon lines */}
          <line x1="40" y1="380" x2="760" y2="380" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 4" opacity="0.4" />
          <line x1="40" y1="384" x2="760" y2="384" stroke="currentColor" strokeWidth="2" opacity="0.6" />

          {/* Main Building Outlines with Animated Drawing Effect */}
          <g className="animate-[blueprintDraw_4s_ease-out_forwards]">
            {/* Lower floor main volume */}
            <rect
              x="140"
              y="220"
              width="520"
              height="160"
              stroke="#60A5FA"
              strokeWidth="2"
              className="transition-all duration-700"
            />
            {/* Cantilevered upper floor */}
            <rect
              x="100"
              y="110"
              width="440"
              height="110"
              stroke="#315FEA"
              strokeWidth="2.5"
            />
            {/* Glass curtain wall mullions */}
            <line x1="220" y1="220" x2="220" y2="380" stroke="currentColor" strokeWidth="1" strokeDasharray="3 3" opacity="0.5" />
            <line x1="320" y1="220" x2="320" y2="380" stroke="currentColor" strokeWidth="1" strokeDasharray="3 3" opacity="0.5" />
            <line x1="420" y1="220" x2="420" y2="380" stroke="currentColor" strokeWidth="1" strokeDasharray="3 3" opacity="0.5" />
            <line x1="520" y1="220" x2="520" y2="380" stroke="currentColor" strokeWidth="1" strokeDasharray="3 3" opacity="0.5" />

            {/* Upper floor glass window partitions */}
            <line x1="180" y1="110" x2="180" y2="220" stroke="#93C5FD" strokeWidth="1" opacity="0.7" />
            <line x1="280" y1="110" x2="280" y2="220" stroke="#93C5FD" strokeWidth="1" opacity="0.7" />
            <line x1="380" y1="110" x2="380" y2="220" stroke="#93C5FD" strokeWidth="1" opacity="0.7" />
            <line x1="480" y1="110" x2="480" y2="220" stroke="#93C5FD" strokeWidth="1" opacity="0.7" />

            {/* Reflection Pool */}
            <polygon
              points="140,384 660,384 700,420 100,420"
              stroke="#34D399"
              strokeWidth="1.5"
              fill="rgba(52, 211, 153, 0.05)"
            />

            {/* Animated Light Beams inside structural voids */}
            <rect x="150" y="230" x2="210" y2="370" fill="url(#blueGlow)" opacity="0.15" />
            <rect x="230" y="120" x2="370" y2="210" fill="url(#cyanGlow)" opacity="0.15" />
          </g>

          {/* Dimension Lines & Markers */}
          {showDimensions && (
            <g className="text-xs font-mono" fill="#94A3B8" opacity="0.8">
              {/* Width dimension */}
              <line x1="100" y1="80" x2="540" y2="80" stroke="#64748B" strokeWidth="1" />
              <line x1="100" y1="75" x2="100" y2="85" stroke="#64748B" strokeWidth="1.5" />
              <line x1="540" y1="75" x2="540" y2="85" stroke="#64748B" strokeWidth="1.5" />
              <text x="320" y="72" textAnchor="middle" fill="#CBD5E1" className="text-[11px]">
                32.50m (Main Facade)
              </text>

              {/* Height dimension */}
              <line x1="700" y1="110" x2="700" y2="380" stroke="#64748B" strokeWidth="1" />
              <line x1="695" y1="110" x2="705" y2="110" stroke="#64748B" strokeWidth="1.5" />
              <line x1="695" y1="380" x2="705" y2="380" stroke="#64748B" strokeWidth="1.5" />
              <text x="715" y="250" textAnchor="start" fill="#CBD5E1" className="text-[11px]">
                8.40m Elevation
              </text>
            </g>
          )}

          {/* Interactive Structural Nodes */}
          <circle cx="100" cy="110" r="4" fill="#315FEA" className="animate-ping" opacity="0.7" />
          <circle cx="100" cy="110" r="3" fill="#60A5FA" />
          <circle cx="540" cy="110" r="3" fill="#60A5FA" />
          <circle cx="660" cy="220" r="3" fill="#60A5FA" />
          <circle cx="140" cy="380" r="3" fill="#34D399" />
          <circle cx="660" cy="380" r="3" fill="#34D399" />

          {/* Gradients */}
          <defs>
            <linearGradient id="blueGlow" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#315FEA" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#315FEA" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="cyanGlow" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#06B6D4" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#34D399" stopOpacity="0" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      <div className="mt-4 flex items-center justify-between text-[11px] font-mono text-slate-400 border-t border-white/10 pt-3">
        <span>BUILT AREA: 1,280 m²</span>
        <span>ENERGY RATING: A+ SOLAR</span>
        <span className="text-[#315FEA]">STRUCTURAL STRENGTH: 100%</span>
      </div>
    </div>
  );
};
