import React from 'react';
import { motion, useReducedMotion } from 'motion/react';

import { Property } from '../../types/property';

interface PlatformStatsProps {
  activeOfferingsCount?: number;
  properties?: Property[];
}

export const PlatformStats: React.FC<PlatformStatsProps> = ({ activeOfferingsCount, properties = [] }) => {
  const prefersReducedMotion = useReducedMotion();

  const approvedProps = properties.filter(
    (p) =>
      p.status !== 'hidden' &&
      p.status !== 'pending_approval' &&
      p.approvedForFrontend !== false &&
      Boolean(p.assignedFunction)
  );

  const totalTargetEur = approvedProps.reduce((sum, p) => sum + (p.targetAmount || 0), 0);
  const avgReturn =
    approvedProps.length > 0
      ? approvedProps.reduce(
          (sum, p) => sum + (p.totalEstimatedReturn || p.estimatedAnnualYield || 0),
          0
        ) / approvedProps.length
      : 11.2;

  const formattedCapValue =
    totalTargetEur >= 1_000_000
      ? `€${(totalTargetEur / 1_000_000).toFixed(1)}M`
      : '€142.5M+';

  const resolvedCount = activeOfferingsCount ?? approvedProps.length;

  const stats = [
    {
      value: formattedCapValue,
      label: totalTargetEur > 0 ? 'Active Marketplace Target AUM' : 'Capitalized Asset Value',
      detail: 'Trophy residential & prime commercial properties across Europe',
    },
    {
      value: `${avgReturn.toFixed(1)}%`,
      label: 'Average Underwritten Annual Return',
      detail: 'Projected net rental distributions plus targeted capital appreciation',
    },
    {
      value: resolvedCount > 0 ? `${resolvedCount} Live` : '53 Assets',
      label: resolvedCount > 0 ? 'Approved Marketplace SPVs' : 'Curated European Offerings',
      detail: 'France, Spain, Portugal, and international sunshine markets',
    },
    {
      value: 'Solana + SPV',
      label: 'Dual-Layer Custody & Settlement',
      detail: 'Ring-fenced corporate deeds with SPL, Token-2022 & Circle USDC rails',
    },
  ];

  return (
    <section className="relative bg-[#0B1B30] border-b border-[#1A3358] py-12 sm:py-16 overflow-hidden">
      {/* Gentle Gradient & Decorative Coordinate Motion Behind Investment Statistics */}
      <style>{`
        @keyframes statsGradientGlide {
          0%, 100% { transform: translate3d(-3%, 0%, 0) scale(1); opacity: 0.45; }
          50% { transform: translate3d(3%, -4%, 0) scale(1.05); opacity: 0.7; }
        }
        .stats-ambient-wave {
          animation: statsGradientGlide 18s ease-in-out infinite;
          will-change: transform, opacity;
        }
        @media (prefers-reduced-motion: reduce) {
          .stats-ambient-wave {
            animation: none !important;
            transform: none !important;
          }
        }
      `}</style>

      <div
        className="absolute inset-0 pointer-events-none select-none overflow-hidden"
        aria-hidden="true"
      >
        <div
          className="absolute -top-24 left-1/4 w-[640px] h-[260px] rounded-full stats-ambient-wave"
          style={{
            background:
              'radial-gradient(ellipse at center, rgba(190, 225, 121, 0.08) 0%, rgba(29, 56, 96, 0.35) 50%, rgba(11, 27, 48, 0) 78%)',
          }}
        />
        <svg
          viewBox="0 0 1440 200"
          fill="none"
          className="absolute inset-0 w-full h-full opacity-20"
          preserveAspectRatio="none"
        >
          <path
            d="M0 150 C 360 95, 720 185, 1080 115 C 1260 80, 1360 110, 1440 95"
            stroke="#BEE179"
            strokeOpacity="0.35"
            strokeWidth="1"
            strokeDasharray="4 6"
          />
          <path
            d="M0 60 C 420 120, 840 30, 1440 85"
            stroke="#355A8F"
            strokeOpacity="0.45"
            strokeWidth="1"
          />
        </svg>
      </div>

      <div className="container max-w-[1340px] mx-auto px-4 sm:px-6 relative z-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-0 lg:divide-x lg:divide-[#1D3860]">
          {stats.map((s, idx) => (
            <motion.div
              key={s.label}
              initial={prefersReducedMotion ? false : { opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{
                duration: prefersReducedMotion ? 0 : 0.4,
                delay: prefersReducedMotion ? 0 : idx * 0.06,
                ease: [0.16, 1, 0.3, 1],
              }}
              className="text-left lg:px-8 first:lg:pl-0 last:lg:pr-0 space-y-2"
            >
              <div className="font-serif text-3xl sm:text-4xl lg:text-[2.75rem] font-black text-[#BEE179] tracking-tight tabular-nums">
                {s.value}
              </div>
              <div className="text-xs tracking-wider font-extrabold text-white">
                {s.label}
              </div>
              <p className="text-xs text-[#8EA7C7] font-medium leading-relaxed">
                {s.detail}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
