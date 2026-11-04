import React from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { ArrowRight, ShieldCheck, Check } from 'lucide-react';

interface FinalCTAProps {
  onRegister: () => void;
  onExplore: () => void;
}

export const FinalCTA: React.FC<FinalCTAProps> = ({ onRegister, onExplore }) => {
  const prefersReducedMotion = useReducedMotion();

  return (
    <section className="py-20 sm:py-28 bg-[#0B1B30] text-white border-t border-[#1D3860] overflow-hidden">
      <style>{`
        @keyframes ctaOrbDriftA {
          0%, 100% { transform: translate3d(0px, 0px, 0) scale(1); opacity: 0.45; }
          50% { transform: translate3d(26px, -20px, 0) scale(1.08); opacity: 0.72; }
        }
        @keyframes ctaGeoRotate {
          0%, 100% { transform: translate3d(0px, 0px, 0) rotate(0deg); opacity: 0.22; }
          50% { transform: translate3d(-14px, 12px, 0) rotate(4deg); opacity: 0.38; }
        }
        .cta-orb-drift {
          animation: ctaOrbDriftA 18s ease-in-out infinite;
          will-change: transform, opacity;
        }
        .cta-geo-drift {
          animation: ctaGeoRotate 24s ease-in-out infinite;
          transform-origin: center;
          will-change: transform, opacity;
        }
        @media (prefers-reduced-motion: reduce) {
          .cta-orb-drift,
          .cta-geo-drift {
            animation: none !important;
            transform: none !important;
          }
        }
      `}</style>

      <div className="container max-w-[1240px] mx-auto px-4 sm:px-6">
        <motion.div
          initial={prefersReducedMotion ? false : { opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.25 }}
          transition={{ duration: prefersReducedMotion ? 0 : 0.45, ease: [0.16, 1, 0.3, 1] }}
          className="bg-[#102442] border border-[#1D3860] rounded-2xl p-10 sm:p-16 text-white text-center space-y-6 relative overflow-hidden shadow-lg"
        >
          {/* Animated Ambient Gradient & Softly Shifting Architectural Geometry */}
          <div
            className="absolute inset-0 pointer-events-none select-none overflow-hidden"
            aria-hidden="true"
          >
            <div
              className="absolute -top-28 -left-20 w-[420px] h-[340px] rounded-full cta-orb-drift"
              style={{
                background:
                  'radial-gradient(circle, rgba(190, 225, 121, 0.14) 0%, rgba(29, 56, 96, 0.35) 50%, rgba(16, 36, 66, 0) 76%)',
              }}
            />
            <div
              className="absolute -bottom-32 -right-16 w-[460px] h-[360px] rounded-full cta-orb-drift"
              style={{
                animationDelay: '6s',
                background:
                  'radial-gradient(circle, rgba(43, 76, 126, 0.55) 0%, rgba(190, 225, 121, 0.08) 48%, rgba(16, 36, 66, 0) 76%)',
              }}
            />
            <svg
              viewBox="0 0 1200 500"
              fill="none"
              className="absolute inset-0 w-full h-full cta-geo-drift"
              preserveAspectRatio="xMidYMid slice"
            >
              <polygon
                points="980,40 1160,150 1090,340 900,260"
                stroke="#BEE179"
                strokeOpacity="0.28"
                strokeWidth="1"
              />
              <polygon
                points="90,170 250,80 310,260 140,340"
                stroke="#6484B0"
                strokeOpacity="0.32"
                strokeWidth="1"
              />
            </svg>
          </div>

          <div className="max-w-3xl mx-auto space-y-5 relative z-10">
            <p className="text-xs font-bold text-[#BEE179] tracking-wider flex items-center justify-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#BEE179] shrink-0" />
              <span>Regulated European SPV Custody · Direct Tokenized Ownership</span>
            </p>

            <h2
              className="font-serif text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-[1.12]"
              style={{ textWrap: 'balance' }}
            >
              Build a Curated Real Estate Portfolio with{' '}
              <span className="text-[#BEE179]">Monthly Yields</span>
            </h2>

            <p className="text-sm sm:text-base text-[#D1E2F7] max-w-xl mx-auto font-normal leading-relaxed">
              Review vetted European residential and commercial assets, inspect independent RICS appraisals, and access automated monthly rental settlements.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-3.5 pt-3">
              <button
                type="button"
                onClick={onRegister}
                className="py-3.5 px-7 rounded-xl bg-[#BEE179] hover:bg-[#AEDB5B] text-[#0B1B30] font-bold text-xs tracking-wide transition-all duration-150 cursor-pointer shadow-xs flex items-center gap-2 whitespace-nowrap active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                <span>Create Investor Account</span>
                <ArrowRight className="w-3.5 h-3.5 text-[#0B1B30]" />
              </button>
              <button
                type="button"
                onClick={onExplore}
                className="py-3.5 px-7 rounded-xl bg-[#0B1B30] hover:bg-[#132745] border border-[#1D3860] text-white font-bold text-xs tracking-wide transition-colors duration-150 cursor-pointer whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#BEE179]"
              >
                <span>Browse Active Assets</span>
              </button>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-y-3 gap-x-8 text-xs text-[#D1E2F7] font-medium pt-8 border-t border-[#1D3860]">
              <span className="flex items-center gap-1.5 font-mono tabular-nums">
                <Check className="w-3.5 h-3.5 text-[#BEE179] shrink-0" /> Entry Ticket from €750
              </span>
              <span className="flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-[#BEE179] shrink-0" /> Ring-Fenced SPV Legal Custody
              </span>
              <span className="flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-[#BEE179] shrink-0" /> Direct Monthly Distributions
              </span>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};
